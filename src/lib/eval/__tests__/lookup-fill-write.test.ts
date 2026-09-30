/**
 * A2/A3 (2026-09-30) — what the save path does with a `lookup_fill` value.
 *
 * A2: "The type had been picked in the browser and cleared again (stored value
 * NULL), yet the four Tab.-1 fills kept the Typ-I row" — a cleared key must clear
 * the fills. A3: "Tab.-25 fill stored with `source_type = 'entered'`" — a table
 * figure is `derived`. `resolveLookupFill` + `lookupFillWriteDecision` are the
 * pure core the save block in `actions/worksheet.ts` runs per bound field.
 */
import { describe, it, expect } from 'vitest';
import { lookupFillWriteDecision, resolveLookupFill, type LookupFillState } from '../lookup-fill';
import { tab6Limit } from '../tab6-loading';

// TAB6 resolves from the TS seed fallback (same as lookup-fill.test.ts) — no registry setup needed.
const STD = 'DWA-A-138-1';
const TAB6 = { table_code: 'TAB6', role: 'limit' as const, keys: [{ column: 'tier', from_symbol: 'tab6_tier' }, { column: 'bbz_band', from_symbol: 'bbz_band' }], value: 'max' };

describe('resolveLookupFill — a cleared key is keys_missing (never the previous row)', () => {
  it('undefined / null / "" key values all report the key as missing', () => {
    for (const cleared of [undefined, null, ''] as const) {
      const s = resolveLookupFill(TAB6, STD, (sym) => (sym === 'tab6_tier' ? cleared : sym === 'bbz_band' ? 'thick' : undefined));
      expect(s).toMatchObject({ kind: 'keys_missing', missing: ['tab6_tier'] });
    }
  });

  it('the save decision on a still-stored fill after the key was cleared is "clear"', () => {
    const s = resolveLookupFill(TAB6, STD, (sym) => (sym === 'bbz_band' ? 'thick' : undefined));
    const max = (tab6Limit('tier2', 0.3) as { max: number }).max;
    // Old behaviour: nothing decided — the Typ-I row's figure stayed persisted.
    expect(lookupFillWriteDecision(s, 'number', max)).toBe('clear');
    expect(lookupFillWriteDecision(s, 'number', null)).toBe('keep');
    expect(lookupFillWriteDecision(s, 'number', undefined)).toBe('keep');
  });

  it('a fill equal to the resolved cell is "derived" provenance, a deviating value is "entered"', () => {
    const s = resolveLookupFill(TAB6, STD, (sym) => ({ tab6_tier: 'tier2', bbz_band: 'thick' } as Record<string, string>)[sym]);
    expect(s.kind).toBe('resolved');
    const max = (tab6Limit('tier2', 0.3) as { max: number }).max;
    // Old behaviour: the save path wrote the table figure as source_type='entered'.
    expect(lookupFillWriteDecision(s, 'number', max)).toBe('derived');
    expect(lookupFillWriteDecision(s, 'number', max + 1)).toBe('entered');
    expect(lookupFillWriteDecision(s, 'number', null)).toBe('keep');
  });
});

describe('lookupFillWriteDecision — type coercion mirrors the widget', () => {
  const resolved = (tableValue: number | string | boolean | null): LookupFillState =>
    ({ kind: 'resolved', tableValue, row: { row_key: 'r', keys: {}, values: {}, verbatim_quote: '' }, policy: 'anhaltswert', label: 'Tab. 1', valueColumn: undefined }) as unknown as LookupFillState;

  it('text / enum compare String(cell); a number field takes a numeric cell only', () => {
    expect(lookupFillWriteDecision(resolved('> 50%'), 'text', '> 50%')).toBe('derived');
    expect(lookupFillWriteDecision(resolved(50), 'text', '50')).toBe('derived');
    expect(lookupFillWriteDecision(resolved('natural_circulation'), 'enum', 'natural_circulation')).toBe('derived');
    expect(lookupFillWriteDecision(resolved('natural_circulation'), 'enum', 'pump')).toBe('entered');
    expect(lookupFillWriteDecision(resolved('50'), 'number', 50)).toBe('entered'); // non-numeric cell on a number field: never a fill
    expect(lookupFillWriteDecision(resolved(true), 'text', 'true')).toBe('derived');
  });

  it('no_row / no_table have no figure to compare against ⇒ keep', () => {
    expect(lookupFillWriteDecision({ kind: 'no_row', keys: ['x'], label: 'Tab. 1' }, 'number', 5)).toBe('keep');
    expect(lookupFillWriteDecision({ kind: 'no_table', label: 'Tab. 1' }, 'number', 5)).toBe('keep');
    expect(lookupFillWriteDecision(resolved(null), 'number', 5)).toBe('entered');
  });
});
