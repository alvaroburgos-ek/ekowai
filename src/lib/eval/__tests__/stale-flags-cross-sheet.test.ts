/**
 * Fix round 1 of UX cluster A (review 25d4bd1): M-1 (ruling R-13) cross-sheet drivers flag answers on consumer sheets;
 * R-14 („hidden ⇒ absent") — a driver hidden on its own source sheet is absent on the consumer, so the page and the save
 * path agree and a „Bestätigen" re-save can never re-flag a field the page shows as visible.
 */
import { describe, it, expect } from 'vitest';
import { consumerTemplatesReferencing, planStaleFlags, templateHasVisibilityRules } from '../stale-flags';
import type { CountField, CountParam, RequiredFieldCountArgs } from '@/lib/projects/required-field-counts';

describe('consumerTemplatesReferencing (R-13)', () => {
  const ruleFields = [
    { templateId: 'T11', symbol: 'leistungswettbewerb_only', visibleWhen: "procurement_procedure != 'direktvergabe'" },
    { templateId: 'T14', symbol: 'price_weight_percent', visibleWhen: "procurement_procedure != 'direktvergabe'" },
    { templateId: 'T04', symbol: 'bedarfsplanung_konzept_complete', visibleWhen: "project_type == 'konzept'" },
    { templateId: 'T10', symbol: 'own_rule', visibleWhen: "procurement_procedure == 'vgv_f'" },
    { templateId: 'T99', symbol: 'broken', visibleWhen: 'procurement_procedure ==' },
    { templateId: 'A12', symbol: 'a_s_m_provenance', visibleWhen: null }, // legacy TS rule (A138-12)
  ];
  const ruleSections = [{ templateId: 'T20', visibleWhen: 'procurement_procedure IS NOT NULL' }];

  it('a written driver names every OTHER template whose field or section rule reads it', () => {
    const c = consumerTemplatesReferencing(new Set(['procurement_procedure']), ruleFields, ruleSections, 'T10');
    expect([...c].sort()).toEqual(['T11', 'T14', 'T20']);
  });
  it('M820-04 is a consumer of project_type (M820-01)', () => {
    expect([...consumerTemplatesReferencing(new Set(['project_type']), ruleFields, [], 'T01')]).toEqual(['T04']);
  });
  it('the enum token on the right-hand side is a literal, not a symbol', () => {
    expect(consumerTemplatesReferencing(new Set(['direktvergabe']), ruleFields, ruleSections, 'T10').size).toBe(0);
  });
  it('a legacy (TS) rule counts: a_s_m_determination_method reaches the A138-12 provenance field', () => {
    expect([...consumerTemplatesReferencing(new Set(['a_s_m_determination_method']), ruleFields, [], 'X')]).toEqual(['A12']);
  });
  it('nothing written ⇒ no consumer; an unparseable rule ⇒ never a consumer', () => {
    expect(consumerTemplatesReferencing(new Set(), ruleFields, ruleSections, 'T10').size).toBe(0);
    expect(consumerTemplatesReferencing(new Set(['procurement_procedure']), [ruleFields[4]], [], 'T10').size).toBe(0);
  });
  it('templateHasVisibilityRules: field rule, section rule, none', () => {
    expect(templateHasVisibilityRules('T10', ruleFields, ruleSections)).toBe(true);
    expect(templateHasVisibilityRules('T20', ruleFields, ruleSections)).toBe(true);
    expect(templateHasVisibilityRules('A12', ruleFields, ruleSections)).toBe(true);
    expect(templateHasVisibilityRules('T00', ruleFields, ruleSections)).toBe(false);
  });
});

const empty = { valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null };
const cf = (o: Partial<CountField> & { id: string; symbol: string; templateId: string }): CountField => ({
  labelDe: o.symbol, dataType: 'boolean', isRequired: false, sectionId: null, visibleWhen: null, ...o,
});

