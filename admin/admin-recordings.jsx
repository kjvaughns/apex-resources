// APEX Admin — Recorded Presentations (presenters + recordings)
const { useState: useStateR, useMemo: useMemoR, useEffect: useEffectR, useRef: useRefR } = React;
const Ir = window.Icons;

const REC_FMT = {
  video: { label: "Video", color: "#E5484D", icon: "video" },
  audio: { label: "Audio", color: "#9A6BE0", icon: "audio" },
};

const REC_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function rfmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return `${REC_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
const rToday = () => new Date().toISOString().slice(0, 10);
function initialsOf(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildPresenters() {
  return [
    { id: "kj",    name: "KJ",    role: "Regional Director", initials: "KJ" },
    { id: "obi",   name: "Obi",   role: "Senior Producer",   initials: "O" },
    { id: "chudi", name: "Chudi", role: "Field Trainer",     initials: "C" },
    { id: "sam",   name: "Sam",   role: "Agency Owner",      initials: "S" },
    { id: "moody", name: "Moody", role: "Top Producer",      initials: "M" },
  ];
}
function buildRecordings() {
  return [
    { id: "r-kj-1", presenterId: "kj", title: "Beating the Price Objection — Version 1", topic: "Objections", date: "2026-05-21", format: "audio", duration: "", status: "published",
      source: "https://drive.google.com/file/d/1aNpO39ZqQ3veCp1m4Aya8pa0QQ4Ffzjj/preview",
      desc: "One version of KJ's price-objection pitch — how he reframes \"it costs too much\" around the value of the protection." },
    { id: "r-kj-2", presenterId: "kj", title: "Beating the Price Objection — Version 2", topic: "Objections", date: "2026-05-07", format: "audio", duration: "", status: "published",
      source: "https://drive.google.com/file/d/1Pu3KtI7zg5Bp0uvvHnIhWq7675Kt0Ts6/preview",
      desc: "A different take on the same price-objection pitch — another way KJ holds the price and moves toward the close." },
    { id: "r-kj-3", presenterId: "kj", title: "Selling More Coverage — Objection Handling", topic: "Objections", date: "2026-04-12", format: "audio", duration: "", status: "published",
      source: "https://drive.google.com/file/d/1F4QK3vqzTO0R30SKp92KRuDNKhRQf1qj/preview",
      desc: "Handling objections when positioning additional coverage so clients land on the right level of protection." },
    { id: "r-obi-1", presenterId: "obi", title: "Obi Recording 1", topic: "Training", date: "2026-05-29", format: "audio", duration: "", status: "published",
      source: "https://drive.google.com/file/d/1mzo2RzPyZc1BwLu6-MJDT8VSQoDcRQ7w/preview", desc: "" },
    { id: "r-obi-2", presenterId: "obi", title: "Obi Recording 2", topic: "Training", date: "2026-05-29", format: "audio", duration: "", status: "published",
      source: "https://drive.google.com/file/d/1GTV9fIvOMmJKIq_4PsQxy6_IN8UVm-3O/preview", desc: "" },
    { id: "r-obi-3", presenterId: "obi", title: "Obi Recording 3", topic: "Training", date: "2026-05-29", format: "audio", duration: "", status: "published",
      source: "https://drive.google.com/file/d/1UfUKBFhBZIRryNAoJpVddvFapJZUwwhp/preview", desc: "" },
    { id: "r-obi-4", presenterId: "obi", title: "Obi Recording 4", topic: "Training", date: "2026-05-29", format: "audio", duration: "", status: "published",
      source: "https://drive.google.com/file/d/1v85PsodhALrGRf7BmBVv7AsA1FbD_4Od/preview", desc: "" },
  ];
}

const Avatar = ({ p, sm }) => (
  <span className={"rec-avatar" + (sm ? " rec-avatar-sm" : "")}>{p ? p.initials : "?"}</span>
);

// ── RECORDING FORM ───────────────────────────────────────────────────────────
function blankRec(presenterId) {
  return { presenterId: presenterId || "", title: "", topic: "", date: rToday(),
    format: "video", duration: "", source: "", desc: "", status: "published" };
}
function RecordingForm({ editing, presenters, onAddPresenter, onSave, onCancel }) {
  const [f, setF] = useStateR(() => editing
    ? { ...blankRec(), ...editing }
    : blankRec(presenters[0] ? presenters[0].id : ""));
  const [err, setErr] = useStateR(false);
  const [addingP, setAddingP] = useStateR(false);
  const [pName, setPName] = useStateR("");
  const [pRole, setPRole] = useStateR("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const commitPresenter = () => {
    if (!pName.trim()) { setAddingP(false); return; }
    const np = onAddPresenter({ name: pName.trim(), role: pRole.trim() || "Presenter" });
    set("presenterId", np.id);
    setPName(""); setPRole(""); setAddingP(false);
  };

  const submit = (status) => {
    if (!f.title.trim() || !f.presenterId) { setErr(true); return; }
    onSave({
      id: editing ? editing.id : "rec-" + Date.now().toString(36),
      presenterId: f.presenterId, title: f.title.trim(), topic: f.topic.trim() || "General",
      date: f.date, format: f.format, duration: f.duration.trim(),
      source: f.source.trim(), desc: f.desc.trim(), status,
    }, !!editing);
  };

  return (
    <div className="content">
      <div className="form-wrap">
        <div className="form-card">
          <div className="form-grid">
            <div className="fg fg-full">
              <label className="lbl">Title</label>
              <input className="field" placeholder="e.g. Beating the Price Objection" value={f.title} autoFocus
                style={err && !f.title.trim() ? { borderColor: "var(--red)" } : null}
                onChange={(e) => { set("title", e.target.value); setErr(false); }} />
              {err && !f.title.trim() && <span className="field-hint" style={{ color: "var(--red)" }}>A title is required.</span>}
            </div>

            <div className="fg fg-full">
              <label className="lbl">Presenter</label>
              {!addingP ? (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <select className="field" value={f.presenterId} style={{ flex: 1 }}
                    onChange={(e) => { set("presenterId", e.target.value); setErr(false); }}>
                    <option value="" disabled>Select a presenter…</option>
                    {presenters.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.role}</option>)}
                  </select>
                  <button type="button" className="btn btn-sm" onClick={() => setAddingP(true)}><Ir.plus />New</button>
                </div>
              ) : (
                <div className="newp">
                  <input className="field" placeholder="Presenter name" value={pName} autoFocus onChange={(e) => setPName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitPresenter(); } }} />
                  <input className="field" placeholder="Role (e.g. Top Producer)" value={pRole} onChange={(e) => setPRole(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitPresenter(); } }} />
                  <button type="button" className="btn btn-gold btn-sm" onClick={commitPresenter}>Add</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAddingP(false); setPName(""); setPRole(""); }}>Cancel</button>
                </div>
              )}
              {err && !f.presenterId && <span className="field-hint" style={{ color: "var(--red)" }}>Choose a presenter.</span>}
            </div>

            <div className="fg">
              <label className="lbl">Topic</label>
              <input className="field" placeholder="e.g. Objections, Closing, Mindset" value={f.topic} onChange={(e) => set("topic", e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Date recorded</label>
              <input className="field" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
            </div>

            <div className="fg">
              <label className="lbl">Format</label>
              <div className="seg">
                <button type="button" className={f.format === "video" ? "seg-on" : ""} onClick={() => set("format", "video")}>Video</button>
                <button type="button" className={f.format === "audio" ? "seg-on" : ""} onClick={() => set("format", "audio")}>Audio</button>
              </div>
            </div>
            <div className="fg">
              <label className="lbl">Duration <span className="lbl-opt">optional</span></label>
              <input className="field" placeholder="e.g. 18:42" value={f.duration} onChange={(e) => set("duration", e.target.value)} />
            </div>

            <div className="fg fg-full">
              <label className="lbl">Recording link <span className="lbl-opt">Google Drive / Vimeo / direct URL</span></label>
              <input className="field" placeholder="https://drive.google.com/file/d/…/preview" value={f.source} onChange={(e) => set("source", e.target.value)} />
              <span className="field-hint">This is the player source shown on the public site.</span>
            </div>

            <div className="fg fg-full">
              <label className="lbl">Description</label>
              <textarea className="field" placeholder="What does this recording cover?" value={f.desc} onChange={(e) => set("desc", e.target.value)} />
            </div>
          </div>

          <div className="form-foot">
            <div className="form-foot-left"><span className="field-hint">Publish now or keep it as a draft.</span></div>
            <div className="form-foot-right">
              <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
              <button className="btn" onClick={() => submit("draft")}>Save draft</button>
              <button className="btn btn-gold" onClick={() => submit("published")}>{editing ? "Save & Publish" : "Publish"}<span className="arr">→</span></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PRESENTERS MANAGER MODAL ───────────────────────────────────────────────────
function PresentersModal({ presenters, recordings, onChange, onClose }) {
  const [name, setName] = useStateR("");
  const [role, setRole] = useStateR("");
  useEffectR(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const countFor = (id) => recordings.filter((r) => r.presenterId === id).length;
  const edit = (id, patch) => onChange(presenters.map((p) => p.id === id ? { ...p, ...patch } : p));
  const remove = (id) => onChange(presenters.filter((p) => p.id !== id));
  const add = () => {
    if (!name.trim()) return;
    const id = "p-" + Date.now().toString(36);
    onChange([...presenters, { id, name: name.trim(), role: role.trim() || "Presenter", initials: initialsOf(name) }]);
    setName(""); setRole("");
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-x" onClick={onClose} aria-label="Close">✕</button>
        <div className="pman-head">
          <span className="pman-ico"><Ir.users /></span>
          <div>
            <h2 className="pman-title">Presenters</h2>
            <p className="pman-sub">Add, rename, or remove the people whose recordings appear on the site.</p>
          </div>
        </div>

        <div className="pman-list">
          {presenters.map((p) => {
            const c = countFor(p.id);
            return (
              <div className="pman-row" key={p.id}>
                <Avatar p={p} />
                <div className="pman-fields">
                  <input className="field field-sm" value={p.name} onChange={(e) => edit(p.id, { name: e.target.value, initials: initialsOf(e.target.value) })} />
                  <input className="field field-sm" value={p.role} onChange={(e) => edit(p.id, { role: e.target.value })} />
                </div>
                <span className="pman-count">{c} rec{c === 1 ? "" : "s"}</span>
                <button className={"icon-btn danger" + (c > 0 ? " is-disabled" : "")} disabled={c > 0}
                  title={c > 0 ? "Reassign or remove their recordings first" : "Remove presenter"}
                  onClick={() => c === 0 && remove(p.id)}><Ir.trash /></button>
              </div>
            );
          })}
        </div>

        <div className="pman-add">
          <input className="field field-sm" placeholder="New presenter name" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <input className="field field-sm" placeholder="Role" value={role}
            onChange={(e) => setRole(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <button className="btn btn-gold btn-sm" onClick={add}><Ir.plus />Add</button>
        </div>

        <div className="modal-foot" style={{ marginTop: 22 }}>
          <button className="btn btn-gold" style={{ flex: 1 }} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ── RECORDINGS VIEW (manage) ───────────────────────────────────────────────────
function RecordingsView({ recordings, setRecordings, presenters, setPresenters, onEdit, onDelete, onAdd }) {
  const [sel, setSel] = useStateR("all");
  const [query, setQuery] = useStateR("");
  const [dragId, setDragId] = useStateR(null);
  const [overId, setOverId] = useStateR(null);
  const [pModal, setPModal] = useStateR(false);
  const [tsData, setTsData] = useStateR({});
  const [tsRunning, setTsRunning] = useStateR(false);
  const [tsLoaded, setTsLoaded] = useStateR(false);
  const tsRef = useRefR({});
  const pollRef = useRefR(null);

  useEffectR(() => {
    fetch("/api/transcripts")
      .then((r) => r.json())
      .then((d) => { tsRef.current = d || {}; setTsData(d || {}); setTsLoaded(true); })
      .catch(() => setTsLoaded(true));
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const saveTs = (recId, entry) => {
    tsRef.current = { ...tsRef.current, [recId]: entry };
    setTsData({ ...tsRef.current });
    fetch("/api/transcripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recId, entry }),
    }).catch(() => {});
  };

  const pollOnce = async () => {
    const pending = Object.entries(tsRef.current).filter(
      ([, v]) => ["queued", "processing"].includes(v?.status) && v?.jobId
    );
    if (pending.length === 0) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setTsRunning(false);
      return;
    }
    for (const [recId, entry] of pending) {
      try {
        const r = await fetch(`/api/transcribe-status?id=${entry.jobId}`);
        const data = await r.json();
        if (data.status && data.status !== entry.status) saveTs(recId, { ...entry, ...data });
      } catch {}
    }
  };

  const runAll = async () => {
    setTsRunning(true);
    for (const rec of recordings.filter((r) => r.source)) {
      const ex = tsRef.current[rec.id];
      if (ex && ["completed", "queued", "processing", "submitting"].includes(ex.status)) continue;
      try {
        saveTs(rec.id, { status: "submitting" });
        const r = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: rec.source }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const { id } = await r.json();
        saveTs(rec.id, { status: "queued", jobId: id });
      } catch (e) {
        saveTs(rec.id, { status: "error", error: e.message });
      }
    }
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(pollOnce, 15000);
    pollOnce();
  };

  const pById = useMemoR(() => Object.fromEntries(presenters.map((p) => [p.id, p])), [presenters]);
  const canReorder = sel === "all" && !query.trim();

  const counts = useMemoR(() => {
    const c = { all: recordings.length };
    for (const p of presenters) c[p.id] = recordings.filter((r) => r.presenterId === p.id).length;
    return c;
  }, [recordings, presenters]);

  const visible = useMemoR(() => {
    const q = query.trim().toLowerCase();
    return recordings.filter((r) => {
      if (sel !== "all" && r.presenterId !== sel) return false;
      if (!q) return true;
      const name = pById[r.presenterId] ? pById[r.presenterId].name : "";
      return (r.title + " " + r.topic + " " + r.desc + " " + name).toLowerCase().includes(q);
    });
  }, [recordings, sel, query, pById]);

  const onDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    setRecordings((prev) => {
      const arr = [...prev];
      const from = arr.findIndex((r) => r.id === dragId);
      const to = arr.findIndex((r) => r.id === targetId);
      if (from < 0 || to < 0) return prev;
      const [m] = arr.splice(from, 1); arr.splice(to, 0, m); return arr;
    });
    setDragId(null); setOverId(null);
  };

  return (
    <div className="content">
      <div className="pchips-bar">
        <div className="pchips">
          <button className={"pchip" + (sel === "all" ? " pchip-on" : "")} onClick={() => setSel("all")}>
            All<span className="pchip-n">{counts.all}</span>
          </button>
          {presenters.map((p) => (
            <button key={p.id} className={"pchip" + (sel === p.id ? " pchip-on" : "")} onClick={() => setSel(p.id)}>
              <Avatar p={p} sm />{p.name}<span className="pchip-n">{counts[p.id] || 0}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-sm" onClick={() => setPModal(true)}><Ir.users />Manage presenters</button>
      </div>

      {(() => {
        const withSrc = recordings.filter((r) => r.source);
        const done = withSrc.filter((r) => tsData[r.id]?.status === "completed").length;
        const pending = withSrc.filter((r) => ["queued","processing","submitting"].includes(tsData[r.id]?.status)).length;
        const errors = withSrc.filter((r) => tsData[r.id]?.status === "error").length;
        const allDone = done === withSrc.length && withSrc.length > 0;
        return (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0 10px", borderBottom:"1px solid var(--line)", marginBottom:12 }}>
            <span style={{ fontSize:13, color:"var(--muted)" }}>
              Transcripts:&nbsp;
              <strong style={{ color:"var(--text)" }}>{done}/{withSrc.length}</strong> complete
              {pending > 0 && <span style={{ color:"var(--gold)", marginLeft:8 }}>· {pending} pending</span>}
              {errors > 0 && <span style={{ color:"var(--red)", marginLeft:8 }}>· {errors} error{errors > 1 ? "s":""}</span>}
            </span>
            <button className={"btn btn-sm" + (allDone ? " btn-ghost" : " btn-gold")}
              onClick={runAll} disabled={tsRunning || !tsLoaded}>
              {tsRunning ? `Transcribing… ${done}/${withSrc.length}` : allDone ? "✓ All done" : "Transcribe All"}
            </button>
          </div>
        );
      })()}

      <div className="tbl-tools">
        <div className="tbl-search">
          <Ir.search />
          <input placeholder="Search recordings…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="tbl-wrap" style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Recording</th>
              <th style={{ width: 180 }}>Presenter</th>
              <th style={{ width: 110 }}>Format</th>
              <th style={{ width: 130 }}>Date</th>
              <th style={{ width: 120 }}>Status</th>
              <th style={{ width: 110 }}>Transcript</th>
              <th style={{ width: 96, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr><td colSpan="7"><div className="tbl-empty">
                <p className="tbl-empty-big">No recordings yet</p>
                <p className="tbl-empty-sub">{sel === "all" ? "Add the first recorded presentation." : "This presenter has no recordings yet."}</p>
              </div></td></tr>
            ) : visible.map((r) => {
              const p = pById[r.presenterId];
              const fm = REC_FMT[r.format] || REC_FMT.video;
              const FmtIco = Ir[fm.icon];
              return (
                <tr key={r.id}
                  draggable={canReorder}
                  onDragStart={canReorder ? () => setDragId(r.id) : undefined}
                  onDragOver={canReorder ? (e) => { e.preventDefault(); setOverId(r.id); } : undefined}
                  onDrop={canReorder ? () => onDrop(r.id) : undefined}
                  onDragEnd={() => { setDragId(null); setOverId(null); }}
                  className={(dragId === r.id ? "dragging " : "") + (overId === r.id && dragId !== r.id ? "drop-target" : "")}>
                  <td className="td-grip" style={{ cursor: canReorder ? "grab" : "default", opacity: canReorder ? 1 : 0.25 }}
                    title={canReorder ? "Drag to reorder" : "Clear search & presenter filter to reorder"}><Ir.grip /></td>
                  <td>
                    <div className="tr-title">
                      <span className="tr-title-main">{r.title}</span>
                      <span className="tr-title-sub"><span className="rec-topic-chip">{r.topic}</span> {r.duration && ("· " + r.duration)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="rec-presenter">
                      <Avatar p={p} sm />
                      <span className="rec-presenter-txt">
                        <span className="rec-presenter-name">{p ? p.name : "Unassigned"}</span>
                        <span className="rec-presenter-role">{p ? p.role : ""}</span>
                      </span>
                    </div>
                  </td>
                  <td><span className="tbadge" style={{ "--ac": fm.color }}><FmtIco />{fm.label}</span></td>
                  <td className="td-date">{rfmtDate(r.date)}</td>
                  <td><span className={"status " + (r.status === "published" ? "status-pub" : "status-draft")}><span className="status-dot" />{r.status === "published" ? "Published" : "Draft"}</span></td>
                  <td>{(() => {
                    const ts = tsData[r.id];
                    if (!ts) return <span style={{ color:"var(--muted-2)", fontSize:12 }}>—</span>;
                    if (ts.status === "completed") return <span style={{ color:"#46A758", fontSize:12, fontWeight:600 }}>✓ Done</span>;
                    if (ts.status === "error") return <span style={{ color:"var(--red)", fontSize:12 }}>Error</span>;
                    return <span style={{ color:"var(--gold)", fontSize:12, textTransform:"capitalize" }}>{ts.status}</span>;
                  })()}</td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => onEdit(r)} title="Edit"><Ir.edit /></button>
                      <button className="icon-btn danger" onClick={() => onDelete(r)} title="Delete"><Ir.trash /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pModal && <PresentersModal presenters={presenters} recordings={recordings} onChange={setPresenters} onClose={() => setPModal(false)} />}
    </div>
  );
}

Object.assign(window, { buildPresenters, buildRecordings, RecordingsView, RecordingForm, REC_FMT, rfmtDate, recInitialsOf: initialsOf });
