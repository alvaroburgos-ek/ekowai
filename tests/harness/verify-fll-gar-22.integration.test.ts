/**
 * FLL-GAR-22 (Schutzlagen und Schutzschichten) — per-worksheet verification.
 *
 * Drives the two COMPUTABLE Anhang-2 chains through the REAL saveWorksheet path
 * against a disposable embedded Postgres seeded by the GENERIC full-project
 * FLL-GAR seeder, plus proves Gl.2b is trig-blocked (cos(beta) unsupported by the
 * arithmetic engine) and fires the REQ-25 attestation gate in pass + fail states
 * via the production compliance evaluator.
 *
 * Chains:
 *   2c  Delta_u = (Delta_h_W + z_a) * gamma_w              (computable)
 *   2a  g_prime = gamma_D_prime * d_D                      (computable)
 *   2b  g_prime >= (Delta_u*gamma_A - (...)) / cos(beta)   (trig-blocked residue)
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000f22';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: SeededFllGarFixture = await seedFllGar(harness.sql, HARNESS_USER_ID);

import { describe, it, expect, afterAll } from 'vitest';
import { evaluateFormula } from '@/lib/eval/formula';
import { evaluateCondition } from '@/lib/compliance/evaluate';

const sql = harness.sql;

// verbatim prod equation ids for FLL-GAR-22
const EQ_2A = '430d62b2-a4b5-4bfb-afd2-bc7f8bd03d6f';
const EQ_2B = 'c7dc584b-0f65-476d-935a-d5306d885a65';
const EQ_2C = '38e580ef-1f6a-4ab2-b7e6-9154efbce529';

afterAll(async () => {
  await harness.stop();
});

function ws() {
  const w = fixture.worksheets['FLL-GAR-22'];
  if (!w) throw new Error('FLL-GAR-22 not in fixture');
  return w;
}

async function persistedNum(fieldId: string): Promise<number | null> {
  const [row] = await sql<{ value_number: string | null }[]>`
    SELECT value_number FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row?.value_number == null ? null : Number(row.value_number);
}

describe('FLL-GAR-22 — Anhang-2 chains + REQ-25 gate (real save path)', () => {
  it('exposes the Anhang-2 fields', () => {
    const w = ws();
    for (const s of ['g_prime', 'Delta_u', 'd_D', 'gamma_D_prime', 'Delta_h_W', 'z_a', 'gamma_w', 'beta', 'attest_fll_gar_22_req_25']) {
      expect(w.fields[s]).toBeTruthy();
    }
  });

  // ── Chain 2c: Delta_u = (Delta_h_W + z_a) * gamma_w ─────────────────────────
  it('2c — engine computes Delta_u then it persists through real saveWorksheet', async () => {
    const w = ws();
    // sanity-check inputs (no PDF worked example for Anhang 2; VC): dhw=0.5 m, za=0.3 m, gamma_w=10 kN/m³
    const state = evaluateFormula({
      equationId: EQ_2C,
      formula: 'Delta_u = (Delta_h_W + z_a) * gamma_w',
      inputSymbols: ['Delta_h_W', 'z_a', 'gamma_w'],
      outputSymbol: 'Delta_u',
      inputs: [
        { symbol: 'Delta_h_W', value: 0.5, unit: 'm' },
        { symbol: 'z_a', value: 0.3, unit: 'm' },
        { symbol: 'gamma_w', value: 10, unit: 'kN/m^3' },
      ],
    });
    expect(state.kind).toBe('computed');
    const du = state.kind === 'computed' ? state.value : NaN;
    expect(du).toBeCloseTo(8.0, 9); // (0.5+0.3)*10

    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['Delta_h_W']]: { type: 'number', value: 0.5 },
        [w.fields['z_a']]: { type: 'number', value: 0.3 },
        [w.fields['gamma_w']]: { type: 'number', value: 10 },
        [w.fields['Delta_u']]: { type: 'number', value: du },
      },
    });
    expect(res.ok).toBe(true);
    expect(await persistedNum(w.fields['Delta_u'])).toBeCloseTo(8.0, 6);
  });

  // ── Chain 2a: g_prime = gamma_D_prime * d_D ─────────────────────────────────
  it('2a — engine computes g_prime then it persists through real saveWorksheet', async () => {
    const w = ws();
    // gamma_D_prime=11 kN/m³ (typ. Auftriebswichte), d_D=0.30 m → g'=3.3 kN/m² (VC, no worked ex.)
    const state = evaluateFormula({
      equationId: EQ_2A,
      formula: 'g_prime = gamma_D_prime * d_D',
      inputSymbols: ['gamma_D_prime', 'd_D'],
      outputSymbol: 'g_prime',
      inputs: [
        { symbol: 'gamma_D_prime', value: 11, unit: 'kN/m^3' },
        { symbol: 'd_D', value: 0.3, unit: 'm' },
      ],
    });
    expect(state.kind).toBe('computed');
    const g = state.kind === 'computed' ? state.value : NaN;
    expect(g).toBeCloseTo(3.3, 9);

    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['gamma_D_prime']]: { type: 'number', value: 11 },
        [w.fields['d_D']]: { type: 'number', value: 0.3 },
        [w.fields['g_prime']]: { type: 'number', value: g },
      },
    });
    expect(res.ok).toBe(true);
    expect(await persistedNum(w.fields['g_prime'])).toBeCloseTo(3.3, 6);
  });

  // ── 2b: trig-blocked residue (cos(beta) unsupported) ────────────────────────
  it('2b — evaluateFormula does NOT compute (cos(beta) unsupported → residue, not a fix)', () => {
    const state = evaluateFormula({
      equationId: EQ_2B,
      formula: 'g_prime >= (Delta_u * gamma_A - (gamma_F_prime * d_F + gamma_Di_prime * d_Di)) / cos(beta)',
      inputSymbols: ['Delta_u', 'gamma_A', 'gamma_F_prime', 'd_F', 'gamma_Di_prime', 'd_Di', 'beta'],
      outputSymbol: 'g_prime',
      inputs: [
        { symbol: 'Delta_u', value: 8.0, unit: 'kN/m^2' },
        { symbol: 'gamma_A', value: 1.0, unit: '-' },
        { symbol: 'gamma_F_prime', value: 6, unit: 'kN/m^3' },
        { symbol: 'd_F', value: 0.01, unit: 'm' },
        { symbol: 'gamma_Di_prime', value: 8, unit: 'kN/m^3' },
        { symbol: 'd_Di', value: 0.05, unit: 'm' },
        { symbol: 'beta', value: 20, unit: '°' },
      ],
    });
    // The arithmetic engine supports only min/max — cos() cannot resolve, and 2b
    // is an inequality (not a producer). Either way it must NOT return 'computed'.
    expect(state.kind).not.toBe('computed');
  });

  // ── REQ-25 gate (block): attest_fll_gar_22_req_25 == True ────────────────────
  it('REQ-25 gate fires: pass when attest==true, fail when attest==false', () => {
    const cond = 'attest_fll_gar_22_req_25 == True';
    const passState = evaluateCondition(cond, (s) => (s === 'attest_fll_gar_22_req_25' ? true : undefined));
    const failState = evaluateCondition(cond, (s) => (s === 'attest_fll_gar_22_req_25' ? false : undefined));
    expect(passState.kind).toBe('pass');
    expect(failState.kind).toBe('fail');
  });

  // ── REQ-23 references fields NOT on this worksheet → pending/dead ─────────────
  it('REQ-23 condition references fields absent from this worksheet (dead/pending)', () => {
    const w = ws();
    // The two symbols in REQ-23 are not among this worksheet's field symbols.
    expect(w.fields['freibord_zu_gelaende_cm']).toBeFalsy();
    expect(w.fields['freibord_zu_bauwerk_cm']).toBeFalsy();
    const state = evaluateCondition('freibord_zu_gelaende_cm >= 5 AND freibord_zu_bauwerk_cm >= 30', () => undefined);
    // With no values, a parseable numeric comparison resolves pending (never fires).
    expect(['pending', 'manual']).toContain(state.kind);
  });

  // ── REQ-24 prose condition → manual (non-enforcing) ──────────────────────────
  it('REQ-24 prose condition is non-machine-evaluable (manual)', () => {
    const state = evaluateCondition('Engineer-judged adequacy of protective layers', () => undefined);
    expect(state.kind).toBe('manual');
  });

  // ── REQ-11 prose condition → manual (non-enforcing) ──────────────────────────
  it('REQ-11 prose condition is non-machine-evaluable (manual)', () => {
    const state = evaluateCondition('If required and abdichtung not inherently resistant: separate Wurzelschutzbahn', () => undefined);
    expect(state.kind).toBe('manual');
  });
});
