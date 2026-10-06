/**
 * DWA-M 820-2 structure block — the SHIPPED gate conditions and visible_when rules of the staged migration
 * scripts/migrations/20261006100000_m820_2_structure.sql, read out of the file and evaluated with the REAL engine
 * (`evaluateCondition` with the json carrier accessor, `computeVisibility`). Nothing is applied anywhere.
 *
 * Cases: Forscheln (no HOAI contract — the phases EKOWAI actually delivers mapped to LPH 0–5, construction by the client in
 * Eigenleistung, acceptance without a long test operation) — the routed gates do not block; a full public LPH 0–9 project
 * with violating inputs — every routed gate blocks; unanswered drivers — pending, never a silent pass.
 * Sources ([P0] L338 PDF p. 14, [P8a] L955 p. 36, [P8b] L1514 p. 53, [P8c] L1535 p. 54, [P9] L1828/L1836 p. 64, [V1] L1384 p. 49 /
 * L1442 p. 51 / L517 p. 21, [T1] L1621 p. 57, [T2] L1625 p. 57, [T3] L1641 p. 58, [E1] L1313 p. 47, [F06]…[F59]) are quoted in
 * the migration header.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateCondition } from '../../evaluate';
import { computeVisibility } from '../../visibility';
import { conditionFromSql, visibleWhenFromSql } from '../m820-1/sql-condition';
import { insertedFieldStatement, literals } from './sql-extract';

const FILE = resolve(__dirname, '../../../../../scripts/migrations/20261006100000_m820_2_structure.sql');
const md5 = (s: string) => createHash('md5').update(s).digest('hex');
type V = string | number | boolean;
type Vals = Record<string, V | undefined>;

const LPH = ['LPH 0 – Bedarfsplanung', 'LPH 1 – Grundlagenermittlung', 'LPH 2 – Vorplanung', 'LPH 3 – Entwurfsplanung', 'LPH 4 – Genehmigungsplanung',
  'LPH 5 – Ausführungsplanung', 'LPH 6 – Vorbereitung der Vergabe', 'LPH 7 – Mitwirkung bei der Vergabe', 'LPH 8 – Objektüberwachung (Bauüberwachung)', 'LPH 9 – Objektbetreuung'];
const FORSCHELN_PHASES = { selected: LPH.slice(0, 6) }; // the select_many carrier shape the checklist editor writes
const PUBLIC_PHASES = { selected: LPH };

/** Evaluate like the approval gate: scalar lookup + raw json carrier for `included_hoai_phases`. */
const ev = (cond: string, vals: Vals, phases?: unknown) =>
  evaluateCondition(cond, (s) => vals[s], { carrier: (s) => (s === 'included_hoai_phases' ? phases : undefined) });
const kind = (cond: string, vals: Vals, phases?: unknown) => ev(cond, vals, phases).kind;
const shipped = (code: string) => conditionFromSql(FILE, code);

