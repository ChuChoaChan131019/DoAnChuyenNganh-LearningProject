'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Loader2, RefreshCw, Save, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CodeEditor } from '@/components/learner/code-exercises/code-editor';
import { PublicExamples } from '@/components/learner/code-exercises/public-examples';
import { SaveStatus, type EditorSaveState } from '@/components/learner/code-exercises/save-status';
import { ApiClientError, codeExerciseApi } from '@/lib/api';
import type { LearnerCodeExerciseDetail } from '@/types/code-exercise';

const difficultyLabel = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó' } as const;

export default function CodeExerciseDetailPage() {
  const params = useParams<{ exerciseId: string }>();
  const exerciseId = Array.isArray(params.exerciseId) ? params.exerciseId[0] : params.exerciseId;
  const [exercise, setExercise] = useState<LearnerCodeExerciseDetail | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<EditorSaveState>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const codeRef = useRef('');
  const savedCodeRef = useRef('');
  const versionRef = useRef(0);
  const savingRef = useRef(false);
  const queuedRef = useRef(false);
  const persistRef = useRef<() => Promise<void>>(async () => undefined);

  const loadExercise = useCallback(async () => {
    if (!exerciseId) return;
    setLoading(true);
    setError('');
    try {
      const detail = await codeExerciseApi.detail(exerciseId);
      const initialCode = detail.progress.has_saved_code ? detail.progress.saved_code : detail.starter_code;
      setExercise(detail);
      setCode(initialCode);
      codeRef.current = initialCode;
      savedCodeRef.current = initialCode;
      versionRef.current = detail.progress.save_version;
      setSavedAt(detail.progress.updated_at);
      setSaveState(detail.progress.has_saved_code ? 'saved' : 'idle');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể mở bài thực hành.');
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    // The request updates state asynchronously after the route identifier changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadExercise();
  }, [loadExercise]);

  const persist = useCallback(async () => {
    if (!exerciseId || codeRef.current === savedCodeRef.current || saveState === 'conflict') return;
    if (savingRef.current) { queuedRef.current = true; return; }
    savingRef.current = true;
    const snapshot = codeRef.current;
    setSaveState('saving');
    try {
      const result = await codeExerciseApi.saveCode(exerciseId, snapshot, versionRef.current);
      versionRef.current = result.save_version;
      savedCodeRef.current = snapshot;
      setSavedAt(result.updated_at);
      setSaveState(codeRef.current === snapshot ? 'saved' : 'dirty');
    } catch (requestError) {
      if (requestError instanceof ApiClientError && requestError.status === 409) {
        queuedRef.current = false;
        setSaveState('conflict');
      } else {
        setSaveState('error');
      }
    } finally {
      savingRef.current = false;
      if (queuedRef.current) {
        queuedRef.current = false;
        window.setTimeout(() => void persistRef.current(), 0);
      }
    }
  }, [exerciseId, saveState]);
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(() => {
    if (!exercise || code === savedCodeRef.current || saveState !== 'dirty') return;
    const timer = window.setTimeout(() => void persistRef.current(), 1200);
    return () => window.clearTimeout(timer);
  }, [code, exercise, saveState]);

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (codeRef.current === savedCodeRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeave);
    return () => window.removeEventListener('beforeunload', warnBeforeLeave);
  }, []);

  const changeCode = (nextCode: string) => {
    setCode(nextCode);
    codeRef.current = nextCode;
    if (saveState !== 'conflict') setSaveState(nextCode === savedCodeRef.current ? 'saved' : 'dirty');
  };

  if (loading) return <div className="flex min-h-80 items-center justify-center gap-3 text-[#145a68]"><Loader2 className="h-6 w-6 animate-spin" /> Đang tải đề bài và mã đã lưu...</div>;
  if (error || !exercise) return (
    <div className="mx-auto max-w-xl rounded-[18px] border border-rose-200 bg-white p-8 text-center shadow-sm">
      <ShieldAlert className="mx-auto h-9 w-9 text-rose-500" /><h1 className="mt-4 text-xl font-bold text-[#0f3741]">Không thể mở bài thực hành</h1><p className="mt-2 text-sm text-rose-700">{error}</p>
      <div className="mt-6 flex justify-center gap-3"><Link href="/learner/code-exercises" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Về danh sách</Link><button type="button" onClick={() => void loadExercise()} className="rounded-xl bg-[#f7444e] px-4 py-2 text-sm font-bold text-white">Thử lại</button></div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1460px] pb-10">
      <Link href="/learner/code-exercises" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#145a68]"><ArrowLeft className="h-4 w-4" /> Danh sách bài thực hành</Link>
      <div className="mb-5 flex flex-col justify-between gap-4 rounded-[18px] border border-[#dfe6df] bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold"><span className="rounded-full bg-[#eef6f5] px-2.5 py-1 text-[#145a68]">{difficultyLabel[exercise.difficulty]}</span>{exercise.progress.requires_resubmission && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">Có phiên bản đề mới</span>}</div>
          <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#0f3741]">{exercise.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{exercise.course.title} · {exercise.chapter.title} · {exercise.lesson.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SaveStatus state={saveState} updatedAt={savedAt} />
          {saveState === 'conflict' ? <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white"><RefreshCw className="h-4 w-4" /> Tải mã mới nhất</button> : <button type="button" onClick={() => void persist()} disabled={saveState !== 'dirty' && saveState !== 'error'} className="inline-flex items-center gap-2 rounded-xl bg-[#f7444e] px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" /> Lưu mã</button>}
        </div>
      </div>

      {saveState === 'conflict' && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Một phiên khác đã lưu mã mới hơn. Hãy sao chép phần mã cần giữ nếu cần, sau đó tải phiên bản mới nhất để tránh ghi đè.</div>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(340px,0.78fr)_minmax(560px,1.4fr)]">
        <aside className="space-y-5 xl:sticky xl:top-5">
          <section className="rounded-[18px] border border-[#dfe6df] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-[#145a68]"><BookOpen className="h-4 w-4" /> Đề bài</div>
            {exercise.objective && <p className="mt-4 rounded-xl bg-[#f4f8f6] p-3 text-sm font-semibold leading-6 text-[#0f3741]">{exercise.objective}</p>}
            <div className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{exercise.description}</div>
            {(exercise.input_format || exercise.output_format) && <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">{exercise.input_format && <Format title="Định dạng đầu vào" value={exercise.input_format} />}{exercise.output_format && <Format title="Định dạng đầu ra" value={exercise.output_format} />}</div>}
          </section>
          <PublicExamples examples={exercise.public_examples} />
        </aside>
        <main>
          <CodeEditor value={code} onChange={changeCode} disabled={saveState === 'conflict'} />
          <p className="mt-3 text-xs leading-5 text-slate-500">Mã được tự động lưu sau khi bạn ngừng nhập. Chức năng chạy và chấm mã sẽ xuất hiện khi dịch vụ thực thi được kết nối.</p>
        </main>
      </div>
    </div>
  );
}

function Format({ title, value }: { title: string; value: string }) {
  return <div><h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">{title}</h2><p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">{value}</p></div>;
}
