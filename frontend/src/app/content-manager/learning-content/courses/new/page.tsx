"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ImagePlus,
  Save,
  Upload,
} from "lucide-react";
import { ApiClientError, categoryApi, courseApi } from "@/lib/api";
import type { Category, CourseLevel } from "@/types/learning-content";

const steps = ["Course details", "Chapters", "Lessons", "Resources", "Questions", "Review & publish"];
const levels: CourseLevel[] = ["Beginner", "Intermediate", "Advanced"];

export default function CreateCoursePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<CourseLevel>("Beginner");
  const [thumbnailName, setThumbnailName] = useState("");
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    categoryApi
      .list()
      .then((loadedCategories) => {
        setCategories(loadedCategories);
        if (loadedCategories.length > 0) setCategoryId(String(loadedCategories[0].id));
      })
      .catch(() => setError("Unable to load categories."))
      .finally(() => setIsLoadingCategories(false));
  }, []);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(
      value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    );
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedSlug = slug.trim();

    if (trimmedTitle.length < 3) {
      setError("Course title must be at least 3 characters.");
      return;
    }
    if (!trimmedSlug) {
      setError("A valid slug is required.");
      return;
    }
    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    setIsSaving(true);
    try {
      await courseApi.create({
        title: trimmedTitle,
        slug: trimmedSlug,
        description: description.trim(),
        level,
        category_id: categoryId,
      });
      router.push("/content-manager/learning-content/courses");
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.status === 401
            ? "Your session has expired. Please log out and sign in again before saving the course."
            : requestError.message
          : requestError instanceof Error
            ? requestError.message
            : "Unable to create course. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-12">
      <Link
        href="/content-manager/learning-content/courses"
        className="inline-flex items-center gap-2 text-sm text-[#637981] hover:text-[#002C3E]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to courses
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">Create a new course</h1>
          <p className="mt-1 text-sm text-[#637981]">Follow the workflow. Nothing is published until it has been reviewed.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            form="create-course-form"
            disabled={isSaving}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 text-sm font-semibold text-[#002C3E] shadow-sm hover:bg-[#f8fbf9] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Save draft
          </button>
          <button
            type="submit"
            form="create-course-form"
            disabled={isSaving}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#F7444E] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#df3540] disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Continue"}
          </button>
        </div>
      </header>

      <nav className="grid gap-2 rounded-2xl border border-[#dfe6df] bg-white p-3 shadow-[0_8px_18px_rgba(0,44,62,0.04)] md:grid-cols-6">
        {steps.map((step, index) => (
          <div
            key={step}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${index === 0 ? "bg-[#ffd9d6] text-[#F7444E]" : "text-[#526f78]"}`}
          >
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${index === 0 ? "bg-[#F7444E] text-white" : "bg-[#e2f0f1] text-[#527983]"}`}>
              {index === 0 ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className="truncate">{step}</span>
          </div>
        ))}
      </nav>

      {error && <p className="rounded-xl border border-[#F7444E]/30 bg-[#fff1f0] px-4 py-3 text-sm text-[#F7444E]" role="alert">{error}</p>}

      <form id="create-course-form" onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
          <div className="border-b border-[#dfe6df] px-5 py-4">
            <h2 className="font-semibold text-[#002C3E]">Course information</h2>
          </div>
          <div className="space-y-5 p-5">
            <label className="block text-sm font-medium text-[#002C3E]">
              Course title
              <input
                value={title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="e.g. Object-Oriented Programming in C#"
                autoFocus
                className="mt-2 h-11 w-full rounded-xl border border-[#dfe6df] px-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-[#002C3E]">
                Slug
                <input
                  value={slug}
                  readOnly
                  className="mt-2 h-11 w-full rounded-xl border border-[#dfe6df] bg-[#f5f7f3] px-3 font-mono text-sm text-[#637981] outline-none"
                />
              </label>
              <label className="relative block text-sm font-medium text-[#002C3E]">
                Category
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  disabled={isLoadingCategories || categories.length === 0}
                  className="mt-2 h-11 w-full appearance-none rounded-xl border border-[#dfe6df] bg-white px-3 pr-9 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20 disabled:bg-[#f5f7f3]"
                >
                  {isLoadingCategories ? <option>Loading categories...</option> : null}
                  {!isLoadingCategories && categories.length === 0 ? <option>No categories available</option> : null}
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-[#71878c]" />
              </label>
            </div>

            <label className="block text-sm font-medium text-[#002C3E]">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what learners will build and understand..."
                rows={4}
                className="mt-2 w-full resize-y rounded-xl border border-[#dfe6df] px-3 py-3 text-sm leading-6 text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20"
              />
            </label>

            <fieldset>
              <legend className="text-sm font-medium text-[#002C3E]">Level</legend>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {levels.map((option) => (
                  <label key={option} className={`flex h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${level === option ? "border-[#F7444E] bg-[#ffd9d6] text-[#002C3E]" : "border-[#dfe6df] text-[#526f78]"}`}>
                    <input type="radio" name="level" value={option} checked={level === option} onChange={() => setLevel(option)} className="accent-[#F7444E]" />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm font-medium text-[#002C3E]">
              Thumbnail
              <span className="mt-2 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#dfe6df] bg-[#fbfcf9] px-4 text-center hover:bg-[#f5f7f3]">
                <ImagePlus className="h-8 w-8 text-[#F7444E]" />
                <span className="mt-3 text-sm text-[#002C3E]">Drop an image or click to upload</span>
                <span className="mt-1 text-xs text-[#71878c]">PNG or JPG, 1280×720 recommended · max 2 MB</span>
                <span className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#dfe6df] bg-white px-3 py-2 text-xs font-semibold text-[#002C3E] shadow-sm">
                  <Upload className="h-3.5 w-3.5" />
                  {thumbnailName || "Choose file"}
                </span>
                <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => setThumbnailName(event.target.files?.[0]?.name ?? "")} />
              </span>
            </label>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
            <div className="border-b border-[#dfe6df] px-5 py-4"><h2 className="font-semibold text-[#002C3E]">Publishing</h2></div>
            <div className="p-5">
              <p className="text-sm text-[#526f78]">Status</p>
              <div className="mt-2 flex h-11 items-center justify-between rounded-xl border border-[#dfe6df] bg-[#f5f7f3] px-3 text-sm text-[#526f78]">
                Draft
                <span className="h-2 w-2 rounded-full bg-[#71878c]" />
              </div>
              <p className="mt-4 rounded-xl bg-[#ffe9c6] px-3 py-3 text-xs leading-5 text-[#7c5a28]">Courses can only be published after every chapter has at least one approved lesson.</p>
            </div>
          </section>
          <section className="rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
            <div className="border-b border-[#dfe6df] px-5 py-4"><h2 className="font-semibold text-[#002C3E]">What happens next</h2></div>
            <ol className="space-y-3 p-5 text-sm text-[#637981]">
              {["Add chapters to structure the curriculum", "Write or generate lessons with AI", "Attach learning resources", "Link questions from the bank", "Send to review, then publish"].map((item, index) => (
                <li key={item} className="flex items-start gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e2f0f1] text-xs font-semibold text-[#527983]">{index + 1}</span><span>{item}</span></li>
              ))}
            </ol>
          </section>
        </aside>
      </form>
    </div>
  );
}
