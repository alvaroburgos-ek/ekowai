/**
 * Generic register (row-set) preparation for the expression engine.
 *
 * Turns a raw json carrier (`{ rows: [...], <flag>: bool }`) plus its
 * `RegisterColumn[]` contract into a `PreparedRegister`: typed cells,
 * legacy-shape replay, lookup_value refill from the regulation table,
 * derived cells via `evalValue` in row scope, and per-row completeness.
 * Generalises `surface-inventory.ts` (normalizeSurfaceCarrier / rowComplete)
 * and `pollutant-register.ts` (normalizePollutantCarrier /
 * pollutantRowComplete) without changing their behaviour.
 */
import { parseExpression, evalValue, evalCondition, ExprError, type PreparedRegister, type PreparedRow, type RowValues, type Scope, type Value } from '@/lib/expr';
import type { RegulationRow } from './regulation-tables';
import type { RegisterColumn } from './field-config';
import { resolveRegisterConfig, registerFlagKeys } from './register-configs';
import { makeTableLookup, makeTableRows } from './regulation-tables-fallback';

export type RegisterRowsCtx = {
  table?: Scope['table'];
  tableRows?: (tableCode: string) => RegulationRow[] | undefined;
  symbol?: Scope['symbol'];
};
export type RegisterRowsOpts = {
  legacyMap?: Record<string, Record<string, string>>;
  flagKeys?: readonly string[];
  overrideFlagKey?: string;
  /** `override.applies_to` of the register config. Legacy replay derives the override flag from its FIRST
   * column only (surface-inventory.ts:103: `coeff_override = c_i !== entry.cm`); absent ⇒ first bound lookup_value column. */
  overrideAppliesTo?: readonly string[];
};

function genId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function num(v: unknown): number | null { return typeof v === 'number' && Number.isFinite(v) ? v : null; }
function str(v: unknown): string | null { return typeof v === 'string' && v.length > 0 ? v : null; }
function isPlainObject(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null && !Array.isArray(v); }

/** Cell count of a grid carrier `{ cells: Record<row, Record<col, Value>> }` (A3). */
function gridCellCount(v: unknown): number {
  if (!isPlainObject(v) || !isPlainObject(v.cells)) return 0;
  let n = 0;
  for (const row of Object.values(v.cells)) if (isPlainObject(row)) n += Object.keys(row).length;
  return n;
}

function coerce(raw: unknown, c: RegisterColumn): Value {
  switch (c.type) {
    case 'number': return num(raw);
    case 'boolean': return raw === true;
    case 'enum': { const s = str(raw); return s !== null && (!c.options || c.options.includes(s)) ? s : null; }
    case 'date': return str(raw);
    case 'lookup_key': return str(raw);
    case 'lookup_value': { const n = num(raw); return n !== null ? n : str(raw); }
    case 'derived': return null;                         // never stored; computed below
    // A3: a grid cell keeps its plain-object carrier as-is (the `Value` union
    // has no object member; the cast is deliberate — the evaluator never
    // reads a grid cell as a scalar, `cell()` reads the carrier).
    case 'grid': return isPlainObject(raw) ? (raw as unknown as Value) : null;
    default: return typeof raw === 'string' ? raw : '';  // text
  }
}

/** Legacy replay (generalises surface-inventory.ts:85-104). Acts only on rows carrying NONE of the
 * register's lookup_key column keys and no override flag ("legacy shape"). For each lookup_key column:
 * (a) legacyMap[sourceKey][rawValue] when the raw row has sourceKey; else (b) the UNIQUE table row whose
 * lookup_value cells all equal the row's stored values; (c) otherwise leave the key null (reselection).
 * When mapped: keep stored lookup_value cells, fill missing ones from the table row, set the override
 * flag to (stored !== table value) for the FIRST `overrideAppliesTo` column only (legacy rule: c_i decides,
 * a differing c_s alone is not an override — surface-inventory.ts:103); without applies_to, the first bound
 * lookup_value column of the key decides. */
