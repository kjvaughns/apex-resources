const { kv } = require("@vercel/kv");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const { password } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ ok: false });

  try {
    const courses = (await kv.get("apex:courses")) || [];

    const lessonsEntries = await Promise.all(
      courses.map(c => kv.get(`apex:lessons:${c.id}`).then(l => [c.id, l || []]))
    );
    const lessonsByCourse = Object.fromEntries(lessonsEntries);

    const allLessons = lessonsEntries.flatMap(([, ls]) => ls);
    const quizEntries = await Promise.all(
      allLessons.map(l => kv.get(`apex:quizzes:${l.id}`).then(q => [l.id, q || []]))
    );
    const quizzesByLesson = Object.fromEntries(quizEntries);

    res.json({ ok: true, courses, lessonsByCourse, quizzesByLesson });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
