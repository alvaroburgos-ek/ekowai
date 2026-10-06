/**
 * DWA-M 820-2 structure block — the SHIPPED gate conditions and visible_when rules of the staged migration
 * scripts/migrations/20261006100000_m820_2_structure.sql, read out of the file and evaluated with the REAL engine
 * (`evaluateCondition`, `computeVisibility`). Nothing is applied anywhere.
 *
 * Review round 1 (C-1 / I-1 / I-2): the phase checks are routed by WHO PERFORMS the phase (verantwortung_lph8 / _lph9 on
 * 820-2-01: auftragnehmer / auftraggeber / dritter / entfaellt), not by the engineer's contracted phases.
 * Cases: Forscheln — LPH 8 performed by the client himself (self-build), LPH 9 responsibility not in the records (GAP → the
 * gates wait), construction in Eigenleistung, acceptance without a long test operation; a public project with an external
 * supervisor and violating inputs — every routed gate blocks; a concept-only project (entfaellt) — the phase checks are off;
 * unanswered drivers — pending, never a silent pass.
 * Sources ([P1] L336/L338 p. 14, [P8a] L955/L967 p. 36, [P8b] L534 p. 22 / L1514 p. 53 / L1531 p. 54, [P8c] L1535/L1545 p. 54,
 * [P9] L1816/L1836/L1844 p. 64, [V1] L1384 p. 49 / L1442 p. 51 / L517 p. 21, [T1] L1621 p. 57, [T2] L1625 p. 57, [T3] L1641 p. 58,
 * [E1] L1313 p. 47, [F06]…[F59]) are quoted in the migration header.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateCondition } from '../../evaluate';
import { computeVisibility } from '../../visibility';
import { conditionFromSql, visibleWhenFromSql } from '../m820-1/sql-condition';
import { insertedFieldStatement, insertedGateCondition, jsonbLiterals, literals } from './sql-extract';

const FILE = resolve(__dirname, '../../../../../scripts/migrations/20261006100000_m820_2_structure.sql');
const md5 = (s: string) => createHash('md5').update(s).digest('hex');
type V = string | number | boolean;
type Vals = Record<string, V | undefined>;

const ev = (cond: string, vals: Vals) => evaluateCondition(cond, (s) => vals[s]);
const kind = (cond: string, vals: Vals) => ev(cond, vals).kind;
const shipped = (code: string) => conditionFromSql(FILE, code);

// Live conditions of the 2026-10-05 prod dump (vault _baseline/2026-10-05_prod_DWA-M-820-2.encoding.json), verbatim.
const BASELINE: Record<string, string> = {
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
const R8_ON = "verantwortung_lph8 != 'entfaellt'";
const R8_EXT = "verantwortung_lph8 == 'auftragnehmer' OR verantwortung_lph8 == 'dritter'";
const R9_ON = "verantwortung_lph9 != 'entfaellt'";
const GUARD: Record<string, string> = {
  'REQ-19': R8_ON, 'REQ-43': R8_ON, 'REQ-44': R8_EXT,
  'REQ-51': R9_ON, 'REQ-52': R9_ON,
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
const REQ_52_2 = `IF ${R9_ON} THEN (verantwortlich_lph9_name IS NOT NULL)`;

/** Every routed body violated (false / dates missing / no LPH 9 name). */
const VIOLATING: Vals = {
  qs_plan_lph8_present: false, quality_supervision_active: false, bauueberwachung_competencies: false,
  defect_tracking_active: false, warranty_start_date: '2027-05-01', // end date missing
  nebenangebote_conditions: false, eignungskriterien_set: false, rahmenterminplan_attached: false,
  testbetrieb_planned: false, discharge_permit_extension: 'pending',
};
const MET: Vals = { qs_plan_lph8_present: true, quality_supervision_active: true, bauueberwachung_competencies: true, defect_tracking_active: true,
  warranty_start_date: '2027-05-01', warranty_end_date: '2032-05-01', verantwortlich_lph9_name: 'Betrieb der Anlage (Leitung)' };

