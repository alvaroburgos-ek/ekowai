/** U-10 (UX pass 820, 2026-10-08): the needs-assessment fact is asked once — DWA-M 820-2 820-2-11 is prefilled from the
 * DWA-M 820-1 master answer (M820-05). Both fields are booleans; `false` is an answer and must carry over too. */
import { describe, it, expect } from 'vitest';
import { twinSourcesFor, twinSourceSymbols, mapTwinValue, twinHints, TWIN_SYMBOLS } from '../twin-symbols';
import { coerceSameSymbolValue } from '../same-symbol-prefill';

describe('TWIN_SYMBOLS (DWA-M-820-2)', () => {
  it('framework_conditions_clarified ← bedarfsplanung_projekt_complete', () => {
    expect(twinSourcesFor('DWA-M-820-2', 'framework_conditions_clarified')).toEqual(['bedarfsplanung_projekt_complete']);
    expect(twinSourceSymbols('DWA-M-820-2')).toEqual(['bedarfsplanung_projekt_complete']);
  });

  it('no rule leaks into DWA-M-820-1 (the master is asked there)', () => {
    expect(twinSourcesFor('DWA-M-820-1', 'bedarfsplanung_projekt_complete')).toEqual([]);
  });

  it('boolean twins coerce both ways — true and false are prefilled, non-booleans are not', () => {
    expect(coerceSameSymbolValue('boolean', true)).toEqual({ type: 'boolean', value: true });
    expect(coerceSameSymbolValue('boolean', false)).toEqual({ type: 'boolean', value: false });
    expect(coerceSameSymbolValue('boolean', 'true')).toBeNull();
  });
});

/** C-2 (ruling R-17, 2026-10-14): DWA-M 820-3 M8203-11 PZ 6.2-1 (enum) repeats the same project needs assessment. The
 * boolean master maps through a per-pair value map: true → `erreicht`; false → NO prefill (the print does not decide
 * between „teilweise" and „nicht erreicht"), the hint names the choice. PZ 6.2-1 (printed p. 14) is about the
 * „Bedarfsplanung Projekt" only — the concept master M820-04 is not a source. */
describe('TWIN_SYMBOLS (DWA-M-820-3) — boolean → enum value map', () => {
  const PZ_ENUM = [
    { value: 'erreicht' }, { value: 'teilweise_erreicht' }, { value: 'nicht_erreicht' },
    { value: 'nicht_zutreffend' }, { value: 'noch_nicht_erreicht' },
  ];

  it('pz_62_1_status ← bedarfsplanung_projekt_complete only (no concept master)', () => {
    expect(twinSourcesFor('DWA-M-820-3', 'pz_62_1_status')).toEqual(['bedarfsplanung_projekt_complete']);
    expect(twinSourceSymbols('DWA-M-820-3')).toEqual(['bedarfsplanung_projekt_complete']);
    expect(twinSourcesFor('DWA-M-820-3', 'pz_62_1_status')).not.toContain('bedarfsplanung_konzept_complete');
  });

  it('true → erreicht (a token of the field\'s own enum)', () => {
    const m = mapTwinValue('DWA-M-820-3', 'pz_62_1_status', true);
    expect(m).toEqual({ ok: true, value: 'erreicht' });
    expect(coerceSameSymbolValue('enum', m.ok ? m.value : null, PZ_ENUM)).toEqual({ type: 'enum', value: 'erreicht' });
  });

  it('false → no prefill; non-boolean look-alikes are not mapped either', () => {
    expect(mapTwinValue('DWA-M-820-3', 'pz_62_1_status', false)).toEqual({ ok: false });
    expect(mapTwinValue('DWA-M-820-3', 'pz_62_1_status', 'true')).toEqual({ ok: false });
    expect(mapTwinValue('DWA-M-820-3', 'pz_62_1_status', null)).toEqual({ ok: false });
  });

  it('rules without a value map pass the value through unchanged (existing boolean twin, A138 twins)', () => {
    expect(mapTwinValue('DWA-M-820-2', 'framework_conditions_clarified', false)).toEqual({ ok: true, value: false });
    expect(mapTwinValue('DWA-M-820-2', 'framework_conditions_clarified', true)).toEqual({ ok: true, value: true });
    expect(mapTwinValue('DWA-A-138-1', 'A_C_final', 162.2)).toEqual({ ok: true, value: 162.2 });
  });

  it('hints carry the mapped value (Übernehmen copies the enum token); an unmapped value is shown without Übernehmen + the choice note', () => {
    const ups = [{ worksheetCode: 'M820-05', value: true }];
    expect(twinHints('DWA-M-820-3', 'pz_62_1_status', 'bedarfsplanung_projekt_complete', ups, 'de')).toEqual([
      { worksheetCode: 'M820-05', value: 'erreicht', viaSymbol: 'bedarfsplanung_projekt_complete' },
    ]);
    const no = twinHints('DWA-M-820-3', 'pz_62_1_status', 'bedarfsplanung_projekt_complete', [{ worksheetCode: 'M820-05', value: false }], 'de');
    expect(no).toHaveLength(1);
    expect(no[0]).toMatchObject({ worksheetCode: 'M820-05', value: false, viaSymbol: 'bedarfsplanung_projekt_complete', applicable: false });
    expect(no[0].note).toMatch(/Teilweise erreicht.*Nicht erreicht/);
    const noEn = twinHints('DWA-M-820-3', 'pz_62_1_status', 'bedarfsplanung_projekt_complete', [{ worksheetCode: 'M820-05', value: false }], 'en');
    expect(noEn[0].note).toMatch(/Partially met.*Not met/);
  });

  it('hints of a rule without a map are unchanged (raw value, no flags)', () => {
    expect(twinHints('DWA-M-820-2', 'framework_conditions_clarified', 'bedarfsplanung_projekt_complete', [{ worksheetCode: 'M820-05', value: false }], 'de')).toEqual([
      { worksheetCode: 'M820-05', value: false, viaSymbol: 'bedarfsplanung_projekt_complete' },
    ]);
  });

  it('every value map targets the tokens of its field (sanity: map values are scalars, keys are unique)', () => {
    for (const rules of Object.values(TWIN_SYMBOLS)) {
      for (const r of rules) {
        if (!r.valueMap) continue;
        const keys = r.valueMap.map(([from]) => from);
        expect(new Set(keys).size).toBe(keys.length);
        expect(r.unmappedNote?.de).toBeTruthy();
        expect(r.unmappedNote?.en).toBeTruthy();
      }
    }
  });
});
