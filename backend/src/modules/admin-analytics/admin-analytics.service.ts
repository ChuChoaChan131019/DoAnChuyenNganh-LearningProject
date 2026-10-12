import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import type {
  AdminAnalyticsFilters,
  AdminFeatureAnalyticsResponse,
  AdminUsageResponse,
} from './admin-analytics.types.js';

const DAY_MS = 86_400_000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

// Chỉ các business actions đã có trong Event Catalog; loại login, page_view và session.
const MEANINGFUL_EVENTS = [
  'enrollment_started',
  'enrollment_left',
  'study_plan_created',
  'study_plan_updated',
  'study_plan_completed',
  'lesson_started',
  'lesson_completed',
  'quiz_started',
  'quiz_completed',
  'exercise_started',
  'exercise_completed',
  'practice_completed',
  'bookmark_added',
  'bookmark_removed',
  'note_created',
  'note_updated',
  'note_deleted',
  'feedback_sent',
  'feedback_received',
  'message_sent',
  'ai_learning_plan_applied',
  'ai_recommendation_accepted',
  'notification_sent',
  'notification_read',
];
const FEATURE_EVENTS = [
  ...MEANINGFUL_EVENTS,
  'course_viewed',
  'material_accessed',
];
const FUNNEL_EVENTS = ['course_viewed', 'enrollment_started', 'lesson_started'];
// Các event này có thể tồn tại ở cả hai bảng. Ưu tiên Learning History cho Learner,
// còn Analytics Events chỉ bổ sung những action khác để tránh đếm hai lần.
const LEARNING_EVENTS = [
  'lesson_started',
  'lesson_completed',
  'quiz_started',
  'quiz_completed',
  'exercise_started',
  'exercise_completed',
  'practice_completed',
];
const LEARNING_EVENT_SET = new Set(LEARNING_EVENTS);
const USAGE_ANALYTICS_EVENTS = MEANINGFUL_EVENTS.filter(
  (event) => !LEARNING_EVENT_SET.has(event),
);

interface EventRow {
  event_name: string;
  user_id: string | null;
  user_role: string | null;
  course_id: string | null;
  occurred_at: string;
}

interface Activity {
  actorId: string | null;
  date: string;
}

const dayNumber = (date: string) =>
  Date.parse(`${date}T00:00:00.000Z`) / DAY_MS;
const dateAt = (day: number) =>
  new Date(day * DAY_MS).toISOString().slice(0, 10);
