/**
 * FLL revision · FLL-GAR-05 (Einwirkungen und Beanspruchungen) verification.
 *
 * FLL-GAR-05 is a pure data-collection worksheet: 0 equations, 0 compliance
 * requirements, 7 fields (3 enum, 2 boolean, 1 number, 1 optional enum). There is
 * no computable formula chain and no gate; the only drivable "chain" is the real
 * saveWorksheet persistence round-trip. This test enters PDF-attested values
 * (Tab.18) for every field through the REAL saveWorksheet and asserts each
 * persisted back unchanged — the same seam the browser uses.
 */
// @vitest-environment node
import './_harness-env-fll-gar'; // top-level-await: starts PG + seeds full GAR BEFORE @/lib/db
import { describe, it, expect, afterAll } from 'vitest';
import { getFllGarHarness } from './_harness-env-fll-gar';

const { harness, fixture } = getFllGarHarness();
const sql = harness.sql;
const ws = fixture.worksheets['FLL-GAR-05'];

afterAll(async () => {
  await harness.stop();
});

async function readParam(fieldId: string) {
  const [row] = await sql<
    { value_enum: string | null; value_boolean: boolean | null; value_number: string | null }[]
  >`SELECT value_enum, value_boolean, value_number FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row;
}

describe('FLL-GAR-05 — real saveWorksheet persistence of all 7 fields (embedded PG)', () => {
  it('persists Tab.18 attested values through the REAL save path', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const f = ws.fields;
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [f['wassereinwirkungsklasse']]: { type: 'enum', value: 'W2-B' }, // Tab.18: <=10 m
        [f['rissklasse']]: { type: 'enum', value: 'R1-B' },              // Tab.18: <=0,2 mm
        [f['standortklasse']]: { type: 'enum', value: 'S1-B' },          // Tab.18: frei stehend
        [f['frosteinwirkung']]: { type: 'boolean', value: true },        // Sec.4.1/4.3
        [f['exposition']]: { type: 'enum', value: 'sonne' },             // Sec.4.1 (VC enum)
        [f['eisbildung_moeglich']]: { type: 'boolean', value: true },    // Sec.4.4
        [f['fuellhoehe_m']]: { type: 'number', value: 7.5 },             // <=10 m => W2-B
      },
    });
    expect(res.ok).toBe(true);

    expect((await readParam(f['wassereinwirkungsklasse'])).value_enum).toBe('W2-B');
    expect((await readParam(f['rissklasse'])).value_enum).toBe('R1-B');
    expect((await readParam(f['standortklasse'])).value_enum).toBe('S1-B');
    expect((await readParam(f['frosteinwirkung'])).value_boolean).toBe(true);
    expect((await readParam(f['exposition'])).value_enum).toBe('sonne');
    expect((await readParam(f['eisbildung_moeglich'])).value_boolean).toBe(true);
    expect(Number((await readParam(f['fuellhoehe_m'])).value_number)).toBeCloseTo(7.5, 6);
  });
});
