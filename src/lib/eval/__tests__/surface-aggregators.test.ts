// src/lib/eval/__tests__/surface-aggregators.test.ts
import { describe, it, expect } from 'vitest';
import { aggregators } from '../aggregators';
import { normalizeSurfaceCarrier } from '../surface-inventory';

const A_C_ID = 'b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0';
const C_M_ID = 'a1380702-0000-4000-8000-000000000002';
const BA_ID = 'a1380702-0000-4000-8000-000000000003';
const NBA_ID = 'a1380702-0000-4000-8000-000000000004';

const carrier = normalizeSurfaceCarrier({
  rows: [
    { id: '1', label: 'Dach', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
    { id: '2', label: 'Parkplatz', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
  ],
});
const req = (equationId: string) => ({ equationId, formula: '', inputSymbols: [], outputSymbol: '', expectedUnits: {}, inputs: [], aggregator: { surfaceInventory: carrier } });

describe('surface aggregators (A138-07 producers)', () => {
  it('A_C aggregator computes 4826.43 with paved/unpaved split in substituted', () => {
    const s = aggregators[A_C_ID].run(req(A_C_ID));
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') {
      expect(s.value).toBeCloseTo(4826.43, 2);
      expect(s.substituted['Σ befestigt']).toBeCloseTo(4826.43, 2);
      expect(s.substituted['Σ unbefestigt']).toBe(0);
    }
  });
  it('C_m aggregator computes 0.9', () => {
    const s = aggregators[C_M_ID].run(req(C_M_ID));
    expect(s.kind).toBe('computed');
    if (s.kind === 'computed') expect(s.value).toBeCloseTo(0.9, 6);
  });
  it('A_E_ba / A_E_nba aggregators compute the paved/unpaved area totals', () => {
    const ba = aggregators[BA_ID].run(req(BA_ID));
    const nba = aggregators[NBA_ID].run(req(NBA_ID));
    expect(ba.kind).toBe('computed'); if (ba.kind === 'computed') expect(ba.value).toBeCloseTo(5362.7, 4);
    expect(nba.kind).toBe('computed'); if (nba.kind === 'computed') expect(nba.value).toBe(0);
  });
  it('returns manual_required (not a bare 0) when no complete rows', () => {
    const empty = { surfaceInventory: { rows: [] } };
    const s = aggregators[A_C_ID].run({ equationId: A_C_ID, formula: '', inputSymbols: [], outputSymbol: '', expectedUnits: {}, inputs: [], aggregator: empty });
    expect(s.kind).toBe('manual_required');
  });
});
