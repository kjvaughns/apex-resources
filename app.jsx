// APEX Resources — main app
const { useState, useMemo, useEffect, useRef } = React;

const TYPE_META = {
  video:    { label: "Video",    color: "#E5484D", icon: "▶" },
  pdf:      { label: "PDF",      color: "#4C7DF0", icon: "▤" },
  training: { label: "Training", color: "var(--gold)", icon: "★" },
  guide:    { label: "Guide",    color: "#46A758", icon: "▦" },
};

const FILTERS = [
  { key: "all",      label: "All" },
  { key: "video",    label: "Videos" },
  { key: "pdf",      label: "PDFs" },
  { key: "training", label: "Trainings" },
  { key: "guide",    label: "Guides" },
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
  return (
    <button className="card" style={{ "--bc": m.color }} onClick={() => onOpen(item)}>
      <div className="card-top">
        <Badge type={item.type} size="sm" />
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
          <a key={l.label} className="ql-card" href={l.href} target="_blank" rel="noreferrer">
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
          <iframe className="media-frame" src={rec.video} title={rec.title} allow="autoplay; fullscreen" allowFullScreen></iframe>
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
    desc: "Scripts, carrier guides, trainings, and PDFs — searchable and filterable by type.",
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

  useAutoTranscribe(authed);

  useEffect(() => {
    if (!authed) return;
    fetch("/api/data")
      .then((r) => r.json())
      .then((d) => {
        if (d.recordings) window.APEX_RECORDINGS = d.recordings;
        if (d.presenters) window.APEX_PRESENTERS = d.presenters;
        if (d.resources) window.APEX_RESOURCES = d.resources;
        if (d.quickLinks) window.APEX_QUICKLINKS = d.quickLinks;
        setApiRev((n) => n + 1);
      })
      .catch(() => {});
  }, [authed]);

  const rootStyle = { "--gold": t.accent };

  if (!authed) {
    return (
      <div className="page" style={rootStyle}>
        <Gate onUnlock={() => setAuthed(true)} />
      </div>
    );
  }

  const valid = ["presentations", "library"].includes(route) ? route : "home";

  return (
    <div className="page" data-density={t.density} data-cardstyle={t.cardStyle} style={rootStyle}>
      <TopBar route={valid} />
      {valid === "presentations" ? <PresentationsView /> : valid === "library" ? <LibraryView t={t} /> : <HomeView />}

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
