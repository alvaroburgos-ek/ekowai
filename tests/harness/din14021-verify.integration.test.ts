/**
 * DIN EN ISO 14021:2016 (Type II self-declared environmental claims) — REAL save-path
 * execution proof.
 *
 * SOURCE PRESENT: this wave is a FULL document comparison (see seed-din14021.ts header).
 * The 3 equations (EQ-01 §7.6.3, EQ-02 §7.8.4, EQ-03 §7.10.3) were verified
 * symbol-by-symbol against the printed formulas — all FAITHFUL. This harness is the
 * EXECUTION half: it PROVES the standard's 50 live BLOCK gates (severity='block' +
 * non-empty condition) by driving each through the REAL enforcement chain against a
 * disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists the
 *                                      ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block, and a
 * persisted state where it DOES (the F-4 lesson). Nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (50 gates, all severity='block'):
 *   - existence IS NOT NULL (REQ-04/07/17/21/22/23/25/49 + the 20 presence dups) : `x IS NOT NULL`
 *   - boolean equality `== True` (REQ-01/02/03/05/06/08/09/10/12/13/16/18/19/48) : attest flags
 *   - AND-chain of existence (REQ-11/14/15/24/27/46)                             : flat left-assoc
 *   - arithmetic acompare (REQ-20)                                               : `R_energy - E_energy > 0`
 *   - literal-TRUE no-op (REQ-26)                                                : never fails → one-way proof
 *
 * CROSS-WORKSHEET FALLBACK proven: REQ-11 (home -03) reads selected_claim_type (home -01)
 * via the conflict-free project-wide fallback.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4
 * known engine traps present — see the seed-din14021.ts header for the itemised result.
 * 49 of the 50 gates reach a definite `fail` in their violating state (proven both ways);
 * REQ-26 (`TRUE`) is a literal-TRUE no-op that can NEVER fail and is proven one-way only.
 */
// @vitest-environment node
import './_harness-env-din14021'; // top-level-await: PG + seedDIN14021 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDIN14021Harness } from './_harness-env-din14021';
import { DIN14021_GATES } from './seed-din14021';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getDIN14021Harness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string | null | Record<string, unknown> | unknown[];

/** Persist a symbol→value map to worksheet `ws` (the symbol's HOME worksheet) through the
 *  REAL saveWorksheet. A null value clears the field. */
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

/** Prove a gate ENFORCING both ways: persist the passing saves → NOT blocked; persist the
 *  violating saves → blocked (definite fail). */
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

describe('DIN-14021 — seed sanity (topology matches the 50 prod block gates)', () => {
  it('seeds all 5 worksheet instances and 50 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'DIN-14021-01', 'DIN-14021-03', 'DIN-14021-04', 'DIN-14021-05', 'DIN-14021-06',
    ]);
    expect(DIN14021_GATES.length).toBe(50);
    expect(DIN14021_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DIN-14021-01 — Aussagenregistrierung & Geltungsbereich (§5.7 d, §7.x)', () => {
  it('REQ-07  claim_scope IS NOT NULL (enum existence)', async () => {
    await proveBothWays('DIN-14021-01', 'REQ-07',
      [{ ws: 'DIN-14021-01', values: { claim_scope: 'complete_product' } }],
      [{ ws: 'DIN-14021-01', values: { claim_scope: null } }]);
  });

  // The 20 identical `selected_claim_type IS NOT NULL` presence gates (REQ-28..45,47,50).
  // Each enforces (fail when no claim type is selected) — proven both ways in a loop. They
  // are degenerate duplicates: each title anchors a different §7.x clause while all share
  // one presence check (REQ-38=7.12.1.1 reusable, REQ-39=7.12.1.2 refillable are the
  // R-2 definition-as-gate pair). Enforcement real; semantic mismatch is a sign-off item.
  const presenceGateCodes = DIN14021_GATES
    .filter((g) => g.ws === 'DIN-14021-01' && g.cond === 'selected_claim_type IS NOT NULL')
    .map((g) => g.code);
  it('presence-dup group is exactly the 20 selected_claim_type IS NOT NULL gates', () => {
    expect(presenceGateCodes).toEqual([
      'REQ-28', 'REQ-29', 'REQ-30', 'REQ-31', 'REQ-32', 'REQ-33', 'REQ-34', 'REQ-35',
      'REQ-36', 'REQ-37', 'REQ-38', 'REQ-39', 'REQ-40', 'REQ-41', 'REQ-42', 'REQ-43',
      'REQ-44', 'REQ-45', 'REQ-47', 'REQ-50',
    ]);
  });
  for (const code of presenceGateCodes) {
    it(`${code}  selected_claim_type IS NOT NULL (presence dup)`, async () => {
      await proveBothWays('DIN-14021-01', code,
        [{ ws: 'DIN-14021-01', values: { selected_claim_type: 'recyclable' } }],
        [{ ws: 'DIN-14021-01', values: { selected_claim_type: null } }]);
    });
  }
});