// Live conditions of the 2026-10-05 prod dump (vault _baseline/2026-10-05_prod_DWA-M-820-2.encoding.json), verbatim.
const BASELINE: Record<string, string> = {
  'REQ-21': 'framework_conditions_clarified == true',
  'REQ-22': 'forward_planning_done == true',
  'REQ-23': 'changed_needs_recognised == true',
  'REQ-19': 'qs_plan_lph8_present == true',
  'REQ-43': 'quality_supervision_active == true',
  'REQ-44': 'bauueberwachung_competencies == true',
  'REQ-51': 'warranty_start_date IS NOT NULL AND warranty_end_date IS NOT NULL',
  'REQ-52': 'defect_tracking_active == true',
  'REQ-38': 'nebenangebote_conditions == true',
  'REQ-39': 'eignungskriterien_set == true',
  'REQ-40': 'leistungsbeschreibung_type IS NOT NULL',
  'REQ-41': 'rahmenterminplan_attached == true',
  'REQ-46': 'testbetrieb_planned == true',
  'REQ-35': 'discharge_permit_extension IN {"applied","granted","not_required"}',
  'REQ-06': 'decision_competencies_mapped == true',
  'REQ-13': '',
  'REQ-15': 'change_log_present == true',
  'REQ-45': 'approval_procedure_defined == true',
  'REQ-50': '',
  'REQ-55': '',
  'REQ-59': '',
};
const PH = (i: number) => `contains(included_hoai_phases, '${LPH[i]}')`;
const GUARD: Record<string, string> = {
  'REQ-21': PH(0), 'REQ-22': PH(0), 'REQ-23': PH(0),
  'REQ-19': PH(8), 'REQ-43': PH(8), 'REQ-44': PH(8),
  'REQ-51': PH(9), 'REQ-52': PH(9),
  'REQ-38': 'bauleistungen_vergeben == true', 'REQ-39': 'bauleistungen_vergeben == true', 'REQ-40': 'bauleistungen_vergeben == true', 'REQ-41': 'bauleistungen_vergeben == true',
  'REQ-46': "testbetrieb_vs_abnahme_choice == 'testbetrieb' OR testbetrieb_vs_abnahme_choice == 'mischform'",
  'REQ-35': 'einleitung_vorhanden == true',
};
const FILLED: Record<string, string> = {
  'REQ-06': 'betrieb_frueh_eingebunden == true',
  'REQ-13': 'kostenhinweise_auftragnehmer == true',
  'REQ-15': 'kostenziele_aenderungsprozess == true',
  'REQ-45': 'change_orders IS EMPTY OR aenderungsmanagement_gefuehrt == true',
  'REQ-50': 'inbetriebnahme_organisiert == true',
  'REQ-55': 'liability_clarified == true',
  'REQ-59': 'IF bim_methode_angewendet == true THEN (bim_basics_established == true)',
};

/** Every routed body violated (false / dates missing). */
const VIOLATING: Vals = {
  framework_conditions_clarified: false, forward_planning_done: false, changed_needs_recognised: false,
  qs_plan_lph8_present: false, quality_supervision_active: false, bauueberwachung_competencies: false,
  defect_tracking_active: false, warranty_start_date: '2027-05-01', // end date missing
  nebenangebote_conditions: false, eignungskriterien_set: false, rahmenterminplan_attached: false,
  testbetrieb_planned: false, discharge_permit_extension: 'pending',
};

describe('the file ships exactly the guarded live bodies (md5 of the live text in the guard) and the filled conditions', () => {
  const sql = readFileSync(FILE, 'utf8');
  it('guards: IF <guard> THEN (<live body>)', () => {
    for (const code of Object.keys(GUARD)) {
      expect(shipped(code), code).toBe(`IF ${GUARD[code]} THEN (${BASELINE[code]})`);
      expect(sql.includes(`md5(cr.condition) = '${md5(BASELINE[code])}'`), `${code} md5`).toBe(true);
    }
  });
  it('fills: the field that carries the printed sentence (warn gates)', () => {
    for (const code of Object.keys(FILLED)) {
      expect(shipped(code), code).toBe(FILLED[code]);
      expect(sql.includes(`cr.code = '${code}'`) && sql.includes(`md5(cr.condition) = '${md5(BASELINE[code])}'`), `${code} md5`).toBe(true);
    }
  });
  it('the phase tokens are the stored select_many values (long labels, en dash)', () => {
    for (const i of [0, 8, 9]) expect(sql.includes(`''${LPH[i]}''`), LPH[i]).toBe(true);
  });
  it('the driver bauleistungen_vergeben is a REQUIRED boolean on 820-2-17 with reach -18 / -19', () => {
    const st = insertedFieldStatement(FILE, 'bauleistungen_vergeben');
    expect(st).toMatch(/'boolean', NULL, true,/);
    expect(st).toContain("ARRAY['820-2-18','820-2-19']::text[]");
    expect(st).toContain("w.code = '820-2-17'");
    expect(literals(st)).toContain('B');
  });
});

describe('BROKEN BEFORE — the live gates block the Forscheln route (S-01 / S-02 / S-03)', () => {
  it('every routed body fails on the truthful Forscheln answers (no LPH 8 / 9, Eigenleistung, acceptance test only)', () => {
    const got = ['REQ-19', 'REQ-43', 'REQ-44', 'REQ-52', 'REQ-38', 'REQ-39', 'REQ-41', 'REQ-46'].map((c) => [c, kind(BASELINE[c], VIOLATING)]);
    console.log(`[M820-2 STRUCTURE unit] before: ${JSON.stringify(got)}`);
    expect(got.every(([, k]) => k === 'fail')).toBe(true);
  });
});

