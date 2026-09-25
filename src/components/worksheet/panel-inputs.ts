/**
 * Inputs of the origin/main worksheet panels (design window 5f67b98, Tab. 3
 * 9697dfa/aca1a4d, guideline tables as printed 5c1787f/a0a7b9b/3913934, site
 * portal links 1a24be2), lifted VERBATIM out of main's `worksheet-form.tsx`
 * memos when origin/main was merged into feat/guideline-to-tool (2026-09-25).
 *
 * Why a separate module: the branch pins `worksheet-form.tsx` to ONE renderer
 * path with no symbol-keyed carrier wiring (worksheet-form-no-symbol-wiring
 * test — `r_D_n_table` / `rainfall_table_ref` are retired literals there).
 * These panels READ carrier values for display only; they never dispatch an
 * editor. Keeping the reads here keeps that guard intact while the behaviour
 * stays byte-for-byte main's (first-match `fields.find` where main used it,
 * last-wins `fieldBySymbol` where main used that).
 */
import type { FieldValue } from '@/lib/state/worksheet-store';
import { normalizeRainfallCarrier, resolveSelectedTable, resolveColumn } from '@/lib/eval/rainfall-tables';
import { GUIDELINE_TABLES, TABLES_BY_WORKSHEET } from '@/lib/eval/guideline-tables';
import { TAB3_CRITERIA } from '@/lib/eval/feasibility-table';
import { DESIGN_WINDOWS, WINDOW_BY_WORKSHEET, type FacilityKey } from '@/lib/eval/design-window';

export type PanelField = { id: string; symbol: string; dataType: string; inheritedFromWorksheet?: string };
type Values = Readonly<Record<string, FieldValue | undefined>>;
type FieldMeta = { id: string; dataType: string; inheritedFrom?: string };

export type DesignWindowInputs = {
  facility: FacilityKey;
  rows: Array<{ D_min: number | null; r_D_n: number | null }>;
  compareRows: { T: number; rows: Array<{ D_min: number | null; r_D_n: number | null }> } | null;
  scalars: Record<string, number | null>;
  current: number | null;
  T: number | null;
};

/** Design window (A138-16…22): the facility's design variable scanned against every guideline limit, from the SAME
 * rain rows / scalars the engine uses. Null unless this is the worksheet of the chosen facility with a resolvable
 * rainfall column. */
export function designWindowInputs(args: {
  worksheetCode: string;
  fields: ReadonlyArray<PanelField>;
  fieldBySymbol: ReadonlyMap<string, PanelField>;
  values: Values;
  designReturnPeriod: number | null;
}): DesignWindowInputs | null {
  const { worksheetCode, fields, fieldBySymbol, values } = args;
  const facility = WINDOW_BY_WORKSHEET[worksheetCode];
  if (!facility || !DESIGN_WINDOWS[facility]) return null;
  const pick = (sym: string): number | null => {
    const f = fieldBySymbol.get(sym);
    if (!f) return null;
    const v = values[f.id];
    return v?.type === 'number' && v.value != null && Number.isFinite(v.value) ? v.value : null;
  };
  const chosen = (() => {
    const f = fieldBySymbol.get('facility_type_selected');
    const v = f ? values[f.id] : undefined;
    return v?.type === 'enum' || v?.type === 'text' ? v.value : null;
  })();
  if (chosen && chosen !== facility) return null;
  // A138-04 KOSTRA carrier + the facility's rainfall_table_ref (the row id the reference widget stores).
  const kostraField = fields.find((f) => f.symbol === 'r_D_n_table');
  const rainfallRefField = fields.find((f) => f.symbol === 'rainfall_table_ref');
  const rainfallRefValue = rainfallRefField ? values[rainfallRefField.id] : undefined;
  const rainfallTableRef =
    (rainfallRefValue?.type === 'text' || rainfallRefValue?.type === 'enum') && typeof rainfallRefValue.value === 'string'
      ? rainfallRefValue.value
      : null;
  const kostraValue = kostraField ? values[kostraField.id] : undefined;
  const selected = resolveSelectedTable(normalizeRainfallCarrier(kostraValue?.type === 'json' ? kostraValue.value : undefined), rainfallTableRef);
  if (!selected) return null;
  const T = args.designReturnPeriod;
  const col = resolveColumn(selected, T);
  if (col.status === 'missing') return null;
  const rows = col.rows.map((r) => ({ D_min: r.D_min, r_D_n: r.r_D_n }));
  // Comparison column: the next lower canonical return period that is populated.
  let compareRows: { T: number; rows: typeof rows } | null = null;
  if (T != null) {
    for (const Tc of [10, 5, 3, 2, 1].filter((t) => t < T)) {
      const c = resolveColumn(selected, Tc as 1 | 2 | 3 | 5 | 10);
      if (c.status === 'ok') { compareRows = { T: Tc, rows: c.rows.map((r) => ({ D_min: r.D_min, r_D_n: r.r_D_n })) }; break; }
    }
  }
  const def = DESIGN_WINDOWS[facility]!;
  // Variable = the facility's own design quantity (A_S,m inherited from A138-12 for the swale; the
  // overrained area A_VA_Mulde is passed separately — the two are NOT identified silently, F-3c).
  const current = pick(def.variable.symbol);
  const scalars: Record<string, number | null> = {
    A_C: pick('A_C'), k_i: pick('k_i'), f_Z: pick('f_Z'), f_A: pick('f_A') ?? 1, Q_Dr: pick('Q_Dr') ?? 0,
    A_VA: facility === 'mulde' ? pick('A_VA_Mulde') : pick('A_VA_MRE') ?? pick('A_VA'),
    V_M: pick('V_M_MRE') ?? pick('V_M'),
    b_R: pick('b_R'), h_R: pick('h_R'), s_R: pick('s_R') ?? pick('s_F'),
    D_flaeche: pick('D_min_used'),
  };
  return { facility, rows, compareRows, scalars, current, T };
}

