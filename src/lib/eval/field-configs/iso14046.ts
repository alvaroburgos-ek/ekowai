/**
 * ISO-14046 — Plan 3 Task 26 field configs (the elementary-flow register — one row
 * per unit process × flow with the seven §5.3.2 attributes a) – g) —, the
 * impact-category register + the LCI × CF rows on -04, the significant-issues
 * register on -05, the review-panel register on -07, the §5.2.4.2 a) – j) and §6.2
 * a) – g) checklists, the baseline / weighting conditionals) as DATA for
 * `scripts/regulation-tables/emit-field-configs-sql.ts iso14046`.
 *
 * Every `verification_quote` is a span of the SPANISH markdown transcript
 * `Desktop\Guidelines\DWA DIN Scribd\ISO-14046\ISO-14046.md` (NTC-ISO 14046 = IDT
 * translation of ISO 14046:2014; VC grade), lifted by line range into
 * `regulation-tables-quotes-iso14046.ts` (the line range is the constant's name;
 * clause numbers in the comments). Prod facts come from the captured
 * `iso14046.prior.json` (2026-09-18, read-only): section codes are single letters
 * (-02 C "Untersuchungsrahmen (§5.2.2)", F "Datenqualität (§5.2.4.2)"; -03 C
 * "Elementarflüsse (§5.3.2)"; -04 C "Auswahl von Wirkungskategorien …", E
 * "Charakterisierung (§5.4.4)", H "Wasser-Fußabdruck-Profil (§5.4.7)"; -05 B
 * "Auswertungsbestandteile (§5.5)"; -06 C "Bericht an Dritte (§6.2)"; -07 E "Prüfung
 * durch einen Ausschuss von Interessenpartnern (§7.4)"); the drivers of the emitted
 * rules are inherited where they are read: `critical_review_type` (-02) → -07,
 * `report_type` (-02) → -06 (consumer_worksheets, pinned); `weighting_applied` and
 * the created `baseline_conditions_present` live on the rule's own worksheet.
 *
 * Prod enum LABELS are German / English from another copy of the standard and are
 * NOT verifiable from this Spanish transcript (iso14046-E-1); the TOKENS are matched
 * to the printed lists (§5.3.2 b) L651–L657 = the six `flow_water_resource_type`
 * tokens, d) L659–L665 = the seven `flow_form_of_use` tokens) and the register enum
 * columns copy prod's value + label_de byte-for-byte (D-1, pinned).
 *
 * Emitted rules on EXISTING fields: ONE — `review_panel_members` (-07 E, no
 * consumers, no gate reads it) ← `critical_review_type == 'panel_review'` (§7.4).
 * Every other brief target is refused by the emitter's guards and routed to STAGED
 * (scripts/verification/iso14046-STAGED-plan3-rulings.sql): the -04 top-level
 * sections ← study_type (producer guard: -04 C / D / E / H hold fields consumed by
 * -05 / -06 or feeding EQ-01; gate guard: REQ-12 / REQ-14 / REQ-15 → G-1);
 * `water_footprint_qualifier` (consumed by -04 / -06; REQ-13 → G-4);
 * `organization_boundary` / `consolidation_method` (consumed by -02 / -03; REQ-22 →
 * G-2); `third_party_report` (REQ-18 → G-5); `critical_review_performed` (consumed
 * by -06; REQ-19 / REQ-20 → G-6); `allocation_balance_preserved` /
 * `allocation_sensitivity_done` (REQ-11 → G-7). Two brief hides are WITHHELD on the
 * transcript's own words (J-1 `recycling_allocation_type`: L729 says a closed-loop
 * procedure itself avoids allocation; J-2 `comparative_study_equivalence`: L996
 * binds every "estudio comparativo", not only a public comparative assertion).
 *
 * NOT emitted (STAGED / sign-off): the `contains()` completeness codes over the two
 * checklists (the brief's -02 D1 / -06 D1) — no engine path passes json checklist
 * carriers to `contains()` (din14021-F-1 precedent) → iso14046-F-2; per-category
 * indicator sums by engineer-typed category name (grouped aggregate) → iso14046-F-1;
 * the retirement of the scalars the registers twin → the D-blocks (amendment K);
 * `sites_14046` (organisation facilities) → Phase 6 pointer iso14046-X-1.
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { Q } from '../regulation-tables-quotes-iso14046';
import { S5_2_4_2_DQ_ROWS, S6_2_TP_ROWS, itemText } from '../regulation-tables-seed-iso14046';

const STD = 'ISO-14046';

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS02 = on('ISO-14046-02');
const WS03 = on('ISO-14046-03');
const WS04 = on('ISO-14046-04');
const WS05 = on('ISO-14046-05');
const WS06 = on('ISO-14046-06');
const WS07 = on('ISO-14046-07');

// ---- prod tokens as captured 2026-09-18 (value + label_de byte-for-byte; pinned against the prior; labels EV — iso14046-E-1) ----
/** prod `flow_water_resource_type` (-03) — the six printed §5.3.2 b) types L652–L657 (pluvial / superficial / de mar / salobre / subterránea / fósil). */
export const RESOURCE_TYPES = [
  { value: 'rainwater', label_de: 'Regenwasser' }, { value: 'surface_water', label_de: 'Oberflächenwasser' }, { value: 'seawater', label_de: 'Meerwasser' },
  { value: 'brackish_water', label_de: 'Brackwasser' }, { value: 'groundwater', label_de: 'Grundwasser' }, { value: 'fossil_water', label_de: 'Fossiles Wasser' },
] as const;
/** prod `flow_form_of_use` (-03) — the six printed §5.3.2 d) forms + "otras formas" L660–L665. */
export const FORMS_OF_USE = [
  { value: 'evaporation', label_de: 'Verdunstung' }, { value: 'transpiration', label_de: 'Transpiration' }, { value: 'product_integration', label_de: 'Integration in das Produkt' },
  { value: 'release_other_watershed_or_sea', label_de: 'Freisetzung in andere Wasserscheide/ins Meer' }, { value: 'displacement_between_resources', label_de: 'Verlagerung zwischen Wasserressourcentypen' },
  { value: 'instream_use', label_de: 'Nutzung im Gewässer' }, { value: 'other', label_de: 'Andere' },
] as const;
const labels = (xs: ReadonlyArray<{ value: string; label_de: string }>) => Object.fromEntries(xs.map((x) => [x.value, x.label_de]));

