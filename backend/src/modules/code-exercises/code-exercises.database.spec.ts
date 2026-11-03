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

// Run the committed migration on a fresh PostgreSQL engine, without network,
// credentials or Docker. Only the two tables that C02 depends on are fixtures.
const migration = readFileSync(
  new URL(
    '../../../../database/migrations/20261103135132_code_exercises.sql',
    import.meta.url,
  ),
  'utf8',
);
const author = '00000000-0000-4000-8000-000000000001';
const otherAuthor = '00000000-0000-4000-8000-000000000002';
const admin = '00000000-0000-4000-8000-000000000003';
const learner = '00000000-0000-4000-8000-000000000004';
const lesson = '00000000-0000-4000-8000-000000000011';
const otherLesson = '00000000-0000-4000-8000-000000000012';
const missing = '00000000-0000-4000-8000-000000000099';
const payload = {
  lesson_id: lesson,
  title: 'Sum the numbers',
  difficulty: 'easy',
  objective: 'Practice loops',
  description: 'Read the numbers and print their sum.',
  input_format: 'The count, followed by the numbers.',
  output_format: 'Print the sum.',
  starter_code: '// Start here\n',
  hint_1: 'Use a loop',
  hint_2: 'Keep a total',
  hint_3: 'Add each number',
  solution_code: 'Console.WriteLine(15);',
  solution_explanation: 'Add every input value.',
  test_cases: [
    { input: '5\r\n1 2 3 4 5\r\n', expected_output: '15\n', is_public: true },
    { input: '', expected_output: '', is_public: false },
  ],
};
type SavedDraft = {
  id: string;
  revision_id: string;
  revision_no: number;
  edit_version: number;
  status: string;
};
let db: PGlite;

async function save(
  body: object = payload,
  actor = author,
  exerciseId: string | null = null,
  version = 0,
) {
  const result = await db.query<{ result: SavedDraft }>(
    'select public.save_code_exercise_draft($1::uuid, $2::jsonb, $3::uuid, $4::integer) as result',
    [actor, JSON.stringify(body), exerciseId, version],
  );
  return result.rows[0].result;
}

async function publish(saved: SavedDraft) {
  // Publishing belongs to C04; seed a published revision to test C02 edits.
  await db.query(
    "update public.code_exercise_revisions set status = 'published' where id = $1",
    [saved.revision_id],
  );
  await db.query(
    'update public.code_exercises set published_revision_id = $1 where id = $2',
    [saved.revision_id, saved.id],
  );
}

