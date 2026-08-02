/**
 * ISO 14046:2014 ("Umweltmanagement — Wasser-Fußabdruck", water-footprint principles,
 * requirements & guidelines) — REAL save-path execution proof.
 *
 * SOURCE PRESENT: this wave is a FULL document comparison (see seed-iso14046.ts header).
 * The standard's normative structure maps to the 7 worksheets (registration/general
 * §1/§4/§5.1/Annex A, goal & scope §5.2, inventory §5.3, impact assessment §5.4,
 * interpretation §5.5/§5.6, reporting §6, critical review §7). The single equation EQ-01
 * (§5.4.4.1 characterization) is a prose-derived, non-machine-evaluable representation —
 * verified FAITHFUL against the printed defined terms (§3.3.14 factor de caracterización),
 * not driven here. This harness is the EXECUTION half: it PROVES the standard's 21 live
 * BLOCK gates (severity='block' + non-empty condition) by driving each through the REAL
 * enforcement chain against a disposable embedded Postgres:
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
 * COVERED GATE SHAPES (21 gates, all severity='block'):
 *   - membership IN {lowercase enum} (REQ-01)                : `x IN {a,b}`
 *   - existence IS NOT EMPTY (REQ-03/04/05/07/10/12/13/16)   : text presence — the 8 gates
 *       just repaired corpus-wide from `!= ''`; each proven to reach a definite fail
 *   - existence IS NOT NULL (REQ-06/11/15/19/22)             : boolean/enum presence
 *   - boolean equality `== true` (REQ-02/08/09/10/14/17)     : documented/checked flags
 *   - equality vs enum literal `report_type == internal` (REQ-18)
 *   - OR gates (REQ-13/18/20)                                : both-branches-false ⇒ fail
 *
 * CROSS-WORKSHEET FALLBACK proven: REQ-11 reads allocation_procedure (home -02); REQ-15/19/20
 * read comparative_assertion_public (home -02); REQ-18 reads report_type (home -02); REQ-19
 * reads critical_review_performed (home -07); REQ-22 reads is_organization_assessment +
 * consolidation_method (home -01) — all from their own gate-home worksheets via the
 * conflict-free project-wide fallback. Each violating state flips a LOCAL field where one
 * exists so shared operands are never disturbed between serial tests; REQ-19 (no local
 * operand) is violated by clearing a cross-ws field, re-established by the next test.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4
 * known engine traps present; ZERO `!= ''` gates remain; REQ-21 is a literal-TRUE warn
 * no-op (not a block gate, filtered out by the approval-gate severity='block' query).
 * REQ-11/15/19 are presence-only degenerate gates (title states a stronger rule than the
 * condition enforces) — they DO reach a definite fail (proven both ways) but the semantic
 * gap is a sign-off-sheet item, not a source-settled fix. See seed header.
 */
// @vitest-environment node
import './_harness-env-iso14046'; // top-level-await: PG + seedISO14046 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO14046Harness } from './_harness-env-iso14046';
import { ISO14046_GATES } from './seed-iso14046';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO14046Harness();

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

