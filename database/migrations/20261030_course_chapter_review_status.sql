-- Course, chapter, and lesson review use the same persisted status vocabulary.
alter table public.courses
  add column if not exists status text not null default 'draft';
alter table public.chapters
  add column if not exists status text not null default 'draft';

update public.courses set status = 'draft' where status is null;
update public.chapters set status = 'draft' where status is null;
update public.courses set status = 'draft' where status = 'in_review';
update public.chapters set status = 'draft' where status = 'in_review';

alter table public.courses alter column status set default 'draft';
alter table public.courses alter column status set not null;
alter table public.chapters alter column status set default 'draft';
alter table public.chapters alter column status set not null;

alter table public.courses drop constraint if exists courses_status_check;
alter table public.courses add constraint courses_status_check
  check (status in ('draft', 'approved', 'published'));
alter table public.chapters drop constraint if exists chapters_status_check;
alter table public.chapters add constraint chapters_status_check
  check (status in ('draft', 'approved', 'published'));

create index if not exists chapters_course_status_order_idx
  on public.chapters (course_id, status, order_index);
create index if not exists lessons_chapter_status_order_idx
  on public.lessons (chapter_id, status, order_index);
