/**
 * FLL-GAR-11 (Mineralisch mit Zusatzstoffen) — EXHAUSTIVE per-worksheet verify.
 *
 * Prod topology: 6 fields, 0 equations, 0 compliance_requirements.
 * → No compute chain, no encoded gate. The chains here drive every field through
 *   the REAL saveWorksheet path, read the persisted project_parameters back, and
 *   (for the boolean sealing-proof field) fire a SR-1-source-attested candidate
 *   gate condition through the REAL evaluator (src/lib/compliance/evaluate.ts)
 *   in both PASS and FAIL states — demonstrating the Tab.3/Tab.5 requirements are
 *   evaluable but NOT currently encoded as compliance_requirements (a FINDING).
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
const WS = 'FLL-GAR-11';

beforeAll(async () => {
  harness = await startHarness();
  process.env.DATABASE_URL = harness.databaseUrl;
  fixture = await seedFllGar(harness.sql, USER_ID);
}, 180_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

async function persistedNumber(sym: string): Promise<number | null> {
  const fid = fixture.worksheets[WS].fields[sym];
  const [row] = await harness.sql<{ value_number: string | null }[]>`
    SELECT value_number FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fid}`;
  return row?.value_number == null ? null : Number(row.value_number);
}
async function persistedText(sym: string): Promise<string | null> {
  const fid = fixture.worksheets[WS].fields[sym];
  const [row] = await harness.sql<{ value_text: string | null }[]>`
    SELECT value_text FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fid}`;
  return row?.value_text ?? null;
}
async function persistedBool(sym: string): Promise<boolean | null> {
  const fid = fixture.worksheets[WS].fields[sym];
  const [row] = await harness.sql<{ value_boolean: boolean | null }[]>`
    SELECT value_boolean FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fid}`;
  return row?.value_boolean ?? null;
}

describe('FLL-GAR-11 verify — real saveWorksheet + real gate evaluator', () => {
  it('exposes the 6 fields verbatim', () => {
    const ws = fixture.worksheets[WS];
    expect(ws).toBeTruthy();
    for (const sym of [
      'mz_zusatzstofftyp', 'mz_zusatzstoff_anteil', 'mz_dicke',
      'mz_durchlaessigkeit_kf', 'mz_einbau_verdichtung',
      'mz_dichtungswirkung_nachgewiesen',
    ]) {
      expect(ws.fields[sym]).toBeTruthy();
    }
  });

  it('CHAIN data-entry — all 6 fields persist through real saveWorksheet (Tab.5 PASS state)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.worksheets[WS];
    // Source-attested PASS state:
    //  - mz_dicke = 30 cm      (Tab.5: Abdichtungsschicht >= 30 cm)
    //  - mz_durchlaessigkeit_kf = 1e-9 m/s (Tab.3 Z.5 gleichwertig, <= 1*10-9)
    //  - mz_einbau_verdichtung = 'Baumischverfahren' (§5.2.2.1)
    //  - mz_dichtungswirkung_nachgewiesen = true (§5.2.3.3 Kontrollprüfung)
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['mz_zusatzstofftyp']]: { type: 'text', value: 'Natriumbentonit' },
        [ws.fields['mz_zusatzstoff_anteil']]: { type: 'number', value: 8 },
        [ws.fields['mz_dicke']]: { type: 'number', value: 30 },
        [ws.fields['mz_durchlaessigkeit_kf']]: { type: 'number', value: 0.000000001 },
        [ws.fields['mz_einbau_verdichtung']]: { type: 'text', value: 'Baumischverfahren' },
        [ws.fields['mz_dichtungswirkung_nachgewiesen']]: { type: 'boolean', value: true },
      },
    });
    expect(res.ok).toBe(true);

    expect(await persistedText('mz_zusatzstofftyp')).toBe('Natriumbentonit');
    expect(await persistedNumber('mz_zusatzstoff_anteil')).toBe(8);
    expect(await persistedNumber('mz_dicke')).toBe(30);
    expect(await persistedNumber('mz_durchlaessigkeit_kf')).toBeCloseTo(1e-9, 15);
    expect(await persistedText('mz_einbau_verdichtung')).toBe('Baumischverfahren');
    expect(await persistedBool('mz_dichtungswirkung_nachgewiesen')).toBe(true);
  });

  it('CANDIDATE GATE (not encoded in prod) — Tab.3/Tab.5 condition fires PASS then FAIL through real evaluator + real saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.worksheets[WS];
    // Candidate gate mirroring the guard used by FLL-GAR-10's test comment:
    //   IF abdichtungs_art == mineralisch_mit_zusatzstoffen
    //   THEN mz_durchlaessigkeit_kf <= 0.000000001 AND mz_dichtungswirkung_nachgewiesen == true
    // NB: abdichtungs_art is NOT a field on this worksheet → in prod this guard
    // would resolve `pending`. Here we inject it to EXERCISE the THEN clause.
    const cond =
      'IF abdichtungs_art == mineralisch_mit_zusatzstoffen THEN mz_durchlaessigkeit_kf <= 0.000000001 AND mz_dichtungswirkung_nachgewiesen == true';

    // PASS state
    let res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['mz_durchlaessigkeit_kf']]: { type: 'number', value: 0.000000001 },
        [ws.fields['mz_dichtungswirkung_nachgewiesen']]: { type: 'boolean', value: true },
      },
    });
    expect(res.ok).toBe(true);
    let kf = await persistedNumber('mz_durchlaessigkeit_kf');
    let proven = await persistedBool('mz_dichtungswirkung_nachgewiesen');
    let vals: Record<string, number | string | boolean | null> = {
      abdichtungs_art: 'mineralisch_mit_zusatzstoffen',
      mz_durchlaessigkeit_kf: kf,
      mz_dichtungswirkung_nachgewiesen: proven,
    };
    let r = evaluateCondition(cond, (s) => (s in vals ? vals[s] : undefined));
    expect(r.kind).toBe('pass');

    // FAIL state: kf too high AND sealing not proven
    res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['mz_durchlaessigkeit_kf']]: { type: 'number', value: 0.00001 }, // 1e-5 >> 1e-9
        [ws.fields['mz_dichtungswirkung_nachgewiesen']]: { type: 'boolean', value: false },
      },
    });
    expect(res.ok).toBe(true);
    kf = await persistedNumber('mz_durchlaessigkeit_kf');
    proven = await persistedBool('mz_dichtungswirkung_nachgewiesen');
    vals = {
      abdichtungs_art: 'mineralisch_mit_zusatzstoffen',
      mz_durchlaessigkeit_kf: kf,
      mz_dichtungswirkung_nachgewiesen: proven,
    };
    r = evaluateCondition(cond, (s) => (s in vals ? vals[s] : undefined));
    expect(r.kind).toBe('fail');
  });

  it('FINDING — the candidate guard would be PENDING in prod (abdichtungs_art not a field here)', () => {
    const cond =
      'IF abdichtungs_art == mineralisch_mit_zusatzstoffen THEN mz_durchlaessigkeit_kf <= 0.000000001 AND mz_dichtungswirkung_nachgewiesen == true';
    const r = evaluateCondition(cond, () => undefined);
    expect(r.kind).toBe('pending');
  });
});
