/**
 * C-7 (2026-10-08) — the sidebar / progress / MCP required-field counts follow the approval gate: a required
 * field hidden by `visible_when` under the saved values is neither "total" nor "open". Observed on the deployed
 * app after the DWA-M 820 workflow block: DWA-M 820-1 M820-14 rendered no inputs on a direct award while the
 * sidebar said „offen 21".
 */
import { describe, it, expect } from 'vitest';
import {
  buildFallbackValues,
  countRequiredFieldsByTemplate,
  extractGateValue,
  hiddenFieldIdsByTemplate,
  type CountField,
  type CountParam,
  type OwnStandardScope,
  type ProjectWideEntry,
} from '../required-field-counts';
import type { ParameterValueColumns } from '../required-fields';

const empty: ParameterValueColumns = { valueNumber: null, valueText: null, valueEnum: null, valueBoolean: null, valueDate: null, valueJson: null };
const en = (v: string): ParameterValueColumns => ({ ...empty, valueEnum: v });
const bool = (v: boolean): ParameterValueColumns => ({ ...empty, valueBoolean: v });
const txt = (v: string): ParameterValueColumns => ({ ...empty, valueText: v });

const T10 = 't-m820-10'; // Verfahrenswahl — holds procurement_procedure
const T14 = 't-m820-14'; // Zuschlagskriterien — competition questions, hidden on a direct award

const f = (o: Partial<CountField> & { id: string; symbol: string; templateId: string }): CountField => ({
  labelDe: o.symbol,
  dataType: 'boolean',
  isRequired: true,
  sectionId: null,
  visibleWhen: null,
  ...o,
});

const fieldsM820: CountField[] = [
  f({ id: 'f-proc', symbol: 'procurement_procedure', templateId: T10, dataType: 'enum' }),
  f({ id: 'f-rationale', symbol: 'procedure_rationale', templateId: T10, dataType: 'text' }),
  f({ id: 'f-price', symbol: 'price_weight_percent', templateId: T14, dataType: 'number', visibleWhen: "procurement_procedure != 'direktvergabe'" }),
  f({ id: 'f-double', symbol: 'doppelbewertungsverbot_check', templateId: T14, visibleWhen: "procurement_procedure != 'direktvergabe'" }),
  f({ id: 'f-staff', symbol: 'key_staff_count', templateId: T14, dataType: 'number', visibleWhen: "procurement_procedure != 'direktvergabe'" }),
];

const scope: OwnStandardScope = {
  templateIds: new Set([T10, T14]),
  symbols: new Set(fieldsM820.map((x) => x.symbol)),
  types: new Map(fieldsM820.map((x) => [x.symbol, new Set([x.dataType])])),
  standardCode: 'DWA-M-820-1',
};

function run(params: Array<[string, CountParam]>, entries: ProjectWideEntry[]) {
  return countRequiredFieldsByTemplate({
    templateIds: [T10, T14],
    fields: fieldsM820,
    sections: [],
    paramByFieldId: new Map(params),
    projectEntries: entries,
    ownScope: scope,
  });
}

describe('countRequiredFieldsByTemplate — hidden required fields are neither total nor open (C-7)', () => {
  it('direct award: the competition sheet counts 0/0, the procedure sheet counts its own two fields', () => {
    const counts = run(
      [['f-proc', en('direktvergabe')], ['f-rationale', txt('Verhandlung mit einem Büro')]],
      [{ symbol: 'procurement_procedure', value: 'direktvergabe', templateId: T10, standardCode: 'DWA-M-820-1' },
       { symbol: 'procedure_rationale', value: 'Verhandlung mit einem Büro', templateId: T10, standardCode: 'DWA-M-820-1' }],
    );
    expect(counts.get(T14)).toEqual({ totalRequired: 0, filledRequired: 0 });
    expect(counts.get(T10)).toEqual({ totalRequired: 2, filledRequired: 2 });
  });

  it('open procedure (VgV-F): the competition questions are visible and open until answered', () => {
    const counts = run(
      [['f-proc', en('vgv_f')], ['f-double', bool(true)]],
      [{ symbol: 'procurement_procedure', value: 'vgv_f', templateId: T10, standardCode: 'DWA-M-820-1' },
       { symbol: 'doppelbewertungsverbot_check', value: true, templateId: T14, standardCode: 'DWA-M-820-1' }],
    );
    expect(counts.get(T14)).toEqual({ totalRequired: 3, filledRequired: 1 });
    expect(counts.get(T10)).toEqual({ totalRequired: 2, filledRequired: 1 });
  });

  it('procedure unanswered: the driver is pending, so the questions stay visible and open (never hidden by a guess)', () => {
    const counts = run([], []);
    expect(counts.get(T14)).toEqual({ totalRequired: 3, filledRequired: 0 });
  });

  it('the hiding driver resolves only from the OWN standard: a foreign "direktvergabe" never hides the own sheet', () => {
    const counts = run(
      [],
      [{ symbol: 'procurement_procedure', value: 'direktvergabe', templateId: 't-other-std', standardCode: 'DWA-M-820-2' }],
    );
    expect(counts.get(T14)).toEqual({ totalRequired: 3, filledRequired: 0 });
    // and the own enum is never filled from the other standard (A4 allows text/date only)
    expect(counts.get(T10)).toEqual({ totalRequired: 2, filledRequired: 0 });
  });

  it('A4 still applies: an inherited text value from another sheet satisfies a required text field', () => {
    const counts = run(
      [['f-proc', en('direktvergabe')]],
      [{ symbol: 'procurement_procedure', value: 'direktvergabe', templateId: T10, standardCode: 'DWA-M-820-1' },
       { symbol: 'procedure_rationale', value: 'aus M820-24', templateId: 't-m820-24', standardCode: 'DWA-M-820-1' }],
    );
    expect(counts.get(T10)).toEqual({ totalRequired: 2, filledRequired: 2 });
  });
});

