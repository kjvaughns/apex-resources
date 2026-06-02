// APEX Resources — main app
const { useState, useMemo, useEffect, useRef } = React;

const TYPE_META = {
  video:    { label: "Video",    color: "#E5484D", icon: "▶" },
  pdf:      { label: "PDF",      color: "#4C7DF0", icon: "▤" },
  training: { label: "Training", color: "var(--gold)", icon: "★" },
  guide:    { label: "Guide",    color: "#46A758", icon: "▦" },
  course:   { label: "Course",   color: "#9A6BE0", icon: "★" },
};

const FILTERS = [
  { key: "all",      label: "All" },
  { key: "video",    label: "Videos" },
  { key: "pdf",      label: "PDFs" },
  { key: "training", label: "Trainings" },
  { key: "guide",    label: "Guides" },
  { key: "course",   label: "Courses" },
];

const APEX_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#C9A84C",
  "cardStyle": "bordered",
  "density": "regular",
  "showCounts": true
}/*EDITMODE-END*/;

// ── Transcript persistence ────────────────────────────────────────────────────
const TS_KEY = "apex_ts_v1";

function tsLoad() {
  try { return JSON.parse(localStorage.getItem(TS_KEY) || "{}"); } catch { return {}; }
}
function tsSave(s) {
  try { localStorage.setItem(TS_KEY, JSON.stringify(s)); } catch {}
}
function tsSet(recId, data) {
  const s = tsLoad(); s[recId] = data; tsSave(s);
  window.dispatchEvent(new CustomEvent("apex_ts", { detail: { recId, data } }));
}
function tsGet(recId) { return tsLoad()[recId] || null; }

function useTranscriptEntry(recId) {
  const [entry, setEntry] = useState(() => tsGet(recId));
  useEffect(() => {
    setEntry(tsGet(recId));
    const h = (e) => { if (e.detail.recId === recId) setEntry(e.detail.data); };
    window.addEventListener("apex_ts", h);
    return () => window.removeEventListener("apex_ts", h);
  }, [recId]);
  return entry;
}

function dbSaveTranscript(recId, entry) {
  fetch("/api/transcripts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recId, entry }),
  }).catch(() => {});
}

