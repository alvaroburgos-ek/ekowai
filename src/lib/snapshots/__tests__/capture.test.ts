/**
 * Pure-payload tests for buildSnapshotPayload — no DB. Uses fixture
 * field/equation/compliance/parameter rows that match the production schema
 * shape so the test exercises the same code path the server uses inside
 * transitionWorksheet.
 */
import { describe, it, expect } from 'vitest';
import { buildSnapshotPayload } from '../payload';

type FieldRow = Parameters<typeof buildSnapshotPayload>[0]['fields'][number];
type EquationRow = Parameters<typeof buildSnapshotPayload>[0]['equations'][number];
type ComplianceRow = Parameters<typeof buildSnapshotPayload>[0]['complianceRequirements'][number];
type ParameterRow = Parameters<typeof buildSnapshotPayload>[0]['parameters'][number];

function mkField(overrides: Partial<FieldRow> & { symbol: string; dataType: string }): FieldRow {
  const base = {
    id: `field-${overrides.symbol}`,
    worksheetTemplateId: 'tpl-1',
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
  };
  return { ...base, ...overrides } as FieldRow;
}

function mkParam(fieldId: string, value: { num?: number; text?: string; bool?: boolean; json?: unknown }): ParameterRow {
  return {
    id: `param-${fieldId}`,
    projectId: 'proj-1',
    fieldId,
    sourceWorksheetInstanceId: null,
    valueNumber: value.num != null ? (value.num as unknown as string) : null,
    valueText: value.text ?? null,
    valueEnum: null,
    valueDate: null,
    valueBoolean: value.bool ?? null,
    valueJson: value.json ?? null,
    sourceType: 'entered',
    citationSource: null,
    citationSources: [],
    enteredBy: 'user-1',
    enteredAt: new Date('2026-05-01'),
    isStale: false,
  } as ParameterRow;
}

function mkEquation(overrides: Partial<EquationRow> & { equationNumber: string; formula: string }): EquationRow {
  const base = {
    id: `eq-${overrides.equationNumber}`,
    worksheetTemplateId: 'tpl-1',
    formulaLatex: null,
    inputSymbols: [],
    outputSymbol: null,
    outputUnit: null,
    clauseReference: null,
    description: null,
    verificationStatus: 'imported_unverified',
  };
  return { ...base, ...overrides } as EquationRow;
}

function mkCompliance(overrides: Partial<ComplianceRow> & { code: string; condition: string }): ComplianceRow {
  const base = {
    id: `req-${overrides.code}`,
    worksheetTemplateId: 'tpl-1',
    titleDe: overrides.code,
    titleEn: null,
    description: null,
    clauseReference: null,
    severity: 'normal',
    suggestion: null,
  };
  return { ...base, ...overrides } as ComplianceRow;
}

