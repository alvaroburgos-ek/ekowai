/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-15 (Wuchsleistung Zwischenauswertung 18 Monate).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-15 through the REAL
 * saveWorksheet path.
 *
 * PDF provenance (this run, TP-Rhizom.txt):
 *   §3.7 Wuchsleistung: "3. Zwischenauswertung (nach 18 Monaten) ≥ 160 Halme/Gefäße"
 *   §3.7: "Die Bestandsdichte der Testpflanzen in den Prüfgefäßen muss mindestens
 *          80 % der Bestandsdichte der Pflanzen in den Kontrollgefäßen betragen."
 *   Prüfbericht Tab. 3: "ØP1–P8 / ØK1–K3 x 100"  (Sollwert: ≥ 80 %).
 *
 * FLLTP-RHZ-15 has 0 equations and 0 compliance_requirements on prod, so there is
 * no derived-materialize chain and no gate to fire — only the data-collection save
 * path for the five fields (2×number, %-number, boolean, date). The relative-
 * density value the standard DEFINES by a formula (ØP/ØK×100) is here a plain
 * entered number (see FINDINGS in the JSON detail).
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level await: PG + seed BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;
const ws = fixture.byCode['FLLTP-RHZ-15'];

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

describe('VERIFY FLLTP-RHZ-15 — Wuchsleistung 18-Monats-Zwischenauswertung save', () => {
  it('exposes exactly the 5 prod fields with the right types', () => {
    expect(ws).toBeTruthy();
    expect(ws.fieldTypes['bestandsdichte_p_avg_18mon']).toBe('number');
    expect(ws.fieldTypes['kontrolle_p_avg_18mon']).toBe('number');
    expect(ws.fieldTypes['relativ_prozent_18mon']).toBe('number');
    expect(ws.fieldTypes['wuchsleistung_18mon_ausreichend']).toBe('boolean');
    expect(ws.fieldTypes['auswertungs_datum_18mon']).toBe('date');
  });

  it('drives a PASS state (≥160 Halme AND ≥80% rel.) through real saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // PASS worked example, all inputs PDF-anchored to §3.7 thresholds:
    //   ØP1–P8 = 170 Halme/Gefäß  (≥ 160 threshold met)
    //   ØK1–K3 = 190 Halme/Gefäß
    //   relative = 170/190*100 = 89.47 %  (≥ 80 % Sollwert met)  → ausreichend = true
    const relative = (170 / 190) * 100; // 89.47… — Tab.3 ØP/ØK×100
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_18mon']]: { type: 'number', value: 170 },
        [ws.fieldIds['kontrolle_p_avg_18mon']]: { type: 'number', value: 190 },
        [ws.fieldIds['relativ_prozent_18mon']]: { type: 'number', value: relative },
        [ws.fieldIds['wuchsleistung_18mon_ausreichend']]: { type: 'boolean', value: true },
        [ws.fieldIds['auswertungs_datum_18mon']]: { type: 'date', value: '2026-01-15' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-15 PASS save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    expect(save.ok).toBe(true);

    const pAvg = await persisted('bestandsdichte_p_avg_18mon');
    const kAvg = await persisted('kontrolle_p_avg_18mon');
    const rel = await persisted('relativ_prozent_18mon');
    const ok = await persisted('wuchsleistung_18mon_ausreichend');
    const datum = await persisted('auswertungs_datum_18mon');
    // eslint-disable-next-line no-console
    console.log(
      'RHZ-15 PASS persisted  ØP:', JSON.stringify(pAvg),
      ' ØK:', JSON.stringify(kAvg),
      ' rel%:', JSON.stringify(rel),
      ' ausreichend:', JSON.stringify(ok),
      ' datum:', JSON.stringify(datum),
    );
    expect(pAvg).toBe(170);
    expect(kAvg).toBe(190);
    // Sanity-check the entered relative % against the PDF Tab.3 formula ØP/ØK×100.
    expect(Number(rel)).toBeCloseTo(89.4737, 3);
    expect(ok).toBe(true);
    expect(new Date(datum as string | number).toISOString().slice(0, 10)).toBe('2026-01-15');
  });

  it('drives a FAIL state (<160 Halme AND <80% rel.) — no gate blocks it', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // FAIL worked example:
    //   ØP1–P8 = 110 Halme/Gefäß  (< 160 threshold → insufficient)
    //   ØK1–K3 = 190 Halme/Gefäß
    //   relative = 110/190*100 = 57.9 %  (< 80 % Sollwert)  → ausreichend = false
    const relative = (110 / 190) * 100; // 57.89…
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_18mon']]: { type: 'number', value: 110 },
        [ws.fieldIds['kontrolle_p_avg_18mon']]: { type: 'number', value: 190 },
        [ws.fieldIds['relativ_prozent_18mon']]: { type: 'number', value: relative },
        [ws.fieldIds['wuchsleistung_18mon_ausreichend']]: { type: 'boolean', value: false },
        [ws.fieldIds['auswertungs_datum_18mon']]: { type: 'date', value: '2026-01-16' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-15 FAIL save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    // Data-collection worksheet with 0 gates: a failing (insufficient) state still
    // saves — there is no compliance_requirement to block it. The ≥160 / ≥80%
    // thresholds are unenforced (see FINDINGS in JSON detail).
    expect(save.ok).toBe(true);
    const pAvg = await persisted('bestandsdichte_p_avg_18mon');
    const rel = await persisted('relativ_prozent_18mon');
    const ok = await persisted('wuchsleistung_18mon_ausreichend');
    // eslint-disable-next-line no-console
    console.log('RHZ-15 FAIL persisted ØP:', JSON.stringify(pAvg), ' rel%:', JSON.stringify(rel), ' ausreichend:', JSON.stringify(ok));
    expect(pAvg).toBe(110);
    expect(Number(rel)).toBeCloseTo(57.8947, 3);
    expect(ok).toBe(false);
  });

  it('note: relativ_prozent_18mon is a plain entered number — NO equation materializes ØP/ØK×100', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    // Enter an internally INCONSISTENT relative % (does not equal ØP/ØK×100) to
    // demonstrate the value is not derived/validated: 170/190×100 = 89.47, but we
    // store 42. If an equation existed, the save path would recompute/override it.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_18mon']]: { type: 'number', value: 170 },
        [ws.fieldIds['kontrolle_p_avg_18mon']]: { type: 'number', value: 190 },
        [ws.fieldIds['relativ_prozent_18mon']]: { type: 'number', value: 42 },
      },
    });
    expect(save.ok).toBe(true);
    const rel = await persisted('relativ_prozent_18mon');
    // eslint-disable-next-line no-console
    console.log('RHZ-15 inconsistent-relative persisted rel%:', JSON.stringify(rel), '(expected 42, NOT recomputed to 89.47 → confirms no equation)');
    expect(Number(rel)).toBe(42); // stored verbatim → confirms un-derived
  });
});
