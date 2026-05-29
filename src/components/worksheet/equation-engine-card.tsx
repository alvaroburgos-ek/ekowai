'use client';

import type { EvalState } from '@/lib/eval/formula';

type Props = {
  equationNumber: string;
  sourceFormula: string;
  state: EvalState;
  /** Output symbol (e.g. 'A_C') + unit, for the computed-value label. */
  outputSymbol: string;
  outputUnit: string | null;
};

/**
 * Renders the engine's verdict for ONE equation. Three visual states:
 *
 *   - computed         : value + substituted inputs + (if applied) the rewrite
 *                        from-form vs to-form, so the engineer can see exactly
 *                        what was substituted in.
 *   - manual_required  : prominent "rechnerisch nicht bestätigt — manuell
 *                        prüfen" banner with the reason and any missing
 *                        symbols / unit conflicts. NEVER shows a number.
 *   - error            : same prominent treatment, with the mathjs error.
 */
export function EquationEngineCard({
  equationNumber,
  sourceFormula,
  state,
  outputSymbol,
  outputUnit,
}: Props) {
  const isComputed = state.kind === 'computed';
  const isManual = state.kind === 'manual_required';
  const isError = state.kind === 'error';

  return (
    <section
      data-testid={`engine-card-gl-${equationNumber}`}
      data-engine-state={state.kind}
      className={`rounded border p-4 space-y-3 text-sm ${
        isComputed
          ? 'border-success/30 bg-success/5'
          : 'border-error/40 bg-error/5'
      }`}
    >
      <header className="flex items-baseline gap-3 flex-wrap">
        <span className="text-[11px] uppercase tracking-[0.2em] text-subtext shrink-0">
          Gl. {equationNumber} · Engine
        </span>
        {isComputed && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-success">
            rechnerisch bestätigt
          </span>
        )}
        {(isManual || isError) && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-error font-semibold">
            rechnerisch nicht bestätigt — manuell prüfen
          </span>
        )}
      </header>

      <div className="text-[11px] uppercase tracking-[0.18em] text-subtext">Quelle (DB)</div>
      <code className="block font-mono text-xs text-ink break-all">{sourceFormula}</code>

      {isComputed && state.rewrite && (
        <>
          <div className="text-[11px] uppercase tracking-[0.18em] text-subtext">Engine-Substitution</div>
          <code className="block font-mono text-xs text-ink break-all">
            → {state.formulaEvaluated}
          </code>
          <p className="text-xs text-subtext">{state.rewrite.reason}</p>
        </>
      )}

      {isComputed && (
        <>
          <div className="text-[11px] uppercase tracking-[0.18em] text-subtext">Eingaben</div>
          <ul className="text-xs font-mono space-y-0.5">
            {Object.entries(state.substituted).map(([sym, v]) => (
              <li key={sym} className="text-ink">
                {sym} = {formatNumber(v)}
              </li>
            ))}
          </ul>
          <div className="text-[11px] uppercase tracking-[0.18em] text-subtext pt-1">Ergebnis</div>
          <div className="text-lg font-semibold text-ink font-mono">
            {outputSymbol} = {formatNumber(state.value)}
            {outputUnit ? ` ${outputUnit}` : ''}
          </div>
        </>
      )}

      {isManual && (
        <div className="space-y-1">
          <p className="text-sm text-error font-medium">{state.reason}</p>
          {state.missing && state.missing.length > 0 && (
            <p className="text-xs text-subtext">Fehlende Symbole: {state.missing.join(', ')}</p>
          )}
          {state.unitConflicts && state.unitConflicts.length > 0 && (
            <ul className="text-xs text-subtext">
              {state.unitConflicts.map((u) => (
                <li key={u.symbol}>
                  {u.symbol}: erwartet <span className="font-mono">{u.expected}</span>, geliefert{' '}
                  <span className="font-mono">{u.actual}</span>
                </li>
              ))}
            </ul>
          )}
          {state.rewrite && (
            <p className="text-xs text-subtext italic">
              Engine-Substitution wäre: <code className="font-mono">{state.rewrite.to}</code> — aber Eingaben fehlen.
            </p>
          )}
        </div>
      )}

      {isError && (
        <p className="text-sm text-error font-medium">Fehler: {state.message}</p>
      )}
    </section>
  );
}

function formatNumber(v: number): string {
  if (Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01)) {
    return v.toPrecision(6);
  }
  // German locale for engineer-facing decimals
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(v);
}
