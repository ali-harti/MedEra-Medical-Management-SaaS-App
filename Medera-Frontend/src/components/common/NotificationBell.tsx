import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, CheckCheck, X, Loader2, Calendar, MessageSquare, Settings, User, Mail } from 'lucide-react';
import { notificationService, type Notification } from '../../services/notificationService';

interface NotificationBellProps {
  onNewNotification?: (n: Notification) => void;
  externalNotifications?: Notification[];
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  APPOINTMENT: {
    icon: <Calendar size={15} />,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.12)',
  },
  MESSAGE: {
    icon: <MessageSquare size={15} />,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.12)',
  },
  SYSTEM: {
    icon: <Settings size={15} />,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.12)',
  },
  PATIENT: {
    icon: <User size={15} />,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.12)',
  },
  INVITATION: {
    icon: <Mail size={15} />,
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.12)',
  },
};

const DEFAULT_CONFIG = {
  icon: <Bell size={15} />,
  color: '#6366F1',
  bg: 'rgba(99,102,241,0.12)',
};

export default function NotificationBell({ externalNotifications = [] }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => { fetchNotifications(); }, []);

  // Merge real-time WebSocket notifications
  useEffect(() => {
    if (externalNotifications.length > 0) {
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newOnes = externalNotifications.filter(n => !existingIds.has(n.id));
        return [...newOnes, ...prev];
      });
    }
  }, [externalNotifications]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.list();
      setNotifications(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const markRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* silent */ }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const timeAgo = (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button — uses design tokens, matches TopRightActions style */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative p-2 rounded-xl border transition-all duration-200 ${
          open
            ? 'bg-brand-indigo/12 border-brand-indigo/40 text-brand-indigo'
            : 'bg-bg-elevated border-ui-border text-text-muted hover:text-text-primary hover:border-brand-indigo/30 hover:bg-bg-input'
        }`}
        title="Notifications"
      >
        {unreadCount > 0
          ? <BellRing size={20} className="text-brand-indigo" />
          : <Bell size={20} />
        }
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-state-error text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute top-[calc(100%+10px)] right-0 w-[380px] z-[200] rounded-2xl overflow-hidden shadow-xl animate-notif-in"
          style={{
            background: 'var(--color-bg-surface, #ffffff)',
            border: '1px solid var(--color-ui-border, rgba(0,0,0,0.1))',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-ui-border">
            <div className="flex items-center gap-2.5">
              <Bell size={15} className="text-brand-indigo" />
              <span className="font-semibold text-[14px] text-text-primary">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-brand-indigo hover:bg-brand-indigo/8 transition-colors"
                  title="Mark all read"
                >
                  <CheckCheck size={13} />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-input transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={22} className="animate-spin text-brand-indigo opacity-60" />
                <p className="text-[13px] text-text-muted">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-bg-elevated border border-ui-border flex items-center justify-center">
                  <Bell size={20} className="text-text-muted opacity-50" />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-text-primary">All caught up!</p>
                  <p className="text-[12px] text-text-muted mt-0.5">No new notifications</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-ui-border">
                {notifications.map(n => {
                  const cfg = TYPE_CONFIG[n.type] || DEFAULT_CONFIG;
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && markRead(n.id)}
                      className={`flex items-start gap-3 px-5 py-3.5 transition-colors duration-150 ${
                        n.is_read
                          ? 'cursor-default'
                          : 'cursor-pointer hover:bg-brand-indigo/4'
                      } ${!n.is_read ? 'bg-brand-indigo/3' : ''}`}
                    >
                      {/* Icon chip */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.icon}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[13px] leading-snug ${n.is_read ? 'font-medium text-text-secondary' : 'font-semibold text-text-primary'}`}>
                            {n.title}
                          </span>
                          <span className="text-[11px] text-text-muted font-mono shrink-0 mt-0.5">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-[12px] text-text-muted mt-0.5 leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-brand-indigo shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-ui-border">
              <p className="text-[11px] text-text-muted text-center font-mono">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''} · {unreadCount} unread
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes notif-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
        .animate-notif-in { animation: notif-in 0.18s cubic-bezier(0.25,0.46,0.45,0.94) both; }
        .bg-brand-indigo\\/3 { background-color: rgba(99,102,241,0.03); }
        .hover\\:bg-brand-indigo\\/4:hover { background-color: rgba(99,102,241,0.05); }
        .bg-brand-indigo\\/8 { background-color: rgba(99,102,241,0.08); }
        .bg-brand-indigo\\/10 { background-color: rgba(99,102,241,0.10); }
        .bg-brand-indigo\\/12 { background-color: rgba(99,102,241,0.12); }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .divide-ui-border > * + * { border-top: 1px solid var(--color-ui-border, rgba(0,0,0,0.08)); }
      `}</style>
    </div>
  );
}
