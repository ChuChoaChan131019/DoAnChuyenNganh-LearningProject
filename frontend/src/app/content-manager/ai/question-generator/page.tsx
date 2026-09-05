'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  RotateCw,
  Edit3,
  Trash2,
  ChevronDown,
  ArrowRight,
  Loader2,
} from 'lucide-react';

/* ==========================================================================
   CENTRALIZED STYLES (ĐỒNG BỘ NÚT & WORKFLOW CARD CHUẨN PILL)
   ========================================================================== */
const STYLES = {
  // Primary Action Button (Dùng cho "Approve all & save to bank" & "Generate questions")
  primaryActionBtn:
    'inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F7444E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#e03b44] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#F7444E]/20 disabled:opacity-50 disabled:cursor-not-allowed',

  // Nút hành động đơn lẻ trong Footer mỗi Card (Edit, Regenerate, Delete)
  cardActionBtn:
    'inline-flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-150 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] focus:outline-none',

  // Nút Delete có icon hồng đỏ đặc trưng
  cardDeleteBtn:
    'inline-flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-150 hover:bg-rose-50/50 hover:border-rose-200 hover:text-rose-600 active:scale-[0.98] focus:outline-none',

  // Nút Approve riêng từng câu (Bo tròn viên thuốc pill, màu đỏ brand)
  cardApproveBtn:
    'inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[#F7444E] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#e03b44] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#F7444E]/20',

  // Card Layouts
  card: 'rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-6 shadow-sm transition-all',

  // Form elements
  label: 'block text-xs font-semibold text-gray-700 mb-1.5',
  input:
    'h-10 w-full rounded-xl border border-gray-200  px-3.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#14919B] focus:outline-none focus:ring-1 focus:ring-[#14919B]',
  select:
    'h-10 w-full appearance-none rounded-xl border border-gray-200 px-3.5 pr-9 text-sm text-gray-900 transition-colors focus:border-[#14919B] focus:outline-none focus:ring-1 focus:ring-[#14919B]',
  textarea:
    'w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#14919B] focus:outline-none focus:ring-1 focus:ring-[#14919B]',

  // Badges
  aiTag:
    'inline-flex items-center gap-1 rounded-md border border-[#B6ECF0] bg-[#E6F7F8] px-2.5 py-0.5 text-xs font-semibold text-[#14919B]',
  difficulty: {
    Easy: 'border-emerald-200/60 bg-emerald-50 text-emerald-700',
    Medium: 'border-amber-200/60 bg-amber-50 text-amber-700',
    Hard: 'border-rose-200/60 bg-rose-50 text-rose-700',
  },

  // Workflow Header Step Bar
  workflowContainer:
    'flex flex-wrap items-center gap-2.5 rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 p-3 shadow-sm',
  workflowPills: {
    aiGenerated:
      'inline-flex items-center rounded-2xl bg-[#EBF8FA] px-4 py-1.5 text-xs font-medium text-[#118A94]',
    neutral:
      'inline-flex items-center rounded-2xl bg-white px-4 py-1.5 text-xs font-medium text-gray-600',
    approved:
      'inline-flex items-center rounded-2xl bg-[#F7444E]/10 px-4 py-1.5 text-xs font-medium text-gray-600',
    published:
      'inline-flex items-center rounded-2xl bg-[#EAF7F0] px-4 py-1.5 text-xs font-medium text-[#0F766E]',
  },

  // Options styling
  optionCorrect:
    'flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 text-sm font-medium text-emerald-900 shadow-sm transition-all',
  optionDefault:
    'flex items-center justify-between rounded-xl border border-gray-200 p-3.5 text-sm text-gray-700 hover:border-gray-300 transition-all',
  letterCircleCorrect:
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-400 bg-white text-xs font-bold text-emerald-700',
  letterCircleDefault:
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-50 text-xs font-semibold text-gray-500',
};

/* ==========================================================================
   TYPES & INTERFACES
   ========================================================================== */
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type QuestionType =
  | 'Single Choice'
  | 'Multiple Choice'
  | 'True / False'
  | 'Fill in the Blank';

