/**
 * FLL-GAR-26 (Abnahme und Mängelansprüche / Acceptance & defects-liability) —
 * per-worksheet verification.
 *
 * FLL-GAR-26 is a pure verification/data_collection worksheet: 0 equations,
 * 0 compliance requirements, 2 fields:
 *   - abnahme_datum          [date]     Formal acceptance date          (Sec. 11.1)
 *   - maengelfrist_5_jahre   [boolean]  5-year defects-liability applied (Sec. 11.2)
 *
 * There is no engine chain and no gate to fire. The only "chain" is the REAL
 * saveWorksheet persistence of the 2 collected fields. This test bootstraps the
 * FULL-PROJECT FLL-GAR seeder against a disposable embedded Postgres, drives the
 * fields through the REAL saveWorksheet path, and asserts persistence to
 * project_parameters (pass state + a re-save/toggle state).
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000f26';

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
  const w = fixture.worksheets['FLL-GAR-26'];
  if (!w) throw new Error('FLL-GAR-26 not in fixture');
  return w;
}

async function persisted(fieldId: string) {
  const [row] = await sql<
    {
      value_text: string | null;
      value_number: string | null;
      value_boolean: boolean | null;
      value_date: string | null;
    }[]
  >`SELECT value_text, value_number, value_boolean, to_char(value_date, 'YYYY-MM-DD') AS value_date FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row ?? null;
}

describe('FLL-GAR-26 (Abnahme/Mängelansprüche) — real saveWorksheet persistence', () => {
  it('exposes the 2 collected fields', () => {
    const w = ws();
    expect(w.fields['abnahme_datum']).toBeTruthy();
    expect(w.fields['maengelfrist_5_jahre']).toBeTruthy();
  });

  it('persists the compliant Bauwerk case (acceptance date + 5-year period applied)', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['abnahme_datum']]: { type: 'date', value: '2024-06-01' },
        [w.fields['maengelfrist_5_jahre']]: { type: 'boolean', value: true },
      },
    });
    expect(res.ok).toBe(true);

    const dt = await persisted(w.fields['abnahme_datum']);
    expect(dt?.value_date).toBe('2024-06-01');

    const frist = await persisted(w.fields['maengelfrist_5_jahre']);
    expect(frist?.value_boolean).toBe(true);
  });

  it('re-save toggling the 5-year flag false + new date overwrites (2-year-Sache case)', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['abnahme_datum']]: { type: 'date', value: '2025-03-15' },
        [w.fields['maengelfrist_5_jahre']]: { type: 'boolean', value: false },
      },
    });
    expect(res.ok).toBe(true);

    const dt = await persisted(w.fields['abnahme_datum']);
    expect(dt?.value_date).toBe('2025-03-15');

    const frist = await persisted(w.fields['maengelfrist_5_jahre']);
    expect(frist?.value_boolean).toBe(false);
  });
});
