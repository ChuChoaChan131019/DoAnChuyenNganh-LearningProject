"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  Bot,
  CheckCircle2,
  FileQuestion,
  FileText,
  PenLine,
  Plus,
  Rocket,
  Sparkles,
  Wand2,
  type LucideIcon,
} from "lucide-react";

import { contentManagerDashboardApi, courseApi, questionApi } from "@/lib/api";

import type { ContentDashboardData } from "@/types/content-dashboard";
import type { QuestionItem } from "@/types/question";

type ReviewRow = Awaited<ReturnType<typeof courseApi.reviewQueue>>[number];

type ActivityRow = {
  id: string;
  title: string;
  target: string;
  createdAt: string;
  icon: LucideIcon;
};

type PendingRow = {
  id: string;
  title: string;
  subtitle: string;
  link: string;
};

const COLORS = {
  coral: "#F7444E",
  teal: "#78BCC4",
  navy: "#002C3E",
  green: "#2FA66A",
  amber: "#EFA94B",
  violet: "#9578CB",
  grid: "#E2E8E0",
};

const tooltipStyle = {
  border: `1px solid ${COLORS.grid}`,
  borderRadius: 12,
  backgroundColor: "#fff",
  boxShadow: "0 12px 30px -20px rgba(0,44,62,.35)",
  fontSize: 12,
};

