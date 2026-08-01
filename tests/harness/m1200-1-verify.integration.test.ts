/**
 * DWA-M 1200-1 (Wasserwiederverwendung — Teil 1: Grundsätze; GELBDRUCK / Entwurf,
 * Juli 2025) — REAL save-path execution proof.
 *
 * PROVISIONAL — GELBDRUCK. The standard is a DRAFT. This harness RUNS (proof is
 * re-executable and valuable) but every finding is provisional and NO prod fix is
 * drafted for any deferred health/pathogen gate.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES each
 * of the standard's 14 live BLOCK gates (non-empty condition) by driving it through
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
 * CR-004 TRAP-4 DEAD-BRANCH (health gate, PROVISIONAL, demonstrated not fixed): the
 * unparenthesised triple guard collapses to a single `klasse=='A'` guard. Class A
 * enforces e_coli<=10; classes B-1/B-2/C-1/C-2/D never enforce their E.-coli limit
 * (outer guard false → vacuous pass). Both behaviours demonstrated below.
 *
 * EQUATION (part B): the sole equation EQ-001 `risikoniveau_ausgangs =
 * lookup(eintrittswahrscheinlichkeit, schadensausmass)` (Tab. 23 Risikomatrix) is a
 * QUALITATIVE matrix lookup, not an arithmetic formula — NR (not engine-evaluable).
 * Asserted below that the arithmetic engine does NOT treat `lookup(...)` as a
 * computable expression, confirming the NR verdict.
 */
// @vitest-environment node
import './_harness-env-m1200-1'; // top-level-await: PG + seedM12001 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM12001Harness } from './_harness-env-m1200-1';
import { evalExpression } from '@/lib/eval/arithmetic';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM12001Harness();

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

describe('DWA-M-1200-1 [GELBDRUCK] — M12001-02 Anwendbarkeit / Schutzgebiete', () => {
  it('CR-001  schutzzone_status IN {nein} AND heilquellenschutzgebiet IN {nein} (§5.2 / 6.3.2; WHG §61a)', async () => {
    await proveBothWays('M12001-02', 'CR-001',
      [{ ws: 'M12001-02', values: { schutzzone_status: 'nein', heilquellenschutzgebiet: 'nein' } }],
      // Lage in Wasserschutzgebietszone → membership false → AND false → block
      [{ ws: 'M12001-02', values: { schutzzone_status: 'ja' } }]);
  });
});

describe('DWA-M-1200-1 [GELBDRUCK] — M12001-07 Restrisiko (KRM 5)', () => {
  it('CR-014  restrisiko_niveau IN {sehr_niedrig, niedrig} (§6.3.4; Tab. 25)', async () => {
    await proveBothWays('M12001-07', 'CR-014',
      [{ ws: 'M12001-07', values: { restrisiko_niveau: 'niedrig' } }],
      [{ ws: 'M12001-07', values: { restrisiko_niveau: 'moderat' } }]); // moderat not in set → block
  });
});

describe('DWA-M-1200-1 [GELBDRUCK] — M12001-08 Güteklassen-Zuordnung', () => {
  it('CR-016  attest_m12001_08_cr_016 == True (boolean attest; §6.3.2 / 6.4)', async () => {
    await proveBothWays('M12001-08', 'CR-016',
      [{ ws: 'M12001-08', values: { attest_m12001_08_cr_016: true } }],
      [{ ws: 'M12001-08', values: { attest_m12001_08_cr_016: false } }]); // false == True → block
  });
});

