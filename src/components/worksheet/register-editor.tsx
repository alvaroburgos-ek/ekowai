'use client';

/**
 * Generic register editor over the `register` ui_config contract (Plan 2b, Task 2).
 *
 * Replaces the three hand-built editors (surface-inventory / pollutant-register /
 * structured-register) with ONE component driven by `RegisterUiConfig`:
 * every `RegisterColumn` type, the per-row override policy (table pair stays
 * visible while overridden), register-level flags, and a footer that shows
 * ENGINE states by output symbol.
 *
 * Invariants (binding, Plan 2b header):
 * - The editor DISPLAYS. Rows are read THROUGH `prepareRegisterRows` (typed
 *   cells, legacy replay, lookup refill, derived cells, completeness); the
 *   editor never computes a symbol. The only arithmetic here is the legacy
 *   `sum_column` footer, display-only.
 * - SR-1: option lists come from the regulation table rows
 *   (`lookup_key`), `columns[].options` + `option_labels` (`enum`) or
 *   `datalist` — never typed here.
 * - Derived cells are rendered read-only and NEVER written into the carrier.
 *   The written carrier is exactly `{ rows: [stored cells only], <flags> }`.
 * - A column's own `visible_when` is evaluated in ROW scope (row values
 *   shadow worksheet symbols, `undefined` for unknown names): only `fail`
 *   hides the cell (and nulls it on the next write); pending / manual /
 *   not_applicable keep it visible (fail-safe, same rule as the engine's
 *   completeness — register-rows.ts `columnHiddenInRow`).
 * - Override policy (I-4, spec §7): the TABLE of the FIRST lookup_key column is
 *   the single source — `resolveRegulationTable(std, code).override_policy`;
 *   when `ui_config.override.policy` disagrees, the table wins and a diagnostic
 *   is listed. `locked` ⇒ no toggle; `anhaltswert` ⇒ toggle + a reason per
 *   overridden row (`recordManualOverride(fieldId, 'register:<TABLE>:<rowId>')`,
 *   "Begründung fehlt" until saved — visible state only); `kann` ⇒ the override
 *   control is a select over the value column's printed alternatives; `messwert`
 *   ⇒ free entry labelled "(Messwert)" + reason.
 */
import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { prepareRegisterRows } from '@/lib/eval/register-rows';
import { registerFlagKeys } from '@/lib/eval/register-configs';
import { makeTableLookup, makeTableRows, resolveRegulationTable } from '@/lib/eval/regulation-tables-fallback';
import { tableLabel } from '@/lib/eval/lookup-fill';
import { OverrideReasonForm, ReasonMissing, clearSavedOverrideReason, overrideReasonKey, useOverrideReason } from './override-reason';
import { evalCondition, type PreparedRegister, type PreparedRow, type Scope, type Value } from '@/lib/expr';
import type { RegisterColumn, RegisterUiConfig } from '@/lib/eval/field-config';
import type { EvalState } from '@/lib/eval/formula';
import { printedAlternatives } from '@/lib/eval/regulation-tables';
import type { RegulationRow, RegulationTable, ValueColumn } from '@/lib/eval/regulation-tables';

export type FooterState = { label: string; unit: string | null; state: EvalState | undefined };
export type RegisterEditorProps = {
  fieldId: string;
  /** data-symbol attribute + `registerFlagKeys` fallback key. */
  symbol: string;
  config: RegisterUiConfig;
  /** Regulation-table scope (makeTableLookup / makeTableRows). */
  standardCode: string;
  readOnly?: boolean;
  /** ui_config.footer symbols → engine state of the equation producing that symbol (built by the form from useEquationEngine). */
  footerStates?: Record<string, FooterState>;
  /** worksheet-symbol lookup for column visible_when + derived exprs (row values shadow it); MUST return `undefined` for unknown names. */
  symbolLookup?: (sym: string) => Value | undefined;
  /** Project id for the per-row override REASON (`recordManualOverride`, I-4). Without it the reason form is not rendered
   * (no audit path) — the "Begründung fehlt" marker still shows. */
  projectId?: string;
};

type OverridePolicy = RegulationTable['override_policy'];

const NUM = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 });
const SUM_NUM = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
/**
 * Scientific form for a non-zero |v| < 0.01 (din18130_1-I-2): `NUM`'s 4
 * fraction digits collapse a value like k = 3,48·10⁻¹⁰ m/s to "0". Mirrors
 * the equation card's `toPrecision` scientific branch (equation-engine-card.tsx
 * `formatNumber`) but locale-adapts the separator: up to 4 significant digits
 * (`toExponential(3)`), trailing mantissa zeros trimmed, decimal point → comma.
 * The card's `|v| >= 1000` branch is intentionally not ported here.
 */
