import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action, className = '' }) => {
  const ActionIcon = action?.icon;
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-brand-indigo/8 flex items-center justify-center mb-5">
        <Icon size={28} className="text-brand-indigo/40" strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-medium text-text-primary mb-1">{title}</p>
      {description && (
        <p className="text-[13px] text-text-muted max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-indigo/10 text-brand-indigo rounded-full text-[13px] font-bold hover:bg-brand-indigo/20 transition-colors border border-brand-indigo/20"
        >
          {ActionIcon && <ActionIcon size={15} />}
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
