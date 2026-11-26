"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  quizPreviewDraftUrl,
  saveQuizPreviewDraft,
} from "@/lib/quiz-preview-draft";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Eye,
  Layers,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { ApiClientError, catalogApi, questionApi, quizApi } from "@/lib/api";
import type {
  ChapterOption,
  CourseOption,
  LessonOption,
  QuestionItem,
  QuestionType,
} from "@/types/question";
import type { QuizData, QuizItem, QuizType } from "@/types/quiz";
import { vietnameseDifficulty } from "@/lib/ui-labels";
import { Pagination } from "@/components/ui/pagination";
import { useServerPagination } from "@/hooks/use-server-pagination";

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "Một đáp án",
  multiple_choice: "Nhiều đáp án",
  true_false: "Đúng / Sai",
  fill_in_blank: "Điền vào chỗ trống",
};

type AssignedQuestion = { question: QuestionItem; score_weight: number };

type SettingsState = {
  title: string;
  description: string;
  course_id: string;
  chapter_id: string | null;
  quiz_type: QuizType;
  duration_minutes: number | null;
  pass_percentage: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  is_required: boolean;
  counts_toward_progress: boolean;
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#F7444E] focus:ring-2 focus:ring-[#F7444E]/20 disabled:bg-gray-50";

function getErrorMessage(error: unknown) {
  return error instanceof ApiClientError
    ? error.message
    : "Không thể hoàn tất yêu cầu. Vui lòng thử lại.";
}

function QuestionMeta({ question }: { question: QuestionItem }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
      <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5">
        {TYPE_LABELS[question.question_type] || question.question_type}
      </span>
      <span className="rounded-md border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-amber-700 capitalize">
        {vietnameseDifficulty(question.difficulty)}
      </span>
      {question.lesson?.title && <span>{question.lesson.title}</span>}
    </div>
  );
}

function settingsFromQuiz(quiz: Partial<QuizData> | null): SettingsState {
  return {
    title: quiz?.title || "",
    description: quiz?.description ?? "",
    course_id: quiz?.course_id || "",
    chapter_id: quiz?.chapter_id ?? null,
    quiz_type: quiz?.quiz_type || "exam",
    duration_minutes:
      quiz?.duration_minutes !== undefined ? quiz.duration_minutes : 15,
    pass_percentage: Number(quiz?.pass_percentage ?? quiz?.pass_score ?? 50),
    shuffle_questions:
      quiz?.shuffle_questions !== undefined
        ? Boolean(quiz.shuffle_questions)
        : true,
    shuffle_options:
      quiz?.shuffle_options !== undefined
        ? Boolean(quiz.shuffle_options)
        : true,
    is_required:
      quiz?.is_required !== undefined ? Boolean(quiz.is_required) : true,
    counts_toward_progress:
      quiz?.counts_toward_progress !== undefined
        ? Boolean(quiz.counts_toward_progress)
        : true,
  };
}

