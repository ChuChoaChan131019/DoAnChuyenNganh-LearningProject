'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Check,
  X,
  Clock,
  Target,
  TimerReset,
} from 'lucide-react';
import { ApiClientError, quizApi } from '@/lib/api';
import type { QuizItem, QuizResultResponse } from '@/types/quiz';

function errorMessage(error: unknown) {
  return error instanceof ApiClientError ? error.message : 'Unable to load test results.';
}

type QuestionFilter = 'all' | 'incorrect' | 'correct';

export default function CourseTestResultsPage() {
  const params = useParams<{ slug: string; testId: string }>();
  const slug = String(params?.slug ?? '');
  const testId = String(params?.testId ?? '');

  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [result, setResult] = useState<QuizResultResponse | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, { selected_option_ids: string[] }>>({});
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<QuestionFilter>('all');

  useEffect(() => {
    if (!testId) return;

    if (typeof window !== 'undefined') {
      const savedAnswers = localStorage.getItem(`quiz_answers_${testId}`) || sessionStorage.getItem(`quiz_answers_${testId}`);
      if (savedAnswers) {
        try {
          setUserAnswers(JSON.parse(savedAnswers));
        } catch (e) {
          console.warn('Error parsing answers:', e);
        }
      }

      const savedTimeSpent = localStorage.getItem(`quiz_time_spent_${testId}`);
      if (savedTimeSpent !== null && savedTimeSpent !== '') {
        setTimeSpentSeconds(Number(savedTimeSpent));
      }
    }

    Promise.all([
      quizApi.getById(testId).catch(() => null),
      quizApi.latestResult(testId).catch(() => null),
      quizApi.getQuestions(testId).catch(() => []),
    ])
      .then(([loadedQuiz, loadedResult, loadedQuestions]) => {
        setQuiz(loadedQuiz);
        setResult(loadedResult);
        setQuestions(loadedQuestions || []);
      })
      .catch((loadError) => setError(errorMessage(loadError)))
      .finally(() => setIsLoading(false));
  }, [testId]);

  const evaluatedQuestions = useMemo(() => {
    return questions.map((item: any, qIdx: number) => {
      const q = item.questions || item;
      const qId = String(item.question_id || q.id);
      const userSelectedIds = userAnswers[qId]?.selected_option_ids || [];
      const optionsList = q.options || q.question_options || [];

      const correctOptionIds = optionsList
        .filter((opt: any) => opt.is_correct === true)
        .map((opt: any) => String(opt.id));

      const isCorrect =
        correctOptionIds.length > 0 &&
        correctOptionIds.length === userSelectedIds.length &&
        correctOptionIds.every((id: string) => userSelectedIds.includes(id));

      return {
        originalIndex: qIdx,
        qId,
        question: q,
        options: optionsList,
        userSelectedIds,
        correctOptionIds,
        isCorrect,
      };
    });
  }, [questions, userAnswers]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">Loading test results...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-rose-800">Test not found</h1>
        <Link
          href={`/learner/courses/${slug}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c93f3a] transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>
      </div>
    );
  }

  const totalQuestions = evaluatedQuestions.length;
  const correctCount = evaluatedQuestions.filter((q) => q.isCorrect).length;
  const incorrectCount = totalQuestions - correctCount;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passScore = Number((quiz as any).pass_percentage ?? quiz.pass_score ?? 50);
  const isPassed = percentage >= passScore;

  const filteredQuestions = evaluatedQuestions.filter((item) => {
    if (activeFilter === 'correct') return item.isCorrect;
    if (activeFilter === 'incorrect') return !item.isCorrect;
    return true;
  });

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const formatDuration = (totalSec: number | null) => {
    if (totalSec === null || isNaN(totalSec)) return '00:00';
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Score Summary Card */}
      <div className="rounded-3xl border border-[#dfe6df] bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-black text-[#0f3741]">{quiz.title}</h1>

        {/* Metadata: Passing Requirement • Duration Limit • Time Spent */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Target className="h-4 w-4 text-[#F7444E]" />
            Passing requirement: {passScore}%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            Duration limit: {quiz.duration_minutes ? `${quiz.duration_minutes} mins` : 'Unlimited'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
            <TimerReset className="h-3.5 w-3.5 text-[#F7444E]" />
            Time spent: {formatDuration(timeSpentSeconds)}
          </span>
        </div>

        {/* Hàng chứa: Vòng tròn % và 3 ô thống kê */}
        <div className="mx-auto my-7 flex max-w-2xl flex-wrap items-center justify-center gap-6 sm:flex-nowrap sm:justify-between border-y border-gray-100 py-6">
          {/* Circular Gauge */}
          <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="text-slate-100"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                className={`transition-all duration-1000 ease-out ${
                  isPassed ? 'text-emerald-500' : 'text-[#F7444E]'
                }`}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black tracking-tight text-[#0f3741]">{percentage}%</span>
              <span
                className={`mt-0.5 text-[11px] font-black uppercase tracking-wider ${
                  isPassed ? 'text-emerald-600' : 'text-[#F7444E]'
                }`}
              >
                {isPassed ? 'Passed' : 'Failed'}
              </span>
            </div>
          </div>

          {/* 3 Thẻ: Correct | Incorrect | Total */}
          <div className="grid flex-1 grid-cols-3 gap-3">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100/80 bg-emerald-50/50 p-4 shadow-sm">
              <span className="text-2xl font-black text-emerald-600">{correctCount}</span>
              <span className="mt-1 text-xs font-bold uppercase tracking-wider text-emerald-700">Correct</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-100/80 bg-rose-50/50 p-4 shadow-sm">
              <span className="text-2xl font-black text-rose-600">{incorrectCount}</span>
              <span className="mt-1 text-xs font-bold uppercase tracking-wider text-rose-700">Incorrect</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-50/80 p-4 shadow-sm">
              <span className="text-2xl font-black text-slate-700">{totalQuestions}</span>
              <span className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Total</span>
            </div>
          </div>
        </div>

        {/* Nút điều hướng */}
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Link
            href={`/learner/courses/${slug}/tests/${testId}/take`}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition ${
              percentage === 100
                ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
                : 'bg-[#F7444E] text-white shadow-sm hover:bg-[#c93f3a]'
            }`}
          >
            <RotateCcw className="h-4 w-4" /> Retake test
          </Link>
          <Link
            href={`/learner/courses/${slug}`}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition ${
              percentage === 100
                ? 'bg-[#F7444E] text-white shadow-sm hover:bg-[#c93f3a]'
                : 'border border-slate-200 bg-white text-[#0f3741] hover:bg-slate-50 shadow-sm'
            }`}
          >
            <ArrowLeft className="h-4 w-4" /> Back to course
          </Link>
        </div>
      </div>

      {/* Review Section */}
      {totalQuestions > 0 && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#F7444E]" />
              <h2 className="text-xl font-bold text-slate-900">Answers & Explanations</h2>
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                All ({totalQuestions})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('incorrect')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeFilter === 'incorrect' ? 'bg-white text-rose-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Incorrect ({incorrectCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('correct')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeFilter === 'correct' ? 'bg-white text-emerald-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Correct ({correctCount})
              </button>
            </div>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-slate-500">
              No questions found under this filter.
            </div>
          ) : (
            filteredQuestions.map((item) => {
              const { originalIndex, qId, question: q, options: optionsList, userSelectedIds, isCorrect: isCorrectQuestion } = item;

              return (
                <article
                  key={qId}
                  className="relative rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold shadow-sm ${
                          isCorrectQuestion ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      >
                        {isCorrectQuestion ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                      </span>

                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-200 text-xs font-bold text-slate-800">
                        {originalIndex + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        {q.question_type || 'single_choice'}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isCorrectQuestion
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isCorrectQuestion ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  <p className="text-base font-bold text-slate-900">{q.content}</p>

                  <div className="space-y-2.5">
                    {optionsList.map((opt: any, oIdx: number) => {
                      const optId = String(opt.id);
                      const isCorrect = opt.is_correct === true;
                      const isChosen = userSelectedIds.includes(optId);

                      let cardStyle = 'border-gray-200 bg-white text-slate-700';
                      let badgeStyle = 'border-gray-300 bg-gray-100 text-slate-600';

                      if (isCorrect) {
                        cardStyle = 'border-emerald-300 bg-emerald-50/80 font-medium text-emerald-900';
                        badgeStyle = 'border-emerald-400 bg-emerald-500 text-white';
                      } else if (isChosen && !isCorrect) {
                        cardStyle = 'border-rose-300 bg-rose-50/80 font-medium text-rose-900';
                        badgeStyle = 'border-rose-400 bg-rose-500 text-white';
                      }

                      return (
                        <div
                          key={optId || oIdx}
                          className={`flex items-center justify-between rounded-xl border p-3.5 text-sm transition ${cardStyle}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${badgeStyle}`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="break-words">{opt.option_text}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isChosen && !isCorrect && (
                              <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                                Your answer
                              </span>
                            )}
                            {isChosen && isCorrect && (
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                Your correct answer
                              </span>
                            )}
                            {!isChosen && isCorrect && (
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                Correct answer
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="mt-4 rounded-xl border border-gray-100 bg-slate-50/90 p-4">
                      <p className="text-xs leading-relaxed text-slate-600">
                        <span className="font-bold text-slate-800">Explanation: </span>
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}