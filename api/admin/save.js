const { kv } = require("@vercel/kv");

const ALLOWED = ["apex:recordings", "apex:presenters", "apex:resources", "apex:quicklinks"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  const { password, key, data } = req.body || {};

  if (!process.env.ADMIN_PASSWORD)
    return res.status(500).json({ ok: false, error: "ADMIN_PASSWORD env var not set in Vercel" });
  if (password !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ ok: false, error: "Wrong password" });
  if (!ALLOWED.includes(key))
    return res.status(400).json({ ok: false, error: "Invalid key: " + key });

  try {
    await kv.set(key, data);
    res.json({ ok: true });
  } catch (e) {
    console.error("[admin/save]", e.message);
    res.status(500).json({ ok: false, error: "DB error: " + e.message });
  }
};
