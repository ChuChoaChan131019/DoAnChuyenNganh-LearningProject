"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Check, ChevronDown, ChevronRight, FileText, Globe2, Layers, RotateCcw, Search, Sparkles, X } from "lucide-react";
import { courseApi } from "@/lib/api";

type Status = "Draft" | "Approved" | "Published";
type Action = "approve" | "publish" | "unpublish";
type LessonRow = { id: string; title: string; status: string; version: number; is_ai_generated: boolean; order_index: number };
type ChapterRow = { id: string; title: string; status: string; order_index: number; lessons: LessonRow[] };
type CourseRow = { id: string; title: string; slug: string; status: string; chapters: ChapterRow[] };
type Target = { type: "course" | "chapter" | "lesson"; id: string; title: string; status: Status; version?: number; action: Action };

const label: Record<Status, string> = { Draft: "Bản nháp", Approved: "Đã duyệt", Published: "Đã xuất bản" };
const statusStyle: Record<Status, string> = {
  Draft: "border-slate-200 bg-slate-100 text-slate-600",
  Approved: "border-cyan-200 bg-cyan-50 text-cyan-700",
  Published: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
const actionText: Record<Action, { title: string; button: string; progress: string; description: string }> = {
  approve: { title: "Bạn muốn duyệt nội dung này?", button: "Duyệt", progress: "Đang duyệt...", description: "Chuyển từ bản nháp sang đã duyệt." },
  publish: { title: "Bạn muốn xuất bản nội dung này?", button: "Xuất bản", progress: "Đang xuất bản...", description: "Chuyển từ đã duyệt sang đã xuất bản." },
  unpublish: { title: "Bạn muốn gỡ xuất bản nội dung này?", button: "Gỡ xuất bản", progress: "Đang gỡ xuất bản...", description: "Chuyển về trạng thái đã duyệt để học viên không còn truy cập được." },
};
function toStatus(status: string): Status { return status === "published" ? "Published" : status === "approved" ? "Approved" : "Draft"; }
function nextAction(status: Status): Action { return status === "Draft" ? "approve" : status === "Approved" ? "publish" : "unpublish"; }

function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle[status]}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />{label[status]}</span>;
}

function FadeText({ children, className = "" }: { children: string; className?: string }) {
  const fade = "linear-gradient(90deg, #000 0, #000 calc(100% - 24px), transparent 100%)";
  return <span className={`block overflow-hidden whitespace-nowrap ${className}`} style={{ maskImage: fade, WebkitMaskImage: fade }}>{children}</span>;
}

