"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  FileText,
} from "lucide-react";
import type { Chapter, ContentStatus } from "@/types/learning-content";

const initialChapters: Chapter[] = [
  {
    id: 1,
    title: "Introduction to C#",
    summary: "What C# is, the .NET platform, tooling and your first program.",
    lessons: [
      {
        code: "L01",
        title: "What is C#?",
        duration: "8m",
        status: "Published",
      },
      {
        code: "L02",
        title: "Installing .NET",
        duration: "10m",
        status: "Published",
      },
      {
        code: "L03",
        title: "Your First C# Program",
        duration: "12m",
        status: "Published",
      },
    ],
  },
  {
    id: 2,
    title: "Variables and Data Types",
    summary: "Value types, reference types, conversion and constants.",
    lessons: [
      { code: "L01", title: "Variables", duration: "11m", status: "Published" },
      {
        code: "L02",
        title: "Data Types",
        duration: "14m",
        status: "Published",
      },
      {
        code: "L03",
        title: "Type Conversion",
        duration: "9m",
        status: "Approved",
        ai: true,
      },
    ],
  },
  {
    id: 3,
    title: "Control Flow",
    summary: "Branching and looping constructs used every day.",
    lessons: [
      {
        code: "L01",
        title: "if / else and switch",
        duration: "13m",
        status: "Published",
      },
      {
        code: "L02",
        title: "for, while and foreach",
        duration: "15m",
        status: "In review",
        ai: true,
      },
      {
        code: "L03",
        title: "break, continue and goto",
        duration: "7m",
        status: "Draft",
      },
    ],
  },
  {
    id: 4,
    title: "Methods",
    summary: "Parameters, return values, overloading and expression bodies.",
    lessons: [
      {
        code: "L01",
        title: "Declaring Methods",
        duration: "12m",
        status: "Published",
      },
      {
        code: "L02",
        title: "Parameters: ref, out, params",
        duration: "16m",
        status: "Draft",
        ai: true,
      },
    ],
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

export default function ChaptersPage() {
  const [chapters, setChapters] = useState(initialChapters);
  const [selectedCourse, setSelectedCourse] = useState("C# Fundamentals");
  const [expanded, setExpanded] = useState<number[]>(
    initialChapters.map((chapter) => chapter.id),
  );

  const addLesson = (chapterId: number) => {
    setChapters((current) =>
      current.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              lessons: [
                ...chapter.lessons,
                {
                  code: `L${String(chapter.lessons.length + 1).padStart(2, "0")}`,
                  title: "New lesson",
                  duration: "0m",
                  status: "Draft",
                },
              ],
            }
          : chapter,
      ),
    );
  };

  const addChapter = () => {
    const id = Math.max(...chapters.map((chapter) => chapter.id), 0) + 1;
    setChapters((current) => [
      ...current,
      {
        id,
        title: "New chapter",
        summary: "Add a short chapter description.",
        lessons: [],
      },
    ]);
    setExpanded((current) => [...current, id]);
  };

  return (
    <div className="mx-auto max-w-[1328px] space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">
            Chapter management
          </h1>
          <p className="mt-1 text-sm text-[#637981]">
            Drag chapters to reorder the curriculum. Expand a chapter to manage
            its lessons.
          </p>
        </div>
        <label className="relative flex h-10 min-w-[290px] items-center">
          <span className="sr-only">Select course</span>
          <select
            value={selectedCourse}
            onChange={(event) => setSelectedCourse(event.target.value)}
            className="h-full w-full appearance-none rounded-xl border border-[#dfe6df] bg-white px-3 pr-9 text-sm text-[#526f78] outline-none focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20"
          >
            <option>C# Fundamentals</option>
            <option>Object-Oriented Programming in C#</option>
            <option>Advanced C#</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[#71878c]" />
        </label>
      </header>
      <section className="space-y-4">
        {chapters.map((chapter, index) => {
          const isExpanded = expanded.includes(chapter.id);
          return (
            <article
              key={chapter.id}
              className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]"
            >
              <div className="flex items-center gap-3 border-b border-[#dfe6df] px-5 py-4">
                <GripVertical className="h-4 w-4 shrink-0 text-[#71878c]" />
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffe0df] font-mono text-xs font-semibold text-[#F7444E]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-[#002C3E]">
                    {chapter.title}
                  </h2>
                  <p className="truncate text-xs text-[#637981]">
                    {chapter.lessons.length} lessons · {chapter.summary}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[#527983]">
                  <button
                    type="button"
                    aria-label={`Edit ${chapter.title}`}
                    className="rounded-lg p-2 hover:bg-[#eaf4f3]"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${chapter.title}`}
                    className="rounded-lg p-2 hover:bg-[#fff1f0] hover:text-[#F7444E]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} ${chapter.title}`}
                    onClick={() =>
                      setExpanded((current) =>
                        isExpanded
                          ? current.filter((id) => id !== chapter.id)
                          : [...current, chapter.id],
                      )
                    }
                    className="rounded-lg p-2 hover:bg-[#eaf4f3]"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="bg-[#fbfcf8]">
                  {chapter.lessons.map((lesson) => (
                    <div
                      key={lesson.code + lesson.title}
                      className="flex min-h-[46px] items-center gap-3 border-b border-[#e5ebe5] px-5 pl-14 text-sm"
                    >
                      <span className="w-10 shrink-0 font-mono text-xs text-[#71878c]">
                        {lesson.code}
                      </span>
                      <FileText className="h-4 w-4 shrink-0 text-[#71878c]" />
                      <span className="min-w-0 flex-1 truncate text-[#002C3E]">
                        {lesson.title}
                      </span>
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
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addLesson(chapter.id)}
                    className="flex items-center gap-2 px-9 py-3 text-sm text-[#526f78] hover:text-[#F7444E]"
                  >
                    <Plus className="h-4 w-4" />
                    Add lesson
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </section>
      <button
        type="button"
        onClick={addChapter}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#dfe6df] bg-white py-3 text-sm font-medium text-[#002C3E] hover:border-[#78BCC4] hover:bg-[#f8fbf9]"
      >
        <Plus className="h-4 w-4" />
        Add chapter
      </button>
    </div>
  );
}
