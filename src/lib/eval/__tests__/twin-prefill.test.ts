/** C-2 (ruling R-17, 2026-10-14): the worksheet page's twin step (2b) as a pure function — mapped boolean → enum twin
 * for DWA-M 820-3 PZ 6.2-1, and the existing twins unchanged. */
import { describe, it, expect } from 'vitest';
import { resolveTwinPrefill, sameSymbolValueEqual } from '../twin-prefill';

const PZ = {
  symbol: 'pz_62_1_status',
  dataType: 'enum',
  enumValues: [{ value: 'erreicht' }, { value: 'teilweise_erreicht' }, { value: 'nicht_erreicht' }, { value: 'nicht_zutreffend' }, { value: 'noch_nicht_erreicht' }],
};
const master = (value: unknown) =>
  new Map([['bedarfsplanung_projekt_complete', [{ worksheetCode: 'M820-05', value, sourceStandardCode: 'DWA-M-820-1' }]]]);

describe('resolveTwinPrefill — DWA-M 820-3 PZ 6.2-1 ← DWA-M 820-1 M820-05', () => {
  it('master true → render-only prefill „erreicht", badge source = M820-05 on DWA-M-820-1', () => {
    const r = resolveTwinPrefill('DWA-M-820-3', PZ, master(true), 'de');
    expect(r.prefill).toEqual({
      value: { type: 'enum', value: 'erreicht' },
      worksheetCode: 'M820-05',
      symbol: 'bedarfsplanung_projekt_complete',
      standardCode: 'DWA-M-820-1',
    });
    expect(r.hints).toEqual([{ worksheetCode: 'M820-05', value: 'erreicht', viaSymbol: 'bedarfsplanung_projekt_complete' }]);
  });

  it('master false → no prefill; hint shows „Nein" without Übernehmen and names the choice', () => {
    const r = resolveTwinPrefill('DWA-M-820-3', PZ, master(false), 'de');
    expect(r.prefill).toBeNull();
    expect(r.hints).toHaveLength(1);
    expect(r.hints![0]).toMatchObject({ worksheetCode: 'M820-05', value: false, applicable: false });
    expect(r.hints![0].note).toContain('Teilweise erreicht');
  });

  it('no master value → nothing', () => {
    expect(resolveTwinPrefill('DWA-M-820-3', PZ, new Map(), 'de')).toEqual({ prefill: null, hints: null });
  });

  it('a field whose own enum lacks the mapped token is not prefilled (token check stays)', () => {
    const r = resolveTwinPrefill('DWA-M-820-3', { ...PZ, enumValues: [{ value: 'met' }] }, master(true), 'de');
    expect(r.prefill).toBeNull();
  });

  it('two disagreeing master values → ambiguous, no prefill, hints listed', () => {
    const ups = new Map([['bedarfsplanung_projekt_complete', [{ worksheetCode: 'M820-05', value: true }, { worksheetCode: 'X', value: false }]]]);
    const r = resolveTwinPrefill('DWA-M-820-3', PZ, ups, 'en');
    expect(r.prefill).toBeNull();
    expect(r.hints).toHaveLength(2);
  });
});

describe('resolveTwinPrefill — existing twins unchanged', () => {
  it('820-2-11 boolean twin carries false as an answer (no map)', () => {
    const r = resolveTwinPrefill('DWA-M-820-2', { symbol: 'framework_conditions_clarified', dataType: 'boolean' }, master(false), 'de');
    expect(r.prefill?.value).toEqual({ type: 'boolean', value: false });
    expect(r.hints).toEqual([{ worksheetCode: 'M820-05', value: false, viaSymbol: 'bedarfsplanung_projekt_complete' }]);
  });

  it('A138 numeric twin: first source with a value wins; loose numeric equality', () => {
    const ups = new Map([['A_C_calculated', [{ worksheetCode: 'A138-14', value: 162.2 }, { worksheetCode: 'A138-24x', value: 162.2000000000001 }]]]);
    const r = resolveTwinPrefill('DWA-A-138-1', { symbol: 'A_C_final', dataType: 'number' }, ups, 'de');
    expect(r.prefill?.value).toEqual({ type: 'number', value: 162.2 });
    expect(r.prefill?.symbol).toBe('A_C_calculated');
    expect(sameSymbolValueEqual('1', 1.0000000000001)).toBe(false);
    expect(sameSymbolValueEqual('1', '1.0')).toBe(true);
  });
});
