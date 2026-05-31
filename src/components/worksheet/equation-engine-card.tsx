'use client';

import { useState } from 'react';
import type { EvalState } from '@/lib/eval/formula';

type Props = {
  equationNumber: string;
  sourceFormula: string;
  state: EvalState;
  /** Output symbol (e.g. 'A_C') + unit, for the computed-value label. */
  outputSymbol: string;
  outputUnit: string | null;
  /** Optional per-symbol expected units (for the inputs drill-down). When
   * present the drill-down surfaces the unit next to each substituted
   * value. */
  unitBySymbol?: Record<string, string | null>;
  /** Optional symbol → upstream worksheet code when the value came from
   * cross-worksheet inheritance. Lets the drill-down show provenance without
   * walking the DOM. */
  inheritedFromBySymbol?: Record<string, string>;
};

/**
 * Renders the engine's verdict for ONE equation. Three visual states:
 *
 *   - computed         : value + an expandable "Rechnung anzeigen" drill-down
 *                        showing the substituted formula and a per-symbol
 *                        inputs table (value, unit, origin). The verdict and
 *                        a brief inputs-list are always visible above the
 *                        drill-down — the engineer never has to expand to
 *                        see the number.
 *   - manual_required  : prominent "rechnerisch nicht bestätigt — manuell
 *                        prüfen" banner with the reason; missing symbols and
 *                        unit conflicts also render as clickable chips that
 *                        scroll the user to the offending field. NEVER shows
 *                        a computed number.
 *   - error            : same prominent treatment, with the mathjs error.
 */
