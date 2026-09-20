"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock3, FileText, Filter, Plus, Search } from "lucide-react";
import type { ContentStatus, Lesson } from "@/types/learning-content";
import { courseApi } from "@/lib/api";

type LessonRow = Lesson & { courseId?: string; course: string; chapter: string; slug: string };

const statusStyles: Record<ContentStatus, string> = {
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  Approved: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300",
  "In review": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  Draft: "border-border bg-muted text-muted-foreground",
};

function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {status}
    </span>
  );
}

export default function LessonsPage() {
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState<Array<{ id: string | number; title: string }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    courseApi.list()
      .then(async (coursesList) => {
        if (isActive) {
          setCourses(coursesList.map((c) => ({ id: c.id, title: c.title })));
        }
        const lessonGroups = await Promise.all(
          coursesList.map(async (course) => {
            const chapters = await courseApi.chapters(String(course.id));
            return chapters.flatMap((chapter) =>
              chapter.lessons.map((lesson) => ({
                ...lesson,
                courseId: String(course.id),
                slug: lesson.id ?? lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                course: course.title,
                chapter: chapter.title,
              })),
            );
          }),
        );

        if (isActive) {
          setLessons(lessonGroups.flat());
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isActive) {
          setLoadError("Unable to load lessons.");
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredLessons = useMemo(() => {
    let result = lessons;
    if (selectedCourseId) {
      result = result.filter((lesson) => lesson.courseId === selectedCourseId);
    }
    const term = query.trim().toLowerCase();
    if (term) {
      result = result.filter((lesson) =>
        [lesson.title, lesson.chapter, lesson.course, lesson.slug].some(
          (value) => value.toLowerCase().includes(term),
        ),
      );
    }
    return result;
  }, [lessons, selectedCourseId, query]);

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Lessons
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All C# lesson content, from “What is C#?” to “async / await”.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Bộ lọc theo khóa học */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-xs">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="bg-transparent font-medium text-foreground outline-none cursor-pointer text-sm"
              aria-label="Chọn khóa học để lọc"
            >
              <option value="" className="bg-card text-foreground">
                Tất cả khóa học
              </option>
              {courses.map((course) => (
                <option key={course.id} value={String(course.id)} className="bg-card text-foreground">
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          <Link
            href="/content-manager/learning-content/lessons/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-xs hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            New lesson
          </Link>
        </div>
      </header>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <label className="relative block w-full max-w-[348px]">
            <span className="sr-only">Search lessons</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search lessons..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
        <div>
          {isLoading && (
            <p className="px-5 py-12 text-center text-sm text-muted-foreground">
              Loading lessons...
            </p>
          )}
          {!isLoading && loadError && (
            <p className="px-5 py-12 text-center text-sm text-destructive">
              {loadError}
            </p>
          )}
          {filteredLessons.map((lesson) => (
            <Link
              key={lesson.slug}
              href={`/content-manager/learning-content/lessons/${lesson.slug}`}
              className="flex min-h-[70px] items-center gap-3 border-b border-border px-5 transition hover:bg-muted/40 last:border-0"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{lesson.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {lesson.chapter} · {lesson.slug && `/${lesson.slug}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                  <Clock3 className="h-3.5 w-3.5" />
                  {lesson.duration}
                </span>
                {lesson.ai && (
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/40 px-2 py-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
                    ✣ AI
                  </span>
                )}
                <StatusBadge status={lesson.status} />
              </div>
            </Link>
          ))}
        </div>
        {!isLoading && !loadError && filteredLessons.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            No lessons found.
          </p>
        )}
      </section>
    </div>
  );
}
