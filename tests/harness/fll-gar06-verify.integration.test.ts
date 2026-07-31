/**
 * FLL-GAR-06 (Baugrund und Untergrund) — per-worksheet verification.
 *
 * FLL-GAR-06 is a pure data_collection worksheet: 0 equations, 0 compliance
 * requirements, 3 fields (baugrund_typ [text], baugrund_tragfaehig [boolean],
 * setzungen_zu_erwarten [boolean]). There is no engine chain and no gate to fire.
 *
 * The only "chain" is the REAL saveWorksheet persistence of the 3 collected
 * fields. This test bootstraps the FULL-PROJECT FLL-GAR seeder (seed-fll-gar.ts)
 * against a disposable embedded Postgres, drives the 3 fields through the REAL
 * saveWorksheet path, and asserts every value persists to project_parameters.
 *
 * The bootstrap MUST run before @/lib/db loads, so DATABASE_URL / BYPASS_AUTH are
 * set at module top level (mirrors _harness-env-fll.ts but swaps seedFllGar27 for
 * the generic full-project seedFllGar).
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f6';

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
  const w = fixture.worksheets['FLL-GAR-06'];
  if (!w) throw new Error('FLL-GAR-06 not in fixture');
  return w;
}

async function persisted(fieldId: string) {
  const [row] = await sql<
    { value_text: string | null; value_boolean: boolean | null; source_type: string }[]
  >`SELECT value_text, value_boolean, source_type FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row ?? null;
}

describe('FLL-GAR-06 (Baugrund und Untergrund) — real saveWorksheet persistence', () => {
  it('exposes the 3 collected fields', () => {
    const w = ws();
    expect(w.fields['baugrund_typ']).toBeTruthy();
    expect(w.fields['baugrund_tragfaehig']).toBeTruthy();
    expect(w.fields['setzungen_zu_erwarten']).toBeTruthy();
  });

  it('drives the data-collection fields through the REAL saveWorksheet and persists them', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['baugrund_typ']]: { type: 'text', value: 'Kies-Sand' },
        [w.fields['baugrund_tragfaehig']]: { type: 'boolean', value: true },
        [w.fields['setzungen_zu_erwarten']]: { type: 'boolean', value: true },
      },
    });
    expect(res.ok).toBe(true);

    const typ = await persisted(w.fields['baugrund_typ']);
    expect(typ?.value_text).toBe('Kies-Sand');

    const trag = await persisted(w.fields['baugrund_tragfaehig']);
    expect(trag?.value_boolean).toBe(true);

    const setz = await persisted(w.fields['setzungen_zu_erwarten']);
    expect(setz?.value_boolean).toBe(true);
  });

  it('re-save with opposite booleans overwrites (no post-approval lock on data-collection)', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['baugrund_tragfaehig']]: { type: 'boolean', value: false },
        [w.fields['setzungen_zu_erwarten']]: { type: 'boolean', value: false },
      },
    });
    expect(res.ok).toBe(true);
    expect((await persisted(w.fields['baugrund_tragfaehig']))?.value_boolean).toBe(false);
    expect((await persisted(w.fields['setzungen_zu_erwarten']))?.value_boolean).toBe(false);
  });
});
