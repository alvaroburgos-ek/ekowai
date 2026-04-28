'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCalculatorStore } from '@/lib/state/calculator-store';
import { openDecisionPoints, type DecisionPoint } from '@/lib/engine';
import { listDecisionsForCalc } from '@/lib/actions/decision';
import { DecisionModal } from './decision-modal';
import { Button } from '@/components/ui/button';

interface RecordedDecision {
  decisionPointId: string;
  choice: string;
  rationale: string | null;
}

export function DecisionBanner({
  locale,
  initialDecisions,
}: {
  locale: 'de' | 'en';
  initialDecisions: RecordedDecision[];
}) {
  const t = useTranslations('decisions');
  const worksheet = useCalculatorStore((s) => s.worksheet);
  const inputs = useCalculatorStore((s) => s.inputs);
  const result = useCalculatorStore((s) => s.result);
  const calcId = useCalculatorStore((s) => s.calcId);

  const [recorded, setRecorded] = useState<Map<string, RecordedDecision>>(
    new Map(initialDecisions.map((d) => [d.decisionPointId, d])),
  );
  const [activeDp, setActiveDp] = useState<DecisionPoint | null>(null);

  if (!worksheet || !result || !calcId) return null;
  const open = openDecisionPoints(
    worksheet,
    inputs,
    result.computed,
    new Set(recorded.keys()),
  );
  if (open.length === 0) return null;

  async function refresh() {
    if (!calcId) return;
    const rows = await listDecisionsForCalc(calcId);
    setRecorded(
      new Map(
        rows.map((r) => [
          r.decisionPointId,
          { decisionPointId: r.decisionPointId, choice: r.choice, rationale: r.rationale },
        ]),
      ),
    );
  }

  return (
    <>
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-amber-900">{t('openTitle')}</h3>
        <ul className="space-y-2">
          {open.map((dp) => (
            <li
              key={dp.id}
              className="flex items-center justify-between gap-3 text-sm text-slate-700"
            >
              <span>
                {locale === 'de' ? dp.labelDe : dp.labelEn}{' '}
                <span className="text-xs text-slate-500">{dp.citation}</span>
              </span>
              <Button variant="ghost" onClick={() => setActiveDp(dp)}>
                {t('decide')}
              </Button>
            </li>
          ))}
        </ul>
      </section>
      {activeDp && (
        <DecisionModal
          dp={activeDp}
          locale={locale}
          onClose={async (saved) => {
            setActiveDp(null);
            if (saved) await refresh();
          }}
          initialChoice={recorded.get(activeDp.id)?.choice}
          initialRationale={recorded.get(activeDp.id)?.rationale ?? undefined}
        />
      )}
    </>
  );
}
