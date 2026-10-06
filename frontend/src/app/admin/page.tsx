'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Users,
  UserPlus,
  Activity,
  CheckCircle,
  BarChart3,
  TrendingUp,
  Cpu,
  Server,
  BellRing,
  Info,
  Clock3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartTooltip, AXIS_PROPS, SERIES } from '@/components/admin/chart-parts';
import { adminDashboardApi, type AdminDashboardData } from '@/lib/api';

const RANGES = [
  { value: '7', label: '7 ngày gần nhất' },
  { value: '30', label: '30 ngày gần nhất' },
  { value: '90', label: '90 ngày gần nhất' },
];

export default function AdminDashboardPage() {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setError(null);
      adminDashboardApi.get(days)
        .then((result) => {
          if (active) setDashboard(result);
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : 'Không thể tải Dashboard');
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [days, retryKey]);

  const fmtInt = (value: number) => value.toLocaleString('vi-VN');
  const series = dashboard?.activity.daily.map((point) => ({
    ...point,
    label: `${point.date.slice(8, 10)}/${point.date.slice(5, 7)}`,
  })) ?? [];

  const metrics = [
    {
      title: 'Toàn bộ tài khoản',
      value: dashboard ? fmtInt(dashboard.accounts.total) : '—',
      note: 'toàn hệ thống',
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'Tài khoản mới',
      value: dashboard ? fmtInt(dashboard.accounts.newInRange) : '—',
      note: `${days} ngày`,
      icon: UserPlus,
      color: 'text-success',
    },
    {
      title: 'Người học hoạt động',
      value: dashboard ? fmtInt(dashboard.activity.activeUsers) : '—',
      note: `hoạt động học tập trong ${days} ngày`,
      icon: Activity,
      color: 'text-brand',
    },
    {
      title: 'DAU',
      value: dashboard ? fmtInt(dashboard.activity.dau) : '—',
      note: 'hôm nay · hoạt động học tập',
      icon: CheckCircle,
      color: 'text-primary',
    },
    {
      title: 'WAU',
      value: dashboard ? fmtInt(dashboard.activity.wau) : '—',
      note: '7 ngày · hoạt động học tập',
      icon: BarChart3,
      color: 'text-warning',
    },
    {
      title: 'MAU',
      value: dashboard ? fmtInt(dashboard.activity.mau) : '—',
      note: '30 ngày · hoạt động học tập',
      icon: TrendingUp,
      color: 'text-primary',
    },
    {
      title: 'AI Usage',
      value: dashboard?.aiUsage.totalCalls == null ? 'Chưa đo' : fmtInt(dashboard.aiUsage.totalCalls),
      note: 'chưa có dữ liệu lượt gọi AI',
      icon: Cpu,
      color: 'text-brand',
    },
    {
      title: 'Trạng thái API',
      value: dashboard?.systemStatus.apiAvailable ? 'Đang hoạt động' : 'Chưa xác định',
      note: 'Uptime chưa được ghi nhận',
      icon: Server,
      color: 'text-success',
    },
  ];

  const roleStats = dashboard
    ? [
        { label: 'Learner', value: dashboard.accounts.byRole.learner, tone: 'bg-primary' },
        { label: 'Content Manager', value: dashboard.accounts.byRole.contentManager, tone: 'bg-brand' },
        { label: 'Admin', value: dashboard.accounts.byRole.admin, tone: 'bg-warning' },
      ]
    : [];

  const notificationStats = dashboard
    ? [
        { label: 'Đã gửi', value: dashboard.notifications.sent, icon: BellRing, tone: 'text-success bg-success/10' },
        { label: 'Đang lên lịch', value: dashboard.notifications.scheduled, icon: Clock3, tone: 'text-warning bg-warning/10' },
        { label: 'Đã thu hồi', value: dashboard.notifications.cancelled, icon: Activity, tone: 'text-muted-foreground bg-muted' },
        { label: 'Lượt đã đọc', value: dashboard.notifications.readRecipients, icon: CheckCircle, tone: 'text-primary bg-primary/10' },
      ]
    : [];

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-card px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">CSharpHub · Quản trị</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Tổng quan hệ thống</h1>
            <p className="mt-2 max-w-[62ch] text-sm leading-6 text-muted-foreground">
              Theo dõi tài khoản, hoạt động học tập và thông báo trong một nơi. Số liệu hoạt động hiện được tính từ lịch sử học tập, không tính lượt đăng nhập.
            </p>
          </div>
          <div className="w-full shrink-0 sm:w-52">
            <label htmlFor="dashboard-range" className="mb-2 block text-xs font-medium text-muted-foreground">Khoảng thời gian</label>
            <Select
              value={String(days)}
              onValueChange={(value) => {
                if (value === '7' || value === '30' || value === '90') setDays(Number(value) as 7 | 30 | 90);
              }}
              items={RANGES.map(({ value, label }) => ({ value, label }))}
            >
              <SelectTrigger id="dashboard-range" className="h-11 w-full rounded-xl bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div aria-label="Đang tải số liệu Dashboard" aria-busy="true" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-7">
            <div className="h-[340px] animate-pulse rounded-xl bg-muted xl:col-span-4" />
            <div className="h-[340px] animate-pulse rounded-xl bg-muted xl:col-span-3" />
          </div>
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-start gap-3 py-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Chưa thể tải dữ liệu</p>
              <p role="alert" className="mt-1 max-w-[65ch] text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" onClick={() => setRetryKey((current) => current + 1)}>Thử tải lại</Button>
          </CardContent>
        </Card>
      ) : dashboard ? <>
      <section aria-label="Chỉ số chính" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="relative gap-0 rounded-xl border-border/70 py-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-3 px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                  <Icon aria-hidden="true" className={`h-[18px] w-[18px] ${metric.color}`} />
                </span>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                <div className="text-[1.75rem] font-semibold tracking-tight tabular-nums text-foreground">{metric.value}</div>
                <p className="mt-1 min-h-4 text-xs leading-5 text-muted-foreground">{metric.note}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section aria-labelledby="account-distribution-title" className="rounded-xl border border-border bg-card p-4 shadow-sm sm:flex sm:items-center sm:gap-8 sm:px-5">
        <div className="mb-4 sm:mb-0 sm:w-44 sm:shrink-0">
          <h2 id="account-distribution-title" className="text-sm font-semibold text-foreground">Cơ cấu tài khoản</h2>
          <p className="mt-1 text-xs text-muted-foreground">{fmtInt(dashboard.accounts.total)} tài khoản</p>
        </div>
        <div className="grid flex-1 gap-4 sm:grid-cols-3">
          {roleStats.map((role) => (
            <div key={role.label}>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-muted-foreground"><span className={`h-2 w-2 rounded-full ${role.tone}`} />{role.label}</span>
                <span className="font-medium tabular-nums text-foreground">{fmtInt(role.value)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${role.tone}`} style={{ width: `${dashboard.accounts.total ? Math.min(100, role.value / dashboard.accounts.total * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Hoạt động và đăng ký mới" className="grid gap-4 xl:grid-cols-7">
        <Card className="rounded-xl border-border/70 xl:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Hoạt động học tập</CardTitle>
            <p className="text-sm leading-5 text-muted-foreground">
              Số hành động học tập mỗi ngày trong {days} ngày qua; không tính lượt đăng nhập.
            </p>
          </CardHeader>
          <CardContent>
            {series.length === 0 ? (
              <div className="flex h-[240px] flex-col items-center justify-center rounded-lg bg-muted/40 px-6 text-center sm:h-[280px]">
                <Activity aria-hidden="true" className="mb-3 h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Chưa có hoạt động trong khoảng này</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">Biểu đồ sẽ hiển thị khi hệ thống ghi nhận lịch sử học tập.</p>
              </div>
            ) : <div className="h-[240px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillActivities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES.activities} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={SERIES.activities} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" minTickGap={28} {...AXIS_PROPS} />
                  <YAxis
                    width={52}
                    tickFormatter={(value: number) => fmtInt(value)}
                    {...AXIS_PROPS}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--border)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <ChartTooltip
                          label={String(label)}
                          rows={[
                            {
                              name: 'Hoạt động học tập',
                              value: fmtInt(Number(payload[0].value)),
                              color: SERIES.activities,
                            },
                          ]}
                        />
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="activities"
                    stroke={SERIES.activities}
                    strokeWidth={2}
                    fill="url(#fillActivities)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70 xl:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Tài khoản mới</CardTitle>
            <p className="text-sm text-muted-foreground">Những tài khoản vừa tham gia hệ thống.</p>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {dashboard.recentRegistrations.length === 0 && (
                <div className="py-10 text-center">
                  <Users aria-hidden="true" className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Chưa có tài khoản mới</p>
                  <p className="mt-1 text-xs text-muted-foreground">Tài khoản mới sẽ xuất hiện tại đây.</p>
                </div>
              )}
              {dashboard.recentRegistrations.map((user) => (
                <div key={user.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                    {user.name
                      .split(' ')
                      .slice(-2)
                      .map((part) => part[0])
                      .join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {user.email ?? user.role}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                    <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                    {format(new Date(user.createdAt), 'dd/MM HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-xl border-border/70">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Thông báo hệ thống</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Tình trạng gửi và lượt đọc thông báo do Admin tạo.</p>
            </div>
            <BellRing aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {notificationStats.map((stat) => {
            const Icon = stat.icon;
            return (
            <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background p-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}><Icon aria-hidden="true" className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{fmtInt(stat.value)}</p>
              </div>
            </div>
            );
          })}
        </CardContent>
      </Card>

      <p className="flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Số liệu AI và uptime chưa được ghi nhận ở backend hiện tại; chỉ số hoạt động chưa bao phủ toàn bộ thao tác trên hệ thống.
      </p>
      </> : null}
    </div>
  );
}
