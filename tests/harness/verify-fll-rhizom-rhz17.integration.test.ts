/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-17 (Rhizomeindringung & -durchdringung
 * Erfassung / Rhizome ingress & penetration recording).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-17 through the REAL
 * saveWorksheet path and evaluates its 2 block gates (REQ-19, REQ-20) in both a
 * PASS and a FAIL state via the real evaluateCondition DSL.
 *
 * PDF provenance (this run), FLL TP Rhizomfestigkeit Gewässerabdichtungen 2023:
 *   §8.2 (Auswertung zum Ende der Prüfung): "Bei allen Gefäßen wird zum Ende der
 *     Prüfung die Vegetationstragschicht entnommen und die Abdichtung im Hinblick
 *     auf ein- und durchgedrungene Rhizome überprüft. Gemäß der Abschnitte 2.9,
 *     2.10 und 2.12 werden ein- und durchgedrungene Rhizome bei der geprüften
 *     Abdichtung in absoluten Zahlen erfasst. Dies erfolgt getrennt für folgende
 *     Bereiche — bei bahnenartigen Abdichtung: die Fläche und die Nähte; bei nicht
 *     bahnenförmigen Abdichtungen: die Fläche und die Arbeitsunterbrechungsfuge,
 *     falls diese erkennbar ist."
 *   §8.2: "Bei Eindringungen von Rhizomen in den Überlappungsbereich von Nähten ist
 *     die maximale Eindringtiefe festzuhalten." → max_eindringtiefe_ueberlappung_mm.
 *   §8.2: "Ein- und durchgedrungene Rhizome sind beispielhaft fotografisch zu
 *     belegen." → fotos_dokumentiert.
 *   §8.2: "Von der untersuchten Abdichtung sind zum Ende der Prüfung
 *     Rückstellproben zu entnehmen ..." → rueckstellproben_entnommen.
 *   §3.9 (Rhizomeindringung) — non-counted exceptions: "In die Fläche oder Naht
 *     bzw. Arbeitsunterbrechungsfuge ≤ 5 mm eingewachsene Rhizome bei Produkten,
 *     die wachstumshemmende Wirkstoffe enthalten" → rhizome_unter_5mm_bei_hemmstoff_count;
 *     "In bereits vorhandene Poren einer Abdichtung ... eingewachsene Rhizome
 *     (d. h. keine Beschädigung)" → rhizome_in_poren_count. (Both NOT gewertet.)
 *   §3.11 (Prüfergebnis): "Ein Produkt gilt als rhizomfest, wenn in allen
 *     Prüfgefäßen nach Ablauf der Prüfdauer keine Rhizomeindringungen ... sowie
 *     keine Rhizomdurchdringungen ... festzustellen sind." → PASS = all counts == 0.
 *
 * FLLTP-RHZ-17 has 0 equations (pure data-collection + gate). Its 2 gates are:
 *   REQ-19 "Keine gewerteten Rhizomeindringungen":
 *     rhizomeindringung_flaeche_count == 0 AND rhizomeindringung_naehte_count == 0
 *     AND rhizomeindringung_arbeitsfuge_count == 0
 *   REQ-20 "Keine Rhizomdurchdringungen":
 *     rhizomdurchdringung_flaeche_count == 0 AND rhizomdurchdringung_naehte_count == 0
 * All 5 gate symbols are LOCAL fields of THIS worksheet → both genuinely fireable.
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level await: PG + seed BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';
import { evaluateCondition } from '@/lib/compliance/evaluate';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;
const ws = fixture.byCode['FLLTP-RHZ-17'];

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

