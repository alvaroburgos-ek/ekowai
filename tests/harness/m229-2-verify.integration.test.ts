/**
 * DWA-M 229-2 ("Systeme zur Belüftung und Durchmischung von Belebungsanlagen -
 * Teil 2: Betrieb"; Merkblatt DWA-M 229-2, September 2017) — REAL save-path
 * execution proof.
 *
 * SOURCE-ABSENT NOTICE: the DWA-M-229-2 source PDF is NOT in the library. This harness
 * proves ENFORCEMENT (gates block both-ways through the real save path); it does NOT
 * verify any threshold against a source, because there is none. Conditions are verbatim
 * from prod; no numeric value is asserted to be "correct".
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES the
 * standard's 19 live BLOCK gates (severity='block' + non-empty condition) by driving
 * each through the REAL enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists
 *                                      the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block, and
 * a persisted state where it DOES (the F-4 lesson). Nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (19 gates, all severity='block'):
 *   - numeric range AND (CR-001/004/010)                 : `x >= a AND x <= b`
 *   - boolean equality vs false (CR-002)                 : `flag == false`  ← notable
 *   - boolean equality vs true (CR-009/018/019)          : `flag == true`
 *   - existence IS NOT NULL, 1/2/4/5 conjuncts (many)    : `x IS NOT NULL [AND y …]`
 *   - numeric ordering compare (CR-005/007/011/012)      : `x < / <= / > literal`
 *
 * CROSS-WORKSHEET FALLBACK proven: CR-003 @ M2292-02 reads `T` (home M2292-01) via
 * the conflict-free project-wide fallback; its four other conjuncts are local. All 18
 * other gate operands are local to the gate's own worksheet.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod fields): NONE of the 4 known
 * engine traps are present, and NO TRUE-condition no-op gate exists — see the header of
 * seed-m229-2.ts for the itemised result. All 19 gates reach a definite `fail` in their
 * violating state (asserted by proveBothWays).
 *
 * CR-014 EXCLUSION: the standard's 20th CR (CR-014
 * `energieverbrauch_abweichung >= -10 AND … <= 10`, M2292-06) is severity='warn', not
 * block — it can never enter failingBlockConditions, so it is not seeded and not driven
 * (logged in the wave report as the one non-block CR, no enforcement to prove).
 */
// @vitest-environment node
import './_harness-env-m229-2'; // top-level-await: PG + seedM2292 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM2292Harness } from './_harness-env-m229-2';
import { M2292_GATES } from './seed-m229-2';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM2292Harness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string | null;

/** Persist a symbol→value map to worksheet `ws` (the symbol's HOME worksheet) through
 *  the REAL saveWorksheet. A null value clears the field. */
async function saveSymbols(ws: string, values: Record<string, Val>): Promise<void> {
  const batch: Record<string, { type: string; value: Val }> = {};
  for (const [symbol, value] of Object.entries(values)) {
    const meta = fixture.fieldMeta[`${ws}:${symbol}`];
    if (!meta) throw new Error(`seed gap: no field for ${ws}:${symbol}`);
    batch[meta.fieldId] = { type: meta.dataType, value };
  }
  const res = await saveWorksheet({
    instanceId: fixture.instances[ws],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: batch as any,
  });
  expect(res.ok, `saveWorksheet(${ws}) failed: ${JSON.stringify(res)}`).toBe(true);
}

type Save = { ws: string; values: Record<string, Val> };
async function applySaves(saves: Save[]): Promise<void> {
  for (const s of saves) await saveSymbols(s.ws, s.values);
}

/** Whether `code` is in the block-gate failing list for worksheet `gateWs` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(gateWs: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[gateWs]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked;
 *  persist the violating saves → blocked (definite fail). */
