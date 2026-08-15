import api from './api';
import { Invoice, PaginatedResponse } from '@/types';

export const getInvoices = (params?: {
  // ⚠️ ACTUAL STATUS VALUES: PENDING|PAID|CANCELLED|REFUNDED
  status?: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  patient_id?: string;
  page?: number;
}): Promise<PaginatedResponse<Invoice>> =>
  api.get('/api/billing/', { params }).then(r => r.data);

export const createInvoice = (data: {
  patient: string;
  consultation?: string;
  amount_total: number;
  notes?: string;
}) => api.post('/api/billing/', data).then(r => r.data);

export const markInvoicePaid = (id: string, data: {
  payment_method: 'CASH' | 'CARD' | 'INSURANCE' | 'ONLINE';
}) => api.post(`/api/billing/${id}/mark_paid/`, data).then(r => r.data);

export const cancelInvoice = (id: string) =>
  // ⚠️ Check with backend — UNPAID→CANCELLED may be different endpoint
  api.patch(`/api/billing/${id}/`, { status: 'CANCELLED' }).then(r => r.data);
