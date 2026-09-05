"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  BookOpen,
  CheckCircle2,
  CircleCheck,
  CircleDot,
  CircleX,
  FileText,
  History,
  Pencil,
  Plus,
  Rocket,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Course } from "@/types/learning-content";

type Tab =
  | "Overview"
  | "Chapters"
  | "Lessons"
  | "Resources"
  | "Questions"
  | "Tests"
  | "AI Tools"
  | "History";

const course: Course = {
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
};
const tabs: Tab[] = [
  "Overview",
  "Chapters",
  "Lessons",
  "Resources",
  "Questions",
  "Tests",
  "AI Tools",
  "History",
];
const chapters = [
  "Delegates and lambda expressions",
  "Events and event handlers",
  "Async / await fundamentals",
  "Tasks and cancellation",
  "Performance patterns",
];
const glanceStats: Array<{ value: number; label: string; icon: LucideIcon }> = [
  { value: course.chapters, label: "Chapters", icon: BookOpen },
  { value: course.lessons, label: "Lessons", icon: FileText },
  { value: 121, label: "Questions", icon: CheckCircle2 },
  { value: 0, label: "Tests", icon: History },
];

const historyEvents = [
  {
    title: "Published course",
    actor: "Lan Nguyen",
    date: "2026-08-09 14:22",
    icon: CircleCheck,
    color: "bg-[#2fa66a]",
  },
  {
    title: "Approved 4 lessons in “Encapsulation”",
    actor: "Minh Tran",
    date: "2026-08-08 09:10",
    icon: CircleDot,
    color: "bg-[#2b9eaa]",
  },
  {
    title: "Drafted lesson “Interfaces”",
    actor: "AI Generator",
    date: "2026-08-07 16:44",
    icon: Bot,
    color: "bg-[#78bcc4]",
  },
  {
    title: "Rejected “goto statements” — needs examples",
    actor: "Minh Tran",
    date: "2026-08-05 11:02",
    icon: CircleX,
    color: "bg-[#f7444e]",
  },
  {
    title: "Created course",
    actor: "Lan Nguyen",
    date: "2026-01-28 08:30",
    icon: CircleDot,
    color: "bg-[#cfe5e7]",
  },
];

function ProgressRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm text-[#16485a]">
        <span>{label}</span>
        <span className="text-[#637981]">{value}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f8d7d7]">
        <div className="h-full bg-[#F7444E]" style={{ width: `${value}%` }} />
      </div>
      <p className="mt-1 text-xs text-[#637981]">{detail}</p>
    </div>
  );
}

