import { PGlite } from '@electric-sql/pglite';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { StatisticsService } from './statistics.service.js';

let db: PGlite;
let service: StatisticsService;
let failedTable: string | undefined;

// Execute real COUNT queries, rather than returning fixture counts. No data rows
// are fetched, so the test also prevents a regression to capped list responses.
function from(table: string) {
  const predicates: string[] = [];
  const values: unknown[] = [];
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const query = {
    select(columns: string, options: unknown) {
      expect(columns).toBe('id');
      expect(options).toEqual({ count: 'exact', head: true });
      return query;
    },
    eq(column: string, value: unknown) {
      predicates.push(`${column} = ${bind(value)}`);
      return query;
    },
    in(column: string, choices: unknown[]) {
      predicates.push(`${column} in (${choices.map(bind).join(',')})`);
      return query;
    },
    is(column: string, value: unknown) {
      expect(value).toBeNull();
      predicates.push(`${column} is null`);
      return query;
    },
    gte(column: string, value: unknown) {
      predicates.push(`${column} >= ${bind(value)}`);
      return query;
    },
    lt(column: string, value: unknown) {
      predicates.push(`${column} < ${bind(value)}`);
      return query;
    },
  };
  async function run() {
    if (table === failedTable)
      return { count: null, error: { message: 'Test database failure' } };
    const result = await db.query<{ count: number }>(
      `select count(*)::integer as count from public.${table}${predicates.length ? ` where ${predicates.join(' and ')}` : ''}`,
      values,
    );
    return { count: result.rows[0].count, error: null };
  }
  // oxlint-disable-next-line unicorn/no-thenable -- PostgREST query builders are PromiseLike.
  Object.defineProperty(query, 'then', {
    value: (
      resolve: (value: unknown) => unknown,
      reject: (error: unknown) => unknown,
    ) => run().then(resolve, reject),
  });
  return query;
}

