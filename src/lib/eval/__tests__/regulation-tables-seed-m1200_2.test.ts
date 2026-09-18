/**
 * Plan 3 Task 16 — DWA-M-1200-2 seed builders: every cell pinned against the
 * printed transcript line it was lifted from (the spans live in `Q`, cut by
 * line number), the policy cues, the verification statuses (U-1 … U-4 keep
 * three tables `imported_unverified`), the key vocabularies, and the
 * fallback registry serving every table under the standard code.
 */
import { describe, it, expect } from 'vitest';
import {
  Q, M12002_EDITION, KLASSE_TOKENS, ORGANISMUS_TOKENS, STUFE_TOKENS, TAB6_TOKENS, TAB4_TOKENS, KOSTEN_TOKENS, TABE1_TOKENS,
  tab3AsTable, s333AsTable, anhangC1AsTable, glC21AsTable, tab4AsTable, tab6AsTable, tabB2AsTable, s82KostenAsTable, tabE1StufenAsTable, tabE1LeistungAsTable, m12002SeedTables,
} from '../regulation-tables-seed-m1200_2';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup } from '../regulation-tables-fallback';

const STD = 'DWA-M-1200-2';
const row = (t: { rows: Array<{ row_key: string; values: Record<string, unknown>; verbatim_quote: string }> }, key: string) => t.rows.find((r) => r.row_key === key)!;

