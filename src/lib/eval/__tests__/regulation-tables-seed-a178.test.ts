/**
 * Plan 3 Task 14 — DWA-A-178 seed tables: shape pins, key-token pins against
 * the captured prod enums (G-A3), the printed values read from the transcript in
 * this session (line in the comment), the OCR cell of Tabelle 1 (a178-U-1) and
 * the policy split (locked / kann / anhaltswert) decided from the printed verbs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  tabelle1AsTable, tabelle1VsAsTable, s6145AsTable, s6LimitsAsTable, s62RechenwerteAsTable, s62AnhaltAsTable, tabelle2AsTable,
  a178SeedTables, TABELLE1_KOMPONENTEN, VORSTUFE_TYPEN, S6_1_4_5_HFK, S6_LIMITS_ROWS, S6_2_RECHENWERTE_ROWS, S6_2_ANHALT_ROWS, TABELLE2_BEFUNDE, A178_EDITION, Q,
} from '../regulation-tables-seed-a178';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DWA-A-178';
const ROOT = join(__dirname, '..', '..', '..', '..');
const prior = JSON.parse(readFileSync(join(ROOT, 'src/lib/eval/field-configs/a178.prior.json'), 'utf8')) as Record<string, { enum_values?: Array<{ value: string }> | null; data_type?: string }>;
const enumValues = (key: string): string[] => (prior[key].enum_values ?? []).map((e) => e.value);
const table = makeTableLookup(STD);

function expectWellFormed(t: RegulationTable) {
  const keys = new Set<string>();
  for (const r of t.rows) {
    expect(keys.has(r.row_key), `${t.table_code} duplicate row_key ${r.row_key}`).toBe(false);
    keys.add(r.row_key);
    expect(r.row_key).toBe(t.key_columns.map((c) => r.keys[c]).join('|'));
    expect(r.verbatim_quote.trim().length, `${t.table_code} ${r.row_key} quote`).toBeGreaterThan(0);
    for (const c of t.value_columns) expect(c.name in r.values, `${t.table_code} ${r.row_key} lacks column ${c.name}`).toBe(true);
  }
  expect(t.standard_code).toBe(STD);
  expect(t.edition).toBe(A178_EDITION);
}

describe('DWA-A-178 Plan-3 seed tables', () => {
  it('seven tables in the live set; registered as SEED_BUILDERS.a178 (ts 20260917101400); the fallback resolves each; edition token from the title page', () => {
    const tables = a178SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TABELLE1', 'TABELLE1_VS', 'S6_1_4_5', 'S6_LIMITS', 'S6_2_RECHENWERTE', 'S6_2_ANHALT', 'TABELLE2']);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.a178).toEqual({ build: a178SeedTables, ts: '20260917101400', slugFile: 'a178' });
    expect(liveSeedSlugs()).toContain('a178');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
    expect(A178_EDITION).toBe('2019-06'); // L7 / L17 "Juni 2019"; prod standards.version 'Juni 2019 (korrigierte Fassung Oktober 2019)' (a178-I-1)
    expect(tables.reduce((n, t) => n + t.rows.length, 0)).toBe(4 + 4 + 3 + 17 + 4 + 4 + 15);
  });

  it('TABELLE1 (L869–L873): η_VS 0 (OCR "$0^{11}$" — a178-U-1) / η_F 0,95 / η_RR 0,50 / η_RRL 0,60; the footnote alternative 0,2 on the vs row; locked (L867 caption); imported_unverified', () => {
    const t = tabelle1AsTable();
    expect(t.rows.map((r) => [r.keys.komponente, r.values.eta_afs63, r.values.eta_alt])).toEqual([['vs', 0, 0.2], ['f', 0.95, null], ['rr', 0.5, null], ['rrl', 0.6, null]]);
    expect(TABELLE1_KOMPONENTEN[0].printed).toBe('$0^{11}$');
    expect(Q.L869_873).toContain('\\hline AFS63 & $0^{11}$ & 0,95 & 0,50 & 0,60 \\\\'); // L870 as printed
    expect(String(t.rows[0].values.bedingung)).toContain('kann für AFS63 $\\eta_{\\mathrm{VS}}=0,2$ angesetzt werden'); // L873
    expect(t.rows.every((r) => r.verbatim_quote === Q.L869_873)).toBe(true);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('zur Anwendung in GI. (5) bis GL. (7)'); // L867 — OCR "GI."/"GL." for "Gl." (a178-U-2)
    expect(t.verification_status).toBe('imported_unverified');
    expect(table('TABELLE1', ['f'])?.eta_afs63).toBe(0.95);
  });

  it('TABELLE1_VS (L873 footnote): RKB (q_A ≤ 10 m/h) / RÜB-DB → 0,2; Stauraumkanal unten / sonstige → 0; kann with the printed alternatives 0 / 0,2; md_verified', () => {
    const t = tabelle1VsAsTable();
    expect(t.rows.map((r) => [r.keys.vorstufe_typ, r.values.eta_vs])).toEqual([['rkb_le10', 0.2], ['rueb_db', 0.2], ['stauraum_unten', 0], ['sonstige', 0]]);
    expect(VORSTUFE_TYPEN.map((v) => v.value)).toEqual(['rkb_le10', 'rueb_db', 'stauraum_unten', 'sonstige']);
    expect(t.override_policy).toBe('kann');
    expect(t.override_quote).toBe(Q.L873);
    expect(t.value_columns[0]).toEqual({ name: 'eta_vs', type: 'number', unit: '-', values: ['0', '0.2'] });
    expect(t.verification_status).toBe('md_verified');
    expect(Q.L671).toContain('Für Stauraumkanäle mit unten liegender Entlastung ist diese Ausnahme nicht zulässig');
  });

  it('S6_1_4_5 (L590 / L591): Mischsystem h_FK ≥ 0,75 m; Trennsystem und Straßenentwässerung ≥ 0,50 m — keys = prod system_type tokens; locked; md_verified', () => {
    const t = s6145AsTable();
    expect(enumValues('A178-02 system_type')).toEqual(['misch', 'trenn', 'strasse']);
    expect(t.rows.map((r) => [r.keys.system_type, r.values.h_fk_min_m])).toEqual([['misch', 0.75], ['trenn', 0.5], ['strasse', 0.5]]);
    expect(t.rows.map((r) => r.keys.system_type)).toEqual(enumValues('A178-02 system_type'));
    expect(t.rows[1].verbatim_quote).toBe(t.rows[2].verbatim_quote); // one printed line for both (L591)
    expect(S6_1_4_5_HFK.map((r) => r.line)).toEqual(['L590', 'L591', 'L591']);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toBe('Die erforderliche Höhe des Filterkörpers beträgt im konsolidierten Zustand:'); // L589
    expect(t.verification_status).toBe('md_verified');
    expect(table('S6_1_4_5', ['misch'])?.h_fk_min_m).toBe(0.75);
  });

  it('S6_LIMITS (locked): the 17 printed "muss / festgesetzt / festgelegt / ≥ ≤" figures with their lines', () => {
    const t = s6LimitsAsTable();
    const v = Object.fromEntries(t.rows.map((r) => [r.keys.parameter, r.values.wert]));
    expect(v).toEqual({
      b_krit: 7, b_f_min: 4, v_spez_min: 0.5, e_0_max: 55, n_entlastungen_min: 10, t_rr_e_n1_max: 48, n_rbf_min: 10, h_rr_min: 0.3, h_rr_max: 2,
      q_dr_rbf_max: 0.05, kdb_min_mm: 2, u_max: 5, feinanteil_max: 3, ueberkorn_max: 15, caco3_min: 20, deckschicht_cm: 5, langzeitsimulation_min_a: 10,
    });
    expect(S6_LIMITS_ROWS.map((r) => r.line)).toEqual(['L689', 'L884', 'L677', 'L671', 'L673', 'L979', 'L979', 'L575', 'L575', 'L639', 'L635', 'L606', 'L606', 'L606', 'L608', 'L583', 'L792']);
    expect(t.rows.find((r) => r.keys.parameter === 'b_krit')?.values.modal).toBe('festgesetzt'); // L689 "wird eine maximal zulässige AFS63-Filterflächenbelastung von b_krit = 7 kg/(m²·a) festgesetzt"
    expect(t.rows.find((r) => r.keys.parameter === 'u_max')?.values.comparator).toBe('<');
    expect(t.rows.find((r) => r.keys.parameter === 'n_rbf_min')?.values.unit).toBe('a'); // L979 prints "≥ 10 a" — as printed (fix round 1, a178-U-5); §3.2 L354 prints n_RBF in 1/a
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('md_verified');
    for (const r of t.rows) expect(r.values.text).toBe(r.verbatim_quote);
  });

  it('S6_2_RECHENWERTE (locked, a178-O-2): b_R,a 530 "wird … angesetzt" (L716 — NOT "kann", the inventory/brief cue is refuted), Porenvolumen 15 % (L775), Straße A_F = 100 m²/ha (L782), h_RR ≥ 0,5 m (L783)', () => {
    const t = s62RechenwerteAsTable();
    expect(t.rows.map((r) => [r.keys.parameter, r.values.wert, r.values.unit])).toEqual([['b_r_a', 530, 'kg/(ha·a)'], ['porenvolumen_pct', 15, '%'], ['a_f_strasse_m2_ha', 100, 'm²/ha'], ['h_rr_min_strasse', 0.5, 'm']]);
    expect(Q.L716).toContain('Als Rechenwert zur Vorbemessung der Bodenfilteroberfläche wird eine flächenspezifische Fracht von $b_{\\mathrm{R}, \\mathrm{a}}=530 \\mathrm{~kg} /(\\mathrm{ha} \\cdot \\mathrm{a})$ angesetzt.');
    expect(Q.L716).not.toContain('kann $b_{\\mathrm{R}, \\mathrm{a}}');
    expect(Q.L775).toContain('Das Porenvolumen wird pauschal mit $15 \\%$ des Filterkörpervolumens angesetzt.');
    expect(S6_2_RECHENWERTE_ROWS.map((r) => r.line)).toEqual(['L716', 'L775', 'L782', 'L783']);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toBe(Q.L716);
    expect(t.verification_status).toBe('md_verified');
    expect(table('S6_2_RECHENWERTE', ['porenvolumen_pct'])?.wert).toBe(15);
  });

  it('S6_2_ANHALT (anhaltswert, a178-O-3): q_Dr,RBF 0,05 "kann … angesetzt werden" (L767), Pflanzdichte 4–8 "haben sich … bewährt" (L619), übliches Frachtaufkommen bis zu 1.000 kg/(ha·a) (L461)', () => {
    const t = s62AnhaltAsTable();
    expect(t.rows.map((r) => [r.keys.parameter, r.values.wert])).toEqual([['q_dr_rbf_vorbemessung', 0.05], ['pflanzdichte_min', 4], ['pflanzdichte_max', 8], ['feststoffeintrag_ueblich_max', 1000]]);
    expect(Q.L767).toContain('kann eine konstante Abflussspende des Drosselorgans des Retentionsbodenfilterbeckens von $q_{\\mathrm{Dr}, \\mathrm{RBF}}=0,05 \\mathrm{l} /\\left(\\mathrm{s} \\cdot \\mathrm{m}^{2}\\right)$ gemäß 6.1.4.10 angesetzt werden. Für die nachfolgende Nachweisrechnung muss die Kennlinie des geplanten Drosselorgans angesetzt werden.');
    expect(S6_2_ANHALT_ROWS.map((r) => r.line)).toEqual(['L767', 'L619', 'L619', 'L461']);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TABELLE2 (L1085–L1094, L1104–L1108): 15 printed indicator rows in three \\multirow groups (group_label = Bereich), Befund + Hinweis lifted cell-for-cell; anhaltswert (L1078); md_verified', () => {
    const t = tabelle2AsTable();
    expect(t.rows).toHaveLength(15);
    expect(t.rows.map((r) => r.group_label)).toEqual([...Array(5).fill('Schilf'), ...Array(5).fill('Bodenfilteroberfläche'), ...Array(5).fill('Ablaufbauwerk')]);
    expect(t.rows[0].values).toEqual({ bereich: 'Schilf', befund_text: 'üppiger Wuchs auf der gesamten Filterfläche', hinweis: 'hohe, gleichmäßige Filterbelastung' });
    expect(t.rows[10].values).toEqual({ bereich: 'Ablaufbauwerk', befund_text: 'Dränablauf klar, farb- und geruchlos', hinweis: 'funktionstüchtiger Filter mit guter Reinigungsleistung' });
    expect(t.rows[14].values.hinweis).toBe('Kurzschlussverbindungen im Filterkörper (z. B. aufgrund von Tierbauten)');
    expect(TABELLE2_BEFUNDE.map((b) => b.line)).toEqual(['L1085', 'L1086', 'L1087', 'L1088', 'L1089', 'L1090', 'L1091', 'L1092', 'L1093', 'L1094', 'L1104', 'L1105', 'L1106', 'L1107', 'L1108']);
    expect(new Set(t.rows.map((r) => r.verbatim_quote)).size).toBe(15);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe(Q.L1078);
    expect(t.verification_status).toBe('md_verified');
  });

  it('every seeded cell is asserted inside its span at build time (inSpan) — a mistyped cell throws', () => {
    expect(() => a178SeedTables()).not.toThrow();
    for (const t of a178SeedTables()) for (const r of t.rows) for (const c of ['printed', 'befund_text', 'hinweis'] as const) {
      const v = (r.values as Record<string, unknown>)[c];
      if (typeof v === 'string') expect(r.verbatim_quote, `${t.table_code} ${r.row_key} ${c}`).toContain(v);
    }
  });
});
