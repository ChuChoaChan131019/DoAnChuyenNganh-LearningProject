-- Remove the submit-for-review step. Existing in_review lessons return to draft
-- with a system audit entry so they can be approved through the new flow.
alter table public.lesson_review_events drop constraint if exists lesson_review_events_action_check;
alter table public.lesson_review_events add constraint lesson_review_events_action_check
  check (action in ('create','edit','submit','approve','return','publish','unpublish','workflow_migration'));
alter table public.lesson_review_events alter column actor_id drop not null;

select set_config('app.lesson_review_write', 'on', true);
with changed as (
  update public.lessons set status = 'draft', version = version + 1,
    updated_at = now(), submitted_by = null, submitted_at = null,
    reviewed_by = null, reviewed_at = null
  where status = 'in_review'
  returning id, version, title, content, code_example, estimated_duration_minutes
)
insert into public.lesson_review_events
  (lesson_id, version, action, from_status, to_status, actor_id, reason, snapshot)
select id, version, 'workflow_migration', 'in_review', 'draft', null,
  'Removed the submit-for-review step',
  jsonb_build_object('title', title, 'content', content, 'code_example', code_example,
    'estimated_duration_minutes', estimated_duration_minutes)
from changed;

alter table public.lessons drop constraint if exists lessons_status_check;
alter table public.lessons add constraint lessons_status_check
  check (status in ('draft', 'approved', 'published'));

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
    when l.status = 'draft' and p_action = 'approve' then 'approved'
    when l.status = 'approved' and p_action = 'publish' then 'published'
    when l.status = 'published' and p_action = 'unpublish' then 'approved'
    else null end;
  if next_status is null then raise exception 'Invalid lesson status transition' using errcode = '40001'; end if;
  if p_action = 'approve' and (length(trim(l.title)) = 0 or length(trim(coalesce(l.content,''))) = 0) then
    raise exception 'Title and content are required for approval' using errcode = '22023';
  end if;
  if p_action = 'unpublish' and length(trim(coalesce(p_reason,''))) = 0 then
    raise exception 'A reason is required' using errcode = '22023';
  end if;
  if p_action = 'approve' and l.created_by = p_actor_id then
    raise exception 'Authors cannot approve their own lessons' using errcode = '42501';
  end if;
  perform set_config('app.lesson_review_write', 'on', true);
  update public.lessons set status = next_status, version = l.version + 1,
    updated_by = p_actor_id, updated_at = now(),
    reviewed_by = case when p_action = 'approve' then p_actor_id else l.reviewed_by end,
    reviewed_at = case when p_action = 'approve' then now() else l.reviewed_at end
    where id = p_lesson_id returning * into l;
  insert into public.lesson_review_events
    (lesson_id,version,action,from_status,to_status,actor_id,reason,snapshot)
  values (l.id,l.version,p_action,
    case p_action when 'approve' then 'draft' when 'publish' then 'approved' else 'published' end,
    next_status,p_actor_id,nullif(trim(p_reason),''),
    jsonb_build_object('title',l.title,'content',l.content,'code_example',l.code_example,
      'estimated_duration_minutes',l.estimated_duration_minutes));
  return l;
end $$;

revoke all on function public.apply_lesson_review_action(uuid,uuid,integer,text,text)
  from public, anon, authenticated;
grant execute on function public.apply_lesson_review_action(uuid,uuid,integer,text,text) to service_role;
