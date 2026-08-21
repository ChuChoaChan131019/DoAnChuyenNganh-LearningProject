'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderTree,
  BookOpen,
  Bookmark,
  FileText,
  Boxes,
  HelpCircle,
  Edit3,
  CheckSquare,
  GraduationCap,
  Hammer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavGroup {
  group: string;
  items: {
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: number | string;
  }[];
}

const MENU_DATA: NavGroup[] = [
  {
    group: 'OVERVIEW',
    items: [{ label: 'Dashboard', href: '/content-manager/dashboard', icon: LayoutDashboard }],
  },
  {
    group: 'LEARNING CONTENT',
    items: [
      { label: 'Categories', href: '/content-manager/categories', icon: FolderTree },
      { label: 'Courses', href: '/content-manager/courses', icon: BookOpen },
      { label: 'Chapters', href: '/content-manager/chapters', icon: Bookmark },
      { label: 'Lessons', href: '/content-manager/lessons', icon: FileText },
      { label: 'Learning resources', href: '/content-manager/resources', icon: Boxes },
    ],
  },
  {
    group: 'QUESTION BANK',
    items: [
      { label: 'Questions', href: '/content-manager/questions', icon: HelpCircle },
      { label: 'Question editor', href: '/content-manager/questions/editor', icon: Edit3 },
      { label: 'Question review', href: '/content-manager/questions/review', icon: CheckSquare, badge: 12 },
    ],
  },
  {
    group: 'TESTS & PRACTICE',
    items: [
      { label: 'Tests', href: '/content-manager/tests', icon: GraduationCap },
      { label: 'Test builder', href: '/content-manager/tests/builder', icon: Hammer },
    ],
  },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`sidebar-font fixed left-0 top-0 z-40 flex h-screen flex-col bg-[#002C3E] text-gray-300 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="sidebar-divider flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-red-500 shadow-md">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="truncate text-[15px] font-medium tracking-tight text-slate-400">
            Content Studio
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none">
        {MENU_DATA.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pb-2 text-[12px] font-bold tracking-wider text-slate-400/80 uppercase">
                {section.group}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-normal transition-all ${
                      isActive
                        ? 'bg-[#173e4a] text-white shadow-xs'
                        : 'text-slate-400 hover:bg-white/10 hover:text-white font-medium'
                    } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-red-400" />
                    )}
                    <div className="flex items-center gap-3 truncate">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? 'text-red-400' : 'text-slate-400 group-hover:text-gray-200'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-xs font-semibold text-teal-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Collapse Toggle */}
      <div className="sidebar-divider border-t p-3">
        <button
          onClick={onToggle}
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          {isCollapsed ? (
            <ChevronRight className="mx-auto h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}