import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { DiscussionPostsService } from './discussion-posts.service.js';
import type {
  CreateDiscussionPostDto,
  UpdateDiscussionPostDto,
} from './dto/discussion-post.dto.js';

const migration = readFileSync(
  new URL(
    '../../../../database/migrations/20261103143449_discussion_posts.sql',
    import.meta.url,
  ),
  'utf8',
);
const author = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const course = '00000000-0000-4000-8000-000000000003';
const chapter = '00000000-0000-4000-8000-000000000004';
const lesson = '00000000-0000-4000-8000-000000000005';
const otherChapter = '00000000-0000-4000-8000-000000000006';
const missing = '00000000-0000-4000-8000-000000000099';
const body: CreateDiscussionPostDto = {
  lesson_id: lesson,
  post_type: 'question',
  title: 'Question title',
  content: 'Question content with details',
};
let db: PGlite;
let service: DiscussionPostsService;
let postId: string;

// Translate the small PostgREST query surface used by this service into actual
// parameterized PostgreSQL queries. Authorization filters and writes run in SQL;
// no Supabase network requests or credentials are needed.
function from(table: string) {
  const filters: string[] = [];
  const params: unknown[] = [];
  let mode: 'select' | 'insert' | 'update' = 'select';
  let values: Record<string, unknown> = {};
  let fields = '*';
  const param = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const builder = {
    select(selection: string) {
      fields = selection;
      return builder;
    },
    eq(column: string, value: unknown) {
      filters.push(`${column}=${param(value)}`);
      return builder;
    },
    is(column: string, value: unknown) {
      expect(value).toBeNull();
      filters.push(`${column} is null`);
      return builder;
    },
    insert(input: Record<string, unknown>) {
      mode = 'insert';
      values = input;
      return builder;
    },
    update(input: Record<string, unknown>) {
      mode = 'update';
      values = input;
      return builder;
    },
    single: run,
    maybeSingle: run,
  };
  async function run() {
    try {
      let sql: string;
      if (mode === 'insert') {
        sql = `insert into ${table} (${Object.keys(values).join(',')}) values (${Object.values(values).map(param).join(',')}) returning ${fields}`;
      } else if (mode === 'update') {
        sql = `update ${table} set ${Object.entries(values)
          .map(([key, value]) => `${key}=${param(value)}`)
          .join(',')} where ${filters.join(' and ')} returning ${fields}`;
      } else {
        sql = `select ${fields} from ${table}${filters.length ? ` where ${filters.join(' and ')}` : ''}`;
      }
      const result = await db.query(sql, params);
      return { data: result.rows[0] ?? null, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
  return builder;
}

describe('D01 service and migration (isolated PostgreSQL)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table public.profiles(id uuid primary key);
      create table public.courses(id uuid primary key, status text);
      create table public.chapters(id uuid primary key, course_id uuid references public.courses(id), status text);
      create table public.lessons(id uuid primary key, chapter_id uuid references public.chapters(id), status text);
      insert into public.profiles values ('${author}'), ('${other}');
      insert into public.courses values ('${course}', 'published');
      insert into public.chapters values ('${chapter}', '${course}', 'published'), ('${otherChapter}', '${course}', 'published');
      insert into public.lessons values ('${lesson}', '${chapter}', 'published');
      grant usage on schema public to service_role;
      grant select on public.profiles, public.courses, public.chapters, public.lessons to service_role;
    `);
    await db.exec(migration);
    service = new DiscussionPostsService({
      getClient: () => ({ from }),
    } as never);
    postId = (await service.create(body, author)).id;
    await db.exec(migration);
    expect(
      (
        await db.query('select id from public.discussion_posts where id=$1', [
          postId,
        ])
      ).rows,
    ).toHaveLength(1);
  }, 30_000);
  afterAll(async () => {
    await db?.close();
  });
  beforeEach(async () => {
    await db.exec('begin');
  });
  afterEach(async () => {
    await db.exec('rollback');
  });

  it('creates a lesson post using the actual chapter and authenticated author', async () => {
    const post = await service.create(body, author);
    expect(post).toMatchObject({
      chapter_id: chapter,
      lesson_id: lesson,
      author_id: author,
      status: 'visible',
      deleted_at: null,
    });
  });

  it('creates a chapter-only post without a lesson', async () => {
    const { lesson_id: _lesson, ...content } = body;
    expect(
      await service.create({ ...content, chapter_id: chapter }, author),
    ).toMatchObject({ chapter_id: chapter, lesson_id: null });
  });

  it('lets the author edit their own visible post', async () => {
    expect(
      await service.update(postId, { title: 'Updated title' }, author),
    ).toMatchObject({ title: 'Updated title', author_id: author });
  });

  it.each(['title', 'content'])(
    'rejects null %s without changing stored content',
    async (field) => {
      await expect(
        service.update(
          postId,
          { [field]: null } as UpdateDiscussionPostDto,
          author,
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(
        (
          await db.query(
            'select title, content from public.discussion_posts where id=$1',
            [postId],
          )
        ).rows[0],
      ).toEqual({ title: body.title, content: body.content });
    },
  );

  it.each(['courses', 'chapters', 'lessons'])(
    'rejects edits after %s is withdrawn',
    async (table) => {
      await db.query(`update public.${table} set status='draft'`);
      await expect(
        service.update(postId, { title: 'Must not save' }, author),
      ).rejects.toMatchObject({ status: 400 });
      expect(
        (
          await db.query(
            'select title from public.discussion_posts where id=$1',
            [postId],
          )
        ).rows[0],
      ).toEqual({ title: body.title });
      await expect(service.create(body, author)).rejects.toMatchObject({
        status: 400,
      });
    },
  );

  it('rejects another author’s update and deletion at the SQL ownership filter', async () => {
    await expect(
      service.update(postId, { title: 'Must not save' }, other),
    ).rejects.toMatchObject({ status: 404 });
    await expect(service.remove(postId, other)).rejects.toMatchObject({
      status: 404,
    });
    expect(
      (
        await db.query(
          'select title, deleted_at from public.discussion_posts where id=$1',
          [postId],
        )
      ).rows[0],
    ).toEqual({ title: body.title, deleted_at: null });
  });

  it.each(['hidden', 'removed'])(
    'blocks author edits and deletion of a %s post',
    async (status) => {
      await db.query(
        'update public.discussion_posts set status=$1 where id=$2',
        [status, postId],
      );
      await expect(
        service.update(postId, { title: 'Must not save' }, author),
      ).rejects.toMatchObject({ status: 404 });
      await expect(service.remove(postId, author)).rejects.toMatchObject({
        status: 404,
      });
    },
  );

  it('soft-deletes without losing the row, then blocks further edits/deletes', async () => {
    expect(await service.remove(postId, author)).toMatchObject({
      id: postId,
      deleted: true,
    });
    const { rows } = await db.query<{ deleted_at: unknown }>(
      'select deleted_at from public.discussion_posts where id=$1',
      [postId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].deleted_at).not.toBeNull();
    await expect(
      service.update(postId, { title: 'Must not save' }, author),
    ).rejects.toMatchObject({ status: 404 });
    await expect(service.remove(postId, author)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('still lets an author delete their own visible post after withdrawal', async () => {
    await db.query("update public.courses set status='draft'");
    expect(await service.remove(postId, author)).toMatchObject({
      deleted: true,
    });
  });

  it('rejects an empty patch', async () => {
    await expect(service.update(postId, {}, author)).rejects.toMatchObject({
      status: 400,
    });
  });

  it('rejects a nonexistent lesson', async () => {
    await expect(
      service.create({ ...body, lesson_id: missing }, author),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('stores a valid HTTPS resource URL', async () => {
    expect(
      await service.create(
        {
          ...body,
          post_type: 'resource',
          resource_url: 'https://example.com/guide',
        },
        author,
      ),
    ).toMatchObject({
      post_type: 'resource',
      resource_url: 'https://example.com/guide',
    });
  });

  it.each([undefined, 'http://example.com', 'https://user:pass@example.com'])(
    'rejects invalid resource URL %s',
    async (resource_url) => {
      await expect(
        service.create(
          { ...body, post_type: 'resource', resource_url },
          author,
        ),
      ).rejects.toMatchObject({ status: 400 });
    },
  );

  it('rejects whitespace content after trimming', async () => {
    await expect(
      service.create({ ...body, content: '          ' }, author),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('database trigger rejects a lesson that belongs to another chapter', async () => {
    await expect(
      db.query('update public.discussion_posts set chapter_id=$1 where id=$2', [
        otherChapter,
        postId,
      ]),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('database trigger rejects a direct insert under an unpublished course', async () => {
    await db.query("update public.courses set status='draft'");
    await expect(
      db.query(
        'insert into public.discussion_posts(chapter_id, author_id, post_type, title, content) values ($1,$2,$3,$4,$5)',
        [chapter, author, 'question', body.title, body.content],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('enables RLS', async () => {
    expect(
      (
        await db.query(
          "select relrowsecurity from pg_class where oid='public.discussion_posts'::regclass",
        )
      ).rows[0],
    ).toEqual({ relrowsecurity: true });
  });

  it.each(['anon', 'authenticated'])(
    'blocks direct %s access',
    async (role) => {
      await db.exec(`set local role ${role}`);
      await expect(
        db.query('select * from public.discussion_posts'),
      ).rejects.toMatchObject({ code: '42501' });
    },
  );

  it('allows backend service_role to create, edit and soft-delete', async () => {
    await db.exec('set local role service_role');
    const post = await service.create(body, author);
    expect(
      await service.update(post.id, { title: 'Updated by backend' }, author),
    ).toMatchObject({ title: 'Updated by backend' });
    expect(await service.remove(post.id, author)).toMatchObject({
      deleted: true,
    });
  });
});
