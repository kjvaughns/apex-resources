const { kv } = require("@vercel/kv");
const defaults = require("./_defaults");

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const TYPE_CTA = {
  pdf: { meta: "PDF", cta: "Open PDF" },
  training: { meta: "Training", cta: "Watch training" },
  guide: { meta: "Script · Google Doc", cta: "Open script" },
  tool: { meta: "Tool", cta: "Open tool" },
  video: { meta: "Video", cta: "Watch video" },
};

function toPublicRec(r) {
  return {
    id: r.id,
    presenter: r.presenterId,
    title: r.title,
    topic: r.topic,
    date: fmtDate(r.date),
    audio: r.format === "audio",
    video: r.source,
    desc: r.desc || "",
    duration: r.duration || "",
  };
}

function toPublicRes(r) {
  const m = TYPE_CTA[r.type] || { meta: r.type, cta: "Open" };
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    desc: r.desc || "",
    long: r.long || r.desc || "",
    date: fmtDate(r.date),
    meta: m.meta,
    cta: m.cta,
    url: r.link || "#",
    tags: r.tags || [],
    duration: r.duration || "",
    featured: !!r.featured,
    isNew: !!r.isNew,
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  try {
    const [kvRecs, kvPres, kvRes] = await Promise.all([
      kv.get("apex:recordings"),
      kv.get("apex:presenters"),
      kv.get("apex:resources"),
    ]);

    const recordings = (kvRecs || defaults.recordings)
      .filter((r) => r.status === "published")
      .map(toPublicRec);

    const presenters = kvPres || defaults.presenters;

    const resources = (kvRes || defaults.resources)
      .filter((r) => r.status === "published")
      .map(toPublicRes);

    res.json({ recordings, presenters, resources });
  } catch {
    // KV not configured — fall back to defaults
    const recordings = defaults.recordings
      .filter((r) => r.status === "published")
      .map(toPublicRec);
    const resources = defaults.resources
      .filter((r) => r.status === "published")
      .map(toPublicRes);
    res.json({ recordings, presenters: defaults.presenters, resources });
  }
};
