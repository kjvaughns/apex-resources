const { AssemblyAI } = require('assemblyai');
const Busboy = require('busboy');

module.exports.config = { api: { bodyParser: false, sizeLimit: '100mb' } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseDriveUrl(url) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? `https://drive.google.com/uc?export=download&id=${m[1]}&confirm=t` : url;
}

function normalizeUrl(raw) {
  const url = raw.trim();
  if (url.includes('drive.google.com')) return parseDriveUrl(url);
  return url;
}

function parseUpload(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers, limits: { fileSize: 100 * 1024 * 1024 } });
    const chunks = [];
    let found = false;

    bb.on('file', (_, stream) => {
      found = true;
      stream.on('data', (d) => chunks.push(d));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });

    bb.on('error', reject);
    bb.on('finish', () => { if (!found) reject(new Error('No file in upload')); });
    req.pipe(bb);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ASSEMBLYAI_API_KEY not set in Vercel environment variables' });
  }

  const client = new AssemblyAI({ apiKey });

  try {
    const ct = (req.headers['content-type'] || '').split(';')[0].trim();
    let audioUrl;

    if (ct === 'application/json') {
      const body = JSON.parse((await getRawBody(req)).toString());
      if (!body.url) return res.status(400).json({ error: 'url required' });
      audioUrl = normalizeUrl(body.url);
    } else {
      const buffer = await parseUpload(req);
      audioUrl = await client.files.upload(buffer);
    }

    const job = await client.transcripts.submit({
      audio_url: audioUrl,
      speaker_labels: true,
      summarization: true,
      summary_model: 'informative',
      summary_type: 'paragraph',
      auto_highlights: true,
      punctuate: true,
      format_text: true,
    });

    return res.json({ id: job.id });
  } catch (err) {
    console.error('[transcribe]', err);
    return res.status(500).json({ error: err.message || 'Failed to start transcription' });
  }
};
