-- Deterministic lesson validation and self-approval workflow.
-- Validation is computed by the backend, then recorded atomically with an
-- immutable audit event. Only the service role can access these records.

create table if not exists public.lesson_validation_runs (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  lesson_version integer not null check (lesson_version > 0),
  status text not null check (status in ('passed', 'failed')),
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  validator_version text not null check (length(trim(validator_version)) > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists lesson_validation_runs_lesson_time_idx
  on public.lesson_validation_runs (lesson_id, created_at desc);
create index if not exists lesson_validation_runs_lesson_version_idx
  on public.lesson_validation_runs (lesson_id, lesson_version, status);
create index if not exists lesson_validation_runs_created_by_idx
  on public.lesson_validation_runs (created_by);

alter table public.lesson_validation_runs enable row level security;
revoke all on public.lesson_validation_runs from public, anon, authenticated;
grant select, insert on public.lesson_validation_runs to service_role;

alter table public.lesson_review_events
  drop constraint if exists lesson_review_events_action_check;
alter table public.lesson_review_events
  add constraint lesson_review_events_action_check
  check (action in (
    'create', 'edit', 'validate', 'approve', 'publish', 'unpublish',
    'restore', 'submit', 'return', 'workflow_migration'
  ));
create index if not exists lesson_review_events_actor_idx
  on public.lesson_review_events (actor_id)
  where actor_id is not null;

create or replace function public.record_lesson_validation(
  p_lesson_id uuid,
  p_actor_id uuid,
  p_version integer,
  p_errors jsonb,
  p_warnings jsonb,
  p_validator_version text
) returns public.lesson_validation_runs
language plpgsql
set search_path = ''
as $$
declare
  l public.lessons;
  validation_run public.lesson_validation_runs;
  validation_status text;
begin
  if jsonb_typeof(p_errors) is distinct from 'array'
     or jsonb_typeof(p_warnings) is distinct from 'array' then
    raise exception 'Validation issues must be JSON arrays' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_validator_version, ''))) = 0 then
    raise exception 'Validator version is required' using errcode = '22023';
  end if;

  select * into l from public.lessons where id = p_lesson_id for update;
  if not found then
    raise exception 'Lesson not found' using errcode = 'P0002';
  end if;
  if l.version <> p_version then
    raise exception 'Lesson changed; reload and retry' using errcode = '40001';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_actor_id and role in ('admin', 'content_manager')
  ) then
    raise exception 'Actor is not authorized' using errcode = '42501';
  end if;

  validation_status := case when jsonb_array_length(p_errors) = 0 then 'passed' else 'failed' end;
  insert into public.lesson_validation_runs
    (lesson_id, lesson_version, status, errors, warnings, validator_version, created_by)
  values
    (l.id, l.version, validation_status, p_errors, p_warnings, trim(p_validator_version), p_actor_id)
  returning * into validation_run;

  insert into public.lesson_review_events
    (lesson_id, version, action, from_status, to_status, actor_id, reason, snapshot)
  values
    (l.id, l.version, 'validate', l.status, l.status, p_actor_id,
     case when validation_status = 'passed'
       then format('Validation passed with %s warning(s)', jsonb_array_length(p_warnings))
       else format('Validation failed with %s error(s)', jsonb_array_length(p_errors))
     end,
     jsonb_build_object(
       'title', l.title,
       'content', l.content,
       'code_example', l.code_example,
       'estimated_duration_minutes', l.estimated_duration_minutes,
       'validation_run_id', validation_run.id,
       'errors', p_errors,
       'warnings', p_warnings
     ));

  return validation_run;
end
$$;

create or replace function public.apply_lesson_review_action(
  p_lesson_id uuid,
  p_actor_id uuid,
  p_version integer,
  p_action text,
  p_reason text default null
) returns public.lessons
language plpgsql
set search_path = ''
as $$
declare
  l public.lessons;
  next_status text;
  role_name text;
