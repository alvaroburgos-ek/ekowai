/**
 * Plan 3 Task 6 — DWA-M-1200-3 seed tables: shape pins, key-token pins against
 * the captured prod enums (G-A3), the printed values read from the transcript
 * `Desktop\Guidelines\DWA-M-1200-3\DWA-M_1200-3_GD.md` in this session (line
 * in the comment), and the two tables kept `imported_unverified` (m1200_3-U-1:
 * the empty Tab.-8 D/mit cell; m1200_3-U-2: the Tab.-13 "x⁴⁾" OCR variants).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  m12003SeedTables, M12003_EDITION, GUETEKLASSE_TOKENS, SPEICHERTYP_TOKENS, LEITUNGSTYP_TOKENS, FARBE_TOKENS, DESINFEKTION_TOKENS, TAB13_METHODE_TOKENS, TAB14_METHODE_TOKENS,
  PFLANZENTYP_TOKENS, BEWAESSERUNGSVERFAHREN_TOKENS, TAB11_PARAMETER_TOKENS,
  tab3AsTable, tab3MapAsTable, tab789AsTable, tab11AsTable, tab11SalzAsTable, tab6AsTable, tab4AsTable, tab13AsTable, tab14AsTable, tab5BeispielAsTable,
  Q_T7, Q_T8, Q_T9, Q_T11_3, Q_T13_UF, Q_T13_UV, Q_T14_H2O2,
} from '../regulation-tables-seed-m1200_3';
import type { RegulationTable } from '../regulation-tables';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, resolveRegulationTable } from '../regulation-tables-fallback';

const STD = 'DWA-M-1200-3';
const ROOT = join(__dirname, '..', '..', '..', '..');
const prior = JSON.parse(readFileSync(join(ROOT, 'src/lib/eval/field-configs/m1200_3.prior.json'), 'utf8')) as Record<string, { enum_values?: Array<{ value: string }> | null }>;
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
  expect(t.edition).toBe(M12003_EDITION);
  expect(t.override_quote?.trim().length ?? 0).toBeGreaterThan(0);
}

describe('DWA-M-1200-3 Plan-3 seed tables', () => {
  it('ten tables in the live set; registered as SEED_BUILDERS.m1200_3 (ts 20260917100600); edition 2025-07 (title page L7 "Juli 2025"); the fallback resolves each', () => {
    const tables = m12003SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['TAB3', 'TAB3_MAP', 'TAB789', 'TAB11', 'TAB11_SALZ', 'TAB6', 'TAB4', 'TAB13', 'TAB14', 'S_TAB5_BEISPIEL']);
    for (const t of tables) expectWellFormed(t);
    expect(tables.reduce((n, t) => n + t.rows.length, 0)).toBe(3 + 5 + 12 + 17 + 2 + 6 + 2 + 12 + 2 + 1);
    expect(M12003_EDITION).toBe('2025-07');
    expect(SEED_BUILDERS.m1200_3).toEqual({ build: m12003SeedTables, ts: '20260917100600', slugFile: 'm1200_3' });
    expect(liveSeedSlugs()).toContain('m1200_3');
    for (const t of tables) expect(resolveRegulationTable(STD, t.table_code)?.rows.length, t.table_code).toBe(t.rows.length);
    const status = Object.fromEntries(tables.map((t) => [t.table_code, t.verification_status]));
    expect(status).toEqual({ TAB3: 'md_verified', TAB3_MAP: 'md_verified', TAB789: 'imported_unverified', TAB11: 'md_verified', TAB11_SALZ: 'md_verified', TAB6: 'md_verified', TAB4: 'md_verified', TAB13: 'imported_unverified', TAB14: 'md_verified', S_TAB5_BEISPIEL: 'md_verified' });
  });

  it('G-A3: speichertyp / leitungstyp / kennzeichnung_farbe / desinfektion_methode / pflanzentyp / bewaesserungsverfahren / gueteklasse tokens equal the captured prod enum value strings', () => {
    expect([...GUETEKLASSE_TOKENS]).toEqual(enumValues('M12003-01 gueteklasse'));
    expect([...SPEICHERTYP_TOKENS]).toEqual(enumValues('M12003-10 speichertyp'));
    expect([...LEITUNGSTYP_TOKENS]).toEqual(enumValues('M12003-11 leitungstyp'));
    expect(enumValues('M12003-12 kennzeichnung_farbe')).toEqual([...FARBE_TOKENS, 'vergleichbar_violett']); // the third token prints no Tab.-4 row
    expect([...DESINFEKTION_TOKENS]).toEqual(enumValues('M12003-22 desinfektion_methode'));
    expect([...TAB13_METHODE_TOKENS]).toEqual(DESINFEKTION_TOKENS.filter((t) => t !== 'thermisch'));
    expect([...TAB14_METHODE_TOKENS]).toEqual(['chlorung', 'h2o2']);
    expect([...PFLANZENTYP_TOKENS]).toEqual(enumValues('M12003-05 pflanzentyp'));
    expect([...BEWAESSERUNGSVERFAHREN_TOKENS]).toEqual(enumValues('M12003-07 bewaesserungsverfahren'));
    expect(tab3MapAsTable().rows.map((r) => r.keys.speichertyp)).toEqual([...SPEICHERTYP_TOKENS]);
    expect(tab6AsTable().rows.map((r) => r.keys.leitungstyp)).toEqual([...LEITUNGSTYP_TOKENS]);
    expect(tab4AsTable().rows.map((r) => r.keys.farbe)).toEqual([...FARBE_TOKENS]);
    expect(new Set(tab13AsTable().rows.map((r) => r.keys.methode))).toEqual(new Set(TAB13_METHODE_TOKENS));
    expect(tab14AsTable().rows.map((r) => r.keys.methode)).toEqual([...TAB14_METHODE_TOKENS]);
    expect(tab11SalzAsTable().rows.map((r) => r.keys.pflanzentyp)).toEqual([...PFLANZENTYP_TOKENS]);
    expect(tab11AsTable().rows.map((r) => r.keys.parameter)).toEqual([...TAB11_PARAMETER_TOKENS]);
  });

  it('TAB3 (L662–L664): Geschlossene A, B · Offene C, D · Transportbehälter "Nach Bedarf" (all four, J-2); TAB3_MAP maps the five prod tokens onto the Tab.-3 systems', () => {
    const t = tab3AsTable();
    const v = (k: string) => { const r = t.rows.find((x) => x.row_key === k)!; return [r.values.klassen_zulaessig, r.values.allows_a, r.values.allows_b, r.values.allows_c, r.values.allows_d, r.values.bedarf_hinweis]; };
    expect(v('geschlossen')).toEqual(['A, B', true, true, false, false, null]);      // L662
    expect(v('offen')).toEqual(['C, D', false, false, true, true, null]);            // L663
    expect(v('transport')).toEqual(['Nach Bedarf', true, true, true, true, 'Nach Bedarf']); // L664
    expect(t.rows.map((r) => r.label_de)).toEqual(['Geschlossene Speicher', 'Offene Speicher', 'Transportbehälter']);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('Speichertypen entsprechend Tabelle 3 empfohlen'); // L655
    const m = tab3MapAsTable();
    expect(m.rows.map((r) => [r.keys.speichertyp, r.values.system])).toEqual([
      ['offen_ortsfest_kurz', 'offen'], ['offen_ortsfest_lang', 'offen'], ['geschlossen_ortsfest_kurz', 'geschlossen'], ['geschlossen_ortsfest_lang', 'geschlossen'], ['transportbehaelter', 'transport'],
    ]);
    expect(m.rows[0].label_de).toContain('offene ortsfeste Speicher');        // L637
    expect(m.rows[2].label_de).toContain('geschlossene ortsfeste Speicher');  // L641
    expect(m.rows[4].label_de).toBe('I Transportbehälter');                   // L651
    expect(m.override_policy).toBe('locked');
    // the chain the register uses: token → system → allowed classes
    expect(table('TAB3', [String(table('TAB3_MAP', ['geschlossen_ortsfest_lang'])!.system)])!.allows_c).toBe(false);
    expect(table('TAB3', [String(table('TAB3_MAP', ['offen_ortsfest_kurz'])!.system)])!.allows_d).toBe(true);
  });

  it('TAB789 (L929–L930 / L944–L945 / L1047–L1048): A bis C 1 / 1 in every table; D ohne 2 (Tab. 7), 3 (Tab. 8), 2 (Tab. 9); D mit 1 by the printed multirow (Tab. 7 / 9) and NULL for the empty Tab.-8 cell (U-1); anhaltswert; imported_unverified', () => {
    const t = tab789AsTable();
    const f = (k: string) => t.rows.find((r) => r.row_key === k)!.values.faktor;
    expect(['t7', 't8', 't9'].map((tab) => [f(`${tab}|a_c|ohne`), f(`${tab}|a_c|mit`), f(`${tab}|d|ohne`), f(`${tab}|d|mit`)])).toEqual([[1, 1, 2, 1], [1, 1, 3, null], [1, 1, 2, 1]]);
    expect(t.rows.find((r) => r.row_key === 't8|d|mit')!.values.hinweis).toContain('m1200_3-U-1');
    expect(t.rows.find((r) => r.row_key === 't8|d|mit')!.values.gedruckt).toBeNull();
    expect(t.rows.find((r) => r.row_key === 't7|d|ohne')!.values.gedruckt).toBe('2-fache Wurfweite'); // L930
    expect(t.rows.find((r) => r.row_key === 't8|d|ohne')!.values.gedruckt).toBe('3-fache Wurfweite'); // L945
    expect(Q_T7).toContain('\\multirow{2}{*}{ 1-fache Wurfweite }');   // L929: the "mit Spritzschutz" cell spans both rows
    expect(Q_T9).toContain('\\multirow{2}{*}{ 1-fache Wurfweite }');   // L1047
    expect(Q_T8).toContain('\\hline D & 3-fache Wurfweite & \\\\');   // L945: the "mit" cell is empty
    expect(Q_T8).not.toContain('multirow');
    expect(t.rows.filter((r) => r.keys.tabelle === 't7').every((r) => r.verbatim_quote === Q_T7)).toBe(true);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('muss im RMP erfolgen'); // L1040
    expect(t.verification_status).toBe('imported_unverified');
    expect(table('TAB789', ['t9', 'd', 'ohne'])!.faktor).toBe(2);
  });

  it('TAB11 (L1358–L1366): 17 parameters with the printed tolerance values; the three (*) rows split by Pflanzentyp; pH 5,0–9,5 as a range; TAB11_SALZ transposes the (*) pairs onto the prod pflanzentyp tokens', () => {
    const t = tab11AsTable();
    const v = (p: string) => { const r = t.rows.find((x) => x.row_key === p)!; return [r.values.limit_salzempfindlich, r.values.limit_salzunempfindlich, r.values.unit, r.values.comparator]; };
    expect(v('kalium')).toEqual([200, 200, 'mg/l', '<=']);          // L1358
    expect(v('natrium')).toEqual([100, 100, 'mg/l', '<=']);         // L1359
    expect(v('chlorid')).toEqual([250, 500, 'mg/l', 'max_pair']);   // L1360 "250 / 500(*)"
    expect(v('sulfat')).toEqual([1200, 1200, 'mg/l', '<=']);        // L1361 "1.200"
    expect(v('nitrat')).toEqual([300, 300, 'mg/l', '<=']);          // L1362
    expect(v('ph')).toEqual([null, null, '-', 'range']);            // L1363 "5,0-9,5"
    expect([t.rows.find((x) => x.row_key === 'ph')!.values.ph_min, t.rows.find((x) => x.row_key === 'ph')!.values.ph_max]).toEqual([5, 9.5]);
    expect(v('wasserhaerte')).toEqual([30, 60, '°dH', 'max_pair']); // L1364 "30 / 60(*)"
    expect(v('leitfaehigkeit')).toEqual([2000, 3000, 'µS/cm', 'max_pair']); // L1365 "2.000 / 3.000(*)"
    expect(v('blei')).toEqual([100, 100, 'µg/l', '<=']);            // L1358
    expect(v('cadmium')).toEqual([2, 2, 'µg/l', '<=']);             // L1359
    expect(v('chrom')).toEqual([100, 100, 'µg/l', '<=']);           // L1360
    expect(v('eisen')).toEqual([1500, 1500, 'µg/l', '<=']);         // L1361 "1.500"
    expect(v('kupfer')).toEqual([100, 100, 'µg/l', '<=']);          // L1362
    expect(v('mangan')).toEqual([1500, 1500, 'µg/l', '<=']);        // L1363 "1.500"
    expect(v('nickel')).toEqual([40, 40, 'µg/l', '<=']);            // L1364
    expect(v('quecksilber')).toEqual([0.5, 0.5, 'µg/l', '<=']);     // L1365 "0,5"
    expect(v('zink')).toEqual([300, 300, 'µg/l', '<=']);            // L1366
    expect(t.rows.filter((r) => r.values.salzabhaengig).map((r) => r.row_key)).toEqual(['chlorid', 'wasserhaerte', 'leitfaehigkeit']);
    expect(t.rows.find((r) => r.row_key === 'chlorid')!.values.gedruckt).toBe('$250 / 500^{(*)} \\mathrm{mg} / \\mathrm{l}$');
    expect(Q_T11_3).toContain('Chlorid & $250 / 500^{(*)} \\mathrm{mg} / \\mathrm{l}$ & Chrom');
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('Toleranzbereiche für chemische und sonstige Parameter'); // L1352
    expect(t.override_quote).toContain('fallspezifisch zu ermitteln');                          // L1376
    const s = tab11SalzAsTable();
    expect(s.rows.map((r) => [r.keys.pflanzentyp, r.values.cl_max, r.values.haerte_max, r.values.lf_max])).toEqual([['salzempfindlich', 250, 30, 2000], ['salzunempfindlich', 500, 60, 3000]]);
    expect(s.rows[0].verbatim_quote).toBe('(*) salzempfindliche/salzunempfindliche Pflanzen.'); // L1369
    expect(table('TAB11_SALZ', ['salzunempfindlich'])!.cl_max).toBe(500);
  });

  it('TAB6 (L843–L848): the six pipe rows with material / installation € and kWh p.a. at 2 / 4 / 6 bar per 1.000 m; anhaltswert', () => {
    const t = tab6AsTable();
    const v = (k: string) => { const r = t.rows.find((x) => x.row_key === k)!; return [r.values.material_eur, r.values.einbau_eur, r.values.kwh_2bar, r.values.kwh_4bar, r.values.kwh_6bar]; };
    expect(v('PVC_DN125_PN10')).toEqual([5180, 9800, 1177, 1858, 2539]);    // L843
    expect(v('PVC_DN160_PN10')).toEqual([7780, 10590, 833, 1514, 2195]);    // L844
    expect(v('PVC_DN225_PN10')).toEqual([15330, 11090, 713, 1394, 2076]);   // L845
    expect(v('PVC_DN280_PN10')).toEqual([23140, 11830, 695, 1376, 2057]);   // L846
    expect(v('PVC_DN315_PN10')).toEqual([26390, 12830, 690, 1372, 2053]);   // L847
    expect(v('PVC_DN400_PN10')).toEqual([44600, 15300, 686, 1368, 2049]);   // L848
    expect(t.rows.map((r) => r.label_de)).toEqual(['PVC DN 125 PN10', 'PVC DN 160 PN10', 'PVC DN 225 PN10', 'PVC DN 280 PN10', 'PVC DN 315 PN10', 'PVC DN 400 PN10']);
    expect(t.rows.every((r) => r.values.basis_laenge_m === 1000)).toBe(true);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('Stand Q3/2022, Beispiel ländlicher Raum Berlin-Brandenburg'); // L838
    expect(t.override_quote).toContain('Leitungslänge 1.000 m ohne Bögen');                          // L851
  });

  it('TAB4 (L727–L728): Pantone Purple 522C #CC99CC / 186, 156, 197 / 17, 37, 0, 0 / #BA9CC5 and 512C #663366 / 131,49,119 / 0,63, 9, 49 / #833177; locked', () => {
    const t = tab4AsTable();
    expect(t.rows.map((r) => [r.values.name, r.values.websafe_hex, r.values.rgb, r.values.cmyk, r.values.hex])).toEqual([
      ['Pantone Purple 522C', '#CC99CC', '186, 156, 197', '17, 37, 0, 0', '#BA9CC5'],
      ['Pantone Purple 512C', '#663366', '131,49,119', '0,63, 9, 49', '#833177'],
    ]);
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('als Hintergrund zu nutzen (siehe Tabelle 4)'); // L720
  });

  it('TAB13 (L1557–L1580): geschlossen allows all four moments for every method, offen only "mit Start der Bewässerung" and "Befüllen von Transportbehältern"; UF / UV filling+storage under the note-4 circulation condition (U-2); locked; imported_unverified', () => {
    const t = tab13AsTable();
    const v = (k: string) => { const r = t.rows.find((x) => x.row_key === k)!; return [r.values.befuellung, r.values.speicherung, r.values.start, r.values.transport, r.values.umwaelzung_bedingung]; };
    for (const m of ['chlorung', 'ozonung', 'pes', 'h2o2']) {
      expect(v(`${m}|geschlossen`), m).toEqual([true, true, true, true, false]);
      expect(v(`${m}|offen`), m).toEqual([false, false, true, true, false]);
    }
    for (const m of ['ultrafiltration', 'uv']) {
      expect(v(`${m}|geschlossen`), m).toEqual([true, true, true, true, true]);  // "x⁴⁾" cells (U-2)
      expect(v(`${m}|offen`), m).toEqual([false, false, true, true, false]);
    }
    expect(Q_T13_UF).toContain('$\\mathrm{x}^{4)}$');
    expect(Q_T13_UF).toContain('$x^{4!}$');
    expect(Q_T13_UV).toContain('$x^{41}$');
    expect(t.rows.find((r) => r.row_key === 'ultrafiltration|geschlossen')!.values.gedruckt).toBe('$\\mathrm{x}^{4)}$ | $x^{4!}$ | x | x');
    expect(t.rows.find((r) => r.row_key === 'chlorung|offen')!.values.gedruckt).toBe('– | – | x | x');
    expect(t.rows.map((r) => r.group_label).filter((g, i, a) => a.indexOf(g) === i)).toEqual(['Chlorung ${ }^{31}$', 'Ozonung ${ }^{11,31}$', 'Peressigsäure (PES-)Behandlung', 'Ultrafiltration', 'UV-Bestrahlung', 'Wasserstoffperoxid ( $\\mathrm{H}_{2} \\mathrm{O}_{2}$ ) Behandlung ${ }^{21,3)}$']); // the printed multirow labels (L1557 / L1561 / L1565 / L1569 / L1573 / L1577)
    expect(t.override_policy).toBe('locked');
    expect(t.override_quote).toContain('Mögliche und zulässige Maßnahmen zur Desinfektion');           // L1553
    expect(t.override_quote).toContain('mit anderen als in Tabelle 14 genannten Mitteln wird nicht empfohlen'); // L1596
    expect(t.verification_status).toBe('imported_unverified');
    expect(table('TAB13', ['uv', 'offen'])!.befuellung).toBe(false);
  });

  it('TAB14 (L1741–L1742): Chlorung 30 mg/l · Wasserstoffperoxid 0,1 ml/l (bzw. 1 l pro 10 m³) · 12 h bis 24 h each; anhaltswert', () => {
    const t = tab14AsTable();
    expect(t.rows.map((r) => [r.keys.methode, r.values.konzentration, r.values.konz_unit, r.values.verweilzeit_min_h, r.values.verweilzeit_max_h, r.values.verweilzeit_text])).toEqual([
      ['chlorung', 30, 'mg/l', 12, 24, '12 h bis 24 h'], ['h2o2', 0.1, 'ml/l', 12, 24, '12 h bis 24 h'],
    ]);
    expect(t.rows[1].values.konz_text).toBe('$0,1 \\mathrm{ml} / \\mathrm{l}$ bzw. 1 l pro $10 \\mathrm{~m}^{3}$');
    expect(Q_T14_H2O2).toContain('Wasserstoffperoxid-Anwendung & $0,1');
    expect(t.rows.map((r) => r.label_de)).toEqual(['Chlorung', 'Wasserstoffperoxid-Anwendung']);
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toContain('Empfohlene Desinfektionsmaßnahmen von Tropf- oder Mikrosprühbewässerungssystemen'); // L1738
    expect(t.override_quote).toContain('dürfen nicht gleichzeitig ausgeführt werden');                                   // L1726
  });

  it('S_TAB5_BEISPIEL (L797–L806): 10 ha · 20 mm · 2000 m³ · 2000 m³ · 50 m³/h · 40 h · 20 m³/h · 100 h as one example row; anhaltswert', () => {
    const t = tab5BeispielAsTable();
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0].values).toEqual({ flaeche_ha: 10, bewaesserungshoehe_mm: 20, gesamtbedarf_m3: 2000, speichervolumen_min_m3: 2000, pumpenleistung_m3_h: 50, dauer_durchgang_h: 40, zulauf_m3_h: 20, dauer_befuellung_h: 100 });
    expect(t.override_policy).toBe('anhaltswert');
    expect(t.override_quote).toBe('Für die Dimensionierungen von Speichern ist das Beispiel der Tabelle 5 als Orientierung dienlich.'); // L790
    expect(table('S_TAB5_BEISPIEL', ['normgroesse'])!.bewaesserungshoehe_mm).toBe(20);
    // the printed arithmetic of Gl-Helper-1: 20 mm × 10 ha × 10 = 2000 m³
    expect(20 * 10 * 10).toBe(t.rows[0].values.gesamtbedarf_m3);
  });
});
