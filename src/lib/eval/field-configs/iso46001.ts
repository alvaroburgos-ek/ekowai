/**
 * ISO-46001 — Plan 3 Task 22 field configs (the Annex-C water-balance register
 * with a ROLE per metered stream, the objectives / targets / significant-use /
 * water-source / indicator / legal / interested-party / nonconformity
 * registers, the §9.1 monitoring checklist, the Table-D.1 sector select with
 * its indicator hint, the §6.2.7 / §8.3 visibility rules and the created §8.2 /
 * §8.3 scope booleans) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts iso46001`.
 *
 * Every `verification_quote` is a span of the raw plain-text transcript
 * `Desktop\Guidelines\_site_audit\ISO-46001\_46001_raw.txt` (BS ISO 46001:2019;
 * VC grade — the .pdf is NOT a source), lifted by line range into
 * `regulation-tables-quotes-iso46001.ts` (the line range is the constant's
 * name; clause numbers in the comments). Labels are German as prod's are, with
 * the printed English symbol / term. Prod facts come from the captured
 * `iso46001.prior.json` (2026-09-18, read-only): section codes are single
 * letters (-01 B "Eingabeparameter"; -03 D "Wassereffizienz-Ziele", F
 * "Rechtliche/andere Anforderungen"; -04 C "Wassernutzungsanalyse", D
 * "Geschaeftsaktivitaets-Indikator(en)", E "Wassereffizienz-Indikator(en)", F
 * "Baseline-Indikator(en)"; -05 C "Zielwerte"; -07 D "Design", E "Beschaffung";
 * -08 B "Eingabeparameter", C "Wasserbilanz", D "Recyclingrate"; -09 C
 * "Monitoring & Messung"; -10 C "Nichtkonformitaet & Korrekturmassnahme").
 *
 * Placement rule (a262e trap 1): every register lives on the worksheet whose
 * scalars it twins and whose equations read it (a register-fed equation reads
 * a register of its OWN worksheet only). The one scalar equation (-04-D1,
 * `water_efficiency_indicator_calc`) binds to the EXISTING -04 inputs
 * `past_present_water_use` / `business_activity_indicator_value` (amendment K
 * (3): bind, never a second producer of a typed quantity) — it is scalar-only
 * and not server-materialised (noted once in the report).
 *
 * Role tokens of `water_streams` (controller ruling: the Annex C symbols as
 * PRINTED): the legends print Win / Wout (C.1, L1114), Rp / Rnp (C.3, L1150)
 * and Rp / Wp / Rpp (C.5, L1166). WD, R1 … R3 and O1 … O4 are PRINTED in
 * Formula (C.2) (L1129) but defined by no legend in the transcript (Figure
 * C.1 is an image; its key prints only "AHU" / "WWTP", L1126) — their meaning
 * (utility supply / other sources / outputs) is the a) / b) input list (L1084 /
 * L1086), the 1) – 5) output list (L1090 – L1098) and prod's own labels
 * ("Wasserversorgung durch Versorger", "Andere Wasserquelle 1 – 3",
 * "Wasserausgang 1 – 4"); Formula (C.4) even prints R1 … R4 as RECYCLED streams
 * of Figure C.2 (L1152 – L1156) → the delta is iso46001-J-1. Tokens are
 * lower-case (`wd`, `rp`, …) so a quoted literal never coincides with the
 * prod symbols `WD`, `Rp`, … of the same worksheet (Task 13b lint).
 *
 * What is deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/iso46001-STAGED-plan3-rulings.sql):
 *   - hiding `design_consideration` (-07) under `designing_new_facilities`:
 *     CR-027 (block) reads it on the same worksheet → the gate-aware guard
 *     refuses (pinned) → iso46001-G-1 (IF-guarded gate rewrite + the hide);
 *   - hiding `plant_recycling_rate` / `process_recycling_rate` (-08): consumed
 *     by -04 / -05, read by CR-038, and no scalar driver exists ("Where
 *     recycling is carried out" is a row fact of the register) → visible;
 *     CR-038 → iso46001-G-4 on `recycling_streams_count`;
 *   - the switch of `baseline_adjustment_trigger` (enum) to a multi-select
 *     ("in the case of one or more of the following", L552) → iso46001-S-1
 *     (data_type change, never a widget switch — amendment N); the emitted
 *     `baseline_adjustment_note` rule keys on the existing single select;
 *   - Table D.1 beyond its first row → iso46001-U-1 … U-23 (pairing unsettled).
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { Q } from '../regulation-tables-quotes-iso46001';
import { TABLEA1_AREA_DATALIST, TABLED1_ROWS } from '../regulation-tables-seed-iso46001';

const STD = 'ISO-46001';

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS01 = on('ISO-46001-01');
const WS03 = on('ISO-46001-03');
const WS04 = on('ISO-46001-04');
const WS05 = on('ISO-46001-05');
const WS07 = on('ISO-46001-07');
const WS08 = on('ISO-46001-08');
const WS09 = on('ISO-46001-09');
const WS10 = on('ISO-46001-10');

// ---- drivers ----
/** §6.2.7 (L552–L555): "Adjustments to the baseline(s) shall be made in the case of one or more of the following: a) … b) … c) …" — prod enum on -04 (own worksheet). */
export const BASELINE_TRIGGERED = 'baseline_adjustment_trigger IS NOT NULL';
/** §8.2 (L649): "When designing new, modified and renovated facilities, equipment, systems or processes that have a significant impact …" — created boolean on -07 (the hide of design_consideration is iso46001-G-1, not emitted). */
export const DESIGNING = 'designing_new_facilities == true';
/** §8.3 (L653): "When procuring water services, products and equipment that have, or may have, a significant impact on water use …" — created boolean on -07. */
export const PROCURING = 'procurement_significant == true';
/** row scope: the two INPUT roles of Formula (C.2) (WD + R1 + R2 + R3 — the a) / b) input classes). */
export const INPUT_ROLE = 'role IN {wd, r_other_source}';
/** row scope: the OUTPUT role of Formula (C.2) (O1 … O4 — the 1) – 5) output classes). */
export const OUTPUT_ROLE = "role == 'output'";

