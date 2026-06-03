// APEX Admin Portal — main app
const { useState, useMemo, useEffect, useRef, useCallback } = React;
const I = window.Icons;

const TYPE_META = {
  course:   { label: "Course",   color: "#C9A84C", icon: "course",   plural: "Courses" },
  video:    { label: "Video",    color: "#E5484D", icon: "video",    plural: "Videos" },
  pdf:      { label: "PDF",      color: "#4C7DF0", icon: "pdf",      plural: "PDFs" },
  training: { label: "Training", color: "#C9A84C", icon: "training", plural: "Trainings" },
  guide:    { label: "Guide",    color: "#46A758", icon: "guide",    plural: "Guides" },
  tool:     { label: "Tool",     color: "#9A6BE0", icon: "tool",     plural: "Tools" },
};
const TYPE_ORDER = ["course", "pdf", "training", "guide", "tool", "video"];
const STAT_TYPES = ["course", "pdf", "training", "guide"];
const COURSE_LEVELS = ["Core Curriculum", "Onboarding", "Intermediate", "Advanced"];
const QUIZ_KEYS = ["A", "B", "C", "D", "E", "F"];
const PASS_MARKS = [0.5, 0.6, 0.67, 0.7, 0.75, 0.8, 0.9];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
const todayISO = () => new Date().toISOString().slice(0, 10);

// ── seed data (built from the live resource library + recordings) ────────────
function buildSeed() {
  return [
    { id: "playbook", type: "pdf", title: "APEX Agent Playbook", date: "2026-05-28", status: "published", featured: true, isNew: true,
      desc: "The official APEX playbook — your start-to-finish guide to onboarding, daily activity, and the systems that drive production.",
      tags: ["playbook", "onboarding", "systems"], duration: "", link: "assets/APEX_Agent_Playbook.pdf" },
    { id: "needs-quiz", type: "pdf", title: "Needs Analysis Quiz", date: "2026-05-28", status: "published", featured: false, isNew: true,
      desc: "A quick client needs-analysis quiz to uncover the real coverage gap before you present.",
      tags: ["needs analysis", "discovery", "worksheet"], duration: "", link: "assets/Needs_Analysis_Quiz.pdf" },
    { id: "fast-start", type: "training", title: "New Agent Fast Start", date: "2026-05-27", status: "published", featured: true, isNew: true,
      desc: "The 5-module fast-start track every new APEX agent runs in week one — tools, mindset, and the first 20 dials.",
      tags: ["onboarding", "fast start", "new agent"], duration: "1h 12m", link: "#" },
    { id: "script-3", type: "guide", title: "Apex Script 3.0 — Senior Benefits", date: "2026-05-26", status: "published", featured: true, isNew: false,
      desc: "The current Senior State Benefits / life insurance phone script — intro through the close.",
      tags: ["script", "senior benefits", "sales"], duration: "", link: "https://docs.google.com/document/d/1hgA1vKf0Bo0kgQ2nf45bN8tfdLwQMwkWyTbakAjZUKw/edit" },
    { id: "script-vet", type: "guide", title: "Apex Script — Veterans (VA Benefits)", date: "2026-05-24", status: "published", featured: false, isNew: false,
      desc: "The veteran burial-coverage opener and full call flow for VA-benefit prospects.",
      tags: ["script", "veterans", "final expense"], duration: "", link: "https://docs.google.com/document/d/1OeDu_6TABfIJtVHrn1TrJUjWGzgehYttoMj7ttSebxI/edit" },
    { id: "dialing", type: "training", title: "Dialing Discipline & Daily Activity", date: "2026-05-18", status: "draft", featured: false, isNew: false,
      desc: "How to protect your dial blocks, track activity, and keep momentum through the slow weeks.",
      tags: ["activity", "discipline", "dialing"], duration: "47:20", link: "#" },
    { id: "calc", type: "tool", title: "Premium Quote Calculator", date: "2026-05-15", status: "published", featured: false, isNew: false,
      desc: "Internal calculator for ballpark monthly premiums by age band and coverage amount.",
      tags: ["tool", "quoting", "calculator"], duration: "", link: "#" },
  ];
}

const TypeIcon = ({ type }) => { const C = I[TYPE_META[type].icon]; return <C />; };

// ── LOGIN GATE ───────────────────────────────────────────────────────────────
function Gate({ onUnlock }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  useEffect(() => { ref.current && ref.current.focus(); }, []);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: val }),
      });
      const { ok } = await r.json();
      if (ok) {
        try {
          sessionStorage.setItem("apex_admin_auth", "1");
          sessionStorage.setItem("apex_admin_pw", val);
        } catch (e) {}
        onUnlock();
      } else { setErr(true); setVal(""); }
    } catch (e) { setErr(true); setVal(""); }
    setLoading(false);
  };
  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <img src="../assets/apex-logo-trans.png" alt="APEX Financial Empire" className="gate-logo" />
        <div className="gate-lock"><I.lock /></div>
        <p className="gate-kicker">Admin Access</p>
        <h1 className="gate-title">Resource Admin</h1>
        <p className="gate-sub">Enter the admin password to manage resources.</p>
        <div className={"gate-field" + (err ? " gate-field-err" : "")}>
          <input ref={ref} type="password" placeholder="Password" value={val}
            onChange={(e) => { setVal(e.target.value); setErr(false); }} />
        </div>
        {err && <p className="gate-err">Incorrect password.</p>}
        <button type="submit" className="gate-btn" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}<span className="arr">→</span>
        </button>
        <p className="gate-foot">Confidential — APEX internal administrators only.</p>
      </form>
    </div>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { sect: "Recorded Presentations" },
  { key: "recordings", label: "Recordings", icon: "video" },
  { sect: "Resource Library" },
  { key: "manage", label: "Manage Resources", icon: "list" },
  { key: "add", label: "Add Resource", icon: "plus" },
  { sect: "Site Settings" },
  { key: "quicklinks", label: "Quick Links", icon: "link" },
];
function Sidebar({ route, onNav, onLogout, count, drawerOpen, onCloseDrawer }) {
  return (
    <aside className={"side" + (drawerOpen ? " side-drawer-open" : "")}>
      <div className="side-brand">
        <img src="../assets/apex-logo-trans.png" alt="APEX" className="side-logo" />
        <span className="side-tag">Admin</span>
      </div>
      <nav className="side-nav">
        {NAV.map((n, i) => {
          if (n.sect) return <div key={"s" + i} className="side-sect">{n.sect}</div>;
          const C = I[n.icon];
          return (
            <button key={n.key} className={"side-link" + (route === n.key ? " side-link-on" : "")}
              onClick={() => { onNav(n.key); onCloseDrawer(); }}>
              <C />{n.label}
            </button>
          );
        })}
      </nav>
      <div className="side-foot">
        <div className="side-user">
          <span className="side-avatar">A</span>
          <span>
            <div className="side-user-name">Administrator</div>
            <div className="side-user-role">{count} items live</div>
          </span>
        </div>
        <button className="side-logout" onClick={() => { onLogout(); onCloseDrawer(); }}><I.logout />Sign out</button>
      </div>
    </aside>
  );
}

