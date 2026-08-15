import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, AlertCircle, Loader2, X } from 'lucide-react';

type ModalVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ModalVariant;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const variantConfig: Record<ModalVariant, { icon: typeof AlertTriangle; iconBg: string; iconColor: string; confirmBg: string; confirmHover: string }> = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-[#EF44441A]',
    iconColor: 'text-[#EF4444]',
    confirmBg: 'bg-[#EF4444]',
    confirmHover: 'hover:bg-[#DC2626]',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-[#F59E0B1A]',
    iconColor: 'text-[#F59E0B]',
    confirmBg: 'bg-[#F59E0B]',
    confirmHover: 'hover:bg-[#D97706]',
  },
  info: {
    icon: Info,
    iconBg: 'bg-[#4B4ACF1A]',
    iconColor: 'text-[#6C6BFF]',
    confirmBg: 'bg-[#4B4ACF]',
    confirmHover: 'hover:bg-[#6C6BFF]',
  },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 bg-bg-surface border border-ui-border rounded-2xl w-full max-w-[420px] shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-bg-input flex items-center justify-center text-text-muted transition-colors"
            >
              <X size={16} />
            </button>

            {/* Content */}
            <div className="p-6 pt-8 flex flex-col items-center text-center">
              <div className={`w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center mb-5`}>
                <IconComponent size={24} className={config.iconColor} />
              </div>
              <h3 className="text-[18px] font-semibold text-text-primary mb-2 font-sans">{title}</h3>
              <p className="text-[14px] text-text-muted leading-relaxed max-w-[320px]">{description}</p>
            </div>

            {/* Actions */}
            <div className="p-5 pt-2 flex gap-3">
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl border border-ui-border bg-transparent text-text-primary text-[14px] font-medium hover:bg-bg-input transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 py-2.5 rounded-xl text-white text-[14px] font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${config.confirmBg} ${config.confirmHover}`}
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
