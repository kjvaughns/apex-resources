const { kv } = require("@vercel/kv");

function durFmt(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return m + ":" + String(s).padStart(2, "0");
}

const ANS_IDX = { a: 0, b: 1, c: 2, d: 3 };

function buildModules(lessons, quizzesByLesson) {
  const items = [];
  for (const l of lessons) {
    items.push({
      id: l.id,
      kind: "lesson",
      title: l.title || "Lesson",
      media: l.media_type || "video",
      duration: durFmt(l.duration_seconds),
      blurb: l.blurb || "",
      link: l.media_url || "",
    });
    const qs = (quizzesByLesson[l.id] || []).filter(q => q.question);
    if (qs.length) {
      items.push({
        id: l.id + "-quiz",
        kind: "quiz",
        title: (l.title || "Lesson") + " — Check",
        pass: l.quiz_pass || 0.7,
        questions: qs.map(q => ({
          q: q.question,
          options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
          answer: ANS_IDX[q.correct_answer] ?? 0,
        })),
      });
    }
  }
  if (!items.length) return [];
  return [{ title: "Course Content", items }];
}

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

    const resources = courses.map(c => {
      const lessons = lessonsByCourse[c.id] || [];
      const modules = buildModules(lessons, quizzesByLesson);
      return {
        id: c.id,
        type: "course",
        title: c.title,
        desc: c.description || "",
        long: c.description || "",
        date: c.created_at ? c.created_at.slice(0, 10) : "",
        meta: `Course · ${lessons.length} lesson${lessons.length !== 1 ? "s" : ""}`,
        cta: "Start Course",
        tags: ["course"],
        course: {
          instructor: c.instructor_name || "",
          instructorRole: c.instructor_role || "",
          level: c.level || "Core Curriculum",
          learn: c.learn || [],
          modules,
        },
      };
    });

    res.json({ resources, courses, lessonsByCourse, quizzesByLesson });
  } catch {
    res.json({ resources: [], courses: [], lessonsByCourse: {}, quizzesByLesson: {} });
  }
};