export function EquationEngineCard({
  equationNumber,
  sourceFormula,
  state,
  outputSymbol,
  outputUnit,
  unitBySymbol,
  inheritedFromBySymbol,
}: Props) {
  const isComputed = state.kind === 'computed';
  const isManual = state.kind === 'manual_required';
  const isError = state.kind === 'error';
  const [showBreakdown, setShowBreakdown] = useState(false);
  const showOriginColumn = inheritedFromBySymbol !== undefined;

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

          {/* Drill-down: substituted formula + per-input table. Collapsed by
              default and rendered only when expanded — keeps the verdict +
              brief inputs list as the only "Σ befestigt"-style strings in
              the DOM until the engineer asks for the breakdown. */}
          <div
            data-testid={`engine-card-gl-${equationNumber}-breakdown`}
            className="mt-2 border-t border-success/20 pt-2"
          >
            <button
              type="button"
              onClick={() => setShowBreakdown((v) => !v)}
              aria-expanded={showBreakdown}
              aria-controls={`engine-card-gl-${equationNumber}-breakdown-body`}
              className="text-left cursor-pointer select-none text-[11px] uppercase tracking-[0.18em] text-subtext hover:text-ink transition-colors"
            >
              {showBreakdown ? 'Rechnung verbergen' : 'Rechnung anzeigen'}
            </button>
            {showBreakdown && (
              <div
                id={`engine-card-gl-${equationNumber}-breakdown-body`}
                className="pt-2 space-y-2"
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-subtext">
                  Eingesetzte Formel
                </div>
                <code
                  className="block font-mono text-xs text-ink break-all"
                  data-testid={`engine-card-gl-${equationNumber}-substituted-formula`}
                >
                  {substituteFormula(state.formulaEvaluated, state.substituted)}
                </code>

                <div className="text-[11px] uppercase tracking-[0.18em] text-subtext pt-1">
                  Eingaben im Detail
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-subtext">
                      <th className="font-normal py-1 pr-3">Symbol</th>
                      <th className="font-normal py-1 pr-3 text-right">Wert</th>
                      <th className="font-normal py-1 pr-3">Einheit</th>
                      {showOriginColumn && (
                        <th className="font-normal py-1">Herkunft</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(state.substituted).map(([sym, v]) => {
                      const unit = unitBySymbol?.[sym] ?? null;
                      const origin = inheritedFromBySymbol?.[sym];
                      return (
                        <tr
                          key={sym}
                          className="border-t border-success/10"
                          data-testid={`engine-card-gl-${equationNumber}-input-${sym}`}
                        >
                          <td className="py-1 pr-3">
                            <SymbolButton symbol={sym} />
                          </td>
                          <td className="py-1 pr-3 text-right font-mono tabular-nums text-ink">
                            {formatNumber(v)}
                          </td>
                          <td className="py-1 pr-3 font-mono text-ink-2">
                            {unit ?? '—'}
                          </td>
                          {showOriginColumn && (
                            <td className="py-1 font-mono text-ink-2">
                              {origin ?? '—'}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {isManual && (
        <div className="space-y-2">
          <p className="text-sm text-error font-medium">{state.reason}</p>
          {state.missing && state.missing.length > 0 && (
            <div
              className="flex items-center gap-1.5 flex-wrap text-xs"
              data-testid={`engine-card-gl-${equationNumber}-missing`}
            >
              <span className="text-subtext">Fehlt:</span>
              {state.missing.map((sym) => (
                <SymbolChip
                  key={sym}
                  symbol={sym}
                  tone="error"
                  label={sym}
                  ariaLabel={`Zu Feld ${sym} springen`}
                />
              ))}
            </div>
          )}
          {state.unitConflicts && state.unitConflicts.length > 0 && (
            <>
              <ul className="text-xs text-subtext space-y-0.5">
                {state.unitConflicts.map((u) => (
                  <li key={u.symbol}>
                    {u.symbol}: erwartet <span className="font-mono">{u.expected}</span>, geliefert{' '}
                    <span className="font-mono">{u.actual}</span>
                  </li>
                ))}
              </ul>
              <div
                className="flex items-center gap-1.5 flex-wrap text-xs"
                data-testid={`engine-card-gl-${equationNumber}-unit-conflicts`}
              >
                <span className="text-subtext">Einheit:</span>
                {state.unitConflicts.map((u) => (
                  <SymbolChip
                    key={u.symbol}
                    symbol={u.symbol}
                    tone="error"
                    label={`${u.symbol} in ${u.actual}, erwartet ${u.expected}`}
                    ariaLabel={`Zu Feld ${u.symbol} springen — Einheitenkonflikt`}
                  />
                ))}
              </div>
            </>
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
  // German locale for engineer-facing decimals. Kept at 4 fractional digits
  // to match the verdict format that several integration tests assert on.
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(v);
}

/**
 * Wider-precision formatter for the substituted-formula drill-down. Up to
 * 6 significant digits — per the spec for "Rechnung anzeigen". Lives
 * separately from `formatNumber` so the verdict / inputs list keep their
 * narrower 4-fraction-digit format that existing tests pin on.
 */
function formatNumberWide(v: number): string {
  if (Math.abs(v) >= 1000 || (v !== 0 && Math.abs(v) < 0.01)) {
    return v.toPrecision(6);
  }
  return new Intl.NumberFormat('de-DE', { maximumSignificantDigits: 6 }).format(v);
}

/**
 * Render a substituted form of the formula: each symbol token replaced by
 * its numeric value. Operates on the already-normalised RHS string the
 * engine returns in `formulaEvaluated`. Longest symbol first so e.g.
 * `A_C_b` is not partially overwritten by `A_C`.
 */
function substituteFormula(
  formula: string,
  substituted: Record<string, number>,
): string {
  const symbols = Object.keys(substituted).sort((a, b) => b.length - a.length);
  let out = formula;
  for (const sym of symbols) {
    const escaped = sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Word-boundary-style replacement using lookarounds. We can't rely on
    // \b because identifier chars include underscore — use a manual
    // negative lookbehind/lookahead for [A-Za-z0-9_].
    const re = new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, 'g');
    out = out.replace(re, formatNumberWide(substituted[sym]));
  }
  return out;
}

function scrollToFieldBySymbol(symbol: string) {
  if (typeof document === 'undefined') return;
  const target = document.querySelector(
    `[data-symbol="${cssEscape(symbol)}"]`,
  );
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  // Add a transient marker so the engineer can see WHICH field was scrolled
  // to even when the scroll itself is a no-op (e.g. already in view).
  if (target instanceof HTMLElement) {
    target.setAttribute('data-symbol-flash', '1');
    setTimeout(() => target.removeAttribute('data-symbol-flash'), 1200);
  }
}

function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(s);
  }
  return s.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function SymbolButton({ symbol }: { symbol: string }) {
  return (
    <button
      type="button"
      onClick={() => scrollToFieldBySymbol(symbol)}
      className="font-mono text-ink hover:text-accent underline-offset-2 hover:underline transition-colors"
      aria-label={`Zu Feld ${symbol} springen`}
    >
      {symbol}
    </button>
  );
}

function SymbolChip({
  symbol,
  label,
  ariaLabel,
  tone,
}: {
  symbol: string;
  label: string;
  ariaLabel: string;
  tone: 'error';
}) {
  return (
    <button
      type="button"
      onClick={() => scrollToFieldBySymbol(symbol)}
      aria-label={ariaLabel}
      data-symbol-chip={symbol}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-mono transition-colors ${
        tone === 'error'
          ? 'border-error/40 bg-error/10 text-error hover:bg-error/20'
          : 'border-hairline-strong bg-paper-2 text-ink hover:bg-paper-2/80'
      }`}
    >
      {label}
    </button>
  );
}
