const { kv } = require("@vercel/kv");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const { enrollmentId } = req.query;
    if (!enrollmentId) return res.status(400).json({ ok: false });
    const progress = (await kv.get(`apex:progress:${enrollmentId}`)) || {};
    return res.json({ ok: true, progress });
  }

  if (req.method === "POST") {
    const { enrollmentId, lessonId } = req.body || {};
    if (!enrollmentId || !lessonId) return res.status(400).json({ ok: false });
    const progress = (await kv.get(`apex:progress:${enrollmentId}`)) || {};
    progress[lessonId] = { completed: true, completed_at: new Date().toISOString() };
    await kv.set(`apex:progress:${enrollmentId}`, progress);
    return res.json({ ok: true, progress });
  }

  res.status(405).end();
};
