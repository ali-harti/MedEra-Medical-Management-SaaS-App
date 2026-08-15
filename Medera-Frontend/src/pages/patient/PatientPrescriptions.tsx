import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Pill, Download, Loader2, Check, Eye, X, FileSignature } from 'lucide-react';
import * as prescriptionService from '../../services/prescriptionService';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '../../components/Toast';
import { format } from 'date-fns';

export default function PatientPrescriptions() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  
  const { data: prescriptionsData, isLoading } = useQuery({
    queryKey: ['patient-prescriptions'],
    queryFn: () => prescriptionService.getPrescriptions({ page: 1 })
  });

  const prescriptions = Array.isArray(prescriptionsData) ? prescriptionsData : (prescriptionsData?.results || []);

  const [activeFilter, setActiveFilter] = useState('All');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const filteredPrescriptions = prescriptions.filter((p: any) => {
    if (activeFilter === 'Valid') return p.is_valid === true;
    if (activeFilter === 'Cancelled') return p.is_valid === false;
    return true;
  });

  const totalPages = Math.ceil(filteredPrescriptions.length / itemsPerPage);
  const currentItems = filteredPrescriptions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDownload = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadingId(id);
      await prescriptionService.downloadPrescriptionPdf(id);
      addToast(t('patient.pres.downloaded') || 'PDF downloaded successfully', 'success');
    } catch (error) {
      addToast('Failed to download PDF', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-indigo" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-[36px] font-serif italic text-text-primary leading-tight">My Prescriptions</h2>
          <p className="text-[16px] text-text-muted mt-1">Your current and past prescriptions.</p>
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
          {['All', 'Valid', 'Cancelled'].map((f) => (
             <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`relative px-5 py-2.5 text-[14px] font-medium transition-all rounded-full whitespace-nowrap flex items-center gap-2 ${activeFilter === f ? 'bg-brand-indigo text-white shadow-sm' : 'bg-white border border-ui-border text-brand-indigo hover:bg-bg-input'}`}
             >
                {f}
             </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <AnimatePresence>
           {currentItems.map((pres: any, i: number) => {
              const isCancelled = pres.is_valid === false;
              const isDownloading = downloadingId === pres.id;
              
              return (
                 <motion.div
                    key={pres.id}
                    layoutId={pres.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-white border border-ui-border rounded-[1.5rem] p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-text-primary/20 relative group overflow-hidden ${isCancelled ? 'opacity-70 grayscale-[0.5]' : ''}`}
                 >
                    {/* Left Accent Border */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[6px] group-hover:w-[8px] transition-all duration-300 ${isCancelled ? 'bg-state-error' : 'bg-[#22C55E]'}`}></div>

                    <div className="flex items-center gap-4 pl-3">
                       <div>
                          <div className="flex items-center gap-2">
                             <span className="text-[15px] font-medium text-text-primary font-sans">{pres.doctor_name || 'Dr. Karim Benali'}</span>
                             <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono font-bold tracking-wider ${!isCancelled ? 'bg-[#22C55E1A] text-[#22C55E]' : 'bg-state-error/10 text-state-error'}`}>
                               {!isCancelled ? 'VALID' : 'CANCELLED'}
                             </span>
                          </div>
                          <div className="text-[12px] font-mono text-text-muted mt-1 flex items-center gap-2">
                             <span>#{pres.id.substring(0,8)}</span>
                             <span className="w-1 h-1 rounded-full bg-ui-border"></span>
                             <span>{format(new Date(pres.issued_at || pres.created_at || new Date()), 'dd MMM yyyy')}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                       <button onClick={(e) => { e.stopPropagation(); setShowDetailsModal(pres); }} className="px-5 py-2.5 bg-brand-indigo/5 hover:bg-brand-indigo text-brand-indigo hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap group">
                         <Eye size={16} className="text-brand-indigo group-hover:text-white transition-colors" />
                         <span>View Details</span>
                       </button>
                       <button onClick={(e) => handleDownload(pres.id, e)} disabled={isCancelled || isDownloading} className={`px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap group ${isCancelled ? 'bg-bg-surface border border-ui-border text-text-muted cursor-not-allowed' : 'bg-brand-indigo/5 hover:bg-brand-indigo text-brand-indigo hover:text-white'}`}>
                         {isDownloading ? (
                           <><Loader2 className="w-4 h-4 animate-spin text-brand-indigo group-hover:text-white" /> <span>PDF</span></>
                         ) : (
                           <><Download size={16} className="text-brand-indigo group-hover:text-white transition-colors" /> <span>PDF</span></>
                         )}
                       </button>
                    </div>
                 </motion.div>
              );
           })}
        </AnimatePresence>

        {filteredPrescriptions.length === 0 && (
           <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-[1.5rem] border border-ui-border border-dashed">
             <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
               <FileSignature className="w-16 h-16 text-brand-indigo/60 mb-6" />
             </motion.div>
             <h3 className="text-[28px] font-serif italic text-text-primary mb-2">No prescriptions here</h3>
             <p className="text-[15px] text-text-muted">They will appear here after your consultations.</p>
           </div>
        )}
      </div>
      {totalPages > 1 && (
         <div className="flex items-center justify-between mt-6">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-[13px] font-medium text-text-primary bg-bg-surface border border-ui-border rounded-xl disabled:opacity-50 hover:bg-bg-input transition-colors"
            >
              Previous
            </button>
            <div className="text-[13px] text-text-muted">
              Page {currentPage} of {totalPages}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-[13px] font-medium text-text-primary bg-bg-surface border border-ui-border rounded-xl disabled:opacity-50 hover:bg-bg-input transition-colors"
            >
              Next
            </button>
         </div>
      )}

      {/* View Details Modal */}
      <AnimatePresence>
         {showDetailsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDetailsModal(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-3xl w-full max-w-[500px] shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden">
                 <div className="px-8 py-6 border-b border-ui-border shrink-0 flex items-center justify-between">
                    <h2 className="text-[22px] font-sans font-medium text-text-primary flex items-center gap-2">
                       <FileSignature size={20} className="text-brand-indigo" /> Prescription Details
                    </h2>
                    <button type="button" onClick={() => setShowDetailsModal(null)} className="w-10 h-10 rounded-full hover:bg-bg-input flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"><X size={20}/></button>
                 </div>
                 
                 <div className="flex-1 min-h-0 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-bg-surface border border-ui-border rounded-2xl">
                          <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-1">Prescription ID</div>
                          <div className="text-[14px] font-mono text-text-primary">#{showDetailsModal.id.substring(0, 8)}</div>
                       </div>
                       <div className="p-4 bg-bg-surface border border-ui-border rounded-2xl">
                          <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-1">Date</div>
                          <div className="text-[14px] font-mono text-text-primary">{format(new Date(showDetailsModal.issued_at || showDetailsModal.created_at || new Date()), 'dd MMM yyyy')}</div>
                       </div>
                    </div>

                    <div className="p-5 bg-bg-surface border border-ui-border rounded-2xl">
                       <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-3">Doctor Information</div>
                       <div className="text-[16px] font-medium text-text-primary mb-1">{showDetailsModal.doctor_name || 'Dr. Karim Benali'}</div>
                    </div>

                    <div className="p-5 bg-bg-surface border border-ui-border rounded-2xl">
                       <div className="flex items-center justify-between mb-4">
                          <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase">Medications & Details</div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider ${showDetailsModal.is_valid !== false ? 'bg-[#22C55E1A] text-[#22C55E]' : 'bg-state-error/10 text-state-error'}`}>
                             {showDetailsModal.is_valid !== false ? 'VALID' : 'CANCELLED'}
                          </span>
                       </div>
                       
                       <div className="space-y-4">
                          {(showDetailsModal.medications || showDetailsModal.medication_lines || []).map((m: any, idx: number) => (
                            <div key={idx} className="flex gap-4 p-3 bg-bg-input rounded-xl border border-ui-border/50">
                               <div className="w-6 text-[12px] font-mono text-brand-indigo/60 pt-0.5 shrink-0">{(idx+1).toString().padStart(2, '0')}</div>
                               <div>
                                  <div className="text-[14px] font-medium text-text-primary">{m.drug_name || m.medication_name} <span className="text-text-muted font-normal ml-1">{m.dosage}</span></div>
                                  <div className="text-[13px] text-text-muted mt-1">{m.dosology || m.frequency} — {m.duration_days || m.duration}</div>
                                  {(m.special_instructions || m.instructions) && (
                                     <div className="text-[12px] text-brand-indigo mt-2 bg-brand-indigo/5 p-2 rounded-md">{m.special_instructions || m.instructions}</div>
                                  )}
                               </div>
                            </div>
                          ))}
                       </div>
                       
                       {(showDetailsModal.general_instructions || showDetailsModal.notes) && (
                         <div className="mt-4 pt-4 border-t border-ui-border border-dashed">
                            <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2">General Notes</div>
                            <p className="text-[13px] text-text-primary">{showDetailsModal.general_instructions || showDetailsModal.notes}</p>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="px-8 py-6 border-t border-ui-border shrink-0 flex items-center justify-between bg-bg-elevated rounded-b-3xl">
                    <button onClick={(e) => handleDownload(showDetailsModal.id, e)} className="px-5 py-2.5 bg-brand-indigo/5 hover:bg-brand-indigo text-brand-indigo hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap group">
                      <Download size={16} className="text-brand-indigo group-hover:text-white transition-colors" />
                      <span>Download PDF</span>
                    </button>
                    <button type="button" onClick={() => setShowDetailsModal(null)} className="px-6 py-2.5 bg-brand-indigo hover:bg-[#7C75FF] transition-colors rounded-xl text-white font-medium text-[13px] shadow-[0_4px_12px_rgba(99,91,255,0.25)]">
                      Close
                    </button>
                 </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}
