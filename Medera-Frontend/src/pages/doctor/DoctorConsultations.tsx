import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { TypeBadge } from '../../components/TypeBadge';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Video, PhoneOff, Plus, User, Calendar as CalendarIcon, FileText, ChevronRight, ChevronLeft, X, AlertTriangle, Save, Check, Loader2, Stethoscope, Eye, XCircle, Play, Edit2, CheckCircle2, Ban } from 'lucide-react';
import { AIDiagnosticAssistant } from '../../components/doctor/AIDiagnosticAssistant';
import * as consultationService from '../../services/consultationService';
import * as appointmentService from '../../services/appointmentService';
import * as patientService from '../../services/patientService';
import * as prescriptionService from '../../services/prescriptionService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const consultationSchema = z.object({
  patient: z.string().min(1, "Patient is required"),
  appointment: z.string().optional(),
  consultation_type: z.enum(['IN_PERSON', 'VIDEO']),
  motive: z.string().optional(),
});

type ConsultationFormValues = z.infer<typeof consultationSchema>;

function LiveVideoTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const totalSeconds = Math.floor(elapsed / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');

  return <span>{m}:{s}</span>;
}

export default function DoctorConsultations() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterPatientId = searchParams.get('patient');
  
  const [activeTab, setActiveTab] = useState('Tous');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modals status
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState<string | null>(null);
  const [showEndCallModal, setShowEndCallModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<any>(null);

  // Queries
  const { data: consultationsData, isLoading } = useQuery({
    queryKey: ['consultations', activeTab, filterPatientId],
    queryFn: () => {
      let statusFilter: string | undefined = undefined;
      if (activeTab === 'En Cours') statusFilter = 'DRAFT,IN_PROGRESS';
      if (activeTab === 'Finalisée') statusFilter = 'FINALIZED';
      if (activeTab === 'Annulée') statusFilter = 'CANCELLED';
      
      return consultationService.getConsultations({ 
        status: statusFilter,
        patient: filterPatientId || undefined
      });
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.getPatients()
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ['appointments', 'CONFIRMED'],
    queryFn: () => appointmentService.getAppointments({ status: 'CONFIRMED' }),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  const patients = patientsData?.results || (Array.isArray(patientsData) ? patientsData : []);
  const appointments = appointmentsData?.results || (Array.isArray(appointmentsData) ? appointmentsData : []);

  const sortedConsultations = [...(consultationsData?.results || (Array.isArray(consultationsData) ? consultationsData : []))].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const totalPages = Math.ceil(sortedConsultations.length / itemsPerPage);
  const paginatedConsultations = sortedConsultations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: ConsultationFormValues) => consultationService.createConsultation(data),
    onSuccess: (newConsultation) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      setIsNewModalOpen(false);
      setShowDetailsModal(newConsultation);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => consultationService.updateConsultation(id, data),
    onSuccess: (updatedData, variables) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      if (showDetailsModal && showDetailsModal.id === variables.id) {
         setShowDetailsModal({ ...showDetailsModal, ...updatedData });
      }
    }
  });

  const finalizeMutation = useMutation({
    mutationFn: (id: string) => consultationService.finalizeConsultation(id),
    onSuccess: (updatedData) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      setShowFinalizeModal(null);
      if (showDetailsModal && showDetailsModal.id === updatedData.id) {
         setShowDetailsModal({ ...showDetailsModal, ...updatedData });
      }
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => consultationService.cancelConsultation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
    }
  });

  const startVideoMutation = useMutation({
    mutationFn: (id: string) => consultationService.startVideo(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      if (data?.url) window.open(data.url, '_blank');
      if (showDetailsModal && showDetailsModal.id === data.id) {
         setShowDetailsModal({ ...showDetailsModal, ...data });
      }
    }
  });

  const endVideoMutation = useMutation({
    mutationFn: (id: string) => consultationService.endVideo(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      setShowEndCallModal(null);
      if (showDetailsModal && showDetailsModal.id === data.id) {
         setShowDetailsModal({ ...showDetailsModal, ...data });
      }
    }
  });

  // Form
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationSchema)
  });

  const { register: registerEdit, handleSubmit: handleSubmitEdit, watch: watchEdit, setValue: setValueEdit, reset: resetEdit, formState: { errors: editErrors } } = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationSchema)
  });

  useEffect(() => {
    if (showEditModal) {
      resetEdit({
        patient: showEditModal.patient,
        appointment: showEditModal.appointment || '',
        consultation_type: showEditModal.consultation_type || 'IN_PERSON',
        motive: showEditModal.motive || ''
      });
    }
  }, [showEditModal, resetEdit]);

  const startAppointmentId = searchParams.get('appointmentId');
  useEffect(() => {
    if (startAppointmentId && sortedConsultations.length > 0 && appointments.length > 0) {
      const existing = sortedConsultations.find((c: any) => c.appointment === startAppointmentId);
      if (existing) {
        setShowDetailsModal(existing);
      } else {
        const apt = appointments.find((a: any) => a.id === startAppointmentId);
        if (apt) {
          setValue('patient', apt.patient);
          setValue('appointment', apt.id);
          setValue('consultation_type', apt.consultation_type || 'IN_PERSON');
          setValue('motive', apt.motive || '');
          setIsNewModalOpen(true);
        }
      }
      searchParams.delete('appointmentId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [startAppointmentId, sortedConsultations, appointments, setValue, setSearchParams, searchParams]);

  const editMutation = useMutation({
    mutationFn: (data: ConsultationFormValues) => consultationService.updateConsultation(showEditModal.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      setShowEditModal(null);
    }
  });

  const selectedPatientId = watch('patient');
  const filteredAppointments = appointments.filter(a => a.patient === selectedPatientId);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'FINALIZED': return 'bg-[#22C55E]';
      case 'DRAFT': return 'bg-state-warning';
      case 'IN_PROGRESS': return 'bg-brand-indigo';
      case 'CANCELLED': return 'bg-state-error';
      default: return 'bg-ui-border';
    }
  };

  const getStatusBg = (status: string) => {
    switch(status) {
      case 'FINALIZED': return 'bg-[#22C55E1A]';
      case 'DRAFT':
      case 'IN_PROGRESS': return 'bg-brand-indigo/10';
      case 'CANCELLED': return 'bg-state-error/10';
      default: return 'bg-bg-input';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'FINALIZED': return 'text-[#22C55E]';
      case 'DRAFT':
      case 'IN_PROGRESS': return 'text-brand-indigo';
      case 'CANCELLED': return 'text-state-error';
      default: return 'text-text-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'FINALIZED': return 'Finalisée';
      case 'DRAFT': 
      case 'IN_PROGRESS': return 'En Cours';
      case 'CANCELLED': return 'Annulée';
      default: return status;
    }
  };

  if (isLoading && !consultationsData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-brand-indigo animate-spin" />
        <p className="text-text-muted font-mono animate-pulse">Loading consultations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-600 pb-12 relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
           <div className="flex items-center gap-3">
             <h1 className="text-[40px] font-sans text-text-primary leading-tight">Consultations</h1>
             {filterPatientId && (
               <button 
                 onClick={() => { searchParams.delete('patient'); setSearchParams(searchParams); }}
                 className="mt-2 px-3 py-1 bg-brand-indigo/10 text-brand-indigo hover:bg-brand-indigo hover:text-white rounded-full text-[12px] font-medium transition-colors flex items-center gap-1"
               >
                 Patient Filter <X size={12} />
               </button>
             )}
           </div>
           <p className="text-[16px] text-text-muted mt-1 font-sans">
             {filterPatientId ? 'Showing consultations for selected patient.' : 'Consultations are created when an appointment is started.'}
           </p>
        </div>
      </div>

      {/* Filters matching requested design */}
      <div className="flex items-center gap-3 mt-8 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {['Tous', 'En Cours', 'Finalisée', 'Annulée'].map(tab => (
          <button 
            key={tab}
            onClick={() => { setActiveTab(tab); setCurrentPage(1); }} 
            className={`relative px-5 py-2.5 text-[14px] font-medium transition-all rounded-full whitespace-nowrap flex items-center gap-2 ${
               activeTab === tab 
                 ? 'bg-brand-indigo text-white shadow-sm' 
                 : 'bg-white border border-ui-border text-brand-indigo hover:bg-bg-input'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Consultations List */}
      <div className="space-y-4 min-h-[400px]">
         {paginatedConsultations.length === 0 ? (
           <div className="bg-bg-surface rounded-3xl p-16 text-center border border-ui-border border-dashed flex flex-col items-center justify-center">
             <FileText className="w-12 h-12 text-ui-border mb-4" />
             <p className="text-text-muted font-sans">No consultations found matching this criteria.</p>
           </div>
         ) : paginatedConsultations.map((c: any, i: number) => {
            const patient = c.patient_details || patients.find((p: any) => p.id === c.patient);
            
            return (
              <motion.div 
                key={c.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="relative bg-white border border-ui-border rounded-[1.5rem] p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all group overflow-hidden"
              >
                 {/* Status Color Border Left */}
                 <div className={`absolute left-0 top-0 bottom-0 w-[6px] group-hover:w-[8px] transition-all duration-300 ${getStatusColor(c.status)}`}></div>
                 
                 {/* Time & Patient Info */}
                 <div className="flex items-center gap-6 pl-2">
                    <div className="flex flex-col items-center justify-center min-w-[70px]">
                       <span className="text-[20px] font-sans font-medium text-text-primary tracking-tight">
                         {format(new Date(c.created_at || new Date()), 'HH:mm')}
                       </span>
                       <span className="text-[11px] uppercase tracking-widest text-text-muted mt-1 font-mono font-medium">
                         {c.consultation_type === 'VIDEO' ? 'Vidéoconsultation' : 'PRÉSENTIEL'}
                       </span>
                    </div>
                    
                    <div className="w-[1px] h-12 bg-ui-border"></div>

                    <div className="flex flex-col">
                       <div className="flex items-center gap-3">
                          <span 
                            onClick={() => navigate('/doctor/patients', { state: { openPatientId: c.patient } })}
                            className="text-[17px] font-medium text-text-primary font-sans cursor-pointer hover:text-brand-indigo transition-colors"
                          >
                            {patient?.first_name ? `${patient.first_name} ${patient.last_name}` : 'Patient'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider ${getStatusBg(c.status)} ${getStatusText(c.status)}`}>
                            {getStatusLabel(c.status)}
                          </span>
                       </div>
                       {/* Motive / Diagnosis */}
                       <div className="text-[14px] text-text-muted mt-1 font-sans">
                          {c.diagnosis || c.motive || 'Follow-up'}
                       </div>
                    </div>
                 </div>

                 {/* Action Buttons */}
                 <div className="flex items-center">
                    <div className="flex items-center bg-white border border-ui-border rounded-full p-1.5 shadow-sm hover:shadow-md transition-shadow">
                       {c.status === 'IN_PROGRESS' || c.status === 'DRAFT' ? (
                          <>
                            <button onClick={() => setShowDetailsModal(c)} className="p-2 text-text-muted hover:text-brand-indigo transition-colors rounded-full hover:bg-bg-input" title="View Details">
                              <Eye size={18} />
                            </button>
                            <div className="w-[1px] h-5 bg-ui-border mx-1" />
                            <button onClick={() => navigate(`/doctor/active-consultation/${c.id}`)} className="p-2 text-brand-indigo hover:text-white transition-colors rounded-full hover:bg-brand-indigo" title="Resume Consultation">
                              <Loader2 size={18} className="animate-spin" />
                            </button>
                            <div className="w-[1px] h-5 bg-ui-border mx-1" />
                            <button onClick={() => setShowFinalizeModal(c.id)} className="p-2 text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors rounded-full" title="Complete Consultation">
                              <CheckCircle2 size={18} strokeWidth={2} />
                            </button>
                            <div className="w-[1px] h-5 bg-ui-border mx-1" />
                            <button onClick={() => { if(window.confirm('Cancel this consultation?')) cancelMutation.mutate(c.id); }} className="p-2 text-text-muted hover:text-state-error transition-colors rounded-full hover:bg-state-error/10" title="Cancel Consultation">
                              <X size={18} strokeWidth={2} />
                            </button>
                          </>
                       ) : (
                          <>
                            {c.prescription_id && (
                              <>
                                <button onClick={() => prescriptionService.downloadPrescriptionPdf(c.prescription_id)} className="p-2 text-brand-indigo hover:text-white transition-colors rounded-full hover:bg-brand-indigo" title="Download Prescription PDF">
                                  <FileText size={18} />
                                </button>
                                <div className="w-[1px] h-5 bg-ui-border mx-1" />
                              </>
                            )}
                            <button onClick={() => setShowDetailsModal(c)} className="p-2 text-text-muted hover:text-brand-indigo transition-colors rounded-full hover:bg-bg-input" title="View Details">
                              <Eye size={18} />
                            </button>
                          </>
                       )}
                    </div>
                 </div>
              </motion.div>
            )
         })}
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

      {/* New Consultation Modal */}
      {createPortal(
        <AnimatePresence>
          {isNewModalOpen && (
            <div key="new-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-2xl w-full max-w-[500px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="p-6 border-b border-ui-border shrink-0 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo">
                         <Stethoscope size={20} />
                      </div>
                      <h2 className="text-[20px] font-sans text-text-primary">New Consultation</h2>
                    </div>
                    <button onClick={() => setIsNewModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-bg-input flex items-center justify-center text-text-muted transition-colors">
                      <X size={18} />
                    </button>
                 </div>
                 
                 <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="p-6 space-y-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {/* Patient Selection */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase">Select Patient</label>
                      <select 
                        {...register('patient')}
                        className={`w-full bg-bg-input border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none transition-all appearance-none cursor-pointer ${errors.patient ? 'border-state-error' : 'border-ui-border focus:border-brand-indigo/50'}`}
                      >
                        <option value="">Choose a patient...</option>
                        {patients.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.internal_id || p.cin || 'N/A'})</option>
                        ))}
                      </select>
                      {errors.patient && <p className="text-[11px] text-state-error font-mono">{errors.patient.message}</p>}
                    </div>

                    {/* Appointment Selection */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase">Link to Appointment (Optional)</label>
                      <select 
                        {...register('appointment')}
                        disabled={!selectedPatientId}
                        className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Manual Consultation (No link)</option>
                        {filteredAppointments.map((a: any) => (
                          <option key={a.id} value={a.id}>{format(new Date(a.start_time), 'HH:mm')} - {a.reason}</option>
                        ))}
                      </select>
                    </div>

                    {/* Consultation Type */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase">Consultation Type</label>
                      <div className="grid grid-cols-2 gap-3">
                         <button 
                          type="button"
                          onClick={() => setValue('consultation_type', 'IN_PERSON')}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${watch('consultation_type') === 'IN_PERSON' ? 'bg-brand-indigo/10 border-brand-indigo text-brand-indigo' : 'bg-bg-input border-ui-border text-text-muted hover:border-ui-border/80'}`}
                         >
                           <User size={16} /> <span className="text-[13px] font-medium">In Person</span>
                         </button>
                         <button 
                          type="button"
                          onClick={() => setValue('consultation_type', 'VIDEO')}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${watch('consultation_type') === 'VIDEO' ? 'bg-[#06B6D4]/10 border-[#06B6D4] text-[#06B6D4]' : 'bg-bg-input border-ui-border text-text-muted hover:border-ui-border/80'}`}
                         >
                           <Video size={16} /> <span className="text-[13px] font-medium">Video Call</span>
                         </button>
                      </div>
                    </div>

                    {/* Motive */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase">Motive / Reason (Optional)</label>
                      <input 
                        {...register('motive')}
                        placeholder="e.g. Follow-up, Routine Check..."
                        className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all"
                      />
                    </div>
                 </form>
                 <div className="p-6 border-t border-ui-border shrink-0 flex items-center justify-end gap-3 bg-bg-elevated rounded-b-2xl">
                   <button type="button" onClick={() => setIsNewModalOpen(false)} className="px-5 py-2.5 rounded-xl text-text-muted hover:bg-bg-input text-[13px] font-medium transition-colors">Cancel</button>
                   <button 
                     onClick={handleSubmit((data) => createMutation.mutate(data))}
                     disabled={createMutation.isPending}
                     className="px-6 py-2.5 bg-brand-indigo text-white rounded-xl text-[13px] font-medium shadow-md hover:bg-[#7C75FF] transition-all disabled:opacity-50 flex items-center gap-2"
                   >
                     {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                     Create Consultation
                   </button>
                 </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Edit Consultation Modal */}
      {createPortal(
        <AnimatePresence>
          {showEditModal && (
            <div key="edit-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-2xl w-full max-w-[500px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
                 <div className="p-6 border-b border-ui-border shrink-0 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo">
                         <Edit2 size={20} />
                      </div>
                      <h2 className="text-[20px] font-sans text-text-primary">Edit Consultation</h2>
                    </div>
                    <button onClick={() => setShowEditModal(null)} className="w-8 h-8 rounded-full hover:bg-bg-input flex items-center justify-center text-text-muted transition-colors">
                      <X size={18} />
                    </button>
                 </div>
                 
                 <form onSubmit={handleSubmitEdit((data) => editMutation.mutate(data))} className="p-6 space-y-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {/* Patient Selection */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase">Select Patient</label>
                      <select 
                        {...registerEdit('patient')}
                        className={`w-full bg-bg-input border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none transition-all appearance-none cursor-pointer ${editErrors.patient ? 'border-state-error' : 'border-ui-border focus:border-brand-indigo/50'}`}
                      >
                        <option value="">Choose a patient...</option>
                        {patients.map((p: any) => (
                          <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.internal_id || p.cin || 'N/A'})</option>
                        ))}
                      </select>
                      {editErrors.patient && <p className="text-[11px] text-state-error font-mono">{editErrors.patient.message}</p>}
                    </div>

                    {/* Appointment Selection */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase">Link to Appointment (Optional)</label>
                      <select 
                        {...registerEdit('appointment')}
                        className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Manual Consultation (No link)</option>
                        {appointments.filter((a:any) => a.patient === watchEdit('patient')).map((a: any) => (
                          <option key={a.id} value={a.id}>{format(new Date(a.start_time), 'HH:mm')} - {a.reason}</option>
                        ))}
                      </select>
                    </div>

                    {/* Consultation Type */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase">Consultation Type</label>
                      <div className="grid grid-cols-2 gap-3">
                         <button 
                          type="button"
                          onClick={() => setValueEdit('consultation_type', 'IN_PERSON')}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${watchEdit('consultation_type') === 'IN_PERSON' ? 'bg-brand-indigo/10 border-brand-indigo text-brand-indigo' : 'bg-bg-input border-ui-border text-text-muted hover:border-ui-border/80'}`}
                         >
                           <User size={16} /> <span className="text-[13px] font-medium">In Person</span>
                         </button>
                         <button 
                          type="button"
                          onClick={() => setValueEdit('consultation_type', 'VIDEO')}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${watchEdit('consultation_type') === 'VIDEO' ? 'bg-[#06B6D4]/10 border-[#06B6D4] text-[#06B6D4]' : 'bg-bg-input border-ui-border text-text-muted hover:border-ui-border/80'}`}
                         >
                           <Video size={16} /> <span className="text-[13px] font-medium">Video Call</span>
                         </button>
                      </div>
                    </div>

                    {/* Motive */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase">Motive / Reason (Optional)</label>
                      <input 
                        {...registerEdit('motive')}
                        placeholder="e.g. Follow-up, Routine Check..."
                        className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all"
                      />
                    </div>
                 </form>
                 <div className="p-6 border-t border-ui-border shrink-0 flex items-center justify-end gap-3 bg-bg-elevated rounded-b-2xl">
                   <button type="button" onClick={() => setShowEditModal(null)} className="px-5 py-2.5 rounded-xl text-text-muted hover:bg-bg-input text-[13px] font-medium transition-colors">Cancel</button>
                   <button 
                     onClick={handleSubmitEdit((data) => editMutation.mutate(data))}
                     disabled={editMutation.isPending}
                     className="px-6 py-2.5 bg-brand-indigo text-white rounded-xl text-[13px] font-medium shadow-md hover:bg-[#7C75FF] transition-all disabled:opacity-50 flex items-center gap-2"
                   >
                     {editMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                     Save Changes
                   </button>
                 </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* View Details Modal */}
      {createPortal(
        <AnimatePresence>
           {showDetailsModal && (
              <div key="details-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDetailsModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-3xl w-full max-w-[800px] shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden">
                   
                   <div className="px-8 py-6 border-b border-ui-border shrink-0 flex items-center justify-between">
                      <h2 className="text-[22px] font-sans font-medium text-text-primary flex items-center gap-2">
                         <Stethoscope size={20} className="text-brand-indigo" /> Consultation Details
                      </h2>
                      <div className="flex items-center gap-4">
                         <span className={`px-3 py-1 rounded-full text-[11px] uppercase font-mono font-bold tracking-wider ${getStatusBg(showDetailsModal.status)} ${getStatusText(showDetailsModal.status)}`}>
                            {getStatusLabel(showDetailsModal.status)}
                         </span>
                         <button type="button" onClick={() => setShowDetailsModal(null)} className="w-10 h-10 rounded-full hover:bg-bg-input flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"><X size={20}/></button>
                      </div>
                   </div>
                   
                   <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                      {/* Patient, Appt & Prescriptions */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="flex-1">
                            <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Patient</label>
                            <div onClick={() => navigate('/doctor/patients', { state: { openPatientId: showDetailsModal.patient } })} className="flex items-center justify-between p-4 bg-bg-surface border border-ui-border rounded-2xl group hover:border-brand-indigo/30 transition-colors cursor-pointer h-[76px]">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-lavender p-[2px]">
                                     <div className="w-full h-full rounded-full border-2 border-bg-surface bg-bg-elevated flex items-center justify-center text-[12px] font-bold text-text-primary">
                                        {(showDetailsModal.patient_details?.first_name || 'P')[0]}{(showDetailsModal.patient_details?.last_name || '')[0] || ''}
                                     </div>
                                  </div>
                                  <div>
                                     <div className="text-[15px] font-medium text-text-primary group-hover:text-brand-indigo transition-colors truncate max-w-[100px]">
                                        {showDetailsModal.patient_details?.first_name ? `${showDetailsModal.patient_details.first_name} ${showDetailsModal.patient_details.last_name}` : 'Patient'}
                                     </div>
                                     <div className="text-[12px] text-text-muted font-mono mt-0.5">CIN: {showDetailsModal.patient_details?.cin || '---'}</div>
                                  </div>
                               </div>
                               <ChevronRight size={16} className="text-ui-border group-hover:text-brand-indigo transition-colors shrink-0" />
                            </div>
                         </div>
                         <div className="flex-1">
                            <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Appointment</label>
                            <div className="flex items-center gap-3 p-4 bg-bg-surface border border-ui-border rounded-2xl h-[76px]">
                               <CalendarIcon size={20} className="text-brand-indigo" />
                               <div className="text-[15px] font-medium text-text-primary">{format(new Date(showDetailsModal.created_at || new Date()), 'dd MMM yyyy')}</div>
                            </div>
                         </div>
                         <div className="flex-1">
                            <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Prescriptions</label>
                            <div onClick={() => navigate('/doctor/prescriptions', { state: { patientId: showDetailsModal.patient, patientName: showDetailsModal.patient_name || showDetailsModal.patient_details?.get_full_name } })} className="flex items-center justify-between p-4 bg-bg-surface border border-ui-border rounded-2xl h-[76px] group hover:border-[#06B6D4]/30 transition-colors cursor-pointer">
                               <div className="flex items-center gap-3">
                                  <FileText size={20} className="text-[#06B6D4]" />
                                  <div>
                                     <div className="text-[14px] font-medium text-text-primary group-hover:text-[#06B6D4] transition-colors truncate">View Prescriptions</div>
                                     <div className="text-[11px] text-text-muted font-mono mt-0.5">{showDetailsModal.patient_name || 'Patient prescriptions'}</div>
                                  </div>
                               </div>
                               <ChevronRight size={16} className="text-ui-border group-hover:text-[#06B6D4] transition-colors shrink-0" />
                            </div>
                         </div>
                      </div>

                      {/* Video / Type Bar */}
                      <div className="flex flex-col gap-4">
                        <div className="text-[13px] text-text-muted flex items-center gap-3">
                          <span>Consultation Type:</span>
                          <TypeBadge type={showDetailsModal.consultation_type} />
                        </div>
                        
                        {showDetailsModal.consultation_type === 'VIDEO' && (
                          <div className="p-4 bg-bg-surface border border-ui-border rounded-2xl">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                 <Video size={20} className="text-[#06B6D4]" />
                                 <div className="flex flex-col">
                                   <span className="text-[15px] font-medium text-text-primary">Video Session</span>
                                   <span className="text-[13px] font-mono text-[#06B6D4] flex items-center gap-1.5 mt-0.5">
                                     {showDetailsModal.video_session_active ? (
                                       <><span className="w-1.5 h-1.5 bg-[#06B6D4] rounded-full animate-pulse" /> LIVE — <LiveVideoTimer startTime={new Date(showDetailsModal.video_started_at!).getTime()} /></>
                                     ) : (
                                       <span className="text-text-muted">{showDetailsModal.video_duration ? `Ended — ${Math.floor(showDetailsModal.video_duration/60)}m ${showDetailsModal.video_duration%60}s` : 'Not started'}</span>
                                     )}
                                   </span>
                                 </div>
                              </div>
                              {showDetailsModal.video_session_active ? (
                                <button 
                                  disabled={endVideoMutation.isPending}
                                  onClick={() => setShowEndCallModal(showDetailsModal.id)} 
                                  className="px-5 py-2.5 bg-state-error/10 hover:bg-state-error text-state-error hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2"
                                >
                                  {endVideoMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <PhoneOff size={16} />} 
                                  End Call
                                </button>
                              ) : showDetailsModal.status !== 'FINALIZED' && showDetailsModal.status !== 'CANCELLED' ? (
                                <button 
                                  disabled={startVideoMutation.isPending}
                                  onClick={() => startVideoMutation.mutate(showDetailsModal.id)} 
                                  className="px-5 py-2.5 bg-[#06B6D4]/10 hover:bg-[#06B6D4] text-[#06B6D4] hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2"
                                >
                                  {startVideoMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />} 
                                  Start Video
                                </button>
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Vitals */}
                      <div>
                         <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-3 block">Vital Signs</label>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              { label: 'Heart Rate', key: 'heart_rate', unit: 'bpm' },
                              { label: 'Temperature', key: 'temperature', unit: '°C' },
                              { label: 'Blood Pressure', key: 'blood_pressure', unit: 'mmHg' },
                              { label: 'Weight', key: 'weight', unit: 'kg' }
                            ].map((vital) => {
                               const val = showDetailsModal.clinical_exam?.[vital.key] || '';
                               const isReadonly = showDetailsModal.status === 'CANCELLED';
                               return (
                                 <div key={vital.key} className="relative">
                                    <input 
                                      type="text" 
                                      readOnly={isReadonly} 
                                      defaultValue={val} 
                                      onBlur={(e) => updateStatusMutation.mutate({ 
                                         id: showDetailsModal.id, 
                                         data: { clinical_exam: { ...(showDetailsModal.clinical_exam || {}), [vital.key]: e.target.value } } 
                                      })}
                                      className="w-full bg-bg-input border border-ui-border rounded-xl px-4 pt-6 pb-2 text-[14px] font-mono text-text-primary focus:outline-none focus:border-brand-indigo/50 focus:ring-1 focus:ring-brand-indigo/50 transition-all peer" 
                                      placeholder=" " 
                                    />
                                    <span className="absolute left-4 top-2 text-[10px] text-text-muted uppercase tracking-wider">{vital.label} ({vital.unit})</span>
                                 </div>
                               )
                            })}
                         </div>
                      </div>

                      {/* AI Assistant - ONLY for IN_PROGRESS */}
                      {showDetailsModal.status === 'IN_PROGRESS' && (
                         <AIDiagnosticAssistant 
                           isReadonly={false}
                           aiUsed={showDetailsModal.ai_used}
                           patient={showDetailsModal.patient_details || patients.find((p: any) => p.id === showDetailsModal.patient)}
                           consultationId={showDetailsModal.id}
                           initialSymptoms={showDetailsModal.symptoms || []}
                           initialPredictions={showDetailsModal.ai_suggestions || []}
                           onApplyDiagnosis={(text) => {
                              const el = document.getElementById(`diagnosis-${showDetailsModal.id}`) as HTMLTextAreaElement;
                              if (el) {
                                 const newVal = el.value ? `${el.value}\n${text}` : text;
                                 el.value = newVal;
                                 updateStatusMutation.mutate({ id: showDetailsModal.id, data: { diagnosis: newVal } });
                                 
                                 el.style.borderColor = '#6C6BFF';
                                 el.style.boxShadow = '0 0 0 2px rgba(108, 107, 255, 0.3)';
                                 setTimeout(() => {
                                    el.style.borderColor = '';
                                    el.style.boxShadow = '';
                                 }, 600);
                              }
                           }}
                           onAIUsed={() => {}}
                         />
                      )}

                      {/* Diagnosis */}
                      <div>
                         <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-3 block">Diagnosis</label>
                         <textarea 
                           readOnly={showDetailsModal.status === 'CANCELLED'}
                           id={`diagnosis-${showDetailsModal.id}`}
                           defaultValue={showDetailsModal.diagnosis}
                           onBlur={(e) => updateStatusMutation.mutate({ id: showDetailsModal.id, data: { diagnosis: e.target.value } })}
                           className="diagnosis-field w-full bg-bg-input border border-ui-border rounded-xl p-4 min-h-[100px] text-[14px] font-sans text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all resize-y" 
                         />
                      </div>

                      {/* Clinical Notes */}
                      <div>
                         <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-3 block">Clinical Notes (Optional)</label>
                         <textarea 
                           readOnly={showDetailsModal.status === 'CANCELLED'}
                           defaultValue={showDetailsModal.clinical_notes}
                           onBlur={(e) => updateStatusMutation.mutate({ id: showDetailsModal.id, data: { clinical_notes: e.target.value } })}
                           placeholder="Additional observations, follow-up instructions..."
                           className="w-full bg-bg-input border border-ui-border rounded-xl p-4 min-h-[100px] text-[14px] font-sans text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all resize-y" 
                         />
                      </div>
                   </div>

                   {/* Footer Actions */}
                   <div className="px-8 py-6 border-t border-ui-border shrink-0 bg-bg-elevated rounded-b-3xl flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap gap-3">
                         {/* Issue / Download Prescription */}
                         {showDetailsModal.prescription_id ? (
                           <button 
                             onClick={async () => {
                               try {
                                 await prescriptionService.downloadPrescriptionPdf(showDetailsModal.prescription_id);
                               } catch (err) {
                                 console.error("Failed to download PDF", err);
                               }
                             }}
                             className="px-5 py-2.5 bg-brand-indigo/10 hover:bg-brand-indigo text-brand-indigo hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 group"
                           >
                             <FileText size={16} className="text-brand-indigo group-hover:text-white transition-colors" />
                             <span>Download Prescription PDF</span>
                           </button>
                         ) : (
                           <button 
                             onClick={() => {
                               navigate('/doctor/prescriptions');
                             }}
                             className="px-5 py-2.5 bg-brand-indigo/5 hover:bg-brand-indigo text-brand-indigo hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 group"
                           >
                             <FileText size={16} className="text-brand-indigo group-hover:text-white transition-colors" />
                             <span>Issue Prescription</span>
                           </button>
                         )}

                         {/* Status Buttons */}
                         {showDetailsModal.status !== 'FINALIZED' && showDetailsModal.status !== 'CANCELLED' && (
                           <>
                             {/* Removed Save Draft */}
                             {showDetailsModal.status !== 'IN_PROGRESS' && (
                               <button onClick={() => updateStatusMutation.mutate({ id: showDetailsModal.id, data: { status: 'IN_PROGRESS' } })} className="px-5 py-2.5 border border-brand-indigo/30 hover:bg-brand-indigo/10 text-brand-indigo rounded-xl text-[13px] font-medium transition-colors flex items-center gap-2">
                                  <Play size={16} fill="currentColor" /> <span>Mark In Progress</span>
                               </button>
                             )}
                           </>
                         )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                         {showDetailsModal.status !== 'FINALIZED' && showDetailsModal.status !== 'CANCELLED' && (
                           <button onClick={() => setShowFinalizeModal(showDetailsModal.id)} className="px-6 py-2.5 bg-[#22C55E] hover:bg-[#1ea34d] text-white rounded-xl text-[13px] font-medium transition-colors shadow-[0_4px_12px_rgba(34,197,94,0.25)] flex items-center gap-2">
                              <Check size={16} /> Finalize
                           </button>
                         )}
                      </div>
                   </div>
                  </motion.div>
              </div>
           )}
        </AnimatePresence>,
        document.body
      )}

      {/* Finalize Modal */}
      {createPortal(
        <AnimatePresence>
           {showFinalizeModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFinalizeModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-2xl p-6 w-full max-w-[400px] shadow-2xl relative z-10">
                   <div className="w-12 h-12 bg-state-warning/10 rounded-full flex items-center justify-center mb-4">
                      <AlertTriangle className="text-state-warning w-6 h-6" />
                   </div>
                   <h2 className="text-[20px] font-sans text-text-primary mb-2">Finalize this consultation?</h2>
                   <p className="text-[14px] text-text-muted mb-6">
                      <AlertTriangle size={14} className="inline mr-1" /> Once finalized, this consultation cannot be edited. The patient will be able to view it in their portal.
                   </p>
                   <div className="flex items-center justify-end gap-3">
                      <button onClick={() => setShowFinalizeModal(null)} className="px-5 py-2.5 rounded-xl text-text-muted hover:bg-bg-input text-[13px] font-medium transition-colors">Cancel</button>
                      <button 
                        disabled={finalizeMutation.isPending}
                        onClick={() => finalizeMutation.mutate(showFinalizeModal)} 
                        className="px-5 py-2.5 border border-[#22C55E]/30 text-[#22C55E] rounded-xl text-[13px] font-medium transition-all duration-500 flex items-center gap-2 whitespace-nowrap disabled:opacity-50 relative overflow-hidden group hover:scale-[1.03] hover:shadow-[0_4px_12px_rgba(34,197,94,0.2)]"
                        style={{ transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
                      >
                        <div className="absolute inset-0 bg-[#22C55E] translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] z-0" />
                        {finalizeMutation.isPending ? <Loader2 size={16} className="relative z-10 group-hover:text-white transition-colors duration-300 animate-spin" /> : <CheckCircle2 size={16} className="relative z-10 group-hover:text-white transition-colors duration-300" />}
                        <span className="relative z-10 group-hover:text-white transition-colors duration-300">Yes, Finalize</span>
                      </button>
                   </div>
                 </motion.div>
              </div>
           )}
        </AnimatePresence>,
        document.body
      )}

      {/* End Call Modal */}
      {createPortal(
        <AnimatePresence>
           {showEndCallModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEndCallModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                 <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-2xl p-6 w-full max-w-[400px] shadow-2xl relative z-10">
                   <div className="w-12 h-12 bg-state-error/10 rounded-full flex items-center justify-center mb-4 text-state-error">
                      <Video className="w-6 h-6" />
                   </div>
                   <h2 className="text-[20px] font-sans text-text-primary mb-2">End video call?</h2>
                   <p className="text-[14px] text-text-muted mb-6">
                      This will end the active video session for both you and the patient. You can continue writing the consultation notes afterwards.
                   </p>
                   <div className="flex items-center justify-end gap-3">
                      <button onClick={() => setShowEndCallModal(null)} className="px-5 py-2.5 rounded-xl text-text-muted hover:bg-bg-input text-[13px] font-medium transition-colors">Cancel</button>
                      <button 
                        disabled={endVideoMutation.isPending}
                        onClick={() => endVideoMutation.mutate(showEndCallModal)} 
                        className="px-5 py-2.5 rounded-xl bg-state-error hover:bg-state-error/80 text-white text-[13px] font-medium transition-colors shadow-sm disabled:opacity-50"
                      >
                        {endVideoMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Yes, End Call'}
                      </button>
                   </div>
                 </motion.div>
              </div>
           )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
