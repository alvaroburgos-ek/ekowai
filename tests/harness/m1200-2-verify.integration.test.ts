/**
 * DWA-M 1200-2 (Wasserwiederverwendung — Teil 2: weitergehende Wasseraufbereitung;
 * GELBDRUCK / Entwurf, Juli 2025) — REAL save-path execution proof.
 *
 * PROVISIONAL — GELBDRUCK. The standard is a DRAFT. This harness RUNS (proof is
 * re-executable and valuable) but every finding is provisional and NO prod fix is
 * drafted for any deferred health/pathogen gate.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES each
 * of the standard's 9 live BLOCK gates (non-empty condition) by driving it through
 * the REAL enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every
 *                                      block condition against the SAVED values
 *                                      and lists the ones that definitely `fail`.
 *
 * A gate is proven ENFORCING only when shown BOTH ways: a persisted state where it
 * does NOT block, and one where it DOES (the F-4 lesson). Conditions verbatim from
 * prod; nothing is fixed here.
 *
 * COVERED GATE SHAPES:
 *   - boolean == true AND enum-membership            REQ-01
 *   - nested double-guard (IF..THEN .. AND IF..THEN) REQ-06  ← enforcement quirk, see below
 *   - var-vs-var ordering (F-4 class)                REQ-04
 *   - enum == AND numeric ordering                   REQ-05, REQ-11
 *   - boolean AND ordering AND enum ==               REQ-07
 *   - guarded enum-membership → ordering             REQ-09
 *   - existence (IS NOT EMPTY)                        REQ-10
 *   - numeric ordering                               REQ-03
 *   - cross-worksheet fallback operands              REQ-06, REQ-04, REQ-09
 *
 * REQ-06 ENFORCEMENT QUIRK (PROVISIONAL FINDING, demonstrated not fixed): the
 * printed condition nests the B-1/C-1 percentile guard INSIDE the class-A guard's
 * THEN-branch, so for classes B-1/C-1 the `perzentil_50 >= leistungsziel` check is
 * never reached (outer `class == 'A'` guard is false → vacuous pass). The class-A
 * p10 branch DOES enforce. Both behaviours are demonstrated below.
 *
 * EQUATION ENGINE checks (part B, execution-backed): the two log10 removal formulas
 * and the analytic 10th-percentile formula are evaluated through the REAL arithmetic
 * engine; the 10th-percentile check reproduces the source's own worked example
 * (Bild C.1: MW=6,58, SD=0,30, k=1,282 → 6,20). median() is confirmed UNSUPPORTED.
 */
// @vitest-environment node
import './_harness-env-m1200-2'; // top-level-await: PG + seedM12002 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM12002Harness } from './_harness-env-m1200-2';
import { evalExpression } from '@/lib/eval/arithmetic';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM12002Harness();

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

/** Persist a symbol→value map to worksheet `ws` through the REAL saveWorksheet,
 *  resolving each symbol against ITS home worksheet (`ws:symbol` key). A null
 *  value clears the field — used to VIOLATE existence gates. */
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

/** Whether `code` is in the block-gate failing list for worksheet `ws` given the
 *  CURRENT persisted project state (the real approval-gate read path). */
async function gateBlocks(ws: string, code: string): Promise<boolean> {
  const result = await checkApprovalGate(fixture.instances[ws]);
  return result.failingBlockConditions.some((c) => c.code === code);
}

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked;
 *  persist the violating saves → blocked (definite fail). Saves may span
 *  multiple worksheets (cross-worksheet fallback gates). */
async function proveBothWays(
  gateWs: string,
  code: string,
  passSaves: Save[],
  violateSaves: Save[],
): Promise<void> {
  await applySaves(passSaves);
  expect(await gateBlocks(gateWs, code), `${code} should NOT block in passing state`).toBe(false);
  await applySaves(violateSaves);
  expect(await gateBlocks(gateWs, code), `${code} SHOULD block in violating state`).toBe(true);
}

