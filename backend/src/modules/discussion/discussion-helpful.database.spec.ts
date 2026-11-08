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
import { DiscussionHelpfulService } from './discussion-helpful.service.js';
import { DiscussionPostsService } from './discussion-posts.service.js';

const migration = (name: string) =>
  readFileSync(
    new URL(`../../../../database/migrations/${name}`, import.meta.url),
    'utf8',
  );
const helpfulMigration = migration(
  '20261108161402_discussion_helpful_votes.sql',
);
const author = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const course = '00000000-0000-4000-8000-000000000003';
const chapter = '00000000-0000-4000-8000-000000000004';
const lesson = '00000000-0000-4000-8000-000000000005';
const commentId = '00000000-0000-4000-8000-000000000006';
const missing = '00000000-0000-4000-8000-000000000099';
let db: PGlite;
let helpful: DiscussionHelpfulService;
let postId: string;

// Execute the service's PostgREST queries as parameterized PostgreSQL queries.
// Both visibility checks and idempotent INSERT/DELETE run against real tables.
function from(table: string) {
  const filters: string[] = [];
  const params: unknown[] = [];
  let mode: 'select' | 'insert' | 'upsert' | 'delete' = 'select';
  let input: Record<string, unknown> = {};
  let fields = '*';
  let conflict = '';
  const bind = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };
  const builder = {
    select(value: string) {
      fields = value;
      return builder;
    },
    eq(column: string, value: unknown) {
      filters.push(`${column}=${bind(value)}`);
      return builder;
    },
    is(column: string, value: unknown) {
      expect(value).toBeNull();
      filters.push(`${column} is null`);
      return builder;
    },
    insert(value: Record<string, unknown>) {
      mode = 'insert';
      input = value;
      return builder;
    },
    upsert(
      value: Record<string, unknown>,
      options: { onConflict: string; ignoreDuplicates: boolean },
    ) {
      expect(options.ignoreDuplicates).toBe(true);
      mode = 'upsert';
      input = value;
      conflict = options.onConflict;
      return builder;
    },
    delete() {
      mode = 'delete';
      return builder;
    },
    maybeSingle: run,
    single: run,
  };
  async function run() {
    try {
      let sql: string;
      if (mode === 'insert' || mode === 'upsert') {
        sql = `insert into public.${table} (${Object.keys(input).join(',')}) values (${Object.values(input).map(bind).join(',')})`;
        sql +=
          mode === 'upsert'
            ? ` on conflict (${conflict}) do nothing`
            : ` returning ${fields}`;
      } else if (mode === 'delete') {
        sql = `delete from public.${table} where ${filters.join(' and ')}`;
      } else {
        sql = `select ${fields} from public.${table}${filters.length ? ` where ${filters.join(' and ')}` : ''}`;
      }
      return {
        data: (await db.query(sql, params)).rows[0] ?? null,
        error: null,
      };
    } catch (error) {
      return { data: null, error };
    }
  }
  // oxlint-disable-next-line unicorn/no-thenable -- Supabase query builders implement PromiseLike.
  Object.defineProperty(builder, 'then', {
    value: (
      resolve: (value: unknown) => unknown,
      reject: (error: unknown) => unknown,
    ) => run().then(resolve, reject),
  });
  return builder;
}

