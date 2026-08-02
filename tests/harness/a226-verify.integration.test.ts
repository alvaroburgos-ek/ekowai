/**
 * DWA-A 226 ("Grundsätze für die Abwasserbehandlung in Belebungsanlagen mit
 * gemeinsamer aerober Schlammstabilisierung ab 1.000 Einwohnerwerte";
 * Arbeitsblatt DWA-A 226, August 2009) — REAL save-path execution proof.
 *
 * SOURCE-ABSENT NOTICE: the DWA-A-226 source PDF is NOT in the library. This harness
 * proves ENFORCEMENT (gates block both-ways through the real save path); it does NOT
 * verify any threshold against a source, because there is none. Conditions are
 * verbatim from prod; no numeric value is asserted to be "correct".
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES the
 * standard's 24 live BLOCK gates (severity='block' + non-empty condition) by driving
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
 * COVERED GATE SHAPES (24 gates, all severity='block'):
 *   - numeric range AND (CR-001, CR-016)                 : `x >= a AND x <= b`
 *   - existence IS NOT NULL (CR-021, CR-024)             : `x IS NOT NULL`
 *   - multi-conjunct existence (CR-023, CR-022)          : `a IS NOT NULL AND b IS NOT NULL[...]`
 *   - enum-guard-as-OR (CR-002..005)                     : `enum != 'v' OR num >= t`
 *   - parenthesised AND-of-ORs (CR-006)                  : `(enum==v AND n>=a) OR (enum==w AND n>=b)`
 *   - arithmetic ratio compare (CR-007)                  : `t_D / t_T <= 0.35`
 *   - simple ordering compare (CR-008..015, CR-020)      : `x <= / >= / < literal`
 *   - boolean equality (CR-017, CR-019)                  : `flag == True`
 *   - existence on a boolean (CR-018)                    : `reservepumpe IS NOT NULL`
 *
 * CROSS-WORKSHEET FALLBACK proven: A226-04 hosts CR-002/003/004/005/022 but owns no
 * fields — every operand is entered on another worksheet and resolved via the
 * conflict-free project-wide fallback (single-home topology). CR-006 reads
 * stabilisierungsart (home A226-01) cross-worksheet too.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4
 * known engine traps are present — see the header of seed-a226.ts for the itemised
 * result (no field==field RHS; no `!= null` gate; no IN-set; no unparenthesised
 * IF/THEN nest). All 24 gates reach a definite `fail` in their violating state.
 */
// @vitest-environment node
import './_harness-env-a226'; // top-level-await: PG + seedA226 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getA226Harness } from './_harness-env-a226';
import { A226_GATES } from './seed-a226';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getA226Harness();

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

describe('DWA-A-226 — seed sanity (topology matches the 24 prod block gates)', () => {
  it('seeds all 9 worksheet instances and 24 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'A226-01', 'A226-02', 'A226-03', 'A226-04', 'A226-05',
      'A226-06', 'A226-07', 'A226-08', 'A226-09',
    ]);
    expect(A226_GATES.length).toBe(24);
    expect(A226_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DWA-A-226 — A226-02 Bemessungsgrundlagen und Belastungsdaten (§1 / §3.2)', () => {
  it('CR-001  EW_BSB5_60 >= 1000 AND EW_BSB5_60 <= 5000 (range)', async () => {
    await proveBothWays('A226-02', 'CR-001',
      [{ ws: 'A226-02', values: { EW_BSB5_60: 2000 } }],
      [{ ws: 'A226-02', values: { EW_BSB5_60: 6000 } }]); // above upper bound → AND false
  });
  it('CR-021  B_d_BSB IS NOT NULL (existence)', async () => {
    await proveBothWays('A226-02', 'CR-021',
      [{ ws: 'A226-02', values: { B_d_BSB: 120 } }],
      [{ ws: 'A226-02', values: { B_d_BSB: null } }]);
  });
});

