import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import {
  setAccessToken, setRefreshToken,
  clearTokens, getRefreshToken, hasStoredSession
} from '@/services/tokenStore';

// ⚠️ ACTUAL FIELDS from /api/auth/me/ investigation
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  // ⚠️ ACTUAL role values: 'ADMIN' | 'MEDECIN' | 'SECRETAIRE' | 'PATIENT'
  role: 'ADMIN' | 'MEDECIN' | 'SECRETAIRE' | 'PATIENT';
  phone?: string;
  avatar?: string | null;
  is_active: boolean;
  created_at?: string;
  // Patient-specific
  health_profile_complete?: boolean;
  // Doctor-specific
  specialty?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const restore = async () => {
      const refresh = getRefreshToken();
      if (!refresh) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('[Auth] Attempting session restoration...');
        // Use direct axios to avoid interceptor redirects during boot
        const res = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, { refresh });
        
        if (res.data.access) {
          setAccessToken(res.data.access);
          if (res.data.refresh) setRefreshToken(res.data.refresh);
          
          console.log('[Auth] Access token restored, fetching profile...');
          const { getMe } = await import('@/services/authService');
          const meData = await getMe();
          setUser(meData);
          console.log('[Auth] Session restored for:', meData.email);
        } else {
          throw new Error('No access token in refresh response');
        }
      } catch (err) {
        console.error('[Auth] Session restoration failed:', err);
        clearTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    // Clear any previous query cache before logging in
    queryClient.clear();
    // ⚠️ ACTUAL ENDPOINT: /api/auth/token/ (NOT /api/auth/login/)
    const res = await api.post('/api/auth/token/', { email, password });
    // ⚠️ ACTUAL RESPONSE includes: refresh, access, user_id, email, full_name, role
    setAccessToken(res.data.access);
    setRefreshToken(res.data.refresh);
    // Fetch full profile for all fields
    const { getMe } = await import('@/services/authService');
    const meData = await getMe();
    setUser(meData);
    return meData;
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout/', { refresh: getRefreshToken() });
    } finally {
      clearTokens();
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    const res = await api.get('/api/auth/me/');
    setUser(res.data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