function replayLegacy(raw: Record<string, unknown>, values: RowValues, columns: readonly RegisterColumn[], ctx: RegisterRowsCtx, opts: RegisterRowsOpts): void {
  const keyCols = columns.filter((c) => c.type === 'lookup_key');
  if (keyCols.length === 0) return;
  const isLegacy = keyCols.every((c) => !(c.key in raw)) && (!opts.overrideFlagKey || !(opts.overrideFlagKey in raw));
  if (!isLegacy) return;
  for (const kc of keyCols) {
    const tableCode = kc.lookup!.table_code;
    const valueCols = columns.filter((c) => c.type === 'lookup_value' && c.lookup?.table_code === tableCode && c.lookup.key_column === kc.key && c.lookup.value);
    let mapped: string | null = null;
    for (const [sourceKey, map] of Object.entries(opts.legacyMap ?? {})) {
      const rawVal = raw[sourceKey];
      if (typeof rawVal === 'string' && map[rawVal]) { mapped = map[rawVal]; break; }
    }
    if (mapped === null) {
      const rows = ctx.tableRows?.(tableCode) ?? [];
      const hits = rows.filter((r) => valueCols.every((vc) => values[vc.key] !== null && r.values[vc.lookup!.value!] === values[vc.key]));
      if (hits.length === 1) mapped = hits[0].row_key;
    }
    if (mapped === null) continue;
    const tableRow = ctx.tableRows?.(tableCode)?.find((r) => r.row_key === mapped);
    if (!tableRow) continue;
    values[kc.key] = mapped;
    const flagCol = valueCols.find((vc) => vc.key === opts.overrideAppliesTo?.[0]) ?? valueCols[0];
    let differs = false;
    for (const vc of valueCols) {
      const tv = tableRow.values[vc.lookup!.value!] as Value;
      if (values[vc.key] === null) values[vc.key] = tv; else if (vc === flagCol && values[vc.key] !== tv) differs = true;
    }
    if (opts.overrideFlagKey) values[opts.overrideFlagKey] = differs;
  }
}

/** A null lookup_value cell is filled from the table when its key is set and the row is not overridden.
 * A NON-null cell is never overwritten here (the editor refills on key change — Plan 2b; the engine must
 * not clobber an audited override even if the flag was lost). */
function refillLookupValues(values: RowValues, columns: readonly RegisterColumn[], ctx: RegisterRowsCtx, opts: RegisterRowsOpts): void {
  const overridden = opts.overrideFlagKey ? values[opts.overrideFlagKey] === true : false;
  for (const c of columns) {
    if (c.type !== 'lookup_value' || !c.lookup?.key_column || !c.lookup.value) continue;
    if (values[c.key] !== null || overridden) continue;
    const key = values[c.lookup.key_column];
    if (key === null || key === undefined) continue;
    values[c.key] = (ctx.table?.(c.lookup.table_code, [key])?.[c.lookup.value] ?? null) as Value;
  }
}

/** A2: a column whose `visible_when` evaluates to `fail` in ROW scope is not part of the row's
 * completeness. Only `fail` hides — pass / pending / manual keep the column (conservative).
 * Row keys shadow worksheet symbols even when the cell is null (`s in values`, the evaluator's readSymbol rule),
 * so a same-named worksheet symbol can never decide a column's visibility for a row that carries the key.
 * The row scope carries `ctx.table` so a `visible_when` may use `lookup()`. */
function columnHiddenInRow(c: RegisterColumn, values: RowValues, ctx: RegisterRowsCtx): boolean {
  if (!c.visible_when) return false;
  const r = evalCondition(c.visible_when, { symbol: (s) => (s in values ? values[s] : ctx.symbol?.(s)), table: ctx.table });
  return r.kind === 'fail';
}

function isComplete(values: RowValues, columns: readonly RegisterColumn[], ctx: RegisterRowsCtx): boolean {
  for (const c of columns) {
    if (c.type === 'derived') continue;
    if (columnHiddenInRow(c, values, ctx)) continue;
    const v = values[c.key];
    if (c.type === 'grid') {
      if (c.required && gridCellCount(v) < 1) return false;
      continue;
    }
    if (c.required && (v === null || v === undefined || v === '')) return false;
    if (c.type === 'number' && typeof v === 'number') {
      if (c.min !== undefined && v < c.min) return false;
      if (c.max !== undefined && v > c.max) return false;
    }
  }
  return true;
}

