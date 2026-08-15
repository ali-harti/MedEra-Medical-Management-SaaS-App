import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, FileText, Calendar as CalendarIcon, Clock, HeartPulse, User, CheckCircle, Activity, FilePlus, X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';
import * as consultationService from '../../services/consultationService';
import * as patientService from '../../services/patientService';
import * as prescriptionService from '../../services/prescriptionService';
import { AIDiagnosticAssistant } from '../../components/doctor/AIDiagnosticAssistant';

export default function DoctorActiveConsultation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, lang } = useLanguage();
  
  const [anamnesis, setAnamnesis] = useState('');
  const [clinicalExamNotes, setClinicalExamNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  
  // Prescription Auto-Gen State
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [prescriptionLines, setPrescriptionLines] = useState([{ drug_name: '', dosage: '', dosology: '', duration_days: '' }]);
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const { data: consultation, isLoading: isLoadingCons, isError, error } = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => consultationService.getConsultation(id!),
    enabled: !!id,
    retry: false
  });

  const { data: timelineData } = useQuery({
    queryKey: ['patient-timeline', consultation?.patient],
    queryFn: () => patientService.getPatientTimeline(consultation?.patient as string),
    enabled: !!consultation?.patient
  });

  const isInitialized = useRef(false);
  const prescriptionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consultation && !isInitialized.current) {
      setAnamnesis(consultation.anamnesis || '');
      setClinicalExamNotes(consultation.clinical_exam?.notes || '');
      setDiagnosis(consultation.diagnosis || '');
      isInitialized.current = true;
    }
  }, [consultation]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => consultationService.updateConsultation(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
    }
  });

  const finalizeMutation = useMutation({
    mutationFn: () => consultationService.finalizeConsultation(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['consultation', id] });
    }
  });

  const createPrescriptionMutation = useMutation({
    mutationFn: (data: any) => prescriptionService.createPrescription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-timeline', consultation?.patient] });
    }
  });

  const handleApplyDiagnosis = (text: string) => {
    setDiagnosis(text);
    setShowPrescriptionForm(true);
    // Autofill with some empty lines
    setPrescriptionLines([{ drug_name: '', dosage: '', dosology: '', duration_days: '7' }]);
    
    // Auto-scroll to prescription section
    setTimeout(() => {
      prescriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSaveDraft = async () => {
    await updateMutation.mutateAsync({
      anamnesis,
      diagnosis,
      clinical_exam: { ...consultation?.clinical_exam, notes: clinicalExamNotes }
    });
  };

  const handleFinalize = async () => {
    // 1. Save draft
    await handleSaveDraft();
    
    // 2. Finalize consultation (Backend requires consultation to be FINALIZED before adding prescription)
    await finalizeMutation.mutateAsync();
    
    // 3. Create Prescription if requested
    if (showPrescriptionForm) {
      const validLines = prescriptionLines.filter(l => l.drug_name.trim() !== '');
      if (validLines.length > 0) {
        await createPrescriptionMutation.mutateAsync({
          consultation: id,
          patient: consultation?.patient,
          medication_lines: validLines
        });
      }
    }
    
    navigate('/doctor/consultations');
  };

  if (isLoadingCons) {
    return <div className="flex-1 flex items-center justify-center p-8"><div className="w-8 h-8 border-4 border-brand-indigo border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (isError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-state-error/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="text-state-error w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif italic text-text-primary mb-2">Consultation Not Found</h2>
        <p className="text-text-muted max-w-md mx-auto mb-6">
          The consultation could not be loaded. It may have been deleted or you don't have access to it.
        </p>
        <button 
          onClick={() => navigate('/doctor/consultations')}
          className="px-6 py-2 bg-brand-indigo text-white rounded-xl font-medium transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-brand-indigo/20"
        >
          Back to Consultations
        </button>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-state-error/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="text-state-error w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif italic text-text-primary mb-2">Consultation Not Found</h2>
        <p className="text-text-muted max-w-md mx-auto mb-6">
          The consultation could not be loaded. It may have been deleted or you don't have access to it.
        </p>
        <button 
          onClick={() => navigate('/doctor/consultations')}
          className="px-6 py-2 bg-brand-indigo text-white rounded-xl font-medium transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-brand-indigo/20"
        >
          Back to Consultations
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-surface overflow-hidden">
      {/* Header */}
      <header className="shrink-0 min-h-[72px] py-4 bg-bg-surface border-b border-ui-border flex flex-wrap items-center justify-between px-6 gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <button 
            onClick={() => navigate('/doctor/appointments')}
            className="w-10 h-10 shrink-0 rounded-full border border-ui-border flex items-center justify-center text-text-secondary hover:bg-bg-input hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-0.5">
              <h1 className="text-[20px] font-sans font-semibold text-text-primary truncate">
                Active Consultation: {consultation.patient_name || 'Patient'}
              </h1>
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-brand-indigo/10 text-brand-indigo text-[11px] font-mono font-bold tracking-wider">IN PROGRESS</span>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-text-muted">
              <span className="flex items-center gap-1.5 shrink-0"><CalendarIcon size={14} /> {format(new Date(), 'dd MMM yyyy')}</span>
              <span className="flex items-center gap-1.5 shrink-0"><Clock size={14} /> {format(new Date(), 'HH:mm')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          <button 
            onClick={() => setShowHistoryModal(true)}
            className="px-4 py-2 rounded-xl bg-brand-indigo/10 text-brand-indigo font-medium text-[14px] hover:bg-brand-indigo/20 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Clock size={18} /> Patient History
          </button>

        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden justify-center bg-[#F8FAFC]">
        
        {/* Clinical Workflow (Centered and max-width) */}
        <div className="w-full max-w-5xl overflow-y-auto p-8 space-y-8">
          


          <div className="bg-white border border-ui-border rounded-2xl p-6 shadow-sm">
             <h3 className="text-[16px] font-sans font-semibold text-text-primary flex items-center gap-2 mb-1">
              <Activity size={18} className="text-brand-indigo" /> AI Diagnostic Assistant
            </h3>
            <p className="text-[13px] text-text-muted mb-4">Powered by advanced NLP. Input symptoms to receive percentage-based diagnostic suggestions.</p>
            <AIDiagnosticAssistant 
              isReadonly={false}
              aiUsed={consultation.ai_used}
              patient={{ 
                age: consultation.patient_details?.birth_date ? (new Date().getFullYear() - new Date(consultation.patient_details.birth_date).getFullYear()) : 35, 
                gender: consultation.patient_details?.gender?.charAt(0) || 'M',
                allergies: consultation.patient_details?.allergies?.join(', ') || '',
                history: consultation.patient_details?.medical_history || ''
              }}
              consultationId={id!}
              onApplyDiagnosis={handleApplyDiagnosis}
              onAIUsed={() => {}}
            />
          </div>

          <div ref={prescriptionRef} className="bg-white border border-ui-border rounded-2xl p-6 shadow-sm">
             <h3 className="text-[16px] font-sans font-semibold text-text-primary flex items-center gap-2 mb-4">
              <HeartPulse size={18} className="text-[#22C55E]" /> Diagnosis & Prescription
            </h3>
            <div className="mb-6">
               <label className="block text-[13px] font-semibold text-text-secondary mb-2">Final Diagnosis</label>
               <input 
                 type="text"
                 value={diagnosis}
                 onChange={(e) => setDiagnosis(e.target.value)}
                 placeholder="e.g. Acute Bronchitis"
                 className="w-full bg-bg-input border border-ui-border rounded-xl p-3.5 text-[15px] font-medium text-text-primary focus:border-[#22C55E] focus:bg-white focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
               />
            </div>

            {showPrescriptionForm ? (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5 shadow-inner">
                 <div className="flex items-center justify-between mb-4">
                   <h4 className="text-[14px] font-bold text-green-700">Prescription Details</h4>
                   <button onClick={() => setPrescriptionLines([...prescriptionLines, { drug_name: '', dosage: '', dosology: '', duration_days: '' }])} className="text-[13px] font-medium text-green-600 hover:text-green-700 bg-white border border-green-500/30 px-3 py-1.5 rounded-lg shadow-sm hover:shadow flex items-center gap-1.5 transition-all"><FilePlus size={14}/> Add Drug</button>
                 </div>
                 <div className="space-y-3">
                   {prescriptionLines.map((line, idx) => (
                     <div key={idx} className="flex gap-3 items-start bg-white p-3 rounded-xl border border-ui-border shadow-sm">
                       <input 
                         type="text" 
                         value={line.drug_name}
                         onChange={e => { const l = [...prescriptionLines]; l[idx].drug_name = e.target.value; setPrescriptionLines(l); }}
                         placeholder="Drug Name (e.g. Amoxicillin)" 
                         className="flex-1 bg-bg-input focus:bg-white border border-ui-border focus:border-green-500 rounded-lg p-2.5 text-[14px] outline-none transition-colors" 
                       />
                       <input 
                         type="text" 
                         value={line.dosage}
                         onChange={e => { const l = [...prescriptionLines]; l[idx].dosage = e.target.value; setPrescriptionLines(l); }}
                         placeholder="Dosage (500mg)" 
                         className="w-[120px] bg-bg-input focus:bg-white border border-ui-border focus:border-green-500 rounded-lg p-2.5 text-[14px] outline-none transition-colors" 
                       />
                       <input 
                         type="text" 
                         value={line.dosology}
                         onChange={e => { const l = [...prescriptionLines]; l[idx].dosology = e.target.value; setPrescriptionLines(l); }}
                         placeholder="Instructions (1 pill every 8 hours)" 
                         className="flex-1 bg-bg-input focus:bg-white border border-ui-border focus:border-green-500 rounded-lg p-2.5 text-[14px] outline-none transition-colors" 
                       />
                       <button onClick={() => {
                         const l = [...prescriptionLines];
                         l.splice(idx, 1);
                         setPrescriptionLines(l);
                       }} className="text-text-muted hover:text-red-500 p-2.5 transition-colors">
                         <X size={18} />
                       </button>
                     </div>
                   ))}
                   {prescriptionLines.length === 0 && (
                     <div className="text-center text-text-muted text-[13px] py-4 bg-white rounded-xl border border-dashed border-ui-border">No drugs added.</div>
                   )}
                 </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowPrescriptionForm(true)}
                className="w-full bg-white border-2 border-dashed border-ui-border hover:border-[#22C55E] hover:text-[#22C55E] hover:bg-green-50 text-text-muted rounded-2xl py-6 flex flex-col items-center justify-center gap-3 transition-all"
              >
                 <div className="w-12 h-12 rounded-full bg-bg-input flex items-center justify-center group-hover:bg-green-100 transition-colors">
                   <FilePlus size={24} />
                 </div>
                 <span className="text-[15px] font-semibold">Create Prescription</span>
              </button>
            )}

            <div className="mt-6">
               <label className="block text-[13px] font-semibold text-text-secondary mb-2">Clinical Note</label>
               <textarea 
                 value={clinicalExamNotes}
                 onChange={(e) => setClinicalExamNotes(e.target.value)}
                 placeholder="Add clinical observations here..."
                 className="w-full bg-bg-input border border-ui-border rounded-xl p-3.5 text-[14px] text-text-primary focus:border-[#22C55E] focus:bg-white focus:ring-2 focus:ring-green-500/20 outline-none min-h-[100px] resize-y transition-all"
               />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 mt-6">
            <button 
              onClick={handleSaveDraft}
              disabled={updateMutation.isPending}
              className="px-6 py-3 rounded-xl border border-ui-border bg-white text-text-primary font-semibold text-[15px] hover:bg-bg-input transition-colors flex items-center gap-2 shadow-sm"
            >
              <Save size={18} /> Save Draft
            </button>
            <button 
              onClick={handleFinalize}
              disabled={finalizeMutation.isPending}
              className="px-8 py-3 rounded-xl bg-[#22C55E] text-white font-bold text-[15px] hover:bg-[#16A34A] transition-colors flex items-center gap-2 shadow-lg shadow-green-500/20"
            >
              <CheckCircle size={20} /> Finalize Consultation
            </button>
          </div>
        </div>
      </div>


      {/* History Slide-over Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/20 z-50 flex justify-end pt-[64px]">
          <div className="w-[400px] h-full bg-bg-surface shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-ui-border flex items-center justify-between bg-white shrink-0">
              <h2 className="text-[18px] font-bold text-text-primary">Patient History</h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-text-muted hover:text-text-primary bg-bg-input hover:bg-ui-border/50 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col">
              {/* Patient Profile Card */}
              <div className="p-6 border-b border-ui-border bg-white shrink-0">
                 <div className="flex items-center gap-4 mb-5">
                   <div className="w-14 h-14 rounded-full bg-brand-indigo/10 flex items-center justify-center text-brand-indigo font-bold text-2xl shadow-inner">
                     {consultation.patient_details?.first_name?.charAt(0) || consultation.patient_name?.charAt(0) || 'P'}
                   </div>
                   <div>
                     <h2 className="text-[18px] font-bold text-text-primary">
                       {consultation.patient_details?.first_name} {consultation.patient_details?.last_name}
                     </h2>
                     <p className="text-[13px] font-mono text-text-muted mt-0.5">{consultation.patient_details?.internal_id || 'ID Unknown'}</p>
                   </div>
                 </div>

                 <div className="space-y-3">
                   <div className="flex justify-between items-center text-[13px]">
                     <span className="text-text-muted">Age / Sex</span>
                     <span className="font-semibold text-text-primary">
                       {consultation.patient_details?.birth_date ? (
                         `${new Date().getFullYear() - new Date(consultation.patient_details.birth_date).getFullYear()} yrs`
                       ) : 'Unknown'} / {consultation.patient_details?.gender === 'MALE' ? 'M' : consultation.patient_details?.gender === 'FEMALE' ? 'F' : 'U'}
                     </span>
                   </div>
                   <div className="flex justify-between items-center text-[13px]">
                     <span className="text-text-muted">Blood Type</span>
                     <span className="font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">{consultation.patient_details?.blood_type || 'Unknown'}</span>
                   </div>
                   
                   {consultation.patient_details?.allergies?.length > 0 && (
                     <div className="pt-2 border-t border-ui-border/50">
                       <span className="block text-[12px] font-medium text-text-muted mb-1.5">Allergies</span>
                       <div className="flex flex-wrap gap-1.5">
                         {consultation.patient_details.allergies.map((allergy: string, idx: number) => (
                           <span key={idx} className="bg-red-500/10 text-red-600 text-[11px] font-semibold px-2 py-1 rounded-md">
                             {allergy}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}

                   {consultation.patient_details?.medical_history && (
                     <div className="pt-2 border-t border-ui-border/50">
                       <span className="block text-[12px] font-medium text-text-muted mb-1">Medical History</span>
                       <p className="text-[13px] text-text-secondary leading-relaxed">
                         {consultation.patient_details.medical_history}
                       </p>
                     </div>
                   )}
                 </div>
              </div>

              {/* Timeline Section */}
              <div className="flex-1 p-6 bg-bg-surface/50">
                 <h3 className="text-[12px] font-bold text-text-muted uppercase tracking-wider mb-5">Patient Timeline</h3>
                 
                 {timelineData && timelineData.length > 0 ? (
                   <div className="relative border-l-2 border-ui-border ml-3 space-y-6 pb-6">
                     {timelineData.map((event: any, i: number) => (
                       <div key={i} className="relative pl-6">
                         <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-bg-surface border-2 border-brand-indigo flex items-center justify-center">
                           <div className="w-1.5 h-1.5 rounded-full bg-brand-indigo"></div>
                         </div>
                         <div className="text-[11px] text-text-muted font-mono mb-1">{format(new Date(event.date), 'dd MMM yyyy, HH:mm')}</div>
                         <div className="bg-white border border-ui-border rounded-xl p-3.5 shadow-sm hover:border-brand-indigo/30 hover:shadow-md transition-all">
                           <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary mb-1.5">
                             {event.event_type === 'CONSULTATION' ? <User size={14} className="text-brand-indigo"/> : <FileText size={14} className="text-[#22C55E]"/>}
                             {event.title}
                           </div>
                           {event.event_type === 'CONSULTATION' ? (
                             <>
                               <p className="text-[12px] text-text-secondary line-clamp-2"><span className="font-medium">Motive:</span> {event.metadata?.motive || 'General'}</p>
                               {event.description && <p className="text-[12px] text-text-secondary mt-1 line-clamp-2"><span className="font-medium">Diagnosis:</span> {event.description}</p>}
                             </>
                           ) : (
                             <div className="space-y-1">
                               <p className="text-[12px] text-text-secondary line-clamp-2">{event.description}</p>
                             </div>
                           )}
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="text-center text-text-muted text-[13px] py-10 bg-white rounded-xl border border-dashed border-ui-border">No history available.</div>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
