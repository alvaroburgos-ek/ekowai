/**
 * Unit tests for the A138-26 flood governing-duration profile.
 *
 * Gl.10 (§5.3.4): V_Rück per duration D =
 *   ((r_D · (AcS_paved + A_VA) / 10000) − (Q_S + Q_Dr)) · D · 60 / 1000 − V_VA
 *
 * where AcS_paved = Σ(A_E,b,a · C_S) (paved areas × flood-event runoff coefficient C_s,
 * NOT the design-event C_i).
 *
 * The flood profile is iterated over all D in the T_n=30 column; the GOVERNING D
 * is the one that maximises V_Rück. After taking the governing value, the call site
 * applies max(0, governingValue) — the profile itself does NOT clamp.
 *
 * ---------------------------------------------------------------------------
 * HAND-COMPUTED WITNESS (5-row T_n=30 column)
 * ---------------------------------------------------------------------------
 * Flood scalars:
 *   AcS_paved = 5000·1.0 + 2000·0.8 = 5000 + 1600 = 6600  m²·(−)
 *   A_VA  = 50  m²
 *   Q_S   =  5  l/s
 *   Q_Dr  =  0  l/s
 *   V_VA  = 22.051 m³
 *
 * T_n=30 column (5 rows):
 *   D=5   r_D=300  → net inflow = ((300·(6600+50)/10000) − 5)·5·60/1000 − 22.051
 *                                = (300·6650/10000 − 5)·300/1000 − 22.051
 *                                = (199.5 − 5)·0.3 − 22.051
 *                                = 194.5·0.3 − 22.051
 *                                = 58.35 − 22.051 = 36.299 m³
 *   D=10  r_D=230  → (230·6650/10000 − 5)·600/1000 − 22.051
 *                   = (152.95 − 5)·0.6 − 22.051
 *                   = 147.95·0.6 − 22.051
 *                   = 88.77 − 22.051 = 66.719 m³
 *   D=30  r_D=130  → (130·6650/10000 − 5)·1800/1000 − 22.051
 *                   = (86.45 − 5)·1.8 − 22.051
 *                   = 81.45·1.8 − 22.051
 *                   = 146.61 − 22.051 = 124.559 m³   ← MAX
 *   D=60  r_D= 80  → (80·6650/10000 − 5)·3600/1000 − 22.051
 *                   = (53.2 − 5)·3.6 − 22.051
 *                   = 48.2·3.6 − 22.051
 *                   = 173.52 − 22.051 = 151.469 m³   ← actually higher? Let me recompute D=60 vs D=30.
 *
 * Wait — let me redo this more carefully with exact floats:
 *
 *   AcS_paved = 6600
 *   A_VA      = 50
 *   combined  = 6650
 *   Q_S+Q_Dr  = 5
 *   V_VA      = 22.051
 *
 *   D=5:   inflow_l_s = 300*6650/10000 = 199.5;  net = 199.5-5 = 194.5; vol = 194.5*5*60/1000 = 58.35;   V_Rück = 58.35-22.051   = 36.299
 *   D=10:  inflow_l_s = 230*6650/10000 = 152.95; net = 147.95;           vol = 147.95*10*60/1000 = 88.77;  V_Rück = 88.77-22.051  = 66.719
 *   D=30:  inflow_l_s = 130*6650/10000 =  86.45; net =  81.45;           vol =  81.45*30*60/1000 = 146.61; V_Rück = 146.61-22.051 = 124.559
 *   D=60:  inflow_l_s =  80*6650/10000 =  53.20; net =  48.20;           vol =  48.20*60*60/1000 = 173.52; V_Rück = 173.52-22.051 = 151.469
 *   D=120: inflow_l_s =  50*6650/10000 =  33.25; net =  28.25;           vol =  28.25*120*60/1000 = 203.40;V_Rück = 203.40-22.051 = 181.349  ← MAX
 *
 * GOVERNING D = 120 min, V_Rück = 181.349 m³.
 *
 * ---------------------------------------------------------------------------
 * ALL-NEGATIVE WITNESS
 * ---------------------------------------------------------------------------
 * Tiny catchment, high drainage rate — every D gives V_Rück < 0.
 *   AcS_paved = 100   (very small)
 *   A_VA      =  10   m²
 *   Q_S       = 100   l/s  (large drain)
 *   Q_Dr      =   0
 *   V_VA      = 999   m³   (large existing storage)
 *
 *   D=5:   (300*110/10000 - 100)*5*60/1000 - 999 = (3.3 - 100)*0.3 - 999 = -96.7*0.3 - 999 = -29.01 - 999 = -1028.01
 *   D=30:  (130*110/10000 - 100)*30*60/1000 - 999 = (1.43-100)*1.8 - 999 = -98.57*1.8 - 999 = -177.426 - 999 = -1176.426
 *   → Every D < 0; governing governingValue < 0; max(0, governing) = 0.
 */
import { describe, it, expect } from 'vitest';
import { iterateGoverningDuration, GOVERNING_PROFILES } from '../governing-duration';

// ---------------------------------------------------------------------------
// 5-row T_n=30 column fixture
// ---------------------------------------------------------------------------
const FLOOD_30COL_ROWS = [
  { D_min: 5,   r_D_n: 300 },
  { D_min: 10,  r_D_n: 230 },
  { D_min: 30,  r_D_n: 130 },
  { D_min: 60,  r_D_n:  80 },
  { D_min: 120, r_D_n:  50 },
];

