'use client';

import React from 'react';
import { Zap, Brain, Target } from 'lucide-react';

const COURSES = [
  'C# Fundamentals',
  'Object-Oriented Programming in C#',
  'Collections and LINQ',
  'Exception Handling in C#',
  'Advanced C#: Delegates, Events & Async',
];

const WEAK_TOPICS = [
  { name: 'Polymorphism', score: '48%' },
  { name: 'Interfaces', score: '56%' },
  { name: 'Exception filters', score: '61%' },
  { name: 'LINQ grouping', score: '67%' },
];

export default function PracticePage() {
  return (
    <div className="mx-auto max-w-[1216px] space-y-[22px]">
      {/* Header */}
      <div>
        <p className="mb-1 text-sm font-medium text-[#145a68]">Learn</p>
        <h1 className="text-[32px] font-bold tracking-tight text-[#0f3741]">Practice</h1>
        <p className="mt-1 text-sm text-slate-500">
          Short, focused question sets with instant feedback and explanations.
        </p>
      </div>

      {/* Top Cards (3 columns) */}
      <div className="grid grid-cols-1 gap-[22px] md:grid-cols-3">
        {/* Card 1: Quick Drill */}
        <div className="flex flex-col rounded-[16px] border border-[#dfe6df] bg-white p-[18px] shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-[#f7444e]">
            <Zap className="h-[20px] w-[20px]" />
          </div>
          <h2 className="mb-1 text-[15px] font-bold text-[#0f3741]">Quick drill</h2>
          <p className="mb-4 flex-1 text-[14px] leading-relaxed text-slate-500">
            10 mixed questions across every course you are enrolled in.
          </p>
          <button className="w-full rounded-[11px] bg-[#f7444e] py-2 text-[14px] font-semibold text-white transition hover:bg-rose-500">
            Start
          </button>
        </div>

        {/* Card 2: Weak Topics */}
        <div className="flex flex-col rounded-[16px] border border-[#dfe6df] bg-white p-[18px] shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-[#f7444e]">
            <Brain className="h-[20px] w-[20px]" />
          </div>
          <h2 className="mb-1 text-[15px] font-bold text-[#0f3741]">Weak topics</h2>
          <p className="mb-4 flex-1 text-[14px] leading-relaxed text-slate-500">
            Questions drawn from the topics where your accuracy is lowest.
          </p>
          <button className="w-full rounded-[11px] bg-[#f7444e] py-2 text-[14px] font-semibold text-white transition hover:bg-rose-500">
            Start
          </button>
        </div>

        {/* Card 3: By Course */}
        <div className="flex flex-col rounded-[16px] border border-[#dfe6df] bg-white p-[18px] shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-[#f7444e]">
            <Target className="h-[20px] w-[20px]" />
          </div>
          <h2 className="mb-1 text-[15px] font-bold text-[#0f3741]">By course</h2>
          <p className="flex-1 text-[14px] leading-relaxed text-slate-500">
            Practice only what a single course covers, chapter by chapter.
          </p>
          {/* Note: This card intentionally has no button based on the design */}
        </div>
      </div>

      {/* Bottom Layout (Left 2/3 / Right 1/3) */}
      <div className="grid items-stretch grid-cols-1 gap-[22px] md:grid-cols-2">
        {/* Left: Practice by course */}
        <div className="overflow-hidden rounded-[16px] border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
          <div className="border-b border-[#dfe6df] px-[18px] py-[15px]">
            <h2 className="text-[15px] font-bold text-[#0f3741]">Practice by course</h2>
          </div>
          <div className="flex flex-col gap-2 p-[18px]">
            {COURSES.map((course, index) => (
              <div
                key={index}
                className="flex h-12 items-center justify-between rounded-[13px] border border-slate-200/80 px-3 transition-colors hover:bg-slate-50"
              >
                <span className="text-[14px] font-medium text-[#145a68]">{course}</span>
                <button className="rounded-full border border-slate-200 px-3 py-1 text-[13px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
                  Practice
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Weakest topics */}
        <div className="flex h-full flex-col overflow-hidden rounded-[16px] border border-[#dfe6df] bg-[#fbfdf9] shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
          <div className="border-b border-[#dfe6df] px-[18px] py-[15px]">
            <h2 className="text-[15px] font-bold text-[#0f3741]">Your weakest topics</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">Accuracy over the last 30 days</p>
          </div>

          <div className="flex flex-col gap-3 px-[18px] pt-[18px]">
            {WEAK_TOPICS.map((topic, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-[#145a68]">{topic.name}</span>
                <span className="text-[14px] font-bold text-[#0f3741]">{topic.score}</span>
              </div>
            ))}
          </div>

          <button className="mx-[18px] mt-3 rounded-[11px] border border-slate-300 bg-transparent py-2 text-[14px] font-semibold text-[#0f3741] transition hover:bg-slate-100">
            Drill weak topics
          </button>
        </div>
      </div>
    </div>
  );
}