describe('DWA-M-1200-2 [GELBDRUCK] — M12002-01 Anwendungsbereich (boolean AND enum-membership)', () => {
  it('REQ-01  haeusliches_sw_anteil_ueberwiegend == true AND anwendungsbereich IN {…} (§1)', async () => {
    await proveBothWays('M12002-01', 'REQ-01',
      [{ ws: 'M12002-01', values: { haeusliches_sw_anteil_ueberwiegend: true, anwendungsbereich: 'bewaesserung_landwirtschaft' } }],
      // anwendungsbereich outside the in-scope set → membership false → AND false → block
      [{ ws: 'M12002-01', values: { anwendungsbereich: 'industrie_ausgeschlossen' } }]);
  });
});

describe('DWA-M-1200-2 [GELBDRUCK] — M12002-05 Validierung Leistungsziele', () => {
  it('REQ-04  log10_reduktion >= leistungsziel_log10 (var-vs-var, F-4 class; ziel via fallback M12002-04)', async () => {
    await proveBothWays('M12002-05', 'REQ-04',
      [
        { ws: 'M12002-04', values: { leistungsziel_log10: 6.0 } },
        { ws: 'M12002-05', values: { log10_reduktion: 6.5 } },
      ],
      [{ ws: 'M12002-05', values: { log10_reduktion: 5.0 } }]); // 5.0 < 6.0 → block
  });
  it('REQ-05  validierungsmonitoring_typ == vereinfacht AND probenanzahl_zulauf >= 16 (§3.3.3)', async () => {
    await proveBothWays('M12002-05', 'REQ-05',
      [{ ws: 'M12002-05', values: { validierungsmonitoring_typ: 'vereinfacht', probenanzahl_zulauf: 16 } }],
      [{ ws: 'M12002-05', values: { probenanzahl_zulauf: 12 } }]); // 12 < 16 → block
  });
});

describe('DWA-M-1200-2 [GELBDRUCK] — M12002-06 Analytik / Probenahme (3-term AND)', () => {
  it('REQ-07  labor_akkreditiert == true AND probenstabilitaet_h <= 72 AND probennahme_typ == mischprobe_24h (§3.3.4)', async () => {
    await proveBothWays('M12002-06', 'REQ-07',
      [{ ws: 'M12002-06', values: { analytisches_labor_akkreditiert: true, probenstabilitaet_h: 48, probennahme_typ: 'mischprobe_24h' } }],
      [{ ws: 'M12002-06', values: { probenstabilitaet_h: 96 } }]); // 96 > 72 → block
  });
});

describe('DWA-M-1200-2 [GELBDRUCK] — M12002-08 Filtration Klassen A-C (guarded enum-membership → ordering)', () => {
  it('REQ-09  IF wassergueteklasse IN {A,B-1,B-2,C-1,C-2} THEN truebung_ablauf <= 2 (Tab.3; both operands cross-ws)', async () => {
    await proveBothWays('M12002-08', 'REQ-09',
      [
        { ws: 'M12002-02', values: { wassergueteklasse: 'A' } },
        { ws: 'M12002-06', values: { truebung_ablauf: 1.5 } },
      ],
      [{ ws: 'M12002-06', values: { truebung_ablauf: 3.0 } }]); // class in set, 3.0 > 2 → block
  });
  it('REQ-09  class D (guard false — D not in {A..C-2}) vacuously passes at any turbidity', async () => {
    await saveSymbols('M12002-02', { wassergueteklasse: 'D' });
    await saveSymbols('M12002-06', { truebung_ablauf: 99 });
    expect(await gateBlocks('M12002-08', 'REQ-09')).toBe(false);
  });
});

describe('DWA-M-1200-2 [GELBDRUCK] — M12002-11 Desinfektion (existence)', () => {
  it('REQ-10  desinfektionsverfahren IS NOT EMPTY (§5.4.3)', async () => {
    await proveBothWays('M12002-11', 'REQ-10',
      [{ ws: 'M12002-11', values: { desinfektionsverfahren: 'uv' } }],
      [{ ws: 'M12002-11', values: { desinfektionsverfahren: null } }]);
  });
});

