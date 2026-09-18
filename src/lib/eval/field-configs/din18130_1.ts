/**
 * DIN-18130-1 — Plan 3 Task 10 field configs (readings / runs registers, Tab. 3/4/5
 * and §5.8 fills, selections, visibility) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts din18130_1`.
 *
 * Every `verification_quote` is lifted verbatim (whitespace-normalised) from the
 * transcript `Desktop\Guidelines\DWA DIN Scribd\DIN-18130-1\DIN-18130-1.md`; the
 * line is in the constant's name. Prod facts come from the captured
 * `din18130_1.prior.json` (2026-09-18, read-only): section codes are single letters
 * per worksheet (-01: B Eingangsparameter · C Definitionen & Versuchsklasse ·
 * K Temperatur & Probenabmessungen; -02: C Erzeugung des hydraulischen Gefälles ·
 * D Sättigung & Umläufigkeit · E Auswahl & Geräte der Versuchsanordnung; -03:
 * B Probengeometrie · C Messreihe je Ablesung · K Temperatur & Probenkennwerte;
 * -04: F Basisgrößen · G k konstant · H k veränderlich (no fields) · I Temperatur-
 * korrektur k10; -05: J Output/Transfer · K Versuchsbericht).
 *
 * Placement rule applied (a262e trap 1): a `lookup_fill` sits on the worksheet of
 * its KEY symbols, because a created field never carries `consumer_worksheets` —
 * hence `bodenart_tab5` and the four Tab. 5 fills live on DIN-18130-1-02 next to
 * `versuchsanordnung` (the brief placed the select on -01), and the Tab. 4 class
 * fill is a created twin `versuchsklasse_tab4` on -02 next to the two booleans
 * (the existing -01 `versuchsklasse` keeps its input; re-point STAGED
 * din18130_1-E-1).
 *
 * What is deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/din18130_1-STAGED-plan3-rulings.sql):
 *   - visible_when on ANY existing -03 measurement scalar (h_o/h_u/p_o/p_u/V_w/
 *     h_1/h_2/t/a/l/l_0/A) — every one is consumed by -04 → din18130_1-C-2;
 *   - section rules on -04 G ("k bei konstantem Gefälle", holds the consumed `k`)
 *     and -04 H (no fields — an inert rule) → din18130_1-C-2;
 *   - hiding `u_0` / `statische_belastung` / `h_0` / `gamma_org` — consumed, or
 *     feeding Gl. 7 whose `h` is consumed (transitive guard) → C-2 / G-8;
 *   - the Gl. 8 / Gl. 9 switch on `gefaelle_typ` (three prod equations write `k`)
 *     → din18130_1-R-1; Gl. 6 reading `k_T_mean` and dropping the redundant
 *     `alpha` input → R-2 / D-1; `k_f = k_10` → R-3 / X-1;
 *   - the manual `durchlaessigkeitsbereich` enum reversed onto `bereich_code` → D-2.
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { TAB5_BODENARTEN } from '../regulation-tables-seed-din18130_1';

const STD = 'DIN-18130-1';

// ---- lifted cue sentences (transcript line in the name) ----
const L222 = 'Bezeichnung des Laborversuchs zur Bestimmung des Durchlässigkeitsbeiwerts an feinkörnigem Boden im Kompressions-Durchlässigkeitsgerät (KD) mit Messung des hydraulischen Gefälles in einem Standrohr (ES) und des Wasservolumens im Standrohr (ST) sowie mit statischer Belastung (SB) des Probekörpers, Versuchsklasse 3:';
const L246 = 'Ist der Einfluß der Dichte auf die Durchlässigkeit zu prüfen, dann sind mindestens drei Durchströmungsversuche mit jeweils unterschiedlichen Porenzahlen des Probekörpers auszuführen (siehe 8.3).';
const L305 = String.raw`k_{10}=\frac{1,359}{1+0,0337 \cdot T+0,00022 \cdot T^{2}} k_{\mathrm{T}}=\alpha \cdot k_{\mathrm{T}} \tag{6}`;
const L310 = String.raw`$T$ die Wassertemperatur beim Versuch, in ${'$'}{ }^{\circ} \mathrm{C}$;`;
const L335 = String.raw`Das Verhältnis Größtkorn zu Probendurchmesser bzw. Probenhöhe sollte $1: 5$ bei ungleichförmigen und $1: 10$ bei gleichförmigen Böden nicht unterschreiten.`;
const L336 = String.raw`Bei bindigen Böden sollte die Querschnittsfläche mindestens $A=10 \mathrm{~cm}^{2}$ betragen, bei grobkörnigen Böden mindestens A $=20 \mathrm{~cm}^{2}$, sofern die Versuchsgeräte nach Abschnitt 7 keine größeren Abmessungen bedingen.`;
const L417 = 'Feinkörnige und gemischtkörnige Böden sowie Sande werden durch Aufbringen eines Sättigungsdrucks gesättigt. Dazu wird das Porenwasser in dem Probekörper mit einem hydrostatischen Druck (Sättigungsdruck, back pressure) belastet (siehe Tabelle 3). Dies ist nur mit den Versuchsanordnungen nach Bild 8 und Bild 9 möglich.';
const L421 = String.raw`\caption{Tabelle 3: Sättigungsdruck $u_{0}$ in Abhängigkeit von der Sättigungszahl $S_{\mathrm{r}}$}`;
const L446 = 'Es bestehen verschiedene Möglichkeiten der Versuchsanordnung (siehe Tabelle 5). Die Versuchsanordnung ist entsprechend den jeweiligen Erfordernissen des Anwendungsfalls zusammenzustellen. Bei Auswahl der Versuchsanordnung ist zu beachten, ob der Durchlässigkeitsbeiwert bei voller Wassersättigung und stationärer Strömung benötigt wird, ob eine Bestimmung bei nicht voller Wassersättigung mit stationärer Strömung ausreicht oder ob nur eine überschlägliche Ermittlung ohne Kontrolle der stationären Strömung genügt.';
const L447 = 'Entsprechend diesen Bedingungen werden die Versuche in drei Versuchsklassen eingeteilt (siehe Tabelle 4).';
const L456 = 'Der Versuch eignet sich für feinkörnige Böden, insbesondere für Tone und Schluffe. Die Probe sollte einen Durchmesser von mindestens 70 mm und eine Höhe von mindestens 20 mm haben.';
const L479 = String.raw`\hline Versuchsklasse & Wassersättigung nachgewiesen und kontrolliert nach DIN 18137-2 & Strömung stationär nachgewiesen \\`;
const L484 = String.raw`\hline \multicolumn{3}{|c|}{*) Die stationäre Strömung wird nicht nachgewiesen. Aufgrund der Versuchsbedingungen, insbesondere aufgrund der vorausgegangenen Phase der Wassersättigung kann aber angenommen werden, daß die Strömung stationär ist.} \\`;
const L505 = 'ANMERKUNG: Bei Nachweis stationärer Strömung darf der Versuch der Versuchsklasse 2 zugeordnet werden.';
const L526 = 'Bei jeder Ablesung wird in der Regel auch die Temperatur gemessen. Der Durchlässigkeitsversuch darf beendet werden, wenn sich aus den Messungen ein annähernd gleichbleibender $k$-Wert ergibt.';
const L530 = String.raw`\caption{Tabelle 5: Geeignete Versuchsanordnungen in Abhängigkeit von den Bodenarten}`;
const L532 = String.raw`\hline \multirow{2}{*}{Bodenart} & \multirow{2}{*}{Erreichbare Versuchsklasse} & \multicolumn{3}{|c|}{Bauteil zur Aufnahme des Probekörpers} & \multicolumn{3}{|c|}{Messung des hydraulischen Gefälles} & \multicolumn{3}{|c|}{Messung des Wasservolumens}`;
const L533 = 'Statische Belastung \\\\ SB'; // L533–L534 (two lines of the header cell)
const L536 = 'Sätti-gungsdruck \\\\ U0'; // L536–L537
const L539 = String.raw`\hline & & Versuchszylinder & Kompres-sions-Durch-lässig-keitsgerät KD & Triaxialzelle & mehrere Standrohre & ein Standrohr & Druckerzeuger & Meßzylinder & Standrohr oder Bürette & Kapillare & & \\`;
const L553 = 'Dabei ist: X geeignet \\\\ (X) bedingt geeignet \\\\ - nicht geeignet'; // L553–L555
const L642 = 'Diese Filtersteine müssen ausreichend durchlässig sein, d. h. ihr Durchlässigkeitsbeiwert muß mindestens um eine Zehnerpotenz über desjenigen des Probekörpers liegen.';
const L668 = String.raw`3 Filterstein mit $k_{\text {Filter }} \geq 10 \cdot k_{\text {Probe }}$`;
const L787 = String.raw`k=\frac{Q \cdot l}{A \cdot h} \tag{8}`;
const L797 = String.raw`1) Versuchsanordnung nach Bild 6: h die Differenz der Standrohrspiegelhöhen; $l$ der Abstand der Ansatzpunkte der beiden Standrohre. 2) Anordnung nach Bild 8 und Bild 9: $h=\left(p / \gamma_{\mathrm{w}}-\Delta h\right)$, wobei $p$ Wasserdruck im Druckzylinder, (siehe Bild 8); $l$ die Höhe des Probekörpers $l_{0}$; $h=\left(p_{2}-p_{1}\right) / \gamma_{\mathrm{w}}$, (siehe Bild 9). 3) Anordnung nach Bild 3A: $h=h_{\mathrm{o}}\left(\gamma_{\mathrm{w}}-\gamma_{\text {org }}\right) / \gamma_{\mathrm{w}}$, (siehe Gleichung (7)); $l$ die Höhe des Probekörpers $l_{0}$.`; // L797–L806
const L813 = String.raw`k=\frac{a \cdot l_{0}}{A \cdot t} \ln \frac{h_{1}}{h_{2}} \tag{9}`;
const L831 = String.raw`Als Versuchsergebnis sind der Durchlässigkeitsbeiwert $k$, umgerechnet auf die Temperatur von $10^{\circ} \mathrm{C}$ und das hydraulische Gefälle $i$ anzugeben. Bei Versuchen mit veränderlichem hydraulischen Gefälle ist dessen Bereich (größtes und kleinstes hydraulisches Gefälle) anzugeben. Ferner sind mit dem Versuchsergebnis mitzuteilen:`; // L831–L832
const L833 = 'Ferner sind mit dem Versuchsergebnis mitzuteilen: 1) Angaben zum Versuch - Bezeichnung nach Abschnitt 4 - Versuchsdauer $t$ - Sättigungsdruck $u_{0}$ - Raumtemperatur $T$ - Durchströmungsrichtung 2) Angaben zur Probe - Bodenart nach DIN 4022-1 - Bodengruppe nach DIN 18196 - Größtkorn max. d'; // L832–L842
const L918 = String.raw`Grenzfälle: $\quad \max . i=33$; min. $i=25$ bzw. 27`;
const L1133 = String.raw`\hline \multicolumn{5}{|l|}{Durchlässigkeitsbeiwert $k_{10}=3,77 \times 10^{-9} \mathrm{~m} / \mathrm{s}$} \\`;
const L1326 = String.raw`& h=h_{\mathrm{o}}-h_{\mathrm{u}}+\left(p_{\mathrm{o}}-p_{\mathrm{u}}\right) / \gamma_{\mathrm{w}}`;
const L1334 = String.raw`& \qquad k_{\mathrm{T}}=\frac{V_{\mathrm{w}} \cdot l}{A \cdot h \cdot t} \\`;
const L1335 = String.raw`& \alpha \text { für } T=0,5 \times(19,0+22,0) \\`;
const L1357 = String.raw`\hline \multicolumn{6}{|l|}{Durchlässigkeitsbeiwert $k_{10}=3,48 \times 10^{-10} \mathrm{~m} / \mathrm{s}$} \\`;

/** §8.4 (L834–L848): the 14 printed report items, labels lifted (LaTeX symbols rendered), grouped as printed. */
export const PFLICHTANGABEN_VERSUCH = [
  { value: 'bezeichnung', label_de: 'Bezeichnung nach Abschnitt 4' },                                                        // L834
  { value: 'versuchsdauer', label_de: 'Versuchsdauer t' },                                                                    // L835
  { value: 'saettigungsdruck', label_de: 'Sättigungsdruck u_0' },                                                             // L836
  { value: 'raumtemperatur', label_de: 'Raumtemperatur T' },                                                                  // L837
  { value: 'durchstroemungsrichtung', label_de: 'Durchströmungsrichtung' },                                                   // L838
] as const;
export const PFLICHTANGABEN_PROBE = [
  { value: 'bodenart', label_de: 'Bodenart nach DIN 4022-1' },                                                                // L840
  { value: 'bodengruppe', label_de: 'Bodengruppe nach DIN 18196' },                                                           // L841
  { value: 'groesstkorn', label_de: 'Größtkorn max. d' },                                                                     // L842
  { value: 'trockendichte', label_de: 'Trockendichte ϱ_d' },                                                                  // L843
  { value: 'porenzahl', label_de: 'Porenzahl bzw. Porenanteil e bzw. n' },                                                    // L844
  { value: 'wassergehalt', label_de: 'Wassergehalt vor und nach dem Versuch w_a und w_e' },                                   // L845
  { value: 'saettigungszahl', label_de: 'Sättigungszahl vor und nach dem Versuch (falls kein Sättigungsdruck aufgebracht) S_ra und S_re' }, // L846
  { value: 'probenart', label_de: 'Art der Probe (Sonderprobe, aufbereitet usw.)' },                                          // L847
  { value: 'masse', label_de: 'Maße des Probekörpers' },                                                                      // L848
] as const;
export const PFLICHTANGABEN = [...PFLICHTANGABEN_VERSUCH, ...PFLICHTANGABEN_PROBE] as const;

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS01 = on('DIN-18130-1-01');
const WS02 = on('DIN-18130-1-02');
const WS03 = on('DIN-18130-1-03');
const WS04 = on('DIN-18130-1-04');
const WS05 = on('DIN-18130-1-05');

