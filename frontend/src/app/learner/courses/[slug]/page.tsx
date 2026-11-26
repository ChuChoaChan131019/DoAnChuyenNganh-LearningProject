"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  MessagesSquare,
  ArrowRight,
  Bell,
  BellOff,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiClientError, courseApi, quizApi, learnerOverviewApi, userNotificationApi } from "@/lib/api";

import type { LearnerCourseOverview } from "@/types/learner-overview";

type CourseLessonPreview = { id: string; title: string; duration: string; completed: boolean };
type CourseChapterPreview = { id?: string; title: string; description: string; completed?: boolean; lessons: CourseLessonPreview[] };
type CourseTestPreview = {
  id: string; title: string; description?: string | null; duration?: string;
  difficulty?: string; questions?: number; total_questions?: number | null;
  duration_minutes?: number | null; quiz_type?: string;
};
type CoursePreview = {
  id: string | number; slug: string; title: string; level: string; description: string;
  lastUpdated: string; lessons: number; questions: number; hours: number;
  gradient?: string; chapters: CourseChapterPreview[]; tests: CourseTestPreview[];
  instructor: string; instructorRole: string;
  resources: Array<{ name: string; type: string; isVideo?: boolean }>;
};

const COURSE_MAP: Record<string, CoursePreview> = {
  "csharp-fundamentals": {
    id: 1,
    slug: "csharp-fundamentals",
    title: "C# cơ bản",
    level: "Cơ bản",
    description:
      "Start from zero: install the .NET SDK, write your first program, and master variables, data types, operators and control flow.",
    lastUpdated: "Updated 2026-08-02",
    lessons: 24,
    questions: 148,
    hours: 5,
    gradient: "from-[#f8d9d8] via-[#f7e6e1] to-[#edf1ee]",
    chapters: [
      {
        title: "Giới thiệu về C#",
        description:
          "Tìm hiểu C#, nền tảng .NET, công cụ phát triển và chương trình đầu tiên của bạn.",
        lessons: [
          {
            id: "what-is-csharp",
            title: "C# là gì?",
            duration: "8 min",
            completed: true,
          },
          {
            id: "installing-dotnet",
            title: "Cài đặt .NET",
            duration: "10 min",
            completed: true,
          },
          {
            id: "your-first-csharp-program",
            title: "Chương trình C# đầu tiên của bạn",
            duration: "12 min",
            completed: true,
          },
        ],
        completed: true,
      },
      {
        title: "Biến và kiểu dữ liệu",
        description:
          "Kiểu giá trị, kiểu tham chiếu, chuyển đổi kiểu và hằng số.",
        lessons: [
          {
            id: "variables-overview",
            title: "Tổng quan về biến và cú pháp",
            duration: "11 min",
            completed: true,
          },
          {
            id: "primitive-data-types",
            title: "Các kiểu dữ liệu nguyên thủy",
            duration: "14 min",
            completed: true,
          },
          {
            id: "type-conversion",
            title: "Chuyển đổi và ép kiểu",
            duration: "9 min",
            completed: true,
          },
          {
            id: "nullable-types",
            title: "Kiểu giá trị nullable trong C#",
            duration: "12 min",
            completed: true,
          },
        ],
        completed: true,
      },
      {
        title: "Luồng điều khiển",
        description: "Các cấu trúc rẽ nhánh và vòng lặp thường dùng.",
        lessons: [
          {
            id: "if-else-switch",
            title: "Câu lệnh if / else và switch",
            duration: "13 min",
            completed: true,
          },
          {
            id: "loops",
            title: "Vòng lặp for, while và foreach",
            duration: "15 min",
            completed: true,
          },
          {
            id: "break-continue",
            title: "Các câu lệnh break, continue và goto",
            duration: "7 min",
            completed: true,
          },
        ],
        completed: true,
      },
      {
        title: "Phương thức",
        description:
          "Tái sử dụng, tham số, giá trị trả về và thiết kế rõ ràng.",
        lessons: [
          {
            id: "what-are-methods",
            title: "Phương thức là gì?",
            duration: "8 min",
            completed: false,
          },
          {
            id: "parameters-and-returns",
            title: "Tham số và giá trị trả về",
            duration: "12 min",
            completed: false,
          },
          {
            id: "method-overloads",
            title: "Nạp chồng phương thức",
            duration: "10 min",
            completed: false,
          },
        ],
        completed: false,
      },
    ],
    instructor: "Dr. Lan Nguyen",
    instructorRole: "Người biên soạn · Giảng viên C#",
    resources: [
      { name: "Tài liệu tóm tắt ngôn ngữ C#", type: "PDF · 1.2 MB" },
      { name: "Installing the .NET SDK (walkthrough)", type: "Video · 84 MB" },
    ],
    tests: [
      {
        id: "final-assessment",
        title: "C# cơ bản — Bài đánh giá cuối khóa",
        description: "6 questions in this attempt",
        duration: "60 minutes, timed",
        difficulty: "Trung bình",
        questions: 6,
      },
      {
        id: "variables-quiz",
        title: "Trắc nghiệm về biến và kiểu dữ liệu",
        description: "15 questions in this attempt",
        duration: "20 minutes, timed",
        difficulty: "Dễ",
        questions: 15,
      },
    ],
  },
  "object-oriented-programming-in-csharp": {
    id: 2,
    slug: "object-oriented-programming-in-csharp",
    title: "Lập trình hướng đối tượng với C#",
    level: "Trung cấp",
    description:
      "Model real problems with classes and objects. Learn encapsulation, inheritance, polymorphism, and design clean solutions.",
    lastUpdated: "Updated 2026-08-11",
    lessons: 31,
    questions: 206,
    hours: 6,
    gradient: "from-[#dfeef7] via-[#edf3f7] to-[#edf7f2]",
    chapters: [
      {
        title: "Lớp và đối tượng",
        description: "Mô hình hóa các thực thể thực tế bằng lớp và đối tượng.",
        lessons: [
          {
            id: "classes-and-objects",
            title: "Lớp và đối tượng",
            duration: "9 min",
            completed: true,
          },
          {
            id: "constructors",
            title: "Hàm khởi tạo",
            duration: "11 min",
            completed: true,
          },
          {
            id: "properties",
            title: "Thuộc tính",
            duration: "8 min",
            completed: false,
          },
        ],
        completed: true,
      },
      {
        title: "Tính đóng gói",
        description: "Protect data and expose safe, intentional APIs.",
        lessons: [
          {
            id: "access-modifiers",
            title: "Phạm vi truy cập",
            duration: "12 min",
            completed: true,
          },
          {
            id: "fields-and-methods",
            title: "Fields and methods",
            duration: "10 min",
            completed: true,
          },
          {
            id: "readonly-and-static",
            title: "Readonly and static",
            duration: "9 min",
            completed: false,
          },
        ],
        completed: true,
      },
      {
        title: "Tính kế thừa",
        description: "Reuse behavior through hierarchies and base classes.",
        lessons: [
          {
            id: "base-classes",
            title: "Base classes",
            duration: "14 min",
            completed: false,
          },
          {
            id: "derived-classes",
            title: "Derived classes",
            duration: "12 min",
            completed: false,
          },
          {
            id: "virtual-methods",
            title: "Virtual methods",
            duration: "11 min",
            completed: false,
          },
        ],
        completed: false,
      },
      {
        title: "Tính đa hình",
        description: "Design flexible code with overriding and interfaces.",
        lessons: [
          {
            id: "method-overriding",
            title: "Method overriding",
            duration: "18 min",
            completed: false,
          },
          {
            id: "interfaces",
            title: "Interfaces",
            duration: "15 min",
            completed: false,
          },
          {
            id: "abstract-classes",
            title: "Abstract classes",
            duration: "13 min",
            completed: false,
          },
        ],
        completed: false,
      },
    ],
    instructor: "Dr. Lan Nguyen",
    instructorRole: "Người biên soạn · Giảng viên C#",
    resources: [
      { name: "OOP Practice Sheet", type: "PDF · 2.1 MB" },
      { name: "Class Design Checklist", type: "Document · 68 KB" },
    ],
    tests: [
      {
        id: "oop-quick-check",
        title: "Kiểm tra nhanh lập trình hướng đối tượng",
        description: "5 questions in this attempt",
        duration: "25 minutes, timed",
        difficulty: "Trung bình",
        questions: 5,
      },
    ],
  },
};

