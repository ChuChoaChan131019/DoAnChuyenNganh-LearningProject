"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Pencil,
  Plus,
  Rocket,
} from "lucide-react";
import type {
  ContentStatus,
  Course,
  CourseLevel,
} from "@/types/learning-content";

const category = {
  name: "C# Fundamentals",
  slug: "csharp-fundamentals",
  description: "Syntax, variables, control flow and the .NET runtime basics.",
  created: "2026-01-12",
};

const categoryCourses: Course[] = [
  {
    id: 1,
    title: "C# Fundamentals",
    slug: "csharp-fundamentals",
    category: category.name,
    description:
      "Start from zero: install the .NET SDK, write your first program, and master variables, data types, operators and control flow.",
    level: "Beginner" as CourseLevel,
    status: "Published" as ContentStatus,
    chapters: 6,
    lessons: 24,
    updated: "2026-08-02",
    gradient: "from-[#f8cccc] to-[#e3eeee]",
  },
];

const stats = [
  {
    label: "Courses",
    value: "6",
    icon: BookOpen,
    color: "bg-[#ffe0df] text-[#F7444E]",
  },
  {
    label: "Published",
    value: "4",
    icon: Rocket,
    color: "bg-[#d8f3e5] text-[#2fa66a]",
  },
  {
    label: "Drafts",
    value: "2",
    icon: FileText,
    color: "bg-[#ffe9c6] text-[#bd7a21]",
  },
];

function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {status}
    </span>
  );
}

export default function CategoryDetailPage() {
  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-12">
      <div className="flex items-center gap-2 text-xs text-[#637981]">
        <Link
          href="/content-manager/learning-content/categories"
          className="inline-flex items-center gap-2 hover:text-[#002C3E]"
        >
          <ArrowLeft className="h-4 w-4" />
          Categories
        </Link>
        <span>/</span>
        <span className="font-mono">/{category.slug}</span>
      </div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">
            {category.name}
          </h1>
          <p className="mt-1 text-sm text-[#637981]">{category.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 text-sm font-medium text-[#002C3E] shadow-sm hover:bg-[#f8fbf9]"
          >
            <Pencil className="h-4 w-4" />
            Edit category
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F7444E] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#df3540]"
          >
            <Plus className="h-4 w-4" />
            Add course
          </button>
        </div>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-[0_8px_18px_rgba(0,44,62,0.04)]"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm text-[#526f78]">{stat.label}</p>
                <span
                  className={`grid h-10 w-10 place-items-center rounded-full ${stat.color}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-[#002C3E]">
                {stat.value}
              </p>
            </div>
          );
        })}
      </section>
      <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
        <div className="border-b border-[#dfe6df] px-5 py-4">
          <h2 className="font-semibold text-[#002C3E]">
            Courses in this category
          </h2>
          <p className="text-xs text-[#637981]">
            1 course · created {category.created}
          </p>
        </div>
        <div className="p-5">
          {categoryCourses.map((course) => (
            <article
              key={course.id}
              className="max-w-[605px] rounded-2xl border border-[#dfe6df] p-4"
            >
              <div
                className={`h-[86px] rounded-xl bg-gradient-to-br ${course.gradient}`}
              />
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#002C3E]">{course.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#637981]">
                    {course.description}
                  </p>
                </div>
                <StatusBadge status={course.status} />
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-[#637981]">
                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-600">
                  {course.level}
                </span>
                <span>{course.chapters} chapters</span>
                <span>·</span>
                <span>{course.lessons} lessons</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
