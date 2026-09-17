/**
 * FLL-GAR-2023 — Plan 3 Task 7 field configs (registers, selections, lookup_fill,
 * visibility) as DATA for `scripts/regulation-tables/emit-field-configs-sql.ts fll_gar`.
 *
 * Every `verification_quote` is a span lifted verbatim (by line range) from the
 * transcript `Desktop\Supabase data\Guidelines knowledge markdown\
 * FLL-Gewässerabdichtungsrichtlinien.md` — the `Q_*` constants live in
 * `regulation-tables-seed-fll_gar.ts` with their line ranges. Prod facts come
 * from the captured `fll_gar.prior.json` (2026-09-17, read-only): 29 worksheets,
 * every one with the nine coded sections A B C D F J K L M (inputs in C, outputs
 * in D; 28 of 174 fields are orphans — the nine enum-named numbers and two
 * attests on FLL-GAR-10, the Anhang-2 symbols on -22, Q_NOT / r_5_* / A_einzugs-
 * flaeche on -27); 4 equation rows (Anhang 2 Gl. 2a / 2b / 2c on -22, Anhang 1
 * Gl. 1 on -27); 30 compliance rows (REQ-12 … REQ-22 all live on FLL-GAR-10 and
 * read `abdichtungs_art`, which no worksheet inherits — see below). Enum tokens
 * are the captured prod `enum_values` (G-A3: table key strings equal them exactly).
 *
 * THE MASTER SWITCH IS NOT INHERITED TODAY. `abdichtungs_art` (FLL-GAR-09) carries
 * `consumer_worksheets = ["FLL-GAR-10..21"]` — a range string, not a worksheet
 * code; `loadInheritedFields` matches `code = ANY(consumer_worksheets)` exactly,
 * so no material worksheet, nor -04 / -05 / -07 / -22 / -23 / -24, inherits it (the
 * FLL-revision finding FLL-GAR-10 F1-DISCRIMINATOR-MISSING / GAR-04 F2 / GAR-07
 * F-1). The section rules below and every rule / equation keyed on it are
 * therefore INERT (visibility `pending` = visible; equations `manual_required`)
 * until the consumer edit fll_gar-C-1 is ratified — they are emitted now so
 * that ratifying C-1 lights them up without a second migration.
 *
 * UPDATE entries: exactly two — FLL-GAR-16 `nahtbreite_min_mm` (the existing
 * "Mindestnahtbreite" limit, consumed by -15 / -18, re-bound as a lookup_fill on
 * TAB22 from its own two keys — fll_gar-E-2) and FLL-GAR-19 `verzinkung_dicke_um`
 * (`visible_when stahl_typ == 'unlegiert'`, §7.1.3.2; not consumed, no equation
 * on -19). Every other Step-4 target of the brief is a consumed producer
 * (`wassereinwirkungsklasse` / `rissklasse` / `standortklasse` → -15/-16/-17;
 * `anzahl_lagen` → -15) → refused by the guard → fll_gar-C-3 / -C-4 (STAGED); the
 * section C of FLL-GAR-10 / -12 / -14 / -16 holds consumed producers → fll_gar-C-2.
 *
 * Boolean drivers: `gtd_polyolefin_beschichtung` and `polymerbitumen_beschichtung`
 * are prod BOOLEANS; `resolveLookupFill` stringifies them, so TAB16 /
 * TAB22_UEBERLAPPUNG key on 'false' / 'true' (fll_gar-I-1). Booleans never reach
 * `evaluateFormula` (engine-input.ts), so every yes/no driver of a NEW equation is
 * a created enum (`neurissbildung`, `bahn_vorkonfektioniert`, `pe_werkstoff`).
 */
import type { FieldConfigEntry, FieldConfigEnumValue, FieldConfigModule, SectionVisibilityEntry } from './types';
import {
  ABDICHTUNGS_ART_TOKENS, MATERIAL_WORKSHEET, MISCHGUTART_TOKENS, MINERAL_TYP_TOKENS, ANWENDUNGSFALL_CONCRETE_TOKENS, BAUTEIL_TOKENS, AUSFUEHRUNG_TOKENS, BENTONIT_TOKENS, AUFLAST_FUNKTION_TOKENS,
  FUEGEVERFAHREN_TOKENS, BAHN_MATERIAL_TOKENS, PE_BEANSPRUCHUNG_TOKENS, BAUGRUND_GRUPPEN, BAUGRUND_KLASSE_TOKENS, SWK_TOKENS, ABSCHLUSS_ANWENDUNGSFALL_TOKENS,
  tab1AsTable, tab4AsTable, tab12AsTable, tab18RAsTable, tab18SAsTable, tab27AsTable, frag, norm,
  Q_L509_513, Q_L1313_1317, Q_L1367_1368, Q_L1383_1384, Q_L1390_1394, Q_T1_HEAD, Q_L1412_1413, Q_L1415_1418, Q_L1487_1489, Q_L1921_1922, Q_T4_2, Q_T4_3, Q_L1953, Q_L2221_2222, Q_T5_2,
  Q_L2428_2433, Q_T6_LE40, Q_T6_GT40, Q_L2502, Q_T7_HEAD, Q_L2563_2565, Q_T8_HEAD, Q_L2580_2581, Q_L2909_2911, Q_L2915_2916, Q_T12_HEAD, Q_L3106_3107, Q_T13, Q_L3276_3280, Q_T16_HEAD, Q_L3318_3321, Q_L3435_3438,
  Q_L3662_3665, Q_T18_HEAD, Q_T18_W1, Q_T18_W2, Q_T18_W3, Q_T18_R0, Q_T18_R1, Q_T18_R2, Q_T18_R3, Q_T18_S1, Q_T18_S2, Q_L3717_3719, Q_L3765_3766, Q_L4064_4068, Q_L4098_4102, Q_T22_HEAD,
  Q_L4455_4456, Q_L4460_4462, Q_T24_HEAD, Q_L4511_4515, Q_L4531_4534, Q_T25_HEAD, Q_L4817_4819, Q_L5218_5219, Q_L5338_5339, Q_L5416_5423, Q_L5472_5473, Q_L5494_5496, Q_L5703_5710, Q_L5715_5717, Q_L5719_5727, Q_T28_HEAD, Q_L5748, Q_L5749_5753,
  Q_L6462_6467, Q_L6477_6485, Q_L6484,
} from '../regulation-tables-seed-fll_gar';

const STD = 'FLL-GAR-2023';
export { ABDICHTUNGS_ART_TOKENS, MATERIAL_WORKSHEET, MISCHGUTART_TOKENS, MINERAL_TYP_TOKENS, BAUGRUND_KLASSE_TOKENS, SWK_TOKENS };

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS02 = on('FLL-GAR-02'); const WS05 = on('FLL-GAR-05'); const WS07 = on('FLL-GAR-07'); const WS09 = on('FLL-GAR-09'); const WS10 = on('FLL-GAR-10'); const WS11 = on('FLL-GAR-11');
const WS12 = on('FLL-GAR-12'); const WS13 = on('FLL-GAR-13'); const WS14 = on('FLL-GAR-14'); const WS16 = on('FLL-GAR-16'); const WS18 = on('FLL-GAR-18'); const WS19 = on('FLL-GAR-19');
const WS22 = on('FLL-GAR-22'); const WS23 = on('FLL-GAR-23'); const WS24 = on('FLL-GAR-24'); const WS25 = on('FLL-GAR-25'); const WS27 = on('FLL-GAR-27'); const WS28 = on('FLL-GAR-28');
const enumList = (items: Array<[string, string]>): FieldConfigEnumValue[] => items.map(([value, label_de], i) => ({ value, label_de, order_index: i + 1 }));

// ---- drivers / rules (captured prod enums; created enums where a formula needs a yes/no) ----
/** The prod `abdichtungs_art` tokens (FLL-GAR-09) and the four sheet-type materials Tab. 18 applies to (REQ-05 reads the same four). */
export const TAB18_MATERIALS = ['bahn_bitumen', 'bahn_kunststoff_elastomer', 'fluessigkunststoff', 'bahn_pe'] as const;
export const OUT_OF_SCOPE_TOKENS = ['deponie', 'fischerei', 'talsperre', 'wasserstrasse'] as const; // §1.1 L509–L513 ↔ prod gewaesser_type tokens (order_index 90–93)
export const STAHL_UNLEGIERT = "stahl_typ == 'unlegiert'";                                          // FLL-GAR-19 stahl_typ (own field)
export const EIS = 'eisbildung_moeglich == true';                                                    // FLL-GAR-05 eisbildung_moeglich (own boolean; consumed by -23 — the rule sits on the CREATED attestation)
export const PE_PELD = "pe_werkstoff == 'PELD'";                                                     // created select on FLL-GAR-18
export const PE_PEHD = "pe_werkstoff == 'PEHD'";
export const ROLLE_TOKENS = ['schutzlage_unten', 'abdichtung', 'schutzlage_oben', 'auflast'] as const; // §4.7 Regelaufbau (L1487–L1492 + Abb. 3 … — the four function layers)
const ROLLE_LABELS = { schutzlage_unten: 'Schutzlage / -schicht unten', abdichtung: 'Abdichtung', schutzlage_oben: 'Schutzlage / -schicht oben', auflast: 'Auflast' } as const;
export const ZONE_TOKENS = ['sumpf', 'flach', 'tief'] as const;                                      // L1418 "Sumpf-, Flach- und Tiefwasserzone"
const ZONE_LABELS = { sumpf: 'Sumpfzone', flach: 'Flachwasserzone', tief: 'Tiefwasserzone' } as const;
export const PRUEFUNG_TOKENS = ['eignung', 'eigen', 'fremd', 'kontroll'] as const;                   // §5.x.3 / §6.x.3 / §7.x.3 (prod attest label "Nachweis: Sec.5.x.3/6.x.3/7.x.3")
const PRUEFUNG_LABELS = { eignung: 'Eignungsprüfung', eigen: 'Eigenüberwachung', fremd: 'Fremdüberwachung', kontroll: 'Kontrollprüfung' } as const;
const ABDICHTUNGS_ART_LABELS: Record<(typeof ABDICHTUNGS_ART_TOKENS)[number], string> = { // prod label_de (captured)
  mineralisch_ohne_zusatzstoffe: 'Mineralisch ohne Zusatzstoffe', mineralisch_mit_zusatzstoffen: 'Mineralisch mit Zusatzstoffen', mineralisch_hydraulisch: 'Mineralisch mit hydraulischen Bindemitteln', mineralisch_bitumen: 'Mineralisch mit Bitumen (Asphalt)',
  verbundwerkstoff_gtd: 'Verbundwerkstoff (GTD)', bahn_bitumen: 'Bitumenbahnen', bahn_kunststoff_elastomer: 'Kunststoff-/Elastomerbahnen', fluessigkunststoff: 'Fluessigkunststoff', bahn_pe: 'Kunststoffbahnen aus PE', stahl: 'Stahl', alkalisilikat: 'Alkalisilikate', gup: 'Glasfaserverstaerktes Polyester (GUP)',
};
const AF_LABELS = { bauteil_bauwerk: 'Bauteil / Bauwerk', freiflaeche: 'Freifläche', schwimmteich: 'Schwimmteich' } as const; // Tab. 28 column heads L5742
const FV_LABELS = { quellschweissen: 'Quellschweißen', heissluft_heizkeil: 'Heißluftschweißen oder Heizkeilschweißen', heissvulkanisation: 'Heißvulkanisation (Hot Bonding)', heissluft_pbs: 'Heißluftschweißen (EPDM mit PBS)' } as const; // Tab. 22 rows
const MAT_LABELS = Object.fromEntries(BAHN_MATERIAL_TOKENS.map((t) => [t, t === 'EPDM_PBS' ? 'EPDM mit PBS' : t])) as Record<(typeof BAHN_MATERIAL_TOKENS)[number], string>;

