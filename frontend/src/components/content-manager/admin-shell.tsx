'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const CONTENT_PADDING: Record<'collapsed' | 'expanded', string> = {
  collapsed: 'pl-20',
  expanded: 'pl-64',
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const contentState = isCollapsed ? 'collapsed' : 'expanded';

  return (
    <div className="flex min-h-screen bg-[#F7F8F3]">
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${CONTENT_PADDING[contentState]}`}>
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}