/**
 * DWA-M-820-2 (Merkblatt DWA-M 820-2 — "Qualität von Ingenieurleistungen optimieren
 * — Teil 2: Durchführung"; April 2023, 1. Auflage, final Merkblatt / Weißdruck) —
 * REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES the
 * standard's live BLOCK gates (severity='block' + non-empty condition) by driving each
 * through the REAL enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block
 *                                      condition against the SAVED values and lists
 *                                      the ones that definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven
 * ENFORCING only when shown BOTH ways: a persisted state where it does NOT block, and
 * a persisted state where it DOES (the F-4 lesson). Conditions verbatim from prod;
 * nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (M-820-2 is a quality-building-block advisory standard — 0
 * equations, 43 block gates, all worksheet-local):
 *   - enum existence + json IS NOT EMPTY        REQ-01 (primary_sector + included_hoai_phases)
 *   - single boolean equality (`== true`)        40 gates (REQ-03..REQ-58)
 *   - two-conjunct boolean AND                   REQ-09, REQ-10
 *   - date `!= null AND date != null`            REQ-51  ← NON-ENFORCING (defect, see below)
 *
 * GRAMMAR-TRAP AUDIT (this session, verified against evaluate.ts + prod enum values):
 *   - bare-ident-RHS ==/!= field-vs-field: NONE. Every `==` RHS is the boolean literal
 *     `true`. No `field == field` / `field != field` silent-string-coerce trap.
 *   - always-false IN-set: NONE among block gates (no membership block gate). The only
 *     IN-set is the WARN REQ-35 `discharge_permit_extension IN {"applied","granted",
 *     "not_required"}` — all three are exact lowercase matches of the prod enum values
 *     (which are applied/granted/pending/not_required); membership resolves, no case trap.
 *   - nested-guard dead-branch (unparenthesised IF..THEN..AND IF..THEN): NONE — M-820-2
 *     has no guarded (IF/THEN) block gate at all.
 *
 * DEFECT demonstrated (REVERSAL — flagged, NOT applied per task):
 *   - REQ-51 @820-2-24 `warranty_start_date != null AND warranty_end_date != null`:
 *     `null` tokenizes to the NULL literal, so each conjunct takes the `compare` path,
 *     NOT the `exists` (IS NOT NULL) path. `compare(dateValue, '!=', null)` = pass when
 *     the date is SET; a MISSING date resolves to `pending`, never `fail`. Therefore
 *     REQ-51 can only ever be pass or pending — it NEVER reaches a definite `fail` and
 *     NEVER blocks. A block gate meant to require both warranty dates does not enforce.
 *     The dedicated test below drives it BOTH ways and shows the "violating" state does
 *     NOT block (the reversal). Draft fix (not applied): rewrite as
 *     `warranty_start_date IS NOT NULL AND warranty_end_date IS NOT NULL` (the `exists`
 *     path returns a definite `fail` when a date is absent → enforces).
 */
// @vitest-environment node
import './_harness-env-m820-2'; // top-level-await: PG + seedM820_2 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM820_2Harness } from './_harness-env-m820-2';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM820_2Harness();

let saveWorksheet: typeof SaveWorksheet;
let checkApprovalGate: typeof CheckApprovalGate;

beforeAll(async () => {
  ({ saveWorksheet } = await import('@/lib/actions/worksheet'));
  ({ checkApprovalGate } = await import('@/lib/actions/approval-gate'));
});

afterAll(async () => {
  await harness.stop();
});

type Val = number | boolean | string | null | unknown[];

/** Persist a symbol→value map to worksheet `ws` through the REAL saveWorksheet,
 *  resolving each symbol against ITS home worksheet (`ws:symbol` key). A null value
 *  clears the field. */
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

/** Simple `<boolean symbol> == true` gate whose symbol is homed on `ws`. */
async function proveBooleanGate(ws: string, code: string, symbol: string): Promise<void> {
  await proveBothWays(ws, code,
    [{ ws, values: { [symbol]: true } }],
    [{ ws, values: { [symbol]: false } }]);
}