export const KONSTANT = "gefaelle_typ == 'konstant'";
export const VERAENDERLICH = "gefaelle_typ == 'veraenderlich'";
/** Gl. 6 closed form (L305) in row scope over the reading's own temperature column. */
export const ALPHA_ROW_EXPR = '1.359 / (1 + 0.0337 * t_c + 0.00022 * t_c^2)';
/** Tab. 11 (L1326): h = h_o − h_u + (p_o − p_u)/γ_w — Bild 6 reduces to it with p_o = p_u = 0, Bild 9 with h_o = h_u = 0 (din18130_1-J-2). */
export const H_ROW_EXPR = 'h_o - h_u + (p_o - p_u) / gamma_w';
/** Gl. 8 with Q = V_w/t (L787, printed as k = V_w·l/(A·h·t) in Tab. 9/10/11) vs Gl. 9 (L813), switched on the inherited gefaelle_typ. */
export const K_ROW_EXPR = `if(${KONSTANT}, v_w * l / (A * h_row * t_s), a * l_0 / (A * t_s) * ln(h_1 / h_2))`;
/** Gl. 3 per reading: konstant h/l; veränderlich h_1/l_0 at the start of the reading (the §9.1 "Grenzfälle" max. i, L918). */
export const I_ROW_EXPR = `if(${KONSTANT}, h_row / l, h_1 / l_0)`;

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- DIN-18130-1-01: §5.8 sample dimensions ----
  WS01({
    symbol: 'bindig_grobkoernig', widget: 'select_one', ui_config: null,
    enum_values: [
      { value: 'bindig', label_de: 'bindigen Böden', order_index: 0 },           // L336
      { value: 'grobkoernig', label_de: 'grobkörnigen Böden', order_index: 1 },  // L336
    ],
    verification_quote: L336,
    create: { section_code: 'K', label_de: 'Bodenklasse für die Mindest-Querschnittsfläche (§5.8: bindig / grobkörnig)', data_type: 'enum', unit: null, clause_reference: '§5.8',
      description: 'Plan 3: Treiber der §5.8-Mindestfläche — bindige Böden A ≥ 10 cm², grobkörnige Böden A ≥ 20 cm² (füllt a_min_tab; Umstellung des Eingabefelds A_min STAGED, din18130_1-E-3); Gate A ≥ A_min STAGED (din18130_1-G-1).' },
  }),
  // Fix round 1: the existing A_min (gate-bearing: CR-01 'max_d IS NOT NULL AND A_min IS NOT NULL', block) keeps its input;
  // the §5.8 value is a created twin beside the class select — the re-bind is STAGED (din18130_1-E-3).
  WS01({
    symbol: 'a_min_tab', widget: 'lookup_fill', ui_config: { source_label: '§5.8' },
    lookup: { table_code: 'S5_8', role: 'limit', keys: [{ column: 'bodenklasse', from_symbol: 'bindig_grobkoernig' }], value: 'a_min_cm2' },
    verification_quote: L336,
    create: { section_code: 'K', label_de: 'Mindest-Querschnittsfläche nach §5.8 (bindig 10 cm² / grobkörnig 20 cm²)', data_type: 'number', unit: 'cm²', clause_reference: '§5.8',
      description: 'Plan 3: aus der Bodenklasse (bindig / grobkörnig) gefüllt; das Eingabefeld A_min (CR-01) bleibt — Umstellung STAGED (din18130_1-E-3), Gate A ≥ A_min STAGED (din18130_1-G-1).' },
  }),
  WS01({
    symbol: 'groesstkorn_verhaeltnis', widget: 'lookup_fill', ui_config: { source_label: '§5.8' },
    lookup: { table_code: 'S5_8_KORN', role: 'value', keys: [{ column: 'ungleichfoermig', from_symbol: 'ungleichfoermig' }], value: 'verhaeltnis' },
    verification_quote: L335,
    create: { section_code: 'K', label_de: 'Mindestverhältnis Größtkorn : Probendurchmesser bzw. Probenhöhe (§5.8)', data_type: 'text', unit: null, clause_reference: '§5.8',
      description: 'Plan 3: 1 : 5 bei ungleichförmigen, 1 : 10 bei gleichförmigen Böden — aus dem Feld „Boden ungleichförmig“ gefüllt; die Prüfung gegen max_d und die Probenmaße ist STAGED (din18130_1-G-1).' },
  }),

  // ---- DIN-18130-1-02: Tab. 5 (soil type × arrangement), Tab. 4 (class), Tab. 3 (u_0), KD/TX-specific inputs ----
  WS02({
    symbol: 'bodenart_tab5', widget: 'select_one', ui_config: null,
    enum_values: TAB5_BODENARTEN.map((b, i) => ({ value: b.value, label_de: b.label_de, order_index: i })), // L540–L550 row heads
    verification_quote: `${L530} — ${L446}`,
    create: { section_code: 'E', label_de: 'Bodenart nach Tabelle 5 (Zeile)', data_type: 'enum', unit: null, clause_reference: '§6.7, Tab. 5',
      description: 'Plan 3: Treiber der Tab.-5-Zeile (mit der Versuchsanordnung KD/ZY/TX) → erreichbare Versuchsklasse, Eignung, SB und U0 gefüllt; die Bodenart nach DIN 4022-1 (DIN-18130-1-01) bleibt Freitext. Ton/Schluff mit KD oder TX und Sand-Ton-Gemisch mit TX haben bis zur PDF-Prüfung keine Zeile (din18130_1-U-1).' },
  }),
  WS02({
    symbol: 'tab5_erreichbare_klasse', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 5' },
    lookup: { table_code: 'TAB5', role: 'value', keys: [{ column: 'bodenart', from_symbol: 'bodenart_tab5' }, { column: 'anordnung', from_symbol: 'versuchsanordnung' }], value: 'erreichbare_klasse' },
    verification_quote: `${L532} — ${L505}`,
    create: { section_code: 'E', label_de: 'Erreichbare Versuchsklasse nach Tabelle 5', data_type: 'text', unit: null, clause_reference: '§6.7, Tab. 5',
      description: 'Plan 3: die in Tab. 5 für Bodenart × Bauteil gedruckte erreichbare Versuchsklasse („2 (1)“ bei Feinsand/Triaxialzelle wie gedruckt); Bild 5/6/10: bei Nachweis stationärer Strömung Klasse 2. Kein Gate — Abgleich mit der gewählten Versuchsklasse ist STAGED (din18130_1-G-10).' },
  }),
  WS02({
    symbol: 'tab5_geeignet', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 5' },
    lookup: { table_code: 'TAB5', role: 'value', keys: [{ column: 'bodenart', from_symbol: 'bodenart_tab5' }, { column: 'anordnung', from_symbol: 'versuchsanordnung' }], value: 'geeignet' },
    verification_quote: `${L539} — ${L553}`,
    create: { section_code: 'E', label_de: 'Eignung des Bauteils (Versuchszylinder / KD / Triaxialzelle) für die Bodenart nach Tabelle 5', data_type: 'text', unit: null, clause_reference: '§6.7, Tab. 5',
      description: 'Plan 3: X geeignet · (X) bedingt geeignet · - nicht geeignet, aus der Tab.-5-Zeile der gewählten Bodenart und Versuchsanordnung.' },
  }),
  WS02({
    symbol: 'tab5_sb', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 5' },
    lookup: { table_code: 'TAB5', role: 'value', keys: [{ column: 'bodenart', from_symbol: 'bodenart_tab5' }, { column: 'anordnung', from_symbol: 'versuchsanordnung' }], value: 'sb' },
    verification_quote: `${L533} — ${L553}`,
    create: { section_code: 'E', label_de: 'Statische Belastung SB nach Tabelle 5 (geeignet / bedingt geeignet / nicht geeignet)', data_type: 'text', unit: null, clause_reference: '§6.6, Tab. 5',
      description: 'Plan 3: die SB-Spalte der Tab.-5-Zeile; das Feld „Statische Belastung“ bleibt die Angabe des Versuchs (Pflicht bei Sättigungsdruck oder Durchströmung von unten nach oben ist STAGED, din18130_1-G-8).' },
  }),
  WS02({
    symbol: 'tab5_u0', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 5' },
    lookup: { table_code: 'TAB5', role: 'value', keys: [{ column: 'bodenart', from_symbol: 'bodenart_tab5' }, { column: 'anordnung', from_symbol: 'versuchsanordnung' }], value: 'u0' },
    verification_quote: `${L536} — ${L553}`,
    create: { section_code: 'E', label_de: 'Sättigungsdruck U0 nach Tabelle 5 (geeignet / bedingt geeignet / nicht geeignet)', data_type: 'text', unit: null, clause_reference: '§6.5, Tab. 5',
      description: 'Plan 3: die U0-Spalte der Tab.-5-Zeile — ob die Anordnung einen Sättigungsdruck zulässt (nur Bild 8 / Bild 9, §6.5).' },
  }),
  WS02({
    symbol: 'messung_gefaelle', widget: 'select_one', ui_config: null,
    enum_values: [
      { value: 'ms', label_de: 'mehrere Standrohre', order_index: 0 },  // L539 (§4 code MS, L593)
      { value: 'es', label_de: 'ein Standrohr', order_index: 1 },       // L539 (§4 code ES, L222)
      { value: 'de', label_de: 'Druckerzeuger', order_index: 2 },       // L539 (§4 code DE, L688)
    ],
    verification_quote: `${L539} — ${L222}`,
    create: { section_code: 'C', label_de: 'Messung des hydraulischen Gefälles (Tab. 5: mehrere Standrohre / ein Standrohr / Druckerzeuger)', data_type: 'enum', unit: null, clause_reference: '§6.1, §6.2, Tab. 5',
      description: 'Plan 3: das Tab.-5-Spaltentripel und das zweite Glied der §4-Bezeichnung (MS / ES / DE); die Bezeichnung selbst bleibt Freitext (din18130_1-F-2).' },
  }),
  WS02({
    symbol: 'stroemung_stationaer', widget: 'attestation', ui_config: null,
    verification_quote: `${L479} — ${L484}`,
    create: { section_code: 'D', label_de: 'Strömung stationär nachgewiesen (Tab. 4)', data_type: 'boolean', unit: null, clause_reference: '§3.8, §6.3, Tab. 4',
      description: 'Plan 3: zweite Achse der Tab. 4 (mit „Sättigungsdruck aufgebracht“ → versuchsklasse_tab4). Nein bei nachgewiesener Sättigung = Klasse 1b: „*) Die stationäre Strömung wird nicht nachgewiesen. Aufgrund der Versuchsbedingungen, insbesondere aufgrund der vorausgegangenen Phase der Wassersättigung kann aber angenommen werden, daß die Strömung stationär ist.“ Nachweis nach §6.3 (ein- = ausströmende Wassermenge); Umstellung von CR-04 STAGED (din18130_1-G-2).' },
  }),
  WS02({
    symbol: 'versuchsklasse_tab4', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 4' },
    lookup: { table_code: 'TAB4', role: 'value', keys: [{ column: 'saettigung', from_symbol: 'saettigung_aufgebracht' }, { column: 'stationaer', from_symbol: 'stroemung_stationaer' }], value: 'versuchsklasse' },
    verification_quote: `${L447} — ${L479}`,
    create: { section_code: 'D', label_de: 'Versuchsklasse nach Tabelle 4 (aus Sättigung × stationärer Strömung)', data_type: 'text', unit: null, clause_reference: '§3.8, §6.7, Tab. 4',
      description: 'Plan 3: 1a / 1b / 2 / 3 aus den beiden Ja/Nein-Angaben (beide setzen, auch „Nein“); Abgleich mit der auf DIN-18130-1-01 gewählten Versuchsklasse und Umstellung STAGED (din18130_1-E-1 / G-10).' },
  }),
  WS02({
    symbol: 's_r_band', widget: 'select_one', ui_config: null,
    enum_values: [
      { value: 'ge095', label_de: 'S_r ≥ 0,95', order_index: 0 },  // L427
      { value: 'e090', label_de: 'S_r = 0,90', order_index: 1 },   // L428
      { value: 'e085', label_de: 'S_r = 0,85', order_index: 2 },   // L429
    ],
    visible_when: 'saettigung_aufgebracht == true', // L417: the Sättigungsdruck (Tab. 3) exists only when saturation is applied
    verification_quote: `${L417} — ${L421}`,
    create: { section_code: 'D', label_de: 'Sättigungszahl-Zeile der Tabelle 3 (≥ 0,95 / 0,90 / 0,85)', data_type: 'enum', unit: null, clause_reference: '§6.5, Tab. 3',
      description: 'Plan 3: SR-2-Auswahl der Tab.-3-Zeile (Zwischenwerte sind in Tab. 3 nicht definiert; Beispiel 9.3 interpoliert linear: S_ra = 0,88 → u_o = 720 kN/m²) — füllt u_0_tab3 (Umstellung des Eingabefelds u_0 STAGED, din18130_1-E-2); die Sättigungszahl S_r (DIN-18130-1-01) leitet die Wahl, ein Abgleich ist STAGED (din18130_1-G-11).' },
  }),
  // Fix round 1: the existing u_0 (consumed by -05; §9.1 L919 "Sättigungsdruck: 0" / §9.2 L1045 "u_o = 0" record the
  // no-saturation case) keeps its input; the Tab.-3 value is a created twin beside the band select (role limit — the
  // pressure Tab. 3 REQUIRES for the band) — the re-bind is STAGED (din18130_1-E-2).
  WS02({
    symbol: 'u_0_tab3', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 3' },
    lookup: { table_code: 'TAB3', role: 'limit', keys: [{ column: 's_r_band', from_symbol: 's_r_band' }], value: 'u_0_kn_m2' },
    visible_when: 'saettigung_aufgebracht == true', // L417 — as its band select
    verification_quote: `${L417} — ${L421}`,
    create: { section_code: 'D', label_de: 'Sättigungsdruck u_0 nach Tabelle 3 (zur gewählten Sättigungszahl-Zeile)', data_type: 'number', unit: 'kN/m²', clause_reference: '§6.5, Tab. 3',
      description: 'Plan 3: 300 / 600 / 900 kN/m² aus der Tab.-3-Zeile (locked); das Eingabefeld u_0 (aufgebrachter Druck, Berichtsangabe) bleibt — Umstellung STAGED (din18130_1-E-2); Zwischenwerte wie im Beispiel 9.3 (720 kN/m²) sind Sache des Eigentümers (din18130_1-O-1).' },
  }),
  WS02({
    symbol: 'filterstein_k', widget: 'scalar', ui_config: null, visible_when: "versuchsanordnung == 'TX'", // L642 / L668 (Triaxialzelle)
    verification_quote: `${L642} — ${L668}`,
    create: { section_code: 'E', label_de: 'Durchlässigkeitsbeiwert der Filtersteine k_Filter (Triaxialzelle: ≥ 10 · k_Probe)', data_type: 'number', unit: 'm/s', clause_reference: '§7.3.2.2, Bild 8',
      description: 'Plan 3: Eingabe für die Triaxialzelle; die Prüfung k_Filter ≥ 10 · k ist STAGED (din18130_1-G-6).' },
  }),
  WS02({
    symbol: 'probe_durchmesser_mm', widget: 'scalar', ui_config: null, visible_when: "versuchsanordnung == 'KD'", // L456 (Kompressions-Durchlässigkeitsgerät)
    verification_quote: L456,
    create: { section_code: 'E', label_de: 'Probendurchmesser (KD: mindestens 70 mm)', data_type: 'number', unit: 'mm', clause_reference: '§7.1.1',
      description: 'Plan 3: Eingabe für das Kompressions-Durchlässigkeitsgerät; die Prüfung d ≥ 70 mm und l_0 ≥ 20 mm (Höhe = l_0 auf DIN-18130-1-03) ist STAGED (din18130_1-G-7).' },
  }),

  // ---- DIN-18130-1-03: readings register + derived k_T / α / k_10 / i range ----
  WS03({
    symbol: 'ablesungen', widget: 'register',
    ui_config: {
      title: 'Ablesungen', subtitle: '§8.1 / §8.2 — je Messintervall eine Zeile; Versuchsende bei annähernd gleichbleibendem k (§7.1.4.4)', add_label: '+ Ablesung', placement: 'section',
      columns: [
        { key: 'nr', label: 'Nr.', type: 'number', required: true, min: 1 },
        { key: 't_s', label: 't', type: 'number', unit: 's', required: true, min: 0, aria_label: 'Meßzeitspanne t' },
        // konstantes Gefälle (Gl. 8; Tab. 8 / Tab. 11 columns h_o, h_u, p_o, p_u, V_w)
        { key: 'h_o', label: 'h_o', type: 'number', unit: 'm', required: true, visible_when: KONSTANT, aria_label: 'Standrohrspiegelhöhe Oberstrom h_o' },
        { key: 'h_u', label: 'h_u', type: 'number', unit: 'm', required: true, visible_when: KONSTANT, aria_label: 'Standrohrspiegelhöhe Unterstrom h_u' },
        { key: 'p_o', label: 'p_o', type: 'number', unit: 'kN/m²', required: true, visible_when: KONSTANT, placeholder: '0 wenn drucklos', aria_label: 'Oberwasserdruck p_o' },
        { key: 'p_u', label: 'p_u', type: 'number', unit: 'kN/m²', required: true, visible_when: KONSTANT, placeholder: '0 wenn drucklos', aria_label: 'Unterwasserdruck p_u' },
        { key: 'v_w', label: 'V_w', type: 'number', unit: 'm³', required: true, min: 0, visible_when: KONSTANT, aria_label: 'Wasservolumen V_w' },
        // veränderliches Gefälle (Gl. 9; Tab. 7 columns h_1 / h_2)
        { key: 'h_1', label: 'h_1', type: 'number', unit: 'm', required: true, min: 0, visible_when: VERAENDERLICH, aria_label: 'Wasserhöhe im Standrohr bei Versuchsbeginn h_1' },
        { key: 'h_2', label: 'h_2', type: 'number', unit: 'm', required: true, min: 0, visible_when: VERAENDERLICH, aria_label: 'Wasserhöhe im Standrohr bei Versuchsende h_2' },
        { key: 't_c', label: 'T', type: 'number', unit: '°C', required: true, aria_label: 'Wassertemperatur T' },
        { key: 'h_row', label: 'h', type: 'derived', expr: H_ROW_EXPR },
        { key: 'i_row', label: 'i (konstant: h/l · veränderlich: Beginn h_1/l_0)', type: 'derived', expr: I_ROW_EXPR },
        { key: 'k_row', label: 'k (Ablesung)', type: 'derived', expr: K_ROW_EXPR },
        // L850 "Der k-Wert solle als ein Vielfaches eines Exponentialfaktors zur Basis 10 angegeben werden." — mantissa · 10^exponent
        // (the register's cell formatter prints |k| < 5·10⁻⁵ as "0"; din18130_1-I-2 — the raw k_row / k10_row stay the engine inputs)
        { key: 'k_exp', label: 'k: Exponent (Basis 10)', type: 'derived', expr: 'floor(log10(k_row))' },
        { key: 'k_mant', label: 'k: Mantisse', type: 'derived', expr: 'k_row / 10^floor(log10(k_row))' },
        { key: 'alpha_row', label: 'α', type: 'derived', expr: ALPHA_ROW_EXPR },
        { key: 'k10_row', label: 'k_10 (Ablesung)', type: 'derived', expr: 'k_row * alpha_row' },
        { key: 'k10_exp', label: 'k_10: Exponent (Basis 10)', type: 'derived', expr: 'floor(log10(k10_row))' },
        { key: 'k10_mant', label: 'k_10: Mantisse', type: 'derived', expr: 'k10_row / 10^floor(log10(k10_row))' },
      ],
      footer: ['k_T_mean', 'k_10_calc', 'i_max_calc', 'i_min_calc'],
      note: `${L526} γ_w, l, l_0, A und a sind die Felder dieses Arbeitsblatts (Zeilenwerte lesen sie mit); drucklose Anordnungen (Bild 6): p_o = p_u = 0 eintragen; bei den Anordnungen nach Bild 8 und Bild 9 ist l die Höhe des Probekörpers l_0 (§8.1, L802) — l = l_0 eintragen. Alle vollständigen Zeilen gehen in die Mittelwerte ein (din18130_1-J-1).`,
    },
    verification_quote: `${L526} — ${L787} — ${L797} — ${L813} — ${L1326}`, // L526 (Ablesung/Versuchsende), Gl. 8 (L787), the §8.1 h/l variants (L797–L806), Gl. 9 (L813), Tab. 11 h (L1326)
    create: { section_code: 'C', label_de: 'Ablesungen (je Messintervall: t, h_o/h_u/p_o/p_u/V_w bzw. h_1/h_2, T)', data_type: 'json', unit: null, clause_reference: '§7.1.4.4, §8.1, §8.2, Tab. 7, Tab. 8, Tab. 11',
      description: 'Plan 3: Zeilen je Ablesung mit k je Zeile (Gl. 8 mit Q = V_w/t bei konstantem, Gl. 9 bei veränderlichem Gefälle — Umschaltung über gefaelle_typ), h nach Tab. 11, α je Zeile (Gl. 6), k_10 je Zeile; Mittelwerte → k_T_mean (DIN-18130-1-03-D1), k_10_calc (-D3), i-Bereich → i_max_calc / i_min_calc (-D4 / -D5). Ablösung der Einzelskalare und Umstellung von Gl. 6/8/9 STAGED (din18130_1-R-1 / R-2 / D-3).' },
  }),
  WS03({
    symbol: 'k_T_mean', widget: 'derived', ui_config: null, verification_quote: `${L526} — ${L1334}`,
    create: { section_code: 'C', label_de: 'k_T (Mittel der Ablesungen, bei Versuchstemperatur)', data_type: 'number', unit: 'm/s', clause_reference: '§7.1.4.4, §8.1, §8.2',
      description: 'Plan 3: Ausgabe der Gleichung DIN-18130-1-03-D1 (mean_rows über ablesungen.k_row); Umstellung von Gl. 6 auf diesen Wert STAGED (din18130_1-R-2).' },
  }),
  WS03({
    symbol: 'alpha_calc', widget: 'derived', ui_config: null, verification_quote: `${L305} — ${L310}`,
    create: { section_code: 'K', label_de: 'Korrekturbeiwert α nach Gl. 6 (aus T dieses Arbeitsblatts)', data_type: 'number', unit: null, clause_reference: '§5.7, Gl. 6, Tab. 2',
      description: 'Plan 3: Ausgabe der Gleichung DIN-18130-1-03-D2 — 1,359 / (1 + 0,0337·T + 0,00022·T²); Tab. 2 druckt 1,158 / 1,000 / 0,874 / 0,771 / 0,686 für 5 / 10 / 15 / 20 / 25 °C; Ablösung des Eingabefelds alpha (DIN-18130-1-01) STAGED (din18130_1-D-1).' },
  }),
  WS03({
    symbol: 'k_10_calc', widget: 'derived', ui_config: null, verification_quote: `${L305} — ${L1335} — ${L1357}`,
    create: { section_code: 'C', label_de: 'k_10 (auf 10 °C umgerechnet, aus den Ablesungen)', data_type: 'number', unit: 'm/s', clause_reference: '§5.7, Gl. 6, §8.4',
      description: 'Plan 3: Ausgabe der Gleichung DIN-18130-1-03-D3 (k_T_mean · alpha_calc, wie Tab. 11: k_10 = 3,48·10⁻¹⁰ als Mittel der drei Ablesungen); Übergabe an DIN-18130-1-04 k_10 / -05 k_f STAGED (din18130_1-R-2 / R-3).' },
  }),
  WS03({
    symbol: 'i_max_calc', widget: 'derived', ui_config: null, verification_quote: `${L831} — ${L918}`,
    create: { section_code: 'C', label_de: 'Größtes hydraulisches Gefälle max. i (über die Ablesungen)', data_type: 'number', unit: null, clause_reference: '§8.4, Gl. 3',
      description: 'Plan 3: Ausgabe der Gleichung DIN-18130-1-03-D4 (max_rows über ablesungen.i_row: konstant h/l, veränderlich h_1/l_0); Beispiel 9.1: max. i = 33.' },
  }),
  WS03({
    symbol: 'i_min_calc', widget: 'derived', ui_config: null, verification_quote: `${L831} — ${L918}`,
    create: { section_code: 'C', label_de: 'Kleinstes hydraulisches Gefälle min. i (über die Ablesungen)', data_type: 'number', unit: null, clause_reference: '§8.4, Gl. 3',
      description: 'Plan 3: Ausgabe der Gleichung DIN-18130-1-03-D5 (min_rows: konstant h/l, veränderlich h_2/l_0 am Ende der Ablesung); Beispiel 9.1: min. i = 25 bzw. 27; der Bereich ist auf DIN-18130-1-05 (i_bereich) als Text anzugeben.' },
  }),

  // ---- DIN-18130-1-04: runs register (§5.3 / §8.3), mean over runs, Tab. 1 class code ----
  WS04({
    symbol: 'versuche', widget: 'register',
    ui_config: {
      title: 'Durchströmungsversuche (Versuche je Spannungszustand / Porenzahl)', subtitle: '§5.3 / §8.3 — je Versuch Porenzahl, Trockendichte, Sättigungszahlen und das Ergebnis k_10', add_label: '+ Versuch', placement: 'section',
      columns: [
        { key: 'nr', label: 'Versuch', type: 'number', required: true, min: 1 },
        { key: 'sigma_kn_m2', label: 'statische Belastung', type: 'number', unit: 'kN/m²', min: 0 },
        { key: 'e', label: 'e', type: 'number', min: 0, aria_label: 'Porenzahl e' },
        // n = e/(1+e): not printed as a formula; the four printed (n, e) pairs (Tab. 6 0,424 ↔ 29,8 %, 0,406 ↔ 28,9 %; §9.2 0,373 ↔ 27,2 %; §9.3 0,467 ↔ 31,8 %; §9.4 0,699 ↔ 0,411) satisfy it — din18130_1-F-3
        { key: 'n_pore_row', label: 'n = e/(1+e)', type: 'derived', expr: 'e / (1 + e)' },
        { key: 'rho_d', label: 'ϱ_d', type: 'number', unit: 'g/cm³', min: 0, aria_label: 'Trockendichte ϱ_d' },
        { key: 's_ra', label: 'S_ra', type: 'number', min: 0, max: 1, aria_label: 'Sättigungszahl vor dem Versuch S_ra' },
        { key: 's_re', label: 'S_re', type: 'number', min: 0, max: 1, aria_label: 'Sättigungszahl nach dem Versuch S_re' },
        { key: 'k_10_run', label: 'k_10', type: 'number', unit: 'm/s', required: true, min: 0, aria_label: 'k_10 des Versuchs' },
      ],
      footer: ['k_10_runs_mean', 'versuche_count'],
      note: `${L246} k_10 je Versuch wird aus den Ablesungen des jeweiligen Versuchs eingetragen (verschachtelte Register sind nicht gebaut — din18130_1-F-1).`,
    },
    verification_quote: `${L246} — ${L1133}`,
    create: { section_code: 'I', label_de: 'Durchströmungsversuche (mindestens drei bei Prüfung des Dichteeinflusses, §5.3)', data_type: 'json', unit: null, clause_reference: '§5.3, §8.3, Tab. 6, Tab. 10',
      description: 'Plan 3: Zeilen je Versuch (Porenzahl e, n = e/(1+e), ϱ_d, S_ra/S_re, k_10); Mittel → k_10_runs_mean (DIN-18130-1-04-D1, Beispiel 9.3: 3,77·10⁻⁹), Anzahl → versuche_count (-D2); das Gate „mindestens drei“ ist STAGED (din18130_1-G-5).' },
  }),
  WS04({
    symbol: 'k_10_runs_mean', widget: 'derived', ui_config: null, verification_quote: L1133,
    create: { section_code: 'I', label_de: 'k_10 (Mittel über die Versuche)', data_type: 'number', unit: 'm/s', clause_reference: '§8.3, §9.3, Tab. 10',
      description: 'Plan 3: Ausgabe der Gleichung DIN-18130-1-04-D1 (mean_rows über versuche.k_10_run; Tab. 10: (3,84 + 3,74 + 3,74)/3 = 3,77·10⁻⁹ m/s).' },
  }),
  WS04({
    symbol: 'versuche_count', widget: 'derived', ui_config: null, verification_quote: L246,
    create: { section_code: 'I', label_de: 'Anzahl der Durchströmungsversuche', data_type: 'number', unit: null, clause_reference: '§5.3',
      description: 'Plan 3: Ausgabe der Gleichung DIN-18130-1-04-D2 (count_rows über versuche); §5.3 verlangt mindestens drei, wenn der Einfluß der Dichte zu prüfen ist (Gate STAGED, din18130_1-G-5).' },
  }),
  WS04({
    symbol: 'bereich_code', widget: 'derived', ui_config: null, verification_quote: L1357,
    create: { section_code: 'I', label_de: 'Durchlässigkeitsbereich nach Tabelle 1 als Code (1 = sehr schwach durchlässig, unter 10⁻⁸ · 2 = schwach durchlässig, 10⁻⁸ bis 10⁻⁶ · 3 = durchlässig, über 10⁻⁶ bis 10⁻⁴ · 4 = stark durchlässig, über 10⁻⁴ bis 10⁻² · 5 = sehr stark durchlässig, über 10⁻²)', data_type: 'number', unit: null, clause_reference: '§3.7, Tab. 1',
      description: 'Plan 3: Ausgabe der Gleichung DIN-18130-1-04-D3 aus k_10 (Gl. 6); die Handauswahl durchlaessigkeitsbereich (DIN-18130-1-01) zu ersetzen ist STAGED (din18130_1-D-2).' },
  }),

  // ---- DIN-18130-1-05: §8.4 report items, i range visibility ----
  WS05({
    symbol: 'pflichtangaben', widget: 'select_many',
    ui_config: {
      title: 'Pflichtangaben §8.4', subtitle: 'Mit dem Versuchsergebnis mitzuteilen — 1) Angaben zum Versuch · 2) Angaben zur Probe', note: L831,
      groups: [
        { label: '1) Angaben zum Versuch', options: PFLICHTANGABEN_VERSUCH.map((p) => p.value) },
        { label: '2) Angaben zur Probe', options: PFLICHTANGABEN_PROBE.map((p) => p.value) },
      ],
    },
    enum_values: PFLICHTANGABEN.map((p, i) => ({ value: p.value, label_de: p.label_de, order_index: i })),
    verification_quote: L833,
    create: { section_code: 'K', label_de: 'Pflichtangaben des Versuchsberichts (§8.4, 5 + 9 Punkte)', data_type: 'json', unit: null, clause_reference: '§8.4',
      description: 'Plan 3: Mehrfachauswahl über die 14 gedruckten Berichtsangaben; Vollständigkeit (alle 14) als Gate neben dem Boolean versuchsbericht_vollstaendig (CR-06) ist STAGED (din18130_1-G-4).' },
  }),
  WS05({
    symbol: 'i_bereich', widget: 'scalar', ui_config: null, visible_when: VERAENDERLICH, // L832: the range is required for variable-head tests only
    verification_quote: L831,
  }),
];

/**
 * No section rules: -04 G ("k bei konstantem Gefälle") holds `k` (consumed by -05, three producers) and -04 H
 * ("k bei veränderlichem Gefälle") holds no field — an inert rule (Task 8 lesson). Both are din18130_1-C-2.
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
