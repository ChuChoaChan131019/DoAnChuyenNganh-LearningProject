'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Clock3, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { ApiClientError, quizApi } from '@/lib/api';
import type { QuizAttempt, QuizAttemptQuestion, QuizAnswerSubmission } from '@/types/quiz';
import type { DifficultyLevel, QuestionType } from '@/types/question';

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  fill_in_blank: 'Fill in the Blank',
};

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
  hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
};

function DifficultyBadge({ difficulty }: { difficulty?: DifficultyLevel }) {
  const level = difficulty || 'medium';
  return (
    <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${DIFFICULTY_STYLES[level]}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function errorMessage(error: unknown) {
  return error instanceof ApiClientError ? error.message : 'Unable to initialize the quiz.';
}

const attemptPromises: Record<string, Promise<any>> = {};
export default function CourseTestTakePage() {
  const params = useParams<{ slug: string; testId: string }>();
  const slug = String(params?.slug ?? '');
  const testId = String(params?.testId ?? '');
  const router = useRouter();

  const [attempt, setAttempt] = useState<(QuizAttempt & { questions: QuizAttemptQuestion[] }) | null>(null);
  const [quizDetails, setQuizDetails] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswerSubmission>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitted = useRef(false);

  useEffect(() => {
    if (!testId) return;

    if (typeof window !== 'undefined') {
      localStorage.setItem(`quiz_start_time_${testId}`, String(Date.now()));
    }

    let isMounted = true;
    setIsLoading(true);

    async function initializeQuiz() {
      try {
        const quizData = await quizApi.getById(testId).catch(() => null);

        let startedAttempt: any = null;
        try {
          // Nếu đã có request startAttempt đang chạy cho testId này, tái sử dụng luôn promise đó
          if (!attemptPromises[testId]) {
            attemptPromises[testId] = quizApi.startAttempt(testId);
          }
          startedAttempt = await attemptPromises[testId];
        } catch (attemptErr: any) {
          // Xóa cache nếu lỗi để lần sau có thể thử lại
          delete attemptPromises[testId];
          console.warn('Attempt start warning (falling back to direct questions):', attemptErr);
          const fallbackQuestions = await quizApi.getQuestions(testId).catch(() => []);

          startedAttempt = {
            attempt_id: 'current-attempt',
            quiz_id: testId,
            quiz_title: quizData?.title || 'Quiz Assessment',
            duration_minutes: quizData?.duration_minutes ?? 15,
            questions: (fallbackQuestions || []).map((item: any) => {
              const q = item.questions || item;
              return {
                question_id: String(item.question_id || q.id),
                content: q.content || 'Question',
                question_type: (q.question_type || 'single_choice') as QuestionType,
                difficulty: (q.difficulty || 'medium') as DifficultyLevel,
                options: (q.options || q.question_options || []).map((o: any, idx: number) => ({
                  id: String(o.id || idx),
                  option_text: o.option_text || o.content || '',
                })),
              };
            }),
          };
        }

        if (!isMounted) return;

        setAttempt(startedAttempt);
        setQuizDetails(quizData);

        const duration = quizData?.duration_minutes ?? (startedAttempt as any)?.duration_minutes ?? 15;
        setTimeLeft(duration !== null ? duration * 60 : null);
      } catch (err: any) {
        if (isMounted) {
          setError(errorMessage(err));
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
  }, [testId]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current === null) return null;
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && !submitted.current) {
      void handleSubmitQuiz();
    }
  }, [timeLeft]);

  const handleSelectOption = (questionId: string, optionId: string, isMultiple: boolean) => {
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

  const handleSubmitQuiz = async () => {
    if (!attempt || submitted.current || isSubmitting) return;
    submitted.current = true;
    setIsSubmitting(true);

    try {
      const answersPayload = Object.values(answers);

      let timeSpentSeconds = 0;
      if (typeof window !== 'undefined') {
        const startTimeStr = localStorage.getItem(`quiz_start_time_${testId}`);
        if (startTimeStr) {
          const startTime = Number(startTimeStr);
          timeSpentSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        } else {
          const totalSeconds = ((quizDetails?.duration_minutes ?? (attempt as any)?.duration_minutes ?? 15) as number) * 60;
          timeSpentSeconds = Math.max(0, totalSeconds - (timeLeft ?? totalSeconds));
        }

        localStorage.setItem(`quiz_answers_${testId}`, JSON.stringify(answers));
        localStorage.setItem(`quiz_time_spent_${testId}`, String(timeSpentSeconds));
      }

      try {
        await quizApi.submitAttempt({
          attempt_id: attempt.attempt_id,
          answers: answersPayload,
        });
      } catch (submitApiError) {
        console.warn('Backend submit error fallback:', submitApiError);
      }

      delete attemptPromises[testId]; 
      router.push(`/learner/courses/${slug}/tests/${testId}/results`);
    } catch (err) {
      submitted.current = false;
      setError(errorMessage(err));
      setIsSubmitting(false);
    }
  };

  if (isLoading || !attempt) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">Initializing quiz questions...</p>
      </div>
    );
  }

  if (error || !attempt.questions || attempt.questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold text-rose-700">No questions available</h2>
        <p className="mt-2 text-sm text-rose-600">{error || 'This quiz does not have any questions assigned yet.'}</p>
        <Link
          href={`/learner/courses/${slug}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c93f3a]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>
      </div>
    );
  }

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return 'Unlimited';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const currentQ = attempt.questions[currentIndex];
  const currentSelected = answers[currentQ?.question_id]?.selected_option_ids || [];
  const isMultiple = currentQ?.question_type === 'multiple_choice';

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12 pt-4">
      {/* Header Navigation & Progress */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/learner/courses/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Exit test
          </Link>
          <h1 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
            {quizDetails?.title || attempt.quiz_title || 'Quiz Assessment'}
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#F7444E]" />
          Answered: {Object.keys(answers).length} / {attempt.questions.length} questions
        </div>
      </div>

      {/* QUESTION CARD */}
      <article className="relative flex flex-col justify-between rounded-3xl border border-gray-200/80 bg-[#FFFAFC]/50 p-6 sm:p-8 shadow-sm transition">
        <div>
          {/* Card Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F7444E]/10 text-xs font-bold text-[#F7444E]">
                {currentIndex + 1}
              </span>
              <DifficultyBadge difficulty={(currentQ as any)?.difficulty} />
              <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-slate-500">
                {TYPE_LABELS[currentQ.question_type as QuestionType] || currentQ.question_type}
              </span>
            </div>

            {/* Countdown Timer */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-rose-50/80 px-3 py-1 text-xs font-bold text-[#F7444E] shadow-sm">
              <Clock3 className="h-3.5 w-3.5 animate-pulse" />
              <span>{formatTime(timeLeft)}</span>
            </div>
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
                  onClick={() => handleSelectOption(currentQ.question_id, option.id, isMultiple)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left text-sm transition-all ${
                    isPicked
                      ? 'border-[#F7444E] bg-rose-50/70 font-semibold text-[#0f3741] shadow-sm'
                      : 'border-gray-200/80 bg-white text-slate-700 hover:border-gray-300 hover:bg-gray-50/60'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                      isPicked
                        ? 'border-[#F7444E] bg-[#F7444E] text-white'
                        : 'border-gray-300 bg-gray-100 text-slate-600'
                    }`}
                  >
                    {String.fromCharCode(65 + oIndex)}
                  </span>
                  <span className="flex-1 break-words">{option.option_text}</span>
                  {isPicked && <CheckCircle2 className="h-4 w-4 text-[#F7444E]" />}
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
            <ArrowLeft className="h-3.5 w-3.5" /> Previous
          </button>

          <div className="flex items-center gap-3">
            {currentIndex === attempt.questions.length - 1 ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSubmitQuiz()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#c93f3a] disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentIndex((idx) => idx + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F7444E] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c93f3a]"
              >
                Next question <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Question Number Dots / Navigator */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {attempt.questions.map((q, idx) => {
            const hasAnswered = (answers[q.question_id]?.selected_option_ids?.length ?? 0) > 0;
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={q.question_id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                  isCurrent
                    ? 'border-2 border-[#F7444E] bg-white text-[#F7444E]'
                    : hasAnswered
                    ? 'bg-rose-100 text-[#F7444E]'
                    : 'bg-gray-100 text-slate-500 hover:bg-gray-200'
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