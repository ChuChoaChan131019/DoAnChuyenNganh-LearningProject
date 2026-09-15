'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Clock3, FileQuestion, ArrowLeft } from 'lucide-react';
import { ApiClientError, quizApi } from '@/lib/api';
import type { QuizItem } from '@/types/quiz';

function errorMessage(error: unknown) { return error instanceof ApiClientError ? error.message : 'Unable to load this quiz.'; }

export default function CourseTestIntroPage() {
  const params = useParams<{ slug: string; testId: string }>();
  const slug = String(params.slug ?? '');
  const testId = String(params.testId ?? '');
  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testId) return;
    quizApi.getById(testId).then(setQuiz).catch((loadError) => setError(errorMessage(loadError)));
  }, [testId]);

  if (error || !quiz) return <div className="mx-auto max-w-[900px] rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><h1 className="text-2xl font-bold text-slate-800">{error ? 'Unable to load quiz' : 'Loading quiz...'}</h1>{error && <p className="mt-2 text-slate-500">{error}</p>}<Link href={`/learner/courses/${slug}`} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white"><ArrowLeft className="h-4 w-4" />Back to course</Link></div>;

  return <div className="mx-auto flex min-h-[600px] max-w-[980px] items-center justify-center px-4 py-8"><div className="w-full max-w-[760px] rounded-[20px] border border-[#dfe4df] bg-white p-6 shadow-sm sm:p-8"><div className="border-b border-[#e7e9e6] pb-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F7444E]">{quiz.quiz_type}</p><h1 className="mt-2 text-2xl font-black text-[#0f3741] sm:text-3xl">{quiz.title}</h1><p className="mt-3 text-base leading-7 text-slate-600">{quiz.description || 'Complete this quiz to check your understanding.'}</p></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[#f5f8f6] p-4"><FileQuestion className="h-5 w-5 text-[#F7444E]" /><p className="mt-2 text-lg font-bold text-[#0f3741]">{quiz.total_questions}</p><p className="text-xs text-slate-500">questions</p></div><div className="rounded-xl bg-[#f5f8f6] p-4"><Clock3 className="h-5 w-5 text-[#F7444E]" /><p className="mt-2 text-lg font-bold text-[#0f3741]">{quiz.duration_minutes === null ? 'Unlimited' : `${quiz.duration_minutes} min`}</p><p className="text-xs text-slate-500">time limit</p></div><div className="rounded-xl bg-[#f5f8f6] p-4"><p className="text-xs font-bold uppercase text-[#F7444E]">Pass score</p><p className="mt-2 text-lg font-bold text-[#0f3741]">{quiz.pass_score}%</p><p className="text-xs text-slate-500">required</p></div></div><Link href={`/learner/courses/${slug}/tests/${testId}/take`} className="mt-8 flex h-[52px] w-full items-center justify-center rounded-[14px] bg-[#F7444E] text-base font-bold text-white shadow-sm hover:bg-[#eb3d42]">Start quiz</Link></div></div>;
}
