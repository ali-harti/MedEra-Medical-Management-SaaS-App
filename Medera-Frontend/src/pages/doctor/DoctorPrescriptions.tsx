import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Search, Plus, X, Stethoscope, FileSignature, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Download, Trash2, ChevronLeft, ChevronRight, Eye, UserCheck, Info, Edit2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as prescriptionService from '../../services/prescriptionService';
import * as consultationService from '../../services/consultationService';
import * as patientService from '../../services/patientService';
import { format } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';

export default function DoctorPrescriptions() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const patientFilter = (location.state as any)?.patientId || null;
  const patientFilterName = (location.state as any)?.patientName || null;
  const [activeTab, setActiveTab] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPrescriptionId, setEditPrescriptionId] = useState<string>('');
  const [showDetailsModal, setShowDetailsModal] = useState<any>(null);
  const [medicationLines, setMedicationLines] = useState<any[]>([{ drug_name: '', dosage: '', dosology: '', duration_days: '', special_instructions: '' }]);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string>('');

  // Queries
  const { data: prescriptionsData, isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['prescriptions', activeTab, patientFilter],
    queryFn: () => prescriptionService.getPrescriptions({
      is_valid: activeTab === 'All' ? undefined : (activeTab === 'Valid' ? true : false),
      patient_id: patientFilter || undefined,
    })
  });

  // Only fetch FINALIZED consultations for the prescription modal
  const { data: finalizedConsultationsData } = useQuery({
    queryKey: ['consultations', 'FINALIZED', 'for-prescriptions'],
    queryFn: () => consultationService.getConsultations({ status: 'FINALIZED' }),
    enabled: isNewModalOpen,
  });
  const finalizedConsultations = finalizedConsultationsData?.results || (Array.isArray(finalizedConsultationsData) ? finalizedConsultationsData : []);
  // Filter out consultations that already have a prescription
  const availableConsultations = finalizedConsultations.filter((c: any) => !c.has_prescription);

  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientService.getPatients()
  });

  const patients = patientsData?.results || [];
  const selectedConsultation = finalizedConsultations.find((c: any) => c.id === selectedConsultationId);

  const sortedPrescriptions = [...(prescriptionsData?.results || [])].sort((a: any, b: any) => new Date(b.created_at || b.issued_at || 0).getTime() - new Date(a.created_at || a.issued_at || 0).getTime());
  const totalPages = Math.ceil(sortedPrescriptions.length / itemsPerPage);
  const paginatedPrescriptions = sortedPrescriptions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => prescriptionService.createPrescription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      setIsNewModalOpen(false);
      setMedicationLines([{ drug_name: '', dosage: '', dosology: '', duration_days: '', special_instructions: '' }]);
      setSelectedConsultationId('');
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => prescriptionService.cancelPrescription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    }
  });

  const editMutation = useMutation({
    mutationFn: (data: any) => prescriptionService.updatePrescription(editPrescriptionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      setIsEditModalOpen(false);
      setEditPrescriptionId('');
      setMedicationLines([{ drug_name: '', dosage: '', dosology: '', duration_days: '', special_instructions: '' }]);
    }
  });

  const openEditModal = (rx: any) => {
    setEditPrescriptionId(rx.id);
    setSelectedConsultationId(rx.consultation || '');
    if (rx.medication_lines && rx.medication_lines.length > 0) {
       setMedicationLines(rx.medication_lines);
    } else {
       setMedicationLines([{ drug_name: '', dosage: '', dosology: '', duration_days: '', special_instructions: '' }]);
    }
    setIsEditModalOpen(true);
    setTimeout(() => {
       const el = document.getElementById('edit-rx-notes') as HTMLTextAreaElement;
       if (el) el.value = rx.general_instructions || '';
    }, 100);
  };

  const handleAddMedication = () => {
    setMedicationLines([...medicationLines, { drug_name: '', dosage: '', dosology: '', duration_days: '', special_instructions: '' }]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedicationLines(medicationLines.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (index: number, field: string, value: string) => {
    const updated = [...medicationLines];
    updated[index][field] = value;
    setMedicationLines(updated);
  };

  const handleDownload = async (id: string) => {
    try {
      await prescriptionService.downloadPrescriptionPdf(id);
    } catch (err) {
      console.error("Failed to download PDF", err);
    }
  };

  if (prescriptionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-brand-indigo animate-spin" />
        <p className="text-text-muted font-mono animate-pulse">Loading prescriptions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in duration-600 pb-12 relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
           <h1 className="text-[40px] font-sans text-text-primary leading-tight">Prescriptions</h1>
           <p className="text-[16px] text-text-muted mt-1 font-sans">Issue and manage patient prescriptions.</p>
        </div>
        <button onClick={() => { setIsNewModalOpen(true); setMedicationLines([{ drug_name: '', dosage: '', dosology: '', duration_days: '', special_instructions: '' }]); }} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-indigo text-white hover:bg-[#7C75FF] rounded-full shadow-[0_4px_12px_rgba(99,91,255,0.3)] transition-all relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
          <Plus size={18} />
          <span className="font-medium text-[14px]">New Prescription</span>
        </button>
      </div>

      {/* Patient Filter Banner */}
      {patientFilter && (
        <div className="flex items-center gap-3 px-4 py-3 bg-brand-indigo/10 border border-brand-indigo/30 rounded-2xl mb-2">
          <UserCheck size={18} className="text-brand-indigo shrink-0" />
          <span className="text-[14px] text-text-primary font-medium">Showing prescriptions for: <span className="text-brand-indigo">{patientFilterName || 'Selected Patient'}</span></span>
          <button
            onClick={() => navigate('/doctor/prescriptions', { replace: true, state: {} })}
            className="ml-auto flex items-center gap-1.5 text-[12px] text-text-muted hover:text-state-error transition-colors font-mono"
          >
            <X size={14} /> Clear filter
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mt-8 mb-6">
        <button 
          onClick={() => { setActiveTab('All'); setCurrentPage(1); }} 
          className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${activeTab === 'All' ? 'bg-brand-indigo text-white border border-brand-indigo shadow-[0_2px_10px_rgba(99,91,255,0.2)]' : 'bg-bg-surface border border-ui-border text-text-muted hover:text-text-primary hover:border-text-primary/30'}`}
        >
          All
        </button>
        <button 
          onClick={() => { setActiveTab('Valid'); setCurrentPage(1); }} 
          className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${activeTab === 'Valid' ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30' : 'bg-bg-surface border border-ui-border text-text-muted hover:text-[#22C55E] hover:border-[#22C55E]/30'}`}
        >
          Valid
        </button>
        <button 
          onClick={() => { setActiveTab('Cancelled'); setCurrentPage(1); }} 
          className={`px-5 py-2 rounded-full text-[13px] font-medium transition-colors ${activeTab === 'Cancelled' ? 'bg-state-error/20 text-state-error border border-state-error/30' : 'bg-bg-surface border border-ui-border text-text-muted hover:text-state-error hover:border-state-error/30'}`}
        >
          Cancelled
        </button>
      </div>

      {/* Prescriptions List */}
      <div className="space-y-4 min-h-[400px]">
         {paginatedPrescriptions.length === 0 ? (
            <div className="bg-bg-surface rounded-3xl p-16 text-center border border-ui-border border-dashed flex flex-col items-center justify-center">
              <FileSignature className="w-12 h-12 text-ui-border mb-4" />
              <p className="text-text-muted font-sans">
                {patientFilter
                  ? `No prescriptions found for ${patientFilterName || 'this patient'}.`
                  : 'No prescriptions found matching this criteria.'}
              </p>
            </div>
         ) : paginatedPrescriptions.map((rx: any, i: number) => (
            <motion.div 
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
               key={rx.id}
               className={`bg-white border border-ui-border rounded-[1.5rem] p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-text-primary/20 relative group overflow-hidden ${!rx.is_valid ? 'opacity-70 grayscale-[0.5]' : ''}`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-[6px] group-hover:w-[8px] transition-all duration-300 ${rx.is_valid ? 'bg-[#22C55E]' : 'bg-state-error'}`} />
              <div className="flex items-center gap-4 pl-3">
                 <div>
                    <div className="flex items-center gap-2">
                       <span className="text-[15px] font-medium text-text-primary font-sans">{rx.patient_name || 'Patient'}</span>
                       <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-mono font-bold tracking-wider ${rx.is_valid ? 'bg-[#22C55E1A] text-[#22C55E]' : 'bg-state-error/10 text-state-error'}`}>
                         {rx.is_valid ? 'VALID' : 'CANCELLED'}
                       </span>
                    </div>
                    <div className="text-[12px] font-mono text-text-muted mt-1 flex items-center gap-2">
                       <span>#{rx.id.substring(0,8)}</span>
                       <span className="w-1 h-1 rounded-full bg-ui-border"></span>
                       <span>{format(new Date(rx.issued_at || rx.created_at || new Date()), 'dd MMM yyyy')}</span>
                    </div>
                 </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                 {rx.is_valid ? (
                   <>
                     <button onClick={() => handleDownload(rx.id)} className="px-5 py-2.5 bg-brand-indigo/5 hover:bg-brand-indigo text-brand-indigo hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap group">
                       <Download size={16} className="text-brand-indigo group-hover:text-white transition-colors" />
                       <span>PDF</span>
                     </button>
                     <button onClick={() => setShowDetailsModal(rx)} className="px-5 py-2.5 bg-brand-indigo/5 hover:bg-brand-indigo text-brand-indigo hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap group">
                       <Eye size={16} className="text-brand-indigo group-hover:text-white transition-colors" />
                       <span>View Details</span>
                     </button>
                     <button onClick={() => openEditModal(rx)} className="px-5 py-2.5 bg-brand-indigo/5 hover:bg-brand-indigo text-brand-indigo hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap group">
                       <Edit2 size={16} className="text-brand-indigo group-hover:text-white transition-colors" />
                       <span>Modify</span>
                     </button>
                     <button onClick={() => { if(window.confirm('Cancel this prescription?')) cancelMutation.mutate(rx.id); }} className="px-5 py-2.5 border border-ui-border hover:bg-state-error/10 text-text-muted hover:text-state-error hover:border-state-error/30 rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap">
                       <span>Cancel</span>
                     </button>
                   </>
                 ) : (
                   <button onClick={() => setShowDetailsModal(rx)} className="px-5 py-2.5 bg-brand-indigo/5 hover:bg-brand-indigo text-brand-indigo hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap group">
                     <Eye size={16} className="text-brand-indigo group-hover:text-white transition-colors" />
                     <span>View Details</span>
                   </button>
                 )}
              </div>
            </motion.div>
         ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
           <button 
             onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
             disabled={currentPage === 1}
             className="px-4 py-2 text-[13px] font-medium text-text-primary bg-white border border-ui-border rounded-xl disabled:opacity-50 hover:bg-bg-input transition-colors"
           >
             Previous
           </button>
           <div className="text-[13px] text-text-muted">
             Page {currentPage} of {totalPages}
           </div>
           <button 
             onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
             disabled={currentPage === totalPages}
             className="px-4 py-2 text-[13px] font-medium text-text-primary bg-white border border-ui-border rounded-xl disabled:opacity-50 hover:bg-bg-input transition-colors"
           >
             Next
           </button>
        </div>
      )}

      {/* New Prescription Modal */}
      <AnimatePresence>
         {isNewModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsNewModalOpen(false); setSelectedConsultationId(''); }} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-2xl w-full max-w-[600px] shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden">
                 <div className="px-6 py-4 border-b border-ui-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo"><FileSignature size={18} /></div>
                      <h2 className="text-[20px] font-sans text-text-primary">New Prescription</h2>
                    </div>
                    <button onClick={() => { setIsNewModalOpen(false); setSelectedConsultationId(''); }} className="w-8 h-8 rounded-full hover:bg-bg-input flex items-center justify-center text-text-muted transition-colors"><X size={18}/></button>
                 </div>
                 
                 <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {/* Workflow info banner */}
                    <div className="flex items-start gap-3 p-4 bg-brand-indigo/5 border border-brand-indigo/20 rounded-xl">
                      <Info size={16} className="text-brand-indigo shrink-0 mt-0.5" />
                      <p className="text-[13px] text-text-muted leading-relaxed">
                        A prescription must be linked to a <span className="text-brand-indigo font-medium">finalized consultation</span>. Select a consultation below — the patient is automatically assigned.
                      </p>
                    </div>

                    {/* Consultation selection (replaces patient selector) */}
                    <div>
                      <label className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2 block">Finalized Consultation <span className="text-state-error">*</span></label>
                      <select
                        value={selectedConsultationId}
                        onChange={e => setSelectedConsultationId(e.target.value)}
                        className="w-full bg-bg-input border border-ui-border rounded-xl px-4 py-3 text-[14px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Select a finalized consultation...</option>
                        {finalizedConsultations.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.patient_details?.first_name || 'Patient'} {c.patient_details?.last_name || ''} — {format(new Date(c.created_at || c.finalized_at || new Date()), 'dd MMM yyyy')} {c.motive ? `(${c.motive})` : ''}
                          </option>
                        ))}
                      </select>
                      {finalizedConsultations.length === 0 && (
                        <p className="text-[12px] text-state-warning font-mono mt-1.5">⚠ No finalized consultations available. Complete a consultation first.</p>
                      )}
                    </div>

                    {/* Auto-filled patient info */}
                    {selectedConsultation && (
                      <div className="flex items-center gap-3 p-4 bg-[#22C55E]/5 border border-[#22C55E]/20 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-indigo to-brand-lavender flex items-center justify-center text-white text-[13px] font-bold shrink-0">
                          {(selectedConsultation.patient_details?.first_name?.[0] || 'P')}
                        </div>
                        <div>
                          <div className="text-[14px] font-medium text-text-primary">{selectedConsultation.patient_details?.first_name} {selectedConsultation.patient_details?.last_name}</div>
                          <div className="text-[12px] font-mono text-text-muted">CIN: {selectedConsultation.patient_details?.cin || 'N/A'} · Consultation: {format(new Date(selectedConsultation.finalized_at || selectedConsultation.created_at || new Date()), 'dd MMM yyyy')}</div>
                        </div>
                        <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#22C55E1A] text-[#22C55E] uppercase">FINALIZED</span>
                      </div>
                    )}

                    {/* Medications list */}
                    <div>
                      <div className="flex items-center justify-between mb-4 border-t border-ui-border pt-6">
                         <h3 className="text-[14px] font-medium text-text-primary">Medications</h3>
                         <button onClick={handleAddMedication} className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-indigo/50 text-brand-indigo hover:bg-brand-indigo/5 rounded-full text-[12px] font-medium transition-colors">
                           <Plus size={14} /> Add Medication
                         </button>
                      </div>

                      <div className="space-y-4">
                         <AnimatePresence>
                           {medicationLines.map((m, index) => (
                              <motion.div 
                                key={index}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                transition={{ duration: 0.25 }}
                                className="medication-block bg-bg-surface/50 border border-ui-border rounded-2xl p-5 relative"
                              >
                                 <div className="flex justify-between items-center mb-3">
                                   <div className="text-[12px] font-mono text-brand-indigo font-medium uppercase tracking-wider">Medication {index + 1}</div>
                                   {medicationLines.length > 1 && (
                                     <button onClick={() => handleRemoveMedication(index)} className="text-[12px] text-text-muted hover:text-state-error transition-colors flex items-center gap-1">
                                       <Trash2 size={12} /> Remove
                                     </button>
                                   )}
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                      <input 
                                        type="text" placeholder="Drug Name" 
                                        value={m.drug_name}
                                        onChange={(e) => handleMedicationChange(index, 'drug_name', e.target.value)}
                                        className="w-full bg-bg-input border border-ui-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" 
                                      />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                      <input 
                                        type="text" placeholder="Dosage (e.g. 500mg)" 
                                        value={m.dosage}
                                        onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                                        className="w-full bg-bg-input border border-ui-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" 
                                      />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                      <input 
                                        type="text" placeholder="Dosology (e.g. 1 pill morning/evening)" 
                                        value={m.dosology}
                                        onChange={(e) => handleMedicationChange(index, 'dosology', e.target.value)}
                                        className="w-full bg-bg-input border border-ui-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" 
                                      />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                      <input 
                                        type="number" placeholder="Duration (days)" 
                                        value={m.duration_days}
                                        onChange={(e) => handleMedicationChange(index, 'duration_days', e.target.value)}
                                        className="w-full bg-bg-input border border-ui-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" 
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <input 
                                        type="text" placeholder="Special Instructions (Optional)" 
                                        value={m.special_instructions}
                                        onChange={(e) => handleMedicationChange(index, 'special_instructions', e.target.value)}
                                        className="w-full bg-bg-input border border-ui-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" 
                                      />
                                    </div>
                                 </div>
                              </motion.div>
                           ))}
                         </AnimatePresence>
                      </div>
                    </div>
                    
                    <div className="border-t border-ui-border pt-4">
                      <textarea id="rx-notes" placeholder="General Notes (Optional)" className="w-full bg-bg-input border border-ui-border rounded-xl p-3 min-h-[80px] text-[13px] font-sans text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all resize-y" />
                    </div>
                 </div>

                 <div className="p-6 border-t border-ui-border shrink-0 bg-bg-elevated rounded-b-2xl">
                    {!selectedConsultationId && (
                      <p className="text-[12px] text-text-muted font-mono mb-3 text-center">Select a finalized consultation to enable issuing.</p>
                    )}
                    <button 
                      disabled={createMutation.isPending || !selectedConsultationId || !medicationLines.some(m => m.drug_name)}
                      onClick={() => {
                        const notes = (document.getElementById('rx-notes') as HTMLTextAreaElement)?.value || '';
                        const patientId = selectedConsultation?.patient || selectedConsultation?.patient_details?.id;
                        if (selectedConsultationId && patientId && medicationLines.some(m => m.drug_name)) {
                          createMutation.mutate({
                            consultation: selectedConsultationId,
                            patient: patientId,
                            medication_lines: medicationLines.filter(m => m.drug_name),
                            general_instructions: notes
                          });
                        }
                      }}
                      className="w-full py-3.5 bg-brand-indigo hover:bg-[#7C75FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-xl text-white font-medium text-[14px] shadow-[0_4px_12px_rgba(99,91,255,0.25)] flex justify-center items-center gap-2"
                    >
                       {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={16} /> Issue Prescription</>}
                    </button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

            {/* Edit Prescription Modal */}
      <AnimatePresence>
         {isEditModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsEditModalOpen(false); setEditPrescriptionId(''); }} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
               <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 300, duration: 0.4 }} className="bg-bg-elevated border border-ui-border rounded-2xl w-full max-w-[600px] shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden">
                 <div className="px-6 py-4 border-b border-ui-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo"><Edit2 size={18} /></div>
                      <h2 className="text-[20px] font-sans text-text-primary">Modify Prescription</h2>
                    </div>
                    <button onClick={() => { setIsEditModalOpen(false); setEditPrescriptionId(''); }} className="w-8 h-8 rounded-full hover:bg-bg-input flex items-center justify-center text-text-muted transition-colors"><X size={18}/></button>
                 </div>
                 
                 <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {/* Medications list */}
                    <div>
                      <div className="flex items-center justify-between mb-4 border-t border-ui-border pt-6">
                         <h3 className="text-[14px] font-medium text-text-primary">Medications</h3>
                         <button onClick={handleAddMedication} className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-indigo/50 text-brand-indigo hover:bg-brand-indigo/5 rounded-full text-[12px] font-medium transition-colors">
                           <Plus size={14} /> Add Medication
                         </button>
                      </div>

                      <div className="space-y-4">
                         <AnimatePresence>
                           {medicationLines.map((m, index) => (
                              <motion.div 
                                key={index}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                transition={{ duration: 0.25 }}
                                className="medication-block bg-bg-surface/50 border border-ui-border rounded-2xl p-5 relative"
                              >
                                 <div className="flex justify-between items-center mb-3">
                                   <div className="text-[12px] font-mono text-brand-indigo font-medium uppercase tracking-wider">Medication {index + 1}</div>
                                   {medicationLines.length > 1 && (
                                     <button onClick={() => handleRemoveMedication(index)} className="text-[12px] text-text-muted hover:text-state-error transition-colors flex items-center gap-1">
                                       <Trash2 size={12} /> Remove
                                     </button>
                                   )}
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                      <input 
                                        type="text" placeholder="Drug Name" 
                                        value={m.drug_name}
                                        onChange={(e) => handleMedicationChange(index, 'drug_name', e.target.value)}
                                        className="w-full bg-bg-input border border-ui-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" 
                                      />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                      <input 
                                        type="text" placeholder="Dosage (e.g. 500mg)" 
                                        value={m.dosage}
                                        onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                                        className="w-full bg-bg-input border border-ui-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" 
                                      />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                      <input 
                                        type="text" placeholder="Dosology (e.g. 1 pill morning/evening)" 
                                        value={m.dosology}
                                        onChange={(e) => handleMedicationChange(index, 'dosology', e.target.value)}
                                        className="w-full bg-bg-input border border-ui-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" 
                                      />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                      <input 
                                        type="number" placeholder="Duration (days)" 
                                        value={m.duration_days}
                                        onChange={(e) => handleMedicationChange(index, 'duration_days', e.target.value)}
                                        className="w-full bg-bg-input border border-ui-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" 
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <input 
                                        type="text" placeholder="Special Instructions (Optional)" 
                                        value={m.special_instructions}
                                        onChange={(e) => handleMedicationChange(index, 'special_instructions', e.target.value)}
                                        className="w-full bg-bg-input border border-ui-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all" 
                                      />
                                    </div>
                                 </div>
                              </motion.div>
                           ))}
                         </AnimatePresence>
                      </div>
                    </div>
                    
                    <div className="border-t border-ui-border pt-4">
                      <textarea id="edit-rx-notes" placeholder="General Notes (Optional)" className="w-full bg-bg-input border border-ui-border rounded-xl p-3 min-h-[80px] text-[13px] font-sans text-text-primary focus:outline-none focus:border-brand-indigo/50 transition-all resize-y" />
                    </div>
                 </div>

                 <div className="p-6 border-t border-ui-border shrink-0 bg-bg-elevated rounded-b-2xl">
                    <button 
                      disabled={editMutation.isPending || !medicationLines.some(m => m.drug_name)}
                      onClick={() => {
                        const notes = (document.getElementById('edit-rx-notes') as HTMLTextAreaElement)?.value || '';
                        if (medicationLines.some(m => m.drug_name)) {
                          editMutation.mutate({
                            medication_lines: medicationLines.filter(m => m.drug_name),
                            general_instructions: notes
                          });
                        }
                      }}
                      className="w-full py-3.5 bg-brand-indigo hover:bg-[#7C75FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-xl text-white font-medium text-[14px] shadow-[0_4px_12px_rgba(99,91,255,0.25)] flex justify-center items-center gap-2"
                    >
                       {editMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={16} /> Save Changes</>}
                    </button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

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
                       <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-3">Patient Information</div>
                       <div className="text-[16px] font-medium text-text-primary mb-1">{showDetailsModal.patient_name || 'Patient'}</div>
                    </div>

                    <div className="p-5 bg-bg-surface border border-ui-border rounded-2xl">
                       <div className="flex items-center justify-between mb-4">
                          <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase">Medications & Details</div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider ${showDetailsModal.is_valid ? 'bg-[#22C55E1A] text-[#22C55E]' : 'bg-state-error/10 text-state-error'}`}>
                             {showDetailsModal.is_valid ? 'VALID' : 'CANCELLED'}
                          </span>
                       </div>
                       
                       <div className="space-y-4">
                          {(showDetailsModal.medication_lines || []).map((m: any, idx: number) => (
                            <div key={idx} className="flex gap-4 p-3 bg-bg-input rounded-xl border border-ui-border/50">
                               <div className="w-6 text-[12px] font-mono text-brand-indigo/60 pt-0.5 shrink-0">{(idx+1).toString().padStart(2, '0')}</div>
                               <div>
                                  <div className="text-[14px] font-medium text-text-primary">{m.drug_name} <span className="text-text-muted font-normal ml-1">{m.dosage}</span></div>
                                  <div className="text-[13px] text-text-muted mt-1">{m.dosology} — {m.duration_days} days</div>
                                  {m.special_instructions && (
                                     <div className="text-[12px] text-brand-indigo mt-2 bg-brand-indigo/5 p-2 rounded-md">{m.special_instructions}</div>
                                  )}
                               </div>
                            </div>
                          ))}
                       </div>
                       
                       {showDetailsModal.general_instructions && (
                         <div className="mt-4 pt-4 border-t border-ui-border border-dashed">
                            <div className="text-[11px] font-mono tracking-widest text-text-muted uppercase mb-2">General Notes</div>
                            <p className="text-[13px] text-text-primary">{showDetailsModal.general_instructions}</p>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="px-8 py-6 border-t border-ui-border shrink-0 flex items-center justify-between bg-bg-elevated rounded-b-3xl">
                    <button onClick={() => handleDownload(showDetailsModal.id)} className="px-5 py-2.5 bg-brand-indigo/5 hover:bg-brand-indigo text-brand-indigo hover:text-white rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 whitespace-nowrap group">
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

// helper icon
const Ban = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>
);
