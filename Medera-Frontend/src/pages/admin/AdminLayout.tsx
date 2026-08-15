import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Hexagon, Users, Stethoscope, ClipboardList, Settings, Bell, LogOut, Sliders } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TopRightActions } from '../../components/TopRightActions';
import { Logo } from '../../components/Layout';
import { motion, AnimatePresence } from 'motion/react';

import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getDashboardKpis } from '../../services/adminService';

export default function AdminLayout() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const { lang } = useLanguage(); // Ensure reactivity to language changes


  const [notifications, setNotifications] = useState([
    { id: 1, text: t('admin.notifications.msg1') || "New doctor application from Dr. Youssef Bennani pending review.", time: t('admin.notifications.time1') || "2h ago", unread: true },
    { id: 2, text: t('admin.notifications.msg2') || "System daily backup completed successfully.", time: t('admin.notifications.time2') || "5h ago", unread: false },
    { id: 3, text: t('admin.notifications.msg3') || "3 new patient registrations in the last hour.", time: t('admin.notifications.time3') || "1d ago", unread: false },
  ]);
  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const getPageTitle = (path: string) => {
    const key = path.split('/').pop();
    switch (key) {
      case 'dashboard': return t('admin.nav.dashboard') || 'Dashboard';
      case 'users': return t('admin.nav.users') || 'Users';
      case 'applications': return t('admin.nav.applications') || 'Applications';
      case 'audit': return t('admin.nav.audit') || 'Audit Log';
      case 'cabinet': return t('admin.nav.cabinet') || 'Cabinet Config';
      case 'settings': return t('admin.nav.settings') || 'Settings';
      default: return t('admin.nav.dashboard') || 'Dashboard';
    }
  };

  const { data: kpis } = useQuery({
    queryKey: ['admin-kpis'],
    queryFn: getDashboardKpis,
    refetchInterval: 30000,
  });

  const pendingCount = kpis?.pending_applications ?? 0;

  const navItems = [
    { icon: <Hexagon size={18} />, label: t('admin.nav.dashboard') || "Dashboard", path: '/admin/dashboard' },
    { icon: <ClipboardList size={18} />, label: t('admin.nav.appointments') || "Appointments", path: '/admin/appointments' },
    { icon: <Users size={18} />, label: t('admin.nav.users') || "Users", path: '/admin/users' },
    { icon: <Stethoscope size={18} />, label: t('admin.nav.applications') || "Applications", path: '/admin/applications', badge: pendingCount },
    { icon: <ClipboardList size={18} />, label: t('admin.nav.audit') || "Audit Log", path: '/admin/audit' },
    { icon: <Sliders size={18} />, label: t('admin.nav.cabinet') || "Cabinet Config", path: '/admin/cabinet' },
    { icon: <Settings size={18} />, label: t('admin.nav.settings') || "Settings", path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-bg-canvas flex text-text-primary font-sans">
      {/* Ambient Orbs */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] orb-1 rounded-full blur-[100px]"></div>
        <div className="absolute top-[40%] left-[40%] w-[600px] h-[600px] orb-2 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] orb-3 rounded-full blur-[80px]"></div>
      </div>

      {/* Sidebar */}
      <aside className="w-[260px] border-r border-ui-border bg-bg-surface flex-col hidden lg:flex fixed h-screen z-20 transition-colors duration-300">
        <div className="p-6 pb-2">
           <Logo className="h-10" />
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname === '/admin' && item.path === '/admin/dashboard');
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
                {item.badge && (
                  <div className="bg-state-warning text-text-primary dark:text-black rounded-full px-[7px] py-[2px] font-mono text-[10px] font-bold animate-[pulse_3s_ease-in-out_infinite]">
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
                  {user?.avatar ? <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" /> : ((user?.first_name?.[0] || 'A') + (user?.last_name?.[0] || 'U')).toUpperCase()}
                </div>
              </div>
              <div className="flex flex-col flex-1 truncate">
                 <div className="text-[14px] font-medium text-text-primary font-sans truncate">{user?.first_name} {user?.last_name}</div>
                 <div className="text-[13px] text-text-muted truncate">System Administrator</div>
              </div>
              <button 
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="p-1.5 rounded-full text-text-muted hover:text-state-error hover:bg-state-error/10 transition-colors shrink-0"
              >
                <LogOut size={18} />
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen min-w-0">
         <header className="h-[64px] border-b border-ui-border flex items-center justify-between px-8 glass-island-nav fixed top-0 right-0 left-0 lg:left-[260px] z-30 transition-all duration-300">
            <div className="flex items-baseline gap-3">
               <h1 className="text-[24px] font-serif italic text-text-primary capitalize">
                  {getPageTitle(location.pathname)}
               </h1>
               <span className="font-mono text-[11px] text-text-muted">
                  ADMIN → {getPageTitle(location.pathname).toUpperCase()}
               </span>
            </div>
            
            <div className="flex items-center gap-5 relative">
               <TopRightActions />

               {/* Notifications */}
               <div className="relative">
                 <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative text-text-muted hover:text-text-primary transition-colors group focus:outline-none"
                 >
                    <Bell size={20} className="group-hover:animate-[swing_400ms_ease-in-out]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-state-warning text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-bg-surface">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                 </button>

                 <AnimatePresence>
                    {showNotifications && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute right-0 top-full mt-3 w-[320px] glass-island border border-ui-border rounded-xl shadow-xl overflow-hidden z-50 flex flex-col"
                        >
                          <div className="px-4 py-3 border-b border-ui-border bg-bg-elevated flex items-center justify-between">
                            <span className="text-[14px] font-semibold text-text-primary">{t('admin.notifications.title') || "Notifications"}</span>
                            {unreadCount > 0 && (
                               <span className="text-[10px] bg-brand-indigo/10 text-brand-indigo px-2 py-0.5 rounded-full font-bold">{unreadCount} {t('admin.notifications.new') || "New"}</span>
                            )}
                          </div>
                          <div className="max-h-[300px] overflow-y-auto flex-col divide-y divide-ui-border/50">
                            {notifications.map(n => (
                              <div key={n.id} className={`p-4 hover:bg-bg-input cursor-pointer transition-colors ${n.unread ? 'bg-bg-input/50' : ''}`}>
                                 <p className={`text-[13px] ${n.unread ? 'text-text-primary font-medium' : 'text-text-muted'} leading-relaxed`}>{n.text}</p>
                                 <p className="text-[11px] text-text-muted mt-2 font-mono">{n.time}</p>
                              </div>
                            ))}
                          </div>
                          <div className="p-2 border-t border-ui-border bg-bg-elevated text-center">
                            <button onClick={markAllAsRead} className="text-[12px] text-brand-indigo font-medium hover:underline">{t('admin.notifications.markAllRead') || "Mark all as read"}</button>
                          </div>
                        </motion.div>
                      </>
                    )}
                 </AnimatePresence>
               </div>

               <Link to="/admin/settings" className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-lavender p-[1.5px] cursor-pointer focus:outline-none hover:opacity-90 transition-opacity">
                  <div className="w-full h-full rounded-full border border-bg-surface bg-bg-elevated flex items-center justify-center text-[10px] font-bold text-text-primary uppercase overflow-hidden">
                    {user?.avatar ? <img src={user.avatar} alt="Admin" className="w-full h-full object-cover" /> : ((user?.first_name?.[0] || 'A') + (user?.last_name?.[0] || 'U')).toUpperCase()}
                  </div>
               </Link>
            </div>
         </header>

         <main className="flex-1 mt-[64px] p-10 z-10 w-full relative min-w-0">
           <Outlet />
         </main>
      </div>
    </div>
  );
}