describe('buildSnapshotPayload', () => {
  it('captures parameters with type/value/unit/citationSources', () => {
    const fields = [
      mkField({ symbol: 'A', dataType: 'number', unit: 'm²' }),
      mkField({ symbol: 'B', dataType: 'text' }),
    ];
    const params = [
      mkParam('field-A', { num: 42 }),
      mkParam('field-B', { text: 'hello' }),
    ];

    const payload = buildSnapshotPayload({
      fields,
      equations: [],
      complianceRequirements: [],
      parameters: params,
      worksheetCode: 'A138-99',
    });

    expect(payload.parameters['field-A']).toEqual({
      type: 'number',
      value: 42,
      unit: 'm²',
      citationSources: [],
    });
    expect(payload.parameters['field-B']).toEqual({
      type: 'text',
      value: 'hello',
      unit: null,
      citationSources: [],
    });
  });

  it('skips fields with no stored parameter (no implicit null entries)', () => {
    const fields = [mkField({ symbol: 'A', dataType: 'number' })];
    const payload = buildSnapshotPayload({
      fields,
      equations: [],
      complianceRequirements: [],
      parameters: [], // no params at all
      worksheetCode: 'A138-99',
    });
    expect(payload.parameters).toEqual({});
  });

  it('marks non-whitelisted equations as `skipped`', () => {
    const equations = [mkEquation({ equationNumber: '99', formula: 'X = 1' })];
    const payload = buildSnapshotPayload({
      fields: [],
      equations,
      complianceRequirements: [],
      parameters: [],
      worksheetCode: 'A138-NOT-WIRED',
    });
    expect(payload.equationOutputs['99'].kind).toBe('skipped');
    if (payload.equationOutputs['99'].kind === 'skipped') {
      expect(payload.equationOutputs['99'].manualRequiredReason).toMatch(/Engine/i);
    }
  });

  it('flattens compliance pending/manual to `open`', () => {
    // condition references symbol with no stored value → pending → open
    const fields = [mkField({ symbol: 'k_f', dataType: 'number' })];
    const requirements = [
      mkCompliance({ code: 'C1', condition: 'k_f >= 1e-6' }),
      // unparseable prose → manual → open
      mkCompliance({ code: 'C2', condition: 'Engineer attestation required' }),
    ];
    const payload = buildSnapshotPayload({
      fields,
      equations: [],
      complianceRequirements: requirements,
      parameters: [], // no k_f value → pending
      worksheetCode: 'A138-99',
    });
    expect(payload.complianceResults['req-C1']).toBe('open');
    expect(payload.complianceResults['req-C2']).toBe('open');
  });

  it('evaluates compliance pass/fail when all inputs present', () => {
    const fields = [mkField({ symbol: 'k_f', dataType: 'number' })];
    const requirements = [
      mkCompliance({ code: 'PASS', condition: 'k_f >= 1e-6' }),
      mkCompliance({ code: 'FAIL', condition: 'k_f <= 0' }),
    ];
    const params = [mkParam('field-k_f', { num: 1e-3 })];
    const payload = buildSnapshotPayload({
      fields,
      equations: [],
      complianceRequirements: requirements,
      parameters: params,
      worksheetCode: 'A138-99',
    });
    expect(payload.complianceResults['req-PASS']).toBe('pass');
    expect(payload.complianceResults['req-FAIL']).toBe('fail');
  });

  it('returns three-state shape for equation outputs', () => {
    // Use a whitelisted equation that's pure arithmetic with no aggregator
    // path so the unit test doesn't need a real DB-issued equation id.
    // Gl. 17 on A138-18 is registered with a non-aggregator profile and we
    // can pass its DB id directly. But the real ids are loaded from the
    // worksheet's equation row in production. Here we rely on the
    // whitelist gate matching by (worksheetCode, equationNumber) → so the
    // engine path runs; whether it returns computed or manual_required
    // depends on whether all inputs are supplied.
    const equations = [
      mkEquation({
        // The actual id from formula-Gl4-7-11-12-16-17-18.test.ts for Gl. 17.
        id: '8afdb49a-7bb1-4f07-a64e-43009b8b6be1',
        equationNumber: '17',
        formula: 'A_S_m = (b_R + h_R) * L_R + b_R * h_R',
        inputSymbols: ['b_R', 'h_R', 'L_R'],
        outputSymbol: 'A_S_m',
      }),
    ];

    // Case 1: all inputs missing → manual_required
    const noInputs = buildSnapshotPayload({
      fields: [],
      equations,
      complianceRequirements: [],
      parameters: [],
      worksheetCode: 'A138-18',
    });
    expect(noInputs.equationOutputs['17'].kind).toBe('manual_required');
    if (noInputs.equationOutputs['17'].kind === 'manual_required') {
      expect(noInputs.equationOutputs['17'].manualRequiredReason).toMatch(/Fehlende/);
    }

    // Case 2: all inputs present → computed
    const fields = [
      mkField({ symbol: 'b_R', dataType: 'number' }),
      mkField({ symbol: 'h_R', dataType: 'number' }),
      mkField({ symbol: 'L_R', dataType: 'number' }),
    ];
    const params = [
      mkParam('field-b_R', { num: 2 }),
      mkParam('field-h_R', { num: 1 }),
      mkParam('field-L_R', { num: 10 }),
    ];
    const computed = buildSnapshotPayload({
      fields,
      equations,
      complianceRequirements: [],
      parameters: params,
      worksheetCode: 'A138-18',
    });
    expect(computed.equationOutputs['17'].kind).toBe('computed');
    if (computed.equationOutputs['17'].kind === 'computed') {
      // (2+1)*10 + 2*1 = 32
      expect(computed.equationOutputs['17'].value).toBeCloseTo(32, 6);
      expect(computed.equationOutputs['17'].substituted).toEqual({
        b_R: 2,
        h_R: 1,
        L_R: 10,
      });
    }
  });
});
