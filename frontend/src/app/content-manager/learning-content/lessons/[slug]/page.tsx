"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Image as ImageIcon,
  List,
  Play,
  Save,
  Send,
  Table2,
  Type,
  WandSparkles,
  Quote,
  Code2,
  Trash2,
} from "lucide-react";
import { courseApi } from "@/lib/api";

type EditorLesson = {
  title: string;
  slug: string;
  chapter: string;
  content: string;
};

export default function LessonEditorPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [lessons, setLessons] = useState<EditorLesson[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [codeExample, setCodeExample] = useState("");
  const [exercises, setExercises] = useState<Array<{
    id: string;
    content: string;
    type: string;
    difficulty: string;
    status: string;
  }>>([]);
  const [chapterTitle, setChapterTitle] = useState("");
  const [status, setStatus] = useState("Draft");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showPlayground, setShowPlayground] = useState(true);

  const saveLesson = async (nextStatus?: "draft" | "in_review" | "published") => {
    if (!selectedSlug) return;

    setIsSaving(true);
    setSaveMessage(null);
    setLoadError(null);
    const statusValue = nextStatus ?? (
      status === "Published"
        ? "published"
        : status === "Approved"
          ? "approved"
          : status === "In review"
            ? "in_review"
            : "draft"
    );

    try {
      await courseApi.updateLesson(selectedSlug, {
        title: title.trim(),
        content,
        code_example: codeExample,
        status: statusValue,
      });
      setStatus(
        statusValue === "published"
          ? "Published"
          : statusValue === "in_review"
            ? "In review"
            : statusValue === "approved"
              ? "Approved"
              : "Draft",
      );
      setSaveMessage("Lesson saved successfully.");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to save lesson.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLesson = async () => {
    if (!selectedSlug) return;
    if (!window.confirm("Delete this lesson? This cannot be undone.")) return;

    setIsSaving(true);
    setSaveMessage(null);
    setLoadError(null);
    try {
      await courseApi.removeLesson(selectedSlug);
      router.push("/content-manager/learning-content/lessons");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to delete lesson.");
      setIsSaving(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    courseApi.lesson(params.slug)
      .then((lesson) => {
        if (!isActive) return;

        setSelectedSlug(lesson.id);
        setTitle(lesson.title);
        setSlug(lesson.id);
        setContent(lesson.content ?? "");
        setCodeExample(lesson.code_example ?? "");
        setExercises(lesson.exercises);
        setChapterTitle(lesson.chapter.title);
        courseApi.chapters(lesson.course.id)
          .then((chapters) => {
            if (!isActive) return;

            setLessons(
              chapters.flatMap((chapter) =>
                chapter.lessons.map((chapterLesson) => ({
                  title: chapterLesson.title,
                  slug: chapterLesson.id ?? chapterLesson.title,
                  chapter: chapter.title,
                  content: "",
                })),
              ),
            );
          })
          .catch(() => {
            if (isActive) setLessons([]);
          });
        setStatus(
          lesson.status === "published"
            ? "Published"
            : lesson.status === "approved"
              ? "Approved"
              : lesson.status === "in_review"
                ? "In review"
                : "Draft",
        );
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setLoadError("Unable to load this lesson from Supabase.");
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [params.slug]);

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/content-manager/learning-content/lessons"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All lessons
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-muted"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={() => saveLesson("draft")}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-muted"
          >
            <Save className="h-4 w-4" />
            Save draft
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-muted"
          >
            <WandSparkles className="h-4 w-4" />
            Generate with AI
          </button>
          <button
            type="button"
            onClick={() => saveLesson("in_review")}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition hover:opacity-90"
          >
            <Send className="h-4 w-4" />
            Submit for review
          </button>
        </div>
      </div>
      <header>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border bg-muted px-2.5 py-1 font-semibold text-foreground">
            {status}
          </span>
          <span>{chapterTitle}</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </header>
      {isLoading && (
        <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800 dark:border-cyan-900/50 dark:bg-cyan-950/40 dark:text-cyan-300">
          Loading lesson data...
        </p>
      )}
      {loadError && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400">
          {loadError}
        </p>
      )}
      {saveMessage && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          {saveMessage}
        </p>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
        <aside className="rounded-2xl border border-border bg-card p-3 shadow-xs">
          <p className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Structure
          </p>
          <nav className="space-y-1">
            {lessons.map((lesson) => (
              <Link
                key={lesson.slug}
                href={`/content-manager/learning-content/lessons/${lesson.slug}`}
                className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${selectedSlug === lesson.slug ? "border border-primary/40 bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {lesson.title}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-3 text-muted-foreground">
              <Type className="h-4 w-4" />
              <span className="font-semibold">H2</span>
              <span className="font-bold">B</span>
              <List className="h-4 w-4" />
              <Quote className="h-4 w-4" />
              <Code2 className="h-4 w-4" />
              <Table2 className="h-4 w-4" />
              <ImageIcon className="h-4 w-4" />
              <span className="ml-auto text-xs">Markdown supported</span>
            </div>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[265px] w-full resize-y border-0 bg-background p-5 text-[16px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </section>
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold text-foreground">C# example</h2>
              <p className="text-xs text-muted-foreground">
                Rendered with syntax highlighting for students
              </p>
            </div>
            <textarea
              value={codeExample}
              onChange={(event) => setCodeExample(event.target.value)}
              placeholder="Add a C# code example..."
              className="mx-4 my-4 min-h-[180px] w-[calc(100%-2rem)] resize-y rounded-xl border border-border bg-muted/40 p-5 font-mono text-sm leading-7 text-foreground outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
            />
          </section>
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold text-foreground">Exercises</h2>
            </div>
            {exercises.length > 0 ? (
              <div className="space-y-3 p-4">
                {exercises.map((exercise, index) => (
                  <div
                    key={exercise.id}
                    className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm text-foreground"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <div>
                      <p>{exercise.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {exercise.type} · {exercise.difficulty} · {exercise.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-sm text-muted-foreground">
                No exercises have been added to this lesson yet.
              </p>
            )}
          </section>
        </main>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <h2 className="border-b border-border pb-4 font-semibold text-foreground">
              Lesson settings
            </h2>
            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
              Lesson ID
              <input
                value={slug}
                readOnly
                className="mt-1.5 h-10 w-full rounded-xl border border-border bg-muted/30 px-3 font-mono text-sm text-muted-foreground outline-none"
              />
            </label>
            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
              Chapter
              <select value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer">
                <option className="bg-card text-foreground">{chapterTitle}</option>
              </select>
            </label>
            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer">
                <option className="bg-card text-foreground">Published</option>
                <option className="bg-card text-foreground">Approved</option>
                <option className="bg-card text-foreground">Draft</option>
                <option className="bg-card text-foreground">In review</option>
              </select>
            </label>
            <label className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
              Show code playground
              <button
                type="button"
                role="switch"
                aria-checked={showPlayground}
                onClick={() => setShowPlayground(!showPlayground)}
                className={`relative h-5 w-9 rounded-full transition-colors ${showPlayground ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${showPlayground ? "right-0.5" : "left-0.5"}`}
                />
              </button>
            </label>
          </section>
          <section className="rounded-2xl border border-rose-200/60 bg-card p-5 shadow-xs dark:border-rose-900/50">
            <h2 className="font-semibold text-rose-600 dark:text-rose-400">Danger zone</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              A lesson with related learning data cannot be deleted.
            </p>
            <button
              type="button"
              onClick={deleteLesson}
              disabled={isLoading || isSaving}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete lesson
            </button>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <h2 className="font-semibold text-foreground">Publishing</h2>
            <p className="mt-2 text-xs text-muted-foreground">Last saved just now</p>
            <button
              type="button"
              onClick={() => saveLesson("published")}
              disabled={isLoading || isSaving}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 shadow-xs transition-opacity"
            >
              <Play className="h-4 w-4" />
              {isSaving ? "Saving..." : "Publish"}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
