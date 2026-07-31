/**
 * VERIFY FLL-GAR-25 (Pruefungen: Eignung / Eigen- / Fremd- / Kontroll-) —
 * per-worksheet exhaustive check.
 *
 * FLL-GAR-25 has 0 equations, 4 fields, 3 compliance requirements
 * (REQ-26 block, REQ-27 block, REQ-28 warn). No math, no worked example.
 * The "chains" here are:
 *   (a) drive the 4 local fields through the REAL saveWorksheet + assert persist;
 *   (b) exercise each gate in a PASS and a FAIL state via the real
 *       checkApprovalGate (block gates) / evaluateCondition (warn gate),
 *       driving the cross-worksheet condition fields (abnahme_datum on GAR-26,
 *       ibn_datum/ibn_befuellung_methode on GAR-27) through the project-wide
 *       fallback resolution.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-0000000000e5';

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

const sql = harness.sql;
const ws = fixture.worksheets['FLL-GAR-25'];
const ws26 = fixture.worksheets['FLL-GAR-26'];
const ws27 = fixture.worksheets['FLL-GAR-27'];

afterAll(async () => {
  await harness.stop();
});

const EXPECTED_FIELDS = [
  'eignungspruefung_durchgefuehrt',
  'fremdueberwachung_zertifikat',
  'kontrollpruefung_dokumentiert',
  'attest_fll_gar_25_req_26',
];

describe('FLL-GAR-25 — topology', () => {
  it('exposes all 4 GAR-25 fields', () => {
    for (const sym of EXPECTED_FIELDS) {
      expect(ws.fields[sym]).toBeTruthy();
    }
    expect(Object.keys(ws.fields).length).toBe(4);
  });
});

describe('FLL-GAR-25 — CHAIN A: local test-cascade fields persist through real saveWorksheet', () => {
  it('drives all 4 fields (full cascade documented) and persists', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['eignungspruefung_durchgefuehrt']]: { type: 'boolean', value: true },
        [ws.fields['fremdueberwachung_zertifikat']]: { type: 'text', value: 'ZERT-2024-0815' },
        [ws.fields['kontrollpruefung_dokumentiert']]: { type: 'boolean', value: true },
        [ws.fields['attest_fll_gar_25_req_26']]: { type: 'boolean', value: true },
      },
    });
    expect(res.ok).toBe(true);

    const rows = await sql<{ field_id: string; value_boolean: boolean | null; value_text: string | null }[]>`
      SELECT field_id, value_boolean, value_text
      FROM project_parameters
      WHERE project_id = ${fixture.projectId}
        AND field_id IN ${sql(EXPECTED_FIELDS.map((s) => ws.fields[s]))}`;
    const by = new Map(rows.map((r) => [r.field_id, r]));

    expect(by.get(ws.fields['eignungspruefung_durchgefuehrt'])?.value_boolean).toBe(true);
    expect(by.get(ws.fields['fremdueberwachung_zertifikat'])?.value_text).toBe('ZERT-2024-0815');
    expect(by.get(ws.fields['kontrollpruefung_dokumentiert'])?.value_boolean).toBe(true);
    expect(by.get(ws.fields['attest_fll_gar_25_req_26'])?.value_boolean).toBe(true);
  });
});

describe('FLL-GAR-25 — GATE REQ-26 (block): attest_fll_gar_25_req_26 == True', () => {
  it('FAIL state: attest=false ⇒ checkApprovalGate reports REQ-26 failing', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    // set the required local booleans present (so REQ-26 is the isolated fail),
    // attest = false to trigger REQ-26.
    await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['eignungspruefung_durchgefuehrt']]: { type: 'boolean', value: true },
        [ws.fields['kontrollpruefung_dokumentiert']]: { type: 'boolean', value: true },
        [ws.fields['attest_fll_gar_25_req_26']]: { type: 'boolean', value: false },
      },
    });
    const gate = await checkApprovalGate(ws.instanceId);
    const codes = gate.failingBlockConditions.map((c) => c.code);
    expect(codes).toContain('REQ-26');
  });

  it('PASS state: attest=true ⇒ REQ-26 no longer failing', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fields['attest_fll_gar_25_req_26']]: { type: 'boolean', value: true },
      },
    });
    const gate = await checkApprovalGate(ws.instanceId);
    const codes = gate.failingBlockConditions.map((c) => c.code);
    expect(codes).not.toContain('REQ-26');
  });
});

describe('FLL-GAR-25 — GATE REQ-27 (block): abnahme_datum IS NOT NULL (cross-worksheet → GAR-26)', () => {
  it('FAIL state: abnahme_datum blank on GAR-26 ⇒ REQ-27 fails on GAR-25 via project fallback', async () => {
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    // seeded default for a date field is '2024-01-01' (present). To exercise the
    // FAIL path we clear it to null on GAR-26.
    await sql`UPDATE project_parameters SET value_date = NULL
              WHERE project_id = ${fixture.projectId} AND field_id = ${ws26.fields['abnahme_datum']}`;
    const gate = await checkApprovalGate(ws.instanceId);
    const codes = gate.failingBlockConditions.map((c) => c.code);
    expect(codes).toContain('REQ-27');
  });

  it('PASS state: abnahme_datum set on GAR-26 ⇒ REQ-27 passes on GAR-25 via project fallback', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    await saveWorksheet({
      instanceId: ws26.instanceId,
      values: {
        [ws26.fields['abnahme_datum']]: { type: 'date', value: '2024-06-15' },
      },
    });
    const gate = await checkApprovalGate(ws.instanceId);
    const codes = gate.failingBlockConditions.map((c) => c.code);
    expect(codes).not.toContain('REQ-27');
  });
});

describe('FLL-GAR-25 — GATE REQ-28 (warn): ibn_datum IS NOT NULL AND ibn_befuellung_methode IS NOT EMPTY', () => {
  it('is warn-severity ⇒ NOT evaluated by checkApprovalGate (block-only) — evaluate directly', async () => {
    const { evaluateCondition } = await import('@/lib/compliance/evaluate');
    const cond = 'ibn_datum IS NOT NULL AND ibn_befuellung_methode IS NOT EMPTY';

    // FAIL: both blank
    const fail = evaluateCondition(cond, (s) => (s === 'ibn_datum' ? null : s === 'ibn_befuellung_methode' ? '' : undefined));
    expect(fail.kind).toBe('fail');

    // PASS: both present
    const pass = evaluateCondition(cond, (s) => (s === 'ibn_datum' ? '2024-06-20' : s === 'ibn_befuellung_methode' ? 'langsam-befuellt' : undefined));
    expect(pass.kind).toBe('pass');
  });

  it('confirms checkApprovalGate ignores REQ-28 (warn) even when its fields are blank', async () => {
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    // Clear GAR-27 ibn fields; REQ-28 must NOT appear as a failing BLOCK condition.
    await sql`UPDATE project_parameters SET value_date = NULL
              WHERE project_id = ${fixture.projectId} AND field_id = ${ws27.fields['ibn_datum']}`;
    await sql`UPDATE project_parameters SET value_text = NULL
              WHERE project_id = ${fixture.projectId} AND field_id = ${ws27.fields['ibn_befuellung_methode']}`;
    const gate = await checkApprovalGate(ws.instanceId);
    const codes = gate.failingBlockConditions.map((c) => c.code);
    expect(codes).not.toContain('REQ-28');
  });
});
