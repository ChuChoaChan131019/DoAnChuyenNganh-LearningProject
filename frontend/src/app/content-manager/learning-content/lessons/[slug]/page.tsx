"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Eye,
  Globe2,
  Image as ImageIcon,
  List,
  Save,
  Table2,
  Type,
  WandSparkles,
  Quote,
  Code2,
  Trash2,
} from "lucide-react";
import { courseApi } from "@/lib/api";
import LessonMaterials from "@/components/content-manager/lesson-materials";
import { vietnameseDifficulty, vietnameseStatus } from "@/lib/ui-labels";

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
  const [version, setVersion] = useState(1);
  const [savedFields, setSavedFields] = useState({ title: "", content: "", codeExample: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showPlayground, setShowPlayground] = useState(true);

  const saveLesson = async () => {
    if (!selectedSlug) return;

    setIsSaving(true);
    setSaveMessage(null);
    setLoadError(null);
    try {
      if (title.trim() !== savedFields.title || content !== savedFields.content || codeExample !== savedFields.codeExample) {
        const saved = await courseApi.updateLesson(selectedSlug, { title: title.trim(), content, code_example: codeExample, version });
        setVersion(saved.version);
        setStatus("Draft");
        setSavedFields({ title: title.trim(), content, codeExample });
      }
      setSaveMessage("Lesson saved successfully.");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Không thể lưu bài học.");
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (action: "approve" | "publish") => {
    if (!selectedSlug) return;
    if (title.trim() !== savedFields.title || content !== savedFields.content || codeExample !== savedFields.codeExample) {
      setLoadError("Hãy lưu thay đổi trước khi cập nhật trạng thái bài học.");
      return;
    }
    if (!window.confirm(action === "approve" ? "Approve this lesson?" : "Publish this lesson?")) return;

    setIsSaving(true);
    setLoadError(null);
    setSaveMessage(null);
    try {
      const updated = await courseApi.reviewAction(selectedSlug, { action, version });
      setVersion(updated.version);
      setStatus(action === "approve" ? "Approved" : "Published");
      setSaveMessage(action === "approve" ? "Lesson approved." : "Lesson published.");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Không thể thay đổi trạng thái bài học.");
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
      setLoadError(error instanceof Error ? error.message : "Không thể xóa bài học.");
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
        setVersion(lesson.version);
        setSavedFields({ title: lesson.title, content: lesson.content ?? "", codeExample: lesson.code_example ?? "" });
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
              : "Draft",
        );
        setIsLoading(false);
      })
      .catch(() => {
        if (!isActive) return;
        setLoadError("Không thể tải bài học từ cơ sở dữ liệu.");
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
          Tất cả bài học
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={selectedSlug ? `/content-manager/learning-content/lessons/${selectedSlug}/preview` : "#"}
            onClick={(event) => { if (title.trim() !== savedFields.title || content !== savedFields.content || codeExample !== savedFields.codeExample) { event.preventDefault(); setLoadError("Hãy lưu thay đổi trước khi xem trước bài học."); } }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-medium text-[#002C3E] shadow-sm hover:bg-[#f8fbf9]"
          >
            <Eye className="h-4 w-4" />
            Xem trước bài học đã lưu
          </Link>
          <button
            type="button"
            onClick={() => void saveLesson()}
            disabled={isLoading || isSaving || status === "Published"}
            className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-medium text-[#002C3E] shadow-sm hover:bg-[#f8fbf9]"
          >
            <Save className="h-4 w-4" />
            Lưu bản nháp
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#dfe6df] bg-white px-4 py-2 text-sm font-medium text-[#002C3E] shadow-sm hover:bg-[#f8fbf9]"
          >
            <WandSparkles className="h-4 w-4" />
            Tạo bằng trí tuệ nhân tạo
          </button>
          {status === "Draft" && <button type="button" onClick={() => void changeStatus("approve")} disabled={isLoading || isSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"><Check className="h-4 w-4" />Duyệt</button>}
          {status === "Approved" && <button type="button" onClick={() => void changeStatus("publish")} disabled={isLoading || isSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#14919B] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"><Globe2 className="h-4 w-4" />Xuất bản</button>}
        </div>
      </div>
      <header>
        <div className="flex items-center gap-2 text-xs text-[#637981]">
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
            {vietnameseStatus(status)}
          </span>
          <span>{chapterTitle}</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#002C3E]">
          {title}
        </h1>
      </header>
      {isLoading && (
        <p className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
          Đang tải dữ liệu bài học...
        </p>
      )}
      {loadError && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </p>
      )}
      {saveMessage && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saveMessage}
        </p>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
        <aside className="rounded-2xl border border-[#dfe6df] bg-white p-3 shadow-sm">
          <p className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-[#637981]">
            Cấu trúc
          </p>
          <nav className="space-y-1">
            {lessons.map((lesson) => (
              <Link
                key={lesson.slug}
                href={`/content-manager/learning-content/lessons/${lesson.slug}`}
                className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm ${selectedSlug === lesson.slug ? "border border-[#002C3E] bg-[#ffe0df] font-semibold text-[#F7444E]" : "text-[#526f78] hover:bg-[#f8fbf9]"}`}
              >
                {lesson.title}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="space-y-4">
          <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-4 border-b border-[#dfe6df] px-5 py-3 text-[#637981]">
              <Type className="h-4 w-4" />
              <span className="font-semibold">H2</span>
              <span className="font-bold">B</span>
              <List className="h-4 w-4" />
              <Quote className="h-4 w-4" />
              <Code2 className="h-4 w-4" />
              <Table2 className="h-4 w-4" />
              <ImageIcon className="h-4 w-4" />
              <span className="ml-auto text-xs">Có thể dùng Markdown</span>
            </div>
            <textarea
              value={content}
              readOnly={status === "Published"}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[265px] w-full resize-y border-0 p-5 text-[16px] leading-relaxed text-[#16485a] outline-none focus:ring-2 focus:ring-[#78BCC4]/20"
            />
          </section>
          <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
            <div className="border-b border-[#dfe6df] px-5 py-4">
              <h2 className="font-semibold text-[#002C3E]">Ví dụ C#</h2>
              <p className="text-xs text-[#637981]">
                Hiển thị mã nguồn với tô màu cú pháp cho học viên
              </p>
            </div>
            <textarea
              value={codeExample}
              readOnly={status === "Published"}
              onChange={(event) => setCodeExample(event.target.value)}
              placeholder="Thêm ví dụ mã C#..."
              className="mx-4 my-4 min-h-[180px] w-[calc(100%-2rem)] resize-y rounded-xl bg-[#061d26] p-5 font-mono text-sm leading-7 text-[#d8e9e8] outline-none focus:ring-2 focus:ring-[#78BCC4]/40"
            />
          </section>
          {selectedSlug && status === "Draft" && <LessonMaterials key={selectedSlug} lessonId={selectedSlug} />}
          <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
            <div className="border-b border-[#dfe6df] px-5 py-4">
              <h2 className="font-semibold text-[#002C3E]">Bài tập</h2>
            </div>
            {exercises.length > 0 ? (
              <div className="space-y-3 p-4">
                {exercises.map((exercise, index) => (
                  <div
                    key={exercise.id}
                    className="flex items-start gap-3 rounded-xl bg-[#f4f5f0] px-3 py-3 text-sm text-[#16485a]"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#F7444E] text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <p>{exercise.content}</p>
                      <p className="mt-1 text-xs text-[#637981]">
                        {exercise.type} · {vietnameseDifficulty(exercise.difficulty)} · {vietnameseStatus(exercise.status)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-sm text-[#637981]">
                Bài học này chưa có bài tập.
              </p>
            )}
          </section>
        </main>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#dfe6df] bg-white p-5 shadow-sm">
            <h2 className="border-b border-[#dfe6df] pb-4 font-semibold text-[#002C3E]">
              Cài đặt bài học
            </h2>
            <label className="mt-4 block text-xs font-semibold text-[#526f78]">
              Tiêu đề
              <input
                value={title}
                readOnly={status === "Published"}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[#dfe6df] px-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4]"
              />
            </label>
            <label className="mt-4 block text-xs font-semibold text-[#526f78]">
              Mã bài học
              <input
                value={slug}
                readOnly
                className="mt-1.5 h-10 w-full rounded-xl border border-[#dfe6df] bg-slate-50 px-3 font-mono text-sm text-[#637981] outline-none"
              />
            </label>
            <label className="mt-4 block text-xs font-semibold text-[#526f78]">
              Chương
              <select value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#dfe6df] bg-white px-3 text-sm text-[#002C3E]">
                <option>{chapterTitle}</option>
              </select>
            </label>
            <label className="mt-4 block text-xs font-semibold text-[#526f78]">
              Trạng thái
              <span className="mt-1.5 block rounded-xl border border-[#dfe6df] bg-slate-50 px-3 py-2 text-sm text-[#002C3E]">{vietnameseStatus(status)} · phiên bản {version}</span>
            </label>
            <label className="mt-5 flex items-center justify-between text-sm text-[#526f78]">
              Hiển thị khu vực thực hành mã
              <button
                type="button"
                role="switch"
                aria-checked={showPlayground}
                onClick={() => setShowPlayground(!showPlayground)}
                className={`relative h-5 w-9 rounded-full ${showPlayground ? "bg-[#F7444E]" : "bg-[#dfe6df]"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${showPlayground ? "right-0.5" : "left-0.5"}`}
                />
              </button>
            </label>
          </section>
          <section className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-rose-700">Thao tác nguy hiểm</h2>
            <p className="mt-2 text-xs leading-5 text-[#637981]">
              Không thể xóa bài học đang có dữ liệu học tập liên quan.
            </p>
            <button
              type="button"
              onClick={deleteLesson}
              disabled={isLoading || isSaving || status !== "Draft"}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Xóa bài học
            </button>
          </section>
          <Link href="/content-manager/ai/review-queue" className="block rounded-2xl border border-[#dfe6df] bg-white p-5 text-sm font-semibold text-[#14919B] shadow-sm">Mở danh sách duyệt bài học</Link>
        </aside>
      </div>
    </div>
  );
}
