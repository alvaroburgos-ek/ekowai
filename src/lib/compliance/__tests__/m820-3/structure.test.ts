/**
 * DWA-M 820-3 structure block — the SHIPPED gate conditions, enum token, section / field visible_when rules and drivers of the staged
 * migration scripts/migrations/20261006120000_m820_3_structure.sql, read out of the file and run through the REAL engine
 * (`evaluateCondition`, `computeVisibility`, `evaluateFormula` on the three live Projektstopp formulas). Nothing is applied anywhere.
 *
 * Baseline = tests/harness/m820-3-structure.dump.json (byte copy of the vault 2026-10-05 prod dump). Cases:
 *   Forscheln C1 (Einzelprojekt, pond built, no acceptance yet: § 6.6 / § 6.7 = "noch_nicht_erreicht"), Paula's Gesamtsystem concept C2
 *   (project_type gesamtsystem; 14_Readiness-Run_M820-3 §3.2 values), a violating case per gate, unanswered drivers (pending).
 * Sources ([N1] L227 p. 10, [N2] L202 p. 9 / L519 p. 19, [P1] L307 p. 12, [R1] L321 p. 13 / L398 p. 16 / L379 p. 15 / L410 p. 16,
 * [T1] L305 p. 12, [B1] L583 / L573 p. 21, L659 p. 23, [B2] …) are quoted in the migration header.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateCondition } from '../../evaluate';
import { computeVisibility } from '../../visibility';
import { evaluateFormula } from '@/lib/eval/formula';
import { conditionFromSql, splitOnUnquotedSemicolons } from '../m820-1/sql-condition';
import { insertedFieldStatement, insertedGateCondition, jsonbLiterals, literals } from '../m820-2/sql-extract';

const ROOT = resolve(__dirname, '../../../../..');
const FILE = resolve(ROOT, 'scripts/migrations/20261006120000_m820_3_structure.sql');
const DUMP = resolve(ROOT, 'tests/harness/m820-3-structure.dump.json');
const sql = readFileSync(FILE, 'utf8');
const md5 = (s: string) => createHash('md5').update(s).digest('hex');
type V = string | number | boolean;
type Vals = Record<string, V | undefined>;
type Dump = {
  fields: Array<{ worksheet: string; symbol: string; enum_values: Array<{ value: string }> | null; visible_when: string | null }>;
  gates: Array<{ code: string; worksheet: string; condition: string; severity: string }>;
  equations: Array<{ worksheet: string; equation_number: string; formula: string; input_symbols: string[]; output_symbol: string }>;
  sections: Array<{ id: string; worksheet: string; code: string; visible_when: string | null }>;
};
const dump = JSON.parse(readFileSync(DUMP, 'utf8').replace(/^﻿/, '')) as Dump;
const live = (code: string) => dump.gates.find((g) => g.code === code)!;
const ev = (cond: string, vals: Vals, hidden?: Set<string>) => evaluateCondition(cond, (s) => vals[s], hidden ? { hiddenSymbols: hidden } : undefined);
const kind = (cond: string, vals: Vals, hidden?: Set<string>) => ev(cond, vals, hidden).kind;
const shipped = (code: string) => conditionFromSql(FILE, code);

const TOKEN = 'noch_nicht_erreicht';
const ANNEX_A = "project_type IN {'gesamtsystem', 'both'}";
const ANNEX_B = "project_type IN {'einzelprojekt', 'both'}";
const PHASES = [
  { ws: 'M8203-04', p: '52', req: 'REQ-06', annex: 'A' }, { ws: 'M8203-05', p: '53', req: 'REQ-07', annex: 'A' }, { ws: 'M8203-06', p: '54', req: 'REQ-08', annex: 'A' },
  { ws: 'M8203-11', p: '62', req: 'REQ-09', annex: 'B' }, { ws: 'M8203-12', p: '63', req: 'REQ-10', annex: 'B' }, { ws: 'M8203-14', p: '64', req: 'REQ-11', annex: 'B' },
  { ws: 'M8203-16', p: '65', req: 'REQ-12', annex: 'B' }, { ws: 'M8203-17', p: '66', req: 'REQ-13', annex: 'B' }, { ws: 'M8203-18', p: '67', req: 'REQ-14', annex: 'B' },
] as const;
const pzOf = (ws: string) => dump.fields.filter((f) => f.worksheet === ws && /^pz_\d+_\d+_status$/.test(f.symbol)).map((f) => f.symbol)
  .sort((a, b) => Number(a.split('_')[2]) - Number(b.split('_')[2]));
const all = (ws: string, v: string): Vals => Object.fromEntries(pzOf(ws).map((s) => [s, v]));

/** Forscheln C1 (14_Readiness-Run_M820-3 §2.2) — § 6.6 / § 6.7 now "noch nicht erreicht" (the phase is not reached; no acceptance on file). */
const FORSCHELN: Vals = {
  project_type: 'einzelprojekt',
  pz_62_1_status: 'erreicht', pz_62_2_status: 'nicht_zutreffend', pz_62_3_status: 'teilweise_erreicht', pz_62_4_status: 'teilweise_erreicht', pz_62_5_status: 'erreicht',
  pz_63_1_status: 'erreicht', pz_63_2_status: 'teilweise_erreicht', pz_63_3_status: 'nicht_zutreffend', pz_63_4_status: 'teilweise_erreicht', pz_63_5_status: 'teilweise_erreicht', pz_63_6_status: 'erreicht', pz_63_7_status: 'teilweise_erreicht', pz_63_8_status: 'erreicht',
  pz_64_1_status: 'teilweise_erreicht', pz_64_2_status: 'teilweise_erreicht', pz_64_3_status: 'teilweise_erreicht', pz_64_4_status: 'erreicht', pz_64_5_status: 'teilweise_erreicht', pz_64_6_status: 'teilweise_erreicht', pz_64_7_status: 'teilweise_erreicht', pz_64_8_status: 'teilweise_erreicht', pz_64_9_status: 'erreicht', pz_64_10_status: 'nicht_zutreffend', pz_64_11_status: 'nicht_zutreffend', pz_64_12_status: 'nicht_zutreffend',
  pz_65_1_status: 'teilweise_erreicht', pz_65_2_status: 'teilweise_erreicht', pz_65_3_status: 'teilweise_erreicht', pz_65_4_status: 'erreicht', pz_65_5_status: 'erreicht', pz_65_6_status: 'nicht_erreicht', pz_65_7_status: 'erreicht', pz_65_8_status: 'teilweise_erreicht', pz_65_9_status: 'nicht_zutreffend', pz_65_10_status: 'erreicht', pz_65_11_status: 'erreicht', pz_65_12_status: 'nicht_zutreffend',
  ...all('M8203-17', TOKEN), ...all('M8203-18', TOKEN),
};
/** Paula's Gesamtsystem concept C2 (14_Readiness-Run_M820-3 §3.2) — the § 6 goals are NOT answered any more (hidden path). */
const PAULA: Vals = {
  project_type: 'gesamtsystem',
  pz_52_1_status: 'teilweise_erreicht', pz_52_2_status: 'teilweise_erreicht', pz_52_3_status: 'erreicht', pz_52_4_status: 'erreicht', pz_52_5_status: 'teilweise_erreicht',
  pz_53_1_status: 'teilweise_erreicht', pz_53_2_status: 'nicht_erreicht', pz_53_3_status: 'erreicht', pz_53_4_status: 'teilweise_erreicht', pz_53_5_status: 'nicht_erreicht',
  pz_54_1_status: 'erreicht', pz_54_2_status: 'erreicht', pz_54_3_status: 'erreicht',
};

