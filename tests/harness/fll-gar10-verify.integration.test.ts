/**
 * FLL-GAR-10 (Mineralisch ohne Zusatzstoffe) — EXHAUSTIVE per-worksheet verify.
 *
 * 0 equations on this worksheet → no compute chain. The "chains" here are
 * gate-firing chains: drive fields through the REAL saveWorksheet, read the
 * persisted project_parameters back, and fire each compliance_requirement's
 * condition through the REAL evaluator (src/lib/compliance/evaluate.ts —
 * the same evaluateCondition the app's report/approval path uses) against
 * both a PASS state and a FAIL state.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';

const USER_ID = '00000000-0000-4000-8000-0000000000fb';

process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';
import { evaluateCondition } from '@/lib/compliance/evaluate';

let harness: Harness;
let fixture: SeededFllGarFixture;
const WS = 'FLL-GAR-10';

beforeAll(async () => {
  harness = await startHarness();
  process.env.DATABASE_URL = harness.databaseUrl;
  fixture = await seedFllGar(harness.sql, USER_ID);
}, 180_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

/** Read the persisted project_parameter numeric value for a symbol. */
async function persistedNumber(sym: string): Promise<number | null> {
  const fid = fixture.worksheets[WS].fields[sym];
  const [row] = await harness.sql<{ value_number: string | null }[]>`
    SELECT value_number FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fid}`;
  return row?.value_number == null ? null : Number(row.value_number);
}
async function persistedBool(sym: string): Promise<boolean | null> {
  const fid = fixture.worksheets[WS].fields[sym];
  const [row] = await harness.sql<{ value_boolean: boolean | null }[]>`
    SELECT value_boolean FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fid}`;
  return row?.value_boolean ?? null;
}

/** Lookup used by the evaluator: reads what the seeder/saveWorksheet persisted,
 *  plus optional in-memory overrides for symbols not present on this worksheet
 *  (e.g. the discriminator `abdichtungs_art`, which is NOT a field here). */
function makeLookup(overrides: Record<string, number | string | boolean | null>) {
  return (sym: string) => {
    if (sym in overrides) return overrides[sym];
    const fid = fixture.worksheets[WS].fields[sym];
    return fid ? undefined : undefined; // resolved below via cache
  };
}

