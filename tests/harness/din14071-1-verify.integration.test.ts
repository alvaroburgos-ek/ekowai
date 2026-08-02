/**
 * DIN CEN ISO/TS 14071:2016 (Critical review process + reviewer competencies, additional
 * requirements to ISO 14044) — REAL save-path execution proof.
 *
 * SOURCE PRESENT: this wave is a FULL document comparison (see seed-din14071-1.ts header).
 * The standard is a MANAGEMENT/PROCESS specification — it prints NO equations and NO numeric
 * tables, so the encoding carries 0 equations (Part B = NR, faithful by absence). This
 * harness is the EXECUTION half: it PROVES the standard's 17 live BLOCK gates (severity=
 * 'block' + non-empty condition) by driving each through the REAL enforcement chain against a
 * disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists the
 *                                      ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). Only a definite `fail`
 * blocks; `pass`/`pending`/`manual` do NOT. A gate is proven ENFORCING only when shown BOTH
 * ways: a persisted state where it does NOT block, and one where it DOES (the F-4 lesson).
 * Nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (17 gates, all severity='block'):
 *   - boolean equality `== true` (REQ-01/05/06/08/10)                    : attest flags
 *   - AND-chain of `== true`   (REQ-02/03/04/07/11/14)                   : flat left-assoc
 *   - OR of `== …`             (REQ-09)                                  : guard→OR, cross-ws LHS
 *   - membership IN {enum}     (REQ-12)                                  : lowercase, matches enum
 *   - empty-string compare `!= ''` (REQ-13, + REQ-12 conjunct)          : pending-or-pass
 *   - literal-TRUE no-op       (CX-01/02/03)                            : never fails → one-way
 *
 * CROSS-WORKSHEET FALLBACK proven (TWO cases, both symbols home on -01):
 *   REQ-09 (home -02) reads includes_data_sets (home -01); REQ-04 (home -03) reads
 *   self_declaration_submitted (home -01) — both via the conflict-free project-wide fallback.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4 known
 * engine traps present — see the seed-din14071-1.ts header for the itemised result.
 *
 * ENFORCEMENT TALLY: 13 of the 17 gates reach a definite `fail` in their violating state
 * (proven both ways). 4 are non-enforcing as block conditions and proven one-way (never
 * block): CX-01/CX-02/CX-03 (literal-TRUE no-ops) and REQ-13 (`!= ''` → pending-or-pass,
 * never fail; presence enforced by the required-field path instead). REQ-12 is driven both
 * ways at the engine level via an out-of-enum value, with the realistic-use caveat that its
 * enum picker makes the block path unreachable in normal UI use.
 */
// @vitest-environment node
import './_harness-env-din14071-1'; // top-level-await: PG + seedDIN14071 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDIN14071Harness } from './_harness-env-din14071-1';
import { DIN14071_GATES } from './seed-din14071-1';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getDIN14071Harness();

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

