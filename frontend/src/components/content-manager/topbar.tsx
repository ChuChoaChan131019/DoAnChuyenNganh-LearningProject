'use client';

import { Bell } from 'lucide-react';
import { QuickContentSearch } from '@/components/search/quick-content-search';
import { UserMenu } from '@/components/auth/user-menu';

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200/70 bg-[#F7F8F3] px-6">
      <QuickContentSearch />
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Thông báo"
          className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <Bell className="h-4 w-4" />
        </button>
        <UserMenu />
      </div>
    </header>
  );
}
