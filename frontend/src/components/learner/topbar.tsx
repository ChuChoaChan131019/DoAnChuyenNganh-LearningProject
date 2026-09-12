'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Flame, Sun, Bell, LogOut, Settings, ChevronDown } from 'lucide-react';

export function LearnerTopbar() {
  const router = useRouter();
  const { user, role, logout } = useAuth();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = user?.fullName || user?.email || 'Learner';
  const initial = (user?.fullName?.[0] || user?.email?.[0] || 'L').toUpperCase();

  const handleLogout = async () => {
    await logout();
    window.setTimeout(() => router.push('/login'), 0);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-end border-b border-border bg-card px-6">
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
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

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
