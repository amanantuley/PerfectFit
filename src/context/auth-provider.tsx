'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, ApiUser, authApi } from '@/lib/api';

type AuthContextValue = {
  user: ApiUser | null;
  loading: boolean;
  refresh: () => Promise<ApiUser | null>;
  refreshUser: () => Promise<ApiUser | null>;
  login: (email: string, password: string) => Promise<ApiUser>;
  register: (email: string, password: string) => Promise<ApiUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) console.error('Unable to verify session', error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    refresh,
    refreshUser: refresh,
    async login(email, password) { await authApi.login(email, password); const verified = await refresh(); if (!verified) throw new Error('Session verification failed'); return verified; },
    async register(email, password) { const registered = await authApi.register({ email, password }); setUser(registered); return registered; },
    async logout() { try { await authApi.logout(); } finally { setUser(null); } },
  }), [loading, refresh, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export const useAuthContext = useAuth;
