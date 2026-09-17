/**
 * DWA-M-1200-1 — Plan 3 Task 5 field configs (registers, lookup_fill, visibility)
 * as DATA for `scripts/regulation-tables/emit-field-configs-sql.ts m1200_1`.
 *
 * Every `verification_quote` is a span lifted verbatim (by line range) from the
 * transcript `Desktop\Guidelines\DWA-M-1200-1\DWA-M_1200-1_GD.md` (Gelbdruck
 * Juli 2025) — the `Q_*` constants live in `regulation-tables-seed-m1200_1.ts`
 * with their line ranges. Prod facts come from the captured `m1200_1.prior.json`
 * (2026-09-17, read-only): 20 worksheets, every one with the nine coded sections
 * A B C D F J K L M (inputs in B / C, outputs in D; 12 of 126 fields are
 * orphans); 1 equation (EQ-001 on M12001-07); 21 compliance rows. Enum tokens
 * below are the captured prod `enum_values` (G-A3: table key strings equal them
 * exactly — `A B-1 B-2 C-1 C-2 D`, the eight `filtration_typ` tokens, `A…E`,
 * `1…5`, `sehr_niedrig … sehr_hoch`; the yes/no drivers `aerosolrisiko` and
 * `anwendung_weide_oder_futterpflanzen` are ENUMS `ja` / `nein`, so their rules
 * read `== 'ja'`, not `== true`).
 *
 * Every entry is a `create` (additive). NO existing field carries a rule: every
 * candidate of the brief's Step 4 is a consumed producer (`legionella_value`,
 * `nematoden_value`, `log10_*`, `validierungs_compliance_pct`, `truebung_max_value`,
 * `bsb5_value`, `afs_value`, `indikatorchemikalien_*`, `pfas20_value` — all
 * consumed by M12001-12 / -13 / -15) and the transitive producer guard refuses
 * them → m1200_1-C-3 (STAGED); `beschilderung_urbane_flaechen` (M12001-19) has
 * no `anwendungsbereich_kategorie` in scope (consumed by -09, -11, -16 only) →
 * m1200_1-C-1 (consumer edit + rule STAGED). The created fields carry the same
 * rules where their driver IS in scope.
 *
 * Placement (codebase reality over the brief — report §8):
 *   - every Tab. 8 limit / target fill and the `routineproben` register live on
 *     M12001-09 (its `gueteklasse_zugeordnet`, `aerosolrisiko`,
 *     `anwendung_weide_oder_futterpflanzen` and `filtration_typ` are inherited
 *     there) — the rows read the limit symbols in row scope (G-13) and the Σ
 *     `compliance_quote_calc` is a created output on the register's worksheet
 *     (an equation reads a register of its own worksheet only); the existing
 *     manual `compliance_quote_pct` on M12001-12 and CR-008 are m1200_1-C-2 /
 *     -G-7;
 *   - the Tab. 27 frequencies are CREATED text fills on M12001-12 next to the
 *     existing `beprobung_frequenz_e_coli` enum (re-binding that consumed enum
 *     would leave the engineer without an input for the class-C cell the
 *     transcript does not print — trap 1 of the a262e round) → m1200_1-E-3;
 *   - no `TAB8_CLASSMAP` / `gueteklasse_group` chain: the tables key on the six
 *     prod tokens directly (seed header).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import {
  GUETEKLASSE_TOKENS, FILTRATION_TOKENS, WAHRSCHEINLICHKEIT_TOKENS, SCHADENSAUSMASS_TOKENS, RISIKONIVEAU_TOKENS, SCHUTZGUT_CODES,
  WAHRSCHEINLICHKEIT_LABELS, SCHADENSAUSMASS_LABELS,
  Q_L918, Q_L975, Q_L1006, Q_L1053, Q_L1129, Q_L1135, Q_L1139, Q_L1143, Q_L1145, Q_L1147, Q_T8_A, Q_T8_B, Q_T8_C, Q_T8_D, Q_L1215, Q_L1217, Q_L1218, Q_L1219, Q_L1220,
  Q_L1882, Q_L1953, Q_L1955, Q_L1965, Q_T19, Q_L1986, Q_L2010, Q_L2042, Q_L2044, Q_L2061, Q_L2073, Q_L2075, Q_L2077, Q_L2083, Q_L2085, Q_L2101, Q_L2105, Q_L2119, Q_L2123, Q_L2129, Q_L2130,
  Q_L2360_2366, Q_L2372, Q_L2378, Q_T27_A, Q_T27_B, Q_T27_C, Q_T27_D, Q_L2393_2399, Q_L2465, Q_L2548, Q_L2553, Q_L1913,
  frag,
} from '../regulation-tables-seed-m1200_1';

const STD = 'DWA-M-1200-1';
export { GUETEKLASSE_TOKENS, FILTRATION_TOKENS, WAHRSCHEINLICHKEIT_TOKENS, SCHADENSAUSMASS_TOKENS, RISIKONIVEAU_TOKENS, SCHUTZGUT_CODES };

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS07 = on('M12001-07');
const WS08 = on('M12001-08');
const WS09 = on('M12001-09');
const WS12 = on('M12001-12');
const WS13 = on('M12001-13');
const WS14 = on('M12001-14');
const WS16 = on('M12001-16');

// ---- drivers (captured prod enums) ----
export const AEROSOL = "aerosolrisiko == 'ja'";                                   // M12001-06 aerosolrisiko (ja/nein), consumed by -09 and -12
export const WEIDE = "anwendung_weide_oder_futterpflanzen == 'ja'";              // M12001-08 (ja/nein), consumed by -09 and -11 (NOT -12 → m1200_1-C-1)
export const LEISTUNGSZIELE = "gueteklasse_zugeordnet IN {'A', 'B-1', 'C-1'}";  // Tab. 8: the classes whose log10 column prints targets

/** Printed level labels for the register badges (Tab. 23 levels, L2052–L2056). */
export const RISIKONIVEAU_LABELS: Record<(typeof RISIKONIVEAU_TOKENS)[number], string> = { sehr_niedrig: 'Sehr niedrig', niedrig: 'Niedrig', moderat: 'Moderat', hoch: 'Hoch', sehr_hoch: 'Sehr hoch' };
const CODE_LABELS = { '1': 'Sehr niedrig', '2': 'Niedrig', '3': 'Moderat', '4': 'Hoch', '5': 'Sehr hoch' } as const;
/** The six hazard sheets of Arbeitshilfe C (L2083 "z. B. Schwermetalle, PFAS, mikrobielle Gefahren"; L1913 "Salze, organische Stoffe, organische Spurenstoffe, Nährstoffe und Schwermetalle") — tokens mirror the prod M12001-06 `gefahr_*` booleans. */
export const GEFAHR_TOKENS = ['mikrobiologisch', 'schwermetalle', 'pfas', 'organische_spurenstoffe', 'salze', 'mikroplastik'] as const;
const GEFAHR_LABELS = { mikrobiologisch: 'mikrobielle Gefahren', schwermetalle: 'Schwermetalle', pfas: 'PFAS', organische_spurenstoffe: 'organische Spurenstoffe', salze: 'Salze', mikroplastik: 'Mikroplastik' } as const;
/** Tab. 24 column "Bewertung der Exposition (aus Arbeitshilfe B)": "hoch - mittel - gering - nicht vorhanden" (L2086). */
export const EXPOSITION_TOKENS = ['hoch', 'mittel', 'gering', 'nicht_vorhanden'] as const;
const EXPOSITION_LABELS = { hoch: 'hoch', mittel: 'mittel', gering: 'gering', nicht_vorhanden: 'nicht vorhanden' } as const;
/** §6.6.1 monitored compartments (L2360–L2366): plants, soil, spring discharge, groundwater, surface water. */
export const MATRIX_TOKENS = ['pflanzen', 'boden', 'quellschuettung', 'grundwasser', 'oberflaechengewaesser'] as const;
const MATRIX_LABELS = { pflanzen: 'bewässerte Pflanzen', boden: 'Boden', quellschuettung: 'Quellschüttung (benachbarte Gebiete)', grundwasser: 'Grundwasser', oberflaechengewaesser: 'angrenzende Oberflächengewässer' } as const;
/** Routine-sample parameters = the seven Tab. 27 columns (L2381). */
export const PROBE_PARAMETER_TOKENS = ['e_coli', 'enterokokken', 'bsb5', 'afs', 'truebung', 'legionella', 'nematoden'] as const;
const PROBE_PARAMETER_LABELS = { e_coli: 'E. coli (KBE/100 ml)', enterokokken: 'Intestinale Enterokokken (KBE/100 ml)', bsb5: 'BSB5 (mg/l)', afs: 'AFS (mg/l)', truebung: 'Trübung (NTU)', legionella: 'Legionella spp. (KBE/l)', nematoden: 'Intestinale Nematoden (Eier/l)' } as const;