// ---- drivers (quoted enum tokens — Task 13 rule; booleans `== true`) ----
/** §7.4 L1030 — prod critical_review_type token `panel_review` (inherited on -07). */
export const PANEL_REVIEW = "critical_review_type == 'panel_review'";
/** §6.2 L905 / L909 — prod report_type token `third_party` (inherited on -06). */
export const THIRD_PARTY = "report_type == 'third_party'";
/** §5.4.7 L844 — prod boolean weighting_applied (-04 H). */
export const WEIGHTING = 'weighting_applied == true';
/** §5.2.2 n) L534 + NOTA L536 — the created boolean driver (-02 C). */
export const BASELINE = 'baseline_conditions_present == true';
/** row scope: §5.3.2 g) L670 releases are an OUTPUT attribute (the discriminator `direction`). */
export const ROW_OUTPUT = "direction == 'output'";

/** §5.4.4.1 — the per-row characterisation (prod EQ-01 prints `SUM(lci_result * characterization_factor)` on the scalars; the register carries the product per row — amendment K, D-19 / D-20). */
export const CONTRIBUTION_EXPR = 'lci_value * cf';

/** §5.2.4.2 a) – j): value = the printed line "a) …" (the checklist renders enum_values[].value — m820_2 trap 1), one per S5_2_4_2_DQ row. */
export const DATA_QUALITY_ITEMS = S5_2_4_2_DQ_ROWS.map((r, i) => ({ value: `${r.item}) ${itemText(r.item, r.quote)}`, label_de: `${r.item}) ${itemText(r.item, r.quote)}`, order_index: i }));
/** §6.2 a) – g): value = the printed heading line "a) aspectos generales:" (the sub-items live in S6_2_TP.subitems), one per S6_2_TP row. */
export const THIRD_PARTY_ITEMS = S6_2_TP_ROWS.map((r, i) => ({ value: `${r.item}) ${itemText(r.item, r.quote.split('\n')[0])}`, label_de: `${r.item}) ${itemText(r.item, r.quote.split('\n')[0])}`, order_index: i }));