export default function QuizBuilderPage() {
  const params = useParams<{ id: string }>();
  const quizId = String(params?.id ?? "");

  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [settings, setSettings] = useState<SettingsState>({
    title: "Bài kiểm tra chưa đặt tên",
    description: "",
    course_id: "",
    chapter_id: null,
    quiz_type: "exam",
    duration_minutes: 15,
    pass_percentage: 50,
    shuffle_questions: true,
    shuffle_options: true,
    is_required: true,
    counts_toward_progress: true,
  });

  const [bankQuestions, setBankQuestions] = useState<QuestionItem[]>([]);
  const [assignedQuestions, setAssignedQuestions] = useState<
    AssignedQuestion[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [courseFilter, setCourseFilter] = useState("");
  const [chapterFilter, setChapterFilter] = useState("");
  const [lessonFilter, setLessonFilter] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlacement, setIsLoadingPlacement] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const loadedCourses = await questionApi.listCourses();
        if (!active) return;
        setCourses(loadedCourses);

        if (quizId) {
          const [loadedQuiz, configured] = await Promise.all([
            quizApi.getById(quizId),
            quizApi.getQuestions(quizId),
          ]);

          if (!active) return;

          if (loadedQuiz) {
            setQuiz(loadedQuiz);
            setSettings(settingsFromQuiz(loadedQuiz));
            setCourseFilter(loadedQuiz.course_id || "");

            if (loadedQuiz.course_id) {
              const loadedChapters = await questionApi.listChapters(loadedQuiz.course_id);
              if (active) setChapters(loadedChapters);
            }
          }
          if (!loadedQuiz) throw new Error('Không tải được bài kiểm tra.');

          if (Array.isArray(configured) && configured.length > 0) {
            setAssignedQuestions(
              configured
                .filter((item) => item.questions || item.question_id)
                .map((item) => {
                  const relation = Array.isArray(item.questions)
                    ? item.questions[0]
                    : item.questions;
                  return {
                    question: relation as QuestionItem,
                    score_weight: Number(item.score_weight) || 1.0,
                  };
                }),
            );
          }
        }
      } catch (loadError) {
        if (active) setLoadError(getErrorMessage(loadError));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (quizId) void load();

    return () => {
      active = false;
    };
  }, [quizId, loadVersion]);

  const assignedIds = useMemo(
    () =>
      new Set(
        assignedQuestions.map((item) => item.question?.id).filter(Boolean),
      ),
    [assignedQuestions],
  );

  const excludedIds = [...assignedIds].sort().join(",");
  const loadBankPage = useCallback(
    async (page: number, page_size: number) => {
      const result = await catalogApi.page<QuestionItem>("questions", {
        page,
        page_size,
        course_id: courseFilter,
        chapter_id: chapterFilter,
        lesson_id: lessonFilter,
        question_type: questionType,
        difficulty,
        search,
        status: "approved",
        exclude_ids: excludedIds,
      });
      // Keep visited question objects so checked rows survive page and filter changes.
      setBankQuestions((current) => [
        ...new Map(
          [...current, ...result.items].map((question) => [
            question.id,
            question,
          ]),
        ).values(),
      ]);
      return result;
    },
    [
      courseFilter,
      chapterFilter,
      lessonFilter,
      questionType,
      difficulty,
      search,
      excludedIds,
    ],
  );
  const bankPaging = useServerPagination(loadBankPage, {
    resetKey: JSON.stringify([
      courseFilter,
      chapterFilter,
      lessonFilter,
      questionType,
      difficulty,
      search,
    ]),
  });
  const filteredQuestions = bankPaging.pageItems;

  const allVisibleSelected =
    bankPaging.pageItems.length > 0 &&
    bankPaging.pageItems.every((q) => selectedIds.includes(q.id));

  const totalScore = assignedQuestions.reduce(
    (sum, item) =>
      sum + (Number.isFinite(item.score_weight) ? item.score_weight : 0),
    0,
  );

  const updateSettings = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const loadPlacement = async (
    nextCourseId: string,
    nextChapterId?: string,
  ) => {
    setIsLoadingPlacement(true);
    try {
      const nextChapters = nextCourseId
        ? await questionApi.listChapters(nextCourseId)
        : [];
      setChapters(nextChapters);
      const chapter = nextChapterId ?? "";
      setLessons(
        nextCourseId && chapter
          ? await questionApi.listLessons(nextCourseId, chapter)
          : [],
      );
    } catch (placementError) {
      setError(getErrorMessage(placementError));
    } finally {
      setIsLoadingPlacement(false);
    }
  };

  const handleSettingsCourse = (nextCourseId: string) => {
    updateSettings("course_id", nextCourseId);
    updateSettings("chapter_id", null);
    setSelectedIds([]);
    setCourseFilter(nextCourseId);
    setChapterFilter("");
    setLessonFilter("");
    void loadPlacement(nextCourseId);
  };

  const handleSettingsChapter = (nextChapterId: string) => {
    updateSettings("chapter_id", nextChapterId || null);
    if (settings?.course_id)
      void loadPlacement(settings.course_id, nextChapterId);
  };

  const handleFilterCourse = async (nextCourseId: string) => {
    setCourseFilter(nextCourseId);
    setChapterFilter("");
    setLessonFilter("");
    setLessons([]);
    setChapters(
      nextCourseId ? await questionApi.listChapters(nextCourseId) : [],
    );
  };

  const handleFilterChapter = async (nextChapterId: string) => {
    setChapterFilter(nextChapterId);
    setLessonFilter("");
    setLessons(
      courseFilter && nextChapterId
        ? await questionApi.listLessons(courseFilter, nextChapterId)
        : [],
    );
  };

  const toggleVisible = () => {
    const currentPageIds = bankPaging.pageItems.map((question) => question.id);

    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !currentPageIds.includes(id))
        : [...new Set([...current, ...currentPageIds])],
    );
  };

  const addSelected = () => {
    const selected = new Set(selectedIds);
    const additions = bankQuestions
      .filter((q) => selected.has(q.id) && !assignedIds.has(q.id))
      .map((question) => ({ question, score_weight: 1.0 }));
    setAssignedQuestions((current) => [...current, ...additions]);
    setSelectedIds([]);
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    setAssignedQuestions((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const save = async (publishAfterSave = false) => {
    if (isLoading || loadError || !quiz) return;
    setError(null);
    setSaveMessage(null);

    const selectedCourse = courses.find(
      (course) => course.id === settings.course_id,
    );
    const selectedChapter = chapters.find(
      (chapter) => chapter.id === settings.chapter_id,
    );

    if (!settings.title.trim()) return setError("Vui lòng nhập tiêu đề.");
    if (!selectedCourse) return setError("Vui lòng chọn khóa học hợp lệ.");
    if (
      settings.chapter_id &&
      (!selectedChapter || selectedChapter.course_id !== settings.course_id)
    ) {
      return setError("Vui lòng chọn chương hợp lệ trong khóa học đã chọn.");
    }
    if (
      settings.duration_minutes !== null &&
      (!Number.isInteger(settings.duration_minutes) ||
        settings.duration_minutes < 1)
    ) {
      return setError(
        "Thời lượng phải là số nguyên dương hoặc không giới hạn.",
      );
    }
    if (settings.pass_percentage < 0 || settings.pass_percentage > 100) {
      return setError("Điểm đạt (%) phải nằm trong khoảng từ 0 đến 100.");
    }
    if (
      assignedQuestions.some(
        (item) =>
          !Number.isFinite(item.score_weight) || item.score_weight < 0.1,
      )
    ) {
      return setError("Điểm của mỗi câu hỏi phải từ 0,1 trở lên.");
    }
    if (assignedQuestions.some((item) => item.question.course_id !== settings.course_id)) {
      return setError('Các câu hỏi phải thuộc khóa học của bài kiểm tra.');
    }

    setIsSaving(true);
    try {
      const payload = {
        title: settings.title.trim(),
        description: settings.description.trim(),
        course_id: settings.course_id,
        chapter_id: settings.chapter_id || null,
        duration_minutes: settings.duration_minutes,
        pass_score: Number(settings.pass_percentage),
        quiz_type: settings.quiz_type,
        shuffle_questions: settings.shuffle_questions,
        shuffle_options: settings.shuffle_options,
        is_required: settings.is_required,
        counts_toward_progress: settings.counts_toward_progress,
      };

      let saved = await quizApi.saveConfiguration(
        quizId,
        payload,
        assignedQuestions.map((item) => ({
          question_id: item.question.id,
          score_weight: item.score_weight || 1.0,
        })),
      );

      if (publishAfterSave) saved = await quizApi.publish(quizId);

      setQuiz(saved);
      setSettings(settingsFromQuiz(saved));
      setError(null);
      setSaveMessage(
        publishAfterSave
          ? "Đã lưu và xuất bản bài kiểm tra."
          : "Đã lưu bài kiểm tra ở dạng bản nháp.",
      );
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const withdraw = async () => {
    setError(null);
    setSaveMessage(null);
    setIsSaving(true);
    try {
      const saved = await quizApi.archive(quizId);
      setQuiz(saved);
      setSettings(settingsFromQuiz(saved));
      setSaveMessage(
        "Đã thu hồi bài kiểm tra. Người học không thể bắt đầu lượt làm mới.",
      );
    } catch (withdrawError) {
      setError(getErrorMessage(withdrawError));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl p-8 text-sm text-gray-500">
        Đang tải công cụ tạo bài kiểm tra...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 p-8" role="alert">
        <p className="text-sm text-rose-700">Không tải được bài kiểm tra: {loadError}</p>
        <button type="button" onClick={() => setLoadVersion((value) => value + 1)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold">
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Cài đặt bài kiểm tra
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Thiết lập thông tin, cách tổ chức và câu hỏi đã duyệt.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Xem trước cả thay đổi chưa lưu, mở tab mới để giữ nguyên trang đang chỉnh. */}
            <button
              type="button"
              disabled={assignedQuestions.length === 0}
              title={
                assignedQuestions.length
                  ? "Xem đề như học viên thấy, kể cả thay đổi chưa lưu"
                  : "Thêm ít nhất 1 câu hỏi để xem trước"
              }
              onClick={() => {
                saveQuizPreviewDraft({
                  quiz_id: quizId,
                  questions: assignedQuestions
                    .filter((item) => item.question?.id)
                    .map((item) => ({
                      question_id: item.question.id,
                      score_weight: item.score_weight || 1.0,
                    })),
                  meta: {
                    title: settings.title,
                    duration_minutes: settings.duration_minutes,
                    pass_percentage: settings.pass_percentage,
                  },
                });
                window.open(quizPreviewDraftUrl(quizId), "_blank");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              Xem trước
            </button>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${quiz?.is_active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
            >
              {quiz?.is_active ? "Đã xuất bản" : "Chưa xuất bản"}
            </span>
            {quiz?.is_active && (
              <button
                type="button"
                onClick={() => void withdraw()}
                disabled={isSaving}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Thu hồi
              </button>
            )}
            <button
              type="button"
              onClick={() => void save(false)}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Đang lưu..." : "Lưu bản nháp"}
            </button>
            <button
              type="button"
              onClick={() => void save(true)}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#d93e47] disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isSaving ? "Đang xử lý..." : "Lưu và xuất bản"}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </div>
      )}
      {saveMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saveMessage}
        </div>
      )}

      {/* Quiz Information and Settings */}
      <section className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-4">
          <Layers className="h-5 w-5 text-[#F7444E]" />
          <h2 className="font-semibold text-gray-900">
            Thông tin và cài đặt bài kiểm tra
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="lg:col-span-2">
            <span className="label">Tiêu đề</span>
            <input
              className={inputClass}
              value={settings.title}
              onChange={(e) => updateSettings("title", e.target.value)}
            />
          </label>
          <label>
            <span className="label">Loại bài kiểm tra</span>
            <select
              className={inputClass}
              value={settings.quiz_type}
              onChange={(e) =>
                updateSettings("quiz_type", e.target.value as QuizType)
              }
            >
              <option value="exam">Bài thi</option>
              <option value="exercise">Bài tập</option>
            </select>
          </label>
          <label className="md:col-span-2 lg:col-span-3">
            <span className="label">Mô tả</span>
            <textarea
              className={`${inputClass} min-h-20`}
              value={settings.description}
              onChange={(e) => updateSettings("description", e.target.value)}
            />
          </label>
          <label>
            <span className="label">Khóa học</span>
            <select
              className={inputClass}
              value={settings.course_id}
              onChange={(e) => handleSettingsCourse(e.target.value)}
            >
              <option value="">Chọn khóa học</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Chương</span>
            <select
              className={inputClass}
              value={settings.chapter_id ?? ""}
              disabled={!settings.course_id || isLoadingPlacement}
              onChange={(e) => handleSettingsChapter(e.target.value)}
            >
              <option value="">Toàn khóa học</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Thời lượng (phút)</span>
            <div className="flex gap-2">
              <input
                className={`${inputClass} flex-1`}
                type="number"
                min="1"
                step="1"
                value={settings.duration_minutes ?? ""}
                disabled={settings.duration_minutes === null}
                onChange={(e) =>
                  updateSettings(
                    "duration_minutes",
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              />
              <button
                type="button"
                className="rounded-xl border border-gray-200 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                onClick={() =>
                  updateSettings(
                    "duration_minutes",
                    settings.duration_minutes === null ? 15 : null,
                  )
                }
              >
                {settings.duration_minutes === null ? "Set" : "Unlimited"}
              </button>
            </div>
          </label>
          <label>
            <span className="label">Điểm đạt (%)</span>
            <input
              className={inputClass}
              type="number"
              min="0"
              max="100"
              step="1"
              value={settings.pass_percentage}
              onChange={(e) =>
                updateSettings("pass_percentage", Number(e.target.value))
              }
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-5 border-t border-gray-100 pt-4 text-sm text-gray-700">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="accent-[#F7444E]"
              checked={settings.shuffle_questions}
              onChange={(e) =>
                updateSettings("shuffle_questions", e.target.checked)
              }
            />
            Xáo trộn câu hỏi
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="accent-[#F7444E]"
              checked={settings.shuffle_options}
              onChange={(e) =>
                updateSettings("shuffle_options", e.target.checked)
              }
            />
            Xáo trộn phương án
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="accent-[#F7444E]"
              checked={settings.is_required}
              onChange={(e) => updateSettings("is_required", e.target.checked)}
            />
            Bắt buộc
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="accent-[#F7444E]"
              checked={settings.counts_toward_progress}
              onChange={(e) =>
                updateSettings("counts_toward_progress", e.target.checked)
              }
            />
            Tính vào tiến độ học tập
          </label>
        </div>
      </section>

      {/* Main 2-Column Area: Bank & Selected */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        {/* Question bank */}
        <section className="rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#F7444E]" />
                <h2 className="font-semibold text-gray-900">
                  Ngân hàng câu hỏi
                </h2>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Chỉ hiển thị câu hỏi đã duyệt.
              </p>
            </div>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-[#F7444E]">
              {bankPaging.totalItems} available
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="label">Khóa học</span>
              <select
                className={inputClass}
                value={courseFilter}
                onChange={(e) => void handleFilterCourse(e.target.value)}
              >
                <option value="">Tất cả khóa học</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Chương</span>
              <select
                className={inputClass}
                value={chapterFilter}
                disabled={!courseFilter}
                onChange={(e) => void handleFilterChapter(e.target.value)}
              >
                <option value="">Tất cả chương</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Bài học</span>
              <select
                className={inputClass}
                value={lessonFilter}
                disabled={!chapterFilter}
                onChange={(e) => setLessonFilter(e.target.value)}
              >
                <option value="">Tất cả bài học</option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Dạng câu hỏi</span>
              <select
                className={inputClass}
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
              >
                <option value="">Tất cả dạng câu hỏi</option>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Độ khó</span>
              <select
                className={inputClass}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="">Tất cả mức độ</option>
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </label>
            <label>
              <span className="label">Tìm kiếm</span>
              <input
                className={inputClass}
                placeholder="Tìm nội dung câu hỏi"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>

          <div className="mt-5 flex items-center justify-between border-y border-gray-100 py-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleVisible}
                className="accent-[#F7444E]"
              />
              Chọn tất cả mục đang hiển thị
            </label>
            <button
              type="button"
              onClick={addSelected}
              disabled={!selectedIds.length}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add selected ({selectedIds.length})
            </button>
          </div>

          <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {bankPaging.pageItems.map((question) => {
              const checked = selectedIds.includes(question.id);
              return (
                <label
                  key={question.id}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
                    checked
                      ? "border-[#F7444E]/40 bg-rose-50/60"
                      : "border-gray-100 bg-gray-50/40 hover:bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedIds((current) =>
                        checked
                          ? current.filter((id) => id !== question.id)
                          : [...current, question.id],
                      )
                    }
                    className="mt-1 accent-[#F7444E]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">
                      {question.content}
                    </span>
                    <QuestionMeta question={question} />
                  </span>
                  {checked && <Check className="h-4 w-4 text-[#F7444E]" />}
                </label>
              );
            })}

            {bankPaging.error && (
              <p role="alert" className="p-3 text-sm text-rose-700">
                {bankPaging.error}
              </p>
            )}
            {bankPaging.isLoading && (
              <p className="p-3 text-sm text-slate-500">Đang tải câu hỏi...</p>
            )}
            {!bankPaging.isLoading &&
              !bankPaging.error &&
              !filteredQuestions.length && (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                  Không có câu hỏi đã duyệt phù hợp với bộ lọc.
                </div>
              )}
          </div>

          {/* Phân trang ngân hàng câu hỏi */}
          <div className="mt-4">
            <Pagination
              page={bankPaging.page}
              pageSize={bankPaging.pageSize}
              totalItems={bankPaging.totalItems}
              onPageChange={bankPaging.setPage}
            />
          </div>
        </section>

        {/* Selected questions */}
        <section className="rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#F7444E]" />
                <h2 className="font-semibold text-gray-900">Câu hỏi đã chọn</h2>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Sắp xếp, chấm điểm hoặc xóa câu hỏi.
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {assignedQuestions.length}
              </p>
              <p className="text-xs text-gray-500">
                questions · {totalScore.toFixed(1)} points
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {assignedQuestions.map((item, index) => (
              <div
                key={item.question?.id || index}
                className="rounded-xl border border-gray-200 bg-white p-3"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-xs font-bold text-[#F7444E]">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.question?.content || "Untitled question"}
                    </p>
                    {item.question && <QuestionMeta question={item.question} />}
                    {item.question?.deleted_at && (
                      <p className="mt-1 inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        Đã xóa khỏi ngân hàng câu hỏi — vẫn được giữ trong đề
                        này cho đến khi bạn gỡ nó.
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      title="Di chuyển lên"
                      disabled={index === 0}
                      onClick={() => moveQuestion(index, -1)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Di chuyển xuống"
                      disabled={index === assignedQuestions.length - 1}
                      onClick={() => moveQuestion(index, 1)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Xóa câu hỏi"
                      onClick={() =>
                        setAssignedQuestions((current) =>
                          current.filter(
                            (c) => c.question.id !== item.question.id,
                          ),
                        )
                      }
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-[#F7444E]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <label className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs font-semibold text-gray-500">
                  Trọng số điểm
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={item.score_weight}
                    onChange={(e) =>
                      setAssignedQuestions((current) =>
                        current.map((c) =>
                          c.question.id === item.question.id
                            ? { ...c, score_weight: Number(e.target.value) }
                            : c,
                        ),
                      )
                    }
                    className="w-24 rounded-lg border border-gray-200 px-2.5 py-1.5 text-right text-sm font-semibold text-gray-800"
                  />
                </label>
              </div>
            ))}
            {!assignedQuestions.length && (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
                Thêm câu hỏi đã duyệt từ ngân hàng câu hỏi.
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .label {
          display: block;
          margin-bottom: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
