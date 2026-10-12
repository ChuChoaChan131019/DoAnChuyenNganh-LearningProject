'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  BarChart,
  AlertTriangle,
  Bell,
  FileText,
  X,
} from 'lucide-react';

const MENUS = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'System Usage', href: '/admin/usage', icon: Activity },
  { name: 'Feature Analytics', href: '/admin/analytics', icon: BarChart },
  { name: 'Error Logs', href: '/admin/errors', icon: AlertTriangle },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'System Report', href: '/admin/reports', icon: FileText },
];

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Điều hướng quản trị"
      className={`sidebar-font fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-xl transition-transform duration-200 ease-out lg:translate-x-0 lg:shadow-none ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex min-h-20 items-start justify-between border-b border-sidebar-border p-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-brand">Hệ thống tự học</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Bảng điều khiển quản trị</p>
        </div>
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={onClose}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {MENUS.map((menu) => {
            const Icon = menu.icon;
            const active = isActive(pathname, menu.href);
            return (
              <li key={menu.name}>
                <Link
                  href={menu.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? 'bg-brand-soft text-brand shadow-[inset_3px_0_0_var(--brand)]'
                      : 'text-sidebar-foreground hover:translate-x-0.5 hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {menu.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
