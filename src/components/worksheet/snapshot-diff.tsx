'use client';

/**
 * Renderer for a SnapshotDiff (parameters / equation outputs / compliance).
 *
 * Layout:
 *   - Summary banner at the top — "N Parameter geändert, davon M mit
 *     Auswirkung auf Outputs: V_VA +18%, …"
 *   - Three sections, each with a side-by-side from/to grid.
 *   - "Unverändert anzeigen" toggle hides rows whose `changed=false`
 *     (parameters) or `changeType='unchanged'` (equations).
 *
 * Pure render — receives the already-computed SnapshotDiff plus the
 * label/symbol metadata it needs from the server-side caller. No DB access.
 */
import { useState } from 'react';
import type { SnapshotDiff } from '@/lib/snapshots/diff';
import {
  formatParameterValue,
  formatEquationVerdict,
} from '@/lib/snapshots/diff';

export type FieldMeta = {
  id: string;
  symbol: string;
  labelDe: string;
  labelEn: string | null;
};

export type EquationMeta = {
  equationNumber: string;
  outputSymbol: string | null;
  clauseReference: string | null;
};

export type RequirementMeta = {
  id: string;
  code: string;
  titleDe: string;
  titleEn: string | null;
};

type Props = {
  diff: SnapshotDiff;
  locale: 'de' | 'en';
  fields: FieldMeta[];
  equations: EquationMeta[];
  requirements: RequirementMeta[];
  /** Friendly label for the "from" version — e.g. "Genehmigt am 12.05.2026". */
  fromLabel: string;
  /** Friendly label for the "to" version — e.g. "Eingereicht am 28.05.2026". */
  toLabel: string;
};

const VERDICT_LABEL: Record<'pass' | 'fail' | 'open', string> = {
  pass: 'erfüllt',
  fail: 'nicht erfüllt',
  open: 'offen',
};

const VERDICT_CLS: Record<'pass' | 'fail' | 'open', string> = {
  pass: 'bg-success/10 text-success',
  fail: 'bg-error/10 text-error',
  open: 'bg-paper-2 text-subtext',
};

