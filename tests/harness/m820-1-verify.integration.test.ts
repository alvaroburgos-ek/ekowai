/**
 * DWA-M-820-1 (Merkblatt DWA-M 820-1 — "Qualität von Ingenieurleistungen optimieren
 * — Teil 1: Vorbereitung und Vergabeverfahren"; März 2020, published Merkblatt) —
 * REAL save-path execution proof.
 *
 * PROOF MANDATE (owner, 2026-07-27): "runnable" means RAN. This harness PROVES each
 * of the standard's 20 live BLOCK gates (non-empty condition) by driving it through
 * the REAL enforcement chain against a disposable embedded Postgres:
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
 * COVERED GATE SHAPES (M-820-1 is a procurement/planning standard — 0 equations):
 *   - membership IN {…} lowercase enum         REQ-01 (sector), REQ-25 (compliance_verdict)
 *   - single numeric limit                      REQ-06 (fee>0), REQ-12 (revenue<=2.0), REQ-20 (rounds>=1)
 *   - single boolean equality                   REQ-02/03/10/16/17/21/23
 *   - biconditional IF/THEN guard pair          REQ-07 (fee<->threshold_status, cross-worksheet)
 *   - guarded procedure gate                    REQ-08/09/18 (IF procurement_procedure=='vgv_f' …)
 *   - single `=` operator (tokenizes to ==)     REQ-15 (price<=20 OR festpreis_used=true)
 *   - var-vs-var ordering (F-4 fix)             REQ-19 (applicant_count >= shortlisted_count)
 *   - multi-conjunct standstill disjunction     REQ-22 (§134 GWB 10/15 days)
 *
 * GRAMMAR TRAP AUDIT (this session, verified against evaluate.ts + prod enum values):
 *   - IN-set case: REQ-01 {wastewater,water_supply,flood_protection,waste,other} and
 *     REQ-25 {compliant,compliant_with_conditions} are BOTH lowercase and match the
 *     prod enum `value`s exactly → membership resolves (the passing cases below prove
 *     it — an always-false gate could never pass). No Titlecase always-false trap.
 *   - bare-ident-RHS ==/!= field-vs-field: NONE. Every `==`/`!=` RHS in M-820-1 is a
 *     boolean literal (true/false) or a QUOTED string ('vgv_f','oberschwellig') — no
 *     silent string-coercion trap.
 *   - single `=`: REQ-15's `festpreis_used=true` tokenizes to `festpreis_used == true`
 *     (evaluate.ts line 75) → boolean equality, enforces correctly (proven below).
 *
 * KNOWN DEFECT demonstrated (not fixed here — draft only, per task):
 *   - REQ-01 sector IN-set OMITS `water_engineering` (=Wasserbau), yet §1
 *     Anwendungsbereich explicitly names "Wasserbau" as in-scope AND the prod enum
 *     offers water_engineering as a selectable value. A correct in-scope Wasserbau
 *     selection is therefore WRONGLY BLOCKED. The dedicated test below reproduces the
 *     current (buggy) behaviour; the draft fix adds water_engineering to the IN-set.
 */
// @vitest-environment node
import './_harness-env-m820-1'; // top-level-await: PG + seedM820 BEFORE @/lib/db
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getM820Harness } from './_harness-env-m820-1';
import type { checkApprovalGate as CheckApprovalGate } from '@/lib/actions/approval-gate';
import type { saveWorksheet as SaveWorksheet } from '@/lib/actions/worksheet';

const { harness, fixture } = getM820Harness();

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

describe('DWA-M-820-1 — M820-01 Projektregistrierung (§1 Anwendungsbereich, §8.5)', () => {
  it('REQ-01  sector IN {lowercase §1 set} — membership resolves (no case trap)', async () => {
    await proveBothWays('M820-01', 'REQ-01',
      [{ ws: 'M820-01', values: { sector: 'wastewater' } }],
      // out-of-list value → membership false → blocks
      [{ ws: 'M820-01', values: { sector: 'not_a_sector' } }]);
  });
  it('REQ-01 DEFECT repro  water_engineering (=Wasserbau, §1 in-scope) is WRONGLY blocked', async () => {
    // §1: "Ingenieurleistungen für Projekte im Bereich Wasserwirtschaft, WASSERBAU,
    // Abwasser und Abfall." The prod enum offers water_engineering (label_de "Wasserbau"),
    // but REQ-01's IN-set omits it → a valid in-scope selection blocks. Draft fix:
    // add water_engineering to the IN-set. This asserts the CURRENT (buggy) behaviour.
    await saveSymbols('M820-01', { sector: 'water_engineering' });
    expect(await gateBlocks('M820-01', 'REQ-01')).toBe(true); // buggy: should be false after fix
    // restore an in-list value so later state is clean
    await saveSymbols('M820-01', { sector: 'wastewater' });
  });
  it('REQ-06  estimated_engineering_fee > 0', async () => {
    await proveBothWays('M820-01', 'REQ-06',
      [{ ws: 'M820-01', values: { estimated_engineering_fee: 250000 } }],
      [{ ws: 'M820-01', values: { estimated_engineering_fee: 0 } }]);
  });
});