describe('DWA-M-1200-2 [GELBDRUCK] — M12002-13 Betriebsmonitoring', () => {
  it('REQ-03  perzentil_konformitaet >= 90 (90%-Konformitäts-Regel, §3.1/§6.4)', async () => {
    await proveBothWays('M12002-13', 'REQ-03',
      [{ ws: 'M12002-13', values: { perzentil_konformitaet: 95 } }],
      [{ ws: 'M12002-13', values: { perzentil_konformitaet: 80 } }]); // 80 < 90 → block
  });
  it('REQ-11  messhauefigkeit == online AND alarm_verzoegerung_min <= 30 (§6.4; Tab.6)', async () => {
    await proveBothWays('M12002-13', 'REQ-11',
      [{ ws: 'M12002-13', values: { messhauefigkeit: 'online', alarm_verzoegerung_min: 15 } }],
      [{ ws: 'M12002-13', values: { alarm_verzoegerung_min: 45 } }]); // 45 > 30 → block
  });
});

describe('DWA-M-1200-2 [GELBDRUCK] — M12002-03 REQ-06 umfängliches Validierungsmonitoring (nested double-guard)', () => {
  it('REQ-06  class A ENFORCES perzentil_10 >= leistungsziel (all operands cross-ws)', async () => {
    // Passing: class A, p10 (6.5) >= ziel (6.0)
    await applySaves([
      { ws: 'M12002-02', values: { wassergueteklasse: 'A' } },
      { ws: 'M12002-04', values: { leistungsziel_log10: 6.0 } },
      { ws: 'M12002-05', values: { perzentil_10_log10: 6.5 } },
    ]);
    expect(await gateBlocks('M12002-03', 'REQ-06'), 'class-A passing state should NOT block').toBe(false);
    // Violating: class A, p10 (5.0) < ziel (6.0) → block
    await saveSymbols('M12002-05', { perzentil_10_log10: 5.0 });
    expect(await gateBlocks('M12002-03', 'REQ-06'), 'class-A violating p10 SHOULD block').toBe(true);
  });

  it('REQ-06  QUIRK: class B-1 does NOT enforce perzentil_50 (nested guard is dead for B-1/C-1) — PROVISIONAL', async () => {
    // A grossly-violating B-1 state: perzentil_50 (1.0) is far below leistungsziel (6.0).
    // If the B-1/C-1 branch enforced, this would block. It does NOT, because the outer
    // `wassergueteklasse == 'A'` guard is false → the whole condition vacuously passes.
    await applySaves([
      { ws: 'M12002-02', values: { wassergueteklasse: 'B-1' } },
      { ws: 'M12002-04', values: { leistungsziel_log10: 6.0 } },
      { ws: 'M12002-05', values: { perzentil_50_log10: 1.0 } },
    ]);
    expect(
      await gateBlocks('M12002-03', 'REQ-06'),
      'DEMONSTRATED QUIRK: B-1 perzentil_50 violation is NOT blocked (nested-guard dead branch)',
    ).toBe(false);
  });
});

describe('DWA-M-1200-2 [GELBDRUCK] — equation engine (part B, execution-backed)', () => {
  it('Gl.(1) log10_reduktion = log10(c_zulauf / c_ablauf) computes (§3.3.2)', () => {
    // 1e6 / 1e2 = 1e4 → log10 = 4
    expect(evalExpression('log10(c_zulauf / c_ablauf)', { c_zulauf: 1e6, c_ablauf: 1e2 })).toBeCloseTo(4, 10);
  });
  it('Anhang C.2 LRV_i = log10(x_i / y_i) computes', () => {
    expect(evalExpression('log10(x_i / y_i)', { x_i: 1000, y_i: 1 })).toBeCloseTo(3, 10);
  });
  it('Anhang C.2 10th-percentile reproduces the source worked example (Bild C.1: MW=6,58 SD=0,30 k=1,282 → 6,20)', () => {
    const p10 = evalExpression('mw_log10 - 1.282 * sd_log10', { mw_log10: 6.58, sd_log10: 0.30 });
    expect(p10).toBeCloseTo(6.20, 2); // 6.58 - 0.3846 = 6.1954 ≈ 6,20 (printed value)
  });
  it('Anhang C.2 median(log10_reduktionen) is NOT engine-supported (NR verdict)', () => {
    expect(() => evalExpression('median(log10_reduktionen)', { log10_reduktionen: 1 }))
      .toThrow(/nicht unterstützt|Rewrite/);
  });
});
