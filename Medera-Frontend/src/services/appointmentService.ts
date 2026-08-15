import api from './api';
import { Appointment, PaginatedResponse } from '@/types';

export const getAppointments = (params?: {
  status?: string;
  date?: string;
  doctor_id?: string;
  patient_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  ordering?: string;
}): Promise<PaginatedResponse<Appointment>> =>
  api.get('/api/appointments/', { params }).then(r => r.data);

export const getAvailableSlots = (params: {
  doctor_id: string;
  date: string;          // YYYY-MM-DD
  duration?: number;     // minutes
}) => api.get('/api/appointments/available-slots/', { params }).then(r => r.data);

export const createAppointment = (data: {
  patient?: string;
  doctor: string;
  start_datetime: string;   // ISO 8601
  end_datetime: string;     // ISO 8601
  consultation_type: 'IN_PERSON' | 'VIDEO';
  motive: string;           // ⚠️ ACTUAL FIELD: motive (NOT reason)
  room?: string;
  status?: string;
}) => api.post('/api/appointments/', data).then(r => r.data);

// ⚠️ ACTUAL STATUS VALUES: PLANNED|CONFIRMED|IN_PROGRESS|DONE|CANCELLED
export const updateAppointment = (id: string, data: Partial<Appointment>) =>
  api.patch(`/api/appointments/${id}/`, data).then(r => r.data);

export const transitionStatus = (id: string, data: { status: string; cancellation_reason?: string }) =>
  api.post(`/api/appointments/${id}/transition/`, data).then(r => r.data);

export const blockTimeSlot = (data: {
  doctor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason?: string;
}) => api.post('/api/appointments/block/', data).then(r => r.data);

export const removeBlock = (id: string) =>
  api.delete(`/api/appointments/block/${id}/`);

export const startVideo = (id: string) =>
  api.post(`/api/appointments/${id}/start_video/`).then(r => r.data);

export const endVideo = (id: string) =>
  api.post(`/api/appointments/${id}/end_video/`).then(r => r.data);

export const getDemands = (status?: string) =>
  api.get('/api/appointments/', { params: { status: status || 'REQUESTED,PLANNED,CONFIRMED,REJECTED', ordering: '-created_at' } })
    .then(r => Array.isArray(r.data) ? r.data : r.data?.results ?? []);

export const acceptDemand = (id: string) =>
  api.post(`/api/appointments/${id}/accept-demand/`).then(r => r.data);

export const rejectDemand = (id: string, reason: string) =>
  api.post(`/api/appointments/${id}/reject-demand/`, { reason }).then(r => r.data);


