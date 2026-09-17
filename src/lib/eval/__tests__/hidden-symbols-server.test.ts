/**
 * Plan 2a Task 10 fix round 1 — spec §6 "hidden ⇒ null for engine and gates"
 * applies SERVER-side too: a symbol hidden by `visible_when` resolves to no
 * value on every equation path (report evaluator, snapshot payload, save-path
 * materialiser, PDF assembler), so an equation over it is `manual_required`
 * with `missing` naming the symbol — never `computed` from a value the
 * engineer cannot see. Register-fed outputs are still WRITTEN (as null).
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateWorksheetEquations,
  reportVisibility,
  type ReportField,
  type ReportEquation,
  type ReportParameter,
} from '../evaluate-for-report';
import { buildSnapshotPayload } from '@/lib/snapshots/payload';
import { materializeDerivedOutputs } from '../materialize-derived';
import { A138_07_REGISTER_FORMULAS } from '../rewrites';
import { assembleStandardReport, type AssemblerInput } from '@/lib/pdf/assemble-standard-report';

// x is only applicable in a Mischsystem; y = x * 2
const FIELDS: ReportField[] = [
  { id: 'f-sys', symbol: 'sewer_system_type', unit: null, dataType: 'enum', sectionId: null, visibleWhen: null },
  { id: 'f-x', symbol: 'x', unit: 'm', dataType: 'number', sectionId: null, visibleWhen: "sewer_system_type == 'misch'" },
  { id: 'f-y', symbol: 'y', unit: 'm', dataType: 'number', sectionId: null, visibleWhen: null },
];
const param = (fieldId: string, v: { num?: number; enumv?: string; json?: unknown }): ReportParameter => ({
  fieldId, valueNumber: v.num ?? null, valueText: null, valueEnum: v.enumv ?? null, valueBoolean: null, valueDate: null, valueJson: v.json ?? null,
});
const PARAMS = [param('f-sys', { enumv: 'trenn' }), param('f-x', { num: 5 })];
const EQ: ReportEquation = { id: 'eq-y', equationNumber: 'T-1', formula: 'y = x * 2', inputSymbols: ['x'], outputSymbol: 'y', outputUnit: 'm' };

describe('report evaluator: hidden input ⇒ manual_required, not computed', () => {
  it('without hiddenSymbols the stored x=5 computes y=10 (the defect); with it, manual_required naming x', () => {
    const before = evaluateWorksheetEquations('TEST-01', [EQ], FIELDS, PARAMS);
    expect(before[0].state.kind).toBe('computed');
    const { hiddenSymbols } = reportVisibility(FIELDS, [], PARAMS);
    expect([...hiddenSymbols]).toEqual(['x']);
    const after = evaluateWorksheetEquations('TEST-01', [EQ], FIELDS, PARAMS, { hiddenSymbols });
    expect(after[0].state.kind).toBe('manual_required');
    if (after[0].state.kind === 'manual_required') expect(after[0].state.missing).toContain('x');
  });
  it('visible (misch) ⇒ still computed', () => {
    const params = [param('f-sys', { enumv: 'misch' }), param('f-x', { num: 5 })];
    const { hiddenSymbols } = reportVisibility(FIELDS, [], params);
    const out = evaluateWorksheetEquations('TEST-01', [EQ], FIELDS, params, { hiddenSymbols });
    expect(out[0].state.kind).toBe('computed');
  });
});

describe('snapshot payload: hidden input ⇒ manual_required; the stored parameter is still recorded', () => {
  type FieldRow = Parameters<typeof buildSnapshotPayload>[0]['fields'][number];
  type ParamRow = Parameters<typeof buildSnapshotPayload>[0]['parameters'][number];
  const mkField = (o: Partial<FieldRow> & { id: string; symbol: string; dataType: string }): FieldRow => ({
    worksheetTemplateId: 't', sectionId: null, labelDe: o.symbol, labelEn: null, unit: null, isRequired: false, enumValues: null,
    validationRules: null, clauseReference: null, description: null, consumerWorksheets: null, orderIndex: 0,
    verificationStatus: 'imported_unverified', active: true, defaultValue: null, visibleWhen: null, ...o,
  } as FieldRow);
  const mkParam = (fieldId: string, v: { num?: number; enumv?: string }): ParamRow => ({
    id: `p-${fieldId}`, projectId: 'p', fieldId, sourceWorksheetInstanceId: null,
    valueNumber: v.num != null ? (String(v.num) as unknown as string) : null, valueText: null, valueEnum: v.enumv ?? null,
    valueDate: null, valueBoolean: null, valueJson: null, sourceType: 'entered', citationSource: null, citationSources: [],
    enteredBy: 'u', enteredAt: new Date('2026-09-17'), isStale: false,
  } as ParamRow);
  const fields = [
    mkField({ id: 'f-sys', symbol: 'sewer_system_type', dataType: 'enum' }),
    mkField({ id: 'f-x', symbol: 'x', dataType: 'number', visibleWhen: "sewer_system_type == 'misch'" }),
    mkField({ id: 'f-y', symbol: 'y', dataType: 'number' }),
  ];
  const equations = [{ id: 'eq-y', worksheetTemplateId: 't', equationNumber: 'T-1', formula: 'y = x * 2', formulaLatex: null, inputSymbols: ['x'], outputSymbol: 'y', outputUnit: null, clauseReference: null, description: null, verificationStatus: 'imported_unverified' } as Parameters<typeof buildSnapshotPayload>[0]['equations'][number]];
  it('trenn ⇒ x hidden ⇒ T-1 manual_required; parameters still carry x=5', () => {
    const payload = buildSnapshotPayload({ worksheetCode: 'TEST-01', fields, equations, complianceRequirements: [], parameters: [mkParam('f-sys', { enumv: 'trenn' }), mkParam('f-x', { num: 5 })], sections: [] });
    expect(payload.equationOutputs['T-1'].kind).toBe('manual_required');
    expect(payload.parameters['f-x']?.value).toBe(5);
  });
  it('misch ⇒ computed 10', () => {
    const payload = buildSnapshotPayload({ worksheetCode: 'TEST-01', fields, equations, complianceRequirements: [], parameters: [mkParam('f-sys', { enumv: 'misch' }), mkParam('f-x', { num: 5 })], sections: [] });
    expect(payload.equationOutputs['T-1']).toMatchObject({ kind: 'computed', value: 10 });
  });
});

describe('save-path materialiser: a hidden register still WRITES its outputs — as null', () => {
  const fields = [
    { id: 'f-si', symbol: 'surface_inventory', dataType: 'json', unit: null },
    ...Object.values(A138_07_REGISTER_FORMULAS).map((r, i) => ({ id: `f-${i}`, symbol: r.outputSymbol, dataType: 'number', unit: null })),
  ];
  const equations = Object.entries(A138_07_REGISTER_FORMULAS).map(([id, r]) => ({ id, equationNumber: r.outputSymbol, formula: r.formula, inputSymbols: ['surface_inventory'], outputSymbol: r.outputSymbol }));
  const values = { 'f-si': { type: 'json' as const, value: { rows: [{ id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 100, c_i: 0.9, c_s: 1.0, coeff_override: false }] } } };
  it('visible ⇒ A_C = 90; hidden register ⇒ six writes, all null / manual_required', () => {
    const on = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations, fields, valuesByFieldId: values });
    expect(on.writes.find((w) => w.symbol === 'A_C')!.value).toBeCloseTo(90, 6);
    const off = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations, fields, valuesByFieldId: values, hiddenSymbols: new Set(['surface_inventory']) });
    expect(off.writes).toHaveLength(6);
    expect(off.writes.every((w) => w.value === null && w.state.kind === 'manual_required')).toBe(true);
  });
  it('a hidden SCALAR input of a register-fed equation ⇒ null write', () => {
    const f2 = [...fields, { id: 'f-k', symbol: 'k', dataType: 'number', unit: null }, { id: 'f-z', symbol: 'z', dataType: 'number', unit: null }];
    const eq = [{ id: 'eq-z', equationNumber: 'Z', formula: 'z = sum_rows(surface_inventory, area_m2) * k', inputSymbols: ['surface_inventory', 'k'], outputSymbol: 'z' }];
    const v2 = { ...values, 'f-k': { type: 'number' as const, value: 2 } };
    expect(materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations: eq, fields: f2, valuesByFieldId: v2 }).writes[0].value).toBeCloseTo(200, 6);
    const w = materializeDerivedOutputs({ standardCode: 'DWA-A-138-1', worksheetCode: 'A138-07', equations: eq, fields: f2, valuesByFieldId: v2, hiddenSymbols: new Set(['k']) }).writes[0];
    expect(w.value).toBeNull();
    expect(w.state.kind).toBe('manual_required');
  });
});

describe('PDF assembler: hidden input ⇒ evalState manual_required', () => {
  const input = (sys: string): AssemblerInput => ({
    project: { id: 'p', name: 'P', projectCode: null, clientName: null, location: null, siteProfile: null, createdAt: '2026-01-01T00:00:00.000Z' },
    org: null,
    standard: { id: 's', code: 'TEST', titleDe: 'T', version: '2026' },
    templates: [{ id: 't', code: 'TEST-01', titleDe: 'W', orderIndex: 0 }],
    instances: [{ id: 'i', worksheetTemplateId: 't', status: 'draft' }],
    sections: [],
    fields: [
      { id: 'f-sys', worksheetTemplateId: 't', sectionId: null, symbol: 'sewer_system_type', labelDe: 'Sys', unit: null, dataType: 'enum', isRequired: false, clauseReference: null, orderIndex: 0 },
      { id: 'f-x', worksheetTemplateId: 't', sectionId: null, symbol: 'x', labelDe: 'x', unit: 'm', dataType: 'number', isRequired: false, clauseReference: null, orderIndex: 1, visibleWhen: "sewer_system_type == 'misch'" },
      { id: 'f-y', worksheetTemplateId: 't', sectionId: null, symbol: 'y', labelDe: 'y', unit: 'm', dataType: 'number', isRequired: false, clauseReference: null, orderIndex: 2 },
    ],
    equations: [{ id: 'eq-y', worksheetTemplateId: 't', equationNumber: 'T-1', formula: 'y = x * 2', formulaLatex: null, inputSymbols: ['x'], outputSymbol: 'y', outputUnit: 'm', clauseReference: null }],
    compliance: [],
    parameters: [
      { fieldId: 'f-sys', valueNumber: null, valueText: null, valueEnum: sys, valueDate: null, valueBoolean: null, valueJson: null, sourceType: 'entered', citationSources: [] },
      { fieldId: 'f-x', valueNumber: '5', valueText: null, valueEnum: null, valueDate: null, valueBoolean: null, valueJson: null, sourceType: 'entered', citationSources: [] },
    ],
    documents: [],
    approvals: [],
    audits: [],
    now: new Date('2026-09-17T00:00:00.000Z'),
  });
  const stateFor = (sys: string) => {
    const r = assembleStandardReport(input(sys));
    return r.worksheets[0].equations.find((e) => e.equationNumber === 'T-1')!.evalState;
  };
  it('trenn ⇒ manual_required; misch ⇒ computed 10', () => {
    expect(stateFor('trenn')?.kind).toBe('manual_required');
    expect(stateFor('misch')).toMatchObject({ kind: 'computed', value: 10 });
  });
});
