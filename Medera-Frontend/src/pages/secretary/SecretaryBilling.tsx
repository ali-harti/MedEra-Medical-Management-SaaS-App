import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Plus, X, CreditCard, Banknote, ShieldCheck, CheckCircle2, History, AlertTriangle, Check, Loader2, FileText, Eye, ChevronLeft, ChevronRight, Info, Stethoscope } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as billingService from '../../services/billingService';
import * as patientService from '../../services/patientService';
import * as consultationService from '../../services/consultationService';
import * as authService from '../../services/authService';
import { format } from 'date-fns';

export default function SecretaryBilling() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [showMarkPaidModal, setShowMarkPaidModal] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string>('');
  const [billingAmount, setBillingAmount] = useState<string>('');

  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Queries
  
  const { data: employer } = useQuery({
    queryKey: ['employer'],
    queryFn: () => authService.getEmployer().catch(() => null),
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => billingService.getInvoices()
  });

  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.getPatients()
  });

  // Only fetch consultations that have prescriptions (for billing enforcement)
  const { data: billableConsultationsData } = useQuery({
    queryKey: ['consultations', 'FINALIZED', 'has-prescriptions'],
    queryFn: () => consultationService.getConsultations({ status: 'FINALIZED', has_prescription: true }),
    enabled: isNewModalOpen,
  });
  const billableConsultations = billableConsultationsData?.results || (Array.isArray(billableConsultationsData) ? billableConsultationsData : []);
  const selectedConsultation = billableConsultations.find((c: any) => c.id === selectedConsultationId);

  const invoices = invoicesData?.results || [];
  const patients = patientsData?.results || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => billingService.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsNewModalOpen(false);
      setSelectedConsultationId('');
      setBillingAmount('');
    }
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, method }: { id: string, method: any }) => 
      billingService.markInvoicePaid(id, { payment_method: method }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowMarkPaidModal(null);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => billingService.cancelInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  if (invoicesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-brand-indigo animate-spin" />
        <p className="text-text-muted font-mono animate-pulse">Loading billing records...</p>
      </div>
    );
  }

  const stats = {
    totalPending: invoices.filter((i:any) => i.status === 'PENDING').reduce((acc:any, curr:any) => acc + Number(curr.amount_total), 0),
    totalCollected: invoices.filter((i:any) => i.status === 'PAID').reduce((acc:any, curr:any) => acc + Number(curr.amount_total), 0),
    thisMonthCount: invoices.length
  };

  const PaymentIcon = ({ method }: { method: string }) => {
    switch(method) {
      case 'CASH': return <Banknote size={14} className="text-[#22C55E]" />;
      case 'CARD': return <CreditCard size={14} className="text-brand-indigo" />;
      case 'ONLINE': return <CheckCircle2 size={14} className="text-brand-indigo" />;
      case 'INSURANCE': return <ShieldCheck size={14} className="text-brand-lavender" />;
      default: return null;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'PAID': return 'bg-[#22C55E1A] text-[#22C55E] border border-[#22C55E3A]';
      case 'PENDING': return 'bg-state-warning/10 text-state-warning border border-state-warning/20';
      case 'CANCELLED': return 'bg-state-error/10 text-state-error border border-state-error/20';
      case 'REFUNDED': return 'bg-brand-lavender/10 text-brand-lavender border border-brand-lavender/20';
      default: return 'bg-bg-input text-text-muted border border-ui-border';
    }
  };

  // Filter and Pagination Logic
  const filteredInvoices = invoices.filter((inv: any) => filter === 'ALL' || inv.status === filter);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleFilterChange = (newFilter: 'ALL' | 'PENDING' | 'PAID') => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page on filter change
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-600 pb-12 relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
           <h1 className="text-[40px] font-sans text-text-primary leading-tight">{t('secretary.nav.billing') || 'Billing'}</h1>
           <p className="text-[16px] text-text-muted mt-1 font-sans">Manage billing for <span className="text-brand-indigo font-medium">Dr. {employer?.last_name || 'Doctor'}</span></p>
        </div>
        <button onClick={() => setIsNewModalOpen(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-indigo text-white hover:bg-[#7C75FF] rounded-full shadow-[0_4px_16px_rgba(99,91,255,0.3)] hover:shadow-[0_6px_20px_rgba(99,91,255,0.4)] transition-all relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
          <Plus size={18} />
          <span className="font-medium text-[14px]">Generate Invoice</span>
        </button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-bg-surface border border-ui-border rounded-3xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
               <div className="text-[13px] font-medium text-text-muted">Total Pending</div>
               <div className="text-[28px] font-mono text-state-warning font-bold mt-1">{stats.totalPending.toLocaleString()} <span className="text-[14px] font-sans font-normal opacity-70">MAD</span></div>
            </div>
            <div className="w-14 h-14 rounded-full bg-state-warning/10 flex items-center justify-center text-state-warning"><History size={24} /></div>
         </div>
         <div className="bg-bg-surface border border-ui-border rounded-3xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
               <div className="text-[13px] font-medium text-text-muted">Total Collected</div>
               <div className="text-[28px] font-mono text-[#22C55E] font-bold mt-1">{stats.totalCollected.toLocaleString()} <span className="text-[14px] font-sans font-normal opacity-70">MAD</span></div>
            </div>
            <div className="w-14 h-14 rounded-full bg-[#22C55E1A] flex items-center justify-center text-[#22C55E]"><Banknote size={24} /></div>
         </div>
         <div className="bg-bg-surface border border-ui-border rounded-3xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
               <div className="text-[13px] font-medium text-text-muted">Invoices Issued</div>
               <div className="text-[28px] font-mono text-brand-indigo font-bold mt-1">{stats.thisMonthCount}</div>
            </div>
            <div className="w-14 h-14 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo"><CreditCard size={24} /></div>
         </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mt-8">
        <button 
          onClick={() => handleFilterChange('ALL')} 
          className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${filter === 'ALL' ? 'bg-brand-indigo text-white border border-brand-indigo shadow-[0_2px_10px_rgba(99,91,255,0.2)]' : 'bg-bg-surface border border-ui-border text-text-muted hover:text-text-primary hover:border-text-primary/30'}`}
        >
          All Invoices
        </button>
        <button 
          onClick={() => handleFilterChange('PENDING')} 
          className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${filter === 'PENDING' ? 'bg-state-warning/20 text-state-warning border border-state-warning/30' : 'bg-bg-surface border border-ui-border text-text-muted hover:text-state-warning hover:border-state-warning/30'}`}
        >
          Pending
        </button>
        <button 
          onClick={() => handleFilterChange('PAID')} 
          className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${filter === 'PAID' ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30' : 'bg-bg-surface border border-ui-border text-text-muted hover:text-[#22C55E] hover:border-[#22C55E]/30'}`}
        >
          Paid
        </button>
      </div>

      {/* Invoices List */}
      <div className="space-y-4 min-h-[400px]">
         {paginatedInvoices.length === 0 ? (
           <div className="bg-bg-surface rounded-3xl p-16 text-center border border-ui-border border-dashed flex flex-col items-center justify-center">
             <div className="w-16 h-16 rounded-full bg-bg-input flex items-center justify-center mb-4">
               <FileText className="w-8 h-8 text-text-muted" />
             </div>
             <p className="text-text-primary font-medium text-[16px] mb-1">No invoices found</p>
             <p className="text-text-muted font-sans text-[14px]">Try adjusting your filters or create a new invoice.</p>
           </div>
         ) : paginatedInvoices.map((inv: any, i: number) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              key={inv.id}
              className={`bg-bg-surface border border-ui-border rounded-2xl p-6 relative flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md hover:border-text-primary/20 ${inv.status === 'CANCELLED' ? 'opacity-50 grayscale' : ''}`}
            >
               <div className={`absolute left-0 top-0 bottom-0 w-[4px] rounded-l-2xl ${inv.status==='PAID' ? 'bg-[#22C55E]' : inv.status==='PENDING' ? 'bg-state-warning' : 'bg-ui-border'}`}></div>
               
               <div className="pl-4 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                     <span className="text-[15px] font-bold text-text-primary">{inv.patient_name || 'Patient'}</span>
                     <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider ${getStatusBadgeClass(inv.status)}`}>
                        {inv.status}
                     </span>
                  </div>
                  <div className="text-[13px] font-mono text-text-muted flex items-center gap-3">
                     <span className="opacity-70">#{inv.id.substring(0, 8)}</span>
                     <div className="w-1 h-1 rounded-full bg-ui-border"></div>
                     <span className="opacity-70">{format(new Date(inv.created_at), 'dd MMM yyyy')}</span>
                  </div>
                  {inv.payment_method && (
                     <div className="flex items-center gap-1.5 mt-4 text-[11px] font-mono">
                        <span className="text-text-muted px-2.5 py-1 rounded-full border border-ui-border bg-bg-input flex items-center gap-1.5">
                           <PaymentIcon method={inv.payment_method} /> {inv.payment_method}
                        </span>
                     </div>
                  )}
               </div>

               <div className="flex flex-col md:items-end justify-between self-stretch pr-2">
                  <div className="text-[22px] font-mono font-bold text-text-primary text-left md:text-right mb-4 border-t border-ui-border pt-4 md:border-0 md:pt-0">
                     {Number(inv.amount_total).toLocaleString()} <span className="text-[14px] font-sans font-medium text-text-muted ml-1">MAD</span>
                  </div>
                  <div className="flex items-center gap-3">
                     {inv.status === 'PENDING' && (
                       <>
                         <button onClick={() => setShowMarkPaidModal(inv)} className="px-5 py-2.5 bg-[#22C55E]/10 hover:bg-[#22C55E] text-[#22C55E] hover:text-white rounded-xl text-[13px] font-medium transition-all whitespace-nowrap">
                            Mark as Paid
                         </button>
                         <button 
                           onClick={() => { if(window.confirm('Cancel this invoice?')) cancelMutation.mutate(inv.id); }}
                           className="px-5 py-2.5 border border-ui-border text-text-muted hover:border-state-error/30 hover:bg-state-error/10 hover:text-state-error rounded-xl text-[13px] font-medium transition-all whitespace-nowrap"
                         >
                            Cancel
                         </button>
                       </>
                     )}
                     {inv.status === 'PAID' && (
                       <button onClick={() => setShowDetailsModal(inv)} className="px-5 py-2.5 bg-brand-indigo/5 hover:bg-brand-indigo text-brand-indigo hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap group">
                         <Eye size={16} className="text-brand-indigo group-hover:text-white transition-colors" />
                         <span>View Details</span>
                       </button>
                     )}
                  </div>
               </div>
            </motion.div>
         ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-ui-border pt-6 mt-6">
          <div className="text-[13px] text-text-muted font-sans">
            Showing <span className="font-medium text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-text-primary">{Math.min(currentPage * itemsPerPage, filteredInvoices.length)}</span> of <span className="font-medium text-text-primary">{filteredInvoices.length}</span> invoices
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-ui-border rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-input disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-[13px] font-medium transition-colors ${currentPage === idx + 1 ? 'bg-brand-indigo text-white shadow-[0_2px_10px_rgba(99,91,255,0.2)]' : 'text-text-muted hover:bg-bg-input'}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-ui-border rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-input disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      <AnimatePresence>
         {showMarkPaidModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMarkPaidModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-3xl p-8 w-full max-w-[440px] shadow-2xl relative z-10">
                 <h2 className="text-[22px] font-sans text-text-primary mb-6">Mark Invoice as Paid?</h2>
                 
                 <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center py-4 border-b border-ui-border">
                       <span className="text-[14px] text-text-muted">Amount</span>
                       <span className="text-[18px] font-mono text-text-primary font-bold">{Number(showMarkPaidModal.amount_total).toLocaleString()} MAD</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-ui-border">
                       <span className="text-[14px] text-text-muted">Patient</span>
                       <span className="text-[15px] text-text-primary font-medium">{showMarkPaidModal.patient_name}</span>
                    </div>
                    
                    <div className="pt-4">
                       <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-4 block">Payment Method</label>
                       <div className="grid grid-cols-3 gap-3">
                          <button 
                            disabled={markPaidMutation.isPending}
                            onClick={() => markPaidMutation.mutate({ id: showMarkPaidModal.id, method: 'CASH' })} 
                            className="flex flex-col items-center gap-3 p-4 border border-ui-border hover:border-[#22C55E]/50 hover:bg-[#22C55E]/5 rounded-2xl transition-all disabled:opacity-50 group"
                          >
                             <Banknote size={24} className="text-text-muted group-hover:text-[#22C55E] transition-colors" />
                             <span className="text-[13px] font-medium text-text-primary">Cash</span>
                          </button>
                          <button 
                            disabled={markPaidMutation.isPending}
                            onClick={() => markPaidMutation.mutate({ id: showMarkPaidModal.id, method: 'CARD' })} 
                            className="flex flex-col items-center gap-3 p-4 border border-ui-border hover:border-brand-indigo/50 hover:bg-brand-indigo/5 rounded-2xl transition-all disabled:opacity-50 group"
                          >
                             <CreditCard size={24} className="text-text-muted group-hover:text-brand-indigo transition-colors" />
                             <span className="text-[13px] font-medium text-text-primary">Card</span>
                          </button>
                          <button 
                            disabled={markPaidMutation.isPending}
                            onClick={() => markPaidMutation.mutate({ id: showMarkPaidModal.id, method: 'INSURANCE' })} 
                            className="flex flex-col items-center gap-3 p-4 border border-ui-border hover:border-brand-lavender/50 hover:bg-brand-lavender/5 rounded-2xl transition-all disabled:opacity-50 group"
                          >
                             <ShieldCheck size={24} className="text-text-muted group-hover:text-brand-lavender transition-colors" />
                             <span className="text-[13px] font-medium text-text-primary">Insurance</span>
                          </button>
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center justify-end gap-3">
                    <button onClick={() => setShowMarkPaidModal(null)} className="px-6 py-3 rounded-xl text-text-muted hover:bg-bg-input hover:text-text-primary text-[14px] font-medium transition-colors">Cancel</button>
                 </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Generate Invoice Modal */}
      <AnimatePresence>
         {isNewModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsNewModalOpen(false); setSelectedConsultationId(''); setBillingAmount(''); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-3xl w-full max-w-[520px] shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
                 <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-ui-border shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo"><CreditCard size={20} /></div>
                      <h2 className="text-[22px] font-sans font-medium text-text-primary">Generate Invoice</h2>
                    </div>
                    <button type="button" onClick={() => { setIsNewModalOpen(false); setSelectedConsultationId(''); setBillingAmount(''); }} className="w-10 h-10 rounded-full hover:bg-bg-input flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"><X size={20}/></button>
                 </div>

                 <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar space-y-5">

                   {/* Workflow info banner */}
                   <div className="flex items-start gap-3 p-4 bg-brand-indigo/5 border border-brand-indigo/20 rounded-xl">
                     <Info size={16} className="text-brand-indigo shrink-0 mt-0.5" />
                     <p className="text-[13px] text-text-muted leading-relaxed">
                       An invoice can only be issued for a consultation that already has a <span className="text-brand-indigo font-medium">prescription</span>. Select the consultation below.
                     </p>
                   </div>

                   {/* Consultation with prescription selector */}
                   <div>
                     <label className="text-[12px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Consultation with Prescription <span className="text-state-error">*</span></label>
                     <select
                       value={selectedConsultationId}
                       onChange={e => setSelectedConsultationId(e.target.value)}
                       required
                       className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3.5 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all appearance-none cursor-pointer"
                     >
                       <option value="">Select a consultation...</option>
                       {billableConsultations.map((c: any) => (
                         <option key={c.id} value={c.id}>
                           {c.patient_details?.first_name || 'Patient'} {c.patient_details?.last_name || ''} — {format(new Date(c.finalized_at || c.created_at || new Date()), 'dd MMM yyyy')} {c.motive ? `(${c.motive})` : ''}
                         </option>
                       ))}
                     </select>
                     {billableConsultations.length === 0 && (
                       <p className="text-[12px] text-state-warning font-mono mt-1.5">⚠ No consultations with prescriptions found. Issue a prescription first.</p>
                     )}
                   </div>

                   {/* Auto-filled patient preview */}
                   {selectedConsultation && (
                     <div className="flex items-center gap-3 p-4 bg-[#22C55E]/5 border border-[#22C55E]/20 rounded-xl">
                       <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-lavender flex items-center justify-center text-white text-[13px] font-bold shrink-0">
                         {selectedConsultation.patient_details?.first_name?.[0] || 'P'}
                       </div>
                       <div className="flex-1">
                         <div className="text-[14px] font-medium text-text-primary">{selectedConsultation.patient_details?.first_name} {selectedConsultation.patient_details?.last_name}</div>
                         <div className="text-[12px] font-mono text-text-muted">CIN: {selectedConsultation.patient_details?.cin || 'N/A'}</div>
                       </div>
                       <div className="flex items-center gap-1.5">
                         <Stethoscope size={13} className="text-brand-indigo" />
                         <span className="text-[11px] font-mono text-brand-indigo font-bold">Rx ISSUED</span>
                       </div>
                     </div>
                   )}

                   {/* Amount */}
                   <div>
                     <label className="text-[12px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Amount (MAD) <span className="text-state-error">*</span></label>
                     <input
                       type="number"
                       min="1"
                       step="0.01"
                       placeholder="0.00"
                       value={billingAmount}
                       onChange={e => setBillingAmount(e.target.value)}
                       required
                       className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3.5 text-[20px] font-mono font-bold text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all"
                     />
                   </div>

                   {/* Notes */}
                   <div>
                     <label className="text-[12px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Notes (Optional)</label>
                     <textarea
                       id="billing-notes"
                       placeholder="e.g. Consultation + prescription fee"
                       className="w-full bg-bg-input border border-ui-border rounded-xl p-4 min-h-[80px] text-[14px] font-sans text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all resize-y"
                     />
                   </div>
                 </div>

                 <div className="px-8 py-6 border-t border-ui-border shrink-0 rounded-b-3xl bg-bg-surface/80">
                   {!selectedConsultationId && (
                     <p className="text-[12px] text-text-muted font-mono mb-3 text-center">Select a consultation with a prescription to proceed.</p>
                   )}
                   <button
                     type="button"
                     disabled={createMutation.isPending || !selectedConsultationId || !billingAmount}
                     onClick={() => {
                       const amount = Number(billingAmount);
                       const patientId = selectedConsultation?.patient || selectedConsultation?.patient_details?.id;
                       const notes = (document.getElementById('billing-notes') as HTMLTextAreaElement)?.value || '';
                       if (amount > 0 && patientId && selectedConsultationId) {
                         createMutation.mutate({
                           patient: patientId,
                           consultation: selectedConsultationId,
                           amount_total: amount,
                           notes,
                         });
                       }
                     }}
                     className="w-full py-4 bg-brand-indigo hover:bg-[#7C75FF] transition-colors rounded-xl text-white font-medium text-[15px] shadow-[0_4px_12px_rgba(99,91,255,0.25)] flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {createMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <><CreditCard size={18} /> Generate Invoice</>}
                   </button>
                 </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Invoice Details Modal */}
      <AnimatePresence>
         {showDetailsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDetailsModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-3xl p-8 w-full max-w-[500px] shadow-2xl relative z-10">
                 <div className="flex items-center justify-between mb-8 border-b border-ui-border pb-5">
                    <h2 className="text-[22px] font-sans font-medium text-text-primary flex items-center gap-2">
                       <FileText size={20} className="text-brand-indigo" /> Invoice Details
                    </h2>
                    <button type="button" onClick={() => setShowDetailsModal(null)} className="w-10 h-10 rounded-full hover:bg-bg-input flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"><X size={20}/></button>
                 </div>
                 
                 <div className="space-y-6 mb-8">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-bg-surface border border-ui-border rounded-2xl">
                          <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-1">Invoice ID</div>
                          <div className="text-[14px] font-mono text-text-primary">#{showDetailsModal.id.substring(0, 8)}</div>
                       </div>
                       <div className="p-4 bg-bg-surface border border-ui-border rounded-2xl">
                          <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-1">Date</div>
                          <div className="text-[14px] font-mono text-text-primary">{format(new Date(showDetailsModal.created_at), 'dd MMM yyyy')}</div>
                       </div>
                    </div>

                    <div className="p-5 bg-bg-surface border border-ui-border rounded-2xl">
                       <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-3">Patient Information</div>
                       <div className="text-[16px] font-medium text-text-primary mb-1">{showDetailsModal.patient_name}</div>
                    </div>

                    <div className="p-5 bg-bg-surface border border-ui-border rounded-2xl">
                       <div className="flex items-center justify-between mb-4">
                          <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase">Payment Details</div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider ${getStatusBadgeClass(showDetailsModal.status)}`}>
                             {showDetailsModal.status}
                          </span>
                       </div>
                       
                       <div className="space-y-3 border-b border-ui-border border-dashed pb-4 mb-4">
                          <div className="flex justify-between items-center">
                             <span className="text-[13px] text-text-muted">Total Amount</span>
                             <span className="text-[20px] font-mono font-bold text-text-primary">{Number(showDetailsModal.amount_total).toLocaleString()} <span className="text-[12px] font-sans text-text-muted">MAD</span></span>
                          </div>
                          {showDetailsModal.payment_method && (
                             <div className="flex justify-between items-center">
                                <span className="text-[13px] text-text-muted">Payment Method</span>
                                <span className="text-[13px] font-medium text-text-primary flex items-center gap-1.5">
                                   <PaymentIcon method={showDetailsModal.payment_method} /> {showDetailsModal.payment_method}
                                </span>
                             </div>
                          )}
                       </div>
                       
                       {showDetailsModal.notes && (
                         <div>
                            <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2">Notes</div>
                            <p className="text-[13px] text-text-primary bg-bg-input p-3 rounded-xl">{showDetailsModal.notes}</p>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="flex items-center justify-end gap-3">
                    <button onClick={() => setShowDetailsModal(null)} className="px-6 py-3 bg-brand-indigo hover:bg-[#7C75FF] transition-colors rounded-xl text-white font-medium text-[14px] shadow-[0_4px_12px_rgba(99,91,255,0.25)]">Close</button>
                 </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}
