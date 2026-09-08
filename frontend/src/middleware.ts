import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDefaultRouteByRole, isProtectedRoute, isRouteAllowedForRole } from './config/roles';
import { AUTH_TOKEN_KEY, AUTH_ROLE_KEY } from './lib/auth/session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get(AUTH_TOKEN_KEY)?.value;
  const role = request.cookies.get(AUTH_ROLE_KEY)?.value;
  const isAuthenticated = Boolean(token);

  // 1. Phân luồng khi truy cập các trang xác thực công khai (/login, /register)
  const isAuthRoute = pathname === '/login' || pathname === '/register';
  if (isAuthRoute) {
    if (isAuthenticated && role) {
      const defaultRoute = getDefaultRouteByRole(role);
      if (defaultRoute !== '/login') {
        return NextResponse.redirect(new URL(defaultRoute, request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Bảo vệ các tuyến đường nội bộ (Role-based Protected Routes)
  if (isProtectedRoute(pathname)) {
    // Nếu chưa đăng nhập: chuyển hướng về /login kèm callbackUrl
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Nếu đã đăng nhập: kiểm tra quyền truy cập theo role
    if (!isRouteAllowedForRole(pathname, role)) {
      const defaultDashboard = getDefaultRouteByRole(role);
      return NextResponse.redirect(new URL(defaultDashboard, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Khớp tất cả request paths ngoại trừ:
     * - api routes
     * - _next/static (static assets)
     * - _next/image (image optimization)
     * - favicon, sitemap, robots và static files (svg, png, jpg, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