function fmtScientific(v: number): string {
  const m = /^(-?\d(?:\.\d+)?)e([+-]\d+)$/.exec(v.toExponential(3));
  if (!m) return String(v);
  const mantissa = m[1].includes('.') ? m[1].replace(/0+$/, '').replace(/\.$/, '') : m[1];
  return `${mantissa.replace('.', ',')}e${m[2]}`;
}
/**
 * Plan 3 final wave B (defect 4; Plan-2c backlog item 13) — the epsilon the Task-10b
 * scientific branch left open. Below it a magnitude is IEEE-754 cancellation noise, not a
 * value: `0.3 - 0.1 - 0.2` is −2,78e-17 and must read "0", because the guideline's own
 * arithmetic says zero. Above it the scientific branch stands.
 *
 * WHY 1e-12: the smallest magnitude the corpus PRINTS is the DIN 18130-1 permeability
 * k_f ≈ 3,48·10⁻¹⁰ m/s (the value Task 10b was opened for), so the guard sits two decades
 * below anything a standard states, while the cancellation residue of sums over the
 * corpus's ordinary magnitudes (10⁰…10⁶) lands at 1e-16…1e-10 only for the very largest —
 * and those are areas/volumes in m², where 1e-12 m² is not a quantity anyone reports.
 * Exported so the boundary is auditable and pinned, never re-guessed.
 */
export const FMT_EPSILON = 1e-12;
/** de-DE number formatting; `—` for null/empty; other scalars verbatim. */
export function fmt(v: Value | undefined): string {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return '—';
    // epsilon guard BEFORE the scientific branch: noise formats as the plain zero it means.
    if (v !== 0 && Math.abs(v) > FMT_EPSILON && Math.abs(v) < 0.01) return fmtScientific(v);
    if (Math.abs(v) <= FMT_EPSILON) return NUM.format(0);
    return NUM.format(v);
  }
  if (v == null || v === '') return '—';
  return String(v);
}
/** Where the register renders (form-level decision, Task 3). `undefined` ⇒ `'bottom'`: the Plan-1 selection-config
 *  migrations carry no `placement` key while the TS fallback adds `'bottom'` — without this default the 36 selection
 *  registers would relocate into their sections once those migrations land. */
export function registerPlacement(config: { placement?: RegisterUiConfig['placement'] } & Record<string, unknown>): 'section' | 'bottom' {
  return config.placement ?? 'bottom';
}
/** 'TAB9' → 'Tab. 9' etc. — canonical home is src/lib/eval/lookup-fill.ts (Plan 2b Task 7); re-exported for the existing callers. */
export { tableLabel };

const cellInput = 'block w-full rounded border border-hairline bg-transparent px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed';
const NO_SYMBOL: NonNullable<Scope['symbol']> = () => undefined;