describe('the file ships exactly the guarded live bodies (md5 of the live text in the guard) and the new gates', () => {
  it('REQ-06 … REQ-14: IF project_type IN {<path>} THEN (<live body, every goal also accepting noch_nicht_erreicht>)', () => {
    for (const ph of PHASES) {
      const body = live(ph.req).condition.replace(/(pz_\d+_\d+_status) == "nicht_zutreffend"/g, `$1 == "nicht_zutreffend" OR $1 == "${TOKEN}"`);
      expect(shipped(ph.req), ph.req).toBe(`IF ${ph.annex === 'A' ? ANNEX_A : ANNEX_B} THEN (${body})`);
      expect(shipped(ph.req).split(`== "${TOKEN}"`).length - 1, ph.req).toBe(pzOf(ph.ws).length); // every goal of the sheet, the optional ones too
      expect(sql.includes(`cr.code = '${ph.req}' AND w.code = '${ph.ws}' AND md5(cr.condition) = '${md5(live(ph.req).condition)}'`), `${ph.req} md5`).toBe(true);
      expect(live(ph.req).severity).toBe('block');
    }
  });
  it('REQ-06-2 … REQ-14-2 (NEW, block): IF <a goal of the sheet> IN {nicht_erreicht, teilweise_erreicht} … THEN (<review record> == true)', () => {
    for (const ph of PHASES) {
      const trig = pzOf(ph.ws).map((s) => `${s} IN {'nicht_erreicht', 'teilweise_erreicht'}`).join(' OR ');
      expect(insertedGateCondition(FILE, `${ph.req}-2`), ph.req).toBe(`IF ${trig} THEN (pz_${ph.p}_projektstopp_risikoanalyse == true)`);
    }
    const inserts = splitOnUnquotedSemicolons(sql).filter((s) => /^\s*INSERT\s+INTO\s+compliance_requirements\s*\(/i.test(s));
    expect(inserts).toHaveLength(18);
    expect(inserts.filter((st) => st.includes("'§3', 'block'"))).toHaveLength(9); // REQ-06-2 … REQ-14-2
    expect(inserts.filter((st) => st.includes("'§2.1', 'warn'"))).toHaveLength(9); // REQ-06-3 … REQ-14-3 (review fix I-n)
  });
  it('the other edited gates: guards, fills, re-points (all warn — severity untouched)', () => {
    const BIM = 'digitale_methoden_bim_angewendet';
    const exp: Record<string, string> = {
      'REQ-25': `IF ${BIM} == true THEN (${live('REQ-25').condition})`,
      'REQ-26': `IF ${BIM} == true THEN (${live('REQ-26').condition})`,
      'REQ-27': 'bestandsdaten_complete_digital == true AND akz_in_place == true AND critical_infra_assessed == true',
      'REQ-29': `IF ${BIM} == true THEN (cde_used_for_communication == true AND bim_communication_interfaces == true)`,
      'REQ-30': 'public_info_via_digital_media == true AND communication_concept_adaptive == true',
      'REQ-02': 'anw_hinweis_1_confirmed == true AND anw_hinweis_2_confirmed == true AND anw_hinweis_3_confirmed == true AND anw_hinweis_4_confirmed == true',
      'REQ-03': 'phase_definition_acknowledged == true AND phasenziele_definition_acknowledged == true AND projektziele_definition_acknowledged == true AND qe_definition_acknowledged == true',
      'REQ-05': 'IF kleiner_kommunaler_betrieb == true THEN (grundsatz_two_step_followed == true)',
      'REQ-31': 'IF projektstopp_code == 1 THEN (projektstopp_review_triggered == true)',
    };
    for (const [code, cond] of Object.entries(exp)) {
      expect(shipped(code), code).toBe(cond);
      expect(live(code).severity, code).toBe('warn');
      expect(sql.includes(`md5(cr.condition) = '${md5(live(code).condition)}'`), `${code} md5`).toBe(true);
    }
    expect(['REQ-02', 'REQ-03', 'REQ-05', 'REQ-27', 'REQ-29', 'REQ-31'].map((c) => live(c).condition)).toEqual(['', '', '', '', '', '']); // S-08: the six empty gates
    expect(live('REQ-30').condition).toBe('digital_twin_after_project == true'); // S-06: the wrong symbol
    expect(sql).not.toMatch(/SET\s+severity/i);
  });
  it('S-01 token: one jsonb object appended to the 67 Phasenziel enums (guarded on the 4-token list); no equation is touched', () => {
    const upd = splitOnUnquotedSemicolons(sql).find((s) => /SET enum_values = f\.enum_values \|\|/.test(s))!;
    expect(jsonbLiterals(upd)[0]).toEqual([{ value: TOKEN, label_de: 'Phase noch nicht erreicht (Bewertung erst nach Abschluss der Phase)', label_en: 'Phase not reached yet (assessed once the phase is completed)', order_index: 5, regulation_reference: '§2.1 Phasenziele' }]);
    const pairs = [...upd.matchAll(/\('(M8203-\d\d)','(pz_\d+_\d+_status)'\)/g)].map((m) => `${m[1]} ${m[2]}`);
    const livePz = dump.fields.filter((f) => /^pz_\d+_\d+_status$/.test(f.symbol)).map((f) => `${f.worksheet} ${f.symbol}`);
    expect(pairs.sort()).toEqual(livePz.sort());
    expect(pairs).toHaveLength(67);
    for (const f of dump.fields.filter((x) => /^pz_\d+_\d+_status$/.test(x.symbol))) expect(f.enum_values!.map((e) => e.value)).toEqual(['erreicht', 'teilweise_erreicht', 'nicht_erreicht', 'nicht_zutreffend']);
    expect(sql).not.toMatch(/(UPDATE|INSERT INTO|DELETE FROM)\s+equations/i);
  });
  it('drivers: two REQUIRED booleans (M8203-02 / M8203-19, section C); the BIM driver reaches M8203-21; review records optional', () => {
    const k = insertedFieldStatement(FILE, 'kleiner_kommunaler_betrieb');
    expect(k).toMatch(/'boolean', NULL, true,/);
    expect(k).toContain("w.code = 'M8203-02'");
    const b = insertedFieldStatement(FILE, 'digitale_methoden_bim_angewendet');
    expect(b).toMatch(/'boolean', NULL, true,/);
    expect(b).toContain("w.code = 'M8203-19'");
    expect(b).toContain("ARRAY['M8203-21']::text[]");
    for (const ph of PHASES) {
      const st = insertedFieldStatement(FILE, `pz_${ph.p}_projektstopp_risikoanalyse`);
      expect(st, ph.ws).toMatch(/'boolean', NULL, false,/);
      expect(st, ph.ws).toContain(`w.code = '${ph.ws}'`);
    }
  });
  it('S-02 consumer reach (supersedes m820_3-C-1): project_type {ALL} → the 17 sheets carrying a project_type rule', () => {
    const st = splitOnUnquotedSemicolons(sql).find((s) => /SET consumer_worksheets = ARRAY\[/.test(s) && s.includes("f.symbol = 'project_type'"))!;
    const reach = literals(st.split('FROM')[0]);
    const ruled = new Set([...dump.fields.filter((f) => f.visible_when?.includes('project_type')).map((f) => f.worksheet), ...PHASES.map((p) => p.ws), 'M8203-13', 'M8203-15']);
    expect(new Set(reach)).toEqual(ruled);
    expect(reach).toHaveLength(17);
    expect(st).toContain("f.consumer_worksheets = ARRAY['ALL']::text[]");
  });
});

describe('BROKEN BEFORE — the live gates on the truthful answers', () => {
  it('a running project (Forscheln) must call § 6.6 / § 6.7 "nicht_erreicht" (no other token) → REQ-13 / REQ-14 block and the Projektstopp code fires', () => {
    const forced = { ...FORSCHELN, ...all('M8203-17', 'nicht_erreicht'), ...all('M8203-18', 'nicht_erreicht') };
    expect([kind(live('REQ-13').condition, forced), kind(live('REQ-14').condition, forced)]).toEqual(['fail', 'fail']);
  });
  it('a Gesamtsystem-only project (Paula) is blocked by the unanswered § 6 goals (no project_type guard)', () => {
    expect(PHASES.filter((p) => p.annex === 'B').map((p) => kind(live(p.req).condition, PAULA))).toEqual(['pending', 'pending', 'pending', 'pending', 'pending', 'pending']);
  });
});

describe('S-01 "Phase noch nicht erreicht": passes the phase check, never a stop signal', () => {
  it('Forscheln after: § 6.6 / § 6.7 noch_nicht_erreicht → REQ-13 / REQ-14 pass, REQ-13-2 / REQ-14-2 not triggered', () => {
    const got = ['REQ-13', 'REQ-14', 'REQ-13-2', 'REQ-14-2'].map((c) => kind(c.endsWith('-2') ? insertedGateCondition(FILE, c) : shipped(c), FORSCHELN));
    console.log(`[M820-3 STRUCTURE unit] Forscheln §6.6/§6.7 noch_nicht_erreicht: ${JSON.stringify(got)}`);
    expect(got).toEqual(['pass', 'pass', 'pass', 'pass']);
  });
  it('the three live Projektstopp formulas (unchanged) ignore the token: all goals noch_nicht_erreicht → 0; one teilweise → 1', () => {
    const run = (eqNo: string, vals: Vals) => {
      const e = dump.equations.find((x) => x.equation_number === eqNo)!;
      const st = evaluateFormula({ equationId: eqNo, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol,
        inputs: e.input_symbols.map((s) => ({ symbol: s, value: (vals[s] as string | undefined) ?? null, unit: null })) });
      return st.kind === 'computed' ? st.value : st.kind;
    };
    const allNot = Object.fromEntries(PHASES.flatMap((p) => pzOf(p.ws).map((s) => [s, TOKEN])));
    const res = {
      a: run('M8203-22-D3', allNot), b: run('M8203-23-D3', allNot), all: run('M8203-24-D1', allNot),
      b_teilweise: run('M8203-23-D3', { ...allNot, pz_65_1_status: 'teilweise_erreicht' }),
      b_forscheln: run('M8203-23-D3', FORSCHELN),
    };
    console.log(`[M820-3 STRUCTURE unit] Projektstopp codes: ${JSON.stringify(res)}`);
    expect(res).toEqual({ a: 0, b: 0, all: 0, b_teilweise: 1, b_forscheln: 1 });
    for (const n of ['M8203-22-D3', 'M8203-23-D3', 'M8203-24-D1']) expect(dump.equations.find((x) => x.equation_number === n)!.formula).not.toContain(TOKEN);
  });
  it('every phase gate both ways: all noch_nicht_erreicht → pass; one nicht_erreicht → fail (violating case per gate)', () => {
    for (const ph of PHASES) {
      const pt = ph.annex === 'A' ? 'gesamtsystem' : 'einzelprojekt';
      expect(kind(shipped(ph.req), { project_type: pt, ...all(ph.ws, TOKEN) }), ph.req).toBe('pass');
      expect(kind(shipped(ph.req), { project_type: pt, ...all(ph.ws, TOKEN), [pzOf(ph.ws)[0]]: 'nicht_erreicht' }), ph.req).toBe('fail');
      expect(kind(shipped(ph.req), { project_type: 'both', ...all(ph.ws, 'erreicht') }), ph.req).toBe('pass');
    }
  });
});

describe('S-02 path routing (project_type) — gates and the section rule', () => {
  it('the other path: the phase gate passes (guard false) and the review gate is not applicable (its inputs hidden by the section rule)', () => {
    for (const ph of PHASES) {
      const other = ph.annex === 'A' ? 'einzelprojekt' : 'gesamtsystem';
      const hidden = new Set([...pzOf(ph.ws), `pz_${ph.p}_projektstopp_risikoanalyse`]);
      expect(kind(shipped(ph.req), { project_type: other }, hidden), ph.req).toBe('pass');
      expect(kind(insertedGateCondition(FILE, `${ph.req}-2`), { project_type: other }, hidden), `${ph.req}-2`).toBe('not_applicable');
    }
  });
  it('project_type not answered → every phase gate waits on it (no silent pass), even with all goals met', () => {
    for (const ph of PHASES) expect(ev(shipped(ph.req), all(ph.ws, 'erreicht')), ph.req).toEqual({ kind: 'pending', missingSymbols: ['project_type'] });
  });
  it('Paula (Gesamtsystem): § 6 gates pass without answers; § 5 judged — REQ-07 blocks on the two missed goals', () => {
    const got = Object.fromEntries(PHASES.map((ph) => [ph.req, kind(shipped(ph.req), PAULA)]));
    console.log(`[M820-3 STRUCTURE unit] Paula gesamtsystem: ${JSON.stringify(got)}`);
    expect(got).toEqual({ 'REQ-06': 'pass', 'REQ-07': 'fail', 'REQ-08': 'pass', 'REQ-09': 'pass', 'REQ-10': 'pass', 'REQ-11': 'pass', 'REQ-12': 'pass', 'REQ-13': 'pass', 'REQ-14': 'pass' });
  });
  it('section rules (real computeVisibility): hidden only on a definite other path; visible on the own path, on both and while unanswered', () => {
    const upd = splitOnUnquotedSemicolons(sql).filter((s) => /^\s*UPDATE\s+worksheet_sections/i.test(s));
    expect(upd.map((s) => literals(s)[0])).toEqual([ANNEX_A, ANNEX_B]);
    expect(upd[0]).toContain("'M8203-04', 'M8203-05', 'M8203-06', 'M8203-07', 'M8203-08', 'M8203-09', 'M8203-10', 'M8203-22'");
    expect(upd[1]).toContain("'M8203-11', 'M8203-12', 'M8203-13', 'M8203-14', 'M8203-15', 'M8203-16', 'M8203-17', 'M8203-18', 'M8203-23'");
    const hiddenBy = (rule: string, pt: string | undefined) =>
      computeVisibility([{ id: 'f', symbol: 'pz_x', sectionId: 's' }], [{ id: 's', parentSectionId: null, visibleWhen: rule }], (s) => (s === 'project_type' ? pt : undefined)).hiddenFieldIds.has('f');
    expect(['gesamtsystem', 'einzelprojekt', 'both', undefined].map((pt) => hiddenBy(ANNEX_A, pt))).toEqual([false, true, false, false]);
    expect(['gesamtsystem', 'einzelprojekt', 'both', undefined].map((pt) => hiddenBy(ANNEX_B, pt))).toEqual([true, false, false, false]);
    expect(dump.sections.filter((s) => s.visible_when !== null)).toHaveLength(0);
  });
});

describe('S-03 printed consequence (§ 3 L307): review + risk analysis before approval', () => {
  it('each review gate both ways: teilweise / nicht erreicht + no record → fail; record Yes → pass; met / n.a. / not reached → pass; goals blank → pending', () => {
    for (const ph of PHASES) {
      const g = insertedGateCondition(FILE, `${ph.req}-2`);
      const doc = `pz_${ph.p}_projektstopp_risikoanalyse`;
      const first = pzOf(ph.ws)[0];
      const base = all(ph.ws, 'erreicht');
      expect([
        kind(g, { ...base, [first]: 'teilweise_erreicht', [doc]: false }),
        kind(g, { ...base, [first]: 'nicht_erreicht', [doc]: false }),
        kind(g, { ...base, [first]: 'teilweise_erreicht', [doc]: true }),
        kind(g, { ...base, [first]: 'teilweise_erreicht' }),
        kind(g, base), kind(g, all(ph.ws, 'nicht_zutreffend')), kind(g, all(ph.ws, TOKEN)),
      ], ph.req).toEqual(['fail', 'fail', 'pass', 'pending', 'pass', 'pass', 'pass']);
      expect(ev(g, {}).kind, ph.req).toBe('pending');
    }
  });
  it('Forscheln: the review is owed on § 6.2 … § 6.5 (partial goals), not on § 6.6 / § 6.7', () => {
    const got = Object.fromEntries(PHASES.filter((p) => p.annex === 'B').map((ph) => [`${ph.req}-2`, kind(insertedGateCondition(FILE, `${ph.req}-2`), FORSCHELN)]));
    console.log(`[M820-3 STRUCTURE unit] Forscheln review gates (no record yet): ${JSON.stringify(got)}`);
    expect(got).toEqual({ 'REQ-09-2': 'pending', 'REQ-10-2': 'pending', 'REQ-11-2': 'pending', 'REQ-12-2': 'pending', 'REQ-13-2': 'pass', 'REQ-14-2': 'pass' });
  });
  it('REQ-31 (warn, M8203-24): code 1 → the review flag must be Yes; code 0 → met; code not computable → pending', () => {
    const g = shipped('REQ-31');
    expect([kind(g, { projektstopp_code: 1, projektstopp_review_triggered: false }), kind(g, { projektstopp_code: 1, projektstopp_review_triggered: true }), kind(g, { projektstopp_code: 0 }), kind(g, {})]).toEqual(['fail', 'pass', 'pass', 'pending']);
  });
});

describe('S-07 / S-06 / S-08 / S-14 — drivers and filled gates, both ways', () => {
  const BIM = 'digitale_methoden_bim_angewendet';
  it('BIM driver: No → REQ-25 / -26 / -29 pass with everything false; Yes → the bodies decide; blank → pending on the driver', () => {
    const f = { aia_available: false, bap_defined: false, bim_project_definition_complete: false, cde_platform_defined: false, digital_twin_after_project: false, cde_used_for_communication: false, bim_communication_interfaces: false };
    const t = Object.fromEntries(Object.keys(f).map((k) => [k, true]));
    const codes = ['REQ-25', 'REQ-26', 'REQ-29'];
    expect(codes.map((c) => kind(shipped(c), { ...f, [BIM]: false }))).toEqual(['pass', 'pass', 'pass']);
    expect(codes.map((c) => kind(shipped(c), { ...f, [BIM]: true }))).toEqual(['fail', 'fail', 'fail']);
    expect(codes.map((c) => kind(shipped(c), { ...t, [BIM]: true }))).toEqual(['pass', 'pass', 'pass']);
    for (const c of codes) expect(ev(shipped(c), t), c).toEqual({ kind: 'pending', missingSymbols: [BIM] });
  });
  it('visible_when: the 7 BIM questions hide on a definite No; the two-stage question hides unless the client is a smaller municipal operator', () => {
    const rules = splitOnUnquotedSemicolons(sql)
      .filter((st) => /^\s*UPDATE\s+fields/i.test(st) && /SET visible_when = '/.test(st))
      .map((st) => [st.match(/f\.symbol = '([a-z_0-9]+)'/)![1], literals(st)[0]]);
    expect(Object.fromEntries(rules)).toEqual({
      grundsatz_two_step_followed: 'kleiner_kommunaler_betrieb == true',
      aia_available: `${BIM} == true`, bap_defined: `${BIM} == true`, bim_project_definition_complete: `${BIM} == true`, cde_platform_defined: `${BIM} == true`,
      digital_twin_after_project: `${BIM} == true`, bim_communication_interfaces: `${BIM} == true`, cde_used_for_communication: `${BIM} == true`,
    });
    const hidden = (rule: string, vals: Vals) => computeVisibility([{ id: 'f', symbol: 'x', sectionId: null, visibleWhen: rule }], [], (s) => vals[s]).hiddenFieldIds.has('f');
    expect([false, true, undefined].map((v) => hidden(`${BIM} == true`, { [BIM]: v }))).toEqual([true, false, false]);
    expect([false, true, undefined].map((v) => hidden('kleiner_kommunaler_betrieb == true', { kleiner_kommunaler_betrieb: v }))).toEqual([true, false, false]);
  });
  it('REQ-05 (S-14): private client → met; smaller municipal operator → the two-stage answer decides; blank → pending', () => {
    const g = shipped('REQ-05');
    expect([kind(g, { kleiner_kommunaler_betrieb: false, grundsatz_two_step_followed: false }), kind(g, { kleiner_kommunaler_betrieb: true, grundsatz_two_step_followed: false }), kind(g, { kleiner_kommunaler_betrieb: true, grundsatz_two_step_followed: true }), ev(g, {}).kind]).toEqual(['pass', 'fail', 'pass', 'pending']);
  });
  it('REQ-27 / REQ-30 / REQ-02 / REQ-03 read their own questions: all Yes → pass, one No → fail', () => {
    for (const code of ['REQ-27', 'REQ-30', 'REQ-02', 'REQ-03']) {
      const syms = shipped(code).split(' AND ').map((t) => t.replace(' == true', ''));
      const yes = Object.fromEntries(syms.map((s) => [s, true]));
      expect([kind(shipped(code), yes), kind(shipped(code), { ...yes, [syms[0]]: false })], code).toEqual(['pass', 'fail']);
    }
    expect(kind(shipped('REQ-30'), { digital_twin_after_project: true, public_info_via_digital_media: false, communication_concept_adaptive: true })).toBe('fail'); // the digital twin no longer satisfies § 7.5.3
  });
});

describe('review fix I-n — REQ-06-3 … REQ-14-3 (NEW warn): a goal marked "noch_nicht_erreicht" warns (confirm the phase is still ahead)', () => {
  it('shipped: NOT (<every goal of the sheet> == noch_nicht_erreicht OR …)', () => {
    for (const ph of PHASES) {
      expect(insertedGateCondition(FILE, `${ph.req}-3`), ph.req).toBe(`NOT (${pzOf(ph.ws).map((s) => `${s} == '${TOKEN}'`).join(' OR ')})`);
    }
  });
  it('both ways per sheet: one goal not reached → fail (= warning); all rated → pass; other path (hidden) → not applicable', () => {
    for (const ph of PHASES) {
      const g = insertedGateCondition(FILE, `${ph.req}-3`);
      const first = pzOf(ph.ws)[0];
      expect([
        kind(g, { ...all(ph.ws, 'erreicht'), [first]: TOKEN }),
        kind(g, all(ph.ws, TOKEN)),
        kind(g, all(ph.ws, 'erreicht')),
        kind(g, { ...all(ph.ws, 'nicht_zutreffend'), [first]: 'teilweise_erreicht' }),
        kind(g, {}, new Set(pzOf(ph.ws))),
      ], ph.req).toEqual(['fail', 'fail', 'pass', 'pass', 'not_applicable']);
    }
  });
  it('Forscheln: § 6.6 / § 6.7 warn (the engineer confirms the phases are still ahead), § 6.2 … § 6.5 do not', () => {
    const got = Object.fromEntries(PHASES.filter((p) => p.annex === 'B').map((ph) => [`${ph.req}-3`, kind(insertedGateCondition(FILE, `${ph.req}-3`), FORSCHELN)]));
    console.log(`[M820-3 STRUCTURE unit] Forscheln token warnings: ${JSON.stringify(got)}`);
    expect(got).toEqual({ 'REQ-09-3': 'pass', 'REQ-10-3': 'pass', 'REQ-11-3': 'pass', 'REQ-12-3': 'pass', 'REQ-13-3': 'fail', 'REQ-14-3': 'fail' });
  });
});
