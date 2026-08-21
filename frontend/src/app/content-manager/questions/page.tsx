'use client';

import React, { useState } from 'react';
import { Search, Sparkles, Plus, ChevronDown } from 'lucide-react';
import { QuestionItem, DifficultyLevel, QuestionStatus } from '@/types/question';

const SAMPLE_QUESTIONS: QuestionItem[] = [
  {
    id: '1',
    title: 'Which access modifier makes a member visible only inside the declaring..',
    subtopic: 'Encapsulation',
    type: 'Single Choice',
    lesson: 'Access Modifiers',
    difficulty: 'Easy',
    source: 'Human',
    status: 'Published',
  },
  {
    id: '2',
    title: 'Select all statements that are true about interfaces in C#.',
    subtopic: 'Inheritance & Polymorphism',
    type: 'Multiple Choice',
    lesson: 'Interfaces',
    difficulty: 'Medium',
    source: 'AI',
    status: 'Approved',
  },
  {
    id: '3',
    title: 'A struct in C# is a reference type.',
    subtopic: 'Variables and Data Types',
    type: 'True / False',
    lesson: 'Data Types',
    difficulty: 'Easy',
    source: 'Human',
    status: 'Published',
  },
  {
    id: '4',
    title: 'Complete the code: the keyword used to prevent further overriding of a virtu...',
    subtopic: 'Inheritance & Polymorphism',
    type: 'Fill in the Blank',
    lesson: 'virtual, override, sealed',
    difficulty: 'Medium',
    source: 'AI',
    status: 'Draft',
  },
  {
    id: '5',
    title: 'Which LINQ operator returns a projection of each element in a sequence?',
    subtopic: 'Query Operators',
    type: 'Single Choice',
    lesson: 'Select and Where',
    difficulty: 'Easy',
    source: 'Human',
    status: 'Published',
  },
  {
    id: '6',
    title: 'What happens when an exception is thrown inside a finally block?',
    subtopic: 'try / catch / finally',
    type: 'Single Choice',
    lesson: 'The finally Block',
    difficulty: 'Hard',
    source: 'AI',
    status: 'In review',
  },
  {
    id: '7',
    title: 'Which collection guarantees O(1) average lookup by key?',
    subtopic: 'Generic Collections',
    type: 'Single Choice',
    lesson: 'Dictionary<TKey, TValue>',
    difficulty: 'Medium',
    source: 'AI',
    status: 'Approved',
  },
];

function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  const styles: Record<DifficultyLevel, string> = {
    Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
    Hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${styles[level]}`}
    >
      {level}
    </span>
  );
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  const configs: Record<QuestionStatus, { bg: string; dot: string }> = {
    Published: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      dot: 'bg-emerald-500',
    },
    Approved: {
      bg: 'bg-sky-50 text-sky-700 border-sky-200/60',
      dot: 'bg-sky-500',
    },
    'In review': {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      dot: 'bg-amber-500',
    },
    Draft: {
      bg: 'bg-gray-100 text-gray-600 border-gray-200',
      dot: 'bg-gray-400',
    },
  };

  const current = configs[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${current.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      {status}
    </span>
  );
}

export default function QuestionBankPage() {
  const [questions] = useState<QuestionItem[]>(SAMPLE_QUESTIONS);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header & Action Buttons */}
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
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <Sparkles className="h-4 w-4 text-purple-600" />
            Generate with AI
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c93f3a]"
          >
            <Plus className="h-4 w-4" />
            Create question
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
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

          {/* Active Highlighted Filter */}
          <button
            type="button"
            className="inline-flex h-10 items-center justify-between gap-2 rounded-xl border border-teal-600 bg-teal-50/40 px-3.5 text-sm font-medium text-teal-900 transition"
          >
            <span>Any source</span>
            <ChevronDown className="h-4 w-4 text-teal-600" />
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
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
                <tr
                  key={q.id}
                  className="transition-colors hover:bg-gray-50/80"
                >
                  <td className="max-w-md py-4 pl-6 pr-4">
                    <p className="font-medium text-gray-900 line-clamp-1">{q.title}</p>
                    <p className="text-xs text-gray-400">{q.subtopic}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                    {q.type}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-gray-500">
                    {q.lesson}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <DifficultyBadge level={q.difficulty} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {q.source === 'AI' ? (
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