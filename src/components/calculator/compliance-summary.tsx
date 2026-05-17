'use client';

import { useCalculatorStore } from '@/lib/state/calculator-store';
import { useTranslations } from 'next-intl';
import type { ComplianceThreshold } from '@/lib/engine';

type IssueKind = 'open' | 'violated' | 'satisfied';

interface Issue {
  threshold: ComplianceThreshold;
  kind: IssueKind;
  observed?: number;
}

function classify(
  threshold: ComplianceThreshold,
  values: Record<string, unknown>,
): Issue {
  const raw = values[threshold.ref];
  if (raw === undefined || raw === null || raw === '') {
    return { threshold, kind: 'open' };
  }
  const v = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(v)) return { threshold, kind: 'open' };
  let satisfied = false;
  switch (threshold.rule.kind) {
    case 'lte':
      satisfied = v <= threshold.rule.value;
      break;
    case 'gte':
      satisfied = v >= threshold.rule.value;
      break;
    case 'eq':
      satisfied = v === threshold.rule.value;
      break;
  }
  return { threshold, kind: satisfied ? 'satisfied' : 'violated', observed: v };
}

function ruleSymbol(kind: 'lte' | 'gte' | 'eq'): string {
  return kind === 'gte' ? '≥' : kind === 'lte' ? '≤' : '=';
}

export function ComplianceSummary({ locale }: { locale: 'de' | 'en' }) {
  const worksheet = useCalculatorStore((s) => s.worksheet);
  const inputs = useCalculatorStore((s) => s.inputs);
  const result = useCalculatorStore((s) => s.result);
  const t = useTranslations('compliance');

  if (!worksheet || !result) return null;
  if (worksheet.thresholds.length === 0) return null;

  const merged = { ...inputs, ...result.computed };
  const issues = worksheet.thresholds.map((th) => classify(th, merged));

  const violated = issues.filter((i) => i.kind === 'violated');
  const open = issues.filter((i) => i.kind === 'open');
  const satisfied = issues.filter((i) => i.kind === 'satisfied');

  return (
    <section className="border border-hairline bg-paper">
      <header className="border-b border-hairline px-5 py-3 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-subtext mb-0.5">
            {t('header')}
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {t('title')}
          </h2>
        </div>
        <div className="flex gap-3 text-[10px] uppercase tracking-[0.18em] tabular-nums">
          {violated.length > 0 && (
            <span className="text-error">
              ✗ {String(violated.length).padStart(2, '0')} {t('violated')}
            </span>
          )}
          {open.length > 0 && (
            <span className="text-warning">
              ⌬ {String(open.length).padStart(2, '0')} {t('open')}
            </span>
          )}
          <span className="text-success">
            ✓ {String(satisfied.length).padStart(2, '0')} {t('compliant')}
          </span>
        </div>
      </header>

      {/* Violated — needs adjustment, urgent */}
      {violated.length > 0 && (
        <ul className="divide-y divide-hairline">
          {violated.map((iss) => (
            <li key={iss.threshold.id} className="px-5 py-4 space-y-2 bg-error-soft/20">
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <p className="text-base font-semibold text-error">
                  ✗ {locale === 'de' ? iss.threshold.messageDe : iss.threshold.messageEn}
                </p>
                <span className="text-xs tabular-nums text-error">
                  {iss.observed?.toFixed(2)} {ruleSymbol(iss.threshold.rule.kind)}{' '}
                  {iss.threshold.rule.value}
                </span>
              </div>
              {iss.threshold.iterationHint && (
                <p className="text-sm text-ink-2 leading-relaxed pl-4 border-l border-error">
                  {iss.threshold.iterationHint}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Open — needs a value */}
      {open.length > 0 && (
        <ul className="divide-y divide-hairline border-t border-hairline">
          {open.map((iss) => (
            <li
              key={iss.threshold.id}
              className="px-5 py-3 flex items-baseline justify-between gap-4 flex-wrap bg-warning-soft/20"
            >
              <p className="text-sm text-ink-2">
                <span className="text-warning mr-2">⌬</span>
                <span className="font-medium text-ink">
                  {locale === 'de' ? iss.threshold.messageDe : iss.threshold.messageEn}
                </span>
              </p>
              <span className="text-[11px] uppercase tracking-[0.18em] text-subtext">
                {t('needsValue')} · {iss.threshold.ref}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Satisfied — collapsed by default into a calm strip */}
      {satisfied.length > 0 && (
        <details className="border-t border-hairline">
          <summary className="cursor-pointer px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-success hover:bg-success-soft/30 transition-colors">
            {String(satisfied.length).padStart(2, '0')} {t('compliantList')}
          </summary>
          <ul className="divide-y divide-hairline border-t border-hairline">
            {satisfied.map((iss) => (
              <li
                key={iss.threshold.id}
                className="px-5 py-2 flex items-baseline justify-between gap-4 text-sm"
              >
                <span className="text-ink-2">
                  <span className="text-success mr-2">✓</span>
                  {locale === 'de' ? iss.threshold.messageDe : iss.threshold.messageEn}
                </span>
                <span className="text-[11px] tabular-nums text-success">
                  {iss.observed?.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
