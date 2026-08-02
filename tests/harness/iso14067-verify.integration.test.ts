/**
 * ISO 14067:2018 / EN ISO 14067:2019 ("Huella de carbono de productos" — CFP quantification &
 * guidelines) — REAL save-path execution proof.
 *
 * SOURCE PRESENT: this wave is a FULL document comparison (see seed-iso14067.ts header). The
 * standard's normative structure maps to the 7 worksheets (registration/principles/goal&scope
 * §1/§3/§4/§5/§6.1-6.3.2/Anexo A, functional/declared unit & system boundary §6.3.3/§6.3.4, data
 * quality/time/use/EoL §6.3.5-§6.3.8, inventory AICv §6.4/Anexo D, impact EICv & CO2e §6.5,
 * interpretation §6.6, report & critical review §7/§8/Anexo B/Anexo C). The 7 equations (EQ-01 on
 * -05, EQ-02..07 Annex D on -04) are verified FAITHFUL symbol-by-symbol against the printed formulas
 * (§6.5.1 prose; Anexo D D.1-D.6) and NOT driven here (EQ-01 is a non-machine-evaluable SUM();
 * EQ-02..07 are informative recycling-allocation alternatives). This harness is the EXECUTION half:
 * it PROVES the standard's 27 live BLOCK gates (severity='block' + non-empty condition) by driving
 * each through the REAL enforcement chain against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block condition
 *                                      against the SAVED values and lists the ones that
 *                                      definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the
 * `engineer_approve` transition (src/lib/actions/approval-gate.ts). A gate is proven ENFORCING only
 * when shown BOTH ways: a persisted state where it does NOT block, and a persisted state where it
 * DOES (the F-4 lesson). Nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (27 gates, all severity='block'):
 *   - boolean equality `== true` (CR-01/25/30/05/29/08/12/13/22/23/24)  : documented/adopted flags
 *   - existence IS NOT NULL (CR-03/04/06/09/15/21/26/27/28)             : text/number/enum/boolean
 *       presence, incl. AND-chains (CR-03 3-way, CR-15 2-way) — one operand cleared ⇒ AND fails
 *   - existence IS NOT EMPTY (CR-20)                                    : the REPAIRED gate (was
 *       `cfp_result != ''`); proven both ways — cleared cfp_result now definitely fails
 *   - membership IN {lowercase enum} (CR-07 3-value, CR-17 4-value)     : match prod enum_values exactly
 *   - TRUE NO-OP `boolean IN {true,false}` (CR-02/10/11/14)             : can NEVER fail; proven
 *       non-blocking in true / false / cleared states via proveNeverBlocks (reported finding, not fixed)
 *
 * NO CROSS-WORKSHEET reads: every gate resolves entirely from its own home worksheet (verified
 * against prod). The project-wide fallback is never consulted for these gates; no symbol collides
 * across the 7 worksheets, so serial tests are independent.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values this session): NONE of the 4
 * known engine traps present; ZERO `!= ''` gates (CR-20 repaired to IS NOT EMPTY); NO OR gate; NO
 * IF/THEN guard; NO ordering-op gate at all. CR-16 + CR-18 + CR-19 are severity='warn' (filtered out
 * by the approval-gate severity='block' query) and not seeded. The four `IN {true,false}` gates are
 * the FIFTH-shape TRUE NO-OPs — a distinct degenerate shape on the sign-off sheet, proven no-op here.
 */
// @vitest-environment node
import './_harness-env-iso14067'; // top-level-await: PG + seedISO14067 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO14067Harness } from './_harness-env-iso14067';
import { ISO14067_GATES, ISO14067_NOOP_GATES } from './seed-iso14067';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO14067Harness();

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

/** Persist a symbol→value map to worksheet `ws` (the symbol's HOME worksheet) through the REAL
 *  saveWorksheet. A null value clears the field. */
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

/** Whether `code` is in the block-gate failing list for worksheet `gateWs` given the CURRENT
 *  persisted project state (the real approval-gate read path). */
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

/** Prove a gate is a TRUE NO-OP: it NEVER blocks, in ANY reachable state. For a `boolean IN
 *  {true,false}` gate the value is always a member (true/false ⇒ pass) and unset ⇒ pending — none
 *  of which produce `fail`. Assert non-blocking with the field true, false, and cleared. */
