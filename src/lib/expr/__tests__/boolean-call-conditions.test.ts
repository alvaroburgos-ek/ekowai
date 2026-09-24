/**
 * Plan 3 final wave A · defects 3 + 4 — a BOOLEAN-VALUED CALL is a condition atom.
 *
 * ONE root cause, two reported symptoms:
 *   - defect 3 (ISO-59004 `iso59004-I-2` / `F-1` block 1): `parseNumeric(
 *     "if(contains(a,'x') AND contains(a,'y'), 1, 0)")` failed with
 *     `Ausdruck erwartet.` — `parseAnd` chains ATOMS, and `parseComparison`
 *     returned `null` for a bare `call` node with no operator after it, so an
 *     `AND` chain of `contains()` could not be written at all;
 *   - defect 4 (ISO-59004 `iso59004-I-3`): `parseCondition("contains(p,'x')")`
 *     returned `null` for the SAME reason, so 23 of that standard's 24
 *     empty-condition compliance rows could not be given a condition.
 *
 * The fix is one rule in `parseComparison`: a bare call to a BOOLEAN-valued
 * registry function (`contains`, `flag`) with no operator after it is the
 * condition "this call is true" — desugared to the existing `acompare`
 * node (`call == TRUE`), so no new AST kind, no new evaluator case and no new
 * walk branch enters the shared engine.
 *
 * DELIBERATELY UNCHANGED: every OTHER bare call stays unparseable as a
 * condition. `count_rows(reg)` / `lookup(...)` / `if(...)` return numbers and
 * strings; silently truthy-testing them would turn `count_rows(reg) AND …`
 * into a wrong `false` for a non-zero count. They still need an explicit
 * comparison (`count_rows(reg) > 0`) — the same requirement as before.
 */
import { describe, it, expect } from 'vitest';
import { parseCondition, parseNumeric } from '../parser';
import { evalCondition, evalNumber } from '../evaluate';
import type { Scope } from '../scope';

/** The verbatim withheld ISO-59004-04-D1 RHS (iso59004-F-1) — the regression fixture the ruling names. */
const ISO59004_F1_RHS =
  "if(contains(principles, 'systems_thinking') AND contains(principles, 'value_creation') AND contains(principles, 'value_sharing') AND " +
  "contains(principles, 'resource_stewardship') AND contains(principles, 'resource_traceability') AND contains(principles, 'ecosystem_resilience'), 1, 0)";

const SIX = [
  'systems_thinking', 'value_creation', 'value_sharing',
  'resource_stewardship', 'resource_traceability', 'ecosystem_resilience',
];

const scopeWith = (selected: string[] | undefined): Scope => ({
  symbol: () => undefined,
  carrier: (sym) => (sym === 'principles' && selected !== undefined ? selected : undefined),
});

describe('plan-3 wave A · defect 3 — an AND-chain of contains() parses in the NUMERIC grammar', () => {
  it('the verbatim ISO-59004-04-D1 RHS parses (was: Ausdruck erwartet.)', () => {
    expect(parseNumeric(ISO59004_F1_RHS).ok).toBe(true);
  });

  it('a single contains() inside if() still parses (unchanged) and OR chains too', () => {
    expect(parseNumeric("if(contains(p, 'a'), 1, 0)").ok).toBe(true);
    expect(parseNumeric("if(contains(p, 'a') OR contains(p, 'b'), 1, 0)").ok).toBe(true);
    expect(parseNumeric("if(NOT contains(p, 'a'), 1, 0)").ok).toBe(true);
    expect(parseNumeric("if(contains(p, 'a') AND x == 1, 1, 0)").ok).toBe(true);
  });

  it('the chain EVALUATES: all six ticked ⇒ 1, one missing ⇒ 0', () => {
    expect(evalNumber(ISO59004_F1_RHS, scopeWith(SIX))).toBe(1);
    expect(evalNumber(ISO59004_F1_RHS, scopeWith(SIX.slice(0, 5)))).toBe(0);
    expect(evalNumber(ISO59004_F1_RHS, scopeWith([]))).toBe(0);
  });

  it('an ABSENT carrier is still the fail-safe missing-input throw, never a 0 verdict', () => {
    // `Fehlende Eingabe …` is on formula.ts's recoverable list ⇒ manual_required,
    // never `computed: 0`. An unticked checklist must never read as "no principle met".
    expect(() => evalNumber(ISO59004_F1_RHS, scopeWith(undefined))).toThrow('Fehlende Eingabe für if(): principles');
  });

  it('a NON-boolean bare call is still refused — count_rows/lookup keep needing an explicit comparison', () => {
    expect(parseNumeric("if(count_rows(reg) AND x == 1, 1, 0)").ok).toBe(false);
    expect(parseNumeric("if(lookup('T', k, 'c') AND x == 1, 1, 0)").ok).toBe(false);
    // …and the explicit form parses, exactly as before
    expect(parseNumeric('if(count_rows(reg) > 0 AND x == 1, 1, 0)').ok).toBe(true);
  });
});

