import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { CreditCard, Banknote, ShieldCheck, CheckCircle2, History, Loader2, FileText, Eye, ChevronLeft, ChevronRight, X, Copy } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as billingService from '../../services/billingService';
import { payInvoice } from '../../services/patientService';
import { format } from 'date-fns';
import { useToast } from '../../components/Toast';

export default function PatientBilling() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  
  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Queries
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['patient-invoices'],
    queryFn: () => billingService.getInvoices()
  });

  const invoices = invoicesData?.results || [];

  // Mutations
  const payMutation = useMutation({
    mutationFn: ({ invoiceId, paymentMethod }: { invoiceId: string; paymentMethod: 'CASH' | 'CARD' | 'INSURANCE' | 'ONLINE' }) =>
      payInvoice(invoiceId, paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-invoices'] });
      addToast(t('patient.billing.paymentSuccess') || 'Payment successful', 'success');
      setShowPayModal(null);
    },
    onError: (error: any) => {
      addToast(error.response?.data?.detail || 'Payment failed', 'error');
    },
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
    totalPending: invoices.filter((i:any) => ['PENDING', 'UNPAID', 'OVERDUE', 'PARTIAL'].includes(i.status)).reduce((acc:any, curr:any) => acc + Number(curr.amount_total || curr.amount || 0), 0),
    totalCollected: invoices.filter((i:any) => i.status === 'PAID').reduce((acc:any, curr:any) => acc + Number(curr.amount_total || curr.amount || 0), 0),
    thisMonthCount: invoices.length
  };

  const PaymentIcon = ({ method }: { method: string }) => {
    switch(method) {
      case 'CASH': return <Banknote size={14} className="text-[#22C55E]" />;
      case 'CARD': return <CreditCard size={14} className="text-brand-indigo" />;
      case 'ONLINE': return <CheckCircle2 size={14} className="text-brand-indigo" />;
      case 'INSURANCE': return <ShieldCheck size={14} className="text-brand-lavender" />;
      default: return <CreditCard size={14} className="text-brand-indigo" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'PAID': return 'bg-[#22C55E1A] text-[#22C55E] border border-[#22C55E3A]';
      case 'PENDING': 
      case 'UNPAID':
      case 'PARTIAL': return 'bg-state-warning/10 text-state-warning border border-state-warning/20';
      case 'CANCELLED': 
      case 'OVERDUE': return 'bg-state-error/10 text-state-error border border-state-error/20';
      case 'REFUNDED': return 'bg-brand-lavender/10 text-brand-lavender border border-brand-lavender/20';
      default: return 'bg-bg-input text-text-muted border border-ui-border';
    }
  };

  const copyToClipboard = (text: string) => {
     navigator.clipboard.writeText(text);
     addToast('Invoice number copied!', 'success');
  };

  // Filter and Pagination Logic
  const filteredInvoices = invoices.filter((inv: any) => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return ['PENDING', 'UNPAID', 'PARTIAL', 'OVERDUE'].includes(inv.status);
    if (filter === 'PAID') return inv.status === 'PAID';
    return true;
  });
  
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
           <h1 className="text-[40px] font-sans text-text-primary leading-tight">{t('patient.nav.billing') || 'Billing'}</h1>
           <p className="text-[16px] text-text-muted mt-1 font-sans">Your invoices and payment history.</p>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-bg-surface border border-ui-border rounded-3xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
               <div className="text-[13px] font-medium text-text-muted">Amount Due</div>
               <div className="text-[28px] font-mono text-state-warning font-bold mt-1">{stats.totalPending.toLocaleString()} <span className="text-[14px] font-sans font-normal opacity-70">MAD</span></div>
            </div>
            <div className="w-14 h-14 rounded-full bg-state-warning/10 flex items-center justify-center text-state-warning"><History size={24} /></div>
         </div>
         <div className="bg-bg-surface border border-ui-border rounded-3xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
               <div className="text-[13px] font-medium text-text-muted">Total Paid</div>
               <div className="text-[28px] font-mono text-[#22C55E] font-bold mt-1">{stats.totalCollected.toLocaleString()} <span className="text-[14px] font-sans font-normal opacity-70">MAD</span></div>
            </div>
            <div className="w-14 h-14 rounded-full bg-[#22C55E1A] flex items-center justify-center text-[#22C55E]"><Banknote size={24} /></div>
         </div>
         <div className="bg-bg-surface border border-ui-border rounded-3xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
               <div className="text-[13px] font-medium text-text-muted">Invoices</div>
               <div className="text-[28px] font-mono text-brand-indigo font-bold mt-1">{stats.thisMonthCount}</div>
            </div>
            <div className="w-14 h-14 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo"><FileText size={24} /></div>
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
             <p className="text-text-muted font-sans text-[14px]">You do not have any invoices matching the selected filter.</p>
           </div>
         ) : paginatedInvoices.map((inv: any, i: number) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              key={inv.id}
              className={`bg-bg-surface border border-ui-border rounded-2xl p-6 relative flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md hover:border-text-primary/20 ${inv.status === 'CANCELLED' ? 'opacity-50 grayscale' : ''}`}
            >
               <div className={`absolute left-0 top-0 bottom-0 w-[4px] rounded-l-2xl ${inv.status==='PAID' ? 'bg-[#22C55E]' : ['PENDING', 'UNPAID', 'OVERDUE'].includes(inv.status) ? 'bg-state-warning' : 'bg-ui-border'}`}></div>
               
               <div className="pl-4 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                     <span className="text-[15px] font-bold text-text-primary flex items-center gap-2 group">
                        <span className="font-mono text-[14px] text-text-primary">#{inv.id.substring(0, 8)}</span>
                        <button onClick={() => copyToClipboard(inv.id)} className="text-brand-lavender opacity-0 group-hover:opacity-100 transition-opacity">
                           <Copy size={14} />
                        </button>
                     </span>
                     <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider ${getStatusBadgeClass(inv.status)}`}>
                        {inv.status}
                     </span>
                  </div>
                  <div className="text-[13px] font-mono text-text-muted flex items-center gap-3">
                     <span className="opacity-70">{format(new Date(inv.created_at), 'dd MMM yyyy')}</span>
                     <div className="w-1 h-1 rounded-full bg-ui-border"></div>
                     <span className="opacity-70">{inv.consultation_details ? `Consultation Invoice` : 'General Invoice'}</span>
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
                     {Number(inv.amount_total || inv.amount || 0).toLocaleString()} <span className="text-[14px] font-sans font-medium text-text-muted ml-1">MAD</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <button onClick={() => setShowDetailsModal(inv)} className="px-5 py-2.5 bg-brand-indigo/5 hover:bg-brand-indigo text-brand-indigo hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap group">
                        <Eye size={16} className="text-brand-indigo group-hover:text-white transition-colors" />
                        <span>View Details</span>
                     </button>
                     
                     {['PENDING', 'UNPAID', 'OVERDUE', 'PARTIAL'].includes(inv.status) && (
                        <button onClick={() => setShowPayModal(inv)} className="px-5 py-2.5 bg-brand-indigo hover:bg-[#6C6BFF] text-white rounded-xl text-[13px] font-medium transition-all shadow-[0_4px_12px_rgba(75,74,207,0.2)] hover:shadow-[0_6px_20px_rgba(75,74,207,0.4)] flex items-center gap-2 relative overflow-hidden group whitespace-nowrap">
                           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                           <CreditCard size={16} /> Pay Online
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

      {/* Pay Invoice Modal */}
      <AnimatePresence>
         {showPayModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPayModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-3xl p-8 w-full max-w-[440px] shadow-2xl relative z-10">
                 <h2 className="text-[22px] font-sans text-text-primary mb-6">Pay Invoice</h2>
                 
                 <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center py-4 border-b border-ui-border">
                       <span className="text-[14px] text-text-muted">Amount Due</span>
                       <span className="text-[18px] font-mono text-text-primary font-bold">{Number(showPayModal.amount_total || showPayModal.amount || 0).toLocaleString()} MAD</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-ui-border">
                       <span className="text-[14px] text-text-muted">Invoice ID</span>
                       <span className="text-[15px] font-mono text-text-primary font-medium">#{showPayModal.id.substring(0, 8)}</span>
                    </div>
                    
                    <div className="pt-4">
                       <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-4 block">Select Payment Method</label>
                       <div className="grid grid-cols-2 gap-3">
                          <button 
                            disabled={payMutation.isPending}
                            onClick={() => payMutation.mutate({ invoiceId: showPayModal.id, paymentMethod: 'CARD' })} 
                            className="flex flex-col items-center gap-3 p-4 border border-ui-border hover:border-brand-indigo/50 hover:bg-brand-indigo/5 rounded-2xl transition-all disabled:opacity-50 group"
                          >
                             <CreditCard size={24} className="text-text-muted group-hover:text-brand-indigo transition-colors" />
                             <span className="text-[13px] font-medium text-text-primary">Credit Card</span>
                          </button>
                          <button 
                            disabled={payMutation.isPending}
                            onClick={() => payMutation.mutate({ invoiceId: showPayModal.id, paymentMethod: 'ONLINE' })} 
                            className="flex flex-col items-center gap-3 p-4 border border-ui-border hover:border-[#22C55E]/50 hover:bg-[#22C55E]/5 rounded-2xl transition-all disabled:opacity-50 group"
                          >
                             <CheckCircle2 size={24} className="text-text-muted group-hover:text-[#22C55E] transition-colors" />
                             <span className="text-[13px] font-medium text-text-primary">Mobile Payment</span>
                          </button>
                       </div>
                    </div>
                 </div>

                 {payMutation.isPending && (
                    <div className="flex items-center justify-center gap-2 text-text-muted text-[14px] mb-4">
                       <Loader2 className="w-5 h-5 animate-spin" />
                       Processing payment securely...
                    </div>
                 )}

                 <div className="flex items-center justify-end gap-3">
                    <button onClick={() => setShowPayModal(null)} className="px-6 py-3 rounded-xl text-text-muted hover:bg-bg-input hover:text-text-primary text-[14px] font-medium transition-colors" disabled={payMutation.isPending}>Cancel</button>
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
                       <div className="flex items-center justify-between mb-4">
                          <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase">Payment Details</div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider ${getStatusBadgeClass(showDetailsModal.status)}`}>
                             {showDetailsModal.status}
                          </span>
                       </div>
                       
                       <div className="space-y-3 border-b border-ui-border border-dashed pb-4 mb-4">
                          <div className="flex justify-between items-center">
                             <span className="text-[13px] text-text-muted">Total Amount</span>
                             <span className="text-[20px] font-mono font-bold text-text-primary">{Number(showDetailsModal.amount_total || showDetailsModal.amount || 0).toLocaleString()} <span className="text-[12px] font-sans text-text-muted">MAD</span></span>
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