describe('DWA-M-1200-2 seed builders (Plan 3 Task 16)', () => {
  it('ten tables under the standard code and the printed edition; statuses and policies as ruled; every quote non-empty', () => {
    const t = m12002SeedTables();
    expect(t.map((x) => x.table_code)).toEqual(['TAB3', 'S3_3_3', 'ANHANGC1', 'GL_C2_1', 'TAB4', 'TAB6', 'TABB2', 'S8_2_KOSTEN', 'TABE1_STUFEN', 'TABE1_LEISTUNG']);
    expect(M12002_EDITION).toBe('2025-07'); // L9 "Juli 2025" under L11 "Entwurf"
    expect(Q.L9).toBe('Juli 2025');
    expect(Q.L11).toBe('\\section*{Entwurf}');
    for (const x of t) {
      expect(x.standard_code).toBe(STD);
      expect(x.edition).toBe('2025-07');
      for (const r of x.rows) expect(r.verbatim_quote.trim().length, `${x.table_code} ${r.row_key}`).toBeGreaterThan(0);
    }
    expect(Object.fromEntries(t.map((x) => [x.table_code, x.verification_status]))).toEqual({
      TAB3: 'imported_unverified', S3_3_3: 'md_verified', ANHANGC1: 'md_verified', GL_C2_1: 'md_verified', TAB4: 'imported_unverified',
      TAB6: 'imported_unverified', TABB2: 'imported_unverified', S8_2_KOSTEN: 'md_verified', TABE1_STUFEN: 'md_verified', TABE1_LEISTUNG: 'imported_unverified',
    });
    expect(Object.fromEntries(t.map((x) => [x.table_code, x.override_policy]))).toEqual({
      TAB3: 'locked', S3_3_3: 'locked', ANHANGC1: 'locked', GL_C2_1: 'locked', TAB4: 'locked',
      TAB6: 'anhaltswert', TABB2: 'anhaltswert', S8_2_KOSTEN: 'anhaltswert', TABE1_STUFEN: 'anhaltswert', TABE1_LEISTUNG: 'anhaltswert',
    });
    expect(t.reduce((n, x) => n + x.rows.length, 0)).toBe(58);
  });

  it('TAB3: one row per prod class token; A / B / C / D cells as printed (L549–L552, L553–L554, L555–L556, L570–L573); B-2 / C-2 / D without targets', () => {
    const t = tab3AsTable();
    expect(t.rows.map((r) => r.keys.klasse)).toEqual([...KLASSE_TOKENS]);
    const A = row(t, 'A'), B1 = row(t, 'B-1'), B2 = row(t, 'B-2'), C1 = row(t, 'C-1'), C2 = row(t, 'C-2'), D = row(t, 'D');
    expect(A.values).toMatchObject({ e_coli_max: 10, enterokokken_max: 100, bsb5_max: 10, afs_max: 10, truebung_max: 2, legionella_max: 1000, nematoden_max: 1, log10_e_coli: 5, log10_somatische_coliphagen: 6, log10_f_coliphagen: 6, log10_clostridium: 4, log10_sulfatreduzierer: 5, leistungsziele: 1 });
    expect(B1.values).toMatchObject({ e_coli_max: 100, enterokokken_max: 100, bsb5_max: null, afs_max: 10, truebung_max: 2, log10_e_coli: 5, leistungsziele: 1 });
    expect(B2.values).toMatchObject({ e_coli_max: 100, enterokokken_max: 100, log10_e_coli: null, log10_clostridium: null, leistungsziele: 0 });
    expect(C1.values).toMatchObject({ e_coli_max: 100, enterokokken_max: 400, afs_max: 10, truebung_max: 2, log10_e_coli: 5, leistungsziele: 1 });
    expect(C2.values).toMatchObject({ e_coli_max: 100, enterokokken_max: 400, log10_e_coli: null, leistungsziele: 0 });
    expect(D.values).toMatchObject({ e_coli_max: 10000, enterokokken_max: null, bsb5_max: null, afs_max: null, truebung_max: null, legionella_max: 1000, nematoden_max: 1, log10_e_coli: null, leistungsziele: 0 });
    expect(D.values.zielvorgabe).toBe('Mechanischbiologische Behandlung, Desinfektion'); // L570 — no Filtration (L894: "für die Wassergüteklasse D ist sie optional")
    expect(A.values.zielvorgabe).toBe('Mechanisch－ biologische Behandlung， Filtration， Desinfektion');
    expect(B1.values.bsb5_text).toBe('$\\mathrm{BSB}_{5}$ gemäß Richtlinie 91／271／EWG'); // bare pointer, never expanded
    expect(D.values.bsb5_text).toBe('$\\mathrm{BSB}_{5}$ und AFS gemäß Richtlinie 91/271/EWG');
    expect(A.values.legionella_bedingung).toBe('wenn das Risiko der Aerosolbil－ dung besteht');
    expect(A.values.nematoden_bedingung).toBe('für die Bewässerung von Weide－ flächen oder Futterpflanzen');
    // the sub-classes share their printed row (same span); the printed "－" lines are inside those spans
    expect(B1.verbatim_quote).toBe(B2.verbatim_quote);
    expect(B2.verbatim_quote).toContain('B－2： －');
    expect(C1.verbatim_quote).toBe(C2.verbatim_quote);
    expect(C2.verbatim_quote).toContain('C－2：－');
    expect(A.verbatim_quote).toBe(Q.L549_552);
    expect(D.verbatim_quote).toBe(Q.L570_573);
    // U-1 / U-2: the class column prints glyphs, the C-row AFS unit prints "mg/e"; the table stays unverified
    expect(A.verbatim_quote.startsWith('\\hline く &')).toBe(true);
    expect(C1.verbatim_quote).toContain('AFS $\\leq 10 \\mathrm{mg} / \\mathrm{e}^{\\mathrm{e}}$');
    expect(t.verification_status).toBe('imported_unverified');
    expect(t.override_quote).toContain('Mindestanforderungen');           // L544
    expect(t.override_quote).toContain('müssen in mindestens $90 \\%$ der Proben eingehalten werden'); // L534
  });

  it('S3_3_3 (L681 / L683): 16 samples, 15 of 16 & 1,0 log10 for A, 8 of 16 & 2,0 log10 for B-1 / C-1, no row for B-2 / C-2 / D; the "< 1 KBE bzw. PFU" clause', () => {
    const t = s333AsTable();
    expect(t.rows.map((r) => r.row_key)).toEqual(['A', 'B-1', 'C-1']);
    expect(row(t, 'A').values).toMatchObject({ n_total: 16, n_pass_min: 15, max_shortfall_log10: 1 });
    expect(row(t, 'B-1').values).toMatchObject({ n_total: 16, n_pass_min: 8, max_shortfall_log10: 2 });
    expect(row(t, 'C-1').values).toMatchObject({ n_total: 16, n_pass_min: 8, max_shortfall_log10: 2 });
    expect(row(t, 'A').verbatim_quote).toBe(Q.L681);
    expect(row(t, 'C-1').verbatim_quote).toBe(Q.L683);
    expect(String(row(t, 'A').values.nachweisgrenze_regel)).toContain('< 1 KBE bzw. PFU je 100 ml Probenvolumen vorliegt');
    expect(Q.L679).toContain('sind je 16 korrespondierende Proben im Zulauf und Ablauf zu nehmen');
    expect(t.override_policy).toBe('locked');
  });

  it('ANHANGC1 (L1800 / L1802): 10th percentile for A, 50th (median) for B-1 / C-1; GL_C2_1 (L1822): k = 1,282', () => {
    const c = anhangC1AsTable();
    expect(c.rows.map((r) => [r.row_key, r.values.percentile])).toEqual([['A', 10], ['B-1', 50], ['C-1', 50]]);
    expect(String(row(c, 'B-1').values.kriterium)).toBe('Das 50. Perzentil (Median) der Verteilung der $\\log _{10}$-Reduktionen muss das Leistungsziel erreichen oder übersteigen.');
    const k = glC21AsTable();
    expect(k.rows).toHaveLength(1);
    expect(k.rows[0].values).toMatchObject({ wert: 1.282, gedruckt: '10. Perzentil $=\\mathrm{MW}-1,282 \\cdot \\mathrm{SD}$' });
    expect(Q.L1860).toBe('\\hline k-Faktor & k & 1,282 \\\\');
    expect(Q.L1823).toBe('50. Perzentil = Median (Klassen B-1 und C-1)');
  });

  it('TABB2 (L1753–L1774): twelve stages, erreichbar numbers and erwartbar text / bounds as printed; multicolumn cells shared by the three groups; MF/UF viruses "0 d)"; Chlor Ct condition in the note', () => {
    const t = tabB2AsTable();
    expect(t.rows.map((r) => r.keys.stufe)).toEqual([...STUFE_TOKENS]);
    expect(row(t, 'mechanisch').values).toMatchObject({ viren_erreichbar: 0, protozoen_erreichbar: 0, bakterien_erreichbar: 0, viren_erwartbar_min: 0, viren_erwartbar_max: 0, erwartbar_gemeinsam: false });
    expect(row(t, 'biologisch').values).toMatchObject({ viren_erreichbar: 2, protozoen_erreichbar: 2, bakterien_erreichbar: 2, viren_erwartbar_text: '0,5-1', viren_erwartbar_min: 0.5, viren_erwartbar_max: 1, bakterien_erwartbar_text: '1-2', bakterien_erwartbar_min: 1, bakterien_erwartbar_max: 2 });
    expect(row(t, 'koagulation_flockung_filtration').values).toMatchObject({ viren_erreichbar: 2, protozoen_erreichbar: 4, bakterien_erreichbar: 4, protozoen_erwartbar_text: '2,5-4', protozoen_erwartbar_min: 2.5, protozoen_erwartbar_max: 4 });
    expect(row(t, 'mbr').values).toMatchObject({ viren_erreichbar: 6, protozoen_erreichbar: 6, bakterien_erreichbar: 6, viren_erwartbar_text: '1,5-4', protozoen_erwartbar_text: '2-4' });
    expect(row(t, 'mf_uf').values).toMatchObject({ viren_erreichbar: 3, protozoen_erreichbar: 6, bakterien_erreichbar: 6, viren_erwartbar_text: '$0{ }^{\\text {dl }}$', viren_erwartbar_min: 0, viren_erwartbar_max: 0, protozoen_erwartbar_min: 4, bakterien_erwartbar_min: 4 });
    expect(row(t, 'ozon').values).toMatchObject({ viren_erreichbar: 4, protozoen_erreichbar: 3, bakterien_erreichbar: 4, viren_erwartbar_min: 4, protozoen_erwartbar_min: 0, bakterien_erwartbar_min: 4 });
    expect(row(t, 'ro').values).toMatchObject({ viren_erreichbar: 6, viren_erwartbar_text: '1,5-4', protozoen_erwartbar_text: '1,5-4', bakterien_erwartbar_text: '1,5-4', viren_erwartbar_min: 1.5, viren_erwartbar_max: 4, erwartbar_gemeinsam: true });
    expect(row(t, 'uv').values).toMatchObject({ viren_erreichbar: 6, viren_erwartbar_min: 4, viren_erwartbar_max: 4, erwartbar_gemeinsam: true });
    expect(row(t, 'uv_aop').values).toMatchObject({ viren_erwartbar_text: '4-6', viren_erwartbar_min: 4, viren_erwartbar_max: 6, erwartbar_gemeinsam: true });
    expect(row(t, 'chlor').values).toMatchObject({ viren_erreichbar: 6, protozoen_erreichbar: 0, bakterien_erreichbar: 6, viren_erwartbar_min: 4, protozoen_erwartbar_min: 0, bakterien_erwartbar_min: 4, erwartbar_gemeinsam: false });
    expect(String(row(t, 'chlor').values.anmerkung)).toContain('$\\geqslant 15 \\mathrm{mg} \\cdot \\mathrm{min} / \\mathrm{l}'); // Ct ≥ 15 mg·min/l
    expect(String(row(t, 'chlor').values.anmerkung)).toContain('pH -Wert $\\leqslant 7,5$');
    expect(row(t, 'boden_aquifer').values).toMatchObject({ viren_erreichbar: 6, viren_erwartbar_text: 'systemspezifisch', viren_erwartbar_min: null, viren_erwartbar_max: null });
    expect(row(t, 'teiche').values).toMatchObject({ viren_erreichbar: 5, protozoen_erreichbar: 5, bakterien_erreichbar: 5, bakterien_erwartbar_text: 'systemspezifisch', bakterien_erwartbar_min: null });
    expect(t.override_quote).toContain('Indikative'); // L1748
    expect(t.override_quote).toContain('können als Alternativvariante'); // L659
    // U-6: the Anmerkung text cells carry the OCR "l" for "("; the numeric cells above are clean
    expect(String(row(t, 'chlor').values.anmerkung)).toContain('lund Bakterien)');
    expect(String(row(t, 'teiche').values.anmerkung)).toContain('lunter Berücksichtigung');
    expect(t.verification_status).toBe('imported_unverified');
  });

  it('TAB6 (L1300–L1319): eight stages; MF/UF Trübung online + Integritätsmessung täglich (printed lines); MBR online / wöchentlich split is U-3; Chlor "Online oder zumindest täglich"', () => {
    const t = tab6AsTable();
    expect(t.rows.map((r) => r.keys.stufe)).toEqual([...TAB6_TOKENS]);
    expect(row(t, 'mf_uf').values).toMatchObject({ parameter_online: 'Trübung', parameter_periodisch: 'Integritätsmessung (z. B. Druckhaltetest)', frequenz_online: 'Online', frequenz_periodisch: 'Täglich' });
    expect(row(t, 'mbr').values).toMatchObject({ parameter_online: 'pH-Wert, Sauerstoff im Bioreaktor, Transmembrandruck, Durchfluss, Trübung', parameter_periodisch: 'Schlammalter, hydraulischer Verweilzeit, Trockensubstanz (TS) im Belebungsbecken', frequenz_online: 'Online', frequenz_periodisch: 'Wöchentlich' });
    expect(String(row(t, 'mbr').values.parameter_gedruckt)).toBe('pH-Wert, Sauerstoff im Bioreaktor, Transmembrandruck, Durchfluss, Trübung Schlammalter, hydraulischer Verweilzeit, Trockensubstanz (TS) im Belebungsbecken'); // the lost line break (U-3)
    expect(row(t, 'medienfiltration').values).toMatchObject({ parameter_online: 'Trübung, Durchfluss', parameter_periodisch: null, frequenz_online: 'Online', frequenz_periodisch: null });
    expect(row(t, 'ozon').values).toMatchObject({ parameter_online: 'Spezifische Ozondosis oder $\\triangle \\mathrm{SAK}_{254}$ Temperatur, pH, Trübung', frequenz_gedruckt: 'Online / Online' });
    expect(row(t, 'ro').values.parameter_online).toBe('Elektrische Leitfähigkeit oder TOC oder DOC');
    expect(row(t, 'uv').values.parameter_online).toBe('UV-Intensität, UV-Transmission, Durchfluss');
    expect(row(t, 'chlor').values).toMatchObject({ parameter_online: 'Freies Restchlor und Kontaktzeit, pH-Wert, Temperatur', frequenz_online: 'Online oder zumindest täglich' });
    expect(t.verification_status).toBe('imported_unverified');
    expect(t.override_quote).toContain('Beispiel für Betriebsparameter'); // L1297
    expect(Q.L663).toContain('Es sind mindestens die Betriebsparameter gemäß Tabelle 6 zu berücksichtigen'); // O-2 cue
  });

  it('TAB4 (L761–L816): eight stages with the four printed text cells; the MBR stage joins its two printed rows; UV names the 40 mJ/cm² reference dose', () => {
    const t = tab4AsTable();
    expect(t.rows.map((r) => r.keys.stufe)).toEqual([...TAB4_TOKENS]);
    expect(row(t, 'belebung').values).toMatchObject({ bezeichnung: 'Belebungsverfahren', einflussfaktoren: 'Stark fallspezifisch', referenz: 'WaterRF (2023a)' });
    expect(String(row(t, 'belebung').values.methodik)).toBe('Option A: Analyse historischer Betriebsdaten\nOption B: Fallspezifische Validierung mit einer Vor-Ort-Monitoringkampagne');
    expect(String(row(t, 'mbr').values.methodik)).toContain('Stufe 1: Analyse historischer Betriebsdaten');
    expect(String(row(t, 'mbr').values.methodik)).toContain('Stufe 3: Bestimmung einer Korrelation'); // second printed row (L770–L774)
    expect(String(row(t, 'uv').values.methodik)).toContain('Nachweis einer Referenzdosis $\\geqslant 40 \\mathrm{~mJ} / \\mathrm{cm}^{2}$');
    expect(String(row(t, 'chlor').values.einflussfaktoren)).toContain('Ct-Wert = Konzentration • Kontaktzeit');
    expect(String(row(t, 'ozon').values.methodik)).toContain('Der Reaktor muss hydraulisch charakterisiert sein');
    expect(String(row(t, 'mf_uf').values.einflussfaktoren)).toContain('Permeatfluss, Transmembrandruck');
    expect(row(t, 'schnellsand').values.referenz).toBe('WaterRF (2023), US EPA: 1991, DVGW W 213-3 (A)');
    expect(t.override_policy).toBe('locked'); // m1200_2-O-1
    // U-5: the printed text cells carry the OCR "l" for "(" — kept verbatim, table unverified
    expect(row(t, 'chlor').values.bezeichnung).toBe('Chlorbasierte Desinfektion lanalog auch andere chemische Desinfektion)');
    expect(String(row(t, 'ro_nf').values.mechanismen)).toContain('laus Polyamid)');
    expect(t.verification_status).toBe('imported_unverified');
  });

  it('S8_2_KOSTEN (L1453–L1458, L1464, L1465): min / max €/m³ SW per stage, 2020 index, "zusätzlich" flag', () => {
    const t = s82KostenAsTable();
    expect(t.rows.map((r) => r.keys.stufe)).toEqual([...KOSTEN_TOKENS]);
    expect(t.rows.map((r) => [r.values.kosten_min_eur_m3, r.values.kosten_max_eur_m3, r.values.zusaetzlich])).toEqual([[0.7, 1.6, false], [0.15, 0.2, true], [0.03, 0.06, true], [0.03, 0.06, true], [0.08, 0.22, true], [0.08, 0.35, true], [0.85, 1.7, false], [0.05, 0.2, true]]);
    expect(row(t, 'mbr').values.bezeichnung).toBe('Membranbelebungsverfahren');
    expect(row(t, 'mech_bio').values.bezugsjahr).toBe(2020);
    expect(t.override_quote).toContain('grobe Richtwerte'); // L1450
  });

  it('TABE1_STUFEN / TABE1_LEISTUNG (L2167–L2185): the Schweinfurt example; Clostridium prints "24,7" → null (U-4)', () => {
    const s = tabE1StufenAsTable();
    expect(s.rows.map((r) => r.keys.stufe)).toEqual([...TABE1_TOKENS]);
    expect(String(row(s, 'mf_uf').values.betriebsbedingungen)).toContain('0,2 NTU (max.)');
    expect(String(row(s, 'uv').values.auslegung)).toContain('UV-Dosis $=400 \\mathrm{~J} / \\mathrm{m}^{2}$ bis $500 \\mathrm{~J} / \\mathrm{m}^{2}$');
    expect(String(row(s, 'bak').values.betriebsbedingungen)).toContain('EBCT $=25 \\mathrm{~min}$');
    expect(row(s, 'biologisch').values.betriebsbedingungen).toBe('-');
    const l = tabE1LeistungAsTable();
    expect(l.rows.map((r) => [r.keys.organismus, r.values.p10_log10, r.values.proben_gedruckt])).toEqual([['e_coli', 6.4, '20/20'], ['somatische_coliphagen', 5.1, '(11/11) ${ }^{\\text {a) }}$'], ['f_spez_coliphagen', 4.2, '(11/11) ${ }^{\\text {a) }}$'], ['clostridium', null, '12/13']]);
    expect(row(l, 'clostridium').values.p10_gedruckt).toBe('24,7 (Leistungsziel erreicht)');
    expect(l.verification_status).toBe('imported_unverified');
    expect(ORGANISMUS_TOKENS.slice(0, 4)).toEqual(l.rows.map((r) => r.keys.organismus));
  });

  it('the printed Anhang C.2 example (L1830–L1832, L1844–L1846, L1858–L1862) is lifted for the equation pins', () => {
    expect(Q.L1830).toContain('8 , 4');  // x_1 = 8,4 · 10^5
    expect(Q.L1832).toContain('7,2 \\cdot 10^{5}'); // x_3
    expect(Q.L1832).toContain('y}_{3}<0,05');
    expect([Q.L1844, Q.L1845, Q.L1846]).toEqual(['\\hline $\\operatorname{LRV}_{1}=6,45$ \\\\', '\\hline $\\operatorname{LRV}_{2}=6,51$ \\\\', '\\hline $\\operatorname{LRV}_{3}>7,16$ \\\\']);
    expect([Q.L1858, Q.L1859, Q.L1861, Q.L1862]).toEqual(['\\hline Mittelwert & MW & 6,58 \\\\', '\\hline Standardabweichung & SD & 0,30 \\\\', '\\hline 10. Perzentil & & 6,20 \\\\', '\\hline Leistungsziel & & 6,00 \\\\']);
  });

  it('registry: m1200_2 is a live SEED_BUILDERS entry (ts 20260917101600) and the fallback resolves every table by standard code', () => {
    expect(SEED_BUILDERS.m1200_2).toMatchObject({ ts: '20260917101600', slugFile: 'm1200_2' });
    expect(liveSeedSlugs()).toContain('m1200_2');
    const lookup = makeTableLookup(STD);
    expect(lookup('TAB3', ['A'])?.log10_e_coli).toBe(5);
    expect(lookup('TAB3', ['B-2'])?.log10_e_coli).toBeNull();
    expect(lookup('S3_3_3', ['A'])?.n_pass_min).toBe(15);
    expect(lookup('S3_3_3', ['B-2'])).toBeUndefined();
    expect(lookup('ANHANGC1', ['C-1'])?.percentile).toBe(50);
    expect(lookup('GL_C2_1', ['k'])?.wert).toBe(1.282);
    expect(lookup('TABB2', ['chlor'])?.protozoen_erreichbar).toBe(0);
    expect(lookup('TAB6', ['mf_uf'])?.frequenz_periodisch).toBe('Täglich');
    expect(lookup('TAB6', ['biologisch'])).toBeUndefined(); // Tab. 6 prints no biological-stage row
    expect(lookup('S8_2_KOSTEN', ['uv'])?.kosten_max_eur_m3).toBe(0.06);
  });
});