export interface AnswerOption {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface GeneratedQuestion {
  id: string;
  title: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  lesson: string;
  options: AnswerOption[];
  explanation: string;
}

/* ==========================================================================
   SAMPLE MOCK DATA
   ========================================================================== */
const INITIAL_QUESTIONS: GeneratedQuestion[] = [
  {
    id: 'q1',
    title: 'Select all statements that are true about interfaces in C#.',
    type: 'Multiple Choice',
    difficulty: 'Medium',
    lesson: 'Interfaces',
    options: [
      { id: 'a', label: 'A', text: 'A class can implement multiple interfaces', isCorrect: true },
      { id: 'b', label: 'B', text: 'Interfaces can declare instance fields', isCorrect: false },
      { id: 'c', label: 'C', text: 'Interfaces may contain default method implementations (C# 8+)', isCorrect: true },
      { id: 'd', label: 'D', text: 'An interface can inherit from another interface', isCorrect: true },
    ],
    explanation:
      'A class can implement many interfaces but inherit only one base class. Since C# 8, interfaces may provide default implementations.',
  },
  {
    id: 'q2',
    title: 'Complete the code: the keyword used to prevent further overriding of a virtual member is ______.',
    type: 'Fill in the Blank',
    difficulty: 'Medium',
    lesson: 'virtual, override, sealed',
    options: [
      { id: 'a', label: 'A', text: 'sealed', isCorrect: true },
    ],
    explanation:
      '`sealed override` stops the member from being overridden further down the hierarchy.',
  },
  {
    id: 'q3',
    title: 'What happens when an exception is thrown inside a `finally` block?',
    type: 'Single Choice',
    difficulty: 'Hard',
    lesson: 'The finally Block',
    options: [
      { id: 'a', label: 'A', text: 'It is silently swallowed', isCorrect: false },
      { id: 'b', label: 'B', text: 'It replaces the original exception and propagates', isCorrect: true },
      { id: 'c', label: 'C', text: 'The runtime terminates immediately', isCorrect: false },
      { id: 'd', label: 'D', text: 'It is wrapped in an AggregateException', isCorrect: false },
    ],
    explanation:
      'The new exception replaces the in-flight exception and propagates up, which is why finally blocks should not throw.',
  },
  {
    id: 'q4',
    title: 'Which collection guarantees O(1) average lookup by key?',
    type: 'Single Choice',
    difficulty: 'Medium',
    lesson: 'Dictionary<TKey, TValue>',
    options: [
      { id: 'a', label: 'A', text: 'List<T>', isCorrect: false },
      { id: 'b', label: 'B', text: 'Dictionary<TKey, TValue>', isCorrect: true },
      { id: 'c', label: 'C', text: 'Queue<T>', isCorrect: false },
      { id: 'd', label: 'D', text: 'LinkedList<T>', isCorrect: false },
    ],
    explanation:
      'Dictionary<TKey, TValue> is hash-based, giving amortised O(1) lookups.',
  },
];

/* ==========================================================================
   PAGE COMPONENT
   ========================================================================== */
export default function AIQuestionGeneratorPage() {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(INITIAL_QUESTIONS);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form State
  const [course, setCourse] = useState('Object-Oriented Programming in C#');
  const [chapter, setChapter] = useState('Inheritance & Polymorphism');
  const [lesson, setLesson] = useState('Interfaces');
  const [topic, setTopic] = useState('Interface vs abstract class');
  const [questionType, setQuestionType] = useState<QuestionType>('Multiple Choice');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [count, setCount] = useState<number>(8);
  const [instructions, setInstructions] = useState(
    'Include one code-reading question using a C# snippet.'
  );

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 1000);
  };

  const handleApproveOne = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleApproveAll = () => {
    setQuestions([]);
  };

  const handleDeleteOne = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header & Workflow Progress */}
      <div className="space-y-4">
        <div>
          <span className={STYLES.aiTag}>
            <Sparkles className="h-3.5 w-3.5" />
            AI assisted
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            AI Question Generator
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Generated questions never publish automatically — they enter the review workflow[cite: 1].
          </p>
        </div>

        {/* Workflow Steps Indicator */}
        <div className={STYLES.workflowContainer}>
          <span className={STYLES.workflowPills.aiGenerated}>
            AI generated
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400 stroke-[1.5]" />
          <span className={STYLES.workflowPills.neutral}>
            Draft
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400 stroke-[1.5]" />
          <span className={STYLES.workflowPills.neutral}>
            Review
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400 stroke-[1.5]" />
          <span className={STYLES.workflowPills.approved}>
            Approved
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-gray-400 stroke-[1.5]" />
          <span className={STYLES.workflowPills.published}>
            Published
          </span>
        </div>
      </div>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column: Generation Setup */}
        <div className={`space-y-4 lg:col-span-4 ${STYLES.card}`}>
          <h2 className="text-base font-bold text-gray-900">Generation setup</h2>

          <div className="space-y-3.5">
            <div>
              <label className={STYLES.label}>Course</label>
              <div className="relative">
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className={STYLES.select}
                >
                  <option>Object-Oriented Programming in C#</option>
                  <option>C# Fundamentals</option>
                  <option>Collections and LINQ</option>
                  <option>Exception Handling in C#</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className={STYLES.label}>Chapter</label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                className={STYLES.input}
              />
            </div>

            <div>
              <label className={STYLES.label}>Lesson</label>
              <input
                type="text"
                value={lesson}
                onChange={(e) => setLesson(e.target.value)}
                className={STYLES.input}
              />
            </div>

            <div>
              <label className={STYLES.label}>Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className={STYLES.input}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={STYLES.label}>Question type</label>
                <div className="relative">
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                    className={STYLES.select}
                  >
                    <option>Single Choice</option>
                    <option>Multiple Choice</option>
                    <option>True / False</option>
                    <option>Fill in the Blank</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div>
                <label className={STYLES.label}>Difficulty</label>
                <div className="relative">
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                    className={STYLES.select}
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className={STYLES.label}>Count</label>
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
                className={STYLES.input}
              />
            </div>

            <div>
              <label className={STYLES.label}>Additional instructions</label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className={STYLES.textarea}
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full ${STYLES.primaryActionBtn}`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating questions...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate questions
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Pending Decisions */}
        <div className="space-y-4 lg:col-span-8">
          {/* Top Bar Summary & Inline Action Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <span className="text-sm font-medium text-gray-600">
              {questions.length} generated questions pending your decision
            </span>
            {questions.length > 0 && (
              <button
                type="button"
                onClick={handleApproveAll}
                className={STYLES.primaryActionBtn}
              >
                <Check className="h-4 w-4" />
                Approve all &amp; save to bank
              </button>
            )}
          </div>

          {/* Cards List */}
          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900">All questions approved!</h3>
              <p className="mt-1 text-sm text-gray-500">
                Generate new questions using the panel on the left.
              </p>
            </div>
          ) : (
            questions.map((question) => (
              <div key={question.id} className={`space-y-4 ${STYLES.card}`}>
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={STYLES.aiTag}>
                    <Sparkles className="h-3 w-3" />
                    AI generated
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${
                      STYLES.difficulty[question.difficulty]
                    }`}
                  >
                    {question.difficulty}
                  </span>
                  <span className="text-xs text-gray-400">
                    {question.type} · {question.lesson}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold leading-snug text-gray-900">
                  {question.title}
                </h3>

                {/* Options List */}
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <div
                      key={option.id}
                      className={option.isCorrect ? STYLES.optionCorrect : STYLES.optionDefault}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            option.isCorrect
                              ? STYLES.letterCircleCorrect
                              : STYLES.letterCircleDefault
                          }
                        >
                          {option.label}
                        </span>
                        <span>{option.text}</span>
                      </div>
                      {option.isCorrect && (
                        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3.5 text-xs text-gray-600">
                  <span className="font-bold text-gray-900">Explanation · </span>
                  {question.explanation}
                </div>

                {/* Fixed Card Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2.5">
                    <button type="button" className={STYLES.cardActionBtn}>
                      <Edit3 className="h-4 w-4 text-gray-600" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions((prev) =>
                          prev.map((q) =>
                            q.id === question.id
                              ? { ...q, title: `${q.title} (Regenerated)` }
                              : q
                          )
                        )
                      }
                      className={STYLES.cardActionBtn}
                    >
                      <RotateCw className="h-4 w-4 text-gray-600" />
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOne(question.id)}
                      className={STYLES.cardDeleteBtn}
                    >
                      <Trash2 className="h-4 w-4 text-[#F7444E]" />
                      Delete
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApproveOne(question.id)}
                    className={STYLES.cardApproveBtn}
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}