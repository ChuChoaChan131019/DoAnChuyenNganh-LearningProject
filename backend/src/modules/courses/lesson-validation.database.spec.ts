import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const migration = readFileSync(new URL(
  '../../../../database/migrations/20261118090000_lesson_validation_workflow.sql',
  import.meta.url,
), 'utf8');
const author = '00000000-0000-4000-8000-000000000001';
const lessonId = '00000000-0000-4000-8000-000000000010';
let db: PGlite;

async function record(errors: object[] = [], warnings: object[] = []) {
  return db.query(
    'select * from public.record_lesson_validation($1,$2,1,$3::jsonb,$4::jsonb,$5)',
    [lessonId, author, JSON.stringify(errors), JSON.stringify(warnings), 'test-v1'],
  );
}

async function action(name: 'approve' | 'publish' | 'unpublish', version: number, reason: string | null = null) {
  return db.query<{ status: string; version: number }>(
    'select status, version from public.apply_lesson_review_action($1,$2,$3,$4,$5)',
    [lessonId, author, version, name, reason],
  );
}

describe('lesson validation workflow migration', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table public.profiles (id uuid primary key, role text not null);
      create table public.lessons (
        id uuid primary key,
        title text not null,
        content text,
        code_example text,
        estimated_duration_minutes integer not null default 0,
        status text not null default 'draft',
        version integer not null default 1,
        created_by uuid references public.profiles(id),
        updated_by uuid references public.profiles(id),
        updated_at timestamptz not null default now(),
        reviewed_by uuid references public.profiles(id),
        reviewed_at timestamptz
      );
      create table public.lesson_review_events (
        id uuid primary key default gen_random_uuid(),
        lesson_id uuid not null references public.lessons(id),
        version integer not null,
        action text not null,
        from_status text,
        to_status text not null,
        actor_id uuid references public.profiles(id),
        reason text,
        snapshot jsonb not null,
        created_at timestamptz not null default now()
      );
      insert into public.profiles values ('${author}', 'content_manager');
      insert into public.lessons
        (id,title,content,code_example,estimated_duration_minutes,status,version,created_by,updated_by)
      values
        ('${lessonId}','Vòng lặp','Nội dung hợp lệ có mục tiêu, ví dụ và đủ dài để kiểm tra quy trình duyệt nội dung bài học trong hệ thống. Phần giải thích được bổ sung rõ ràng.','Console.WriteLine(1);',15,'draft',1,'${author}','${author}');
      insert into public.lesson_review_events
        (lesson_id,version,action,to_status,actor_id,snapshot)
      values
        ('${lessonId}',1,'create','draft','${author}',jsonb_build_object('title','Vòng lặp','content','Bản đầu','code_example','Console.WriteLine(0);','estimated_duration_minutes',10));
      grant usage on schema public to service_role;
      grant select, insert, update on public.profiles, public.lessons, public.lesson_review_events to service_role;
    `);
    await db.exec(migration);
  });

  afterAll(async () => db?.close());
  beforeEach(async () => db.exec('begin'));
  afterEach(async () => db.exec('rollback'));

  it('records validation and an immutable audit event together', async () => {
    const result = await record([], [{ code: 'MISSING_EXAMPLE' }]);
    expect(result.rows[0]).toMatchObject({ status: 'passed', lesson_version: 1 });
    const events = await db.query('select action, version from public.lesson_review_events where action=$1', ['validate']);
    expect(events.rows).toEqual([{ action: 'validate', version: 1 }]);
  });

  it('requires a passing validation before approval', async () => {
    await db.exec('savepoint missing_validation');
    await expect(action('approve', 1)).rejects.toMatchObject({ code: '22023' });
    await db.exec('rollback to savepoint missing_validation');
    await record([{ code: 'CONTENT_TOO_SHORT' }]);
    await db.exec('savepoint failed_validation');
    await expect(action('approve', 1)).rejects.toMatchObject({ code: '22023' });
    await db.exec('rollback to savepoint failed_validation');
  });

  it('allows an author to self-approve after validation', async () => {
    await record();
    const result = await db.query<{ status: string; version: number }>(
      'select status, version from public.apply_lesson_review_action($1,$2,1,$3,null)',
      [lessonId, author, 'approve'],
    );
    expect(result.rows[0]).toEqual({ status: 'approved', version: 2 });
  });

  it('requires an unpublish reason and preserves the audit chain', async () => {
    await record();
    await db.query('select public.apply_lesson_review_action($1,$2,1,$3,null)', [lessonId, author, 'approve']);
    await db.query('select public.apply_lesson_review_action($1,$2,2,$3,null)', [lessonId, author, 'publish']);
    await db.exec('savepoint missing_reason');
    await expect(db.query('select public.apply_lesson_review_action($1,$2,3,$3,null)', [lessonId, author, 'unpublish']))
      .rejects.toMatchObject({ code: '22023' });
    await db.exec('rollback to savepoint missing_reason');
    const result = await db.query<{ status: string }>(
      'select status from public.apply_lesson_review_action($1,$2,3,$3,$4)',
      [lessonId, author, 'unpublish', 'Cần cập nhật ví dụ'],
    );
    expect(result.rows[0].status).toBe('approved');
  });

  it('restores an old snapshot as a new draft version', async () => {
    await record();
    await db.query('select public.apply_lesson_review_action($1,$2,1,$3,null)', [lessonId, author, 'approve']);
    const result = await db.query<{ title: string; status: string; version: number }>(
      'select title,status,version from public.restore_lesson_version($1,$2,2,1)',
      [lessonId, author],
    );
    expect(result.rows[0]).toEqual({ title: 'Vòng lặp', status: 'draft', version: 3 });
  });

  it('enables RLS and blocks direct authenticated access', async () => {
    const rls = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where oid='public.lesson_validation_runs'::regclass",
    );
    expect(rls.rows[0].relrowsecurity).toBe(true);
    await db.exec('set local role authenticated');
    await expect(db.query('select * from public.lesson_validation_runs')).rejects.toMatchObject({ code: '42501' });
  });
});
