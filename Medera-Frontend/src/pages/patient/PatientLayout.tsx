import React, { useState, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Home, Calendar, Clock, Activity, FileText, CreditCard, MessageSquare, Settings, LogOut, Bell, FileSignature, Stethoscope, Search, ClipboardList } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { TopRightActions } from '../../components/TopRightActions';
import { Logo } from '../../components/Layout';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as authService from '../../services/authService';
import { getAccessToken } from '../../services/tokenStore';
import { useWebSocket, type WSMessage } from '../../hooks/useWebSocket';
import NotificationBell from '../../components/common/NotificationBell';
import type { Notification } from '../../services/notificationService';
import { useToast } from '../../components/Toast';
import { getMe } from '../../services/authService';
import { useMessageBadge } from '../../hooks/useMessageBadge';
import { useQueryClient } from '@tanstack/react-query';

export default function PatientLayout() {
  const { t } = useLanguage();
  const { logout, user, isLoading: userLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const unreadMessagesCount = useMessageBadge();

  const patientInitials = user ? (user.first_name?.[0] || '') + (user.last_name?.[0] || '') : '';

  const { addToast } = useToast();
  const [wsNotifications, setWsNotifications] = useState<Notification[]>([]);

  // WebSocket — real-time events
  const handleWsMessage = useCallback((msg: WSMessage) => {
    if (msg.type === 'NOTIFICATION') {
      const n = msg.data as unknown as Notification;
      setWsNotifications(prev => [n, ...prev]);
      addToast(n.title + ': ' + n.message, 'info');
    } else if (msg.type === 'NEW_MESSAGE') {
      const data = msg.data as any;
      addToast(`Nouveau message de ${data.sender}`, 'info');
      queryClient.invalidateQueries({ queryKey: ['messaging', 'unread_count'] });
      queryClient.invalidateQueries({ queryKey: ['messaging', 'threads'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
      queryClient.invalidateQueries({ queryKey: ['patient-message-threads'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'thread', data.thread_id] });
      queryClient.invalidateQueries({ queryKey: ['patient-messages', data.thread_id] });
    }
  }, [addToast, queryClient]);

  useWebSocket(getAccessToken(), handleWsMessage);

  if (!userLoading && user && user.health_profile_complete === false && !location.pathname.includes('/onboarding')) {
    return <Navigate to="/patient/onboarding/health" replace />;
  }

  if (userLoading) {
    return <div className="min-h-screen bg-bg-canvas flex items-center justify-center text-text-muted">Loading...</div>;
  }

  const navItems = [
    { icon: <Home size={18} />, label: t('patient.nav.dashboard') || 'Dashboard', path: '/patient/dashboard' },
    { icon: <Search size={18} />, label: t('patient.nav.findDoctor') || 'Find a Doctor', path: '/patient/find-doctor' },
    { icon: <ClipboardList size={18} />, label: t('patient.nav.demands') || 'Demandes', path: '/patient/demands' },
    { icon: <Calendar size={18} />, label: t('patient.nav.appointments') || 'Appointments', path: '/patient/appointments' },
    { icon: <Stethoscope size={18} />, label: t('patient.nav.consultations') || 'Consultations', path: '/patient/consultations' },
    { icon: <FileSignature size={18} />, label: t('patient.nav.prescriptions') || 'Prescriptions', path: '/patient/prescriptions' },
    { icon: <CreditCard size={18} />, label: t('patient.nav.billing') || 'Billing', path: '/patient/billing' },
    { icon: <MessageSquare size={18} />, label: t('patient.nav.messages') || 'Messages', path: '/patient/messages', badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined },
    { icon: <Settings size={18} />, label: t('patient.nav.settings') || 'Settings', path: '/patient/settings' },
  ];

  const getPageTitle = (path: string) => {
    const key = path.split('/').pop();
    const item = navItems.find(nav => nav.path.endsWith(key || ''));
    return item ? item.label : (t('patient.nav.dashboard') || 'Dashboard');
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-bg-canvas flex text-text-primary overflow-hidden font-sans">
      {/* Ambient Orbs */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] orb-1 rounded-full blur-[100px]"></div>
        <div className="absolute top-[40%] left-[40%] w-[600px] h-[600px] orb-2 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] orb-3 rounded-full blur-[80px]"></div>
      </div>

      {/* Global Toast used instead */}

      {/* Sidebar */}
      <aside className="w-[260px] border-r border-ui-border bg-bg-surface flex-col hidden lg:flex fixed h-screen z-20 transition-colors duration-300">
        <div className="p-6 pb-2">
           <Logo className="h-10" />
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center justify-between px-5 py-3 rounded-[10px] transition-all duration-200 group ${
                  isActive 
                    ? 'bg-brand-indigo/10 border-brand-indigo/30 text-brand-indigo font-semibold dark:text-text-primary'
                    : 'text-text-muted border-transparent hover:bg-bg-input hover:text-text-primary hover:translate-x-[3px]'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-[20%] bottom-[20%] w-[4px] bg-brand-indigo rounded-[2px] transform scale-y-100 transition-transform duration-200" />
                )}
                <div className="flex items-center gap-3">
                  <div className={isActive ? 'text-brand-indigo dark:text-text-primary' : ''}>
                    {item.icon}
                  </div>
                  <span className="text-[14px]">{item.label}</span>
                </div>
                {typeof item.badge === 'number' && (
                  <div className="rounded-full min-w-[20px] px-1.5 py-[2px] text-center font-mono text-[10px] font-bold bg-brand-indigo text-white shadow-sm shadow-brand-indigo/30 animate-in zoom-in">
                    {item.badge}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-5 border-t border-ui-border mt-auto transition-colors duration-300">
           <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-lavender p-[1.5px] shrink-0">
                <div className="w-full h-full rounded-full border border-bg-surface bg-bg-elevated flex items-center justify-center text-[12px] font-bold text-text-primary overflow-hidden">
                  {user?.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" /> : patientInitials}
                </div>
              </div>
              <div className="flex flex-col flex-1 truncate">
                 <div className="text-[14px] font-medium text-text-primary font-sans truncate">{user?.first_name} {user?.last_name}</div>
                 <div className="text-[13px] text-text-muted truncate">Patient Portal</div>
              </div>
              <button
                 onClick={handleLogout}
                 className="p-1.5 rounded-full text-text-muted hover:text-state-error hover:bg-state-error/10 transition-colors shrink-0"
              >
                <LogOut size={18} />
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen">
         <header className="h-[64px] border-b border-ui-border flex items-center justify-between px-8 glass-island-nav fixed top-0 right-0 left-0 lg:left-[260px] z-30 transition-all duration-300">
            <div className="flex items-baseline gap-3">
               <h1 className="text-[24px] font-serif italic text-text-primary capitalize">
                  {getPageTitle(location.pathname)}
               </h1>
               <span className="font-mono text-[11px] text-text-muted">
                  PATIENT → {getPageTitle(location.pathname).toUpperCase()}
               </span>
            </div>
            
            <div className="flex items-center gap-5 relative">
               <TopRightActions />
               {/* Notifications */}
               <NotificationBell externalNotifications={wsNotifications} />

               <Link to="/patient/settings" className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-lavender p-[1.5px] cursor-pointer focus:outline-none hover:opacity-90 transition-opacity">
                  <div className="w-full h-full rounded-full border border-bg-surface bg-bg-elevated flex items-center justify-center text-[10px] font-bold text-text-primary overflow-hidden">
                    {user?.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" /> : patientInitials}
                  </div>
               </Link>
            </div>
         </header>

         <main className="flex-1 mt-[64px] p-10 z-10 w-full relative">
           <Outlet />
         </main>
      </div>
    </div>
  );
}
