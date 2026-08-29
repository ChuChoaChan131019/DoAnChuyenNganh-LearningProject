'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';

type Question = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
};

type TestDefinition = {
  title: string;
  durationMinutes: number;
  questions: Question[];
};

const TEST_BANK: Record<string, TestDefinition> = {
  'final-assessment': {
    title: 'C# Fundamentals — Final Assessment',
    durationMinutes: 60,
    questions: [
      {
        id: 1,
        question: 'Which access modifier makes a member visible only inside the declaring class?',
        options: ['public', 'private', 'protected', 'internal'],
        correctIndex: 1,
      },
      {
        id: 2,
        question: 'Which data type is used to store a true/false value?',
        options: ['string', 'int', 'bool', 'double'],
        correctIndex: 2,
      },
      {
        id: 3,
        question: 'What is the result of 10 / 3 in C# when using int division?',
        options: ['3.33', '3', '3.0', 'Error'],
        correctIndex: 1,
      },
      {
        id: 4,
        question: 'Which keyword is used to define a constant?',
        options: ['static', 'const', 'readonly', 'final'],
        correctIndex: 1,
      },
      {
        id: 5,
        question: 'Which loop executes at least once before checking the condition?',
        options: ['for', 'while', 'foreach', 'do while'],
        correctIndex: 3,
      },
      {
        id: 6,
        question: 'What value does a variable of type string hold?',
        options: ['A number', 'A boolean', 'A text value', 'A memory address'],
        correctIndex: 2,
      },
    ],
  },
  'variables-quiz': {
    title: 'Variables & Data Types Quiz',
    durationMinutes: 20,
    questions: [
      {
        id: 1,
        question: 'Which keyword declares a floating-point number?',
        options: ['float', 'double', 'decimal', 'string'],
        correctIndex: 0,
      },
      {
        id: 2,
        question: 'What does the var keyword do in C#?',
        options: ['Declares a constant', 'Infers the type from the value', 'Creates a pointer', 'Adds a namespace'],
        correctIndex: 1,
      },
      {
        id: 3,
        question: 'Which type is best for monetary values?',
        options: ['double', 'float', 'decimal', 'int'],
        correctIndex: 2,
      },
      {
        id: 4,
        question: 'How do you write a string literal?',
        options: ['"hello"', "'hello'", '(hello)', '{hello}'],
        correctIndex: 0,
      },
      {
        id: 5,
        question: 'Which operator compares equality?',
        options: ['=', '==', '!=', '=>'],
        correctIndex: 1,
      },
    ],
  },
  'oop-quick-check': {
    title: 'OOP Quick Check',
    durationMinutes: 25,
    questions: [
      {
        id: 1,
        question: 'What is encapsulation?',
        options: ['Combining data and methods', 'Inherited behavior', 'Polymorphic dispatch', 'A loop construct'],
        correctIndex: 0,
      },
      {
        id: 2,
        question: 'Which keyword allows a class to inherit another class?',
        options: ['implements', 'inherits', ':', 'extends'],
        correctIndex: 2,
      },
      {
        id: 3,
        question: 'What is polymorphism?',
        options: ['Multiple methods with same name', 'A static field', 'A type conversion', 'A compile-time error'],
        correctIndex: 0,
      },
    ],
  },
  'linq-mini-practice': {
    title: 'LINQ Mini Practice',
    durationMinutes: 30,
    questions: [
      {
        id: 1,
        question: 'Which LINQ operator filters items?',
        options: ['Select', 'Where', 'OrderBy', 'Any'],
        correctIndex: 1,
      },
      {
        id: 2,
        question: 'Which LINQ operator projects values into a new shape?',
        options: ['Select', 'Where', 'Count', 'GroupBy'],
        correctIndex: 0,
      },
    ],
  },
  'exception-flows': {
    title: 'Exception Handling Drill',
    durationMinutes: 20,
    questions: [
      {
        id: 1,
        question: 'What is the purpose of a finally block?',
        options: ['To catch all exceptions', 'To run code no matter what', 'To declare variables', 'To loop over entries'],
        correctIndex: 1,
      },
      {
        id: 2,
        question: 'Which block catches a thrown exception?',
        options: ['try', 'catch', 'finally', 'throw'],
        correctIndex: 1,
      },
    ],
  },
  'async-challenge': {
    title: 'Async & Tasks Challenge',
    durationMinutes: 35,
    questions: [
      {
        id: 1,
        question: 'What keyword is used to await an async method?',
        options: ['await', 'async', 'task', 'return'],
        correctIndex: 0,
      },
      {
        id: 2,
        question: 'Which type represents an asynchronous operation?',
        options: ['Task', 'List', 'string', 'bool'],
        correctIndex: 0,
      },
    ],
  },
  'interview-mock-test': {
    title: 'OOP Interview Mock Test',
    durationMinutes: 25,
    questions: [
      {
        id: 1,
        question: 'What is abstraction?',
        options: ['Hiding implementation details', 'Using try/catch', 'Declaring a class', 'Creating loops'],
        correctIndex: 0,
      },
      {
        id: 2,
        question: 'Which concept allows one object to act as another?',
        options: ['Inheritance', 'Polymorphism', 'Encapsulation', 'Abstraction'],
        correctIndex: 1,
      },
    ],
  },
};

