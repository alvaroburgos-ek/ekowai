/**
 * DWA-A-262E — Plan 3 Task 3 field configs (registers, selections, lookup_fill,
 * visibility) as DATA for `scripts/regulation-tables/emit-field-configs-sql.ts a262e`.
 *
 * Every `verification_quote` is lifted verbatim (whitespace-normalised) from
 * the transcript `Desktop\Guidelines\DWA-A-262E\DWA-A_262E (2).md` (English
 * edition); the line is in the constant's name. Prod facts come from the
 * captured `a262e.prior.json` (2026-09-17, read-only): every worksheet carries
 * the same nine coded sections A (Purpose) · B (Input Parameters) · C
 * (Worksheet-Specific Content) · D (Results / Derived Values) · F (Results
 * Summary) · J (Output Transfer Table) · K (Notes) · L (Approval) · M
 * (Workflow Connection); fields live in B/C/D/F only. Enum tokens below are
 * the captured prod `enum_values` (G-A3: table key strings equal them exactly).
 *
 * What is deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/a262e-STAGED-plan3-rulings.sql):
 *   - lookup_fill on the EXISTING A262-09 B_CSB / B_BSB5 / B_TKN — their key
 *     `pretreatment_selected` (A262-07) is not consumed by A262-09, and the
 *     widget hides the input while its keys are missing (code read in-session:
 *     `lookup-fill-field.tsx` renders the read-only box on `keys_missing`), so
 *     binding them would take the engineer's input away → the Tab.-1 fills are
 *     CREATED next to the selection on A262-07 (`B_CSB_tab1` …) and the A262-09
 *     re-point is a262e-E-3 / a262e-C-3;
 *   - field visible_when on the A262-29 lining block (geomembrane_* /
 *     mineral_seal_* / lava_sand_clay_fraction_pct) — every one is consumed by
 *     A262-31 (or A262-23); the emitter refuses hiding a producer → a262e-C-4,
 *     gates a262e-G-3 / G-4;
 *   - section rules on producer sections (A262-05 B/D/F, -06 D/F, -12 B, -14 B,
 *     -15 B, -16 B, -19 B/D, -20 B, -23 B, -25 B/D/F, -28 F) → a262e-C-1;
 *   - `system_size_category` is not consumed on A262-11…-16 / -19…-23 and
 *     `filter_type_KomKA` (A262-18) has no consumers at all: the filter-type
 *     worksheets are keyed on `filter_type` (A262-10, consumed by all of them)
 *     with `system_size_category` in the same AND (a missing driver never
 *     hides; a wrong filter_type does) → a262e-C-2, token map a262e-E-1.
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';

const STD = 'DWA-A-262E';

// ---- prod enum tokens (captured a262e.prior.json) ----
export const FILTER_TYPE_TOKENS = ['vf_sand_0_2', 'two_stage_vf_gravel_sand', 'vf_coarse_sand_0_4', 'aerated_vf_gravel_8_16', 'vf_lava_sand_0_4', 'two_layer_filter_trench', 'aerated_hf_gravel_8_16', 'hf_coarse_sand_or_gravel_downstream', 'raw_wastewater_filter'] as const;
export const FILTER_TYPE_LABELS: Record<(typeof FILTER_TYPE_TOKENS)[number], string> = {
  vf_sand_0_2: 'VF Sand 0-2 mm', two_stage_vf_gravel_sand: 'Zweistufiger VF Feinkies+Grobsand', vf_coarse_sand_0_4: 'VF Grobsand 0-4 mm', aerated_vf_gravel_8_16: 'Aktiv belüfteter VF Kies 8-16 mm',
  vf_lava_sand_0_4: 'VF Lavasand 0-4 mm', two_layer_filter_trench: 'Zweischicht-Filtergraben', aerated_hf_gravel_8_16: 'Aktiv belüfteter HF Kies 8-16 mm', hf_coarse_sand_or_gravel_downstream: 'HF Grobsand/Feinkies (nachgeschaltet)', raw_wastewater_filter: 'Rohabwasser-Filter',
};
export const SYSTEM_SIZE_TOKENS = ['small_wwts', 'municipal_wwtp'] as const;
export const SEWER_TOKENS = ['separate_sewer', 'combined_sewer', 'no_sewer'] as const;

// ---- lifted cue sentences (transcript line in the name) ----
const L296 = 'I small wastewater treatment systems treating domestic wastewater with an inflow of up to 50 P ;';
const L302 = String.raw`Generally, the treatment plants described herein are able to meet the wastewater treatment requirements according to the Size Class \#1, Appendix 1, Part C of the German Wastewater Ordinance ( $\mathrm{BOD}_{5} \leq 40 \mathrm{mg} / \mathrm{l}, \mathrm{COD} \leq 150 \mathrm{mg} / \mathrm{l}$ in randomly collected samples; four out of five samples must be within the limit).`;
const L396 = 'Small wastewater treatment systems are defined as facilities that treat flows up to 50 P lunit for population) in accordance with DIN EN 12566, and which treat only domestic or similar wastewater flows.';
const L573 = 'If there is no available data about the quantity and quality of the wastewater to be treated, it must be decided whether the missing data should be determined by additional measurements or if it should be estimated based on empirical values. For the design of filters for municipal wastewater treatment plants based on empirical values, the wastewater pollutant loads per population equivalent given in Table 1 must be used.';
const L579 = 'Maximum wastewater flow from separate sewer networks:';
const L633 = 'Maximum wastewater flow for combined sewer networks with upstream combined sewer treatment (stormwater tank with overflow) according to Standard ATV-A 128:';
const L636 = String.raw`Q_{\mathrm{M}}=f_{\mathrm{S}, \mathrm{QM}} \cdot Q_{\mathrm{S}, \mathrm{~d}, \mathrm{aM}}+Q_{\mathrm{F}} \geq \sum Q_{\mathrm{Dr}, \mathrm{RUB}}(\mathrm{l} / \mathrm{s}) \tag{6}`;
const L643 = 'Maximum wastewater flow for combined sewer networks with a diversion via an upstream stormwater overflow (without storage volume) according to Standard ATV-A 128:';
const L646 = String.raw`Q_{M} \geq \sum Q_{\mathrm{Dr}, \mathrm{RU}} \geq \sum Q_{\text {krit }}(\mathrm{l} / \mathrm{s}) \tag{8}`;
const L670 = 'Table 2 gives informative specific loads for greywater.';
const L676 = String.raw`\hline Parameter & Greywater Median (from Standard DWA-A 272:2014) & Greywater Average (from Sievers et al. 2:2014) \\`;
const L700 = String.raw`The required size of the multicompartment septic tank must be at least $300 \mathrm{l} / \mathrm{P}$ and a minimum volume of $3,000 \mathrm{l}$.`;
const L742 = 'Sizing is based on the specific area, as measured on the upper surface of the filter, and the permissible hydraulic load (the larger of the two values determines the design), and differs depending on the type of sewer network (separated or combined). The requirements are given in Table 3.';
const L793 = 'The specific hydraulic loading requirements of Section 4.3.3 must be verified. Downstream filter areas may not be considered.';
const L875 = String.raw`\hline Specific length of infiltration pipe & $l_{\text {Rieselr }}$ & m/P & $\geq 6$ \\`;
const L876 = String.raw`\hline Length of each infiltration pipe & $L_{\text {Rieselr }}$ & m & $\leq 18$ \\`;
const L1031 = 'When used in a combined sewer network, an overflow filter is required in addition to the minimum of two parallel vertical filters (also referred to as main filters). The overflow filter functions essentially as a retention soil filter (Figure 5).';
const L1062 = 'For seasonal operation during summer, vertical flow treatment plants can be dimensioned with a reduction of required area as measured on the filter surface. A prerequisite for a reduced area is that the location must have basic facilities, and is not in an extreme location. The operation of a seasonal treatment facility is comprised of a period of high loading followed by a regeneration phase. During high load period, the given design boundaries may be exceeded within defined limits.';
const L1119 = String.raw`The specific area of a filter for greywater treatment can be dimensioned with $50 \%$ of the specific surface required for a conventional filter treating domestic wastewater. The specific composition of the greywater must be considered (see informative values in Section 4.1.3: Table 2).`;
const L1127 = 'For determination of the required filter area, the upper surface of the filter is used. The requirements are provided in Table 15:';
const L1136 = String.raw`& $q_{F o, T}$ & $<12^{\circ} \mathrm{C} \mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 80$ \\`;
const L1137 = String.raw`\hline & $q_{F o, T}$ & $\geq 12^{\circ} \mathrm{C} \mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 120^{*}$ \\`;
const L1138 = String.raw`& $t_{\text {Sicker,min,aM }}$ & $<12^{\circ} \mathrm{Ch}$ & $\geq 6$ \\`;
const L1149 = String.raw`\subsection*{4.3.6.2 Horizontal Filter with Coarse Sand 0 mm to 4 mm or Gravel 2 mm to 8 mm}`;
const L1151 = 'Horizontal filters without active aeration can be used as an additional biological treatment step. They are operated with permanent saturation and must be designed according to the allowable mass and hydraulic loads. The requirements are provided in Table 16:';
const L1158 = String.raw`\hline Average specific daily CSB (COD) loading rate on the horizontal cross-section when the filter material is coarse sand & $f_{\text {A,ANF, CSB }}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 40$ \\`;
const L1159 = String.raw`\hline Average specific daily CSB (COD) loading rate on the horizontal cross-section when the filter material is gravel & $f_{\mathrm{A}, \mathrm{ANF}, \mathrm{CSB}}$ & $\mathrm{g} /\left(\mathrm{m}^{2} \cdot \mathrm{~d}\right)$ & $\leq 200$ \\`;
const L1187 = 'Table 17 summarizes the main design parameters for planted and unplanted filters used in small wastewater treatment systems.';
const L1189 = 'Table 18 summarizes the main design parameters for planted and unplanted filters used in municipal wastewater treatment plants.';
const L1295 = String.raw`\subsection*{4.5 Treatment Systems with Additional Requirements on the Effluent Quality}`;
const L1299 = String.raw`Requirements for nitrification of $S_{\mathrm{NH} 4} \leq 10 \mathrm{mg} / \mathrm{l}\left(\geq 12^{\circ} \mathrm{C}\right)$ can be fulfilled by all described vertical filters and actively aerated horizontal filters with gravel.`;

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS05 = on('A262-05');
const WS06 = on('A262-06');
const WS07 = on('A262-07');
const WS08 = on('A262-08');
const WS10 = on('A262-10');
const WS15 = on('A262-15');
const WS26 = on('A262-26');
const WS27 = on('A262-27');

const SEPARATE = "sewer_system_type == 'separate_sewer'";
const COMBINED = "sewer_system_type == 'combined_sewer'";

/** Tab.-1 fill created next to the selection (A262-07 D); see the header for why the A262-09 fields are not bound. */
const tab1Fill = (symbol: string, table: string, param: string, printedLoads: string): FieldConfigEntry => WS07({
  symbol, widget: 'lookup_fill', ui_config: { source_label: 'Tab. 1' },
  lookup: { table_code: table, role: 'value', keys: [{ column: 'pretreatment', from_symbol: 'pretreatment_selected' }], value: 'load_g_pd' },
  verification_quote: L573,
  create: { section_code: 'D', label_de: `Einwohnerspezifische ${param}-Fracht nach der gewählten Vorbehandlung (Tab. 1)`, data_type: 'number', unit: 'g/(P·d)', clause_reference: '§4.1.2, Tab. 1',
    description: `Plan 3: Tab.-1-Wert zur gewählten Vorbehandlung (${printedLoads}); Messwerte gehen vor ("If there is no available data … must be used", Provenienz: datenquelle_abwasser auf A262-03). Übernahme nach A262-09 (${symbol.replace('_tab1', '')}) STAGED (a262e-E-3 / a262e-C-3).` },
});

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- A262-05 (Trennsystem): the separate-sewer-only inputs of Gl. 4/5 (consumer-free in the capture) ----
  WS05({ symbol: 'm_multiplier', widget: 'scalar', ui_config: null, visible_when: SEPARATE, verification_quote: L579 }), // Gl. 5 lump-sum multiplier for Q_F + Q_R,Tr
  WS05({ symbol: 'q_R_Tr', widget: 'scalar', ui_config: null, visible_when: SEPARATE, verification_quote: L579 }),
  WS05({ symbol: 'Q_R_Tr', widget: 'scalar', ui_config: null, visible_when: SEPARATE, verification_quote: L579 }), // Gl. 4 output (consumer-free)

  // ---- A262-06 (Mischsystem): Gl. 6 (RÜB) vs Gl. 8 (RÜ) driver + the Σ register ----
  WS06({
    symbol: 'entlastung_typ', widget: 'select_one', ui_config: null,
    enum_values: [
      { value: 'rueb', label_de: 'Regenüberlaufbecken — upstream combined sewer treatment (stormwater tank with overflow), Gl. 6', order_index: 0 }, // L633
      { value: 'rue', label_de: 'Regenüberlauf — diversion via an upstream stormwater overflow (without storage volume), Gl. 8', order_index: 1 },   // L643
    ],
    verification_quote: `${L633} — ${L643}`,
    create: { section_code: 'B', label_de: 'Art der vorgeschalteten Mischwasserbehandlung (Gl. 6 RÜB / Gl. 8 RÜ)', data_type: 'enum', unit: null, clause_reference: '§4.1.2, Gl. 6 / Gl. 8',
      description: 'Plan 3: Treiber der Q_M-Gleichung — Gl. 6 (Regenüberlaufbecken, Σ Q_Dr,RÜB) oder Gl. 8 (Regenüberlauf ohne Speichervolumen, Σ Q_Dr,RÜ ≥ Σ Q_krit); die Umschaltung der beiden Q_M-Gleichungen ist STAGED (a262e-R-1).' },
  }),
  WS06({
    symbol: 'ueberlaufbauwerke', widget: 'register',
    ui_config: {
      title: 'Überlaufbauwerke (Σ Q_Dr, Σ Q_krit)', subtitle: '§4.1.2 Gl. 6 / Gl. 8 — je Bauwerk Typ, Drosselabfluss Q_Dr und kritischer Abfluss Q_krit', add_label: '+ Bauwerk', placement: 'section',
      columns: [
        { key: 'label', label: 'Bezeichnung', type: 'text' },
        { key: 'type', label: 'Bauwerkstyp', type: 'enum', required: true, options: ['rueb', 'rue'], option_labels: { rueb: 'stormwater tank with overflow (RÜB)', rue: 'stormwater overflow (RÜ)' }, discriminator: true },
        { key: 'q_dr', label: 'Q_Dr', type: 'number', unit: 'l/s', required: true, min: 0, aria_label: 'Drosselabfluss Q_Dr' },
        { key: 'q_krit', label: 'Q_krit', type: 'number', unit: 'l/s', min: 0, visible_when: "type == 'rue'", aria_label: 'kritischer Abfluss Q_krit' },
      ],
      footer: ['Q_Dr_RUB_sum', 'Q_Dr_RU_sum', 'Q_krit_sum'],
    },
    verification_quote: `${L636} — ${L646}`,
    create: { section_code: 'B', label_de: 'Überlaufbauwerke des Mischsystems (Σ Q_Dr,RÜB / Σ Q_Dr,RÜ / Σ Q_krit)', data_type: 'json', unit: null, clause_reference: '§4.1.2, Gl. 6 / Gl. 8',
      description: 'Plan 3: Zeilen je Überlaufbauwerk (RÜB: Q_Dr; RÜ: Q_Dr und Q_krit); Σ → Q_Dr_RUB_sum (A262-06-D1), Q_Dr_RU_sum (A262-06-D2), Q_krit_sum (A262-06-D3); die Gates Q_M ≥ Σ sind STAGED (a262e-R-1).' },
  }),
  WS06({ symbol: 'Q_Dr_RUB_sum', widget: 'derived', ui_config: null, verification_quote: L636,
    create: { section_code: 'D', label_de: 'Σ Q_Dr,RÜB über die Regenüberlaufbecken (Gl. 6)', data_type: 'number', unit: 'l/s', clause_reference: '§4.1.2, Gl. 6', description: 'Plan 3: Ausgabe der Gleichung A262-06-D1 (sum_rows über ueberlaufbauwerke, Typ RÜB).' } }),
  WS06({ symbol: 'Q_Dr_RU_sum', widget: 'derived', ui_config: null, verification_quote: L646,
    create: { section_code: 'D', label_de: 'Σ Q_Dr,RÜ über die Regenüberläufe (Gl. 8)', data_type: 'number', unit: 'l/s', clause_reference: '§4.1.2, Gl. 8', description: 'Plan 3: Ausgabe der Gleichung A262-06-D2 (sum_rows über ueberlaufbauwerke, Typ RÜ).' } }),
  WS06({ symbol: 'Q_krit_sum', widget: 'derived', ui_config: null, verification_quote: L646,
    create: { section_code: 'D', label_de: 'Σ Q_krit über die Regenüberläufe (Gl. 8)', data_type: 'number', unit: 'l/s', clause_reference: '§4.1.2, Gl. 8', description: 'Plan 3: Ausgabe der Gleichung A262-06-D3 (sum_rows über ueberlaufbauwerke, Typ RÜ).' } }),

  // ---- A262-07 (Vorbehandlung): Tab.-1 loads and the §4.2 size floor keyed on the selection ----
  tab1Fill('B_CSB_tab1', 'TABLE1_CSB', 'CSB', 'CSB 80 / 25 / 60 g/(P·d)'),
  tab1Fill('B_BSB5_tab1', 'TABLE1_BSB5', 'BSB5', 'BSB5 40 / 10 / 30 g/(P·d)'),
  tab1Fill('B_TKN_tab1', 'TABLE1_TKN', 'TKN', 'TKN 10 / 4.4 (>12 °C) / 8.5 g/(P·d)'),
  WS07({
    symbol: 'V_VB_min', widget: 'lookup_fill', ui_config: { source_label: '§4.2' },
    lookup: { table_code: 'S4_2_VORBEHANDLUNG', role: 'limit', keys: [{ column: 'pretreatment', from_symbol: 'pretreatment_selected' }], value: 'v_min_l_p' },
    verification_quote: L700,
    create: { section_code: 'C', label_de: 'Mindestvolumen der Vorbehandlung je Einwohner nach §4.2 (300 l/P Mehrkammergrube · 200 l/P Rottebehälter · 75 l/P Emscherbrunnen · 1 200 l/P belüfteter Absetzteich)', data_type: 'number', unit: 'l/P', clause_reference: '§4.2.2–§4.2.7',
      description: 'Plan 3: Grenzwert aus S4_2_VORBEHANDLUNG zur gewählten Vorbehandlung (Absetzteich: Flächenwert 1,5 m²/P, keine Volumenzeile; Rohabwasserfilter: Tab. 3); das Gate V_Vorbehandlung ≥ V_VB_min · EZ ist STAGED (a262e-G-1).' },
  }),

  // ---- A262-08 (Ablauf): the sample register behind the four-out-of-five rule ----
  WS08({
    symbol: 'ablaufproben', widget: 'register',
    ui_config: {
      title: 'Ablaufproben (Stichproben)', subtitle: '§1 — BOD5 ≤ 40 mg/l, COD ≤ 150 mg/l in randomly collected samples; four out of five samples must be within the limit', add_label: '+ Probe', placement: 'section',
      columns: [
        { key: 'date', label: 'Datum', type: 'date', required: true },
        { key: 'csb', label: 'CSB (COD)', type: 'number', unit: 'mg/l', required: true, min: 0, aria_label: 'CSB der Probe' },
        { key: 'bsb5', label: 'BSB5 (BOD5)', type: 'number', unit: 'mg/l', min: 0, aria_label: 'BSB5 der Probe' },
        { key: 'nh4_n', label: 'NH4-N', type: 'number', unit: 'mg/l', min: 0, aria_label: 'NH4-N der Probe' },
        { key: 'temperature_c', label: 'Ablauftemperatur', type: 'number', unit: '°C', aria_label: 'Ablauftemperatur der Probe' },
      ],
      footer: ['csb_last5_ok', 'bsb5_last5_ok'],
      note: 'Zeilen in zeitlicher Reihenfolge eintragen — die 4-von-5-Regel liest die letzten fünf vollständigen Zeilen in Eintragsreihenfolge.',
    },
    verification_quote: L302,
    create: { section_code: 'C', label_de: 'Ablaufproben (Stichproben) für die 4-von-5-Regel', data_type: 'json', unit: null, clause_reference: '§1',
      description: 'Plan 3: Zeilen je Stichprobe (Datum, CSB, BSB5, NH4-N, Temperatur); Anzahl der letzten fünf Proben ≤ 150 mg/l CSB → csb_last5_ok (A262-08-D1), ≤ 40 mg/l BSB5 → bsb5_last5_ok (A262-08-D2); Gate ≥ 4 STAGED (a262e-G-9).' },
  }),
  WS08({ symbol: 'csb_last5_ok', widget: 'derived', ui_config: null, verification_quote: L302,
    create: { section_code: 'D', label_de: 'Anzahl der letzten fünf Proben mit CSB ≤ 150 mg/l (4-von-5-Regel)', data_type: 'number', unit: null, clause_reference: '§1', description: 'Plan 3: Ausgabe der Gleichung A262-08-D1 (count_rows über last_rows(ablaufproben, 5)); Gate csb_last5_ok ≥ 4 STAGED (a262e-G-9).' } }),
  WS08({ symbol: 'bsb5_last5_ok', widget: 'derived', ui_config: null, verification_quote: L302,
    create: { section_code: 'D', label_de: 'Anzahl der letzten fünf Proben mit BSB5 ≤ 40 mg/l (4-von-5-Regel)', data_type: 'number', unit: null, clause_reference: '§1', description: 'Plan 3: Ausgabe der Gleichung A262-08-D2 (count_rows über last_rows(ablaufproben, 5)); Gate bsb5_last5_ok ≥ 4 STAGED (a262e-G-9).' } }),

  // ---- A262-10 (Filtertyp-Inventar): the Filterstufen register the Phase-6 collapse will use ----
  WS10({
    symbol: 'filterstufen', widget: 'register',
    ui_config: {
      title: 'Filterstufen', subtitle: '§4.3 — je Filterstufe Typ, Fläche und Tabellengrenzwerte (Tab. 3–16, 17, 18)', add_label: '+ Filterstufe', placement: 'section',
      columns: [
        { key: 'label', label: 'Stufe', type: 'text', required: true },
        { key: 'stage_role', label: 'Rolle', type: 'enum', required: true, options: ['primary', 'main', 'polishing'], option_labels: { primary: 'Vorbehandlung (Rohabwasserfilter)', main: 'biologische Hauptstufe', polishing: 'Nachreinigung' } },
        { key: 'filter_type', label: 'Filtertyp', type: 'enum', required: true, options: [...FILTER_TYPE_TOKENS], option_labels: FILTER_TYPE_LABELS, discriminator: true },
        { key: 'system_size', label: 'Anlagengröße', type: 'enum', required: true, options: [...SYSTEM_SIZE_TOKENS], option_labels: { small_wwts: 'Kleinkläranlage (≤50 PE)', municipal_wwtp: 'Kommunale Kläranlage (>50 PE)' } },
        { key: 'sewer', label: 'Kanalsystem', type: 'enum', required: true, options: [...SEWER_TOKENS], option_labels: { separate_sewer: 'Trennsystem', combined_sewer: 'Mischsystem', no_sewer: 'Keine Kanalisation' } },
        // Tab. 3 / Tab. 12 / Tab. 14 print separate columns for separated (Tr) and combined (M) sewer networks; a plant without a sewer network reads the Tr column (a262e-J-1).
        { key: 'sewer_key', label: 'Tab.-Spalte', type: 'derived', expr: "if(sewer == 'combined_sewer', 'm', 'tr')", display: 'badge', value_labels: { tr: 'Tr (separated)', m: 'M (combined)' } },
        { key: 'cells', label: 'Anzahl Teilflächen', type: 'number', min: 1 },
        { key: 'area_m2', label: 'Filterfläche A_F', type: 'number', unit: 'm²', required: true, min: 0, aria_label: 'Filterfläche A_F' },
        { key: 'a_spez_min', label: 'A_spez,min (Tab.)', type: 'derived', expr: "lookup('TABLE_LIMITS', filter_type, system_size, sewer_key, 'a_spez_min')" }, // G-1 (three positional keys)
        { key: 'a_min_m2', label: 'A_min = EZ·A_spez', type: 'derived', expr: 'a_spez_min * EZ' }, // EZ from the worksheet scope (G-13 closed; consumer edit a262e-C-2)
        { key: 'a_abs_min_m2', label: 'A_min (Tab., absolut)', type: 'derived', expr: "lookup('TABLE_LIMITS', filter_type, system_size, sewer_key, 'a_min_m2')" }, // G-1
        { key: 'area_ok', label: 'A_F ≥ EZ·A_spez', type: 'derived', expr: 'if(area_m2 >= a_min_m2, 1, 0)', display: 'badge', value_labels: { '1': 'erfüllt', '0': 'unterschritten' } },
        { key: 'f_a_f_csb', label: 'f_A,F,CSB', type: 'number', unit: 'g/(m²·d)', min: 0 },
        { key: 'f_a_f_csb_max', label: 'max (Tab.)', type: 'derived', expr: "lookup('TABLE_LIMITS', filter_type, system_size, sewer_key, 'f_a_f_csb_max')" }, // G-1
        { key: 'q_f_t', label: 'q_F,T', type: 'number', unit: 'l/(m²·d)', min: 0 },
        { key: 'q_f_t_max', label: 'max (Tab.)', type: 'derived', expr: "lookup('TABLE_LIMITS', filter_type, system_size, sewer_key, 'q_f_t_max')" }, // G-1
        { key: 'q_beschickung', label: 'q_Beschickung', type: 'number', unit: 'l/(m²·min)', min: 0 },
        { key: 'q_beschickung_min', label: 'min (Tab.)', type: 'derived', expr: "lookup('TABLE_LIMITS', filter_type, system_size, sewer_key, 'q_beschickung_min')" }, // G-1
        { key: 'h_beschickung', label: 'h_Beschickung', type: 'number', unit: 'l/m²', min: 0 },
        { key: 'h_beschickung_min', label: 'min (Tab.)', type: 'derived', expr: "lookup('TABLE_LIMITS', filter_type, system_size, sewer_key, 'h_beschickung_min')" }, // G-1
        { key: 't_sicker_h', label: 't_Sicker,min,aM', type: 'number', unit: 'h', min: 0, visible_when: "system_size == 'municipal_wwtp'" },
        { key: 't_sicker_min', label: 'min (Tab.)', type: 'derived', expr: "lookup('TABLE_LIMITS', filter_type, system_size, sewer_key, 't_sicker_min')", visible_when: "system_size == 'municipal_wwtp'" }, // G-1
        { key: 'l_rieselr_m', label: 'Σ L_Rieselr', type: 'number', unit: 'm', min: 0, visible_when: "filter_type == 'two_layer_filter_trench'" },
        { key: 'a_awf_m2', label: 'A_AWF (Abschlagfilter)', type: 'number', unit: 'm²', min: 0, visible_when: "filter_type == 'vf_lava_sand_0_4' AND sewer == 'combined_sewer'" },
      ],
      footer: ['A_Fo_gesamt', 'filterstufen_area_fail'],
      note: L793,
    },
    verification_quote: `${L742} — ${L793} — ${L1187} — ${L1189}`,
    create: { section_code: 'B', label_de: 'Filterstufen (Typ × Anlagengröße × Kanalsystem → Grenzwerte Tab. 3–14)', data_type: 'json', unit: null, clause_reference: '§4.2.6, §4.3, §4.4, Tab. 3–18',
      description: 'Plan 3: Zeilen je Filterstufe (Rolle, Filtertyp, Anlagengröße, Kanalsystem, Fläche, Belastungswerte); Grenzwerte je Zeile aus TABLE_LIMITS; Σ Hauptstufenflächen → A_Fo_gesamt (A262-10-D1), Anzahl Zeilen unter EZ·A_spez → filterstufen_area_fail (A262-10-D2); die 13 Filtertyp-Arbeitsblätter bleiben bestehen (Ablösung Phase 6).' },
  }),
  WS10({ symbol: 'A_Fo_gesamt', widget: 'derived', ui_config: null, verification_quote: L793,
    create: { section_code: 'D', label_de: 'Σ Filterfläche der biologischen Hauptstufen (nachgeschaltete Filter nicht angerechnet)', data_type: 'number', unit: 'm²', clause_reference: '§4.3.1.1', description: 'Plan 3: Ausgabe der Gleichung A262-10-D1 (sum_rows über filterstufen, Rolle main).' } }),
  WS10({ symbol: 'filterstufen_area_fail', widget: 'derived', ui_config: null, verification_quote: `${L1187} — ${L1189}`,
    create: { section_code: 'D', label_de: 'Anzahl Hauptstufen mit A_F < EZ · A_spez,min (Tab. 3–14)', data_type: 'number', unit: null, clause_reference: '§4.3, Tab. 17 / Tab. 18', description: 'Plan 3: Ausgabe der Gleichung A262-10-D2 (count_rows über filterstufen); Gate == 0 STAGED (a262e-G-8).' } }),

  // ---- A262-15 (Filtergraben): infiltration pipes as rows ----
  WS15({
    symbol: 'rieselrohre', widget: 'register',
    ui_config: {
      title: 'Rieselrohre', subtitle: '§4.3.1.6 Tab. 8 — je Rieselrohr Länge (≤ 18 m) und Grabensohlenbreite', add_label: '+ Rieselrohr', placement: 'section',
      columns: [
        { key: 'label', label: 'Bezeichnung', type: 'text' },
        { key: 'length_m', label: 'L_Rieselr', type: 'number', unit: 'm', required: true, min: 0, aria_label: 'Länge des Rieselrohrs' },
        { key: 'width_m', label: 'B_FGR', type: 'number', unit: 'm', min: 0, aria_label: 'Breite der Grabensohle je Rieselrohr' },
      ],
      footer: ['L_Rieselr_sum', 'rieselrohr_max_len'],
    },
    verification_quote: `${L875} ${L876}`,
    create: { section_code: 'C', label_de: 'Rieselrohre des Filtergrabens (Tab. 8)', data_type: 'json', unit: null, clause_reference: '§4.3.1.6, Tab. 8',
      description: 'Plan 3: Zeilen je Rieselrohr (Länge, Sohlenbreite); Σ Länge → L_Rieselr_sum (A262-15-D1), längstes Rohr → rieselrohr_max_len (A262-15-D2); Gates Σ L ≥ 6 m/P · EZ und max ≤ 18 m STAGED (a262e-G-10).' },
  }),
  WS15({ symbol: 'L_Rieselr_sum', widget: 'derived', ui_config: null, verification_quote: L875,
    create: { section_code: 'D', label_de: 'Σ Rieselrohrlänge (Tab. 8: l_Rieselr ≥ 6 m/P)', data_type: 'number', unit: 'm', clause_reference: '§4.3.1.6, Tab. 8', description: 'Plan 3: Ausgabe der Gleichung A262-15-D1 (sum_rows über rieselrohre).' } }),
  WS15({ symbol: 'rieselrohr_max_len', widget: 'derived', ui_config: null, verification_quote: L876,
    create: { section_code: 'D', label_de: 'Längstes Rieselrohr (Tab. 8: L_Rieselr ≤ 18 m)', data_type: 'number', unit: 'm', clause_reference: '§4.3.1.6, Tab. 8', description: 'Plan 3: Ausgabe der Gleichung A262-15-D2 (max_rows über rieselrohre).' } }),

  // ---- A262-26 (Grauwasser): Tab. 2 source selection → B_CSB_Grauwasser fill ----
  WS26({
    symbol: 'grauwasser_quelle', widget: 'select_one', ui_config: null,
    enum_values: [
      { value: 'median', label_de: 'Greywater Median (from Standard DWA-A 272:2014)', order_index: 0 }, // L676
      { value: 'average', label_de: 'Greywater Average (from Sievers et al. 2:2014)', order_index: 1 }, // L676
    ],
    verification_quote: `${L670} — ${L676}`,
    create: { section_code: 'C', label_de: 'Quelle der Grauwasser-Frachten (Tab. 2: Median / Mittelwert)', data_type: 'enum', unit: null, clause_reference: '§4.1.3, Tab. 2',
      description: 'Plan 3: Treiber der Tab.-2-Zeile für B_CSB_Grauwasser (informativ, freie Wahl zwischen den beiden gedruckten Spalten).' },
  }),
  WS26({
    symbol: 'B_CSB_Grauwasser', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 2' },
    lookup: { table_code: 'TABLE2_CSB', role: 'value', keys: [{ column: 'source', from_symbol: 'grauwasser_quelle' }], value: 'load_g_pd' },
    verification_quote: L670,
  }),

  // ---- A262-27 (nachgeschaltete Filter): Tab. 16 material and Tab. 15 temperature band ----
  WS27({
    symbol: 'hf_material', widget: 'select_one', ui_config: null,
    enum_values: [
      { value: 'coarse_sand', label_de: 'coarse sand (0 mm to 4 mm)', order_index: 0 }, // L1149 / L1158
      { value: 'gravel', label_de: 'gravel (2 mm to 8 mm)', order_index: 1 },            // L1149 / L1159
    ],
    verification_quote: `${L1149} — ${L1151}`,
    create: { section_code: 'B', label_de: 'Filtermaterial des nachgeschalteten Horizontalfilters (Tab. 16)', data_type: 'enum', unit: null, clause_reference: '§4.3.6.2, Tab. 16',
      description: 'Plan 3: Treiber der Tab.-16-Zeile (Grobsand ≤ 40 / Kies ≤ 200 g/(m²·d) auf den Anströmquerschnitt).' },
  }),
  WS27({
    symbol: 'f_A_ANF_CSB_max', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 16' },
    lookup: { table_code: 'TABLE16', role: 'limit', keys: [{ column: 'material', from_symbol: 'hf_material' }], value: 'f_a_anf_csb_max' },
    verification_quote: `${L1158} ${L1159}`,
    create: { section_code: 'B', label_de: 'Zulässige CSB-Flächenbelastung des Anströmquerschnitts f_A,ANF,CSB (Tab. 16)', data_type: 'number', unit: 'g/(m²·d)', clause_reference: '§4.3.6.2, Tab. 16',
      description: 'Plan 3: Grenzwert aus TABLE16 zum gewählten Material; das Gate f_A_ANF_CSB ≤ f_A_ANF_CSB_max (ersetzt REQ-91 ≤ 200 auf A262-16) ist STAGED (a262e-G-2).' },
  }),
  WS27({
    symbol: 'polishing_temp_band', widget: 'select_one', ui_config: null,
    enum_values: [
      { value: 'lt12', label_de: '< 12 °C', order_index: 0 }, // L1136 / L1138
      { value: 'ge12', label_de: '≥ 12 °C', order_index: 1 }, // L1137 / L1139
    ],
    verification_quote: `${L1127} — ${L1136} ${L1137}`,
    create: { section_code: 'B', label_de: 'Ablauftemperaturband für VF Sand 0–2 mm als Nachreinigungsstufe (Tab. 15)', data_type: 'enum', unit: null, clause_reference: '§4.3.6.1, Tab. 15',
      description: 'Plan 3: Treiber der Tab.-15-Zeile (< 12 °C / ≥ 12 °C) für q_Fo,T und t_Sicker,min,aM; Ablösung durch effluent_temperature_C (A262-08) STAGED (a262e-C-5).' },
  }),
  WS27({
    symbol: 'q_F_T_polishing_max', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 15' },
    lookup: { table_code: 'TABLE15', role: 'limit', keys: [{ column: 'temp_band', from_symbol: 'polishing_temp_band' }], value: 'q_f_t_max' },
    verification_quote: `${L1136} ${L1137}`,
    create: { section_code: 'B', label_de: 'Zulässige hydraulische Flächenbelastung q_Fo,T der Nachreinigungsstufe VF Sand (Tab. 15)', data_type: 'number', unit: 'l/(m²·d)', clause_reference: '§4.3.6.1, Tab. 15',
      description: 'Plan 3: Grenzwert aus TABLE15 zum Temperaturband (≤ 80 / ≤ 120); die Redox-Erhöhung der Fußnote *) ist a262e-P-1.' },
  }),
  WS27({
    symbol: 't_Sicker_polishing_min', widget: 'lookup_fill', ui_config: { source_label: 'Tab. 15' },
    lookup: { table_code: 'TABLE15', role: 'limit', keys: [{ column: 'temp_band', from_symbol: 'polishing_temp_band' }], value: 't_sicker_min' },
    verification_quote: L1138,
    create: { section_code: 'B', label_de: 'Mindestzeit zwischen Beschickungen t_Sicker,min,aM der Nachreinigungsstufe VF Sand (Tab. 15)', data_type: 'number', unit: 'h', clause_reference: '§4.3.6.1, Tab. 15',
      description: 'Plan 3: Grenzwert aus TABLE15 zum Temperaturband (≥ 6 / ≥ 3).' },
  }),
];

