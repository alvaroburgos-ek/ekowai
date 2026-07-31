/**
 * FLL-GAR-23 (Randausbildungen / Edge terminations) — per-worksheet verification.
 *
 * FLL-GAR-23 is a pure calculation/data_collection worksheet: 0 equations, 0
 * compliance requirements, 3 fields:
 *   - freibord_zu_gelaende_cm   [number, cm]  §4.8:  >= 5  (frei gestalteter Übergang)
 *   - freibord_zu_bauwerk_cm    [number, cm]  §4.8:  >= 30 (or >= 15 with adapted fastening)
 *   - abschluss_anwendungsfall  [enum]        Tab.28: Bauteil/Bauwerk | Freifläche | Schwimmteich
 *
 * There is no engine chain and no gate to fire. The only "chain" is the REAL
 * saveWorksheet persistence of the 3 collected fields. This test bootstraps the
 * FULL-PROJECT FLL-GAR seeder against a disposable embedded Postgres, drives the
 * fields through the REAL saveWorksheet path, and asserts persistence to
 * project_parameters for a passing and a failing (below-minimum) state.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000f23';

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
  const w = fixture.worksheets['FLL-GAR-23'];
  if (!w) throw new Error('FLL-GAR-23 not in fixture');
  return w;
}

async function persisted(fieldId: string) {
  const [row] = await sql<
    { value_text: string | null; value_number: string | null; value_enum: string | null }[]
  >`SELECT value_text, value_number, value_enum FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row ?? null;
}

describe('FLL-GAR-23 (Randausbildungen) — real saveWorksheet persistence', () => {
  it('exposes the 3 collected fields', () => {
    const w = ws();
    expect(w.fields['freibord_zu_gelaende_cm']).toBeTruthy();
    expect(w.fields['freibord_zu_bauwerk_cm']).toBeTruthy();
    expect(w.fields['abschluss_anwendungsfall']).toBeTruthy();
  });

  it('PASS state: freibord 5cm/30cm, Bauteil/Bauwerk case persists', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['freibord_zu_gelaende_cm']]: { type: 'number', value: 5 },
        [w.fields['freibord_zu_bauwerk_cm']]: { type: 'number', value: 30 },
        [w.fields['abschluss_anwendungsfall']]: { type: 'enum', value: 'bauteil_bauwerk' },
      },
    });
    expect(res.ok).toBe(true);

    const gel = await persisted(w.fields['freibord_zu_gelaende_cm']);
    expect(Number(gel?.value_number)).toBe(5);
    const bau = await persisted(w.fields['freibord_zu_bauwerk_cm']);
    expect(Number(bau?.value_number)).toBe(30);
    const anw = await persisted(w.fields['abschluss_anwendungsfall']);
    expect(anw?.value_enum ?? anw?.value_text).toBe('bauteil_bauwerk');
  });

  it('FAIL/below-min state: freibord 3cm/10cm, Schwimmteich case still persists (no gate enforces)', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['freibord_zu_gelaende_cm']]: { type: 'number', value: 3 },
        [w.fields['freibord_zu_bauwerk_cm']]: { type: 'number', value: 10 },
        [w.fields['abschluss_anwendungsfall']]: { type: 'enum', value: 'schwimmteich' },
      },
    });
    // No compliance_requirement exists → save succeeds even below the §4.8 minima.
    expect(res.ok).toBe(true);

    const gel = await persisted(w.fields['freibord_zu_gelaende_cm']);
    expect(Number(gel?.value_number)).toBe(3);
    const bau = await persisted(w.fields['freibord_zu_bauwerk_cm']);
    expect(Number(bau?.value_number)).toBe(10);
    const anw = await persisted(w.fields['abschluss_anwendungsfall']);
    expect(anw?.value_enum ?? anw?.value_text).toBe('schwimmteich');
  });
});
