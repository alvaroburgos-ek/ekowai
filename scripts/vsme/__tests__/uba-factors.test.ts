import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import { parseUbaFactors } from '../import-uba-factors';

// Local-only fixture (Ekowai-PC-01). `VSME_UBA_XLSX` overrides the default
// path (used to simulate the fixture-absent CI case); when the file is absent
// the suite skips honestly instead of failing.
const UBA =
  process.env.VSME_UBA_XLSX ??
  'C:/Users/Ekowai/Desktop/environmental-reporting service/01_Referenz/uba_liste_ef_für_thg_bilanzierung_v2.1.xlsx';
const UBA_AVAILABLE = fs.existsSync(UBA);

describe.skipIf(!UBA_AVAILABLE)('parseUbaFactors', () => {
  let rows: ReturnType<typeof parseUbaFactors>;
  beforeAll(() => {
    rows = parseUbaFactors(UBA, 'v2.1', 2024);
  });
  it('parses the German grid electricity factor (Scope 2)', () => {
    const grid = rows.find((r) => r.uba_id === '05_20_01_001_01');
    expect(grid).toBeDefined();
    expect(grid!.scope).toContain('Scope 2');
    expect(grid!.unit).toBe('kWh');
    expect(grid!.name).toBe('Deutscher Strommix');
    expect(grid!.kg_co2e).toBeGreaterThan(0.3);
    expect(grid!.kg_co2e).toBeLessThan(0.5);
  });
  it('derives commodity name + unit even when the Einheit cell is blank', () => {
    // Stationäre Verbrennung: Einheit column is empty; unit comes from the ID
    // suffix (_01 → kWh) and the name from the deepest non-numeric Level column.
    const diesel = rows.find((r) => r.uba_id === '02_10_01_005_02');
    expect(diesel?.name).toBe('Dieselkraftstoff');
    expect(diesel?.unit).toBe('l');
    const erdgas = rows.find((r) => r.uba_id === '01_10_02_004_01');
    expect(erdgas?.name).toBe('Erdgas (Heizwert)');
    expect(erdgas?.unit).toBe('kWh'); // suffix _01, Einheit cell blank in source
  });
  it('keeps refrigerant blends that only have a F-Gas-VO GWP (no AR4)', () => {
    // R-410A has no AR4 value but a F-Gas-VO GWP of 2088 → must NOT be dropped.
    const r410a = rows.find((r) => r.uba_id === '04_10_08_011_XX');
    expect(r410a).toBeDefined();
    expect(r410a!.name).toBe('R-410A');
    expect(r410a!.unit).toBe('kg');
    expect(r410a!.kg_co2e).toBe(2088);
  });
  it('every row carries a non-empty unit and name', () => {
    expect(rows.every((r) => !!r.unit && r.unit.trim() !== '')).toBe(true);
    expect(rows.every((r) => !!r.name && r.name.trim() !== '')).toBe(true);
  });
  it('only includes Scope 1 & 2 sheets (no Scope 3-only rows)', () => {
    expect(rows.every((r) => !/Scope 3/.test(r.scope) || /Scope 2/.test(r.scope))).toBe(true);
  });
  it('all rows carry version + year', () => {
    expect(rows.every((r) => r.source_version === 'v2.1' && r.dataset_year === 2024)).toBe(true);
  });
});
