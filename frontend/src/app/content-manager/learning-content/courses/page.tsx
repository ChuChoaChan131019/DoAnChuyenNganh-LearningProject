"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  X,
} from "lucide-react";
import type {
  Category,
  ContentStatus,
  Course,
  CourseLevel,
} from "@/types/learning-content";
import { ApiClientError, categoryApi, courseApi } from "@/lib/api";

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

const courseGradients = [
  "from-[#d9eef0] to-[#fbe8e4]",
  "from-[#d6eff0] to-[#e5f2ef]",
  "from-[#d8eee9] to-[#e5f2ed]",
  "from-[#fbe4d4] to-[#f7eee0]",
  "from-[#f6dfe0] to-[#e7f1ed]",
  "from-[#e2e9e7] to-[#f5e4df]",
];

const courseGradientBySlug: Record<string, string> = {
  "advanced-csharp": "from-[#d9eef0] to-[#fbe8e4]",
  "advanced-c-delegates-events-async": "from-[#d9eef0] to-[#fbe8e4]",
  "oop-in-csharp": "from-[#d6eff0] to-[#e5f2ef]",
  "csharp-interview-prep": "from-[#d8eee9] to-[#e5f2ed]",
  "exception-handling": "from-[#fbe4d4] to-[#f7eee0]",
  "csharp-fundamentals": "from-[#f6dfe0] to-[#e7f1ed]",
  "collections-and-linq": "from-[#e2e9e7] to-[#f5e4df]",
};

