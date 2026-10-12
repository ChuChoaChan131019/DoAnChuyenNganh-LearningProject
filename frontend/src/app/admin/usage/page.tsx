"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChartTooltip,
  AXIS_PROPS,
  DeltaText,
  SERIES,
} from "@/components/admin/chart-parts";
import {
  ADMIN_ROLE_LABEL,
  formatAdminDay,
  formatAdminNumber,
} from "@/lib/admin-analytics-format";
import {
  adminAnalyticsApi,
  type AdminAnalyticsFilter,
  type AdminAnalyticsRole,
  type AdminUsageData,
} from "@/lib/api";

const RANGES = [
  { value: "7", label: "7 ngày gần nhất" },
  { value: "30", label: "30 ngày gần nhất" },
  { value: "90", label: "90 ngày gần nhất" },
  { value: "custom", label: "Tùy chọn..." },
];

const ROLE_OPTIONS: AdminAnalyticsRole[] = [
  "all",
  "learner",
  "content_manager",
  "admin",
];

export default function SystemUsagePage() {
  const [role, setRole] = useState<AdminAnalyticsRole>("all");
  const [rangeKey, setRangeKey] = useState("7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [usage, setUsage] = useState<AdminUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const filter = useMemo<AdminAnalyticsFilter | null>(() => {
    if (rangeKey !== "custom")
      return { days: Number(rangeKey) as 7 | 30 | 90, role };
    if (!customFrom || !customTo) return null;
    const days =
      (Date.parse(`${customTo}T00:00:00Z`) -
        Date.parse(`${customFrom}T00:00:00Z`)) /
        86_400_000 +
      1;
    if (!Number.isInteger(days) || days < 1 || days > 90) return null;
    return { from: customFrom, to: customTo, role };
  }, [rangeKey, customFrom, customTo, role]);

  useEffect(() => {
    if (!filter) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setError(null);
      setUsage(null);
      adminAnalyticsApi
        .getUsage(filter)
        .then((result) => {
          if (active) setUsage(result);
        })
        .catch((cause: unknown) => {
          if (active)
            setError(
              cause instanceof Error
                ? cause.message
                : "Không thể tải System Usage",
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
  }, [filter, retryKey]);

  const series =
    usage?.daily.map((point) => ({
      ...point,
      label: formatAdminDay(point.date),
    })) ?? [];
  const totals = usage?.metrics;
  const formatMetric = (value: number | null) =>
    value === null ? "—" : formatAdminNumber(value);

  const cards =
    totals && usage?.available
      ? [
          {
            title: "Active Users",
            value: formatMetric(totals.activeUsers),
            delta: totals.activeUsersDelta,
          },
          {
            title: "Meaningful Activities",
            value: formatMetric(totals.meaningfulActivities),
            delta: totals.activitiesDelta,
          },
          {
            title: "DAU",
            value: formatMetric(totals.dau),
            delta: totals.dauDelta,
          },
          {
            title: "WAU (rolling 7 ngày)",
            value: formatMetric(totals.wau),
            delta: totals.wauDelta,
          },
          {
            title: "MAU (rolling 30 ngày)",
            value: formatMetric(totals.mau),
            delta: totals.mauDelta,
          },
        ]
      : [];

  return (
    <div className="space-y-6">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">System Usage</h2>
          <p className="admin-page-copy">
            Theo dõi mức độ sử dụng hệ thống dựa trên Meaningful Activities,
            không tính page view.
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

      {rangeKey === "custom" && (
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
          {filter && "from" in filter && (
            <p className="pb-2 text-sm text-muted-foreground">
              Khoảng tối đa 90 ngày
            </p>
          )}
        </div>
      )}

      {!filter ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Chọn khoảng thời gian hợp lệ, tối đa 90 ngày.
          </CardContent>
        </Card>
      ) : isLoading ? (
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
      ) : !usage?.available ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Chưa có telemetry cho vai trò {ADMIN_ROLE_LABEL[role]}. Hiện nguồn
            dự phòng chỉ ghi nhận hoạt động học tập của Learner.
          </CardContent>
        </Card>
      ) : totals ? (
        <>
          <p className="text-sm text-muted-foreground">
            {usage.source === "learning_history"
              ? "Nguồn: learning_history — chỉ hoạt động học tập của Learner; chưa đại diện cho toàn hệ thống."
              : usage.source === "combined"
                ? "Nguồn: learning_history và analytics_events — chỉ các hoạt động đã được ghi nhận; phạm vi còn chưa đầy đủ."
                : "Nguồn: analytics_events — chỉ các business events đã được hệ thống ghi nhận."}{" "}
            Số liệu theo múi giờ Việt Nam. Thay đổi chỉ hiển thị khi kỳ trước có
            dữ liệu.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {cards.map((card) => (
              <Card key={card.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight tabular-nums">
                    {card.value}
                  </div>
                  <p className="mt-1">
                    {card.delta === null ? (
                      <span className="text-xs text-muted-foreground">
                        Chưa có kỳ đối chiếu
                      </span>
                    ) : (
                      <DeltaText value={card.delta} suffix="kỳ trước" />
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage Trends</CardTitle>
              <p className="text-sm text-muted-foreground">
                DAU, WAU và MAU theo ngày — vai trò{" "}
                {ADMIN_ROLE_LABEL[role].toLowerCase()}.
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] sm:h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={series}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--border)"
                    />
                    <XAxis dataKey="label" minTickGap={28} {...AXIS_PROPS} />
                    <YAxis
                      width={52}
                      tickFormatter={(value: number) =>
                        formatAdminNumber(value)
                      }
                      {...AXIS_PROPS}
                    />
                    <Tooltip
                      cursor={{ stroke: "var(--border)" }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <ChartTooltip
                            label={String(label)}
                            rows={payload.map((entry) => ({
                              name: String(entry.name),
                              value: formatAdminNumber(Number(entry.value)),
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
