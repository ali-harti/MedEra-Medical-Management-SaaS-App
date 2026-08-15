import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TypeBadge } from '../../components/TypeBadge';
import { useLanguage } from '../../contexts/LanguageContext';
import { Search, Calendar as CalendarIcon, List, Clock, User, Check, X, ChevronRight, ChevronLeft, Video, FileText, Loader2, AlertCircle, Eye, Play, Pencil, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as appointmentService from '../../services/appointmentService';
import * as patientService from '../../services/patientService';
import * as consultationService from '../../services/consultationService';
import { format, isToday, isFuture, isPast, parseISO, startOfWeek, addWeeks, subWeeks, addDays, getISODay, startOfDay, addMinutes } from 'date-fns';

export default function DoctorAppointments() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [activeTab, setActiveTab] = useState('Tous');
  const tabs = ['Tous', "Aujourd'hui", 'À Venir', 'En Cours', 'Passé', 'Annulé'];
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);
  const [editMotive, setEditMotive] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  // Fetch appointments from real backend
  const { data: appointmentsData, isLoading, isError, isFetching } = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => appointmentService.getAppointments(),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });
  const appointments = Array.isArray(appointmentsData) ? appointmentsData : (appointmentsData?.results || []);

  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.getPatients(),
  });
  const patients = Array.isArray(patientsData) ? patientsData : (patientsData?.results || []);

  const getPatientName = (apt: any) => {
    if (apt.patient_name) return apt.patient_name;
    if (apt.patient_details?.first_name) return `${apt.patient_details.first_name} ${apt.patient_details.last_name}`;
    const p = patients.find((p: any) => p.id === apt.patient);
    if (p) return `${p.first_name} ${p.last_name}`;
    return 'Unknown Patient';
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentService.updateAppointment(id, { status } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-agenda-today'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-kpis'] });
      setAppointmentToCancel(null);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      appointmentService.updateAppointment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      setShowEditModal(null);
    },
  });

  const handleEditSubmit = () => {
     let isoString = showEditModal.start_datetime;
     if (editDate && editTime) {
       isoString = `${editDate}T${editTime}:00`;
     }
     editMutation.mutate({
       id: showEditModal.id,
       data: {
         start_datetime: isoString,
         motive: editMotive
       }
     });
  };

  const openEditModal = (apt: any) => {
    setShowEditModal(apt);
    setEditMotive(apt.motive || '');
    const dt = parseISO(apt.start_datetime);
    setEditDate(format(dt, "yyyy-MM-dd"));
    setEditTime(format(dt, "HH:mm"));
  };

  const generateSlots = () => {
     const slots = [];
     for(let i=8; i<=18; i++) {
        slots.push(`${i.toString().padStart(2, '0')}:00`);
        if (i !== 18) slots.push(`${i.toString().padStart(2, '0')}:30`);
     }
     return slots;
  };

  const getSlotStatus = (time: string) => {
    if (!editDate) return 'unavailable';
    const taken = appointments.find((a: any) => {
      if (a.id === showEditModal?.id) return false;
      if (a.status === 'CANCELLED' || a.status === 'REJECTED') return false;
      const d = parseISO(a.start_datetime);
      return format(d, 'yyyy-MM-dd') === editDate && format(d, 'HH:mm') === time;
    });
    if (taken) return 'unavailable';
    if (editTime === time) return 'selected';
    return 'available';
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'CONFIRMED': return 'bg-[#22C55E]';
      case 'PLANNED': return 'bg-[#22C55E]';
      case 'PENDING': return 'bg-brand-indigo';
      case 'IN_PROGRESS': return 'bg-brand-indigo';
      case 'CANCELLED': return 'bg-state-error';
      case 'DONE': return 'bg-text-muted';
      default: return 'bg-ui-border';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'CONFIRMED': return 'text-[#22C55E]';
      case 'PLANNED': return 'text-[#22C55E]';
      case 'PENDING': return 'text-brand-indigo';
      case 'IN_PROGRESS': return 'text-brand-indigo';
      case 'CANCELLED': return 'text-state-error';
      case 'DONE': return 'text-text-muted';
      default: return 'text-text-muted';
    }
  };

  const getStatusBg = (status: string) => {
    switch(status) {
      case 'CONFIRMED': return 'bg-[#22C55E1A]';
      case 'PLANNED': return 'bg-[#22C55E1A]';
      case 'PENDING': return 'bg-brand-indigo/10';
      case 'IN_PROGRESS': return 'bg-brand-indigo/10';
      case 'CANCELLED': return 'bg-state-error/10';
      case 'DONE': return 'bg-bg-input';
      default: return 'bg-bg-input';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED':   return 'PLANIFIÉ';
      case 'PLANNED':     return 'PLANIFIÉ';
      case 'IN_PROGRESS': return 'EN COURS';
      case 'PENDING':     return 'EN COURS';
      case 'CANCELLED':   return 'ANNULÉ';
      case 'REJECTED':    return 'ANNULÉ';
      case 'DONE':        return 'TERMINÉ';
      default: return status;
    }
  };

  const filteredAppointments = appointments.filter((a: any) => {
    const aptDate = parseISO(a.start_datetime);
    const isTodayApt = isToday(aptDate);
    
    const isCancelled = a.status === 'CANCELLED' || a.status === 'REJECTED';
    const isDone = a.status === 'DONE';
    const isInProgress = a.status === 'IN_PROGRESS' || a.status === 'PENDING';
    const isPlanned = a.status === 'PLANNED' || a.status === 'CONFIRMED';
    
    const isPastApt = isPast(aptDate) && !isTodayApt;

    if (activeTab === "Aujourd'hui") return isTodayApt && !isCancelled;
    if (activeTab === 'Annulé') return isCancelled;
    if (activeTab === 'En Cours') return isInProgress && !isCancelled;
    
    if (activeTab === 'Passé') {
      // Only show DONE appointments, or past appointments that were NOT planned/in progress
      return isDone || (isPastApt && !isCancelled && !isInProgress && !isPlanned);
    }
    
    if (activeTab === 'À Venir') {
      // Show future appointments, or any planned appointment that hasn't started yet
      return (isPlanned) && !isCancelled && !isDone;
    }
    
    return !isCancelled;
  }).sort((a: any, b: any) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleStartConsultation = async (apt: any) => {
    try {
      // Step 1: Mark appointment as IN_PROGRESS
      if (apt.status !== 'IN_PROGRESS') {
        await updateStatusMutation.mutateAsync({ id: apt.id, status: 'IN_PROGRESS' });
      }

      // Step 2: Find or create the linked consultation
      const response = await consultationService.getConsultations({ appointment: apt.id });
      const existingConsultations = Array.isArray(response) ? response : (response.results || []);

      let consultationId: string;
      if (existingConsultations.length > 0) {
        consultationId = existingConsultations[0].id;
        // Step 3: Use the dedicated /start/ action (never patch status directly)
        await consultationService.startConsultation(consultationId);
      } else {
        // Step 3: Create a fresh consultation (backend creates it as DRAFT)
        const newCons = await consultationService.createConsultation({
          patient: apt.patient,
          appointment: apt.id,
          consultation_type: apt.consultation_type === 'VISIO' ? 'VIDEO' : 'IN_PERSON'
        });
        consultationId = newCons.id;
        // Step 4: Transition to IN_PROGRESS via the dedicated action
        await consultationService.startConsultation(consultationId);
      }

      if (apt.consultation_type === 'VISIO') {
        window.open(apt.video_room_url || '#', '_blank');
      }

      navigate(`/doctor/active-consultation/${consultationId}`);
    } catch (err: any) {
      console.error("Error starting consultation:", err);
      const httpStatus = err?.response?.status;
      if (httpStatus === 404) {
        alert("Consultation introuvable. Veuillez réessayer.");
      } else if (httpStatus === 403) {
        alert("Accès refusé à cette consultation.");
      } else if (httpStatus === 400) {
        const errorDetail = err?.response?.data?.detail || JSON.stringify(err?.response?.data) || 'erreur de validation';
        alert(`Impossible de démarrer : ${errorDetail}`);
      } else {
        alert("Impossible de démarrer la consultation. Vérifiez votre connexion.");
      }
    }
  };

  if (isLoading && !appointmentsData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Loader2 className="w-10 h-10 text-brand-indigo animate-spin mb-4" />
        <p className="text-text-muted font-serif italic text-lg">Loading your schedule...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-state-error/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="text-state-error w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif italic text-text-primary mb-2">Something went wrong</h2>
        <p className="text-text-muted max-w-md mx-auto mb-6">We couldn't load your appointments. Please check your connection and try again.</p>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] })} className="px-6 py-2 bg-brand-indigo text-white rounded-xl font-medium transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-brand-indigo/20">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-600 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
           <h1 className="text-[40px] font-serif italic text-text-primary leading-tight">Appointments</h1>
           <p className="text-[16px] text-text-muted mt-1 font-sans">Manage your schedule and patient visits.</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex glass-island border border-ui-border p-1 rounded-full w-fit shrink-0">
            <button 
               onClick={() => setViewMode('list')} 
               className={`relative flex items-center justify-center w-12 h-9 rounded-full transition-colors z-10 ${viewMode === 'list' ? 'text-white' : 'text-text-muted hover:text-text-primary'}`}
            >
               {viewMode === 'list' && <motion.div layoutId="view_toggle" className="absolute inset-0 bg-brand-indigo rounded-full z-[-1]" />}
               <List size={16} />
            </button>
            <button 
               onClick={() => setViewMode('calendar')} 
               className={`relative flex items-center justify-center w-12 h-9 rounded-full transition-colors z-10 ${viewMode === 'calendar' ? 'text-white' : 'text-text-muted hover:text-text-primary'}`}
            >
               {viewMode === 'calendar' && <motion.div layoutId="view_toggle" className="absolute inset-0 bg-brand-indigo rounded-full z-[-1]" />}
               <CalendarIcon size={16} />
            </button>
        </div>
      </div>
      
      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {appointmentToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-state-error/10 flex items-center justify-center text-state-error">
                  <X size={32} />
                </div>
                <h3 className="text-xl font-serif italic text-text-primary">Cancel Appointment</h3>
                <p className="text-sm text-text-muted">Are you sure you want to cancel this appointment? This action cannot be undone and the patient will be notified.</p>
              </div>
              <div className="flex items-center gap-3 mt-8">
                <button onClick={() => setAppointmentToCancel(null)} className="flex-1 py-3 bg-bg-surface border border-ui-border rounded-xl text-text-primary font-medium hover:bg-bg-input transition-colors">No, Keep It</button>
                <button onClick={() => updateStatusMutation.mutate({ id: appointmentToCancel, status: 'CANCELLED' })} className="flex-1 py-3 bg-state-error text-white rounded-xl font-medium hover:bg-state-error/90 transition-colors shadow-sm">Yes, Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-ui-border flex justify-between items-center shrink-0">
                <h3 className="text-xl font-serif italic text-text-primary">Appointment Details</h3>
                <button onClick={() => setShowDetailsModal(null)} className="p-2 hover:bg-bg-input rounded-full transition-colors text-text-muted"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                 <div>
                   <p className="text-sm text-text-muted mb-1">Patient</p>
                   <p className="text-lg font-medium">{getPatientName(showDetailsModal)}</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-text-muted mb-1">Date</p>
                      <p className="font-medium">{format(parseISO(showDetailsModal.start_datetime), 'PPP')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-text-muted mb-1">Time</p>
                      <p className="font-medium">{format(parseISO(showDetailsModal.start_datetime), 'HH:mm')}</p>
                    </div>
                 </div>
                 <div>
                   <p className="text-sm text-text-muted mb-1">Status</p>
                   <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${getStatusBg(showDetailsModal.status)} ${getStatusText(showDetailsModal.status)}`}>
                     {getStatusLabel(showDetailsModal.status)}
                   </span>
                 </div>
                 <div>
                   <p className="text-sm text-text-muted mb-1">Motive</p>
                   <div className="bg-bg-input p-4 rounded-xl text-sm text-text-primary">
                     {showDetailsModal.motive || 'No specific motive provided.'}
                   </div>
                 </div>
              </div>
              <div className="p-6 border-t border-ui-border flex justify-end shrink-0">
                <button onClick={() => setShowDetailsModal(null)} className="px-5 py-2.5 bg-brand-indigo text-white rounded-full font-medium hover:bg-[#7C75FF] transition-colors">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-ui-border flex justify-between items-center shrink-0">
                <h3 className="text-xl font-serif italic text-text-primary">Edit Appointment</h3>
                <button onClick={() => setShowEditModal(null)} className="p-2 hover:bg-bg-input rounded-full transition-colors text-text-muted"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                 <div>
                   <label className="block text-sm font-medium text-text-primary mb-2">Patient</label>
                   <input type="text" disabled value={getPatientName(showEditModal)} className="w-full bg-bg-input border-none rounded-xl px-4 py-3 text-text-muted font-medium cursor-not-allowed" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-text-primary mb-2">Date</label>
                   <input 
                     type="date" 
                     value={editDate}
                     onChange={(e) => {
                       setEditDate(e.target.value);
                       setEditTime('');
                     }}
                     className="w-full bg-white border border-ui-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 transition-shadow" 
                   />
                 </div>
                 {editDate && (
                   <div>
                     <label className="block text-sm font-medium text-text-primary mb-2">Available Slots</label>
                     <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        {generateSlots().map(time => {
                           const status = getSlotStatus(time);
                           return (
                             <button
                               key={time}
                               disabled={status === 'unavailable'}
                               onClick={() => setEditTime(time)}
                               className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                                  status === 'unavailable' ? 'bg-bg-input text-text-muted cursor-not-allowed opacity-60' :
                                  status === 'selected' ? 'bg-brand-indigo text-white shadow-sm' :
                                  'bg-white border border-ui-border text-brand-indigo hover:bg-brand-indigo/10'
                               }`}
                             >
                               {time}
                             </button>
                           )
                        })}
                     </div>
                   </div>
                 )}
                 <div>
                   <label className="block text-sm font-medium text-text-primary mb-2">Motive</label>
                   <textarea 
                     rows={3}
                     value={editMotive}
                     onChange={(e) => setEditMotive(e.target.value)}
                     className="w-full bg-white border border-ui-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 transition-shadow resize-none" 
                   />
                 </div>
              </div>
              <div className="p-6 border-t border-ui-border flex justify-end gap-3 shrink-0">
                <button onClick={() => setShowEditModal(null)} className="px-5 py-2.5 text-text-muted hover:bg-bg-input rounded-full font-medium transition-colors">Cancel</button>
                <button 
                  onClick={handleEditSubmit} 
                  disabled={editMutation.isPending}
                  className="px-5 py-2.5 bg-brand-indigo text-white rounded-full font-medium hover:bg-[#7C75FF] transition-colors flex items-center gap-2"
                >
                  {editMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
         {viewMode === 'list' ? (
           <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-6">
              {/* Tab Navigation */}
              <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
                {tabs.map(tab => {
                  return (
                    <button 
                      key={tab} 
                      onClick={() => setActiveTab(tab)} 
                      className={`relative px-5 py-2.5 text-[14px] font-medium transition-all rounded-full whitespace-nowrap flex items-center gap-2 ${activeTab === tab ? 'bg-brand-indigo text-white shadow-sm' : 'bg-white border border-ui-border text-brand-indigo hover:bg-bg-input'}`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* List Content */}
              <div className="space-y-4 pt-2">
                 {filteredAppointments.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center">
                       <div className="w-16 h-16 rounded-full bg-bg-input flex items-center justify-center mb-4">
                         <CalendarIcon className="text-text-muted w-8 h-8 opacity-50" />
                       </div>
                       <h3 className="text-[18px] font-medium text-text-primary mb-2">No appointments found</h3>
                       <p className="text-[14px] text-text-muted max-w-sm mx-auto">There are no appointments matching the selected filter.</p>
                    </div>
                 ) : (
                    paginatedAppointments.map((apt: any, i: number) => (
                       <motion.div 
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: i * 0.08, type: 'spring', damping: 25, stiffness: 150 }}
                         key={apt.id} 
                         className="bg-white rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative group border border-ui-border flex items-center justify-between p-5 md:p-6"
                       >
                          {/* Left Accent Border */}
                          <div className={`absolute left-0 top-0 bottom-0 w-[4px] transition-colors duration-300 ${getStatusColor(apt.status)}`}></div>
                          
                          <div className="flex flex-col gap-2 pl-2">
                             {/* Name & Badge */}
                             <div className="flex flex-wrap items-center gap-3">
                               <span className="text-[18px] font-semibold text-text-primary">{getPatientName(apt)}</span>
                               <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${getStatusBg(apt.status)} ${getStatusText(apt.status)}`}>
                                  {getStatusLabel(apt.status)}
                               </span>
                             </div>
                             
                             {/* Time & Type */}
                             <div className="flex items-center gap-2 text-[14px] text-text-muted font-mono">
                                <span>{format(parseISO(apt.start_datetime), 'HH:mm')}</span>
                                <span className="text-ui-border">•</span>
                                <span>{(apt.consultation_type === 'VIDEO' || apt.consultation_type === 'VISIO') ? 'VIDÉO' : 'PRÉSENTIEL'}</span>
                             </div>

                             {/* Reason */}
                             <div className="text-[14px] text-text-muted mt-1 font-sans">
                                {apt.motive || 'Follow-up'}
                             </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center">
                             <div className="flex items-center bg-white border border-ui-border rounded-full p-1.5 shadow-sm hover:shadow-md transition-shadow">
                                <button onClick={() => setShowDetailsModal(apt)} title="View Details" className="p-2 text-text-muted hover:text-brand-indigo transition-colors rounded-full hover:bg-bg-input">
                                   <Eye size={18} />
                                </button>
                                <div className="w-[1px] h-5 bg-ui-border mx-1"></div>
                                <button onClick={() => openEditModal(apt)} title="Edit Appointment" className="p-2 text-text-muted hover:text-brand-indigo transition-colors rounded-full hover:bg-bg-input">
                                   <Pencil size={18} />
                                </button>
                                <div className="w-[1px] h-5 bg-ui-border mx-1"></div>
                                {(apt.status === 'CONFIRMED' || apt.status === 'PLANNED') && (
                                  <>
                                     <button 
                                        title="Cancel"
                                        onClick={() => setAppointmentToCancel(apt.id)}
                                        className="p-2 text-text-muted hover:text-state-error transition-colors rounded-full hover:bg-state-error/10"
                                     >
                                        <X size={18} />
                                     </button>
                                     <div className="w-[1px] h-5 bg-ui-border mx-1"></div>
                                  </>
                                )}
                                {(apt.status === 'CONFIRMED' || apt.status === 'PLANNED' || apt.status === 'IN_PROGRESS' || apt.status === 'PENDING') && (
                                  <button 
                                     title={(apt.status === 'IN_PROGRESS' || apt.status === 'PENDING') ? "Resume Consultation" : "Start Consultation"}
                                     disabled={updateStatusMutation.isPending}
                                     onClick={() => handleStartConsultation(apt)}
                                     className="p-2 text-brand-indigo hover:text-white transition-colors rounded-full hover:bg-brand-indigo"
                                  >
                                     {(apt.status === 'IN_PROGRESS' || apt.status === 'PENDING') ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} className="fill-current ml-0.5" />}
                                  </button>
                                )}
                             </div>
                          </div>
                       </motion.div>
                    ))
                 )}
              </div>

              {/* Pagination */}
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
           </motion.div>
         ) : (
           <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {/* Calendar Controls */}
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-[20px] font-serif text-text-primary">{format(calendarDate, 'MMMM yyyy')}</h2>
                 <div className="flex glass-island p-1 rounded-full border border-ui-border">
                    <button onClick={() => setCalendarDate(prev => subWeeks(prev, 1))} className="flex items-center justify-center gap-1 px-4 py-1.5 text-[13px] font-medium text-text-muted hover:text-text-primary transition-colors group"><ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Prev Week</button>
                    <button onClick={() => setCalendarDate(new Date())} className="px-5 py-1.5 text-[13px] font-medium text-brand-indigo bg-brand-indigo/10 rounded-full">Today</button>
                    <button onClick={() => setCalendarDate(prev => addWeeks(prev, 1))} className="flex items-center justify-center gap-1 px-4 py-1.5 text-[13px] font-medium text-text-muted hover:text-text-primary transition-colors group">Next Week <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></button>
                 </div>
              </div>
              
              {/* Calendar Grid */}
              <div className="calendar-grid bg-bg-surface border border-ui-border rounded-3xl overflow-hidden glass-island grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
                 {/* Header Row */}
                 <div className="border-b border-r border-ui-border py-4"></div>
                 {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                    const currentWeekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
                    const dateForCol = addDays(currentWeekStart, i);
                    return (
                      <div key={day} className={`border-b ${i<6 ? 'border-r' : ''} border-ui-border py-4 text-center ${isToday(dateForCol) ? 'bg-brand-indigo/5' : ''}`}>
                         <div className="text-[13px] font-medium text-text-muted">{day}</div>
                         <div className={`text-[18px] font-serif ${isToday(dateForCol) ? 'text-brand-indigo font-bold' : 'text-text-primary'}`}>{format(dateForCol, 'd')}</div>
                      </div>
                    );
                 })}

                 {/* Time Rows */}
                 {Array.from({length: 11}, (_, i) => i + 8).map((hour) => {
                    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                    return (
                      <React.Fragment key={timeStr}>
                         <div className="border-b border-r border-ui-border py-4 pr-2 text-right relative">
                            <span className="absolute top-0 right-3 -translate-y-1/2 text-[11px] font-mono text-text-muted">{timeStr}</span>
                         </div>
                         {[0,1,2,3,4,5,6].map(dayIdx => {
                            const currentWeekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
                            const cellDate = addDays(currentWeekStart, dayIdx);
                            const cellDateStr = format(cellDate, 'yyyy-MM-dd');
                            
                            // Find appointments for this specific cell
                            const cellAppts = appointments.filter((a: any) => {
                               if (a.status === 'CANCELLED' || a.status === 'REJECTED') return false;
                               const aptDate = parseISO(a.start_datetime);
                               return format(aptDate, 'yyyy-MM-dd') === cellDateStr && format(aptDate, 'HH') === hour.toString().padStart(2, '0');
                            });

                            return (
                               <div key={`${dayIdx}-${timeStr}`} className={`border-b ${dayIdx<6 ? 'border-r' : ''} border-ui-border h-20 hover:bg-brand-indigo/5 transition-colors relative p-1`}>
                                 {cellAppts.map((apt: any) => {
                                    const aptStart = parseISO(apt.start_datetime);
                                    const startMinutes = aptStart.getMinutes();
                                    const topOffset = (startMinutes / 60) * 100;
                                    const duration = apt.duration_minutes || 30;
                                    const heightPct = (duration / 60) * 100;
                                    return (
                                      <motion.div 
                                        key={apt.id}
                                        initial={{ opacity: 0, scale: 0.95 }} 
                                        animate={{ opacity: 1, scale: 1 }} 
                                        className={`absolute left-0.5 right-0.5 rounded-md p-1 px-1.5 z-10 shadow-sm cursor-pointer border hover:shadow-md transition-all flex flex-col overflow-hidden ${apt.status === 'CONFIRMED' || apt.status === 'PLANNED' ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]' : apt.status === 'DONE' || apt.status === 'FINALIZED' ? 'bg-bg-input border-ui-border text-text-muted opacity-80' : apt.status === 'CANCELLED' ? 'bg-state-error/10 border-state-error/30 text-state-error line-through decoration-state-error/50' : 'bg-brand-indigo/10 border-brand-indigo/30 text-brand-indigo hover:bg-brand-indigo/20'}`}
                                        style={{ top: `${topOffset}%`, height: `${heightPct}%`, zIndex: 10 + (startMinutes) }}
                                        onClick={() => setShowDetailsModal(apt)}
                                      >
                                         <div className="text-[11px] font-semibold truncate leading-tight">{getPatientName(apt)}</div>
                                         {heightPct > 40 && <div className="text-[9px] font-mono opacity-80 mt-0.5">{format(aptStart, 'HH:mm')}</div>}
                                      </motion.div>
                                    );
                                 })}
                               </div>
                            )
                         })}
                      </React.Fragment>
                    )
                 })}
              </div>
           </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
