'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  BarChart,
  AlertTriangle,
  Bell,
  FileText,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { clearSession } from '@/lib/auth/session';

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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearSession();
    toast.success('Đã đăng xuất');
    router.push('/login');
  };

  return (
    <aside className="sidebar-font flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border p-6">
        <h2 className="text-lg font-bold tracking-tight text-brand">Hệ thống tự học</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Bảng điều khiển quản trị</p>
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
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-soft text-brand'
                      : 'text-sidebar-foreground hover:bg-muted hover:text-foreground'
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

      <div className="border-t border-sidebar-border p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
