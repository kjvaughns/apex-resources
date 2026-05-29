const { Redis } = require("@upstash/redis");
const kv = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const data = await kv.get("apex:transcripts").catch(() => null);
    return res.json(data || {});
  }

  if (req.method === "POST") {
    const { recId, entry } = req.body || {};
    if (!recId || !entry) return res.status(400).json({ ok: false });
    const current = (await kv.get("apex:transcripts").catch(() => null)) || {};
    current[recId] = entry;
    await kv.set("apex:transcripts", current);
    return res.json({ ok: true });
  }

  res.status(405).end();
};