begin
  select * into l from public.lessons where id = p_lesson_id for update;
  if not found then raise exception 'Lesson not found' using errcode = 'P0002'; end if;
  if l.version <> p_version then
    raise exception 'Lesson changed; reload and retry' using errcode = '40001';
  end if;

  select role into role_name from public.profiles where id = p_actor_id;
  if role_name not in ('admin', 'content_manager') or role_name is null then
    raise exception 'Actor is not authorized' using errcode = '42501';
  end if;

  next_status := case
    when l.status = 'draft' and p_action = 'approve' then 'approved'
    when l.status = 'approved' and p_action = 'publish' then 'published'
    when l.status = 'published' and p_action = 'unpublish' then 'approved'
    else null
  end;
  if next_status is null then
    raise exception 'Invalid lesson status transition' using errcode = '40001';
  end if;
  if p_action = 'approve' and not exists (
    select 1 from public.lesson_validation_runs
    where lesson_id = l.id and lesson_version = l.version and status = 'passed'
  ) then
    raise exception 'Run lesson validation and resolve all errors before approval' using errcode = '22023';
  end if;
  if p_action = 'unpublish' and length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;

  perform set_config('app.lesson_review_write', 'on', true);
  update public.lessons set
    status = next_status,
    version = l.version + 1,
    updated_by = p_actor_id,
    updated_at = now(),
    reviewed_by = case when p_action = 'approve' then p_actor_id else l.reviewed_by end,
    reviewed_at = case when p_action = 'approve' then now() else l.reviewed_at end
  where id = p_lesson_id
  returning * into l;

  insert into public.lesson_review_events
    (lesson_id, version, action, from_status, to_status, actor_id, reason, snapshot)
  values
    (l.id, l.version, p_action,
     case p_action when 'approve' then 'draft' when 'publish' then 'approved' else 'published' end,
     next_status, p_actor_id, nullif(trim(p_reason), ''),
     jsonb_build_object(
       'title', l.title,
       'content', l.content,
       'code_example', l.code_example,
       'estimated_duration_minutes', l.estimated_duration_minutes
     ));
  return l;
end
$$;

create or replace function public.restore_lesson_version(
  p_lesson_id uuid,
  p_actor_id uuid,
  p_current_version integer,
  p_source_version integer
) returns public.lessons
language plpgsql
set search_path = ''
as $$
declare
  l public.lessons;
  source_snapshot jsonb;
  role_name text;
  old_status text;
begin
  select * into l from public.lessons where id = p_lesson_id for update;
  if not found then raise exception 'Lesson not found' using errcode = 'P0002'; end if;
  if l.version <> p_current_version then
    raise exception 'Lesson changed; reload and retry' using errcode = '40001';
  end if;
  if l.status = 'published' then
    raise exception 'Unpublish the lesson before restoring a version' using errcode = '40001';
  end if;
  select role into role_name from public.profiles where id = p_actor_id;
  if role_name not in ('admin', 'content_manager') or role_name is null then
    raise exception 'Actor is not authorized' using errcode = '42501';
  end if;

  select snapshot into source_snapshot
  from public.lesson_review_events
  where lesson_id = p_lesson_id and version = p_source_version
  order by created_at desc
  limit 1;
  if source_snapshot is null then
    raise exception 'Lesson version not found' using errcode = 'P0002';
  end if;

  old_status := l.status;
  perform set_config('app.lesson_review_write', 'on', true);
  update public.lessons set
    title = source_snapshot->>'title',
    content = nullif(source_snapshot->>'content', ''),
    code_example = nullif(source_snapshot->>'code_example', ''),
    estimated_duration_minutes = coalesce(
      (source_snapshot->>'estimated_duration_minutes')::integer,
      l.estimated_duration_minutes
    ),
    status = 'draft',
    version = l.version + 1,
    updated_by = p_actor_id,
    updated_at = now(),
    reviewed_by = null,
    reviewed_at = null
  where id = p_lesson_id
  returning * into l;

  insert into public.lesson_review_events
    (lesson_id, version, action, from_status, to_status, actor_id, reason, snapshot)
  values
    (l.id, l.version, 'restore', old_status, 'draft', p_actor_id,
     format('Restored from version %s', p_source_version),
     jsonb_build_object(
       'title', l.title,
       'content', l.content,
       'code_example', l.code_example,
       'estimated_duration_minutes', l.estimated_duration_minutes,
       'restored_from_version', p_source_version
     ));
  return l;
end
$$;

revoke all on function public.record_lesson_validation(uuid, uuid, integer, jsonb, jsonb, text)
  from public, anon, authenticated;
revoke all on function public.apply_lesson_review_action(uuid, uuid, integer, text, text)
  from public, anon, authenticated;
revoke all on function public.restore_lesson_version(uuid, uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.record_lesson_validation(uuid, uuid, integer, jsonb, jsonb, text)
  to service_role;
grant execute on function public.apply_lesson_review_action(uuid, uuid, integer, text, text)
  to service_role;
grant execute on function public.restore_lesson_version(uuid, uuid, integer, integer)
  to service_role;
