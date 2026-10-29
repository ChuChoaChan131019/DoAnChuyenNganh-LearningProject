-- Run once before deploying the lesson review API.
alter table public.lessons drop constraint if exists lessons_status_check;
alter table public.lessons add constraint lessons_status_check
  check (status in ('draft', 'in_review', 'approved', 'published'));

alter table public.lessons add column if not exists created_by uuid references public.profiles(id);
alter table public.lessons add column if not exists updated_by uuid references public.profiles(id);
alter table public.lessons add column if not exists updated_at timestamptz not null default now();
alter table public.lessons add column if not exists version integer not null default 1;
alter table public.lessons add column if not exists submitted_by uuid references public.profiles(id);
alter table public.lessons add column if not exists submitted_at timestamptz;
alter table public.lessons add column if not exists reviewed_by uuid references public.profiles(id);
alter table public.lessons add column if not exists reviewed_at timestamptz;
update public.lessons l set created_by = c.created_by
  from public.chapters ch join public.courses c on c.id = ch.course_id
  where l.chapter_id = ch.id and l.created_by is null;

create table if not exists public.lesson_review_events (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete restrict,
  version integer not null,
  action text not null check (action in ('create','edit','submit','approve','return','publish','unpublish')),
  from_status text,
  to_status text not null,
  actor_id uuid not null references public.profiles(id),
  reason text,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists lesson_review_events_lesson_time_idx
  on public.lesson_review_events (lesson_id, created_at desc);
create index if not exists lessons_created_by_idx on public.lessons (created_by);
create index if not exists lessons_review_status_idx on public.lessons (status, submitted_at desc);
alter table public.lesson_review_events enable row level security;
revoke all on public.lesson_review_events from anon, authenticated;
grant select, insert on public.lesson_review_events to service_role;

create or replace function public.guard_lesson_review_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (new.status is distinct from old.status or new.title is distinct from old.title
      or new.content is distinct from old.content or new.code_example is distinct from old.code_example
      or new.estimated_duration_minutes is distinct from old.estimated_duration_minutes)
    and current_setting('app.lesson_review_write', true) is distinct from 'on' then
    raise exception 'Use the lesson review API to change lesson content or status' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists guard_lesson_review_update on public.lessons;
create trigger guard_lesson_review_update before update on public.lessons
  for each row execute function public.guard_lesson_review_update();

create or replace function public.record_lesson_creation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.lesson_review_events (lesson_id,version,action,to_status,actor_id,snapshot)
      values (new.id,new.version,'create',new.status,new.created_by,
        jsonb_build_object('title',new.title,'content',new.content,'code_example',new.code_example,
          'estimated_duration_minutes',new.estimated_duration_minutes));
  end if;
  return new;
end $$;
drop trigger if exists record_lesson_creation on public.lessons;
create trigger record_lesson_creation after insert on public.lessons
  for each row execute function public.record_lesson_creation();

create or replace function public.save_lesson_content(
  p_lesson_id uuid, p_actor_id uuid, p_version integer, p_content jsonb
) returns public.lessons language plpgsql set search_path = '' as $$
declare l public.lessons; new_status text; old_status text;
begin
  select * into l from public.lessons where id = p_lesson_id for update;
  if not found then raise exception 'Lesson not found' using errcode = 'P0002'; end if;
  if l.version <> p_version then raise exception 'Lesson changed; reload and retry' using errcode = '40001'; end if;
  if l.status not in ('draft','approved') then
    raise exception 'This lesson cannot be edited in its current status' using errcode = '40001';
  end if;
  if not exists (select 1 from public.profiles where id = p_actor_id and role in ('admin','content_manager')) then
    raise exception 'Editor is not authorized' using errcode = '42501';
  end if;
  if p_content ? 'title' and length(trim(p_content->>'title')) < 2 then
    raise exception 'Title is required' using errcode = '22023';
  end if;
  new_status := case when l.status = 'approved' then 'draft' else l.status end;
  old_status := l.status;
  perform set_config('app.lesson_review_write', 'on', true);
  update public.lessons set
    title = coalesce(nullif(trim(p_content->>'title'), ''), l.title),
    content = case when p_content ? 'content' then nullif(p_content->>'content','') else l.content end,
    code_example = case when p_content ? 'code_example' then nullif(p_content->>'code_example','') else l.code_example end,
    estimated_duration_minutes = case when p_content ? 'estimated_duration_minutes'
      then (p_content->>'estimated_duration_minutes')::integer else l.estimated_duration_minutes end,
    status = new_status, version = l.version + 1, updated_by = p_actor_id, updated_at = now(),
    reviewed_by = case when new_status = 'draft' then null else l.reviewed_by end,
    reviewed_at = case when new_status = 'draft' then null else l.reviewed_at end
    where id = p_lesson_id returning * into l;
  insert into public.lesson_review_events (lesson_id,version,action,from_status,to_status,actor_id,snapshot)
    values (l.id,l.version,'edit',old_status,
      new_status,p_actor_id,jsonb_build_object('title',l.title,'content',l.content,'code_example',l.code_example,
        'estimated_duration_minutes',l.estimated_duration_minutes));
  return l;
end $$;

create or replace function public.apply_lesson_review_action(
  p_lesson_id uuid, p_actor_id uuid, p_version integer, p_action text, p_reason text default null
) returns public.lessons language plpgsql set search_path = '' as $$
declare l public.lessons; next_status text; role_name text;
begin
  select * into l from public.lessons where id = p_lesson_id for update;
  if not found then raise exception 'Lesson not found' using errcode = 'P0002'; end if;
  if l.version <> p_version then raise exception 'Lesson changed; reload and retry' using errcode = '40001'; end if;
  select role into role_name from public.profiles where id = p_actor_id;
  if role_name not in ('admin','content_manager') or role_name is null then
    raise exception 'Actor is not authorized' using errcode = '42501';
  end if;
  next_status := case
    when l.status = 'draft' and p_action = 'submit' then 'in_review'
    when l.status = 'in_review' and p_action = 'approve' then 'approved'
    when l.status = 'in_review' and p_action = 'return' then 'draft'
    when l.status = 'approved' and p_action = 'publish' then 'published'
    when l.status = 'published' and p_action = 'unpublish' then 'approved'
    else null end;
  if next_status is null then raise exception 'Invalid lesson status transition' using errcode = '40001'; end if;
  if p_action = 'submit' and (length(trim(l.title)) = 0 or length(trim(coalesce(l.content,''))) = 0) then
    raise exception 'Title and content are required for review' using errcode = '22023';
  end if;
  if p_action in ('return','unpublish') and length(trim(coalesce(p_reason,''))) = 0 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;
  if p_action in ('approve','return') and l.created_by = p_actor_id then
    raise exception 'Authors cannot review their own lessons' using errcode = '42501';
  end if;
  perform set_config('app.lesson_review_write', 'on', true);
  update public.lessons set status = next_status, version = l.version + 1,
    updated_by = p_actor_id, updated_at = now(),
    submitted_by = case when p_action = 'submit' then p_actor_id else l.submitted_by end,
    submitted_at = case when p_action = 'submit' then now() else l.submitted_at end,
    reviewed_by = case when p_action in ('approve','return') then p_actor_id else l.reviewed_by end,
    reviewed_at = case when p_action in ('approve','return') then now() else l.reviewed_at end
    where id = p_lesson_id returning * into l;
  insert into public.lesson_review_events (lesson_id,version,action,from_status,to_status,actor_id,reason,snapshot)
    values (l.id,l.version,p_action,case p_action when 'submit' then 'draft' when 'approve' then 'in_review'
      when 'return' then 'in_review' when 'publish' then 'approved' else 'published' end,
      next_status,p_actor_id,nullif(trim(p_reason),''),
      jsonb_build_object('title',l.title,'content',l.content,'code_example',l.code_example,
        'estimated_duration_minutes',l.estimated_duration_minutes));
  return l;
end $$;

revoke all on function public.save_lesson_content(uuid,uuid,integer,jsonb) from public, anon, authenticated;
revoke all on function public.apply_lesson_review_action(uuid,uuid,integer,text,text) from public, anon, authenticated;
grant execute on function public.save_lesson_content(uuid,uuid,integer,jsonb) to service_role;
grant execute on function public.apply_lesson_review_action(uuid,uuid,integer,text,text) to service_role;
