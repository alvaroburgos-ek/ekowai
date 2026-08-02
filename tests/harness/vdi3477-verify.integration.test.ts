/**
 * VDI 3477:2016-03 ("Biologische Abgasreinigung — Biofilter") — REAL save-path execution proof.
 *
 * TWO proofs in one file:
 *
 *  (C) GATE EXECUTION — drives the standard's 18 live BLOCK gates through the REAL enforcement chain
 *      against a disposable embedded Postgres:
 *        saveWorksheet(instance, values) → values persist to project_parameters
 *        checkApprovalGate(instance)     → the engineer-approve gate replays every block condition
 *                                          against the SAVED values and lists definite `fail`s.
 *      `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 *      `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven ENFORCING
 *      only when shown BOTH ways: a persisted passing state (not blocked) and a persisted violating
 *      state (definite fail) — the F-4 lesson. The 3 TRUE no-op gates (CR-15/16/17) are driven to
 *      demonstrate they NEVER block in any persisted state (no-op, reported not fixed).
 *
 *  (B) EQUATION EVAL — drives representative equations through the REAL evaluator
 *      (evaluateFormula → arithmetic engine), proving the 15 evaluable equations COMPUTE and the 3
 *      NR equations return `manual_required` (Gl.6 comparison-criterion; Gl.B1/B4 unsupported `lg`).
 *      Pure functions, no DB — but the SAME engine the wizard uses.
 *
 * Nothing is applied to prod.
 */
// @vitest-environment node
import './_harness-env-vdi3477'; // top-level-await: PG + seedVDI3477 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getVDI3477Harness } from './_harness-env-vdi3477';
import { VDI3477_GATES } from './seed-vdi3477';
import { evaluateFormula } from '@/lib/eval/formula';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getVDI3477Harness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string | null | Record<string, unknown> | unknown[];

/** Persist a symbol→value map to worksheet `ws` (the symbol's HOME worksheet) through the REAL
 *  saveWorksheet. A null value clears the field. */
async function saveSymbols(ws: string, values: Record<string, Val>): Promise<void> {
  const batch: Record<string, { type: string; value: Val }> = {};
  for (const [symbol, value] of Object.entries(values)) {
    const meta = fixture.fieldMeta[`${ws}:${symbol}`];
    if (!meta) throw new Error(`seed gap: no field for ${ws}:${symbol}`);
    batch[meta.fieldId] = { type: meta.dataType, value };
  }
  const res = await saveWorksheet({
    instanceId: fixture.instances[ws],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: batch as any,
  });
  expect(res.ok, `saveWorksheet(${ws}) failed: ${JSON.stringify(res)}`).toBe(true);
}

type Save = { ws: string; values: Record<string, Val> };
async function applySaves(saves: Save[]): Promise<void> {
  for (const s of saves) await saveSymbols(s.ws, s.values);
}

/** Whether `code` is in the block-gate failing list for worksheet `gateWs` given the CURRENT
 *  persisted project state (the real approval-gate read path). */
