import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Video, Mic, Camera, X } from 'lucide-react';

interface PreJoinModalProps {
  doctorName: string;
  onJoin: () => void;
  onCancel: () => void;
}

export const PreJoinModal: React.FC<PreJoinModalProps> = ({ doctorName, onJoin, onCancel }) => {
  const { t } = useLanguage();
  const [micAllowed, setMicAllowed] = useState<boolean | null>(null);
  const [camAllowed, setCamAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    // Request permissions on mount
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(stream => {
        setMicAllowed(true);
        setCamAllowed(true);
        // Stop stream tracks immediately since we're just checking permissions
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(err => {
        console.warn("Permissions denied", err);
        setMicAllowed(false);
        setCamAllowed(false);
      });
  }, []);

  return (
    <div className="prejoin-screen">
      <motion.div 
        className="prejoin-card"
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 10, opacity: 0, scale: 0.95 }}
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-brand-indigo/10 text-brand-indigo flex items-center justify-center">
            <Video size={32} />
          </div>
        </div>
        
        <h2 className="text-[20px] font-sans font-semibold text-text-primary mb-2">
          {t('video.prejoin.title') || "You're about to join a video consultation"}
        </h2>
        <p className="text-[14px] text-text-secondary mb-8">
          {t('video.prejoin.with') || 'with'} {doctorName}
        </p>

        <div className="space-y-3 mb-8">
          <div className="permission-row">
            <div className="flex items-center gap-3">
               <Mic size={18} className="text-text-muted" />
               <span>{t('video.prejoin.mic') || 'Microphone'}</span>
            </div>
            <div className={`permission-status ${micAllowed ? 'allowed' : 'denied'}`}>
               {micAllowed ? '● ' + (t('video.prejoin.allowed') || 'Allowed') : '● ' + (t('video.prejoin.denied') || 'Denied')}
            </div>
          </div>
          <div className="permission-row">
            <div className="flex items-center gap-3">
               <Camera size={18} className="text-text-muted" />
               <span>{t('video.prejoin.cam') || 'Camera'}</span>
            </div>
            <div className={`permission-status ${camAllowed ? 'allowed' : 'denied'}`}>
               {camAllowed ? '● ' + (t('video.prejoin.allowed') || 'Allowed') : '● ' + (t('video.prejoin.denied') || 'Denied')}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
             onClick={onJoin} 
             className="w-full bg-gradient-to-br from-[#06B6D4] to-[#0891B2] text-white font-sans text-[15px] font-medium py-3.5 rounded-xl hover:shadow-[0_8px_24px_rgba(6,182,212,0.4)] transition-all hover:-translate-y-0.5"
          >
            {t('video.prejoin.join') || 'Join Now →'}
          </button>
          <button 
             onClick={onCancel}
             className="w-full text-text-muted font-sans text-[14px] font-medium py-3 rounded-xl hover:bg-bg-input transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};
