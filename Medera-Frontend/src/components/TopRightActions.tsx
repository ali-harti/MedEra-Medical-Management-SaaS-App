import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export function TopRightActions() {
  const { lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center gap-3 pointer-events-auto">
      <div className="flex items-center gap-1 bg-bg-elevated rounded-full p-1 border border-ui-border shadow-sm">
        {['en', 'fr'].map((l) => (
          <button
            key={l}
            onClick={() => setLang(l as 'en' | 'fr')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-all duration-300 ${lang === l ? 'bg-brand-indigo text-white shadow-md' : 'text-text-muted hover:text-text-primary'}`}
          >
            {l}
          </button>
        ))}
      </div>
      <button 
        onClick={toggleTheme}
        className="p-2 rounded-full bg-bg-elevated border border-ui-border text-text-muted hover:text-text-brand-indigo transition-colors shadow-sm focus:outline-none"
        title="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </div>
  );
}
