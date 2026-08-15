import React, { createContext, useContext, useState } from 'react';
import { translations } from '../i18n/translations';

export type Language = 'en' | 'fr';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('medera-lang');
      if (saved === 'en' || saved === 'fr') return saved as Language;
    } catch(e) {}
    return navigator.language.startsWith('fr') ? 'fr' : 'en';
  });

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem('medera-lang', newLang);
    } catch(e) {}
  };

  React.useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('medera-lang', lang);
    } catch(e) {}
  }, [lang]);

  const t = (key: string) => {
    const tryResolve = (langCode: Language) => {
      const db = translations[langCode] as any;
      if (!db) return undefined;
      
      // 1. Try flat key first (e.g. "patient.nav.dashboard")
      if (db[key] !== undefined) {
        return db[key];
      }
      
      // 2. Try nested key
      const keys = key.split('.');
      let value = db;
      for (const k of keys) {
        if (!value || typeof value !== 'object') return undefined;
        value = value[k];
      }
      return value === undefined ? undefined : value;
    };

    const currentValue = tryResolve(lang);
    if (currentValue !== undefined) return currentValue;

    const fallbackValue = tryResolve('en');
    if (fallbackValue !== undefined) {
      console.warn(`[i18n] Missing translation for key "${key}" in "${lang}" — using EN fallback`);
      return fallbackValue;
    }

    console.error(`[i18n] Key "${key}" not found in any language`);
    return key;
  };

  const switchLang = (newLang: string) => {
    const normalized = newLang.toLowerCase() as Language;
    if (!translations[normalized]) {
      console.error(`[i18n] Language "${normalized}" has no translations loaded`);
      return;
    }
    handleSetLang(normalized);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: switchLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