describe('DIN-14021-03 — Allgemeine Anforderungen an alle Aussagen (§5.7, §5.10)', () => {
  for (const [code, sym] of [
    ['REQ-01', 'vague_claim_present'],
    ['REQ-02', 'free_claim_substance_level_ok'],
    ['REQ-03', 'sustainability_claim_present'],
    ['REQ-05', 'claim_accurate_not_misleading'],
    ['REQ-06', 'claim_substantiated_verified'],
    ['REQ-08', 'lifecycle_considered'],
    ['REQ-09', 'third_party_implication_avoided'],
    ['REQ-10', 'claim_geographic_relevance'],
    ['REQ-48', 'mobius_loop_used'],
  ] as const) {
    it(`${code}  ${sym} == True (boolean equality)`, async () => {
      await proveBothWays('DIN-14021-03', code,
        [{ ws: 'DIN-14021-03', values: { [sym]: true } }],
        [{ ws: 'DIN-14021-03', values: { [sym]: false } }]);
    });
  }

  it('REQ-04  explanatory_statement IS NOT NULL (text existence)', async () => {
    await proveBothWays('DIN-14021-03', 'REQ-04',
      [{ ws: 'DIN-14021-03', values: { explanatory_statement: 'Bezieht sich auf die Kunststoffkomponente.' } }],
      [{ ws: 'DIN-14021-03', values: { explanatory_statement: null } }]);
  });

  it('REQ-11  mobius_loop_used IS NOT NULL AND selected_claim_type IS NOT NULL (AND, cross-ws RHS)', async () => {
    await proveBothWays('DIN-14021-03', 'REQ-11',
      // pass: both present (selected_claim_type on -01 → cross-ws fallback)
      [{ ws: 'DIN-14021-01', values: { selected_claim_type: 'recycled_content' } },
       { ws: 'DIN-14021-03', values: { mobius_loop_used: true } }],
      // violate: clear the local operand → first exists false → AND fails
      [{ ws: 'DIN-14021-03', values: { mobius_loop_used: null } }]);
  });

  // REQ-26 `TRUE` — literal-TRUE NO-OP. evaluateCondition('TRUE') → pass ALWAYS, so it can
  // NEVER appear in failingBlockConditions. Proven ONE-WAY: it never blocks, in any state.
  // Documented as a TRUE no-op gate (the M-349 class) — NOT a source-settled fix.
  it('REQ-26  TRUE — never blocks (TRUE no-op, one-way proof only)', async () => {
    // populated state
    await applySaves([{ ws: 'DIN-14021-03', values: { mobius_loop_used: true } }]);
    expect(await gateBlocks('DIN-14021-03', 'REQ-26')).toBe(false);
    // cleared state — still never blocks (cannot be driven to a fail)
    await applySaves([{ ws: 'DIN-14021-03', values: { mobius_loop_used: null } }]);
    expect(await gateBlocks('DIN-14021-03', 'REQ-26')).toBe(false);
  });
});

