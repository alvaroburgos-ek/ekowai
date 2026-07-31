/**
 * FLL-GAR-24 (Bepflanzung und Einbauten / Planting and Installations) —
 * per-worksheet verification.
 *
 * FLL-GAR-24 is a pure data_collection worksheet: 0 equations, 0 compliance
 * requirements, 5 fields (verified against the rendered PDF §10 + §7.2):
 *   - mit_bepflanzung                    [boolean, required]  §7.2 / §10
 *   - bep_pflanzenarten                  [text]               §12/§10
 *   - bep_rhizomfestigkeit_erforderlich  [boolean]            §12/§10.4
 *   - bep_einbauten_typen                [text]               §12/§10.5
 *   - bep_durchdringungen_anzahl         [number, unit "1"]   §12/§4.9
 *
 * There is no engine chain and no gate to fire. The only "chain" is the REAL
 * saveWorksheet persistence of the 5 collected fields. This test bootstraps the
 * FULL-PROJECT FLL-GAR seeder against a disposable embedded Postgres, drives the
 * fields through the REAL saveWorksheet path, and asserts persistence to
 * project_parameters — in both the planted (rhizome-resistance-required) and the
 * unplanted state.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000f24';

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
  const w = fixture.worksheets['FLL-GAR-24'];
  if (!w) throw new Error('FLL-GAR-24 not in fixture');
  return w;
}

async function persisted(fieldId: string) {
  const [row] = await sql<
    {
      value_text: string | null;
      value_number: string | null;
      value_boolean: boolean | null;
      value_enum: string | null;
    }[]
  >`SELECT value_text, value_number, value_boolean, value_enum FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row ?? null;
}

describe('FLL-GAR-24 (Bepflanzung und Einbauten) — real saveWorksheet persistence', () => {
  it('exposes the 5 collected fields', () => {
    const w = ws();
    for (const sym of [
      'mit_bepflanzung',
      'bep_pflanzenarten',
      'bep_rhizomfestigkeit_erforderlich',
      'bep_einbauten_typen',
      'bep_durchdringungen_anzahl',
    ]) {
      expect(w.fields[sym]).toBeTruthy();
    }
  });

  it('persists the planted case (Phragmites/Typha → rhizome resistance required)', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['mit_bepflanzung']]: { type: 'boolean', value: true },
        [w.fields['bep_pflanzenarten']]: {
          type: 'text',
          value: 'Phragmites australis; Typha spp.',
        },
        [w.fields['bep_rhizomfestigkeit_erforderlich']]: { type: 'boolean', value: true },
        [w.fields['bep_einbauten_typen']]: {
          type: 'text',
          value: 'Steg-Fundamente; Pflanztroege',
        },
        [w.fields['bep_durchdringungen_anzahl']]: { type: 'number', value: 3 },
      },
    });
    expect(res.ok).toBe(true);

    expect((await persisted(w.fields['mit_bepflanzung']))?.value_boolean).toBe(true);
    expect((await persisted(w.fields['bep_pflanzenarten']))?.value_text).toBe(
      'Phragmites australis; Typha spp.',
    );
    expect(
      (await persisted(w.fields['bep_rhizomfestigkeit_erforderlich']))?.value_boolean,
    ).toBe(true);
    expect((await persisted(w.fields['bep_einbauten_typen']))?.value_text).toBe(
      'Steg-Fundamente; Pflanztroege',
    );
    expect(
      Number((await persisted(w.fields['bep_durchdringungen_anzahl']))?.value_number),
    ).toBe(3);
  });

  it('re-save with the unplanted case overwrites (mit_bepflanzung=false, 0 penetrations)', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['mit_bepflanzung']]: { type: 'boolean', value: false },
        [w.fields['bep_rhizomfestigkeit_erforderlich']]: { type: 'boolean', value: false },
        [w.fields['bep_durchdringungen_anzahl']]: { type: 'number', value: 0 },
      },
    });
    expect(res.ok).toBe(true);
    expect((await persisted(w.fields['mit_bepflanzung']))?.value_boolean).toBe(false);
    expect(
      (await persisted(w.fields['bep_rhizomfestigkeit_erforderlich']))?.value_boolean,
    ).toBe(false);
    expect(
      Number((await persisted(w.fields['bep_durchdringungen_anzahl']))?.value_number),
    ).toBe(0);
  });
});
