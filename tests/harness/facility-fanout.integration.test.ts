/**
 * MILESTONE-1 facility fan-out — real-save-path integration (embedded Postgres).
 *
 * Drives the REAL `saveWorksheet` against a disposable Postgres for each facility,
 * proving the volume materialize + A138-23 summary + REQ block-gate behave per the
 * source ruling. RED-first is proven at the unit layer (equation-profiles displayOnly
 * flips + facilityGoverningVolume); here we assert the GREEN end-state through the
 * real save path.
 *
 * Facilities covered here: flaeche(16) [REQ-31 Gl.13, no volume], rigole(18)
 * [V_R = b_R·h_R·L_R·s_R, Gl.20]. MRS(20) EXCLUDED.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';
import { equationProfiles } from '@/lib/eval/equation-profiles';
import {
  A138_18_V_R_EQUATIONS, A138_19_V_MR_EQUATIONS,
  A138_21_V_S_EQUATIONS, A138_22_V_B_EQUATIONS,
} from './seed-facilities';

/** Whether the real client would enqueue a volume write-back: true iff at least one
 *  volume-producing equation is NOT displayOnly (mirrors use-equation-engine
 *  write-back skip). The displayOnly flip is what stops the null clobber (RED→GREEN). */
const clientSends = (ids: readonly string[]) => ids.some((id) => !equationProfiles[id]?.displayOnly);
const clientSendsVR = () => clientSends(A138_18_V_R_EQUATIONS);
const clientSendsVMR = () => clientSends(A138_19_V_MR_EQUATIONS);
const clientSendsVS = () => clientSends(A138_21_V_S_EQUATIONS);
const clientSendsVB = () => clientSends(A138_22_V_B_EQUATIONS);

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000002';

let harness: Harness;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let seeds: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let saveWorksheet: any;

beforeAll(async () => {
  harness = await startHarness();
  process.env.DATABASE_URL = harness.databaseUrl;
  process.env.BYPASS_AUTH = 'true';
  process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
  process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

  const facil = await import('./seed-facilities');
  const base = await facil.seedFacilityBase(harness.sql, HARNESS_USER_ID);
  seeds = {
    flaecheFeasible: await facil.seedFlaeche(base, { feasible: true }),
    flaecheInfeasible: await facil.seedFlaeche(base, { feasible: false }),
    rigole: await facil.seedRigole(base),
    mre: await facil.seedMre(base),
    schacht: await facil.seedSchacht(base),
    becken: await facil.seedBecken(base),
  };
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
}, 120_000);

afterAll(async () => {
  await harness.stop();
});

const sql = () => harness.sql;
const summaryRow = async (projectId: string, fieldId: string) => {
  const [r] = await sql()<{ value_number: string | null; value_text: string | null; value_boolean: boolean | null; value_enum: string | null }[]>`
    SELECT value_number, value_text, value_boolean, value_enum FROM project_parameters
    WHERE project_id = ${projectId} AND field_id = ${fieldId}`;
  return r;
};

describe('Fläche (A138-16) — REQ-31 Gl.13 feasibility, no volume', () => {
  it('feasible k_i > r_D(n)·10⁻⁷ → footprint set, volume null, complete=true, not blocked', async () => {
    const f = seeds.flaecheFeasible;
    const res = await saveWorksheet({
      instanceId: f.facilityInstanceId,
      values: { [f.nudgeFieldId]: { type: 'number', value: f.nudgeValue } },
    });
    expect(res.ok).toBe(true);

    expect((await summaryRow(f.projectId, f.f_dimensioned))?.value_text).toBe('flaeche');
    // volumeSymbol is null for flaeche → volume stays null; footprint (a138_A_s_dim) suffices.
    expect((await summaryRow(f.projectId, f.f_volume))?.value_number).toBeNull();
    expect(Number((await summaryRow(f.projectId, f.f_footprint))?.value_number)).toBe(200);
    expect((await summaryRow(f.projectId, f.f_complete))?.value_boolean).toBe(true);
    // feasible + meetsQsac + no t_E → PASS (no REQ-31 block, no manual-check downgrade).
    expect((await summaryRow(f.projectId, f.f_recommended))?.value_enum).toBe('PASS');
    expect((await summaryRow(f.projectId, f.f_reasons))?.value_text ?? '').not.toContain('nicht machbar');
  });

  it('infeasible k_i ≤ r_D(n)·10⁻⁷ → REQ-31 blocks → FAIL, reason cites Gl.13', async () => {
    const f = seeds.flaecheInfeasible;
    const res = await saveWorksheet({
      instanceId: f.facilityInstanceId,
      values: { [f.nudgeFieldId]: { type: 'number', value: f.nudgeValue } },
    });
    expect(res.ok).toBe(true);

    expect((await summaryRow(f.projectId, f.f_recommended))?.value_enum).toBe('FAIL');
    const reasons = (await summaryRow(f.projectId, f.f_reasons))?.value_text ?? '';
    expect(reasons).toContain('REQ-31');
    expect(reasons).toContain('Gl.13');
  });
});

