import React, { useState } from 'react';
import { TopRightActions } from '../components/TopRightActions';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { Activity, User, HeartPulse, ChevronRight, ArrowLeft, ArrowRight, Check } from 'lucide-react';

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useLanguage();

  return (
    <div className="min-h-screen w-full bg-bg-canvas font-sans text-text-primary overflow-hidden relative flex flex-col items-center justify-center p-6 pb-20">
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
          <Link to="/" className="group flex items-center text-text-muted hover:text-text-primary transition-colors text-sm font-medium pointer-events-auto">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            {t('global.back')}
          </Link>
        </div>
        <div className="w-1/3 flex justify-center"></div>
        <div className="w-1/3 flex justify-end">
          <TopRightActions />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center mt-12 mb-auto">
        <Link to="/">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="w-16 h-16 rounded-xl bg-brand-indigo flex items-center justify-center text-white shadow-shadow-glow">
              <Activity className="w-10 h-10" />
            </div>
            <span className="font-serif font-bold text-5xl tracking-tight text-text-primary">MedEra</span>
          </motion.div>
        </Link>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-mono text-[11px] text-brand-lavender tracking-[0.2em] mb-4 uppercase flex items-center justify-center flex-wrap"
        >
          {t('role.breadcrumb').split('→').map((part: string, i: number, arr: any) => (
            <React.Fragment key={i}>
              <span className="flex items-center">
                {part.trim()}
              </span>
              {i < arr.length - 1 && <ChevronRight className="w-3 h-3 opacity-50 mx-2 text-brand-lavender shrink-0" />}
            </React.Fragment>
          ))}
        </motion.p>
        
        <h1 className="text-4xl md:text-[52px] text-text-primary font-serif mb-4 leading-tight text-center">
          {t('role.headline').split(' ').map((word: string, i: number) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20, clipPath: 'inset(0 0 100% 0)' }}
              animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)' }}
              transition={{ duration: 0.5, delay: 0.2 + (i * 0.08) }}
              className="inline-block mr-3"
            >
              {word}
            </motion.span>
          ))}
        </h1>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-text-secondary text-base mb-16 text-center"
        >
          {t('role.subtitle')}
        </motion.p>

        <div className="flex flex-col md:flex-row gap-6 w-full justify-center px-4">
          {/* Patient Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.7 }}
            className="group w-full md:w-[340px] p-10 md:px-10 md:py-12 bg-bg-surface border border-ui-border rounded-[24px] cursor-pointer transition-all duration-300 flex flex-col relative overflow-hidden card-patient"
            onClick={() => navigate('/signup/patient')}
          >
            <div className="w-[72px] h-[72px] rounded-full bg-state-success-bg border border-state-success/25 flex items-center justify-center mb-8 mx-auto group-hover:shadow-[0_0_24px_var(--success)] transition-shadow duration-300">
              <User className="w-8 h-8 text-state-success" />
            </div>
            
            <p className="font-mono text-[11px] text-brand-lavender tracking-[0.2em] mb-2 text-center uppercase">{t('role.patient.label')}</p>
            <h2 className="font-serif text-[28px] text-text-primary text-center mb-4 leading-tight">{t('role.patient.headline')}</h2>
            <p className="text-text-secondary text-[14px] text-center mb-8 leading-relaxed">
              {t('role.patient.desc')}
            </p>
            
            <ul className="space-y-3 mb-10 left-0 text-left w-fit mx-auto text-[13px] text-text-primary/80">
              <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-state-success-bg flex items-center justify-center shrink-0"><Check size={10} className="text-state-success" /></div> {t('role.patient.perk1')}</li>
              <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-state-success-bg flex items-center justify-center shrink-0"><Check size={10} className="text-state-success" /></div> {t('role.patient.perk2')}</li>
              <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-state-success-bg flex items-center justify-center shrink-0"><Check size={10} className="text-state-success" /></div> {t('role.patient.perk3')}</li>
              <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-state-success-bg flex items-center justify-center shrink-0"><Check size={10} className="text-state-success" /></div> {t('role.patient.perk4')}</li>
            </ul>

            <div className="mt-auto">
              <button className="w-full py-3.5 px-4 rounded-xl font-medium text-[15px] bg-state-success-bg border border-state-success text-state-success group-hover:bg-state-success group-hover:text-white transition-all duration-300 flex items-center justify-center gap-2">
                {t('role.patient.cta')}
              </button>
            </div>
          </motion.div>

          {/* Doctor Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.78 }}
            className="group w-full md:w-[340px] p-10 md:px-10 md:py-12 bg-bg-surface border border-ui-border rounded-[24px] cursor-pointer transition-all duration-300 flex flex-col relative overflow-hidden card-doctor"
            onClick={() => navigate('/onboarding/doctor')}
          >
            <div className="w-[72px] h-[72px] rounded-full bg-brand-indigo/15 border border-brand-indigo/35 flex items-center justify-center mb-8 mx-auto group-hover:shadow-[0_0_24px_var(--indigo)] transition-shadow duration-300">
              <HeartPulse className="w-8 h-8 text-brand-indigo-glow" />
            </div>
            
            <p className="font-mono text-[11px] text-brand-lavender tracking-[0.2em] mb-2 text-center uppercase">{t('role.doctor.label')}</p>
            <h2 className="font-serif text-[28px] text-text-primary text-center mb-4 leading-tight">{t('role.doctor.headline')}</h2>
            <p className="text-text-secondary text-[14px] text-center mb-8 leading-relaxed">
              {t('role.doctor.desc')}
            </p>
            
            <ul className="space-y-3 mb-6 left-0 text-left w-fit mx-auto text-[13px] text-text-primary/80">
              <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-brand-indigo/20 flex items-center justify-center shrink-0"><Check size={10} className="text-brand-lavender" /></div> {t('role.doctor.perk1')}</li>
              <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-brand-indigo/20 flex items-center justify-center shrink-0"><Check size={10} className="text-brand-lavender" /></div> {t('role.doctor.perk2')}</li>
              <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-brand-indigo/20 flex items-center justify-center shrink-0"><Check size={10} className="text-brand-lavender" /></div> {t('role.doctor.perk3')}</li>
              <li className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-brand-indigo/20 flex items-center justify-center shrink-0"><Check size={10} className="text-brand-lavender" /></div> {t('role.doctor.perk4')}</li>
            </ul>

            <div className="mb-6 mx-auto bg-bg-elevated/50 backdrop-blur-[12px] border border-ui-border rounded-full px-3 py-1.5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-state-warning animate-pulse shadow-[0_0_8px_var(--warning)]"></div>
              <span className="font-mono text-[10px] text-state-warning">{t('role.doctor.badge')}</span>
            </div>

            <div className="mt-auto">
              <button className="w-full py-3.5 px-4 rounded-xl font-medium text-[15px] bg-brand-indigo text-white group-hover:bg-brand-indigo-glow transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group/btn">
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                {t('role.doctor.cta')}
              </button>
            </div>
          </motion.div>
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
          className="mt-12 text-sm text-text-muted transition-colors"
        >
          {t('role.hasAccount')} <Link to="/login" className="text-text-link hover:underline ml-1 font-medium">{t('role.signIn')}</Link>
        </motion.p>
      </div>

    </div>
  );
}
