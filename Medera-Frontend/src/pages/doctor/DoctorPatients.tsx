import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, FileText, Stethoscope, Ban, X, Users, Loader2, AlertCircle, CalendarPlus, Pencil, Calendar as CalendarIcon, Clock, Video, User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as patientService from '../../services/patientService';
import * as appointmentService from '../../services/appointmentService';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../components/Toast';
import { format, addDays } from 'date-fns';

export default function DoctorPatients() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Active');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New Appointment Form State
  const [aptDate, setAptDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [aptTime, setAptTime] = useState('09:00');
  const [aptDuration, setAptDuration] = useState(30);
  const [aptType, setAptType] = useState<'IN_PERSON' | 'VIDEO'>('IN_PERSON');
  const [aptMotive, setAptMotive] = useState('');

  // Edit Patient Form State (controlled)
  const [editForm, setEditForm] = useState<any>({});

  // Fetch patients from real backend
  const { data: patientsData, isLoading, isError, isFetching } = useQuery({
    queryKey: ['doctor-patients', filter],
    queryFn: () => patientService.getPatients({
      is_archived: filter === 'Archived' ? true : filter === 'Active' ? false : undefined,
    }),
  });
  const patients = Array.isArray(patientsData) ? patientsData : (patientsData?.results || []);

  // Mutations
  const addPatientMutation = useMutation({
    mutationFn: (data: any) => patientService.createPatient(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-patients'] });
      setIsAddPatientOpen(false);
      if (data?.warning) {
         addToast(data.warning, 'error');
      } else {
         addToast('Patient created successfully', 'success');
      }
    },
    onError: () => {
      addToast('Failed to create patient', 'error');
    }
  });

  const updatePatientMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => patientService.updatePatient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-patients'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-patient', selectedPatientId] });
      setIsEditPatientOpen(false);
      addToast('Patient information updated', 'success');
    },
    onError: () => {
      addToast('Failed to update patient', 'error');
    }
  });

  const { data: currentDoctorData } = useQuery({
    queryKey: ['current-doctor'],
    queryFn: () => import('../../services/api').then(m => m.default.get('/api/auth/me/').then(r => r.data)),
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data: any) => appointmentService.createAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      setIsNewAppointmentOpen(false);
      setAptMotive('');
      setAptDate(format(new Date(), 'yyyy-MM-dd'));
      setAptTime('09:00');
      setAptDuration(30);
      setAptType('IN_PERSON');
      addToast('Appointment created successfully', 'success');
    },
    onError: (err: any) => {
      addToast(err?.response?.data?.detail || 'Failed to create appointment', 'error');
    }
  });

  const { data: selectedPatient, isLoading: isLoadingPatient } = useQuery({
    queryKey: ['doctor-patient', selectedPatientId],
    queryFn: () => patientService.getPatient(selectedPatientId!),
    enabled: !!selectedPatientId,
  });

  const { data: patientTimeline } = useQuery({
    queryKey: ['doctor-patient-timeline', selectedPatientId],
    queryFn: () => patientService.getPatientTimeline(selectedPatientId!),
    enabled: !!selectedPatientId,
  });

  // Fetch appointments to verify slot availability
  const { data: appointmentsData } = useQuery({
    queryKey: ['doctor-appointments'],
    queryFn: () => appointmentService.getAppointments(),
    enabled: isNewAppointmentOpen,
  });
  const appointments = Array.isArray(appointmentsData) ? appointmentsData : (appointmentsData?.results || []);

  const generateSlots = () => {
    const slots = [];
    for (let i = 8; i <= 18; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
      if (i !== 18) slots.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const getSlotStatus = (time: string) => {
    if (!aptDate) return 'unavailable';
    const taken = appointments.find((a: any) => {
      if (a.status === 'CANCELLED' || a.status === 'REJECTED') return false;
      const parts = a.start_datetime.split('T');
      const aDate = parts[0];
      const aTime = parts[1] ? parts[1].substring(0, 5) : '';
      return aDate === aptDate && aTime === time;
    });
    if (taken) return 'unavailable';
    if (aptTime === time) return 'selected';
    return 'available';
  };

  const archivePatientMutation = useMutation({
    mutationFn: (id: string) => patientService.archivePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-patients'] });
      if (selectedPatientId === archivePatientMutation.variables) {
        setSelectedPatientId(null);
      }
      addToast('Patient archived', 'success');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.detail || 'Failed to archive patient', 'error');
    }
  });

  const unarchivePatientMutation = useMutation({
    mutationFn: (id: string) => patientService.restorePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-patients'] });
      if (selectedPatientId === unarchivePatientMutation.variables) {
        setSelectedPatientId(null);
      }
      addToast('Patient restored', 'success');
    },
    onError: () => {
      addToast('Failed to restore patient', 'error');
    }
  });

  // Pre-fill edit form when patient loads
  useEffect(() => {
    if (selectedPatient && isEditPatientOpen) {
      setEditForm({
        first_name: selectedPatient.first_name || '',
        last_name: selectedPatient.last_name || '',
        phone: selectedPatient.phone || '',
        birth_date: selectedPatient.birth_date || '',
        gender: selectedPatient.gender || 'M',
        blood_type: selectedPatient.blood_type || selectedPatient.blood_group || '',
        insurance: selectedPatient.insurance || '',
        allergies: Array.isArray(selectedPatient.allergies) ? selectedPatient.allergies.join(', ') : (selectedPatient.allergies || ''),
        medical_history: selectedPatient.medical_history || '',
      });
    }
  }, [selectedPatient, isEditPatientOpen]);

  // Filtering is now handled server-side; minimal client-side filter for immediate search UX
  const filteredPatients = search
    ? patients.filter((p: any) => {
        const terms = search.toLowerCase().trim().split(/\s+/);
        const searchString = `${p.first_name || ''} ${p.last_name || ''} ${p.internal_id || ''} ${p.phone || ''}`.toLowerCase();
        return terms.every(term => searchString.includes(term));
      })
    : patients;

  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const paginatedPatients = filteredPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('Are you sure you want to archive this patient?')) {
      archivePatientMutation.mutate(id);
    }
  };

  const handleUnarchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(window.confirm('Are you sure you want to restore this patient?')) {
      unarchivePatientMutation.mutate(id);
    }
  };

  const handleCreateAppointment = () => {
    if (!selectedPatientId || !currentDoctorData?.id) {
      addToast('Doctor information not available', 'error');
      return;
    }
    const startISO = `${aptDate}T${aptTime}:00`;
    const endDate = new Date(`${aptDate}T${aptTime}:00`);
    endDate.setMinutes(endDate.getMinutes() + aptDuration);
    const endISO = endDate.toISOString().slice(0, 19);
    createAppointmentMutation.mutate({
      patient: selectedPatientId,
      doctor: currentDoctorData.id,
      start_datetime: startISO,
      end_datetime: endISO,
      consultation_type: aptType,
      motive: aptMotive || 'Consultation',
    });
  };

  const handleUpdatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    const payload = {
      ...editForm,
      allergies: editForm.allergies ? editForm.allergies.split(',').map((a: string) => a.trim()).filter(Boolean) : [],
    };
    updatePatientMutation.mutate({ id: selectedPatientId, data: payload });
  };

  if (isLoading && !patientsData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-brand-indigo animate-spin mb-4" />
        <p className="text-text-muted font-serif italic text-lg">Loading your patients...</p>
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
        <p className="text-text-muted max-w-md mx-auto mb-6">We couldn't load your patients. Please check your connection and try again.</p>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['doctor-patients'] })} className="px-6 py-2 bg-brand-indigo text-white rounded-xl font-medium transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-brand-indigo/20">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-600 pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div className="shrink-0">
           <h1 className="text-[40px] font-serif italic text-text-primary leading-tight whitespace-nowrap">My Patients</h1>
           <p className="text-[16px] text-text-muted mt-1 font-sans whitespace-nowrap">Your registered patient roster.</p>
        </div>
        <div className="flex flex-col md:flex-row flex-wrap items-center gap-4 justify-start lg:justify-end">
           {/* Search & Filters */}
           <div className="relative group w-full md:w-auto">
             <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
             <input type="text" placeholder="Search by name, CIN, phone..." value={search} onChange={e=>setSearch(e.target.value)} className="pl-10 pr-4 py-2.5 bg-bg-surface border border-ui-border rounded-full text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 focus:ring-1 focus:ring-brand-indigo/50 w-full md:w-[260px] transition-all" />
           </div>
           
           <div className="flex glass-island border border-ui-border p-1 rounded-full w-fit">
              {['All', 'Active', 'Archived'].map(tab => (
                  <button key={tab} onClick={() => setFilter(tab)} className="relative px-5 py-2 rounded-full text-[13px] font-medium transition-colors z-10 min-w-[80px]">
                    {filter === tab && (
                        <motion.div layoutId="ptab" className="absolute inset-0 bg-brand-indigo/15 rounded-full z-[-1]" />
                    )}
                    <span className={filter === tab ? 'text-brand-indigo dark:text-text-primary' : 'text-text-muted hover:text-text-primary'}>{tab}</span>
                  </button>
              ))}
           </div>

           <button onClick={() => setIsAddPatientOpen(true)} className="flex items-center justify-center gap-2 w-full md:w-auto shrink-0 md:px-5 md:py-2.5 bg-brand-indigo hover:bg-[#7C75FF] text-white rounded-full shadow-[0_4px_12px_rgba(99,91,255,0.3)] transition-colors relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
             <Plus size={18} />
             <span className="font-medium text-[14px] whitespace-nowrap">Add Patient</span>
           </button>
        </div>
      </div>

      {/* Patients Table */}
      <div className="glass-island border border-ui-border rounded-3xl overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
           <thead>
             <tr className="border-b border-ui-border bg-bg-surface/50">
               <th className="px-6 py-4 text-[11px] font-mono tracking-widest text-text-muted uppercase">Patient</th>
               <th className="px-6 py-4 text-[11px] font-mono tracking-widest text-text-muted uppercase">Age &amp; Gender</th>
               <th className="px-6 py-4 text-[11px] font-mono tracking-widest text-text-muted uppercase">Blood Group</th>
               <th className="px-6 py-4 text-[11px] font-mono tracking-widest text-text-muted uppercase">Insurance</th>
               <th className="px-6 py-4 text-[11px] font-mono tracking-widest text-text-muted uppercase">Last Visit</th>
               <th className="px-6 py-4 text-[11px] font-mono tracking-widest text-text-muted uppercase text-right">Actions</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-ui-border/50">
             {paginatedPatients.map((p: any, i: number) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={p.id} 
                  onClick={() => setSelectedPatientId(p.id)}
                  className="group hover:bg-bg-input/50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-lavender p-[1px] shrink-0">
                          <div className="w-full h-full rounded-full border border-bg-surface bg-bg-elevated flex items-center justify-center text-[11px] font-bold text-text-primary">
                            {(p.first_name?.[0] || '') + (p.last_name?.[0] || '')}
                          </div>
                       </div>
                       <div>
                           <div className="text-[14px] font-medium text-text-primary">{p.first_name} {p.last_name}</div>
                           <div className="text-[11px] text-text-muted font-mono">{p.internal_id}</div>
                       </div>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-text-muted">
                    {p.birth_date ? Math.floor((Date.now() - new Date(p.birth_date).getTime()) / 31557600000) : 'N/A'} yrs · {p.gender === 'M' ? 'Masculin' : p.gender === 'F' ? 'Féminin' : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[12px] font-mono font-bold bg-[#EF44441A] text-[#EF4444]">
                       {p.blood_type || p.blood_group || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {p.insurance ? (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-mono uppercase bg-brand-lavender/15 text-brand-lavender font-bold">
                        {p.insurance}
                      </span>
                    ) : (
                      <span className="text-[13px] text-text-muted">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[12px] font-mono text-text-muted">
                     {p.last_visit ? new Date(p.last_visit).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* New Appointment */}
                        <button
                          className="w-8 h-8 rounded-full bg-bg-surface border border-ui-border flex items-center justify-center text-text-muted hover:text-brand-indigo hover:border-brand-indigo/30 transition-colors"
                          title="New Appointment"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPatientId(p.id);
                            setIsNewAppointmentOpen(true);
                          }}
                        >
                           <CalendarPlus size={14} />
                        </button>
                        {/* View Consultations */}
                        <button
                          className="w-8 h-8 rounded-full bg-bg-surface border border-ui-border flex items-center justify-center text-text-muted hover:text-brand-indigo hover:border-brand-indigo/30 transition-colors"
                          title="View Consultations"
                          onClick={(e) => { e.stopPropagation(); navigate(`/doctor/consultations?patient=${p.id}`); }}
                        >
                           <Stethoscope size={14} />
                        </button>
                        {!p.is_archived ? (
                          <button 
                            disabled={archivePatientMutation.isPending}
                            className="w-8 h-8 rounded-full bg-bg-surface border border-ui-border flex items-center justify-center text-text-muted hover:text-state-error hover:border-state-error/30 transition-colors disabled:opacity-50" title="Archive" onClick={(e) => handleArchive(p.id, e)}
                          >
                             {archivePatientMutation.isPending && archivePatientMutation.variables === p.id ? <Loader2 size={12} className="animate-spin" /> : <Ban size={14} />}
                          </button>
                        ) : (
                          <button 
                            disabled={unarchivePatientMutation.isPending}
                            className="w-8 h-8 rounded-full bg-bg-surface border border-ui-border flex items-center justify-center text-text-muted hover:text-brand-indigo hover:border-brand-indigo/30 transition-colors disabled:opacity-50" title="Restore" onClick={(e) => handleUnarchive(p.id, e)}
                          >
                             {unarchivePatientMutation.isPending && unarchivePatientMutation.variables === p.id ? <Loader2 size={12} className="animate-spin" /> : <Loader2 size={14} className="rotate-180" />}
                          </button>
                        )}
                     </div>
                  </td>
                </motion.tr>
             ))}
           </tbody>
        </table>
        {paginatedPatients.length === 0 && (
          <div className="p-12 text-center text-text-muted flex flex-col items-center">
            <Users size={32} className="mb-4 opacity-30" />
            <p>No patients found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
           <span className="text-sm text-text-muted">
             Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPatients.length)} of {filteredPatients.length} patients
           </span>
           <div className="flex items-center gap-2">
             <button 
               onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
               disabled={currentPage === 1}
               className="p-2 rounded-lg border border-ui-border text-text-muted hover:text-text-primary hover:bg-bg-surface disabled:opacity-50 transition-colors"
             >
               Previous
             </button>
             {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
               <button
                 key={page}
                 onClick={() => setCurrentPage(page)}
                 className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                   currentPage === page 
                     ? 'bg-brand-indigo text-white' 
                     : 'border border-ui-border text-text-muted hover:text-text-primary hover:bg-bg-surface'
                 }`}
               >
                 {page}
               </button>
             ))}
             <button 
               onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
               disabled={currentPage === totalPages}
               className="p-2 rounded-lg border border-ui-border text-text-muted hover:text-text-primary hover:bg-bg-surface disabled:opacity-50 transition-colors"
             >
               Next
             </button>
           </div>
        </div>
      )}

      {/* Patient Detail Slide-Over */}
      <AnimatePresence>
         {selectedPatientId && !isNewAppointmentOpen && !isEditPatientOpen && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedPatientId(null)}
               className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
             >
               <motion.div 
                 initial={{ x: '100%' }}
                 animate={{ x: 0 }}
                 exit={{ x: '100%' }}
                 transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                 onClick={(e) => e.stopPropagation()}
                 className="absolute top-0 right-0 h-full w-full max-w-[420px] bg-bg-canvas border-l border-ui-border shadow-2xl z-50 flex flex-col"
               >
                  <div className="p-4 border-b border-ui-border bg-bg-canvas/80 backdrop-blur-md flex justify-end shrink-0">
                    <button className="w-8 h-8 rounded-full hover:bg-bg-input flex items-center justify-center transition-colors text-text-muted" onClick={() => setSelectedPatientId(null)}>
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto hide-scrollbar p-8">
                     {isLoadingPatient || !selectedPatient ? (
                        <div className="flex flex-col items-center justify-center h-full">
                          <Loader2 className="w-8 h-8 text-brand-indigo animate-spin mb-4" />
                          <p className="text-text-muted text-[13px]">Loading patient details...</p>
                        </div>
                     ) : (
                       <>
                         {/* Header */}
                         <div className="flex flex-col items-center mb-10">
                        <div className="relative w-[72px] h-[72px] rounded-full bg-gradient-to-tr from-brand-indigo to-brand-lavender p-[2px] mb-4">
                           <div className="w-full h-full rounded-full border-2 border-bg-canvas bg-bg-elevated flex items-center justify-center text-[22px] font-bold text-text-primary">
                             {(selectedPatient.first_name?.[0] || '') + (selectedPatient.last_name?.[0] || '')}
                           </div>
                           <motion.div initial={{ rotate: -90, scale: 0.9 }} animate={{ rotate: 0, scale: 1 }} transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }} className="absolute -inset-1 rounded-full border border-brand-indigo/30 pointer-events-none"></motion.div>
                        </div>
                        <h2 className="text-[26px] font-serif italic text-text-primary mb-2 text-center">{selectedPatient.first_name} {selectedPatient.last_name}</h2>
                        <div className="flex items-center gap-3 text-[13px] text-text-muted mb-4">
                           <span>{selectedPatient.birth_date ? Math.floor((Date.now() - new Date(selectedPatient.birth_date).getTime()) / 31557600000) : 'N/A'} yrs</span>
                           <span className="w-1 h-1 rounded-full bg-ui-border"></span>
                           <span>{selectedPatient.gender === 'M' ? 'Masculin' : selectedPatient.gender === 'F' ? 'Féminin' : 'N/A'}</span>
                           <span className="w-1 h-1 rounded-full bg-ui-border"></span>
                           <span className="inline-flex px-1.5 rounded-sm bg-[#EF44441A] text-[#EF4444] font-mono text-[11px] font-bold">{selectedPatient.blood_type || selectedPatient.blood_group}</span>
                        </div>
                        <div className="px-3 py-1 bg-[#22C55E1A] border border-[#22C55E33] text-[#22C55E] text-[10px] font-mono tracking-widest uppercase font-bold rounded-full">
                           PATIENT
                        </div>
                     </div>

                     <div className="space-y-6">
                        {/* Medical Info Card */}
                        <div className="glass-island border border-ui-border rounded-3xl p-5 space-y-4">
                           <h4 className="text-[11px] font-mono tracking-widest text-text-muted uppercase border-b border-ui-border pb-3 mb-1">Medical Info</h4>
                           
                           <div className="grid grid-cols-3 gap-2 text-[13px]">
                              <div className="text-text-muted font-medium">Blood Group</div>
                              <div className="col-span-2 text-text-primary font-mono bg-bg-input px-2 py-0.5 rounded w-fit">{selectedPatient.blood_type || selectedPatient.blood_group}</div>
                           </div>
                           <div className="grid grid-cols-3 gap-2 text-[13px]">
                              <div className="text-text-muted font-medium pt-1">Allergies</div>
                              <div className="col-span-2 flex flex-wrap gap-1.5">
                                {selectedPatient.allergies?.length > 0 ? selectedPatient.allergies.map((a: string) => (
                                  <span key={a} className="px-2 py-0.5 bg-state-warning/10 text-state-warning text-[12px] rounded-lg border border-state-warning/20">{a}</span>
                                )) : <span className="text-text-muted pt-1">None</span>}
                              </div>
                           </div>
                           <div className="grid grid-cols-3 gap-2 text-[13px]">
                              <div className="text-text-muted font-medium">History</div>
                              <div className="col-span-2 text-text-primary">{selectedPatient.medical_history || 'No significant history'}</div>
                           </div>
                           <div className="grid grid-cols-3 gap-2 text-[13px]">
                              <div className="text-text-muted font-medium">Insurance</div>
                              <div className="col-span-2 text-text-primary">{selectedPatient.insurance || 'None'}</div>
                           </div>
                        </div>

                        {/* Recent Events (from Timeline) */}
                        <div>
                           <div className="flex items-center justify-between mb-3 px-1">
                             <h4 className="text-[13px] font-bold text-text-primary">Recent Events</h4>
                           </div>
                           <div className="space-y-2">
                             {patientTimeline && patientTimeline.length > 0 ? patientTimeline.slice(0, 5).map((e: any, i: number) => (
                               <div key={i} className="p-3 bg-bg-surface border border-ui-border rounded-xl flex items-center justify-between">
                                  <div>
                                    <div className="text-[13px] text-text-primary font-medium mb-0.5">{e.title}</div>
                                    <div className="text-[11px] text-text-muted font-mono">{new Date(e.date).toLocaleDateString()}</div>
                                  </div>
                                  <div className="px-2 py-0.5 bg-ui-border text-text-muted text-[10px] uppercase font-mono font-bold rounded-full">{e.status || e.event_type}</div>
                               </div>
                             )) : (
                               <p className="text-[12px] text-text-muted italic px-2">No recent events found.</p>
                             )}
                           </div>
                        </div>

                     </div>
                   </>
                 )}
                  </div>
                  
                  {/* ── Action Buttons (3 only) ─────────────────────────────── */}
                  <div className="p-6 bg-bg-surface/80 backdrop-blur-md border-t border-ui-border space-y-3 shrink-0">

                    {/* 1. New Appointment */}
                    <button
                      onClick={() => setIsNewAppointmentOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-brand-indigo hover:bg-[#7C75FF] transition-colors rounded-xl text-white font-medium text-[14px] shadow-[0_4px_12px_rgba(99,91,255,0.25)]"
                    >
                      <CalendarPlus size={16} /> New Appointment
                    </button>

                    {/* 2. Edit Personal Information */}
                    <button
                      onClick={() => setIsEditPatientOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-transparent border border-brand-indigo/50 hover:border-brand-indigo hover:bg-brand-indigo/5 transition-colors rounded-xl text-brand-indigo font-medium text-[14px]"
                    >
                      <Pencil size={16} /> Edit Personal Information
                    </button>

                    {/* 3. View Consultations */}
                    <button
                      onClick={() => navigate(`/doctor/consultations?patient=${selectedPatientId}`)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-transparent hover:bg-bg-input transition-colors rounded-xl text-text-primary font-medium text-[14px]"
                    >
                      <Stethoscope size={16} /> View Consultations
                    </button>

                  </div>
               </motion.div>
             </motion.div>
         )}
      </AnimatePresence>

      {/* ── New Appointment Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {isNewAppointmentOpen && selectedPatientId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNewAppointmentOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-bg-elevated border border-ui-border rounded-2xl w-full max-w-[500px] shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-ui-border flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo">
                    <CalendarPlus size={20} />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-serif italic text-text-primary">New Appointment</h2>
                    {selectedPatient && (
                      <p className="text-[12px] text-text-muted mt-0.5">for {selectedPatient.first_name} {selectedPatient.last_name}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setIsNewAppointmentOpen(false)} className="w-8 h-8 rounded-full hover:bg-bg-input flex items-center justify-center text-text-muted transition-colors"><X size={18}/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
                {/* Date & Time */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Date</label>
                    <div className="relative">
                      <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="date"
                        value={aptDate}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={e => { setAptDate(e.target.value); setAptTime(''); }}
                        className="w-full bg-bg-input border border-ui-border rounded-xl pl-9 pr-3 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all"
                      />
                    </div>
                  </div>
                  {aptDate && (
                    <div>
                      <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Available Time Slots</label>
                      <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar border border-ui-border rounded-xl p-3 bg-bg-input">
                        {generateSlots().map(time => {
                          const status = getSlotStatus(time);
                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={status === 'unavailable'}
                              onClick={() => setAptTime(time)}
                              className={`p-2 rounded-lg text-xs font-semibold tracking-wider font-mono transition-all ${
                                status === 'unavailable' ? 'bg-bg-elevated text-text-muted cursor-not-allowed opacity-40 border border-ui-border' :
                                status === 'selected' ? 'bg-brand-indigo text-white shadow-sm font-bold border border-brand-indigo' :
                                'bg-bg-surface border border-ui-border text-brand-indigo hover:bg-brand-indigo/10'
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Duration</label>
                  <div className="flex gap-2">
                    {[15, 30, 45, 60].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setAptDuration(d)}
                        className={`flex-1 py-2 rounded-xl text-[13px] font-medium border transition-all ${aptDuration === d ? 'bg-brand-indigo/10 border-brand-indigo text-brand-indigo' : 'border-ui-border text-text-muted hover:border-brand-indigo/30'}`}
                      >
                        {d}min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAptType('IN_PERSON')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${aptType === 'IN_PERSON' ? 'bg-brand-indigo/10 border-brand-indigo text-brand-indigo' : 'bg-bg-input border-ui-border text-text-muted hover:border-brand-indigo/30'}`}
                    >
                      <User size={16} /> <span className="text-[13px] font-medium">In Person</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAptType('VIDEO')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${aptType === 'VIDEO' ? 'bg-[#06B6D4]/10 border-[#06B6D4] text-[#06B6D4]' : 'bg-bg-input border-ui-border text-text-muted hover:border-[#06B6D4]/30'}`}
                    >
                      <Video size={16} /> <span className="text-[13px] font-medium">Video Call</span>
                    </button>
                  </div>
                </div>

                {/* Motive */}
                <div>
                  <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Motive / Reason</label>
                  <input
                    type="text"
                    value={aptMotive}
                    onChange={e => setAptMotive(e.target.value)}
                    placeholder="e.g. Follow-up, General Check-up..."
                    className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-ui-border flex justify-end gap-3 shrink-0 bg-bg-elevated rounded-b-2xl">
                <button onClick={() => setIsNewAppointmentOpen(false)} className="px-5 py-2.5 rounded-xl text-text-muted hover:bg-bg-input text-[13px] font-medium transition-colors">Cancel</button>
                <button
                  onClick={handleCreateAppointment}
                  disabled={createAppointmentMutation.isPending || !aptDate || !aptTime}
                  className="px-6 py-2.5 bg-brand-indigo text-white rounded-xl text-[13px] font-medium shadow-md hover:bg-[#7C75FF] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {createAppointmentMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
                  Book Appointment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Patient Info Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {isEditPatientOpen && selectedPatient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditPatientOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-bg-elevated border border-ui-border rounded-2xl w-full max-w-[600px] shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-ui-border flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo">
                    <Pencil size={20} />
                  </div>
                  <h2 className="text-[18px] font-serif italic text-text-primary">Edit Patient Information</h2>
                </div>
                <button onClick={() => setIsEditPatientOpen(false)} className="w-8 h-8 rounded-full hover:bg-bg-input flex items-center justify-center text-text-muted transition-colors"><X size={18}/></button>
              </div>

              <form id="edit-patient-form" onSubmit={handleUpdatePatient} className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">First Name</label>
                    <input value={editForm.first_name || ''} onChange={e => setEditForm({...editForm, first_name: e.target.value})} required className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Last Name</label>
                    <input value={editForm.last_name || ''} onChange={e => setEditForm({...editForm, last_name: e.target.value})} required className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Phone Number</label>
                    <input value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} type="tel" className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Date of Birth</label>
                    <input value={editForm.birth_date || ''} onChange={e => setEditForm({...editForm, birth_date: e.target.value})} type="date" className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Gender</label>
                    <select value={editForm.gender || 'M'} onChange={e => setEditForm({...editForm, gender: e.target.value})} className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all appearance-none">
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Blood Group</label>
                    <select value={editForm.blood_type || ''} onChange={e => setEditForm({...editForm, blood_type: e.target.value})} className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all appearance-none">
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Insurance</label>
                    <select value={editForm.insurance || ''} onChange={e => setEditForm({...editForm, insurance: e.target.value})} className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all appearance-none">
                      <option value="">None</option>
                      {['CNSS', 'CNOPS', 'RMA Mutuelle', 'Saham', 'Allianz', 'Wafa Assurance'].map(ins => <option key={ins} value={ins}>{ins}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Allergies (Comma separated)</label>
                  <input value={editForm.allergies || ''} onChange={e => setEditForm({...editForm, allergies: e.target.value})} placeholder="e.g. Peanuts, Penicillin" className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" />
                </div>

                <div>
                  <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Medical History</label>
                  <textarea value={editForm.medical_history || ''} onChange={e => setEditForm({...editForm, medical_history: e.target.value})} className="w-full bg-bg-input border border-ui-border rounded-xl p-4 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all min-h-[80px] resize-y" />
                </div>
              </form>

              <div className="p-6 bg-bg-surface/80 border-t border-ui-border flex justify-end gap-3 shrink-0 rounded-b-2xl">
                <button onClick={() => setIsEditPatientOpen(false)} className="px-5 py-2.5 rounded-xl text-text-muted hover:bg-bg-input text-[13px] font-medium transition-colors">Cancel</button>
                <button
                  form="edit-patient-form"
                  type="submit"
                  disabled={updatePatientMutation.isPending}
                  className="px-6 py-2.5 bg-brand-indigo text-white rounded-xl text-[13px] font-medium shadow-md hover:bg-[#7C75FF] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {updatePatientMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add New Patient Modal ────────────────────────────────────────── */}
      <AnimatePresence>
         {isAddPatientOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddPatientOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-2xl w-full max-w-[600px] shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
                 <div className="p-6 border-b border-ui-border flex justify-between items-center bg-bg-surface/50 shrink-0">
                    <h2 className="text-[20px] font-serif italic text-text-primary">Add New Patient</h2>
                    <button onClick={() => setIsAddPatientOpen(false)} className="w-8 h-8 rounded-full hover:bg-bg-input flex items-center justify-center text-text-muted transition-colors"><X size={18}/></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                   <form id="add-patient-form" className="space-y-5" onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const patientData = {
                         first_name: formData.get('firstName') as string,
                         last_name: formData.get('lastName') as string,
                         birth_date: formData.get('birthDate') as string,
                         gender: formData.get('gender') as 'M' | 'F',
                         blood_type: formData.get('bloodGroup') as string,
                         insurance: formData.get('insurance') as string || undefined,
                         phone: formData.get('phone') as string,
                         medical_history: formData.get('history') as string,
                         allergies: ((formData.get('allergies') as string) || '').split(',').map(a => a.trim()).filter(Boolean),
                      };
                      addPatientMutation.mutate(patientData);
                   }}>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">First Name</label>
                          <input name="firstName" required className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" />
                        </div>
                        <div>
                          <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Last Name</label>
                          <input name="lastName" required className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                           <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Phone Number</label>
                           <input name="phone" required type="tel" className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" />
                         </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Date of Birth</label>
                          <input name="birthDate" required type="date" className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" />
                        </div>
                        <div>
                          <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Gender</label>
                          <select name="gender" required className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all appearance-none cursor-pointer">
                             <option value="M">Masculin</option>
                             <option value="F">Féminin</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Blood Group</label>
                          <select name="bloodGroup" required className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all appearance-none cursor-pointer mb-2">
                             {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                          <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Insurance</label>
                          <select name="insurance" className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all appearance-none cursor-pointer">
                             <option value="">None</option>
                             {['CNSS', 'CNOPS', 'RMA Mutuelle', 'Saham', 'Allianz', 'Wafa Assurance'].map(ins => <option key={ins} value={ins}>{ins}</option>)}
                          </select>
                         </div>
                         <div>
                           <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Allergies (Comma separated)</label>
                           <input name="allergies" placeholder="e.g. Peanuts, Penicillin" className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" />
                         </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Brief Medical History</label>
                        <textarea name="history" className="w-full bg-bg-input border border-ui-border rounded-xl p-4 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all min-h-[80px] resize-y" />
                      </div>
                   </form>
                 </div>
                 <div className="p-6 bg-bg-surface/80 backdrop-blur-md border-t border-ui-border flex justify-end shrink-0">
                    <button 
                      disabled={addPatientMutation.isPending}
                      form="add-patient-form" type="submit" className="px-6 py-3 bg-brand-indigo hover:bg-[#7C75FF] transition-colors rounded-xl text-white font-medium text-[14px] shadow-[0_4px_12px_rgba(99,91,255,0.25)] flex items-center justify-center disabled:opacity-50"
                    >
                       {addPatientMutation.isPending ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                       Save Patient
                    </button>
                 </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}
