import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import {
  Calendar, Users, CreditCard, Hourglass, Stethoscope,
  Activity, ChevronRight, Clock, Loader2, RefreshCw,
  UserPlus, MessageSquare, TrendingUp
} from 'lucide-react';
import { getPatients } from '../../services/patientService';
import { getThreads } from '../../services/messagingService';
import { getMe, getEmployer } from '../../services/authService';
import { getDoctorKpis, getDashboardAgenda } from '../../services/doctorService';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const KPI_REFRESH = 30_000;

export default function SecretaryDashboard() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    window.scrollTo(0, 0);
    navigate(path);
  };

  // Fetch current secretary
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 5 * 60_000 });

  // Fetch linked doctor
  const { data: employer, isLoading: employerLoading } = useQuery({
    queryKey: ['employer'],
    queryFn: getEmployer,
    retry: false,
    staleTime: 5 * 60_000,
  });

  const getGreeting = () => {
    const name = user?.first_name || '';
    const hour = new Date().getHours();
    if (hour < 12) return t('doctorPortal.greeting') || `Good morning, ${name}`;
    if (hour < 18) return t('patient.greeting.afternoon') || `Good afternoon, ${name}`;
    return t('patient.greeting.evening') || `Good evening, ${name}`;
  };

  const { data: kpisResp, isLoading: kpisLoading, refetch: refetchKpis } = useQuery({
    queryKey: ['doctor-kpis'],
    queryFn: getDoctorKpis,
    refetchInterval: KPI_REFRESH,
  });

  const { data: agendaResp, isLoading: aptsLoading, refetch: refetchAgenda } = useQuery({
    queryKey: ['doctor-agenda-today'],
    queryFn: getDashboardAgenda,
    refetchInterval: KPI_REFRESH,
  });

  const { data: patientsResp, refetch: refetchPatients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => getPatients(),
    refetchInterval: KPI_REFRESH,
  });

  const { data: threadsResp, refetch: refetchThreads } = useQuery({
    queryKey: ['threads'],
    queryFn: () => getThreads(),
    refetchInterval: KPI_REFRESH,
  });

  const handleRefresh = () => {
    refetchKpis();
    refetchAgenda();
    refetchPatients();
    refetchThreads();
  };

  const todaysApts = Array.isArray(agendaResp) ? agendaResp : (agendaResp?.results || []);
  const patients = patientsResp?.results || [];
  const threads = (threadsResp?.results || []).slice(0, 4);

  const kpis = kpisResp || {};

  const statCards = [
    {
      title: "Today's Appointments",
      value: kpis?.appointments_today || 0,
      subtitle: `Next: ${kpis?.next_appointment_time || '--:--'}`,
      subtitleColor: "text-brand-indigo",
      icon: <Calendar size={22} />,
      iconColor: "text-brand-indigo",
      iconBg: "bg-brand-indigo/10",
      iconBorder: "border-brand-indigo/20"
    },
    {
      title: "Pending Consultations",
      value: kpis?.pending_consultations || 0,
      subtitle: (kpis?.pending_consultations || 0) > 0 ? "needs review" : "all caught up",
      subtitleColor: (kpis?.pending_consultations || 0) > 0 ? "text-state-warning" : "text-text-muted",
      icon: <Hourglass size={22} />,
      iconColor: "text-state-warning",
      iconBg: "bg-state-warning/10",
      iconBorder: "border-state-warning/20"
    },
    {
      title: "Active Patients",
      value: kpis?.active_patients || 0,
      subtitle: `${kpis?.new_patients_this_month || 0} this month`,
      subtitleColor: "text-state-success",
      icon: <Users size={22} />,
      iconColor: "text-state-success",
      iconBg: "bg-state-success/10",
      iconBorder: "border-state-success/20",
      live: true
    },
    {
      title: "Pending Invoices",
      value: kpis?.unpaid_invoices || 0,
      subtitle: "awaiting payment",
      subtitleColor: "text-[#EF4444]",
      icon: <CreditCard size={22} />,
      iconColor: "text-[#EF4444]",
      iconBg: "bg-[#EF4444]/10",
      iconBorder: "border-[#EF4444]/20"
    }
  ];

  const isLoading = aptsLoading;

  return (
    <div className="max-w-[1400px] w-full mx-auto space-y-8 animate-in fade-in duration-600 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[36px] font-serif italic text-text-primary leading-tight">
             {getGreeting()}
          </h1>
          {employer ? (
            <p className="text-[16px] text-text-muted mt-2 font-sans flex items-center gap-2">
              <Stethoscope size={16} className="text-brand-indigo" />
              Managing clinic for
              <span className="font-medium text-text-primary">Dr. {employer.first_name} {employer.last_name}</span>
              {employer.specialization && <span className="text-text-muted">· {employer.specialization}</span>}
            </p>
          ) : employerLoading ? (
            <div className="flex items-center gap-2 text-text-muted text-[15px] mt-2">
              <Loader2 size={15} className="animate-spin" /> Loading doctor info…
            </div>
          ) : null}
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 text-[14px] text-text-muted hover:text-text-primary transition-colors self-start md:self-auto mb-1"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Row 1 - KPI Cards (Doctor Dashboard Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.08, duration: 0.5 }}
            key={i}
            className="glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(75,74,207,0.15)] transition-all duration-300 flex flex-col justify-between bg-bg-surface/50"
          >
            <div className="flex items-center gap-4 mb-3">
               <div className={`w-12 h-12 rounded-full ${stat.iconBg} flex items-center justify-center border ${stat.iconBorder}`}>
                  <div className={stat.iconColor}>{React.cloneElement(stat.icon as React.ReactElement, { className: 'w-5 h-5' })}</div>
               </div>
               <div className="flex-1 min-w-0">
                  <div className="text-[32px] font-bold text-text-primary leading-none truncate">
                    {isLoading ? <div className="w-8 h-8 bg-ui-border/30 animate-pulse rounded" /> : stat.value}
                  </div>
                  <div className="font-mono text-[10px] text-text-muted tracking-wider mt-1.5 uppercase truncate">{stat.title}</div>
               </div>
            </div>
            <div className={`flex items-center gap-1.5 text-[13px] font-medium mt-4 ${stat.subtitleColor}`}>
               {stat.live && <div className="w-2 h-2 rounded-full bg-state-success animate-pulse" />}
               {stat.subtitle}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Row 2 — Today's Schedule + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-7 glass-island border border-ui-border rounded-3xl overflow-hidden flex flex-col min-h-[420px] bg-bg-surface">
           <div className="p-6 border-b border-ui-border flex justify-between items-center bg-bg-surface/50">
              <h3 className="text-[12px] font-mono tracking-[0.15em] text-text-muted uppercase font-bold flex items-center gap-2">
                <Calendar size={14} /> Today's Schedule
              </h3>
              <div className="text-[13px] text-text-primary font-medium px-3 py-1 bg-bg-input rounded-full">
                {format(new Date(), 'MMMM d, yyyy')}
              </div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
             {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-text-muted">
                  <Loader2 size={30} className="animate-spin text-brand-indigo mb-4" />
                </div>
             ) : todaysApts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-muted py-10">
                   <Calendar size={40} className="mb-4 opacity-30 text-brand-indigo" />
                   <p className="font-medium text-[15px]">No appointments scheduled today</p>
                   <button onClick={() => handleNavigate('/secretary/appointments')} className="mt-4 px-4 py-2 bg-brand-indigo/10 text-brand-indigo rounded-lg text-[13px] font-bold hover:bg-brand-indigo/20 transition-colors">
                     + Schedule Patient
                   </button>
                </div>
             ) : (
                <div className="space-y-3">
                   {todaysApts.map((apt: any) => (
                      <div 
                        key={apt.id} 
                        onClick={() => handleNavigate('/secretary/appointments')}
                        className={`group cursor-pointer flex items-center justify-between gap-4 p-4 rounded-2xl hover:bg-bg-input/80 transition-all hover:translate-x-[3px] bg-bg-surface border border-ui-border relative overflow-hidden ${apt.status === 'CANCELLED' ? 'opacity-70 grayscale-[0.5]' : ''}`}
                      >
                         <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                            apt.status === 'CONFIRMED' || apt.status === 'PLANNED' ? 'bg-[#22C55E]' : 
                            apt.status === 'PENDING' ? 'bg-state-warning' : 
                            apt.status === 'IN_PROGRESS' ? 'bg-brand-indigo' : 
                            apt.status === 'CANCELLED' ? 'bg-state-error' : 
                            'bg-text-muted'
                         }`} />
                         <div className="flex items-center gap-4 pl-3">
                            <div className="text-[14px] font-mono text-brand-indigo w-12 shrink-0">
                               {apt.start_time || (apt.start_datetime ? format(new Date(apt.start_datetime), 'HH:mm') : '--:--')}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                 <span className="text-[15px] font-medium text-text-primary font-sans">
                                   {apt.patient_name || 'Patient Inconnu'}
                                 </span>
                                 <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono font-bold tracking-wider ${
                                    apt.status === 'CONFIRMED' || apt.status === 'PLANNED' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 
                                    apt.status === 'PENDING' ? 'bg-state-warning/10 text-state-warning' : 
                                    apt.status === 'IN_PROGRESS' ? 'bg-brand-indigo/10 text-brand-indigo' : 
                                    apt.status === 'CANCELLED' ? 'bg-state-error/10 text-state-error' : 
                                    'bg-bg-input text-text-muted'
                                 }`}>
                                   {apt.status === 'DONE' ? 'Terminé' : 
                                    apt.status === 'IN_PROGRESS' ? 'En cours' :
                                    apt.status === 'CANCELLED' ? 'Annulé' :
                                    apt.status === 'CONFIRMED' ? 'Confirmé' :
                                    apt.status === 'PLANNED' ? 'Planifié' : apt.status}
                                 </span>
                              </div>
                              <div className="text-[12px] font-mono text-text-muted mt-1 flex items-center gap-2">
                                 <span>{apt.appointment_type || 'Consultation'}</span>
                              </div>
                            </div>
                         </div>
                         <div className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                           <ChevronRight size={18} />
                         </div>
                      </div>
                   ))}
                </div>
             )}
           </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-5 glass-island border border-ui-border rounded-3xl p-6 min-h-[420px] flex flex-col bg-bg-surface">
           <h3 className="text-[12px] font-mono tracking-[0.15em] text-text-muted uppercase font-bold flex items-center gap-2 mb-6">
             <Activity size={14} /> Quick Actions
           </h3>

           <div className="space-y-4">
             <button onClick={() => handleNavigate('/secretary/appointments?new=true')} className="w-full h-14 bg-brand-indigo hover:bg-[#7C75FF] transition-colors rounded-xl text-white font-medium text-[15px] shadow-[0_4px_12px_rgba(99,91,255,0.25)] flex items-center justify-center gap-2">
               <Calendar size={18} /> New Appointment
             </button>
             <button onClick={() => handleNavigate('/secretary/patients?new=true')} className="w-full h-14 bg-transparent hover:bg-brand-indigo/5 border border-brand-indigo/30 hover:border-brand-indigo/50 transition-colors rounded-xl text-brand-indigo font-medium text-[15px] flex items-center justify-center gap-2">
               <UserPlus size={18} /> Register Patient
             </button>
             <button onClick={() => handleNavigate('/secretary/waiting-room')} className="w-full h-14 bg-bg-input hover:bg-bg-surface border border-ui-border transition-colors rounded-xl text-text-primary font-medium text-[15px] flex items-center justify-center gap-2">
               <Activity size={18} /> Waiting Room
             </button>
             <button onClick={() => handleNavigate('/secretary/billing')} className="w-full h-14 bg-bg-input hover:bg-bg-surface border border-ui-border transition-colors rounded-xl text-text-primary font-medium text-[15px] flex items-center justify-center gap-2">
               <CreditCard size={18} /> Create Invoice
             </button>
           </div>

           {/* Next appointment */}
           <div className="mt-auto pt-6 border-t border-ui-border relative pl-4">
             <div className="absolute left-0 top-6 bottom-0 w-1 bg-brand-indigo rounded-full" />
             <div className="text-[11px] font-mono text-text-muted uppercase tracking-widest mb-2 font-bold">Next Appointment</div>
             {kpis?.next_appointment_time ? (
               <>
                 <div className="font-sans text-[15px] text-text-primary font-medium">Scheduled Appointment</div>
                 <div className="flex items-center gap-1.5 text-[13px] text-brand-lavender mt-1 font-mono">
                   <Clock size={13} />
                   {kpis.next_appointment_time}
                 </div>
               </>
             ) : (
               <div className="text-[14px] text-text-muted">No upcoming appointments</div>
             )}
           </div>
        </div>
      </div>

      {/* Row 3 — Recent Patients + Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        {/* Recent Patients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="glass-island border border-ui-border rounded-3xl p-6 lg:p-8 backdrop-blur-md bg-bg-surface"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[18px] font-serif italic text-text-primary">Recent Patients</h2>
            <button onClick={() => handleNavigate('/secretary/patients')} className="text-[13px] font-medium text-brand-indigo hover:text-brand-lavender flex items-center gap-1">
              All <ChevronRight size={14} />
            </button>
          </div>

          {patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-text-muted py-8">
              <Users size={36} className="mb-3 opacity-20" />
              <p className="text-[13px]">No patients registered yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patients.slice(0, 5).map((patient: any) => (
                <div
                  key={patient.id}
                  onClick={() => handleNavigate(`/secretary/patients`)}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-bg-input/50 border border-transparent hover:border-ui-border/50 transition-all cursor-pointer hover:translate-x-[3px]"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-violet p-[1.5px] shrink-0">
                    <div className="w-full h-full bg-bg-surface rounded-full flex items-center justify-center text-[12px] font-bold text-text-primary">
                      {(patient.first_name?.[0] || '') + (patient.last_name?.[0] || '')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-sans font-medium text-text-primary truncate">
                      {patient.first_name} {patient.last_name}
                    </div>
                    <div className="text-[12px] font-mono text-text-muted mt-0.5">{patient.internal_id || patient.id?.substring(0, 8)}</div>
                  </div>
                  <div className="text-[12px] font-mono text-text-muted shrink-0 bg-bg-input px-3 py-1 rounded-full">
                    {patient.created_at ? format(new Date(patient.created_at), 'MMM d') : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Messages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="glass-island border border-ui-border rounded-3xl p-6 lg:p-8 backdrop-blur-md flex flex-col bg-bg-surface"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[18px] font-serif italic text-text-primary">Messages</h2>
            <button onClick={() => handleNavigate('/secretary/messages')} className="text-[13px] font-medium text-brand-indigo hover:text-brand-lavender flex items-center gap-1">
              Inbox <ChevronRight size={14} />
            </button>
          </div>

          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-text-muted py-8 flex-1">
              <MessageSquare size={36} className="mb-3 opacity-20" />
              <p className="text-[13px]">No messages yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {threads.map((msg: any) => (
                <div
                  key={msg.id}
                  onClick={() => handleNavigate('/secretary/messages')}
                  className="p-4 bg-bg-input/50 rounded-xl border border-ui-border/50 hover:border-brand-indigo/30 transition-colors flex gap-4 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-bg-surface border border-ui-border flex items-center justify-center shrink-0">
                    <Stethoscope size={16} className="text-brand-indigo" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[14px] font-sans font-medium text-text-primary truncate">{msg.subject || 'No subject'}</span>
                      <span className="text-[11px] text-text-muted whitespace-nowrap ml-2 font-mono bg-bg-surface px-2 py-0.5 rounded-full border border-ui-border">
                        {msg.updated_at ? format(new Date(msg.updated_at), 'HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-[13px] text-text-muted line-clamp-1 mt-1">{msg.last_message?.content || 'No messages yet'}</p>
                  </div>
                  {msg.unread_count > 0 && (
                    <div className="w-5 h-5 rounded-full bg-brand-indigo text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0 self-center shadow-[0_0_10px_rgba(99,91,255,0.5)]">
                      {msg.unread_count}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
