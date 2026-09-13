'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { ApiClientError, quizApi } from '@/lib/api';
import type { QuizItem, QuizResultResponse } from '@/types/quiz';

function errorMessage(error: unknown) { return error instanceof ApiClientError ? error.message : 'Unable to load the result.'; }

export default function CourseTestResultsPage() {
  const params = useParams<{ slug: string; testId: string }>();
  const slug = String(params.slug ?? '');
  const testId = String(params.testId ?? '');
  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [result, setResult] = useState<QuizResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([quizApi.getById(testId), quizApi.latestResult(testId)])
      .then(([loadedQuiz, loadedResult]) => { setQuiz(loadedQuiz); setResult(loadedResult); })
      .catch((loadError) => setError(errorMessage(loadError)));
  }, [testId]);

  if (error || !quiz || !result) return <div className="mx-auto max-w-[900px] rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><h1 className="text-2xl font-bold text-slate-800">{error ? 'Result unavailable' : 'Loading result...'}</h1>{error && <p className="mt-2 text-slate-500">{error}</p>}<Link href={`/learner/courses/${slug}`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white"><ArrowLeft className="h-4 w-4" />Back to course</Link></div>;

  const percentage = result.percentage ?? 0;
  const hasAttempt = result.latest_attempt_id !== null;
  return <div className="mx-auto max-w-[980px] px-4 py-8"><div className="rounded-[18px] border border-[#dfe6df] bg-white p-6 text-center shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F7444E]">Quiz results</p><h1 className="mt-2 text-2xl font-black text-[#0f3741]">{quiz.title}</h1>{hasAttempt ? <><div className="mt-7 text-6xl font-black tracking-tight text-[#0f3741]">{percentage}%</div><p className="mt-2 text-sm text-slate-500">{result.score} / {result.max_score} points</p><div className={`mx-auto mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${percentage >= quiz.pass_score ? 'bg-[#dff5ea] text-[#1d8f69]' : 'bg-rose-50 text-[#d93e4f]'}`}><CheckCircle2 className="h-4 w-4" />{percentage >= quiz.pass_score ? 'Passed' : 'Not passed'}</div></> : <p className="mt-8 text-slate-500">No completed attempt is available yet.</p>}<div className="mt-8 grid gap-3 sm:grid-cols-2"><Link href={`/learner/courses/${slug}/tests/${testId}/take`} className="rounded-xl bg-[#F7444E] px-4 py-3 text-sm font-bold text-white">Try again</Link><Link href={`/learner/courses/${slug}`} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#0f3741]">Back to course</Link></div></div></div>;
}