// Flood scalars
const FLOOD_SCALARS = {
  AcS_paved: 6600,  // Σ(A_E,b,a · C_S) = 5000·1.0 + 2000·0.8
  A_VA:        50,
  Q_S:          5,
  Q_Dr:         0,
  V_VA:    22.051,
};

// ---------------------------------------------------------------------------
// Hand-computed per-D values (from the comments above):
//   D=5   → 36.299
//   D=10  → 66.719
//   D=30  → 124.559
//   D=60  → 151.469
//   D=120 → 181.349  ← GOVERNING
// ---------------------------------------------------------------------------

const floodProfile = GOVERNING_PROFILES.find((p) => p.facility === 'A138-26');

describe('A138-26 flood governing-duration profile', () => {
  it('profile is registered in GOVERNING_PROFILES', () => {
    expect(floodProfile).toBeDefined();
    expect(floodProfile?.maximizes).toBe('V_Rueck');
  });

  it('governing D = 120 min, V_Rück ≈ 181.349 m³ (hand-computed witness)', () => {
    expect(floodProfile).toBeDefined();
    const profile = floodProfile!;
    const result = iterateGoverningDuration(
      FLOOD_30COL_ROWS,
      (D, r_D) => profile.sizing(D, r_D, FLOOD_SCALARS),
    );

    // Per-D hand values (verified above):
    //   D=5   r_D=300  combined=6650  inflow=199.5  net=194.5  vol=58.35     VR=36.299
    //   D=10  r_D=230  combined=6650  inflow=152.95 net=147.95 vol=88.77     VR=66.719
    //   D=30  r_D=130  combined=6650  inflow=86.45  net=81.45  vol=146.61    VR=124.559
    //   D=60  r_D=80   combined=6650  inflow=53.20  net=48.20  vol=173.52    VR=151.469
    //   D=120 r_D=50   combined=6650  inflow=33.25  net=28.25  vol=203.40    VR=181.349  ← max
    expect(result.governingD).toBe(120);
    expect(result.r_D_at_governing).toBe(50);

    // Exact hand-computed formula for D=120:
    const expected_120 =
      ((50 * (6600 + 50)) / 10000 - (5 + 0)) * 120 * 60 / 1000 - 22.051;
    expect(result.governingValue).toBeCloseTo(expected_120, 4);
    expect(result.governingValue).toBeCloseTo(181.349, 2);
  });

  it('perDuration has 5 entries matching hand-computed values', () => {
    expect(floodProfile).toBeDefined();
    const profile = floodProfile!;
    const result = iterateGoverningDuration(
      FLOOD_30COL_ROWS,
      (D, r_D) => profile.sizing(D, r_D, FLOOD_SCALARS),
    );

    expect(result.perDuration).toHaveLength(5);

    // D=5  → ~36.299
    expect(result.perDuration[0].D).toBe(5);
    expect(result.perDuration[0].r_D).toBe(300);
    const expected_5 = ((300 * 6650) / 10000 - 5) * 5 * 60 / 1000 - 22.051;
    expect(result.perDuration[0].value).toBeCloseTo(expected_5, 4);
    expect(result.perDuration[0].value).toBeCloseTo(36.299, 2);

    // D=30 → ~124.559
    expect(result.perDuration[2].D).toBe(30);
    const expected_30 = ((130 * 6650) / 10000 - 5) * 30 * 60 / 1000 - 22.051;
    expect(result.perDuration[2].value).toBeCloseTo(expected_30, 4);
    expect(result.perDuration[2].value).toBeCloseTo(124.559, 2);

    // D=120 (index 4) → ~181.349  ← governing
    expect(result.perDuration[4].D).toBe(120);
    const expected_120 = ((50 * 6650) / 10000 - 5) * 120 * 60 / 1000 - 22.051;
    expect(result.perDuration[4].value).toBeCloseTo(expected_120, 4);
    expect(result.perDuration[4].value).toBeCloseTo(181.349, 2);
  });

  it('all-negative case: max(0, governing) === 0', () => {
    expect(floodProfile).toBeDefined();
    const profile = floodProfile!;

    // Tiny catchment / large drain / huge existing storage → every D < 0
    const negScalars = {
      AcS_paved: 100,   // very small
      A_VA:       10,
      Q_S:       100,   // large drain
      Q_Dr:        0,
      V_VA:      999,   // huge existing storage
    };

    // Two-row column is enough:
    const negRows = [
      { D_min: 5,  r_D_n: 300 },
      { D_min: 30, r_D_n: 130 },
    ];

    const result = iterateGoverningDuration(
      negRows,
      (D, r_D) => profile.sizing(D, r_D, negScalars),
    );

    // Every value must be negative
    expect(result.governingValue).not.toBeNull();
    expect(result.governingValue!).toBeLessThan(0);

    // Call site applies the floor:
    const floored = Math.max(0, result.governingValue!);
    expect(floored).toBe(0);
  });

  it('sizing function formula is correct: ((r_D*(AcS+A_VA)/10000)-(Q_S+Q_Dr))*D*60/1000 - V_VA', () => {
    // Spot check: D=30, r_D=130 with simple round scalars
    expect(floodProfile).toBeDefined();
    const profile = floodProfile!;
    const s = { AcS_paved: 6600, A_VA: 50, Q_S: 5, Q_Dr: 0, V_VA: 22.051 };
    const manual = ((130 * (6600 + 50)) / 10000 - (5 + 0)) * 30 * 60 / 1000 - 22.051;
    const computed = profile.sizing(30, 130, s);
    expect(computed).toBeCloseTo(manual, 6);
    expect(computed).toBeCloseTo(124.559, 2);
  });
});
