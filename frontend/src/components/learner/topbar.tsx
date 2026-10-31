'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { UserMenu } from '@/components/auth/user-menu';
import {
  GraduationCap,
  LayoutGrid,
  Compass,
  Target,
  Bot,
  Search,
  Bell,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Trang chủ', href: '/learner/dashboard', icon: LayoutGrid },
  { label: 'Khám phá khóa học', href: '/learner/courses', icon: Compass },
  { label: 'Luyện tập', href: '/learner/practice', icon: Target },
  { label: 'Trợ giảng trí tuệ nhân tạo', href: '/learner/ai-tutor', icon: Bot },
];

export function LearnerTopbar() {
  const pathname = usePathname();
  const { role } = useAuth();
  const isSearchActive = pathname.startsWith('/learner/search');

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

            <Link
              href="/learner/search"
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isSearchActive
                  ? 'bg-rose-50 text-[#F7444E]'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Search className="h-4 w-4" />
              Tìm kiếm
            </Link>
          </nav>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-4">
          {/* Manager View Switch (only for content_manager or admin) */}
          {role === 'content_manager' || role === 'admin' ? (
            <Link
              href="/content-manager/dashboard"
              className="whitespace-nowrap text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
            >
              Trang quản lý
            </Link>
          ) : null}

          <div className="hidden sm:block h-4 w-px bg-slate-200" />

          <button
            type="button"
            aria-label="Thông báo"
            className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <Bell className="h-4 w-4" />
          </button>

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
