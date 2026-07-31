/**
 * FLL-GAR-27 (Inbetriebnahme) — EXHAUSTIVE per-worksheet verification (verify agent).
 *
 * Drives the ONE equation this worksheet carries — Anhang 1 (informativ) Q_NOT
 * Notüberlauf example, referencing DIN 1986-100 — through BOTH production seams:
 *   1. evaluateFormula (the exact client-compute the UI runs), and
 *   2. saveWorksheet (real persistence to project_parameters, embedded PG),
 * using the SOURCE-VERBATIM Düsseldorf worked example values (SR-1):
 *   r5,5 = 316 l/(s·ha), r5,100 = 607 l/(s·ha), A = 800 m², C = 1
 *   → Q_NOT = (607 − 316·1) · (800/10000) = 291·0.08 = 23.28 l/s   (PDF: "23,28 l/sec")
 *
 * Uses the GENERIC full-project seedFllGar (all 29 worksheets) so the chain runs
 * against the ACTUAL prod topology/ids for FLL-GAR-27 (not the hand-shaped
 * seed-fll-gar27 fixture, whose r/A inputs are NOT the source example values).
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000f27';

const harness: Harness = await startHarness();
process.env.DATABASE_URL = harness.databaseUrl;
process.env.BYPASS_AUTH = 'true';
process.env.BYPASS_AUTH_USER_ID = HARNESS_USER_ID;
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'harness-service-role-key';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'harness-anon-key';
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';

const fixture: SeededFllGarFixture = await seedFllGar(harness.sql, HARNESS_USER_ID);

import { describe, it, expect, afterAll } from 'vitest';
import { evaluateFormula } from '@/lib/eval/formula';

const sql = harness.sql;
const EQ_ID = '02387918-c243-4a7e-b38d-993c65f79754';
const FORMULA = 'Q_NOT = (r_5_100 - r_5_5 * C) * (A / 10000)';

afterAll(async () => {
  await harness.stop();
});

function ws() {
  const w = fixture.worksheets['FLL-GAR-27'];
  if (!w) throw new Error('FLL-GAR-27 not in fixture');
  return w;
}

/** Compute Q_NOT via the real client engine with the PDF Düsseldorf inputs. */
function clientComputesQNot(): number {
  const state = evaluateFormula({
    equationId: EQ_ID,
    formula: FORMULA,
    inputSymbols: ['r_5_100', 'r_5_5', 'C', 'A'],
    outputSymbol: 'Q_NOT',
    inputs: [
      { symbol: 'r_5_100', value: 607, unit: 'l/(s·ha)' },
      { symbol: 'r_5_5', value: 316, unit: 'l/(s·ha)' },
      { symbol: 'C', value: 1, unit: '-' },
      { symbol: 'A', value: 800, unit: 'm^2' },
    ],
  });
  if (state.kind !== 'computed') {
    throw new Error(`engine did not compute Q_NOT: ${state.kind} ${JSON.stringify(state)}`);
  }
  return state.value;
}

async function persisted(fieldId: string) {
  const [row] = await sql<{ value_number: string | null; value_date: string | null; value_text: string | null; value_boolean: boolean | null }[]>`
    SELECT value_number, value_date, value_text, value_boolean FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row ?? null;
}

describe('FLL-GAR-27 (Inbetriebnahme) — real compute + real saveWorksheet (embedded PG)', () => {
  it('exposes the 12 fields incl. the Q_NOT chain symbols', () => {
    const w = ws();
    for (const sym of ['A', 'C', 'r_5_100', 'r_5_5', 'Q_NOT', 'ibn_datum', 'ibn_dichtheit_bestanden']) {
      expect(w.fields[sym]).toBeTruthy();
    }
  });

  it('CHAIN Q_NOT — real engine reproduces the PDF Düsseldorf worked example = 23.28 l/s', () => {
    expect(clientComputesQNot()).toBeCloseTo(23.28, 6);
  });

  it('CHAIN Q_NOT — corrected/source chain persists 23.28 through REAL saveWorksheet', async () => {
    const w = ws();
    const computed = clientComputesQNot();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['r_5_100']]: { type: 'number', value: 607 },
        [w.fields['r_5_5']]: { type: 'number', value: 316 },
        [w.fields['C']]: { type: 'number', value: 1 },
        [w.fields['A']]: { type: 'number', value: 800 },
        [w.fields['Q_NOT']]: { type: 'number', value: computed },
      },
    });
    expect(res.ok).toBe(true);
    const q = await persisted(w.fields['Q_NOT']);
    expect(q?.value_number).not.toBeNull();
    expect(Number(q?.value_number)).toBeCloseTo(23.28, 6);
  });

  it('COMMISSIONING fields persist through REAL saveWorksheet (date + boolean)', async () => {
    const w = ws();
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: w.instanceId,
      values: {
        [w.fields['ibn_datum']]: { type: 'date', value: '2024-06-01' },
        [w.fields['ibn_dichtheit_bestanden']]: { type: 'boolean', value: true },
        [w.fields['ibn_befuellung_dauer']]: { type: 'number', value: 3 },
      },
    });
    expect(res.ok).toBe(true);
    const d = await persisted(w.fields['ibn_datum']);
    expect(new Date(d?.value_date as string).getUTCFullYear()).toBe(2024);
    expect(new Date(d?.value_date as string).getUTCMonth()).toBe(5); // June (0-based)
    const b = await persisted(w.fields['ibn_dichtheit_bestanden']);
    expect(b?.value_boolean).toBe(true);
  });
});
