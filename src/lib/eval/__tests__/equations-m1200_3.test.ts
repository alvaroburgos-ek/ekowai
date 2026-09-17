/**
 * Plan 3 Task 6 — DWA-M-1200-3 derived-value equations: the emitter accepts every
 * entry, the committed migration equals a fresh emit, and each formula computes
 * the printed rule through the real `evaluateFormula` over rows prepared by the
 * register contract (Tab. 3 / 6 / 7-8-9 / 11 / 13 / 14 cells looked up from the
 * seeded tables — the TS fallback, no migration applied). Enum cells and enum
 * scalars reach the formulas as strings (controller amendment D).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EQUATIONS } from '../equations/m1200_3';
import { FIELD_CONFIGS } from '../field-configs/m1200_3';
import { evaluateFormula, type EvalState } from '../formula';
import { prepareRegisterRows } from '../register-rows';
import { parseFieldConfig, type RegisterUiConfig } from '../field-config';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';
import { parseNumeric, type Value } from '@/lib/expr';
import { emitEquationsSql, equationFilesFor } from '../../../../scripts/regulation-tables/emit-equations-sql';

const ROOT = join(__dirname, '..', '..', '..', '..');
const STD = 'DWA-M-1200-3';
const table = makeTableLookup(STD);
const tableRows = makeTableRows(STD);
const eq = (n: string) => EQUATIONS.find((e) => e.equation_number === n)!;
const rhs = (n: string) => eq(n).formula.replace(/^[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
const cfg = (ws: string, sym: string) => parseFieldConfig({ widget: 'register', uiConfig: FIELD_CONFIGS.find((f) => f.worksheet === ws && f.symbol === sym)!.ui_config, lookup: null, visibleWhen: null }).ui as RegisterUiConfig;
const scope = (m: Record<string, Value>) => (s: string) => (s in m ? m[s] : undefined);
const prep = (ws: string, sym: string, rows: unknown[], symbol?: (s: string) => Value | undefined) => prepareRegisterRows({ rows }, cfg(ws, sym).columns, { table, tableRows, symbol }, {});
const run = (n: string, opts: { inputs?: Array<{ symbol: string; value: number | string | null; unit: string | null }>; registers?: Record<string, ReturnType<typeof prep>> }): EvalState => {
  const e = eq(n);
  return evaluateFormula({ equationId: n, formula: e.formula, inputSymbols: e.input_symbols, outputSymbol: e.output_symbol, inputs: opts.inputs ?? [], registers: opts.registers, tableLookup: table });
};
const computed = (r: EvalState): number => { expect(r.kind, JSON.stringify(r)).toBe('computed'); return r.kind === 'computed' ? r.value : NaN; };

describe('DWA-M-1200-3 Plan-3 equations', () => {
  it('nine entries; every output is a created field of its worksheet; no prod helper output duplicated (speichervolumen, dauer_*, frostschutz_volumen, min_abstand); emitter accepts them', () => {
    expect(EQUATIONS.map((e) => e.equation_number)).toEqual(['M12003-06-D1', 'M12003-06-D2', 'M12003-08-D1', 'M12003-10-D1', 'M12003-10-D2', 'M12003-10-D3', 'M12003-11-D1', 'M12003-11-D2', 'M12003-18-D1']);
    const created = new Set(FIELD_CONFIGS.filter((f) => f.create).map((f) => `${f.worksheet} ${f.symbol}`));
    for (const e of EQUATIONS) {
      expect(created.has(`${e.worksheet} ${e.output_symbol}`), `${e.worksheet} ${e.output_symbol}`).toBe(true);
      expect(e.description.startsWith('Plan 3:')).toBe(true);
      expect(e.verification_quote?.length ?? 0).toBeGreaterThan(0);
      expect(parseNumeric(rhs(e.equation_number)).ok, e.equation_number).toBe(true);
      expect(['speichervolumen', 'dauer_durchgang_h', 'dauer_befuellung_h', 'frostschutz_volumen', 'min_abstand']).not.toContain(e.output_symbol); // the prod Gl-Helper-1…5 outputs stay single-sourced (m1200_3-R-1 / -R-2)
    }
    expect(new Set(EQUATIONS.map((e) => `${e.worksheet} ${e.output_symbol}`)).size).toBe(EQUATIONS.length);
    expect(() => emitEquationsSql('m1200_3', EQUATIONS)).not.toThrow();
  });

  it('the committed migration + rollback equal a fresh emit (freshness pin)', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const { up, down } = emitEquationsSql('m1200_3', EQUATIONS);
    const files = equationFilesFor('m1200_3', '20260917100620');
    expect(norm(up)).toBe(norm(readFileSync(join(ROOT, files.migration), 'utf8')));
    expect(norm(down)).toBe(norm(readFileSync(join(ROOT, files.rollback), 'utf8')));
    expect((up.match(/ON CONFLICT \(worksheet_template_id, equation_number\) DO NOTHING/g) ?? []).length).toBe(9);
  });

  it('M12003-06-D1 / -D2 over schlaege: Tab. 7 class D without Spritzschutz = 2 × 25 m = 50 m (the printed example L922); drip rows carry no rule; steuerbarer Zugang voids it; Σ area; violations counted', () => {
    const rows = [
      { id: '1', schlag_nr: '3001-1', flaeche_ha: 20, kultur: 'Kartoffeln', pflanzentyp: 'salzunempfindlich', technik: 'beregnung_sprinkler', sprinkler_gruppe: 't7', wurfweite_m: 25, spritzschutz: false, abstand_ist_m: 40 }, // L922: D, kein Spritzschutz → 2-fache = 50 m → 40 m unterschritten
      { id: '2', schlag_nr: '3001-2', flaeche_ha: 5, kultur: 'Hopfen', pflanzentyp: 'salzempfindlich', technik: 'tropfbewaesserung' },                                                                                     // L912: keine besonderen Abstände
      { id: '3', schlag_nr: 'Park', flaeche_ha: 1.5, kultur: 'Rasen', pflanzentyp: 'salzunempfindlich', technik: 'beregnung_sprinkler', sprinkler_gruppe: 't9', wurfweite_m: 8, spritzschutz: false, steuerbarer_zugang: true, abstand_ist_m: 0 }, // L1030: entfällt
      { id: '4', schlag_nr: '3001-3', flaeche_ha: 10, kultur: 'Mais', pflanzentyp: 'salzunempfindlich', technik: 'beregnung_sprinkler', sprinkler_gruppe: 't8', wurfweite_m: 5, spritzschutz: false, abstand_ist_m: 15 }, // Tab. 8 D ohne = 3 × 5 = 15 m → eingehalten
    ];
    const D = prep('M12003-06', 'schlaege', rows, scope({ gueteklasse: 'D' }));
    expect(D.rows.map((r) => [r.values.faktor, r.values.min_abstand_m, r.values.abstand_ok, r.complete])).toEqual([[2, 50, 0, true], [null, null, 1, true], [0, 0, 1, true], [3, 15, 1, true]]);
    expect(D.diagnostics).toBeUndefined();
    expect(computed(run('M12003-06-D1', { registers: { schlaege: D } }))).toBe(36.5);
    expect(computed(run('M12003-06-D2', { registers: { schlaege: D } }))).toBe(1);
    // class B (A bis C): 1-fache everywhere → row 1 needs 25 m, has 40 → no violation; the Tab.-8 example L937: B, 5 m, no shield → 5 m
    const B = prep('M12003-06', 'schlaege', rows, scope({ gueteklasse: 'B-1' }));
    expect(B.rows.map((r) => [r.values.faktor, r.values.min_abstand_m, r.values.abstand_ok])).toEqual([[1, 25, 1], [null, null, 1], [0, 0, 1], [1, 5, 1]]);
    expect(computed(run('M12003-06-D2', { registers: { schlaege: B } }))).toBe(0);
    // Spritzschutz: Tab. 7 D/mit = 1 (multirow); Tab. 8 D/mit prints an EMPTY cell → faktor null → the row is undecidable → manual_required (U-1), never a silent count
    const shield = prep('M12003-06', 'schlaege', [{ ...rows[0], spritzschutz: true }, { ...rows[3], spritzschutz: true }], scope({ gueteklasse: 'D' }));
    expect(shield.rows.map((r) => [r.values.faktor, r.values.min_abstand_m, r.values.abstand_ok])).toEqual([[1, 25, 1], [null, null, null]]);
    const st = run('M12003-06-D2', { registers: { schlaege: shield } });
    expect(st.kind).toBe('manual_required');
    // lactating cattle on a class-C row is flagged (L1282); an incomplete sprinkler row (no Abstand) does not count
    const C = prep('M12003-06', 'schlaege', [{ ...rows[1], weidegang_laktierend: true }, { ...rows[0], abstand_ist_m: undefined }], scope({ gueteklasse: 'C-1' }));
    expect(C.rows.map((r) => [r.values.laktierend_konflikt, r.complete])).toEqual([[1, true], [0, false]]);
    expect(computed(run('M12003-06-D1', { registers: { schlaege: C } }))).toBe(5);
    expect(run('M12003-06-D1', { registers: { schlaege: prep('M12003-06', 'schlaege', []) } }).kind).toBe('manual_required');
    // without the inherited class the factor cannot resolve (null) — the count is undecidable, not 0
    expect(prep('M12003-06', 'schlaege', [rows[0]]).rows[0].values.faktor).toBeNull();
  });

  it('M12003-08-D1 over wasseranalysen: Tab. 11 limits per row — Chlorid 250 (salzempfindlich) / 500 (salzunempfindlich), pH as 5,0–9,5, Quecksilber 0,5; 2 of 5 exceed', () => {
    const samples = [
      { id: '1', date: '2026-05-01', parameter: 'chlorid', wert: 300 },      // L1360: 250 / 500(*)
      { id: '2', date: '2026-05-01', parameter: 'ph', wert: 7.2 },          // L1363: 5,0-9,5
      { id: '3', date: '2026-05-01', parameter: 'quecksilber', wert: 0.6 }, // L1365: ≤ 0,5 µg/l
      { id: '4', date: '2026-05-01', parameter: 'kalium', wert: 200 },      // L1358: ≤ 200 mg/l (inclusive)
      { id: '5', date: '2026-05-01', parameter: 'leitfaehigkeit', wert: 2500 }, // L1365: 2.000 / 3.000(*)
    ];
    const se = prep('M12003-08', 'wasseranalysen', samples, scope({ pflanzentyp: 'salzempfindlich' }));
    expect(se.rows.map((r) => [r.values.limit, r.values.ok, r.values.einheit, r.complete])).toEqual([[250, 0, 'mg/l', true], [null, 1, '-', true], [0.5, 0, 'µg/l', true], [200, 1, 'mg/l', true], [2000, 0, 'µS/cm', true]]);
    expect(computed(run('M12003-08-D1', { registers: { wasseranalysen: se } }))).toBe(3);
    const su = prep('M12003-08', 'wasseranalysen', samples, scope({ pflanzentyp: 'salzunempfindlich' }));
    expect(su.rows.map((r) => [r.values.limit, r.values.ok])).toEqual([[500, 1], [null, 1], [0.5, 0], [200, 1], [3000, 1]]);
    expect(computed(run('M12003-08-D1', { registers: { wasseranalysen: su } }))).toBe(1);
    // pH outside the range; a (*) parameter without the inherited pflanzentyp is undecidable → manual_required
    const ph = prep('M12003-08', 'wasseranalysen', [{ id: '1', date: '2026-05-01', parameter: 'ph', wert: 4.9 }], scope({ pflanzentyp: 'salzempfindlich' }));
    expect(ph.rows[0].values.ok).toBe(0);
    expect(run('M12003-08-D1', { registers: { wasseranalysen: prep('M12003-08', 'wasseranalysen', [samples[0]]) } }).kind).toBe('manual_required');
    expect(computed(run('M12003-08-D1', { registers: { wasseranalysen: prep('M12003-08', 'wasseranalysen', [samples[3]]) } }))).toBe(0); // a non-(*) parameter needs no pflanzentyp
  });

  it('M12003-10-D1 / -D2 / -D3: Tab.-5 example 20 mm × 10 ha × 10 = 2000 m³; the Tab.-5 default 20; Σ storage volume over rows with the Tab.-3 system / class check and the 72-h rule', () => {
    expect(computed(run('M12003-10-D1', { inputs: [{ symbol: 'bewaesserungshoehe', value: 20, unit: 'mm' }, { symbol: 'flaeche_gesamt_ha', value: 10, unit: 'ha' }] }))).toBe(2000); // L797–L800
    expect(run('M12003-10-D1', { inputs: [{ symbol: 'bewaesserungshoehe', value: 20, unit: 'mm' }] }).kind).toBe('manual_required'); // flaeche_gesamt_ha not in scope on -10 until m1200_3-C-7
    expect(computed(run('M12003-10-D2', {}))).toBe(20); // L798
    expect(eq('M12003-10-D2').input_symbols).toEqual([]);
    const rows = [
      { id: '1', label: 'Zisterne', speichertyp: 'geschlossen_ortsfest_lang', volumen_m3: 1500, o2_saettigung_pct: 60, verweilzeit_h: 100, belueftung: true, umwaelzung: true },
      { id: '2', label: 'Teich', speichertyp: 'offen_ortsfest_kurz', volumen_m3: 800, o2_saettigung_pct: 45, verweilzeit_h: 24 },
      { id: '3', label: 'IBC', speichertyp: 'transportbehaelter', volumen_m3: 1 },
    ];
    const A = prep('M12003-10', 'speicher_1200_3', rows, scope({ gueteklasse: 'A' }));
    expect(A.rows.map((r) => [r.values.speichersystem, r.values.klassen_zulaessig, r.values.klasse_ok, r.values.o2_ok, r.complete])).toEqual([['geschlossen', 'A, B', 1, 1, true], ['offen', 'C, D', 0, 0, true], ['transport', 'Nach Bedarf', 1, null, true]]); // L662–L664, L1622
    expect(computed(run('M12003-10-D3', { registers: { speicher_1200_3: A } }))).toBe(2301);
    const D = prep('M12003-10', 'speicher_1200_3', rows, scope({ gueteklasse: 'D' }));
    expect(D.rows.map((r) => r.values.klasse_ok)).toEqual([0, 1, 1]);
    const B2 = prep('M12003-10', 'speicher_1200_3', rows, scope({ gueteklasse: 'B-2' }));
    expect(B2.rows.map((r) => r.values.klasse_ok)).toEqual([1, 0, 1]); // "A, B" covers B-2
    expect(prep('M12003-10', 'speicher_1200_3', rows).rows.map((r) => r.values.klasse_ok)).toEqual([null, null, null]); // gueteklasse not inherited on -10 today (m1200_3-C-7)
    expect(run('M12003-10-D3', { registers: { speicher_1200_3: prep('M12003-10', 'speicher_1200_3', []) } }).kind).toBe('manual_required');
  });

  it('M12003-11-D1 / -D2 over druckleitungen: Tab. 6 per 1.000 m scaled by length — DN 125 at 2 bar over 500 m = 588,5 kWh/a, DN 400 at 6 bar over 2.000 m = 4.098; costs (5.180 + 9.800) × 0,5 + (44.600 + 15.300) × 2', () => {
    const reg = prep('M12003-11', 'druckleitungen', [
      { id: '1', leitungstyp: 'PVC_DN125_PN10', laenge_m: 500, arbeitsdruck: '2', volumenverlust_pct: 0.5 },  // L843: 5.180 / 9.800 / 1.177
      { id: '2', leitungstyp: 'PVC_DN400_PN10', laenge_m: 2000, arbeitsdruck: '6', volumenverlust_pct: 1.5 }, // L848: 44.600 / 15.300 / 2.049
    ]);
    expect(reg.rows.map((r) => [r.values.material, r.values.einbau, r.values.kwh, r.values.kwh_abschnitt, r.values.kosten_abschnitt_eur, r.values.verlust_ok, r.complete])).toEqual([[5180, 9800, 1177, 588.5, 7490, 1, true], [44600, 15300, 2049, 4098, 119800, 0, true]]);
    expect(computed(run('M12003-11-D1', { registers: { druckleitungen: reg } }))).toBe(4686.5);
    expect(computed(run('M12003-11-D2', { registers: { druckleitungen: reg } }))).toBe(127290);
    const four = prep('M12003-11', 'druckleitungen', [{ id: '1', leitungstyp: 'PVC_DN225_PN10', laenge_m: 1000, arbeitsdruck: '4' }]);
    expect(four.rows[0].values.kwh).toBe(1394); // L845 at 4 bar
    expect(computed(run('M12003-11-D1', { registers: { druckleitungen: four } }))).toBe(1394);
  });

  it('M12003-18-D1 over bewaesserungstagebuch: Σ Wasserverbrauch total — the printed example row 300 m³ (L554) plus a second Gabe', () => {
    const reg = prep('M12003-18', 'bewaesserungstagebuch', [
      { id: '1', start: '17.06.2023 06:00', ende: '20.06.2023 06:00', empfehlung_mm: 20, real_mm: 15, flaeche_ha: 20, wasser_m3: 300, aufbereitet_m3: 300, kommentar: '-' }, // L554
      { id: '2', start: '01.07.2023 05:00', real_mm: 10, flaeche_ha: 20, wasser_m3: 200 },
      { id: '3', start: '05.07.2023', real_mm: 10, flaeche_ha: 20 }, // no Wasserverbrauch → incomplete
    ]);
    expect(reg.rows.map((r) => r.complete)).toEqual([true, true, false]);
    expect(computed(run('M12003-18-D1', { registers: { bewaesserungstagebuch: reg } }))).toBe(500);
  });

  it('desinfektionen rows: Tab. 13 allowed moment per method × system (Chlorung offen during filling = not allowed; UV geschlossen during storage = allowed with note 4), Tab. 14 dose and the 12-h minimum, thermal 70 °C / 3 min', () => {
    const reg = prep('M12003-22', 'desinfektionen', [
      { id: '1', date: '2026-04-01', methode: 'chlorung', speichersystem: 'offen', moment: 'befuellung', konz_ist: 30, verweilzeit_h: 12 },      // L1557: offen/Befüllung empty
      { id: '2', date: '2026-04-01', methode: 'uv', speichersystem: 'geschlossen', moment: 'speicherung' },                                      // L1574: x⁴⁾
      { id: '3', date: '2026-04-01', methode: 'h2o2', speichersystem: 'geschlossen', moment: 'start', konz_ist: 0.1, verweilzeit_h: 6 },          // L1742: 0,1 ml/l, 12 h bis 24 h
      { id: '4', date: '2026-04-01', methode: 'thermisch', temp_c: 70, dauer_min: 3 },                                                             // L1664
      { id: '5', date: '2026-04-01', methode: 'thermisch', temp_c: 65, dauer_min: 3 },
    ]);
    expect(reg.rows.map((r) => [r.values.zulaessig, r.values.umwaelzung_hinweis, r.values.konz_empf, r.values.verweilzeit_ok, r.values.thermisch_ok, r.complete])).toEqual([
      [0, 0, '$30 \\mathrm{mg} / \\mathrm{l}$', 1, 1, true],
      [1, 1, null, null, 1, true],
      [1, 0, '$0,1 \\mathrm{ml} / \\mathrm{l}$ bzw. 1 l pro $10 \\mathrm{~m}^{3}$', 0, 1, true],
      [null, null, null, null, 1, true],
      [null, null, null, null, 0, true],
    ]);
    expect(reg.diagnostics).toBeUndefined();
  });
});
