import { describe, expect, it } from 'vitest';
import { LearnerOverviewService } from './learner-overview.service.js';

type Cell = string | number | boolean | null;
type Row = Record<string, Cell>;
type Dataset = Record<string, Row[]>;
const recent = '2026-11-20T07:00:00Z';
const earlier = '2026-11-19T07:00:00Z';

function seed(): Dataset {
  return {
    courses: [{ id: 'c1', title: 'C#', slug: 'csharp', status: 'published' }],
    chapters: [
      { id: 'ch1', course_id: 'c1', order_index: 1, status: 'published' },
    ],
    lessons: [
      {
        id: 'l1',
        chapter_id: 'ch1',
        title: 'Bài 1',
        order_index: 1,
        status: 'published',
        counts_toward_progress: true,
      },
      {
        id: 'l2',
        chapter_id: 'ch1',
        title: 'Bài 2',
        order_index: 2,
        status: 'published',
        counts_toward_progress: true,
      },
    ],
    quizzes: [
      {
        id: 'q1',
        title: 'Quiz',
        course_id: 'c1',
        chapter_id: 'ch1',
        is_active: true,
        counts_toward_progress: true,
      },
    ],
    code_exercises: [
      {
        id: 'e1',
        lesson_id: 'l1',
        archived_at: null,
        published_revision_id: 'r2',
      },
    ],
    code_exercise_revisions: [
      { id: 'r2', title: 'Bài code', status: 'published' },
    ],
    learner_lesson_progress: [
      {
        learner_id: 'u1',
        lesson_id: 'l1',
        completed_at: recent,
        last_opened_at: recent,
      },
    ],
    quiz_attempts: [
      {
        id: 'a1',
        quiz_id: 'q1',
        user_id: 'u1',
        started_at: earlier,
        completed_at: earlier,
        is_passed: true,
      },
      {
        id: 'a2',
        quiz_id: 'q1',
        user_id: 'u1',
        started_at: recent,
        completed_at: recent,
        is_passed: false,
      },
    ],
    code_exercise_progress: [
      {
        learner_id: 'u1',
        exercise_id: 'e1',
        completed_revision_id: 'r1',
        updated_at: recent,
      },
    ],
  };
}

// Apply filters, stable ordering and a configurable Data API row cap.
// This models the actual row limit rather than returning all fixture rows.
function setup(
  data: Dataset = seed(),
  cap = 1000,
  fail?: { table: string; offset: number },
) {
  const queries: Array<{ table: string; ids: string[]; offset?: number }> = [];
  const from = (table: string) => {
    const filters: Array<(row: Row) => boolean> = [];
    const orders: Array<{ key: string; ascending: boolean }> = [];
    const query: { table: string; ids: string[]; offset?: number } = {
      table,
      ids: [],
    };
    queries.push(query);
    const builder = {
      select: () => builder,
      eq: (key: string, value: Cell) => {
        filters.push((row) => row[key] === value);
        return builder;
      },
      is: (key: string, value: Cell) => {
        filters.push((row) => row[key] === value);
        return builder;
      },
      not: (key: string, op: string, value: Cell) => {
        expect(op).toBe('is');
        filters.push((row) => row[key] !== value);
        return builder;
      },
      in: (key: string, ids: string[]) => {
        expect(ids.length).toBeLessThanOrEqual(100);
        query.ids = ids;
        filters.push((row) => ids.includes(String(row[key])));
        return builder;
      },
      order: (key: string, options?: { ascending?: boolean }) => {
        orders.push({ key, ascending: options?.ascending !== false });
        return builder;
      },
      range: async (start: number, end: number) => {
        query.offset = start;
        if (fail?.table === table && start >= fail.offset)
          return { data: null, error: { message: 'Data API failure' } };
        const rows = (data[table] ?? [])
          .filter((row) => filters.every((filter) => filter(row)))
          .sort((a, b) => {
            for (const order of orders) {
              const left = a[order.key],
                right = b[order.key];
              const compared =
                typeof left === 'number' && typeof right === 'number'
                  ? left - right
                  : String(left).localeCompare(String(right));
              if (compared) return compared * (order.ascending ? 1 : -1);
            }
            return 0;
          });
        return {
          data: rows.slice(start, Math.min(end + 1, start + cap)),
          error: null,
        };
      },
    };
    return builder;
  };
  return {
    service: new LearnerOverviewService({
      getClient: () => ({ from }),
    } as never),
    queries,
  };
}

