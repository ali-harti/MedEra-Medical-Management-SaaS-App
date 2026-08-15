import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function GenericPage({ title }: { title: string }) {
  const location = useLocation();
  const path = location.pathname.substring(1).replace('-', ' ');
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto px-8 py-20 min-h-[50vh]">
      <Link to="/" className="inline-flex items-center gap-2 text-brand-indigo hover:text-brand-indigo-glow font-medium mb-12 group transition-colors">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {t('generic.backToHome') || 'Back to Home'}
      </Link>
      
      <div className="space-y-6">
        <h1 className="text-5xl font-serif font-bold text-text-primary">{title}</h1>
        <p className="text-xl text-text-muted max-w-2xl leading-relaxed">
          {t('generic.welcome')} <span className="capitalize font-semibold text-brand-indigo">{path || title.toLowerCase()}</span>. {t('generic.preparing')}
        </p>
      </div>

      <div className="mt-16 bg-bg-surface p-10 rounded-2xl border border-ui-border shadow-sm">
        <p className="text-text-muted leading-relaxed">
          {t('hero.desc')} {t('generic.questionsPrefix')} {title.toLowerCase()}{t('generic.questionsSuffix')}, {t('generic.feelFree')} <Link to="/contact" className="text-brand-indigo hover:underline">{t('generic.contact')}</Link>.
        </p>
      </div>
    </div>
  );
}
