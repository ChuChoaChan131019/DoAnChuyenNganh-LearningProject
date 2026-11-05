'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Clock3,
  Loader2,
  PlayCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { practiceApi } from '@/lib/api';
import type { AiPracticeSet } from '@/types/practice';

const ERROR_LABELS: Record<string, string> = {
  AI_GENERATION_INTERRUPTED: 'Quá trình tạo đã bị gián đoạn.',
  AI_PROVIDER_UNAVAILABLE: 'Dịch vụ AI đang bận hoặc hết hạn mức.',
  AI_OUTPUT_INVALID: 'AI trả về dữ liệu chưa đúng định dạng.',
  AI_PRACTICE_SAVE_FAILED: 'Không thể lưu trọn bộ câu hỏi.',
};

export default function ChapterAiPracticeSetsPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = Array.isArray(params?.chapterId) ? params.chapterId[0] : params?.chapterId;
  const [sets, setSets] = useState<AiPracticeSet[]>([]);
  const [chapterTitle, setChapterTitle] = useState('Chương hiện tại');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadSets = useCallback(async (silent = false) => {
    if (!chapterId) return;
    if (!silent) setLoading(true);
    try {
      const response = await practiceApi.aiSets(chapterId);
      setSets(response.sets);
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : 'Không thể tải các bộ luyện tập AI.');
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    if (!chapterId) return;
    let active = true;
    void practiceApi.aiSets(chapterId)
      .then((response) => {
        if (!active) return;
        setSets(response.sets);
        setError('');
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    void practiceApi.overview()
      .then((overview) => {
        if (!active) return;
        const chapter = overview.chapters.find((item) => item.id === chapterId);
        if (chapter) setChapterTitle(chapter.title);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [chapterId]);

  const hasGeneratingSet = useMemo(
    () => sets.some((practiceSet) => practiceSet.status === 'generating'),
    [sets],
  );

  useEffect(() => {
    if (!hasGeneratingSet) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadSets(true);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [hasGeneratingSet, loadSets]);

  const retrySet = async (setId: string) => {
    if (retryingId) return;
    setRetryingId(setId);
    setError('');
    try {
      await practiceApi.retryAiSet(setId);
      await loadSets(true);
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : 'Không thể thử tạo lại bộ câu hỏi.');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại bài học
          </button>
          <p className="text-sm font-semibold text-violet-600">Luyện tập theo bài học</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0f3741]">
            Các bộ câu hỏi AI
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {chapterTitle} · Chỉ hiển thị những bộ do chính bạn tạo.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 sm:self-auto">
          <Sparkles className="h-4 w-4" />
          {sets.length} bộ luyện tập
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải các bộ luyện tập...
        </div>
      ) : sets.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-bold text-[#0f3741]">Bạn chưa tạo bộ câu hỏi nào trong chương này</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
            Hãy quay lại một bài học trong chương và nhấn “Nhờ AI ra 5 câu luyện tập”.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sets.map((practiceSet) => {
            const generating = practiceSet.status === 'generating';
            const ready = practiceSet.status === 'ready';
            const failed = practiceSet.status === 'failed';
            return (
              <article
                key={practiceSet.id}
                className={`flex min-h-64 flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all ${
                  generating
                    ? 'border-violet-200 opacity-60'
                    : failed
                      ? 'border-rose-200'
                      : 'border-emerald-200 hover:-translate-y-0.5 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    ready ? 'bg-emerald-50 text-emerald-600' : failed ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-600'
                  }`}>
                    {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : failed ? <AlertCircle className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    ready ? 'bg-emerald-50 text-emerald-700' : failed ? 'bg-rose-50 text-rose-700' : 'bg-violet-50 text-violet-700'
                  }`}>
                    {ready ? 'Sẵn sàng' : failed ? 'Tạo thất bại' : 'Đang tạo'}
                  </span>
                </div>

                <h2 className="mt-4 line-clamp-2 text-lg font-bold text-[#0f3741]">{practiceSet.lesson_title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {generating
                    ? `AI đang tạo ${practiceSet.requested_count} câu hỏi từ bài học này...`
                    : failed
                      ? ERROR_LABELS[practiceSet.error_code ?? ''] ?? 'Chưa thể tạo bộ câu hỏi.'
                      : `${practiceSet.generated_count} câu · Độ khó ${practiceSet.difficulty}`}
                </p>

                <div className="mt-auto pt-5">
                  <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
                    <Clock3 className="h-3.5 w-3.5" />
                    {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(practiceSet.created_at))}
                  </div>
                  {ready && (
                    <button
                      type="button"
                      onClick={() => router.push(`/learner/practice?mode=ai&set_id=${encodeURIComponent(practiceSet.id)}`)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Làm bộ câu hỏi
                    </button>
                  )}
                  {failed && (
                    <button
                      type="button"
                      onClick={() => void retrySet(practiceSet.id)}
                      disabled={retryingId !== null}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {retryingId === practiceSet.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      Thử lại
                    </button>
                  )}
                  {generating && (
                    <div className="h-10 overflow-hidden rounded-xl bg-slate-100">
                      <div className="h-full w-2/3 animate-pulse bg-violet-100" />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
