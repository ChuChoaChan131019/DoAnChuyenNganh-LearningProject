'use client';

import React, { useState } from 'react';
import { LearnerSidebar } from './sidebar';
import { LearnerTopbar } from './topbar';
import { LearnerFooter } from './footer';

const CONTENT_PADDING: Record<'collapsed' | 'expanded', string> = {
  collapsed: 'pl-20',
  expanded: 'pl-64',
};

export function LearnerShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const contentState = isCollapsed ? 'collapsed' : 'expanded';

  return (
    <div className="flex min-h-screen bg-background font-[var(--font-plus-jakarta-sans)]">
      <LearnerSidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${CONTENT_PADDING[contentState]}`}>
        <LearnerTopbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
        <LearnerFooter />
      </div>
    </div>
  );
}
