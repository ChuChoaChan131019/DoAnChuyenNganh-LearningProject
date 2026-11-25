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
import { CodeExercisePublishService } from './code-exercise-publish.service.js';

const author = '10000000-0000-4000-8000-000000000001';
const otherAuthor = '10000000-0000-4000-8000-000000000002';
const lesson = '20000000-0000-4000-8000-000000000001';
const payload = {
  lesson_id: lesson,
  title: 'Tính tổng',
  difficulty: 'easy',
  objective: 'Cộng hai số',
  description: 'Đọc hai dòng và cộng',
  input_format: 'Hai dòng số',
  output_format: 'Một dòng tổng',
  starter_code: '',
  hint_1: 'Đọc',
  hint_2: 'Đổi kiểu',
  hint_3: 'Cộng',
  solution_code: 'Console.WriteLine(3);',
  solution_explanation: 'Cộng hai số',
  test_cases: [
    { input: '1\n2\n', expected_output: '3\n', is_public: true },
    { input: '2\n1\n', expected_output: '3\n', is_public: false },
  ],
};
type Saved = { id: string; revision_id: string; edit_version: number };
let db: PGlite;

async function save(
  body: object = payload,
  id: string | null = null,
  version = 0,
) {
  return (
    await db.query<{ result: Saved }>(
      'select public.save_code_exercise_draft($1::uuid,$2::jsonb,$3::uuid,$4::integer) as result',
      [author, JSON.stringify(body), id, version],
    )
  ).rows[0].result;
}

async function publish(saved: Saved, actor = author) {
  return (
    await db.query<{ result: { revision_id: string; status: string } }>(
      'select public.publish_code_exercise_draft($1::uuid,$2::uuid,$3::uuid,$4::integer) as result',
      [actor, saved.id, saved.revision_id, saved.edit_version],
    )
  ).rows[0].result;
}

async function rejectedPublication(saved: Saved, code: string, actor = author) {
  await db.exec('savepoint rejected_publication');
  await expect(publish(saved, actor)).rejects.toMatchObject({ code });
  await db.exec('rollback to savepoint rejected_publication');
}

