import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, Users, Stethoscope, CreditCard, ChevronRight,
  TrendingUp, Activity, FileText, Video, Building2, Loader2, CheckCircle2, Download,
  Eye, Edit2, Play
} from 'lucide-react';
import { 
  getDoctorKpis, 
  getDashboardAgenda, 
  getDashboardWeeklyTrend
} from '@/services/doctorService';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function DoctorDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');

  let { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['doctor-kpis'],
    queryFn: getDoctorKpis,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: appointmentsResponse, isLoading: aptsLoading } = useQuery({
    queryKey: ['doctor-agenda-today'],
    queryFn: getDashboardAgenda,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: trendResponse, isLoading: trendLoading } = useQuery({
    queryKey: ['doctor-weekly-trend', timeRange],
    queryFn: () => getDashboardWeeklyTrend(timeRange),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const appointments = Array.isArray(appointmentsResponse) ? appointmentsResponse : (appointmentsResponse?.results || []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('doctorPortal.greeting') || "Good morning, Dr.";
    if (hour < 18) return t('patient.greeting.afternoon') || "Good afternoon, Dr.";
    return t('patient.greeting.evening') || "Good evening, Dr.";
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header & Branding (Prescription Style)
    doc.setFont('helvetica', 'normal');
    
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('MedEra', 14, 20);
    
    doc.setFontSize(14);
    doc.text('Cabinet Performance Report', 14, 30);
    
    // Doctor Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Dr. ${user?.first_name} ${user?.last_name}`, 14, 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(user?.speciality || 'General Practice', 14, 51);
    doc.text(user?.email || '', 14, 57);
    
    // Date & Meta
    doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, 130, 45);
    doc.text(`Period: ${
      timeRange === '7d' ? 'Last 7 Days' : 
      timeRange === '30d' ? 'Last 30 Days' : 
      timeRange === 'last_month' ? 'Last Month' : 
      timeRange === 'last_year' ? 'Last Year' : 'All Time'
    }`, 130, 51);

    // Divider Line
    doc.setDrawColor(79, 70, 229); // #4F46E5
    doc.setLineWidth(0.5);
    doc.line(14, 65, 196, 65);

    // KPIs Table
    autoTable(doc, {
      startY: 75,
      head: [['Metric', 'Value']],
      body: [
        ['Total Active Patients', String(kpis?.active_patients || 0)],
        ['New Patients This Month', String(kpis?.new_patients_this_month || 0)],
        ['Pending Consultations', String(kpis?.pending_consultations || 0)],
        ['Consultations This Month', String(kpis?.monthly_consultations || 0)],
        ['Prescriptions Issued', String(kpis?.total_prescriptions || 0)],
        ['Average Visit Time', `${kpis?.avg_visit_duration || 0} mins`],
        ['Patient Satisfaction', `${kpis?.satisfaction_rate || 100}%`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 11, cellPadding: 5 }
    });

    // Trend Table
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    doc.setFontSize(14);
    doc.text('Consultation Volume', 14, finalY + 15);
    
    const trendData = trendResponse || [];
    const trendBody = trendData.map((d: any) => [d.date, String(d.count)]);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Period', 'Consultations']],
      body: trendBody,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] }, // Lavender
    });

    // Save PDF
    doc.save(`Medera_Report_Dr_${user?.last_name || 'Doctor'}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  if (kpisLoading || aptsLoading || trendLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-indigo" />
      </div>
    );
  }

  const weeklyTrendData = trendResponse || [];

  const statCards = [
    {
      title: t('doctorPortal.dashboard.todayApt') || "Rendez-vous d'aujourd'hui",
      value: kpis?.appointments_today || 0,
      subtitle: `${t('doctorPortal.dashboard.next') || "Prochain:"} ${kpis?.next_appointment_time || '--:--'}`,
      subtitleColor: "text-state-success",
      icon: <Calendar size={22} />,
      color: "brand-indigo"
    },
    {
      title: t('doctorPortal.dashboard.activePat') || "Patients Actifs",
      value: kpis?.active_patients || 0,
      subtitle: `${kpis?.new_patients_this_month || 0} ${t('doctorPortal.dashboard.thisMonth') || "ce mois-ci"}`,
      subtitleColor: "text-text-muted",
      icon: <Users size={22} />,
      color: "brand-lavender"
    },
    {
      title: t('doctorPortal.dashboard.pendingCons') || "Consultations en attente",
      value: kpis?.pending_consultations || 0,
      subtitle: (kpis?.pending_consultations || 0) > 0 ? (t('doctorPortal.dashboard.reqAttention') || "Nécessite une action") : (t('doctorPortal.dashboard.allCaughtUp') || "Tout est à jour"),
      subtitleColor: (kpis?.pending_consultations || 0) > 0 ? "text-state-warning" : "text-text-muted",
      icon: <Stethoscope size={22} />,
      color: "state-warning"
    },
    {
      title: t('doctorPortal.dashboard.unpaidInv') || "Factures Impayées",
      value: kpis?.unpaid_invoices || 0,
      subtitle: (kpis?.unpaid_invoices || 0) > 0 ? (t('doctorPortal.dashboard.actionNeeded') || "Action requise") : (t('doctorPortal.dashboard.allClear') || "Tout est réglé"),
      subtitleColor: (kpis?.unpaid_invoices || 0) > 0 ? "text-[#EF4444]" : "text-state-success",
      icon: <CreditCard size={22} />,
      color: (kpis?.unpaid_invoices || 0) > 0 ? "[#EF4444]" : "state-success"
    }
  ];

  return (
    <div className="max-w-[1400px] w-full mx-auto space-y-8 animate-in fade-in duration-600 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[36px] font-sans text-text-primary leading-tight">
             {getGreeting()} <span className="text-brand-indigo">{user?.last_name}.</span>
          </h1>
          <p className="text-[16px] text-text-muted mt-2 font-sans max-w-2xl">
            {(t('doctorPortal.dashboard.insight') || "Voici un aperçu de votre cabinet. Vous avez {value} rendez-vous prévus pour aujourd'hui.")
              .replace('{value}', String(kpis?.appointments_today || 0))}
          </p>
        </div>
        <button 
          onClick={generatePDF}
          className="flex items-center gap-2 bg-brand-indigo text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-indigo/90 hover:shadow-lg transition-all"
        >
          <Download size={18} />
          Export PDF Report
        </button>
      </div>

      {/* Row 1 - KPI Cards */}
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
               <div className={`w-12 h-12 rounded-full bg-brand-indigo/10 flex items-center justify-center border border-brand-indigo/20`}>
                  <div className="text-brand-indigo">{React.cloneElement(stat.icon as React.ReactElement, { className: 'w-5 h-5' })}</div>
               </div>
               <div className="flex-1 min-w-0">
                  <div className="text-[32px] font-bold text-text-primary leading-none truncate">{stat.value}</div>
                  <div className="font-mono text-[10px] text-text-muted tracking-wider mt-1.5 uppercase truncate">{stat.title}</div>
               </div>
            </div>
            <div className={`flex items-center gap-1.5 text-[13px] font-medium mt-4 ${stat.subtitleColor}`}>
               {stat.subtitle.includes('+') && <TrendingUp className="w-3.5 h-3.5" />} {stat.subtitle}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Row 2 - Today's Schedule & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         {/* Today's Schedule */}
         <div className="lg:col-span-7 glass-island border border-ui-border rounded-3xl overflow-hidden flex flex-col min-h-[420px] bg-bg-surface">
           <div className="p-6 border-b border-ui-border flex justify-between items-center bg-bg-surface/50">
              <h3 className="text-[12px] font-mono tracking-[0.15em] text-text-muted uppercase font-bold flex items-center gap-2">
                <Calendar size={14} /> Today's Agenda
              </h3>
              <div className="text-[13px] text-text-primary font-medium px-3 py-1 bg-bg-input rounded-full">
                {format(new Date(), 'MMMM d, yyyy')}
              </div>
           </div>
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {appointments.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-text-muted">
                    <Calendar size={40} className="mb-4 opacity-30 text-brand-indigo" />
                    <p className="font-medium text-[15px]">{t('doctorPortal.dashboard.noAppointments') || 'No appointments scheduled for today'}</p>
                    <Link to="/doctor/appointments" className="mt-4 px-4 py-2 bg-brand-indigo/10 text-brand-indigo rounded-lg text-[13px] font-bold hover:bg-brand-indigo/20 transition-colors">
                      + Schedule Patient
                    </Link>
                 </div>
              ) : (
                 <div className="space-y-3">
                     {appointments.map((apt: any) => (
                      <div key={apt.id} className={`group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl hover:bg-bg-input/80 transition-colors bg-bg-surface border border-ui-border relative overflow-hidden ${apt.status === 'CANCELLED' ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                             apt.status === 'CONFIRMED' || apt.status === 'PLANNED' ? 'bg-[#22C55E]' : 
                             apt.status === 'PENDING' ? 'bg-state-warning' : 
                             apt.status === 'IN_PROGRESS' ? 'bg-brand-indigo' : 
                             apt.status === 'CANCELLED' ? 'bg-state-error' : 
                             'bg-text-muted'
                          }`} />
                          <div className="flex items-center gap-4 pl-3">
                             <div>
                               <div className="flex items-center gap-2">
                                  <span className="text-[15px] font-medium text-text-primary font-sans">
                                    {apt.patient_name || 'Inconnu'}
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
                                  <span>{apt.start_time || (apt.start_datetime ? format(new Date(apt.start_datetime), 'HH:mm') : '--:--')}</span>
                                  <span className="w-1 h-1 rounded-full bg-ui-border" />
                                  <span>{apt.appointment_type || 'Consultation'}</span>
                               </div>
                               <div className="text-[13px] text-text-muted mt-2 max-w-[280px] md:max-w-md">
                                  {apt.motive || 'Aucun motif spécifié'}
                               </div>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-1 bg-bg-surface/80 backdrop-blur-sm border border-ui-border/50 rounded-lg p-1 shadow-sm w-fit">
                              <Link to={`/doctor/consultations?apt=${apt.id}`} className="p-1.5 rounded-md text-text-muted hover:text-brand-indigo hover:bg-brand-indigo/10 transition-all duration-200 tooltip-trigger">
                                 <Eye size={15} strokeWidth={2} />
                              </Link>
                              {(apt.status === 'CONFIRMED' || apt.status === 'PLANNED' || apt.status === 'PENDING') && (
                                <>
                                  <div className="w-[1px] h-3 bg-ui-border/50" />
                                  <Link to={`/doctor/appointments?new=${apt.patient}`} className="p-1.5 rounded-md text-brand-indigo hover:bg-brand-indigo/10 transition-all duration-200">
                                     {apt.consultation_type === 'VIDEO' ? <Video size={15} strokeWidth={2} /> : <Play size={15} fill="currentColor" />}
                                  </Link>
                                </>
                              )}
                          </div>
                      </div>
                    ))}
                 </div>
              )}
           </div>
         </div>

         {/* Quick Stats */}
         <div className="lg:col-span-5 glass-island border border-ui-border rounded-3xl p-6 min-h-[420px] flex flex-col bg-bg-surface">
            <h3 className="text-[12px] font-mono tracking-[0.15em] text-text-muted uppercase font-bold flex items-center gap-2 mb-6">
              <Activity size={14} /> {t('doctorPortal.dashboard.performance') || 'Performance'}
            </h3>
            <div className="flex-1 flex flex-col space-y-8 overflow-y-auto custom-scrollbar pr-1">
               {[
                 { label: t('doctorPortal.dashboard.monthlyCons') || "Consultations du mois", value: kpis?.monthly_consultations || "0", perc: 60, icon: <Stethoscope size={16} /> },
                 { label: t('doctorPortal.dashboard.prescsIssued') || "Ordonnances délivrées", value: kpis?.total_prescriptions || "0", perc: 45, icon: <FileText size={16} /> },
                 { label: t('doctorPortal.dashboard.avgTime') || "Temps moyen de visite", value: `${kpis?.avg_visit_duration || 0}m`, perc: 70, icon: <Activity size={16} /> },
                 { label: t('doctorPortal.dashboard.attendance') || "Taux de présence", value: `${kpis?.attendance_rate || 0}%`, perc: 98, icon: <CheckCircle2 size={16} /> }
               ].map((stat, i) => (
                 <div key={i} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-[14px] text-text-muted">
                        <div className="text-brand-indigo/60">{stat.icon}</div>
                        {stat.label}
                      </div>
                      <span className="text-[20px] font-mono text-text-primary font-bold">{stat.value}</span>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* Row 3 - Charts */}
      <div className="grid grid-cols-1 gap-6">
         {/* Trend Chart (Expanded) */}
         <div className="glass-island border border-ui-border rounded-3xl p-6 bg-bg-surface">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-[12px] font-mono tracking-[0.15em] text-text-muted uppercase font-bold flex items-center gap-2">
                <TrendingUp size={14} /> Consultations Trend
              </h3>
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-bg-input border border-ui-border text-text-primary text-[13px] font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-indigo transition-colors"
              >
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="last_month">Mois dernier</option>
                <option value="last_year">Année dernière</option>
                <option value="all_time">Depuis toujours</option>
              </select>
            </div>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                       <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                   <XAxis 
                     dataKey="date" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{ fontSize: 12, fill: '#6B7280' }} 
                     tickFormatter={(val) => {
                       if (!val) return '';
                       const d = new Date(val);
                       return `${d.getDate()}/${d.getMonth()+1}`;
                     }}
                   />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} allowDecimals={false} />
                   <RechartsTooltip 
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                     labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                   />
                   <Area type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" activeDot={{ r: 6, strokeWidth: 0 }} />
                 </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
}