async function proveNeverBlocks(gateWs: string, code: string, symbol: string): Promise<void> {
  await saveSymbols(gateWs, { [symbol]: true });
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} NO-OP must not block when true`).toBe(false);
  await saveSymbols(gateWs, { [symbol]: false });
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} NO-OP must not block when false`).toBe(false);
  await saveSymbols(gateWs, { [symbol]: null });
  expect(await gateBlocks(gateWs, code), `${code}@${gateWs} NO-OP must not block when cleared`).toBe(false);
}

describe('ISO-14067 — seed sanity (topology matches the 27 prod block gates)', () => {
  it('seeds all 7 worksheet instances and 27 block gates (23 enforcing + 4 no-op)', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'ISO-14067-01', 'ISO-14067-02', 'ISO-14067-03', 'ISO-14067-04',
      'ISO-14067-05', 'ISO-14067-06', 'ISO-14067-07',
    ]);
    expect(ISO14067_GATES.length).toBe(27);
    expect(ISO14067_GATES.every((g) => g.sev === 'block')).toBe(true);
    expect(ISO14067_NOOP_GATES.length).toBe(4);
  });
});

describe('ISO-14067-01 — Registrierung, Prinzipien & Studienziel (§1;§3;§4;§5;§6.1-6.3.2;Anexo A)', () => {
  it('CR-01  four_lca_phases_included == true (§6.1 vier ACV-Phasen)', async () => {
    await proveBothWays('ISO-14067-01', 'ISO-14067-CR-01',
      [{ ws: 'ISO-14067-01', values: { four_lca_phases_included: true } }],
      [{ ws: 'ISO-14067-01', values: { four_lca_phases_included: false } }]);
  });
  it('CR-02  rcp_pcr_used IN {true,false} — TRUE NO-OP (§6.2, can never block)', async () => {
    await proveNeverBlocks('ISO-14067-01', 'ISO-14067-CR-02', 'rcp_pcr_used');
  });
  it('CR-03  intended_application AND study_reasons AND intended_audience IS NOT NULL (§6.3.1)', async () => {
    await proveBothWays('ISO-14067-01', 'ISO-14067-CR-03',
      [{ ws: 'ISO-14067-01', values: { intended_application: 'EPD B2B', study_reasons: 'Kundenanfrage', intended_audience: 'Einkauf' } }],
      [{ ws: 'ISO-14067-01', values: { intended_application: null } }]); // clear one → AND fails
  });
  it('CR-25  cfp_limitations_documented == true (Anexo A, Limitaciones)', async () => {
    await proveBothWays('ISO-14067-01', 'ISO-14067-CR-25',
      [{ ws: 'ISO-14067-01', values: { cfp_limitations_documented: true } }],
      [{ ws: 'ISO-14067-01', values: { cfp_limitations_documented: false } }]);
  });
  it('CR-30  avoid_double_counting == true (§5.12)', async () => {
    await proveBothWays('ISO-14067-01', 'ISO-14067-CR-30',
      [{ ws: 'ISO-14067-01', values: { avoid_double_counting: true } }],
      [{ ws: 'ISO-14067-01', values: { avoid_double_counting: false } }]);
  });
});

describe('ISO-14067-02 — Funktionelle/deklarierte Einheit & Systemgrenze (§6.3.3;§6.3.4)', () => {
  it('CR-04  reference_flow IS NOT NULL (§6.3.3)', async () => {
    await proveBothWays('ISO-14067-02', 'ISO-14067-CR-04',
      [{ ws: 'ISO-14067-02', values: { reference_flow: '1 kg Produkt, Werksausgang' } }],
      [{ ws: 'ISO-14067-02', values: { reference_flow: null } }]);
  });
  it('CR-05  system_boundary_defined == true (§6.3.4)', async () => {
    await proveBothWays('ISO-14067-02', 'ISO-14067-CR-05',
      [{ ws: 'ISO-14067-02', values: { system_boundary_defined: true } }],
      [{ ws: 'ISO-14067-02', values: { system_boundary_defined: false } }]);
  });
  it('CR-06  cutoff_criteria IS NOT NULL (§6.3.4)', async () => {
    await proveBothWays('ISO-14067-02', 'ISO-14067-CR-06',
      [{ ws: 'ISO-14067-02', values: { cutoff_criteria: 'Massen-/Energieschwelle 1 %' } }],
      [{ ws: 'ISO-14067-02', values: { cutoff_criteria: null } }]);
  });
  it('CR-29  no_carbon_offsetting == true (§6.3.4.1 keine Kompensation in der HCP)', async () => {
    await proveBothWays('ISO-14067-02', 'ISO-14067-CR-29',
      [{ ws: 'ISO-14067-02', values: { no_carbon_offsetting: true } }],
      [{ ws: 'ISO-14067-02', values: { no_carbon_offsetting: false } }]);
  });
});

