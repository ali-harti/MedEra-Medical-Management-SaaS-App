import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Video, Building2 } from 'lucide-react';

interface TypeBadgeProps {
  type: 'VIDEO' | 'IN_PERSON' | string;
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type }) => {
  const { t } = useLanguage();

  if (type === 'VIDEO') {
    const videoText = t('appt.type.video');
    const displayVideo = videoText === 'appt.type.video' ? 'VIDEO' : videoText;
    return (
      <div className="flex items-center gap-1 px-2 py-[2px] rounded border border-[#06B6D4]/20 bg-[#06B6D4]/10 text-[#06B6D4] text-[9px] font-mono font-bold uppercase tracking-widest w-fit shadow-[0_1px_2px_rgba(6,182,212,0.1)]">
        <Video size={9} /> {displayVideo}
      </div>
    );
  }

  const inPersonText = t('appt.type.inperson');
  const displayInPerson = inPersonText === 'appt.type.inperson' ? 'IN PERSON' : inPersonText;
  return (
    <div className="flex items-center gap-1 px-2 py-[2px] rounded border border-ui-border bg-bg-surface text-text-primary text-[9px] font-mono font-bold uppercase tracking-widest w-fit shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <Building2 size={9} className="text-text-muted" /> {displayInPerson}
    </div>
  );
};