// ---- printed lists ----
/** Annex C (L1084 / L1086 / L1090–L1098 / L1150 / L1166) — the stream roles; value = token, label = the printed symbol + class. */
export const STREAM_ROLES = ['wd', 'r_other_source', 'output', 'rp', 'rnp', 'wp', 'rpp'] as const;
export const STREAM_ROLE_LABELS: Record<(typeof STREAM_ROLES)[number], string> = {
  wd: 'WD — Wasserversorgung durch Versorger (C.2; a) water supplied by a water utility to the site)',
  r_other_source: 'R1 … R3 — andere Wasserquelle (C.2; b) other water sources (e.g. sea water, demineralised water, ground water, reclaimed water, rain water))',
  output: 'O1 … O4 — Wasserausgang (C.2; water output 1) – 5))',
  rp: 'Rp — total reused/recycled water from the process (C.3 / C.5)',
  rnp: 'Rnp — total reused/recycled water not from the process (C.3)',
  wp: 'Wp — incoming water to process (C.5)',
  rpp: 'Rpp — reused/recycled water from process back to process (C.5)',
};
/** Annex C (L1090–L1098): the five printed output classes 1) – 5) (closed list ⇒ enum, rule 3b). */
export const OUTPUT_TYPES = ['evaporation_drift', 'in_products', 'irrigation', 'sewer_discharge', 'leaks_cleaning'] as const;
export const OUTPUT_TYPE_LABELS: Record<(typeof OUTPUT_TYPES)[number], string> = {
  evaporation_drift: '1) water that is lost through evaporation and drift from the facility, for example cooling towers',
  in_products: "2) water that is contained in the facility's products, for example beverage",
  irrigation: '3) water use for irrigation',
  sewer_discharge: '4) used water discharged from the facility into the sewer system, which includes foul wastewater and effluent from any on-site wastewater treatment facility',
  leaks_cleaning: '5) water lost through leaking assets, including piping systems and ancillary infrastructure, or water used for general property and facility cleaning processes',
};
/** Annex C b) (L1086) + A.7.3 (L801): the printed examples of other / alternative water sources (open lists — datalist, never an enum). */
export const SOURCE_KINDS = ['sea water', 'demineralised water', 'ground water', 'reclaimed water', 'rain water', 'grey water'] as const;
/** Annex C a) / b) (L1084 / L1086): the two printed input classes of the balance chart (closed pair ⇒ enum). */
export const SOURCE_CLASSES = ['utility', 'other_source'] as const;
export const SOURCE_CLASS_LABELS: Record<(typeof SOURCE_CLASSES)[number], string> = {
  utility: 'a) water supplied by a water utility to the site',
  other_source: 'b) other water sources (e.g. sea water, demineralised water, ground water, reclaimed water, rain water)',
};
/** §9.1 1) (L670–L671, L681): the seven "monitor and measure as a minimum" items, printed English. */
export const MONITORING_ITEMS = [
  { value: 'water_types_by_source', label_de: 'the breakdown of types of water supplied or used in the facility, including by source' },
  { value: 'significant_use_breakdown', label_de: 'the breakdown of significant water use and other outputs of the water use review' },
  { value: 'relevant_variables', label_de: 'the relevant variables related to significant water use' },
  { value: 'business_activity_indicators', label_de: 'the business activity indicators' },
  { value: 'water_efficiency_indicators', label_de: 'the water efficiency indicators' },
  { value: 'action_plan_effectiveness', label_de: 'the effectiveness of the action plans in achieving objectives and targets' },
  { value: 'actual_vs_expected', label_de: 'evaluations of actual versus expected water use' },
] as const;
/** §3.4 EXAMPLE (L256) + Table D.1 row 1 (L1202): the printed business-activity-indicator examples — `indicators_46001.indicator` datalist. */
export const INDICATOR_DATALIST = ['Quantity of products produced', 'number of staff and visitors', 'number of guestrooms', ...TABLED1_ROWS.map((r) => r.indicator)] as const;
/** Table D.1 — the seeded keys (G-A3: the select offers exactly the seeded rows; 23 more after U-1 … U-23). */
export const INDUSTRY_SECTORS = TABLED1_ROWS.map((r, i) => ({ value: r.key, label_de: r.sector, order_index: i }));

// ---- row expressions ----
/** Which C.x term a stream enters (1 = Win, 2 = Wout, 3 = recycling terms of C.3 / C.5) — a display badge. */
export const BALANCE_TERM_EXPR = "if(role IN {'wd', 'r_other_source'}, 1, if(role == 'output', 2, 3))";
/** §3.33 (L393): "amount of water used per unit of business activity indicator" — per indicator row. */
export const INDICATOR_VALUE_EXPR = 'water_used_m3 / activity_value';
/** §6.2.7 (L551): "Changes in water efficiency performance shall be measured against the baseline water efficiency indicator(s)." — the difference (formula in words only, iso46001-J-3); a silent null cell while no baseline is entered (probed). */
export const DELTA_VS_BASELINE_EXPR = 'value - baseline';

