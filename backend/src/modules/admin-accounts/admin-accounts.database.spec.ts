import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../../../database/migrations/20261116132831_admin_accounts.sql', import.meta.url), 'utf8');
const admin = '00000000-0000-4000-8000-000000000001';
const learner = '00000000-0000-4000-8000-000000000002';
const manager = '00000000-0000-4000-8000-000000000003';
let db: PGlite;
const operation = (action: string, actor = admin) => JSON.stringify({ admin_account_operation: { id: crypto.randomUUID(), actor_id: actor, action } });

describe('FR-44 atomic Auth/profile operations and access controls', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
      create function auth.jwt() returns jsonb language sql as $$ select jsonb_build_object('iat', extract(epoch from now())::bigint) $$;
      grant usage on schema public, auth to authenticated, service_role;
      create table auth.users(id uuid primary key, email text unique,
        raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', banned_until timestamptz);
      create table public.profiles(id uuid primary key, role varchar(20) not null default 'learner',
        failed_login_attempts integer not null default 0, locked_until timestamptz,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now());
      alter table public.profiles enable row level security;
      create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
      create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
      grant all on public.profiles to authenticated, anon, service_role;
      insert into auth.users(id,email) values ('${admin}','admin@example.com'), ('${learner}','learner@example.com');
      insert into public.profiles(id,role) values ('${admin}','admin'), ('${learner}','learner');
    `);
    await db.exec(sql);
  });
  afterAll(async () => { await db?.close(); });
  beforeEach(async () => { await db.exec('begin; set constraints all immediate'); });
  afterEach(async () => { await db.exec('rollback'); });

  it('creates content managers and audit events atomically without storing passwords', async () => {
    await db.query('insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values ($1,$2,$3,$4)',
      [manager, 'manager@example.com', operation('create'), '{"full_name":"Biên soạn"}']);
    expect((await db.query('select role,full_name,email from public.profiles where id=$1', [manager])).rows[0])
      .toEqual({ role: 'content_manager', full_name: 'Biên soạn', email: 'manager@example.com' });
    const events = await db.query<{ action: string; actor_id: string; after_data: unknown }>('select action,actor_id,after_data from public.account_admin_events');
    expect(events.rows[0].actor_id).toBe(admin);
    expect(events.rows[0].action).toBe('create');
    expect(JSON.stringify(events.rows[0].after_data)).not.toContain('password');
  });
  it('ignores role claims supplied during public signup', async () => {
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)',
      [manager, 'attacker@example.com', '{"role":"admin"}']);
    expect((await db.query('select role from public.profiles where id=$1', [manager])).rows[0]).toEqual({ role: 'learner' });
  });
  it('handles GoTrue multi-statement creation and records the final ban state once', async () => {
    await db.exec('set constraints all deferred');
    await db.query('insert into auth.users(id,email) values ($1,$2)', [manager, 'manager@example.com']);
    await db.query('update auth.users set raw_app_meta_data=$1 where id=$2', [operation('create'), manager]);
    await db.query('update auth.users set raw_user_meta_data=$1 where id=$2', ['{"full_name":"Final name"}', manager]);
    await db.exec('set constraints all immediate');
    expect((await db.query('select role,full_name from public.profiles where id=$1',[manager])).rows[0])
      .toEqual({ role: 'content_manager', full_name: 'Final name' });
    await db.exec('set constraints all deferred');
    await db.query('update auth.users set raw_app_meta_data=$1 where id=$2', [operation('disable'), manager]);
    await db.query("update auth.users set banned_until=now()+interval '1 year' where id=$1", [manager]);
    await db.exec('set constraints all immediate');
    const events = (await db.query<{ after_data: { disabled_at: string } }>("select after_data from public.account_admin_events where action='disable'")).rows;
    expect(events).toHaveLength(1);
    expect(events[0].after_data.disabled_at).toBeTruthy();
  });
  it('rejects a non-admin actor and rolls back the Auth row', async () => {
    await db.exec('savepoint attempt');
    await expect(db.query('insert into auth.users(id,email,raw_app_meta_data) values ($1,$2,$3)',
      [manager, 'manager@example.com', operation('create', learner)])).rejects.toThrow('ADMIN_REQUIRED');
    await db.exec('rollback to savepoint attempt');
    expect((await db.query('select id from auth.users where id=$1', [manager])).rows).toHaveLength(0);
  });
  it('keeps roles intact on edit and only audits new admin operations', async () => {
    await db.query('update auth.users set email=$1,raw_user_meta_data=$2,raw_app_meta_data=$3 where id=$4',
      ['changed@example.com', '{"full_name":"Updated","role":"admin"}', operation('update'), learner]);
    await db.query('update auth.users set raw_user_meta_data=$1 where id=$2', ['{"full_name":"Self edit"}', learner]);
    expect((await db.query('select email,full_name,role from public.profiles where id=$1', [learner])).rows[0])
      .toEqual({ email: 'changed@example.com', full_name: 'Self edit', role: 'learner' });
    expect((await db.query('select action from public.account_admin_events')).rows).toEqual([{ action: 'update' }]);
  });
  it('mirrors bans and preserves token revocation after restoration', async () => {
    await db.query("update auth.users set banned_until=now()+interval '100 years',raw_app_meta_data=$1 where id=$2", [operation('disable'), learner]);
    const banned = (await db.query<{ disabled_at: string; revoked_before: string }>('select disabled_at,revoked_before from public.profiles where id=$1', [learner])).rows[0];
    expect(banned.disabled_at).toBeTruthy();
    await db.query('update auth.users set banned_until=null,raw_app_meta_data=$1 where id=$2', [operation('restore'), learner]);
    const restored = (await db.query('select disabled_at,revoked_before from public.profiles where id=$1', [learner])).rows[0];
    expect(restored).toEqual({ disabled_at: null, revoked_before: banned.revoked_before });
  });
  it('prevents self-disable in the transaction', async () => {
    await expect(db.query("update auth.users set banned_until=now()+interval '1 year',raw_app_meta_data=$1 where id=$2", [operation('disable'), admin]))
      .rejects.toThrow('CANNOT_DISABLE_SELF');
  });
  it('protects the last active admin even for an out-of-band Auth ban', async () => {
    await expect(db.query("update auth.users set banned_until=now()+interval '1 year' where id=$1", [admin]))
      .rejects.toThrow('LAST_ACTIVE_ADMIN');
  });
  it('denies profile writes and directory/audit access to authenticated clients', async () => {
    const result = await db.query(`select has_table_privilege('authenticated','public.profiles','update') as profile_write,
      has_table_privilege('authenticated','public.account_admin_events','select') as audit_read,
      has_function_privilege('authenticated','public.list_admin_accounts(text,text,text,integer,integer)','execute') as list,
      has_function_privilege('authenticated','private.sync_account_profile()','execute') as sync`);
    expect(result.rows[0]).toEqual({ profile_write: false, audit_read: false, list: false, sync: false });
  });
  it('blocks a disabled user through restrictive RLS', async () => {
    await db.query("update auth.users set banned_until=now()+interval '1 year',raw_app_meta_data=$1 where id=$2", [operation('disable'), learner]);
    await db.exec(`set local role authenticated; set local "test.uid" = '${learner}'`);
    expect((await db.query('select id from public.profiles')).rows).toHaveLength(0);
  });
  it('filters before pagination, returns real totals, and treats search metacharacters literally', async () => {
    await db.exec('set local role service_role');
    const result = await db.query<{ result: { items: unknown[]; total: number; stats: { total: number } } }>(
      "select public.list_admin_accounts('', 'all', 'all', 1, 1) as result");
    expect(result.rows[0].result.total).toBe(2);
    expect(result.rows[0].result.items).toHaveLength(1);
    expect(result.rows[0].result.stats.total).toBe(2);
    const filtered = await db.query<{ result: { total: number } }>("select public.list_admin_accounts('%', 'all', 'all', 20, 0) as result");
    expect(filtered.rows[0].result.total).toBe(0);
  });
});
