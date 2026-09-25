'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { evaluateTab3, COLUMN_HEADS, UMSETZBARKEIT, TAB3_CRITERIA, type Col } from '@/lib/eval/feasibility-table';

export type Tab3FieldMeta = {
  id: string;
  dataType: string;
  /** worksheet the field belongs to when it is inherited here (read-only in the table) */
  inheritedFrom?: string;
};

type Props = {
  /** symbol → field meta for the seven Tab. 3 inputs (own or inherited on A138-02) */
  fieldsBySymbol: Record<string, Tab3FieldMeta | undefined>;
  /** feasibility_determination field id (own to A138-02) */
  determinationFieldId: string | undefined;
  readOnly: boolean;
  locale: string;
  projectId: string;
  standardCode: string;
};

const COL_CLS: Record<Col, string> = { 2: 'bg-success/15 text-success', 3: 'bg-warning/20 text-warning', 4: 'bg-error/15 text-error' };
const DET_LABEL: Record<string, string> = { feasible: 'Umsetzbar', conditional: 'Bedingt umsetzbar', not_feasible: 'Nicht umsetzbar' };

/** enum token a click on (row, column) writes — only for the enum-driven rows */
const CLICK_TOKEN: Record<string, Partial<Record<Col, string>>> = {
  altlasten: { 2: 'none', 3: 'nearby', 4: 'present' },
  geotech: { 2: 'none', 3: 'nearby', 4: 'at_site' },
  abstand: { 2: 'met', 3: 'not_met_protection_possible', 4: 'not_met_no_protection' },
  hang: { 2: 'none', 3: 'unlikely', 4: 'probable' },
};

