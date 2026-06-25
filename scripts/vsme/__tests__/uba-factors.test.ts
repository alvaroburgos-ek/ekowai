import { describe, it, expect } from 'vitest';
import { parseUbaFactors } from '../import-uba-factors';
const UBA =
  'C:/Users/Ekowai/Desktop/environmental-reporting service/01_Referenz/uba_liste_ef_für_thg_bilanzierung_v2.1.xlsx';

describe('parseUbaFactors', () => {
  const rows = parseUbaFactors(UBA, 'v2.1', 2024);
  it('parses the German grid electricity factor (Scope 2)', () => {
    const grid = rows.find((r) => r.uba_id === '05_20_01_001_01');
    expect(grid).toBeDefined();
    expect(grid!.scope).toContain('Scope 2');
    expect(grid!.unit).toBe('kWh');
    expect(grid!.kg_co2e).toBeGreaterThan(0.3);
    expect(grid!.kg_co2e).toBeLessThan(0.5);
  });
  it('only includes Scope 1 & 2 sheets (no Scope 3-only rows)', () => {
    expect(rows.every((r) => !/Scope 3/.test(r.scope) || /Scope 2/.test(r.scope))).toBe(true);
  });
  it('all rows carry version + year', () => {
    expect(rows.every((r) => r.source_version === 'v2.1' && r.dataset_year === 2024)).toBe(true);
  });
});
