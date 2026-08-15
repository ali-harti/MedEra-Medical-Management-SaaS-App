import api from './api';
import { User, DoctorApplication, AuditEntry, PaginatedResponse } from '@/types';

// ⚠️ NOTE from investigation: /api/patients/ returns 403 for ADMIN
// Admin needs separate user management endpoints
export const getUsers = (params?: {
  role?: string;
  search?: string;
  page?: number;
}): Promise<PaginatedResponse<User>> =>
  api.get('/api/auth/admin/users/', { params }).then(r => r.data);

export const createUser = (data: Partial<User> & { password?: string }) =>
  api.post('/api/auth/admin/users/', data).then(r => r.data);

export const updateUser = (id: string, data: Partial<User>) =>
  api.patch(`/api/auth/admin/users/${id}/`, data).then(r => r.data);

export const unlockUser = (id: string) =>
  api.post(`/api/auth/admin/users/${id}/unlock/`).then(r => r.data);

export const getApplications = (params?: {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  page?: number;
}): Promise<PaginatedResponse<DoctorApplication>> =>
  api.get('/api/admin/applications/', { params })
    .then(r => r.data);

export const approveApplication = (id: string) =>
  api.post(`/api/admin/applications/${id}/approve/`).then(r => r.data);

export const rejectApplication = (id: string, reason: string) =>
  api.post(`/api/admin/applications/${id}/reject/`, { reason }).then(r => r.data);

export const getAuditLog = (params?: {
  action?: string;
  model_name?: string;
  page?: number;
  page_size?: number;
  format?: 'json' | 'csv';
}): Promise<PaginatedResponse<AuditEntry>> =>
  api.get('/api/audit/', { params })
    .then(r => r.data);

export const exportAuditLogCsv = (params?: {
  action?: string;
  model_name?: string;
}) =>
  api.get('/api/audit/export/', { 
    params,
    responseType: 'blob'
  }).then(r => r.data);

export const exportHistoricalDataCsv = () =>
  api.get('/api/audit/export/', {
    responseType: 'blob'
  }).then(r => r.data);

export const getCabinetSettings = () =>
  api.get('/api/admin/cabinet/').then(r => r.data);

export const saveCabinetSettings = (data: object) =>
  api.put('/api/admin/cabinet/', data).then(r => r.data);

export const getAppointments = (params?: {
  status?: string;
  page?: number;
  search?: string;
}): Promise<PaginatedResponse<any>> =>
  api.get('/api/admin/appointments/', { params }).then(r => r.data);

export const exportAppointmentsCsv = (params?: {
  status?: string;
  search?: string;
}) =>
  api.get('/api/admin/appointments/', { 
    params: { ...params, export: 'true' },
    responseType: 'blob'
  }).then(r => r.data);

export const updateRoom = (id: string, data: any) =>
  api.patch(`/api/admin/cabinet/rooms/${id}/`, data).then(r => r.data);

export const getDashboardKpis = () =>
  api.get('/api/admin/stats/')
    .then(r => r.data);

export const getSystemHealth = () =>
  api.get('/api/dashboard/system-health/')
    .then(r => r.data);
