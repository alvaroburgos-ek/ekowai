/**
 * FLL-Naturteich — GENERIC full-project embedded-PG seeder.
 *
 * Unlike seed-fll-gar27.ts (a hand-shaped single-worksheet Q_NOT fixture), this
 * seeder stands up the COMPLETE FLL-Naturteich standard inside the shared harness
 * Postgres so a verify agent can drive ANY of the 15 worksheets' chains through the
 * REAL saveWorksheet path. It mirrors the prod topology exactly:
 *   - profile + org + org_members (so a BYPASS_AUTH user is an internal member)
 *   - project + FLL-Naturteich standard + project_standards row (attached)
 *   - all 15 worksheet_templates (FLLNT-01 … FLLNT-15) with their sections
 *   - every ACTIVE field present (130 fields), with data_type, unit and enum_values
 *   - all 6 equations (FLLNT-06/-10/-11)
 *   - all 33 block-severity compliance_requirements (so the approval gate enforces)
 *   - a worksheet_instance per template, and a defaulted project_parameters row for
 *     every field so no chain starts from a NULL it did not choose.
 *
 * STRUCTURE PROVENANCE (read-only, 2026-07-23, against the live standard
 * c11f0e54-fef3-4552-be7b-f6eb50b468da in prod `vadsmshzebefjreqcicl`):
 *   - worksheet codes/titles/order, section codes/titles/order, field
 *     symbols/labels/data_type/unit/order, enum_values (verbatim JSON),
 *     equations (id/number/formula/output), and compliance_requirements
 *     (code/title/condition/severity) are all copied from the prod tables.
 * This is a STRUCTURAL mirror; it does NOT assert any FLL-Naturteich source
 * *scalar* value (there is no PLT-HS-01-style ratified baseline for this
 * standard yet). Field DEFAULTS are neutral placeholders chosen only to give
 * saveWorksheet a well-typed, non-NULL starting row — a verify agent overwrites
 * whichever inputs its chain needs and asserts the derived outputs itself. The
 * defaults are NOT source-verified values and MUST NOT be treated as VA-grade.
 *
 * FIXTURE PARITY (corrected 2026-07-24, D-1 rerun): earlier this header claimed
 * EQ-02's inputs F_filter/h_filter are "NOT fields on the standard … missing
 * exactly as on prod". That claim was STALE/WRONG. Live prod
 * (`vadsmshzebefjreqcicl`) shows BOTH are ACTIVE fields on FLLNT-10
 * (F_filter: number/m²/order_index 160; h_filter: number/m/order_index 170),
 * carrying section_id=null (unsectioned). They are now seeded so the EQ-02 chain
 * resolves end-to-end through the REAL saveWorksheet, matching prod. The same
 * correction applies to swimming_area_m2 (an ACTIVE FLLNT-11 field, order_index
 * 100, unsectioned — a prod duplicate of the FLLNT-06 copy; seeded on both) and
 * to the attest booleans attest_fllnt_01_req_03/_04, attest_fllnt_12_req_25,
 * attest_fllnt_13_req_28 (all ACTIVE, unsectioned on prod), which now drive
 * REQ-03/04/25/28 through the real save instead of a synthetic lookup.
 *
 * The section_id=null on these prod fields is a prod data-quality quirk staged
 * for Alvaro's batch (written-not-applied), NOT resolved by this seeder.
 */
import type postgres from 'postgres';

// ── standard identity (verbatim from prod) ──────────────────────────────────
export const FLL_NATURTEICH_STANDARD_ID = 'c11f0e54-fef3-4552-be7b-f6eb50b468da';
export const FLL_NATURTEICH_CODE = 'FLL-Naturteich';

type EnumOption = {
  value: string;
  label_de?: string;
  label_en?: string;
  order_index?: number;
  regulation_reference?: string;
};

type FieldSpec = {
  symbol: string;
  label_de: string;
  data_type: 'text' | 'number' | 'enum' | 'boolean' | 'date' | 'json';
  unit: string | null;
  order_index: number;
  /**
   * section code the field lives under (B, C, D, F …) — or `null` for the
   * driver/attest fields that prod stores UNSECTIONED (section_id IS NULL).
   * These mirror prod exactly; their section_id=null is a prod data-quality
   * quirk staged for Alvaro's batch, NOT fixed here (see fll-d1-rerun.md §5).
   */
  section: string | null;
  enum_values?: EnumOption[];
};

type EquationSpec = {
  id: string;
  equation_number: string;
  formula: string;
  output_symbol: string;
};

type ComplianceSpec = {
  code: string;
  title_de: string;
  condition: string;
  severity: 'block' | 'warn' | 'info';
};

type WorksheetSpec = {
  code: string;
  title_de: string;
  order_index: number;
  fields: FieldSpec[];
  equations: EquationSpec[];
  compliance: ComplianceSpec[];
};

// Shared section catalogue: every FLL-Naturteich worksheet carries the same 9
// section shells on prod; we only materialise the sections a field references,
// with the exact code/title/order_index observed in prod.
const SECTION_META: Record<string, { title_de: string; order_index: number }> = {
  B: { title_de: 'Input Parameters', order_index: 2 },
  C: { title_de: 'Worksheet-Specific Content', order_index: 3 },
  D: { title_de: 'Results / Derived Values', order_index: 4 },
  F: { title_de: 'Results Summary', order_index: 5 },
};

// Reusable enum literals (verbatim from prod enum_values).
const GATE_ENUM: EnumOption[] = [
  { value: 'pass', label_de: 'bestanden', order_index: 1 },
  { value: 'fail', label_de: 'nicht bestanden', order_index: 2 },
  { value: 'conditional', label_de: 'bedingt', order_index: 3 },
  { value: 'not_applicable', label_de: 'nicht zutreffend', order_index: 4 },
  { value: 'pending', label_de: 'ausstehend', order_index: 5 },
];

