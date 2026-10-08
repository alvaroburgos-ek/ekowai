/**
 * Fix round 2 of UX cluster A (re-review 5442259, N-1; controller ruling R-15): a symbol whose field is hidden on its
 * SOURCE sheet is hidden for the approval gate too — the condition reports `not_applicable`, never `pending` (a pending
 * block gate blocks approval and would name a question nobody can see). Case: 820-2-22 REQ-46 reads
 * `testbetrieb_vs_abnahme_choice`, asked on 820-2-18 only when `bauleistungen_vergeben == true`.
 *
 * The gate's DB-bound part runs in the integration project (prod — not run here); this pins the pure pieces in the
 * order `checkApprovalGate` composes them: buildVisibilityArgs → hiddenAtSourceFieldIds → dropHiddenAtSource (fallback)
 * → hiddenAtSourceSymbols → gateHiddenSymbols → evaluateCondition.
 */
import { describe, it, expect } from 'vitest';
import {
  buildFallbackValues,
  gateHiddenSymbols,
  makeGateLookup,
  buildVisibilityArgs,
  inheritedFieldsFromMeta,
  type StandardVisibilityField,
  type StandardVisibilityMeta,
} from '../approval-gate';
import { dropHiddenAtSource, hiddenAtSourceFieldIds, hiddenAtSourceSymbols } from '@/lib/projects/required-field-counts';
import { scopeToOwnStandard } from '@/lib/projects/required-fields';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { computeVisibility } from '@/lib/compliance/visibility';

const T18 = 't-820-2-18';
const T22 = 't-820-2-22';
const fld = (o: Partial<StandardVisibilityField> & { id: string; symbol: string; templateId: string; templateCode: string }): StandardVisibilityField => ({
  labelDe: o.symbol, dataType: 'boolean', isRequired: false, sectionId: null, visibleWhen: null,
  unit: null, widget: null, uiConfig: null, consumerWorksheets: null, ...o,
});
const meta: StandardVisibilityMeta = {
  standardCode: 'DWA-M-820-2',
  templateIds: [T18, T22],
  fields: [
    fld({ id: 'f-verg', symbol: 'bauleistungen_vergeben', templateId: T18, templateCode: '820-2-18' }),
    fld({ id: 'f-choice', symbol: 'testbetrieb_vs_abnahme_choice', templateId: T18, templateCode: '820-2-18', dataType: 'enum',
      visibleWhen: 'bauleistungen_vergeben == true', consumerWorksheets: ['820-2-22'] }),
    fld({ id: 'f-tb', symbol: 'testbetrieb_planned', templateId: T22, templateCode: '820-2-22' }),
  ],
  sections: [],
};
const projectFields = meta.fields.map((f) => ({ id: f.id, symbol: f.symbol, dataType: f.dataType, templateId: f.templateId, standardCode: 'DWA-M-820-2' }));
const row = (fieldId: string, o: { valueBoolean?: boolean; valueEnum?: string }) => ({
  fieldId, valueNumber: null, valueText: null, valueEnum: o.valueEnum ?? null, valueBoolean: o.valueBoolean ?? null, valueDate: null, valueJson: null,
});
// REQ-46 as staged in scripts/migrations/20261006100000_m820_2_structure.sql:327
const REQ_46 = "IF testbetrieb_vs_abnahme_choice == 'testbetrieb' OR testbetrieb_vs_abnahme_choice == 'mischform' THEN (testbetrieb_planned == true)";

/** The gate on 820-2-22, composed as checkApprovalGate does. */
function gate22(vergeben: boolean, choice: string, planned: boolean) {
  const args = buildVisibilityArgs(meta, projectFields, [
    row('f-verg', { valueBoolean: vergeben }), row('f-choice', { valueEnum: choice }), row('f-tb', { valueBoolean: planned }),
  ])!;
  const hiddenAtSource = hiddenAtSourceFieldIds(args);
  const sourceHidden = hiddenAtSourceSymbols(args.fields, hiddenAtSource, T22);
  const entries = dropHiddenAtSource(args.projectEntries, hiddenAtSource);
  const fallback = buildFallbackValues(scopeToOwnStandard(entries, args.ownScope.templateIds, args.ownScope.symbols));
  const local = args.fields.filter((f) => f.templateId === T22);
  const localSymbols = new Set(local.map((f) => f.symbol));
  const lookup = makeGateLookup(localSymbols, new Map([['testbetrieb_planned', planned]]), fallback);
  const { hiddenSymbols: own } = computeVisibility(local, [], lookup);
  const hiddenSymbols = gateHiddenSymbols(own, sourceHidden, localSymbols);
  return { hiddenSymbols, verdict: evaluateCondition(REQ_46, lookup, { hiddenSymbols }).kind };
}

describe('R-15: REQ-46 on 820-2-22 with the choice hidden on 820-2-18', () => {
  it('bauleistungen_vergeben = false + leftover choice: not_applicable (approval not blocked by it)', () => {
    const r = gate22(false, 'testbetrieb', false);
    expect([...r.hiddenSymbols]).toEqual(['testbetrieb_vs_abnahme_choice']);
    expect(r.verdict).toBe('not_applicable');
  });
  it('bauleistungen_vergeben = true: decided on the real value — fails when testbetrieb is not planned …', () => {
    expect(gate22(true, 'testbetrieb', false).verdict).toBe('fail');
  });
  it('… and passes when it is', () => {
    expect(gate22(true, 'testbetrieb', true).verdict).toBe('pass');
  });
});

describe('gateHiddenSymbols', () => {
  it('adds source-hidden symbols that are not local; a local field is decided by the sheet itself', () => {
    const out = gateHiddenSymbols(new Set(['own_hidden']), new Set(['up', 'local_too']), new Set(['local_too', 'own_hidden']));
    expect([...out].sort()).toEqual(['own_hidden', 'up']);
  });
});

describe('hiddenAtSourceSymbols', () => {
  it('a symbol with one visible occurrence elsewhere is not hidden; the consumer sheet itself is ignored', () => {
    const fs = [
      { id: 'a', symbol: 's', templateId: 'T1' },
      { id: 'b', symbol: 's', templateId: 'T2' },
      { id: 'c', symbol: 'h', templateId: 'T1' },
      { id: 'd', symbol: 'h', templateId: 'T9' },
    ];
    expect([...hiddenAtSourceSymbols(fs, new Set(['a', 'c']), 'T9')].sort()).toEqual(['h']);
  });
});

describe('fix round 2 loader pieces (pure)', () => {
  it('buildVisibilityArgs: occurrences carry fieldId, scope comes from the standard fields', () => {
    const args = buildVisibilityArgs(meta, projectFields, [row('f-verg', { valueBoolean: true })])!;
    expect(args.projectEntries).toEqual([
      { symbol: 'bauleistungen_vergeben', value: true, templateId: T18, standardCode: 'DWA-M-820-2', fieldId: 'f-verg' },
    ]);
    expect([...args.ownScope.templateIds].sort()).toEqual([T18, T22]);
    expect(args.ownScope.standardCode).toBe('DWA-M-820-2');
  });
  it('buildVisibilityArgs: no template ⇒ null', () => {
    expect(buildVisibilityArgs({ standardCode: null, templateIds: [], fields: [], sections: [] }, [], [])).toBeNull();
  });
  it('inheritedFieldsFromMeta mirrors loadInheritedFields (consumer code, other templates only)', () => {
    expect(inheritedFieldsFromMeta(meta, T22, '820-2-22').map((f) => f.id)).toEqual(['f-choice']);
    expect(inheritedFieldsFromMeta(meta, T18, '820-2-18')).toEqual([]);
  });
});
