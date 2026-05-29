const { put } = require("@vercel/blob");
const busboy = require("busboy");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  return new Promise((resolve) => {
    const bb = busboy({ headers: req.headers });
    let fileBuffer = null;
    let fileName = "upload";
    let mimeType = "application/octet-stream";

    bb.on("file", (_name, file, info) => {
      fileName = info.filename || "upload";
      mimeType = info.mimeType || "application/octet-stream";
      const chunks = [];
      file.on("data", (chunk) => chunks.push(chunk));
      file.on("end", () => { fileBuffer = Buffer.concat(chunks); });
    });

    bb.on("close", async () => {
      if (!fileBuffer) {
        res.status(400).json({ ok: false, error: "No file received" });
        return resolve();
      }
      try {
        const blob = await put(fileName, fileBuffer, { access: "private", contentType: mimeType });
        const proxyUrl = "/api/file?url=" + encodeURIComponent(blob.url);
        res.json({ ok: true, url: proxyUrl });
      } catch (e) {
        console.error("[upload]", e.message);
        res.status(500).json({ ok: false, error: e.message });
      }
      resolve();
    });

    bb.on("error", (e) => {
      res.status(500).json({ ok: false, error: e.message });
      resolve();
    });

    req.pipe(bb);
  });
};
