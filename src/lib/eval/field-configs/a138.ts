/**
 * DWA-A-138-1 — Plan 3 Task 1 field configs (selections, registers, lookup_fills,
 * visibility) as DATA for `scripts/regulation-tables/emit-field-configs-sql.ts a138`.
 *
 * Every `verification_quote` is lifted verbatim (whitespace-normalised) from the
 * transcript `Desktop\Guidelines\DWA-A-138-1\DWA-A_138-1_WD (5).md`; the line is
 * in the comment. Prod facts come from the captured `a138.prior.json`
 * (2026-09-17, read-only): section codes are single letters (`C` = worksheet-
 * specific content, `D` = results / derived values, `B` = input parameters).
 *
 * What is deliberately NOT here (each on the sign-off sheet, STAGED SQL in
 * scripts/verification/a138-STAGED-plan3-rulings.sql):
 *   - `f_methode` lookup_fill on TAB11 — prod `permeability_test_method` has 4
 *     enum values, TAB11 prints 6 rows (D-1) → a138-E-1;
 *   - `q_VS` lookup_fill on S6_4_2_QVS — `q_VS` is the Gl. 24 output on A138-18
 *     (engine-owned; a second producer would break single-source) → a138-E-4;
 *   - `n_M_overflow_limit` lookup_fill on TAB6 — its second key `bbz_band` is
 *     not a field (same state as the 2b `ac_as_ratio_limit` binding, D-2b-3)
 *     and the widget would take the engineer's input away while the key is
 *     missing → a138-E-3;
 *   - visibility on `schacht_filter_thickness` (A138-21), `Q_Dr`/`V_MUE`/`Q_MUE`
 *     (A138-20), `n_R` (A138-19) and on the B/C/D sections of A138-16..22 that
 *     hold producers consumed by A138-23/24/28 — the emitter refuses a
 *     `visible_when` on a consumed producer → a138-C-1 … a138-C-3.
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { S6_4_2_SCHUETTMATERIAL, TAB8_SCHUTZKATEGORIE, tab13AsTable } from '../regulation-tables-seed-a138';

const STD = 'DWA-A-138-1';

// ---- lifted cue sentences (transcript line in the name) ----
const L789 = 'In Bezug auf den Referenzparameter AFS63 enthält Tabelle 5 die Zuordnung unterschiedlicher Flächentypen und Flächennutzungen zu den Belastungskategorien I (gering belastetes Niederschlagswasser), II (mäßig belastetes Niederschlagswasser) und III (stark belastetes Niederschlagswasser).';
const L791 = 'Von der Kategorisierung nach Tabelle 5 kann in begründeten Fällen abgewichen werden.';
const L912 = 'Tabelle 6: Anforderungen an die Niederschlagswasserbehandlung bei Versickerung durch eine bewachsene Bodenzone';
const L914 = 'Flächengruppen und Belastungskategorie nach Tabelle 5';
const L967 = 'Bei Einsatz unterirdischer Versickerungsanlagen sind dezentrale Behandlungsanlagen vorzuschalten. Tabelle 7 definiert Anforderungen an die dezentrale Niederschlagswasserbehandlung vor Versickerung über unterirdische Versickerungsanlagen. Für dezentrale Behandlungsanlagen werden erforderliche Wirkungsgrade für AFS63 und gelöste Stoffe festgelegt.';
const L980 = 'Tabelle 7: Anforderungen an die dezentrale Niederschlagswasserbehandlung vor Versickerung über unterirdische Versickerungsanlagen (Rigolen, Versickerungsschächte)';
const L1019 = String.raw`(**) Der Wirkungsgrad $\eta_{\text {gelöste Stoffe }}$ bezieht sich ausschließlich auf die Referenzparameter Kupfer und Zink.`;
const L1132 = 'Tabelle 8: Hinweise zur Festlegung von Bemessungs- und Überflutungshäufigkeiten für Versickerungsanlagen (Quelle: in Anlehnung an Arbeitsblatt DWA-A 118:2024)';
const L1135 = 'Schutzkategorie für Mensch, Umwelt, Versorgung, Wirtschaft, Kultur';
const L1198 = 'Für die Bemessungshäufigkeit $n$ nach Tabelle 8 darf kein Überlauf aus der Versickerungsanlage (bzw. dem Gesamtsystem bei Mulden-Rigolen-Elementen oder -Systemen) auftreten.';
const L1336 = 'Für die Berechnung wird die bemessungsrelevante Infiltrationsrate optimalerweise durch Versuche vor Ort bestimmt (Anhang A). Die Versuchsstandorte sind über den Standort der geplanten Versickerungsanlage so zu verteilen, dass unterschiedliche Untergrundverhältnisse erfasst werden.';
const L1338 = String.raw`I Bei kompakten/flächenhaften Versickerungsanlagen ist mindestens ein Versuchsstandort je $150 \mathrm{~m}^{2}$ Sohlenfläche der Versickerungsanlage erforderlich.`;
const L1340 = 'I Übersteigt die Länge der geplanten Versickerungsanlage 10 m , ist bei heterogenen Bodenverhältnissen mindestens ein weiterer Versuchsstandort vorzusehen. Bei größeren Versickerungsanlagen sind Versuchsstandorte mindestens alle 25 m der Anlagenlänge anzuordnen.';
const L1354 = String.raw`Auf der sicheren Seite liegend wird die minimale Infiltrationsrate als $k_{\mathrm{f}}$-Wert verwendet.`;
const L1039 = 'Bei geschichteten Bodenprofilen sind maßgebliche Bodenschichten zu wählen, um die bemessungsrelevante Infiltrationsrate festzulegen. Die maßgeblichen Bodenschichten sind bei zentralen Versickerungsanlagen in einem Bodengutachten auszuweisen, bei dezentralen Versickerungsanlagen wird dies empfohlen. Bei oberirdischen Anlagen muss bei der Festlegung der bemessungsrelevanten In- filtrationsrate für die Bemessung die vorhandene oder geplante bewachsene Bodenzone berücksichtigt werden; die jeweils geringere Durchlässigkeit ist maßgebend.';
const L1039_NOTE = 'die jeweils geringere Durchlässigkeit ist maßgebend';
const L1866 = String.raw`Liegen keine Herstellerangaben zu den Sickeröffnungen vor, können folgende Werte näherungsweise für den spezifischen Wasseraustritt $q_{\mathrm{D}}$ aus dem Versickerrohr verwendet werden:`;
const L752 = 'Eine Versickerung von Niederschlagswasser ist grundsätzlich möglich, wenn alle der oben genannten Kriterien zutreffen und durch Fachgutachten nachgewiesen sind. Ist ein Kriterium nicht erfüllt sind die entsprechenden Kriterien nach Spalte 3 zu prüfen. & Wenn eine oder mehrere Kriterien dieser Kategorie zutreffen, sind technische und planerische Maßnahmen durch die Fachplanenden aufzuzeigen und ggf. mit der zuständigen Genehmigungsbehörde abzustimmen & Wenn eines der oben aufgeführten Kriterien zutrifft, ist eine Versickerung von Niederschlagswasser in der Regel nicht zulässig';
const L1498 = String.raw`Die zurückzuhaltende Regenwassermenge $V_{\text {Rück }}$ wird für alle Schutzkategorien nach Tabelle 8 nach DIN 1986-100 in der Regel für eine Überflutungshäufigkeit von $n=0,033 / a$ ( $T_{\mathrm{n}}=30 \mathrm{a}$ ) für Versickerungsanlagen gemäß GL. (10) berechnet:`;
const L1514 = String.raw`$A_{\mathrm{E}, \mathrm{b}, \mathrm{a}}$ & $\mathrm{m}^{2}$ & befestigte, angeschlossene Fläche im Einzugsgebiet`;
const L2085 = String.raw`Beim Schacht Typ B (Bild 15) liegen die seitlichen Durchtrittsöffnungen ausschließlich unterhalb einer Filterschicht des Sohlenbereichs. Die Entleerung des Speichervolumens im Schacht erfolgt vollständig über Durchsickerung der Filterschicht. Damit ist eine zusätzliche Reinigungswirkung im Schacht Typ B gegeben. Als Material für diese Filterschicht $(\geqslant 50 \mathrm{~cm})$ ist carbonathaltiger Sand mit einer Körnung von größer 0 mm bis 4 mm oder sind geeignete Substrate zu verwenden. Ein Durchlässigkeitsbeiwert von $k_{\mathrm{f}} \leq 1 \cdot 10^{-3} \mathrm{~m} / \mathrm{s}$ muss für die Filterschicht gewährleistet sein.`;
const L2155 = 'Für den Schacht Typ B ist nachzuweisen, dass die bei der Bemessung berücksichtigte Versickerungsleistung des Schachts nicht durch die Filterschicht eingeschränkt wird. Deshalb muss folgende Bedingung nach Gl. (38) eingehalten werden:';
const L2162 = String.raw`Für $A_{\mathrm{S}, \mathrm{Schacht}}$ ist die Gl. (34) einzusetzen. $A_{\mathrm{S}, \mathrm{FS}}$ ist die Querschnittsfläche mit dem Durchmesser $d_{\mathrm{i}}$.`;
const L919 = String.raw`\hline BG1 & & \multicolumn{2}{|c|}{bei Mulden-Rigolen: Überlauf in Rigole mit $n_{\mathrm{M}}$ max. 2/a} \\`;
const L2246 = 'In der Tabelle 14 werden die Planungs- und Bemessungsvorgaben aus 6.2 bis 6.8 zusammengestellt.';
const L2252 = 'Versickerungsfläche & Versickerungsmulde & Mulden-Rigolen-Element & Mulden-Rigolen-System & Rigole & Versickerungsschacht & Versickerungsbecken';

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const A138_06 = on('A138-06');

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- A138-06: Tab. 5 → BK / tier → Tab. 7 required efficiencies ----
  A138_06({
    symbol: 'belastungskategorie', widget: 'lookup_fill', enum_values: 'keep_prod', ui_config: null,
    lookup: { table_code: 'TAB5', role: 'value', keys: [{ column: 'flaechengruppe', from_symbol: 'flaechengruppe' }], value: 'bk' },
    verification_quote: `${L789} ${L791}`, // L789 (the Tab. 5 row IS the mapping, §7 rule 5) + L791 (deviation sentence → TAB5 policy sign-off a138-P-1)
  }),
  A138_06({
    symbol: 'a138_tier', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 5 → Tab. 6' },
    lookup: { table_code: 'TAB5', role: 'value', keys: [{ column: 'flaechengruppe', from_symbol: 'flaechengruppe' }], value: 'tier' },
    verification_quote: `${L912} — ${L914}`, // L912 caption, L914 key head
    create: { section_code: 'C', label_de: 'Anforderungsstufe nach Tabelle 6 (Anforderungen an die Niederschlagswasserbehandlung bei Versickerung durch eine bewachsene Bodenzone)', data_type: 'text', unit: null, clause_reference: '§5.2.3.2, Tab. 6',
      description: 'Plan 3: Stufenschlüssel (tier1_none | tier2 | tier3 | authority) aus Tab. 5 für die Zeilenauswahl in Tab. 6 / Tab. 7 — wird aus der Flächengruppe gefüllt, nie getippt.' },
  }),
  A138_06({
    symbol: 'eta_afs63_required', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 7' },
    lookup: { table_code: 'TAB7', role: 'limit', keys: [{ column: 'tier', from_symbol: 'a138_tier' }], value: 'eta_afs63_min' },
    verification_quote: `${L980} — ${L967}`, // L980 caption, L967 §5.2.3.3
    create: { section_code: 'C', label_de: 'Erforderlicher Gesamtwirkungsgrad η_AFS63 (Tab. 7)', data_type: 'number', unit: '%', clause_reference: '§5.2.3.3, Tab. 7',
      description: 'Plan 3: erforderlicher Wirkungsgrad AFS63 aus Tab. 7 (Grenzwert je Anforderungsstufe); die Prüfung eta_AFS63 ≥ eta_afs63_required ist STAGED (a138-G-1).' },
  }),
  A138_06({
    symbol: 'eta_geloest_required', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 7' },
    lookup: { table_code: 'TAB7', role: 'limit', keys: [{ column: 'tier', from_symbol: 'a138_tier' }], value: 'eta_geloest_min' },
    verification_quote: `${L980} — ${L1019}`, // L980 caption, L1019 footnote (**)
    create: { section_code: 'C', label_de: 'Erforderlicher Gesamtwirkungsgrad η_gelöste Stoffe (Tab. 7; Referenzparameter Kupfer und Zink)', data_type: 'number', unit: '%', clause_reference: '§5.2.3.3, Tab. 7',
      description: 'Plan 3: erforderlicher Wirkungsgrad gelöste Stoffe (Cu/Zn) aus Tab. 7 (Grenzwert je Anforderungsstufe); Prüfung STAGED (a138-G-1).' },
  }),

  // ---- A138-08: Tab. 8 Schutzkategorie → n_limit ----
  on('A138-08')({
    symbol: 'schutzkategorie', widget: 'select_one', ui_config: null,
    enum_values: TAB8_SCHUTZKATEGORIE.map((c, i) => ({ value: c.value, label_de: c.label_de, order_index: i })), // labels lifted L1152 / L1157 / L1163 / L1179
    verification_quote: `${L1132} — ${L1135}`, // L1132 caption, L1135 column head
    create: { section_code: 'C', label_de: 'Schutzkategorie für Mensch, Umwelt, Versorgung, Wirtschaft, Kultur (Tab. 8)', data_type: 'enum', unit: null, clause_reference: '§5.3.3.4, Tab. 8',
      description: 'Plan 3: Zeilenauswahl in Tab. 8 (Bemessungs- und Überflutungshäufigkeit); zusammen mit A_C ≤ / > 800 m² Schlüssel für n_limit.' },
  }),
  on('A138-08')({
    symbol: 'n_limit', widget: 'derived', ui_config: null,
    verification_quote: `${L1132} — ${L1198}`, // L1132 caption, L1198 (no overflow at n)
    create: { section_code: 'D', label_de: 'Zulässige Bemessungshäufigkeit n nach Tabelle 8 (obere Grenze)', data_type: 'number', unit: '1/a', clause_reference: '§5.3.3.4, Tab. 8',
      description: 'Plan 3: Ausgabe der Gleichung A138-08-D1 (lookup TAB8 über schutzkategorie × A_C-Band); die Prüfung n ≤ n_limit ist STAGED (a138-G-4).' },
  }),

  // ---- A138-18: Schüttmaterial (driver for the §6.4.2 q_VS defaults; the q_VS binding itself is STAGED, a138-E-4) ----
  on('A138-18')({
    symbol: 'schuettmaterial', widget: 'select_one', ui_config: null,
    enum_values: S6_4_2_SCHUETTMATERIAL.map((m, i) => ({ value: m.value, label_de: m.label_de, order_index: i })), // labels lifted L1869 / L1870
    verification_quote: L1866,
    create: { section_code: 'B', label_de: 'Schüttmaterial der Rigole (für q_VS-Näherungswerte nach 6.4.2)', data_type: 'enum', unit: null, clause_reference: '§6.4.2',
      description: 'Plan 3: Schlüssel der Tabelle S6_4_2_QVS (Kiessand 0,2 · Kies 5 l/(s·m)); die Übernahme in q_VS ist STAGED (a138-E-4), Herkunftsfeld fehlt (a138-S-1).' },
  }),

  // ---- A138-05: k_f test sites + layered soil profile (registers) and their derived minima ----
  on('A138-05')({
    symbol: 'kf_test_sites', widget: 'register',
    ui_config: {
      title: 'k_f-Versuchsstandorte', subtitle: '§5.3.3.6 — je Standort ein Versuch; maßgebend ist der minimale Wert', add_label: '+ Standort', placement: 'section',
      columns: [
        { key: 'label', label: 'Standort', type: 'text', required: true },
        { key: 'method', label: 'Verfahren (Tab. 11)', type: 'lookup_key', required: true, lookup: { table_code: 'TAB11' } },
        { key: 'f_methode_row', label: 'f_Methode', type: 'lookup_value', lookup: { table_code: 'TAB11', key_column: 'method', value: 'f_methode' } },
        { key: 'depth_m', label: 'Tiefe', type: 'number', unit: 'm', min: 0 },
        { key: 'k_f_measured', label: 'k_f gemessen', type: 'number', unit: 'm/s', required: true, min: 0 },
        { key: 'date', label: 'Datum', type: 'date' },
      ],
      footer: ['k_f_sites_min'],
      note: L1354,
    },
    verification_quote: `${L1336} ${L1338} ${L1340} ${L1354}`, // L1336–L1340 (site distribution / minimum count), L1354 (minimum governs)
    create: { section_code: 'C', label_de: 'k_f-Versuchsstandorte', data_type: 'json', unit: null, clause_reference: '§5.3.3.6',
      description: 'Plan 3: Zeilen je Versuchsstandort (Verfahren nach Tab. 11, gemessener k_f); Minimum → k_f_sites_min (A138-05-D1); Anzahl/Dichte-Regel STAGED (a138-D-2, a138-F-1).' },
  }),
  on('A138-05')({
    symbol: 'soil_layers', widget: 'register',
    ui_config: {
      title: 'Bodenschichten (Bodenprofil)', subtitle: '§5.3.1 — maßgebliche Bodenschichten; die jeweils geringere Durchlässigkeit ist maßgebend', add_label: '+ Schicht', placement: 'section',
      columns: [
        { key: 'label', label: 'Schicht', type: 'text' },
        { key: 'top_m', label: 'Oberkante', type: 'number', unit: 'm', min: 0 },
        { key: 'bottom_m', label: 'Unterkante', type: 'number', unit: 'm', min: 0 },
        // datalist = the Tab. 13 label_de list read from the seeded table (never typed here).
        { key: 'bodenart', label: 'Bodenart', type: 'text', datalist: tab13AsTable().rows.map((r) => r.label_de) },
        { key: 'k_f', label: 'k_f', type: 'number', unit: 'm/s', required: true, min: 0 },
        { key: 'is_bbz', label: 'bewachsene Bodenzone', type: 'boolean' },
      ],
      footer: ['k_f_layer_min'],
      note: L1039_NOTE,
    },
    verification_quote: L1039,
    create: { section_code: 'C', label_de: 'Bodenschichten (geschichtetes Bodenprofil)', data_type: 'json', unit: null, clause_reference: '§5.3.1',
      description: 'Plan 3: Zeilen je Bodenschicht (Tiefe, Bodenart nach Tab. 13, k_f, BBZ-Kennzeichen); Minimum → k_f_layer_min (A138-05-D3).' },
  }),
  on('A138-05')({
    symbol: 'k_f_sites_min', widget: 'derived', ui_config: null, verification_quote: L1354,
    create: { section_code: 'D', label_de: 'Minimaler gemessener k_f über alle Versuchsstandorte', data_type: 'number', unit: 'm/s', clause_reference: '§5.3.3.6',
      description: 'Plan 3: Ausgabe der Gleichung A138-05-D1 (min_rows über kf_test_sites); Übernahme in k_f ist STAGED (a138-R-2).' },
  }),
  on('A138-05')({
    symbol: 'k_f_layer_min', widget: 'derived', ui_config: null, verification_quote: L1039,
    create: { section_code: 'D', label_de: 'Geringste Durchlässigkeit der maßgeblichen Bodenschichten', data_type: 'number', unit: 'm/s', clause_reference: '§5.3.1',
      description: 'Plan 3: Ausgabe der Gleichung A138-05-D3 (min_rows über soil_layers).' },
  }),

  // ---- A138-02: Tab. 3 feasibility code (derived; feasibility_determination stays manual, a138-D-1) ----
  on('A138-02')({
    symbol: 'feasibility_code', widget: 'derived', ui_config: null, verification_quote: L752,
    create: { section_code: 'D', label_de: 'Umsetzbarkeit nach Tabelle 3 als Code (1 = alle Spalte-2-Kriterien erfüllt · 2 = nicht nachgewiesen möglich · 3 = ein Spalte-4-Kriterium trifft zu)', data_type: 'number', unit: null, clause_reference: '§5.1.1, Tab. 3',
      description: 'Plan 3: Ausgabe der Gleichung A138-02-D1 (Spaltenlogik der Tab. 3 über die sieben Kriterienfelder). Code 2 ist NICHT gleich Spalte 3: zwei Spalte-4-Fälle werden konstruktionsbedingt in Code 2 gefaltet — (1) Trinkwasserschutzgebiet mit nicht vernachlässigbarem Risiko (L747, kein Risikofeld; jede Zone ⇒ 2) und (2) k_f < 1·10⁻⁶ m/s ohne möglichen Anschluss/Ableitung (L748, kein Feld) — daher „nicht nachgewiesen möglich“; Ableitung von feasibility_determination STAGED (a138-D-1).' },
  }),

  // ---- A138-26: Σ(A_E,b,a · C_S) from the surface inventory rows (Gl. 10 term) ----
  on('A138-26')({
    symbol: 'A_C_s_flood', widget: 'derived', ui_config: null, verification_quote: `${L1498} — ${L1514}`,
    create: { section_code: 'D', label_de: 'Σ (A_E,b,a · C_S) aus dem Flächenverzeichnis (Gl. 10)', data_type: 'number', unit: 'm²', clause_reference: '§5.3.4.1, Gl. 10',
      description: 'Plan 3: Ausgabe der Gleichung A138-26-D1 (sum_rows über surface_inventory, befestigte Zeilen × C_s); Umstellung von Gl. 10 auf diesen Wert STAGED (a138-R-1).' },
  }),

  // ---- A138-21: Typ-B filter fields visible for shaft_type == typ_B only (§6.7.1 / §6.7.2) ----
  // k_f_FS (L2085 + L2155): REFUSED by the transitive producer guard (Task 3 fix round 1) — k_f_FS → Gl.40 h_S (consumed by A138-23, A138-24); STAGED a138-C-6.
  on('A138-21')({ symbol: 'A_S_FS', widget: 'scalar', ui_config: null, visible_when: "shaft_type == 'typ_B'", verification_quote: `${L2155} ${L2162}` }), // L2155 + L2162

  // ---- A138-20: the Mulden-Rigolen overflow frequency applies to MRE / MRS only (Tab. 6, L919–L926) ----
  on('A138-20')({ symbol: 'n_R_MRS', widget: 'scalar', ui_config: null, visible_when: "facility_type_selected IN {'MRE', 'MRS'}", verification_quote: L919 }),
];

void L2085; // k_f_FS cue kept lifted for the STAGED block a138-C-6 (rule withdrawn, Task 3 fix round 1)

/** facility_type_selected token per Tab. 14 column (L2252, left→right) ↔ A138-16…22 worksheet. */
const FACILITY_WORKSHEETS: ReadonlyArray<{ worksheet: string; token: string; sections: string[] }> = [
  // Sections holding a producer consumed by another worksheet are refused by the emitter and go to the STAGED file (a138-C-3).
  { worksheet: 'A138-16', token: 'flaeche', sections: ['A', 'B', 'D', 'F', 'J', 'K', 'L', 'M'] },      // C: A_S_flaeche
  { worksheet: 'A138-17', token: 'mulde', sections: ['A', 'C', 'F', 'J', 'K', 'L', 'M'] },             // B: boeschungsneigung, freibord · D: t_E, V_M
  { worksheet: 'A138-18', token: 'rigole', sections: ['A', 'C', 'F', 'J', 'K', 'L', 'M'] },            // B: b_R, d_a, d_i, h_R · D: L_R, s_R, V_R
  { worksheet: 'A138-19', token: 'MRE', sections: ['A', 'C', 'F', 'J', 'K', 'L', 'M'] },               // B: n_M_overflow_*, n_R · D: V_MR
  { worksheet: 'A138-20', token: 'MRS', sections: ['A', 'C', 'F', 'J', 'K', 'L', 'M'] },               // D: Q_Dr, Q_MUE, V_MUE · B (transitive, Task 3 fix round 1): Q_Dr_max / Q_Dr_min → Gl.33 Q_Dr (consumed) — a138-C-7
  { worksheet: 'A138-21', token: 'schacht', sections: ['A', 'C', 'F', 'J', 'K', 'L', 'M'] },           // B: schacht_* checks · D: h_S, V_S
  { worksheet: 'A138-22', token: 'becken', sections: ['A', 'F', 'J', 'K', 'L', 'M'] },                 // B: basin_h_check · C: basin_ki_min_check · D: V_B
];

export const SECTION_VISIBILITY: SectionVisibilityEntry[] = FACILITY_WORKSHEETS.flatMap(({ worksheet, token, sections }) =>
  sections.map((section_code) => ({
    standard: STD, worksheet, section_code,
    visible_when: `facility_type_selected == '${token}'`,
    verification_quote: `${L2246} ${L2252}`, // L2246 + the Tab. 14 column heads L2252 (§6.1 Bild 7 is an image)
  })),
);

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
