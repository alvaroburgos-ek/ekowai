// Plan 2a Task 10: computeVisibility — pure, single-pass over CURRENT values.
import { describe, it, expect } from 'vitest';
import { computeVisibility, effectiveVisibleWhen, LEGACY_VISIBLE_WHEN } from '../visibility';

const lookup = (vals: Record<string, string | number | null>) => (s: string) => (s in vals ? vals[s] : undefined);
const fields = [
  { id: 'm', symbol: 'a_s_m_determination_method', sectionId: 's1' },
  { id: 'soil', symbol: 'soil_bodenart_tab13', sectionId: 's1' },
  { id: 'prov', symbol: 'a_s_m_provenance', sectionId: 's1' },
  { id: 'x', symbol: 'x', sectionId: 's2', visibleWhen: "sewer_system_type == 'misch'" },
  { id: 'y', symbol: 'y', sectionId: 's3' },
];
const sections = [
  { id: 's1', parentSectionId: null }, { id: 's2', parentSectionId: null },
  { id: 's3', parentSectionId: 's2', visibleWhen: "sewer_system_type == 'trenn'" },
];

describe('computeVisibility', () => {
  it('LEGACY_VISIBLE_WHEN reproduces the two ASM early returns, incl. the null-method case', () => {
    expect(effectiveVisibleWhen({ symbol: 'soil_bodenart_tab13', visibleWhen: null })).toMatch(/soil_estimate/);
    expect(effectiveVisibleWhen({ symbol: 'soil_bodenart_tab13', visibleWhen: 'x == 1' })).toBe('x == 1');
    expect(effectiveVisibleWhen({ symbol: 'anything_else', visibleWhen: null })).toBeNull();
    expect(Object.keys(LEGACY_VISIBLE_WHEN).sort()).toEqual(['a_s_m_provenance', 'soil_bodenart_tab13']);
    const v0 = computeVisibility(fields, sections, lookup({})); // method unset ⇒ both hidden (as today)
    expect([...v0.hiddenFieldIds]).toEqual(expect.arrayContaining(['soil', 'prov']));
    expect(v0.hiddenFieldIds.has('m')).toBe(false);
    const v1 = computeVisibility(fields, sections, lookup({ a_s_m_determination_method: 'soil_estimate' }));
    expect(v1.hiddenFieldIds.has('soil')).toBe(false); expect(v1.hiddenFieldIds.has('prov')).toBe(true);
    expect(v1.hiddenSymbols.has('a_s_m_provenance')).toBe(true);
    expect(v1.hiddenSymbols.has('soil_bodenart_tab13')).toBe(false);
  });
  it('fail hides; pending / manual keep visible (fail-safe)', () => {
    const v = computeVisibility(fields, sections, lookup({ a_s_m_determination_method: 'manual' }));
    expect(v.hiddenFieldIds.has('x')).toBe(false); // sewer_system_type missing ⇒ pending ⇒ visible
    expect(v.hiddenSectionIds.has('s3')).toBe(false);
    const v2 = computeVisibility(fields, sections, lookup({ a_s_m_determination_method: 'manual', sewer_system_type: 'trenn' }));
    expect(v2.hiddenFieldIds.has('x')).toBe(true);
    expect(v2.hiddenSymbols.has('x')).toBe(true);
    // unparseable condition ⇒ manual ⇒ visible
    const vm = computeVisibility(
      [{ id: 'q', symbol: 'q', sectionId: null, visibleWhen: 'Engineer attestation required' }],
      [],
      lookup({}),
    );
    expect(vm.hiddenFieldIds.size).toBe(0);
  });
  it('a hidden section hides its fields and its child sections', () => {
    const v = computeVisibility(fields, sections, lookup({ a_s_m_determination_method: 'manual', sewer_system_type: 'misch' }));
    expect(v.hiddenSectionIds.has('s3')).toBe(true);
    expect(v.hiddenFieldIds.has('y')).toBe(true);
    expect(v.hiddenSymbols.has('y')).toBe(true);
    expect(v.hiddenFieldIds.has('x')).toBe(false);
    // grandchild of a hidden section is hidden too (parent chain)
    const deep = computeVisibility(
      [{ id: 'z', symbol: 'z', sectionId: 's4' }],
      [...sections, { id: 's4', parentSectionId: 's3' }],
      lookup({ sewer_system_type: 'misch' }),
    );
    expect(deep.hiddenSectionIds.has('s4')).toBe(true);
    expect(deep.hiddenFieldIds.has('z')).toBe(true);
  });
  it('a parent cycle does not loop; a field in an unknown section is governed by its own rule only', () => {
    const v = computeVisibility(
      [{ id: 'a', symbol: 'a', sectionId: 'c1' }, { id: 'b', symbol: 'b', sectionId: 'nope' }],
      [{ id: 'c1', parentSectionId: 'c2' }, { id: 'c2', parentSectionId: 'c1' }],
      lookup({}),
    );
    expect(v.hiddenFieldIds.size).toBe(0);
    expect(v.hiddenSectionIds.size).toBe(0);
  });
});
