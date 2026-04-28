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
      ? 'text-success border-success'
      : status === 'warning'
        ? 'text-warning border-warning'
        : status === 'blocking_violation'
          ? 'text-error border-error'
          : 'text-subtext border-hairline-strong';

  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 border font-mono text-[10px] uppercase tracking-[0.2em] ${tone}`}
      title={result.compliance.violations
        .map((v) => (locale === 'de' ? v.messageDe : v.messageEn))
        .join('\n')}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {t(status)}
    </span>
  );
}
