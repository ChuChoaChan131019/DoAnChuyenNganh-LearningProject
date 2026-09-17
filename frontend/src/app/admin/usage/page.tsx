'use client';

import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChartTooltip, AXIS_PROPS, DeltaText, SERIES } from '@/components/admin/chart-parts';
import {
  dailySeries,
  fmtDay,
  fmtInt,
  getUsageTotals,
  ROLE_LABEL,
  type RoleFilter,
} from '@/lib/admin-mock';

const RANGES = [
  { value: '7', label: '7 ngày gần nhất' },
  { value: '30', label: '30 ngày gần nhất' },
  { value: '90', label: '90 ngày gần nhất' },
  { value: 'custom', label: 'Tùy chọn...' },
];

const ROLE_OPTIONS: RoleFilter[] = ['all', 'learner', 'content_manager', 'admin'];

export default function SystemUsagePage() {
  const [role, setRole] = useState<RoleFilter>('all');
  const [rangeKey, setRangeKey] = useState('7');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const days = useMemo(() => {
    if (rangeKey !== 'custom') return Number(rangeKey);
    const from = new Date(customFrom);
    const to = new Date(customTo);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0;
    return Math.min(90, Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1));
  }, [rangeKey, customFrom, customTo]);

  const totals = useMemo(
    () => (days ? getUsageTotals(days, role) : null),
    [days, role],
  );

  const series = useMemo(
    () =>
      days
        ? dailySeries.slice(-days).map((point) => ({ ...point, label: fmtDay(point.date) }))
        : [],
    [days],
  );

  const cards = totals
    ? [
        { title: 'Active Users', value: fmtInt(totals.activeUsers), delta: totals.mauDelta },
        {
          title: 'Meaningful Activities',
          value: fmtInt(totals.meaningfulActivities),
          delta: totals.activitiesDelta,
        },
        { title: 'DAU', value: fmtInt(totals.dau), delta: totals.dauDelta },
        { title: 'WAU (rolling 7 ngày)', value: fmtInt(totals.wau), delta: totals.wauDelta },
        { title: 'MAU (rolling 30 ngày)', value: fmtInt(totals.mau), delta: totals.mauDelta },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">System Usage</h2>
          <p className="admin-page-copy">
            Theo dõi mức độ sử dụng hệ thống dựa trên Meaningful Activities, không tính page view.
          </p>
        </div>
        <div className="admin-controls">
          <Select
            value={role}
            onValueChange={(value) => value && setRole(value as RoleFilter)}
            items={ROLE_OPTIONS.map((option) => ({ value: option, label: ROLE_LABEL[option] }))}
          >
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {ROLE_LABEL[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={rangeKey}
            onValueChange={(value) => value && setRangeKey(value)}
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
      </div>

      {rangeKey === 'custom' && (
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card/50 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="usage-from">Từ ngày</Label>
            <Input
              id="usage-from"
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="w-full sm:w-[170px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usage-to">Đến ngày</Label>
            <Input
              id="usage-to"
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className="w-full sm:w-[170px]"
            />
          </div>
          {days > 0 && (
            <p className="pb-2 text-sm text-muted-foreground">Khoảng {days} ngày</p>
          )}
        </div>
      )}

      {totals ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {cards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight tabular-nums">{card.value}</div>
                  <p className="mt-1">
                    <DeltaText value={card.delta} suffix="kỳ trước" />
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage Trends</CardTitle>
              <p className="text-sm text-muted-foreground">
                DAU, WAU và MAU theo ngày — vai trò {ROLE_LABEL[role].toLowerCase()}.
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] sm:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                            rows={payload.map((entry) => ({
                              name: String(entry.name),
                              value: fmtInt(Number(entry.value)),
                              color: String(entry.color),
                            }))}
                          />
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="mau"
                      name="MAU"
                      stroke={SERIES.mau}
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="wau"
                      name="WAU"
                      stroke={SERIES.wau}
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="dau"
                      name="DAU"
                      stroke={SERIES.dau}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Chọn khoảng thời gian hợp lệ để xem số liệu.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
