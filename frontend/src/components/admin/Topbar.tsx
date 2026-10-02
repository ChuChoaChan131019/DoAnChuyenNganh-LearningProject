'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { Bell, ChevronDown, LogOut, Menu, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  clearSession,
  getServerSessionSnapshot,
  getSessionSnapshot,
  subscribeSession,
} from '@/lib/auth/session';
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

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  ).user;

  const handleLogout = () => {
    clearSession();
    toast.success('Đã đăng xuất');
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Mở menu điều hướng"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{titleFor(pathname)}</h1>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3">
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
        <details className="group relative pl-1 sm:border-l sm:border-border sm:pl-4">
          <summary
            aria-label="Mở menu tài khoản"
            className="flex cursor-pointer list-none items-center gap-2 rounded-lg py-1 pr-1 text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
              {initials(user)}
            </div>
            <span className="hidden max-w-40 truncate text-sm font-medium sm:block">{displayName(user)}</span>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 sm:block" />
          </summary>

          <div
            role="menu"
            aria-label="Tài khoản quản trị viên"
            className="absolute right-0 top-[calc(100%+0.625rem)] z-50 w-56 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
          >
            <div className="border-b border-border px-2.5 py-2.5">
              <p className="truncate text-sm font-semibold">{displayName(user)}</p>
              {user?.email && <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>}
            </div>
            <button
              type="button"
              disabled
              role="menuitem"
              className="mt-1 flex w-full cursor-not-allowed items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground opacity-65"
            >
              <span className="flex items-center gap-3">
                <Settings className="h-4 w-4" />
                Cài đặt
              </span>
              <span className="text-[11px]">Sắp có</span>
            </button>
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
