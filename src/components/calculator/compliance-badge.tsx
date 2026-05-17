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
      ? 'text-success bg-success-soft/60'
      : status === 'warning'
        ? 'text-warning bg-warning-soft/60'
        : status === 'blocking_violation'
          ? 'text-error bg-error-soft/60'
          : 'text-subtext bg-paper-2';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tone}`}
      title={result.compliance.violations
        .map((v) => (locale === 'de' ? v.messageDe : v.messageEn))
        .join('\n')}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {t(status)}
    </span>
  );
}
