/**
 * DIN EN ISO 14044:2006 ("Umweltmanagement — Ökobilanz", LCA requirements & guidelines)
 * — REAL save-path execution proof.
 *
 * SOURCE PRESENT: this wave is a FULL document comparison (see seed-din14044.ts header).
 * The standard's normative structure maps 1:1 to the 6 worksheets (goal/scope §4.2, LCI
 * §4.3, LCIA §4.4, interpretation §4.5, reporting §5, critical review §6). The single
 * equation EQ-01 (§4.4.2.4 characterization) is a prose-derived, non-machine-evaluable
 * representation — verified FAITHFUL against the printed defined terms, not driven here.
 * This harness is the EXECUTION half: it PROVES the standard's 16 live BLOCK gates
 * (severity='block' + non-empty condition) by driving each through the REAL enforcement
 * chain against a disposable embedded Postgres:
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
 * COVERED GATE SHAPES (16 gates, all severity='block'):
 *   - membership IN {lowercase enum} (REQ-01, REQ-12)      : `x IN {a,b}`
 *   - existence IS NOT EMPTY (REQ-02/03/04/08/11)          : text presence — the 5 gates
 *       just repaired corpus-wide from `!= ''`; each proven to reach a definite fail
 *   - existence IS NOT NULL (REQ-07/09/13/14/16/17)        : boolean/enum/number presence
 *   - arithmetic comparison (part of REQ-03)               : `reference_flow > 0`
 *   - boolean equality `== true` (REQ-06/10/15)            : documented/checked flags
 *
 * CROSS-WORKSHEET FALLBACK proven: REQ-09/14/16 read comparative_assertion_public (home
 * -01) and REQ-16/17 read critical_review_type (home -01) from their own gate-home
 * worksheets via the conflict-free project-wide fallback. Each violating state flips a
 * LOCAL field so the shared -01 operands are never disturbed between serial tests.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4
 * known engine traps present; ZERO `!= ''` gates remain; NO literal-TRUE no-op gate.
 * REQ-09/14/16/17 are presence-only degenerate gates (title states a stronger rule than
 * the condition enforces) — they DO reach a definite fail (proven both ways) but the
 * semantic gap is a sign-off-sheet item, not a source-settled fix. See seed header.
 */
// @vitest-environment node
import './_harness-env-din14044'; // top-level-await: PG + seedDIN14044 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDIN14044Harness } from './_harness-env-din14044';
import { DIN14044_GATES } from './seed-din14044';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getDIN14044Harness();

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

describe('DIN-EN-ISO-14044 — seed sanity (topology matches the 16 prod block gates)', () => {
  it('seeds all 6 worksheet instances and 16 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'DIN-EN-ISO-14044-01', 'DIN-EN-ISO-14044-02', 'DIN-EN-ISO-14044-03',
      'DIN-EN-ISO-14044-04', 'DIN-EN-ISO-14044-05', 'DIN-EN-ISO-14044-06',
    ]);
    expect(DIN14044_GATES.length).toBe(16);
    expect(DIN14044_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DIN-EN-ISO-14044-01 — Ziel & Untersuchungsrahmen (§4.2)', () => {
  it('REQ-01  study_type IN {lca,lci} (membership)', async () => {
    await proveBothWays('DIN-EN-ISO-14044-01', 'REQ-01',
      [{ ws: 'DIN-EN-ISO-14044-01', values: { study_type: 'lca' } }],
      [{ ws: 'DIN-EN-ISO-14044-01', values: { study_type: 'not_a_study_type' } }]); // outside set → fail
  });
  it('REQ-02  intended_application/study_reasons/intended_audience IS NOT EMPTY (repaired != \'\')', async () => {
    await proveBothWays('DIN-EN-ISO-14044-01', 'REQ-02',
      [{ ws: 'DIN-EN-ISO-14044-01', values: {
        intended_application: 'Vergleich zweier Verpackungssysteme',
        study_reasons: 'Interne Optimierung',
        intended_audience: 'Produktentwicklung',
      } }],
      [{ ws: 'DIN-EN-ISO-14044-01', values: { intended_application: null } }]); // clear one → AND fails
  });
  it('REQ-03  functional_unit IS NOT EMPTY AND reference_flow > 0', async () => {
    await proveBothWays('DIN-EN-ISO-14044-01', 'REQ-03',
      [{ ws: 'DIN-EN-ISO-14044-01', values: { functional_unit: '1 000 h Beleuchtung', reference_flow: 1 } }],
      // violate: keep functional_unit set, drop reference_flow to 0 → 0 > 0 is false → fail
      [{ ws: 'DIN-EN-ISO-14044-01', values: { reference_flow: 0 } }]);
  });
  it('REQ-04  system_boundary IS NOT EMPTY AND cutoff_criteria IS NOT EMPTY', async () => {
    await proveBothWays('DIN-EN-ISO-14044-01', 'REQ-04',
      [{ ws: 'DIN-EN-ISO-14044-01', values: { system_boundary: 'cradle-to-grave', cutoff_criteria: 'Masse 1 %, Energie 1 %' } }],
      [{ ws: 'DIN-EN-ISO-14044-01', values: { system_boundary: null } }]);
  });
});

