import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action, secondaryAction, children }) => {
  const ActionIcon = action?.icon || Plus;
  const SecondaryIcon = secondaryAction?.icon;

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
      <div>
        <h1 className="text-[40px] font-serif italic text-text-primary leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-[16px] text-text-muted mt-1 font-sans">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-ui-border text-text-primary hover:bg-bg-input rounded-full transition-all text-[14px] font-medium"
          >
            {SecondaryIcon && <SecondaryIcon size={16} />}
            <span>{secondaryAction.label}</span>
          </button>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-indigo text-white hover:bg-[#7C75FF] rounded-full shadow-[0_4px_12px_rgba(99,91,255,0.3)] transition-all relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <ActionIcon size={18} />
            <span className="font-medium text-[14px]">{action.label}</span>
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default PageHeader;
