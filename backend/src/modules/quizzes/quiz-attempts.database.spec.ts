import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../../../database/migrations/20261125090000_quiz_attempt_integrity.sql', import.meta.url),
  'utf8',
);

const learner = '00000000-0000-4000-8000-000000000001';
const manager = '00000000-0000-4000-8000-000000000002';
const timedQuiz = '00000000-0000-4000-8000-000000000010';
const openQuiz = '00000000-0000-4000-8000-000000000011';
const q3 = '00000000-0000-4000-8000-000000000020';
const q1 = '00000000-0000-4000-8000-000000000021';
const q3Right = '00000000-0000-4000-8000-000000000030';
const q3Wrong = '00000000-0000-4000-8000-000000000031';

let db: PGlite;

async function start(quizId = timedQuiz) {
  const { rows } = await db.query<{ result: Record<string, any> }>(
    'select public.start_quiz_attempt($1::uuid, $2::uuid, 30) as result',
    [quizId, learner],
  );
  return rows[0].result;
}

async function submit(attemptId: string) {
  const details = [
    { question_id: q3, answer_text: null, is_correct: true, score_weight: 3, earned_score: 3, selected_option_ids: [q3Right] },
    { question_id: q1, answer_text: null, is_correct: false, score_weight: 1, earned_score: 0, selected_option_ids: [] },
  ];
  const { rows } = await db.query<{ result: Record<string, any> }>(
    'select public.submit_quiz_attempt($1::uuid, $2::uuid, $3::jsonb, 4, 30) as result',
    [attemptId, learner, JSON.stringify(details)],
  );
  return rows[0].result;
}

async function count(sql: string, params: unknown[] = []) {
  const { rows } = await db.query<{ n: number }>(sql, params);
  return Number(rows[0].n);
}