// ── DASHBOARD ──────────────────────────────────────────────────────────────────
function Dashboard({ resources, recordings, presenters, onNav, onAdd, onAddRec, onEditRec }) {
  const counts = useMemo(() => {
    const c = {}; for (const t of TYPE_ORDER) c[t] = 0;
    for (const r of resources) c[r.type] = (c[r.type] || 0) + 1;
    return c;
  }, [resources]);
  const pById = useMemo(() => Object.fromEntries(presenters.map((p) => [p.id, p])), [presenters]);
  const courseCount = counts.course || 0;
  const coursePub = resources.filter(r => r.type === "course" && r.status === "published").length;

  const recent = useMemo(() => {
    const res = resources.map((r) => ({ ...r, kind: "resource", color: TYPE_META[r.type].color }));
    const recs = recordings.map((r) => ({ ...r, kind: "recording", color: "#E5484D",
      typeLabel: "Recording", sub: pById[r.presenterId] ? pById[r.presenterId].name : "" }));
    return [...res, ...recs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  }, [resources, recordings, pById]);

  const recCount = recordings.length;
  const recPub = recordings.filter((r) => r.status === "published").length;

  return (
    <div className="content">
      <div className="stat-grid">
        <button className="stat" style={{ "--ac": "#E5484D" }} onClick={() => onNav("recordings")}>
          <div className="stat-top"><span className="stat-ico"><I.video /></span><span className="stat-label">Recordings</span></div>
          <span className="stat-num">{recCount}</span>
          <span className="stat-sub">{recPub} published · {recCount - recPub} draft</span>
        </button>
        <button className="stat" style={{ "--ac": "#9A6BE0" }} onClick={() => onNav("manage", "course")}>
          <div className="stat-top"><span className="stat-ico"><TypeIcon type="course" /></span><span className="stat-label">Courses</span></div>
          <span className="stat-num">{courseCount}</span>
          <span className="stat-sub">{coursePub} published · {courseCount - coursePub} draft</span>
        </button>
        {STAT_TYPES.map((t) => {
          const m = TYPE_META[t];
          const pub = resources.filter((r) => r.type === t && r.status === "published").length;
          return (
            <button key={t} className="stat" style={{ "--ac": m.color }} onClick={() => onNav("manage", t)}>
              <div className="stat-top"><span className="stat-ico"><TypeIcon type={t} /></span><span className="stat-label">{m.plural}</span></div>
              <span className="stat-num">{counts[t]}</span>
              <span className="stat-sub">{pub} published · {counts[t] - pub} draft</span>
            </button>
          );
        })}
      </div>

      <div className="section-row">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Recently Added</span>
            <button className="panel-link" onClick={() => onNav("manage")}>Library<span className="arr">→</span></button>
          </div>
          <div className="panel-body">
            {recent.map((r) => {
              const isRec = r.kind === "recording";
              const m = isRec ? null : TYPE_META[r.type];
              return (
                <button key={r.kind + r.id} className="recent" style={{ "--ac": r.color }}
                  onClick={() => isRec ? onEditRec(r) : onAdd(r)}>
                  <span className="recent-ico">{isRec ? <I.video /> : <TypeIcon type={r.type} />}</span>
                  <span className="recent-body">
                    <span className="recent-title">{r.title}</span>
                    <span className="recent-meta">
                      <span className="tbadge" style={{ "--ac": r.color }}><span className="tbadge-dot" />{isRec ? "Recording" : m.label}</span>
                      {isRec && r.sub && <span className="recent-by">{r.sub}</span>}
                      {r.status === "draft" && <span className="status status-draft"><span className="status-dot" />Draft</span>}
                    </span>
                  </span>
                  <span className="recent-date">{fmtDate(r.date)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><span className="panel-title">Quick Add</span></div>
          <div className="qa-list">
            <button className="qa" style={{ "--ac": "#E5484D" }} onClick={() => onAddRec(null)}>
              <span className="qa-ico"><I.video /></span>
              <span className="qa-text"><span className="qa-title">Add Recording</span><span className="qa-sub">New recorded presentation</span></span>
              <span className="qa-plus">+</span>
            </button>
            {["course", "pdf", "training", "guide"].map((t) => {
              const m = TYPE_META[t];
              return (
                <button key={t} className="qa" style={{ "--ac": m.color }} onClick={() => onAdd(null, t)}>
                  <span className="qa-ico"><TypeIcon type={t} /></span>
                  <span className="qa-text"><span className="qa-title">Add {m.label}</span><span className="qa-sub">New {m.label.toLowerCase()} resource</span></span>
                  <span className="qa-plus">+</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RESOURCE FORM ───────────────────────────────────────────────────────────────
function blankForm(type) {
  return { title: "", type: type || "pdf", desc: "", sourceMode: "link", link: "", fileName: "", fileObj: null,
    thumbMode: "url", thumb: "", thumbFile: "", tags: [], duration: "", featured: false, isNew: false,
    date: todayISO(), status: "published",
    instructor: "", instructorRole: "", level: "Core Curriculum", learn: [], curriculum: [] };
}
const isLocalPath = (l) => l && (l.startsWith("assets/") || l.startsWith("uploads/"));
function fromItem(item) {
  const co = item.course || {};
  const rawItems = co.modules
    ? co.modules.flatMap((m) => m.items)
    : (co.curriculum || []);
  const curriculum = rawItems.map((c, i) => ({
    id: c.id || (c.kind === "lesson" ? "l" + i : "q" + i),
    ...c,
    questions: c.questions ? c.questions.map((q) => ({ ...q, options: [...q.options] })) : undefined,
  }));
  return { ...blankForm(item.type), title: item.title, type: item.type, desc: item.desc || "",
    sourceMode: isLocalPath(item.link) ? "upload" : "link",
    link: isLocalPath(item.link) ? "" : (item.link || ""),
    fileName: isLocalPath(item.link) ? item.link.split("/").pop() : "",
    thumb: item.thumb || "", tags: item.tags || [], duration: item.duration || "",
    featured: !!item.featured, isNew: !!item.isNew, date: item.date || todayISO(), status: item.status || "published",
    instructor: co.instructor || "", instructorRole: co.instructorRole || "", level: co.level || "Core Curriculum",
    learn: co.learn || [], curriculum };
}

function curriculumDuration(curr) {
  let sec = 0;
  for (const c of curr) {
    if (c.kind !== "lesson" || !c.duration) continue;
    const p = String(c.duration).split(":").map(Number);
    sec += p.length === 2 ? p[0] * 60 + p[1] : (Number(c.duration) || 0);
  }
  if (!sec) return "";
  const m = Math.round(sec / 60);
  return m < 60 ? m + "m" : Math.floor(m / 60) + "h" + (m % 60 ? " " + (m % 60) + "m" : "");
}

function ResourceForm({ editing, presetType, onSave, onCancel, presenters }) {
  const [f, setF] = useState(() => editing ? fromItem(editing) : blankForm(presetType));
  const [tagDraft, setTagDraft] = useState("");
  const [err, setErr] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [openStep, setOpenStep] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const blankLesson = () => ({ kind: "lesson", title: "", media: "video", duration: "", link: "", blurb: "" });
  const blankQuiz = () => ({ kind: "quiz", title: "", pass: 0.7, questions: [{ q: "", options: ["", ""], answer: 0 }] });
  const addCurr = (kind) => setF((p) => {
    const item = kind === "quiz"
      ? { ...blankQuiz(), id: "q-" + Date.now().toString(36) }
      : { ...blankLesson(), id: "l-" + Date.now().toString(36) };
    const arr = [...p.curriculum, item];
    setOpenStep(arr.length - 1);
    return { ...p, curriculum: arr };
  });
  const setCurr = (i, patch) => setF((p) => ({ ...p, curriculum: p.curriculum.map((c, j) => j === i ? { ...c, ...patch } : c) }));
  const delCurr = (i) => { setF((p) => ({ ...p, curriculum: p.curriculum.filter((_, j) => j !== i) })); setOpenStep(null); };
  const moveCurr = (from, to) => setF((p) => { if (to < 0 || to >= p.curriculum.length || from === to) return p; const a = [...p.curriculum]; const [m] = a.splice(from, 1); a.splice(to, 0, m); return { ...p, curriculum: a }; });
  const qOp = (i, fn) => setF((p) => ({ ...p, curriculum: p.curriculum.map((c, j) => j === i ? { ...c, questions: fn(c.questions || []) } : c) }));
  const addQ = (i) => qOp(i, (qs) => [...qs, { q: "", options: ["", ""], answer: 0 }]);
  const setQ = (i, qi, patch) => qOp(i, (qs) => qs.map((q, k) => k === qi ? { ...q, ...patch } : q));
  const delQ = (i, qi) => qOp(i, (qs) => qs.filter((_, k) => k !== qi));
  const addOpt = (i, qi) => qOp(i, (qs) => qs.map((q, k) => k === qi ? { ...q, options: [...q.options, ""] } : q));
  const setOpt = (i, qi, oi, val) => qOp(i, (qs) => qs.map((q, k) => k === qi ? { ...q, options: q.options.map((o, m) => m === oi ? val : o) } : q));
  const delOpt = (i, qi, oi) => qOp(i, (qs) => qs.map((q, k) => k === qi ? { ...q, options: q.options.filter((_, m) => m !== oi), answer: q.answer > oi ? q.answer - 1 : (q.answer === oi ? 0 : q.answer) } : q));
  const setAnswer = (i, qi, oi) => qOp(i, (qs) => qs.map((q, k) => k === qi ? { ...q, answer: oi } : q));

  const addTag = (raw) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setF((p) => ({ ...p, tags: [...new Set([...p.tags, ...parts])] }));
    setTagDraft("");
  };
  const onTagKey = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagDraft); }
    else if (e.key === "Backspace" && !tagDraft && f.tags.length) set("tags", f.tags.slice(0, -1));
  };

  const fileRef = useRef(null);
  const thumbRef = useRef(null);

  const submit = async (status) => {
    if (!f.title.trim()) { setErr(true); return; }
    addTag(tagDraft);
    const tags = tagDraft.trim() ? [...new Set([...f.tags, ...tagDraft.split(",").map((s) => s.trim()).filter(Boolean)])] : f.tags;

    let link;
    if (f.sourceMode === "upload" && f.fileObj) {
      setUploading(true);
      setUploadErr("");
      const fd = new FormData();
      fd.append("file", f.fileObj, f.fileName);
      try {
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const j = await r.json();
        if (!j.ok) { setUploadErr("Upload failed: " + j.error); setUploading(false); return; }
        link = j.url;
      } catch {
        setUploadErr("Upload failed — network error");
        setUploading(false);
        return;
      }
      setUploading(false);
    } else {
      link = f.sourceMode === "upload" ? (editing?.link || "#") : (f.link || "#");
    }

    const isCourse = f.type === "course";
    let courseData;
    if (isCourse) {
      const modules = [{ title: "Course Content", items: f.curriculum.map((item, i) => ({
        id: item.id || (item.kind === "lesson" ? "l" + i : "q" + i),
        ...item,
      })) }];
      courseData = {
        instructor: f.instructor.trim(),
        instructorRole: f.instructorRole.trim(),
        level: f.level,
        learn: f.learn.filter((l) => l.trim()),
        modules,
      };
    }
    onSave({
      id: editing ? editing.id : "r-" + Date.now().toString(36),
      type: f.type, title: f.title.trim(), desc: f.desc.trim(), date: f.date,
      status, featured: f.featured, isNew: f.isNew, tags,
      duration: isCourse ? curriculumDuration(f.curriculum) : f.duration.trim(),
      link: isCourse ? "#" : link, thumb: f.thumbMode === "url" ? f.thumb.trim() : f.thumbFile,
      ...(isCourse ? { course: courseData } : {}),
    }, !!editing);
  };

  return (
    <div className="content">
      <div className="form-wrap">
        <div className="form-card">
          <div className="form-grid">
            <div className="fg fg-full">
              <label className="lbl">Title</label>
              <input className="field" placeholder="e.g. Beating the Price Objection"
                value={f.title} autoFocus
                style={err && !f.title.trim() ? { borderColor: "var(--red)" } : null}
                onChange={(e) => { set("title", e.target.value); setErr(false); }} />
              {err && !f.title.trim() && <span className="field-hint" style={{ color: "var(--red)" }}>A title is required.</span>}
            </div>

            <div className="fg">
              <label className="lbl">Type</label>
              <select className="field" value={f.type} onChange={(e) => set("type", e.target.value)}>
                {TYPE_ORDER.map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
              </select>
            </div>
            {f.type === "course" ? (
              <div className="fg">
                <label className="lbl">Instructor</label>
                {presenters && presenters.length > 0 ? (
                  <select className="field" value={f.instructor} onChange={(e) => {
                    const p = presenters.find((p) => p.name === e.target.value);
                    setF((prev) => ({ ...prev, instructor: e.target.value, instructorRole: p ? p.role : prev.instructorRole }));
                  }}>
                    <option value="">Select instructor…</option>
                    {presenters.map((p) => <option key={p.id} value={p.name}>{p.name} — {p.role}</option>)}
                  </select>
                ) : (
                  <input className="field" placeholder="e.g. KJ" value={f.instructor} onChange={(e) => set("instructor", e.target.value)} />
                )}
              </div>
            ) : (
              <div className="fg">
                <label className="lbl">Duration <span className="lbl-opt">optional</span></label>
                <input className="field" placeholder="e.g. 18:42 or 1h 12m"
                  value={f.duration} onChange={(e) => set("duration", e.target.value)} />
              </div>
            )}
            {f.type === "course" && (
              <React.Fragment>
                <div className="fg">
                  <label className="lbl">Instructor role</label>
                  <input className="field" placeholder="e.g. Regional Director" value={f.instructorRole} onChange={(e) => set("instructorRole", e.target.value)} />
                </div>
                <div className="fg">
                  <label className="lbl">Level</label>
                  <select className="field" value={f.level} onChange={(e) => set("level", e.target.value)}>
                    {COURSE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </React.Fragment>
            )}

            {f.type === "course" && (
              <div className="fg fg-full">
                <label className="lbl">What you'll learn <span className="lbl-opt">one bullet per line</span></label>
                <textarea className="field" rows={4} placeholder={"Open every call with a verification intro…\nControl your tonality and pace\nHandle the price objection without dropping the price"}
                  value={f.learn.join("\n")}
                  onChange={(e) => set("learn", e.target.value.split("\n"))} />
              </div>
            )}

            <div className="fg fg-full">
              <label className="lbl">Description</label>
              <textarea className="field" placeholder="One or two sentences describing this resource…"
                value={f.desc} onChange={(e) => set("desc", e.target.value)} />
            </div>

            {f.type !== "course" && (
              <div className="fg fg-full">
                <label className="lbl">Source</label>
                <div className="seg">
                  <button type="button" className={f.sourceMode === "link" ? "seg-on" : ""} onClick={() => set("sourceMode", "link")}>Link / URL</button>
                  <button type="button" className={f.sourceMode === "upload" ? "seg-on" : ""} onClick={() => set("sourceMode", "upload")}>Upload file</button>
                </div>
                {f.sourceMode === "link" ? (
                  <input className="field" placeholder="Vimeo / Google Drive / direct URL"
                    value={f.link} onChange={(e) => set("link", e.target.value)} />
                ) : (
                  <div className="drop"
                    onClick={() => fileRef.current && fileRef.current.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) setF((p) => ({ ...p, fileName: file.name, fileObj: file }));
                    }}
                  >
                    <input ref={fileRef} type="file" hidden
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) setF((p) => ({ ...p, fileName: file.name, fileObj: file }));
                      }} />
                    <div className="drop-ico"><I.upload /></div>
                    <div className="drop-main">{f.fileName ? f.fileName : <>Drop a file or <b>browse</b></>}</div>
                    <div className="drop-sub">{f.fileName ? (uploading ? "Uploading…" : "Ready — will upload on save") : "PDF, MP4, DOCX up to 200MB"}</div>
                  </div>
                )}
                {uploadErr && <span className="field-hint" style={{ color: "var(--red)" }}>{uploadErr}</span>}
              </div>
            )}

            {f.type === "course" && (
              <div className="fg fg-full">
                <label className="lbl">Curriculum <span className="lbl-opt">drag to reorder · click Edit to open · {curriculumDuration(f.curriculum) || "0m"} of video</span></label>
                <div className="curric">
                  {f.curriculum.length === 0 && <p className="curric-empty">No items yet — add your first lesson below.</p>}
                  {f.curriculum.map((c, i) => {
                    const open = openStep === i;
                    return (
                      <div key={i}
                        className={"cstep" + (c.kind === "quiz" ? " cstep-quiz" : "") + (open ? " cstep-open" : "") + (overIdx === i && dragIdx !== null && dragIdx !== i ? " cstep-drop" : "")}
                        onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
                        onDrop={() => { if (dragIdx !== null) moveCurr(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
                        onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}>
                        <div className="cstep-head">
                          <span className="cstep-grip" draggable onDragStart={() => setDragIdx(i)} title="Drag to reorder"><I.grip /></span>
                          <span className="curric-n">{i + 1}</span>
                          <span className={"cstep-badge" + (c.kind === "quiz" ? " cstep-badge-quiz" : "")}>{c.kind === "quiz" ? "Quiz" : "Lesson"}</span>
                          <span className="cstep-title">{c.title || (c.kind === "quiz" ? "Untitled quiz" : "Untitled lesson")}</span>
                          <span className="cstep-meta">{c.kind === "quiz" ? ((c.questions ? c.questions.length : 0) + " Q · " + Math.round((c.pass || 0.7) * 100) + "%") : [c.media, c.duration].filter(Boolean).join(" · ")}</span>
                          <button type="button" className={"btn btn-sm cstep-edit" + (open ? " cstep-edit-on" : "")} onClick={() => setOpenStep(open ? null : i)}>{open ? <React.Fragment><I.check />Done</React.Fragment> : <React.Fragment><I.edit />Edit</React.Fragment>}</button>
                          <button type="button" className="icon-btn danger" onClick={() => delCurr(i)} aria-label="Remove"><I.trash /></button>
                        </div>
                        {open && (
                          <div className="cstep-body">
                            <div className="cstep-grid">
                              <div className="fg">
                                <label className="lbl">Type</label>
                                <select className="field" value={c.kind} onChange={(e) => setCurr(i, e.target.value === "quiz"
                                  ? { kind: "quiz", pass: c.pass || 0.7, questions: c.questions || [{ q: "", options: ["", ""], answer: 0 }] }
                                  : { kind: "lesson", media: c.media || "video", duration: c.duration || "", link: c.link || "", blurb: c.blurb || "" })}>
                                  <option value="lesson">Lesson</option>
                                  <option value="quiz">Quiz</option>
                                </select>
                              </div>
                              <div className="fg cstep-grid-2">
                                <label className="lbl">Title</label>
                                <input className="field" placeholder={c.kind === "quiz" ? "e.g. Foundations Check" : "e.g. The Mindset of a Closer"} value={c.title} onChange={(e) => setCurr(i, { title: e.target.value })} />
                              </div>

                              {c.kind === "lesson" ? (
                                <React.Fragment>
                                  <div className="fg">
                                    <label className="lbl">Media</label>
                                    <select className="field" value={c.media} onChange={(e) => setCurr(i, { media: e.target.value })}>
                                      <option value="video">Video</option>
                                      <option value="audio">Audio</option>
                                    </select>
                                  </div>
                                  <div className="fg">
                                    <label className="lbl">Duration</label>
                                    <input className="field" placeholder="8:30" value={c.duration} onChange={(e) => setCurr(i, { duration: e.target.value })} />
                                  </div>
                                  <div className="fg cstep-grid-full">
                                    <label className="lbl">Video / audio link <span className="lbl-opt">Vimeo, Google Drive, or direct URL</span></label>
                                    <input className="field" placeholder="https://…" value={c.link || ""} onChange={(e) => setCurr(i, { link: e.target.value })} />
                                  </div>
                                  <div className="fg cstep-grid-full">
                                    <label className="lbl">Lesson summary <span className="lbl-opt">one line shown under the title</span></label>
                                    <textarea className="field" placeholder="What this lesson covers…" value={c.blurb || ""} onChange={(e) => setCurr(i, { blurb: e.target.value })} />
                                  </div>
                                </React.Fragment>
                              ) : (
                                <React.Fragment>
                                  <div className="fg">
                                    <label className="lbl">Pass mark</label>
                                    <select className="field" value={String(c.pass || 0.7)} onChange={(e) => setCurr(i, { pass: Number(e.target.value) })}>
                                      {PASS_MARKS.map((v) => <option key={v} value={String(v)}>{Math.round(v * 100)}% to pass</option>)}
                                    </select>
                                  </div>
                                  <div className="cstep-grid-full cstep-qs">
                                    <div className="cstep-qs-head"><span className="lbl">Questions &amp; answers</span><span className="lbl-opt">click the circle to mark the correct answer</span></div>
                                    {(c.questions || []).map((q, qi) => (
                                      <div key={qi} className="cq">
                                        <div className="cq-head">
                                          <span className="cq-n">Q{qi + 1}</span>
                                          <input className="field field-sm cq-text" placeholder="Question text" value={q.q} onChange={(e) => setQ(i, qi, { q: e.target.value })} />
                                          <button type="button" className="icon-btn danger" onClick={() => delQ(i, qi)} disabled={(c.questions || []).length <= 1} aria-label="Remove question"><I.trash /></button>
                                        </div>
                                        <div className="cq-opts">
                                          {q.options.map((opt, oi) => (
                                            <div key={oi} className={"cq-opt" + (q.answer === oi ? " cq-opt-correct" : "")}>
                                              <button type="button" className="cq-radio" onClick={() => setAnswer(i, qi, oi)} title="Mark as correct answer" aria-label="Mark correct">{q.answer === oi && <I.check />}</button>
                                              <input className="field field-sm" placeholder={"Answer " + QUIZ_KEYS[oi]} value={opt} onChange={(e) => setOpt(i, qi, oi, e.target.value)} />
                                              <button type="button" className="icon-btn" onClick={() => delOpt(i, qi, oi)} disabled={q.options.length <= 2} aria-label="Remove option">✕</button>
                                            </div>
                                          ))}
                                          <button type="button" className="cq-addopt" onClick={() => addOpt(i, qi)}><I.plus />Add answer option</button>
                                        </div>
                                      </div>
                                    ))}
                                    <button type="button" className="btn btn-sm cq-addq" onClick={() => addQ(i)}><I.plus />Add question</button>
                                  </div>
                                </React.Fragment>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="curric-add">
                    <button type="button" className="btn btn-sm" onClick={() => addCurr("lesson")}><I.plus />Add lesson</button>
                    <button type="button" className="btn btn-sm" onClick={() => addCurr("quiz")}><I.course />Add quiz</button>
                  </div>
                </div>
              </div>
            )}

            <div className="fg fg-full">
              <label className="lbl">Thumbnail <span className="lbl-opt">optional</span></label>
              <div className="thumb-row">
                <div className="thumb-prev">
                  {f.thumbMode === "url" && f.thumb ? <img src={f.thumb} alt="" onError={(e) => { e.target.style.display = "none"; }} />
                    : f.thumbFile ? <span>{f.thumbFile}</span> : <span>thumbnail</span>}
                </div>
                <div className="fg" style={{ flex: 1, gap: 8 }}>
                  <div className="seg">
                    <button type="button" className={f.thumbMode === "url" ? "seg-on" : ""} onClick={() => set("thumbMode", "url")}>Image URL</button>
                    <button type="button" className={f.thumbMode === "upload" ? "seg-on" : ""} onClick={() => set("thumbMode", "upload")}>Upload</button>
                  </div>
                  {f.thumbMode === "url" ? (
                    <input className="field" placeholder="https://…/thumb.jpg"
                      value={f.thumb} onChange={(e) => set("thumb", e.target.value)} />
                  ) : (
                    <div className="drop" style={{ padding: 16 }} onClick={() => thumbRef.current && thumbRef.current.click()}>
                      <input ref={thumbRef} type="file" accept="image/*" hidden onChange={(e) => set("thumbFile", e.target.files[0] ? e.target.files[0].name : "")} />
                      <div className="drop-main">{f.thumbFile ? f.thumbFile : <>Drop image or <b>browse</b></>}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="fg fg-full">
              <label className="lbl">Tags <span className="lbl-opt">comma separated</span></label>
              <div className="tagbox" onClick={(e) => e.currentTarget.querySelector("input").focus()}>
                {f.tags.map((t) => (
                  <span key={t} className="tagpill">{t}<button type="button" onClick={() => set("tags", f.tags.filter((x) => x !== t))}>✕</button></span>
                ))}
                <input value={tagDraft} placeholder={f.tags.length ? "" : "objections, price, sales"}
                  onChange={(e) => setTagDraft(e.target.value)} onKeyDown={onTagKey} onBlur={() => addTag(tagDraft)} />
              </div>
            </div>

            <div className="fg">
              <label className="lbl">Date added</label>
              <input className="field" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="fg" style={{ justifyContent: "flex-end", gap: 10 }}>
              <div className="switch-row">
                <span><span className="switch-text-main">Featured</span><span className="switch-text-sub">Pin to the top</span></span>
                <button type="button" className="switch" data-on={f.featured ? "1" : "0"} onClick={() => set("featured", !f.featured)}><i /></button>
              </div>
            </div>
            <div className="fg fg-full">
              <div className="switch-row">
                <span><span className="switch-text-main">Mark as New</span><span className="switch-text-sub">Shows a “New” flag on the public site for a while</span></span>
                <button type="button" className="switch" data-on={f.isNew ? "1" : "0"} onClick={() => set("isNew", !f.isNew)}><i /></button>
              </div>
            </div>
          </div>

          <div className="form-foot">
            <div className="form-foot-left">
              <span className="field-hint">Publish now or keep it as a draft.</span>
            </div>
            <div className="form-foot-right">
              <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
              <button className="btn" onClick={() => submit("draft")} disabled={uploading}>Save draft</button>
              <button className="btn btn-gold" onClick={() => submit("published")} disabled={uploading}>
                {uploading ? "Uploading…" : (editing ? "Save & Publish" : "Publish")}<span className="arr">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MANAGE TABLE ────────────────────────────────────────────────────────────────


function ManageTable({ resources, setResources, onEdit, onDelete, presetFilter, density, transcripts: parentTs, onToast }) {
  const [filter, setFilter] = useState(presetFilter || "all");
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [tsData, setTsData] = useState({});
  const [tsRunning, setTsRunning] = useState(false);
  const tsRef = useRef({});
  const pollRef = useRef(null);

  useEffect(() => { if (presetFilter) setFilter(presetFilter); }, [presetFilter]);

  // Keep local tsData in sync with parent poll, but local saveTs takes precedence
  useEffect(() => {
    if (!parentTs) return;
    tsRef.current = { ...parentTs, ...tsRef.current };
    setTsData({ ...tsRef.current });
  }, [parentTs]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const saveTs = (id, entry) => {
    tsRef.current = { ...tsRef.current, [id]: entry };
    setTsData({ ...tsRef.current });
    fetch("/api/transcripts", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recId: id, entry }) }).catch(() => {});
  };

  const pollOnce = useCallback(async () => {
    const pending = Object.entries(tsRef.current).filter(([, v]) => ["queued", "processing"].includes(v?.status) && v?.jobId);
    if (!pending.length) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setTsRunning(false);
      return;
    }
    for (const [id, entry] of pending) {
      try {
        const r = await fetch(`/api/transcribe-status?id=${entry.jobId}`);
        const data = await r.json();
        if (data.status && data.status !== entry.status) saveTs(id, { ...entry, ...data });
      } catch {}
    }
  }, []);

  const canTranscribeUrl = (url) => url && url !== "#" && !url.includes("docs.google.com") && !url.includes("youtube.com") && !url.includes("youtu.be") && !/\.(pdf|doc|docx)$/i.test(url);

  const getItems = (r) => {
    if (r.type === "video" || r.type === "training") return canTranscribeUrl(r.link) ? [{ id: r.id, url: r.link }] : [];
    if (r.type === "course") return (r.course?.modules || []).flatMap((m) => m.items || [])
      .filter((i) => i.kind === "lesson" && canTranscribeUrl(i.link)).map((i) => ({ id: i.id, url: i.link }));
    return [];
  };

  const runAll = async () => {
    setTsRunning(true);
    const items = resources.filter((r) => r.status === "published").flatMap(getItems);
    if (!items.length) { setTsRunning(false); return; }
    let errCount = 0;
    let lastErr = "";
    for (const { id, url } of items) {
      const ex = tsRef.current[id];
      if (ex && ["completed", "queued", "processing", "submitting"].includes(ex.status)) continue;
      try {
        saveTs(id, { status: "submitting" });
        const r = await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        if (!j.id) throw new Error("No job ID returned");
        saveTs(id, { status: "queued", jobId: j.id });
      } catch (e) {
        console.error("[transcribe]", id, url, e.message);
        saveTs(id, { status: "error", error: e.message });
        errCount++;
        lastErr = e.message;
      }
    }
    if (errCount > 0 && onToast) onToast(`Transcription error: ${lastErr}`, true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(pollOnce, 15000);
    pollOnce();
  };

  const rowTs = (r) => {
    const items = getItems(r);
    if (!items.length) return null;
    const entries = items.map(({ id }) => tsRef.current[id]);
    const done = entries.filter((e) => e?.status === "completed").length;
    const errEntry = entries.find((e) => e?.status === "error");
    if (errEntry) return { status: "error", done, total: items.length, error: errEntry.error };
    if (entries.some((e) => e && ["queued","processing","submitting"].includes(e.status))) return { status: "processing", done, total: items.length };
    if (done === items.length && done > 0) return { status: "completed", done, total: items.length };
    return null;
  };

  const canReorder = filter === "all" && !query.trim();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      if (filter !== "all" && r.type !== filter) return false;
      if (!q) return true;
      return (r.title + " " + r.desc + " " + r.tags.join(" ")).toLowerCase().includes(q);
    });
  }, [resources, filter, query]);

  const counts = useMemo(() => {
    const c = { all: resources.length };
    for (const t of TYPE_ORDER) c[t] = resources.filter((r) => r.type === t).length;
    return c;
  }, [resources]);

  const onDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    setResources((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((r) => r.id === dragId);
      const to = arr.findIndex((r) => r.id === targetId);
      if (from < 0 || to < 0) return prev;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
    setDragId(null); setOverId(null);
  };

  const toggleFeat = (id) => setResources((prev) => prev.map((r) => r.id === id ? { ...r, featured: !r.featured } : r));
  const togglePublish = (id) => setResources((prev) => prev.map((r) => r.id === id ? { ...r, status: r.status === "published" ? "draft" : "published" } : r));

  const FILTERS = [{ key: "all", label: "All" }, ...TYPE_ORDER.map((t) => ({ key: t, label: TYPE_META[t].plural }))];

  const allItems = useMemo(() => resources.filter((r) => r.status === "published").flatMap(getItems), [resources]);
  const tsDone = allItems.filter(({ id }) => tsRef.current[id]?.status === "completed").length;
  const tsPending = allItems.filter(({ id }) => ["queued","processing","submitting"].includes(tsRef.current[id]?.status)).length;
  const tsErrors = allItems.filter(({ id }) => tsRef.current[id]?.status === "error").length;
  const allDone = allItems.length > 0 && tsDone === allItems.length;

  return (
    <div className="content">
      <div className="tbl-tools">
        <div className="tbl-search">
          <I.search />
          <input placeholder="Search resources…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="filter-chips">
          {FILTERS.filter((ff) => ff.key === "all" || counts[ff.key] > 0).map((ff) => (
            <button key={ff.key} className={"chip" + (filter === ff.key ? " chip-on" : "")} onClick={() => setFilter(ff.key)}>
              {ff.label}<span style={{ opacity: 0.6, marginLeft: 6 }}>{counts[ff.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {allItems.length > 0 && (
        <div className="ts-bar">
          <span className="ts-bar-info">
            Transcripts: <strong>{tsDone}/{allItems.length}</strong> complete
            {tsPending > 0 && <span className="ts-bar-pending"> · {tsPending} pending</span>}
            {tsErrors > 0 && <span className="ts-bar-error"> · {tsErrors} error{tsErrors > 1 ? "s" : ""}</span>}
          </span>
          <button className={"btn btn-sm" + (allDone ? " btn-ghost" : " btn-gold")} onClick={runAll} disabled={tsRunning}>
            {tsRunning ? `Transcribing… ${tsDone}/${allItems.length}` : allDone ? "✓ All done" : "Transcribe All"}
          </button>
        </div>
      )}

      <div className="tbl-wrap" data-density={density}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Title</th>
              <th style={{ width: 120 }}>Type</th>
              <th style={{ width: 130 }}>Date</th>
              <th style={{ width: 120 }}>Status</th>
              <th style={{ width: 110 }}>Transcript</th>
              <th style={{ width: 80, textAlign: "center" }}>Featured</th>
              <th style={{ width: 96, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan="8">
                <div className="tbl-empty">
                  <p className="tbl-empty-big">No resources found</p>
                  <p className="tbl-empty-sub">Try a different search or filter.</p>
                </div>
              </td></tr>
            ) : visible.map((r) => {
              const m = TYPE_META[r.type];
              return (
                <tr key={r.id}
                  draggable={canReorder}
                  onDragStart={canReorder ? () => setDragId(r.id) : undefined}
                  onDragOver={canReorder ? (e) => { e.preventDefault(); setOverId(r.id); } : undefined}
                  onDrop={canReorder ? () => onDrop(r.id) : undefined}
                  onDragEnd={() => { setDragId(null); setOverId(null); }}
                  className={(dragId === r.id ? "dragging " : "") + (overId === r.id && dragId !== r.id ? "drop-target" : "")}>
                  <td className="td-grip" style={{ cursor: canReorder ? "grab" : "default", opacity: canReorder ? 1 : 0.25 }} title={canReorder ? "Drag to reorder" : "Clear search & filter to reorder"}><I.grip /></td>
                  <td>
                    <div className="tr-title">
                      <span className="tr-title-main">{r.title}</span>
                      <span className="tr-title-sub">{r.desc.length > 64 ? r.desc.slice(0, 64) + "…" : r.desc}</span>
                    </div>
                  </td>
                  <td><span className="tbadge" style={{ "--ac": m.color }}><span className="tbadge-dot" />{m.label}</span></td>
                  <td className="td-date">{fmtDate(r.date)}</td>
                  <td>
                    <label className="pub-toggle" onClick={() => togglePublish(r.id)}>
                      <span className={"pub-track" + (r.status === "published" ? " pub-on" : "")}>
                        <span className="pub-thumb" />
                      </span>
                      <span className={"pub-label" + (r.status === "published" ? " pub-label-on" : "")}>
                        {r.status === "published" ? "Published" : "Draft"}
                      </span>
                    </label>
                  </td>
                  <td>{(() => {
                    const ts = rowTs(r);
                    if (!ts) return <span style={{ color: "var(--muted-2)", fontSize: 12 }}>—</span>;
                    if (ts.status === "completed") return <span style={{ color: "#46A758", fontSize: 12, fontWeight: 600 }}>✓ Done{ts.total > 1 ? ` ${ts.done}/${ts.total}` : ""}</span>;
                    if (ts.status === "error") return <span style={{ color: "var(--red)", fontSize: 12 }} title={ts.error || "Transcription failed"}>Error{ts.error ? ": " + ts.error.slice(0, 40) : ""}</span>;
                    return <span style={{ color: "var(--gold)", fontSize: 12, textTransform: "capitalize" }}>{ts.status === "submitting" ? "Queued" : ts.status}{ts.total > 1 ? ` ${ts.done}/${ts.total}` : ""}</span>;
                  })()}</td>
                  <td style={{ textAlign: "center" }}>
                    <button className={"feat-star" + (r.featured ? " feat-on" : "")} onClick={() => toggleFeat(r.id)} aria-label="Toggle featured">
                      {I.star(r.featured)}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => onEdit(r)} aria-label="Edit" title="Edit"><I.edit /></button>
                      <button className="icon-btn danger" onClick={() => onDelete(r)} aria-label="Delete" title="Delete"><I.trash /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── DELETE MODAL ───────────────────────────────────────────────────────────────
function DeleteModal({ item, label = "resource", onConfirm, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-ico"><I.trash /></div>
        <h2 className="modal-title">Delete {label}?</h2>
        <p className="modal-text">You're about to delete <span className="modal-name">“{item.title}”</span>.</p>
        <p className="modal-text">This cannot be undone.</p>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}><I.trash />Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── QUICK LINKS ────────────────────────────────────────────────────────────────
function QuickLinksView({ links, onSave }) {
  const [rows, setRows] = useState(() => links.map((l) => ({ ...l })));
  const [saved, setSaved] = useState(false);
  const isSaving = useRef(false);

  const linksKey = links.map((l) => `${l.id}|${l.label}|${l.sub}|${l.href}`).join(",");
  useEffect(() => {
    if (isSaving.current) { isSaving.current = false; return; }
    setRows(links.map((l) => ({ ...l })));
    setSaved(false);
  }, [linksKey]);

  const set = (id, key, val) => { setRows((p) => p.map((r) => r.id === id ? { ...r, [key]: val } : r)); setSaved(false); };
  const add = () => { setRows((p) => [...p, { id: "ql-" + Date.now().toString(36), label: "", sub: "", href: "" }]); setSaved(false); };
  const remove = (id) => { setRows((p) => p.filter((r) => r.id !== id)); setSaved(false); };
  const normalizeHref = (href) => {
    const h = href.trim();
    if (!h || h === "#") return h;
    return /^https?:\/\//i.test(h) ? h : "https://" + h;
  };
  const save = () => {
    isSaving.current = true;
    const normalized = rows
      .filter((r) => r.label.trim())
      .map((r) => ({ ...r, href: normalizeHref(r.href) }));
    onSave(normalized);
    setSaved(true);
  };

  return (
    <div className="content">
      <div className="tbl-tools">
        <span style={{ color: "var(--muted)", fontSize: 13, flex: 1 }}>
          Quick links appear on the hub home screen for all agents.
        </span>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={add}><I.plus />Add link</button>
          <button className="btn btn-gold" onClick={save}>
            {saved ? <><I.check /> Saved</> : "Save changes"}
          </button>
        </div>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Label</th>
              <th>Subtitle</th>
              <th>URL</th>
              <th style={{ width: 56 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="4"><div className="tbl-empty">
                <p className="tbl-empty-big">No quick links</p>
                <p className="tbl-empty-sub">Add links agents need fast access to.</p>
              </div></td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td><input className="field field-sm" value={r.label} placeholder="e.g. InsuraCloud"
                  onChange={(e) => set(r.id, "label", e.target.value)} /></td>
                <td><input className="field field-sm" value={r.sub} placeholder="e.g. Quoting & e-apps"
                  onChange={(e) => set(r.id, "sub", e.target.value)} /></td>
                <td><input className="field field-sm" value={r.href} placeholder="https://…"
                  onChange={(e) => set(r.id, "href", e.target.value)} /></td>
                <td style={{ textAlign: "right" }}>
                  <button className="icon-btn danger" onClick={() => remove(r.id)} title="Delete"><I.trash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TOASTS ─────────────────────────────────────────────────────────────────────
function Toasts({ items }) {
  return (
    <div className="toast-wrap">
      {items.map((t) => (
        <div key={t.id} className={"toast" + (t.err ? " toast-err" : "")}>
          <span className="toast-ico">{t.err ? <I.trash /> : <I.check />}</span>{t.msg}
        </div>
      ))}
    </div>
  );
}

// ── APP ─────────────────────────────────────────────────────────────────────────
const ADMIN_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#C9A84C",
  "density": "regular"
}/*EDITMODE-END*/;

const TITLES = {
  dashboard: { crumb: "Overview", h: "Dashboard" },
  add: { crumb: "Resource Library", h: "Add Resource" },
  edit: { crumb: "Resource Library", h: "Edit Resource" },
  manage: { crumb: "Resource Library", h: "Manage Resources" },
  recordings: { crumb: "Recorded Presentations", h: "Recordings" },
  quicklinks: { crumb: "Site Settings", h: "Quick Links" },
};

function App() {
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem("apex_admin_auth") === "1"; } catch (e) { return false; }
  });
  const [t, setTweak] = useTweaks(ADMIN_DEFAULTS);
  const [route, setRoute] = useState("dashboard");
  const [resources, setResources] = useState(buildSeed);
  const [recordings, setRecordings] = useState(buildRecordings);
  const [presenters, setPresenters] = useState(buildPresenters);
  const [quickLinks, setQuickLinks] = useState([
    { id: "ql-insura", label: "InsuraCloud", sub: "Quoting & e-apps", href: "#" },
    { id: "ql-ready",  label: "Readymode",   sub: "Power dialer",     href: "#" },
    { id: "ql-agent",  label: "AgentLink",   sub: "Contracting & comp", href: "#" },
    { id: "ql-web",    label: "Website",     sub: "apexfinancialempire.com", href: "#" },
  ]);
  const [editing, setEditing] = useState(null);
  const [presetType, setPresetType] = useState(null);
  const [presetFilter, setPresetFilter] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [transcripts, setTranscripts] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const pw = () => { try { return sessionStorage.getItem("apex_admin_pw") || ""; } catch (e) { return ""; } };

  const toast = useCallback((msg, err) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg, err }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3500);
  }, []);

  const apiSave = useCallback(async (key, data) => {
    try {
      const r = await fetch("/api/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw(), key, data }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        toast("Save failed: " + (j.error || "HTTP " + r.status), true);
        return false;
      }
      return true;
    } catch {
      toast("Save failed — network error", true);
      return false;
    }
  }, [toast]);

  const setResourcesAndSave = useCallback(async (updater) => {
    const next = typeof updater === "function" ? updater(resources) : updater;
    setResources(next);
    await apiSave("apex:resources", next);
  }, [apiSave, resources]);

  const setRecordingsAndSave = useCallback(async (updater) => {
    let next;
    setRecordings((prev) => {
      next = typeof updater === "function" ? updater(prev) : updater;
      return next;
    });
    await apiSave("apex:recordings", next);
  }, [apiSave]);

  const transcribeIfNeeded = useCallback(async (rec) => {
    if (!rec.source || rec.status !== "published") return;
    try {
      const existing = await fetch("/api/transcripts").then((r) => r.json());
      const ex = existing[rec.id];
      if (ex && ["completed", "queued", "processing", "submitting"].includes(ex.status)) return;
      const r = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rec.source }),
      });
      if (!r.ok) return;
      const { id } = await r.json();
      fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recId: rec.id, entry: { status: "queued", jobId: id } }),
      }).catch(() => {});
    } catch {}
  }, []);


  useEffect(() => {
    if (!authed) return;
    const p = pw();
    if (!p) {
      // Stale session — no password stored, must re-login
      try { sessionStorage.removeItem("apex_admin_auth"); } catch (e) {}
      setAuthed(false);
      return;
    }
    fetch("/api/admin/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: p }),
    })
      .then(async (r) => {
        if (r.status === 401) {
          try { sessionStorage.removeItem("apex_admin_auth"); sessionStorage.removeItem("apex_admin_pw"); } catch (e) {}
          setAuthed(false);
          return;
        }
        const d = await r.json();
        if (!d.ok) {
          toast("Failed to load from database: " + (d.error || "unknown error"), true);
          return;
        }
        setRecordings(d.recordings);
        setPresenters(d.presenters);
        setResources(d.resources);
        if (d.quickLinks) setQuickLinks(d.quickLinks);
      })
      .catch(() => toast("Failed to load data — check DB config", true));
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    const load = () => fetch("/api/transcripts").then((r) => r.json()).then(setTranscripts).catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [authed]);

  const nav = (key, filter) => { setRoute(key); setPresetFilter(filter || null); window.scrollTo(0, 0); };
  const openAdd = (item, type) => {
    if (item) { setEditing(item); setRoute("edit"); }
    else { setEditing(null); setPresetType(type || null); setRoute("add"); }
    window.scrollTo(0, 0);
  };
  const openEdit = (item) => { setEditing(item); setRoute("edit"); window.scrollTo(0, 0); };
  const openRec = (item) => { setEditing(item); setRoute("recording-form"); window.scrollTo(0, 0); };

  const save = async (data, wasEditing) => {
    const updated = wasEditing ? resources.map((r) => r.id === data.id ? data : r) : [data, ...resources];
    setResources(updated);
    const ok = await apiSave("apex:resources", updated);
    if (ok) toast(wasEditing ? "Changes saved" : (data.status === "draft" ? "Saved as draft" : "Resource published"));
    setRoute("manage"); setEditing(null); setPresetType(null); window.scrollTo(0, 0);
  };
  const saveRec = async (data, wasEditing) => {
    const updated = wasEditing ? recordings.map((r) => r.id === data.id ? data : r) : [data, ...recordings];
    setRecordings(updated);
    const ok = await apiSave("apex:recordings", updated);
    transcribeIfNeeded(data);
    if (ok) toast(wasEditing ? "Recording saved" : (data.status === "draft" ? "Saved as draft" : "Recording published"));
    setRoute("recordings"); setEditing(null); window.scrollTo(0, 0);
  };
  const addPresenter = ({ name, role }) => {
    const np = { id: "p-" + Date.now().toString(36), name, role: role || "Presenter", initials: recInitialsOf(name) };
    const updated = [...presenters, np];
    setPresenters(updated);
    apiSave("apex:presenters", updated);
    return np;
  };
  const updateQuickLinks = async (updated) => {
    setQuickLinks(updated);
    const ok = await apiSave("apex:quicklinks", updated);
    if (ok) toast("Quick links saved");
  };
  const updatePresenters = useCallback((updated) => {
    setPresenters(updated);
    apiSave("apex:presenters", updated);
  }, [apiSave]);
  const doDelete = async () => {
    if (!toDelete) return;
    if (toDelete.kind === "recording") {
      const updated = recordings.filter((r) => r.id !== toDelete.item.id);
      setRecordings(updated);
      const ok = await apiSave("apex:recordings", updated);
      if (ok) toast("Recording deleted");
    } else {
      const updated = resources.filter((r) => r.id !== toDelete.item.id);
      setResources(updated);
      const ok = await apiSave("apex:resources", updated);
      if (ok) toast("Resource deleted");
    }
    setToDelete(null);
  };
  const logout = () => {
    try { sessionStorage.removeItem("apex_admin_auth"); sessionStorage.removeItem("apex_admin_pw"); } catch (e) {}
    setAuthed(false);
  };

  const rootStyle = { "--gold": t.accent };

  if (!authed) return <div style={rootStyle}><Gate onUnlock={() => setAuthed(true)} /></div>;

  const onForm = route === "add" || route === "edit" || route === "recording-form";
  const sideRoute = ({ edit: "manage", add: "add", "recording-form": "recordings" }[route]) || route;
  let meta = TITLES[route] || TITLES.dashboard;
  if (route === "recording-form") meta = { crumb: "Recorded Presentations", h: editing ? "Edit Recording" : "Add Recording" };

  return (
    <div className="shell" style={rootStyle}>
      <Sidebar route={sideRoute} onNav={nav} onLogout={logout} count={resources.length + recordings.length}
        drawerOpen={drawerOpen} onCloseDrawer={closeDrawer} />
      <div className="main">
        <header className="topbar">
          <button className="hamburger-btn" onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation" aria-expanded={drawerOpen}>☰</button>
          <div className="topbar-title">
            <span className="topbar-crumb">{meta.crumb}</span>
            <span className="topbar-h">{meta.h}</span>
          </div>
          <div className="topbar-actions">
            {!onForm && route !== "quicklinks" && (
              route === "recordings"
                ? <button className="btn btn-gold" onClick={() => openRec(null)}><I.plus />New Recording</button>
                : <button className="btn btn-gold" onClick={() => openAdd(null)}><I.plus />New Resource</button>
            )}
          </div>
        </header>

        {route === "dashboard" && (
          <Dashboard resources={resources} recordings={recordings} presenters={presenters}
            onNav={nav} onAdd={openAdd} onAddRec={openRec} onEditRec={openRec} />
        )}
        {(route === "add" || route === "edit") && (
          <ResourceForm key={editing ? editing.id : "new-" + presetType} editing={editing} presetType={presetType}
            presenters={presenters}
            onSave={save} onCancel={() => { setRoute(editing ? "manage" : "dashboard"); setEditing(null); }} />
        )}
        {route === "manage" && (
          <ManageTable resources={resources} setResources={setResourcesAndSave}
            onEdit={openEdit} onDelete={(r) => setToDelete({ item: r, kind: "resource" })} presetFilter={presetFilter} density={t.density} transcripts={transcripts} onToast={toast} />
        )}
        {route === "recordings" && (
          <RecordingsView recordings={recordings} setRecordings={setRecordingsAndSave}
            presenters={presenters} setPresenters={updatePresenters}
            onEdit={openRec} onAdd={openRec} onDelete={(r) => setToDelete({ item: r, kind: "recording" })} />
        )}
        {route === "recording-form" && (
          <RecordingForm key={editing ? editing.id : "new-rec"} editing={editing} presenters={presenters}
            onAddPresenter={addPresenter} onSave={saveRec}
            onCancel={() => { setRoute("recordings"); setEditing(null); }} />
        )}
        {route === "quicklinks" && (
          <QuickLinksView links={quickLinks} onSave={updateQuickLinks} />
        )}
      </div>

      {drawerOpen && <div className="drawer-backdrop" onClick={closeDrawer} aria-hidden="true" />}
      {toDelete && <DeleteModal item={toDelete.item} label={toDelete.kind} onConfirm={doDelete} onClose={() => setToDelete(null)} />}
      <Toasts items={toasts} />

      <TweaksPanel>
        <TweakSection label="Brand" />
        <TweakColor label="Accent" value={t.accent}
          options={["#C9A84C", "#D4AF37", "#B8862B", "#E0C56E"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Table" />
        <TweakRadio label="Row density" value={t.density}
          options={["compact", "regular"]} onChange={(v) => setTweak("density", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
