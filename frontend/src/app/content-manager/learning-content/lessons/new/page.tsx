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
        if (isActive) setError("Không thể tải khóa học.");
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
        if (isActive) setError("Không thể tải chương.");
      });

    return () => {
      isActive = false;
    };
  }, [courseId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!courseId || !chapterId || !title.trim()) {
      setError("Cần nhập khóa học, chương và tiêu đề.");
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
      });
      router.push(`/content-manager/learning-content/lessons/${lesson.id}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu bài học.");
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
        Tất cả bài học
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">Tạo bài học</h1>
        <p className="mt-1 text-sm text-[#637981]">Tạo nội dung bài học và lưu vào hệ thống.</p>
      </header>

      {isLoading && <p className="rounded-xl bg-cyan-50 px-4 py-3 text-sm text-cyan-800">Đang tải khóa học...</p>}
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
            <div className="border-b border-[#dfe6df] px-5 py-4">
              <h2 className="font-semibold text-[#002C3E]">Nội dung bài học</h2>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-sm font-semibold text-[#526f78]">
                Tiêu đề
                <input required value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe6df] px-3 text-[#002C3E] outline-none focus:border-[#78BCC4]" placeholder="Ví dụ: Giới thiệu về biến" />
              </label>
              <label className="block text-sm font-semibold text-[#526f78]">
                Nội dung
                <textarea value={content} onChange={(event) => setContent(event.target.value)} className="mt-1.5 min-h-[230px] w-full resize-y rounded-xl border border-[#dfe6df] p-3 text-[#16485a] outline-none focus:border-[#78BCC4]" placeholder="Nhập nội dung bài học..." />
              </label>
              <label className="block text-sm font-semibold text-[#526f78]">
                Ví dụ C#
                <textarea value={codeExample} onChange={(event) => setCodeExample(event.target.value)} className="mt-1.5 min-h-[180px] w-full resize-y rounded-xl border border-[#dfe6df] bg-[#061d26] p-3 font-mono text-sm text-[#d8e9e8] outline-none focus:border-[#78BCC4]" placeholder="Dán ví dụ mã C#..." />
              </label>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-sm">
          <h2 className="border-b border-[#dfe6df] pb-4 font-semibold text-[#002C3E]">Cài đặt bài học</h2>
          <label className="mt-4 block text-sm font-semibold text-[#526f78]">
            Khóa học
            <select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm text-[#002C3E]">
              {courses.map((course) => <option key={course.id} value={String(course.id)}>{course.title}</option>)}
            </select>
          </label>
          <label className="mt-4 block text-sm font-semibold text-[#526f78]">
            Chương
            <select value={chapterId} onChange={(event) => setChapterId(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm text-[#002C3E]">
              {chapters.map((chapter) => <option key={chapter.id} value={String(chapter.id)}>{chapter.title}</option>)}
            </select>
          </label>
          <label className="mt-4 block text-sm font-semibold text-[#526f78]">
            Thời lượng (phút)
            <input type="number" min="0" max="1440" value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe6df] px-3 text-[#002C3E]" />
          </label>
          <p className="mt-4 text-sm text-[#526f78]">Trạng thái: <strong>Bản nháp</strong></p>
          <button type="submit" disabled={isSaving || isLoading} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F7444E] text-sm font-semibold text-white hover:bg-[#df3540] disabled:cursor-not-allowed disabled:opacity-60">
            <Save className="h-4 w-4" />
            {isSaving ? "Đang lưu..." : "Lưu bài học"}
          </button>
        </aside>
      </form>
    </div>
  );
}
