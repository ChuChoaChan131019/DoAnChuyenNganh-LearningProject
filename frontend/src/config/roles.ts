import { UserRole } from '@/types/auth';

export interface RoleConfig {
  role: UserRole;
  displayName: string;
  defaultRoute: string;
  allowedRoutePrefixes: string[];
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  learner: {
    role: 'learner',
    displayName: 'Học viên',
    defaultRoute: '/learner/dashboard',
    allowedRoutePrefixes: ['/learner'],
  },
  content_manager: {
    role: 'content_manager',
    displayName: 'Quản lý nội dung',
    defaultRoute: '/content-manager/dashboard',
    allowedRoutePrefixes: ['/content-manager'],
  },
  admin: {
    role: 'admin',
    displayName: 'Quản trị viên',
    defaultRoute: '/admin',
    allowedRoutePrefixes: ['/admin', '/content-manager', '/learner'],
  },
};

/**
 * Lấy đường dẫn mặc định (Dashboard) theo Role của tài khoản
 */
export function getDefaultRouteByRole(role?: UserRole | string | null): string {
  if (!role || !ROLE_CONFIGS[role as UserRole]) {
    return '/login';
  }
  return ROLE_CONFIGS[role as UserRole].defaultRoute;
}

/**
 * Kiểm tra xem một route có được phép truy cập bởi role này hay không
 */
export function isRouteAllowedForRole(pathname: string, role?: UserRole | string | null): boolean {
  if (!role || !ROLE_CONFIGS[role as UserRole]) {
    return false;
  }
  return ROLE_CONFIGS[role as UserRole].allowedRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Kiểm tra xem pathname có phải là route được bảo vệ (thuộc các role nội bộ) hay không
 */
export function isProtectedRoute(pathname: string): boolean {
  const protectedPrefixes = Object.values(ROLE_CONFIGS).flatMap((c) => c.allowedRoutePrefixes);
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Lấy danh sách các vai trò được phép truy cập một pathname
 */
export function getAllowedRolesForRoute(pathname: string): UserRole[] {
  return (Object.keys(ROLE_CONFIGS) as UserRole[]).filter((r) =>
    ROLE_CONFIGS[r].allowedRoutePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ),
  );
}
