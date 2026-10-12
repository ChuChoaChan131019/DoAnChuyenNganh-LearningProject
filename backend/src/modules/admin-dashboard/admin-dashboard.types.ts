export interface AdminDashboardResponse {
  rangeDays: 7 | 30 | 90;
  generatedAt: string;
  accounts: {
    total: number;
    byRole: { learner: number; contentManager: number; admin: number };
    newInRange: number;
  };
  activity: {
    source: 'learning_history';
    coverage: 'learner_learning_activity_only';
    activeUsers: number;
    meaningfulActivities: number;
    dau: number;
    wau: number;
    mau: number;
    daily: Array<{ date: string; activities: number; activeUsers: number }>;
  };
  aiUsage: { totalCalls: null; reason: 'telemetry_not_available' };
  systemStatus: { apiAvailable: true; uptime30d: null };
  notifications: {
    sent: number;
    scheduled: number;
    cancelled: number;
    readRecipients: number;
  };
  recentRegistrations: Array<{
    id: string;
    name: string;
    email: string | null;
    role: 'learner' | 'content_manager' | 'admin';
    createdAt: string;
  }>;
}