describe('ISO-14067-03 — Datenqualitaet, Zeitgrenze, Nutzungs- & End-of-Life-Phase (§6.3.5-§6.3.8)', () => {
  it('CR-07  data_type_hierarchy IN {site_specific,primary,secondary} (§6.3.5, membership)', async () => {
    await proveBothWays('ISO-14067-03', 'ISO-14067-CR-07',
      [{ ws: 'ISO-14067-03', values: { data_type_hierarchy: 'primary' } }],
      [{ ws: 'ISO-14067-03', values: { data_type_hierarchy: 'kein_gueltiger_typ' } }]); // outside set → fail
  });
  it('CR-08  data_quality_characterized == true (§6.3.5, zweistufig)', async () => {
    await proveBothWays('ISO-14067-03', 'ISO-14067-CR-08',
      [{ ws: 'ISO-14067-03', values: { data_quality_characterized: true } }],
      [{ ws: 'ISO-14067-03', values: { data_quality_characterized: false } }]);
  });
  it('CR-09  time_boundary_period IS NOT NULL (§6.3.6)', async () => {
    await proveBothWays('ISO-14067-03', 'ISO-14067-CR-09',
      [{ ws: 'ISO-14067-03', values: { time_boundary_period: '2023, 12 Monate' } }],
      [{ ws: 'ISO-14067-03', values: { time_boundary_period: null } }]);
  });
  it('CR-10  use_stage_included IN {true,false} — TRUE NO-OP (§6.3.7, can never block)', async () => {
    await proveNeverBlocks('ISO-14067-03', 'ISO-14067-CR-10', 'use_stage_included');
  });
  it('CR-11  eol_stage_included IN {true,false} — TRUE NO-OP (§6.3.8, can never block)', async () => {
    await proveNeverBlocks('ISO-14067-03', 'ISO-14067-CR-11', 'eol_stage_included');
  });
});

describe('ISO-14067-04 — Sachbilanz AICv (§6.4;Tabla 1;Anexo D)', () => {
  it('CR-12  data_collection_complete == true (§6.4.2)', async () => {
    await proveBothWays('ISO-14067-04', 'ISO-14067-CR-12',
      [{ ws: 'ISO-14067-04', values: { data_collection_complete: true } }],
      [{ ws: 'ISO-14067-04', values: { data_collection_complete: false } }]);
  });
  it('CR-13  allocation_mass_balance == true (§6.4.6)', async () => {
    await proveBothWays('ISO-14067-04', 'ISO-14067-CR-13',
      [{ ws: 'ISO-14067-04', values: { allocation_mass_balance: true } }],
      [{ ws: 'ISO-14067-04', values: { allocation_mass_balance: false } }]);
  });
  it('CR-14  timing_emissions_over_10y IN {true,false} — TRUE NO-OP (§6.4.8, can never block)', async () => {
    await proveNeverBlocks('ISO-14067-04', 'ISO-14067-CR-14', 'timing_emissions_over_10y');
  });
  it('CR-15  fossil_ghg_net IS NOT NULL AND biogenic_ghg IS NOT NULL (§6.4.9)', async () => {
    await proveBothWays('ISO-14067-04', 'ISO-14067-CR-15',
      [{ ws: 'ISO-14067-04', values: { fossil_ghg_net: 12.5, biogenic_ghg: 0 } }], // 0 is a value → passes
      [{ ws: 'ISO-14067-04', values: { biogenic_ghg: null } }]); // clear one → AND fails
  });
  it('CR-17  electricity_treatment IN {internal,direct_supplier,supplier_specific_grid,grid_average} (§6.4.9.4)', async () => {
    await proveBothWays('ISO-14067-04', 'ISO-14067-CR-17',
      [{ ws: 'ISO-14067-04', values: { electricity_treatment: 'grid_average' } }],
      [{ ws: 'ISO-14067-04', values: { electricity_treatment: 'kein_gueltiges_verfahren' } }]); // outside set → fail
  });
});

