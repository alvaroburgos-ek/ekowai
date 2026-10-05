import { describe, it, expect } from 'vitest';
import { filterCatalog, isVisible, parseCatalogQuery, CATALOG_PAGE_SIZE } from '../filter';
import type { PlantCatalogRow } from '@/lib/db/schema';

let seq = 0;
function row(p: Partial<PlantCatalogRow> & { scientificName: string }): PlantCatalogRow {
  seq += 1;
  return {
    id: `id-${seq}`, commonNameDe: null, commonNameEn: null, plantGroup: 'other', depthZoneCode: null, depthMinCm: null, depthMaxCm: null,
    light: 'unknown', heightCm: null, bloom: null, hardinessZones: null, waterHardness: null, nitrogenDemand: null, originRegions: null,
    plantingCodes: null, notes: null, aggressiveRhizome: false, aggressiveSource: null, sourceKind: 'guideline',
    sourceRef: 'FLL-GAR-2023 Tab. 29 (printed p. 125)', licenceStatus: 'guideline', active: true, createdAt: new Date(0),
    ...p,
  };
}

const ROWS: PlantCatalogRow[] = [
  row({ scientificName: 'Phragmites australis', commonNameDe: 'Gewöhnlicher Schilfrohr', aggressiveRhizome: true, aggressiveSource: 'Tab. 29' }),
  row({ scientificName: 'Alnus glutinosa', plantGroup: 'bank_terrestrial', sourceRef: 'FLL-TP-Rhizom-2023 § 1 (printed p. 7)' }),
  row({ scientificName: 'Myriophyllum spicatum', commonNameEn: 'Spiked Water-milfoil', plantGroup: 'submerged', depthMinCm: 30, depthMaxCm: 150, light: 'sun', sourceKind: 'reference_book', sourceRef: 'Kircher, T, E', licenceStatus: 'cleared' }),
  row({ scientificName: 'Caltha palustris', plantGroup: 'marsh_small', depthMinCm: 0, depthMaxCm: 10, light: 'partial', sourceKind: 'reference_book', sourceRef: 'Kircher, T, E', licenceStatus: 'cleared' }),
  row({ scientificName: 'Acorus calamus', depthZoneCode: '3-4', light: 'shade', sourceKind: 'reference_book', sourceRef: 'Kircher, T, E', licenceStatus: 'pending' }),
  row({ scientificName: 'Zizania caduciflora', aggressiveRhizome: true, active: false }),
];

describe('parseCatalogQuery', () => {
  it('accepts the documented params and drops unknown values', () => {
    const q = parseCatalogQuery(new URLSearchParams('q= phrag &group=submerged&maxDepthCm=40&light=partial&aggressive=true'));
    expect(q).toEqual({ q: 'phrag', group: 'submerged', maxDepthCm: 40, light: 'partial', aggressive: true });
    expect(parseCatalogQuery(new URLSearchParams('group=trees&maxDepthCm=-1&light=unknown&aggressive=maybe'))).toEqual({});
    expect(parseCatalogQuery(new URLSearchParams('aggressive=0'))).toEqual({ aggressive: false });
  });
});

describe('filterCatalog', () => {
  it('serves only visible rows (guideline | cleared, active) — pending book rows and inactive rows never appear', () => {
    const { hits, total } = filterCatalog(ROWS, {});
    expect(total).toBe(4);
    expect(hits.map((h) => h.scientific_name)).toEqual(['Alnus glutinosa', 'Caltha palustris', 'Myriophyllum spicatum', 'Phragmites australis']);
    expect(isVisible({ active: true, licenceStatus: 'pending' })).toBe(false);
    expect(isVisible({ active: false, licenceStatus: 'guideline' })).toBe(false);
  });
  it('q matches scientific, German and English names case-insensitively', () => {
    expect(filterCatalog(ROWS, { q: 'schilf' }).hits.map((h) => h.scientific_name)).toEqual(['Phragmites australis']);
    expect(filterCatalog(ROWS, { q: 'MILFOIL' }).hits.map((h) => h.scientific_name)).toEqual(['Myriophyllum spicatum']);
    expect(filterCatalog(ROWS, { q: 'acorus' }).total).toBe(0); // pending row stays invisible even on an exact name
  });
  it('group is exact; maxDepthCm keeps rows whose depth_min fits OR whose depth is unknown (flagged in the reason)', () => {
    expect(filterCatalog(ROWS, { group: 'submerged' }).hits.map((h) => h.scientific_name)).toEqual(['Myriophyllum spicatum']);
    const { hits } = filterCatalog(ROWS, { maxDepthCm: 20 });
    expect(hits.map((h) => h.scientific_name)).toEqual(['Alnus glutinosa', 'Caltha palustris', 'Phragmites australis']);
    expect(hits.find((h) => h.scientific_name === 'Caltha palustris')!.recommended).toContain('Pflanztiefe 0–10 cm ≤ 20 cm Zonentiefe');
    expect(hits.find((h) => h.scientific_name === 'Alnus glutinosa')!.recommended).toContain('Legende fehlt');
  });
  it('light = "tolerates at least this much shade"; unknown rows pass only without a light filter', () => {
    expect(filterCatalog(ROWS, { light: 'sun' }).hits.map((h) => h.scientific_name)).toEqual(['Caltha palustris', 'Myriophyllum spicatum']);
    expect(filterCatalog(ROWS, { light: 'partial' }).hits.map((h) => h.scientific_name)).toEqual(['Caltha palustris']);
    expect(filterCatalog(ROWS, { light: 'shade' }).total).toBe(0);
  });
  it('aggressive filters both ways and the flag + source travel with the hit', () => {
    const agg = filterCatalog(ROWS, { aggressive: true }).hits;
    expect(agg.map((h) => h.scientific_name)).toEqual(['Phragmites australis']);
    expect(agg[0]).toMatchObject({ aggressive_rhizome: true, aggressive_source: 'Tab. 29', source_kind: 'guideline' });
    expect(agg[0].recommended).toContain('aggressiv wurzelnd / rhizombildend (FLL-GAR-2023 Tab. 29 (printed p. 125))');
    expect(filterCatalog(ROWS, { aggressive: false }).total).toBe(3);
  });
  it('every reason ends with the non-normative reference marker and the source', () => {
    for (const h of filterCatalog(ROWS, { q: 'a' }).hits) expect(h.recommended).toMatch(/— Referenz \(nicht normativ\): .+/);
    expect(filterCatalog(ROWS, {}).hits[0].recommended.startsWith('Referenzeintrag')).toBe(true);
  });
  it('caps at the page size and reports the uncapped total', () => {
    const many = Array.from({ length: 60 }, (_, i) => row({ scientificName: `Species ${String(i).padStart(2, '0')}` }));
    const r = filterCatalog(many, {});
    expect(r.hits).toHaveLength(CATALOG_PAGE_SIZE);
    expect(r.total).toBe(60);
    expect(r.hits[0].scientific_name).toBe('Species 00');
  });
});
