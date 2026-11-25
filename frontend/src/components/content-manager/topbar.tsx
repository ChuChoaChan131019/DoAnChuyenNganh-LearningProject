'use client';

import { QuickContentSearch } from '@/components/search/quick-content-search';
import { UserMenu } from '@/components/auth/user-menu';
import { UserNotificationBell } from '@/components/notifications/user-notification-bell';

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200/70 bg-[#F7F8F3] px-6">
      <QuickContentSearch />
      <div className="flex items-center gap-4">
        <UserNotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
