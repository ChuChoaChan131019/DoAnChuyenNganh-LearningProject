import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../../../database/migrations/20261116090000_discussion_reports.sql', import.meta.url),
  'utf8',
);
const notificationMigration = readFileSync(
  new URL('../../../../database/migrations/20261116151251_discussion_removal_notifications.sql', import.meta.url), 'utf8',
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
        author_id uuid, title text default 'Bài gốc', content text default 'Nội dung bài',
        updated_at timestamptz default now(), deleted_at timestamptz
      );
      create table public.discussion_comments(
        id uuid primary key, post_id uuid references public.discussion_posts(id),
        author_id uuid, content text default 'Nội dung bình luận',
        status text not null default 'visible', updated_at timestamptz default now(),
        deleted_at timestamptz
      );
      insert into public.profiles values ('${reporter}'), ('${secondReporter}'), ('${moderator}');
      insert into public.discussion_posts(id,author_id) values ('${post}','${reporter}');
      insert into public.discussion_comments(id,post_id,author_id) values ('${comment}','${post}','${secondReporter}');
      grant usage on schema public to service_role;
      grant select, update on public.discussion_posts, public.discussion_comments to service_role;
      grant select on public.profiles to service_role;
    `);
    await db.exec(migration);
    await db.exec(notificationMigration);
    await db.exec(readFileSync(new URL('../../../../database/migrations/20261116151806_discussion_hidden_notifications.sql', import.meta.url), 'utf8'));
    await db.exec(readFileSync(new URL('../../../../database/migrations/20261116152416_restore_hidden_discussion.sql', import.meta.url), 'utf8'));
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

  it.each(['hidden', 'removed'])('%s closes all reports of a comment without changing its parent post', async (decision) => {
    const id = await report(reporter, 'comment');
    await report(secondReporter, 'comment');
    await report(reporter, 'post');
    await resolve(id, decision);
    expect((await db.query('select status from public.discussion_comments')).rows[0])
      .toEqual({ status: decision });
    expect((await db.query('select status from public.discussion_posts')).rows[0])
      .toEqual({ status: 'visible' });
    expect((await db.query('select distinct status from public.discussion_reports where comment_id is not null')).rows)
      .toEqual([{ status: decision }]);
    expect((await db.query('select status from public.discussion_reports where post_id is not null')).rows)
      .toEqual([{ status: 'pending' }]);
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

  it.each([
    ['post', 'removed'], ['comment', 'removed'], ['post', 'hidden'], ['comment', 'hidden'],
  ] as const)('notifies only the %s author once for %s', async (target, decision) => {
    const id = await report(reporter, target);
    await report(secondReporter, target);
    await db.exec('set local role service_role');
    await resolve(id, decision);
    const rows = (await db.query('select recipient_id, target_type, decision, reason, read_at from public.discussion_notifications')).rows;
    expect(rows).toEqual([{
      recipient_id: target === 'post' ? reporter : secondReporter,
      target_type: target, decision, reason: 'Lý do xử lý đã được xác minh', read_at: null,
    }]);
  });

  it.each(['dismissed'])('does not notify for %s', async (decision) => {
    await resolve(await report(reporter), decision);
    expect((await db.query('select * from public.discussion_notifications')).rows).toEqual([]);
  });

  it('rolls back notifications together with moderation', async () => {
    const id = await report(reporter);
    await db.exec('savepoint moderation');
    await resolve(id, 'removed');
    await db.exec('rollback to moderation');
    expect((await db.query('select * from public.discussion_notifications')).rows).toEqual([]);
    expect((await db.query('select status from public.discussion_posts')).rows).toEqual([{ status: 'visible' }]);
  });

  it('denies direct client access to notifications', async () => {
    expect((await db.query(`select
      has_table_privilege('authenticated','public.discussion_notifications','select') as can_read,
      has_table_privilege('authenticated','public.discussion_notifications','insert') as can_insert,
      has_column_privilege('authenticated','public.discussion_notifications','read_at','update') as can_update
    `)).rows).toEqual([{ can_read: false, can_insert: false, can_update: false }]);
  });

  async function restore(id: string) {
    return db.query('select status, restored_at, restored_by, restoration_reason from public.restore_hidden_discussion_report($1,$2,$3)',
      [id, moderator, 'Khôi phục do đã xác minh nội dung']);
  }

  it.each(['post', 'comment'] as const)('restores hidden %s and records all related reports without changing the original decision', async target => {
    const id = await report(reporter, target);
    await report(secondReporter, target);
    await resolve(id, 'hidden');
    await db.exec('set local role service_role');
    const result = await restore(id);
    expect(result.rows[0]).toMatchObject({ status: 'hidden', restored_by: moderator, restoration_reason: 'Khôi phục do đã xác minh nội dung' });
    expect(result.rows[0].restored_at).toBeTruthy();
    const table = target === 'post' ? 'discussion_posts' : 'discussion_comments';
    expect((await db.query(`select status from public.${table}`)).rows).toEqual([{ status: 'visible' }]);
    expect((await db.query('select count(*)::int as count from public.discussion_reports where restored_at is not null')).rows).toEqual([{ count: 2 }]);
    await expect(restore(id)).rejects.toMatchObject({ code: 'P0001' });
  });

  it.each(['pending', 'dismissed', 'removed'])('rejects restoration of %s reports', async status => {
    const id = await report(reporter);
    if (status !== 'pending') await resolve(id, status);
    await expect(restore(id)).rejects.toMatchObject({ code: 'P0001' });
  });

  it('does not restore content deleted by its author', async () => {
    const id = await report(reporter);
    await resolve(id, 'hidden');
    await db.exec('update public.discussion_posts set deleted_at = now()');
    await expect(restore(id)).rejects.toMatchObject({ code: 'P0001' });
  });

  it('allows reporting restored content while preserving history', async () => {
    const first = await report(reporter);
    await resolve(first, 'hidden');
    await restore(first);
    const next = await report(reporter);
    // Separate moderation requests have different transaction timestamps.
    await db.exec("update public.discussion_notifications set created_at = created_at - interval '1 second'");
    await resolve(next, 'removed');
    expect((await db.query('select count(*)::int as count from public.discussion_notifications')).rows).toEqual([{ count: 2 }]);
    expect((await db.query('select status, restored_at is not null as restored from public.discussion_reports where id=$1', [first])).rows).toEqual([{ status: 'hidden', restored: true }]);
  });

  it('blocks direct client restoration', async () => {
    expect((await db.query("select has_function_privilege('authenticated','public.restore_hidden_discussion_report(uuid,uuid,text)','execute') as allowed")).rows).toEqual([{ allowed: false }]);
  });
});
