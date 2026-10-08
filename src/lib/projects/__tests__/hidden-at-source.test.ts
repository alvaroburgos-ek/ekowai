/**
 * R-14 (2026-10-08, „hidden ⇒ absent", review 25d4bd1 M-2): an occurrence whose field is hidden by `visible_when` on its
 * own source sheet is dropped from the gate's project-wide fallback and the A4 inherited set — the same set the worksheet
 * page drops from its upstream panel. Case from the review: 820-2-22 REQ-46 reads `testbetrieb_vs_abnahme_choice`, which
 * 820-2-18 asks only when `bauleistungen_vergeben == true`.
 */
import { describe, it, expect } from 'vitest';
import {
  buildFallbackValues,
  countRequiredFieldsByTemplate,
  dropHiddenAtSource,
  hiddenAtSourceFieldIds,
  requiredFieldState,
  type CountField,
  type CountParam,
  type OwnStandardScope,
  type ProjectWideEntry,
} from '../required-field-counts';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { scopeToOwnStandard } from '../required-fields';

const empty = { valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null };
const en = (v: string): CountParam => ({ ...empty, valueEnum: v });
const bool = (v: boolean): CountParam => ({ ...empty, valueBoolean: v });
const txt = (v: string): CountParam => ({ ...empty, valueText: v });
const f = (o: Partial<CountField> & { id: string; symbol: string; templateId: string }): CountField => ({
  labelDe: o.symbol, dataType: 'boolean', isRequired: false, sectionId: null, visibleWhen: null, ...o,
});

const T18 = 't-820-2-18';
const T22 = 't-820-2-22';
const fields: CountField[] = [
  f({ id: 'f-verg', symbol: 'bauleistungen_vergeben', templateId: T18 }),
  f({ id: 'f-choice', symbol: 'testbetrieb_vs_abnahme_choice', templateId: T18, dataType: 'enum', visibleWhen: 'bauleistungen_vergeben == true' }),
  f({ id: 'f-tb', symbol: 'testbetrieb_planned', templateId: T22 }),
];
const scope: OwnStandardScope = {
  templateIds: new Set([T18, T22]),
  symbols: new Set(fields.map((x) => x.symbol)),
  types: new Map(fields.map((x) => [x.symbol, new Set([x.dataType])])),
  standardCode: 'DWA-M-820-2',
};
// REQ-46 as staged in scripts/migrations/20261006100000_m820_2_structure.sql:327
const REQ_46 = "IF testbetrieb_vs_abnahme_choice == 'testbetrieb' OR testbetrieb_vs_abnahme_choice == 'mischform' THEN (testbetrieb_planned == true)";

function run46(vergeben: boolean) {
  const entries: ProjectWideEntry[] = [
    { symbol: 'bauleistungen_vergeben', value: vergeben, templateId: T18, standardCode: 'DWA-M-820-2', fieldId: 'f-verg' },
    { symbol: 'testbetrieb_vs_abnahme_choice', value: 'testbetrieb', templateId: T18, standardCode: 'DWA-M-820-2', fieldId: 'f-choice' },
    { symbol: 'testbetrieb_planned', value: false, templateId: T22, standardCode: 'DWA-M-820-2', fieldId: 'f-tb' },
  ];
  const hidden = hiddenAtSourceFieldIds({
    templateIds: [T18, T22],
    fields,
    sections: [],
    paramByFieldId: new Map([['f-verg', bool(vergeben)], ['f-choice', en('testbetrieb')], ['f-tb', bool(false)]]),
    projectEntries: entries,
    ownScope: scope,
  });
  // The gate's fallback after R-14 (approval-gate.ts: dropHiddenAtSource → buildStandardScopedFallback), and the gate's
  // scoped lookup on 820-2-22 (local symbol testbetrieb_planned = false, everything else from the fallback).
  const fallback = buildFallbackValues(scopeToOwnStandard(dropHiddenAtSource(entries, hidden), scope.templateIds, scope.symbols));
  const lookup = (s: string) => (s === 'testbetrieb_planned' ? false : fallback.get(s));
  return { hidden, verdict: evaluateCondition(REQ_46, lookup).kind };
}

describe('R-14: 820-2-22 REQ-46 and the hidden leftover on 820-2-18', () => {
  it('bauleistungen_vergeben = false: the leftover choice is hidden at source and dropped — REQ-46 does not fail on it', () => {
    const { hidden, verdict } = run46(false);
    expect([...hidden]).toEqual(['f-choice']);
    expect(verdict).not.toBe('fail');
    expect(['pending', 'not_applicable']).toContain(verdict);
  });

  it('bauleistungen_vergeben = true: the choice is a real answer — REQ-46 fails on testbetrieb_planned = false', () => {
    const { hidden, verdict } = run46(true);
    expect(hidden.size).toBe(0);
    expect(verdict).toBe('fail');
  });
});

describe('dropHiddenAtSource', () => {
  it('drops by field id; entries without a fieldId are kept', () => {
    expect(dropHiddenAtSource([{ symbol: 'x' }, { symbol: 'y', fieldId: 'h' }, { symbol: 'z', fieldId: 'v' }], new Set(['h'])))
      .toEqual([{ symbol: 'x' }, { symbol: 'z', fieldId: 'v' }]);
  });
});

describe('counts follow the gate view (R-14)', () => {
  const fA: CountField[] = [
    f({ id: 'f-verg', symbol: 'bauleistungen_vergeben', templateId: T18 }),
    f({ id: 'f-note', symbol: 'abnahme_note', templateId: T18, dataType: 'text', visibleWhen: 'bauleistungen_vergeben == true' }),
    f({ id: 'f-note22', symbol: 'abnahme_note', templateId: T22, dataType: 'text', isRequired: true }),
  ];
  const args = (vergeben: boolean) => ({
    templateIds: [T18, T22],
    fields: fA,
    sections: [],
    paramByFieldId: new Map<string, CountParam>([['f-verg', bool(vergeben)], ['f-note', txt('alt')]]),
    projectEntries: [
      { symbol: 'bauleistungen_vergeben', value: vergeben, templateId: T18, standardCode: 'DWA-M-820-2', fieldId: 'f-verg' },
      { symbol: 'abnahme_note', value: 'alt', templateId: T18, standardCode: 'DWA-M-820-2', fieldId: 'f-note' },
    ] as ProjectWideEntry[],
    ownScope: {
      templateIds: new Set([T18, T22]),
      symbols: new Set(['bauleistungen_vergeben', 'abnahme_note']),
      types: new Map([['bauleistungen_vergeben', new Set(['boolean'])], ['abnahme_note', new Set(['text'])]]),
      standardCode: 'DWA-M-820-2',
    },
  });

  it('a required field elsewhere is NOT satisfied (A4) by a value hidden at its source', () => {
    expect(countRequiredFieldsByTemplate(args(false)).get(T22)).toEqual({ totalRequired: 1, filledRequired: 0 });
  });
  it('… and is satisfied once the source question is visible', () => {
    expect(countRequiredFieldsByTemplate(args(true)).get(T22)).toEqual({ totalRequired: 1, filledRequired: 1 });
  });
  it('requiredFieldState returns the same counts plus the hidden-at-source sets (L-4: one evaluation)', () => {
    const s = requiredFieldState(args(false));
    expect(s.counts).toEqual(countRequiredFieldsByTemplate(args(false)));
    expect([...(s.hiddenByTemplate.get(T18) ?? [])]).toEqual(['f-note']);
  });
});