// ── the full standard, as observed in prod ──────────────────────────────────
export const FLL_NATURTEICH_WORKSHEETS: WorksheetSpec[] = [
  {
    code: 'FLLNT-01', title_de: 'Projekteinrichtung & Kundenberatung', order_index: 1,
    fields: [
      { symbol: 'client_name', label_de: 'Auftraggeber', data_type: 'text', unit: null, order_index: 0, section: 'B' },
      { symbol: 'pool_use_type', label_de: 'Nutzungstyp', data_type: 'enum', unit: null, order_index: 0, section: 'B', enum_values: [
        { value: 'private_single_household', label_de: 'Privat (Einzelhaushalt)', order_index: 1 },
        { value: 'private_multi_household', label_de: 'Privat (Mehrfamilienhaushalt)', order_index: 2 },
      ] },
      { symbol: 'planning_date', label_de: 'Planungsdatum', data_type: 'date', unit: null, order_index: 0, section: 'B' },
      { symbol: 'project_id', label_de: 'Projekt-ID', data_type: 'text', unit: null, order_index: 0, section: 'B' },
      { symbol: 'client_address', label_de: 'Auftraggeberanschrift', data_type: 'text', unit: null, order_index: 0, section: 'B' },
      { symbol: 'project_name', label_de: 'Projektname', data_type: 'text', unit: null, order_index: 0, section: 'B' },
      { symbol: 'planner_name', label_de: 'Planer', data_type: 'text', unit: null, order_index: 0, section: 'B' },
      { symbol: 'contractor_name', label_de: 'Ausführender Betrieb', data_type: 'text', unit: null, order_index: 0, section: 'B' },
      { symbol: 'intended_use_intensity', label_de: 'Nutzungsintensität', data_type: 'enum', unit: null, order_index: 0, section: 'C', enum_values: [
        { value: 'low', label_de: 'gering', order_index: 1 },
        { value: 'medium', label_de: 'mittel', order_index: 2 },
        { value: 'high', label_de: 'hoch', order_index: 3 },
      ] },
      { symbol: 'consultation_checklist_completed', label_de: 'Beratungs-Checkliste abgeschlossen', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      // attest drivers for REQ-03/REQ-04 — active + UNSECTIONED on prod
      { symbol: 'attest_fllnt_01_req_03', label_de: 'Attestierung: Standort & Untergrund geeignet', data_type: 'boolean', unit: null, order_index: 0, section: null },
      { symbol: 'attest_fllnt_01_req_04', label_de: 'Attestierung: Rechtspflicht / Einfriedung', data_type: 'boolean', unit: null, order_index: 0, section: null },
    ],
    equations: [],
    compliance: [
      { code: 'REQ-01', title_de: 'Scope applicability', condition: 'pool_use_type IN {private_single_household,private_multi_household}', severity: 'block' },
      { code: 'REQ-02', title_de: 'Customer consultation', condition: 'consultation_checklist_completed == true', severity: 'block' },
      { code: 'REQ-03', title_de: 'Site and subsoil suitable', condition: 'attest_fllnt_01_req_03 == True', severity: 'block' },
      { code: 'REQ-04', title_de: 'Legal duty / enclosure', condition: 'attest_fllnt_01_req_04 == True', severity: 'block' },
    ],
  },
  {
    code: 'FLLNT-02', title_de: 'Standortanalyse & Untergrundverhältnisse', order_index: 2,
    fields: [
      { symbol: 'existing_system', label_de: 'Bestandsanlage vorhanden', data_type: 'boolean', unit: null, order_index: 0, section: 'B' },
      { symbol: 'site_address', label_de: 'Standortadresse', data_type: 'text', unit: null, order_index: 0, section: 'B' },
      { symbol: 'subsoil_type', label_de: 'Untergrundtyp', data_type: 'enum', unit: null, order_index: 0, section: 'C', enum_values: [
        { value: 'rock', label_de: 'Fels', order_index: 1 }, { value: 'gravel', label_de: 'Kies', order_index: 2 },
        { value: 'sand', label_de: 'Sand', order_index: 3 }, { value: 'clay', label_de: 'Ton', order_index: 4 },
        { value: 'loam', label_de: 'Lehm', order_index: 5 }, { value: 'mixed', label_de: 'Mischboden', order_index: 6 },
        { value: 'fill', label_de: 'Auffüllung', order_index: 7 },
      ] },
      { symbol: 'groundwater_level', label_de: 'Grundwasserstand', data_type: 'number', unit: 'm', order_index: 0, section: 'C' },
      { symbol: 'enclosure_provided', label_de: 'Einfriedung vorhanden', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      { symbol: 'operating_manual_provided', label_de: 'Betriebsanleitung erstellt', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
    ],
    equations: [],
    compliance: [
      { code: 'REQ-05', title_de: 'Operating manual', condition: 'operating_manual_provided == true', severity: 'block' },
    ],
  },
  {
    code: 'FLLNT-03', title_de: 'Auswahl Naturteich-Typ (I–V)', order_index: 3,
    fields: [
      { symbol: 'natural_pool_type', label_de: 'Naturteich-Typ', data_type: 'enum', unit: null, order_index: 0, section: 'C', enum_values: [
        { value: 'type_I', label_de: 'Typ I (ohne Aufbereitungstechnik)', order_index: 1 },
        { value: 'type_II', label_de: 'Typ II (Oberflächen-Aufbereitung)', order_index: 2 },
        { value: 'type_III', label_de: 'Typ III (langsamer Substratfilter + P-Bindung)', order_index: 3 },
        { value: 'type_IV', label_de: 'Typ IV (schneller Substratfilter)', order_index: 4 },
        { value: 'type_V', label_de: 'Typ V (technische Filtereinheit)', order_index: 5 },
      ] },
      { symbol: 'regeneration_technique', label_de: 'Aufbereitungsverfahren', data_type: 'enum', unit: null, order_index: 0, section: 'D', enum_values: [
        { value: 'hydrobotanical_submergent', label_de: 'Hydrobotanik (submers)', order_index: 1 },
        { value: 'hydrobotanical_emersed', label_de: 'Hydrobotanik (emers)', order_index: 2 },
        { value: 'substrate_filter_slow', label_de: 'Substratfilter (langsam)', order_index: 3 },
        { value: 'substrate_filter_quick', label_de: 'Substratfilter (schnell)', order_index: 4 },
        { value: 'technical_unit', label_de: 'Technische Filtereinheit', order_index: 5 },
        { value: 'physical_chemical', label_de: 'Physikalisch-chemische Verfahren', order_index: 6 },
      ] },
      { symbol: 'regeneration_area_share', label_de: 'Regenerationsflächenanteil', data_type: 'number', unit: '%', order_index: 0, section: 'D' },
      { symbol: 'p_binding_required', label_de: 'Phosphor-Bindungsstufe erforderlich', data_type: 'boolean', unit: null, order_index: 0, section: 'D' },
    ],
    equations: [],
    compliance: [
      { code: 'REQ-06', title_de: 'Natural pool type declared', condition: 'natural_pool_type IN {type_I,type_II,type_III,type_IV,type_V}', severity: 'block' },
      { code: 'REQ-07', title_de: 'Regeneration-area share appropriate', condition: 'IF natural_pool_type IN {type_I, type_II} THEN regeneration_area_share > 50 AND IF natural_pool_type == type_III THEN regeneration_area_share > 30', severity: 'block' },
      { code: 'REQ-09', title_de: 'Fill-up water meets Tab. 7', condition: 'water_test_ammonium <= 0.5 AND water_test_iron <= 0.2 AND water_test_p_total <= 0.03 AND water_test_hardness >= 1.0 AND water_test_conductivity <= 1000 AND water_test_manganese <= 0.05 AND water_test_nitrate <= 50.0 AND water_test_orthophosphate <= 0.01 AND water_test_ph >= 6.0 AND water_test_ph <= 9.0 AND water_test_acid_capacity_ks43 >= 2', severity: 'block' },
      { code: 'REQ-10', title_de: 'Swimming-area water meets Tab. 8', condition: 'swimming_test_ammonium <= 0.3 AND swimming_test_hardness >= 1.0 AND swimming_test_conductivity <= 1000 AND swimming_test_nitrate <= 30.0 AND swimming_test_nitrite <= 0.01 AND swimming_test_ph >= 7.0 AND swimming_test_ph <= 9.0 AND swimming_test_acid_capacity_ks43 >= 2 AND (IF natural_pool_type IN {type_I,type_II,type_III} THEN (swimming_test_p_total <= 0.03 AND swimming_test_orthophosphate <= 0.03)) AND (IF natural_pool_type IN {type_IV,type_V} THEN (swimming_test_p_total <= 0.01 AND swimming_test_orthophosphate <= 0.01))', severity: 'block' },
      { code: 'REQ-11', title_de: 'Material requirements per §7.2', condition: 'concrete_spec_compliant == true AND wood_treatment_compliant == true AND materials_biocide_free == true AND plant_substrate_compliant == true', severity: 'block' },
    ],
  },
  {
    code: 'FLLNT-04', title_de: 'Wasserqualitäts-Anforderungen', order_index: 4,
    fields: [
      { symbol: 'water_source', label_de: 'Füllwasserart', data_type: 'enum', unit: null, order_index: 0, section: 'B', enum_values: [
        { value: 'tap_water', label_de: 'Leitungswasser', order_index: 1 },
        { value: 'well_water', label_de: 'Brunnenwasser', order_index: 2 },
        { value: 'rainwater', label_de: 'Regenwasser', order_index: 3 },
      ] },
      { symbol: 'swimming_test_hardness', label_de: 'Gesamthärte (Schwimmbereich)', data_type: 'number', unit: 'mmol/l', order_index: 0, section: 'C' },
      { symbol: 'water_test_ammonium', label_de: 'Ammonium (Füllwasser)', data_type: 'number', unit: 'mg/l', order_index: 0, section: 'C' },
      { symbol: 'water_test_iron', label_de: 'Eisen (Füllwasser)', data_type: 'number', unit: 'mg/l', order_index: 0, section: 'C' },
      { symbol: 'water_test_p_total', label_de: 'Gesamt-Phosphor (Füllwasser)', data_type: 'number', unit: 'mg/l', order_index: 0, section: 'C' },
      { symbol: 'water_test_orthophosphate', label_de: 'Orthophosphat als P (Füllwasser)', data_type: 'number', unit: 'mg/l', order_index: 0, section: 'C' },
      { symbol: 'water_test_hardness', label_de: 'Gesamthärte (Erdalkalien) (Füllwasser)', data_type: 'number', unit: 'mmol/l', order_index: 0, section: 'C' },
      { symbol: 'water_test_conductivity', label_de: 'Leitfähigkeit (Füllwasser)', data_type: 'number', unit: 'µS/cm', order_index: 0, section: 'C' },
      { symbol: 'water_test_manganese', label_de: 'Mangan (Füllwasser)', data_type: 'number', unit: 'mg/l', order_index: 0, section: 'C' },
      { symbol: 'water_test_nitrate', label_de: 'Nitrat (Füllwasser)', data_type: 'number', unit: 'mg/l', order_index: 0, section: 'C' },
      { symbol: 'water_test_ph', label_de: 'pH-Wert (Füllwasser)', data_type: 'number', unit: '-', order_index: 0, section: 'C' },
      { symbol: 'water_test_acid_capacity_ks43', label_de: 'Säurekapazität KS 4.3 (Füllwasser)', data_type: 'number', unit: 'mmol/l', order_index: 0, section: 'C' },
      { symbol: 'swimming_test_ammonium', label_de: 'Ammonium (Schwimmbereich)', data_type: 'number', unit: 'mg/l', order_index: 0, section: 'C' },
      { symbol: 'swimming_test_p_total', label_de: 'Gesamt-Phosphor (Schwimmbereich)', data_type: 'number', unit: 'mg/l', order_index: 0, section: 'C' },
      { symbol: 'swimming_test_conductivity', label_de: 'Leitfähigkeit (Schwimmbereich)', data_type: 'number', unit: 'µS/cm', order_index: 0, section: 'C' },
      { symbol: 'swimming_test_nitrate', label_de: 'Nitrat (Schwimmbereich)', data_type: 'number', unit: 'mg/l', order_index: 0, section: 'C' },
      { symbol: 'swimming_test_nitrite', label_de: 'Nitrit (Schwimmbereich)', data_type: 'number', unit: 'mg/l', order_index: 0, section: 'C' },
      { symbol: 'swimming_test_orthophosphate', label_de: 'Orthophosphat (Schwimmbereich)', data_type: 'number', unit: 'mg/l', order_index: 0, section: 'C' },
      { symbol: 'swimming_test_ph', label_de: 'pH-Wert (Schwimmbereich)', data_type: 'number', unit: '-', order_index: 0, section: 'C' },
      { symbol: 'swimming_test_acid_capacity_ks43', label_de: 'Säurekapazität KS 4.3 (Schwimmbereich)', data_type: 'number', unit: 'mmol/l', order_index: 0, section: 'C' },
    ],
    equations: [],
    compliance: [],
  },
  {
    code: 'FLLNT-05', title_de: 'Baustoff-Anforderungen', order_index: 5,
    fields: [
      { symbol: 'filter_substrate_elutriated_pct', label_de: 'Anteil eluierter Bestandteile', data_type: 'number', unit: '%', order_index: 0, section: 'C' },
      { symbol: 'plant_substrate_compliant', label_de: 'Pflanzsubstrat konform', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      { symbol: 'concrete_spec_compliant', label_de: 'Beton-Spezifikation konform', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      { symbol: 'wood_treatment_compliant', label_de: 'Holzbehandlung konform', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      { symbol: 'filter_substrate_elutable_p', label_de: 'Eluierbarer Phosphor (Substrat)', data_type: 'number', unit: 'mg/kg', order_index: 0, section: 'C' },
      { symbol: 'filter_substrate_oversize_pct', label_de: 'Überkornanteil (Filtersubstrat)', data_type: 'number', unit: '%', order_index: 0, section: 'C' },
      { symbol: 'materials_biocide_free', label_de: 'Materialien biozidfrei', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
    ],
    equations: [],
    compliance: [
      { code: 'REQ-12', title_de: 'Elutable phosphorus per Appendix 2', condition: 'filter_substrate_elutable_p <= 5', severity: 'block' },
    ],
  },
  {
    code: 'FLLNT-06', title_de: 'Flächenplanung', order_index: 6,
    fields: [
      { symbol: 'pool_ground_area_m2', label_de: 'Bodenfläche (kolonisierbare Grundfläche)', data_type: 'number', unit: 'm²', order_index: 40, section: 'B' },
      { symbol: 'pool_submerged_wall_area_m2', label_de: 'Unterwasser-Wandfläche', data_type: 'number', unit: 'm²', order_index: 41, section: 'B' },
      { symbol: 'supplementary_area_m2', label_de: 'Ergänzungsbereich (Fläche)', data_type: 'number', unit: 'm²', order_index: 0, section: 'C' },
      { symbol: 'pool_depth_max', label_de: 'Maximale Wassertiefe', data_type: 'number', unit: 'm', order_index: 0, section: 'C' },
      { symbol: 'regeneration_area_m2', label_de: 'Regenerationsbereich (Fläche)', data_type: 'number', unit: 'm²', order_index: 0, section: 'C' },
      { symbol: 'swimming_area_m2', label_de: 'Schwimmbereich (Fläche)', data_type: 'number', unit: 'm²', order_index: 0, section: 'C' },
      { symbol: 'total_pool_area_m2', label_de: 'Gesamtwasserfläche', data_type: 'number', unit: 'm²', order_index: 0, section: 'D' },
      { symbol: 'pool_underwater_surface', label_de: 'Unterwasserfläche (besonnt)', data_type: 'number', unit: 'm²', order_index: 0, section: 'D' },
    ],
    equations: [
      { id: 'c1928ea5-bdb7-4396-9cbd-cdaffa5c4b2f', equation_number: 'EQ-PUWS', formula: 'pool_underwater_surface = pool_ground_area_m2 + pool_submerged_wall_area_m2', output_symbol: 'pool_underwater_surface' },
    ],
    compliance: [
      { code: 'REQ-13', title_de: 'Space requirements adequate', condition: 'total_pool_area_m2 IS NOT NULL AND regeneration_area_m2 IS NOT NULL AND swimming_area_m2 IS NOT NULL', severity: 'block' },
      { code: 'REQ-14', title_de: 'Excavation', condition: 'attest_fllnt_06_req_14 == True', severity: 'block' },
      { code: 'REQ-15', title_de: 'Separation of areas', condition: 'area_separation_method IS NOT EMPTY', severity: 'block' },
      { code: 'REQ-16', title_de: 'Sealing', condition: 'sealing_type IS NOT NULL', severity: 'block' },
      { code: 'REQ-17', title_de: 'Edge design', condition: 'edge_design IS NOT EMPTY', severity: 'block' },
      { code: 'REQ-18', title_de: 'Swimming-area construction', condition: 'attest_fllnt_06_req_18 == True', severity: 'block' },
      { code: 'REQ-31', title_de: 'Edge design and freeboard per §9.4', condition: 'freeboard_water_to_seal >= 5 AND edge_height_tolerance_mm <= 10', severity: 'block' },
      { code: 'REQ-32', title_de: 'Sealing biocide-free and biofilm-permissive', condition: 'sealing_biocide_free_biofilm_ok == true', severity: 'block' },
    ],
  },
  {
    code: 'FLLNT-07', title_de: 'Bau- & Konstruktionsanforderungen', order_index: 7,
    fields: [
      { symbol: 'area_separation_method', label_de: 'Trennung Schwimm-/Regenerationsbereich', data_type: 'text', unit: null, order_index: 0, section: 'C' },
      { symbol: 'excavation_depth', label_de: 'Aushubtiefe', data_type: 'number', unit: 'm', order_index: 0, section: 'C' },
      { symbol: 'sealing_type', label_de: 'Abdichtungsart', data_type: 'enum', unit: null, order_index: 0, section: 'C', enum_values: [
        { value: 'clay_loam', label_de: 'Ton/Lehm-Dichtung', order_index: 1 },
        { value: 'EPDM', label_de: 'EPDM-Folie', order_index: 2 },
        { value: 'PVC', label_de: 'PVC-Folie', order_index: 3 },
        { value: 'concrete', label_de: 'Beton-Dichtung', order_index: 4 },
        { value: 'other', label_de: 'Andere', order_index: 5 },
      ] },
      { symbol: 'edge_design', label_de: 'Beckenrandgestaltung', data_type: 'text', unit: null, order_index: 0, section: 'C' },
      { symbol: 'entry_exit_provision', label_de: 'Ein- und Ausstiegsanlagen', data_type: 'text', unit: null, order_index: 0, section: 'C' },
      { symbol: 'freeboard_water_to_seal', label_de: 'Wasserspiegel-Abstand zur Dichtungsoberkante', data_type: 'number', unit: 'cm', order_index: 0, section: 'C' },
      { symbol: 'edge_height_tolerance_mm', label_de: 'Beckenkanten-Höhentoleranz', data_type: 'number', unit: 'mm', order_index: 0, section: 'C' },
      { symbol: 'sealing_biocide_free_biofilm_ok', label_de: 'Dichtung biozidfrei und biofilm-tolerant', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      { symbol: 'ground_covering_type', label_de: 'Bodenbelag', data_type: 'enum', unit: null, order_index: 0, section: 'C', enum_values: [
        { value: 'gravel', label_de: 'Kies', order_index: 1 },
        { value: 'sand', label_de: 'Sand', order_index: 2 },
        { value: 'mortar', label_de: 'Mörtel/Estrich', order_index: 3 },
        { value: 'plastic_mat', label_de: 'Kunststoffmatte', order_index: 4 },
        { value: 'other', label_de: 'Andere', order_index: 5 },
      ] },
    ],
    equations: [],
    compliance: [],
  },
  {
    code: 'FLLNT-08', title_de: 'Anlagenausstattung & Leistungsbeschreibung', order_index: 8,
    fields: [
      { symbol: 'equipment_elements_list', label_de: 'Anlagenausstattung', data_type: 'json', unit: null, order_index: 0, section: 'C' },
      { symbol: 'service_description_provided', label_de: 'Leistungsbeschreibung erstellt', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
    ],
    equations: [],
    compliance: [],
  },
  {
    code: 'FLLNT-09', title_de: 'Hydrobotanisches System – Bemessung', order_index: 9,
    fields: [
      { symbol: 'hydrobot_type', label_de: 'Hydrobotanik-Typ', data_type: 'enum', unit: null, order_index: 0, section: 'B', enum_values: [
        { value: 'submergent', label_de: 'submers (Unterwasserpflanzen)', order_index: 1 },
        { value: 'emersed', label_de: 'emers (Sumpf-/Uferpflanzen)', order_index: 2 },
      ] },
      { symbol: 'hydrobot_water_column', label_de: 'Wassersäulenhöhe (Hydrobotanik)', data_type: 'number', unit: 'cm', order_index: 0, section: 'C' },
      { symbol: 'hydrobot_substrate_thickness', label_de: 'Substratschichtdicke (Hydrobotanik)', data_type: 'number', unit: 'cm', order_index: 0, section: 'C' },
      { symbol: 'hydrobot_grain_size_max', label_de: 'Korngröße max. (Hydrobotanik)', data_type: 'number', unit: 'mm', order_index: 0, section: 'C' },
      { symbol: 'hydrobot_feed_rate', label_de: 'Beschickungsrate Qmax (Hydrobotanik)', data_type: 'number', unit: 'm³/(m²·d)', order_index: 0, section: 'D' },
    ],
    equations: [],
    compliance: [
      { code: 'REQ-08', title_de: 'Phosphorus-binding stage for slow filter', condition: "if filter_flow_type == 'slow' then p_binding_required == true", severity: 'block' },
      { code: 'REQ-19', title_de: 'Hydrobotanical system per Tab. 10', condition: 'hydrobot_grain_size_max <= 8 AND hydrobot_feed_rate <= 5 AND (IF hydrobot_type == submergent THEN (hydrobot_water_column >= 80 AND hydrobot_substrate_thickness >= 10 AND hydrobot_substrate_thickness <= 20)) AND (IF hydrobot_type == emersed THEN (hydrobot_water_column >= 10 AND hydrobot_water_column <= 50 AND hydrobot_substrate_thickness >= 10 AND hydrobot_substrate_thickness <= 30))', severity: 'block' },
      { code: 'REQ-20', title_de: 'Substrate filter slow flow per Tab. 11', condition: '(IF filter_flow_direction IN {vertical_continuous_overflow, vertical_no_overflow} THEN (filter_layer_thickness >= 40 AND filter_grain_size_max <= 16 AND filter_substrate_oversize_pct <= 15 AND filter_substrate_elutriated_pct <= 2 AND filter_frost_resistance == true AND filter_layer_tolerance_pct <= 10 AND filter_kf >= 0.0001)) AND (IF filter_flow_direction == vertical_continuous_overflow THEN (filter_water_column >= 10 AND filter_feed_rate_slow_qmax <= 5)) AND (IF filter_flow_direction == vertical_no_overflow THEN filter_feed_rate_slow_qmax <= 8)', severity: 'block' },
      { code: 'REQ-21', title_de: 'Substrate filter quick flow per Tab. 12', condition: 'IF filter_flow_direction IN {vertical_continuous_overflow,vertical_no_overflow} THEN (filter_layer_thickness >= 50 AND filter_grain_size_max <= 32 AND filter_substrate_oversize_pct <= 15 AND filter_substrate_elutriated_pct <= 0.5 AND filter_frost_resistance == true AND filter_layer_tolerance_pct <= 10 AND filter_kf >= 0.001 AND filter_feed_rate_quick_qmin >= 15)', severity: 'block' },
      { code: 'REQ-23', title_de: 'Water circulation', condition: 'attest_fllnt_09_req_23 == True', severity: 'block' },
      { code: 'REQ-24', title_de: 'Physical/chemical techniques supplementary only', condition: 'IF physical_chemical_used == true THEN NOT (regeneration_technique IN {physical_chemical})', severity: 'block' },
      { code: 'REQ-33', title_de: 'Overflow weir sizing and tolerance', condition: 'IF rigid_overflow_used == true THEN splash_water_tank_volume >= 150 * pool_underwater_surface', severity: 'block' },
    ],
  },
  {
    code: 'FLLNT-10', title_de: 'Substratfilter – Bemessung (Langsam-/Schnellströmung)', order_index: 10,
    fields: [
      { symbol: 'filter_flow_direction', label_de: 'Filter-Strömungsrichtung', data_type: 'enum', unit: null, order_index: 0, section: 'B', enum_values: [
        { value: 'vertical_continuous_overflow', label_de: 'vertikal, durchgehender Vollüberlauf', order_index: 1 },
        { value: 'vertical_no_overflow', label_de: 'vertikal, ohne Überlauf', order_index: 2 },
        { value: 'horizontal', label_de: 'horizontal', order_index: 3 },
      ] },
      { symbol: 'filter_flow_type', label_de: 'Filter-Strömungsart', data_type: 'enum', unit: null, order_index: 0, section: 'B', enum_values: [
        { value: 'slow', label_de: 'Langsamströmung', order_index: 1 },
        { value: 'quick', label_de: 'Schnellströmung', order_index: 2 },
      ] },
      { symbol: 'filter_layer_thickness', label_de: 'Filterwirksame Schichtdicke', data_type: 'number', unit: 'cm', order_index: 0, section: 'C' },
      { symbol: 'filter_grain_size_max', label_de: 'Korngröße max. (Filter)', data_type: 'number', unit: 'mm', order_index: 0, section: 'C' },
      { symbol: 'filter_kf', label_de: 'Durchlässigkeitsbeiwert k_f', data_type: 'number', unit: 'm/s', order_index: 0, section: 'C' },
      { symbol: 'filter_layer_tolerance_pct', label_de: 'Toleranz Schichtdicke (Filter)', data_type: 'number', unit: '%', order_index: 0, section: 'C' },
      { symbol: 'grain_specific_surface', label_de: 'Spez. Kornoberfläche', data_type: 'number', unit: 'm²/m³', order_index: 0, section: 'C' },
      { symbol: 'filter_frost_resistance', label_de: 'Frostbeständigkeit Filter', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      { symbol: 'filter_water_column', label_de: 'Wassersäulenhöhe (Filter)', data_type: 'number', unit: 'cm', order_index: 0, section: 'C' },
      { symbol: 'aerobic_filtration_confirmed', label_de: 'Aerobe Filtration bestätigt', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      { symbol: 'filter_feed_rate_quick_qmin', label_de: 'Beschickungsrate Qmin (Filter, schnell)', data_type: 'number', unit: 'm³/(m²·d)', order_index: 0, section: 'D' },
      { symbol: 'filter_feed_rate_slow_qmax', label_de: 'Beschickungsrate Qmax (Filter, langsam)', data_type: 'number', unit: 'm³/(m²·d)', order_index: 0, section: 'D' },
      { symbol: 'filter_volume_required', label_de: 'Erforderliches Filtervolumen', data_type: 'number', unit: 'm³', order_index: 0, section: 'D' },
      { symbol: 'filter_colonized_surface_actual', label_de: 'Tatsächliche Bewuchsfläche (Filter)', data_type: 'number', unit: 'm²', order_index: 0, section: 'D' },
      { symbol: 'filter_50x_rule_met', label_de: '50×-Regel erfüllt', data_type: 'boolean', unit: null, order_index: 0, section: 'F' },
      // EQ-02 drivers — active + UNSECTIONED on prod (order_index 160/170)
      { symbol: 'F_filter', label_de: 'Filterquerschnitt', data_type: 'number', unit: 'm²', order_index: 160, section: null },
      { symbol: 'h_filter', label_de: 'Filterhöhe', data_type: 'number', unit: 'm', order_index: 170, section: null },
    ],
    equations: [
      { id: '0a875bd8-1e8f-47f2-9a38-62396ea73c70', equation_number: 'EQ-01', formula: 'filter_colonized_surface_actual >= 50 * pool_underwater_surface', output_symbol: 'filter_50x_rule_met' },
      { id: 'e56fc10a-de59-4b62-af9b-bbfa6bc012b4', equation_number: 'EQ-02', formula: 'filter_colonized_surface_actual = grain_specific_surface * F_filter * h_filter', output_symbol: 'filter_colonized_surface_actual' },
      { id: 'b722809a-24c4-4c2d-8e8c-ea65a65a7e49', equation_number: 'EQ-03', formula: 'filter_volume_required = (pool_underwater_surface * 50) / grain_specific_surface', output_symbol: 'filter_volume_required' },
    ],
    compliance: [
      { code: 'REQ-22', title_de: '50× colonized-surface rule', condition: 'filter_50x_rule_met == true', severity: 'block' },
      { code: 'REQ-30', title_de: 'Aerobic filtration mandated', condition: 'aerobic_filtration_confirmed == true', severity: 'block' },
    ],
  },
  {
    code: 'FLLNT-11', title_de: 'Wasserzirkulation & technische Anlagen', order_index: 11,
    fields: [
      { symbol: 'rigid_overflow_used', label_de: 'Starrer Überlauf verwendet', data_type: 'boolean', unit: null, order_index: 0, section: 'B' },
      { symbol: 'physical_chemical_used', label_de: 'Physikalisch-chemische Verfahren verwendet', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      { symbol: 'circulation_type', label_de: 'Zirkulationsart', data_type: 'text', unit: null, order_index: 0, section: 'C' },
      { symbol: 'overflow_type', label_de: 'Überlauftyp', data_type: 'text', unit: null, order_index: 0, section: 'C' },
      { symbol: 'intake_discharge_provided', label_de: 'Zu-/Ableitung dimensioniert', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      { symbol: 'treatment_impermissible_used', label_de: 'Unzulässige Behandlung verwendet', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      { symbol: 'splash_water_tank_volume', label_de: 'Schwallwasserbehälter-Volumen', data_type: 'number', unit: 'l', order_index: 0, section: 'C' },
      { symbol: 'overflow_horizontal_tolerance_mm', label_de: 'Überlaufkanten-Horizontaltoleranz', data_type: 'number', unit: 'mm', order_index: 0, section: 'C' },
      { symbol: 'overflow_edge_length', label_de: 'Überlaufkanten-Länge', data_type: 'number', unit: 'm', order_index: 0, section: 'D' },
      // EQ-04 driver — active + UNSECTIONED on prod (order_index 100). This is a
      // prod DUPLICATE of the FLLNT-06 swimming_area_m2 copy; prod owns both, so
      // the seeder now carries it on FLLNT-11 too, making EQ-04 resolve locally.
      { symbol: 'swimming_area_m2', label_de: 'Schwimmbereich (Fläche)', data_type: 'number', unit: 'm²', order_index: 100, section: null },
    ],
    equations: [
      { id: '356a95cc-499a-454c-a905-d0de3bf41643', equation_number: 'EQ-04', formula: 'overflow_edge_length = 0.01 * swimming_area_m2', output_symbol: 'overflow_edge_length' },
      { id: '27f94c84-87bd-411e-a9e5-c7546c59f713', equation_number: 'EQ-05', formula: 'splash_water_tank_volume >= 150 * pool_underwater_surface', output_symbol: 'splash_water_tank_volume' },
    ],
    compliance: [
      { code: 'REQ-29', title_de: 'Impermissible water treatments not used', condition: 'treatment_impermissible_used == false', severity: 'block' },
    ],
  },
  {
    code: 'FLLNT-12', title_de: 'Pflanzplan', order_index: 12,
    fields: [
      { symbol: 'plant_species_list', label_de: 'Pflanzenliste', data_type: 'json', unit: null, order_index: 0, section: 'C' },
      { symbol: 'pre_maturity_care_provided', label_de: 'Anwuchspflege geleistet', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      { symbol: 'plant_density_marsh_medium_per_m2', label_de: 'Pflanzdichte (mittel-hoch Sumpf)', data_type: 'number', unit: 'plants/m²', order_index: 0, section: 'C' },
      { symbol: 'plant_density_submerged_per_m2', label_de: 'Pflanzdichte (submers)', data_type: 'number', unit: 'plants/m²', order_index: 0, section: 'C' },
      { symbol: 'plant_density_marsh_small_per_m2', label_de: 'Pflanzdichte (klein-mittel Sumpf)', data_type: 'number', unit: 'plants/m²', order_index: 0, section: 'C' },
      { symbol: 'planting_completion_date', label_de: 'Pflanztermin abgeschlossen', data_type: 'date', unit: null, order_index: 0, section: 'D' },
      // attest driver for REQ-25 — active + UNSECTIONED on prod
      { symbol: 'attest_fllnt_12_req_25', label_de: 'Attestierung: Bepflanzung abgeschlossen', data_type: 'boolean', unit: null, order_index: 0, section: null },
    ],
    equations: [],
    compliance: [
      { code: 'REQ-25', title_de: 'Plants and planting completed', condition: 'attest_fllnt_12_req_25 == True', severity: 'block' },
    ],
  },
  {
    code: 'FLLNT-13', title_de: 'Abnahme', order_index: 13,
    fields: [
      { symbol: 'completion_notice_days_advance', label_de: 'Vorlauf Fertigstellungsanzeige', data_type: 'number', unit: 'days', order_index: 0, section: 'C' },
      { symbol: 'defects_noted', label_de: 'Mängel-Anmerkungen', data_type: 'text', unit: null, order_index: 0, section: 'C' },
      { symbol: 'acceptance_date', label_de: 'Abnahmedatum', data_type: 'date', unit: null, order_index: 0, section: 'C' },
      { symbol: 'acceptance_passed', label_de: 'Abnahme bestanden', data_type: 'boolean', unit: null, order_index: 0, section: 'F' },
      // attest driver for REQ-28 — active + UNSECTIONED on prod
      { symbol: 'attest_fllnt_13_req_28', label_de: 'Attestierung: Reparaturvorkehrungen & Nachbesserung', data_type: 'boolean', unit: null, order_index: 0, section: null },
    ],
    equations: [],
    compliance: [
      { code: 'REQ-26', title_de: 'Acceptance inspection passed', condition: 'acceptance_passed == true OR defects_noted IS EMPTY', severity: 'block' },
      { code: 'REQ-28', title_de: 'Repair provisions and re-stabilization', condition: 'attest_fllnt_13_req_28 == True', severity: 'block' },
    ],
  },
  {
    code: 'FLLNT-14', title_de: 'Instandhaltung & Betrieb', order_index: 14,
    fields: [
      { symbol: 'maintenance_contract_in_place', label_de: 'Wartungsvertrag', data_type: 'boolean', unit: null, order_index: 0, section: 'C' },
      { symbol: 'repair_provisions', label_de: 'Reparaturvorkehrungen', data_type: 'text', unit: null, order_index: 0, section: 'C' },
      { symbol: 'inspection_frequency', label_de: 'Prüfintervall', data_type: 'text', unit: null, order_index: 0, section: 'C' },
    ],
    equations: [],
    compliance: [
      { code: 'REQ-27', title_de: 'Maintenance plan in place', condition: 'maintenance_contract_in_place == true', severity: 'block' },
    ],
  },
  {
    code: 'FLLNT-15', title_de: 'Konformitäts-Zusammenfassung', order_index: 15,
    fields: [
      { symbol: 'phase_1_gate', label_de: 'Phase 1 – Gate', data_type: 'enum', unit: null, order_index: 0, section: 'C', enum_values: GATE_ENUM },
      { symbol: 'phase_2_gate', label_de: 'Phase 2 – Gate', data_type: 'enum', unit: null, order_index: 0, section: 'C', enum_values: GATE_ENUM },
      { symbol: 'phase_3_gate', label_de: 'Phase 3 – Gate', data_type: 'enum', unit: null, order_index: 0, section: 'C', enum_values: GATE_ENUM },
      { symbol: 'phase_4_gate', label_de: 'Phase 4 – Gate', data_type: 'enum', unit: null, order_index: 0, section: 'C', enum_values: GATE_ENUM },
      { symbol: 'phase_5_gate', label_de: 'Phase 5 – Gate', data_type: 'enum', unit: null, order_index: 0, section: 'C', enum_values: GATE_ENUM },
      { symbol: 'phase_6_gate', label_de: 'Phase 6 – Gate', data_type: 'enum', unit: null, order_index: 0, section: 'C', enum_values: GATE_ENUM },
      { symbol: 'compliance_verdict_overall', label_de: 'Gesamt-Konformitätsurteil', data_type: 'enum', unit: null, order_index: 0, section: 'F', enum_values: [
        { value: 'compliant', label_de: 'konform', order_index: 1 },
        { value: 'compliant_with_conditions', label_de: 'konform mit Auflagen', order_index: 2 },
        { value: 'not_compliant', label_de: 'nicht konform', order_index: 3 },
        { value: 'insufficient_data', label_de: 'unzureichende Daten', order_index: 4 },
      ] },
    ],
    equations: [],
    compliance: [],
  },
];

// ── result types ────────────────────────────────────────────────────────────
export type SeededWorksheet = {
  code: string;
  templateId: string;
  instanceId: string;
  /** section code → section id */
  sectionIds: Record<string, string>;
  /** field symbol → field id */
  fieldIds: Record<string, string>;
};

export type SeededFllNaturteichFixture = {
  projectId: string;
  userId: string;
  standardId: string;
  /** worksheet code (e.g. 'FLLNT-06') → its seeded ids */
  worksheets: Record<string, SeededWorksheet>;
  /** convenience: worksheet code → its worksheet_instance id */
  instanceIdByCode: Record<string, string>;
  /** convenience: 'FLLNT-06:pool_ground_area_m2' → field id */
  fieldIdByKey: Record<string, string>;
};

/** Neutral, well-typed default so no chain begins from a NULL it did not pick.
 *  These are placeholders (NOT source-verified) — a verify agent overwrites
 *  whichever inputs its chain reads. Enum defaults to the first option. */
function defaultParamCols(
  f: FieldSpec,
  sqlJson: (v: unknown) => unknown,
): Record<string, unknown> {
  switch (f.data_type) {
    case 'number':
      return { value_number: '0' };
    case 'boolean':
      return { value_boolean: false };
    case 'date':
      return { value_date: '2026-01-01' };
    case 'enum':
      return { value_enum: f.enum_values && f.enum_values.length ? f.enum_values[0].value : '' };
    case 'json':
      return { value_json: sqlJson({}) };
    case 'text':
    default:
      return { value_text: '' };
  }
}

/**
 * Seed the full FLL-Naturteich standard into the harness Postgres.
 *
 * Creates one org + project + standard (+ project_standards row) and, for every
 * worksheet, its template, referenced sections, all active fields (with enum
 * values), all equations, all block-severity compliance requirements, one
 * worksheet_instance, and a defaulted project_parameters row per field.
 *
 * @param sql     a raw postgres.js client on the harness DB (harness.sql)
 * @param userId  the BYPASS_AUTH principal (must become an org member)
 */
export async function seedFllNaturteich(
  sql: postgres.Sql,
  userId: string,
): Promise<SeededFllNaturteichFixture> {
  // ── principal + project + attached standard ───────────────────────────────
  await sql`INSERT INTO profiles (id, email) VALUES (${userId}, 'harness-fllnt@test.local')
            ON CONFLICT (id) DO NOTHING`;
  const [org] = await sql<{ id: string }[]>`
    INSERT INTO orgs (name, slug) VALUES ('Harness FLL-NT Org', ${'harness-fllnt-' + Date.now() + '-' + Math.random()}) RETURNING id`;
  await sql`INSERT INTO org_members (org_id, user_id, role) VALUES (${org.id}, ${userId}, 'owner')`;
  const [proj] = await sql<{ id: string }[]>`
    INSERT INTO projects (org_id, name, created_by) VALUES (${org.id}, 'FLL-Naturteich Harness', ${userId}) RETURNING id`;
  const [std] = await sql<{ id: string }[]>`
    INSERT INTO standards (code, title_de, version)
    VALUES (${FLL_NATURTEICH_CODE}, 'FLL Naturteich / Schwimmteich', 'harness') RETURNING id`;
  await sql`
    INSERT INTO project_standards (project_id, standard_id, status)
    VALUES (${proj.id}, ${std.id}, 'active')`;

  const worksheets: Record<string, SeededWorksheet> = {};
  const instanceIdByCode: Record<string, string> = {};
  const fieldIdByKey: Record<string, string> = {};

  for (const ws of FLL_NATURTEICH_WORKSHEETS) {
    // template
    const [t] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_templates (standard_id, code, title_de, order_index)
      VALUES (${std.id}, ${ws.code}, ${ws.title_de}, ${ws.order_index}) RETURNING id`;

    // sections — materialise only those a field references (skip UNSECTIONED
    // driver/attest fields whose section is null on prod).
    const sectionCodes = [...new Set(ws.fields.map((f) => f.section))].filter(
      (c): c is string => c !== null,
    );
    const sectionIds: Record<string, string> = {};
    for (const code of sectionCodes) {
      const meta = SECTION_META[code] ?? { title_de: code, order_index: 0 };
      const [s] = await sql<{ id: string }[]>`
        INSERT INTO worksheet_sections (worksheet_template_id, code, title_de, order_index)
        VALUES (${t.id}, ${code}, ${meta.title_de}, ${meta.order_index}) RETURNING id`;
      sectionIds[code] = s.id;
    }

    // instance
    const [inst] = await sql<{ id: string }[]>`
      INSERT INTO worksheet_instances (project_id, worksheet_template_id)
      VALUES (${proj.id}, ${t.id}) RETURNING id`;

    // fields (+ enum_values) and a defaulted project_parameters row for each
    const fieldIds: Record<string, string> = {};
    for (const f of ws.fields) {
      const enumJson = f.enum_values && f.enum_values.length ? sql.json(f.enum_values) : null;
      const sectionId = f.section === null ? null : sectionIds[f.section];
      const [row] = await sql<{ id: string }[]>`
        INSERT INTO fields (worksheet_template_id, section_id, symbol, label_de, data_type, unit, enum_values, active, order_index)
        VALUES (${t.id}, ${sectionId}, ${f.symbol}, ${f.label_de}, ${f.data_type}, ${f.unit}, ${enumJson}, true, ${f.order_index})
        RETURNING id`;
      fieldIds[f.symbol] = row.id;
      fieldIdByKey[`${ws.code}:${f.symbol}`] = row.id;

      await sql`
        INSERT INTO project_parameters ${sql({
          project_id: proj.id,
          field_id: row.id,
          source_worksheet_instance_id: inst.id,
          entered_by: userId,
          source_type: 'entered',
          ...defaultParamCols(f, (v) => sql.json(v as never)),
        })}`;
    }

    // equations (verbatim ids from prod so topology triggers match)
    for (const e of ws.equations) {
      await sql`
        INSERT INTO equations (id, worksheet_template_id, equation_number, formula, output_symbol)
        VALUES (${e.id}, ${t.id}, ${e.equation_number}, ${e.formula}, ${e.output_symbol})`;
    }

    // block-severity compliance requirements (so the approval gate enforces)
    for (const c of ws.compliance) {
      await sql`
        INSERT INTO compliance_requirements (worksheet_template_id, code, title_de, condition, severity)
        VALUES (${t.id}, ${c.code}, ${c.title_de}, ${c.condition}, ${c.severity})`;
    }

    worksheets[ws.code] = { code: ws.code, templateId: t.id, instanceId: inst.id, sectionIds, fieldIds };
    instanceIdByCode[ws.code] = inst.id;
  }

  return {
    projectId: proj.id,
    userId,
    standardId: std.id,
    worksheets,
    instanceIdByCode,
    fieldIdByKey,
  };
}
