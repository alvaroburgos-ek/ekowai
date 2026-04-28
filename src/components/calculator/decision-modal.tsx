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
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-paper border border-ink relative">
        {/* Engineering corner ticks */}
        <span aria-hidden className="absolute -top-px -left-px w-4 h-px bg-ink" />
        <span aria-hidden className="absolute -top-px -left-px h-4 w-px bg-ink" />
        <span aria-hidden className="absolute -top-px -right-px w-4 h-px bg-ink" />
        <span aria-hidden className="absolute -top-px -right-px h-4 w-px bg-ink" />
        <span aria-hidden className="absolute -bottom-px -left-px w-4 h-px bg-ink" />
        <span aria-hidden className="absolute -bottom-px -left-px h-4 w-px bg-ink" />
        <span aria-hidden className="absolute -bottom-px -right-px w-4 h-px bg-ink" />
        <span aria-hidden className="absolute -bottom-px -right-px h-4 w-px bg-ink" />

        <header className="border-b border-hairline px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-subtext mb-1.5">
            Entscheidungspunkt · {dp.id}
          </div>
          <h2 className="text-xl font-semibold text-ink tracking-tight">{label}</h2>
          <p className="mt-2 text-sm text-ink-2 leading-relaxed">{prompt}</p>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-subtext">
            {dp.citation}
          </div>
        </header>

        <fieldset className="px-6 py-5 space-y-1">
          <legend className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtext mb-3">
            Optionen
          </legend>
          <div className="divide-y divide-hairline border-y border-hairline">
            {dp.options.map((o) => {
              const checked = choice === o.value;
              return (
                <label
                  key={o.value}
                  className={`flex items-start gap-3 px-2 py-3 cursor-pointer transition-colors ${
                    checked ? 'bg-accent-soft/40' : 'hover:bg-paper-2/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="choice"
                    value={o.value}
                    checked={checked}
                    onChange={() => setChoice(o.value)}
                    className="mt-1 accent-accent-2"
                  />
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-subtext mb-0.5">
                      Variante {o.value}
                    </div>
                    <span className="text-sm text-ink leading-snug">
                      {locale === 'de' ? o.labelDe : o.labelEn}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="px-6 pb-5 space-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-subtext block">
            {t('rationale')}
          </span>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={3}
            className="block w-full rounded-none border-0 border-l-2 border-hairline focus:border-accent bg-paper-2/30 p-3 text-sm text-ink focus:outline-none focus:ring-0 font-body resize-none"
          />
        </div>

        {error && (
          <p className="px-6 pb-3 font-mono text-[11px] text-error">⚠ {error}</p>
        )}

        <footer className="border-t border-hairline px-6 py-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onClose(false)} disabled={pending}>
            {t('cancel')}
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? t('saving') : t('save')}
          </Button>
        </footer>
      </div>
    </div>
  );
}
