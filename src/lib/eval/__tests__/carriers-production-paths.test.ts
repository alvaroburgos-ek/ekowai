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

/**
 * WAVE A FIX ROUND 1 — the carrier extension of the materialiser's gate must
 * not drag in an equation that merely NAMES a json symbol.
 *
 * Reviewer finding (Important): DWA-M-1200-2 `M12002-05` prod equation
 * Gl. C.2-2 is `perzentil_50_log10 = median(log10_reduktionen)`, and
 * `log10_reduktionen` is a prod json field with `widget: null` and no
 * ui_config — i.e. a CARRIER candidate, not a register. `median` is not an
 * engine function (only `median_rows` is), so the equation is
 * `manual_required` and the materialiser emitted `{value: null}`, which the
 * save path UPSERTs as `value_number = NULL, source_type='derived'` OVER the
 * engineer's typed 50th percentile. Not reachable in prod today, but this
 * branch's own 20260917101610_field_configs_m1200_2.sql adds a register to
 * exactly that worksheet, so the apply order opens the path.
 *
 * The gate is now: carrier-fed means the formula actually READS the carrier
 * through `contains()` / `cell()`. Naming a json symbol is not enough.
 */
describe('plan-3 wave A fix round 1 — a carrier symbol that is only NAMED never triggers a derived write', () => {
  const C2_2_FIELDS = [
    // the prod shape: json, widget NULL, no ui_config ⇒ carrier candidate, not a register
    { id: 'f-lr', symbol: 'log10_reduktionen', dataType: 'json', unit: null },
    { id: 'f-p50', symbol: 'perzentil_50_log10', dataType: 'number', unit: null },
  ];
  const C2_2_EQ = {
    id: '0f237c28-c2-2',
    equationNumber: 'Gl. C.2-2',
    formula: 'perzentil_50_log10 = median(log10_reduktionen)',
    inputSymbols: ['log10_reduktionen'],
    outputSymbol: 'perzentil_50_log10',
  };

  it('DWA-M-1200-2 Gl. C.2-2 (`median(log10_reduktionen)`) emits NO write — an unsupported call must never null out the engineer\'s typed value', () => {
    const cases: Array<Parameters<typeof materializeDerivedOutputs>[0]['valuesByFieldId']> = [
      {},
      { 'f-lr': { type: 'json', value: { rows: [] } } },
      { 'f-lr': { type: 'json', value: [1, 2, 3] } },
    ];
    for (const valuesByFieldId of cases) {
      const { writes } = materializeDerivedOutputs({
        standardCode: 'DWA-M-1200-2', worksheetCode: 'M12002-05',
        equations: [C2_2_EQ], fields: C2_2_FIELDS, valuesByFieldId,
      });
      expect(writes).toEqual([]);
    }
  });

  it('nor does any other formula that merely NAMES a carrier without reading it', () => {
    const named = (formula: string) => materializeDerivedOutputs({
      standardCode: 'X', worksheetCode: 'X-01',
      equations: [{ ...C2_2_EQ, formula }], fields: C2_2_FIELDS,
      valuesByFieldId: { 'f-lr': { type: 'json', value: [1, 2, 3] } },
    }).writes;
    expect(named('perzentil_50_log10 = median(log10_reduktionen)')).toEqual([]);
    expect(named('perzentil_50_log10 = log10_reduktionen * 2')).toEqual([]);
    expect(named('perzentil_50_log10 = sum_rows(log10_reduktionen, x)')).toEqual([]);
  });

  it('…while an equation that DOES read the carrier through contains() is still materialised (both verdicts and the cleared state)', () => {
    const run = (valuesByFieldId: Parameters<typeof materializeDerivedOutputs>[0]['valuesByFieldId']) =>
      materializeDerivedOutputs({
        standardCode: 'ISO-59004', worksheetCode: 'ISO-59004-04',
        equations: [EQ], fields: FIELDS, valuesByFieldId,
      }).writes;
    expect(run({ 'f-p': { type: 'json', value: SIX } })[0].value).toBe(1);
    expect(run({ 'f-p': { type: 'json', value: [] } })[0].value).toBe(0);
    // unfilled ⇒ still WRITTEN as null, so a stale value is cleared (the Task-10 rule)
    expect(run({})[0]).toMatchObject({ value: null });
  });

  it('a `cell()` read over a grid carrier also qualifies', () => {
    const fields = [
      { id: 'g', symbol: 'matrix', dataType: 'json', unit: null },
      { id: 'o', symbol: 'out', dataType: 'number', unit: null },
    ];
    const { writes } = materializeDerivedOutputs({
      standardCode: 'X', worksheetCode: 'X-01',
      equations: [{ id: 'e-cell', equationNumber: 'E1', formula: "out = cell(matrix, 'r1', 'c1')", inputSymbols: ['matrix'], outputSymbol: 'out' }],
      fields,
      valuesByFieldId: { g: { type: 'json', value: { cells: { r1: { c1: 42 } } } } },
    });
    expect(writes).toHaveLength(1);
    expect(writes[0].value).toBe(42);
  });

  it('a REGISTER-fed equation is untouched by the narrowing (it never depended on the carrier gate)', () => {
    const fields = [
      { id: 'r', symbol: 'flaechen', dataType: 'json', unit: null, widget: 'register', uiConfig: { title: 'F', columns: [{ key: 'a', type: 'number', label: 'A', required: true }] } },
      { id: 'o', symbol: 'S', dataType: 'number', unit: null },
    ];
    const { writes } = materializeDerivedOutputs({
      standardCode: 'X', worksheetCode: 'X-01',
      equations: [{ id: 'e-sum', equationNumber: 'E1', formula: 'S = sum_rows(flaechen, a)', inputSymbols: ['flaechen'], outputSymbol: 'S' }],
      fields,
      valuesByFieldId: { r: { type: 'json', value: { rows: [{ id: '1', a: 4 }, { id: '2', a: 6 }] } } },
    });
    expect(writes).toHaveLength(1);
    expect(writes[0].value).toBe(10);
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
