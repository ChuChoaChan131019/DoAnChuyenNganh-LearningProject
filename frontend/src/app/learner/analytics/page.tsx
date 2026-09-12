'use client';

import React, { useState } from 'react';
import { LineChart, History, Activity, Trophy, Clock, CheckCircle2 } from 'lucide-react';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'results' | 'history'>('results');

  return (
    <div className="mx-auto max-w-[1216px] space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0f3741]">Learning Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Track your progress, quiz results, and learning history.</p>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'results' 
              ? 'border-[#f7444e] text-[#f7444e]' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Activity className="h-4 w-4" />
          Quiz Results
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'history' 
              ? 'border-[#f7444e] text-[#f7444e]' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="h-4 w-4" />
          Learning History
        </button>
      </div>

      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-[24px] border border-[#dfe6df] bg-white p-6 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-sm">Average Score</h3>
              </div>
              <div className="text-3xl font-black text-[#0f3741]">84%</div>
              <p className="mt-1 text-xs font-semibold text-emerald-600">Status: Tốt (Good)</p>
            </div>
            
            <div className="rounded-[24px] border border-[#dfe6df] bg-white p-6 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                <h3 className="font-semibold text-sm">Recent Trend</h3>
              </div>
              <div className="text-xl font-bold text-[#0f3741]">+5.2%</div>
              <p className="mt-1 text-xs text-slate-500">Compared to prev 3 attempts</p>
            </div>

            <div className="rounded-[24px] border border-[#dfe6df] bg-white p-6 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
              <div className="flex items-center gap-3 text-slate-500 mb-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <h3 className="font-semibold text-sm">Completed Tests</h3>
              </div>
              <div className="text-3xl font-black text-[#0f3741]">12</div>
              <p className="mt-1 text-xs text-slate-500">Across 3 courses</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#dfe6df] bg-white p-6 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
            <h3 className="font-bold text-[#0f3741] mb-6">Recent Attempts</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Quiz Name</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Evaluation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">Variables & Data Types Quiz</td>
                    <td className="px-4 py-3">Sept 12, 2026</td>
                    <td className="px-4 py-3 font-bold text-[#0f3741]">85% (17/20)</td>
                    <td className="px-4 py-3"><span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">TỐT</span></td>
                  </tr>
                  <tr className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">C# Fundamentals Final</td>
                    <td className="px-4 py-3">Sept 01, 2026</td>
                    <td className="px-4 py-3 font-bold text-[#0f3741]">72% (72/100)</td>
                    <td className="px-4 py-3"><span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">ĐẠT</span></td>
                  </tr>
                  <tr className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">OOP Quick Check</td>
                    <td className="px-4 py-3">Aug 28, 2026</td>
                    <td className="px-4 py-3 font-bold text-[#0f3741]">40% (2/5)</td>
                    <td className="px-4 py-3"><span className="inline-flex rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">CẢI THIỆN</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="max-w-3xl space-y-8">
          <div className="relative border-l-2 border-slate-200 pl-6 space-y-8 ml-3">
            
            <div className="relative">
              <span className="absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full bg-white ring-4 ring-white border-2 border-[#f7444e] text-[#f7444e]">
                <div className="h-2 w-2 rounded-full bg-[#f7444e]" />
              </span>
              <h3 className="text-sm font-bold text-slate-800 mb-4">Today, Sept 12</h3>
              <div className="space-y-4">
                <div className="rounded-[16px] border border-[#dfe6df] bg-white p-4 shadow-sm flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0f3741]">Completed Lesson: Primitive Data Types</p>
                    <p className="text-xs text-slate-500 mt-1">Course: C# Fundamentals • Duration: ~14 mins</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-2">10:30 AM</p>
                  </div>
                </div>
                <div className="rounded-[16px] border border-[#dfe6df] bg-white p-4 shadow-sm flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0f3741]">Started Lesson: Primitive Data Types</p>
                    <p className="text-xs text-slate-500 mt-1">Course: C# Fundamentals</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-2">10:15 AM</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <span className="absolute -left-[35px] flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 ring-4 ring-white border-2 border-slate-300">
                <div className="h-2 w-2 rounded-full bg-slate-400" />
              </span>
              <h3 className="text-sm font-bold text-slate-500 mb-4">Yesterday, Sept 11</h3>
              <div className="space-y-4">
                <div className="rounded-[16px] border border-[#dfe6df] bg-white p-4 shadow-sm flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0f3741]">Completed Quiz: Variables Overview</p>
                    <p className="text-xs text-slate-500 mt-1">Score: 85%</p>
                    <p className="text-[11px] font-medium text-slate-400 mt-2">8:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