describe('DWA-M-820-2 — 820-2-01 Projektregistrierung und Umfang (§1 Anwendungsbereich)', () => {
  it('REQ-01  primary_sector IS NOT NULL AND included_hoai_phases IS NOT EMPTY', async () => {
    await proveBothWays('820-2-01', 'REQ-01',
      // wasserbau is a valid §1 in-scope prod enum value; phases carrier non-empty
      [{ ws: '820-2-01', values: { primary_sector: 'wasserbau', included_hoai_phases: ['LPH0', 'LPH1'] } }],
      // empty the HOAI-phases carrier → IS NOT EMPTY false → blocks
      [{ ws: '820-2-01', values: { included_hoai_phases: [] } }]);
  });
});

describe('DWA-M-820-2 — 820-2-04 Regulatorischer Rahmen und Normen (§6.3.2)', () => {
  it('REQ-53  regulations_current_check == true', async () => {
    await proveBooleanGate('820-2-04', 'REQ-53', 'regulations_current_check');
  });
});

describe('DWA-M-820-2 — 820-2-05 Projektorganisation und Handbuch (§4.3.2 / §4.3.3 / §4.3.5)', () => {
  it('REQ-04  bauherr_tasks_defined == true', async () => {
    await proveBooleanGate('820-2-05', 'REQ-04', 'bauherr_tasks_defined');
  });
  it('REQ-05  decision_competencies_mapped == true', async () => {
    await proveBooleanGate('820-2-05', 'REQ-05', 'decision_competencies_mapped');
  });
  it('REQ-07  project_handbook_complete == true', async () => {
    await proveBooleanGate('820-2-05', 'REQ-07', 'project_handbook_complete');
  });
});

describe('DWA-M-820-2 — 820-2-06 Statusberichte und Änderungsmanagement (§4.3.7)', () => {
  it('REQ-09  change_log_present AND change_impact_documented (two-conjunct)', async () => {
    await proveBothWays('820-2-06', 'REQ-09',
      [{ ws: '820-2-06', values: { change_log_present: true, change_impact_documented: true } }],
      // first conjunct false → AND false → blocks
      [{ ws: '820-2-06', values: { change_log_present: false } }]);
  });
  it('REQ-09  ALSO blocks when only the second conjunct is false', async () => {
    await applySaves([{ ws: '820-2-06', values: { change_log_present: true, change_impact_documented: true } }]);
    expect(await gateBlocks('820-2-06', 'REQ-09')).toBe(false);
    await saveSymbols('820-2-06', { change_impact_documented: false });
    expect(await gateBlocks('820-2-06', 'REQ-09')).toBe(true);
  });
});

describe('DWA-M-820-2 — 820-2-07 Terminmanagement (§4.4.2 / §4.4.3)', () => {
  it('REQ-10  master_schedule_present AND detailed_schedule_present (two-conjunct)', async () => {
    await proveBothWays('820-2-07', 'REQ-10',
      [{ ws: '820-2-07', values: { master_schedule_present: true, detailed_schedule_present: true } }],
      [{ ws: '820-2-07', values: { detailed_schedule_present: false } }]);
  });
  it('REQ-11  contractor_schedule_resources == true', async () => {
    await proveBooleanGate('820-2-07', 'REQ-11', 'contractor_schedule_resources');
  });
});

describe('DWA-M-820-2 — 820-2-08 Kostenmanagement (§4.5.2 / §4.5.4)', () => {
  it('REQ-12  cost_planning_din276 == true', async () => {
    await proveBooleanGate('820-2-08', 'REQ-12', 'cost_planning_din276');
  });
  it('REQ-14  cost_control_documented == true', async () => {
    await proveBooleanGate('820-2-08', 'REQ-14', 'cost_control_documented');
  });
});

describe('DWA-M-820-2 — 820-2-09 Vertrags- und Qualitätsmanagement (§4.6.1 / §4.6.2 / §4.7.1 / §4.7.2)', () => {
  it('REQ-16  contract_amendments_tracked == true', async () => {
    await proveBooleanGate('820-2-09', 'REQ-16', 'contract_amendments_tracked');
  });
  it('REQ-17  approval_procedure_defined == true', async () => {
    await proveBooleanGate('820-2-09', 'REQ-17', 'approval_procedure_defined');
  });
  it('REQ-18  quality_monitoring_active == true', async () => {
    await proveBooleanGate('820-2-09', 'REQ-18', 'quality_monitoring_active');
  });
  it('REQ-19  qs_plan_lph8_present == true', async () => {
    await proveBooleanGate('820-2-09', 'REQ-19', 'qs_plan_lph8_present');
  });
});