describe('C02 migration and draft persistence (PostgreSQL)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table public.profiles (id uuid primary key, role text not null);
      create table public.lessons (id uuid primary key);
      insert into public.profiles values
        ('${author}', 'content_manager'), ('${otherAuthor}', 'content_manager'),
        ('${admin}', 'admin'), ('${learner}', 'learner');
      insert into public.lessons values ('${lesson}'), ('${otherLesson}');
      grant usage on schema public to service_role;
      grant select on public.profiles, public.lessons to service_role;
    `);
    await db.exec(migration);
    // Reapplying after data exists must preserve the existing exercise and cases.
    const saved = await save();
    await db.exec(migration);
    expect(
      (
        await db.query('select id from public.code_exercises where id = $1', [
          saved.id,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          'select id from public.code_test_cases where revision_id = $1',
          [saved.revision_id],
        )
      ).rows,
    ).toHaveLength(2);
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

  it('creates a draft with all authoring fields and no published revision', async () => {
    const saved = await save();
    expect(saved).toMatchObject({
      status: 'draft',
      revision_no: 1,
      edit_version: 1,
    });
    const { rows } = await db.query(
      'select e.published_revision_id, r.* from public.code_exercises e join public.code_exercise_revisions r on r.exercise_id=e.id where r.id=$1',
      [saved.revision_id],
    );
    const { lesson_id: _lesson, test_cases: _cases, ...content } = payload;
    expect(rows[0]).toMatchObject({
      ...content,
      published_revision_id: null,
      status: 'draft',
    });
  });

  it('round-trips public and hidden tests with empty and multiline text unchanged', async () => {
    const saved = await save();
    const { rows } = await db.query(
      'select input_text as input, expected_output, is_public, order_index from public.code_test_cases where revision_id=$1 order by order_index',
      [saved.revision_id],
    );
    expect(rows).toEqual(
      payload.test_cases.map((t, i) => ({ ...t, order_index: i + 1 })),
    );
  });

  it('allows an incomplete draft without test cases, hints or solution', async () => {
    const saved = await save({
      lesson_id: lesson,
      title: 'Incomplete draft',
      difficulty: 'easy',
    });
    expect(saved.status).toBe('draft');
    expect(
      (
        await db.query(
          'select * from public.code_test_cases where revision_id=$1',
          [saved.revision_id],
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await db.query(
          'select hint_1, solution_code from public.code_exercise_revisions where id=$1',
          [saved.revision_id],
        )
      ).rows[0],
    ).toEqual({ hint_1: '', solution_code: '' });
  });

  it('replaces draft tests atomically and increments the edit version', async () => {
    const saved = await save();
    const updated = await save(
      {
        ...payload,
        title: 'Updated draft',
        test_cases: [payload.test_cases[1]],
      },
      author,
      saved.id,
      saved.edit_version,
    );
    expect(updated).toMatchObject({
      id: saved.id,
      revision_id: saved.revision_id,
      revision_no: 1,
      edit_version: 2,
    });
    expect(
      (
        await db.query(
          'select input_text, is_public, order_index from public.code_test_cases where revision_id=$1',
          [saved.revision_id],
        )
      ).rows,
    ).toEqual([{ input_text: '', is_public: false, order_index: 1 }]);
  });

  it('rolls back content and deleted test cases when a replacement case is invalid', async () => {
    const saved = await save();
    await db.exec('savepoint invalid_case');
    await expect(
      save(
        {
          ...payload,
          title: 'Must roll back',
          test_cases: [{ input: 'x', expected_output: 'y' }],
        },
        author,
        saved.id,
        1,
      ),
    ).rejects.toMatchObject({ code: '23502' });
    await db.exec('rollback to savepoint invalid_case');
    expect(
      (
        await db.query(
          'select title, edit_version from public.code_exercise_revisions where id=$1',
          [saved.revision_id],
        )
      ).rows[0],
    ).toEqual({ title: payload.title, edit_version: 1 });
    expect(
      (
        await db.query(
          'select id from public.code_test_cases where revision_id=$1',
          [saved.revision_id],
        )
      ).rows,
    ).toHaveLength(2);
  });

  it('rejects a stale save instead of overwriting a newer edit', async () => {
    const saved = await save();
    await save({ ...payload, title: 'Newer edit' }, author, saved.id, 1);
    await expect(save(payload, author, saved.id, 1)).rejects.toMatchObject({
      code: 'PT409',
    });
  });

  it('rejects editing another author’s exercise', async () => {
    const saved = await save();
    await expect(save(payload, otherAuthor, saved.id, 1)).rejects.toMatchObject(
      { code: '42501' },
    );
  });

  it('allows an admin to edit another author’s exercise', async () => {
    const saved = await save();
    expect(await save(payload, admin, saved.id, 1)).toMatchObject({
      id: saved.id,
      edit_version: 2,
    });
  });

  it.each([learner, missing])(
    'rejects an actor without authoring permission (%s)',
    async (actor) => {
      await expect(save(payload, actor)).rejects.toMatchObject({
        code: '42501',
      });
    },
  );

  it('rejects a nonexistent lesson', async () => {
    await expect(
      save({ ...payload, lesson_id: missing }),
    ).rejects.toMatchObject({ code: 'P0002' });
  });

  it('rejects a nonexistent exercise', async () => {
    await expect(save(payload, author, missing, 1)).rejects.toMatchObject({
      code: 'P0002',
    });
  });

  it('rejects editing an archived exercise', async () => {
    const saved = await save();
    await db.query(
      'update public.code_exercises set archived_at=now() where id=$1',
      [saved.id],
    );
    await expect(save(payload, author, saved.id, 1)).rejects.toMatchObject({
      code: 'PT409',
    });
  });

  it('preserves published content and test cases when creating a new draft', async () => {
    const saved = await save();
    await publish(saved);
    const updated = await save(
      { ...payload, title: 'Next revision', test_cases: [] },
      author,
      saved.id,
      0,
    );
    expect(updated).toMatchObject({
      id: saved.id,
      revision_no: 2,
      edit_version: 1,
      status: 'draft',
    });
    expect(updated.revision_id).not.toBe(saved.revision_id);
    expect(
      (
        await db.query(
          'select published_revision_id from public.code_exercises where id=$1',
          [saved.id],
        )
      ).rows[0],
    ).toEqual({ published_revision_id: saved.revision_id });
    expect(
      (
        await db.query(
          'select title, status from public.code_exercise_revisions where id=$1',
          [saved.revision_id],
        )
      ).rows[0],
    ).toEqual({ title: payload.title, status: 'published' });
    expect(
      (
        await db.query(
          'select id from public.code_test_cases where revision_id=$1',
          [saved.revision_id],
        )
      ).rows,
    ).toHaveLength(2);
  });

  it('rejects moving a published exercise to another lesson', async () => {
    const saved = await save();
    await publish(saved);
    await expect(
      save({ ...payload, lesson_id: otherLesson }, author, saved.id, 0),
    ).rejects.toMatchObject({ code: 'PT409' });
  });

  it('requires expected version zero to create a new draft', async () => {
    await expect(save(payload, author, null, 1)).rejects.toMatchObject({
      code: 'PT409',
    });
  });

  it('prevents a published pointer from referencing another exercise’s revision', async () => {
    const first = await save();
    const second = await save();
    await expect(
      db.query(
        'update public.code_exercises set published_revision_id=$1 where id=$2',
        [second.revision_id, first.id],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('enables RLS on all three C02 tables', async () => {
    const { rows } = await db.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where oid in ('public.code_exercises'::regclass,'public.code_exercise_revisions'::regclass,'public.code_test_cases'::regclass)",
    );
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.relrowsecurity)).toBe(true);
  });

  it.each(['anon', 'authenticated'])(
    'blocks %s from calling the RPC with a forged actor',
    async (role) => {
      await db.exec(`set local role ${role}`);
      await expect(save(payload, admin)).rejects.toMatchObject({
        code: '42501',
      });
    },
  );

  it.each(
    ['anon', 'authenticated'].flatMap((role) =>
      ['code_exercises', 'code_exercise_revisions', 'code_test_cases'].map(
        (table) => [role, table],
      ),
    ),
  )('blocks %s from directly reading %s', async (role, table) => {
    await db.exec(`set local role ${role}`);
    await expect(
      db.query(`select * from public.${table}`),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('allows the backend service role to create and replace draft tests', async () => {
    await db.exec('set local role service_role');
    const saved = await save();
    expect(await save(payload, author, saved.id, 1)).toMatchObject({
      edit_version: 2,
      status: 'draft',
    });
  });
});