async function gateBlocks(gateWs: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[gateWs]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked; persist the
 *  violating saves → blocked (definite fail). */
async function proveBothWays(
  gateWs: string,
  code: string,
  passSaves: Save[],
  violateSaves: Save[],
): Promise<void> {
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} SHOULD block in violating state`).toBe(true);
}

// ────────────────────────────────────────────────────────────────────────────────────────────
// Seed sanity
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('VDI-3477 — seed sanity (topology matches prod: 9 worksheets, 18 block gates)', () => {
  it('seeds all 9 worksheet instances and 18 block gates (3 of them TRUE no-ops)', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'VDI-3477-01', 'VDI-3477-02', 'VDI-3477-03', 'VDI-3477-04', 'VDI-3477-05',
      'VDI-3477-06', 'VDI-3477-07', 'VDI-3477-08', 'VDI-3477-09',
    ]);
    expect(VDI3477_GATES.length).toBe(18);
    expect(VDI3477_GATES.every((g) => g.sev === 'block')).toBe(true);
    expect(VDI3477_GATES.filter((g) => g.cond === 'TRUE').map((g) => g.code).sort())
      .toEqual(['VDI-3477-CR-15', 'VDI-3477-CR-16', 'VDI-3477-CR-17']);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// (C) GATE EXECUTION — 15 substantive block gates, each both ways
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('VDI-3477-01 — Anmeldung / Eignungspruefung', () => {
  it('CR-01  biofilter_grundsaetzlich_geeignet == true', async () => {
    await proveBothWays('VDI-3477-01', 'VDI-3477-CR-01',
      [{ ws: 'VDI-3477-01', values: { biofilter_grundsaetzlich_geeignet: true } }],
      [{ ws: 'VDI-3477-01', values: { biofilter_grundsaetzlich_geeignet: false } }]);
  });
});

describe('VDI-3477-02 — Rohgas / Schadstoffeignung', () => {
  it('CR-02  schadstoff_stoffgruppe IS NOT NULL AND eignungsklasse IS NOT NULL (Tab.2)', async () => {
    await proveBothWays('VDI-3477-02', 'VDI-3477-CR-02',
      [{ ws: 'VDI-3477-02', values: { schadstoff_stoffgruppe: 'alkohole', eignungsklasse: 'gut_geeignet' } }],
      [{ ws: 'VDI-3477-02', values: { eignungsklasse: null } }]); // clear one → AND fails
  });
  it('CR-11  c_rein <= c_roh (numeric field-vs-field, acompare — trap-1 fix)', async () => {
    await proveBothWays('VDI-3477-02', 'VDI-3477-CR-11',
      [{ ws: 'VDI-3477-02', values: { c_rein: 10, c_roh: 100 } }],  // 10 <= 100 → pass
      [{ ws: 'VDI-3477-02', values: { c_rein: 200 } }]);            // 200 <= 100 → fail (c_roh stays 100)
  });
});

describe('VDI-3477-04 — Auslegung / Dimensionierung', () => {
  it('CR-13  V_dot IS NOT NULL AND dp IS NOT NULL (V_dot resolved CROSS-worksheet from WS02)', async () => {
    await proveBothWays('VDI-3477-04', 'VDI-3477-CR-13',
      [{ ws: 'VDI-3477-02', values: { V_dot: 10000 } }, { ws: 'VDI-3477-04', values: { dp: 500 } }],
      [{ ws: 'VDI-3477-02', values: { V_dot: null } }]); // clear cross-ws operand → AND fails
  });
});

describe('VDI-3477-05 — Abgaskonditionierung / Befeuchtung', () => {
  it('CR-05  rel_feuchte_befeuchter_aus > 95 (§5.2.2.1: relative Feuchte muss über 95 % liegen)', async () => {
    await proveBothWays('VDI-3477-05', 'VDI-3477-CR-05',
      [{ ws: 'VDI-3477-05', values: { rel_feuchte_befeuchter_aus: 98 } }],
      [{ ws: 'VDI-3477-05', values: { rel_feuchte_befeuchter_aus: 90 } }]);
  });
  it('CR-06  tropfenabscheider_vorhanden == true', async () => {
    await proveBothWays('VDI-3477-05', 'VDI-3477-CR-06',
      [{ ws: 'VDI-3477-05', values: { tropfenabscheider_vorhanden: true } }],
      [{ ws: 'VDI-3477-05', values: { tropfenabscheider_vorhanden: false } }]);
  });
  it('CR-19  nh3_vor_biofilter < 5 AND h2s_vor_biofilter < 5 (§5.1.5: jeweils < 5 mg/m3)', async () => {
    await proveBothWays('VDI-3477-05', 'VDI-3477-CR-19',
      [{ ws: 'VDI-3477-05', values: { nh3_vor_biofilter: 3, h2s_vor_biofilter: 3 } }],
      [{ ws: 'VDI-3477-05', values: { nh3_vor_biofilter: 8 } }]); // 8 < 5 false → AND fails
  });
});

describe('VDI-3477-06 — Konstruktion / Bau / Inbetriebnahme', () => {
  it('CR-07  freie_flaeche > 20 AND loch_schlitzgroesse in [5,20] (§6.x: >20 % / 5-20 mm)', async () => {
    await proveBothWays('VDI-3477-06', 'VDI-3477-CR-07',
      [{ ws: 'VDI-3477-06', values: { freie_flaeche_anstroemboden: 25, loch_schlitzgroesse: 10 } }],
      [{ ws: 'VDI-3477-06', values: { loch_schlitzgroesse: 30 } }]); // 30 <= 20 false → AND-chain fails
  });
  it('CR-09  anfahrkonzept_vorhanden AND abnahme_dokumentiert == true', async () => {
    await proveBothWays('VDI-3477-06', 'VDI-3477-CR-09',
      [{ ws: 'VDI-3477-06', values: { anfahrkonzept_vorhanden: true, abnahme_dokumentiert: true } }],
      [{ ws: 'VDI-3477-06', values: { abnahme_dokumentiert: false } }]); // one false → AND fails
  });
});

describe('VDI-3477-07 — Betrieb / Instandhaltung', () => {
  it('CR-03  betriebstemperatur in [20,40] (§4.2: mesophiler Bereich 20-40 °C)', async () => {
    await proveBothWays('VDI-3477-07', 'VDI-3477-CR-03',
      [{ ws: 'VDI-3477-07', values: { betriebstemperatur: 30 } }],
      [{ ws: 'VDI-3477-07', values: { betriebstemperatur: 50 } }]); // 50 <= 40 false → fail
  });
  it('CR-08  feuchtegehalt_filterschicht in [40,60] (§6.2.2.2: zwischen 40 % und 60 %)', async () => {
    await proveBothWays('VDI-3477-07', 'VDI-3477-CR-08',
      [{ ws: 'VDI-3477-07', values: { feuchtegehalt_filterschicht: 50 } }],
      [{ ws: 'VDI-3477-07', values: { feuchtegehalt_filterschicht: 70 } }]);
  });
  it('CR-10  instandhaltungsnachweis == true', async () => {
    await proveBothWays('VDI-3477-07', 'VDI-3477-CR-10',
      [{ ws: 'VDI-3477-07', values: { instandhaltungsnachweis: true } }],
      [{ ws: 'VDI-3477-07', values: { instandhaltungsnachweis: false } }]);
  });
  it('CR-18  pH_filtermaterial IS NOT NULL (§6.5.4 Sonderfall H2S: bewusst saurer pH)', async () => {
    await proveBothWays('VDI-3477-07', 'VDI-3477-CR-18',
      [{ ws: 'VDI-3477-07', values: { pH_filtermaterial: 4.5 } }],
      [{ ws: 'VDI-3477-07', values: { pH_filtermaterial: null } }]);
  });
});

describe('VDI-3477-09 — Beschaffenheitsvereinbarung / Nachweis', () => {
  it('CR-12  reingaskonzentration_gewaehrleistet IS NOT NULL', async () => {
    await proveBothWays('VDI-3477-09', 'VDI-3477-CR-12',
      [{ ws: 'VDI-3477-09', values: { reingaskonzentration_gewaehrleistet: 300 } }],
      [{ ws: 'VDI-3477-09', values: { reingaskonzentration_gewaehrleistet: null } }]);
  });
  it('CR-14  nachweis_messung_vereinbart == true', async () => {
    await proveBothWays('VDI-3477-09', 'VDI-3477-CR-14',
      [{ ws: 'VDI-3477-09', values: { nachweis_messung_vereinbart: true } }],
      [{ ws: 'VDI-3477-09', values: { nachweis_messung_vereinbart: false } }]);
  });
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// (C') THE 3 TRUE NO-OP BLOCK GATES — demonstrated NEVER to block (no-op, reported not fixed)
// ────────────────────────────────────────────────────────────────────────────────────────────
describe('VDI-3477 — TRUE no-op block gates (CR-15/16/17) never enforce', () => {
  const noops: Array<{ ws: string; code: string }> = [
    { ws: 'VDI-3477-08', code: 'VDI-3477-CR-15' }, // Olfaktometrie nach DIN EN 13725
    { ws: 'VDI-3477-08', code: 'VDI-3477-CR-16' }, // Emissionsmessung nach VDI 3951 / TA Luft
    { ws: 'VDI-3477-04', code: 'VDI-3477-CR-17' }, // Befeuchter-/Waescherauslegung nach VDI 3679
  ];
  for (const { ws, code } of noops) {
    it(`${code} (condition 'TRUE') never appears in failingBlockConditions`, async () => {
      // No persisted state can make a literal-TRUE gate fail. Assert it does not block on the
      // (already heavily mutated) project state — the no-op. NOT fixed: TRUE→predicate = ruling.
      expect(await gateBlocks(ws, code)).toBe(false);
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────────────────────
// (B) EQUATION EVAL — real evaluator: 15 evaluable compute, 3 NR return manual_required
// ────────────────────────────────────────────────────────────────────────────────────────────
type EqCase = {
  code: string; formula: string; inputSymbols: string[]; outputSymbol: string;
  inputs: Record<string, number>; expect: number; note?: string;
};

function evalEq(c: EqCase) {
  return evaluateFormula({
    equationId: `VDI-3477-${c.code}-harness`, // synthetic id → no rewrite/aggregator/profile hooks
    formula: c.formula,
    inputSymbols: c.inputSymbols,
    outputSymbol: c.outputSymbol,
    inputs: Object.entries(c.inputs).map(([symbol, value]) => ({ symbol, value, unit: null })),
  });
}

describe('VDI-3477 — equations that COMPUTE through the real evaluator (15 evaluable)', () => {
  const cases: EqCase[] = [
    { code: 'Gl9',  formula: 'e = V_H / V_G', inputSymbols: ['V_H', 'V_G'], outputSymbol: 'e', inputs: { V_H: 0.6, V_G: 1 }, expect: 0.6 },
    { code: 'Gl10', formula: 'e_E = (V_H - V_W) / V_G', inputSymbols: ['V_H', 'V_W', 'V_G'], outputSymbol: 'e_E', inputs: { V_H: 0.6, V_W: 0.1, V_G: 1 }, expect: 0.5 },
    { code: 'Gl11', formula: 'w_P = V_dot / (A * e_E)', inputSymbols: ['V_dot', 'A', 'e_E'], outputSymbol: 'w_P', inputs: { V_dot: 1000, A: 100, e_E: 0.5 }, expect: 20 },
    { code: 'Gl13', formula: 'w = V_dot / A', inputSymbols: ['V_dot', 'A'], outputSymbol: 'w', inputs: { V_dot: 1000, A: 100 }, expect: 10 },
    { code: 'Gl7',  formula: 'V_dot_cont = w * A', inputSymbols: ['w', 'A'], outputSymbol: 'V_dot_cont', inputs: { w: 10, A: 100 }, expect: 1000 },
    { code: 'Gl8',  formula: 'vel_ratio = A_2 / A_1', inputSymbols: ['A_1', 'A_2'], outputSymbol: 'vel_ratio', inputs: { A_1: 1, A_2: 2 }, expect: 2 },
    // Gl.12 output_symbol is V_dot_pore (distinct from the V_dot input field); RHS Hagen-Poiseuille.
    { code: 'Gl12', formula: 'V_dot = (d_P^2 * dp) / (32 * nu * rho * l) * A_P', inputSymbols: ['d_P', 'dp', 'nu', 'rho', 'l', 'A_P'], outputSymbol: 'V_dot_pore', inputs: { d_P: 0.002, dp: 100, nu: 1.5e-5, rho: 1.2, l: 1, A_P: 50 }, expect: (0.002 ** 2 * 100) / (32 * 1.5e-5 * 1.2 * 1) * 50 },
    // Anhang A worked example — matches the printed numbers 8000 g/h and 133 m³.
    { code: 'A1',   formula: 'M_S = V_dot * c_A', inputSymbols: ['V_dot', 'c_A'], outputSymbol: 'M_S', inputs: { V_dot: 10000, c_A: 0.8 }, expect: 8000 },
    { code: 'A2',   formula: 'V_F = M_S / m_S', inputSymbols: ['M_S', 'm_S'], outputSymbol: 'V_F', inputs: { M_S: 8000, m_S: 60 }, expect: 8000 / 60 },
    { code: 'Gl4',  formula: 'U = p_D / p_DS', inputSymbols: ['p_D', 'p_DS'], outputSymbol: 'U', inputs: { p_D: 950, p_DS: 1000 }, expect: 0.95 },
    { code: 'Gl1',  formula: 'eta_G = (q_G_roh - q_G_rein) / q_G_roh', inputSymbols: ['q_G_roh', 'q_G_rein'], outputSymbol: 'eta_G', inputs: { q_G_roh: 100, q_G_rein: 10 }, expect: 0.9 },
    { code: 'Gl2',  formula: 'eta_G = (c_G_roh - c_G_rein) / c_G_roh', inputSymbols: ['c_G_roh', 'c_G_rein'], outputSymbol: 'eta_G_c', inputs: { c_G_roh: 100, c_G_rein: 10 }, expect: 0.9 },
    { code: 'Gl5',  formula: 'eta = (c_roh - c_rein) / c_roh', inputSymbols: ['c_roh', 'c_rein'], outputSymbol: 'eta', inputs: { c_roh: 100, c_rein: 10 }, expect: 0.9 },
    { code: 'B2',   formula: 'Z = (V_P_dot + V_N_dot) / V_P_dot', inputSymbols: ['V_P_dot', 'V_N_dot'], outputSymbol: 'Z', inputs: { V_P_dot: 1, V_N_dot: 3 }, expect: 4 },
    // Gl.B3: Z_50 = |c_G|, encoded as max(c_G, -c_G) — engine-supported, equals abs.
    { code: 'B3',   formula: 'Z_50 = max(c_G, -c_G)', inputSymbols: ['c_G'], outputSymbol: 'Z_50', inputs: { c_G: -5 }, expect: 5 },
  ];
  for (const c of cases) {
    it(`${c.code}  ${c.formula} → ${c.expect}`, () => {
      const st = evalEq(c);
      expect(st.kind, `${c.code} expected computed, got ${st.kind}: ${JSON.stringify(st)}`).toBe('computed');
      if (st.kind === 'computed') expect(st.value).toBeCloseTo(c.expect, 6);
    });
  }
});

describe('VDI-3477 — NR equations return manual_required (not computed) through the real evaluator', () => {
  it("Gl.6  p_e / p_0 <= 0,95 — comparison criterion, not a computable value", () => {
    const st = evalEq({ code: 'Gl6', formula: 'p_e / p_0 <= 0,95', inputSymbols: ['p_e', 'p_0'], outputSymbol: 'incompr_crit', inputs: { p_e: 90, p_0: 100 }, expect: NaN });
    expect(st.kind).toBe('manual_required');
  });
  it('Gl.B1  I = k_W * lg(c / c_0) — unsupported function lg()', () => {
    const st = evalEq({ code: 'B1', formula: 'I = k_W * lg(c / c_0)', inputSymbols: ['k_W', 'c', 'c_0'], outputSymbol: 'I', inputs: { k_W: 1, c: 100, c_0: 1 }, expect: NaN });
    expect(st.kind).toBe('manual_required');
  });
  it('Gl.B4  P_G = 10 * lg(Z) — unsupported function lg()', () => {
    const st = evalEq({ code: 'B4', formula: 'P_G = 10 * lg(Z)', inputSymbols: ['Z'], outputSymbol: 'P_G', inputs: { Z: 1000 }, expect: NaN });
    expect(st.kind).toBe('manual_required');
  });
});