describe('DWA-M-1200-1 [GELBDRUCK] — M12001-09 Mindestanforderungen Wasserqualität (Tab. 8)', () => {
  it('CR-004  class A ENFORCES e_coli <= 10 (Tab. 8; klasse via fallback M12001-08)', async () => {
    // Passing: class A, e_coli 5 <= 10
    await proveBothWays('M12001-09', 'CR-004',
      [
        { ws: 'M12001-08', values: { gueteklasse_zugeordnet: 'A' } },
        { ws: 'M12001-09', values: { e_coli_value: 5 } },
      ],
      [{ ws: 'M12001-09', values: { e_coli_value: 50 } }]); // class A, 50 > 10 → block
  });

  it('CR-004  TRAP-4 QUIRK: class B-1 does NOT enforce e_coli <= 100 (dead nested guard) — PROVISIONAL', async () => {
    // A grossly-violating B-1 state: e_coli 9999 is far above the printed Tab.8 ≤100
    // limit. If the B-1/B-2/C-1/C-2 branch enforced, this would block. It does NOT,
    // because the outer `gueteklasse_zugeordnet == 'A'` guard is false → the whole
    // unparenthesised condition vacuously passes. Health gate on a Gelbdruck →
    // FLAGGED, not fixed.
    await applySaves([
      { ws: 'M12001-08', values: { gueteklasse_zugeordnet: 'B-1' } },
      { ws: 'M12001-09', values: { e_coli_value: 9999 } },
    ]);
    expect(
      await gateBlocks('M12001-09', 'CR-004'),
      'DEMONSTRATED TRAP-4: B-1 e_coli=9999 violation is NOT blocked (unparenthesised dead branch)',
    ).toBe(false);
  });

  it('CR-005  IF klasse IN {A..C-2} THEN truebung <= 2 NTU (§5.2 / Tab. 8 Anm. f; klasse via fallback)', async () => {
    await proveBothWays('M12001-09', 'CR-005',
      [
        { ws: 'M12001-08', values: { gueteklasse_zugeordnet: 'A' } },
        { ws: 'M12001-09', values: { truebung_value: 1.5 } },
      ],
      [{ ws: 'M12001-09', values: { truebung_value: 3.0 } }]); // class in set, 3.0 > 2 → block
  });

  it('CR-005  class D (guard false — D not in {A..C-2}) vacuously passes at any turbidity', async () => {
    await saveSymbols('M12001-08', { gueteklasse_zugeordnet: 'D' });
    await saveSymbols('M12001-09', { truebung_value: 99 });
    expect(await gateBlocks('M12001-09', 'CR-005')).toBe(false);
  });

  it('CR-013  pfas20_value < 100 ng/l (§5.2; LAWA 2022)', async () => {
    await proveBothWays('M12001-09', 'CR-013',
      [{ ws: 'M12001-09', values: { pfas20_value: 50 } }],
      [{ ws: 'M12001-09', values: { pfas20_value: 150 } }]); // 150 not < 100 → block
  });
});

describe('DWA-M-1200-1 [GELBDRUCK] — M12001-12 Routineüberwachung (KRM 8)', () => {
  it('CR-007  IF klasse IN {A,B-1,B-2} THEN beprobung == 1x_pro_woche (Tab. 27; klasse via fallback)', async () => {
    await proveBothWays('M12001-12', 'CR-007',
      [
        { ws: 'M12001-08', values: { gueteklasse_zugeordnet: 'A' } },
        { ws: 'M12001-12', values: { beprobung_frequenz_e_coli: '1x_pro_woche' } },
      ],
      [{ ws: 'M12001-12', values: { beprobung_frequenz_e_coli: '2x_pro_monat' } }]); // body false → block
  });

  it('CR-007  class C (guard false — C not in {A,B-1,B-2}) vacuously passes at any frequency', async () => {
    await saveSymbols('M12001-08', { gueteklasse_zugeordnet: 'C-1' });
    await saveSymbols('M12001-12', { beprobung_frequenz_e_coli: '2x_pro_monat' });
    expect(await gateBlocks('M12001-12', 'CR-007')).toBe(false);
  });

  it('CR-008  compliance_quote_pct >= 90 (§5.2 EU-WasserWVVO)', async () => {
    await proveBothWays('M12001-12', 'CR-008',
      [{ ws: 'M12001-12', values: { compliance_quote_pct: 95 } }],
      [{ ws: 'M12001-12', values: { compliance_quote_pct: 80 } }]); // 80 < 90 → block
  });
});

