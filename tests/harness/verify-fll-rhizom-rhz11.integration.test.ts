/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-11 (Bepflanzung / Planting).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-11 through the REAL
 * saveWorksheet path with the §5.8 / §7.1 / §7.3 planting values and reads them
 * back from project_parameters.
 *
 * FLLTP-RHZ-11 has 0 equations and 0 compliance_requirements, so there is NO
 * compute chain and NO gate. The only exercisable "chain" is the data-collection
 * save path: this test proves the 5 fields persist correctly through the real
 * UPSERT for both a PDF-conformant planting state (8 plants/vessel per §5.8) and
 * an out-of-spec state (nothing flags it — no gate exists).
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level await: PG + seed BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;
const ws = fixture.byCode['FLLTP-RHZ-11'];

afterAll(async () => {
  await harness.stop();
});

async function persisted(symbol: string): Promise<string | number | boolean | null> {
  const fieldId = ws.fieldIds[symbol];
  const [row] = await sql<
    {
      value_text: string | null;
      value_number: string | null;
      value_boolean: boolean | null;
      value_enum: string | null;
      value_date: string | null;
    }[]
  >`SELECT value_text, value_number, value_boolean, value_enum, value_date
    FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  if (!row) return null;
  if (row.value_boolean !== null) return row.value_boolean;
  if (row.value_number !== null) return Number(row.value_number);
  if (row.value_enum !== null) return row.value_enum;
  if (row.value_date !== null) return row.value_date;
  return row.value_text;
}

describe('VERIFY FLLTP-RHZ-11 — planting through real save path', () => {
  it('exposes exactly the 5 prod fields', () => {
    expect(Object.keys(ws.fieldIds).sort()).toEqual(
      [
        'anzahl_pflanzen_total',
        'bepflanzung_datum',
        'pflanzdichte_pro_gefaess',
        'pflanzen_initial_zustand',
        'pflanzung_methode',
      ].sort(),
    );
    expect(ws.fieldTypes['pflanzdichte_pro_gefaess']).toBe('number');
    expect(ws.fieldTypes['bepflanzung_datum']).toBe('date');
    expect(ws.fieldTypes['pflanzen_initial_zustand']).toBe('enum');
  });

  it('drives the §5.8 PDF-conformant planting state through real saveWorksheet and persists it', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // §5.8 (line 653): "Je Gefäß von 800 x 800 mm sind 8 Pflanzen vorzusehen."
    //   → pflanzdichte_pro_gefaess = 8  (PDF-attested, VA)
    // §4 (lines 508-509): 8 Prüfgefäße + 3 Kontrollgefäße = 11 vessels.
    //   11 × 8 = 88 total plants (derivable sanity value, VC — no verbatim total in PDF).
    // bepflanzung_datum / pflanzung_methode / pflanzen_initial_zustand are
    //   operator-recorded log fields (no source constant).
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['pflanzdichte_pro_gefaess']]: { type: 'number', value: 8 },
        [ws.fieldIds['anzahl_pflanzen_total']]: { type: 'number', value: 88 },
        [ws.fieldIds['bepflanzung_datum']]: { type: 'date', value: '2026-04-01' },
        [ws.fieldIds['pflanzung_methode']]: {
          type: 'text',
          value: 'Phragmites australis (Schilf) im 9 x 9 Container, gleichmaessig verteilt',
        },
        [ws.fieldIds['pflanzen_initial_zustand']]: { type: 'enum', value: 'gut' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('CONFORMANT SAVE ok:', JSON.stringify(save.ok));
    expect(save.ok).toBe(true);

    expect(await persisted('pflanzdichte_pro_gefaess')).toBe(8);
    expect(await persisted('anzahl_pflanzen_total')).toBe(88);
    const dateVal = await persisted('bepflanzung_datum');
    expect(new Date(dateVal as string | number).toISOString()).toContain('2026-04-01');
    expect(await persisted('pflanzung_methode')).toContain('Phragmites australis');
    expect(await persisted('pflanzen_initial_zustand')).toBe('gut');
  });

  it('drives an out-of-spec plant density (4 ≠ 8) and persists it — NO gate blocks it', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // Deliberately NOT the §5.8 required 8 plants/vessel. There is NO
    // compliance_requirement on RHZ-11, so nothing flags this deviation —
    // the save still succeeds and the wrong density persists verbatim.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['pflanzdichte_pro_gefaess']]: { type: 'number', value: 4 },
      },
    });
    // eslint-disable-next-line no-console
    console.log('OUT-OF-SPEC SAVE ok:', JSON.stringify(save.ok));
    expect(save.ok).toBe(true);
    expect(await persisted('pflanzdichte_pro_gefaess')).toBe(4);
  });
});
