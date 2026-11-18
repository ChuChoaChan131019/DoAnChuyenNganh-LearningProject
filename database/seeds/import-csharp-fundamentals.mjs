import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';
import { course, exercises } from './csharp-fundamentals.dataset.mjs';
import { validateDataset } from './validate-csharp-fundamentals.mjs';

const { Client } = pg;
const VALIDATOR_VERSION = 'csharp-fundamentals-seed-v1';

function uuid(prefix, number) {
  return `${prefix}-0000-4000-8000-${String(number).padStart(12, '0')}`;
}

function loadDatabaseUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const envPath = path.resolve('backend/.env');
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((item) => item.startsWith('SUPABASE_DB_URL='));
  if (!line) throw new Error('Không tìm thấy SUPABASE_DB_URL trong backend/.env.');
  return line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
}

function lessonSnapshot(item) {
  return {
    title: item.title,
    content: item.content,
    code_example: item.code,
    estimated_duration_minutes: item.duration,
  };
}

async function assertExistingMatches(client, table, id, expected) {
  const { rows } = await client.query(`select * from public.${table} where id = $1`, [id]);
  if (!rows[0]) return false;
  for (const [key, value] of Object.entries(expected)) {
    if (String(rows[0][key] ?? '') !== String(value ?? '')) {
      throw new Error(`${table} ${id} đã tồn tại nhưng trường ${key} khác bộ seed. Dừng để không ghi đè dữ liệu.`);
    }
  }
  return true;
}