async function proveBothWays(
  gateWs: string,
  code: string,
  passSaves: Save[],
  violateSaves: Save[],
): Promise<void> {
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} SHOULD block in violating state`).toBe(true);
}

describe('DWA-M-229-2 — seed sanity (topology matches the 19 prod block gates)', () => {
  it('seeds all 8 worksheet instances and 19 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'M2292-01', 'M2292-02', 'M2292-03', 'M2292-04',
      'M2292-05', 'M2292-06', 'M2292-07', 'M2292-08',
    ]);
    expect(M2292_GATES.length).toBe(19);
    expect(M2292_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DWA-M-229-2 — M2292-01 Anmeldung, Geltungsbereich und Systemwahl (§4)', () => {
  it('CR-001  TS_BB >= 2 AND TS_BB <= 5 (Geltungsbereich Feststoffgehalt, range)', async () => {
    await proveBothWays('M2292-01', 'CR-001',
      [{ ws: 'M2292-01', values: { TS_BB: 3.5 } }],
      [{ ws: 'M2292-01', values: { TS_BB: 6 } }]); // above upper bound → AND false
  });
  it('CR-002  anlagentyp_membranbelebung == false (boolean equality vs FALSE literal)', async () => {
    await proveBothWays('M2292-01', 'CR-002',
      [{ ws: 'M2292-01', values: { anlagentyp_membranbelebung: false } }], // false == false → pass
      [{ ws: 'M2292-01', values: { anlagentyp_membranbelebung: true } }]); // true == false → definite fail
  });
});

describe('DWA-M-229-2 — M2292-02 Druckluftbelüftung – Betrieb und Überwachung (§5)', () => {
  it('CR-003  o2_gehalt/T/P_Gebl/p_R/laufzeit IS NOT NULL (5-conjunct; T cross-worksheet home M2292-01)', async () => {
    await proveBothWays('M2292-02', 'CR-003',
      [
        { ws: 'M2292-02', values: { o2_gehalt: 2, P_Gebl: 30, p_R: 500, laufzeit_drucklufterzeuger: 6000 } },
        { ws: 'M2292-01', values: { T: 15 } }, // cross-worksheet conjunct resolved via fallback
      ],
      [{ ws: 'M2292-01', values: { T: null } }]); // 2nd conjunct fails, resolved via fallback
  });
  it('CR-004  druckverlust_rohrleitung >= 15 AND <= 40 (range)', async () => {
    await proveBothWays('M2292-02', 'CR-004',
      [{ ws: 'M2292-02', values: { druckverlust_rohrleitung: 25 } }],
      [{ ws: 'M2292-02', values: { druckverlust_rohrleitung: 50 } }]);
  });
  it('CR-005  rueckschlag_druckverlust < 15 (ordering)', async () => {
    await proveBothWays('M2292-02', 'CR-005',
      [{ ws: 'M2292-02', values: { rueckschlag_druckverlust: 10 } }],
      [{ ws: 'M2292-02', values: { rueckschlag_druckverlust: 20 } }]);
  });
});

describe('DWA-M-229-2 — M2292-03 Druckluftbelüftung – Instandhaltung und Störungen (§6)', () => {
  it('CR-006  instandhaltungsart IS NOT NULL (existence on enum)', async () => {
    await proveBothWays('M2292-03', 'CR-006',
      [{ ws: 'M2292-03', values: { instandhaltungsart: 'bedarfsorientiert' } }],
      [{ ws: 'M2292-03', values: { instandhaltungsart: null } }]);
  });
  it('CR-007  flexing_druckabsenkung <= 50 (ordering)', async () => {
    await proveBothWays('M2292-03', 'CR-007',
      [{ ws: 'M2292-03', values: { flexing_druckabsenkung: 30 } }],
      [{ ws: 'M2292-03', values: { flexing_druckabsenkung: 60 } }]);
  });
  it('CR-008  reinigungsverfahren IS NOT NULL (existence on enum)', async () => {
    await proveBothWays('M2292-03', 'CR-008',
      [{ ws: 'M2292-03', values: { reinigungsverfahren: 'ameisensaeure' } }],
      [{ ws: 'M2292-03', values: { reinigungsverfahren: null } }]);
  });
});

describe('DWA-M-229-2 — M2292-04 Oberflächenbelüftung und Durchmischung – Betrieb (§7)', () => {
  it('CR-009  leitwand_montiert == true (boolean equality)', async () => {
    await proveBothWays('M2292-04', 'CR-009',
      [{ ws: 'M2292-04', values: { leitwand_montiert: true } }],
      [{ ws: 'M2292-04', values: { leitwand_montiert: false } }]);
  });
  it('CR-010  leistungsdichte_ruehrwerk >= 0.8 AND <= 5 (range)', async () => {
    await proveBothWays('M2292-04', 'CR-010',
      [{ ws: 'M2292-04', values: { leistungsdichte_ruehrwerk: 2 } }],
      [{ ws: 'M2292-04', values: { leistungsdichte_ruehrwerk: 6 } }]);
  });
});

describe('DWA-M-229-2 — M2292-05 Prozessführung und Automatisierung (§8.1)', () => {
  it('CR-011  o2_min_p_elimination > 0.5 (strict ordering)', async () => {
    await proveBothWays('M2292-05', 'CR-011',
      [{ ws: 'M2292-05', values: { o2_min_p_elimination: 1.0 } }],
      [{ ws: 'M2292-05', values: { o2_min_p_elimination: 0.5 } }]); // 0.5 > 0.5 false → fail
  });
  it('CR-012  o2_min_winter_stabilisierung > 1 (strict ordering)', async () => {
    await proveBothWays('M2292-05', 'CR-012',
      [{ ws: 'M2292-05', values: { o2_min_winter_stabilisierung: 2 } }],
      [{ ws: 'M2292-05', values: { o2_min_winter_stabilisierung: 1 } }]); // 1 > 1 false → fail
  });
  it('CR-017  o2_sollkonzentration IS NOT NULL (existence)', async () => {
    await proveBothWays('M2292-05', 'CR-017',
      [{ ws: 'M2292-05', values: { o2_sollkonzentration: 2 } }],
      [{ ws: 'M2292-05', values: { o2_sollkonzentration: null } }]);
  });
});

describe('DWA-M-229-2 — M2292-06 Energetische Effizienz und Kennzahlen (§8.2)', () => {
  it('CR-013  E_Bel IS NOT NULL AND EW_CSB IS NOT NULL (2-conjunct existence)', async () => {
    await proveBothWays('M2292-06', 'CR-013',
      [{ ws: 'M2292-06', values: { E_Bel: 120000, EW_CSB: 5000 } }],
      [{ ws: 'M2292-06', values: { EW_CSB: null } }]); // second conjunct fails
  });
  it('CR-020  energieverbrauch_abweichung IS NOT NULL (existence)', async () => {
    await proveBothWays('M2292-06', 'CR-020',
      [{ ws: 'M2292-06', values: { energieverbrauch_abweichung: 5 } }],
      [{ ws: 'M2292-06', values: { energieverbrauch_abweichung: null } }]);
  });
});

describe('DWA-M-229-2 — M2292-07 Wirtschaftlichkeitsvergleich Wartung/Austausch (Anhang C)', () => {
  it('CR-015  dp_Bel_neu/dp_Bel_alt/SSOTR_neu/SSOTR_alt IS NOT NULL (4-conjunct existence)', async () => {
    await proveBothWays('M2292-07', 'CR-015',
      [{ ws: 'M2292-07', values: { dp_Bel_neu: 40, dp_Bel_alt: 55, SSOTR_neu: 4, SSOTR_alt: 3 } }],
      [{ ws: 'M2292-07', values: { SSOTR_neu: null } }]); // third conjunct fails
  });
  it('CR-016  SSOTR_alt IS NOT NULL (existence — distinct code, same operand family)', async () => {
    await proveBothWays('M2292-07', 'CR-016',
      [{ ws: 'M2292-07', values: { SSOTR_alt: 3 } }],
      [{ ws: 'M2292-07', values: { SSOTR_alt: null } }]);
  });
});

describe('DWA-M-229-2 — M2292-08 Druckverluste, Dichtheit, Modellierung und Arbeitssicherheit (Anhang B / §9)', () => {
  it('CR-018  dichtheit_ok == true (boolean equality)', async () => {
    await proveBothWays('M2292-08', 'CR-018',
      [{ ws: 'M2292-08', values: { dichtheit_ok: true } }],
      [{ ws: 'M2292-08', values: { dichtheit_ok: false } }]);
  });
  it('CR-019  personal_sicherheitsunterweisung == true (boolean equality)', async () => {
    await proveBothWays('M2292-08', 'CR-019',
      [{ ws: 'M2292-08', values: { personal_sicherheitsunterweisung: true } }],
      [{ ws: 'M2292-08', values: { personal_sicherheitsunterweisung: false } }]);
  });
});
