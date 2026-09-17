/**
 * Plan 2b Task 7 — pure resolution for the `lookup_fill` widget.
 *
 * SR-1: no limit figure is typed here. The TAB6 pin asserts ACCESSOR PARITY
 * with `tab6Limit` (the server producer's own path, tab6-loading.ts) — if the
 * seed changes, both sides move together.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveLookupFill,
  resolveLookupFillBinding,
  resolveLookupFillConfig,
  isOverridden,
  tableLabel,
  LOOKUP_BINDINGS_FALLBACK,
} from '../lookup-fill';
import { tab6Limit } from '../tab6-loading';
import { clearTables, registerTables } from '../regulation-tables';
import { tab6AsTable } from '../regulation-tables-seed-a138';

const STD = 'DWA-A-138-1';

describe('resolveLookupFill against the A138 seed tables', () => {
  it('resolves TAB6 (tier2, thick) to the seeded max with policy locked', () => {
    const b = { table_code: 'TAB6', role: 'limit' as const, keys: [{ column: 'tier', from_symbol: 'tab6_tier' }, { column: 'bbz_band', from_symbol: 'bbz_band' }], value: 'max' };
    const s = resolveLookupFill(b, STD, (sym) => ({ tab6_tier: 'tier2', bbz_band: 'thick' } as Record<string, string>)[sym]);
    expect(s.kind).toBe('resolved');
    if (s.kind !== 'resolved') return;
    expect(s.policy).toBe('locked');
    expect(s.label).toBe('Tab. 6');
    // Accessor parity, not a typed constant (tab6-loading.ts:79 — same TAB6 row).
    expect(s.tableValue).toBe((tab6Limit('tier2', 0.3) as { max: number }).max);
    expect(s.row.row_key).toBe('tier2|thick');
    expect(s.row.verbatim_quote).toMatch(/^Tab\. 6:/);
    expect(s.valueColumn?.name).toBe('max');
  });

  it('matches rows by COLUMN NAME, so a binding listing the keys in another order still resolves', () => {
    const b = { table_code: 'TAB6', role: 'limit' as const, keys: [{ column: 'bbz_band', from_symbol: 'bbz_band' }, { column: 'tier', from_symbol: 'tab6_tier' }], value: 'max' };
    const s = resolveLookupFill(b, STD, (sym) => ({ tab6_tier: 'tier3', bbz_band: 'thin' } as Record<string, string>)[sym]);
    expect(s).toMatchObject({ kind: 'resolved', tableValue: (tab6Limit('tier3', 0.2) as { max: number }).max });
  });

  it('reports missing keys by symbol and a missing row by key values', () => {
    const b = LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit;
    expect(resolveLookupFill(b, STD, () => undefined)).toMatchObject({ kind: 'keys_missing', missing: ['tab6_tier', 'bbz_band'], label: 'Tab. 6' });
    // null and '' count as missing too (an unset enum select is '').
    expect(resolveLookupFill(b, STD, (s) => (s === 'tab6_tier' ? 'tier2' : ''))).toMatchObject({ kind: 'keys_missing', missing: ['bbz_band'] });
    expect(resolveLookupFill(b, STD, (s) => (s === 'tab6_tier' ? 'tier9' : 'thin'))).toMatchObject({ kind: 'no_row', keys: ['tier9', 'thin'] });
    expect(resolveLookupFill({ ...b, table_code: 'TAB99' }, STD, () => 'x')).toMatchObject({ kind: 'no_table', label: 'Tab. 99' });
  });

  it('a binding whose value column is not on the row resolves to tableValue null (never a guessed figure)', () => {
    const b = { ...LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit, value: 'nope' };
    const s = resolveLookupFill(b, STD, (sym) => ({ tab6_tier: 'tier2', bbz_band: 'thick' } as Record<string, string>)[sym]);
    expect(s).toMatchObject({ kind: 'resolved', tableValue: null });
  });

  it('a binding key column that is not a key column of the table ⇒ no_row (no positional guessing)', () => {
    const b = { table_code: 'TAB6', role: 'limit' as const, keys: [{ column: 'tier', from_symbol: 'tab6_tier' }, { column: 'wrong', from_symbol: 'bbz_band' }], value: 'max' };
    const s = resolveLookupFill(b, STD, (sym) => ({ tab6_tier: 'tier2', bbz_band: 'thick' } as Record<string, string>)[sym]);
    expect(s.kind).toBe('no_row');
  });

  it('TAB9 (policy anhaltswert) exposes the value column with its printed alternatives when present', () => {
    const b = { table_code: 'TAB9', role: 'value' as const, keys: [{ column: 'surface_type', from_symbol: 'surface_type' }], value: 'kind' };
    const s = resolveLookupFill(b, STD, () => 'schwarzdecke_asphalt');
    expect(s.kind).toBe('resolved');
    if (s.kind !== 'resolved') return;
    expect(s.policy).toBe('anhaltswert');
    expect(s.valueColumn?.values).toEqual(['paved', 'unpaved']);
  });

  it('reads the registry (DB rows) before the TS seed, with the edition pin honoured', () => {
    try {
      const t = tab6AsTable();
      registerTables([{ ...t, edition: '2099-01', rows: t.rows.map((r) => ({ ...r, values: { max: 7 } })) }]);
      const b = LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit;
      const lookup = (sym: string) => ({ tab6_tier: 'tier2', bbz_band: 'thick' } as Record<string, string>)[sym];
      expect(resolveLookupFill(b, STD, lookup)).toMatchObject({ kind: 'resolved', tableValue: 7 });
      // An edition pin that is not registered falls to the seed only when the seed carries that edition — here it does not ⇒ no_table.
      expect(resolveLookupFill({ ...b, edition: '1999-01' }, STD, lookup)).toMatchObject({ kind: 'no_table' });
      expect(resolveLookupFill({ ...b, edition: '2099-01' }, STD, lookup)).toMatchObject({ kind: 'resolved', tableValue: 7 });
    } finally {
      clearTables();
    }
  });
});

describe('binding resolution: DB wins, fallback only while widget IS NULL', () => {
  it('fallback for ac_as_ratio_limit while widget IS NULL; null for any explicit non-lookup widget', () => {
    expect(resolveLookupFillBinding({ symbol: 'ac_as_ratio_limit', widget: null })).toEqual(LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit);
    expect(resolveLookupFillBinding({ symbol: 'ac_as_ratio_limit', widget: undefined })).toEqual(LOOKUP_BINDINGS_FALLBACK.ac_as_ratio_limit);
    expect(resolveLookupFillBinding({ symbol: 'ac_as_ratio_limit', widget: 'scalar' })).toBeNull();
    expect(resolveLookupFillBinding({ symbol: 'other', widget: null })).toBeNull();
  });
  it('DB binding (widget lookup_fill) wins and parses through the zod contract; an invalid one is null, never a throw', () => {
    expect(resolveLookupFillBinding({ symbol: 'e', widget: 'lookup_fill', lookup: { table_code: 'TAB3', role: 'value', keys: [{ column: 'auffangflaechen_art', from_symbol: 'auffangflaechen_art' }], value: 'e' } })?.table_code).toBe('TAB3');
    expect(resolveLookupFillBinding({ symbol: 'e', widget: 'lookup_fill', lookup: { table_code: 'TAB3' } })).toBeNull();
    expect(resolveLookupFillBinding({ symbol: 'e', widget: 'lookup_fill', lookup: null })).toBeNull();
    // A DB row with widget lookup_fill NEVER falls back to the TS table, even for a fallback symbol.
    expect(resolveLookupFillBinding({ symbol: 'ac_as_ratio_limit', widget: 'lookup_fill', lookup: null })).toBeNull();
  });
  it('resolveLookupFillConfig carries the ui presentation keys (reason_min_length, source_label) alongside the binding', () => {
    const cfg = resolveLookupFillConfig({
      symbol: 'e', widget: 'lookup_fill', uiConfig: { reason_min_length: 25, source_label: 'DIN 1989-1 Tab. 3' },
      lookup: { table_code: 'TAB3', role: 'value', keys: [{ column: 'k', from_symbol: 'k' }], value: 'e' },
    });
    expect(cfg?.ui).toEqual({ reason_min_length: 25, source_label: 'DIN 1989-1 Tab. 3' });
    expect(cfg?.binding.table_code).toBe('TAB3');
    expect(resolveLookupFillConfig({ symbol: 'ac_as_ratio_limit', widget: null, uiConfig: null, lookup: null })?.ui).toBeNull();
    // An invalid ui_config invalidates the whole config (parseFieldConfig throws ⇒ null). Fix round 1: the zod floor
    // is the server action's own minimum (10) — a smaller reason_min_length could never be satisfied server-side.
    const lookup = { table_code: 'TAB3', role: 'value', keys: [{ column: 'k', from_symbol: 'k' }], value: 'e' };
    expect(resolveLookupFillConfig({ symbol: 'e', widget: 'lookup_fill', uiConfig: { reason_min_length: 0 }, lookup })).toBeNull();
    expect(resolveLookupFillConfig({ symbol: 'e', widget: 'lookup_fill', uiConfig: { reason_min_length: 5 }, lookup })).toBeNull();
    expect(resolveLookupFillConfig({ symbol: 'e', widget: 'lookup_fill', uiConfig: { reason_min_length: 10 }, lookup })?.ui).toEqual({ reason_min_length: 10 });
  });
});

describe('isOverridden is derived, never stored', () => {
  it('resolved && stored != null && stored !== tableValue', () => {
    const s = { kind: 'resolved' as const, tableValue: 0.8, row: {} as never, policy: 'anhaltswert' as const, label: 'Tab. 3', valueColumn: undefined };
    expect(isOverridden(s, 0.8)).toBe(false);
    expect(isOverridden(s, 0.6)).toBe(true);
    expect(isOverridden(s, null)).toBe(false);
    expect(isOverridden({ kind: 'no_table', label: 'Tab. 3' }, 0.6)).toBe(false);
    expect(isOverridden({ kind: 'keys_missing', missing: ['k'], label: 'Tab. 3' }, 0.6)).toBe(false);
  });
});

describe('tableLabel', () => {
  it('TABn ⇒ Tab. n; anything else verbatim', () => {
    expect(tableLabel('TAB6')).toBe('Tab. 6');
    expect(tableLabel('TAB5a')).toBe('Tab. 5a');
    expect(tableLabel('Table 1')).toBe('Table 1');
  });
});
