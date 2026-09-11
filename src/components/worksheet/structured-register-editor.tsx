'use client';

import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import {
  normalizeRegister,
  newRegisterRow,
  registerRowFilled,
  type RegisterConfig,
  type RegisterCarrier,
  type RegisterRow,
  type RegisterCell,
  type ColumnDef,
} from '@/lib/eval/selection-fields';

type Props = { fieldId: string; config: RegisterConfig; readOnly?: boolean };

const cellInput =
  'block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60';

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function StructuredRegisterEditor({ fieldId, config, readOnly = false }: Props) {
  const raw = useWorksheetStore((s) => s.values[fieldId]);
  const setField = useWorksheetStore((s) => s.setField);
  const carrier = useMemo<RegisterCarrier>(
    () => normalizeRegister(raw?.type === 'json' ? raw.value : undefined, config.columns),
    [raw, config.columns],
  );

  function write(rows: RegisterRow[]) {
    if (readOnly) return;
    setField(fieldId, { type: 'json', value: { rows } });
  }
  function addRow() {
    write([...carrier.rows, newRegisterRow(config.columns)]);
  }
  function updateCell(id: string, key: string, value: RegisterCell) {
    write(carrier.rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }
  function removeRow(id: string) {
    write(carrier.rows.filter((r) => r.id !== id));
  }

  const filled = useMemo(
    () => carrier.rows.filter((r) => registerRowFilled(r, config.columns)).length,
    [carrier.rows, config.columns],
  );
  const sum = useMemo(() => {
    if (!config.sumColumn) return null;
    let total = 0;
    for (const r of carrier.rows) {
      const v = r[config.sumColumn.key];
      if (typeof v === 'number' && Number.isFinite(v)) total += v;
    }
    return total;
  }, [carrier.rows, config.sumColumn]);

  return (
    <div className="space-y-3" data-testid="structured-register-editor">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-medium text-ink">{config.title}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">{config.subtitle}</div>
        </div>
        <button type="button" onClick={addRow} disabled={readOnly} className="text-xs px-3 py-1.5 rounded border border-hairline-strong hover:bg-paper-2 text-ink disabled:opacity-50">
          {config.addLabel}
        </button>
      </div>

      {/* datalists for text columns that carry suggestions */}
      {config.columns.filter((c) => c.datalist?.length).map((c) => (
        <datalist key={c.key} id={`reg-${slug(config.title)}-${c.key}`}>
          {c.datalist!.map((o) => <option key={o} value={o} />)}
        </datalist>
      ))}

      {carrier.rows.length === 0 ? (
        <p className="text-xs text-subtext italic">Noch keine Einträge. „{config.addLabel}“ fügt eine Zeile hinzu.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
              <tr>
                {config.columns.map((c) => (
                  <th key={c.key} className={`text-left font-normal pb-1 pr-2 ${c.width ?? ''}`}>{c.label}</th>
                ))}
                <th aria-hidden="true" className="w-8" />
              </tr>
            </thead>
            <tbody>
              {carrier.rows.map((r) => (
                <tr key={r.id} className="border-t border-hairline align-top">
                  {config.columns.map((c) => (
                    <td key={c.key} className="py-1.5 pr-2">
                      <Cell col={c} row={r} readOnly={readOnly} listId={c.datalist?.length ? `reg-${slug(config.title)}-${c.key}` : undefined}
                        onChange={(v) => updateCell(r.id, c.key, v)} />
                    </td>
                  ))}
                  <td className="py-1.5 pl-1 text-right">
                    <button type="button" onClick={() => removeRow(r.id)} disabled={readOnly} aria-label="Zeile entfernen" className="text-subtext hover:text-error text-lg leading-none px-1 disabled:opacity-40">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {config.note ? <p className="text-[11px] text-subtext">{config.note}</p> : null}
      <div className="text-[11px] text-subtext border-t border-hairline-strong pt-2">
        <span className="font-mono">{filled}</span> Einträge
        {config.sumColumn && sum != null ? (
          <>
            {' '}· {config.sumColumn.label}:{' '}
            <span className="font-mono">
              {new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(sum)}
            </span>
            {config.sumColumn.unit ? ` ${config.sumColumn.unit}` : ''}
          </>
        ) : null}
      </div>
    </div>
  );
}

function Cell({ col, row, readOnly, listId, onChange }: {
  col: ColumnDef; row: RegisterRow; readOnly: boolean; listId?: string; onChange: (v: RegisterCell) => void;
}) {
  const v = row[col.key];
  if (col.type === 'boolean') {
    return (
      <input type="checkbox" checked={v === true} disabled={readOnly} aria-label={col.label}
        onChange={(e) => onChange(e.target.checked)} className="mt-1" />
    );
  }
  if (col.type === 'number') {
    return (
      <input type="number" inputMode="decimal" value={typeof v === 'number' ? v : ''} disabled={readOnly} aria-label={col.label}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={`${cellInput} text-right tabular-nums`} />
    );
  }
  if (col.type === 'enum') {
    return (
      <select value={typeof v === 'string' ? v : ''} disabled={readOnly} aria-label={col.label}
        onChange={(e) => onChange(e.target.value)} className={cellInput}>
        <option value="">— wählen —</option>
        {col.options?.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <input type="text" value={typeof v === 'string' ? v : ''} disabled={readOnly} aria-label={col.label}
      list={listId} placeholder={col.placeholder} onChange={(e) => onChange(e.target.value)} className={cellInput} />
  );
}
