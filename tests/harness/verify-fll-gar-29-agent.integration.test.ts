/**
 * VERIFY FLL-GAR-29 (Konformitaetszusammenfassung & Freigabe) —
 * per-worksheet exhaustive check.
 *
 * FLL-GAR-29 has 0 equations, 5 fields, 1 compliance requirement (REQ-30, block).
 * It is a conformity-summary / engineer+customer sign-off worksheet (no math).
 * The "chain" here is: drive the enum + text + boolean + date fields through the
 * REAL saveWorksheet and assert they persist. There are no equations to compute.
 * The gate REQ-30 (`compliance_verdict_final in {compliant, compliant_with_conditions}`)
 * is exercised against a PASS state, a FAIL state, and a PENDING (unset) state via
 * the production evaluateCondition().
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000e9';

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
const ws = fixture.worksheets['FLL-GAR-29'];

const REQ30_CONDITION = 'compliance_verdict_final in {compliant, compliant_with_conditions}';

const EXPECTED_FIELDS = [
  'compliance_verdict_final',
  'konf_abdichtungssystem_gewaehlt',
  'konf_alle_nachweise_bestanden',
  'konf_freigabe_datum',
  'konf_bemerkungen',
];

afterAll(async () => {
  await harness.stop();
});

describe('FLL-GAR-29 — topology', () => {
  it('exposes all 5 GAR-29 fields', () => {
    for (const sym of EXPECTED_FIELDS) {
      expect(ws.fields[sym]).toBeTruthy();
    }
    expect(Object.keys(ws.fields).length).toBe(5);
  });
});

describe('FLL-GAR-29 — sign-off state persists through real saveWorksheet', () => {
  it('drives all 5 fields (compliant verdict) and persists', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['compliance_verdict_final']]: { type: 'enum', value: 'compliant' },
        [ws.fields['konf_abdichtungssystem_gewaehlt']]: { type: 'text', value: 'GTD (Bentonit-Ton)' },
        [ws.fields['konf_alle_nachweise_bestanden']]: { type: 'boolean', value: true },
        [ws.fields['konf_freigabe_datum']]: { type: 'date', value: '2026-07-23' },
        [ws.fields['konf_bemerkungen']]: { type: 'text', value: 'Alle Nachweise erbracht.' },
      },
    });
    expect(res.ok).toBe(true);

    const rows = await sql<{ field_id: string; value_number: string | null; value_enum: string | null; value_text: string | null; value_boolean: boolean | null; value_date: string | null }[]>`
      SELECT field_id, value_number, value_enum, value_text, value_boolean, value_date
      FROM project_parameters
      WHERE project_id = ${fixture.projectId}
        AND field_id IN ${sql(EXPECTED_FIELDS.map((s) => ws.fields[s]))}`;
    const by = new Map(rows.map((r) => [r.field_id, r]));

    const verdict = by.get(ws.fields['compliance_verdict_final']);
    expect(verdict?.value_enum ?? verdict?.value_text).toBe('compliant');

    const sys = by.get(ws.fields['konf_abdichtungssystem_gewaehlt']);
    expect(sys?.value_text).toBe('GTD (Bentonit-Ton)');

    expect(by.get(ws.fields['konf_alle_nachweise_bestanden'])?.value_boolean).toBe(true);

    const dt = by.get(ws.fields['konf_freigabe_datum']);
    const dtRaw = dt?.value_date ?? dt?.value_text;
    expect(dtRaw).toBeTruthy();
    const iso = new Date(dtRaw as string).toISOString().slice(0, 10);
    expect(iso).toBe('2026-07-23');

    const rem = by.get(ws.fields['konf_bemerkungen']);
    expect(rem?.value_text).toBe('Alle Nachweise erbracht.');
  });

  it('re-drives to a not_compliant / conditions-not-met sign-off state', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['compliance_verdict_final']]: { type: 'enum', value: 'not_compliant' },
        [ws.fields['konf_alle_nachweise_bestanden']]: { type: 'boolean', value: false },
      },
    });
    expect(res.ok).toBe(true);

    const [v] = await sql<{ value_enum: string | null; value_text: string | null }[]>`
      SELECT value_enum, value_text FROM project_parameters
      WHERE project_id = ${fixture.projectId} AND field_id = ${ws.fields['compliance_verdict_final']}`;
    expect(v?.value_enum ?? v?.value_text).toBe('not_compliant');
  });
});

describe('FLL-GAR-29 — REQ-30 gate (block) exercised pass + fail + pending', () => {
  const lookup = (state: Record<string, string | null | undefined>) => (sym: string) => state[sym];

  it('REQ-30 PASSES when verdict = compliant', () => {
    const r = evaluateCondition(REQ30_CONDITION, lookup({ compliance_verdict_final: 'compliant' }));
    expect(r.kind).toBe('pass');
  });

  it('REQ-30 PASSES when verdict = compliant_with_conditions', () => {
    const r = evaluateCondition(REQ30_CONDITION, lookup({ compliance_verdict_final: 'compliant_with_conditions' }));
    expect(r.kind).toBe('pass');
  });

  it('REQ-30 FAILS when verdict = not_compliant', () => {
    const r = evaluateCondition(REQ30_CONDITION, lookup({ compliance_verdict_final: 'not_compliant' }));
    expect(r.kind).toBe('fail');
  });

  it('REQ-30 FAILS when verdict = insufficient_data', () => {
    const r = evaluateCondition(REQ30_CONDITION, lookup({ compliance_verdict_final: 'insufficient_data' }));
    expect(r.kind).toBe('fail');
  });

  it('REQ-30 is PENDING (not vacuous) when verdict is unset', () => {
    const r = evaluateCondition(REQ30_CONDITION, lookup({}));
    expect(r.kind).toBe('pending');
    if (r.kind === 'pending') expect(r.missingSymbols).toContain('compliance_verdict_final');
  });
});