// On login: syncs transcript DB → localStorage, submits only uncached recordings, polls every 15s.
function useAutoTranscribe(authed) {
  useEffect(() => {
    if (!authed) return;
    const run = async () => {
      // 1. Pull stored transcripts from DB and merge into localStorage
      try {
        const dbTs = await fetch("/api/transcripts").then((r) => r.json());
        const store = tsLoad();
        for (const [recId, data] of Object.entries(dbTs || {})) {
          if (!store[recId] || data.status === "completed") {
            store[recId] = data;
            window.dispatchEvent(new CustomEvent("apex_ts", { detail: { recId, data } }));
          }
        }
        tsSave(store);
      } catch {}

      // 2. Submit recordings not already stored in DB or localStorage
      const recs = (window.APEX_RECORDINGS || []).filter((r) => r.video);
      const store = tsLoad();
      for (const rec of recs) {
        const ex = store[rec.id];
        if (ex && ["completed", "queued", "processing", "submitting"].includes(ex.status)) continue;
        if (ex?.status === "error") continue;
        try {
          tsSet(rec.id, { status: "submitting" });
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: rec.video }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const { id } = await res.json();
          const entry = { status: "queued", jobId: id };
          tsSet(rec.id, entry);
          dbSaveTranscript(rec.id, entry);
        } catch (e) {
          tsSet(rec.id, { status: "error", error: e.message });
        }
      }
    };
    run();
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    const poll = async () => {
      const store = tsLoad();
      const pending = Object.entries(store).filter(
        ([, v]) => ["queued", "processing"].includes(v?.status) && v?.jobId
      );
      for (const [recId, entry] of pending) {
        try {
          const res = await fetch(`/api/transcribe-status?id=${entry.jobId}`);
          const data = await res.json();
          if (data.status && data.status !== entry.status) {
            const updated = { ...entry, ...data };
            tsSet(recId, updated);
            dbSaveTranscript(recId, updated);
          }
        } catch {}
      }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [authed]);
}

// ── Shared components ─────────────────────────────────────────────────────────

function Badge({ type, size }) {
  const m = TYPE_META[type];
  return (
    <span className={"badge badge-" + size} style={{ "--bc": m.color }}>
      <span className="badge-dot" />
      {m.label}
    </span>
  );
}

function Card({ item, onOpen }) {
  const m = TYPE_META[item.type];
  const handleClick = () => {
    if (item.isCourse) { window.location.hash = "#courses/" + item.id; return; }
    onOpen(item);
  };
  return (
    <button className="card" style={{ "--bc": m.color }} onClick={handleClick}>
      <div className="card-top">
        <Badge type={item.type} size="sm" />
        {item.isNew && <span className="new-badge">New</span>}
        <span className="card-date">{item.date}</span>
      </div>
      <h3 className="card-title">{item.title}</h3>
      <p className="card-desc">{item.desc}</p>
      <div className="card-foot">
        <span className="card-meta">{item.meta}</span>
        <span className="card-cta">{item.cta}<span className="cta-arrow">→</span></span>
      </div>
    </button>
  );
}

function Modal({ item, onClose }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [item, onClose]);
  if (!item) return null;
  const m = TYPE_META[item.type];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ "--bc": m.color }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-top">
          <Badge type={item.type} size="md" />
          <span className="card-date">{item.date}</span>
        </div>
        <h2 className="modal-title">{item.title}</h2>
        <p className="modal-long">{item.long}</p>
        <div className="modal-tags">
          {item.tags.map((t) => <span key={t} className="tag">#{t}</span>)}
        </div>
        <div className="modal-foot">
          <span className="card-meta">{item.meta}</span>
          <a className="action-btn" href={item.url || "#"}
            target={item.url ? "_blank" : undefined} rel={item.url ? "noreferrer" : undefined}
            onClick={item.url ? undefined : (e) => e.preventDefault()}>
            {item.cta}<span className="cta-arrow">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function toAbsoluteHref(href) {
  if (!href || href === "#") return "#";
  return /^https?:\/\//i.test(href) ? href : "https://" + href;
}

function toEmbedUrl(src) {
  if (!src) return src;
  const m = src.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (m) return "https://drive.google.com/file/d/" + m[1] + "/preview";
  return src;
}

function QuickLinks({ links }) {
  return (
    <div className="quicklinks">
      <div className="ql-head">
        <span className="ql-rule" />
        <span className="ql-label">Quick Links</span>
        <span className="ql-rule" />
      </div>
      <div className="ql-grid">
        {links.map((l) => (
          <a key={l.label} className="ql-card" href={toAbsoluteHref(l.href)} target="_blank" rel="noreferrer">
            <span className="ql-name">{l.label}<span className="ql-ext">↗</span></span>
            <span className="ql-sub">{l.sub}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

// ── Gate ──────────────────────────────────────────────────────────────────────

const APEX_PASSWORD = "Sales";

function Gate({ onUnlock }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);
  const submit = (e) => {
    e.preventDefault();
    if (val === APEX_PASSWORD) {
      try { sessionStorage.setItem("apex_auth", "1"); } catch (e) {}
      onUnlock();
    } else {
      setErr(true);
      setVal("");
    }
  };
  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <img src="assets/apex-logo-trans.png" alt="APEX Financial Empire" className="gate-logo" />
        <p className="gate-kicker"><span className="lock">●</span> Internal Use Only</p>
        <h1 className="gate-title">Resource Library</h1>
        <p className="gate-sub">Enter the access password to continue.</p>
        <div className={"gate-field" + (err ? " gate-field-err" : "")}>
          <input
            ref={inputRef}
            type="password"
            placeholder="Password"
            value={val}
            onChange={(e) => { setVal(e.target.value); setErr(false); }}
          />
        </div>
        {err && <p className="gate-err">Incorrect password. Try again.</p>}
        <button type="submit" className="gate-btn">Enter<span className="cta-arrow">→</span></button>
        <p className="gate-foot">Confidential — for licensed APEX agents only.</p>
      </form>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function durToSec(d) {
  if (!d) return 0;
  const p = d.split(":").map(Number);
  return p.length === 2 ? p[0] * 60 + p[1] : p[0];
}
function fmt(s) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60), ss = s % 60;
  return m + ":" + String(ss).padStart(2, "0");
}
function fmtMs(ms) { return fmt(Math.floor(ms / 1000)); }

const SPEAKER_COLORS = { A: "#C9A84C", B: "#4C7DF0", C: "#46A758", D: "#E5484D", E: "#AB7DF0", F: "#0BC5C5" };

// ── Recordings ────────────────────────────────────────────────────────────────

function PresenterSelector({ presenters, selected, onSelect }) {
  return (
    <div className="presenters">
      {presenters.map((p) => (
        <button
          key={p.id}
          className={"presenter" + (selected === p.id ? " presenter-on" : "")}
          onClick={() => onSelect(p.id)}
        >
          <span className="avatar">{p.initials}</span>
          <span className="presenter-name">{p.name}</span>
          <span className="presenter-role">{p.role}</span>
        </button>
      ))}
    </div>
  );
}

function TsStatusDot({ recId }) {
  const entry = useTranscriptEntry(recId);
  if (!entry || entry.status === "error") return null;
  if (entry.status === "completed")
    return <span className="ts-badge ts-badge-done">✓ Transcript</span>;
  return <span className="ts-badge ts-badge-spin">Transcribing…</span>;
}

function RecordingRow({ rec, onOpen }) {
  return (
    <button className="rec-card" onClick={() => onOpen(rec)}>
      <span className="rec-play"><span className="rec-play-tri">▶</span></span>
      <span className="rec-body">
        <span className="rec-title">{rec.title}</span>
        <span className="rec-meta">
          <span className="rec-topic">{rec.topic}</span>
          <span className="rec-dot">·</span>
          <span>{rec.date}</span>
          {rec.video && <span className="rec-dot">·</span>}
          {rec.video && <span className="rec-video-tag">{rec.audio ? "♪ Audio" : "▶ Video"}</span>}
          {rec.video && <TsStatusDot recId={rec.id} />}
        </span>
      </span>
      <span className="rec-dur">{rec.duration || (rec.audio ? "Audio" : rec.video ? "Video" : "")}</span>
    </button>
  );
}

// ── Media player ──────────────────────────────────────────────────────────────

const TRANSCRIPT_POOL = [
  "The first thing I want you to understand is that this is a skill — it's learnable.",
  "Most agents get this part wrong, and it costs them deals every single week.",
  "Write this down, because it matters more than anything else I'll say today.",
  "Let me give you a real example from the field so you can see it in action.",
  "Your tonality is everything on this call — slow down and own the conversation.",
  "Ask the question, then be quiet. Let the silence do the work for you.",
  "Activity is what drives your income. There are no shortcuts around the numbers.",
  "I've run this exact process thousands of times, and it works when you work it.",
  "Don't rush the close. Build the value first and the close takes care of itself.",
  "Here's the precise language I use, word for word — steal it and make it yours.",
  "Stay coachable, stay consistent, and the results will compound faster than you think.",
  "Let's break that down step by step so there's no confusion when you're live.",
  "This is how you build real momentum that carries you through the tough weeks.",
  "Repetition is the mother of skill — drill this until it's second nature.",
];

function makeTranscript(rec, total) {
  const seed = rec.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const n = Math.min(13, Math.max(8, Math.round(total / 220) + 7));
  const lines = [`Welcome in — today we're breaking down ${rec.title.toLowerCase()}.`];
  for (let i = 1; i < n - 1; i++) lines.push(TRANSCRIPT_POOL[(seed + i * 5) % TRANSCRIPT_POOL.length]);
  lines.push("That's it for this one. Now go put it to work and write some business.");
  return lines.map((text, i) => ({ t: Math.round((i / n) * total), text }));
}

function MediaPlayer({ rec, tsEntry }) {
  const total = durToSec(rec.duration);
  const simTranscript = useMemo(() => makeTranscript(rec, total), [rec.id, total]);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const tickRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (playing) {
      tickRef.current = setInterval(() => {
        setCur((c) => { if (c + 1 >= total) { setPlaying(false); return total; } return c + 1; });
      }, 1000);
    }
    return () => clearInterval(tickRef.current);
  }, [playing, total]);

  let activeIdx = 0;
  for (let i = 0; i < simTranscript.length; i++) { if (simTranscript[i].t <= cur) activeIdx = i; else break; }

  useEffect(() => {
    const c = scrollRef.current; if (!c) return;
    const el = c.querySelector(".ts-line-on"); if (!el) return;
    const cRect = c.getBoundingClientRect(), eRect = el.getBoundingClientRect();
    const top = c.scrollTop + (eRect.top - cRect.top) - c.clientHeight / 2 + eRect.height / 2;
    c.scrollTo({ top, behavior: "smooth" });
  }, [activeIdx]);

  const pct = total ? (cur / total) * 100 : 0;
  const toggle = () => { if (cur >= total) setCur(0); setPlaying((p) => !p); };
  const seek = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setCur(Math.round(x * total));
  };

  const hasVideo = !!rec.video;
  const realTs = tsEntry?.status === "completed" ? tsEntry : null;

  const tsSubLabel = () => {
    if (!hasVideo) return "Auto-generated · click a line to jump";
    if (realTs) return `${realTs.utterances?.length || 0} segments · speaker-labeled`;
    if (!tsEntry || tsEntry.status === "submitting") return "Starting transcription…";
    if (tsEntry.status === "queued") return "Queued — ready in a few minutes…";
    if (tsEntry.status === "processing") return "Transcribing now…";
    if (tsEntry.status === "error") return "Transcription error — check your AssemblyAI key";
    return "Pending";
  };

  return (
    <div className="mp">
      {hasVideo ? (
        <div className={"media-stage " + (rec.audio ? "media-stage-audio" : "media-stage-video")}>
          <iframe className="media-frame" src={toEmbedUrl(rec.video)} title={rec.title} allow="autoplay; fullscreen" allowFullScreen></iframe>
        </div>
      ) : (
        <div className="media-stage" onClick={toggle}>
          <span className="media-tag">video / audio placeholder</span>
          <button className="media-play" aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
          {playing && <span className="media-live"><span className="media-dot" /> Playing</span>}
        </div>
      )}

      {!hasVideo && (
        <div className="player">
          <button className="player-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
          <div className="player-main">
            <div className="player-track" onClick={seek}>
              <div className="player-fill" style={{ width: pct + "%" }}><span className="player-knob" /></div>
            </div>
            <div className="player-times"><span>{fmt(cur)}</span><span>{fmt(total)}</span></div>
          </div>
        </div>
      )}

      <div className="ts">
        <div className="ts-head">
          <span className="ts-title">Transcript</span>
          <span className="ts-auto">{tsSubLabel()}</span>
        </div>
        {hasVideo ? (
          realTs ? (
            <div className="ts-body" ref={scrollRef}>
              {realTs.utterances?.length > 0 ? (
                realTs.utterances.map((u, i) => (
                  <div key={i} className="ts-line" style={{ cursor: "default" }}>
                    <span className="ts-time">{fmtMs(u.startMs)}</span>
                    {u.speaker && (
                      <span style={{
                        color: SPEAKER_COLORS[u.speaker] || "var(--gold)",
                        fontWeight: 700, fontSize: 10.5, textTransform: "uppercase",
                        letterSpacing: "0.08em", paddingTop: 2, flexShrink: 0, minWidth: 18,
                      }}>{u.speaker}</span>
                    )}
                    <span className="ts-text">{u.text}</span>
                  </div>
                ))
              ) : (
                <div className="ts-line" style={{ cursor: "default" }}>
                  <span className="ts-text">{realTs.text}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="ts-body ts-pending">
              <p className="ts-pending-text">{tsSubLabel()}</p>
            </div>
          )
        ) : (
          <div className="ts-body" ref={scrollRef}>
            {simTranscript.map((seg, i) => (
              <button key={i} className={"ts-line" + (i === activeIdx ? " ts-line-on" : "")} onClick={() => setCur(seg.t)}>
                <span className="ts-time">{fmt(seg.t)}</span>
                <span className="ts-text">{seg.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerModal({ rec, presenter, onClose }) {
  const tsEntry = useTranscriptEntry(rec?.id || "");
  useEffect(() => {
    if (!rec) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [rec, onClose]);
  if (!rec) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-player" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="pm-head">
          <span className="avatar avatar-sm">{presenter ? presenter.initials : "?"}</span>
          <span className="pm-by">
            <span className="pm-presenter">{presenter ? presenter.name : ""}</span>
            <span className="pm-role">{presenter ? presenter.role : ""}</span>
          </span>
          <span className="rec-topic pm-topic">{rec.topic}</span>
        </div>
        <h2 className="modal-title">{rec.title}</h2>
        <MediaPlayer rec={rec} tsEntry={tsEntry} />
      </div>
    </div>
  );
}

function RecordedPresentations() {
  const presenters = window.APEX_PRESENTERS;
  const recordings = window.APEX_RECORDINGS;
  const [sel, setSel] = useState(presenters[0].id);
  const [active, setActive] = useState(null);
  const list = useMemo(() => recordings.filter((r) => r.presenter === sel), [recordings, sel]);
  const activePresenter = presenters.find((p) => p.id === sel);

  return (
    <section className="rec-section" id="recordings">
      <div className="sec-head">
        <p className="hero-kicker">Recorded Presentations</p>
        <h2 className="sec-title">Hear it straight from the people closing business.</h2>
        <p className="sec-sub">Pick a presenter to browse their recorded calls and trainings.</p>
      </div>

      <PresenterSelector presenters={presenters} selected={sel} onSelect={setSel} />

      <div className="rec-listhead">
        <span className="rec-listhead-name">{activePresenter.name}</span>
        <span className="rec-listhead-count">{list.length} recording{list.length === 1 ? "" : "s"}</span>
      </div>
      {list.length === 0 ? (
        <div className="rec-empty">
          <p className="rec-empty-big">No recordings yet</p>
          <p className="rec-empty-sub">{activePresenter.name}'s recordings will appear here once they're added.</p>
        </div>
      ) : (
        <div className="rec-grid">
          {list.map((r) => <RecordingRow key={r.id} rec={r} onOpen={setActive} />)}
        </div>
      )}

      <PlayerModal rec={active} presenter={active ? presenters.find((p) => p.id === active.presenter) : null} onClose={() => setActive(null)} />
    </section>
  );
}

// ── Page chrome ───────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="foot">
      <span>APEX Financial Empire</span>
      <span className="foot-dot">·</span>
      <span>Internal agent resources</span>
      <span className="foot-dot">·</span>
      <span>Confidential — do not distribute</span>
    </footer>
  );
}

function TopBar({ route }) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <a className="brand" href="#home">
          <img src="assets/apex-logo-trans.png" alt="APEX Financial Empire" className="logo" />
        </a>
        <div className="nav-right">
          {route !== "home" && <a className="nav-home" href="#home">← Hub</a>}
          <span className="internal-label"><span className="lock">●</span> Internal Use Only</span>
        </div>
      </div>
    </header>
  );
}

const HUB = [
  {
    route: "presentations",
    num: "01",
    label: "Recorded TRAININGS",
    desc: "Watch and listen to recorded calls and trainings from the team — transcripts auto-generated for every session.",
  },
  {
    route: "library",
    num: "02",
    label: "Resource Library",
    desc: "Scripts, carrier guides, trainings, courses, and PDFs — searchable and filterable by type.",
  },
];

function HomeView() {
  const meta = {
    presentations: window.APEX_PRESENTERS.length + " presenters · " + window.APEX_RECORDINGS.length + " recordings",
    library: window.APEX_RESOURCES.length + " resources",
  };
  return (
    <main className="container">
      <section className="hero">
        <p className="hero-kicker">Agent Hub</p>
        <h1 className="hero-title">Everything you need, in one place.</h1>
        <p className="hero-sub">Recordings, trainings, scripts, and tools — curated for APEX agents and updated weekly.</p>
      </section>

      <div className="hub">
        {HUB.map((h) => (
          <a key={h.route} className="hub-card" href={"#" + h.route}>
            <span className="hub-num">{h.num}</span>
            <span className="hub-body">
              <span className="hub-label">{h.label}</span>
              <span className="hub-desc">{h.desc}</span>
            </span>
            <span className="hub-foot">
              <span className="hub-meta">{meta[h.route]}</span>
              <span className="hub-go">Open<span className="cta-arrow">→</span></span>
            </span>
          </a>
        ))}
      </div>

      <QuickLinks links={window.APEX_QUICKLINKS} />
      <Footer />
    </main>
  );
}

function PresentationsView() {
  return (
    <main className="container">
      <RecordedPresentations />
      <Footer />
    </main>
  );
}

function LibraryView({ t }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(null);
  const all = window.APEX_RESOURCES;

  const counts = useMemo(() => {
    const c = { all: all.length };
    for (const f of FILTERS) if (f.key !== "all") c[f.key] = all.filter((r) => r.type === f.key).length;
    return c;
  }, [all]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((r) => {
      if (filter !== "all" && r.type !== filter) return false;
      if (!q) return true;
      const hay = (r.title + " " + r.desc + " " + r.tags.join(" ")).toLowerCase();
      return hay.includes(q);
    });
  }, [all, filter, query]);

  return (
    <main className="container">
      <section className="page-head">
        <div className="page-head-text">
          <p className="hero-kicker">Resource Library</p>
          <h1 className="sec-title">Scripts, guides &amp; trainings.</h1>
        </div>
        <div className="search">
          <span className="search-icon">⌕</span>
          <input type="text" placeholder="Search resources…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button className="search-clear" onClick={() => setQuery("")} aria-label="Clear">✕</button>}
        </div>
      </section>

      <div className="tabs" role="tablist">
        {FILTERS.filter((f) => f.key === "all" || counts[f.key] > 0).map((f) => (
          <button key={f.key} className={"tab" + (filter === f.key ? " tab-on" : "")} onClick={() => setFilter(f.key)}>
            {f.label}
            {t.showCounts && <span className="tab-count">{counts[f.key]}</span>}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="empty">
          <p className="empty-big">No resources found</p>
          <p className="empty-sub">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid">
          {visible.map((item) => <Card key={item.id} item={item} onOpen={setActive} />)}
        </div>
      )}

      <Footer />
      <Modal item={active} onClose={() => setActive(null)} />
    </main>
  );
}

// ── Public Course Platform ────────────────────────────────────────────────────

function CourseLanding({ courseId, coursesData, learnerName, setLearnerName }) {
  const { courses, lessonsByCourse, quizzesByLesson } = coursesData;
  const course = courses.find(c => c.id === courseId);
  const lessons = lessonsByCourse[courseId] || [];
  const [nameInput, setNameInput] = useState(learnerName);
  const [enrollment, setEnrollment] = useState(null);
  const [progress, setProgress] = useState({});
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!learnerName || !courseId) return;
    fetch(`/api/enroll?courseId=${encodeURIComponent(courseId)}&learnerName=${encodeURIComponent(learnerName)}`)
      .then(r => r.json())
      .then(d => {
        if (d.enrollment) {
          setEnrollment(d.enrollment);
          return fetch(`/api/progress?enrollmentId=${d.enrollment.id}`).then(r => r.json());
        }
      })
      .then(p => { if (p && p.ok) setProgress(p.progress || {}); })
      .catch(() => {});
  }, [learnerName, courseId]);

  if (!course) return (
    <main className="container">
      <p style={{padding:"60px 0",color:"var(--muted)"}}>Course not found.</p>
      <Footer />
    </main>
  );

  const completedCount = Object.values(progress).filter(v => v?.completed).length;
  const allDone = lessons.length > 0 && completedCount >= lessons.length;
  const nextLesson = lessons.find(l => !progress[l.id]?.completed);

  const enroll = async () => {
    const name = nameInput.trim();
    if (!name) return;
    setEnrolling(true);
    try {
      try { sessionStorage.setItem("apex_learner_name", name); } catch {}
      setLearnerName(name);
      const r = await fetch("/api/enroll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, learnerName: name }),
      });
      const d = await r.json();
      if (d.enrollment) {
        setEnrollment(d.enrollment);
        const p = await fetch(`/api/progress?enrollmentId=${d.enrollment.id}`).then(r => r.json());
        if (p.ok) setProgress(p.progress || {});
      }
    } catch {}
    setEnrolling(false);
  };

  return (
    <main className="container">
      <div className="crs-landing-head">
        {course.thumbnail_url && <img src={course.thumbnail_url} alt="" className="crs-landing-thumb" />}
        <div className="crs-landing-info">
          <p className="hero-kicker">Course</p>
          <h1 className="crs-landing-title">{course.title}</h1>
          {course.instructor_name && <p className="crs-landing-instructor">by {course.instructor_name}</p>}
          {course.description && <p className="crs-landing-desc">{course.description}</p>}
          <div className="crs-landing-stats">
            <span>{lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</span>
            {enrollment && <><span className="crs-stat-dot">·</span><span>{completedCount} completed</span></>}
          </div>
        </div>
      </div>

      {!enrollment ? (
        <div className="crs-enroll-box">
          <h2 className="crs-enroll-title">Start this course</h2>
          <p className="crs-enroll-sub">Enter your name to track your progress and earn a certificate of completion.</p>
          <div className="crs-enroll-row">
            <input className="crs-enroll-input" placeholder="Your full name" value={nameInput}
              autoFocus onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && enroll()} />
            <button className="crs-enroll-btn" onClick={enroll} disabled={!nameInput.trim() || enrolling}>
              {enrolling ? "Starting…" : "Start course"}<span className="cta-arrow">→</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="crs-progress-section">
          <div className="crs-progress-bar-wrap">
            <div className="crs-progress-bar">
              <div className="crs-progress-fill" style={{ width: (lessons.length ? (completedCount / lessons.length) * 100 : 0) + "%" }} />
            </div>
            <span className="crs-progress-label">{completedCount} / {lessons.length} completed</span>
          </div>
          {allDone ? (
            <div className="crs-all-done">
              <span>🎉 Course complete!</span>
              <a className="action-btn" href={`#courses/${courseId}/certificate`}>View Certificate<span className="cta-arrow">→</span></a>
            </div>
          ) : nextLesson ? (
            <a className="crs-continue-btn" href={`#courses/${courseId}/${nextLesson.id}`}>
              {completedCount === 0 ? "Start first lesson" : "Continue"}: {nextLesson.title}<span className="cta-arrow">→</span>
            </a>
          ) : null}
        </div>
      )}

      <div className="crs-lesson-pub-list">
        {lessons.map((l, i) => {
          const done = progress[l.id]?.completed;
          const quizCount = (quizzesByLesson[l.id] || []).length;
          return (
            <a key={l.id}
              href={enrollment ? `#courses/${courseId}/${l.id}` : undefined}
              className={"crs-lesson-pub-row" + (done ? " done" : "") + (!enrollment ? " locked" : "")}
              onClick={!enrollment ? e => e.preventDefault() : undefined}>
              <span className={"crs-lpub-num" + (done ? " done" : "")}>{done ? "✓" : i + 1}</span>
              <div className="crs-lpub-body">
                <div className="crs-lpub-title">{l.title}</div>
                <div className="crs-lpub-meta">
                  {l.media_type === "audio" ? "♪ Audio" : "▶ Video"}
                  {l.duration_seconds ? ` · ${Math.floor(l.duration_seconds / 60)}m` : ""}
                  {quizCount > 0 ? ` · ${quizCount} question${quizCount !== 1 ? "s" : ""}` : ""}
                </div>
              </div>
              {enrollment && <span className="crs-lpub-go">{done ? "Replay" : "Watch"} →</span>}
            </a>
          );
        })}
      </div>
      <Footer />
    </main>
  );
}

function CoursePlayer({ courseId, lessonId, coursesData, learnerName }) {
  const { courses, lessonsByCourse, quizzesByLesson } = coursesData;
  const course = courses.find(c => c.id === courseId);
  const lessons = lessonsByCourse[courseId] || [];
  const lesson = lessons.find(l => l.id === lessonId);
  const quizzes = quizzesByLesson[lessonId] || [];
  const [enrollment, setEnrollment] = useState(null);
  const [progress, setProgress] = useState({});
  const [tsExpanded, setTsExpanded] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCert, setShowCert] = useState(false);

  useEffect(() => {
    if (!learnerName || !courseId) { window.location.hash = "#courses/" + courseId; return; }
    setCompleted(false); setSubmitted(false); setAnswers({}); setTsExpanded(false);
    fetch(`/api/enroll?courseId=${encodeURIComponent(courseId)}&learnerName=${encodeURIComponent(learnerName)}`)
      .then(r => r.json())
      .then(async d => {
        if (!d.enrollment) { window.location.hash = "#courses/" + courseId; return; }
        setEnrollment(d.enrollment);
        const [prog, qr] = await Promise.all([
          fetch(`/api/progress?enrollmentId=${d.enrollment.id}`).then(r => r.json()),
          quizzes.length ? fetch(`/api/quiz-response?enrollmentId=${d.enrollment.id}`).then(r => r.json()) : { ok: false },
        ]);
        if (prog.ok) { const p = prog.progress || {}; setProgress(p); setCompleted(!!p[lessonId]?.completed); }
        if (qr.ok && qr.responses?.length) {
          const ans = {}; qr.responses.forEach(r => { ans[r.quiz_id] = r.selected_answer; }); setAnswers(ans);
          if (qr.responses.some(r => r.quiz_id === quizzes[0]?.id)) setSubmitted(true);
        }
      })
      .catch(() => {});
  }, [learnerName, courseId, lessonId]);

  if (!lesson) return <main className="container"><p style={{padding:"60px 0",color:"var(--muted)"}}>Lesson not found.</p><Footer /></main>;

  const lessonIdx = lessons.findIndex(l => l.id === lessonId);
  const prevLesson = lessonIdx > 0 ? lessons[lessonIdx - 1] : null;
  const nextLesson = lessons[lessonIdx + 1];

  const score = quizzes.length ? Math.round(quizzes.filter(q => answers[q.id] === q.correct_answer).length / quizzes.length * 100) : 100;

  const submitQuiz = async () => {
    if (!enrollment || submitting) return;
    setSubmitting(true);
    for (const q of quizzes) {
      if (!answers[q.id]) continue;
      await fetch("/api/quiz-response", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId: enrollment.id, quizId: q.id, selectedAnswer: answers[q.id], correctAnswer: q.correct_answer }),
      }).catch(() => {});
    }
    setSubmitted(true);
    setSubmitting(false);
  };

  const markComplete = async () => {
    if (!enrollment || completing || completed) return;
    setCompleting(true);
    try {
      await fetch("/api/progress", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId: enrollment.id, lessonId }),
      });
      const newProg = { ...progress, [lessonId]: { completed: true, completed_at: new Date().toISOString() } };
      setProgress(newProg);
      setCompleted(true);
      if (lessons.every(l => newProg[l.id]?.completed)) {
        await fetch("/api/enroll", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: enrollment.id, completed_at: new Date().toISOString(), final_score: score }),
        }).catch(() => {});
        setShowCert(true);
      }
    } catch {}
    setCompleting(false);
  };

  if (showCert) return <CourseCertificate courseId={courseId} coursesData={coursesData} learnerName={learnerName} />;

  return (
    <main className="container">
      <div className="crs-player-nav">
        <a href={"#courses/" + courseId} className="crs-player-back">← {course?.title}</a>
        <span className="crs-player-pos">{lessonIdx + 1} / {lessons.length}</span>
      </div>
      <h1 className="crs-player-title">{lesson.title}</h1>

      {lesson.media_url && (
        <div className="crs-player-media">
          <iframe src={toEmbedUrl(lesson.media_url)} title={lesson.title}
            allow="autoplay; fullscreen" allowFullScreen className="crs-player-frame" />
        </div>
      )}

      {lesson.transcript && (
        <div className="crs-ts-box">
          <button className="crs-ts-toggle" onClick={() => setTsExpanded(p => !p)}>
            <span>{tsExpanded ? "▾" : "▸"} Transcript</span>
            <span className="crs-ts-hint">{tsExpanded ? "Collapse" : "Expand"}</span>
          </button>
          {tsExpanded && <div className="crs-ts-body">{lesson.transcript}</div>}
        </div>
      )}

      {quizzes.length > 0 && (
        <div className="crs-quiz-pub-wrap">
          <h2 className="crs-quiz-pub-head">Knowledge Check</h2>
          <p className="crs-quiz-pub-sub">{quizzes.length} question{quizzes.length !== 1 ? "s" : ""}</p>
          {quizzes.map((q, qi) => {
            const sel = answers[q.id];
            return (
              <div key={q.id} className="crs-qpub-card">
                <p className="crs-qpub-question">{qi + 1}. {q.question}</p>
                <div className="crs-qpub-opts">
                  {["a","b","c","d"].map(opt => {
                    if (!q[`option_${opt}`]) return null;
                    const isSel = sel === opt, isCorrect = submitted && opt === q.correct_answer, isWrong = submitted && isSel && !isCorrect;
                    return (
                      <button key={opt}
                        className={"crs-qpub-opt" + (isSel && !submitted ? " sel" : "") + (isCorrect ? " correct" : "") + (isWrong ? " wrong" : "")}
                        disabled={submitted}
                        onClick={() => !submitted && setAnswers(p => ({ ...p, [q.id]: opt }))}>
                        <span className="crs-qpub-letter">{opt.toUpperCase()}</span>
                        {q[`option_${opt}`]}
                      </button>
                    );
                  })}
                </div>
                {submitted && sel && (
                  <p className={"crs-qpub-fb" + (sel === q.correct_answer ? " correct" : " wrong")}>
                    {sel === q.correct_answer ? "✓ Correct!" : `✗ Correct: ${q[`option_${q.correct_answer}`]}`}
                  </p>
                )}
              </div>
            );
          })}
          {!submitted ? (
            <button className="crs-quiz-submit" onClick={submitQuiz}
              disabled={submitting || Object.keys(answers).length < quizzes.length}>
              {submitting ? "Saving…" : "Submit answers"}<span className="cta-arrow">→</span>
            </button>
          ) : (
            <div className="crs-quiz-score">
              Score: {quizzes.filter(q => answers[q.id] === q.correct_answer).length}/{quizzes.length} correct ({score}%)
            </div>
          )}
        </div>
      )}

      <div className="crs-player-foot">
        {!completed ? (
          <button className="crs-mark-btn" onClick={markComplete}
            disabled={completing || !enrollment || (quizzes.length > 0 && !submitted)}>
            {completing ? "Saving…" : "Mark as complete ✓"}
          </button>
        ) : (
          <div className="crs-done-row">
            <span className="crs-done-check">✓ Lesson complete!</span>
            {nextLesson
              ? <a href={`#courses/${courseId}/${nextLesson.id}`} className="action-btn">Next: {nextLesson.title}<span className="cta-arrow">→</span></a>
              : <a href={`#courses/${courseId}`} className="action-btn">View course summary<span className="cta-arrow">→</span></a>}
          </div>
        )}
        <div className="crs-prev-next">
          {prevLesson && <a href={`#courses/${courseId}/${prevLesson.id}`} className="crs-prev-link">← Previous</a>}
          {nextLesson && <a href={`#courses/${courseId}/${nextLesson.id}`} className="crs-next-link">Next →</a>}
        </div>
      </div>
      <Footer />
    </main>
  );
}

