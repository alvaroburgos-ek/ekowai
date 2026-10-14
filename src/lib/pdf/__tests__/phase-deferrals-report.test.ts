/**
 * C-9 (2026-10-14): the standard report (and, through it, the conformity declaration / checklist / Prüf-Memo) lists the
 * phases answered „not reached" and the gates their guards skipped. Verdicts unchanged — REQ-43 stays a guard-skipped
 * pass, the attribution is an extra field.
 */
import { describe, it, expect } from 'vitest';
import { assembleStandardReport, type AssemblerInput } from '../assemble-standard-report';

const P = (fieldId: string, v: Partial<{ b: boolean; e: string }>) => ({
  fieldId, valueNumber: null, valueText: null, valueEnum: v.e ?? null, valueDate: null, valueBoolean: v.b ?? null, valueJson: null,
  sourceType: 'entered', citationSources: [],
});

function input(phase: boolean | null, lph8 = 'auftragnehmer'): AssemblerInput {
  return {
    project: { id: 'p', name: 'P', projectCode: 'C1', clientName: null, location: null, siteProfile: null, createdAt: '2026-10-01T00:00:00.000Z' },
    org: null,
    standard: { id: 's', code: 'DWA-M-820-2', titleDe: 'Qualitätssicherung', version: '2026-02' },
    templates: [
      { id: 't01', code: '820-2-01', titleDe: 'Projekt', orderIndex: 1 },
      { id: 't20', code: '820-2-20', titleDe: 'Ausführung', orderIndex: 20 },
    ],
    instances: [],
    sections: [],
    fields: [
      { id: 'f-lph8', worksheetTemplateId: 't01', sectionId: null, symbol: 'verantwortung_lph8', labelDe: 'LPH 8', unit: null, dataType: 'enum', isRequired: true, clauseReference: null, orderIndex: 1 },
      { id: 'f-phase', worksheetTemplateId: 't20', sectionId: null, symbol: 'phase_ausfuehrung_erreicht', labelDe: 'Phase „Ausführung“ erreicht', labelEn: 'Phase "execution" reached', unit: null, dataType: 'boolean', isRequired: true, clauseReference: null, orderIndex: 1 },
      { id: 'f-qsa', worksheetTemplateId: 't20', sectionId: null, symbol: 'quality_supervision_active', labelDe: 'Qualitätsüberwachung aktiv', unit: null, dataType: 'boolean', isRequired: true, clauseReference: null, orderIndex: 2, visibleWhen: "(verantwortung_lph8 != 'entfaellt') AND (phase_ausfuehrung_erreicht == true)" },
    ],
    equations: [],
    compliance: [
      { id: 'c43', worksheetTemplateId: 't20', code: 'REQ-43', titleDe: 'Qualitätsüberwachung während der Bauüberwachung', titleEn: 'Quality supervision during site supervision', condition: "IF verantwortung_lph8 != 'entfaellt' THEN (IF phase_ausfuehrung_erreicht == true THEN (quality_supervision_active == true))", severity: 'block', clauseReference: '§5.6.2' },
    ],
    parameters: [P('f-lph8', { e: lph8 }), ...(phase === null ? [] : [P('f-phase', { b: phase })])],
    documents: [],
    approvals: [],
    audits: [],
    now: new Date('2026-10-14T12:00:00.000Z'),
  } as AssemblerInput;
}

describe('assembleStandardReport — phaseDeferrals (C-9)', () => {
  it('phase Nein ⇒ listed with REQ-43; REQ-43 verdict stays a guard-skipped pass', () => {
    const d = assembleStandardReport(input(false));
    expect(d.phaseDeferrals).toEqual([
      {
        worksheetCode: '820-2-20',
        symbol: 'phase_ausfuehrung_erreicht',
        labelDe: 'Phase „Ausführung“ erreicht',
        labelEn: 'Phase "execution" reached',
        gates: [{ worksheetCode: '820-2-20', code: 'REQ-43', titleDe: 'Qualitätsüberwachung während der Bauüberwachung', titleEn: 'Quality supervision during site supervision', severity: 'block' }],
      },
    ]);
    const req43 = d.worksheets.find((w) => w.code === '820-2-20')!.compliance[0];
    expect(req43.result).toEqual({ kind: 'pass', guardSkipped: true });
    expect(req43.skippedBy).toEqual(['phase_ausfuehrung_erreicht']);
  });

  it('phase Ja ⇒ nothing listed, REQ-43 checked (fails without the confirmation)', () => {
    const d = assembleStandardReport(input(true));
    expect(d.phaseDeferrals).toEqual([]);
    expect(d.worksheets.find((w) => w.code === '820-2-20')!.compliance[0].result.kind).not.toBe('pass');
  });

  it('phase unanswered ⇒ nothing listed', () => {
    expect(assembleStandardReport(input(null)).phaseDeferrals).toEqual([]);
  });

  it('LPH 8 entfällt ⇒ phase still listed (answered Nein) but REQ-43 is attributed to the outer guard, not the phase', () => {
    const d = assembleStandardReport(input(false, 'entfaellt'));
    expect(d.phaseDeferrals).toHaveLength(1);
    expect(d.phaseDeferrals![0].gates).toEqual([]);
  });
});
