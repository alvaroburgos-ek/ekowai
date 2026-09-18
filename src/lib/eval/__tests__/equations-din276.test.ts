/**
 * Plan 3 Task 13 — DIN-276 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * through the real `evaluateFormula` over rows prepared by the register contract
 * (TS fallback tables, no migration applied). The standard prints no worked
 * example — the pins are the printed definitions applied to fixtures: Σ KG
 * 100–800 (§3.11), KG 300 + 400 (§3.12), Kosten / Bezugseinheit (§3.13), current
 * vs previous determination (§4.4.2), the current cost status offer / order /
 * invoice (§4.3.6), Σ of special-cost kinds (§4.2.10–4.2.14).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/din276';
import { FIELD_CONFIGS, KG_WORKSHEETS, kgRegisterSymbol } from '../field-configs/din276';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DIN-276';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const prep = (ws: string, sym: string, rows: unknown[]) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows });
type Input = { symbol: string; value: number | string | null; unit: string | null };
const run = (n: string, opts: { inputs?: Input[]; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };
const num = (s: string, v: number | string | null, unit: string | null = null): Input => ({ symbol: s, value: v, unit });

describe('DIN-276 Plan-3 equations', () => {
  it('115 entries (2 + 1 + 6 + 84 + 11 + 5 + 4 + 2), every output has a created derived field on its worksheet, every formula parses; single-source (no prod output re-produced); emitter accepts them', () => {
    expect(EQUATIONS).toHaveLength(115);
    const perWs = (ws: string) => EQUATIONS.filter((e) => e.worksheet === ws).length;
    expect(['DIN-276-04', 'DIN-276-07', 'DIN-276-08', 'DIN-276-18', 'DIN-276-21', 'DIN-276-24', 'DIN-276-27'].map(perWs)).toEqual([2, 1, 6, 11, 5, 4, 2]);
    expect(KG_WORKSHEETS.map((k) => perWs(k.ws))).toEqual([7, 9, 13, 13, 13, 9, 11, 9]); // 4 + the printed second-level KGs
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create && f.widget === 'derived').map((f) => `${f.worksheet} ${f.symbol}`));
    expect(created.size).toBe(115);
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.output_symbol} field`).toBe(true);
      expect(e.equation_number).toBe(`${e.worksheet}-D${e.equation_number.split('-D')[1]}`);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
    }
    expect(new Set(EQUATIONS.map((e) => e.equation_number)).size).toBe(115);
    const prodOutputs = ['GK_total', 'building_costs', 'cost_parameter', 'deviation_amount', 'kg_300_total', 'kg_310_total', 'KR_gesamt', 'current_stage_total', 'deviation_percentage', 'grundstuecksflaeche_GF', 'existing_substance_value', 'GK_kennwert_BGF', 'KKW_analyse_kg300_anteil', 'KA_angebote_eingegangen'];
    for (const e of EQUATIONS) expect(prodOutputs).not.toContain(e.output_symbol);
    expect(() => emitEquationsSql('din276', EQUATIONS)).not.toThrow();
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('din276', EQUATIONS);
    const files = equationFilesFor('din276', '20260917101320');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(115);
  });

  it('KG 300 register (DIN-276-11): Tab.-3 / Tab.-4 / Tab.-2 units per row, Kosten = Menge × Kennwert (§3.13) checked per row, rows of other KGs excluded; Σ 4500, count 5, fremd 2, abweichend 1; KG 310 Σ 4250, KG 320 Σ 150, KG 330 Σ 0; empty register → 0 / 0', () => {
    const reg = prep('DIN-276-11', 'kg3_positionen', [
      { id: 'a', kg: 'kg_311', menge: 100, kennwert: 12.5, kosten_eur: 1250 }, // Tab. 3: m³; 100 · 12,5 = 1250 ✓
      { id: 'b', kg: 'kg_312', kosten_eur: 3000 },                              // no Menge / Kennwert → not checked
      { id: 'c', kg: 'kg_320', menge: 10, kennwert: 10, kosten_eur: 150 },      // second level picked directly; 150 ≠ 100 → abweichend
      { id: 'd', kg: 'kg_300', kosten_eur: 99 },                                // first level → Tab. 2 unit; counted in the KG Σ, in no second-level Σ
      { id: 'e', kg: 'kg_411', tab4_nr: '1', kosten_eur: 5 },                   // KG 400 row on the KG 300 worksheet → fremd (Tab.-4 item unit m)
      { id: 'f', kg: 'kg_121', kosten_eur: 7 },                                 // KG 100 row → fremd; no unit row anywhere → blank
      { id: 'g', kg: 'kg_340', kosten_eur: 1 },                                 // din276-U-1: blank unit cell (Tab. 3 makes a specification — no Tab.-2 fallback)
      { id: 'h', kg: 'kg_490', kosten_eur: 1 },                                 // KG 400 head row WITH a printed Tab.-4 unit (m² GFA)
      { id: 'i', kg: 'kg_890', kosten_eur: 1 },                                 // no Tab.-3 / 4 row → Tab. 2 of the ancestor (KG 800: m² GFA)
      { id: 'j', kg: 'kg_121', menge: 3, kennwert: 0.1, kosten_eur: 0.3 },      // 3 × 0,1 = 0,30 to the cent → ok
    ]);
    expect(reg.diagnostics).toBeUndefined();
    expect(reg.rows.map((r) => [r.complete, r.values.bezeichnung, r.values.einheit, r.values.kosten_calc, r.values.abw, r.values.ebene1, r.values.ebene2, r.values.im_kg])).toEqual([
      [true, 'Manufacture', 'm³', 1250, 0, 'KG 300', 'KG 310', 1],
      [true, 'Enclosure', 'm²', null, 0, 'KG 300', 'KG 310', 1],
      [true, 'Foundation, substructure', 'm²', 100, 1, 'KG 300', 'KG 320', 1],
      [true, 'Building - Building constructions', 'm²', null, 0, 'KG 300', '-', 1],
      [true, 'Sewage systems', 'm', null, 0, 'KG 400', 'KG 410', 0],
      [true, 'Surveying fees', 'm²', null, 0, 'KG 100', 'KG 120', 0], // L1022: KG 121 has no Tab.-3 / 4 row → Table 2 of KG 100 (Plot area, m²)
      [true, 'Interior walls/vertical building structures, interior', null, null, 0, 'KG 300', 'KG 340', 1],
      [true, 'Other measures for technical installations', 'm²', null, 0, 'KG 400', 'KG 490', 0],
      [true, 'Other financing costs', 'm²', null, 0, 'KG 800', 'KG 890', 0],
      [true, 'Surveying fees', 'm²', 0.30000000000000004, 0, 'KG 100', 'KG 120', 0],
    ]);
    expect(reg.rows.find((r) => r.id === 'e')!.values.tab4_kg_einheit).toBeNull(); // 411 head row prints no unit — Tab. 4 makes no KG-level specification → Tab. 2 would apply for kg_411 itself
    expect(reg.rows.find((r) => r.id === 'h')!.values.tab4_kg_einheit).toBe('m²');
    expect(reg.rows[0].values.hinweis).toContain('Soil removal, soil securing and soil application');
    const R = { kg3_positionen: reg };
    expect(computed(run('DIN-276-11-D1', { registers: R }))).toBe(4500);
    expect(computed(run('DIN-276-11-D2', { registers: R }))).toBe(5);
    expect(computed(run('DIN-276-11-D3', { registers: R }))).toBe(5); // e, f, h, i, j are foreign KGs on the KG 300 worksheet
    expect(computed(run('DIN-276-11-D4', { registers: R }))).toBe(1);
    expect(eq('DIN-276-11-D5').output_symbol).toBe('kg_310_from_rows');
    expect(computed(run('DIN-276-11-D5', { registers: R }))).toBe(4250);
    expect(eq('DIN-276-11-D6').output_symbol).toBe('kg_320_from_rows');
    expect(computed(run('DIN-276-11-D6', { registers: R }))).toBe(150);
    expect(eq('DIN-276-11-D7').output_symbol).toBe('kg_330_from_rows');
    expect(computed(run('DIN-276-11-D7', { registers: R }))).toBe(0); // no row → 0 (guarded; an unguarded Σ would be manual_required)
    expect(eq('DIN-276-11-D13').output_symbol).toBe('kg_390_from_rows');
    const empty = { kg3_positionen: prep('DIN-276-11', 'kg3_positionen', []) };
    expect(computed(run('DIN-276-11-D1', { registers: empty }))).toBe(0);
    expect(computed(run('DIN-276-11-D2', { registers: empty }))).toBe(0);
    // KG 100 worksheet: kg_110 has no children in Table 1 — its Σ twin still exists (D5) and includes a row picked at kg_110
    const reg1 = prep('DIN-276-09', kgRegisterSymbol(1), [{ id: '1', kg: 'kg_110', kosten_eur: 500000 }, { id: '2', kg: 'kg_121', kosten_eur: 2000 }]);
    expect(eq('DIN-276-09-D5').output_symbol).toBe('kg_110_from_rows');
    expect(computed(run('DIN-276-09-D5', { registers: { kg1_positionen: reg1 } }))).toBe(500000);
    expect(computed(run('DIN-276-09-D6', { registers: { kg1_positionen: reg1 } }))).toBe(2000); // kg_120_from_rows
    expect(computed(run('DIN-276-09-D1', { registers: { kg1_positionen: reg1 } }))).toBe(502000);
  });

  it('stage × KG matrix (DIN-276-18): Σ KG 100–800 = 2050 / 2230 per stage (§3.11), Bauwerk 1400 / 1550 (§3.12), a row with a blank KG is incomplete; KF without a row → 0; aktuell 2230, vorher 2050, Abweichung 180 = 8,78 %; one row → vorher manual_required (never 0)', () => {
    const rows = [
      { id: '1', stufe: 'kr', datum: '2026-01-10', kg100: 100, kg200: 50, kg300: 1000, kg400: 400, kg500: 200, kg600: 30, kg700: 250, kg800: 20 },
      { id: '2', stufe: 'ksch', datum: '2026-03-01', kg100: 100, kg200: 60, kg300: 1100, kg400: 450, kg500: 210, kg600: 30, kg700: 260, kg800: 20, eigenleistung_eur: 15 },
      { id: '3', stufe: 'kber', datum: '2026-05-01', kg100: 100, kg200: 60, kg300: 1200, kg400: 500, kg500: 220, kg600: 30, kg700: 270 }, // kg800 blank → incomplete
    ];
    const reg = prep('DIN-276-18', 'kostenstufen_matrix', rows);
    expect(reg.rows.map((r) => [r.complete, r.values.gesamt, r.values.bauwerk])).toEqual([[true, 2050, 1400], [true, 2230, 1550], [false, null, 1700]]);
    const R = { kostenstufen_matrix: reg };
    expect(computed(run('DIN-276-18-D1', { registers: R }))).toBe(2050);  // KR
    expect(computed(run('DIN-276-18-D2', { registers: R }))).toBe(2230);  // KSch
    expect(computed(run('DIN-276-18-D3', { registers: R }))).toBe(0);     // KBer row incomplete → not counted
    expect(computed(run('DIN-276-18-D5', { registers: R }))).toBe(0);     // KF: no row
    expect(computed(run('DIN-276-18-D6', { registers: R }))).toBe(2);
    expect(computed(run('DIN-276-18-D7', { registers: R }))).toBe(2230);
    expect(computed(run('DIN-276-18-D8', { registers: R }))).toBe(2050);
    expect(computed(run('DIN-276-18-D11', { registers: R }))).toBe(1550);
    expect(computed(run('DIN-276-18-D9', { inputs: [num('stufe_aktuell_gesamt', 2230, 'EUR'), num('stufe_vorher_gesamt', 2050, 'EUR')] }))).toBe(180);
    expect(computed(run('DIN-276-18-D10', { inputs: [num('stufen_abweichung', 180, 'EUR'), num('stufe_vorher_gesamt', 2050, 'EUR')] }))).toBeCloseTo(8.78048780487805, 10);
    const one = { kostenstufen_matrix: prep('DIN-276-18', 'kostenstufen_matrix', [rows[0]]) };
    expect(computed(run('DIN-276-18-D7', { registers: one }))).toBe(2050);
    expect(run('DIN-276-18-D8', { registers: one }).kind).toBe('manual_required'); // the unguarded "Σ last 2 − Σ last 1" would read 0 here
    expect(run('DIN-276-18-D7', { registers: { kostenstufen_matrix: prep('DIN-276-18', 'kostenstufen_matrix', []) } }).kind).toBe('manual_required');
  });

  it('Sonderkosten (DIN-276-08): Σ per kind (§4.2.10–4.2.14) — prognose 125, bausubstanz 0 without a row, nicht separat 2 (blank boolean counts as not separately shown)', () => {
    const reg = prep('DIN-276-08', 'sonderkosten', [{ id: '1', art: 'prognose', betrag: 100, separat_ausgewiesen: true }, { id: '2', art: 'risiko', betrag: 50 }, { id: '3', art: 'prognose', betrag: 25, separat_ausgewiesen: false }]);
    const R = { sonderkosten: reg };
    expect(eq('DIN-276-08-D4').output_symbol).toBe('sonderkosten_prognose_sum');
    expect(computed(run('DIN-276-08-D4', { registers: R }))).toBe(125);
    expect(computed(run('DIN-276-08-D5', { registers: R }))).toBe(50);
    expect(computed(run('DIN-276-08-D1', { registers: R }))).toBe(0);
    expect(computed(run('DIN-276-08-D6', { registers: R }))).toBe(2);
    expect(computed(run('DIN-276-08-D1', { registers: { sonderkosten: prep('DIN-276-08', 'sonderkosten', []) } }))).toBe(0);
  });

  it('Vergabeeinheiten (DIN-276-21): the amount at the current cost status per row (§4.3.6 offer / order / invoice) sums to 1770; counts 1 / 1 / 1; total 3', () => {
    const reg = prep('DIN-276-21', 'vergabeeinheiten', [
      { id: '1', label: 'Rohbau', kg: 'kg_300', angebot_eur: 1000, auftrag_eur: 950, status: 'auftrag' },
      { id: '2', label: 'TGA', angebot_eur: 500, status: 'angebot' },
      { id: '3', label: 'Dach', angebot_eur: 300, auftrag_eur: 310, rechnung_eur: 320, status: 'rechnung' },
    ]);
    expect(reg.rows.map((r) => [r.complete, r.values.aktuell, r.values.bezeichnung])).toEqual([[true, 950, 'Building - Building constructions'], [true, 500, null], [true, 320, null]]);
    const R = { vergabeeinheiten: reg };
    expect(computed(run('DIN-276-21-D1', { registers: R }))).toBe(1770);
    expect(computed(run('DIN-276-21-D2', { registers: R }))).toBe(3);
    expect(computed(run('DIN-276-21-D3', { registers: R }))).toBe(1);
    expect(computed(run('DIN-276-21-D4', { registers: R }))).toBe(1);
    expect(computed(run('DIN-276-21-D5', { registers: R }))).toBe(1);
  });

  it('Flurstücke (DIN-276-04) Σ GF 1234,5 m² / 2 rows; Abweichungen (DIN-276-27) Σ / count; Kennwert-Quellen count; Kennwerte (DIN-276-24): 1550 / 1000 m² = 1,55 EUR/m², 1550 / 4000 m³ = 0,3875, GK 2230 / 1000 = 2,23, KG 300 share 1200 / 2230 = 53,81 %; missing GK_total → manual_required', () => {
    const fl = prep('DIN-276-04', 'flurstuecke', [{ id: '1', gemarkung: 'Hullern', flur: '3', flurstueck: '12/4', flaeche_m2: 1000 }, { id: '2', flurstueck: '12/5', flaeche_m2: 234.5 }]);
    expect(computed(run('DIN-276-04-D1', { registers: { flurstuecke: fl } }))).toBe(1234.5);
    expect(computed(run('DIN-276-04-D2', { registers: { flurstuecke: fl } }))).toBe(2);
    const ab = prep('DIN-276-27', 'abweichungen', [{ id: '1', kg: 'kg_300', betrag: 120, pct: 10, ursache: 'Planungsänderung Fassade' }, { id: '2', kg: 'kg_400', betrag: -20, ursache: 'Angebot unter Kostenberechnung' }]);
    expect(computed(run('DIN-276-27-D1', { registers: { abweichungen: ab } }))).toBe(100);
    expect(computed(run('DIN-276-27-D2', { registers: { abweichungen: ab } }))).toBe(2);
    expect(computed(run('DIN-276-07-D1', { registers: { kennwert_quellen: prep('DIN-276-07', 'kennwert_quellen', [{ id: '1', quelle: 'BKI', kg: 'kg_300' }]) } }))).toBe(1);
    expect(computed(run('DIN-276-24-D1', { inputs: [num('building_costs', 1550, 'EUR'), num('gross_floor_area_BGF', 1000, 'm²')] }))).toBeCloseTo(1.55, 12);
    expect(computed(run('DIN-276-24-D2', { inputs: [num('building_costs', 1550, 'EUR'), num('gross_volume_BRI', 4000, 'm³')] }))).toBeCloseTo(0.3875, 12);
    expect(computed(run('DIN-276-24-D3', { inputs: [num('GK_total', 2230, 'EUR'), num('gross_floor_area_BGF', 1000, 'm²')] }))).toBeCloseTo(2.23, 12);
    expect(computed(run('DIN-276-24-D4', { inputs: [num('kg_300_total', 1200, 'EUR'), num('GK_total', 2230, 'EUR')] }))).toBeCloseTo(53.81165919282511, 10);
    expect(run('DIN-276-24-D3', { inputs: [num('gross_floor_area_BGF', 1000, 'm²')] })).toMatchObject({ kind: 'manual_required', missing: ['GK_total'] }); // until din276-C-5
    expect(run('DIN-276-24-D1', { inputs: [num('building_costs', 1550, 'EUR'), num('gross_floor_area_BGF', 0, 'm²')] }).kind).toBe('manual_required'); // division by zero
  });
});