describe('quiz attempt integrity migration (PostgreSQL)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table public.profiles (id uuid primary key, role text not null);
      create table public.quizzes (
        id uuid primary key, title text not null, duration_minutes integer,
        pass_percentage numeric default 50, is_active boolean default true
      );
      create table public.questions (
        id uuid primary key default gen_random_uuid(), content text not null,
        question_type text not null default 'single_choice', difficulty text default 'easy',
        explanation text, status text not null default 'approved', course_id uuid, chapter_id uuid,
        lesson_id uuid, generated_for_user_id uuid, version integer default 1,
        updated_by uuid, updated_at timestamptz
      );
      create table public.question_options (
        id uuid primary key default gen_random_uuid(), question_id uuid not null references public.questions(id),
        option_text text not null, is_correct boolean not null default false, order_index integer default 0
      );
      create table public.quiz_questions (
        quiz_id uuid references public.quizzes(id), question_id uuid references public.questions(id),
        score_weight double precision default 1.0, primary key (quiz_id, question_id)
      );
      create table public.quiz_attempts (
        id uuid primary key default gen_random_uuid(), started_at timestamptz default now(),
        completed_at timestamptz, total_score double precision, pass_percentage numeric default 50,
        is_passed boolean default false, user_id uuid not null, quiz_id uuid not null references public.quizzes(id)
      );
      create table public.quiz_attempt_details (
        id uuid primary key default gen_random_uuid(), answer_text text, is_correct boolean not null,
        ai_feedback text, attempt_id uuid not null references public.quiz_attempts(id),
        question_id uuid not null references public.questions(id)
      );
      create table public.quiz_attempt_answers (
        id uuid primary key default gen_random_uuid(),
        detail_id uuid not null references public.quiz_attempt_details(id),
        option_id uuid not null references public.question_options(id),
        unique (detail_id, option_id)
      );
      create table public.question_history (
        id uuid primary key default gen_random_uuid(), question_id uuid not null references public.questions(id),
        version integer not null, action text not null, from_status text, to_status text not null,
        actor_id uuid, reason text, snapshot jsonb not null, created_at timestamptz not null default now(),
        constraint question_history_action_check check (action in ('created', 'updated', 'submitted', 'approved', 'rejected'))
      );
      insert into public.profiles values ('${learner}', 'learner'), ('${manager}', 'content_manager');
      insert into public.quizzes (id, title, duration_minutes, pass_percentage) values
        ('${timedQuiz}', 'Timed', 10, 50), ('${openQuiz}', 'Unlimited', null, 50);
      insert into public.questions (id, content) values ('${q3}', 'Q3'), ('${q1}', 'Q1');
      insert into public.question_options (id, question_id, option_text, is_correct) values
        ('${q3Right}', '${q3}', 'Right', true), ('${q3Wrong}', '${q3}', 'Wrong', false);
      insert into public.quiz_questions values
        ('${timedQuiz}', '${q3}', 3), ('${timedQuiz}', '${q1}', 1), ('${openQuiz}', '${q1}', 1);
      -- Dữ liệu cũ: hai lượt mở trùng và một lượt đã nộp chưa có phần trăm.
      insert into public.quiz_attempts (quiz_id, user_id, started_at, total_score) values
        ('${timedQuiz}', '${learner}', now() - interval '2 hours', 0),
        ('${timedQuiz}', '${learner}', now() - interval '1 hour', 0);
      insert into public.quiz_attempts (quiz_id, user_id, started_at, completed_at, total_score, is_passed) values
        ('${openQuiz}', '${manager}', now() - interval '1 day', now() - interval '1 day', 1, true);
    `);
    await db.exec(migration);
    // A second run must succeed too.
    await db.exec(migration);
    }, 60_000);

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.exec(`
      delete from public.quiz_attempt_answers;
      delete from public.quiz_attempt_details;
      delete from public.quiz_attempts where user_id = '${learner}';
    `);
  });

  it('backfilled the percentage of old attempts', async () => {
    const { rows } = await db.query<{ max_score: number; score_percentage: string; end_reason: string }>(
      `select max_score, score_percentage, end_reason from public.quiz_attempts where user_id = '${manager}'`,
    );
    expect(rows[0]).toMatchObject({ max_score: 1, end_reason: 'submitted' });
    expect(Number(rows[0].score_percentage)).toBe(100);
  });

  it('reuses the open attempt and keeps its original deadline', async () => {
    const first = await start();
    const second = await start();
    expect(second.id).toBe(first.id);
    expect(second.expires_at).toBe(first.expires_at);
    const minutes = (new Date(first.expires_at).getTime() - new Date(first.started_at).getTime()) / 60000;
    expect(minutes).toBe(10);
  });

  it('allows only one open attempt per learner and quiz', async () => {
    await start();
    await expect(db.query(
      `insert into public.quiz_attempts (quiz_id, user_id) values ('${timedQuiz}', '${learner}')`,
    )).rejects.toThrow();
  });

  it('has no deadline for quizzes without a time limit', async () => {
    const attempt = await start(openQuiz);
    expect(attempt.expires_at).toBeNull();
  });

  it('stores a weighted percentage once, even when the submission is retried', async () => {
    const attempt = await start();
    const first = await submit(attempt.id);
    expect(first).toMatchObject({ status: 'submitted', score: 3, max_score: 4, passed: true, end_reason: 'submitted' });
    expect(Number(first.percentage)).toBe(75);

    const retry = await submit(attempt.id);
    expect(retry.status).toBe('already_submitted');
    expect(Number(retry.percentage)).toBe(75);
    expect(await count('select count(*) as n from public.quiz_attempt_details where attempt_id = $1', [attempt.id])).toBe(2);
    expect(await count('select count(*) as n from public.quiz_attempt_answers')).toBe(1);
  });

  it('accepts a submission inside the 30 second grace period', async () => {
    const attempt = await start();
    await db.query(`update public.quiz_attempts set expires_at = now() - interval '10 seconds' where id = $1`, [attempt.id]);
    expect((await submit(attempt.id)).status).toBe('submitted');
  });

  it('rejects a late submission and closes the attempt with zero points', async () => {
    const attempt = await start();
    await db.query(`update public.quiz_attempts set expires_at = now() - interval '5 minutes' where id = $1`, [attempt.id]);
    const result = await submit(attempt.id);
    expect(result).toMatchObject({ status: 'expired', end_reason: 'expired', score: 0, passed: false });
    expect(await count('select count(*) as n from public.quiz_attempt_details where attempt_id = $1', [attempt.id])).toBe(0);
  });

  it('closes an overdue open attempt and starts a new one', async () => {
    const attempt = await start();
    await db.query(`update public.quiz_attempts set expires_at = now() - interval '5 minutes' where id = $1`, [attempt.id]);
    const next = await start();
    expect(next.id).not.toBe(attempt.id);
    const { rows } = await db.query<{ end_reason: string; is_passed: boolean; total_score: number; max_score: number }>(
      'select end_reason, is_passed, total_score, max_score from public.quiz_attempts where id = $1',
      [attempt.id],
    );
    expect(rows[0]).toEqual({ end_reason: 'expired', is_passed: false, total_score: 0, max_score: 4 });
  });

  it('rejects submissions for another learner', async () => {
    const attempt = await start();
    await expect(db.query(
      `select public.submit_quiz_attempt($1::uuid, '${manager}'::uuid, '[]'::jsonb, 4, 30)`,
      [attempt.id],
    )).rejects.toThrow('Quiz attempt not found');
  });
});

describe('question soft delete (PostgreSQL)', () => {
  it('records delete and restore in the question history', async () => {
    const local = new PGlite();
    await local.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create table public.profiles (id uuid primary key, role text not null);
      create table public.quizzes (id uuid primary key, title text, duration_minutes integer, pass_percentage numeric, is_active boolean);
      create table public.questions (
        id uuid primary key, content text, question_type text, difficulty text, explanation text,
        status text, course_id uuid, chapter_id uuid, lesson_id uuid, generated_for_user_id uuid,
        version integer default 1, updated_by uuid, updated_at timestamptz
      );
      create table public.question_options (id uuid primary key default gen_random_uuid(), question_id uuid, option_text text, is_correct boolean, order_index integer);
      create table public.quiz_questions (quiz_id uuid, question_id uuid, score_weight double precision);
      create table public.quiz_attempts (id uuid primary key default gen_random_uuid(), started_at timestamptz default now(), completed_at timestamptz, total_score double precision, pass_percentage numeric, is_passed boolean, user_id uuid, quiz_id uuid);
      create table public.quiz_attempt_details (id uuid primary key default gen_random_uuid(), answer_text text, is_correct boolean, ai_feedback text, attempt_id uuid, question_id uuid);
      create table public.quiz_attempt_answers (id uuid primary key default gen_random_uuid(), detail_id uuid, option_id uuid);
      create table public.question_history (
        id uuid primary key default gen_random_uuid(), question_id uuid, version integer, action text,
        from_status text, to_status text, actor_id uuid, reason text, snapshot jsonb, created_at timestamptz default now(),
        constraint question_history_action_check check (action in ('created'))
      );
      insert into public.profiles values ('${manager}', 'content_manager'), ('${learner}', 'learner');
      insert into public.questions (id, content, status) values ('${q1}', 'Q1', 'approved');
    `);
    await local.exec(migration);

    const call = (actor: string, deleted: boolean) => local.query<{ version: number; deleted_at: string | null }>(
      'select * from public.set_shared_question_deleted($1::uuid, $2::uuid, $3)',
      [actor, q1, deleted],
    );

    const removed = await call(manager, true);
    expect(removed.rows[0].deleted_at).not.toBeNull();
    await expect(call(manager, true)).rejects.toThrow('already deleted');
    await expect(call(learner, false)).rejects.toThrow('content_manager or admin');

    const restored = await call(manager, false);
    expect(restored.rows[0].deleted_at).toBeNull();
    expect(restored.rows[0].version).toBe(3);

    const { rows } = await local.query<{ action: string }>(
      'select action from public.question_history where question_id = $1 order by version',
      [q1],
    );
    expect(rows.map((row) => row.action)).toEqual(['deleted', 'restored']);
    await local.close();
    }, 60_000);
});
