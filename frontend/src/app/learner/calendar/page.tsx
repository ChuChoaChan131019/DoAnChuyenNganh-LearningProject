'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Bell } from 'lucide-react';

export default function CalendarPage() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  return (
    <div className="mx-auto max-w-[1216px] space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f3741]">Calendar & Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your learning schedule and deadlines.</p>
        </div>
        
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1">
          {(['month', 'week', 'day'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                view === v 
                  ? 'bg-slate-100 text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Main Calendar Area */}
        <div className="rounded-[24px] border border-[#dfe6df] bg-white p-6 shadow-[0_8px_18px_rgba(0,44,62,0.04)] overflow-x-auto">
          <div className="flex items-center justify-between mb-6 min-w-[500px]">
            <h2 className="text-xl font-bold text-[#0f3741]">September 2026</h2>
            <div className="flex items-center gap-2">
              <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-600">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button className="rounded-full px-3 py-1 text-sm font-medium hover:bg-slate-100 transition text-slate-600">
                Today
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-600">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="min-w-[500px]">
            <div className="grid grid-cols-7 gap-px bg-slate-200 border-b border-slate-200">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="bg-slate-50 py-2 text-center text-xs font-semibold text-slate-500">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200">
              {/* Mock Calendar Grid for September 2026 */}
              {Array.from({ length: 35 }).map((_, i) => {
                const isCurrentMonth = i >= 2 && i < 32; // Sept starts on Tuesday (index 2)
                const date = i - 1;
                const isToday = date === 12;
                const hasEvent = date === 12 || date === 15;
                const isOverdue = date === 10;
                
                return (
                  <div key={i} className={`min-h-[100px] bg-white p-2 ${!isCurrentMonth ? 'opacity-40 bg-slate-50' : ''}`}>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? 'bg-[#f7444e] text-white' : 'text-slate-700'}`}>
                      {isCurrentMonth ? date : (i < 2 ? 30 + i : i - 31)}
                    </span>
                    
                    <div className="mt-2 flex flex-col gap-1">
                      {hasEvent && (
                        <div className="truncate rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Lesson 1 & 2
                        </div>
                      )}
                      {isOverdue && (
                        <div className="truncate rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                          Quiz Overdue
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-[24px] border border-[#dfe6df] bg-[#fbfdf9] p-6 shadow-[0_4px_16px_rgba(0,44,62,0.03)]">
            <h3 className="font-bold text-[#0f3741] mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-400" />
              Reminders
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:border-slate-300 transition">
                <input type="checkbox" defaultChecked className="rounded text-[#f7444e] focus:ring-[#f7444e]" />
                In-app notifications (1 day before)
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:border-slate-300 transition">
                <input type="checkbox" defaultChecked className="rounded text-[#f7444e] focus:ring-[#f7444e]" />
                Email reminders (1 day before)
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-rose-100 bg-rose-50/50 p-6 shadow-[0_4px_16px_rgba(0,44,62,0.03)]">
            <h3 className="font-bold text-rose-900 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-rose-500" />
              Overdue Tasks
            </h3>
            <div className="space-y-3">
              <div className="rounded-xl border border-rose-200 bg-white p-3 shadow-sm">
                <div className="text-xs font-bold text-rose-600 mb-1">Due Sept 10</div>
                <h4 className="text-sm font-semibold text-slate-800">Variables & Data Types Quiz</h4>
                <button className="mt-2 text-xs font-semibold text-[#f7444e] hover:text-rose-600 transition">
                  Complete now →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