function CourseCertificate({ courseId, coursesData, learnerName }) {
  const course = coursesData.courses.find(c => c.id === courseId);
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return (
    <main className="container">
      <div className="cert-wrap">
        <div className="cert-card">
          <img src="assets/apex-logo-trans.png" alt="APEX Financial Empire" className="cert-logo" />
          <p className="cert-kicker">Certificate of Completion</p>
          <p className="cert-name">{learnerName || "Agent"}</p>
          <p className="cert-sub">has successfully completed</p>
          <h2 className="cert-course">{course?.title}</h2>
          <p className="cert-date">{dateStr}</p>
          <p className="cert-org">APEX Financial Empire</p>
          <button className="cert-print-btn" onClick={() => window.print()}>Print Certificate</button>
        </div>
      </div>
      <div style={{textAlign:"center",marginTop:24}}>
        <a href={"#courses/" + courseId} style={{color:"var(--gold)",fontSize:14,fontWeight:600}}>← Back to course</a>
        <span style={{color:"var(--muted)",margin:"0 10px"}}>·</span>
        <a href="#courses" style={{color:"var(--muted)",fontSize:14,fontWeight:600}}>All courses</a>
      </div>
      <Footer />
    </main>
  );
}

function useRoute() {
  const get = () => ((window.location.hash || "").replace("#", "") || "home");
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => { setRoute(get()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

function App() {
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem("apex_auth") === "1"; } catch (e) { return false; }
  });
  const [t, setTweak] = useTweaks(APEX_DEFAULTS);
  const route = useRoute();
  const [, setApiRev] = useState(0);
  const [coursesData, setCoursesData] = useState({ courses: [], lessonsByCourse: {}, quizzesByLesson: {} });
  const [learnerName, setLearnerName] = useState(() => {
    try { return sessionStorage.getItem("apex_learner_name") || ""; } catch { return ""; }
  });

  useAutoTranscribe(authed);

  useEffect(() => {
    if (!authed) return;
    const load = () => {
      fetch("/api/data?t=" + Date.now())
        .then((r) => r.json())
        .then((d) => {
          if (d.recordings) window.APEX_RECORDINGS = d.recordings;
          if (d.presenters) window.APEX_PRESENTERS = d.presenters;
          if (d.resources) window.APEX_RESOURCES = d.resources;
          if (d.quickLinks) window.APEX_QUICKLINKS = d.quickLinks;
          setApiRev((n) => n + 1);
        })
        .catch(() => {});
      fetch("/api/courses-public?t=" + Date.now())
        .then((r) => r.json())
        .then((d) => {
          if (d.courses) {
            setCoursesData(d);
            const courseItems = (d.courses || []).map(c => ({
              id: c.id, type: "course",
              title: c.title, desc: c.description || "", long: c.description || "",
              date: c.created_at?.slice(0, 10) || "", tags: [],
              meta: `${c.lesson_count || 0} lesson${c.lesson_count !== 1 ? "s" : ""}`,
              cta: "Start course", isCourse: true,
            }));
            window.APEX_RESOURCES = [...(window.APEX_RESOURCES || []).filter(r => r.type !== "course"), ...courseItems];
            setApiRev(n => n + 1);
          }
        })
        .catch(() => {});
    };
    load();
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [authed]);

  const rootStyle = { "--gold": t.accent };

  if (!authed) {
    return (
      <div className="page" style={rootStyle}>
        <Gate onUnlock={() => setAuthed(true)} />
      </div>
    );
  }

  const parts = (route || "home").split("/");
  const baseRoute = parts[0];
  const routeCourseId = parts[1];
  const routeLessonId = parts[2];
  const isCourseLanding = baseRoute === "courses" && !!routeCourseId && !routeLessonId;
  const isCourseLesson = baseRoute === "courses" && !!routeCourseId && !!routeLessonId && routeLessonId !== "certificate";
  const isCourseCert = baseRoute === "courses" && !!routeCourseId && routeLessonId === "certificate";
  const viewRoute = ["presentations", "library"].includes(baseRoute) ? baseRoute : baseRoute === "courses" ? "courses" : "home";

  return (
    <div className="page" data-density={t.density} data-cardstyle={t.cardStyle} style={rootStyle}>
      <TopBar route={viewRoute} />
      {viewRoute === "presentations" ? <PresentationsView />
      : viewRoute === "library" ? <LibraryView t={t} />
      : isCourseLanding ? <CourseLanding courseId={routeCourseId} coursesData={coursesData} learnerName={learnerName} setLearnerName={setLearnerName} />
      : isCourseLesson ? <CoursePlayer courseId={routeCourseId} lessonId={routeLessonId} coursesData={coursesData} learnerName={learnerName} />
      : isCourseCert ? <CourseCertificate courseId={routeCourseId} coursesData={coursesData} learnerName={learnerName} />
      : <HomeView />}

      <TweaksPanel>
        <TweakSection label="Brand" />
        <TweakColor label="Accent" value={t.accent}
          options={["#C9A84C", "#D4AF37", "#B8862B", "#E0C56E"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Card style" value={t.cardStyle}
          options={["bordered", "filled", "minimal"]}
          onChange={(v) => setTweak("cardStyle", v)} />
        <TweakRadio label="Density" value={t.density}
          options={["compact", "regular", "comfy"]}
          onChange={(v) => setTweak("density", v)} />
        <TweakToggle label="Tab counts" value={t.showCounts}
          onChange={(v) => setTweak("showCounts", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
