/**
 * Plan 3 final wave A · defect 2 — `contains()` over a json `select_many`
 * carrier has an engine path on the PRODUCTION callers.
 *
 * `src/lib/expr/evaluate.ts` has read `ctx.scope.carrier?.(sym)` since Plan 2a
 * and `formula.ts` has accepted an `EvalRequest.carriers` map — but NO
 * production caller ever built one. Confirmed in `materialize-derived.ts`
 * ("json carriers are registers, not scalars"), `use-equation-engine.ts`,
 * `evaluate-for-report.ts`, `assemble-standard-report.ts` and
 * `snapshots/payload.ts`. Three standards had to WITHHOLD equations over it:
 * DIN-14021 (`din14021-F-1`), ISO-14046 (`iso14046-F-2`), ISO-59004
 * (`iso59004-F-1`), with ISO-46001 (`iso46001-F-2`) as the precedent.
 *
 * `buildCarriers()` is the ONE carrier builder, sibling of `buildRegisters()`:
 * every json field that is NOT a register travels as a raw carrier. The tests
 * below drive the two callers that can be driven in a unit test end to end —
 * the save-path materialiser and the report/PDF evaluator; the client hook is
 * covered by its own harness test, and the snapshot / PDF assembler take the
 * identical one-line `carriers` argument (typecheck + integration harnesses).
 */
import { describe, it, expect } from 'vitest';
import { buildCarriers } from '../register-rows';
import { materializeDerivedOutputs } from '../materialize-derived';
import { evaluateWorksheetEquations } from '../evaluate-for-report';

const SIX = ['systems_thinking', 'value_creation', 'value_sharing', 'resource_stewardship', 'resource_traceability', 'ecosystem_resilience'];

/** The verbatim withheld ISO-59004-04-D1 (iso59004-F-1) — the fixture its ruling names. */
const F1_FORMULA =
  "all_principles_considered_code = if(contains(principles, 'systems_thinking') AND contains(principles, 'value_creation') AND " +
  "contains(principles, 'value_sharing') AND contains(principles, 'resource_stewardship') AND " +
  "contains(principles, 'resource_traceability') AND contains(principles, 'ecosystem_resilience'), 1, 0)";

const FIELDS = [
  { id: 'f-p', symbol: 'principles', dataType: 'json', unit: null, widget: 'select_many', uiConfig: { options: SIX } },
  { id: 'f-o', symbol: 'all_principles_considered_code', dataType: 'number', unit: null },
];
const EQ = {
  id: 'ISO-59004-04-D1',
  equationNumber: 'ISO-59004-04-D1',
  formula: F1_FORMULA,
  inputSymbols: ['principles'],
  outputSymbol: 'all_principles_considered_code',
  outputUnit: null,
};

describe('plan-3 wave A · defect 2 — buildCarriers', () => {
  it('returns the raw json of every NON-register json field, keyed by symbol', () => {
    const fields = [
      { id: 'f-p', symbol: 'principles', dataType: 'json', widget: 'select_many', uiConfig: { options: SIX } },
      { id: 'f-si', symbol: 'surface_inventory', dataType: 'json' }, // a register — travels as a register, not a carrier
      { id: 'f-n', symbol: 'A_C', dataType: 'number' },
    ];
    const json: Record<string, unknown> = { 'f-p': SIX, 'f-si': { rows: [] }, 'f-n': 12 };
    expect(buildCarriers(fields, (id) => json[id])).toEqual({ principles: SIX });
  });

  it('skips absent and null carriers (an unanswered checklist is missing, not an empty one)', () => {
    const fields = [{ id: 'a', symbol: 'a', dataType: 'json' }, { id: 'b', symbol: 'b', dataType: 'json' }];
    expect(buildCarriers(fields, (id) => (id === 'a' ? null : undefined))).toEqual({});
  });

  it('never picks up a non-json field even when the accessor hands one back', () => {
    const fields = [{ id: 'n', symbol: 'A_C', dataType: 'number' }, { id: 't', symbol: 'note', dataType: 'text' }];
    expect(buildCarriers(fields, () => ({ anything: true }))).toEqual({});
  });
});

describe('plan-3 wave A · defect 2 — the save-path materialiser', () => {
  const run = (value: unknown) =>
    materializeDerivedOutputs({
      standardCode: 'ISO-59004', worksheetCode: 'ISO-59004-04',
      equations: [EQ], fields: FIELDS,
      valuesByFieldId: { 'f-p': { type: 'json', value } },
    }).writes;

  it('computes the withheld ISO-59004-04-D1 shape: all six ticked ⇒ 1', () => {
    const w = run(SIX);
    expect(w).toHaveLength(1);
    expect(w[0].symbol).toBe('all_principles_considered_code');
    expect(w[0].fieldId).toBe('f-o');
    expect(w[0].value).toBe(1);
  });

  it('one principle missing ⇒ 0 (a real verdict, not manual_required)', () => {
    expect(run(SIX.slice(0, 5))[0].value).toBe(0);
    expect(run([])[0].value).toBe(0);
  });

  it('an UNFILLED checklist is still null + manual_required — never a phantom 0', () => {
    const w = materializeDerivedOutputs({
      standardCode: 'ISO-59004', worksheetCode: 'ISO-59004-04',
      equations: [EQ], fields: FIELDS, valuesByFieldId: {},
    }).writes;
    expect(w).toHaveLength(1);
    expect(w[0].value).toBeNull();
    expect(w[0].state.kind).toBe('manual_required');
  });

  it('a HIDDEN checklist resolves to no carrier ⇒ manual_required, output cleared (Task-10 rule holds)', () => {
    const w = materializeDerivedOutputs({
      standardCode: 'ISO-59004', worksheetCode: 'ISO-59004-04',
      equations: [EQ], fields: FIELDS,
      valuesByFieldId: { 'f-p': { type: 'json', value: SIX } },
      hiddenSymbols: new Set(['principles']),
    }).writes;
    expect(w[0].value).toBeNull();
    expect(w[0].state.kind).toBe('manual_required');
  });
});

describe('plan-3 wave A · defect 2 — the report / PDF equation evaluator', () => {
  const param = (valueJson: unknown) => [{
    fieldId: 'f-p', valueNumber: null, valueText: null, valueEnum: null,
    valueBoolean: null, valueDate: null, valueJson,
  }];
  const run = (valueJson: unknown) =>
    evaluateWorksheetEquations('ISO-59004-04', [EQ], FIELDS, param(valueJson), { standardCode: 'ISO-59004' })[0].state;

  it('computes 1 / 0 from the persisted checklist json', () => {
    expect(run(SIX)).toMatchObject({ kind: 'computed', value: 1 });
    expect(run(SIX.slice(0, 3))).toMatchObject({ kind: 'computed', value: 0 });
  });

  it('a null carrier stays manual_required on the report path too', () => {
    expect(run(null).kind).toBe('manual_required');
  });

  it('the `{selected: [...]}` carrier shape is read the same way', () => {
    expect(run({ selected: SIX })).toMatchObject({ kind: 'computed', value: 1 });
  });
});