describe('ISO-14046 — seed sanity (topology matches the 21 prod block gates)', () => {
  it('seeds all 7 worksheet instances and 21 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'ISO-14046-01', 'ISO-14046-02', 'ISO-14046-03', 'ISO-14046-04',
      'ISO-14046-05', 'ISO-14046-06', 'ISO-14046-07',
    ]);
    expect(ISO14046_GATES.length).toBe(21);
    expect(ISO14046_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('ISO-14046-01 — Registrierung & Allgemeine Anforderungen (§1;§4;§5.1;Annex A)', () => {
  it('REQ-01  study_type IN {water_footprint_assessment,water_footprint_inventory_study} (membership)', async () => {
    await proveBothWays('ISO-14046-01', 'REQ-01',
      [{ ws: 'ISO-14046-01', values: { study_type: 'water_footprint_assessment' } }],
      [{ ws: 'ISO-14046-01', values: { study_type: 'not_a_study_type' } }]); // outside set → fail
  });
  it('REQ-02  principles_applied == true AND life_cycle_perspective == true', async () => {
    await proveBothWays('ISO-14046-01', 'REQ-02',
      [{ ws: 'ISO-14046-01', values: { principles_applied: true, life_cycle_perspective: true } }],
      [{ ws: 'ISO-14046-01', values: { principles_applied: false } }]);
  });
  it('REQ-13  comprehensive_assessment == true OR water_footprint_qualifier IS NOT EMPTY (OR gate)', async () => {
    await proveBothWays('ISO-14046-01', 'REQ-13',
      // pass via the first branch; qualifier stays empty
      [{ ws: 'ISO-14046-01', values: { comprehensive_assessment: true, water_footprint_qualifier: null } }],
      // violate: both branches false — not comprehensive AND no qualifier
      [{ ws: 'ISO-14046-01', values: { comprehensive_assessment: false, water_footprint_qualifier: null } }]);
  });
});

describe('ISO-14046-02 — Ziel & Untersuchungsrahmen (§5.2)', () => {
  it('REQ-03  intended_applications/study_reasons/target_audience IS NOT EMPTY (repaired != \'\')', async () => {
    await proveBothWays('ISO-14046-02', 'REQ-03',
      [{ ws: 'ISO-14046-02', values: {
        intended_applications: 'Vergleich Bewässerungsvarianten',
        study_reasons: 'Interne Optimierung Wasserverbrauch',
        target_audience: 'Produktion & Nachhaltigkeit',
      } }],
      [{ ws: 'ISO-14046-02', values: { intended_applications: null } }]); // clear one → AND fails
  });
  it('REQ-04  functional_unit/system_boundary/geographic_coverage/temporal_coverage/cutoff_criteria IS NOT EMPTY (repaired != \'\')', async () => {
    await proveBothWays('ISO-14046-02', 'REQ-04',
      [{ ws: 'ISO-14046-02', values: {
        functional_unit: '1 t Tomaten',
        system_boundary: 'cradle-to-gate',
        geographic_coverage: 'Región de O\'Higgins, Chile',
        temporal_coverage: '2024',
        cutoff_criteria: 'Masse 1 %',
      } }],
      [{ ws: 'ISO-14046-02', values: { system_boundary: null } }]);
  });
  it('REQ-05  water_quantities/water_resource_types/water_quality_data/forms_of_water_use/water_use_locations IS NOT EMPTY (repaired != \'\')', async () => {
    await proveBothWays('ISO-14046-02', 'REQ-05',
      [{ ws: 'ISO-14046-02', values: {
        water_quantities: '1 200 m³/a',
        water_resource_types: 'Grundwasser; Oberflächenwasser',
        water_quality_data: 'CSB, Nitrat',
        forms_of_water_use: 'Verdunstung; Produktintegration',
        water_use_locations: 'Rapel-Einzugsgebiet',
      } }],
      [{ ws: 'ISO-14046-02', values: { water_quantities: null } }]);
  });
  it('REQ-06  data_quality_requirements IS NOT NULL AND primary_data_preference IS NOT NULL', async () => {
    await proveBothWays('ISO-14046-02', 'REQ-06',
      [{ ws: 'ISO-14046-02', values: { data_quality_requirements: true, primary_data_preference: true } }],
      [{ ws: 'ISO-14046-02', values: { data_quality_requirements: null } }]); // clear one → AND fails
  });
  it('REQ-07  missing_data_treatment IS NOT EMPTY (repaired != \'\')', async () => {
    await proveBothWays('ISO-14046-02', 'REQ-07',
      [{ ws: 'ISO-14046-02', values: { missing_data_treatment: 'Proxy-Daten aus Ecoinvent' } }],
      [{ ws: 'ISO-14046-02', values: { missing_data_treatment: null } }]);
  });
  it('REQ-08  no_offsetting == true', async () => {
    await proveBothWays('ISO-14046-02', 'REQ-08',
      [{ ws: 'ISO-14046-02', values: { no_offsetting: true } }],
      [{ ws: 'ISO-14046-02', values: { no_offsetting: false } }]);
  });
  it('REQ-22  is_organization_assessment + consolidation_method (-01, cross-ws) AND organization_boundary IS NOT NULL', async () => {
    await proveBothWays('ISO-14046-02', 'REQ-22',
      [{ ws: 'ISO-14046-01', values: { is_organization_assessment: true, consolidation_method: 'control' } }, // cross-ws home
       { ws: 'ISO-14046-02', values: { organization_boundary: 'Konzerngrenze (operative Kontrolle)' } }],
      [{ ws: 'ISO-14046-02', values: { organization_boundary: null } }]); // local violate
  });
});

describe('ISO-14046-03 — Wasser-Fußabdruck-Inventar (§5.3)', () => {
  it('REQ-09  calculation_procedures_documented == true AND data_validation_done == true', async () => {
    await proveBothWays('ISO-14046-03', 'REQ-09',
      [{ ws: 'ISO-14046-03', values: { calculation_procedures_documented: true, data_validation_done: true } }],
      [{ ws: 'ISO-14046-03', values: { calculation_procedures_documented: false } }]);
  });
  it('REQ-10  flow_* IS NOT EMPTY (repaired != \'\') AND inventory_balance_explained == true', async () => {
    await proveBothWays('ISO-14046-03', 'REQ-10',
      [{ ws: 'ISO-14046-03', values: {
        flow_water_resource_type: 'groundwater',
        flow_quality_parameters: 'CSB 30 mg/L',
        flow_form_of_use: 'evaporation',
        flow_geographic_location: 'Rapel',
        inventory_balance_explained: true,
      } }],
      [{ ws: 'ISO-14046-03', values: { inventory_balance_explained: false } }]);
  });
  it('REQ-11  allocation_procedure (-02, cross-ws) AND allocation_balance_preserved AND allocation_sensitivity_done IS NOT NULL', async () => {
    await proveBothWays('ISO-14046-03', 'REQ-11',
      [{ ws: 'ISO-14046-02', values: { allocation_procedure: 'physical_relationship' } }, // cross-ws home
       { ws: 'ISO-14046-03', values: { allocation_balance_preserved: true, allocation_sensitivity_done: true } }],
      [{ ws: 'ISO-14046-03', values: { allocation_balance_preserved: null } }]); // local violate
  });
});

describe('ISO-14046-04 — Wirkungsabschätzung (§5.4)', () => {
  it('REQ-12  impact_categories/category_indicators/characterization_model IS NOT EMPTY (repaired != \'\')', async () => {
    await proveBothWays('ISO-14046-04', 'REQ-12',
      [{ ws: 'ISO-14046-04', values: {
        impact_categories: 'Wasserknappheit; Eutrophierung',
        category_indicators: 'AWARE; SO4-Äq.',
        characterization_model: 'AWARE 1.2; ReCiPe',
      } }],
      [{ ws: 'ISO-14046-04', values: { impact_categories: null } }]);
  });
  it('REQ-14  geo_temporal_considered == true', async () => {
    await proveBothWays('ISO-14046-04', 'REQ-14',
      [{ ws: 'ISO-14046-04', values: { geo_temporal_considered: true } }],
      [{ ws: 'ISO-14046-04', values: { geo_temporal_considered: false } }]);
  });
  it('REQ-15  weighting_applied IS NOT NULL AND comparative_assertion_public (-02, cross-ws) IS NOT NULL', async () => {
    await proveBothWays('ISO-14046-04', 'REQ-15',
      [{ ws: 'ISO-14046-02', values: { comparative_assertion_public: false } }, // cross-ws home
       { ws: 'ISO-14046-04', values: { weighting_applied: false } }],
      [{ ws: 'ISO-14046-04', values: { weighting_applied: null } }]); // local violate
  });
});

describe('ISO-14046-05 — Auswertung (§5.5/§5.6)', () => {
  it('REQ-16  significant_issues/conclusions/limitations IS NOT EMPTY (repaired != \'\') AND completeness/sensitivity/consistency_check == true', async () => {
    await proveBothWays('ISO-14046-05', 'REQ-16',
      [{ ws: 'ISO-14046-05', values: {
        significant_issues: 'Wasserknappheit dominiert',
        completeness_check: true,
        sensitivity_check: true,
        consistency_check: true,
        conclusions: 'Variante A geringerer Fußabdruck',
        limitations: 'Datenlücken Nutzungsphase',
      } }],
      [{ ws: 'ISO-14046-05', values: { sensitivity_check: false } }]);
  });
});

describe('ISO-14046-06 — Berichterstattung (§6)', () => {
  it('REQ-17  report_prepared == true AND water_types_impacts_explicit == true', async () => {
    await proveBothWays('ISO-14046-06', 'REQ-17',
      [{ ws: 'ISO-14046-06', values: { report_prepared: true, water_types_impacts_explicit: true } }],
      [{ ws: 'ISO-14046-06', values: { report_prepared: false } }]);
  });
  it('REQ-18  report_type == internal (-02, cross-ws enum literal) OR third_party_report == true (OR gate)', async () => {
    await proveBothWays('ISO-14046-06', 'REQ-18',
      // pass via the second branch; report_type left unset (missing on that branch)
      [{ ws: 'ISO-14046-06', values: { third_party_report: true } }],
      // violate: report_type set to a NON-internal enum value AND third_party_report false → both branches false
      [{ ws: 'ISO-14046-02', values: { report_type: 'third_party' } }, // cross-ws home
       { ws: 'ISO-14046-06', values: { third_party_report: false } }]);
  });
  it('REQ-19  comparative_assertion_public (-02) AND critical_review_performed (-07) IS NOT NULL (both cross-ws)', async () => {
    await proveBothWays('ISO-14046-06', 'REQ-19',
      [{ ws: 'ISO-14046-02', values: { comparative_assertion_public: false } }, // cross-ws home
       { ws: 'ISO-14046-07', values: { critical_review_performed: true } }],    // cross-ws home
      // no local operand exists → violate by clearing a cross-ws field (REQ-20 re-establishes it)
      [{ ws: 'ISO-14046-07', values: { critical_review_performed: null } }]);
  });
});

describe('ISO-14046-07 — Kritische Prüfung (§7)', () => {
  it('REQ-20  comparative_assertion_public == false (-02, cross-ws) OR critical_review_performed == true (OR gate)', async () => {
    await proveBothWays('ISO-14046-07', 'REQ-20',
      // pass via the second branch (local field)
      [{ ws: 'ISO-14046-07', values: { critical_review_performed: true } }],
      // violate: comparative assertion IS public (== false is false) AND no critical review → both branches false
      [{ ws: 'ISO-14046-02', values: { comparative_assertion_public: true } }, // cross-ws home
       { ws: 'ISO-14046-07', values: { critical_review_performed: false } }]);
  });
});
