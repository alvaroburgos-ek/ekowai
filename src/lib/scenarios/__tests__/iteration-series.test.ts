import { describe, it, expect } from 'vitest';
import { gl8Series, gl10Series, gl16Series, displayValue } from '../iteration-series';
import { computeMuldeGeometrySweep } from '@/lib/eval/materialize-asm';
import { evaluateFormula } from '@/lib/eval/formula';
import { floodCarrierFromSum } from '@/lib/eval/aggregators';
import { KOSTRA_151093, rows } from '../__fixtures__/c4-a138-chain';

const close = (a: number | null, b: number, rel = 1e-9) => {
  expect(a).not.toBeNull();
  expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));
};
const AC = 526.2105;
const SUM_CS = 602.161;

describe('Gl. 8 (A138-13) — record state, T = 5 a', () => {
  it('V_VA = 70.0038 m³ at D = 10080 min, boundary-limited (spec §6)', () => {
    const s = gl8Series(rows(5), { A_C: AC, A_VA: 50, Q_S: 0.0015, Q_Dr: 0, f_Z: 1.2, f_A: 1 }, 5);
    close(s.governingValue, 70.0037505216, 1e-9);
    expect(s.governingD).toBe(10080);
    expect(s.r_D_at_governing).toBe(1.7);
    expect(s.boundaryLimited).toBe(true);
    expect(s.perDuration).toHaveLength(22);
    expect(s.key).toBe('A138-13:Gl8');
  });
  it('equals the real Gl. 8 aggregator (same governing value)', () => {
    const r = rows(5).map((x, i) => ({ id: `r${i}`, ...x }));
    const state = evaluateFormula({
      equationId: '69f31e6e-a755-4246-af10-ae46668b5c86', formula: 'V_VA = (Q_zu - Q_S - Q_Dr) * D * 60 * f_Z * f_A * 10^-3',
      inputSymbols: [], outputSymbol: 'V_VA', inputs: [],
      aggregator: { kostraTable: { rows: r }, gl8Scalars: { A_C: AC, A_VA: 50, Q_S: 0.0015, Q_Dr: 0, f_Z: 1.2, f_A: 1 }, kostraUnit: null },
    });
    expect(state.kind).toBe('computed');
    if (state.kind === 'computed') close(state.value, 70.0037505216);
  });
});

describe('Gl. 10 (A138-26) — prototype cases F0/K5/K6 × T 30/100 (spec §6)', () => {
  const cases = [
    { n: 'F0', A_VA: 0, Q_S: 0, V_VA: 0, t30: [94.688612928, 10080], t100: [116.539831296, 10080] },
    { n: 'K5', A_VA: 48.58, Q_S: 0.4858, V_VA: 14.57, t30: [13.5907354, 360], t100: [24.50850184, 540] },
    { n: 'K6', A_VA: 105.2, Q_S: 0.1052, V_VA: 31.56, t30: [27.345706464, 4320], t100: [49.425581568, 5760] },
  ] as const;
  for (const c of cases) {
    it(`${c.n}: T 30 a ${c.t30[0].toFixed(2)} m³ @ ${c.t30[1]} min · T 100 a ${c.t100[0].toFixed(2)} m³ @ ${c.t100[1]} min`, () => {
      const s30 = gl10Series(rows(30), { AcS_paved: SUM_CS, A_VA: c.A_VA, Q_S: c.Q_S, Q_Dr: 0, V_VA: c.V_VA }, 30);
      const s100 = gl10Series(rows(100), { AcS_paved: SUM_CS, A_VA: c.A_VA, Q_S: c.Q_S, Q_Dr: 0, V_VA: c.V_VA }, 100);
      close(s30.governingValue, c.t30[0], 1e-8);
      expect(s30.governingD).toBe(c.t30[1]);
      close(s100.governingValue, c.t100[0], 1e-8);
      expect(s100.governingD).toBe(c.t100[1]);
      expect(s30.key).toBe('A138-26:Gl10:T30');
      expect(s100.key).toBe('A138-26:Gl10:T100');
      expect(s30.floorAtZero).toBe(true);
    });
  }
  it('record state T 30 a = 31.6401 m³ and T 100 a = 55.3057 m³ at D 10080 (ledger, F-A7)', () => {
    const sc = { AcS_paved: SUM_CS, A_VA: 50, Q_S: 0.0015, Q_Dr: 0, V_VA: 70.0037505216 };
    close(gl10Series(rows(30), sc, 30).governingValue, 31.640062406400006, 1e-9);
    close(gl10Series(rows(100), sc, 100).governingValue, 55.30568077439999, 1e-9);
  });
  it('the T 30 series equals the real Gl. 10 aggregator (max(0, governing))', () => {
    const sc = { A_VA: 50, Q_S: 0.0015, Q_Dr: 0, V_VA: 70.0037505216, D: null, r_D_T_n_Ue: null };
    const state = evaluateFormula({
      equationId: '8e3c7e22-e3c7-449a-b267-928332c89306', formula: 'V_Rueck = 0', inputSymbols: [], outputSymbol: 'V_Rueck', inputs: [],
      aggregator: {
        floodSubAreas: floodCarrierFromSum(SUM_CS), gl10Scalars: sc, kostraUnit: null,
        floodKostraCol: { rows: rows(30).map((x, i) => ({ id: `r${i}`, ...x })) }, missingFloodColReason: null,
      },
    });
    expect(state.kind).toBe('computed');
    if (state.kind === 'computed') close(state.value, 31.640062406400006);
  });
  it('displays a negative V_Rück as 0', () => {
    const s = gl10Series(rows(30), { AcS_paved: SUM_CS, A_VA: 0, Q_S: 0, Q_Dr: 0, V_VA: 1e6 }, 30);
    expect(displayValue(s, -5)).toBe(0);
  });
});

describe('Gl. 16 (A138-17) — swale area per case', () => {
  it('K5 k_i 1·10⁻⁵ → A_S,m 48.58 m² at D 180 min (spec §6)', () => {
    const s = gl16Series(rows(5), { A_C: AC, h_M: 0.3, f_Z: 1.2, k_i: 1e-5 }, 5);
    close(s.governingValue, 48.57599051396648);
    expect(s.governingD).toBe(180);
    expect(s.boundaryLimited).toBe(false);
  });
  it('K6 k_i 1·10⁻⁶ → A_S,m 93.25 m² at D 1440 min; Gl. 9 minimum 105.2 m²', () => {
    const s = gl16Series(rows(5), { A_C: AC, h_M: 0.3, f_Z: 1.2, k_i: 1e-6 }, 5);
    close(s.governingValue, 93.2537609036861);
    expect(s.governingD).toBe(1440);
    // Gl. 9 inverted at q_S,AC = 2 l/(s·ha): A_S,m ≥ 2·A_C / (k_i·10⁷)
    close((2 * AC) / (1e-6 * 1e7), 105.2421);
  });
  it('is the same iteration as the save path sweep', () => {
    const sc = { A_C: AC, h_M: 0.3, f_Z: 1.2, k_i: 1e-5 };
    const sweep = computeMuldeGeometrySweep(rows(5), sc);
    expect(sweep.perDuration).toHaveLength(22);
    expect(gl16Series(rows(5), sc, 5).governingValue).toBe(sweep.A_S_m);
    expect(sweep.r_D_at_governing).toBe(30.6);
  });
  it('fixture grid is the 22 × 3 DWD column set', () => {
    expect(KOSTRA_151093.D).toHaveLength(22);
  });
});
