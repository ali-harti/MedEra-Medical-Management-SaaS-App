import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ClipboardList, Check, X, MessageSquare, User, Stethoscope,
  CalendarDays, Clock, MessageCircle, Loader2, AlertCircle, RefreshCw,
  ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react';
import * as appointmentService from '../../services/appointmentService';

const ITEMS_PER_PAGE = 8;

const tabs = [
  { key: 'all',      label: 'Toutes' },
  { key: 'pending',  label: 'En Attente' },
  { key: 'accepted', label: 'Acceptées' },
  { key: 'rejected', label: 'Refusées' },
];

export default function PatientDemands() {
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);

  const { data: allDemands = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['demands'],
    queryFn: () => appointmentService.getDemands('REQUESTED,REJECTED,PLANNED,CONFIRMED'),
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

  const sourceLabel = (apt: any) => {
    if (apt.booked_via_whatsapp) return { label: 'WhatsApp', icon: <MessageCircle size={11} />, color: 'text-[#25D366] bg-[#25D36615] border-[#25D36630]' };
    return { label: 'Portail Patient', icon: <User size={11} />, color: 'text-brand-indigo bg-brand-indigo/8 border-brand-indigo/20' };
  };

  const typeLabel = (type: string) => {
    const map: Record<string, string> = { FIRST: 'Première consultation', FOLLOW_UP: 'Suivi', EMERGENCY: 'Urgence' };
    return map[type] || type;
  };

  const consultLabel = (type: string) => type === 'VISIO' ? 'Vidéo' : 'Présentiel';

  const emptyMsg = () => {
    if (activeTab === 'pending')  return 'Aucune demande en attente.';
    if (activeTab === 'accepted') return 'Aucune demande acceptée.';
    if (activeTab === 'rejected') return 'Aucune demande refusée.';
    return 'Aucune demande trouvée.';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-[40px] font-serif italic text-text-primary leading-tight">Mes Demandes</h1>
          <p className="text-[16px] text-text-muted mt-1 font-sans">
            Suivez le statut de vos demandes de rendez-vous
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[13px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {pendingCount} en attente
            </div>
          )}
          <button onClick={() => refetch()} className="p-2.5 rounded-full bg-bg-surface border border-ui-border text-text-muted hover:text-text-primary hover:border-brand-indigo/40 transition-all" title="Actualiser">
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
          <p className="text-[14px] text-text-muted">Chargement des demandes...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-state-error">
          <AlertCircle size={32} />
          <p className="text-[14px]">Erreur lors du chargement des demandes.</p>
          <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-state-error/10 text-state-error text-[13px] hover:bg-state-error/20 transition-colors">Réessayer</button>
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
            <p className="text-[16px] font-semibold text-text-primary">Rien ici !</p>
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
                
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08, type: 'spring', damping: 25, stiffness: 150 }}
                    key={apt.id}
                    className={`bg-bg-surface rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative group border border-ui-border flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 gap-4 ${isRejected ? 'opacity-70' : ''}`}
                  >
                    {/* Left accent bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[4px] transition-colors duration-300 ${isRejected ? 'bg-state-error' : isAccepted ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                    <div className="flex flex-col gap-2 pl-2 flex-1 min-w-0">
                      {/* Name + badge */}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[18px] font-semibold text-text-primary truncate">{apt.doctor_full_name || 'Médecin'}</span>
                        {isRejected ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 bg-state-error/10 text-state-error border border-state-error/25">
                            REFUSÉE
                          </span>
                        ) : isAccepted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
                            ACCEPTÉE
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 bg-amber-500/10 text-amber-500 border border-amber-500/25 animate-pulse">
                            EN ATTENTE
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
                        <span className="text-text-muted/70">{apt.start_datetime ? format(parseISO(apt.start_datetime), 'dd MMM yyyy', { locale: fr }) : '—'}</span>
                      </div>

                      {/* Motive / Rejection Reason */}
                      <div className="text-[14px] text-text-muted font-sans break-words whitespace-normal">
                        {isRejected && apt.cancellation_reason ? (
                          <span className="text-state-error italic">Raison de refus: {apt.cancellation_reason}</span>
                        ) : (
                          <span>{apt.motive || 'Demande de rendez-vous'}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-1">
                <p className="text-[13px] text-text-muted">
                  {filteredDemands.length} demande{filteredDemands.length > 1 ? 's' : ''} · Page {page} / {totalPages}
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
    </div>
  );
}
