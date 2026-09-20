'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  BookOpen,
  FileQuestion,
  FileText,
  PenLine,
  Rocket,
  Sparkles,
  Users,
  MessageSquare,
  Bell,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Wand2,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  contentManagerDashboardApi,
  ContentManagerDashboardData,
} from '@/lib/api';

export default function ContentManagerPage() {
  const [data, setData] = useState<ContentManagerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const fetchDashboard = async (courseId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await contentManagerDashboardApi.get(courseId || undefined);
      setData(res);
    } catch (err) {
      console.error('Failed to load Content Manager dashboard:', err);
      setError('Không thể tải số liệu thống kê. Vui lòng kiểm tra lại kết nối.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedCourseId);
  }, [selectedCourseId]);

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Đang tải số liệu Content Studio...</p>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="font-medium text-foreground">{error}</p>
        <button
          type="button"
          onClick={() => fetchDashboard(selectedCourseId)}
          className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" />
          Thử lại
        </button>
      </div>
    );
  }

  const stats = data?.stats;
  const distribution = data?.status_distribution;
  const totalStatus =
    (distribution?.published || 0) +
    (distribution?.approved || 0) +
    (distribution?.draft || 0) +
    (distribution?.in_review || 0);

  const publishedPercent = totalStatus > 0 ? Math.round(((distribution?.published || 0) / totalStatus) * 100) : 0;
  const approvedPercent = totalStatus > 0 ? Math.round(((distribution?.approved || 0) / totalStatus) * 100) : 0;
  const draftPercent = totalStatus > 0 ? Math.round(((distribution?.draft || 0) / totalStatus) * 100) : 0;

  const statCards = [
    {
      label: 'Total courses',
      value: stats?.total_courses ?? 0,
      delta: selectedCourseId ? 'Đang lọc 1 khóa' : 'Toàn bộ chương trình',
      icon: BookOpen,
      color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-400',
      href: '/content-manager/learning-content/courses',
    },
    {
      label: 'Total lessons',
      value: stats?.total_lessons ?? 0,
      delta: `${stats?.published_count ?? 0} bài đã xuất bản`,
      icon: FileText,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400',
      href: '/content-manager/learning-content/lessons',
    },
    {
      label: 'Active learners',
      value: stats?.total_active_learners ?? 0,
      delta: 'Đang theo học',
      icon: Users,
      color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50 dark:text-teal-400',
    },
    {
      label: 'Questions bank',
      value: stats?.total_questions ?? 0,
      delta: 'Câu hỏi thực hành',
      icon: FileQuestion,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400',
      href: '/content-manager/questions/bank',
    },
    {
      label: 'Draft lessons',
      value: stats?.draft_count ?? 0,
      delta: 'Cần hoàn thiện',
      icon: PenLine,
      color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/50 dark:text-orange-400',
      href: '/content-manager/learning-content/lessons',
    },
    {
      label: 'AI generated',
      value: stats?.ai_generated_count ?? 0,
      delta: 'Nội dung trợ lý AI',
      icon: Sparkles,
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400',
      href: '/content-manager/ai/content-generator',
    },
    {
      label: 'Feedbacks',
      value: stats?.total_feedbacks ?? 0,
      delta: 'Phản hồi học tập',
      icon: MessageSquare,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400',
      href: '/content-manager/feedback',
    },
    {
      label: 'Notifications',
      value: stats?.total_notifications ?? 0,
      delta: 'Thông báo đã gửi',
      icon: Bell,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-400',
      href: '/content-manager/notifications',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Course Filter */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Content Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tổng quan nội dung giảng dạy, tiến độ và tương tác của học viên C# curriculum.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bộ lọc theo khóa học */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-xs">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-transparent font-medium text-foreground outline-none cursor-pointer"
              aria-label="Chọn khóa học để lọc"
            >
              <option value="" className="bg-card text-foreground">
                Tất cả khóa học
              </option>
              {data?.courses?.map((course) => (
                <option key={course.id} value={course.id} className="bg-card text-foreground">
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/content-manager/ai/content-generator"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Wand2 className="h-4 w-4 text-primary" />
            Generate with AI
          </Link>

          <Link
            href="/content-manager/learning-content/courses/new"
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-xs transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New course
          </Link>
        </div>
      </header>

      {/* Grid 8 Cards Thống kê Chỉ số Thực tế */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          const CardContent = (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-border/80 hover:shadow-sm">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <p className="mt-4 text-3xl font-bold text-foreground">{stat.value}</p>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{stat.delta}</span>
                {stat.href && (
                  <span className="flex items-center text-primary font-medium hover:underline">
                    Xem <ChevronRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            </div>
          );

          return stat.href ? (
            <Link key={idx} href={stat.href} className="block">
              {CardContent}
            </Link>
          ) : (
            <div key={idx}>{CardContent}</div>
          );
        })}
      </section>

      {/* Charts Section: Content growth & Content status */}
      <section className="grid gap-4 xl:grid-cols-3">
        {/* Biểu đồ tăng trưởng bài học & câu hỏi */}
        <div className="min-h-[320px] rounded-2xl border border-border bg-card p-5 shadow-xs xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Content growth</h2>
              <p className="text-sm text-muted-foreground">
                Tăng trưởng số lượng bài học và câu hỏi qua các tháng
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                Bài học
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Câu hỏi
              </div>
            </div>
          </div>

          <div className="mt-8 flex h-56 items-end gap-3 sm:gap-6 border-b border-border pb-2">
            {data?.monthly_growth?.map((item, index) => {
              const maxVal = Math.max(...(data.monthly_growth.map((m) => Math.max(m.lessons, m.questions)) || [100]));
              const lessonHeight = maxVal > 0 ? Math.round((item.lessons / maxVal) * 100) : 20;
              const questionHeight = maxVal > 0 ? Math.round((item.questions / maxVal) * 100) : 30;

              return (
                <div key={index} className="flex flex-1 flex-col items-center gap-2 h-full justify-end group">
                  <div className="flex items-end gap-1 w-full justify-center h-full">
                    {/* Cột bài học */}
                    <div
                      className="w-1/2 max-w-[18px] rounded-t-md bg-primary transition-all duration-300 group-hover:opacity-80"
                      style={{ height: `${Math.max(8, lessonHeight)}%` }}
                      title={`${item.month}: ${item.lessons} bài học`}
                    />
                    {/* Cột câu hỏi */}
                    <div
                      className="w-1/2 max-w-[18px] rounded-t-md bg-amber-500/80 transition-all duration-300 group-hover:opacity-80"
                      style={{ height: `${Math.max(8, questionHeight)}%` }}
                      title={`${item.month}: ${item.questions} câu hỏi`}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phân bố trạng thái nội dung (Content status) */}
        <div className="min-h-[320px] rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Content status</h2>
            <p className="text-sm text-muted-foreground">
              Phân bố trạng thái kiểm duyệt nội dung
            </p>
          </div>

          {/* Biểu đồ thanh tỷ lệ */}
          <div className="my-6 space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Published
                </span>
                <span className="text-muted-foreground font-semibold">{distribution?.published ?? 0} bài ({publishedPercent}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${publishedPercent}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Approved
                </span>
                <span className="text-muted-foreground font-semibold">{distribution?.approved ?? 0} bài ({approvedPercent}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${approvedPercent}%` }} />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-orange-400" /> Draft
                </span>
                <span className="text-muted-foreground font-semibold">{distribution?.draft ?? 0} bài ({draftPercent}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full transition-all duration-500" style={{ width: `${draftPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
            Tổng cộng <strong className="text-foreground">{totalStatus}</strong> nội dung bài học đang nằm trong hệ thống.
          </div>
        </div>
      </section>

      {/* Recent Activity & Quick Navigation */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Recent activity</h2>
              <p className="text-xs text-muted-foreground">
                Hoạt động giảng dạy, bài học, thông báo và phản hồi mới nhất
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/content-manager/feedback"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Mở Feedback →
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/content-manager/notifications"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Mở Thông báo →
            </Link>
          </div>
        </div>

        {/* Danh sách hoạt động */}
        <div className="mt-4 divide-y divide-border">
          {!data?.recent_activities || data.recent_activities.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Chưa có hoạt động mới nào được ghi nhận.
            </p>
          ) : (
            data.recent_activities.map((act) => (
              <div key={act.id} className="flex items-start justify-between py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-muted text-xs font-bold text-foreground">
                    {act.type === 'notification' ? (
                      <Bell className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    ) : act.type === 'feedback' ? (
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{act.title}</p>
                    <p className="text-xs text-muted-foreground">{act.description}</p>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {new Date(act.timestamp).toLocaleDateString('vi-VN')}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}