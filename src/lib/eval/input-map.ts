/**
 * Input map ("Eingabe-Steckbrief") — for one standard on one project, every
 * active field classified by WHERE its value comes from, so the engineer sees
 * before opening a worksheet which inputs are genuinely theirs, which the
 * engine computes, which are prefilled from upstream, and what is still open.
 *
 * Pure: takes rows, returns rows. No DB, no React.
 *
 * Classes (first match wins):
 *   engine      — the symbol is the output of an equation on the same worksheet
 *                 (the engineer never types it; single-source rule).
 *   twin        — a TWIN_SYMBOLS rule prefills it from an upstream value.
 *   attestation — a boolean `attest_*` field (tick after reading the clause).
 *   manual      — everything else: the engineer's own input or decision.
 *
 * `inheritedDisplay` fields (rendered read-only from another worksheet) are
 * not the worksheet's own fields and never appear here.
 */
import { twinSourcesFor } from './twin-symbols';

export type InputMapField = {
  id: string;
  worksheetCode: string;
  symbol: string;
  labelDe: string;
  unit: string | null;
  dataType: string;
  isRequired: boolean;
  clauseReference: string | null;
};

export type InputMapEquation = { worksheetCode: string; outputSymbol: string | null };

export type InputClass = 'engine' | 'twin' | 'attestation' | 'manual';

export type InputMapRow = InputMapField & {
  klass: InputClass;
  /** For twins: the first source symbol (priority order). */
  twinSource: string | null;
  filled: boolean;
  /** Free-text hint where the value comes from in practice (intake table). */
  sourceHint: string | null;
};

export type InputMapWorksheet = {
  code: string;
  titleDe: string;
  phase: number | null;
  status: string | null;
  rows: InputMapRow[];
  counts: Record<InputClass, number> & { openManual: number; openRequired: number };
};

export type InputMapSummary = {
  worksheets: InputMapWorksheet[];
  totals: Record<InputClass, number> & { openManual: number; openRequired: number; fields: number };
};

/**
 * Practical source of the main DWA-A-138-1 inputs (the intake table of the
 * infiltration-proof workflow). Symbols not listed get no hint. This is a
 * documentation aid, not a rule; the rulings (a138-X-6) propose a column
 * `fields.intake_source` so it becomes data per standard.
 */
export const SOURCE_HINTS: Record<string, Record<string, string>> = {
  'DWA-A-138-1': {
    site_lat: 'Standort (TIM-online / Adresse)', site_lon: 'Standort (TIM-online / Adresse)',
    site_total_area: 'Lageplan / Kataster (TIM-online)', kostra_grid_cell: 'KOSTRA-DWD-2020 (DWD CDC / openko)',
    water_protection_zone: 'ELWAS-WEB Wasserschutzgebiete', project_type: 'Antragsteller',
    design_method: 'Ingenieurentscheidung (§5.3.3.2)', planning_phase: 'Antragsteller',
    kf_initial_estimate: 'Baugrundgutachten', gw_clearance: 'Baugrundgutachten / LANUK OpenHygrisC',
    building_pit_depth_a: 'Fundamentzeichnung', distance_to_building_actual: 'Lageplan',
    contaminated_land_status: 'ELWAS-WEB / Kataster Altlasten', geotech_hazards: 'Baugrundgutachten',
    slope_risk: 'TIM-online Hangneigung', feasibility_determination: 'Ingenieurentscheidung (Tab. 3)',
    permeability_test_method: 'Baugrundgutachten (Anlagen Sieblinien)', f_methode: 'Tab. 11 nach Prüfmethode',
    data_completeness: 'Ingenieurentscheidung',
    r_D_n_table: 'KOSTRA-DWD-2020 CSV (einfügen)', a138_KOSTRA_DWD_Atlas: 'KOSTRA-DWD-2020', kostra_data_date: 'DWD Datenbestand',
    k_f: 'Baugrundgutachten (Minimum der Proben)', mhgw: 'Gutachten oder LANUK OpenHygrisC', clearance_a: 'Tab. 3 / §5.1.1 (≥ 1 m)',
    soil_classification: 'Baugrundgutachten (DIN 18196)', kf_test_sites_count: 'Baugrundgutachten', kf_test_density_check: '§5.3.3.6 (1 je 150 m² Sohle)',
    flaechengruppe: 'Tab. 5 nach Flächennutzung', belastungskategorie: 'Tab. 5', treatment_required: 'Tab. 6',
    bbz_thickness: 'Tab. 14 (≥ 20 cm)', bbz_schlaemmkorn: 'Bodenzone-Spezifikation §5.2.3.2', bbz_organisch: 'Bodenzone-Spezifikation §5.2.3.2', bbz_ph: 'Bodenzone-Spezifikation §5.2.3.2',
    surface_inventory: 'Fundament-/Dachzeichnungen + Tab. 9', flood_check_trigger: 'Tab. 8 Fußnote (a), Gebäude mit UG',
    n: 'Tab. 8 nach Schutzkategorie', T_n: '= 1 / n', t_f: '§5.3.3.5', f_Z: '§5.3.3.7 (1,2 bei q ≤ 5)', f_A: '§5.3.3.7', f_ort: 'Tab. 10 Kriterien (0,3–1,0)', A_E: 'Lageplan',
    simple_method_applicable: '§5.3.3.2 (A_C, q_S,AC)',
    A_VA: 'Entwurf der Anlage (überregnete Fläche)', A_S: 'Entwurf der Anlage', A_S_min: 'Entwurf der Anlage', A_S_max: 'Entwurf der Anlage',
    a_s_m_determination_method: 'Ingenieurentscheidung', soil_bodenart_tab13: 'Tab. 13 nach Bodenart',
    facility_type_selected: 'Bild 7 Entscheidungsbaum', a138_auswahlkriterien: 'Bild 7 Begründung',
    h_M: 'Entwurf (Tab. 14 ≤ 30 cm)', freibord: 'Entwurf (≥ Einstau + Freibord)', boeschungsneigung: 'Tab. 14 (1:1,5 oder flacher)', b_M: 'Entwurf', L_M: 'Entwurf',
    b_R: 'Entwurf Rigole', h_R: 'Entwurf Rigole', s_F: 'Füllmaterial (Herstellerangabe)', d_i: 'Versickerrohr (Herstellerangabe)', d_a: 'Versickerrohr (Herstellerangabe)',
  },
};

