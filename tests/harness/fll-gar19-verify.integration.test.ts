/**
 * FLL-GAR-19 (Stahl / Steel) — per-worksheet verification.
 *
 * FLL-GAR-19 is a pure data_collection worksheet: 0 equations, 0 compliance
 * requirements, 2 fields:
 *   - stahl_typ            [enum]   V2A / V4A / V5A / CorTen A / CorTen B / unlegiert
 *   - verzinkung_dicke_um  [number, micrometer]  (>= 100 for unalloyed steel)
 *
 * There is no engine chain and no gate to fire. The only "chain" is the REAL
 * saveWorksheet persistence of the 2 collected fields. This test bootstraps the
 * FULL-PROJECT FLL-GAR seeder against a disposable embedded Postgres, drives the
 * fields through the REAL saveWorksheet path, and asserts persistence to
 * project_parameters.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000f19';

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

const sql = harness.sql;

afterAll(async () => {
  await harness.stop();
});

function ws() {
  const w = fixture.worksheets['FLL-GAR-19'];
  if (!w) throw new Error('FLL-GAR-19 not in fixture');
  return w;
}

async function persisted(fieldId: string) {
  const [row] = await sql<
    { value_text: string | null; value_number: string | null; value_enum: string | null }[]
  >`SELECT value_text, value_number, value_enum FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row ?? null;
}

describe('FLL-GAR-19 (Stahl) — real saveWorksheet persistence', () => {
  it('exposes the 2 collected fields', () => {
    const w = ws();
    expect(w.fields['stahl_typ']).toBeTruthy();
    expect(w.fields['verzinkung_dicke_um']).toBeTruthy();
  });

  it('persists the unalloyed-steel case (stahl_typ=unlegiert, verzinkung=100 um)', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['stahl_typ']]: { type: 'enum', value: 'unlegiert' },
        [w.fields['verzinkung_dicke_um']]: { type: 'number', value: 100 },
      },
    });
    expect(res.ok).toBe(true);

    const typ = await persisted(w.fields['stahl_typ']);
    expect(typ?.value_enum ?? typ?.value_text).toBe('unlegiert');

    const dicke = await persisted(w.fields['verzinkung_dicke_um']);
    expect(Number(dicke?.value_number)).toBe(100);
  });

  it('re-save with V2A stainless (no galvanisation value) overwrites', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['stahl_typ']]: { type: 'enum', value: 'V2A' },
      },
    });
    expect(res.ok).toBe(true);
    const typ = await persisted(w.fields['stahl_typ']);
    expect(typ?.value_enum ?? typ?.value_text).toBe('V2A');
  });
});
