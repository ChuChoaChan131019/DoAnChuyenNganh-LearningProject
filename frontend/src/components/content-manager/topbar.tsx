'use client';

import React from 'react';
import Link from 'next/link';
import { Search, Bell, Sun, Sparkles } from 'lucide-react';

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200/70 bg-[#F7F8F3] px-6">
      {/* Search Bar with Shortcut */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search courses, lessons, questions..."
          className="h-10 w-full rounded-xl border border-gray-200 bg-[#78BCC4]/10 pl-9 pr-14 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-teal-600 focus:bg-white focus:outline-none"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 shadow-xs">
          ⌘K
        </kbd>
      </div>

      {/* Action Controls & Profile */}
      <div className="flex items-center gap-4">
        <Link
          href="/learner/ai-tutor"
          className="text-sm font-medium text-gray-600 transition-colors hover:text-teal-700"
        >
          Student view
        </Link>

        <div className="h-4 w-px bg-gray-200" />

        {/* Theme Toggle */}
        <button
          type="button"
          aria-label="Toggle theme"
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <Sun className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800">
            LN
          </div>
          <div className="hidden flex-col text-left sm:flex">
            <span className="text-sm font-medium text-gray-900 leading-none">
              Lan Nguyen
            </span>
            <span className="mt-1 text-xs text-gray-500 leading-none">
              Content Manager
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}