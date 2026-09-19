'use client';

import { useMemo, useState } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import {
  normalizeRainfallCarrier,
  parseKostraCsv,
  RETURN_PERIODS,
  type RainfallCarrier,
  type RainfallTable,
  type RainfallGridRow,
  type RainfallSource,
  type TnKey,
} from '@/lib/eval/rainfall-tables';

type Props = { fieldId: string; readOnly?: boolean; designReturnPeriod?: number | null };

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
 *  __legacyValue from each row, keep D_min.
 *  When designReturnPeriod is set, each row's __legacyValue is preserved into
 *  the r[String(designReturnPeriod)] column (the legacy 1D curve IS the design
 *  return-period curve). When null, r stays empty. */
function convertLegacyToNative(t: RainfallTable, designReturnPeriod: number | null): RainfallTable {
  const { legacyDesignColumn: _ldc, ...rest } = t;
  void _ldc;
  return {
    ...rest,
    legacyDesignColumn: undefined,
    rows: t.rows.map((row) => {
      const { __legacyValue: _lv, ...rowRest } = row as RainfallGridRow & { __legacyValue?: number | null };
      const r: Partial<Record<TnKey, number | null>> =
        designReturnPeriod != null
          ? { [String(designReturnPeriod) as TnKey]: _lv ?? null }
          : {};
      return { ...rowRest, r };
    }),
  };
}

/** Manage the project's MULTIPLE source-tagged rainfall tables (Piece 2). Each
 * table's cells (D, r_D(n)) are edited as a 2D matrix (rows = duration D,
 * columns = return period T_n). Legacy 1D tables display a notice and a
 * conversion action to start 2D data entry.
 *
 * No r_D(n) value is ever derived/selected in this editor — that is the engine's job. */
export function RainfallTablesEditor({ fieldId, readOnly = false, designReturnPeriod = null }: Props) {
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
  /** Replace a table's grid by the rows of a pasted KOSTRA-DWD-2020 CSV
   *  (`parseKostraCsv`). The table becomes a native 2D KOSTRA table; the
   *  legacy 1D flag is dropped because the file carries every column. */
  function importCsv(tableId: string, text: string): { ok: true; rows: number; columns: number[]; warnings: string[] } | { ok: false; error: string } {
    const t = carrier.tables.find((x) => x.id === tableId);
    if (!t) return { ok: false, error: 'Tabelle nicht gefunden.' };
    const parsed = parseKostraCsv(text);
    if ('error' in parsed) return { ok: false, error: parsed.error };
    const { legacyDesignColumn: _ldc, ...rest } = t;
    void _ldc;
    write({
      tables: carrier.tables.map((tbl) =>
        tbl.id === tableId
          ? { ...rest, legacyDesignColumn: undefined, source: 'KOSTRA-DWD-2020', columns: parsed.columns, rows: parsed.rows }
          : tbl,
      ),
    });
    return { ok: true, rows: parsed.rows.length, columns: parsed.columns, warnings: parsed.warnings };
  }
  function startNativeGrid(tableId: string) {
    const t = carrier.tables.find((x) => x.id === tableId);
    if (!t) return;
    write({ tables: carrier.tables.map((tbl) => (tbl.id === tableId ? convertLegacyToNative(tbl, designReturnPeriod) : tbl)) });
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

          <KostraCsvImport readOnly={readOnly} inputCls={inputCls} onImport={(text) => importCsv(t.id, text)} />

          {t.legacyDesignColumn ? (
            <LegacyTableView
              table={t}
              readOnly={readOnly}
              inputCls={inputCls}
              designReturnPeriod={designReturnPeriod}
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
// KOSTRA CSV paste box (one per table)
// ─────────────────────────────────────────────────────────────────────────────

type KostraCsvImportProps = {
  readOnly: boolean;
  inputCls: (ro: boolean) => string;
  onImport: (text: string) => { ok: true; rows: number; columns: number[]; warnings: string[] } | { ok: false; error: string };
};

/** Paste the DWD CSV of the grid cell instead of typing 22 × 9 cells by hand.
 *  Nothing is computed here — the parser copies the printed r_D(n) values. */
function KostraCsvImport({ readOnly, inputCls, onImport }: KostraCsvImportProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; message: string; warnings?: string[] } | null>(null);

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => { setOpen(true); setStatus(null); }}
          disabled={readOnly}
          className="text-xs px-3 py-1 rounded border border-hairline-strong hover:bg-paper-2 text-ink disabled:opacity-40 disabled:cursor-not-allowed"
        >
          KOSTRA-CSV einfügen
        </button>
        {status?.kind === 'ok' && <span className="text-xs text-subtext" data-testid="kostra-import-status">{status.message}</span>}
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded border border-hairline bg-paper-2/40 p-2" data-testid="kostra-csv-import">
      <p className="text-xs text-subtext">
        Inhalt der DWD-Datei „KOSTRA-DWD-2020_…_INDEX_&lt;Zelle&gt;.csv“ (oder des openko-Exports) hier einfügen.
        Gelesen werden D_min und die Spalten rN_T1 … rN_T100 (Regenspende r_D(n) in l/(s·ha)) — unverändert, keine Rundung.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="KOSTRA-CSV Inhalt"
        rows={6}
        spellCheck={false}
        className={`${inputCls(false)} font-mono text-xs`}
        placeholder="D_min;hN_T1;…;rN_T1;…;rN_T100;UC_T5;UC_T10"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => {
            const res = onImport(text);
            if (res.ok) {
              setStatus({ kind: 'ok', message: `${res.rows} Dauerstufen, Spalten ${res.columns.map((c) => `${c} a`).join(' · ')} übernommen.`, warnings: res.warnings });
              setText('');
              setOpen(false);
            } else {
              setStatus({ kind: 'error', message: res.error });
            }
          }}
          disabled={readOnly || text.trim() === ''}
          className="text-xs px-3 py-1 rounded border border-hairline-strong hover:bg-paper-2 text-ink disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Übernehmen
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setText(''); setStatus(null); }}
          className="text-xs px-3 py-1 rounded text-subtext hover:text-ink"
        >
          Abbrechen
        </button>
        {status?.kind === 'error' && <span className="text-xs text-error" role="alert">{status.message}</span>}
      </div>
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
  designReturnPeriod: number | null;
  onStartNativeGrid: () => void;
};

function LegacyTableView({ table, readOnly, inputCls, designReturnPeriod, onStartNativeGrid }: LegacyTableViewProps) {
  const canConvert = designReturnPeriod != null;
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

      {/* Conversion hint / guard note */}
      {canConvert ? (
        <p className="text-xs text-amber-700">
          Beim Erfassen werden die bestehenden r_D-Werte in die Bemessungsspalte T_n = {designReturnPeriod} a übernommen.
        </p>
      ) : (
        <p className="text-xs text-subtext">
          Projekt-Wiederkehrzeit T_n nicht gesetzt — bitte zuerst n/T_n (A138-08) erfassen, bevor der 2D-Raster angelegt wird.
        </p>
      )}

      {/* Action to start 2D data entry */}
      <button
        type="button"
        onClick={onStartNativeGrid}
        disabled={readOnly || !canConvert}
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