export default function LearnerCourseDetailPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const [courseProgress, setCourseProgress] =
    useState<LearnerCourseOverview | null>(null);
  const [databaseCourse, setDatabaseCourse] = useState<{
    id: string;
    title: string;
    slug: string;
  } | null>(null);
  const [databaseChapters, setDatabaseChapters] = useState<Array<{
    id: string;
    title: string;
    lessons: Array<{ id: string; title: string; duration: number }>;
  }> | null>(null);
  const [databaseQuizzes, setDatabaseQuizzes] = useState<Array<{
    id: string;
    title: string;
    description?: string | null;
    duration_minutes: number | null;
    total_questions: number | null;
    quiz_type: string;
  }> | null>(null);
  const [courseRequest, setCourseRequest] = useState<{
    slug: string;
    status: "ready" | "error" | "not_found";
  } | null>(null);
  const [quizLoadError, setQuizLoadError] = useState(false);
  const [quizReloadKey, setQuizReloadKey] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followSaving, setFollowSaving] = useState(false);
  const [followMessage, setFollowMessage] = useState('');

  useEffect(() => {
    if (!databaseCourse?.id) return;
    let active = true;
    void userNotificationApi.following(databaseCourse.id).then(({ following: value }) => {
      if (active) setFollowing(value);
    }).catch(() => {
      if (active) setFollowMessage('Không thể kiểm tra trạng thái theo dõi.');
    });
    return () => { active = false; };
  }, [databaseCourse?.id]);

  async function toggleCourseFollow() {
    if (!databaseCourse || followSaving) return;
    setFollowSaving(true);
    setFollowMessage('');
    try {
      const result = following
        ? await userNotificationApi.unfollow(databaseCourse.id)
        : await userNotificationApi.follow(databaseCourse.id);
      setFollowing(result.following);
      setFollowMessage(result.following ? 'Đã theo dõi khóa học.' : 'Đã bỏ theo dõi khóa học.');
    } catch (cause) {
      setFollowMessage(cause instanceof ApiClientError ? cause.message : 'Không thể cập nhật theo dõi.');
    } finally { setFollowSaving(false); }
  }

  useEffect(() => {
    if (!slug) return;

    let active = true;

    void learnerOverviewApi.get().then(
      (data) => {
        if (active) {
          setCourseProgress(
            data.courses.find((item) => item.slug === slug) ?? null,
          );
        }
      },
      () => {
        if (active) setCourseProgress(null);
      },
    );

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    courseApi
      .learnerLessons(slug)
      .then(async (response) => {
        if (!active) return;
        setDatabaseCourse(response.course);
        setDatabaseChapters(response.chapters);
        setDatabaseQuizzes(null);
        setQuizLoadError(false);
        setCourseRequest({ slug, status: "ready" });

        // Lấy danh sách quiz đã xuất bản của khóa học
        let quizzes;
        try {
          quizzes = await quizApi.list({ course_id: response.course.id, status: "published" });
        } catch {
          if (active) {
            setDatabaseQuizzes(null);
            setQuizLoadError(true);
          }
          return;
        }

        // Lấy chính xác số câu hỏi cho từng bài test
        const quizzesWithQuestions = await Promise.all(
          (quizzes || []).map(async (quiz) => {
            let count: number | null = null;
            try {
              const qList = await quizApi.getQuestions(quiz.id);
              count = Array.isArray(qList) ? qList.length : 0;
            } catch {
              count = null;
            }

            return {
              id: quiz.id,
              title: quiz.title,
              description: quiz.description,
              duration_minutes: quiz.duration_minutes,
              total_questions: count,
              quiz_type: quiz.quiz_type,
            };
          }),
        );

        if (active) setDatabaseQuizzes(quizzesWithQuestions);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDatabaseCourse(null);
        setDatabaseChapters(null);
        setDatabaseQuizzes(null);
        setCourseRequest({ slug, status: error instanceof ApiClientError && error.status === 404 ? "not_found" : "error" });
      });
    return () => { active = false; };
  }, [slug, quizReloadKey]);

  const requestStatus = courseRequest?.slug === slug ? courseRequest?.status ?? "loading" : "loading";
  const fallbackCourse = requestStatus === "ready" && slug ? COURSE_MAP[slug] : null;
  const baseCourse =
    requestStatus === "ready" ? (fallbackCourse ??
    (databaseCourse
      ? {
          id: databaseCourse.id,
          slug: databaseCourse.slug,
          title: databaseCourse.title,
          level: "Cơ bản",
          description: "Learning content loaded from Supabase.",
          lastUpdated: "Updated today",
          lessons: 0,
          questions: 0,
          hours: 0,
          chapters: [],
          instructor: "Learning team",
          instructorRole: "Course instructor",
          resources: [],
          tests: [],
        }
      : null)) : null;
  const course =
    baseCourse && databaseChapters
      ? {
          ...baseCourse,
          lessons: databaseChapters.reduce(
            (sum, chapter) => sum + chapter.lessons.length,
            0,
          ),
          chapters: databaseChapters.map((chapter) => {
            const fallbackChapter = baseCourse.chapters.find(
              (item) => item.title === chapter.title,
            );

            return {
              id: chapter.id,
              title: chapter.title,
              description: fallbackChapter?.description ?? "",
              completed: false,
              lessons: chapter.lessons.map((lesson) => ({
                id: lesson.id,
                title: lesson.title,
                duration: `${lesson.duration} min`,
                completed:
                  courseProgress?.completed_lesson_ids.includes(lesson.id) ??
                  false,
              })),
            };
          }),
        }
      : fallbackCourse;
  const tests: CourseTestPreview[] = databaseCourse ? databaseQuizzes ?? [] : course?.tests ?? [];

  if (requestStatus === "loading") {
    return <div className="mx-auto max-w-3xl rounded-[24px] border border-slate-200 bg-white p-10 text-center text-slate-600">Đang tải khóa học...</div>;
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-3xl rounded-[24px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">
          {requestStatus === "not_found" ? "Không tìm thấy khóa học" : "Không tải được khóa học"}
        </h1>
        <p className="mt-2 text-slate-500">
          {requestStatus === "not_found" ? "Lộ trình học này chưa tồn tại." : "Vui lòng thử tải lại khóa học."}
        </p>
        {requestStatus === "error" && (
          <button type="button" onClick={() => { setCourseRequest(null); setQuizReloadKey((key) => key + 1); }}
            className="mt-6 inline-flex items-center rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white">
            Thử lại
          </button>
        )}
        <Link
          href="/learner/courses"
          className="mt-6 ml-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Quay lại danh sách khóa học
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] pb-10">
      <Link
        href="/learner/courses"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Tất cả khóa học
      </Link>

      <div className="space-y-5">
        {/* Banner Top */}
        <div className="overflow-hidden rounded-[18px] border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
          <div className="relative h-[190px] bg-[#f3dfe0]">
            <div className="absolute inset-0 bg-[#f3dfe0]" />
            <div className="absolute bottom-4 right-5 flex h-[72px] w-[72px] items-center justify-center rounded-[12px] border border-slate-200 bg-white/70 shadow-sm">
              <BookOpen className="h-9 w-9 text-slate-400" />
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-[#f7d0d0] bg-[#fbe7e9] px-2.5 py-1 text-[11px] font-bold text-[#f7444e]">
                {course.level}
              </span>
              <span className="text-[13px] text-[#5d6b73]">
                Updated {course.lastUpdated.split("Updated ")[1]}
              </span>
            </div>

            <h1 className="mt-4 text-[38px] font-black leading-[1.05] tracking-[-0.06em] text-[#0f3741]">
              {course.title}
            </h1>

            {courseProgress && (
              <div className="mt-5 max-w-xl space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-600">
                    Tiến độ khóa học
                  </span>

                  <span className="font-black text-[#145a68]">
                    {courseProgress.percentage}%
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#78bcc4]"
                    style={{
                      width: `${courseProgress.percentage}%`,
                    }}
                  />
                </div>

                <p className="text-xs text-slate-500">
                  {courseProgress.completed_units}/{courseProgress.total_units}{" "}
                  đơn vị học tập hoàn thành
                </p>

                {courseProgress.next && (
                  <Link
                    href={courseProgress.next.href}
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#145a68]"
                  >
                    Tiếp tục học: {courseProgress.next.title}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}

            <p className="mt-3 max-w-[980px] text-[18px] leading-8 text-slate-600">
              {course.description}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fff0f0] text-[#f7444e]">
                  <BookOpen className="h-3.5 w-3.5" />
                </span>
                <span>{course.lessons} lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fff0f0] text-[#f7444e]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <span>{course.questions} practice questions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fff0f0] text-[#f7444e]">
                  <Clock3 className="h-3.5 w-3.5" />
                </span>
                <span>~{course.hours} hours</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#e1e6e3] pt-4">
              {databaseCourse && (
                <button type="button" disabled={followSaving} onClick={() => void toggleCourseFollow()}
                  className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#78bcc4]/60 bg-white px-4 py-3 text-sm font-bold text-[#145a68] transition hover:bg-[#eef7f7] disabled:opacity-50">
                  {following ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  {followSaving ? 'Đang lưu...' : following ? 'Bỏ theo dõi' : 'Theo dõi khóa học'}
                </button>
              )}
              {databaseCourse && (
                <Link
                  href={`/learner/courses/${slug}/discussion`}
                  className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#78bcc4]/60 bg-[#eef7f7] px-4 py-3 text-sm font-bold text-[#145a68] transition hover:bg-[#e2f1f1]"
                >
                  <MessagesSquare className="h-4 w-4" />
                  Tất cả thảo luận
                </Link>
              )}
              <Link
                href="/learner/practice"
                className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-[#f4b7b7] bg-[#fff3f2] px-4 py-3 text-sm font-bold text-[#f7444e] transition hover:bg-[#ffe9e7]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Câu hỏi luyện tập
              </Link>
            </div>
            {!!followMessage && <p role="status" className="mt-2 text-right text-xs text-[#637981]">{followMessage}</p>}
          </div>
        </div>

        {/* 2 Cột: Curriculum & Side panels */}
        <div className="grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
          <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)] sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[24px] font-bold tracking-tight text-slate-800">
                Chương trình học
              </h2>
              <div className="text-sm text-slate-500">
                {course.chapters.length} chapters • {course.lessons} lessons
              </div>
            </div>

            <div className="space-y-4">
              {course.chapters.map((chapter, index: number) => (
                <div
                  key={chapter.id ?? chapter.title}
                  className="overflow-hidden rounded-[16px] border border-slate-200 bg-[#fafafa]"
                >
                  <div className="flex items-start justify-between gap-4 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef5f5] text-sm font-bold text-slate-700">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-[20px] font-semibold tracking-[-0.02em] text-slate-800">
                          {chapter.title}
                        </div>
                        <div className="mt-1 text-[14px] text-slate-500">
                          {chapter.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <span className="text-[14px] text-slate-400">
                        {chapter.lessons?.reduce(
                          (sum: number, lesson) =>
                            sum + Number.parseInt(lesson.duration, 10) || 0,
                          0,
                        ) || 0}{" "}
                        min
                      </span>
                      {chapter.id && (
                        <Link
                          href={`/learner/courses/${slug}/discussion/${chapter.id}`}
                          className="rounded-lg border border-[#78bcc4]/50 bg-white px-2.5 py-1.5 text-xs font-bold text-[#145a68] transition hover:bg-[#eaf4f3]"
                        >
                          Thảo luận chương
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* DANH SÁCH BÀI HỌC — ĐỒNG BỘ ĐƯỜNG DẪN VỚI THƯ MỤC LESSON */}
                  <div className="border-t border-slate-200 bg-white">
                    {chapter.lessons?.map(
                      (lesson, lessonIndex: number) => {
                        const lessonSlug =
                          lesson.id ||
                          lesson.title
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-");

                        return (
                          <Link
                            key={`${chapter.title}-${lesson.title}`}
                            href={`/learner/courses/${slug}/lessons/${lessonSlug}`}
                            className={`group flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-rose-50/50 ${
                              lessonIndex !== 0
                                ? "border-t border-slate-100"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">
                                {lessonIndex + 1}
                              </span>
                              <span className="text-[16px] font-medium text-slate-700 transition group-hover:font-semibold group-hover:text-[#f7444e]">
                                {lesson.title}
                              </span>
                            </div>
                            <span className="flex items-center gap-2 text-[14px] font-medium text-slate-400">
                              {lesson.completed && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              )}

                              {lesson.duration}
                            </span>
                          </Link>
                        );
                      },
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cột phải: Instructor, Tests, Resources */}
          <div className="space-y-5">
            <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
              <h3 className="text-[22px] font-bold tracking-tight text-slate-800">
                Giảng viên
              </h3>
              <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dfeff5] text-base font-bold text-slate-700">
                  DL
                </div>
                <div>
                  <div className="text-[15px] font-bold text-slate-800">
                    {course.instructor}
                  </div>
                  <div className="text-xs text-slate-500">
                    {course.instructorRole}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[22px] font-bold tracking-tight text-slate-800">
                  Bài kiểm tra
                </h3>
                <span className="text-sm text-slate-500">
                  {quizLoadError ? "Chưa tải được" : databaseQuizzes === null ? "Đang tải..." : `${tests.length} available`}
                </span>
              </div>

              <div className="space-y-3">
                {quizLoadError && (
                  <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <p>Không tải được bài kiểm tra.</p>
                    <button type="button" onClick={() => { setQuizLoadError(false); setQuizReloadKey((key) => key + 1); }}
                      className="mt-2 font-semibold underline underline-offset-2">Thử lại</button>
                  </div>
                )}
                {tests.map((test) => (
                  <div
                    key={test.id}
                    className="rounded-[12px] border border-slate-200 bg-[#f8f7f5] p-3"
                  >
                    <div className="text-[15px] font-semibold text-slate-800">
                      {test.title}
                    </div>
                    <div className="mt-1 text-[13px] text-slate-500">
                      {test.description || (test.total_questions == null ? "Chưa tải được số câu hỏi" : `${test.total_questions} questions`)}{" "}
                      •{" "}
                      {test.duration ||
                        (test.duration_minutes === null
                          ? "Unlimited time"
                          : `${test.duration_minutes} minutes`)}
                      {test.difficulty ? ` • ${test.difficulty}` : ""}
                    </div>
                    {test.total_questions === null && test.description && (
                      <p className="mt-1 text-xs text-amber-700">Chưa tải được số câu hỏi.</p>
                    )}
                    <Link
                      href={`/learner/courses/${slug}/tests/${test.id}`}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-[10px] bg-[#F7444E] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#e33b3b]"
                    >
                      Bắt đầu làm bài
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
              <h3 className="text-[22px] font-bold tracking-tight text-slate-800">
                Tài liệu
              </h3>
              <p className="mt-3 text-sm text-slate-500">
                Mở bài học để xem tệp PDF, hình ảnh và mã nguồn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
