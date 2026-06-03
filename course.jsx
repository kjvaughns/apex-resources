// APEX Course Platform — learner experience
// Exports to window: CourseCard, CourseExperience, readCourseState
const { useState, useMemo, useEffect, useRef, useCallback } = React;

/* ---------- icons (line, currentColor) ---------- */
const C = ({ d, fill, sw = 1.8, vb = "0 0 24 24" }) => (
  <svg viewBox={vb} fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"}
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const CIcon = {
  play: () => <C fill sw={0} d={<path d="M8 5.5v13l11-6.5z" />} />,
  pause: () => <C fill sw={0} d={<><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>} />,
  lock: () => <C d={<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>} />,
  check: () => <C sw={2.6} d={<path d="M4 12.5l5 5L20 6.5" />} />,
  clock: () => <C d={<><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>} />,
  video: () => <C d={<><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></>} />,
  audio: () => <C d={<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />} />,
  quiz: () => <C d={<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.8-2.5 2-2.5 4M12 17.2h.01" /></>} />,
  lessons: () => <C d={<><path d="M4 5h11M4 12h11M4 19h7" /><path d="M18 9l3 3-3 3" /></>} />,
  back: () => <C d={<path d="M15 6l-6 6 6 6" />} />,
  fwd: () => <C d={<path d="M9 6l6 6-6 6" />} />,
  award: () => <C d={<><circle cx="12" cy="9" r="6" /><path d="M9 14.5L7.5 22l4.5-2.5L16.5 22 15 14.5" /></>} />,
  share: () => <C d={<><circle cx="6" cy="12" r="2.6" /><circle cx="17" cy="6" r="2.6" /><circle cx="17" cy="18" r="2.6" /><path d="M8.3 10.8l6.4-3.6M8.3 13.2l6.4 3.6" /></>} />,
  download: () => <C d={<><path d="M12 4v11M8 11l4 4 4-4" /><path d="M5 19h14" /></>} />,
  spark: () => <C fill sw={0} d={<path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z" />} />,
};

/* ---------- time helpers ---------- */
function durToSec(d) {
  if (!d) return 0;
  if (/h/.test(d)) { const h = (d.match(/(\d+)\s*h/) || [])[1] || 0; const m = (d.match(/(\d+)\s*m/) || [])[1] || 0; return h * 3600 + m * 60; }
  const p = d.split(":").map(Number); return p.length === 2 ? p[0] * 60 + p[1] : p[0];
}
function fmt(s) { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60), ss = s % 60; return m + ":" + String(ss).padStart(2, "0"); }
function humanTime(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return m + " min";
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

/* ---------- curriculum flattening + stats ---------- */
function flatten(course) {
  const steps = [];
  course.modules.forEach((mod, mi) => {
    mod.items.forEach((it) => steps.push({ ...it, moduleIdx: mi, moduleTitle: mod.title }));
  });
  let ln = 0;
  steps.forEach((s) => { if (s.kind === "lesson") s.lessonNo = ++ln; });
  return steps;
}
function courseStats(course) {
  const steps = flatten(course);
  const lessons = steps.filter((s) => s.kind === "lesson");
  const quizzes = steps.filter((s) => s.kind === "quiz");
  const totalSec = lessons.reduce((a, s) => a + durToSec(s.duration), 0);
  return { lessons: lessons.length, quizzes: quizzes.length, totalSec, steps };
}

/* ---------- persistence (keyed by email so progress follows the person) ---------- */
const ID_KEY = "apex_course_identity";
function readIdentity() { try { return JSON.parse(localStorage.getItem(ID_KEY)) || null; } catch (e) { return null; } }
function writeIdentity(id) { try { localStorage.setItem(ID_KEY, JSON.stringify(id)); } catch (e) {} }
function emailKey(email) { return (email || "").trim().toLowerCase(); }
function blankState() { return { name: "", email: "", completed: {}, notes: {}, quiz: {}, lastStep: 0, finishedAt: null, timeSpent: 0 }; }
function stateKey(courseId, email) { return "apex_course_" + courseId + "__" + emailKey(email); }
function readCourseState(courseId, email) {
  if (!email) return blankState();
  try { const raw = localStorage.getItem(stateKey(courseId, email)); if (raw) return { ...blankState(), ...JSON.parse(raw) }; } catch (e) {}
  return blankState();
}
function writeCourseState(courseId, email, st) { if (!email) return; try { localStorage.setItem(stateKey(courseId, email), JSON.stringify(st)); } catch (e) {} }
function useCourseState(courseId, email) {
  const [state, setState] = useState(() => readCourseState(courseId, email));
  useEffect(() => { setState(readCourseState(courseId, email)); }, [courseId, email]);
  const update = useCallback((patch) => {
    setState((prev) => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      writeCourseState(courseId, email, next);
      return next;
    });
  }, [courseId, email]);
  return [state, update];
}
function progressOf(course, state) {
  const { lessons, steps } = courseStats(course);
  const doneLessons = steps.filter((s) => s.kind === "lesson" && state.completed[s.id]).length;
  return lessons ? Math.round((doneLessons / lessons) * 100) : 0;
}
function isStepUnlocked(steps, state, gi) {
  if (state.finishedAt) return true;
  if (state.completed[steps[gi].id]) return true;
  let u = 0;
  for (let i = 0; i < steps.length; i++) { if (state.completed[steps[i].id]) u = i + 1; else break; }
  return gi <= u;
}

/* ---------- transcript helpers (reads from KV via API, caches in localStorage) ---------- */
const TS_KEY = "apex_ts_v1";
function tsGet(id) {
  try { return (JSON.parse(localStorage.getItem(TS_KEY) || "{}")[id]) || null; } catch { return null; }
}
function useTranscriptEntry(id) {
  const [entry, setEntry] = useState(() => tsGet(id));
  useEffect(() => {
    setEntry(tsGet(id));
    const h = (e) => { if (!e.detail || e.detail.recId === id) setEntry(tsGet(id)); };
    window.addEventListener("apex_ts", h);
    return () => window.removeEventListener("apex_ts", h);
  }, [id]);
  return entry;
}
let _tsFetched = false;
function useSyncTranscripts() {
  useEffect(() => {
    if (_tsFetched) return;
    _tsFetched = true;
    fetch("/api/transcripts")
      .then((r) => r.json())
      .then((all) => {
        try {
          const store = JSON.parse(localStorage.getItem(TS_KEY) || "{}");
          Object.assign(store, all);
          localStorage.setItem(TS_KEY, JSON.stringify(store));
          window.dispatchEvent(new CustomEvent("apex_ts", { detail: null }));
        } catch {}
      })
      .catch(() => {});
  }, []);
}

/* ---------- transcript generator ---------- */
const CO_POOL = [
  "The first thing to understand is that this is a skill — and skills are learnable.",
  "Most agents get this exact part wrong, and it quietly costs them deals every week.",
  "Write this down, because it matters more than almost anything else I'll cover.",
  "Let me give you a real example from the field so you can see it in action.",
  "Your tonality is everything here — slow down and own the conversation.",
  "Ask the question, then stop talking. Let the silence do the work for you.",
  "Activity is what drives the income. There is no shortcut around the numbers.",
  "I've run this exact process thousands of times — it works when you work it.",
  "Don't rush the close. Build the value first and the close takes care of itself.",
  "Here's the precise language I use, word for word. Steal it and make it yours.",
  "Stay coachable and consistent, and the results compound faster than you'd think.",
  "Let's break that down step by step so there's zero confusion when you go live.",
];
function makeTranscript(step, total) {
  const seed = step.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const n = Math.min(11, Math.max(7, Math.round(total / 70)));
  const lines = [`Welcome in — in this lesson we're breaking down ${step.title.toLowerCase()}.`];
  for (let i = 1; i < n - 1; i++) lines.push(CO_POOL[(seed + i * 5) % CO_POOL.length]);
  lines.push("That's it for this one. Now go put it to work and write some business.");
  return lines.map((text, i) => ({ t: Math.round((i / n) * total), text }));
}

/* ===================== LIBRARY CARD ===================== */
function CourseCard({ item, onOpen }) {
  const st = courseStats(item.course);
  const identity = readIdentity();
  const state = identity ? readCourseState(item.id, identity.email) : blankState();
  const pct = progressOf(item.course, state);
  const enrolled = !!(identity && state.name);
  const started = enrolled && pct > 0;
  const finished = !!state.finishedAt;
  const cta = finished ? "Review Course" : started ? "Continue" : "Start Course";
  const lessonsLeft = st.lessons - st.steps.filter((s) => s.kind === "lesson" && state.completed[s.id]).length;
  return (
    <article className="co-card">
      <div className="co-card-thumb">
        <span className="co-card-emblem">APEX</span>
        <span className="co-card-thumb-tag">course cover</span>
        <span className="co-card-level">{item.course.level || "Course"}</span>
      </div>
      <div className="co-card-body">
        <div className="co-card-head">
          <h3 className="co-card-title">{item.title}</h3>
          <div className="co-card-by">
            <span className="co-avatar">{(item.course.instructor || "?")[0]}</span>
            <span className="co-card-by-txt">with <b>{item.course.instructor}</b> · {item.course.instructorRole}</span>
          </div>
        </div>
        <p className="co-card-desc">{item.desc}</p>
        <div className="co-card-stats">
          <span className="co-card-stat"><CIcon.lessons />{st.lessons} lessons</span>
          <span className="co-card-dot">·</span>
          <span className="co-card-stat"><CIcon.clock />{humanTime(st.totalSec)}</span>
          <span className="co-card-dot">·</span>
          <span className="co-card-stat"><CIcon.quiz />{st.quizzes} quizzes</span>
        </div>
        {started && !finished && (
          <div className="co-progress">
            <div className="co-progress-top">
              <span className="co-progress-label">Your progress</span>
              <span className="co-progress-pct">{pct}%</span>
            </div>
            <div className="co-track"><div className="co-track-fill" style={{ width: pct + "%" }} /></div>
          </div>
        )}
        <div className="co-card-foot">
          <button className="co-btn" onClick={() => onOpen(item, finished ? "landing" : started ? "player" : "landing")}>
            {cta}<span className="cta-arrow">→</span>
          </button>
          {finished && <span className="co-resume">✓ Certificate earned</span>}
          {started && !finished && <span className="co-resume">{lessonsLeft} lesson{lessonsLeft === 1 ? "" : "s"} left</span>}
        </div>
      </div>
    </article>
  );
}

/* ===================== NAME + EMAIL MODAL ===================== */
function isEmail(v) { return /^\S+@\S+\.\S+$/.test(v.trim()); }
function NameModal({ courseId, initName = "", initEmail = "", onSubmit, onClose }) {
  const [name, setName] = useState(initName);
  const [email, setEmail] = useState(initEmail);
  const [err, setErr] = useState("");
  const [found, setFound] = useState(null);
  const ref = useRef(null);
  useEffect(() => { ref.current && ref.current.focus(); const k = (e) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  const checkRecall = (em) => {
    if (!isEmail(em)) { setFound(null); return; }
    const prev = readCourseState(courseId, em);
    if (prev && (prev.name || Object.keys(prev.completed).length || prev.finishedAt)) {
      setFound(prev);
      if (!name.trim() && prev.name) setName(prev.name);
    } else setFound(null);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Please enter your name."); return; }
    if (!isEmail(email)) { setErr("Please enter a valid email."); return; }
    onSubmit(name.trim(), email.trim());
  };

  const foundPct = found ? (found.finishedAt ? 100 : Math.round((Object.keys(found.completed).filter((k) => k[0] === "l").length / 6) * 100)) : 0;

  return (
    <div className="co-overlay" onClick={onClose}>
      <form className="co-modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="co-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="co-modal-emblem"><CIcon.spark /></div>
        <p className="co-modal-kicker">Begin Course</p>
        <h2 className="co-modal-title">Let's get you set up</h2>
        <p className="co-modal-sub">Enter your name and email so we can save your progress and put your name on the certificate.</p>
        <div className="co-field"><input ref={ref} type="text" placeholder="Your full name" value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} /></div>
        <div className="co-field" style={{ marginTop: 10 }}><input type="email" placeholder="you@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} onBlur={(e) => checkRecall(e.target.value)} /></div>
        {found && !err && (
          <p className="co-modal-recall"><CIcon.check /> Welcome back — we found your saved progress{found.finishedAt ? " (course complete)" : foundPct ? ` (${foundPct}% done)` : ""}. You'll pick up right where you left off.</p>
        )}
        {err && <p className="co-modal-err">{err}</p>}
        <button type="submit" className="co-btn">{found ? "Resume Course" : "Start Learning"}<span className="cta-arrow">→</span></button>
        <p className="co-modal-foot">Saved on this device · enter the same email anytime to continue</p>
      </form>
    </div>
  );
}

/* ===================== LANDING ===================== */
function Landing({ resource, course, state, onEnroll, onResume, onViewCert, onOpenStep }) {
  const st = courseStats(course);
  const steps = st.steps;
  const pct = progressOf(course, state);
  const enrolled = !!state.name;
  const finished = !!state.finishedAt;
  return (
    <div className="co-landing">
      <div className="co-land-hero">
        <div>
          <p className="co-land-kicker"><CIcon.spark /> {course.level || "Course"}</p>
          <h1 className="co-land-title">{resource.title}</h1>
          <div className="co-land-by">
            <span className="co-avatar">{(course.instructor || "?")[0]}</span>
            <span>
              <div className="co-land-by-name">{course.instructor}</div>
              <div className="co-land-by-role">{course.instructorRole}</div>
            </span>
          </div>
          <p className="co-land-desc">{resource.long || resource.desc}</p>

          <div className="co-land-learn">
            <h2 className="co-land-h">What you'll learn</h2>
            <div className="co-learn-grid">
              {(course.learn || []).map((l, i) => (
                <div key={i} className="co-learn-item">
                  <span className="co-learn-check"><CIcon.check /></span>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="co-enroll">
          <div className="co-enroll-thumb">course cover</div>
          <div className="co-enroll-stats">
            <div className="co-stat-cell"><div className="co-stat-num">{st.lessons}</div><div className="co-stat-lbl">Lessons</div></div>
            <div className="co-stat-cell"><div className="co-stat-num">{humanTime(st.totalSec).replace(" min", "m").replace("h ", "h")}</div><div className="co-stat-lbl">Length</div></div>
            <div className="co-stat-cell"><div className="co-stat-num">{st.quizzes}</div><div className="co-stat-lbl">Quizzes</div></div>
          </div>
          {finished ? (
            <>
              <button className="co-btn co-enroll-resume" onClick={onViewCert}>View Certificate<span className="cta-arrow">→</span></button>
              <button className="co-btn co-btn-ghost" onClick={onResume} style={{ width: "100%" }}>Review lessons</button>
            </>
          ) : enrolled ? (
            <>
              <div className="co-progress co-enroll-resume" style={{ marginBottom: 16 }}>
                <div className="co-progress-top"><span className="co-progress-label">In progress</span><span className="co-progress-pct">{pct}%</span></div>
                <div className="co-track"><div className="co-track-fill" style={{ width: pct + "%" }} /></div>
              </div>
              <button className="co-btn" onClick={onResume}>Continue Course<span className="cta-arrow">→</span></button>
              <p className="co-enroll-note">Welcome back, {state.name.split(" ")[0]}.</p>
            </>
          ) : (
            <>
              <button className="co-btn" onClick={onEnroll}>Enroll &amp; Start<span className="cta-arrow">→</span></button>
              <p className="co-enroll-note">Free for APEX agents · self-paced</p>
            </>
          )}
        </aside>
      </div>

      <div className="co-curric">
        <h2 className="co-land-h" style={{ fontSize: 30 }}>Course curriculum</h2>
        {course.modules.map((mod, mi) => {
          const firstGi = steps.findIndex((s) => s.id === mod.items[0].id);
          const modOpen = enrolled && isStepUnlocked(steps, state, firstGi);
          const ModWrap = modOpen ? "button" : "div";
          return (
            <div key={mi} className="co-module">
              <ModWrap className={"co-module-head" + (modOpen ? " co-module-head-on" : "")}
                {...(modOpen ? { onClick: () => onOpenStep(firstGi) } : {})}>
                <span className="co-module-n">{String(mi + 1).padStart(2, "0")}</span>
                <span className="co-module-title">{mod.title}</span>
                <span className="co-module-count">{mod.items.length} items</span>
                {modOpen && <span className="co-module-arr"><CIcon.fwd /></span>}
              </ModWrap>
              {mod.items.map((it) => {
                const gi = steps.findIndex((s) => s.id === it.id);
                const done = !!state.completed[it.id];
                const unlocked = enrolled && isStepUnlocked(steps, state, gi);
                const Wrap = unlocked ? "button" : "div";
                return (
                  <Wrap key={it.id} className={"co-litem" + (done ? " co-done" : "") + (it.kind === "quiz" ? " co-quiz" : "") + (unlocked ? "" : " co-locked")}
                    {...(unlocked ? { onClick: () => onOpenStep(gi) } : {})}>
                    <span className="co-litem-ico">{done ? <CIcon.check /> : !unlocked && enrolled ? <CIcon.lock /> : it.kind === "quiz" ? <CIcon.quiz /> : it.media === "audio" ? <CIcon.audio /> : <CIcon.video />}</span>
                    <span className="co-litem-body">
                      <span className="co-litem-title">{it.title}</span>
                      <span className="co-litem-sub">{it.kind === "quiz" ? `${it.questions.length} questions · ${Math.round(it.pass * 100)}% to pass` : it.blurb}</span>
                    </span>
                    <span className="co-litem-meta">
                      {it.kind === "quiz" ? <span className="co-litem-kind">Quiz</span> : <span>{it.duration}</span>}
                      {!enrolled && <span className="co-litem-lock"><CIcon.lock /></span>}
                      {unlocked && <span className="co-litem-go"><CIcon.fwd /></span>}
                    </span>
                  </Wrap>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== LESSON MEDIA ===================== */
function toEmbedUrl(src) {
  if (!src || src === "#") return null;
  const m = src.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  const v = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?#]+)/);
  if (v) return `https://www.youtube.com/embed/${v[1]}`;
  return src;
}

function LessonMedia({ step }) {
  const total = durToSec(step.duration);
  const tsEntry = useTranscriptEntry(step.id);
  const transcript = useMemo(() => {
    if (tsEntry?.status === "completed" && tsEntry.utterances?.length) {
      return tsEntry.utterances.map((u) => ({ t: Math.round((u.startMs || 0) / 1000), text: u.text }));
    }
    return makeTranscript(step, total);
  }, [tsEntry?.status, tsEntry?.utterances, step.id, total]);
  const isRealTranscript = tsEntry?.status === "completed" && tsEntry.utterances?.length > 0;
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const tick = useRef(null), scrollRef = useRef(null);
  const [openTs, setOpenTs] = useState(true);

  const embedUrl = toEmbedUrl(step.link);
  const hasEmbed = !!embedUrl;
  const isAudio = step.media === "audio";

  useEffect(() => { setPlaying(false); setCur(0); }, [step.id]);
  useEffect(() => {
    if (playing) tick.current = setInterval(() => setCur((c) => { if (c + 1 >= total) { setPlaying(false); return total; } return c + 1; }), 1000);
    return () => clearInterval(tick.current);
  }, [playing, total]);

  let active = 0;
  for (let i = 0; i < transcript.length; i++) { if (transcript[i].t <= cur) active = i; else break; }
  useEffect(() => {
    const c = scrollRef.current; if (!c) return; const el = c.querySelector(".co-ts-line-on"); if (!el) return;
    const cr = c.getBoundingClientRect(), er = el.getBoundingClientRect();
    c.scrollTo({ top: c.scrollTop + (er.top - cr.top) - c.clientHeight / 2 + er.height / 2, behavior: "smooth" });
  }, [active]);

  const pct = total ? (cur / total) * 100 : 0;
  const toggle = () => { if (cur >= total) setCur(0); setPlaying((p) => !p); };
  const seek = (e) => { const r = e.currentTarget.getBoundingClientRect(); setCur(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * total)); };

  return (
    <>
      {hasEmbed ? (
        <div className={"co-media" + (isAudio ? " co-media-audio" : "")}>
          <iframe src={embedUrl} title={step.title} allow="autoplay; fullscreen"
            allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
        </div>
      ) : (
        <div className={"co-media" + (isAudio ? " co-media-audio" : "") + (playing ? " co-playing" : "")} onClick={toggle}>
          {isAudio ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div className="co-media-wave">{Array.from({ length: 19 }).map((_, i) => <i key={i} style={{ height: 16 + ((i * 37) % 40), animationDelay: (i * 0.07) + "s" }} />)}</div>
              <button className="co-media-play" aria-label={playing ? "Pause" : "Play"}>{playing ? <CIcon.pause /> : <CIcon.play />}</button>
            </div>
          ) : (
            <button className="co-media-play" aria-label={playing ? "Pause" : "Play"}>{playing ? <CIcon.pause /> : <CIcon.play />}</button>
          )}
          <span className="co-media-tag">{isAudio ? "audio lesson" : "video lesson"}</span>
          {playing && <span className="co-media-badge"><span className="co-media-dot" /> Playing</span>}
        </div>
      )}

      {!hasEmbed && (
        <div className="co-bar">
          <button className="co-bar-btn" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? <CIcon.pause /> : <CIcon.play />}</button>
          <div className="co-bar-main">
            <div className="co-bar-track" onClick={seek}><div className="co-bar-fill" style={{ width: pct + "%" }}><span className="co-bar-knob" /></div></div>
            <div className="co-bar-times"><span>{fmt(cur)}</span><span>{fmt(total)}</span></div>
          </div>
        </div>
      )}

      <div className="co-panels">
        <div className={"co-disc" + (openTs ? " co-disc-open" : "")}>
          <button className="co-disc-head" onClick={() => setOpenTs((o) => !o)}>
            Transcript <span className="co-disc-note">{isRealTranscript ? "click to jump" : tsEntry?.status === "processing" || tsEntry?.status === "queued" ? "transcribing…" : "auto-generated · click to jump"}</span>
            <span className="co-disc-chev">▶</span>
          </button>
          {openTs && (
            <div className="co-disc-body" ref={scrollRef} style={{ maxHeight: 240, overflowY: "auto" }}>
              {transcript.map((seg, i) => (
                <button key={i} className={"co-ts-line" + (i === active ? " co-ts-line-on" : "")} onClick={() => setCur(seg.t)}>
                  <span className="co-ts-time">{fmt(seg.t)}</span><span className="co-ts-text">{seg.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ===================== NOTES ===================== */
function Notes({ step, state, update }) {
  const [open, setOpen] = useState(false);
  const val = state.notes[step.id] || "";
  const [saved, setSaved] = useState(false);
  const save = (v) => { update((p) => ({ ...p, notes: { ...p.notes, [step.id]: v } })); setSaved(true); };
  return (
    <div className={"co-disc" + (open ? " co-disc-open" : "")}>
      <button className="co-disc-head" onClick={() => setOpen((o) => !o)}>
        My notes <span className="co-disc-note">{val.trim() ? "saved for this lesson" : "private to you"}</span>
        <span className="co-disc-chev">▶</span>
      </button>
      {open && (
        <div className="co-disc-body" style={{ padding: "8px 14px 16px" }}>
          <textarea className="co-notes-area" placeholder="Jot down the lines you want to remember…" value={val}
            onChange={(e) => { save(e.target.value); }} />
          {saved && val.trim() && <p className="co-notes-saved"><CIcon.check /> Saved automatically</p>}
        </div>
      )}
    </div>
  );
}

/* ===================== QUIZ ===================== */
const KEYS = ["A", "B", "C", "D", "E"];
function QuizRunner({ step, state, update, onPass, onExit }) {
  const qs = step.questions;
  const prior = state.quiz[step.id];
  const [phase, setPhase] = useState(prior && prior.passed ? "result" : "run");
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(prior ? prior.score : 0);

  const start = () => { setPhase("run"); setQi(0); setPicked(null); setAnswers([]); setScore(0); };
  const choose = (i) => { if (picked != null) return; setPicked(i); };
  const next = () => {
    const correct = picked === qs[qi].answer;
    const ns = score + (correct ? 1 : 0);
    const na = [...answers, picked];
    if (qi + 1 < qs.length) { setScore(ns); setAnswers(na); setQi(qi + 1); setPicked(null); }
    else {
      const pct = ns / qs.length;
      const passed = pct >= step.pass;
      setScore(ns); setAnswers(na);
      update((p) => ({ ...p, quiz: { ...p.quiz, [step.id]: { score: ns, total: qs.length, passed } } }));
      setPhase("result");
    }
  };

  if (phase === "result") {
    const total = qs.length;
    const sc = prior && prior.passed && phase === "result" && answers.length === 0 ? prior.score : score;
    const pct = Math.round((sc / total) * 100);
    const passed = pct >= step.pass * 100;
    const R = 80, CIRC = 2 * Math.PI * R;
    return (
      <div className="co-result">
        <div className="co-result-card">
          <div className="co-result-ring">
            <svg viewBox="0 0 180 180">
              <circle className="co-result-ring-track" cx="90" cy="90" r={R} />
              <circle className="co-result-ring-fill" cx="90" cy="90" r={R}
                stroke={passed ? "var(--co-green)" : "var(--co-red)"}
                strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct / 100)} />
            </svg>
            <div className="co-result-pct"><span className="co-result-pct-num">{pct}%</span><span className="co-result-pct-lbl">Score</span></div>
          </div>
          <h2 className={"co-result-verdict " + (passed ? "pass" : "fail")}>{passed ? "Passed" : "Not yet"}</h2>
          <p className="co-result-sub">
            You got <b style={{ color: "var(--text)" }}>{sc} of {total}</b> correct
            {passed ? ` — that clears the ${Math.round(step.pass * 100)}% bar. Nicely done.` : `. You need ${Math.round(step.pass * 100)}% to move on. Review and try again.`}
          </p>
          <div className="co-result-foot">
            {passed ? (
              <>
                <button className="co-btn co-btn-ghost" onClick={start}>Retake</button>
                <button className="co-btn" onClick={onPass}>Continue<span className="cta-arrow">→</span></button>
              </>
            ) : (
              <>
                <button className="co-btn co-btn-ghost" onClick={onExit}>Back to lessons</button>
                <button className="co-btn" onClick={start}>Retake quiz<span className="cta-arrow">→</span></button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const q = qs[qi];
  const revealed = picked != null;
  return (
    <div className="co-quiz">
      <div className="co-quiz-card">
        <div className="co-quiz-top">
          <span className="co-quiz-kicker"><CIcon.quiz /> {step.title}</span>
          <span className="co-quiz-count">Question {qi + 1} / {qs.length}</span>
        </div>
        <div className="co-quiz-track"><div className="co-quiz-track-fill" style={{ width: ((qi + (revealed ? 1 : 0)) / qs.length) * 100 + "%" }} /></div>
        <h2 className="co-quiz-q">{q.q}</h2>
        <div className="co-quiz-opts">
          {q.options.map((opt, i) => {
            let cls = "co-opt";
            if (revealed) {
              if (i === q.answer) cls += " co-opt-correct";
              else if (i === picked) cls += " co-opt-wrong";
            } else if (i === picked) cls += " co-opt-sel";
            return (
              <button key={i} className={cls} disabled={revealed} onClick={() => choose(i)}>
                <span className="co-opt-key">{KEYS[i]}</span>
                <span className="co-opt-txt">{opt}</span>
                <span className="co-opt-mark">{revealed && i === q.answer ? <CIcon.check /> : revealed && i === picked ? "✕" : ""}</span>
              </button>
            );
          })}
        </div>
        <div className="co-quiz-foot">
          <span className={"co-quiz-feedback " + (revealed ? (picked === q.answer ? "ok" : "no") : "")}>
            {revealed ? (picked === q.answer ? "Correct" : "Not quite — the highlighted answer is right.") : "Select an answer"}
          </span>
          <button className="co-btn" disabled={!revealed} onClick={next} style={revealed ? null : { opacity: 0.4 }}>
            {qi + 1 < qs.length ? "Next" : "See results"}<span className="cta-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== PLAYER ===================== */
function Player({ resource, course, steps, state, update, onBack, onComplete, initialStep }) {
  const firstIncomplete = useMemo(() => {
    const i = steps.findIndex((s) => !state.completed[s.id]);
    return i < 0 ? steps.length - 1 : i;
  }, []);
  const [idx, setIdx] = useState(() => initialStep != null ? Math.min(initialStep, steps.length - 1) : Math.min(state.lastStep ?? firstIncomplete, steps.length - 1));
  const step = steps[idx];

  const unlockedThru = useMemo(() => {
    let u = 0;
    for (let i = 0; i < steps.length; i++) { if (state.completed[steps[i].id]) u = i + 1; else break; }
    return Math.max(u, state.finishedAt ? steps.length - 1 : 0);
  }, [state.completed, state.finishedAt]);

  const isUnlocked = (i) => i <= unlockedThru || state.completed[steps[i].id] || !!state.finishedAt;
  const goTo = (i) => { if (i >= 0 && i < steps.length && isUnlocked(i)) { setIdx(i); update({ lastStep: i }); window.scrollTo(0, 0); } };

  const markDone = (id, sec) => update((p) => ({ ...p, completed: { ...p.completed, [id]: true }, timeSpent: (p.timeSpent || 0) + (p.completed[id] ? 0 : sec) }));

  const advanceFrom = (i) => {
    if (i + 1 < steps.length) { setIdx(i + 1); update({ lastStep: i + 1 }); window.scrollTo(0, 0); }
    else onComplete();
  };
  const completeLesson = () => { markDone(step.id, durToSec(step.duration)); advanceFrom(idx); };
  const passQuiz = () => { markDone(step.id, 0); advanceFrom(idx); };

  const pct = progressOf(course, state);
  const prev = idx > 0 ? steps[idx - 1] : null;
  const nextStep = idx + 1 < steps.length ? steps[idx + 1] : null;

  return (
    <div className="co-player">
      <aside className="co-side">
        <div className="co-side-head">
          <button className="co-side-back" onClick={onBack}><CIcon.back /> Course home</button>
          <div className="co-side-title">{resource.title}</div>
          <div className="co-side-prog co-progress">
            <div className="co-progress-top"><span className="co-progress-label">Progress</span><span className="co-progress-pct">{pct}%</span></div>
            <div className="co-track"><div className="co-track-fill" style={{ width: pct + "%" }} /></div>
          </div>
        </div>
        <nav className="co-side-nav">
          {course.modules.map((mod, mi) => (
            <React.Fragment key={mi}>
              <div className="co-side-mod">{String(mi + 1).padStart(2, "0")} · {mod.title}</div>
              {mod.items.map((it) => {
                const gi = steps.findIndex((s) => s.id === it.id);
                const done = !!state.completed[it.id];
                const locked = !isUnlocked(gi);
                return (
                  <button key={it.id} disabled={locked}
                    className={"co-side-item" + (gi === idx ? " co-side-item-on" : "") + (done ? " co-done" : "")}
                    onClick={() => goTo(gi)}>
                    <span className="co-tick">{done ? <CIcon.check /> : locked ? <span className="co-tick-lock"><CIcon.lock /></span> : it.kind === "quiz" ? <CIcon.quiz /> : ""}</span>
                    <span className="co-side-item-txt"><span className="co-side-item-name">{it.title}</span></span>
                    <span className="co-side-item-dur">{it.kind === "quiz" ? "Quiz" : it.duration}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>
      </aside>

      <div className="co-main">
        <div className="co-main-inner">
          <button className="co-main-back" onClick={onBack}><CIcon.back /> Course contents</button>
          {step.kind === "quiz" ? (
            <>
              <div className="co-lesson-eyebrow"><b>Quiz</b> · {step.moduleTitle}</div>
              <QuizRunner step={step} state={state} update={update}
                onPass={passQuiz} onExit={() => goTo(Math.max(0, idx - 1))} />
            </>
          ) : (
            <>
              <div className="co-lesson-eyebrow"><b>Lesson {step.lessonNo}</b> · {step.moduleTitle}</div>
              <h1 className="co-lesson-title">{step.title}</h1>
              <p className="co-lesson-blurb">{step.blurb}</p>

              <LessonMedia step={step} />
              <div className="co-panels"><Notes step={step} state={state} update={update} /></div>

              <div className="co-nav">
                <button className="co-nav-btn" disabled={!prev} onClick={() => prev && goTo(idx - 1)}>
                  <span className="co-nav-btn-arr">←</span>
                  <span className="co-nav-btn-txt"><span className="co-nav-btn-eyebrow">Previous</span><span className="co-nav-btn-title">{prev ? prev.title : "—"}</span></span>
                </button>
                <div className="co-nav-complete">
                  <button className="co-btn" onClick={completeLesson}>
                    {nextStep ? (state.completed[step.id] ? "Next" : "Complete & continue") : "Complete & finish"}
                    <span className="cta-arrow">→</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== COMPLETION ===================== */
function Completion({ resource, course, state, onBack, onReview }) {
  const st = courseStats(course);
  const finalQuiz = st.steps.filter((s) => s.kind === "quiz").pop();
  const finalScore = finalQuiz && state.quiz[finalQuiz.id] ? state.quiz[finalQuiz.id] : null;
  const avgPct = (() => {
    const all = Object.values(state.quiz);
    if (!all.length) return 100;
    const s = all.reduce((a, q) => a + q.score / q.total, 0) / all.length;
    return Math.round(s * 100);
  })();
  const dateStr = new Date(state.finishedAt || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const [toast, setToast] = useState(false);
  const share = () => {
    const txt = `I just earned my ${resource.title} certificate at APEX — scored ${avgPct}% across the quizzes.`;
    try { navigator.clipboard.writeText(txt); } catch (e) {}
    setToast(true); setTimeout(() => setToast(false), 2400);
  };

  return (
    <div className="co-done-stage">
      <button className="co-exit" onClick={onBack}><CIcon.back /> Back to library</button>
      <div className="co-done-head">
        <img src="assets/apex-logo-trans.png" alt="APEX" className="co-done-logo" />
        <p className="co-done-kicker"><CIcon.award /> Course Complete</p>
        <h1 className="co-done-title">You completed {resource.title}</h1>
        <p className="co-done-sub">Outstanding work, {state.name.split(" ")[0]}. Your certificate is ready below — print it or save it for your records.</p>
      </div>

      <div className="co-done-stats">
        <div className="co-done-stat"><div className="co-done-stat-num gold">{avgPct}%</div><div className="co-done-stat-lbl">Avg. quiz score</div></div>
        <div className="co-done-stat"><div className="co-done-stat-num">{st.lessons}</div><div className="co-done-stat-lbl">Lessons completed</div></div>
        <div className="co-done-stat"><div className="co-done-stat-num">{st.quizzes}</div><div className="co-done-stat-lbl">Quizzes passed</div></div>
        <div className="co-done-stat"><div className="co-done-stat-num">{humanTime(state.timeSpent || st.totalSec)}</div><div className="co-done-stat-lbl">Time invested</div></div>
      </div>

      <div className="co-cert-wrap">
        <div className="co-cert">
          <div className="co-cert-inner">
            <div className="co-cert-top">
              <img src="assets/apex-logo-trans.png" alt="APEX" className="co-cert-logo" />
              <div className="co-cert-seal">APEX<br />CERT</div>
            </div>
            <div className="co-cert-mid">
              <div className="co-cert-eyebrow">Certificate of Completion</div>
              <div className="co-cert-name">{state.name}</div>
              <div className="co-cert-course">has successfully completed <b>{resource.title}</b> with {course.instructor}</div>
            </div>
            <div className="co-cert-foot">
              <div className="co-cert-sig">
                <div className="co-cert-sig-line">{course.instructor}</div>
                <div className="co-cert-sig-lbl">{course.instructorRole}, APEX Financial Empire</div>
              </div>
              <div className="co-cert-date">
                <div className="co-cert-sig-line">{dateStr}</div>
                <div className="co-cert-sig-lbl">Date awarded</div>
              </div>
            </div>
          </div>
        </div>
        <div className="co-cert-actions">
          <button className="co-btn co-btn-ghost" onClick={onReview}>Review lessons</button>
          <button className="co-btn co-btn-ghost" onClick={share}><CIcon.share /> Share score</button>
          <button className="co-btn" onClick={() => window.print()}><CIcon.download /> Download certificate</button>
        </div>
      </div>

      {toast && <div className="co-share-toast"><span className="co-share-ico"><CIcon.check /></span>Score copied to clipboard</div>}
    </div>
  );
}

/* ===================== ORCHESTRATOR ===================== */
function CourseExperience({ resource, startMode = "landing", onExit }) {
  useSyncTranscripts();
  const course = resource.course;
  const steps = useMemo(() => flatten(course), [resource.id]);
  const [identity, setIdentity] = useState(() => readIdentity());
  const [state, update] = useCourseState(resource.id, identity ? identity.email : "");
  const [phase, setPhase] = useState(() => {
    const init = identity ? readCourseState(resource.id, identity.email) : blankState();
    return (init.name && startMode === "player") ? "player" : "landing";
  });
  const [naming, setNaming] = useState(false);
  const [targetStep, setTargetStep] = useState(null);

  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape" && phase === "landing" && !naming) onExit(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [phase, naming, onExit]);

  const enroll = (name, email) => {
    const existing = readCourseState(resource.id, email);
    const merged = { ...existing, name: existing.name || name, email };
    writeCourseState(resource.id, email, merged);
    const idObj = { name, email };
    writeIdentity(idObj);
    setIdentity(idObj);
    setNaming(false);
    setPhase("player");
    window.scrollTo(0, 0);
  };
  const complete = () => { update((p) => ({ ...p, finishedAt: p.finishedAt || new Date().toISOString() })); setPhase("complete"); window.scrollTo(0, 0); };
  const openAt = (gi) => { setTargetStep(gi); setPhase("player"); window.scrollTo(0, 0); };
  const resume = () => { setTargetStep(null); setPhase("player"); window.scrollTo(0, 0); };

  return (
    <div className="co-stage">
      {phase === "landing" && (
        <>
          <button className="co-exit" onClick={onExit}><CIcon.back /> Back to library</button>
          <Landing resource={resource} course={course} state={state}
            onEnroll={() => setNaming(true)}
            onResume={resume}
            onOpenStep={openAt}
            onViewCert={() => { setPhase("complete"); window.scrollTo(0, 0); }} />
        </>
      )}
      {phase === "player" && (
        <Player resource={resource} course={course} steps={steps} state={state} update={update} initialStep={targetStep}
          onBack={() => { setPhase("landing"); window.scrollTo(0, 0); }} onComplete={complete} />
      )}
      {phase === "complete" && (
        <Completion resource={resource} course={course} state={state} onBack={onExit} onReview={() => { setPhase("player"); window.scrollTo(0, 0); }} />
      )}
      {naming && <NameModal courseId={resource.id} initName={identity ? identity.name : ""} initEmail={identity ? identity.email : ""} onSubmit={enroll} onClose={() => setNaming(false)} />}
    </div>
  );
}

Object.assign(window, { CourseCard, CourseExperience, readCourseState });
