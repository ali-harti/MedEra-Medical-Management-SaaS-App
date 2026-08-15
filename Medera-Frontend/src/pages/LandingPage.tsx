import React, { useEffect, useState, useRef } from 'react';
import {
  PlayCircle,
  CheckCircle2,
  Calendar,
  Stethoscope,
  Pill,
  BarChart3,
  Shield,
  CreditCard,
  Plus,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useInView, useAnimation, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import WhatsAppFAB from '../components/WhatsAppFAB';

const WordReveal = ({ text, className = "" }: { text: string, className?: string }) => {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          whileInView={{ clipPath: "inset(0 0% 0 0)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {word}&nbsp;
        </motion.span>
      ))}
    </span>
  );
};

const CountUp = ({ to, suffix = "", duration = 1200 }: { to: number, suffix?: string, duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let startTimestamp: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(ease * to));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className="flex items-center justify-center">
      {count}
      <AnimatePresence>
        {count === to && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: [1.3, 1] }}
            transition={{ type: "spring", stiffness: 300, damping: 10 }}
          >
            {suffix}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
};

const FeatureCard: React.FC<{ feature: any, index: number }> = ({ feature, index }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      onMouseMove={handleMouseMove}
      className="glass-island p-10 rounded-xl relative overflow-hidden group transition-all duration-500 hover:-translate-y-2 hover:shadow-shadow-card"
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, var(--indigo) 60%, transparent 60%)`, opacity: 0.1 }}
      />
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-indigo to-brand-indigo-glow scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300"></div>
      
      <motion.div 
        className="w-16 h-16 bg-brand-indigo/10 rounded-full flex items-center justify-center mb-8 relative"
      >
        <div className="absolute inset-0 bg-brand-indigo/20 rounded-full scale-0 group-hover:scale-150 group-hover:opacity-0 transition-all duration-700 ease-out"></div>
        <feature.icon className="text-brand-indigo w-8 h-8 relative z-10" />
      </motion.div>
      <h3 className="text-xl font-bold mb-4 relative z-10 text-text-brand-indigo">{feature.title}</h3>
      <p className="text-text-muted leading-relaxed relative z-10">
        {feature.desc}
      </p>
    </motion.div>
  );
};

const FAQItem: React.FC<{ question: string, answer: string, index: number }> = ({ question, answer, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={`glass-island px-8 py-6 cursor-pointer transition-all duration-300 ${isOpen ? 'ring-1 ring-brand-indigo shadow-shadow-glow rounded-3xl' : 'rounded-full'}`}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex justify-between items-center font-bold text-lg text-text-brand-indigo">
        {question}
        <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
          <Plus className={`w-6 h-6 ${isOpen ? 'text-brand-indigo-glow' : 'text-text-muted'}`} />
        </motion.div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="mt-4 text-text-muted leading-relaxed max-w-2xl">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function LandingPage() {
  const { t } = useLanguage();

  const featureIcons = [Calendar, Stethoscope, Pill, BarChart3, Shield, CreditCard];
  const rawFeatures = t('features.list');
  const featuresList = Array.isArray(rawFeatures) ? rawFeatures.map((f: any, i: number) => ({ ...f, icon: featureIcons[i] })) : [];

  return (
    <>
      {/* Hero Section */}
      <section className="pt-24 lg:pt-32 pb-32 px-8 overflow-hidden relative bg-bg-canvas" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, var(--bg-elevated) 0%, var(--bg-deep) 60%)' }}>
        {/* Ambient Orbs */}
        <div className="absolute top-10 left-10 w-[400px] h-[400px] orb-1 opacity-15 rounded-full blur-[100px] animate-[float_10s_ease-in-out_infinite] [contain:strict] z-0"></div>
        <div className="absolute top-1/4 right-0 w-[250px] h-[250px] orb-2 opacity-12 rounded-full blur-[80px] animate-[float_14s_ease-in-out_infinite_reverse] [contain:strict] z-0"></div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[180px] h-[180px] orb-3 opacity-[0.08] rounded-full blur-[60px] animate-[float_18s_ease-in-out_infinite] [contain:strict] z-0"></div>
        
        {/* SVG Grain Overlay */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none z-0" style={{ backgroundImage: `url('data:image/svg+xml;utf8,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')`, backgroundRepeat: 'repeat' }}></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 1, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <h1 className="text-6xl lg:text-7xl font-serif leading-tight text-text-brand-indigo">
              <WordReveal text={t('hero.title1')} /> <br />
              <span className="italic text-brand-indigo font-serif">
                <WordReveal text={t('hero.title2')} />
              </span>
            </h1>
            <motion.p 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-xl text-text-muted max-w-xl leading-relaxed"
            >
              {t('hero.desc')}
            </motion.p>
            <div className="flex flex-wrap gap-4">
              <Link to="/get-started" className="group">
                <button className="bg-brand-indigo text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:shadow-[0_0_40px_var(--border-focus)] cursor-pointer flex items-center justify-center gap-2">
                  {t('hero.startTrial')} <ChevronRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
              <Link to="/features">
                <button className="group border border-ui-border hover:border-black/20 dark:hover:border-white/40 bg-transparent text-text-brand-indigo px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-2 cursor-pointer">
                  <PlayCircle className="w-6 h-6 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite] group-hover:scale-110 transition-transform text-brand-indigo" /> {t('hero.howItWorks')}
                </button>
              </Link>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative perspective-mockup hidden lg:block animate-[cardFloat_6s_ease-in-out_infinite]"
          >
            <div className="perspective-mockup-inner glass-island rounded-2xl overflow-hidden p-4">
              {/* Browser Shell Mockup */}
              <div className="flex gap-1.5 mb-4 px-2">
                <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-600/50"></div>
                <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-600/50"></div>
                <div className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-600/50"></div>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3 space-y-3 opacity-30">
                  <div className="h-4 bg-slate-400 dark:bg-slate-600 rounded-full w-full"></div>
                  <div className="h-4 bg-slate-400 dark:bg-slate-600 rounded-full w-3/4"></div>
                  <div className="h-4 bg-slate-400 dark:bg-slate-600 rounded-full w-5/6"></div>
                  <div className="h-4 bg-slate-400 dark:bg-slate-600 rounded-full w-1/2 mt-8"></div>
                  <div className="h-4 bg-slate-400 dark:bg-slate-600 rounded-full w-2/3"></div>
                </div>
                <div className="col-span-9 space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 rounded-lg bg-brand-indigo/10 dark:bg-brand-indigo/20 border border-brand-indigo/20 p-3">
                      <div className="h-2 w-8 bg-brand-indigo/80 rounded-full mb-4"></div>
                      <div className="h-4 w-12 bg-brand-indigo rounded-full"></div>
                    </div>
                    <div className="h-24 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-3"></div>
                    <div className="h-24 rounded-lg bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-3"></div>
                  </div>
                  <div className="h-48 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-lg p-4 relative overflow-hidden flex items-end justify-between gap-3">
                    {/* Animated Bar Chart CSS */}
                    {[40, 60, 30, 80, 50, 70].map((height, i) => (
                      <motion.div 
                        key={i}
                        className={`w-full rounded-t-sm ${height === 80 ? 'bg-brand-indigo' : 'bg-brand-indigo/35'}`} 
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: 0.8 + i * 0.08, duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Floating Badge 1 */}
            <motion.div 
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1.2, type: "spring", stiffness: 200, damping: 20 }}
              className="absolute -bottom-10 -left-10 glass-island p-6 rounded-xl space-y-2 max-w-[200px]"
            >
              <div className="flex items-center gap-2 text-state-success font-bold">
                <CheckCircle2 className="w-5 h-5 text-state-success" />
                <span className="flex items-center gap-2">{t('hero.success')} <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span></span>
              </div>
              <p className="text-xs text-text-muted">
                {t('hero.patientSync')}
              </p>
            </motion.div>

            {/* Floating Badge 2 */}
            <motion.div 
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1.8, type: "spring", stiffness: 200, damping: 20 }}
              className="absolute top-10 -right-10 glass-island py-2 px-4 rounded-full flex items-center gap-2 border border-success/30"
            >
              <span className="text-xs text-text-brand-indigo font-bold opacity-90">{t('hero.hipaa')}</span>
              <CheckCircle2 className="w-4 h-4 text-state-success" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section id="solutions" className="py-32 bg-bg-elevated relative">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <span className="text-sm font-mono uppercase tracking-widest text-brand-indigo font-bold">
              THE PROBLEM
            </span>
            <h2 className="text-4xl lg:text-5xl font-serif mt-4 italic">
              *Every hour on paperwork is an hour not spent healing.*
            </h2>
          </motion.div>

          <div className="relative">
            {/* Glowing vertical divider line */}
            <motion.div 
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute left-1/2 top-10 bottom-10 w-[1px] hidden md:block origin-top z-10"
              style={{ backgroundImage: 'linear-gradient(to bottom, transparent, var(--indigo), transparent)' }}
            ></motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
              {/* Row 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="space-y-6 md:pr-8 text-right md:-mt-8"
              >
                <div className="font-mono text-sm tracking-[0.3em] text-text-muted mb-6">{t('problem.before')}</div>
                <div className="font-mono text-3xl font-light opacity-50 text-text-brand-indigo">01</div>
                <h3 className="text-2xl font-bold opacity-60 text-text-brand-indigo">{t('problem.title1')}</h3>
                <p className="text-text-muted leading-relaxed max-w-sm ml-auto">
                  {t('problem.desc1')}
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.1 }}
                className="space-y-6 md:pl-8 relative md:-mt-8"
              >
                <div className="absolute -left-3 top-20 w-6 h-6 bg-brand-indigo/20 rounded-full blur flex md:hidden" />
                <div className="font-mono text-sm tracking-[0.3em] text-brand-indigo/70 mb-6">{t('problem.after')}</div>
                <div className="font-mono text-3xl font-bold text-brand-indigo relative inline-block">
                  <div className="absolute inset-0 bg-brand-indigo/20 blur-lg rounded-full"></div>
                  <span className="relative z-10">01</span>
                </div>
                <h3 className="text-2xl font-bold text-text-brand-indigo">{t('problem.sol1')}</h3>
                <p className="text-text-muted leading-relaxed">
                  {t('problem.solDesc1')}
                </p>
              </motion.div>

              {/* Row 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="space-y-6 md:pr-8 text-right"
              >
                <div className="font-mono text-3xl font-light text-[#3A3A5C]">02</div>
                <h3 className="text-2xl font-bold text-[#9090B0]">Administrative Burnout</h3>
                <p className="text-slate-400 leading-relaxed max-w-sm ml-auto">
                  Clinicians spend over 40% of their day on data entry instead of patient care, driving exhaustion and turnover.
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.1 }}
                className="space-y-6 md:pl-8 relative"
              >
                <div className="absolute -left-3 top-4 w-6 h-6 bg-brand-indigo/20 rounded-full blur flex md:hidden" />
                <div className="font-mono text-3xl font-bold text-brand-indigo relative inline-block">
                  <div className="absolute inset-0 bg-brand-indigo/20 blur-lg rounded-full"></div>
                  <span className="relative z-10">02</span>
                </div>
                <h3 className="text-2xl font-bold text-text-brand-indigo">{t('problem.sol2')}</h3>
                <p className="text-text-muted leading-relaxed">
                  {t('problem.solDesc2')}
                </p>
              </motion.div>

              {/* Row 3 */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="space-y-6 md:pr-8 text-right"
              >
                <div className="font-mono text-3xl font-light opacity-50 text-text-brand-indigo">03</div>
                <h3 className="text-2xl font-bold opacity-60 text-text-brand-indigo">{t('problem.title3')}</h3>
                <p className="text-text-muted leading-relaxed max-w-sm ml-auto">
                  {t('problem.desc3')}
                </p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.1 }}
                className="space-y-6 md:pl-8 relative"
              >
                <div className="absolute -left-3 top-4 w-6 h-6 bg-brand-indigo/20 rounded-full blur flex md:hidden" />
                <div className="font-mono text-3xl font-bold text-brand-indigo relative inline-block">
                  <div className="absolute inset-0 bg-brand-indigo/20 blur-lg rounded-full"></div>
                  <span className="relative z-10">03</span>
                </div>
                <h3 className="text-2xl font-bold text-text-brand-indigo">{t('problem.sol3')}</h3>
                <p className="text-text-muted leading-relaxed">
                  {t('problem.solDesc3')}
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section id="features" className="py-32 px-8 overflow-hidden relative">
        <div className="max-w-[100vw] overflow-hidden whitespace-nowrap mb-24 -mx-8 relative flex shadow-black select-none pointer-events-none">
          {/* Marquee effect */}
          <motion.div 
            animate={{ x: ["0%", "-50%"] }} 
            transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
            className="flex items-center text-4xl lg:text-7xl font-serif italic text-text-brand-indigo/50"
          >
            {[...Array(8)].map((_, i) => (
              <React.Fragment key={i}>
                <span className="px-8">{t('features.heading')}</span>
                <span className="text-brand-indigo text-3xl">★</span>
              </React.Fragment>
            ))}
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            {featuresList.map((feature: any, i: number) => (
              <FeatureCard key={i} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>      {/* Social Proof */}
      <section id="security" className="py-32 bg-bg-surface relative border-t border-b border-ui-border">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(circle, var(--indigo-glow) 1px, transparent 1px)', backgroundSize: '28px 28px' }}></div>
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mb-32">
            {[
              { num: 500, suffix: "+", label: t('stats.patients'), progress: 85 },
              { num: 12, suffix: "k+", label: t('stats.appointmentsText') || 'Appointments', progress: 92 },
              { num: 99, suffix: "%", label: t('stats.uptime') || 'Uptime', progress: 99 },
              { num: 150, suffix: "+", label: t('stats.clinics'), progress: 60 }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center group relative p-6"
              >
                {/* SVG dashed border drawing effect */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-brand-indigo/30 group-hover:stroke-brand-indigo/60 transition-colors" fill="none">
                  <motion.rect 
                    x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="16"
                    initial={{ strokeDasharray: "1000", strokeDashoffset: "1000" }}
                    whileInView={{ strokeDashoffset: "0" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: i * 0.2, ease: "easeOut" }}
                    strokeWidth="1"
                  />
                </svg>
                <div className="text-5xl font-mono font-extrabold text-white mb-2 text-shadow-glow">
                  <CountUp to={stat.num} suffix={stat.suffix} />
                </div>
                <div className="text-brand-indigo uppercase tracking-[0.2em] text-xs font-bold mb-4">
                  {stat.label}
                </div>
                {/* Progress bar effect */}
                <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden mt-4">
                  <motion.div 
                    initial={{ width: 0 }}
                    whileInView={{ width: `${stat.progress}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.1, ease: "easeOut" }}
                    className="h-full bg-brand-indigo"
                  ></motion.div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-20">
            {/* Testimonials */}
            {t('testimonials').map((testimonial: any, i: number) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
                className="glass-island pl-8 pr-6 py-8 space-y-6 relative rounded-xl"
              >
                {/* Left glow strip */}
                <div className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full" style={{ background: 'linear-gradient(to bottom, var(--indigo), var(--lavender))', boxShadow: '0 0 10px var(--border-focus)' }}></div>
                <p className="text-lg italic text-[#9090B0] leading-relaxed">
                  &quot;<WordReveal text={testimonial.text} />&quot;
                </p>
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14">
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--indigo)"></stop>
                          <stop offset="100%" stopColor="var(--lavender)"></stop>
                        </linearGradient>
                      </defs>
                      <motion.circle 
                        cx="50" cy="50" r="48" fill="none"
                        stroke="url(#gradient)" strokeWidth="4"
                        strokeDasharray="301.59"
                        initial={{ strokeDashoffset: "301.59" }}
                        whileInView={{ strokeDashoffset: "0" }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.1, ease: "easeOut" }}
                      />
                    </svg>
                    <img
                      alt=""
                      className="w-12 h-12 rounded-full absolute top-[4px] left-[4px] object-cover"
                      src={testimonial.image}
                    />
                  </div>
                  <div>
                    <div className="font-bold text-text-brand-indigo">{testimonial.name}</div>
                    <div className="text-sm font-mono tracking-widest text-brand-indigo/80 uppercase mt-1">
                      {testimonial.title}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>      {/* How it Works */}
      <section className="py-32 px-8 bg-bg-elevated relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-indigo/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >
            <span className="text-sm font-mono uppercase tracking-widest text-brand-indigo font-bold">
              {t('gettingStarted.section')}
            </span>
            <h2 className="text-4xl lg:text-5xl font-serif mt-4 italic text-text-brand-indigo">
              <WordReveal text={t('gettingStarted.heading')} />
            </h2>
          </motion.div>
          <div className="relative">
            {/* Animated drawing line (Desktop) */}
            <div className="hidden lg:block absolute top-10 left-[15%] right-[15%] h-px overflow-hidden">
               <motion.div 
                  initial={{ x: "-100%" }}
                  whileInView={{ x: "100%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 2, ease: "easeInOut", delay: 0.2 }}
                  className="w-full h-full"
                  style={{ background: 'linear-gradient(90deg, transparent, var(--indigo), transparent)' }}
               />
               <div className="absolute inset-0 border-t-2 border-dashed border-brand-indigo/20"></div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 relative">
              {Array.isArray(t('gettingStarted.steps')) && t('gettingStarted.steps').map((step: any, i: number) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2, duration: 0.5 }}
                  className="text-center space-y-6 relative group"
                >
                  <div className="w-20 h-20 bg-bg-surface border border-brand-indigo/30 text-text-brand-indigo rounded-full flex items-center justify-center text-2xl font-bold mx-auto relative z-10 shadow-[0_0_20px_var(--border-hover)] group-hover:shadow-[0_0_40px_var(--border-hover)] transition-all duration-300">
                    <span className="absolute inset-0 rounded-full border border-brand-indigo/50 animate-ping opacity-20"></span>
                    {i + 1}
                  </div>
                  <h3 className="text-2xl font-bold text-text-brand-indigo">{step.title}</h3>
                  <p className="text-text-muted leading-relaxed">
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-8 bg-bg-canvas border-t border-ui-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center lg:items-stretch">
            {/* Starter */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 0.6, y: 0, scale: 0.95 }}
              whileHover={{ opacity: 1, scale: 1, transition: { duration: 0.2 } }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="glass-island p-12 rounded-xl border border-ui-border space-y-8 flex flex-col"
            >
              <div>
                <div className="text-lg font-bold mb-2 text-text-brand-indigo">{t('pricing.starter')}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-mono font-bold text-text-brand-indigo">490</span>
                  <span className="text-text-muted text-sm">MAD/mo</span>
                </div>
              </div>
              <ul className="space-y-4 flex-grow">
                {Array.isArray(t('pricing.features.starter')) && t('pricing.features.starter').map((ft: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-text-muted">
                    <CheckCircle2 className="text-brand-indigo w-5 h-5 flex-shrink-0" />
                    {ft}
                  </li>
                ))}
              </ul>
              <Link to="/get-started" className="mt-auto">
                <button className="w-full py-4 rounded-xl border border-ui-border text-text-brand-indigo font-bold hover:bg-bg-surface-low transition-all cursor-pointer">
                  {t('nav.getStarted')}
                </button>
              </Link>
            </motion.div>
            {/* Clinic (Most Popular) */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="glass-island p-12 rounded-xl relative lg:scale-105 shadow-[0_0_60px_var(--indigo-glow)] flex flex-col z-10 before:absolute before:inset-0 before:p-[2px] before:rounded-xl before:bg-gradient-to-b before:from-primary/50 before:to-primary/10 before:-z-10 before:content-[''] group transition-all duration-300 hover:shadow-[0_0_80px_var(--border-hover)] animate-[cardFloat_8s_ease-in-out_infinite]"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-indigo text-white border border-brand-indigo-glow px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_0_20px_var(--border-focus)]">
                {t('pricing.mostPopular')}
              </div>
              <div>
                <div className="text-lg font-bold mb-2 text-text-brand-indigo">{t('pricing.clinic')}</div>
                <div className="flex items-baseline gap-1 relative">
                  <span className="text-4xl font-mono font-extrabold text-text-brand-indigo text-shadow-glow">
                     <CountUp to={990} />
                  </span>
                  <span className="text-brand-indigo-glow text-sm font-bold">MAD/mo</span>
                </div>
              </div>
              <ul className="space-y-4 flex-grow mt-8">
                {Array.isArray(t('pricing.features.clinic')) && t('pricing.features.clinic').map((ft: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-text-brand-indigo">
                    <CheckCircle2 className="text-state-success w-5 h-5 flex-shrink-0" />
                    {ft}
                  </li>
                ))}
              </ul>
              <Link to="/get-started" className="mt-8 group">
                <button className="w-full py-4 rounded-xl bg-brand-indigo text-white font-bold hover:shadow-[0_0_30px_var(--border-focus)] transition-all cursor-pointer flex items-center justify-center gap-2">
                  {t('hero.startTrial')} <ChevronRight className="w-5 h-5 ml-1 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
            </motion.div>
            {/* Enterprise */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 0.6, y: 0, scale: 0.95 }}
              whileHover={{ opacity: 1, scale: 1, transition: { duration: 0.2 } }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="glass-island p-12 rounded-xl border border-ui-border space-y-8 flex flex-col"
            >
              <div>
                <div className="text-lg font-bold mb-2 text-text-brand-indigo">{t('pricing.enterprise')}</div>
                <div className="text-4xl font-mono font-extrabold text-text-brand-indigo">{t('pricing.custom')}</div>
              </div>
              <ul className="space-y-4 flex-grow">
                {Array.isArray(t('pricing.features.enterprise')) && t('pricing.features.enterprise').map((ft: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-text-muted">
                    <CheckCircle2 className="text-brand-indigo w-5 h-5 flex-shrink-0" />
                    {ft}
                  </li>
                ))}
              </ul>
              <Link to="/contact" className="mt-auto">
                <button className="w-full py-4 rounded-xl border border-ui-border text-text-brand-indigo font-bold hover:bg-bg-surface-low transition-all cursor-pointer">
                  {t('pricing.contactSales')}
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32 px-8 bg-bg-elevated relative">
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-serif text-center mb-16 italic text-text-brand-indigo"
          >
            <WordReveal text={t('faq.heading')} />
          </motion.h2>
          <div className="space-y-4">
            {Array.isArray(t('faq.items')) && t('faq.items').map((faq: any, i: number) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-8 relative overflow-hidden flex items-center justify-center min-h-[60vh]">
        {/* Dynamic mesh gradient */}
        <div className="absolute inset-0 z-0 bg-brand-indigo" 
             style={{ backgroundImage: 'radial-gradient(circle at center, var(--lavender) 0%, var(--indigo) 50%, #06060F 100%)', backgroundSize: '150% 150%', animation: 'gradientMesh 15s ease infinite alternate' }}></div>
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
           <div key={i} className="absolute w-1 h-1 bg-white rounded-full opacity-20 animate-[float_10s_linear_infinite]"
                style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s` }}></div>
        ))}
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-12">
          <h2 className="text-5xl lg:text-7xl font-serif italic text-white text-shadow-glow">
            <WordReveal text={t('cta.heading')} />
          </h2>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/get-started">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-brand-indigo px-10 py-5 rounded-xl font-bold text-xl transition-all shadow-[0_0_40px_var(--border-hover)] cursor-pointer"
              >
                {t('cta.start')}
              </motion.button>
            </Link>
            <Link to="/book-demo">
              <button className="group relative overflow-hidden border border-white/30 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all cursor-pointer">
                <div className="absolute inset-x-0 bottom-0 top-full bg-white/10 transition-all duration-300 group-hover:top-0"></div>
                <span className="relative">{t('cta.demo')}</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      <WhatsAppFAB />
    </>
  );
}
