import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextType {
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 120 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="px-5 py-4 bg-bg-surface border border-ui-border rounded-xl shadow-2xl flex items-center gap-3 text-[14px] text-text-primary"
            >
              {t.type === 'success' && <CheckCircle className="text-state-success w-5 h-5" />}
              {t.type === 'error' && <AlertCircle className="text-state-error w-5 h-5" />}
              {t.type === 'info' && <Info className="text-brand-indigo w-5 h-5" />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
