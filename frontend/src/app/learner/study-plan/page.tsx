'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Target, Plus, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';
import Link from 'next/link';

export default function StudyPlanPage() {
  const [hasPlan, setHasPlan] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sessionDuration, setSessionDuration] = useState('30');

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(false);
    setHasPlan(true);
  };

  if (isCreating) {
    return (
      <div className="mx-auto max-w-[800px] space-y-6 pb-20">
        <div>
          <button 
            onClick={() => setIsCreating(false)}
            className="mb-4 inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f3741]">Create Study Plan</h1>
          <p className="mt-1 text-sm text-slate-500">Configure your learning schedule and goals.</p>
        </div>

        <div className="rounded-[24px] border border-[#dfe6df] bg-white p-6 sm:p-8 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
          <form onSubmit={handleCreatePlan} className="space-y-6">
            <div className="space-y-4">
              <label className="block">
                <span className="block text-sm font-semibold text-slate-700 mb-1.5">Select Course</span>
                <select 
                  required
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#78bcc4] focus:outline-none focus:ring-4 focus:ring-[#78bcc4]/10"
                >
                  <option value="">-- Choose a course --</option>
                  <option value="csharp-fundamentals">C# Fundamentals</option>
                  <option value="oop-csharp">Object-Oriented Programming in C#</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</span>
                  <input 
                    type="date" 
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#78bcc4] focus:outline-none focus:ring-4 focus:ring-[#78bcc4]/10"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-semibold text-slate-700 mb-1.5">Target End Date</span>
                  <input 
                    type="date" 
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#78bcc4] focus:outline-none focus:ring-4 focus:ring-[#78bcc4]/10"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-sm font-semibold text-slate-700 mb-1.5">Daily Session Duration (minutes)</span>
                <select 
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#78bcc4] focus:outline-none focus:ring-4 focus:ring-[#78bcc4]/10"
                >
                  <option value="15">15 mins (Quick review)</option>
                  <option value="30">30 mins (Standard)</option>
                  <option value="60">60 mins (Deep work)</option>
                  <option value="120">120 mins (Intensive)</option>
                </select>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="rounded-xl bg-[#f7444e] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-600 active:scale-95"
              >
                Generate Plan
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!hasPlan) {
    return (
      <div className="mx-auto max-w-[1216px] flex min-h-[60vh] flex-col items-center justify-center text-center space-y-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rose-50 text-[#f7444e]">
          <Target className="h-10 w-10" />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[#0f3741]">No Active Study Plan</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Create a personalized learning schedule to stay on track. We'll automatically pace your lessons based on your availability and goals.
          </p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#f7444e] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-rose-600 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Create New Plan
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1216px] space-y-8 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f3741]">Your Study Plan</h1>
          <p className="mt-1 text-sm text-slate-500">Stay on track with your daily goals.</p>
        </div>
        <button 
          onClick={() => setHasPlan(false)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-95"
        >
          Cancel Plan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[24px] border border-[#dfe6df] bg-white p-6 shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0f3741]">Today's Tasks</h2>
                <p className="text-xs text-slate-500">2 lessons scheduled</p>
              </div>
            </div>

            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-slate-200">
                  <div className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                      {i === 1 ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <div className="h-2 w-2 rounded-full bg-slate-300" />}
                    </span>
                    <div>
                      <h3 className={`font-semibold ${i === 1 ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                        {i === 1 ? 'Variables Overview & Syntax' : 'Primitive Data Types'}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> 15 mins
                      </p>
                    </div>
                  </div>
                  {i === 2 && (
                    <Link href="/learner/courses/csharp-fundamentals/lessons/primitive-data-types" className="text-sm font-bold text-[#f7444e] hover:text-rose-600 transition flex items-center gap-1">
                      Start <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[24px] border border-[#dfe6df] bg-[#fbfdf9] p-6 shadow-[0_4px_16px_rgba(0,44,62,0.03)]">
            <h3 className="font-bold text-[#0f3741] mb-4">Plan Summary</h3>
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-slate-400"/> Course</span>
                <span className="font-semibold text-slate-800">C# Fundamentals</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="flex items-center gap-2"><Target className="h-4 w-4 text-slate-400"/> Goal Date</span>
                <span className="font-semibold text-slate-800">15/11/2026</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400"/> Daily Session</span>
                <span className="font-semibold text-slate-800">30 mins</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
