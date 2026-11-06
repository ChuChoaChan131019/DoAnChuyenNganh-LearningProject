import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ownerMigration = readFileSync(
  new URL('../../../../database/migrations/20261105004802_lesson_ai_practice.sql', import.meta.url),
  'utf8',
);
const setsMigration = readFileSync(
  new URL('../../../../database/migrations/20261105231314_ai_practice_sets.sql', import.meta.url),
  'utf8',
);

const learner = '00000000-0000-4000-8000-000000000001';
const otherLearner = '00000000-0000-4000-8000-000000000002';
const course = '00000000-0000-4000-8000-000000000010';
const chapter = '00000000-0000-4000-8000-000000000011';
const lesson = '00000000-0000-4000-8000-000000000012';
const practiceSet = '00000000-0000-4000-8000-000000000020';
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

describe('AI practice sets migration (PostgreSQL)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
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
    await db.exec(ownerMigration);
    await db.exec(setsMigration);
  }, 30_000);

  afterAll(async () => {
    await db?.close();
  });

  it('stores one complete set and marks it ready atomically', async () => {
    await db.query(
      `insert into public.ai_practice_sets
        (id, user_id, course_id, chapter_id, lesson_id, status, requested_count, processing_started_at)
       values ($1, $2, $3, $4, $5, 'generating', 3, now())`,
      [practiceSet, learner, course, chapter, lesson],
    );
    const questions = [question, { ...question, content: 'Câu 2' }, { ...question, content: 'Câu 3' }];
    const saved = await db.query<{ id: string }>(
      'select * from public.save_ai_practice_set_questions($1::uuid, $2::uuid, $3::jsonb)',
      [learner, practiceSet, JSON.stringify(questions)],
    );
    expect(saved.rows).toHaveLength(3);

    const setRows = await db.query<{ status: string; generated_count: number }>(
      'select status, generated_count from public.ai_practice_sets where id = $1',
      [practiceSet],
    );
    expect(setRows.rows[0]).toEqual({ status: 'ready', generated_count: 3 });

    const questionRows = await db.query<{ generated_for_user_id: string; ai_practice_set_id: string }>(
      'select generated_for_user_id, ai_practice_set_id from public.questions where ai_practice_set_id = $1',
      [practiceSet],
    );
    expect(questionRows.rows).toHaveLength(3);
    expect(questionRows.rows.every((row) => row.generated_for_user_id === learner)).toBe(true);
  });

  it('rejects another learner even when the set UUID is known', async () => {
    const questions = [question, { ...question, content: 'Câu B' }, { ...question, content: 'Câu C' }];
    await expect(db.query(
      'select * from public.save_ai_practice_set_questions($1::uuid, $2::uuid, $3::jsonb)',
      [otherLearner, practiceSet, JSON.stringify(questions)],
    )).rejects.toThrow('AI practice set is not available');
  });

  it('keeps the migration idempotent and limits function execution', async () => {
    await db.exec(setsMigration);
    const privileges = await db.query<{ service: boolean; authenticated: boolean; anonymous: boolean }>(`
      select
        has_function_privilege('service_role', 'public.save_ai_practice_set_questions(uuid,uuid,jsonb)', 'execute') as service,
        has_function_privilege('authenticated', 'public.save_ai_practice_set_questions(uuid,uuid,jsonb)', 'execute') as authenticated,
        has_function_privilege('anon', 'public.save_ai_practice_set_questions(uuid,uuid,jsonb)', 'execute') as anonymous
    `);
    expect(privileges.rows[0]).toEqual({ service: true, authenticated: false, anonymous: false });
  });
});
