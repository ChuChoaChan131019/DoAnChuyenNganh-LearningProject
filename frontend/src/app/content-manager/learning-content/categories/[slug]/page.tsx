"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, FileText, Pencil, Plus, Rocket, X } from "lucide-react";
import { ApiClientError, categoryApi } from "@/lib/api";
import type {
  Category,
  CategoryCourse,
  ContentStatus,
} from "@/types/learning-content";

interface CategoryDetail {
  category: Category;
  courses: CategoryCourse[];
}

const statusStyles: Record<ContentStatus, string> = {
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
  Draft: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
  Approved: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-950/40 dark:text-cyan-300",
  "In review": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
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

export default function CategoryDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<CategoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;

    categoryApi
      .detail(slug)
      .then((loadedDetail) => {
        if (isMounted) setDetail(loadedDetail);
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(
            requestError instanceof ApiClientError
              ? requestError.message
              : "Unable to load category.",
          );
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const openEditModal = () => {
    if (!detail) return;
    setEditName(detail.category.name);
    setEditSlug(detail.category.slug);
    setEditDescription(detail.category.description);
    setEditError("");
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    if (isSaving) return;
    setIsEditOpen(false);
    setEditError("");
  };

  const handleEditNameChange = (value: string) => {
    setEditName(value);
    setEditSlug(
      value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    );
    setEditError("");
  };

  const handleEditCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!detail) return;

    const name = editName.trim();
    const nextSlug = editSlug.trim();
    if (name.length < 3) {
      setEditError("Name must be at least 3 characters.");
      return;
    }
    if (!nextSlug) {
      setEditError("A valid slug is required.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedCategory = await categoryApi.update(String(detail.category.id), {
        name,
        slug: nextSlug,
        description: editDescription.trim(),
      });
      setDetail((currentDetail) =>
        currentDetail ? { ...currentDetail, category: updatedCategory } : currentDetail,
      );
      setIsEditOpen(false);
      router.replace(`/content-manager/learning-content/categories/${updatedCategory.slug}`);
    } catch (requestError) {
      setEditError(
        requestError instanceof ApiClientError
          ? requestError.message
          : "Unable to update category. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <p className="mx-auto max-w-[1240px] py-16 text-center text-sm text-muted-foreground">
        Loading category...
      </p>
    );
  }

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-[1240px] py-16 text-center">
        <p className="text-sm text-rose-500">{error || "Category not found."}</p>
        <Link
          href="/content-manager/learning-content/categories"
          className="mt-4 inline-flex text-sm font-semibold text-foreground hover:text-primary"
        >
          Back to categories
        </Link>
      </div>
    );
  }

  const { category, courses } = detail;
  const publishedCourses = courses.filter((course) => course.status === "Published").length;
  const draftCourses = courses.filter((course) => course.status === "Draft").length;
  const stats = [
    { label: "Courses", value: courses.length, icon: BookOpen, color: "bg-primary/10 text-primary" },
    { label: "Published", value: publishedCourses, icon: Rocket, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
    { label: "Drafts", value: draftCourses, icon: FileText, color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  ];

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-12">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/content-manager/learning-content/categories" className="inline-flex items-center gap-2 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Categories
        </Link>
        <span>/</span>
        <span className="font-mono">/{category.slug}</span>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{category.name}</h1>
            <StatusBadge status={category.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openEditModal} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground shadow-xs hover:bg-muted">
            <Pencil className="h-4 w-4" />
            Edit category
          </button>
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition hover:opacity-90">
            <Plus className="h-4 w-4" />
            Add course
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <span className={`grid h-10 w-10 place-items-center rounded-full ${stat.color}`}><Icon className="h-5 w-5" /></span>
              </div>
              <p className="mt-4 text-3xl font-bold text-foreground">{stat.value}</p>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">Courses in this category</h2>
          <p className="text-xs text-muted-foreground">
            {courses.length} {courses.length === 1 ? "course" : "courses"} · created {category.created}
          </p>
        </div>
        <div className="p-5">
          {courses.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">No courses in this category yet.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {courses.map((course) => (
                <article key={course.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className={`h-[86px] rounded-xl bg-gradient-to-br ${course.gradient}`} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-foreground">{course.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{course.description}</p>
                    </div>
                    <StatusBadge status={course.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">{course.level}</span>
                    <span>{course.chapters} chapters</span>
                    <span>·</span>
                    <span>{course.lessons} lessons</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      {isEditOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs px-4 py-8"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditModal();
          }}
        >
          <form
            onSubmit={handleEditCategory}
            className="max-h-full w-full max-w-[640px] overflow-y-auto rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl sm:p-8"
            aria-labelledby="edit-category-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-category-title" className="text-2xl font-semibold text-foreground">
                  Edit category
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Update the category information shown in the catalogue.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSaving}
                aria-label="Close edit category form"
                className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block text-sm font-medium text-foreground">
                Name
                <input
                  value={editName}
                  onChange={(event) => handleEditNameChange(event.target.value)}
                  autoFocus
                  className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Slug
                <input
                  value={editSlug}
                  readOnly
                  className="mt-2 h-12 w-full rounded-xl border border-border bg-muted/30 px-4 font-mono text-sm text-muted-foreground outline-none"
                />
                <span className="mt-1.5 block text-xs text-muted-foreground">Generated automatically from the name.</span>
              </label>
              <label className="block text-sm font-medium text-foreground">
                Description
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
              </label>
            </div>

            {editError && <p className="mt-3 text-sm text-rose-500" role="alert">{editError}</p>}
            <div className="mt-7 flex justify-end gap-3">
              <button type="button" onClick={closeEditModal} disabled={isSaving} className="h-11 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-xs transition hover:bg-muted disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-xs transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
