/**
 * ISO-5667-10 — Plan 3 Task 20 field configs (sampling-point / schedule / bottle /
 * qualified-grab / sampler registers, the composite-duration select + interval
 * fill, the CTCV precondition, site-type and mode visibility) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts iso5667_10`.
 *
 * Every `verification_quote` is a span of the SPANISH transcript
 * `Desktop\Ciruclar economy, sustanability and water test\ISO 5667-10\ISO-5667-10.txt`
 * (ISO 5667-10:2020, AENOR licence copy; VC grade — no PDF read), lifted by line
 * range into `regulation-tables-quotes-iso5667_10.ts` (the line range is the
 * constant's name; clause numbers in the comments). Labels are German as prod's
 * are, with the printed Spanish term where it helps. Prod facts come from the
 * captured `iso5667_10.prior.json` (2026-09-18, read-only): section codes are
 * single letters (-01 C "Defined Terms"; -02 C "Sampling-Point Representativeness",
 * D "Sampling-Point Documentation & Facilities"; -03 B "Inputs", C "Number of
 * Samples & Sampling Days"; -04 B Sewers, C WWTP, E Cooling; -05 C Grab, D Composite;
 * -06 C "Composite Sampling for Quality Control", D Grab, E Cisterns; -07 C
 * "Automatic Sampler", D Manual, E Tank; -08 C "Homogenization & Distribution").
 *
 * Placement rule (a262e trap 1): every rule / fill / register sits on the worksheet
 * where its driver resolves — `sample_type_definition` on -01, `specific_site_type`
 * on -04 (inherited on -06, NOT on -02 — the -02 register carries its own
 * `specific_site_type` column instead), `main_sampling_type` on -05 (inherited on
 * -06 / -07), `composite_mode` on -05 (inherited on -06), `representativeness_mode`
 * on -02 (inherited on -04 / -06 — NOT on -07: the two -07 tank rules are emitted
 * `pending` until iso5667_10-C-1), `sampling_period` on -03.
 *
 * What is deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/iso5667_10-STAGED-plan3-rulings.sql):
 *   - hiding `composite_interval` (CR-016), `tube_internal_diameter` / `suction_velocity`
 *     (CR-017), `unit_volume` … (CR-018), `V_n` (CR-019) and `V_final` / `M3_total` /
 *     `M3_n` (they feed prod equation 3 → V_n ← CR-019) under the composite / CTCV
 *     modes — the gate-aware guard refuses each (gate reads the symbol, no IF guard)
 *     → the IF-guarded gate rewrites iso5667_10-G-3 / G-4 / G-5 / G-7 carry the hides
 *     as their follow-up UPDATEs;
 *   - hiding `restriction_downstream_diameters` (CR-011) / `cooling_runoff_time`
 *     (CR-012) under the site type → iso5667_10-G-6;
 *   - hiding the -01 `qualified_grab_*` scalars (CR-002) → iso5667_10-G-8;
 *   - hiding `A` / `k` / `sampling_day_k` / `sampling_week_k` under the year period
 *     (equations 1 / 2 → CR-008) and `number_of_samples` (consumed by -05 / -06)
 *     → iso5667_10-G-9;
 *   - hiding `homogeneity_deviation` under in_storage — consumed by -08 AND read by
 *     CR-021, AND §9.1 (L1502–L1505) prints the same < 20 % for every homogenisation
 *     → iso5667_10-J-3 / G-1 (guard proposed with the caveat);
 *   - hiding `composite_mode` (-05) under composite — consumed by -06 → iso5667_10-C-2.
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { Q } from '../regulation-tables-quotes-iso5667_10';

const STD = 'ISO-5667-10';

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS01 = on('ISO-5667-10-01');
const WS02 = on('ISO-5667-10-02');
const WS03 = on('ISO-5667-10-03');
const WS04 = on('ISO-5667-10-04');
const WS05 = on('ISO-5667-10-05');
const WS06 = on('ISO-5667-10-06');
const WS07 = on('ISO-5667-10-07');
const WS08 = on('ISO-5667-10-08');

// ---- drivers (prod tokens as captured) ----
export const QUALIFIED = "sample_type_definition == 'qualified_grab'";
export const YEAR = "sampling_period == 'year'";
export const GRAB = "main_sampling_type == 'grab'";
export const COMPOSITE = "main_sampling_type == 'composite'";
export const FLOW_PROPORTIONAL = "composite_mode IN {'CVVT', 'CTVV'}";
export const CTCV = "composite_mode == 'CTCV'";
export const IN_STORAGE = "representativeness_mode == 'in_storage'";
export const SEWER = "specific_site_type == 'sewer_channel_manhole'";
export const WWTP = "specific_site_type == 'wwtp'";
export const COOLING = "specific_site_type == 'cooling_system'";
export const EVENT = 'event_triggered_sampling == true';

// ---- printed rules as expressions (single-sourced from the seeded tables) ----
/** §4.3.2: 365 (Fórmula 1, n above about 25) or 52 (Fórmula 2, n below about 25) — n = 25 exactly falls to Fórmula 2 (iso5667_10-J-1). */
export const PERIOD_LENGTH_EXPR = "lookup('S4_3_2', if(number_of_samples > 25, 'gt25', 'lt25'), 'period_length')";
/** Fórmula (1) / (2) per row: A + 365·k/n resp. A + 52·k/n (L483–L485 / L494–L496), the row's k over the worksheet's A and n (G-13). */
export const DAY_OR_WEEK_EXPR = `A + ${PERIOD_LENGTH_EXPR} * k / number_of_samples`;
/** Fórmula (3) per bottle (L1013–L1015): Vn = Vfinal · (M3n / M3total), over the worksheet's V_final and M3_total. */
export const V_N_EXPR = 'V_final * m3_n / M3_total';
/** §7.2.2.1 (L936–L937): the printed minimum for the row's pump technology (null for peristaltic / external — no printed figure, iso5667_10-E-1). */
export const UNIT_VOLUME_MIN_EXPR = "lookup('S7_2_2_1_PUMP', pump_technology, 'min_unit_volume_ml')";
/** 1 = meets the printed minimum (or none is printed for the technology); 0 = below it, or no unit volume entered although a minimum is printed. */
export const UNIT_VOLUME_OK_EXPR = 'if(unit_volume_min IS NULL, 1, if(unit_volume_ml IS NULL, 0, if(unit_volume_ml >= unit_volume_min, 1, 0)))';
/** §5.1 (L555–L557): sewer rows — at least 3 × diameter downstream of the restriction; other site types 1 (not applicable). */
export const RESTRICTION_OK_EXPR = `if(${SEWER}, if(restriction_downstream_diameters IS NULL, 0, if(restriction_downstream_diameters >= lookup('S5_SITE', 'sewer_channel_manhole', 'restriction_min_diameters'), 1, 0)), 1)`;
/** §5.1 (L562–L564): sewer rows — sampling point between one third and one half of the depth (the printed range, SR-2: entered, checked, never picked). */
export const DEPTH_OK_EXPR = `if(${SEWER}, if(sampling_depth_fraction IS NULL, 0, if(sampling_depth_fraction >= lookup('S5_SITE', 'sewer_channel_manhole', 'depth_fraction_min') AND sampling_depth_fraction <= lookup('S5_SITE', 'sewer_channel_manhole', 'depth_fraction_max'), 1, 0)), 1)`;
/** §5.4 (L705–L706): cooling rows — run the water at least 30 s before sampling. */
export const RUNOFF_OK_EXPR = `if(${COOLING}, if(cooling_runoff_s IS NULL, 0, if(cooling_runoff_s >= lookup('S5_SITE', 'cooling_system', 'runoff_min_s'), 1, 0)), 1)`;

