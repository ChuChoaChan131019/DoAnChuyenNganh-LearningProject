export type AdminAnalyticsRole =
  'all' | 'learner' | 'content_manager' | 'admin';

export interface AdminAnalyticsRange {
  from: string;
  to: string;
  days: number;
  timezone: 'Asia/Ho_Chi_Minh';
}

export interface AdminAnalyticsFilters {
  range: AdminAnalyticsRange;
  role: AdminAnalyticsRole;
}

export interface AdminUsageResponse extends AdminAnalyticsFilters {
  generatedAt: string;
  source: 'analytics_events' | 'learning_history' | 'combined';
  coverage:
    | 'instrumented_events_only'
    | 'learner_learning_activity_only'
    | 'partial_recorded_activity';
  available: boolean;
  metrics: {
    activeUsers: number | null;
    meaningfulActivities: number | null;
    dau: number | null;
    wau: number | null;
    mau: number | null;
    activeUsersDelta: number | null;
    activitiesDelta: number | null;
    dauDelta: number | null;
    wauDelta: number | null;
    mauDelta: number | null;
  };
  daily: Array<{
    date: string;
    dau: number;
    wau: number;
    mau: number;
    activities: number;
  }>;
}

export interface AdminFeatureAnalyticsResponse extends AdminAnalyticsFilters {
  generatedAt: string;
  source: 'analytics_events';
  coverage: 'instrumented_events_only';
  events: Array<{
    event: string;
    uniqueUsers: number;
    totalActions: number;
    deltaPct: number | null;
  }>;
  funnel: {
    available: boolean;
    stages: Array<{
      stage: string;
      users: number;
      conversionPct: number | null;
    }>;
  };
}
