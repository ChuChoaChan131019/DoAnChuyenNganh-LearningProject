import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import type { AdminDashboardResponse } from './admin-dashboard.types.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;
const MEANINGFUL_LEARNING_EVENTS = new Set([
  'lesson_started',
  'lesson_completed',
  'quiz_started',
  'quiz_completed',
  'practice_completed',
  'exercise_started',
  'exercise_completed',
]);

interface LearningActivityRow {
  learner_id: string;
  activity_type: string;
  occurred_at: string;
}

interface NotificationRow {
  id: string;
  status: string;
}

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getDashboard(days: 7 | 30 | 90): Promise<AdminDashboardResponse> {
    const client = this.supabaseService.getAdminClient();
    const now = new Date();
    const today = new Date(now.getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
    const todayStart = new Date(`${today}T00:00:00+07:00`);
    const startOf = (windowDays: number) =>
      new Date(todayStart.getTime() - (windowDays - 1) * DAY_MS);
    const rangeStart = startOf(days);

    const [total, learners, managers, admins, newAccounts, recent] = await Promise.all([
      client.from('profiles').select('id', { count: 'exact', head: true }),
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'learner'),
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'content_manager'),
      client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
      client.from('profiles').select('id', { count: 'exact', head: true })
        .gte('created_at', rangeStart.toISOString()).lte('created_at', now.toISOString()),
      client.from('profiles').select('id, role, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    for (const result of [total, learners, managers, admins, newAccounts, recent]) {
      this.assertNoError(result.error, 'profiles');
    }

    const [activities, notifications] = await Promise.all([
      this.getLearningActivities(startOf(Math.max(days, 30)).toISOString(), now.toISOString()),
      this.getAdminNotifications(),
    ]);

    const meaningful = activities.filter((row) => MEANINGFUL_LEARNING_EVENTS.has(row.activity_type));
    const uniqueUsersSince = (start: Date) =>
      new Set(meaningful.filter((row) => new Date(row.occurred_at) >= start).map((row) => row.learner_id)).size;
    const inRange = meaningful.filter((row) => new Date(row.occurred_at) >= rangeStart);
    const daily = Array.from({ length: days }, (_, index) => {
      const date = new Date(rangeStart.getTime() + index * DAY_MS + VIETNAM_OFFSET_MS)
        .toISOString().slice(0, 10);
      const rows = inRange.filter((row) =>
        new Date(new Date(row.occurred_at).getTime() + VIETNAM_OFFSET_MS)
          .toISOString().slice(0, 10) === date,
      );
      return {
        date,
        activities: rows.length,
        activeUsers: new Set(rows.map((row) => row.learner_id)).size,
      };
    });

    const recentRegistrations = await Promise.all((recent.data ?? []).map(async (profile) => {
      const { data, error } = await client.auth.admin.getUserById(profile.id);
      if (error) this.logger.warn(`Could not resolve recent user ${profile.id}: ${error.message}`);
      const user = data?.user;
      const fullName = user?.user_metadata?.full_name;
      return {
        id: profile.id,
        name: typeof fullName === 'string' && fullName.trim()
          ? fullName.trim()
          : user?.email?.split('@')[0] ?? 'Người dùng',
        email: user?.email ?? null,
        role: profile.role as 'learner' | 'content_manager' | 'admin',
        createdAt: profile.created_at,
      };
    }));

    let readRecipients = 0;
    for (let index = 0; index < notifications.length; index += 100) {
      const ids = notifications.slice(index, index + 100).map((row) => row.id);
      const result = await client.from('notification_recipients')
        .select('id', { count: 'exact', head: true })
        .in('notification_id', ids)
        .not('read_at', 'is', null);
      this.assertNoError(result.error, 'notification_recipients');
      readRecipients += result.count ?? 0;
    }

    return {
      rangeDays: days,
      generatedAt: now.toISOString(),
      accounts: {
        total: total.count ?? 0,
        byRole: {
          learner: learners.count ?? 0,
          contentManager: managers.count ?? 0,
          admin: admins.count ?? 0,
        },
        newInRange: newAccounts.count ?? 0,
      },
      activity: {
        source: 'learning_history',
        coverage: 'learner_learning_activity_only',
        activeUsers: uniqueUsersSince(rangeStart),
        meaningfulActivities: inRange.length,
        dau: uniqueUsersSince(todayStart),
        wau: uniqueUsersSince(startOf(7)),
        mau: uniqueUsersSince(startOf(30)),
        daily,
      },
      aiUsage: { totalCalls: null, reason: 'telemetry_not_available' },
      systemStatus: { apiAvailable: true, uptime30d: null },
      notifications: {
        sent: notifications.filter((row) => row.status === 'sent').length,
        scheduled: notifications.filter((row) => row.status === 'scheduled').length,
        cancelled: notifications.filter((row) => row.status === 'cancelled').length,
        readRecipients,
      },
      recentRegistrations,
    };
  }

  private async getLearningActivities(from: string, through: string): Promise<LearningActivityRow[]> {
    const client = this.supabaseService.getAdminClient();
    const rows: LearningActivityRow[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const result = await client.from('learning_history')
        .select('learner_id, activity_type, occurred_at')
        .gte('occurred_at', from)
        .lte('occurred_at', through)
        .order('occurred_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      this.assertNoError(result.error, 'learning_history');
      rows.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < PAGE_SIZE) break;
    }
    return rows;
  }

  private async getAdminNotifications(): Promise<NotificationRow[]> {
    const client = this.supabaseService.getAdminClient();
    const rows: NotificationRow[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const result = await client.from('notifications')
        .select('id, status')
        .eq('notification_type', 'system')
        .like('reference_type', 'admin-system:%')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      this.assertNoError(result.error, 'notifications');
      rows.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < PAGE_SIZE) break;
    }
    return rows;
  }

  private assertNoError(error: { message: string } | null, source: string): void {
    if (!error) return;
    this.logger.error(`Admin Dashboard query failed for ${source}: ${error.message}`);
    throw new InternalServerErrorException(`Unable to load Admin Dashboard ${source}`);
  }
}
