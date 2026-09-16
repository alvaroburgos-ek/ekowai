import { describe, it, expect } from 'vitest';
import { carrierSourceState, carrierWithholdFieldIds } from '../carrier-source-state';
import { REGISTER_CONFIGS_FALLBACK, registerFlagKeys } from '../register-configs';

const cols = REGISTER_CONFIGS_FALLBACK.pollutant_register.columns;
const opts = {
  ownerLabel: 'VSME-B04.100',
  standardCode: 'VSME',
  flagKeys: registerFlagKeys('pollutant_register', REGISTER_CONFIGS_FALLBACK.pollutant_register),
};

describe('carrierSourceState (generic)', () => {
  it('missing / incomplete / ok follow the surface rules with the register config as the completeness source', () => {
    expect(carrierSourceState(null, cols, 'final', opts).state).toBe('missing');
    expect(carrierSourceState(null, cols, 'final', opts).message).toBe('Quelle VSME-B04.100 nicht erfasst — abgeleitete Werte ausgeblendet.');
    expect(carrierSourceState({ rows: [] }, cols, 'final', opts).state).toBe('missing');

    const rows = [{ id: 'a', label: 'x', pollutant: 'NOT-A-POLLUTANT', medium: 'air', amount_t: 1 }];
    expect(carrierSourceState({ rows }, cols, 'final', opts)).toMatchObject({ state: 'incomplete', complete: 0, total: 1 });
    expect(carrierSourceState({ rows }, cols, 'final', opts).message).toBe('Quelle VSME-B04.100 nicht final (0/1 Zeilen vollständig) — abgeleitete Werte ausgeblendet.');

    const good = [{ id: 'a', label: 'x', pollutant: 'AmmoniaNH3Member', medium: 'air', amount_t: 1 }];
    expect(carrierSourceState({ rows: good }, cols, 'draft', opts)).toMatchObject({ state: 'incomplete', complete: 1, total: 1 });
    expect(carrierSourceState({ rows: good }, cols, 'engineer_approved', opts)).toEqual({ state: 'ok', complete: 1, total: 1, message: null });
    expect(carrierSourceState({ rows: good }, cols, 'final', opts).state).toBe('ok');
  });

  it('withholds only produced symbols inherited from the owner', () => {
    const fields = [
      { id: 'a', symbol: 'AmountOfEmissionToAir', inheritedFromWorksheet: 'VSME-B04.100' },
      { id: 'b', symbol: 'pollutant_register', inheritedFromWorksheet: 'VSME-B04.100' },
      { id: 'c', symbol: 'AmountOfEmissionToAir', inheritedFromWorksheet: 'OTHER' },
    ];
    const produced = new Set(['AmountOfEmissionToAir']);
    expect(carrierWithholdFieldIds(fields, 'VSME-B04.100', 'incomplete', produced)).toEqual(['a']);
    expect(carrierWithholdFieldIds(fields, 'VSME-B04.100', 'missing', produced)).toEqual(['a']);
    expect(carrierWithholdFieldIds(fields, 'VSME-B04.100', 'ok', produced)).toEqual([]);
    expect(carrierWithholdFieldIds(fields, null, 'incomplete', produced)).toEqual([]);
  });
});
