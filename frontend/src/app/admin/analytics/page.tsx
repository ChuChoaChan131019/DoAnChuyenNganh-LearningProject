"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartTooltip } from "@/components/admin/chart-parts";
import {
  ADMIN_ROLE_LABEL,
  formatAdminDelta,
  formatAdminNumber,
} from "@/lib/admin-analytics-format";
import {
  adminAnalyticsApi,
  type AdminAnalyticsRole,
  type AdminFeatureAnalyticsData,
} from "@/lib/api";

const RANGES = [
  { value: "7", label: "7 ngày gần nhất" },
  { value: "30", label: "30 ngày gần nhất" },
  { value: "90", label: "90 ngày gần nhất" },
];

const ROLE_OPTIONS: AdminAnalyticsRole[] = [
  "all",
  "learner",
  "content_manager",
  "admin",
];

export default function FeatureAnalyticsPage() {
  const [range, setRange] = useState("30");
  const [role, setRole] = useState<AdminAnalyticsRole>("learner");
  const [analytics, setAnalytics] = useState<AdminFeatureAnalyticsData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const days = Number(range) as 7 | 30 | 90;

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setError(null);
      setAnalytics(null);
      adminAnalyticsApi
        .getFeatures({ days, role })
        .then((result) => {
          if (active) setAnalytics(result);
        })
        .catch((cause: unknown) => {
          if (active)
            setError(
              cause instanceof Error
                ? cause.message
                : "Không thể tải Feature Analytics",
            );
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [days, role, retryKey]);

  const events = analytics?.events ?? [];
  const funnel = analytics?.funnel.stages ?? [];
  const funnelMax = funnel[0]?.users ?? 0;

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Feature Analytics</h2>
          <p className="admin-page-copy">
            Mức độ sử dụng tính năng dựa trên Meaningful Feature Events theo
            Event Catalog chung.
          </p>
        </div>
        <div className="admin-controls">
          <Select
            value={role}
            onValueChange={(value) =>
              value && setRole(value as AdminAnalyticsRole)
            }
            items={ROLE_OPTIONS.map((option) => ({
              value: option,
              label: ADMIN_ROLE_LABEL[option],
            }))}
          >
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {ADMIN_ROLE_LABEL[option]}
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

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Đang tải dữ liệu...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center text-sm text-destructive">
            <p>{error}</p>
            <button
              type="button"
              className="underline"
              onClick={() => setRetryKey((value) => value + 1)}
            >
              Thử lại
            </button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Nguồn: analytics_events — chỉ các sự kiện đã được ghi nhận. Thiếu
            event không có nghĩa là người dùng không sử dụng tính năng.
          </p>
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
                    {events.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-10 text-center text-muted-foreground"
                        >
                          Chưa có feature event trong khoảng thời gian đã chọn.
                        </TableCell>
                      </TableRow>
                    ) : (
                      events.map((item) => (
                        <TableRow key={item.event}>
                          <TableCell className="font-mono text-xs">
                            {item.event}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatAdminNumber(item.uniqueUsers)}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatAdminNumber(item.totalActions)}
                          </TableCell>
                          <TableCell
                            className={`text-right tabular-nums ${
                              item.deltaPct === null
                                ? "text-muted-foreground"
                                : item.deltaPct >= 0
                                  ? "text-success"
                                  : "text-destructive"
                            }`}
                          >
                            {item.deltaPct === null
                              ? "—"
                              : formatAdminDelta(item.deltaPct)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enrollment Funnel</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Cùng một học viên và khóa học, theo thứ tự: xem → bắt đầu đăng
                  ký → bắt đầu học.
                </p>
              </CardHeader>
              <CardContent>
                {!analytics?.funnel.available || funnelMax === 0 ? (
                  <div className="flex h-[280px] items-center justify-center text-center text-sm text-muted-foreground">
                    Chưa đủ 3 loại event có user và khóa học để tính funnel.
                    Không hiển thị số liệu mẫu.
                  </div>
                ) : (
                  <div className="h-[280px] sm:h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={funnel}
                        layout="vertical"
                        margin={{ top: 4, right: 48, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid
                          horizontal={false}
                          stroke="var(--border)"
                          strokeDasharray="3 3"
                        />
                        <XAxis type="number" hide domain={[0, funnelMax]} />
                        <YAxis
                          type="category"
                          dataKey="stage"
                          width={168}
                          tick={{
                            fill: "var(--muted-foreground)",
                            fontSize: 11,
                          }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const row = payload[0]
                              .payload as (typeof funnel)[number];
                            return (
                              <ChartTooltip
                                label={row.stage}
                                rows={[
                                  {
                                    name: "Người dùng",
                                    value: formatAdminNumber(row.users),
                                    color: "var(--primary)",
                                  },
                                  {
                                    name: "So với bước đầu",
                                    value: `${Math.round((row.users / funnelMax) * 100)}%`,
                                    color: "var(--muted-foreground)",
                                  },
                                ]}
                              />
                            );
                          }}
                        />
                        <Bar
                          dataKey="users"
                          fill="var(--primary)"
                          radius={[0, 6, 6, 0]}
                          barSize={22}
                        >
                          <LabelList
                            dataKey="users"
                            position="right"
                            formatter={(value) =>
                              formatAdminNumber(Number(value))
                            }
                            className="fill-muted-foreground text-[11px]"
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
