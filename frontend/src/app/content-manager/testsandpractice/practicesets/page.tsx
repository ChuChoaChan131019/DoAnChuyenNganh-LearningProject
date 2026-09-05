'use client';

import React, { useState } from 'react';
import { FlaskConical, Plus } from 'lucide-react';
import { PracticeSetItem } from '@/types/test-and-practice';
import { DifficultyLevel } from '@/types/question';

// ==========================================
// CENTRALIZED STYLES (Đầu file)
// ==========================================
const STYLES = {
  // Container & Cards
  pageContainer: 'mx-auto max-w-7xl space-y-6 pb-12',
  card: 'bg-[#FFFAFC]/50 border border-gray-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between',

  // Buttons
  primaryBtn:
    'inline-flex items-center gap-2 rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c93f3a] active:scale-[0.98]',

  // Dynamic Badges (Pill shape)
  difficultyBadges: {
    easy: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
    hard: 'bg-rose-50 text-rose-700 border-rose-200/60',
  },

  // Icon Container
  iconBadge: 'w-10 h-10 rounded-2xl bg-rose-50/90 flex items-center justify-center flex-shrink-0',

  // Progress Bar
  progressTrack: 'h-1.5 w-full bg-rose-100/70 rounded-full overflow-hidden mt-2',
  progressBar: 'h-full bg-[#F7444E] rounded-full transition-all duration-500',
};

// ==========================================
// MOCK DATA (Chuẩn hóa UUID & CHECK constraints)
// ==========================================
const SAMPLE_PRACTICE_SETS: PracticeSetItem[] = [
  {
    id: 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c01',
    title: 'C# Fundamentals — Final Assessment',
    course: 'C# Fundamentals',
    questionCount: 40,
    difficulty: 'medium',
    averageScore: 78,
  },
  {
    id: 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c02',
    title: 'Variables & Data Types Quiz',
    course: 'C# Fundamentals',
    questionCount: 15,
    difficulty: 'easy',
    averageScore: 86,
  },
  {
    id: 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c03',
    title: 'OOP Pillars Checkpoint',
    course: 'OOP in C#',
    questionCount: 25,
    difficulty: 'medium',
    averageScore: 71,
  },
  {
    id: 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c04',
    title: 'Inheritance & Polymorphism Deep Dive',
    course: 'OOP in C#',
    questionCount: 30,
    difficulty: 'hard',
    averageScore: 0,
  },
  {
    id: 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c05',
    title: 'LINQ Practice Set',
    course: 'Collections and LINQ',
    questionCount: 20,
    difficulty: 'medium',
    averageScore: 74,
  },
  {
    id: 'f1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c06',
    title: 'Exception Handling Mock Test',
    course: 'Exception Handling in C#',
    questionCount: 18,
    difficulty: 'hard',
    averageScore: 0,
  },
];

// ==========================================
// SUB-COMPONENTS
// ==========================================
function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  const formatted = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold capitalize ${STYLES.difficultyBadges[level]}`}
    >
      {formatted}
    </span>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function PracticeSetsPage() {
  const [practiceSets] = useState<PracticeSetItem[]>(SAMPLE_PRACTICE_SETS);

  const handleCreatePracticeSet = () => {
    alert('Navigating to create practice set...');
  };

  return (
    <div className={STYLES.pageContainer}>
      {/* Header & Action Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Practice sets
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Untimed drills students can repeat as often as they like.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreatePracticeSet}
            className={STYLES.primaryBtn}
          >
            <Plus className="h-4 w-4" />
            New practice set
          </button>
        </div>
      </div>

      {/* Grid Card Layout (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {practiceSets.map((item) => (
          <div key={item.id} className={STYLES.card}>
            {/* Top Row: Flask Icon & Difficulty Pill */}
            <div className="flex items-center justify-between">
              <div className={STYLES.iconBadge}>
                <FlaskConical className="h-5 w-5 text-[#F7444E] stroke-[1.75]" />
              </div>
              <DifficultyBadge level={item.difficulty} />
            </div>

            {/* Card Content: Title & Course / Question Count */}
            <div className="my-4">
              <h2 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-1">
                {item.title}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {item.course} · {item.questionCount} questions
              </p>
            </div>

            {/* Footer: Average Score & Progress Bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Average score</span>
                <span className="font-medium text-gray-600">
                  {item.averageScore}%
                </span>
              </div>
              <div className={STYLES.progressTrack}>
                <div
                  className={STYLES.progressBar}
                  style={{ width: `${item.averageScore}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