describe('DWA-M-820-2 — 820-2-10 Risikomanagement (§3 / §4.8.2)', () => {
  it('REQ-03  risk_distribution_fair == true', async () => {
    await proveBooleanGate('820-2-10', 'REQ-03', 'risk_distribution_fair');
  });
  it('REQ-20  risk_register_present == true', async () => {
    await proveBooleanGate('820-2-10', 'REQ-20', 'risk_register_present');
  });
});

describe('DWA-M-820-2 — 820-2-11 Bedarfsplanung LPH 0 (§5.2.2 / §5.2.3)', () => {
  it('REQ-21  framework_conditions_clarified == true', async () => {
    await proveBooleanGate('820-2-11', 'REQ-21', 'framework_conditions_clarified');
  });
  it('REQ-22  forward_planning_done == true', async () => {
    await proveBooleanGate('820-2-11', 'REQ-22', 'forward_planning_done');
  });
});

describe('DWA-M-820-2 — 820-2-12 Planungsorganisation und Entscheidungen (§5.3.1 / §5.3.2 / §5.3.4)', () => {
  it('REQ-24  meeting_protocols_active == true', async () => {
    await proveBooleanGate('820-2-12', 'REQ-24', 'meeting_protocols_active');
  });
  it('REQ-25  decisions_documented == true', async () => {
    await proveBooleanGate('820-2-12', 'REQ-25', 'decisions_documented');
  });
  it('REQ-27  planning_duration_realistic == true', async () => {
    await proveBooleanGate('820-2-12', 'REQ-27', 'planning_duration_realistic');
  });
});

describe('DWA-M-820-2 — 820-2-13 Drittbeteiligung und Koordination (§5.3.5 / §5.3.6 / §5.3.8)', () => {
  it('REQ-28  third_parties_engaged_early == true', async () => {
    await proveBooleanGate('820-2-13', 'REQ-28', 'third_parties_engaged_early');
  });
  it('REQ-29  decision_competencies_clear == true', async () => {
    await proveBooleanGate('820-2-13', 'REQ-29', 'decision_competencies_clear');
  });
  it('REQ-31  lot_strategy_documented == true', async () => {
    await proveBooleanGate('820-2-13', 'REQ-31', 'lot_strategy_documented');
  });
});

describe('DWA-M-820-2 — 820-2-14 Planungsrisiken und Öffentlichkeitsarbeit (§5.3.7/5.3.11 / §5.3.10)', () => {
  it('REQ-30  risk_analysis_performed == true', async () => {
    await proveBooleanGate('820-2-14', 'REQ-30', 'risk_analysis_performed');
  });
  it('REQ-33  public_relations_strategy == true', async () => {
    await proveBooleanGate('820-2-14', 'REQ-33', 'public_relations_strategy');
  });
});

describe('DWA-M-820-2 — 820-2-16 Genehmigungen und Erlaubnisse (§5.4.2 / §5.4.4 / §5.4.5)', () => {
  it('REQ-34  genehmigungsfaehigkeit == true', async () => {
    await proveBooleanGate('820-2-16', 'REQ-34', 'genehmigungsfaehigkeit');
  });
  it('REQ-36  property_rights_secured == true', async () => {
    await proveBooleanGate('820-2-16', 'REQ-36', 'property_rights_secured');
  });
  it('REQ-37  permit_conditions_tracked == true', async () => {
    await proveBooleanGate('820-2-16', 'REQ-37', 'permit_conditions_tracked');
  });
});

describe('DWA-M-820-2 — 820-2-17 Nebenangebote und Eignungen (§5.5.1 / §5.5.2)', () => {
  it('REQ-38  nebenangebote_conditions == true', async () => {
    await proveBooleanGate('820-2-17', 'REQ-38', 'nebenangebote_conditions');
  });
  it('REQ-39  eignungskriterien_set == true', async () => {
    await proveBooleanGate('820-2-17', 'REQ-39', 'eignungskriterien_set');
  });
});