describe('S-01 phase routing (contains() on the contracted-phase checklist)', () => {
  const phaseGates = ['REQ-21', 'REQ-22', 'REQ-23', 'REQ-19', 'REQ-43', 'REQ-44', 'REQ-51', 'REQ-52'];
  it('Forscheln (LPH 0–5): LPH 8 / 9 gates pass with violating bodies; LPH 0 gates are judged by their body', () => {
    const got = Object.fromEntries(phaseGates.map((c) => [c, kind(shipped(c), VIOLATING, FORSCHELN_PHASES)]));
    console.log(`[M820-2 STRUCTURE unit] Forscheln phases violating: ${JSON.stringify(got)}`);
    expect(got).toEqual({ 'REQ-21': 'fail', 'REQ-22': 'fail', 'REQ-23': 'fail', 'REQ-19': 'pass', 'REQ-43': 'pass', 'REQ-44': 'pass', 'REQ-51': 'pass', 'REQ-52': 'pass' });
  });
  it('public LPH 0–9: every phase gate blocks when violated and passes when met', () => {
    const met: Vals = { framework_conditions_clarified: true, forward_planning_done: true, changed_needs_recognised: true, qs_plan_lph8_present: true,
      quality_supervision_active: true, bauueberwachung_competencies: true, defect_tracking_active: true, warranty_start_date: '2027-05-01', warranty_end_date: '2032-05-01' };
    const viol = phaseGates.map((c) => kind(shipped(c), VIOLATING, PUBLIC_PHASES));
    const ok = phaseGates.map((c) => kind(shipped(c), met, PUBLIC_PHASES));
    console.log(`[M820-2 STRUCTURE unit] public LPH 0–9 violating=${JSON.stringify(viol)} met=${JSON.stringify(ok)}`);
    // REQ-51 with the end date blank is pending (A1: never-entered + IS NOT NULL ⇒ missing — as before the block); a pending
    // block gate refuses approval like a failing one (owner ruling 2026-10-05, approval-gate.ts).
    expect(viol).toEqual(['fail', 'fail', 'fail', 'fail', 'fail', 'fail', 'pending', 'fail']);
    expect(ok.every((k) => k === 'pass')).toBe(true);
  });
  it('contracted phases not entered: pending on included_hoai_phases (no silent pass); an empty selection switches every phase gate off', () => {
    for (const c of phaseGates) {
      expect(ev(shipped(c), VIOLATING, undefined), c).toEqual({ kind: 'pending', missingSymbols: ['included_hoai_phases'] });
      expect(kind(shipped(c), VIOLATING, { selected: [] }), c).toBe('pass');
    }
  });
  it('a bare-array carrier reads the same; a short token ("LPH 8") does NOT match the stored long label', () => {
    expect(kind(shipped('REQ-19'), VIOLATING, LPH)).toBe('fail');
    expect(kind(shipped('REQ-19'), VIOLATING, ['LPH 8'])).toBe('pass');
  });
});