// worksheet-local symbol→value lookup over the persisted RHZ-17 field set.
async function gateLookup(): Promise<(sym: string) => string | number | boolean | null | undefined> {
  const rows = await sql<
    { symbol: string; value_text: string | null; value_number: string | null; value_boolean: boolean | null; value_enum: string | null }[]
  >`SELECT f.symbol, p.value_text, p.value_number, p.value_boolean, p.value_enum
    FROM project_parameters p JOIN fields f ON f.id = p.field_id
    WHERE p.project_id = ${fixture.projectId} AND f.worksheet_template_id = ${ws.templateId}`;
  const map = new Map<string, string | number | boolean | null>();
  for (const r of rows) {
    let v: string | number | boolean | null;
    if (r.value_boolean !== null) v = r.value_boolean;
    else if (r.value_number !== null) v = Number(r.value_number);
    else if (r.value_enum !== null) v = r.value_enum;
    else v = r.value_text;
    map.set(r.symbol, v);
  }
  return (sym: string) => (map.has(sym) ? map.get(sym) : undefined);
}

// Verbatim prod conditions.
const REQ19 =
  'rhizomeindringung_flaeche_count == 0 AND rhizomeindringung_naehte_count == 0 AND rhizomeindringung_arbeitsfuge_count == 0';
const REQ20 =
  'rhizomdurchdringung_flaeche_count == 0 AND rhizomdurchdringung_naehte_count == 0';

