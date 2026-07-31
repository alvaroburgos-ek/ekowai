/**
 * FLL revision · FLL-GAR-03 (Baurechtliche Anforderungen) verification.
 *
 * FLL-GAR-03 is a pure data-collection worksheet: 0 equations, 0 compliance
 * requirements, 2 boolean fields (lbo_genehmigung_erforderlich,
 * whg_einleitung_genehmigung). There is no computable formula chain and no gate;
 * the only drivable "chain" is the real saveWorksheet persistence round-trip.
 * This test drives BOTH boolean states (true/true and false/false) through the
 * REAL saveWorksheet and asserts each persists back unchanged — the same seam the
 * browser uses. Source: FLL-GAR-2023 Sec.4.1 Nutzungs-Aspektliste
 * ("baurechtliche Genehmigungen gemäß LBO, Einleitung von Überschusswasser in
 * natürliche Gewässer gemäß WHG") + Sec.4.2 Baurechtliche Anforderungen.
 */
// @vitest-environment node
import './_harness-env-fll-gar'; // top-level-await: starts PG + seeds full GAR BEFORE @/lib/db
import { describe, it, expect, afterAll } from 'vitest';
import { getFllGarHarness } from './_harness-env-fll-gar';

const { harness, fixture } = getFllGarHarness();
const sql = harness.sql;
const ws = fixture.worksheets['FLL-GAR-03'];

afterAll(async () => {
  await harness.stop();
});

async function readBool(fieldId: string) {
  const [row] = await sql<{ value_boolean: boolean | null }[]>`
    SELECT value_boolean FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row?.value_boolean ?? null;
}

describe('FLL-GAR-03 — real saveWorksheet persistence of both permit booleans (embedded PG)', () => {
  it('exposes the 2 boolean permit fields', () => {
    expect(ws).toBeTruthy();
    expect(ws.fields['lbo_genehmigung_erforderlich']).toBeTruthy();
    expect(ws.fields['whg_einleitung_genehmigung']).toBeTruthy();
  });

  it('persists TRUE/TRUE (both permits required) through the REAL save path', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const f = ws.fields;
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [f['lbo_genehmigung_erforderlich']]: { type: 'boolean', value: true },
        [f['whg_einleitung_genehmigung']]: { type: 'boolean', value: true },
      },
    });
    expect(res.ok).toBe(true);
    expect(await readBool(f['lbo_genehmigung_erforderlich'])).toBe(true);
    expect(await readBool(f['whg_einleitung_genehmigung'])).toBe(true);
  });

  it('persists FALSE/FALSE (no permits) through the REAL save path', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const f = ws.fields;
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [f['lbo_genehmigung_erforderlich']]: { type: 'boolean', value: false },
        [f['whg_einleitung_genehmigung']]: { type: 'boolean', value: false },
      },
    });
    expect(res.ok).toBe(true);
    expect(await readBool(f['lbo_genehmigung_erforderlich'])).toBe(false);
    expect(await readBool(f['whg_einleitung_genehmigung'])).toBe(false);
  });
});
