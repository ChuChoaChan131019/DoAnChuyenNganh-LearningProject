'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, UserPlus, Activity, CheckCircle, BarChart3, TrendingUp, Cpu, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartTooltip, AXIS_PROPS, DeltaText, SERIES } from '@/components/admin/chart-parts';
import {
  dailySeries,
  fmtDay,
  fmtInt,
  getUsageTotals,
  recentRegistrations,
  systemStatus,
} from '@/lib/admin-mock';

const RANGES = [
  { value: '7', label: '7 ngày gần nhất' },
  { value: '30', label: '30 ngày gần nhất' },
  { value: '90', label: '90 ngày gần nhất' },
];

export default function AdminDashboardPage() {
  const [range, setRange] = useState('7');
  const days = Number(range);
  const totals = useMemo(() => getUsageTotals(days), [days]);
  const series = useMemo(
    () =>
      dailySeries.slice(-days).map((point) => ({
        ...point,
        label: fmtDay(point.date),
      })),
    [days],
  );

  const metrics = [
    {
      title: 'Total Accounts',
      value: '12,847',
      note: 'toàn hệ thống',
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'New Accounts',
      value: fmtInt(totals.newAccounts),
      note: `${days} ngày`,
      icon: UserPlus,
      color: 'text-success',
    },
    {
      title: 'Active Users',
      value: fmtInt(totals.activeUsers),
      note: 'trong 30 ngày',
      icon: Activity,
      color: 'text-brand',
    },
    {
      title: 'DAU',
      value: fmtInt(totals.dau),
      trend: totals.dauDelta,
      icon: CheckCircle,
      color: 'text-primary',
    },
    {
      title: 'WAU',
      value: fmtInt(totals.wau),
      trend: totals.wauDelta,
      icon: BarChart3,
      color: 'text-warning',
    },
    {
      title: 'MAU',
      value: fmtInt(totals.mau),
      trend: totals.mauDelta,
      icon: TrendingUp,
      color: 'text-primary',
    },
    {
      title: 'AI Usage',
      value: fmtInt(totals.aiCalls),
      note: `${systemStatus.aiSuccessRate}% thành công`,
      icon: Cpu,
      color: 'text-brand',
    },
    {
      title: 'System Status',
      value: systemStatus.label,
      note: `uptime ${systemStatus.uptime30d}% (30 ngày)`,
      icon: Server,
      color: 'text-success',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Tổng quan</h2>
          <p className="admin-page-copy">
            Active Users chỉ tính hành động có ý nghĩa, đăng nhập đơn thuần không được tính.
          </p>
        </div>
        <Select
          value={range}
          onValueChange={(value) => value && setRange(value)}
          items={RANGES.map(({ value, label }) => ({ value, label }))}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} className="transition-transform duration-200 hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight tabular-nums">{metric.value}</div>
                {'trend' in metric && typeof metric.trend === 'number' ? (
                  <p className="mt-1">
                    <DeltaText value={metric.trend} suffix="so với kỳ trước" />
                  </p>
                ) : (
                  'note' in metric && metric.note && (
                    <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
                  )
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader>
            <CardTitle>Hoạt động người dùng</CardTitle>
            <p className="text-sm text-muted-foreground">
              Số Meaningful Activities mỗi ngày trong {days} ngày qua.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] sm:h-[280px]">
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
                    tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
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
                              name: 'Meaningful Activities',
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
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Đăng ký gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRegistrations.map((user) => (
                <div key={user.email} className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                    {user.name
                      .split(' ')
                      .slice(-2)
                      .map((part) => part[0])
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-none">{user.name}</p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{user.when}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