/** Row-scope slope limit from Tab. 1 on the (not yet inherited — C-1) worksheet symbol `abdichtungs_art`; flatter = larger m (a138 TAB14 sense). */
export const LIMIT_1M_EXPR = "lookup('TAB1', abdichtungs_art, 'neigung_max_1m')";
export const SLOPE_OK_EXPR = 'if(neigung_1m >= limit_1m, 1, 0)';
/** Tab. 28 row head bands from the printed "≥ 15 / ≥ 10 / ≥ 5 / 0" (L5744–L5747). */
export const HOEHE_BAND_EXPR = "if(hoehe_cm >= 15, 'ge15', if(hoehe_cm >= 10, 'ge10', if(hoehe_cm >= 5, 'ge5', 'zero')))";
export const ZULAESSIG_EXPR = "lookup('TAB28', hoehe_band, anwendungsfall, 'zulaessig')";
export const NAHT_MIN_EXPR = "lookup('TAB22', fuegeverfahren, material, 'nahtbreite_min_mm')";
export const FG_OK_EXPR = "if(rolle == 'schutzlage_oben', if(flaechengewicht_g_m2 >= fg_min, 1, 0), 1)";
export const LAGE_NEIGUNG_EXPR = "if(rolle == 'abdichtung', lookup('TAB1', material, 'neigung_max_1m'), 0)";