describe('the file ships exactly the guarded live bodies (md5 of the live text in the guard), the filled conditions and REQ-52-2', () => {
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
  it('NEW gate REQ-52-2 (§ 5.8.3 remedy) and NO contracted-phase guard left (REQ-21/-22/-23 untouched, included_hoai_phases not read)', () => {
    expect(insertedGateCondition(FILE, 'REQ-52-2')).toBe(REQ_52_2);
    for (const c of ['REQ-21', 'REQ-22', 'REQ-23']) expect(sql.includes(`cr.code = '${c}'`), c).toBe(false);
    expect(sql.replace(/^--.*$/gm, '')).not.toMatch(/contains\(|included_hoai_phases/);
  });
  it('the drivers: REQUIRED enums on 820-2-01 section B — LPH 0 without "entfaellt", LPH 8 / 9 with it; reach to the guarded sheets', () => {
    const tokens = (sym: string) => (jsonbLiterals(insertedFieldStatement(FILE, sym))[0] as Array<{ value: string }>).map((t) => t.value);
    expect(tokens('verantwortung_lph0')).toEqual(['auftragnehmer', 'auftraggeber', 'dritter']);
    expect(tokens('verantwortung_lph8')).toEqual(['auftragnehmer', 'auftraggeber', 'dritter', 'entfaellt']);
    expect(tokens('verantwortung_lph9')).toEqual(['auftragnehmer', 'auftraggeber', 'dritter', 'entfaellt']);
    const reach: Record<string, string> = { verantwortung_lph0: "ARRAY['820-2-11']", verantwortung_lph8: "ARRAY['820-2-09','820-2-20']", verantwortung_lph9: "ARRAY['820-2-24']" };
    for (const [sym, arr] of Object.entries(reach)) {
      const st = insertedFieldStatement(FILE, sym);
      expect(st, sym).toMatch(/'enum', NULL, true,/);
      expect(st, sym).toContain("w.code = '820-2-01'");
      expect(st, sym).toContain(arr);
    }
  });
  it('the driver bauleistungen_vergeben is a REQUIRED boolean on 820-2-17 with reach -18 / -19', () => {
    const st = insertedFieldStatement(FILE, 'bauleistungen_vergeben');
    expect(st).toMatch(/'boolean', NULL, true,/);
    expect(st).toContain("ARRAY['820-2-18','820-2-19']::text[]");
    expect(st).toContain("w.code = '820-2-17'");
    expect(literals(st)).toContain('B');
  });
});

describe('BROKEN BEFORE — the live gates block the Forscheln route (S-02 / S-03)', () => {
  it('the award and acceptance bodies fail on the truthful Forscheln answers (Eigenleistung, acceptance test only)', () => {
    const got = ['REQ-38', 'REQ-39', 'REQ-41', 'REQ-46'].map((c) => [c, kind(BASELINE[c], VIOLATING)]);
    console.log(`[M820-2 STRUCTURE unit] before: ${JSON.stringify(got)}`);
    expect(got.every(([, k]) => k === 'fail')).toBe(true);
  });
});

describe('S-01 phase routing by responsibility (verantwortung_lph8 / _lph9)', () => {
  const lph8 = ['REQ-19', 'REQ-43', 'REQ-44'];
  const lph9 = ['REQ-51', 'REQ-52'];
  const run = (codes: string[], vals: Vals) => codes.map((c) => kind(shipped(c), vals));
  it('LPH 8 performed by the CLIENT himself (Forscheln self-build): REQ-19 / REQ-43 judged on the client documentation, REQ-44 (external supervisor only) off', () => {
    const viol = run(lph8, { ...VIOLATING, verantwortung_lph8: 'auftraggeber' });
    const met = run(lph8, { ...MET, verantwortung_lph8: 'auftraggeber' });
    console.log(`[M820-2 STRUCTURE unit] LPH 8 = auftraggeber violating=${JSON.stringify(viol)} met=${JSON.stringify(met)}`);
    expect(viol).toEqual(['fail', 'fail', 'pass']);
    expect(met).toEqual(['pass', 'pass', 'pass']);
  });
  it('LPH 8 by a contractor or a third party: all three judged', () => {
    for (const who of ['auftragnehmer', 'dritter']) {
      expect(run(lph8, { ...VIOLATING, verantwortung_lph8: who }), who).toEqual(['fail', 'fail', 'fail']);
      expect(run(lph8, { ...MET, verantwortung_lph8: who }), who).toEqual(['pass', 'pass', 'pass']);
    }
  });
  it('LPH 9 by anyone — the client included (the uncontracted LPH 9 is the printed PROBLEM, L1816): REQ-51 / REQ-52 / REQ-52-2 judged', () => {
    for (const who of ['auftragnehmer', 'auftraggeber', 'dritter']) {
      const viol = [...run(lph9, { ...VIOLATING, verantwortung_lph9: who }), kind(REQ_52_2, { verantwortung_lph9: who })];
      const met = [...run(lph9, { ...MET, verantwortung_lph9: who }), kind(REQ_52_2, { ...MET, verantwortung_lph9: who })];
      console.log(`[M820-2 STRUCTURE unit] LPH 9 = ${who} violating=${JSON.stringify(viol)} met=${JSON.stringify(met)}`);
      expect(viol, who).toEqual(['pending', 'fail', 'pending']); // REQ-51 end date blank / REQ-52-2 name blank = pending (A1) → approval refused
      expect(met, who).toEqual(['pass', 'pass', 'pass']);
    }
  });
  it('concept-only project (entfaellt): every LPH 8 / LPH 9 check is off', () => {
    expect(run(lph8, { ...VIOLATING, verantwortung_lph8: 'entfaellt' })).toEqual(['pass', 'pass', 'pass']);
    expect([...run(lph9, { ...VIOLATING, verantwortung_lph9: 'entfaellt' }), kind(REQ_52_2, { verantwortung_lph9: 'entfaellt' })]).toEqual(['pass', 'pass', 'pass']);
  });
  it('I-2: driver not answered → every routed check is pending on it (no silent pass)', () => {
    for (const c of lph8) expect(ev(shipped(c), VIOLATING), c).toEqual({ kind: 'pending', missingSymbols: ['verantwortung_lph8'] });
    for (const c of lph9) expect(ev(shipped(c), VIOLATING), c).toEqual({ kind: 'pending', missingSymbols: ['verantwortung_lph9'] });
    expect(ev(REQ_52_2, {})).toEqual({ kind: 'pending', missingSymbols: ['verantwortung_lph9'] });
    // also with every body MET: still pending on the driver
    for (const c of [...lph8, ...lph9]) expect(kind(shipped(c), MET), c).toBe('pending');
  });
  it('visible_when: LPH 8 / 9 inputs hide only on a definite "entfaellt" (and the competence question only for an external supervisor)', () => {
    const hidden = (rule: string, vals: Vals) => computeVisibility([{ id: 'f', symbol: 'x', sectionId: null, visibleWhen: rule }], [], (s) => vals[s]).hiddenFieldIds.has('f');
    const r8 = visibleWhenFromSql(FILE, 'qs_plan_lph8_present');
    const r8ext = visibleWhenFromSql(FILE, 'bauueberwachung_competencies');
    const r9 = visibleWhenFromSql(FILE, 'warranty_start_date');
    expect([r8, r8ext, r9]).toEqual([R8_ON, R8_EXT, R9_ON]);
    expect(['auftragnehmer', 'auftraggeber', 'dritter', 'entfaellt', undefined].map((v) => hidden(r8, { verantwortung_lph8: v }))).toEqual([false, false, false, true, false]);
    expect(['auftragnehmer', 'auftraggeber', 'dritter', 'entfaellt', undefined].map((v) => hidden(r8ext, { verantwortung_lph8: v }))).toEqual([false, true, false, true, false]);
    expect(['auftraggeber', 'entfaellt', undefined].map((v) => hidden(r9, { verantwortung_lph9: v }))).toEqual([false, true, false]);
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