describe('DIN-14071-1 — seed sanity (topology matches the 17 prod block gates)', () => {
  it('seeds all 4 worksheet instances and 17 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'DIN-14071-1-01', 'DIN-14071-1-02', 'DIN-14071-1-03', 'DIN-14071-1-04',
    ]);
    expect(DIN14071_GATES.length).toBe(17);
    expect(DIN14071_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('DIN-14071-1-01 — Untersuchungsrahmen & Bestellung (§4.1, §4.2)', () => {
  it('REQ-01  scope_options_documented == true (§4.1 "shall clearly define and document which options")', async () => {
    await proveBothWays('DIN-14071-1-01', 'REQ-01',
      [{ ws: 'DIN-14071-1-01', values: { scope_options_documented: true } }],
      [{ ws: 'DIN-14071-1-01', values: { scope_options_documented: false } }]);
  });

  it('REQ-02  five conformity objectives AND-chain (§4.1 = ISO 14044:2006 6.1)', async () => {
    await proveBothWays('DIN-14071-1-01', 'REQ-02',
      [{ ws: 'DIN-14071-1-01', values: {
        obj_methods_consistent: true, obj_methods_valid: true, obj_data_appropriate: true,
        obj_interpretations_reflect: true, obj_report_transparent: true } }],
      // violate one conjunct → AND fails
      [{ ws: 'DIN-14071-1-01', values: { obj_report_transparent: false } }]);
  });

  it('REQ-03  external_reviewer_contracted AND contract_no_predetermination (§4.2.2)', async () => {
    await proveBothWays('DIN-14071-1-01', 'REQ-03',
      [{ ws: 'DIN-14071-1-01', values: { external_reviewer_contracted: true, contract_no_predetermination: true } }],
      [{ ws: 'DIN-14071-1-01', values: { contract_no_predetermination: false } }]);
  });

  it('REQ-05  independence_maintained == true (§4.1 concurrent independence)', async () => {
    await proveBothWays('DIN-14071-1-01', 'REQ-05',
      [{ ws: 'DIN-14071-1-01', values: { independence_maintained: true } }],
      [{ ws: 'DIN-14071-1-01', values: { independence_maintained: false } }]);
  });
});

describe('DIN-14071-1-02 — Prozess, Bericht & Prüfaussage (§4.3–§4.6)', () => {
  it('REQ-06  report_comments_recommendations_responses == true (§4.5)', async () => {
    await proveBothWays('DIN-14071-1-02', 'REQ-06',
      [{ ws: 'DIN-14071-1-02', values: { report_comments_recommendations_responses: true } }],
      [{ ws: 'DIN-14071-1-02', values: { report_comments_recommendations_responses: false } }]);
  });

  it('REQ-07  completed_on_final_report AND statement_refers_one_study (§4.3.1 + §4.4)', async () => {
    await proveBothWays('DIN-14071-1-02', 'REQ-07',
      [{ ws: 'DIN-14071-1-02', values: { completed_on_final_report: true, statement_refers_one_study: true } }],
      [{ ws: 'DIN-14071-1-02', values: { statement_refers_one_study: false } }]);
  });

  it('REQ-08  statement_in_lca_report == true (§4.5 "shall be part of the final LCA report")', async () => {
    await proveBothWays('DIN-14071-1-02', 'REQ-08',
      [{ ws: 'DIN-14071-1-02', values: { statement_in_lca_report: true } }],
      [{ ws: 'DIN-14071-1-02', values: { statement_in_lca_report: false } }]);
  });

  it('REQ-09  includes_data_sets == false OR sampling_methods_disclosed == true (§4.5, guard→OR, cross-ws LHS)', async () => {
    await proveBothWays('DIN-14071-1-02', 'REQ-09',
      // pass: no data-set review (left true) — includes_data_sets home is -01 (cross-ws fallback)
      [{ ws: 'DIN-14071-1-01', values: { includes_data_sets: false } },
       { ws: 'DIN-14071-1-02', values: { sampling_methods_disclosed: false } }],
      // violate: data sets reviewed BUT sampling not disclosed → both disjuncts false → fail
      [{ ws: 'DIN-14071-1-01', values: { includes_data_sets: true } },
       { ws: 'DIN-14071-1-02', values: { sampling_methods_disclosed: false } }]);
  });

  it('REQ-10  comments_based_on_iso == true (§4.7.2 "justifications shall be based exclusively on ISO 14040/14044")', async () => {
    await proveBothWays('DIN-14071-1-02', 'REQ-10',
      [{ ws: 'DIN-14071-1-02', values: { comments_based_on_iso: true } }],
      [{ ws: 'DIN-14071-1-02', values: { comments_based_on_iso: false } }]);
  });

  it('REQ-14  revision_justified_documented AND original_commissioner_informed (§4.6)', async () => {
    await proveBothWays('DIN-14071-1-02', 'REQ-14',
      [{ ws: 'DIN-14071-1-02', values: { revision_justified_documented: true, original_commissioner_informed: true } }],
      [{ ws: 'DIN-14071-1-02', values: { revision_justified_documented: false } }]);
  });
});

describe('DIN-14071-1-03 — Kompetenzen des/der Prüfer(s) (§4.2.1/Annex B, §5)', () => {
  it('REQ-04  self_declaration_submitted (cross-ws -01) AND not_involved_in_study AND no_vested_interest (§4.2.1 + Annex B)', async () => {
    await proveBothWays('DIN-14071-1-03', 'REQ-04',
      [{ ws: 'DIN-14071-1-01', values: { self_declaration_submitted: true } },
       { ws: 'DIN-14071-1-03', values: { not_involved_in_study: true, no_vested_interest: true } }],
      // violate a LOCAL operand → AND fails (cross-ws LHS stays true)
      [{ ws: 'DIN-14071-1-03', values: { not_involved_in_study: false } }]);
  });

  it('REQ-11  eight competencies AND-chain (§5 six knowledge items + CV + qualifications)', async () => {
    await proveBothWays('DIN-14071-1-03', 'REQ-11',
      [{ ws: 'DIN-14071-1-03', values: {
        comp_iso_14040_14044: true, comp_lca_methodology: true, comp_critical_review_practice: true,
        comp_scientific_disciplines: true, comp_performance_aspects: true, comp_study_language: true,
        cv_provided: true, qualifications_demonstrated: true } }],
      [{ ws: 'DIN-14071-1-03', values: { comp_study_language: false } }]);
  });
});

describe('DIN-14071-1-04 — Konformitätsfeststellung & Unterzeichnung (§4.5)', () => {
  // CX-01/02/03 `TRUE` — literal-TRUE NO-OPs. evaluateCondition('TRUE') → pass ALWAYS, so
  // they can NEVER appear in failingBlockConditions. Proven ONE-WAY: never block, any state.
  // Cross-standard connective placeholders (not printed "shall" clauses of THIS standard).
  for (const code of ['CX-01', 'CX-02', 'CX-03'] as const) {
    it(`${code}  TRUE — never blocks (TRUE no-op, one-way proof only)`, async () => {
      await applySaves([{ ws: 'DIN-14071-1-04', values: { conformance_result: 'conformant' } }]);
      expect(await gateBlocks('DIN-14071-1-04', code)).toBe(false);
      await applySaves([{ ws: 'DIN-14071-1-04', values: { conformance_result: null } }]);
      expect(await gateBlocks('DIN-14071-1-04', code)).toBe(false);
    });
  }

  // REQ-12 — driven both ways at the ENGINE level. The `review_process_description != ''`
  // conjunct is pending-not-fail when empty, so the only path to a definite fail is the IN
  // conjunct being false: conformance_result PRESENT but ∉ {conformant,non_conformant}.
  // Realistic-use caveat (in header): the enum picker makes this block path unreachable in
  // normal UI use; presence is enforced by the required-field mechanism instead.
  it('REQ-12  conformance_result IN {conformant,non_conformant} AND review_process_description != \'\' (§4.5)', async () => {
    await proveBothWays('DIN-14071-1-04', 'REQ-12',
      [{ ws: 'DIN-14071-1-04', values: { conformance_result: 'conformant', review_process_description: 'Prüfung nach ISO 14044:2006, 6.2; zwei Stellungnahme-Iterationen.' } }],
      // violate: out-of-enum value → IN false → AND false → definite fail
      [{ ws: 'DIN-14071-1-04', values: { conformance_result: 'indeterminate' } }]);
  });

  // REQ-13 `reviewer_signatures != ''` — DISTINCT non-enforcing shape. A `text != ''` compare
  // returns `missing` (→ pending, NOT fail) when empty/absent, and `pass` when present, so it
  // can NEVER reach a definite fail. Presence is enforced by the required-field path instead.
  // Proven that it NEVER blocks in any state (one-way / non-enforcing as a block condition).
  it('REQ-13  reviewer_signatures != \'\' — never blocks (!= \'\' pending-or-pass, non-enforcing)', async () => {
    // present → pass → not blocking
    await applySaves([{ ws: 'DIN-14071-1-04', values: { reviewer_signatures: 'Dr. A. Müller (Vorsitz); Prof. B. Klein' } }]);
    expect(await gateBlocks('DIN-14071-1-04', 'REQ-13')).toBe(false);
    // absent → pending (NOT fail) → still not in failingBlockConditions
    await applySaves([{ ws: 'DIN-14071-1-04', values: { reviewer_signatures: null } }]);
    expect(await gateBlocks('DIN-14071-1-04', 'REQ-13')).toBe(false);
  });
});
