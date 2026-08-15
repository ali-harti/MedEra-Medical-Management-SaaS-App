import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

export const formatDate = (date: any, formatStr: string = 'PP', locale: string = 'fr') => {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return format(d, formatStr, {
      locale: locale === 'fr' ? fr : enUS
    });
  } catch (e) {
    return 'Invalid Date';
  }
};

export const formatTime = (date: any, locale: string = 'fr') => {
  return formatDate(date, 'p', locale);
};

export const formatFull = (date: any, locale: string = 'fr') => {
  return formatDate(date, 'PPpp', locale);
};
