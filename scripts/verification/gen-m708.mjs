#!/usr/bin/env node
// Generator for the DWA-M-708 md-verification pack. Quotes are SLICED VERBATIM out of the
// mathpix LaTeX transcript by line + start/end marker, so no symbol is ever re-typed.
import fs from 'node:fs';

const MD = 'C:/Users/Ekowai/Desktop/Guidelines/DWA-M-708/DWA-M_708_GD.md';
const JSONF = 'C:/Users/Ekowai/AppData/Local/Temp/claude/C--Users-Ekowai/521e3f3a-2033-49ca-827b-4adef8491545/scratchpad/fields-DWA-M-708.json';
const OUT = 'C:/Users/Ekowai/projects/ekowai-wizard/.claude/worktrees/na-worksheets-progress/scripts/verification/dwa-m-708-md-verification-pack.sql';

const lines = fs.readFileSync(MD, 'utf8').split(/\r?\n/);
const data = JSON.parse(fs.readFileSync(JSONF, 'utf8'));
const byId = {};
for (const f of data.fields) byId[f.symbol] = f;

const L = (n) => lines[n - 1];

// slice a fragment out of line n, from marker `a` (inclusive) to marker `b` (inclusive). b omitted = to EOL.
function fr(n, a, b) {
  const line = L(n);
  if (line === undefined) throw new Error(`no line ${n}`);
  let i = a === undefined ? 0 : line.indexOf(a);
  if (i < 0) throw new Error(`line ${n}: start marker not found: ${JSON.stringify(a)}\n${line}`);
  let out;
  if (b === undefined) out = line.slice(i);
  else {
    const j = line.indexOf(b, i);
    if (j < 0) throw new Error(`line ${n}: end marker not found: ${JSON.stringify(b)}\n${line}`);
    out = line.slice(i, j + b.length);
  }
  return out.trim();
}
// whole table row, \hline and trailing \\ stripped
function row(n) {
  return L(n).replace(/^\s*\\hline\s*/, '').replace(/\s*\\\\\s*$/, '').trim();
}
// the text inside \caption{...}
function cap(n) {
  const line = L(n);
  const i = line.indexOf('{');
  const j = line.lastIndexOf('}');
  if (i < 0 || j < 0) throw new Error(`line ${n}: no caption braces`);
  return line.slice(i + 1, j).trim();
}

