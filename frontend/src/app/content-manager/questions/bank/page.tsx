'use client';

import React, { useState } from 'react';
import { Search, Sparkles, Plus, ChevronDown } from 'lucide-react';
import { QuestionItem, DifficultyLevel, QuestionStatus, QuestionType } from '@/types/question';

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
  hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
};

const STATUS_CONFIGS: Record<QuestionStatus, { bg: string; dot: string; label: string }> = {
  approved: {
    bg: 'bg-sky-50 text-sky-700 border-sky-200/60',
    dot: 'bg-sky-500',
    label: 'Approved',
  },
  draft: {
    bg: 'bg-gray-100 text-gray-600 border-gray-200',
    dot: 'bg-gray-400',
    label: 'Draft',
  },
};

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  fill_in_blank: 'Fill in the Blank',
};

const SAMPLE_QUESTIONS: QuestionItem[] = [
  {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    course_id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    content: 'Which access modifier makes a member visible only inside the declaring class?',
    subtopic: 'Encapsulation',
    question_type: 'single_choice',
    lesson_title: 'Access Modifiers',
    difficulty: 'easy',
    is_ai_generated: false,
    status: 'approved',
    created_at: '2026-05-18T10:00:00Z',
  },
  {
    id: 'a2b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e',
    course_id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    content: 'Select all statements that are true about interfaces in C#.',
    subtopic: 'Inheritance & Polymorphism',
    question_type: 'multiple_choice',
    lesson_title: 'Interfaces',
    difficulty: 'medium',
    is_ai_generated: true,
    status: 'approved',
    created_at: '2026-05-19T11:30:00Z',
  },
  {
    id: 'a3b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6f',
    course_id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    content: 'A struct in C# is a reference type.',
    subtopic: 'Variables and Data Types',
    question_type: 'true_false',
    lesson_title: 'Data Types',
    difficulty: 'easy',
    is_ai_generated: false,
    status: 'approved',
    created_at: '2026-05-20T08:15:00Z',
  },
  {
    id: 'a4b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c70',
    course_id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    content: 'Complete the code: the keyword used to prevent further overriding of a virtual member is ______.',
    subtopic: 'Inheritance & Polymorphism',
    question_type: 'fill_in_blank',
    lesson_title: 'virtual, override, sealed',
    difficulty: 'medium',
    is_ai_generated: true,
    status: 'draft',
    created_at: '2026-05-21T14:00:00Z',
  },
];

function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  const formatted = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${DIFFICULTY_STYLES[level]}`}>
      {formatted}
    </span>
  );
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  const current = STATUS_CONFIGS[status] || STATUS_CONFIGS.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${current.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
}

export default function QuestionBankPage() {
  const [questions] = useState<QuestionItem[]>(SAMPLE_QUESTIONS);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Question bank
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            965 questions covering C# syntax, OOP pillars, collections, LINQ and exceptions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Sparkles className="h-4 w-4 text-purple-600" />
            Generate with AI
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c93f3a]"
          >
            <Plus className="h-4 w-4" />
            Create question
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-[#FFFAFC]/50 p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 transition focus:border-teal-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-700 transition hover:bg-gray-50"
          >
            <span>All courses</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-700 transition hover:bg-gray-50"
          >
            <span>Any difficulty</span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-between gap-2 rounded-xl border border-teal-600 bg-teal-50/40 px-3.5 text-sm font-medium text-teal-900 transition"
          >
            <span>Any source</span>
            <ChevronDown className="h-4 w-4 text-teal-600" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="border-b border-gray-100 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="py-4 pl-6 pr-4">Question</th>
                <th scope="col" className="px-4 py-4">Type</th>
                <th scope="col" className="px-4 py-4">Lesson</th>
                <th scope="col" className="px-4 py-4">Difficulty</th>
                <th scope="col" className="px-4 py-4">Source</th>
                <th scope="col" className="py-4 pl-4 pr-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questions.map((q) => (
                <tr key={q.id} className="transition-colors hover:bg-gray-50/80">
                  <td className="max-w-md py-4 pl-6 pr-4">
                    <p className="font-medium text-gray-900 line-clamp-1">{q.content}</p>
                    <p className="text-xs text-gray-400">{q.subtopic || 'General'}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                    {TYPE_LABELS[q.question_type] || q.question_type}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                    {q.lesson_title || 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <DifficultyBadge level={q.difficulty} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {q.is_ai_generated ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                        <Sparkles className="h-3 w-3 text-sky-500" />
                        AI
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-gray-600">
                        Human
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-4 pl-4 pr-6">
                    <StatusBadge status={q.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}