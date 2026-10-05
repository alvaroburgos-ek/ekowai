import { describe, it, expect } from 'vitest';
import { aggressiveBadge, buildCatalogUrl, carrierRows, contextFromZone, contextLine, hitProperties, proposeGroupKey } from '../picker';
import type { CatalogHit } from '../filter';

const ZONES = [
  { id: 'a', label: 'Schwimmbereich', zone: 'swimming', area_m2: 80, depth_m: 2.0 },
  { id: 'b', label: 'Regeneration Ost', zone: 'regeneration', area_m2: 40, depth_m: 0.6, technique: 'hydrobotanical_submergent' },
  { id: 'c', label: 'Flachwasser West', zone: 'regeneration', area_m2: 20, depth_m: 0.15, technique: 'hydrobotanical_emersed' },
  { id: 'd', label: 'Filter', zone: 'regeneration', area_m2: 10, depth_m: null, technique: 'substrate_filter_slow' },
];

describe('contextFromZone — FLLNT-12 row zone × FLLNT-06 zonen', () => {
  it('matches the zone label case-insensitively → depth in cm; a submerged hydrobotanical zone adds the submerged group', () => {
    expect(contextFromZone('regeneration ost ', ZONES, 'type_III')).toEqual({ pondType: 'type_III', zoneLabel: 'Regeneration Ost', maxDepthCm: 60, group: 'submerged' });
  });
  it('an emersed zone gives the depth but NO group (two printed marsh groups fit — never guessed)', () => {
    expect(contextFromZone('Flachwasser West', ZONES)).toEqual({ zoneLabel: 'Flachwasser West', maxDepthCm: 15 });
  });
  it('no depth on the zone ⇒ no depth filter; unmatched / empty zone ⇒ pond type only', () => {
    expect(contextFromZone('Filter', ZONES)).toEqual({ zoneLabel: 'Filter' });
    expect(contextFromZone('Nordufer', ZONES, 'type_I')).toEqual({ pondType: 'type_I' });
    expect(contextFromZone('', ZONES)).toEqual({});
    expect(contextFromZone('Filter', undefined)).toEqual({});
  });
  it('carrierRows reads the register carrier shape only', () => {
    expect(carrierRows({ rows: ZONES, not_applicable: false })).toHaveLength(4);
    expect(carrierRows({ rows: 'x' })).toEqual([]);
    expect(carrierRows(null)).toEqual([]);
    expect(carrierRows([1, 2])).toEqual([]);
  });
});

describe('proposeGroupKey — catalogue group → § 10.4.3 row key, a proposal only', () => {
  it('maps the four printed groups and nothing else', () => {
    expect(proposeGroupKey({ plant_group: 'submerged' })).toBe('submerged');
    expect(proposeGroupKey({ plant_group: 'floating_leaved' })).toBe('lilies');
    expect(proposeGroupKey({ plant_group: 'marsh_small' })).toBe('marsh_small');
    expect(proposeGroupKey({ plant_group: 'marsh_medium_high' })).toBe('marsh_medium');
    expect(proposeGroupKey({ plant_group: 'bank_terrestrial' })).toBeNull();
    expect(proposeGroupKey({ plant_group: 'other' })).toBeNull();
  });
});

describe('buildCatalogUrl / contextLine / badge', () => {
  it('encodes query + context, omits empties; pond type never becomes a filter', () => {
    expect(buildCatalogUrl('', {})).toBe('/api/plant-catalog');
    expect(buildCatalogUrl(' Phrag ', { group: 'submerged', maxDepthCm: 60, pondType: 'type_III' })).toBe('/api/plant-catalog?q=Phrag&group=submerged&maxDepthCm=60');
  });
  it('context line names zone, depth, group and marks the pond type as display only', () => {
    expect(contextLine({})).toBeNull();
    expect(contextLine({ zoneLabel: 'Regeneration Ost', maxDepthCm: 60, group: 'submerged', pondType: 'type_III' }))
      .toBe('Kontext: Zone „Regeneration Ost“ · Wassertiefe 60 cm · Gruppe Unterwasserpflanzen · Teichtyp type_III (nur Anzeige)');
  });
  it('red badge wording follows the source', () => {
    expect(aggressiveBadge({ aggressive_rhizome: true, source_ref: 'FLL-GAR-2023 Tab. 29 (printed p. 125)' })).toBe('aggressiv wurzelnd / rhizombildend (Tab. 29)');
    expect(aggressiveBadge({ aggressive_rhizome: true, source_ref: 'FLL-TP-Rhizom-2023 § 1 (printed p. 7)' })).toBe('aggressiv wurzelnd / rhizombildend');
    expect(aggressiveBadge({ aggressive_rhizome: false, source_ref: 'x' })).toBeNull();
  });
  it('hitProperties lists only what the row carries and always ends with the source', () => {
    const h: CatalogHit = {
      id: '1', scientific_name: 'Acorus calamus', common_name_de: null, common_name_en: 'Sweet Flag', plant_group: 'other', depth_zone_code: '3-4',
      depth_min_cm: null, depth_max_cm: null, light: 'sun', height_cm: 100, bloom: null, hardiness_zones: '4a-9b', water_hardness: '3', nitrogen_demand: '7',
      origin_regions: 'E-As, Eu, N-Am', planting_codes: ['HBS', 'TWL'], notes: 'n', aggressive_rhizome: false, aggressive_source: null,
      source_kind: 'reference_book', source_ref: 'Kircher, T, E', recommended: 'r',
    };
    const p = hitProperties(h);
    expect(p[0]).toEqual(['Name', 'Sweet Flag']);
    expect(p).toContainEqual(['Tiefenzone (Buchcode)', '3-4 — Legende fehlt']);
    expect(p).toContainEqual(['Licht', 'Sonne']);
    expect(p.some(([k]) => k === 'Blüte')).toBe(false);
    expect(p[p.length - 1]).toEqual(['Quelle', 'Kircher, T, E']);
  });
});
