/**
 * Plan 3 Task 12 — DWA-M-187 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * through the real `evaluateFormula` over rows prepared by the register contract
 * (TS fallback tables, no migration applied), pinned to the figures the standard
 * prints: EBCT 15 min · 5,0 m/h = 1,25 m (L497), Bild 3 10 + 60 + 30 cm = 1,00 m
 * and 25 cm Dränagekies (L614–L617), A_F = 1,0 % A_b,a = 100 m²/ha (L964),
 * 750 m²/ha · A_E,b (L792), 90 % = 1,0 Log-Stufe (L667), h_FK 0,25 / 0,2 m
 * (L926 / L930). The Merkblatt prints no further worked example.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/m187';
import { FIELD_CONFIGS } from '../field-configs/m187';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DWA-M-187';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const scope = (ws: Record<string, Value>) => (s: string): Value | undefined => (s in ws ? ws[s] : undefined);
const prep = (ws: string, sym: string, rows: unknown[], symbols: Record<string, Value> = {}) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol: scope(symbols) });
type Input = { symbol: string; value: number | string | null; unit: string | null };
const run = (n: string, opts: { inputs?: Input[]; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const num = (s: string, v: number | string | null, unit: string | null = null): Input => ({ symbol: s, value: v, unit });

describe('DWA-M-187 Plan-3 equations', () => {
  it('twenty-five entries, every output has a created derived field, every formula parses; single-source (no prod output re-produced); emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual([
      'M187-09-D1', 'M187-09-D2', 'M187-09-D3', 'M187-13-D1', 'M187-13-D2', 'M187-13-D3', 'M187-14-D1', 'M187-14-D2', 'M187-14-D3', 'M187-14-D4',
      'M187-16-D1', 'M187-16-D2', 'M187-20-D1', 'M187-20-D2', 'M187-20-D3', 'M187-20-D4', 'M187-20-D5', 'M187-20-D6',
      'M187-22-D1', 'M187-22-D2', 'M187-22-D3', 'M187-22-D4', 'M187-22-D5', 'M187-22-D7', 'M187-22-D6',
    ]);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create && f.widget === 'derived').map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    for (const e of EQUATIONS) expect(['A_F', 'ok_boolean', 'h_FK', 'q_Dr_RBF', 'h_FK_SS', 'B_CSB', 'A_F_pro_AEb', 'A_F_anteil_Aba', 'logstufen_rueckhalt', 'anzahl_teilfilter', 'anzahl_sorptionsstufen']).not.toContain(e.output_symbol);
    expect(() => emitEquationsSql('m187', EQUATIONS)).not.toThrow();
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('m187', EQUATIONS);
    const files = equationFilesFor('m187', '20260917101220');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(25);
  });

  it('M187-09-D1: EBCT 15 min · 5,0 m/h / 60 = 1,25 m ("Das entspricht einer Mindesthöhe des Filterkörpers von 1,25 m", L497); sorptionsstufen rows compute h_FK,SS and the EBCT / v badges; count 3, min EBCT 10', () => {
    expect(computed(run('M187-09-D1', { inputs: [num('EBCT', 15, 'min'), num('v_filter_aufstrom', 5.0, 'm/h')] }))).toBeCloseTo(1.25, 12);
    expect(run('M187-09-D1', { inputs: [num('EBCT', 15, 'min')] }).kind).toBe('manual_required');
    // L497 prints "< 5,0 m/h" and derives 1,25 m from 15 min · 5,0 m/h — the bound itself: the row badge keeps the printed strict "<" (m187-J-6)
    const reg = prep('M187-09', 'sorptionsstufen', [
      { id: '1', stufe: 1, ebct_min: 15, v_filter_auf: 5.0, v_filter_ab: 1.5 }, // h_FK,SS 1,25 m; v = 5,0 is not < 5,0 → badge 0
      { id: '2', stufe: 2, ebct_min: 20, v_filter_auf: 4.5 },                  // 1,5 m; both badges 1
      { id: '3', stufe: 3, ebct_min: 10, v_filter_auf: 6.0 },                  // EBCT < 15 and v ≥ 5,0 → both 0
    ]);
    expect(reg.rows.map((r) => [r.complete, r.values.h_fk_ss, r.values.ebct_ok, r.values.v_ok])).toEqual([[true, 1.25, 1, 0], [true, 1.5, 1, 1], [true, 1, 0, 0]]);
    expect(computed(run('M187-09-D2', { registers: { sorptionsstufen: reg } }))).toBe(3);
    expect(computed(run('M187-09-D3', { registers: { sorptionsstufen: reg } }))).toBe(10);
    expect(computed(run('M187-09-D2', { registers: { sorptionsstufen: prep('M187-09', 'sorptionsstufen', []) } }))).toBe(0);
  });

  it('M187-13-D1/-D2/-D3: the printed Bild-3 stack (10 / 60 / 30 / 25 cm) sums to h_FK = 1,00 m ("Filterschichtstärke von 1 m", L601) and h_Drän = 0,25 m; the BILD3 fills per layer; a GAK share outside the band counts', () => {
    const reg = prep('M187-13', 'filterschichten', [
      { id: '1', lage: '1', dicke_ist_cm: 10, gak_vol_pct: 15, caco3_pct: 20 },
      { id: '2', lage: '2', dicke_ist_cm: 60, caco3_pct: 20 },
      { id: '3', lage: '3', dicke_ist_cm: 30, gak_vol_pct: 35, caco3_pct: 20 },
      { id: '4', lage: '4', dicke_ist_cm: 25 },
    ]);
    expect(reg.rows.every((r) => r.complete)).toBe(true);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows.map((r) => [r.values.material, r.values.dicke_soll_cm, r.values.gak_min, r.values.gak_max, r.values.caco3_soll_pct, r.values.filterwirksam, r.values.gak_ok])).toEqual([
      ['Filtersand / Meliorationsschicht', 10, 10, 20, 20, true, 1],
      ['Filtersand', 60, null, null, 20, true, 1],
      ['Filtersand', 30, 30, 40, 20, true, 1],
      ['Dränagekies', 25, null, null, null, false, 1],
    ]);
    expect(computed(run('M187-13-D1', { registers: { filterschichten: reg } }))).toBeCloseTo(1.0, 12);
    expect(computed(run('M187-13-D2', { registers: { filterschichten: reg } }))).toBeCloseTo(0.25, 12);
    expect(computed(run('M187-13-D3', { registers: { filterschichten: reg } }))).toBe(0);
    // GAK 25 % in the top layer (band 10–20 %) → one violation; a thicker stack sums accordingly
    const off = prep('M187-13', 'filterschichten', [{ id: '1', lage: '1', dicke_ist_cm: 15, gak_vol_pct: 25 }, { id: '2', lage: '2', dicke_ist_cm: 70 }, { id: '3', lage: '3', dicke_ist_cm: 30, gak_vol_pct: 30 }]);
    expect(off.rows.map((r) => r.values.gak_ok)).toEqual([0, 1, 1]);
    expect(computed(run('M187-13-D3', { registers: { filterschichten: off } }))).toBe(1);
    expect(computed(run('M187-13-D1', { registers: { filterschichten: off } }))).toBeCloseTo(1.15, 12);
    expect(run('M187-13-D1', { registers: { filterschichten: prep('M187-13', 'filterschichten', []) } }).kind).toBe('manual_required');
  });

  it('M187-14-D1…-D4: Q_T,d,aM = 5 l/s → 432 m³/d per segment; three segments of 400 / 432 / 500 m³ → one under-sized; Σ A_F', () => {
    expect(computed(run('M187-14-D1', { inputs: [num('Q_T_d_aM', 5, 'l/s')] }))).toBeCloseTo(432, 12);
    const reg = prep('M187-14', 'filtersegmente', [
      { id: '1', label: 'Segment 1', flaeche_m2: 1600, retentionsvolumen_m3: 400, beschickungstag: 'Tag 1' },
      { id: '2', label: 'Segment 2', flaeche_m2: 1700, retentionsvolumen_m3: 432, beschickungstag: 'Tag 2' },
      { id: '3', label: 'Segment 3', flaeche_m2: 1700, retentionsvolumen_m3: 500, beschickungstag: 'Tag 3' },
    ], { Q_T_d_aM: 5 });
    expect(reg.rows.map((r) => [r.complete, r.values.v_soll_m3, r.values.v_ok])).toEqual([[true, 432, 0], [true, 432, 1], [true, 432, 1]]);
    expect(computed(run('M187-14-D2', { registers: { filtersegmente: reg } }))).toBe(3);
    expect(computed(run('M187-14-D3', { registers: { filtersegmente: reg } }))).toBe(1);
    expect(computed(run('M187-14-D4', { registers: { filtersegmente: reg } }))).toBe(5000);
    // without Q_T_d_aM in scope the per-row Soll is null and the count is undecidable (never a silent 0)
    const noQ = prep('M187-14', 'filtersegmente', [{ id: '1', label: 'S1', flaeche_m2: 100, retentionsvolumen_m3: 400 }]);
    expect(noQ.rows[0].values.v_soll_m3).toBeNull();
    expect(run('M187-14-D3', { registers: { filtersegmente: noQ } }).kind).toBe('manual_required');
  });

  it('M187-16-D1/-D2: 10⁶ → 10⁵ KBE/100 ml = 1,0 Log-Stufe (= 90 %, L667); min over the organisms with Ablauf > 0; the > 1,0 badge', () => {
    const reg = prep('M187-16', 'indikatororganismen', [
      { id: '1', organismus: 'e_coli', einheit: 'kbe', zulauf: 1e6, ablauf: 1e5 },
      { id: '2', organismus: 'enterokokken', einheit: 'mpn', zulauf: 1e5, ablauf: 1e3 },
      { id: '3', organismus: 'coliphagen', einheit: 'pbe', zulauf: 1e4, ablauf: 0 },
    ]);
    expect(reg.rows.map((r) => [r.complete, r.values.log_red, r.values.ok])).toEqual([[true, 1, 0], [true, 2, 1], [true, null, null]]);
    expect(computed(run('M187-16-D1', { registers: { indikatororganismen: reg } }))).toBe(1);
    expect(computed(run('M187-16-D2', { registers: { indikatororganismen: reg } }))).toBe(3);
  });

  it('M187-20-D1…-D6: four Teilfilterbecken of 500 m², three in operation → 2000 / 1500 m², count 4, rest 0 (a fifth → rest 1); 750 m²/ha · 2 ha = 1500 m²; 20 kg CSB/d over 2000 m² = 10 g/(m²·d); per-row 6 l/(m²·min) and 20 l/m²', () => {
    const rows = [
      { id: '1', label: 'TF 1', flaeche_m2: 500, in_betrieb: true },
      { id: '2', label: 'TF 2', flaeche_m2: 500, in_betrieb: true },
      { id: '3', label: 'TF 3', flaeche_m2: 500, in_betrieb: true },
      { id: '4', label: 'TF 4', flaeche_m2: 500, in_betrieb: false },
    ];
    const reg = prep('M187-20', 'teilfilterbecken', rows);
    expect(reg.rows.map((r) => [r.complete, r.values.foerder_min_l_min, r.values.beschickung_soll_l])).toEqual([[true, 3000, 10000], [true, 3000, 10000], [true, 3000, 10000], [true, 3000, 10000]]);
    expect(computed(run('M187-20-D1', { registers: { teilfilterbecken: reg } }))).toBe(2000);
    expect(computed(run('M187-20-D2', { registers: { teilfilterbecken: reg } }))).toBe(1500);
    expect(computed(run('M187-20-D3', { registers: { teilfilterbecken: reg } }))).toBe(4);
    expect(computed(run('M187-20-D6', { inputs: [num('teilfilter_count', 4)] }))).toBe(0);
    expect(computed(run('M187-20-D6', { inputs: [num('teilfilter_count', 5)] }))).toBe(1);
    expect(computed(run('M187-20-D6', { inputs: [num('teilfilter_count', 8)] }))).toBe(0);
    expect(computed(run('M187-20-D4', { inputs: [num('A_E_b', 2, 'ha')] }))).toBe(1500);
    expect(computed(run('M187-20-D5', { inputs: [num('CSB_fracht_d', 20000, 'g/d'), num('A_F_gesamt', 2000, 'm²')] }))).toBe(10);
    expect(run('M187-20-D5', { inputs: [num('CSB_fracht_d', 20000, 'g/d'), num('A_F_gesamt', 0, 'm²')] }).kind).toBe('manual_required'); // division by zero, never 0
    expect(computed(run('M187-20-D3', { registers: { teilfilterbecken: prep('M187-20', 'teilfilterbecken', []) } }))).toBe(0);
    // fix round 1: a basin with in_betrieb left blank is complete (optional boolean → false) and does not count as active
    const blank = prep('M187-20', 'teilfilterbecken', [{ id: '1', label: 'TF 1', flaeche_m2: 500, in_betrieb: true }, { id: '2', label: 'TF 2', flaeche_m2: 500 }]);
    expect(blank.rows.map((r) => r.complete)).toEqual([true, true]);
    expect(computed(run('M187-20-D1', { registers: { teilfilterbecken: blank } }))).toBe(1000);
    expect(computed(run('M187-20-D2', { registers: { teilfilterbecken: blank } }))).toBe(500);
  });

  it('M187-22-D1…-D6: three elements (A_b,a 5000 / 3000 / 2000 m², A_F 50 / 30 / 0,8 m²) → Σ 10 000 / 80,8 m², 0,808 % (1,0 % = 100 m²/ha, L964), one element under 1,0 m²; h_FK_min_klein 0,25 m without and 0,2 m with the carbonate layer (L926 / L930)', () => {
    const reg = prep('M187-22', 'klein_rbf_elemente', [
      { id: '1', label: 'E1', a_b_a_m2: 5000, a_f_m2: 50, h_rr: 0.2, h_rbf: 0.6 },
      { id: '2', label: 'E2', a_b_a_m2: 3000, a_f_m2: 30 },
      { id: '3', label: 'E3', a_b_a_m2: 2000, a_f_m2: 0.8 },
    ]);
    expect(reg.rows.map((r) => [r.complete, r.values.anteil_pct, r.values.a_f_ok])).toEqual([[true, 1, 1], [true, 1, 1], [true, 0.04, 0]]);
    expect(computed(run('M187-22-D1', { registers: { klein_rbf_elemente: reg } }))).toBeCloseTo(80.8, 12);
    expect(computed(run('M187-22-D2', { registers: { klein_rbf_elemente: reg } }))).toBe(10000);
    expect(computed(run('M187-22-D3', { registers: { klein_rbf_elemente: reg } }))).toBe(1);
    expect(computed(run('M187-22-D6', { registers: { klein_rbf_elemente: reg } }))).toBe(3);
    expect(computed(run('M187-22-D4', { inputs: [num('A_F_sum_klein', 80.8, 'm²'), num('A_b_a_sum_klein', 10000, 'm²')] }))).toBeCloseTo(0.808, 12);
    expect(computed(run('M187-22-D4', { inputs: [num('A_F_sum_klein', 100, 'm²'), num('A_b_a_sum_klein', 10000, 'm²')] }))).toBeCloseTo(1.0, 12); // 100 m² per ha
    expect(computed(run('M187-22-D5', { inputs: [num('carbonatschicht_vorhanden', 'nein')] }))).toBe(0.25);
    expect(computed(run('M187-22-D5', { inputs: [num('carbonatschicht_vorhanden', 'ja')] }))).toBe(0.2);
    expect(run('M187-22-D5', { inputs: [] }).kind).toBe('manual_required');
    // fix round 1 (m187-G-12): the carbonate proof — h_FK,CaCO3 ≥ 0,10 m AND 80 % CaCO3 (L930); the AND form was NOT folded into D5 because
    // evaluateFormula requires every named input before evaluating (a plain Klein-RBF with empty carbonate fields would become undecidable)
    expect(computed(run('M187-22-D7', { inputs: [num('h_FK_CaCO3', 0.1, 'm'), num('CaCO3_massenanteil_carbo', 80, '%')] }))).toBe(1);
    expect(computed(run('M187-22-D7', { inputs: [num('h_FK_CaCO3', 0.05, 'm'), num('CaCO3_massenanteil_carbo', 80, '%')] }))).toBe(0);
    expect(computed(run('M187-22-D7', { inputs: [num('h_FK_CaCO3', 0.1, 'm'), num('CaCO3_massenanteil_carbo', 20, '%')] }))).toBe(0);
    expect(run('M187-22-D7', { inputs: [] })).toMatchObject({ kind: 'manual_required', missing: ['h_FK_CaCO3', 'CaCO3_massenanteil_carbo'] });
    // the probed alternative: folding the proof into D5 makes the nominal 'nein' case undecidable
    const folded = evaluateFormula({ equationId: 'probe', formula: "h = if(carbonatschicht_vorhanden == 'ja' AND h_FK_CaCO3 >= 0.10 AND CaCO3_massenanteil_carbo == 80, 0.2, 0.25)", inputSymbols: ['carbonatschicht_vorhanden', 'h_FK_CaCO3', 'CaCO3_massenanteil_carbo'], outputSymbol: 'h', inputs: [num('carbonatschicht_vorhanden', 'nein')], tableLookup: table });
    expect(folded).toMatchObject({ kind: 'manual_required', missing: ['h_FK_CaCO3', 'CaCO3_massenanteil_carbo'] });
    // prod Gl. 1 on M187-22 (A_F = 0.01 · A_b_a · 10000, A_b_a in ha) gives the same 1,0 %: 0,5 ha → 50 m²
    expect(0.01 * 0.5 * 10000).toBe(50);
  });
});
