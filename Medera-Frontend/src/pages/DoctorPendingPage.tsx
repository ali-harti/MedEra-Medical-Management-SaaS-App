import React from 'react';
import { TopRightActions } from '../components/TopRightActions';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, Mail, ShieldCheck, MessageSquare, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function DoctorPendingPage() {
  const { t, lang, setLang } = useLanguage();

  return (
    <div className="min-h-screen w-full bg-bg-canvas font-sans text-text-primary overflow-hidden relative flex flex-col items-center justify-center p-6">
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
      
      {/* Texture/Grid */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0" style={{ backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')`, backgroundRepeat: 'repeat' }}></div>
      <div className="absolute inset-0 opacity-[0.10] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle, var(--indigo) 1px, transparent 1px)', backgroundSize: '28px 28px' }}></div>

      <div className="absolute top-0 left-0 w-full p-6 md:p-8 flex justify-between items-center z-20 pointer-events-none">
        <div className="w-1/3 flex justify-start">
          <Link to="/" className="group flex items-center text-text-muted hover:text-text-primary transition-colors text-sm font-medium pointer-events-auto">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> {t('global.back')}
          </Link>
        </div>
        <div className="w-1/3 flex justify-center"></div>
        <div className="w-1/3 flex justify-end">
          <TopRightActions />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
        
        {/* Animated Radar/Pulse */}
        <div className="relative w-[200px] h-[200px] flex items-center justify-center mb-10">
          <motion.div 
             className="absolute inset-0 border border-brand-indigo-glow rounded-full opacity-50"
             animate={{ scale: [1, 2, 3], opacity: [0.5, 0] }}
             transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div 
             className="absolute inset-0 border border-brand-indigo-glow rounded-full opacity-50"
             animate={{ scale: [1, 2, 3], opacity: [0.5, 0] }}
             transition={{ duration: 2, repeat: Infinity, delay: 0.6, ease: "easeOut" }}
          />
          <motion.div 
             className="absolute inset-0 border border-brand-indigo-glow rounded-full opacity-50"
             animate={{ scale: [1, 2, 3], opacity: [0.5, 0] }}
             transition={{ duration: 2, repeat: Infinity, delay: 1.2, ease: "easeOut" }}
          />
          <div className="w-20 h-20 bg-brand-indigo rounded-full z-10 flex items-center justify-center shadow-shadow-glow">
             <Activity className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Status Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="flex items-center gap-2 mb-6"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-state-warning animate-pulse shadow-shadow-warn"></div>
          <span className="font-mono tracking-widest text-state-warning text-sm uppercase font-bold">{t('pending.status')}</span>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-[48px] text-text-primary font-serif mb-4 leading-tight text-center max-w-xl mx-auto"
        >
          {t('pending.headline')}
        </motion.h1>

        {/* Subtext */}
        <motion.p 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="text-text-secondary text-[16px] text-center max-w-[480px] mb-12 leading-relaxed"
        >
          {t('pending.sub').replace('{email}', 'doctor@example.com')}
        </motion.p>

        {/* Timeline */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="flex items-center justify-center gap-4 mb-16 w-full font-mono text-[11px]"
        >
          <div className="flex items-center gap-2 text-state-success">
            <span className="w-5 h-5 rounded-full bg-state-success-bg flex items-center justify-center border border-state-success/40">
               <Check className="w-3 h-3 text-state-success stroke-[3]" />
            </span>
            {t('pending.step1')}
          </div>
          <div className="w-12 h-px bg-text-muted/30"></div>
          <div className="flex items-center gap-2 text-state-warning">
            <span className="w-5 h-5 rounded-full bg-state-warning-bg flex items-center justify-center animate-pulse border border-state-warning/40">
              <span className="w-2 h-2 rounded-full bg-state-warning"></span>
            </span>
            {t('pending.step2')}
          </div>
          <div className="w-12 h-px bg-text-muted/30"></div>
          <div className="flex items-center gap-2 text-text-muted">
            <span className="w-5 h-5 text-center rounded-full border border-text-muted/40 flex items-center justify-center"></span>
            {t('pending.step3')}
          </div>
        </motion.div>

        {/* Information Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 w-full"
        >
           {[
             { i: <Mail className="w-6 h-6 text-brand-lavender drop-shadow-[0_0_8px_rgba(168,143,250,0.5)]" />, t: t('pending.card1.title'), d: t('pending.card1.desc') },
             { i: <ShieldCheck className="w-6 h-6 text-state-success drop-shadow-[0_0_8px_rgba(46,204,113,0.5)]" />, t: t('pending.card2.title'), d: t('pending.card2.desc') },
             { i: <MessageSquare className="w-6 h-6 text-brand-lavender drop-shadow-[0_0_8px_rgba(168,143,250,0.5)]" />, t: t('pending.card3.title'), d: t('pending.card3.desc') }
           ].map((card, i) => (
              <div key={i} className="glass-island border border-ui-border rounded-2xl p-6 text-center transform transition-all hover:scale-105 hover:bg-bg-input-hover cursor-default">
                 <div className="flex justify-center mb-4">{card.i}</div>
                 <h4 className="text-[14px] font-medium text-text-primary mb-2">{card.t}</h4>
                 <p className="text-[12px] text-text-muted leading-relaxed">{card.d}</p>
              </div>
           ))}
        </motion.div>

        {/* Actions */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col items-center gap-6"
        >
          <Link to="/">
             <button className="border border-ui-border text-text-primary hover:bg-bg-input px-8 py-3.5 rounded-xl font-medium text-[15px] transition-all">
                {t('pending.back')}
             </button>
          </Link>
          <a href="mailto:support@medera.com" className="text-sm text-text-muted hover:text-brand-lavender transition-colors underline">{t('pending.support')}</a>
        </motion.div>

        <motion.div 
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.6 }}
           className="mt-16 text-[10px] text-text-muted font-mono tracking-wide"
        >
           {t('pending.appId')}: MED-2026-XXXXX · {t('pending.submitted')} May 3, 2026
        </motion.div>
      </div>
    </div>
  );
}
