"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { courseApi } from "@/lib/api";
import type { Chapter, Course } from "@/types/learning-content";

export default function NewLessonPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [courseId, setCourseId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("15");
  const [content, setContent] = useState("");
  const [codeExample, setCodeExample] = useState("");
  const [status, setStatus] = useState<"draft" | "in_review" | "approved" | "published">("draft");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    courseApi.list()
      .then((loadedCourses) => {
        if (!isActive) return;
        setCourses(loadedCourses);
        const firstCourse = loadedCourses[0];
        if (firstCourse) setCourseId(String(firstCourse.id));
      })
      .catch(() => {
        if (isActive) setError("Unable to load courses.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!courseId) return;
    let isActive = true;

    courseApi.chapters(courseId)
      .then((loadedChapters) => {
        if (!isActive) return;
        setChapters(loadedChapters);
        setChapterId(String(loadedChapters[0]?.id ?? ""));
      })
      .catch(() => {
        if (isActive) setError("Unable to load chapters.");
      });

    return () => {
      isActive = false;
    };
  }, [courseId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!courseId || !chapterId || !title.trim()) {
      setError("Course, chapter and title are required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const lesson = await courseApi.createLesson(courseId, chapterId, {
        title: title.trim(),
        estimated_duration_minutes: Number(duration) || 0,
        content,
        code_example: codeExample,
        status,
      });
      router.push(`/content-manager/learning-content/lessons/${lesson.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save lesson.");
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 pb-12">
      <Link
        href="/content-manager/learning-content/lessons"
        className="inline-flex items-center gap-2 text-sm text-[#637981] hover:text-[#002C3E]"
      >
        <ArrowLeft className="h-4 w-4" />
        All lessons
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">New lesson</h1>
        <p className="mt-1 text-sm text-[#637981]">Create lesson content and save it to Supabase.</p>
      </header>

      {isLoading && <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">Loading courses...</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-[#F7444E]">{error}</p>}

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-xs">
            <div className="border-b border-[#dfe6df] px-5 py-4">
              <h2 className="font-semibold text-[#002C3E]">Lesson content</h2>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-sm font-semibold text-[#637981]">
                Title
                <input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4] placeholder:text-[#637981]/70" placeholder="e.g. Introduction to variables" />
              </label>
              <label className="block text-sm font-semibold text-[#637981]">
                Content
                <textarea value={content} onChange={(event) => setContent(event.target.value)} className="mt-1.5 min-h-[230px] w-full resize-y rounded-xl border border-[#dfe6df] bg-white p-3 text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4] placeholder:text-[#637981]/70" placeholder="Write the lesson content..." />
              </label>
              <label className="block text-sm font-semibold text-[#637981]">
                C# example
                <textarea value={codeExample} onChange={(event) => setCodeExample(event.target.value)} className="mt-1.5 min-h-[180px] w-full resize-y rounded-xl border border-[#dfe6df] bg-[#fbfcf8] p-3 font-mono text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4] placeholder:text-[#637981]/70" placeholder="Paste a C# code example..." />
              </label>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-xs">
          <h2 className="border-b border-[#dfe6df] pb-4 font-semibold text-[#002C3E]">Lesson settings</h2>
          <label className="mt-4 block text-sm font-semibold text-[#637981]">
            Course
            <select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4] cursor-pointer">
              {courses.map((course) => <option key={course.id} value={String(course.id)} className="bg-white text-[#002C3E]">{course.title}</option>)}
            </select>
          </label>
          <label className="mt-4 block text-sm font-semibold text-[#637981]">
            Chapter
            <select value={chapterId} onChange={(event) => setChapterId(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4] cursor-pointer">
              {chapters.map((chapter) => <option key={chapter.id} value={String(chapter.id)} className="bg-white text-[#002C3E]">{chapter.title}</option>)}
            </select>
          </label>
          <label className="mt-4 block text-sm font-semibold text-[#637981]">
            Duration (minutes)
            <input type="number" min="0" max="1440" value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4]" />
          </label>
          <label className="mt-4 block text-sm font-semibold text-[#637981]">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-1 focus:ring-[#78BCC4] cursor-pointer">
              <option value="draft" className="bg-white text-[#002C3E]">Draft</option>
              <option value="in_review" className="bg-white text-[#002C3E]">In review</option>
              <option value="approved" className="bg-white text-[#002C3E]">Approved</option>
              <option value="published" className="bg-white text-[#002C3E]">Published</option>
            </select>
          </label>
          <button type="submit" disabled={isSaving || isLoading} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F7444E] text-sm font-semibold text-white transition hover:bg-[#db3540] disabled:cursor-not-allowed disabled:opacity-60 shadow-xs">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save lesson"}
          </button>
        </aside>
      </form>
    </div>
  );
}
