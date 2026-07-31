/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-13 (Wuchsleistung Zwischenauswertung 6 Monate).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-13 through the REAL
 * saveWorksheet path and reads persistence back. RHZ-13 owns 3 equations
 * (EQ-1 P-average over 8, EQ-2 K-average over 3, EQ-3 relative density %) and 1
 * block gate (REQ-15).
 *
 * NOTE: the generic FLL arithmetic-mean/ratio equations are NOT in the app's
 * MATERIALIZE_REGISTRY (that registry is 138-surface specific), so saveWorksheet
 * does NOT auto-compute the derived outputs from the raw inputs — it only stamps a
 * SUPPLIED produced-symbol value as source_type='derived'. We therefore compute
 * each chain arithmetically (verified against the PDF formula shape), drive the
 * derived value in, assert it persists, and exercise the gate in pass + fail.
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level await: PG + seed BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';
import { evaluateCondition } from '@/lib/compliance/evaluate';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;
const ws = fixture.byCode['FLLTP-RHZ-13'];

afterAll(async () => {
  await harness.stop();
});

async function persisted(symbol: string): Promise<number | string | boolean | null> {
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

async function sourceType(symbol: string): Promise<string | null> {
  const fieldId = ws.fieldIds[symbol];
  const [row] = await sql<{ source_type: string }[]>`
    SELECT source_type FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  return row?.source_type ?? null;
}

async function gateLookup(): Promise<(sym: string) => number | string | boolean | null | undefined> {
  const rows = await sql<
    { symbol: string; value_text: string | null; value_number: string | null; value_boolean: boolean | null; value_enum: string | null }[]
  >`SELECT f.symbol, p.value_text, p.value_number, p.value_boolean, p.value_enum
    FROM project_parameters p JOIN fields f ON f.id = p.field_id
    WHERE p.project_id = ${fixture.projectId} AND f.worksheet_template_id = ${ws.templateId}`;
  const map = new Map<string, number | string | boolean | null>();
  for (const r of rows) {
    let v: number | string | boolean | null;
    if (r.value_boolean !== null) v = r.value_boolean;
    else if (r.value_number !== null) v = Number(r.value_number);
    else if (r.value_enum !== null) v = r.value_enum;
    else v = r.value_text;
    map.set(r.symbol, v);
  }
  return (sym: string) => (map.has(sym) ? map.get(sym) : undefined);
}

// REQ-15 verbatim from prod.
const REQ15 = 'bestandsdichte_p_avg_6mon >= 80 AND dichte_relativ_prozent >= 80';

describe('VERIFY FLLTP-RHZ-13 — 3 equations (manual) + REQ-15 gate through real path', () => {
  it('CHAIN EQ-2: K-average over 3 control vessels + persists as derived', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    // K_1..K_3 = 100, 110, 120 → mean = 110
    const kAvg = (100 + 110 + 120) / 3;
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['K_1']]: { type: 'number', value: 100 },
        [ws.fieldIds['K_2']]: { type: 'number', value: 110 },
        [ws.fieldIds['K_3']]: { type: 'number', value: 120 },
        [ws.fieldIds['bestandsdichte_k_avg']]: { type: 'number', value: kAvg },
      },
    });
    expect(save.ok).toBe(true);
    // eslint-disable-next-line no-console
    console.log('EQ-2 kAvg computed =', kAvg, ' persisted =', await persisted('bestandsdichte_k_avg'), ' src =', await sourceType('bestandsdichte_k_avg'));
    expect(await persisted('bestandsdichte_k_avg')).toBe(110);
    // bestandsdichte_k_avg IS an EQ-2 output → single-source stamps it 'derived'
    expect(await sourceType('bestandsdichte_k_avg')).toBe('derived');
  });

  it('CHAIN EQ-1: P-average over 8 test vessels + persists as derived', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    // P_1..P_8 = 80,82,84,86,88,90,92,96 → sum=698 → mean=87.25
    const ps = [80, 82, 84, 86, 88, 90, 92, 96];
    const pAvg = ps.reduce((a, b) => a + b, 0) / 8;
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['P_1']]: { type: 'number', value: ps[0] },
        [ws.fieldIds['P_2']]: { type: 'number', value: ps[1] },
        [ws.fieldIds['P_3']]: { type: 'number', value: ps[2] },
        [ws.fieldIds['P_4']]: { type: 'number', value: ps[3] },
        [ws.fieldIds['P_5']]: { type: 'number', value: ps[4] },
        [ws.fieldIds['P_6']]: { type: 'number', value: ps[5] },
        [ws.fieldIds['P_7']]: { type: 'number', value: ps[6] },
        [ws.fieldIds['P_8']]: { type: 'number', value: ps[7] },
        [ws.fieldIds['bestandsdichte_p_avg']]: { type: 'number', value: pAvg },
      },
    });
    expect(save.ok).toBe(true);
    // eslint-disable-next-line no-console
    console.log('EQ-1 pAvg computed =', pAvg, ' persisted =', await persisted('bestandsdichte_p_avg'), ' src =', await sourceType('bestandsdichte_p_avg'));
    expect(await persisted('bestandsdichte_p_avg')).toBe(87.25);
    expect(await sourceType('bestandsdichte_p_avg')).toBe('derived');
  });

  it('CHAIN EQ-3: relative density % = (pAvg / kAvg) * 100 + persists as derived', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    // pAvg=87.25 (from EQ-1 above), kAvg=110 (from EQ-2 above) → 79.318..%
    const pAvg = 87.25;
    const kAvg = 110;
    const rel = (pAvg / kAvg) * 100;
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['dichte_relativ_prozent']]: { type: 'number', value: rel },
      },
    });
    expect(save.ok).toBe(true);
    // eslint-disable-next-line no-console
    console.log('EQ-3 rel% computed =', rel, ' persisted =', await persisted('dichte_relativ_prozent'), ' src =', await sourceType('dichte_relativ_prozent'));
    expect(Number(await persisted('dichte_relativ_prozent'))).toBeCloseTo(79.3181818, 4);
    expect(await sourceType('dichte_relativ_prozent')).toBe('derived');
  });

  it('GATE REQ-15 PASS state: 6-mon avg >= 80 AND relative >= 80', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    // Drive a passing state: p_avg_6mon=85 (>=80), and a relative density of 90 (>=80).
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_6mon']]: { type: 'number', value: 85 },
        [ws.fieldIds['dichte_relativ_prozent']]: { type: 'number', value: 90 },
      },
    });
    expect(save.ok).toBe(true);
    const lookup = await gateLookup();
    const r = evaluateCondition(REQ15, lookup);
    // eslint-disable-next-line no-console
    console.log('REQ-15 PASS-STATE:', JSON.stringify(r), ' p_avg_6mon=', await persisted('bestandsdichte_p_avg_6mon'), ' rel=', await persisted('dichte_relativ_prozent'));
    expect(r.kind).toBe('pass');
  });

  it('GATE REQ-15 FAIL state: 6-mon avg < 80 (undergrowth) → fires', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    // Below threshold on both legs.
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_6mon']]: { type: 'number', value: 60 }, // < 80
        [ws.fieldIds['dichte_relativ_prozent']]: { type: 'number', value: 70 }, // < 80
      },
    });
    expect(save.ok).toBe(true);
    const lookup = await gateLookup();
    const r = evaluateCondition(REQ15, lookup);
    // eslint-disable-next-line no-console
    console.log('REQ-15 FAIL-STATE:', JSON.stringify(r), ' p_avg_6mon=', await persisted('bestandsdichte_p_avg_6mon'), ' rel=', await persisted('dichte_relativ_prozent'));
    expect(r.kind).toBe('fail');
  });

  it('GATE REQ-15 boundary: exactly 80/80 passes; relative-only fail fires', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    // Boundary: both exactly 80 → >=80 → pass.
    let save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_6mon']]: { type: 'number', value: 80 },
        [ws.fieldIds['dichte_relativ_prozent']]: { type: 'number', value: 80 },
      },
    });
    expect(save.ok).toBe(true);
    let r = evaluateCondition(REQ15, await gateLookup());
    // eslint-disable-next-line no-console
    console.log('REQ-15 BOUNDARY 80/80:', JSON.stringify(r));
    expect(r.kind).toBe('pass');

    // relative-density leg alone fails (avg ok, rel<80) → gate fails.
    save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_6mon']]: { type: 'number', value: 85 },
        [ws.fieldIds['dichte_relativ_prozent']]: { type: 'number', value: 79 },
      },
    });
    expect(save.ok).toBe(true);
    r = evaluateCondition(REQ15, await gateLookup());
    // eslint-disable-next-line no-console
    console.log('REQ-15 rel-only-fail 85/79:', JSON.stringify(r));
    expect(r.kind).toBe('fail');
  });
});
