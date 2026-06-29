'use client';

import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import {
  normalizeRainfallCarrier,
  RETURN_PERIODS,
  type RainfallCarrier,
  type RainfallTable,
  type RainfallGridRow,
  type RainfallSource,
  type TnKey,
} from '@/lib/eval/rainfall-tables';

type Props = { fieldId: string; readOnly?: boolean };

const SOURCE_LABELS: Record<RainfallSource, string> = {
  'KOSTRA-DWD-2020': 'KOSTRA-DWD-2020',
  'DWA-A-531-local': 'DWA-A 531 (lokal)',
  engineer: 'Ingenieur',
};

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** A new native 2D row (no __legacyValue). */
function newRow(): RainfallGridRow & { id: string } {
  return { id: uid(), D_min: null, r: {} };
}

function newTable(index: number): RainfallTable {
  return { id: uid(), name: `Tabelle ${index + 1}`, source: 'engineer', columns: [...RETURN_PERIODS], rows: [] };
}

/** Convert a legacy table to a native 2D table: drop legacyDesignColumn and
 *  __legacyValue from each row, keep D_min, start with empty r: {}. */
function convertLegacyToNative(t: RainfallTable): RainfallTable {
  const { legacyDesignColumn: _ldc, ...rest } = t;
  void _ldc;
  return {
    ...rest,
    legacyDesignColumn: undefined,
    rows: t.rows.map((row) => {
      const { __legacyValue: _lv, ...rowRest } = row as RainfallGridRow & { __legacyValue?: unknown };
      void _lv;
      return { ...rowRest, r: {} };
    }),
  };
}

/** Manage the project's MULTIPLE source-tagged rainfall tables (Piece 2). Each
 * table's cells (D, r_D(n)) are edited as a 2D matrix (rows = duration D,
 * columns = return period T_n). Legacy 1D tables display a notice and a
 * conversion action to start 2D data entry.
 *
 * No r_D(n) value is ever derived/selected in this editor — that is the engine's job. */
