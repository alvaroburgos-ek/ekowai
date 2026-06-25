import { describe, it, expect } from 'vitest';
import { parseConcepts, mapXbrlType } from '../taxonomy';
import { TAXONOMY_DIR } from '../_setup';

describe('mapXbrlType', () => {
  it('maps numeric XBRL item types to number', () => {
    expect(mapXbrlType('dtr-types:massItemType', false)).toBe('number');
    expect(mapXbrlType('dtr-types:volumeItemType', false)).toBe('number');
    expect(mapXbrlType('xbrli:monetaryItemType', false)).toBe('number');
  });
  it('maps GHG emission XBRL types to number', () => {
    expect(mapXbrlType('dtr-types:ghgEmissionsItemType', false)).toBe('number');
    expect(mapXbrlType('dtr-types:ghgEmissionsPerMonetaryItemType', false)).toBe('number');
  });
  it('maps enumeration to enum, string to text, boolean to boolean', () => {
    expect(mapXbrlType('enum2:enumerationItemType', false)).toBe('enum');
    expect(mapXbrlType('xbrli:stringItemType', false)).toBe('text');
    expect(mapXbrlType('xbrli:booleanItemType', false)).toBe('boolean');
  });
});

describe('parseConcepts', () => {
  const concepts = parseConcepts(TAXONOMY_DIR);
  it('finds a known concrete datapoint with its label and type', () => {
    const c = concepts.find((x) => x.name === 'WeightOfMaterialUsed');
    expect(c).toBeDefined();
    expect(c!.id).toBe('vsme_WeightOfMaterialUsed');
    expect(c!.dataType).toBe('number');
    expect(c!.abstract).toBe(false);
    expect((c!.labelEn ?? '').toLowerCase()).toContain('weight');
  });
  it('flags abstract grouping concepts', () => {
    const abs = concepts.find((x) => x.name.endsWith('Abstract'));
    expect(abs?.abstract).toBe(true);
  });
});
