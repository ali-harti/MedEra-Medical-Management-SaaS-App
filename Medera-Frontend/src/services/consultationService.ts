import api from './api';
import { Consultation, PaginatedResponse } from '@/types';

export const getConsultations = (params?: {
  status?: string;
  patient?: string;
  appointment?: string;
  has_prescription?: boolean;
  has_billing?: boolean;
  page?: number;
}): Promise<PaginatedResponse<Consultation>> =>
  api.get('/api/consultations/', { params }).then(r => r.data);

export const getConsultation = (id: string): Promise<Consultation> =>
  api.get(`/api/consultations/${id}/`).then(r => r.data);

export const createConsultation = (data: {
  patient: string;
  appointment?: string;
  consultation_type: 'IN_PERSON' | 'VIDEO';
}) => api.post('/api/consultations/', data).then(r => r.data);

export const updateConsultation = (id: string, data: Partial<Consultation>) =>
  api.patch(`/api/consultations/${id}/`, data).then(r => r.data);

export const startConsultation = (id: string) =>
  api.post(`/api/consultations/${id}/start/`).then(r => r.data);

export const finalizeConsultation = (id: string) =>
  api.post(`/api/consultations/${id}/finalize/`).then(r => r.data);

export const cancelConsultation = (id: string) =>
  api.post(`/api/consultations/${id}/cancel/`).then(r => r.data);

// ⚠️ ACTUAL ENDPOINT from investigation: /analyze/ (NOT /generate_ai_suggestions/)
export const generateAiSuggestions = (id: string, payload: object) =>
  api.post(`/api/consultations/${id}/analyze/`, payload).then(r => r.data);

export const startVideo = (id: string) =>
  api.post(`/api/consultations/${id}/start_video/`).then(r => r.data);

export const endVideo = (id: string) =>
  api.post(`/api/consultations/${id}/end_video/`).then(r => r.data);
