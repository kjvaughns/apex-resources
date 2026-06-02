const { kv } = require("@vercel/kv");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const { enrollmentId } = req.query;
    if (!enrollmentId) return res.status(400).json({ ok: false });
    const responses = (await kv.get(`apex:quiz_responses:${enrollmentId}`)) || [];
    return res.json({ ok: true, responses });
  }

  if (req.method === "POST") {
    const { enrollmentId, quizId, selectedAnswer, correctAnswer } = req.body || {};
    if (!enrollmentId || !quizId) return res.status(400).json({ ok: false });
    const responses = (await kv.get(`apex:quiz_responses:${enrollmentId}`)) || [];
    const is_correct = selectedAnswer === correctAnswer;
    const response = {
      id: "qr-" + Date.now().toString(36),
      enrollment_id: enrollmentId,
      quiz_id: quizId,
      selected_answer: selectedAnswer,
      is_correct,
      answered_at: new Date().toISOString(),
    };
    const filtered = responses.filter(r => r.quiz_id !== quizId);
    filtered.push(response);
    await kv.set(`apex:quiz_responses:${enrollmentId}`, filtered);
    return res.json({ ok: true, response, is_correct });
  }

  res.status(405).end();
};
