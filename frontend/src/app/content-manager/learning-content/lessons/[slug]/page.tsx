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
          className="inline-flex items-center gap-2 text-sm text-[#637981] hover:text-[#002C3E]"
        >
          <ArrowLeft className="h-4 w-4" />
          All lessons
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-medium text-[#002C3E] shadow-xs hover:bg-[#f3f7f5]"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={() => saveLesson("draft")}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-medium text-[#002C3E] shadow-xs hover:bg-[#f3f7f5]"
          >
            <Save className="h-4 w-4" />
            Save draft
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-medium text-[#002C3E] shadow-xs hover:bg-[#f3f7f5]"
          >
            <WandSparkles className="h-4 w-4" />
            Generate with AI
          </button>
          <button
            type="button"
            onClick={() => saveLesson("in_review")}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-[#db3540]"
          >
            <Send className="h-4 w-4" />
            Submit for review
          </button>
        </div>
      </div>
      <header>
        <div className="flex items-center gap-2 text-xs text-[#637981]">
          <span className="rounded-full border border-[#dfe6df] bg-[#fbfcf8] px-2.5 py-1 font-semibold text-[#002C3E]">
            {status}
          </span>
          <span>{chapterTitle}</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#002C3E]">
          {title}
        </h1>
      </header>
      {isLoading && (
        <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
          Loading lesson data...
        </p>
      )}
      {loadError && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[#F7444E]">
          {loadError}
        </p>
      )}
      {saveMessage && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saveMessage}
        </p>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
        <aside className="rounded-2xl border border-[#dfe6df] bg-white p-3 shadow-xs">
          <p className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-[#637981]">
            Structure
          </p>
          <nav className="space-y-1">
            {lessons.map((lesson) => (
              <Link
                key={lesson.slug}
                href={`/content-manager/learning-content/lessons/${lesson.slug}`}
                className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${selectedSlug === lesson.slug ? "border border-[#F7444E]/40 bg-[#F7444E]/10 font-semibold text-[#F7444E]" : "text-[#637981] hover:bg-[#f3f7f5] hover:text-[#002C3E]"}`}
              >
                {lesson.title}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-xs">
            <div className="flex flex-wrap items-center gap-4 border-b border-[#dfe6df] px-5 py-3 text-[#637981]">
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
              className="min-h-[265px] w-full resize-y border-0 bg-white p-5 text-[16px] leading-relaxed text-[#002C3E] outline-none focus:ring-2 focus:ring-[#78BCC4]/20"
            />
          </section>
          <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-xs">
            <div className="border-b border-[#dfe6df] px-5 py-4">
              <h2 className="font-semibold text-[#002C3E]">C# example</h2>
              <p className="text-xs text-[#637981]">
                Rendered with syntax highlighting for students
              </p>
            </div>
            <textarea
              value={codeExample}
              onChange={(event) => setCodeExample(event.target.value)}
              placeholder="Add a C# code example..."
              className="mx-4 my-4 min-h-[180px] w-[calc(100%-2rem)] resize-y rounded-xl border border-[#dfe6df] bg-[#fbfcf8] p-5 font-mono text-sm leading-7 text-[#002C3E] outline-none focus:ring-2 focus:ring-[#78BCC4]/40 placeholder:text-[#637981]/70"
            />
          </section>
          <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-xs">
            <div className="border-b border-[#dfe6df] px-5 py-4">
              <h2 className="font-semibold text-[#002C3E]">Exercises</h2>
            </div>
            {exercises.length > 0 ? (
              <div className="space-y-3 p-4">
                {exercises.map((exercise, index) => (
                  <div
                    key={exercise.id}
                    className="flex items-start gap-3 rounded-xl border border-[#dfe6df] bg-[#fbfcf8] px-3 py-3 text-sm text-[#002C3E]"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#F7444E] text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p>{exercise.content}</p>
                      <p className="mt-1 text-xs text-[#637981]">
                        {exercise.type} · {exercise.difficulty} · {exercise.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-sm text-[#637981]">
                No exercises have been added to this lesson yet.
              </p>
            )}
          </section>
        </main>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-xs">
            <h2 className="border-b border-[#dfe6df] pb-4 font-semibold text-[#002C3E]">
              Lesson settings
            </h2>
            <label className="mt-4 block text-xs font-semibold text-[#637981]">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4]"
              />
            </label>
            <label className="mt-4 block text-xs font-semibold text-[#637981]">
              Lesson ID
              <input
                value={slug}
                readOnly
                className="mt-1.5 h-10 w-full rounded-xl border border-[#dfe6df] bg-[#fbfcf8] px-3 font-mono text-sm text-[#637981] outline-none"
              />
            </label>
            <label className="mt-4 block text-xs font-semibold text-[#637981]">
              Chapter
              <select value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4] cursor-pointer">
                <option className="bg-white text-[#002C3E]">{chapterTitle}</option>
              </select>
            </label>
            <label className="mt-4 block text-xs font-semibold text-[#637981]">
              Status
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4] cursor-pointer">
                <option className="bg-white text-[#002C3E]">Published</option>
                <option className="bg-white text-[#002C3E]">Approved</option>
                <option className="bg-white text-[#002C3E]">Draft</option>
                <option className="bg-white text-[#002C3E]">In review</option>
              </select>
            </label>
            <label className="mt-5 flex items-center justify-between text-sm text-[#637981]">
              Show code playground
              <button
                type="button"
                role="switch"
                aria-checked={showPlayground}
                onClick={() => setShowPlayground(!showPlayground)}
                className={`relative h-5 w-9 rounded-full transition-colors ${showPlayground ? "bg-[#F7444E]" : "bg-[#dfe6df]"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${showPlayground ? "right-0.5" : "left-0.5"}`}
                />
              </button>
            </label>
          </section>
          <section className="rounded-2xl border border-rose-200/60 bg-white p-5 shadow-xs">
            <h2 className="font-semibold text-[#F7444E]">Danger zone</h2>
            <p className="mt-2 text-xs leading-5 text-[#637981]">
              A lesson with related learning data cannot be deleted.
            </p>
            <button
              type="button"
              onClick={deleteLesson}
              disabled={isLoading || isSaving}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-semibold text-[#F7444E] hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete lesson
            </button>
          </section>
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-xs">
            <h2 className="font-semibold text-[#002C3E]">Publishing</h2>
            <p className="mt-2 text-xs text-[#637981]">Last saved just now</p>
            <button
              type="button"
              onClick={() => saveLesson("published")}
              disabled={isLoading || isSaving}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#F7444E] text-sm font-semibold text-white hover:bg-[#db3540] shadow-xs transition-opacity"
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
