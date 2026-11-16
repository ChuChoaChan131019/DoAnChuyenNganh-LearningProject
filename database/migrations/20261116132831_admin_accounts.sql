-- FR-44: Auth remains the authority for email/name and bans. Its trigger updates
-- the searchable profile and audit log in the same transaction as the Auth API.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text not null default '',
  add column if not exists disabled_at timestamptz,
  add column if not exists revoked_before timestamptz;

update public.profiles p set email = lower(u.email),
  full_name = coalesce(u.raw_user_meta_data->>'full_name', ''),
  disabled_at = case when u.banned_until > now() then now() else null end
from auth.users u where u.id = p.id;

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_created_id_idx on public.profiles(created_at desc, id);

alter table public.profiles enable row level security;
drop policy if exists "Users can update own profile" on public.profiles;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

create table public.account_admin_events (
  id uuid primary key,
  actor_id uuid not null,
  account_id uuid not null,
  action text not null check (action in ('create', 'update', 'disable', 'restore')),
  before_data jsonb,
  after_data jsonb not null,
  created_at timestamptz not null default now()
);
create index account_admin_events_account_time_idx
  on public.account_admin_events(account_id, created_at desc);
alter table public.account_admin_events enable row level security;
revoke all on public.account_admin_events from public, anon, authenticated, service_role;
grant select on public.account_admin_events to service_role;

-- Trigger functions need elevated privileges to maintain profiles from auth.users.
-- Keep them private, with a fixed search_path and no client EXECUTE privilege.
create or replace function private.sync_account_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  operation jsonb;
  actor uuid;
  action_name text;
  target_role text;
  previous_profile jsonb;
  becoming_disabled boolean;
begin
  if tg_op = 'UPDATE' and new.email is not distinct from old.email
    and new.raw_user_meta_data is not distinct from old.raw_user_meta_data
    and new.raw_app_meta_data is not distinct from old.raw_app_meta_data
    and new.banned_until is not distinct from old.banned_until then
    return new;
  end if;
  -- GoTrue writes app metadata, user metadata and ban state in separate UPDATEs
  -- within one transaction. Deferred execution must read the final Auth row.
  select u.* into new from auth.users u where u.id = new.id;
  if not found then return null; end if;
  operation := new.raw_app_meta_data->'admin_account_operation';
  select role into target_role from public.profiles where id = new.id;
  select jsonb_build_object('email', p.email, 'full_name', p.full_name,
      'role', p.role, 'disabled_at', p.disabled_at) into previous_profile
      from public.profiles p where p.id = new.id;
  becoming_disabled := coalesce(new.banned_until > now(), false);

  if operation is not null and not exists (select 1 from public.account_admin_events
      where id = (operation->>'id')::uuid and account_id = new.id) then
    -- Serialize admin mutations; check the actor again inside the Auth transaction.
    perform pg_catalog.pg_advisory_xact_lock(440016);
    actor := (operation->>'actor_id')::uuid;
    action_name := operation->>'action';
    if not exists (select 1 from public.profiles
      where id = actor and role = 'admin' and disabled_at is null) then
      raise exception 'ADMIN_REQUIRED' using errcode = '42501';
    end if;
    if (target_role is null and action_name is distinct from 'create') or
       (target_role is not null and action_name not in ('update', 'disable', 'restore')) or
       action_name is null then
      raise exception 'INVALID_ACCOUNT_ACTION';
    end if;
    if becoming_disabled and new.id = actor then
      raise exception 'CANNOT_DISABLE_SELF';
    end if;
  else
    operation := null;
  end if;

  if target_role is null then
    -- Public sign-up can never choose a role through user-editable metadata.
    target_role := case when operation is not null then 'content_manager' else 'learner' end;
    insert into public.profiles(id, role, email, full_name, disabled_at)
      values (new.id, target_role, lower(new.email),
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        case when becoming_disabled then now() else null end);
  else
    if becoming_disabled and previous_profile->>'disabled_at' is null
       and target_role = 'admin' then
      perform pg_catalog.pg_advisory_xact_lock(440016);
      if not exists (select 1 from public.profiles
        where id <> new.id and role = 'admin' and disabled_at is null) then
        raise exception 'LAST_ACTIVE_ADMIN';
      end if;
    end if;
    update public.profiles set email = lower(new.email),
      full_name = coalesce(new.raw_user_meta_data->>'full_name', ''),
      disabled_at = case when becoming_disabled then coalesce(disabled_at, now()) else null end,
      revoked_before = case when becoming_disabled then now() else revoked_before end,
      updated_at = now()
    where id = new.id;
  end if;

  if operation is not null then
    insert into public.account_admin_events(id, actor_id, account_id, action, before_data, after_data)
      select (operation->>'id')::uuid, actor, new.id, action_name, previous_profile,
        jsonb_build_object('email', p.email, 'full_name', p.full_name,
          'role', p.role, 'disabled_at', p.disabled_at)
      from public.profiles p where p.id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_account_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create constraint trigger sync_account_profile
after insert or update on auth.users deferrable initially deferred
for each row execute function private.sync_account_profile();

-- Remove the old metadata-role implementation, even though its trigger is gone.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, role) values (new.id, 'learner');
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- This private predicate avoids recursive RLS on profiles. It only answers for
-- auth.uid(), and denies old JWTs even after an account has been restored.
create or replace function private.account_access_allowed()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = (select auth.uid())
    and p.disabled_at is null and (p.revoked_before is null or
      to_timestamp(coalesce((select auth.jwt())->>'iat', '0')::double precision) > p.revoked_before));
$$;
revoke all on function private.account_access_allowed() from public, anon;
grant execute on function private.account_access_allowed() to authenticated, service_role;

-- Restrictive policies combine with existing ownership/content policies; they
-- grant no additional access and do not affect the service-role backend.
do $$ declare t record;
begin
  for t in select schemaname, tablename from pg_tables
    where (schemaname = 'public' and rowsecurity)
       or (schemaname = 'storage' and tablename = 'objects' and rowsecurity)
  loop
    execute format('create policy account_must_be_active on %I.%I as restrictive for all to authenticated using ((select private.account_access_allowed())) with check ((select private.account_access_allowed()))', t.schemaname, t.tablename);
  end loop;
end $$;

-- Server-only SQL search: filters apply before pagination and counts cover all rows.
create function public.list_admin_accounts(p_search text default '', p_role text default 'all',
  p_status text default 'all', p_limit integer default 20, p_offset integer default 0)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with filtered as (
    select id, email, full_name, role, disabled_at, created_at, updated_at
    from public.profiles
    where email is not null
      and (p_search = '' or position(lower(p_search) in lower(email)) > 0
        or position(lower(p_search) in lower(full_name)) > 0)
      and (p_role = 'all' or role = p_role)
      and (p_status = 'all' or (p_status = 'active' and disabled_at is null)
        or (p_status = 'disabled' and disabled_at is not null))
  ), page as (
    select * from filtered order by created_at desc, id
      limit greatest(1, least(p_limit, 100)) offset greatest(p_offset, 0)
  )
  select jsonb_build_object('items', coalesce((select jsonb_agg(page order by created_at desc, id) from page), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'stats', (select jsonb_build_object('total', count(*),
      'active', count(*) filter (where disabled_at is null),
      'disabled', count(*) filter (where disabled_at is not null))
      from public.profiles where email is not null));
$$;
revoke all on function public.list_admin_accounts(text,text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.list_admin_accounts(text,text,text,integer,integer) to service_role;
notify pgrst, 'reload schema';
commit;