describe('DWA-A-226 — A226-03 Hydraulische Bemessung (§3.2, nach DWA-A 118)', () => {
  it('CR-023  Q_F IS NOT NULL AND Q_R_Tr IS NOT NULL (two-conjunct existence)', async () => {
    await proveBothWays('A226-03', 'CR-023',
      [{ ws: 'A226-03', values: { Q_F: 30, Q_R_Tr: 12 } }],
      [{ ws: 'A226-03', values: { Q_R_Tr: null } }]); // second conjunct fails
  });
});

describe('DWA-A-226 — A226-04 Überschussschlammproduktion (§3.3.2) — cross-worksheet fallback', () => {
  it('CR-002  stabilisierungsart != nitrifikation OR t_TS >= 20', async () => {
    await proveBothWays('A226-04', 'CR-002',
      [{ ws: 'A226-01', values: { stabilisierungsart: 'nitrifikation' } }, { ws: 'A226-05', values: { t_TS: 25 } }],
      [{ ws: 'A226-05', values: { t_TS: 10 } }]); // guard true, t_TS < 20 → both disjuncts false
  });
  it('CR-003  stabilisierungsart != nitrifikation_denitrifikation OR t_TS >= 25', async () => {
    await proveBothWays('A226-04', 'CR-003',
      [{ ws: 'A226-01', values: { stabilisierungsart: 'nitrifikation_denitrifikation' } }, { ws: 'A226-05', values: { t_TS: 30 } }],
      [{ ws: 'A226-05', values: { t_TS: 10 } }]);
  });
  it('CR-004  stabilisierungsart != nitrifikation OR B_TS_BSB <= 0.05', async () => {
    await proveBothWays('A226-04', 'CR-004',
      [{ ws: 'A226-01', values: { stabilisierungsart: 'nitrifikation' } }, { ws: 'A226-05', values: { B_TS_BSB: 0.03 } }],
      [{ ws: 'A226-05', values: { B_TS_BSB: 0.1 } }]);
  });
  it('CR-005  stabilisierungsart != nitrifikation_denitrifikation OR B_TS_BSB <= 0.04', async () => {
    await proveBothWays('A226-04', 'CR-005',
      [{ ws: 'A226-01', values: { stabilisierungsart: 'nitrifikation_denitrifikation' } }, { ws: 'A226-05', values: { B_TS_BSB: 0.02 } }],
      [{ ws: 'A226-05', values: { B_TS_BSB: 0.1 } }]);
  });
  it('CR-022  V_BB IS NOT NULL AND TS_BB IS NOT NULL AND q_A IS NOT NULL (3-term existence, all via fallback)', async () => {
    await proveBothWays('A226-04', 'CR-022',
      [{ ws: 'A226-05', values: { V_BB: 500 } }, { ws: 'A226-07', values: { TS_BB: 4, q_A: 1 } }],
      [{ ws: 'A226-05', values: { V_BB: null } }]); // first conjunct fails
  });
});

describe('DWA-A-226 — A226-06 Belüftung und Sauerstoffzufuhr (§3.3.3)', () => {
  it('CR-006  (art==nitri AND O_B>=3) OR (art==nitri_denitri AND O_B>=2.5) (parenthesised)', async () => {
    await proveBothWays('A226-06', 'CR-006',
      [{ ws: 'A226-01', values: { stabilisierungsart: 'nitrifikation' } }, { ws: 'A226-06', values: { O_B: 3.5 } }],
      [{ ws: 'A226-06', values: { O_B: 2 } }]); // nitri branch: O_B<3 false; denitri branch: art mismatch false
  });
  it('CR-007  t_D / t_T <= 0.35 (arithmetic ratio)', async () => {
    await proveBothWays('A226-06', 'CR-007',
      [{ ws: 'A226-06', values: { t_D: 3, t_T: 10 } }],   // 0.30 <= 0.35
      [{ ws: 'A226-06', values: { t_D: 5, t_T: 10 } }]);  // 0.50 > 0.35
  });
  it('CR-024  t_T IS NOT NULL (existence)', async () => {
    await proveBothWays('A226-06', 'CR-024',
      [{ ws: 'A226-06', values: { t_T: 10 } }],
      [{ ws: 'A226-06', values: { t_T: null } }]);
  });
});

