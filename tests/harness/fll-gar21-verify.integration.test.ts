/**
 * FLL-GAR-21 (GUP — glasfaserverstärktes [ungesättigtes] Polyester) —
 * per-worksheet verification.
 *
 * FLL-GAR-21 is a pure data_collection worksheet: 0 equations, 0 compliance
 * requirements, 6 fields (all clause_reference '§9.13' in prod — WRONG; the real
 * source is §7.3, see verify JSON finding):
 *   - gup_harztyp            [text]     Harztyp (UP/VE)        §7.3.1.1
 *   - gup_glasfaser_anteil   [number %] Glasfaser-Anteil       §7.3.1.1 ("30%")
 *   - gup_laminatdicke       [number mm]Laminatdicke           §7.3.1.2 ("mind. 4 mm")
 *   - gup_biegefestigkeit    [number N/mm²] Biegefestigkeit    (DIN 18820, no FLL value)
 *   - gup_verarbeitung       [text]     Spritzen/Handlaminat   §7.3.2.2
 *   - gup_topcoat            [boolean]  Topcoat vorhanden       §7.3.2.2 (Schlusslackharz)
 *
 * No engine chain, no gate. The only "chain" is the REAL saveWorksheet
 * persistence of the 6 collected fields. Bootstraps the full-project FLL-GAR
 * seeder against a disposable embedded Postgres, drives the fields through the
 * REAL saveWorksheet path, and asserts persistence to project_parameters.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000f21';

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
  const w = fixture.worksheets['FLL-GAR-21'];
  if (!w) throw new Error('FLL-GAR-21 not in fixture');
  return w;
}

async function persisted(fieldId: string) {
  const [row] = await sql<
    {
      value_text: string | null;
      value_number: string | null;
      value_enum: string | null;
      value_boolean: boolean | null;
    }[]
  >`SELECT value_text, value_number, value_enum, value_boolean FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row ?? null;
}

describe('FLL-GAR-21 (GUP) — real saveWorksheet persistence', () => {
  it('exposes all 6 collected fields', () => {
    const w = ws();
    for (const sym of [
      'gup_harztyp',
      'gup_glasfaser_anteil',
      'gup_laminatdicke',
      'gup_biegefestigkeit',
      'gup_verarbeitung',
      'gup_topcoat',
    ]) {
      expect(w.fields[sym]).toBeTruthy();
    }
  });

  it('persists the PDF §7.3-attested GUP case', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        // §7.3.1.1 "ungesättigte Polyesterharze nach DIN 16946 Teil 2" → UP
        [w.fields['gup_harztyp']]: { type: 'text', value: 'UP' },
        // §7.3.1.1 "Glasgehalt von 30% des Laminats"
        [w.fields['gup_glasfaser_anteil']]: { type: 'number', value: 30 },
        // §7.3.1.2 "Laminatdicke ... soll mind. 4 mm betragen"
        [w.fields['gup_laminatdicke']]: { type: 'number', value: 4 },
        // No FLL-stated Biegefestigkeit (DIN 18820) — placeholder, VC only
        [w.fields['gup_biegefestigkeit']]: { type: 'number', value: 100 },
        // §7.3.2.2 Matten (Handlaminat) vs Faserspritzen
        [w.fields['gup_verarbeitung']]: { type: 'text', value: 'Handlaminat' },
        // §7.3.2.2 "Schlusslackharz ... Oberflächenversiegelung"
        [w.fields['gup_topcoat']]: { type: 'boolean', value: true },
      },
    });
    expect(res.ok).toBe(true);

    expect((await persisted(w.fields['gup_harztyp']))?.value_text).toBe('UP');
    expect(Number((await persisted(w.fields['gup_glasfaser_anteil']))?.value_number)).toBe(30);
    expect(Number((await persisted(w.fields['gup_laminatdicke']))?.value_number)).toBe(4);
    expect(Number((await persisted(w.fields['gup_biegefestigkeit']))?.value_number)).toBe(100);
    expect((await persisted(w.fields['gup_verarbeitung']))?.value_text).toBe('Handlaminat');
    expect((await persisted(w.fields['gup_topcoat']))?.value_boolean).toBe(true);
  });

  it('re-save (VE / Spritzen / no topcoat) overwrites', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['gup_harztyp']]: { type: 'text', value: 'VE' },
        [w.fields['gup_laminatdicke']]: { type: 'number', value: 6 },
        [w.fields['gup_verarbeitung']]: { type: 'text', value: 'Spritzen' },
        [w.fields['gup_topcoat']]: { type: 'boolean', value: false },
      },
    });
    expect(res.ok).toBe(true);
    expect((await persisted(w.fields['gup_harztyp']))?.value_text).toBe('VE');
    expect(Number((await persisted(w.fields['gup_laminatdicke']))?.value_number)).toBe(6);
    expect((await persisted(w.fields['gup_verarbeitung']))?.value_text).toBe('Spritzen');
    expect((await persisted(w.fields['gup_topcoat']))?.value_boolean).toBe(false);
  });
});
