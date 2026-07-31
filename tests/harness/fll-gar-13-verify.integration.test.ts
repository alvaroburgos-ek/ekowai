// @vitest-environment node
import './_harness-env-fll-gar13';
import { describe, it, expect, afterAll } from 'vitest';
import { getHarness } from './_harness-env-fll-gar13';

const { harness, fixture } = getHarness();
const sql = harness.sql;

afterAll(async () => {
  await harness.stop();
});

describe('FLL-GAR-13 (Mineralisch mit Bitumen / Asphalt) — real saveWorksheet persistence', () => {
  it('persists all 6 fields through the real save path (PDF-attested inputs)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const ws = fixture.worksheets['FLL-GAR-13'];
    expect(ws).toBeTruthy();
    expect(ws.code).toBe('FLL-GAR-13');

    const f = ws.fields;
    // PDF-attested values (Sec.5.4.1.1 / Tab.12):
    //  - Hohlraumgehalt <= 3 Vol.-% (use 3 = the pass-boundary value)
    //  - Asphaltbeton Schichtdicke mind. 40 mm = 4 cm (asph_dicke in cm)
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [f['hohlraumgehalt_asphaltbeton_vol_pct']]: { type: 'number', value: 3 },
        [f['asph_dicke']]: { type: 'number', value: 4 },
        [f['asph_bindemittel']]: { type: 'text', value: 'Bitumen (Asphaltbeton)' },
        [f['asph_kornverteilung']]: { type: 'text', value: 'TL Asphalt-StB 07' },
        [f['asph_verdichtungsgrad']]: { type: 'number', value: 97 },
        [f['asph_nahttechnik']]: { type: 'text', value: 'Nahtueberdeckung' },
      },
    });
    expect(res.ok).toBe(true);

    const rows = await sql<{ field_id: string; value_number: string | null; value_text: string | null }[]>`
      SELECT field_id, value_number, value_text FROM project_parameters
      WHERE project_id = ${fixture.projectId}
        AND field_id IN (${f['hohlraumgehalt_asphaltbeton_vol_pct']}, ${f['asph_dicke']},
                         ${f['asph_bindemittel']}, ${f['asph_kornverteilung']},
                         ${f['asph_verdichtungsgrad']}, ${f['asph_nahttechnik']})`;
    const by = (id: string) => rows.find((r) => r.field_id === id);

    expect(Number(by(f['hohlraumgehalt_asphaltbeton_vol_pct'])!.value_number)).toBe(3);
    expect(Number(by(f['asph_dicke'])!.value_number)).toBe(4);
    expect(Number(by(f['asph_verdichtungsgrad'])!.value_number)).toBe(97);
    expect(by(f['asph_bindemittel'])!.value_text).toBe('Bitumen (Asphaltbeton)');

    // Report field inventory count for the ledger.
    expect(Object.keys(f).length).toBe(6);
  });
});