function slug(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function isStored(c: RegisterColumn): boolean { return c.type !== 'derived'; }
function emptyCell(c: RegisterColumn): Value { return c.type === 'text' ? '' : c.type === 'boolean' ? false : null; }
function isRightAligned(c: RegisterColumn): boolean {
  return c.type === 'number' || c.type === 'lookup_value' || (c.type === 'derived' && c.display !== 'badge');
}

/**
 * Stored cells only: every non-derived column of every prepared row; a cell whose column is hidden for that row
 * is nulled (`''` for text). Port of the write side of the legacy surface / structured-register editors (deleted in
 * Plan 2b Task 3), generalised — unknown/legacy keys of the raw carrier are dropped.
 */
export function storedRows(
  prepared: PreparedRegister,
  columns: readonly RegisterColumn[],
  hiddenCells: (rowId: string, key: string) => boolean,
): Array<{ id: string } & Record<string, Value>> {
  return prepared.rows.map((r) => {
    const out: { id: string } & Record<string, Value> = { id: r.id };
    for (const c of columns) {
      if (!isStored(c)) continue;
      if (hiddenCells(r.id, c.key)) { out[c.key] = c.type === 'text' ? '' : null; continue; }
      const v = r.values[c.key];
      out[c.key] = v === undefined ? emptyCell(c) : v;
    }
    return out;
  });
}

/** New-row defaults (selection-fields.ts newRegisterRow + the surface newSurfaceRow() shape): stored columns only. */
function newRow(columns: readonly RegisterColumn[]): Record<string, unknown> {
  const row: Record<string, unknown> = { id: genId() };
  for (const c of columns) {
    if (!isStored(c)) continue;
    row[c.key] = c.type === 'grid' ? {} : emptyCell(c);
  }
  return row;
}

function groupRows(rows: readonly RegulationRow[], groupBy: string | undefined): Array<{ label: string | null; rows: RegulationRow[] }> {
  if (!groupBy) return [{ label: null, rows: [...rows] }];
  const out: Array<{ label: string | null; rows: RegulationRow[] }> = [];
  for (const r of rows) {
    const raw = groupBy === 'group_label' ? r.group_label : r.values[groupBy];
    const label = raw == null ? null : String(raw);
    const g = out.find((x) => x.label === label);
    if (g) g.rows.push(r); else out.push({ label, rows: [r] });
  }
  return out;
}

/** Column visibility in ROW scope (mirror of register-rows.ts columnHiddenInRow): row keys shadow worksheet symbols; only `fail` hides. */
function cellHiddenInRow(c: RegisterColumn, row: PreparedRow, symbol: Scope['symbol'], table: Scope['table']): boolean {
  if (!c.visible_when || !c.visible_when.trim()) return false;
  const r = evalCondition(c.visible_when, { symbol: (s) => (Object.hasOwn(row.values, s) ? row.values[s] : symbol(s)), table });
  return r.kind === 'fail';
}

function useTables(standardCode: string) {
  const table = useMemo(() => makeTableLookup(standardCode), [standardCode]);
  const tableRows = useMemo(() => makeTableRows(standardCode), [standardCode]);
  return { table, tableRows };
}

export function RegisterEditor({ fieldId, symbol, config, standardCode, readOnly = false, footerStates, symbolLookup, projectId }: RegisterEditorProps) {
  const raw = useWorksheetStore((s) => s.values[fieldId]);
  const setField = useWorksheetStore((s) => s.setField);
  const instanceId = useWorksheetStore((s) => s.instanceId);
  const { table, tableRows } = useTables(standardCode);
  const rowSymbol = symbolLookup ?? NO_SYMBOL;
  const flagKeys = useMemo(() => registerFlagKeys(symbol, config), [symbol, config]);
  const opts = useMemo(
    () => ({ legacyMap: config.legacy_map, flagKeys, overrideFlagKey: config.override?.flag_key, overrideAppliesTo: config.override?.applies_to }),
    [config, flagKeys],
  );
  const prepared = useMemo(
    () => prepareRegisterRows(raw?.type === 'json' ? raw.value : null, config.columns, { table, tableRows, symbol: rowSymbol }, opts),
    [raw, config.columns, table, tableRows, rowSymbol, opts],
  );
  // `columns` = the stored contract (write side, storedRows); `visibleColumns` = what renders. The
  // override flag column is a stored cell driven ONLY by the toggle button — rendering it as a checkbox
  // would add a second override-off path that skips the table-pair revert in toggleOverride (fix round 1).
  const columns = config.columns;
  const override = config.override;
  const visibleColumns = useMemo(() => columns.filter((c) => c.key !== override?.flag_key), [columns, override?.flag_key]);
  const keyCol = columns.find((c) => c.type === 'lookup_key');
  const rowById = useMemo(() => new Map(prepared.rows.map((r) => [r.id, r])), [prepared.rows]);
  const colByKey = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);
  // I-4: the override policy comes from the TABLE of the first lookup_key column (the toggle binds to it — G-B2);
  // `ui_config.override.policy` is only the fallback while the table is unknown, and a disagreement is listed.
  const overrideTable = keyCol?.lookup ? resolveRegulationTable(standardCode, keyCol.lookup.table_code) : undefined;
  const policy: OverridePolicy | null = override ? (overrideTable?.override_policy ?? override.policy) : null;
  const policyDiagnostic = override && overrideTable && overrideTable.override_policy !== override.policy
    ? `override.policy „${override.policy}“ weicht von ${tableLabel(overrideTable.table_code)} (${overrideTable.override_policy}) ab — die Tabelle gilt`
    : null;
  const canToggle = !!override && policy !== 'locked';
  const needsReason = policy === 'anhaltswert' || policy === 'messwert';
  /** The regulation-table value column behind a lookup_value column (type + printed alternatives for `kann`). */
  const valueColumnOf = (vc: RegisterColumn): ValueColumn | undefined =>
    vc.type === 'lookup_value' && vc.lookup?.value ? resolveRegulationTable(standardCode, vc.lookup.table_code)?.value_columns.find((c) => c.name === vc.lookup!.value) : undefined;

  const cellHidden = (row: PreparedRow, c: RegisterColumn) => cellHiddenInRow(c, row, rowSymbol, table);
  const hiddenCells = (rowId: string, key: string): boolean => {
    const r = rowById.get(rowId);
    const c = colByKey.get(key);
    return !!r && !!c && cellHidden(r, c);
  };

  // ---- write side: carrier = { ...flags, rows: [stored cells only] } ----
  function write(rows: Array<Record<string, unknown>>, flags: Record<string, boolean> = prepared.flags) {
    if (readOnly) return;
    setField(fieldId, { type: 'json', value: { ...flags, rows } });
  }
  const currentRows = () => storedRows(prepared, columns, hiddenCells) as Array<Record<string, unknown>>;
  function addRow() { write([...currentRows(), newRow(columns)]); }
  function removeRow(id: string) { write(currentRows().filter((r) => r.id !== id)); }
  function patchRow(id: string, patch: Record<string, unknown>) { write(currentRows().map((r) => (r.id === id ? { ...r, ...patch } : r))); }
  function setFlag(key: string, on: boolean) { write(currentRows(), { ...prepared.flags, [key]: on }); }

  /** Table value a lookup_value column would carry for the row's current key (undefined when unbound / no row). */
  const tableValue = (r: PreparedRow, vc: RegisterColumn): Value | undefined => {
    if (vc.type !== 'lookup_value' || !vc.lookup?.key_column || !vc.lookup.value) return undefined;
    const k = r.values[vc.lookup.key_column];
    if (k == null) return undefined;
    return table(vc.lookup.table_code, [k])?.[vc.lookup.value];
  };
  /** lookup_key change: refill every lookup_value bound to this key from the table row, reset the override flag
   * (legacy surface editor, deleted in Plan 2b Task 3). An unknown key is ignored, never stored. */
  function selectKey(id: string, kc: RegisterColumn, value: string) {
    if (!kc.lookup) return;
    const row = table(kc.lookup.table_code, [value]);
    if (!row) return;
    const patch: Record<string, unknown> = { [kc.key]: value };
    for (const vc of columns) {
      if (vc.type === 'lookup_value' && vc.lookup?.key_column === kc.key && vc.lookup.value) patch[vc.key] = row[vc.lookup.value] ?? null;
    }
    if (override) patch[override.flag_key] = false;
    patchRow(id, patch);
  }
  /** Override toggle (legacy surface editor, deleted in Plan 2b Task 3): on ⇒ flag only (cells keep their values, become editable);
   * off ⇒ flag false + every applies_to cell refilled from the table. */
  function toggleOverride(r: PreparedRow, on: boolean) {
    if (!override) return;
    const patch: Record<string, unknown> = { [override.flag_key]: on };
    if (!on) {
      for (const key of override.applies_to) {
        const vc = columns.find((c) => c.key === key);
        patch[key] = vc ? (tableValue(r, vc) ?? null) : null;
      }
      // Taking the table back drops the row's justification (the confirmation is per justified value).
      clearSavedOverrideReason(overrideReasonKey(instanceId, fieldId, r.id));
    }
    patchRow(r.id, patch);
  }
  const overridden = (r: PreparedRow) => !!override && r.values[override.flag_key] === true;

  const complete = prepared.rows.filter((r) => r.complete).length;
  const rowsDisabled = config.flags?.some((f) => f.disables_rows && prepared.flags[f.key] === true) ?? false;
  const addLabel = config.add_label ?? '+ Zeile hinzufügen';
  const diagnostics = useMemo(
    () => [...new Set([...(prepared.diagnostics ?? []), ...(policyDiagnostic ? [policyDiagnostic] : [])])],
    [prepared.diagnostics, policyDiagnostic],
  );
  /**
   * wave B defect 5 (`iso59020-F-2`): rows agreeing on every `ui_config.unique_by` column are
   * duplicates. Reported, never repaired — dropping or merging a row would destroy an
   * engineer's entry on a guess; the register is theirs, the warning is ours. The count is
   * what a `count_rows` gate sees, which is the whole point of saying it out loud.
   */
  const duplicates = useMemo(() => {
    const keys = config.unique_by;
    if (!keys?.length) return [];
    const seen = new Map<string, { n: number; label: string }>();
    for (const r of prepared.rows) {
      const id = keys.map((k) => JSON.stringify(r.values[k] ?? null)).join(' ');
      const hit = seen.get(id);
      if (hit) { hit.n += 1; continue; }
      const label = keys.map((k) => {
        const c = colByKey.get(k);
        const v = r.values[k];
        const shown = c?.type === 'lookup_key' && c.lookup
          ? (tableRows(c.lookup.table_code) ?? []).find((t) => t.row_key === v)?.label_de ?? fmt(v)
          : fmt(v);
        return `${c?.label ?? k} „${shown}“`;
      }).join(' · ');
      seen.set(id, { n: 1, label });
    }
    return [...seen.values()].filter((e) => e.n > 1);
  }, [prepared.rows, config.unique_by, colByKey, tableRows]);
  // Legacy structured-register footer (display-only, never written; the engine's Σ is `footer` below).
  const legacySum = useMemo(() => {
    if (!config.sum_column) return null;
    let t = 0;
    for (const r of prepared.rows) { const v = r.values[config.sum_column.key]; if (typeof v === 'number' && Number.isFinite(v)) t += v; }
    return t;
  }, [prepared, config.sum_column]);
  // Datalist ids keyed by the FIELD id — two registers with the same title on one page must not share a list.
  const listId = (c: RegisterColumn) => (c.datalist?.length ? `reg-${fieldId}-${slug(c.key)}` : undefined);

  return (
    <div className="space-y-3" data-testid="register-editor" data-symbol={symbol}>
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-medium text-ink">{config.title}</div>
          {config.subtitle && <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-0.5">{config.subtitle}</div>}
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={readOnly || rowsDisabled}
          className="text-xs px-3 py-1.5 rounded border border-hairline-strong hover:bg-paper-2 text-ink disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {addLabel}
        </button>
      </div>

      {config.flags?.map((f) => (
        <label key={f.key} className="flex items-start gap-2 text-xs text-ink cursor-pointer">
          <input
            type="checkbox"
            checked={prepared.flags[f.key] === true}
            disabled={readOnly}
            onChange={(e) => setFlag(f.key, e.target.checked)}
            className="mt-0.5"
            data-testid={`flag-${f.key}`}
            aria-label={f.label ?? f.key}
          />
          <span>
            {f.label ?? f.key}
            {f.note && <span className="block text-[11px] text-subtext">{f.note}</span>}
          </span>
        </label>
      ))}

      {visibleColumns.filter((c) => c.datalist?.length).map((c) => (
        <datalist key={c.key} id={listId(c)}>
          {c.datalist!.map((o) => <option key={o} value={o} />)}
        </datalist>
      ))}

      {rowsDisabled ? null : prepared.rows.length === 0 ? (
        <p className="text-xs text-subtext italic">Noch keine Einträge. „{addLabel}“ fügt eine Zeile hinzu.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-[10px] uppercase tracking-[0.18em] text-subtext">
              <tr>
                {visibleColumns.map((c) => (
                  <th key={c.key} className={`font-normal pb-1 pr-2 ${isRightAligned(c) ? 'text-right' : 'text-left'} ${c.width ?? ''}`}>
                    {c.label}{c.unit ? ` (${c.unit})` : ''}
                  </th>
                ))}
                <th aria-hidden="true" className="w-8" />
              </tr>
            </thead>
            <tbody>
              {prepared.rows.map((r) => (
                <tr key={r.id} data-testid="register-row" className="border-t border-hairline align-top">
                  {visibleColumns.map((c) => (
                    <td key={c.key} data-testid={`cell-${c.key}`} className={`py-1.5 pr-2 ${c.type === 'number' || c.type === 'lookup_value' ? 'text-right tabular-nums' : ''}`}>
                      {cellHidden(r, c) ? null : (
                        <Cell
                          col={c}
                          row={r}
                          readOnly={readOnly}
                          listId={listId(c)}
                          overridden={overridden(r)}
                          tableValue={tableValue(r, c)}
                          valueColumn={valueColumnOf(c)}
                          policy={policy}
                          tableRows={c.lookup ? (tableRows(c.lookup.table_code) ?? []) : []}
                          isApplies={!!override?.applies_to.includes(c.key)}
                          onChange={(v) => patchRow(r.id, { [c.key]: v })}
                          onSelectKey={(v) => selectKey(r.id, c, v)}
                        />
                      )}
                      {c.type === 'lookup_key' && override && canToggle && keyCol?.key === c.key && r.values[c.key] != null && c.lookup && (
                        <>
                          <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => toggleOverride(r, !overridden(r))}
                            className="text-[10px] text-accent hover:underline mt-1 block disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {overridden(r) ? `${tableLabel(c.lookup.table_code)} übernehmen` : 'abweichend wählen'}
                          </button>
                          {overridden(r) && (
                            <div data-testid="lookup-original" className="text-[10px] text-subtext mt-0.5">
                              {tableLabel(c.lookup.table_code)}: {override.applies_to.map((k) => { const vc = columns.find((x) => x.key === k); return fmt(vc ? tableValue(r, vc) : undefined); }).join(' / ')}
                            </div>
                          )}
                          {overridden(r) && needsReason && (
                            <RowOverrideReason
                              storeKey={overrideReasonKey(instanceId, fieldId, r.id)}
                              justified={Object.fromEntries(override.applies_to.map((k) => [k, r.values[k] ?? null]))}
                              projectId={readOnly ? undefined : projectId}
                              fieldId={fieldId}
                              equationNumber={`register:${c.lookup.table_code}:${r.id}`}
                            />
                          )}
                        </>
                      )}
                    </td>
                  ))}
                  <td className="py-1.5 pl-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(r.id)}
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
      )}

      {diagnostics.length > 0 && (
        <ul data-testid="register-diagnostics" className="text-[11px] text-warning list-disc pl-4 space-y-0.5">
          {diagnostics.map((d) => <li key={d}>{d}</li>)}
        </ul>
      )}

      {duplicates.length > 0 && (
        <ul data-testid="register-duplicates" className="text-[11px] text-warning list-disc pl-4 space-y-0.5">
          {duplicates.map((d) => (
            <li key={d.label}>Doppelte Zeile: {d.label} — {d.n}× erfasst; zählende Prüfungen zählen sie mehrfach.</li>
          ))}
        </ul>
      )}

      {config.note ? <p className="text-[11px] text-subtext">{config.note}</p> : null}

      <div className="text-[11px] text-subtext border-t border-hairline-strong pt-2">
        <span className="font-mono">{complete}</span> Einträge · <span data-testid="rows-complete">{complete}/{prepared.rows.length}</span> vollständig
        {config.footer?.map((sym) => {
          const f = footerStates?.[sym];
          const st = f?.state;
          const ok = st?.kind === 'computed';
          const reason = st && st.kind === 'manual_required' ? st.reason : st && st.kind === 'error' ? st.message : undefined;
          return (
            <span key={sym}>
              {' '}· {f?.label ?? sym}:{' '}
              <span data-testid={`footer-${sym}`} className="font-mono" title={ok ? undefined : reason}>
                {ok ? fmt(st.value) : '—'}
              </span>
              {ok && f?.unit ? ` ${f.unit}` : ''}
            </span>
          );
        })}
        {config.sum_column && legacySum != null ? (
          <>
            {' '}· {config.sum_column.label}: <span className="font-mono">{SUM_NUM.format(legacySum)}</span>
            {config.sum_column.unit ? ` ${config.sum_column.unit}` : ''}
          </>
        ) : null}
      </div>
    </div>
  );
}

// Plan 2b Task 9 replaces this with the rows×cols matrix editor over `col.grid`.
function GridCell() {
  return <span data-testid="grid-pending" className="text-subtext">—</span>;
}

function numberOrNull(s: string): number | null {
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** One branch per column type; aria-label = `col.aria_label ?? col.label`. */
function Cell({ col, row, readOnly, listId, overridden, tableValue, valueColumn, policy, tableRows, isApplies, onChange, onSelectKey }: {
  col: RegisterColumn;
  row: PreparedRow;
  readOnly: boolean;
  listId?: string;
  overridden: boolean;
  tableValue: Value | undefined;
  /** The regulation-table value column behind a lookup_value column (I-4: type + printed alternatives). */
  valueColumn?: ValueColumn;
  policy?: OverridePolicy | null;
  tableRows: readonly RegulationRow[];
  isApplies: boolean;
  onChange: (v: Value) => void;
  onSelectKey: (v: string) => void;
}) {
  const v = row.values[col.key];
  const aria = col.aria_label ?? col.label;
  switch (col.type) {
    case 'boolean':
      return <input type="checkbox" checked={v === true} disabled={readOnly} aria-label={aria} onChange={(e) => onChange(e.target.checked)} className="mt-1" />;
    case 'number':
      return (
        <>
          <input
            type="number" inputMode="decimal" step="any" min={col.min} max={col.max}
            value={typeof v === 'number' ? v : ''} disabled={readOnly} aria-label={aria} placeholder={col.placeholder}
            onChange={(e) => onChange(numberOrNull(e.target.value))}
            className={`${cellInput} text-right tabular-nums`}
          />
          {typeof v === 'number' && col.min !== undefined && v < col.min && (
            <div className="text-[10px] text-warning mt-1">{col.label} muss ≥ {col.min} sein</div>
          )}
          {typeof v === 'number' && col.max !== undefined && v > col.max && (
            <div className="text-[10px] text-warning mt-1">{col.label} muss ≤ {col.max} sein</div>
          )}
        </>
      );
    case 'date':
      return <input type="date" value={typeof v === 'string' ? v : ''} disabled={readOnly} aria-label={aria} onChange={(e) => onChange(e.target.value || null)} className={cellInput} />;
    case 'enum': {
      // SR-1: options + labels come from the config (which mirrors the source), never typed here.
      const opts = (col.options ?? []).map((o) => ({ value: o, label: col.option_labels?.[o] ?? col.value_labels?.[o] ?? o }));
      if (col.sort_by_label) opts.sort((a, b) => a.label.localeCompare(b.label));
      return (
        <>
          <select value={typeof v === 'string' ? v : ''} disabled={readOnly} aria-label={aria} onChange={(e) => onChange(e.target.value || null)} className={cellInput}>
            <option value="" disabled={!!col.required}>— wählen —</option>
            {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {col.required && v == null && <div data-testid={`reselect-${col.key}`} className="text-[10px] text-warning mt-1">⚠ {col.label} wählen</div>}
        </>
      );
    }
    case 'lookup_key': {
      const tl = tableLabel(col.lookup?.table_code ?? '');
      return (
        <>
          <select aria-label={aria} value={typeof v === 'string' ? v : ''} disabled={readOnly} onChange={(e) => onSelectKey(e.target.value)} className={cellInput}>
            <option value="" disabled>— wählen —</option>
            {groupRows(tableRows, col.lookup?.group_by).map((g) => g.label == null
              ? g.rows.map((tr) => <option key={tr.row_key} value={tr.row_key}>{tr.label_de}</option>)
              : (
                <optgroup key={g.label} label={g.label}>
                  {g.rows.map((tr) => <option key={tr.row_key} value={tr.row_key}>{tr.label_de}</option>)}
                </optgroup>
              ))}
          </select>
          {v == null && <div data-testid={`reselect-${col.key}`} className="text-[10px] text-warning mt-1">⚠ {col.label} neu wählen ({tl})</div>}
        </>
      );
    }
    case 'lookup_value': {
      const tl = tableLabel(col.lookup?.table_code ?? '');
      const mismatch = v != null && v !== '' && tableValue !== undefined && v !== tableValue;
      const label = `${col.label} (${policy === 'messwert' ? 'Messwert' : 'abweichend'})`;
      // The override control follows the value column: `kann` ⇒ select over the printed alternatives; a string/enum
      // column ⇒ text input (never a number input over a non-numeric cell); else number input.
      const numeric = valueColumn ? valueColumn.type === 'number' : typeof tableValue !== 'string';
      // wave B defect 6 (`a178-O-4`): the ROW's printed alternatives win over the value
      // column's table-wide list; `printedAlternatives` is the single rule (shared with LookupFillField).
      const tableRow = col.lookup?.key_column ? tableRows.find((t) => t.row_key === row.values[col.lookup!.key_column!]) : undefined;
      const alternatives = policy === 'kann' ? printedAlternatives(tableRow, valueColumn) : null;
      // wave B defect 3 (`m1200_2-I-2`): the override flag suppresses `refillLookupValues`
      // for the WHOLE row, so a lookup_value column the override does not claim keeps a stale
      // value (or stays blank) with no signal. Keep the engineer's value — say what the table
      // holds now. Non-blocking, and never rendered for the editable override cells (their
      // "Tab. N: …" line under the key column already prints the current table values).
      const staleTable = overridden && !isApplies && tableValue !== undefined && v !== tableValue;
      return (
        <>
          {overridden && isApplies ? (
            alternatives ? (
              <select aria-label={label} value={v == null ? '' : String(v)} disabled={readOnly} onChange={(e) => { if (e.target.value === '') return; onChange(numeric ? Number(e.target.value) : e.target.value); }} className={cellInput}>
                {v == null && <option value="">— wählen —</option>}
                {alternatives.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            ) : numeric ? (
              <input
                type="number" inputMode="decimal" step="any" min={col.min} max={col.max}
                aria-label={label} value={typeof v === 'number' ? v : ''} disabled={readOnly}
                onChange={(e) => onChange(numberOrNull(e.target.value))}
                className={`${cellInput} text-right tabular-nums`}
              />
            ) : (
              <input type="text" aria-label={label} value={typeof v === 'string' ? v : ''} disabled={readOnly} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)} className={cellInput} />
            )
          ) : (
            <span data-testid={`lookup-value-${col.key}`} className="font-mono text-ink">{fmt(v)}</span>
          )}
          {mismatch && <div data-testid={`mismatch-${col.key}`} className="text-[10px] text-warning">{col.label} weicht von {tl} ab</div>}
          {staleTable && (
            <div data-testid={`table-stale-${col.key}`} className="text-[10px] text-warning">
              {tl}: {fmt(tableValue)} — nicht übernommen (Zeile abweichend)
            </div>
          )}
        </>
      );
    }
    case 'derived': {
      const label = v == null ? null : (col.value_labels?.[String(v)] ?? fmt(v));
      if (col.display === 'badge') {
        return label ? <div data-testid={`derived-badge-${col.key}`} className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-1">{label}</div> : null;
      }
      return <span data-testid={`derived-${col.key}`} className="font-mono text-sm text-ink">{label ?? <span className="text-subtext">—</span>}</span>;
    }
    case 'grid':
      return <GridCell />;
    default:
      return (
        <input
          type="text" value={typeof v === 'string' ? v : ''} disabled={readOnly} aria-label={aria} list={listId} placeholder={col.placeholder}
          onChange={(e) => onChange(e.target.value)} className={cellInput}
        />
      );
  }
}

/** Per-row override reason (I-4): "Begründung fehlt" until the reason for the CURRENT overridden values is saved
 * through `recordManualOverride`; the form itself renders only with a project id (no audit path without one). */
function RowOverrideReason({ storeKey, justified, projectId, fieldId, equationNumber }: {
  storeKey: string; justified: Record<string, Value>; projectId?: string; fieldId: string; equationNumber: string;
}) {
  const state = useOverrideReason(storeKey, justified);
  return (
    <div className="mt-1 space-y-1 text-[10px]">
      {!state.savedReason && <ReasonMissing testId="register-reason-missing" />}
      {projectId && <OverrideReasonForm state={state} onSubmit={() => state.submit({ projectId, fieldId, equationNumber })} />}
    </div>
  );
}

/**
 * Read-only mirror of a register carrier for consumer worksheets (port of the
 * A138-07 `ReadOnlySurfaceTable` in worksheet-form.tsx, generalised). No inputs,
 * no store access, no arithmetic — derived cells come from `prepareRegisterRows`.
 */
export function ReadOnlyRegisterTable({ config, carrier, standardCode, symbol }: { config: RegisterUiConfig; carrier: unknown; standardCode: string; symbol: string }) {
  const { table, tableRows } = useTables(standardCode);
  const prepared = useMemo(
    () => prepareRegisterRows(carrier, config.columns, { table, tableRows }, {
      legacyMap: config.legacy_map,
      flagKeys: registerFlagKeys(symbol, config),
      overrideFlagKey: config.override?.flag_key,
      overrideAppliesTo: config.override?.applies_to,
    }),
    [carrier, config, table, tableRows, symbol],
  );
  const columns = config.columns.filter((c) => c.key !== config.override?.flag_key && !(c.type === 'derived' && c.display === 'badge'));
  if (prepared.rows.length === 0) return <p className="text-sm text-subtext">Keine Zeilen erfasst.</p>;

  const text = (r: PreparedRow, c: RegisterColumn): string => {
    // Column visible_when in ROW scope (same rule as the editor): a hidden cell renders empty.
    if (cellHiddenInRow(c, r, NO_SYMBOL, table)) return '';
    const v = r.values[c.key];
    switch (c.type) {
      case 'lookup_key': return typeof v === 'string' ? (tableRows(c.lookup?.table_code ?? '')?.find((tr) => tr.row_key === v)?.label_de ?? '—') : '—';
      case 'boolean': return v === true ? 'Ja' : 'Nein';
      case 'enum': return typeof v === 'string' ? (c.option_labels?.[v] ?? c.value_labels?.[v] ?? v) : '—';
      case 'derived': return v == null ? '—' : (c.value_labels?.[String(v)] ?? fmt(v));
      case 'grid': return '—';
      default: return fmt(v);
    }
  };

  return (
    <div className="overflow-x-auto" data-testid="register-readonly" data-symbol={symbol}>
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-subtext border-b border-hairline">
            {columns.map((c) => (
              <th key={c.key} className={`pr-4 pb-1 font-normal ${isRightAligned(c) ? 'text-right' : ''}`}>{c.label}{c.unit ? ` (${c.unit})` : ''}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {prepared.rows.map((r) => (
            <tr key={r.id} className="border-b border-hairline last:border-b-0">
              {columns.map((c) => (
                <td key={c.key} className={`pr-4 py-1 text-ink ${isRightAligned(c) ? 'font-mono tabular-nums text-right' : ''}`}>{text(r, c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
