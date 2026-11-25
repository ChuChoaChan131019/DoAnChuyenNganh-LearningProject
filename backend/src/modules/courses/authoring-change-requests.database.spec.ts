import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const migration = readFileSync(new URL(
  '../../../../database/migrations/20261125140000_authoring_change_requests.sql', import.meta.url,
), 'utf8');
const manager = '00000000-0000-4000-8000-000000000001';
const admin = '00000000-0000-4000-8000-000000000002';
const lesson = '00000000-0000-4000-8000-000000000003';
const question = '00000000-0000-4000-8000-000000000004';
let db: PGlite;

describe('admin change requests and author notifications', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create table public.profiles (id uuid primary key, role text not null);
      create table public.lessons (
        id uuid primary key, title text not null, content text, code_example text,
        estimated_duration_minutes integer, status text not null, version integer not null,
        created_by uuid references public.profiles(id), updated_by uuid references public.profiles(id),
        updated_at timestamptz, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz
      );
      create table public.lesson_review_events (
        id uuid primary key default gen_random_uuid(), lesson_id uuid references public.lessons(id),
        version integer not null, action text not null, from_status text, to_status text not null,
        actor_id uuid references public.profiles(id), reason text, snapshot jsonb not null,
        created_at timestamptz not null default now()
      );
      create table public.questions (id uuid primary key, created_by uuid references public.profiles(id));
      create table public.question_history (
        id uuid primary key default gen_random_uuid(), question_id uuid references public.questions(id),
        action text not null, actor_id uuid references public.profiles(id), reason text,
        snapshot jsonb not null
      );
      insert into public.profiles values ('${manager}', 'content_manager'), ('${admin}', 'admin');
      insert into public.lessons values ('${lesson}', 'Bài học', 'Nội dung', null, 10,
        'published', 1, '${manager}', '${manager}', now(), '${admin}', now());
      insert into public.questions values ('${question}', '${manager}');
    `);
    await db.exec(migration);
  });
  afterAll(async () => db?.close());
  beforeEach(async () => db.exec('begin'));
  afterEach(async () => db.exec('rollback'));

  it('moves a published lesson to draft and notifies its editor with the reason', async () => {
    const result = await db.query<{ status: string; version: number }>(
      'select status, version from public.request_lesson_changes($1,$2,1,$3)',
      [lesson, admin, 'Sửa ví dụ C#'],
    );
    expect(result.rows[0]).toEqual({ status: 'draft', version: 2 });
    const notifications = await db.query<{ recipient_id: string; reason: string }>(
      'select recipient_id, reason from public.authoring_notifications where target_id=$1', [lesson],
    );
    expect(notifications.rows).toEqual([{ recipient_id: manager, reason: 'Sửa ví dụ C#' }]);
  });

  it('does not let an admin edit a lesson through the database function', async () => {
    await db.query('update public.lessons set status=$1 where id=$2', ['draft', lesson]);
    await expect(db.query(
      'select * from public.save_lesson_content($1,$2,1,$3::jsonb)',
      [lesson, admin, JSON.stringify({ title: 'Sửa trái quyền' })],
    )).rejects.toMatchObject({ code: '42501' });
  });

  it('notifies the question creator when admin requests a correction', async () => {
    await db.query(
      `insert into public.question_history (question_id, action, actor_id, reason, snapshot)
       values ($1, 'rejected', $2, $3, $4::jsonb)`,
      [question, admin, 'Sửa đáp án', JSON.stringify({ content: 'Câu hỏi A' })],
    );
    const notifications = await db.query<{ recipient_id: string; reason: string }>(
      'select recipient_id, reason from public.authoring_notifications where target_id=$1', [question],
    );
    expect(notifications.rows).toEqual([{ recipient_id: manager, reason: 'Sửa đáp án' }]);
  });

  it('also notifies the creator when an approved question is withdrawn for correction', async () => {
    await db.query(
      `insert into public.question_history (question_id, action, actor_id, reason, snapshot)
       values ($1, 'unapproved', $2, $3, $4::jsonb)`,
      [question, admin, 'Cập nhật lời giải', JSON.stringify({ content: 'Câu hỏi B' })],
    );
    const notifications = await db.query<{ target_type: string; reason: string }>(
      'select target_type, reason from public.authoring_notifications where target_id=$1', [question],
    );
    expect(notifications.rows).toEqual([{ target_type: 'question', reason: 'Cập nhật lời giải' }]);
  });
});