describe('LearnerOverviewService', () => {
  it('reads a large lesson catalog and progress without exceeding ID batch limits', async () => {
    const data = seed();
    data.quizzes = [];
    data.code_exercises = [];
    data.lessons = Array.from({ length: 1001 }, (_, i) => ({
      id: `lesson-${String(i).padStart(5, '0')}`,
      chapter_id: 'ch1',
      title: `Bài ${i + 1}`,
      order_index: i + 1,
      status: 'published',
      counts_toward_progress: true,
    }));
    data.learner_lesson_progress = [
      {
        learner_id: 'u1',
        lesson_id: 'lesson-01000',
        completed_at: recent,
        last_opened_at: recent,
      },
    ];
    const result = await setup(data, 37).service.getOverview('u1');
    expect(result.summary.lessons).toEqual({ completed: 1, total: 1001 });
  });

  it('fails the overview instead of showing partial progress when a later page fails', async () => {
    const { service } = setup(seed(), 1, { table: 'quiz_attempts', offset: 1 });
    await expect(service.getOverview('u1')).rejects.toMatchObject({
      status: 500,
    });
  });

  it('combines lesson, quiz and current code revision progress without counting retries twice', async () => {
    const { service } = setup();
    const result = await service.getOverview('u1');
    expect(result.summary).toMatchObject({
      completed_units: 2,
      total_units: 4,
      percentage: 50,
      quizzes: { completed: 1, total: 1 },
      code: { completed: 0, total: 1 },
    });
  });

  it('counts code completion only for the published revision', async () => {
    const data = seed();
    data.code_exercise_progress[0].completed_revision_id = 'r2';
    expect(
      (await setup(data).service.getOverview('u1')).summary.code.completed,
    ).toBe(1);
  });

  it('keeps different learners progress separate on every page', async () => {
    const result = await setup(seed(), 1).service.getOverview('other-learner');
    expect(result.summary.completed_units).toBe(0);
    expect(result.summary.started_courses).toBe(0);
    expect(result.continue_learning).toBeNull();
  });

  it.each([1, 37, 1000])(
    'finds a passing attempt beyond 1,000 rows when API cap is %i',
    async (cap) => {
      const data = seed();
      data.quiz_attempts = Array.from({ length: 1001 }, (_, i) => ({
        id: `a${String(i).padStart(5, '0')}`,
        quiz_id: 'q1',
        user_id: 'u1',
        started_at: earlier,
        completed_at: earlier,
        is_passed: false,
      }));
      data.quiz_attempts[1000].is_passed = true;
      data.quiz_attempts[1000].completed_at = recent;
      const { service, queries } = setup(data, cap);
      const result = await service.getOverview('u1');
      expect(result.summary.quizzes).toEqual({ completed: 1, total: 1 });
      expect(
        queries.some((q) => q.table === 'quiz_attempts' && q.offset === 1001),
      ).toBe(true);
    },
  );

  it('paginates content as well as progress and splits large ID filters', async () => {
    const data = seed();
    data.lessons = Array.from({ length: 1001 }, (_, i) => ({
      id: `l${i}`,
      title: `Lesson ${i}`,
      chapter_id: 'ch1',
      order_index: i,
      status: 'published',
      counts_toward_progress: true,
    }));
    data.quizzes = [];
    data.code_exercises = [];
    data.learner_lesson_progress = [
      {
        learner_id: 'u1',
        lesson_id: 'l1000',
        completed_at: recent,
        last_opened_at: recent,
      },
    ];
    const { service, queries } = setup(data, 37);
    const result = await service.getOverview('u1');
    expect(result.summary.lessons).toEqual({ completed: 1, total: 1001 });
    expect(
      queries.filter((q) => q.table === 'learner_lesson_progress').length,
    ).toBeGreaterThan(10);
  });

  it('fails the overview rather than silently publishing partial statistics when a later page fails', async () => {
    const data = seed();
    data.quiz_attempts = Array.from({ length: 501 }, (_, i) => ({
      ...data.quiz_attempts[0],
      id: `attempt-${i}`,
    }));
    await expect(
      setup(data, 1000, {
        table: 'quiz_attempts',
        offset: 500,
      }).service.getOverview('u1'),
    ).rejects.toMatchObject({ status: 500 });
  });

  it('resumes the same recently opened unfinished lesson on dashboard and course page', async () => {
    const data = seed();
    data.quizzes = [];
    data.code_exercises = [];
    data.learner_lesson_progress = [
      {
        learner_id: 'u1',
        lesson_id: 'l2',
        completed_at: null,
        last_opened_at: recent,
      },
    ];
    const result = await setup(data).service.getOverview('u1');
    expect(result.continue_learning?.href).toBe(
      '/learner/courses/csharp/lessons/l2',
    );
    expect(result.courses[0].next).toEqual(result.continue_learning);
  });

  it.each(['lesson', 'quiz'] as const)(
    'tracks an optional %s without adding it to percentage totals',
    async (kind) => {
      const data = seed();
      data.code_exercises = [];
      data.learner_lesson_progress = [];
      data.quiz_attempts = [];
      if (kind === 'lesson') {
        data.quizzes = [];
        data.lessons[0].counts_toward_progress = false;
        data.learner_lesson_progress = [
          {
            learner_id: 'u1',
            lesson_id: 'l1',
            completed_at: null,
            last_opened_at: recent,
          },
        ];
      } else {
        data.quizzes[0].counts_toward_progress = false;
        data.quiz_attempts = [
          {
            id: 'a1',
            user_id: 'u1',
            quiz_id: 'q1',
            started_at: recent,
            completed_at: null,
            is_passed: false,
          },
        ];
      }
      const result = await setup(data).service.getOverview('u1');
      expect(result.summary.started_courses).toBe(1);
      expect(result.summary.completed_units).toBe(0);
      expect(result.summary.total_units).toBe(kind === 'lesson' ? 1 : 2);
      expect(result.continue_learning?.kind).toBe(kind);
      expect(result.continue_learning).toEqual(result.courses[0].next);
      expect(result.courses[0].last_activity_at).toBe(recent);
    },
  );

  it('does not suggest optional content that has never been started after counted content is complete', async () => {
    const data = seed();
    data.quizzes = [];
    data.code_exercises = [];
    data.lessons[1].counts_toward_progress = false;
    const result = await setup(data).service.getOverview('u1');
    expect(result.summary.percentage).toBe(100);
    expect(result.summary.completed_courses).toBe(1);
    expect(result.continue_learning).toBeNull();
  });

  it('advances to the first counted unfinished item when the last activity is completed', async () => {
    const data = seed();
    data.quizzes = [];
    data.code_exercises = [];
    const result = await setup(data).service.getOverview('u1');
    expect(result.continue_learning?.href).toBe(
      '/learner/courses/csharp/lessons/l2',
    );
  });

  it('excludes unpublished content, archived code and inactive or wrongly scoped quizzes', async () => {
    const data = seed();
    data.courses.push({
      id: 'hidden-course',
      title: 'Hidden',
      slug: 'hidden',
      status: 'draft',
    });
    data.chapters.push({
      id: 'hidden-chapter',
      course_id: 'c1',
      order_index: 2,
      status: 'draft',
    });
    data.lessons.push({
      id: 'hidden',
      chapter_id: 'hidden-chapter',
      title: 'Hidden',
      status: 'published',
      order_index: 1,
      counts_toward_progress: true,
    });
    data.quizzes.push(
      { ...data.quizzes[0], id: 'inactive', is_active: false },
      { ...data.quizzes[0], id: 'hidden-q', chapter_id: 'hidden-chapter' },
    );
    data.code_exercises.push({
      ...data.code_exercises[0],
      id: 'archived',
      archived_at: recent,
    });
    expect(
      (await setup(data).service.getOverview('u1')).summary.total_units,
    ).toBe(4);
  });

  it('returns an empty overview with no published courses', async () => {
    const data = seed();
    data.courses = [];
    const result = await setup(data).service.getOverview('u1');
    expect(result.summary.total_units).toBe(0);
    expect(result.summary.percentage).toBe(0);
    expect(result.courses).toEqual([]);
    expect(result.continue_learning).toBeNull();
  });
});
