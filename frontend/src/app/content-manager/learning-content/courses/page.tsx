"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  Grid2X2,
  List,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type {
  ContentStatus,
  Course,
  CourseLevel,
} from "@/types/learning-content";

const courses: Course[] = [
  {
    id: 1,
    title: "Advanced C#: Delegates, Events & Async",
    slug: "advanced-csharp",
    category: "Advanced C#",
    description:
      "Delegates, lambda expressions, events, Task-based asynchronous programming and performance tips.",
    level: "Advanced",
    status: "In review",
    chapters: 7,
    lessons: 26,
    updated: "2026-08-10",
    gradient: "from-[#d9eef0] to-[#fbe8e4]",
  },
  {
    id: 2,
    title: "Object-Oriented Programming in C#",
    slug: "oop-in-csharp",
    category: "Object-Oriented Programming",
    description:
      "Model real problems with classes and objects. Encapsulation, inheritance, polymorphism, abstraction and interfaces.",
    level: "Intermediate",
    status: "Published",
    chapters: 8,
    lessons: 31,
    updated: "2026-08-09",
    gradient: "from-[#d6eff0] to-[#e5f2ef]",
  },
  {
    id: 3,
    title: "C# & OOP Interview Preparation",
    slug: "csharp-interview-prep",
    category: "Object-Oriented Programming",
    description:
      "Curated question sets and practice tests covering the most asked C# and OOP interview topics.",
    level: "Advanced",
    status: "Published",
    chapters: 5,
    lessons: 15,
    updated: "2026-08-08",
    gradient: "from-[#d8eee9] to-[#e5f2ed]",
  },
  {
    id: 4,
    title: "Exception Handling in C#",
    slug: "exception-handling",
    category: "Error Handling & Debugging",
    description:
      "Write resilient code with try/catch/finally, exception filters and custom exception types.",
    level: "Intermediate",
    status: "Draft",
    chapters: 4,
    lessons: 12,
    updated: "2026-08-05",
    gradient: "from-[#fbe4d4] to-[#f7eee0]",
  },
  {
    id: 5,
    title: "C# Fundamentals",
    slug: "csharp-fundamentals",
    category: "C# Fundamentals",
    description:
      "Start from zero and master syntax, variables, data types, operators and control flow.",
    level: "Beginner",
    status: "Published",
    chapters: 6,
    lessons: 24,
    updated: "2026-08-02",
    gradient: "from-[#f6dfe0] to-[#e7f1ed]",
  },
  {
    id: 6,
    title: "Collections and LINQ",
    slug: "collections-and-linq",
    category: "Collections & LINQ",
    description:
      "Work with arrays, lists, dictionaries, generics and query data elegantly using LINQ.",
    level: "Intermediate",
    status: "Approved",
    chapters: 5,
    lessons: 18,
    updated: "2026-07-27",
    gradient: "from-[#e2e9e7] to-[#f5e4df]",
  },
];

const statusStyles: Record<ContentStatus, string> = {
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Draft: "border-slate-200 bg-slate-100 text-slate-600",
  Approved: "border-cyan-200 bg-cyan-50 text-cyan-700",
  "In review": "border-amber-200 bg-amber-50 text-amber-700",
};
const levelStyles: Record<CourseLevel, string> = {
  Beginner: "bg-rose-50 text-rose-600",
  Intermediate: "bg-cyan-50 text-cyan-700",
  Advanced: "bg-sky-50 text-sky-700",
};

function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {status}
    </span>
  );
}

