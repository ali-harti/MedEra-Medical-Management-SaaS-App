import api from './api';
import { PaginatedResponse, Appointment, Consultation, Patient } from '@/types';

export const getDoctorKpis = () =>
  api.get('/api/dashboard/kpis/').then(r => r.data);

export const getDoctorAppointments = (params?: {
  date?: string;
  status?: string;
}) => api.get('/api/appointments/', { params }).then(r => r.data);

export const getDoctorPatients = (params?: {
  search?: string;
  page?: number;
}) => api.get('/api/patients/', { params }).then(r => r.data);

export const getUpcomingVideoCall = () =>
  api.get('/api/appointments/next-video/').then(r => r.data);

export const getDashboardAgenda = () =>
  api.get('/api/dashboard/agenda/').then(r => r.data);

export const getDashboardWeeklyTrend = (period?: string) =>
  api.get('/api/dashboard/trend/', { params: { period } }).then(r => r.data);

export const getDashboardTopDiagnoses = () =>
  api.get('/api/dashboard/top-diagnoses/').then(r => r.data);
