/**
 * FLL-GAR-08 "Bauliche Erfordernisse" — real saveWorksheet persistence smoke.
 *
 * FLL-GAR-08 has ZERO equations and ZERO compliance_requirements: it is a pure
 * data-capture worksheet (7 basin-geometry / structural fields). There is no
 * computed chain and no gate to fire. The only exercisable "chain" is the
 * persistence round-trip: drive saveWorksheet with engineer-entered values for
 * every field and assert they land in project_parameters via the REAL save path.
 *
 * Boots a disposable embedded Postgres via the generic FLL-GAR seeder (all 29
 * worksheets), so GAR-08's instance + fields are present exactly as in prod.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f8';

// Bring up PG + point DATABASE_URL BEFORE @/lib/db loads (top-level await).
const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

import { describe, it, expect, afterAll } from 'vitest';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const fixture: SeededFllGarFixture = await seedFllGar(harness.sql, HARNESS_USER_ID);
const sql = harness.sql;

afterAll(async () => {
  await harness.stop();
});

describe('FLL-GAR-08 Bauliche Erfordernisse — real saveWorksheet persistence', () => {
  it('exposes the 7 capture fields', () => {
    const ws = fixture.worksheets['FLL-GAR-08'];
    expect(ws).toBeTruthy();
    for (const sym of [
      'beckenform', 'wassertiefe_max', 'wasserspiegelflaeche', 'beckenvolumen',
      'umfang_oberkante', 'ueberlauf_position', 'zugang_wartung',
    ]) {
      expect(ws.fields[sym]).toBeTruthy();
    }
  });

  it('persists engineer-entered values for all 7 fields through saveWorksheet', async () => {
    const ws = fixture.worksheets['FLL-GAR-08'];
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['beckenform']]: { type: 'text', value: 'rechteckig' },
        [ws.fields['wassertiefe_max']]: { type: 'number', value: 1.5 },
        [ws.fields['wasserspiegelflaeche']]: { type: 'number', value: 40 },
        [ws.fields['beckenvolumen']]: { type: 'number', value: 60 },
        [ws.fields['umfang_oberkante']]: { type: 'number', value: 26 },
        [ws.fields['ueberlauf_position']]: { type: 'text', value: 'Nordseite' },
        [ws.fields['zugang_wartung']]: { type: 'text', value: 'Treppe Ostseite' },
      },
    });
    expect(res.ok).toBe(true);

    const rows = await sql<{ field_id: string; value_number: string | null; value_text: string | null }[]>`
      SELECT field_id, value_number, value_text FROM project_parameters
      WHERE project_id = ${fixture.projectId}
        AND source_worksheet_instance_id = ${ws.instanceId}`;
    const byField = new Map(rows.map((r) => [r.field_id, r]));

    expect(Number(byField.get(ws.fields['wassertiefe_max'])!.value_number)).toBeCloseTo(1.5, 9);
    expect(Number(byField.get(ws.fields['wasserspiegelflaeche'])!.value_number)).toBeCloseTo(40, 9);
    expect(Number(byField.get(ws.fields['beckenvolumen'])!.value_number)).toBeCloseTo(60, 9);
    expect(Number(byField.get(ws.fields['umfang_oberkante'])!.value_number)).toBeCloseTo(26, 9);
    expect(byField.get(ws.fields['beckenform'])!.value_text).toBe('rechteckig');
    expect(byField.get(ws.fields['ueberlauf_position'])!.value_text).toBe('Nordseite');
    expect(byField.get(ws.fields['zugang_wartung'])!.value_text).toBe('Treppe Ostseite');
  });
});
