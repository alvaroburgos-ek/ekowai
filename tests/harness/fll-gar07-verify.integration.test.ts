/**
 * FLL-GAR-2023 · FLL-GAR-07 (Profilierung und Böschungsneigung) — exhaustive
 * per-worksheet verification through the REAL saveWorksheet path + the REAL
 * compliance evaluator, against a disposable embedded Postgres seeded from the
 * generic full-project FLL-GAR snapshot (seed-fll-gar.ts).
 *
 * FLL-GAR-07 has 0 equations and 2 input fields:
 *   - boeschungsneigung_ratio (text, "1:n")   — Sec.4.5; Tab.1
 *   - gefaelle_percent        (number, %, 0..100)
 * and 2 compliance_requirements (both severity='warn'):
 *   - REQ-08 "Böschungsneigung material-konform (Tab.1)"
 *   - REQ-09 "Abdichtungssystem ausgewählt und nutzungsadäquat"
 *
 * There is no printed worked example for GAR-07 (Tab.1 is a range table, not a
 * calc). So the "chain" here is the input-persistence chain: drive both fields
 * through the REAL saveWorksheet and assert they persist. The two gates are
 * evaluated through the REAL evaluateCondition to prove whether they fire.
 */
// @vitest-environment node
import './_harness-env-fll-gar07'; // top-level-await: PG + seedFllGar BEFORE @/lib/db
import { describe, it, expect, afterAll } from 'vitest';
import { getFllGar07Harness } from './_harness-env-fll-gar07';
import { evaluateCondition } from '@/lib/compliance/evaluate';

const { harness, fixture } = getFllGar07Harness();
const sql = harness.sql;

const WS = fixture.worksheets['FLL-GAR-07'];

afterAll(async () => {
  await harness.stop();
});

async function persisted(fieldId: string): Promise<{ value_number: string | null; value_text: string | null } | undefined> {
  const [row] = await sql<{ value_number: string | null; value_text: string | null }[]>`
    SELECT value_number, value_text FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row;
}

// The two prod condition strings, verbatim (pulled read-only from prod).
const REQ08_CONDITION = 'Slope per Tab.1 row for chosen abdichtungs_art';
const REQ09_CONDITION = 'Engineer-judged selection traceable to Sec.4.7 criteria';

describe('FLL-GAR-07 — input chain through REAL saveWorksheet (embedded Postgres)', () => {
  it('exposes GAR-07 with both fields', () => {
    expect(WS).toBeTruthy();
    expect(WS.fields['boeschungsneigung_ratio']).toBeTruthy();
    expect(WS.fields['gefaelle_percent']).toBeTruthy();
  });

  it('persists a Tab.1-conformant slope pair (Kunststoffbahnen 1:1,5 = 66 %) via saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: WS.instanceId,
      values: {
        [WS.fields['boeschungsneigung_ratio']]: { type: 'text', value: '1:1,5' },
        [WS.fields['gefaelle_percent']]: { type: 'number', value: 66 },
      },
    });
    expect(res.ok).toBe(true);

    const ratio = await persisted(WS.fields['boeschungsneigung_ratio']);
    const gef = await persisted(WS.fields['gefaelle_percent']);
    expect(ratio?.value_text).toBe('1:1,5');
    expect(gef?.value_number == null ? null : Number(gef!.value_number)).toBe(66);
  });

  it('persists an over-limit gefaelle (120 %) too — no engine guard (field-level 0..100 is UI-only)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const res = await saveWorksheet({
      instanceId: WS.instanceId,
      values: {
        [WS.fields['gefaelle_percent']]: { type: 'number', value: 120 },
      },
    });
    expect(res.ok).toBe(true);
    const gef = await persisted(WS.fields['gefaelle_percent']);
    expect(Number(gef!.value_number)).toBe(120);
  });
});

describe('FLL-GAR-07 — gates fired through REAL evaluateCondition', () => {
  // Build a symbol lookup mirroring the two persisted fields, plus a hypothetical
  // abdichtungs_art the condition text names.
  function lookup(vals: Record<string, string | number | boolean | null>) {
    return (sym: string) => (sym in vals ? vals[sym] : undefined);
  }

  it('REQ-08 condition is natural-language prose → evaluates MANUAL (vacuous, never pass/fail)', () => {
    // Exercise it against BOTH a compliant and a non-compliant state; the result
    // must be `manual` either way because the condition does not parse.
    const passState = lookup({ boeschungsneigung_ratio: '1:1,5', gefaelle_percent: 66, abdichtungs_art: 'Kunststoffbahnen' });
    const failState = lookup({ boeschungsneigung_ratio: '1:1', gefaelle_percent: 100, abdichtungs_art: 'Gussasphalt' }); // Gussasphalt limit is 1:5/20%
    const rPass = evaluateCondition(REQ08_CONDITION, passState);
    const rFail = evaluateCondition(REQ08_CONDITION, failState);
    expect(rPass.kind).toBe('manual');
    expect(rFail.kind).toBe('manual');
  });

  it('REQ-09 condition is natural-language prose → evaluates MANUAL (vacuous, never pass/fail)', () => {
    const s1 = lookup({ abdichtungssystem: 'GTD', usage: 'Schwimmteich' });
    const s2 = lookup({});
    expect(evaluateCondition(REQ09_CONDITION, s1).kind).toBe('manual');
    expect(evaluateCondition(REQ09_CONDITION, s2).kind).toBe('manual');
  });
});
