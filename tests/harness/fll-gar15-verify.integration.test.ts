/**
 * FLL revision · FLL-GAR-15 (Bitumenbahnen) verification.
 *
 * FLL-GAR-15 is a pure data-collection worksheet: 0 equations, 0 compliance
 * requirements, 6 fields (2 number, 4 text). There is no computable formula
 * chain and no gate; the only drivable "chain" is the real saveWorksheet
 * persistence round-trip. This test enters §6.1-attested descriptive values for
 * every field through the REAL saveWorksheet and asserts each persisted back
 * unchanged — the same seam the browser uses.
 */
// @vitest-environment node
import './_harness-env-fll-gar'; // top-level-await: starts PG + seeds full GAR BEFORE @/lib/db
import { describe, it, expect, afterAll } from 'vitest';
import { getFllGarHarness } from './_harness-env-fll-gar';

const { harness, fixture } = getFllGarHarness();
const sql = harness.sql;
const ws = fixture.worksheets['FLL-GAR-15'];

afterAll(async () => {
  await harness.stop();
});

async function readParam(fieldId: string) {
  const [row] = await sql<
    { value_text: string | null; value_number: string | null }[]
  >`SELECT value_text, value_number FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row;
}

describe('FLL-GAR-15 — real saveWorksheet persistence of all 6 fields (embedded PG)', () => {
  it('persists §6.1 attested descriptive values through the REAL save path', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const f = ws.fields;
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        // Tab.19 Nr.10: PYE G 200 S4 (Polymerbitumenschweißbahn)
        [f['bb_bahnentyp']]: { type: 'text', value: 'PYE G 200 S4' },
        // §6.1.1.2: Bahnendicke abhängig von Stoffart (no fixed value printed) — sanity value
        [f['bb_dicke']]: { type: 'number', value: 4 },
        // §6.1.2: "Abdichtungen aus Bitumenbahnen sind i. d. R. mehrlagig herzustellen."
        [f['bb_lagen_anzahl']]: { type: 'number', value: 2 },
        // §6.1.2 Fügetechnik: Schweißverfahren
        [f['bb_verlegeart']]: { type: 'text', value: 'Schweißverfahren' },
        // §6.1.2: Naht-Überlappung mind. 80 mm
        [f['bb_nahtverbindung']]: { type: 'text', value: 'Naht >= 80 mm, Stoss/Anschluss >= 100 mm' },
        // Zugfestigkeit: no §6.1 attested numeric threshold (sanity value only)
        [f['bb_zugfestigkeit']]: { type: 'number', value: 900 },
      },
    });
    expect(res.ok).toBe(true);

    expect((await readParam(f['bb_bahnentyp'])).value_text).toBe('PYE G 200 S4');
    expect(Number((await readParam(f['bb_dicke'])).value_number)).toBeCloseTo(4, 6);
    expect(Number((await readParam(f['bb_lagen_anzahl'])).value_number)).toBeCloseTo(2, 6);
    expect((await readParam(f['bb_verlegeart'])).value_text).toBe('Schweißverfahren');
    expect((await readParam(f['bb_nahtverbindung'])).value_text).toBe(
      'Naht >= 80 mm, Stoss/Anschluss >= 100 mm',
    );
    expect(Number((await readParam(f['bb_zugfestigkeit'])).value_number)).toBeCloseTo(900, 6);
  });
});
