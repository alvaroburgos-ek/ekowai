/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-12 (Pflege & Düngungsprotokoll / Care &
 * fertilization log).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-12 through the REAL
 * saveWorksheet path with the §7.3 (Pflege der Pflanzen) care values and reads
 * them back from project_parameters.
 *
 * FLLTP-RHZ-12 has 0 equations. It carries 3 block gates in prod:
 *   - REQ-14 — all seven §7.3 care/fertilization constants (LOCAL: every symbol is
 *     a field of THIS worksheet → genuinely fireable). Exercised PASS + FAIL.
 *   - REQ-16 / REQ-17 — 12- / 18-month growth adequacy. Their symbols
 *     (bestandsdichte_p_avg_12mon / _18mon, dichte_relativ_prozent) are NOT fields
 *     of RHZ-12; they live on FLLTP-RHZ-14 / -15 / -13. Under the worksheet-local
 *     lookup they can never resolve here → permanently `pending` (dead/vacuous on
 *     this worksheet). Characterised below as the CR-006-class placement finding.
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level await: PG + seed BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';
import { evaluateCondition } from '@/lib/compliance/evaluate';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;
const ws = fixture.byCode['FLLTP-RHZ-12'];

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

// symbol→value lookup over the persisted RHZ-12 field set (worksheet-local).
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
const REQ14 =
  'wasserstand_max_ueber_vts_mm == 20 AND wasserstand_min_unter_vts_mm == 50 AND duenger_intervall_monate == 1 AND duenger_gabe_g == 5 AND duenger_loesung_l == 20 AND ersatz_pflanzen_periode_mon <= 3 AND halmschnitt_im_gruenen_zulaessig == false';
const REQ16 = 'bestandsdichte_p_avg_12mon >= 120 AND dichte_relativ_prozent >= 80';
const REQ17 = 'bestandsdichte_p_avg_18mon >= 160 AND dichte_relativ_prozent >= 80';

