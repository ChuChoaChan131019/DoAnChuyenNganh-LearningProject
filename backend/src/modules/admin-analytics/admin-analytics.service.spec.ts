import { BadRequestException } from '@nestjs/common';
import { AdminAnalyticsController } from './admin-analytics.controller.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import type { SupabaseService } from '../../config/supabase.service.js';
import type { AdminAnalyticsFilters } from './admin-analytics.types.js';

const filters: AdminAnalyticsFilters = {
  role: 'learner',
  range: {
    from: '2026-10-01',
    to: '2026-10-07',
    days: 7,
    timezone: 'Asia/Ho_Chi_Minh',
  },
};

function serviceWithRows(
  analytics: Array<Record<string, unknown>>,
  history: Array<Record<string, unknown>> = [],
) {
  const tables = { analytics_events: analytics, learning_history: history };
  const from = (name: keyof typeof tables) => {
    let selectedColumn: string | null = null;
    let selectedValues: string[] = [];
    const query = {
      select: () => query,
      in: (column: string, values: string[]) => {
        selectedColumn = column;
        selectedValues = values;
        return query;
      },
      gte: () => query,
      lt: () => query,
      order: () => query,
      range: async () => ({
        data: tables[name].filter((row) =>
          selectedColumn
            ? selectedValues.includes(String(row[selectedColumn]))
            : true,
        ),
        error: null,
      }),
    };
    return query;
  };
  const supabase = {
    getAdminClient: () => ({ from }),
  } as unknown as SupabaseService;
  return new AdminAnalyticsService(supabase);
}

describe('AdminAnalyticsService', () => {
  it('uses real learning activity only as a labelled Learner fallback', async () => {
    const service = serviceWithRows(
      [],
      [
        {
          learner_id: 'a',
          activity_type: 'lesson_completed',
          occurred_at: '2026-10-06T18:00:00Z',
        },
        {
          learner_id: 'a',
          activity_type: 'quiz_completed',
          occurred_at: '2026-10-07T01:00:00Z',
        },
        {
          learner_id: 'b',
          activity_type: 'practice_completed',
          occurred_at: '2026-10-07T02:00:00Z',
        },
      ],
    );
    const result = await service.getUsage(filters);
    expect(result.source).toBe('learning_history');
    expect(result.coverage).toBe('learner_learning_activity_only');
    expect(result.metrics.activeUsers).toBe(2);
    expect(result.metrics.meaningfulActivities).toBe(3);
    expect(result.metrics.dau).toBe(2);
    expect(result.metrics.wau).toBe(2);
    expect(result.metrics.activeUsersDelta).toBeNull();
    expect(result.daily).toHaveLength(7);
    expect(result.daily.at(-1)?.activities).toBe(3);
  });

  it('does not pretend fallback Learner history covers Admin activity', async () => {
    const result = await serviceWithRows([]).getUsage({
      ...filters,
      role: 'admin',
    });
    expect(result.available).toBe(false);
    expect(result.metrics.activeUsers).toBeNull();
  });

  it('combines recorded actions without double-counting Learner learning events', async () => {
    const service = serviceWithRows(
      [
        {
          event_name: 'lesson_completed',
          user_id: 'a',
          user_role: 'learner',
          course_id: 'course-a',
          occurred_at: '2026-10-02T01:00:00Z',
        },
        {
          event_name: 'study_plan_created',
          user_id: 'a',
          user_role: 'learner',
          course_id: null,
          occurred_at: '2026-10-02T02:00:00Z',
        },
      ],
      [
        {
          learner_id: 'a',
          activity_type: 'lesson_completed',
          occurred_at: '2026-10-02T01:00:00Z',
        },
      ],
    );
    const result = await service.getUsage(filters);
    expect(result.source).toBe('combined');
    expect(result.coverage).toBe('partial_recorded_activity');
    expect(result.metrics.meaningfulActivities).toBe(2);
    expect(result.metrics.activeUsers).toBe(1);
  });

  it('counts feature actions, unique users and ordered enrollment journeys', async () => {
    const event = (
      event_name: string,
      user_id: string,
      occurred_at: string,
    ) => ({
      event_name,
      user_id,
      user_role: 'learner',
      course_id: 'course-a',
      occurred_at,
    });
    const service = serviceWithRows([
      event('lesson_completed', 'a', '2026-09-29T02:00:00Z'),
      event('course_viewed', 'a', '2026-10-02T01:00:00Z'),
      event('enrollment_started', 'a', '2026-10-02T02:00:00Z'),
      event('lesson_started', 'a', '2026-10-02T03:00:00Z'),
      event('lesson_completed', 'a', '2026-10-02T04:00:00Z'),
      event('lesson_completed', 'a', '2026-10-03T04:00:00Z'),
      event('lesson_completed', 'b', '2026-10-03T04:00:00Z'),
    ]);
    const features = await service.getFeatures(filters);
    expect(
      features.events.find((row) => row.event === 'lesson_completed'),
    ).toEqual({
      event: 'lesson_completed',
      uniqueUsers: 2,
      totalActions: 3,
      deltaPct: 200,
    });
    expect(features.funnel.available).toBe(true);
    expect(features.funnel.stages.map((stage) => stage.users)).toEqual([
      1, 1, 1,
    ]);
    expect(features.funnel.stages[1].conversionPct).toBe(100);
  });

  it('rejects invalid filters before querying data', () => {
    const controller = new AdminAnalyticsController(serviceWithRows([]));
    expect(() => controller.getUsage('91')).toThrow(BadRequestException);
    expect(() =>
      controller.getUsage(undefined, '2026-10-01', '2026-10-02', 'unknown'),
    ).toThrow(BadRequestException);
    expect(() =>
      controller.getUsage(undefined, '2026-02-30', '2026-03-01'),
    ).toThrow(BadRequestException);
    expect(() =>
      controller.getUsage(undefined, '2026-01-01', '2026-10-01'),
    ).toThrow(BadRequestException);
  });
});
