"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Flag,
  Menu,
  PanelLeftClose,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";

const navigation = [
  { href: "/admin/discussion-reports", label: "Báo cáo thảo luận", icon: Flag },
  { href: "/admin/accounts", label: "Tài khoản", icon: Users },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F8F3] text-[#002C3E]">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Đóng menu quản trị"
          className="fixed inset-0 z-40 bg-[#002C3E]/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#002C3E] text-white transition-all duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "w-20" : "w-64"} md:translate-x-0`}
      >
        <div className="flex h-18 items-center gap-3 border-b border-white/10 px-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F7444E] text-white">
            <ShieldCheck className="size-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">Không gian quản trị</p>
              <p className="text-xs text-white/55">Learning Project</p>
            </div>
          )}
          <button
            type="button"
            aria-label="Đóng menu"
            className="ml-auto rounded-lg p-1 text-white/70 hover:bg-white/10 md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" />
          </button>
        </div>
        <nav
          aria-label="Điều hướng quản trị"
          className="flex-1 space-y-1 px-3 py-6"
        >
          {!collapsed && (
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[.16em] text-white/45">
              Quản trị hệ thống
            </p>
          )}
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                onClick={() => setMobileOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${active ? "bg-[#17485A] text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon
                  className={`size-[18px] shrink-0 ${active ? "text-[#F7444E]" : ""}`}
                />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            onClick={() => setCollapsed((value) => !value)}
            className="hidden min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-white/55 hover:bg-white/10 hover:text-white md:flex"
          >
            <PanelLeftClose
              className={`size-[18px] shrink-0 ${collapsed ? "rotate-180" : ""}`}
            />
            {!collapsed && "Thu gọn"}
          </button>
        </div>
      </aside>
      <div
        className={`transition-[padding] duration-200 ${collapsed ? "md:pl-20" : "md:pl-64"}`}
      >
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-[#DFE6DF] bg-[#F7F8F3]/95 px-4 backdrop-blur-sm sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Mở menu quản trị"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 hover:bg-[#EAF4F3] md:hidden"
            >
              <Menu className="size-5" />
            </button>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#637981]">
                Khu vực quản trị
              </p>
              <p className="text-sm font-semibold">
                {navigation.find((item) => pathname.startsWith(item.href))
                  ?.label ?? "Tổng quan"}
              </p>
            </div>
          </div>
          <UserMenu />
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
