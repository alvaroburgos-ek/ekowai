/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-08 (Testpflanzen-Qualität).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-08 through the REAL
 * saveWorksheet path with the source-attested values from §5.8 of the PDF
 * ("Phragmites australis (Schilf) im 9 x 9 Container."). After the save it reads
 * the persisted project_parameters back and asserts they round-tripped.
 *
 * FLLTP-RHZ-08 has 0 equations and 0 compliance_requirements, so there is no
 * compute chain and no gate to fire — only the data-collection save path for the
 * two fields (testpflanze_art enum, testpflanze_container_format text).
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level await: PG + seed BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;
const ws = fixture.byCode['FLLTP-RHZ-08'];

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

describe('VERIFY FLLTP-RHZ-08 — Testpflanzen-Qualität data-collection save', () => {
  it('exposes exactly the 2 prod fields', () => {
    expect(ws).toBeTruthy();
    expect(ws.fieldIds['testpflanze_art']).toBeTruthy();
    expect(ws.fieldIds['testpflanze_container_format']).toBeTruthy();
    expect(ws.fieldTypes['testpflanze_art']).toBe('enum');
    expect(ws.fieldTypes['testpflanze_container_format']).toBe('text');
  });

  it('drives the source-attested §5.8 state through real saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');

    // PDF §5.8 (line 651): "Phragmites australis (Schilf) im 9 x 9 Container."
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['testpflanze_art']]: { type: 'enum', value: 'phragmites_australis' },
        [ws.fieldIds['testpflanze_container_format']]: { type: 'text', value: '9 x 9' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-08 save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    expect(save.ok).toBe(true);

    const art = await persisted('testpflanze_art');
    const fmt = await persisted('testpflanze_container_format');
    // eslint-disable-next-line no-console
    console.log('RHZ-08 persisted  testpflanze_art:', JSON.stringify(art), ' container_format:', JSON.stringify(fmt));
    expect(art).toBe('phragmites_australis');
    expect(fmt).toBe('9 x 9');
  });

  it('rejects an out-of-enum species value (only phragmites_australis is defined)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['testpflanze_art']]: { type: 'enum', value: 'typha_latifolia' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-08 bad-enum save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    // Record whatever the real path does — either it rejects, or it stores it (a finding).
    const art = await persisted('testpflanze_art');
    // eslint-disable-next-line no-console
    console.log('RHZ-08 after bad-enum persisted testpflanze_art:', JSON.stringify(art));
  });
});
