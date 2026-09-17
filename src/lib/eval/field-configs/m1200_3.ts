/**
 * DWA-M-1200-3 — Plan 3 Task 6 field configs (registers, lookup_fill, visibility)
 * as DATA for `scripts/regulation-tables/emit-field-configs-sql.ts m1200_3`.
 *
 * Every `verification_quote` is a span lifted verbatim (by line range) from the
 * transcript `Desktop\Guidelines\DWA-M-1200-3\DWA-M_1200-3_GD.md` (Gelbdruck
 * Juli 2025) — the `Q_*` constants live in `regulation-tables-seed-m1200_3.ts`
 * with their line ranges. Prod facts come from the captured `m1200_3.prior.json`
 * (2026-09-17, read-only): 25 worksheets, every one with the nine coded sections
 * NN-A NN-B NN-C NN-D NN-F NN-J NN-K NN-L NN-M (inputs in B, outputs in D; 104
 * of 208 fields are orphans — the whole M12003-05 mirror worksheet and most of
 * -04 / -06 / -07); 10 equation rows (5 helpers, each duplicated on -05 and its
 * topical worksheet); 32 compliance rows (6 exact `CR-xx-2` duplicates). Enum
 * tokens below are the captured prod `enum_values` (G-A3: table key strings
 * equal them exactly).
 *
 * UPDATE entries: exactly two — `bewaesserungstagebuch` on M12003-18 and on
 * M12003-04 (the Plan-1 selection-config migration `20260911120000_selection_
 * configs_DWA_M_1200_3.sql` writes both rows; this config supersedes it at apply
 * time, the captured prior is the rollback). NO existing field carries a
 * `visible_when`: every candidate of the brief's Step 4 is a consumed producer
 * (`frostschutz_menge`, `rueckflussverhinderer_vorhanden` / `systemtrenner_
 * vorhanden` / `freier_auslauf`, `chlorung_stoss_konz` / `h2o2_stoss_konz`,
 * `temp_thermisch` / `dauer_thermisch_min`, `abschaltung_automatisch`, the six
 * Karenzzeit fields, `weidegang_laktierend` — all consumed by M12003-18 / -19)
 * and the transitive producer guard refuses them → m1200_3-C-2 … -C-6 (STAGED);
 * the created twins next to their drivers carry the rules instead.
 *
 * Section rules: M12003-13 "Abstände" is only relevant for sprinkler systems
 * (L906 / L1026) — the eight sections without a consumed producer (13-A, 13-C,
 * 13-D, 13-F, 13-J, 13-K, 13-L, 13-M) carry the rule; 13-B holds
 * `abstand_zu_sensitiv` / `steuerbarer_zugang` / `abstand_oberflaechengewaesser_
 * eingehalten` (consumed by -14 / -19 / -07) → m1200_3-C-1.
 *
 * Placement (codebase reality over the brief — report §8):
 *   - `schlaege` lives on M12003-06 (Betriebsplan; `gueteklasse` is inherited
 *     there) and feeds `flaeche_gesamt_ha` / `abstand_verletzungen` on the same
 *     worksheet; the Σ area reaches M12003-10-D1 only after the consumer edit
 *     m1200_3-C-7;
 *   - `speicher_1200_3` on M12003-10 reads `gueteklasse` for `klasse_ok`, which
 *     M12003-10 does not inherit today (consumer edit m1200_3-C-7) — the badge
 *     stays "—" until ratified, the Tab.-3 system per row computes regardless;
 *   - the Tab.-14 doses are CREATED fills next to the existing consumed
 *     `chlorung_stoss_konz` / `h2o2_stoss_konz` (re-point STAGED, m1200_3-E-1).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import {
  GUETEKLASSE_TOKENS, SPEICHERTYP_TOKENS, DESINFEKTION_TOKENS, PFLANZENTYP_TOKENS, BEWAESSERUNGSVERFAHREN_TOKENS, TAB11_PARAMETER_TOKENS, TAB13_MOMENT_TOKENS, SPEICHERSYSTEM_TOKENS, TAB789_TABELLE_TOKENS,
  Q_L533, Q_T2_KOPF, Q_T2_HEAD, Q_T2_ROW, Q_L614, Q_L655, Q_T3_GESCHLOSSEN, Q_T3_OFFEN, Q_T3_TRANSPORT, Q_L720, Q_T4_522, Q_T4_512, Q_L755, Q_L790, Q_T5, Q_L838, Q_L851,
  Q_L906, Q_L916, Q_L918, Q_L920, Q_L935, Q_L950, Q_L1026, Q_L1030, Q_L1036, Q_L1040, Q_T7, Q_T8, Q_T9, Q_L1282,
  Q_L1352, Q_T11_3, Q_T11_7, Q_T11_8, Q_L1369, Q_L1376, Q_L1545, Q_L1553, Q_L1596, Q_L1622, Q_L1624_1628, Q_L1631_1635, Q_L1664, Q_L1726, Q_L1738, Q_T14_CHLORUNG, Q_T14_H2O2, Q_L1812_1818, Q_L1825, Q_L1829,
  tab11AsTable, frag,
} from '../regulation-tables-seed-m1200_3';

const STD = 'DWA-M-1200-3';
export { GUETEKLASSE_TOKENS, SPEICHERTYP_TOKENS, DESINFEKTION_TOKENS, PFLANZENTYP_TOKENS, BEWAESSERUNGSVERFAHREN_TOKENS, TAB11_PARAMETER_TOKENS };

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS04 = on('M12003-04');
const WS06 = on('M12003-06');
const WS08 = on('M12003-08');
const WS10 = on('M12003-10');
const WS11 = on('M12003-11');
const WS12 = on('M12003-12');
const WS18 = on('M12003-18');
const WS22 = on('M12003-22');
const WS24 = on('M12003-24');

// ---- drivers (captured prod enums) ----
/** The sprinkler-type methods of the prod `bewaesserungsverfahren` enum: "Beregnung … unter Einsatz von Düsen oder Sprinklern" (L473) and Mikrosprühsysteme (L1036 — a distance rule applies unless the Wurfhöhe ≤ 1 m, m1200_3-J-1). */
export const SPRINKLER_TOKENS = ['beregnung_sprinkler', 'mikrosprueh'] as const;
export const SPR = "bewaesserungsverfahren IN {'beregnung_sprinkler', 'mikrosprueh'}";        // M12003-07 bewaesserungsverfahren, consumed by -13 / -14 / -15 / -21 / -22
export const SPR_ROW = "technik IN {'beregnung_sprinkler', 'mikrosprueh'}";                     // the same rule in row scope of `schlaege`
export const FILL_CHLORUNG = "desinfektion_methode == 'chlorung'";                              // M12003-22 desinfektion_methode (own field)
export const FILL_H2O2 = "desinfektion_methode == 'h2o2'";
export const FILL_TAB14 = "desinfektion_methode IN {'chlorung', 'h2o2'}";
export const FILL_FARBE = "kennzeichnung_farbe IN {'pantone_purple_522c', 'pantone_purple_512c'}"; // M12003-12 kennzeichnung_farbe (own field; `vergleichbar_violett` prints no Tab.-4 row)
export const AB_72H = 'verweilzeit_h >= 72';                                                    // row scope of `speicher_1200_3` (L1626 / L1633 "Ab 72 h Verweilzeit")