describe('DWA-M-1200-1 [GELBDRUCK] — M12001-14 Störfallmanagement (KRM 10/11)', () => {
  it('CR-017  notfall_verteiler_existent == true AND stoerfall_meldewege == true (§6.2 / 6.3.3)', async () => {
    await proveBothWays('M12001-14', 'CR-017',
      [{ ws: 'M12001-14', values: { notfall_verteiler_existent: true, stoerfall_meldewege: true } }],
      [{ ws: 'M12001-14', values: { stoerfall_meldewege: false } }]); // AND false → block
  });
});

describe('DWA-M-1200-1 [GELBDRUCK] — M12001-15 Aufbereitungsgenehmigung (§61b WHG)', () => {
  it('CR-010  genehmigungs_inhalt_komplett == true (§7.2)', async () => {
    await proveBothWays('M12001-15', 'CR-010',
      [{ ws: 'M12001-15', values: { genehmigungs_inhalt_komplett: true } }],
      [{ ws: 'M12001-15', values: { genehmigungs_inhalt_komplett: false } }]);
  });

  it('CR-015  flaechenverzeichnis + kategorie + klasse + methode present (§7.2 / 7.4; all operands cross-ws)', async () => {
    await proveBothWays('M12001-15', 'CR-015',
      [
        { ws: 'M12001-16', values: { flaechenverzeichnis_vorhanden: true } },
        { ws: 'M12001-08', values: { anwendungsbereich_kategorie: 'landwirtschaft', gueteklasse_zugeordnet: 'A', bewaesserungsmethode: 'tropfbewaesserung' } },
      ],
      // clear anwendungsbereich_kategorie → IS NOT NULL false → AND false → block
      [{ ws: 'M12001-08', values: { anwendungsbereich_kategorie: null } }]);
  });

  it('CR-019  attest_m12001_15_cr_019 == True (§7.1 boolean attest)', async () => {
    await proveBothWays('M12001-15', 'CR-019',
      [{ ws: 'M12001-15', values: { attest_m12001_15_cr_019: true } }],
      [{ ws: 'M12001-15', values: { attest_m12001_15_cr_019: false } }]);
  });
});

describe('DWA-M-1200-1 [GELBDRUCK] — M12001-16 Aufbringungserlaubnis (§61c / §8 WHG)', () => {
  it('CR-011  flaechenverzeichnis_vorhanden == true (§7.4; §8/§9 WHG)', async () => {
    await proveBothWays('M12001-16', 'CR-011',
      [{ ws: 'M12001-16', values: { flaechenverzeichnis_vorhanden: true } }],
      [{ ws: 'M12001-16', values: { flaechenverzeichnis_vorhanden: false } }]);
  });
});

describe('DWA-M-1200-1 [GELBDRUCK] — M12001-20 RMP-Zusammenstellung', () => {
  it('CR-002  rmp_vollstaendig == true (§6.1)', async () => {
    await proveBothWays('M12001-20', 'CR-002',
      [{ ws: 'M12001-20', values: { rmp_vollstaendig: true } }],
      [{ ws: 'M12001-20', values: { rmp_vollstaendig: false } }]);
  });
});

describe('DWA-M-1200-1 [GELBDRUCK] — equation engine (part B, execution-backed)', () => {
  it('EQ-001 risikoniveau = lookup(eintrittswahrscheinlichkeit, schadensausmass) is NOT engine-computable (NR: qualitative Tab. 23 matrix)', () => {
    // The sole equation is a qualitative risk-matrix lookup, not arithmetic. The
    // arithmetic engine has no `lookup()` — it must reject the expression, confirming
    // the NR verdict (encoded honestly as a matrix reference, not a false formula).
    expect(() => evalExpression('lookup(eintrittswahrscheinlichkeit, schadensausmass)', { eintrittswahrscheinlichkeit: 3, schadensausmass: 4 }))
      .toThrow();
  });
});