describe('ISO-14067-05 — Wirkungsabschaetzung EICv & CO2e (§6.5)', () => {
  it('CR-20  cfp_result IS NOT EMPTY — the REPAIRED gate (was != \'\'; §6.5.1)', async () => {
    // A NUMBER field: 0 is a present value (IS NOT EMPTY passes); cleared → undefined → definite fail.
    await proveBothWays('ISO-14067-05', 'ISO-14067-CR-20',
      [{ ws: 'ISO-14067-05', values: { cfp_result: 3.42 } }],
      [{ ws: 'ISO-14067-05', values: { cfp_result: null } }]);
  });
  it('CR-21  biogenic_co2_characterization IS NOT NULL (§6.5.2, -1/+1 kg CO2e/kg)', async () => {
    await proveBothWays('ISO-14067-05', 'ISO-14067-CR-21',
      [{ ws: 'ISO-14067-05', values: { biogenic_co2_characterization: -1 } }],
      [{ ws: 'ISO-14067-05', values: { biogenic_co2_characterization: null } }]);
  });
});

describe('ISO-14067-06 — Interpretation des Lebenswegs (§6.6)', () => {
  it('CR-22  uncertainty_evaluation == true (§6.6 Unsicherheitsbewertung)', async () => {
    await proveBothWays('ISO-14067-06', 'ISO-14067-CR-22',
      [{ ws: 'ISO-14067-06', values: { uncertainty_evaluation: true } }],
      [{ ws: 'ISO-14067-06', values: { uncertainty_evaluation: false } }]);
  });
});

describe('ISO-14067-07 — HCP-Studienbericht & kritische Pruefung (§7;§8;Anexo B;Anexo C)', () => {
  it('CR-23  ghg_values_separate == true (§7.2)', async () => {
    await proveBothWays('ISO-14067-07', 'ISO-14067-CR-23',
      [{ ws: 'ISO-14067-07', values: { ghg_values_separate: true } }],
      [{ ws: 'ISO-14067-07', values: { ghg_values_separate: false } }]);
  });
  it('CR-24  required_report_info_complete == true (§7.3 a-t)', async () => {
    await proveBothWays('ISO-14067-07', 'ISO-14067-CR-24',
      [{ ws: 'ISO-14067-07', values: { required_report_info_complete: true } }],
      [{ ws: 'ISO-14067-07', values: { required_report_info_complete: false } }]);
  });
  it('CR-26  comparison_performed IS NOT NULL (Anexo B; boolean → set passes, cleared fails)', async () => {
    await proveBothWays('ISO-14067-07', 'ISO-14067-CR-26',
      [{ ws: 'ISO-14067-07', values: { comparison_performed: false } }], // false is a value → IS NOT NULL passes
      [{ ws: 'ISO-14067-07', values: { comparison_performed: null } }]);
  });
  it('CR-27  systematic_cfp_approach IS NOT NULL (Anexo C; boolean → set passes, cleared fails)', async () => {
    await proveBothWays('ISO-14067-07', 'ISO-14067-CR-27',
      [{ ws: 'ISO-14067-07', values: { systematic_cfp_approach: true } }],
      [{ ws: 'ISO-14067-07', values: { systematic_cfp_approach: null } }]);
  });
  it('CR-28  critical_review IS NOT NULL (§8, ISO/TS 14071)', async () => {
    await proveBothWays('ISO-14067-07', 'ISO-14067-CR-28',
      [{ ws: 'ISO-14067-07', values: { critical_review: 'external' } }],
      [{ ws: 'ISO-14067-07', values: { critical_review: null } }]);
  });
});