export default function CourseTestTakePage() {
  const params = useParams();
  const router = useRouter();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
  const testId = Array.isArray(params?.testId) ? params.testId[0] : params?.testId;

  const test = testId ? TEST_BANK[testId] : null;
  const questions = useMemo(() => test?.questions ?? [], [test]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMap, setSelectedMap] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(test?.durationMinutes ? test.durationMinutes * 60 : 0);

  useEffect(() => {
    if (!test) return;
    setTimeLeft(test.durationMinutes * 60);
    setCurrentIndex(0);
    setSelectedMap({});
  }, [test]);

  useEffect(() => {
    if (!test || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [test, timeLeft]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(selectedMap).length;

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  if (!test || !currentQuestion) {
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

  const selectedOption = selectedMap[currentQuestion.id] ?? null;

  const selectOption = (optionIndex: number) => {
    setSelectedMap((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  const submitTest = () => {
    if (!slug || !testId) return;

    const storageKey = `learner-test-${slug}-${testId}`;
    window.localStorage.setItem(storageKey, JSON.stringify(selectedMap));
    router.push(`/learner/courses/${slug}/tests/${testId}/results`);
  };

  const goToQuestion = (index: number) => setCurrentIndex(index);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-5 text-[#0f3741]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="text-[20px] font-black tracking-[-0.04em] text-[#0f3741] sm:text-[24px]">
          {test.title}
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#dfeaf0] bg-[#edf6f8] px-2.5 py-1.5 text-[13px] font-semibold text-[#0f3741]">
          <Clock3 className="h-3.5 w-3.5" />
          {minutes}:{seconds}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.85fr_0.75fr]">
        <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)] sm:p-5">
          <div className="mb-4 text-[13px] font-medium text-slate-500">
            Question {currentIndex + 1} of {questions.length}
          </div>

          <h2 className="mb-5 text-[18px] font-semibold leading-relaxed tracking-[-0.03em] text-[#0f3741] sm:text-[22px]">
            {currentQuestion.question}
          </h2>

          <div className="space-y-2.5">
            {currentQuestion.options.map((option, index) => (
              <button
                key={option}
                onClick={() => selectOption(index)}
                className={`flex w-full items-center justify-between rounded-[12px] border px-3 py-3 text-left text-[15px] font-medium transition sm:text-[16px] ${
                  selectedOption === index
                    ? 'border-[#f3a0a0] bg-[#f8e4e4] text-[#0f3741] shadow-[0_0_0_2px_rgba(247,68,78,0.1)]'
                    : 'border-[#dfe6df] bg-white text-[#0f3741] hover:border-[#c9dfe3] hover:bg-slate-50'
                }`}
              >
                <span>{option}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              onClick={() => currentIndex > 0 && setCurrentIndex((prev) => prev - 1)}
              disabled={currentIndex === 0}
              className="rounded-[10px] border border-[#dfe6df] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#0f3741] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              onClick={() => {
                if (currentIndex < questions.length - 1) {
                  setCurrentIndex((prev) => prev + 1);
                  return;
                }
                submitTest();
              }}
              className="rounded-[10px] bg-[#F7444E] px-4 py-2.5 text-[13px] font-bold text-white"
            >
              {currentIndex === questions.length - 1 ? 'Submit' : 'Next'}
            </button>
          </div>
        </div>

        <div className="rounded-[18px] border border-[#dfe6df] bg-white p-4 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
          <div className="mb-4 text-[17px] font-semibold text-[#0f3741]">Navigator</div>
          <div className="grid grid-cols-3 gap-2.5">
            {questions.map((_, index) => {
              const active = index === currentIndex;
              const answered = selectedMap[questions[index].id] !== undefined;

              return (
                <button
                  key={index}
                  onClick={() => goToQuestion(index)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold transition ${
                    active
                      ? 'bg-[#f7444e] text-white'
                      : answered
                        ? 'bg-[#dff5ea] text-[#1d8f69]'
                        : 'bg-[#eaf5f7] text-[#0f3741]'
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3 text-[12px] text-slate-500">
            {answeredCount} of {questions.length} answered
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f3d6d7]">
            <div className="h-full rounded-full bg-[#f7444e]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
