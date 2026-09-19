'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { dashboardApi, DashboardData, CourseProgress } from '@/lib/api';
import {
  BookOpen,
  Clock,
  Flame,
  CheckCircle2,
  PlayCircle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function LearnerDashboardPage() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName = user?.fullName?.trim() || user?.email?.split('@')[0] || 'Learner';

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardApi.get();
        setDashboardData(data);
      } catch (err) {
        console.error('Failed to fetch dashboard:', err);
        setError('Không thể tải dữ liệu dashboard. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Đang tải dashboard...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl border px-4 py-2 text-sm hover:bg-muted"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // Calculate stats from dashboard data
  const enrolledCourses = dashboardData?.progress.courses.length || 0;
  const inProgressCourses = dashboardData?.progress.courses.filter(c => c.percentage > 0 && c.percentage < 100).length || 0;

  // Get primary course with progress
  const primaryCourse = dashboardData?.progress.courses.find(c => c.percentage > 0) || dashboardData?.progress.courses[0];

  // Get continue learning info
  const continueLearning = dashboardData?.continue_learning;
  const continueLearningTitle = continueLearning?.type === 'study_plan'
    ? continueLearning.study_plan?.lesson_name
    : continueLearning?.type === 'lesson'
    ? continueLearning.lesson?.name
    : null;
  const continueLearningCourse = continueLearning?.type === 'study_plan'
    ? continueLearning.study_plan?.course_name
    : continueLearning?.type === 'lesson'
    ? continueLearning.lesson?.course_name
    : null;

  // Get task counts
  const taskCounts = {
    active: dashboardData?.tasks.active.length || 0,
    overdue: dashboardData?.tasks.overdue.length || 0,
    upcoming: dashboardData?.tasks.upcoming.length || 0,
  };

  const stats = [
    {
      label: 'Enrolled courses',
      value: enrolledCourses.toString(),
      delta: inProgressCourses > 0 ? `${inProgressCourses} in progress` : 'No courses in progress',
      icon: BookOpen,
    },
    {
      label: 'Learning time',
      value: '28.5 hrs',
      delta: '+4.2 hrs this week',
      icon: Clock,
    },
    {
      label: 'Daily streak',
      value: '12 days',
      delta: 'Personal best!',
      icon: Flame,
    },
    {
      label: 'Active tasks',
      value: (taskCounts.active + taskCounts.overdue + taskCounts.upcoming).toString(),
      delta: taskCounts.overdue > 0 ? `${taskCounts.overdue} overdue` : 'All on track',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sẵn sàng tiếp tục lộ trình làm chủ ngôn ngữ C# và .NET của bạn hôm nay chưa?
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/learner/practice"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-white"
          >
            <PlayCircle className="h-4 w-4" />
            Luyện tập ngay
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-5 text-3xl font-bold">{stat.value}</p>
              {stat.delta && (
                <p className={`mt-1 text-xs ${stat.delta.includes('overdue') ? 'text-destructive' : 'text-success'}`}>
                  {stat.delta}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Continue Learning Section */}
      {continueLearning && continueLearning.type !== 'empty' && continueLearningTitle ? (
        <section className="rounded-2xl border bg-card p-5">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-3">
              <h2 className="font-semibold text-primary flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {continueLearning!.type === 'study_plan' ? 'Kế hoạch học tập' : 'Bài học đang dở'}
              </h2>
              <h3 className="text-xl font-bold">
                {continueLearningCourse || 'Khóa học của bạn'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Bài học tiếp theo: <span className="font-semibold text-foreground">{continueLearningTitle}</span>
              </p>

              {primaryCourse && (
                <div className="w-full max-w-md pt-4">
                  <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Tiến độ hoàn thành</span>
                    <span className="font-bold text-foreground">{primaryCourse.percentage}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-brand transition-all"
                      style={{ width: `${primaryCourse.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center">
              <Link
                href="/learner/courses"
                className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-muted"
              >
                Học tiếp ngay
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border bg-card p-5">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-3">
              <h2 className="font-semibold text-primary flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Bắt đầu hành trình của bạn
              </h2>
              <h3 className="text-xl font-bold">
                Không có bài học nào đang dở
              </h3>
              <p className="text-sm text-muted-foreground">
                Hãy đăng ký một khóa học để bắt đầu học tập!
              </p>
            </div>

            <div className="flex shrink-0 items-center">
              <Link
                href="/learner/courses"
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
              >
                Khám phá khóa học
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Course Progress Section */}
      {dashboardData?.progress.courses && dashboardData.progress.courses.length > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-4 font-semibold">Tiến độ các khóa học</h2>
          <div className="space-y-4">
            {dashboardData.progress.courses.map((course: CourseProgress) => (
              <div key={course.course_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{course.course_name}</span>
                  <span className="text-sm text-muted-foreground">
                    {course.completed_lessons}/{course.total_lessons} bài học
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-brand transition-all"
                    style={{ width: `${course.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{course.percentage}% hoàn thành</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tasks Section */}
      {(taskCounts.active > 0 || taskCounts.overdue > 0 || taskCounts.upcoming > 0) && (
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-4 font-semibold">Nhiệm vụ của bạn</h2>
          <div className="space-y-3">
            {taskCounts.overdue > 0 && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{taskCounts.overdue} nhiệm vụ quá hạn</span>
              </div>
            )}
            {taskCounts.upcoming > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{taskCounts.upcoming} nhiệm vụ sắp đến hạn</span>
              </div>
            )}
            {taskCounts.active > 0 && (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span>{taskCounts.active} nhiệm vụ đang hoạt động</span>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
