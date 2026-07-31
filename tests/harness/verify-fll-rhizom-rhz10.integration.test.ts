/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-10 (Vorbereitung der Kontrollgefäße).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-10 through the REAL
 * saveWorksheet path with the source-attested values from §7.2 of the PDF:
 *   "In die 3 wasserdichten Kontrollgefäße wird ohne Widerlager und Abdichtung die
 *    untere Vegetationstragschicht in einer Dicke von (20 ±5) mm eingebaut. Nach
 *    Anbringen des Standrohrs in der Nähe der Gefäßwand wird die obere
 *    Vegetationstragschicht in einer Dicke von (150 ±5) mm eingebaut."
 *
 * FLLTP-RHZ-10 has 0 equations and 0 compliance_requirements, so there is no
 * compute chain and no gate to fire — only the data-collection save path for the
 * five fields (date / text / 2×number-mm / boolean).
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level await: PG + seed BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;
const ws = fixture.byCode['FLLTP-RHZ-10'];

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

describe('VERIFY FLLTP-RHZ-10 — Vorbereitung der Kontrollgefäße data-collection save', () => {
  it('exposes exactly the 5 prod fields with the right types', () => {
    expect(ws).toBeTruthy();
    expect(ws.fieldTypes['kontroll_einbau_datum']).toBe('date');
    expect(ws.fieldTypes['kontroll_vts_einbau_methode']).toBe('text');
    expect(ws.fieldTypes['kontroll_vts_dicke_unten_mm']).toBe('number');
    expect(ws.fieldTypes['kontroll_vts_dicke_oben_mm']).toBe('number');
    expect(ws.fieldTypes['kontroll_standrohr_eingebaut']).toBe('boolean');
  });

  it('drives the source-attested §7.2 state through real saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // PDF §7.2 nominal values: untere VTS (20 ±5) mm; obere VTS (150 ±5) mm;
    // Standrohr angebracht (=true). Datum + Methode are free-form data collection.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['kontroll_einbau_datum']]: { type: 'date', value: '2026-01-15' },
        [ws.fieldIds['kontroll_vts_einbau_methode']]: {
          type: 'text',
          value: 'ohne Widerlager und Abdichtung, analog Prüfgefäße (§6.1)',
        },
        [ws.fieldIds['kontroll_vts_dicke_unten_mm']]: { type: 'number', value: 20 },
        [ws.fieldIds['kontroll_vts_dicke_oben_mm']]: { type: 'number', value: 150 },
        [ws.fieldIds['kontroll_standrohr_eingebaut']]: { type: 'boolean', value: true },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-10 save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    expect(save.ok).toBe(true);

    const datum = await persisted('kontroll_einbau_datum');
    const methode = await persisted('kontroll_vts_einbau_methode');
    const unten = await persisted('kontroll_vts_dicke_unten_mm');
    const oben = await persisted('kontroll_vts_dicke_oben_mm');
    const standrohr = await persisted('kontroll_standrohr_eingebaut');
    // eslint-disable-next-line no-console
    console.log(
      'RHZ-10 persisted  datum:',
      JSON.stringify(datum),
      ' methode:',
      JSON.stringify(methode),
      ' unten_mm:',
      JSON.stringify(unten),
      ' oben_mm:',
      JSON.stringify(oben),
      ' standrohr:',
      JSON.stringify(standrohr),
    );
    expect(unten).toBe(20);
    expect(oben).toBe(150);
    expect(standrohr).toBe(true);
    expect(methode).toContain('Widerlager');
  });

  it('note: no gate enforces the (20±5)/(150±5) mm ranges — out-of-range values persist unchecked', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    // Deliberately out of §7.2 tolerance to demonstrate there is no compliance gate.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['kontroll_vts_dicke_unten_mm']]: { type: 'number', value: 999 },
        [ws.fieldIds['kontroll_vts_dicke_oben_mm']]: { type: 'number', value: 0 },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-10 out-of-range save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    const unten = await persisted('kontroll_vts_dicke_unten_mm');
    const oben = await persisted('kontroll_vts_dicke_oben_mm');
    // eslint-disable-next-line no-console
    console.log('RHZ-10 after out-of-range persisted unten_mm:', JSON.stringify(unten), ' oben_mm:', JSON.stringify(oben));
    // Record whatever the real path does: it stores unchecked (a range-not-enforced observation, not a bug for a data-collection worksheet).
    expect(save.ok).toBe(true);
    expect(unten).toBe(999);
    expect(oben).toBe(0);
  });
});
