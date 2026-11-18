import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;
const courseId = '10000000-0000-4000-8000-000000000001';

function databaseUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const line = fs.readFileSync(path.resolve('backend/.env'), 'utf8').split(/\r?\n/)
    .find((item) => item.startsWith('SUPABASE_DB_URL='));
  if (!line) throw new Error('Không tìm thấy SUPABASE_DB_URL.');
  return line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
}

const client = new Client({ connectionString: databaseUrl() });
try {
  await client.connect();
  const checks = await client.query(`
    with target_lessons as (
      select l.id from public.lessons l
      join public.chapters c on c.id=l.chapter_id where c.course_id=$1
    ), option_stats as (
      select q.id, q.question_type, count(o.id)::int options,
             count(o.id) filter (where o.is_correct)::int correct
      from public.questions q left join public.question_options o on o.question_id=q.id
      where q.course_id=$1 group by q.id, q.question_type
    )
    select
      (select count(*)::int from public.courses where id=$1 and status='published') as published_course,
      (select count(*)::int from public.chapters where course_id=$1 and status='published') as published_chapters,
      (select count(*)::int from target_lessons l join public.lessons x on x.id=l.id where x.status='published') as published_lessons,
      (select count(*)::int from public.questions where course_id=$1 and status='approved') as approved_questions,
      (select count(*)::int from target_lessons l where (select count(*) from public.questions q where q.lesson_id=l.id) <> 4) as lessons_with_wrong_question_count,
      (select count(*)::int from option_stats where
        (question_type='single_choice' and (options < 2 or correct <> 1)) or
        (question_type='multiple_choice' and (options < 3 or correct < 2)) or
        (question_type='true_false' and (options <> 2 or correct <> 1)) or
        (question_type='fill_in_blank' and (options <> 1 or correct <> 1))) as invalid_questions,
      (select count(*)::int from public.quizzes q where q.course_id=$1 and
        (select count(*) from public.quiz_questions qq where qq.quiz_id=q.id) <> 10) as invalid_quizzes,
      (select count(*)::int from public.code_exercises e join target_lessons l on l.id=e.lesson_id
        left join public.code_exercise_revisions r on r.id=e.published_revision_id
        where r.id is null or r.status <> 'published' or
          (select count(*) from public.code_test_cases t where t.revision_id=r.id) < 2) as invalid_exercises,
      (select count(distinct v.lesson_id)::int from public.lesson_validation_runs v join target_lessons l on l.id=v.lesson_id where v.status='passed') as passed_validations
  `, [courseId]);
  const actual = checks.rows[0];
  const expected = {
    published_course: 1,
    published_chapters: 6,
    published_lessons: 24,
    approved_questions: 96,
    lessons_with_wrong_question_count: 0,
    invalid_questions: 0,
    invalid_quizzes: 0,
    invalid_exercises: 0,
    passed_validations: 24,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (Number(actual[key]) !== value) throw new Error(`${key}=${actual[key]}, cần ${value}.`);
  }
  console.log(JSON.stringify(actual, null, 2));
} finally {
  await client.end().catch(() => undefined);
}
