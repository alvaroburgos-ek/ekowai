/**
 * FLL-GAR-2023 · FLL-GAR-28 (Instandhaltung: Inspektion / Wartung / Instandsetzung)
 * — exhaustive per-worksheet verification through the REAL saveWorksheet path +
 * the REAL compliance evaluator, against a disposable embedded Postgres seeded
 * from the generic full-project FLL-GAR snapshot.
 *
 * FLL-GAR-28 has 0 equations, 1 compliance_requirement (REQ-29, block), 5 fields:
 *   - inspektion_intervall_jahr  [number, Jahr]  Sec.13.1  (gated: <= 1)
 *   - inst_inspektionsintervall  [text]          §16 (form-template dup of above)
 *   - inst_wartungsintervall     [text]          §16
 *   - inst_qualifikation_pruefer [text]          §16
 *   - inst_protokollierung       [text]          §16
 *
 * REQ-29 (block): `inspektion_intervall_jahr <= 1`  (Sec.13)
 *   PDF Sec.13.1 (l.6392): "Für die Instandhaltung sind in regelmäßigen Abständen
 *   (z. B. mindestens einmal im Jahr) Inspektionen vorzusehen" → interval <= 1 yr.
 *
 * No printed worked example (Instandhaltung is data-capture). The drivable chain
 * is the input-persistence round-trip through the REAL save path. The single gate
 * is fired through the REAL evaluateCondition in pass + fail + pending states.
 */
// @vitest-environment node
import { startHarness, type Harness } from './embedded-pg';
import { seedFllGar, type SeededFllGarFixture } from './seed-fll-gar';

const HARNESS_USER_ID = '00000000-0000-4000-8000-000000000f28';

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
const WS = fixture.worksheets['FLL-GAR-28'];

afterAll(async () => {
  await harness.stop();
});

async function persisted(fieldId: string): Promise<{ value_number: string | null; value_text: string | null } | undefined> {
  const [row] = await sql<{ value_number: string | null; value_text: string | null }[]>`
    SELECT value_number, value_text FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row;
}

// Verbatim prod condition string (pulled read-only from prod b252ce89…).
const REQ29 = 'inspektion_intervall_jahr <= 1';

function lookup(vals: Record<string, string | number | boolean | null>) {
  return (sym: string) => (sym in vals ? vals[sym] : undefined);
}

describe('FLL-GAR-28 — input chain through REAL saveWorksheet (embedded Postgres)', () => {
  it('exposes GAR-28 with all five fields', () => {
    expect(WS).toBeTruthy();
    for (const s of [
      'inspektion_intervall_jahr',
      'inst_inspektionsintervall',
      'inst_wartungsintervall',
      'inst_qualifikation_pruefer',
      'inst_protokollierung',
    ]) {
      expect(WS.fields[s]).toBeTruthy();
    }
  });

  it('persists a Sec.13 Instandhaltungskonzept (yearly inspection) via saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const f = WS.fields;
    const res = await saveWorksheet({
      instanceId: WS.instanceId,
      values: {
        [f['inspektion_intervall_jahr']]: { type: 'number', value: 1 },          // Sec.13.1 min yearly
        [f['inst_inspektionsintervall']]: { type: 'text', value: 'jährlich' },
        [f['inst_wartungsintervall']]: { type: 'text', value: 'halbjährlich' },
        [f['inst_qualifikation_pruefer']]: { type: 'text', value: 'Fachbetrieb GaLaBau' },
        [f['inst_protokollierung']]: { type: 'text', value: 'schriftliches Inspektionsprotokoll' },
      },
    });
    expect(res.ok).toBe(true);

    expect(Number((await persisted(f['inspektion_intervall_jahr']))!.value_number)).toBe(1);
    expect((await persisted(f['inst_inspektionsintervall']))?.value_text).toBe('jährlich');
    expect((await persisted(f['inst_wartungsintervall']))?.value_text).toBe('halbjährlich');
    expect((await persisted(f['inst_qualifikation_pruefer']))?.value_text).toBe('Fachbetrieb GaLaBau');
    expect((await persisted(f['inst_protokollierung']))?.value_text).toBe('schriftliches Inspektionsprotokoll');
  });

  it('re-save with a too-long interval overwrites (2-yearly)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const f = WS.fields;
    const res = await saveWorksheet({
      instanceId: WS.instanceId,
      values: {
        [f['inspektion_intervall_jahr']]: { type: 'number', value: 2 },
      },
    });
    expect(res.ok).toBe(true);
    expect(Number((await persisted(f['inspektion_intervall_jahr']))!.value_number)).toBe(2);
  });
});

describe('FLL-GAR-28 — REQ-29 gate fired through REAL evaluateCondition', () => {
  it('yearly interval (=1) → PASS', () => {
    expect(evaluateCondition(REQ29, lookup({ inspektion_intervall_jahr: 1 })).kind).toBe('pass');
  });
  it('sub-yearly interval (0.5) → PASS', () => {
    expect(evaluateCondition(REQ29, lookup({ inspektion_intervall_jahr: 0.5 })).kind).toBe('pass');
  });
  it('too-long interval (2 yr) → FAIL (gate fires)', () => {
    expect(evaluateCondition(REQ29, lookup({ inspektion_intervall_jahr: 2 })).kind).toBe('fail');
  });
  it('absent interval → PENDING (not a false pass/fail)', () => {
    expect(evaluateCondition(REQ29, lookup({})).kind).toBe('pending');
  });
});
