/**
 * VERIFY DRIVE: FLLTP-RHZ-20 (Umschreibung & Verlängerung) through the REAL
 * saveWorksheet path. This worksheet has 0 equations + 0 compliance_requirements,
 * so the only computable "chain" is the persistence chain: drive the 4 boolean
 * extension-conditions + the extension-period number in, and assert they land in
 * project_parameters via the real UPSERT + audit path.
 */
// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startHarness, type Harness } from './embedded-pg';
import { seedFllRhizom, type SeededRhizomFixture } from './seed-fll-rhizom';

const USER_ID = '00000000-0000-4000-8000-0000000000f3';

let harness: Harness;
let fixture: SeededRhizomFixture;

beforeAll(async () => {
  harness = await startHarness();
  process.env.DATABASE_URL = harness.databaseUrl;
  process.env.BYPASS_AUTH = 'true';
  process.env.BYPASS_AUTH_USER_ID = USER_ID;
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
  process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
  fixture = await seedFllRhizom(harness.sql, USER_ID);
}, 120_000);

afterAll(async () => {
  if (harness) await harness.stop();
});

describe('FLLTP-RHZ-20 saveWorksheet drive', () => {
  it('persists the extension conditions + period via the real save path', async () => {
    const { saveWorksheet } = await import('../../src/lib/actions/worksheet');
    const ws = fixture.byCode['FLLTP-RHZ-20'];
    expect(ws).toBeTruthy();

    const values: Record<string, { type: string; value: unknown }> = {
      [ws.fieldIds['pruefgrundlagen_unveraendert']]: { type: 'boolean', value: true },
      [ws.fieldIds['produkt_aktuell_im_lieferprogramm']]: { type: 'boolean', value: true },
      [ws.fieldIds['rueckstellmuster_erneut_hinterlegt']]: { type: 'boolean', value: true },
      [ws.fieldIds['eidesstattliche_erklaerung_vorhanden']]: { type: 'boolean', value: true },
      // §10 / p.22: "in Zeitabschnitten von 5 Jahren verlängert"
      [ws.fieldIds['verlangerung_zeitabschnitt_jahre']]: { type: 'number', value: 5 },
    };

    const res = await saveWorksheet({ instanceId: ws.instanceId, values: values as never });
    // eslint-disable-next-line no-console
    console.log('SAVE_RESULT', JSON.stringify(res));
    expect(res.ok).toBe(true);

    const rows = await harness.sql<
      { symbol: string; value_boolean: boolean | null; value_number: string | null }[]
    >`
      SELECT f.symbol, pp.value_boolean, pp.value_number
      FROM project_parameters pp
      JOIN fields f ON f.id = pp.field_id
      WHERE pp.source_worksheet_instance_id = ${ws.instanceId}
      ORDER BY f.order_index, f.symbol`;
    // eslint-disable-next-line no-console
    console.log('PERSISTED', JSON.stringify(rows));

    const bySym = Object.fromEntries(rows.map((r) => [r.symbol, r]));
    expect(bySym['pruefgrundlagen_unveraendert'].value_boolean).toBe(true);
    expect(bySym['produkt_aktuell_im_lieferprogramm'].value_boolean).toBe(true);
    expect(bySym['rueckstellmuster_erneut_hinterlegt'].value_boolean).toBe(true);
    expect(bySym['eidesstattliche_erklaerung_vorhanden'].value_boolean).toBe(true);
    expect(Number(bySym['verlangerung_zeitabschnitt_jahre'].value_number)).toBe(5);
  });
});
