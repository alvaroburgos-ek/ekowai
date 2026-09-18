/**
 * Plan 3 Task 12 — DWA-M-187 seed builders: eleven tables, every row lifted
 * from the transcript (verbatim quotes with the line in the constant name, every
 * cell asserted inside its span at build time), key tokens = prod enum values,
 * the printed limits pinned per row, and the two OCR-damaged Klimakennung
 * matrices kept `imported_unverified` (m187-U-2). The transcript-wide check is
 * `scripts/regulation-tables/verify-regulation-tables.ts m187 "<transcript>"`.
 */
import { describe, it, expect } from 'vitest';
import { m187SeedTables, s5LimitsPAsTable, s5LimitsSpurAsTable, s5LimitsAppAsTable, s5131PAsTable, bild3AsTable, s543OrgAsTable, s55KleinAsTable, s5335UvAsTable, tabelle3AsTable, tabelle4AsTable, tabelle5AsTable, M187_EDITION, Q, P_TOKENS, SPUR_TOKENS, APP_TOKENS } from '../regulation-tables-seed-m187';
import { SEED_BUILDERS } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DWA-M-187';
const table = makeTableLookup(STD);
const byKey = <T extends { row_key: string }>(rows: readonly T[], k: string) => rows.find((r) => r.row_key === k)!;

