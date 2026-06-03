// APEX Admin — Courses
const { useState: useCS, useEffect: useCE, useRef: useCR, useCallback: useCC } = React;
const Ics = window.Icons;

// ── HELPERS ───────────────────────────────────────────────────────────────────
const cpw = () => sessionStorage.getItem("apex_admin_pw") || "";

async function cSave(key, data) {
  const r = await fetch("/api/admin/save", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, data, password: cpw() }),
  });
  return r.ok;
}

function blankCourse() {
  return { title: "", description: "", thumbnail_url: "", instructor_name: "",
    instructor_role: "", level: "Core Curriculum", learn: [], is_published: false };
}

function blankLesson(courseId, orderIndex) {
  return { title: "", media_url: "", media_type: "video", duration_seconds: 0, blurb: "",
    quiz_pass: 0.7, transcript: null, transcript_job_id: null, transcript_status: null,
    is_published: true, course_id: courseId, order_index: orderIndex };
}

function blankQuestion(orderIndex) {
  return { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "a", order_index: orderIndex };
}

// ── COURSES LIST ──────────────────────────────────────────────────────────────
function CoursesView({ courses, lessonsByCourse, onNew, onEdit, onManage, onDelete }) {
  return (
    <div className="content">
      <div className="tbl-toolbar">
        <div><h2 className="tbl-head-title">Courses</h2><p className="tbl-head-sub">{courses.length} total</p></div>
        <button className="btn btn-gold" onClick={onNew}><Ics.plus />New Course</button>
      </div>
      {courses.length === 0 ? (
        <div className="tbl-empty"><p className="tbl-empty-big">No courses yet</p>
          <p className="tbl-empty-sub">Create your first course to get started.</p></div>
      ) : (
        <div className="crs-list">
          {courses.map(c => {
            const lessons = lessonsByCourse[c.id] || [];
            return (
              <div key={c.id} className="crs-row">
                <div className="crs-row-thumb">
                  {c.thumbnail_url
                    ? <img src={c.thumbnail_url} alt="" />
                    : <span className="crs-thumb-ph">📚</span>}
                </div>
                <div className="crs-row-body">
                  <div className="crs-row-title">{c.title || <em style={{color:"var(--muted)"}}>Untitled</em>}</div>
                  <div className="crs-row-meta">{c.instructor_name || "—"} · {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}</div>
                </div>
                <span className={"status " + (c.is_published ? "status-pub" : "status-draft")}>
                  <span className="status-dot" />{c.is_published ? "Published" : "Draft"}
                </span>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => onManage(c)} title="Manage lessons"><Ics.list /></button>
                  <button className="icon-btn" onClick={() => onEdit(c)} title="Edit course"><Ics.edit /></button>
                  <button className="icon-btn danger" onClick={() => onDelete(c)} title="Delete"><Ics.trash /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── COURSE FORM ───────────────────────────────────────────────────────────────
function CourseForm({ editing, courses, setCourses, onBack, onManage, toast }) {
  const [f, setF] = useCS(() => editing ? { ...blankCourse(), ...editing } : blankCourse());
  const [saving, setSaving] = useCS(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const save = async (publish) => {
    if (!f.title.trim()) return;
    setSaving(true);
    const isNew = !editing;
    const course = {
      ...f, title: f.title.trim(), description: f.description.trim(),
      instructor_name: f.instructor_name.trim(),
      instructor_role: (f.instructor_role || "").trim(),
      level: f.level || "Core Curriculum",
      learn: f.learn || [],
      id: editing ? editing.id : "course-" + Date.now().toString(36),
      is_published: publish !== undefined ? publish : f.is_published,
      created_at: editing ? editing.created_at : new Date().toISOString(),
      lesson_count: editing ? (editing.lesson_count || 0) : 0,
    };
    const updated = isNew ? [course, ...courses] : courses.map(c => c.id === course.id ? course : c);
    await cSave("apex:courses", updated);
    setCourses(updated);
    setSaving(false);
    toast(editing ? "Course saved" : "Course created");
    if (isNew) onManage(course);
    else onBack();
  };

  return (
    <div className="content">
      <div className="form-wrap">
        <div className="form-card">
          <div className="form-grid">
            <div className="fg fg-full">
              <label className="lbl">Course title</label>
              <input className="field" placeholder="e.g. Mastering the Final Expense Sale" value={f.title}
                autoFocus onChange={e => set("title", e.target.value)} />
            </div>
            <div className="fg fg-full">
              <label className="lbl">Description</label>
              <textarea className="field" placeholder="What will agents learn in this course?" value={f.description}
                onChange={e => set("description", e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Instructor name</label>
              <input className="field" placeholder="e.g. KJ" value={f.instructor_name}
                onChange={e => set("instructor_name", e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Instructor role</label>
              <input className="field" placeholder="e.g. Regional Director" value={f.instructor_role || ""}
                onChange={e => set("instructor_role", e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Level</label>
              <select className="field" value={f.level || "Core Curriculum"} onChange={e => set("level", e.target.value)}>
                {["Core Curriculum", "Onboarding", "Intermediate", "Advanced"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Thumbnail URL <span className="lbl-opt">optional</span></label>
              <input className="field" placeholder="https://…" value={f.thumbnail_url}
                onChange={e => set("thumbnail_url", e.target.value)} />
            </div>
            <div className="fg fg-full">
              <label className="lbl">What you'll learn <span className="lbl-opt">one bullet per line</span></label>
              <textarea className="field" style={{minHeight:100}} placeholder={"Open every call with a verification intro\nControl your tonality and pace\nHandle the price objection…"}
                value={(f.learn || []).join("\n")}
                onChange={e => set("learn", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} />
            </div>
          </div>
          <div className="form-foot">
            <div className="form-foot-left">
              <button className="btn btn-ghost" onClick={onBack}>Cancel</button>
            </div>
            <div className="form-foot-right">
              <button className="btn" disabled={saving || !f.title.trim()} onClick={() => save(false)}>Save draft</button>
              <button className="btn btn-gold" disabled={saving || !f.title.trim()} onClick={() => save(true)}>
                {editing ? "Save & Publish" : "Create & Publish"}<span className="arr">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LESSON TRANSCRIPT STATUS DOT ──────────────────────────────────────────────
function LessonTsDot({ status }) {
  if (!status || status === "none") return null;
  const map = {
    queued: { col: "var(--gold)", label: "Queued" },
    processing: { col: "var(--gold)", label: "Transcribing…" },
    completed: { col: "var(--green)", label: "Transcript ready" },
    error: { col: "var(--red)", label: "Transcript failed" },
  };
  const m = map[status] || map.queued;
  return <span style={{ fontSize: 11, color: m.col, marginLeft: 6 }}>● {m.label}</span>;
}

// ── COURSE DETAIL (lesson manager) ────────────────────────────────────────────
function CourseDetail({ course, lessons: initLessons, quizzesByLesson: initQBL,
  setCourses, courses, setLessonsByCourse, onBack, onEditLesson, onEditQuiz, toast }) {
  const [lessons, setLessons] = useCS(initLessons || []);
  const [quizzesByLesson, setQBL] = useCS(initQBL || {});
  const [dragId, setDragId] = useCS(null);
  const [overId, setOverId] = useCS(null);
  const pollRef = useCR(null);

  // Save lessons helper
  const saveLessons = async (next) => {
    setLessons(next);
    await cSave(`apex:lessons:${course.id}`, next);
    const updated = courses.map(c => c.id === course.id ? { ...c, lesson_count: next.length } : c);
    setCourses(updated);
    await cSave("apex:courses", updated);
    setLessonsByCourse(prev => ({ ...prev, [course.id]: next }));
  };

  // Poll transcription for pending lessons
  useCE(() => {
    const poll = async () => {
      const pending = lessons.filter(l => l.transcript_job_id && ["queued", "processing"].includes(l.transcript_status));
      if (!pending.length) return;
      const updates = await Promise.all(pending.map(async l => {
        const r = await fetch(`/api/transcribe-status?id=${l.transcript_job_id}`);
        const data = await r.json();
        return { id: l.id, data };
      }));
      setLessons(prev => {
        let changed = false;
        const next = prev.map(l => {
          const u = updates.find(x => x.id === l.id);
          if (!u || u.data.status === l.transcript_status) return l;
          changed = true;
          if (u.data.status === "completed") {
            return { ...l, transcript: u.data.text || "", transcript_status: "completed", transcript_job_id: null };
          }
          return { ...l, transcript_status: u.data.status };
        });
        if (changed) cSave(`apex:lessons:${course.id}`, next);
        return changed ? next : prev;
      });
    };
    pollRef.current = setInterval(poll, 15000);
    return () => clearInterval(pollRef.current);
  }, [lessons, course.id]);

  const addLesson = () => {
    const lesson = { ...blankLesson(course.id, lessons.length), id: "lesson-" + Date.now().toString(36) };
    onEditLesson(lesson, lessons, saveLessons);
  };

  const deleteLesson = async (id) => {
    const next = lessons.filter(l => l.id !== id).map((l, i) => ({ ...l, order_index: i }));
    await saveLessons(next);
    // Clean up quizzes for deleted lesson
    const newQBL = { ...quizzesByLesson };
    delete newQBL[id];
    setQBL(newQBL);
    await cSave(`apex:quizzes:${id}`, []);
    toast("Lesson deleted");
  };

  const togglePublish = async (lesson) => {
    const next = lessons.map(l => l.id === lesson.id ? { ...l, is_published: !l.is_published } : l);
    await saveLessons(next);
  };

  // Drag to reorder
  const onDragStart = (id) => setDragId(id);
  const onDragOver = (e, id) => { e.preventDefault(); setOverId(id); };
  const onDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const from = lessons.findIndex(l => l.id === dragId);
    const to = lessons.findIndex(l => l.id === targetId);
    const next = [...lessons];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const reordered = next.map((l, i) => ({ ...l, order_index: i }));
    saveLessons(reordered);
    setDragId(null); setOverId(null);
  };

  return (
    <div className="content">
      <div className="tbl-toolbar">
        <div>
          <h2 className="tbl-head-title">{course.title}</h2>
          <p className="tbl-head-sub">{lessons.length} lesson{lessons.length !== 1 ? "s" : ""} — drag rows to reorder</p>
        </div>
        <button className="btn btn-gold" onClick={addLesson}><Ics.plus />Add Lesson</button>
      </div>

      {lessons.length === 0 ? (
        <div className="tbl-empty"><p className="tbl-empty-big">No lessons yet</p>
          <p className="tbl-empty-sub">Add lessons to build this course.</p></div>
      ) : (
        <div className="crs-lesson-list">
          {[...lessons].sort((a, b) => a.order_index - b.order_index).map((l, i) => {
            const quizCount = (quizzesByLesson[l.id] || []).length;
            return (
              <div key={l.id} className={"crs-lesson-row" + (overId === l.id ? " drag-over" : "")}
                draggable onDragStart={() => onDragStart(l.id)}
                onDragOver={e => onDragOver(e, l.id)} onDrop={() => onDrop(l.id)} onDragEnd={() => { setDragId(null); setOverId(null); }}>
                <span className="crs-lesson-num">{i + 1}</span>
                <div className="crs-lesson-body">
                  <div className="crs-lesson-title">{l.title || <em style={{color:"var(--muted)"}}>Untitled</em>}
                    <LessonTsDot status={l.transcript_status} />
                  </div>
                  <div className="crs-lesson-meta">
                    {l.media_type === "audio" ? "♪ Audio" : "▶ Video"}
                    {l.duration_seconds ? ` · ${Math.floor(l.duration_seconds / 60)}m` : ""}
                    {quizCount > 0 ? ` · ${quizCount} quiz question${quizCount !== 1 ? "s" : ""}` : ""}
                  </div>
                </div>
                <span className={"status " + (l.is_published ? "status-pub" : "status-draft")} style={{cursor:"pointer"}}
                  onClick={() => togglePublish(l)} title="Click to toggle">
                  <span className="status-dot" />{l.is_published ? "Published" : "Draft"}
                </span>
                <div className="row-actions">
                  <button className="icon-btn" onClick={() => onEditQuiz(l, quizzesByLesson[l.id] || [])} title="Edit quiz"><Ics.list /></button>
                  <button className="icon-btn" onClick={() => onEditLesson(l, lessons, saveLessons)} title="Edit lesson"><Ics.edit /></button>
                  <button className="icon-btn danger" onClick={() => deleteLesson(l.id)} title="Delete"><Ics.trash /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── LESSON FORM ───────────────────────────────────────────────────────────────
function LessonForm({ lesson, course, lessons, saveLessons, onBack, toast }) {
  const [f, setF] = useCS(() => ({ ...lesson }));
  const [uploading, setUploading] = useCS(false);
  const [saving, setSaving] = useCS(false);
  const [tsStatus, setTsStatus] = useCS(lesson.transcript_status || null);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const triggerTranscription = async (url) => {
    if (!url) return;
    try {
      setTsStatus("queued");
      const r = await fetch("/api/transcribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!r.ok) { setTsStatus("error"); return; }
      const { id } = await r.json();
      set("transcript_job_id", id);
      set("transcript_status", "queued");
    } catch { setTsStatus("error"); }
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.ok) {
        set("media_url", d.url);
        set("media_type", file.type.startsWith("audio") ? "audio" : "video");
        toast("File uploaded — transcription will start on save");
      } else toast("Upload failed: " + d.error);
    } catch { toast("Upload failed"); }
    setUploading(false);
  };

  const save = async () => {
    if (!f.title.trim()) return;
    setSaving(true);
    const wasUrl = lesson.media_url;
    const nowUrl = f.media_url;
    const urlChanged = nowUrl && nowUrl !== wasUrl;

    let updated = { ...f, title: f.title.trim() };
    if (urlChanged) {
      updated = { ...updated, transcript: null, transcript_status: null, transcript_job_id: null };
    }

    const isNew = !lessons.find(l => l.id === lesson.id);
    const next = isNew ? [...lessons, updated] : lessons.map(l => l.id === updated.id ? updated : l);
    await saveLessons(next);

    if (urlChanged && nowUrl) await triggerTranscription(nowUrl);
    setSaving(false);
    toast("Lesson saved");
    onBack();
  };

  return (
    <div className="content">
      <div className="form-wrap">
        <div className="form-card">
          <div className="form-grid">
            <div className="fg fg-full">
              <label className="lbl">Lesson title</label>
              <input className="field" placeholder="e.g. Introduction to Final Expense" value={f.title}
                autoFocus onChange={e => set("title", e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Format</label>
              <div className="seg">
                <button type="button" className={f.media_type === "video" ? "seg-on" : ""} onClick={() => set("media_type", "video")}>Video</button>
                <button type="button" className={f.media_type === "audio" ? "seg-on" : ""} onClick={() => set("media_type", "audio")}>Audio</button>
              </div>
            </div>
            <div className="fg">
              <label className="lbl">Duration (seconds) <span className="lbl-opt">optional</span></label>
              <input className="field" type="number" placeholder="e.g. 1320" value={f.duration_seconds || ""}
                onChange={e => set("duration_seconds", parseInt(e.target.value) || 0)} />
            </div>
            <div className="fg fg-full">
              <label className="lbl">Media <span className="lbl-opt">URL or upload</span></label>
              <input className="field" placeholder="https://drive.google.com/… or Vimeo/Loom URL" value={f.media_url}
                onChange={e => set("media_url", e.target.value)} />
              <span className="field-hint">Paste a Google Drive, Vimeo, or Loom link. Or upload a file below.</span>
              <div className="crs-upload-row">
                <label className="btn btn-sm" style={{cursor:"pointer"}}>
                  {uploading ? "Uploading…" : "Upload file"}
                  <input type="file" accept="audio/*,video/*" style={{display:"none"}}
                    onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])} />
                </label>
                {f.media_url && (
                  <a href={f.media_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Preview ↗</a>
                )}
              </div>
              {tsStatus && (
                <div className="field-hint" style={{ marginTop: 6, color: tsStatus === "error" ? "var(--red)" : tsStatus === "completed" ? "var(--green)" : "var(--gold)" }}>
                  {tsStatus === "queued" && "Transcription queued — will process in background"}
                  {tsStatus === "processing" && "Transcribing now…"}
                  {tsStatus === "completed" && "✓ Transcript ready"}
                  {tsStatus === "error" && "Transcription failed — check the media URL and retry"}
                </div>
              )}
              {f.media_url && !tsStatus && (
                <button type="button" className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={() => triggerTranscription(f.media_url)}>
                  Trigger transcription
                </button>
              )}
            </div>
            <div className="fg fg-full">
              <label className="lbl">Lesson summary <span className="lbl-opt">one line shown under the title in the player</span></label>
              <textarea className="field" placeholder="What this lesson covers…" value={f.blurb || ""}
                onChange={e => set("blurb", e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Quiz pass mark <span className="lbl-opt">for this lesson's quiz</span></label>
              <select className="field" value={String(f.quiz_pass || 0.7)} onChange={e => set("quiz_pass", Number(e.target.value))}>
                <option value="0.5">50% to pass</option>
                <option value="0.6">60% to pass</option>
                <option value="0.67">67% to pass</option>
                <option value="0.7">70% to pass</option>
                <option value="0.75">75% to pass</option>
                <option value="0.8">80% to pass</option>
                <option value="0.9">90% to pass</option>
              </select>
            </div>
            <div className="fg fg-full">
              <label className="lbl">Published</label>
              <div className="seg" style={{maxWidth:200}}>
                <button type="button" className={f.is_published ? "seg-on" : ""} onClick={() => set("is_published", true)}>Published</button>
                <button type="button" className={!f.is_published ? "seg-on" : ""} onClick={() => set("is_published", false)}>Draft</button>
              </div>
            </div>
          </div>
          <div className="form-foot">
            <div className="form-foot-left"><button className="btn btn-ghost" onClick={onBack}>Cancel</button></div>
            <div className="form-foot-right">
              <button className="btn btn-gold" disabled={saving || !f.title.trim() || uploading} onClick={save}>
                Save Lesson<span className="arr">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── QUIZ EDITOR ───────────────────────────────────────────────────────────────
function QuizEditor({ lesson, initialQuizzes, setQBL, onBack, toast }) {
  const [questions, setQuestions] = useCS(() => initialQuizzes.length ? initialQuizzes : []);
  const [saving, setSaving] = useCS(false);

  const addQuestion = () => {
    if (questions.length >= 10) return;
    setQuestions(prev => [...prev, { ...blankQuestion(prev.length), id: "quiz-" + Date.now().toString(36) }]);
  };

  const removeQuestion = (id) => setQuestions(prev => prev.filter(q => q.id !== id).map((q, i) => ({ ...q, order_index: i })));
  const setQ = (id, k, v) => setQuestions(prev => prev.map(q => q.id === id ? { ...q, [k]: v } : q));

  const save = async () => {
    setSaving(true);
    const sorted = [...questions].sort((a, b) => a.order_index - b.order_index);
    await cSave(`apex:quizzes:${lesson.id}`, sorted);
    setQBL(prev => ({ ...prev, [lesson.id]: sorted }));
    setSaving(false);
    toast("Quiz saved");
    onBack();
  };

  const OPTS = ["a", "b", "c", "d"];
  const LABELS = { a: "A", b: "B", c: "C", d: "D" };

  return (
    <div className="content">
      <div className="tbl-toolbar">
        <div>
          <h2 className="tbl-head-title">Quiz: {lesson.title}</h2>
          <p className="tbl-head-sub">{questions.length}/10 questions</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          {questions.length < 10 && (
            <button className="btn" onClick={addQuestion}><Ics.plus />Add Question</button>
          )}
          <button className="btn btn-gold" disabled={saving} onClick={save}>Save Quiz<span className="arr">→</span></button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="tbl-empty">
          <p className="tbl-empty-big">No questions yet</p>
          <p className="tbl-empty-sub">Add up to 10 questions with 4 choices each.</p>
        </div>
      ) : (
        <div className="crs-quiz-list">
          {questions.map((q, qi) => (
            <div key={q.id} className="crs-quiz-card">
              <div className="crs-quiz-head">
                <span className="crs-quiz-num">Q{qi + 1}</span>
                <button className="icon-btn danger btn-sm" onClick={() => removeQuestion(q.id)} title="Remove"><Ics.trash /></button>
              </div>
              <input className="field" placeholder="Question text…" value={q.question}
                onChange={e => setQ(q.id, "question", e.target.value)} />
              <div className="crs-quiz-options">
                {OPTS.map(opt => (
                  <div key={opt} className={"crs-quiz-opt" + (q.correct_answer === opt ? " crs-quiz-opt-correct" : "")}>
                    <button type="button" className="crs-quiz-opt-mark" onClick={() => setQ(q.id, "correct_answer", opt)}
                      title="Mark as correct answer">
                      {q.correct_answer === opt ? "✓" : LABELS[opt]}
                    </button>
                    <input className="field field-sm" placeholder={`Option ${LABELS[opt]}`} value={q[`option_${opt}`]}
                      onChange={e => setQ(q.id, `option_${opt}`, e.target.value)} />
                  </div>
                ))}
              </div>
              <p className="field-hint">Click a letter to mark the correct answer (turns green).</p>
            </div>
          ))}
        </div>
      )}

      <div style={{marginTop:24}}>
        <button className="btn btn-ghost" onClick={onBack}>Cancel</button>
      </div>
    </div>
  );
}

// ── EXPORTS ───────────────────────────────────────────────────────────────────
Object.assign(window, { CoursesView, CourseForm, CourseDetail, LessonForm, QuizEditor });
