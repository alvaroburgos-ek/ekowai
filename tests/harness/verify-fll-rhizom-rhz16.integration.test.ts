/**
 * VERIFY FLL-TP-RHIZOM-2023 :: FLLTP-RHZ-16 (Wuchsleistung Endauswertung 24 Monate).
 *
 * Boots its own disposable embedded Postgres, seeds the WHOLE FLL-TP-RHIZOM
 * standard via seedFllRhizom, then drives worksheet FLLTP-RHZ-16 through the REAL
 * saveWorksheet + checkApprovalGate paths.
 *
 * PDF provenance (this run — TP-Rhizom.txt / fll_tp_rhizomfestigkeit_...2023):
 *   §3.7 Wuchsleistung, point 4: "Endauswertung (nach 24 Monaten) ≥ 160 Halme/Gefäße"
 *   §3.7: "Die Bestandsdichte der Testpflanzen in den Prüfgefäßen muss mindestens
 *          80 % der Bestandsdichte der Pflanzen in den Kontrollgefäßen betragen."
 *   Prüfbericht Tab. 3: "ØP1–P8 / ØK1–K3 x 100"  (Sollwert: ≥ 80 %) — NO numeric
 *          worked example is printed (all cells are >> Monat Jahr << placeholders).
 *
 * FLLTP-RHZ-16 has 0 equations and 1 block gate REQ-18 on prod:
 *   condition = "bestandsdichte_p_avg_24mon >= 160 AND dichte_relativ_prozent >= 80"
 * NOTE the 2nd operand references `dichte_relativ_prozent` — a field on FLLTP-RHZ-13,
 * NOT this worksheet's own `relativ_prozent_24mon`. So the gate reads a foreign
 * worksheet's relative-density via the project-wide fallback, not the 24-month value
 * it is supposed to check (see FINDINGS in the JSON detail).
 */
// @vitest-environment node
import './_harness-env-fll-rhizom'; // top-level await: PG + seed BEFORE @/lib/db loads
import { describe, it, expect, afterAll } from 'vitest';
import { getFllRhizomHarness } from './_harness-env-fll-rhizom';

const { harness, fixture } = getFllRhizomHarness();
const sql = harness.sql;
const ws = fixture.byCode['FLLTP-RHZ-16'];
const ws13 = fixture.byCode['FLLTP-RHZ-13'];

afterAll(async () => {
  await harness.stop();
});

async function persisted(symbol: string): Promise<string | number | boolean | null> {
  const fieldId = ws.fieldIds[symbol];
  const [row] = await sql<
    {
      value_text: string | null;
      value_number: string | null;
      value_boolean: boolean | null;
      value_enum: string | null;
      value_date: string | null;
    }[]
  >`SELECT value_text, value_number, value_boolean, value_enum, value_date
    FROM project_parameters
    WHERE project_id = ${fixture.projectId} AND field_id = ${fieldId}`;
  if (!row) return null;
  if (row.value_boolean !== null) return row.value_boolean;
  if (row.value_number !== null) return Number(row.value_number);
  if (row.value_enum !== null) return row.value_enum;
  if (row.value_date !== null) return row.value_date;
  return row.value_text;
}

/** Save `dichte_relativ_prozent` on FLLTP-RHZ-13 so the project-wide fallback the
 * gate uses for that (foreign) symbol has a conflict-free value. */
async function setRhz13Relative(value: number) {
  const { saveWorksheet } = await import('@/lib/actions/worksheet');
  const save = await saveWorksheet({
    instanceId: ws13.instanceId,
    values: {
      [ws13.fieldIds['dichte_relativ_prozent']]: { type: 'number', value },
    },
  });
  expect(save.ok).toBe(true);
}

