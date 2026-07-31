/**
 * FLL revision · FLL-GAR-18 (Kunststoffbahnen aus PE / PELD/PEHD) verification.
 *
 * FLL-GAR-18 is a pure material-spec / data-collection worksheet: 0 equations,
 * 0 compliance requirements, 5 fields (3 number, 1 enum, 1 number). There is no
 * computable formula chain and no gate; the only drivable "chain" is the real
 * saveWorksheet persistence round-trip. This test enters Tab.24 / Tab.25 /
 * §6.4.2.1-attested values for every field through the REAL saveWorksheet and
 * asserts each persisted back unchanged — the same seam the browser uses.
 *
 * Source anchors (GAR.txt, PDF pp.94-96):
 *   - Tab.24 Nr.3 Dichte  "> 0,940" g/cm³
 *   - Tab.24 Nr.4 MFR     "≥ 1,0 / ≤ 3,0" g/10 min
 *   - Tab.24 Nr.5 Rußgehalt "2-3" %
 *   - Tab.25 load classes (PELD ≥0,8 / PELD ≥1,5|PEHD ≥1,0 / PEHD ≥2,0 / PEHD ≥2,5)
 *   - §6.4.2.1 "Die Nahtüberlappung sollte ... zwischen 100 und 150 mm betragen."
 */
// @vitest-environment node
import './_harness-env-fll-gar'; // top-level-await: starts PG + seeds full GAR BEFORE @/lib/db
import { describe, it, expect, afterAll } from 'vitest';
import { getFllGarHarness } from './_harness-env-fll-gar';

const { harness, fixture } = getFllGarHarness();
const sql = harness.sql;
const ws = fixture.worksheets['FLL-GAR-18'];

afterAll(async () => {
  await harness.stop();
});

async function readParam(fieldId: string) {
  const [row] = await sql<
    { value_text: string | null; value_number: string | null; value_enum: string | null }[]
  >`SELECT value_text, value_number, value_enum FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row;
}

describe('FLL-GAR-18 — real saveWorksheet persistence of all 5 fields (embedded PG)', () => {
  it('persists Tab.24 / Tab.25 / §6.4.2.1 attested values through the REAL save path', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const f = ws.fields;
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        // Tab.24 Nr.3: Dichte > 0,940 g/cm³ — in-spec sanity value
        [f['peeh_dichte_g_cm3']]: { type: 'number', value: 0.945 },
        // Tab.24 Nr.4: MFR ≥1,0 / ≤3,0 g/10min — in-spec sanity value
        [f['peeh_mfr']]: { type: 'number', value: 2.0 },
        // Tab.24 Nr.5: Rußgehalt 2-3 % — in-spec sanity value
        [f['peeh_russgehalt_pct']]: { type: 'number', value: 2.5 },
        // Tab.25: load class — 'hoch' (PEHD ≥2,0 mm, öffentliche Badeteiche)
        [f['pe_beanspruchung_klasse']]: { type: 'enum', value: 'hoch' },
        // §6.4.2.1: Nahtüberlappung zwischen 100 und 150 mm — in-range sanity value
        [f['naht_pe_ueberlappung_mm']]: { type: 'number', value: 120 },
      },
    });
    expect(res.ok).toBe(true);

    expect(Number((await readParam(f['peeh_dichte_g_cm3'])).value_number)).toBeCloseTo(0.945, 6);
    expect(Number((await readParam(f['peeh_mfr'])).value_number)).toBeCloseTo(2.0, 6);
    expect(Number((await readParam(f['peeh_russgehalt_pct'])).value_number)).toBeCloseTo(2.5, 6);
    expect((await readParam(f['pe_beanspruchung_klasse'])).value_enum).toBe('hoch');
    expect(Number((await readParam(f['naht_pe_ueberlappung_mm'])).value_number)).toBeCloseTo(120, 6);
  });
});
