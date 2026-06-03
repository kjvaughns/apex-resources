const { kv } = require("@vercel/kv");
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

    // Merge any default resources missing from KV (e.g. phone-sales-mastery added after seed)
    let resources = kvRes || defaults.resources;
    if (kvRes !== null) {
      const existingIds = new Set(kvRes.map((r) => r.id));
      const missing = defaults.resources.filter((r) => !existingIds.has(r.id));
      if (missing.length > 0) {
        resources = [...missing, ...kvRes];
        kv.set("apex:resources", resources).catch(() => {});
      }
    }

    res.json({
      ok: true,
      recordings: kvRecs || defaults.recordings,
      presenters: kvPres || defaults.presenters,
      resources,
      quickLinks: kvQL || defaults.quickLinks,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: "DB error: " + e.message });
  }
};