function CourseActions({
  course,
  openMenu,
  onToggle,
}: {
  course: Course;
  openMenu: number | null;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Actions for ${course.title}`}
        onClick={onToggle}
        className="rounded-lg p-1.5 text-[#526f78] hover:bg-[#eaf4f3]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {openMenu === course.id && (
        <div className="absolute right-0 top-8 z-10 w-28 rounded-lg border border-[#dfe6df] bg-white p-1 text-xs shadow-lg">
          <button
            type="button"
            className="w-full rounded px-2 py-1.5 text-left hover:bg-[#eaf4f3]"
          >
            Edit
          </button>
          <button
            type="button"
            className="w-full rounded px-2 py-1.5 text-left text-[#F7444E] hover:bg-[#fff1f0]"
          >
            Archive
          </button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative flex h-10 min-w-[150px] items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-full appearance-none rounded-xl border border-[#dfe6df] bg-white px-3 pr-9 text-sm text-[#526f78] outline-none focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[#71878c]" />
    </label>
  );
}

function CourseGrid({
  items,
  openMenu,
  setOpenMenu,
}: {
  items: Course[];
  openMenu: number | null;
  setOpenMenu: (id: number | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
      {items.map((course) => (
        <article
          key={course.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)] transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <Link
            href={`/content-manager/learning-content/courses/${course.slug}`}
            className={`relative h-[132px] bg-gradient-to-br ${course.gradient} p-4`}
          >
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${levelStyles[course.level]}`}
            >
              {course.level}
            </span>
            <span className="absolute bottom-3 left-4 font-mono text-xs text-[#527983]">
              /{course.slug}
            </span>
            <BookOpen className="absolute bottom-3 right-4 h-7 w-7 text-[#527983]/25" />
            <span className="absolute right-4 top-4">
              <StatusBadge status={course.status} />
            </span>
          </Link>
          <div className="flex flex-1 flex-col p-[18px]">
            <div className="mb-1 flex items-start justify-between gap-2">
              <span className="text-xs text-[#71878c]">{course.category}</span>
              <CourseActions
                course={course}
                openMenu={openMenu}
                onToggle={() =>
                  setOpenMenu(openMenu === course.id ? null : course.id)
                }
              />
            </div>
            <Link
              href={`/content-manager/learning-content/courses/${course.slug}`}
              className="text-[17px] font-bold leading-tight text-[#002C3E] hover:text-[#F7444E]"
            >
              {course.title}
            </Link>
            <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#637981]">
              {course.description}
            </p>
            <div className="mt-auto flex items-center justify-between border-t border-[#dfe6df] pt-4 text-xs text-[#637981]">
              <span>
                {course.chapters} chapters · {course.lessons} lessons
              </span>
              <span>Updated {course.updated}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function CourseList({
  items,
  openMenu,
  setOpenMenu,
}: {
  items: Course[];
  openMenu: number | null;
  setOpenMenu: (id: number | null) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
      <table className="w-full min-w-[1120px] table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[21%]" />
          <col className="w-[10%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[9%]" />
          <col className="w-[12%]" />
          <col className="w-10" />
        </colgroup>
        <thead>
          <tr className="border-b border-[#dfe6df] text-sm text-[#526f78]">
            <th className="px-3 py-3 font-medium">Course</th>
            <th className="px-3 py-3 font-medium">Category</th>
            <th className="px-3 py-3 font-medium">Level</th>
            <th className="px-3 py-3 text-center font-medium">Chapters</th>
            <th className="px-3 py-3 text-center font-medium">Lessons</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Updated</th>
            <th className="px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((course) => (
            <tr
              key={course.id}
              className="h-[61px] border-b border-[#dfe6df] last:border-0 hover:bg-[#f8fbf9]"
            >
              <td className="px-3 py-2">
                <Link
                  href={`/content-manager/learning-content/courses/${course.slug}`}
                  className="flex items-center gap-3"
                >
                  <span
                    className={`h-11 w-[60px] shrink-0 rounded-xl bg-gradient-to-br ${course.gradient}`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-[#002C3E] hover:text-[#F7444E]">
                      {course.title}
                    </span>
                    <span className="block font-mono text-xs text-[#637981]">
                      /{course.slug}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="truncate px-3 py-2 text-sm text-[#637981]">
                {course.category}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${levelStyles[course.level]}`}
                >
                  {course.level}
                </span>
              </td>
              <td className="px-3 py-2 text-center text-sm text-[#002C3E]">
                {course.chapters}
              </td>
              <td className="px-3 py-2 text-center text-sm text-[#002C3E]">
                {course.lessons}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={course.status} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-sm text-[#637981]">
                {course.updated}
              </td>
              <td className="relative px-2 py-2 text-right">
                <CourseActions
                  course={course}
                  openMenu={openMenu}
                  onToggle={() =>
                    setOpenMenu(openMenu === course.id ? null : course.id)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CoursesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [level, setLevel] = useState("All levels");
  const [status, setStatus] = useState("All statuses");
  const [sort, setSort] = useState("Last updated");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        const term = query.trim().toLowerCase();
        return (
          (!term ||
            [
              course.title,
              course.slug,
              course.description,
              course.category,
            ].some((value) => value.toLowerCase().includes(term))) &&
          (category === "All categories" || course.category === category) &&
          (level === "All levels" || course.level === level) &&
          (status === "All statuses" || course.status === status)
        );
      }),
    [category, level, query, status],
  );

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">
            Courses
          </h1>
          <p className="mt-1 text-sm text-[#637981]">
            Every C# learning path, from first program to advanced async
            patterns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-10 rounded-xl border border-[#dfe6df] bg-white p-1">
            <button
              type="button"
              aria-label="Grid view"
              onClick={() => setView("grid")}
              className={`rounded-lg px-2 ${view === "grid" ? "bg-[#eaf4f3] text-[#176678]" : "text-[#71878c]"}`}
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="List view"
              onClick={() => setView("list")}
              className={`rounded-lg px-2 ${view === "list" ? "border border-[#002C3E] bg-[#eaf4f3] text-[#176678]" : "text-[#71878c]"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F7444E] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#df3540]"
          >
            <Plus className="h-4 w-4" />
            Create course
          </button>
        </div>
      </header>
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
        <label className="relative min-w-[230px] flex-1">
          <span className="sr-only">Search courses</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71878c]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search courses..."
            className="h-10 w-full rounded-xl border border-[#dfe6df] pl-10 pr-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20"
          />
        </label>
        <SlidersHorizontal
          className="mx-1 h-4 w-4 shrink-0 text-[#71878c]"
          aria-hidden="true"
        />
        <FilterSelect
          label="Category"
          value={category}
          options={[
            "All categories",
            ...Array.from(new Set(courses.map((course) => course.category))),
          ]}
          onChange={setCategory}
        />
        <FilterSelect
          label="Level"
          value={level}
          options={["All levels", "Beginner", "Intermediate", "Advanced"]}
          onChange={setLevel}
        />
        <FilterSelect
          label="Status"
          value={status}
          options={[
            "All statuses",
            "Published",
            "Approved",
            "In review",
            "Draft",
          ]}
          onChange={setStatus}
        />
        <FilterSelect
          label="Sort courses"
          value={sort}
          options={["Last updated", "Title A-Z", "Most lessons"]}
          onChange={setSort}
        />
      </section>
      {view === "grid" ? (
        <CourseGrid
          items={filteredCourses}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
        />
      ) : (
        <CourseList
          items={filteredCourses}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
        />
      )}
      {filteredCourses.length === 0 && (
        <p className="rounded-2xl border border-dashed border-[#dfe6df] px-5 py-14 text-center text-sm text-[#637981]">
          No courses match these filters.
        </p>
      )}
    </div>
  );
}