const BV_LABELS = { beregnung_sprinkler: 'Beregnung (Sprinkler)', tropfbewaesserung: 'Tropfbewässerung', mikrosprueh: 'Mikrosprühsystem', hydroponik: 'Hydroponik', einstau: 'Einstaubewässerung', furchenbewaesserung: 'Furchenbewässerung', rieselbewaesserung: 'Rieselbewässerung' } as const;
const PT_LABELS = { salzempfindlich: 'salzempfindlich', salzunempfindlich: 'salzunempfindlich' } as const;
const T789_LABELS = { t7: 'Tab. 7 — Regnerkanone / Endkanone / Sprinkler > 2 m Wurfweite', t8: 'Tab. 8 — ohne Endkanone / Düsenwagen / Sprinkler ≤ 2 m Wurfweite', t9: 'Tab. 9 — urbane Überkopfbewässerung, nicht steuerbarer Zugang' } as const;
const SP_LABELS = { offen_ortsfest_kurz: 'offener ortsfester Speicher — kurz- bis mittelfristig', offen_ortsfest_lang: 'offener ortsfester Speicher — langfristig', geschlossen_ortsfest_kurz: 'geschlossener ortsfester Speicher — kurz- bis mittelfristig', geschlossen_ortsfest_lang: 'geschlossener ortsfester Speicher — langfristig', transportbehaelter: 'Transportbehälter' } as const;
const SYS_LABELS = { geschlossen: 'geschlossen', offen: 'offen', transport: 'Transportbehälter' } as const;
const DM_LABELS = { chlorung: 'Chlorung', ozonung: 'Ozonung', pes: 'Peressigsäure (PES)', ultrafiltration: 'Ultrafiltration', uv: 'UV-Bestrahlung', h2o2: 'Wasserstoffperoxid (H2O2)', thermisch: 'thermisch (≥ 70 °C, ≥ 3 min)' } as const;
const MOMENT_LABELS = { befuellung: 'während der Befüllung', speicherung: 'während der Speicherung', start: 'mit Start der Bewässerung', transport: 'Befüllen von Transportbehältern' } as const; // Tab. 13 L1557–L1560
const DRUCK_TOKENS = ['2', '4', '6'] as const;                                                  // Tab. 6 column heads "2 bar / 4 bar / 6 bar" (L841)
const DRUCK_LABELS = { '2': '2 bar', '4': '4 bar', '6': '6 bar' } as const;
/** Tab. 11 parameter labels = the printed names (TAB11 row labels). */
const TAB11_LABELS = Object.fromEntries(tab11AsTable().rows.map((r) => [r.row_key, `${r.label_de} (${r.values.unit === '-' ? 'pH' : String(r.values.unit)})`])) as Record<(typeof TAB11_PARAMETER_TOKENS)[number], string>;
/** The six §8 exposure pathways (L1812–L1818, printed as a list) — the datalist of `expositionspfade.pfad`. */
export const PFAD_DATALIST = Q_L1812_1818.split('\n').filter((l) => l && !l.startsWith('![')).map((l) => l.trim());
/** Tab. 15 exposure levels as printed in its cells (L1836–L1841). */
export const EXPOSITION_TOKENS = ['nicht_vorhanden', 'nicht_vorhanden_bis_gering', 'gering_bis_mittel', 'mittel_bis_hoch'] as const;
const EXPOSITION_LABELS = { nicht_vorhanden: 'Nicht vorhanden', nicht_vorhanden_bis_gering: 'Nicht vorhanden bis gering', gering_bis_mittel: 'Gering bis mittel', mittel_bis_hoch: 'Mittel bis hoch' } as const;

/** Row-scope factor per Tab. 7 / 8 / 9 (L929–L930 / L944–L945 / L1047–L1048); "steuerbarer Zugang" voids the rule (L1030). */
const FAKTOR_EXPR = "if(steuerbarer_zugang == true, 0, lookup('TAB789', sprinkler_gruppe, if(gueteklasse == 'D', 'd', 'a_c'), if(spritzschutz == true, 'mit', 'ohne'), 'faktor'))";
/** Non-sprinkler rows have no distance rule (L914 / L906) → 1; a voided rule (faktor 0) → 1; else the comparison. A null faktor (the empty Tab.-8 D/mit cell, U-1) leaves the row undecidable. */
const ABSTAND_OK_EXPR = `if(${SPR_ROW}, if(faktor == 0, 1, if(abstand_ist_m >= min_abstand_m, 1, 0)), 1)`;
/** Tab. 11 limit per row: the (*) parameters switch on the inherited `pflanzentyp` (L1369), every other parameter prints one value. */
const LIMIT_EXPR = "if(parameter IN {'chlorid', 'wasserhaerte', 'leitfaehigkeit'}, if(pflanzentyp == 'salzempfindlich', limit_se, limit_su), limit_se)";
const OK_EXPR = "if(parameter == 'ph', if(wert >= ph_min AND wert <= ph_max, 1, 0), if(wert <= limit, 1, 0))";
/** Tab. 3 per storage row on the inherited class (letters cover their sub-classes — seed header). */
const KLASSE_OK_EXPR = "if(gueteklasse == 'A', if(lookup('TAB3', speichersystem, 'allows_a') == true, 1, 0), if(gueteklasse IN {'B-1', 'B-2'}, if(lookup('TAB3', speichersystem, 'allows_b') == true, 1, 0), if(gueteklasse IN {'C-1', 'C-2'}, if(lookup('TAB3', speichersystem, 'allows_c') == true, 1, 0), if(lookup('TAB3', speichersystem, 'allows_d') == true, 1, 0))))";
/** Tab. 6 energy column by the selected pressure (the enum tokens are the printed bar values). */
const KWH_EXPR = "if(arbeitsdruck == '2', lookup('TAB6', leitungstyp, 'kwh_2bar'), if(arbeitsdruck == '4', lookup('TAB6', leitungstyp, 'kwh_4bar'), lookup('TAB6', leitungstyp, 'kwh_6bar')))";
/** Tab. 13 allowed-moment cell for (methode, speichersystem) — no printed row for `thermisch` (null). */
const ZULAESSIG_EXPR = "if(if(moment == 'befuellung', lookup('TAB13', methode, speichersystem, 'befuellung'), if(moment == 'speicherung', lookup('TAB13', methode, speichersystem, 'speicherung'), if(moment == 'start', lookup('TAB13', methode, speichersystem, 'start'), lookup('TAB13', methode, speichersystem, 'transport')))) == true, 1, 0)";
const UMWAELZUNG_EXPR = "if(moment IN {'befuellung', 'speicherung'} AND lookup('TAB13', methode, speichersystem, 'umwaelzung_bedingung') == true, 1, 0)";

