'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { ApiClientError, quizApi } from '@/lib/api';
import type { QuizAttempt, QuizAttemptQuestion, QuizAnswerSubmission } from '@/types/quiz';

function errorMessage(error: unknown) { return error instanceof ApiClientError ? error.message : 'Unable to start this quiz.'; }

export default function CourseTestTakePage() {
  const params = useParams<{ slug: string; testId: string }>();
  const slug = String(params.slug ?? '');
  const testId = String(params.testId ?? '');
  const router = useRouter();
  const [attempt, setAttempt] = useState<(QuizAttempt & { questions: QuizAttemptQuestion[] }) | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswerSubmission>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    quizApi.startAttempt(testId).then((started) => {
      setAttempt(started);
      setTimeLeft(started.quiz_type && started.questions ? null : null);
    }).catch((loadError) => setError(errorMessage(loadError)));
  }, [testId]);

  useEffect(() => {
    if (!attempt || attempt.questions.length === 0) return;
    quizApi.getById(attempt.quiz_id).then((quiz) => setTimeLeft(quiz.duration_minutes === null ? null : quiz.duration_minutes * 60)).catch(() => undefined);
  }, [attempt]);

  const submit = async () => {
    if (!attempt || submitted.current || isSubmitting) return;
    submitted.current = true;
    setIsSubmitting(true);
    try {
      await quizApi.submitAttempt({ attempt_id: attempt.attempt_id, answers: Object.values(answers) });
      router.push(`/learner/courses/${slug}/tests/${testId}/results`);
    } catch (submitError) {
      submitted.current = false;
      setError(errorMessage(submitError));
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = window.setInterval(() => setTimeLeft((current) => current === null ? null : Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => { if (timeLeft === 0) void submit(); }, [timeLeft]);

  if (error || !attempt) return <div className="mx-auto max-w-[900px] rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm"><h1 className="text-2xl font-bold text-slate-800">{error ? 'Quiz unavailable' : 'Starting quiz...'}</h1>{error && <p className="mt-2 text-slate-500">{error}</p>}<Link href={`/learner/courses/${slug}/tests/${testId}`} className="mt-6 inline-block rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white">Back to quiz</Link></div>;

  const question = attempt.questions[currentIndex];
  if (!question) return null;
  const answer = answers[question.question_id];
  const selected = answer?.selected_option_ids ?? [];
  const chooseOption = (optionId: string) => setAnswers((current) => {
    const currentAnswer = current[question.question_id];
    const isMultiple = question.question_type === 'multiple_choice';
    const nextSelected = isMultiple ? (selected.includes(optionId) ? selected.filter((id) => id !== optionId) : [...selected, optionId]) : [optionId];
    return { ...current, [question.question_id]: { question_id: question.question_id, selected_option_ids: nextSelected } };
  });
  const minutes = timeLeft === null ? null : Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = timeLeft === null ? null : (timeLeft % 60).toString().padStart(2, '0');
  const answeredCount = Object.keys(answers).length;

  return <div className="mx-auto max-w-[1100px] px-4 py-6 text-[#0f3741]"><div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F7444E]">Question {currentIndex + 1} of {attempt.questions.length}</p><h1 className="mt-1 text-xl font-black sm:text-2xl">{attempt.quiz_title || 'Quiz attempt'}</h1></div>{timeLeft === null ? <span className="rounded-full bg-[#edf6f8] px-3 py-2 text-xs font-semibold">Unlimited time</span> : <span className="inline-flex items-center gap-2 rounded-full bg-[#edf6f8] px-3 py-2 text-sm font-semibold"><Clock3 className="h-4 w-4" />{minutes}:{seconds}</span>}</div><div className="grid gap-5 xl:grid-cols-[1.85fr_0.75fr]"><main className="rounded-[18px] border border-[#dfe6df] bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-semibold leading-relaxed sm:text-2xl">{question.content}</h2><div className="mt-6 space-y-3">{question.options.map((option) => <button type="button" key={option.id} onClick={() => chooseOption(option.id)} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium ${selected.includes(option.id) ? 'border-[#F7444E] bg-rose-50 text-[#0f3741]' : 'border-slate-200 hover:bg-slate-50'}`}><span>{option.option_text}</span>{selected.includes(option.id) && <CheckCircle2 className="h-5 w-5 text-[#F7444E]" />}</button>)}</div><div className="mt-8 flex justify-between gap-3"><button type="button" disabled={currentIndex === 0} onClick={() => setCurrentIndex((index) => index - 1)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-40">Previous</button>{currentIndex === attempt.questions.length - 1 ? <button type="button" disabled={isSubmitting} onClick={() => void submit()} className="rounded-xl bg-[#F7444E] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{isSubmitting ? 'Submitting...' : 'Submit quiz'}</button> : <button type="button" onClick={() => setCurrentIndex((index) => index + 1)} className="rounded-xl bg-[#F7444E] px-5 py-2.5 text-sm font-bold text-white">Next</button>}</div></main><aside className="rounded-[18px] border border-[#dfe6df] bg-white p-5 shadow-sm"><h2 className="font-semibold">Navigator</h2><div className="mt-4 grid grid-cols-4 gap-2">{attempt.questions.map((item, index) => <button type="button" key={item.question_id} onClick={() => setCurrentIndex(index)} className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${index === currentIndex ? 'bg-[#F7444E] text-white' : answers[item.question_id] ? 'bg-[#dff5ea] text-[#1d8f69]' : 'bg-[#eaf5f7] text-[#0f3741]'}`}>{index + 1}</button>)}</div><p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">{answeredCount} of {attempt.questions.length} answered</p></aside></div></div>;
}
