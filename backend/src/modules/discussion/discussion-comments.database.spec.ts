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

import { DiscussionCommentsService } from './discussion-comments.service.js';
import { DiscussionPostsService } from './discussion-posts.service.js';

const postsMigration = readFileSync(
  new URL(
    '../../../../database/migrations/20261103143449_discussion_posts.sql',
    import.meta.url,
  ),
  'utf8',
);
const commentsMigration = readFileSync(
  new URL(
    '../../../../database/migrations/20261106140000_discussion_comments.sql',
    import.meta.url,
  ),
  'utf8',
);

const author = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const course = '00000000-0000-4000-8000-000000000003';
const chapter = '00000000-0000-4000-8000-000000000004';
const lesson = '00000000-0000-4000-8000-000000000005';

let db: PGlite;
let postsService: DiscussionPostsService;
let commentsService: DiscussionCommentsService;
let postId: string;

function from(table: string) {
  const filters: string[] = [];
  const params: unknown[] = [];
  const orderBy: string[] = [];
  let mode: 'select' | 'insert' | 'update' = 'select';
  let values: Record<string, unknown> = {};
  let fields = '*';
  let rowLimit: number | null = null;

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
    in(column: string, input: unknown[]) {
      const placeholders = input.map((value) => param(value));
      filters.push(`${column} in (${placeholders.join(',')})`);
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
    order(column: string, options?: { ascending?: boolean }) {
      orderBy.push(`${column} ${options?.ascending === false ? 'desc' : 'asc'}`);
      return builder;
    },
    limit(value: number) {
      rowLimit = value;
      return builder;
    },
    textSearch(_column: string, search: string) {
      filters.push(
        `search_vector @@ websearch_to_tsquery('simple', ${param(search)})`,
      );
      return builder;
    },
    or(expression: string) {
      const match = expression.match(
        /^created_at\.(lt|gt)\.([^,]+),and\(created_at\.eq\.([^,]+),id\.(lt|gt)\.([^)]+)\)$/,
      );
      if (!match) throw new Error(`Unsupported OR filter: ${expression}`);
      const [, timeOperator, firstTime, secondTime, idOperator, id] = match;
      const timeSqlOperator = timeOperator === 'lt' ? '<' : '>';
      const idSqlOperator = idOperator === 'lt' ? '<' : '>';
      filters.push(
        `(created_at ${timeSqlOperator} ${param(firstTime)} or (created_at=${param(secondTime)} and id ${idSqlOperator} ${param(id)}))`,
      );
      return builder;
    },
    single: () => run(true),
    maybeSingle: () => run(true),
    // oxlint-disable-next-line unicorn/no-thenable -- Match PostgREST builders.
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      return run(false).then(resolve, reject);
    },
  };

  async function run(single: boolean) {
    try {
      let sql: string;
      if (mode === 'insert') {
        sql = `insert into ${table} (${Object.keys(values).join(',')}) values (${Object.values(values).map(param).join(',')}) returning ${fields}`;
      } else if (mode === 'update') {
        sql = `update ${table} set ${Object.entries(values)
          .map(([key, value]) => `${key}=${param(value)}`)
          .join(',')} where ${filters.join(' and ')} returning ${fields}`;
      } else {
        sql = `select ${fields} from ${table}`;
        if (filters.length) sql += ` where ${filters.join(' and ')}`;
        if (orderBy.length) sql += ` order by ${orderBy.join(',')}`;
        if (rowLimit !== null) sql += ` limit ${rowLimit}`;
      }
      const result = await db.query(sql, params);
      return {
        data: single ? result.rows[0] ?? null : result.rows,
        error: null,
      };
    } catch (error) {
      return { data: single ? null : [], error };
    }
  }

  return builder;
}

