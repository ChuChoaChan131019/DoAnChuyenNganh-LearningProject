import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL(
    '../../../../database/migrations/20261105004802_lesson_ai_practice.sql',
    import.meta.url,
  ),
  'utf8',
);
const learner = '00000000-0000-4000-8000-000000000001';
const otherLearner = '00000000-0000-4000-8000-000000000002';
const course = '00000000-0000-4000-8000-000000000010';
const chapter = '00000000-0000-4000-8000-000000000011';
const lesson = '00000000-0000-4000-8000-000000000012';
const question = {
  content: 'Biến trong C# dùng để làm gì?',
  question_type: 'single_choice',
  difficulty: 'easy',
  explanation: 'Biến dùng để lưu trữ giá trị.',
  options: [
    { option_text: 'Lưu trữ giá trị', is_correct: true, order_index: 0 },
    { option_text: 'Biên dịch mã', is_correct: false, order_index: 1 },
  ],
};
let db: PGlite;

async function saveQuestions(userId = learner, questions = [question, { ...question, content: 'Câu 2' }, { ...question, content: 'Câu 3' }]) {
  return db.query<{ id: string }>(
    'select * from public.save_ai_practice_questions($1::uuid, $2::uuid, $3::jsonb)',
    [userId, lesson, JSON.stringify(questions)],
  );
}

describe('lesson AI practice migration (PostgreSQL)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table public.profiles (id uuid primary key, role text not null);
      create table public.courses (
        id uuid primary key,
        title text not null,
        description text,
        status text not null
      );
      create table public.chapters (
        id uuid primary key,
        course_id uuid not null references public.courses(id),
        title text not null,
        status text not null
      );
      create table public.lessons (
        id uuid primary key,
        chapter_id uuid not null references public.chapters(id),
        title text not null,
        content text,
        code_example text,
        status text not null
      );
      create table public.questions (
        id uuid primary key default gen_random_uuid(),
        course_id uuid not null references public.courses(id),
        chapter_id uuid references public.chapters(id),
        lesson_id uuid references public.lessons(id),
        question_type text,
        difficulty text,
        content text not null,
        explanation text,
        status text default 'draft',
        is_ai_generated boolean default false,
        created_at timestamptz default now()
      );
      create table public.question_options (
        id uuid primary key default gen_random_uuid(),
        question_id uuid not null references public.questions(id),
        option_text text not null,
        is_correct boolean default false,
        order_index integer default 0
      );
      insert into public.profiles values
        ('${learner}', 'learner'), ('${otherLearner}', 'learner');
      insert into public.courses values ('${course}', 'C#', 'Khóa học C#', 'published');
      insert into public.chapters values ('${chapter}', '${course}', 'Cơ bản', 'published');
      insert into public.lessons values ('${lesson}', '${chapter}', 'Biến', 'Nội dung', 'int age = 18;', 'published');
    `);
    await db.exec(migration);
  }, 30_000);

  afterAll(async () => {
    await db?.close();
  });

  it('stores a complete learner-owned set and all options atomically', async () => {
    const saved = await saveQuestions();
    expect(saved.rows).toHaveLength(3);

    const questions = await db.query<{
      generated_for_user_id: string;
      lesson_id: string;
      status: string;
    }>(
      'select generated_for_user_id, lesson_id, status from public.questions where generated_for_user_id = $1',
      [learner],
    );
    expect(questions.rows).toHaveLength(3);
    expect(questions.rows[0]).toMatchObject({
      generated_for_user_id: learner,
      lesson_id: lesson,
      status: 'approved',
    });
    expect((await db.query('select id from public.question_options')).rows).toHaveLength(6);
  });

  it('rolls back the whole set when one question is invalid', async () => {
    const before = await db.query<{ count: number }>('select count(*)::integer as count from public.questions');
    const invalid = [
      question,
      { ...question, content: 'Câu lỗi', options: [] },
      { ...question, content: 'Câu 3' },
    ];

    await expect(saveQuestions(otherLearner, invalid)).rejects.toThrow();
    const after = await db.query<{ count: number }>('select count(*)::integer as count from public.questions');
    expect(after.rows[0].count).toBe(before.rows[0].count);
  });

  it('is idempotent and exposes the persistence function only to service_role', async () => {
    await db.exec(migration);
    const privileges = await db.query<{ service: boolean; authenticated: boolean; anonymous: boolean }>(`
      select
        has_function_privilege('service_role', 'public.save_ai_practice_questions(uuid,uuid,jsonb)', 'execute') as service,
        has_function_privilege('authenticated', 'public.save_ai_practice_questions(uuid,uuid,jsonb)', 'execute') as authenticated,
        has_function_privilege('anon', 'public.save_ai_practice_questions(uuid,uuid,jsonb)', 'execute') as anonymous
    `);
    expect(privileges.rows[0]).toEqual({
      service: true,
      authenticated: false,
      anonymous: false,
    });
  });
});
