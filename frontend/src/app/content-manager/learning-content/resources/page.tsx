"use client";

import { useMemo, useState } from "react";
import {
  FileCode2,
  FileText,
  Film,
  Newspaper,
  Plus,
  Search,
  Presentation,
} from "lucide-react";
import type {
  ContentStatus,
  LearningResource,
  ResourceType,
} from "@/types/learning-content";

const resources: LearningResource[] = [
  {
    id: 1,
    title: "C# Language Cheat Sheet",
    course: "C# Fundamentals",
    lesson: "Variables",
    type: "PDF",
    size: "1.2 MB",
    updated: "2026-05-04",
    status: "Published",
  },
  {
    id: 2,
    title: "Installing the .NET SDK (walkthrough)",
    course: "C# Fundamentals",
    lesson: "Installing .NET",
    type: "Video",
    size: "84 MB",
    updated: "2026-05-08",
    status: "Published",
  },
  {
    id: 3,
    title: "SOLID principles explained with C#",
    course: "OOP in C#",
    lesson: "Interfaces",
    type: "Article",
    size: "—",
    updated: "2026-06-02",
    status: "Approved",
  },
  {
    id: 4,
    title: "Bank account encapsulation demo",
    course: "OOP in C#",
    lesson: "Encapsulation in Practice",
    type: "Code Sample",
    size: "26 KB",
    updated: "2026-06-14",
    status: "Draft",
  },
  {
    id: 5,
    title: "LINQ query operators reference",
    course: "Collections and LINQ",
    lesson: "Select and Where",
    type: "Slide Deck",
    size: "4.8 MB",
    updated: "2026-07-01",
    status: "Published",
  },
  {
    id: 6,
    title: "Exception handling anti-patterns",
    course: "Exception Handling in C#",
    lesson: "The finally Block",
    type: "Article",
    size: "—",
    updated: "2026-07-21",
    status: "In review",
  },
];

const statusStyles: Record<ContentStatus, string> = {
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  Approved: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-300",
  "In review": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  Draft: "border-border bg-muted text-muted-foreground",
};

const typeIcons: Record<ResourceType, typeof FileText> = {
  PDF: FileText,
  Video: Film,
  Article: Newspaper,
  "Code Sample": FileCode2,
  "Slide Deck": Presentation,
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

export default function ResourcesPage() {
  const [query, setQuery] = useState("");
  const filteredResources = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? resources.filter((resource) =>
          [
            resource.title,
            resource.course,
            resource.lesson,
            resource.type,
          ].some((value) => value.toLowerCase().includes(term)),
        )
      : resources;
  }, [query]);

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Learning resources
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Supplementary material attached to C# lessons.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-xs hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          Add resource
        </button>
      </header>
      <label className="relative block max-w-[390px]">
        <span className="sr-only">Search resources</span>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search resources..."
          className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground shadow-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredResources.map((resource) => {
          const Icon = typeIcons[resource.type];
          return (
            <article
              key={resource.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary dark:bg-primary/20">
                  <Icon className="h-5 w-5" />
                </span>
                <StatusBadge status={resource.status} />
              </div>
              <h2 className="mt-4 text-[17px] font-semibold leading-tight text-foreground">
                {resource.title}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {resource.course} · {resource.lesson}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
                <span>
                  {resource.type} · {resource.size}
                </span>
                <time>{resource.updated}</time>
              </div>
            </article>
          );
        })}
      </div>
      {filteredResources.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center text-sm text-muted-foreground">
          No resources found.
        </p>
      )}
    </div>
  );
}