describe('VERIFY FLLTP-RHZ-17 — ingress/penetration recording save + REQ-19/20 exercise', () => {
  it('exposes exactly the 10 prod fields with the right types', () => {
    expect(ws).toBeTruthy();
    expect(Object.keys(ws.fieldIds).sort()).toEqual(
      [
        'rhizomeindringung_flaeche_count',
        'rhizomeindringung_naehte_count',
        'rhizomeindringung_arbeitsfuge_count',
        'rhizomdurchdringung_flaeche_count',
        'rhizomdurchdringung_naehte_count',
        'max_eindringtiefe_ueberlappung_mm',
        'rhizome_unter_5mm_bei_hemmstoff_count',
        'rhizome_in_poren_count',
        'fotos_dokumentiert',
        'rueckstellproben_entnommen',
      ].sort(),
    );
    expect(ws.fieldTypes['rhizomeindringung_flaeche_count']).toBe('number');
    expect(ws.fieldTypes['rhizomdurchdringung_naehte_count']).toBe('number');
    expect(ws.fieldTypes['max_eindringtiefe_ueberlappung_mm']).toBe('number');
    expect(ws.fieldTypes['fotos_dokumentiert']).toBe('boolean');
    expect(ws.fieldTypes['rueckstellproben_entnommen']).toBe('boolean');
  });

  it('drives the §3.11 PASS state (rhizomfest: all counts 0) through real saveWorksheet → REQ-19 & REQ-20 PASS', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // §3.11 rhizomfest worked example: no ingress, no penetration anywhere.
    // Non-counted (§3.9) exception fields may hold sightings without affecting the
    // gates (they are NOT part of REQ-19/20). Docs + samples present per §8.2.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['rhizomeindringung_flaeche_count']]: { type: 'number', value: 0 },
        [ws.fieldIds['rhizomeindringung_naehte_count']]: { type: 'number', value: 0 },
        [ws.fieldIds['rhizomeindringung_arbeitsfuge_count']]: { type: 'number', value: 0 },
        [ws.fieldIds['rhizomdurchdringung_flaeche_count']]: { type: 'number', value: 0 },
        [ws.fieldIds['rhizomdurchdringung_naehte_count']]: { type: 'number', value: 0 },
        [ws.fieldIds['max_eindringtiefe_ueberlappung_mm']]: { type: 'number', value: 0 },
        [ws.fieldIds['rhizome_unter_5mm_bei_hemmstoff_count']]: { type: 'number', value: 2 },
        [ws.fieldIds['rhizome_in_poren_count']]: { type: 'number', value: 1 },
        [ws.fieldIds['fotos_dokumentiert']]: { type: 'boolean', value: true },
        [ws.fieldIds['rueckstellproben_entnommen']]: { type: 'boolean', value: true },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-17 PASS save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    expect(save.ok).toBe(true);

    expect(await persisted('rhizomeindringung_flaeche_count')).toBe(0);
    expect(await persisted('rhizomeindringung_naehte_count')).toBe(0);
    expect(await persisted('rhizomeindringung_arbeitsfuge_count')).toBe(0);
    expect(await persisted('rhizomdurchdringung_flaeche_count')).toBe(0);
    expect(await persisted('rhizomdurchdringung_naehte_count')).toBe(0);
    expect(await persisted('rhizome_unter_5mm_bei_hemmstoff_count')).toBe(2);
    expect(await persisted('rhizome_in_poren_count')).toBe(1);
    expect(await persisted('fotos_dokumentiert')).toBe(true);
    expect(await persisted('rueckstellproben_entnommen')).toBe(true);

    const lookup = await gateLookup();
    const r19 = evaluateCondition(REQ19, lookup);
    const r20 = evaluateCondition(REQ20, lookup);
    // eslint-disable-next-line no-console
    console.log('PASS-STATE REQ-19:', JSON.stringify(r19), ' REQ-20:', JSON.stringify(r20));
    expect(r19.kind).toBe('pass');
    expect(r20.kind).toBe('pass');
  });

  it('drives a FAIL state (ingress in Fläche, penetration in Naht) → REQ-19 & REQ-20 fire', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // §3.9 Rhizomeindringung + §3.10 Rhizomdurchdringung present → NOT rhizomfest.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['rhizomeindringung_flaeche_count']]: { type: 'number', value: 3 }, // ingress in area
        [ws.fieldIds['rhizomeindringung_naehte_count']]: { type: 'number', value: 0 },
        [ws.fieldIds['rhizomeindringung_arbeitsfuge_count']]: { type: 'number', value: 0 },
        [ws.fieldIds['rhizomdurchdringung_flaeche_count']]: { type: 'number', value: 0 },
        [ws.fieldIds['rhizomdurchdringung_naehte_count']]: { type: 'number', value: 1 }, // penetration in seam
        [ws.fieldIds['max_eindringtiefe_ueberlappung_mm']]: { type: 'number', value: 12 },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-17 FAIL save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    // Data-collection worksheet: a NON-rhizomfest state still SAVES (gates are
    // evaluated at approval, not enforced at save) — recorded observation.
    expect(save.ok).toBe(true);

    expect(await persisted('rhizomeindringung_flaeche_count')).toBe(3);
    expect(await persisted('rhizomdurchdringung_naehte_count')).toBe(1);

    const lookup = await gateLookup();
    const r19 = evaluateCondition(REQ19, lookup);
    const r20 = evaluateCondition(REQ20, lookup);
    // eslint-disable-next-line no-console
    console.log('FAIL-STATE REQ-19:', JSON.stringify(r19), ' REQ-20:', JSON.stringify(r20));
    expect(r19.kind).toBe('fail'); // ingress_flaeche = 3 → fails
    expect(r20.kind).toBe('fail'); // durchdringung_naehte = 1 → fails
  });

  it('confirms both gates are worksheet-LOCAL & non-vacuous (all 5 symbols resolve here)', async () => {
    const lookup = await gateLookup();
    // Every gate symbol must resolve (not undefined) from THIS worksheet's field set.
    for (const sym of [
      'rhizomeindringung_flaeche_count',
      'rhizomeindringung_naehte_count',
      'rhizomeindringung_arbeitsfuge_count',
      'rhizomdurchdringung_flaeche_count',
      'rhizomdurchdringung_naehte_count',
    ]) {
      expect(lookup(sym)).not.toBe(undefined);
    }
    // Neither gate is ever 'pending' (vacuous/dead) on this worksheet.
    expect(evaluateCondition(REQ19, lookup).kind).not.toBe('pending');
    expect(evaluateCondition(REQ20, lookup).kind).not.toBe('pending');
  });
});
