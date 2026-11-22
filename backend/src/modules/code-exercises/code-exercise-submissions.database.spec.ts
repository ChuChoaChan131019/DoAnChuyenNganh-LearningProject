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

const migration = (name: string) =>
  readFileSync(
    new URL(`../../../../database/migrations/${name}`, import.meta.url),
    'utf8',
  );

const author = '00000000-0000-4000-8000-000000000001';
const learnerA = '00000000-0000-4000-8000-000000000002';
const learnerB = '00000000-0000-4000-8000-000000000003';
const course = '00000000-0000-4000-8000-000000000010';
const chapter = '00000000-0000-4000-8000-000000000011';
const lesson = '00000000-0000-4000-8000-000000000012';

const draftPayload = {
  lesson_id: lesson,
  title: 'Tính tổng hai số',
  difficulty: 'easy',
  objective: 'Luyện đọc dữ liệu',
  description: 'Đọc hai số nguyên và in tổng.',
  input_format: 'Hai số nguyên.',
  output_format: 'Tổng.',
  starter_code: 'using System;\n',
  hint_1: 'Gợi ý một',
  hint_2: 'Gợi ý hai',
  hint_3: 'Gợi ý ba',
  test_cases: [
    { input: '2\n3\n', expected_output: '5\n', is_public: true },
    { input: '-2\n3\n', expected_output: '1\n', is_public: false },
  ],
};

let db: PGlite;

async function createPublishedExercise() {
  const saved = await db.query<{ result: { id: string; revision_id: string } }>(
    'select public.save_code_exercise_draft($1::uuid, $2::jsonb, null, 0) as result',
    [author, JSON.stringify(draftPayload)],
  );
  const exercise = saved.rows[0].result;
  await db.query(
    "update public.code_exercise_revisions set status='published' where id=$1",
    [exercise.revision_id],
  );
  await db.query(
    'update public.code_exercises set published_revision_id=$1 where id=$2',
    [exercise.revision_id, exercise.id],
  );
  return exercise;
}

const call = async <T = Record<string, any>>(sql: string, args: unknown[]) =>
  (await db.query<{ result: T }>(sql, args)).rows[0].result;

const submit = (
  learner: string,
  exerciseId: string,
  revisionId: string,
  passed: number,
  code = 'code',
) =>
  call(
    'select public.submit_code_exercise($1::uuid,$2::uuid,$3::uuid,$4::text,$5::integer,$6::integer,$7::jsonb) as result',
    [learner, exerciseId, revisionId, code, 2, passed, '[]'],
  );

const hint = (learner: string, exerciseId: string, level: number) =>
  call(
    'select public.open_code_exercise_hint($1::uuid,$2::uuid,$3::integer) as result',
    [learner, exerciseId, level],
  );

const progress = async (learner: string, exerciseId: string) =>
  (
    await db.query<any>(
      'select status, run_count, highest_hint_level, completed_revision_id, saved_code from public.code_exercise_progress where learner_id=$1 and exercise_id=$2',
      [learner, exerciseId],
    )
  ).rows[0];

async function expectDatabaseError(op: () => Promise<unknown>, code: string) {
  await db.exec('savepoint expected_error');
  let caught: unknown;
  try {
    await op();
  } catch (error) {
    caught = error;
  }
  await db.exec('rollback to savepoint expected_error');
  await db.exec('release savepoint expected_error');
  expect(caught).toMatchObject({ code });
}

