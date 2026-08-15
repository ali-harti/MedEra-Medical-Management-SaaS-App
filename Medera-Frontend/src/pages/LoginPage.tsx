import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Eye, EyeOff, Mail, Lock, ArrowLeft, 
  CheckCircle2
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import Logo from '../components/Logo';
import { TopRightActions } from '../components/TopRightActions';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { theme } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Refs for GSAP
  const containerRef = useRef<HTMLDivElement>(null);

  // Decoy & Delay: Prevent aggressive autofill
  const [isDecoyActive, setIsDecoyActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsDecoyActive(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Entrance Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Left Panel Elements
      gsap.from(".logo-link", { y: -20, opacity: 0, duration: 1, ease: "power3.out" });
      gsap.from(".hero-text > *", { 
        y: 40, 
        opacity: 0, 
        duration: 1.2, 
        stagger: 0.15, 
        ease: "power4.out" 
      });
      gsap.from(".trust-badge", { 
        x: -20, 
        opacity: 0, 
        duration: 0.8, 
        stagger: 0.1, 
        delay: 0.8,
        ease: "power2.out" 
      });
      gsap.from(".testimonial-card", { 
        y: 30, 
        opacity: 0, 
        duration: 1, 
        delay: 1.2, 
        ease: "power3.out" 
      });

      // Right Panel Elements
      gsap.from(".form-header > *", { 
        y: 20, 
        opacity: 0, 
        duration: 1, 
        stagger: 0.1, 
        ease: "power3.out" 
      });
      gsap.from(".login-form > *", { 
        y: 30, 
        opacity: 0, 
        duration: 1, 
        stagger: 0.1, 
        delay: 0.3,
        ease: "power3.out" 
      });
      gsap.from(".top-actions > *", { 
        opacity: 0, 
        x: 20, 
        duration: 1, 
        stagger: 0.1,
        delay: 0.5,
        ease: "power2.out"
      });
      gsap.from(".back-btn", { opacity: 0, x: -20, duration: 1, delay: 0.5 });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const getRoleRedirect = (user: any): string => {
    switch (user.role) {
      case 'ADMIN': return '/admin';
      case 'MEDECIN': return '/doctor';
      case 'SECRETAIRE': return '/secretary';
      case 'PATIENT': return '/patient';
      default: return '/';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setError(null);
    setIsLoading(true);

    try {
      const user = await login(email, password);
      const destination = getRoleRedirect(user);
      navigate(destination, { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.data?.error === 'account_locked') {
        setError(err.response.data.detail);
      } else {
        setError(t('login.error') || 'Invalid email or password');
      }
      
      // Shake animation on error
      gsap.to(".error-box", {
        x: 10,
        repeat: 3,
        yoyo: true,
        duration: 0.1,
        ease: "power2.inOut",
        onComplete: () => {
          gsap.to(".error-box", { x: 0, duration: 0.1 });
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen w-full flex bg-bg-canvas overflow-hidden selection:bg-brand-indigo/30 transition-colors duration-500">
      {/* LEFT PANEL: 40% BRAND SIDE */}
      <div className="hidden lg:flex lg:w-[40%] relative overflow-hidden flex-col p-12 justify-between border-r border-ui-border/50 bg-slate-950">
        {/* Ambient Backdrops (Always dark for high-fidelity brand feel) */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-5%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-violet-600/15 rounded-full blur-[110px] animate-pulse delay-700" />
        
        {/* Logo Section */}
        <Logo variant="light" className="logo-link relative z-10" />

        {/* Headline Section */}
        <div className="hero-text relative z-10 space-y-6">
          <h1 className="text-5xl xl:text-6xl text-white leading-[1.1] tracking-tight font-display">
            {t('login.nextGenPart1')} <br />
            <span className="italic text-indigo-400">{t('login.nextGenPart2')}</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-md leading-relaxed">
            {t('login.unifying')}
          </p>
          
          <div className="flex flex-col gap-4 pt-4">
            <div className="trust-badge flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" />
              <span>{t('login.hipaa')}</span>
            </div>
            <div className="trust-badge flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" />
              <span>{t('login.aiSupport')}</span>
            </div>
            <div className="trust-badge flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" />
              <span>{t('login.encrypted')}</span>
            </div>
          </div>
        </div>

        {/* Testimonial Section */}
        <div className="testimonial-card relative z-10 p-6 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-md max-w-md">
          <p className="text-slate-300 italic mb-4 leading-relaxed">
            "{t('login.testimonial')}"
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden shadow-inner">
               <img src="/dr_sarah.png" alt="Dr Sarah Khalil" className="w-full h-full object-cover scale-110" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t('login.drSarah')}</p>
              <p className="text-xs text-slate-500">{t('login.cmo')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: 60% FORM SIDE */}
      <div className="flex-1 relative flex flex-col min-h-screen overflow-y-auto">
        {/* Navigation & Lang Toggle */}
        <div className="sticky top-0 z-20 flex justify-between items-center px-6 md:px-12 py-6">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/')}
              className="back-btn flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">{t('login.back')}</span>
            </button>
            {/* Mobile Logo */}
            <div className="lg:hidden">
              <Logo size="sm" variant={theme === 'dark' ? 'light' : 'dark'} />
            </div>
          </div>

          <div className="top-actions">
            <TopRightActions />
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-start justify-center p-6 md:p-12 md:pt-20">
          <div className="w-full max-w-[480px] space-y-10">
            {/* Header */}
            <div className="form-header space-y-3">
              <p className="text-brand-indigo font-mono text-xs tracking-[0.2em] font-bold uppercase">
                {t('login.label')}
              </p>
              <h2 className="text-4xl font-bold text-text-primary tracking-tight transition-colors duration-300">
                {t('login.headline')}
              </h2>
              <p className="text-text-muted">
                {t('login.noAccount')} {' '}
                <Link to="/get-started" className="text-brand-indigo font-semibold hover:opacity-80 transition-opacity">
                  {t('login.startTrial')}
                </Link>
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-box p-4 rounded-2xl bg-state-error-bg border border-state-error/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-state-error/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-state-error" />
                </div>
                <p className="text-sm text-state-error font-medium">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="login-form space-y-6 relative">
              {/* HONEYPOT DECOYS */}
              <div className="absolute opacity-0 -z-10 pointer-events-none h-0 overflow-hidden">
                <input type="text" name="fakeusername" tabIndex={-1} autoComplete="off" />
                <input type="password" name="fakepassword" tabIndex={-1} autoComplete="off" />
              </div>

              {/* Email Field */}
              <div className="group space-y-2">
                <div className="relative">
                  <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${focusedField === 'email' ? 'text-brand-indigo' : 'text-text-muted'}`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder=" "
                    autoComplete="new-email"
                    value={isDecoyActive ? '' : email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full bg-bg-input border border-ui-border rounded-[1.5rem] py-5 pl-14 pr-6 text-text-primary text-lg transition-all focus:outline-none focus:border-brand-indigo/50 focus:bg-bg-input-hover focus:ring-4 focus:ring-brand-indigo/10 peer placeholder-shown:bg-transparent"
                  />
                  <label htmlFor="email" className="absolute left-14 top-1/2 -translate-y-1/2 text-text-muted transition-all pointer-events-none peer-focus:-translate-y-[1.8rem] peer-focus:text-brand-indigo peer-focus:text-xs peer-[:not(:placeholder-shown)]:-translate-y-[1.8rem] peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-text-muted font-medium">
                    {t('login.email')}
                  </label>
                </div>
              </div>

              {/* Password Field */}
              <div className="group space-y-2">
                <div className="relative">
                  <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${focusedField === 'password' ? 'text-brand-indigo' : 'text-text-muted'}`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder=" "
                    autoComplete="new-password"
                    value={isDecoyActive ? '' : password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full bg-bg-input border border-ui-border rounded-[1.5rem] py-5 pl-14 pr-14 text-text-primary text-lg transition-all focus:outline-none focus:border-brand-indigo/50 focus:bg-bg-input-hover focus:ring-4 focus:ring-brand-indigo/10 peer placeholder-shown:bg-transparent"
                  />
                  <label htmlFor="password" className="absolute left-14 top-1/2 -translate-y-1/2 text-text-muted transition-all pointer-events-none peer-focus:-translate-y-[1.8rem] peer-focus:text-brand-indigo peer-focus:text-xs peer-[:not(:placeholder-shown)]:-translate-y-[1.8rem] peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-text-muted font-medium">
                    {t('login.password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Utilities */}
              <div className="flex items-center justify-between px-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative w-5 h-5">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-5 h-5 rounded-md border border-ui-border bg-bg-input transition-all peer-checked:bg-brand-indigo peer-checked:border-brand-indigo" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                      <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                    </div>
                  </div>
                  <span className="text-sm text-text-muted group-hover:text-text-secondary transition-colors">{t('login.remember')}</span>
                </label>
                <button type="button" className="text-sm font-semibold text-brand-indigo hover:opacity-80 transition-opacity">
                  {t('login.forgot')}
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden rounded-[1.5rem] py-5 font-bold text-white transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed magnetic-btn"
              >
                {/* Background Layer */}
                <div className="absolute inset-0 bg-brand-indigo transition-colors" />
                
                {/* Hover Glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-brand-indigo via-indigo-400 to-brand-indigo bg-[length:200%_100%] animate-gradient-slow" />
                
                <span className="relative flex items-center justify-center gap-3">
                  {isLoading ? (
                    <span className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>{t('login.loading')}</span>
                    </span>
                  ) : (
                    <span>{t('login.cta')}</span>
                  )}
                </span>
              </button>
            </form>

            {/* Support / Legal */}
            <div className="pt-8 border-t border-ui-border flex flex-col sm:flex-row justify-between gap-4 text-xs text-text-muted uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
                <span>{t('login.systemOperational')}</span>
              </div>
              <div className="flex items-center gap-4">
                <button className="hover:text-text-primary transition-colors">{t('login.security')}</button>
                <button className="hover:text-text-primary transition-colors">{t('login.privacy')}</button>
                <button className="hover:text-text-primary transition-colors">{t('login.contact')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GLOBAL OVERLAY NOISE (SVG fallback) */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[9999] mix-blend-overlay">
        <svg className="w-full h-full">
          <filter id="noiseFilterMain">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noiseFilterMain)" />
        </svg>
      </div>
    </div>
  );
};

export default LoginPage;
