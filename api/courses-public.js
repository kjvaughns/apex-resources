const { kv } = require("@vercel/kv");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).end();

  try {
    const allCourses = (await kv.get("apex:courses")) || [];
    const courses = allCourses.filter(c => c.is_published);

    const lessonsEntries = await Promise.all(
      courses.map(c =>
        kv.get(`apex:lessons:${c.id}`).then(l => [
          c.id,
          (l || []).filter(ls => ls.is_published).sort((a, b) => a.order_index - b.order_index),
        ])
      )
    );
    const lessonsByCourse = Object.fromEntries(lessonsEntries);

    const allLessons = lessonsEntries.flatMap(([, ls]) => ls);
    const quizEntries = await Promise.all(
      allLessons.map(l => kv.get(`apex:quizzes:${l.id}`).then(q => [l.id, q || []]))
    );
    const quizzesByLesson = Object.fromEntries(quizEntries);

    res.json({ courses, lessonsByCourse, quizzesByLesson });
  } catch {
    res.json({ courses: [], lessonsByCourse: {}, quizzesByLesson: {} });
  }
};