describe('Rigole (A138-18) — V_R = b_R·h_R·L_R·s_R (Gl.20)', () => {
  it('saving the rigole geometry materializes V_R (derived) → summary volume set, complete=true', async () => {
    const r = seeds.rigole;
    // SAVE 1 — geometry nudge: producer 'asm' fires → step-6b materializes V_R.
    const res = await saveWorksheet({
      instanceId: r.facilityInstanceId,
      values: { [r.nudgeFieldId]: { type: 'number', value: r.nudgeValue } },
    });
    expect(res.ok).toBe(true);

    // SAVE 2 — debounced autosave flushing Gl.19's V_R write-back. On CURRENT code
    // (Gl.19 displayOnly) the client sends nothing; if the displayOnly flip is
    // reverted the client sends V_R=null → clobbers step-6b (RED). Driven by the
    // REAL equation-profiles so reverting the fix flips this through the save path.
    const save2: Record<string, { type: 'number'; value: number | null }> = {};
    if (clientSendsVR()) save2[r.volumeFieldId] = { type: 'number', value: null };
    const res2 = await saveWorksheet({ instanceId: r.facilityInstanceId, values: save2 });
    expect(res2.ok).toBe(true);

    // V_R persisted onto A138-18 as a DERIVED row (not clobbered by the client null).
    const [vr] = await sql()<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters
      WHERE project_id = ${r.projectId} AND field_id = ${r.volumeFieldId}`;
    expect(vr?.source_type).toBe('derived');
    expect(Number(vr?.value_number)).toBeCloseTo(r.expectedVR, 9); // 3.5

    // A138-23 summary consumed V_R.
    expect((await summaryRow(r.projectId, r.f_dimensioned))?.value_text).toBe('rigole');
    expect(Number((await summaryRow(r.projectId, r.f_volume))?.value_number)).toBeCloseTo(r.expectedVR, 9);
    expect((await summaryRow(r.projectId, r.f_complete))?.value_boolean).toBe(true);
  });
});

describe('MRE (A138-19) — V_MR = persisted V_M + V_R (Gl.26)', () => {
  it('saving A138-19 materializes V_MR from the persisted component volumes → summary set', async () => {
    const m = seeds.mre;
    const res = await saveWorksheet({
      instanceId: m.facilityInstanceId,
      values: { [m.nudgeFieldId]: { type: 'number', value: m.nudgeValue } },
    });
    expect(res.ok).toBe(true);
    const s2: Record<string, { type: 'number'; value: number | null }> = {};
    if (clientSendsVMR()) s2[m.volumeFieldId] = { type: 'number', value: null };
    expect((await saveWorksheet({ instanceId: m.facilityInstanceId, values: s2 })).ok).toBe(true);

    const [vmr] = await sql()<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters
      WHERE project_id = ${m.projectId} AND field_id = ${m.volumeFieldId}`;
    expect(vmr?.source_type).toBe('derived');
    expect(Number(vmr?.value_number)).toBeCloseTo(m.expectedVMR, 9); // 16.0

    expect((await summaryRow(m.projectId, m.f_dimensioned))?.value_text).toBe('mre');
    expect(Number((await summaryRow(m.projectId, m.f_volume))?.value_number)).toBeCloseTo(m.expectedVMR, 9);
    expect((await summaryRow(m.projectId, m.f_complete))?.value_boolean).toBe(true);
  });
});

describe('Schacht (A138-21) — V_S = π·d_i²/4·h_S (Gl.36; h_S swept Gl.37)', () => {
  it('saving A138-21 sweeps the governing h_S and materializes V_S → summary set', async () => {
    const s = seeds.schacht;
    const res = await saveWorksheet({
      instanceId: s.facilityInstanceId,
      values: { [s.nudgeFieldId]: { type: 'number', value: s.nudgeValue } },
    });
    expect(res.ok).toBe(true);
    const s2: Record<string, { type: 'number'; value: number | null }> = {};
    if (clientSendsVS()) s2[s.volumeFieldId] = { type: 'number', value: null };
    expect((await saveWorksheet({ instanceId: s.facilityInstanceId, values: s2 })).ok).toBe(true);

    const [vs] = await sql()<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters
      WHERE project_id = ${s.projectId} AND field_id = ${s.volumeFieldId}`;
    expect(vs?.source_type).toBe('derived');
    expect(Number(vs?.value_number)).toBeCloseTo(s.expectedVS, 6);

    expect((await summaryRow(s.projectId, s.f_dimensioned))?.value_text).toBe('schacht');
    expect(Number((await summaryRow(s.projectId, s.f_volume))?.value_number)).toBeCloseTo(s.expectedVS, 6);
    // footprint maps to A_S_Schacht (=5) → present → complete=true.
    expect(Number((await summaryRow(s.projectId, s.f_footprint))?.value_number)).toBe(5);
    expect((await summaryRow(s.projectId, s.f_complete))?.value_boolean).toBe(true);
  });
});

describe('Becken (A138-22) — V_B via Gl.41 governing sweep', () => {
  it('saving A138-22 sweeps Gl.41 and materializes V_B → summary set', async () => {
    const b = seeds.becken;
    const res = await saveWorksheet({
      instanceId: b.facilityInstanceId,
      values: { [b.nudgeFieldId]: { type: 'number', value: b.nudgeValue } },
    });
    expect(res.ok).toBe(true);
    const s2: Record<string, { type: 'number'; value: number | null }> = {};
    if (clientSendsVB()) s2[b.volumeFieldId] = { type: 'number', value: null };
    expect((await saveWorksheet({ instanceId: b.facilityInstanceId, values: s2 })).ok).toBe(true);

    const [vb] = await sql()<{ value_number: string | null; source_type: string }[]>`
      SELECT value_number, source_type FROM project_parameters
      WHERE project_id = ${b.projectId} AND field_id = ${b.volumeFieldId}`;
    expect(vb?.source_type).toBe('derived');
    expect(Number(vb?.value_number)).toBeCloseTo(b.expectedVB, 6);

    expect((await summaryRow(b.projectId, b.f_dimensioned))?.value_text).toBe('becken');
    expect(Number((await summaryRow(b.projectId, b.f_volume))?.value_number)).toBeCloseTo(b.expectedVB, 6);
    expect((await summaryRow(b.projectId, b.f_complete))?.value_boolean).toBe(true);
  });
});