describe('plan-3 wave A · defect 4 — the GATE condition grammar has contains()', () => {
  it('parseCondition("contains(principles, \'systems_thinking\')") is no longer null', () => {
    expect(parseCondition("contains(principles, 'systems_thinking')")).not.toBeNull();
  });

  it('PASS: the token is in the checklist carrier', () => {
    expect(evalCondition("contains(principles, 'systems_thinking')", scopeWith(SIX))).toEqual({ kind: 'pass' });
  });

  it('FAIL: the token is NOT in the checklist carrier (the gate enforces, it does not merely fire)', () => {
    expect(evalCondition("contains(principles, 'systems_thinking')", scopeWith(['value_creation']))).toEqual({ kind: 'fail' });
    expect(evalCondition("contains(principles, 'systems_thinking')", scopeWith([]))).toEqual({ kind: 'fail' });
  });

  it('PENDING (never a false fail) when the carrier is absent', () => {
    expect(evalCondition("contains(principles, 'systems_thinking')", scopeWith(undefined)))
      .toEqual({ kind: 'pending', missingSymbols: ['principles'] });
  });

  it('the six ISO-59004 §5.2 principle gates are each conditionable on their OWN principle', () => {
    const only = (tok: string) => SIX.map((p) => evalCondition(`contains(principles, '${p}')`, scopeWith([tok])).kind);
    // exactly one pass per single-token carrier — the six CRs no longer fire identically
    for (const tok of SIX) expect(only(tok).filter((k) => k === 'pass')).toHaveLength(1);
  });

  it('composes with AND / OR / NOT and with ordinary comparisons in a gate', () => {
    const s = (sel: string[], sym: Record<string, string | number>): Scope => ({
      symbol: (k) => sym[k],
      carrier: (k) => (k === 'principles' ? sel : undefined),
    });
    expect(evalCondition("contains(principles, 'value_creation') AND status == 'freigegeben'", s(SIX, { status: 'freigegeben' })).kind).toBe('pass');
    expect(evalCondition("contains(principles, 'value_creation') AND status == 'freigegeben'", s(SIX, { status: 'entwurf' })).kind).toBe('fail');
    expect(evalCondition("NOT contains(principles, 'value_creation')", s(SIX, {})).kind).toBe('fail');
    expect(evalCondition("IF status == 'freigegeben' THEN contains(principles, 'value_creation')", s([], { status: 'entwurf' })).kind).toBe('pass'); // vacuous
  });

  it('a select_many carrier stored as `{selected: [...]}` reads the same as a bare array', () => {
    const obj: Scope = { symbol: () => undefined, carrier: () => ({ selected: SIX }) };
    expect(evalCondition("contains(principles, 'ecosystem_resilience')", obj)).toEqual({ kind: 'pass' });
  });

  it('a gate whose carrier symbol is hidden is not_applicable, never a pass/fail', () => {
    expect(evalCondition("contains(principles, 'systems_thinking')", scopeWith(SIX), { hiddenSymbols: new Set(['principles']) }))
      .toEqual({ kind: 'not_applicable', hiddenSymbols: ['principles'] });
  });

  it('a bare NON-boolean call is still `manual` for a gate (unchanged)', () => {
    expect(parseCondition('count_rows(reg)')).toBeNull();
    expect(parseCondition("lookup('T', k, 'c')")).toBeNull();
    expect(parseCondition("if(x == 1, 1, 0)")).toBeNull();
  });

  it('an UNKNOWN call name stays `manual` (the unknown-function guard still sees it)', () => {
    expect(evalCondition("enthaelt(principles, 'x')", scopeWith(SIX))).toEqual({ kind: 'manual' });
  });
});