/** A138-02: Tab. 3 shown as printed, with the column each answer falls into. */
export function tab3Inputs(worksheetCode: string, fieldBySymbol: ReadonlyMap<string, PanelField>):
  { metas: Record<string, FieldMeta | undefined>; determinationFieldId: string | undefined } | null {
  if (worksheetCode !== 'A138-02') return null;
  const metas: Record<string, FieldMeta | undefined> = {};
  for (const c of TAB3_CRITERIA) for (const sym of c.symbols) {
    const f = fieldBySymbol.get(sym);
    metas[sym] = f ? { id: f.id, dataType: f.dataType, inheritedFrom: f.inheritedFromWorksheet } : undefined;
  }
  return { metas, determinationFieldId: fieldBySymbol.get('feasibility_determination')?.id };
}

/** Guideline decision tables (Tab. 8 / 11 / 14 …) shown as printed on the worksheet that consumes them. */
export function guidelineTableInputs(worksheetCode: string, fieldBySymbol: ReadonlyMap<string, PanelField>, values: Values):
  Array<{ code: string; metas: Record<string, FieldMeta | undefined>; extra: Record<string, string> }> {
  const codes = TABLES_BY_WORKSHEET[worksheetCode] ?? [];
  return codes.map((code) => {
    const t = GUIDELINE_TABLES[code];
    const metas: Record<string, FieldMeta | undefined> = {};
    const syms = new Set<string>([...t.targets, 'n', 'T_n', 'f_methode', 'permeability_test_method', 'facility_type_selected', 'A_C', 'flaechengruppe', 'belastungskategorie', 'soil_bodenart_tab13', 'design_method']);
    for (const sym of syms) {
      const f = fieldBySymbol.get(sym);
      if (f) metas[sym] = { id: f.id, dataType: f.dataType, inheritedFrom: f.inheritedFromWorksheet };
    }
    // Tab. 8: the A_C band is derived from the inherited A_C when it is visible
    const acField = fieldBySymbol.get('A_C');
    const acVal = acField ? values[acField.id] : undefined;
    const ac = acVal?.type === 'number' && acVal.value != null ? acVal.value : null;
    const extra: Record<string, string> = ac == null ? {} : { ac_band: ac <= 800 ? 'le800' : 'gt800' };
    return { code, metas, extra };
  });
}

/** A138-01 site coordinates: portal links (TIM-online, ELWAS-WEB) preset with the site. */
export function sitePortalFieldIds(fields: ReadonlyArray<PanelField>): { latFieldId: string; lonFieldId: string } | null {
  const lat = fields.find((f) => f.symbol === 'site_lat');
  const lon = fields.find((f) => f.symbol === 'site_lon');
  return lat && lon ? { latFieldId: lat.id, lonFieldId: lon.id } : null;
}
