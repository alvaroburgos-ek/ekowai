/**
 * Plan 2a, Task 11 — snapshot verdict `not_applicable`.
 *
 * A compliance condition referencing a field hidden by `visible_when` under
 * the saved values is stored as the distinct verdict `'not_applicable'` —
 * not flattened to `'open'` (which would read as "inputs missing") and never
 * `'pass'`/`'fail'` from a value the engineer cannot see.
 */
import { describe, it, expect } from 'vitest';
import { buildSnapshotPayload, type SnapshotComplianceVerdict } from '../payload';

type FieldRow = Parameters<typeof buildSnapshotPayload>[0]['fields'][number];
type ParamRow = Parameters<typeof buildSnapshotPayload>[0]['parameters'][number];
type ComplianceRow = Parameters<typeof buildSnapshotPayload>[0]['complianceRequirements'][number];

const mkField = (o: Partial<FieldRow> & { id: string; symbol: string; dataType: string }): FieldRow =>
  ({
    worksheetTemplateId: 't', sectionId: null, labelDe: o.symbol, labelEn: null, unit: null, isRequired: false,
    enumValues: null, validationRules: null, clauseReference: null, description: null, consumerWorksheets: null,
    orderIndex: 0, verificationStatus: 'imported_unverified', active: true, defaultValue: null, visibleWhen: null, ...o,
  }) as FieldRow;
const mkParam = (fieldId: string, v: { num?: number; enumv?: string }): ParamRow =>
  ({
    id: `p-${fieldId}`, projectId: 'p', fieldId, sourceWorksheetInstanceId: null,
    valueNumber: v.num != null ? (String(v.num) as unknown as string) : null, valueText: null, valueEnum: v.enumv ?? null,
    valueDate: null, valueBoolean: null, valueJson: null, sourceType: 'entered', citationSource: null, citationSources: [],
    enteredBy: 'u', enteredAt: new Date('2026-09-17'), isStale: false,
  }) as ParamRow;
const mkCr = (code: string, condition: string): ComplianceRow =>
  ({
    id: `req-${code}`, worksheetTemplateId: 't', code, titleDe: code, titleEn: null, description: null,
    clauseReference: null, severity: 'block', suggestion: null, condition,
  }) as ComplianceRow;

const fields = [
  mkField({ id: 'f-sys', symbol: 'sewer_system_type', dataType: 'enum' }),
  mkField({ id: 'f-x', symbol: 'x', dataType: 'number', visibleWhen: "sewer_system_type == 'misch'" }),
];
const requirements = [mkCr('CR-X', 'x >= 1')];

describe('buildSnapshotPayload — hidden-symbol gate verdict', () => {
  it("trenn ⇒ x hidden ⇒ 'not_applicable' (not 'open', not 'pass')", () => {
    const payload = buildSnapshotPayload({
      worksheetCode: 'TEST-01', fields, equations: [], complianceRequirements: requirements,
      parameters: [mkParam('f-sys', { enumv: 'trenn' }), mkParam('f-x', { num: 5 })], sections: [],
    });
    const verdict: SnapshotComplianceVerdict = payload.complianceResults['req-CR-X'];
    expect(verdict).toBe('not_applicable');
  });

  it("misch ⇒ x visible ⇒ 'pass' from the stored 5", () => {
    const payload = buildSnapshotPayload({
      worksheetCode: 'TEST-01', fields, equations: [], complianceRequirements: requirements,
      parameters: [mkParam('f-sys', { enumv: 'misch' }), mkParam('f-x', { num: 5 })], sections: [],
    });
    expect(payload.complianceResults['req-CR-X']).toBe('pass');
  });
});
