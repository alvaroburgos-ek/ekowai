/**
 * Plan 3 final wave A · defect 1 — a BOOLEAN prod field reaches a scalar equation.
 *
 * Found by DWA-M-820-1 (`m820_1-I-1`, Task 18) and worked around corpus-wide by
 * inventing an enum yes/no twin beside the boolean (FLL-GAR `fll_gar-I-1`).
 * Before this wave `engineInputValue()` mapped `{type:'boolean'}` to MISSING, so
 * `if(flag == true, 1, 0)` was `manual_required: Fehlende oder leere Eingaben: flag`
 * forever — on every path (client hook, save-path materialiser, report evaluator,
 * snapshot, PDF), because all five build their inputs with that one function.
 *
 * The contract this pins:
 *   - a boolean field is PRESENT when it holds `true` OR `false` (false is a
 *     value, not a missing input) and MISSING when it holds null;
 *   - it compares (`== true`, `== false`, `!= true`) and is truthy-testable
 *     bare (`if(flag, …)`);
 *   - it is NOT a number: an arithmetic operator on it stays the fail-safe
 *     `manual_required` ("Operand ist keine Zahl"), never `computed: NaN`;
 *   - the Task 1b string/enum rule is untouched.
 */
import { describe, it, expect } from 'vitest';
import { engineInputValue } from '../engine-input';
import { evaluateFormula, type EvalInputValue, type EvalState } from '../formula';

/** Drive the REAL production input path: a stored field value goes through
 *  `engineInputValue()` exactly as the hook / materialiser / report evaluator /
 *  snapshot / PDF assembler build their `inputs`. Never hand-build an
 *  `EvalInputValue` here — that would step over the function the defect lives in. */
const run = (
  formula: string,
  sources: Array<{ symbol: string; src: { type: string; value: unknown } | null; unit?: string | null }>,
): EvalState => {
  const inputs: EvalInputValue[] = sources.map((s) => ({
    symbol: s.symbol,
    value: engineInputValue(s.src),
    unit: s.unit ?? null,
  }));
  return evaluateFormula({
    equationId: 'probe-wave-a-boolean',
    formula,
    inputSymbols: inputs.map((i) => i.symbol),
    outputSymbol: 'out',
    inputs,
  });
};
const bool = (symbol: string, value: boolean | null) => ({ symbol, src: { type: 'boolean', value } });

const computed = (s: EvalState): number | string => (s.kind === 'computed' ? s.value : `${s.kind}: ${s.kind === 'manual_required' ? s.reason : s.message}`);

describe('plan-3 wave A · defect 1 — booleans reach scalar equations', () => {
  it('engineInputValue maps a boolean field to the boolean itself; only null is missing', () => {
    expect(engineInputValue({ type: 'boolean', value: true })).toBe(true);
    expect(engineInputValue({ type: 'boolean', value: false })).toBe(false);
    expect(engineInputValue({ type: 'boolean', value: null })).toBeNull();
    expect(engineInputValue({ type: 'boolean', value: undefined })).toBeNull();
    expect(engineInputValue(null)).toBeNull();
  });

  it('Task 1b is untouched: number verbatim, enum/text verbatim as a string, empty string missing, date/json still missing', () => {
    expect(engineInputValue({ type: 'number', value: 3.5 })).toBe(3.5);
    expect(engineInputValue({ type: 'number', value: Number.NaN })).toBeNull();
    expect(engineInputValue({ type: 'enum', value: 'gering' })).toBe('gering');
    expect(engineInputValue({ type: 'text', value: 'frei' })).toBe('frei');
    expect(engineInputValue({ type: 'text', value: '' })).toBeNull();
    expect(engineInputValue({ type: 'date', value: '2026-09-24' })).toBeNull();
    expect(engineInputValue({ type: 'json', value: { rows: [] } })).toBeNull();
  });

  it('`if(flag == true, 1, 0)` computes 1 for true and 0 for false (was manual_required on both)', () => {
    const f = 'out = if(verifiable_without_confidential == true, 1, 0)';
    expect(computed(run(f, [bool('verifiable_without_confidential', true)]))).toBe(1);
    expect(computed(run(f, [bool('verifiable_without_confidential', false)]))).toBe(0);
  });

  it('a boolean is truthy-testable bare and negatable: if(flag, 10, 20) / flag != true', () => {
    expect(computed(run('out = if(flag, 10, 20)', [bool('flag', true)]))).toBe(10);
    expect(computed(run('out = if(flag, 10, 20)', [bool('flag', false)]))).toBe(20);
    expect(computed(run('out = if(flag != true, 1, 0)', [bool('flag', false)]))).toBe(1);
    expect(computed(run('out = if(flag == false, 1, 0)', [bool('flag', false)]))).toBe(1);
  });

  it('a boolean false is a VALUE, not a missing input — the equation resolves instead of reporting `Fehlende oder leere Eingaben`', () => {
    const s = run('out = if(flag == true, 1, 0)', [bool('flag', false)]);
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.substituted).toEqual({ flag: false });
  });

  it('a boolean with no value is still MISSING (fail-safe, unchanged)', () => {
    const s = run('out = if(flag == true, 1, 0)', [bool('flag', null)]);
    expect(s.kind).toBe('manual_required');
    if (s.kind === 'manual_required') expect(s.missing).toEqual(['flag']);
  });

  it('a boolean is NOT a number: arithmetic over it is the fail-safe manual_required, never computed NaN', () => {
    const s = run('out = flag * 2', [bool('flag', true)]);
    expect(s.kind).toBe('manual_required');
    if (s.kind === 'manual_required') expect(s.reason).toBe('Operand ist keine Zahl: true');
  });

  it('a boolean never triggers the unit-conflict check (booleans carry no dimension)', () => {
    const s = evaluateFormula({
      equationId: 'probe-wave-a-boolean-unit',
      formula: 'out = if(flag == true, 1, 0)',
      inputSymbols: ['flag'],
      outputSymbol: 'out',
      expectedUnits: { flag: 'm' },
      inputs: [{ symbol: 'flag', value: engineInputValue({ type: 'boolean', value: true }), unit: 'm²' }],
    });
    expect(s.kind).toBe('computed');
  });
});
