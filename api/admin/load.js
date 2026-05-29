const { Redis } = require("@upstash/redis");
const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const defaults = require("../_defaults");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const { password } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ ok: false });

  try {
    const [kvRecs, kvPres, kvRes, kvQL] = await Promise.all([
      kv.get("apex:recordings"),
      kv.get("apex:presenters"),
      kv.get("apex:resources"),
      kv.get("apex:quicklinks"),
    ]);

    // Auto-seed on first access
    if (kvRecs === null) kv.set("apex:recordings", defaults.recordings).catch(() => {});
    if (kvPres === null) kv.set("apex:presenters", defaults.presenters).catch(() => {});
    if (kvRes === null) kv.set("apex:resources", defaults.resources).catch(() => {});
    if (kvQL === null) kv.set("apex:quicklinks", defaults.quickLinks).catch(() => {});

    res.json({
      ok: true,
      recordings: kvRecs || defaults.recordings,
      presenters: kvPres || defaults.presenters,
      resources: kvRes || defaults.resources,
      quickLinks: kvQL || defaults.quickLinks,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: "DB error: " + e.message });
  }
};
