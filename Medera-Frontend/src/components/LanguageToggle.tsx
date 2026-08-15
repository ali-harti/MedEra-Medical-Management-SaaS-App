import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <button 
      onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
      className="px-3 py-1.5 rounded-lg bg-bg-elevated border border-ui-border text-[13px] font-medium text-text-primary hover:bg-white/5 transition-colors"
    >
      {lang === 'en' ? 'EN' : 'FR'}
    </button>
  );
}
