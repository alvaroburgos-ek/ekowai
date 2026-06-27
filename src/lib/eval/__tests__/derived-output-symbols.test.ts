import { describe, it, expect } from 'vitest';
import { derivedOutputSymbols } from '../derived-output-symbols';

// A real displayOnly equation id from equation-profiles.ts (A138-19 Gl. 26
// V_MR identity — displayOnly: true). Used to prove displayOnly outputs are
// treated as engineer-entered iteration variables, NOT derived.
const DISPLAY_ONLY_ID = '32b85bf3-7b59-4abe-ac98-62f4fb15007b';
// An id with no profile entry — a normal primary writer (not displayOnly).
const NORMAL_ID = '00000000-0000-0000-0000-000000000001';

// derivedOutputSymbols is the server-side boundary that lets saveWorksheet stamp
// source_type='derived' (not 'entered') for values a worksheet's equations
// PRODUCE — so an engine write-back can never persist a derived value as an
// engineer input. The full saveWorksheet DB round-trip is exercised by the
// integration project; this pins the pure decision it relies on.
describe('derivedOutputSymbols', () => {
  it('includes the output symbol of a non-displayOnly equation', () => {
    const set = derivedOutputSymbols([{ id: NORMAL_ID, outputSymbol: 'A_C' }]);
    expect(set.has('A_C')).toBe(true);
  });

  it('excludes a symbol produced ONLY by a displayOnly equation (engineer iteration variable stays entered)', () => {
    const set = derivedOutputSymbols([{ id: DISPLAY_ONLY_ID, outputSymbol: 'L_R' }]);
    expect(set.has('L_R')).toBe(false);
  });

  it('includes a symbol when at least one non-displayOnly equation produces it (primary wins over alt-form)', () => {
    const set = derivedOutputSymbols([
      { id: DISPLAY_ONLY_ID, outputSymbol: 'V_R' }, // alternative form
      { id: NORMAL_ID, outputSymbol: 'V_R' }, // primary writer
    ]);
    expect(set.has('V_R')).toBe(true);
  });

  it('ignores equations with no output symbol', () => {
    const set = derivedOutputSymbols([{ id: NORMAL_ID, outputSymbol: null }]);
    expect(set.size).toBe(0);
  });
});
