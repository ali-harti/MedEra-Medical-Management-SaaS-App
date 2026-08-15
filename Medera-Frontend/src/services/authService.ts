import api from './api';
import { User } from '@/types';

// ⚠️ ACTUAL ENDPOINT: /api/auth/token/ (NOT /api/auth/login/)
export const login = (email: string, password: string) =>
  api.post('/api/auth/token/', { email, password }).then(r => r.data);

export const refreshToken = (refresh: string) =>
  api.post('/api/auth/token/refresh/', { refresh }).then(r => r.data);

// ⚠️ ACTUAL ENDPOINT: /api/auth/token/verify/ (NOT /api/auth/verify/)
export const verifyToken = (token: string) =>
  api.post('/api/auth/token/verify/', { token }).then(r => r.data);

export const getMe = (): Promise<User> =>
  api.get('/api/auth/me/', { params: { t: Date.now() } }).then(r => r.data);

export const updateMe = (data: FormData | Partial<User>) =>
  api.patch('/api/auth/me/', data, {
    headers: data instanceof FormData
      ? { 'Content-Type': 'multipart/form-data' }
      : {}
  }).then(r => r.data);

// ⚠️ ACTUAL ENDPOINT: /api/auth/register/patient/
export const registerPatient = (data: {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone: string;
}) => api.post('/api/auth/register/patient/', data).then(r => r.data);

export const changePassword = (data: {
  // ⚠️ ACTUAL FIELD: old_password (NOT current_password)
  old_password: string;
  new_password: string;
  confirm_password: string;
}) => api.post('/api/auth/change-password/', data).then(r => r.data);

export const logout = (refresh: string) =>
  api.post('/api/auth/logout/', { refresh }).then(r => r.data);

export const createSecretary = (data: {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
}) => api.post('/api/auth/invite-secretary/', data).then(r => r.data);

export const getSecretaries = (): Promise<User[]> =>
  api.get('/api/auth/medecin/secretaries/').then(r => r.data);

export const deleteSecretary = (id: string) =>
  api.delete(`/api/auth/medecin/secretaries/${id}/`).then(r => r.data);

export const registerDoctor = (data: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  specialty?: string;
  phone?: string;
}) => api.post('/api/auth/doctor/register/', data).then(r => r.data);

export const validateInvite = (token: string) =>
  api.get(`/api/auth/validate-invite/`, { params: { token } }).then(r => r.data);

export const secretarySignup = (data: {
  token: string;
  password: string;
}) => api.post('/api/auth/secretary-signup/', data).then(r => r.data);

// For secretary accounts — fetches the linked doctor's profile
export const getEmployer = (): Promise<User> =>
  api.get('/api/auth/employer/').then(r => r.data);
