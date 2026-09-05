'use client';

import React, { useState } from 'react';
import { Plus, Clock, Users } from 'lucide-react';
import { TestItem, TestStatus } from '@/types/test-and-practice';
import { DifficultyLevel } from '@/types/question';

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
    easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
    hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
  },
  statusBadges: {
    published: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      dot: 'bg-emerald-500',
      label: 'Published',
    },
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
  },
};

// ==========================================
// MOCK DATA (Chuẩn hóa UUID & CHECK constraints)
// ==========================================
const SAMPLE_TESTS: TestItem[] = [
  {
    id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c11',
    title: 'C# Fundamentals — Final Assessment',
    created_at: '2026-05-18',
    course_title: 'C# Fundamentals',
    questions_count: 40,
    duration_minutes: 60,
    pass_score: 5.0,
    shuffle_questions: true,
    shuffle_options: true,
    is_active: true,
    difficulty: 'medium',
    status: 'published',
    attempts_count: 412,
  },
  {
    id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c12',
    title: 'Variables & Data Types Quiz',
    created_at: '2026-05-22',
    course_title: 'C# Fundamentals',
    questions_count: 15,
    duration_minutes: 20,
    pass_score: 5.0,
    shuffle_questions: true,
    shuffle_options: true,
    is_active: true,
    difficulty: 'easy',
    status: 'published',
    attempts_count: 658,
  },
  {
    id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c13',
    title: 'OOP Pillars Checkpoint',
    created_at: '2026-06-09',
    course_title: 'OOP in C#',
    questions_count: 25,
    duration_minutes: 35,
    pass_score: 6.0,
    shuffle_questions: true,
    shuffle_options: true,
    is_active: true,
    difficulty: 'medium',
    status: 'approved',
    attempts_count: 240,
  },
  {
    id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c14',
    title: 'Inheritance & Polymorphism Deep Dive',
    created_at: '2026-07-02',
    course_title: 'OOP in C#',
    questions_count: 30,
    duration_minutes: 45,
    pass_score: 7.0,
    shuffle_questions: true,
    shuffle_options: true,
    is_active: false,
    difficulty: 'hard',
    status: 'draft',
    attempts_count: 0,
  },
  {
    id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c15',
    title: 'LINQ Practice Set',
    created_at: '2026-07-15',
    course_title: 'Collections and LINQ',
    questions_count: 20,
    duration_minutes: 25,
    pass_score: 5.0,
    shuffle_questions: true,
    shuffle_options: true,
    is_active: true,
    difficulty: 'medium',
    status: 'published',
    attempts_count: 189,
  },
  {
    id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c16',
    title: 'Exception Handling Mock Test',
    created_at: '2026-08-03',
    course_title: 'Exception Handling in C#',
    questions_count: 18,
    duration_minutes: 30,
    pass_score: 6.0,
    shuffle_questions: true,
    shuffle_options: true,
    is_active: false,
    difficulty: 'hard',
    status: 'draft',
    attempts_count: 0,
  },
];

// ==========================================
// SUB-COMPONENTS
// ==========================================
function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  const formatted = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${STYLES.difficultyBadges[level]}`}
    >
      {formatted}
    </span>
  );
}

function StatusBadge({ status }: { status: TestStatus }) {
  const current = STYLES.statusBadges[status] || STYLES.statusBadges.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${current.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      {current.label}
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
                      Created {test.created_at}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-gray-700 font-medium text-xs sm:text-sm">
                    {test.course_title}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-gray-600 font-medium">
                    {test.questions_count}
                  </td>

                  <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {test.duration_minutes} min
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
                      {test.attempts_count}
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