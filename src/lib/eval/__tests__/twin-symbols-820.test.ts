/** U-10 (UX pass 820, 2026-10-08): the needs-assessment fact is asked once — DWA-M 820-2 820-2-11 is prefilled from the
 * DWA-M 820-1 master answer (M820-05). Both fields are booleans; `false` is an answer and must carry over too. */
import { describe, it, expect } from 'vitest';
import { twinSourcesFor, twinSourceSymbols } from '../twin-symbols';
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
