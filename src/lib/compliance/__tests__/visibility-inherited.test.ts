/**
 * Plan 3 final wave B (defect 1) — server-side `visible_when` must see INHERITED drivers.
 *
 * `computeVisibility` decides over the lookup it is handed. The FORM already gets this
 * right (`worksheet-form.tsx`: hideable set = own fields, lookup = own + inherited); the
 * save path and the PDF/report loader built their lookup over the template's own fields
 * only, so a rule like DIN-1989-2-03 `DN <= 200` (the `DN` field lives on DIN-1989-2-01
 * and lists -03 in `consumer_worksheets`) evaluated to `pending` and never hid anything
 * server-side. Found by DIN-1989-2 (`din1989_2-I-2`, Task 17 review).
 *
 * `inheritedFieldsFor` is the pure statement of the SAME rule `loadInheritedFields`
 * implements in SQL, for the callers that already hold the project's fields in memory.
 */
import { describe, it, expect } from 'vitest';
import { computeVisibility, inheritedFieldsFor } from '../visibility';
import { makeSymbolLookup } from '../symbol-lookup';

const ALL = [
  // DIN-1989-2-01 — the producer; declares -02 and -03 as consumers.
  { id: 'f-dn', symbol: 'DN', worksheetTemplateId: 't01', standardCode: 'DIN-1989-2', consumerWorksheets: ['DIN-1989-2-02', 'DIN-1989-2-03'], active: true },
  // same standard, but does NOT name -03
  { id: 'f-typ', symbol: 'filtertyp', worksheetTemplateId: 't01', standardCode: 'DIN-1989-2', consumerWorksheets: ['DIN-1989-2-02'], active: true },
  // deactivated producer — never inherited
  { id: 'f-old', symbol: 'DN_alt', worksheetTemplateId: 't01', standardCode: 'DIN-1989-2', consumerWorksheets: ['DIN-1989-2-03'], active: false },
  // foreign standard reusing the consumer code — must not leak
  { id: 'f-foreign', symbol: 'DN_foreign', worksheetTemplateId: 't99', standardCode: 'DWA-A-138-1', consumerWorksheets: ['DIN-1989-2-03'], active: true },
  // the consumer's OWN field, listing itself (the Task-12b ruling: the owner worksheet is excluded)
  { id: 'f-own', symbol: 'V_Pruef_leist', worksheetTemplateId: 't03', standardCode: 'DIN-1989-2', consumerWorksheets: ['DIN-1989-2-03'], active: true },
  // no consumer list at all
  { id: 'f-none', symbol: 'einbausystem', worksheetTemplateId: 't01', standardCode: 'DIN-1989-2', consumerWorksheets: null, active: true },
];

const OWN = { worksheetTemplateId: 't03', worksheetCode: 'DIN-1989-2-03', standardCode: 'DIN-1989-2' };

describe('inheritedFieldsFor — the pure form of loadInheritedFields', () => {
  it('takes only same-standard fields of ANOTHER template whose consumer_worksheets names this worksheet', () => {
    expect(inheritedFieldsFor(OWN, ALL).map((f) => f.symbol)).toEqual(['DN']);
  });
  it('excludes the owner worksheet itself even when it lists its own code (Task 12b ruling)', () => {
    expect(inheritedFieldsFor(OWN, ALL).some((f) => f.worksheetTemplateId === 't03')).toBe(false);
  });
  it('excludes deactivated fields and foreign standards', () => {
    const syms = inheritedFieldsFor(OWN, ALL).map((f) => f.symbol);
    expect(syms).not.toContain('DN_alt');
    expect(syms).not.toContain('DN_foreign');
  });
});

describe('computeVisibility over own + inherited (the save-path / report contract)', () => {
  const ownFields = [
    { id: 'f-vpl', symbol: 'V_Pruef_leist', sectionId: null, visibleWhen: 'DN <= 200' },
  ];
  const values = { 'f-dn': { type: 'number' as const, value: 300 } };

  it('own fields only: the inherited driver is unknown ⇒ pending ⇒ NOTHING hides (the defect)', () => {
    const { hiddenSymbols } = computeVisibility(ownFields, [], makeSymbolLookup(ownFields, values));
    expect([...hiddenSymbols]).toEqual([]);
  });

  it('own + inherited in the LOOKUP: DN = 300 resolves ⇒ the rule fails ⇒ the field hides', () => {
    const lookupFields = [...ownFields, ...inheritedFieldsFor(OWN, ALL)];
    const { hiddenSymbols, hiddenFieldIds } = computeVisibility(ownFields, [], makeSymbolLookup(lookupFields, values));
    expect([...hiddenSymbols]).toEqual(['V_Pruef_leist']);
    expect([...hiddenFieldIds]).toEqual(['f-vpl']);
  });

  it('the HIDEABLE set stays own-fields-only — an inherited field is governed by its origin worksheet', () => {
    const inherited = inheritedFieldsFor(OWN, ALL).map((f) => ({ id: f.id, symbol: f.symbol, sectionId: null, visibleWhen: 'DN <= 200' }));
    const lookupFields = [...ownFields, ...inheritedFieldsFor(OWN, ALL)];
    const { hiddenSymbols } = computeVisibility(ownFields, [], makeSymbolLookup(lookupFields, values));
    // even though the inherited row would itself fail the same rule, it is not in the hideable set
    expect(inherited).toHaveLength(1);
    expect([...hiddenSymbols]).not.toContain('DN');
  });
});

/**
 * Wave B fix round 1, item 3 — the PDF loader's `allFields` select omitted `fields.active`,
 * so `f.active ?? true` never excluded anything and the docstring's "active only" was a lie.
 * Prod carries FOUR inactive fields with a non-empty `consumer_worksheets` (DWA-M-816,
 * DWA-A-272E). `active` is now REQUIRED on `InheritableField` — a caller that forgets the
 * column is a compile error, not a silent inheritance — and the runtime rule is pinned over
 * rows shaped exactly like that select.
 */
describe('inheritedFieldsFor — `active` is part of the inheritance rule (fix round 1, item 3)', () => {
  const loaderRow = (over: Partial<(typeof ALL)[number]>) => ({
    id: 'f-x', symbol: 'sym_x', worksheetTemplateId: 't01', standardCode: 'DIN-1989-2',
    consumerWorksheets: ['DIN-1989-2-03'], active: true, ...over,
  });
  it('an INACTIVE producer that lists this worksheet is never inherited', () => {
    expect(inheritedFieldsFor(OWN, [loaderRow({ active: false })])).toEqual([]);
  });
  it('the same row with active = true IS inherited (the rule is `active`, not the row shape)', () => {
    expect(inheritedFieldsFor(OWN, [loaderRow({ active: true })]).map((f) => f.symbol)).toEqual(['sym_x']);
  });
});
