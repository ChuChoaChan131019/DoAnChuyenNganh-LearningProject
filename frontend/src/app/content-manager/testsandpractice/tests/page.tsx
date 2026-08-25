'use client';

import React, { useState } from 'react';
import { Plus, Clock, Users } from 'lucide-react';
import { TestItem, DifficultyLevel, TestStatus } from '@/types/test';

// ==========================================
// CENTRALIZED STYLES (Đầu file)
// ==========================================
const STYLES = {
  // Layout & Cards
  pageContainer: 'mx-auto max-w-7xl space-y-6',
  tableCard: 'overflow-hidden rounded-2xl border border-gray-200/80 bg-[#FFFAFC]/50 shadow-sm',
  
  // Table Styling
  thead: 'border-b border-gray-100 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-500',
  trHover: 'transition-colors hover:bg-gray-50/80',

  // Actions
  createBtn:
    'inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c93f3a] active:scale-[0.98]',

  // Dynamic Badges
  difficultyBadges: {
    Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
    Hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
  },
  statusBadges: {
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
  },
};

// ==========================================
// MOCK DATA (6 mẫu ban đầu)
// ==========================================
const SAMPLE_TESTS: TestItem[] = [
  {
    id: '1',
    title: 'C# Fundamentals — Final Assessment',
    createdAt: '2026-05-18',
    course: 'C# Fundamentals',
    questionsCount: 40,
    durationMinutes: 60,
    difficulty: 'Medium',
    status: 'Published',
    attemptsCount: 412,
  },
  {
    id: '2',
    title: 'Variables & Data Types Quiz',
    createdAt: '2026-05-22',
    course: 'C# Fundamentals',
    questionsCount: 15,
    durationMinutes: 20,
    difficulty: 'Easy',
    status: 'Published',
    attemptsCount: 658,
  },
  {
    id: '3',
    title: 'OOP Pillars Checkpoint',
    createdAt: '2026-06-09',
    course: 'OOP in C#',
    questionsCount: 25,
    durationMinutes: 35,
    difficulty: 'Medium',
    status: 'Approved',
    attemptsCount: 240,
  },
  {
    id: '4',
    title: 'Inheritance & Polymorphism Deep Dive',
    createdAt: '2026-07-02',
    course: 'OOP in C#',
    questionsCount: 30,
    durationMinutes: 45,
    difficulty: 'Hard',
    status: 'Draft',
    attemptsCount: 0,
  },
  {
    id: '5',
    title: 'LINQ Practice Set',
    createdAt: '2026-07-15',
    course: 'Collections and LINQ',
    questionsCount: 20,
    durationMinutes: 25,
    difficulty: 'Medium',
    status: 'Published',
    attemptsCount: 189,
  },
  {
    id: '6',
    title: 'Exception Handling Mock Test',
    createdAt: '2026-08-03',
    course: 'Exception Handling in C#',
    questionsCount: 18,
    durationMinutes: 30,
    difficulty: 'Hard',
    status: 'In review',
    attemptsCount: 0,
  },
];

// ==========================================
// SUB-COMPONENTS
// ==========================================
function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${STYLES.difficultyBadges[level]}`}
    >
      {level}
    </span>
  );
}

function StatusBadge({ status }: { status: TestStatus }) {
  const current = STYLES.statusBadges[status] || STYLES.statusBadges.Draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${current.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      {status}
    </span>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function TestsPage() {
  const [tests] = useState<TestItem[]>(SAMPLE_TESTS);

  const handleCreateTest = () => {
    alert('Navigating to test builder...');
  };

  return (
    <div className={STYLES.pageContainer}>
      {/* Header & Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Tests
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Assessments built from the C# question bank.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreateTest}
            className={STYLES.createBtn}
          >
            <Plus className="h-4 w-4" />
            Create test
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className={STYLES.tableCard}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className={STYLES.thead}>
              <tr>
                <th scope="col" className="py-4 pl-6 pr-4">Test</th>
                <th scope="col" className="px-4 py-4">Course</th>
                <th scope="col" className="px-4 py-4">Questions</th>
                <th scope="col" className="px-4 py-4">Duration</th>
                <th scope="col" className="px-4 py-4">Difficulty</th>
                <th scope="col" className="px-4 py-4">Status</th>
                <th scope="col" className="py-4 pl-4 pr-6">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tests.map((test) => (
                <tr key={test.id} className={STYLES.trHover}>
                  <td className="max-w-md py-4 pl-6 pr-4">
                    <p className="font-semibold text-gray-900 line-clamp-1">
                      {test.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Created {test.createdAt}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-gray-700 font-medium text-xs sm:text-sm">
                    {test.course}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-gray-600 font-medium">
                    {test.questionsCount}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {test.durationMinutes} min
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4">
                    <DifficultyBadge level={test.difficulty} />
                  </td>

                  <td className="whitespace-nowrap px-4 py-4">
                    <StatusBadge status={test.status} />
                  </td>

                  <td className="whitespace-nowrap py-4 pl-4 pr-6 text-gray-600">
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {test.attemptsCount}
                    </span>
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