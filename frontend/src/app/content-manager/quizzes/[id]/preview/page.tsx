'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  RotateCcw,
  Settings,
  X,
} from 'lucide-react';
import { ApiClientError, questionApi, quizApi } from '@/lib/api';
import { readQuizPreviewDraft } from '@/lib/quiz-preview-draft';
import { vietnameseDifficulty } from '@/lib/ui-labels';
import type { DifficultyLevel, QuestionType } from '@/types/question';
import type { QuizQuestionItem } from '@/types/quiz';

type PreviewQuizMeta = {
  title: string;
  duration_minutes: number | null;
  pass_percentage: number;
  is_active: boolean;
};

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Một đáp án',
  multiple_choice: 'Nhiều đáp án',
  true_false: 'Đúng / Sai',
  fill_in_blank: 'Điền vào chỗ trống',
};

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
  hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
};

type PreviewOption = { id: string; option_text: string; is_correct: boolean; order_index: number };

type PreviewQuestion = {
  question_id: string;
  content: string;
  question_type: QuestionType;
  difficulty: DifficultyLevel;
  explanation: string | null;
  score_weight: number;
  deleted: boolean;
  options: PreviewOption[];
};

type RawQuestion = {
  id?: string;
  status?: string;
  content?: string;
  question_type?: QuestionType;
  difficulty?: DifficultyLevel;
  explanation?: string | null;
  deleted_at?: string | null;
  options?: Array<{ id: string; option_text: string; is_correct?: boolean; order_index?: number | null }>;
};

function errorMessage(error: unknown) {
  if (error instanceof ApiClientError || error instanceof Error) return error.message;
  return 'Không thể tải bản xem trước bài kiểm tra.';
}

type PreviewRow = { question_id: string; score_weight: number; questions?: unknown };

/** Bản nháp: lấy câu hỏi (kèm đáp án) theo danh sách đang chọn ở trang tạo bài kiểm tra. */
async function loadDraft(quizId: string): Promise<{ meta: PreviewQuizMeta; rows: PreviewRow[] }> {
  const draft = readQuizPreviewDraft();
  if (!draft) throw new Error('Không tìm thấy bản nháp để xem trước. Hãy mở lại từ trang Tạo bài kiểm tra.');
  const saved = quizId !== 'draft' ? await quizApi.getById(quizId).catch(() => null) : null;
  const rows = await Promise.all(
    draft.questions.map(async (item) => ({
      question_id: item.question_id,
      score_weight: item.score_weight,
      questions: await questionApi.getById(item.question_id),
    })),
  );
  const edited = draft.meta ?? {};
  return {
    meta: {
      title: edited.title || saved?.title || 'Bài kiểm tra mới',
      // Đề mới được tạo với thời lượng mặc định 15 phút và điểm đạt 50%.
      duration_minutes: edited.duration_minutes !== undefined ? edited.duration_minutes : saved ? saved.duration_minutes : 15,
      pass_percentage: Number(edited.pass_percentage ?? saved?.pass_percentage ?? saved?.pass_score ?? 50),
      is_active: Boolean(saved?.is_active),
    },
    rows,
  };
}

async function loadSaved(quizId: string): Promise<{ meta: PreviewQuizMeta; rows: PreviewRow[] }> {
  const [saved, rows] = await Promise.all([quizApi.getById(quizId), quizApi.getQuestions(quizId)]);
  return {
    meta: {
      title: saved.title,
      duration_minutes: saved.duration_minutes,
      pass_percentage: Number(saved.pass_percentage ?? saved.pass_score ?? 50),
      is_active: Boolean(saved.is_active),
    },
    rows,
  };
}

