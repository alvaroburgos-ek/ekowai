/**
 * VERIFY FLL-GAR-09 (Abdichtungssystem Auswahl) — per-worksheet exhaustive check.
 *
 * FLL-GAR-09 has 0 equations, 5 fields, 1 compliance requirement (REQ-10,
 * ce_kennzeichnung_geprueft == true). It is a selection/classification worksheet
 * (no math), so the "chain" here is: drive the enum + boolean fields through the
 * REAL saveWorksheet and assert they persist, then exercise the REQ-10 gate
 * condition through the REAL evaluateCondition in both a PASS and a FAIL state.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000f9';

// Bring up PG + point env BEFORE @/lib/db loads.
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
import { evaluateCondition } from '@/lib/compliance/evaluate';

const sql = harness.sql;
const ws = fixture.worksheets['FLL-GAR-09'];

afterAll(async () => {
  await harness.stop();
});

const REQ10 = 'ce_kennzeichnung_geprueft == true';

describe('FLL-GAR-09 — fields persist through real saveWorksheet', () => {
  it('exposes the 5 GAR-09 fields', () => {
    for (const sym of [
      'abdichtungs_art', 'anzahl_lagen', 'dichtigkeitsnachweis_required',
      'wurzel_rhizomfestigkeit_required', 'ce_kennzeichnung_geprueft',
    ]) {
      expect(ws.fields[sym]).toBeTruthy();
    }
  });

  it('saveWorksheet persists an enum selection + booleans + number', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['abdichtungs_art']]: { type: 'enum', value: 'bahn_kunststoff_elastomer' },
        [ws.fields['anzahl_lagen']]: { type: 'number', value: 2 },
        [ws.fields['dichtigkeitsnachweis_required']]: { type: 'boolean', value: true },
        [ws.fields['wurzel_rhizomfestigkeit_required']]: { type: 'boolean', value: true },
        [ws.fields['ce_kennzeichnung_geprueft']]: { type: 'boolean', value: true },
      },
    });
    expect(res.ok).toBe(true);

    const [enumRow] = await sql<{ value_text: string | null; value_enum: string | null }[]>`
      SELECT value_text, value_enum FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${ws.fields['abdichtungs_art']}`;
    // enum stored either in value_enum or value_text depending on schema
    const enumStored = enumRow?.value_enum ?? enumRow?.value_text;
    expect(enumStored).toBe('bahn_kunststoff_elastomer');

    const [ceRow] = await sql<{ value_boolean: boolean | null }[]>`
      SELECT value_boolean FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${ws.fields['ce_kennzeichnung_geprueft']}`;
    expect(ceRow?.value_boolean).toBe(true);

    const [nRow] = await sql<{ value_number: string | null }[]>`
      SELECT value_number FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${ws.fields['anzahl_lagen']}`;
    expect(Number(nRow?.value_number)).toBe(2);
  });
});

describe('FLL-GAR-09 REQ-10 gate — real evaluateCondition, PASS + FAIL + PENDING', () => {
  it('condition PARSES (not manual/vacuous)', () => {
    const r = evaluateCondition(REQ10, () => true);
    expect(r.kind).not.toBe('manual');
  });

  it('PASS state: ce_kennzeichnung_geprueft == true → pass', () => {
    const r = evaluateCondition(REQ10, (s) => (s === 'ce_kennzeichnung_geprueft' ? true : undefined));
    expect(r.kind).toBe('pass');
  });

  it('FAIL state: ce_kennzeichnung_geprueft == false → fail', () => {
    const r = evaluateCondition(REQ10, (s) => (s === 'ce_kennzeichnung_geprueft' ? false : undefined));
    expect(r.kind).toBe('fail');
  });

  it('PENDING state: symbol missing → pending (not a false fail)', () => {
    const r = evaluateCondition(REQ10, () => undefined);
    expect(r.kind).toBe('pending');
  });
});