const FLOWS_NOTE = `${Q.L647} ${Q.L649} Je Prozesseinheit × Fluss eine Zeile (Eingang oder Ausgang); die Spalten sind die gedruckten Angaben a) – g) von 5.3.2 und Zwillinge der Einzelfelder elementary_flow_quantity / flow_water_resource_type / flow_quality_parameters / flow_form_of_use / flow_geographic_location / flow_temporal_aspects / flow_releases_to_environment (dieses Arbeitsblatt) sowie der sechs Rahmen-Textfelder water_quantities / water_resource_types / water_quality_data / forms_of_water_use / water_use_locations / temporal_aspects auf ISO-14046-02 — die Einzelfelder bleiben bis zur Ratifizierung (iso14046-D-1 … D-14). Einleitungen/Emissionen (g) nur bei Ausgängen. Summen: Eingänge / Ausgänge / Bilanzdifferenz (ISO-14046-03-D1 … D3, 5.3.2 „Cualquier discrepancia en el balance del inventario debe explicarse“) und je Wasserressourcentyp (D5 … D10); keine Aggregation über Typ / Qualität / Form / Ort / Zeitraum in der Inventarphase (L675) — die Zeilen bleiben getrennt.`;

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- ISO-14046-02: the §5.2.4.2 a) – j) data-quality checklist (the boolean data_quality_requirements stays — D-24) + the baseline driver / reference-period field (§5.2.2 n) ----
  WS02({
    symbol: 'data_quality_items', widget: 'select_many',
    ui_config: {
      title: 'Anforderungen an die Datenqualität (§5.2.4.2 a) – j))', subtitle: '„Los requisitos para la calidad de los datos deberían tratar lo siguiente:“ — ankreuzen, welche Punkte die Datenqualitätsanforderungen behandeln', note: `${Q.L595} Das Einzelfeld data_quality_requirements (ein Boolean für alle zehn) bleibt bis zur Ratifizierung (iso14046-D-24); REQ-06 liest heute den Boolean — ein Vollständigkeits-Code über die Checkliste ist noch nicht codiert — Entscheidung auf dem Sign-off-Bogen (iso14046-F-2). Modalverb „deberían“ (sollten) — Anhaltswert, keine Pflichtliste.`,
      groups: [{ label: '§5.2.4.2 a) – j)', options: DATA_QUALITY_ITEMS.map((m) => m.value) }],
    },
    enum_values: DATA_QUALITY_ITEMS.map((m) => ({ value: m.value, label_de: m.label_de, order_index: m.order_index })),
    verification_quote: `${Q.L595} — ${Q.L596}`,
    create: { section_code: 'F', label_de: 'Datenqualitätsanforderungen §5.2.4.2 a) – j) (Prüfliste, Mehrfachauswahl)', data_type: 'json', unit: null, clause_reference: '§5.2.4.2',
      description: 'Plan 3: Mehrfachauswahl über die zehn gedruckten Datenqualitätspunkte a) – j) (S5_2_4_2_DQ); das Einzelfeld data_quality_requirements bleibt (iso14046-D-24); data_quality_complete_code ist STAGED (iso14046-F-2 — seit Plan 3 Welle A erreicht contains() den Materialisierer; der Block bleibt bis zur Ratifizierung STAGED).' },
  }),
  WS02({
    symbol: 'baseline_conditions_present', widget: 'attestation', ui_config: null,
    verification_quote: `${Q.L534} — ${Q.L536}`,
    create: { section_code: 'C', label_de: 'Bedingungen der Bezugslinie vorhanden (§5.2.2 n) „si es aplicable“)', data_type: 'boolean', unit: null, clause_reference: '§5.2.2 n)',
      description: 'Plan 3: der Treiber des Bezugszeitraum-Inventars — 5.2.2 n) nennt Bezugslinienbedingungen „si es aplicable“; das Textfeld baseline_conditions (Zwilling, iso14046-D-23) bleibt; reference_period_inventory ist nur sichtbar, wenn angekreuzt.' },
  }),
  WS02({
    symbol: 'reference_period_inventory', widget: 'scalar', ui_config: null, visible_when: BASELINE,
    verification_quote: `${Q.L536} — ${Q.L955}`,
    create: { section_code: 'C', label_de: 'Inventar des Bezugszeitraums (Bezugslinie, §5.2.2 NOTA / §6.2 d) 8))', data_type: 'text', unit: null, clause_reference: '§5.2.2 n), §6.2 d) 8)',
      description: 'Plan 3: das Inventar des als Bezug verwendeten Zeitraums (NOTA zu 5.2.2 n): „el período utilizado como referencia para la comparación y su inventario“; 6.2 d) 8) „inventario del período utilizado como línea base, cuando sea pertinente“) — sichtbar nur bei baseline_conditions_present == true (im Bericht an Dritte „cuando sea pertinente“).' },
  }),

  // ---- ISO-14046-03: the elementary-flow register (§5.3.2 — one row per unit process × flow) + its Σ outputs ----
  WS03({
    symbol: 'elementary_flows', widget: 'register',
    ui_config: {
      title: 'Elementare Wasserflüsse (flujos elementales, §5.3.2)', subtitle: '§5.3.2 — je Prozesseinheit × Fluss eine Zeile mit den Angaben a) – g); Eingänge und Ausgänge getrennt', add_label: '+ Fluss', placement: 'section',
      columns: [
        { key: 'unit_process', label: 'Prozesseinheit', type: 'text', required: true, aria_label: 'Prozesseinheit (proceso unitario, §3.5.6)' },
        { key: 'direction', label: 'Eingang / Ausgang', type: 'enum', options: ['input', 'output'], option_labels: { input: 'Eingang (entrada de agua)', output: 'Ausgang (salida de agua)' }, required: true, discriminator: true, aria_label: 'Eingang oder Ausgang (§5.3.2 a)' },
        { key: 'quantity_m3', label: 'Menge', type: 'number', unit: 'm³', required: true, min: 0, aria_label: 'Menge des Wasserflusses in m³ (§5.3.2 a)' },
        { key: 'resource_type', label: 'Wasserressourcentyp', type: 'enum', options: RESOURCE_TYPES.map((o) => o.value), option_labels: labels(RESOURCE_TYPES), required: true, aria_label: 'Wasserressourcentyp (§5.3.2 b)' },
        { key: 'quality', label: 'Qualitätsparameter', type: 'text', aria_label: 'Qualitätsparameter und/oder -merkmale des Wassers (§5.3.2 c)' },
        { key: 'form_of_use', label: 'Form der Wassernutzung', type: 'enum', options: FORMS_OF_USE.map((o) => o.value), option_labels: labels(FORMS_OF_USE), aria_label: 'Form der Wassernutzung (§5.3.2 d)' },
        { key: 'location', label: 'Geografischer Ort', type: 'text', aria_label: 'Geografischer Ort der Wassernutzung (§5.3.2 e)' },
        { key: 'temporal', label: 'Zeitliche Aspekte', type: 'text', aria_label: 'Zeitliche Aspekte der Wassernutzung (§5.3.2 f)' },
        { key: 'releases', label: 'Emissionen / Einleitungen', type: 'text', visible_when: ROW_OUTPUT, aria_label: 'Emissionen in die Luft oder Einleitungen in Wasser und Boden mit Wasserqualitätswirkung (§5.3.2 g, nur Ausgänge)' },
      ],
      footer: ['water_input_total', 'water_output_total', 'water_balance_diff', 'elementary_flow_count'],
      note: FLOWS_NOTE,
    },
    verification_quote: `${Q.L647} — ${Q.L649}`,
    create: { section_code: 'C', label_de: 'Elementare Wasserflüsse (je Prozesseinheit × Fluss: Eingang/Ausgang, Menge, Ressourcentyp, Qualität, Nutzungsform, Ort, Zeit, Emissionen)', data_type: 'json', unit: null, clause_reference: '§5.3.2 a)–g)',
      description: 'Plan 3: Zeilen je Prozesseinheit × elementarem Wasserfluss mit den gedruckten Angaben a) – g) von 5.3.2 („El inventario de la huella de agua debe incluir entradas y salidas para cada proceso unitario“); Eingang/Ausgang als Diskriminator (Emissionen nur bei Ausgängen); Σ Eingänge → water_input_total (ISO-14046-03-D1), Σ Ausgänge → water_output_total (-D2), Bilanzdifferenz → water_balance_diff (-D3), Zeilenzahl → elementary_flow_count (-D4), Σ Eingänge je Wasserressourcentyp → water_input_<typ> (-D5 … -D10). Die Einzelskalare dieses Arbeitsblatts und die sechs Rahmen-Textfelder auf -02 bleiben (iso14046-D-1 … D-14).' },
  }),
  WS03({
    symbol: 'water_input_total', widget: 'derived', ui_config: null, verification_quote: Q.L650,
    create: { section_code: 'C', label_de: 'Σ Wassereingänge (aus dem Register)', data_type: 'number', unit: 'm³', clause_reference: '§5.3.2 a)',
      description: 'Plan 3: Ausgabe der Gleichung ISO-14046-03-D1 (sum_rows über elementary_flows, Zeilen mit direction == input) — Zwilling des Rahmen-Textfelds water_quantities auf -02 (iso14046-D-8) und des Einzelfelds elementary_flow_quantity (iso14046-D-1); Vererbung nach -04 STAGED (iso14046-C-2).' },
  }),
  WS03({
    symbol: 'water_output_total', widget: 'derived', ui_config: null, verification_quote: Q.L650,
    create: { section_code: 'C', label_de: 'Σ Wasserausgänge (aus dem Register)', data_type: 'number', unit: 'm³', clause_reference: '§5.3.2 a)',
      description: 'Plan 3: Ausgabe der Gleichung ISO-14046-03-D2 (sum_rows über elementary_flows, Zeilen mit direction == output).' },
  }),
  WS03({
    symbol: 'water_balance_diff', widget: 'derived', ui_config: null, verification_quote: Q.L647,
    create: { section_code: 'C', label_de: 'Bilanzdifferenz Eingänge − Ausgänge (aus dem Register)', data_type: 'number', unit: 'm³', clause_reference: '§5.3.2',
      description: 'Plan 3: Ausgabe der Gleichung ISO-14046-03-D3 (Σ Eingänge − Σ Ausgänge, inline — nie auf D1 / D2 verkettet); eine Differenz ≠ 0 ist die „discrepancia en el balance del inventario“, die nach 5.3.2 zu erläutern ist (inventory_balance_explained).' },
  }),
  WS03({
    symbol: 'elementary_flow_count', widget: 'derived', ui_config: null, verification_quote: Q.L647,
    create: { section_code: 'C', label_de: 'Anzahl erfasster Elementarflüsse (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§5.3.2',
      description: 'Plan 3: Ausgabe der Gleichung ISO-14046-03-D4 (count_rows über elementary_flows; leeres Register ⇒ 0); Grundlage des STAGED Gate-Vorschlags zu REQ-10 (iso14046-G-9).' },
  }),
  ...RESOURCE_TYPES.map((t, i) => WS03({
    symbol: `water_input_${t.value}`, widget: 'derived', ui_config: null, verification_quote: Q.L651_657,
    create: { section_code: 'C', label_de: `Σ Wassereingänge — ${t.label_de} (aus dem Register)`, data_type: 'number', unit: 'm³', clause_reference: '§5.3.2 a), b)',
      description: `Plan 3: Ausgabe der Gleichung ISO-14046-03-D${5 + i} (sum_rows über elementary_flows, Zeilen mit direction == input AND resource_type == ${t.value}); Σ Menge je Wasserressourcentyp (5.3.2 b) — die Inventarphase aggregiert nicht über Typen, L675); Zwilling des Rahmen-Textfelds water_resource_types auf -02 (iso14046-D-9).` },
  })),

  // ---- ISO-14046-04: the impact-category register + the LCI × CF rows (EQ-01 per row) + the weighting note ----
  WS04({
    symbol: 'impact_categories_14046', widget: 'register',
    ui_config: {
      title: 'Wirkungskategorien und Kategorieindikatoren (§5.4.2)', subtitle: '§5.4.2 — je Wirkungskategorie eine Zeile: Indikator, Charakterisierungsmodell, Indikatorergebnis; das Wasser-Fußabdruck-Profil ist die Menge dieser Zeilen (§3.3.13 / §5.4.7)', add_label: '+ Wirkungskategorie', placement: 'section',
      columns: [
        { key: 'category', label: 'Wirkungskategorie', type: 'text', required: true, aria_label: 'Wirkungskategorie (categoría de impacto, §3.3.11)' },
        { key: 'indicator_name', label: 'Kategorieindikator', type: 'text', aria_label: 'Name des Kategorieindikators (§5.4.2 „debe ser lo suficientemente explícito“)' },
        { key: 'indicator_unit', label: 'Einheit des Indikators', type: 'text', aria_label: 'Gemeinsame Einheit des Kategorieindikators (§3.3.14)' },
        { key: 'model', label: 'Charakterisierungsmodell', type: 'text', aria_label: 'Charakterisierungsmodell / -methode (§5.4.4.1)' },
        { key: 'result', label: 'Indikatorergebnis', type: 'number', aria_label: 'Kategorieindikatorergebnis (Σ Beiträge dieser Kategorie aus lci_cf_rows — von Hand übernommen, iso14046-F-1)' },
      ],
      note: `${Q.L777} ${Q.L838} Je Kategorie eine Zeile (Zwillinge der Einzelfelder impact_categories / category_indicators / characterization_model / category_indicator_result, iso14046-D-15 … D-18; das Profil water_footprint_profile ist die Zeilenmenge, iso14046-D-26). Das Indikatorergebnis je Kategorie ist die Summe der Beiträge dieser Kategorie im Register lci_cf_rows — eine Summe nach frei eingetippter Kategorie ist im Rechenwerk nicht ausdrückbar (kein gruppiertes Aggregat, iso14046-F-1): der Wert wird aus den Zeilen von lci_cf_rows übernommen; die Gesamtsumme aller Beiträge liefert category_indicator_total.`,
    },
    verification_quote: `${Q.L777} — ${Q.L838}`,
    create: { section_code: 'C', label_de: 'Wirkungskategorien (je Kategorie: Indikator, Einheit, Charakterisierungsmodell, Indikatorergebnis)', data_type: 'json', unit: null, clause_reference: '§5.4.2, §5.4.7',
      description: 'Plan 3: Zeilen je Wirkungskategorie („El indicador de categoría o los indicadores de categoría, y el método o métodos … se deben seleccionar“; das Profil „está hecho con varios resultados de indicadores de categorías de impacto“); das Ergebnis je Kategorie ist typisiert (die Summe nach Kategoriename ist ohne gruppiertes Aggregat nicht ausdrückbar — iso14046-F-1); die Einzelfelder bleiben (iso14046-D-15 … D-18, D-26).' },
  }),
  WS04({
    symbol: 'lci_cf_rows', widget: 'register',
    ui_config: {
      title: 'Klassifizierung und Charakterisierung: Sachbilanzergebnis × Charakterisierungsfaktor (§5.4.3 / §5.4.4)', subtitle: '§5.4.4.1 — je zugeordnetem Sachbilanzergebnis eine Zeile: Wirkungskategorie, Fluss, Sachbilanzwert, Charakterisierungsfaktor → Beitrag (EQ-01 je Zeile)', add_label: '+ Sachbilanzergebnis', placement: 'section',
      columns: [
        { key: 'category', label: 'Wirkungskategorie', type: 'text', required: true, aria_label: 'Wirkungskategorie, der das Sachbilanzergebnis zugeordnet ist (§5.4.3)' },
        { key: 'flow', label: 'Elementarfluss / Stoff', type: 'text', aria_label: 'Zugeordneter Elementarfluss oder Stoff (§5.4.3)' },
        { key: 'lci_value', label: 'Sachbilanzergebnis', type: 'number', required: true, aria_label: 'Zugeordnetes Sachbilanzergebnis (resultado del análisis del inventario, §3.3.14)' },
        { key: 'cf', label: 'Charakterisierungsfaktor', type: 'number', required: true, aria_label: 'Charakterisierungsfaktor (factor de caracterización, §3.3.14)' },
        { key: 'contribution', label: 'Beitrag zum Indikator', type: 'derived', expr: CONTRIBUTION_EXPR },
      ],
      footer: ['category_indicator_total'],
      note: `${Q.L325} ${Q.L785} Je zugeordnetem Sachbilanzergebnis eine Zeile; der Beitrag ist Sachbilanzergebnis × Charakterisierungsfaktor (die gedruckte Definition des Charakterisierungsfaktors; prod EQ-01 auf den Einzelfeldern lci_result / characterization_factor bleibt unverändert — iso14046-D-19 / D-20 / R-1). Die Gesamtsumme aller Beiträge ist category_indicator_total (ISO-14046-04-D1); die Summe je Kategorie wird von Hand in impact_categories_14046.result übernommen (iso14046-F-1).`,
    },
    verification_quote: `${Q.L325} — ${Q.L785}`,
    create: { section_code: 'E', label_de: 'Sachbilanzergebnis × Charakterisierungsfaktor je Wirkungskategorie (Klassifizierung und Charakterisierung)', data_type: 'json', unit: null, clause_reference: '§5.4.3, §5.4.4.1, §3.3.14',
      description: 'Plan 3: Zeilen je zugeordnetem Sachbilanzergebnis (Kategorie, Fluss, Wert, Charakterisierungsfaktor) mit dem Beitrag lci_value × cf als Zeilenwert (die gedruckte Definition 3.3.14: „Factor … que se aplica para convertir el resultado del análisis del inventario del ciclo de vida asignado a la unidad común del indicador de categoría“); Gesamtsumme → category_indicator_total (ISO-14046-04-D1). Prod EQ-01 (category_indicator_result = SUM(lci_result * characterization_factor) über die Einzelfelder) bleibt; EQ-01 auf die Zeilen ist STAGED (iso14046-R-1); die Einzelfelder bleiben (iso14046-D-19 / D-20).' },
  }),
  WS04({
    symbol: 'category_indicator_total', widget: 'derived', ui_config: null, verification_quote: Q.L325,
    create: { section_code: 'E', label_de: 'Σ Beiträge aller Sachbilanzergebnisse (aus lci_cf_rows)', data_type: 'number', unit: null, clause_reference: '§5.4.4.1',
      description: 'Plan 3: Ausgabe der Gleichung ISO-14046-04-D1 (sum_rows über lci_cf_rows, contribution) — die Gesamtsumme aller Beiträge; sie ist NICHT das Indikatorergebnis einer einzelnen Kategorie (Summe je Kategorie: iso14046-F-1); Zwilling des Einzelfelds category_indicator_result (prod EQ-01, iso14046-D-18); Vererbung nach -05 / -06 STAGED (iso14046-C-1).' },
  }),
  WS04({
    symbol: 'weighting_report_note', widget: 'scalar', ui_config: null, visible_when: WEIGHTING,
    verification_quote: `${Q.L844} — ${Q.L846}`,
    create: { section_code: 'H', label_de: 'Gewichtung: Durchführung und Bericht nach ISO 14044 (§5.4.7)', data_type: 'text', unit: null, clause_reference: '§5.4.7, §5.4.1',
      description: 'Plan 3: die im Brief genannte, in prod nicht vorhandene Notiz (iso14046-O-1) — wie die Gewichtung nach ISO 14044 durchgeführt und berichtet wird („Si se aplica la ponderación, esta se debe de realizar e informar de acuerdo con la Norma ISO 14044.“); nur sichtbar bei weighting_applied == true; das gedruckte Verbot der gewichteten Ergebnisse als Grundlage einer öffentlichen vergleichenden Aussage (L846) ist als Gate STAGED (iso14046-G-8).' },
  }),

  // ---- ISO-14046-05: the significant-issues register (§5.5 a)) + its count ----
  WS05({
    symbol: 'significant_issues_14046', widget: 'register',
    ui_config: {
      title: 'Signifikante Themen (cuestiones significativas, §5.5 a))', subtitle: '§5.5 a) — je signifikantem Thema eine Zeile: Prozess, Umweltmechanismus oder Elementarfluss mit dem größten Beitrag', add_label: '+ Thema', placement: 'section',
      columns: [
        { key: 'issue', label: 'Thema', type: 'text', required: true, aria_label: 'Signifikantes Thema (Prozess / Mechanismus / Elementarfluss, §5.5 a)' },
        { key: 'contribution_pct', label: 'Beitrag', type: 'number', unit: '%', min: 0, max: 100, aria_label: 'Beitrag zum Ergebnis in Prozent (§5.5 a) „contribución significativa“)' },
        { key: 'mechanism', label: 'Umweltmechanismus', type: 'text', aria_label: 'Hauptsächlich betroffener Umweltmechanismus (§5.5 a)' },
      ],
      footer: ['significant_issues_count'],
      note: `${Q.L851} Je Thema eine Zeile; Zwilling des Textfelds significant_issues (iso14046-D-21). Der Beitrag in % ist eine Ingenieurangabe — die Norm nennt keine Schwelle für „significativa“ (iso14046-J-5).`,
    },
    verification_quote: Q.L851,
    create: { section_code: 'B', label_de: 'Signifikante Themen (je Thema: Bezeichnung, Beitrag %, Umweltmechanismus)', data_type: 'json', unit: null, clause_reference: '§5.5 a)',
      description: 'Plan 3: Zeilen je signifikantem Thema („identificación de las cuestiones significativas … procesos con una contribución significativa … mecanismos ambientales principalmente afectados, flujos elementales que tienen la mayor contribución“); Anzahl → significant_issues_count (ISO-14046-05-D1); das Textfeld significant_issues bleibt (iso14046-D-21); REQ-16 liest den Text — Umstellung STAGED (iso14046-G-11).' },
  }),
  WS05({
    symbol: 'significant_issues_count', widget: 'derived', ui_config: null, verification_quote: Q.L851,
    create: { section_code: 'B', label_de: 'Anzahl signifikanter Themen (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§5.5 a)',
      description: 'Plan 3: Ausgabe der Gleichung ISO-14046-05-D1 (count_rows über significant_issues_14046; leeres Register ⇒ 0); Grundlage des STAGED Gate-Vorschlags zu REQ-16 (iso14046-G-11).' },
  }),

  // ---- ISO-14046-06: the §6.2 a) – g) third-party-report checklist (the boolean third_party_report stays — D-25) ----
  WS06({
    symbol: 'third_party_report_items', widget: 'select_many', visible_when: THIRD_PARTY,
    ui_config: {
      title: 'Inhalte des Berichts an Dritte (§6.2 a) – g))', subtitle: '„El informe de tercera parte debe cubrir los siguientes aspectos:“ — ankreuzen, welche Aspekte der Bericht an Dritte abdeckt (die Unterpunkte 1) … / i) … stehen in der Tabelle S6_2_TP)', note: `${Q.L909} Das Einzelfeld third_party_report (ein Boolean für alle sieben) bleibt bis zur Ratifizierung (iso14046-D-25); REQ-18 liest heute den Boolean in ODER-Form — IF-Guard STAGED (iso14046-G-5); ein Vollständigkeits-Code über die Checkliste ist noch nicht codiert — Entscheidung auf dem Sign-off-Bogen (iso14046-F-2).`,
      groups: [{ label: '§6.2 a) – g)', options: THIRD_PARTY_ITEMS.map((m) => m.value) }],
    },
    enum_values: THIRD_PARTY_ITEMS.map((m) => ({ value: m.value, label_de: m.label_de, order_index: m.order_index })),
    verification_quote: `${Q.L905} — ${Q.L909}`,
    create: { section_code: 'C', label_de: 'Bericht an Dritte — Aspekte §6.2 a) – g) (Prüfliste, Mehrfachauswahl)', data_type: 'json', unit: null, clause_reference: '§6.2',
      description: 'Plan 3: Mehrfachauswahl über die sieben gedruckten Aspekte a) – g) des Berichts an Dritte (S6_2_TP; Unterpunkte in der Tabelle); sichtbar nur bei report_type == third_party (6.2 „Cuando se realiza el informe … a una tercera parte … se debe preparar un informe de tercera parte“); das Einzelfeld third_party_report bleibt (iso14046-D-25); third_party_report_complete_code ist STAGED (iso14046-F-2).' },
  }),

  // ---- ISO-14046-07: the review-panel register (§7.4) + its counts; the prod count field keyed on the panel type ----
  WS07({
    symbol: 'review_panel', widget: 'register', visible_when: PANEL_REVIEW,
    ui_config: {
      title: 'Prüfungsausschuss (panel de revisión, §7.4)', subtitle: '§7.4 — „un panel de revisión constituido por al menos tres miembros“, Vorsitz durch einen unabhängigen externen Sachverständigen; je Mitglied eine Zeile', add_label: '+ Mitglied', placement: 'section',
      columns: [
        { key: 'name', label: 'Name', type: 'text', required: true, aria_label: 'Name des Ausschussmitglieds (§6.2 g) 1) „nombre y afiliación de los revisores“)' },
        { key: 'affiliation', label: 'Zugehörigkeit', type: 'text', aria_label: 'Zugehörigkeit / Organisation des Mitglieds (§6.2 g) 1)' },
        { key: 'independent', label: 'unabhängig', type: 'boolean', aria_label: 'Unabhängiger Prüfer (§7.4 „revisores independientes calificados“)' },
        { key: 'chair', label: 'Vorsitz', type: 'boolean', aria_label: 'Vorsitz des Ausschusses (§7.4 „experto externo independiente para presidir“)' },
      ],
      footer: ['review_panel_members_calc', 'panel_chair_independent', 'panel_min_members_ok'],
      note: `${Q.L1030} Je Mitglied eine Zeile; Zwilling des Zahlenfelds review_panel_members (iso14046-D-22). Anzahl → review_panel_members_calc, unabhängige Vorsitzende → panel_chair_independent, „al menos tres miembros“ → panel_min_members_ok (ISO-14046-07-D1 … D3); ein Gate auf mindestens drei Mitglieder ist STAGED (iso14046-G-3 — Modalverb „debería“).`,
    },
    verification_quote: `${Q.L1030} — ${Q.L1034}`,
    create: { section_code: 'E', label_de: 'Prüfungsausschuss (je Mitglied: Name, Zugehörigkeit, unabhängig, Vorsitz)', data_type: 'json', unit: null, clause_reference: '§7.4, §6.2 g) 1)',
      description: 'Plan 3: Zeilen je Ausschussmitglied („un panel de revisión constituido por al menos tres miembros“; 6.2 g) 1) „nombre y afiliación de los revisores“); sichtbar nur bei critical_review_type == panel_review; Anzahl → review_panel_members_calc (ISO-14046-07-D1), unabhängige Vorsitzende → panel_chair_independent (-D2), mindestens drei → panel_min_members_ok (-D3); das Zahlenfeld review_panel_members bleibt (iso14046-D-22).' },
  }),
  WS07({
    symbol: 'review_panel_members_calc', widget: 'derived', ui_config: null, visible_when: PANEL_REVIEW, verification_quote: Q.L1030,
    create: { section_code: 'E', label_de: 'Mitglieder des Prüfungsausschusses (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§7.4',
      description: 'Plan 3: Ausgabe der Gleichung ISO-14046-07-D1 (count_rows über review_panel; leeres Register ⇒ 0); Zwilling des Zahlenfelds review_panel_members (iso14046-D-22).' },
  }),
  WS07({
    symbol: 'panel_chair_independent', widget: 'derived', ui_config: null, visible_when: PANEL_REVIEW, verification_quote: Q.L1030,
    create: { section_code: 'E', label_de: 'Unabhängige Vorsitzende (aus dem Register)', data_type: 'number', unit: null, clause_reference: '§7.4',
      description: 'Plan 3: Ausgabe der Gleichung ISO-14046-07-D2 (count_rows über review_panel, chair == true AND independent == true) — „un experto externo independiente para presidir un panel de revisión“; 0 = kein unabhängiger Vorsitz erfasst.' },
  }),
  WS07({
    symbol: 'panel_min_members_ok', widget: 'derived', ui_config: null, visible_when: PANEL_REVIEW, verification_quote: Q.L1030,
    create: { section_code: 'E', label_de: 'Mindestens drei Mitglieder (1 = ja, 0 = nein; §7.4 „al menos tres miembros“)', data_type: 'number', unit: null, clause_reference: '§7.4',
      description: 'Plan 3: Ausgabe der Gleichung ISO-14046-07-D3 (if(count_rows(review_panel) >= 3, 1, 0) — die 3 ist die gedruckte „tres“ von 7.4; leeres Register ⇒ 0, nie ein Phantom-Pass); Gate STAGED (iso14046-G-3, Modalverb „debería“ → warn vorgeschlagen).' },
  }),
  WS07({
    symbol: 'review_panel_members', widget: 'scalar', ui_config: null, visible_when: PANEL_REVIEW,
    verification_quote: `${Q.L1030} — ${Q.L538}`,
  }),
];

/**
 * No section rules: the brief's -04 top-level sections ← study_type are refused by the producer guard (C / D / E / H
 * hold fields consumed by -05 / -06 or feeding EQ-01) and by the gate-aware guard (REQ-12 / REQ-14 / REQ-15) → STAGED
 * G-1 (rules on the field-less sections A / B / F / G / K / M would be inert — Task 8 lesson). Pinned in the test.
 */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** The brief's -04 section rule, kept as data for the STAGED block G-1 and the refusal pin (never emitted). */
export const STAGED_SECTION_RULE_04 = "study_type == 'water_footprint_assessment'";

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
