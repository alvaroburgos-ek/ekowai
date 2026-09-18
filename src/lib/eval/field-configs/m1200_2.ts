/**
 * DWA-M-1200-2 — Plan 3 Task 16 field configs (registers, lookup_fill, visibility)
 * as DATA for `scripts/regulation-tables/emit-field-configs-sql.ts m1200_2`.
 *
 * Every `verification_quote` is a span lifted verbatim (by line number) from the
 * transcript `Desktop\Guidelines\DWA-M-1200-2\DWA-M_1200-2_GD.md` (Gelbdruck
 * Juli 2025) — the `Q` object lives in `regulation-tables-seed-m1200_2.ts` with
 * the line in every key. Prod facts come from the captured `m1200_2.prior.json`
 * (2026-09-18, read-only): 19 worksheets (4 empty), coded sections
 * `M12002-NN-A … -M` (inputs in B / C, outputs in D; 12 of 84 fields are
 * orphans), 4 equations (all on M12002-05: Gl. 1, Gl. C.2-1, Gl. C.2-2,
 * Gl. C.2-3), 15 compliance rows (REQ-02 / -08 / -15 with an EMPTY condition).
 * Enum tokens below are the captured prod `enum_values` (G-A3): `wassergueteklasse`
 * `A B-1 B-2 C-1 C-2 D`, `validierungsmonitoring_typ` `vereinfacht umfaenglich
 * umfaenglich_basis umfaenglich_montecarlo`, `filtrationsverfahren` (11 tokens),
 * `desinfektionsverfahren` `uv ozon clo2 chlor pes pfa h2o2 membran`,
 * `messhauefigkeit` `online taeglich woechentlich monatlich`; the yes/no drivers
 * `aerosol_risk`, `weide_oder_futter`, `sekundaerdesinfektion_erforderlich` are
 * BOOLEANS (rules read `== true`).
 *
 * Where the drivers reach (capture, `consumer_worksheets`): `wassergueteklasse`
 * (-02) → -04, -05, -11, -12 — NOT -06 / -13 (the routine-sample register on
 * -06 reads it in row scope and stays undecidable until m1200_2-C-1);
 * `filtrationsverfahren` (-09) → -13, -10, -12; `desinfektionsverfahren` (-11)
 * → -12, -13; `leistungsziel_log10` (-04) → -05, -12; `aerosol_risk` /
 * `weide_oder_futter` (-02) → -13 only.
 *
 * Rules on EXISTING fields (21 UPDATE entries) are emitted only where the
 * capture shows the field consumer-free, read by no same-worksheet gate (or
 * IF-guarded by the same driver — REQ-12 / `sekundaerdesinfektion_verfahren`)
 * and outside every same-worksheet equation chain (M12002-05: `c_zulauf` /
 * `c_ablauf` feed Gl. 1 whose output is consumed by -04 / -12 — no rule;
 * `mw_log10` / `sd_log10` feed Gl. C.2-1 — no rule; the two percentile OUTPUTS
 * feed nothing and are hidden by class). Refused / withheld: the section rules
 * on M12002-04 / -05 (leistungsziel_log10 consumed; section B of -05 holds the
 * Gl.-1 inputs and the REQ-05 drivers) → m1200_2-C-2; `flux_membran` (consumed
 * by -13) → C-3; `legionella` / `intest_nematoden` (consumed by -02, drivers not
 * on -06) → C-4. Section rules: none (every candidate section holds a consumed
 * producer or a gate-read symbol).
 *
 * Placement (codebase reality over the brief — report §8): the Tab.-3 limit fills
 * live on M12002-02 next to the class (the measured values `e_coli` … are
 * inherited THERE, `wassergueteklasse` is not inherited on -06); the per-organism
 * log10 target fills on M12002-04 (the Planungsphase worksheet, class inherited);
 * the routine-sample register on -06 with its Σ on -06 (an equation reads a
 * register of its own worksheet only) — `perzentil_konformitaet` / REQ-03 on -13
 * are m1200_2-D-6 / -G-5; the cost register on -15, the Verfahrenskette on -12,
 * the Betriebsparameter on -13, the validation samples on -05.
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { Q, KLASSE_TOKENS, ORGANISMUS_TOKENS, ORGANISMUS_LOG10_COLUMN, STUFE_TOKENS, TAB6_TOKENS, KOSTEN_TOKENS, PROBE_PARAMETER_TOKENS, frag, type Organismus } from '../regulation-tables-seed-m1200_2';

const STD = 'DWA-M-1200-2';
export { KLASSE_TOKENS, ORGANISMUS_TOKENS, STUFE_TOKENS, TAB6_TOKENS, KOSTEN_TOKENS, PROBE_PARAMETER_TOKENS };

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS02 = on('M12002-02');
const WS04 = on('M12002-04');
const WS05 = on('M12002-05');
const WS06 = on('M12002-06');
const WS09 = on('M12002-09');
const WS11 = on('M12002-11');
const WS12 = on('M12002-12');
const WS13 = on('M12002-13');
const WS14 = on('M12002-14');
const WS15 = on('M12002-15');

// ---- drivers (captured prod enums / booleans) ----
export const LEISTUNGSZIELE = "wassergueteklasse IN {'A', 'B-1', 'C-1'}";          // Tab. 3: the classes whose log10 column prints targets (L549 / L553 / L555); B-2 / C-2 print "－", D "-"
export const KLASSEN_A_BIS_C = "wassergueteklasse IN {'A', 'B-1', 'B-2', 'C-1', 'C-2'}"; // Tab. 3: Filtration / Trübung ≤ 2 NTU / AFS ≤ 10 / Enterokokken for A … C (L894); D prints "-" / "gemäß Richtlinie"
export const KLASSE_A = "wassergueteklasse == 'A'";                                 // Tab. 3 A row: BSB5 ≤ 10 mg/l (L552); Anhang C.1: 10th percentile (L1800)
export const KLASSEN_B1_C1 = "wassergueteklasse IN {'B-1', 'C-1'}";                  // Anhang C.1: 50th percentile (L1802)
export const AEROSOL = 'aerosol_risk == true';                                       // Tab. 3 "wenn das Risiko der Aerosolbildung besteht" (L550)
export const WEIDE = 'weide_oder_futter == true';                                    // Tab. 3 "für die Bewässerung von Weideflächen oder Futterpflanzen" (L551)
export const UMFAENGLICH_MC = "validierungsmonitoring_typ IN {'umfaenglich', 'umfaenglich_montecarlo'}"; // Anhang C.3: Konfidenzniveau α (L1885)
export const UMFAENGLICH_BASIS = "validierungsmonitoring_typ IN {'umfaenglich', 'umfaenglich_basis'}";   // Anhang C.2: k = 1,282 (L1822)
export const MEMBRAN_MF_UF_MBR = "filtrationsverfahren IN {'mf', 'uf', 'mbr'}";      // §5.2 "Porengröße der Membranen (Mikro- bzw. Ultrafiltration)" (L953); Tab. 6 MF/UF Integritätsmessung (L1304–L1310), MBR Transmembrandruck (L1300)
export const MEMBRAN_ALLE = "filtrationsverfahren IN {'mf', 'uf', 'nf', 'uo', 'mbr'}"; // Tab. 4 MF/UF and RO/NF: "Permeatfluss, Transmembrandruck" (L805 / L806)
export const LANGSAMSAND = "filtrationsverfahren == 'langsamsand'";                  // §5.2 "Langsamsandfilter … Filtergeschwindigkeiten von 0,05 m/h bis 0,5 m/h" (L941)
export const SCHNELLSAND = "filtrationsverfahren IN {'raumfilter', 'schnellsand'}";  // Tab. 4 "Schnellsandfilter … Filtrationsrate" (L816); prod label "Raumfilter (Schnellsand)"
export const UV = "desinfektionsverfahren == 'uv'";                                  // §5.4.3 UV-Bestrahlung: Dosis (L1068); Tab. 4 Referenzdosis ≥ 40 mJ/cm² (L784–L789); Tab. 6 UV-Transmission (L1317)
export const OZON = "desinfektionsverfahren == 'ozon'";                              // §5.4.3 Ozonung: spezifische Ozondosis (L1099), ΔSAK254 (L1101)
export const CHLOR = "desinfektionsverfahren == 'chlor'";                            // Tab. 6 Chlorung: Freies Restchlor (L1319)
export const CHLOR_CLO2 = "desinfektionsverfahren IN {'chlor', 'clo2'}";             // Tab. 4 "Chlorbasierte Desinfektion (analog auch andere chemische Desinfektion)": Ct-Wert (L790–L794)
export const CLO2 = "desinfektionsverfahren == 'clo2'";                              // §5.4.3 Chlordioxid (L1135)
export const PFA = "desinfektionsverfahren == 'pfa'";                                // §5.4.3 Perameisensäure (L1163)
export const CHEMISCH = "desinfektionsverfahren IN {'ozon', 'chlor', 'clo2', 'pes', 'pfa', 'h2o2'}"; // Tab. 4: hydraulische Charakterisierung des Reaktors — Chlor (L790–L794, "analog auch andere chemische Desinfektion") and Ozon (L804)
export const SEKUNDAER = 'sekundaerdesinfektion_erforderlich == true';               // REQ-12's own IF guard; §5.4.2 (L1050)

/** The five Tab.-3 indicator organisms: register token, output-symbol stem, TAB3 column, label (L549: "E．coli … Somatische Coliphagen … f－spezifsche Coliphagen … Clostridium－perfringens－Sporen … bzw．sulfatreduzierende Sporenbildner"). */
export const ORGANISMEN: ReadonlyArray<{ token: Organismus; stem: string; col: string; label: string }> = [
  { token: 'e_coli', stem: 'ecoli', col: ORGANISMUS_LOG10_COLUMN.e_coli, label: 'E. coli' },
  { token: 'somatische_coliphagen', stem: 'somat_coliphagen', col: ORGANISMUS_LOG10_COLUMN.somatische_coliphagen, label: 'somatische Coliphagen' },
  { token: 'f_spez_coliphagen', stem: 'fspez_coliphagen', col: ORGANISMUS_LOG10_COLUMN.f_spez_coliphagen, label: 'f-spezifische Coliphagen' },
  { token: 'clostridium', stem: 'clostridium', col: ORGANISMUS_LOG10_COLUMN.clostridium, label: 'Clostridium-perfringens-Sporen' },
  { token: 'sulfatreduzierer', stem: 'sulfatreduzierer', col: ORGANISMUS_LOG10_COLUMN.sulfatreduzierer, label: 'sulfatreduzierende Sporenbildner' },
];
const ORGANISMUS_LABELS = Object.fromEntries(ORGANISMEN.map((o) => [o.token, o.label])) as Record<Organismus, string>;
/** Row-scope Tab.-3 target per organism (nested if over the class-keyed TAB3 columns; `wassergueteklasse` is inherited on -05). */
export const ZIEL_EXPR = ORGANISMEN.slice(0, -1).reduceRight(
  (acc, o) => `if(organismus == '${o.token}', lookup('TAB3', wassergueteklasse, '${o.col}'), ${acc})`,
  `lookup('TAB3', wassergueteklasse, '${ORGANISMEN[ORGANISMEN.length - 1].col}')`,
);
/** The nine per-organism outputs of M12002-05 (symbol stem → label / unit / clause), one derived field each. */
export const ORG_OUTPUTS: ReadonlyArray<{ key: string; sym: (stem: string) => string; label: (l: string) => string; unit: string | null; clause: string; note: string }> = [
  { key: 'n', sym: (s) => `n_${s}`, label: (l) => `Anzahl vollständiger Probenpaare — ${l}`, unit: null, clause: '§3.3.3', note: '"sind je 16 korrespondierende Proben im Zulauf und Ablauf zu nehmen" (L679)' },
  { key: 'n_erreicht', sym: (s) => `n_erreicht_${s}`, label: (l) => `Probenpaare mit erreichtem Leistungsziel — ${l}`, unit: null, clause: '§3.3.3', note: 'Leistungsziel erreicht oder überschritten, oder Ablauf < 1 KBE bzw. PFU je 100 ml (L681 / L683)' },
  { key: 'max_unterschreitung', sym: (s) => `max_unterschreitung_${s}`, label: (l) => `Größte Unterschreitung des Leistungsziels — ${l}`, unit: 'log10', clause: '§3.3.3', note: 'zulässig ≤ 1,0 log10 (A) / ≤ 2,0 log10 (B-1, C-1) (L681 / L683)' },
  { key: 'mw', sym: (s) => `mw_${s}_calc`, label: (l) => `Mittelwert MW der log10-Reduktionen — ${l}`, unit: 'log10', clause: 'Anhang C.2', note: 'mean_rows über die Zeilen des Organismus (L1821)' },
  { key: 'sd', sym: (s) => `sd_${s}_calc`, label: (l) => `Standardabweichung SD der Stichprobe — ${l}`, unit: 'log10', clause: 'Anhang C.2', note: 'stdev_rows (Stichprobe, n − 1) über die Zeilen des Organismus (L1821); mindestens 2 Zeilen' },
  { key: 'p10', sym: (s) => `p10_${s}_calc`, label: (l) => `10. Perzentil = MW − 1,282 · SD — ${l}`, unit: 'log10', clause: 'Anhang C.2, Gl. C.2-1', note: 'k aus GL_C2_1 (L1822)' },
  { key: 'p50', sym: (s) => `p50_${s}_calc`, label: (l) => `50. Perzentil (Median) — ${l}`, unit: 'log10', clause: 'Anhang C.2, Gl. C.2-2', note: 'median_rows über die Zeilen des Organismus (L1823)' },
  { key: 'validierung_ok', sym: (s) => `validierung_ok_${s}`, label: (l) => `Vereinfachtes Validierungsmonitoring bestanden (1 = ja) — ${l}`, unit: null, clause: '§3.3.3', note: '≥ 16 Paare, ≥ 15 (A) / ≥ 8 (B-1, C-1) erreicht, größte Unterschreitung ≤ 1,0 / 2,0 log10 (S3_3_3; L681 / L683); ohne S3_3_3-Zeile (B-2, C-2, D) unentscheidbar' },
  { key: 'perzentil_ok', sym: (s) => `perzentil_ok_${s}`, label: (l) => `Umfängliches Validierungsmonitoring: gefordertes Perzentil ≥ Leistungsziel (1 = ja) — ${l}`, unit: null, clause: 'Anhang C.1 / C.2', note: '10. Perzentil (A) bzw. Median (B-1, C-1) nach ANHANGC1 gegen das TAB3-Ziel (L1800 / L1802)' },
];