const ENUM_W = { options: [...WAHRSCHEINLICHKEIT_TOKENS], option_labels: WAHRSCHEINLICHKEIT_LABELS };
const ENUM_S = { options: [...SCHADENSAUSMASS_TOKENS], option_labels: SCHADENSAUSMASS_LABELS };
const MODERAT = 'ausgangsrisiko_code >= 3'; // L2061 "moderates oder hohes Risikoniveau" — code 3 = Moderat in the Tab. 23 level order

/** Tab. 8 limit fill on M12001-09, keyed on the inherited class; `printed` names the per-class cells for the label. */
const tab8Fill = (symbol: string, value: string, label: string, unit: string, quote: string, printed: string, visible_when: string | null = null, note: string = ''): FieldConfigEntry => WS09({
  symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 8 (Arbeitshilfe A)' },
  lookup: { table_code: 'TAB8', role: 'limit', keys: [{ column: 'klasse', from_symbol: 'gueteklasse_zugeordnet' }], value },
  visible_when, verification_quote: quote,
  create: { section_code: 'B', label_de: `${label} — Tab. 8 (${printed})`, data_type: 'number', unit, clause_reference: '§5.2, Tab. 8',
    description: `Plan 3: Wert aus TAB8 zur zugeordneten Wassergüteklasse (locked — Mindestanforderung); die Routineproben-Zeilen vergleichen dagegen (M12001-09-D1)${note}.` },
});
/** Tab. 27 frequency fill on M12001-12 (text, the printed cell verbatim), keyed on the inherited class. */
const tab27Fill = (symbol: string, value: string, label: string, quote: string, visible_when: string | null = null, note: string = ''): FieldConfigEntry => WS12({
  symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 27' },
  lookup: { table_code: 'TAB27', role: 'value', keys: [{ column: 'klasse', from_symbol: 'gueteklasse_zugeordnet' }], value },
  visible_when, verification_quote: quote,
  create: { section_code: 'B', label_de: `Mindesthäufigkeit der Beprobung — ${label} (Tab. 27)`, data_type: 'text', unit: null, clause_reference: '§6.6.2, Tab. 27',
    description: `Plan 3: gedruckte Mindesthäufigkeit aus TAB27 zur zugeordneten Wassergüteklasse (Text, verbatim)${note}; die bestehende Auswahl beprobung_frequenz_e_coli bleibt (Ablösung m1200_1-E-3).` },
});

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- M12001-08 (Güteklassen-Zuordnung): the Tab.-7 crop register → strictest class ----
  WS08({
    symbol: 'kulturen_tab7', widget: 'register',
    ui_config: {
      title: 'Bewässerte Kulturen / Flächen nach Tab. 7', subtitle: 'je Kultur- bzw. Flächenart die gedruckte Tab.-7-Zeile (Güteklasse) wählen — die strengste Klasse gilt (Tab. 4 Anm. (*))', add_label: '+ Kultur', placement: 'section',
      columns: [
        { key: 'label', label: 'Kultur / Fläche', type: 'text', required: true },
        { key: 'klasse_sub', label: 'Tab.-7-Zeile (Güteklasse)', type: 'lookup_key', required: true, lookup: { table_code: 'TAB7_CLASS' } },
        { key: 'methode', label: 'Bewässerungsmethode (Tab. 7)', type: 'lookup_value', lookup: { table_code: 'TAB7_CLASS', key_column: 'klasse_sub', value: 'methode' } },
        { key: 'karenzzeit', label: 'Karenzzeit (Tab. 7)', type: 'lookup_value', lookup: { table_code: 'TAB7_CLASS', key_column: 'klasse_sub', value: 'karenzzeit_text' } },
        { key: 'laktierend', label: 'Beweidung durch laktierendes Vieh', type: 'boolean' },
        { key: 'klasse_rank', label: 'Rang (1 = A strengste)', type: 'derived', expr: "lookup('TAB7_CLASS', klasse_sub, 'rank')", display: 'badge', value_labels: { '1': 'A', '2': 'B-1', '3': 'B-2', '4': 'C-1', '5': 'C-2', '6': 'D' } },
        { key: 'laktierend_konflikt', label: 'laktierend', type: 'derived', expr: "if(laktierend == true AND lookup('TAB7_CLASS', klasse_sub, 'laktierend_ausgeschlossen') == true, 1, 0)", display: 'badge', value_labels: { '1': 'Güteklasse C: Beweidung durch laktierendes Vieh ausgeschlossen', '0': '' } },
      ],
      footer: ['gueteklasse_code'],
      note: Q_L918,
    },
    verification_quote: `${Q_L918} — ${Q_L975}`,
    create: { section_code: 'B', label_de: 'Bewässerte Kulturen / Flächen (Tab. 7 → strengste Güteklasse)', data_type: 'json', unit: null, clause_reference: '§5.2, Tab. 7; Tab. 4 Anm. (*)',
      description: 'Plan 3: Zeilen je bewässerter Kultur-/Flächenart mit der gewählten Tab.-7-Zeile (TAB7_CLASS: Methode, Karenzzeit, Emitterabstand, laktierendes Vieh); min_rows(rank) → gueteklasse_code (M12001-08-D1); die 12 Ja/Nein-Fragen bleiben (Zuordnung zu Tab.-7-Zeilen m1200_1-J-1); Ableitung des manuellen gueteklasse_zugeordnet STAGED (m1200_1-D-2).' },
  }),
  WS08({ symbol: 'gueteklasse_code', widget: 'derived', ui_config: null, verification_quote: Q_L918,
    create: { section_code: 'D', label_de: 'Strengste Güteklasse aus den Kultur-Zeilen als Rang (1 = A · 2 = B-1 · 3 = B-2 · 4 = C-1 · 5 = C-2 · 6 = D)', data_type: 'number', unit: null, clause_reference: '§5.2, Tab. 4 Anm. (*)',
      description: 'Plan 3: Ausgabe der Gleichung M12001-08-D1 (min_rows über kulturen_tab7 nach TAB7_CLASS.rank — die strengste Kategorie gilt); Übernahme in gueteklasse_zugeordnet STAGED (m1200_1-D-2), CR-003 STAGED (m1200_1-G-9).' } }),

  // ---- M12001-07 (Risikobewertung): Arbeitshilfe C rows with the Tab.-23 matrix per row ----
  WS07({
    symbol: 'risiko_zeilen', widget: 'register',
    ui_config: {
      title: 'Risikobewertung (Arbeitshilfe C)', subtitle: 'Tab. 24/25 — je Gefahr × Schutzgut eine Zeile; Ausgangs- und Restrisiko nach Tab. 23', add_label: '+ Zeile', placement: 'section',
      columns: [
        { key: 'gefahr', label: 'Gefahr', type: 'enum', required: true, options: [...GEFAHR_TOKENS], option_labels: GEFAHR_LABELS },
        { key: 'schutzgut', label: 'Schutzgut (Tab. 18)', type: 'lookup_key', required: true, lookup: { table_code: 'TAB18' } },
        { key: 'expositionsweg', label: 'Expositionsweg', type: 'lookup_value', lookup: { table_code: 'TAB18', key_column: 'schutzgut', value: 'expositionsweg' } },
        { key: 'exposition', label: 'Bewertung der Exposition (Arbeitshilfe B)', type: 'enum', required: true, options: [...EXPOSITION_TOKENS], option_labels: EXPOSITION_LABELS },
        { key: 'schadensausmass', label: 'Schadensausmaß (Tab. 22)', type: 'enum', required: true, ...ENUM_S },
        { key: 'erwaegung_schaden', label: 'Erwägungsgründe (Schaden)', type: 'text' },
        { key: 'wahrscheinlichkeit', label: 'Wahrscheinlichkeit (Tab. 21)', type: 'enum', required: true, ...ENUM_W },
        { key: 'erwaegung_wahrsch', label: 'Erwägungsgründe (Wahrscheinlichkeit)', type: 'text' },
        { key: 'ausgangsrisiko', label: 'Ausgangsrisiko (Tab. 23)', type: 'derived', expr: "lookup('TAB23', wahrscheinlichkeit, schadensausmass, 'risikoniveau')", value_labels: RISIKONIVEAU_LABELS },
        { key: 'ausgangsrisiko_code', label: 'Ausgangsrisiko-Code', type: 'derived', expr: "lookup('TAB23', wahrscheinlichkeit, schadensausmass, 'risikoniveau_code')", display: 'badge', value_labels: CODE_LABELS },
        { key: 'massnahmen', label: 'Vorsorgemaßnahmen', type: 'text', required: true, visible_when: MODERAT },
        { key: 'rest_schaden', label: 'Restrisiko: Schadensmaß', type: 'enum', required: true, visible_when: MODERAT, ...ENUM_S },
        { key: 'rest_wahrsch', label: 'Restrisiko: Wahrscheinlichkeit', type: 'enum', required: true, visible_when: MODERAT, ...ENUM_W },
        { key: 'restrisiko_code', label: 'Restrisiko', type: 'derived', expr: "if(ausgangsrisiko_code >= 3, lookup('TAB23', rest_wahrsch, rest_schaden, 'risikoniveau_code'), ausgangsrisiko_code)", display: 'badge', value_labels: CODE_LABELS },
      ],
      footer: ['ausgangsrisiko_max_code', 'restrisiko_max_code'],
      note: Q_L2061,
    },
    verification_quote: `${Q_L2073} — ${Q_L2075} — ${Q_L2077} — ${Q_L2061}`,
    create: { section_code: 'B', label_de: 'Risikobewertung je Gefahr × Schutzgut (Arbeitshilfe C, Tab. 24/25)', data_type: 'json', unit: null, clause_reference: '§6.3.5, Tab. 24, Tab. 25; §6.3.4, Tab. 23',
      description: 'Plan 3: Zeilen je Gefahr (Arbeitsblatt) × Schutzgut (TAB18) mit Schadensausmaß / Wahrscheinlichkeit (prod-Token) und Erwägungsgründen; Ausgangsrisiko je Zeile aus TAB23; ab "moderat" (Code ≥ 3, L2061) Vorsorgemaßnahmen + Restrisiko-Bewertung; max_rows → ausgangsrisiko_max_code (M12001-07-D2) / restrisiko_max_code (M12001-07-D1); löst die Skalare eintrittswahrscheinlichkeit / schadensausmass / risikoniveau_ausgangs / restrisiko_niveau ab (EQ-001 m1200_1-R-1, m1200_1-D-1); CR-014 auf restrisiko_max_code <= 2 STAGED (m1200_1-G-5).' },
  }),
  WS07({ symbol: 'ausgangsrisiko_max_code', widget: 'derived', ui_config: null, verification_quote: `${Q_L2042} — ${Q_L2044}`,
    create: { section_code: 'D', label_de: 'Höchstes Ausgangsrisiko über die Zeilen als Code (1 = Sehr niedrig … 5 = Sehr hoch)', data_type: 'number', unit: null, clause_reference: '§6.3.4, Tab. 23',
      description: 'Plan 3: Ausgabe der Gleichung M12001-07-D2 (max_rows über risiko_zeilen nach TAB23.risikoniveau_code).' } }),
  WS07({ symbol: 'restrisiko_max_code', widget: 'derived', ui_config: null, verification_quote: Q_L2061,
    create: { section_code: 'D', label_de: 'Höchstes Restrisiko über die Zeilen als Code (1 = Sehr niedrig … 5 = Sehr hoch; Ziel ≤ 2)', data_type: 'number', unit: null, clause_reference: '§6.3.4; §6.3.5',
      description: 'Plan 3: Ausgabe der Gleichung M12001-07-D1 (max_rows über risiko_zeilen nach restrisiko_code); "auf ein sehr niedriges oder niedriges Risikoniveau reduziert" (L2061) = Code ≤ 2; Übernahme in restrisiko_niveau / CR-014 STAGED (m1200_1-D-1 / -G-5).' } }),

  // ---- M12001-14 (Störfallmanagement): Arbeitshilfe D rows ----
  WS14({
    symbol: 'stoerfaelle', widget: 'register',
    ui_config: {
      title: 'Störfälle und gefährliche Ereignisse (Arbeitshilfe D)', subtitle: 'Tab. 26 — je Teilelement / Teilprozess ein Ereignis mit Ausgangsrisiko nach Tab. 23', add_label: '+ Ereignis', placement: 'section',
      columns: [
        { key: 'teilelement', label: 'Teilelement des Systems', type: 'text', required: true, placeholder: 'z. B. EZ-1, Abw-1, AWT-1, S-1, BW-1 (Tab. 26)' },
        { key: 'teilprozess', label: 'Teilprozess', type: 'text' },
        { key: 'ereignis', label: 'Auslöser / Ereignis', type: 'text', required: true },
        { key: 'gefaehrdung', label: 'Art der Gefährdung', type: 'text' },
        { key: 'schadensausmass', label: 'Schadensmaß (Tab. 22)', type: 'enum', required: true, ...ENUM_S },
        { key: 'erwaegung_schaden', label: 'Erwägungsgründe (Schaden)', type: 'text' },
        { key: 'wahrscheinlichkeit', label: 'Wahrscheinlichkeit (Tab. 21)', type: 'enum', required: true, ...ENUM_W },
        { key: 'erwaegung_wahrsch', label: 'Erwägungsgründe (Wahrscheinlichkeit)', type: 'text' },
        { key: 'risiko', label: 'Risiko (Tab. 23)', type: 'derived', expr: "lookup('TAB23', wahrscheinlichkeit, schadensausmass, 'risikoniveau')", value_labels: RISIKONIVEAU_LABELS },
        { key: 'risiko_code', label: 'Risiko-Code', type: 'derived', expr: "lookup('TAB23', wahrscheinlichkeit, schadensausmass, 'risikoniveau_code')", display: 'badge', value_labels: CODE_LABELS },
      ],
      footer: ['stoerfall_max_code'],
      note: Q_L2119,
    },
    verification_quote: `${Q_L1986} — ${Q_L2123} — ${Q_L2129} — ${Q_L2119}`,
    create: { section_code: 'B', label_de: 'Störfälle und gefährliche Ereignisse (Arbeitshilfe D, Tab. 26)', data_type: 'json', unit: null, clause_reference: '§6.3.3, Tab. 20, Tab. 26',
      description: 'Plan 3: Zeilen je Ereignis (Teilelement, Teilprozess, Auslöser, Art der Gefährdung als Freitext — Tab. 26 druckt keine Liste, m1200_1-J-3; Schadensmaß / Wahrscheinlichkeit als prod-Token); Risiko je Zeile aus TAB23; max_rows → stoerfall_max_code (M12001-14-D1).' },
  }),
  WS14({ symbol: 'stoerfall_max_code', widget: 'derived', ui_config: null, verification_quote: Q_L2123,
    create: { section_code: 'D', label_de: 'Höchstes Störfall-Risiko über die Zeilen als Code (1 = Sehr niedrig … 5 = Sehr hoch)', data_type: 'number', unit: null, clause_reference: '§6.3.3, Tab. 26; §6.3.4, Tab. 23',
      description: 'Plan 3: Ausgabe der Gleichung M12001-14-D1 (max_rows über stoerfaelle nach TAB23.risikoniveau_code).' } }),

  // ---- M12001-16 (Aufbringungserlaubnis): the Flächenverzeichnis ----
  WS16({
    symbol: 'flaechenverzeichnis', widget: 'register',
    ui_config: {
      title: 'Flächenverzeichnis der zu bewässernden Flächen', subtitle: 'Art. 6 Abs. 3 EU-WasserWVVO / §7.4 — je Fläche Kultur, Güteklasse (Tab.-7-Zeile), Bewässerungsmethode und -menge', add_label: '+ Fläche', placement: 'section',
      columns: [
        { key: 'flaeche', label: 'Fläche (Bezeichnung / Flurstück)', type: 'text', required: true },
        { key: 'flaeche_ha', label: 'Größe', type: 'number', unit: 'ha', min: 0, aria_label: 'Flächengröße in Hektar' },
        { key: 'kultur', label: 'Kultur / Nutzung', type: 'text', required: true },
        { key: 'klasse_sub', label: 'Güteklasse (Tab.-7-Zeile)', type: 'lookup_key', required: true, lookup: { table_code: 'TAB7_CLASS' } },
        { key: 'methode_zulaessig', label: 'Zulässige Methode (Tab. 7)', type: 'lookup_value', lookup: { table_code: 'TAB7_CLASS', key_column: 'klasse_sub', value: 'methode' } },
        { key: 'methode', label: 'Geplante Bewässerungsmethode', type: 'text', required: true },
        { key: 'menge_m3', label: 'Bewässerungsmenge (Jahr)', type: 'number', unit: 'm³/a', required: true, min: 0, aria_label: 'jährliche Bewässerungsmenge' },
        { key: 'karenzzeit', label: 'Karenzzeit (Tab. 7)', type: 'lookup_value', lookup: { table_code: 'TAB7_CLASS', key_column: 'klasse_sub', value: 'karenzzeit_text' } },
      ],
      footer: ['anwendungsbereich_count_calc', 'zusatzwasserbedarf_jahr_calc'],
      note: Q_L2548,
    },
    verification_quote: `${Q_L2465} — ${Q_L2548}`,
    create: { section_code: 'B', label_de: 'Flächenverzeichnis (Flächen, Kulturen, Güteklasse, Bewässerungsmenge und -methode)', data_type: 'json', unit: null, clause_reference: '§7.3 (Art. 6 Abs. 3 EU-WasserWVVO); §7.4',
      description: 'Plan 3: Zeilen je zu bewässernder Fläche (CR-015 "Flächenverzeichnis, Kulturen, Güteklasse, Bewässerungsmenge und -methode"); count_rows → anwendungsbereich_count_calc (M12001-16-D1), Σ Menge → zusatzwasserbedarf_jahr_calc (M12001-16-D2); Ablösung von flaechenverzeichnis_vorhanden / anwendungsbereich_count / zusatzwasserbedarf_jahr STAGED (m1200_1-C-2 / -G-8).' },
  }),
  WS16({ symbol: 'anwendungsbereich_count_calc', widget: 'derived', ui_config: null, verification_quote: Q_L2465,
    create: { section_code: 'D', label_de: 'Anzahl vollständiger Flächen im Flächenverzeichnis', data_type: 'number', unit: null, clause_reference: '§7.3 (Art. 6 Abs. 3 EU-WasserWVVO)',
      description: 'Plan 3: Ausgabe der Gleichung M12001-16-D1 (count_rows über flaechenverzeichnis); ersetzt das manuell getippte anwendungsbereich_count (M12001-08) — STAGED (m1200_1-C-2).' } }),
  WS16({ symbol: 'zusatzwasserbedarf_jahr_calc', widget: 'derived', ui_config: null, verification_quote: `${Q_L2465} — ${Q_L2553}`,
    create: { section_code: 'D', label_de: 'Σ Bewässerungsmenge über das Flächenverzeichnis (geschätzte jährliche Menge)', data_type: 'number', unit: 'm³/a', clause_reference: '§7.3 (Art. 6 Abs. 3 EU-WasserWVVO); §7.4',
      description: 'Plan 3: Ausgabe der Gleichung M12001-16-D2 (sum_rows über flaechenverzeichnis.menge_m3 — Text-Ableitung ohne gedruckte Formel, m1200_1-F-1); Übernahme als zusatzwasserbedarf_jahr (M12001-03) STAGED (m1200_1-C-2).' } }),

  // ---- M12001-09 (Mindestanforderungen Tab. 8): limits / targets keyed on the class, note-f ceilings, the routine-sample register ----
  tab8Fill('e_coli_limit', 'e_coli_max', 'E. coli — Grenzwert', 'KBE/100 ml', `${Q_T8_A} — ${Q_T8_D}`, 'A ≤ 10 · B/C ≤ 100 · D ≤ 10.000', null, '; CR-004 auf e_coli_value <= e_coli_limit STAGED (m1200_1-G-3)'),
  tab8Fill('enterokokken_limit', 'enterokokken_max', 'Intestinale Enterokokken — Grenzwert', 'KBE/100 ml', `${Q_T8_A} — ${Q_T8_B} — ${Q_T8_C}`, 'A/B ≤ 100 · C ≤ 400 · D –'),
  tab8Fill('bsb5_limit', 'bsb5_max', 'BSB5 — Grenzwert', 'mg/l', `${Q_T8_A} — ${Q_L1217}`, 'A ≤ 10; B/C gemäß Richtlinie 91/271/EWG', null, '; Anm. d): bei TOC-Messung mit nachgewiesener Korrelation entfällt die BSB5-Bestimmung (toc_korrelation_nachgewiesen, m1200_1-P-1 / -G-2)'),
  tab8Fill('afs_limit', 'afs_max', 'AFS — Grenzwert', 'mg/l', `${Q_T8_A} — ${Q_L1218}`, 'A…C ≤ 10', null, '; Anm. e): bei kontinuierlicher Trübungsüberwachung nicht zusätzlich erforderlich (truebung_kontinuierlich_ueberwacht, m1200_1-P-1)'),
  tab8Fill('truebung_limit', 'truebung_max', 'Trübung — Grenzwert', 'NTU', `${Q_T8_A} — ${Q_L1139}`, 'A…C ≤ 2'),
  tab8Fill('legionella_limit', 'legionella_max', 'Legionella spp. — Grenzwert (strikt "<")', 'KBE/l', Q_T8_A, '< 1.000, wenn das Risiko der Aerosolbildung besteht', AEROSOL, '; nur bei Aerosolrisiko (aerosolrisiko = ja) sichtbar — die bestehende Eingabe legionella_value bleibt immer sichtbar (m1200_1-C-3)'),
  tab8Fill('nematoden_limit', 'nematoden_max', 'Intestinale Nematoden — Grenzwert', 'Eier/l', Q_T8_A, '≤ 1 Ei pro Liter für Weideflächen oder Futterpflanzen', WEIDE, '; nur bei Weide-/Futterpflanzenbewässerung sichtbar — nematoden_value bleibt immer sichtbar (m1200_1-C-3)'),
  tab8Fill('log10_e_coli_ziel', 'log10_e_coli', 'Leistungsziel log10-Reduktion E. coli', 'log10', `${Q_L1135} — ${Q_T8_A}`, 'A / B-1 / C-1 ≥ 5,0', LEISTUNGSZIELE, '; CR-006 auf die Leistungsziele STAGED (m1200_1-G-4)'),
  tab8Fill('log10_somatische_coliphagen_ziel', 'log10_somatische_coliphagen', 'Leistungsziel log10-Reduktion somatische Coliphagen', 'log10', `${Q_L1135} — ${Q_T8_A}`, 'A / B-1 / C-1 ≥ 6,0', LEISTUNGSZIELE, '; CR-006 STAGED (m1200_1-G-4)'),
  tab8Fill('log10_f_coliphagen_ziel', 'log10_f_coliphagen', 'Leistungsziel log10-Reduktion f-spezifische Coliphagen', 'log10', `${Q_L1135} — ${Q_T8_A}`, 'A / B-1 / C-1 ≥ 6,0', LEISTUNGSZIELE, '; CR-006 STAGED (m1200_1-G-4)'),
  tab8Fill('log10_clostridium_ziel', 'log10_clostridium', 'Leistungsziel log10-Reduktion Clostridium-perfringens-Sporen', 'log10', `${Q_L1135} — ${Q_T8_A}`, 'A / B-1 / C-1 ≥ 4,0', LEISTUNGSZIELE, '; CR-006 STAGED (m1200_1-G-4)'),
  tab8Fill('log10_sulfatreduzierer_ziel', 'log10_sulfatreduzierer', 'Leistungsziel log10-Reduktion sulfatreduzierende Sporenbildner', 'log10', `${Q_L1135} — ${Q_T8_A}`, 'A / B-1 / C-1 ≥ 5,0', LEISTUNGSZIELE, '; die Tabellenzelle druckt "25，0" / "？5，0" — 5,0 nach L1135 (m1200_1-U-3); CR-006 STAGED (m1200_1-G-4)'),
  tab8Fill('validierung_min_share_pct', 'validierung_pass_share_pct', 'Mindestanteil der Validierungsproben, die die Leistungsziele erreichen', '%', `${Q_L1215} — ${Q_L1147}`, 'A 90 % · B-1 / C-1 50 %', LEISTUNGSZIELE, '; Vergleichswert für validierungs_compliance_pct (M12001-12, m1200_1-C-3); CR-006 STAGED (m1200_1-G-4)'),
  tab8Fill('routine_min_share_pct', 'routine_pass_share_pct', 'Mindestanteil der Routineproben, die die Werte einhalten', '%', `${Q_L1143} — ${Q_L1145}`, '90 % für jede Klasse', null, '; CR-008 auf compliance_quote_calc >= routine_min_share_pct STAGED (m1200_1-G-7)'),
  ...(['truebung_avg_limit', 'truebung_5pct_limit', 'truebung_never_limit'] as const).map((symbol, i) => {
    const value = ['ntu_avg_24h', 'ntu_5pct', 'ntu_never'][i];
    const label = ['Trübung — Durchschnittswert innerhalb 24 h', 'Trübung — in mehr als 5 % der Zeit (24 h) nicht zu überschreiten', 'Trübung — zu keiner Zeit zu überschreiten'][i];
    const printed = ['Polstoff/Mikrosieb/Raumfilter 2 NTU · Membran –', 'Polstoff/Mikrosieb/Raumfilter 5 NTU · Membran 0,2 NTU', 'Polstoff/Mikrosieb/Raumfilter 10 NTU · Membran 0,5 NTU'][i];
    return WS09({
      symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 8 Anm. f)' },
      lookup: { table_code: 'TAB8_NOTE_F', role: 'limit', keys: [{ column: 'filtration_typ', from_symbol: 'filtration_typ' }], value },
      verification_quote: `${Q_L1219} — ${Q_L1220}`,
      create: { section_code: 'B', label_de: `${label} — Tab. 8 Anm. f) (${printed})`, data_type: 'number', unit: 'NTU', clause_reference: '§5.2, Tab. 8 Anm. f)',
        description: `Plan 3: Wert aus TAB8_NOTE_F zum gewählten Filtrationsverfahren (filtration_typ von M12001-10; anhaltswert — "sollten … nicht überschreiten"); Token-Zuordnung membran + vier Membranverfahren m1200_1-E-2; truebung_max_value bleibt manuell (m1200_1-C-3).` },
    });
  }),
  WS09({ symbol: 'toc_korrelation_nachgewiesen', widget: 'attestation', ui_config: null, verification_quote: Q_L1217,
    create: { section_code: 'B', label_de: 'TOC-Messung mit nachgewiesener BSB5/TOC-Korrelation (Tab. 8 Anm. d) — BSB5-Bestimmung entfällt', data_type: 'boolean', unit: null, clause_reference: '§5.2, Tab. 8 Anm. d)',
      description: 'Plan 3: dokumentierte Substitution nach Anm. d) (m1200_1-P-1); die Ausblendung / Optionalität von bsb5_value dazu ist STAGED (m1200_1-G-2, konsumiertes Feld).' } }),
  WS09({ symbol: 'truebung_kontinuierlich_ueberwacht', widget: 'attestation', ui_config: null, verification_quote: Q_L1218,
    create: { section_code: 'B', label_de: 'Trübung kontinuierlich überwacht und eingehalten (Tab. 8 Anm. e) — AFS-Messung nicht zusätzlich erforderlich', data_type: 'boolean', unit: null, clause_reference: '§5.2, Tab. 8 Anm. e)',
      description: 'Plan 3: dokumentierte Substitution nach Anm. e) (m1200_1-P-1); die Optionalität von afs_value dazu ist STAGED (m1200_1-G-2, konsumiertes Feld).' } }),
  WS09({
    symbol: 'routineproben', widget: 'register',
    ui_config: {
      title: 'Routineproben (Stelle der Einhaltung)', subtitle: '§5.2 / §6.6.2 — je Probe Datum, Parameter und Messwert; Vergleich mit dem Tab.-8-Grenzwert der Klasse (Legionella strikt "<", sonst "≤"); Proben ohne Grenzwert zählen nicht', add_label: '+ Probe', placement: 'section',
      columns: [
        { key: 'date', label: 'Datum', type: 'date', required: true },
        { key: 'parameter', label: 'Parameter', type: 'enum', required: true, options: [...PROBE_PARAMETER_TOKENS], option_labels: PROBE_PARAMETER_LABELS, discriminator: true },
        { key: 'wert', label: 'Messwert', type: 'number', required: true, min: 0, aria_label: 'Messwert der Probe' },
        { key: 'limit', label: 'Grenzwert (Tab. 8)', type: 'derived', expr: "if(parameter == 'e_coli', e_coli_limit, if(parameter == 'enterokokken', enterokokken_limit, if(parameter == 'bsb5', bsb5_limit, if(parameter == 'afs', afs_limit, if(parameter == 'truebung', truebung_limit, if(parameter == 'legionella', legionella_limit, nematoden_limit))))))" },
        { key: 'relevant', label: 'Grenzwert vorhanden', type: 'derived', expr: 'if(limit IS NULL, 0, 1)', display: 'badge', value_labels: { '1': '', '0': 'kein Grenzwert für diese Klasse' } },
        { key: 'ok', label: 'eingehalten', type: 'derived', expr: "if(limit IS NULL, 0, if(parameter == 'legionella', if(wert < limit, 1, 0), if(wert <= limit, 1, 0)))", display: 'badge', value_labels: { '1': 'eingehalten', '0': 'überschritten' } },
      ],
      footer: ['compliance_quote_calc'],
      note: Q_L1143,
    },
    verification_quote: `${Q_L1143} — ${Q_L1145} — ${Q_L2372}`,
    create: { section_code: 'B', label_de: 'Routineproben (Datum, Parameter, Messwert → Einhaltung des Tab.-8-Werts)', data_type: 'json', unit: null, clause_reference: '§5.2; §6.6.2',
      description: 'Plan 3: Zeilen je Routineprobe; Grenzwert je Zeile aus den Tab.-8-Feldern dieses Arbeitsblatts (e_coli_limit … nematoden_limit, Zeilen-Scope); Anteil eingehaltener Proben → compliance_quote_calc (M12001-09-D1); ersetzt das manuell getippte compliance_quote_pct (M12001-12) — STAGED (m1200_1-C-2 / -G-7); die log10-Abweichungsgrenze (L1143) ist nicht kodiert (Residuum).' },
  }),
  WS09({ symbol: 'compliance_quote_calc', widget: 'derived', ui_config: null, verification_quote: `${Q_L1143} — ${Q_L1145}`,
    create: { section_code: 'D', label_de: 'Anteil der Routineproben, die den Tab.-8-Wert einhalten', data_type: 'number', unit: '%', clause_reference: '§5.2',
      description: 'Plan 3: Ausgabe der Gleichung M12001-09-D1 (count_rows(ok == 1) · 100 / count_rows(relevant == 1) über routineproben; 100 = Prozent); Sollwert routine_min_share_pct (90 %); Übernahme als compliance_quote_pct (M12001-12) / CR-008 STAGED (m1200_1-C-2 / -G-7).' } }),
  WS09({ symbol: 'pfas20_limit_ng_l', widget: 'derived', ui_config: null, verification_quote: `${Q_T19} — ${Q_L1955}`,
    create: { section_code: 'D', label_de: 'Summe PFAS-20 — Beurteilungswert (Tab. 19 Kategorie 3: < 100 ng/l = 0,10 µg/l)', data_type: 'number', unit: 'ng/l', clause_reference: '§6.3.3, Tab. 19; §5.2',
      description: 'Plan 3: Ausgabe der Gleichung M12001-09-D2 (lookup TAB19 Kategorie 3, grenzwert_ng_l); CR-013 (pfas20_value < 100) vergleicht gegen die gedruckte 100 — Umstellung auf dieses Symbol STAGED (m1200_1-G-6).' } }),

  // ---- M12001-12 (Routineüberwachung): Tab. 27 frequencies per class as text fills ----
  tab27Fill('beprobung_frequenz_e_coli_tab27', 'e_coli', 'E. coli', `${Q_T27_A} — ${Q_T27_B} — ${Q_T27_D}`, null, '; die Klasse-C-Zelle ist im Transkript leer (m1200_1-U-2) — dort bleibt die Auswahl beprobung_frequenz_e_coli maßgeblich'),
  tab27Fill('beprobung_frequenz_enterokokken_tab27', 'enterokokken', 'Intestinale Enterokokken', `${Q_T27_A} — ${Q_T27_C} — ${Q_T27_D}`),
  tab27Fill('beprobung_frequenz_bsb5_tab27', 'bsb5', 'BSB5', `${Q_T27_A} — ${Q_T27_B}`),
  tab27Fill('beprobung_frequenz_afs_tab27', 'afs', 'AFS', `${Q_T27_A} — ${Q_T27_B}`),
  tab27Fill('beprobung_frequenz_truebung_tab27', 'truebung', 'Trübung', Q_T27_A, null, '; für die Klassen C und D druckt Tab. 27 keine Häufigkeit (leere Zelle, m1200_1-U-2)'),
  tab27Fill('beprobung_frequenz_legionella_tab27', 'legionella', 'Legionella spp. (falls zutreffend)', `${Q_T27_A} — ${Q_T8_A}`, AEROSOL, '; nur bei Aerosolrisiko sichtbar (Tab. 8: "wenn das Risiko der Aerosolbildung besteht")'),
  tab27Fill('beprobung_frequenz_nematoden_tab27', 'nematoden', 'Intestinale Nematoden', `${Q_T27_A} — ${Q_T8_A}`, null, '; die Ausblendung nach anwendung_weide_oder_futterpflanzen braucht die Konsumenten-Ergänzung M12001-08 → -12 (m1200_1-C-1)'),

  // ---- M12001-13 (Umweltmonitoring): the §6.6.3 monitoring programme as rows (capture only) ----
  WS13({
    symbol: 'messstellen', widget: 'register',
    ui_config: {
      title: 'Umweltmonitoring-Programm (§6.6.3)', subtitle: 'je Parameter: Matrix, zuständige Partei, Untersuchungsintervall, Ort(e) der Probennahme; Vorbelastung und Messwert; Vorsorgewert nach BBodSchV nur als Verweis (externes Recht)', add_label: '+ Parameter', placement: 'section',
      columns: [
        { key: 'parameter', label: 'Parameter', type: 'text', required: true },
        { key: 'matrix', label: 'Matrix', type: 'enum', required: true, options: [...MATRIX_TOKENS], option_labels: MATRIX_LABELS },
        { key: 'partei', label: 'Zuständige Partei', type: 'text', required: true },
        { key: 'intervall', label: 'Untersuchungsintervall', type: 'text', required: true },
        { key: 'ort', label: 'Ort(e) der Probennahme', type: 'text', required: true },
        { key: 'vorbelastung', label: 'Vorbelastung', type: 'number', aria_label: 'Vorbelastung vor Inbetriebnahme' },
        { key: 'messwert', label: 'Messwert', type: 'number', aria_label: 'aktueller Messwert' },
        { key: 'bbodschv_wert', label: 'Vorsorgewert BBodSchV (Verweis, eigene Eingabe)', type: 'number', aria_label: 'Vorsorgewert nach BBodSchV' },
        { key: 'einheit', label: 'Einheit', type: 'text' },
      ],
      note: frag(Q_L2393_2399, 'Im Risikomanagementplan ist ein Überwachungsprogramm'),
    },
    verification_quote: `${Q_L2393_2399} — ${Q_L2360_2366}`,
    create: { section_code: 'B', label_de: 'Umweltmonitoring-Programm (Parameter, Matrix, Partei, Intervall, Ort)', data_type: 'json', unit: null, clause_reference: '§6.6.3 (KRM 9); §6.6.1',
      description: 'Plan 3: Zeilen je zu untersuchendem Parameter mit den fünf Pflichtangaben aus §6.6.3 (L2395–L2399) plus Vorbelastung / Messwert; der BBodSchV-Vorsorgewert ist externes Recht (Content-Boundary: nur Verweis, eigene Eingabe); die Skalare cd_value … zn_value bleiben (Residuum).' },
  }),
];

/** No section rules for this standard: every B / D section of the driven worksheets holds a consumed producer, and every created field sits inside such a section. */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };

// Cues read for the withheld / staged items (kept as named references so the sign-off blocks and this module cite the same lines):
export const STAGED_CUES = { L1006: Q_L1006, L1053: Q_L1053, L1129: Q_L1129, L1882: Q_L1882, L1913: Q_L1913, L1953: Q_L1953, L1965: Q_L1965, L2010: Q_L2010, L2083: Q_L2083, L2085: Q_L2085, L2101: Q_L2101, L2105: Q_L2105, L2130: Q_L2130, L2378: Q_L2378 };