export function SnapshotDiffView({
  diff,
  locale,
  fields,
  equations,
  requirements,
  fromLabel,
  toLabel,
}: Props) {
  const [showUnchanged, setShowUnchanged] = useState(false);

  const fieldById = new Map(fields.map((f) => [f.id, f]));
  const equationByNumber = new Map(equations.map((e) => [e.equationNumber, e]));
  const reqById = new Map(requirements.map((r) => [r.id, r]));

  const pickLabel = (de: string, en: string | null): string =>
    locale === 'en' ? en ?? de : de;

  // For the summary banner: build the list of changed equation outputs with
  // a percent-delta if both sides are computed.
  const affectedOutputs = diff.equations
    .filter((e) => e.changeType !== 'unchanged')
    .map((e) => {
      const meta = equationByNumber.get(e.equationNumber);
      const symbol = meta?.outputSymbol ?? `Gl. ${e.equationNumber}`;
      if (
        e.from?.kind === 'computed' &&
        e.to?.kind === 'computed' &&
        e.from.value !== 0
      ) {
        const pct = ((e.to.value - e.from.value) / e.from.value) * 100;
        const sign = pct >= 0 ? '+' : '';
        return `${symbol} ${sign}${pct.toFixed(1)}%`;
      }
      if (e.changeType === 'kind_change') {
        return `${symbol} (Verdikt geändert)`;
      }
      if (e.changeType === 'added') return `${symbol} (neu)`;
      if (e.changeType === 'removed') return `${symbol} (entfernt)`;
      return `${symbol} (geändert)`;
    });

  // Parameters: visible rows depend on the toggle.
  const visibleParameters = showUnchanged
    ? diff.parameters
    : diff.parameters.filter((p) => p.changed);
  const visibleEquations = showUnchanged
    ? diff.equations
    : diff.equations.filter((e) => e.changeType !== 'unchanged');
  const visibleCompliance = showUnchanged
    ? diff.compliance
    : diff.compliance.filter((c) => c.changed);

  return (
    <div className="space-y-10">
      {/* Summary banner */}
      <section
        className="border border-hairline-strong p-5 bg-paper-2/40 space-y-2"
        data-testid="diff-summary"
      >
        <div className="text-[10px] uppercase tracking-[0.25em] text-subtext">
          Zusammenfassung
        </div>
        <p className="text-sm text-ink">
          <strong className="font-semibold tabular-nums">
            {diff.summary.parametersChanged}
          </strong>{' '}
          Parameter geändert, davon{' '}
          <strong className="font-semibold tabular-nums">
            {diff.summary.equationOutputsAffected}
          </strong>{' '}
          mit Auswirkung auf Outputs
          {affectedOutputs.length > 0 ? (
            <>: <span className="text-subtext">{affectedOutputs.join(', ')}</span></>
          ) : (
            '.'
          )}
        </p>
        {diff.summary.complianceFlipped > 0 && (
          <p className="text-sm text-ink">
            <strong className="font-semibold tabular-nums">
              {diff.summary.complianceFlipped}
            </strong>{' '}
            Konformitätsanforderung
            {diff.summary.complianceFlipped === 1 ? '' : 'en'} mit geändertem Verdikt.
          </p>
        )}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-subtext">
            <span className="font-mono mr-2">FROM</span>
            {fromLabel}
            <span className="mx-2">→</span>
            <span className="font-mono mr-2">TO</span>
            {toLabel}
          </div>
          <label className="text-xs text-subtext flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
              className="h-3.5 w-3.5"
              data-testid="show-unchanged-toggle"
            />
            Unverändert anzeigen
          </label>
        </div>
      </section>

      {/* Parameters */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.25em] text-subtext mb-3">
          Parameter
        </h2>
        {visibleParameters.length === 0 ? (
          <p className="text-sm text-subtext italic">Keine Änderungen.</p>
        ) : (
          <table className="w-full text-sm border-collapse" data-testid="diff-parameters-table">
            <thead className="text-xs uppercase tracking-[0.18em] text-subtext">
              <tr className="border-b border-hairline">
                <th className="text-left py-2 pr-3 font-normal">Feld</th>
                <th className="text-left py-2 pr-3 font-normal">Vorher</th>
                <th className="text-left py-2 pr-3 font-normal">Nachher</th>
              </tr>
            </thead>
            <tbody>
              {visibleParameters.map((p) => {
                const f = fieldById.get(p.fieldId);
                const symbol = f?.symbol ?? p.fieldId.slice(0, 8);
                const label = f ? pickLabel(f.labelDe, f.labelEn) : '(unbekanntes Feld)';
                return (
                  <tr
                    key={p.fieldId}
                    className="border-b border-hairline/40"
                    data-changed={p.changed}
                  >
                    <td className="py-2 pr-3 align-top">
                      <div className="font-mono text-xs text-subtext">{symbol}</div>
                      <div className="text-sm text-ink">{label}</div>
                      {p.presence === 'only_from' && (
                        <div className="text-[10px] uppercase tracking-[0.18em] text-error mt-1">
                          Entfernt
                        </div>
                      )}
                      {p.presence === 'only_to' && (
                        <div className="text-[10px] uppercase tracking-[0.18em] text-accent-2 mt-1">
                          Neu
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 align-top tabular-nums">
                      <span className={p.changed ? 'text-subtext line-through' : 'text-ink'}>
                        {formatParameterValue(p.from)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 align-top tabular-nums">
                      <span className={p.changed ? 'text-ink font-medium' : 'text-ink'}>
                        {formatParameterValue(p.to)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Equation outputs */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.25em] text-subtext mb-3">
          Gleichungs-Verdikte
        </h2>
        {visibleEquations.length === 0 ? (
          <p className="text-sm text-subtext italic">Keine Änderungen.</p>
        ) : (
          <table className="w-full text-sm border-collapse" data-testid="diff-equations-table">
            <thead className="text-xs uppercase tracking-[0.18em] text-subtext">
              <tr className="border-b border-hairline">
                <th className="text-left py-2 pr-3 font-normal">Gleichung</th>
                <th className="text-left py-2 pr-3 font-normal">Vorher</th>
                <th className="text-left py-2 pr-3 font-normal">Nachher</th>
              </tr>
            </thead>
            <tbody>
              {visibleEquations.map((e) => {
                const meta = equationByNumber.get(e.equationNumber);
                const fromV = formatEquationVerdict(e.from);
                const toV = formatEquationVerdict(e.to);
                return (
                  <tr
                    key={e.equationNumber}
                    className="border-b border-hairline/40"
                    data-change-type={e.changeType}
                  >
                    <td className="py-2 pr-3 align-top">
                      <div className="font-mono text-xs text-subtext">
                        Gl. {e.equationNumber}
                      </div>
                      {meta?.outputSymbol && (
                        <div className="text-sm text-ink">
                          → <span className="font-mono">{meta.outputSymbol}</span>
                        </div>
                      )}
                      {e.changeType === 'kind_change' && (
                        <div className="text-[10px] uppercase tracking-[0.18em] text-accent mt-1">
                          Verdikt geändert
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <VerdictBadge badge={fromV.badge} />
                      <div className="text-xs text-subtext mt-1 tabular-nums">
                        {fromV.detail}
                      </div>
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <VerdictBadge badge={toV.badge} />
                      <div className="text-xs text-subtext mt-1 tabular-nums">
                        {toV.detail}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Compliance */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.25em] text-subtext mb-3">
          Konformität
        </h2>
        {visibleCompliance.length === 0 ? (
          <p className="text-sm text-subtext italic">Keine Änderungen.</p>
        ) : (
          <table className="w-full text-sm border-collapse" data-testid="diff-compliance-table">
            <thead className="text-xs uppercase tracking-[0.18em] text-subtext">
              <tr className="border-b border-hairline">
                <th className="text-left py-2 pr-3 font-normal">Anforderung</th>
                <th className="text-left py-2 pr-3 font-normal">Vorher</th>
                <th className="text-left py-2 pr-3 font-normal">Nachher</th>
              </tr>
            </thead>
            <tbody>
              {visibleCompliance.map((c) => {
                const meta = reqById.get(c.requirementId);
                return (
                  <tr key={c.requirementId} className="border-b border-hairline/40">
                    <td className="py-2 pr-3 align-top">
                      <div className="font-mono text-xs text-subtext">{meta?.code ?? '?'}</div>
                      <div className="text-sm text-ink">
                        {meta ? pickLabel(meta.titleDe, meta.titleEn) : '(unbekannte Anforderung)'}
                      </div>
                    </td>
                    <td className="py-2 pr-3 align-top">
                      {c.from ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${VERDICT_CLS[c.from]}`}>
                          {VERDICT_LABEL[c.from]}
                        </span>
                      ) : (
                        <span className="text-subtext text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 align-top">
                      {c.to ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${VERDICT_CLS[c.to]}`}>
                          {VERDICT_LABEL[c.to]}
                        </span>
                      ) : (
                        <span className="text-subtext text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function VerdictBadge({ badge }: { badge: string }) {
  const cls =
    badge === 'berechnet'
      ? 'bg-success/10 text-success'
      : badge === 'manuell prüfen'
        ? 'bg-warning/10 text-warning'
        : badge === 'Fehler'
          ? 'bg-error/10 text-error'
          : 'bg-paper-2 text-subtext';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${cls}`}>
      {badge}
    </span>
  );
}
