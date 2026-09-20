'use client';

import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { GUIDELINE_TABLES, matchingRows, type GuidelineTable } from '@/lib/eval/guideline-tables';

type FieldMeta = { id: string; dataType: string; inheritedFrom?: string };

type Props = {
  tableCode: string;
  /** symbol → field meta for every symbol the table reads or writes */
  fieldsBySymbol: Record<string, FieldMeta | undefined>;
  readOnly: boolean;
  /** extra values the matcher may read (e.g. ac_band derived from A_C) */
  extraValues?: Record<string, unknown>;
};

/**
 * A guideline table rendered as printed, the row matching the stored values
 * highlighted, and a click on a row writing the printed value(s) into the
 * existing fields (autosave). Nothing computed, nothing invented: the cells
 * are the transcript's text with line refs.
 */
export function GuidelineTablePanel({ tableCode, fieldsBySymbol, readOnly, extraValues }: Props) {
  const table: GuidelineTable | undefined = GUIDELINE_TABLES[tableCode];
  const values = useWorksheetStore((s) => s.values);
  const setField = useWorksheetStore((s) => s.setField);

  const bySymbol = useMemo(() => {
    const out: Record<string, unknown> = { ...(extraValues ?? {}) };
    for (const [sym, meta] of Object.entries(fieldsBySymbol)) {
      if (!meta) continue;
      const v = values[meta.id];
      out[sym] = v && 'value' in v ? v.value : undefined;
    }
    return out;
  }, [values, fieldsBySymbol, extraValues]);

  if (!table) return null;
  const matched = new Set(matchingRows(table, bySymbol));
  const displayOnly = table.targets.length === 0;
  const writable = !displayOnly && table.targets.every((t) => fieldsBySymbol[t] && !fieldsBySymbol[t]!.inheritedFrom);
  const canClick = !readOnly && writable;
  const matchedNotes = table.rows.filter((r) => matched.has(r.key) && r.note).map((r) => r.note!);

  const pick = (rowKey: string) => {
    if (!canClick) return;
    const row = table.rows.find((r) => r.key === rowKey);
    if (!row) return;
    for (const [sym, val] of Object.entries(row.writes)) {
      const meta = fieldsBySymbol[sym];
      if (!meta) continue;
      if (typeof val === 'number') setField(meta.id, { type: 'number', value: val });
      else setField(meta.id, { type: meta.dataType === 'enum' ? 'enum' : 'text', value: val });
    }
  };

  const wide = table.rows[0]?.cells.length > 5;

  return (
    <section className="border border-hairline rounded p-4 space-y-3" data-testid={`guideline-table-${table.code}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">{table.titleDe}</h2>
        <span className="text-[10px] text-subtext">{table.clause}</span>
      </div>
      <p className="text-[11px] text-subtext">
        {displayOnly ? 'Nur Anzeige — die Zeile folgt aus der gewählten Flächengruppe.' : canClick ? `Zeile anklicken = Wert übernehmen (schreibt ${table.targets.join(', ')}, wird gespeichert).` : writable ? 'Schreibgeschützt.' : `Zielfeld ${table.targets.join(', ')} liegt auf einem anderen Arbeitsblatt — nur Anzeige.`}
        {' '}Markiert ist die Zeile, die zum gespeicherten Wert passt.
      </p>

      {wide ? (
        // wide tables (Tab. 14): one card per row so the printed lines stay readable
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {table.rows.map((r) => {
            const on = matched.has(r.key);
            return (
              <button
                key={r.key} type="button" disabled={!canClick} onClick={() => pick(r.key)} aria-pressed={on}
                data-testid={`gt-row-${table.code}-${r.key}`}
                className={`text-left rounded border p-2 text-xs ${on ? 'border-accent bg-accent/10' : 'border-hairline hover:bg-paper-2'} disabled:cursor-default`}
              >
                <div className="font-medium text-ink">{on ? '☑ ' : '☐ '}{r.cells[0]} <span className="text-subtext font-normal">· {r.cells[1]}</span></div>
                <ul className="mt-1 space-y-0.5 text-[11px] text-ink/85">
                  {r.cells.slice(2).map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" data-testid={`gt-table-${table.code}`}>
            <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
              <tr>{table.heads.map((h) => <th key={h} className="text-left font-normal pb-1 pr-2 align-bottom">{h}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((r) => {
                const on = matched.has(r.key);
                return (
                  <tr key={r.key} className={`border-t border-hairline/60 align-top ${on ? 'bg-accent/10 font-medium' : ''} ${canClick ? 'cursor-pointer hover:bg-paper-2' : ''}`}
                      onClick={() => pick(r.key)} data-testid={`gt-row-${table.code}-${r.key}`} aria-selected={on}>
                    {r.cells.map((c, i) => (
                      <td key={i} className="py-1 pr-2">{i === 0 ? (on ? '☑ ' : '☐ ') : ''}{c}{i === 0 && r.note && !displayOnly ? <div className="text-[10px] text-subtext font-normal">{r.note}</div> : null}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {matchedNotes.length > 0 && (
        <div className="rounded border border-hairline bg-paper-2/40 p-2 text-xs text-ink" data-testid={`gt-reading-${table.code}`}>
          <div className="text-[10px] uppercase tracking-[0.18em] text-subtext">Bedeutung für die gewählte Zeile</div>
          {matchedNotes.map((n, i) => <p key={i} className="leading-snug">{n}</p>)}
        </div>
      )}
      <ul className="text-[11px] text-subtext list-disc pl-4 space-y-0.5">
        {table.notesDe.map((n) => <li key={n}>{n}</li>)}
      </ul>
    </section>
  );
}