describe('D02 discussion comments and listings (isolated PostgreSQL)', () => {
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
      insert into public.chapters values ('${chapter}', '${course}', 'published');
      insert into public.lessons values ('${lesson}', '${chapter}', 'published');
      grant usage on schema public to service_role;
      grant select on public.profiles, public.courses, public.chapters, public.lessons to service_role;
    `);
    await db.exec(postsMigration);
    await db.exec(commentsMigration);

    const supabase = { getClient: () => ({ from }) } as never;
    postsService = new DiscussionPostsService(supabase);
    commentsService = new DiscussionCommentsService(supabase, postsService);
    postId = (
      await postsService.create(
        {
          lesson_id: lesson,
          post_type: 'question',
          title: 'Cách sử dụng vòng lặp for?',
          content: 'Mình chưa hiểu điều kiện dừng của vòng lặp trong ví dụ.',
        },
        author,
      )
    ).id;

    const firstComment = await commentsService.create(
      postId,
      { content: 'Bình luận được giữ lại khi chạy migration lần hai.' },
      author,
    );
    await db.exec(commentsMigration);
    expect(
      (
        await db.query('select id from discussion_comments where id=$1', [
          firstComment.id,
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

  it('lists and searches only visible posts in the requested lesson', async () => {
    await postsService.create(
      {
        chapter_id: chapter,
        post_type: 'note',
        title: 'Ghi chú trực tiếp ở chương',
        content: 'Bài này không thuộc riêng bài học đang lọc.',
      },
      other,
    );

    const page = await postsService.findAll(
      { lesson_id: lesson, search: 'vòng lặp', limit: 20 },
      other,
    );
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      id: postId,
      lesson_id: lesson,
      is_mine: false,
      comment_count: 1,
    });
  });

  it('paginates posts with a stable cursor without duplicate rows', async () => {
    for (let index = 1; index <= 3; index += 1) {
      await postsService.create(
        {
          lesson_id: lesson,
          post_type: 'question',
          title: `Câu hỏi phân trang số ${index}`,
          content: `Nội dung hợp lệ cho câu hỏi phân trang số ${index}.`,
        },
        author,
      );
    }

    const first = await postsService.findAll(
      { lesson_id: lesson, limit: 2 },
      author,
    );
    const second = await postsService.findAll(
      { lesson_id: lesson, limit: 2, cursor: first.next_cursor! },
      author,
    );
    const firstIds = new Set(first.items.map((post) => post.id));

    expect(first.items).toHaveLength(2);
    expect(first.next_cursor).not.toBeNull();
    expect(second.items).toHaveLength(2);
    expect(second.items.every((post) => !firstIds.has(post.id))).toBe(true);
  });

  it('creates trimmed comments and returns them oldest first', async () => {
    const created = await commentsService.create(
      postId,
      { content: '  Hãy kiểm tra điều kiện trước mỗi vòng lặp.  ' },
      other,
    );
    expect(created).toMatchObject({
      post_id: postId,
      author_id: other,
      content: 'Hãy kiểm tra điều kiện trước mỗi vòng lặp.',
      is_mine: true,
    });

    const page = await commentsService.findAll(postId, { limit: 30 }, other);
    expect(page.items.at(-1)?.id).toBe(created.id);
  });

  it('allows only the author to edit and soft-delete a visible comment', async () => {
    const comment = await commentsService.create(
      postId,
      { content: 'Nội dung ban đầu' },
      author,
    );

    await expect(
      commentsService.update(comment.id, { content: 'Không được sửa' }, other),
    ).rejects.toMatchObject({ status: 404 });
    await expect(commentsService.remove(comment.id, other)).rejects.toMatchObject({
      status: 404,
    });

    expect(
      await commentsService.update(
        comment.id,
        { content: 'Nội dung đã cập nhật' },
        author,
      ),
    ).toMatchObject({ content: 'Nội dung đã cập nhật' });
    expect(await commentsService.remove(comment.id, author)).toMatchObject({
      id: comment.id,
      deleted: true,
    });
    expect(
      (
        await db.query(
          'select deleted_at from discussion_comments where id=$1',
          [comment.id],
        )
      ).rows[0],
    ).toMatchObject({ deleted_at: expect.anything() });
  });

  it('blocks new interactions after the post is hidden', async () => {
    const comment = await commentsService.create(
      postId,
      { content: 'Bình luận trước khi bài bị ẩn' },
      author,
    );
    await db.query("update discussion_posts set status='hidden' where id=$1", [
      postId,
    ]);

    await expect(
      commentsService.create(postId, { content: 'Không được tạo' }, author),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      commentsService.update(comment.id, { content: 'Không được sửa' }, author),
    ).rejects.toMatchObject({ status: 404 });
    await expect(commentsService.remove(comment.id, author)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('blocks comments after the related learning content is withdrawn', async () => {
    await db.query("update lessons set status='draft' where id=$1", [lesson]);
    await expect(
      commentsService.create(postId, { content: 'Không được tạo' }, author),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('enables RLS on comments', async () => {
    expect(
      (
        await db.query(
          "select relrowsecurity from pg_class where oid='public.discussion_comments'::regclass",
        )
      ).rows[0],
    ).toEqual({ relrowsecurity: true });
  });

  it.each(['anon', 'authenticated'])(
    'blocks direct %s access to comments',
    async (role) => {
      await db.exec(`set local role ${role}`);
      await expect(
        db.query('select * from discussion_comments'),
      ).rejects.toMatchObject({
        code: '42501',
      });
    },
  );
});
