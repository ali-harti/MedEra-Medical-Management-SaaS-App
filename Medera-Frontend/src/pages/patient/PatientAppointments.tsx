import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ChevronRight, FileSignature, Stethoscope, MapPin, Clock, FileText, Calendar, X, AlertTriangle, Video, Loader2 } from 'lucide-react';
import * as appointmentService from '../../services/appointmentService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { TypeBadge } from '../../components/TypeBadge';
import { BookingFlowModal } from '../../components/video/BookingFlowModal';
import { format } from 'date-fns';

export default function PatientAppointments() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [cancelModalId, setCancelModalId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [isLateCancel, setIsLateCancel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleCancel = (id: string, late: boolean) => {
    setCancelModalId(id);
    setIsLateCancel(late);
  };

  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['patient-appointments'],
    queryFn: () => appointmentService.getAppointments({ page: 1 })
  });

  const appointments = Array.isArray(appointmentsData) ? appointmentsData : (appointmentsData?.results || []);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => appointmentService.updateAppointment(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      setCancelModalId(null);
    }
  });

  const confirmCancel = () => {
    if (cancelModalId) {
      updateStatusMutation.mutate({ id: cancelModalId, status: 'CANCELLED' });
    }
  };

  const upcomingCount = appointments.filter((a: any) => ['PLANNED', 'CONFIRMED'].includes(a.status)).length;
  const pendingCount = appointments.filter((a: any) => a.status === 'REQUESTED').length;
  const pastCount = appointments.filter((a: any) => ['DONE', 'NO_SHOW'].includes(a.status)).length;
  const cancelledCount = appointments.filter((a: any) => ['CANCELLED', 'REJECTED'].includes(a.status)).length;

  const tabs = [
    { key: 'upcoming', label: t('appointments.tab.upcoming') || 'Upcoming', count: upcomingCount },
    { key: 'pending', label: 'En attente', count: pendingCount },
    { key: 'past', label: t('appointments.tab.past') || 'Past', count: pastCount },
    { key: 'cancelled', label: 'Annulés / Refusés', count: cancelledCount }
  ];

  const filteredApps = appointments.filter((a: any) => {
    if (activeTab === 'upcoming') return ['PLANNED', 'CONFIRMED'].includes(a.status);
    if (activeTab === 'pending') return a.status === 'REQUESTED';
    if (activeTab === 'past') return ['DONE', 'NO_SHOW'].includes(a.status);
    if (activeTab === 'cancelled') return ['CANCELLED', 'REJECTED'].includes(a.status);
    return false;
  }).sort((a: any, b: any) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());

  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const currentItems = filteredApps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-[#22C55E]';
      case 'PLANNED': return 'bg-[#F59E0B]';
      case 'REQUESTED': return 'bg-[#F59E0B]';
      case 'DONE': return 'bg-text-muted';
      case 'CANCELLED': 
      case 'REJECTED': return 'bg-state-error';
      default: return 'bg-ui-border';
    }
  };

  const getStatusBg = (status: string) => {
    switch(status) {
      case 'CONFIRMED': return 'bg-[#22C55E1A]';
      case 'PLANNED': return 'bg-[#F59E0B1A]';
      case 'REQUESTED': return 'bg-[#F59E0B1A]';
      case 'DONE': return 'bg-bg-input';
      case 'CANCELLED': 
      case 'REJECTED': return 'bg-state-error/10';
      default: return 'bg-bg-input';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'CONFIRMED': return 'text-[#22C55E]';
      case 'PLANNED': return 'text-[#F59E0B]';
      case 'REQUESTED': return 'text-[#F59E0B]';
      case 'DONE': return 'text-text-muted';
      case 'CANCELLED': 
      case 'REJECTED': return 'text-state-error';
      default: return 'text-text-muted';
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-indigo" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-[36px] font-serif italic text-text-primary leading-tight">{t('appointments.title') || 'My Appointments'}</h2>
          <p className="text-[16px] text-text-muted mt-1">{t('appointments.subtitle') || 'Your scheduled visits and appointment history.'}</p>
        </div>
        <button onClick={() => setShowBookingModal(true)} className="px-6 py-3 bg-brand-indigo text-white rounded-xl text-[14px] font-medium transition-transform hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(75,74,207,0.3)]">
          + Book Appointment
        </button>
      </div>

      {showBookingModal && (
        <BookingFlowModal 
          onClose={() => setShowBookingModal(false)} 
          onBook={async (details) => {
            queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
            navigate('/patient/demands');
          }}
        />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
        {tabs.map((tab) => (
          <button
             key={tab.key}
             onClick={() => handleTabChange(tab.key)}
             className={`relative px-5 py-2.5 text-[14px] font-medium transition-all rounded-full whitespace-nowrap flex items-center gap-2 ${activeTab === tab.key ? 'bg-brand-indigo text-white shadow-sm' : 'bg-white border border-ui-border text-brand-indigo hover:bg-bg-input'}`}
          >
             {tab.label}
             {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] ${activeTab === tab.key ? 'bg-white/20' : 'bg-brand-indigo/10 text-brand-indigo'}`}>{tab.count}</span>
             )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.98 }}
           transition={{ duration: 0.2 }}
           className="space-y-4"
        >
          {activeTab === 'upcoming' && (
             <div className="space-y-4">
                {filteredApps.map((appt: any, i: number) => (
                   <motion.div
                      key={appt.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, type: 'spring', damping: 25, stiffness: 150 }}
                      className="bg-white rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative group border border-ui-border flex flex-col md:flex-row md:items-center justify-between p-6 gap-6"
                   >
                      <div className={`absolute left-0 top-0 bottom-0 w-[6px] group-hover:w-[8px] transition-all duration-300 ${getStatusColor(appt.status)}`}></div>
                      
                       <div className="flex flex-col gap-2 pl-2 flex-1">
                         <div className="flex items-center gap-3">
                           <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${getStatusBg(appt.status)} ${getStatusText(appt.status)}`}>
                             {t(`status.${appt.status.toLowerCase()}`) || appt.status}
                           </span>
                           <TypeBadge type={appt.consultation_type || 'IN_PERSON'} />
                         </div>
                         <div className="flex items-center gap-4 mt-2">
                            <div className="w-12 h-12 rounded-full border border-ui-border bg-bg-input flex items-center justify-center text-[20px] shrink-0">
                               <Stethoscope size={20} className="text-brand-indigo" />
                            </div>
                            <div>
                               <div className="text-[18px] font-semibold text-text-primary">{appt.doctor_full_name || 'Dr. Karim Benali'}</div>
                               <div className="text-[14px] text-text-muted mt-0.5 flex flex-wrap items-center gap-2">
                                  <span>{appt.specialty || 'Specialist'}</span>
                                  {appt.room && (
                                    <>
                                      <span className="text-ui-border">•</span>
                                      <span className="flex items-center gap-1.5"><MapPin size={14} /> Room {appt.room}</span>
                                    </>
                                  )}
                               </div>
                               {(appt.status === 'REJECTED' || appt.status === 'CANCELLED') && appt.cancellation_reason && (
                                  <div className="mt-3 text-[13px] text-state-error bg-state-error/10 border border-state-error/20 rounded-lg px-3 py-2 flex items-start gap-2">
                                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                    <div>
                                      <span className="font-bold">Reason for Refusal/Cancellation:</span> {appt.cancellation_reason}
                                    </div>
                                  </div>
                               )}
                            </div>
                         </div>
                       </div>

                       <div className="flex flex-col md:items-end justify-center gap-4 border-t md:border-t-0 md:border-l border-ui-border pt-4 md:pt-0 md:pl-6 shrink-0">
                          <div className="text-[16px] font-medium text-text-primary flex items-center gap-2">
                            <Calendar size={18} className="text-text-muted" />
                            {format(new Date(appt.start_datetime), 'MMM dd, yyyy · HH:mm')}
                          </div>
                          
                          <div className="flex items-center gap-3">
                             {appt.status === 'PLANNED' && (
                                <button onClick={() => handleCancel(appt.id, false)} className="px-4 py-2 bg-white border border-ui-border hover:border-state-error hover:text-state-error rounded-xl text-[13px] font-medium transition-colors flex items-center gap-1.5 shadow-sm">
                                   <X size={14} /> Cancel
                                </button>
                             )}
                             {appt.status === 'CONFIRMED' && appt.consultation_type !== 'VIDEO' && (
                                <button onClick={() => handleCancel(appt.id, true)} className="px-4 py-2 bg-white border border-state-warning/30 text-state-warning hover:bg-state-warning/10 rounded-xl text-[13px] font-medium transition-colors flex items-center gap-1.5 shadow-sm">
                                   <AlertTriangle size={14} /> Late Cancellation
                                </button>
                             )}
                             <button onClick={() => setShowDetailsModal(appt)} className="p-2 text-text-muted hover:text-brand-indigo bg-white border border-ui-border rounded-xl shadow-sm transition-colors" title="View Details">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                             </button>
                             {appt.consultation_type === 'VIDEO' && (appt.status === 'CONFIRMED' || appt.status === 'PLANNED') && (
                                <button onClick={() => navigate(`/patient/video/${appt.id}`)} className="px-5 py-2.5 bg-brand-indigo text-white hover:bg-[#7C75FF] rounded-xl text-[13px] font-medium transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-1.5">
                                   <Video size={16} /> Join Call
                                </button>
                             )}
                          </div>
                       </div>
                   </motion.div>
                ))}
                 {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                       <button 
                         onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                         disabled={currentPage === 1}
                         className="px-4 py-2 text-[13px] font-medium text-text-primary bg-white border border-ui-border rounded-xl disabled:opacity-50 hover:bg-bg-input transition-colors"
                       >
                         Previous
                       </button>
                       <div className="text-[13px] text-text-muted">
                         Page {currentPage} of {totalPages}
                       </div>
                       <button 
                         onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                         disabled={currentPage === totalPages}
                         className="px-4 py-2 text-[13px] font-medium text-text-primary bg-white border border-ui-border rounded-xl disabled:opacity-50 hover:bg-bg-input transition-colors"
                       >
                         Next
                       </button>
                    </div>
                 )}
                 {filteredApps.length === 0 && (
                   <div className="py-16 text-center bg-white rounded-[1.5rem] border border-ui-border border-dashed">
                      <Calendar className="w-12 h-12 text-ui-border mx-auto mb-4" />
                      <p className="text-[16px] font-medium text-text-primary">No upcoming appointments</p>
                      <p className="text-[14px] text-text-muted mt-1">Book your next visit to see it here.</p>
                   </div>
                )}
             </div>
          )}

          {activeTab === 'pending' && (
             <div className="space-y-4">
                {filteredApps.map((appt: any, i: number) => (
                   <motion.div
                      key={appt.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, type: 'spring', damping: 25, stiffness: 150 }}
                      className="bg-white rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative group border border-amber-200 flex flex-col md:flex-row md:items-center justify-between p-6 gap-6"
                   >
                      <div className={`absolute left-0 top-0 bottom-0 w-[4px] bg-[#F59E0B]`}></div>
                      
                       <div className="flex flex-col gap-2 pl-2 flex-1">
                         <div className="flex items-center gap-3">
                           <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#F59E0B1A] text-[#F59E0B] flex items-center gap-1.5 animate-pulse`}>
                             <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                             EN ATTENTE
                           </span>
                           <TypeBadge type={appt.consultation_type || 'IN_PERSON'} />
                         </div>
                         <div className="flex items-center gap-4 mt-2">
                            <div className="w-12 h-12 rounded-full border border-ui-border bg-bg-input flex items-center justify-center text-[20px] shrink-0">
                               <Stethoscope size={20} className="text-[#F59E0B]" />
                            </div>
                            <div>
                               <div className="text-[18px] font-semibold text-text-primary">{appt.doctor_full_name || 'Dr. Karim Benali'}</div>
                               <div className="text-[14px] text-text-muted mt-0.5 flex flex-wrap items-center gap-2">
                                  <span>{appt.specialty || 'Specialist'}</span>
                               </div>
                            </div>
                         </div>
                       </div>

                       <div className="flex flex-col md:items-end justify-center gap-4 border-t md:border-t-0 md:border-l border-ui-border pt-4 md:pt-0 md:pl-6 shrink-0">
                          <div className="text-[16px] font-medium text-text-primary flex items-center gap-2">
                            <Calendar size={18} className="text-text-muted" />
                            {appt.start_datetime ? format(new Date(appt.start_datetime), 'MMM dd, yyyy · HH:mm') : 'Pas de date'}
                          </div>
                          
                          <div className="flex items-center gap-3">
                             <button onClick={() => setShowDetailsModal(appt)} className="p-2 text-text-muted hover:text-brand-indigo bg-white border border-ui-border rounded-xl shadow-sm transition-colors" title="View Details">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                             </button>
                             <button onClick={() => handleCancel(appt.id, false)} className="px-4 py-2 bg-white border border-ui-border hover:border-state-error hover:text-state-error rounded-xl text-[13px] font-medium transition-colors flex items-center gap-1.5 shadow-sm">
                                <X size={14} /> Cancel Request
                             </button>
                          </div>
                       </div>
                   </motion.div>
                ))}
                {filteredApps.length === 0 && (
                   <div className="py-16 text-center bg-white rounded-[1.5rem] border border-ui-border border-dashed">
                      <Clock className="w-12 h-12 text-ui-border mx-auto mb-4" />
                      <p className="text-[16px] font-medium text-text-primary">No pending requests</p>
                   </div>
                )}
             </div>
          )}

          {(activeTab === 'past' || activeTab === 'cancelled') && (
              <div className="space-y-4">
                 {currentItems.map((appt: any, i: number) => (
                    <motion.div
                       key={appt.id}
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: i * 0.08, type: 'spring', damping: 25, stiffness: 150 }}
                       className={`bg-white rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative group border ${appt.status === 'CANCELLED' || appt.status === 'REJECTED' ? 'border-state-error/30' : 'border-ui-border'} flex flex-col md:flex-row md:items-center justify-between p-6 gap-6`}
                    >
                       <div className={`absolute left-0 top-0 bottom-0 w-[6px] group-hover:w-[8px] transition-all duration-300 ${getStatusColor(appt.status)}`}></div>
                       
                        <div className="flex flex-col gap-2 pl-2 flex-1">
                          <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${getStatusBg(appt.status)} ${getStatusText(appt.status)}`}>
                              {t(`status.${appt.status.toLowerCase()}`) || appt.status}
                            </span>
                            <TypeBadge type={appt.consultation_type || 'IN_PERSON'} />
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                             <div className="w-12 h-12 rounded-full border border-ui-border bg-bg-input flex items-center justify-center text-[20px] shrink-0">
                                <Stethoscope size={20} className={getStatusText(appt.status)} />
                             </div>
                             <div>
                                <div className="text-[18px] font-semibold text-text-primary">{appt.doctor_full_name || 'Dr. Karim Benali'}</div>
                                <div className="text-[14px] text-text-muted mt-0.5 flex flex-wrap items-center gap-2">
                                   <span>{appt.specialty || 'Specialist'}</span>
                                   {appt.room && (
                                     <>
                                       <span className="text-ui-border">•</span>
                                       <span className="flex items-center gap-1.5"><MapPin size={14} /> Room {appt.room}</span>
                                     </>
                                   )}
                                </div>
                             </div>
                          </div>
                        </div>

                        <div className="flex flex-col md:items-end justify-center gap-4 border-t md:border-t-0 md:border-l border-ui-border pt-4 md:pt-0 md:pl-6 shrink-0">
                           <div className="text-[16px] font-medium text-text-primary flex items-center gap-2">
                             <Calendar size={18} className="text-text-muted" />
                             {appt.start_datetime ? format(new Date(appt.start_datetime), 'MMM dd, yyyy · HH:mm') : '---'}
                           </div>
                           
                           <div className="flex items-center gap-3">
                              <button onClick={() => setShowDetailsModal(appt)} className="p-2 text-text-muted hover:text-brand-indigo bg-white border border-ui-border rounded-xl shadow-sm transition-colors" title="View Details">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                              </button>
                              {appt.status === 'DONE' && (
                                 <>
                                    <button onClick={() => navigate('/patient/consultations')} className="p-2 text-text-muted hover:text-brand-indigo bg-white border border-ui-border rounded-xl shadow-sm transition-colors" title="View Consultation">
                                       <Stethoscope size={16} />
                                    </button>
                                    <button onClick={() => navigate('/patient/prescriptions')} className="p-2 text-text-muted hover:text-[#06B6D4] bg-white border border-ui-border rounded-xl shadow-sm transition-colors" title="View Prescription">
                                       <FileSignature size={16} />
                                    </button>
                                 </>
                              )}
                           </div>
                        </div>
                    </motion.div>
                 ))}
                 {filteredApps.length === 0 && (
                    <div className="py-16 text-center bg-white rounded-[1.5rem] border border-ui-border border-dashed">
                       <Clock className="w-12 h-12 text-ui-border mx-auto mb-4" />
                       <p className="text-[16px] font-medium text-text-primary">No appointments found</p>
                    </div>
                 )}
                 {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                       <button 
                         onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                         disabled={currentPage === 1}
                         className="px-4 py-2 text-[13px] font-medium text-text-primary bg-bg-surface border border-ui-border rounded-xl disabled:opacity-50 hover:bg-bg-input transition-colors"
                       >
                         Previous
                       </button>
                       <div className="text-[13px] text-text-muted">
                         Page {currentPage} of {totalPages}
                       </div>
                       <button 
                         onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                         disabled={currentPage === totalPages}
                         className="px-4 py-2 text-[13px] font-medium text-text-primary bg-bg-surface border border-ui-border rounded-xl disabled:opacity-50 hover:bg-bg-input transition-colors"
                       >
                         Next
                       </button>
                    </div>
                 )}
              </div>
          )}
        </motion.div>
      </AnimatePresence>

      {cancelModalId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[1.5rem] w-full max-w-[400px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center flex flex-col items-center">
               <div className="w-16 h-16 rounded-full bg-state-error/10 text-state-error flex items-center justify-center mb-4">
                  <AlertTriangle size={32} />
               </div>
               <h3 className="text-[20px] font-serif italic text-text-primary mb-2">
                 {isLateCancel ? "Late Cancellation" : "Cancel Appointment?"}
               </h3>
               <p className="text-[14px] text-text-muted">
                 {isLateCancel 
                    ? "You are cancelling this appointment less than 24 hours in advance. This may result in a cancellation fee according to clinic policy."
                    : "Are you sure you want to cancel this appointment request? This action cannot be undone."}
               </p>
            </div>
            <div className="p-6 pt-0 flex flex-col gap-3">
               <button onClick={confirmCancel} disabled={updateStatusMutation.isPending} className="w-full py-3 bg-state-error hover:bg-state-error/90 text-white font-medium rounded-xl transition-colors text-[14px] flex items-center justify-center gap-2 shadow-sm">
                 {updateStatusMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                 Yes, Cancel
               </button>
               <button onClick={() => setCancelModalId(null)} className="w-full py-3 bg-bg-surface border border-ui-border hover:bg-bg-input font-medium text-text-primary rounded-xl transition-colors text-[14px]">
                 Keep It
               </button>
            </div>
          </div>
        </div>
      )}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-ui-border flex justify-between items-center shrink-0">
              <h3 className="text-xl font-serif italic text-text-primary">Appointment Details</h3>
              <button onClick={() => setShowDetailsModal(null)} className="p-2 hover:bg-bg-input rounded-full transition-colors text-text-muted"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
               <div>
                 <p className="text-sm text-text-muted mb-1">Doctor</p>
                 <p className="text-lg font-medium">{showDetailsModal.doctor_full_name || 'Dr. Karim Benali'}</p>
                 <p className="text-sm text-text-muted">{showDetailsModal.specialty || 'Specialist'}</p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-muted mb-1">Date</p>
                    <p className="font-medium">{showDetailsModal.start_datetime ? format(new Date(showDetailsModal.start_datetime), 'PPP') : '---'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-1">Time</p>
                    <p className="font-medium">{showDetailsModal.start_datetime ? format(new Date(showDetailsModal.start_datetime), 'HH:mm') : '---'}</p>
                  </div>
               </div>
               <div>
                 <p className="text-sm text-text-muted mb-1">Status</p>
                 <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${getStatusBg(showDetailsModal.status)} ${getStatusText(showDetailsModal.status)}`}>
                   {t(`status.${showDetailsModal.status.toLowerCase()}`) || showDetailsModal.status}
                 </span>
               </div>
               <div>
                 <p className="text-sm text-text-muted mb-1">Motive</p>
                 <div className="bg-bg-input p-4 rounded-xl text-sm text-text-primary">
                   {showDetailsModal.motive || 'No specific motive provided.'}
                 </div>
               </div>
               {showDetailsModal.cancellation_reason && (
                  <div>
                    <p className="text-sm text-state-error mb-1">Cancellation Reason</p>
                    <div className="bg-state-error/10 p-4 rounded-xl text-sm text-state-error">
                      {showDetailsModal.cancellation_reason}
                    </div>
                  </div>
               )}
            </div>
            <div className="p-6 border-t border-ui-border flex justify-end shrink-0">
              <button onClick={() => setShowDetailsModal(null)} className="px-5 py-2.5 bg-brand-indigo text-white rounded-full font-medium hover:bg-[#7C75FF] transition-colors">Close</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