function relation(item: QuizQuestionItem | PreviewRow): RawQuestion | null {
  const value = item.questions as RawQuestion | RawQuestion[] | null | undefined;
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

/** Chấm như máy chủ: đúng khi chọn đúng và đủ các phương án đúng. */
function isAnswerCorrect(question: PreviewQuestion, selected: string[]) {
  const correct = question.options.filter((option) => option.is_correct).map((option) => option.id);
  return correct.length > 0 && selected.length === correct.length && selected.every((id) => correct.includes(id));
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function QuizPreviewContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const quizId = String(params?.id ?? '');
  const isDraft = searchParams.get('draft') === '1';

  const [quiz, setQuiz] = useState<PreviewQuizMeta | null>(null);
  const [questions, setQuestions] = useState<PreviewQuestion[]>([]);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [graded, setGraded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!quizId) return;
    let active = true;
    (isDraft ? loadDraft(quizId) : loadSaved(quizId))
      .then(({ meta: loadedQuiz, rows }) => {
        if (!active) return;
        // Học viên chỉ nhận câu đã duyệt (kể cả câu đã xóa mềm nhưng còn trong đề).
        const visible: PreviewQuestion[] = [];
        let hidden = 0;
        for (const row of rows) {
          const question = relation(row);
          if (!question || question.status !== 'approved') {
            hidden += 1;
            continue;
          }
          visible.push({
            question_id: row.question_id,
            content: question.content ?? '',
            question_type: question.question_type ?? 'single_choice',
            difficulty: question.difficulty ?? 'medium',
            explanation: question.explanation ?? null,
            score_weight: Number(row.score_weight) || 1,
            deleted: Boolean(question.deleted_at),
            options: [...(question.options ?? [])]
              .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
              .map((option, index) => ({
                id: option.id,
                option_text: option.option_text,
                is_correct: Boolean(option.is_correct),
                order_index: Number(option.order_index ?? index),
              })),
          });
        }
        setQuiz(loadedQuiz);
        setQuestions(visible);
        setHiddenCount(hidden);
        setTimeLeft(loadedQuiz.duration_minutes ? loadedQuiz.duration_minutes * 60 : null);
        setError(null);
      })
      .catch((loadError) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [quizId, isDraft, reloadKey]);

  // Đồng hồ chỉ để xem trước; hết giờ thì tự chấm thử, không gửi gì lên máy chủ.
  useEffect(() => {
    if (timeLeft === null || graded || timeLeft <= 0) return;
    const timer = window.setTimeout(() => {
      setTimeLeft(timeLeft - 1);
      if (timeLeft - 1 <= 0) setGraded(true);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [timeLeft, graded]);

  const result = useMemo(() => {
    const maxScore = questions.reduce((sum, question) => sum + question.score_weight, 0);
    let score = 0;
    let correctCount = 0;
    for (const question of questions) {
      if (isAnswerCorrect(question, answers[question.question_id] ?? [])) {
        score += question.score_weight;
        correctCount += 1;
      }
    }
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0;
    const passPercentage = Number(quiz?.pass_percentage ?? 50);
    return { maxScore, score, correctCount, percentage, passPercentage, passed: percentage >= passPercentage };
  }, [answers, questions, quiz]);

  const reset = useCallback(() => {
    setAnswers({});
    setGraded(false);
    setCurrentIndex(0);
    setTimeLeft(quiz?.duration_minutes ? quiz.duration_minutes * 60 : null);
  }, [quiz]);

  const selectOption = (question: PreviewQuestion, optionId: string) => {
    if (graded) return;
    setAnswers((current) => {
      const selected = current[question.question_id] ?? [];
      const next = question.question_type === 'multiple_choice'
        ? selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId]
        : [optionId];
      return { ...current, [question.question_id]: next };
    });
  };

  if (isLoading) {
    return <div className="mx-auto max-w-3xl p-8 text-sm text-gray-500">Đang tải bản xem trước bài kiểm tra...</div>;
  }

  if (error || !quiz) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
        <h1 className="text-lg font-bold text-rose-700">Không tải được bản xem trước</h1>
        <p className="mt-2 text-sm text-rose-600">{error}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setReloadKey((key) => key + 1);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c93f3a]"
          >
            <RotateCcw className="h-4 w-4" /> Thử lại
          </button>
          <Link
            href="/content-manager/testsandpractice/tests"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" /> Danh sách bài kiểm tra
          </Link>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const reveal = showAnswers || graded;
  const answeredCount = questions.filter((question) => (answers[question.question_id]?.length ?? 0) > 0).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12 pt-4">
      {/* Thanh chế độ xem trước */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        <span className="inline-flex items-center gap-2 font-semibold">
          <Eye className="h-4 w-4" />
          {isDraft
            ? 'Xem trước bản nháp chưa lưu — không tạo lượt làm và không lưu kết quả.'
            : 'Chế độ xem trước — không tạo lượt làm và không lưu kết quả.'}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAnswers((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
          >
            {showAnswers ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showAnswers ? 'Ẩn đáp án' : 'Hiện đáp án và lời giải'}
          </button>
          {isDraft ? (
            <button
              type="button"
              onClick={() => window.close()}
              title="Đóng tab xem trước và quay lại trang đang chỉnh"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
            >
              <X className="h-3.5 w-3.5" /> Đóng bản xem trước
            </button>
          ) : (
            <Link
              href={`/content-manager/quizzes/${quizId}/builder`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-100"
            >
              <Settings className="h-3.5 w-3.5" /> Về cài đặt bài kiểm tra
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{quiz.title}</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {questions.length} câu · {quiz.duration_minutes ? `${quiz.duration_minutes} phút` : 'Không giới hạn thời gian'} · Điểm đạt {formatNumber(result.passPercentage)}% · Tổng {formatNumber(result.maxScore)} điểm
            {!quiz.is_active && ' · Chưa xuất bản'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#F7444E]" />
          Đã trả lời: {answeredCount} / {questions.length}
        </div>
      </div>

      {hiddenCount > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Có {hiddenCount} câu trong đề chưa được duyệt nên học viên sẽ không thấy và không được tính điểm.
          </span>
        </div>
      )}

      {questions.length === 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-700">
          Đề chưa có câu hỏi đã duyệt nào, học viên sẽ thấy “Không có câu hỏi nào”.
        </div>
      ) : (
        <>
          {graded && (
            <div
              className={`rounded-2xl border p-5 text-center shadow-sm ${
                result.passed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Kết quả chấm thử</p>
              <p className={`mt-1 text-3xl font-black ${result.passed ? 'text-emerald-700' : 'text-[#F7444E]'}`}>
                {formatNumber(result.percentage)}% · {result.passed ? 'Đạt' : 'Chưa đạt'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Điểm {formatNumber(result.score)}/{formatNumber(result.maxScore)} · Đúng {result.correctCount}/{questions.length} câu
              </p>
              {timeLeft === 0 && <p className="mt-1 text-xs font-semibold text-amber-700">Hết giờ — đã tự chấm như khi học viên hết giờ.</p>}
            </div>
          )}

          <article className="relative flex flex-col justify-between rounded-3xl border border-gray-200/80 bg-[#FFFAFC]/50 p-6 shadow-sm sm:p-8">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F7444E]/10 text-xs font-bold text-[#F7444E]">
                    {currentIndex + 1}
                  </span>
                  <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${DIFFICULTY_STYLES[currentQ.difficulty] ?? DIFFICULTY_STYLES.medium}`}>
                    {vietnameseDifficulty(currentQ.difficulty)}
                  </span>
                  <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-slate-500">
                    {TYPE_LABELS[currentQ.question_type] ?? currentQ.question_type}
                  </span>
                  <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-slate-500">
                    {formatNumber(currentQ.score_weight)} điểm
                  </span>
                  {currentQ.deleted && (
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Đã xóa khỏi ngân hàng
                    </span>
                  )}
                </div>
                {timeLeft !== null && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-rose-50/80 px-3 py-1 text-xs font-bold text-[#F7444E] shadow-sm">
                    <Clock3 className={`h-3.5 w-3.5 ${graded ? '' : 'animate-pulse'}`} />
                    <span>{formatTime(timeLeft)}</span>
                  </div>
                )}
              </div>

              <p className="my-5 text-lg font-bold leading-relaxed text-slate-900">{currentQ.content}</p>

              <div className="space-y-3">
                {currentQ.options.map((option, index) => {
                  const picked = (answers[currentQ.question_id] ?? []).includes(option.id);
                  let style = picked
                    ? 'border-[#F7444E] bg-rose-50/70 font-semibold text-[#0f3741] shadow-sm'
                    : 'border-gray-200/80 bg-white text-slate-700 hover:border-gray-300 hover:bg-gray-50/60';
                  if (reveal && option.is_correct) style = 'border-emerald-300 bg-emerald-50/80 font-medium text-emerald-900';
                  else if (graded && picked) style = 'border-rose-300 bg-rose-50/80 font-medium text-rose-900';
                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => selectOption(currentQ, option.id)}
                      disabled={graded}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left text-sm transition-all disabled:cursor-default ${style}`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          picked ? 'border-[#F7444E] bg-[#F7444E] text-white' : 'border-gray-300 bg-gray-100 text-slate-600'
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1 break-words">{option.option_text}</span>
                      {reveal && option.is_correct && (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Đáp án đúng</span>
                      )}
                      {!reveal && picked && <CheckCircle2 className="h-4 w-4 text-[#F7444E]" />}
                    </button>
                  );
                })}
              </div>

              {reveal && currentQ.explanation && (
                <div className="mt-4 rounded-xl border border-gray-100 bg-slate-50/90 p-4">
                  <p className="text-xs leading-relaxed text-slate-600">
                    <span className="font-bold text-slate-800">Giải thích: </span>
                    {currentQ.explanation}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((index) => index - 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Trước đó
              </button>
              <div className="flex flex-wrap items-center gap-3">
                {graded ? (
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-gray-50"
                  >
                    <RotateCcw className="h-4 w-4" /> Làm lại
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setGraded(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#F7444E] bg-white px-5 py-2.5 text-sm font-bold text-[#F7444E] shadow-sm hover:bg-rose-50"
                  >
                    Chấm thử
                  </button>
                )}
                {currentIndex < questions.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((index) => index + 1)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#F7444E] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#c93f3a]"
                  >
                    Câu hỏi tiếp theo <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </article>

          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {questions.map((question, index) => {
                const selected = answers[question.question_id] ?? [];
                const isCurrent = index === currentIndex;
                let style = selected.length > 0 ? 'bg-rose-100 text-[#F7444E]' : 'bg-gray-100 text-slate-500 hover:bg-gray-200';
                if (graded) style = isAnswerCorrect(question, selected) ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';
                return (
                  <button
                    key={question.question_id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                      isCurrent ? 'border-2 border-[#F7444E]' : ''
                    } ${style}`}
                    title={graded ? (isAnswerCorrect(question, selected) ? 'Đúng' : 'Sai') : undefined}
                  >
                    {graded ? (
                      isAnswerCorrect(question, selected) ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />
                    ) : (
                      index + 1
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function QuizPreviewPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl p-8 text-sm text-gray-500">Đang tải bản xem trước bài kiểm tra...</div>}>
      <QuizPreviewContent />
    </Suspense>
  );
}