describe('VERIFY FLLTP-RHZ-16 — Wuchsleistung 24-Monats-Endauswertung save + REQ-18 gate', () => {
  it('exposes exactly the 5 prod fields with the right types', () => {
    expect(ws).toBeTruthy();
    expect(ws.fieldTypes['bestandsdichte_p_avg_24mon']).toBe('number');
    expect(ws.fieldTypes['kontrolle_p_avg_24mon']).toBe('number');
    expect(ws.fieldTypes['relativ_prozent_24mon']).toBe('number');
    expect(ws.fieldTypes['wuchsleistung_24mon_ausreichend']).toBe('boolean');
    expect(ws.fieldTypes['endauswertung_datum']).toBe('date');
  });

  it('drives a PASS state (≥160 Halme AND ≥80% rel.) through real saveWorksheet', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    // PASS worked example (no PDF numeric example exists → SANITY-CHECK values):
    //   ØP1–P8 = 170 Halme/Gefäß  (≥ 160 threshold met, §3.7 pt.4)
    //   ØK1–K3 = 190 Halme/Gefäß
    //   relative = 170/190*100 = 89.47 %  (≥ 80 % Sollwert, §3.7)  → ausreichend = true
    const relative = (170 / 190) * 100;
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_24mon']]: { type: 'number', value: 170 },
        [ws.fieldIds['kontrolle_p_avg_24mon']]: { type: 'number', value: 190 },
        [ws.fieldIds['relativ_prozent_24mon']]: { type: 'number', value: relative },
        [ws.fieldIds['wuchsleistung_24mon_ausreichend']]: { type: 'boolean', value: true },
        [ws.fieldIds['endauswertung_datum']]: { type: 'date', value: '2027-01-15' },
      },
    });
    // eslint-disable-next-line no-console
    console.log('RHZ-16 PASS save.ok:', save.ok, ' error:', JSON.stringify((save as { error?: unknown }).error ?? null));
    expect(save.ok).toBe(true);

    const pAvg = await persisted('bestandsdichte_p_avg_24mon');
    const kAvg = await persisted('kontrolle_p_avg_24mon');
    const rel = await persisted('relativ_prozent_24mon');
    const ok = await persisted('wuchsleistung_24mon_ausreichend');
    const datum = await persisted('endauswertung_datum');
    // eslint-disable-next-line no-console
    console.log('RHZ-16 PASS persisted ØP:', JSON.stringify(pAvg), ' ØK:', JSON.stringify(kAvg),
      ' rel%:', JSON.stringify(rel), ' ausreichend:', JSON.stringify(ok), ' datum:', JSON.stringify(datum));
    expect(pAvg).toBe(170);
    expect(kAvg).toBe(190);
    expect(Number(rel)).toBeCloseTo(89.4737, 3);
    expect(ok).toBe(true);
    expect(new Date(datum as string | number).toISOString().slice(0, 10)).toBe('2027-01-15');
  });

  it('GATE REQ-18 FIRES to PASS when foreign dichte_relativ_prozent (RHZ-13) ≥80 AND local ØP ≥160', async () => {
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    // Local ØP already 170 (≥160). The 2nd operand `dichte_relativ_prozent` is NOT a
    // field here → resolves from the project-wide fallback = RHZ-13's value. Set it ≥80.
    await setRhz13Relative(85);
    const g = await checkApprovalGate(ws.instanceId);
    // eslint-disable-next-line no-console
    console.log('RHZ-16 gate(pass-state) failing:', JSON.stringify(g.failingBlockConditions),
      ' missingReq:', JSON.stringify(g.missingRequiredFields));
    const req18Failing = g.failingBlockConditions.some((c) => c.code === 'REQ-18');
    expect(req18Failing).toBe(false); // 170>=160 AND 85>=80 → gate satisfied, not failing
  });

  it('GATE REQ-18 FIRES to FAIL when foreign dichte_relativ_prozent (RHZ-13) < 80', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    // Keep local ØP high (≥160) but push the FOREIGN relative below 80 → REQ-18 must fail.
    await saveWorksheet({
      instanceId: ws.instanceId,
      values: { [ws.fieldIds['bestandsdichte_p_avg_24mon']]: { type: 'number', value: 170 } },
    });
    await setRhz13Relative(60);
    const g = await checkApprovalGate(ws.instanceId);
    // eslint-disable-next-line no-console
    console.log('RHZ-16 gate(fail-state) failing:', JSON.stringify(g.failingBlockConditions));
    const req18Failing = g.failingBlockConditions.some((c) => c.code === 'REQ-18');
    expect(req18Failing).toBe(true); // 60 < 80 → REQ-18 fails
  });

  it('WRONG-OPERAND FINDING: local relativ_prozent_24mon does NOT drive REQ-18; only foreign RHZ-13 does', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const { checkApprovalGate } = await import('@/lib/actions/approval-gate');
    // Set the LOCAL 24-month relative to a healthy 95% (what the endauswertung gate
    // *should* read), but keep the FOREIGN RHZ-13 relative at a failing 60%.
    await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_24mon']]: { type: 'number', value: 170 },
        [ws.fieldIds['relativ_prozent_24mon']]: { type: 'number', value: 95 },
      },
    });
    await setRhz13Relative(60);
    const g = await checkApprovalGate(ws.instanceId);
    const req18Failing = g.failingBlockConditions.some((c) => c.code === 'REQ-18');
    // eslint-disable-next-line no-console
    console.log('RHZ-16 wrong-operand: local rel=95 (healthy) but REQ-18 failing=',
      req18Failing, '(driven by FOREIGN RHZ-13 rel=60, NOT local relativ_prozent_24mon)');
    // FINDING: despite a healthy LOCAL 24-month relative (95 ≥ 80), the gate still FAILS
    // because it reads the foreign RHZ-13 field. The correct operand relativ_prozent_24mon
    // is ignored by REQ-18.
    expect(req18Failing).toBe(true);
  });

  it('drives a FAIL data state (<160 Halme) — save still succeeds (block only refuses approval)', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const relative = (100 / 190) * 100; // 52.6% < 80
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_24mon']]: { type: 'number', value: 100 },
        [ws.fieldIds['kontrolle_p_avg_24mon']]: { type: 'number', value: 190 },
        [ws.fieldIds['relativ_prozent_24mon']]: { type: 'number', value: relative },
        [ws.fieldIds['wuchsleistung_24mon_ausreichend']]: { type: 'boolean', value: false },
        [ws.fieldIds['endauswertung_datum']]: { type: 'date', value: '2027-01-16' },
      },
    });
    expect(save.ok).toBe(true);
    const pAvg = await persisted('bestandsdichte_p_avg_24mon');
    expect(pAvg).toBe(100);
  });

  it('note: relativ_prozent_24mon is a plain entered number — NO equation materializes ØP/ØK×100', async () => {
    const { saveWorksheet } = await import('@/lib/actions/worksheet');
    const save = await saveWorksheet({
      instanceId: ws.instanceId,
      values: {
        [ws.fieldIds['bestandsdichte_p_avg_24mon']]: { type: 'number', value: 170 },
        [ws.fieldIds['kontrolle_p_avg_24mon']]: { type: 'number', value: 190 },
        [ws.fieldIds['relativ_prozent_24mon']]: { type: 'number', value: 42 },
      },
    });
    expect(save.ok).toBe(true);
    const rel = await persisted('relativ_prozent_24mon');
    // eslint-disable-next-line no-console
    console.log('RHZ-16 inconsistent-relative persisted rel%:', JSON.stringify(rel), '(expected 42, NOT recomputed to 89.47 → confirms no equation)');
    expect(Number(rel)).toBe(42);
  });
});
