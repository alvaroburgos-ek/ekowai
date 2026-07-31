/**
 * FLL-GAR-20 (Alkalisilikate / Alkali Silicates) — per-worksheet verification.
 *
 * FLL-GAR-20 is a pure data_collection worksheet: 0 equations, 0 compliance
 * requirements, 2 fields:
 *   - alkalisilikat_type      [enum]   Na / Li / K  (Sec. 7.2)
 *   - feinkornanteil_063_pct  [number, Masse-%]  (soll mind. 20; Sec. 7.2.1.1)
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

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000f20';

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
  const w = fixture.worksheets['FLL-GAR-20'];
  if (!w) throw new Error('FLL-GAR-20 not in fixture');
  return w;
}

async function persisted(fieldId: string) {
  const [row] = await sql<
    { value_text: string | null; value_number: string | null; value_enum: string | null }[]
  >`SELECT value_text, value_number, value_enum FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row ?? null;
}

describe('FLL-GAR-20 (Alkalisilikate) — real saveWorksheet persistence', () => {
  it('exposes the 2 collected fields', () => {
    const w = ws();
    expect(w.fields['alkalisilikat_type']).toBeTruthy();
    expect(w.fields['feinkornanteil_063_pct']).toBeTruthy();
  });

  it('persists the plant-compatible potassium case (K, fines=20 Masse-%)', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['alkalisilikat_type']]: { type: 'enum', value: 'K' },
        [w.fields['feinkornanteil_063_pct']]: { type: 'number', value: 20 },
      },
    });
    expect(res.ok).toBe(true);

    const typ = await persisted(w.fields['alkalisilikat_type']);
    expect(typ?.value_enum ?? typ?.value_text).toBe('K');

    const fines = await persisted(w.fields['feinkornanteil_063_pct']);
    expect(Number(fines?.value_number)).toBe(20);
  });

  it('re-save with phytotoxic Na and a higher fines fraction overwrites', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['alkalisilikat_type']]: { type: 'enum', value: 'Na' },
        [w.fields['feinkornanteil_063_pct']]: { type: 'number', value: 35 },
      },
    });
    expect(res.ok).toBe(true);
    const typ = await persisted(w.fields['alkalisilikat_type']);
    expect(typ?.value_enum ?? typ?.value_text).toBe('Na');
    const fines = await persisted(w.fields['feinkornanteil_063_pct']);
    expect(Number(fines?.value_number)).toBe(35);
  });
});
