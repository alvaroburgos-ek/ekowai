/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-06 (Vegetationstragschicht-Eingangsprüfung).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-06 through the REAL
 * saveWorksheet path with the Tab. 1 (§5.6) substrate-inspection values and reads
 * them back from project_parameters.
 *
 * FLLTP-RHZ-06 has 0 equations and 0 compliance_requirements, so there is NO
 * compute chain and NO gate. The only exercisable "chain" is the data-collection
 * save path: this test proves the 9 fields persist correctly through the real
 * UPSERT for both a fully-conformant Tab. 1 state and an out-of-range state.
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level await: PG + seed BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;
const ws = fixture.byCode['FLLTP-RHZ-06'];

afterAll(async () => {
  await harness.stop();
});

async function persisted(symbol: string): Promise<string | number | boolean | null> {
  const fieldId = ws.fieldIds[symbol];
  const [row] = await sql<
    { value_text: string | null; value_number: string | null; value_boolean: boolean | null; value_enum: string | null }[]
  >`SELECT value_text, value_number, value_boolean, value_enum
    FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  if (!row) return null;
  if (row.value_boolean !== null) return row.value_boolean;
  if (row.value_number !== null) return Number(row.value_number);
  if (row.value_enum !== null) return row.value_enum;
  return row.value_text;
}

describe('VERIFY FLLTP-RHZ-06 — Tab.1 substrate inspection through real save path', () => {
  it('drives a fully-conformant Tab.1 state through real saveWorksheet and persists it', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // Tab.1 (§5.6) worked/conformant inputs — chosen inside every Sollbereich:
    // pH 6.8 (6,0-7,5), Salz H2O 0.8 (≤1,0), Salz CaSO4 0.4 (≤0,5), N 40 (≤50),
    // P2O5 20 (≤25), K2O 90 (≤100), CaCO3 5 (1-10), Körnung "0-4", Dicke 170.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['vts_ph_cacl2']]: { type: 'number', value: 6.8 },
        [ws.fieldIds['vts_salz_h2o_g_l']]: { type: 'number', value: 0.8 },
        [ws.fieldIds['vts_salz_caso4_g_l']]: { type: 'number', value: 0.4 },
        [ws.fieldIds['vts_n_cat_mg_l']]: { type: 'number', value: 40 },
        [ws.fieldIds['vts_p2o5_cat_mg_l']]: { type: 'number', value: 20 },
        [ws.fieldIds['vts_k2o_cat_mg_l']]: { type: 'number', value: 90 },
        [ws.fieldIds['vts_caco3_scheibler_prozent']]: { type: 'number', value: 5 },
        [ws.fieldIds['vts_koernung']]: { type: 'text', value: '0-4' },
        [ws.fieldIds['vts_gesamt_dicke_mm']]: { type: 'number', value: 170 },
      },
    });
    // eslint-disable-next-line no-console
    console.log('CONFORMANT SAVE ok:', JSON.stringify(save.ok));
    expect(save.ok).toBe(true);

    expect(await persisted('vts_ph_cacl2')).toBe(6.8);
    expect(await persisted('vts_salz_h2o_g_l')).toBe(0.8);
    expect(await persisted('vts_salz_caso4_g_l')).toBe(0.4);
    expect(await persisted('vts_n_cat_mg_l')).toBe(40);
    expect(await persisted('vts_p2o5_cat_mg_l')).toBe(20);
    expect(await persisted('vts_k2o_cat_mg_l')).toBe(90);
    expect(await persisted('vts_caco3_scheibler_prozent')).toBe(5);
    expect(await persisted('vts_koernung')).toBe('0-4');
    expect(await persisted('vts_gesamt_dicke_mm')).toBe(170);
  });

  it('drives an out-of-Sollbereich state and persists it (no gate exists to block it)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // Deliberately out of Tab.1 range: pH 8.0 (>7,5), Salz H2O 2.0 (>1,0).
    // There is NO compliance_requirement on RHZ-06, so nothing flags this —
    // the save still succeeds and the bad values persist verbatim.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['vts_ph_cacl2']]: { type: 'number', value: 8.0 },
        [ws.fieldIds['vts_salz_h2o_g_l']]: { type: 'number', value: 2.0 },
      },
    });
    // eslint-disable-next-line no-console
    console.log('OUT-OF-RANGE SAVE ok:', JSON.stringify(save.ok));
    expect(save.ok).toBe(true);
    expect(await persisted('vts_ph_cacl2')).toBe(8.0);
    expect(await persisted('vts_salz_h2o_g_l')).toBe(2.0);
  });
});