describe('VERIFY FLLTP-RHZ-12 — care/fertilization save + REQ-14/16/17 exercise', () => {
  it('exposes exactly the 7 prod fields', () => {
    expect(Object.keys(ws.fieldIds).sort()).toEqual(
      [
        'duenger_gabe_g',
        'duenger_loesung_l',
        'duenger_intervall_monate',
        'wasserstand_max_ueber_vts_mm',
        'wasserstand_min_unter_vts_mm',
        'ersatz_pflanzen_periode_mon',
        'halmschnitt_im_gruenen_zulaessig',
      ].sort(),
    );
  });

  it('drives the §7.3 PDF-conformant care state through real saveWorksheet → persists + REQ-14 PASS', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // FLL TP Rhizom 2023 §7.3 (Pflege der Pflanzen), verbatim:
    //  "Der ... einzuhaltende Wasserstand liegt zwischen 20 mm über bzw. 50 mm
    //   unter der Oberfläche der Vegetationstragschicht."   → 20 above / 50 below
    //  "Die Düngung erfolgt in monatlichem Abstand."         → interval 1 month
    //  "Pro Gabe und Gefäß (800 x 800 mm) werden 5 g Düngemittel ... gelöst in 20 l
    //   Wasser appliziert."                                  → 5 g in 20 l
    //  "... nur während der ersten drei Monate gestattet."   → replacement ≤ 3 mon
    //  "Ein Schnitt der Halme im grünen Zustand ist nicht zulässig." → false
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['wasserstand_max_ueber_vts_mm']]: { type: 'number', value: 20 },
        [ws.fieldIds['wasserstand_min_unter_vts_mm']]: { type: 'number', value: 50 },
        [ws.fieldIds['duenger_intervall_monate']]: { type: 'number', value: 1 },
        [ws.fieldIds['duenger_gabe_g']]: { type: 'number', value: 5 },
        [ws.fieldIds['duenger_loesung_l']]: { type: 'number', value: 20 },
        [ws.fieldIds['ersatz_pflanzen_periode_mon']]: { type: 'number', value: 3 },
        [ws.fieldIds['halmschnitt_im_gruenen_zulaessig']]: { type: 'boolean', value: false },
      },
    });
    // eslint-disable-next-line no-console
    console.log('CONFORMANT SAVE ok:', JSON.stringify(save.ok));
    expect(save.ok).toBe(true);

    expect(await persisted('wasserstand_max_ueber_vts_mm')).toBe(20);
    expect(await persisted('wasserstand_min_unter_vts_mm')).toBe(50);
    expect(await persisted('duenger_intervall_monate')).toBe(1);
    expect(await persisted('duenger_gabe_g')).toBe(5);
    expect(await persisted('duenger_loesung_l')).toBe(20);
    expect(await persisted('ersatz_pflanzen_periode_mon')).toBe(3);
    expect(await persisted('halmschnitt_im_gruenen_zulaessig')).toBe(false);

    const lookup = await gateLookup();
    const r14 = evaluateCondition(REQ14, lookup);
    // eslint-disable-next-line no-console
    console.log('PASS-STATE REQ-14:', JSON.stringify(r14));
    expect(r14.kind).toBe('pass');

    // REQ-16 / REQ-17 over the RHZ-12 field set: their symbols do not exist here.
    const r16 = evaluateCondition(REQ16, lookup);
    const r17 = evaluateCondition(REQ17, lookup);
    // eslint-disable-next-line no-console
    console.log('REQ-16 over RHZ-12 fields:', JSON.stringify(r16));
    // eslint-disable-next-line no-console
    console.log('REQ-17 over RHZ-12 fields:', JSON.stringify(r17));
    expect(r16.kind).toBe('pending'); // vacuous on this worksheet
    expect(r17.kind).toBe('pending'); // vacuous on this worksheet
  });

  it('drives a FAIL care state (wrong dose, monthly interval violated, green cut allowed) → REQ-14 fires', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['duenger_gabe_g']]: { type: 'number', value: 10 }, // != 5
        [ws.fieldIds['duenger_intervall_monate']]: { type: 'number', value: 2 }, // != 1
        [ws.fieldIds['ersatz_pflanzen_periode_mon']]: { type: 'number', value: 6 }, // > 3
        [ws.fieldIds['halmschnitt_im_gruenen_zulaessig']]: { type: 'boolean', value: true }, // must be false
      },
    });
    // eslint-disable-next-line no-console
    console.log('OUT-OF-SPEC SAVE ok:', JSON.stringify(save.ok));
    expect(save.ok).toBe(true);

    const lookup = await gateLookup();
    const r14 = evaluateCondition(REQ14, lookup);
    // eslint-disable-next-line no-console
    console.log('FAIL-STATE REQ-14:', JSON.stringify(r14));
    expect(r14.kind).toBe('fail');

    expect(await persisted('duenger_gabe_g')).toBe(10);
    expect(await persisted('duenger_intervall_monate')).toBe(2);
    expect(await persisted('ersatz_pflanzen_periode_mon')).toBe(6);
    expect(await persisted('halmschnitt_im_gruenen_zulaessig')).toBe(true);
  });

  it('demonstrates REQ-16/17 ARE fireable when their (foreign) symbols are supplied — proving RHZ-12 placement is the defect', () => {
    // Supply the growth symbols directly (as if evaluated on RHZ-13/14/15) to show
    // the conditions themselves are sound — only their attachment to RHZ-12 is wrong.
    const passMap = new Map<string, number>([
      ['bestandsdichte_p_avg_12mon', 120],
      ['bestandsdichte_p_avg_18mon', 160],
      ['dichte_relativ_prozent', 80],
    ]);
    const lookup = (s: string) => (passMap.has(s) ? passMap.get(s)! : undefined);
    expect(evaluateCondition(REQ16, lookup).kind).toBe('pass');
    expect(evaluateCondition(REQ17, lookup).kind).toBe('pass');

    const failMap = new Map<string, number>([
      ['bestandsdichte_p_avg_12mon', 100],
      ['bestandsdichte_p_avg_18mon', 140],
      ['dichte_relativ_prozent', 70],
    ]);
    const flookup = (s: string) => (failMap.has(s) ? failMap.get(s)! : undefined);
    expect(evaluateCondition(REQ16, flookup).kind).toBe('fail');
    expect(evaluateCondition(REQ17, flookup).kind).toBe('fail');
  });
});