export function classifyField(
  standardCode: string,
  f: InputMapField,
  equationOutputsOnWorksheet: Set<string>,
): { klass: InputClass; twinSource: string | null } {
  if (equationOutputsOnWorksheet.has(f.symbol)) return { klass: 'engine', twinSource: null };
  const twins = twinSourcesFor(standardCode, f.symbol);
  if (twins.length > 0) return { klass: 'twin', twinSource: twins[0] };
  if (f.dataType === 'boolean' && f.symbol.startsWith('attest_')) return { klass: 'attestation', twinSource: null };
  return { klass: 'manual', twinSource: null };
}

export function buildInputMap(args: {
  standardCode: string;
  worksheets: Array<{ code: string; titleDe: string; phase: number | null; status: string | null }>;
  fields: InputMapField[];
  equations: InputMapEquation[];
  filledFieldIds: Set<string>;
}): InputMapSummary {
  const outputsByWs = new Map<string, Set<string>>();
  for (const e of args.equations) {
    if (!e.outputSymbol) continue;
    const s = outputsByWs.get(e.worksheetCode) ?? new Set<string>();
    s.add(e.outputSymbol);
    outputsByWs.set(e.worksheetCode, s);
  }
  const hints = SOURCE_HINTS[args.standardCode] ?? {};
  const fieldsByWs = new Map<string, InputMapField[]>();
  for (const f of args.fields) {
    const arr = fieldsByWs.get(f.worksheetCode) ?? [];
    arr.push(f);
    fieldsByWs.set(f.worksheetCode, arr);
  }
  const zero = (): InputMapWorksheet['counts'] => ({ engine: 0, twin: 0, attestation: 0, manual: 0, openManual: 0, openRequired: 0 });
  const totals = { ...zero(), fields: 0 };

  const worksheets: InputMapWorksheet[] = args.worksheets.map((w) => {
    const outputs = outputsByWs.get(w.code) ?? new Set<string>();
    const counts = zero();
    const rows: InputMapRow[] = (fieldsByWs.get(w.code) ?? []).map((f) => {
      const { klass, twinSource } = classifyField(args.standardCode, f, outputs);
      const filled = args.filledFieldIds.has(f.id);
      counts[klass] += 1;
      if (klass === 'manual' && !filled) counts.openManual += 1;
      if (f.isRequired && !filled && klass !== 'engine') counts.openRequired += 1;
      return { ...f, klass, twinSource, filled, sourceHint: hints[f.symbol] ?? null };
    });
    for (const k of ['engine', 'twin', 'attestation', 'manual', 'openManual', 'openRequired'] as const) totals[k] += counts[k];
    totals.fields += rows.length;
    return { code: w.code, titleDe: w.titleDe, phase: w.phase, status: w.status, rows, counts };
  });

  return { worksheets, totals };
}
