// Dữ liệu mẫu dùng chung cho các trang Admin.
// Sinh từ seed cố định nên render giống nhau giữa server và client.
// Khi backend có endpoint analytics, thay các hàm dưới đây bằng lời gọi API.
import { format, subDays } from 'date-fns';

export type RoleFilter = 'all' | 'learner' | 'content_manager' | 'admin';

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DailyPoint {
  date: string; // yyyy-MM-dd
  dau: number;
  wau: number;
  mau: number;
  activities: number;
  aiCalls: number;
}

const rand = mulberry32(20260917);
const MOCK_NOW = new Date('2026-09-18T08:00:00+07:00');

export const dailySeries: DailyPoint[] = Array.from({ length: 90 }, (_, i) => {
  const d = subDays(MOCK_NOW, 89 - i);
  const weekend = d.getDay() === 0 || d.getDay() === 6 ? 0.72 : 1;
  const drift = 1 + i * 0.004;
  const noise = 0.92 + rand() * 0.16;
  const dau = Math.round(1860 * drift * weekend * noise);
  const wau = Math.round(dau * (2.55 + rand() * 0.3));
  const mau = Math.round(dau * (4.1 + rand() * 0.5));
  const activities = Math.round(dau * (8.6 + rand() * 2.4));
  const aiCalls = Math.round(dau * (4.8 + rand() * 1.6));
  return { date: format(d, 'yyyy-MM-dd'), dau, wau, mau, activities, aiCalls };
});

export const ACCOUNT_COUNTS = {
  total: 12847,
  learner: 10617,
  content_manager: 2184,
  admin: 46,
} as const;

const ROLE_SHARE: Record<RoleFilter, number> = {
  all: 1,
  learner: 0.76,
  content_manager: 0.17,
  admin: 0.07,
};

export interface UsageTotals {
  activeUsers: number;
  meaningfulActivities: number;
  dau: number;
  wau: number;
  mau: number;
  dauDelta: number;
  activitiesDelta: number;
  wauDelta: number;
  mauDelta: number;
  aiCalls: number;
  aiDelta: number;
  newAccounts: number;
}

function avg(rows: DailyPoint[], key: keyof Pick<DailyPoint, 'dau' | 'wau' | 'mau'>) {
  if (!rows.length) return 0;
  return rows.reduce((s, r) => s + r[key], 0) / rows.length;
}

