module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const { password } = req.body || {};
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) return res.status(500).json({ ok: false, error: "ADMIN_PASSWORD env var not set" });
  res.json({ ok: password === adminPw });
};
