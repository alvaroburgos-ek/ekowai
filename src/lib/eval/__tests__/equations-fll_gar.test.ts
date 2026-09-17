/**
 * Plan 3 Task 7 — FLL-GAR-2023 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * the printed rule through the real `evaluateFormula` over rows prepared by the
 * register contract (Tab. 1 / 5 / 6 / 22 / 24 / 26 / 27 / 28 cells looked up from
 * the seeded tables — the TS fallback, no migration applied). Enum cells and
 * enum scalars reach the formulas as strings (controller amendment D).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/fll_gar';
import { FIELD_CONFIGS } from '../field-configs/fll_gar';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'FLL-GAR-2023';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const scope = (m: Record<string, Value>) => (s: string) => (s in m ? m[s] : undefined);
const prep = (ws: string, sym: string, rows: unknown[], symbol?: (s: string) => Value | undefined) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol }, {});
const inp = (m: Record<string, number | string>) => Object.entries(m).map(([symbol, value]) => ({ symbol, value, unit: null }));
const run = (n: string, opts: { inputs?: Array<{ symbol: string; value: number | string | null; unit: string | null }>; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };

describe('FLL-GAR-2023 Plan-3 equations', () => {
  it('twenty entries; every output is a created field of its worksheet; no prod producer duplicated (g_prime, Delta_u, Q_NOT); emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual(['FLL-GAR-02-D1', 'FLL-GAR-05-D1', 'FLL-GAR-05-D2', 'FLL-GAR-05-D3', 'FLL-GAR-07-D1', 'FLL-GAR-07-D2', 'FLL-GAR-09-D1', 'FLL-GAR-09-D2', 'FLL-GAR-11-D1', 'FLL-GAR-12-D1', 'FLL-GAR-14-D1', 'FLL-GAR-16-D1', 'FLL-GAR-16-D2', 'FLL-GAR-18-D1', 'FLL-GAR-18-D2', 'FLL-GAR-23-D1', 'FLL-GAR-24-D1', 'FLL-GAR-24-D2', 'FLL-GAR-27-D1', 'FLL-GAR-27-D2']);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.worksheet} ${e.output_symbol}`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(['g_prime', 'Delta_u', 'Q_NOT']).not.toContain(e.output_symbol); // the prod Anhang-1/-2 outputs stay single-sourced (fll_gar-R-1 / -R-2)
    }
    expect(new Set(EQUATIONS.map((e) => `${e.worksheet} ${e.output_symbol}`)).size).toBe(EQUATIONS.length);
    expect(() => emitEquationsSql('fll_gar', EQUATIONS)).not.toThrow();
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('fll_gar', EQUATIONS);
    const files = equationFilesFor('fll_gar', '20260917100720');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(20);
  });

  it('FLL-GAR-02-D1: the four §1.1 exclusions → 0, every listed use → 1', () => {
    for (const t of ['deponie', 'fischerei', 'talsperre', 'wasserstrasse']) expect(computed(run('FLL-GAR-02-D1', { inputs: inp({ gewaesser_type: t }) })), t).toBe(0); // L510–L513
    for (const t of ['teich', 'schwimmteich', 'regenrueckhaltebecken', 'beschneiungsteich']) expect(computed(run('FLL-GAR-02-D1', { inputs: inp({ gewaesser_type: t }) })), t).toBe(1); // L500–L508
    expect(run('FLL-GAR-02-D1', {}).kind).toBe('manual_required');
  });

  it('FLL-GAR-05-D1 / -D2 / -D3: Tab. 18 — W1-B ≤ 5 m, W2-B ≤ 10 m, W3-B > 10 m; R0…R3 with the 0,2 / 0,5 / 1,0 mm bounds and the R3 Versatz ≤ 0,5 mm; S1-B / S2-B', () => {
    expect([5, 5.01, 10, 10.5].map((h) => computed(run('FLL-GAR-05-D1', { inputs: inp({ fuellhoehe_m: h }) })))).toEqual([1, 2, 2, 3]); // L3673–L3675
    const r = (neurissbildung: string, rb: number, rv: number) => computed(run('FLL-GAR-05-D2', { inputs: inp({ neurissbildung, rissbreite_erwartet_mm: rb, rissversatz_erwartet_mm: rv }) }));
    expect(r('ausgeschlossen', 0, 0)).toBe(0);   // L3677
    expect(r('moeglich', 0.2, 0)).toBe(1);        // L3680
    expect(r('moeglich', 0.5, 0)).toBe(2);        // L3684
    expect(r('moeglich', 1.0, 0.5)).toBe(3);      // L3688
    expect(r('moeglich', 1.0, 0.6)).toBe(9);      // Versatz over 0,5 mm → outside Tab. 18 (fll_gar-J-2)
    expect(r('moeglich', 1.2, 0)).toBe(9);
    expect(run('FLL-GAR-05-D2', { inputs: inp({ neurissbildung: 'moeglich', rissbreite_erwartet_mm: 0.1 }) }).kind).toBe('manual_required'); // every named input is checked before evaluation
    expect(computed(run('FLL-GAR-05-D3', { inputs: inp({ standort_tab18: 'aussen_frei' }) }))).toBe(1);   // L3692–L3693
    expect(computed(run('FLL-GAR-05-D3', { inputs: inp({ standort_tab18: 'aussen_bauwerk' }) }))).toBe(2); // L3695–L3696
    expect(computed(run('FLL-GAR-05-D3', { inputs: inp({ standort_tab18: 'innen' }) }))).toBe(2);
  });

  it('FLL-GAR-07-D1 / -D2 over boeschungsabschnitte: Tab. 1 per row on the (not yet inherited) abdichtungs_art — steepest 1:1 vs limit 1:1,5 for Kunststoffbahnen (L1408); undecidable without the driver (fll_gar-C-1)', () => {
    const rows = [{ id: '1', zone: 'flach', neigung_1m: 3, gefaelle_pct: 33 }, { id: '2', zone: 'tief', neigung_1m: 1, gefaelle_pct: 100 }, { id: '3', zone: 'sumpf', neigung_1m: 1.5 }];
    const K = prep('FLL-GAR-07', 'boeschungsabschnitte', rows, scope({ abdichtungs_art: 'bahn_kunststoff_elastomer' }));
    expect(K.rows.map((r) => [r.values.limit_1m, r.values.ok, r.complete])).toEqual([[1.5, 1, true], [1.5, 0, true], [1.5, 1, true]]);
    expect(computed(run('FLL-GAR-07-D1', { registers: { boeschungsabschnitte: K } }))).toBe(1);
    expect(computed(run('FLL-GAR-07-D2', { registers: { boeschungsabschnitte: K } }))).toBe(1);
    const G = prep('FLL-GAR-07', 'boeschungsabschnitte', rows, scope({ abdichtungs_art: 'verbundwerkstoff_gtd' })); // L1406: ≤ 1:3
    expect(G.rows.map((r) => r.values.ok)).toEqual([1, 0, 0]);
    expect(computed(run('FLL-GAR-07-D2', { registers: { boeschungsabschnitte: G } }))).toBe(2);
    const none = prep('FLL-GAR-07', 'boeschungsabschnitte', rows); // abdichtungs_art not in scope on -07 today
    expect(none.rows.map((r) => [r.values.limit_1m, r.values.ok])).toEqual([[null, null], [null, null], [null, null]]);
    expect(computed(run('FLL-GAR-07-D1', { registers: { boeschungsabschnitte: none } }))).toBe(1); // the steepest slope needs no driver
    expect(run('FLL-GAR-07-D2', { registers: { boeschungsabschnitte: none } }).kind).toBe('manual_required');
    const S = prep('FLL-GAR-07', 'boeschungsabschnitte', rows, scope({ abdichtungs_art: 'stahl' })); // no Tab.-1 row (fll_gar-E-1)
    expect(S.rows.map((r) => r.values.limit_1m)).toEqual([null, null, null]);
  });

  it('FLL-GAR-09-D1 / -D2 over abdichtungslagen: Σ sealing thickness and count of Abdichtung rows; Tab. 26 / Tab. 27 per row', () => {
    const rows = [
      { id: '1', position: 1, rolle: 'schutzlage_unten', dicke_mm: 3, flaechengewicht_g_m2: 300, baugrund: 'UL' },              // L5388: 5 | x x x x
      { id: '2', position: 2, rolle: 'abdichtung', material: 'bahn_bitumen', dicke_mm: 4 },
      { id: '3', position: 3, rolle: 'abdichtung', material: 'bahn_bitumen', dicke_mm: 4 },                                    // L3765 "i. d. R. mehrlagig"
      { id: '4', position: 4, rolle: 'schutzlage_oben', dicke_mm: 4, flaechengewicht_g_m2: 400, swk: 'swk2' },                 // L5437–L5445: ≥ 500 g
      { id: '5', position: 5, rolle: 'auflast', dicke_mm: 300 },
    ];
    const L = prep('FLL-GAR-09', 'abdichtungslagen', rows);
    expect(L.rows.map((r) => [r.values.neigung_limit, r.values.sand_min_cm, r.values.fg_min, r.values.fg_ok, r.complete])).toEqual([[0, 5, null, 1, true], [3, null, null, 1, true], [3, null, null, 1, true], [0, null, 500, 0, true], [0, null, null, 1, true]]);
    expect(L.rows[0].values.werkstoffe_tab26).toContain('Vliesstoffe bzw. Geo- textilien ≥ 300 g/m2, GRK 5');
    expect(L.diagnostics).toBeUndefined();
    expect(computed(run('FLL-GAR-09-D1', { registers: { abdichtungslagen: L } }))).toBe(8);
    expect(computed(run('FLL-GAR-09-D2', { registers: { abdichtungslagen: L } }))).toBe(2);
    const sand = prep('FLL-GAR-09', 'abdichtungslagen', [{ ...rows[0], baugrund: 'SW' }]); // L5385: no protection layer needed
    expect([sand.rows[0].values.sand_min_cm, sand.rows[0].values.werkstoffe_tab26]).toEqual([null, null]);
    expect(run('FLL-GAR-09-D1', { registers: { abdichtungslagen: prep('FLL-GAR-09', 'abdichtungslagen', []) } }).kind).toBe('manual_required');
  });

  it('FLL-GAR-11-D1 / -12-D1 / -14-D1 / -16-D2 / -18-D1: the scalar lookups and text rules — 30 cm; w/z 0,60 / 0,70 at 40 / 40,1 cm; 16 / 32 mm at U 4,9 / 5; 1,2 / 1,0 mm; PEHD 0 / PELD 1', () => {
    expect(computed(run('FLL-GAR-11-D1', {}))).toBe(30);                                                                                  // L2240
    expect(eq('FLL-GAR-11-D1').input_symbols).toEqual([]);
    expect([40, 40.1].map((d) => computed(run('FLL-GAR-12-D1', { inputs: inp({ bauteildicke_cm: d }) })))).toEqual([0.6, 0.7]);            // L2437 / L2440
    expect([4.9, 5].map((u) => computed(run('FLL-GAR-14-D1', { inputs: inp({ ungleichfoermigkeit_u: u }) })))).toEqual([16, 32]);          // L3438
    expect(['nein', 'ja'].map((v) => computed(run('FLL-GAR-16-D2', { inputs: inp({ bahn_vorkonfektioniert: v }) })))).toEqual([1.2, 1.0]); // L4064–L4067
    expect(['PEHD', 'PELD'].map((v) => computed(run('FLL-GAR-18-D1', { inputs: inp({ pe_werkstoff: v }) })))).toEqual([0, 1]);             // L4511–L4515
  });

  it('FLL-GAR-18-D2: Tab. 24 — Dichte > 0,940 (strict), MFR 1,0…3,0, Rußgehalt 2…3', () => {
    const c = (d: number, m: number, r: number) => computed(run('FLL-GAR-18-D2', { inputs: inp({ peeh_dichte_g_cm3: d, peeh_mfr: m, peeh_russgehalt_pct: r }) }));
    expect(c(0.95, 2, 2.5)).toBe(1);
    expect(c(0.94, 2, 2.5)).toBe(0);   // L4471 "> 0,940" is strict
    expect(c(0.95, 3, 3)).toBe(1);     // inclusive bounds L4474 / L4476
    expect(c(0.95, 3.1, 2)).toBe(0);
    expect(c(0.95, 1, 1.9)).toBe(0);
    expect(run('FLL-GAR-18-D2', { inputs: inp({ peeh_dichte_g_cm3: 0.95 }) }).kind).toBe('manual_required');
  });

  it('FLL-GAR-16-D1 over naehte: Tab. 22 per row — Heißluft × EPDM 30 mm, Quellschweißen × PVC-P 30, EPDM mit PBS 40; a non-printed combination is undecidable', () => {
    const rows = [
      { id: '1', label: 'N1', fuegeverfahren: 'heissluft_heizkeil', material: 'EPDM', nahtbreite_ist_mm: 25 },   // L4125 / L4133 → 30
      { id: '2', label: 'N2', fuegeverfahren: 'quellschweissen', material: 'PVC-P', nahtbreite_ist_mm: 30 },     // L4112 / L4116 → 30
      { id: '3', label: 'N3', fuegeverfahren: 'heissluft_pbs', material: 'EPDM_PBS', nahtbreite_ist_mm: 45 },    // L4135 → 40
      { id: '4', label: 'N4', fuegeverfahren: 'heissvulkanisation', material: 'EPDM', nahtbreite_ist_mm: 19 },   // L4134 → 20
    ];
    const N = prep('FLL-GAR-16', 'naehte', rows);
    expect(N.rows.map((r) => [r.values.nahtbreite_min, r.values.ok, r.complete])).toEqual([[30, 0, true], [30, 1, true], [40, 1, true], [20, 0, true]]);
    expect(computed(run('FLL-GAR-16-D1', { registers: { naehte: N } }))).toBe(2);
    const odd = prep('FLL-GAR-16', 'naehte', [{ id: '1', label: 'N', fuegeverfahren: 'quellschweissen', material: 'ECB', nahtbreite_ist_mm: 30 }]);
    expect(odd.rows[0].values.nahtbreite_min).toBeNull();
    expect(run('FLL-GAR-16-D1', { registers: { naehte: odd } }).kind).toBe('manual_required');
  });

  it('FLL-GAR-23-D1 over randabschnitte: Tab. 28 cell per row — 20 cm Bauwerk (X), 7 cm Schwimmteich -¹, 12 cm Freifläche X; the empty row-0 cells are undecidable (fll_gar-U-4)', () => {
    const R = prep('FLL-GAR-23', 'randabschnitte', [
      { id: '1', label: 'Terrasse', anwendungsfall: 'bauteil_bauwerk', hoehe_cm: 20, randbefestigung: 'Randstein', kapillarsperre: true }, // L5744 (X)
      { id: '2', label: 'Einstieg', anwendungsfall: 'schwimmteich', hoehe_cm: 7 },                                                        // L5746 -¹
      { id: '3', label: 'Wiese', anwendungsfall: 'freiflaeche', hoehe_cm: 12 },                                                           // L5745 X
      { id: '4', label: 'Mauer', anwendungsfall: 'bauteil_bauwerk', hoehe_cm: 0 },                                                        // L5747 -¹
    ]);
    expect(R.rows.map((r) => [r.values.hoehe_band, r.values.zulaessig, r.complete])).toEqual([['ge15', 'x_bedingt', true], ['ge5', 'sonder', true], ['ge10', 'x', true], ['zero', 'sonder', true]]);
    expect(computed(run('FLL-GAR-23-D1', { registers: { randabschnitte: R } }))).toBe(2);
    const empty = prep('FLL-GAR-23', 'randabschnitte', [{ id: '1', label: 'x', anwendungsfall: 'freiflaeche', hoehe_cm: 0 }]);
    expect(empty.rows[0].values.zulaessig).toBeNull();
    expect(run('FLL-GAR-23-D1', { registers: { randabschnitte: empty } }).kind).toBe('manual_required');
  });

  it('FLL-GAR-24-D1 / -D2 over durchdringungen / pflanzenarten; FLL-GAR-27-D1 / -D2 over einzugsflaechen_not: the Anhang-1 example 800 m² × C 1 → Σ A 800, Σ A·C 800 (23,28 l/s with r5,100 607 / r5,5 316)', () => {
    const D = prep('FLL-GAR-24', 'durchdringungen', [{ id: '1', typ: 'Rohr' }, { id: '2', typ: 'Steg', rhizom_nachweis: true }]);
    expect(computed(run('FLL-GAR-24-D1', { registers: { durchdringungen: D } }))).toBe(2);
    const P = prep('FLL-GAR-24', 'pflanzenarten', [{ id: '1', art: 'Schilf', aggressiv: true }, { id: '2', art: 'Seerose' }, { id: '3', art: 'Rohrkolben', aggressiv: true }]);
    expect(computed(run('FLL-GAR-24-D2', { registers: { pflanzenarten: P } }))).toBe(2);
    const E = prep('FLL-GAR-27', 'einzugsflaechen_not', [{ id: '1', label: 'Teich', a_m2: 800, c: 1 }]); // L6479–L6485
    expect(E.rows[0].values.ac).toBe(800);
    const sumA = computed(run('FLL-GAR-27-D1', { registers: { einzugsflaechen_not: E } }));
    const sumAC = computed(run('FLL-GAR-27-D2', { registers: { einzugsflaechen_not: E } }));
    expect([sumA, sumAC]).toEqual([800, 800]);
    expect((607 * sumA - 316 * sumAC) / 10000).toBeCloseTo(23.28, 2); // the printed result L6485 in the summed form (fll_gar-R-1)
    const two = prep('FLL-GAR-27', 'einzugsflaechen_not', [{ id: '1', label: 'Dach', a_m2: 500, c: 1 }, { id: '2', label: 'Rasen', a_m2: 300, c: 0.3 }]);
    expect([computed(run('FLL-GAR-27-D1', { registers: { einzugsflaechen_not: two } })), computed(run('FLL-GAR-27-D2', { registers: { einzugsflaechen_not: two } }))]).toEqual([800, 590]);
  });
});
