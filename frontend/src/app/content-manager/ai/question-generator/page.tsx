"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  changeQuestionOptions,
  completeSavedMapping,
  draftErrors,
  makeSaveSnapshot,
  resolveGeneratedSource,
} from "@/lib/ai-question-drafts";
import { ApiClientError, questionApi } from "@/lib/api";
import type {
  AiGeneratedQuestion,
  ChapterOption,
  CourseOption,
  DifficultyLevel,
  GenerateAiQuestionsRequest,
  LessonOption,
  QuestionOption,
  QuestionType,
  SaveAiDraftRequest,
} from "@/types/question";

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "Một đáp án",
  multiple_choice: "Nhiều đáp án",
  true_false: "Đúng / Sai",
  fill_in_blank: "Điền vào chỗ trống",
};
const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: "Dễ",
  medium: "Trung bình",
  hard: "Khó",
};
const inputClass =
  "h-10 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 outline-none transition focus:border-[#14919B] focus:ring-1 focus:ring-[#14919B] disabled:bg-gray-50 disabled:text-gray-400";
const textareaClass =
  "w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none transition focus:border-[#14919B] focus:ring-1 focus:ring-[#14919B]";
const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#df3c45] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

type DraftQuestion = AiGeneratedQuestion & {
  course_id: string;
  chapter_id: string;
  lesson_id: string;
};

function makeId() {
  return crypto.randomUUID();
}
function normalizeGeneratedQuestion(
  question: AiGeneratedQuestion,
  placement: { course_id: string; chapter_id?: string; lesson_id?: string },
): DraftQuestion {
  const source = resolveGeneratedSource(question, placement);
  if (!source) throw new ApiClientError('Đề xuất chưa có nguồn chương/bài học khớp phạm vi đã chọn để lưu.', 'AI_SOURCE_MISMATCH', 503);
  return {
    ...question,
    client_id: question.client_id || makeId(),
    ...source,
    options: question.options.map((option, index) => ({
      ...option,
      order_index: index,
    })),
  };
}
function getErrorMessage(error: unknown) {
  return error instanceof ApiClientError
    ? error.message
    : "Không thể hoàn tất yêu cầu. Vui lòng thử lại.";
}

