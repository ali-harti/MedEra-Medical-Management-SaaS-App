import api from './api';
import { Prescription, PaginatedResponse } from '@/types';

export const getPrescriptions = (params?: {
  is_valid?: boolean;
  patient_id?: string;
  page?: number;
}): Promise<PaginatedResponse<Prescription>> =>
  api.get('/api/prescriptions/', { params }).then(r => r.data);

export const getPrescription = (id: string): Promise<Prescription> =>
  api.get(`/api/prescriptions/${id}/`).then(r => r.data);

export const createPrescription = (data: Partial<Prescription>) =>
  api.post('/api/prescriptions/', data).then(r => r.data);

export const updatePrescription = (id: string, data: Partial<Prescription>) =>
  api.patch(`/api/prescriptions/${id}/`, data).then(r => r.data);

// ⚠️ Backend provides a POST action for cancellation
export const cancelPrescription = (id: string) =>
  api.post(`/api/prescriptions/${id}/cancel/`).then(r => r.data);

export const downloadPrescriptionPdf = async (id: string): Promise<void> => {
  const res = await api.get(
    `/api/prescriptions/${id}/pdf/`,
    { responseType: 'blob' }
  );
  const url = URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `ordonnance-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
