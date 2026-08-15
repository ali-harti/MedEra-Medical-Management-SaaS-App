/**
 * MedEra Design System Tokens
 * TypeScript export for usage in JS environments (e.g., inline styles, Recharts, Framer Motion)
 */

export const designTokens = {
  colors: {
    dark: {
      canvas: '#06060F',
      surface: '#0D0D1E',
      elevated: '#12122A',
      input: 'rgba(255,255,255,0.03)',
      border: 'rgba(255,255,255,0.07)',
      textPrimary: '#F0F0FF',
      textSecondary: '#9090B0',
      textMuted: '#5A5A7A',
    },
    light: {
      canvas: '#F5F5FF',
      surface: '#FFFFFF',
      elevated: '#EEEEF8',
      input: 'rgba(0,0,0,0.03)',
      border: 'rgba(0,0,0,0.08)',
      textPrimary: '#0D0D1E',
      textSecondary: '#4A4A6A',
      textMuted: '#8A8AAA',
    },
    brand: {
      indigo: '#4B4ACF',
      indigoGlow: '#6C6BFF',
      lavender: '#A5A4F3',
    },
    semantic: {
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
      video: '#06B6D4',
      inPerson: '#22C55E',
    },
    status: {
      confirmed: '#22C55E',
      pending: '#F59E0B',
      inProgress: '#4B4ACF',
      cancelled: '#EF4444',
      done: '#9090B0',
      paid: '#22C55E',
      refunded: '#A5A4F3',
      draft: '#F59E0B',
    }
  },
  typography: {
    fonts: {
      display: "'Cormorant Garamond', serif",
      ui: "'DM Sans', sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    sizes: {
      h1: '36px',
      h2: '28px',
      h3: '24px',
      bodyLg: '16px',
      body: '14px',
      bodySm: '13px',
      caption: '12px',
      micro: '10px',
    }
  },
  animation: {
    easing: {
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      magnetic: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
    },
    durations: {
      fast: '150ms',
      normal: '250ms',
      slow: '400ms',
    }
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '20px',
    xl: '24px',
    full: '9999px',
  }
};

export type ThemeType = 'dark' | 'light';

export const getThemeColors = (theme: ThemeType = 'dark') => {
  return designTokens.colors[theme];
};
