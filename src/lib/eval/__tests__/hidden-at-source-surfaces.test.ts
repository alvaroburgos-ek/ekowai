/**
 * Fix round 3 of UX cluster A (controller ruling R-16): „hidden at source ⇒ hidden" is ONE rule for every verdict
 * surface. The snapshot verdict (buildSnapshotPayload ← capture / rationale) and the report evaluator
 * (evaluateWorksheetCompliance ← PDF project report, recompute) union the approval gate's hidden-at-source symbols into
 * their hiddenSymbols with `gateHiddenSymbols`. Case: 820-2-22 REQ-46 reads `testbetrieb_vs_abnahme_choice`, which
 * 820-2-18 asks only when `bauleistungen_vergeben == true`; with a leftover 'testbetrieb' and testbetrieb_planned =
 * false the verdict was `fail` — it must be `not_applicable`.
 */
import { describe, it, expect } from 'vitest';
import { buildSnapshotPayload } from '@/lib/snapshots/payload';
import { evaluateWorksheetCompliance, type ReportField, type ReportParameter } from '../evaluate-for-report';
import { gateHiddenSymbols } from '@/lib/projects/required-field-counts';

// REQ-46 as staged in scripts/migrations/20261006100000_m820_2_structure.sql:327
const REQ_46 = "IF testbetrieb_vs_abnahme_choice == 'testbetrieb' OR testbetrieb_vs_abnahme_choice == 'mischform' THEN (testbetrieb_planned == true)";
const SOURCE_HIDDEN = ['testbetrieb_vs_abnahme_choice'];

describe('snapshot verdict (buildSnapshotPayload)', () => {
  type FieldRow = Parameters<typeof buildSnapshotPayload>[0]['fields'][number];
  type ParamRow = Parameters<typeof buildSnapshotPayload>[0]['parameters'][number];
  const mkField = (o: Partial<FieldRow> & { id: string; symbol: string; dataType: string }): FieldRow => ({
    worksheetTemplateId: 't22', sectionId: null, labelDe: o.symbol, labelEn: null, unit: null, isRequired: false, enumValues: null,
    validationRules: null, clauseReference: null, description: null, consumerWorksheets: null, orderIndex: 0,
    verificationStatus: 'imported_unverified', active: true, defaultValue: null, visibleWhen: null, ...o,
  } as FieldRow);
  const mkParam = (fieldId: string, v: { bool?: boolean; enumv?: string }): ParamRow => ({
    id: `p-${fieldId}`, projectId: 'p', fieldId, sourceWorksheetInstanceId: null,
    valueNumber: null, valueText: null, valueEnum: v.enumv ?? null,
    valueDate: null, valueBoolean: v.bool ?? null, valueJson: null, sourceType: 'entered', citationSource: null, citationSources: [],
    enteredBy: 'u', enteredAt: new Date('2026-10-08'), isStale: false,
  } as ParamRow);
  // own 820-2-22 field + the choice inherited from 820-2-18 (leftover value)
  const fields = [
    mkField({ id: 'f-tb', symbol: 'testbetrieb_planned', dataType: 'boolean' }),
    { ...mkField({ id: 'f-choice', symbol: 'testbetrieb_vs_abnahme_choice', dataType: 'enum', worksheetTemplateId: 't18' }), inheritedFromWorksheet: '820-2-18' } as FieldRow,
  ];
  const crs = [{ id: 'cr-46', worksheetTemplateId: 't22', code: 'REQ-46', titleDe: 'Testbetrieb', titleEn: null, condition: REQ_46, description: null, clauseReference: null, severity: 'block' }] as unknown as Parameters<typeof buildSnapshotPayload>[0]['complianceRequirements'];
  const params = [mkParam('f-tb', { bool: false }), mkParam('f-choice', { enumv: 'testbetrieb' })];
  const build = (sourceHiddenSymbols?: string[]) => buildSnapshotPayload({
    worksheetCode: '820-2-22', fields, equations: [], complianceRequirements: crs, parameters: params, sections: [], sourceHiddenSymbols,
  });

  it('without R-16 the leftover decides (fail) — the divergence', () => {
    expect(build().complianceResults['cr-46']).toBe('fail');
  });
  it('R-16: the hidden-at-source symbol is hidden ⇒ not_applicable (as the approval gate decides)', () => {
    expect(build(SOURCE_HIDDEN).complianceResults['cr-46']).toBe('not_applicable');
  });
  it('a symbol that is a field of this sheet is never hidden by the source set', () => {
    expect(build(['testbetrieb_planned']).complianceResults['cr-46']).toBe('fail');
  });
});

describe('report evaluator (evaluateWorksheetCompliance — PDF project report, recompute)', () => {
  const fields: ReportField[] = [
    { id: 'f-tb', symbol: 'testbetrieb_planned', unit: null, dataType: 'boolean', sectionId: null, visibleWhen: null },
    { id: 'f-choice', symbol: 'testbetrieb_vs_abnahme_choice', unit: null, dataType: 'enum', sectionId: null, visibleWhen: null },
  ];
  const params: ReportParameter[] = [
    { fieldId: 'f-tb', valueNumber: null, valueText: null, valueEnum: null, valueBoolean: false, valueDate: null, valueJson: null },
    { fieldId: 'f-choice', valueNumber: null, valueText: null, valueEnum: 'testbetrieb', valueBoolean: null, valueDate: null, valueJson: null },
  ];
  const rows = [{ id: 'cr-46', code: 'REQ-46', titleDe: 'Testbetrieb', condition: REQ_46, severity: 'block', description: null, requiresAttestation: false }];
  const own = new Set(['testbetrieb_planned']); // the choice lives on 820-2-18, not on this sheet
  const run = (hidden: ReadonlySet<string>) => evaluateWorksheetCompliance('820-2-22', rows, fields, params, [], { hiddenSymbols: hidden }).map((r) => r.result.kind);

  it('without R-16: fail on the leftover', () => {
    expect(run(new Set())).toEqual(['fail']);
  });
  it('R-16: gateHiddenSymbols(own hidden, source hidden, own fields) ⇒ not_applicable', () => {
    expect(run(gateHiddenSymbols(new Set(), SOURCE_HIDDEN, own))).toEqual(['not_applicable']);
  });
});