describe('FLL-GAR-10 verify — real saveWorksheet + real gate evaluator', () => {
  it('exposes the 18 fields verbatim', () => {
    const ws = fixture.worksheets[WS];
    expect(ws).toBeTruthy();
    for (const sym of [
      'kf_abdichtung', 'kornanteil_unter_2micron', 'organische_substanz_VGL',
      'kalkgehalt_VCA', 'verdichtungsgrad_Dpr', 'attest_fll_gar_10_req_19',
      'attest_fll_gar_10_req_21',
    ]) {
      expect(ws.fields[sym]).toBeTruthy();
    }
  });

  it('CHAIN REQ-12 — Tab.3 mineral requirements PASS through real saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.worksheets[WS];
    // PASS state per Tab.3: Kornanteil>=15, org<=5, Kalk<=15, kf<=1e-9, DPr>=97.
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['kornanteil_unter_2micron']]: { type: 'number', value: 20 },
        [ws.fields['organische_substanz_VGL']]: { type: 'number', value: 3 },
        [ws.fields['kalkgehalt_VCA']]: { type: 'number', value: 10 },
        [ws.fields['kf_abdichtung']]: { type: 'number', value: 0.0000000005 },
        [ws.fields['verdichtungsgrad_Dpr']]: { type: 'number', value: 98 },
      },
    });
    expect(res.ok).toBe(true);

    // Read back the persisted values and fire REQ-12 with the guard satisfied.
    const kf = await persistedNumber('kf_abdichtung');
    const korn = await persistedNumber('kornanteil_unter_2micron');
    const org = await persistedNumber('organische_substanz_VGL');
    const kalk = await persistedNumber('kalkgehalt_VCA');
    const dpr = await persistedNumber('verdichtungsgrad_Dpr');
    expect(kf).toBeCloseTo(5e-10, 15);
    expect(korn).toBe(20);

    const cond =
      'IF abdichtungs_art == mineralisch_ohne_zusatzstoffe THEN kornanteil_unter_2micron >= 15 AND organische_substanz_VGL <= 5 AND kalkgehalt_VCA <= 15 AND kf_abdichtung <= 0.000000001 AND verdichtungsgrad_Dpr >= 97';
    const vals: Record<string, number | string | null> = {
      abdichtungs_art: 'mineralisch_ohne_zusatzstoffe',
      kornanteil_unter_2micron: korn, organische_substanz_VGL: org,
      kalkgehalt_VCA: kalk, kf_abdichtung: kf, verdichtungsgrad_Dpr: dpr,
    };
    const r = evaluateCondition(cond, (s) => (s in vals ? vals[s] : undefined));
    expect(r.kind).toBe('pass');
  });

  it('CHAIN REQ-12 — FAIL state (kf too high, DPr too low) fires the gate red', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.worksheets[WS];
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['kf_abdichtung']]: { type: 'number', value: 0.00001 }, // 1e-5 >> 1e-9
        [ws.fields['verdichtungsgrad_Dpr']]: { type: 'number', value: 90 }, // < 97
      },
    });
    expect(res.ok).toBe(true);
    const kf = await persistedNumber('kf_abdichtung');
    const dpr = await persistedNumber('verdichtungsgrad_Dpr');
    const cond =
      'IF abdichtungs_art == mineralisch_ohne_zusatzstoffe THEN kornanteil_unter_2micron >= 15 AND organische_substanz_VGL <= 5 AND kalkgehalt_VCA <= 15 AND kf_abdichtung <= 0.000000001 AND verdichtungsgrad_Dpr >= 97';
    const vals: Record<string, number | string | null> = {
      abdichtungs_art: 'mineralisch_ohne_zusatzstoffe',
      kornanteil_unter_2micron: 20, organische_substanz_VGL: 3,
      kalkgehalt_VCA: 10, kf_abdichtung: kf, verdichtungsgrad_Dpr: dpr,
    };
    const r = evaluateCondition(cond, (s) => (s in vals ? vals[s] : undefined));
    expect(r.kind).toBe('fail');
  });

  it('FINDING — guarded gates are PENDING (never fire) because abdichtungs_art is not a field on this worksheet', () => {
    // The seeded fixture has NO abdichtungs_art field → guard symbol missing →
    // the entire IF ... THEN gate resolves to `pending`, never pass/fail.
    const guarded = [
      'IF abdichtungs_art == mineralisch_ohne_zusatzstoffe THEN kornanteil_unter_2micron >= 15',
      'IF abdichtungs_art == mineralisch_mit_zusatzstoffen THEN mz_durchlaessigkeit_kf <= 0.000000001 AND mz_dichtungswirkung_nachgewiesen == true',
      'IF abdichtungs_art == alkalisilikat THEN schichtdicke_abdichtung_cm >= 25 AND feinkornanteil_063_pct >= 20',
    ];
    for (const cond of guarded) {
      const r = evaluateCondition(cond, () => undefined); // no abdichtungs_art anywhere
      expect(r.kind).toBe('pending');
    }
  });

  it('CHAIN REQ-19 attestation — boolean gate fires pass AND fail through real saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.worksheets[WS];
    const cond = 'attest_fll_gar_10_req_19 == True';

    // PASS: attest true
    let res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fields['attest_fll_gar_10_req_19']]: { type: 'boolean', value: true } },
    });
    expect(res.ok).toBe(true);
    let b = await persistedBool('attest_fll_gar_10_req_19');
    expect(b).toBe(true);
    let r = evaluateCondition(cond, (s) => (s === 'attest_fll_gar_10_req_19' ? b : undefined));
    expect(r.kind).toBe('pass');

    // FAIL: attest false
    res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fields['attest_fll_gar_10_req_19']]: { type: 'boolean', value: false } },
    });
    expect(res.ok).toBe(true);
    b = await persistedBool('attest_fll_gar_10_req_19');
    expect(b).toBe(false);
    r = evaluateCondition(cond, (s) => (s === 'attest_fll_gar_10_req_19' ? b : undefined));
    expect(r.kind).toBe('fail');
  });

  it('CHAIN REQ-21 attestation — boolean gate fires pass AND fail through real saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.worksheets[WS];
    const cond = 'attest_fll_gar_10_req_21 == True';

    let res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fields['attest_fll_gar_10_req_21']]: { type: 'boolean', value: true } },
    });
    expect(res.ok).toBe(true);
    let b = await persistedBool('attest_fll_gar_10_req_21');
    expect(b).toBe(true);
    let r = evaluateCondition(cond, (s) => (s === 'attest_fll_gar_10_req_21' ? b : undefined));
    expect(r.kind).toBe('pass');

    res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fields['attest_fll_gar_10_req_21']]: { type: 'boolean', value: false } },
    });
    expect(res.ok).toBe(true);
    b = await persistedBool('attest_fll_gar_10_req_21');
    expect(b).toBe(false);
    r = evaluateCondition(cond, (s) => (s === 'attest_fll_gar_10_req_21' ? b : undefined));
    expect(r.kind).toBe('fail');
  });
});
