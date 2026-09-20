'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  LogOut,
  Sun,
  Moon,
  BookOpen,
  Users,
  Calendar,
  CheckCircle2,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/lib/theme-context';
import { notificationsApi, courseApi } from '@/lib/api';
import { QuickContentSearch } from '@/components/search/quick-content-search';

interface TopbarNotification {
  id: string;
  courseId: string;
  title: string;
  content: string;
  scopeType: 'course' | 'individual';
  recipientCount: number;
  sentAt: string;
  createdAt: string;
}

export function Topbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [notifications, setNotifications] = useState<TopbarNotification[]>([]);
  const [courseNames, setCourseNames] = useState<Record<string, string>>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<TopbarNotification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    courseApi.list()
      .then((courses) => {
        if (Array.isArray(courses)) {
          const map: Record<string, string> = {};
          courses.forEach((c) => {
            map[String(c.id)] = c.title;
          });
          setCourseNames(map);
        }
      })
      .catch(() => undefined);
  }, []);

  const displayName = user?.fullName || user?.email || 'Content Manager';

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : (user?.email?.[0] || 'C').toUpperCase();

  const handleLogout = async () => {
    await logout();
    window.setTimeout(() => router.push('/login'), 0);
  };

  const fetchNotifications = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await notificationsApi.getSent();
      const list = Array.isArray(data) ? data : (data as any)?.data || [];
      setNotifications(list);
    } catch {
      // Bỏ qua lỗi âm thầm trên thanh topbar
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card px-6">
        {/* Quick Content Search */}
        <QuickContentSearch />

        {/* Action Controls & Profile */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>

          <div className="h-4 w-px bg-border" />

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-500" />
            ) : (
              <Moon className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Nút Chuông & Popover Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => {
                const nextState = !isDropdownOpen;
                setIsDropdownOpen(nextState);
                if (nextState) {
                  fetchNotifications();
                }
              }}
              className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F7444E] px-1 text-[10px] font-bold text-white ring-2 ring-card">
                  {notifications.length > 99 ? '99+' : notifications.length}
                </span>
              )}
            </button>

            {/* Menu Popover Dropdown */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card p-2 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[#F7444E]" />
                    <span className="text-sm font-bold text-foreground">Thông báo đã gửi</span>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {notifications.length}
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-border">
                  {isLoading ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">Đang tải thông báo...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">Chưa có thông báo nào được gửi</div>
                  ) : (
                    notifications.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedNotification(item);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left p-3 hover:bg-muted/50 rounded-xl transition-colors flex items-start justify-between gap-2"
                      >
                        <div className="space-y-1 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block max-w-[150px] truncate text-[10px] font-medium text-teal-700 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-300 rounded px-1.5 py-0.5">
                              {courseNames[item.courseId] || 'Không tìm thấy'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(item.sentAt || item.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-foreground line-clamp-1">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{item.content}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-border p-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      router.push('/content-manager/notifications');
                    }}
                    className="w-full rounded-xl py-2 text-center text-xs font-semibold text-[#F7444E] hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                  >
                    Xem tất cả trong trang Thông báo ({notifications.length})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 border-l border-border pl-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
              {initials}
            </div>
            <div className="hidden flex-col text-left sm:flex">
              <span className="text-sm font-medium text-foreground leading-none">
                {displayName}
              </span>
              <span className="mt-1 text-xs text-muted-foreground leading-none">
                Content Manager
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Modal xem chi tiết thông báo */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300">
                  <BookOpen className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">Chi tiết thông báo</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thông tin chi tiết */}
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 text-teal-700 dark:text-teal-300 font-medium">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>{courseNames[selectedNotification.courseId] || 'Không tìm thấy'}</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    {selectedNotification.scopeType === 'course'
                      ? `Toàn bộ khóa (${selectedNotification.recipientCount} học viên)`
                      : `${selectedNotification.recipientCount} học viên`}
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(selectedNotification.sentAt || selectedNotification.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              {/* Khung nội dung thông báo */}
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Nội dung thông báo
                </label>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedNotification.content}
                </p>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedNotification(null);
                  router.push('/content-manager/notifications');
                }}
                className="rounded-xl bg-[#F7444E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e03a44] transition-colors"
              >
                Đến trang Quản lý
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