export default function AIQuestionGeneratorPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [lessons, setLessons] = useState<LessonOption[]>([]);
  const [courseId, setCourseId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [questionType, setQuestionType] =
    useState<QuestionType>("single_choice");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [count, setCount] = useState(5);
  const [topic, setTopic] = useState("");
  const [instructions, setInstructions] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [warnings, setWarnings] = useState<
    Array<{ code: string; message: string }>
  >([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingSave, setPendingSave] = useState<SaveAiDraftRequest | null>(
    null,
  );
  const [saveConflict, setSaveConflict] = useState(false);
  const [savedLinks, setSavedLinks] = useState<
    Array<{ client_id: string; id: string }>
  >([]);
  const pendingRef = useRef<SaveAiDraftRequest | null>(null);
  const busyRef = useRef(false);
  const questionsRef = useRef(questions);
  const versions = useRef({ chapters: 0, lessons: 0, generation: 0 });
  const busy = isGenerating || savingId !== null || isSavingAll;
  const locked = busy || pendingSave !== null;
  const replaceQuestions = (
    next: DraftQuestion[] | ((current: DraftQuestion[]) => DraftQuestion[]),
  ) => {
    const value =
      typeof next === "function" ? next(questionsRef.current) : next;
    questionsRef.current = value;
    setQuestions(value);
  };
  const isLocked = () => busyRef.current || pendingRef.current !== null;
  const resetSource = () => {
    versions.current.chapters += 1;
    versions.current.lessons += 1;
    versions.current.generation += 1;
    setIsLoadingChapters(false);
    setIsLoadingLessons(false);
    setWarnings([]);
    setError("");
    setSuccess("");
  };
  useEffect(
    () => () => {
      versions.current.chapters += 1;
      versions.current.lessons += 1;
      versions.current.generation += 1;
    },
    [],
  );
  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (pendingRef.current || questionsRef.current.length) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const warnBeforeNavigation = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]");
      if (
        anchor &&
        (pendingRef.current || questionsRef.current.length) &&
        !window.confirm(
          pendingRef.current
            ? "Chưa xác định kết quả lưu. Hãy kiểm tra ngân hàng trước khi tạo thao tác mới. Rời trang sẽ mất thông tin retry. Tiếp tục?"
            : "Các đề xuất chưa lưu sẽ mất khi rời trang. Tiếp tục?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    document.addEventListener("click", warnBeforeNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeLeaving);
      document.removeEventListener("click", warnBeforeNavigation, true);
    };
  }, []);

  useEffect(() => {
    let active = true;
    questionApi
      .listCourses()
      .then((items) => {
        if (active) setCourses(items);
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setIsLoadingCourses(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedScopeTitle = useMemo(() => {
    if (lessonId) return lessons.find(lesson => lesson.id === lessonId)?.title ?? '';
    if (chapterId) return chapters.find(chapter => chapter.id === chapterId)?.title ?? '';
    return courses.find(course => course.id === courseId)?.title ?? '';
  }, [courseId, chapterId, lessonId, courses, chapters, lessons]);
  const confirmDiscard = () =>
    !questions.length ||
    window.confirm(
      "Các đề xuất chưa lưu sẽ mất khi đổi phạm vi nguồn. Bạn có muốn tiếp tục không?",
    );

  const handleCourseChange = async (nextCourseId: string) => {
    if (isLocked() || !confirmDiscard()) return;
    resetSource();
    setCourseId(nextCourseId);
    setChapterId("");
    setLessonId("");
    setChapters([]);
    setLessons([]);
    replaceQuestions([]);
    if (!nextCourseId) return;
    const version = versions.current.chapters;
    setIsLoadingChapters(true);
    try {
      const items = await questionApi.listChapters(nextCourseId);
      if (version === versions.current.chapters) setChapters(items);
    } catch (requestError) {
      if (version === versions.current.chapters)
        setError(getErrorMessage(requestError));
    } finally {
      if (version === versions.current.chapters) setIsLoadingChapters(false);
    }
  };
  const handleChapterChange = async (nextChapterId: string) => {
    if (isLocked() || !confirmDiscard()) return;
    versions.current.lessons += 1;
    versions.current.generation += 1;
    setChapterId(nextChapterId);
    setLessonId("");
    setLessons([]);
    replaceQuestions([]);
    setWarnings([]);
    setError("");
    setSuccess("");
    setIsLoadingLessons(false);
    if (!nextChapterId || !courseId) return;
    const version = versions.current.lessons;
    setIsLoadingLessons(true);
    try {
      const items = await questionApi.listLessons(courseId, nextChapterId);
      if (version === versions.current.lessons) setLessons(items);
    } catch (requestError) {
      if (version === versions.current.lessons)
        setError(getErrorMessage(requestError));
    } finally {
      if (version === versions.current.lessons) setIsLoadingLessons(false);
    }
  };
  const handleLessonChange = (nextLessonId: string) => {
    if (isLocked() || !confirmDiscard()) return;
    versions.current.generation += 1;
    setLessonId(nextLessonId);
    replaceQuestions([]);
    setWarnings([]);
    setSuccess("");
    setError("");
  };

  const handleGenerate = async () => {
    if (isLocked()) return;
    if (!courseId) {
      setError("Vui lòng chọn khóa học trước khi sinh câu hỏi.");
      return;
    }
    if (questionsRef.current.length + count > 10) {
      setError(
        "Tối đa 10 đề xuất chưa lưu. Hãy lưu hoặc bỏ bớt trước khi sinh thêm.",
      );
      return;
    }
    busyRef.current = true;
    const version = ++versions.current.generation;
    setIsGenerating(true);
    setError("");
    setSuccess("");
    try {
      const payload: GenerateAiQuestionsRequest = {
        course_id: courseId,
        chapter_id: chapterId || undefined,
        lesson_id: lessonId || undefined,
        question_type: questionType,
        difficulty,
        count,
        topic: topic.trim() || undefined,
        instructions: instructions.trim() || undefined,
      };
      const response = await questionApi.generateAiQuestions(payload);
      if (version !== versions.current.generation) return;
      if (
        (lessonId && response.source.lesson_id !== lessonId) ||
        (response.source.course_id && response.source.course_id !== courseId) ||
        (chapterId && response.source.chapter_id && response.source.chapter_id !== chapterId) ||
        response.questions.length !== count
      )
        throw new Error("Invalid generation response");
      const incoming = response.questions.map(question => normalizeGeneratedQuestion(question, {
        course_id: courseId, chapter_id: chapterId || undefined, lesson_id: lessonId || undefined,
      }));
      if (incoming.some(question => question.course_id !== courseId
        || (chapterId && question.chapter_id !== chapterId) || (lessonId && question.lesson_id !== lessonId))) {
        throw new ApiClientError('Nguồn câu hỏi không khớp phạm vi đã chọn. Vui lòng tạo lại.', 'AI_SOURCE_MISMATCH', 503);
      }
      replaceQuestions(current => [...current, ...incoming]);
      setWarnings(response.warnings ?? []);
      setSuccess(
        `Đã tạo ${response.questions.length} đề xuất theo phạm vi “${response.source.title}”.`,
      );
    } catch (requestError) {
      if (version === versions.current.generation)
        setError(getErrorMessage(requestError));
    } finally {
      if (version === versions.current.generation) {
        setIsGenerating(false);
        busyRef.current = false;
      }
    }
  };
  const updateQuestion = (clientId: string, update: Partial<DraftQuestion>) => {
    if (isLocked()) return;
    replaceQuestions((current) =>
      current.map((question) =>
        question.client_id === clientId ? { ...question, ...update } : question,
      ),
    );
  };
  const updateOption = (
    clientId: string,
    index: number,
    update: Partial<QuestionOption>,
  ) => {
    if (isLocked()) return;
    replaceQuestions((current) =>
      current.map((question) =>
        question.client_id !== clientId
          ? question
          : {
              ...question,
              options: question.options.map((option, optionIndex) =>
                optionIndex === index ? { ...option, ...update } : option,
              ),
            },
      ),
    );
  };
  const toggleCorrect = (question: DraftQuestion, index: number) => {
    if (question.question_type === "fill_in_blank") return;
    updateQuestion(question.client_id, {
      options: question.options.map((option, optionIndex) => ({
        ...option,
        is_correct:
          question.question_type === "multiple_choice"
            ? optionIndex === index
              ? !option.is_correct
              : option.is_correct
            : optionIndex === index,
      })),
    });
  };
  const handleTypeChange = (question: DraftQuestion, nextType: QuestionType) =>
    updateQuestion(question.client_id, {
      question_type: nextType,
      options: changeQuestionOptions(question.options, nextType),
    });
  const changeOptionCount = (question: DraftQuestion, removeIndex?: number) => {
    if (
      isLocked() ||
      !["single_choice", "multiple_choice"].includes(question.question_type)
    )
      return;
    const minimum = question.question_type === "multiple_choice" ? 3 : 2;
    if (removeIndex === undefined && question.options.length < 8)
      updateQuestion(question.client_id, {
        options: [
          ...question.options,
          {
            option_text: "",
            is_correct: false,
            order_index: question.options.length,
          },
        ],
      });
    else if (removeIndex !== undefined && question.options.length > minimum)
      updateQuestion(question.client_id, {
        options: question.options
          .filter((_, index) => index !== removeIndex)
          .map((option, order_index) => ({ ...option, order_index })),
      });
  };
  const handleRegenerate = async (question: DraftQuestion) => {
    if (isLocked()) return;
    busyRef.current = true;
    const version = ++versions.current.generation;
    const fingerprint = JSON.stringify(question);
    setSavingId(question.client_id);
    setError("");
    setSuccess("");
    try {
      const response = await questionApi.generateAiQuestions({
        course_id: question.course_id,
        chapter_id: question.chapter_id,
        lesson_id: question.lesson_id,
        question_type: question.question_type,
        difficulty: question.difficulty,
        count: 1,
        topic: topic.trim() || undefined,
        instructions: instructions.trim() || undefined,
        exclude_contents: questionsRef.current
          .slice(0, 5)
          .map((item) => item.content.slice(0, 1000)),
      });
      if (version !== versions.current.generation) return;
      if (
        response.source.lesson_id !== question.lesson_id ||
        response.questions.length !== 1
      )
        throw new Error("Invalid generation response");
      replaceQuestions((current) =>
        current.map((item) =>
          item.client_id === question.client_id &&
          JSON.stringify(item) === fingerprint
            ? normalizeGeneratedQuestion(
                { ...response.questions[0], client_id: question.client_id },
                {
                  course_id: question.course_id,
                  chapter_id: question.chapter_id,
                  lesson_id: question.lesson_id,
                },
              )
            : item,
        ),
      );
      setWarnings(response.warnings ?? []);
    } catch (requestError) {
      if (version === versions.current.generation)
        setError(getErrorMessage(requestError));
    } finally {
      if (version === versions.current.generation) {
        setSavingId(null);
        busyRef.current = false;
      }
    }
  };
  const saveQuestions = async (items: DraftQuestion[], retry = false) => {
    if (
      busyRef.current ||
      (pendingRef.current && !retry) ||
      (retry && saveConflict)
    )
      return;
    let snapshot = pendingRef.current;
    if (!retry) {
      if (!items.length || items.length > 10) return;
      const invalid = items
        .map((item, index) => ({ index, errors: draftErrors(item) }))
        .find((item) => item.errors.length);
      if (invalid) {
        setError(`Câu ${invalid.index + 1}: ${invalid.errors.join(" ")}`);
        return;
      }
      snapshot = makeSaveSnapshot(makeId(), items);
      pendingRef.current = snapshot;
      setPendingSave(snapshot);
      setSaveConflict(false);
    }
    if (!snapshot) return;
    busyRef.current = true;
    setIsSavingAll(snapshot.questions.length > 1);
    setSavingId(snapshot.questions[0].client_id);
    setError("");
    setSuccess("");
    try {
      const result = await questionApi.saveAiDrafts(snapshot);
      if (!completeSavedMapping(snapshot, result.saved))
        throw new Error("Incomplete saved mapping");
      const savedIds = new Set(
        snapshot.questions.map((question) => question.client_id),
      );
      replaceQuestions((current) =>
        current.filter((question) => !savedIds.has(question.client_id)),
      );
      setSavedLinks((current) => [...current, ...result.saved]);
      pendingRef.current = null;
      setPendingSave(null);
      setSuccess(
        `Đã lưu ${savedIds.size} câu thành bản nháp. Mở editor để kiểm tra và gửi duyệt.`,
      );
    } catch (requestError) {
      if (
        requestError instanceof ApiClientError &&
        [400, 401, 403, 404, 413, 422].includes(requestError.status)
      ) {
        pendingRef.current = null;
        setPendingSave(null);
        setError(getErrorMessage(requestError));
      } else if (
        requestError instanceof ApiClientError &&
        requestError.status === 409
      ) {
        setSaveConflict(true);
        setError(
          "Thao tác lưu bị xung đột. Hãy đối soát ngân hàng trước khi tải lại; không tạo batch mới để thử lại.",
        );
      } else
        setError(
          "Chưa xác định kết quả lưu. Bấm “Thử lưu lại” để gửi lại đúng thao tác cũ. Không tải lại trang hoặc tạo thao tác mới trước khi đối soát ngân hàng.",
        );
    } finally {
      busyRef.current = false;
      setSavingId(null);
      setIsSavingAll(false);
    }
  };
  const handleSaveOne = (question: DraftQuestion) => saveQuestions([question]);
  const handleSaveAll = () => saveQuestions(questionsRef.current);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="space-y-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#B6ECF0] bg-[#E6F7F8] px-2.5 py-1 text-xs font-semibold text-[#14919B]">
            <Sparkles className="h-3.5 w-3.5" />
            Có hỗ trợ trí tuệ nhân tạo
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Tạo câu hỏi bằng AI
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-500">
            AI chỉ tạo đề xuất từ nội dung bài học. Câu hỏi được lưu thành bản
            nháp và phải gửi duyệt riêng, không tự động xuất bản.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-3 text-xs font-medium text-gray-600 shadow-sm">
          <span className="rounded-2xl bg-[#EBF8FA] px-4 py-1.5 text-[#118A94]">
            Tạo đề xuất
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
          <span className="rounded-2xl bg-white px-4 py-1.5">Sửa / bỏ</span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
          <span className="rounded-2xl bg-white px-4 py-1.5">Lưu bản nháp</span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
          <span className="rounded-2xl bg-amber-50 px-4 py-1.5 text-amber-700">
            Gửi duyệt
          </span>
        </div>
      </header>
      {(error || success) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
          role="status"
        >
          {error || success}
        </div>
      )}
      {pendingSave && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            {busy
              ? "Đang lưu bản nháp..."
              : "Đang giữ thao tác lưu chưa rõ kết quả. Rời hoặc tải lại trang sẽ mất thông tin retry; cần kiểm tra ngân hàng trước khi tạo thao tác mới."}
          </p>
          {!saveConflict && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveQuestions([], true)}
              className={secondaryButton}
            >
              Thử lưu lại
            </button>
          )}
          <a href="/content-manager/questions/bank" className="ml-3 underline">
            Kiểm tra ngân hàng
          </a>
        </div>
      )}
      {savedLinks.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          {savedLinks.map((saved, index) => (
            <a
              key={saved.id}
              className="text-teal-700 underline"
              href={`/content-manager/questions/editor?id=${encodeURIComponent(saved.id)}`}
            >
              Mở câu đã lưu {index + 1}
            </a>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <fieldset
          disabled={locked}
          className="space-y-4 rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-5 shadow-sm lg:col-span-4"
        >
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Thiết lập nội dung
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Chọn khóa học; chọn thêm chương hoặc bài học để thu hẹp phạm vi.
            </p>
          </div>
          <label className="block text-xs font-semibold text-gray-700">
            Khóa học
            <select
              value={courseId}
              onChange={(event) => void handleCourseChange(event.target.value)}
              disabled={isLoadingCourses}
              className={`mt-1.5 ${inputClass}`}
            >
              <option value="">
                {isLoadingCourses ? "Đang tải..." : "Chọn khóa học"}
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-gray-700">
            Chương (tùy chọn)
            <div className="relative mt-1.5">
              <select
                value={chapterId}
                onChange={(event) =>
                  void handleChapterChange(event.target.value)
                }
                disabled={!courseId || isLoadingChapters}
                className={inputClass}
              >
                <option value="">
                  {isLoadingChapters ? "Đang tải..." : "Tất cả chương trong khóa học"}
                </option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="block text-xs font-semibold text-gray-700">
            Bài học (tùy chọn)
            <div className="relative mt-1.5">
              <select
                value={lessonId}
                onChange={(event) => handleLessonChange(event.target.value)}
                disabled={!chapterId || isLoadingLessons}
                className={inputClass}
              >
                <option value="">
                  {isLoadingLessons ? "Đang tải..." : chapterId ? "Tất cả bài học trong chương" : "Chọn chương để thu hẹp theo bài"}
                </option>
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-gray-700">
              Dạng câu
              <select
                value={questionType}
                onChange={(event) =>
                  setQuestionType(event.target.value as QuestionType)
                }
                className={`mt-1.5 ${inputClass}`}
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-700">
              Độ khó
              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as DifficultyLevel)
                }
                className={`mt-1.5 ${inputClass}`}
              >
                {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs font-semibold text-gray-700">
            Số lượng
            <input
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(event) =>
                setCount(
                  Math.min(10, Math.max(1, Number(event.target.value) || 1)),
                )
              }
              className={`mt-1.5 ${inputClass}`}
            />
          </label>
          <label className="block text-xs font-semibold text-gray-700">
            Chủ đề (không bắt buộc)
            <input
              maxLength={300}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className={`mt-1.5 ${inputClass}`}
              placeholder="Ví dụ: interface và abstract class"
            />
          </label>
          <label className="block text-xs font-semibold text-gray-700">
            Hướng dẫn bổ sung
            <textarea
              maxLength={2000}
              rows={4}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              className={`mt-1.5 ${textareaClass}`}
              placeholder="Yêu cầu cách diễn đạt hoặc ví dụ code..."
            />
          </label>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={locked || !courseId || questions.length + count > 10}
            className={`w-full ${primaryButton}`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Tạo câu hỏi
              </>
            )}
          </button>
          {selectedScopeTitle && (
            <p className="rounded-xl border border-teal-100 bg-teal-50/60 px-3 py-2 text-xs text-teal-800">
              Phạm vi hiện tại: {selectedScopeTitle}
            </p>
          )}
        </fieldset>
        <section className="space-y-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Đề xuất chưa lưu{" "}
                <span className="text-gray-400">({questions.length})</span>
              </h2>
              <p className="text-xs text-gray-500">
                Tối đa 10 đề xuất chưa lưu. Bỏ đề xuất chỉ thay đổi màn hình
                hiện tại; tải lại trang sẽ không khôi phục đề xuất chưa lưu.
              </p>
            </div>
            {questions.length > 0 && (
              <button
                type="button"
                onClick={() => void handleSaveAll()}
                disabled={locked}
                className={primaryButton}
              >
                {isSavingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {isSavingAll ? "Đang lưu..." : "Lưu tất cả bản nháp"}
              </button>
            )}
          </div>
          {warnings.length > 0 && (
            <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              {warnings.map((warning) => (
                <p key={`${warning.code}-${warning.message}`}>
                  • {warning.message}
                </p>
              ))}
            </div>
          )}
          {questions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
              <Sparkles className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm font-semibold text-gray-700">
                Chưa có đề xuất
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Chọn bài học rồi bấm “Tạo câu hỏi”.
              </p>
            </div>
          ) : (
            questions.map((question, index) => (
              <fieldset
                disabled={locked}
                key={question.client_id}
                className="space-y-4 rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                      <Sparkles className="h-3 w-3" />
                      AI đề xuất
                    </span>
                    <span className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600">
                      {TYPE_LABELS[question.question_type]}
                    </span>
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                      {DIFFICULTY_LABELS[question.difficulty]}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">Câu {index + 1}</span>
                </div>
                {(question.chapter_title || question.lesson_title) && <p className="text-xs text-teal-800">Nguồn câu hỏi: {[question.chapter_title, question.lesson_title].filter(Boolean).join(' / ')}</p>}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    value={question.question_type}
                    onChange={(event) =>
                      handleTypeChange(
                        question,
                        event.target.value as QuestionType,
                      )
                    }
                    className={inputClass}
                  >
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={question.difficulty}
                    onChange={(event) =>
                      updateQuestion(question.client_id, {
                        difficulty: event.target.value as DifficultyLevel,
                      })
                    }
                    className={inputClass}
                  >
                    {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  aria-label="Đề bài"
                  maxLength={5000}
                  rows={3}
                  value={question.content}
                  onChange={(event) =>
                    updateQuestion(question.client_id, {
                      content: event.target.value,
                    })
                  }
                  className={textareaClass}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {question.question_type === "fill_in_blank"
                      ? "Đáp án chuẩn"
                      : "Phương án trả lời"}
                  </p>
                  <span className="text-xs text-gray-400">
                    {question.options.length}/8
                  </span>
                </div>
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={`${question.client_id}-${optionIndex}`}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 ${option.is_correct ? "border-emerald-300 bg-emerald-50/70" : "border-gray-200 bg-white"}`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-bold text-gray-500">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <input
                        aria-label={`Đáp án ${optionIndex + 1}`}
                        maxLength={1000}
                        readOnly={question.question_type === "true_false"}
                        value={option.option_text}
                        onChange={(event) =>
                          updateOption(question.client_id, optionIndex, {
                            option_text: event.target.value,
                          })
                        }
                        className="min-w-0 flex-1 bg-transparent px-1 text-sm text-gray-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => toggleCorrect(question, optionIndex)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${option.is_correct ? "bg-emerald-600 text-white" : "border border-gray-200 bg-white text-gray-500"}`}
                      >
                        {question.question_type === "fill_in_blank"
                          ? "Đáp án chuẩn"
                          : option.is_correct
                            ? "Đúng"
                            : "Đánh dấu đúng"}
                      </button>
                      {["single_choice", "multiple_choice"].includes(
                        question.question_type,
                      ) && (
                        <button
                          type="button"
                          aria-label={`Xóa đáp án ${optionIndex + 1}`}
                          disabled={
                            locked ||
                            question.options.length <=
                              (question.question_type === "multiple_choice"
                                ? 3
                                : 2)
                          }
                          onClick={() =>
                            changeOptionCount(question, optionIndex)
                          }
                          className={secondaryButton}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {["single_choice", "multiple_choice"].includes(
                  question.question_type,
                ) && (
                  <button
                    type="button"
                    disabled={locked || question.options.length >= 8}
                    onClick={() => changeOptionCount(question)}
                    className={secondaryButton}
                  >
                    Thêm đáp án
                  </button>
                )}
                {draftErrors(question).length > 0 && (
                  <p className="text-xs text-amber-700" role="status">
                    {draftErrors(question).join(" ")}
                  </p>
                )}
                <textarea
                  aria-label="Giải thích"
                  maxLength={5000}
                  rows={2}
                  value={question.explanation}
                  onChange={(event) =>
                    updateQuestion(question.client_id, {
                      explanation: event.target.value,
                    })
                  }
                  className={textareaClass}
                  placeholder="Giải thích đáp án..."
                />
                <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() =>
                      !isLocked() &&
                      replaceQuestions((current) =>
                        current.filter(
                          (item) => item.client_id !== question.client_id,
                        ),
                      )
                    }
                    disabled={locked}
                    className={secondaryButton}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    Bỏ đề xuất
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRegenerate(question)}
                    disabled={locked}
                    className={secondaryButton}
                  >
                    {savingId === question.client_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Tạo lại
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveOne(question)}
                    disabled={locked}
                    className={primaryButton}
                  >
                    {savingId === question.client_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Lưu bản nháp
                  </button>
                </div>
              </fieldset>
            ))
          )}
          {questions.length === 0 && success.includes("bản nháp") && (
            <button
              type="button"
              onClick={() => router.push("/content-manager/questions/bank")}
              className={secondaryButton}
            >
              Mở ngân hàng câu hỏi
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
