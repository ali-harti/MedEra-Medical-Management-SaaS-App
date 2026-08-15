import api from './api';
import { Patient, PaginatedResponse } from '@/types';

export const getPatients = (params?: {
  search?: string;
  is_archived?: boolean;
  page?: number;
}): Promise<PaginatedResponse<Patient>> =>
  api.get('/api/patients/', { params }).then(r => r.data);

export const getPatient = (id: string): Promise<Patient> =>
  api.get(`/api/patients/${id}/`).then(r => r.data);

export const getPatientTimeline = (id: string) =>
  api.get(`/api/patients/${id}/timeline/`).then(r => r.data);

export const createPatient = (data: Partial<Patient>) =>
  api.post('/api/patients/', data).then(r => r.data);

export const updatePatient = (id: string, data: Partial<Patient>) =>
  api.patch(`/api/patients/${id}/`, data).then(r => r.data);

export const archivePatient = (id: string) =>
  api.post(`/api/patients/${id}/archive/`).then(r => r.data);

export const restorePatient = (id: string) =>
  api.post(`/api/patients/${id}/unarchive/`).then(r => r.data);

export const getPatientDashboardKpis = () =>
  api.get('/api/patient-portal/dashboard/kpis/').then(r => r.data);

export const getContacts = () =>
  api.get('/api/patient-portal/contacts/').then(r => r.data);

export const payInvoice = (invoiceId: string, paymentMethod: 'CASH' | 'CARD' | 'INSURANCE' = 'CARD') =>
  api.post(`/api/billing/invoices/${invoiceId}/mark_paid/`, { payment_method: paymentMethod }).then(r => r.data);

export const changePassword = (oldPassword: string, newPassword: string) =>
  api.post('/api/auth/change-password/', { old_password: oldPassword, new_password: newPassword }).then(r => r.data);
