'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  LayoutGrid,
  Compass,
  Target,
  BarChart2,
  Bot,
  Search,
  Flame,
  Sun,
  Bell,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/learner/dashboard', icon: LayoutGrid },
  { label: 'Browse courses', href: '/learner/courses', icon: Compass },
  { label: 'Practice', href: '/learner/practice', icon: Target },
  { label: 'Analytics', href: '/learner/analytics', icon: BarChart2 },
  { label: 'AI Tutor', href: '/learner/ai-tutor', icon: Bot },
];

export function LearnerTopbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200/70 bg-[#F7F8F3]">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
      {/* Left: Logo & Main Navigation */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link href="/learner/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f47c83,#78bcc4)] shadow-sm">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-base font-bold text-slate-800">CSharpHub</span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-rose-50 text-[#F7444E]'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          <button className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
            <Search className="h-4 w-4" />
            Search
          </button>
        </nav>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Streak Badge */}
        <div className="flex items-center gap-2 rounded-full bg-orange-100/80 px-3 py-1.5 text-orange-700">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-bold">12 day streak</span>
        </div>

        {/* Manager View Switch */}
        <Link
          href="/content-manager/dashboard"
          className="whitespace-nowrap text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
        >
          Manager view
        </Link>

        <div className="h-4 w-px bg-slate-200" />

        {/* Quick Actions */}
        <button className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
          <Sun className="h-4 w-4" />
        </button>
        <button className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* User Avatar */}
        <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 transition hover:bg-slate-300">
          T
        </div>
      </div>
      </div>
    </header>
  );
}