describe('DWA-M-187 regulation-table seed (Plan 3 Task 12)', () => {
  it('eleven tables, 69 rows, edition 2025-09 (L9 "September 2025", L47 "Hennef 2025"; L12 Entwurf), registered as m187 with ts 20260917101200; statuses per table', () => {
    const tables = m187SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['S5_LIMITS_P', 'S5_LIMITS_SPUR', 'S5_LIMITS_APP', 'S5_1_3_1_P', 'BILD3', 'S5_4_3_ORG', 'S5_5_KLEIN', 'S5_3_3_5_UV', 'TABELLE3', 'TABELLE4', 'TABELLE5']);
    expect(tables.reduce((n, t) => n + t.rows.length, 0)).toBe(69);
    expect(M187_EDITION).toBe('2025-09');
    expect(Q.L9).toBe('September 2025');
    expect(Q.L12).toContain('Entwurf');
    expect(Q.L47).toContain('Hennef 2025');
    for (const t of tables) {
      expect(t.standard_code).toBe(STD);
      expect(t.edition).toBe(M187_EDITION);
      for (const r of t.rows) expect(r.verbatim_quote.trim().length, `${t.table_code} ${r.row_key}`).toBeGreaterThan(0);
    }
    expect(Object.fromEntries(tables.map((t) => [t.table_code, t.verification_status]))).toEqual({
      S5_LIMITS_P: 'md_verified', S5_LIMITS_SPUR: 'md_verified', S5_LIMITS_APP: 'md_verified', S5_1_3_1_P: 'md_verified', BILD3: 'md_verified',
      S5_4_3_ORG: 'md_verified', S5_5_KLEIN: 'md_verified', S5_3_3_5_UV: 'md_verified', TABELLE3: 'md_verified', TABELLE4: 'imported_unverified', TABELLE5: 'imported_unverified',
    });
    expect(SEED_BUILDERS.m187).toMatchObject({ ts: '20260917101200', slugFile: 'm187' });
    expect(SEED_BUILDERS.m187.build().map((t) => t.table_code)).toEqual(tables.map((t) => t.table_code));
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.table_code).toBe(t.table_code);
  });

  it('S5_LIMITS_P (§5.1.3.1 / §5.1.3.2): only b) prints an own h_FK (≥ 1,00 m, L514 "muss"); a) / c) "keine Änderungen zu Arbeitsblatt DWA-A 178:2019" (L488 / L496); keys = prod verfahrensvariante_p tokens; locked', () => {
    const t = s5LimitsPAsTable();
    expect(t.key_columns).toEqual(['variante_p']);
    expect(t.rows.map((r) => r.keys.variante_p)).toEqual([...P_TOKENS]);
    expect(byKey(t.rows, 'melioration_filtermaterial').values).toMatchObject({ h_fk_min_m: 1.0, h_fk_comparator: '≥' });
    expect(byKey(t.rows, 'melioration_filtermaterial').verbatim_quote).toBe(Q.L514);
    expect(Q.L514).toContain('muss in Abweichung von den Festlegungen in Arbeitsblatt DWA-A 178');
    for (const k of ['faellung_filterzulauf', 'nachgeschaltete_sorptionsstufe']) expect(byKey(t.rows, k).values.h_fk_min_m).toBeNull();
    expect(byKey(t.rows, 'faellung_filterzulauf').verbatim_quote).toBe(Q.L488);
    expect(t.override_policy).toBe('locked');
    expect(table('S5_LIMITS_P', ['melioration_filtermaterial'])).toMatchObject({ h_fk_min_m: 1 });
  });

  it('S5_LIMITS_SPUR (§5.2.3.1): a) 0,01 "auf" (no operator, J-2), b) 1 m + ≤ 0,03, c) ≤ 0,03 + h_FK ≥ 1 m + 24 h / 24 h + three segments (experience, J-3), d) nulls; keys = prod verfahrensvariante_spurenstoffe tokens; locked (O-1)', () => {
    const t = s5LimitsSpurAsTable();
    expect(t.key_columns).toEqual(['variante_spur']);
    expect(t.rows.map((r) => r.keys.variante_spur)).toEqual([...SPUR_TOKENS]);
    expect(byKey(t.rows, 'kontaktzeit').values).toMatchObject({ q_dr_rbf: 0.01, q_dr_comparator: null, h_fk_min_m: null });
    expect(byKey(t.rows, 'gak').values).toMatchObject({ q_dr_rbf: 0.03, q_dr_comparator: '≤', h_fk_min_m: 1, h_fk_text: 'Filterschichtstärke von 1 m' });
    expect(byKey(t.rows, 'mitbehandlung_ka').values).toMatchObject({ q_dr_rbf: 0.03, q_dr_comparator: '≤', h_fk_min_m: 1, beschickungsdauer_max_h: 24, trockenzeit_h: 24, segmente_erfahrung: 3 });
    expect(byKey(t.rows, 'nachgeschaltete_stufe').values).toMatchObject({ q_dr_rbf: null, h_fk_min_m: null });
    expect(byKey(t.rows, 'nachgeschaltete_stufe').values.hinweis).toContain('keine allgemein gültigen Bemessungsvorgaben');
    expect(t.rows.map((r) => r.verbatim_quote)).toEqual([Q.L599, Q.L601, Q.L603, Q.L605]);
    expect(Q.L597).toContain('sollten die folgende Bemessungsvorgaben angewendet werden'); // O-1 cue
    expect(t.override_policy).toBe('locked');
    expect(t.value_columns.find((c) => c.name === 'q_dr_rbf')).toMatchObject({ type: 'number', unit: 'l/(s·m²)' });
  });

  it('S5_LIMITS_APP (keyed on prod sonderanwendung): mikroorganismen q = 0,01 (L675) + h_FK ≥ 1,0 "sollte" (L677); klein_rbf 0,25 m (L926) and the PRINTED 0,2 m with carbonate layer (L930 — the inventory "not found" note is refuted, J-4); the two variant-driven rows and organische_belastung carry nulls', () => {
    const t = s5LimitsAppAsTable();
    expect(t.rows.map((r) => r.keys.sonderanwendung)).toEqual([...APP_TOKENS]);
    expect(byKey(t.rows, 'mikroorganismen').values).toMatchObject({ q_dr_rbf: 0.01, q_dr_comparator: '=', q_dr_modal: 'sicherzustellen', h_fk_min_m: 1.0, h_fk_comparator: '≥', h_fk_modal: 'sollte', h_fk_carbonat_m: null });
    expect(byKey(t.rows, 'klein_rbf').values).toMatchObject({ h_fk_min_m: 0.25, h_fk_carbonat_m: 0.2, q_dr_rbf: null });
    expect(Q.L930).toContain('In diesem Fall kann die Filterstärke auf $h_{F K} 0,2 \\mathrm{~m}$ verringert werden.');
    expect(Q.L926).toContain('$h_{\\mathrm{FK}} \\geqslant 0,25 \\mathrm{~m}$');
    for (const k of ['p_rueckhalt', 'spurenstoffe', 'organische_belastung']) expect(byKey(t.rows, k).values).toMatchObject({ q_dr_rbf: null, h_fk_min_m: null, h_fk_carbonat_m: null });
    expect(byKey(t.rows, 'mikroorganismen').verbatim_quote).toBe(Q.L675_677);
    expect(byKey(t.rows, 'klein_rbf').verbatim_quote).toBe(Q.L926_930);
    expect(t.override_policy).toBe('locked');
  });

  it('S5_1_3_1_P (variante_p × parameter): the fifteen printed P-Rückhalt parameters with unit, comparator and modal', () => {
    const t = s5131PAsTable();
    expect(t.key_columns).toEqual(['variante_p', 'parameter']);
    expect(t.rows).toHaveLength(15);
    const v = (variante: string, p: string) => table('S5_1_3_1_P', [variante, p]);
    expect(v('faellung_filterzulauf', 'beta_min')).toMatchObject({ wert: 4, comparator: '≥', modal: 'kann' });
    expect(v('faellung_filterzulauf', 's_po4p_am')).toMatchObject({ wert: 0.5, unit: 'mg/l' });
    expect(v('faellung_filterzulauf', 'pufferschicht_cm')).toMatchObject({ wert: 5, unit: 'cm', modal: 'sollte' });
    expect(v('melioration_filtermaterial', 'fe_massenanteil_pct')).toMatchObject({ wert: 7, unit: '%' });
    expect(v('melioration_filtermaterial', 'fe_gehalt_min_pct')).toMatchObject({ wert: 35, comparator: '>' });
    expect(v('melioration_filtermaterial', 'p_grund_beladung_max')).toMatchObject({ wert: 0.2, comparator: '<', unit: 'g/kg' });
    expect(v('melioration_filtermaterial', 'feinmassenanteil_max_pct')).toMatchObject({ wert: 5, modal: 'muss' });
    expect(v('melioration_filtermaterial', 'fallhoehe_max_m')).toMatchObject({ wert: 1.0, comparator: '≤' });
    expect(v('nachgeschaltete_sorptionsstufe', 'ebct_min_min')).toMatchObject({ wert: 15, unit: 'min', comparator: '≥' });
    expect(v('nachgeschaltete_sorptionsstufe', 'v_filter_auf_max')).toMatchObject({ wert: 5.0, comparator: '<' });
    expect(v('nachgeschaltete_sorptionsstufe', 'h_fk_ss_m')).toMatchObject({ wert: 1.25 });
    expect(v('nachgeschaltete_sorptionsstufe', 'v_filter_ab_max')).toMatchObject({ wert: 2, modal: 'sollte' });
    expect(v('nachgeschaltete_sorptionsstufe', 'sorptionsstufen_min')).toMatchObject({ wert: 2, modal: 'empfohlen' });
    expect(v('nachgeschaltete_sorptionsstufe', 'fe_gehalt_min_pct')).toMatchObject({ wert: 35 });
    expect(v('nachgeschaltete_sorptionsstufe', 'p_grund_beladung_max')).toMatchObject({ wert: 0.2 });
    expect(v('melioration_filtermaterial', 'ebct_min_min')).toBeUndefined(); // no row → lookup() fails recoverably
  });

  it('BILD3: four layers top-down 10 / 60 / 30 / 25 cm, GAK bands 10–20 % (Lage 1) and 30–40 % (Lage 3), 20 % CaCO3 over the sand layers, Dränagekies not filterwirksam (J-5); anhaltswert (L611 "empfohlenen")', () => {
    const t = bild3AsTable();
    expect(t.rows.map((r) => [r.keys.lage, r.values.dicke_cm, r.values.material, r.values.gak_vol_min_pct, r.values.gak_vol_max_pct, r.values.caco3_massenanteil_pct, r.values.filterwirksam])).toEqual([
      ['1', 10, 'Filtersand / Meliorationsschicht', 10, 20, 20, true],
      ['2', 60, 'Filtersand', null, null, 20, true],
      ['3', 30, 'Filtersand', 30, 40, 20, true],
      ['4', 25, 'Dränagekies', null, null, null, false],
    ]);
    expect(t.rows.every((r) => r.verbatim_quote === Q.B3_SPAN)).toBe(true);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe(Q.L611);
    expect(10 + 60 + 30).toBe(100); // = "Filterschichtstärke von 1 m" (L601)
  });

  it('S5_4_3_ORG: the twelve printed §5.4 figures (3.000 mg/l, 100 %, 60 l/(s·ha), 4 m/h, 50 m³, 20 g/(m²·d), 750 m²/ha, 4 / 3 Teilfilterbecken, 6 l/(m²·min), 20 l/m², 1 m²/Öffnung) with their modal verbs', () => {
    const t = s543OrgAsTable();
    expect(t.rows).toHaveLength(12);
    const v = (p: string) => table('S5_4_3_ORG', [p]);
    expect(v('csb_trennung')).toMatchObject({ wert: 3000, unit: 'mg/l', comparator: '>', modal: 'müssen' });
    expect(v('wirkungsgrad')).toMatchObject({ wert: 100, modal: 'muss' });
    expect(v('q_krit')).toMatchObject({ wert: 60, unit: 'l/(s·ha)', modal: 'sollte' });
    expect(v('q_a_max')).toMatchObject({ wert: 4, unit: 'm/h', modal: 'muss' });
    expect(v('v_vorstufe_min')).toMatchObject({ wert: 50, unit: 'm³', modal: 'empfohlen' });
    expect(v('b_csb_max')).toMatchObject({ wert: 20, unit: 'g/(m²·d)', comparator: '≤' });
    expect(v('a_f_pro_aeb')).toMatchObject({ wert: 750, unit: 'm²/ha', modal: 'muss' });
    expect(v('teilfilter_multiple')).toMatchObject({ wert: 4 });
    expect(v('teilfilter_in_betrieb')).toMatchObject({ wert: 3 });
    expect(v('foerderleistung')).toMatchObject({ wert: 6, unit: 'l/(m²·min)', modal: 'muss' });
    expect(v('beschickung_pro_ereignis')).toMatchObject({ wert: 20, unit: 'l/m²', modal: 'sollten' });
    expect(v('austritt_max')).toMatchObject({ wert: 1, unit: 'm²/Öffnung', modal: 'sollte' });
    expect(t.override_policy).toBe('locked');
  });

  it('S5_5_KLEIN: the seventeen printed §5.5 figures incl. h_FK 0,25 / 0,2 m, DN 50 (muss) vs h_Drän ≥ 0,1 m (sollte), A_F = 1,0 % = 100 m²/ha, element ≥ 1,0 m² (sollte), η ≥ 95 %, b_krit = 7', () => {
    const t = s55KleinAsTable();
    expect(t.rows).toHaveLength(17);
    const v = (p: string) => table('S5_5_KLEIN', [p]);
    expect(v('a_b_a_max_ha')).toMatchObject({ wert: 1, unit: 'ha', comparator: '<' });
    expect(v('h_rr_min')).toMatchObject({ wert: 0.2, unit: 'm' });
    expect(v('deckschicht_cm')).toMatchObject({ wert: 5, unit: 'cm' });
    expect(v('h_fk_min')).toMatchObject({ wert: 0.25 });
    expect(v('h_fk_carbonat')).toMatchObject({ wert: 0.2, modal: 'kann' });
    expect(v('h_fk_caco3_min')).toMatchObject({ wert: 0.1 });
    expect(v('caco3_carbo_pct')).toMatchObject({ wert: 80 });
    expect(v('caco3_filter_min_pct')).toMatchObject({ wert: 20 });
    expect(v('draen_dn_min')).toMatchObject({ wert: 50, modal: 'muss' });
    expect(v('h_draen_min')).toMatchObject({ wert: 0.1, modal: 'sollte' });
    expect(v('h_rbf_min')).toMatchObject({ wert: 0.6 });
    expect(v('a_f_anteil_pct')).toMatchObject({ wert: 1.0, unit: '%' });
    expect(v('a_f_m2_pro_ha')).toMatchObject({ wert: 100 });
    expect(v('a_f_element_min_m2')).toMatchObject({ wert: 1.0, modal: 'sollte' });
    expect(v('eta_afs63_min')).toMatchObject({ wert: 95 });
    expect(v('jahreswassermenge_min_pct')).toMatchObject({ wert: 85 });
    expect(v('b_krit')).toMatchObject({ wert: 7, unit: 'kg/(m²·a)' });
    expect(Q.L968).toContain('auch geringere spezifische Filterflächen von $A_{\\mathrm{F}}<1,0 \\%$'); // G-6 cue
  });

  it('S5_3_3_5_UV (keyed on prod uv_eingesetzt ja / nein): 200 J/m² for ja, null for nein; anhaltswert (L703 "sollte … nicht unterschritten werden")', () => {
    const t = s5335UvAsTable();
    expect(t.rows.map((r) => [r.keys.uv_eingesetzt, r.values.uv_dosis_min_j_m2])).toEqual([['ja', 200], ['nein', null]]);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe(Q.L703);
  });

  it('TABELLE3 (transposed, keyed variante_p): eight printed criteria per variant — Zugabe kontinuierlich / einmalig / periodisch, Wiederverwendung nicht möglich / nicht möglich / möglich', () => {
    const t = tabelle3AsTable();
    expect(t.rows.map((r) => r.keys.variante_p)).toEqual([...P_TOKENS]);
    expect(t.value_columns.map((c) => c.name)).toEqual(['betriebspunkte', 'platzbedarf', 'erfahrungen', 'nachruestung', 'zugabe', 'wiederverwendung_p', 'ausnutzung', 'ausfall']);
    expect(t.rows.map((r) => r.values.zugabe)).toEqual(['kontinuierlich', 'einmalig', 'periodisch']);
    expect(t.rows.map((r) => r.values.wiederverwendung_p)).toEqual(['nicht möglich', 'nicht möglich', 'möglich']);
    expect(t.rows.map((r) => r.values.erfahrungen)[1]).toBe('langjährige großtechnische Betriebserfahrungen');
    expect(t.rows.every((r) => r.verbatim_quote === Q.T3_SPAN)).toBe(true);
  });

  it('TABELLE4 / TABELLE5: the printed Klimakennung cells verbatim incl. the OCR "KSO" / "KAO" (m187-U-2); imported_unverified; no field target (J-1)', () => {
    const t4 = tabelle4AsTable();
    const t5 = tabelle5AsTable();
    expect(t4.rows.map((r) => Object.values(r.values))).toEqual([['KS0', 'KS0', 'KSO', 'KS1', 'KSO'], ['KSO', 'KSO', 'KSO', 'KS1', 'KSO']]);
    expect(t5.rows.map((r) => Object.values(r.values))).toEqual([['KA0', 'KA1', 'KA1', 'KAO', 'KAO', 'KA1', 'KA1'], ['KA1', 'KA1', 'KA1', 'KAO', 'KA0', 'KA1', 'KA1']]);
    expect(t4.verification_status).toBe('imported_unverified');
    expect(t5.verification_status).toBe('imported_unverified');
  });

  it('m187-U-1: Tab. 2 prints the q_Dr,RBF unit as "l/(s·m²)²" (L394, OCR); the seeded unit is the §5 form "l/(s·m²)"', () => {
    expect(Q.L394).toContain('\\mathrm{l} /\\left(\\mathrm{s} \\cdot \\mathrm{m}^{2}\\right)^{2}');
    expect(s5LimitsAppAsTable().value_columns.find((c) => c.name === 'q_dr_rbf')).toMatchObject({ unit: 'l/(s·m²)' });
  });
});
