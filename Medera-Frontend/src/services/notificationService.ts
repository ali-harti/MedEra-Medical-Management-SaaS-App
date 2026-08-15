/**
 * notificationService — REST API calls for Notifications.
 */
import api from './api';

export interface Notification {
  id: string;
  type: 'APPOINTMENT' | 'MESSAGE' | 'SYSTEM' | 'PATIENT' | 'INVITATION';
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export interface NotificationsResponse {
  count: number;
  results: Notification[];
}

export const notificationService = {
  list: async (): Promise<Notification[]> => {
    const res = await api.get<NotificationsResponse>('/messaging/notifications/');
    return res.data.results ?? res.data as unknown as Notification[];
  },

  markRead: async (id: string): Promise<void> => {
    await api.post(`/messaging/notifications/${id}/mark_read/`);
  },

  markAllRead: async (): Promise<void> => {
    await api.post('/messaging/notifications/mark_all_read/');
  },
};

export const authService = {
  doctorRegister: async (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    specialty?: string;
    phone?: string;
  }) => {
    const res = await api.post('/auth/doctor/register/', data);
    return res.data;
  },

  inviteSecretary: async (data: {
    email: string;
    first_name?: string;
    last_name?: string;
  }) => {
    const res = await api.post('/auth/invite-secretary/', data);
    return res.data;
  },

  validateInviteToken: async (token: string) => {
    const res = await api.get(`/auth/validate-invite/?token=${token}`);
    return res.data;
  },

  secretarySignup: async (data: { token: string; password: string }) => {
    const res = await api.post('/auth/secretary-signup/', data);
    return res.data;
  },
};
