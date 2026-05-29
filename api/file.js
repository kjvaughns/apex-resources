module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).end();

  const { url } = req.query;
  if (!url) return res.status(400).end();

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(500).end();

  try {
    const upstream = await fetch(url, {
      headers: { Authorization: "Bearer " + token },
    });
    if (!upstream.ok) return res.status(upstream.status).end();

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    if (contentType === "application/pdf") {
      res.setHeader("Content-Disposition", "inline");
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
