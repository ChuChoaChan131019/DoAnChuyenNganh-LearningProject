'use client';

import React, { useEffect, useState } from 'react';
import { Brain, CheckCircle2, Loader2, Target, XCircle, Zap } from 'lucide-react';
import { practiceApi } from '@/lib/api';
import type { PracticeOverview, PracticeQuestion } from '@/types/practice';

type PracticeMode = 'quick' | 'weak' | 'course' | 'ai';

type AnswerResult = {
  is_correct: boolean;
  explanation: string | null;
};

export default function PracticePage() {
  const [overview, setOverview] = useState<PracticeOverview>({ courses: [], weakTopics: [] });
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [mode, setMode] = useState<PracticeMode | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [answerText, setAnswerText] = useState('');
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [score, setScore] = useState(0);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    try {
      const nextOverview = await practiceApi.overview();
      setOverview(nextOverview);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load practice overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    practiceApi.overview()
      .then(setOverview)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  const startPractice = async (nextMode: PracticeMode, courseId?: string) => {
    setStarting(true);
    setError('');
    setResult(null);
    setSelectedOptions([]);
    setAnswerText('');
    setScore(0);
    setAttemptId(null);

    try {
      let nextQuestions: PracticeQuestion[];
      if (nextMode === 'ai') {
        const response = await practiceApi.ai(courseId);
        nextQuestions = response.questions.questions;
      } else {
        const response = await practiceApi.questions(nextMode, courseId);
        nextQuestions = response.questions;
      }
      const attempt = nextQuestions.length
        ? await practiceApi.createAttempt({ mode: nextMode, course_id: courseId, total_questions: nextQuestions.length })
        : null;
      setQuestions(nextQuestions);
      setCurrentIndex(0);
      setMode(nextMode);
      setAttemptId(attempt?.id ?? null);
      if (nextQuestions.length === 0) setError('Chưa có câu hỏi phù hợp cho bộ luyện tập này.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể tạo bộ luyện tập.');
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion || result || checking) return;

    setChecking(true);
    try {
      const answer = await practiceApi.check({
        question_id: currentQuestion.id,
        option_ids: selectedOptions,
        answer_text: answerText,
        attempt_id: attemptId ?? undefined,
      });
      setResult(answer);
      if (answer.is_correct) setScore((value) => value + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to check the answer.');
    } finally {
      setChecking(false);
    }
  };

  const finishPractice = async () => {
    if (attemptId) {
      try {
        await practiceApi.completeAttempt(attemptId);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to save practice result.');
        return;
      }
    }
    await loadOverview();
    setMode(null);
    setQuestions([]);
    setAttemptId(null);
  };

  const nextQuestion = () => {
    setResult(null);
    setSelectedOptions([]);
    setAnswerText('');
    setCurrentIndex((value) => value + 1);
  };

  const currentQuestion = questions[currentIndex];
  if (mode && currentQuestion) {
    const isMultiple = currentQuestion.question_type === 'multiple_choice';
    const isFillIn = currentQuestion.question_type === 'fill_in_blank';

    return (
      <div className="mx-auto max-w-[820px] space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#145a68]">Practice session</p>
            <h1 className="text-2xl font-bold text-[#0f3741]">
              {mode === 'ai' ? 'AI Practice' : mode === 'weak' ? 'Weak topics' : mode === 'course' ? 'Course practice' : 'Quick drill'}
            </h1>
          </div>
          <span className="text-sm font-semibold text-slate-500">{currentIndex + 1} / {questions.length}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-[#f7444e] transition-all" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
        </div>
        <section className="rounded-2xl border border-[#dfe6df] bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span>{currentQuestion.courses?.title ?? 'Course'}{currentQuestion.chapters ? ` · ${currentQuestion.chapters.title}` : ''}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">{currentQuestion.difficulty}</span>
          </div>
          <h2 className="text-xl font-semibold leading-relaxed text-[#0f3741]">{currentQuestion.content}</h2>
          {isFillIn ? (
            <input
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
              className="mt-7 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#f7444e]"
              placeholder="Nhập câu trả lời"
              disabled={Boolean(result)}
            />
          ) : (
            <div className="mt-7 space-y-3">
              {currentQuestion.question_options.map((option) => {
                const selected = selectedOptions.includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOptions(isMultiple
                      ? selected ? selectedOptions.filter((id) => id !== option.id) : [...selectedOptions, option.id]
                      : [option.id])}
                    disabled={Boolean(result)}
                    className={`flex w-full items-center rounded-xl border px-4 py-3 text-left text-sm transition ${selected ? 'border-[#f7444e] bg-rose-50 text-[#0f3741]' : 'border-slate-200 hover:border-slate-300'} ${result ? 'cursor-default' : ''}`}
                  >
                    {option.option_text}
                  </button>
                );
              })}
            </div>
          )}
          {result && (
            <div className={`mt-6 rounded-xl p-4 text-sm ${result.is_correct ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              <div className="flex items-center gap-2 font-semibold">
                {result.is_correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {result.is_correct ? 'Correct' : 'Not quite'}
              </div>
              {result.explanation && <p className="mt-2 leading-relaxed">{result.explanation}</p>}
            </div>
          )}
          <div className="mt-7 flex justify-end gap-3">
            <button onClick={() => { setMode(null); setQuestions([]); setAttemptId(null); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Exit</button>
            {result ? (
              <button onClick={currentIndex + 1 < questions.length ? nextQuestion : finishPractice} className="rounded-xl bg-[#f7444e] px-5 py-2 text-sm font-semibold text-white">
                {currentIndex + 1 < questions.length ? 'Next question' : `Finish · ${score}/${questions.length}`}
              </button>
            ) : (
              <button onClick={submitAnswer} disabled={checking || (!selectedOptions.length && !answerText.trim())} className="rounded-xl bg-[#f7444e] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{checking ? 'Checking...' : 'Check answer'}</button>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1216px] space-y-[22px]">
      <header>
        <p className="mb-1 text-sm font-medium text-[#145a68]">Learn</p>
        <h1 className="text-[32px] font-bold tracking-tight text-[#0f3741]">Practice</h1>
        <p className="mt-1 text-sm text-slate-500">Luyện tập ngắn, tập trung, với phản hồi và giải thích ngay sau mỗi câu.</p>
      </header>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      <div className="grid grid-cols-1 gap-[22px] md:grid-cols-3">
        <PracticeCard icon={<Zap className="h-5 w-5" />} title="Quick drill" description="10 câu hỏi trộn từ tất cả khóa học bạn đang tham gia." onClick={() => startPractice('quick')} disabled={loading || starting} />
        <PracticeCard icon={<Brain className="h-5 w-5" />} title="Weak topics" description="Tập trung vào các chủ đề có độ chính xác thấp nhất trong 30 ngày qua." onClick={() => startPractice('weak')} disabled={loading || starting || overview.weakTopics.length === 0} />
        <PracticeCard icon={<Target className="h-5 w-5" />} title="AI Practice" description="Bộ câu hỏi cá nhân hóa theo lịch sử và tiến độ của bạn." onClick={() => startPractice('ai')} disabled={loading || starting} />
      </div>
      <div className="grid grid-cols-1 gap-[22px] md:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-sm">
          <div className="border-b border-[#dfe6df] px-[18px] py-[15px]"><h2 className="text-[15px] font-bold text-[#0f3741]">Practice by course</h2></div>
          <div className="space-y-2 p-[18px]">
            {overview.courses.map((course) => <div key={course.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"><span className="text-sm font-medium text-[#145a68]">{course.title}</span><button onClick={() => startPractice('course', course.id)} disabled={starting} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">Practice</button></div>)}
            {!loading && overview.courses.length === 0 && <p className="text-sm text-slate-500">Bạn chưa tham gia khóa học nào.</p>}
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-[#dfe6df] bg-[#fbfdf9] shadow-sm">
          <div className="border-b border-[#dfe6df] px-[18px] py-[15px]"><h2 className="text-[15px] font-bold text-[#0f3741]">Your weakest topics</h2><p className="mt-0.5 text-[13px] text-slate-500">Accuracy over the last 30 days</p></div>
          <div className="space-y-3 p-[18px]">{overview.weakTopics.map((topic) => <div key={topic.id} className="flex items-center justify-between"><span className="text-sm font-medium text-[#145a68]">{topic.name}</span><span className="text-sm font-bold text-[#0f3741]">{topic.accuracy}%</span></div>)}{!loading && overview.weakTopics.length === 0 && <p className="text-sm text-slate-500">Làm vài bài quiz để hệ thống nhận diện chủ đề cần củng cố.</p>}</div>
          <button onClick={() => startPractice('weak')} disabled={starting || !overview.weakTopics.length} className="mx-[18px] mb-[18px] w-[calc(100%-36px)] rounded-xl border border-slate-300 py-2 text-sm font-semibold text-[#0f3741] disabled:opacity-50">Drill weak topics</button>
        </section>
      </div>
      {starting && <div className="flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Đang tạo bộ câu hỏi...</div>}
    </div>
  );
}

function PracticeCard({ icon, title, description, onClick, disabled }: { icon: React.ReactNode; title: string; description: string; onClick: () => void; disabled: boolean }) {
  return <section className="flex flex-col rounded-2xl border border-[#dfe6df] bg-white p-[18px] shadow-sm"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-[#f7444e]">{icon}</div><h2 className="mb-1 text-[15px] font-bold text-[#0f3741]">{title}</h2><p className="mb-4 flex-1 text-sm leading-relaxed text-slate-500">{description}</p><button onClick={onClick} disabled={disabled} className="w-full rounded-xl bg-[#f7444e] py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50">Start</button></section>;
}
