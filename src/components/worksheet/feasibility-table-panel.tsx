'use client';

import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { evaluateTab3, COLUMN_HEADS, UMSETZBARKEIT, type Col } from '@/lib/eval/feasibility-table';

type Props = {
  /** symbol → field id for the seven Tab. 3 inputs (own or inherited on A138-02) */
  fieldIdBySymbol: Record<string, string | undefined>;
  /** current value of feasibility_determination (prod enum token) */
  determination: string | null;
};

const COL_CLS: Record<Col, string> = { 2: 'bg-success/15 text-success', 3: 'bg-warning/20 text-warning', 4: 'bg-error/15 text-error' };
const DET_LABEL: Record<string, string> = { feasible: 'Umsetzbar', conditional: 'Bedingt umsetzbar', not_feasible: 'Nicht umsetzbar' };

/**
 * Tab. 3 (DWA-A 138-1, §5.1.1) rendered as the guideline prints it — seven
 * criteria × three columns, verbatim — with the column each current answer
 * falls into highlighted and the printed "Umsetzbarkeit" rule underneath.
 * Read-only mirror of the A138-01/02 inputs; the engineer still sets
 * feasibility_determination (column-4 cells that are risk judgements are
 * never auto-selected).
 */
export function FeasibilityTablePanel({ fieldIdBySymbol, determination }: Props) {
  const values = useWorksheetStore((s) => s.values);
  const bySymbol = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const [sym, id] of Object.entries(fieldIdBySymbol)) {
      if (!id) continue;
      const v = values[id];
      out[sym] = v && 'value' in v ? v.value : undefined;
    }
    return out;
  }, [values, fieldIdBySymbol]);
  const r = useMemo(() => evaluateTab3(bySymbol), [bySymbol]);

  const detCol: Col | null = determination === 'feasible' ? 2 : determination === 'conditional' ? 3 : determination === 'not_feasible' ? 4 : null;
  const mismatch = r.overall != null && detCol != null && r.overall !== detCol;

  return (
    <section className="border border-hairline rounded p-4 space-y-3" data-testid="feasibility-table">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">Tabelle 3 — Überprüfung der Umsetzbarkeit (§5.1.1)</h2>
        <div className="text-xs tabular-nums" data-testid="feasibility-table-overall">
          {r.overall == null
            ? <span className="text-subtext">offen: {r.unanswered.join(', ')}</span>
            : <span className={`rounded px-2 py-0.5 ${COL_CLS[r.overall]}`}>Spalte {r.overall} · {COLUMN_HEADS[r.overall]}</span>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
            <tr>
              <th className="text-left font-normal pb-1 pr-2 w-6">1</th>
              {([2, 3, 4] as Col[]).map((c) => <th key={c} className="text-left font-normal pb-1 pr-2 w-[31%]">{c} · {COLUMN_HEADS[c]}</th>)}
            </tr>
          </thead>
          <tbody>
            {r.rows.map(({ def, col }, i) => (
              <tr key={def.key} className="border-t border-hairline/60 align-top" data-testid={`tab3-row-${def.key}`}>
                <td className="py-1 pr-2 text-subtext">{i + 1}</td>
                {([2, 3, 4] as Col[]).map((c) => {
                  const text = def.cells[c];
                  const active = col === c;
                  return (
                    <td key={c} className={`py-1 pr-2 ${active ? `rounded ${COL_CLS[c]} font-medium` : text ? 'text-ink' : 'text-subtext'}`}>
                      {text ? <span>{active ? '☑ ' : '☐ '}{text}</span> : <span className="text-subtext">—</span>}
                      {c === 4 && def.col4IsJudgement && col === 3 && (
                        <div className="mt-1 text-[10px] text-subtext">Einzelfall: ob dieses Kriterium zutrifft, ist eine Einschätzung des Fachplaners — kein Feld entscheidet sie.</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-hairline align-top">
              <td className="py-1 pr-2 text-[10px] uppercase tracking-[0.12em] text-subtext">Umsetzbarkeit</td>
              {([2, 3, 4] as Col[]).map((c) => (
                <td key={c} className={`py-1 pr-2 text-[11px] ${r.overall === c ? `rounded ${COL_CLS[c]}` : 'text-subtext'}`}>{UMSETZBARKEIT[c]}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs" data-testid="feasibility-table-hint">
        {r.overall == null
          ? <span className="text-subtext">Alle sieben Kriterien beantworten (A138-01/02), dann zeigt die Tabelle die maßgebende Spalte.</span>
          : mismatch
            ? <span className="text-warning">Die Tabelle ergibt Spalte {r.overall} ({DET_LABEL[r.suggestedDetermination!]}); die Umsetzbarkeitsbestimmung steht auf „{DET_LABEL[determination!] ?? determination}“ — Abweichung begründen oder anpassen.</span>
            : detCol == null
              ? <span className="text-ink">Vorschlag für die Umsetzbarkeitsbestimmung: <b>{DET_LABEL[r.suggestedDetermination!]}</b> (Spalte {r.overall}).{r.judgementRows.length ? ' Spalte-4-Einschätzung für: ' + r.judgementRows.join(', ') + '.' : ''}</span>
              : <span className="text-subtext">Umsetzbarkeitsbestimmung „{DET_LABEL[determination!]}“ entspricht Spalte {r.overall}.</span>}
      </p>
    </section>
  );
}