// ---------------------------------------------------------------------------
// Section visibility. Every worksheet carries the sections A B C D F J K L M; a section holding a symbol another
// worksheet consumes is never hidden (emitter guard) — those are STAGED consumer edits (a262e-C-1). The rules below
// cover every remaining section of each worksheet (the a138 precedent: the worksheet collapses for the non-selected case).
// ---------------------------------------------------------------------------
const ALL_SECTIONS = ['A', 'B', 'C', 'D', 'F', 'J', 'K', 'L', 'M'] as const;
type Sec = (typeof ALL_SECTIONS)[number];
function sections(worksheet: string, visible_when: string, verification_quote: string, except: readonly Sec[]): SectionVisibilityEntry[] {
  return ALL_SECTIONS.filter((s) => !except.includes(s)).map((section_code) => ({ standard: STD, worksheet, section_code, visible_when, verification_quote }));
}
const SMALL = "system_size_category == 'small_wwts'";
const MUNICIPAL = "system_size_category == 'municipal_wwtp'";
/** Filter-type worksheets: `filter_type` (A262-10) is consumed by every one of them; `system_size_category` is not yet (a262e-C-2). */
const filterWs = (worksheet: string, size: string, token: (typeof FILTER_TYPE_TOKENS)[number], quote: string, except: readonly Sec[]) =>
  sections(worksheet, `${size} AND filter_type == '${token}'`, quote, except);

