import type { SessionUser, UserRole } from '@/types/auth';

export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_ROLE_KEY = 'auth_role';
export const AUTH_REFRESH_TOKEN_KEY = 'refresh_token';
export const AUTH_USER_KEY = 'auth_user';

const COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

export interface SaveSessionParams {
  accessToken: string;
  refreshToken?: string;
  user: SessionUser;
}

export interface SessionData {
  accessToken: string | null;
  role: UserRole | null;
  user: SessionUser | null;
}

const emptySession: SessionData = {
  accessToken: null,
  role: null,
  user: null,
};

let cachedSession: SessionData | null = null;

type SessionListener = () => void;
const listeners = new Set<SessionListener>();

function notifySessionListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Đọc giá trị cookie theo tên trong môi trường Client
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.startsWith(' ')) c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

/**
 * Lưu cookie an toàn với Path=/, SameSite=Lax, max-age 7 ngày
 */
export function setCookie(
  name: string,
  value: string,
  maxAgeSeconds = COOKIE_MAX_AGE_SECONDS,
): void {
  if (typeof document === 'undefined') return;

  const cookieStr = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; max-age=${maxAgeSeconds}`;
  document.cookie = cookieStr;
}

/**
 * Xóa một cookie
 */
export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=; Path=/; SameSite=Lax; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function readSessionFromBrowser(): SessionData {
  if (typeof window === 'undefined') return emptySession;

  const accessToken = getCookie(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_TOKEN_KEY);
  const cookieRole = getCookie(AUTH_ROLE_KEY);

  let user: SessionUser | null = null;
  let role: UserRole | null = (cookieRole as UserRole) || null;

  try {
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (storedUser) {
      user = JSON.parse(storedUser) as SessionUser;
      if (!role && user.role) {
        role = user.role;
      }
    }
    if (!role) {
      const storedRole = localStorage.getItem(AUTH_ROLE_KEY) as UserRole | null;
      if (storedRole) role = storedRole;
    }
  } catch {
    // JSON parse error
  }

  return { accessToken, role, user };
}

/**
 * Lấy toàn bộ thông tin phiên làm việc hiện tại trực tiếp từ Cookies và LocalStorage
 */
export function getSession(): SessionData {
  return readSessionFromBrowser();
}

/**
 * Snapshot phục vụ useSyncExternalStore ở Client (giữ reference equality khi data không đổi)
 */
export function getSessionSnapshot(): SessionData {
  const current = readSessionFromBrowser();
  if (
    cachedSession &&
    cachedSession.accessToken === current.accessToken &&
    cachedSession.role === current.role &&
    cachedSession.user?.id === current.user?.id &&
    cachedSession.user?.email === current.user?.email
  ) {
    return cachedSession;
  }
  cachedSession = current;
  return cachedSession;
}

/**
 * Snapshot phục vụ useSyncExternalStore ở Server (SSR)
 */
export function getServerSessionSnapshot(): SessionData {
  return emptySession;
}

/**
 * Đăng ký lắng nghe thay đổi session (đồng bộ tab và React state)
 */
export function subscribeSession(callback: SessionListener): () => void {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === AUTH_USER_KEY || e.key === AUTH_ROLE_KEY || e.key === AUTH_TOKEN_KEY) {
      callback();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

/**
 * Lưu trữ phiên đăng nhập đồng bộ vào Cookies (cho SSR/Middleware) và LocalStorage (cho Client)
 */
export function saveSession({ accessToken, refreshToken, user }: SaveSessionParams): void {
  // Lưu vào Cookies cho Next.js Middleware và SSR
  setCookie(AUTH_TOKEN_KEY, accessToken);
  setCookie(AUTH_ROLE_KEY, user.role);
  if (refreshToken) {
    setCookie(AUTH_REFRESH_TOKEN_KEY, refreshToken);
  }

  // Lưu vào LocalStorage cho truy xuất tức thời ở Client Component
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
      localStorage.setItem(AUTH_ROLE_KEY, user.role);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
      }
    } catch {
      // Bỏ qua lỗi storage quota exceeded trong môi trường đặc biệt
    }
  }

  notifySessionListeners();
}

/**
 * Lấy token hiện tại từ Cookie (ưu tiên) hoặc LocalStorage
 */
export function getStoredToken(): string | null {
  const cookieToken = getCookie(AUTH_TOKEN_KEY);
  if (cookieToken) return cookieToken;

  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Lấy refresh token hiện tại từ Cookie (ưu tiên) hoặc LocalStorage
 */
export function getStoredRefreshToken(): string | null {
  const cookieToken = getCookie(AUTH_REFRESH_TOKEN_KEY);
  if (cookieToken) return cookieToken;

  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Kiểm tra xem người dùng đã đăng nhập chưa
 */
export function isAuthenticated(): boolean {
  return Boolean(getStoredToken());
}

/**
 * Xóa sạch toàn bộ phiên đăng nhập (Cookies + LocalStorage)
 */
export function clearSession(): void {
  // Xóa Cookies
  deleteCookie(AUTH_TOKEN_KEY);
  deleteCookie(AUTH_ROLE_KEY);
  deleteCookie(AUTH_REFRESH_TOKEN_KEY);

  // Xóa LocalStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_ROLE_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    } catch {
      // Bỏ qua lỗi truy cập storage
    }
  }

  notifySessionListeners();
}