describe('planStaleFlags — the save-path decision (R-12 + R-13 + R-14)', () => {
  // DWA-M 820-1: M820-10 holds the procedure; M820-11 asks leistungswettbewerb_only unless it is a direct award.
  const fields = [
    cf({ id: 'f-proc', symbol: 'procurement_procedure', templateId: 'T10', dataType: 'enum' }),
    cf({ id: 'f-lw', symbol: 'leistungswettbewerb_only', templateId: 'T11', visibleWhen: "procurement_procedure != 'direktvergabe'" }),
  ];
  const mk = (procedure: string, lw: CountParam): RequiredFieldCountArgs => ({
    templateIds: ['T10', 'T11'],
    fields,
    sections: [],
    paramByFieldId: new Map<string, CountParam>([['f-proc', { ...empty, valueEnum: procedure }], ['f-lw', lw]]),
    projectEntries: [
      { symbol: 'procurement_procedure', value: procedure, templateId: 'T10', fieldId: 'f-proc' },
      { symbol: 'leistungswettbewerb_only', value: lw.valueBoolean, templateId: 'T11', fieldId: 'f-lw' },
    ],
    ownScope: {
      templateIds: new Set(['T10', 'T11']),
      symbols: new Set(['procurement_procedure', 'leistungswettbewerb_only']),
      types: new Map([['procurement_procedure', new Set(['enum'])], ['leistungswettbewerb_only', new Set(['boolean'])]]),
      standardCode: 'DWA-M-820-1',
    },
  });

  it('M-1: switching M820-10 to Direktvergabe flags the answered M820-11 question (cross-sheet)', () => {
    const r = planStaleFlags({
      visArgs: mk('direktvergabe', { ...empty, valueBoolean: true }),
      ownTemplateId: 'T10',
      inheritedFields: [],
      writtenFieldIds: new Set(['f-proc']),
      consumerTemplateIds: new Set(['T11']),
    });
    expect(r).toEqual({ setStale: ['f-lw'], clearStale: [] });
  });

  it('M-1: switching back never CLEARS the flag on the other sheet', () => {
    const r = planStaleFlags({
      visArgs: mk('vgv_f', { ...empty, valueBoolean: true, isStale: true }),
      ownTemplateId: 'T10',
      inheritedFields: [],
      writtenFieldIds: new Set(['f-proc']),
      consumerTemplateIds: new Set(['T11']),
    });
    expect(r).toEqual({ setStale: [], clearStale: [] });
  });

  it('M-1: a derived row on the consumer is never flagged', () => {
    const r = planStaleFlags({
      visArgs: mk('direktvergabe', { ...empty, valueBoolean: true, sourceType: 'derived' }),
      ownTemplateId: 'T10',
      inheritedFields: [],
      writtenFieldIds: new Set(['f-proc']),
      consumerTemplateIds: new Set(['T11']),
    });
    expect(r.setStale).toEqual([]);
  });

  it('only the M820-11 save with the field visible clears it', () => {
    const r = planStaleFlags({
      visArgs: mk('vgv_f', { ...empty, valueBoolean: true, isStale: true }),
      ownTemplateId: 'T11',
      inheritedFields: [{ id: 'f-proc', symbol: 'procurement_procedure', dataType: 'enum' }],
      writtenFieldIds: new Set(['f-lw']),
      consumerTemplateIds: new Set(),
    });
    expect(r).toEqual({ setStale: [], clearStale: ['f-lw'] });
  });

  it('R-14: a driver hidden on ITS source sheet is absent on the consumer — the „Bestätigen" re-save does not re-flag', () => {
    // 820-2 shape: T18 holds `choice` (asked only when `vergeben == true`); T22 asks `detail` unless `choice == 'abnahme'`.
    const f2 = [
      cf({ id: 'f-verg', symbol: 'vergeben', templateId: 'T18' }),
      cf({ id: 'f-choice', symbol: 'choice', templateId: 'T18', dataType: 'enum', visibleWhen: 'vergeben == true' }),
      cf({ id: 'f-detail', symbol: 'detail', templateId: 'T22', visibleWhen: "choice != 'abnahme'" }),
    ];
    const args: RequiredFieldCountArgs = {
      templateIds: ['T18', 'T22'],
      fields: f2,
      sections: [],
      paramByFieldId: new Map<string, CountParam>([
        ['f-verg', { ...empty, valueBoolean: false }],
        ['f-choice', { ...empty, valueEnum: 'abnahme' }], // leftover, hidden at source
        ['f-detail', { ...empty, valueBoolean: true, isStale: true }],
      ]),
      projectEntries: [],
      ownScope: { templateIds: new Set(['T18', 'T22']), symbols: new Set(['vergeben', 'choice', 'detail']), types: new Map(), standardCode: 'DWA-M-820-2' },
    };
    const r = planStaleFlags({
      visArgs: args,
      ownTemplateId: 'T22',
      inheritedFields: [{ id: 'f-choice', symbol: 'choice', dataType: 'enum' }],
      writtenFieldIds: new Set(['f-detail']),
      consumerTemplateIds: new Set(),
    });
    // Without the R-14 drop the leftover 'abnahme' would hide `detail` and re-flag it on every confirm.
    expect(r).toEqual({ setStale: [], clearStale: ['f-detail'] });
  });
});
