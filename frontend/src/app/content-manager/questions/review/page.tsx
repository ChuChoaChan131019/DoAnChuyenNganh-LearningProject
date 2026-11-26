"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { ApiClientError, questionApi } from "@/lib/api";
import { catalogApi } from "@/lib/api";
import { vietnameseDifficulty } from "@/lib/ui-labels";
import type {
  DifficultyLevel,
  QuestionItem,
  QuestionStatus,
  QuestionType,
} from "@/types/question";
import { Pagination } from "@/components/ui/pagination";
import { useServerPagination } from "@/hooks/use-server-pagination";

type TabFilter = "draft" | "approved" | "rejected" | "all";

type LessonGroup = { id: string; title: string; questions: QuestionItem[] };
type ChapterGroup = { id: string; title: string; lessons: LessonGroup[] };
type CourseGroup = { id: string; title: string; chapters: ChapterGroup[] };

const TABS: { value: TabFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Bản nháp" },
  { value: "approved", label: "Đã công bố" },
  { value: "rejected", label: "Đã từ chối" },
];

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "Một đáp án",
  multiple_choice: "Nhiều đáp án",
  true_false: "Đúng / Sai",
  fill_in_blank: "Điền vào chỗ trống",
};

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  easy: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  medium: "bg-amber-50 text-amber-700 border-amber-200/60",
  hard: "bg-rose-50 text-rose-700 border-rose-200/60",
};

