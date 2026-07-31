/**
 * FLL-GAR-16 (Kunststoff-/Elastomerbahnen) — per-worksheet verification.
 *
 * FLL-GAR-16 is a pure data_collection worksheet: 0 equations, 0 compliance
 * requirements, 6 fields:
 *   - bahnendicke_mm            number  (>= 1,2 mm; 1,0 mm Gartenteich)  Sec.6.2.1.2
 *   - nahtbreite_min_mm         number  (Tab.22 Mindestfügebreite)       Sec.6.2.2.1
 *   - fuegeverfahren            enum(4) (Tab.22 Fügeverfahren)
 *   - bahn_material_naht        enum(8) (Tab.22 Stoffart)
 *   - polymerbitumen_beschichtung boolean (Sec.6.2.2.1: 40->60 mm)
 *   - naht_ueberlappung_kunststoff_mm number (>= 40, or 60 poly-bit)   Sec.6.2.2.1
 *
 * No engine chain and no gate to fire. The only drivable "chain" is the REAL
 * saveWorksheet persistence round-trip. This test enters PDF-attested values
 * (Sec.6.2.1.2, Sec.6.2.2.1, Tab.22) through the REAL saveWorksheet and asserts
 * every value persists to project_parameters — the same seam the browser uses.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000016';

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
  const w = fixture.worksheets['FLL-GAR-16'];
  if (!w) throw new Error('FLL-GAR-16 not in fixture');
  return w;
}

async function persisted(fieldId: string) {
  const [row] = await sql<
    {
      value_text: string | null;
      value_number: string | null;
      value_boolean: boolean | null;
      value_enum: string | null;
      source_type: string;
    }[]
  >`SELECT value_text, value_number, value_boolean, value_enum, source_type
    FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row ?? null;
}

describe('FLL-GAR-16 (Kunststoff-/Elastomerbahnen) — real saveWorksheet persistence of all 6 fields', () => {
  it('exposes all 6 collected fields', () => {
    const w = ws();
    expect(w.fields['bahnendicke_mm']).toBeTruthy();
    expect(w.fields['nahtbreite_min_mm']).toBeTruthy();
    expect(w.fields['fuegeverfahren']).toBeTruthy();
    expect(w.fields['bahn_material_naht']).toBeTruthy();
    expect(w.fields['polymerbitumen_beschichtung']).toBeTruthy();
    expect(w.fields['naht_ueberlappung_kunststoff_mm']).toBeTruthy();
  });

  it('drives all 6 fields with PDF-attested values through the REAL saveWorksheet and persists them', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        // Sec.6.2.1.2: "Die Bahnen müssen eine Mindestdicke von 1,2 mm aufweisen."
        [w.fields['bahnendicke_mm']]: { type: 'number', value: 1.2 },
        // Tab.22: Quellschweißen / PVC-P => Mindestfügebreite 30 mm
        [w.fields['nahtbreite_min_mm']]: { type: 'number', value: 30 },
        [w.fields['fuegeverfahren']]: { type: 'enum', value: 'quellschweissen' }, // Tab.22 Nr.2
        [w.fields['bahn_material_naht']]: { type: 'enum', value: 'PVC-P' },        // Tab.22 Stoffart
        [w.fields['polymerbitumen_beschichtung']]: { type: 'boolean', value: false },
        // Sec.6.2.2.1: Mindestüberlappung 40 mm (ohne Polymerbitumen)
        [w.fields['naht_ueberlappung_kunststoff_mm']]: { type: 'number', value: 40 },
      },
    });
    expect(res.ok).toBe(true);

    expect(Number((await persisted(w.fields['bahnendicke_mm']))?.value_number)).toBeCloseTo(1.2, 6);
    expect(Number((await persisted(w.fields['nahtbreite_min_mm']))?.value_number)).toBeCloseTo(30, 6);
    expect((await persisted(w.fields['fuegeverfahren']))?.value_enum).toBe('quellschweissen');
    expect((await persisted(w.fields['bahn_material_naht']))?.value_enum).toBe('PVC-P');
    expect((await persisted(w.fields['polymerbitumen_beschichtung']))?.value_boolean).toBe(false);
    expect(Number((await persisted(w.fields['naht_ueberlappung_kunststoff_mm']))?.value_number)).toBeCloseTo(40, 6);
  });

  it('re-save with poly-bitumen path (Sec.6.2.2.1: 60 mm overlap) overwrites — no post-approval lock', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        // Tab.22 Nr.5: Heißluftschweißen / EPDM mit PBS => 40 mm Fügebreite
        [w.fields['fuegeverfahren']]: { type: 'enum', value: 'heissluft_pbs' },
        [w.fields['bahn_material_naht']]: { type: 'enum', value: 'EPDM_PBS' },
        [w.fields['nahtbreite_min_mm']]: { type: 'number', value: 40 },
        [w.fields['polymerbitumen_beschichtung']]: { type: 'boolean', value: true },
        // Sec.6.2.2.1: "Bei Bahnen mit Polymerbitumenbeschichtung ist eine
        // Mindestbreite von 60 mm einzuhalten."
        [w.fields['naht_ueberlappung_kunststoff_mm']]: { type: 'number', value: 60 },
      },
    });
    expect(res.ok).toBe(true);
    expect((await persisted(w.fields['fuegeverfahren']))?.value_enum).toBe('heissluft_pbs');
    expect((await persisted(w.fields['bahn_material_naht']))?.value_enum).toBe('EPDM_PBS');
    expect((await persisted(w.fields['polymerbitumen_beschichtung']))?.value_boolean).toBe(true);
    expect(Number((await persisted(w.fields['naht_ueberlappung_kunststoff_mm']))?.value_number)).toBeCloseTo(60, 6);
  });
});
