import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Clock, RefreshCw, Eye, X, Check, Loader2, AlertCircle, Calendar as CalendarIcon, Play, Users, CheckCircle2, XCircle } from 'lucide-react';
import * as appointmentService from '../../services/appointmentService';
import { getEmployer } from '../../services/authService';
import { format, parseISO, isToday } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Keeping mock rooms – no Room API yet
const mockRooms = [
  { id: '1', name: 'Consultation Room 1', inUse: true },
  { id: '2', name: 'Treatment Room A', inUse: false },
  { id: '3', name: 'Observation Room', inUse: false },
];

export default function SecretaryWaitingRoom() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(new Date());
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

  // Tick every minute to update waiting times
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Fetch employer (linked doctor)
  const { data: employer } = useQuery({
    queryKey: ['employer'],
    queryFn: getEmployer,
    staleTime: 5 * 60_000,
  });

  // Fetch ALL today's appointments for the linked doctor – refresh every 10 s
  const { data: appointmentsData, isLoading, isFetching, isError } = useQuery({
    queryKey: ['waiting-room-appointments', employer?.id],
    queryFn: () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return appointmentService.getAppointments({
        date_from: today,
        date_to: today,
        doctor_id: employer?.id,
      });
    },
    enabled: !!employer,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  const allToday: any[] = Array.isArray(appointmentsData)
    ? appointmentsData
    : appointmentsData?.results || [];

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'IN_PROGRESS' | 'UPCOMING' | 'DONE'>('ALL');

  // Sort: closest first (ascending time)
  const sorted = [...allToday].sort(
    (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
  );

  const displayAppointments = sorted.filter(apt => {
    const isCancelled = apt.status === 'CANCELLED' || apt.status === 'REJECTED';
    if (activeFilter === 'IN_PROGRESS') return apt.status === 'IN_PROGRESS';
    if (activeFilter === 'UPCOMING') return (apt.status === 'PLANNED' || apt.status === 'CONFIRMED' || apt.status === 'REQUESTED');
    if (activeFilter === 'DONE') return apt.status === 'DONE';
    return !isCancelled;
  });

  // Status helpers (same as doctor page)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':  return 'bg-[#22C55E]';
      case 'PLANNED':    return 'bg-[#22C55E]';
      case 'PENDING':    return 'bg-state-warning';
      case 'IN_PROGRESS': return 'bg-brand-indigo';
      case 'CANCELLED':  return 'bg-state-error';
      case 'DONE':       return 'bg-text-muted';
      default:           return 'bg-ui-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CONFIRMED':  return 'text-[#22C55E]';
      case 'PLANNED':    return 'text-[#22C55E]';
      case 'PENDING':    return 'text-state-warning';
      case 'IN_PROGRESS': return 'text-brand-indigo';
      case 'CANCELLED':  return 'text-state-error';
      case 'DONE':       return 'text-text-muted';
      default:           return 'text-text-muted';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'CONFIRMED':  return 'bg-[#22C55E1A]';
      case 'PLANNED':    return 'bg-[#22C55E1A]';
      case 'PENDING':    return 'bg-state-warning/10';
      case 'IN_PROGRESS': return 'bg-brand-indigo/10';
      case 'CANCELLED':  return 'bg-state-error/10';
      case 'DONE':       return 'bg-bg-input';
      default:           return 'bg-bg-input';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED':   return 'PLANIFIÉ';
      case 'PLANNED':     return 'PLANIFIÉ';
      case 'IN_PROGRESS': return 'EN COURS';
      case 'CANCELLED':   return 'ANNULÉ';
      case 'DONE':        return 'TERMINÉ';
      default: return status;
    }
  };

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
      queryClient.invalidateQueries({ queryKey: ['waiting-room-appointments', employer?.id] });
      setAppointmentToCancel(null);
    },
  });

  // Stats
  const planned      = sorted.filter(a => a.status === 'PLANNED' || a.status === 'CONFIRMED').length;
  const inProgress   = sorted.filter(a => a.status === 'IN_PROGRESS').length;
  const done         = sorted.filter(a => a.status === 'DONE').length;
  const cancelled    = sorted.filter(a => a.status === 'CANCELLED').length;

  // Waiting time for a planned appointment
  const getWaitMin = (apt: any) => {
    const t = new Date(apt.start_datetime);
    const diff = Math.floor((now.getTime() - t.getTime()) / 60_000);
    return diff > 0 ? diff : 0;
  };

  if (!employer && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in duration-600">
        <div className="w-16 h-16 bg-brand-indigo/10 rounded-full flex items-center justify-center mb-6">
          <Clock className="text-brand-indigo w-8 h-8" />
        </div>
        <h2 className="text-[28px] font-serif italic text-text-primary mb-2">Setup Required</h2>
        <p className="text-text-muted max-w-md mx-auto">
          Your account needs to be linked to a doctor to access the Waiting Room.
        </p>
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
        <p className="text-text-muted max-w-md mx-auto mb-6">
          We couldn't load today's appointments. Please check your connection.
        </p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['waiting-room-appointments', employer?.id] })}
          className="px-6 py-2 bg-brand-indigo text-white rounded-xl font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-600 pb-12">

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {appointmentToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-elevated border border-ui-border rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-8"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-state-error/10 flex items-center justify-center text-state-error">
                  <X size={32} />
                </div>
                <h3 className="text-xl font-serif italic text-text-primary">Cancel Appointment</h3>
                <p className="text-sm text-text-muted">
                  Are you sure you want to cancel this appointment? The patient will be notified.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => setAppointmentToCancel(null)}
                  className="flex-1 py-3 bg-bg-surface border border-ui-border rounded-xl text-text-primary font-medium hover:bg-bg-input transition-colors"
                >
                  No, Keep It
                </button>
                <button
                  onClick={() => updateStatusMutation.mutate({ id: appointmentToCancel, status: 'CANCELLED' })}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 py-3 bg-state-error text-white rounded-xl font-medium hover:bg-state-error/90 transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {updateStatusMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-elevated border border-ui-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-ui-border flex justify-between items-center shrink-0">
                <h3 className="text-xl font-serif italic text-text-primary">Appointment Details</h3>
                <button
                  onClick={() => setShowDetailsModal(null)}
                  className="p-2 hover:bg-bg-input rounded-full transition-colors text-text-muted"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                <div>
                  <p className="text-sm text-text-muted mb-1">Patient</p>
                  <p className="text-lg font-medium text-text-primary">{getPatientName(showDetailsModal)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-muted mb-1">Date</p>
                    <p className="font-medium text-text-primary">{format(parseISO(showDetailsModal.start_datetime), 'PPP')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-1">Time</p>
                    <p className="font-medium font-mono text-text-primary">{format(parseISO(showDetailsModal.start_datetime), 'HH:mm')}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-text-muted mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${getStatusBg(showDetailsModal.status)} ${getStatusText(showDetailsModal.status)}`}>
                    {getStatusLabel(showDetailsModal.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-text-muted mb-1">Type</p>
                  <p className="font-medium text-text-primary">
                    {showDetailsModal.consultation_type === 'VIDEO' ? 'Vidéo' : 'Présentiel'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-muted mb-1">Motive</p>
                  <div className="bg-bg-input p-4 rounded-xl text-sm text-text-primary">
                    {showDetailsModal.motive || 'No specific motive provided.'}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-ui-border flex justify-end shrink-0">
                <button
                  onClick={() => setShowDetailsModal(null)}
                  className="px-5 py-2.5 bg-brand-indigo text-white rounded-full font-medium hover:bg-[#7C75FF] transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Page Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-[40px] font-serif italic text-text-primary leading-tight">
              {t('secretary.nav.waitingRoom') || 'Waiting Room'}
            </h1>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]">
              <RefreshCw
                size={13}
                style={{
                  animationDuration: '3s',
                  animationPlayState: isFetching ? 'running' : 'paused',
                }}
                className="animate-spin"
              />
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest">Live</span>
            </div>
          </div>
          <p className="text-[16px] text-text-muted mt-1 font-sans">
            Daily schedule for{' '}
            <span className="font-medium text-brand-indigo">
              Dr. {employer?.last_name || 'Doctor'}
            </span>
            {' — '}{format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>
      </div>

      {/* ─── Main Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

        {/* ──── LEFT: Today's Appointments List ──── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Section label & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 px-1">
            <h2 className="text-[12px] font-mono tracking-widest text-text-muted uppercase font-semibold">
              Today's Schedule
            </h2>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
              {['ALL', 'IN_PROGRESS', 'UPCOMING', 'DONE'].map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f as any)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold tracking-wider uppercase whitespace-nowrap transition-all ${
                    activeFilter === f
                      ? 'bg-brand-indigo text-white shadow-md'
                      : 'bg-bg-surface border border-ui-border text-text-muted hover:text-text-primary'
                  }`}
                >
                  {f === 'ALL' ? 'Tous' : f === 'IN_PROGRESS' ? 'En Cours' : f === 'UPCOMING' ? 'À Venir' : 'Terminés'}
                </button>
              ))}
            </div>
            <span className="text-[12px] font-mono text-text-muted hidden md:inline-block">
              {displayAppointments.length} appointment{displayAppointments.length !== 1 ? 's' : ''}
            </span>
          </div>

          {isLoading && !appointmentsData ? (
            <div className="flex flex-col items-center justify-center py-24 text-text-muted bg-bg-surface border border-ui-border rounded-3xl">
              <Loader2 className="animate-spin mb-4 text-brand-indigo" size={32} />
              <span className="text-[16px] font-serif italic">Loading today's schedule...</span>
            </div>
          ) : displayAppointments.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-ui-border rounded-3xl bg-bg-surface flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-bg-input flex items-center justify-center mx-auto mb-4">
                <CalendarIcon size={24} className="text-text-muted/50" />
              </div>
              <p className="text-[18px] font-serif italic text-text-primary mb-1">No appointments matching filter</p>
              <p className="text-[14px] text-text-muted">Change filter to see other appointments.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <AnimatePresence mode="popLayout">
                {displayAppointments.map((apt: any, i: number) => {
                  const isCancelled = apt.status === 'CANCELLED';
                  const isPending   = apt.status === 'PLANNED' || apt.status === 'CONFIRMED';
                  const isActive    = apt.status === 'IN_PROGRESS';
                  const aptTime     = parseISO(apt.start_datetime);

                  return (
                    <motion.div
                      key={apt.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ delay: i * 0.06, type: 'spring', damping: 25, stiffness: 150 }}
                      className={`bg-bg-surface rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative group border border-ui-border flex items-center justify-between p-5 md:p-6 ${isCancelled ? 'opacity-50 grayscale' : ''}`}
                    >
                      {/* Status accent bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-[4px] transition-colors duration-300 rounded-l-3xl ${getStatusColor(apt.status)}`} />

                      {/* Left content */}
                      <div className="flex flex-col gap-2 pl-3 flex-1 min-w-0">
                        {/* Name + badge */}
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-[18px] font-semibold text-text-primary truncate">
                            {getPatientName(apt)}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 ${getStatusBg(apt.status)} ${getStatusText(apt.status)}`}>
                            {getStatusLabel(apt.status)}
                          </span>
                          {isActive && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-indigo/10 border border-brand-indigo/20 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-indigo animate-pulse" />
                              <span className="text-[10px] font-mono font-bold text-brand-indigo tracking-wider">IN PROGRESS</span>
                            </span>
                          )}
                        </div>

                        {/* Time + type */}
                        <div className="flex items-center gap-2 text-[14px] text-text-muted font-mono">
                          <Clock size={13} className="shrink-0" />
                          <span className="font-bold text-text-primary">{format(aptTime, 'HH:mm')}</span>
                          <span className="text-ui-border">•</span>
                          <span>{(apt.consultation_type === 'VIDEO' || apt.consultation_type === 'VISIO') ? 'VIDÉO' : 'PRÉSENTIEL'}</span>
                        </div>

                        {/* Motive */}
                        <div className="text-[14px] text-text-muted font-sans truncate">
                          {apt.motive || 'Follow-up'}
                        </div>


                      </div>

                      {/* Action buttons — same pill design as Doctor Appointments */}
                      <div className="flex items-center shrink-0 ml-4">
                        <div className="flex items-center bg-bg-surface border border-ui-border rounded-full p-1.5 shadow-sm hover:shadow-md transition-shadow">
                          {/* View details */}
                          <button
                            onClick={() => setShowDetailsModal(apt)}
                            title="View Details"
                            className="p-2 text-text-muted hover:text-brand-indigo transition-colors rounded-full hover:bg-bg-input"
                          >
                            <Eye size={18} />
                          </button>

                          {/* Cancel — only for planned */}
                          {isPending && (
                            <>
                              <div className="w-[1px] h-5 bg-ui-border mx-1" />
                              <button
                                title="Cancel Appointment"
                                onClick={() => setAppointmentToCancel(apt.id)}
                                disabled={updateStatusMutation.isPending}
                                className="p-2 text-text-muted hover:text-state-error transition-colors rounded-full hover:bg-state-error/10 disabled:opacity-50"
                              >
                                <X size={18} />
                              </button>
                            </>
                          )}

                          {/* Start / resume consult */}
                          {(isPending || isActive) && (
                            <>
                              <div className="w-[1px] h-5 bg-ui-border mx-1" />
                              <button
                                title={isActive ? 'Resume Consultation' : 'Start Consultation'}
                                disabled={updateStatusMutation.isPending}
                                onClick={() =>
                                  updateStatusMutation.mutate({ id: apt.id, status: 'IN_PROGRESS' })
                                }
                                className="p-2 text-brand-indigo hover:text-white transition-colors rounded-full hover:bg-brand-indigo disabled:opacity-50"
                              >
                                <Play size={18} className="fill-current ml-0.5" />
                              </button>
                            </>
                          )}

                          {/* Mark done */}
                          {isActive && (
                            <>
                              <div className="w-[1px] h-5 bg-ui-border mx-1" />
                              <button
                                title="Mark as Done"
                                disabled={updateStatusMutation.isPending}
                                onClick={() =>
                                  updateStatusMutation.mutate({ id: apt.id, status: 'DONE' })
                                }
                                className="p-2 text-text-muted hover:text-[#22C55E] transition-colors rounded-full hover:bg-[#22C55E]/10 disabled:opacity-50"
                              >
                                <Check size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ──── RIGHT: Stats + Rooms ──── */}
        <div className="space-y-6">

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-bg-surface border border-ui-border rounded-3xl p-6 backdrop-blur-md grid grid-cols-2 gap-6"
          >
            <div>
              <div className="text-[32px] font-serif italic text-text-primary">{sorted.length}</div>
              <div className="text-[11px] font-mono text-text-muted mt-1 uppercase tracking-widest">Total</div>
            </div>
            <div>
              <div className="text-[32px] font-serif italic text-state-warning">{planned}</div>
              <div className="text-[11px] font-mono text-text-muted mt-1 uppercase tracking-widest">Planned</div>
            </div>
            <div>
              <div className="text-[32px] font-serif italic text-brand-indigo">{inProgress}</div>
              <div className="text-[11px] font-mono text-text-muted mt-1 uppercase tracking-widest">In Progress</div>
            </div>
            <div>
              <div className="text-[32px] font-serif italic text-[#22C55E]">{done}</div>
              <div className="text-[11px] font-mono text-text-muted mt-1 uppercase tracking-widest">Done</div>
            </div>
            {cancelled > 0 && (
              <div className="col-span-2 pt-2 border-t border-ui-border">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-mono text-text-muted uppercase tracking-widest">Cancelled</div>
                  <div className="text-[20px] font-serif italic text-state-error">{cancelled}</div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Room status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-bg-surface border border-ui-border rounded-3xl overflow-hidden backdrop-blur-md"
          >
            <div className="px-6 py-5 border-b border-ui-border bg-bg-surface/50">
              <h2 className="text-[12px] font-mono tracking-widest text-text-primary uppercase font-bold">
                Room Status
              </h2>
            </div>
            <div className="flex flex-col p-2">
              {mockRooms.map(room => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-bg-input/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shadow-sm ${
                        room.inUse
                          ? 'bg-brand-indigo animate-pulse shadow-[0_0_8px_rgba(99,91,255,0.5)]'
                          : 'bg-[#22C55E]'
                      }`}
                    />
                    <div>
                      <div className="text-[14px] font-sans text-text-primary font-medium">{room.name}</div>
                      {room.inUse && (
                        <div className="text-[12px] text-brand-indigo font-mono mt-0.5">
                          Dr. {employer?.last_name || 'Doctor'}
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-mono font-bold tracking-widest w-fit ${
                      room.inUse
                        ? 'bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20'
                        : 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20'
                    }`}
                  >
                    {room.inUse ? 'IN USE' : 'FREE'}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Next appointment countdown */}
          {(() => {
            const next = sorted.find(
              a => (a.status === 'PLANNED' || a.status === 'CONFIRMED') && new Date(a.start_datetime) > now
            );
            if (!next) return null;
            const minsUntil = Math.floor(
              (new Date(next.start_datetime).getTime() - now.getTime()) / 60_000
            );
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-brand-indigo/5 border border-brand-indigo/20 rounded-3xl p-6"
              >
                <div className="text-[11px] font-mono tracking-widest text-brand-indigo uppercase mb-3 font-bold">
                  Next Appointment
                </div>
                <div className="text-[20px] font-medium text-text-primary mb-1">{getPatientName(next)}</div>
                <div className="text-[14px] font-mono text-text-muted mb-3">
                  {format(parseISO(next.start_datetime), 'HH:mm')}
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-brand-indigo" />
                  <span className="text-[13px] font-medium text-brand-indigo">
                    In {minsUntil < 60
                      ? `${minsUntil} min`
                      : `${Math.floor(minsUntil / 60)}h ${minsUntil % 60}min`}
                  </span>
                </div>
              </motion.div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
