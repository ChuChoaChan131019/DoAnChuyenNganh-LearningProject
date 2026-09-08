'use client';

import React, { createContext, useContext, useSyncExternalStore, useCallback, useMemo } from 'react';
import type { User, UserRole, LoginRequest, LoginResponse } from '@/types/auth';
import {
  saveSession,
  clearSession,
  subscribeSession,
  getSessionSnapshot,
  getServerSessionSnapshot,
} from '@/lib/auth/session';
import { authApi } from '@/lib/api';

export interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const session = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );

  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResponse> => {
    const res = await authApi.login(credentials);
    saveSession({
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      user: res.user,
    });
    return res;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Luôn dọn dẹp sạch phiên phía client kể cả khi backend không phản hồi
    } finally {
      clearSession();
    }
  }, []);

  const refreshSession = useCallback(() => {
    // Kích hoạt re-check cho subscribers
    window.dispatchEvent(new Event('storage'));
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user: session.user,
      role: session.role,
      isAuthenticated: Boolean(session.accessToken && (session.user || session.role)),
      isLoading: false,
      login,
      logout,
      refreshSession,
    }),
    [session, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
