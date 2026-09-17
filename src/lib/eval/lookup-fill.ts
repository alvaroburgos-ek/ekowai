/**
 * `lookup_fill` widget — pure resolution (Plan 2b, Task 7).
 *
 * A `lookup_fill` field carries a `LookupBinding` (table_code, role
 * value|limit, keys[{column, from_symbol}], value column). The table row is
 * the single source of the figure: this module DERIVES `{ tableValue, policy,
 * row }` at render time from the registered `regulation_tables` (DB rows
 * registered by the page, TS seed as the deploy-before-seed fallback) and the
 * worksheet's current symbol values. Nothing here persists a table cell —
 * `override` is `stored !== tableValue` (derived), and the engineer's REASON
 * for an override goes through the existing `recordManualOverride` audit path
 * (`audit_log`, `equationNumber = 'lookup:<TABLE_CODE>'`). Sign-off D-2b-2
 * records that the spec's "sidecar {table_value, override, reason}" is read as
 * semantics, not storage.
 *
 * Ownership is NOT decided here — the widget (lookup-fill-field.tsx) asks the
 * form's `computedSymbols` / `serverComputedSet` whether a server materialiser
 * owns the symbol (display mode) or nobody does (fill mode).
 */
import { parseFieldConfig, type LookupBinding, type LookupFillUiConfig } from './field-config';
import { resolveRegulationTable } from './regulation-tables-fallback';
import { getTable, type RegulationRow, type RegulationTable, type ValueColumn } from './regulation-tables';
import type { Value } from '@/lib/expr';

/** 'TAB9' → 'Tab. 9', 'TAB22' → 'Tab. 22', 'TAB5a' → 'Tab. 5a'; anything else verbatim. (Canonical home; register-editor re-exports.) */
export function tableLabel(code: string): string {
  const m = /^TAB(\d+[A-Za-z]?)$/.exec(code);
  return m ? `Tab. ${m[1]}` : code;
}

/**
 * Symbol-keyed bindings consulted ONLY while `fields.widget IS NULL`.
 * Retired by scripts/migrations/20260916160000_a138_12_ac_as_ratio_limit_lookup_fill.sql
 * — GATED on sign-off D-2b-3: `tab6_tier` / `bbz_band` are not fields yet, so until they
 * exist the widget renders `ac_as_ratio_limit` in DISPLAY mode with a keys_missing badge
 * and the server materialiser (materialize-tab6-loading.ts) stays the only producer.
 * SR-1: the binding names the table and its columns only — the limit figures live in the
 * TAB6 rows.
 */
export const LOOKUP_BINDINGS_FALLBACK: Readonly<Record<string, LookupBinding>> = {
  ac_as_ratio_limit: {
    table_code: 'TAB6',
    role: 'limit',
    keys: [
      { column: 'tier', from_symbol: 'tab6_tier' },
      { column: 'bbz_band', from_symbol: 'bbz_band' },
    ],
    value: 'max',
  },
};

export type LookupFillConfig = { binding: LookupBinding; ui: LookupFillUiConfig | null };

/**
 * Binding + presentation config for a field. A DB row with `widget = 'lookup_fill'` is
 * authoritative (parsed through the zod contract; invalid ⇒ null, never a throw — the
 * widget then falls through to the dynamic input). The TS fallback is consulted only
 * while `widget IS NULL`; any other explicit widget ⇒ null.
 */
export function resolveLookupFillConfig(f: { symbol: string; widget?: string | null; uiConfig?: unknown; lookup?: unknown }): LookupFillConfig | null {
  if (f.widget != null) {
    if (f.widget !== 'lookup_fill') return null;
    try {
      const cfg = parseFieldConfig({ widget: 'lookup_fill', uiConfig: f.uiConfig ?? null, lookup: f.lookup ?? null, visibleWhen: null });
      return cfg.lookup ? { binding: cfg.lookup, ui: (cfg.ui as LookupFillUiConfig | null) ?? null } : null;
    } catch {
      return null;
    }
  }
  const fallback = LOOKUP_BINDINGS_FALLBACK[f.symbol];
  return fallback ? { binding: fallback, ui: null } : null;
}

export function resolveLookupFillBinding(f: { symbol: string; widget?: string | null; lookup?: unknown }): LookupBinding | null {
  return resolveLookupFillConfig(f)?.binding ?? null;
}

export type LookupFillState =
  | { kind: 'resolved'; tableValue: number | string | boolean | null; row: RegulationRow; policy: RegulationTable['override_policy']; label: string; valueColumn: ValueColumn | undefined }
  | { kind: 'keys_missing'; missing: string[]; label: string }
  | { kind: 'no_row'; keys: Value[]; label: string }
  | { kind: 'no_table'; label: string };

const isMissing = (v: Value | undefined): boolean => v === undefined || v === null || v === '';

/**
 * Resolve the bound table row from the worksheet's symbol values. Rows are matched by
 * COLUMN NAME (`binding.keys[].column` against `row.keys`), never positionally — a key
 * column the table does not have can therefore never match a row. An `edition` pin on
 * the binding resolves that edition only (registry first, then the seed if it carries it).
 */
export function resolveLookupFill(binding: LookupBinding, standardCode: string, symbolLookup: (sym: string) => Value | undefined): LookupFillState {
  const label = tableLabel(binding.table_code);
  const t = resolveTable(binding, standardCode);
  if (!t) return { kind: 'no_table', label };
  const missing = binding.keys.filter((k) => isMissing(symbolLookup(k.from_symbol))).map((k) => k.from_symbol);
  if (missing.length) return { kind: 'keys_missing', missing, label };
  const keys = binding.keys.map((k) => symbolLookup(k.from_symbol) as Value);
  const want = binding.keys.map((k, i) => [k.column, String(keys[i])] as const);
  const row = t.rows.find((r) => want.every(([col, v]) => col in r.keys && String(r.keys[col]) === v));
  if (!row) return { kind: 'no_row', keys, label };
  const raw = row.values[binding.value];
  const tableValue = raw === undefined ? null : raw;
  return { kind: 'resolved', tableValue, row, policy: t.override_policy, label, valueColumn: t.value_columns.find((c) => c.name === binding.value) };
}

function resolveTable(binding: LookupBinding, standardCode: string): RegulationTable | undefined {
  if (!binding.edition) return resolveRegulationTable(standardCode, binding.table_code);
  // Edition pin: the registry entry for exactly that edition, else the latest/seed table only when it IS that edition.
  const pinned = getTable(standardCode, binding.edition, binding.table_code);
  if (pinned) return pinned;
  const t = resolveRegulationTable(standardCode, binding.table_code);
  return t?.edition === binding.edition ? t : undefined;
}

