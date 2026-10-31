"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Bookmark,
  FileText,
  HelpCircle,
  Edit3,
  CheckSquare,
  ListChecks,
  Hammer,
  FlaskConical,
  BarChart2,
  Wand2,
  Sparkles,
  Inbox,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const SIDEBAR_WIDTHS: Record<"collapsed" | "expanded", string> = {
  collapsed: "w-20",
  expanded: "w-64",
};

const NAV_ITEM_STYLES: Record<"active" | "inactive", string> = {
  active: "bg-[#173e4a] text-white shadow-xs",
  inactive: "text-slate-400/50 hover:bg-white/10 hover:text-white font-medium",
};

const NAV_ICON_STYLES: Record<"active" | "inactive", string> = {
  active: "text-red-400",
  inactive: "text-slate-400/50 group-hover:text-gray-200",
};

const NAV_ITEM_ALIGNMENT: Record<"collapsed" | "expanded", string> = {
  collapsed: "justify-center",
  expanded: "justify-between",
};

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
    group: "TỔNG QUAN",
    items: [
      {
        label: "Bảng điều khiển",
        href: "/content-manager/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    group: "NỘI DUNG HỌC TẬP",
    items: [
      {
        label: "Khóa học",
        href: "/content-manager/learning-content/courses",
        icon: BookOpen,
      },
      {
        label: "Chương",
        href: "/content-manager/learning-content/chapters",
        icon: Bookmark,
      },
      {
        label: "Bài học",
        href: "/content-manager/learning-content/lessons",
        icon: FileText,
      },
    ],
  },
  {
    group: "NGÂN HÀNG CÂU HỎI",
    items: [
      {
        label: "Câu hỏi",
        href: "/content-manager/questions/bank",
        icon: HelpCircle,
      },
      {
        label: "Soạn câu hỏi",
        href: "/content-manager/questions/editor",
        icon: Edit3,
      },
      {
        label: "Duyệt câu hỏi",
        href: "/content-manager/questions/review",
        icon: CheckSquare,
        badge: 12,
      },
    ],
  },
  {
    group: "BÀI KIỂM TRA & LUYỆN TẬP",
    items: [
      {
        label: "Bài kiểm tra",
        href: "/content-manager/testsandpractice/tests",
        icon: ListChecks,
      },
      {
        label: "Tạo bài kiểm tra",
        href: "/content-manager/testsandpractice/builder",
        icon: Hammer,
      },
      {
        label: "Bộ bài luyện tập",
        href: "/content-manager/testsandpractice/practicesets",
        icon: FlaskConical,
      },
      {
        label: "Kết quả",
        href: "/content-manager/testsandpractice/results",
        icon: BarChart2,
      },
    ],
  },
  {
    group: "TRÍ TUỆ NHÂN TẠO",
    items: [
      {
        label: "Tạo nội dung tự động",
        href: "/content-manager/ai/content-generator",
        icon: Wand2,
      },
      {
        label: "Tạo câu hỏi tự động",
        href: "/content-manager/ai/question-generator",
        icon: Sparkles,
      },
    ],
  },
  {
    group: "KIỂM DUYỆT",
    items: [
      {
        label: "Duyệt nội dung",
        href: "/content-manager/ai/review-queue",
        icon: Inbox,
      },
    ],
  },
  {
    group: "HỆ THỐNG",
    items: [
      { label: "Tìm kiếm", href: "/content-manager/search", icon: Search },
    ],
  },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const sidebarState = isCollapsed ? "collapsed" : "expanded";

  return (
    <aside
      className={`sidebar-font fixed left-0 top-0 z-40 flex h-screen flex-col bg-[#002C3E] text-gray-300 transition-all duration-300 ${SIDEBAR_WIDTHS[sidebarState]}`}
    >
      {/* Brand Header */}
      <div className="sidebar-divider flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-red-500 shadow-md">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!isCollapsed && (
          <div className="truncate text-[15px] font-semibold tracking-tight text-slate-400">
            Không gian nội dung
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none">
        {MENU_DATA.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-400/50 uppercase">
                {section.group}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                const itemState = isActive ? "active" : "inactive";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-normal transition-all ${NAV_ITEM_STYLES[itemState]} ${NAV_ITEM_ALIGNMENT[sidebarState]}`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-red-400" />
                    )}
                    <div className="flex items-center gap-3 truncate">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${NAV_ICON_STYLES[itemState]}`}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && item.badge !== undefined && (
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
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400/50 transition-colors hover:bg-white/5 hover:text-white"
        >
          {isCollapsed ? (
            <ChevronRight className="mx-auto h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Thu gọn</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
