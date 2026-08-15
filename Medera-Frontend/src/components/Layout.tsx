import React, { useState, useEffect } from 'react';
import { TopRightActions } from './TopRightActions';
import { Outlet, Link } from 'react-router-dom';
import { Globe, Share2, Mail, Moon, Sun, Languages, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

import Logo from './Logo';
export { Logo };

export default function Layout() {
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-background font-body text-on-surface flex flex-col min-h-screen selection:bg-brand-indigo/30 selection:text-white">
      {/* TopNavBar */}
      <motion.nav 
        initial={{ y: 0 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled 
            ? "glass-island-nav shadow-sm" 
            : "bg-transparent backdrop-blur-none border-b border-transparent"
        }`}
      >
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <Logo />
          <div className="hidden md:flex items-center gap-x-8">
            <a
              className="text-slate-500 dark:text-slate-300 hover:text-brand-indigo dark:hover:text-white transition-all duration-300 font-medium relative group"
              href="/#solutions"
            >
              {t('nav.solutions')}
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </a>
            <a
              className="text-slate-500 dark:text-slate-300 hover:text-brand-indigo dark:hover:text-white transition-all duration-300 font-medium relative group"
              href="/#features"
            >
              {t('nav.features')}
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </a>
            <a
              className="text-slate-500 dark:text-slate-300 hover:text-brand-indigo dark:hover:text-white transition-all duration-300 font-medium relative group"
              href="/#pricing"
            >
              {t('nav.pricing')}
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </a>
            <a
              className="text-slate-500 dark:text-slate-300 hover:text-brand-indigo dark:hover:text-white transition-all duration-300 font-medium relative group"
              href="/#security"
            >
              {t('nav.security')}
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <TopRightActions />
            <Link to="/login" className="text-text-muted font-medium hover:text-text-brand-indigo transition-all duration-300">
              {t('nav.login')}
            </Link>
            <Link to="/get-started">
              <button className="relative overflow-hidden bg-brand-indigo text-white px-6 py-2.5 rounded-full font-semibold shadow-[0_0_15px_var(--border-hover)] hover:shadow-[0_0_25px_var(--border-focus)] hover:scale-105 transition-all duration-200 ease-in-out cursor-pointer group">
                <span className="relative z-10">{t('nav.getStarted')}</span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
              </button>
            </Link>
          </div>
        </div>
      </motion.nav>

      <motion.main 
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex-grow pt-0" /* Removed pt-24 since landing handles its own padding */
      >
        <Outlet />
      </motion.main>

      {/* Footer */}
      <footer className="bg-bg-canvas dark:bg-bg-surface text-text-muted py-24 px-8 mt-auto relative border-t border-transparent" style={{ borderImage: "linear-gradient(90deg, transparent, var(--indigo), transparent) 1" }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2 md:col-span-1 space-y-6">
              <Logo className="h-10 transition-opacity" />
              <p className="text-sm leading-relaxed max-w-xs mt-6 opacity-70">
                {t('footer.desc')}
              </p>
            </div>
            <div className="space-y-6">
              <h4 className="text-text-brand-indigo font-mono uppercase tracking-widest text-xs">
                {t('footer.product')}
              </h4>
              <ul className="space-y-4 text-sm">
                <li>
                  <a className="hover:text-brand-indigo dark:hover:text-white transition-colors relative group" href="/#solutions">
                    {t('nav.solutions')}
                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </a>
                </li>
                <li>
                  <a className="hover:text-brand-indigo dark:hover:text-white transition-colors relative group" href="/#pricing">
                    {t('nav.pricing')}
                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </a>
                </li>
                <li>
                  <Link className="hover:text-brand-indigo dark:hover:text-white transition-colors relative group" to="/integrations">
                    Integrations
                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-brand-indigo dark:hover:text-white transition-colors relative group" to="/releases">
                    Releases
                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-text-brand-indigo font-mono uppercase tracking-widest text-xs">
                {t('footer.company')}
              </h4>
              <ul className="space-y-4 text-sm">
                <li>
                  <Link className="hover:text-brand-indigo dark:hover:text-white transition-colors relative group" to="/about">
                    About
                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-brand-indigo dark:hover:text-white transition-colors relative group" to="/careers">
                    Careers
                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-brand-indigo dark:hover:text-white transition-colors relative group" to="/privacy">
                    Privacy
                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-brand-indigo dark:hover:text-white transition-colors relative group" to="/contact">
                    Contact
                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-6">
              <h4 className="text-text-brand-indigo font-mono uppercase tracking-widest text-xs">
                {t('footer.legal')}
              </h4>
              <ul className="space-y-4 text-sm">
                <li>
                  <Link className="hover:text-brand-indigo dark:hover:text-white transition-colors relative group" to="/terms">
                    Terms of Service
                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-brand-indigo dark:hover:text-white transition-colors relative group" to="/privacy">
                    Privacy Policy
                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-brand-indigo dark:hover:text-white transition-colors relative group" to="/hipaa">
                    HIPAA Compliance
                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-brand-indigo dark:hover:text-white transition-colors relative group" to="/security-audit">
                    Security Audit
                    <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-brand-indigo scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-ui-border flex flex-col md:flex-row justify-between items-center gap-6 opacity-60 hover:opacity-100 transition-opacity">
            <p className="text-xs font-mono">
              {t('footer.rights')}
            </p>
            <div className="flex gap-6">
              <Link className="text-text-muted hover:text-brand-indigo transition-all duration-300" to="#">
                <Globe className="w-5 h-5" />
              </Link>
              <Link className="text-text-muted hover:text-brand-indigo transition-all duration-300" to="#">
                <Share2 className="w-5 h-5" />
              </Link>
              <Link className="text-text-muted hover:text-brand-indigo transition-all duration-300" to="#">
                <Mail className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
