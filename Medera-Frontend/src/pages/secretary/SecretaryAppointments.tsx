import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import { Search, Calendar as CalendarIcon, List, Clock, Check, X, ChevronRight, ChevronLeft, Loader2, AlertCircle, Eye, Pencil, Plus, Info } from 'lucide-react';
import * as appointmentService from '../../services/appointmentService';
import * as patientService from '../../services/patientService';
import { getEmployer } from '../../services/authService';
import { format, isToday, isFuture, isPast, parseISO, startOfWeek, addWeeks, subWeeks, addDays } from 'date-fns';

export default function SecretaryAppointments() {
  const { t } = useLanguage();
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
  const [showNewModal, setShowNewModal] = useState(false);
  const [editMotive, setEditMotive] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  // New appointment form state
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [newForm, setNewForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    duration: 30,
    consultation_type: 'PRESENTIEL',
    motive: '',
  });

  // Fetch linked doctor
  const { data: employer } = useQuery({
    queryKey: ['employer'],
    queryFn: getEmployer,
    staleTime: 5 * 60_000,
  });

  // Fetch ALL appointments for the linked doctor (same query as doctor page, scoped by backend)
  const { data: appointmentsData, isLoading, isError, isFetching } = useQuery({
    queryKey: ['secretary-appointments'],
    queryFn: () => appointmentService.getAppointments(),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });
  const appointments = Array.isArray(appointmentsData)
    ? appointmentsData
    : appointmentsData?.results || [];

  // Patient search
  const { data: patientsData } = useQuery({
    queryKey: ['patients-search', patientSearch, selectedLetter],
    queryFn: () => {
      const term = patientSearch || selectedLetter || '';
      return patientService.getPatients({ search: term });
    },
  });
  const patientResults = Array.isArray(patientsData) ? patientsData : patientsData?.results || [];

  const filteredPatientResults = selectedLetter
    ? patientResults.filter((p: any) =>
        (p.first_name || '').toUpperCase().startsWith(selectedLetter) ||
        (p.last_name || '').toUpperCase().startsWith(selectedLetter)
      )
    : patientResults;

  const getPatientName = (apt: any) => {
    if (apt.patient_full_name) return apt.patient_full_name;
    if (apt.patient_name) return apt.patient_name;
    if (apt.patient_details?.first_name)
      return `${apt.patient_details.first_name} ${apt.patient_details.last_name}`;
    return 'Unknown Patient';
  };

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentService.updateAppointment(id, { status } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secretary-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['waiting-room-appointments'] });
      setAppointmentToCancel(null);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      appointmentService.updateAppointment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secretary-appointments'] });
      setShowEditModal(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: appointmentService.createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secretary-appointments'] });
      setShowNewModal(false);
      setSelectedPatient(null);
      setPatientSearch('');
      setSelectedLetter(null);
      setNewForm({ date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', duration: 30, consultation_type: 'PRESENTIEL', motive: '' });
    },
  });

  const openEditModal = (apt: any) => {
    setShowEditModal(apt);
    setEditMotive(apt.motive || '');
    const dt = parseISO(apt.start_datetime);
    setEditDate(format(dt, 'yyyy-MM-dd'));
    setEditTime(format(dt, 'HH:mm'));
  };

  const handleEditSubmit = () => {
    let isoString = showEditModal.start_datetime;
    if (editDate && editTime) isoString = `${editDate}T${editTime}:00`;
    editMutation.mutate({ id: showEditModal.id, data: { start_datetime: isoString, motive: editMotive } });
  };

  const generateSlots = () => {
    const slots = [];
    for (let i = 8; i <= 18; i++) {
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

  const getNewSlotStatus = (time: string) => {
    if (!newForm.date) return 'unavailable';
    const taken = appointments.find((a: any) => {
      if (a.status === 'CANCELLED' || a.status === 'REJECTED') return false;
      const d = parseISO(a.start_datetime);
      return format(d, 'yyyy-MM-dd') === newForm.date && format(d, 'HH:mm') === time;
    });
    if (taken) return 'unavailable';
    if (newForm.time === time) return 'selected';
    return 'available';
  };

  // Status helpers — identical to doctor page
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-[#22C55E]';
      case 'PLANNED':   return 'bg-[#22C55E]';
      case 'PENDING':   return 'bg-brand-indigo';
      case 'IN_PROGRESS': return 'bg-brand-indigo';
      case 'CANCELLED': return 'bg-state-error';
      case 'DONE':      return 'bg-text-muted';
      default: return 'bg-ui-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'text-[#22C55E]';
      case 'PLANNED':   return 'text-[#22C55E]';
      case 'PENDING':   return 'text-brand-indigo';
      case 'IN_PROGRESS': return 'text-brand-indigo';
      case 'CANCELLED': return 'text-state-error';
      case 'DONE':      return 'text-text-muted';
      default: return 'text-text-muted';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-[#22C55E1A]';
      case 'PLANNED':   return 'bg-[#22C55E1A]';
      case 'PENDING':   return 'bg-brand-indigo/10';
      case 'IN_PROGRESS': return 'bg-brand-indigo/10';
      case 'CANCELLED': return 'bg-state-error/10';
      case 'DONE':      return 'bg-bg-input';
      default: return 'bg-bg-input';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED':   return 'PLANIFIÉ';
      case 'PLANNED':     return 'PLANIFIÉ';
      case 'PENDING':     return 'EN COURS';
      case 'IN_PROGRESS': return 'EN COURS';
      case 'CANCELLED':   return 'ANNULÉ';
      case 'REJECTED':    return 'ANNULÉ';
      case 'DONE':        return 'TERMINÉ';
      default: return status;
    }
  };

  // Filter logic — identical to doctor page
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
      return isDone || (isPastApt && !isCancelled && !isInProgress && !isPlanned);
    }
    
    if (activeTab === 'À Venir') {
      return (isPlanned) && !isCancelled && !isDone;
    }
    
    return !isCancelled;
  }).sort((a: any, b: any) => new Date(b.created_at || b.start_datetime).getTime() - new Date(a.created_at || a.start_datetime).getTime());

  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading && !appointmentsData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Loader2 className="w-10 h-10 text-brand-indigo animate-spin mb-4" />
        <p className="text-text-muted font-serif italic text-lg">Loading schedule...</p>
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
        <p className="text-text-muted max-w-md mx-auto mb-6">We couldn't load the appointments.</p>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['secretary-appointments'] })} className="px-6 py-2 bg-brand-indigo text-white rounded-xl font-medium">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-600 pb-12">

      {/* ── Cancel Confirmation Modal ── */}
      <AnimatePresence>
        {appointmentToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-bg-elevated border border-ui-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-state-error/10 flex items-center justify-center text-state-error"><X size={32} /></div>
                <h3 className="text-xl font-serif italic text-text-primary">Cancel Appointment</h3>
                <p className="text-sm text-text-muted">Are you sure you want to cancel this appointment? This action cannot be undone.</p>
              </div>
              <div className="flex items-center gap-3 mt-8">
                <button onClick={() => setAppointmentToCancel(null)} className="flex-1 py-3 bg-bg-surface border border-ui-border rounded-xl text-text-primary font-medium hover:bg-bg-input transition-colors">No, Keep It</button>
                <button onClick={() => updateStatusMutation.mutate({ id: appointmentToCancel, status: 'CANCELLED' })} disabled={updateStatusMutation.isPending} className="flex-1 py-3 bg-state-error text-white rounded-xl font-medium hover:bg-state-error/90 transition-colors flex items-center justify-center gap-2">
                  {updateStatusMutation.isPending && <Loader2 size={16} className="animate-spin" />} Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Details Modal ── */}
      <AnimatePresence>
        {showDetailsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-bg-elevated border border-ui-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-ui-border flex justify-between items-center shrink-0">
                <h3 className="text-xl font-serif italic text-text-primary">Appointment Details</h3>
                <button onClick={() => setShowDetailsModal(null)} className="p-2 hover:bg-bg-input rounded-full transition-colors text-text-muted"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div>
                  <p className="text-sm text-text-muted mb-1">Patient</p>
                  <p className="text-lg font-medium text-text-primary">{getPatientName(showDetailsModal)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-text-muted mb-1">Date</p><p className="font-medium text-text-primary">{format(parseISO(showDetailsModal.start_datetime), 'PPP')}</p></div>
                  <div><p className="text-sm text-text-muted mb-1">Time</p><p className="font-medium font-mono text-text-primary">{format(parseISO(showDetailsModal.start_datetime), 'HH:mm')}</p></div>
                </div>
                <div>
                  <p className="text-sm text-text-muted mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${getStatusBg(showDetailsModal.status)} ${getStatusText(showDetailsModal.status)}`}>{getStatusLabel(showDetailsModal.status)}</span>
                </div>
                <div>
                  <p className="text-sm text-text-muted mb-1">Type</p>
                  <p className="font-medium text-text-primary">{showDetailsModal.consultation_type === 'VISIO' || showDetailsModal.consultation_type === 'VIDEO' ? 'Vidéo' : 'Présentiel'}</p>
                </div>
                <div>
                  <p className="text-sm text-text-muted mb-1">Motive</p>
                  <div className="bg-bg-input p-4 rounded-xl text-sm text-text-primary">{showDetailsModal.motive || 'No specific motive provided.'}</div>
                </div>
              </div>
              <div className="p-6 border-t border-ui-border flex justify-end shrink-0">
                <button onClick={() => setShowDetailsModal(null)} className="px-5 py-2.5 bg-brand-indigo text-white rounded-full font-medium hover:bg-[#7C75FF] transition-colors">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-bg-elevated border border-ui-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
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
                  <input type="date" value={editDate} onChange={(e) => { setEditDate(e.target.value); setEditTime(''); }} className="w-full bg-bg-surface border border-ui-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 transition-shadow" />
                </div>
                {editDate && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Available Slots</label>
                    <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {generateSlots().map(time => {
                        const status = getSlotStatus(time);
                        return (
                          <button key={time} disabled={status === 'unavailable'} onClick={() => setEditTime(time)}
                            className={`p-2 rounded-lg text-sm font-medium transition-colors ${status === 'unavailable' ? 'bg-bg-input text-text-muted cursor-not-allowed opacity-60' : status === 'selected' ? 'bg-brand-indigo text-white shadow-sm' : 'bg-bg-surface border border-ui-border text-brand-indigo hover:bg-brand-indigo/10'}`}>
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Motive</label>
                  <textarea rows={3} value={editMotive} onChange={(e) => setEditMotive(e.target.value)} className="w-full bg-bg-surface border border-ui-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 transition-shadow resize-none" />
                </div>
              </div>
              <div className="p-6 border-t border-ui-border flex justify-end gap-3 shrink-0">
                <button onClick={() => setShowEditModal(null)} className="px-5 py-2.5 text-text-muted hover:bg-bg-input rounded-full font-medium transition-colors">Cancel</button>
                <button onClick={handleEditSubmit} disabled={editMutation.isPending} className="px-5 py-2.5 bg-brand-indigo text-white rounded-full font-medium hover:bg-[#7C75FF] transition-colors flex items-center gap-2">
                  {editMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── New Appointment Modal ── */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-bg-elevated border border-ui-border rounded-3xl w-full max-w-[500px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-ui-border flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xl font-serif italic text-text-primary">New Appointment</h3>
                  <p className="text-sm text-text-muted mt-0.5">For Dr. {employer?.last_name || 'Doctor'}</p>
                </div>
                <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-bg-input rounded-full transition-colors text-text-muted"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                {/* Patient selection */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-text-primary">Patient <span className="text-state-error">*</span></label>
                  
                  {selectedPatient ? (
                    <div className="flex items-center gap-3 p-4 bg-brand-indigo/5 border border-brand-indigo/20 rounded-2xl">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-lavender flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-text-primary truncate">{selectedPatient.first_name} {selectedPatient.last_name}</div>
                        <div className="text-xs text-text-muted font-mono truncate">
                          {selectedPatient.internal_id} {selectedPatient.phone ? `• ${selectedPatient.phone}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setPatientSearch('');
                          setSelectedLetter(null);
                        }}
                        className="p-2 hover:bg-state-error/10 text-text-muted hover:text-state-error rounded-full transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Search Bar */}
                      <div className="relative">
                        <input
                          type="text"
                          value={patientSearch}
                          onChange={e => {
                            setPatientSearch(e.target.value);
                            setSelectedLetter(null);
                          }}
                          placeholder="Search by name, phone, CIN..."
                          className="w-full bg-bg-surface border border-ui-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 pr-10"
                        />
                        <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted" />
                      </div>

                      {/* Alphabet letters list */}
                      <div className="flex gap-1 overflow-x-auto py-1 px-0.5 hide-scrollbar">
                        <button
                          type="button"
                          onClick={() => setSelectedLetter(null)}
                          className={`px-3 py-1 text-xs rounded-full font-medium shrink-0 transition-colors ${
                            selectedLetter === null
                              ? 'bg-brand-indigo text-white shadow-sm'
                              : 'bg-bg-input text-text-muted hover:bg-bg-input/80'
                          }`}
                        >
                          All
                        </button>
                        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                          <button
                            key={letter}
                            type="button"
                            onClick={() => {
                              setSelectedLetter(letter);
                              setPatientSearch('');
                            }}
                            className={`w-7 h-7 flex items-center justify-center text-xs rounded-full font-medium shrink-0 transition-colors ${
                              selectedLetter === letter
                                ? 'bg-brand-indigo text-white shadow-sm font-bold'
                                : 'bg-bg-input text-text-muted hover:bg-bg-input/80'
                            }`}
                          >
                            {letter}
                          </button>
                        ))}
                      </div>

                      {/* Patient List Box */}
                      <div className="border border-ui-border rounded-xl overflow-hidden bg-bg-surface">
                        <div className="max-h-[160px] overflow-y-auto custom-scrollbar divide-y divide-ui-border">
                          {filteredPatientResults.length === 0 ? (
                            <div className="px-4 py-6 text-sm text-text-muted text-center italic">
                              No pre-existing patient found. Please add the patient in the Registry first.
                            </div>
                          ) : (
                            filteredPatientResults.map((p: any) => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setSelectedPatient(p);
                                  setPatientSearch(`${p.first_name} ${p.last_name}`);
                                  setSelectedLetter(null);
                                }}
                                className="px-4 py-2.5 hover:bg-bg-input cursor-pointer transition-colors flex items-center gap-3"
                              >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-lavender flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                                  {p.first_name?.[0]}{p.last_name?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-text-primary truncate">
                                    {p.first_name} {p.last_name}
                                  </div>
                                  <div className="text-xs font-mono text-text-muted flex items-center gap-2 truncate">
                                    <span>{p.internal_id || p.id?.substring(0, 8)}</span>
                                    {p.phone && (
                                      <>
                                        <span className="text-ui-border">•</span>
                                        <span>{p.phone}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Date</label>
                  <input type="date" min={format(new Date(), 'yyyy-MM-dd')} value={newForm.date} onChange={e => setNewForm({ ...newForm, date: e.target.value, time: '' })} className="w-full bg-bg-surface border border-ui-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-indigo/30" />
                </div>

                {/* Time Slots */}
                {newForm.date && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Available Slots</label>
                    <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {generateSlots().map(time => {
                        const status = getNewSlotStatus(time);
                        return (
                          <button
                            key={time}
                            type="button"
                            disabled={status === 'unavailable'}
                            onClick={() => setNewForm({ ...newForm, time })}
                            className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                              status === 'unavailable' ? 'bg-bg-input text-text-muted cursor-not-allowed opacity-60' :
                              status === 'selected' ? 'bg-brand-indigo text-white shadow-sm font-bold' :
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

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Duration</label>
                  <div className="flex gap-2">
                    {[15, 30, 45, 60].map(d => (
                      <button key={d} type="button" onClick={() => setNewForm({ ...newForm, duration: d })}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${newForm.duration === d ? 'bg-brand-indigo/10 border-brand-indigo text-brand-indigo' : 'border-ui-border text-text-muted hover:border-brand-indigo/30'}`}>
                        {d}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Consultation Type</label>
                  <div className="flex gap-3">
                    {[{ val: 'PRESENTIEL', label: 'Présentiel' }, { val: 'VISIO', label: 'Vidéo' }].map(opt => (
                      <button key={opt.val} type="button" onClick={() => setNewForm({ ...newForm, consultation_type: opt.val })}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${newForm.consultation_type === opt.val ? 'bg-brand-indigo/10 border-brand-indigo text-brand-indigo' : 'border-ui-border text-text-muted hover:border-brand-indigo/30'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Motive */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Reason for Visit</label>
                  <input type="text" value={newForm.motive} onChange={e => setNewForm({ ...newForm, motive: e.target.value })} placeholder="e.g. Follow-up, Annual check-up…" className="w-full bg-bg-surface border border-ui-border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-indigo/30" />
                </div>
              </div>
              <div className="p-6 border-t border-ui-border flex justify-end gap-3 shrink-0">
                <button onClick={() => setShowNewModal(false)} className="px-5 py-2.5 text-text-muted hover:bg-bg-input rounded-full font-medium transition-colors">Cancel</button>
                <button
                  disabled={createMutation.isPending || !selectedPatient || !newForm.date || !newForm.time || !employer}
                  onClick={() => {
                    if (!employer) return;
                    const startDT = `${newForm.date}T${newForm.time}:00`;
                    const endDT = new Date(new Date(startDT).getTime() + newForm.duration * 60000).toISOString();
                    createMutation.mutate({
                      doctor: employer.id,
                      patient: selectedPatient.id,
                      start_datetime: startDT,
                      end_datetime: endDT,
                      consultation_type: newForm.consultation_type as any,
                      motive: newForm.motive || 'Consultation',
                    });
                  }}
                  className="px-5 py-2.5 bg-brand-indigo text-white rounded-full font-medium hover:bg-[#7C75FF] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Create Appointment
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-[40px] font-serif italic text-text-primary leading-tight">Appointments</h1>
          <p className="text-[16px] text-text-muted mt-1 font-sans">
            Managing schedule for <span className="font-medium text-brand-indigo">Dr. {employer?.first_name} {employer?.last_name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex glass-island border border-ui-border p-1 rounded-full w-fit shrink-0">
            <button onClick={() => setViewMode('list')} className={`relative flex items-center justify-center w-12 h-9 rounded-full transition-colors z-10 ${viewMode === 'list' ? 'text-white' : 'text-text-muted hover:text-text-primary'}`}>
              {viewMode === 'list' && <motion.div layoutId="sec_view_toggle" className="absolute inset-0 bg-brand-indigo rounded-full z-[-1]" />}
              <List size={16} />
            </button>
            <button onClick={() => setViewMode('calendar')} className={`relative flex items-center justify-center w-12 h-9 rounded-full transition-colors z-10 ${viewMode === 'calendar' ? 'text-white' : 'text-text-muted hover:text-text-primary'}`}>
              {viewMode === 'calendar' && <motion.div layoutId="sec_view_toggle" className="absolute inset-0 bg-brand-indigo rounded-full z-[-1]" />}
              <CalendarIcon size={16} />
            </button>
          </div>

          {/* New appointment button */}
          <button onClick={() => setShowNewModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-brand-indigo text-white rounded-full font-medium text-[14px] shadow-[0_4px_12px_rgba(99,91,255,0.3)] hover:bg-[#7C75FF] transition-colors">
            <Plus size={18} /> New Appointment
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-6">
            {/* Tab Navigation — identical to doctor page */}
            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
              {tabs.map(tab => {
                return (
                  <button key={tab} onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                    className={`relative px-5 py-2.5 text-[14px] font-medium transition-all rounded-full whitespace-nowrap flex items-center gap-2 ${activeTab === tab ? 'bg-brand-indigo text-white shadow-sm' : 'bg-bg-surface border border-ui-border text-brand-indigo hover:bg-bg-input'}`}>
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* List — identical card design to doctor page */}
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
                    className="bg-bg-surface rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative group border border-ui-border flex items-center justify-between p-5 md:p-6"
                  >
                    {/* Left accent bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[4px] transition-colors duration-300 ${getStatusColor(apt.status)}`} />

                    <div className="flex flex-col gap-2 pl-2 flex-1 min-w-0">
                      {/* Name + badge */}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[18px] font-semibold text-text-primary truncate">{getPatientName(apt)}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 ${getStatusBg(apt.status)} ${getStatusText(apt.status)}`}>
                          {getStatusLabel(apt.status)}
                        </span>
                      </div>

                      {/* Time + type */}
                      <div className="flex items-center gap-2 text-[14px] text-text-muted font-mono">
                        <span>{format(parseISO(apt.start_datetime), 'HH:mm')}</span>
                        <span className="text-ui-border">•</span>
                        <span>{(apt.consultation_type === 'VIDEO' || apt.consultation_type === 'VISIO') ? 'VIDÉO' : 'PRÉSENTIEL'}</span>
                        <span className="text-ui-border">•</span>
                        <span className="text-text-muted/70">{format(parseISO(apt.start_datetime), 'dd MMM yyyy')}</span>
                      </div>

                      {/* Motive */}
                      <div className="text-[14px] text-text-muted font-sans truncate">{apt.motive || 'Follow-up'}</div>
                    </div>

                    {/* Action buttons pill — same as doctor page */}
                    <div className="flex items-center shrink-0 ml-4">
                      <div className="flex items-center bg-bg-surface border border-ui-border rounded-full p-1.5 shadow-sm hover:shadow-md transition-shadow">
                        <button onClick={() => setShowDetailsModal(apt)} title="View Details" className="p-2 text-text-muted hover:text-brand-indigo transition-colors rounded-full hover:bg-bg-input">
                          <Eye size={18} />
                        </button>
                        <div className="w-[1px] h-5 bg-ui-border mx-1" />
                        <button onClick={() => openEditModal(apt)} title="Edit Appointment" className="p-2 text-text-muted hover:text-brand-indigo transition-colors rounded-full hover:bg-bg-input">
                          <Pencil size={18} />
                        </button>
                        {(apt.status === 'CONFIRMED' || apt.status === 'PLANNED') && (
                          <>
                            <div className="w-[1px] h-5 bg-ui-border mx-1" />
                            <button title="Cancel" onClick={() => setAppointmentToCancel(apt.id)} className="p-2 text-text-muted hover:text-state-error transition-colors rounded-full hover:bg-state-error/10">
                              <X size={18} />
                            </button>
                          </>
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
                <span className="text-sm text-text-muted">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAppointments.length)} of {filteredAppointments.length} appointments
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-ui-border text-text-muted hover:text-text-primary hover:bg-bg-surface disabled:opacity-50 transition-colors">Previous</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-brand-indigo text-white' : 'border border-ui-border text-text-muted hover:text-text-primary hover:bg-bg-surface'}`}>
                      {page}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-ui-border text-text-muted hover:text-text-primary hover:bg-bg-surface disabled:opacity-50 transition-colors">Next</button>
                </div>
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

            {/* Calendar Grid — identical to doctor page */}
            <div className="calendar-grid bg-bg-surface border border-ui-border rounded-3xl overflow-hidden glass-island grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
              <div className="border-b border-r border-ui-border py-4" />
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                const currentWeekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
                const dateForCol = addDays(currentWeekStart, i);
                const isTodays = isToday(dateForCol);
                return (
                  <div key={day} className={`border-b ${i < 6 ? 'border-r' : ''} border-ui-border py-4 text-center ${isTodays ? 'bg-brand-indigo/5' : ''}`}>
                    <div className="text-[13px] font-medium text-text-muted">{day}</div>
                    <div className={`text-[18px] font-serif ${isTodays ? 'text-brand-indigo font-bold' : 'text-text-primary'}`}>{format(dateForCol, 'd')}</div>
                  </div>
                );
              })}
              {Array.from({ length: 11 }, (_, i) => i + 8).map(hour => {
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                return (
                  <React.Fragment key={timeStr}>
                    <div className="border-b border-r border-ui-border py-4 pr-2 text-right relative">
                      <span className="absolute top-0 right-3 -translate-y-1/2 text-[11px] font-mono text-text-muted">{timeStr}</span>
                    </div>
                    {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                      const currentWeekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
                      const cellDate = addDays(currentWeekStart, dayIdx);
                      const cellDateStr = format(cellDate, 'yyyy-MM-dd');
                      const cellAppts = appointments.filter((a: any) => {
                        const aptDate = parseISO(a.start_datetime);
                        return format(aptDate, 'yyyy-MM-dd') === cellDateStr && format(aptDate, 'HH') === hour.toString().padStart(2, '0');
                      });
                      return (
                        <div key={`${dayIdx}-${timeStr}`} className={`border-b ${dayIdx < 6 ? 'border-r' : ''} border-ui-border h-20 hover:bg-brand-indigo/5 transition-colors relative p-1`}>
                          {cellAppts.map((apt: any) => {
                            const aptStart = parseISO(apt.start_datetime);
                            const startMinutes = aptStart.getMinutes();
                            const topOffset = (startMinutes / 60) * 100;
                            const duration = apt.duration_minutes || 30;
                            const heightPct = (duration / 60) * 100;
                            return (
                              <motion.div key={apt.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className={`absolute left-0.5 right-0.5 rounded-md p-1 px-1.5 z-10 shadow-sm cursor-pointer border hover:shadow-md transition-all flex flex-col overflow-hidden ${apt.status === 'CONFIRMED' || apt.status === 'PLANNED' ? 'bg-[#22C55E]/10 border-[#22C55E]/30 text-[#22C55E]' : apt.status === 'DONE' ? 'bg-bg-input border-ui-border text-text-muted opacity-80' : apt.status === 'CANCELLED' ? 'bg-state-error/10 border-state-error/30 text-state-error line-through decoration-state-error/50' : 'bg-brand-indigo/10 border-brand-indigo/30 text-brand-indigo'}`}
                                style={{ top: `${topOffset}%`, height: `${heightPct}%`, zIndex: 10 + startMinutes }}
                                onClick={() => setShowDetailsModal(apt)}>
                                <div className="text-[11px] font-semibold truncate leading-tight">{getPatientName(apt)}</div>
                                {heightPct > 40 && <div className="text-[9px] font-mono opacity-80 mt-0.5">{format(aptStart, 'HH:mm')}</div>}
                              </motion.div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
