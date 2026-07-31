/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-02 (Produkt- und Herstellerangaben).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-02 through the REAL
 * saveWorksheet path with pass + fail states. After each save it reads the
 * persisted project_parameters back and evaluates BOTH compliance gates
 * (REQ-03, REQ-04) through the REAL evaluateCondition. This exercises the two
 * gates against states that pass AND (where possible) fail them, proving whether
 * each gate is fireable or vacuous.
 *
 * FLLTP-RHZ-02 has 0 equations, so there is no compute chain to run — only the
 * data-collection save path + the two block gates.
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level await: PG + seed BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';
import { evaluateCondition } from '@/lib/compliance/evaluate';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;
const ws = fixture.byCode['FLLTP-RHZ-02'];

afterAll(async () => {
  await harness.stop();
});

// Read the persisted value for a field symbol, typed to what the gate DSL sees.
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
  return row.value_text; // may be '' or null
}

// Build a symbol→value lookup over the persisted RHZ-02 row set for the gate DSL.
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

const REQ03 = 'wachstumshemmende_wirkstoffe != null';
const REQ04 = 'mehrschichtprodukt == false OR (schutzschicht_definition != null)';

describe('VERIFY FLLTP-RHZ-02 — data-collection save + 2 gates through real path', () => {
  it('drives a PASS state through real saveWorksheet, both gates pass', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // A well-formed product record: not multilayer, no protective-layer needed,
    // growth-inhibitor flag explicitly set false.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['produktbezeichnung']]: { type: 'text', value: 'TestDichtungsbahn X1' },
        [ws.fieldIds['hersteller_name']]: { type: 'text', value: 'Muster GmbH, Bonn' },
        [ws.fieldIds['abdichtungsart']]: { type: 'enum', value: 'kunststoffbahn' },
        [ws.fieldIds['ist_bahnenartig']]: { type: 'boolean', value: true },
        [ws.fieldIds['wachstumshemmende_wirkstoffe']]: { type: 'boolean', value: false },
        [ws.fieldIds['mehrschichtprodukt']]: { type: 'boolean', value: false },
        [ws.fieldIds['fuegetechniken_angewandt']]: { type: 'text', value: 'Warmgasschweißung' },
      },
    });
    expect(save.ok).toBe(true);

    const lookup = await gateLookup();
    const r03 = evaluateCondition(REQ03, lookup);
    const r04 = evaluateCondition(REQ04, lookup);
    // eslint-disable-next-line no-console
    console.log('PASS-STATE  REQ-03:', JSON.stringify(r03), ' REQ-04:', JSON.stringify(r04));
    expect(r03.kind).toBe('pass');
    expect(r04.kind).toBe('pass'); // mehrschichtprodukt==false → left disjunct true
  });

  it('drives a would-be-FAIL state for REQ-04 (multilayer, no protective layer)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // Multilayer product but protective-layer definition left blank → REQ-04 must fail.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['mehrschichtprodukt']]: { type: 'boolean', value: true },
        [ws.fieldIds['schutzschicht_definition']]: { type: 'text', value: null },
        // keep the growth-inhibitor flag set so REQ-03 is not pending
        [ws.fieldIds['wachstumshemmende_wirkstoffe']]: { type: 'boolean', value: true },
      },
    });
    expect(save.ok).toBe(true);

    const lookup = await gateLookup();
    const r03 = evaluateCondition(REQ03, lookup);
    const r04FromDb = evaluateCondition(REQ04, lookup);
    // eslint-disable-next-line no-console
    console.log('FAIL-STATE(from DB)  REQ-03:', JSON.stringify(r03), ' REQ-04:', JSON.stringify(r04FromDb));

    // Confirm the multilayer / blank protective-layer state actually persisted.
    expect(await persisted('mehrschichtprodukt')).toBe(true);
    const sd = await persisted('schutzschicht_definition');
    // saveWorksheet persists a text null as an empty-ish value; capture what it is.
    // eslint-disable-next-line no-console
    console.log('persisted schutzschicht_definition =', JSON.stringify(sd));

    // FINDING: from the persisted DB state the gate returns PENDING, not FAIL,
    // because the DSL treats a blank/empty schutzschicht_definition as *missing*
    // (evaluate.ts compare: v==='' → missing) → the OR is false-OR-missing →
    // pending. A blank protective-layer field therefore does NOT hard-fail REQ-04.
    expect(r04FromDb.kind).toBe('pending');
    expect(r03.kind).toBe('pass');

    // But REQ-04 IS fireable with a genuinely populated-yet-wrong shape: if the
    // protective-layer value is a true SQL NULL (not empty string), the DSL still
    // treats it as missing. The only way REQ-04 returns 'fail' is when the right
    // disjunct evaluates false with a NON-empty value that is nonetheless != null
    // is impossible (any non-empty value satisfies !=null). So REQ-04 can only be
    // pass (mehrschicht=false OR schutz present) or pending (mehrschicht=true AND
    // schutz blank) — it NEVER returns 'fail'. Prove it directly across every
    // reachable (mehrschichtprodukt, schutzschicht_definition) combination:
    const combos: Array<[boolean, string | null]> = [
      [false, null], [false, ''], [false, 'Deckschicht'],
      [true, null], [true, ''], [true, 'Deckschicht'],
    ];
    const verdicts = combos.map(([m, s]) => {
      const lk = (sym: string) =>
        sym === 'mehrschichtprodukt' ? m : sym === 'schutzschicht_definition' ? s : undefined;
      return { m, s, kind: evaluateCondition(REQ04, lk).kind };
    });
    // eslint-disable-next-line no-console
    console.log('REQ-04 across combos:', JSON.stringify(verdicts));
    // No combo yields 'fail' — the intended block state resolves to 'pending'.
    expect(verdicts.some((v) => v.kind === 'fail')).toBe(false);
    expect(verdicts.some((v) => v.kind === 'pending')).toBe(true); // the block-intent state
    expect(verdicts.some((v) => v.kind === 'pass')).toBe(true);
  });

  it('proves REQ-03 is VACUOUS — no reachable state makes it fail', async () => {
    // REQ-03 = "wachstumshemmende_wirkstoffe != null". The field is a REQUIRED
    // boolean, so the only three reachable persisted values are true, false, or
    // absent. Evaluate all three directly through the real DSL:
    const asTrue = evaluateCondition(REQ03, (s) => (s === 'wachstumshemmende_wirkstoffe' ? true : undefined));
    const asFalse = evaluateCondition(REQ03, (s) => (s === 'wachstumshemmende_wirkstoffe' ? false : undefined));
    const asAbsent = evaluateCondition(REQ03, () => undefined);
    // eslint-disable-next-line no-console
    console.log('REQ-03 vacuity  true:', asTrue.kind, ' false:', asFalse.kind, ' absent:', asAbsent.kind);

    expect(asTrue.kind).toBe('pass');
    expect(asFalse.kind).toBe('pass');   // false != null → PASS (a set boolean is never "null")
    expect(asAbsent.kind).toBe('pending'); // never 'fail'
    // => REQ-03 can NEVER return {kind:'fail'}. It is a dead/vacuous block gate.
  });
});
