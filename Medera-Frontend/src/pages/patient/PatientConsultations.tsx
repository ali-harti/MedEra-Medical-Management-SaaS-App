import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ChevronRight, Heart, Thermometer, Activity, Weight, Download, Pill, Lock, AlertTriangle, Video, Loader2, Calendar, FileText, X } from 'lucide-react';
import * as consultationService from '../../services/consultationService';
import * as prescriptionService from '../../services/prescriptionService';
import { useQuery } from '@tanstack/react-query';
import { TypeBadge } from '../../components/TypeBadge';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function PatientConsultations() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: consultationsData, isLoading: isLoadingConsultations } = useQuery({
    queryKey: ['patient-consultations'],
    queryFn: () => consultationService.getConsultations({ page: 1 })
  });

  const { data: prescriptionsData, isLoading: isLoadingPrescriptions } = useQuery({
    queryKey: ['patient-prescriptions'],
    queryFn: () => prescriptionService.getPrescriptions({ page: 1 })
  });

  const consultations = Array.isArray(consultationsData) ? consultationsData : (consultationsData?.results || []);
  const prescriptions = Array.isArray(prescriptionsData) ? prescriptionsData : (prescriptionsData?.results || []);

  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(consultations.length / itemsPerPage);
  const currentItems = consultations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
     if (status === 'FINALIZED') return 'bg-[#22C55E]';
     if (status === 'DRAFT') return 'bg-[#F59E0B]';
     return 'bg-brand-indigo';
  };

  const getStatusBg = (status: string) => {
     if (status === 'FINALIZED') return 'bg-[#22C55E1A]';
     if (status === 'DRAFT') return 'bg-[#F59E0B1A]';
     return 'bg-brand-indigo/10';
  };

  const getStatusText = (status: string) => {
     if (status === 'FINALIZED') return 'text-[#22C55E]';
     if (status === 'DRAFT') return 'text-[#F59E0B]';
     return 'text-brand-indigo';
  };

  if (isLoadingConsultations || isLoadingPrescriptions) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-indigo" />
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h2 className="text-[36px] font-serif italic text-text-primary leading-tight">My Consultations</h2>
        <p className="text-[16px] text-text-muted mt-1">Your medical history — read only.</p>
      </div>

      <div className="bg-[#F59E0B1A] border border-[#F59E0B4f] border-l-2 border-l-[#F59E0B] rounded-full px-5 py-2.5 font-mono text-[11px] text-[#F59E0B] flex items-center gap-2 max-w-fit uppercase tracking-[0.05em]">
         <Lock size={14} className="shrink-0" />
         Your consultation records are encrypted and read-only. Only your doctor can modify them.
      </div>

      <div className="space-y-4 pt-4">
         {currentItems.map((cons: any, i: number) => {
            const prescription = prescriptions.find((p: any) => p.consultation === cons.id);
            
            return (
               <motion.div 
                  key={cons.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white border border-ui-border rounded-[1.5rem] overflow-hidden transition-all duration-300 hover:shadow-md hover:border-brand-indigo/30 group relative flex flex-col md:flex-row md:items-center justify-between p-6 gap-6"
               >
                  {/* Left Status Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[6px] group-hover:w-[8px] transition-all duration-300 ${getStatusColor(cons.status)}`}></div>

                  <div className="flex flex-col gap-2 pl-2 flex-1">
                     <div className="flex items-center gap-3">
                       <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${getStatusBg(cons.status)} ${getStatusText(cons.status)}`}>
                         {cons.status}
                       </span>
                       {cons.consultation_type && <TypeBadge type={cons.consultation_type} />}
                     </div>
                     <div className="flex items-center gap-4 mt-2">
                        <div className="w-12 h-12 rounded-full border border-ui-border bg-bg-input flex items-center justify-center text-[20px] shrink-0">
                           <FileText size={20} className={getStatusText(cons.status)} />
                        </div>
                        <div>
                           <div className="text-[18px] font-semibold text-text-primary">{cons.doctor_name || 'Dr. Karim Benali'}</div>
                           <div className="text-[14px] text-text-muted mt-0.5 flex flex-wrap items-center gap-2">
                              <span>Specialist</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col md:items-end justify-center gap-4 border-t md:border-t-0 md:border-l border-ui-border pt-4 md:pt-0 md:pl-6 shrink-0">
                     <div className="text-[16px] font-medium text-text-primary flex items-center gap-2">
                       <Calendar size={18} className="text-text-muted" />
                       {format(new Date(cons.created_at), 'MMM dd, yyyy · HH:mm')}
                     </div>
                     
                     <div className="flex items-center gap-3">
                        <button onClick={() => setShowDetailsModal(cons)} className="p-2 text-text-muted hover:text-brand-indigo bg-white border border-ui-border rounded-xl shadow-sm transition-colors" title="View Details">
                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                     </div>
                  </div>
               </motion.div>
            );
         })}
         {consultations.length === 0 && (
            <div className="py-16 text-center bg-white rounded-[1.5rem] border border-ui-border border-dashed">
               <Activity className="w-12 h-12 text-ui-border mx-auto mb-4" />
               <p className="text-[16px] font-medium text-text-primary">No consultations found</p>
               <p className="text-[14px] text-text-muted mt-1">Your past visits will appear here.</p>
            </div>
         )}
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
      </div>
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-ui-border flex justify-between items-center shrink-0">
              <h3 className="text-xl font-serif italic text-text-primary">Consultation Details</h3>
              <button onClick={() => setShowDetailsModal(null)} className="p-2 hover:bg-bg-input rounded-full transition-colors text-text-muted"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-muted mb-1">Doctor</p>
                    <p className="text-lg font-medium">{showDetailsModal.doctor_name || 'Dr. Karim Benali'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted mb-1">Date</p>
                    <p className="font-medium">{format(new Date(showDetailsModal.created_at), 'PPP')}</p>
                  </div>
               </div>

               {showDetailsModal.consultation_type === 'VIDEO' && (
                 <div className="p-4 bg-bg-surface border border-ui-border rounded-xl">
                   <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-[#06B6D4] uppercase mb-2">
                     <Video size={14} /> Video Consultation
                   </div>
                   <div className="flex items-center gap-3 text-[14px] text-text-muted font-medium">
                     <span>Duration: {showDetailsModal.duration || '28'} min</span><span className="opacity-30">·</span>
                     <span>Started: {showDetailsModal.video_started_at || '09:32'}</span><span className="opacity-30">·</span>
                     <span>Ended: {showDetailsModal.video_ended_at || '10:00'}</span>
                   </div>
                 </div>
               )}
               
               <div>
                  <div className="font-mono text-[11px] tracking-widest text-text-muted uppercase mb-2">DIAGNOSIS</div>
                  <div className="text-[15px] text-text-primary leading-relaxed bg-bg-surface p-4 rounded-xl border border-ui-border">{showDetailsModal.diagnosis || 'No diagnosis recorded'}</div>
               </div>

               <div>
                  <div className="font-mono text-[11px] tracking-widest text-text-muted uppercase mb-2">CLINICAL NOTES</div>
                  <div className="text-[14px] text-text-muted italic leading-relaxed bg-bg-surface p-4 rounded-xl border border-ui-border">{showDetailsModal.clinical_notes || 'No additional notes'}</div>
               </div>

               {showDetailsModal.vitals && (
                  <div>
                     <div className="font-mono text-[11px] tracking-widest text-text-muted uppercase mb-3">VITALS RECORDED</div>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                           { label: 'Heart Rate', val: showDetailsModal.vitals.heart_rate, i: Heart },
                           { label: 'Temperature', val: showDetailsModal.vitals.temperature, i: Thermometer },
                           { label: 'Blood Pressure', val: showDetailsModal.vitals.blood_pressure, i: Activity },
                           { label: 'BMI', val: showDetailsModal.vitals.bmi, i: Weight }
                        ].filter(v => v.val).map((v, idx) => (
                           <div key={idx} className="bg-bg-surface border border-ui-border rounded-xl p-4 flex flex-col gap-2 shadow-sm">
                              <div className="flex justify-between items-start">
                                 <v.i className="w-5 h-5 text-brand-indigo" />
                              </div>
                              <div>
                                 <div className="text-[12px] text-text-muted mb-0.5">{v.label}</div>
                                 <div className="font-mono text-[16px] font-medium text-text-primary">{v.val}</div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {(() => {
                 const prescription = prescriptions.find((p: any) => p.consultation === showDetailsModal.id);
                 if (!prescription) return null;
                 return (
                   <div>
                      <div className="font-mono text-[11px] tracking-widest text-text-muted uppercase mb-3">PRESCRIBED MEDICATIONS</div>
                      <div className="space-y-3">
                         {(prescription.medication_lines || prescription.medications || []).map((m: any, midx: number) => (
                            <div key={midx} className="px-5 py-3 bg-bg-surface border border-ui-border rounded-full flex items-center text-[14px] shadow-sm">
                               <Pill size={16} className="mr-3 text-brand-indigo" />
                               <span className="text-text-primary font-medium">{m.drug_name || m.medication_name}</span>
                               <span className="text-ui-border mx-3">|</span>
                               <span className="text-text-muted font-medium">{m.dosage}</span>
                               <span className="text-ui-border mx-3">|</span>
                               <span className="text-text-muted">{m.frequency}</span>
                               <span className="text-ui-border mx-3">|</span>
                               <span className="text-text-muted">{m.duration}</span>
                            </div>
                         ))}
                      </div>
                   </div>
                 );
               })()}

               {showDetailsModal.ai_used && (
                  <div className="bg-[#F59E0B1A] border border-[#F59E0B4f] border-l-2 border-l-[#F59E0B] rounded-xl px-5 py-3.5 font-sans text-[13px] text-[#D97706] flex items-start gap-2.5 mt-2 mb-4">
                     <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                     <div className="leading-relaxed">
                        Note: AI-assisted diagnostic tools were used during this consultation. Suggestions were reviewed and validated by your doctor before any clinical decision was made.
                     </div>
                  </div>
               )}
            </div>
            <div className="p-6 border-t border-ui-border flex justify-end shrink-0 gap-3">
              {(() => {
                const prescription = prescriptions.find((p: any) => p.consultation === showDetailsModal.id);
                if (!prescription) return null;
                return (
                  <button onClick={() => prescriptionService.downloadPrescriptionPdf(prescription.id)} className="px-5 py-2.5 rounded-xl bg-bg-surface hover:bg-bg-input border border-ui-border text-text-primary text-[14px] font-medium transition-colors flex items-center gap-2 shadow-sm">
                     <Download size={16} /> Download Prescription
                  </button>
                );
              })()}
              <button onClick={() => setShowDetailsModal(null)} className="px-5 py-2.5 bg-brand-indigo text-white rounded-full font-medium hover:bg-[#7C75FF] transition-colors">Close</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
