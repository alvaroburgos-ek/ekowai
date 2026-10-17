import { describe, it, expect } from 'vitest';
import { mirrorA138, facilityRainRows, type MirrorAccessor } from '../a138-mirror';
import { seriesForSheet } from '../sheet-series';
import { rainfallCarrier } from '../__fixtures__/c4-a138-chain';

function acc(nums: Record<string, number>, strs: Record<string, string> = {}): MirrorAccessor {
  const carrier = rainfallCarrier();
  return {
    num: (s) => (s in nums ? nums[s] : null),
    str: (s) => (s in strs ? strs[s] : null),
    json: (s) => (s === 'r_D_n_table' ? carrier : undefined),
  };
}
const close = (a: number | null | undefined, b: number) => expect(Math.abs((a as number) - b)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(b)));
const w = (ws: ReturnType<typeof mirrorA138>, sym: string) => ws.find((x) => x.symbol === sym)?.value;

describe('facilityRainRows', () => {
  it('A138-17 uses the project n = 0.2 ⇒ T = 5 a column', () => {
    const r = facilityRainRows('A138-17', acc({ n: 0.2 }));
    expect(r?.T).toBe(5);
    expect(r?.rows[21]).toMatchObject({ D_min: 10080, r_D_n: 1.7 });
  });
  it('forceT selects the flood column', () => {
    expect(facilityRainRows('A138-26', acc({}), 100)?.rows[0].r_D_n).toBe(630);
  });
});

describe('mirrorA138 A138-12 (A_S,m single source)', () => {
  it('direct ⇒ no write (Gl. 7 equation owns it)', () => {
    expect(mirrorA138('A138-12', acc({ A_S_min: 40, A_S_max: 50 }, { a_s_m_determination_method: 'direct' }))).toEqual([]);
  });
  it('geometry + mulde ⇒ Gl. 16 sweep, K5 48.58 m²', () => {
    const ws = mirrorA138('A138-12', acc({ n: 0.2, A_C: 526.2105, h_M: 0.3, f_Z: 1.2, k_i: 1e-5 }, { a_s_m_determination_method: 'geometry', facility_type_selected: 'mulde' }));
    close(w(ws, 'A_S_m'), 48.57599051396648);
  });
  it('geometry + MRE (uppercase token) uses k_i_Mulde when present', () => {
    const ws = mirrorA138('A138-12', acc({ n: 0.2, A_C: 526.2105, h_M: 0.3, f_Z: 1.2, k_i: 1e-6, k_i_Mulde: 1e-5 }, { a_s_m_determination_method: 'geometry', facility_type_selected: 'MRE' }));
    close(w(ws, 'A_S_m'), 48.57599051396648);
  });
  it('geometry + rigole is not mirrored in A1 ⇒ no write (carried)', () => {
    expect(mirrorA138('A138-12', acc({}, { a_s_m_determination_method: 'geometry', facility_type_selected: 'rigole' }))).toEqual([]);
  });
  it('geometry + mulde with a missing input ⇒ A_S_m null (cleared, never stale)', () => {
    const ws = mirrorA138('A138-12', acc({ n: 0.2, A_C: 526.2105, f_Z: 1.2, k_i: 1e-5 }, { a_s_m_determination_method: 'geometry', facility_type_selected: 'mulde' }));
    expect(w(ws, 'A_S_m')).toBeNull();
  });
});

describe('mirrorA138 A138-17 (plain swale)', () => {
  it('record state: k_i_Mulde 3e-8, V_M 13.5, V_M,erf 70.1126 @ D 10080', () => {
    const ws = mirrorA138('A138-17', acc({ n: 0.2, A_C: 526.2105, A_S_m: 45, h_M: 0.3, f_Z: 1.2, k_i: 3e-8, A_VA: 50 }, { facility_type_selected: 'mulde' }));
    close(w(ws, 'k_i_Mulde'), 3e-8);
    close(w(ws, 'V_M'), 13.5);
    close(w(ws, 'V_M_erf'), 70.1126145216);
    expect(w(ws, 'D_used_M')).toBe(10080);
    expect(w(ws, 'r_D_n_used_M')).toBe(1.7);
  });
  it('composite facility ⇒ not mirrored in A1', () => {
    expect(mirrorA138('A138-17', acc({}, { facility_type_selected: 'MRS' }))).toEqual([]);
  });
});

describe('seriesForSheet', () => {
  const GL8 = '69f31e6e-a755-4246-af10-ae46668b5c86';
  const GL10 = '8e3c7e22-e3c7-449a-b267-928332c89306';
  const GL16 = '14999c2a-cdeb-42c1-98fd-fcdec65123da';
  it('A138-13 Gl. 8 from the visible scalars (Q_Dr absent ⇒ 0)', () => {
    const s = seriesForSheet('A138-13', [GL8], acc({ n: 0.2, A_C: 526.2105, A_VA: 50, Q_S: 0.0015, f_Z: 1.2, f_A: 1 }));
    expect(s.map((x) => x.key)).toEqual(['A138-13:Gl8']);
    close(s[0].governingValue, 70.0037505216);
  });
  it('A138-26 Gl. 10 at T 30 and T 100', () => {
    const s = seriesForSheet('A138-26', [GL10], acc({ A_C_s_flood: 602.161, A_VA: 50, Q_S: 0.0015, V_VA: 70.0037505216 }));
    expect(s.map((x) => x.key)).toEqual(['A138-26:Gl10:T30', 'A138-26:Gl10:T100']);
    close(s[1].governingValue, 55.30568077439999);
  });
  it('A138-17 Gl. 16 only for a swale facility', () => {
    const a = { n: 0.2, A_C: 526.2105, h_M: 0.3, f_Z: 1.2, k_i: 1e-6 };
    expect(seriesForSheet('A138-17', [GL16], acc(a, { facility_type_selected: 'mulde' }))[0].governingD).toBe(1440);
    expect(seriesForSheet('A138-17', [GL16], acc(a, { facility_type_selected: 'rigole' }))).toEqual([]);
  });
  it('a missing scalar ⇒ no series (the equation card names what is missing)', () => {
    expect(seriesForSheet('A138-13', [GL8], acc({ n: 0.2, A_C: 526.2105, Q_S: 0.0015, f_Z: 1.2, f_A: 1 }))).toEqual([]);
  });
});