function EmptyTab({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
      <BookOpen className="h-12 w-12 rounded-full bg-[#ffe0df] p-3 text-[#F7444E]" />
      <h2 className="mt-4 font-semibold text-[#002C3E]">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-[#637981]">{description}</p>
      <button
        type="button"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white"
      >
        <Plus className="h-4 w-4" />
        {action}
      </button>
    </div>
  );
}

export default function CourseDetailPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-12">
      <Link
        href="/content-manager/learning-content/courses"
        className="inline-flex items-center gap-2 text-sm text-[#637981] hover:text-[#002C3E]"
      >
        <ArrowLeft className="h-4 w-4" />
        All courses
      </Link>
      <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_24px_rgba(0,44,62,0.06)]">
        <div className={`h-[148px] bg-gradient-to-br ${course.gradient}`} />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">
              {course.level}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              ● {course.status}
            </span>
            <span className="font-mono text-xs text-[#637981]">
              /{course.slug}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">
                {course.title}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#637981]">
                {course.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] px-4 py-2 text-sm font-medium text-[#002C3E]"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] px-4 py-2 text-sm font-medium text-[#002C3E]"
              >
                <Sparkles className="h-4 w-4" />
                AI tools
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white"
              >
                <Rocket className="h-4 w-4" />
                Publish
              </button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#dfe6df] pt-5 sm:grid-cols-5">
            {[
              ["Author", "Hoang Pham"],
              ["Created", "2026-03-18"],
              ["Last updated", course.updated],
              ["Chapters", String(course.chapters)],
              ["Questions", "121"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-[#637981]">{label}</p>
                <p className="text-sm font-semibold text-[#002C3E]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-[#eef0e8] p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm ${activeTab === tab ? "bg-white font-medium text-[#002C3E] shadow-sm" : "text-[#637981]"}`}
          >
            {tab}
          </button>
        ))}
      </nav>
      {activeTab === "Overview" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
            <div className="border-b border-[#dfe6df] px-5 py-4">
              <h2 className="font-semibold text-[#002C3E]">
                Content completeness
              </h2>
            </div>
            <div className="space-y-6 p-5">
              <ProgressRow
                label="Lessons written"
                value={82}
                detail="26 of 30 planned"
              />
              <ProgressRow
                label="Questions linked"
                value={64}
                detail="121 questions in bank"
              />
              <ProgressRow
                label="Reviewed & approved"
                value={47}
                detail="12 items pending review"
              />
              <ProgressRow
                label="Resources attached"
                value={35}
                detail="6 files, 2 videos"
              />
            </div>
          </section>
          <section className="rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
            <div className="border-b border-[#dfe6df] px-5 py-4">
              <h2 className="font-semibold text-[#002C3E]">At a glance</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 p-5">
              {glanceStats.map(({ value, label, icon: Icon }) => (
                <div key={label} className="rounded-2xl bg-[#f3f5f0] p-4">
                  <Icon className="h-4 w-4 text-[#F7444E]" />
                  <p className="mt-2 text-2xl font-bold text-[#002C3E]">
                    {value}
                  </p>
                  <p className="text-xs text-[#637981]">{label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
      {activeTab === "Chapters" && (
        <section className="rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#dfe6df] px-5 py-4">
            <h2 className="font-semibold text-[#002C3E]">Chapters</h2>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-3 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add chapter
            </button>
          </div>
          {chapters.map((chapter, index) => (
            <div
              key={chapter}
              className="flex items-center gap-3 border-b border-[#dfe6df] px-5 py-4 last:border-0"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ffe0df] font-mono text-xs text-[#F7444E]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-sm font-medium text-[#002C3E]">
                {chapter}
              </span>
              <span className="text-xs text-[#637981]">
                {index + 2} lessons
              </span>
            </div>
          ))}
        </section>
      )}
      {activeTab === "Lessons" && (
        <section className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-[#002C3E]">All lessons</h2>
          <p className="mt-1 text-sm text-[#637981]">
            Across every chapter of this course.
          </p>
        </section>
      )}
      {activeTab === "Resources" && (
        <EmptyTab
          title="No resources yet"
          description="Attach files, videos and articles to make this course richer."
          action="Add resource"
        />
      )}
      {activeTab === "Questions" && (
        <EmptyTab
          title="No linked questions"
          description="Link questions from the question bank to this course."
          action="Open bank"
        />
      )}
      {activeTab === "Tests" && (
        <EmptyTab
          title="No tests yet"
          description="Create an assessment for learners in this course."
          action="Create test"
        />
      )}
      {activeTab === "AI Tools" && (
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyTab
            title="Generate a lesson"
            description="Draft a full lesson with examples and exercises for any chapter."
            action="Generate"
          />
          <EmptyTab
            title="Generate questions"
            description="Create question sets with options and explanations, ready for review."
            action="Generate"
          />
        </div>
      )}
      {activeTab === "History" && (
        <section className="rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
          <div className="border-b border-[#dfe6df] px-5 py-4">
            <h2 className="font-semibold text-[#002C3E]">Review history</h2>
            <p className="mt-1 text-xs text-[#637981]">
              Full audit trail for this course
            </p>
          </div>
          <div className="relative px-5 py-5">
            <div className="absolute bottom-6 left-[31px] top-6 w-px bg-[#dfe6df]" />
            <div className="relative space-y-5">
              {historyEvents.map(
                ({ title, actor, date, icon: Icon, color }) => (
                  <div key={title} className="flex items-start gap-3">
                    <span
                      className={`z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full ${color} text-white ring-4 ring-white`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="pt-0.5">
                      <p className="text-sm font-medium text-[#16485a]">
                        {title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#637981]">
                        {actor} · {date}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
