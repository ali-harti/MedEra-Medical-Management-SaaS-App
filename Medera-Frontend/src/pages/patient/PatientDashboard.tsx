import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TypeBadge } from '@/components/TypeBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, Stethoscope, Pill, CreditCard, ChevronRight,
  Download, Activity, Heart, Thermometer, Weight, FileText, MapPin, Loader2
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getPatientDashboardKpis } from '@/services/patientService';
import { getAppointments } from '@/services/appointmentService';
import { getConsultations } from '@/services/consultationService';
import { getPrescriptions, downloadPrescriptionPdf } from '@/services/prescriptionService';
import { getThreads } from '@/services/messagingService';
import { format } from 'date-fns';
import { Skeleton } from '@/components/Skeleton';

function CountUp({ end, duration = 1200 }: { end: number, duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - percentage, 3);
      setCount(Math.floor(easeProgress * end));

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count}</span>;
}

export default function PatientDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: kpis, isLoading: kpisLoading, isError: kpisError } = useQuery({
    queryKey: ['patient-dashboard-kpis'],
    queryFn: getPatientDashboardKpis,
    staleTime: 30000
  });

  const { data: appointments, isLoading: aptsLoading } = useQuery({
    queryKey: ['patient-appointments-upcoming'],
    queryFn: () => getAppointments({ status: 'CONFIRMED' }),
    refetchInterval: 30000,
  });

  const { data: consultations, isLoading: consLoading } = useQuery({
    queryKey: ['patient-consultations-recent'],
    queryFn: () => getConsultations({ page: 1 }),
    refetchInterval: 60000,
  });

  const { data: prescriptions, isLoading: presLoading } = useQuery({
    queryKey: ['patient-prescriptions-recent'],
    queryFn: () => getPrescriptions({ page: 1 })
  });

  const { data: threads, isLoading: msgLoading } = useQuery({
    queryKey: ['patient-messages-recent'],
    queryFn: getThreads
  });

  const isLoading = kpisLoading || aptsLoading || consLoading || presLoading || msgLoading;

  if (isLoading) {
    return (
      <div className="space-y-8 p-8 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  let upcomingAppts = appointments?.results || [];
  
  let activePrescriptions = prescriptions?.results?.filter(p => p.is_valid) || [];

  const nextAppt = upcomingAppts[0];
  let lastConsultation = consultations?.results?.[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('patient.greeting.morning') || 'Good morning';
    if (hour < 17) return t('patient.greeting.afternoon') || 'Good afternoon';
    return t('patient.greeting.evening') || 'Good evening';
  };

  return (
    <div className="max-w-[1400px] w-full mx-auto space-y-8 animate-in fade-in duration-600 pb-12 relative">
      <div className="absolute top-0 left-0 w-full h-[600px] -z-10 overflow-hidden opacity-50 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-brand-indigo/10 blur-[120px]"></div>
        <div className="absolute top-[20%] left-[40%] w-[300px] h-[300px] rounded-full bg-brand-violet/10 blur-[100px]"></div>
        <div className="absolute top-[40%] right-[-5%] w-[350px] h-[350px] rounded-full bg-state-success/10 blur-[120px]"></div>
      </div>

      <div className="mb-10">
        <h2 className="text-[40px] font-serif italic text-text-primary flex gap-2">
          {`${getGreeting()}, ${user?.first_name}.`.split(' ').map((word, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: 10, clipPath: 'inset(100% 0 0 0)' }} animate={{ opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' }} transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}>
              {word}
            </motion.span>
          ))}
        </h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-text-muted font-sans text-[16px] mt-1">
          {t('patient.dashboard.insight') || "Here's what's happening with your health today."}
        </motion.p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: <Calendar />, val: kpis?.upcoming_appointments ?? 0, label: t('patient.dashboard.stats.upcoming') || 'UPCOMING', sub: nextAppt ? `↑ Next: ${format(new Date(nextAppt.start_datetime), 'MMM d')}` : 'No upcoming', subColor: 'text-brand-indigo' },
          { icon: <Stethoscope />, val: kpis?.total_consultations ?? 0, label: 'CONSULTATIONS', sub: `${kpis?.total_consultations ?? 0} total`, subColor: 'text-text-muted' },
          { icon: <Pill />, val: kpis?.active_prescriptions ?? 0, label: 'ACTIVE PRESCRIPTIONS', sub: activePrescriptions[0] ? `Issued ${format(new Date(activePrescriptions[0].issued_at), 'MMM d')}` : 'No active prescriptions', subColor: 'text-text-muted' },
          { icon: <CreditCard />, val: kpis?.pending_amount ?? 0, unit: 'MAD', label: 'AMOUNT DUE', sub: (kpis?.pending_invoices ?? 0) > 0 ? `${kpis?.pending_invoices ?? 0} pending bills` : 'All clear', subColor: (kpis?.pending_invoices ?? 0) > 0 ? 'text-state-warning' : 'text-state-success' }
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.08, duration: 0.5 }}
            key={i}
            className="glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(75,74,207,0.15)] transition-all duration-300 flex flex-col justify-between bg-bg-surface/50"
          >
            <div className="flex items-center gap-4 mb-3">
               <div className="w-12 h-12 rounded-full bg-brand-indigo/10 flex items-center justify-center border border-brand-indigo/20">
                  <div className="text-brand-indigo">{React.cloneElement(stat.icon as React.ReactElement, { className: 'w-5 h-5' })}</div>
               </div>
               <div className="flex-1 min-w-0">
                  <div className="text-[32px] font-bold text-text-primary leading-none truncate"><CountUp end={stat.val as number} />{stat.unit && <span className="text-[16px] ml-1 font-normal text-text-muted">{stat.unit}</span>}</div>
                  <div className="font-mono text-[10px] text-text-muted tracking-wider mt-1.5 uppercase truncate">{stat.label}</div>
               </div>
            </div>
            <div className={`flex items-center gap-1.5 text-[13px] font-medium mt-4 ${stat.subColor}`}>
               {stat.sub.includes('↑') && <Activity className="w-3.5 h-3.5" />} {stat.sub.replace('↑ ', '')}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Next Appointment */}
        <div className="lg:col-span-3 relative rounded-[20px] glass-island border border-ui-border p-7 backdrop-blur-md overflow-hidden group bg-bg-surface/50">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-state-success/60"></div>
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="font-mono text-[11px] text-text-muted tracking-[0.2em] uppercase">{t('patient.dashboard.nextAppt') || 'NEXT APPOINTMENT'}</div>
              {nextAppt?.consultation_type && <TypeBadge type={nextAppt.consultation_type} />}
            </div>
            <div className="px-3 py-1 rounded-full border border-state-success/30 bg-state-success-bg text-state-success font-mono text-[10px] font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-state-success"></span>
              {nextAppt ? nextAppt.status : 'NONE'}
            </div>
          </div>

          {nextAppt ? (
            <div>
              <div className="text-[28px] font-serif italic text-text-primary mb-2">
                {format(new Date(nextAppt.start_datetime), 'EEEE, MMMM d')}
              </div>
              <div className="text-[20px] font-mono text-brand-indigo mb-8">
                {format(new Date(nextAppt.start_datetime), 'HH:mm')}
              </div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-ui-border border-2 border-brand-indigo flex items-center justify-center text-text-muted text-[18px]">
                  <Stethoscope size={24} className="text-brand-indigo" />
                </div>
                <div>
                  <div className="text-[16px] font-medium text-text-primary">{nextAppt.doctor_name}</div>
                  <div className="text-[13px] text-text-muted">Specialist</div>
                </div>
                {nextAppt.consultation_type !== 'VIDEO' && nextAppt.room && (
                  <>
                    <div className="w-px h-8 bg-ui-border mx-2"></div>
                    <div className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-ui-border text-text-muted text-[13px] flex items-center gap-2">
                       <MapPin size={14} /> Room {nextAppt.room}
                    </div>
                  </>
                )}
              </div>

              <div className="text-[14px] text-text-muted italic mb-8 flex items-center gap-2">
                <FileText size={16} /> Motive: {nextAppt.motive}
              </div>

              <div className="flex items-center gap-6">
                <button onClick={() => navigate('/patient/appointments')} className="text-brand-indigo font-medium text-[14px] hover:text-brand-lavender transition-colors relative group-hover:after:w-full after:w-0 after:h-px after:bg-brand-lavender after:absolute after:bottom-0 after:left-0 after:transition-all flex items-center gap-1">
                   See Details <ChevronRight size={16} />
                 </button>
                {nextAppt.consultation_type === 'VIDEO' && (
                  <button onClick={() => navigate(`/patient/video/${nextAppt.id}`)} className="join-video-btn">
                     <span className="live-dot"></span>
                     {t('video.join') || 'Join Video Call'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center flex flex-col items-center">
               <Calendar className="w-12 h-12 text-brand-indigo mb-4 animate-bounce" />
               <h3 className="text-[24px] font-serif italic text-text-primary">No upcoming appointments</h3>
               <p className="text-text-muted mt-2">Book one with your doctor</p>
               <button onClick={() => navigate('/patient/find-doctor')} className="mt-6 px-6 py-2 bg-brand-indigo text-white rounded-full text-[14px] font-bold">
                 Book Now
               </button>
            </div>
          )}
        </div>

        {/* Health Snapshot */}
        <div className="lg:col-span-2 glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md flex flex-col bg-bg-surface/50">
          <h3 className="text-[16px] font-medium text-text-primary mb-6">Health Snapshot</h3>
          
          {lastConsultation && lastConsultation.vitals ? (
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-0">
                {[
                  { icon: Heart, label: 'Heart Rate', val: lastConsultation.vitals.heart_rate, unit: 'bpm' },
                  { icon: Thermometer, label: 'Temperature', val: lastConsultation.vitals.temperature, unit: '°C' },
                  { icon: Weight, label: 'BMI', val: lastConsultation.vitals.bmi, unit: '' },
                  { icon: Activity, label: 'Blood Pressure', val: lastConsultation.vitals.blood_pressure, unit: '' },
                ].map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b border-ui-border last:border-0">
                    <div className="flex items-center gap-3">
                      <v.icon className="w-5 h-5 text-text-muted" />
                      <span className="text-[15px] text-text-muted">{v.label}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-mono text-[16px] text-text-primary">{v.val} {v.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="font-mono text-[11px] text-text-muted mt-6">
                Last updated: {format(new Date(lastConsultation.created_at), 'MMM d, yyyy')}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Activity className="w-10 h-10 text-brand-lavender/40 mb-3" />
              <p className="text-text-muted text-[14px]">No health data yet. Vitals appear after your consultation.</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Prescriptions */}
        <div className="glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md bg-bg-surface/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[16px] font-medium text-text-primary">Recent Prescriptions</h3>
            <button onClick={() => navigate('/patient/prescriptions')} className="text-brand-indigo text-[14px] font-medium hover:text-brand-lavender transition-colors flex items-center gap-1 group">
               View All <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="space-y-0">
             {prescriptions?.results?.slice(0, 3).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-4 border-b border-ui-border last:border-0 group">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand-indigo/10 flex items-center justify-center">
                         <Pill className="w-5 h-5 text-brand-indigo" />
                      </div>
                      <div>
                         <div className="font-mono text-[12px] text-text-muted mb-0.5">
                           {format(new Date(p.issued_at), 'MMM d, yyyy')}
                         </div>
                         <div className="text-[14px] font-medium text-text-primary">{(p.medication_lines?.length || p.medications?.length || 0)} medications</div>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      {p.is_valid ? (
                         <div className="px-2 py-0.5 rounded border border-state-success/30 bg-state-success-bg text-state-success font-mono text-[10px] font-bold">VALID</div>
                      ) : (
                         <div className="px-2 py-0.5 rounded border border-state-error/30 bg-state-error/10 text-state-error font-mono text-[10px] font-bold">CANCELLED</div>
                      )}
                      <button 
                        onClick={() => downloadPrescriptionPdf(p.id)}
                        className="w-8 h-8 rounded-full border border-ui-border text-text-muted hover:text-brand-indigo flex items-center justify-center transition-all bg-bg-elevated"
                      >
                         <Download size={14} />
                      </button>
                   </div>
                </div>
             ))}
          </div>
          {(!prescriptions?.results || prescriptions.results.length === 0) && (
             <div className="text-center py-6 text-text-muted text-[14px]">No recent prescriptions</div>
          )}
        </div>

        {/* Messages */}
        <div className="glass-island border border-ui-border rounded-[20px] p-7 backdrop-blur-md bg-bg-surface/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[16px] font-medium text-text-primary flex items-center gap-2">
               Messages
               {(threads?.results?.filter((t: any) => !t.is_read)?.length || 0) > 0 && (
                  <span className="w-5 h-5 rounded-full bg-brand-indigo text-white text-[10px] font-mono font-bold flex items-center justify-center">
                     {threads?.results?.filter((t: any) => !t.is_read)?.length || 0}
                  </span>
               )}
            </h3>
            <button onClick={() => navigate('/patient/messages')} className="text-brand-indigo text-[14px] font-medium hover:text-brand-lavender transition-colors flex items-center gap-1 group">
               View All <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="space-y-0">
             {threads?.results?.slice(0, 3).map((thread: any) => (
                <div key={thread.id} onClick={() => navigate(`/patient/messages?thread=\${thread.id}`)} className={`py-3.5 border-b border-ui-border last:border-0 flex items-center gap-4 cursor-pointer transition-colors \${!thread.is_read ? 'bg-brand-indigo/5 px-2 -mx-2 rounded-lg' : ''}`}>
                   <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-ui-border flex items-center justify-center text-[14px] font-medium text-text-primary">
                         {thread.subject.substring(0, 2).toUpperCase()}
                      </div>
                      {!thread.is_read && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-brand-indigo border-2 border-bg-canvas rounded-full"></span>}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                         <div className={`text-[14px] truncate \${!thread.is_read ? 'font-semibold text-text-primary' : 'font-medium text-text-primary'}`}>{thread.subject}</div>
                         <div className="font-mono text-[10px] text-text-muted shrink-0">
                           {thread.last_message_at ? format(new Date(thread.last_message_at), 'HH:mm') : ''}
                         </div>
                      </div>
                      <div className="text-[13px] text-text-muted truncate w-11/12">{thread.last_message || 'No messages yet'}</div>
                   </div>
                </div>
             ))}
          </div>
          {(!threads?.results || threads.results.length === 0) && (
             <div className="text-center py-6 text-text-muted text-[14px]">No messages to display</div>
          )}
        </div>
      </div>
    </div>
  );
}
