'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const TEST_BANK: Record<string, { title: string; questions: { id: number; question: string; options: string[]; correctIndex: number; explanation: string }[] }> = {
  'final-assessment': {
    title: 'C# Fundamentals — Final Assessment',
    questions: [
      {
        id: 1,
        question: 'Which access modifier makes a member visible only inside the declaring class?',
        options: ['public', 'private', 'protected', 'internal'],
        correctIndex: 1,
        explanation: 'private restricts access to the declaring type. protected also allows derived types, internal allows the same assembly, and public allows everyone.',
      },
      {
        id: 2,
        question: 'Select all statements that are true about interfaces in C#.',
        options: [
          'A class can implement multiple interfaces',
          'Interfaces can declare instance fields',
          'Interfaces may contain default implementations (C# 8+)',
          'An interface can inherit from another interface',
        ],
        correctIndex: 0,
        explanation: 'A class can implement many interfaces, interfaces may have default methods, and they can inherit from each other. They cannot declare instance fields.',
      },
      {
        id: 3,
        question: 'A struct in C# is a reference type.',
        options: ['True', 'False'],
        correctIndex: 1,
        explanation: 'A struct is a value type stored inline; classes are reference types stored on the heap.',
      },
      {
        id: 4,
        question: 'Complete the code: the keyword used to prevent further overriding of a virtual member is _________.',
        options: ['sealed', 'private', 'static', 'override'],
        correctIndex: 0,
        explanation: 'sealed prevents the member from being overridden further down the hierarchy.',
      },
      {
        id: 5,
        question: 'Which LINQ operator returns a projection of each element in a sequence?',
        options: ['Where', 'Select', 'Aggregate', 'OrderBy'],
        correctIndex: 1,
        explanation: 'Select projects each element; Where filters, Aggregate reduces, OrderBy sorts.',
      },
      {
        id: 6,
        question: 'What happens when an exception is thrown inside a finally block?',
        options: ['It is ignored', 'It replaces the original exception and propagates', 'The method exits silently', 'The program continues normally'],
        correctIndex: 1,
        explanation: 'The new exception replaces the original exception and propagates up, which is why finally blocks should not throw.',
      },
    ],
  },
  'variables-quiz': {
    title: 'Variables & Data Types Quiz',
    questions: [
      {
        id: 1,
        question: 'Which keyword declares a floating-point number?',
        options: ['float', 'double', 'decimal', 'string'],
        correctIndex: 0,
        explanation: 'float is the correct keyword for a floating-point value. double is also valid, but float is the direct match here.',
      },
      {
        id: 2,
        question: 'What does var keyword do in C#?',
        options: ['Declares a constant', 'Infers the type from the value', 'Creates a pointer', 'Adds a namespace'],
        correctIndex: 1,
        explanation: 'var lets C# infer the type at compile time from the assigned value.',
      },
      {
        id: 3,
        question: 'Which type is best for monetary values?',
        options: ['double', 'float', 'decimal', 'int'],
        correctIndex: 2,
        explanation: 'decimal is designed for financial and exact decimal calculations.',
      },
    ],
  },
};

export default function CourseTestResultsPage() {
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const testId = Array.isArray(params?.testId) ? params.testId[0] : params?.testId;

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!slug || !testId) return;
    const stored = window.localStorage.getItem(`learner-test-${slug}-${testId}`);
    if (stored) {
      setAnswers(JSON.parse(stored));
    }
  }, [slug, testId]);

  const test = testId ? TEST_BANK[testId] : null;

  const review = useMemo(() => {
    if (!test) return [];

    return test.questions.map((question) => {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correctIndex;

      return {
        ...question,
        userAnswer,
        isCorrect,
      };
    });
  }, [answers, test]);

  const correctCount = review.filter((item) => item.isCorrect).length;
  const scorePercent = review.length ? Math.round((correctCount / review.length) * 100) : 0;
  const progressWidth = `${scorePercent}%`;

  if (!test) {
    return (
      <div className="mx-auto max-w-[900px] rounded-[16px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Result not found</h1>
        <p className="mt-2 text-slate-500">No result is available for this test.</p>
        <Link href={slug ? `/learner/courses/${slug}` : '/learner/courses'} className="mt-6 inline-flex rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white">
          Back to course
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[980px] px-4 py-8">
      <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)] sm:p-6">
        <div className="text-center text-[18px] font-bold text-[#0f3741]">Results</div>
        <div className="mt-2 text-center text-[18px] font-medium text-slate-500">{test.title}</div>

        <div className="mt-6 flex flex-col items-center justify-center">
          <div className="text-[54px] font-black tracking-[-0.06em] text-[#0f3741]">{scorePercent}%</div>
          <div className="mt-1 text-[14px] text-slate-500">{correctCount} of {review.length} correct</div>
          <div className="mt-4 h-2.5 w-full max-w-[420px] overflow-hidden rounded-full bg-[#f5dfe2]">
            <div className="h-full rounded-full bg-[#f7444e]" style={{ width: progressWidth }} />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)] sm:p-6">
        <div className="mb-3 text-[20px] font-bold text-[#0f3741]">Review</div>

        <div className="space-y-4">
          {review.map((item, idx) => {
            const correctOption = item.options[item.correctIndex];
            const userSelected = item.userAnswer !== undefined ? item.options[item.userAnswer] : null;

            return (
              <div key={item.id} className="rounded-[14px] border border-[#dfe6df] bg-[#f9faf8] p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${item.isCorrect ? 'bg-[#dff5ea] text-[#1b8f62]' : 'bg-[#f7dfe0] text-[#d93e4f]'}`}>
                    {item.isCorrect ? '✓' : '✕'}
                  </div>

                  <div className="flex-1">
                    <div className="text-[16px] font-semibold leading-relaxed text-[#0f3741]">
                      {idx + 1}. {item.question}
                    </div>

                    <div className="mt-2 text-[14px] text-slate-600">
                      {item.isCorrect ? 'Correct answer:' : 'Correct answer:'} {correctOption}
                    </div>

                    <div className="mt-2 text-[14px] leading-relaxed text-slate-600">
                      {item.explanation}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <Link
            href={slug ? `/learner/courses/${slug}` : '/learner/courses'}
            className="flex h-[46px] w-full items-center justify-center rounded-[12px] border border-[#dfe6df] bg-white text-[15px] font-semibold text-[#0f3741] transition hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