/** Tab.-7 fill on FLL-GAR-12 keyed on the own `anwendungsfall_concrete`. */
const tab7Fill = (symbol: string, value: string, label: string, data_type: 'text' | 'number', unit: string | null, printed: string): FieldConfigEntry => WS12({
  symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 7' },
  lookup: { table_code: 'TAB7', role: 'limit', keys: [{ column: 'anwendungsfall', from_symbol: 'anwendungsfall_concrete' }], value },
  verification_quote: `${Q_T7_HEAD} — ${Q_L2502}`,
  create: { section_code: 'C', label_de: `${label} — Soll nach Tab. 7 (${printed})`, data_type, unit, clause_reference: '§5.3.1.1, Tab. 7',
    description: `Plan 3: Wert aus TAB7 zum gewählten anwendungsfall_concrete (locked — L2462 "ist auch der Planung und der statischen Berechnung … zugrunde zu legen"); Vergleichswert ohne Gate (Ausgabe des Betonentwurfs); die Wasserwechselzone (Fußnote 1 "Bei häufig schwankendem Wasserstand") liest fll_gar-J-3.` },
});
/** Tab.-13 fill on FLL-GAR-14 keyed on the own `bentonit_type`. */
const tab13Fill = (symbol: string, value: string, label: string, unit: string, printed: string, existing: string): FieldConfigEntry => WS14({
  symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 13 (Mindestanforderung)' },
  lookup: { table_code: 'TAB13', role: 'limit', keys: [{ column: 'bentonit_typ', from_symbol: 'bentonit_type' }], value },
  verification_quote: `${Q_L3106_3107} — ${Q_T13}`,
  create: { section_code: 'C', label_de: `${label} — Mindestwert Tab. 13 (${printed})`, data_type: 'number', unit, clause_reference: '§5.5.1.1, Tab. 13',
    description: `Plan 3: Wert aus TAB13 zum gewählten bentonit_type (locked — "Mindestanforderungen an die Bentonite", L3106); Vergleichswert für ${existing}; REQ-16 liest die Literale 3600 / 8000 / 24 / 8 weiter (Re-Point STAGED fll_gar-G-8).` },
});

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- FLL-GAR-02 (Anwendungsbereich): the §1.1 in/out partition as a code beside the typed boolean ----
  WS02({ symbol: 'gewaesser_in_scope_code', widget: 'derived', ui_config: null, verification_quote: Q_L509_513,
    create: { section_code: 'D', label_de: 'Gewässer im Geltungsbereich nach §1.1 als Code (1 = im Geltungsbereich · 0 = Deponie / Fischereieinrichtung / Talsperre / Wasserstraße)', data_type: 'number', unit: null, clause_reference: '§1.1',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-02-D1 (gewaesser_type in {deponie, fischerei, talsperre, wasserstrasse} ⇒ 0, sonst 1 — L509–L513 "Die Gewässerabdichtungsrichtlinien gelten nicht für: Deponien; Fischereieinrichtungen; Talsperren und Speicherbecken; Wasserstraßen."); der manuelle Boolean gewaesser_in_scope und REQ-01 bleiben (Ablösung STAGED fll_gar-D-2; FLL-Revision F-02).' } }),

  // ---- FLL-GAR-05 (Einwirkungen): Tab. 18 classes derived beside the manual enums ----
  WS05({ symbol: 'w_klasse_code', widget: 'derived', ui_config: null, verification_quote: `${Q_T18_HEAD} — ${Q_T18_W1} — ${Q_T18_W2} — ${Q_T18_W3}`,
    create: { section_code: 'D', label_de: 'Wassereinwirkungsklasse nach Tab. 18 als Code (1 = W1-B ≤ 5 m · 2 = W2-B ≤ 10 m · 3 = W3-B > 10 m)', data_type: 'number', unit: null, clause_reference: '§6, Tab. 18',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-05-D1 aus fuellhoehe_m (Füllhöhe ≤ 5 m / ≤ 10 m / > 10 m, L3673–L3675); die manuelle wassereinwirkungsklasse bleibt Produzent für -15 / -16 / -17 (Ablösung STAGED fll_gar-D-1).' } }),
  WS05({
    symbol: 'neurissbildung', widget: 'select_one', ui_config: null,
    enum_values: enumList([['ausgeschlossen', frag(Q_T18_R0, 'keine Rissbreitenveränderung')], ['moeglich', frag(Q_T18_R1, 'neu entstehende Risse oder Rissbreitenveränderung', ' bis')]]), // L3677 / L3678
    verification_quote: `${Q_T18_R0} — ${Q_T18_R1}`,
    create: { section_code: 'C', label_de: 'Risse / Rissbreitenveränderung (Tab. 18 Rissklasse)', data_type: 'enum', unit: null, clause_reference: '§6, Tab. 18',
      description: 'Plan 3: Auswahl zwischen R0-B ("keine Rissbreitenveränderung bzw. Neurissbildung", L3677) und den Klassen mit neu entstehenden Risse (L3678–L3688); Eingang der Gleichung FLL-GAR-05-D2 (fll_gar-J-2).' },
  }),
  WS05({ symbol: 'rissbreite_erwartet_mm', widget: 'scalar', ui_config: null, verification_quote: `${Q_T18_R1} — ${Q_T18_R2} — ${Q_T18_R3}`,
    create: { section_code: 'C', label_de: 'Erwartete Rissbreite / Rissbreitenveränderung (0, wenn keine)', data_type: 'number', unit: 'mm', clause_reference: '§6, Tab. 18',
      description: 'Plan 3: Eingang der Gleichung FLL-GAR-05-D2 (R1-B bis max. 0,2 mm · R2-B bis max. 0,5 mm · R3-B bis max. 1,0 mm, L3678–L3688).' } }),
  WS05({ symbol: 'rissversatz_erwartet_mm', widget: 'scalar', ui_config: null, verification_quote: Q_T18_R3,
    create: { section_code: 'C', label_de: 'Erwarteter Rissversatz (0, wenn keiner)', data_type: 'number', unit: 'mm', clause_reference: '§6, Tab. 18',
      description: 'Plan 3: Eingang der Gleichung FLL-GAR-05-D2 (R3-B "Rissversatz bis 0,5 mm", L3688); die Gleichung braucht jede Eingabe (auch 0), da die Engine fehlende Eingaben vor der Auswertung prüft.' } }),
  WS05({ symbol: 'r_klasse_code', widget: 'derived', ui_config: null, verification_quote: `${Q_T18_R0} — ${Q_T18_R1} — ${Q_T18_R2} — ${Q_T18_R3}`,
    create: { section_code: 'D', label_de: 'Rissklasse nach Tab. 18 als Code (0 = R0-B · 1 = R1-B ≤ 0,2 mm · 2 = R2-B ≤ 0,5 mm · 3 = R3-B ≤ 1,0 mm mit Versatz ≤ 0,5 mm · 9 = außerhalb Tab. 18)', data_type: 'number', unit: null, clause_reference: '§6, Tab. 18',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-05-D2 aus neurissbildung, rissbreite_erwartet_mm und rissversatz_erwartet_mm (L3677–L3688); Code 9 = die gedruckten Klassen decken den Wert nicht (> 1,0 mm oder Versatz > 0,5 mm) — kein Klassen-Erfinden (fll_gar-J-2); die manuelle rissklasse bleibt Produzent (Ablösung STAGED fll_gar-D-3).' } }),
  WS05({
    symbol: 'standort_tab18', widget: 'select_one', ui_config: null,
    enum_values: enumList([
      ['aussen_frei', frag(Q_T18_S1, 'Behälter im Außenbereich')],                                             // L3692–L3693
      ['aussen_bauwerk', frag(Q_T18_S2, 'Behälter im Außenbereich', ' sowie')],                               // L3695–L3696
      ['innen', frag(Q_T18_S2, 'Behälter im Innenbereich')],                                                   // L3696
    ]),
    verification_quote: `${Q_T18_S1} — ${Q_T18_S2}`,
    create: { section_code: 'C', label_de: 'Standort des Behälters (Tab. 18)', data_type: 'enum', unit: null, clause_reference: '§6, Tab. 18',
      description: 'Plan 3: die drei gedruckten Standortbeschreibungen der Tab. 18 (S1-B: L3692–L3693; S2-B: L3695–L3696 — zwei Fälle); Eingang der Gleichung FLL-GAR-05-D3.' },
  }),
  WS05({ symbol: 's_klasse_code', widget: 'derived', ui_config: null, verification_quote: `${Q_T18_S1} — ${Q_T18_S2}`,
    create: { section_code: 'D', label_de: 'Standortklasse nach Tab. 18 als Code (1 = S1-B · 2 = S2-B)', data_type: 'number', unit: null, clause_reference: '§6, Tab. 18',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-05-D3 aus standort_tab18 (nicht mit einem Bauwerk verbunden ⇒ S1-B, sonst S2-B — L3692–L3696); die manuelle standortklasse bleibt Produzent (Ablösung STAGED fll_gar-D-4).' } }),
  WS05({ symbol: 'eisdruck_randschutz_vorgesehen', widget: 'attestation', ui_config: null, visible_when: EIS, verification_quote: Q_L1367_1368,
    create: { section_code: 'C', label_de: 'Randbereich (An-/Abschlüsse, Übergänge) vor Eisdruck geschützt', data_type: 'boolean', unit: null, clause_reference: '§4.4',
      description: 'Plan 3: Nachweis-Boolean für REQ-06 (leere Bedingung, requires_attestation — FLL-Revision GAR-04 F1); nur sichtbar bei eisbildung_moeglich = ja (L1367 "Ist eine Eisbildung nicht auszuschließen, ist der Randbereich … ggf. vor Eisdruck zu schützen."); die REQ-06-Bedingung selbst ist STAGED (fll_gar-G-3).' } }),

  // ---- FLL-GAR-07 (Profilierung): slope sections with the Tab.-1 limit per row, the scalar Tab.-1 fill ----
  WS07({
    symbol: 'boeschungsabschnitte', widget: 'register',
    ui_config: {
      title: 'Böschungsabschnitte (Zonen)', subtitle: '§4.5 — je Abschnitt Zone (Sumpf- / Flach- / Tiefwasserzone), Neigung 1:m, Gefälle, Länge; Grenzwert je Zeile aus Tab. 1 zur gewählten Abdichtungsart (m ≥ Tab.-1-m = flacher oder gleich)', add_label: '+ Abschnitt', placement: 'section',
      columns: [
        { key: 'zone', label: 'Zone', type: 'enum', required: true, options: [...ZONE_TOKENS], option_labels: ZONE_LABELS },
        { key: 'neigung_1m', label: 'Neigung 1:m (m)', type: 'number', required: true, min: 0, aria_label: 'Neigungsverhältnis als m der Schreibweise 1:m' },
        { key: 'gefaelle_pct', label: 'Gefälle', type: 'number', unit: '%', min: 0, aria_label: 'Gefälle in Prozent' },
        { key: 'laenge_m', label: 'Länge', type: 'number', unit: 'm', min: 0, aria_label: 'Länge des Böschungsabschnitts' },
        { key: 'limit_1m', label: 'Tab. 1: 1:m mindestens', type: 'derived', expr: LIMIT_1M_EXPR },
        { key: 'ok', label: 'Neigung ≤ Tab. 1', type: 'derived', expr: SLOPE_OK_EXPR, display: 'badge', value_labels: { '1': 'eingehalten', '0': 'steiler als Tab. 1 (Richtwert — rechnerischer Nachweis, L1383)' } },
      ],
      footer: ['boeschung_steilste_1m', 'boeschung_verletzungen'],
      note: norm(Q_L1383_1384),
    },
    verification_quote: `${Q_L1415_1418} — ${Q_T1_HEAD} — ${Q_L1390_1394}`,
    create: { section_code: 'C', label_de: 'Böschungsabschnitte (Zone, Neigung 1:m, Gefälle, Länge → Tab.-1-Grenzwert je Zeile)', data_type: 'json', unit: null, clause_reference: '§4.5, Tab. 1',
      description: 'Plan 3: Zeilen je Böschungsabschnitt (Zonierung L1415–L1418); Grenzwert je Zeile aus TAB1 zur Abdichtungsart (anhaltswert — "Richtwerte", L1391; "entbinden nicht von einer rechnerischen Überprüfung", L1383); abdichtungs_art ist auf -07 erst nach der Konsumenten-Ergänzung lesbar (fll_gar-C-1); steilste Neigung → boeschung_steilste_1m (FLL-GAR-07-D1), Verstöße → boeschung_verletzungen (FLL-GAR-07-D2); REQ-08 (leere Bedingung) STAGED (fll_gar-G-6); die Skalare boeschungsneigung_ratio / gefaelle_percent bleiben (fll_gar-X-2).' },
  }),
  WS07({
    symbol: 'boeschungsneigung_limit', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 1 (Richtwert)' },
    lookup: { table_code: 'TAB1', role: 'limit', keys: [{ column: 'abdichtungs_art', from_symbol: 'abdichtungs_art' }], value: 'neigung_max_1m' },
    verification_quote: `${Q_T1_HEAD} — ${Q_L1390_1394} — ${Q_L1383_1384}`,
    create: { section_code: 'C', label_de: 'Böschungsneigung 1:m mindestens nach Tab. 1 (m; flacher = größer)', data_type: 'number', unit: 'm (1:m)', clause_reference: '§4.5, Tab. 1',
      description: 'Plan 3: Wert aus TAB1 zur Abdichtungsart (anhaltswert — Richtwerte L1391; Scherversuche L1379–L1384); abdichtungs_art wird auf -07 erst nach der Konsumenten-Ergänzung gelesen (fll_gar-C-1 — bis dahin "Schlüssel fehlt"); für mineralisch_bitumen liest Tab. 1 drei Zeilen nach Mischgutart (TAB1_ASPHALT auf -13), für stahl / alkalisilikat / gup druckt Tab. 1 keine Zeile (fll_gar-E-1).' },
  }),
  WS07({ symbol: 'boeschung_steilste_1m', widget: 'derived', ui_config: null, verification_quote: Q_L1415_1418,
    create: { section_code: 'D', label_de: 'Steilste Böschung über die Abschnitte (kleinstes m von 1:m)', data_type: 'number', unit: 'm (1:m)', clause_reference: '§4.5',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-07-D1 (min_rows über boeschungsabschnitte.neigung_1m) — Text-Ableitung ohne gedruckte Formel; Vergleichswert zu boeschungsneigung_limit (Gate STAGED fll_gar-G-6).' } }),
  WS07({ symbol: 'boeschung_verletzungen', widget: 'derived', ui_config: null, verification_quote: `${Q_T1_HEAD} — ${Q_L1383_1384}`,
    create: { section_code: 'D', label_de: 'Böschungsabschnitte steiler als der Tab.-1-Richtwert', data_type: 'number', unit: null, clause_reference: '§4.5, Tab. 1',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-07-D2 (count_rows über boeschungsabschnitte mit ok == 0); unentscheidbar, solange abdichtungs_art auf -07 nicht gelesen wird (fll_gar-C-1); REQ-08 STAGED (fll_gar-G-6).' } }),

  // ---- FLL-GAR-09 (Abdichtungssystem): the sealing build-up as layer rows with Tab. 26 / 27 per row ----
  WS09({
    symbol: 'abdichtungslagen', widget: 'register',
    ui_config: {
      title: 'Abdichtungsaufbau (Lagen)', subtitle: '§4.7 Regelaufbau — Schutzlage unten (Tab. 26 nach Baugrund), Abdichtung (ggf. mehrlagig, Tab. 1), Schutzlage oben (Tab. 27 nach SWK), Auflast', add_label: '+ Lage', placement: 'section',
      columns: [
        { key: 'position', label: 'Position (von unten)', type: 'number', required: true, min: 1 },
        { key: 'rolle', label: 'Rolle', type: 'enum', required: true, options: [...ROLLE_TOKENS], option_labels: ROLLE_LABELS, discriminator: true },
        { key: 'material', label: 'Abdichtungsart (Tab. 1)', type: 'enum', options: [...ABDICHTUNGS_ART_TOKENS], option_labels: ABDICHTUNGS_ART_LABELS, visible_when: "rolle == 'abdichtung'" },
        { key: 'neigung_limit', label: 'Tab. 1: 1:m mindestens', type: 'derived', expr: LAGE_NEIGUNG_EXPR },
        { key: 'dicke_mm', label: 'Dicke', type: 'number', unit: 'mm', required: true, min: 0, aria_label: 'Dicke der Lage in Millimetern' },
        { key: 'flaechengewicht_g_m2', label: 'Flächengewicht', type: 'number', unit: 'g/m²', visible_when: 'rolle IN {schutzlage_unten, schutzlage_oben}', aria_label: 'Flächengewicht der Schutzlage' },
        { key: 'baugrund', label: 'Baugrund DIN 18196 (Tab. 26)', type: 'lookup_key', lookup: { table_code: 'TAB26', group_by: 'group_label' }, visible_when: "rolle == 'schutzlage_unten'" },
        { key: 'sand_min_cm', label: 'Sand min (Tab. 26)', type: 'lookup_value', lookup: { table_code: 'TAB26', key_column: 'baugrund', value: 'sand_min_cm' }, visible_when: "rolle == 'schutzlage_unten'" },
        { key: 'werkstoffe_tab26', label: 'Werkstoffe (Tab. 26)', type: 'lookup_value', lookup: { table_code: 'TAB26', key_column: 'baugrund', value: 'werkstoffe_text' }, visible_when: "rolle == 'schutzlage_unten'" },
        { key: 'swk', label: 'SWK (Tab. 27)', type: 'lookup_key', lookup: { table_code: 'TAB27' }, visible_when: "rolle == 'schutzlage_oben'" },
        { key: 'fg_min', label: 'Flächengewicht min (Tab. 27)', type: 'lookup_value', lookup: { table_code: 'TAB27', key_column: 'swk', value: 'flaechengewicht_min_g_m2' }, visible_when: "rolle == 'schutzlage_oben'" },
        { key: 'fg_ok', label: '≥ Tab. 27', type: 'derived', expr: FG_OK_EXPR, display: 'badge', value_labels: { '1': '', '0': 'Flächengewicht unter der SWK-Mindestanforderung (Tab. 27)' } },
      ],
      footer: ['lagen_gesamtdicke_mm', 'abdichtungslagen_count'],
      note: norm(Q_L1487_1489),
    },
    verification_quote: `${Q_L1487_1489} — ${Q_L3765_3766} — ${Q_L5338_5339} — ${Q_L5416_5423}`,
    create: { section_code: 'C', label_de: 'Abdichtungsaufbau als Lagen (Rolle, Abdichtungsart, Dicke, Flächengewicht; Tab. 26 / Tab. 27 je Zeile)', data_type: 'json', unit: null, clause_reference: '§4.7; §8.3.1, Tab. 26; §8.3.2, Tab. 27',
      description: 'Plan 3: Zeilen je Funktionsschicht (L1487 "Die Art der Abdichtungsstoffe, die Anzahl der Lagen und deren Anordnung"); Abdichtungszeilen mit Tab.-1-Grenzwert, Schutzlage unten mit Sand-Mindestdicke und Werkstoffen aus TAB26 (locked — L5494; Tab. 26 bleibt imported_unverified, fll_gar-U-1), Schutzlage oben mit SWK-Mindestflächengewicht aus TAB27 (locked — L5422); Σ Abdichtungsdicke → lagen_gesamtdicke_mm (FLL-GAR-09-D1), Anzahl Abdichtungslagen → abdichtungslagen_count (FLL-GAR-09-D2; Bitumenbahnen "i. d. R. mehrlagig", L3765 — REQ-17 liest anzahl_lagen weiter, fll_gar-C-4); die Skalare anzahl_lagen / sl_* bleiben (fll_gar-X-3).' },
  }),
  WS09({ symbol: 'lagen_gesamtdicke_mm', widget: 'derived', ui_config: null, verification_quote: Q_L1487_1489,
    create: { section_code: 'D', label_de: 'Σ Dicke der Abdichtungslagen (Rolle Abdichtung)', data_type: 'number', unit: 'mm', clause_reference: '§4.7',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-09-D1 (sum_rows über abdichtungslagen mit rolle == abdichtung) — Text-Ableitung ohne gedruckte Formel; Vergleichswert zu den Nenndicken-Fills der Materialblätter (Tab. 4 / 5 / 8 / 12 / 25).' } }),
  WS09({ symbol: 'abdichtungslagen_count', widget: 'derived', ui_config: null, verification_quote: Q_L3765_3766,
    create: { section_code: 'D', label_de: 'Anzahl der Abdichtungslagen im Aufbau', data_type: 'number', unit: null, clause_reference: '§4.7; §6.1.1.2',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-09-D2 (count_rows über abdichtungslagen mit rolle == abdichtung); Bitumenbahnen "i. d. R. mehrlagig" (L3765) — REQ-17 (anzahl_lagen ≥ 2) bleibt auf dem Skalar (Re-Point STAGED fll_gar-C-4).' } }),

  // ---- FLL-GAR-10 (Mineralisch ohne Zusatzstoffe): Tab. 4 by the created mineral type ----
  WS10({
    symbol: 'mineral_typ', widget: 'select_one', ui_config: null,
    enum_values: enumList(tab4AsTable().rows.map((r) => [r.row_key, r.label_de])), // L1931–L1935 / L1946–L1949 (the printed row labels)
    verification_quote: `${Q_T4_2} — ${Q_T4_3}`,
    create: { section_code: 'C', label_de: 'Abdichtungswerkstoff nach Tab. 4', data_type: 'enum', unit: null, clause_reference: '§5.1.1.2, Tab. 4',
      description: 'Plan 3: die zwei gedruckten Tab.-4-Zeilen (natürlich vorkommende Böden / industriell aufbereitete Böden); Schlüssel der Fills schichtdicke_abdichtung_min / schichtdicke_auflast_min.' },
  }),
  WS10({
    symbol: 'schichtdicke_abdichtung_min', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 4 (Nenndicke)' },
    lookup: { table_code: 'TAB4', role: 'limit', keys: [{ column: 'mineral_typ', from_symbol: 'mineral_typ' }], value: 'abdichtung_min_cm' },
    verification_quote: `${Q_L1921_1922} — ${Q_T4_2} — ${Q_T4_3} — ${Q_L1953}`,
    create: { section_code: 'C', label_de: 'Mindestdicke der Abdichtungsschicht nach Tab. 4 (≥ 30 cm in 2 Lagen · industriell ≥ 10 cm)', data_type: 'number', unit: 'cm', clause_reference: '§5.1.1.2, Tab. 4',
      description: 'Plan 3: Wert aus TAB4 zum gewählten mineral_typ (anhaltswert — Fußnote 1 "Abweichungen von 10% der vorgegebenen Schichtdicken sind zulässig", L1953); Vergleichswert für schichtdicke_abdichtung_cm (Gate STAGED fll_gar-G-11).' },
  }),
  WS10({
    symbol: 'schichtdicke_auflast_min', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 4 (Nenndicke)' },
    lookup: { table_code: 'TAB4', role: 'limit', keys: [{ column: 'mineral_typ', from_symbol: 'mineral_typ' }], value: 'auflast_min_cm' },
    verification_quote: `${Q_L1921_1922} — ${Q_T4_2} — ${Q_T4_3} — ${Q_L1953}`,
    create: { section_code: 'C', label_de: 'Mindestdicke der Auflast/Schutzschicht nach Tab. 4 (≥ 30 cm · industriell ≥ 20 cm)', data_type: 'number', unit: 'cm', clause_reference: '§5.1.1.2, Tab. 4',
      description: 'Plan 3: Wert aus TAB4 zum gewählten mineral_typ (anhaltswert — L1953); Vergleichswert für schichtdicke_auflast_cm (Gate STAGED fll_gar-G-11).' },
  }),

  // ---- FLL-GAR-11 (Mineralisch mit Zusatzstoffen): the single Tab.-5 row as a scalar lookup ----
  WS11({ symbol: 'mz_dicke_min_tab5', widget: 'derived', ui_config: null, verification_quote: `${Q_L2221_2222} — ${Q_T5_2}`,
    create: { section_code: 'D', label_de: 'Mindestdicke der Abdichtungsschicht nach Tab. 5 (≥ 30 cm in 2 Lagen von 15 bis 20 cm)', data_type: 'number', unit: 'cm', clause_reference: '§5.2.1.2, Tab. 5',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-11-D1 (lookup TAB5, die einzige gedruckte Zeile — L2231–L2246; anhaltswert — 10 % Abweichung L2248); Vergleichswert für mz_dicke; skalare Gleichung, nicht materialisiert (Amendment D).' } }),

  // ---- FLL-GAR-12 (Beton): Tab. 7 fills, the Tab.-8 minimum thickness, the Tab.-6 w/z limit ----
  tab7Fill('festigkeitsklasse_soll', 'festigkeitsklasse', 'Festigkeitsklasse', 'text', null, 'C25/30 · Sole / Pflanzenkläranlage C35/45'),
  tab7Fill('expositionsklassen_soll', 'expositionsklassen', 'Expositionsklassen', 'text', null, 'wie gedruckt, z. B. XC4, XF1 (3) 1'),
  tab7Fill('feuchtigkeitsklasse_soll', 'feuchtigkeitsklasse', 'Feuchtigkeitsklasse', 'text', null, 'WF / WA'),
  tab7Fill('c_nom_min', 'c_nom_mm', 'Bewehrungsüberdeckung c nom', 'number', 'mm', '40 mm · Sole 55 mm'),
  WS12({
    symbol: 'bauteildicke_min', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 8 (Mindestdicke)' },
    lookup: { table_code: 'TAB8', role: 'limit', keys: [{ column: 'bauteil', from_symbol: 'bauteil_type' }, { column: 'ausfuehrung', from_symbol: 'beton_ausfuehrungsart' }], value: 'dicke_min_mm' },
    verification_quote: `${Q_L2563_2565} — ${Q_T8_HEAD} — ${Q_L2580_2581}`,
    create: { section_code: 'C', label_de: 'Mindest-Bauteildicke nach Tab. 8 in mm (Wände ≥ 240 / 240¹ / 200 / 240² · Bodenplatte ≥ 250 / – / 200 / 250²)', data_type: 'number', unit: 'mm', clause_reference: '§5.3.1.2, Tab. 8',
      description: 'Plan 3: Wert aus TAB8 zu bauteil_type × beton_ausfuehrungsart (locked — L2565 "Daher gelten die in Tabelle 8 genannten Schichtdicken"); Tab. 8 druckt mm, bauteildicke_cm führt cm (FLL-Revision GAR-12 F2 — Vergleich nur mit Umrechnung); Bodenplatte × Elementwände druckt "-" (kein Wert, GAR-12 F3); Gate STAGED (fll_gar-G-5).' },
  }),
  WS12({ symbol: 'wz_max', widget: 'derived', ui_config: null, verification_quote: `${Q_T6_LE40} — ${Q_T6_GT40}`,
    create: { section_code: 'D', label_de: 'Höchstwert des Wasserzementwerts nach Tab. 6 (≤ 0,60 bei d ≤ 40 cm · ≤ 0,70 bei d > 40 cm)', data_type: 'number', unit: null, clause_reference: '§5.3.1, Tab. 6',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-12-D1 (lookup TAB6 über das Dickenband aus bauteildicke_cm — L2437 / L2440); Zementgehalt ≥ 280 kg/m3 und fck ≥ C25/30 druckt Tab. 6 nur für d ≤ 40 cm; REQ-14 liest die Literale weiter (Re-Point STAGED fll_gar-G-5); skalare Gleichung, nicht materialisiert (Amendment D).' } }),

  // ---- FLL-GAR-13 (Asphalt): Mischgutart → Tab. 12 Nenndicken + the Tab.-1 asphalt slope ----
  WS13({
    symbol: 'mischgutart', widget: 'select_one', ui_config: null,
    enum_values: enumList(tab12AsTable().rows.map((r) => [r.row_key, r.label_de])), // L2920–L2923 (the printed row labels)
    verification_quote: `${Q_T12_HEAD} — ${Q_L2915_2916}`,
    create: { section_code: 'C', label_de: 'Mischgutart (Tab. 12)', data_type: 'enum', unit: null, clause_reference: '§5.4.1.2, Tab. 12',
      description: 'Plan 3: die drei gedruckten Tab.-12-Zeilen (Asphaltmastix / Gussasphalt / wasserdichter Asphaltbeton); Schlüssel der Fills asph_dicke_min / asph_dicke_max / asph_neigung_max_1m; das Freitextfeld asph_bindemittel bleibt.' },
  }),
  WS13({
    symbol: 'asph_dicke_min', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 12 (Nenndicke)' },
    lookup: { table_code: 'TAB12', role: 'limit', keys: [{ column: 'mischgutart', from_symbol: 'mischgutart' }], value: 'dicke_min_mm' },
    verification_quote: `${Q_L2915_2916} — ${Q_T12_HEAD}`,
    create: { section_code: 'C', label_de: 'Mindestdicke nach Tab. 12 in mm (Asphaltmastix 7 · Gussasphalt 25 · Asphaltbeton 40¹)', data_type: 'number', unit: 'mm', clause_reference: '§5.4.1.2, Tab. 12',
      description: 'Plan 3: Wert aus TAB12 zur gewählten mischgutart (locked — L2915 "sind die Nenndicken der Tabelle 12 einzuhalten"); asph_dicke führt cm — Vergleich nur mit Umrechnung; Asphaltbeton gilt als wasserdicht bei ≥ 40 mm UND Hohlraumgehalt ≤ 3 Vol.-% (L2909–L2910; REQ-15 liest den Hohlraumgehalt, Gate auf die Dicke STAGED fll_gar-G-12).' },
  }),
  WS13({
    symbol: 'asph_dicke_max', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 12 (Nenndicke)' },
    lookup: { table_code: 'TAB12', role: 'limit', keys: [{ column: 'mischgutart', from_symbol: 'mischgutart' }], value: 'dicke_max_mm' },
    verification_quote: `${Q_L2915_2916} — ${Q_T12_HEAD}`,
    create: { section_code: 'C', label_de: 'Maximaldicke nach Tab. 12 in mm (Asphaltmastix 15 · Gussasphalt 40² · Asphaltbeton –)', data_type: 'number', unit: 'mm', clause_reference: '§5.4.1.2, Tab. 12',
      description: 'Plan 3: Wert aus TAB12 zur gewählten mischgutart (locked); Gussasphalt 40 mm "Bei einlagigem Einbau" (Fußnote 2, L2925); für Asphaltbeton druckt Tab. 12 "–" (kein Wert).' },
  }),
  WS13({
    symbol: 'asph_neigung_max_1m', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 1 (Richtwert)' },
    lookup: { table_code: 'TAB1_ASPHALT', role: 'limit', keys: [{ column: 'mischgutart', from_symbol: 'mischgutart' }], value: 'neigung_max_1m' },
    verification_quote: `${Q_T1_HEAD} — ${Q_L1390_1394}`,
    create: { section_code: 'C', label_de: 'Böschungsneigung 1:m mindestens nach Tab. 1 für die Mischgutart (Asphaltmastix 3 · Gussasphalt 5 · Asphaltbeton 2)', data_type: 'number', unit: 'm (1:m)', clause_reference: '§4.5, Tab. 1',
      description: 'Plan 3: Wert aus TAB1_ASPHALT (Tab.-1-Zeilen 5–7, L1403–L1405) zur gewählten mischgutart (anhaltswert — Richtwerte L1391); der Tab.-1-Schlüssel abdichtungs_art = mineralisch_bitumen deckt drei gedruckte Zeilen (fll_gar-E-1).' },
  }),

  // ---- FLL-GAR-14 (GTD): Tab. 13 minima, Tab. 16 Auflast, the §5.5.2.1 Größtkorn rule ----
  tab13Fill('bentonit_flaecheneinheit_min', 'mclay_min_g_m2', 'Bentonit-Flächeneinheit Mclay', 'g/m²', 'Na ≥ 3.600 · Ca ≥ 8.000 g/m2', 'bentonit_flaecheneinheit_g_m2'),
  tab13Fill('quellvermoegen_min', 'quellvermoegen_min_ml', 'Quellvermögen', 'ml', 'Na ≥ 24 · Ca ≥ 8 ml', 'quellvermoegen_ml'),
  WS14({
    symbol: 'gtd_auflast_min_m', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 16 (Anhaltswert)' },
    lookup: { table_code: 'TAB16', role: 'limit', keys: [{ column: 'beschichtung', from_symbol: 'gtd_polyolefin_beschichtung' }, { column: 'funktion', from_symbol: 'gtd_auflast_funktion' }], value: 'auflast_min_m' },
    verification_quote: `${Q_L3276_3280} — ${Q_T16_HEAD} — ${Q_L3318_3321}`,
    create: { section_code: 'C', label_de: 'Mindestdicke der Auflast über der GTD nach Tab. 16 (Quellgegendruck ≥ 0,30 m · Austrocknung/Frost ≥ 0,60 m)', data_type: 'number', unit: 'm', clause_reference: '§5.5.1.2, Tab. 16',
      description: 'Plan 3: Wert aus TAB16 zu gtd_polyolefin_beschichtung (Boolean → Schlüssel false/true, fll_gar-I-1) × gtd_auflast_funktion (anhaltswert — "Anhaltswerte" L3279; "Bei Abweichungen … nutzungs- und standortspezifische Gegebenheiten" L3320); mit Beschichtung deckt der prod-Token austrocknung_frost die Frost-Zeile ≥ 0,60 m (fll_gar-J-4); Vergleichswert für schichtdicke_auflast_cm (auf -10, in cm).' },
  }),
  WS14({ symbol: 'ungleichfoermigkeit_u', widget: 'scalar', ui_config: null, verification_quote: Q_L3435_3438,
    create: { section_code: 'C', label_de: 'Ungleichförmigkeitszahl U der Bodenauflast', data_type: 'number', unit: null, clause_reference: '§5.5.2.1',
      description: 'Plan 3: Eingang der Gleichung FLL-GAR-14-D1 (L3438 "Der Größtkorndurchmesser darf 16 mm bzw. 32 mm bei U ≥ 5 nicht überschreiten."); das Gate auf groesstkorn_auflast_mm ist STAGED (fll_gar-G-1).' } }),
  WS14({ symbol: 'groesstkorn_max_mm', widget: 'derived', ui_config: null, verification_quote: Q_L3435_3438,
    create: { section_code: 'D', label_de: 'Zulässiger Größtkorndurchmesser der Auflast (16 mm · 32 mm bei U ≥ 5)', data_type: 'number', unit: 'mm', clause_reference: '§5.5.2.1',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-14-D1 (U ≥ 5 ⇒ 32, sonst 16 — L3438; Text-Ableitung, fll_gar-F-1); Vergleichswert für groesstkorn_auflast_mm (Gate STAGED fll_gar-G-1); skalare Gleichung, nicht materialisiert (Amendment D).' } }),

  // ---- FLL-GAR-16 (Kunststoff-/Elastomerbahnen): the Tab.-22 limit as a fill, the overlap limit, seam rows, the §6.2.1.2 thickness ----
  WS16({
    symbol: 'nahtbreite_min_mm', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 22 (Mindestfügebreite)' },
    lookup: { table_code: 'TAB22', role: 'limit', keys: [{ column: 'fuegeverfahren', from_symbol: 'fuegeverfahren' }, { column: 'material', from_symbol: 'bahn_material_naht' }], value: 'nahtbreite_min_mm' },
    verification_quote: `${Q_L4098_4102} — ${Q_T22_HEAD}`,
  }),
  WS16({
    symbol: 'naht_ueberlappung_min_mm', widget: 'lookup_fill', ui_config: { source_label: '§6.2.2.1 (Mindestbreite der Überlappung)' },
    lookup: { table_code: 'TAB22_UEBERLAPPUNG', role: 'limit', keys: [{ column: 'polymerbitumen', from_symbol: 'polymerbitumen_beschichtung' }], value: 'ueberlappung_min_mm' },
    verification_quote: Q_L4098_4102,
    create: { section_code: 'C', label_de: 'Mindestbreite der Überlappung an Längs-/Quernähten (40 mm · mit Polymerbitumenbeschichtung 60 mm)', data_type: 'number', unit: 'mm', clause_reference: '§6.2.2.1',
      description: 'Plan 3: Wert aus TAB22_UEBERLAPPUNG zu polymerbitumen_beschichtung (Boolean → Schlüssel false/true, fll_gar-I-1; locked — L4098–L4100 "einzuhalten"); Vergleichswert für naht_ueberlappung_kunststoff_mm (Gate STAGED fll_gar-G-10; FLL-Revision GAR16-F1 trennt Überlappung von Fügebreite).' },
  }),
  WS16({
    symbol: 'naehte', widget: 'register',
    ui_config: {
      title: 'Nähte (Tab. 22)', subtitle: '§6.2.2.1 — je Naht Fügeverfahren und Stoffart → Mindestfügebreite aus Tab. 22; Ist-Breite und Prüfergebnis', add_label: '+ Naht', placement: 'section',
      columns: [
        { key: 'label', label: 'Naht', type: 'text', required: true },
        { key: 'fuegeverfahren', label: 'Fügeverfahren', type: 'enum', required: true, options: [...FUEGEVERFAHREN_TOKENS], option_labels: FV_LABELS },
        { key: 'material', label: 'Stoffart', type: 'enum', required: true, options: [...BAHN_MATERIAL_TOKENS], option_labels: MAT_LABELS },
        { key: 'nahtbreite_ist_mm', label: 'Fügebreite vorhanden', type: 'number', unit: 'mm', required: true, min: 0, aria_label: 'vorhandene Fügebreite der Naht' },
        { key: 'nahtbreite_min', label: 'Mindestfügebreite (Tab. 22)', type: 'derived', expr: NAHT_MIN_EXPR },
        { key: 'ok', label: '≥ Tab. 22', type: 'derived', expr: 'if(nahtbreite_ist_mm >= nahtbreite_min, 1, 0)', display: 'badge', value_labels: { '1': 'eingehalten', '0': 'unter der Mindestfügebreite (Tab. 22)' } },
        { key: 'pruefergebnis', label: 'Nahtprüfung (Ergebnis)', type: 'text' },
      ],
      footer: ['naht_verletzungen'],
      note: frag(Q_L4098_4102, 'Je nach Stoffart'),
    },
    verification_quote: `${Q_L4098_4102} — ${Q_T22_HEAD}`,
    create: { section_code: 'C', label_de: 'Nähte (Fügeverfahren, Stoffart, Fügebreite → Mindestfügebreite nach Tab. 22, Prüfergebnis)', data_type: 'json', unit: null, clause_reference: '§6.2.2.1, Tab. 22',
      description: 'Plan 3: Zeilen je Naht; Mindestfügebreite je Zeile aus TAB22 (locked — L4101 "einzuhalten"); eine nicht gedruckte Kombination (z. B. Quellschweißen × ECB) hat keine Zeile und bleibt unentscheidbar; Verstöße → naht_verletzungen (FLL-GAR-16-D1); Gate STAGED (fll_gar-G-10); die Skalare fuegeverfahren / bahn_material_naht / nahtbreite_min_mm bleiben (Konsumenten -15 / -18).' },
  }),
  WS16({ symbol: 'naht_verletzungen', widget: 'derived', ui_config: null, verification_quote: `${Q_L4098_4102} — ${Q_T22_HEAD}`,
    create: { section_code: 'D', label_de: 'Nähte unter der Mindestfügebreite (Tab. 22)', data_type: 'number', unit: null, clause_reference: '§6.2.2.1, Tab. 22',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-16-D1 (count_rows über naehte mit ok == 0; eine Zeile ohne gedruckte Tab.-22-Kombination macht die Zählung unentscheidbar); Gate STAGED (fll_gar-G-10).' } }),
  WS16({
    symbol: 'bahn_vorkonfektioniert', widget: 'select_one', ui_config: null,
    enum_values: enumList([['ja', frag(Q_L4064_4068, 'werkseitig vorkonfektio- nierten Bahnen für gering beanspruchte Nutzungen (z. B. Gartenteiche)')], ['nein', 'nein — Regelfall (Mindestdicke 1,2 mm)']]), // L4064–L4067
    verification_quote: Q_L4064_4068,
    create: { section_code: 'C', label_de: 'Werkseitig vorkonfektionierte Bahn für gering beanspruchte Nutzung (z. B. Gartenteich)', data_type: 'enum', unit: null, clause_reference: '§6.2.1.2',
      description: 'Plan 3: Auswahl (Enum, da Booleans keine Formeleingänge sind) — L4064 "Die Bahnen müssen eine Mindestdicke von 1,2 mm aufweisen. Bei werkseitig vorkonfektionierten Bahnen für gering beanspruchte Nutzungen (z. B. Gartenteiche) sind Bahnendicken ≥ 1,0 mm zulässig."; Eingang der Gleichung FLL-GAR-16-D2; REQ-18 (fest 1,2) STAGED (fll_gar-G-2).' },
  }),
  WS16({ symbol: 'bahnendicke_min_mm', widget: 'derived', ui_config: null, verification_quote: Q_L4064_4068,
    create: { section_code: 'D', label_de: 'Mindestdicke der Bahn nach §6.2.1.2 (1,2 mm · vorkonfektioniert für gering beanspruchte Nutzung 1,0 mm)', data_type: 'number', unit: 'mm', clause_reference: '§6.2.1.2',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-16-D2 (bahn_vorkonfektioniert = ja ⇒ 1,0, sonst 1,2 — L4064–L4067; Text-Ableitung, fll_gar-F-2); Vergleichswert für bahnendicke_mm; REQ-18 STAGED (fll_gar-G-2); skalare Gleichung, nicht materialisiert (Amendment D).' } }),

  // ---- FLL-GAR-18 (PE): the PELD/PEHD select, Tab.-25 fills per material, the §6.4.1.1 rhizome rule, the Tab.-24 check ----
  WS18({
    symbol: 'pe_werkstoff', widget: 'select_one', ui_config: null,
    enum_values: enumList([['PELD', frag(Q_L4455_4456, 'Polyethylen mit geringer Dichte (PELD)', ' und')], ['PEHD', frag(Q_L4455_4456, 'Polyethylen mit hoher Dichte (PEHD)', ' verwendet')]]), // L4455–L4456
    verification_quote: `${Q_L4455_4456} — ${Q_L4511_4515}`,
    create: { section_code: 'C', label_de: 'PE-Werkstoff der Bahn (PELD / PEHD)', data_type: 'enum', unit: null, clause_reference: '§6.4; §6.4.1.1',
      description: 'Plan 3: L4455 "Bahnen aus Polyethylen mit geringer Dichte (PELD) und Polyethylen mit hoher Dichte (PEHD)"; Schlüssel der Sichtbarkeit der Tab.-25-Fills und Eingang der Gleichung FLL-GAR-18-D1 (Rhizomfestigkeitsnachweis: PEHD "kann verzichtet werden", PELD "zu erbringen", L4511–L4515).' },
  }),
  WS18({
    symbol: 'peld_nenndicke_min_mm', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 25 (Nenndicke PELD)' },
    lookup: { table_code: 'TAB25', role: 'limit', keys: [{ column: 'beanspruchung', from_symbol: 'pe_beanspruchung_klasse' }], value: 'peld_min_mm' },
    visible_when: PE_PELD, verification_quote: `${Q_L4531_4534} — ${Q_T25_HEAD}`,
    create: { section_code: 'C', label_de: 'Nenndicke PELD nach Tab. 25 (gering ≥ 0,8 · mittel ≥ 1,5 mm; hoch / freiliegend: kein PELD gedruckt)', data_type: 'number', unit: 'mm', clause_reference: '§6.4.1.2, Tab. 25',
      description: 'Plan 3: Wert aus TAB25 zur pe_beanspruchung_klasse (anhaltswert — "Eine Kategorisierung der projektspezifischen Einwirkungen … obliegt dem Objektplanenden", L4533); nur bei pe_werkstoff = PELD sichtbar; Zeilen ohne PELD-Zelle zeigen "—".' },
  }),
  WS18({
    symbol: 'pehd_nenndicke_min_mm', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 25 (Nenndicke PEHD)' },
    lookup: { table_code: 'TAB25', role: 'limit', keys: [{ column: 'beanspruchung', from_symbol: 'pe_beanspruchung_klasse' }], value: 'pehd_min_mm' },
    visible_when: PE_PEHD, verification_quote: `${Q_L4531_4534} — ${Q_T25_HEAD}`,
    create: { section_code: 'C', label_de: 'Nenndicke PEHD nach Tab. 25 (mittel ≥ 1,0 · hoch ≥ 2,0 · freiliegend ≥ 2,5 mm; gering: kein PEHD gedruckt)', data_type: 'number', unit: 'mm', clause_reference: '§6.4.1.2, Tab. 25',
      description: 'Plan 3: Wert aus TAB25 zur pe_beanspruchung_klasse (anhaltswert — L4533); nur bei pe_werkstoff = PEHD sichtbar; die Zeile "gering" druckt keine PEHD-Zelle ("—").' },
  }),
  WS18({ symbol: 'pe_rhizom_nachweis_code', widget: 'derived', ui_config: null, verification_quote: Q_L4511_4515,
    create: { section_code: 'D', label_de: 'Nachweis der Wurzel-/Rhizomfestigkeit gemäß FLL erforderlich (1 = PELD: zu erbringen · 0 = PEHD: kann verzichtet werden)', data_type: 'number', unit: null, clause_reference: '§6.4.1.1',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-18-D1 aus pe_werkstoff (L4511–L4515); der Boolean wurzel_rhizomfestigkeit_required auf -09 bleibt Produzent (Ablösung STAGED fll_gar-D-5 — die Materialsätze L2486 / L2902 / L3732 / L3924 / L4212 fordern den Nachweis für Beton-Fugen, Asphalt, Bitumen-, Kunststoffbahnen und Flüssigkunststoff); skalare Gleichung, nicht materialisiert.' } }),
  WS18({ symbol: 'pehd_tab24_code', widget: 'derived', ui_config: null, verification_quote: `${Q_L4460_4462} — ${Q_T24_HEAD}`,
    create: { section_code: 'D', label_de: 'Tab.-24-Anforderungen Dichte / MFR / Rußgehalt erfüllt (1 = ja · 0 = nein)', data_type: 'number', unit: null, clause_reference: '§6.4.1, Tab. 24',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-18-D2 (peeh_dichte_g_cm3 > 0,940 AND 1,0 ≤ peeh_mfr ≤ 3,0 AND 2 ≤ peeh_russgehalt_pct ≤ 3 — die TAB24-Zellen L4471 / L4474 / L4476); dieselben drei Werte, die REQ-20 als Literale prüft (Re-Point STAGED fll_gar-G-9); skalare Gleichung, nicht materialisiert.' } }),

  // ---- FLL-GAR-19 (Stahl): galvanisation only for unalloyed steel ----
  WS19({ symbol: 'verzinkung_dicke_um', widget: 'scalar', ui_config: null, visible_when: STAHL_UNLEGIERT, verification_quote: Q_L4817_4819 }),

  // ---- FLL-GAR-22 (Schutzlagen): Baugrund class → Tab. 26, SWK → Tab. 27 ----
  WS22({
    symbol: 'baugrund_klasse_18196', widget: 'select_one', ui_config: null,
    enum_values: enumList(BAUGRUND_GRUPPEN.flatMap((g) => g.klassen.map((k) => [k, `${k} (${g.gruppe})`] as [string, string]))), // L5384–L5389 (the printed group heads)
    verification_quote: `${Q_L5338_5339} — ${Q_L5218_5219}`,
    create: { section_code: 'C', label_de: 'Bodenklassifikation des Baugrunds nach DIN 18196 (Tab. 26)', data_type: 'enum', unit: null, clause_reference: '§8.3.1, Tab. 26',
      description: 'Plan 3: die 20 Bodengruppen der Tab.-26-Zeilenköpfe (L5384–L5389) einzeln (fll_gar-J-6); Schlüssel der Fills sl_schutzlage_unten_sand_min_cm / sl_schutzlage_unten_werkstoffe_tab26; das Freitextfeld baugrund_typ (-06) bleibt (fll_gar-X-4); bei Größtkorn d ≤ 2 mm kann auf Schutzlagen verzichtet werden (L5218).' },
  }),
  WS22({
    symbol: 'sl_schutzlage_unten_sand_min_cm', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 26 (Mindestdicke Sand)' },
    lookup: { table_code: 'TAB26', role: 'limit', keys: [{ column: 'baugrund', from_symbol: 'baugrund_klasse_18196' }], value: 'sand_min_cm' },
    verification_quote: `${Q_L5494_5496} — ${Q_L5338_5339}`,
    create: { section_code: 'C', label_de: 'Schutzlage unten — Mindestdicke Sand 0,063 mm bis 2 mm nach Tab. 26 (10 · 5 · – cm)', data_type: 'number', unit: 'cm', clause_reference: '§8.3.1, Tab. 26',
      description: 'Plan 3: Wert aus TAB26 zur gewählten baugrund_klasse_18196 (locked — L5494 "sind die in Tabelle 26 enthaltenen Werkstoffe … anzuwenden"); Tab. 26 bleibt imported_unverified bis zur PDF-Bestätigung der Spaltenzuordnung (fll_gar-U-1); Sandböden SE/SW/SI drucken "-" ("—"); REQ-24 (leere Bedingung) STAGED (fll_gar-G-7).' },
  }),
  WS22({
    symbol: 'sl_schutzlage_unten_werkstoffe_tab26', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 26 (zulässige Werkstoffe)' },
    lookup: { table_code: 'TAB26', role: 'value', keys: [{ column: 'baugrund', from_symbol: 'baugrund_klasse_18196' }], value: 'werkstoffe_text' },
    verification_quote: `${Q_L5494_5496} — ${Q_L5338_5339}`,
    create: { section_code: 'C', label_de: 'Schutzlage unten — Werkstoffe nach Tab. 26 für den Baugrund', data_type: 'text', unit: null, clause_reference: '§8.3.1, Tab. 26',
      description: 'Plan 3: die mit "x" gedruckten Werkstoffe der Tab.-26-Zeile (Vliesstoffe ≥ 300 g/m2 GRK 5 · Bautenschutzmatten > 6 mm · Kunststoff-/Elastomerbahnen > 1 mm · Beton, Mörtel > 50 mm) plus die Sand-Mindestdicke als Text (locked); Vergleichstext für sl_schutzlage_unten_typ (Freitext bleibt).' },
  }),
  WS22({
    symbol: 'swk_klasse', widget: 'select_one', ui_config: null,
    enum_values: enumList(tab27AsTable().rows.map((r) => [r.row_key, `${r.label_de} — ${String(r.values.nutzung)}`])), // L5430–L5452
    verification_quote: `${Q_L5416_5423} — ${Q_L5472_5473}`,
    create: { section_code: 'C', label_de: 'Schutzwirksamkeitsklasse (SWK) nach DIN EN 13719 für die Schutzlage oben (Tab. 27)', data_type: 'enum', unit: null, clause_reference: '§8.3.2, Tab. 27',
      description: 'Plan 3: die drei gedruckten SWK-Zeilen mit ihrer Beanspruchung/Nutzung (8,2 kN begehbar · 17,1 kN leichte Fahrzeuge bis 2,5 t · 43,7 kN Fahrzeuge bis 16 t); bei abweichendem Baugrund oder weicheren Abdichtungen ist die nächsthöhere SWK zu verwenden (L5460–L5473 — Auswahl des Planers); Schlüssel des Fills sl_schutzlage_oben_flaechengewicht_min.' },
  }),
  WS22({
    symbol: 'sl_schutzlage_oben_flaechengewicht_min', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 27 (Mindestanforderung)' },
    lookup: { table_code: 'TAB27', role: 'limit', keys: [{ column: 'swk', from_symbol: 'swk_klasse' }], value: 'flaechengewicht_min_g_m2' },
    verification_quote: `${Q_L5416_5423} — ${Q_L5472_5473}`,
    create: { section_code: 'C', label_de: 'Schutzlage oben — Mindestflächengewicht Vliesstoff/Geotextil nach Tab. 27 (≥ 300 · 500 · 800 g GRK 5)', data_type: 'number', unit: 'g/m²', clause_reference: '§8.3.2, Tab. 27',
      description: 'Plan 3: Wert aus TAB27 zur gewählten swk_klasse (locked — L5422 "gelten die Mindestanforderungen der Tabelle 27"); Vergleichswert für sl_schutzlage_oben_flaechengewicht (Gate STAGED fll_gar-G-7).' },
  }),

  // ---- FLL-GAR-23 (Randausbildungen): edge sections with the Tab.-28 cell per row ----
  WS23({
    symbol: 'randabschnitte', widget: 'register',
    ui_config: {
      title: 'Randabschnitte / An- und Abschlüsse (Tab. 28)', subtitle: '§4.8 — je Randabschnitt Anwendungsfall, An-/Abschlusshöhe über max. Wasserstand, Randbefestigung, Kapillarsperre; Tab.-28-Zulässigkeit je Zeile (X · (X) nur mit Randbefestigung und Sicherung · –¹ nur als Sonderkonstruktion)', add_label: '+ Randabschnitt', placement: 'section',
      columns: [
        { key: 'label', label: 'Randabschnitt', type: 'text', required: true },
        { key: 'anwendungsfall', label: 'Anwendungsfall (Tab. 28)', type: 'enum', required: true, options: [...ABSCHLUSS_ANWENDUNGSFALL_TOKENS], option_labels: AF_LABELS, discriminator: true },
        { key: 'hoehe_cm', label: 'An-/Abschlusshöhe über max. Wasserstand', type: 'number', unit: 'cm', required: true, min: 0, aria_label: 'An- oder Abschlusshöhe der Randbefestigung über dem maximalen Wasserstand' },
        { key: 'randbefestigung', label: 'Randbefestigung / Sicherung gegen Hinter- und Unterläufigkeit', type: 'text' },
        { key: 'kapillarsperre', label: 'Kapillarsperre', type: 'boolean' },
        { key: 'hoehe_band', label: 'Tab.-28-Zeile', type: 'derived', expr: HOEHE_BAND_EXPR, value_labels: { ge15: '≥ 15 cm', ge10: '≥ 10 cm', ge5: '≥ 5 cm', zero: '0' } },
        { key: 'zulaessig', label: 'Tab. 28', type: 'derived', expr: ZULAESSIG_EXPR, display: 'badge', value_labels: { x: 'Ausführung zugelassen (X)', x_bedingt: 'nur mit geeigneter Randbefestigung und Sicherung gegen Hinter- und Unterläufigkeit ((X))', sonder: 'nur als Sonderkonstruktion (–¹)' } },
      ],
      footer: ['randabschnitte_sonder'],
      note: norm(Q_L5719_5727),
    },
    verification_quote: `${Q_L5719_5727} — ${Q_T28_HEAD} — ${Q_L5748} — ${Q_L5749_5753}`,
    create: { section_code: 'C', label_de: 'Randabschnitte (Anwendungsfall, An-/Abschlusshöhe, Randbefestigung, Kapillarsperre → Tab.-28-Zulässigkeit je Zeile)', data_type: 'json', unit: null, clause_reference: '§4.8, Tab. 28',
      description: 'Plan 3: Zeilen je Randabschnitt; Tab.-28-Zeile aus der Höhe (Zeilenköpfe ≥ 15 / ≥ 10 / ≥ 5 / 0, L5744–L5747), Zelle aus TAB28 (locked — "gelten als Mindesthöhen", L5724); die Zeile 0 druckt für Freifläche / Schwimmteich keine Zelle (fll_gar-U-4 — unentscheidbar, nie "nein"); Sonderkonstruktionen → randabschnitte_sonder (FLL-GAR-23-D1); REQ-23 liest die §4.8-Texte 5 / 30 cm (L5703–L5710) statt Tab. 28 — Re-Point STAGED (fll_gar-G-4; FLL-Revision GAR-23 F-1 / F-2); die Skalare freibord_zu_gelaende_cm / freibord_zu_bauwerk_cm bleiben.' },
  }),
  WS23({ symbol: 'randabschnitte_sonder', widget: 'derived', ui_config: null, verification_quote: `${Q_T28_HEAD} — ${Q_L5748}`,
    create: { section_code: 'D', label_de: 'Randabschnitte, die nach Tab. 28 nur als Sonderkonstruktion zulässig sind', data_type: 'number', unit: null, clause_reference: '§4.8, Tab. 28',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-23-D1 (count_rows über randabschnitte mit zulaessig == sonder — Fußnote 1 "Nur als Sonderkonstruktion, d. h. als besondere planerische und technische Lösung.", L5748); eine Zeile der Höhe 0 für Freifläche / Schwimmteich ist unentscheidbar (fll_gar-U-4); Gate STAGED (fll_gar-G-4).' } }),

  // ---- FLL-GAR-24 (Bepflanzung / Einbauten): penetrations and plant species as rows ----
  WS24({
    symbol: 'durchdringungen', widget: 'register',
    ui_config: {
      title: 'Durchdringungen und Einbauten', subtitle: '§4.12 / §10.5 — je Durchdringung Typ, Lage, Fugenabdichtung, Rhizomfestigkeitsnachweis', add_label: '+ Durchdringung', placement: 'section',
      columns: [
        { key: 'typ', label: 'Typ (Rohr, Steg, Treppe, …)', type: 'text', required: true },
        { key: 'position', label: 'Lage', type: 'text' },
        { key: 'fugenabdichtung', label: 'Fugenabdichtung / Anschluss', type: 'text' },
        { key: 'rhizom_nachweis', label: 'Nachweis Wurzel-/Rhizomfestigkeit (Fugenabdichtung)', type: 'boolean' },
      ],
      footer: ['durchdringungen_count'],
    },
    verification_quote: `${Q_L1313_1317} — ${Q_L1487_1489}`,
    create: { section_code: 'C', label_de: 'Durchdringungen und Einbauten (Typ, Lage, Fugenabdichtung, Rhizomfestigkeitsnachweis)', data_type: 'json', unit: null, clause_reference: '§4.7; §4.12',
      description: 'Plan 3: Zeilen je Durchdringung / Einbau (L1479 "Randausbildung, Anschlüsse, Durchdringungen und technische Einbauten"); Anzahl → durchdringungen_count (FLL-GAR-24-D1) neben dem manuellen bep_durchdringungen_anzahl (Ablösung STAGED fll_gar-D-6); bep_einbauten_typen bleibt.' },
  }),
  WS24({
    symbol: 'pflanzenarten', widget: 'register',
    ui_config: {
      title: 'Pflanzenarten (Rhizom-Screening)', subtitle: '§4.7 / §10.4 — je Art: aggressiv wurzelnd / rhizombildend (Tab. 29 ist in diesem Task nicht gelesen — fll_gar-U-3)', add_label: '+ Pflanzenart', placement: 'section',
      columns: [
        { key: 'art', label: 'Pflanzenart', type: 'text', required: true },
        { key: 'aggressiv', label: 'aggressiv wurzelnd / rhizombildend', type: 'boolean' },
      ],
      footer: ['pflanzen_aggressiv_count'],
    },
    verification_quote: Q_L1313_1317,
    create: { section_code: 'C', label_de: 'Pflanzenarten (Art, aggressiv wurzelnd / rhizombildend)', data_type: 'json', unit: null, clause_reference: '§4.7; §10.4',
      description: 'Plan 3: Zeilen je Pflanzenart (L1313 "Im Einzelfall ist der Nachweis auf Wurzel- und Rhizomfestigkeit zu führen. Bei vorgesehener Bepflanzung …"); aggressive Arten → pflanzen_aggressiv_count (FLL-GAR-24-D2); REQ-11 (leere Bedingung) STAGED (fll_gar-G-13); die Tab.-29-Liste als Vorschlagsliste folgt, sobald gelesen (fll_gar-U-3); bep_pflanzenarten (Freitext) bleibt.' },
  }),
  WS24({ symbol: 'durchdringungen_count', widget: 'derived', ui_config: null, verification_quote: Q_L1487_1489,
    create: { section_code: 'D', label_de: 'Anzahl Durchdringungen / Einbauten (aus den Zeilen)', data_type: 'number', unit: null, clause_reference: '§4.12',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-24-D1 (count_rows über durchdringungen); ersetzt den manuellen Zähler bep_durchdringungen_anzahl nach Ratifizierung (fll_gar-D-6).' } }),
  WS24({ symbol: 'pflanzen_aggressiv_count', widget: 'derived', ui_config: null, verification_quote: Q_L1313_1317,
    create: { section_code: 'D', label_de: 'Anzahl aggressiv wurzelnder / rhizombildender Pflanzenarten', data_type: 'number', unit: null, clause_reference: '§4.7; §10.4',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-24-D2 (count_rows über pflanzenarten mit aggressiv == true); Grundlage für REQ-11 ("If required and abdichtung not inherently resistant: separate Wurzelschutzbahn") — Gate STAGED (fll_gar-G-13).' } }),

  // ---- FLL-GAR-25 (Prüfungen): the test log as rows (capture-only) ----
  WS25({
    symbol: 'pruefungen', widget: 'register',
    ui_config: {
      title: 'Prüfungen (Eignungs-, Eigen-, Fremd-, Kontrollprüfung)', subtitle: '§5.x.3 / §6.x.3 / §7.x.3 — je Prüfung Art, Werkstoff, Datum, Zertifikat / Prüfzeugnis, bestanden', add_label: '+ Prüfung', placement: 'section',
      columns: [
        { key: 'typ', label: 'Prüfungsart', type: 'enum', required: true, options: [...PRUEFUNG_TOKENS], option_labels: PRUEFUNG_LABELS },
        { key: 'werkstoff', label: 'Werkstoff / Bauteil', type: 'text', required: true },
        { key: 'datum', label: 'Datum', type: 'date' },
        { key: 'zertifikat', label: 'Zertifikat / Prüfzeugnis', type: 'text' },
        { key: 'bestanden', label: 'bestanden', type: 'boolean' },
      ],
    },
    verification_quote: Q_L1313_1317,
    create: { section_code: 'C', label_de: 'Prüfungen (Art, Werkstoff, Datum, Zertifikat, bestanden)', data_type: 'json', unit: null, clause_reference: '§5.x.3; §6.x.3; §7.x.3',
      description: 'Plan 3: Zeilen je Prüfung (die prod-Attestation attest_fll_gar_25_req_26 "Nachweis: Sec.5.x.3/6.x.3/7.x.3" und die drei Booleans bleiben; REQ-26 unverändert); Dokumentation, keine Gleichung.' },
  }),

  // ---- FLL-GAR-27 (Inbetriebnahme / Notüberlauf): catchment sub-areas for Anhang 1 Gl. 1 ----
  WS27({
    symbol: 'einzugsflaechen_not', widget: 'register',
    ui_config: {
      title: 'Einzugsflächen der Notentwässerung (Anhang 1)', subtitle: 'Anhang 1 Gl. 1 — je Teilfläche abflusswirksame Fläche A und Abflussbeiwert C; Σ A und Σ A·C für Q_NOT = (r5,100 − r5,5·C)·A/10.000', add_label: '+ Teilfläche', placement: 'section',
      columns: [
        { key: 'label', label: 'Teilfläche', type: 'text', required: true },
        { key: 'a_m2', label: 'Abflusswirksame Fläche A', type: 'number', unit: 'm²', required: true, min: 0, aria_label: 'abflusswirksame Fläche der Teilfläche' },
        { key: 'c', label: 'Abflussbeiwert C', type: 'number', required: true, min: 0, max: 1, aria_label: 'Abflussbeiwert der Teilfläche' },
        { key: 'ac', label: 'A · C', type: 'derived', expr: 'a_m2 * c' },
      ],
      footer: ['sum_a_m2', 'sum_ac'],
      note: norm(Q_L6462_6467),
    },
    verification_quote: `${Q_L5715_5717} — ${Q_L6477_6485}`,
    create: { section_code: 'B', label_de: 'Einzugsflächen der Notentwässerung (Teilfläche, A, C → Σ A, Σ A·C)', data_type: 'json', unit: null, clause_reference: 'Anhang 1 (informativ), Gl. 1; §4.8',
      description: 'Plan 3: Zeilen je Teilfläche (Beispiel L6477–L6485: 800 m2, C = 1); Σ → sum_a_m2 (FLL-GAR-27-D1) / sum_ac (FLL-GAR-27-D2); die prod-Gleichung Gl. 1 Q_NOT liest die Skalare A / C weiter (Umstellung auf die Summen STAGED fll_gar-R-1); r5,100 / r5,5 nach DIN 1986-100 bleiben Eingaben (Content-Boundary — L5716); das Duplikat A_einzugsflaeche ist fll_gar-X-1 (FLL-Revision GAR-27 F1).' },
  }),
  WS27({ symbol: 'sum_a_m2', widget: 'derived', ui_config: null, verification_quote: Q_L6477_6485,
    create: { section_code: 'D', label_de: 'Σ abflusswirksame Fläche über die Teilflächen', data_type: 'number', unit: 'm²', clause_reference: 'Anhang 1, Gl. 1',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-27-D1 (sum_rows über einzugsflaechen_not.a_m2) — Text-Ableitung; Eingang der gestaffelten Umstellung von Gl. 1 (fll_gar-R-1).' } }),
  WS27({ symbol: 'sum_ac', widget: 'derived', ui_config: null, verification_quote: `${Q_L6484} — ${Q_L6477_6485}`,
    create: { section_code: 'D', label_de: 'Σ A · C über die Teilflächen (Zähler von r5,5 · C in Gl. 1)', data_type: 'number', unit: 'm²', clause_reference: 'Anhang 1, Gl. 1',
      description: 'Plan 3: Ausgabe der Gleichung FLL-GAR-27-D2 (sum_rows über einzugsflaechen_not mit a_m2 · c); Q_NOT = (r5,100 · Σ A − r5,5 · Σ A·C) / 10.000 ist die Summenform von Gl. 1 (L6484) — Umstellung STAGED (fll_gar-R-1), keine zweite Q_NOT-Gleichung.' } }),

  // ---- FLL-GAR-28 (Instandhaltung): maintenance measures as rows (capture-only) ----
  WS28({
    symbol: 'wartungsmassnahmen', widget: 'register',
    ui_config: {
      title: 'Inspektions- und Wartungsmaßnahmen', subtitle: 'Abschnitt 13 — je Maßnahme Intervall in Monaten und Qualifikation', add_label: '+ Maßnahme', placement: 'section',
      columns: [
        { key: 'massnahme', label: 'Maßnahme', type: 'text', required: true },
        { key: 'intervall_monate', label: 'Intervall', type: 'number', unit: 'Monate', min: 0, aria_label: 'Intervall der Maßnahme in Monaten' },
        { key: 'qualifikation', label: 'Qualifikation', type: 'text' },
      ],
    },
    verification_quote: Q_L1487_1489,
    create: { section_code: 'C', label_de: 'Inspektions- und Wartungsmaßnahmen (Maßnahme, Intervall, Qualifikation)', data_type: 'json', unit: null, clause_reference: 'Abschnitt 13',
      description: 'Plan 3: Zeilen je Maßnahme (L1483 "dem Instandhaltungsaufwand (z. B. Reinigungsart, Inspektionsintervalle)"); REQ-29 (inspektion_intervall_jahr ≤ 1) und die vier inst_*-Textfelder bleiben (FLL-Revision GAR-28 F-1 / F-2); Dokumentation, keine Gleichung.' },
  }),
];

/**
 * Section rules on the twelve material worksheets FLL-GAR-10 … -21: each shows only for its own `abdichtungs_art`
 * token (§5 / §6 / §7 structure; REQ-12 … REQ-22 guard by the same token). The section C of -10 / -12 / -14 / -16
 * holds consumed producers (kf_abdichtung … on -10; bauteildicke_cm on -12 — "consumed" by itself, prod oddity;
 * gtd_auflast_funktion on -14; bahnendicke_mm / fuegeverfahren / nahtbreite_min_mm on -16) → withheld
 * (fll_gar-C-2). The driver is not inherited on any of them until fll_gar-C-1 — the rules are `pending` (visible)
 * until then.
 */
export const PRODUCER_SECTIONS: ReadonlyArray<readonly [string, string]> = [['FLL-GAR-10', 'C'], ['FLL-GAR-12', 'C'], ['FLL-GAR-14', 'C'], ['FLL-GAR-16', 'C']];
const SECTION_CODES = ['A', 'B', 'C', 'D', 'F', 'J', 'K', 'L', 'M'] as const;
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = ABDICHTUNGS_ART_TOKENS.flatMap((tok) => {
  const worksheet = MATERIAL_WORKSHEET[tok];
  return SECTION_CODES.filter((code) => !PRODUCER_SECTIONS.some(([w, c]) => w === worksheet && c === code)).map((section_code) => ({
    standard: STD, worksheet, section_code, visible_when: `abdichtungs_art == '${tok}'`, verification_quote: `${Q_L1487_1489} — ${Q_L1412_1413}`,
  }));
});

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };

// Cues read for the withheld / staged items (kept as named references so the sign-off blocks and this module cite the same lines):
export const STAGED_CUES = { L2428_2433: Q_L2428_2433, L2909_2911: Q_L2909_2911, L3662_3665: Q_L3662_3665, L3717_3719: Q_L3717_3719, L4460_4462: Q_L4460_4462, L5703_5710: Q_L5703_5710, L5715_5717: Q_L5715_5717, L5749_5753: Q_L5749_5753, L6462_6467: Q_L6462_6467, TAB18: TAB18_MATERIALS, OUT_OF_SCOPE: OUT_OF_SCOPE_TOKENS, tab1AsTable, tab18RAsTable, tab18SAsTable, ANWENDUNGSFALL_CONCRETE_TOKENS, BAUTEIL_TOKENS, AUSFUEHRUNG_TOKENS, BENTONIT_TOKENS, AUFLAST_FUNKTION_TOKENS, PE_BEANSPRUCHUNG_TOKENS };
