import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL } from '@/config/api';
import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken, clearTokens } from './tokenStore';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Inject token on every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — try refresh, then force logout
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refresh = getRefreshToken();
        if (!refresh) throw new Error('No refresh token');

        // ⚠️ ACTUAL ENDPOINT from investigation: /api/auth/token/refresh/
        const res = await axios.post(`${API_BASE_URL}/api/auth/token/refresh/`, { refresh });
        const newAccess = res.data.access;
        const newRefresh = res.data.refresh;

        setAccessToken(newAccess);
        if (newRefresh) setRefreshToken(newRefresh);

        processQueue(null, newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        // Only redirect if not already on login/landing
        if (!['/login', '/', '/get-started'].includes(window.location.pathname)) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
