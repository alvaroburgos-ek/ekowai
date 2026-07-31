/**
 * VERIFY worksheet FLLTP-RHZ-03 (Geltungsbereichsprüfung) — real saveWorksheet path.
 * 5 fields, 0 equations, 0 compliance_requirements. Scope/applicability check.
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';
import { seedFllRhizom, type SeededRhizomFixture } from './seed-fll-rhizom';

const USER_ID = '00000000-0000-4000-8000-0000000000f3';
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

let harness: Harness;
let fixture: SeededRhizomFixture;

beforeAll(async () => {
  harness = await startHarness();
  process.env.DATABASE_URL = harness.databaseUrl;
  fixture = await seedFllRhizom(harness.sql, USER_ID);
}, 120_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

describe('FLLTP-RHZ-03 verify (Geltungsbereichsprüfung)', () => {
  it('drives saveWorksheet through the REAL path (scope bool/text/date fields)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.byCode['FLLTP-RHZ-03'];
    expect(ws).toBeTruthy();

    const values: Record<string, { type: string; value: unknown }> = {
      // "Die Prüfung eines Abdichtungssystems ... ist nicht zulässig" (§2) → true = Einzelprodukt
      [ws.fieldIds['scope_einzelprodukt_bestaetigt']]: { type: 'boolean', value: true },
      // "für alle Ausbildungsformen von Gewässern im Garten-, Landschafts- und Sportplatzbau" (§2)
      [ws.fieldIds['scope_anwendungsbereich']]: {
        type: 'text',
        value: 'Abdichtungsschicht Gewaesser Garten-, Landschafts- und Sportplatzbau (Abschnitt 10.4 GAR-2023)',
      },
      [ws.fieldIds['scope_geltung_validiert']]: { type: 'boolean', value: true },
      [ws.fieldIds['scope_pruefer_name']]: { type: 'text', value: 'Pruefer X' },
      [ws.fieldIds['scope_pruefung_datum']]: { type: 'date', value: '2026-01-15' },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await saveWorksheet({ instanceId: ws.instanceId, values: values as any });
    // eslint-disable-next-line no-console
    console.log('SAVE_RESULT', JSON.stringify(res));
    expect(res.ok).toBe(true);

    const rows = await harness.sql<
      { symbol: string; value_text: string | null; value_boolean: boolean | null; value_date: string | null }[]
    >`
      SELECT fl.symbol, pp.value_text, pp.value_boolean, pp.value_date
      FROM project_parameters pp
      JOIN fields fl ON fl.id = pp.field_id
      WHERE pp.field_id IN (
        ${ws.fieldIds['scope_einzelprodukt_bestaetigt']},
        ${ws.fieldIds['scope_anwendungsbereich']},
        ${ws.fieldIds['scope_geltung_validiert']},
        ${ws.fieldIds['scope_pruefung_datum']}
      )
      ORDER BY fl.symbol`;
    console.log('SCOPE_PERSISTED', JSON.stringify(rows));

    const byS = Object.fromEntries(rows.map((r) => [r.symbol, r]));
    expect(byS['scope_einzelprodukt_bestaetigt'].value_boolean).toBe(true);
    expect(byS['scope_geltung_validiert'].value_boolean).toBe(true);
    expect(byS['scope_anwendungsbereich'].value_text).toContain('Garten-');
    const persistedDate = new Date(byS['scope_pruefung_datum'].value_date as unknown as string);
    expect(persistedDate.getFullYear()).toBe(2026);
    expect(persistedDate.getMonth()).toBe(0); // January
    expect(persistedDate.getDate()).toBe(15);
  });

  it('drives a FAIL/negative scope state (Einzelprodukt = false, System) through save', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.byCode['FLLTP-RHZ-03'];
    const values: Record<string, { type: string; value: unknown }> = {
      // System (mehrere Funktionsschichten) → nicht zulässig per §2
      [ws.fieldIds['scope_einzelprodukt_bestaetigt']]: { type: 'boolean', value: false },
      [ws.fieldIds['scope_geltung_validiert']]: { type: 'boolean', value: false },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await saveWorksheet({ instanceId: ws.instanceId, values: values as any });
    console.log('SAVE_RESULT_NEG', JSON.stringify(res));
    expect(res.ok).toBe(true);

    const rows = await harness.sql<{ symbol: string; value_boolean: boolean | null }[]>`
      SELECT fl.symbol, pp.value_boolean
      FROM project_parameters pp JOIN fields fl ON fl.id = pp.field_id
      WHERE pp.field_id = ${ws.fieldIds['scope_einzelprodukt_bestaetigt']}`;
    console.log('NEG_PERSISTED', JSON.stringify(rows));
    expect(rows[0].value_boolean).toBe(false);
  });

  it('confirms this worksheet carries NO equations and NO compliance_requirements', async () => {
    const ws = fixture.byCode['FLLTP-RHZ-03'];
    const [{ count: eqCount }] = await harness.sql<{ count: string }[]>`
      SELECT count(*) FROM equations WHERE worksheet_template_id = ${ws.templateId}`;
    const [{ count: crCount }] = await harness.sql<{ count: string }[]>`
      SELECT count(*) FROM compliance_requirements WHERE worksheet_template_id = ${ws.templateId}`;
    console.log('EQ_CR_COUNTS', JSON.stringify({ eqCount, crCount }));
    expect(Number(eqCount)).toBe(0);
    expect(Number(crCount)).toBe(0);
  });
});
