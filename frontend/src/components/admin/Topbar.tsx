'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getSession } from '@/lib/auth/session';
import type { SessionUser } from '@/types/auth';
import { systemStatus } from '@/lib/admin-mock';

const TITLES: Array<[prefix: string, title: string]> = [
  ['/admin/usage', 'System Usage'],
  ['/admin/analytics', 'Feature Analytics'],
  ['/admin/errors', 'Error & UX Monitoring'],
  ['/admin/notifications', 'System Notifications'],
  ['/admin/reports', 'System Report'],
];

function titleFor(pathname: string) {
  const match = TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return match?.[1] ?? 'Dashboard';
}

function displayName(user: SessionUser | null) {
  return user?.fullName?.trim() || user?.email || 'Quản trị viên';
}

function initials(user: SessionUser | null) {
  return displayName(user).slice(0, 2).toUpperCase();
}

export function Topbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    setUser(getSession().user);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-sm">
      <h1 className="text-xl font-semibold tracking-tight">{titleFor(pathname)}</h1>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <Link
          href="/admin/notifications"
          aria-label="Thông báo hệ thống"
          className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          {systemStatus.openIncidents > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
              {systemStatus.openIncidents}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
            {initials(user)}
          </div>
          <span className="text-sm font-medium">{displayName(user)}</span>
        </div>
      </div>
    </header>
  );
}