const vietnamDay = (iso: string) =>
  new Date(new Date(iso).getTime() + VIETNAM_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
const startUtc = (day: number) =>
  new Date(day * DAY_MS - VIETNAM_OFFSET_MS).toISOString();
const unique = (rows: Activity[]) =>
  new Set(rows.map((row) => row.actorId).filter(Boolean)).size;
const delta = (current: number, previous: number): number | null =>
  previous === 0
    ? null
    : Math.round(((current - previous) / previous) * 1000) / 10;

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getUsage(filters: AdminAnalyticsFilters): Promise<AdminUsageResponse> {
    const { range, role } = filters;
    const first = dayNumber(range.from);
    const last = dayNumber(range.to);
    // Cần 2 kỳ liền kề cho delta, thêm 60 ngày cho MAU so với kỳ trước.
    const earliest = Math.min(first - range.days, first - 29, last - 59);
    const analytics = await this.getEvents(
      startUtc(earliest),
      startUtc(last + 1),
      USAGE_ANALYTICS_EVENTS,
    );
    const includeHistory = role === 'all' || role === 'learner';
    const selectedAnalytics = analytics.filter(
      (row) => role === 'all' || row.user_role === role,
    );
    const available = includeHistory || selectedAnalytics.length > 0;
    const source = includeHistory
      ? selectedAnalytics.length > 0
        ? 'combined'
        : 'learning_history'
      : 'analytics_events';
    const coverage =
      source === 'combined'
        ? 'partial_recorded_activity'
        : source === 'learning_history'
          ? 'learner_learning_activity_only'
          : 'instrumented_events_only';
    const generatedAt = new Date().toISOString();

    if (!available) {
      return {
        ...filters,
        generatedAt,
        source,
        coverage,
        available: false,
        metrics: {
          activeUsers: null,
          meaningfulActivities: null,
          dau: null,
          wau: null,
          mau: null,
          activeUsersDelta: null,
          activitiesDelta: null,
          dauDelta: null,
          wauDelta: null,
          mauDelta: null,
        },
        daily: [],
      };
    }

    const history = includeHistory
      ? await this.getLearningHistory(startUtc(earliest), startUtc(last + 1))
      : [];
    const activities: Activity[] = [
      ...selectedAnalytics.map((row) => ({
        actorId: row.user_id,
        date: vietnamDay(row.occurred_at),
      })),
      ...history.map((row) => ({
        actorId: row.learner_id,
        date: vietnamDay(row.occurred_at),
      })),
    ];

    const between = (start: number, end: number) =>
      activities.filter((row) => {
        const day = dayNumber(row.date);
        return day >= start && day <= end;
      });
    const current = between(first, last);
    const previous = between(first - range.days, first - 1);
    const currentDau = unique(between(last, last));
    const currentWau = unique(between(last - 6, last));
    const currentMau = unique(between(last - 29, last));
    const previousDau = unique(between(last - 1, last - 1));
    const previousWau = unique(between(last - 13, last - 7));
    const previousMau = unique(between(last - 59, last - 30));

    return {
      ...filters,
      generatedAt,
      source,
      coverage,
      available: true,
      metrics: {
        activeUsers: unique(current),
        meaningfulActivities: current.length,
        dau: currentDau,
        wau: currentWau,
        mau: currentMau,
        activeUsersDelta: delta(unique(current), unique(previous)),
        activitiesDelta: delta(current.length, previous.length),
        dauDelta: delta(currentDau, previousDau),
        wauDelta: delta(currentWau, previousWau),
        mauDelta: delta(currentMau, previousMau),
      },
      daily: Array.from({ length: range.days }, (_, index) => {
        const day = first + index;
        return {
          date: dateAt(day),
          activities: between(day, day).length,
          dau: unique(between(day, day)),
          wau: unique(between(day - 6, day)),
          mau: unique(between(day - 29, day)),
        };
      }),
    };
  }

  async getFeatures(
    filters: AdminAnalyticsFilters,
  ): Promise<AdminFeatureAnalyticsResponse> {
    const { range, role } = filters;
    const first = dayNumber(range.from);
    const last = dayNumber(range.to);
    const rows = await this.getEvents(
      startUtc(first - range.days),
      startUtc(last + 1),
      FEATURE_EVENTS,
    );
    const selected = rows.filter(
      (row) => role === 'all' || row.user_role === role,
    );
    const inWindow = (start: number, end: number) =>
      selected.filter((row) => {
        const day = dayNumber(vietnamDay(row.occurred_at));
        return day >= start && day <= end;
      });
    const current = inWindow(first, last);
    const previous = inWindow(first - range.days, first - 1);
    const names = new Set(
      [...current, ...previous].map((row) => row.event_name),
    );
    const events = [...names]
      .map((event) => {
        const present = current.filter((row) => row.event_name === event);
        const before = previous.filter((row) => row.event_name === event);
        return {
          event,
          uniqueUsers: new Set(
            present.map((row) => row.user_id).filter(Boolean),
          ).size,
          totalActions: present.length,
          deltaPct: delta(present.length, before.length),
        };
      })
      .sort(
        (a, b) =>
          b.totalActions - a.totalActions || a.event.localeCompare(b.event),
      );

    return {
      ...filters,
      generatedAt: new Date().toISOString(),
      source: 'analytics_events',
      coverage: 'instrumented_events_only',
      events,
      funnel: this.buildFunnel(current, role === 'all' || role === 'learner'),
    };
  }

  private buildFunnel(
    rows: EventRow[],
    learnerIncluded: boolean,
  ): AdminFeatureAnalyticsResponse['funnel'] {
    const eligible = rows.filter(
      (row) =>
        row.user_role === 'learner' &&
        row.user_id &&
        row.course_id &&
        FUNNEL_EVENTS.includes(row.event_name),
    );
    const tracked = new Set(eligible.map((row) => row.event_name));
    if (
      !learnerIncluded ||
      !FUNNEL_EVENTS.every((event) => tracked.has(event))
    ) {
      return { available: false, stages: [] };
    }

    const byJourney = new Map<string, EventRow[]>();
    for (const row of eligible) {
      const key = `${row.user_id}:${row.course_id}`;
      byJourney.set(key, [...(byJourney.get(key) ?? []), row]);
    }
    const stageUsers = FUNNEL_EVENTS.map(() => new Set<string>());
    for (const journey of byJourney.values()) {
      journey.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
      let stage = 0;
      for (const row of journey) {
        if (row.event_name === FUNNEL_EVENTS[stage]) {
          stageUsers[stage].add(row.user_id!);
          stage += 1;
          if (stage === FUNNEL_EVENTS.length) break;
        }
      }
    }
    const labels = ['Xem khóa học', 'Bắt đầu đăng ký', 'Bắt đầu học'];
    return {
      available: true,
      stages: labels.map((stage, index) => ({
        stage,
        users: stageUsers[index].size,
        conversionPct:
          index === 0 || stageUsers[index - 1].size === 0
            ? null
            : Math.round(
                (stageUsers[index].size / stageUsers[index - 1].size) * 1000,
              ) / 10,
      })),
    };
  }

  private async getEvents(
    from: string,
    to: string,
    names: string[],
  ): Promise<EventRow[]> {
    const client = this.supabaseService.getAdminClient();
    const rows: EventRow[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const result = await client
        .from('analytics_events')
        .select('event_name, user_id, user_role, course_id, occurred_at')
        .in('event_name', names)
        .gte('occurred_at', from)
        .lt('occurred_at', to)
        .order('occurred_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      this.assertNoError(result.error, 'analytics_events');
      rows.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < PAGE_SIZE) break;
    }
    return rows;
  }

  private async getLearningHistory(
    from: string,
    to: string,
  ): Promise<
    Array<{
      learner_id: string;
      activity_type: string;
      occurred_at: string;
    }>
  > {
    const client = this.supabaseService.getAdminClient();
    const rows: Array<{
      learner_id: string;
      activity_type: string;
      occurred_at: string;
    }> = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const result = await client
        .from('learning_history')
        .select('learner_id, activity_type, occurred_at')
        .in('activity_type', LEARNING_EVENTS)
        .gte('occurred_at', from)
        .lt('occurred_at', to)
        .order('occurred_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      this.assertNoError(result.error, 'learning_history');
      rows.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < PAGE_SIZE) break;
    }
    return rows;
  }

  private assertNoError(
    error: { message: string } | null,
    source: string,
  ): void {
    if (!error) return;
    this.logger.error(
      `Admin analytics query failed for ${source}: ${error.message}`,
    );
    throw new InternalServerErrorException(
      `Unable to load Admin analytics ${source}`,
    );
  }
}
