"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Clock3, CheckCircle2, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { ApiClientError, quizApi } from "@/lib/api";
import type {
  QuizAttempt,
  QuizAttemptQuestion,
  QuizAnswerSubmission,
  QuizData,
} from "@/types/quiz";
import type { DifficultyLevel, QuestionType } from "@/types/question";
import { vietnameseDifficulty } from "@/lib/ui-labels";
import { useTutorContext } from "@/contexts/tutor-context";

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

function DifficultyBadge({ difficulty }: { difficulty?: DifficultyLevel }) {
  const level = difficulty || "medium";
  return (
    <span
      className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${DIFFICULTY_STYLES[level]}`}
    >
      {vietnameseDifficulty(level)}
    </span>
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError ? error.message : fallback;
}

type StartedAttempt = QuizAttempt & { questions: QuizAttemptQuestion[] };

const draftKey = (attemptId: string) => `quiz_draft_${attemptId}`;

function readDraft(attemptId: string): Record<string, QuizAnswerSubmission> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(sessionStorage.getItem(draftKey(attemptId)) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function clearDraft(attemptId: string) {
  if (typeof window !== "undefined") sessionStorage.removeItem(draftKey(attemptId));
}

/** Số giây còn lại theo hạn nộp của máy chủ (đã bù lệch giờ máy người học). */
function secondsUntil(deadlineMs: number | null, clockOffsetMs: number) {
  if (deadlineMs === null) return null;
  return Math.max(0, Math.ceil((deadlineMs - (Date.now() + clockOffsetMs)) / 1000));
}

// Dùng chung một yêu cầu bắt đầu khi React mount hai lần (strict mode).
const attemptPromises: Record<string, Promise<StartedAttempt>> = {};

export default function CourseTestTakePage() {
  const params = useParams<{ slug: string; testId: string }>();
  const slug = String(params?.slug ?? "");
  const testId = String(params?.testId ?? "");
  const router = useRouter();

  const { setTutorContext } = useTutorContext();

  const [attempt, setAttempt] = useState<StartedAttempt | null>(null);
  const [quizDetails, setQuizDetails] = useState<QuizData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswerSubmission>>(
    {},
  );
  const [deadline, setDeadline] = useState<{ deadlineMs: number | null; offsetMs: number }>({
    deadlineMs: null,
    offsetMs: 0,
  });
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const submitting = useRef(false);
  const autoSubmitted = useRef(false);
  const answersRef = useRef(answers);
  const tutorQuestion = attempt?.questions[currentIndex];

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (!slug || !tutorQuestion) {
      setTutorContext(null);
      return;
    }

    setTutorContext({
      mode: "quiz",
      courseSlug: slug,
      quizId: testId,
      questionId: tutorQuestion.question_id,
      questionText: [
        tutorQuestion.content,
        ...tutorQuestion.options.map((option) => option.option_text),
      ].join("\n").slice(0, 8000),
      ...(quizDetails?.chapter_id ? { chapterId: quizDetails.chapter_id } : {}),
    });

    return () => {
      setTutorContext(null);
    };
  }, [slug, testId, tutorQuestion, quizDetails?.chapter_id, setTutorContext]);

  // Chỉ bắt đầu làm bài khi máy chủ tạo (hoặc trả lại) được một lượt làm hợp lệ.
  useEffect(() => {
    if (!testId) return;

    let isMounted = true;

    async function initializeQuiz() {
      try {
        const quizData = await quizApi.getById(testId).catch(() => null);
        if (!attemptPromises[testId]) {
          attemptPromises[testId] = quizApi.startAttempt(testId);
        }
        const requestedAt = Date.now();
        const startedAttempt = await attemptPromises[testId];
        const receivedAt = Date.now();
        if (!isMounted) return;

        const serverNow = startedAttempt.server_now ? Date.parse(startedAttempt.server_now) : NaN;
        const offsetMs = Number.isFinite(serverNow)
          ? serverNow - Math.round((requestedAt + receivedAt) / 2)
          : 0;
        const deadlineMs = startedAttempt.expires_at ? Date.parse(startedAttempt.expires_at) : null;

        setAttempt(startedAttempt);
        setQuizDetails(quizData);
        setAnswers(readDraft(startedAttempt.attempt_id));
        setDeadline({ deadlineMs, offsetMs });
        setTimeLeft(secondsUntil(deadlineMs, offsetMs));
      } catch (err: unknown) {
        delete attemptPromises[testId];
        if (isMounted) {
          setLoadError(errorMessage(err, "Không thể bắt đầu bài kiểm tra."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeQuiz();

    return () => {
      isMounted = false;
    };
  }, [testId, reloadKey]);

  // Lưu nháp theo lượt làm để tải lại trang không mất câu trả lời (không dùng cho kết quả).
  useEffect(() => {
    if (!attempt || typeof window === "undefined") return;
    sessionStorage.setItem(draftKey(attempt.attempt_id), JSON.stringify(answers));
  }, [answers, attempt]);

  // Đồng hồ tính lại từ hạn nộp mỗi giây, nên mở lại trang không được cộng thêm giờ.
  useEffect(() => {
    if (deadline.deadlineMs === null) return;
    const timer = window.setInterval(() => {
      setTimeLeft(secondsUntil(deadline.deadlineMs, deadline.offsetMs));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const handleSubmitQuiz = async () => {
    if (!attempt || submitting.current || isExpired) return;
    submitting.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await quizApi.submitAttempt({
        attempt_id: attempt.attempt_id,
        answers: Object.values(answersRef.current),
      });
      clearDraft(attempt.attempt_id);
      delete attemptPromises[testId];
      router.replace(
        `/learner/courses/${slug}/tests/${testId}/results?attemptId=${encodeURIComponent(result.attempt_id)}`,
      );
    } catch (err) {
      submitting.current = false;
      setIsSubmitting(false);
      if (err instanceof ApiClientError && err.code === "QUIZ_ATTEMPT_EXPIRED") {
        clearDraft(attempt.attempt_id);
        delete attemptPromises[testId];
        setIsExpired(true);
        return;
      }
      setSubmitError(
        errorMessage(err, "Chưa lưu được bài nộp. Câu trả lời của bạn vẫn được giữ nguyên."),
      );
    }
  };

  // Hết giờ thì tự nộp các câu đã trả lời một lần; nếu lỗi, người học bấm Thử nộp lại.
  const submitRef = useRef(handleSubmitQuiz);
  useEffect(() => {
    submitRef.current = handleSubmitQuiz;
  });
  useEffect(() => {
    if (timeLeft === 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void submitRef.current();
    }
  }, [timeLeft]);

  const handleSelectOption = (
    questionId: string,
    optionId: string,
    isMultiple: boolean,
  ) => {
    if (timeLeft === 0 || isSubmitting) return;
    setAnswers((prev) => {
      const currentAnswer = prev[questionId];
      const selected = currentAnswer?.selected_option_ids ?? [];

      let nextSelected: string[];
      if (isMultiple) {
        nextSelected = selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId];
      } else {
        nextSelected = [optionId];
      }

      return {
        ...prev,
        [questionId]: {
          question_id: questionId,
          selected_option_ids: nextSelected,
        },
      };
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Đang chuẩn bị câu hỏi...
        </p>
      </div>
    );
  }

  if (loadError || !attempt) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold text-rose-700">
          Không bắt đầu được bài kiểm tra
        </h2>
        <p className="mt-2 text-sm text-rose-600">
          {loadError || "Máy chủ chưa tạo được lượt làm bài."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setLoadError(null);
              setReloadKey((key) => key + 1);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c93f3a]"
          >
            <RotateCcw className="h-4 w-4" /> Thử lại
          </button>
          <Link
            href={`/learner/courses/${slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại khóa học
          </Link>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold text-amber-800">Đã quá hạn nộp bài</h2>
        <p className="mt-2 text-sm text-amber-700">
          Lượt làm này đã hết giờ nên bài nộp không được ghi nhận. Bạn có thể làm lại bài kiểm tra.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/learner/courses/${slug}/tests/${testId}/results?attemptId=${encodeURIComponent(attempt.attempt_id)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c93f3a]"
          >
            Xem kết quả
          </Link>
          <Link
            href={`/learner/courses/${slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại khóa học
          </Link>
        </div>
      </div>
    );
  }

  if (!attempt.questions || attempt.questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold text-rose-700">
          Không có câu hỏi nào
        </h2>
        <p className="mt-2 text-sm text-rose-600">
          Bài kiểm tra này chưa có câu hỏi.
        </p>
        <Link
          href={`/learner/courses/${slug}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c93f3a]"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại khóa học
        </Link>
      </div>
    );
  }

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "Không giới hạn";
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const currentQ = attempt.questions[currentIndex];
  const currentSelected =
    answers[currentQ?.question_id]?.selected_option_ids || [];
  const isMultiple = currentQ?.question_type === "multiple_choice";

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12 pt-4">
      {/* Header Navigation & Progress */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/learner/courses/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Thoát bài kiểm tra
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
            {quizDetails?.title || attempt.quiz_title || "Quiz Assessment"}
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#F7444E]" />
          Answered: {Object.keys(answers).length} / {attempt.questions.length}{" "}
          questions
        </div>
      </div>

      {submitError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <span>
            <span className="font-semibold">Chưa nộp được bài.</span> {submitError}
          </span>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleSubmitQuiz()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F7444E] px-4 py-2 text-xs font-bold text-white hover:bg-[#c93f3a] disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Thử nộp lại
          </button>
        </div>
      )}

      {timeLeft === 0 && !submitError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Hết giờ — đang nộp các câu đã trả lời...
        </div>
      )}

      {/* QUESTION CARD */}
      <article className="relative flex flex-col justify-between rounded-3xl border border-gray-200/80 bg-[#FFFAFC]/50 p-6 sm:p-8 shadow-sm transition">
        <div>
          {/* Card Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F7444E]/10 text-xs font-bold text-[#F7444E]">
                {currentIndex + 1}
              </span>
              <DifficultyBadge difficulty={currentQ?.difficulty} />
              <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-slate-500">
                {TYPE_LABELS[currentQ.question_type as QuestionType] ||
                  currentQ.question_type}
              </span>
            </div>

            {/* Countdown Timer (ẩn khi đề không giới hạn thời gian) */}
            {timeLeft !== null && (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-rose-50/80 px-3 py-1 text-xs font-bold text-[#F7444E] shadow-sm">
                <Clock3 className="h-3.5 w-3.5 animate-pulse" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>

          {/* Question Text */}
          <p className="my-5 text-lg font-bold leading-relaxed text-slate-900">
            {currentQ.content}
          </p>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map((option, oIndex) => {
              const isPicked = currentSelected.includes(option.id);

              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() =>
                    handleSelectOption(
                      currentQ.question_id,
                      option.id,
                      isMultiple,
                    )
                  }
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left text-sm transition-all ${
                    isPicked
                      ? "border-[#F7444E] bg-rose-50/70 font-semibold text-[#0f3741] shadow-sm"
                      : "border-gray-200/80 bg-white text-slate-700 hover:border-gray-300 hover:bg-gray-50/60"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                      isPicked
                        ? "border-[#F7444E] bg-[#F7444E] text-white"
                        : "border-gray-300 bg-gray-100 text-slate-600"
                    }`}
                  >
                    {String.fromCharCode(65 + oIndex)}
                  </span>
                  <span className="flex-1 break-words">
                    {option.option_text}
                  </span>
                  {isPicked && (
                    <CheckCircle2 className="h-4 w-4 text-[#F7444E]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Buttons: Previous / Next / Submit */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-5">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((idx) => idx - 1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Trước đó
          </button>

          <div className="flex items-center gap-3">
            {currentIndex === attempt.questions.length - 1 ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSubmitQuiz()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#c93f3a] disabled:opacity-50"
              >
                {isSubmitting ? "Đang gửi..." : "Submit Quiz"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentIndex((idx) => idx + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F7444E] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c93f3a]"
              >
                Câu hỏi tiếp theo <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Question Number Dots / Navigator */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {attempt.questions.map((q, idx) => {
            const hasAnswered =
              (answers[q.question_id]?.selected_option_ids?.length ?? 0) > 0;
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={q.question_id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                  isCurrent
                    ? "border-2 border-[#F7444E] bg-white text-[#F7444E]"
                    : hasAnswered
                      ? "bg-rose-100 text-[#F7444E]"
                      : "bg-gray-100 text-slate-500 hover:bg-gray-200"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