describe('gate value helpers', () => {
  it('extractGateValue reads each type like the gate (json ⇒ presence marker)', () => {
    expect(extractGateValue('number', { ...empty, valueNumber: '4' })).toBe(4);
    expect(extractGateValue('boolean', bool(false))).toBe(false);
    expect(extractGateValue('text', empty)).toBeUndefined();
    expect(extractGateValue('json', { ...empty, valueJson: { rows: [{ a: 1 }] } })).toBeDefined();
    expect(extractGateValue('json', { ...empty, valueJson: null })).toBeUndefined();
  });

  it('buildFallbackValues keeps agreeing occurrences (4 ≡ "4") and drops conflicts', () => {
    const m = buildFallbackValues([
      { symbol: 'a', value: 4 }, { symbol: 'a', value: '4' },
      { symbol: 'b', value: 'x' }, { symbol: 'b', value: 'y' },
    ]);
    expect(m.get('a')).toBe(4);
    expect(m.has('b')).toBe(false);
  });
});

describe('U-1 (ruling R-12): a stale own answer counts as open', () => {
  it('a visible required field whose own row is stale is NOT filled', () => {
    const counts = run(
      [['f-proc', en('vgv_f')], ['f-double', { ...bool(false), isStale: true }]],
      [{ symbol: 'procurement_procedure', value: 'vgv_f', templateId: T10, standardCode: 'DWA-M-820-1' }],
    );
    expect(counts.get(T14)).toEqual({ totalRequired: 3, filledRequired: 0 });
  });

  it('isStale = false (or absent) keeps the answer filled — existing behaviour unchanged', () => {
    const counts = run(
      [['f-proc', en('vgv_f')], ['f-double', { ...bool(false), isStale: false }]],
      [{ symbol: 'procurement_procedure', value: 'vgv_f', templateId: T10, standardCode: 'DWA-M-820-1' }],
    );
    expect(counts.get(T14)).toEqual({ totalRequired: 3, filledRequired: 1 });
  });

  it('a stale own row is still satisfied by an inherited value (A4)', () => {
    const counts = run(
      [['f-proc', en('direktvergabe')], ['f-rationale', { ...txt('alt'), isStale: true }]],
      [{ symbol: 'procurement_procedure', value: 'direktvergabe', templateId: T10, standardCode: 'DWA-M-820-1' },
       { symbol: 'procedure_rationale', value: 'aus M820-24', templateId: 't-m820-24', standardCode: 'DWA-M-820-1' }],
    );
    expect(counts.get(T10)).toEqual({ totalRequired: 2, filledRequired: 2 });
  });

  it('a stale driver still drives visibility (the value is kept, only its standing as an answer is withheld)', () => {
    const counts = run(
      [['f-proc', { ...en('direktvergabe'), isStale: true }]],
      [{ symbol: 'procurement_procedure', value: 'direktvergabe', templateId: T10, standardCode: 'DWA-M-820-1' }],
    );
    expect(counts.get(T14)).toEqual({ totalRequired: 0, filledRequired: 0 });
    expect(counts.get(T10)).toEqual({ totalRequired: 2, filledRequired: 0 });
  });
});

describe('U-2: hiddenFieldIdsByTemplate — fields hidden on their own (source) sheet', () => {
  // DWA-M 820-1 M820-11: `leistungswettbewerb_only` only asked when the procedure is not a direct award.
  const T11 = 't-m820-11';
  const fields11: CountField[] = [
    ...fieldsM820,
    f({ id: 'f-lw', symbol: 'leistungswettbewerb_only', templateId: T11, isRequired: false, visibleWhen: "procurement_procedure != 'direktvergabe'" }),
  ];
  const scope11: OwnStandardScope = {
    ...scope,
    templateIds: new Set([T10, T11, T14]),
    symbols: new Set(fields11.map((x) => x.symbol)),
    types: new Map(fields11.map((x) => [x.symbol, new Set([x.dataType])])),
  };
  const hidden = (procedure: string) => hiddenFieldIdsByTemplate({
    templateIds: [T10, T11, T14],
    fields: fields11,
    sections: [],
    paramByFieldId: new Map([['f-proc', en(procedure)], ['f-lw', bool(true)]]),
    projectEntries: [
      { symbol: 'procurement_procedure', value: procedure, templateId: T10, standardCode: 'DWA-M-820-1' },
      { symbol: 'leistungswettbewerb_only', value: true, templateId: T11, standardCode: 'DWA-M-820-1' },
    ],
    ownScope: scope11,
  });

  it('direct award: leistungswettbewerb_only is hidden on M820-11 (and the competition questions on M820-14)', () => {
    const h = hidden('direktvergabe');
    expect([...(h.get(T11) ?? [])]).toEqual(['f-lw']);
    expect([...(h.get(T14) ?? [])].sort()).toEqual(['f-double', 'f-price', 'f-staff']);
    expect(h.get(T10)?.size).toBe(0);
  });

  it('open procedure: nothing is hidden', () => {
    const h = hidden('vgv_f');
    expect(h.get(T11)?.size).toBe(0);
    expect(h.get(T14)?.size).toBe(0);
  });
});
