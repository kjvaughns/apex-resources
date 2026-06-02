const { kv } = require("@vercel/kv");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const { courseId, learnerName } = req.query;
    if (!courseId || !learnerName) return res.status(400).json({ ok: false });
    const all = (await kv.get("apex:enrollments")) || [];
    const enrollment = all.find(e => e.course_id === courseId && e.learner_name === learnerName) || null;
    return res.json({ ok: true, enrollment });
  }

  if (req.method === "POST") {
    const { courseId, learnerName } = req.body || {};
    if (!courseId || !learnerName) return res.status(400).json({ ok: false });
    const all = (await kv.get("apex:enrollments")) || [];
    const existing = all.find(e => e.course_id === courseId && e.learner_name === learnerName);
    if (existing) return res.json({ ok: true, enrollment: existing });
    const enrollment = {
      id: "enroll-" + Date.now().toString(36),
      course_id: courseId,
      learner_name: learnerName,
      started_at: new Date().toISOString(),
      completed_at: null,
      final_score: null,
    };
    all.push(enrollment);
    await kv.set("apex:enrollments", all);
    return res.json({ ok: true, enrollment });
  }

  if (req.method === "PUT") {
    const { id, completed_at, final_score } = req.body || {};
    if (!id) return res.status(400).json({ ok: false });
    const all = (await kv.get("apex:enrollments")) || [];
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return res.status(404).json({ ok: false });
    all[idx] = { ...all[idx], completed_at, final_score };
    await kv.set("apex:enrollments", all);
    return res.json({ ok: true, enrollment: all[idx] });
  }

  res.status(405).end();
};
