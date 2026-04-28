'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useCalculatorStore } from '@/lib/state/calculator-store';
import { captureDecision } from '@/lib/actions/decision';
import type { DecisionPoint } from '@/lib/engine';
import { Button } from '@/components/ui/button';

export function DecisionModal({
  dp,
  locale,
  onClose,
  initialChoice,
  initialRationale,
}: {
  dp: DecisionPoint;
  locale: 'de' | 'en';
  onClose(saved: boolean): void;
  initialChoice?: string;
  initialRationale?: string;
}) {
  const t = useTranslations('decisions');
  const calcId = useCalculatorStore((s) => s.calcId);
  const [choice, setChoice] = useState(initialChoice ?? '');
  const [rationale, setRationale] = useState(initialRationale ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startSave] = useTransition();

  const label = locale === 'de' ? dp.labelDe : dp.labelEn;
  const prompt = locale === 'de' ? dp.promptDe : dp.promptEn;

  function save() {
    if (!calcId || !choice) {
      setError(t('chooseRequired'));
      return;
    }
    startSave(async () => {
      const r = await captureDecision({
        calcId,
        decisionPointId: dp.id,
        choice,
        rationale: rationale || undefined,
      });
      if (r.ok) onClose(true);
      else setError(r.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
          <p className="text-sm text-slate-600">
            {prompt} <span className="text-xs text-slate-500 ml-1">{dp.citation}</span>
          </p>
        </div>
        <fieldset className="space-y-2">
          {dp.options.map((o) => (
            <label key={o.value} className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="choice"
                value={o.value}
                checked={choice === o.value}
                onChange={() => setChoice(o.value)}
                className="mt-1"
              />
              <span>{locale === 'de' ? o.labelDe : o.labelEn}</span>
            </label>
          ))}
        </fieldset>
        <label className="block">
          <span className="text-sm text-slate-700">{t('rationale')}</span>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700"
          />
        </label>
        {error && <p className="text-xs text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onClose(false)} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? t('saving') : t('save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