export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [
  // A262-05 Trennsystem / A262-06 Mischsystem (§4.1.2 headings L579 / L633; L742 sewer split)
  ...sections('A262-05', SEPARATE, `${L579} — ${L742}`, ['B', 'D', 'F']),
  ...sections('A262-06', COMBINED, `${L633} — ${L643}`, ['D', 'F']),
  // small wastewater treatment systems (§1 L296, L396; Tab. 17 L1187)
  ...filterWs('A262-11', SMALL, 'vf_sand_0_2', `${L296} — ${L1187}`, []),
  ...filterWs('A262-12', SMALL, 'two_stage_vf_gravel_sand', `${L296} — ${L1187}`, ['B']),
  ...filterWs('A262-13', SMALL, 'vf_coarse_sand_0_4', `${L296} — ${L1187}`, []),
  ...filterWs('A262-14', SMALL, 'aerated_vf_gravel_8_16', `${L296} — ${L1187}`, ['B']),
  ...filterWs('A262-15', SMALL, 'two_layer_filter_trench', `${L296} — ${L1187}`, ['B']),
  ...filterWs('A262-16', SMALL, 'aerated_hf_gravel_8_16', `${L296} — ${L1187}`, ['B']),
  // municipal wastewater treatment plants (§1 L396; Tab. 18 L1189)
  ...filterWs('A262-19', MUNICIPAL, 'vf_sand_0_2', `${L396} — ${L1189}`, ['B', 'D']),
  ...filterWs('A262-20', MUNICIPAL, 'two_stage_vf_gravel_sand', `${L396} — ${L1189}`, ['B']),
  ...filterWs('A262-21', MUNICIPAL, 'vf_coarse_sand_0_4', `${L396} — ${L1189}`, []),
  ...filterWs('A262-22', MUNICIPAL, 'aerated_vf_gravel_8_16', `${L396} — ${L1189}`, []),
  ...filterWs('A262-23', MUNICIPAL, 'vf_lava_sand_0_4', `${L1031} — ${L1189}`, ['B']),
  // seasonal operation (§4.3.4 L1062), greywater (§4.3.5 L1119), enhanced effluent requirements (§4.5 L1295/L1299)
  ...sections('A262-25', "seasonal_operation == 'seasonal'", L1062, ['B', 'D', 'F']),
  ...sections('A262-26', "wastewater_type == 'greywater_only'", L1119, []),
  ...sections('A262-28', "enhanced_effluent == 'enhanced_NP'", `${L1295} — ${L1299}`, ['F']),
];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
