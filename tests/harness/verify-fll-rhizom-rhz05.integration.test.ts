/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-05 (Prüf- und Kontrollgefäße & Apparatur).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-05 through the REAL
 * saveWorksheet path with PDF-attested apparatus values and reads them back.
 *
 * FLLTP-RHZ-05 has 0 equations and 0 compliance_requirements of its own, so there
 * is no compute chain and no local gate. The 8 apparatus fields on THIS worksheet
 * (gefaess_innenmass_l/b/h_mm, anzahl_pruefgefaesse, anzahl_kontrollgefaesse,
 * wasserablauf_durchmesser_mm, widerlager_dicke_mm) are, however, the sole variables
 * of REQ-06 "Apparatur korrekt dimensioniert" — a block gate that in prod is
 * attached to a DIFFERENT template (FLLTP-RHZ-04). We therefore:
 *   1. drive the real data-collection save + assert persistence, and
 *   2. exercise REQ-06's condition through the REAL evaluateCondition against a
 *      symbol→value map built from THIS worksheet's persisted fields, in both a
 *      PDF-conformant PASS state and a FAIL state, to prove it is fireable in
 *      principle and to characterise the cross-worksheet placement finding.
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level await: PG + seed BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';
import { evaluateCondition } from '@/lib/compliance/evaluate';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;
const ws = fixture.byCode['FLLTP-RHZ-05'];

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

// symbol→value lookup over the persisted RHZ-05 field set for the gate DSL.
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

// REQ-06 condition verbatim from prod (lives on FLLTP-RHZ-04; variables are all RHZ-05 fields).
const REQ06 =
  'gefaess_innenmass_l_mm >= 800 AND gefaess_innenmass_b_mm >= 800 AND gefaess_innenmass_h_mm >= 250 AND anzahl_pruefgefaesse == 8 AND anzahl_kontrollgefaesse == 3 AND wasserablauf_durchmesser_mm == 40 AND widerlager_dicke_mm >= 9 AND widerlager_dicke_mm <= 11';

describe('VERIFY FLLTP-RHZ-05 — apparatus save + REQ-06 (cross-worksheet) exercise', () => {
  it('drives the PDF-conformant apparatus state through real saveWorksheet + persists', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // PDF-attested minimum apparatus (FLL TP Rhizom 2023, §5.2/5.3, Abb.1):
    //   Innenmaß mind. 800 x 800 x 250 mm; Wasserablauf Ø 40 mm; Widerlager 10 ±1 mm;
    //   8 Prüfgefäße + 3 Kontrollgefäße.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['gefaess_innenmass_l_mm']]: { type: 'number', value: 800 },
        [ws.fieldIds['gefaess_innenmass_b_mm']]: { type: 'number', value: 800 },
        [ws.fieldIds['gefaess_innenmass_h_mm']]: { type: 'number', value: 250 },
        [ws.fieldIds['wasserablauf_durchmesser_mm']]: { type: 'number', value: 40 },
        [ws.fieldIds['anzahl_pruefgefaesse']]: { type: 'number', value: 8 },
        [ws.fieldIds['anzahl_kontrollgefaesse']]: { type: 'number', value: 3 },
        [ws.fieldIds['gefaess_material']]: { type: 'text', value: 'korrosionsfest, pflanzenverträglich' },
        [ws.fieldIds['widerlager_dicke_mm']]: { type: 'number', value: 10 },
        [ws.fieldIds['widerlager_material']]: { type: 'text', value: 'Polystyrolplatten (DAA dh)' },
        [ws.fieldIds['trennlage_eingebaut']]: { type: 'boolean', value: true },
        [ws.fieldIds['trennlage_wasserdurchlaessig']]: { type: 'boolean', value: true },
      },
    });
    expect(save.ok).toBe(true);

    expect(await persisted('gefaess_innenmass_l_mm')).toBe(800);
    expect(await persisted('gefaess_innenmass_b_mm')).toBe(800);
    expect(await persisted('gefaess_innenmass_h_mm')).toBe(250);
    expect(await persisted('wasserablauf_durchmesser_mm')).toBe(40);
    expect(await persisted('anzahl_pruefgefaesse')).toBe(8);
    expect(await persisted('anzahl_kontrollgefaesse')).toBe(3);
    expect(await persisted('widerlager_dicke_mm')).toBe(10);
    expect(await persisted('trennlage_wasserdurchlaessig')).toBe(true);

    // REQ-06 evaluated over THIS worksheet's persisted fields → PASS.
    const lookup = await gateLookup();
    const r06 = evaluateCondition(REQ06, lookup);
    // eslint-disable-next-line no-console
    console.log('PASS-STATE REQ-06 (over RHZ-05 fields):', JSON.stringify(r06));
    expect(r06.kind).toBe('pass');
  });

  it('drives a FAIL apparatus state (undersized gefäß, wrong ablauf) → REQ-06 fires', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['gefaess_innenmass_l_mm']]: { type: 'number', value: 600 }, // < 800
        [ws.fieldIds['wasserablauf_durchmesser_mm']]: { type: 'number', value: 50 }, // != 40
        [ws.fieldIds['widerlager_dicke_mm']]: { type: 'number', value: 20 }, // > 11
      },
    });
    expect(save.ok).toBe(true);

    const lookup = await gateLookup();
    const r06 = evaluateCondition(REQ06, lookup);
    // eslint-disable-next-line no-console
    console.log('FAIL-STATE REQ-06 (over RHZ-05 fields):', JSON.stringify(r06));
    expect(r06.kind).toBe('fail');

    expect(await persisted('gefaess_innenmass_l_mm')).toBe(600);
    expect(await persisted('wasserablauf_durchmesser_mm')).toBe(50);
  });
});
