'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Flame, Sun, Bell, LogOut, Settings, ChevronDown } from 'lucide-react';
import { QuickContentSearch } from '@/components/search/quick-content-search';
import { learnerNotificationsApi, type LearnerNotification } from '@/lib/api';

function notificationTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function LearnerTopbar() {
  const router = useRouter();
  const { user, role, logout } = useAuth();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<LearnerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const displayName = user?.fullName || user?.email || 'Learner';
  const initial = (user?.fullName?.[0] || user?.email?.[0] || 'L').toUpperCase();

  const handleLogout = async () => {
    await logout();
    window.setTimeout(() => router.push('/login'), 0);
  };

  const loadNotifications = useCallback(async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
    if (!user?.id || role !== 'learner') return;

    try {
      if (showLoading) {
        setIsLoadingNotifications(true);
        setNotificationsError(null);
      }
      const result = await learnerNotificationsApi.list();
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      if (showLoading) {
        setNotificationsError(
          error instanceof Error ? error.message : 'Không thể tải thông báo',
        );
      }
    } finally {
      if (showLoading) setIsLoadingNotifications(false);
    }
  }, [role, user?.id]);

  useEffect(() => {
    if (role !== 'learner') return;

    const initialRefreshTimer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadNotifications({ showLoading: false });
      }
    };

    const refreshTimer = window.setInterval(refreshWhenVisible, 10_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearTimeout(initialRefreshTimer);
      window.clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [loadNotifications, role]);

  const toggleNotifications = () => {
    const nextOpen = !isNotificationsOpen;
    setIsNotificationsOpen(nextOpen);
    if (nextOpen) {
      void loadNotifications();
    }
  };

  const markNotificationRead = async (notification: LearnerNotification) => {
    if (notification.readAt) return;

    try {
      const result = await learnerNotificationsApi.markRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: result.readAt } : item,
        ),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (error) {
      setNotificationsError(
        error instanceof Error ? error.message : 'Không thể cập nhật thông báo',
      );
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 border-b border-border bg-card px-6">
      <QuickContentSearch learner />

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-4">
        {/* Streak Badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-orange-100/80 px-3 py-1.5 text-orange-700">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-bold">12 day streak</span>
        </div>

        {/* Manager View Switch */}
        {role === 'content_manager' || role === 'admin' ? (
          <Link
            href="/content-manager/dashboard"
            className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Manager view
          </Link>
        ) : null}

        <div className="hidden sm:block h-4 w-px bg-border" />

        {/* Theme Toggle */}
        <button
          type="button"
          aria-label="Toggle theme"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Sun className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            aria-label="Thông báo"
            aria-expanded={isNotificationsOpen}
            onClick={toggleNotifications}
            className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {isNotificationsOpen && (
            <div
              role="dialog"
              aria-label="Thông báo mới nhất"
              className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-lg ring-1 ring-black/5"
            >
              <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Thông báo</p>
                <span className="text-xs text-muted-foreground">Tối đa 5 gần nhất</span>
              </div>

              <div className="max-h-96 overflow-y-auto p-1.5">
                {isLoadingNotifications && (
                  <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                    Đang tải thông báo...
                  </p>
                )}
                {!isLoadingNotifications && notificationsError && (
                  <p className="px-3 py-5 text-center text-sm text-destructive">
                    {notificationsError}
                  </p>
                )}
                {!isLoadingNotifications && !notificationsError && notifications.length === 0 && (
                  <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                    Bạn chưa có thông báo nào.
                  </p>
                )}
                {!isLoadingNotifications && !notificationsError && notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void markNotificationRead(notification)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      notification.readAt
                        ? 'border-transparent hover:bg-muted/80'
                        : 'border-primary/20 bg-primary/10 hover:bg-primary/15'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-1 text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      {!notification.readAt && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {notification.content}
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {notificationTime(notification.sentAt)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative border-l border-border pl-4" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-muted"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
              {initial}
            </div>
            <div className="hidden flex-col text-left sm:flex">
              <span className="text-sm font-medium text-foreground leading-none">
                {displayName}
              </span>
              <span className="mt-1 text-xs text-muted-foreground leading-none">
                Học viên
              </span>
            </div>
            <ChevronDown className={`hidden h-4 w-4 text-muted-foreground transition-transform sm:block ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-border bg-card p-1.5 shadow-lg ring-1 ring-black/5 focus:outline-none">
              <div className="mb-1 px-3 py-2">
                <p className="text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="h-px bg-border my-1" />
              <Link
                href="/learner/settings"
                onClick={() => setIsDropdownOpen(false)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
