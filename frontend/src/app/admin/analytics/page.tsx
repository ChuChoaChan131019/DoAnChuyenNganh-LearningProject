'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartTooltip, AXIS_PROPS } from '@/components/admin/chart-parts';
import {
  ENROLLMENT_FUNNEL,
  fmtDelta,
  fmtInt,
  getFeatureEvents,
  ROLE_LABEL,
  type RoleFilter,
} from '@/lib/admin-mock';

const RANGES = [
  { value: '7', label: '7 ngày gần nhất' },
  { value: '30', label: '30 ngày gần nhất' },
  { value: '90', label: '90 ngày gần nhất' },
];

const ROLE_OPTIONS: RoleFilter[] = ['all', 'learner', 'content_manager', 'admin'];

export default function FeatureAnalyticsPage() {
  const [range, setRange] = useState('30');
  const [role, setRole] = useState<RoleFilter>('learner');
  const days = Number(range);

  const events = useMemo(() => getFeatureEvents(days, role), [days, role]);
  const funnelMax = ENROLLMENT_FUNNEL[0].users;

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Feature Analytics</h2>
          <p className="admin-page-copy">
            Mức độ sử dụng tính năng dựa trên Meaningful Feature Events theo Event Catalog chung.
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
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
            <p className="text-sm text-muted-foreground">
              Xếp theo tổng số action trong {days} ngày qua.
            </p>
          </CardHeader>
          <CardContent>
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right">Unique Users</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                  <TableHead className="text-right">Thay đổi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((item) => (
                  <TableRow key={item.event}>
                    <TableCell className="font-mono text-xs">{item.event}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtInt(item.uniqueUsers)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {fmtInt(item.totalActions)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        item.deltaPct >= 0 ? 'text-success' : 'text-destructive'
                      }`}
                    >
                      {fmtDelta(item.deltaPct)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollment Funnel</CardTitle>
            <p className="text-sm text-muted-foreground">
              Luồng học viên từ xem khóa học đến hoàn thành. Chỉ áp dụng cho feature có flow rõ ràng.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ENROLLMENT_FUNNEL}
                  layout="vertical"
                  margin={{ top: 4, right: 48, left: 8, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis type="number" hide domain={[0, funnelMax]} />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    width={168}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload as (typeof ENROLLMENT_FUNNEL)[number];
                      return (
                        <ChartTooltip
                          label={row.stage}
                          rows={[
                            {
                              name: 'Người dùng',
                              value: fmtInt(row.users),
                              color: 'var(--primary)',
                            },
                            {
                              name: 'So với bước đầu',
                              value: `${Math.round((row.users / funnelMax) * 100)}%`,
                              color: 'var(--muted-foreground)',
                            },
                          ]}
                        />
                      );
                    }}
                  />
                  <Bar dataKey="users" fill="var(--primary)" radius={[0, 6, 6, 0]} barSize={22}>
                    <LabelList
                      dataKey="users"
                      position="right"
                      formatter={(value) => fmtInt(Number(value))}
                      className="fill-muted-foreground text-[11px]"
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
