'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, Layers, Search } from 'lucide-react';
import { ApiClientError, courseApi } from '@/lib/api';
import type { Course } from '@/types/learning-content';

const FILTERS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const GRADIENTS = [
  'from-rose-100/80 to-teal-50/80',
  'from-sky-100/80 to-teal-50/80',
  'from-sky-100/80 to-rose-50/80',
  'from-rose-100/80 to-sky-50/80',
];

export default function BrowseCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    courseApi.learnerList()
      .then(setCourses)
      .catch((requestError: unknown) => {
        setError(requestError instanceof ApiClientError ? requestError.message : 'Unable to load courses.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const visibleCourses = useMemo(() => courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'All' || course.level.toLowerCase() === activeFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  }), [activeFilter, courses, searchQuery]);

  return (
    <div className="mx-auto max-w-[1216px] space-y-[22px]">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-[#0f3741]">Browse courses</h1>
        <p className="mt-1 text-sm text-slate-500">Các khóa học đã được xuất bản trong hệ thống.</p>
      </div>

      <div className="rounded-2xl border border-[#dfe6df] bg-white p-[14px] shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search courses..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-[42px] w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none focus:border-[#78bcc4]" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {FILTERS.map((filter) => <button key={filter} onClick={() => setActiveFilter(filter)} className={`rounded-full border px-3 py-[5px] text-xs font-medium ${activeFilter === filter ? 'border-rose-200 bg-rose-50 text-[#f7444e]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{filter}</button>)}
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {isLoading && <p className="text-sm text-slate-500">Đang tải khóa học...</p>}
      {!isLoading && !error && visibleCourses.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">Chưa có khóa học published phù hợp.</div>}

      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 lg:grid-cols-3">
        {visibleCourses.map((course, index) => (
          <Link href={`/learner/courses/${course.slug}`} key={course.id} className="block overflow-hidden rounded-2xl border border-[#dfe6df] bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className={`relative h-[112px] bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} p-4`}>
              <span className="inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold capitalize text-[#145a68]">{course.level}</span>
              <BookOpen className="absolute bottom-3 right-4 h-8 w-8 text-slate-400/30" />
            </div>
            <div className="flex flex-col p-[18px]">
              <h2 className="mb-1.5 text-[16px] font-bold leading-tight text-[#0f3741]">{course.title}</h2>
              <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">{course.description || 'Chưa có mô tả cho khóa học này.'}</p>
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5"><Layers className="h-[14px] w-[14px] text-slate-400" />{course.lessons} lessons</span>
                <span className="flex items-center gap-1.5"><Clock className="h-[14px] w-[14px] text-slate-400" />{course.chapters} chapters</span>
              </div>
              <div className="border-t border-[#dfe6df] pt-4 text-sm font-bold text-[#f7444e]">Start learning <ArrowRight className="ml-1 inline h-[14px] w-[14px]" /></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
