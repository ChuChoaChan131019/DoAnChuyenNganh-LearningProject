import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../../../database/migrations/20261116090000_discussion_reports.sql', import.meta.url),
  'utf8',
);
const reporter = '00000000-0000-4000-8000-000000000001';
const secondReporter = '00000000-0000-4000-8000-000000000002';
const moderator = '00000000-0000-4000-8000-000000000003';
const post = '00000000-0000-4000-8000-000000000004';
const comment = '00000000-0000-4000-8000-000000000005';
let db: PGlite;

async function report(user: string, target: 'post' | 'comment' = 'post') {
  const column = target === 'post' ? 'post_id' : 'comment_id';
  const id = target === 'post' ? post : comment;
  const result = await db.query<{ id: string }>(
    `insert into public.discussion_reports(${column}, reporter_id, reason)
      values ($1, $2, 'Nội dung cần được xem xét') returning id`,
    [id, user],
  );
  return result.rows[0].id;
}

async function resolve(id: string, decision: string) {
  const result = await db.query<{ status: string; moderator_id: string; resolved_at: string }>(
    'select status, moderator_id, resolved_at from public.resolve_discussion_report($1,$2,$3,$4)',
    [id, moderator, decision, 'Lý do xử lý đã được xác minh'],
  );
  return result.rows[0];
}

describe('D04 discussion reports migration', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table public.profiles(id uuid primary key);
      create table public.discussion_posts(
        id uuid primary key, status text not null default 'visible',
        updated_at timestamptz default now(), deleted_at timestamptz
      );
      create table public.discussion_comments(
        id uuid primary key, post_id uuid references public.discussion_posts(id),
        status text not null default 'visible', updated_at timestamptz default now(),
        deleted_at timestamptz
      );
      insert into public.profiles values ('${reporter}'), ('${secondReporter}'), ('${moderator}');
      insert into public.discussion_posts(id) values ('${post}');
      insert into public.discussion_comments(id,post_id) values ('${comment}','${post}');
      grant usage on schema public to service_role;
      grant select, update on public.discussion_posts, public.discussion_comments to service_role;
      grant select on public.profiles to service_role;
    `);
    await db.exec(migration);
  });
  afterAll(async () => { await db?.close(); });
  beforeEach(async () => { await db.exec('begin'); });
  afterEach(async () => { await db.exec('rollback'); });

  it('prevents duplicate pending reports per reporter and target', async () => {
    await report(reporter);
    await expect(report(reporter)).rejects.toMatchObject({ code: '23505' });
  });

  it('allows separate post and comment reports', async () => {
    await report(reporter);
    await report(reporter, 'comment');
    expect((await db.query('select count(*)::integer as count from public.discussion_reports')).rows[0])
      .toEqual({ count: 2 });
  });

  it('dismisses one report and allows a new report afterward', async () => {
    const id = await report(reporter);
    expect((await resolve(id, 'dismissed')).status).toBe('dismissed');
    await report(reporter);
    expect((await db.query('select status from public.discussion_posts')).rows[0])
      .toEqual({ status: 'visible' });
  });

  it.each(['hidden', 'removed'])('%s hides content and closes all pending reports', async (decision) => {
    const first = await report(reporter);
    await report(secondReporter);
    const result = await resolve(first, decision);
    expect(result.status).toBe(decision);
    expect(result.moderator_id).toBe(moderator);
    expect(result.resolved_at).toBeTruthy();
    expect((await db.query('select status from public.discussion_posts')).rows[0])
      .toEqual({ status: decision });
    expect((await db.query('select distinct status from public.discussion_reports')).rows)
      .toEqual([{ status: decision }]);
    await expect(resolve(first, 'dismissed')).rejects.toMatchObject({ code: 'P0001' });
  });

  it('changes the comment without hiding its parent post', async () => {
    const id = await report(reporter, 'comment');
    await resolve(id, 'hidden');
    expect((await db.query('select status from public.discussion_comments')).rows[0])
      .toEqual({ status: 'hidden' });
    expect((await db.query('select status from public.discussion_posts')).rows[0])
      .toEqual({ status: 'visible' });
  });

  it('restricts direct report access and function execution to the backend role', async () => {
    const permissions = await db.query(`
      select has_table_privilege('authenticated', 'public.discussion_reports', 'select') as can_read,
        has_function_privilege('authenticated',
          'public.resolve_discussion_report(uuid,uuid,text,text)', 'execute') as can_resolve
    `);
    expect(permissions.rows[0]).toEqual({ can_read: false, can_resolve: false });
    await db.exec('set local role service_role');
    const id = await report(reporter);
    expect((await resolve(id, 'dismissed')).status).toBe('dismissed');
  });
});
