"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Code2,
  Compass,
  GraduationCap,
  RefreshCw,
  Target,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { learnerOverviewApi } from "@/lib/api";

import type { LearnerOverview } from "@/types/learner-overview";

export default function LearnerDashboardPage() {
  const { user } = useAuth();

  const [overview, setOverview] = useState<LearnerOverview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayName =
    user?.fullName?.trim() || user?.email?.split("@")[0] || "Học viên";

  const loadOverview = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await learnerOverviewApi.get();
      setOverview(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải tiến độ học tập.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    void learnerOverviewApi.get().then(
      (data) => {
        if (active) {
          setOverview(data);
          setLoading(false);
        }
      },
      (requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Không thể tải tiến độ học tập.",
          );
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  const summary = overview?.summary;
  const continueItem = overview?.continue_learning;

  const statCards = [
    {
      title: "Khóa học đã bắt đầu",
      value: summary?.started_courses ?? 0,
      detail: `${summary?.completed_courses ?? 0} khóa hoàn thành`,
      icon: GraduationCap,
      color: "text-[#145a68]",
      background: "bg-cyan-50",
    },
    {
      title: "Lesson hoàn thành",
      value: `${summary?.lessons.completed ?? 0}/${summary?.lessons.total ?? 0}`,
      detail: "Bài học đã đánh dấu xong",
      icon: BookOpen,
      color: "text-blue-600",
      background: "bg-blue-50",
    },
    {
      title: "Quiz đã đạt",
      value: `${summary?.quizzes.completed ?? 0}/${summary?.quizzes.total ?? 0}`,
      detail: "Quiz có kết quả đạt",
      icon: CheckCircle2,
      color: "text-emerald-600",
      background: "bg-emerald-50",
    },
    {
      title: "Bài code hoàn thành",
      value: `${summary?.code.completed ?? 0}/${summary?.code.total ?? 0}`,
      detail: "Theo phiên bản đề hiện hành",
      icon: Code2,
      color: "text-rose-600",
      background: "bg-rose-50",
    },
  ];

  const quickLinks = [
    {
      title: "Khám phá khóa học",
      description: "Tìm khóa học C# phù hợp để bắt đầu.",
      href: "/learner/courses",
      icon: Compass,
    },
    {
      title: "Luyện tập",
      description: "Làm bài kiểm tra và củng cố kiến thức.",
      href: "/learner/practice",
      icon: Target,
    },
    {
      title: "AI Tutor",
      description: "Nhận hỗ trợ khi học C# và lập trình.",
      href: "/learner/ai-tutor",
      icon: Bot,
    },
  ];

  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-72 items-center justify-center text-sm text-slate-500"
      >
        Đang tải tiến độ học tập...
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-6 text-center">
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>

        <button
          type="button"
          onClick={() => void loadOverview()}
          className="mt-4 rounded-xl bg-[#145a68] px-4 py-2 text-sm font-bold text-white"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1216px] space-y-8 pb-12">
      {/* Lời chào */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-sm font-semibold text-[#145a68]">
            Dashboard học viên
          </p>

          <h1 className="mt-1 text-3xl font-black text-[#0f3741]">
            Chào mừng trở lại, {displayName}!
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Tiến độ được tổng hợp từ lesson, quiz và bài thực hành C#.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOverview()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>
      </div>

      {/* Thống kê thực tế */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.background} ${card.color}`}
              >
                <Icon className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs text-slate-500">{card.title}</p>

                <p className="mt-1 text-2xl font-black text-[#0f3741]">
                  {card.value}
                </p>

                <p className="mt-1 text-xs text-slate-400">{card.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tiến độ tổng hợp */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-[#0f3741]">
              Tiến độ học tập tổng hợp
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Hoàn thành {summary?.completed_units ?? 0}/
              {summary?.total_units ?? 0} đơn vị học tập
            </p>
          </div>

          <span className="text-3xl font-black text-[#145a68]">
            {summary?.percentage ?? 0}%
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-[#78bcc4] transition-all"
            style={{
              width: `${summary?.percentage ?? 0}%`,
            }}
          />
        </div>

        <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
          <p>
            Lesson: {summary?.lessons.completed ?? 0}/
            {summary?.lessons.total ?? 0}
          </p>

          <p>
            Quiz: {summary?.quizzes.completed ?? 0}/
            {summary?.quizzes.total ?? 0}
          </p>

          <p>
            Bài code: {summary?.code.completed ?? 0}/{summary?.code.total ?? 0}
          </p>
        </div>
      </section>

      {/* Tiếp tục học */}
      <section className="rounded-2xl border border-[#78bcc4]/60 bg-[#f1f8f8] p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold text-[#145a68]">TIẾP TỤC HỌC</p>

        {continueItem ? (
          <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm text-slate-500">
                {continueItem.course_title}
              </p>

              <h2 className="mt-2 text-xl font-black text-[#0f3741]">
                {continueItem.title}
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                {continueItem.kind === "lesson"
                  ? "Tiếp tục đọc bài học."
                  : continueItem.kind === "quiz"
                    ? "Tiếp tục làm bài kiểm tra."
                    : "Tiếp tục bài thực hành C#."}
              </p>
            </div>

            <Link
              href={continueItem.href}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0f3741] px-5 py-3 text-sm font-bold text-white hover:bg-[#145a68]"
            >
              Học tiếp ngay
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-4">
            <h2 className="text-xl font-black text-[#0f3741]">
              Chưa có nội dung học dở
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Khám phá khóa học để bắt đầu lộ trình học tập.
            </p>

            <Link
              href="/learner/courses"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0f3741] px-5 py-3 text-sm font-bold text-white"
            >
              Khám phá khóa học
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>

      {/* Tiến độ từng khóa học */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-[#0f3741]">
          Tiến độ theo khóa học
        </h2>

        {!overview?.courses.some((course) => course.started) ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
            Bạn chưa bắt đầu khóa học nào.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {overview.courses
              .filter((course) => course.started)
              .map((course) => (
                <article
                  key={course.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-bold text-[#0f3741]">{course.title}</h3>

                  <p className="mt-2 text-sm text-slate-500">
                    {course.completed_units}/{course.total_units} đơn vị hoàn
                    thành
                  </p>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#78bcc4]"
                      style={{
                        width: `${course.percentage}%`,
                      }}
                    />
                  </div>

                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>
                      {course.total_units > 0 &&
                      course.completed_units === course.total_units
                        ? "Đã hoàn thành"
                        : "Đang học"}
                    </span>

                    <span className="font-bold">{course.percentage}%</span>
                  </div>

                  <Link
                    href={
                      course.next?.href ??
                      `/learner/courses/${encodeURIComponent(course.slug)}`
                    }
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#145a68]"
                  >
                    {course.next ? "Tiếp tục khóa học" : "Xem khóa học"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
          </div>
        )}
      </section>

      {/* Điều hướng nhanh */}
      <section>
        <h2 className="mb-4 text-xl font-black text-[#0f3741]">
          Khám phá thêm
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;

            return (
              <Link
                href={link.href}
                key={link.href}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#78bcc4]"
              >
                <Icon className="h-7 w-7 text-[#145a68]" />

                <h3 className="mt-3 font-bold text-[#0f3741]">{link.title}</h3>

                <p className="mt-2 text-sm text-slate-500">
                  {link.description}
                </p>

                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#145a68]">
                  Xem ngay
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