function getCourseGradient(course: Course) {
  if (courseGradientBySlug[course.slug]) return courseGradientBySlug[course.slug];
  const hash = String(course.id)
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  return courseGradients[hash % courseGradients.length];
}

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
  onEdit,
  onDelete,
}: {
  course: Course;
  openMenu: string | number | null;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenu !== course.id) {
      const rect = event.currentTarget.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 112),
      });
    }
    onToggle();
  };

  return (
    <div>
      <button
        type="button"
        aria-label={`Actions for ${course.title}`}
        data-course-menu-trigger
        onClick={handleToggle}
        className="rounded-lg p-1.5 text-[#526f78] hover:bg-[#eaf4f3]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {openMenu === course.id && typeof document !== "undefined" &&
        createPortal(
          <div
            data-course-menu
            className="fixed z-[100] w-28 rounded-lg border border-[#dfe6df] bg-white p-1 text-xs shadow-lg"
            style={menuPosition}
          >
            <button type="button" onClick={onEdit} className="w-full rounded px-2 py-1.5 text-left hover:bg-[#eaf4f3]">
              Edit
            </button>
            <button type="button" onClick={onDelete} className="w-full rounded px-2 py-1.5 text-left text-[#F7444E] hover:bg-[#fff1f0]">
              Delete
            </button>
          </div>,
          document.body,
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
  onEdit,
  onDelete,
}: {
  items: Course[];
  openMenu: string | number | null;
  setOpenMenu: (id: string | number | null) => void;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
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
            className={`relative h-[132px] bg-gradient-to-br ${getCourseGradient(course)} p-4`}
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
                onEdit={() => onEdit(course)}
                onDelete={() => onDelete(course)}
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
  onEdit,
  onDelete,
}: {
  items: Course[];
  openMenu: string | number | null;
  setOpenMenu: (id: string | number | null) => void;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
}) {
  return (
    <div className="h-[390px] overflow-auto rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
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
        <thead className="sticky top-0 z-10 bg-white">
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
                    className={`h-11 w-[60px] shrink-0 rounded-xl bg-gradient-to-br ${getCourseGradient(course)}`}
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
                  onEdit={() => onEdit(course)}
                  onDelete={() => onDelete(course)}
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [level, setLevel] = useState("All levels");
  const [status, setStatus] = useState("All statuses");
  const [sort, setSort] = useState("Last updated");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [openMenu, setOpenMenu] = useState<string | number | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLevel, setEditLevel] = useState<CourseLevel>("Beginner");
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    courseApi
      .list()
      .then((loadedCourses) => {
        if (isMounted) setCourses(loadedCourses);
      })
      .catch(() => {
        if (isMounted) setLoadError("Unable to load courses. Please try again.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    categoryApi
      .list()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (openMenu === null) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        (target.closest("[data-course-menu]") ||
          target.closest("[data-course-menu-trigger]"))
      ) {
        return;
      }
      setOpenMenu(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openMenu]);

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
    [category, courses, level, query, status],
  );

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setEditName(course.title);
    setEditSlug(course.slug);
    setEditDescription(course.description);
    setEditLevel(course.level);
    setEditError("");
    setOpenMenu(null);
  };

  const handleDeleteCourse = async (course: Course) => {
    if (!window.confirm(`Delete course "${course.title}"?`)) return;
    setOpenMenu(null);
    try {
      await courseApi.remove(String(course.id));
      setCourses((currentCourses) => currentCourses.filter((item) => item.id !== course.id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete course.");
    }
  };

  const handleUpdateCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCourse) return;
    if (editName.trim().length < 3 || !editSlug.trim()) {
      setEditError("Course title must be at least 3 characters and slug is required.");
      return;
    }
    setIsSaving(true);
    try {
      const updatedCourse = await courseApi.update(String(editingCourse.id), {
        title: editName.trim(),
        slug: editSlug.trim(),
        description: editDescription.trim(),
        level: editLevel,
        category_id: editingCourse.categoryId,
      });
      setCourses((currentCourses) => currentCourses.map((course) => course.id === editingCourse.id ? { ...course, ...updatedCourse, level: editLevel, status: course.status, category: course.category } : course));
      setEditingCourse(null);
    } catch (error) {
      setEditError(error instanceof ApiClientError ? error.message : "Unable to update course.");
    } finally {
      setIsSaving(false);
    }
  };

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
          <Link
            href="/content-manager/learning-content/courses/new"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F7444E] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#df3540]"
          >
            <Plus className="h-4 w-4" />
            Create course
          </Link>
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
            ...categories.map((category) => category.name),
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
      {loadError ? (
        <p className="rounded-2xl border border-[#F7444E]/30 bg-[#fff1f0] px-5 py-14 text-center text-sm text-[#F7444E]">
          {loadError}
        </p>
      ) : isLoading ? (
        <p className="rounded-2xl border border-[#dfe6df] bg-white px-5 py-14 text-center text-sm text-[#637981]">
          Loading courses...
        </p>
      ) : view === "grid" ? (
        <CourseGrid
          items={filteredCourses}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onEdit={openEditCourse}
          onDelete={handleDeleteCourse}
        />
      ) : (
        <CourseList
          items={filteredCourses}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
          onEdit={openEditCourse}
          onDelete={handleDeleteCourse}
        />
      )}
      {filteredCourses.length === 0 && (
        <p className="rounded-2xl border border-dashed border-[#dfe6df] px-5 py-14 text-center text-sm text-[#637981]">
          No courses match these filters.
        </p>
      )}
      {editingCourse && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#00151d]/75 px-4 py-8" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setEditingCourse(null); }}>
          <form onSubmit={handleUpdateCourse} className="max-h-full w-full max-w-[640px] overflow-y-auto rounded-2xl border border-[#dfe6df] bg-[#fffefb] p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold text-[#002C3E]">Edit course</h2><p className="mt-1 text-sm text-[#637981]">Update the course information.</p></div><button type="button" onClick={() => setEditingCourse(null)} disabled={isSaving} aria-label="Close edit course"><X className="h-5 w-5 text-[#526f78]" /></button></div>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-[#002C3E]">Course title<input value={editName} onChange={(event) => { setEditName(event.target.value); setEditSlug(event.target.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")); }} className="mt-2 h-11 w-full rounded-xl border border-[#dfe6df] px-3 text-sm outline-none focus:border-[#78BCC4]" /></label>
              <label className="block text-sm font-medium text-[#002C3E]">Slug<input value={editSlug} onChange={(event) => setEditSlug(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-[#dfe6df] px-3 font-mono text-sm outline-none focus:border-[#78BCC4]" /></label>
              <label className="block text-sm font-medium text-[#002C3E]">Description<textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-[#dfe6df] px-3 py-2 text-sm outline-none focus:border-[#78BCC4]" /></label>
              <label className="block text-sm font-medium text-[#002C3E]">Level<select value={editLevel} onChange={(event) => setEditLevel(event.target.value as CourseLevel)} className="mt-2 h-11 w-full rounded-xl border border-[#dfe6df] px-3 text-sm outline-none">{["Beginner", "Intermediate", "Advanced"].map((level) => <option key={level}>{level}</option>)}</select></label>
            </div>
            {editError && <p className="mt-3 text-sm text-[#F7444E]" role="alert">{editError}</p>}
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setEditingCourse(null)} disabled={isSaving} className="h-11 rounded-xl border border-[#dfe6df] px-5 text-sm font-semibold text-[#002C3E]">Cancel</button><button type="submit" disabled={isSaving} className="h-11 rounded-xl bg-[#F7444E] px-5 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Save changes"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
