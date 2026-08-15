import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatDate } from '../../utils/format';
import { 
  Check, 
  X, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Loader2, 
  UserPlus, 
  ExternalLink,
  ShieldAlert,
  Clock,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  MapPin,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getApplications, approveApplication, rejectApplication } from '../../services/adminService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../components/Toast';

export default function AdminApplicationsPage() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('PENDING');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [actionModal, setActionModal] = useState<{type: 'approve' | 'reject', app: any} | null>(null);
  const [detailsModal, setDetailsModal] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: appsResponse, isLoading } = useQuery({
    queryKey: ['admin_applications', activeTab, currentPage, itemsPerPage],
    queryFn: () => getApplications({
      status: activeTab === 'ALL' ? undefined : activeTab as any,
      page: currentPage,
      page_size: itemsPerPage
    })
  });

  const apps = appsResponse?.results || [];
  const totalEntries = appsResponse?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalEntries / itemsPerPage));

  const actionMutation = useMutation({
    mutationFn: ({ type, id, reason }: { type: 'approve' | 'reject', id: string, reason?: string }) => {
      if (type === 'approve') return approveApplication(id);
      return rejectApplication(id, reason || 'Non-compliance with clinical standards');
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['admin_applications'] });
      setActionModal(null);
      setRejectReason('');
      addToast(`Credential verification ${type === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');
    },
    onError: () => {
      addToast('Oversight action failed', 'error');
    }
  });

  const handleAction = (type: 'approve' | 'reject', appId: string) => {
     actionMutation.mutate({ type, id: appId, reason: type === 'reject' ? rejectReason : undefined });
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h2 className="text-[36px] font-serif italic text-text-primary leading-tight flex flex-wrap gap-x-[0.3em]">
             {(t('admin.docApps') || "Practitioner Credentialing").split(' ').map((word, i) => (
                <motion.span 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  {word}
                </motion.span>
             ))}
          </h2>
          <p className="text-[16px] font-sans text-text-muted mt-1">
            {t('admin.applications.queue') || "Operational queue for verifying and authorizing new medical personnel."}
          </p>
        </div>
        
        <div className="flex bg-bg-surface border border-ui-border p-1 rounded-xl">
           {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((tab, i) => (
              <motion.button 
                 key={tab} 
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: 0.2 + (i * 0.05), ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => { setActiveTab(tab); setCurrentPage(1); }} 
                 className={`px-5 py-2 text-[11px] font-bold font-mono rounded-lg transition-all ${activeTab === tab ? 'bg-brand-indigo text-white shadow-lg' : 'text-text-muted hover:text-text-primary'}`}
              >
                 {tab} {tab === 'PENDING' && totalEntries > 0 && activeTab === 'PENDING' && `(${totalEntries})`}
              </motion.button>
           ))}
        </div>
      </div>

      {/* Grid of Applications */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40">
           <Loader2 className="w-12 h-12 animate-spin text-brand-indigo mb-4" />
           <p className="text-[14px] text-text-muted font-mono animate-pulse">SYNCHRONIZING CREDENTIAL QUEUE...</p>
        </div>
      ) : apps.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="flex flex-col items-center justify-center py-32 glass-island border border-ui-border rounded-[32px] text-center"
        >
           <div className="w-20 h-20 bg-state-success/10 border border-state-success/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-state-success" />
           </div>
           <h3 className="text-[28px] font-serif italic text-text-primary mb-2">Queue Fully Processed</h3>
           <p className="text-text-muted max-w-[400px]">All practitioner credentials for the current segment have been verified and authorized.</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          <div className="glass-island border border-ui-border rounded-[24px] overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-ui-border bg-bg-surface/50">
                    <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Practitioner</th>
                    <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Specialty & Exp</th>
                    <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Submitted</th>
                    <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em]">Status</th>
                    <th className="px-6 py-5 text-[11px] font-mono text-text-muted uppercase tracking-[0.2em] text-right">Oversight Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {apps.map((app: any, i: number) => (
                      <motion.tr 
                        key={app.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-ui-border last:border-0 hover:bg-brand-indigo/[0.02] transition-all group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-indigo/20 to-transparent border border-white/5 flex items-center justify-center text-brand-lavender font-bold shadow-inner">
                              {app.first_name?.[0]}{app.last_name?.[0]}
                            </div>
                            <div>
                              <div className="text-[14px] font-bold text-text-primary">{app.first_name} {app.last_name}</div>
                              <div className="text-[12px] text-text-muted mt-0.5">{app.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                           <div className="flex flex-col">
                              <span className="text-[13px] font-medium text-text-primary flex items-center gap-2">
                                <Briefcase size={12} className="text-brand-lavender" /> {app.specialty || 'General'}
                              </span>
                              <span className="text-[11px] font-mono text-text-muted tracking-tighter uppercase mt-1">
                                {app.years_of_experience || 0} YRS EXP
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-5">
                           <div className="flex flex-col">
                              <span className="text-[13px] font-medium text-text-primary">
                                {formatDate(app.submitted_at)}
                              </span>
                              <span className="text-[11px] text-text-muted font-mono flex items-center gap-1.5 mt-0.5">
                                <Clock size={12} className="text-brand-lavender" /> {new Date(app.submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                           </div>
                        </td>
                        <td className="px-6 py-5">
                           <span className={`px-2.5 py-1 rounded-sm text-[10px] font-bold font-mono tracking-widest border ${
                              app.status === 'PENDING' ? 'bg-state-warning/10 text-state-warning border-state-warning/20 shadow-[0_0_12px_rgba(245,158,11,0.1)]' : 
                              app.status === 'APPROVED' ? 'bg-state-success/10 text-state-success border-state-success/20 shadow-[0_0_12px_rgba(34,197,94,0.1)]' : 
                              'bg-state-error/10 text-state-error border-state-error/20 shadow-[0_0_12px_rgba(239,68,68,0.1)]'
                           }`}>
                              {app.status}
                           </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                           <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setDetailsModal(app)}
                                className="px-3 py-1.5 rounded-lg bg-bg-surface border border-ui-border text-[11px] font-bold text-text-primary hover:bg-ui-border transition-all flex items-center gap-1.5 shadow-sm"
                              >
                                <Eye size={12} /> DETAILS
                              </button>
                              
                              {app.status === 'PENDING' && (
                                <>
                                   <button 
                                      onClick={() => setActionModal({type: 'approve', app})}
                                      className="px-3 py-1.5 rounded-lg bg-state-success/10 text-state-success border border-state-success/20 font-bold text-[11px] hover:bg-state-success hover:text-white hover:shadow-[0_0_12px_rgba(34,197,94,0.3)] transition-all flex items-center gap-1.5"
                                      title="Authorize"
                                   >
                                      <UserPlus size={12} />
                                   </button>
                                   <button 
                                      onClick={() => setActionModal({type: 'reject', app})}
                                      className="px-3 py-1.5 rounded-lg bg-state-error/10 text-state-error border border-state-error/20 font-bold text-[11px] hover:bg-state-error hover:text-white hover:shadow-[0_0_12px_rgba(239,68,68,0.3)] transition-all flex items-center gap-1.5"
                                      title="Reject"
                                   >
                                      <X size={12} />
                                   </button>
                                </>
                              )}
                           </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-6 bg-bg-surface/30 border border-ui-border rounded-2xl flex flex-wrap items-center justify-between gap-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <p className="text-[13px] text-text-muted font-mono whitespace-nowrap">
                QUEUE DENSITY: <span className="text-text-primary font-bold">{totalEntries.toLocaleString()}</span> APPLICATIONS
              </p>
              <div className="hidden sm:block h-4 w-px bg-ui-border"></div>
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="text-[11px] text-text-muted font-mono uppercase tracking-widest whitespace-nowrap">Items per page:</span>
                <select 
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-bg-input border border-ui-border text-text-primary text-[13px] rounded-lg px-2 py-1 outline-none focus:border-brand-indigo/50"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ui-border text-[12px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-input disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={14} /> PREV
              </button>
              <div className="hidden sm:flex items-center gap-1.5">
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                  
                  if (endPage - startPage + 1 < maxVisible) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`w-8 h-8 rounded-lg text-[13px] font-medium flex items-center justify-center transition-all ${
                          currentPage === i 
                            ? 'bg-brand-indigo text-white shadow-lg' 
                            : 'text-text-muted hover:text-text-primary hover:bg-bg-input'
                        }`}
                      >
                        {i}
                      </button>
                    );
                  }
                  return pages;
                })()}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ui-border text-[12px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-input disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                NEXT <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      <AnimatePresence>
         {actionModal && (
            <>
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 onClick={() => setActionModal(null)}
                 className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
               >
                  <motion.div 
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: -20 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-bg-canvas border border-ui-border rounded-[32px] p-10 w-full max-w-[500px] shadow-2xl overflow-hidden relative"
                  >
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-indigo to-transparent" />
                     
                     <h3 className="text-[28px] font-serif italic text-text-primary mb-6">
                        {actionModal.type === 'approve' ? 'Authorize Practitioner' : 'Decline Application'}
                     </h3>

                     {actionModal.type === 'approve' ? (
                        <div className="space-y-6">
                           <p className="text-[15px] text-text-muted leading-relaxed">
                              You are about to authorize <span className="text-text-primary font-bold">{actionModal.app.first_name} {actionModal.app.last_name}</span>. 
                              This will automatically:
                           </p>
                           <div className="space-y-3">
                              {[
                                'Provision a secure clinical practitioner account',
                                'Generate and encrypt temporary access credentials',
                                'Notify the applicant via secure synchronization'
                              ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 text-[13px] text-text-primary font-medium bg-bg-surface p-3 rounded-xl border border-ui-border">
                                   <Check size={14} className="text-state-success" /> {item}
                                </div>
                              ))}
                           </div>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           <p className="text-[15px] text-text-muted">Please specify the justification for declining this application:</p>
                           <textarea 
                              placeholder="e.g. Insufficient specialization proof or non-matching license ID..."
                              className="w-full h-32 bg-bg-surface border border-ui-border rounded-2xl p-4 text-text-primary text-[14px] focus:border-state-error/50 outline-none transition-all resize-none"
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                           />
                        </div>
                     )}

                     <div className="flex gap-4 mt-10">
                        <button 
                          onClick={() => setActionModal(null)}
                          className="flex-1 py-4 rounded-xl border border-ui-border text-[13px] font-bold text-text-muted hover:bg-bg-surface transition-all"
                        >
                           CANCEL
                        </button>
                        <button 
                          disabled={actionMutation.isPending}
                          onClick={() => handleAction(actionModal.type, actionModal.app.id)}
                          className={`flex-1 py-4 rounded-xl font-bold text-[13px] text-white transition-all shadow-xl ${
                             actionModal.type === 'approve' ? 'bg-state-success hover:shadow-state-success/20' : 'bg-state-error hover:shadow-state-error/20'
                          }`}
                        >
                           {actionMutation.isPending ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'CONFIRM OVERSIGHT'}
                        </button>
                     </div>
                  </motion.div>
               </motion.div>
            </>
         )}

         {detailsModal && (
            <>
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 onClick={() => setDetailsModal(null)}
                 className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
               >
                  <motion.div 
                    initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: -20 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-bg-canvas border border-ui-border rounded-[32px] p-8 md:p-10 w-full max-w-[700px] shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto"
                  >
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-indigo to-transparent" />
                     
                     <div className="flex justify-between items-start mb-8">
                        <div>
                           <h3 className="text-[28px] font-serif italic text-text-primary leading-tight">Practitioner Dossier</h3>
                           <p className="text-[14px] text-text-muted mt-1 font-mono">ID: {detailsModal.id}</p>
                        </div>
                        <button 
                           onClick={() => setDetailsModal(null)}
                           className="p-2 bg-bg-surface hover:bg-ui-border rounded-full transition-colors"
                        >
                           <X size={20} className="text-text-muted" />
                        </button>
                     </div>

                     <div className="flex items-center gap-6 mb-10 pb-10 border-b border-ui-border">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-indigo/20 to-transparent border border-white/5 flex items-center justify-center text-brand-lavender text-[32px] font-bold shadow-inner">
                           {detailsModal.first_name?.[0]}{detailsModal.last_name?.[0]}
                        </div>
                        <div>
                           <h4 className="text-[26px] font-bold text-text-primary">{detailsModal.first_name} {detailsModal.last_name}</h4>
                           <div className="flex flex-wrap items-center gap-4 mt-3">
                              <span className="flex items-center gap-2 text-[13px] text-text-muted"><Mail size={14}/> {detailsModal.email}</span>
                              <span className="flex items-center gap-2 text-[13px] text-text-muted"><MapPin size={14}/> {detailsModal.city || 'N/A'}</span>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="space-y-6">
                           <div>
                              <p className="text-[11px] font-mono text-text-muted uppercase tracking-widest mb-2">Specialty & Experience</p>
                              <div className="flex items-center gap-3 text-[15px] font-medium text-text-primary bg-bg-surface p-4 rounded-2xl border border-ui-border">
                                 <Briefcase className="text-brand-indigo" size={18} />
                                 {detailsModal.specialty || 'General Practitioner'} • {detailsModal.years_of_experience || 0} Years
                              </div>
                           </div>
                           <div>
                              <p className="text-[11px] font-mono text-text-muted uppercase tracking-widest mb-2">License Registration</p>
                              <div className="flex items-center gap-3 text-[15px] font-mono text-text-primary bg-bg-surface p-4 rounded-2xl border border-ui-border">
                                 <ShieldAlert className="text-brand-indigo" size={18} />
                                 {detailsModal.license_number || 'PENDING VERIFICATION'}
                              </div>
                           </div>
                        </div>
                        <div className="space-y-6">
                           <div>
                              <p className="text-[11px] font-mono text-text-muted uppercase tracking-widest mb-2">Clinic Information</p>
                              <div className="p-4 rounded-2xl border border-ui-border bg-bg-surface/50">
                                 <p className="text-[15px] font-bold text-text-primary mb-1">{detailsModal.clinic_name || 'Independent Practice'}</p>
                                 <p className="text-[13px] text-text-muted leading-relaxed">{detailsModal.clinic_address || 'Address not provided'}</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     {detailsModal.motivation_message && (
                        <div className="mb-10">
                           <p className="text-[11px] font-mono text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                              <MessageSquare size={14} /> Personal Statement
                           </p>
                           <div className="p-5 rounded-2xl border border-ui-border bg-bg-surface/50 text-[14px] text-text-primary leading-relaxed italic">
                              "{detailsModal.motivation_message}"
                           </div>
                        </div>
                     )}

                     {detailsModal.status === 'PENDING' && (
                        <div className="flex gap-4 pt-6 border-t border-ui-border">
                           <button 
                              onClick={() => {
                                 setActionModal({type: 'approve', app: detailsModal});
                                 setDetailsModal(null);
                              }}
                              className="flex-1 py-4 rounded-xl bg-state-success/10 text-state-success border border-state-success/20 font-bold text-[13px] hover:bg-state-success hover:text-white transition-all flex items-center justify-center gap-2"
                           >
                              <UserPlus size={16} /> AUTHORIZE PRACTITIONER
                           </button>
                           <button 
                              onClick={() => {
                                 setActionModal({type: 'reject', app: detailsModal});
                                 setDetailsModal(null);
                              }}
                              className="flex-1 py-4 rounded-xl bg-state-error/10 text-state-error border border-state-error/20 font-bold text-[13px] hover:bg-state-error hover:text-white transition-all flex items-center justify-center gap-2"
                           >
                              <X size={16} /> DECLINE
                           </button>
                        </div>
                     )}
                  </motion.div>
               </motion.div>
            </>
         )}
      </AnimatePresence>
    </div>
  );
}
