/**
 * Plan 3 final wave A · defect 4 (second half) — the compliance ADAPTER can
 * hand a json checklist carrier to the gate's `contains()`.
 *
 * The parser change alone (`src/lib/expr/parser.ts`) makes
 * `contains(principles, 'systems_thinking')` PARSE; without a carrier in the
 * gate scope it would then be `pending` on every project forever, which is
 * fail-safe but useless — exactly the state `iso59004-I-3` describes.
 * `evaluateCondition` therefore takes an optional `carrier` accessor
 * (`ConditionOptions.carrier`), and every production gate call site feeds it
 * the RAW json of the worksheet's json fields.
 *
 * Note the deliberate split inside the DSL: `jsonConditionValue` keeps mapping
 * a carrier to the 'present'/null marker for `IS NOT NULL` / `IS NOT EMPTY`
 * (the existing contract — the DSL does no arithmetic on carriers), while
 * `contains()` reads the raw value through the carrier accessor.
 */
import { describe, it, expect } from 'vitest';
import { evaluateCondition, extractConditionSymbols, jsonConditionValue } from '../evaluate';

const PRINCIPLES = ['systems_thinking', 'value_creation', 'value_sharing'];

/** The gate's scalar lookup as production builds it: a json field reads as a presence marker. */
const symbolLookup = (json: unknown) => (sym: string) =>
  sym === 'principles' ? (jsonConditionValue(json) ?? undefined) : undefined;
const carrierLookup = (json: unknown) => (sym: string) => (sym === 'principles' ? json : undefined);

const gate = (condition: string, json: unknown) =>
  evaluateCondition(condition, symbolLookup(json), { carrier: carrierLookup(json) });

describe('plan-3 wave A · defect 4 — evaluateCondition feeds contains() a json carrier', () => {
  it('PASS when the token is ticked', () => {
    expect(gate("contains(principles, 'value_creation')", PRINCIPLES)).toEqual({ kind: 'pass' });
  });

  it('FAIL when it is not — a populated-but-wrong checklist enforces, it does not merely fire', () => {
    expect(gate("contains(principles, 'resource_stewardship')", PRINCIPLES)).toEqual({ kind: 'fail' });
    expect(gate("contains(principles, 'value_creation')", [])).toEqual({ kind: 'fail' });
  });

  it('PENDING when the carrier was never filled (never a false fail)', () => {
    expect(gate("contains(principles, 'value_creation')", null))
      .toEqual({ kind: 'pending', missingSymbols: ['principles'] });
  });

  it('the `{selected: [...]}` carrier shape reads the same as a bare array', () => {
    expect(gate("contains(principles, 'value_sharing')", { selected: PRINCIPLES })).toEqual({ kind: 'pass' });
  });

  it('WITHOUT a carrier accessor the gate is PENDING, not a wrong verdict (the fail-safe default)', () => {
    expect(evaluateCondition("contains(principles, 'value_creation')", symbolLookup(PRINCIPLES)))
      .toEqual({ kind: 'pending', missingSymbols: ['principles'] });
  });

  it('the carrier symbol is a residual gate symbol (extractConditionSymbols sees it)', () => {
    expect(extractConditionSymbols("contains(principles, 'value_creation')")).toEqual(new Set(['principles']));
  });

  it('the existing carrier contract is untouched: IS NOT NULL / IS NOT EMPTY still read the presence marker', () => {
    expect(gate('principles IS NOT NULL', PRINCIPLES)).toEqual({ kind: 'pass' });
    expect(gate('principles IS NOT NULL', [])).toEqual({ kind: 'fail' });
    expect(gate('principles IS NOT EMPTY', { rows: [] })).toEqual({ kind: 'fail' });
  });

  it('composes with the rest of the gate grammar', () => {
    const lookup = (sym: string) => (sym === 'stage' ? 'freigegeben' : jsonConditionValue(PRINCIPLES) ?? undefined);
    const opts = { carrier: carrierLookup(PRINCIPLES) };
    expect(evaluateCondition("stage == 'freigegeben' AND contains(principles, 'value_creation')", lookup, opts).kind).toBe('pass');
    expect(evaluateCondition("IF stage == 'entwurf' THEN contains(principles, 'nope')", lookup, opts).kind).toBe('pass'); // vacuous guard
    expect(evaluateCondition("NOT contains(principles, 'nope')", lookup, opts).kind).toBe('pass');
  });
});
