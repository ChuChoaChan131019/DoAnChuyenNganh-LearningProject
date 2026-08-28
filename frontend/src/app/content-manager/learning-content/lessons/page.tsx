"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock3, FileText, Plus, Search } from "lucide-react";
import type { ContentStatus, Lesson } from "@/types/learning-content";

type LessonRow = Lesson & { course: string; chapter: string; slug: string };

const lessons: LessonRow[] = [
  {
    code: "L01",
    title: "What is C#?",
    slug: "what-is-csharp",
    chapter: "Introduction to C#",
    course: "C# Fundamentals",
    duration: "8m",
    status: "Published",
  },
  {
    code: "L02",
    title: "Installing .NET",
    slug: "installing-dotnet",
    chapter: "Introduction to C#",
    course: "C# Fundamentals",
    duration: "10m",
    status: "Published",
  },
  {
    code: "L03",
    title: "Your First C# Program",
    slug: "first-csharp-program",
    chapter: "Introduction to C#",
    course: "C# Fundamentals",
    duration: "12m",
    status: "Published",
  },
  {
    code: "L01",
    title: "Variables",
    slug: "variables",
    chapter: "Variables and Data Types",
    course: "C# Fundamentals",
    duration: "11m",
    status: "Published",
  },
  {
    code: "L02",
    title: "Data Types",
    slug: "data-types",
    chapter: "Variables and Data Types",
    course: "C# Fundamentals",
    duration: "14m",
    status: "Published",
  },
  {
    code: "L03",
    title: "Type Conversion",
    slug: "type-conversion",
    chapter: "Variables and Data Types",
    course: "C# Fundamentals",
    duration: "9m",
    status: "Approved",
    ai: true,
  },
  {
    code: "L01",
    title: "if / else and switch",
    slug: "if-else-switch",
    chapter: "Control Flow",
    course: "C# Fundamentals",
    duration: "13m",
    status: "Published",
  },
];

const statusStyles: Record<ContentStatus, string> = {
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Approved: "border-cyan-200 bg-cyan-50 text-cyan-700",
  "In review": "border-amber-200 bg-amber-50 text-amber-700",
  Draft: "border-slate-200 bg-slate-100 text-slate-600",
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
  const filteredLessons = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? lessons.filter((lesson) =>
          [lesson.title, lesson.chapter, lesson.course, lesson.slug].some(
            (value) => value.toLowerCase().includes(term),
          ),
        )
      : lessons;
  }, [query]);

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">
            Lessons
          </h1>
          <p className="mt-1 text-sm text-[#637981]">
            All C# lesson content, from “What is C#?” to “async / await”.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F7444E] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#df3540]"
        >
          <Plus className="h-4 w-4" />
          New lesson
        </button>
      </header>
      <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_24px_rgba(0,44,62,0.06)]">
        <div className="border-b border-[#dfe6df] px-4 py-4 sm:px-5">
          <label className="relative block w-full max-w-[348px]">
            <span className="sr-only">Search lessons</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71878c]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search lessons..."
              className="h-10 w-full rounded-xl border border-[#dfe6df] pl-10 pr-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20"
            />
          </label>
        </div>
        <div>
          {filteredLessons.map((lesson) => (
            <Link
              key={lesson.slug}
              href={`/content-manager/learning-content/lessons/${lesson.slug}`}
              className="flex min-h-[70px] items-center gap-3 border-b border-[#dfe6df] px-5 transition hover:bg-[#f8fbf9] last:border-0"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e0f3f2] text-[#527983]">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#002C3E]">{lesson.title}</p>
                <p className="truncate text-xs text-[#637981]">
                  {lesson.chapter} · {lesson.slug && `/${lesson.slug}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden items-center gap-1 text-xs text-[#637981] sm:flex">
                  <Clock3 className="h-3.5 w-3.5" />
                  {lesson.duration}
                </span>
                {lesson.ai && (
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">
                    ✣ AI
                  </span>
                )}
                <StatusBadge status={lesson.status} />
              </div>
            </Link>
          ))}
        </div>
        {filteredLessons.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-[#637981]">
            No lessons found.
          </p>
        )}
      </section>
    </div>
  );
}