function deltaPct(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export function getUsageTotals(rangeDays: number, role: RoleFilter = 'all'): UsageTotals {
  const share = ROLE_SHARE[role];
  const window = dailySeries.slice(-rangeDays);
  const prev = dailySeries.slice(-rangeDays * 2, -rangeDays);
  const scale = (n: number) => Math.round(n * share);

  const dau = avg(window, 'dau');
  const wau = avg(window, 'wau');
  const mau = avg(window, 'mau');
  const activities = window.reduce((s, r) => s + r.activities, 0);
  const aiCalls = window.reduce((s, r) => s + r.aiCalls, 0);
  // Giữ phép tính thuần và xác định để SSR và client hydrate cùng một giá trị.
  // Không dùng bộ sinh số ngẫu nhiên có trạng thái trong hàm được gọi khi render.
  const roleSeed = role.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const organicFactor = 0.88 + ((rangeDays * 17 + roleSeed) % 25) / 100;
  const newAccounts = Math.round((ACCOUNT_COUNTS.total * 0.022 * rangeDays) / 7 * organicFactor);

  return {
    activeUsers: scale(window[window.length - 1].mau),
    meaningfulActivities: scale(activities),
    dau: scale(dau),
    wau: scale(wau),
    mau: scale(mau),
    dauDelta: deltaPct(dau, avg(prev, 'dau')),
    wauDelta: deltaPct(wau, avg(prev, 'wau')),
    mauDelta: deltaPct(mau, avg(prev, 'mau')),
    activitiesDelta: deltaPct(
      activities,
      prev.reduce((s, r) => s + r.activities, 0),
    ),
    aiCalls: scale(aiCalls),
    aiDelta: deltaPct(
      aiCalls,
      prev.reduce((s, r) => s + r.aiCalls, 0),
    ),
    newAccounts: scale(newAccounts),
  };
}

// A-M03 — tên event lấy từ Event Catalog chung của hai phân hệ.
export interface FeatureEventRow {
  event: string;
  uniqueUsers: number;
  totalActions: number;
  deltaPct: number;
}

const FEATURE_BASE: Array<Omit<FeatureEventRow, 'uniqueUsers' | 'totalActions'> & { users30: number; actions30: number }> = [
  { event: 'lesson_completed', users30: 5420, actions30: 21937, deltaPct: 3.8 },
  { event: 'quiz_completed', users30: 4318, actions30: 14872, deltaPct: 6.4 },
  { event: 'bookmark_added', users30: 2904, actions30: 8417, deltaPct: -2.8 },
  { event: 'ai_learning_plan_applied', users30: 1962, actions30: 5218, deltaPct: 23.9 },
  { event: 'study_plan_created', users30: 1147, actions30: 3284, deltaPct: 9.1 },
  { event: 'feedback_sent', users30: 826, actions30: 1189, deltaPct: 15.2 },
];

export function getFeatureEvents(rangeDays: number, role: RoleFilter = 'all'): FeatureEventRow[] {
  const share = ROLE_SHARE[role];
  return FEATURE_BASE.map(({ users30, actions30, ...rest }) => ({
    ...rest,
    // User duy nhất tăng chậm hơn số action khi mở rộng mốc thời gian.
    uniqueUsers: Math.round(users30 * (0.55 + 0.45 * (rangeDays / 30)) * share),
    totalActions: Math.round((actions30 * rangeDays) / 30 * share),
  })).sort((a, b) => b.totalActions - a.totalActions);
}

export const ENROLLMENT_FUNNEL = [
  { stage: 'Xem khóa học', users: 18402 },
  { stage: 'Đăng ký khóa học', users: 9176 },
  { stage: 'Học bài đầu tiên', users: 6845 },
  { stage: 'Hoàn thành quiz đầu tiên', users: 4102 },
  { stage: 'Hoàn thành khóa học', users: 1238 },
];

// A-M04 — Error Group. Log chỉ chứa tên lỗi kỹ thuật, không chứa dữ liệu người dùng.
export type ErrorSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type ErrorType = 'Backend Error' | 'External Failure' | 'Critical Client Error' | 'UX Failure Signal';

export interface ErrorGroupRow {
  id: string;
  type: ErrorType;
  name: string;
  severity: ErrorSeverity;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  status: 'open' | 'resolved';
}

const hoursAgo = (h: number) => new Date(MOCK_NOW.getTime() - h * 3600_000);

export const ERROR_GROUPS: ErrorGroupRow[] = [
  { id: 'err-01', type: 'Backend Error', name: 'Prisma P2024: connection pool timeout', severity: 'Critical', count: 38, firstSeen: hoursAgo(49), lastSeen: hoursAgo(0.5), status: 'open' },
  { id: 'err-02', type: 'External Failure', name: 'OpenAI API: 429 Too Many Requests', severity: 'High', count: 214, firstSeen: hoursAgo(6 * 24), lastSeen: hoursAgo(3), status: 'open' },
  { id: 'err-03', type: 'UX Failure Signal', name: 'Video bài học: time-to-first-frame > 8s', severity: 'Medium', count: 96, firstSeen: hoursAgo(12 * 24), lastSeen: hoursAgo(26), status: 'open' },
  { id: 'err-04', type: 'External Failure', name: 'Supabase Storage: upload timeout (thumbnail)', severity: 'Medium', count: 41, firstSeen: hoursAgo(3 * 24), lastSeen: hoursAgo(14), status: 'open' },
  { id: 'err-05', type: 'Backend Error', name: 'Supabase Auth: 500 trên /token?grant_type=refresh', severity: 'High', count: 19, firstSeen: hoursAgo(9 * 24), lastSeen: hoursAgo(2 * 24), status: 'resolved' },
  { id: 'err-06', type: 'Critical Client Error', name: 'ChunkLoadError: Loading chunk 47 failed', severity: 'Low', count: 7, firstSeen: hoursAgo(5 * 24), lastSeen: hoursAgo(4 * 24), status: 'resolved' },
];

// A-M05 — read metrics đầy đủ: recipients / read / unread.
export interface NotificationRow {
  id: string;
  title: string;
  type: 'General' | 'Warning' | 'Maintenance';
  audience: 'all' | 'learner' | 'content_manager' | 'admin';
  recipients: number;
  read: number;
  sentAt: Date | null; // null = chưa gửi (scheduled)
  status: 'sent' | 'scheduled';
}

export const NOTIFICATIONS: NotificationRow[] = [
  { id: 'ntf-01', title: 'Bảo trì hệ thống sáng thứ Bảy', type: 'Maintenance', audience: 'all', recipients: ACCOUNT_COUNTS.total, read: 5762, sentAt: hoursAgo(49), status: 'sent' },
  { id: 'ntf-02', title: 'Đã có tính năng luyện tập bằng AI', type: 'General', audience: 'learner', recipients: ACCOUNT_COUNTS.learner, read: 8028, sentAt: hoursAgo(4 * 24), status: 'sent' },
  { id: 'ntf-03', title: 'Kiểm tra quiz định kỳ tháng 10', type: 'General', audience: 'content_manager', recipients: ACCOUNT_COUNTS.content_manager, read: 1106, sentAt: null, status: 'scheduled' },
  { id: 'ntf-04', title: 'Cảnh báo: lưu lượng AI tăng bất thường', type: 'Warning', audience: 'admin', recipients: ACCOUNT_COUNTS.admin, read: 31, sentAt: hoursAgo(7 * 24), status: 'sent' },
];

export const systemStatus = {
  label: 'Ổn định',
  uptime30d: 99.97,
  aiSuccessRate: 98.2,
  openIncidents: 2,
};

export const recentRegistrations = [
  { name: 'Nguyễn Thị Mai Linh', email: 'mailinh.nguyen@gmail.com', role: 'learner', when: '2 giờ trước' },
  { name: 'Trần Quốc Khánh', email: 'khanh.tran97@outlook.com', role: 'learner', when: '5 giờ trước' },
  { name: 'Lê Hoàng Phúc', email: 'phuc.le.2307@gmail.com', role: 'learner', when: 'Hôm qua' },
  { name: 'Phạm Khánh Vy', email: 'vy.pham.kh@student.edu.vn', role: 'content_manager', when: 'Hôm qua' },
  { name: 'Đỗ Gia Hân', email: 'hhan.do@gmail.com', role: 'learner', when: '2 ngày trước' },
] as const;

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmtDelta = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
export const fmtDay = (iso: string) => format(new Date(iso), 'dd/MM');
export const fmtDateTime = (d: Date) => format(d, 'dd/MM HH:mm');

export const ROLE_LABEL: Record<RoleFilter, string> = {
  all: 'Tất cả vai trò',
  learner: 'Learner',
  content_manager: 'Content Manager',
  admin: 'Admin',
};