async function rpc(name: string, args: { p_ids: string[]; p_user_id: string }) {
  try {
    const { rows } = await db.query(
      `select * from public.${name}($1::uuid[], $2::uuid)`,
      [`{${args.p_ids.join(',')}}`, args.p_user_id],
    );
    return { data: rows, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

function methods(kind: 'post' | 'comment') {
  return kind === 'post'
    ? {
        id: postId,
        mark: (user: string) => helpful.markPost(postId, user),
        unmark: (user: string) => helpful.unmarkPost(postId, user),
      }
    : {
        id: commentId,
        mark: (user: string) => helpful.markComment(commentId, user),
        unmark: (user: string) => helpful.unmarkComment(commentId, user),
      };
}

describe('D03 helpful votes (isolated PostgreSQL)', () => {
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
      insert into public.courses values ('${course}','published');
      insert into public.chapters values ('${chapter}','${course}','published');
      insert into public.lessons values ('${lesson}','${chapter}','published');
      grant usage on schema public to service_role;
      grant select on public.profiles, public.courses, public.chapters, public.lessons to service_role;
    `);
    await db.exec(migration('20261103143449_discussion_posts.sql'));
    await db.exec(migration('20261106140000_discussion_comments.sql'));
    await db.exec(helpfulMigration);
    const provider = { getClient: () => ({ from, rpc }) };
    const posts = new DiscussionPostsService(provider as never);
    helpful = new DiscussionHelpfulService(provider as never, posts);
    postId = (
      await posts.create(
        {
          lesson_id: lesson,
          post_type: 'question',
          title: 'D03 question',
          content: 'How do helpful votes work?',
        },
        author,
      )
    ).id;
    await db.query(
      'insert into discussion_comments(id,post_id,author_id,content) values ($1,$2,$3,$4)',
      [commentId, postId, author, 'An answer to this question.'],
    );
    await helpful.markPost(postId, author);
    await helpful.markComment(commentId, author);
    await db.exec(helpfulMigration);
    expect(
      await helpful.summary(
        { post_ids: [postId], comment_ids: [commentId] },
        author,
      ),
    ).toEqual({
      posts: { [postId]: { helpful_count: 1, is_helpful: true } },
      comments: { [commentId]: { helpful_count: 1, is_helpful: true } },
    });
    await helpful.unmarkPost(postId, author);
    await helpful.unmarkComment(commentId, author);
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

  describe.each(['post', 'comment'] as const)('%s votes', (kind) => {
    it('marks once and does not increment on repeated requests', async () => {
      const { mark } = methods(kind);
      expect(await mark(author)).toEqual({
        helpful_count: 1,
        is_helpful: true,
      });
      expect(await mark(author)).toEqual({
        helpful_count: 1,
        is_helpful: true,
      });
    });

    it('keeps one vote for simultaneous duplicate submissions', async () => {
      const { mark } = methods(kind);
      const results = await Promise.all(
        Array.from({ length: 12 }, () => mark(author)),
      );
      expect(
        results.every(
          (result) => result.helpful_count === 1 && result.is_helpful,
        ),
      ).toBe(true);
      expect(
        (
          await db.query(
            `select count(*)::integer as count from discussion_${kind}_helpful_votes`,
          )
        ).rows[0],
      ).toEqual({ count: 1 });
    });

    it('counts separate users and only removes the caller’s vote', async () => {
      const { mark, unmark } = methods(kind);
      await mark(author);
      expect(await mark(other)).toEqual({ helpful_count: 2, is_helpful: true });
      expect(await unmark(author)).toEqual({
        helpful_count: 1,
        is_helpful: false,
      });
      expect(await unmark(author)).toEqual({
        helpful_count: 1,
        is_helpful: false,
      });
      expect(await mark(other)).toEqual({ helpful_count: 1, is_helpful: true });
    });

    it('allows marking again after removing the vote', async () => {
      const { mark, unmark } = methods(kind);
      expect(await unmark(author)).toEqual({
        helpful_count: 0,
        is_helpful: false,
      });
      await mark(author);
      expect(await unmark(author)).toEqual({
        helpful_count: 0,
        is_helpful: false,
      });
      expect(await mark(author)).toEqual({
        helpful_count: 1,
        is_helpful: true,
      });
    });

    it('database rejects raw duplicate votes even outside the service', async () => {
      const { id, mark } = methods(kind);
      await mark(author);
      await expect(
        db.query(
          `insert into discussion_${kind}_helpful_votes(${kind}_id,user_id) values ($1,$2)`,
          [id, author],
        ),
      ).rejects.toMatchObject({ code: '23505' });
    });

    it('works with the backend role and least-privilege migration grants', async () => {
      await db.exec('set local role service_role');
      const { mark, unmark } = methods(kind);
      expect(await mark(author)).toEqual({
        helpful_count: 1,
        is_helpful: true,
      });
      expect(await mark(author)).toEqual({
        helpful_count: 1,
        is_helpful: true,
      });
      expect(await unmark(author)).toEqual({
        helpful_count: 0,
        is_helpful: false,
      });
    });
  });

  it('returns zero stats, deduplicates IDs, and personalizes only is_helpful', async () => {
    const payload = {
      post_ids: [postId, postId],
      comment_ids: [commentId, commentId],
    };
    expect(await helpful.summary(payload, other)).toEqual({
      posts: { [postId]: { helpful_count: 0, is_helpful: false } },
      comments: { [commentId]: { helpful_count: 0, is_helpful: false } },
    });
    await helpful.markPost(postId, author);
    await helpful.markComment(commentId, author);
    const result = await helpful.summary(payload, other);
    expect(result).toEqual({
      posts: { [postId]: { helpful_count: 1, is_helpful: false } },
      comments: { [commentId]: { helpful_count: 1, is_helpful: false } },
    });
  });

  it('returns no entry for missing IDs', async () => {
    expect(
      await helpful.summary(
        { post_ids: [missing], comment_ids: [missing] },
        author,
      ),
    ).toEqual({ posts: {}, comments: {} });
  });

  it.each(['courses', 'chapters', 'lessons'])(
    'blocks marks/removals and hides summaries after %s withdrawal',
    async (table) => {
      await helpful.markPost(postId, author);
      await helpful.markComment(commentId, author);
      await db.exec(`update public.${table} set status='draft'`);
      for (const kind of ['post', 'comment'] as const) {
        await expect(methods(kind).mark(other)).rejects.toMatchObject({
          status: 404,
        });
        await expect(methods(kind).unmark(author)).rejects.toMatchObject({
          status: 404,
        });
      }
      expect(
        await helpful.summary(
          { post_ids: [postId], comment_ids: [commentId] },
          author,
        ),
      ).toEqual({ posts: {}, comments: {} });
      expect(
        (
          await db.query(
            'select count(*)::integer as count from discussion_post_helpful_votes',
          )
        ).rows[0],
      ).toEqual({ count: 1 });
    },
  );

  it.each(['hidden', 'removed', 'deleted'] as const)(
    'blocks a %s post and its comments, while preserving old votes',
    async (state) => {
      await helpful.markPost(postId, author);
      await helpful.markComment(commentId, author);
      if (state === 'deleted')
        await db.exec('update discussion_posts set deleted_at=now()');
      else await db.query('update discussion_posts set status=$1', [state]);
      for (const kind of ['post', 'comment'] as const) {
        await expect(methods(kind).mark(other)).rejects.toMatchObject({
          status: 404,
        });
        await expect(methods(kind).unmark(author)).rejects.toMatchObject({
          status: 404,
        });
      }
      expect(
        await helpful.summary(
          { post_ids: [postId], comment_ids: [commentId] },
          author,
        ),
      ).toEqual({ posts: {}, comments: {} });
    },
  );

  it.each(['hidden', 'removed', 'deleted'] as const)(
    'blocks a %s comment without hiding its visible parent',
    async (state) => {
      if (state === 'deleted')
        await db.exec('update discussion_comments set deleted_at=now()');
      else await db.query('update discussion_comments set status=$1', [state]);
      await expect(
        helpful.markComment(commentId, author),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        helpful.unmarkComment(commentId, author),
      ).rejects.toMatchObject({ status: 404 });
      const result = await helpful.summary(
        { post_ids: [postId], comment_ids: [commentId] },
        author,
      );
      expect(result.comments).toEqual({});
      expect(result.posts[postId]).toEqual({
        helpful_count: 0,
        is_helpful: false,
      });
    },
  );

  it('handles chapter-only posts without requiring a lesson', async () => {
    await db.exec('update discussion_posts set lesson_id=null');
    await db.exec("update lessons set status='draft'");
    expect(await helpful.markPost(postId, author)).toEqual({
      helpful_count: 1,
      is_helpful: true,
    });
  });

  it('enables RLS on both vote tables', async () => {
    const { rows } = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where oid in ('public.discussion_post_helpful_votes'::regclass,'public.discussion_comment_helpful_votes'::regclass)",
    );
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.relrowsecurity)).toBe(true);
  });

  describe.each(['anon', 'authenticated'])('%s direct access', (role) => {
    it.each(['post', 'comment'] as const)(
      'cannot read %s votes',
      async (kind) => {
        await db.exec(`set local role ${role}`);
        await expect(
          db.query(`select * from discussion_${kind}_helpful_votes`),
        ).rejects.toMatchObject({ code: '42501' });
      },
    );
    it.each(['post', 'comment'] as const)(
      'cannot call the %s stats RPC with a forged user ID',
      async (kind) => {
        await db.exec(`set local role ${role}`);
        await expect(
          db.query(
            `select * from discussion_${kind}_helpful_stats($1::uuid[],$2::uuid)`,
            [`{${kind === 'post' ? postId : commentId}}`, author],
          ),
        ).rejects.toMatchObject({ code: '42501' });
      },
    );
  });
});
