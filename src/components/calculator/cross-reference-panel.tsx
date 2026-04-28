'use client';

import { useCalculatorStore } from '@/lib/state/calculator-store';
import { useTranslations } from 'next-intl';
import { evalCondition, type ExpressionAst } from '@/lib/engine';

export interface CrossReference {
  id: string;
  sourceSection: string;
  triggerCondition: ExpressionAst;
  targetRegulation: string;
  targetSection: string;
  rationale: string;
  wizardSupported: boolean;
}

export function CrossReferencePanel({ crossRefs }: { crossRefs: CrossReference[] }) {
  const t = useTranslations('xref');
  const inputs = useCalculatorStore((s) => s.inputs);
  const result = useCalculatorStore((s) => s.result);

  const merged = { ...inputs, ...(result?.computed ?? {}) };
  const active = crossRefs.filter((x) => evalCondition(x.triggerCondition, merged) !== 0);
  if (active.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{t('title')}</h2>
      <ul className="space-y-3">
        {active.map((x) => (
          <li key={x.id} className="text-sm text-slate-700">
            <p className="font-medium">
              {x.targetRegulation} {x.targetSection}{' '}
              <span className="text-xs text-slate-500">
                ({t('triggeredBy')} {x.sourceSection})
              </span>
            </p>
            <p className="mt-1 text-slate-600">{x.rationale}</p>
            {!x.wizardSupported && (
              <p className="mt-1 text-xs text-slate-500 italic">{t('textOnlyNotice')}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
