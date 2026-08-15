import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr as frLocale, enUS } from 'date-fns/locale';
import {
  ClipboardList, Check, X, MessageSquare, User, Stethoscope,
  CalendarDays, Clock, MessageCircle, Loader2, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react';
import * as appointmentService from '../../services/appointmentService';
import { useToast } from '../../components/Toast';
import { useLanguage } from '../../contexts/LanguageContext';

const ITEMS_PER_PAGE = 8;

export default function SecretaryDemands() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [rejectModal, setRejectModal] = useState<{ id: string; patientName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // date-fns locale based on active language
  const dateLocale = lang === 'fr' ? frLocale : enUS;

  const tabs = [
    { key: 'all',      label: t('secretary.demands.tabs.all') },
    { key: 'pending',  label: t('secretary.demands.tabs.pending') },
    { key: 'accepted', label: t('secretary.demands.tabs.accepted') },
    { key: 'rejected', label: t('secretary.demands.tabs.rejected') },
  ];

  const { data: allDemands = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['demands'],
    queryFn: () => appointmentService.getDemands(),
    refetchInterval: 30000,
  });

  const pendingCount  = useMemo(() => allDemands.filter((d: any) => d.status === 'REQUESTED').length, [allDemands]);
  const acceptedCount = useMemo(() => allDemands.filter((d: any) => ['PLANNED', 'CONFIRMED'].includes(d.status)).length, [allDemands]);
  const rejectedCount = useMemo(() => allDemands.filter((d: any) => d.status === 'REJECTED').length, [allDemands]);

  const filteredDemands = useMemo(() => {
    if (activeTab === 'pending')  return allDemands.filter((d: any) => d.status === 'REQUESTED');
    if (activeTab === 'accepted') return allDemands.filter((d: any) => ['PLANNED', 'CONFIRMED'].includes(d.status));
    if (activeTab === 'rejected') return allDemands.filter((d: any) => d.status === 'REJECTED');
    return allDemands;
  }, [allDemands, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredDemands.length / ITEMS_PER_PAGE));
  const paginated = filteredDemands.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const switchTab = (key: string) => { setActiveTab(key); setPage(1); };

  const acceptMutation = useMutation({
    mutationFn: (id: string) => appointmentService.acceptDemand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demands'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['secretary-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-agenda-today'] });
      addToast(t('secretary.demands.toast.acceptSuccess'), 'success');
    },
    onError: (err: any) => addToast(err?.response?.data?.detail || t('secretary.demands.toast.acceptError'), 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => appointmentService.rejectDemand(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demands'] });
      setRejectModal(null);
      setRejectReason('');
      addToast(t('secretary.demands.toast.rejectSuccess'), 'success');
    },
    onError: (err: any) => addToast(err?.response?.data?.detail || t('secretary.demands.toast.rejectError'), 'error'),
  });

  const sourceLabel = (apt: any) => {
    if (apt.booked_via_whatsapp) return { label: t('secretary.demands.source.whatsapp'), icon: <MessageCircle size={11} />, color: 'text-[#25D366] bg-[#25D36615] border-[#25D36630]' };
    return { label: t('secretary.demands.source.portal'), icon: <User size={11} />, color: 'text-brand-indigo bg-brand-indigo/8 border-brand-indigo/20' };
  };

  const typeLabel = (type: string) => {
    const key = `secretary.demands.appointmentType.${type}`;
    const resolved = t(key);
    return resolved !== key ? resolved : type;
  };

  const consultLabel = (type: string) =>
    type === 'VISIO' ? t('secretary.demands.consultType.video') : t('secretary.demands.consultType.inPerson');

  const emptyMsg = () => {
    if (activeTab === 'pending')  return t('secretary.demands.emptyPending');
    if (activeTab === 'accepted') return t('secretary.demands.emptyAccepted');
    if (activeTab === 'rejected') return t('secretary.demands.emptyRejected');
    return t('secretary.demands.emptyAll');
  };

  const quickReasons: string[] = t('secretary.demands.quickReasons') || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-[40px] font-serif italic text-text-primary leading-tight">
            {t('secretary.demands.title')}
          </h1>
          <p className="text-[16px] text-text-muted mt-1 font-sans">
            {t('secretary.demands.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[13px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {String(t('secretary.demands.pendingBadge')).replace('{n}', String(pendingCount))}
            </div>
          )}
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-full bg-bg-surface border border-ui-border text-text-muted hover:text-text-primary hover:border-brand-indigo/40 transition-all"
            title={t('secretary.demands.refreshTitle')}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-bg-surface border border-ui-border rounded-2xl w-fit">
        {tabs.map(tab => {
          const count = tab.key === 'pending' ? pendingCount : tab.key === 'accepted' ? acceptedCount : tab.key === 'rejected' ? rejectedCount : allDemands.length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`relative px-5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 flex items-center gap-2 ${
                isActive
                  ? 'bg-brand-indigo text-white shadow-[0_2px_12px_rgba(99,91,255,0.3)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-input'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : tab.key === 'pending' ? 'bg-amber-500/20 text-amber-400' : tab.key === 'accepted' ? 'bg-emerald-500/20 text-emerald-500' : tab.key === 'rejected' ? 'bg-state-error/20 text-state-error' : 'bg-bg-input text-text-muted'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 size={32} className="animate-spin text-brand-indigo" />
          <p className="text-[14px] text-text-muted">{t('secretary.demands.loading')}</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-state-error">
          <AlertCircle size={32} />
          <p className="text-[14px]">{t('secretary.demands.errorMsg')}</p>
          <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-state-error/10 text-state-error text-[13px] hover:bg-state-error/20 transition-colors">
            {t('secretary.demands.retryBtn')}
          </button>
        </div>
      ) : paginated.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-60 gap-5 bg-bg-surface rounded-3xl border border-ui-border"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#22C55E10] border border-[#22C55E25] flex items-center justify-center">
            <Check size={24} className="text-[#22C55E]" />
          </div>
          <div className="text-center">
            <p className="text-[16px] font-semibold text-text-primary">{t('secretary.demands.nothingHere')}</p>
            <p className="text-[13px] text-text-muted mt-1">{emptyMsg()}</p>
          </div>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={activeTab + page} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">

            {/* List */}
            <div className="space-y-4 pt-2">
              {paginated.map((apt: any, idx: number) => {
                const src = sourceLabel(apt);
                const isRejected = apt.status === 'REJECTED';
                const isAccepted = ['PLANNED', 'CONFIRMED'].includes(apt.status);
                const isAccepting = acceptMutation.isPending && acceptMutation.variables === apt.id;
                
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08, type: 'spring', damping: 25, stiffness: 150 }}
                    key={apt.id}
                    className={`bg-bg-surface rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative group border border-ui-border flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 gap-4 ${isRejected ? 'opacity-70' : ''}`}
                  >
                    {/* Left accent bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[4px] transition-colors duration-300 ${isRejected ? 'bg-state-error' : isAccepted ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'}`} />

                    <div className="flex flex-col gap-2 pl-2 flex-1 min-w-0">
                      {/* Name + badge */}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[18px] font-semibold text-text-primary truncate">{apt.patient_full_name || 'Patient'}</span>
                        {isRejected ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 bg-state-error/10 text-state-error border border-state-error/25">
                            {t('secretary.demands.status.rejected')}
                          </span>
                        ) : isAccepted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/25">
                            {t('secretary.demands.status.accepted')}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 bg-amber-500/10 text-amber-500 border border-amber-500/25 animate-pulse">
                            {t('secretary.demands.status.pending')}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 border ${src.color}`}>
                          {src.icon} {src.label}
                        </span>
                      </div>

                      {/* Time + type */}
                      <div className="flex items-center gap-2 text-[14px] text-text-muted font-mono">
                        <span>{apt.start_datetime ? format(parseISO(apt.start_datetime), 'HH:mm') : '—'}</span>
                        <span className="text-ui-border">•</span>
                        <span>{consultLabel(apt.consultation_type).toUpperCase()}</span>
                        <span className="text-ui-border">•</span>
                        <span className="text-text-muted/70">
                          {apt.start_datetime
                            ? format(parseISO(apt.start_datetime), lang === 'fr' ? 'dd MMM yyyy' : 'MMM dd, yyyy', { locale: dateLocale })
                            : '—'}
                        </span>
                      </div>

                      {/* Motive / Rejection Reason */}
                      <div className="text-[14px] text-text-muted font-sans truncate">
                        {isRejected && apt.cancellation_reason ? (
                          <span className="text-state-error italic">
                            {t('secretary.demands.reasonLabel')}: {apt.cancellation_reason}
                          </span>
                        ) : (
                          <span>{apt.motive || t('secretary.demands.defaultMotive')}</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!isRejected && !isAccepted ? (
                      <div className="flex items-center shrink-0 md:ml-4 pl-2 md:pl-0 pt-2 md:pt-0 border-t md:border-t-0 border-ui-border mt-2 md:mt-0 w-full md:w-auto">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <button
                            onClick={() => acceptMutation.mutate(apt.id)}
                            disabled={isAccepting || rejectMutation.isPending}
                            className="flex-1 md:flex-none flex items-center justify-center px-5 py-2 rounded-full bg-[#22C55E] text-white text-[13px] font-medium shadow-sm hover:shadow-md hover:bg-[#16A34A] transition-all duration-300 disabled:opacity-50"
                          >
                            {t('secretary.demands.acceptBtn')}
                          </button>
                          <button
                            onClick={() => { setRejectModal({ id: apt.id, patientName: apt.patient_full_name || 'ce patient' }); setRejectReason(''); }}
                            disabled={isAccepting || rejectMutation.isPending}
                            className="flex-1 md:flex-none flex items-center justify-center px-5 py-2 rounded-full bg-bg-surface border border-ui-border text-text-primary text-[13px] font-medium shadow-sm hover:shadow-md hover:border-state-error hover:text-state-error transition-all duration-300 disabled:opacity-50"
                          >
                            {t('secretary.demands.rejectBtn')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
                        <span className="text-[12px] text-text-muted italic">{t('secretary.demands.status.processed')}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-1">
                <p className="text-[13px] text-text-muted">
                  {String(t('secretary.demands.pagination.summary'))
                    .replace('{count}', String(filteredDemands.length))
                    .replace('{plural}', filteredDemands.length > 1 ? (lang === 'fr' ? 's' : 's') : '')
                    .replace('{page}', String(page))
                    .replace('{total}', String(totalPages))}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-xl border border-ui-border text-text-muted hover:text-text-primary hover:border-brand-indigo/40 disabled:opacity-40 transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-xl text-[13px] font-medium transition-all ${
                        p === page
                          ? 'bg-brand-indigo text-white shadow-[0_2px_12px_rgba(99,91,255,0.3)]'
                          : 'border border-ui-border text-text-muted hover:text-text-primary hover:border-brand-indigo/40'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-xl border border-ui-border text-text-muted hover:text-text-primary hover:border-brand-indigo/40 disabled:opacity-40 transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setRejectModal(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-bg-surface rounded-3xl border border-ui-border shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-ui-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-state-error/10 border border-state-error/20 flex items-center justify-center">
                    <X size={18} className="text-state-error" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-text-primary">
                      {t('secretary.demands.rejectModal.title')}
                    </h3>
                    <p className="text-[12px] text-text-muted">
                      {String(t('secretary.demands.rejectModal.forPatient')).replace('{name}', rejectModal.patientName)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-2">
                    {t('secretary.demands.rejectModal.reasonLabel')} <span className="text-state-error">{t('secretary.demands.rejectModal.reasonRequired')}</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t('secretary.demands.rejectModal.reasonPlaceholder')}
                    rows={4}
                    className="w-full px-4 py-3 rounded-2xl bg-bg-input border border-ui-border text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-state-error/50 focus:ring-2 focus:ring-state-error/10 resize-none transition-all"
                    autoFocus
                  />
                  <p className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1.5">
                    <MessageCircle size={11} />
                    {t('secretary.demands.rejectModal.whatsappNote')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickReasons.map((r: string) => (
                    <button
                      key={r} onClick={() => setRejectReason(r)}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all ${
                        rejectReason === r ? 'bg-state-error/15 border-state-error/40 text-state-error' : 'bg-bg-input border-ui-border text-text-muted hover:border-state-error/30 hover:text-text-primary'
                      }`}
                    >{r}</button>
                  ))}
                </div>
              </div>
              <div className="p-6 pt-0 flex gap-3">
                <button onClick={() => setRejectModal(null)} className="flex-1 py-3 rounded-2xl border border-ui-border text-text-primary text-[14px] font-medium hover:bg-bg-input transition-all">
                  {t('secretary.demands.rejectModal.cancelBtn')}
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { if (rejectModal && rejectReason.trim()) rejectMutation.mutate({ id: rejectModal.id, reason: rejectReason.trim() }); }}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                  className="flex-1 py-3 rounded-2xl bg-state-error hover:bg-red-600 text-white text-[14px] font-semibold transition-all shadow-[0_4px_14px_rgba(239,68,68,0.3)] disabled:opacity-50 flex items-center justify-center"
                >
                  {rejectMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : t('secretary.demands.rejectModal.confirmBtn')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