describe('DWA-M-820-1 — M820-04 Bedarfsplanung Konzept (§6.2) + Schwellenwert (§8.6/Anh.B)', () => {
  it('REQ-02  bedarfsplanung_konzept_complete == true', async () => {
    await proveBothWays('M820-04', 'REQ-02',
      [{ ws: 'M820-04', values: { bedarfsplanung_konzept_complete: true } }],
      [{ ws: 'M820-04', values: { bedarfsplanung_konzept_complete: false } }]);
  });
  it('REQ-07  fee>=threshold <-> threshold_status==oberschwellig (biconditional, cross-worksheet)', async () => {
    // Consistent oberschwellig state: fee 250000 >= EU threshold 221000 AND status=oberschwellig
    await proveBothWays('M820-04', 'REQ-07',
      [
        { ws: 'M820-01', values: { estimated_engineering_fee: 250000 } },
        { ws: 'M820-09', values: { eu_threshold_value: 221000, threshold_status: 'oberschwellig' } },
      ],
      // fee still >= threshold but status flipped to unterschwellig → 1st guard body false → AND fails
      [{ ws: 'M820-09', values: { threshold_status: 'unterschwellig' } }]);
  });
  it('REQ-07  ALSO blocks the reverse inconsistency (status oberschwellig but fee < threshold)', async () => {
    // status=oberschwellig, fee 100000 < threshold 221000 → 2nd guard body false → blocks
    await applySaves([
      { ws: 'M820-01', values: { estimated_engineering_fee: 250000 } },
      { ws: 'M820-09', values: { eu_threshold_value: 221000, threshold_status: 'oberschwellig' } },
    ]);
    expect(await gateBlocks('M820-04', 'REQ-07')).toBe(false);
    await saveSymbols('M820-01', { estimated_engineering_fee: 100000 });
    expect(await gateBlocks('M820-04', 'REQ-07')).toBe(true);
    // restore consistent state
    await saveSymbols('M820-01', { estimated_engineering_fee: 250000 });
  });
});

describe('DWA-M-820-1 — M820-05 Bedarfsplanung Projekt (§6.4)', () => {
  it('REQ-03  bedarfsplanung_projekt_complete == true', async () => {
    await proveBothWays('M820-05', 'REQ-03',
      [{ ws: 'M820-05', values: { bedarfsplanung_projekt_complete: true } }],
      [{ ws: 'M820-05', values: { bedarfsplanung_projekt_complete: false } }]);
  });
});

describe('DWA-M-820-1 — M820-10 Verfahrenswahl (§8.6)', () => {
  it('REQ-08  IF oberschwellig THEN procurement_procedure == vgv_f (cross-worksheet guard)', async () => {
    await proveBothWays('M820-10', 'REQ-08',
      [
        { ws: 'M820-09', values: { oberschwellig_check: true } },
        { ws: 'M820-10', values: { procurement_procedure: 'vgv_f' } },
      ],
      // oberschwellig still true, wrong procedure → guard true, body false → blocks
      [{ ws: 'M820-10', values: { procurement_procedure: 'suchverfahren' } }]);
  });
  it('REQ-08  vacuously passes when unterschwellig (guard false)', async () => {
    await applySaves([
      { ws: 'M820-09', values: { oberschwellig_check: false } },
      { ws: 'M820-10', values: { procurement_procedure: 'direktvergabe' } },
    ]);
    expect(await gateBlocks('M820-10', 'REQ-08')).toBe(false);
    // restore oberschwellig+vgv_f for downstream procedure-dependent gates
    await applySaves([
      { ws: 'M820-09', values: { oberschwellig_check: true } },
      { ws: 'M820-10', values: { procurement_procedure: 'vgv_f' } },
    ]);
  });
});

