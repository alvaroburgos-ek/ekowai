/**
 * ISO 14064-2:2019 / EN ISO 14064-2:2019 ("Treibhausgase — Teil 2", project-level GHG reduction/
 * removal-enhancement quantification, monitoring & reporting) — REAL save-path execution proof.
 *
 * SOURCE PRESENT: this wave is a FULL document comparison (see seed-iso14064-2.ts header).
 * The standard's normative structure maps to the 10 worksheets (registration/principles §4/§5.2,
 * project description §5.4/§6.2, project SSR identification §6.3, baseline scenario determination &
 * additionality §6.4/§6.5, baseline SSR identification & monitor-vs-estimate selection §6.6,
 * quantification of emissions/removals §6.7, reductions/enhancements §6.8, data-quality management
 * §6.9, monitoring §6.10, documentation/verification/reporting §7/§8/§9). The 4 equations are
 * prose-derived: EQ-01 (AD×EF×GWP per SSR, §6.7+§3.1.9+§6.8) and EQ-02/03 (SUM per project/baseline
 * SSR, §6.7) are FAITHFUL-to-prose and NOT machine-evaluable (SUM); EQ-04 (reduction =
 * baseline−project, §6.8) IS machine-evaluable and IS gate REQ-16. Leakage ("Verlagerung") is
 * source-handled via affected-SSR inclusion, not a `−leakage` term — so EQ-04/REQ-16 omitting it is
 * FAITHFUL (seed header). This harness is the EXECUTION half: it PROVES the standard's 21 live BLOCK
 * gates (severity='block' + non-empty condition) by driving each through the REAL enforcement chain
 * against a disposable embedded Postgres:
 *
 *   saveWorksheet(instance, values)  → values persist to project_parameters
 *   checkApprovalGate(instance)      → the engineer-approve gate replays every block condition
 *                                      against the SAVED values and lists the ones that
 *                                      definitely `fail`.
 *
 * `checkApprovalGate` is the SAME read path the deployed app uses to refuse the `engineer_approve`
 * transition (src/lib/actions/approval-gate.ts). A gate is proven ENFORCING only when shown BOTH
 * ways: a persisted state where it does NOT block, and a persisted state where it DOES (the F-4
 * lesson). Nothing is applied to prod here.
 *
 * COVERED GATE SHAPES (21 gates, all severity='block'):
 *   - boolean equality `== true` / `== True` (REQ-01/02/04/06/09/10/15/17/19/20): documented/adopted
 *       flags; capital-True (REQ-02/06/20) evaluates identically to lowercase (tokenizer lowercases)
 *   - membership IN {lowercase enum} (REQ-07 3-value ssr_classification, REQ-12 2-value
 *       ssr_selection_mode): match prod enum_values exactly
 *   - arithmetic IDENTITY `emission_reduction = E_baseline - E_project` (REQ-16): `=`→`==` with an
 *       arithmetic RHS routes to the numeric acompare path; genuinely enforcing, cross-worksheet
 *   - existence IS NOT NULL (REQ-03/05/08/11/18/22 incl. 9- and 4- and 3-operand AND-chains — one
 *       operand cleared ⇒ AND fails) and IS NOT EMPTY (REQ-21 — the corpus-repaired row)
 *
 * CROSS-WORKSHEET FALLBACK proven: REQ-16 (home -07) reads E_baseline + E_project (home -06) via the
 * conflict-free project-wide fallback plus its LOCAL emission_reduction; its violating state flips
 * the LOCAL emission_reduction so the shared cross-ws operands are never disturbed between serial
 * tests.
 *
 * GRAMMAR-TRAP AUDIT (verified against evaluate.ts + prod enum values): NONE of the 4 known engine
 * traps present; ZERO `!= ''` gates (REQ-21 is the repaired IS NOT EMPTY); NO OR gate; NO IF/THEN
 * guard; NO ordering-op gate. REQ-13 is severity='warn' with an EMPTY condition (→manual, and
 * filtered by the approval-gate severity='block' query) — not seeded. SEVERITY-vs-OPTIONAL judgment
 * items REQ-02/03/06/20/22 (block on conditional/optional fields) are proven both ways for
 * presence/flag; the severity debate is a sign-off item, not a source-settled fix. DEFINITION-AS-GATE
 * REQ-16 restates EQ-04 — proven both ways (arithmetic identity). See seed header.
 */
