import { describe, it, expect } from 'vitest';
import { evaluateTab3, TAB3_CRITERIA } from '../feasibility-table';

// The BESS case as entered on A138-01/02 (2026-09-17): Zone III, kf 1.1e-5, GW 3 m, no Altlasten, no geotech, distances met, no slope.
const CASE = {
  gw_clearance: 3, contaminated_land_status: 'none', water_protection_zone: 'zone_III', kf_initial_estimate: 1.1e-5,
  geotech_hazards: 'none', building_clearance_status: 'met', slope_risk: 'none',
};

describe('Tab. 3 decision table', () => {
  it('has seven criteria with the printed column-2 and column-3 cells', () => {
    expect(TAB3_CRITERIA).toHaveLength(7);
    for (const c of TAB3_CRITERIA) { expect(c.cells[2].length).toBeGreaterThan(10); expect(c.cells[3].length).toBeGreaterThan(10); }
    expect(TAB3_CRITERIA[0].cells[4]).toBeNull(); // MHGW row has no column-4 cell (L745)
  });

  it('the case lands in column 3 only because of the protection zone (Einzelfallbetrachtung), all else column 2', () => {
    const r = evaluateTab3(CASE);
    expect(r.unanswered).toEqual([]);
    expect(r.rows.map((x) => `${x.def.key}:${x.col}`)).toEqual(['mhgw:2', 'altlasten:2', 'wsg:3', 'kf:2', 'geotech:2', 'abstand:2', 'hang:2']);
    expect(r.overall).toBe(3);
    expect(r.suggestedDetermination).toBe('conditional');
    expect(r.judgementRows).toEqual(['wsg']); // column 4 for the zone is a risk judgement the engineer must make
  });

  it('a column-4 answer makes the whole table column 4; a zone never does by itself', () => {
    expect(evaluateTab3({ ...CASE, geotech_hazards: 'at_site' }).overall).toBe(4);
    expect(evaluateTab3({ ...CASE, water_protection_zone: 'zone_I' }).overall).toBe(3);
    expect(evaluateTab3({ ...CASE, water_protection_zone: 'none' }).overall).toBe(2);
  });

  it('kf below 1e-6 is column 3 (connection/throttle possible is not a field), MHGW < 1 m is column 3', () => {
    expect(evaluateTab3({ ...CASE, kf_initial_estimate: 5e-7, water_protection_zone: 'none' }).rows.find((x) => x.def.key === 'kf')!.col).toBe(3);
    expect(evaluateTab3({ ...CASE, gw_clearance: 0.8 }).rows.find((x) => x.def.key === 'mhgw')!.col).toBe(3);
  });

  it('an unanswered row leaves the overall open and names it', () => {
    const r = evaluateTab3({ ...CASE, slope_risk: undefined });
    expect(r.overall).toBeNull();
    expect(r.unanswered).toEqual(['hang']);
  });
});
