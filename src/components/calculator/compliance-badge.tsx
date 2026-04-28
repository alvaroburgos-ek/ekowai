'use client';

import { useCalculatorStore } from '@/lib/state/calculator-store';
import { useTranslations } from 'next-intl';

export function ComplianceBadge({ locale }: { locale: 'de' | 'en' }) {
  const result = useCalculatorStore((s) => s.result);
  const t = useTranslations('calc.compliance');
  if (!result) return null;

  const status = result.compliance.status;
  const tone =
    status === 'compliant'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'warning'
        ? 'bg-amber-100 text-amber-800'
        : status === 'blocking_violation'
          ? 'bg-red-100 text-red-800'
          : 'bg-slate-100 text-slate-700';

  return (
    <span
      className={`text-xs px-2 py-1 rounded ${tone}`}
      title={result.compliance.violations
        .map((v) => (locale === 'de' ? v.messageDe : v.messageEn))
        .join('\n')}
    >
      {t(status)}
    </span>
  );
}
