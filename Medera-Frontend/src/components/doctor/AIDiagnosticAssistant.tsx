import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Plus, Search, Check, ThumbsUp, ThumbsDown, AlertTriangle, RefreshCw, ArrowDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import * as aiService from '../../services/aiService';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ALL_SYMPTOMS } from '../../data/symptoms';

interface AIDiagnosticAssistantProps {
  isReadonly: boolean;
  aiUsed: boolean;
  patient: any;
  consultationId: string;
  initialSymptoms?: string[];
  initialPredictions?: any[];
  onApplyDiagnosis: (text: string) => void;
  onAIUsed: () => void;
}

// Debounce helper
function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: NodeJS.Timeout;
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const AIDiagnosticAssistant: React.FC<AIDiagnosticAssistantProps> = ({ 
  isReadonly, 
  aiUsed, 
  patient,
  consultationId,
  initialSymptoms = [],
  initialPredictions = [],
  onApplyDiagnosis,
  onAIUsed
}) => {
  const { t, lang } = useLanguage();
  
  // States
  const [activeTab, setActiveTab] = useState<'free' | 'selector'>('free');
  const [proseText, setProseText] = useState('');
  const [nlpLoading, setNlpLoading] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<{value: string, label: string}[]>([]);
  const [textSymptoms, setTextSymptoms] = useState<string[]>([]);
  const [symptomSearch, setSymptomSearch] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [symptomLang, setSymptomLang] = useState<'en' | 'fr'>((lang as 'en' | 'fr') || 'en');
  
  // Context states
  const [travelTropical, setTravelTropical] = useState(false);
  
  // API states
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'result' | 'error'>(initialPredictions?.length ? 'result' : 'idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<any[]>(initialPredictions || []);
  const [telemetryId, setTelemetryId] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(1);
  const [feedbacks, setFeedbacks] = useState<Record<number, 'like' | 'dislike' | null>>({});

  useEffect(() => {
    if (initialPredictions?.length > 0) {
      setPredictions(initialPredictions);
      setAiState('result');
    }
  }, [initialPredictions]);


  // Queries
  const { data: healthData, isError: isHealthError } = useQuery({
    queryKey: ['ai-health'],
    queryFn: aiService.checkAiHealth,
    refetchInterval: 60000, // Check every minute
    retry: 1
  });

  const { data: symptomsData } = useQuery({
    queryKey: ['ai-symptoms'],
    queryFn: aiService.getSymptomsList,
    staleTime: Infinity // Symptoms list is static
  });

  const availableSymptoms = useMemo(() => {
    return ALL_SYMPTOMS;
  }, []);

  useEffect(() => {
    if (initialSymptoms?.length > 0 && selectedSymptoms.length === 0 && availableSymptoms.length > 0) {
      const mapped = initialSymptoms.map(val => {
        const found = availableSymptoms.find((s: any) => s.value === val || s.id === val);
        const label = found ? (lang === 'fr' ? found.label_fr : found.label_en) : val;
        return { value: val, label };
      });
      setSelectedSymptoms(mapped);
      if (activeTab === 'free') setActiveTab('selector');
    }
  }, [initialSymptoms, availableSymptoms, lang]);

  const isAvailable = useMemo(() => !isHealthError && healthData?.status === 'ok', [isHealthError, healthData]);

  // Mutations
  const feedbackMutation = useMutation({
    mutationFn: ({ index, correct }: { index: number, correct: boolean }) => 
      aiService.submitFeedback(telemetryId!, index, correct)
  });

  // Debounced NLP extraction
  const extractSymptoms = useRef(
    debounce(async (text: string, currentLang: string) => {
      if (text.length < 20) {
        setNlpLoading(false);
        return;
      }
      setNlpLoading(true);
      try {
        const data = await aiService.extractSymptoms(text, currentLang);
        setTextSymptoms(data.symptoms || []);
      } catch (e) {
        console.error("NLP extraction failed", e);
      } finally {
        setNlpLoading(false);
      }
    }, 600)
  ).current;

  const handleProseInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setProseText(text);
    if (!isAvailable) return;
    setNlpLoading(true);
    extractSymptoms(text, lang as string);
  };

  const canGenerate = (proseText.length >= 20 || (activeTab === 'selector' ? selectedSymptoms.length >= 2 : textSymptoms.length >= 2)) && isAvailable;

  const generateSuggestions = async () => {
    const currentSymptoms = activeTab === 'selector' ? selectedSymptoms.map(s => s.value) : textSymptoms;
    
    if (currentSymptoms.length < 2) {
       setAiState('error');
       const minSymMsg = t('ai.error.min_symptoms');
       setAiError(minSymMsg !== 'ai.error.min_symptoms' ? minSymMsg : 'Insufficient Clinical Data: Please select at least 2 symptoms for a reliable AI diagnostic analysis.');
       return;
    }
    
    setAiState('loading');
    setLoadingStep(1);
    setFeedbacks({});
    
    const interval = setInterval(() => {
      setLoadingStep(s => (s < 4 ? s + 1 : s));
    }, 800);
    
    const payload = {
      symptoms: currentSymptoms,
      age: patient?.age || 30,
      sex: patient?.gender?.startsWith('F') ? 'F' : 'M',
      history_diabetes: patient?.history?.toLowerCase().includes('diabetes') || false,
      history_smoking: patient?.history?.toLowerCase().includes('smoking') || false,
      travel_tropical: travelTropical,
    };

    try {
      const mod = await import('../../services/consultationService');
      const data = await mod.generateAiSuggestions(consultationId, payload);
      
      clearInterval(interval);
      setPredictions(data.predictions || []);
      setTelemetryId(data.telemetry_id);
      setAiState('result');
      onAIUsed();
      
    } catch (err: any) {
      clearInterval(interval);
      setAiState('error');
      
      const status = err.response?.status;
      const backendMessage = err.response?.data?.detail;
      
      let translationKey = 'ai.error.default';
      if (status === 400) translationKey = backendMessage || 'ai.error.invalid';
      else if (status === 401) translationKey = 'ai.error.auth';
      else if (status === 503) translationKey = 'ai.error.loading';
      else if (status === 500) translationKey = 'ai.error.server';
      
      let msg = t(translationKey);
      if (msg === translationKey) {
        const fallbacks: Record<string, string> = {
          'ai.error.auth': 'Authentication failed. Please verify your session.',
          'ai.error.loading': 'AI Engine is initializing. Please wait a moment.',
          'ai.error.server': 'AI Service is temporarily offline.',
          'ai.error.invalid': 'Invalid clinical parameters submitted.',
        };
        msg = fallbacks[translationKey] || 'An unexpected error occurred during clinical analysis.';
      }
      setAiError(backendMessage ? backendMessage : msg);
    }
  };

  const applyDiagnosis = (pred: any) => {
    const diseaseName = lang === 'fr' ? pred.name_fr : pred.name_en;
    const text = `${diseaseName} (ICD-10: ${pred.icd10})`;
    onApplyDiagnosis(text);
  };
  
  const handleFeedback = (predictionIndex: number, type: 'like' | 'dislike') => {
    setFeedbacks(prev => {
      const current = prev[predictionIndex];
      const next = current === type ? null : type;
      if (telemetryId && next !== null) {
        feedbackMutation.mutate({ index: predictionIndex, correct: next === 'like' });
      }
      return { ...prev, [predictionIndex]: next };
    });
  };

  const getSeverityConfig = (level: number) => {
    const config: any = {
      1: { label: t('ai.severity.1') || 'Self-Limiting / Routine', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
      2: { label: t('ai.severity.2') || 'Low Acuity', color: '#86EFAC', bg: 'rgba(134,239,172,0.12)' },
      3: { label: t('ai.severity.3') || 'Moderate Acuity', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
      4: { label: t('ai.severity.4') || 'High Acuity / Urgent', color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
      5: { label: t('ai.severity.5') || 'Critical / Emergency', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    };
    return config[level] || config[1];
  };

  if (isReadonly) {
    if (!aiUsed) return null;
    return (
      <div className="bg-brand-indigo/5 border border-brand-indigo/15 rounded-xl p-4 flex items-center gap-3">
        <Sparkles size={16} className="text-brand-indigo" />
        <p className="text-[13px] text-text-muted italic">{t('ai.used.summary') || 'AI Diagnostics used during this consultation.'}</p>
      </div>
    );
  }

  return (
    <div className={`mt-2 rounded-2xl border border-brand-indigo/15 relative overflow-hidden transition-opacity ${!isAvailable ? 'opacity-50' : 'opacity-100'}`} style={{
      background: 'linear-gradient(145deg, #ffffff 0%, #f8faff 100%)',
    }}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-indigo via-[#818cf8] to-brand-indigo opacity-80" />

      <div className="absolute -top-[1px] right-6 bg-gradient-to-b from-brand-indigo to-[#4B4ACF] text-white font-mono text-[10px] font-bold tracking-widest px-3 py-1.5 rounded-b-lg flex items-center gap-1.5 shadow-md shadow-brand-indigo/20 z-10">
        <Sparkles size={12} className="animate-pulse" />
        {t('ai.badge') || 'AI ASSISTANT'}
      </div>

      <div className="p-6 pt-7">
        <div className="flex items-center justify-between mb-5">
           <div className="text-[12px] font-sans text-text-muted">
             {t('ai.powered')} · RandomForest + NLP
           </div>
           <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider">
             {isAvailable ? (
               <><span className="w-2 h-2 rounded-full bg-[#22C55E]"></span> <span className="text-[#22C55E]">{t('ai.status.ready')}</span></>
             ) : (
               <><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span> <span className="text-[#F59E0B]">{t('ai.status.unavailable')}</span></>
             )}
           </div>
        </div>

        <div className="pointer-events-auto" style={{ pointerEvents: !isAvailable ? 'none' : 'auto' }}>
          <div className="flex items-center gap-2 mb-5 bg-white border border-ui-border/60 p-1 rounded-lg w-fit">
             <button 
               onClick={() => setActiveTab('free')}
               className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all ${activeTab === 'free' ? 'bg-brand-indigo/10 text-brand-indigo shadow-sm' : 'bg-transparent text-text-muted hover:text-text-primary'}`}
             >
               {t('ai.tab.freetext') || 'Free Text & NLP'}
             </button>
             <button 
               onClick={() => setActiveTab('selector')}
               className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all ${activeTab === 'selector' ? 'bg-brand-indigo/10 text-brand-indigo shadow-sm' : 'bg-transparent text-text-muted hover:text-text-primary'}`}
             >
               {t('ai.tab.selector') || 'Symptom Selector'}
             </button>
          </div>

          {activeTab === 'free' ? (
            <div>
              <textarea 
                value={proseText}
                onChange={handleProseInput}
                placeholder={t('ai.prose.placeholder') || "Describe symptoms in plain language... e.g. 'Patient presents with high fever, chills, and fatigue for 3 days'"}
                className="w-full bg-white border border-ui-border shadow-sm rounded-xl p-4 min-h-[110px] max-h-[250px] text-[14px] font-medium text-text-primary focus:outline-none focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 transition-all resize-y placeholder:font-normal"
              />
              <div className="mt-3 min-h-[30px] flex items-center flex-wrap gap-2">
                {nlpLoading ? (
                  <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
                    {t('ai.detecting')}
                    <div className="w-3 h-3 border-2 border-brand-indigo/30 border-t-brand-indigo rounded-full animate-spin"></div>
                  </div>
                ) : textSymptoms.length > 0 ? (
                  <>
                    <span className="text-[12px] text-text-muted mr-1">{t('ai.detected')}</span>
                    {textSymptoms.map(sym => (
                      <div key={sym} className="inline-flex items-center gap-1.5 bg-brand-indigo/10 border border-brand-indigo/30 text-brand-indigo px-2.5 py-1 rounded-full text-[13px] font-medium animate-[popIn_250ms_ease]">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-indigo animate-pulse"></span>
                        {sym}
                        <button onClick={() => setTextSymptoms(s => s.filter(x => x !== sym))} className="text-text-muted hover:text-red-500 ml-1">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => setActiveTab('selector')} className="text-[12px] text-text-muted hover:text-brand-indigo ml-2 flex items-center gap-1 transition-colors">
                      <Plus size={12} /> {t('ai.add.manually') || 'Add manually'}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="relative mb-6">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-3 text-text-muted" />
                <input 
                  type="text" 
                  value={symptomSearch}
                  onChange={(e) => {
                    setSymptomSearch(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                  placeholder="Search symptoms..."
                  className="w-full bg-bg-surface border border-brand-indigo/25 rounded-xl py-2.5 pl-10 pr-20 text-[14px] font-sans text-text-primary focus:outline-none focus:border-brand-indigo transition-all"
                />
                <div className="absolute right-2 top-2 flex items-center gap-1 bg-ui-border/50 p-0.5 rounded-md z-10">
                  <button 
                    onMouseDown={(e) => { e.preventDefault(); setSymptomLang('en'); }}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${symptomLang === 'en' ? 'bg-white text-brand-indigo shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                  >EN</button>
                  <button 
                    onMouseDown={(e) => { e.preventDefault(); setSymptomLang('fr'); }}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${symptomLang === 'fr' ? 'bg-white text-brand-indigo shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                  >FR</button>
                </div>
                
                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-bg-surface border border-ui-border rounded-xl shadow-lg shadow-brand-indigo/10 max-h-[200px] overflow-y-auto z-20">
                    {availableSymptoms
                      .filter(s => {
                        if (!symptomSearch) return true;
                        const label = symptomLang === 'fr' ? s.label_fr : s.label_en;
                        return label?.toLowerCase().includes(symptomSearch.toLowerCase());
                      })
                      .sort((a, b) => {
                        const labelA = (symptomLang === 'fr' ? a.label_fr : a.label_en) || '';
                        const labelB = (symptomLang === 'fr' ? b.label_fr : b.label_en) || '';
                        if (!symptomSearch) return labelA.localeCompare(labelB);
                        
                        const searchLower = symptomSearch.toLowerCase();
                        const aStarts = labelA.toLowerCase().startsWith(searchLower);
                        const bStarts = labelB.toLowerCase().startsWith(searchLower);
                        
                        if (aStarts && !bStarts) return -1;
                        if (!aStarts && bStarts) return 1;
                        return labelA.localeCompare(labelB);
                      })
                      .map((s) => {
                        const label = symptomLang === 'fr' ? s.label_fr : s.label_en;
                        const value = s.value || s.id;
                        return (
                          <div 
                            key={value} 
                            className="px-4 py-2 hover:bg-bg-input cursor-pointer text-[13px] text-text-primary transition-colors border-b border-ui-border/50 last:border-0"
                            onClick={() => {
                              if (!selectedSymptoms.some(x => x.value === value)) {
                                setSelectedSymptoms([...selectedSymptoms, { value, label }]);
                              }
                              setSymptomSearch('');
                              setDropdownOpen(false);
                            }}
                          >
                            {label}
                          </div>
                      )})}
                  </div>
                )}
              </div>
              
              {selectedSymptoms.length > 0 && (
                 <div className="mt-3 flex flex-wrap gap-2">
                   {selectedSymptoms.map(sym => (
                      <div key={sym.value} className="inline-flex items-center gap-1.5 bg-brand-indigo/10 border border-brand-indigo/30 text-brand-indigo px-2.5 py-1 rounded-full text-[13px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-indigo"></span>
                        {sym.label}
                        <button onClick={() => setSelectedSymptoms(s => s.filter(x => x.value !== sym.value))} className="text-text-muted hover:text-red-500 ml-1">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                 </div>
              )}
            </div>
          )}

          <div className="mt-2">
             <button onClick={() => setShowContext(!showContext)} className="text-[13px] text-brand-indigo font-medium hover:underline">
               {t('ai.context.toggle')}
             </button>
             <AnimatePresence>
                {showContext && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-3"
                  >
                     <div className="grid grid-cols-2 gap-x-8">
                       <div className="flex items-center justify-between py-2.5 border-b border-ui-border text-[13px] text-text-secondary">
                          <span>Age</span>
                          <span className="font-mono text-text-primary">{patient?.age || 'Unknown'}</span>
                       </div>
                       <div className="flex items-center justify-between py-2.5 border-b border-ui-border text-[13px] text-text-secondary">
                          <span>Sex</span>
                          <span className="font-mono text-text-primary">{patient?.gender?.[0] || 'Unknown'}</span>
                       </div>
                       <div className="flex items-center justify-between py-2.5 border-b border-ui-border text-[13px] text-text-secondary">
                          <span>Allergies</span>
                          <span className="font-mono text-text-primary">{patient?.allergies || 'None'}</span>
                       </div>
                       <div className="flex items-center justify-between py-2.5 border-b border-ui-border text-[13px] text-text-secondary">
                          <span>History: Diabetes</span>
                          <span className="font-mono text-text-primary">
                            {(patient?.history?.toLowerCase().includes('diabetes')) ? <span className="text-brand-indigo font-bold">● Yes</span> : <span className="text-text-muted">○ No</span>}
                          </span>
                       </div>
                       <div className="flex items-center justify-between py-2.5 border-b border-ui-border text-[13px] text-text-secondary">
                          <span>History: Smoking</span>
                          <span className="font-mono text-text-primary">
                            {(patient?.history?.toLowerCase().includes('smoking')) ? <span className="text-brand-indigo font-bold">● Yes</span> : <span className="text-text-muted">○ No</span>}
                          </span>
                       </div>
                       <div className="flex items-center justify-between py-2.5 border-b border-ui-border text-[13px] text-text-secondary">
                          <span>{t('ai.context.travel') || 'Travel (tropical)'}</span>
                          <button onClick={() => setTravelTropical(!travelTropical)} className="font-mono tracking-wide focus:outline-none">
                            {travelTropical ? <span className="text-brand-indigo font-bold">● Yes</span> : <span className="text-text-muted hover:text-text-primary">○ No</span>}
                          </button>
                       </div>
                     </div>
                     <p className="mt-3 text-[12px] text-text-muted italic">{t('ai.context.note')}</p>
                  </motion.div>
                )}
             </AnimatePresence>
          </div>

          {/* GENERATE BUTTON OR ERROR OR RESULTS */}
          <AnimatePresence mode="wait">
            {aiState === 'idle' && (
              <motion.button 
                key="btn-idle"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                disabled={!canGenerate}
                onClick={generateSuggestions}
                className="w-full h-[54px] bg-gradient-to-r from-brand-indigo via-[#5c5bf0] to-brand-indigo bg-[length:200%_auto] hover:bg-[position:right_center] rounded-xl text-white font-sans text-[15px] font-bold flex items-center justify-center gap-2 mt-6 transition-all hover:shadow-[0_8px_20px_rgba(75,74,207,0.3)] disabled:opacity-50 disabled:hover:shadow-none disabled:grayscale"
              >
                <Sparkles size={18} className={canGenerate ? "animate-pulse" : ""} />
                {t('ai.generate') || 'Generate Diagnostic Suggestions'}
              </motion.button>
            )}

            {aiState === 'loading' && (
              <motion.div 
                key="btn-loading"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="w-full h-[52px] bg-brand-indigo/10 border border-brand-indigo/20 rounded-xl flex items-center justify-center gap-3 mt-6"
              >
                <div className="w-4 h-4 border-2 border-brand-indigo/30 border-t-brand-indigo rounded-full animate-spin"></div>
                <span className="text-brand-indigo font-medium text-[14px] animate-[pulse_1s_ease-in-out_infinite]">
                  {t(`ai.loading.${loadingStep}`) || 'Analyzing symptoms...'}
                </span>
              </motion.div>
            )}

            {aiState === 'error' && (
              <motion.div 
                key="block-error"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-[#FEF2F2] dark:bg-red-500/10 border border-[#FCA5A5] dark:border-red-500/20 rounded-xl p-4 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg shrink-0">
                    <AlertTriangle className="text-red-600 dark:text-red-400" size={18} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-red-800 dark:text-red-400 uppercase tracking-wider mb-0.5">Clinical Alert</h4>
                    <span className="text-[14px] text-red-700 dark:text-red-300 font-medium">{aiError}</span>
                  </div>
                </div>
                <button onClick={() => setAiState('idle')} className="text-[13px] text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/20 px-4 py-2 rounded-lg transition-colors font-semibold shrink-0 border border-red-200 dark:border-red-500/30 shadow-sm bg-white dark:bg-transparent">
                  {t('ai.error.retry') !== 'ai.error.retry' ? t('ai.error.retry') : 'Acknowledge'}
                </button>
              </motion.div>
            )}

            {aiState === 'result' && (
              <motion.div 
                key="block-results"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="mt-6 border-t border-ui-border pt-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-[15px] font-sans font-semibold text-text-primary flex items-center gap-2">
                       <Sparkles size={16} className="text-brand-indigo" />
                       {t('ai.results.header')}
                    </h3>
                    <p className="text-[13px] text-text-muted mt-0.5">
                       {(t('ai.results.found') || '').replace('{n}', predictions.length.toString())} · Confidence threshold applied
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={generateSuggestions} className="text-[12px] font-medium text-text-muted hover:text-brand-indigo hover:bg-brand-indigo/10 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                       <RefreshCw size={14} /> {t('ai.regenerate') || 'Regenerate'}
                    </button>
                    <button onClick={() => setAiState('idle')} className="text-[12px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-input px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                       <X size={14} /> {t('ai.clear') || 'Clear'}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {predictions.slice(0, 3).map((pred, i) => {
                     const severity = getSeverityConfig(pred.severity || 1);
                     const confidencePercent = (pred.confidence * 100).toFixed(1);
                     const name = symptomLang === 'fr' ? (pred.name_fr || pred.name_en) : pred.name_en;
                     const totalWeight = pred.evidence?.reduce((a: number, b: any) => a + (b.weight || 0), 0) || 1;

                     return (
                       <motion.div 
                         initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                         key={name}
                         className="bg-white border border-brand-indigo/10 hover:border-brand-indigo/40 rounded-2xl p-5 hover:shadow-xl hover:shadow-brand-indigo/10 transition-all hover:-translate-y-1 relative group overflow-hidden"
                       >
                          {/* Accent left border based on confidence */}
                          <div className="absolute left-0 top-0 bottom-0 w-1" style={{
                            background: Number(confidencePercent) >= 80 ? 'linear-gradient(180deg, #4B4ACF, #6C6BFF)' : 
                                        Number(confidencePercent) >= 60 ? '#F59E0B' : '#EF4444'
                          }} />
                          {/* Top Row: Severity & ICD-10 */}
                          <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold tracking-widest uppercase"
                                  style={{ backgroundColor: severity.bg, color: severity.color, borderColor: severity.color }}>
                                {severity.label}
                             </div>
                             {pred.icd10 && (
                               <div className="bg-brand-indigo/5 border border-brand-indigo/20 text-brand-indigo font-mono text-[11px] px-2 py-0.5 rounded-md">
                                 ICD-10: {pred.icd10}
                               </div>
                             )}
                          </div>

                          {/* Disease Name */}
                          <h4 className="text-[16px] font-sans font-semibold text-text-primary mb-4">{name}</h4>

                          {/* Confidence */}
                          <div className="mb-5 bg-bg-surface p-3 rounded-xl border border-ui-border/50">
                             <div className="flex justify-between items-center text-[12px] text-text-muted mb-2">
                                <span className="font-semibold">{t('ai.confidence') || 'Confidence Score'}</span>
                                <span className="font-mono font-bold text-text-primary text-[14px]">{confidencePercent}%</span>
                             </div>
                             <div className="h-2 bg-bg-input rounded-full overflow-hidden shadow-inner">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${confidencePercent}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  className="h-full rounded-full"
                                  style={{
                                    background: Number(confidencePercent) >= 80 ? 'linear-gradient(90deg, #4B4ACF, #6C6BFF)' : 
                                                Number(confidencePercent) >= 60 ? 'linear-gradient(90deg, #F59E0B, #FCD34D)' : 
                                                'linear-gradient(90deg, #EF4444, #FCA5A5)'
                                  }}
                                />
                             </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between border-t border-ui-border pt-4">
                             <button onClick={() => applyDiagnosis(pred)} className="bg-brand-indigo/10 hover:bg-brand-indigo/20 border border-brand-indigo/20 hover:border-brand-indigo/50 text-brand-indigo font-medium text-[13px] px-4 py-2 rounded-xl transition-all">
                                <ArrowDown size={14} className="inline mr-1" /> {t('ai.apply')}
                             </button>
                             <div className="flex items-center gap-1.5">
                                <button 
                                  onClick={() => handleFeedback(i, 'like')}
                                  className={`p-1.5 rounded-lg border transition-colors ${feedbacks[i] === 'like' ? 'bg-green-500/10 text-green-500 border-green-500/30' : 'border-transparent text-text-muted hover:bg-bg-input hover:text-text-primary'}`}
                                  title={t('ai.feedback.correct') || 'Correct'}
                                >
                                  <ThumbsUp size={16} />
                                </button>
                                <button 
                                  onClick={() => handleFeedback(i, 'dislike')}
                                  className={`p-1.5 rounded-lg border transition-colors ${feedbacks[i] === 'dislike' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'border-transparent text-text-muted hover:bg-bg-input hover:text-text-primary'}`}
                                  title={t('ai.feedback.wrong') || 'Wrong'}
                                >
                                  <ThumbsDown size={16} />
                                </button>
                             </div>
                          </div>
                       </motion.div>
                     )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DISCLAIMER */}
        <div className="mt-8 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl p-4 flex gap-3 shadow-sm">
           <AlertTriangle size={18} className="text-[#F59E0B] shrink-0 mt-0.5" />
           <p className="text-[12px] font-sans text-[#b47101] leading-relaxed font-medium">
             {t('ai.disclaimer') || "AI-generated suggestions are for clinical decision support only. All diagnoses must be reviewed and confirmed by the attending physician."}
           </p>
        </div>
      </div>
    </div>
  );
};

export default AIDiagnosticAssistant;
