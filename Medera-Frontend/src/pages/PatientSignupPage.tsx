import React, { useState } from 'react';
import { TopRightActions } from '../components/TopRightActions';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Logo } from '../components/Layout';
import { Activity, Mail, Lock, Eye, EyeOff, ArrowLeft, ChevronRight, CheckCircle2, Loader2, Phone, Check, Calendar } from 'lucide-react';

export default function PatientSignupPage() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', dob: '', gender: '', password: '', confirmPassword: ''
  });
  const [focus, setFocus] = useState({ email: false, password: false, dob: false });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState('');
  const [isExiting, setIsExiting] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  const getPasswordStrength = () => {
    if (!formData.password) return { p: 0, c: 'bg-transparent', l: '' };
    let s = 0;
    if (formData.password.length >= 8) s += 25;
    if (/[A-Z]/.test(formData.password)) s += 25;
    if (/[0-9]/.test(formData.password)) s += 25;
    if (/[^A-Za-z0-9]/.test(formData.password)) s += 25;
    if (s <= 25) return { p: 25, c: 'bg-state-error', l: t('patient.passwordStrength.weak') };
    if (s <= 50) return { p: 50, c: 'bg-state-warning', l: t('patient.passwordStrength.fair') };
    if (s <= 75) return { p: 75, c: 'bg-brand-indigo', l: t('patient.passwordStrength.good') };
    return { p: 100, c: 'bg-state-success', l: t('patient.passwordStrength.strong') };
  };

  const handleEmailBlur = () => {
    setFocus(f => ({ ...f, email: false }));
    if (!formData.email) setEmailValid(null);
    else setEmailValid(formData.email.includes('@') && formData.email.includes('.'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms || !formData.email || formData.password !== formData.confirmPassword) {
      setError(t('global.error.required'));
      return;
    }
    setError(''); setStatus('loading');
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => navigate('/'), 300);
      }, 1000);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div 
          className="min-h-screen w-full bg-bg-canvas font-sans text-text-primary overflow-hidden relative flex flex-col items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          {/* Ambient Orbs */}
          <motion.div 
            className="absolute top-[10%] left-[20%] w-96 h-96 rounded-full orb-1 blur-[100px] pointer-events-none mix-blend-screen"
            animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full orb-2 blur-[100px] pointer-events-none mix-blend-screen"
            animate={{ x: [-30, 30, -30], y: [-20, 20, -20] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] rounded-full orb-3 blur-[120px] pointer-events-none mix-blend-screen"
            animate={{ x: [0, -60, 0], y: [0, -40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Texture/Grid */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" style={{ backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')`, backgroundRepeat: 'repeat' }}></div>
          <div className="absolute inset-0 opacity-[0.10] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle, var(--indigo) 1px, transparent 1px)', backgroundSize: '28px 28px' }}></div>

          <div className="absolute top-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-20 pointer-events-none">
            <div className="w-1/3 flex justify-start">
              <Link to="/get-started" className="group flex items-center text-text-muted hover:text-text-primary transition-colors text-sm font-medium pointer-events-auto">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> {t('global.back')}
              </Link>
            </div>
            
            <div className="w-1/3 flex justify-center pointer-events-auto">
            </div>
            
            <div className="w-1/3 flex justify-end">
              <TopRightActions />
            </div>
          </div>

          <div className="relative z-10 w-full max-w-[480px] flex flex-col items-center justify-center p-3 sm:p-6 py-20 lg:py-24 pt-32">

            {/* Centralized Logo */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
              className="flex justify-center mb-10 w-fit z-10 pointer-events-auto"
            >
               <Logo className="scale-125 origin-center" />
            </motion.div>

            {/* Form Container */}
            <motion.div 
              initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.2 }}
              className="w-full glass-island rounded-[24px] p-6 sm:p-8 md:p-10"
            >
              <div className="mb-8 text-center">
                <p className="font-mono text-[11px] tracking-[0.2em] text-brand-lavender uppercase mb-2">{t('patient.label')}</p>
                <h2 className="font-serif text-[32px] text-text-primary leading-tight">{t('patient.headline')}</h2>
                <p className="text-sm text-text-muted mt-2">{t('patient.hasAccount')} <Link to="/login" className="inline-flex items-center text-brand-indigo hover:text-brand-indigo-glow transition-all duration-300 group">{t('role.signIn')} <ChevronRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-1" /></Link></p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder=" " 
                      value={formData.firstName} 
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                      className="w-full bg-bg-input border border-ui-border rounded-[1.5rem] py-5 px-6 text-text-primary text-lg transition-all focus:outline-none focus:border-brand-indigo/50 focus:bg-bg-input-hover focus:ring-4 focus:ring-brand-indigo/10 peer placeholder-shown:bg-transparent" 
                    />
                    <label className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted transition-all pointer-events-none peer-focus:-translate-y-[1.8rem] peer-focus:text-brand-indigo peer-focus:text-xs peer-[:not(:placeholder-shown)]:-translate-y-[1.8rem] peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-text-muted font-medium">
                      {t('patient.firstName')}
                    </label>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder=" " 
                      value={formData.lastName} 
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                      className="w-full bg-bg-input border border-ui-border rounded-[1.5rem] py-5 px-6 text-text-primary text-lg transition-all focus:outline-none focus:border-brand-indigo/50 focus:bg-bg-input-hover focus:ring-4 focus:ring-brand-indigo/10 peer placeholder-shown:bg-transparent" 
                    />
                    <label className="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted transition-all pointer-events-none peer-focus:-translate-y-[1.8rem] peer-focus:text-brand-indigo peer-focus:text-xs peer-[:not(:placeholder-shown)]:-translate-y-[1.8rem] peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-text-muted font-medium">
                      {t('patient.lastName')}
                    </label>
                  </div>
                </div>

                <div className="relative">
                  <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${focus.email ? 'text-brand-indigo' : 'text-text-muted'}`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <input 
                    type="email" 
                    placeholder=" "
                    value={formData.email} 
                    onChange={(e) => { setFormData({...formData, email: e.target.value}); setEmailValid(null); }} 
                    onFocus={() => setFocus({...focus, email: true})} 
                    onBlur={handleEmailBlur} 
                    className={`w-full bg-bg-input border rounded-[1.5rem] py-5 pl-14 pr-12 text-text-primary text-lg transition-all focus:outline-none focus:ring-4 focus:ring-brand-indigo/10 peer placeholder-shown:bg-transparent ${emailValid === false ? 'border-state-error focus:border-state-error' : 'border-ui-border focus:border-brand-indigo/50 focus:bg-bg-input-hover'}`} 
                    autoComplete="new-email"
                  />
                  <label className="absolute left-14 top-1/2 -translate-y-1/2 text-text-muted transition-all pointer-events-none peer-focus:-translate-y-[1.8rem] peer-focus:text-brand-indigo peer-focus:text-xs peer-[:not(:placeholder-shown)]:-translate-y-[1.8rem] peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-text-muted font-medium">
                    {t('patient.email')}
                  </label>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center">
                    {emailValid === true && <CheckCircle2 className="w-5 h-5 text-state-success" />}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted z-10 pointer-events-none">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="flex w-full bg-bg-input border border-ui-border rounded-[1.5rem] transition-all focus-within:border-brand-indigo/50 focus-within:bg-bg-input-hover focus-within:ring-4 focus-within:ring-brand-indigo/10 relative">
                    <select className="bg-transparent pl-14 pr-2 py-5 text-text-primary text-lg outline-none appearance-none cursor-pointer border-r border-ui-border/50 relative z-10">
                      <option className="bg-bg-elevated">🇲🇦 +212</option>
                    </select>
                    <input 
                      type="tel" 
                      placeholder=" "
                      value={formData.phone} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                      className="w-full bg-transparent py-5 px-4 text-text-primary text-lg outline-none peer placeholder-shown:bg-transparent" 
                    />
                    <label className="absolute left-32 top-1/2 -translate-y-1/2 text-text-muted transition-all pointer-events-none peer-focus:-translate-y-[1.8rem] peer-focus:text-brand-indigo peer-focus:text-xs peer-[:not(:placeholder-shown)]:-translate-y-[1.8rem] peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-text-muted font-medium">
                      {t('patient.phone')}
                    </label>
                  </div>
                </div>

                <div className="relative">
                  <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${focus.dob ? 'text-brand-indigo' : 'text-text-muted'}`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <input 
                    type={focus.dob || formData.dob ? "date" : "text"} 
                    placeholder=" "
                    value={formData.dob} 
                    onChange={(e) => setFormData({...formData, dob: e.target.value})} 
                    onFocus={() => setFocus({...focus, dob: true})} 
                    onBlur={() => setFocus({...focus, dob: false})} 
                    className="w-full bg-bg-input border border-ui-border rounded-[1.5rem] py-5 pl-14 pr-6 text-text-primary text-lg transition-all focus:outline-none focus:border-brand-indigo/50 focus:bg-bg-input-hover focus:ring-4 focus:ring-brand-indigo/10 peer placeholder-shown:bg-transparent"
                  />
                  <label className="absolute left-14 top-1/2 -translate-y-1/2 text-text-muted transition-all pointer-events-none peer-focus:-translate-y-[1.8rem] peer-focus:text-brand-indigo peer-focus:text-xs peer-[:not(:placeholder-shown)]:-translate-y-[1.8rem] peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-text-muted font-medium">
                    {t('patient.dob')}
                  </label>
                </div>

                <div className="flex gap-2 w-full mt-2">
                  {Object.entries({
                    male: t('patient.genderOptions.male'),
                    female: t('patient.genderOptions.female'),
                    other: t('patient.genderOptions.other')
                  }).map(([k, label]) => (
                    <button key={k} type="button" onClick={() => setFormData({...formData, gender: k})} className={`flex-1 py-4 rounded-[1.5rem] text-sm border transition-all ${formData.gender === k ? 'bg-brand-indigo border-brand-indigo text-white shadow-lg shadow-brand-indigo/20' : 'bg-bg-input border-ui-border text-text-muted hover:text-text-primary hover:border-ui-border-hover'}`}>{label}</button>
                  ))}
                </div>

                <div className="relative">
                  <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${focus.password ? 'text-brand-indigo' : 'text-text-muted'}`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder=" "
                    value={formData.password} 
                    onChange={(e) => setFormData({...formData, password: e.target.value})} 
                    onFocus={() => setFocus({...focus, password: true})} 
                    onBlur={() => setFocus({...focus, password: false})} 
                    className="w-full bg-bg-input border border-ui-border rounded-[1.5rem] py-5 pl-14 pr-14 text-text-primary text-lg transition-all focus:outline-none focus:border-brand-indigo/50 focus:bg-bg-input-hover focus:ring-4 focus:ring-brand-indigo/10 peer placeholder-shown:bg-transparent" 
                    autoComplete="new-password"
                  />
                  <label className="absolute left-14 top-1/2 -translate-y-1/2 text-text-muted transition-all pointer-events-none peer-focus:-translate-y-[1.8rem] peer-focus:text-brand-indigo peer-focus:text-xs peer-[:not(:placeholder-shown)]:-translate-y-[1.8rem] peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-text-muted font-medium">
                    {t('patient.password')}
                  </label>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-lavender transition-colors">
                     {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {formData.password && (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-1 flex-1 max-w-[200px]">
                        {[25, 50, 75, 100].map((step) => (
                          <div key={step} className="h-1 rounded-full flex-1 bg-ui-border overflow-hidden"><div className={`h-full transition-all duration-300 ${getPasswordStrength().c}`} style={{ width: getPasswordStrength().p >= step ? '100%' : '0%' }}/></div>
                        ))}
                      </div>
                      <span className="text-[11px] font-mono text-text-muted">{getPasswordStrength().l}</span>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${formData.confirmPassword ? 'text-brand-indigo' : 'text-text-muted'}`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    type="password" 
                    placeholder=" " 
                    value={formData.confirmPassword} 
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
                    className="w-full bg-bg-input border border-ui-border rounded-[1.5rem] py-5 pl-14 pr-14 text-text-primary text-lg transition-all focus:outline-none focus:border-brand-indigo/50 focus:bg-bg-input-hover focus:ring-4 focus:ring-brand-indigo/10 peer placeholder-shown:bg-transparent" 
                    autoComplete="new-password" 
                  />
                  <label className="absolute left-14 top-1/2 -translate-y-1/2 text-text-muted transition-all pointer-events-none peer-focus:-translate-y-[1.8rem] peer-focus:text-brand-indigo peer-focus:text-xs peer-[:not(:placeholder-shown)]:-translate-y-[1.8rem] peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-text-muted font-medium">
                    {t('patient.confirmPassword')}
                  </label>
                  {formData.confirmPassword && formData.confirmPassword === formData.password && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2">
                      <Check className="w-5 h-5 text-state-success" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-6 mb-8 cursor-pointer group" onClick={() => setAgreeTerms(!agreeTerms)}>
                  <div className="w-4 h-4 rounded-[4px] border border-ui-border bg-bg-elevated flex items-center justify-center transition-colors group-hover:border-ui-border-focus">
                    {agreeTerms && <div className="w-full h-full bg-brand-indigo rounded-[3px] flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                  </div>
                  <span className="text-[13px] text-text-muted group-hover:text-text-primary transition-colors">{t('patient.terms')}</span>
                </div>

                <div className="relative">
                  <motion.button type="submit" disabled={status !== 'idle'} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="w-full bg-brand-indigo hover:bg-brand-indigo-hover text-white rounded-[1.5rem] py-5 font-bold text-lg flex justify-center items-center h-[60px] transition-all relative overflow-hidden shadow-lg shadow-brand-indigo/20">
                     {status === 'loading' ? <><Loader2 className="w-6 h-6 animate-spin mr-2" /> {t('patient.loading1')}</> : status === 'success' ? <><CheckCircle2 className="w-6 h-6 mr-2" /> {t('patient.loading2')}</> : t('patient.cta')}
                  </motion.button>
                  {/* Error Toast */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, x: 0 }}
                        animate={{ 
                          opacity: 1, 
                          y: 8, 
                          x: [0, -6, 6, -4, 4, -2, 2, 0],
                          transition: { y: { duration: 0.2 }, x: { duration: 0.4, ease: "easeInOut" } }
                        }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 bg-bg-elevated border border-state-error/20 border-l-[3px] border-l-state-error rounded-lg p-3 mt-2 shadow-lg backdrop-blur-md"
                      >
                        <div className="flex items-center gap-2 text-sm text-state-error">
                          <span className="shrink-0 w-1 h-1 rounded-full bg-state-error"></span>
                          {error}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
