'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/admin/Sidebar';
import { Topbar } from '@/components/admin/Topbar';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [navigationOpen, setNavigationOpen] = useState(false);

  useEffect(() => {
    if (!navigationOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavigationOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [navigationOpen]);

  return (
    <div className="app-gradient flex min-h-dvh bg-background font-sans text-foreground">
      <a
        href="#admin-content"
        className="fixed left-4 top-4 z-[60] -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform focus:translate-y-0"
      >
        Chuyển đến nội dung chính
      </a>

      {navigationOpen && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setNavigationOpen(false)}
        />
      )}

      <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar onMenuClick={() => setNavigationOpen(true)} />
        <main id="admin-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1440px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