describe('DWA-A-226 — A226-07 Bemessung der Nachklärung (§3.4)', () => {
  it('CR-009  q_SV <= 650', async () => {
    await proveBothWays('A226-07', 'CR-009',
      [{ ws: 'A226-07', values: { q_SV: 600 } }],
      [{ ws: 'A226-07', values: { q_SV: 700 } }]);
  });
  it('CR-010  q_A <= 2', async () => {
    await proveBothWays('A226-07', 'CR-010',
      [{ ws: 'A226-07', values: { q_A: 1.5 } }],
      [{ ws: 'A226-07', values: { q_A: 3 } }]);
  });
  it('CR-011  RV <= 1', async () => {
    await proveBothWays('A226-07', 'CR-011',
      [{ ws: 'A226-07', values: { RV: 0.8 } }],
      [{ ws: 'A226-07', values: { RV: 1.5 } }]);
  });
});

describe('DWA-A-226 — A226-08 Baugrundsätze und Schlammbehandlung (§4 / §5.2)', () => {
  it('CR-016  durchtrittsweite_rechen >= 3 AND <= 8 (range)', async () => {
    await proveBothWays('A226-08', 'CR-016',
      [{ ws: 'A226-08', values: { durchtrittsweite_rechen: 5 } }],
      [{ ws: 'A226-08', values: { durchtrittsweite_rechen: 10 } }]);
  });
  it('CR-017  notstromversorgung == True (boolean equality)', async () => {
    await proveBothWays('A226-08', 'CR-017',
      [{ ws: 'A226-08', values: { notstromversorgung: true } }],
      [{ ws: 'A226-08', values: { notstromversorgung: false } }]);
  });
  it('CR-018  reservepumpe IS NOT NULL (existence on boolean)', async () => {
    await proveBothWays('A226-08', 'CR-018',
      [{ ws: 'A226-08', values: { reservepumpe: true } }],
      [{ ws: 'A226-08', values: { reservepumpe: null } }]);
  });
  it('CR-019  durchflussmessung == True (boolean equality)', async () => {
    await proveBothWays('A226-08', 'CR-019',
      [{ ws: 'A226-08', values: { durchflussmessung: true } }],
      [{ ws: 'A226-08', values: { durchflussmessung: false } }]);
  });
  it('CR-020  stapelzeit_schlamm >= 1', async () => {
    await proveBothWays('A226-08', 'CR-020',
      [{ ws: 'A226-08', values: { stapelzeit_schlamm: 2 } }],
      [{ ws: 'A226-08', values: { stapelzeit_schlamm: 0.5 } }]);
  });
});

describe('DWA-A-226 — A226-09 Betrieb und Nachweise (§6.2)', () => {
  it('CR-008  belueftungsanteil >= 65', async () => {
    await proveBothWays('A226-09', 'CR-008',
      [{ ws: 'A226-09', values: { belueftungsanteil: 70 } }],
      [{ ws: 'A226-09', values: { belueftungsanteil: 50 } }]);
  });
  it('CR-012  gluehverlust <= 55', async () => {
    await proveBothWays('A226-09', 'CR-012',
      [{ ws: 'A226-09', values: { gluehverlust: 50 } }],
      [{ ws: 'A226-09', values: { gluehverlust: 60 } }]);
  });
  it('CR-013  sauerstoffgehalt_bb >= 1.5', async () => {
    await proveBothWays('A226-09', 'CR-013',
      [{ ws: 'A226-09', values: { sauerstoffgehalt_bb: 2 } }],
      [{ ws: 'A226-09', values: { sauerstoffgehalt_bb: 1 } }]);
  });
  it('CR-014  ammonium_ablauf < 1', async () => {
    await proveBothWays('A226-09', 'CR-014',
      [{ ws: 'A226-09', values: { ammonium_ablauf: 0.5 } }],
      [{ ws: 'A226-09', values: { ammonium_ablauf: 2 } }]);
  });
  it('CR-015  restsaeurekapazitaet >= 1.5', async () => {
    await proveBothWays('A226-09', 'CR-015',
      [{ ws: 'A226-09', values: { restsaeurekapazitaet: 2 } }],
      [{ ws: 'A226-09', values: { restsaeurekapazitaet: 1 } }]);
  });
});