describe('C04 publication transaction (PostgreSQL)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table public.profiles (id uuid primary key, role text not null);
      create table public.courses (id uuid primary key, status text not null);
      create table public.chapters (id uuid primary key, course_id uuid references public.courses, status text not null);
      create table public.lessons (id uuid primary key, chapter_id uuid references public.chapters, status text not null);
      insert into public.profiles values ('${author}', 'content_manager'), ('${otherAuthor}', 'content_manager');
      insert into public.courses values ('30000000-0000-4000-8000-000000000001', 'published');
      insert into public.chapters values ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','published');
      insert into public.lessons values ('${lesson}','40000000-0000-4000-8000-000000000001','published');
      grant usage on schema public to service_role;
      grant select on public.profiles, public.courses, public.chapters, public.lessons to service_role;
    `);
    await db.exec(
      readFileSync(
        '../database/migrations/20261103135132_code_exercises.sql',
        'utf8',
      ),
    );
    await db.exec(
      readFileSync(
        '../database/migrations/20261119_code_exercise_publish.sql',
        'utf8',
      ),
    );
    await db.exec(
      readFileSync(
        '../database/migrations/20261125120000_allow_managers_to_publish_code_exercises.sql',
        'utf8',
      ),
    );
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

  it('publishes a new revision and supersedes the old snapshot atomically', async () => {
    const original = await save();
    await publish(original);
    const next = await save(
      { ...payload, title: 'Phiên bản mới' },
      original.id,
    );
    await publish(next);
    const { rows } = await db.query(
      'select id, title, status from public.code_exercise_revisions where exercise_id=$1 order by revision_no',
      [original.id],
    );
    expect(rows).toEqual([
      { id: original.revision_id, title: payload.title, status: 'superseded' },
      { id: next.revision_id, title: 'Phiên bản mới', status: 'published' },
    ]);
    expect(
      (
        await db.query(
          'select published_revision_id from public.code_exercises where id=$1',
          [original.id],
        )
      ).rows[0],
    ).toEqual({ published_revision_id: next.revision_id });
  });

  it('rejects stale content without altering the published snapshot', async () => {
    const original = await save();
    await publish(original);
    const next = await save(payload, original.id);
    await save(
      { ...payload, solution_code: 'Console.WriteLine(999);' },
      original.id,
      next.edit_version,
    );
    await rejectedPublication(next, 'PT409');
    expect(
      (
        await db.query(
          'select published_revision_id from public.code_exercises where id=$1',
          [original.id],
        )
      ).rows[0],
    ).toEqual({ published_revision_id: original.revision_id });
  });

  it('keeps a replacement draft unpublished when another request publishes the checked revision', async () => {
    const checked = await save();
    let replacement: Saved | undefined;
    let firstRun = true;
    const from = (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({
          data:
            table === 'lessons'
              ? { status: 'published', chapter_id: 'chapter' }
              : table === 'chapters'
                ? { status: 'published', course_id: 'course' }
                : { status: 'published' },
          error: null,
        }),
      };
      return chain;
    };
    const service = new CodeExercisePublishService(
      {
        getClient: () => ({
          from,
          rpc: async (_name: string, args: Record<string, string | number>) => {
            await db.exec('savepoint rpc_publication');
            try {
              return {
                data: await publish({
                  id: String(args.p_exercise_id),
                  revision_id: String(args.p_revision_id),
                  edit_version: Number(args.p_expected_edit_version),
                }),
                error: null,
              };
            } catch (error) {
              await db.exec('rollback to savepoint rpc_publication');
              return { data: null, error };
            }
          },
        }),
      } as never,
      {
        findOne: async () => {
          const current = (
            await db.query(
              "select * from public.code_exercise_revisions where exercise_id=$1 and status='draft'",
              [checked.id],
            )
          ).rows[0];
          return {
            lesson_id: lesson,
            archived_at: null,
            revision: { ...current, test_cases: payload.test_cases },
          };
        },
      } as never,
      {
        run: async () => {
          if (firstRun) {
            firstRun = false;
            await publish(checked);
            replacement = await save(
              { ...payload, solution_code: 'Console.WriteLine(999);' },
              checked.id,
            );
          }
          return { status: 'success', stdout: '3\n', stderr: '' };
        },
      } as never,
    );
    await expect(
      service.publish(
        checked.id,
        { id: author, role: 'content_manager' },
        checked.edit_version,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(replacement?.edit_version).toBe(checked.edit_version);
    expect(
      (
        await db.query(
          'select published_revision_id from public.code_exercises where id=$1',
          [checked.id],
        )
      ).rows[0],
    ).toEqual({ published_revision_id: checked.revision_id });
    expect(
      (
        await db.query(
          'select status from public.code_exercise_revisions where id=$1',
          [replacement!.revision_id],
        )
      ).rows[0],
    ).toEqual({ status: 'draft' });
  });

  it('requires public and hidden tests', async () => {
    const saved = await save({
      ...payload,
      test_cases: [payload.test_cases[0]],
    });
    await rejectedPublication(saved, '22023');
  });

  it('requires a published lesson', async () => {
    const saved = await save();
    await db.query("update public.lessons set status='draft' where id=$1", [
      lesson,
    ]);
    await rejectedPublication(saved, '22023');
  });

  it('lets another content manager publish an author\'s valid draft', async () => {
    const saved = await save();
    await expect(publish(saved, otherAuthor)).resolves.toMatchObject({
      revision_id: saved.revision_id,
      status: 'published',
    });
  });

  it('only grants the backend permission to call the publication RPC', async () => {
    const signature =
      'public.publish_code_exercise_draft(uuid,uuid,uuid,integer)';
    const { rows } = await db.query(
      "select has_function_privilege('anon',$1,'execute') as anon, has_function_privilege('authenticated',$1,'execute') as authenticated, has_function_privilege('service_role',$1,'execute') as backend",
      [signature],
    );
    expect(rows[0]).toEqual({
      anon: false,
      authenticated: false,
      backend: true,
    });
  });
});
