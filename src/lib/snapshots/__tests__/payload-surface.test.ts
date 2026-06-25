/**
 * Test that buildSnapshotPayload computes A_C (and sibling outputs) for
 * A138-07 via the surfaceInventory aggregator branch.
 *
 * Uses the same fixture helpers as capture.test.ts — field/param rows are
 * derived from the real buildSnapshotPayload signature via `Parameters<>`.
 */
import { describe, it, expect } from 'vitest';
import { buildSnapshotPayload } from '../payload';

type FieldRow = Parameters<typeof buildSnapshotPayload>[0]['fields'][number];
type EquationRow = Parameters<typeof buildSnapshotPayload>[0]['equations'][number];
type ParameterRow = Parameters<typeof buildSnapshotPayload>[0]['parameters'][number];

function mkField(overrides: Partial<FieldRow> & { symbol: string; dataType: string }): FieldRow {
  return {
    id: `field-${overrides.symbol}`,
    worksheetTemplateId: 'tpl-a138-07',
    sectionId: null,
    labelDe: overrides.symbol,
    labelEn: null,
    unit: null,
    isRequired: false,
    enumValues: null,
    validationRules: null,
    clauseReference: null,
    description: null,
    consumerWorksheets: null,
    orderIndex: 0,
    verificationStatus: 'imported_unverified',
    active: true,
    defaultValue: null,
    ...overrides,
  } as FieldRow;
}

function mkParam(
  fieldId: string,
  value: { num?: number; json?: unknown },
): ParameterRow {
  return {
    id: `param-${fieldId}`,
    projectId: 'proj-test',
    fieldId,
    sourceWorksheetInstanceId: null,
    valueNumber: value.num != null ? (value.num as unknown as string) : null,
    valueText: null,
    valueEnum: null,
    valueDate: null,
    valueBoolean: null,
    valueJson: value.json ?? null,
    sourceType: 'entered',
    citationSource: null,
    citationSources: [],
    enteredBy: 'user-test',
    enteredAt: new Date('2026-06-25'),
    isStale: false,
  } as ParameterRow;
}

function mkEquation(
  overrides: Partial<EquationRow> & { equationNumber: string; formula: string },
): EquationRow {
  return {
    id: `eq-${overrides.equationNumber}`,
    worksheetTemplateId: 'tpl-a138-07',
    formulaLatex: null,
    inputSymbols: [],
    outputSymbol: null,
    outputUnit: null,
    clauseReference: null,
    description: null,
    verificationStatus: 'imported_unverified',
    ...overrides,
  } as EquationRow;
}

// Two surfaces: schwarzdecke_asphalt (paved, c_i=0.9, c_s=1.0).
// A_C = (3786.8 * 0.9) + (1575.9 * 0.9) = 3408.12 + 1418.31 = 4826.43
// C_m = 4826.43 / (3786.8 + 1575.9) = 4826.43 / 5362.7 ≈ 0.9
// A_E_ba = 5362.7, A_E_nba = 0
const SURFACE_CARRIER = {
  rows: [
    { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
    { id: '2', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
  ],
};

// A138-07 equation ids (verbatim from the plan + use-equation-engine.ts).
const A_C_ID    = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';
const C_M_ID    = 'a1380702-0000-4000-8000-000000000002';
const A_E_BA_ID = 'a1380702-0000-4000-8000-000000000003';
const A_E_NBA_ID = 'a1380702-0000-4000-8000-000000000004';

const FIELDS = [
  mkField({ symbol: 'surface_inventory', dataType: 'json' }),
  mkField({ symbol: 'A_C',    dataType: 'number', unit: 'm²' }),
  mkField({ symbol: 'C_m',    dataType: 'number' }),
  mkField({ symbol: 'A_E_ba', dataType: 'number', unit: 'm²' }),
  mkField({ symbol: 'A_E_nba', dataType: 'number', unit: 'm²' }),
];

const PARAMS = [
  mkParam('field-surface_inventory', { json: SURFACE_CARRIER }),
];

const EQUATIONS = [
  mkEquation({ id: A_C_ID,     equationNumber: '2',  formula: 'A_C = Σ(A_E·C_i)', inputSymbols: ['surface_inventory'], outputSymbol: 'A_C' }),
  mkEquation({ id: C_M_ID,     equationNumber: '2c', formula: 'C_m = A_C / A_E',   inputSymbols: ['surface_inventory'], outputSymbol: 'C_m' }),
  mkEquation({ id: A_E_BA_ID,  equationNumber: '2d', formula: 'A_E_ba = Σ(befestigt)', inputSymbols: ['surface_inventory'], outputSymbol: 'A_E_ba' }),
  mkEquation({ id: A_E_NBA_ID, equationNumber: '2e', formula: 'A_E_nba = Σ(unbefestigt)', inputSymbols: ['surface_inventory'], outputSymbol: 'A_E_nba' }),
];

describe('buildSnapshotPayload — A138-07 surface aggregator', () => {
  it('computes A_C = 4826.43 from surface_inventory carrier (two 0.9-surfaces)', () => {
    const payload = buildSnapshotPayload({
      worksheetCode: 'A138-07',
      fields: FIELDS,
      equations: EQUATIONS,
      complianceRequirements: [],
      parameters: PARAMS,
    });

    const ac = payload.equationOutputs['2'];
    expect(ac).toBeDefined();
    expect(ac.kind).toBe('computed');
    if (ac.kind === 'computed') {
      expect(ac.value).toBeCloseTo(4826.43, 2);
    }
  });

  it('computes C_m ≈ 0.9', () => {
    const payload = buildSnapshotPayload({
      worksheetCode: 'A138-07',
      fields: FIELDS,
      equations: EQUATIONS,
      complianceRequirements: [],
      parameters: PARAMS,
    });

    const cm = payload.equationOutputs['2c'];
    expect(cm).toBeDefined();
    expect(cm.kind).toBe('computed');
    if (cm.kind === 'computed') {
      expect(cm.value).toBeCloseTo(0.9, 6);
    }
  });

  it('computes A_E_ba = 5362.7 and A_E_nba = 0 (all paved)', () => {
    const payload = buildSnapshotPayload({
      worksheetCode: 'A138-07',
      fields: FIELDS,
      equations: EQUATIONS,
      complianceRequirements: [],
      parameters: PARAMS,
    });

    const ba = payload.equationOutputs['2d'];
    const nba = payload.equationOutputs['2e'];
    expect(ba.kind).toBe('computed');
    if (ba.kind === 'computed') expect(ba.value).toBeCloseTo(5362.7, 4);
    expect(nba.kind).toBe('computed');
    if (nba.kind === 'computed') expect(nba.value).toBe(0);
  });

  it('returns manual_required for A_C when surface_inventory has no complete rows', () => {
    const emptyParams = [
      mkParam('field-surface_inventory', { json: { rows: [] } }),
    ];
    const payload = buildSnapshotPayload({
      worksheetCode: 'A138-07',
      fields: FIELDS,
      equations: [EQUATIONS[0]], // only A_C
      complianceRequirements: [],
      parameters: emptyParams,
    });

    const ac = payload.equationOutputs['2'];
    expect(ac.kind).toBe('manual_required');
  });
});