// @vitest-environment node
import './_harness-env-iso14064-2'; // top-level-await: PG + seedISO140642 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getISO140642Harness } from './_harness-env-iso14064-2';
import { ISO140642_GATES } from './seed-iso14064-2';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getISO140642Harness();

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

describe('ISO-14064-2 — seed sanity (topology matches the 21 prod block gates)', () => {
  it('seeds all 10 worksheet instances and 21 block gates', () => {
    expect(Object.keys(fixture.instances).sort()).toEqual([
      'ISO-14064-2-01', 'ISO-14064-2-02', 'ISO-14064-2-03', 'ISO-14064-2-04', 'ISO-14064-2-05',
      'ISO-14064-2-06', 'ISO-14064-2-07', 'ISO-14064-2-08', 'ISO-14064-2-09', 'ISO-14064-2-10',
    ]);
    expect(ISO140642_GATES.length).toBe(21);
    expect(ISO140642_GATES.every((g) => g.sev === 'block')).toBe(true);
  });
});

describe('ISO-14064-2-01 — Registrierung & Allgemeine Anforderungen (§4;§5.2)', () => {
  it('REQ-01  recognized_source_used == true (anerkannte Quelle/Kriterien, §5.2)', async () => {
    await proveBothWays('ISO-14064-2-01', 'REQ-01',
      [{ ws: 'ISO-14064-2-01', values: { recognized_source_used: true } }],
      [{ ws: 'ISO-14064-2-01', values: { recognized_source_used: false } }]);
  });
  it('REQ-02  deviations_documented == True (capital-True; conditional/optional — severity-review)', async () => {
    await proveBothWays('ISO-14064-2-01', 'REQ-02',
      [{ ws: 'ISO-14064-2-01', values: { deviations_documented: true } }],
      [{ ws: 'ISO-14064-2-01', values: { deviations_documented: false } }]);
  });
  it('REQ-03  ghg_programme IS NOT NULL (optional field — severity-review)', async () => {
    await proveBothWays('ISO-14064-2-01', 'REQ-03',
      [{ ws: 'ISO-14064-2-01', values: { ghg_programme: 'Verified Carbon Standard (VCS) v4' } }],
      [{ ws: 'ISO-14064-2-01', values: { ghg_programme: null } }]);
  });
  it('REQ-04  principle_conservativeness == true AND principle_accuracy == true (§4)', async () => {
    await proveBothWays('ISO-14064-2-01', 'REQ-04',
      [{ ws: 'ISO-14064-2-01', values: { principle_conservativeness: true, principle_accuracy: true } }],
      [{ ws: 'ISO-14064-2-01', values: { principle_accuracy: false } }]); // clear one → AND fails
  });
});

describe('ISO-14064-2-02 — Projektbeschreibung (§5.4;§6.2)', () => {
  it('REQ-05  9-operand IS NOT NULL AND-chain (GHG project plan complete, §5.4)', async () => {
    await proveBothWays('ISO-14064-2-02', 'REQ-05',
      [{ ws: 'ISO-14064-2-02', values: {
        project_title: 'Biogas-Abfackelung Deponie X',
        project_type: 'Methanvermeidung',
        project_location: 'NRW, DE',
        pre_project_conditions: 'unkontrollierte Deponiegas-Freisetzung',
        project_technologies: 'Gassammelsystem + Fackel',
        expected_reductions_co2e: 12500,
        project_risks: 'Fackel-Ausfall, Gasmengen-Schwankung',
        roles_responsibilities: 'Betreiber, Verifizierer',
        chronological_plan: 'Bau Q1 2024, Betrieb ab Q2 2024',
      } }],
      [{ ws: 'ISO-14064-2-02', values: { chronological_plan: null } }]); // clear one → AND fails
  });
  it('REQ-06  baseline_revalidated == True (capital-True; conditional — severity-review)', async () => {
    await proveBothWays('ISO-14064-2-02', 'REQ-06',
      [{ ws: 'ISO-14064-2-02', values: { baseline_revalidated: true } }],
      [{ ws: 'ISO-14064-2-02', values: { baseline_revalidated: false } }]);
  });
});

