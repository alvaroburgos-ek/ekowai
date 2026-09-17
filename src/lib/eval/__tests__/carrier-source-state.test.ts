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

// Final-review minors: a `disables_rows` flag that is ON with zero rows is an explicit null-report,
// not a missing source; `symbol` (worksheet-symbol lookup) is threaded into the row scope so a
// column `visible_when` over a worksheet symbol decides completeness the same way the engine does.
// Round 2: a banner must never claim withholding that does not happen — `withholds: false` drops the suffix.
describe('carrierSourceState — withholds flag (message wording)', () => {
  it('withholds=false ⇒ "nicht erfasst." / "nicht final (n/m Zeilen vollständig)." without the suffix; default (true) keeps it', () => {
    const o = { ownerLabel: 'M820-01', standardCode: 'DWA-M-820-1' };
    const cols2 = [{ key: 'name', type: 'text' as const, label: 'Name', required: true }];
    expect(carrierSourceState(null, cols2, 'final', { ...o, withholds: false }).message).toBe('Quelle M820-01 nicht erfasst.');
    expect(carrierSourceState({ rows: [{ id: '1', name: '' }] }, cols2, 'final', { ...o, withholds: false }).message).toBe('Quelle M820-01 nicht final (0/1 Zeilen vollständig).');
    expect(carrierSourceState(null, cols2, 'final', o).message).toBe('Quelle M820-01 nicht erfasst — abgeleitete Werte ausgeblendet.');
    expect(carrierSourceState({ rows: [{ id: '1', name: 'x' }] }, cols2, 'final', { ...o, withholds: false })).toEqual({ state: 'ok', complete: 1, total: 1, message: null });
  });
});

describe('carrierSourceState — disables_rows flags + symbol scope', () => {
  const cfg = REGISTER_CONFIGS_FALLBACK.pollutant_register;
  const base = { ownerLabel: 'VSME-B04.100', standardCode: 'VSME', flagKeys: registerFlagKeys('pollutant_register', cfg), flags: cfg.flags };

  it('flag ON + zero rows ⇒ ok when the source is ready, incomplete (0/0) while it is not', () => {
    expect(carrierSourceState({ rows: [], not_applicable: true }, cols, 'final', base)).toEqual({ state: 'ok', complete: 0, total: 0, message: null });
    expect(carrierSourceState({ rows: [], not_applicable: true }, cols, 'draft', base)).toMatchObject({ state: 'incomplete', complete: 0, total: 0 });
    // Flag OFF + zero rows stays "missing" (unchanged).
    expect(carrierSourceState({ rows: [], not_applicable: false }, cols, 'final', base).state).toBe('missing');
    // A flag without disables_rows never counts as a null-report.
    expect(carrierSourceState({ rows: [], estimated: true }, cols, 'final', { ...base, flags: [{ key: 'estimated' }], flagKeys: ['estimated'] }).state).toBe('missing');
  });

  it('symbol lookup reaches a column visible_when: a hidden required column does not block completeness', () => {
    const columns = [
      { key: 'a', type: 'number' as const, label: 'A', required: true },
      { key: 'b', type: 'number' as const, label: 'B', required: true, visible_when: 'mode == "full"' },
    ];
    const rows = [{ id: '1', a: 1, b: null }];
    const opts = { ownerLabel: 'X-01', standardCode: 'X' };
    expect(carrierSourceState({ rows }, columns, 'final', { ...opts, symbol: (s) => (s === 'mode' ? 'lite' : undefined) }).state).toBe('ok');
    expect(carrierSourceState({ rows }, columns, 'final', { ...opts, symbol: (s) => (s === 'mode' ? 'full' : undefined) }).state).toBe('incomplete');
  });
});
