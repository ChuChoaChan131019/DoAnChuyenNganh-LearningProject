"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FolderTree, MoreHorizontal, Plus, Search } from "lucide-react";
import type { Category, ContentStatus } from "@/types/learning-content";

const categories: Category[] = [
  {
    id: 1,
    name: "C# Fundamentals",
    slug: "csharp-fundamentals",
    description: "Syntax, variables, control flow and the .NET runtime basics.",
    courses: 6,
    created: "2026-01-12",
    status: "Published",
  },
  {
    id: 2,
    name: "Object-Oriented Programming",
    slug: "oop",
    description:
      "Classes, encapsulation, inheritance, polymorphism and interfaces.",
    courses: 5,
    created: "2026-01-20",
    status: "Published",
  },
  {
    id: 3,
    name: "Collections & LINQ",
    slug: "collections-linq",
    description: "Lists, dictionaries, generics and query expressions in C#.",
    courses: 3,
    created: "2026-02-03",
    status: "Published",
  },
  {
    id: 4,
    name: "Error Handling & Debugging",
    slug: "error-handling",
    description:
      "Exceptions, try/catch/finally, custom exceptions and diagnostics.",
    courses: 2,
    created: "2026-02-19",
    status: "Draft",
  },
  {
    id: 5,
    name: "Advanced C#",
    slug: "advanced-csharp",
    description: "Delegates, events, async/await and memory management.",
    courses: 4,
    created: "2026-03-04",
    status: "Approved",
  },
];

const statusStyles: Record<ContentStatus, string> = {
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Draft: "border-slate-200 bg-slate-100 text-slate-600",
  Approved: "border-cyan-200 bg-cyan-50 text-cyan-700",
  "In review": "border-amber-200 bg-amber-50 text-amber-700",
};

export default function CategoriesPage() {
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const filteredCategories = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? categories.filter((category) =>
          [category.name, category.slug, category.description].some((value) =>
            value.toLowerCase().includes(term),
          ),
        )
      : categories;
  }, [query]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">
            Categories
          </h1>
          <p className="mt-1 text-sm text-[#637981]">
            Top-level grouping for every C# course in the catalogue.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F7444E] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#df3540]"
        >
          <Plus className="h-4 w-4" />
          New category
        </button>
      </header>
      <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_24px_rgba(0,44,62,0.06)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#dfe6df] px-4 py-4 sm:px-5">
          <label className="relative block w-full max-w-[342px]">
            <span className="sr-only">Search categories</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71878c]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search categories..."
              className="h-10 w-full rounded-xl border border-[#dfe6df] bg-[#fffefb] pl-10 pr-3 text-sm text-[#002C3E] shadow-sm outline-none transition focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20"
            />
          </label>
          <span className="shrink-0 text-xs text-[#637981]">
            {filteredCategories.length}{" "}
            {filteredCategories.length === 1 ? "category" : "categories"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#dfe6df] text-sm text-[#526f78]">
                <th className="px-4 py-3 font-medium sm:px-5">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 text-center font-medium">Courses</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category) => (
                <tr
                  key={category.id}
                  className="group border-b border-[#dfe6df] last:border-b-0 hover:bg-[#f8fbf9]"
                >
                  <td className="px-4 py-2 sm:px-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffe0df] text-[#F7444E]">
                        <FolderTree className="h-4 w-4" />
                      </span>
                      <Link
                        href={`/content-manager/learning-content/categories/${category.slug}`}
                        className="font-semibold text-[#002C3E] hover:text-[#F7444E]"
                      >
                        {category.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-[#637981]">
                    {category.slug}
                  </td>
                  <td className="max-w-[390px] truncate px-4 py-2 text-sm text-[#637981]">
                    {category.description}
                  </td>
                  <td className="px-4 py-2 text-center text-sm font-semibold text-[#002C3E]">
                    {category.courses}
                  </td>
                  <td className="px-4 py-2 text-sm text-[#637981]">
                    {category.created}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[category.status]}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                      {category.status}
                    </span>
                  </td>
                  <td className="relative px-3 py-2 text-right">
                    <button
                      type="button"
                      aria-label={`Actions for ${category.name}`}
                      onClick={() =>
                        setOpenMenu(
                          openMenu === category.id ? null : category.id,
                        )
                      }
                      className="rounded-lg p-2 text-[#002C3E] transition hover:bg-[#eaf4f3]"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {openMenu === category.id && (
                      <div className="absolute right-3 top-11 z-10 w-28 rounded-lg border border-[#dfe6df] bg-white p-1 text-left text-xs shadow-lg">
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1.5 text-left text-[#002C3E] hover:bg-[#eaf4f3]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1.5 text-left text-[#F7444E] hover:bg-[#fff1f0]"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCategories.length === 0 && (
          <p className="px-5 py-12 text-center text-sm text-[#637981]">
            No categories found.
          </p>
        )}
      </section>
    </div>
  );
}
