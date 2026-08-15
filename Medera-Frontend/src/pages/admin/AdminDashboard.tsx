import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate } from '../../utils/format';
import { Activity, Users, Clock, Server, ArrowUp, ChevronRight, Loader2, FileText, CheckCircle, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import {
  getDashboardKpis,
  getApplications,
  approveApplication,
  rejectApplication,
  getAuditLog,
  getSystemHealth,
  exportHistoricalDataCsv,
} from '../../services/adminService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardSkeleton } from '../../components/Skeleton';
import { formatDistanceToNow } from 'date-fns';

function CountUp({ end, duration = 1200 }: { end: number, duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
}

const getAuditColor = (action: string) => {
  const a = action.toUpperCase();
  if (a.includes('CREATE') || a.includes('CREATION') || a.includes('APPROVE') || a.includes('FINALIZED')) return 'success';
  if (a.includes('UPDATE') || a.includes('MODIFICATION') || a.includes('UNLOCK')) return 'warning';
  if (a.includes('DELETE') || a.includes('REJECT') || a.includes('LOCKOUT')) return 'error';
  return 'indigo';
};

import { getAccessToken } from '../../services/tokenStore';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  console.log("%c MEDERA ADMIN V2.0 - ACTIVE ", "background: #4B4ACF; color: white; font-weight: bold; padding: 4px; border-radius: 4px;");

  // ─── WebSocket Real-Time Listener ─────────────────────────────────────────
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    
    // Determine the host for WebSockets (handle dev vs prod)
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Usually API is running on localhost:8000 for local dev
    // In production, you'd use your actual domain, here fallback to location.host
    const backendHost = import.meta.env.VITE_API_URL 
      ? new URL(import.meta.env.VITE_API_URL).host 
      : window.location.host;
      
    // Assuming backend is at port 8000
    const wsUrl = `${wsProtocol}//localhost:8000/ws/admin-dashboard/?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'REFRESH') {
          console.log('Real-time event received, refreshing dashboard data...');
          queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
          queryClient.invalidateQueries({ queryKey: ['pending-applications'] });
          queryClient.invalidateQueries({ queryKey: ['recent-audit'] });
          queryClient.invalidateQueries({ queryKey: ['system-health'] });
        }
      } catch (e) {
        console.error("Failed to parse websocket message", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [queryClient]);

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['admin-kpis'],
    queryFn: getDashboardKpis,
  });

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['pending-applications'],
    queryFn: () => getApplications({ status: 'PENDING', page: 1 }),
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['recent-audit'],
    queryFn: () => getAuditLog({ page: 1 }),
  });

  const { data: health } = useQuery({
    queryKey: ['system-health'],
    queryFn: getSystemHealth,
  });

  // ─── Mutations ───────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: ({ type, id }: { type: 'approve' | 'reject', id: string }) => 
      type === 'approve' ? approveApplication(id) : rejectApplication(id, 'Rejected from dashboard'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['recent-audit'] });
    },
  });

  const apps = appsData?.results || [];
  const auditFeed = auditData?.results || [];
  
  const rbacData = [
    { name: t('admin.adminRole'), value: kpis?.role_breakdown?.ADMIN ?? 0, color: '#4B4ACF' },
    { name: t('admin.doctorRole'), value: kpis?.role_breakdown?.MEDECIN ?? 0, color: '#A5A4F3' },
    { name: t('admin.staffRole'), value: kpis?.role_breakdown?.SECRETAIRE ?? 0, color: '#F59E0B' },
    { name: t('admin.patientRole'), value: kpis?.role_breakdown?.PATIENT ?? 0, color: '#22C55E' },
  ];

  const totalUsers = kpis?.total_users ?? 0;
  const pendingCount = kpis?.pending_applications ?? 0;
  const totalRevenue = kpis?.total_revenue ?? 0;

  if (isLoading && !kpis) return <DashboardSkeleton />;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-[36px] font-serif italic text-text-primary leading-tight flex flex-wrap gap-x-[0.3em]">
              {t('admin.sysOverview').split(' ').map((word: string, i: number) => (
                <motion.span key={i} initial={{ opacity: 0, y: 10, clipPath: 'inset(100% 0 0 0)' }} animate={{ opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' }} transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
                  {word}
                </motion.span>
              ))}
            </h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-text-muted font-sans text-[16px] mt-1">{t('admin.realTimeIntel')}</motion.p>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, duration: 0.4 }}>
            <button
              onClick={async () => {
                try {
                  const blob = await exportHistoricalDataCsv();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `medera_historical_data_${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (error: any) {
                  console.error("Failed to export historical data", error);
                  alert(`Failed to export: ${error?.message || "Unknown error"}`);
                }
              }}
              className="flex items-center gap-2 bg-brand-indigo/10 text-brand-lavender border border-brand-indigo/30 hover:bg-brand-indigo hover:text-white px-5 py-2.5 rounded-full transition-all duration-300 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="text-[13px] font-medium tracking-wide">{t('admin.exportHistoricalData') || "Export historical data (CSV)"}</span>
            </button>
          </motion.div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.0, duration: 0.5 }} className="glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(75,74,207,0.15)] transition-all duration-300 flex flex-col justify-between">
            <div className="flex items-center gap-4 mb-3">
               <div className="w-12 h-12 rounded-full bg-brand-indigo/20 flex items-center justify-center border border-brand-indigo/40 shrink-0">
                  <Users className="w-5 h-5 text-brand-lavender shrink-0" />
               </div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                   <div className="text-[28px] font-bold text-text-primary leading-none truncate pb-1"><CountUp end={totalUsers} /></div>
                   <div className="font-mono text-[10px] text-text-muted tracking-wider uppercase truncate">{t('admin.regUsers')}</div>
                </div>
            </div>
            <div className="flex items-center gap-1.5 text-[13px] text-state-success font-medium mt-4">
              <ArrowUp className="w-3.5 h-3.5" /> {t('admin.thisWeek').replace('{count}', (kpis?.new_users_week ?? 0).toString())}
            </div>
         </motion.div>

         <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.5 }} className="glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(75,74,207,0.15)] transition-all duration-300 flex flex-col justify-between">
            <div className="flex items-center gap-4 mb-3">
               <div className="w-12 h-12 rounded-full bg-state-warning-bg flex items-center justify-center border border-state-warning/30 shrink-0">
                  <Clock className="w-5 h-5 text-state-warning shrink-0" />
               </div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                   <div className="text-[28px] font-bold text-state-warning leading-none truncate pb-1"><CountUp end={pendingCount} /></div>
                   <div className="font-mono text-[10px] text-text-muted tracking-wider uppercase truncate">{t('admin.awaitingReview')}</div>
                </div>
            </div>
            <div className="flex items-center gap-1.5 text-[13px] text-state-warning font-medium mt-4">
              {kpis?.new_apps_week ? (
                <span className="flex items-center gap-1 animate-pulse">
                  <ArrowUp className="w-3.5 h-3.5" /> {t('admin.thisWeek').replace('{count}', kpis.new_apps_week.toString())}
                </span>
              ) : (
                t('admin.requiresAttention')
              )}
            </div>
         </motion.div>

         <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.5 }} className="glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(75,74,207,0.15)] transition-all duration-300 flex flex-col justify-between">
            <div className="flex items-center gap-4 mb-3">
               <div className="w-12 h-12 rounded-full bg-state-success-bg flex items-center justify-center border border-state-success/30 shrink-0">
                  <ArrowUp className="w-5 h-5 text-state-success shrink-0" />
               </div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                   <div className="text-[28px] font-bold text-text-primary leading-none truncate pb-1" title={totalRevenue.toLocaleString() + " DH"}>
                      {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} DH
                   </div>
                   <div className="font-mono text-[10px] text-text-muted tracking-wider uppercase truncate">{t('admin.totalRevenue') || "Total Revenue"}</div>
                </div>
            </div>
            <div className="w-full h-1 bg-ui-border rounded-full mt-4 overflow-hidden">
               <motion.div initial={{ width: 0 }} animate={{ width: '75%' }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-state-success rounded-full" />
            </div>
         </motion.div>

          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.5 }} className="glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(75,74,207,0.15)] transition-all duration-300 flex flex-col justify-between overflow-hidden">
             <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-full bg-[#4B4ACF15] flex items-center justify-center border border-brand-indigo/30 shrink-0">
                   <Server className="w-5 h-5 text-brand-lavender shrink-0" />
                </div>
                 <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="text-[14px] font-bold text-text-primary uppercase tracking-wider truncate pb-1" title={t('admin.sysHealth')}>{t('admin.sysHealth')}</div>
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-state-success animate-pulse shrink-0"></span>
                       <span className="text-[12px] text-state-success font-mono uppercase tracking-tighter truncate">{t('admin.clusterOperational') || "Cluster: Operational"}</span>
                    </div>
                 </div>
             </div>
             <div className="flex gap-3 text-[11px] font-mono text-text-muted mt-4 flex-wrap">
                <span className="flex items-center gap-1.5 truncate min-w-0">
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${health?.services?.api ? 'bg-state-success' : 'bg-state-error'}`}></span>
                  <span className="truncate">{t('admin.services.djangoApi') || "Django API"}</span>
                </span>
                <span className="flex items-center gap-1.5 truncate min-w-0">
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${health?.services?.redis ? 'bg-state-success' : 'bg-state-error'}`}></span>
                  <span className="truncate">{t('admin.services.redis') || "Redis"}</span>
                </span>
                <span className="flex items-center gap-1.5 truncate min-w-0">
                   <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${health?.services?.celery ? 'bg-state-success' : 'bg-state-error'}`}></span>
                   <span className="truncate">{t('admin.services.celery') || "Celery"}</span>
                </span>
             </div>
          </motion.div>
      </div>

      {/* Row 2: Charts & Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
         {/* RBAC Distribution Donut Chart */}
         <div className="lg:col-span-3 glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md flex flex-col" style={{ height: '420px' }}>
            <div className="flex items-center justify-between mb-2">
               <div>
                  <h3 className="font-sans text-[16px] font-medium text-text-primary">{t('admin.rbacDistribution')}</h3>
                  <p className="text-[12px] text-text-muted mt-1">{t('admin.totActiveAcc')}</p>
               </div>
               <div className="flex bg-bg-elevated rounded-full p-1 border border-ui-border">
                 <span className="px-4 py-1.5 text-[12px] font-bold rounded-full bg-brand-indigo text-text-primary">
                    {t('admin.realTime')}
                 </span>
               </div>
            </div>
            <div className="flex-1 w-full relative min-h-0">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rbacData}
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="80%"
                      paddingAngle={5}
                      dataKey="value"
                      animationDuration={1500}
                    >
                      {rbacData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(13,13,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} 
                      itemStyle={{ color: '#fff', fontSize: '12px' }} 
                    />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-ui-border shrink-0">
               {rbacData.map(item => (
                  <div key={item.name} className="flex flex-col gap-1">
                     <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono uppercase tracking-tight truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                        {item.name}
                     </div>
                     <div className="text-[18px] font-bold text-text-primary pl-4">
                        {item.value.toLocaleString()}
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Audit Feed */}
         <div className="lg:col-span-2 glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md flex flex-col" style={{ height: '420px' }}>
            <div className="flex items-center justify-between mb-4 shrink-0">
               <h3 className="font-sans text-[16px] font-medium text-text-primary flex items-center gap-3">
                  {t('admin.dashboard.auditTrailFeed') || "Recent System Activity"}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-state-success/20 border border-state-success/30">
                     <span className="w-1.5 h-1.5 rounded-full bg-state-success animate-pulse"></span>
                     <span className="text-state-success text-[10px] font-bold tracking-wider">{t('admin.live') || "LIVE"}</span>
                  </div>
               </h3>
               {auditLoading && <Loader2 className="w-4 h-4 animate-spin text-text-muted" />}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
               <AnimatePresence mode="popLayout">
                 {auditFeed.length > 0 ? auditFeed.slice(0, 10).map((item, i) => (
                    <motion.div 
                       key={item.id} 
                       initial={{ opacity: 0, x: 20 }} 
                       animate={{ opacity: 1, x: 0 }} 
                       transition={{ delay: i * 0.05 }}
                       className="py-3.5 border-b border-ui-border last:border-0 flex items-start gap-4"
                    >
                       <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                             <div className="flex items-center gap-2 min-w-0">
                                <span className={`shrink-0 px-2 py-0.5 rounded-[4px] text-[10px] font-bold font-mono tracking-wider ${
                                  getAuditColor(item.action) === 'success' ? 'text-state-success bg-state-success-bg border border-state-success/30' :
                                  getAuditColor(item.action) === 'warning' ? 'text-state-warning bg-state-warning-bg border border-state-warning/30' :
                                  getAuditColor(item.action) === 'error' ? 'text-state-error bg-state-error-bg border border-state-error/30' :
                                  'text-brand-lavender bg-brand-indigo/20 border border-brand-indigo/30'
                                }`}>
                                   {item.action}
                                </span>
                                <span className="font-mono text-[11px] text-text-primary/90 truncate">{item.model_name}</span>
                                <span className="text-[12px] font-mono text-text-muted">
                                   {formatDate(item.timestamp)}
                                </span>
                             </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] text-text-muted truncate">
                              {item.user_email || t('admin.systemOperation')}
                            </span>
                            {item.object_id && (
                              <span className="font-mono text-[10px] text-brand-lavender/60">#{item.object_id.substring(0, 8)}</span>
                            )}
                          </div>
                       </div>
                    </motion.div>
                 )) : (
                   <div className="flex-1 flex items-center justify-center text-text-muted text-[13px]">
                      {t('admin.noRecentActivity')}
                   </div>
                 )}
               </AnimatePresence>
            </div>
            
            <div className="mt-4 pt-4 border-t border-ui-border shrink-0">
               <a href="/admin/audit" className="group inline-flex items-center text-brand-lavender text-[13px] font-medium relative">
                 {t('admin.viewFullAudit')} <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                 <span className="absolute bottom-[-2px] left-0 w-0 h-px bg-[#A5A4F3] transition-all duration-300 group-hover:w-full"></span>
               </a>
            </div>
         </div>

      </div>

      {/* Row 3: Growth & Activity Trends */}
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md mb-8">
         <div className="flex items-center justify-between mb-8">
            <div>
               <h3 className="font-sans text-[18px] font-medium text-text-primary">{t('admin.weeklyActivity') || "Weekly Activity Trajectory"}</h3>
               <p className="text-[13px] text-text-muted mt-1">{t('admin.rollingPerformance') || "7-day rolling performance of appointments & consultations."}</p>
            </div>
            <div className="flex bg-bg-elevated rounded-full p-1 border border-ui-border">
              <span className="px-4 py-1.5 text-[12px] font-bold rounded-full bg-brand-indigo/10 text-brand-lavender border border-brand-indigo/20">
                 {t('admin.velocityMetrics') || "Velocity Metrics"}
              </span>
            </div>
         </div>
         <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={kpis?.daily_stats || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                     <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4B4ACF" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4B4ACF" stopOpacity={0}/>
                     </linearGradient>
                     <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                     </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={12} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} axisLine={false} tickLine={false} />
                  <Tooltip 
                     contentStyle={{ backgroundColor: 'rgba(13,13,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} 
                     itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} 
                     labelStyle={{ color: '#888', marginBottom: '8px' }}
                  />
                  <Area type="monotone" name={t('admin.nav.appointments') || "Appointments"} dataKey="appointments" stroke="#4B4ACF" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
                  <Area type="monotone" name={t('admin.nav.consultations') || "Consultations"} dataKey="consultations" stroke="#22C55E" strokeWidth={3} fillOpacity={1} fill="url(#colorCons)" />
               </AreaChart>
            </ResponsiveContainer>
         </div>
      </motion.div>

      {/* Row 4: Pending Queue Summary (Full Width) */}
      <div className="glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md mb-12">
          <div className="flex items-center justify-between mb-8">
             <div>
                <h3 className="font-sans text-[18px] font-medium text-text-primary">{t('admin.pendingQueueSummary')}</h3>
                <p className="text-[13px] text-text-muted mt-1">{t('admin.reviewProtocol')}</p>
             </div>
             <div className="flex items-center gap-4">
                <span className="text-state-warning bg-state-warning/10 border border-state-warning/20 px-3 py-1 rounded-full text-[12px] font-mono font-bold tracking-tight">
                   {pendingCount} {t('admin.awaitingReview')}
                </span>
             </div>
          </div>
          
          <div className="flex flex-col gap-4">
             {appsLoading ? (
               Array(4).fill(0).map((_, i) => (
                 <div key={i} className="h-24 bg-ui-border/20 rounded-xl animate-pulse" />
               ))
             ) : apps.length > 0 ? apps.slice(0, 10).map(app => (
                <div key={app.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-bg-surface/40 border border-ui-border rounded-xl group hover:border-brand-indigo/50 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(75,74,207,0.1)] gap-4">
                   <div className="flex items-center gap-4 min-w-0">
                       <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-indigo/30 to-transparent flex items-center justify-center p-[1px] shrink-0">
                         <div className="w-full h-full bg-bg-surface rounded-full flex items-center justify-center text-[16px] font-bold text-brand-lavender">
                            {app.first_name?.[0] || '?'}{app.last_name?.[0] || ''}
                         </div>
                      </div>
                      <div className="min-w-0">
                         <div className="flex flex-wrap items-center gap-2 pb-1">
                            <div className="text-[16px] font-bold text-text-primary truncate">{app.first_name} {app.last_name}</div>
                            <span className="px-1.5 py-0.5 rounded bg-brand-indigo/10 text-brand-lavender text-[10px] uppercase font-bold tracking-widest border border-brand-indigo/20">{app.specialty}</span>
                         </div>
                         <div className="text-[13px] text-text-muted flex flex-wrap items-center gap-2">
                            <span className="truncate">{app.email}</span>
                            <span className="hidden sm:inline">·</span>
                            <span>{app.submitted_at ? formatDistanceToNow(new Date(app.submitted_at), { addSuffix: true }) : 'N/A'}</span>
                         </div>
                         <div className="mt-2 flex items-center gap-4">
                            <a href={app.cv_file} target="_blank" rel="noreferrer" className="text-[12px] text-brand-lavender hover:underline flex items-center gap-1.5">
                               <FileText className="w-3.5 h-3.5" /> CV / Resume
                            </a>
                            <a href={app.diploma_file} target="_blank" rel="noreferrer" className="text-[12px] text-brand-lavender hover:underline flex items-center gap-1.5">
                               <FileText className="w-3.5 h-3.5" /> Diploma
                            </a>
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                      <button 
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate({ type: 'approve', id: app.id })} 
                        className="px-6 py-2.5 text-[12px] font-bold bg-brand-indigo text-text-primary rounded-lg hover:shadow-[0_0_20px_rgba(75,74,207,0.4)] transition-all disabled:opacity-50 flex items-center justify-center min-w-[110px]"
                      >
                        {mutation.isPending && mutation.variables?.type === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : t('admin.table.approve') || "APPROVE"}
                      </button>
                      <button 
                        disabled={mutation.isPending}
                        onClick={() => mutation.mutate({ type: 'reject', id: app.id })} 
                        className="px-6 py-2.5 text-[12px] font-bold border border-ui-border text-text-muted hover:text-state-error hover:border-state-error/50 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center min-w-[110px]"
                      >
                        {mutation.isPending && mutation.variables?.type === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : t('admin.table.reject') || "REJECT"}
                      </button>
                   </div>
                </div>
             )) : (
               <div className="col-span-2 py-16 text-center text-text-muted border border-dashed border-ui-border rounded-xl flex flex-col items-center gap-3">
                  <CheckCircle className="w-10 h-10 text-state-success/30" />
                  <div>
                    <div className="text-[16px] font-medium text-text-primary">{t('admin.applications.noPending')}</div>
                    <div className="text-[13px] mt-1">Queue is fully clear. High operational efficiency detected.</div>
                  </div>
               </div>
             )}
          </div>
          
          <div className="mt-10 flex justify-center">
             <a href="/admin/applications" className="group flex items-center gap-2 px-8 py-3 rounded-full border border-ui-border hover:border-brand-indigo transition-all duration-300 bg-bg-elevated/30 backdrop-blur-sm">
               <span className="text-[14px] font-medium text-text-primary">{t('admin.viewAllApps') || "Operational Application Center"}</span>
               <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
             </a>
          </div>
      </div>
    </div>
  );
}
