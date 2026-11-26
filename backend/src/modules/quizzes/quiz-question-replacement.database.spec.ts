import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../../../database/migrations/20261126110000_atomic_quiz_question_replacement.sql', import.meta.url),
  'utf8',
);
const quiz = '00000000-0000-4000-8000-000000000010';
const first = '00000000-0000-4000-8000-000000000020';
const second = '00000000-0000-4000-8000-000000000021';
const deleted = '00000000-0000-4000-8000-000000000022';
const otherCourse = '00000000-0000-4000-8000-000000000099';
const course = '00000000-0000-4000-8000-000000000098';
const wrongChapter = '00000000-0000-4000-8000-000000000097';

describe('atomic quiz question replacement (PostgreSQL)', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table public.quizzes (
        id uuid primary key, is_active boolean not null, title text not null,
        course_id uuid, chapter_id uuid, duration_minutes integer,
        pass_percentage numeric, quiz_type text, shuffle_questions boolean, shuffle_options boolean,
        is_required boolean default true, counts_toward_progress boolean default true
      );
      create table public.questions (id uuid primary key, status text not null, deleted_at timestamptz, course_id uuid);
      create table public.chapters (id uuid primary key, course_id uuid not null);
      create table public.quiz_questions (
        quiz_id uuid references public.quizzes(id),
        question_id uuid references public.questions(id),
        score_weight double precision not null,
        primary key (quiz_id, question_id)
      );
      insert into public.quizzes (id, is_active, title, pass_percentage, course_id) values ('${quiz}', true, 'Original', 50, '${course}');
      insert into public.chapters values ('${wrongChapter}', '${otherCourse}');
      insert into public.questions values
        ('${first}', 'approved', null, '${course}'),
        ('${second}', 'approved', null, '${course}'),
        ('${deleted}', 'approved', now(), '${course}'),
        ('${otherCourse}', 'approved', null, '${otherCourse}');
    `);
    await db.exec(migration);
    await db.exec(migration);
  });

  afterAll(async () => { await db.close(); });

  beforeEach(async () => {
    await db.exec(`
      delete from public.quiz_questions;
      insert into public.quiz_questions (quiz_id, question_id, score_weight) values ('${quiz}', '${first}', 1);
      update public.quizzes set is_active = true, title = 'Original', pass_percentage = 50 where id = '${quiz}';
    `);
  });

  async function replace(questions: Array<{ question_id: string; score_weight: number }>, settings: Record<string, unknown> | null = null) {
    await db.query('select public.replace_quiz_questions($1::uuid, $2::jsonb, $3::jsonb)', [quiz, JSON.stringify(questions), settings ? JSON.stringify(settings) : null]);
  }

  async function state() {
    const quizRow = await db.query<{ is_active: boolean; title: string; pass_percentage: string }>(
      'select is_active, title, pass_percentage from public.quizzes where id = $1', [quiz],
    );
    const links = await db.query<{ question_id: string; score_weight: number }>(
      'select question_id, score_weight from public.quiz_questions where quiz_id = $1 order by question_id', [quiz],
    );
    return { active: quizRow.rows[0].is_active, title: quizRow.rows[0].title, pass: Number(quizRow.rows[0].pass_percentage), links: links.rows };
  }

  it('replaces all links and archives the quiz together', async () => {
    await replace([{ question_id: second, score_weight: 3 }], { title: 'Updated', pass_score: 0 });
    expect(await state()).toEqual({ active: false, title: 'Updated', pass: 0, links: [{ question_id: second, score_weight: 3 }] });
  });

  it('restores the old links and publication state if an insert fails', async () => {
    await db.exec(`
      create or replace function public.reject_second_question() returns trigger language plpgsql as $$
      begin
        if new.question_id = '${second}'::uuid then raise exception 'insert failed'; end if;
        return new;
      end;
      $$;
      create trigger reject_question before insert on public.quiz_questions
      for each row execute function public.reject_second_question();
    `);
    try {
      await expect(replace([{ question_id: second, score_weight: 3 }], { title: 'Updated', pass_score: 0 })).rejects.toThrow('insert failed');
      expect(await state()).toEqual({ active: true, title: 'Original', pass: 50, links: [{ question_id: first, score_weight: 1 }] });
    } finally {
      await db.exec('drop trigger reject_question on public.quiz_questions; drop function public.reject_second_question();');
    }
  });

  it('rejects a deleted question that was not already in the quiz', async () => {
    await expect(replace([{ question_id: deleted, score_weight: 1 }])).rejects.toThrow('Deleted questions');
    expect(await state()).toEqual({ active: true, title: 'Original', pass: 50, links: [{ question_id: first, score_weight: 1 }] });
  });

  it('stores question order and the editable quiz settings', async () => {
    await replace([
      { question_id: second, score_weight: 1 },
      { question_id: first, score_weight: 2 },
    ], { description: 'New description', is_required: false, counts_toward_progress: false });
    const { rows: links } = await db.query<{ question_id: string; order_index: number }>(
      'select question_id, order_index from public.quiz_questions where quiz_id = $1 order by order_index', [quiz],
    );
    expect(links).toEqual([{ question_id: second, order_index: 0 }, { question_id: first, order_index: 1 }]);
    const { rows: settings } = await db.query<{ description: string; is_required: boolean; counts_toward_progress: boolean }>(
      'select description, is_required, counts_toward_progress from public.quizzes where id = $1', [quiz],
    );
    expect(settings[0]).toEqual({ description: 'New description', is_required: false, counts_toward_progress: false });
  });

  it('rejects a question from another course without changing the quiz', async () => {
    await expect(replace([{ question_id: otherCourse, score_weight: 1 }])).rejects.toThrow('another course');
    expect(await state()).toEqual({ active: true, title: 'Original', pass: 50, links: [{ question_id: first, score_weight: 1 }] });
  });

  it('rejects a chapter from another course without changing the quiz', async () => {
    await expect(replace([{ question_id: first, score_weight: 1 }], { chapter_id: wrongChapter }))
      .rejects.toThrow('Chapter belongs to another course');
    expect(await state()).toEqual({ active: true, title: 'Original', pass: 50, links: [{ question_id: first, score_weight: 1 }] });
  });

  it('does not grant browser roles access to the function', async () => {
    const { rows } = await db.query<{ allowed: boolean }>(
      "select has_function_privilege('authenticated', 'public.replace_quiz_questions(uuid,jsonb,jsonb)', 'EXECUTE') as allowed",
    );
    expect(rows[0].allowed).toBe(false);
  });
});
