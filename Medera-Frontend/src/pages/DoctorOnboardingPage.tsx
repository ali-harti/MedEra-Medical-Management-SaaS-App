import React, { useState, useRef } from 'react';
import { TopRightActions } from '../components/TopRightActions';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../components/Toast';
import { Activity, Upload, CheckCircle2, ChevronRight, ChevronLeft, Building2, User, ArrowLeft, Lock, Loader2 } from 'lucide-react';

export default function DoctorOnboardingPage() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [submitText, setSubmitText] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([t('onboard.s2.soloSoloList'), t('onboard.s2.groupGroupList')]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['ar', 'fr']);
  const [docUploaded, setDocUploaded] = useState(false);
  const [fileName, setFileName] = useState('');
  const [declarationAgreed, setDeclarationAgreed] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    specialty: '',
    experience: '',
    fees: '',
    clinicName: '',
    address: '',
    city: '',
    postalCode: '',
    licenseNum: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors.includes(field)) {
      setErrors(prev => prev.filter(e => e !== field));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      addToast(t('global.error.fileSize').includes('volumineux') ? 'Type de fichier non supporté (PDF, JPG, PNG uniquement)' : 'Unsupported file type (PDF, JPG, PNG only)', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast(t('global.error.fileSize'), 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsSubmitLoading(true);
    setFileName(file.name);
    setTimeout(() => { 
      setIsSubmitLoading(false); 
      setDocUploaded(true); 
      setErrors(prev => prev.filter(e => e !== 'docUploaded'));
      addToast(t('onboard.s3.uploaded'), 'success');
    }, 1500);
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => {
      const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type];
      if (next.length > 0 && errors.includes('practiceType')) {
        setErrors(errs => errs.filter(e => e !== 'practiceType'));
      }
      return next;
    });
  };

  const toggleLanguage = (lng: string) => {
    setSelectedLanguages(prev => {
      const next = prev.includes(lng) ? prev.filter(l => l !== lng) : [...prev, lng];
      if (next.length > 0 && errors.includes('languages')) {
        setErrors(errs => errs.filter(e => e !== 'languages'));
      }
      return next;
    });
  };

  const validateStep = (s: number) => {
    const newErrors: string[] = [];
    if (s === 1) {
      if (!formData.firstName.trim()) newErrors.push('firstName');
      if (!formData.lastName.trim()) newErrors.push('lastName');
      if (!formData.email.trim()) newErrors.push('email');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.push('email');
    } else if (s === 2) {
      if (!formData.specialty.trim()) newErrors.push('specialty');
      if (!formData.experience.trim()) newErrors.push('experience');
      if (!formData.fees.trim()) newErrors.push('fees');
      if (!formData.clinicName.trim()) newErrors.push('clinicName');
      if (!formData.address.trim()) newErrors.push('address');
      if (!formData.city.trim()) newErrors.push('city');
      if (!formData.postalCode.trim()) newErrors.push('postalCode');
      if (selectedTypes.length === 0) newErrors.push('practiceType');
      if (selectedLanguages.length === 0) newErrors.push('languages');
    } else if (s === 3) {
      if (!formData.licenseNum.trim()) newErrors.push('licenseNum');
      if (!docUploaded) newErrors.push('docUploaded');
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const goToStep = (s: number) => {
    if (s > step) {
      if (!validateStep(step)) return;
    }
    setDirection(s > step ? 1 : -1);
    setStep(s);
    setErrors([]);
  };

  const handleFinalSubmit = () => {
    setIsSubmitLoading(true);
    setSubmitText('');
    setTimeout(() => {
      setSubmitText(t('onboard.s4.loading1'));
      setTimeout(() => {
        setSubmitText(t('onboard.s4.loading2'));
        setTimeout(() => {
          setSubmitText(t('onboard.s4.loading3'));
          setTimeout(() => {
            navigate('/onboarding/pending');
          }, 800);
        }, 1500);
      }, 1500);
    }, 500);
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (dir: number) => ({ zIndex: 0, x: dir < 0 ? 60 : -60, opacity: 0 })
  };

  const steps = [
    { label: t('onboard.step1'), number: 1 },
    { label: t('onboard.step2'), number: 2 },
    { label: t('onboard.step3'), number: 3 },
    { label: t('onboard.step4'), number: 4 },
  ];

  return (
    <div className="min-h-screen w-full bg-bg-canvas font-sans text-text-primary overflow-hidden relative flex flex-col items-center">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')` }}></div>
      <div className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: 'radial-gradient(circle, var(--indigo) 1px, transparent 1px)', backgroundSize: '28px 28px' }}></div>

      <div className="absolute top-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-20 pointer-events-none">
        <div className="w-1/3 flex justify-start">
          <button onClick={() => navigate('/get-started')} className="group flex items-center text-text-muted hover:text-text-primary transition-colors text-sm font-medium pointer-events-auto">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> {t('global.back')}
          </button>
        </div>
        <div className="w-1/3 flex justify-center"></div>
        <div className="w-1/3 flex justify-end">
          <TopRightActions />
        </div>
      </div>

      {/* Progress Bar Top */}
      <div className="w-full max-w-4xl px-8 pt-12 pb-8 relative z-20">
        <div className="flex flex-col items-center mb-8 gap-4 justify-center">
          <div className="flex items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-brand-indigo flex items-center justify-center shadow-shadow-glow">
              <Activity className="w-10 h-10 text-white" />
            </div>
            <span className="font-serif font-bold text-5xl text-text-primary">MedEra</span>
          </div>
          <div className="font-mono text-xs text-brand-lavender tracking-wider">{t('onboard.stepOfStep').replace('{n}', step.toString())}</div>
        </div>

        <div className="relative flex justify-between">
          <div className="absolute top-3 left-0 w-full h-[2px] bg-ui-border -z-10">
            <motion.div 
              className="h-full bg-brand-indigo"
              initial={{ width: 0 }} animate={{ width: `${((step - 1) / 3) * 100}%` }} transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          {steps.map((sec, idx) => {
            const isCompleted = idx + 1 < step;
            const isCurrent = idx + 1 === step;
            return (
              <div key={sec.label} className="flex flex-col items-center gap-3 bg-bg-canvas px-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors duration-300 relative ${isCompleted ? 'bg-brand-indigo border-brand-indigo' : isCurrent ? 'bg-bg-elevated border-brand-indigo' : 'bg-bg-elevated border-ui-border-focus'}`}>
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 text-white" /> : <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-brand-indigo' : 'bg-transparent'}`}></span>}
                  {isCurrent && <div className="absolute inset-0 rounded-full border border-brand-indigo animate-ping opacity-30"></div>}
                </div>
                <span className={`font-mono text-[10px] tracking-wider ${isCurrent || isCompleted ? 'text-text-primary' : 'text-text-muted'}`}>{sec.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 w-full flex justify-center relative z-10 px-6">
        <AnimatePresence custom={direction} mode="wait">
          {step === 1 && (
            <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full max-w-2xl pb-24">
              <h2 className="text-[40px] font-serif text-text-primary mb-2 text-center">{t('onboard.s1.headline')}</h2>
              <p className="text-text-secondary text-center mb-12">{t('onboard.s1.subtitle')}</p>
              
              <div className="glass-island border border-ui-border rounded-3xl p-8 space-y-6">
                <div className="flex justify-center mb-6">
                  <div className="w-[120px] h-[120px] rounded-full border-2 border-dashed border-ui-border-focus flex flex-col items-center justify-center gap-2 text-text-muted hover:border-brand-indigo hover:text-brand-lavender transition-colors cursor-pointer bg-bg-elevated">
                    <Upload className="w-6 h-6" />
                    <span className="text-[10px] uppercase font-mono tracking-wider text-center px-4">{t('onboard.s1.photo')}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={formData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      onFocus={() => setFocusedField('firstName')}
                      onBlur={() => setFocusedField(null)}
                      placeholder=" "
                      className={`w-full bg-bg-input border ${errors.includes('firstName') ? 'border-state-error shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-ui-border'} rounded-[1.25rem] py-4 px-5 text-text-primary text-[15px] outline-none hover:border-ui-border-hover focus:border-brand-indigo focus:ring-4 focus:ring-brand-indigo/10 transition-all peer`} 
                    />
                    <label className={`absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-all duration-200 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-brand-indigo peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[11px] ${focusedField === 'firstName' ? 'text-brand-indigo' : ''} ${errors.includes('firstName') ? '!text-state-error' : ''}`}>
                      {t('patient.firstName')}
                    </label>
                  </div>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={formData.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      onFocus={() => setFocusedField('lastName')}
                      onBlur={() => setFocusedField(null)}
                      placeholder=" "
                      className={`w-full bg-bg-input border ${errors.includes('lastName') ? 'border-state-error shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-ui-border'} rounded-[1.25rem] py-4 px-5 text-text-primary text-[15px] outline-none hover:border-ui-border-hover focus:border-brand-indigo focus:ring-4 focus:ring-brand-indigo/10 transition-all peer`} 
                    />
                    <label className={`absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-all duration-200 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-brand-indigo peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[11px] ${focusedField === 'lastName' ? 'text-brand-indigo' : ''} ${errors.includes('lastName') ? '!text-state-error' : ''}`}>
                      {t('patient.lastName')}
                    </label>
                  </div>
                </div>

                <div className="relative group">
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder=" "
                    className={`w-full bg-bg-input border ${errors.includes('email') ? 'border-state-error shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-ui-border'} rounded-[1.25rem] py-4 px-5 text-text-primary text-[15px] outline-none hover:border-ui-border-hover focus:border-brand-indigo focus:ring-4 focus:ring-brand-indigo/10 transition-all peer`} 
                  />
                  <label className={`absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-all duration-200 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-brand-indigo peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[11px] ${focusedField === 'email' ? 'text-brand-indigo' : ''} ${errors.includes('email') ? '!text-state-error' : ''}`}>
                    {t('patient.email')}
                  </label>
                </div>
                <div className="flex justify-end pt-4">
                  <button onClick={() => goToStep(2)} className="group bg-brand-indigo hover:bg-brand-indigo-glow text-white px-8 py-3.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-shadow-glow">{t('global.continue')} <ChevronRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" /></button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full max-w-2xl pb-24">
              <h2 className="text-[40px] font-serif text-text-primary mb-2 text-center">{t('onboard.s2.headline')}</h2>
              <p className="text-text-secondary text-center mb-12">{t('onboard.s2.subtitle')}</p>
              
              <div className="glass-island border border-ui-border rounded-3xl p-8 space-y-8">
                <div>
                  <label className={`block text-[13px] mb-2 font-medium transition-colors ${errors.includes('practiceType') ? 'text-state-error' : 'text-brand-lavender'}`}>{t('onboard.s2.practiceType')}</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[t('onboard.s2.soloSoloList'), t('onboard.s2.groupGroupList'), t('onboard.s2.hospitalHospitalList')].map((type) => (
                      <div key={type} onClick={() => toggleType(type)} className={`border rounded-2xl py-4 px-2 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${selectedTypes.includes(type) ? 'bg-brand-indigo/10 border-brand-indigo shadow-[0_0_20px_rgba(99,102,241,0.1)] text-text-primary' : errors.includes('practiceType') ? 'border-state-error/50 bg-state-error/5 text-text-muted' : 'border-ui-border bg-bg-elevated/50 text-text-muted hover:border-ui-border-hover hover:bg-bg-input'}`}>
                        {type === t('onboard.s2.soloSoloList') ? <User className={`w-5 h-5 ${selectedTypes.includes(type) ? 'text-brand-lavender' : ''}`} /> : type === t('onboard.s2.groupGroupList') ? <Building2 className={`w-5 h-5 ${selectedTypes.includes(type) ? 'text-brand-lavender' : ''}`} /> : <Activity className={`w-5 h-5 ${selectedTypes.includes(type) ? 'text-brand-lavender' : ''}`} />}
                        <span className="text-[11px] font-medium text-center leading-tight">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className={`block text-[13px] mb-2 font-medium transition-colors ${errors.includes('languages') ? 'text-state-error' : 'text-brand-lavender'}`}>{t('onboard.s2.languages')}</label>
                  <div className="flex flex-wrap gap-2">
                    {['ar', 'fr', 'en', 'darija', 'amazigh'].map((lngId) => (
                      <div key={lngId} onClick={() => toggleLanguage(lngId)} className={`px-4 py-2 rounded-full text-xs font-medium border cursor-pointer transition-colors ${selectedLanguages.includes(lngId) ? 'bg-brand-indigo/20 border-brand-indigo text-text-primary' : errors.includes('languages') ? 'border-state-error/50 text-state-error' : 'border-ui-border text-text-muted hover:bg-bg-input'}`}>
                        {t(`onboard.languages.${lngId}`)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={formData.specialty}
                      onChange={(e) => updateField('specialty', e.target.value)}
                      onFocus={() => setFocusedField('specialty')}
                      onBlur={() => setFocusedField(null)}
                      placeholder=" "
                      className={`w-full bg-bg-input border ${errors.includes('specialty') ? 'border-state-error shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-ui-border'} rounded-[1.25rem] py-4 px-5 text-text-primary text-[15px] outline-none hover:border-ui-border-hover focus:border-brand-indigo focus:ring-4 focus:ring-brand-indigo/10 transition-all peer`} 
                    />
                    <label className={`absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-all duration-200 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-brand-indigo peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[11px] ${focusedField === 'specialty' ? 'text-brand-indigo' : ''} ${errors.includes('specialty') ? '!text-state-error' : ''}`}>
                      {t('onboard.s2.specialty')}
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative group">
                      <input 
                        type="number" 
                        value={formData.experience}
                        onChange={(e) => updateField('experience', e.target.value)}
                        onFocus={() => setFocusedField('experience')}
                        onBlur={() => setFocusedField(null)}
                        placeholder=" "
                        className={`w-full bg-bg-input border ${errors.includes('experience') ? 'border-state-error shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-ui-border'} rounded-[1.25rem] py-4 px-5 text-text-primary text-[15px] outline-none hover:border-ui-border-hover focus:border-brand-indigo focus:ring-4 focus:ring-brand-indigo/10 transition-all peer`} 
                      />
                      <label className={`absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-all duration-200 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-brand-indigo peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[11px] ${focusedField === 'experience' ? 'text-brand-indigo' : ''} ${errors.includes('experience') ? '!text-state-error' : ''}`}>
                        {t('onboard.s2.experience')}
                      </label>
                    </div>
                    <div className="relative group">
                      <input 
                        type="text" 
                        value={formData.fees}
                        onChange={(e) => updateField('fees', e.target.value)}
                        onFocus={() => setFocusedField('fees')}
                        onBlur={() => setFocusedField(null)}
                        placeholder=" "
                        className={`w-full bg-bg-input border ${errors.includes('fees') ? 'border-state-error shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-ui-border'} rounded-[1.25rem] py-4 px-5 text-text-primary text-[15px] outline-none hover:border-ui-border-hover focus:border-brand-indigo focus:ring-4 focus:ring-brand-indigo/10 transition-all peer`} 
                      />
                      <label className={`absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-all duration-200 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-brand-indigo peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-xs ${focusedField === 'fees' ? 'text-brand-indigo' : ''} ${errors.includes('fees') ? '!text-state-error' : ''}`}>
                        {t('onboard.s2.fees')}
                      </label>
                    </div>
                  </div>

                  <div className="relative group">
                    <input 
                      type="text" 
                      value={formData.clinicName}
                      onChange={(e) => updateField('clinicName', e.target.value)}
                      onFocus={() => setFocusedField('clinicName')}
                      onBlur={() => setFocusedField(null)}
                      placeholder=" "
                      className={`w-full bg-bg-input border ${errors.includes('clinicName') ? 'border-state-error shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-ui-border'} rounded-[1.25rem] py-4 px-5 text-text-primary text-[15px] outline-none hover:border-ui-border-hover focus:border-brand-indigo focus:ring-4 focus:ring-brand-indigo/10 transition-all peer`} 
                    />
                    <label className={`absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-all duration-200 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-brand-indigo peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[11px] ${focusedField === 'clinicName' ? 'text-brand-indigo' : ''} ${errors.includes('clinicName') ? '!text-state-error' : ''}`}>
                      {t('onboard.s2.clinicName')}
                    </label>
                  </div>

                  <div className="relative group">
                    <input 
                      type="text" 
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      onFocus={() => setFocusedField('address')}
                      onBlur={() => setFocusedField(null)}
                      placeholder=" "
                      className={`w-full bg-bg-input border ${errors.includes('address') ? 'border-state-error shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-ui-border'} rounded-[1.25rem] py-4 px-5 text-text-primary text-[15px] outline-none hover:border-ui-border-hover focus:border-brand-indigo focus:ring-4 focus:ring-brand-indigo/10 transition-all peer`} 
                    />
                    <label className={`absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-all duration-200 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-brand-indigo peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[11px] ${focusedField === 'address' ? 'text-brand-indigo' : ''} ${errors.includes('address') ? '!text-state-error' : ''}`}>
                      {t('onboard.s2.address')}
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative group">
                      <input 
                        type="text" 
                        value={formData.city}
                        onChange={(e) => updateField('city', e.target.value)}
                        onFocus={() => setFocusedField('city')}
                        onBlur={() => setFocusedField(null)}
                        placeholder=" "
                        className={`w-full bg-bg-input border ${errors.includes('city') ? 'border-state-error shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-ui-border'} rounded-[1.25rem] py-4 px-5 text-text-primary text-[15px] outline-none hover:border-ui-border-hover focus:border-brand-indigo focus:ring-4 focus:ring-brand-indigo/10 transition-all peer`} 
                      />
                      <label className={`absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-all duration-200 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-brand-indigo peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[11px] ${focusedField === 'city' ? 'text-brand-indigo' : ''} ${errors.includes('city') ? '!text-state-error' : ''}`}>
                        {t('onboard.s2.city')}
                      </label>
                    </div>

                    <div className="relative group">
                      <input 
                        type="text" 
                        value={formData.postalCode}
                        onChange={(e) => updateField('postalCode', e.target.value)}
                        onFocus={() => setFocusedField('postalCode')}
                        onBlur={() => setFocusedField(null)}
                        placeholder=" "
                        className={`w-full bg-bg-input border ${errors.includes('postalCode') ? 'border-state-error shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-ui-border'} rounded-[1.25rem] py-4 px-5 text-text-primary text-[15px] outline-none hover:border-ui-border-hover focus:border-brand-indigo focus:ring-4 focus:ring-brand-indigo/10 transition-all peer`} 
                      />
                      <label className={`absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-all duration-200 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-brand-indigo peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[11px] ${focusedField === 'postalCode' ? 'text-brand-indigo' : ''} ${errors.includes('postalCode') ? '!text-state-error' : ''}`}>
                        {t('onboard.s2.postalCode')}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <button onClick={() => goToStep(1)} className="text-text-muted hover:text-text-primary px-6 py-3.5 rounded-xl font-medium flex items-center gap-2 transition-all border border-transparent hover:border-ui-border-focus">{t('global.back')}</button>
                  <button onClick={() => goToStep(3)} className="group bg-brand-indigo hover:bg-brand-indigo-glow text-white px-8 py-3.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-shadow-glow">{t('global.continue')} <ChevronRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" /></button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full max-w-2xl pb-24">
              <h2 className="text-[40px] font-serif text-text-primary mb-2 text-center">{t('onboard.s3.headline')}</h2>
               <p className="text-text-secondary text-center mb-8">{t('onboard.s3.subtitle')}</p>
               
               <div className="bg-state-warning-bg border-l-[3px] border-state-warning rounded-r-xl p-4 mb-8 flex items-center gap-3 mx-auto max-w-lg backdrop-blur-sm">
                 <Lock className="w-4 h-4 text-state-warning" />
                 <span className="font-mono text-[11px] text-state-warning/90 tracking-wide">{t('onboard.s3.securityNote')}</span>
               </div>

              <div className="glass-island border border-ui-border rounded-3xl p-8 space-y-6">
                <div className="relative group">
                  <input 
                    type="text" 
                    value={formData.licenseNum}
                    onChange={(e) => updateField('licenseNum', e.target.value)}
                    onFocus={() => setFocusedField('licenseNum')}
                    onBlur={() => setFocusedField(null)}
                    placeholder=" "
                    className={`w-full bg-bg-input border ${errors.includes('licenseNum') ? 'border-state-error shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-ui-border'} rounded-[1.25rem] py-4 px-5 text-text-primary font-mono text-[15px] tracking-widest outline-none hover:border-ui-border-hover focus:border-brand-indigo focus:ring-4 focus:ring-brand-indigo/10 transition-all peer`} 
                  />
                  <label className={`absolute left-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none transition-all duration-200 peer-focus:top-3 peer-focus:text-[11px] peer-focus:text-brand-indigo peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:text-[11px] ${focusedField === 'licenseNum' ? 'text-brand-indigo' : ''} ${errors.includes('licenseNum') ? '!text-state-error' : ''}`}>
                    {t('onboard.s3.licenseNum')}
                  </label>
                </div>
                
                <div className="space-y-4">
                  {!docUploaded ? (
                    <div onClick={() => fileInputRef.current?.click()}
                      className={`group border-[1.5px] border-dashed ${errors.includes('docUploaded') ? 'border-state-error bg-state-error/5' : 'border-ui-border-focus hover:border-brand-indigo bg-bg-elevated hover:bg-bg-input-hover'} rounded-2xl p-8 flex flex-col items-center text-center cursor-pointer transition-all`}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                      />
                      <motion.div whileHover={{ y: -4 }} className={`w-12 h-12 ${errors.includes('docUploaded') ? 'bg-state-error/15' : 'bg-brand-indigo/15'} rounded-full flex items-center justify-center mb-3`}>
                        {isSubmitLoading ? <Loader2 className={`w-5 h-5 ${errors.includes('docUploaded') ? 'text-state-error' : 'text-brand-indigo-glow'} animate-spin`} /> : <Upload className={`w-5 h-5 ${errors.includes('docUploaded') ? 'text-state-error' : 'text-brand-indigo-glow'}`} />}
                      </motion.div>
                      <p className={`text-[15px] font-medium ${errors.includes('docUploaded') ? 'text-state-error' : 'text-text-primary'} mb-1`}>{isSubmitLoading ? t('onboard.s3.uploading') : t('onboard.s3.doc1')}</p>
                      <p className={`text-xs ${errors.includes('docUploaded') ? 'text-state-error/70' : 'text-text-muted'}`}>{t('onboard.s3.docSub')}</p>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="border border-state-success/40 bg-state-success-bg rounded-2xl p-6 flex flex-col relative transition-all">
                      <div onClick={() => setDocUploaded(false)} className="absolute top-4 right-4 text-text-muted hover:text-text-primary cursor-pointer">×</div>
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 bg-state-success-bg rounded-lg flex items-center justify-center text-state-success">
                           📄
                        </div>
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-text-primary mb-1 truncate">{fileName || 'document.pdf'}</p>
                          <div className="flex items-center gap-2">
                             <CheckCircle2 className="w-3 h-3 text-state-success" />
                             <span className="text-[11px] text-state-success font-medium">{t('onboard.s3.uploaded')}</span>
                             <span className="text-[11px] text-text-muted">· 1.2 MB</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <button onClick={() => goToStep(2)} className="text-text-muted hover:text-text-primary px-6 py-3.5 rounded-xl font-medium flex items-center gap-2 transition-all border border-transparent hover:border-ui-border-focus">{t('global.back')}</button>
                  <button onClick={() => goToStep(4)} className="bg-brand-indigo hover:bg-brand-indigo-glow text-white px-8 py-3.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-shadow-glow">{t('onboard.step4')} <ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 300, damping: 30 }} className="w-full max-w-2xl pb-24">
              <h2 className="text-[40px] font-serif text-text-primary mb-2 text-center">{t('onboard.s4.headline')}</h2>
              <p className="text-text-secondary text-center mb-12">{t('onboard.s4.subtitle')}</p>
              
                <div className="space-y-4">
                  {/* Personal Info Summary */}
                  <div className="glass-island border border-ui-border rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4 border-b border-ui-border pb-4">
                      <h3 className="text-[15px] font-medium text-text-primary">{t('onboard.s4.section1')}</h3>
                      <button onClick={() => goToStep(1)} className="text-[13px] text-text-link hover:text-brand-indigo-glow font-medium transition-colors">{t('onboard.s4.edit')}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-y-3">
                      <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider mb-0.5">{t('patient.firstName')}</p>
                        <p className="text-[14px] text-text-primary font-medium">{formData.firstName}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider mb-0.5">{t('patient.lastName')}</p>
                        <p className="text-[14px] text-text-primary font-medium">{formData.lastName}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] text-text-muted uppercase tracking-wider mb-0.5">{t('patient.email')}</p>
                        <p className="text-[14px] text-text-primary font-medium">{formData.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Professional Info Summary */}
                  <div className="glass-island border border-ui-border rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4 border-b border-ui-border pb-4">
                      <h3 className="text-[15px] font-medium text-text-primary">{t('onboard.s4.section2')}</h3>
                      <button onClick={() => goToStep(2)} className="text-[13px] text-text-link hover:text-brand-indigo-glow font-medium transition-colors">{t('onboard.s4.edit')}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                      <div className="col-span-2">
                        <p className="text-[11px] text-text-muted uppercase tracking-wider mb-0.5">{t('onboard.s2.specialty')}</p>
                        <p className="text-[14px] text-text-primary font-medium">{formData.specialty}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider mb-0.5">{t('onboard.s2.experience')}</p>
                        <p className="text-[14px] text-text-primary font-medium">{formData.experience} {t('onboard.s4.years')}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider mb-0.5">{t('onboard.s2.fees')}</p>
                        <p className="text-[14px] text-text-primary font-medium">{formData.fees}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[11px] text-text-muted uppercase tracking-wider mb-0.5">{t('onboard.s2.clinicName')}</p>
                        <p className="text-[14px] text-text-primary font-medium">{formData.clinicName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Verification Summary */}
                  <div className="glass-island border border-ui-border rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-4 border-b border-ui-border pb-4">
                      <h3 className="text-[15px] font-medium text-text-primary">{t('onboard.s4.section3')}</h3>
                      <button onClick={() => goToStep(3)} className="text-[13px] text-text-link hover:text-brand-indigo-glow font-medium transition-colors">{t('onboard.s4.edit')}</button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[11px] text-text-muted uppercase tracking-wider mb-0.5">{t('onboard.s3.licenseNum')}</p>
                        <p className="text-[14px] text-text-primary font-mono tracking-wider font-medium">{formData.licenseNum}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-state-success/5 border border-state-success/20 rounded-xl p-3">
                         <CheckCircle2 className="w-4 h-4 text-state-success" />
                         <span className="text-[13px] text-text-primary font-medium">{t('onboard.s3.uploaded')}</span>
                      </div>
                    </div>
                  </div>

                <div className="glass-island border border-ui-border rounded-2xl p-6 mt-8 flex items-start gap-4 cursor-pointer" onClick={() => setDeclarationAgreed(!declarationAgreed)}>
                   <div className={`w-5 h-5 rounded border mt-0.5 flex shrink-0 items-center justify-center transition-colors ${declarationAgreed ? 'border-brand-indigo bg-brand-indigo' : 'border-ui-border-focus bg-bg-elevated hover:border-brand-indigo'}`}>
                      {declarationAgreed && <svg width="12" height="10" viewBox="0 0 10 8" fill="none"><path d="M1.5 4.5L3.5 6.5L8.5 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                   </div>
                   <p className="text-[13px] text-brand-lavender leading-relaxed">
                     {t('onboard.s4.declaration')}
                   </p>
                </div>

                <div className="flex justify-between pt-8 gap-4">
                  <button onClick={() => goToStep(3)} className="text-text-muted hover:text-text-primary px-6 py-3.5 rounded-xl font-medium flex items-center gap-2 transition-all border border-transparent hover:border-ui-border-focus">{t('global.back')}</button>
                  <motion.button 
                    onClick={handleFinalSubmit}
                    disabled={isSubmitLoading || !declarationAgreed}
                    whileHover={(!isSubmitLoading && declarationAgreed) ? { y: -2, boxShadow: 'var(--shadow-glow)' } : {}}
                    className={`flex-1 h-[56px] text-white rounded-[14px] font-semibold text-[16px] flex items-center justify-center relative overflow-hidden transition-all ${(!isSubmitLoading && declarationAgreed) ? 'bg-brand-indigo hover:bg-brand-indigo-glow' : 'bg-brand-indigo/50 cursor-not-allowed'}`}
                  >
                     <AnimatePresence mode="popLayout" initial={false}>
                       {isSubmitLoading ? (
                          <motion.div key="load" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
                             {submitText === t('onboard.s4.loading1') || submitText === t('onboard.s4.loading2') ? <Loader2 className="w-5 h-5 animate-spin"/> : null}
                             {submitText === t('onboard.s4.loading3') ? <CheckCircle2 className="w-5 h-5" /> : null}
                             <span>{submitText}</span>
                          </motion.div>
                       ) : (
                          <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                             {t('onboard.s4.submit')}
                          </motion.div>
                       )}
                     </AnimatePresence>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
