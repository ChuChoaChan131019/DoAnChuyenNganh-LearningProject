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

const authoringMigration = readFileSync(
  new URL(
    '../../../../database/migrations/20261103135132_code_exercises.sql',
    import.meta.url,
  ),
  'utf8',
);
const progressMigration = readFileSync(
  new URL(
    '../../../../database/migrations/20261106160000_code_exercise_progress.sql',
    import.meta.url,
  ),
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
  input_format: 'Hai số nguyên, mỗi số trên một dòng.',
  output_format: 'Tổng của hai số.',
  starter_code: 'using System;\n',
  test_cases: [
    { input: '2\n3\n', expected_output: '5\n', is_public: true },
    { input: '-2\n3\n', expected_output: '1\n', is_public: false },
  ],
};

type SavedDraft = { id: string; revision_id: string };
let db: PGlite;

async function createPublishedExercise(payload = draftPayload) {
  const saved = await db.query<{ result: SavedDraft }>(
    'select public.save_code_exercise_draft($1::uuid, $2::jsonb, null, 0) as result',
    [author, JSON.stringify(payload)],
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

async function saveCode(
  learnerId: string,
  exerciseId: string,
  code: string,
  version = 0,
) {
  const result = await db.query<{ result: {
    exercise_id: string;
    save_version: number;
    updated_at: string;
  } }>(
    'select public.save_learner_code_progress($1::uuid,$2::uuid,$3::text,$4::integer) as result',
    [learnerId, exerciseId, code, version],
  );
  return result.rows[0].result;
}

async function expectDatabaseError(
  operation: () => Promise<unknown>,
  code: string,
) {
  await db.exec('savepoint expected_error');
  let caught: unknown;
  try {
    await operation();
  } catch (error) {
    caught = error;
  }
  await db.exec('rollback to savepoint expected_error');
  await db.exec('release savepoint expected_error');
  expect(caught).toMatchObject({ code });
}

describe('C06 learner code progress migration (PostgreSQL)', () => {
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
      insert into public.courses values
        ('${course}', 'C# cơ bản', 'csharp-co-ban', 'published');
      insert into public.chapters values
        ('${chapter}', '${course}', 'Biến và kiểu dữ liệu', 'published');
      insert into public.lessons values
        ('${lesson}', '${chapter}', 'Đọc dữ liệu', 'published');
      grant usage on schema public to service_role;
      grant select on public.profiles, public.courses, public.chapters, public.lessons
        to service_role;
    `);
    await db.exec(authoringMigration);
    await db.exec(progressMigration);

    const baseline = await createPublishedExercise({
      ...draftPayload,
      title: 'Bài giữ dữ liệu khi chạy lại migration',
    });
    await saveCode(learnerA, baseline.id, 'Console.WriteLine(1);');
    await db.exec(progressMigration);
    expect(
      (
        await db.query(
          'select saved_code from public.code_exercise_progress where learner_id=$1 and exercise_id=$2',
          [learnerA, baseline.id],
        )
      ).rows[0],
    ).toEqual({ saved_code: 'Console.WriteLine(1);' });
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

  it('stores and updates the latest code with optimistic versions', async () => {
    const exercise = await createPublishedExercise();
    expect(await saveCode(learnerA, exercise.id, 'first')).toMatchObject({
      exercise_id: exercise.id,
      save_version: 1,
    });
    expect(await saveCode(learnerA, exercise.id, '', 1)).toMatchObject({
      save_version: 2,
    });
    expect(
      (
        await db.query(
          'select saved_code, save_version from public.code_exercise_progress where learner_id=$1 and exercise_id=$2',
          [learnerA, exercise.id],
        )
      ).rows[0],
    ).toEqual({ saved_code: '', save_version: 2 });
  });

  it('keeps code isolated for two learners on the same exercise', async () => {
    const exercise = await createPublishedExercise();
    await saveCode(learnerA, exercise.id, 'code A');
    await saveCode(learnerB, exercise.id, 'code B');
    expect(
      (
        await db.query(
          'select learner_id, saved_code from public.code_exercise_progress where exercise_id=$1 order by learner_id',
          [exercise.id],
        )
      ).rows,
    ).toEqual([
      { learner_id: learnerA, saved_code: 'code A' },
      { learner_id: learnerB, saved_code: 'code B' },
    ]);
  });

  it('rejects a stale tab instead of overwriting newer code', async () => {
    const exercise = await createPublishedExercise();
    await saveCode(learnerA, exercise.id, 'newest');
    await expect(saveCode(learnerA, exercise.id, 'stale', 0))
      .rejects.toMatchObject({ code: 'PT409' });
  });

  it('rejects non-learners and unavailable exercises', async () => {
    const exercise = await createPublishedExercise();
    await expectDatabaseError(
      () => saveCode(author, exercise.id, 'forged'),
      '42501',
    );
    await db.query(
      'update public.code_exercises set archived_at=now() where id=$1',
      [exercise.id],
    );
    await expectDatabaseError(
      () => saveCode(learnerA, exercise.id, 'late'),
      'P0002',
    );
  });

  it('lists only published exercises with learner-specific status', async () => {
    const first = await createPublishedExercise();
    const second = await createPublishedExercise({
      ...draftPayload,
      title: 'Kiểm tra số chẵn',
      difficulty: 'medium',
    });
    await saveCode(learnerA, first.id, 'in progress');

    const result = await db.query<{
      id: string;
      title: string;
      progress_status: string;
    }>(
      'select id,title,progress_status from public.list_learner_code_exercises($1::uuid,null,null,null,null,null,null,null,null,20)',
      [learnerA],
    );
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: first.id, progress_status: 'in_progress' }),
      expect.objectContaining({ id: second.id, progress_status: 'not_started' }),
    ]));

    await expectDatabaseError(
      () => db.query(
        'select * from public.list_learner_code_exercises($1::uuid,null,$2::uuid,$3::uuid,null,null,null,null,null,20)',
        [learnerA, learnerA, chapter],
      ),
      '22023',
    );
  });

  it('enforces revision ownership and progress constraints', async () => {
    const first = await createPublishedExercise();
    const second = await createPublishedExercise({
      ...draftPayload,
      title: 'Bài khác',
    });
    await saveCode(learnerA, first.id, 'code');
    await expectDatabaseError(
      () => db.query(
        'update public.code_exercise_progress set last_seen_revision_id=$1 where learner_id=$2 and exercise_id=$3',
        [second.revision_id, learnerA, first.id],
      ),
      '23503',
    );
    await expectDatabaseError(
      () => db.query(
        'update public.code_exercise_progress set highest_hint_level=4 where learner_id=$1 and exercise_id=$2',
        [learnerA, first.id],
      ),
      '23514',
    );
  });

  it('enables RLS and blocks browser roles from table and RPC access', async () => {
    expect(
      (
        await db.query<{ relrowsecurity: boolean }>(
          "select relrowsecurity from pg_class where oid='public.code_exercise_progress'::regclass",
        )
      ).rows[0].relrowsecurity,
    ).toBe(true);

    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set local role ${role}`);
      await expectDatabaseError(
        () => db.query('select * from public.code_exercise_progress'),
        '42501',
      );
      await expectDatabaseError(
        () => db.query(
          'select public.save_learner_code_progress($1::uuid,$2::uuid,$3::text,0)',
          [learnerA, learnerA, 'forged'],
        ),
        '42501',
      );
      await db.exec('reset role');
    }
  });
});
