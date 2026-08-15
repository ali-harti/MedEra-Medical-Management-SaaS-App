import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import gsap from 'gsap';

import Logo from '../../components/Logo';
import { TopRightActions } from '../../components/TopRightActions';
import { useTheme } from '../../contexts/ThemeContext';

export default function ResetPasswordPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

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

      // Right Panel Elements
      gsap.from(".form-header > *", { 
        y: 20, 
        opacity: 0, 
        duration: 1, 
        stagger: 0.1, 
        ease: "power3.out" 
      });
      gsap.from(".reset-form > *", { 
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
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (password !== confirmPassword) {
      showError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      showError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password/confirm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, token, new_password: password }),
      });

      const data = await response.json().catch(() => ({ error: "Erreur serveur inattendue (502)." }));

      if (!response.ok) {
        throw new Error(data.error || data.detail || "Une erreur s'est produite lors de la création du mot de passe.");
      }

      setSuccess(true);
      
      // Success animation
      gsap.to(".reset-form", { opacity: 0, y: -20, duration: 0.5 });
      gsap.fromTo(".success-state", 
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out", delay: 0.5 }
      );

      setTimeout(() => navigate('/login'), 4000);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showError = (msg: string) => {
    setError(msg);
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
  };

  return (
    <div ref={containerRef} className="min-h-screen w-full flex bg-bg-canvas overflow-hidden selection:bg-brand-indigo/30 transition-colors duration-500">
      {/* LEFT PANEL: 40% BRAND SIDE */}
      <div className="hidden lg:flex lg:w-[40%] relative overflow-hidden flex-col p-12 justify-between border-r border-ui-border/50 bg-slate-950">
        {/* Ambient Backdrops */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-5%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-violet-600/15 rounded-full blur-[110px] animate-pulse delay-700" />
        
        {/* Logo Section */}
        <Logo variant="light" className="logo-link relative z-10" />

        {/* Headline Section */}
        <div className="hero-text relative z-10 space-y-6">
          <h1 className="text-5xl xl:text-6xl text-white leading-[1.1] tracking-tight font-display">
            Sécurisez votre <br />
            <span className="italic text-indigo-400">compte MedEra.</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-md leading-relaxed">
            Votre santé mérite la plus haute sécurité. Choisissez un mot de passe fort pour protéger vos données médicales.
          </p>
          
          <div className="flex flex-col gap-4 pt-4">
            <div className="trust-badge flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" />
              <span>Chiffrement de bout en bout</span>
            </div>
            <div className="trust-badge flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" />
              <span>Conforme HIPAA & RGPD</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10">
            {/* Empty space for balance */}
        </div>
      </div>

      {/* RIGHT PANEL: 60% FORM SIDE */}
      <div className="flex-1 relative flex flex-col min-h-screen overflow-y-auto">
        {/* Navigation & Actions */}
        <div className="sticky top-0 z-20 flex justify-between items-center px-6 md:px-12 py-6">
          <div className="flex items-center gap-6">
            <Link 
              to="/login"
              className="back-btn flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">Retour à la connexion</span>
            </Link>
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
          <div className="w-full max-w-[480px] space-y-10 relative">
            
            {/* Header */}
            <div className="form-header space-y-3">
              <p className="text-brand-indigo font-mono text-xs tracking-[0.2em] font-bold uppercase">
                Configuration
              </p>
              <h2 className="text-4xl font-bold text-text-primary tracking-tight transition-colors duration-300">
                Créez votre mot de passe
              </h2>
              <p className="text-text-muted">
                Choisissez un mot de passe sécurisé et unique.
              </p>
            </div>

            {/* Error Message */}
            {error && !success && (
              <div className="error-box p-4 rounded-2xl bg-state-error-bg border border-state-error/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-state-error/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-state-error" />
                </div>
                <p className="text-sm text-state-error font-medium">{error}</p>
              </div>
            )}

            {/* Success State */}
            {success && (
              <div className="success-state absolute inset-0 z-10 flex flex-col items-center justify-center py-12 text-center bg-bg-canvas">
                <div className="w-20 h-20 rounded-full bg-state-success/10 flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-state-success" />
                </div>
                <h3 className="text-2xl font-bold text-text-primary mb-2">Mot de passe configuré !</h3>
                <p className="text-text-muted max-w-sm">
                  Votre compte MedEra est maintenant sécurisé. Vous allez être redirigé vers la page de connexion.
                </p>
              </div>
            )}

            {/* Form */}
            {!success && (
              <form onSubmit={handleSubmit} className="reset-form space-y-6 relative">
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full bg-bg-input border border-ui-border rounded-[1.5rem] py-5 pl-14 pr-14 text-text-primary text-lg transition-all focus:outline-none focus:border-brand-indigo/50 focus:bg-bg-input-hover focus:ring-4 focus:ring-brand-indigo/10 peer placeholder-shown:bg-transparent"
                    />
                    <label htmlFor="password" className="absolute left-14 top-1/2 -translate-y-1/2 text-text-muted transition-all pointer-events-none peer-focus:-translate-y-[1.8rem] peer-focus:text-brand-indigo peer-focus:text-xs peer-[:not(:placeholder-shown)]:-translate-y-[1.8rem] peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-text-muted font-medium">
                      Nouveau mot de passe
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

                {/* Confirm Password Field */}
                <div className="group space-y-2">
                  <div className="relative">
                    <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${focusedField === 'confirm' ? 'text-brand-indigo' : 'text-text-muted'}`}>
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder=" "
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={() => setFocusedField('confirm')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full bg-bg-input border border-ui-border rounded-[1.5rem] py-5 pl-14 pr-14 text-text-primary text-lg transition-all focus:outline-none focus:border-brand-indigo/50 focus:bg-bg-input-hover focus:ring-4 focus:ring-brand-indigo/10 peer placeholder-shown:bg-transparent"
                    />
                    <label htmlFor="confirmPassword" className="absolute left-14 top-1/2 -translate-y-1/2 text-text-muted transition-all pointer-events-none peer-focus:-translate-y-[1.8rem] peer-focus:text-brand-indigo peer-focus:text-xs peer-[:not(:placeholder-shown)]:-translate-y-[1.8rem] peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-text-muted font-medium">
                      Confirmez le mot de passe
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full relative group overflow-hidden rounded-[1.5rem] py-5 mt-4 font-bold text-white transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed magnetic-btn"
                >
                  {/* Background Layer */}
                  <div className="absolute inset-0 bg-brand-indigo transition-colors" />
                  
                  {/* Hover Glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-brand-indigo via-indigo-400 to-brand-indigo bg-[length:200%_100%] animate-gradient-slow" />
                  
                  <span className="relative flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Configuration...
                      </>
                    ) : (
                      <>
                        Enregistrer et se connecter
                      </>
                    )}
                  </span>
                </button>
              </form>
            )}

            {/* Support / Legal */}
            <div className="pt-8 border-t border-ui-border flex flex-col sm:flex-row justify-between gap-4 text-xs text-text-muted uppercase tracking-widest absolute bottom-[-80px] w-full">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
                <span>Système Opérationnel</span>
              </div>
              <div className="flex items-center gap-4">
                <button className="hover:text-text-primary transition-colors">Sécurité</button>
                <button className="hover:text-text-primary transition-colors">Confidentialité</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GLOBAL OVERLAY NOISE */}
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
}
