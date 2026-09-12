'use client';

import React, { useState } from 'react';
import { Bookmark, Search, Filter, BookOpen, Video, FileText } from 'lucide-react';
import Link from 'next/link';

export default function BookmarksPage() {
  const [activeTag, setActiveTag] = useState('All');
  const tags = ['All', 'Lessons', 'Materials', 'Code Snippets'];

  return (
    <div className="mx-auto max-w-[1216px] space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f3741]">Bookmarks</h1>
          <p className="mt-1 text-sm text-slate-500">Quickly access your saved learning materials.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search bookmarks..."
            className="h-[42px] w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-[#78bcc4] focus:outline-none focus:ring-2 focus:ring-[#78bcc4]/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                activeTag === tag
                  ? 'border-rose-200 bg-rose-50 text-[#f7444e]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/learner/courses/csharp-fundamentals/lessons/primitive-data-types" className="group rounded-[24px] border border-[#dfe6df] bg-white p-5 shadow-[0_4px_16px_rgba(0,44,62,0.03)] hover:shadow-md transition block">
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
              <BookOpen className="h-5 w-5" />
            </div>
            <button className="text-[#f7444e] p-1"><Bookmark className="h-4 w-4 fill-current" /></button>
          </div>
          <h3 className="font-bold text-[#0f3741] mb-1 group-hover:text-[#f7444e] transition">Primitive Data Types</h3>
          <p className="text-sm text-slate-500 mb-4 line-clamp-2">Phân biệt nhóm kiểu số nguyên, số thực dấu phẩy động và boolean.</p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">Lessons</span>
            <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">C# Fundamentals</span>
          </div>
        </Link>

        <div className="group rounded-[24px] border border-[#dfe6df] bg-white p-5 shadow-[0_4px_16px_rgba(0,44,62,0.03)] hover:shadow-md transition block cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-500">
              <Video className="h-5 w-5" />
            </div>
            <button className="text-[#f7444e] p-1"><Bookmark className="h-4 w-4 fill-current" /></button>
          </div>
          <h3 className="font-bold text-[#0f3741] mb-1 group-hover:text-[#f7444e] transition">Installing the .NET SDK</h3>
          <p className="text-sm text-slate-500 mb-4 line-clamp-2">Walkthrough video for installing .NET SDK on Windows and macOS.</p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">Materials</span>
            <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">C# Fundamentals</span>
          </div>
        </div>
      </div>
    </div>
  );
}