describe('S-02 construction award (bauleistungen_vergeben)', () => {
  const tender = ['REQ-38', 'REQ-39', 'REQ-40', 'REQ-41'];
  it('Eigenleistung (No): pass with violating bodies · award (Yes): the body decides · unanswered: pending on the driver', () => {
    const no = tender.map((c) => kind(shipped(c), { ...VIOLATING, bauleistungen_vergeben: false }));
    const yesViol = tender.map((c) => kind(shipped(c), { ...VIOLATING, bauleistungen_vergeben: true }));
    const yesOk = tender.map((c) => kind(shipped(c), { bauleistungen_vergeben: true, nebenangebote_conditions: true, eignungskriterien_set: true, leistungsbeschreibung_type: 'detailliert', rahmenterminplan_attached: true }));
    console.log(`[M820-2 STRUCTURE unit] tender no=${JSON.stringify(no)} yes-violating=${JSON.stringify(yesViol)} yes-met=${JSON.stringify(yesOk)}`);
    expect(no).toEqual(['pass', 'pass', 'pass', 'pass']);
    expect(yesViol).toEqual(['fail', 'fail', 'pending', 'fail']); // REQ-40 body is `IS NOT NULL` on a blank enum = pending (S-06 class, unchanged)
    expect(yesOk).toEqual(['pass', 'pass', 'pass', 'pass']);
    for (const c of tender) expect(ev(shipped(c), VIOLATING), c).toEqual({ kind: 'pending', missingSymbols: ['bauleistungen_vergeben'] });
  });
  it('visible_when: the award-only entries hide on a definite No, stay visible on Yes and while unanswered (real computeVisibility)', () => {
    const rule = visibleWhenFromSql(FILE, 'leistungsbeschreibung_type');
    expect(rule).toBe('bauleistungen_vergeben == true');
    const hidden = (vals: Vals) => computeVisibility([{ id: 'f', symbol: 'x', sectionId: null, visibleWhen: rule }], [], (s) => vals[s]).hiddenFieldIds.has('f');
    expect([hidden({ bauleistungen_vergeben: false }), hidden({ bauleistungen_vergeben: true }), hidden({})]).toEqual([true, false, false]);
  });
});

describe('S-03 REQ-46 acceptance path and REQ-35 discharge attestation', () => {
  it('REQ-46: acceptance tests without test operation (Einzelfall / printed option 2) pass without a Testbetrieb; testbetrieb / mischform need it', () => {
    const r = (choice: string | undefined, planned: boolean) => kind(shipped('REQ-46'), { testbetrieb_vs_abnahme_choice: choice, testbetrieb_planned: planned });
    const got = { abnahme_false: r('abnahmepruefung', false), test_false: r('testbetrieb', false), test_true: r('testbetrieb', true), misch_false: r('mischform', false), misch_true: r('mischform', true) };
    console.log(`[M820-2 STRUCTURE unit] REQ-46 ${JSON.stringify(got)}`);
    expect(got).toEqual({ abnahme_false: 'pass', test_false: 'fail', test_true: 'pass', misch_false: 'fail', misch_true: 'pass' });
    expect(ev(shipped('REQ-46'), { testbetrieb_planned: false })).toEqual({ kind: 'pending', missingSymbols: ['testbetrieb_vs_abnahme_choice'] });
    expect(kind(BASELINE['REQ-46'], { testbetrieb_vs_abnahme_choice: 'abnahmepruefung', testbetrieb_planned: false })).toBe('fail'); // broken before
  });
  it('REQ-35: only with a time-limited discharge', () => {
    const r = (einleitung: boolean, ext: string) => kind(shipped('REQ-35'), { einleitung_vorhanden: einleitung, discharge_permit_extension: ext });
    expect([r(false, 'pending'), r(true, 'pending'), r(true, 'applied')]).toEqual(['pass', 'fail', 'pass']);
  });
});

describe('S-07 filled warn gates — both ways', () => {
  it('each reads its own field: true → pass, false → fail, blank → pending', () => {
    const sym: Record<string, string> = { 'REQ-06': 'betrieb_frueh_eingebunden', 'REQ-13': 'kostenhinweise_auftragnehmer', 'REQ-15': 'kostenziele_aenderungsprozess',
      'REQ-50': 'inbetriebnahme_organisiert', 'REQ-55': 'liability_clarified' };
    for (const [code, s] of Object.entries(sym)) {
      expect([kind(shipped(code), { [s]: true }), kind(shipped(code), { [s]: false }), kind(shipped(code), {})], code).toEqual(['pass', 'fail', 'pending']);
    }
  });
  it('REQ-45: no construction changes = met; with changes the change-management field decides', () => {
    const r = (co: string | undefined, gef?: boolean) => kind(shipped('REQ-45'), { change_orders: co, aenderungsmanagement_gefuehrt: gef });
    expect([r(undefined), r('present', false), r('present', true)]).toEqual(['pass', 'fail', 'pass']);
  });
  it('REQ-59: only a BIM project needs the BIM basics', () => {
    const r = (bim: boolean, basics: boolean) => kind(shipped('REQ-59'), { bim_methode_angewendet: bim, bim_basics_established: basics });
    expect([r(false, false), r(true, false), r(true, true)]).toEqual(['pass', 'fail', 'pass']);
  });
});
