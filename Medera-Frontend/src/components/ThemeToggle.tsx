import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 bg-bg-input border border-ui-border/40 shadow-sm text-text-muted hover:text-text-primary group"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-5 h-5 text-yellow-400 animate-in zoom-in duration-300" />
        ) : (
          <Moon className="w-5 h-5 text-brand-indigo animate-in zoom-in duration-300" />
        )}
      </div>
    </button>
  );
}
