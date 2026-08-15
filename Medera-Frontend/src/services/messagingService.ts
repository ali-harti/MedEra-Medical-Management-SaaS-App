import api from './api';
import { MessageThread, Message, PaginatedResponse } from '@/types';

// ⚠️ ACTUAL ENDPOINT: /api/messaging/threads/ (confirmed in investigation)
export const getThreads = (): Promise<PaginatedResponse<MessageThread>> =>
  api.get('/api/messaging/threads/').then(r => r.data);

export const getMessages = (threadId: string): Promise<Message[]> =>
  api.get(`/api/messaging/threads/${threadId}/messages/`).then(r => r.data);

export const createThread = (data: {
  recipient_id: string;
  subject: string;
  content: string;
  thread_type?: string;
}) => api.post('/api/messaging/threads/', data).then(r => r.data);

export const sendReply = (threadId: string, content: string) =>
  api.post(`/api/messaging/threads/${threadId}/reply/`, { content }).then(r => r.data);

export const markThreadRead = (threadId: string) =>
  api.patch(`/api/messaging/threads/${threadId}/`, { is_read: true }).then(r => r.data);

export const getUnreadCount = (): Promise<number> =>
  api.get('/api/messaging/threads/unread_count/').then(r => r.data.unread_count);