const esc = (s) => s.replace(/'/g, "''");
const stmts = [];
const quotedSyms = new Set();

function field(sym, frags, page, note) {
  const f = byId[sym];
  if (!f) throw new Error(`unknown symbol ${sym}`);
  if (quotedSyms.has(sym)) throw new Error(`duplicate emit ${sym}`);
  quotedSyms.add(sym);
  const q = `${frags.join(' | ')} — printed p.${page}`;
  if (q.length > 780) throw new Error(`quote too long for ${sym}: ${q.length}`);
  stmts.push(`-- ${f.ws} ${sym}\nupdate public.fields set verification_status='verified_against_standard', verification_quote='${esc(q)}', verification_note='${esc(note)}', verified_at=now() where id='${f.id}' and verification_status not in ('verified_against_standard','corrected');`);
}

function equation(num, frags, page, note) {
  const e = data.equations.find((x) => x.equation_number === num);
  if (!e) throw new Error(`unknown equation ${num}`);
  const q = `${frags.join(' | ')} — printed p.${page}`;
  stmts.push(`-- equation ${num}\nupdate public.equations set verification_status='verified_against_standard', verification_quote='${esc(q)}', verification_note='${esc(note)}', verified_at=now() where id='${e.id}' and verification_status <> 'verified_against_standard';`);
}

const N = (clause, page, extra) =>
  `md-verified 2026-09-07 (${clause}, printed p.${page}) [VC]${extra ? ' — ' + extra : ''}`;

/* ------------------------------------------------------------------ reusable fragments */
const TAB1 = cap(459);                       // "Tabelle 1: Abkürzungen und Formelzeichen"
const TAB2 = cap(678);
const TAB9 = cap(1066);
const TAB11 = cap(1150);
const TAB12 = cap(1163);
const TAB13 = cap(1182).replace(/^1\s+/, ''); // caption carries a stray margin line number
const TAB14 = cap(1195);
const TAB15 = cap(1216);
const TAB18 = cap(1441);
const TAB19 = fr(1478, 'Tabelle 19:'); // caption wraps onto line 1479; the source note is dropped
const TAB8 = cap(1021);

/* ================================================================== M708-01 */
const F_34 = fr(663, 'Indirekteinleitung meint', 'kommunale Kläranlage ist.');
const F_35 = fr(671, 'Für die direkte Abwassereinleitung', 'erforderlich.');
const F_85 = fr(1753, 'Bei der direkten Übernahme', 'ausreicht.');
field('einleitungsart', [F_34, F_35, F_85], '21', N('3.4 / 3.5 / 8.5', '21–23 and 66', 'clause_reference reads "WHG; Anhang 3 AbwV"; the three discharge paths are defined in 3.4/3.5/8.5 — retag staged'));
field('anlagentyp_code', [F_34, F_35, F_85], '21', N('3.4 / 3.5 / 8.5', '21–23 and 66', 'the three discharge paths are the guideline\u2019s; the code tokens MV-D/MV-I/MV-K are EKOWAI\u2019s own labels and are not printed'));

const F_32a = fr(592, 'I Anlagen zur Behandlung', 'oder mehr Milch je Tag');
const F_32b = fr(594, 'I Anlagen zur Behandlung', '200 t je Tag');
field('eingehende_milchmenge', [F_32a, F_32b], '19', N('3.2', '19'));

const T19_head = row(1481);
const T19_marktmilch = row(1482);
const T19_kaese = row(1483);
const T19_pulver = row(1484);
const T19_ferm = row(1485);
field('haupterzeugnis', [TAB19, T19_head, T19_marktmilch, T19_kaese, T19_pulver, T19_ferm], '55', N('Tabelle 19 (7.5)', '55'));

/* ================================================================== M708-02 */
const F_310 = fr(797, 'Für Anlagen, die die Schwellenwerte', 'der Fall sein.');
field('stoerfall_klasse_eingeordnet', [F_310], '27', N('3.10', '27'));
field('bimschv_12_schwelle_ueberschritten', [F_310], '27', N('3.10', '27'));

const F_37a = fr(733, 'Die AwSV gilt, wenn der Umgang', 'Gemischen erfolgt.');
field('awsv_anwendbar', [F_37a], '24', N('3.7', '24'));
const F_37b = fr(737, 'Formal besteht grundsätzlich eine Anzeigepflicht', 'zuständigen Behörde.');
field('awsv_anzeige_eingereicht', [F_37b], '24', N('3.7', '24'));
const F_37c = fr(737, 'Einer Zulassung in Form einer wasserrechtlichen Eignungsfeststellung', 'Stoffe erforderlich.');
const F_37d = fr(737, 'Ausnahmen davon, gestuft', 'so ausübt.');
field('eignungsfeststellung_vorliegend', [F_37c, F_37d], '24', N('3.7', '24'));

const F_31_ied = fr(615, 'Schlussfolgerungen sind verbindliche Vorgabe');
const T1_IED = row(499);
field('ied_anlage', [F_31_ied, TAB1, T1_IED], '19', N('3.1 / Tabelle 1 (2.2)', '19 and 15'));

const F_36a = fr(727, 'Nach Inkrafttreten der EU-Verordnung', 'zu schützen.');
field('wasserwiederverwendung_geplant', [F_36a], '23', N('3.6', '23'));
const F_36b = fr(729, 'Eine Aufbereitung von Brüden/Permeaten', 'zuständigen Behörde.');
field('wasserwiederverwendung_genehmigung', [F_36b], '23', N('3.6', '23'));

field('einleitungspfad', [F_34, F_35, F_85], '21', N('3.4 / 3.5 / 8.5', '21–23 and 66', 'DUPLICATE of M708-01.einleitungsart (identical three options) — de-duplication staged'));

/* ================================================================== M708-03 */
field('milchdurchsatz_tag', [F_32a, F_32b], '19', N('3.2', '19', 'clause_reference reads "Sec. 4" (statistics); the daily annual-average milk throughput is defined in 3.2 — retag staged'));
const F_61_intro = fr(1017, 'Das in einer Molkerei anfallende Abwasser', 'zusammensetzen.');
const T8_row1 = row(1024);
field('abwasserteilstrom_volumen', [F_61_intro, TAB8, T8_row1], '43', N('6.1 / Tabelle 8', '43', 'Tabelle 8 enumerates the partial streams qualitatively; it prints no m³/d volume — the value is engineer input, Abwasserkataster per 3.3'));

/* ================================================================== M708-04 (Tabelle 9) */
const t9 = (sym, ln, page, extra) => field(sym, [TAB9, row(ln)], page, N('Tabelle 9 (6.1)', page, extra));
const T9_haupt = row(1071);
field('q_spec_marktmilch', [TAB9, T9_haupt, row(1072)], '44', N('Tabelle 9 (6.1)', '44'));
field('q_spec_kaese', [TAB9, T9_haupt, row(1073)], '44', N('Tabelle 9 (6.1)', '44'));
field('q_spec_pulver', [TAB9, T9_haupt, row(1074)], '44', N('Tabelle 9 (6.1)', '44'));
t9('bsb5_fracht_spez', 1075, '44');
t9('c_bsb5', 1076, '44');
t9('csb_fracht_spez', 1077, '44');
t9('c_csb', 1078, '44');
t9('verhaeltnis_csb_bsb5', 1079, '44');
t9('verhaeltnis_csb_toc', 1080, '44');
t9('c_no3_n', 1081, '44');
t9('c_no2_n', 1082, '44');
t9('c_nh4_n', 1083, '44');
t9('c_kn', 1084, '44', 'the Stichprobe cell prints ">= 300" where the other rows print "<="; transcribed as printed');
t9('c_n_ges', 1085, '44');
t9('c_p', 1086, '44');
t9('verhaeltnis_n_csb', 1087, '44');
const TAB9E = cap(1094);
const t9e = (sym, ln, extra) => field(sym, [TAB9, TAB9E, row(ln)], '44', N('Tabelle 9 (6.1)', '44–45', extra));
t9e('verhaeltnis_p_csb', 1098);
t9e('absetzbare_stoffe', 1099);
t9e('afs', 1100);
t9e('ph_wert', 1101);
t9e('lipophile_stoffe', 1102);
t9e('c_na', 1103);
t9e('verhaeltnis_ca_na', 1104);
t9e('c_chlorid', 1105);
t9e('c_hco3', 1106);
t9e('c_so4', 1107);

const T1_Qd = row(538);   // Q_{d,konz}  Täglicher Abfluss/Durchfluss
const T1_Qdmax = row(539);
field('q_d', [TAB1, T1_Qd, T1_Qdmax], '15', N('Tabelle 1 (2.2) / Tabelle 9 (6.1)', '15 and 44', 'Tabelle 9 gives the specific arising in m³/1.000 kg Milch, not a m³/d value; Q_d itself is only defined as a symbol in Tabelle 1 — the value is engineer input'));

/* ================================================================== M708-05 (Tabellen 11–14) */
const t = (sym, capTxt, ln, page, clause) => field(sym, [capTxt, row(ln)], page, N(clause, page));
t('brueden_milch_csb', TAB11, 1153, '46', 'Tabelle 11 (6.2.2)');
t('brueden_milch_bsb5', TAB11, 1154, '46', 'Tabelle 11 (6.2.2)');
t('brueden_milch_n', TAB11, 1155, '46', 'Tabelle 11 (6.2.2)');
t('brueden_milch_p', TAB11, 1156, '46', 'Tabelle 11 (6.2.2)');
t('brueden_molke_csb', TAB12, 1166, '46', 'Tabelle 12 (6.2.2)');
t('brueden_molke_bsb5', TAB12, 1167, '46', 'Tabelle 12 (6.2.2)');
t('brueden_molke_n', TAB12, 1168, '46', 'Tabelle 12 (6.2.2)');
t('brueden_molke_p', TAB12, 1169, '46', 'Tabelle 12 (6.2.2)');
t('permeat_pre_csb', TAB13, 1185, '47', 'Tabelle 13 (6.2.3)');
t('permeat_pre_bsb5', TAB13, 1186, '47', 'Tabelle 13 (6.2.3)');
t('permeat_pre_n', TAB13, 1187, '47', 'Tabelle 13 (6.2.3)');
t('permeat_pre_p', TAB13, 1188, '47', 'Tabelle 13 (6.2.3)');
t('permeat_post_csb', TAB14, 1198, '47', 'Tabelle 14 (6.2.3)');
t('permeat_post_bsb5', TAB14, 1199, '47', 'Tabelle 14 (6.2.3)');
t('permeat_post_n', TAB14, 1200, '47', 'Tabelle 14 (6.2.3)');
t('permeat_post_p', TAB14, 1201, '47', 'Tabelle 14 (6.2.3)');

/* ================================================================== M708-06 (Tabelle 2) */
const t2 = (sym, frags, extra) => field(sym, [TAB2, ...frags], '22', N('Tabelle 2 (3.5)', '22', extra));
t2('limit_bsb5_direkt', [row(681)]);
t2('limit_csb_direkt', [row(681), row(682)]);
t2('limit_toc_direkt', [row(683)]);
t2('limit_afs_direkt', [row(684)]);
const T2_nh4 = fr(685, 'Ammoniumstickstoff', '& 5,0 &');
const T2_cond_n1 = fr(686, 'wenn IED-Anlage', 'je Tag,');
const T2_cond_n2 = fr(687, '$\\geqslant 12^{\\circ} \\mathrm{C}$', 'Reaktor');
t2('limit_nh4_n_direkt', [T2_nh4, T2_cond_n1, T2_cond_n2]);
t2('limit_nges_direkt', [row(689), T2_cond_n1, T2_cond_n2]);
t2('limit_tnb_direkt', [row(690), T2_cond_n1, T2_cond_n2]);
t2('limit_pges_direkt', [row(691)]);
const T2_anm = fr(694, '(roh) Rohabwasser');
t2('bsb5_roh_je_tag', [row(681), T2_anm]);
t2('nges_roh', [T2_nh4, T2_cond_n1, T2_cond_n2, T2_anm]);
t2('pges_roh', [row(691), T2_anm]);

/* ================================================================== M708-09 */
const F_82_pius = fr(1555, 'Innerbetriebliche Vermeidungsmaßnahmen', 'haben.');
const F_72_pius = fr(1331, 'Produktions- bzw. prozessintegrierte Maßnahmen (PIUS) stehen', 'werden.');
field('pius_geprueft', [F_72_pius, F_82_pius], '50', N('7.2 / 8.2', '50 and 58', 'the encoded source_quote drops "aus Gründen der Minimierung von Produktverlusten unbedingt" — replaced by the verbatim sentence'));

/* ================================================================== M708-11 */
const t19 = (sym, ln, extra) => field(sym, [TAB19, T19_head, row(ln)], '55', N('Tabelle 19 (7.5)', '55', extra));
t19('spez_energie_marktmilch', 1482);
field('spez_energie_kaese', [TAB19, T19_head, row(1483), fr(1488, '(1) Das spezifische')], '55', N('Tabelle 19 (7.5)', '55'));
t19('spez_energie_pulver', 1484);
t19('spez_energie_ferm_milch', 1485);

const F_631_trock = fr(1210, 'Für IEDAnlagen gelten die Anforderungen', 'von $10 \\mathrm{mg} / \\mathrm{m}^{3}$.');
const F_631_ta = fr(1210, 'Für Anlagen, die im vereinfachten Verfahren', 'der TA Luft.');
const F_631_mf = fr(1210, 'Bei relevanten Quellen mit einem Massenstrom', 'von $10 \\mathrm{mg} / \\mathrm{m}^{3}$.');
field('staub_konzentration_trocknung', [F_631_trock, TAB15, row(1228)], '47', N('6.3.1 / Tabelle 15', '47'));
field('staub_konzentration', [F_631_ta, F_631_mf], '47', N('6.3.1 (TA Luft 5.2.1)', '47'));
field('staub_massenstrom', [F_631_mf], '47', N('6.3.1 (TA Luft 5.2.1)', '47'));

const F_91_wasser = fr(1912, 'Die Milchverarbeitung benötigt jedoch', 'Käseherstellung).');
field('spez_wasserverbrauch', [F_91_wasser], '74', N('9.1', '74', 'clause_reference reads "Sec. 6.4"; the only printed water-per-milk figure is the "Faktor 2" in 9.1 — retag staged'));

/* ================================================================== M708-12 */
const F_833_loch = fr(1607, 'I Es wird der Einsatz von Lochblechen', 'empfohlen.');
field('lochweite_sieb', [F_833_loch], '60', N('8.3.3', '60'));
const F_833_ausl = fr(1609, 'I Bei der Auslegung der Siebe', 'berücksichtigen.');
field('q_max', [F_833_ausl, TAB1, row(541)], '60', N('8.3.3 / Tabelle 1 (2.2)', '60 and 15'));
field('siebflaeche', [F_833_ausl], '60', N('8.3.3', '60', 'the guideline prints the design basis (maximum hourly throughput plus reserve) but no screen-area value or formula'));
const F_833_red = fr(1611, 'I Bei der Siebanlage', 'sicherzustellen.');
field('anzahl_siebe', [F_833_red, F_833_ausl], '60', N('8.3.3', '60', 'redundancy is required; no count is printed'));
const F_842_san = fr(1713, 'Schließlich ist zu beachten', 'werden dürfen.');
field('attest_m708_12_req_708_10', [F_842_san], '65', N('8.4.2 (attestation for gate REQ-708-10)', '65', 'the gate carries clause_reference "8.4.1 / 3.8"; the quoted sentence is the closing paragraph of 8.4.2 — retag staged'));

/* ================================================================== M708-13 */
const F_836_tr = fr(1631, 'Je nach Anwendungsfall und Standortbedingungen', 'Volumen sinnvoll.');
field('aufenthaltszeit_mab', [F_836_tr], '60', N('8.3.6', '60–62'));
field('v_mab', [F_836_tr], '60', N('8.3.6', '60–62', 'the volume follows from the 8 h–24 h residence time; no volume value is printed'));
const F_836_mix = fr(1635, 'Bei Misch- und Ausgleichsbecken ist auf eine gute Umwälzung', 'erreicht werden.');
field('mischleistung_mab', [F_836_mix], '60', N('8.3.6', '60–62', 'mixing is required qualitatively; no kW figure is printed'));
const F_836_hav = fr(1649, 'Zusätzlich zum Misch- und Ausgleichsbecken', 'anzuraten.');
field('notbecken_volumen', [F_836_hav], '60', N('8.3.6', '60–62', 'the emergency basin is recommended/strongly advised; no volume is printed'));

/* ================================================================== M708-14 */
const F_837_qa = fr(1659, 'In der milchverarbeitenden Industrie kommen fast ausschließlich', 'zu vermeiden.');
const F_837_rec = fr(1659, 'Bei diesen Anlagen wird ein Teilstrom', 'vermischt.');
field('q_a_flotation', [F_837_qa], '62', N('8.3.7', '62–64'));
field('a_fl', [F_837_qa], '62', N('8.3.7', '62–64', 'the effective flotation area follows from the recommended surface loading; no area value is printed'));
field('recycle_anteil_flotation', [F_837_rec], '62', N('8.3.7', '62–64'));
const F_837_druck = fr(1663, 'In beiden Fällen wird der Recyclestrom', 'entspannt.');
field('druck_saettigung_flotation', [F_837_druck], '62', N('8.3.7', '62–64'));
const F_837_reak = fr(1677, 'Zu beachten ist hierbei, dass zwischen der Zugabestelle', 'gewährleistet.');
field('reaktionszeit_polymer', [F_837_reak], '63', N('8.3.7', '62–64'));
const F_837_csb = fr(1679, 'Unter diesen Randbedingungen', 'erreichbar.');
const F_837_n = fr(1679, 'Die erzielbare StickstoffElimination', 'bei $30 \\%$ bis $60 \\%$.');
const F_837_p = fr(1679, 'Infolge der Zugabe der eisen-', 'Flotat eliminiert.');
field('csb_elim_flotation', [F_837_csb], '63', N('8.3.7', '62–64'));
field('n_elim_flotation', [F_837_n], '63', N('8.3.7', '62–64'));
field('p_elim_flotation', [F_837_p], '63', N('8.3.7', '62–64'));
const F_837_chem = fr(1679, 'Zur Bestimmung des Flotatanfalls', 'erfolgen.');
field('chemikalien_dosierung_flotation', [F_837_chem], '63', N('8.3.7', '62–64', 'the guideline explicitly refers chemical consumption to site trials/pilot plants; no g/m³ dosing rate is printed'));

/* ================================================================== M708-15 */
const F_842_fett = fr(1703, 'I Es muss sichergestellt sein', 'entfernt sind.');
field('lipophile_eliminiert', [F_842_fett], '64', N('8.4.2', '64–65'));

/* ================================================================== M708-16 */
const F_82_csb40 = fr(1559, 'Abwasser aus der Milchverarbeitung ist grundsätzlich', 'werden kann.');
field('csb_ablauf_bio', [F_82_csb40], '58', N('8.2', '58'));
const T1_VBB = row(577);
const F_a41_a131 = fr(2483, 'Die verfahrenstechnische Berechnung der Belebung', 'DWAA 131:2016.');
field('v_bb', [TAB1, T1_VBB, F_a41_a131], '15', N('Tabelle 1 (2.2) / Anhang A.4.1', '15 and 95', 'M 708 prints no activated-sludge dimensioning rule; the calculation follows DWA-A 131 (NR — governing document outside this standard)'));
const T1_BR = row(467);
field('br_bsb5', [TAB1, T1_BR], '15', N('Tabelle 1 (2.2)', '15', 'Tabelle 1 defines B_R,BSB5 as the BSB5-RAUMbelastung in kg/(m³·d); the encoded label reads "Schlammbelastung" — label correction staged'));
const F_842_bioP = fr(1707, 'Da im Abwasser aus der Milchverarbeitung', 'zu integrieren.');
const F_842_faell = fr(1707, 'Dessen ungeachtet kann bei Direkteinleitern', 'verzichtet werden.');
field('p_elim_bio', [F_842_bioP, F_842_faell], '64', N('8.4.2', '64–65', 'the guideline requires enhanced biological P removal plus precipitation for direct dischargers; no elimination percentage is printed'));
const F_82_faell = fr(1585, 'Die restliche Phosphorelimination', 'erfolgen.');
field('faellmittel_dosierung', [F_82_faell, F_842_faell], '58', N('8.2 / 8.4.2', '58 and 64–65', 'the precipitation routes are named; no mol/mol dosing ratio is printed'));
field('t_ablauf_bio', [TAB2, T2_nh4, T2_cond_n1, T2_cond_n2], '22', N('Tabelle 2 (3.5)', '22'));

/* ================================================================== M708-17 */
const F_8431_csb = fr(1731, 'Bei Molkereiabwasser sind bei anaerober Behandlung', 'möglich.');
const F_8431_gas = fr(1733, 'Es entsteht energiereiches Biogas', 'CSB}_{\\text {el }}$.');
const F_8431_bhkw = fr(1733, 'Bei Verbrennung in einem BHKW', 'CSB}_{\\mathrm{el}}$.');
field('csb_elim_anaerob', [F_8431_csb], '65', N('8.4.3.1', '65'));
field('methan_ausbeute_anaerob', [F_8431_gas], '65', N('8.4.3.1', '65'));
field('heizwert_ch4', [F_8431_gas], '65', N('8.4.3.1', '65'));
field('energie_el_bhkw', [F_8431_gas, F_8431_bhkw], '65', N('8.4.3.1', '65'));
const F_8432 = fr(1741, 'UASB-Reaktoren werden in der Regel', 'betrieben.');
field('br_csb_uasb', [F_8432], '66', N('8.4.3.2', '66', 'anchored on "in der Regel" — a typical operating range, not a hard limit'));
const F_8433_of = fr(1747, 'Bei den in der milchverarbeitenden Industrie eingesetzten Festbettreaktoren', '$250 \\mathrm{~m}^{2} / \\mathrm{m}^{3}$.');
const F_8433_br = fr(1747, 'Die Auslegung erfolgt in beiden Fällen', '\\mathrm{CSB}$.');
field('spez_oberflaeche_festbett', [F_8433_of], '66', N('8.4.3.3', '66'));
field('br_csb_festbett', [F_8433_br], '66', N('8.4.3.3', '66'));
field('v_anaerob', [F_8433_br, F_8432], '66', N('8.4.3.3 / 8.4.3.2', '66', 'the reactor volume follows from the printed volumetric loading; no volume value is printed'));

/* ================================================================== M708-19 */
const F_862_temp = fr(1778, 'Der Anaerobreaktor wird in aller Regel', 'CSB.');
const F_862_nh4 = fr(1782, 'Die NH4-N-Konzentration im Anaerobreaktor', 'liegen.');
field('aufenthaltszeit_anaerob', [F_862_temp], '68', N('8.6.2', '68'));
field('br_csb_faulung', [F_862_temp], '68', N('8.6.2', '68'));
field('v_faulbehaelter', [F_862_temp], '68', N('8.6.2', '68', 'the digester volume follows from the printed residence time / volumetric loading; no volume value is printed'));
field('nh4_n_anaerob_max', [F_862_nh4], '68', N('8.6.2', '68', 'the md prints the second bound as "2.000 mg/L" (capital L) — transcribed as printed'));
const F_863_afs = fr(1790, 'Für den Fall, dass eine Schlammwasserbehandlung', 'liegt.');
field('afs_schlammwasser', [F_863_afs], '68', N('8.6.3', '68–69'));
const F_863_entw = fr(1788, 'Zur Schlammentwässerung kommen in der milchverarbeitenden Industrie', 'abschätzen zu können.');
field('entwaesserung_spec', [F_863_entw], '68', N('8.6.3', '68–69'));
const F_862_ziel = fr(1774, 'Ziel der anaeroben Schlammbehandlung', 'Gasnetz eingespeist.');
const F_862_bhkw = fr(1774, 'Ferner besteht die Möglichkeit', 'zu erzeugen.');
const F_7323_gas = fr(1435, 'Die Biogaserträge werden', 'vergleichen zu können.');
field('biogas_ertrag', [F_862_ziel, F_7323_gas, TAB18], '68', N('8.6.2 / 7.3.2.3 / Tabelle 18', '68 and 54', 'the guideline expresses gas yield in l/kg oTR resp. m³/t FM (Tabelle 18); the encoded unit Nm³/d is a plant-level derivation — unit note staged'));
field('el_leistung', [F_862_bhkw, F_8431_bhkw], '68', N('8.6.2 / 8.4.3.1', '68 and 65', 'the guideline prints the specific electrical yield (≈1,4 kWh/kg CSB_el); the kWh/d plant figure is derived'));

/* ================================================================== M708-20 */
const F_872_schwelle = fr(1815, 'Eine Phosphorrückgewinnung ist erst', 'vorliegen.');
field('po4_p_schwelle_map', [F_872_schwelle], '69', N('8.7.2', '69'));
const F_872_stoich = fr(1823, 'Hinsichtlich der Elimination von Stickstoff und Phosphor', 'als Ammonium-Stickstoff.');
field('map_stoich_ratio', [F_872_stoich], '69', N('8.7.2', '69–71'));
const F_872_ph = fr(1825, 'Der optimale pH-Wert für die Fällung', 'bei ca. pH 8 bis 9.');
const F_872_ph83 = fr(1840, 'I $\\mathrm{pH}>8,3$', 'durch NaOH ;');
field('ph_map_min', [F_872_ph, F_872_ph83], '69', N('8.7.2', '69–71'));
const F_872_mol = fr(1827, 'Für das optimale Mg:P:N-Verhältnis', 'resümieren.');
field('mol_verhaeltnis_mg_n_p', [F_872_mol], '69', N('8.7.2', '69–71', 'the guideline writes the order Mg:P:N; the encoded label reads Mg:N:P (numerically identical at 1:1:1) — label note staged'));
const F_872_gl1_intro = fr(1829, 'Der für die MAP-Fällung genutzte pH -Bereich', 'erfolgt:');
const F_872_gl1 = fr(1832, '\\mathrm{Mg}^{2+}', '\\tag{1}');
field('map_precipitate', [F_872_gl1_intro, F_872_gl1], '69', N('8.7.2, Gleichung (1)', '69–71'));
const F_872_verf = fr(1817, 'Die Rückgewinnung erfolgt in der Regel', 'Salz zu bilden.');
field('map_massenertrag', [F_872_verf, F_872_stoich], '69', N('8.7.2', '69–71', 'no MAP mass yield is printed; it follows from the influent PO4-P load and the molar-mass ratio'));
const F_872_reak = fr(1861, 'Weil die erforderliche Reaktionszeit', 'zu vermeiden.');
field('v_map_reaktor', [F_872_reak], '69', N('8.7.2', '69–71', 'the guideline explicitly refers the reaction time — and hence the reactor volume — to the individual application; no volume is printed'));
const F_872_dos_nh4 = fr(1841, 'I $\\mathrm{NH}_{4}^{+}$', '\\mathrm{SO}_{4}$ );');
const F_872_dos_mg = fr(1843, 'I $\\mathrm{Mg}^{2+}$', '\\mathrm{MgCl}_{2}$ ).');
const F_872_dos_ueber = fr(1844, 'Der erforderliche stöchiometrische Überschuss', 'Überschuss.');
field('mg_naoh_dosierung', [F_872_ph83, F_872_dos_nh4, F_872_dos_mg, F_872_dos_ueber], '70', N('8.7.2', '69–71', 'over-stoichiometric Mg²⁺/NH4⁺ and NaOH pH adjustment are required; the required excess is salinity-dependent and no mol/mol value is printed'));

/* ================================================================== M708-21 */
const F_873_tnb = fr(1871, 'Eine für eine Stickstoff-Rückgewinnung sinnvolle', 'anzutreffen.');
field('tnb_schwelle_n_rueckgewinnung', [F_873_tnb], '71', N('8.7.3', '71–73'));
const F_873_strip = fr(1878, 'Für eine Stickstoffentfernung durch Ammoniak-Strippung', 'erforderlich.');
const F_873_80 = fr(1878, 'Falls ein Wärmeüberschuss', 'eingespart werden können.');
field('strip_n_elim', [F_873_strip], '72', N('8.7.3', '71–73'));
field('strip_ph_min', [F_873_strip], '72', N('8.7.3', '71–73'));
field('strip_temp_min', [F_873_strip, F_873_80], '72', N('8.7.3', '71–73'));
const F_873_abs = fr(1890, 'In Abhängigkeit von der Dichte der Waschlösung', 'ausgeschleust.');
field('absorber_h2so4_konz', [F_873_abs], '72', N('8.7.3', '71–73'));
const F_873_kol = fr(1886, 'Das weitgehend feststofffreie, alkalische Abwasser');
const F_873_kol2 = fr(1888, 'Flüssigkeit die Kolonne von unten nach oben', 'eingeleitet.');
field('strippkolonne_dimension', [F_873_kol, F_873_kol2], '72', N('8.7.3', '71–73', 'the guideline describes the counter-current stripping column qualitatively; no dimensioning values are printed'));

/* ================================================================== M708-22 */
const F_874_v = fr(1902, 'Das Speisewasser wird mit einer Aufströmgeschwindigkeit', 'nach oben gepumpt.');
const F_874_pellet = fr(1902, 'Die Pellets wachsen bis zu einer gewissen Größe', 'entwässert werden.');
field('aufstrom_v_crystalactor', [F_874_v], '73', N('8.7.4', '73'));
field('pellet_groesse_crystalactor', [F_874_pellet], '73', N('8.7.4', '73'));

/* ================================================================== M708-23 */
const F_102_milch = fr(2037, 'Beim Einsatz von mehrstufigen Anlagen', '<0,5 \\mathrm{mg} / \\mathrm{l}$.');
const F_102_molke = fr(2039, 'Mit einer Membranbiologie', '<1 \\mathrm{mg} / \\mathrm{l}$.');
field('brueden_milch_ablauf_toc', [F_102_milch], '78', N('10.2', '78'));
field('brueden_milch_ablauf_nh4_n', [F_102_milch], '78', N('10.2', '78'));
field('brueden_molke_ablauf_csb_mbr', [F_102_molke], '78', N('10.2', '78'));
field('brueden_molke_ablauf_nh4_n_mbr', [F_102_molke], '78', N('10.2', '78'));

/* ================================================================== M708-24 */
const F_92_quellen = fr(1928, 'In der Praxis hat es sich gezeigt', 'betrieben werden kann.');
field('wasserwiederverwendung_volumen', [F_92_quellen], '74', N('9.2', '74–75', 'the guideline names the reusable process-water sources; no reuse volume is printed'));

/* ================================================================== M708-25 */
const F_35_selbst_a = fr(704, 'Der Mindestumfang der Selbstüberwachung', 'wird für IED');
const F_35_selbst_b = fr(704, 'Anlagen im Teil H des Anhangs 3 AbwV', 'von Chlorid vor');
field('ueberwachung_haeufigkeit', [F_35_selbst_a + '[...]' + F_35_selbst_b], '23', N('3.5', '23', 'the transcript carries the Gelbdruck margin line numbers inside the sentence ("IED2 Anlagen", "vor4 zunehmen"); the two stray digits are elided with [...]'));
field('probenahmestellen', [TAB2, F_35_selbst_a + '[...]' + F_35_selbst_b], '22', N('Tabelle 2 (3.5) / 3.5', '22–23'));
const F_33_betreiber = fr(645, 'Zu den maßgeblich in der Abwasserverordnung', 'in Jahresberichten.');
field('attest_m708_25_req_708_11', [F_33_betreiber], '20', N('3.3 (attestation for gate REQ-708-11)', '20'));

/* ================================================================== app-metadata exemptions */
const exemptSyms = ['betreiber', 'standort', 'ablauf_konformitaet', 'gesamt_konformitaet'];
const exemptIds = exemptSyms.map((s) => {
  if (!byId[s]) throw new Error(`unknown exempt ${s}`);
  quotedSyms.add(s);
  return byId[s].id;
});
stmts.push(`-- app/project metadata (exempt per the 2026-08-01 metadata ruling): ${exemptSyms.join(', ')}\nupdate public.fields set verification_status='inferred_from_worksheet', verification_note='md-pass 2026-09-07: app/project metadata — the guideline does not define this field; exempt per the 2026-08-01 metadata ruling', verified_at=now() where id in (${exemptIds.map((i) => `'${i}'`).join(', ')}) and verification_status not in ('verified_against_standard','corrected');`);

/* ================================================================== equations */
equation('E-CH4-Yield', [F_8431_gas], '65', N('8.4.3.1', '65'));
equation('E-CH4-Heizwert', [F_8431_gas], '65', N('8.4.3.1', '65'));
equation('E-BHKW-El', [F_8431_gas, F_8431_bhkw], '65', N('8.4.3.1', '65'));
equation('E-MAP-Stoich', [F_872_stoich], '69', N('8.7.2', '69–71'));
equation('Gl-1', [F_872_gl1_intro, F_872_gl1], '69', N('8.7.2, Gleichung (1)', '69–71'));

/* ================================================================== residue report */
const residue = data.fields.filter((f) => !quotedSyms.has(f.symbol));
console.error('RESIDUE (' + residue.length + '):');
for (const r of residue) console.error('  ' + r.ws + '.' + r.symbol);
console.error('quoted fields: ' + (quotedSyms.size - exemptSyms.length) + ', exempt: ' + exemptSyms.length + ', statements: ' + stmts.length);

const header = `-- DWA-M-708 — md-verification pack
-- Source md      : C:\\Users\\Ekowai\\Desktop\\Guidelines\\DWA-M-708\\DWA-M_708_GD.md
--                  (DWA-M 708 "Abwasser aus der Milchverarbeitung", ENTWURF / GELBDRUCK,
--                   1. Auflage Hennef 2025, Frist zur Stellungnahme 31. Januar 2026 — NOT a Weißdruck)
-- Page convention: the transcript has NO page markers in the body. Printed page numbers were derived
--                  from the Inhalt + Tabellen-/Bilderverzeichnis (section- and table-start pages) and
--                  cross-checked against the mathpix image indices embedded in the md
--                  (…-019.jpg at §3.1 = printed p.19; -031/-033/-035/-037/-040/-041/-042 = Bilder 1–10
--                   at pp.31/33/35/37/40/41/42; -063 = Bild 11 p.63; -072 = Bilder 12/13 p.72;
--                   -079 = Bild 14 p.79; -081/-085/-089/-090/-093/-095 = Bilder A.1–A.6 —
--                   every index equals the printed page given in the Bilderverzeichnis).
--                  A page ref appears ONCE, at the end of each quote. Where a clause spans pages the
--                  verification_note gives the range and the quote cites the clause's first page.
-- Grade          : [VC] — verified against the markdown transcript only (SR-3: PDF not opened this session).
-- Counts         : 153 fields examined / 143 quoted / 4 exempt (app metadata) / 6 residue;
--                  5 equations examined / 5 quoted / 0 residue.
-- Residue        : M708-03.milchdurchsatz_jahr, M708-04.q_spec_ferm_milch, M708-06.limit_ph_direkt,
--                  M708-06.limit_lipophile_direkt, M708-16.t_ts, M708-16.v_deni  (see report / STAGED file)
-- Rollback       : rollback-dwa-m-708-md-verification-pack.sql
-- NOTE           : this file contains ONLY update statements. apply-pack.mjs supplies the transaction.
`;

fs.writeFileSync(OUT, header + '\n' + stmts.join('\n\n') + '\n');
console.error('wrote ' + OUT);

/* ================================================================== rollback */
const touched = data.fields.filter((f) => quotedSyms.has(f.symbol));
const priorGroups = {};
for (const f of touched) (priorGroups[f.verification_status] ||= []).push(f.id);
const eqPriorGroups = {};
for (const e of data.equations) (eqPriorGroups[e.verification_status] ||= []).push(e.id);
const idList = (a) => a.map((i) => `'${i}'`).join(',');

const rbHead = `-- Rollback for dwa-m-708-md-verification-pack.sql (2026-09-07).
-- Reverts ONLY rows this pack touched (identified by the verification_note tag) and ONLY for standard
-- DWA-M-708 (joined through worksheet_templates → standards.code).
-- The prior statuses on this standard were MIXED (${Object.entries(priorGroups).map(([k, v]) => `${v.length} ${k}`).join(', ')}
-- for fields; ${Object.entries(eqPriorGroups).map(([k, v]) => `${v.length} ${k}`).join(', ')} for equations), captured from the
-- 2026-09-07 export, so there is one statement per prior status.
-- ${touched.length} field ids = ${touched.length - exemptSyms.length} quoted + ${exemptSyms.length} exempt. ${data.equations.length} equation ids.
-- The ${residue.length} residue fields were never written and need no rollback.
-- NOTE: only update statements — apply-pack.mjs supplies the transaction.
`;
const rb = [rbHead];
for (const [status, ids] of Object.entries(priorGroups)) {
  rb.push(`-- fields whose prior verification_status was '${status}' (${ids.length})
update public.fields f set verification_status='${status}', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = f.worksheet_template_id and s.code = 'DWA-M-708'
   and f.id in (${idList(ids)})
   and (f.verification_note like 'md-verified 2026-09-07%' or f.verification_note like 'md-pass 2026-09-07%');`);
}
for (const [status, ids] of Object.entries(eqPriorGroups)) {
  rb.push(`-- equations whose prior verification_status was '${status}' (${ids.length})
update public.equations e set verification_status='${status}', verification_quote=null, verification_note=null, verified_at=null
  from public.worksheet_templates wt join public.standards s on s.id = wt.standard_id
 where wt.id = e.worksheet_template_id and s.code = 'DWA-M-708'
   and e.id in (${idList(ids)})
   and e.verification_note like 'md-verified 2026-09-07%';`);
}
const RB = OUT.replace(/dwa-m-708-md/, 'rollback-dwa-m-708-md');
fs.writeFileSync(RB, rb.join('\n\n') + '\n');
console.error('wrote ' + RB);
