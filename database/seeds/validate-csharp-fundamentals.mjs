import { course, exercises } from './csharp-fundamentals.dataset.mjs';
import { pathToFileURL } from 'node:url';

export function validateDataset() {
  const errors = [];
  const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
  const questions = lessons.flatMap((item) => item.questions);
  const questionTexts = new Set();
  const allowedTypes = new Set(['single_choice', 'multiple_choice', 'true_false', 'fill_in_blank']);
  const allowedDifficulties = new Set(['easy', 'medium', 'hard']);

  if (course.chapters.length !== 6) errors.push('Khóa học phải có đúng 6 chương.');
  if (lessons.length !== 24) errors.push('Khóa học phải có đúng 24 bài học.');
  if (questions.length !== 96) errors.push('Khóa học phải có đúng 96 câu hỏi.');
  if (exercises.length !== 12) errors.push('Khóa học phải có đúng 12 bài tập code.');

  course.chapters.forEach((chapter, chapterIndex) => {
    if (chapter.lessons.length !== 4) errors.push(`Chương ${chapterIndex + 1} phải có 4 bài.`);
    const chapterQuestions = chapter.lessons.flatMap((item) => item.questions);
    if (chapterQuestions.length < 10) errors.push(`Chương ${chapterIndex + 1} không đủ câu cho quiz.`);

    chapter.lessons.forEach((item, lessonIndex) => {
      const label = `Chương ${chapterIndex + 1}, bài ${lessonIndex + 1}`;
      if (item.title.trim().length < 2 || item.title.length > 160) errors.push(`${label}: tiêu đề không hợp lệ.`);
      if (item.content.length < 300 || item.content.length > 50_000) errors.push(`${label}: độ dài nội dung không hợp lệ.`);
      if (!/mục tiêu/i.test(item.content) || !/ví dụ/i.test(item.content)) errors.push(`${label}: thiếu mục tiêu hoặc ví dụ.`);
      if (!/```csharp/i.test(item.content) || !item.code.trim()) errors.push(`${label}: thiếu mã C#.`);
      if (!Number.isInteger(item.duration) || item.duration < 1 || item.duration > 1440) errors.push(`${label}: thời lượng không hợp lệ.`);
      if (item.questions.length !== 4) errors.push(`${label}: phải có đúng 4 câu hỏi.`);

      item.questions.forEach((question, questionIndex) => {
        const qLabel = `${label}, câu ${questionIndex + 1}`;
        if (!allowedTypes.has(question.type)) errors.push(`${qLabel}: loại câu hỏi không hợp lệ.`);
        if (!allowedDifficulties.has(question.difficulty)) errors.push(`${qLabel}: độ khó không hợp lệ.`);
        if (!question.content.trim() || !question.explanation.trim()) errors.push(`${qLabel}: thiếu nội dung hoặc giải thích.`);
        if (questionTexts.has(question.content)) errors.push(`${qLabel}: nội dung bị trùng.`);
        questionTexts.add(question.content);

        const correct = question.options.filter((option) => option.correct).length;
        const uniqueOptions = new Set(question.options.map((option) => option.text.trim().toLocaleLowerCase('vi')));
        if (uniqueOptions.size !== question.options.length) errors.push(`${qLabel}: phương án bị trùng.`);
        if (question.type === 'single_choice' && (question.options.length < 2 || correct !== 1)) errors.push(`${qLabel}: single_choice phải có đúng 1 đáp án.`);
        if (question.type === 'multiple_choice' && (question.options.length < 3 || correct < 2)) errors.push(`${qLabel}: multiple_choice phải có ít nhất 2 đáp án đúng.`);
        if (question.type === 'true_false' && (question.options.length !== 2 || correct !== 1)) errors.push(`${qLabel}: true_false phải có 2 phương án và 1 đáp án đúng.`);
        if (question.type === 'fill_in_blank' && (question.options.length !== 1 || correct !== 1)) errors.push(`${qLabel}: fill_in_blank phải có đúng 1 đáp án chuẩn.`);
      });
    });
  });

  exercises.forEach((exercise, index) => {
    const label = `Bài tập ${index + 1}`;
    if (!course.chapters[exercise.chapter]?.lessons[exercise.lesson]) errors.push(`${label}: liên kết bài học không tồn tại.`);
    if (!allowedDifficulties.has(exercise.difficulty)) errors.push(`${label}: độ khó không hợp lệ.`);
    if (!exercise.title.trim() || !exercise.objective.trim() || !exercise.description.trim()) errors.push(`${label}: thiếu mô tả.`);
    if (!exercise.starter.trim() || !exercise.solution.trim() || !exercise.explanation.trim()) errors.push(`${label}: thiếu code hoặc giải thích.`);
    if (!Array.isArray(exercise.cases) || exercise.cases.length < 2) errors.push(`${label}: cần ít nhất 2 test case.`);
    for (const testCase of exercise.cases) {
      if (testCase.length !== 2 || typeof testCase[0] !== 'string' || typeof testCase[1] !== 'string') errors.push(`${label}: test case không hợp lệ.`);
    }
  });

  if (errors.length) throw new Error(`Bộ dữ liệu không hợp lệ:\n- ${errors.join('\n- ')}`);

  const distribution = questions.reduce((result, question) => {
    result.types[question.type] = (result.types[question.type] ?? 0) + 1;
    result.difficulties[question.difficulty] = (result.difficulties[question.difficulty] ?? 0) + 1;
    return result;
  }, { types: {}, difficulties: {} });

  return {
    chapters: course.chapters.length,
    lessons: lessons.length,
    questions: questions.length,
    quizzes: course.chapters.length,
    quizQuestions: course.chapters.length * 10,
    exercises: exercises.length,
    ...distribution,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(validateDataset(), null, 2));
}