describe('C07 submissions, hints and run counter (PostgreSQL)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table public.profiles (id uuid primary key, role text not null);
      create table public.courses (
        id uuid primary key, title varchar(255) not null,
        slug varchar(255) not null, status varchar(20) not null
      );
      create table public.chapters (
        id uuid primary key, course_id uuid not null references public.courses(id),
        title varchar(255) not null, status varchar(20) not null
      );
      create table public.lessons (
        id uuid primary key, chapter_id uuid not null references public.chapters(id),
        title varchar(255) not null, status varchar(20) not null
      );
      insert into public.profiles values
        ('${author}', 'content_manager'),
        ('${learnerA}', 'learner'),
        ('${learnerB}', 'learner');
      insert into public.courses values ('${course}', 'C#', 'c-sharp', 'published');
      insert into public.chapters values ('${chapter}', '${course}', 'Biến', 'published');
      insert into public.lessons values ('${lesson}', '${chapter}', 'Đọc dữ liệu', 'published');
      grant usage on schema public to service_role;
      grant select on public.profiles, public.courses, public.chapters, public.lessons
        to service_role;
    `);
    await db.exec(migration('20261103135132_code_exercises.sql'));
    await db.exec(migration('20261106160000_code_exercise_progress.sql'));
    await db.exec(migration('20261122090000_code_exercise_submissions.sql'));
    // Re-running must be safe.
    await db.exec(migration('20261122090000_code_exercise_submissions.sql'));
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

  it('counts runs per learner and exercise', async () => {
    const ex = await createPublishedExercise();
    const run = (learner: string) =>
      call(
        'select public.record_code_exercise_run($1::uuid,$2::uuid) as result',
        [learner, ex.id],
      );
    await run(learnerA);
    expect(await run(learnerA)).toMatchObject({ run_count: 2 });
    await run(learnerB);
    expect((await progress(learnerA, ex.id)).run_count).toBe(2);
    expect((await progress(learnerB, ex.id)).run_count).toBe(1);
  });

  it('opens hints only in order and remembers the highest level', async () => {
    const ex = await createPublishedExercise();
    await expectDatabaseError(() => hint(learnerA, ex.id, 2), 'PT409');
    expect(await hint(learnerA, ex.id, 1)).toMatchObject({
      hint: 'Gợi ý một',
      highest_hint_level: 1,
    });
    expect(await hint(learnerA, ex.id, 2)).toMatchObject({ hint: 'Gợi ý hai' });
    // Re-opening a lower level does not lower the stored level.
    expect(await hint(learnerA, ex.id, 1)).toMatchObject({
      highest_hint_level: 2,
    });
    await expectDatabaseError(() => hint(learnerA, ex.id, 4), '22023');
    expect((await progress(learnerA, ex.id)).highest_hint_level).toBe(2);
    expect(await progress(learnerB, ex.id)).toBeUndefined();
  });

  it('marks completion only after a fully passed submission', async () => {
    const ex = await createPublishedExercise();
    expect(await submit(learnerA, ex.id, ex.revision_id, 1)).toMatchObject({
      all_passed: false,
      status: 'in_progress',
    });
    expect(await progress(learnerA, ex.id)).toMatchObject({
      status: 'in_progress',
      completed_revision_id: null,
    });
    expect(await submit(learnerA, ex.id, ex.revision_id, 2)).toMatchObject({
      all_passed: true,
      status: 'completed',
    });
    // A later failed attempt keeps the completion.
    await submit(learnerA, ex.id, ex.revision_id, 0);
    expect(await progress(learnerA, ex.id)).toMatchObject({
      status: 'completed',
      completed_revision_id: ex.revision_id,
    });
    expect(
      (
        await db.query<{ n: number }>(
          'select count(*)::int as n from public.code_exercise_submissions where learner_id=$1',
          [learnerA],
        )
      ).rows[0].n,
    ).toBe(3);
    expect(await progress(learnerB, ex.id)).toBeUndefined();
  });

  it('rejects a submission for an outdated revision and non-learners', async () => {
    const ex = await createPublishedExercise();
    await expectDatabaseError(
      () => submit(learnerA, ex.id, '00000000-0000-4000-8000-0000000000ff', 2),
      'PT409',
    );
    await expectDatabaseError(
      () => submit(author, ex.id, ex.revision_id, 2),
      '42501',
    );
    await expectDatabaseError(
      () => submit(learnerA, ex.id, ex.revision_id, 3),
      '22023',
    );
  });
});