// Định dạng thời gian hoạt động
function timeLabel(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Không rõ thời gian";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

// Component dùng chung cho các khung biểu đồ
function SectionCard({
  title,
  description,
  children,
  className = "",
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={`
        min-w-0 overflow-hidden rounded-2xl
        border border-border bg-card shadow-sm
        ${className}
      `}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {title}
          </h2>

          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

// Hiển thị khi không có dữ liệu
function EmptyChart({
  message = "Chưa có dữ liệu để thống kê.",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-full min-h-36 items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default function ContentManagerPage() {
  const [stats, setStats] = useState<ContentDashboardData | null>(null);

  const [questions, setQuestions] = useState<QuestionItem[] | null>(null);

  const [reviewRows, setReviewRows] = useState<ReviewRow[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1. LẤY DỮ LIỆU TỪ BACKEND
  useEffect(() => {
    let active = true;

    async function load() {
      const [overview, questionResult, reviewResult] = await Promise.allSettled(
        [
          contentManagerDashboardApi.get(),
          questionApi.list(),
          courseApi.reviewQueue(),
        ],
      );

      if (!active) return;

      if (overview.status === "fulfilled") {
        setStats(overview.value);
      } else {
        setError(
          "Không tải được API thống kê. Kiểm tra Backend và tài khoản Content Manager.",
        );
      }

      if (questionResult.status === "fulfilled") {
        setQuestions(questionResult.value);
      }

      if (reviewResult.status === "fulfilled") {
        setReviewRows(reviewResult.value);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  // 2. TRẠNG THÁI LOADING
  if (loading) {
    return (
      <div className="space-y-4" role="status">
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>

        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
      >
        {error || "Không thể tải thống kê."}
      </div>
    );
  }

  // 3. TÍNH TOÁN CÁC THẺ THỐNG KÊ
  const thisMonth = stats.growth.at(-1);

  const overviewCards: Array<{
    label: string;
    value: number;
    delta?: string;
    icon: LucideIcon;
    tone: string;
  }> = [
    {
      label: "Tổng số khóa học",
      value: stats.overview.totalCourses,
      delta: `+${thisMonth?.courses ?? 0} tháng này`,
      icon: BookOpen,
      tone: "bg-primary-soft text-primary",
    },
    {
      label: "Tổng số bài học",
      value: stats.overview.totalLessons,
      delta: `+${thisMonth?.lessons ?? 0} tháng này`,
      icon: FileText,
      tone: "bg-brand-soft text-[#157985]",
    },
    {
      label: "Tổng số câu hỏi",
      value: stats.overview.totalQuestions,
      delta: `+${thisMonth?.questions ?? 0} tháng này`,
      icon: FileQuestion,
      tone: "bg-brand-soft text-[#157985]",
    },
    {
      label: "Đã xuất bản",
      value: stats.status.published,
      icon: Rocket,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Bản nháp",
      value: stats.status.draft,
      icon: PenLine,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Nội dung AI",
      value: stats.overview.totalAiGenerated,
      delta: `${stats.overview.aiLessons} bài học · ${stats.overview.aiQuestions} câu hỏi`,
      icon: Sparkles,
      tone: "bg-brand-soft text-[#157985]",
    },
  ];

  // 4. THỐNG KÊ TRẠNG THÁI NỘI DUNG
  const statusData = [
    {
      name: "Đã xuất bản",
      value: stats.status.published,
      fill: COLORS.green,
    },
    {
      name: "Đã duyệt",
      value: stats.status.approved,
      fill: COLORS.teal,
    },
    {
      name: "Bản nháp",
      value: stats.status.draft,
      fill: COLORS.amber,
    },
  ].filter((row) => row.value > 0);

  // 5. THỐNG KÊ CÂU HỎI THEO ĐỘ KHÓ
  const difficultyData = [
    {
      difficulty: "Dễ",
      count: stats.questionDifficulty.easy,
    },
    {
      difficulty: "Trung bình",
      count: stats.questionDifficulty.medium,
    },
    {
      difficulty: "Khó",
      count: stats.questionDifficulty.hard,
    },
  ];

  // 6. THỐNG KÊ KHÓA HỌC THEO TRÌNH ĐỘ
  const courseLevelData = [
    {
      name: "Cơ bản",
      value: stats.courseLevels.beginner,
      fill: COLORS.coral,
    },
    {
      name: "Trung cấp",
      value: stats.courseLevels.intermediate,
      fill: COLORS.teal,
    },
    {
      name: "Nâng cao",
      value: stats.courseLevels.advanced,
      fill: COLORS.violet,
    },
  ].filter((row) => row.value > 0);

  // 7. SO SÁNH CÂU HỎI AI VÀ THỦ CÔNG
  const aiVsManual = stats.growth.map(
    ({ month, aiQuestions, manualQuestions }) => ({
      month,
      ai: aiQuestions,
      manual: manualQuestions,
    }),
  );

  // 8. HOẠT ĐỘNG NỘI DUNG GẦN ĐÂY
  const recentEvents: ActivityRow[] = [
    ...(questions ?? []).map((q) => ({
      id: `q-${q.id}`,
      title: "Câu hỏi được tạo",
      target: q.content,
      createdAt: q.created_at,
      icon: q.is_ai_generated ? Sparkles : FileQuestion,
    })),

    ...(reviewRows ?? []).map((row) => ({
      id: `lesson-${row.id}`,
      title: "Bài học được cập nhật",
      target: row.title,
      createdAt: row.updated_at,
      icon: FileText,
    })),
  ]
    .filter((row) => Number.isFinite(new Date(row.createdAt).getTime()))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  // 9. NỘI DUNG AI CẦN XEM XÉT
  const pendingReview: PendingRow[] = [
    ...(reviewRows ?? [])
      .filter((row) => row.is_ai_generated && row.status === "draft")
      .map((row) => ({
        id: `lesson-${row.id}`,
        title: row.title,
        subtitle: `Bài học AI · ${row.chapters?.courses?.title ?? "Khóa học"}`,
        link: "/content-manager/ai/review-queue",
      })),

    ...(questions ?? [])
      .filter((q) => q.is_ai_generated && q.status === "draft")
      .map((q) => ({
        id: `question-${q.id}`,
        title: q.content,
        subtitle: `Câu hỏi AI · ${q.course?.title ?? "Ngân hàng câu hỏi"}`,
        link: "/content-manager/questions/review",
      })),
  ].slice(0, 5);

  // 10. GIAO DIỆN DASHBOARD
  return (
    <div className="space-y-6 pb-6">
      {/* HEADER */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[.18em] text-[#157985]">
            Tổng quan hệ thống
          </p>

          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">
            Bảng điều khiển nội dung
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi nội dung khóa học C# và hoạt động biên soạn của nhóm.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/content-manager/ai/content-generator"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            <Wand2 className="h-4 w-4" />
            Tạo bằng AI
          </Link>

          <Link
            href="/content-manager/learning-content/courses/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Tạo khóa học
          </Link>
        </div>
      </header>

      {/* 6 THẺ THỐNG KÊ */}
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
        aria-label="Chỉ số tổng quan"
      >
        {overviewCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </p>

                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${card.tone}`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
              </div>

              <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-foreground">
                {card.value.toLocaleString("vi-VN")}
              </p>

              {card.delta && (
                <p className="mt-1 text-xs font-medium text-[#278455]">
                  {card.delta}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* BIỂU ĐỒ TĂNG TRƯỞNG VÀ TRẠNG THÁI */}
      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="Tăng trưởng nội dung"
          description="Số bài học và câu hỏi mới theo tháng"
          className="xl:col-span-2"
        >
          <div className="h-[290px] p-4">
            {stats.growth.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.growth}
                  margin={{
                    top: 12,
                    right: 15,
                    bottom: 2,
                    left: -20,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="growth-lesson-gradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={COLORS.coral}
                        stopOpacity={0.32}
                      />
                      <stop
                        offset="100%"
                        stopColor={COLORS.coral}
                        stopOpacity={0}
                      />
                    </linearGradient>

                    <linearGradient
                      id="growth-question-gradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={COLORS.teal}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor={COLORS.teal}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke={COLORS.grid}
                  />

                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />

                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />

                  <Tooltip contentStyle={tooltipStyle} />

                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />

                  <Area
                    type="monotone"
                    dataKey="questions"
                    name="Câu hỏi"
                    stroke={COLORS.teal}
                    fill="url(#growth-question-gradient)"
                    strokeWidth={2.5}
                  />

                  <Area
                    type="monotone"
                    dataKey="lessons"
                    name="Bài học"
                    stroke={COLORS.coral}
                    fill="url(#growth-lesson-gradient)"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Trạng thái nội dung"
          description="Khóa học, chương và bài học"
        >
          <div className="h-[290px] p-4">
            {statusData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={84}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {statusData.map((row) => (
                      <Cell key={row.name} fill={row.fill} />
                    ))}
                  </Pie>

                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />

                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>
      </div>

      {/* 3 BIỂU ĐỒ PHÂN TÍCH CHI TIẾT */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* CÂU HỎI THEO ĐỘ KHÓ */}
        <SectionCard
          title="Câu hỏi theo độ khó"
          description="Ngân hàng câu hỏi dùng chung"
        >
          <div className="h-[260px] p-4">
            {difficultyData.every((r) => r.count === 0) ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={difficultyData}
                  margin={{
                    left: -20,
                    right: 8,
                    top: 5,
                  }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke={COLORS.grid}
                  />

                  <XAxis
                    dataKey="difficulty"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />

                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                  />

                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "#EAF4F3" }}
                  />

                  <Bar
                    dataKey="count"
                    name="Số câu"
                    fill={COLORS.coral}
                    barSize={40}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        {/* KHÓA HỌC THEO TRÌNH ĐỘ */}
        <SectionCard
          title="Khóa học theo trình độ"
          description="Cơ bản · Trung cấp · Nâng cao"
        >
          <div className="h-[260px] p-4">
            {courseLevelData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courseLevelData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={80}
                    strokeWidth={0}
                  >
                    {courseLevelData.map((row) => (
                      <Cell key={row.name} fill={row.fill} />
                    ))}
                  </Pie>

                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />

                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        {/* CÂU HỎI AI VS THỦ CÔNG */}
        <SectionCard
          title="Câu hỏi AI và thủ công"
          description="Số câu hỏi chung được tạo mỗi tháng"
        >
          <div className="h-[260px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={aiVsManual}
                margin={{
                  left: -20,
                  right: 12,
                  top: 10,
                }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke={COLORS.grid}
                />

                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />

                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />

                <Tooltip contentStyle={tooltipStyle} />

                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />

                <Line
                  type="monotone"
                  name="AI"
                  dataKey="ai"
                  stroke={COLORS.teal}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />

                <Line
                  type="monotone"
                  name="Thủ công"
                  dataKey="manual"
                  stroke={COLORS.coral}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* HOẠT ĐỘNG GẦN ĐÂY VÀ NỘI DUNG CẦN DUYỆT */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* HOẠT ĐỘNG GẦN ĐÂY */}
        <SectionCard
          title="Hoạt động nội dung gần đây"
          description="Câu hỏi mới và bài học vừa cập nhật"
          className="lg:col-span-3"
        >
          {questions === null && reviewRows === null ? (
            <div className="p-6">
              <EmptyChart message="Chưa tải được hoạt động nội dung." />
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="p-6">
              <EmptyChart />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentEvents.map((item) => {
                const Icon = item.icon;

                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-5 py-4 transition hover:bg-muted/50"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-[#157985]">
                      <Icon className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        {item.title}
                      </p>

                      <p
                        className="truncate text-sm font-medium text-foreground"
                        title={item.target}
                      >
                        {item.target}
                      </p>
                    </div>

                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeLabel(item.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* BẢN NHÁP AI CẦN DUYỆT */}
        <SectionCard
          title="Bản nháp AI cần xem xét"
          description="Chưa được xuất bản, cần người biên soạn kiểm tra"
          className="lg:col-span-2"
          action={
            <Link
              href="/content-manager/ai/review-queue"
              className="shrink-0 text-xs font-semibold text-primary hover:underline"
            >
              Mở trang duyệt
            </Link>
          }
        >
          {questions === null && reviewRows === null ? (
            <div className="p-6">
              <EmptyChart message="Chưa tải được hàng chờ duyệt." />
            </div>
          ) : pendingReview.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              Không có bản nháp AI trong dữ liệu đã tải.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pendingReview.map((row) => (
                <li key={row.id} className="px-5 py-3.5 hover:bg-muted/50">
                  <Link href={row.link} className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-[#157985]">
                      <Bot className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-semibold text-foreground"
                        title={row.title}
                      >
                        {row.title}
                      </p>

                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {row.subtitle}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