describe('DWA-M-820-2 — 820-2-18 Leistungsbeschreibung und Terminpläne (§5.5.4)', () => {
  it('REQ-41  rahmenterminplan_attached == true', async () => {
    await proveBooleanGate('820-2-18', 'REQ-41', 'rahmenterminplan_attached');
  });
});

describe('DWA-M-820-2 — 820-2-20 Baucontrolling und Qualität (§5.6.2 / §5.6.3)', () => {
  it('REQ-43  quality_supervision_active == true', async () => {
    await proveBooleanGate('820-2-20', 'REQ-43', 'quality_supervision_active');
  });
  it('REQ-44  bauueberwachung_competencies == true', async () => {
    await proveBooleanGate('820-2-20', 'REQ-44', 'bauueberwachung_competencies');
  });
});

describe('DWA-M-820-2 — 820-2-22 Testbetrieb und Abnahme (§5.7.2/Bild 3 / §5.7.3/Bild 4)', () => {
  it('REQ-46  testbetrieb_planned == true', async () => {
    await proveBooleanGate('820-2-22', 'REQ-46', 'testbetrieb_planned');
  });
  it('REQ-47  abnahme_per_bild4 == true', async () => {
    await proveBooleanGate('820-2-22', 'REQ-47', 'abnahme_per_bild4');
  });
});

describe('DWA-M-820-2 — 820-2-23 Dokumentation und Einweisung (§5.7.4 / §5.7.5)', () => {
  it('REQ-48  operating_manuals_complete == true', async () => {
    await proveBooleanGate('820-2-23', 'REQ-48', 'operating_manuals_complete');
  });
  it('REQ-49  training_complete == true', async () => {
    await proveBooleanGate('820-2-23', 'REQ-49', 'training_complete');
  });
});

describe('DWA-M-820-2 — 820-2-24 Gewährleistungsmanagement (§5.8.2 / §5.8.3)', () => {
  it('REQ-52  defect_tracking_active == true', async () => {
    await proveBooleanGate('820-2-24', 'REQ-52', 'defect_tracking_active');
  });

  it('REQ-51 DEFECT/REVERSAL  `!= null` is non-enforcing — violating state does NOT block', async () => {
    // Passing state: both warranty dates set → compare(!=null) pass both → not blocked.
    await applySaves([{ ws: '820-2-24', values: { warranty_start_date: '2026-01-01', warranty_end_date: '2031-01-01' } }]);
    expect(await gateBlocks('820-2-24', 'REQ-51'), 'REQ-51 should not block when both dates set').toBe(false);

    // "Violating" state: clear warranty_end_date. A correct presence gate MUST block
    // here. But `warranty_end_date != null` with the date unset resolves to `pending`,
    // and pending never enters failingBlockConditions → the gate does NOT block.
    // This asserts the CURRENT (broken, non-enforcing) behaviour — a REVERSAL of what
    // a severity='block' gate is supposed to do. Draft fix: use `IS NOT NULL`.
    await saveSymbols('820-2-24', { warranty_end_date: null });
    expect(
      await gateBlocks('820-2-24', 'REQ-51'),
      'REQ-51 currently does NOT block even with a warranty date missing (non-enforcing block gate)',
    ).toBe(false);

    // restore for cleanliness
    await saveSymbols('820-2-24', { warranty_end_date: '2031-01-01' });
  });
});

describe('DWA-M-820-2 — 820-2-25 Richtlinienverwaltung (§6.3.3)', () => {
  it('REQ-54  approval_release_process == true', async () => {
    await proveBooleanGate('820-2-25', 'REQ-54', 'approval_release_process');
  });
});

describe('DWA-M-820-2 — 820-2-26 Innovationsmanagement (§7.6)', () => {
  it('REQ-56  ip_rights_defined == true', async () => {
    await proveBooleanGate('820-2-26', 'REQ-56', 'ip_rights_defined');
  });
});

describe('DWA-M-820-2 — 820-2-27 Digitale Planung und BIM (§8.2.2)', () => {
  it('REQ-58  data_quality_checked == true', async () => {
    await proveBooleanGate('820-2-27', 'REQ-58', 'data_quality_checked');
  });
});