describe('DWA-M-820-1 — M820-11 Qualitätsanforderungen — Leistungswettbewerb (§76 VgV, §8.7)', () => {
  it('REQ-17  leistungswettbewerb_only == true', async () => {
    await proveBothWays('M820-11', 'REQ-17',
      [{ ws: 'M820-11', values: { leistungswettbewerb_only: true } }],
      [{ ws: 'M820-11', values: { leistungswettbewerb_only: false } }]);
  });
});

describe('DWA-M-820-1 — M820-12 Ausschlusskriterien (§123 GWB, Anh. E.1.1)', () => {
  it('REQ-10  exclusion_123_gwb_checked == true', async () => {
    await proveBothWays('M820-12', 'REQ-10',
      [{ ws: 'M820-12', values: { exclusion_123_gwb_checked: true } }],
      [{ ws: 'M820-12', values: { exclusion_123_gwb_checked: false } }]);
  });
});

describe('DWA-M-820-1 — M820-13 Eignungskriterien — Mindestjahresumsatz (§45 Abs. 2 VgV)', () => {
  it('REQ-12  min_annual_revenue_multiplier <= 2.0 (max "das Zweifache", E.1.4.1)', async () => {
    await proveBothWays('M820-13', 'REQ-12',
      [{ ws: 'M820-13', values: { min_annual_revenue_multiplier: 2.0 } }],
      [{ ws: 'M820-13', values: { min_annual_revenue_multiplier: 3.0 } }]);
  });
});

describe('DWA-M-820-1 — M820-14 Zuschlagskriterien (Anh. E.2.8 / §58 VgV)', () => {
  it('REQ-15  price_weight_percent <= 20 OR festpreis_used=true (single `=` → ==)', async () => {
    await proveBothWays('M820-14', 'REQ-15',
      [{ ws: 'M820-14', values: { price_weight_percent: 20, festpreis_used: false } }],
      [{ ws: 'M820-14', values: { price_weight_percent: 30, festpreis_used: false } }]);
  });
  it('REQ-15  ALSO passes via festpreis disjunct even when price weight > 20', async () => {
    await saveSymbols('M820-14', { price_weight_percent: 30, festpreis_used: false });
    expect(await gateBlocks('M820-14', 'REQ-15')).toBe(true);
    await saveSymbols('M820-14', { festpreis_used: true });
    expect(await gateBlocks('M820-14', 'REQ-15')).toBe(false); // festpreis exception → not blocked
  });
  it('REQ-16  doppelbewertungsverbot_check == true', async () => {
    await proveBothWays('M820-14', 'REQ-16',
      [{ ws: 'M820-14', values: { doppelbewertungsverbot_check: true } }],
      [{ ws: 'M820-14', values: { doppelbewertungsverbot_check: false } }]);
  });
});

describe('DWA-M-820-1 — M820-16 Bewertungskommission (§58 Abs. 5 VgV, §8.4)', () => {
  it('REQ-09  IF vgv_f THEN bewertungskommission_size >= 2 (mind. zwei Personen)', async () => {
    await proveBothWays('M820-16', 'REQ-09',
      [
        { ws: 'M820-10', values: { procurement_procedure: 'vgv_f' } },
        { ws: 'M820-16', values: { bewertungskommission_size: 3 } },
      ],
      // vgv_f still, only one member → guard true, body false → blocks
      [{ ws: 'M820-16', values: { bewertungskommission_size: 1 } }]);
  });
});

describe('DWA-M-820-1 — M820-17 Bekanntmachung (§8.10.2.3)', () => {
  it('REQ-18  IF vgv_f THEN publication_date IS NOT NULL AND ted_notice_id IS NOT NULL', async () => {
    await proveBothWays('M820-17', 'REQ-18',
      [
        { ws: 'M820-10', values: { procurement_procedure: 'vgv_f' } },
        { ws: 'M820-17', values: { publication_date: '2020-05-01', ted_notice_id: '2020/S 123-456789' } },
      ],
      // clear publication_date while ted set → body false → blocks
      [{ ws: 'M820-17', values: { publication_date: null } }]);
  });
});