async function importDataset() {
  const manifest = validateDataset();
  const client = new Client({ connectionString: loadDatabaseUrl() });
  const courseId = uuid('10000000', 1);
  let questionNumber = 0;
  let optionNumber = 0;

  await client.connect();
  try {
    await client.query('begin');
    await client.query("set local statement_timeout = '60s'");
    await client.query("set local lock_timeout = '5s'");

    const actorResult = await client.query(`
      select id from public.profiles
      where role in ('content_manager', 'admin')
      order by case role when 'content_manager' then 0 else 1 end, created_at
      limit 1
    `);
    const actorId = actorResult.rows[0]?.id;
    if (!actorId) throw new Error('Cần ít nhất một tài khoản content_manager hoặc admin để sở hữu dữ liệu.');

    const courseExists = await assertExistingMatches(client, 'courses', courseId, { slug: course.slug, title: course.title });
    if (!courseExists) {
      await client.query(`
        insert into public.courses
          (id, title, slug, description, level, status, created_by)
        values ($1, $2, $3, $4, $5, 'draft', $6)
      `, [courseId, course.title, course.slug, course.description, course.level, actorId]);
    }

    for (let chapterIndex = 0; chapterIndex < course.chapters.length; chapterIndex += 1) {
      const chapter = course.chapters[chapterIndex];
      const chapterId = uuid('11000000', chapterIndex + 1);
      const chapterExists = await assertExistingMatches(client, 'chapters', chapterId, { course_id: courseId, title: chapter.title });
      if (!chapterExists) {
        await client.query(`
          insert into public.chapters
            (id, course_id, title, description, order_index, status)
          values ($1, $2, $3, $4, $5, 'draft')
        `, [chapterId, courseId, chapter.title, chapter.description, chapterIndex + 1]);
      }

      const chapterQuestionIds = [];
      for (let lessonIndex = 0; lessonIndex < chapter.lessons.length; lessonIndex += 1) {
        const item = chapter.lessons[lessonIndex];
        const lessonNumber = chapterIndex * 4 + lessonIndex + 1;
        const lessonId = uuid('12000000', lessonNumber);
        const lessonResult = await client.query('select * from public.lessons where id = $1', [lessonId]);
        const existingLesson = lessonResult.rows[0];
        if (existingLesson && existingLesson.chapter_id !== chapterId) {
          throw new Error(`lessons ${lessonId} đã thuộc chương khác. Dừng để không ghi đè dữ liệu.`);
        }
        const lessonMatches = existingLesson
          && existingLesson.title === item.title
          && existingLesson.content === item.content
          && existingLesson.code_example === item.code
          && Number(existingLesson.estimated_duration_minutes) === item.duration;

        if (!existingLesson) {
          await client.query(`
            insert into public.lessons
              (id, chapter_id, title, content, code_example, estimated_duration_minutes,
               order_index, status, is_ai_generated, created_by, updated_by, version)
            values ($1, $2, $3, $4, $5, $6, $7, 'draft', false, $8, $8, 1)
          `, [lessonId, chapterId, item.title, item.content, item.code, item.duration, lessonIndex + 1, actorId]);

          await client.query(
            'select public.record_lesson_validation($1,$2,1,$3::jsonb,$4::jsonb,$5)',
            [lessonId, actorId, JSON.stringify([]), JSON.stringify([]), VALIDATOR_VERSION],
          );
          await client.query(
            'select public.apply_lesson_review_action($1,$2,1,$3,$4)',
            [lessonId, actorId, 'approve', 'Bộ dữ liệu C# đã vượt qua kiểm tra tự động.'],
          );
          await client.query(
            'select public.apply_lesson_review_action($1,$2,2,$3,$4)',
            [lessonId, actorId, 'publish', 'Xuất bản bộ dữ liệu nền tảng C#.'],
          );
        } else if (!lessonMatches) {
          let current = existingLesson;
          console.log(`Đồng bộ bài ${lessonNumber}: ${item.title} (trạng thái ${current.status}, version ${current.version})`);
          if (current.status === 'published') {
            const result = await client.query(
              'select result.* from public.apply_lesson_review_action($1,$2,(select version from public.lessons where id=$1),$3,$4) as result',
              [lessonId, actorId, 'unpublish', 'Cập nhật nội dung từ bộ seed đã được kiểm chứng.'],
            );
            current = result.rows[0];
            console.log(`- Đã unpublish, version ${current.version}`);
          }
          if (!['draft', 'approved'].includes(current.status)) {
            throw new Error(`Không thể đồng bộ bài ${lessonId} từ trạng thái ${current.status}.`);
          }
          const saved = await client.query(
            'select result.* from public.save_lesson_content($1,$2,(select version from public.lessons where id=$1),$3::jsonb) as result',
            [lessonId, actorId, JSON.stringify(lessonSnapshot(item))],
          );
          current = saved.rows[0];
          console.log(`- Đã lưu nội dung, version ${current.version}`);
          await client.query(
            'select public.record_lesson_validation($1,$2,(select version from public.lessons where id=$1),$3::jsonb,$4::jsonb,$5)',
            [lessonId, actorId, JSON.stringify([]), JSON.stringify([]), VALIDATOR_VERSION],
          );
          const approved = await client.query(
            'select result.* from public.apply_lesson_review_action($1,$2,(select version from public.lessons where id=$1),$3,$4) as result',
            [lessonId, actorId, 'approve', 'Bản cập nhật seed đã vượt qua kiểm tra tự động.'],
          );
          console.log(`- Đã approve, version ${approved.rows[0].version}`);
          await client.query(
            'select public.apply_lesson_review_action($1,$2,(select version from public.lessons where id=$1),$3,$4)',
            [lessonId, actorId, 'publish', 'Xuất bản bản cập nhật seed C#.'],
          );
        }

        for (const question of item.questions) {
          questionNumber += 1;
          const questionId = uuid('13000000', questionNumber);
          chapterQuestionIds.push(questionId);
          const questionExists = await assertExistingMatches(client, 'questions', questionId, {
            course_id: courseId,
            chapter_id: chapterId,
            lesson_id: lessonId,
            content: question.content,
            question_type: question.type,
          });
          if (!questionExists) {
            await client.query(`
              insert into public.questions
                (id, course_id, chapter_id, lesson_id, question_type, difficulty,
                 content, explanation, status, is_ai_generated, version,
                 created_by, updated_by, reviewed_by, reviewed_at)
              values ($1,$2,$3,$4,$5,$6,$7,$8,'approved',false,1,$9,$9,$9,now())
            `, [questionId, courseId, chapterId, lessonId, question.type, question.difficulty,
              question.content, question.explanation, actorId]);
          }

          for (let optionIndex = 0; optionIndex < question.options.length; optionIndex += 1) {
            optionNumber += 1;
            const option = question.options[optionIndex];
            const optionId = uuid('14000000', optionNumber);
            await client.query(`
              insert into public.question_options
                (id, question_id, option_text, is_correct, order_index)
              values ($1,$2,$3,$4,$5)
              on conflict (id) do nothing
            `, [optionId, questionId, option.text, option.correct, optionIndex]);
          }
        }
      }

      const quizId = uuid('15000000', chapterIndex + 1);
      await client.query(`
        insert into public.quizzes
          (id, course_id, chapter_id, title, duration_minutes, pass_percentage,
           shuffle_questions, shuffle_options, is_active, quiz_type, is_required, counts_toward_progress)
        values ($1,$2,$3,$4,20,70,true,true,true,'exam',true,true)
        on conflict (id) do nothing
      `, [quizId, courseId, chapterId, `Bài kiểm tra chương ${chapterIndex + 1}: ${chapter.title}`]);
      for (const questionId of chapterQuestionIds.slice(0, 10)) {
        await client.query(`
          insert into public.quiz_questions (quiz_id, question_id, score_weight)
          values ($1,$2,1)
          on conflict do nothing
        `, [quizId, questionId]);
      }
    }

    for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex += 1) {
      const exercise = exercises[exerciseIndex];
      const exerciseId = uuid('16000000', exerciseIndex + 1);
      const revisionId = uuid('17000000', exerciseIndex + 1);
      const lessonId = uuid('12000000', exercise.chapter * 4 + exercise.lesson + 1);
      await client.query(`
        insert into public.code_exercises (id, lesson_id, created_by)
        values ($1,$2,$3)
        on conflict (id) do nothing
      `, [exerciseId, lessonId, actorId]);
      await client.query(`
        insert into public.code_exercise_revisions
          (id, exercise_id, revision_no, edit_version, title, objective, description,
           difficulty, input_format, output_format, starter_code, hint_1, hint_2, hint_3,
           solution_code, solution_explanation, status)
        values ($1,$2,1,1,$3,$4,$5,$6,
          'Dữ liệu được nhập từ thiết bị nhập chuẩn theo mô tả.',
          'In chính xác kết quả yêu cầu ra thiết bị xuất chuẩn.',
          $7,'Đọc kỹ kiểu dữ liệu đầu vào.','Tách bài toán thành các bước nhỏ.','Kiểm tra thêm trường hợp biên.',$8,$9,'published')
        on conflict (id) do nothing
      `, [revisionId, exerciseId, exercise.title, exercise.objective, exercise.description,
        exercise.difficulty, exercise.starter, exercise.solution, exercise.explanation]);
      for (let caseIndex = 0; caseIndex < exercise.cases.length; caseIndex += 1) {
        const testCaseId = uuid('18000000', exerciseIndex * 10 + caseIndex + 1);
        const [input, output] = exercise.cases[caseIndex];
        await client.query(`
          insert into public.code_test_cases
            (id, revision_id, input_text, expected_output, is_public, order_index)
          values ($1,$2,$3,$4,$5,$6)
          on conflict (id) do nothing
        `, [testCaseId, revisionId, input, output, caseIndex === 0, caseIndex + 1]);
      }
      await client.query(`
        update public.code_exercises
        set published_revision_id = $2, updated_at = now()
        where id = $1 and published_revision_id is distinct from $2
      `, [exerciseId, revisionId]);
    }

    await client.query(`update public.chapters set status = 'published' where course_id = $1`, [courseId]);
    await client.query(`update public.courses set status = 'published', updated_at = now() where id = $1`, [courseId]);
    await client.query('commit');

    const verification = await client.query(`
      select
        (select count(*)::int from public.chapters where course_id = $1) as chapters,
        (select count(*)::int from public.lessons l join public.chapters c on c.id=l.chapter_id where c.course_id = $1) as lessons,
        (select count(*)::int from public.questions where course_id = $1) as questions,
        (select count(*)::int from public.quizzes where course_id = $1) as quizzes,
        (select count(*)::int from public.quiz_questions qq join public.quizzes q on q.id=qq.quiz_id where q.course_id = $1) as quiz_questions,
        (select count(*)::int from public.code_exercises e join public.lessons l on l.id=e.lesson_id join public.chapters c on c.id=l.chapter_id where c.course_id = $1) as exercises,
        (select count(distinct v.lesson_id)::int from public.lesson_validation_runs v join public.lessons l on l.id=v.lesson_id join public.chapters c on c.id=l.chapter_id where c.course_id = $1 and v.status='passed') as passed_validations,
        (select count(*)::int from public.lessons l join public.chapters c on c.id=l.chapter_id where c.course_id = $1 and l.status='published') as published_lessons
    `, [courseId]);
    const actual = verification.rows[0];
    const expected = {
      chapters: manifest.chapters,
      lessons: manifest.lessons,
      questions: manifest.questions,
      quizzes: manifest.quizzes,
      quiz_questions: manifest.quizQuestions,
      exercises: manifest.exercises,
      passed_validations: manifest.lessons,
      published_lessons: manifest.lessons,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (Number(actual[key]) !== value) throw new Error(`Xác minh thất bại: ${key}=${actual[key]}, cần ${value}.`);
    }
    console.log(JSON.stringify({ courseId, slug: course.slug, ...actual }, null, 2));
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

importDataset().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
