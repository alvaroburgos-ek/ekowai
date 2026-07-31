/**
 * VERIFY FLL-GAR-14 (Verbundwerkstoffe / GTD — Geosynthetic clay liners) —
 * per-worksheet exhaustive check.
 *
 * FLL-GAR-14 has 0 equations, 9 fields, 0 compliance requirements. It is a
 * material selection/classification worksheet (no math, no gates), so the "chain"
 * here is: drive the enum + boolean + number fields through the REAL saveWorksheet
 * and assert they persist. There are no equations to compute and no gates to fire.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000e4';

// Bring up PG + point env BEFORE @/lib/db loads.
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
const ws = fixture.worksheets['FLL-GAR-14'];

afterAll(async () => {
  await harness.stop();
});

const EXPECTED_FIELDS = [
  'bentonit_type',
  'bentonit_flaecheneinheit_g_m2',
  'quellvermoegen_ml',
  'gtd_schichtdicke_mm',
  'gtd_polyolefin_beschichtung',
  'gtd_auflast_funktion',
  'gtd_ueberlappung_laengs_cm',
  'gtd_ueberlappung_quer_cm',
  'groesstkorn_auflast_mm',
];

describe('FLL-GAR-14 — topology', () => {
  it('exposes all 9 GAR-14 fields', () => {
    for (const sym of EXPECTED_FIELDS) {
      expect(ws.fields[sym]).toBeTruthy();
    }
    expect(Object.keys(ws.fields).length).toBe(9);
  });
});

describe('FLL-GAR-14 — Na-bentonite state persists through real saveWorksheet', () => {
  it('drives all 9 fields (Na, quellgegendruck, no coating) and persists', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['bentonit_type']]: { type: 'enum', value: 'Na' },
        [ws.fields['bentonit_flaecheneinheit_g_m2']]: { type: 'number', value: 3600 },
        [ws.fields['quellvermoegen_ml']]: { type: 'number', value: 24 },
        [ws.fields['gtd_schichtdicke_mm']]: { type: 'number', value: 8 },
        [ws.fields['gtd_polyolefin_beschichtung']]: { type: 'boolean', value: false },
        [ws.fields['gtd_auflast_funktion']]: { type: 'enum', value: 'quellgegendruck' },
        [ws.fields['gtd_ueberlappung_laengs_cm']]: { type: 'number', value: 30 },
        [ws.fields['gtd_ueberlappung_quer_cm']]: { type: 'number', value: 50 },
        [ws.fields['groesstkorn_auflast_mm']]: { type: 'number', value: 16 },
      },
    });
    expect(res.ok).toBe(true);

    const rows = await sql<{ field_id: string; value_number: string | null; value_enum: string | null; value_text: string | null; value_boolean: boolean | null }[]>`
      SELECT field_id, value_number, value_enum, value_text, value_boolean
      FROM project_parameters
      WHERE project_id = ${fixture.projectId}
        AND field_id IN ${sql(EXPECTED_FIELDS.map((s) => ws.fields[s]))}`;
    const by = new Map(rows.map((r) => [r.field_id, r]));

    const btype = by.get(ws.fields['bentonit_type']);
    expect(btype?.value_enum ?? btype?.value_text).toBe('Na');

    expect(Number(by.get(ws.fields['bentonit_flaecheneinheit_g_m2'])?.value_number)).toBe(3600);
    expect(Number(by.get(ws.fields['quellvermoegen_ml'])?.value_number)).toBe(24);
    expect(Number(by.get(ws.fields['gtd_schichtdicke_mm'])?.value_number)).toBe(8);
    expect(by.get(ws.fields['gtd_polyolefin_beschichtung'])?.value_boolean).toBe(false);

    const auflast = by.get(ws.fields['gtd_auflast_funktion']);
    expect(auflast?.value_enum ?? auflast?.value_text).toBe('quellgegendruck');

    expect(Number(by.get(ws.fields['gtd_ueberlappung_laengs_cm'])?.value_number)).toBe(30);
    expect(Number(by.get(ws.fields['gtd_ueberlappung_quer_cm'])?.value_number)).toBe(50);
    expect(Number(by.get(ws.fields['groesstkorn_auflast_mm'])?.value_number)).toBe(16);
  });

  it('re-drives to a Ca-bentonite / austrocknung_frost / coated state (SR-2 alt point)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['bentonit_type']]: { type: 'enum', value: 'Ca' },
        [ws.fields['bentonit_flaecheneinheit_g_m2']]: { type: 'number', value: 8000 },
        [ws.fields['quellvermoegen_ml']]: { type: 'number', value: 8 },
        [ws.fields['gtd_polyolefin_beschichtung']]: { type: 'boolean', value: true },
        [ws.fields['gtd_auflast_funktion']]: { type: 'enum', value: 'austrocknung_frost' },
      },
    });
    expect(res.ok).toBe(true);

    const [btype] = await sql<{ value_enum: string | null; value_text: string | null }[]>`
      SELECT value_enum, value_text FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${ws.fields['bentonit_type']}`;
    expect(btype?.value_enum ?? btype?.value_text).toBe('Ca');

    const [af] = await sql<{ value_enum: string | null; value_text: string | null }[]>`
      SELECT value_enum, value_text FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${ws.fields['gtd_auflast_funktion']}`;
    expect(af?.value_enum ?? af?.value_text).toBe('austrocknung_frost');

    const [ca] = await sql<{ value_number: string | null }[]>`
      SELECT value_number FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${ws.fields['bentonit_flaecheneinheit_g_m2']}`;
    expect(Number(ca?.value_number)).toBe(8000);
  });
});