export function prepareRegisterRows(carrierRaw: unknown, columns: readonly RegisterColumn[], ctx: RegisterRowsCtx, opts: RegisterRowsOpts = {}): PreparedRegister {
  if (!carrierRaw || typeof carrierRaw !== 'object') return { rows: [], flags: {} };
  const v = carrierRaw as Record<string, unknown>;
  const flags: Record<string, boolean> = {};
  for (const k of opts.flagKeys ?? []) flags[k] = v[k] === true;
  if (!Array.isArray(v.rows)) return { rows: [], flags };
  const scope: Scope = { symbol: ctx.symbol ?? (() => undefined), table: ctx.table };
  let diagnostics: string[] | undefined;
  // A derived expression that does not parse (syntax error, or nesting beyond the
  // parser budget — parseExpression already turns a RangeError into null) yields
  // a null cell in every row and ONE diagnostic per column, never an escape.
  const derived = columns.filter((c) => c.type === 'derived').map((c) => {
    const node = parseExpression(c.expr!);
    if (node === null) (diagnostics ??= []).push(`${c.key}: Ausdruck nicht auswertbar (Syntax)`);
    return { c, node };
  });
  const rows: PreparedRow[] = [];
  for (const raw of v.rows) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const values: RowValues = {};
    for (const c of columns) values[c.key] = coerce(r[c.key], c);
    replayLegacy(r, values, columns, ctx, opts);
    refillLookupValues(values, columns, ctx, opts);
    for (const { c, node } of derived) {
      // Strict mode throws on a missing input / no lookup row: a derived cell that cannot be computed is
      // null, never an exception for the caller. A RECOVERABLE ExprError is a normal data condition (missing
      // input) and stays silent; a non-recoverable one (malformed expression for its context, e.g. a column
      // typo in lookup()) or any other error is still null but is reported in `diagnostics`.
      try {
        values[c.key] = node ? evalValue(node, scope, values) : null;
      } catch (e) {
        values[c.key] = null;
        if (e instanceof ExprError && e.recoverable) continue;
        (diagnostics ??= []).push(`${c.key}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    rows.push({ id: str(r.id) ?? genId(), values, complete: isComplete(values, columns, ctx) });
  }
  return diagnostics ? { rows, flags, diagnostics } : { rows, flags };
}

export type RegisterFieldMeta = { id: string; symbol: string; dataType: string; widget?: string | null; uiConfig?: unknown };

/**
 * Plan 2a (fix round 1): the ONE register builder shared by the client hook,
 * the report evaluator, the snapshot builder and the PDF assembler. For every
 * field that resolves to a register config (DB `widget='register'` + ui_config,
 * or the TS fallback keyed by symbol while widget is NULL) AND holds a json
 * value (`jsonOf` returns `undefined`/`null` when absent) it prepares the rows
 * with the full option set. `ctx.symbol` backs a derived column's worksheet
 * symbol references (G-13) and must return `undefined` for unknown names.
 * `ctx.standardCode` selects the regulation tables; `undefined` is passed
 * through to the standard-less unique-code resolution (regulation-tables-fallback).
 */
export function buildRegisters(
  fields: ReadonlyArray<RegisterFieldMeta>,
  jsonOf: (fieldId: string) => unknown,
  ctx: { standardCode?: string; symbol: (s: string) => Value | undefined },
): Record<string, PreparedRegister> {
  const table = makeTableLookup(ctx.standardCode);
  const tableRows = makeTableRows(ctx.standardCode);
  const out: Record<string, PreparedRegister> = {};
  for (const f of fields) {
    const raw = jsonOf(f.id);
    if (raw === undefined || raw === null) continue;
    const cfg = resolveRegisterConfig(f);
    if (!cfg) continue;
    out[f.symbol] = prepareRegisterRows(raw, cfg.columns, { table, tableRows, symbol: ctx.symbol }, {
      legacyMap: cfg.legacy_map,
      flagKeys: registerFlagKeys(f.symbol, cfg),
      overrideFlagKey: cfg.override?.flag_key,
      overrideAppliesTo: cfg.override?.applies_to,
    });
  }
  return out;
}