describe('DIN-EN-ISO-14044-02 — Sachbilanz LCI (§4.3)', () => {
  it('REQ-06  calculation_procedures_documented == true AND data_validation_done == true', async () => {
    await proveBothWays('DIN-EN-ISO-14044-02', 'REQ-06',
      [{ ws: 'DIN-EN-ISO-14044-02', values: { calculation_procedures_documented: true, data_validation_done: true } }],
      [{ ws: 'DIN-EN-ISO-14044-02', values: { calculation_procedures_documented: false } }]);
  });
  it('REQ-07  allocation_procedure/documented/balance_preserved/sensitivity_done IS NOT NULL', async () => {
    await proveBothWays('DIN-EN-ISO-14044-02', 'REQ-07',
      [{ ws: 'DIN-EN-ISO-14044-02', values: {
        allocation_procedure: 'physical_relationship',
        allocation_documented: true,
        allocation_balance_preserved: true,
        allocation_sensitivity_done: true,
      } }],
      [{ ws: 'DIN-EN-ISO-14044-02', values: { allocation_documented: null } }]); // clear one → AND fails
  });
});

describe('DIN-EN-ISO-14044-03 — Wirkungsabschätzung LCIA (§4.4)', () => {
  it('REQ-08  impact_categories/category_indicators/characterization_model IS NOT EMPTY (repaired != \'\')', async () => {
    await proveBothWays('DIN-EN-ISO-14044-03', 'REQ-08',
      [{ ws: 'DIN-EN-ISO-14044-03', values: {
        impact_categories: 'Klimawandel; Versauerung',
        category_indicators: 'GWP100; SO2-Äq.',
        characterization_model: 'IPCC 2013; CML 2001',
      } }],
      [{ ws: 'DIN-EN-ISO-14044-03', values: { impact_categories: null } }]);
  });
  it('REQ-09  comparative_assertion_public(-01, cross-ws) AND weighting_applied AND lcia_dq_technique IS NOT NULL', async () => {
    await proveBothWays('DIN-EN-ISO-14044-03', 'REQ-09',
      [{ ws: 'DIN-EN-ISO-14044-01', values: { comparative_assertion_public: false } },   // cross-ws home
       { ws: 'DIN-EN-ISO-14044-03', values: { weighting_applied: false, lcia_dq_technique: 'sensitivity_analysis' } }],
      // violate a LOCAL field so the shared -01 operand stays set for later tests
      [{ ws: 'DIN-EN-ISO-14044-03', values: { weighting_applied: null } }]);
  });
});

