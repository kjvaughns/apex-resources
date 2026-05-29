const { kv } = require("@vercel/kv");
const defaults = require("../_defaults");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const { password } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ ok: false });

  try {
    const [kvRecs, kvPres, kvRes] = await Promise.all([
      kv.get("apex:recordings"),
      kv.get("apex:presenters"),
      kv.get("apex:resources"),
    ]);
    res.json({
      ok: true,
      recordings: kvRecs || defaults.recordings,
      presenters: kvPres || defaults.presenters,
      resources: kvRes || defaults.resources,
    });
  } catch {
    res.json({
      ok: true,
      recordings: defaults.recordings,
      presenters: defaults.presenters,
      resources: defaults.resources,
    });
  }
};