describe('ISO-14064-2-03 — Identifizierung projektrelevanter THG-QSS (§6.3)', () => {
  it('REQ-07  ssr_classification IN {controlled,related,affected} (membership, §3.1.11-13)', async () => {
    await proveBothWays('ISO-14064-2-03', 'REQ-07',
      [{ ws: 'ISO-14064-2-03', values: { ssr_classification: 'controlled' } }],
      [{ ws: 'ISO-14064-2-03', values: { ssr_classification: 'unklassifiziert' } }]); // outside set → fail
  });
});

describe('ISO-14064-2-04 — Bestimmung des THG-Bezugsszenarios & Zusätzlichkeit (§6.4;§6.5)', () => {
  it('REQ-08  baseline_criteria + functional_equivalence + baseline_justification IS NOT NULL (§6.4)', async () => {
    await proveBothWays('ISO-14064-2-04', 'REQ-08',
      [{ ws: 'ISO-14064-2-04', values: {
        baseline_criteria: 'gleicher Output, gleiche Region',
        functional_equivalence: true,
        baseline_justification: 'Referenzanlagen-Ansatz',
      } }],
      [{ ws: 'ISO-14064-2-04', values: { baseline_justification: null } }]); // clear one → AND fails
  });
  it('REQ-09  baseline_conservative == true (Reduktionen nicht überschätzt, §6.4)', async () => {
    await proveBothWays('ISO-14064-2-04', 'REQ-09',
      [{ ws: 'ISO-14064-2-04', values: { baseline_conservative: true } }],
      [{ ws: 'ISO-14064-2-04', values: { baseline_conservative: false } }]);
  });
  it('REQ-10  additionality_demonstrated == true (Zusätzlichkeit, §6.5)', async () => {
    await proveBothWays('ISO-14064-2-04', 'REQ-10',
      [{ ws: 'ISO-14064-2-04', values: { additionality_demonstrated: true } }],
      [{ ws: 'ISO-14064-2-04', values: { additionality_demonstrated: false } }]);
  });
});

describe('ISO-14064-2-05 — Identifizierung baseline-relevanter THG-QSS & QSS-Auswahl (§6.6)', () => {
  it('REQ-11  baseline_ssr IS NOT NULL', async () => {
    await proveBothWays('ISO-14064-2-05', 'REQ-11',
      [{ ws: 'ISO-14064-2-05', values: { baseline_ssr: 'Netzstrom, Deponiegas-Baseline' } }],
      [{ ws: 'ISO-14064-2-05', values: { baseline_ssr: null } }]);
  });
  it('REQ-12  ssr_selection_mode IN {regular_monitoring,estimation} (membership, §6.6)', async () => {
    await proveBothWays('ISO-14064-2-05', 'REQ-12',
      [{ ws: 'ISO-14064-2-05', values: { ssr_selection_mode: 'regular_monitoring' } }],
      [{ ws: 'ISO-14064-2-05', values: { ssr_selection_mode: 'weder_noch' } }]); // outside set → fail
  });
});

describe('ISO-14064-2-06 — Quantifizierung THG-Emissionen / Entzug (§6.7)', () => {
  it('REQ-14  emission_factor IS NOT NULL', async () => {
    await proveBothWays('ISO-14064-2-06', 'REQ-14',
      [{ ws: 'ISO-14064-2-06', values: { emission_factor: 0.202 } }],
      [{ ws: 'ISO-14064-2-06', values: { emission_factor: null } }]);
  });
  it('REQ-15  permanence_risk == true (Umkehr-/Dauerhaftigkeitsrisiko bewertet, §6.7)', async () => {
    await proveBothWays('ISO-14064-2-06', 'REQ-15',
      [{ ws: 'ISO-14064-2-06', values: { permanence_risk: true } }],
      [{ ws: 'ISO-14064-2-06', values: { permanence_risk: false } }]);
  });
});