function groupQuestions(questions: QuestionItem[]): CourseGroup[] {
  const courses: CourseGroup[] = [];
  for (const question of questions) {
    const courseId = question.course_id || "unknown-course";
    let course = courses.find((item) => item.id === courseId);
    if (!course) {
      course = {
        id: courseId,
        title: question.course?.title || "Chưa rõ khóa học",
        chapters: [],
      };
      courses.push(course);
    }

    const chapterId = question.chapter_id || "unknown-chapter";
    let chapter = course.chapters.find((item) => item.id === chapterId);
    if (!chapter) {
      chapter = {
        id: chapterId,
        title: question.chapter?.title || "Chưa rõ chương",
        lessons: [],
      };
      course.chapters.push(chapter);
    }

    const lessonId = question.lesson_id || "unknown-lesson";
    let lesson = chapter.lessons.find((item) => item.id === lessonId);
    if (!lesson) {
      lesson = {
        id: lessonId,
        title: question.lesson?.title || "Chưa rõ bài học",
        questions: [],
      };
      chapter.lessons.push(lesson);
    }
    lesson.questions.push(question);
  }
  return courses;
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  const config: Record<QuestionStatus, { style: string; label: string }> = {
    approved: {
      style: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "Đã công bố",
    },
    draft: {
      style: "border-gray-200 bg-gray-100 text-gray-600",
      label: "Bản nháp",
    },
    rejected: {
      style: "border-rose-200 bg-rose-50 text-rose-700",
      label: "Đã từ chối",
    },
  };
  const current = config[status];
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${current.style}`}
    >
      {current.label}
    </span>
  );
}

function QuestionRow({
  item,
  previewHref,
  isUpdating,
  expanded,
  onToggle,
  onApprove,
  onReject,
  onRevoke,
  isAdmin,
}: {
  item: QuestionItem;
  previewHref: string;
  isUpdating: boolean;
  expanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRevoke: () => void;
  isAdmin: boolean;
}) {
  return (
    <div className="border-b border-[#edf1ed] last:border-b-0">
      <div className="grid grid-cols-1 gap-2 px-4 py-2.5 hover:bg-[#f8fbf9] md:grid-cols-[minmax(0,1fr)_130px_130px_180px] md:items-center md:gap-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3 md:pl-21">
          <button
            type="button"
            aria-label={`${expanded ? "Thu gọn" : "Mở rộng"} câu hỏi: ${item.content}`}
            aria-expanded={expanded}
            onClick={onToggle}
            className="rounded-lg p-1 text-[#637981] hover:bg-[#e6f7f8]"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.is_ai_generated ? "bg-[#e6f7f8] text-[#14919B]" : "bg-[#fff1f0] text-[#F7444E]"}`}
          >
            {item.is_ai_generated ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={previewHref}
              title={item.content}
              className="block truncate text-sm font-semibold text-[#002C3E] hover:text-[#F7444E] hover:underline"
            >
              {item.content}
            </Link>
            <span className="text-[11px] text-[#637981]">
              Câu hỏi · {TYPE_LABELS[item.question_type]}
            </span>
          </div>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase text-[#829397] md:hidden">
            Nguồn{" "}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${item.is_ai_generated ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
          >
            {item.is_ai_generated ? (
              <Sparkles className="h-3 w-3" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            {item.is_ai_generated ? "Tạo tự động" : "Tự soạn"}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-semibold uppercase text-[#829397] md:hidden">
            Trạng thái{" "}
          </span>
          <StatusBadge status={item.status} />
        </div>
        <div className="flex flex-wrap gap-1.5 md:justify-end">
          {item.status === "draft" && (
            <>
              {!isAdmin && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={onReject}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#dfe6df] bg-white px-2.5 text-xs font-semibold text-[#526f78] hover:bg-[#fff1f0] disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Từ chối
                </button>
              )}
              <button
                type="button"
                disabled={isUpdating}
                onClick={onApprove}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#F7444E] px-2.5 text-xs font-semibold text-white hover:bg-[#df3540] disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Công bố
              </button>
            </>
          )}
          {item.status === "approved" && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={onRevoke}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#dfe6df] bg-white px-2.5 text-xs font-semibold text-[#526f78] hover:bg-[#f8fbf9] disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Gỡ duyệt
            </button>
          )}
          <Link
            href={previewHref}
            title={`Xem câu hỏi: ${item.content}`}
            aria-label={`Xem câu hỏi: ${item.content}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe6df] text-[#526f78] hover:border-[#78BCC4] hover:text-[#002C3E]"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[#edf1ed] bg-[#fbfdfb] px-5 py-4 md:pl-36">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${DIFFICULTY_STYLES[item.difficulty]}`}
            >
              {vietnameseDifficulty(item.difficulty)}
            </span>
            <span className="text-xs text-[#637981]">
              {TYPE_LABELS[item.question_type]}
            </span>
          </div>
          <div className="space-y-2">
            {(item.options ?? []).map((option, index) => (
              <div
                key={option.id ?? `${item.id}-${option.order_index}`}
                className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${option.is_correct ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-gray-200 text-slate-700"}`}
              >
                <span className="font-bold">
                  {String.fromCharCode(65 + index)}.
                </span>
                <span className="flex-1 break-words">{option.option_text}</span>
                {option.is_correct && (
                  <span className="text-xs font-semibold text-emerald-700">
                    Đúng
                  </span>
                )}
              </div>
            ))}
          </div>
          {item.explanation && (
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              <strong>Giải thích: </strong>
              {item.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function GroupRow({
  title,
  kind,
  count,
  level,
  open,
  onToggle,
}: {
  title: string;
  kind: "Khóa học" | "Chương" | "Bài học";
  count: number;
  level: 0 | 1 | 2;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = level === 0 ? BookOpen : level === 1 ? Layers : FileText;
  return (
    <div
      className={`grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_130px_130px_180px] md:items-center md:gap-4 sm:px-5 ${level === 0 ? "bg-[#fbfdfb]" : "hover:bg-[#f8fbf9]"}`}
    >
      <div
        className={`flex min-w-0 items-center gap-3 ${level === 1 ? "md:pl-7" : level === 2 ? "md:pl-14" : ""}`}
      >
        <button
          type="button"
          aria-label={`${open ? "Thu gọn" : "Mở rộng"} ${kind.toLowerCase()} ${title}`}
          aria-expanded={open}
          onClick={onToggle}
          className="rounded-lg p-1 text-[#637981] hover:bg-[#e6f7f8]"
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <Icon
          className={`h-5 w-5 shrink-0 ${level === 0 ? "text-[#F7444E]" : level === 1 ? "text-[#14919B]" : "text-[#637981]"}`}
        />
        <div className="min-w-0 flex-1">
          <p
            className={`truncate ${level === 0 ? "font-bold text-[#002C3E]" : "text-sm font-semibold text-[#16485a]"}`}
            title={title}
          >
            {title}
          </p>
          <p className="text-xs text-[#637981]">
            {kind} · {count}{" "}
            {level === 2 ? "câu hỏi" : level === 1 ? "bài học" : "chương"}
          </p>
        </div>
      </div>
      <span className="hidden md:block" />
      <span className="hidden md:block" />
      <span className="text-xs text-[#637981] md:text-right">
        {count} {level === 2 ? "câu hỏi" : level === 1 ? "bài học" : "chương"}
      </span>
    </div>
  );
}

export default function QuestionReviewPage() {
  const pathname = usePathname();
  const previewBase = pathname.startsWith("/admin/")
    ? "/admin/questions"
    : "/content-manager/questions";
  const [currentTab, setCurrentTab] = useState<TabFilter>("all");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "ai">(
    "all",
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<{
    item: QuestionItem;
    status: "approved" | "rejected";
  } | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<QuestionItem | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPage = useCallback(
    (page: number, page_size: number) =>
      catalogApi.page<QuestionItem>("questions", {
        page,
        page_size,
        search: query,
        status: currentTab === "all" ? undefined : currentTab,
        source: sourceFilter,
      }),
    [query, currentTab, sourceFilter],
  );
  const questionPaging = useServerPagination(loadPage, {
    resetKey: JSON.stringify([query, currentTab, sourceFilter]),
  });
  const isLoading = questionPaging.isLoading;
  const groupedQuestions = useMemo(
    () => groupQuestions(questionPaging.pageItems),
    [questionPaging.pageItems],
  );
  const questionStats = {
    total: 0,
    drafts: 0,
    approved: 0,
    rejected: 0,
    ...questionPaging.stats,
  };
  const refresh = () => {
    setExpanded(new Set());
    questionPaging.refresh();
  };

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const reviewQuestion = async () => {
    if (
      !decisionTarget ||
      (decisionTarget.status === "rejected" && !decisionReason.trim())
    )
      return;
    const { item, status } = decisionTarget;
    setUpdatingId(item.id);
    setError("");
    setMessage("");
    try {
      await questionApi.updateStatus(
        item.id,
        status,
        status === "rejected" ? decisionReason.trim() : undefined,
        item.version,
      );
      refresh();
      setDecisionTarget(null);
      setDecisionReason("");
      setMessage(
        status === "approved"
          ? "Đã công bố câu hỏi."
          : pathname.startsWith("/admin/")
            ? "Đã gửi yêu cầu chỉnh sửa cho manager."
            : "Đã từ chối câu hỏi.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : "Không thể cập nhật câu hỏi.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const revokeApproval = async () => {
    if (!revokeTarget || !revokeReason.trim()) return;
    setUpdatingId(revokeTarget.id);
    setError("");
    setMessage("");
    try {
      await questionApi.revokeApproval(
        revokeTarget.id,
        revokeReason.trim(),
        revokeTarget.version ?? 0,
      );
      refresh();
      setRevokeTarget(null);
      setRevokeReason("");
      setMessage(
        pathname.startsWith("/admin/")
          ? "Đã gỡ duyệt và thông báo cho manager."
          : "Đã gỡ duyệt. Câu hỏi được chuyển về bản nháp.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : "Không thể gỡ công bố câu hỏi.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#002C3E]">
            Duyệt câu hỏi
          </h1>
          <p className="mt-2 text-sm text-[#637981]">
            Xem và công bố câu hỏi theo cấu trúc khóa học, chương và bài học.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-xl border border-[#dfe6df] bg-white px-3 py-2 text-[#637981]">
            <b className="text-[#002C3E]">{questionStats.total}</b> câu hỏi
          </span>
          <span className="rounded-xl border border-[#dfe6df] bg-white px-3 py-2 text-[#637981]">
            <b className="text-[#002C3E]">{questionStats.approved}</b> đã công
            bố
          </span>
          <span className="rounded-xl border border-[#dfe6df] bg-white px-3 py-2 text-[#637981]">
            <b className="text-[#002C3E]">{questionStats.rejected}</b> từ chối
          </span>
          <span className="rounded-xl border border-[#f7c2c5] bg-[#fff1f0] px-3 py-2 text-[#a6313b]">
            <b className="text-[#002C3E]">{questionStats.drafts}</b> bản nháp
          </span>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#dfe6df] bg-white p-4 shadow-[0_8px_24px_rgba(0,44,62,0.06)] sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-[520px]">
          <span className="sr-only">Tìm câu hỏi</span>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71878c]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm câu hỏi, khóa học, chương, bài học..."
            className="h-10 w-full rounded-xl border border-[#dfe6df] pl-10 pr-3 text-sm text-[#002C3E] outline-none focus:border-[#78BCC4] focus:ring-2 focus:ring-[#78BCC4]/20"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[#637981]">
            Nguồn câu hỏi{" "}
            <select
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(event.target.value as typeof sourceFilter)
              }
              className="h-10 rounded-xl border border-[#dfe6df] bg-white px-3 font-medium text-[#002C3E]"
            >
              <option value="all">Tất cả nguồn</option>
              <option value="manual">Tự soạn</option>
              <option value="ai">Tạo tự động</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-[#637981]">
            Trạng thái{" "}
            <select
              value={currentTab}
              onChange={(event) =>
                setCurrentTab(event.target.value as TabFilter)
              }
              className="h-10 rounded-xl border border-[#dfe6df] bg-white px-3 font-medium text-[#002C3E]"
            >
              {TABS.map((tab) => (
                <option key={tab.value} value={tab.value}>
                  {tab.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {(error || questionPaging.error) && (
        <div
          role="alert"
          className="rounded-2xl border border-[#F7444E]/30 bg-[#fff1f0] px-5 py-4 text-sm text-[#F7444E]"
        >
          {error || questionPaging.error}{" "}
          <button
            type="button"
            onClick={() => void refresh()}
            className="ml-2 font-semibold underline"
          >
            Thử lại
          </button>
        </div>
      )}
      {message && (
        <p
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700"
        >
          {message}
        </p>
      )}

      <section
        aria-label="Cây duyệt khóa học, chương, bài học và câu hỏi"
        className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-[0_8px_24px_rgba(0,44,62,0.06)]"
      >
        <div className="flex items-center justify-between border-b border-[#dfe6df] bg-[#e6f7f8] px-5 py-4">
          <h2 className="text-base font-bold text-[#002C3E]">
            Khóa học và ngân hàng câu hỏi
          </h2>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#14919B]">
            {questionPaging.totalItems} câu hỏi
          </span>
        </div>
        <div className="hidden grid-cols-[minmax(0,1fr)_130px_130px_180px] gap-4 border-b border-[#dfe6df] bg-[#f8fbf9] px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#527983] md:grid">
          <span>Câu hỏi / cấp nội dung</span>
          <span>Nguồn</span>
          <span>Trạng thái</span>
          <span className="text-right">Thao tác</span>
        </div>
        {isLoading && (
          <p className="px-5 py-14 text-center text-sm text-[#637981]">
            Đang tải danh sách duyệt...
          </p>
        )}
        {!isLoading && !error && groupedQuestions.length === 0 && (
          <div className="px-5 py-14 text-center">
            <FileText className="mx-auto h-9 w-9 text-[#adbfbe]" />
            <p className="mt-3 font-semibold text-[#002C3E]">
              Không tìm thấy câu hỏi
            </p>
            <p className="mt-1 text-sm text-[#637981]">
              Thử từ khóa hoặc bộ lọc khác.
            </p>
          </div>
        )}
        {!isLoading &&
          groupedQuestions.map((course) => (
            <div
              key={course.id}
              className="border-b border-[#dfe6df] last:border-0"
            >
              <GroupRow
                title={course.title}
                kind="Khóa học"
                count={course.chapters.length}
                level={0}
                open={expanded.has(course.id)}
                onToggle={() => toggle(course.id)}
              />
              {expanded.has(course.id) && (
                <div className="pb-2">
                  {course.chapters.map((chapter) => (
                    <div key={chapter.id}>
                      <GroupRow
                        title={chapter.title}
                        kind="Chương"
                        count={chapter.lessons.length}
                        level={1}
                        open={expanded.has(chapter.id)}
                        onToggle={() => toggle(chapter.id)}
                      />
                      {expanded.has(chapter.id) && (
                        <div className="pb-2">
                          {chapter.lessons.map((lesson) => (
                            <div key={lesson.id}>
                              <GroupRow
                                title={lesson.title}
                                kind="Bài học"
                                count={lesson.questions.length}
                                level={2}
                                open={expanded.has(lesson.id)}
                                onToggle={() => toggle(lesson.id)}
                              />
                              {expanded.has(lesson.id) && (
                                <div className="pb-2">
                                  {lesson.questions.map((item) => (
                                    <QuestionRow
                                      key={item.id}
                                      isAdmin={pathname.startsWith("/admin/")}
                                      item={item}
                                      previewHref={`${previewBase}/${encodeURIComponent(item.id)}/preview`}
                                      expanded={expanded.has(item.id)}
                                      onToggle={() => toggle(item.id)}
                                      isUpdating={updatingId === item.id}
                                      onApprove={() => {
                                        setError("");
                                        setDecisionTarget({
                                          item,
                                          status: "approved",
                                        });
                                        setDecisionReason("");
                                      }}
                                      onReject={() => {
                                        setError("");
                                        setDecisionTarget({
                                          item,
                                          status: "rejected",
                                        });
                                        setDecisionReason("");
                                      }}
                                      onRevoke={() => {
                                        setError("");
                                        setRevokeTarget(item);
                                        setRevokeReason("");
                                      }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </section>

      <Pagination
        page={questionPaging.page}
        pageSize={questionPaging.pageSize}
        totalItems={questionPaging.totalItems}
        onPageChange={questionPaging.setPage}
      />

      {decisionTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#00151d]/75 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !updatingId)
              setDecisionTarget(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="decision-title"
            aria-describedby="decision-description"
            className="w-full max-w-md rounded-2xl border border-[#dfe6df] bg-[#fffefb] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff1f0] text-[#F7444E]">
                {decisionTarget.status === "approved" ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <X className="h-5 w-5" />
                )}
              </span>
              <button
                type="button"
                disabled={Boolean(updatingId)}
                onClick={() => setDecisionTarget(null)}
                aria-label="Đóng"
                className="rounded-lg p-1 text-[#526f78] hover:bg-[#f8fbf9]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h2
              id="decision-title"
              className="mt-5 text-xl font-semibold text-[#002C3E]"
            >
              {decisionTarget.status === "approved"
                ? "Bạn muốn công bố câu hỏi này?"
                : pathname.startsWith("/admin/")
                  ? "Yêu cầu manager chỉnh sửa câu hỏi?"
                  : "Bạn muốn từ chối câu hỏi này?"}
            </h2>
            <p
              id="decision-description"
              className="mt-2 text-sm leading-6 text-[#637981]"
            >
              {decisionTarget.item.content}
            </p>
            {decisionTarget.status === "rejected" && (
              <label className="mt-4 block text-sm font-semibold text-[#002C3E]">
                {pathname.startsWith("/admin/")
                  ? "Nội dung cần sửa"
                  : "Lý do từ chối"}
                <textarea
                  required
                  value={decisionReason}
                  onChange={(event) => setDecisionReason(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-[#dfe6df] p-3 text-sm outline-none focus:border-[#78BCC4]"
                  placeholder="Nêu nội dung cần sửa..."
                />
              </label>
            )}
            {(error || questionPaging.error) && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[#F7444E]/30 bg-[#fff1f0] p-3 text-sm text-[#F7444E]"
              >
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(updatingId)}
                onClick={() => setDecisionTarget(null)}
                className="h-10 rounded-xl border border-[#dfe6df] px-4 text-sm font-semibold text-[#002C3E]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={
                  Boolean(updatingId) ||
                  (decisionTarget.status === "rejected" &&
                    !decisionReason.trim())
                }
                onClick={() => void reviewQuestion()}
                className="h-10 rounded-xl bg-[#F7444E] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#df3540] disabled:opacity-60"
              >
                {updatingId
                  ? "Đang xử lý..."
                  : decisionTarget.status === "approved"
                    ? "Công bố câu hỏi"
                    : pathname.startsWith("/admin/")
                      ? "Gửi yêu cầu"
                      : "Từ chối câu hỏi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {revokeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#00151d]/75 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !updatingId)
              setRevokeTarget(null);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="revoke-title"
            aria-describedby="revoke-description"
            className="w-full max-w-md rounded-2xl border border-[#dfe6df] bg-[#fffefb] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff1f0] text-[#F7444E]">
                <RotateCcw className="h-5 w-5" />
              </span>
              <button
                type="button"
                disabled={Boolean(updatingId)}
                onClick={() => setRevokeTarget(null)}
                aria-label="Đóng"
                className="rounded-lg p-1 text-[#526f78] hover:bg-[#f8fbf9]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h2
              id="revoke-title"
              className="mt-5 text-xl font-semibold text-[#002C3E]"
            >
              Bạn muốn gỡ duyệt câu hỏi này?
            </h2>
            <p
              id="revoke-description"
              className="mt-2 text-sm leading-6 text-[#637981]"
            >
              Câu hỏi sẽ về bản nháp và không còn được dùng trong quiz cho người
              học. Quiz không còn câu hỏi đã công bố sẽ tự thu hồi.
            </p>
            <p className="mt-3 rounded-xl bg-[#f8fbf9] p-3 text-sm font-medium text-[#002C3E]">
              {revokeTarget.content}
            </p>
            <label
              htmlFor="revoke-reason"
              className="mt-4 block text-sm font-semibold text-[#002C3E]"
            >
              Lý do gỡ duyệt
            </label>
            <textarea
              id="revoke-reason"
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              maxLength={2000}
              rows={3}
              className="mt-2 w-full rounded-xl border border-[#dfe6df] p-3 text-sm outline-none focus:border-[#78BCC4]"
              placeholder="Nêu lỗi cần sửa hoặc lý do thu hồi câu hỏi"
            />
            {(error || questionPaging.error) && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[#F7444E]/30 bg-[#fff1f0] p-3 text-sm text-[#F7444E]"
              >
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={Boolean(updatingId)}
                onClick={() => setRevokeTarget(null)}
                className="h-10 rounded-xl border border-[#dfe6df] px-4 text-sm font-semibold text-[#002C3E]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={Boolean(updatingId) || !revokeReason.trim()}
                onClick={() => void revokeApproval()}
                className="h-10 rounded-xl border border-[#dfe6df] bg-white px-4 text-sm font-semibold text-[#526f78] hover:bg-[#f8fbf9] disabled:opacity-60"
              >
                {updatingId ? "Đang xử lý..." : "Gỡ duyệt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
