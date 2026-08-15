import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '../services/messagingService';

export function useMessageBadge() {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['messaging', 'unread_count'],
    queryFn: getUnreadCount,
    refetchInterval: 30000, // Fallback polling every 30s just in case
  });

  return unreadCount;
}