export const SITE_TYPES = ['sewer_channel_manhole', 'wwtp', 'industrial_site', 'cooling_system'] as const; // prod specific_site_type tokens (capture)
export const SITE_LABELS: Record<(typeof SITE_TYPES)[number], string> = {
  sewer_channel_manhole: 'Alcantarillas, canales y pozos de registro (§5.1)',
  wwtp: 'Planta de tratamiento de aguas residuales (§5.2)',
  industrial_site: 'Emplazamiento industrial (§5.3)',
  cooling_system: 'Sistema de refrigeración (§5.4)',
};
export const PUMP_TECHNOLOGIES = ['vacuum', 'peristaltic', 'inline_piston', 'external'] as const; // prod pump_technology tokens (capture)

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- ISO-5667-10-01: qualified grab sample = at least five grabs (§3.4) ----
  WS01({
    symbol: 'stichproben_qualifiziert', widget: 'register',
    ui_config: {
      title: 'Stichproben der qualifizierten Stichprobe (muestra puntual cualificada, §3.4)', subtitle: 'Je Einzel-Stichprobe eine Zeile — mindestens fünf, innerhalb von höchstens zwei Stunden, Abstand mindestens zwei Minuten', add_label: '+ Stichprobe', placement: 'section',
      columns: [
        { key: 'nr', label: 'Nr.', type: 'number', required: true, min: 1 },
        { key: 'time', label: 'Uhrzeit (HH:MM)', type: 'text', required: true, placeholder: '08:05', aria_label: 'Uhrzeit der Stichprobe' },
        { key: 'volume_ml', label: 'Volumen', type: 'number', unit: 'ml', min: 0, aria_label: 'Volumen der Stichprobe' },
      ],
      footer: ['qualified_grab_count_calc', 'qualified_grab_count_ok'],
      note: `${Q.L305_307} Die Zählung (≥ 5) wird aus den Zeilen berechnet; Zeitfenster (≤ 2 h) und Mindestabstand (≥ 2 min) sind weiterhin von Hand einzutragen — die Ausdruckssprache hat keine Zeitarithmetik (iso5667_10-F-2).`,
    },
    visible_when: QUALIFIED, // §3.4 — the definition applies to the qualified grab sample only
    verification_quote: Q.L304_307,
    create: { section_code: 'C', label_de: 'Stichproben der qualifizierten Stichprobe (§3.4: ≥ 5 in ≤ 2 h, Abstand ≥ 2 min)', data_type: 'json', unit: null, clause_reference: '§3.4',
      description: 'Plan 3: Zeilen je Einzel-Stichprobe (Uhrzeit, Volumen); Anzahl → qualified_grab_count_calc (ISO-5667-10-01-D1), Vergleich mit den fünf des §3.4 → qualified_grab_count_ok (-D2). Das Eingabefeld qualified_grab_count (CR-002) bleibt — Ablösung STAGED (iso5667_10-D-1); IF-Guard von CR-002 auf die qualifizierte Stichprobe STAGED (iso5667_10-G-8).' },
  }),
  WS01({
    symbol: 'qualified_grab_count_calc', widget: 'derived', ui_config: null, visible_when: QUALIFIED, verification_quote: Q.L305_307,
    create: { section_code: 'C', label_de: 'Anzahl Stichproben (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§3.4',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-01-D1 (count_rows über stichproben_qualifiziert); Zwilling des Eingabefelds qualified_grab_count (iso5667_10-D-1).' },
  }),
  WS01({
    symbol: 'qualified_grab_count_ok', widget: 'derived', ui_config: null, visible_when: QUALIFIED, verification_quote: Q.L305_307,
    create: { section_code: 'C', label_de: 'Mindestens fünf Stichproben (1 = erfüllt, 0 = nicht erfüllt)', data_type: 'number', unit: null, clause_reference: '§3.4',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-01-D2 — Anzahl der Zeilen ≥ 5 (S3_4.min_grabs, §3.4 „al menos cinco muestras puntuales“).' },
  }),

  // ---- ISO-5667-10-02: sampling points as N instances (§4.2 documentation + the §5 site-specific checks) ----
  WS02({
    symbol: 'probenahmestellen', widget: 'register',
    ui_config: {
      title: 'Probenahmestellen (puntos de muestreo, §4.2 / §5)', subtitle: 'Je Probenahmestelle eine Zeile: Identifikation, Ort, Fotos, Koordinaten, Strömungsart, Zugang, Technik (§4.2) und die standortspezifischen Prüfungen nach §5', add_label: '+ Probenahmestelle', placement: 'section',
      columns: [
        { key: 'kennung', label: 'Identifikation', type: 'text', required: true, aria_label: 'Identifikation der Probenahmestelle' },
        { key: 'location', label: 'Ort', type: 'text', aria_label: 'Ubicación del lugar' },
        { key: 'photos', label: 'Fotos', type: 'boolean', aria_label: 'Fotos vorhanden' },
        { key: 'coordinates', label: 'Koordinaten', type: 'text', aria_label: 'Coordenadas geográficas' },
        { key: 'flow_type', label: 'Strömungsart', type: 'enum', options: ['open', 'closed'], option_labels: { open: 'abierto (offen)', closed: 'cerrado (geschlossen)' }, aria_label: 'Tipo de flujo' },
        { key: 'access', label: 'Zugang', type: 'text', aria_label: 'Condiciones de acceso' },
        { key: 'technique', label: 'Probenahmetechnik', type: 'text', aria_label: 'Técnica de muestreo' },
        { key: 'well_mixed', label: 'gut durchmischt', type: 'boolean', aria_label: 'Abschnitt gut durchmischt und homogen (§4.2)' },
        { key: 'specific_site_type', label: 'Standorttyp (§5)', type: 'enum', required: true, options: [...SITE_TYPES], option_labels: { ...SITE_LABELS }, discriminator: true, aria_label: 'Spezifischer Standorttyp' },
        // §5.1 sewers / channels / manholes
        { key: 'restriction_downstream_diameters', label: 'Abstand stromab der Drossel (× Durchmesser)', type: 'number', min: 0, visible_when: SEWER, aria_label: 'Abstand stromabwärts der Drossel in Rohrdurchmessern' },
        { key: 'sampling_depth_fraction', label: 'Tiefe (Anteil der Wassertiefe)', type: 'number', min: 0, max: 1, visible_when: SEWER, placeholder: '0,33 … 0,5', aria_label: 'Probenahmetiefe als Anteil der Wassertiefe' },
        { key: 'restriction_ok', label: '≥ 3 × Durchmesser', type: 'derived', expr: RESTRICTION_OK_EXPR, display: 'badge', value_labels: { '1': '§5.1 Abstand ok', '0': '§5.1 Abstand < 3 × D' } },
        { key: 'depth_ok', label: 'Tiefe 1/3 … 1/2', type: 'derived', expr: DEPTH_OK_EXPR, display: 'badge', value_labels: { '1': '§5.1 Tiefe ok', '0': '§5.1 Tiefe außerhalb 1/3 … 1/2' } },
        // §5.2 wastewater-treatment plants
        { key: 'wwtp_objective', label: 'Probenahmeziel Kläranlage', type: 'enum', options: ['whole_plant_performance', 'individual_unit_control'], option_labels: { whole_plant_performance: 'control del rendimiento de toda la planta', individual_unit_control: 'control de las unidades de tratamiento individuales' }, visible_when: WWTP, aria_label: 'Objetivo del muestreo en la planta' },
        { key: 'bypass_assessed', label: 'Bypass-Ströme bewertet', type: 'boolean', visible_when: WWTP, aria_label: 'Relevanz der Bypass-Ströme bewertet (§5.2)' },
        // §5.4 cooling systems
        { key: 'cooling_type', label: 'Kühlsystem', type: 'enum', options: ['once_through', 'primary_secondary', 'closed'], option_labels: { once_through: 'flujo continuo', primary_secondary: 'circuito primario / secundario', closed: 'enfriamiento cerrado' }, visible_when: COOLING, aria_label: 'Tipo de sistema de refrigeración' },
        { key: 'cooling_runoff_s', label: 'Vorlaufzeit', type: 'number', unit: 's', min: 0, visible_when: COOLING, aria_label: 'Vorlaufzeit des Kühlwassers vor der Probenahme' },
        { key: 'upstream_of_biocide', label: 'stromauf der Biozid-Dosierung', type: 'boolean', visible_when: COOLING, aria_label: 'Probenahmestelle stromaufwärts der Biozid-Dosierung' },
        { key: 'runoff_ok', label: '≥ 30 s', type: 'derived', expr: RUNOFF_OK_EXPR, display: 'badge', value_labels: { '1': '§5.4 Vorlauf ok', '0': '§5.4 Vorlauf < 30 s' } },
      ],
      footer: ['stellen_count', 'stellen_site_fail'],
      note: `${Q.L397_398} Die Spalten nach dem Standorttyp zeigen nur die Prüfungen des gewählten §5-Abschnitts; die Einzelfelder derselben Angaben auf ISO-5667-10-02 / -04 bleiben bis zur Ratifizierung (iso5667_10-D-2 … D-11).`,
    },
    verification_quote: `${Q.L386_388} — ${Q.L397_398}`,
    create: { section_code: 'D', label_de: 'Probenahmestellen (je Stelle: Identifikation, Ort, Fotos, Koordinaten, Strömungsart, Zugang, Technik; §5-Prüfungen nach Standorttyp)', data_type: 'json', unit: null, clause_reference: '§4.2, §5.1, §5.2, §5.4',
      description: 'Plan 3: Zeilen je Probenahmestelle mit den §4.2-Dokumentationsangaben und den standortspezifischen Prüfungen (§5.1 Abstand ≥ 3 × D und Tiefe 1/3 … 1/2, §5.2 Ziel / Bypass, §5.4 Kühlsystem / Vorlauf ≥ 30 s / Biozid); Anzahl → stellen_count (ISO-5667-10-02-D1), Zeilen mit nicht erfüllter §5-Prüfung → stellen_site_fail (-D2). Die Einzelskalare bleiben (iso5667_10-D-2 … D-11).' },
  }),
  WS02({
    symbol: 'stellen_count', widget: 'derived', ui_config: null, verification_quote: Q.L386_388,
    create: { section_code: 'D', label_de: 'Anzahl dokumentierter Probenahmestellen', data_type: 'number', unit: null, clause_reference: '§4.2',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-02-D1 (count_rows über probenahmestellen).' },
  }),
  WS02({
    symbol: 'stellen_site_fail', widget: 'derived', ui_config: null, verification_quote: `${Q.L555_557} — ${Q.L705_706}`,
    create: { section_code: 'D', label_de: 'Probenahmestellen mit nicht erfüllter §5-Prüfung (Abstand / Tiefe / Vorlauf)', data_type: 'number', unit: null, clause_reference: '§5.1, §5.4',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-02-D2 — Zeilen, deren Standorttyp-Prüfung (restriction_ok / depth_ok / runoff_ok) 0 ist; ein Gate darauf ist STAGED (iso5667_10-G-6).' },
  }),

  // ---- ISO-5667-10-03: the sampling schedule (Fórmula 1 / 2) as rows k = 1 … n ----
  WS03({
    symbol: 'probenahmetermine', widget: 'register',
    ui_config: {
      title: 'Probenahmetermine nach Fórmula (1) / (2) (§4.3.2)', subtitle: 'Je Termin eine Zeile k = 1 … n; Tag (n > ~25: A + 365·k/n) bzw. Woche (n < ~25: A + 52·k/n) wird aus A und n dieses Arbeitsblatts berechnet', add_label: '+ Termin', placement: 'section',
      columns: [
        { key: 'k', label: 'k', type: 'number', required: true, min: 1, aria_label: 'Probenindex k' },
        { key: 'day_or_week', label: 'Tag (Fórmula 1) / Woche (Fórmula 2)', type: 'derived', expr: DAY_OR_WEEK_EXPR },
        { key: 'date_planned', label: 'geplantes Datum', type: 'date', aria_label: 'geplantes Datum des Termins' },
        { key: 'done', label: 'durchgeführt', type: 'boolean', aria_label: 'Probenahme durchgeführt' },
      ],
      footer: ['period_length_calc', 'A_min_calc', 'A_in_range', 'termine_count', 'termine_done'],
      note: `${Q.L478_479} ${Q.L491_492} Die n Zeilen (k = 1 … n) sind von Hand anzulegen — der Editor erzeugt keine Zeilenfolge (iso5667_10-F-1); A und number_of_samples sind die Felder dieses Arbeitsblatts (Zeilenwerte lesen sie mit); n = 25 genau fällt auf Fórmula (2) (iso5667_10-J-1).`,
    },
    visible_when: YEAR, // L475: "si el período de muestreo abarca un año, los días de muestreo pueden determinarse mediante una fórmula"
    verification_quote: `${Q.L475_476} — ${Q.L478_479}`,
    create: { section_code: 'C', label_de: 'Probenahmetermine k = 1 … n (Fórmula 1: Tage, Fórmula 2: Wochen)', data_type: 'json', unit: null, clause_reference: '§4.3.2, Fórmula (1), Fórmula (2)',
      description: 'Plan 3: Zeilen je Termin mit dem berechneten Tag bzw. der Woche (Fórmula 1 für n > ~25, Fórmula 2 für n < ~25, aus A und number_of_samples); Anzahl → termine_count (ISO-5667-10-03-D4), durchgeführt → termine_done (-D5). Die Einzelskalare k / sampling_day_k / sampling_week_k bleiben (iso5667_10-D-12 … D-14); Umstellung von CR-008 STAGED (iso5667_10-G-9).' },
  }),
  WS03({
    symbol: 'period_length_calc', widget: 'derived', ui_config: null, visible_when: YEAR, verification_quote: Q.L478_479,
    create: { section_code: 'C', label_de: 'Periodenlänge der gewählten Fórmula (365 Tage bei n > ~25, 52 Wochen bei n < ~25)', data_type: 'number', unit: null, clause_reference: '§4.3.2',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-03-D1 (S4_3_2 nach der Probenanzahl).' },
  }),
  WS03({
    symbol: 'A_min_calc', widget: 'derived', ui_config: null, visible_when: YEAR, verification_quote: `${Q.L488_489} — ${Q.L499_500}`,
    create: { section_code: 'C', label_de: 'Untere Grenze der Zufallszahl A (−365/n bzw. −52/n)', data_type: 'number', unit: null, clause_reference: '§4.3.2',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-03-D2 — „A Número aleatorio en un intervalo entre – 365/n y 0“ bzw. „entre – 52/n y 0“.' },
  }),
  WS03({
    symbol: 'A_in_range', widget: 'derived', ui_config: null, visible_when: YEAR, verification_quote: `${Q.L488_489} — ${Q.L499_500}`,
    create: { section_code: 'C', label_de: 'A im Intervall (−365/n bzw. −52/n … 0) (1 = ja, 0 = nein)', data_type: 'number', unit: null, clause_reference: '§4.3.2',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-03-D3; die Zufallszahl A bleibt Eingabe (SR-2: das System zieht nicht) — ein Gate darauf ist STAGED (iso5667_10-G-9).' },
  }),
  WS03({
    symbol: 'termine_count', widget: 'derived', ui_config: null, visible_when: YEAR, verification_quote: Q.L470_473,
    create: { section_code: 'C', label_de: 'Anzahl angelegter Probenahmetermine', data_type: 'number', unit: null, clause_reference: '§4.3.2',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-03-D4 (count_rows über probenahmetermine); soll n = number_of_samples erreichen (Gate STAGED, iso5667_10-G-9).' },
  }),
  WS03({
    symbol: 'termine_done', widget: 'derived', ui_config: null, visible_when: YEAR, verification_quote: Q.L505_508,
    create: { section_code: 'C', label_de: 'Anzahl durchgeführter Probenahmetermine', data_type: 'number', unit: null, clause_reference: '§4.3.2',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-03-D5 (count_rows über probenahmetermine, done == true).' },
  }),

  // ---- ISO-5667-10-04: the §5 blocks switch on the site type (driver on this worksheet) ----
  WS04({ symbol: 'sampling_depth_fraction', widget: 'scalar', ui_config: null, visible_when: SEWER, verification_quote: Q.L560_564 }),
  WS04({ symbol: 'wwtp_sampling_objective', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: WWTP, verification_quote: Q.L581_589 }),
  WS04({ symbol: 'bypass_flow_assessed', widget: 'attestation', ui_config: null, visible_when: WWTP, verification_quote: Q.L591_593 }),
  WS04({ symbol: 'cooling_system_type', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: COOLING, verification_quote: Q.L670_671 }),
  WS04({ symbol: 'upstream_of_biocide', widget: 'attestation', ui_config: null, visible_when: COOLING, verification_quote: Q.L706_708 }),

  // ---- ISO-5667-10-05: grab vs composite; the CTCV precondition (§7.2.2.4) ----
  WS05({ symbol: 'grab_method', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: GRAB, verification_quote: Q.L719_728 }),
  WS05({
    symbol: 'flow_cv_pct', widget: 'scalar', ui_config: null, visible_when: CTCV, verification_quote: Q.L1026_1028,
    create: { section_code: 'D', label_de: 'Variationskoeffizient des Momentandurchflusses im Probenahmezeitraum (coeficiente de variación)', data_type: 'number', unit: '%', clause_reference: '§7.2.2.4',
      description: 'Plan 3: Eingabe für die CTCV-Anwendungsbedingung — „cuando el caudal instantáneo del efluente varía poco en el tiempo (coeficiente de variación de la repetibilidad del 20 % por término medio …)“; Vergleich → ctcv_applicable (ISO-5667-10-05-D2).' },
  }),
  WS05({
    symbol: 'ctcv_cv_max', widget: 'derived', ui_config: null, visible_when: CTCV, verification_quote: Q.L1026_1028,
    create: { section_code: 'D', label_de: 'Zulässiger Variationskoeffizient für CTCV nach §7.2.2.4', data_type: 'number', unit: '%', clause_reference: '§7.2.2.4',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-05-D1 (S7_2_2_4.cv_max_pct = 20).' },
  }),
  WS05({
    symbol: 'ctcv_applicable', widget: 'derived', ui_config: null, visible_when: CTCV, verification_quote: `${Q.L1026_1028} — ${Q.L1030_1031}`,
    create: { section_code: 'D', label_de: 'CTCV-Bedingung erfüllt (1 = Durchfluss variiert wenig, 0 = nicht)', data_type: 'number', unit: null, clause_reference: '§7.2.2.4',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-05-D2 — flow_cv_pct ≤ 20 %; ein Gate darauf ist nicht gestellt („puede aplicarse … por ejemplo“, Anhaltswert).' },
  }),

  // ---- ISO-5667-10-06: composite duration → interval limit; tube bore → velocity limit; CTCV bottles (Fórmula 3); mode / storage visibility ----
  WS06({
    symbol: 'composite_duration_band', widget: 'select_one', ui_config: null,
    enum_values: [
      { value: 'h2', label_de: 'muestra mixta de 2 horas (Mischprobe 2 h)', order_index: 0 },   // L861–L862
      { value: 'h24', label_de: 'muestra mixta de 24 horas (Mischprobe 24 h)', order_index: 1 }, // L862
    ],
    visible_when: COMPOSITE, verification_quote: `${Q.L860_862} — ${Q.L864_867}`,
    create: { section_code: 'C', label_de: 'Dauer der Mischprobe (2 h / 24 h, §7.2.1)', data_type: 'enum', unit: null, clause_reference: '§7.2.1',
      description: 'Plan 3: Treiber des Höchstintervalls zwischen Einzelproben — 5 min bei der 2-h-Mischprobe, 30 min bei der 24-h-Mischprobe (füllt composite_interval_max); CR-016 prüft heute nur die 30 min — Umstellung STAGED (iso5667_10-G-3).' },
  }),
  WS06({
    symbol: 'composite_interval_max', widget: 'lookup_fill', ui_config: { source_label: '§7.2.1' },
    lookup: { table_code: 'S7_2_1', role: 'limit', keys: [{ column: 'duration', from_symbol: 'composite_duration_band' }], value: 'max_interval_min' },
    visible_when: COMPOSITE, verification_quote: Q.L860_862,
    create: { section_code: 'C', label_de: 'Höchstintervall zwischen Einzelproben nach §7.2.1 (2 h → 5 min, 24 h → 30 min)', data_type: 'number', unit: 'min', clause_reference: '§7.2.1',
      description: 'Plan 3: aus der Dauer der Mischprobe gefüllt (locked — „No deben superar“); das Eingabefeld composite_interval (CR-016) bleibt — Vergleich composite_interval ≤ composite_interval_max STAGED (iso5667_10-G-3).' },
  }),
  WS06({
    symbol: 'suction_velocity_min', widget: 'derived', ui_config: null, verification_quote: `${Q.L922_923} — ${Q.L928_930}`,
    create: { section_code: 'C', label_de: 'Mindest-Ansauggeschwindigkeit nach §7.2.2.1 (0,5 m/s; 0,3 m/s ab 12 mm Innendurchmesser, NOTA 1)', data_type: 'number', unit: 'm/s', clause_reference: '§7.2.2.1',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-06-D4 (S7_2_2_1_TUBE nach dem Innendurchmesser des Ansaugschlauchs); CR-017 prüft heute fest 0,5 m/s — Umstellung STAGED (iso5667_10-G-4).' },
  }),
  WS06({
    symbol: 'flaschen_ctcv', widget: 'register',
    ui_config: {
      title: 'Einzelflaschen der zeitproportionalen Mischprobe (Fórmula 3, §7.2.2.3)', subtitle: 'Je Flasche n eine Zeile: abgegebenes Volumen M3n; Vn = Vfinal · (M3n / M3total) aus Vfinal und M3total dieses Arbeitsblatts', add_label: '+ Flasche', placement: 'section',
      columns: [
        { key: 'n', label: 'Flasche n', type: 'number', required: true, min: 1, aria_label: 'Flaschennummer n' },
        { key: 'm3_n', label: 'M3n', type: 'number', unit: 'm³', required: true, min: 0, aria_label: 'Abgegebenes Volumen während der Flasche n M3n' },
        { key: 'v_n', label: 'Vn', type: 'derived', expr: V_N_EXPR },
      ],
      footer: ['flaschen_count', 'v_n_sum', 'm3_n_sum'],
      note: `${Q.L998_1003} Σ Vn = Vfinal und Σ M3n = M3total prüfen (Fußzeile); bei der Einflaschen-Variante des §7.2.2.4 bleibt das Register leer (iso5667_10-J-2). Die Einzelfelder M3_n / V_n bleiben (iso5667_10-D-15 / D-16).`,
    },
    visible_when: CTCV, // §7.2.2.3 / §7.2.2.4 — the time-proportional multi-bottle composite reconstituted per flow
    verification_quote: `${Q.L985_989} — ${Q.L1013_1023}`,
    create: { section_code: 'C', label_de: 'Einzelflaschen n mit M3n und Vn nach Fórmula (3)', data_type: 'json', unit: null, clause_reference: '§7.2.2.3, Fórmula (3)',
      description: 'Plan 3: Zeilen je Flasche mit Vn = Vfinal · (M3n / M3total) (Fórmula 3, Legende L1017–L1023); Σ Vn → v_n_sum (ISO-5667-10-06-D1), Σ M3n → m3_n_sum (-D2), Anzahl → flaschen_count (-D3). Die prod-Gleichung 3 (V_n aus einem M3_n) bleibt verifiziert; IF-Guard von CR-019 STAGED (iso5667_10-G-7).' },
  }),
  WS06({
    symbol: 'v_n_sum', widget: 'derived', ui_config: null, visible_when: CTCV, verification_quote: Q.L1017_1023,
    create: { section_code: 'C', label_de: 'Σ Vn über alle Flaschen (soll = Vfinal)', data_type: 'number', unit: 'ml', clause_reference: '§7.2.2.3, Fórmula (3)',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-06-D1 (sum_rows über flaschen_ctcv.v_n); „Vfinal: volumen total (ml) de las botellas del laboratorio“.' },
  }),
  WS06({
    symbol: 'm3_n_sum', widget: 'derived', ui_config: null, visible_when: CTCV, verification_quote: Q.L1017_1023,
    create: { section_code: 'C', label_de: 'Σ M3n über alle Flaschen (soll = M3total)', data_type: 'number', unit: 'm³', clause_reference: '§7.2.2.3, Fórmula (3)',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-06-D2 (sum_rows über flaschen_ctcv.m3_n); „M3total: volumen total descargado (M3)“.' },
  }),
  WS06({
    symbol: 'flaschen_count', widget: 'derived', ui_config: null, visible_when: CTCV, verification_quote: Q.L985_989,
    create: { section_code: 'C', label_de: 'Anzahl Einzelflaschen', data_type: 'number', unit: null, clause_reference: '§7.2.2.3',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-06-D3 (count_rows über flaschen_ctcv); §11.1 verlangt die Zahl der Elementarproben („número de muestras elementales tomadas“).' },
  }),
  WS06({ symbol: 'sampler_flow_linked', widget: 'attestation', ui_config: null, visible_when: FLOW_PROPORTIONAL, verification_quote: Q.L965_967 }),
  WS06({
    symbol: 'event_trigger_criterion', widget: 'scalar', ui_config: null, visible_when: EVENT, verification_quote: `${Q.L348_351} — ${Q.L1199_1202}`,
    create: { section_code: 'D', label_de: 'Auslösekriterium der ereignisgesteuerten Probenahme (criterio predeterminado: precipitaciones, conductividad, pH, sustancia contaminante …)', data_type: 'text', unit: null, clause_reference: '§3.10, §7.3.4',
      description: 'Plan 3: Freitext für das vorbestimmte Kriterium, das die Probenahme auslöst (§3.10) — nur bei ereignisgesteuerter Probenahme sichtbar; die Norm druckt Beispiele, keine feste Optionsliste.' },
  }),
  WS06({ symbol: 'tank_mixing_maintained', widget: 'attestation', ui_config: null, visible_when: IN_STORAGE, verification_quote: `${Q.L374} — ${Q.L1216_1222}` }),

  // ---- ISO-5667-10-07: samplers as N devices; tank equipment only for storage sampling ----
  WS07({
    symbol: 'probenahmegeraete', widget: 'register',
    ui_config: {
      title: 'Probenahmegeräte (muestreadores, §8.2 / §8.3)', subtitle: 'Je Gerät eine Zeile: Bauart, Pumpentechnologie, Einheitsvolumen gegen das gedruckte Minimum (§7.2.2.1: 50 ml Vakuumpumpe, 25 ml Inline-Kolben), Kühlung, Material, Reinigung', add_label: '+ Gerät', placement: 'section',
      columns: [
        { key: 'label', label: 'Gerät', type: 'text', required: true, aria_label: 'Bezeichnung des Geräts' },
        { key: 'mobility', label: 'Bauart', type: 'enum', options: ['fixed', 'portable'], option_labels: { fixed: 'fijo (fest)', portable: 'portátil (tragbar)' }, aria_label: 'Bauart fest / tragbar' },
        { key: 'pump_technology', label: 'Pumpentechnologie', type: 'enum', required: true, options: [...PUMP_TECHNOLOGIES], option_labels: { vacuum: 'bomba de vacío (VAP)', peristaltic: 'bomba peristáltica (PP)', inline_piston: 'émbolo en línea', external: 'sistemas de bombeo externos' }, discriminator: true, aria_label: 'Pumpentechnologie' },
        { key: 'unit_volume_ml', label: 'Einheitsvolumen', type: 'number', unit: 'ml', min: 0, aria_label: 'Einheitsvolumen des Geräts' },
        { key: 'unit_volume_min', label: 'Minimum §7.2.2.1', type: 'derived', expr: UNIT_VOLUME_MIN_EXPR },
        { key: 'unit_volume_ok', label: 'Einheitsvolumen', type: 'derived', expr: UNIT_VOLUME_OK_EXPR, display: 'badge', value_labels: { '1': 'Einheitsvolumen ≥ Minimum (oder kein gedruckter Mindestwert)', '0': 'Einheitsvolumen unter dem Minimum oder nicht eingetragen' } },
        { key: 'refrigerated', label: 'gekühlt', type: 'boolean', aria_label: 'Gerät mit Kühlkammer (§8.2)' },
        { key: 'material_compatible', label: 'Material kompatibel', type: 'boolean', aria_label: 'Material kompatibel mit dem Zielparameter (§8.2 / Anexo E)' },
        { key: 'cleaned_checked', label: 'gereinigt & geprüft', type: 'boolean', aria_label: 'Vor der Probenahme gereinigt (Anexo C) und geprüft (10.3)' },
      ],
      footer: ['geraete_count', 'geraete_unit_volume_fail'],
      note: `${Q.L936_937} Für bomba peristáltica und sistemas de bombeo externos druckt die Norm kein Mindestvolumen (iso5667_10-E-1) — die Zeile gilt dann als nicht prüfbar (Badge 1). Die Einzelfelder sampler_mobility / pump_technology / sampler_refrigerated / material_compatible / equipment_cleaned_checked bleiben (iso5667_10-D-17 … D-21).`,
    },
    verification_quote: `${Q.L1304_1305} — ${Q.L1318_1321} — ${Q.L936_937}`,
    create: { section_code: 'C', label_de: 'Probenahmegeräte (je Gerät: Bauart, Pumpentechnologie, Einheitsvolumen, Kühlung, Material, Reinigung)', data_type: 'json', unit: null, clause_reference: '§8.2, §8.3.1, §7.2.2.1',
      description: 'Plan 3: Zeilen je Probenahmegerät; das Mindest-Einheitsvolumen je Pumpentechnologie (S7_2_2_1_PUMP: 50 ml Vakuum, 25 ml Inline-Kolben) wird je Zeile geprüft; Anzahl → geraete_count (ISO-5667-10-07-D1), Zeilen unter dem Minimum → geraete_unit_volume_fail (-D2). CR-018 prüft unit_volume auf ISO-5667-10-06 fest gegen 25 ml — Umstellung nach Pumpentechnologie STAGED (iso5667_10-G-5).' },
  }),
  WS07({
    symbol: 'geraete_count', widget: 'derived', ui_config: null, verification_quote: Q.L1304_1305,
    create: { section_code: 'C', label_de: 'Anzahl erfasster Probenahmegeräte', data_type: 'number', unit: null, clause_reference: '§8.2',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-07-D1 (count_rows über probenahmegeraete).' },
  }),
  WS07({
    symbol: 'geraete_unit_volume_fail', widget: 'derived', ui_config: null, verification_quote: Q.L934_937,
    create: { section_code: 'C', label_de: 'Geräte mit Einheitsvolumen unter dem gedruckten Minimum (§7.2.2.1)', data_type: 'number', unit: null, clause_reference: '§7.2.2.1',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-07-D2 (count_rows über probenahmegeraete, unit_volume_ok == 0); ein Gate darauf ist STAGED (iso5667_10-G-5).' },
  }),
  // representativeness_mode (ISO-5667-10-02) is inherited on -04 / -06 but NOT on -07 — both rules are `pending` (visible, inert) until iso5667_10-C-1 adds -07.
  WS07({ symbol: 'tank_mixing_system', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: IN_STORAGE, verification_quote: `${Q.L374} — ${Q.L1415_1428}` }),
  WS07({ symbol: 'tank_sampling_device', widget: 'select_one', ui_config: null, enum_values: 'keep_prod', visible_when: IN_STORAGE, verification_quote: `${Q.L374} — ${Q.L1434_1452}` }),

  // ---- ISO-5667-10-08: homogeniser by collected volume (§9.1) ----
  WS08({
    symbol: 'homogenizer_mechanical_required', widget: 'derived', ui_config: null, verification_quote: `${Q.L1474_1477} — ${Q.L1486_1487}`,
    create: { section_code: 'C', label_de: 'Mechanischer / magnetischer Homogenisierer erforderlich (1 = Volumen > 5 l, 0 = ≤ 5 l Labormethode)', data_type: 'number', unit: null, clause_reference: '§9.1',
      description: 'Plan 3: Ausgabe der Gleichung ISO-5667-10-08-D1 (collected_volume > S9_1.threshold_l = 5 l ⇒ 1); das Gate „homogenizer_type == mechanical“ unter dieser Bedingung ist STAGED (iso5667_10-G-2, „deberían utilizarse“ ⇒ warn).' },
  }),
];

/**
 * No section rules: every ISO-5667-10 section either holds a consumed / gate-read field (-03 B/C, -04 B/E,
 * -05 C/D, -06 C/E, -07 E) or is field-less (K / M / J / A on several worksheets — an inert rule).
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
