const { kv } = require("@vercel/kv");

const ALLOWED = ["apex:recordings", "apex:presenters", "apex:resources"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const { password, key, data } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ ok: false, error: "Unauthorized" });
  if (!ALLOWED.includes(key)) return res.status(400).json({ ok: false, error: "Invalid key" });
  await kv.set(key, data);
  res.json({ ok: true });
};
