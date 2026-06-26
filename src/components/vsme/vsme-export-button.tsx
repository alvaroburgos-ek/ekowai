'use client';

import { FileDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface VsmeExportButtonProps {
  projectId: string;
  locale: 'de' | 'en';
}

export function VsmeExportButton({ projectId, locale }: VsmeExportButtonProps) {
  const t = useTranslations('vsme.export');

  const base = `/api/projects/${projectId}/vsme/export`;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink">{t('title')}</h3>
      <div className="flex flex-wrap gap-3">
        <a
          href={`${base}?format=xlsx&locale=${locale}`}
          download
          className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper-2 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-paper-2/80 hover:text-accent-2"
        >
          <FileDown className="size-3.5" aria-hidden />
          {t('xlsx')}
        </a>
        <a
          href={`${base}?format=pdf`}
          download
          className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-paper-2 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-paper-2/80 hover:text-accent-2"
        >
          <FileDown className="size-3.5" aria-hidden />
          {t('pdf')}
        </a>
      </div>
    </div>
  );
}
