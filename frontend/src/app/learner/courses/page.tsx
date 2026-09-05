'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, BookOpen, Layers, HelpCircle, Clock, ArrowRight } from 'lucide-react';

const FILTERS = [
  'All',
  'C# Fundamentals',
  'Object-Oriented Programming',
  'Collections & LINQ',
  'Error Handling & Debugging',
  'Advanced C#',
];

const COURSES = [
  {
    id: 1,
    slug: 'csharp-fundamentals',
    title: 'C# Fundamentals',
    description: 'Start from zero: install the .NET SDK, write your first program, and master variables, data types, operato...',
    level: 'Beginner',
    status: 'Completed',
    lessons: 24,
    questions: 148,
    hours: 5,
    gradient: 'from-rose-100/80 to-teal-50/80',
    levelColor: 'bg-rose-100/50 text-rose-500',
  },
  {
    id: 2,
    slug: 'object-oriented-programming-in-csharp',
    title: 'Object-Oriented Programming in C#',
    description: 'Model real problems with classes and objects. Encapsulation, inheritance, polymorphism, abstract...',
    level: 'Intermediate',
    progress: 62,
    lessons: 31,
    questions: 206,
    hours: 6,
    gradient: 'from-sky-100/80 to-teal-50/80',
    levelColor: 'bg-sky-100/50 text-sky-500',
  },
  {
    id: 3,
    slug: 'collections-and-linq',
    title: 'Collections and LINQ',
    description: 'Work with arrays, List<T>, Dictionary<K,V>, generics and query data elegantly using LINQ.',
    level: 'Intermediate',
    progress: 28,
    lessons: 18,
    questions: 96,
    hours: 4,
    gradient: 'from-sky-100/80 to-rose-50/80',
    levelColor: 'bg-sky-100/50 text-sky-500',
  },
  {
    id: 4,
    slug: 'exception-handling-in-csharp',
    title: 'Exception Handling in C#',
    description: 'Write resilient code with try/catch/finally, exception filters and your own exception types.',
    level: 'Intermediate',
    status: 'Not Started',
    lessons: 12,
    questions: 54,
    hours: 2,
    gradient: 'from-rose-100/80 to-sky-50/80',
    levelColor: 'bg-sky-100/50 text-sky-500',
  },
  {
    id: 5,
    slug: 'advanced-csharp-delegates-events-async',
    title: 'Advanced C#: Delegates, Events & Async',
    description: 'Delegates, lambda expressions, events, Task-based asynchronous programming and performance tips.',
    level: 'Advanced',
    progress: 5,
    lessons: 26,
    questions: 121,
    hours: 5,
    gradient: 'from-sky-100/80 to-rose-50/80',
    levelColor: 'bg-indigo-100/50 text-indigo-500',
  },
  {
    id: 6,
    slug: 'csharp-oop-interview-preparation',
    title: 'C# & OOP Interview Preparation',
    description: 'Curated question sets and ... the most asked C# and ...',
    level: 'Advanced',
    status: 'Not Started',
    progress: 0,
    lessons: 15,
    questions: 240,
    gradient: 'from-sky-100/80 to-emerald-50/80',
    levelColor: 'bg-indigo-100/50 text-indigo-500',
  },
];

export default function BrowseCoursesPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="mx-auto max-w-[1216px] space-y-[22px]">
      {/* Header */}
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-[#0f3741]">Browse courses</h1>
        <p className="mt-1 text-sm text-slate-500">
          Six learning paths — from your first console app to advanced asynchronous C#.
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="rounded-[16px] border border-[#dfe6df] bg-white p-[14px] shadow-[0_8px_18px_rgba(0,44,62,0.04)]">
        <div className="flex flex-col gap-3">
          {/* Top row: Search and Level Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-[42px] w-full rounded-[12px] border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 placeholder-slate-400 transition-all focus:border-[#78bcc4] focus:outline-none focus:ring-2 focus:ring-[#78bcc4]/20"
              />
            </div>
            <button className="flex h-[42px] items-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">
              All levels
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          {/* Bottom row: Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full border px-3 py-[5px] text-xs font-medium transition-colors ${
                  activeFilter === filter
                    ? 'border-rose-200 bg-rose-50 text-[#f7444e]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 lg:grid-cols-3">
        {COURSES.filter((course) => {
          const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesFilter =
            activeFilter === 'All' ||
            course.title.toLowerCase().includes(activeFilter.toLowerCase()) ||
            (activeFilter === 'Error Handling & Debugging' && course.title.includes('Exception'));
          return matchesSearch && matchesFilter;
        }).map((course) => (
          <Link
            href={`/learner/courses/${course.slug}`}
            key={course.id}
            className="block flex flex-col overflow-hidden rounded-[16px] border border-[#dfe6df] bg-white shadow-[0_8px_18px_rgba(0,44,62,0.04)] transition-shadow hover:shadow-md"
          >
            {/* Top Gradient Area */}
            <div className={`relative h-[112px] bg-gradient-to-br ${course.gradient} p-4`}>
              <div className="flex items-start justify-between">
                {/* Level Badge */}
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${course.levelColor}`}>
                  {course.level}
                </span>

                {/* Status Badge */}
                {course.status === 'Completed' && (
                  <span className="inline-flex rounded-full bg-emerald-100/60 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                    Completed
                  </span>
                )}
              </div>
              {/* Background Book Icon */}
              <BookOpen className="absolute bottom-3 right-4 h-8 w-8 text-slate-400/30" />
            </div>

            {/* Content Area */}
            <div className="flex flex-1 flex-col p-[18px]">
              <h2 className="mb-1.5 text-[16px] font-bold leading-tight text-[#0f3741]">
                {course.title}
              </h2>
              <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">
                {course.description}
              </p>

              {/* Stats */}
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-[14px] w-[14px] text-slate-400" />
                  {course.lessons} lessons
                </div>
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="h-[14px] w-[14px] text-slate-400" />
                  {course.questions} questions
                </div>
                {course.hours && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-[14px] w-[14px] text-slate-400" />
                    ~{course.hours} h
                  </div>
                )}
              </div>

              <div className="mt-auto border-t border-[#dfe6df] pt-4">
                {course.status === 'Completed' ? (
                  <span className="flex items-center gap-1 text-[14px] font-bold text-[#f7444e]">
                    Review course <ArrowRight className="h-[14px] w-[14px]" />
                  </span>
                ) : course.progress !== undefined && course.progress > 0 ? (
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rose-100">
                      <div
                        className="h-full rounded-full bg-[#f7444e]"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                    <span className="text-[13px] font-bold text-slate-700">{course.progress}%</span>
                  </div>
                ) : course.progress === 0 && course.status !== 'Completed' ? (
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rose-100" />
                  </div>
                ) : (
                  <span className="flex items-center gap-1 text-[14px] font-bold text-[#f7444e]">
                    Start learning <ArrowRight className="h-[14px] w-[14px]" />
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}