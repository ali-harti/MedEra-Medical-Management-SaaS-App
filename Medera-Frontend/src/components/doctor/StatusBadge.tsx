import React from 'react';

type StatusContext = 'appointment' | 'consultation' | 'invoice' | 'prescription' | 'generic';

interface StatusBadgeProps {
  status: string;
  context?: StatusContext;
  size?: 'sm' | 'md';
  className?: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  // Appointment statuses
  PLANNED:       { label: 'Planifié',    bg: 'bg-[#F59E0B1A]', text: 'text-[#F59E0B]' },
  CONFIRMED:     { label: 'Confirmé',    bg: 'bg-[#22C55E1A]', text: 'text-[#22C55E]' },
  IN_PROGRESS:   { label: 'En cours',    bg: 'bg-[#4B4ACF1A]', text: 'text-[#6C6BFF]' },
  DONE:          { label: 'Terminé',     bg: 'bg-[#9090B01A]', text: 'text-[#9090B0]' },
  COMPLETED:     { label: 'Terminé',     bg: 'bg-[#9090B01A]', text: 'text-[#9090B0]' },
  CANCELLED:     { label: 'Annulé',      bg: 'bg-[#EF44441A]', text: 'text-[#EF4444]' },

  // Consultation statuses
  DRAFT:         { label: 'Brouillon',   bg: 'bg-[#F59E0B1A]', text: 'text-[#F59E0B]' },
  FINALIZED:     { label: 'Finalisée',   bg: 'bg-[#22C55E1A]', text: 'text-[#22C55E]' },

  // Invoice statuses
  PENDING:       { label: 'En attente',  bg: 'bg-[#F59E0B1A]', text: 'text-[#F59E0B]' },
  PAID:          { label: 'Payée',       bg: 'bg-[#22C55E1A]', text: 'text-[#22C55E]' },
  REFUNDED:      { label: 'Remboursée',  bg: 'bg-[#A5A4F31A]', text: 'text-[#A5A4F3]' },

  // Prescription
  ACTIVE:        { label: 'Active',      bg: 'bg-[#22C55E1A]', text: 'text-[#22C55E]' },
  VALID:         { label: 'Active',      bg: 'bg-[#22C55E1A]', text: 'text-[#22C55E]' },

  // Generic fallback
  DEFAULT:       { label: '—',           bg: 'bg-[#5A5A7A1A]', text: 'text-[#5A5A7A]' },
};

// Context-specific overrides for shared status keys
const CONTEXT_OVERRIDES: Partial<Record<StatusContext, Record<string, { label: string }>>> = {
  invoice: {
    CANCELLED: { label: 'Annulée' },
  },
  consultation: {
    IN_PROGRESS: { label: 'En cours' },
    COMPLETED:   { label: 'Finalisée' },
  },
  prescription: {
    CANCELLED: { label: 'Annulée' },
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, context = 'generic', size = 'sm', className = '' }) => {
  const normalized = status?.toUpperCase().replace(/ /g, '_') || 'DEFAULT';
  const base = STATUS_MAP[normalized] || STATUS_MAP.DEFAULT;
  const override = CONTEXT_OVERRIDES[context]?.[normalized];
  const label = override?.label || base.label;

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px]'
    : 'px-2.5 py-1 text-[11px]';

  return (
    <span className={`inline-flex items-center rounded-md font-mono uppercase font-bold tracking-wider whitespace-nowrap ${base.bg} ${base.text} ${sizeClasses} ${className}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
