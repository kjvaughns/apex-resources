const { AssemblyAI } = require('assemblyai');

async function polishUtterances(client, transcriptId, utterances) {
  if (!utterances.length) return utterances;
  try {
    const { response } = await client.lemur.task({
      transcript_ids: [transcriptId],
      prompt: `Polish these ${utterances.length} sales training transcript utterances. Fix grammar, remove any remaining filler words, and improve natural flow while keeping the meaning intact. Return ONLY a valid JSON array of strings — one cleaned string per utterance in the original order. No explanation, no markdown fences, just the raw JSON array.`,
      final_model: 'default',
      max_output_size: 4000,
    });
    const cleaned = JSON.parse(response.trim().replace(/^```(?:json)?\n?|```\s*$/g, ''));
    if (Array.isArray(cleaned) && cleaned.length === utterances.length) {
      return utterances.map((u, i) => ({
        ...u,
        text: typeof cleaned[i] === 'string' ? cleaned[i] : u.text,
      }));
    }
  } catch (e) {
    console.error('[lemur polish]', e.message);
  }
  return utterances;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ASSEMBLYAI_API_KEY not set' });

  const client = new AssemblyAI({ apiKey });

  try {
    const t = await client.transcripts.get(id);

    if (t.status === 'error') {
      return res.json({ status: 'error', error: t.error || 'Transcription failed' });
    }

    if (t.status !== 'completed') {
      return res.json({ status: t.status });
    }

    const keywords = (t.auto_highlights_result?.results || [])
      .filter((k) => k.rank > 0.05)
      .sort((a, b) => b.rank - a.rank)
      .slice(0, 20)
      .map((k) => ({ text: k.text, count: k.count }));

    const rawUtterances = (t.utterances || []).map((u) => ({
      speaker: u.speaker,
      text: u.text,
      startMs: u.start,
    }));

    const utterances = await polishUtterances(client, id, rawUtterances);

    return res.json({
      status: 'completed',
      summary: t.summary || null,
      keywords,
      utterances,
      text: t.text || '',
    });
  } catch (err) {
    console.error('[transcribe-status]', err);
    return res.status(500).json({ error: err.message });
  }
};
