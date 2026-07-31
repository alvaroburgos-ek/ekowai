/**
 * VERIFY DRIVER — FLLTP-RHZ-07 (Düngemittel & Gießwasser-Eingangsprüfung).
 *
 * This worksheet has 0 equations and 0 compliance_requirements in prod, so there
 * is no computed chain and no gate to fire. What CAN be exercised is the REAL
 * saveWorksheet persistence path: seed the whole standard, then drive the 16
 * source-attested acceptance thresholds (§5.7 Düngemittel + §5.9 Tab.2 Gießwasser
 * of FLL-TP-Rhizomfestigkeit 2023) into FLLTP-RHZ-07 and assert every value round-
 * trips through the UPSERT to project_parameters. Confirms the input-inspection
 * sheet actually persists what an engineer enters (save-path sanity check).
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';
import { seedFllRhizom, type SeededRhizomFixture } from './seed-fll-rhizom';

const USER_ID = '00000000-0000-4000-8000-0000000000f3';

let harness: Harness;
let fx: SeededRhizomFixture;

beforeAll(async () => {
  harness = await startHarness();
  process.env.DATABASE_URL = harness.databaseUrl;
  process.env.BYPASS_AUTH = 'true';
  process.env.BYPASS_AUTH_USER_ID = USER_ID;
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
  process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
  fx = await seedFllRhizom(harness.sql, USER_ID);
}, 120_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

// PDF-attested acceptance thresholds (SR-1 verbatim §5.7 / §5.9 Tab.2). For the
// pH RANGE (6,0-9,0) we drive the midpoint 7.5 purely to prove persistence — NOT
// a source-picked value (SR-2 range is surfaced as a decisionItem in the detail).
const NUMS: Record<string, number> = {
  duenger_n_prozent: 15,
  duenger_p2o5_prozent: 10,
  duenger_k2o_prozent: 15,
  duenger_mgo_prozent: 2,
  wasser_ammonium_mg_l: 0.5,
  wasser_eisen_mg_l: 0.2,
  wasser_p_gesamt_mg_l: 0.03,
  wasser_haerte_mmol_l: 1.0,
  wasser_leitfaehigkeit_uS_cm: 1000.0,
  wasser_mangan_mg_l: 0.05,
  wasser_nitrat_mg_l: 50.0,
  wasser_ortho_phosphat_mg_l: 0.01,
  wasser_ph: 7.5,
  wasser_saurekapazitaet_mmol_l: 2.0,
};
const BOOLS: Record<string, boolean> = {
  duenger_spurelemente_vorhanden: true,
  duenger_chloridarm: true,
};

describe('FLLTP-RHZ-07 — real saveWorksheet persistence of input-inspection thresholds', () => {
  it('round-trips all 16 §5.7/§5.9 fields through project_parameters', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fx.byCode['FLLTP-RHZ-07'];
    expect(ws).toBeTruthy();

    const values: Record<string, { type: string; value: number | boolean }> = {};
    for (const [sym, v] of Object.entries(NUMS)) {
      values[ws.fieldIds[sym]] = { type: 'number', value: v };
    }
    for (const [sym, v] of Object.entries(BOOLS)) {
      values[ws.fieldIds[sym]] = { type: 'boolean', value: v };
    }

    const res = await saveWorksheet({ instanceId: ws.instanceId, values: values as never });
    expect(res.ok).toBe(true);

    const rows = await harness.sql<
      { field_id: string; value_number: string | null; value_boolean: boolean | null }[]
    >`SELECT field_id, value_number, value_boolean FROM project_parameters
      WHERE project_id = ${fx.projectId}
        AND field_id IN ${harness.sql(Object.keys(values))}`;
    const by = (id: string) => rows.find((r) => r.field_id === id);

    for (const [sym, v] of Object.entries(NUMS)) {
      const r = by(ws.fieldIds[sym]);
      expect(r, `missing row for ${sym}`).toBeTruthy();
      expect(Number(r!.value_number), `mismatch ${sym}`).toBeCloseTo(v, 6);
    }
    for (const [sym, v] of Object.entries(BOOLS)) {
      const r = by(ws.fieldIds[sym]);
      expect(r, `missing row for ${sym}`).toBeTruthy();
      expect(r!.value_boolean, `mismatch ${sym}`).toBe(v);
    }
  }, 60_000);
});
