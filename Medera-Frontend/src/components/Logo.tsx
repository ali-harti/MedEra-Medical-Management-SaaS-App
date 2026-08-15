import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = "", variant = 'default', size = 'md' }: LogoProps) {
  const isLight = variant === 'light';
  
  const sizeClasses = {
    sm: { container: 'w-8 h-8', icon: 'w-5 h-5', text: 'text-xl' },
    md: { container: 'w-10 h-10', icon: 'w-6 h-6', text: 'text-2xl' },
    lg: { container: 'w-14 h-14', icon: 'w-8 h-8', text: 'text-4xl' }
  };

  const currentSize = sizeClasses[size];

  return (
    <Link to="/" className={`flex items-center gap-3 ${className} hover:opacity-90 transition-opacity group`}>
      <div className={`${currentSize.container} rounded-xl bg-brand-indigo flex items-center justify-center text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] group-hover:scale-105 transition-transform duration-300`}>
        <Activity className={currentSize.icon} />
      </div>
      <span className={`font-serif font-bold ${currentSize.text} tracking-tight transition-colors duration-300 ${
        isLight ? 'text-white' : 'text-text-primary'
      }`}>
        MedEra
      </span>
    </Link>
  );
}

// Named export to match Layout.tsx pattern if needed
export { Logo as MedEraLogo };