const T3_A = Q.L549_552, T3_B = Q.L553_554, T3_C = Q.L555_556, T3_D = Q.L570_573;

/** Tab. 3 fill on M12002-02, keyed on the worksheet's own `wassergueteklasse`. */
const tab3Fill = (symbol: string, value: string, label: string, unit: string | null, dataType: 'number' | 'text', quote: string, printed: string, visible_when: string | null = null, note = ''): FieldConfigEntry => WS02({
  symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 3 (Arbeitshilfe A)' },
  lookup: { table_code: 'TAB3', role: dataType === 'number' ? 'limit' : 'value', keys: [{ column: 'klasse', from_symbol: 'wassergueteklasse' }], value },
  visible_when, verification_quote: quote,
  create: { section_code: 'M12002-02-B', label_de: `${label} — Tab. 3 (${printed})`, data_type: dataType, unit, clause_reference: '§3.1, Tab. 3',
    description: `Plan 3: Wert aus TAB3 zur gewählten Wassergüteklasse (locked — Mindestanforderung, L534); die Routineproben-Zeilen (M12002-06) vergleichen gegen dieselbe Tabellenzeile${note}.` },
});
/** Tab. 3 log10 target fill on M12002-04 (class inherited there), visible for the classes that print targets. */
const zielFill = (o: (typeof ORGANISMEN)[number], printed: string): FieldConfigEntry => WS04({
  symbol: `leistungsziel_${o.stem}_tab3`, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 3 (Arbeitshilfe A)' },
  lookup: { table_code: 'TAB3', role: 'limit', keys: [{ column: 'klasse', from_symbol: 'wassergueteklasse' }], value: o.col },
  visible_when: LEISTUNGSZIELE, verification_quote: `${T3_A} — ${Q.L668}`,
  create: { section_code: 'M12002-04-B', label_de: `Leistungsziel log10-Reduktion ${o.label} — Tab. 3 (${printed})`, data_type: 'number', unit: 'log10', clause_reference: '§3.1, Tab. 3; §3.3.3',
    description: `Plan 3: Leistungsziel aus TAB3 zur (geerbten) Wassergüteklasse, je Indikatororganismus ("separat für jeden Indikatororganismus", L668); nur für A / B-1 / C-1 sichtbar (B-2 / C-2 / D drucken "－"); das bestehende Skalar leistungsziel_log10 bleibt (m1200_2-D-1).` },
});
/** Derived output on M12002-05 D. */
const out05 = (symbol: string, label: string, unit: string | null, clause: string, quote: string, description: string): FieldConfigEntry => WS05({
  symbol, widget: 'derived', ui_config: null, visible_when: LEISTUNGSZIELE, verification_quote: quote,
  create: { section_code: 'M12002-05-D', label_de: label, data_type: 'number', unit, clause_reference: clause, description },
});

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- M12002-02 (Wassergüteklasse-Auswahl & Mindestanforderungen): the Tab.-3 limits next to the class ----
  tab3Fill('zielvorgabe_aufbereitung_tab3', 'zielvorgabe', 'Zielvorgabe für die Aufbereitung', null, 'text', `${T3_A} — ${T3_D}`, 'A…C: Mechanisch-biologische Behandlung, Filtration, Desinfektion · D: ohne Filtration', null, '; Filtration für A bis C gefordert, für D optional (L894) — REQ-09 auf truebung_ablauf STAGED (m1200_2-G-3)'),
  tab3Fill('e_coli_limit_1200_2', 'e_coli_max', 'E. coli — Grenzwert', 'KBE/100 ml', 'number', `${T3_A} — ${T3_D}`, 'A ≤ 10 · B/C ≤ 100 · D ≤ 10.000'),
  tab3Fill('enterokokken_limit_1200_2', 'enterokokken_max', 'Intestinale Enterokokken — Grenzwert', 'KBE/100 ml', 'number', `${T3_A} — ${T3_C}`, 'A/B ≤ 100 · C ≤ 400 · D –', KLASSEN_A_BIS_C, '; für D druckt Tab. 3 "-" (L570) — ausgeblendet'),
  tab3Fill('bsb5_limit_1200_2', 'bsb5_max', 'BSB5 — Grenzwert', 'mg/l', 'number', T3_A, 'A ≤ 10', KLASSE_A, '; B bis D: "gemäß Richtlinie 91/271/EWG" (bsb5_anforderung_tab3, Verweis)'),
  tab3Fill('bsb5_anforderung_tab3', 'bsb5_text', 'BSB5 — gedruckte Anforderung', null, 'text', `${T3_B} — ${T3_D}`, 'A ≤ 10 mg/l · B/C gemäß Richtlinie 91/271/EWG · D BSB5 und AFS gemäß Richtlinie', null, '; die Richtlinie 91/271/EWG ist ein Verweis auf ein anderes Dokument (Content-Boundary: nur angezeigt, nie ausgefüllt)'),
  tab3Fill('afs_limit_1200_2', 'afs_max', 'AFS — Grenzwert', 'mg/l', 'number', `${T3_A} — ${T3_C}`, 'A…C ≤ 10', KLASSEN_A_BIS_C, '; für D "gemäß Richtlinie 91/271/EWG" (L573); die C-Zeile druckt die Einheit als "mg/e" (m1200_2-U-2)'),
  tab3Fill('truebung_limit_1200_2', 'truebung_max', 'Trübung — Grenzwert', 'NTU', 'number', `${T3_A} — ${Q.L894}`, 'A…C ≤ 2', KLASSEN_A_BIS_C, '; REQ-09 (M12002-08, liest truebung_ablauf dort ohne Konsument) STAGED (m1200_2-G-3)'),
  tab3Fill('legionella_limit_1200_2', 'legionella_max', 'Legionella spp. — Grenzwert (strikt "<")', 'KBE/l', 'number', T3_A, '< 1.000, wenn das Risiko der Aerosolbildung besteht', AEROSOL, '; nur bei Aerosolrisiko sichtbar — die bestehende Eingabe legionella (M12002-06) bleibt immer sichtbar (m1200_2-C-4)'),
  tab3Fill('nematoden_limit_1200_2', 'nematoden_max', 'Intestinale Nematoden — Grenzwert', 'Eier/l', 'number', T3_A, '≤ 1 Ei pro Liter für Weideflächen oder Futterpflanzen', WEIDE, '; nur bei Weide-/Futterpflanzenbewässerung sichtbar — intest_nematoden (M12002-06) bleibt immer sichtbar (m1200_2-C-4)'),
  WS02({ symbol: 'validierung_erforderlich_tab3', widget: 'derived', ui_config: null, verification_quote: `${Q.L616} — ${T3_B}`,
    create: { section_code: 'M12002-02-D', label_de: 'Validierung der Leistungsziele erforderlich (1 = Tab. 3 druckt Leistungsziele: A, B-1, C-1; 0 = B-2, C-2, D)', data_type: 'number', unit: null, clause_reference: '§3.1, Tab. 3; §3.3.1',
      description: 'Plan 3: Ausgabe der Gleichung M12002-02-D1 (lookup TAB3.leistungsziele zur gewählten Klasse; skalar, nicht materialisiert); die Validierungs-Arbeitsblätter -04 / -05 zeigen ihre erzeugten Felder nur für A / B-1 / C-1 (die Abschnittsregeln auf den bestehenden Feldern sind STAGED, m1200_2-C-2).' } }),

  // ---- M12002-04 (Validierung — Planungsphase): the per-organism targets ----
  zielFill(ORGANISMEN[0], 'A / B-1 / C-1 ≥ 5,0'),
  zielFill(ORGANISMEN[1], 'A / B-1 / C-1 ≥ 6,0'),
  zielFill(ORGANISMEN[2], 'A / B-1 / C-1 ≥ 6,0'),
  zielFill(ORGANISMEN[3], 'A / B-1 / C-1 ≥ 4,0'),
  zielFill(ORGANISMEN[4], 'A / B-1 / C-1 ≥ 5,0'),

  // ---- M12002-05 (Validierung — Inbetriebnahme): the paired samples register + per-organism statistics ----
  WS05({
    symbol: 'validierungsproben', widget: 'register', visible_when: LEISTUNGSZIELE,
    ui_config: {
      title: 'Validierungsproben (gepaart)', subtitle: '§3.3.3 / Anhang C.2 — je Indikatororganismus 16 korrespondierende Zulauf-/Ablaufproben; LRV_i = log10(x_i / y_i); liegt der Ablauf unter der Nachweisgrenze, die Nachweisgrenze als y_i eintragen (L1819) und "Ablauf < 1 KBE/PFU" markieren (Ziel gilt als erreicht, L681)', add_label: '+ Probenpaar', placement: 'section',
      columns: [
        { key: 'organismus', label: 'Indikatororganismus', type: 'enum', required: true, options: [...ORGANISMUS_TOKENS], option_labels: ORGANISMUS_LABELS, discriminator: true },
        { key: 'date', label: 'Datum', type: 'date', required: true },
        { key: 'x_i', label: 'Zulauf x_i', type: 'number', required: true, min: 0, unit: 'KBE bzw. PFU/100 ml', aria_label: 'Zulaufkonzentration der Probe' },
        { key: 'y_i', label: 'Ablauf y_i (bei < NWG: Nachweisgrenze)', type: 'number', required: true, min: 0, unit: 'KBE bzw. PFU/100 ml', aria_label: 'Ablaufkonzentration der Probe' },
        { key: 'below_detection', label: 'Ablauf < 1 KBE bzw. PFU je 100 ml', type: 'boolean' },
        { key: 'lrv_i', label: 'LRV_i', type: 'derived', expr: 'log10(x_i / y_i)' },
        { key: 'ziel', label: 'Leistungsziel (Tab. 3)', type: 'derived', expr: ZIEL_EXPR },
        { key: 'erreicht', label: 'Ziel erreicht', type: 'derived', expr: 'if(below_detection == true OR lrv_i >= ziel, 1, 0)', display: 'badge', value_labels: { '1': 'erreicht', '0': 'nicht erreicht' } },
        { key: 'shortfall', label: 'Unterschreitung', type: 'derived', expr: 'if(below_detection == true OR lrv_i >= ziel, 0, ziel - lrv_i)' },
      ],
      footer: ['n_proben_validierung', ...ORGANISMEN.map((o) => `validierung_ok_${o.stem}`)],
      note: Q.L679,
    },
    verification_quote: `${Q.L679} — ${Q.L681} — ${Q.L683} — ${Q.L1817} — ${Q.L1819}`,
    create: { section_code: 'M12002-05-B', label_de: 'Validierungsproben (gepaarte Zulauf-/Ablaufproben je Indikatororganismus)', data_type: 'json', unit: null, clause_reference: '§3.3.3; Anhang C.2',
      description: 'Plan 3: Zeilen je Probenpaar (Organismus, Datum, x_i, y_i, Nachweisgrenzen-Flag); LRV_i, Tab.-3-Ziel, erreicht / Unterschreitung je Zeile; je Organismus n / n_erreicht / max. Unterschreitung / MW / SD / P10 / P50 / Verdikte (M12002-05-D…); ersetzt die Skalare x_i / y_i / lrv_i / log10_reduktionen / probenanzahl_zulauf / mw_log10 / sd_log10 (m1200_2-D-2 … -D-4); REQ-04 / -05 / -06 STAGED (m1200_2-G-1 / -G-2 / -G-7).' },
  }),
  out05('n_proben_validierung', 'Anzahl vollständiger Probenpaare (alle Organismen)', null, '§3.3.3', Q.L679, 'Plan 3: Ausgabe der Gleichung M12002-05-D1 (count_rows über validierungsproben); Übernahme als probenanzahl_zulauf / REQ-05 STAGED (m1200_2-D-3 / -G-1).'),
  out05('n_pass_min_tab', 'Mindestzahl erreichter Probenpaare nach §3.3.3 (A 15 · B-1/C-1 8 von 16)', null, '§3.3.3', `${Q.L681} — ${Q.L683}`, 'Plan 3: Ausgabe der Gleichung M12002-05-D2 (lookup S3_3_3.n_pass_min zur geerbten Klasse; skalar, nicht materialisiert; keine Zeile für B-2 / C-2 / D).'),
  out05('max_unterschreitung_zul', 'Zulässige größte Unterschreitung des Leistungsziels (A 1,0 · B-1/C-1 2,0 log10)', 'log10', '§3.3.3', `${Q.L681} — ${Q.L683}`, 'Plan 3: Ausgabe der Gleichung M12002-05-D3 (lookup S3_3_3.max_shortfall_log10; skalar, nicht materialisiert).'),
  out05('perzentil_erforderlich', 'Gefordertes Perzentil der umfänglichen Validierung (A 10 · B-1/C-1 50)', null, 'Anhang C.1', `${Q.L1800} — ${Q.L1802}`, 'Plan 3: Ausgabe der Gleichung M12002-05-D4 (lookup ANHANGC1.percentile; skalar, nicht materialisiert); REQ-06 (M12002-03) STAGED (m1200_2-G-2).'),
  out05('k_faktor_tab', 'k-Faktor des 10.-Perzentil-Schätzwerts (Gl. C.2-1: 1,282)', null, 'Anhang C.2, Gl. C.2-1', Q.L1822, 'Plan 3: Ausgabe der Gleichung M12002-05-D5 (lookup GL_C2_1.wert; skalar, nicht materialisiert); das bestehende typbare k_faktor_normal bleibt (m1200_2-D-5).'),
  ...ORGANISMEN.flatMap((o, oi) => ORG_OUTPUTS.map((d, di) => out05(d.sym(o.stem), d.label(o.label), d.unit, d.clause, d.key === 'p10' ? Q.L1822 : d.key === 'p50' ? Q.L1823 : d.key === 'perzentil_ok' ? `${Q.L1800} — ${Q.L1802}` : `${Q.L681} — ${Q.L683}`,
    `Plan 3: Ausgabe der Gleichung M12002-05-D${6 + oi * ORG_OUTPUTS.length + di} (${d.note}; Zeilen mit organismus = '${o.token}').`))),
  // existing -05 fields: the Anhang-C inputs by monitoring type, the two prod percentile outputs by class (consumer-free, gate-free, outside every chain)
  WS05({ symbol: 'confidence_alpha', widget: 'scalar', ui_config: null, visible_when: UMFAENGLICH_MC, verification_quote: Q.L1885 }),
  WS05({ symbol: 'k_faktor_normal', widget: 'scalar', ui_config: null, visible_when: UMFAENGLICH_BASIS, verification_quote: Q.L1822 }),
  WS05({ symbol: 'perzentil_10_log10', widget: 'scalar', ui_config: null, visible_when: KLASSE_A, verification_quote: Q.L1800 }),
  WS05({ symbol: 'perzentil_50_log10', widget: 'scalar', ui_config: null, visible_when: KLASSEN_B1_C1, verification_quote: Q.L1802 }),

  // ---- M12002-06 (Analytik & Probenahme): routine samples against the Tab.-3 limit of the class ----
  WS06({
    symbol: 'routineproben_1200_2', widget: 'register',
    ui_config: {
      title: 'Routineproben (Stelle der Einhaltung)', subtitle: '§3.1 / §6.4 — je Probe Datum, Parameter, Messwert; Vergleich mit dem Tab.-3-Wert der Wassergüteklasse (Legionella strikt "<", sonst "≤"); Parameter ohne gedruckten Wert zählen nicht; die Klasse muss dieses Arbeitsblatt erreichen (m1200_2-C-1)', add_label: '+ Probe', placement: 'section',
      columns: [
        { key: 'date', label: 'Datum', type: 'date', required: true },
        { key: 'parameter', label: 'Parameter', type: 'enum', required: true, options: [...PROBE_PARAMETER_TOKENS], option_labels: { e_coli: 'E. coli (KBE/100 ml)', enterokokken: 'Intestinale Enterokokken (KBE/100 ml)', bsb5: 'BSB5 (mg/l)', afs: 'AFS (mg/l)', truebung: 'Trübung (NTU)', legionella: 'Legionella spp. (KBE/l)', nematoden: 'Intestinale Nematoden (Eier/l)' }, discriminator: true },
        { key: 'wert', label: 'Messwert', type: 'number', required: true, min: 0, aria_label: 'Messwert der Probe' },
        { key: 'limit', label: 'Wert nach Tab. 3', type: 'derived', expr: "if(parameter == 'e_coli', lookup('TAB3', wassergueteklasse, 'e_coli_max'), if(parameter == 'enterokokken', lookup('TAB3', wassergueteklasse, 'enterokokken_max'), if(parameter == 'bsb5', lookup('TAB3', wassergueteklasse, 'bsb5_max'), if(parameter == 'afs', lookup('TAB3', wassergueteklasse, 'afs_max'), if(parameter == 'truebung', lookup('TAB3', wassergueteklasse, 'truebung_max'), if(parameter == 'legionella', lookup('TAB3', wassergueteklasse, 'legionella_max'), lookup('TAB3', wassergueteklasse, 'nematoden_max')))))))" },
        { key: 'relevant', label: 'Wert vorhanden', type: 'derived', expr: 'if(limit IS NULL, 0, 1)', display: 'badge', value_labels: { '1': '', '0': 'kein Tab.-3-Wert (Klasse / Parameter)' } },
        { key: 'ok', label: 'eingehalten', type: 'derived', expr: "if(limit IS NULL, 0, if(parameter == 'legionella', if(wert < limit, 1, 0), if(wert <= limit, 1, 0)))", display: 'badge', value_labels: { '1': 'eingehalten', '0': 'überschritten' } },
      ],
      footer: ['konformitaet_calc'],
      note: Q.L1283,
    },
    verification_quote: `${Q.L534} — ${Q.L1283}`,
    create: { section_code: 'M12002-06-B', label_de: 'Routineproben (Datum, Parameter, Messwert → Einhaltung des Tab.-3-Werts)', data_type: 'json', unit: null, clause_reference: '§3.1; §6.4',
      description: 'Plan 3: Zeilen je Routineprobe; Wert je Zeile aus TAB3 zur geerbten Wassergüteklasse (Zeilen-Scope — erreicht -06 erst nach der Konsumenten-Ergänzung m1200_2-C-1, bis dahin "kein Tab.-3-Wert"); Anteil eingehaltener Proben → konformitaet_calc (M12002-06-D1); ersetzt das manuell getippte perzentil_konformitaet (M12002-13) — STAGED (m1200_2-D-6 / -G-5); die Abweichungsgrenze (1 log10 / 100 %, L534 / L1283) ist nicht kodiert (Residuum).' },
  }),
  WS06({ symbol: 'konformitaet_calc', widget: 'derived', ui_config: null, verification_quote: `${Q.L534} — ${Q.L1283}`,
    create: { section_code: 'M12002-06-D', label_de: 'Anteil der Routineproben, die den Tab.-3-Wert einhalten (Soll ≥ 90 %)', data_type: 'number', unit: '%', clause_reference: '§3.1; §6.4',
      description: 'Plan 3: Ausgabe der Gleichung M12002-06-D1 (count_rows(ok == 1) · 100 / count_rows(relevant == 1) über routineproben_1200_2; 100 = Prozent; keine Probe mit Wert ⇒ unentscheidbar, nie 0); Übernahme als perzentil_konformitaet / REQ-03 (M12002-13) STAGED (m1200_2-D-6 / -G-5).' } }),

  // ---- M12002-09 (Filtrationsstufe): membrane vs sand inputs ----
  WS09({ symbol: 'mbr_porendurchmesser', widget: 'scalar', ui_config: null, visible_when: MEMBRAN_MF_UF_MBR, verification_quote: Q.L953 }),
  WS09({ symbol: 'filtergeschw_langsam', widget: 'scalar', ui_config: null, visible_when: LANGSAMSAND, verification_quote: Q.L941 }),
  WS09({ symbol: 'filtergeschw_schnellsand', widget: 'scalar', ui_config: null, visible_when: SCHNELLSAND, verification_quote: Q.L816 }),

  // ---- M12002-11 (Desinfektionsstufe): the dose switch ----
  WS11({ symbol: 'uv_dosis', widget: 'scalar', ui_config: null, visible_when: UV, verification_quote: Q.L1068 }),
  WS11({ symbol: 'uv_dosis_referenz', widget: 'scalar', ui_config: null, visible_when: UV, verification_quote: Q.L784_789 }),
  WS11({ symbol: 'ozon_dosis_spez', widget: 'scalar', ui_config: null, visible_when: OZON, verification_quote: Q.L1099 }),
  WS11({ symbol: 'reaktor_hydraulik_charakterisiert', widget: 'attestation', ui_config: null, visible_when: CHEMISCH, verification_quote: `${Q.L804} — ${Q.L790_794}` }),
  WS11({ symbol: 'ct_wert', widget: 'scalar', ui_config: null, visible_when: CHLOR_CLO2, verification_quote: Q.L790_794 }),
  WS11({ symbol: 'clo2_restkonz', widget: 'scalar', ui_config: null, visible_when: CLO2, verification_quote: Q.L1135 }),
  WS11({ symbol: 'perameisensaeure_konz', widget: 'scalar', ui_config: null, visible_when: PFA, verification_quote: Q.L1163 }),

  // ---- M12002-12 (Verfahrensketten-Auswahl): the chain as rows with Tab. B.2 credits, Tab. 6 monitoring, Tab. 4 / E.1 hints ----
  WS12({
    symbol: 'verfahrenskette_stufen', widget: 'register',
    ui_config: {
      title: 'Verfahrenskette (Aufbereitungsstufen)', subtitle: 'Bild 1 / Anhang B — je Stufe die Tab.-B.2-Zeile; erreichbare log10-Reduktionen (indikativ, überschreibbar mit Referenzanlagen-Daten — bei "abweichend" alle drei Werte der Zeile eintragen, die Tabelle füllt eine abweichende Zeile nicht nach) werden über die Kette addiert; Tab.-6-Überwachung, Tab.-4-Validierungsmethodik und Tab.-E.1-Beispiel je Stufe, wo gedruckt', add_label: '+ Stufe', placement: 'section',
      columns: [
        { key: 'reihenfolge', label: 'Nr.', type: 'number', required: true, min: 1, aria_label: 'Reihenfolge der Stufe' },
        { key: 'stufe', label: 'Aufbereitungsstufe (Tab. B.2)', type: 'lookup_key', required: true, lookup: { table_code: 'TABB2' }, discriminator: true },
        { key: 'credit_viren', label: 'log10 Viren (erreichbar)', type: 'lookup_value', lookup: { table_code: 'TABB2', key_column: 'stufe', value: 'viren_erreichbar' } },
        { key: 'credit_protozoen', label: 'log10 Protozoen (erreichbar)', type: 'lookup_value', lookup: { table_code: 'TABB2', key_column: 'stufe', value: 'protozoen_erreichbar' } },
        { key: 'credit_bakterien', label: 'log10 Bakterien (erreichbar)', type: 'lookup_value', lookup: { table_code: 'TABB2', key_column: 'stufe', value: 'bakterien_erreichbar' } },
        { key: 'credit_abweichend', label: 'abweichend (Referenzanlage / Nachweis)', type: 'boolean' },
        { key: 'erwartbar_viren', label: 'erwartbar Viren', type: 'derived', expr: "lookup('TABB2', stufe, 'viren_erwartbar_text')" },
        { key: 'erwartbar_protozoen', label: 'erwartbar Protozoen', type: 'derived', expr: "lookup('TABB2', stufe, 'protozoen_erwartbar_text')" },
        { key: 'erwartbar_bakterien', label: 'erwartbar Bakterien', type: 'derived', expr: "lookup('TABB2', stufe, 'bakterien_erwartbar_text')" },
        { key: 'ueberwachung_online', label: 'Betriebsparameter online (Tab. 6)', type: 'derived', expr: "lookup('TAB6', stufe, 'parameter_online')" },
        { key: 'ueberwachung_periodisch', label: 'Betriebsparameter periodisch (Tab. 6)', type: 'derived', expr: "lookup('TAB6', stufe, 'parameter_periodisch')" },
        { key: 'validierung_tab4', label: 'Validierungsmethodik (Tab. 4)', type: 'derived', expr: "lookup('TAB4', stufe, 'methodik')" },
        { key: 'beispiel_e1', label: 'Referenzanlage Schweinfurt — Betriebsbedingungen (Tab. E.1)', type: 'derived', expr: "lookup('TABE1_STUFEN', stufe, 'betriebsbedingungen')" },
        { key: 'auslegung', label: 'Auslegungsparameter', type: 'text' },
        { key: 'betriebsfenster_min', label: 'Betriebsfenster min', type: 'number', aria_label: 'untere Grenze des Betriebsfensters' },
        { key: 'betriebsfenster_max', label: 'Betriebsfenster max', type: 'number', aria_label: 'obere Grenze des Betriebsfensters' },
        { key: 'betriebsfenster_einheit', label: 'Einheit', type: 'text' },
      ],
      override: { flag_key: 'credit_abweichend', applies_to: ['credit_viren', 'credit_protozoen', 'credit_bakterien'], policy: 'anhaltswert' },
      footer: ['stufen_count', 'credit_sum_viren', 'credit_sum_protozoen', 'credit_sum_bakterien'],
      note: Q.L659,
    },
    verification_quote: `${Q.L640} — ${Q.L659} — ${Q.L1748} — ${Q.L663}`,
    create: { section_code: 'M12002-12-B', label_de: 'Verfahrenskette — Aufbereitungsstufen mit indikativen log10-Reduktionen (Tab. B.2), Betriebsparametern (Tab. 6) und Betriebsfenstern', data_type: 'json', unit: null, clause_reference: '§3.3.2; §3.3.3; Anhang B, Tab. B.2; §6.4, Tab. 6',
      description: 'Plan 3: Zeilen je Aufbereitungsstufe (TABB2-Zeile; erreichbare log10 je Organismengruppe als überschreibbare Anhaltswerte, Begründung je Zeile; erwartbar / Tab. 6 / Tab. 4 / Tab. E.1 als Anzeige, null wo die Tabelle keine Zeile druckt); Σ Credits je Gruppe → credit_sum_* (M12002-12-D1 … -D3), Vergleich mit dem Tab.-3-Ziel → credit_ok_* (M12002-12-D4 … -D6, nur Hinweis); ersetzt das Freitextfeld verfahrenskette (m1200_2-D-7).' },
  }),
  ...(['viren', 'protozoen', 'bakterien'] as const).map((g, i) => WS12({ symbol: `credit_sum_${g}`, widget: 'derived', ui_config: null, verification_quote: `${Q.L640} — ${Q.L1748}`,
    create: { section_code: 'M12002-12-D', label_de: `Σ erreichbare log10-Reduktion über die Verfahrenskette — ${g === 'viren' ? 'Viren' : g === 'protozoen' ? 'Protozoen' : 'Bakterien'} (indikativ, Tab. B.2)`, data_type: 'number', unit: 'log10', clause_reference: '§3.3.2; Anhang B, Tab. B.2',
      description: `Plan 3: Ausgabe der Gleichung M12002-12-D${i + 1} (sum_rows über verfahrenskette_stufen.credit_${g}; "jeweils zu einer Gesamtreduktion addiert", L640); indikativ — kein Nachweis (L1913: ohne experimentellen Nachweis nicht übernehmbar).` } })),
  ...(['viren', 'protozoen', 'bakterien'] as const).map((g, i) => WS12({ symbol: `credit_ok_${g}`, widget: 'derived', ui_config: null, visible_when: LEISTUNGSZIELE, verification_quote: `${Q.L640} — ${T3_A}`,
    create: { section_code: 'M12002-12-D', label_de: `Σ erreichbare log10-Reduktion ≥ Leistungsziel der Klasse (1 = ja, Hinweis) — ${g === 'viren' ? 'Viren (Coliphagen ≥ 6,0)' : g === 'protozoen' ? 'Protozoen (Clostridium ≥ 4,0; m1200_2-J-3)' : 'Bakterien (E. coli ≥ 5,0)'}`, data_type: 'number', unit: null, clause_reference: '§3.3.2; §3.1, Tab. 3',
      description: `Plan 3: Ausgabe der Gleichung M12002-12-D${i + 4} (Σ Credits gegen das TAB3-Ziel der geerbten Klasse; Planungs-Hinweis, kein Gate — die Validierung nach §3.3.3 bleibt maßgeblich).` } })),
  WS12({ symbol: 'stufen_count', widget: 'derived', ui_config: null, verification_quote: Q.L640,
    create: { section_code: 'M12002-12-D', label_de: 'Anzahl vollständiger Stufen der Verfahrenskette', data_type: 'number', unit: null, clause_reference: '§3.3.2',
      description: 'Plan 3: Ausgabe der Gleichung M12002-12-D7 (count_rows über verfahrenskette_stufen).' } }),

  // ---- M12002-13 (Betriebsmonitoring): the Tab.-6 monitoring parameters as rows + stage-specific inputs ----
  WS13({
    symbol: 'betriebsparameter', widget: 'register',
    ui_config: {
      title: 'Betriebsparameter-Überwachung (Tab. 6)', subtitle: '§6.4 — je Betriebsparameter die Tab.-6-Zeile der Stufe, Messhäufigkeit, zulässiges Betriebsfenster und Alarmverzögerung (5 min bis 30 min nach L1289; REQ-11 liest ≤ 30 min)', add_label: '+ Parameter', placement: 'section',
      columns: [
        { key: 'stufe', label: 'Aufbereitungsstufe (Tab. 6)', type: 'lookup_key', required: true, lookup: { table_code: 'TAB6' }, discriminator: true },
        { key: 'parameter_online', label: 'Online-Parameter (Tab. 6)', type: 'lookup_value', lookup: { table_code: 'TAB6', key_column: 'stufe', value: 'parameter_online' } },
        { key: 'parameter_periodisch', label: 'Periodische Parameter (Tab. 6)', type: 'lookup_value', lookup: { table_code: 'TAB6', key_column: 'stufe', value: 'parameter_periodisch' } },
        { key: 'frequenz_periodisch', label: 'Häufigkeit periodisch (Tab. 6)', type: 'lookup_value', lookup: { table_code: 'TAB6', key_column: 'stufe', value: 'frequenz_periodisch' } },
        { key: 'parameter', label: 'Überwachter Parameter', type: 'text', required: true },
        { key: 'messhaeufigkeit', label: 'Messhäufigkeit', type: 'enum', required: true, options: ['online', 'taeglich', 'woechentlich', 'monatlich'], option_labels: { online: 'Online', taeglich: 'Täglich', woechentlich: 'Wöchentlich', monatlich: 'Monatlich' } },
        { key: 'fenster_min', label: 'Betriebsfenster min', type: 'number', aria_label: 'untere Alarmgrenze' },
        { key: 'fenster_max', label: 'Betriebsfenster max', type: 'number', aria_label: 'obere Alarmgrenze' },
        { key: 'einheit', label: 'Einheit', type: 'text' },
        { key: 'alarm_verzoegerung_min', label: 'Alarmverzögerung (5 bis 30 min)', type: 'number', min: 0, unit: 'min', aria_label: 'Alarmverzögerung in Minuten' },
        { key: 'online_ok', label: 'online', type: 'derived', expr: "if(messhaeufigkeit == 'online', 1, 0)", display: 'badge', value_labels: { '1': '', '0': 'nicht online (L1287)' } },
        { key: 'alarm_ok', label: 'Alarm', type: 'derived', expr: 'if(alarm_verzoegerung_min IS NULL, 0, if(alarm_verzoegerung_min <= 30, 1, 0))', display: 'badge', value_labels: { '1': '', '0': 'Alarmverzögerung fehlt oder > 30 min' } },
      ],
      footer: ['parameter_count', 'parameter_nicht_online', 'alarm_verzoegerung_max_calc'],
      note: Q.L1289,
    },
    verification_quote: `${Q.L663} — ${Q.L1297} — ${Q.L1287} — ${Q.L1289}`,
    create: { section_code: 'M12002-13-B', label_de: 'Betriebsparameter-Überwachung (Stufe nach Tab. 6, Parameter, Messhäufigkeit, Betriebsfenster, Alarmverzögerung)', data_type: 'json', unit: null, clause_reference: '§6.4, Tab. 6; §3.3.3',
      description: 'Plan 3: Zeilen je überwachtem Betriebsparameter (TAB6-Zeile der Stufe mit den gedruckten Parametern / Häufigkeiten als Anzeige; eigene Messhäufigkeit als prod-Token; Betriebsfenster; Alarmverzögerung — SR-2: 5 min bis 30 min (L1289) als Text, geprüft wird das prod-Gate-Maximum 30); count / nicht online / max. Verzögerung → M12002-13-D1 … -D3; ersetzt die Skalare messhauefigkeit / alarm_verzoegerung_min (m1200_2-D-8); REQ-11 STAGED (m1200_2-G-6).' },
  }),
  WS13({ symbol: 'parameter_count', widget: 'derived', ui_config: null, verification_quote: Q.L663,
    create: { section_code: 'M12002-13-D', label_de: 'Anzahl überwachter Betriebsparameter', data_type: 'number', unit: null, clause_reference: '§6.4, Tab. 6', description: 'Plan 3: Ausgabe der Gleichung M12002-13-D1 (count_rows über betriebsparameter).' } }),
  WS13({ symbol: 'parameter_nicht_online', widget: 'derived', ui_config: null, verification_quote: Q.L1287,
    create: { section_code: 'M12002-13-D', label_de: 'Betriebsparameter ohne Online-Messung', data_type: 'number', unit: null, clause_reference: '§6.4', description: 'Plan 3: Ausgabe der Gleichung M12002-13-D2 (count_rows(online_ok == 0)); "Durch Online-Monitoring von relevanten Betriebsparametern sind der Betriebszustand … zu allen Zeitpunkten sicherzustellen" (L1287); REQ-11 STAGED (m1200_2-G-6).' } }),
  WS13({ symbol: 'alarm_verzoegerung_max_calc', widget: 'derived', ui_config: null, verification_quote: Q.L1289,
    create: { section_code: 'M12002-13-D', label_de: 'Größte Alarmverzögerung über die Betriebsparameter (Soll ≤ 30 min)', data_type: 'number', unit: 'min', clause_reference: '§6.4', description: 'Plan 3: Ausgabe der Gleichung M12002-13-D3 (max_rows über betriebsparameter.alarm_verzoegerung_min, Zeilen mit Eintrag); Übernahme als alarm_verzoegerung_min / REQ-11 STAGED (m1200_2-D-8 / -G-6).' } }),
  WS13({ symbol: 'messhauefigkeit_integritaet', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: MEMBRAN_MF_UF_MBR, verification_quote: Q.L1304_1310 }),
  WS13({ symbol: 'transmembrandruck', widget: 'scalar', ui_config: null, visible_when: MEMBRAN_ALLE, verification_quote: `${Q.L1300_1303} — ${Q.L805}` }),
  WS13({ symbol: 'permeatfluss', widget: 'scalar', ui_config: null, visible_when: MEMBRAN_ALLE, verification_quote: `${Q.L805} — ${Q.L806}` }),
  WS13({ symbol: 'uv_transmission', widget: 'scalar', ui_config: null, visible_when: UV, verification_quote: Q.L1317 }),
  WS13({ symbol: 'delta_sak254', widget: 'scalar', ui_config: null, visible_when: OZON, verification_quote: `${Q.L1101} — ${Q.L1312_1315}` }),
  WS13({ symbol: 'restchlor_freies', widget: 'scalar', ui_config: null, visible_when: CHLOR, verification_quote: Q.L1319 }),

  // ---- M12002-14 (Speicherung & Transport): the secondary-disinfection method only when required (REQ-12's own guard) ----
  WS14({ symbol: 'sekundaerdesinfektion_verfahren', widget: 'scalar', ui_config: null, visible_when: SEKUNDAER, verification_quote: `${Q.L1050} — ${Q.L1135}` }),

  // ---- M12002-15 (Kosten): cost items per stage with the §8.2 ranges as hints ----
  WS15({
    symbol: 'kostenpositionen', widget: 'register',
    ui_config: {
      title: 'Kostenpositionen je Verfahrensstufe (§8.2)', subtitle: 'je Stufe der eigene Kostenkennwert in €/m³ Schmutzwasser; die gedruckten groben Richtwerte (Preisstand 2020) erscheinen als Hinweis, nie als Vorgabe (SR-2)', add_label: '+ Position', placement: 'section',
      columns: [
        { key: 'stufe', label: 'Stufe (§8.2)', type: 'lookup_key', required: true, lookup: { table_code: 'S8_2_KOSTEN' }, discriminator: true },
        { key: 'richtwert_min', label: 'Richtwert min (€/m³ SW, 2020)', type: 'lookup_value', lookup: { table_code: 'S8_2_KOSTEN', key_column: 'stufe', value: 'kosten_min_eur_m3' } },
        { key: 'richtwert_max', label: 'Richtwert max (€/m³ SW, 2020)', type: 'lookup_value', lookup: { table_code: 'S8_2_KOSTEN', key_column: 'stufe', value: 'kosten_max_eur_m3' } },
        { key: 'kostenkennwert', label: 'Kostenkennwert', type: 'number', required: true, min: 0, unit: '€/m³ SW', aria_label: 'eigener Kostenkennwert der Stufe' },
        { key: 'baupreisindex_jahr', label: 'Baupreisindex-Bezugsjahr', type: 'number', min: 1900, aria_label: 'Bezugsjahr des Baupreisindex' },
        { key: 'im_richtwertbereich', label: 'im Richtwertbereich', type: 'derived', expr: 'if(kostenkennwert >= richtwert_min AND kostenkennwert <= richtwert_max, 1, 0)', display: 'badge', value_labels: { '1': 'im gedruckten Bereich', '0': 'außerhalb des gedruckten Bereichs (Hinweis)' } },
      ],
      footer: ['kosten_summe_calc'],
      note: Q.L1450,
    },
    verification_quote: Q.L1450,
    create: { section_code: 'M12002-15-B', label_de: 'Kostenpositionen je Verfahrensstufe (Kostenkennwert, Baupreisindex-Bezugsjahr; §8.2-Richtwerte als Hinweis)', data_type: 'json', unit: null, clause_reference: '§8.2',
      description: 'Plan 3: Zeilen je Stufe (S8_2_KOSTEN-Zeile mit min / max als Hinweis, eigener Kostenkennwert, Bezugsjahr); Σ → kosten_summe_calc (M12002-15-D1); ersetzt das Skalar kostenkennwert_aufbereitung (m1200_2-D-9); REQ-14 bleibt.' },
  }),
  WS15({ symbol: 'kosten_summe_calc', widget: 'derived', ui_config: null, verification_quote: Q.L1450,
    create: { section_code: 'M12002-15-D', label_de: 'Σ Kostenkennwerte über die Verfahrensstufen', data_type: 'number', unit: '€/m³ SW', clause_reference: '§8.2',
      description: 'Plan 3: Ausgabe der Gleichung M12002-15-D1 (sum_rows über kostenpositionen.kostenkennwert — Text-Ableitung: §8.2 druckt Kosten je Stufe, keine Summenformel, m1200_2-F-1); Übernahme als kostenkennwert_aufbereitung STAGED (m1200_2-D-9).' } }),
];

/** No section rules: every candidate section of -04 / -05 holds a consumed producer (leistungsziel_log10; the Gl.-1 inputs c_zulauf / c_ablauf) or a gate-read symbol (REQ-05's validierungsmonitoring_typ / probenanzahl_zulauf) — m1200_2-C-2. */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };

/** Cues read for the withheld / staged items (kept as named references so the sign-off blocks and this module cite the same lines). */
export const STAGED_CUES = { L534: Q.L534, L616: Q.L616, L668: Q.L668, L672: Q.L672, L684: Q.L684, L894: Q.L894, L935: Q.L935, L1050: Q.L1050, L1135: Q.L1135, L1283: Q.L1283, L1805: frag(Q.L1805, 'die analytische Berechnung'), L1806: frag(Q.L1806, 'das Monte-Carlo-Verfahren') };