const fmtNum = (v: unknown, unit: string) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  if (Math.abs(v) < 1e-2 && v !== 0) return `${v.toExponential(1).replace('e-', ' · 10⁻').replace('.', ',')} ${unit}`;
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(v)} ${unit}`;
};

/**
 * Tab. 3 (DWA-A 138-1, §5.1.1) as the guideline prints it — seven criteria ×
 * three columns with checkboxes, verbatim — and AS THE INPUT: a click on a
 * cell of an enum-driven row writes that answer (autosave); the number-driven
 * rows (MHGW distance, k_f) show the measured value and its column; the
 * protection zone is read-only here (owned by A138-01). The printed
 * "Umsetzbarkeit" rule gives the overall column, which the engineer adopts
 * into feasibility_determination with one click — column-4 cells that are
 * risk judgements are never auto-selected.
 */
export function FeasibilityTablePanel({ fieldsBySymbol, determinationFieldId, readOnly, locale, projectId, standardCode }: Props) {
  const values = useWorksheetStore((s) => s.values);
  const setField = useWorksheetStore((s) => s.setField);

  const bySymbol = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const [sym, meta] of Object.entries(fieldsBySymbol)) {
      if (!meta) continue;
      const v = values[meta.id];
      out[sym] = v && 'value' in v ? v.value : undefined;
    }
    return out;
  }, [values, fieldsBySymbol]);
  const r = useMemo(() => evaluateTab3(bySymbol), [bySymbol]);

  const detVal = determinationFieldId ? values[determinationFieldId] : undefined;
  const determination = detVal?.type === 'enum' ? detVal.value : null;
  const detCol: Col | null = determination === 'feasible' ? 2 : determination === 'conditional' ? 3 : determination === 'not_feasible' ? 4 : null;
  const mismatch = r.overall != null && detCol != null && r.overall !== detCol;

  const click = (key: string, col: Col) => {
    if (readOnly) return;
    const def = TAB3_CRITERIA.find((c) => c.key === key)!;
    const sym = def.symbols[0];
    const meta = fieldsBySymbol[sym];
    const token = CLICK_TOKEN[key]?.[col];
    if (!meta || meta.inheritedFrom || !token) return;
    setField(meta.id, { type: 'enum', value: token });
  };
  const adopt = () => {
    if (readOnly || !determinationFieldId || !r.suggestedDetermination) return;
    setField(determinationFieldId, { type: 'enum', value: r.suggestedDetermination });
  };

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
      <p className="text-[11px] text-subtext">Kästchen anklicken = Antwort setzen (wird gespeichert). Zeilen mit Messwert (MHGW-Abstand, k_f) und die Schutzzone (aus A138-01) werden aus den Feldern gelesen.</p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
            <tr>
              <th className="text-left font-normal pb-1 pr-2 w-6">1</th>
              {([2, 3, 4] as Col[]).map((c) => <th key={c} className="text-left font-normal pb-1 pr-2 w-[31%]">{c} · {COLUMN_HEADS[c]}</th>)}
            </tr>
          </thead>
          <tbody>
            {r.rows.map(({ def, col }, i) => {
              const sym = def.symbols[0];
              const meta = fieldsBySymbol[sym];
              const clickable = !readOnly && !!meta && !meta.inheritedFrom && !!CLICK_TOKEN[def.key];
              const numeric = def.key === 'mhgw' || def.key === 'kf';
              const numText = numeric ? fmtNum(bySymbol[sym], def.key === 'mhgw' ? 'm' : 'm/s') : null;
              return (
                <tr key={def.key} className="border-t border-hairline/60 align-top" data-testid={`tab3-row-${def.key}`}>
                  <td className="py-1 pr-2 text-subtext">
                    {i + 1}
                    {numeric && <div className="mt-0.5 text-[10px] whitespace-nowrap text-ink" data-testid={`tab3-num-${def.key}`}>{numText ?? '— (Feld leer)'}</div>}
                    {meta?.inheritedFrom && (
                      <div className="mt-0.5 text-[10px] whitespace-nowrap">
                        <Link href={`/${locale}/projects/${projectId}/standards/${standardCode}/worksheets/${meta.inheritedFrom}`} className="text-accent underline-offset-2 hover:underline">← {meta.inheritedFrom}</Link>
                      </div>
                    )}
                  </td>
                  {([2, 3, 4] as Col[]).map((c) => {
                    const text = def.cells[c];
                    const active = col === c;
                    const canClick = clickable && !!text && !!CLICK_TOKEN[def.key]?.[c];
                    const inner = text ? <span>{active ? '☑ ' : '☐ '}{text}</span> : <span className="text-subtext">—</span>;
                    return (
                      <td key={c} className={`py-1 pr-2 ${active ? `rounded ${COL_CLS[c]} font-medium` : text ? 'text-ink' : 'text-subtext'}`}>
                        {canClick ? (
                          <button type="button" onClick={() => click(def.key, c)} className="text-left hover:underline underline-offset-2" data-testid={`tab3-cell-${def.key}-${c}`} aria-pressed={active}>
                            {inner}
                          </button>
                        ) : inner}
                        {c === 4 && def.col4IsJudgement && col === 3 && (
                          <div className="mt-1 text-[10px] text-subtext">Einzelfall: ob dieses Kriterium zutrifft, ist eine Einschätzung des Fachplaners — kein Feld entscheidet sie.</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="border-t border-hairline align-top">
              <td className="py-1 pr-2 text-[10px] uppercase tracking-[0.12em] text-subtext">Umsetzbarkeit</td>
              {([2, 3, 4] as Col[]).map((c) => (
                <td key={c} className={`py-1 pr-2 text-[11px] ${r.overall === c ? `rounded ${COL_CLS[c]}` : 'text-subtext'}`}>{UMSETZBARKEIT[c]}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs" data-testid="feasibility-table-hint">
        {r.overall == null ? (
          <span className="text-subtext">Alle sieben Kriterien beantworten (A138-01/02), dann zeigt die Tabelle die maßgebende Spalte.</span>
        ) : mismatch ? (
          <>
            <span className="text-warning">Die Tabelle ergibt Spalte {r.overall} ({DET_LABEL[r.suggestedDetermination!]}); die Umsetzbarkeitsbestimmung steht auf „{DET_LABEL[determination!] ?? determination}“ — Abweichung begründen oder anpassen.</span>
            {!readOnly && determinationFieldId && <button type="button" onClick={adopt} className="px-2 py-1 rounded border border-hairline-strong hover:bg-paper-2 text-ink" data-testid="tab3-adopt">Übernehmen: {DET_LABEL[r.suggestedDetermination!]}</button>}
          </>
        ) : detCol == null ? (
          <>
            <span className="text-ink">Vorschlag für die Umsetzbarkeitsbestimmung: <b>{DET_LABEL[r.suggestedDetermination!]}</b> (Spalte {r.overall}).{r.judgementRows.length ? ' Spalte-4-Einschätzung für: ' + r.judgementRows.join(', ') + '.' : ''}</span>
            {!readOnly && determinationFieldId && <button type="button" onClick={adopt} className="px-2 py-1 rounded border border-hairline-strong hover:bg-paper-2 text-ink" data-testid="tab3-adopt">Übernehmen: {DET_LABEL[r.suggestedDetermination!]}</button>}
          </>
        ) : (
          <span className="text-subtext">Umsetzbarkeitsbestimmung „{DET_LABEL[determination!]}“ entspricht Spalte {r.overall}.</span>
        )}
      </div>
    </section>
  );
}
