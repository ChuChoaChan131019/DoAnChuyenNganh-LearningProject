'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
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
import type { QuizAttemptReview, QuizData } from '@/types/quiz';

function errorMessage(error: unknown) {
  return error instanceof ApiClientError ? error.message : 'Không thể tải kết quả bài kiểm tra.';
}

type QuestionFilter = 'all' | 'incorrect' | 'correct';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty'; quiz: QuizData | null }
  | { kind: 'ready'; quiz: QuizData | null; review: QuizAttemptReview };

const TYPE_LABELS: Record<string, string> = {
  single_choice: 'Một đáp án',
  multiple_choice: 'Nhiều đáp án',
  true_false: 'Đúng / Sai',
  fill_in_blank: 'Điền vào chỗ trống',
};

function formatPercentage(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatDuration(totalSec: number | null) {
  if (totalSec === null || Number.isNaN(totalSec)) return '--:--';
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function CourseTestResultsContent() {
  const params = useParams<{ slug: string; testId: string }>();
  const searchParams = useSearchParams();
  const slug = String(params?.slug ?? '');
  const testId = String(params?.testId ?? '');
  const attemptIdParam = searchParams.get('attemptId');

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [activeFilter, setActiveFilter] = useState<QuestionFilter>('all');

  // Kết quả luôn lấy từ đúng lượt làm máy chủ đã lưu; không tự tính lại điểm trên trình duyệt.
  const load = useCallback(async () => {
    if (!testId) return;
    setState({ kind: 'loading' });
    try {
      const quiz = await quizApi.getById(testId).catch(() => null);
      let attemptId = attemptIdParam;
      if (!attemptId) {
        const latest = await quizApi.latestResult(testId);
        attemptId = latest.latest_attempt_id;
      }
      if (!attemptId) {
        setState({ kind: 'empty', quiz });
        return;
      }
      const review = await quizApi.getAttemptReview(attemptId);
      setState({ kind: 'ready', quiz, review });
    } catch (loadError) {
      setState({ kind: 'error', message: errorMessage(loadError) });
    }
  }, [attemptIdParam, testId]);

  useEffect(() => {
    // Tải kết quả khi mở trang hoặc khi đổi lượt làm.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (state.kind === 'loading') {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">Đang tải kết quả bài kiểm tra...</p>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-rose-800">Không tải được kết quả</h1>
        <p className="mt-2 text-sm text-rose-600">{state.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c93f3a] transition"
          >
            <RotateCcw className="h-4 w-4" /> Thử lại
          </button>
          <Link
            href={`/learner/courses/${slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại khóa học
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === 'empty') {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-[#0f3741]">{state.quiz?.title ?? 'Bài kiểm tra'}</h1>
        <p className="mt-2 text-sm text-slate-500">Bạn chưa nộp bài kiểm tra này.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/learner/courses/${slug}/tests/${testId}/take`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c93f3a] transition"
          >
            Làm bài kiểm tra
          </Link>
          <Link
            href={`/learner/courses/${slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-50 transition"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại khóa học
          </Link>
        </div>
      </div>
    );
  }

  const { quiz, review } = state;
  const percentage = review.percentage;
  const isPassed = review.passed;
  const passScore = review.pass_percentage;
  const isExpired = review.end_reason === 'expired';
  const totalQuestions = review.total_questions;
  const correctCount = review.correct_count;
  const incorrectCount = totalQuestions - correctCount;
  const timeSpentSeconds = review.started_at && review.completed_at
    ? Math.max(0, Math.round((Date.parse(review.completed_at) - Date.parse(review.started_at)) / 1000))
    : null;

  const filteredQuestions = review.questions
    .map((question, originalIndex) => ({ question, originalIndex }))
    .filter(({ question }) => {
      if (activeFilter === 'correct') return question.is_correct;
      if (activeFilter === 'incorrect') return !question.is_correct;
      return true;
    });

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Score Summary Card */}
      <div className="rounded-3xl border border-[#dfe6df] bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-black text-[#0f3741]">{quiz?.title ?? 'Bài kiểm tra'}</h1>

        {isExpired && (
          <div className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Hết giờ — bài chưa được nộp nên lượt làm này được tính 0 điểm.
          </div>
        )}

        {/* Metadata: Passing Requirement • Duration Limit • Time Spent */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Target className="h-4 w-4 text-[#F7444E]" />
            Yêu cầu đạt: {formatPercentage(passScore)}%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            Thời lượng: {quiz?.duration_minutes ? `${quiz.duration_minutes} phút` : 'Không giới hạn'}
          </span>
          {!isExpired && (
            <span className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
              <TimerReset className="h-3.5 w-3.5 text-[#F7444E]" />
              Thời gian làm: {formatDuration(timeSpentSeconds)}
            </span>
          )}
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
              <span className="text-3xl font-black tracking-tight text-[#0f3741]">{formatPercentage(percentage)}%</span>
              <span
                className={`mt-0.5 text-[11px] font-black uppercase tracking-wider ${
                  isPassed ? 'text-emerald-600' : 'text-[#F7444E]'
                }`}
              >
                {isPassed ? 'Đạt' : 'Chưa đạt'}
              </span>
            </div>
          </div>

          {/* Điểm theo trọng số | Đúng | Sai */}
          <div className="grid flex-1 grid-cols-3 gap-3">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-50/80 p-4 shadow-sm">
              <span className="text-2xl font-black text-slate-700">
                {formatPercentage(review.score)}/{formatPercentage(review.max_score)}
              </span>
              <span className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Điểm</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100/80 bg-emerald-50/50 p-4 shadow-sm">
              <span className="text-2xl font-black text-emerald-600">{correctCount}/{totalQuestions}</span>
              <span className="mt-1 text-xs font-bold uppercase tracking-wider text-emerald-700">Câu đúng</span>
            </div>
            <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-100/80 bg-rose-50/50 p-4 shadow-sm">
              <span className="text-2xl font-black text-rose-600">{incorrectCount}</span>
              <span className="mt-1 text-xs font-bold uppercase tracking-wider text-rose-700">Câu sai</span>
            </div>
          </div>
        </div>
        <p className="-mt-3 mb-5 text-xs text-slate-400">
          Điểm và kết quả đạt/chưa đạt tính theo trọng số từng câu; số câu đúng chỉ để tham khảo.
        </p>

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
            <RotateCcw className="h-4 w-4" /> Làm lại bài kiểm tra
          </Link>
          <Link
            href={`/learner/courses/${slug}`}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition ${
              percentage === 100
                ? 'bg-[#F7444E] text-white shadow-sm hover:bg-[#c93f3a]'
                : 'border border-slate-200 bg-white text-[#0f3741] hover:bg-slate-50 shadow-sm'
            }`}
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại khóa học
          </Link>
        </div>
      </div>

      {/* Review Section */}
      {totalQuestions > 0 && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#F7444E]" />
              <h2 className="text-xl font-bold text-slate-900">Câu trả lời và giải thích</h2>
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
                Tất cả ({totalQuestions})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('incorrect')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeFilter === 'incorrect' ? 'bg-white text-rose-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Sai ({incorrectCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('correct')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  activeFilter === 'correct' ? 'bg-white text-emerald-600 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                Đúng ({correctCount})
              </button>
            </div>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-slate-500">
              Không tìm thấy câu hỏi phù hợp với bộ lọc này.
            </div>
          ) : (
            filteredQuestions.map(({ question: q, originalIndex }) => {
              const isCorrectQuestion = q.is_correct;
              return (
                <article
                  key={q.question_id}
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
                      <span className="text-xs font-semibold text-slate-500">
                        {TYPE_LABELS[q.question_type] ?? q.question_type}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {formatPercentage(q.earned_score)}/{formatPercentage(q.score_weight)} điểm
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isCorrectQuestion
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isCorrectQuestion ? 'Đúng' : q.answered ? 'Sai' : 'Chưa trả lời'}
                    </span>
                  </div>

                  <p className="text-base font-bold text-slate-900">{q.content}</p>

                  {q.answer_text && (
                    <p className="text-sm text-slate-600">
                      <span className="font-semibold text-slate-800">Câu trả lời của bạn: </span>
                      {q.answer_text}
                    </p>
                  )}

                  <div className="space-y-2.5">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = opt.is_correct;
                      const isChosen = q.selected_option_ids.includes(opt.id);

                      let cardStyle = 'border-gray-200 bg-white text-slate-700';
                      let badgeStyle = 'border-gray-300 bg-gray-100 text-slate-600';

                      if (isCorrect) {
                        cardStyle = 'border-emerald-300 bg-emerald-50/80 font-medium text-emerald-900';
                        badgeStyle = 'border-emerald-400 bg-emerald-500 text-white';
                      } else if (isChosen) {
                        cardStyle = 'border-rose-300 bg-rose-50/80 font-medium text-rose-900';
                        badgeStyle = 'border-rose-400 bg-rose-500 text-white';
                      }

                      return (
                        <div
                          key={opt.id || oIdx}
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
                                Câu trả lời của bạn
                              </span>
                            )}
                            {isChosen && isCorrect && (
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                Câu trả lời đúng của bạn
                              </span>
                            )}
                            {!isChosen && isCorrect && (
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                                Đáp án đúng
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
                        <span className="font-bold text-slate-800">Giải thích: </span>
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

export default function CourseTestResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-500">Đang tải kết quả bài kiểm tra...</p>
        </div>
      }
    >
      <CourseTestResultsContent />
    </Suspense>
  );
}
