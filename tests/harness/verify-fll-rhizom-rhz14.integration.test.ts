/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-14 (Wuchsleistung Zwischenauswertung 12 Monate).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-14 through the REAL
 * saveWorksheet path.
 *
 * PDF provenance (this run):
 *   §3.7 Wuchsleistung: "2. Zwischenauswertung (nach 12 Monaten) ≥ 120 Halme/Gefäße"
 *   §3.7: "Die Bestandsdichte der Testpflanzen in den Prüfgefäßen muss mindestens
 *          80 % der Bestandsdichte der Pflanzen in den Kontrollgefäßen betragen."
 *   Prüfbericht Tab. 3: "ØP1–P8 / ØK1–K3 x 100"  (Sollwert: ≥ 80 %).
 *
 * FLLTP-RHZ-14 has 0 equations and 0 compliance_requirements on prod, so there is
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
const ws = fixture.byCode['FLLTP-RHZ-14'];

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

describe('VERIFY FLLTP-RHZ-14 — Wuchsleistung 12-Monats-Zwischenauswertung save', () => {
  it('exposes exactly the 5 prod fields with the right types', () => {
    expect(ws).toBeTruthy();
    expect(ws.fieldTypes['bestandsdichte_p_avg_12mon']).toBe('number');
    expect(ws.fieldTypes['kontrolle_p_avg_12mon']).toBe('number');
    expect(ws.fieldTypes['relativ_prozent_12mon']).toBe('number');
    expect(ws.fieldTypes['wuchsleistung_12mon_ausreichend']).toBe('boolean');
    expect(ws.fieldTypes['auswertungs_datum_12mon']).toBe('date');
  });

  it('drives a PASS state (≥120 Halme AND ≥80% rel.) through real saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // PASS worked example, all inputs PDF-anchored to §3.7 thresholds:
    //   ØP1–P8 = 130 Halme/Gefäß  (≥ 120 threshold met)
    //   ØK1–K3 = 150 Halme/Gefäß
    //   relative = 130/150*100 = 86.67 %  (≥ 80 % Sollwert met)  → ausreichend = true
    const relative = (130 / 150) * 100; // 86.666… — Tab.3 ØP/ØK×100
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_12mon']]: { type: 'number', value: 130 },
        [ws.fieldIds['kontrolle_p_avg_12mon']]: { type: 'number', value: 150 },
        [ws.fieldIds['relativ_prozent_12mon']]: { type: 'number', value: relative },
        [ws.fieldIds['wuchsleistung_12mon_ausreichend']]: { type: 'boolean', value: true },
        [ws.fieldIds['auswertungs_datum_12mon']]: { type: 'date', value: '2026-01-15' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-14 PASS save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    expect(save.ok).toBe(true);

    const pAvg = await persisted('bestandsdichte_p_avg_12mon');
    const kAvg = await persisted('kontrolle_p_avg_12mon');
    const rel = await persisted('relativ_prozent_12mon');
    const ok = await persisted('wuchsleistung_12mon_ausreichend');
    const datum = await persisted('auswertungs_datum_12mon');
    // eslint-disable-next-line no-console
    console.log(
      'RHZ-14 PASS persisted  ØP:', JSON.stringify(pAvg),
      ' ØK:', JSON.stringify(kAvg),
      ' rel%:', JSON.stringify(rel),
      ' ausreichend:', JSON.stringify(ok),
      ' datum:', JSON.stringify(datum),
    );
    expect(pAvg).toBe(130);
    expect(kAvg).toBe(150);
    // Sanity-check the entered relative % against the PDF Tab.3 formula ØP/ØK×100.
    expect(Number(rel)).toBeCloseTo(86.6667, 3);
    expect(ok).toBe(true);
    expect(new Date(datum as string | number).toISOString().slice(0, 10)).toBe('2026-01-15');
  });

  it('drives a FAIL state (<120 Halme AND <80% rel.) — no gate blocks it', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // FAIL worked example:
    //   ØP1–P8 = 90 Halme/Gefäß  (< 120 threshold → insufficient)
    //   ØK1–K3 = 150 Halme/Gefäß
    //   relative = 90/150*100 = 60 %  (< 80 % Sollwert)  → ausreichend = false
    const relative = (90 / 150) * 100; // 60
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_12mon']]: { type: 'number', value: 90 },
        [ws.fieldIds['kontrolle_p_avg_12mon']]: { type: 'number', value: 150 },
        [ws.fieldIds['relativ_prozent_12mon']]: { type: 'number', value: relative },
        [ws.fieldIds['wuchsleistung_12mon_ausreichend']]: { type: 'boolean', value: false },
        [ws.fieldIds['auswertungs_datum_12mon']]: { type: 'date', value: '2026-01-16' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-14 FAIL save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    // Data-collection worksheet with 0 gates: a failing (insufficient) state still
    // saves — there is no compliance_requirement to block it. Recorded, not a bug
    // per se for a data worksheet, but the ≥120 / ≥80% thresholds are unenforced.
    expect(save.ok).toBe(true);
    const pAvg = await persisted('bestandsdichte_p_avg_12mon');
    const rel = await persisted('relativ_prozent_12mon');
    const ok = await persisted('wuchsleistung_12mon_ausreichend');
    // eslint-disable-next-line no-console
    console.log('RHZ-14 FAIL persisted ØP:', JSON.stringify(pAvg), ' rel%:', JSON.stringify(rel), ' ausreichend:', JSON.stringify(ok));
    expect(pAvg).toBe(90);
    expect(Number(rel)).toBeCloseTo(60, 6);
    expect(ok).toBe(false);
  });

  it('note: relativ_prozent_12mon is a plain entered number — NO equation materializes ØP/ØK×100', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    // Enter an internally INCONSISTENT relative % (does not equal ØP/ØK×100) to
    // demonstrate the value is not derived/validated: 130/150×100 = 86.67, but we
    // store 42. If an equation existed, the save path would recompute/override it.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_12mon']]: { type: 'number', value: 130 },
        [ws.fieldIds['kontrolle_p_avg_12mon']]: { type: 'number', value: 150 },
        [ws.fieldIds['relativ_prozent_12mon']]: { type: 'number', value: 42 },
      },
    });
    expect(save.ok).toBe(true);
    const rel = await persisted('relativ_prozent_12mon');
    // eslint-disable-next-line no-console
    console.log('RHZ-14 inconsistent-relative persisted rel%:', JSON.stringify(rel), '(expected 42, NOT recomputed to 86.67 → confirms no equation)');
    expect(Number(rel)).toBe(42); // stored verbatim → confirms un-derived
  });
});