export function RainfallTablesEditor({ fieldId, readOnly = false }: Props) {
  const raw = useWorksheetStore((s) => s.values[fieldId]);
  const setField = useWorksheetStore((s) => s.setField);
  const carrier = useMemo<RainfallCarrier>(
    () => normalizeRainfallCarrier(raw?.type === 'json' ? raw.value : undefined),
    [raw],
  );

  function write(next: RainfallCarrier) {
    if (readOnly) return;
    setField(fieldId, { type: 'json', value: next });
  }
  function patchTable(id: string, patch: Partial<RainfallTable>) {
    write({ tables: carrier.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  }
  function addTable() {
    write({ tables: [...carrier.tables, newTable(carrier.tables.length)] });
  }
  function removeTable(id: string) {
    write({ tables: carrier.tables.filter((t) => t.id !== id) });
  }
  function addRow(tableId: string) {
    const t = carrier.tables.find((x) => x.id === tableId);
    if (!t) return;
    patchTable(tableId, { rows: [...t.rows, newRow()] });
  }
  function patchRow(tableId: string, idx: number, patch: Partial<RainfallGridRow>) {
    const t = carrier.tables.find((x) => x.id === tableId);
    if (!t) return;
    patchTable(tableId, { rows: t.rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)) });
  }
  function removeRow(tableId: string, idx: number) {
    const t = carrier.tables.find((x) => x.id === tableId);
    if (!t) return;
    patchTable(tableId, { rows: t.rows.filter((_, i) => i !== idx) });
  }
  function startNativeGrid(tableId: string) {
    const t = carrier.tables.find((x) => x.id === tableId);
    if (!t) return;
    write({ tables: carrier.tables.map((tbl) => (tbl.id === tableId ? convertLegacyToNative(tbl) : tbl)) });
  }

  const inputCls = (ro: boolean) =>
    `block w-full rounded border border-hairline px-2 py-1 text-sm text-ink focus:outline-none ${ro ? 'bg-paper-2 cursor-default' : 'bg-transparent focus:border-accent'}`;

  return (
    <div className="space-y-4" data-testid="rainfall-tables-editor">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-subtext">
          Regenspendentabellen (KOSTRA-DWD-2020 / DWA-A 531) · r_D(n) in l/(s·ha)
        </div>
        <button
          type="button"
          onClick={addTable}
          disabled={readOnly}
          className="text-xs px-3 py-1.5 rounded border border-hairline-strong hover:bg-paper-2 text-ink disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Tabelle hinzufügen
        </button>
      </div>

      {carrier.tables.length === 0 && (
        <p className="text-xs text-subtext italic">Keine Regenspendentabelle erfasst.</p>
      )}

      {carrier.tables.map((t) => (
        <section key={t.id} data-testid={`rainfall-table-${t.id}`} className="border border-hairline rounded p-3 space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[10rem]">
              <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">Name</span>
              <input
                type="text"
                value={t.name}
                readOnly={readOnly}
                aria-label="Tabellenname"
                onChange={(e) => patchTable(t.id, { name: e.target.value })}
                className={inputCls(readOnly)}
              />
            </label>
            <label className="min-w-[10rem]">
              <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">Quelle</span>
              <select
                value={t.source}
                disabled={readOnly}
                aria-label="Datenquelle"
                onChange={(e) => patchTable(t.id, { source: e.target.value as RainfallSource })}
                className={inputCls(readOnly)}
              >
                {(Object.keys(SOURCE_LABELS) as RainfallSource[]).map((s) => (
                  <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => removeTable(t.id)}
              disabled={readOnly}
              aria-label="Tabelle entfernen"
              className="text-subtext hover:text-error text-lg leading-none px-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ×
            </button>
          </div>

          {t.legacyDesignColumn ? (
            <LegacyTableView
              table={t}
              readOnly={readOnly}
              inputCls={inputCls}
              onStartNativeGrid={() => startNativeGrid(t.id)}
            />
          ) : (
            <NativeGridView
              table={t}
              readOnly={readOnly}
              inputCls={inputCls}
              onPatchRow={(idx, patch) => patchRow(t.id, idx, patch)}
              onRemoveRow={(idx) => removeRow(t.id, idx)}
              onAddRow={() => addRow(t.id)}
            />
          )}
        </section>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy 1D design-column view
// ─────────────────────────────────────────────────────────────────────────────

type LegacyTableViewProps = {
  table: RainfallTable;
  readOnly: boolean;
  inputCls: (ro: boolean) => string;
  onStartNativeGrid: () => void;
};

function LegacyTableView({ table, readOnly, inputCls, onStartNativeGrid }: LegacyTableViewProps) {
  return (
    <div className="space-y-2">
      {/* Notice banner */}
      <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <span className="font-semibold">Altdaten: 1D-Bemessungsspalte</span>
        {' — '}
        bitte vollständigen 2D-Raster (Dauerstufe × Wiederkehrzeit) erfassen.
      </div>

      {/* Read-only legacy curve */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[18rem] text-sm">
          <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
            <tr>
              <th className="text-right font-normal pb-1 pr-2">D (min)</th>
              <th className="text-right font-normal pb-1 pr-2">r_D (l/(s·ha))</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, idx) => {
              const legacyVal = (r as RainfallGridRow & { __legacyValue?: number | null }).__legacyValue;
              return (
                <tr key={idx} className="border-t border-hairline">
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={r.D_min == null ? '' : r.D_min}
                      readOnly
                      aria-label="Dauerstufe D (min)"
                      className={`${inputCls(true)} text-right tabular-nums`}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={legacyVal == null ? '' : legacyVal}
                      readOnly
                      aria-label="Regenspende r_D (Altdaten)"
                      className={`${inputCls(true)} text-right tabular-nums`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Action to start 2D data entry */}
      <button
        type="button"
        onClick={onStartNativeGrid}
        disabled={readOnly}
        className="text-xs px-3 py-1.5 rounded border border-hairline-strong hover:bg-paper-2 text-ink disabled:opacity-40 disabled:cursor-not-allowed"
      >
        2D-Raster erfassen
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Native 2D grid view
// ─────────────────────────────────────────────────────────────────────────────

type NativeGridViewProps = {
  table: RainfallTable;
  readOnly: boolean;
  inputCls: (ro: boolean) => string;
  onPatchRow: (idx: number, patch: Partial<RainfallGridRow>) => void;
  onRemoveRow: (idx: number) => void;
  onAddRow: () => void;
};

function NativeGridView({ table, readOnly, inputCls, onPatchRow, onRemoveRow, onAddRow }: NativeGridViewProps) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: `${12 + RETURN_PERIODS.length * 6}rem` }}>
          <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
            <tr>
              <th className="text-right font-normal pb-1 pr-2 whitespace-nowrap">D (min)</th>
              {RETURN_PERIODS.map((rp) => (
                <th key={rp} className="text-right font-normal pb-1 pr-2 whitespace-nowrap">
                  {rp}a
                </th>
              ))}
              <th aria-hidden="true" className="w-8" />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, idx) => (
              <tr key={idx} className="border-t border-hairline">
                <td className="py-1.5 pr-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={row.D_min == null ? '' : row.D_min}
                    readOnly={readOnly}
                    aria-label="Dauerstufe D (min)"
                    onChange={(e) =>
                      onPatchRow(idx, {
                        D_min: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className={`${inputCls(readOnly)} text-right tabular-nums`}
                  />
                </td>
                {RETURN_PERIODS.map((rp) => {
                  const key = String(rp) as TnKey;
                  const val = row.r[key];
                  return (
                    <td key={rp} className="py-1.5 pr-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.1"
                        value={val == null ? '' : val}
                        readOnly={readOnly}
                        aria-label={`r_D für ${rp}a`}
                        onChange={(e) => {
                          const newVal = e.target.value === '' ? null : Number(e.target.value);
                          onPatchRow(idx, {
                            r: { ...row.r, [key]: newVal },
                          });
                        }}
                        className={`${inputCls(readOnly)} text-right tabular-nums`}
                      />
                    </td>
                  );
                })}
                <td className="py-1.5 pl-2 text-right">
                  <button
                    type="button"
                    onClick={() => onRemoveRow(idx)}
                    disabled={readOnly}
                    aria-label="Zeile entfernen"
                    className="text-subtext hover:text-error text-lg leading-none px-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={onAddRow}
        disabled={readOnly}
        className="text-xs px-3 py-1 rounded border border-hairline-strong hover:bg-paper-2 text-ink disabled:opacity-40 disabled:cursor-not-allowed"
      >
        + Zeile
      </button>
    </div>
  );
}