const derivedOut = (ws: (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>) => FieldConfigEntry, section: string, symbol: string, label: string, unit: string | null, clause: string, eq: string, what: string, quote: string, visible_when?: string): FieldConfigEntry =>
  ws({ symbol, widget: 'derived', ui_config: null, ...(visible_when ? { visible_when } : {}), verification_quote: quote,
    create: { section_code: section, label_de: label, data_type: 'number', unit, clause_reference: clause, description: `Plan 3: Ausgabe der Gleichung ${eq} — ${what}` } });

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- ISO-46001-01: interested parties (§4.2 a) / b)) ----
  WS01({
    symbol: 'interested_parties_46001', widget: 'register',
    ui_config: {
      title: 'Interessierte Parteien und ihre Anforderungen (§4.2)', subtitle: 'Je interessierter Partei eine Zeile: a) die Partei, b) ihre relevanten Anforderungen', add_label: '+ Partei', placement: 'section',
      columns: [
        { key: 'party', label: 'Interessierte Partei', type: 'text', required: true, aria_label: 'Interessierte Partei (§4.2 a)' },
        { key: 'requirement', label: 'Relevante Anforderung(en)', type: 'text', aria_label: 'Relevante Anforderungen der Partei (§4.2 b)' },
      ],
      footer: ['interested_parties_count'],
      note: `${Q.L428} Die Textfelder interested_parties / interested_party_requirements bleiben (iso46001-D-36 / D-37).`,
    },
    verification_quote: Q.L428,
    create: { section_code: 'B', label_de: 'Interessierte Parteien (§4.2; je Partei: Partei, Anforderungen)', data_type: 'json', unit: null, clause_reference: '§4.2',
      description: 'Plan 3: Zeilen je interessierter Partei („the interested parties that are relevant … the relevant requirements of these interested parties“); Anzahl → interested_parties_count (ISO-46001-01-D1). Die Textfelder bleiben (iso46001-D-36 / D-37).' },
  }),
  derivedOut(WS01, 'B', 'interested_parties_count', 'Anzahl erfasster interessierter Parteien', null, '§4.2', 'ISO-46001-01-D1', 'count_rows über interested_parties_46001.', Q.L428),

  // ---- ISO-46001-03: objectives (§6.2.1 1) – 5)) and legal / other requirements (§6.2.3) ----
  WS03({
    symbol: 'objectives', widget: 'register',
    ui_config: {
      title: 'Wassereffizienz-Ziele (§6.2.1)', subtitle: 'Je Ziel eine Zeile mit der Planung 1) what will be done · 2) what resources · 3) who will be responsible · 4) when · 5) how the results will be evaluated', add_label: '+ Ziel', placement: 'section',
      columns: [
        { key: 'objective', label: 'Ziel', type: 'text', required: true, aria_label: 'Wassereffizienz-Ziel' },
        { key: 'what', label: '1) Was wird getan', type: 'text', aria_label: 'Was wird getan (§6.2.1 1)' },
        { key: 'resources', label: '2) Ressourcen', type: 'text', aria_label: 'Erforderliche Ressourcen (§6.2.1 2)' },
        { key: 'responsible', label: '3) Verantwortlich', type: 'text', aria_label: 'Verantwortliche Person / Funktion (§6.2.1 3)' },
        { key: 'deadline', label: '4) Fertigstellung', type: 'date', aria_label: 'Fertigstellungstermin (§6.2.1 4)' },
        { key: 'evaluation_method', label: '5) Bewertung der Ergebnisse', type: 'text', aria_label: 'Methode der Ergebnisbewertung (§6.2.1 5)' },
      ],
      footer: ['objectives_count'],
      note: `${Q.L492} Die Einzelfelder water_efficiency_objectives / objective_action_what / objective_resources / objective_responsible / objective_deadline / objective_evaluation_method bleiben (iso46001-D-17 … D-22); CR-009 / CR-010 → iso46001-G-5.`,
    },
    verification_quote: Q.L492,
    create: { section_code: 'D', label_de: 'Wassereffizienz-Ziele (§6.2.1; je Ziel: Ziel, 1) was, 2) Ressourcen, 3) wer, 4) wann, 5) Bewertung)', data_type: 'json', unit: null, clause_reference: '§6.2.1',
      description: 'Plan 3: Zeilen je Ziel („water efficiency objectives at relevant functions and levels“ mit 1) – 5)); Anzahl → objectives_count (ISO-46001-03-D1). Die Einzelfelder bleiben (iso46001-D-17 … D-22).' },
  }),
  derivedOut(WS03, 'D', 'objectives_count', 'Anzahl erfasster Wassereffizienz-Ziele', null, '§6.2.1', 'ISO-46001-03-D1', 'count_rows über objectives; CR-009 / CR-010 (Attestierungen) → iso46001-G-5.', Q.L492),
  WS03({
    symbol: 'legal_requirements', widget: 'register',
    ui_config: {
      title: 'Rechtliche und andere Anforderungen (§6.2.3)', subtitle: 'Je Anforderung eine Zeile: Anforderung, Quelle, Überprüfungsintervall, letzte Überprüfung („reviewed at defined intervals“)', add_label: '+ Anforderung', placement: 'section',
      columns: [
        { key: 'requirement', label: 'Anforderung', type: 'text', required: true, aria_label: 'Rechtliche oder andere Anforderung' },
        { key: 'source', label: 'Quelle / Rechtsgrundlage', type: 'text', aria_label: 'Quelle der Anforderung' },
        { key: 'review_interval', label: 'Überprüfungsintervall', type: 'text', aria_label: 'Festgelegtes Überprüfungsintervall' },
        { key: 'review_date', label: 'Letzte Überprüfung', type: 'date', aria_label: 'Datum der letzten Überprüfung' },
      ],
      footer: ['legal_requirements_count'],
      note: `${Q.L512_513} Das Textfeld legal_other_requirements bleibt (iso46001-D-23); die Bewertung der Einhaltung (§9.1 4), CR-031) liest weiterhin compliance_evaluation.`,
    },
    verification_quote: Q.L512_513,
    create: { section_code: 'F', label_de: 'Rechtliche / andere Anforderungen (§6.2.3; je Anforderung: Anforderung, Quelle, Intervall, letzte Überprüfung)', data_type: 'json', unit: null, clause_reference: '§6.2.3',
      description: 'Plan 3: Zeilen je Anforderung („legal requirements or other requirements are considered … and are reviewed at defined intervals“); Anzahl → legal_requirements_count (ISO-46001-03-D2). Das Textfeld legal_other_requirements bleibt (iso46001-D-23).' },
  }),
  derivedOut(WS03, 'F', 'legal_requirements_count', 'Anzahl erfasster rechtlicher / anderer Anforderungen', null, '§6.2.3', 'ISO-46001-03-D2', 'count_rows über legal_requirements.', Q.L512_513),

  // ---- ISO-46001-04: water use review (§6.2.4), business activity indicator (§6.2.5, Table D.1), water efficiency indicator (§6.2.6, §3.33), baseline (§6.2.7) ----
  WS04({
    symbol: 'water_sources_46001', widget: 'register',
    ui_config: {
      title: 'Aktuelle Wasserquellen (§6.2.4 1) „identify current water sources“)', subtitle: 'Je Quelle eine Zeile: Bezeichnung, Klasse nach Annex C a) / b), Art (Beispiele aus Annex C / A.7.3), Jahresmenge', add_label: '+ Wasserquelle', placement: 'section',
      columns: [
        { key: 'source', label: 'Wasserquelle', type: 'text', required: true, aria_label: 'Bezeichnung der Wasserquelle' },
        { key: 'source_class', label: 'Klasse (Annex C a / b)', type: 'enum', options: [...SOURCE_CLASSES], option_labels: SOURCE_CLASS_LABELS, aria_label: 'Eingangsklasse nach Annex C' },
        { key: 'kind', label: 'Art', type: 'text', datalist: [...SOURCE_KINDS], aria_label: 'Art der Wasserquelle (z. B. reclaimed water, rain water)' },
        { key: 'm3_per_a', label: 'Menge', type: 'number', unit: 'm³/a', min: 0, aria_label: 'Jahresmenge der Quelle' },
      ],
      footer: ['water_sources_count'],
      note: `${Q.L1082_1086} ${Q.L801} Das Textfeld water_sources bleibt (iso46001-D-24); die Eingangsströme der Wasserbilanz (-08, Rollen wd / r_other_source) sind dieselben Quellen mit Zählerwerten (iso46001-J-2 — keine Summe hier, Win entsteht einmal auf -08).`,
    },
    verification_quote: `${Q.L515_527} — ${Q.L801}`,
    create: { section_code: 'C', label_de: 'Aktuelle Wasserquellen (§6.2.4 1); je Quelle: Bezeichnung, Klasse, Art, Menge)', data_type: 'json', unit: null, clause_reference: '§6.2.4 1), Annex C a) / b), A.7.3',
      description: 'Plan 3: Zeilen je Wasserquelle („identify current water sources“); Anzahl → water_sources_count (ISO-46001-04-D5). Das Textfeld water_sources bleibt (iso46001-D-24).' },
  }),
  derivedOut(WS04, 'C', 'water_sources_count', 'Anzahl erfasster Wasserquellen', null, '§6.2.4 1)', 'ISO-46001-04-D5', 'count_rows über water_sources_46001.', Q.L515_527),
  WS04({
    symbol: 'significant_uses', widget: 'register',
    ui_config: {
      title: 'Signifikante Wassernutzungen (§6.2.4 2))', subtitle: 'Je Aktivität / Funktion mit signifikanter Wassernutzung eine Zeile — Tabelle A.1 als Vorschlagsliste für die Bereiche; Anlagen / Ausrüstung / Personal nach 2); Jahresmenge (Pflicht für die Anteile)', add_label: '+ signifikante Nutzung', placement: 'section',
      columns: [
        { key: 'activity', label: 'Aktivität / Funktion', type: 'text', required: true, datalist: [...TABLEA1_AREA_DATALIST], aria_label: 'Aktivität oder Funktion mit signifikanter Wassernutzung' },
        { key: 'facility', label: 'Anlage / Ausrüstung / System / Personal', type: 'text', aria_label: 'Anlagen, Ausrüstung, Systeme, Prozesse, Personal (§6.2.4 2)' },
        { key: 'variables', label: 'Relevante Variablen', type: 'text', aria_label: 'Andere relevante Variablen der Wassernutzung' },
        { key: 'm3_per_a', label: 'Wassernutzung', type: 'number', unit: 'm³/a', required: true, min: 0, aria_label: 'Jährliche Wassernutzung der Aktivität' },
        { key: 'improvement_potential', label: 'Verbesserungspotenzial', type: 'text', aria_label: 'Potenzial für höhere Wassereffizienz (§6.2.4 d) / 3))' },
      ],
      footer: ['seu_count', 'seu_total', 'seu_share_max'],
      note: `${Q.L370_371} Anteil je Zeile (m3_per_a / seu_total) ist in Zeilenscope nicht darstellbar (eine Summe des eigenen Registers — iso46001-F-1); der größte Anteil steht als seu_share_max im Fußbereich. Das Textfeld significant_water_use bleibt (iso46001-D-25).`,
    },
    verification_quote: `${Q.L515_527} — ${Q.L535_541}`,
    create: { section_code: 'C', label_de: 'Signifikante Wassernutzungen (§6.2.4 2); je Aktivität: Aktivität, Anlage, Variablen, m³/a, Potenzial)', data_type: 'json', unit: null, clause_reference: '§6.2.4 2), §3.28, Table A.1',
      description: 'Plan 3: Zeilen je Aktivität / Funktion signifikanter Wassernutzung („the activities and functions of significant water use, including: the facilities, equipment, systems, processes and personnel …“); Anzahl / Σ / größter Anteil → ISO-46001-04-D4 / D2 / D3. Das Textfeld significant_water_use bleibt (iso46001-D-25).' },
  }),
  derivedOut(WS04, 'C', 'seu_total', 'Σ Wassernutzung der signifikanten Nutzungen', 'm³/a', '§6.2.4 2)', 'ISO-46001-04-D2', 'sum_rows über significant_uses.m3_per_a.', Q.L370_371),
  derivedOut(WS04, 'C', 'seu_share_max', 'Größter Anteil einer signifikanten Nutzung an Σ', '%', '§6.2.4 2), §3.28', 'ISO-46001-04-D3', 'max_rows / sum_rows × 100 („activity accounting for a substantial portion of total water used“); je Zeile nicht darstellbar (iso46001-F-1).', Q.L370_371),
  derivedOut(WS04, 'C', 'seu_count', 'Anzahl erfasster signifikanter Wassernutzungen', null, '§6.2.4 2)', 'ISO-46001-04-D4', 'count_rows über significant_uses.', Q.L515_527),
  WS04({
    symbol: 'industry_sector', widget: 'select_one', ui_config: null,
    enum_values: INDUSTRY_SECTORS,
    verification_quote: `${Q.L545_546} — ${Q.L1192}`,
    create: { section_code: 'D', label_de: 'Industriesektor nach Tabelle D.1 (nur die gesicherte Zeile „Wafer fabrication“; 23 weitere Sektoren nach iso46001-U-1 … U-23)', data_type: 'enum', unit: null, clause_reference: '§6.2.5, Annex D, Table D.1',
      description: 'Plan 3: Treiber der Tabelle D.1 (füllt business_activity_indicator_hint); die Tabelle D.1 ist eine zweispaltige Rohextraktion, deren Zuordnung Sektor ↔ Indikator die Layout-Datei nur für die erste Zeile sichert — die übrigen 23 Zeilen und Auswahlwerte folgen nach Ratifizierung von iso46001-U-1 … U-23 (PDF-Seitenprüfung, SR-3).' },
  }),
  WS04({
    symbol: 'business_activity_indicator_hint', widget: 'lookup_fill', ui_config: { source_label: 'Tab. D.1 (Beispiel)' },
    lookup: { table_code: 'TABLED1', role: 'value', keys: [{ column: 'sector', from_symbol: 'industry_sector' }], value: 'indicator_text' },
    verification_quote: `${Q.L545_546} — ${Q.L1192}`,
    create: { section_code: 'D', label_de: 'Beispiel-Geschäftsaktivitäts-Indikator nach Tabelle D.1 (aus dem Industriesektor; frei anpassbar — „Examples“)', data_type: 'text', unit: null, clause_reference: '§6.2.5, Annex D, Table D.1',
      description: 'Plan 3: aus industry_sector gefüllt (Policy anhaltswert — Beispiele, überschreibbar); das Eingabefeld business_activity_indicator (Pflicht, an -08 / -09 vererbt) bleibt maßgeblich — Umstellung STAGED (iso46001-D-26, amendment J).' },
  }),
  WS04({
    symbol: 'indicators_46001', widget: 'register',
    ui_config: {
      title: 'Wassereffizienz-Indikator(en) (§6.2.5 – §6.2.7, §3.33)', subtitle: 'Je Indikator eine Zeile: Geschäftsaktivitäts-Indikator, sein Wert im Datenzeitraum, die genutzte Wassermenge → Wassereffizienz-Indikator = Wasser je Einheit (§3.33), Baseline und Abweichung', add_label: '+ Indikator', placement: 'section',
      columns: [
        { key: 'indicator', label: 'Geschäftsaktivitäts-Indikator', type: 'text', required: true, datalist: [...INDICATOR_DATALIST], aria_label: 'Geschäftsaktivitäts-Indikator (§3.4)' },
        { key: 'unit', label: 'Einheit des Indikators', type: 'text', aria_label: 'Einheit des Geschäftsaktivitäts-Indikators' },
        { key: 'period', label: 'Datenzeitraum', type: 'text', aria_label: 'Datenzeitraum (A.7.5)' },
        { key: 'activity_value', label: 'Wert des Geschäftsaktivitäts-Indikators', type: 'number', required: true, min: 0, aria_label: 'Wert des Geschäftsaktivitäts-Indikators im Datenzeitraum' },
        { key: 'water_used_m3', label: 'Genutzte Wassermenge', type: 'number', unit: 'm³', required: true, min: 0, aria_label: 'Genutzte Wassermenge im Datenzeitraum (§3.33 Note 1)' },
        { key: 'value', label: 'Wassereffizienz-Indikator (§3.33)', type: 'derived', expr: INDICATOR_VALUE_EXPR },
        { key: 'baseline', label: 'Baseline-Wassereffizienz-Indikator (§3.2)', type: 'number', min: 0, aria_label: 'Baseline-Wassereffizienz-Indikator' },
        { key: 'delta_vs_baseline', label: 'Abweichung zur Baseline', type: 'derived', expr: DELTA_VS_BASELINE_EXPR },
      ],
      footer: ['indicators_count'],
      note: `${Q.L393_394} ${Q.L820_821} Die Einzelfelder business_activity_indicator / business_activity_indicator_value / data_period / water_efficiency_indicator / baseline_water_efficiency_indicator bleiben (iso46001-D-26 … D-30); die Abweichung zur Baseline ist nur in Worten gedruckt (iso46001-J-3).`,
    },
    verification_quote: `${Q.L393_394} — ${Q.L548_549}`,
    create: { section_code: 'E', label_de: 'Wassereffizienz-Indikatoren (je Indikator: Geschäftsaktivitäts-Indikator, Einheit, Zeitraum, Wert, Wassermenge → Indikator nach §3.33, Baseline, Abweichung)', data_type: 'json', unit: null, clause_reference: '§6.2.5, §6.2.6, §6.2.7, §3.2, §3.33, A.7.5',
      description: 'Plan 3: Zeilen je Wassereffizienz-Indikator („Water efficiency indicator(s) shall be reviewed and compared with the baseline water efficiency indicator(s)“) mit der §3.33-Division je Zeile; Anzahl → indicators_count (ISO-46001-04-D6). Die Einzelfelder bleiben (iso46001-D-26 … D-30).' },
  }),
  derivedOut(WS04, 'E', 'indicators_count', 'Anzahl erfasster Wassereffizienz-Indikatoren', null, '§6.2.6', 'ISO-46001-04-D6', 'count_rows über indicators_46001.', Q.L548_549),
  derivedOut(WS04, 'E', 'water_efficiency_indicator_calc', 'Wassereffizienz-Indikator (berechnet, §3.33: Wassernutzung je Einheit des Geschäftsaktivitäts-Indikators)', null, '§3.33, §6.2.6', 'ISO-46001-04-D1', 'past_present_water_use / business_activity_indicator_value (die vorhandenen -04-Eingaben; Zwilling des Eingabefelds water_efficiency_indicator — CR-017 liest die Eingabe, iso46001-D-29 / G-6); skalar, nicht serverseitig materialisiert.', Q.L393_394),
  WS04({
    symbol: 'baseline_adjustment_note', widget: 'scalar', ui_config: null, visible_when: BASELINE_TRIGGERED, verification_quote: Q.L551_557,
    create: { section_code: 'F', label_de: 'Neu festgelegte Baseline: Begründung und neuer Wert (§6.2.7 a) – c) — nur bei gesetztem Anpassungsauslöser)', data_type: 'text', unit: null, clause_reference: '§6.2.7',
      description: 'Plan 3: Freitext, nur sichtbar bei gesetztem baseline_adjustment_trigger („Adjustments to the baseline(s) shall be made in the case of one or more of the following“); der Auslöser als Mehrfachauswahl ist STAGED (iso46001-S-1); CR-018 liest weiterhin baseline_water_efficiency_indicator.' },
  }),

  // ---- ISO-46001-05: targets and action plans (§6.3) ----
  WS05({
    symbol: 'targets', widget: 'register',
    ui_config: {
      title: 'Zielwerte und Aktionspläne (§6.3)', subtitle: 'Je Zielwert eine Zeile: Funktion / Ebene / Prozess / Anlage, Zeitrahmen (Pflicht — „Time frames shall be established“), Aktionsplan 1) Verantwortung · 2) Mittel und Zeitrahmen · 3) Verifizierung der Verbesserung · 4) Verifizierung der Ergebnisse', add_label: '+ Zielwert', placement: 'section',
      columns: [
        { key: 'target', label: 'Zielwert', type: 'text', required: true, aria_label: 'Wassereffizienz-Zielwert' },
        { key: 'function_level', label: 'Funktion / Ebene / Prozess / Anlage', type: 'text', aria_label: 'Funktion, Ebene, Prozess oder Anlage des Zielwerts' },
        { key: 'time_frame', label: 'Zeitrahmen', type: 'text', required: true, aria_label: 'Zeitrahmen für die Erreichung (§6.3)' },
        { key: 'responsibility', label: '1) Verantwortung', type: 'text', aria_label: 'Zugewiesene Verantwortung (§6.3 1)' },
        { key: 'means', label: '2) Mittel', type: 'text', aria_label: 'Mittel, mit denen der Zielwert erreicht wird (§6.3 2)' },
        { key: 'improvement_verification', label: '3) Verifizierung der Verbesserung', type: 'text', aria_label: 'Methode der Verifizierung der Verbesserung (§6.3 3)' },
        { key: 'result_verification', label: '4) Verifizierung der Ergebnisse', type: 'text', aria_label: 'Methode der Verifizierung der Ergebnisse (§6.3 4)' },
      ],
      footer: ['targets_count'],
      note: `${Q.L559_561} ${Q.L570_572} Die Einzelfelder water_efficiency_target / target_time_frame / action_plan / improvement_verification_method bleiben (iso46001-D-32 … D-35).`,
    },
    verification_quote: `${Q.L559_561} — ${Q.L570_572}`,
    create: { section_code: 'C', label_de: 'Zielwerte und Aktionspläne (§6.3; je Zielwert: Zielwert, Funktion, Zeitrahmen, 1) – 4) des Aktionsplans)', data_type: 'json', unit: null, clause_reference: '§6.3, A.7.7',
      description: 'Plan 3: Zeilen je Zielwert („water efficiency targets at relevant functions, levels, processes or facilities … Time frames shall be established“) mit dem Aktionsplan 1) – 4) je Zeile; Anzahl → targets_count (ISO-46001-05-D1). Die Einzelfelder bleiben (iso46001-D-32 … D-35).' },
  }),
  derivedOut(WS05, 'C', 'targets_count', 'Anzahl erfasster Zielwerte', null, '§6.3', 'ISO-46001-05-D1', 'count_rows über targets (nur Zeilen mit Zielwert UND Zeitrahmen sind vollständig).', Q.L559_561),

  // ---- ISO-46001-07: §8.2 design scope, §8.3 procurement scope ----
  WS07({
    symbol: 'designing_new_facilities', widget: 'attestation', ui_config: null, verification_quote: Q.L648_651,
    create: { section_code: 'D', label_de: 'Neue, geänderte oder renovierte Anlagen / Ausrüstung / Systeme / Prozesse mit signifikanter Auswirkung auf die Wassereffizienz werden geplant (§8.2)', data_type: 'boolean', unit: null, clause_reference: '§8.2',
      description: 'Plan 3: Anwendungsbedingung von §8.2 („When designing new, modified and renovated facilities … that have a significant impact“); Treiber der Sichtbarkeit von design_consideration und des IF-Guards auf CR-027 — beides STAGED (iso46001-G-1: die Gate-Prüfung verweigert die Ausblendung eines vom Gate gelesenen Feldes).' },
  }),
  WS07({
    symbol: 'procurement_significant', widget: 'attestation', ui_config: null, verification_quote: Q.L652_655,
    create: { section_code: 'E', label_de: 'Beschaffung von Wasserdienstleistungen, Produkten oder Ausrüstung mit (möglicher) signifikanter Auswirkung auf die Wassernutzung (§8.3)', data_type: 'boolean', unit: null, clause_reference: '§8.3',
      description: 'Plan 3: Anwendungsbedingung von §8.3 („When procuring water services, products and equipment that have, or may have, a significant impact on water use“); Treiber der Sichtbarkeit von procurement_criteria / supplier_informed (emittiert) und des IF-Guards auf CR-028 (-06, Attestierung — STAGED iso46001-G-2 mit Consumer-Edit C-1).' },
  }),
  WS07({ symbol: 'procurement_criteria', widget: 'scalar', ui_config: null, visible_when: PROCURING, verification_quote: Q.L652_655 }), // §8.3 L654: criteria "when procuring … which are expected to have a significant impact"
  WS07({ symbol: 'supplier_informed', widget: 'scalar', ui_config: null, visible_when: PROCURING, verification_quote: Q.L652_655 }), // §8.3 L653: inform suppliers when procuring with significant impact

  // ---- ISO-46001-08: the Annex-C water balance register (one row per metered stream) ----
  WS08({
    symbol: 'water_streams', widget: 'register',
    ui_config: {
      title: 'Wasserbilanz nach Annex C (water balance chart) — ein Eintrag je Zähler / Strom', subtitle: 'Die Rolle entscheidet, in welchen Term die Zeile eingeht: WD / R (Eingang → Win, C.2) · O (Ausgang → Wout, C.2) · Rp / Rnp / Wp / Rpp (Recyclingraten C.3 / C.5); Zählerstandort (Annex C ii)) und letzte Zählerprüfung (A.12)', add_label: '+ Strom / Zähler', placement: 'section',
      columns: [
        { key: 'label', label: 'Strom / Zähler', type: 'text', required: true, aria_label: 'Bezeichnung des Wasserstroms oder Zählers' },
        { key: 'role', label: 'Rolle (Annex C)', type: 'enum', required: true, discriminator: true, options: [...STREAM_ROLES], option_labels: STREAM_ROLE_LABELS, aria_label: 'Rolle des Stroms in der Wasserbilanz' },
        { key: 'volume_m3', label: 'Menge', type: 'number', unit: 'm³', required: true, min: 0, aria_label: 'Gemessene Wassermenge des Stroms' },
        { key: 'period', label: 'Zeitraum', type: 'text', aria_label: 'Bezugszeitraum der Menge' },
        { key: 'source_kind', label: 'Art der Quelle', type: 'text', datalist: [...SOURCE_KINDS], visible_when: INPUT_ROLE, aria_label: 'Art der Wasserquelle (Annex C b) / A.7.3)' },
        { key: 'output_type', label: 'Ausgangsklasse (Annex C 1) – 5))', type: 'enum', options: [...OUTPUT_TYPES], option_labels: OUTPUT_TYPE_LABELS, visible_when: OUTPUT_ROLE, aria_label: 'Klasse des Wasserausgangs nach Annex C' },
        { key: 'meter_location', label: 'Zählerstandort', type: 'text', aria_label: 'Standort des Wasserzählers (Annex C ii)' },
        { key: 'meter_verified_on', label: 'Letzte Zählerprüfung', type: 'date', aria_label: 'Datum der letzten Verifizierung / Validierung des Zählers (A.12)' },
        { key: 'balance_term', label: 'Term', type: 'derived', expr: BALANCE_TERM_EXPR, display: 'badge', value_labels: { '1': 'Win (C.1 / C.2)', '2': 'Wout (C.1 / C.2)', '3': 'Recycling (C.3 / C.5)' } },
      ],
      footer: ['water_streams_count', 'Win_calc', 'Wout_calc', 'leak_indicator', 'recycling_streams_count', 'plant_recycling_rate_calc', 'process_recycling_rate_calc', 'meters_unverified'],
      note: `${Q.L1106_1114} ${Q.L1100_1104} Die festen Einzelfelder WD / R1 – R3 / O1 – O4 / Rp / Rnp / Wp / Rpp und die geprüften Gleichungen C.1 / C.2b / C.3 / C.5 bleiben (iso46001-D-1 … D-12, R-1); Win / Wout / die Raten entstehen als Zwillinge Win_calc / Wout_calc / *_calc (iso46001-D-13 … D-16); CR-037 / CR-038 → iso46001-G-4. WD / R1 – R3 / O1 – O4 sind in C.2 gedruckt, aber in keiner Legende definiert (iso46001-J-1).`,
    },
    verification_quote: `${Q.L1106_1114} — ${Q.L1126_1129}`,
    create: { section_code: 'B', label_de: 'Wasserbilanz nach Annex C (je Strom / Zähler: Bezeichnung, Rolle WD / R / O / Rp / Rnp / Wp / Rpp, Menge, Zeitraum, Quellenart, Ausgangsklasse, Zählerstandort, letzte Zählerprüfung)', data_type: 'json', unit: null, clause_reference: 'Annex C, Formula (C.1) – (C.5), A.12',
      description: 'Plan 3: Zeilen je gemessenem Wasserstrom („Win = Wout … Should total water input exceed total water output, the difference could be due to leaks and uncontrolled losses“); Rollen = die gedruckten Annex-C-Symbole; Σ Eingang / Σ Ausgang / Differenz / Raten C.3 / C.5 / Zählungen → ISO-46001-08-D1 … D8. Die festen Einzelfelder und die Gleichungen C.1 / C.2b / C.3 / C.5 bleiben (iso46001-D-1 … D-16, R-1).' },
  }),
  derivedOut(WS08, 'C', 'Win_calc', 'Win — gesamter Wassereingang aus dem Register (Σ Rollen WD + R; C.2)', 'm³', 'Annex C, Formula (C.1) / (C.2)', 'ISO-46001-08-D1', 'Σ volume_m3 der Zeilen mit Rolle wd / r_other_source; Zwilling der geprüften Gleichung C.1 (Win, an -09 vererbt, CR-037) — Umstellung STAGED (iso46001-D-13 / R-1).', Q.L1126_1129),
  derivedOut(WS08, 'C', 'Wout_calc', 'Wout — gesamter Wasserausgang aus dem Register (Σ Rolle O; C.2)', 'm³', 'Annex C, Formula (C.1) / (C.2)', 'ISO-46001-08-D2', 'Σ volume_m3 der Zeilen mit Rolle output; Zwilling der geprüften Gleichung C.2b (Wout, an -09 vererbt) — Umstellung STAGED (iso46001-D-14 / R-1).', Q.L1126_1129),
  derivedOut(WS08, 'C', 'leak_indicator', 'Differenz Win − Wout (> 0: Leckagen und unkontrollierte Verluste möglich, C.1)', 'm³', 'Annex C, Formula (C.1)', 'ISO-46001-08-D3', 'Σ Eingang − Σ Ausgang („Should total water input exceed total water output, the difference could be due to leaks and uncontrolled losses“); CR-037 → iso46001-G-4.', Q.L1106_1114),
  derivedOut(WS08, 'D', 'plant_recycling_rate_calc', 'Anlagen-/Standort-Recyclingrate aus dem Register (Formula (C.3))', '%', 'Annex C, Formula (C.3)', 'ISO-46001-08-D4', '(Σ Rp + Σ Rnp) / (Σ Rp + Σ Rnp + Σ WD) × 100 %; Zwilling der geprüften Gleichung C.3 (plant_recycling_rate, an -04 / -05 vererbt, CR-038) — Umstellung STAGED (iso46001-D-15 / R-1 / G-4).', Q.L1144_1150),
  derivedOut(WS08, 'D', 'process_recycling_rate_calc', 'Prozess-Recyclingrate aus dem Register (Formula (C.5))', '%', 'Annex C, Formula (C.5)', 'ISO-46001-08-D5', 'Σ Rp / (Σ Wp + Σ Rpp) × 100 %; Zwilling der geprüften Gleichung C.5 (process_recycling_rate, an -04 / -05 vererbt, CR-038) — Umstellung STAGED (iso46001-D-16 / R-1 / G-4).', Q.L1160_1166),
  derivedOut(WS08, 'B', 'water_streams_count', 'Anzahl erfasster Ströme / Zähler', null, 'Annex C', 'ISO-46001-08-D6', 'count_rows über water_streams; Vorbedingung der STAGED Gates (iso46001-G-4).', Q.L1080),
  derivedOut(WS08, 'D', 'recycling_streams_count', 'Anzahl Recyclingströme (Rollen Rp / Rnp / Wp / Rpp) — „if recycling is carried out“', null, 'Annex C i), Formula (C.3) / (C.5)', 'ISO-46001-08-D7', 'count_rows über water_streams mit Rolle rp / rnp / wp / rpp („recycling streams … and the recycling rate if recycling is carried out“); IF-Guard von CR-038 (iso46001-G-4).', Q.L1100_1104),
  derivedOut(WS08, 'B', 'meters_unverified', 'Ströme ohne dokumentierte Zählerprüfung (A.12)', null, 'A.12', 'ISO-46001-08-D8', 'count_rows über water_streams mit leerem meter_verified_on („verification/validation tests are carried out periodically“); CR-039 (leere Bedingung) → iso46001-G-3.', Q.L876),

  // ---- ISO-46001-09: the §9.1 minimum monitoring items ----
  WS09({
    symbol: 'monitoring_items', widget: 'select_many',
    ui_config: {
      title: 'Monitoring und Messung — Mindestumfang nach §9.1 1)', subtitle: '„monitor and measure as a minimum“ — die sieben gedruckten Punkte (ankreuzen, was überwacht und gemessen wird)', note: `${Q.L660_671} ${Q.L681}`,
      groups: [{ label: '§9.1 1) monitor and measure as a minimum', options: MONITORING_ITEMS.map((m) => m.value) }],
    },
    enum_values: MONITORING_ITEMS.map((m, i) => ({ value: m.value, label_de: m.label_de, order_index: i })),
    verification_quote: `${Q.L660_671} — ${Q.L681}`,
    create: { section_code: 'C', label_de: 'Mindestumfang von Monitoring und Messung (§9.1 1), sieben Punkte)', data_type: 'json', unit: null, clause_reference: '§9.1 1)',
      description: 'Plan 3: Mehrfachauswahl über die sieben gedruckten Mindestpunkte; das Textfeld monitoring_breakdown bleibt (iso46001-D-38); ein Vollständigkeits-Gate (alle sieben) neben CR-030 ist STAGED (iso46001-G-3 — seit Plan 3 Welle A liest der Materialisierer Checklisten (iso46001-F-2); der Block bleibt bis zur Ratifizierung STAGED).' },
  }),

  // ---- ISO-46001-10: nonconformities and corrective actions (§10.1) ----
  WS10({
    symbol: 'nonconformities', widget: 'register',
    ui_config: {
      title: 'Nichtkonformitäten und Korrekturmaßnahmen (§10.1)', subtitle: 'Je Nichtkonformität eine Zeile: a) Reaktion / Korrektur, b) Ursache, c) Maßnahme, d) Wirksamkeit überprüft, 1) – 2) Nachweise; „geschlossen“ nicht angekreuzt = offen', add_label: '+ Nichtkonformität', placement: 'section',
      columns: [
        { key: 'nc', label: 'Nichtkonformität', type: 'text', required: true, aria_label: 'Art der Nichtkonformität (§10.1 1)' },
        { key: 'correction', label: 'a) Reaktion / Korrektur', type: 'text', aria_label: 'Sofortmaßnahme zur Kontrolle und Korrektur (§10.1 a)' },
        { key: 'cause', label: 'b) Ursache', type: 'text', aria_label: 'Ermittelte Ursache (§10.1 b)' },
        { key: 'action', label: 'c) Korrekturmaßnahme', type: 'text', aria_label: 'Umgesetzte Korrekturmaßnahme (§10.1 c)' },
        { key: 'effectiveness_reviewed', label: 'd) Wirksamkeit überprüft', type: 'boolean', aria_label: 'Wirksamkeit der Korrekturmaßnahme überprüft (§10.1 d)' },
        { key: 'evidence', label: 'Nachweis / Ergebnis', type: 'text', aria_label: 'Dokumentierte Information: Ergebnisse der Korrekturmaßnahme (§10.1 2)' },
        { key: 'closed', label: 'geschlossen', type: 'boolean', aria_label: 'Nichtkonformität geschlossen (nicht angekreuzt = offen)' },
      ],
      footer: ['nc_count', 'nc_open'],
      note: `${Q.L703_706} ${Q.L713} Die Textfelder nonconformity / corrective_action bleiben (iso46001-D-39 / D-40); CR-034 (Attestierung) → iso46001-G-5.`,
    },
    verification_quote: `${Q.L703_706} — ${Q.L713}`,
    create: { section_code: 'C', label_de: 'Nichtkonformitäten (§10.1; je NC: NC, Korrektur, Ursache, Maßnahme, Wirksamkeit, Nachweis, geschlossen)', data_type: 'json', unit: null, clause_reference: '§10.1',
      description: 'Plan 3: Zeilen je Nichtkonformität („the nature of the nonconformities and any subsequent actions taken; the results of any corrective action“); Anzahl / offene → nc_count / nc_open (ISO-46001-10-D1 / D2). Die Textfelder bleiben (iso46001-D-39 / D-40).' },
  }),
  derivedOut(WS10, 'C', 'nc_count', 'Anzahl erfasster Nichtkonformitäten', null, '§10.1', 'ISO-46001-10-D1', 'count_rows über nonconformities.', Q.L713),
  derivedOut(WS10, 'C', 'nc_open', 'Offene Nichtkonformitäten (nicht geschlossen)', null, '§10.1', 'ISO-46001-10-D2', 'count_rows über nonconformities mit closed = false (ein nicht angekreuztes Kästchen zählt als offen); CR-034 → iso46001-G-5.', Q.L713),
];

/**
 * No section rules: every ISO-46001 section holds consumed, gate-read or attestation fields, and the
 * two applicability drivers (§8.2 / §8.3) live inside the sections they would hide (-07 D / E).
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
