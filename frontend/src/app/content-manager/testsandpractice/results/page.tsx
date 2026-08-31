<<<<<<< Updated upstream
=======
'use client';

import React from 'react';
import { Users, TrendingUp, Award, Target } from 'lucide-react';
import {
  MetricOverview,
  TestScoreChartData,
  StruggleTopic,
  RecentAttemptSummary,
} from '@/types/test-and-practice';

// ==========================================
// CENTRALIZED STYLES (Đầu file)
// ==========================================
const STAT_CARD_VARIANTS = {
  attempts: {
    bg: 'bg-rose-50',
    iconColor: 'text-[#F7444E]',
  },
  score: {
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  passRate: {
    bg: 'bg-sky-50',
    iconColor: 'text-sky-600',
  },
  weakest: {
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
};

const STYLES = {
  // Container & Cards
  pageContainer: 'mx-auto max-w-7xl space-y-6 pb-12',
  card: 'bg-[#FFFAFC]/50 border border-gray-200/80 rounded-2xl p-6 shadow-xs',
  cardHeaderWithDivider:
    'border-b border-gray-100 px-6 py-4 -mx-6 -mt-6 mb-5 flex items-center justify-between',
  cardTitle: 'font-semibold text-gray-900 text-sm sm:text-base tracking-tight',

  // Progress Bar
  progressTrack: 'h-1.5 w-full bg-rose-100/70 rounded-full overflow-hidden mt-1.5',
  progressBar: 'h-full bg-[#F7444E] rounded-full transition-all duration-500',

  // Table
  tableThead:
    'border-b border-gray-100 bg-transparent text-xs font-semibold uppercase tracking-wider text-gray-500',
  tableTr: 'transition-colors hover:bg-gray-50/70',
};

// ==========================================
// MOCK DATA (Chuẩn hóa UUID)
// ==========================================
const METRICS_DATA: MetricOverview = {
  totalAttempts: 1499,
  attemptsGrowth: 184,
  averageScore: 77,
  scoreGrowth: 3,
  passRate: 82,
  weakestTopic: 'Polymorphism',
};

const CHART_DATA: TestScoreChartData[] = [
  { label: 'C#', score: 72 },
  { label: 'Variables', score: 86 },
  { label: 'OOP', score: 68 },
  { label: 'Inheritance', score: 0 },
  { label: 'LINQ', score: 70 },
  { label: 'Exception', score: 0 },
];

const STRUGGLE_TOPICS: StruggleTopic[] = [
  { topic: 'Polymorphism', accuracy: 48 },
  { topic: 'Interfaces', accuracy: 56 },
  { topic: 'Exception filters', accuracy: 61 },
  { topic: 'LINQ grouping', accuracy: 67 },
];

const RECENT_ATTEMPTS: RecentAttemptSummary[] = [
  {
    id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c11',
    testTitle: 'C# Fundamentals — Final Assessment',
    courseName: 'C# Fundamentals',
    attemptsCount: 412,
    avgScore: 78,
  },
  {
    id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c12',
    testTitle: 'Variables & Data Types Quiz',
    courseName: 'C# Fundamentals',
    attemptsCount: 658,
    avgScore: 86,
  },
  {
    id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c13',
    testTitle: 'OOP Pillars Checkpoint',
    courseName: 'OOP in C#',
    attemptsCount: 240,
    avgScore: 71,
  },
  {
    id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c14',
    testTitle: 'Inheritance & Polymorphism Deep Dive',
    courseName: 'OOP in C#',
    attemptsCount: 0,
    avgScore: 0,
  },
  {
    id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c15',
    testTitle: 'LINQ Practice Set',
    courseName: 'Collections and LINQ',
    attemptsCount: 189,
    avgScore: 74,
  },
  {
    id: 'e1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c16',
    testTitle: 'Exception Handling Mock Test',
    courseName: 'Exception Handling in C#',
    attemptsCount: 0,
    avgScore: 0,
  },
];

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ResultsAnalyticsPage() {
  return (
    <div className={STYLES.pageContainer}>
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Results &amp; analytics
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          How students are performing across the C# curriculum.
        </p>
      </div>

      {/* 4 Thẻ KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Attempts */}
        <div className={STYLES.card}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total attempts</span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${STAT_CARD_VARIANTS.attempts.bg}`}
            >
              <Users className={`h-4 w-4 ${STAT_CARD_VARIANTS.attempts.iconColor}`} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold tracking-tight text-gray-900">
              {METRICS_DATA.totalAttempts.toLocaleString('en-US')}
            </span>
          </div>
          <p className="text-xs font-medium text-emerald-600 mt-1">
            +{METRICS_DATA.attemptsGrowth} this month
          </p>
        </div>

        {/* Average Score */}
        <div className={STYLES.card}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Average score</span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${STAT_CARD_VARIANTS.score.bg}`}
            >
              <TrendingUp className={`h-4 w-4 ${STAT_CARD_VARIANTS.score.iconColor}`} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold tracking-tight text-gray-900">
              {METRICS_DATA.averageScore}%
            </span>
          </div>
          <p className="text-xs font-medium text-emerald-600 mt-1">
            +{METRICS_DATA.scoreGrowth} pts
          </p>
        </div>

        {/* Pass Rate */}
        <div className={STYLES.card}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Pass rate</span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${STAT_CARD_VARIANTS.passRate.bg}`}
            >
              <Award className={`h-4 w-4 ${STAT_CARD_VARIANTS.passRate.iconColor}`} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold tracking-tight text-gray-900">
              {METRICS_DATA.passRate}%
            </span>
          </div>
        </div>

        {/* Weakest Topic */}
        <div className={STYLES.card}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Weakest topic</span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${STAT_CARD_VARIANTS.weakest.bg}`}
            >
              <Target className={`h-4 w-4 ${STAT_CARD_VARIANTS.weakest.iconColor}`} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold tracking-tight text-gray-900 truncate block">
              {METRICS_DATA.weakestTopic}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Row: 2 Cột có chiều cao bằng nhau */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái: Average score by test (Bar Chart) */}
        <div className={`lg:col-span-7 ${STYLES.card} flex flex-col justify-between`}>
          <div>
            <div className={STYLES.cardHeaderWithDivider}>
              <h2 className={STYLES.cardTitle}>Average score by test</h2>
            </div>

            <div className="space-y-4 pt-1">
              <div className="relative h-56 w-full">
                {[
                  { val: 100, top: '0%' },
                  { val: 75, top: '25%' },
                  { val: 50, top: '50%' },
                  { val: 25, top: '75%' },
                  { val: 0, top: '100%' },
                ].map((item) => (
                  <div
                    key={item.val}
                    style={{ top: item.top }}
                    className="absolute left-0 right-0 flex items-center -translate-y-1/2 pointer-events-none"
                  >
                    <span className="w-7 text-[11px] font-medium text-gray-400 select-none text-right pr-2">
                      {item.val}
                    </span>
                    <div className="flex-1 border-t border-dashed border-gray-200/90" />
                  </div>
                ))}

                <div className="absolute inset-0 left-7 right-0 flex items-end justify-between gap-2 sm:gap-4 px-3">
                  {CHART_DATA.map((item, index) => (
                    <div key={index} className="flex-1 flex justify-center items-end h-full">
                      {item.score > 0 && (
                        <div
                          style={{ height: `${item.score}%` }}
                          className="w-full max-w-[56px] bg-[#F7444E] rounded-t-2xl transition-all duration-500 hover:opacity-90"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pl-7 gap-2 sm:gap-4 px-3 pt-1">
                {CHART_DATA.map((item, index) => (
                  <div key={index} className="flex-1 text-center">
                    <span className="text-xs text-gray-500 font-medium truncate block max-w-full">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Topics students struggle with */}
        <div className={`lg:col-span-5 ${STYLES.card} flex flex-col justify-between`}>
          <div>
            <div className={STYLES.cardHeaderWithDivider}>
              <h2 className={STYLES.cardTitle}>Topics students struggle with</h2>
            </div>

            <div className="space-y-5 pt-1">
              {STRUGGLE_TOPICS.map((topicItem, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-gray-900 text-sm">
                      {topicItem.topic}
                    </span>
                    <span className="text-gray-500 font-medium text-xs">
                      {topicItem.accuracy}%
                    </span>
                  </div>
                  <div className={STYLES.progressTrack}>
                    <div
                      className={STYLES.progressBar}
                      style={{ width: `${topicItem.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent attempts Table */}
      <div className={STYLES.card}>
        <div className={STYLES.cardHeaderWithDivider}>
          <h2 className={STYLES.cardTitle}>Recent attempts</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className={STYLES.tableThead}>
              <tr>
                <th scope="col" className="pb-3 pr-4 font-semibold">Test</th>
                <th scope="col" className="pb-3 px-4 font-semibold">Course</th>
                <th scope="col" className="pb-3 px-4 text-right font-semibold">Attempts</th>
                <th scope="col" className="pb-3 pl-4 text-right font-semibold">Avg score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
              {RECENT_ATTEMPTS.map((row) => (
                <tr key={row.id} className={STYLES.tableTr}>
                  <td className="py-3.5 pr-4 font-semibold text-gray-900 line-clamp-1">
                    {row.testTitle}
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                    {row.courseName}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-gray-600 whitespace-nowrap">
                    {row.attemptsCount}
                  </td>
                  <td className="py-3.5 pl-4 text-right font-medium text-gray-600 whitespace-nowrap">
                    {row.avgScore}%
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
>>>>>>> Stashed changes