describe('DWA-M-820-1 — M820-18 Bewerberprüfung (§8.10.2.4)', () => {
  it('REQ-19  applicant_count >= shortlisted_count (var-vs-var ordering, F-4 fix)', async () => {
    await proveBothWays('M820-18', 'REQ-19',
      [{ ws: 'M820-18', values: { applicant_count: 8, shortlisted_count: 5 } }],
      // fewer applicants than shortlist → 3 >= 5 false → blocks (would SILENTLY never
      // enforce under the pre-F-4 string-literal-RHS semantics)
      [{ ws: 'M820-18', values: { applicant_count: 3, shortlisted_count: 5 } }]);
  });
});

describe('DWA-M-820-1 — M820-20 Verhandlungsprotokoll (§17 Abs. 14 VgV, §8.10.3.4)', () => {
  it('REQ-20  negotiation_rounds >= 1', async () => {
    await proveBothWays('M820-20', 'REQ-20',
      [{ ws: 'M820-20', values: { negotiation_rounds: 1 } }],
      [{ ws: 'M820-20', values: { negotiation_rounds: 0 } }]);
  });
});

describe('DWA-M-820-1 — M820-21 Vertragscheckliste (§8.10.3.5)', () => {
  it('REQ-21  vertragsentwurf_in_unterlagen == true', async () => {
    await proveBothWays('M820-21', 'REQ-21',
      [{ ws: 'M820-21', values: { vertragsentwurf_in_unterlagen: true } }],
      [{ ws: 'M820-21', values: { vertragsentwurf_in_unterlagen: false } }]);
  });
});

describe('DWA-M-820-1 — M820-23 Auftragserteilung (§134 / §135 GWB)', () => {
  it('REQ-22  letters sent AND standstill (electronic >=10 / paper >=15 Kalendertage)', async () => {
    await proveBothWays('M820-23', 'REQ-22',
      [{ ws: 'M820-23', values: { information_letters_sent: true, electronic_transmission: true, standstill_period_days: 10 } }],
      // electronic but only 5 days (< 10) → disjunction false → blocks
      [{ ws: 'M820-23', values: { standstill_period_days: 5 } }]);
  });
  it('REQ-22  paper branch: >=15 passes, 12 (<15) blocks', async () => {
    await saveSymbols('M820-23', { information_letters_sent: true, electronic_transmission: false, standstill_period_days: 15 });
    expect(await gateBlocks('M820-23', 'REQ-22')).toBe(false);
    await saveSymbols('M820-23', { standstill_period_days: 12 });
    expect(await gateBlocks('M820-23', 'REQ-22')).toBe(true);
  });
  it('REQ-26  letters sent AND contract_invalidity_135_gwb_risk == false', async () => {
    await proveBothWays('M820-23', 'REQ-26',
      [{ ws: 'M820-23', values: { information_letters_sent: true, contract_invalidity_135_gwb_risk: false } }],
      [{ ws: 'M820-23', values: { contract_invalidity_135_gwb_risk: true } }]);
  });
});

describe('DWA-M-820-1 — M820-24 Dokumentationsabschluss (§8 VgV, Anh. F)', () => {
  it('REQ-23  vergabevermerk_complete == true', async () => {
    await proveBothWays('M820-24', 'REQ-23',
      [{ ws: 'M820-24', values: { vergabevermerk_complete: true } }],
      [{ ws: 'M820-24', values: { vergabevermerk_complete: false } }]);
  });
});

describe('DWA-M-820-1 — M820-25 Konformitätszusammenfassung (§4.1, Bild 2-3)', () => {
  it('REQ-25  compliance_verdict IN {compliant,compliant_with_conditions} — membership resolves', async () => {
    await proveBothWays('M820-25', 'REQ-25',
      [{ ws: 'M820-25', values: { compliance_verdict: 'compliant' } }],
      [{ ws: 'M820-25', values: { compliance_verdict: 'not_compliant' } }]);
  });
  it('REQ-25  ALSO passes via compliant_with_conditions member', async () => {
    await saveSymbols('M820-25', { compliance_verdict: 'compliant_with_conditions' });
    expect(await gateBlocks('M820-25', 'REQ-25')).toBe(false);
    await saveSymbols('M820-25', { compliance_verdict: 'insufficient_data' });
    expect(await gateBlocks('M820-25', 'REQ-25')).toBe(true);
  });
});
