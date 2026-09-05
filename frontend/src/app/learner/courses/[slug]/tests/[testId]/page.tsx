'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

const TEST_META: Record<string, { title: string; courseLabel: string; duration: string; questions: number; difficulty: string; description: string }> = {
  'final-assessment': {
    title: 'C# Fundamentals — Final Assessment',
    courseLabel: 'C# Fundamentals',
    duration: '60 minutes, timed — the test submits automatically at zero',
    questions: 6,
    difficulty: 'Medium',
    description: 'You can move freely between questions before submitting',
  },
  'variables-quiz': {
    title: 'Variables & Data Types Quiz',
    courseLabel: 'C# Fundamentals',
    duration: '20 minutes, timed — the test submits automatically at zero',
    questions: 15,
    difficulty: 'Easy',
    description: 'You can move freely between questions before submitting',
  },
  'oop-quick-check': {
    title: 'OOP Quick Check',
    courseLabel: 'Object-Oriented Programming in C#',
    duration: '25 minutes, timed — the test submits automatically at zero',
    questions: 5,
    difficulty: 'Medium',
    description: 'You can move freely between questions before submitting',
  },
  'linq-mini-practice': {
    title: 'LINQ Mini Practice',
    courseLabel: 'Collections and LINQ',
    duration: '30 minutes, timed — the test submits automatically at zero',
    questions: 7,
    difficulty: 'Medium',
    description: 'You can move freely between questions before submitting',
  },
  'exception-flows': {
    title: 'Exception Handling Drill',
    courseLabel: 'Exception Handling in C#',
    duration: '20 minutes, timed — the test submits automatically at zero',
    questions: 6,
    difficulty: 'Medium',
    description: 'You can move freely between questions before submitting',
  },
  'async-challenge': {
    title: 'Async & Tasks Challenge',
    courseLabel: 'Advanced C#: Delegates, Events & Async',
    duration: '35 minutes, timed — the test submits automatically at zero',
    questions: 8,
    difficulty: 'Hard',
    description: 'You can move freely between questions before submitting',
  },
  'interview-mock-test': {
    title: 'OOP Interview Mock Test',
    courseLabel: 'C# & OOP Interview Preparation',
    duration: '25 minutes, timed — the test submits automatically at zero',
    questions: 5,
    difficulty: 'Hard',
    description: 'You can move freely between questions before submitting',
  },
};

export default function CourseTestIntroPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const testId = Array.isArray(params?.testId) ? params.testId[0] : params?.testId;
  const meta = testId ? TEST_META[testId] : null;

  if (!meta) {
    return (
      <div className="mx-auto max-w-[900px] rounded-[16px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Test not found</h1>
        <p className="mt-2 text-slate-500">This test does not exist for this course.</p>
        <Link href={slug ? `/learner/courses/${slug}` : '/learner/courses'} className="mt-6 inline-flex rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white">
          Back to course
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[600px] max-w-[980px] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[760px] rounded-[20px] border border-[#dfe4df] bg-white/95 p-5 shadow-[0_8px_18px_rgba(0,44,62,0.04)] sm:p-7">
        <div className="border-b border-[#e7e9e6] pb-4 text-center sm:text-left">
          <div className="text-[15px] font-semibold tracking-[-0.02em] text-[#0f3741]
            sm:text-[17px]">
            {meta.title}
          </div>
          <div className="mt-2 text-[15px] text-slate-500">{meta.courseLabel}</div>
        </div>

        <div className="mt-6 space-y-4 px-1 text-[15px] leading-8 text-[#3c4d54]">
          <div>{meta.questions} questions in this attempt</div>
          <div>{meta.duration}</div>
          <div>{meta.description}</div>
        </div>

        <div className="mt-6 flex justify-center sm:justify-start">
          <span className="inline-flex rounded-full bg-[#f5e7d9] px-3 py-1 text-[13px] font-bold text-[#b75a15] shadow-sm">
            {meta.difficulty}
          </span>
        </div>

        <div className="mt-8">
          <Link
            href={slug ? `/learner/courses/${slug}/tests/${testId}/take` : '/learner/practice'}
            className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-[#f7444e] text-[18px] font-bold text-white shadow-[0_8px_18px_rgba(247,68,78,0.18)] transition hover:bg-[#eb3d42]"
          >
            Start test
          </Link>
        </div>
      </div>
    </div>
  );
}