describe('Content Manager statistics (isolated PostgreSQL)', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create table public.courses(id uuid primary key default gen_random_uuid(), level text, status text default 'draft', created_at timestamptz default now());
      create table public.chapters(id uuid primary key default gen_random_uuid(), status text default 'draft');
      create table public.lessons(id uuid primary key default gen_random_uuid(), status text default 'draft', is_ai_generated boolean default false, created_at timestamptz default now());
      create table public.questions(id uuid primary key default gen_random_uuid(), status text default 'draft', difficulty text, is_ai_generated boolean default false, generated_for_user_id uuid, created_at timestamptz default now());
    `);
    service = new StatisticsService({ getClient: () => ({ from }) } as never);
  }, 30_000);
  afterAll(async () => {
    await db?.close();
  });
  beforeEach(async () => {
    failedTable = undefined;
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-08T14:00:00Z'));
    await db.exec('begin');
  });
  afterEach(async () => {
    await db.exec('rollback');
    vi.restoreAllMocks();
  });

  it('returns zeros for an empty database, including all chart categories', async () => {
    const result = await service.getContentManagerDashboard();
    expect(result.overview).toEqual({
      totalCourses: 0,
      totalLessons: 0,
      totalQuestions: 0,
      totalAiGenerated: 0,
      aiLessons: 0,
      aiQuestions: 0,
    });
    expect(result.status).toEqual({ draft: 0, approved: 0, published: 0 });
    expect(result.questionDifficulty).toEqual({ easy: 0, medium: 0, hard: 0 });
    expect(result.courseLevels).toEqual({
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    });
    expect(result.growth).toHaveLength(6);
    expect(
      result.growth.every(
        (row) =>
          row.questions === 0 &&
          row.aiQuestions === 0 &&
          row.manualQuestions === 0,
      ),
    ).toBe(true);
  });

  it('counts lowercase database course levels and legacy title-case values', async () => {
    await db.exec(
      "insert into courses(level) values ('beginner'),('intermediate'),('advanced'),('Advanced')",
    );
    const result = await service.getContentManagerDashboard();
    expect(result.courseLevels).toEqual({
      beginner: 1,
      intermediate: 1,
      advanced: 2,
    });
    expect(result.overview.totalCourses).toBe(4);
  });

  it('counts all 1,501 questions in overview, difficulty and monthly AI/manual charts', async () => {
    await db.exec(`insert into questions(difficulty,is_ai_generated,created_at)
      select 'hard', true, '2026-11-08T00:00:00Z' from generate_series(1,1001);
      insert into questions(difficulty,is_ai_generated,created_at)
      select 'easy', false, '2026-11-08T00:00:00Z' from generate_series(1,500);`);
    const result = await service.getContentManagerDashboard();
    expect(result.overview.totalQuestions).toBe(1501);
    expect(result.questionDifficulty).toEqual({
      easy: 500,
      medium: 0,
      hard: 1001,
    });
    expect(result.growth.at(-1)).toMatchObject({
      month: '11/2026',
      questions: 1501,
      aiQuestions: 1001,
      manualQuestions: 500,
    });
  });

  it('excludes learner-private questions from every statistic', async () => {
    await db.exec(`insert into questions(difficulty,is_ai_generated,generated_for_user_id,created_at) values
      ('hard',true,'00000000-0000-4000-8000-000000000001','2026-11-08T00:00:00Z'),
      ('easy',false,null,'2026-11-08T00:00:00Z');`);
    const result = await service.getContentManagerDashboard();
    expect(result.overview).toMatchObject({
      totalQuestions: 1,
      aiQuestions: 0,
      totalAiGenerated: 0,
    });
    expect(result.questionDifficulty).toEqual({ easy: 1, medium: 0, hard: 0 });
    expect(result.growth.at(-1)).toMatchObject({
      questions: 1,
      aiQuestions: 0,
      manualQuestions: 1,
    });
  });

  it('keeps approved, rejected and draft shared questions in the bank totals', async () => {
    await db.exec(
      "insert into questions(difficulty,status) values ('easy','approved'),('medium','rejected'),('hard','draft')",
    );
    const result = await service.getContentManagerDashboard();
    expect(result.overview.totalQuestions).toBe(3);
    expect(result.questionDifficulty).toEqual({ easy: 1, medium: 1, hard: 1 });
  });

  it('counts status only across courses, chapters and lessons', async () => {
    await db.exec(`insert into courses(status) values ('published');
      insert into chapters(status) values ('approved'),('draft');
      insert into lessons(status,is_ai_generated) values ('draft',true);
      insert into questions(status,is_ai_generated) values ('draft',true);`);
    const result = await service.getContentManagerDashboard();
    expect(result.status).toEqual({ draft: 2, approved: 1, published: 1 });
    expect(result.overview).toMatchObject({
      aiLessons: 1,
      aiQuestions: 1,
      totalAiGenerated: 2,
    });
  });

  it('assigns Vietnam month-boundary timestamps without double counting', async () => {
    await db.exec(`insert into questions(difficulty,is_ai_generated,created_at) values
      ('easy',false,'2026-10-31T16:59:59.999Z'),
      ('medium',true,'2026-10-31T17:00:00Z'),
      ('hard',false,'2026-11-30T17:00:00Z');`);
    const result = await service.getContentManagerDashboard();
    expect(result.growth.at(-2)).toMatchObject({
      month: '10/2026',
      questions: 1,
      aiQuestions: 0,
      manualQuestions: 1,
    });
    expect(result.growth.at(-1)).toMatchObject({
      month: '11/2026',
      questions: 1,
      aiQuestions: 1,
      manualQuestions: 0,
    });
  });

  it('returns six months in chronological order across the Vietnam new year', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-12-31T17:00:00Z'));
    const result = await service.getContentManagerDashboard();
    expect(result.growth.map((row) => row.month)).toEqual([
      '08/2026',
      '09/2026',
      '10/2026',
      '11/2026',
      '12/2026',
      '01/2027',
    ]);
  });

  it('keeps old questions in totals while excluding them from six-month growth', async () => {
    await db.exec(
      "insert into questions(difficulty,created_at) values ('medium','2026-01-01T00:00:00Z')",
    );
    const result = await service.getContentManagerDashboard();
    expect(result.overview.totalQuestions).toBe(1);
    expect(result.questionDifficulty.medium).toBe(1);
    expect(result.growth.reduce((total, row) => total + row.questions, 0)).toBe(
      0,
    );
  });

  it('treats a legacy null AI flag as manual, keeping monthly totals consistent', async () => {
    await db.exec(
      "insert into questions(difficulty,is_ai_generated,created_at) values ('medium',null,'2026-11-08T00:00:00Z')",
    );
    expect(
      (await service.getContentManagerDashboard()).growth.at(-1),
    ).toMatchObject({ questions: 1, aiQuestions: 0, manualQuestions: 1 });
  });

  it.each(['courses', 'chapters', 'lessons', 'questions'])(
    'reports a %s query failure instead of fake zeros',
    async (table) => {
      failedTable = table;
      await expect(service.getContentManagerDashboard()).rejects.toMatchObject({
        status: 500,
      });
    },
  );
});
