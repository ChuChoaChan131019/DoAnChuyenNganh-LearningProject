"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, FileText, History, Pencil, Plus, Rocket, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ApiClientError, courseApi } from "@/lib/api";
import { toast } from "sonner";
import type { ContentStatus, CourseDetail, CourseLevel } from "@/types/learning-content";

type Tab = "Overview" | "Chapters" | "Lessons" | "Resources" | "Questions" | "Tests" | "AI Tools" | "History";
const tabs: Tab[] = ["Overview", "Chapters", "Lessons", "Resources", "Questions", "Tests", "AI Tools", "History"];
const statusStyles: Record<ContentStatus, string> = {
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
  Draft: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
  Approved: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-950/40 dark:text-cyan-300",
  "In review": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300",
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

function getCourseGradient(course: CourseDetail) {
  if (courseGradientBySlug[course.slug]) return courseGradientBySlug[course.slug];
  const hash = String(course.id)
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  return courseGradients[hash % courseGradients.length];
}

function StatusBadge({ status }: { status: ContentStatus }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />{status}</span>;
}

function EmptyTab({ title, description, action }: { title: string; description: string; action: string }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
      <BookOpen className="h-12 w-12 rounded-full bg-primary/10 p-3 text-primary" />
      <h2 className="mt-4 font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition hover:opacity-90">
        <Plus className="h-4 w-4" />{action}
      </button>
    </div>
  );
}

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLevel, setEditLevel] = useState<CourseLevel>("Beginner");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    courseApi.detail(slug).then((data) => { if (mounted) setCourse(data); }).catch((requestError) => { if (mounted) setError(requestError instanceof ApiClientError ? requestError.message : "Unable to load course."); }).finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, [slug]);

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    if (editTitle.trim().length < 3 || !editSlug.trim()) {
      setEditError("Tiêu đề khóa học phải có ít nhất 3 ký tự và slug là bắt buộc.");
      return;
    }
    setIsSaving(true);
    setEditError("");
    try {
      const payload: {
        title: string;
        slug: string;
        description?: string;
        level: CourseLevel;
        category_id?: string;
      } = {
        title: editTitle.trim(),
        slug: editSlug.trim(),
        description: editDescription.trim(),
        level: editLevel,
      };
      if (
        course.categoryId &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.categoryId)
      ) {
        payload.category_id = course.categoryId;
      }
      await courseApi.update(String(course.id), payload);
      const newSlug = editSlug.trim();
      setCourse({
        ...course,
        title: editTitle.trim(),
        slug: newSlug,
        description: editDescription.trim(),
        level: editLevel,
      });
      setIsEditing(false);
      toast.success("Cập nhật khóa học thành công!");
      if (newSlug !== slug) {
        router.replace(`/content-manager/learning-content/courses/${encodeURIComponent(newSlug)}`);
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật khóa học.";
      setEditError(msg);
      toast.error("Cập nhật thất bại", { description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <p className="mx-auto max-w-[1240px] py-16 text-center text-sm text-muted-foreground">Loading course...</p>;
  if (error || !course) return <div className="mx-auto max-w-[1240px] py-16 text-center"><p className="text-sm text-rose-500">{error || "Course not found."}</p><Link href="/content-manager/learning-content/courses" className="mt-4 inline-flex text-sm font-semibold text-foreground hover:text-primary">Back to courses</Link></div>;

  return (
    <div className="mx-auto max-w-[1240px] space-y-6 pb-12">
      <Link href="/content-manager/learning-content/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />All courses
      </Link>
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className={`h-[148px] bg-gradient-to-br ${getCourseGradient(course)}`} />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">{course.level}</span>
            <StatusBadge status={course.status} />
            <span className="font-mono text-xs text-muted-foreground">/{course.slug}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{course.title}</h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{course.description || "No description yet."}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditTitle(course.title);
                  setEditSlug(course.slug);
                  setEditDescription(course.description || "");
                  setEditLevel(course.level);
                  setEditError("");
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Pencil className="h-4 w-4" />Edit
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                <Sparkles className="h-4 w-4" />AI tools
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition hover:opacity-90">
                <Rocket className="h-4 w-4" />Publish
              </button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 sm:grid-cols-5">
            {[["Author", course.author], ["Created", course.created], ["Last updated", course.updated], ["Chapters", String(course.chapters)], ["Questions", String(course.questions)]].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-muted/30 p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors ${activeTab === tab ? "bg-card font-semibold text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab}
          </button>
        ))}
      </nav>
      {activeTab === "Overview" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="rounded-2xl border border-border bg-card shadow-xs">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold text-foreground">Content completeness</h2>
            </div>
            <div className="space-y-5 p-5">
              <div className="flex justify-between text-sm text-muted-foreground"><span>Lessons written</span><span className="font-semibold text-foreground">{course.lessons > 0 ? "100%" : "0%"}</span></div>
              <div className="flex justify-between text-sm text-muted-foreground"><span>Questions linked</span><span className="font-semibold text-foreground">{course.questions > 0 ? "100%" : "0%"}</span></div>
              <div className="flex justify-between text-sm text-muted-foreground"><span>Chapters created</span><span className="font-semibold text-foreground">{course.chapters > 0 ? "100%" : "0%"}</span></div>
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card shadow-xs">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold text-foreground">At a glance</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 p-5">
              {([ [course.chapters, "Chapters", BookOpen], [course.lessons, "Lessons", FileText], [course.questions, "Questions", CheckCircle2], [0, "Tests", History] ] as Array<[number, string, LucideIcon]>).map(([value, label, Icon]) => (
                <div key={label} className="rounded-2xl border border-border bg-muted/30 p-4">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
      {activeTab === "Chapters" && (
        <section className="rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">Chapters</h2>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity">
              <Plus className="h-4 w-4" />Add chapter
            </button>
          </div>
          {course.chapterList.length === 0 ? (
            <p className="p-8 text-sm text-muted-foreground">No chapters in this course yet.</p>
          ) : (
            course.chapterList.map((chapter, index) => (
              <div key={chapter.id} className="flex items-center gap-3 border-b border-border px-5 py-4 last:border-0 hover:bg-muted/30 transition-colors">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">{chapter.title}</span>
                <span className="text-xs text-muted-foreground">{chapter.lessons} lessons</span>
                <StatusBadge status={chapter.status} />
              </div>
            ))
          )}
        </section>
      )}
      {activeTab === "Lessons" && <section className="rounded-2xl border border-border bg-card p-5 shadow-xs"><h2 className="font-semibold text-foreground">All lessons</h2><p className="mt-1 text-sm text-muted-foreground">{course.lessons ? `${course.lessons} lessons across every chapter of this course.` : "No lessons in this course yet."}</p></section>}
      {activeTab === "Resources" && <EmptyTab title="No resources yet" description="Attach files, videos and articles to make this course richer." action="Add resource" />}
      {activeTab === "Questions" && <EmptyTab title={course.questions ? `${course.questions} linked questions` : "No linked questions"} description="Questions linked to this course from the question bank." action="Open bank" />}
      {activeTab === "Tests" && <EmptyTab title="No tests yet" description="Create an assessment for learners in this course." action="Create test" />}
      {activeTab === "AI Tools" && <EmptyTab title="AI course tools" description="Use AI to draft lessons and generate questions for this course." action="Open tools" />}
      {activeTab === "History" && <EmptyTab title="No history yet" description="Course activity history will appear here." action="Back to overview" />}

      {isEditing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-xs px-4 py-8"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSaving) setIsEditing(false);
          }}
        >
          <form
            onSubmit={handleUpdateCourse}
            className="max-h-full w-full max-w-[640px] overflow-y-auto rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Edit course</h2>
                <p className="mt-1 text-sm text-muted-foreground">Update the course title and information.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                aria-label="Close edit course"
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-foreground">
                Course title
                <input
                  value={editTitle}
                  onChange={(event) => {
                    setEditTitle(event.target.value);
                    setEditSlug(
                      event.target.value
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "")
                    );
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Slug
                <input
                  value={editSlug}
                  onChange={(event) => setEditSlug(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Description
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Level
                <select
                  value={editLevel}
                  onChange={(event) => setEditLevel(event.target.value as CourseLevel)}
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {["Beginner", "Intermediate", "Advanced"].map((lvl) => (
                    <option key={lvl} className="bg-card text-foreground">
                      {lvl}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {editError && (
              <p className="mt-3 text-sm text-rose-500" role="alert">
                {editError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="h-11 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