describe('DIN-14021-04 — Bewertung & Überprüfung (§6.2–§6.5)', () => {
  for (const [code, sym] of [
    ['REQ-12', 'evaluation_documented'],
    ['REQ-13', 'reliable_reproducible_results'],
    ['REQ-16', 'product_packaging_separated'],
    ['REQ-18', 'verifiable_without_confidential'],
    ['REQ-19', 'info_documented_min'],
  ] as const) {
    it(`${code}  ${sym} == True (boolean equality)`, async () => {
      await proveBothWays('DIN-14021-04', code,
        [{ ws: 'DIN-14021-04', values: { [sym]: true } }],
        [{ ws: 'DIN-14021-04', values: { [sym]: false } }]);
    });
  }

  it('REQ-14  comparative_claim IS NOT NULL AND comparison_basis IS NOT NULL (AND)', async () => {
    await proveBothWays('DIN-14021-04', 'REQ-14',
      [{ ws: 'DIN-14021-04', values: { comparative_claim: true, comparison_basis: 'own_prior_product' } }],
      [{ ws: 'DIN-14021-04', values: { comparison_basis: null } }]);
  });

  it('REQ-15  comparison_same_functional_unit IS NOT NULL AND comparison_time_interval IS NOT NULL (AND)', async () => {
    await proveBothWays('DIN-14021-04', 'REQ-15',
      [{ ws: 'DIN-14021-04', values: { comparison_same_functional_unit: true, comparison_time_interval: 12 } }],
      [{ ws: 'DIN-14021-04', values: { comparison_time_interval: null } }]);
  });

  it('REQ-17  method_selected IS NOT NULL (enum existence)', async () => {
    await proveBothWays('DIN-14021-04', 'REQ-17',
      [{ ws: 'DIN-14021-04', values: { method_selected: 'international_standard' } }],
      [{ ws: 'DIN-14021-04', values: { method_selected: null } }]);
  });

  it('REQ-46  comparative_claim + comparison_basis + comparison_same_functional_unit IS NOT NULL (triple AND)', async () => {
    await proveBothWays('DIN-14021-04', 'REQ-46',
      [{ ws: 'DIN-14021-04', values: { comparative_claim: true, comparison_basis: 'own_prior_process', comparison_same_functional_unit: true } }],
      [{ ws: 'DIN-14021-04', values: { comparison_same_functional_unit: null } }]);
  });
});

describe('DIN-14021-05 — Spezifische Anforderungen an ausgewählte Aussagen (§7.6–§7.17)', () => {
  it('REQ-20  R_energy - E_energy > 0 (arithmetic acompare, §7.6.3 a)', async () => {
    await proveBothWays('DIN-14021-05', 'REQ-20',
      // pass: 100 - 40 = 60 > 0
      [{ ws: 'DIN-14021-05', values: { R_energy: 100, E_energy: 40 } }],
      // violate: 40 - 40 = 0, NOT > 0 → fail
      [{ ws: 'DIN-14021-05', values: { R_energy: 40, E_energy: 40 } }]);
  });

  for (const [code, sym] of [
    ['REQ-21', 'recycled_content_pct'],
    ['REQ-22', 'renewable_material_pct'],
    ['REQ-23', 'renewable_energy_pct'],
    ['REQ-25', 'carbon_footprint_value'],
    ['REQ-49', 'carbon_footprint_value'], // duplicate of REQ-25
  ] as const) {
    it(`${code}  ${sym} IS NOT NULL (number existence)`, async () => {
      await proveBothWays('DIN-14021-05', code,
        [{ ws: 'DIN-14021-05', values: { [sym]: 42 } }],
        [{ ws: 'DIN-14021-05', values: { [sym]: null } }]);
    });
  }

  it('REQ-24  carbon_neutral_offset_declared IS NOT NULL AND carbon_footprint_value IS NOT NULL (AND)', async () => {
    await proveBothWays('DIN-14021-05', 'REQ-24',
      [{ ws: 'DIN-14021-05', values: { carbon_neutral_offset_declared: true, carbon_footprint_value: 1234 } }],
      [{ ws: 'DIN-14021-05', values: { carbon_footprint_value: null } }]);
  });
});

describe('DIN-14021-06 — Konformitätsurteil & Freigabe', () => {
  it('REQ-27  general/verification/specific_requirements_met + compliance_verdict IS NOT NULL (quad AND)', async () => {
    await proveBothWays('DIN-14021-06', 'REQ-27',
      [{ ws: 'DIN-14021-06', values: {
        general_requirements_met: true,
        verification_requirements_met: true,
        specific_requirements_met: true,
        compliance_verdict: 'conform',
      } }],
      [{ ws: 'DIN-14021-06', values: { compliance_verdict: null } }]);
  });
});
