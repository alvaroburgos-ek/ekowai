/**
 * Plan 3 Task 11 — DWA-M-205 seed tables: shape pins, key-token pins against the
 * captured prod enums (G-A3), the printed values read from the transcript in this
 * session (line in the comment), the cells deliberately left null (m205-U-1 "10 1",
 * m205-J-4 "nicht nachweisbar" / "> 400", m205-E-2 no band for tab2_ausgezeichnet)
 * and the printed rating glyphs kept verbatim (m205-U-2).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  m205SeedTables, tabelle1AsTable, tabelle2AsTable, tabelle3AsTable, tabelle4AsTable, s4123AsTable, s33LogredAsTable, tabelle5AsTable, tabelle6AsTable, tabelle7AsTable, tabelle8AsTable, s4332AsTable, s442AsTable, s4334AsTable,
  TAB1_PARAMETER, TAB2_KLASSEN, TAB2_PROD_TOKENS, TAB3_KLASSEN, TAB4_STRAHLER, S4_1_2_3_PROD_TOKENS, S3_3_BEWIRTSCHAFTUNG, TAB8_ASPEKTE, M205_EDITION, Q,
} from '../regulation-tables-seed-m205';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DWA-M-205';
const ROOT = join(__dirname, '..', '..', '..', '..');
const prior = JSON.parse(readFileSync(join(ROOT, 'src/lib/eval/field-configs/m205.prior.json'), 'utf8')) as Record<string, { enum_values?: Array<{ value: string }> | null; data_type?: string }>;
const enumValues = (key: string): string[] => (prior[key].enum_values ?? []).map((e) => e.value);

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
  expect(t.edition).toBe(M205_EDITION);
}

describe('DWA-M-205 Plan-3 seed tables', () => {
  it('fifteen tables (79 rows) in the live set; registered as SEED_BUILDERS.m205 (ts 20260917101100); the fallback resolves each; edition = prod standards.version "März 2013"', () => {
    const tables = m205SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TABELLE1', 'TABELLE2', 'TABELLE3', 'TABELLE4', 'S4_1_2_3', 'S3_3_LOGRED', 'TABELLE5', 'TABELLE6', 'TABELLE7', 'TABELLE8_UV', 'TABELLE8_MEMBRAN', 'TABELLE8_OZON', 'S4_3_3_2', 'S4_4_2', 'S4_3_3_4']);
    expect(tables.reduce((a, t) => a + t.rows.length, 0)).toBe(79);
    for (const t of tables) expectWellFormed(t);
    expect(SEED_BUILDERS.m205).toEqual({ build: m205SeedTables, ts: '20260917101100', slugFile: 'm205' });
    expect(liveSeedSlugs()).toContain('m205');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length).toBe(t.rows.length);
    expect(M205_EDITION).toBe('2013-03'); // title page L5 "März 2013", imprint L36 "Hennef 2013"
    expect(tables.filter((t) => t.verification_status === 'md_verified').map((t) => t.table_code)).toEqual(['TABELLE2', 'TABELLE3', 'TABELLE4', 'S4_1_2_3', 'S3_3_LOGRED', 'TABELLE5', 'TABELLE6', 'TABELLE7', 'S4_3_3_2', 'S4_4_2', 'S4_3_3_4']);
  });

  it('TABELLE1 (L301–L305): G / I values with percentiles as printed; "-" → null; Darmviren volume "10 1*)" left null (m205-U-1) → imported_unverified; anhaltswert (§2.1 L232)', () => {
    const t = tabelle1AsTable();
    expect(t.rows.map((r) => [r.keys.parameter, r.values.g_wert, r.values.g_pct, r.values.i_wert, r.values.i_pct, r.values.volume_ml, r.values.auf_anforderung])).toEqual([
      ['gesamtcoliforme', 500, 80, 10000, 95, 100, false],   // L301 "500 (80) & 10.000 (95)"
      ['faekalcoliforme', 100, 80, 2000, 95, 100, false],    // L302 "100 (80) & 2.000 (95)"
      ['strep_faecalis', 100, 90, null, null, 100, true],    // L303 "100 (90) & -"
      ['salmonellen', null, null, 0, 95, 1000, true],        // L304 "- & 0 (95)"
      ['darmviren', null, null, 0, 95, null, true],          // L305 "Darmviren in 10 1*) & - & 0 (95)"
    ]);
    expect(t.rows[4].values.volume_text).toBe('10 1');
    expect(TAB1_PARAMETER).toHaveLength(5);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe(Q.L232);
    expect(t.verification_status).toBe('imported_unverified');
  });

  it('TABELLE2 (L322–L332): 12 cells keyed gewaesserklasse × parameter — 5 prod tokens + the printed kueste_ausreichend (m205-E-1); md_verified', () => {
    const t = tabelle2AsTable();
    expect(enumValues('M205-02 gewaesserklasse')).toEqual([...TAB2_PROD_TOKENS]);
    expect(enumValues('M205-04 gewaesserklasse')).toEqual([...TAB2_PROD_TOKENS]);
    expect(TAB2_KLASSEN.filter((k) => !(TAB2_PROD_TOKENS as readonly string[]).includes(k))).toEqual(['kueste_ausreichend']);
    const cell = (k: string, p: string) => { const r = t.rows.find((x) => x.row_key === `${k}|${p}`)!; return [r.values.limit_cfu_100ml, r.values.percentile_pct]; };
    expect(cell('binnen_ausgezeichnet', 'enterokokken')).toEqual([200, 95]);
    expect(cell('binnen_gut', 'enterokokken')).toEqual([400, 95]);
    expect(cell('binnen_ausreichend', 'enterokokken')).toEqual([330, 90]);
    expect(cell('binnen_ausgezeichnet', 'e_coli')).toEqual([500, 95]);
    expect(cell('binnen_gut', 'e_coli')).toEqual([1000, 95]);
    expect(cell('binnen_ausreichend', 'e_coli')).toEqual([900, 90]);
    expect(cell('kueste_ausgezeichnet', 'enterokokken')).toEqual([100, 95]);
    expect(cell('kueste_gut', 'enterokokken')).toEqual([200, 95]);
    expect(cell('kueste_ausreichend', 'enterokokken')).toEqual([185, 90]);
    expect(cell('kueste_ausgezeichnet', 'e_coli')).toEqual([250, 95]);
    expect(cell('kueste_gut', 'e_coli')).toEqual([500, 95]);
    expect(cell('kueste_ausreichend', 'e_coli')).toEqual([500, 90]);
    expect(t.rows).toHaveLength(12);
    expect(t.rows.find((x) => x.row_key === 'binnen_gut|e_coli')!.values.methode).toBe('DIN EN ISO 9308-3 oder DIN EN ISO 9308-1');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TABELLE3 (L368–L399): four classes = prod eignungsklasse_bewaesserung tokens; upper bounds 100/200/10 and 400/2000/20; class 1 and 4 carry no number (m205-J-4); anhaltswert (footnote 4, L406)', () => {
    const t = tabelle3AsTable();
    expect(enumValues('M205-05 eignungsklasse_bewaesserung')).toEqual(['1', '2', '3', '4']);
    expect(t.rows.map((r) => [r.keys.eignungsklasse, r.values.fkstrep_max, r.values.e_coli_max, r.values.toc_max])).toEqual([['1', null, null, 2], ['2', 100, 200, 10], ['3', 400, 2000, 20], ['4', null, null, null]]);
    expect(t.rows[0].values.fkstrep_text).toBe('nicht nachweisbar');
    expect(t.rows[3].values.e_coli_text).toBe('> $2000^{6)}$');
    expect(t.rows[2].values.anwendung).toContain('sonstige Sportplätze');
    expect(t.rows[3].values.nichtanwendung).toBe('Gewächshauskulturen aller Art · Gemüse und Obst aller Art · Grünland und Feldfutter zur Frischverfütterung · in den Karenzzeiten');
    expect(TAB3_KLASSEN).toHaveLength(4);
    expect(t.override_quote).toBe(Q.T3_FN4_L406);
    expect(t.verification_status).toBe('md_verified');
  });

  it('TABELLE4 (L530–L537): two lamp types = prod strahlertyp tokens; printed strings kept, numeric bounds as printed; one span for both rows; anhaltswert (L533 — L603)', () => {
    const t = tabelle4AsTable();
    expect(enumValues('M205-05 strahlertyp')).toEqual(['niederdruck', 'mitteldruck']);
    expect(t.rows.map((r) => r.keys.strahlertyp)).toEqual(['niederdruck', 'mitteldruck']);
    const nd = t.rows[0].values; const md = t.rows[1].values;
    expect([nd.hg_druck_hpa, nd.wellenlaenge_nm, nd.leistungsdichte_w_cm, nd.uvc_anteil_pct, nd.oberflaechentemp_c, nd.nutzungsdauer_h]).toEqual(['ca. 0,01', '254 nm', '1-4', 'ca. 20-35', '40-120', '8.000-16.000']);
    expect([md.hg_druck_hpa, md.leistungsdichte_w_cm, md.uvc_anteil_pct, md.oberflaechentemp_c, md.nutzungsdauer_h]).toEqual(['1.000-10.000', '100-200', 'ca. 8-15', '600-950', '4.000-12.000']);
    expect([nd.wellenlaenge_min, nd.wellenlaenge_max, md.wellenlaenge_min, md.wellenlaenge_max]).toEqual([254, 254, 240, 280]);
    expect([nd.nutzungsdauer_min, nd.nutzungsdauer_max, md.nutzungsdauer_min, md.nutzungsdauer_max]).toEqual([8000, 16000, 4000, 12000]);
    expect([md.hg_druck_min, md.hg_druck_max, md.leistung_min, md.leistung_max]).toEqual([1000, 10000, 1000, 30000]);
    expect(new Set(t.rows.map((r) => r.verbatim_quote)).size).toBe(1);
    expect(TAB4_STRAHLER).toHaveLength(2);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.verification_status).toBe('md_verified');
  });

  it('S4_1_2_3 (L488 / L490): mindestbestrahlung 300–450, einzelfall_zehnerpotenz 400–600 (regular) / 700 (Einzelfall); no row for tab2_ausgezeichnet (m205-E-2)', () => {
    const t = s4123AsTable();
    expect(enumValues('M205-10 uv_dosis_zielband')).toEqual([...S4_1_2_3_PROD_TOKENS]);
    expect(t.rows.map((r) => [r.keys.zielband, r.values.dosis_min_j_m2, r.values.dosis_max_regel_j_m2, r.values.dosis_max_j_m2])).toEqual([['mindestbestrahlung', 300, 450, 450], ['einzelfall_zehnerpotenz', 400, 600, 700]]);
    expect(t.rows.find((r) => r.keys.zielband === 'tab2_ausgezeichnet')).toBeUndefined();
    expect(t.override_quote).toBe('Entsprechend den Anforderungen kann die notwendige Mindestbestrahlung aber auch höher liegen.');
    expect(t.verification_status).toBe('md_verified');
  });

  it('S3_3_LOGRED (L354): unrestricted 6–7 (both husbandry tokens), restricted 4 (arbeitsintensiv) / 3 (hoch mechanisiert); keys = prod nutzung × created bewirtschaftung', () => {
    const t = s33LogredAsTable();
    expect(enumValues('M205-05 nutzung')).toEqual(['restricted', 'unrestricted']);
    expect(S3_3_BEWIRTSCHAFTUNG.map((b) => b.value)).toEqual(['arbeitsintensiv', 'hoch_mechanisiert']);
    expect(t.rows.map((r) => [r.row_key, r.values.log_min, r.values.log_max])).toEqual([
      ['unrestricted|arbeitsintensiv', 6, 7], ['unrestricted|hoch_mechanisiert', 6, 7], ['restricted|arbeitsintensiv', 4, 4], ['restricted|hoch_mechanisiert', 3, 3],
    ]);
    expect(t.rows[0].values.empfehlung).toBe('6 bis 7 Log-Stufen');
    expect(t.verification_status).toBe('md_verified');
  });

  it('TABELLE5 (L819–L827, transposed): Straubing / Rottenburg / Ruhleben with the printed flux 50 / 12,5 / 63, areas 300 / 6.720 / 630, costs 0,42 / 0,20 / 0,27', () => {
    const t = tabelle5AsTable();
    expect(t.rows.map((r) => [r.keys.anlage, r.values.typ, r.values.porengroesse_um, r.values.membranflaeche_m2, r.values.permeat_m3_d, r.values.netto_flux, r.values.druck_min, r.values.druck_max, r.values.energie_min, r.values.energie_max, r.values.kosten_eur_m3])).toEqual([
      ['straubing', 'MF', 0.1, 300, 168, 50, 0.2, 2, 0.4, 0.4, 0.42],
      ['rottenburg', 'UF', 0.02, 6720, 3100, 12.5, 0.3, 0.5, 0.115, 0.115, 0.2],
      ['ruhleben', 'MF', 0.2, 630, 960, 63, 0.4, 1.3, 0.15, 0.2, 0.27],
    ]);
    expect(new Set(t.rows.map((r) => r.verbatim_quote)).size).toBe(1);
    expect(t.verification_status).toBe('md_verified');
  });

  it('TABELLE6 (L877–L880) and TABELLE7 (L1021–L1029): the printed study rows; shared multirow span for Tab. 6 rows 3/4; log-Stufen where printed', () => {
    const t6 = tabelle6AsTable();
    expect(t6.rows.map((r) => [r.values.konz_mg_l, r.values.kontaktzeit_min, r.values.parameter, r.values.log_stufen, r.values.quelle])).toEqual([
      [5, 10, 'Gesamt- und Fäkalcoliforme, Fäkale Streptokokken', 3, '[40]'], [7, 5, 'Fäkalcoliforme', null, '[38]'], [null, null, 'Escherichia coli', null, '[30]'], [null, null, 'Enterokokken', null, '[30]'],
    ]);
    expect(t6.rows[2].verbatim_quote).toBe(t6.rows[3].verbatim_quote);
    const t7 = tabelle7AsTable();
    expect(t7.rows.map((r) => [r.values.pes_min, r.values.pes_max, r.values.kontaktzeit_min, r.values.kontaktzeit_max, r.values.log_stufen])).toEqual([
      [15, 15, 36, 36, 4], [5, 7, 60, 60, null], [5, 7, 60, 60, null], [5, 10, 35, 50, 4], [8, 8, 30, 30, 4], [8, 8, 30, 30, 4.2], [10, 10, 10, 10, 3], [400, 400, 20, 20, null], [10, 10, 30, 30, null],
    ]);
    expect(t7.rows[5].values.ergebnis).toBe('~ 4,2 Log-Stufen');
    expect(t6.verification_status).toBe('md_verified');
    expect(t7.verification_status).toBe('md_verified');
  });

  it('TABELLE8_UV / _MEMBRAN / _OZON (L1050–L1058): nine Aspekt rows each, rating glyph kept verbatim incl. the printed "0" (m205-U-2) and "mJ/s" (m205-U-3) → imported_unverified', () => {
    const uv = tabelle8AsTable('uv'); const mem = tabelle8AsTable('membran'); const oz = tabelle8AsTable('ozon');
    expect(TAB8_ASPEKTE.map((a) => a.aspekt)).toEqual(['wirkprinzip', 'praxiserprobung', 'e_coli_erreichbar', 'transformationsprodukte', 'arbeitssicherheit', 'energieeinsatz', 'kosten', 'vorbehandlung', 'zusatzeffekte']);
    expect(uv.rows.map((r) => r.values.bewertung)).toEqual(['o', '+', '+', '+', 'o', '+', '+', '(-)', '0']);
    expect(mem.rows.map((r) => r.values.bewertung)).toEqual(['+', 'o', '+', '+', '0', '0', '-', '(-)', '+']);
    expect(oz.rows.map((r) => r.values.bewertung)).toEqual(['0', '-', '+', '-', '-', '0', '+', '+', '+']);
    const num = (t: RegulationTable, a: string) => { const r = t.rows.find((x) => x.keys.aspekt === a)!; return [r.values.wert_min, r.values.wert_max]; };
    expect([num(uv, 'energieeinsatz'), num(mem, 'energieeinsatz'), num(oz, 'energieeinsatz')]).toEqual([[30, 60], [100, 400], [100, 150]]);
    expect([num(uv, 'kosten'), num(mem, 'kosten'), num(oz, 'kosten')]).toEqual([[0.03, 0.06], [0.2, 0.4], [0.01, 0.05]]);
    expect([num(uv, 'e_coli_erreichbar'), num(mem, 'e_coli_erreichbar'), num(oz, 'e_coli_erreichbar')]).toEqual([[null, 10], [null, 10], [null, 100]]);
    expect(uv.rows[2].values.text).toContain('400 \\mathrm{~mJ} / \\mathrm{s}- 700');
    for (const t of [uv, mem, oz]) expect(t.verification_status).toBe('imported_unverified');
  });

  it('S4_3_3_2 (L899): Reinsauerstoff 10 kWh/kg, 10 kg O2/kg O3, 10–13 % O3, 150–200 g/m³; Luft 16 kWh/kg (= 10 + 60 %, m205-J-3) and no O2 figures; keys = prod ozon_einsatzgas', () => {
    const t = s4332AsTable();
    expect(enumValues('M205-17 ozon_einsatzgas')).toEqual(['luft', 'reiner_sauerstoff']);
    expect(t.rows.map((r) => [r.keys.einsatzgas, r.values.spez_energie_kwh_kg, r.values.aufschlag_pct, r.values.o2_pro_o3_kg, r.values.o3_anteil_min_pct, r.values.o3_anteil_max_pct, r.values.o3_pro_m3_o2_min_g, r.values.o3_pro_m3_o2_max_g])).toEqual([
      ['reiner_sauerstoff', 10, 0, 10, 10, 13, 150, 200], ['luft', 16, 60, null, null, null, null, null],
    ]);
    expect(10 * (1 + 60 / 100)).toBe(16);
    expect(t.verification_status).toBe('md_verified');
  });

  it('S4_4_2 (L973 / L984): Chlorgas and Hypochlorit 1–20 mg/l freies Chlor, 15–30 min, pH 6–8, Restchlor 0,2 (m205-J-2); Chlordioxid 5–10 g/m³, sandfiltriert 1–5, Lösung 1–3 g/l, explosiv > 30 Vol.-%; keys = prod chlormittel_typ', () => {
    const t = s442AsTable();
    expect(enumValues('M205-21 chlormittel_typ')).toEqual(['chlorgas', 'natriumhypochlorit', 'chlordioxid']);
    expect(t.rows.map((r) => [r.keys.chlormittel, r.values.dosis_min, r.values.dosis_max, r.values.dosis_unit, r.values.kontaktzeit_min, r.values.kontaktzeit_max, r.values.ph_min, r.values.ph_max, r.values.restchlor_mg_l])).toEqual([
      ['chlorgas', 1, 20, 'mg/l freies Chlor', 15, 30, 6, 8, 0.2], ['natriumhypochlorit', 1, 20, 'mg/l freies Chlor', 15, 30, 6, 8, 0.2], ['chlordioxid', 5, 10, 'g/m³', null, null, null, null, null],
    ]);
    const clo2 = t.rows[2].values;
    expect([clo2.dosis_sandfiltriert_min, clo2.dosis_sandfiltriert_max, clo2.loesung_g_l_min, clo2.loesung_g_l_max, clo2.explosiv_ab_vol_pct, clo2.log_stufen, clo2.kontaktzeit_text]).toEqual([1, 5, 1, 3, 30, 3, 'wenige Minuten']);
    expect(t.verification_status).toBe('md_verified');
  });

  it('S4_3_3_4 (L931): thermisch 350 °C / ≥ 2 s, katalytisch 60–80 °C, Restozon ≤ 0,02 mg/m³; locked; keys = prod verbrennung_typ', () => {
    const t = s4334AsTable();
    expect(enumValues('M205-18 verbrennung_typ')).toEqual(['thermisch', 'katalytisch']);
    expect(t.rows.map((r) => [r.keys.verbrennung_typ, r.values.temp_min_c, r.values.temp_max_c, r.values.haltezeit_min_s, r.values.restozon_max_mg_m3])).toEqual([['thermisch', 350, null, 2, 0.02], ['katalytisch', 60, 80, null, 0.02]]);
    expect(t.override_policy).toBe('locked');
    expect(t.verification_status).toBe('md_verified');
  });
});
