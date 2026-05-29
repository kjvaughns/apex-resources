const { Redis } = require("@upstash/redis");

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
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN)
    return res.status(500).json({ ok: false, error: "KV env vars not set in Vercel" });

  try {
    const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
    await kv.set(key, data);
    res.json({ ok: true });
  } catch (e) {
    console.error("[admin/save]", e.message);
    res.status(500).json({ ok: false, error: "DB error: " + e.message });
  }
};