export default function ReviewQueuePage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "ai">("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Target | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const rows = await courseApi.reviewTree() as CourseRow[];
      setCourses(rows);
      setExpanded((current) => current.size ? current : new Set(rows.flatMap((course) => [course.id, ...course.chapters.map((chapter) => chapter.id)])));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Không thể tải danh sách nội dung cần duyệt.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    courseApi.reviewTree().then((rows) => {
      if (!active) return;
      const tree = rows as CourseRow[];
      setCourses(tree);
      setExpanded((current) => current.size ? current : new Set(tree.flatMap((course) => [course.id, ...course.chapters.map((chapter) => chapter.id)])));
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : "Không thể tải danh sách nội dung cần duyệt.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const totals = useMemo(() => {
    const nodes = courses.flatMap((course) => [course, ...course.chapters, ...course.chapters.flatMap((chapter) => chapter.lessons)]);
    return {
      courses: courses.length,
      chapters: courses.reduce((sum, course) => sum + course.chapters.length, 0),
      lessons: courses.reduce((sum, course) => sum + course.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.lessons.length, 0), 0),
      drafts: nodes.filter((node) => toStatus(node.status) === "Draft").length,
    };
  }, [courses]);

  const term = query.trim().toLocaleLowerCase("vi");
  const filteredCourses = courses.map((course) => {
    const chapters = course.chapters.map((chapter) => {
      const lessons = chapter.lessons.filter((lesson) =>
        (sourceFilter === "all" || (sourceFilter === "ai" ? lesson.is_ai_generated : !lesson.is_ai_generated)) &&
        (!term || [lesson.title, chapter.title, course.title].some((value) => value.toLocaleLowerCase("vi").includes(term))),
      );
      const chapterMatches = !term || chapter.title.toLocaleLowerCase("vi").includes(term) || course.title.toLocaleLowerCase("vi").includes(term);
      return { ...chapter, visibleLessons: lessons, visible: chapterMatches || lessons.length > 0 };
    }).filter((chapter) => chapter.visible);
    const visible = !term || course.title.toLocaleLowerCase("vi").includes(term) || chapters.length > 0;
    return { ...course, visibleChapters: chapters, visible };
  }).filter((course) => course.visible);

  function toggle(id: string) {
    setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function changeStatus() {
    if (!selected || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      if (selected.type === "lesson") {
        await courseApi.reviewAction(selected.id, { action: selected.action, version: selected.version ?? 1, reason: reason.trim() });
      } else if (selected.type === "chapter") {
        await courseApi.reviewChapterAction(selected.id, selected.action);
      } else {
        await courseApi.reviewCourseAction(selected.id, selected.action);
      }
      setSelected(null);
      setReason("");
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể thay đổi trạng thái.");
    } finally { setSaving(false); }
  }

  const openAction = (type: Target["type"], id: string, title: string, rawStatus: string, version?: number) => {
    const status = toStatus(rawStatus);
    setActionError(null);
    setReason("");
    setSelected({ type, id, title, status, version, action: nextAction(status) });
  };

  return <div className="mx-auto max-w-[1320px] space-y-6 pb-12">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">Duyệt nội dung</h1>
        <p className="mt-2 text-sm text-[#637981]">Xem và duyệt toàn bộ cấu trúc khóa học, chương và bài học.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-xl border border-[#dfe6df] bg-white px-3 py-2 text-[#637981]"><b className="text-[#002C3E]">{totals.courses}</b> khóa học</span>
        <span className="rounded-xl border border-[#dfe6df] bg-white px-3 py-2 text-[#637981]"><b className="text-[#002C3E]">{totals.chapters}</b> chương</span>
        <span className="rounded-xl border border-[#dfe6df] bg-white px-3 py-2 text-[#637981]"><b className="text-[#002C3E]">{totals.lessons}</b> bài học</span>
        <span className="rounded-xl border border-[#f7c2c5] bg-[#fff1f0] px-3 py-2 text-[#a6313b]"><b className="text-[#002C3E]">{totals.drafts}</b> bản nháp</span>
      </div>
    </header>

    <section className="flex flex-col gap-3 rounded-2xl border border-[#dfe6df] bg-white p-4 shadow-[0_8px_24px_rgba(0,44,62,0.06)] sm:flex-row sm:items-center sm:justify-between">
      <label className="relative block w-full max-w-[520px]"><span className="sr-only">Tìm nội dung</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71878c]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm khóa học, chương, bài học..." className="h-10 w-full rounded-xl border border-[#dfe6df] pl-10 pr-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20" /></label>
      <label className="flex items-center gap-2 text-sm text-[#637981]">Nguồn bài học <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as typeof sourceFilter)} className="h-10 rounded-xl border border-[#dfe6df] bg-white px-3 font-medium text-[#002C3E]"><option value="all">Tất cả nguồn</option><option value="manual">Tự soạn</option><option value="ai">Tạo tự động</option></select></label>
    </section>

    {loadError && <div role="alert" className="rounded-2xl border border-[#F7444E]/30 bg-[#fff1f0] px-5 py-4 text-sm text-[#F7444E]">{loadError} <button type="button" onClick={() => { setLoading(true); void refresh(); }} className="ml-2 font-semibold underline">Thử lại</button></div>}
    <section aria-label="Cây duyệt khóa học, chương và bài học" className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_24px_rgba(0,44,62,0.06)]">
      <div className="flex items-center justify-between border-b border-[#dfe6df] bg-[#e6f7f8] px-5 py-4"><h2 className="text-base font-bold text-[#002C3E]">Khóa học và nội dung học tập</h2><span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#14919B]">{filteredCourses.length} courses</span></div>
      <div className="hidden grid-cols-[minmax(0,1fr)_130px_130px_180px] gap-4 border-b border-[#dfe6df] bg-[#f8fbf9] px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#527983] md:grid"><span>Bài học / cấp nội dung</span><span>Nguồn</span><span>Trạng thái</span><span className="text-right">Thao tác</span></div>
      {loading && <p className="px-5 py-14 text-center text-sm text-[#637981]">Đang tải danh sách duyệt...</p>}
      {!loading && !loadError && filteredCourses.length === 0 && <div className="px-5 py-14 text-center"><FileText className="mx-auto h-9 w-9 text-[#adbfbe]" /><p className="mt-3 font-semibold text-[#002C3E]">Không tìm thấy nội dung</p><p className="mt-1 text-sm text-[#637981]">Thử từ khóa hoặc nguồn bài học khác.</p></div>}
      {!loading && !loadError && filteredCourses.map((course) => {
        const courseStatus = toStatus(course.status);
        const CourseChevron = expanded.has(course.id) ? ChevronDown : ChevronRight;
        return <div key={course.id} className="border-b border-[#dfe6df] last:border-0">
          <div className="grid grid-cols-1 gap-2 bg-[#fbfdfb] px-4 py-3 md:grid-cols-[minmax(0,1fr)_130px_130px_180px] md:items-center md:gap-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3"><button type="button" aria-label={`${expanded.has(course.id) ? "Thu gọn" : "Mở rộng"} ${course.title}`} onClick={() => toggle(course.id)} className="rounded-lg p-1 text-[#637981] hover:bg-[#e6f7f8]"><CourseChevron className="h-4 w-4" /></button><BookOpen className="h-5 w-5 text-[#F7444E]" /><div className="min-w-0 flex-1"><p className="font-bold text-[#002C3E]"><FadeText>{course.title}</FadeText></p><p className="text-xs text-[#637981]">Course · {course.visibleChapters.length} chapters</p></div></div>
            <span className="hidden md:block" />
            <div><span className="text-[10px] font-semibold uppercase text-[#829397] md:hidden">Trạng thái </span><StatusBadge status={courseStatus} /></div>
            <div className="md:text-right"><button type="button" onClick={() => openAction("course", course.id, course.title, course.status)} className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold ${courseStatus === "Published" ? "border border-[#dfe6df] bg-white text-[#526f78] hover:bg-[#f8fbf9]" : courseStatus === "Approved" ? "bg-[#14919B] text-white hover:bg-[#117b83]" : "bg-[#F7444E] text-white hover:bg-[#df3540]"}`}>
              {courseStatus === "Draft" ? <Check className="h-3.5 w-3.5" /> : courseStatus === "Approved" ? <Globe2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}{actionText[nextAction(courseStatus)].button} course
            </button></div>
          </div>
          {expanded.has(course.id) && <div className="pb-2">
            {course.visibleChapters.map((chapter) => {
              const chapterStatus = toStatus(chapter.status);
              const ChapterChevron = expanded.has(chapter.id) ? ChevronDown : ChevronRight;
              return <div key={chapter.id}>
                <div className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_130px_130px_180px] md:items-center md:gap-4 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3 md:pl-7"><button type="button" aria-label={`${expanded.has(chapter.id) ? "Thu gọn" : "Mở rộng"} ${chapter.title}`} onClick={() => toggle(chapter.id)} className="rounded-lg p-1 text-[#637981] hover:bg-[#e6f7f8]"><ChapterChevron className="h-4 w-4" /></button><Layers className="h-4 w-4 text-[#14919B]" /><div className="min-w-0 flex-1"><p className="font-semibold text-[#16485a]"><FadeText>{chapter.title}</FadeText></p><p className="text-xs text-[#637981]">Chapter · {chapter.visibleLessons.length} lessons</p></div></div>
                  <span className="hidden md:block" />
                  <div><span className="text-[10px] font-semibold uppercase text-[#829397] md:hidden">Trạng thái </span><StatusBadge status={chapterStatus} /></div>
                  <div className="md:text-right"><button type="button" onClick={() => openAction("chapter", chapter.id, chapter.title, chapter.status)} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold ${chapterStatus === "Published" ? "border border-[#dfe6df] bg-white text-[#526f78] hover:bg-[#f8fbf9]" : chapterStatus === "Approved" ? "bg-[#14919B] text-white hover:bg-[#117b83]" : "bg-[#F7444E] text-white hover:bg-[#df3540]"}`}>
                    {chapterStatus === "Draft" ? <Check className="h-3.5 w-3.5" /> : chapterStatus === "Approved" ? <Globe2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}{actionText[nextAction(chapterStatus)].button} chapter
                  </button></div>
                </div>
                {expanded.has(chapter.id) && <div className="space-y-1 pb-2">
                  {chapter.visibleLessons.map((lesson) => {
                    const lessonStatus = toStatus(lesson.status);
                    return <div key={lesson.id} className="grid grid-cols-1 gap-2 rounded-xl px-4 py-2.5 hover:bg-[#f8fbf9] md:grid-cols-[minmax(0,1fr)_130px_130px_180px] md:items-center md:gap-4 sm:px-5">
                      <div className="flex min-w-0 items-center gap-3 md:pl-14"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${lesson.is_ai_generated ? "bg-[#e6f7f8] text-[#14919B]" : "bg-[#fff1f0] text-[#F7444E]"}`}>{lesson.is_ai_generated ? <Sparkles className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><Link href={`/content-manager/learning-content/lessons/${lesson.id}/preview`} title={lesson.title} className="block text-sm font-semibold text-[#002C3E] hover:text-[#F7444E] hover:underline"><FadeText>{lesson.title}</FadeText></Link><span className="text-[11px] text-[#637981]">Lesson · v{lesson.version}</span></div></div>
                      <div><span className="text-[10px] font-semibold uppercase text-[#829397] md:hidden">Nguồn </span><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${lesson.is_ai_generated ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{lesson.is_ai_generated ? <Sparkles className="h-3 w-3" /> : <FileText className="h-3 w-3" />}{lesson.is_ai_generated ? "Tạo tự động" : "Tự soạn"}</span></div>
                      <div><span className="text-[10px] font-semibold uppercase text-[#829397] md:hidden">Trạng thái </span><StatusBadge status={lessonStatus} /></div>
                      <div className="flex items-center gap-2 md:justify-end"><button type="button" onClick={() => openAction("lesson", lesson.id, lesson.title, lesson.status, lesson.version)} className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold ${lessonStatus === "Published" ? "border border-[#dfe6df] bg-white text-[#526f78] hover:bg-[#f8fbf9]" : lessonStatus === "Approved" ? "bg-[#14919B] text-white hover:bg-[#117b83]" : "bg-[#F7444E] text-white hover:bg-[#df3540]"}`}>
                        {lessonStatus === "Draft" ? <Check className="h-3.5 w-3.5" /> : lessonStatus === "Approved" ? <Globe2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}{actionText[nextAction(lessonStatus)].button}
                      </button>
                      <Link href={`/content-manager/learning-content/lessons/${lesson.id}/preview`} title={`Preview ${lesson.title}`} aria-label={`Preview ${lesson.title}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe6df] text-[#526f78] hover:border-[#78BCC4] hover:text-[#002C3E]"><ArrowUpRight className="h-4 w-4" /></Link>
                      </div></div>;
                  })}
                  {chapter.visibleLessons.length === 0 && <p className="px-3 py-3 text-xs text-[#829397]">Chương này chưa có bài học.</p>}
                </div>}
              </div>;
            })}
            {course.visibleChapters.length === 0 && <p className="px-10 py-3 text-xs text-[#829397]">Khóa học này chưa có chương.</p>}
          </div>}
        </div>;
      })}
    </section>

    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#00151d]/75 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setSelected(null); }}><div role="alertdialog" aria-modal="true" aria-labelledby="review-title" aria-describedby="review-description" className="w-full max-w-md rounded-2xl border border-[#dfe6df] bg-[#fffefb] p-6 shadow-2xl">
      <div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-xl ${selected.action === "publish" ? "bg-[#e6f7f8] text-[#14919B]" : "bg-[#fff1f0] text-[#F7444E]"}`}>{selected.action === "publish" ? <Globe2 className="h-5 w-5" /> : selected.action === "unpublish" ? <RotateCcw className="h-5 w-5" /> : <Check className="h-5 w-5" />}</span><button type="button" disabled={saving} onClick={() => setSelected(null)} aria-label="Đóng" className="rounded-lg p-1 text-[#526f78] hover:bg-[#f8fbf9]"><X className="h-5 w-5" /></button></div>
      <h2 id="review-title" className="mt-5 text-xl font-semibold text-[#002C3E]">{actionText[selected.action].title}</h2><p id="review-description" className="mt-2 text-sm leading-6 text-[#637981]"><strong className="text-[#002C3E]">{selected.title}</strong>: {actionText[selected.action].description}</p>
      {selected.action === "publish" && selected.type !== "lesson" && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">To publish, all items inside this {selected.type} need to be Approved or Published first.</p>}
      {selected.action === "unpublish" && selected.type === "lesson" && <label className="mt-4 block text-sm font-semibold text-[#002C3E]">Lý do<textarea required value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-[#dfe6df] p-3 text-sm" placeholder="Nêu lý do xử lý..." /></label>}
      {actionError && <p role="alert" className="mt-4 rounded-xl border border-[#F7444E]/30 bg-[#fff1f0] p-3 text-sm text-[#F7444E]">{actionError}</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setSelected(null)} className="h-10 rounded-xl border border-[#dfe6df] px-4 text-sm font-semibold text-[#002C3E]">Hủy</button><button type="button" disabled={saving || (selected.action === "unpublish" && selected.type === "lesson" && !reason.trim())} onClick={() => void changeStatus()} className={`h-10 rounded-xl px-4 text-sm font-semibold shadow-sm disabled:opacity-60 ${selected.action === "publish" ? "bg-[#14919B] text-white hover:bg-[#117b83]" : selected.action === "unpublish" ? "border border-[#dfe6df] bg-white text-[#526f78]" : "bg-[#F7444E] text-white hover:bg-[#df3540]"}`}>{saving ? actionText[selected.action].progress : `${actionText[selected.action].button} ${selected.type}`}</button></div>
    </div></div>}
  </div>;
}