describe('ISO-14064-2-07 — Emissionsreduktionen & Steigerungen des Entzugs (§6.8)', () => {
  // DEFINITION-AS-GATE / cross-worksheet arithmetic identity: `=` tokenises to `==`, the arithmetic
  // RHS routes to the numeric acompare path; E_baseline + E_project resolve from -06 via the
  // conflict-free fallback, emission_reduction is local on -07.
  it('REQ-16  emission_reduction = E_baseline - E_project (arithmetic identity, cross-ws to -06)', async () => {
    await proveBothWays('ISO-14064-2-07', 'REQ-16',
      [{ ws: 'ISO-14064-2-06', values: { E_baseline: 1000, E_project: 600 } }, // cross-ws home (-06)
       { ws: 'ISO-14064-2-07', values: { emission_reduction: 400 } }],         // 1000 - 600 = 400 → pass
      [{ ws: 'ISO-14064-2-07', values: { emission_reduction: 999 } }]);        // 999 != 400 → local violate → fail
  });
});

describe('ISO-14064-2-08 — Datenqualitätsmanagement (§6.9)', () => {
  it('REQ-17  qm_procedures == true (Qualitätsmanagement-Verfahren, §6.9)', async () => {
    await proveBothWays('ISO-14064-2-08', 'REQ-17',
      [{ ws: 'ISO-14064-2-08', values: { qm_procedures: true } }],
      [{ ws: 'ISO-14064-2-08', values: { qm_procedures: false } }]);
  });
});

describe('ISO-14064-2-09 — Überwachung des Klimaschutzprojekts (§6.10)', () => {
  it('REQ-18  4-operand IS NOT NULL AND-chain (Monitoring-Plan erstellt, §6.10)', async () => {
    await proveBothWays('ISO-14064-2-09', 'REQ-18',
      [{ ws: 'ISO-14064-2-09', values: {
        monitoring_purpose: 'Verifizierung der Reduktionen',
        monitored_parameters: 'Gasvolumen, CH4-Anteil, Fackelbetriebsstunden',
        monitoring_methodologies: 'kontinuierliche Durchflussmessung',
        monitoring_frequency: 'kontinuierlich, monatliche Auswertung',
      } }],
      [{ ws: 'ISO-14064-2-09', values: { monitoring_methodologies: null } }]); // clear one → AND fails
  });
});

describe('ISO-14064-2-10 — Dokumentation, Verifizierung/Validierung & Berichterstattung (§7;§8;§9)', () => {
  it('REQ-19  conformity_documentation == true (§7)', async () => {
    await proveBothWays('ISO-14064-2-10', 'REQ-19',
      [{ ws: 'ISO-14064-2-10', values: { conformity_documentation: true } }],
      [{ ws: 'ISO-14064-2-10', values: { conformity_documentation: false } }]);
  });
  it('REQ-20  verification_validation_iso14064_3 == True (capital-True; programme-dependent — severity-review)', async () => {
    await proveBothWays('ISO-14064-2-10', 'REQ-20',
      [{ ws: 'ISO-14064-2-10', values: { verification_validation_iso14064_3: true } }],
      [{ ws: 'ISO-14064-2-10', values: { verification_validation_iso14064_3: false } }]);
  });
  it('REQ-21  ghg_report IS NOT EMPTY (the corpus-repaired row — verify both ways)', async () => {
    await proveBothWays('ISO-14064-2-10', 'REQ-21',
      [{ ws: 'ISO-14064-2-10', values: { ghg_report: 'THG-Projektbericht v1.0, §9.3.1 a–s' } }],
      [{ ws: 'ISO-14064-2-10', values: { ghg_report: '' } }]); // '' → exists=false → IS NOT EMPTY fails
  });
  it('REQ-22  public_claim_content IS NOT NULL (optional/conditional — severity-review)', async () => {
    await proveBothWays('ISO-14064-2-10', 'REQ-22',
      [{ ws: 'ISO-14064-2-10', values: { public_claim_content: 'Konformitätserklärung nach §9.4' } }],
      [{ ws: 'ISO-14064-2-10', values: { public_claim_content: null } }]);
  });
});