describe('DIN-EN-ISO-14044-04 — Auswertung / Interpretation (§4.5)', () => {
  it('REQ-10  completeness/sensitivity/consistency_check_done == true (three checks)', async () => {
    await proveBothWays('DIN-EN-ISO-14044-04', 'REQ-10',
      [{ ws: 'DIN-EN-ISO-14044-04', values: { completeness_check_done: true, sensitivity_check_done: true, consistency_check_done: true } }],
      [{ ws: 'DIN-EN-ISO-14044-04', values: { sensitivity_check_done: false } }]);
  });
  it('REQ-11  conclusions IS NOT EMPTY AND limitations IS NOT EMPTY (repaired != \'\')', async () => {
    await proveBothWays('DIN-EN-ISO-14044-04', 'REQ-11',
      [{ ws: 'DIN-EN-ISO-14044-04', values: { conclusions: 'System A hat geringeres GWP', limitations: 'Datenlücken bei Nutzungsphase' } }],
      [{ ws: 'DIN-EN-ISO-14044-04', values: { conclusions: null } }]);
  });
});

describe('DIN-EN-ISO-14044-05 — Berichterstattung (§5)', () => {
  it('REQ-12  report_type IN {internal,third_party} (membership)', async () => {
    await proveBothWays('DIN-EN-ISO-14044-05', 'REQ-12',
      [{ ws: 'DIN-EN-ISO-14044-05', values: { report_type: 'third_party' } }],
      [{ ws: 'DIN-EN-ISO-14044-05', values: { report_type: 'memo' } }]);
  });
  it('REQ-13  third_party_report_prepared IS NOT NULL AND iso_conformance_statement IS NOT NULL', async () => {
    await proveBothWays('DIN-EN-ISO-14044-05', 'REQ-13',
      [{ ws: 'DIN-EN-ISO-14044-05', values: { third_party_report_prepared: true, iso_conformance_statement: true } }],
      [{ ws: 'DIN-EN-ISO-14044-05', values: { iso_conformance_statement: null } }]);
  });
  it('REQ-14  comparative_assertion_public(-01, cross-ws) AND grouping_value_choice_statement IS NOT NULL', async () => {
    await proveBothWays('DIN-EN-ISO-14044-05', 'REQ-14',
      [{ ws: 'DIN-EN-ISO-14044-01', values: { comparative_assertion_public: true } },      // cross-ws home
       { ws: 'DIN-EN-ISO-14044-05', values: { grouping_value_choice_statement: true } }],
      [{ ws: 'DIN-EN-ISO-14044-05', values: { grouping_value_choice_statement: null } }]); // local violate
  });
});

describe('DIN-EN-ISO-14044-06 — Kritische Prüfung (§6)', () => {
  it('REQ-15  review_objectives_ensured == true AND review_scope_recorded == true', async () => {
    await proveBothWays('DIN-EN-ISO-14044-06', 'REQ-15',
      [{ ws: 'DIN-EN-ISO-14044-06', values: { review_objectives_ensured: true, review_scope_recorded: true } }],
      [{ ws: 'DIN-EN-ISO-14044-06', values: { review_scope_recorded: false } }]);
  });
  it('REQ-16  comparative_assertion_public + critical_review_type (-01, cross-ws) AND review_panel_members IS NOT NULL', async () => {
    await proveBothWays('DIN-EN-ISO-14044-06', 'REQ-16',
      [{ ws: 'DIN-EN-ISO-14044-01', values: { comparative_assertion_public: true, critical_review_type: 'panel_review' } }, // cross-ws home
       { ws: 'DIN-EN-ISO-14044-06', values: { review_panel_members: 3 } }],
      [{ ws: 'DIN-EN-ISO-14044-06', values: { review_panel_members: null } }]); // local violate
  });
  it('REQ-17  critical_review_type (-01, cross-ws) AND reviewer_independent IS NOT NULL', async () => {
    await proveBothWays('DIN-EN-ISO-14044-06', 'REQ-17',
      [{ ws: 'DIN-EN-ISO-14044-01', values: { critical_review_type: 'expert_review' } }, // cross-ws home
       { ws: 'DIN-EN-ISO-14044-06', values: { reviewer_independent: true } }],
      [{ ws: 'DIN-EN-ISO-14044-06', values: { reviewer_independent: null } }]); // local violate
  });
});