/** Tab. 2 Tagebuch columns (L544–L553 header, L554 example row); keys kept from the Plan-1 config so stored rows survive the upgrade. */
export const TAGEBUCH_COLUMNS = [
  { key: 'start', label: 'Start der Bewässerung', type: 'text', required: true, placeholder: 'TT.MM.JJJJ hh:mm' },
  { key: 'ende', label: 'Ende der Bewässerung', type: 'text', placeholder: 'TT.MM.JJJJ hh:mm' },
  { key: 'empfehlung_mm', label: 'Empfehlung Bewässerungsgabe', type: 'number', unit: 'mm', min: 0 },
  { key: 'real_mm', label: 'reale Bewässerungsgabe', type: 'number', unit: 'mm', required: true, min: 0 },
  { key: 'flaeche_ha', label: 'real bewässerte Fläche', type: 'number', unit: 'ha', required: true, min: 0 },
  { key: 'wasser_m3', label: 'Wasserverbrauch total', type: 'number', unit: 'm³', required: true, min: 0 },
  { key: 'aufbereitet_m3', label: 'Davon aufbereitetes Wasser', type: 'number', unit: 'm³', min: 0 },
  { key: 'kommentar', label: 'Kommentar', type: 'text' },
] as const;
const tagebuchUi = (footer: string[] | undefined) => ({
  title: 'Bewässerungstagebuch', subtitle: '§4.2 · Tab. 2 — je Bewässerungsgabe eine Zeile (schlagbezogen); Start/Ende wie gedruckt mit Uhrzeit', add_label: '+ Bewässerungsgabe', placement: 'bottom' as const,
  columns: TAGEBUCH_COLUMNS.map((c) => ({ ...c })),
  ...(footer ? { footer } : {}),
  note: Q_L533,
});

/** Tab. 11 (*) limit fill on M12003-08, keyed on the inherited `pflanzentyp` (TAB11_SALZ). */
const salzFill = (symbol: string, value: string, label: string, unit: string, quote: string, printed: string, existing: string): FieldConfigEntry => WS08({
  symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 11 (Toleranzbereich)' },
  lookup: { table_code: 'TAB11_SALZ', role: 'limit', keys: [{ column: 'pflanzentyp', from_symbol: 'pflanzentyp' }], value },
  verification_quote: `${quote} — ${Q_L1369}`,
  create: { section_code: '08-B', label_de: `${label} — Toleranzwert Tab. 11 (${printed})`, data_type: 'number', unit, clause_reference: '§5.6.2, Tab. 11 Anm. (*)',
    description: `Plan 3: Wert aus TAB11_SALZ zum vererbten pflanzentyp (anhaltswert — "Toleranzbereiche", fallspezifisch bei salzempfindlichen Kulturen L1376); Vergleichswert für ${existing}; CR-05 nennt diesen Parameter nicht — Ergänzung STAGED (m1200_3-G-5).` },
});
/** Tab. 14 fill on M12003-22, keyed on the own `desinfektion_methode`; visible only for the method whose printed row it shows (so the other row's value never appears under this label). */
const tab14Fill = (symbol: string, value: string, label: string, unit: string, quote: string, printed: string, visible_when: string, note: string): FieldConfigEntry => WS22({
  symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 14 (ISO 16075-3:2021)' },
  lookup: { table_code: 'TAB14', role: 'value', keys: [{ column: 'methode', from_symbol: 'desinfektion_methode' }], value },
  visible_when, verification_quote: `${quote} — ${Q_L1726}`,
  create: { section_code: '22-B', label_de: `${label} — Tab. 14 (${printed})`, data_type: 'number', unit, clause_reference: '§7.3.2, Tab. 14',
    description: `Plan 3: Wert aus TAB14 zur gewählten desinfektion_methode (anhaltswert — "Empfohlene Konzentration gemäß ISO 16075-3:2021"); ${note}` },
});

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- M12003-06 (Betriebsplan): Schläge / bewässerte Flächen with the Tab.-7/8/9 distance rule per row ----
  WS06({
    symbol: 'schlaege', widget: 'register',
    ui_config: {
      title: 'Schläge / bewässerte Flächen', subtitle: 'Tab. 2 Kopf + §5.2.4 / §5.4.4 — je Schlag Kultur, Pflanzentyp, Bewässerungstechnik; bei Sprinklersystemen Sprinklergruppe (Tab. 7/8/9), Wurfweite, Spritzschutz → Mindestabstand', add_label: '+ Schlag', placement: 'section',
      columns: [
        { key: 'schlag_nr', label: 'Schlag-Nr.', type: 'text', required: true },
        { key: 'feldblock', label: 'Feldblock', type: 'text' },
        { key: 'flaeche_ha', label: 'Fläche', type: 'number', unit: 'ha', required: true, min: 0, aria_label: 'bewässerte Fläche in Hektar' },
        { key: 'kultur', label: 'Kultur', type: 'text', required: true },
        { key: 'pflanzentyp', label: 'Pflanzentyp (Tab. 11)', type: 'enum', required: true, options: [...PFLANZENTYP_TOKENS], option_labels: PT_LABELS },
        { key: 'technik', label: 'Bewässerungstechnik', type: 'enum', required: true, options: [...BEWAESSERUNGSVERFAHREN_TOKENS], option_labels: BV_LABELS, discriminator: true },
        { key: 'sprinkler_gruppe', label: 'Sprinklergruppe (Tab. 7/8/9)', type: 'enum', required: true, options: [...TAB789_TABELLE_TOKENS], option_labels: T789_LABELS, visible_when: SPR_ROW },
        { key: 'wurfweite_m', label: 'Wurfweite (ohne Wind)', type: 'number', unit: 'm', required: true, min: 0, visible_when: SPR_ROW, aria_label: 'reguläre Wurfweite ohne Windeinflüsse' },
        { key: 'spritzschutz', label: 'Spritzschutz (≥ 2 m Höhe, ≥ 1 m Stärke)', type: 'boolean', visible_when: SPR_ROW },
        { key: 'steuerbarer_zugang', label: 'steuerbarer Zugang (Abstandsregelung entfällt)', type: 'boolean', visible_when: "sprinkler_gruppe == 't9'" },
        { key: 'faktor', label: 'Faktor (× Wurfweite)', type: 'derived', expr: FAKTOR_EXPR, display: 'badge', value_labels: { '0': 'entfällt (steuerbarer Zugang)', '1': '1-fache Wurfweite', '2': '2-fache Wurfweite', '3': '3-fache Wurfweite' } },
        { key: 'min_abstand_m', label: 'Mindestabstand', type: 'derived', expr: 'faktor * wurfweite_m' },
        { key: 'abstand_ist_m', label: 'Abstand vorhanden', type: 'number', unit: 'm', required: true, min: 0, visible_when: SPR_ROW, aria_label: 'vorhandener Abstand vom Wasseraustritt' },
        { key: 'abstand_ok', label: 'Abstand ≥ Mindestabstand', type: 'derived', expr: ABSTAND_OK_EXPR, display: 'badge', value_labels: { '1': 'eingehalten', '0': 'unterschritten' } },
        { key: 'weidegang_laktierend', label: 'Weidegang durch laktierendes Vieh', type: 'boolean' },
        { key: 'laktierend_konflikt', label: 'laktierend', type: 'derived', expr: "if(weidegang_laktierend == true AND gueteklasse IN {'C-1', 'C-2'}, 1, 0)", display: 'badge', value_labels: { '1': 'Güteklasse C: Beweidung durch laktierendes Vieh grundsätzlich ausgeschlossen', '0': '' } },
      ],
      footer: ['flaeche_gesamt_ha', 'abstand_verletzungen'],
      note: Q_L1040,
    },
    verification_quote: `${Q_T2_KOPF} — ${Q_L916} — ${Q_L918} — ${Q_L1030}`,
    create: { section_code: '06-B', label_de: 'Schläge / bewässerte Flächen (Kultur, Technik, Abstandsregelung nach Tab. 7/8/9)', data_type: 'json', unit: null, clause_reference: '§4.2, Tab. 2; §5.2.4.2, Tab. 7, Tab. 8; §5.4.4, Tab. 9',
      description: 'Plan 3: Zeilen je Schlag (Tab.-2-Kopf: Schlag-Nr., Feldblock, Fläche, Kultur, Bewässerungstechnik); bei Sprinklersystemen Faktor je Zeile aus TAB789 (Sprinklergruppe × Güteklasse A–C/D × Spritzschutz; steuerbarer Zugang ⇒ entfällt, L1030) → Mindestabstand = Faktor × Wurfweite (Gl-Helper-5 je Zeile); Σ Fläche → flaeche_gesamt_ha (M12003-06-D1), Verstöße → abstand_verletzungen (M12003-06-D2); Mikrosprüh ≤ 1 m Wurfhöhe "kann … gegebenenfalls entfallen" bleibt Entscheidung im RMP (m1200_3-J-1); CR-09 auf abstand_verletzungen == 0 STAGED (m1200_3-G-3); laktierendes Vieh × Klasse C STAGED (m1200_3-G-4); die Skalare flaeche_groesse / kultur_typ / wurfweite / faktor / min_abstand bleiben (m1200_3-R-1 / -C-7).' },
  }),
  WS06({ symbol: 'flaeche_gesamt_ha', widget: 'derived', ui_config: null, verification_quote: `${Q_T2_KOPF} — ${Q_T5}`,
    create: { section_code: '06-D', label_de: 'Σ bewässerte Fläche über die Schläge', data_type: 'number', unit: 'ha', clause_reference: '§4.2, Tab. 2; §5.2.1, Tab. 5',
      description: 'Plan 3: Ausgabe der Gleichung M12003-06-D1 (sum_rows über schlaege.flaeche_ha); ersetzt das manuell getippte flaeche_groesse als Basis von Gl-Helper-1 / -4 — Konsumenten-Ergänzung STAGED (m1200_3-C-7 / -R-1).' } }),
  WS06({ symbol: 'abstand_verletzungen', widget: 'derived', ui_config: null, verification_quote: `${Q_L916} — ${Q_L1040}`,
    create: { section_code: '06-D', label_de: 'Schläge mit unterschrittenem Mindestabstand (Tab. 7/8/9)', data_type: 'number', unit: null, clause_reference: '§5.2.4.2; §5.4.4',
      description: 'Plan 3: Ausgabe der Gleichung M12003-06-D2 (count_rows über schlaege mit abstand_ok == 0; Zeilen ohne Sprinklersystem zählen als eingehalten; eine Zeile mit leer gedruckter Tab.-8-Zelle D/mit ist unentscheidbar, m1200_3-U-1); CR-09 STAGED (m1200_3-G-3).' } }),

  // ---- M12003-08 (Wasserqualität): Tab. 11 (*) limits by Pflanzentyp, sample rows with per-row limit and check ----
  salzFill('cl_limit', 'cl_max', 'Chlorid', 'mg/l', Q_T11_3, 'salzempfindlich 250 · salzunempfindlich 500 mg/l', 'cl_konz'),
  salzFill('haerte_limit', 'haerte_max', 'Wasserhärte', '°dH', Q_T11_7, 'salzempfindlich 30 · salzunempfindlich 60 °dH', 'wasserhaerte'),
  salzFill('lf_limit', 'lf_max', 'Leitfähigkeit', 'µS/cm', Q_T11_8, 'salzempfindlich 2.000 · salzunempfindlich 3.000 µS/cm', 'leitfaehigkeit'),
  WS08({
    symbol: 'wasseranalysen', widget: 'register',
    ui_config: {
      title: 'Wasseranalysen (Tab. 11)', subtitle: '§5.6.2 — je Probe Datum, Parameter und Messwert; Toleranzwert je Zeile aus Tab. 11 (Chlorid / Wasserhärte / Leitfähigkeit nach Pflanzentyp, pH als Bereich 5,0–9,5)', add_label: '+ Analyse', placement: 'section',
      columns: [
        { key: 'date', label: 'Datum', type: 'date', required: true },
        { key: 'parameter', label: 'Parameter', type: 'enum', required: true, options: [...TAB11_PARAMETER_TOKENS], option_labels: TAB11_LABELS, discriminator: true },
        { key: 'wert', label: 'Messwert', type: 'number', required: true, min: 0, aria_label: 'Messwert der Probe' },
        { key: 'einheit', label: 'Einheit', type: 'derived', expr: "lookup('TAB11', parameter, 'unit')" },
        { key: 'limit_se', label: 'Toleranz salzempfindlich', type: 'derived', expr: "lookup('TAB11', parameter, 'limit_salzempfindlich')" },
        { key: 'limit_su', label: 'Toleranz salzunempfindlich', type: 'derived', expr: "lookup('TAB11', parameter, 'limit_salzunempfindlich')" },
        { key: 'limit', label: 'Toleranzwert (Tab. 11)', type: 'derived', expr: LIMIT_EXPR },
        { key: 'ph_min', label: 'pH min', type: 'derived', expr: "lookup('TAB11', parameter, 'ph_min')" },
        { key: 'ph_max', label: 'pH max', type: 'derived', expr: "lookup('TAB11', parameter, 'ph_max')" },
        { key: 'ok', label: 'eingehalten', type: 'derived', expr: OK_EXPR, display: 'badge', value_labels: { '1': 'eingehalten', '0': 'überschritten' } },
      ],
      footer: ['analysen_verletzungen'],
      note: Q_L1376,
    },
    verification_quote: `${Q_L1352} — ${Q_L1369} — ${Q_L1376}`,
    create: { section_code: '08-B', label_de: 'Wasseranalysen (Datum, Parameter, Messwert → Einhaltung des Tab.-11-Toleranzwerts)', data_type: 'json', unit: null, clause_reference: '§5.6.2, Tab. 11',
      description: 'Plan 3: Zeilen je Analyse; Toleranzwert je Zeile aus TAB11 (die (*)-Parameter nach dem vererbten pflanzentyp, L1369; pH als Bereich; die (*)-Werte als Obergrenzen gelesen, m1200_3-J-3); Verstöße → analysen_verletzungen (M12003-08-D1); die 17 Skalare k_konz … zn_konz und CR-05 bleiben (m1200_3-G-5); Schwermetall-Fracht aus Konzentration × Menge nicht kodiert (m1200_3-F-1).' },
  }),
  WS08({ symbol: 'analysen_verletzungen', widget: 'derived', ui_config: null, verification_quote: `${Q_L1352} — ${Q_L1369}`,
    create: { section_code: '08-D', label_de: 'Analysen über dem Tab.-11-Toleranzwert', data_type: 'number', unit: null, clause_reference: '§5.6.2, Tab. 11',
      description: 'Plan 3: Ausgabe der Gleichung M12003-08-D1 (count_rows über wasseranalysen mit ok == 0); CR-05-Erweiterung STAGED (m1200_3-G-5).' } }),

  // ---- M12003-10 (Speicherung): storage rows with the Tab.-3 system and class check, the Tab.-5 default, Σ volume ----
  WS10({
    symbol: 'speicher_1200_3', widget: 'register',
    ui_config: {
      title: 'Speicher und Behälter', subtitle: '§5.1.1 / Tab. 3 / §7.2.4 — je Speicher Typ, Volumen, Sauerstoffsättigung (≥ 50 %), Verweilzeit (ab 72 h Belüftung + Umwälzung)', add_label: '+ Speicher', placement: 'section',
      columns: [
        { key: 'label', label: 'Bezeichnung', type: 'text', required: true },
        { key: 'speichertyp', label: 'Speichertyp', type: 'enum', required: true, options: [...SPEICHERTYP_TOKENS], option_labels: SP_LABELS, discriminator: true },
        { key: 'speichersystem', label: 'Speichersystem (Tab. 3)', type: 'derived', expr: "lookup('TAB3_MAP', speichertyp, 'system')", value_labels: SYS_LABELS },
        { key: 'klassen_zulaessig', label: 'Zulässige Güteklassen (Tab. 3)', type: 'derived', expr: "lookup('TAB3', speichersystem, 'klassen_zulaessig')" },
        { key: 'klasse_ok', label: 'Güteklasse zulässig', type: 'derived', expr: KLASSE_OK_EXPR, display: 'badge', value_labels: { '1': 'Güteklasse für dieses Speichersystem empfohlen (Tab. 3)', '0': 'Güteklasse nicht für dieses Speichersystem empfohlen (Tab. 3)' } },
        { key: 'volumen_m3', label: 'Volumen', type: 'number', unit: 'm³', required: true, min: 0, aria_label: 'Speichervolumen' },
        { key: 'o2_saettigung_pct', label: 'Sauerstoffsättigung', type: 'number', unit: '%', min: 0, max: 100, aria_label: 'relative Sauerstoffsättigung während der Speicherung' },
        { key: 'o2_ok', label: 'O2 ≥ 50 %', type: 'derived', expr: 'if(o2_saettigung_pct >= 50, 1, 0)', display: 'badge', value_labels: { '1': '', '0': 'unter 50 % relative Sättigung (§7.2.4)' } },
        { key: 'verweilzeit_h', label: 'Verweilzeit', type: 'number', unit: 'h', min: 0, aria_label: 'Verweilzeit des aufbereiteten Wassers im System' },
        { key: 'belueftung', label: 'Belüftung (ab 72 h)', type: 'boolean', visible_when: AB_72H },
        { key: 'umwaelzung', label: 'regelmäßige Umwälzung (ab 72 h)', type: 'boolean', visible_when: AB_72H },
      ],
      footer: ['speichervolumen_ist_m3'],
      note: Q_L1622,
    },
    verification_quote: `${Q_L655} — ${Q_T3_GESCHLOSSEN} — ${Q_T3_OFFEN} — ${Q_T3_TRANSPORT} — ${Q_L1622} — ${Q_L1624_1628}`,
    create: { section_code: '10-B', label_de: 'Speicher und Behälter (Typ → Speichersystem nach Tab. 3, Volumen, O2-Sättigung, Verweilzeit)', data_type: 'json', unit: null, clause_reference: '§5.1.1, Tab. 3; §7.2.4',
      description: 'Plan 3: Zeilen je Speicher; Speichersystem je Zeile aus TAB3_MAP (prod-Token → geschlossen/offen/transport — der CR-06-Fix, m1200_3-G-1), zulässige Klassen aus TAB3 gegen die vererbte gueteklasse (Konsumenten-Ergänzung M12003-01 → -10 STAGED, m1200_3-C-7; bis dahin bleibt das Badge leer); ab 72 h Verweilzeit Belüftung / Umwälzung (L1626 / L1633); O2 ≥ 50 % (L1622); Σ Volumen → speichervolumen_ist_m3 (M12003-10-D3); der Skalar speichertyp bleibt (CR-06 / -06-2 STAGED, m1200_3-G-1).' },
  }),
  WS10({ symbol: 'speichervolumen_ist_m3', widget: 'derived', ui_config: null, verification_quote: Q_L655,
    create: { section_code: '10-D', label_de: 'Σ vorhandenes Speichervolumen über die Speicher-Zeilen', data_type: 'number', unit: 'm³', clause_reference: '§5.1.1; §5.2.1',
      description: 'Plan 3: Ausgabe der Gleichung M12003-10-D3 (sum_rows über speicher_1200_3.volumen_m3) — Vergleichswert zum minimal erforderlichen Speichervolumen (Tab. 5).' } }),
  WS10({ symbol: 'bewaesserungshoehe_tab5', widget: 'derived', ui_config: null, verification_quote: `${Q_L790} — ${Q_T5}`,
    create: { section_code: '10-D', label_de: 'Normgröße Bewässerungshöhe nach Tab. 5 (Beispiel: 20 mm)', data_type: 'number', unit: 'mm', clause_reference: '§5.2.1, Tab. 5',
      description: 'Plan 3: Ausgabe der Gleichung M12003-10-D2 (lookup S_TAB5_BEISPIEL, bewaesserungshoehe_mm — Orientierungswert L790; skalare Gleichung, nicht materialisiert); Vorbelegung des Eingabefelds bewaesserungshoehe ist Entscheidung des Planers.' } }),
  WS10({ symbol: 'speichervolumen_calc', widget: 'derived', ui_config: null, verification_quote: `${Q_L790} — ${Q_T5}`,
    create: { section_code: '10-D', label_de: 'Minimal erforderliches Speichervolumen aus Σ Schlagfläche × Bewässerungshöhe (Tab. 5)', data_type: 'number', unit: 'm³', clause_reference: '§5.2.1, Tab. 5',
      description: 'Plan 3: Ausgabe der Gleichung M12003-10-D1 (bewaesserungshoehe × flaeche_gesamt_ha × 10 — die gedruckte Tab.-5-Arithmetik 20 mm × 10 ha = 2000 m³, Faktor 10 = mm·ha → m³); liest flaeche_gesamt_ha von M12003-06 erst nach der Konsumenten-Ergänzung (m1200_3-C-7); Ablösung von Gl-Helper-1 (flaeche_groesse) STAGED (m1200_3-R-1).' } }),

  // ---- M12003-11 (Transport): pressure-pipe sections with Tab.-6 costs / energy scaled by length ----
  WS11({
    symbol: 'druckleitungen', widget: 'register',
    ui_config: {
      title: 'Druckleitungsabschnitte (Tab. 6)', subtitle: '§5.2.2 — je Abschnitt Leitungstyp, Länge, Arbeitsdruck am Leitungsende; Kosten und Energiebedarf aus Tab. 6 (je 1.000 m, Annahmen Anm. 1) auf die Länge skaliert', add_label: '+ Abschnitt', placement: 'section',
      columns: [
        { key: 'leitungstyp', label: 'Leitungstyp (Tab. 6)', type: 'lookup_key', required: true, lookup: { table_code: 'TAB6' } },
        { key: 'laenge_m', label: 'Länge', type: 'number', unit: 'm', required: true, min: 0, aria_label: 'Leitungslänge des Abschnitts' },
        { key: 'arbeitsdruck', label: 'Arbeitsdruck am Leitungsende', type: 'enum', required: true, options: [...DRUCK_TOKENS], option_labels: DRUCK_LABELS },
        { key: 'material', label: 'Materialkosten je 1.000 m (€)', type: 'lookup_value', lookup: { table_code: 'TAB6', key_column: 'leitungstyp', value: 'material_eur' } },
        { key: 'einbau', label: 'Einbaukosten je 1.000 m (€)', type: 'lookup_value', lookup: { table_code: 'TAB6', key_column: 'leitungstyp', value: 'einbau_eur' } },
        { key: 'kwh', label: 'Energiebedarf je 1.000 m (kWh p. a.)', type: 'derived', expr: KWH_EXPR },
        { key: 'kwh_abschnitt', label: 'Energiebedarf Abschnitt (kWh p. a.)', type: 'derived', expr: 'kwh * laenge_m / 1000' },
        { key: 'kosten_abschnitt_eur', label: 'Material + Einbau Abschnitt (€)', type: 'derived', expr: '(material + einbau) * laenge_m / 1000' },
        { key: 'volumenverlust_pct', label: 'Volumenverlust', type: 'number', unit: '%', min: 0, aria_label: 'Volumenverlust des Abschnitts in Prozent' },
        { key: 'verlust_ok', label: 'Verlust ≤ 1 %', type: 'derived', expr: 'if(volumenverlust_pct <= 1, 1, 0)', display: 'badge', value_labels: { '1': '', '0': 'über 1 % des Volumens (§5.1.6)' } },
      ],
      footer: ['energie_kwh_a', 'leitungskosten_eur'],
      note: Q_L851,
    },
    verification_quote: `${Q_L838} — ${Q_L851} — ${Q_L755}`,
    create: { section_code: '11-B', label_de: 'Druckleitungsabschnitte (Leitungstyp, Länge, Arbeitsdruck → Kosten und Energiebedarf nach Tab. 6)', data_type: 'json', unit: null, clause_reference: '§5.2.2, Tab. 6; §5.1.6',
      description: 'Plan 3: Zeilen je Abschnitt; Material / Einbau (lookup_value) und kWh p. a. je gewähltem Arbeitsdruck aus TAB6 (anhaltswert — schematischer Überblick, Stand Q3/2022), linear auf die Länge skaliert (Tab. 6 gilt "pro 1.000 m Länge" — Skalierung ist Text-Ableitung, m1200_3-F-2); Σ → energie_kwh_a (M12003-11-D1) / leitungskosten_eur (M12003-11-D2); Volumenverlust ≤ 1 % je Abschnitt (L755); die Skalare leitungstyp / arbeitsdruck / volumenverlust_pct und CR-17-2 bleiben.' },
  }),
  WS11({ symbol: 'energie_kwh_a', widget: 'derived', ui_config: null, verification_quote: `${Q_L838} — ${Q_L851}`,
    create: { section_code: '11-D', label_de: 'Σ Energiebedarf der Druckleitungsabschnitte (Tab. 6, auf Länge skaliert)', data_type: 'number', unit: 'kWh/a', clause_reference: '§5.2.2, Tab. 6',
      description: 'Plan 3: Ausgabe der Gleichung M12003-11-D1 (sum_rows über druckleitungen.kwh_abschnitt; Tab.-6-Annahmen Anm. 1: 50 m³/h, 200 h Betriebszeit, 0 m Höhenunterschied — m1200_3-F-2).' } }),
  WS11({ symbol: 'leitungskosten_eur', widget: 'derived', ui_config: null, verification_quote: Q_L838,
    create: { section_code: '11-D', label_de: 'Σ Material- und Einbaukosten der Druckleitungsabschnitte (Tab. 6, auf Länge skaliert)', data_type: 'number', unit: '€', clause_reference: '§5.2.2, Tab. 6; §5.2.3',
      description: 'Plan 3: Ausgabe der Gleichung M12003-11-D2 (sum_rows über druckleitungen.kosten_abschnitt_eur; Preisstand Q3/2022, Beispiel ländlicher Raum — m1200_3-F-2).' } }),

  // ---- M12003-12 (Kennzeichnung): the Tab.-4 hex code of the selected Pantone colour ----
  WS12({
    symbol: 'farbcode_hex_tab4', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 4' },
    lookup: { table_code: 'TAB4', role: 'value', keys: [{ column: 'farbe', from_symbol: 'kennzeichnung_farbe' }], value: 'hex' },
    visible_when: FILL_FARBE, verification_quote: `${Q_L720} — ${Q_T4_522} — ${Q_T4_512}`,
    create: { section_code: '12-B', label_de: 'Hex-Farbcode der gewählten Kennzeichnungsfarbe (Tab. 4: 522C #BA9CC5 · 512C #833177)', data_type: 'text', unit: null, clause_reference: '§5.1.4, Tab. 4',
      description: 'Plan 3: Wert aus TAB4 zur gewählten kennzeichnung_farbe (locked — "sind die Farben … als Hintergrund zu nutzen", L720); für vergleichbar_violett druckt Tab. 4 keine Zeile (ausgeblendet).' },
  }),

  // ---- M12003-18 / M12003-04 (Tagebuch): the Plan-1 register upgraded to the typed Tab.-2 columns ----
  WS18({ symbol: 'bewaesserungstagebuch', widget: 'register', ui_config: tagebuchUi(['wasserverbrauch_ist_m3']), verification_quote: `${Q_L533} — ${Q_T2_HEAD} — ${Q_T2_ROW}` }),
  WS18({ symbol: 'wasserverbrauch_ist_m3', widget: 'derived', ui_config: null, verification_quote: `${Q_T2_HEAD} — ${Q_T2_ROW}`,
    create: { section_code: '18-D', label_de: 'Σ Wasserverbrauch total über das Bewässerungstagebuch', data_type: 'number', unit: 'm³', clause_reference: '§4.2, Tab. 2',
      description: 'Plan 3: Ausgabe der Gleichung M12003-18-D1 (sum_rows über bewaesserungstagebuch.wasser_m3) — Ist-Verbrauch gegenüber dem geplanten zusatzwasserbedarf (M12003-16); Schwermetall-Fracht aus Menge × Konzentration nicht kodiert (m1200_3-F-1).' } }),
  WS04({ symbol: 'bewaesserungstagebuch', widget: 'register', ui_config: tagebuchUi(undefined), verification_quote: `${Q_L533} — ${Q_T2_HEAD} — ${Q_T2_ROW}` }),

  // ---- M12003-22 (Reinigung / Desinfektion): Tab.-14 doses next to the existing inputs, measure rows with Tab.-13 / Tab.-14 checks ----
  tab14Fill('chlorung_stoss_konz_tab14', 'konzentration', 'Chlorung — Stoßkonzentration', 'mg/l', Q_T14_CHLORUNG, '30 mg/l', FILL_CHLORUNG, 'nur bei desinfektion_methode = chlorung sichtbar; Ablösung des bestehenden chlorung_stoss_konz STAGED (m1200_3-E-1).'),
  tab14Fill('h2o2_stoss_konz_tab14', 'konzentration', 'Wasserstoffperoxid — Stoßkonzentration', 'ml/l', Q_T14_H2O2, '0,1 ml/l bzw. 1 l pro 10 m³', FILL_H2O2, 'nur bei desinfektion_methode = h2o2 sichtbar; Ablösung des bestehenden h2o2_stoss_konz STAGED (m1200_3-E-1).'),
  tab14Fill('verweilzeit_min_tab14', 'verweilzeit_min_h', 'Mindestverweilzeit im Bewässerungssystem', 'h', `${Q_T14_CHLORUNG} — ${Q_T14_H2O2}`, '12 h bis 24 h', FILL_TAB14, 'untere Grenze des gedruckten Bereichs "12 h bis 24 h" (SR-2: die Verweilzeit selbst bleibt Eingabe in desinfektionen).'),
  WS22({
    symbol: 'desinfektionen', widget: 'register',
    ui_config: {
      title: 'Reinigungs- und Desinfektionsmaßnahmen', subtitle: '§7.2.3 Tab. 13 (Speicher: Methode × Speichersystem × Anwendungsmoment) / §7.3.2 Tab. 14 (Anlagendesinfektion als Stoßapplikation: Konzentration, Mindestverweilzeit) / §7.2.5 (thermisch ≥ 70 °C, 3 min)', add_label: '+ Maßnahme', placement: 'section',
      columns: [
        { key: 'date', label: 'Datum', type: 'date', required: true },
        { key: 'methode', label: 'Methode', type: 'enum', required: true, options: [...DESINFEKTION_TOKENS], option_labels: DM_LABELS, discriminator: true },
        { key: 'speichersystem', label: 'Speichersystem (Tab. 13)', type: 'enum', options: ['geschlossen', 'offen'], option_labels: { geschlossen: 'geschlossen', offen: 'offen' }, visible_when: "methode != 'thermisch'" },
        { key: 'moment', label: 'Anwendungsmoment (Tab. 13)', type: 'enum', options: [...TAB13_MOMENT_TOKENS], option_labels: MOMENT_LABELS, visible_when: "methode != 'thermisch'" },
        { key: 'zulaessig', label: 'zulässig (Tab. 13)', type: 'derived', expr: ZULAESSIG_EXPR, display: 'badge', value_labels: { '1': 'zulässig (Tab. 13)', '0': 'nicht zulässig (Tab. 13)' } },
        { key: 'umwaelzung_hinweis', label: 'Anm. 4', type: 'derived', expr: UMWAELZUNG_EXPR, display: 'badge', value_labels: { '1': 'nur unter der Voraussetzung einer Wasserumwälzung (Tab. 13 Anm. 4)', '0': '' } },
        { key: 'konz_empf', label: 'Empfohlene Konzentration (Tab. 14)', type: 'derived', expr: "lookup('TAB14', methode, 'konz_text')" },
        { key: 'konz_ist', label: 'Angewandte Konzentration', type: 'number', min: 0, aria_label: 'angewandte Konzentration' },
        { key: 'konz_einheit', label: 'Einheit', type: 'derived', expr: "lookup('TAB14', methode, 'konz_unit')" },
        { key: 'verweilzeit_h', label: 'Verweilzeit im System', type: 'number', unit: 'h', min: 0, visible_when: "methode IN {'chlorung', 'h2o2'}", aria_label: 'Verweilzeit des Desinfektionsmittels im System' },
        { key: 'verweilzeit_ok', label: 'Mindestverweilzeit', type: 'derived', expr: "if(verweilzeit_h >= lookup('TAB14', methode, 'verweilzeit_min_h'), 1, 0)", display: 'badge', value_labels: { '1': '≥ 12 h (Tab. 14)', '0': 'unter der Mindestverweilzeit 12 h (Tab. 14)' } },
        { key: 'temp_c', label: 'Temperatur', type: 'number', unit: '°C', min: 0, visible_when: "methode == 'thermisch'", aria_label: 'Temperatur der thermischen Desinfektion' },
        { key: 'dauer_min', label: 'Dauer', type: 'number', unit: 'min', min: 0, visible_when: "methode == 'thermisch'", aria_label: 'Dauer der thermischen Desinfektion' },
        { key: 'thermisch_ok', label: '70 °C / 3 min', type: 'derived', expr: "if(methode == 'thermisch', if(temp_c >= 70 AND dauer_min >= 3, 1, 0), 1)", display: 'badge', value_labels: { '1': '', '0': 'unter 70 °C über 3 min (§7.2.5)' } },
        { key: 'dokumentiert', label: 'dokumentiert', type: 'boolean' },
      ],
      note: Q_L1596,
    },
    verification_quote: `${Q_L1545} — ${Q_L1553} — ${Q_L1726} — ${Q_L1664}`,
    create: { section_code: '22-B', label_de: 'Reinigungs- und Desinfektionsmaßnahmen (Methode, Speichersystem, Anwendungsmoment, Konzentration, Verweilzeit)', data_type: 'json', unit: null, clause_reference: '§7.2.3, Tab. 13; §7.3.2, Tab. 14; §7.2.5',
      description: 'Plan 3: Zeilen je Maßnahme; Zulässigkeit je Zeile aus TAB13 (locked; UF / UV bei Befüllung / Speicherung nur mit Umwälzung, Anm. 4 — m1200_3-U-2); empfohlene Konzentration und Mindestverweilzeit aus TAB14 (anhaltswert) — thermisch ≥ 70 °C über 3 min (L1664, CR-16); die Skalare desinfektion_methode / desinfektion_konzentration / chlorung_stoss_konz / h2o2_stoss_konz und CR-16 bleiben (m1200_3-E-1 / -C-5).' },
  }),

  // ---- M12003-24 (Arbeitsschutz): exposure pathways per irrigated area (CR-13 "tabellarisch dokumentiert") ----
  WS24({
    symbol: 'expositionspfade', widget: 'register',
    ui_config: {
      title: 'Expositionspfade je Bewässerungsfläche (Tab. 15)', subtitle: '§8 — je Fläche Bewässerungstechnik, Aufnahmepfad (Liste §8), Expositionsgrad nach Tab. 15 und Maßnahme', add_label: '+ Expositionspfad', placement: 'section',
      columns: [
        { key: 'flaeche', label: 'Fläche / Schlag', type: 'text', required: true },
        { key: 'technik', label: 'Bewässerungstechnik', type: 'enum', required: true, options: [...BEWAESSERUNGSVERFAHREN_TOKENS], option_labels: BV_LABELS },
        { key: 'pfad', label: 'Aufnahmepfad', type: 'text', required: true, datalist: PFAD_DATALIST },
        { key: 'exposition', label: 'Exposition (Tab. 15)', type: 'enum', required: true, options: [...EXPOSITION_TOKENS], option_labels: EXPOSITION_LABELS },
        { key: 'massnahme', label: 'Maßnahme (Arbeitsschutz)', type: 'text' },
      ],
      note: Q_L1825,
    },
    verification_quote: `${Q_L1812_1818} — ${Q_L1825} — ${Q_L1829}`,
    create: { section_code: '24-B', label_de: 'Expositionspfade je Bewässerungsfläche (Technik, Aufnahmepfad, Exposition nach Tab. 15, Maßnahme)', data_type: 'json', unit: null, clause_reference: '§8, Tab. 15',
      description: 'Plan 3: Zeilen je Fläche × Aufnahmepfad (die sechs gedruckten Pfade L1812–L1818 als Vorschlagsliste; Expositionsgrad wie in Tab. 15 gedruckt — die Tab.-15-Zeilenköpfe sind Bilder, m1200_3-U-3, daher keine Tabelle); der Boolean expositionspfade_dokumentiert und CR-13 bleiben.' },
  }),
];

/** M12003-13 (Abstände) is relevant only for sprinkler systems (L906 / L1026); 13-B holds consumed producers → m1200_3-C-1 (STAGED). */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = (['13-A', '13-C', '13-D', '13-F', '13-J', '13-K', '13-L', '13-M'] as const).map((section_code) => ({
  standard: STD, worksheet: 'M12003-13', section_code, visible_when: SPR, verification_quote: `${Q_L906} — ${Q_L1026}`,
}));

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };

// Cues read for the withheld / staged items (kept as named references so the sign-off blocks and this module cite the same lines):
export const STAGED_CUES = { L614: Q_L614, L920: Q_L920, L935: Q_L935, L950: Q_L950, L1036: Q_L1036, L1282: Q_L1282, L1631_1635: Q_L1631_1635, L1738: Q_L1738, T7: Q_T7, T8: Q_T8, T9: Q_T9, SPEICHERSYSTEM: SPEICHERSYSTEM_TOKENS, frag };
