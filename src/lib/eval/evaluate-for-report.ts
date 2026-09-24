/**
 * Server-side evaluator used by the PDF report-generation path.
 *
 * Mirrors the runtime form's `useEquationEngine` + `compliance-block`
 * logic but as pure functions that operate on already-loaded data
 * (no React, no zustand store, no DB calls). The same evaluator
 * primitives drive both paths: `evaluateFormula` (arithmetic engine +
 * aggregators) and `evaluateCondition` (compliance DSL parser).
 *
 * SCOPE: equation results for every equation (the engine routes all except
 * the manual deny-set, see `equation-manual-denylist`) and compliance results
 * for every compliance row, both keyed for the per-worksheet report renderer.
 */
import { evaluateFormula, type EvalState } from './formula';
import { engineInputValue } from './engine-input';
import { evaluateCondition, type EvalResult } from '../compliance/evaluate';
import { computeVisibility, hiddenFieldIdsOf, withHidden, type Visibility, type VisibilitySection } from '../compliance/visibility';
import { equationProfiles } from './equation-profiles';
import { rewriteRules } from './rewrites';
import { normalizeSymbols } from './normalize-formula';
import { shouldEngineEvaluate } from './equation-manual-denylist';
import { withFallbackRegisterEquations } from './register-configs';
import { buildCarriers, buildRegisters } from './register-rows';
import { makeTableLookup } from './regulation-tables-fallback';
import {
  normalizeRainfallCarrier,
  resolveSelectedTable,
  resolveColumn,
  facilityReturnPeriod,
} from './rainfall-tables';
import type {
  SubAreasCarrier,
  KostraCarrier,
  FloodSubAreasCarrier,
  Gl8Scalars,
  Gl10Scalars,
} from './aggregators';

// Plan 2a: the six A138-07 surface producers are formula strings over the
// `surface_inventory` register (rewrites.ts A138_07_REGISTER_FORMULAS) —
// no per-id branch here any more.

const A138_10_GL2_ID = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3';
const A138_13_GL8_ID = '69f31e6e-a755-4246-af10-ae46668b5c86';
const A138_26_GL10_ID = '8e3c7e22-e3c7-449a-b267-928332c89306';

export type ReportField = {
  id: string;
  symbol: string;
  unit: string | null;
  dataType: string;
  /** Plan 2a (Task 10): visible_when inputs — optional so legacy callers and
   * fixtures stay valid; absent ⇒ never hidden by section / no DB rule
   * (LEGACY_VISIBLE_WHEN still applies by symbol). */
  sectionId?: string | null;
  visibleWhen?: string | null;
  /** Plan 2a: DB register config (`widget='register'` + ui_config). Optional —
   * NULL widget + json dataType falls back to the TS register config by symbol. */
  widget?: string | null;
  uiConfig?: unknown;
};

export type ReportParameter = {
  fieldId: string;
  valueNumber: number | null;
  valueText: string | null;
  valueEnum: string | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  valueJson: unknown | null;
};

export type ReportEquation = {
  id: string;
  equationNumber: string;
  formula: string;
  inputSymbols: string[] | null;
  outputSymbol: string | null;
  outputUnit: string | null;
};

export type ReportComplianceRow = {
  id: string;
  code: string;
  titleDe: string;
  condition: string;
  severity: string;
  description: string | null;
  requiresAttestation: boolean;
};

export type EquationReportResult = {
  equationId: string;
  equationNumber: string;
  worksheetCode: string;
  formula: string;
  outputSymbol: string | null;
  outputUnit: string | null;
  state: EvalState;
};

export type ComplianceReportResult = {
  code: string;
  worksheetCode: string;
  titleDe: string;
  condition: string;
  severity: string;
  description: string | null;
  requiresAttestation: boolean;
  result: EvalResult;
};

/** Build a symbol→typed-value map from a worksheet's fields + project parameters. */
function buildValueMap(
  fields: ReportField[],
  parameters: ReportParameter[],
): {
  numByField: Map<string, number | null>;
  /** Plan 3 Task 1b: enum/text values BY FIELD (like numByField) so a formula input reads the
   * field the symbol resolves to, never a same-symbol sibling. */
  strByField: Map<string, string | null>;
  fieldBySymbol: Map<string, ReportField>;
  bySymbol: Map<string, number | string | boolean | null>;
  jsonBySymbol: Map<string, unknown>;
} {
  const fieldById = new Map(fields.map((f) => [f.id, f]));
  const fieldBySymbol = new Map<string, ReportField>();
  for (const f of fields) fieldBySymbol.set(f.symbol, f);

  const numByField = new Map<string, number | null>();
  const strByField = new Map<string, string | null>();
  const bySymbol = new Map<string, number | string | boolean | null>();
  const jsonBySymbol = new Map<string, unknown>();

  for (const p of parameters) {
    const f = fieldById.get(p.fieldId);
    if (!f) continue;
    switch (f.dataType) {
      case 'number':
        numByField.set(p.fieldId, p.valueNumber);
        if (p.valueNumber != null) bySymbol.set(f.symbol, p.valueNumber);
        break;
      case 'text':
        strByField.set(p.fieldId, p.valueText);
        if (p.valueText != null) bySymbol.set(f.symbol, p.valueText);
        break;
      case 'enum':
        strByField.set(p.fieldId, p.valueEnum);
        if (p.valueEnum != null) bySymbol.set(f.symbol, p.valueEnum);
        break;
      case 'boolean':
        if (p.valueBoolean != null) bySymbol.set(f.symbol, p.valueBoolean);
        break;
      case 'date':
        if (p.valueDate != null) bySymbol.set(f.symbol, p.valueDate);
        break;
      case 'json':
        if (p.valueJson != null) jsonBySymbol.set(f.symbol, p.valueJson);
        break;
    }
  }
  return { numByField, strByField, fieldBySymbol, bySymbol, jsonBySymbol };
}

/**
 * Plan 2a (Task 10): fields/sections hidden by `visible_when` under the saved
 * parameters — the SAME pure helper the form and the approval gate use, over
 * the same symbol map `evaluateWorksheetCompliance` evaluates against. Feed
 * the result's `hiddenSymbols` to `evaluateWorksheetCompliance(…, { hiddenSymbols })`.
 */
export function reportVisibility(
  fields: ReportField[],
  sections: readonly VisibilitySection[],
  parameters: ReportParameter[],
): Visibility {
  const { bySymbol } = buildValueMap(fields, parameters);
  return computeVisibility(
    fields.map((f) => ({ id: f.id, symbol: f.symbol, sectionId: f.sectionId ?? null, visibleWhen: f.visibleWhen ?? null })),
    sections,
    (sym) => bySymbol.get(sym) ?? undefined,
  );
}

/**
 * Evaluate every whitelisted equation on a worksheet against the
 * loaded fields + project parameters. Returns per-equation results.
 */
export function evaluateWorksheetEquations(
  worksheetCode: string,
  equations: ReportEquation[],
  fields: ReportField[],
  parameters: ReportParameter[],
  opts?: {
    /** Standard code (e.g. `DWA-A-138-1`) selecting the regulation tables for
     * `lookup()`; without it a table code resolves only when unique across the
     * registered/seeded standards. */
    standardCode?: string;
    /** Plan 2a (Task 10, fix round 1): symbols hidden by `visible_when`
     * (`reportVisibility(...).hiddenSymbols`). A hidden symbol resolves to
     * no value on EVERY input path below — scalar inputs, register json
     * source + scope, aggregator carriers, rainfall ref, Gl.8/10 scalars —
     * so an equation over it is `manual_required`, never `computed`. */
    hiddenSymbols?: ReadonlySet<string>;
  },
): EquationReportResult[] {
  const { numByField, strByField, fieldBySymbol, bySymbol, jsonBySymbol } = buildValueMap(fields, parameters);

  // ONE hidden-aware accessor family (withHidden) — every read below goes
  // through these; nothing re-implements the "hidden ⇒ null" rule.
  const hiddenSymbols = opts?.hiddenSymbols;
  const hiddenFieldIds = hiddenFieldIdsOf(fields, hiddenSymbols);
  const valueOf = withHidden((sym: string) => bySymbol.get(sym), hiddenSymbols);
  const jsonOf = withHidden((sym: string) => jsonBySymbol.get(sym), hiddenSymbols);
  const numOf = withHidden((fieldId: string) => numByField.get(fieldId), hiddenFieldIds);
  const strOf = withHidden((fieldId: string) => strByField.get(fieldId), hiddenFieldIds);
  const paramOf = withHidden((fieldId: string) => parameters.find((x) => x.fieldId === fieldId), hiddenFieldIds);

  // Plan 2a — generic registers (mirror of the client hook). Every json field
  // that resolves to a register config is prepared into typed rows; the
  // worksheet's scalar values back a derived column's symbol references
  // (G-13). Unknown names resolve to `undefined`, never null/''.
  const tableLookup = makeTableLookup(opts?.standardCode);
  const symbolByFieldId = new Map(fields.map((f) => [f.id, f.symbol]));
  const registers = buildRegisters(
    fields,
    (fieldId) => jsonOf(symbolByFieldId.get(fieldId) ?? ''),
    { standardCode: opts?.standardCode, symbol: valueOf },
  );
  // Plan 3 final wave A (defect 2): raw json carriers for `contains()` / `cell()`
  // — every json field that is NOT a register, through the same hidden-aware
  // accessor (a hidden checklist yields no carrier ⇒ manual_required).
  const carriers = buildCarriers(fields, (fieldId) => jsonOf(symbolByFieldId.get(fieldId) ?? ''));

  // Aggregator context — built once per worksheet, reused per equation.
  const subAreasJson = jsonOf('sub_areas_A138_10') as { rows?: unknown } | undefined;
  const subAreasCarrier: SubAreasCarrier | null = subAreasJson && Array.isArray(subAreasJson.rows)
    ? (subAreasJson as SubAreasCarrier)
    : null;

  // Multi-table rainfall carrier (Piece 2 → 2D grid): the facility's
  // `rainfall_table_ref` selects which table (id only); then resolveColumn
  // slices the 2D grid by the per-facility T_n (from facilityReturnPeriod).
  // On missing column → kostraWithheld is set so the A138-13 Gl.8 branch
  // produces manual_required instead of feeding the aggregator.
  const kostraField = fieldBySymbol.get('r_D_n_table');
  const kostraRaw = jsonOf('r_D_n_table');
  const rainfallRefRaw = valueOf('rainfall_table_ref');
  const rainfallTableRef = typeof rainfallRefRaw === 'string' && rainfallRefRaw ? rainfallRefRaw : null;

  // Build a pickNumberBySymbol for facilityReturnPeriod (server equivalent of
  // the client hook's closure over the React store values).
  const pickNum = (sym: string): number | null => {
    const f = fieldBySymbol.get(sym);
    if (!f) return null;
    return numOf(f.id) ?? null;
  };
  const pickBool = (sym: string): boolean | null => {
    const f = fieldBySymbol.get(sym);
    if (!f) return null;
    // booleans aren't tracked in numByField; pull from parameters directly
    const p = paramOf(f.id);
    return p?.valueBoolean ?? null;
  };

  type KostraServerResolution =
    | { status: 'ok' | 'legacy'; carrier: KostraCarrier }
    | { status: 'missing'; reason: string }
    | { status: 'none' };

  const kostraResolution: KostraServerResolution = (() => {
    if (kostraRaw == null) return { status: 'none' };
    const selected = resolveSelectedTable(normalizeRainfallCarrier(kostraRaw), rainfallTableRef);
    if (!selected) return { status: 'none' };

    // Per-facility T_n resolution — same logic as the client hook.
    const T_n = facilityReturnPeriod(worksheetCode, pickNum);
    const col = resolveColumn(selected, T_n);

    if (col.status === 'missing') {
      const reason = T_n !== null
        ? `Regenspende r_D für T_n = ${T_n} a nicht in der Niederschlagstabelle erfasst`
        : 'Bemessungshäufigkeit n nicht verfügbar — T_n kann nicht bestimmt werden';
      return { status: 'missing', reason };
    }

    // ok or legacy — feed rows to the unchanged KostraCarrier.
    return { status: col.status, carrier: { rows: col.rows } };
  })();

  const kostraCarrier: KostraCarrier | null =
    kostraResolution.status === 'ok' || kostraResolution.status === 'legacy'
      ? kostraResolution.carrier
      : null;

  const floodJson = jsonOf('sub_areas_A138_26') as { rows?: unknown } | undefined;
  const floodCarrier: FloodSubAreasCarrier | null = floodJson && Array.isArray(floodJson.rows)
    ? (floodJson as FloodSubAreasCarrier)
    : null;

  // Task 5 — Flood 30-column resolution (server path).
  // Resolve T_n=30 from the same KOSTRA grid, FIXED at 30 regardless of the
  // facility's design T_n (§5.3.4: T_n_Ue = 30 a). Uses the same selected
  // table as the basin (same `rainfallTableRef`).
  type FloodColServerResolution =
    | { status: 'ok';      carrier: KostraCarrier }
    | { status: 'missing'; reason: string }
    | { status: 'legacy' | 'none' };

  const floodColResolution: FloodColServerResolution = (() => {
    if (kostraRaw == null) return { status: 'none' };
    const selected = resolveSelectedTable(normalizeRainfallCarrier(kostraRaw), rainfallTableRef);
    if (!selected) return { status: 'none' };
    const col30 = resolveColumn(selected, 30);
    if (col30.status === 'ok') {
      return { status: 'ok', carrier: { rows: col30.rows } };
    }
    if (col30.status === 'missing') {
      return {
        status: 'missing',
        reason: 'Regenspende r_D für T_n = 30 a nicht in der Niederschlagstabelle erfasst (Hochwassernachweis Gl. 10)',
      };
    }
    return { status: 'legacy' };
  })();

  const r_D_30_field = fieldBySymbol.get('r_D_30');

  const gl8Scalars: Gl8Scalars = {
    A_C: pickNum('A_C'),
    A_VA: pickNum('A_VA'),
    Q_S: pickNum('Q_S'),
    Q_Dr: pickNum('Q_Dr'),
    f_Z: pickNum('f_Z'),
    f_A: pickNum('f_A'),
    V_Zisterne: pickNum('V_Zisterne'),
    zisterne_zwangsentleerung: pickBool('zisterne_zwangsentleerung'),
  };
  const gl10Scalars: Gl10Scalars = {
    A_VA: pickNum('A_VA'),
    Q_S: pickNum('Q_S'),
    Q_Dr: pickNum('Q_Dr'),
    D: pickNum('D_min') ?? pickNum('D'),
    V_VA: pickNum('V_VA'),
    r_D_T_n_Ue: pickNum('r_D_30'),
  };

  const out: EquationReportResult[] = [];
  // Plan 2a: fallback register equations (e.g. VSME-B04.100 per-medium sums)
  // are appended while their DB rows are not yet seeded — same list the form
  // engine evaluates.
  for (const eq of withFallbackRegisterEquations(worksheetCode, equations)) {
    // Engine generalization (Layer 0): evaluate every equation except the
    // manual deny-set, mirroring the client gate. The evaluator fail-safe
    // blanks anything it cannot faithfully compute.
    if (!shouldEngineEvaluate(worksheetCode, eq.equationNumber)) continue;

    const rewrite = rewriteRules[eq.id];
    const profile = equationProfiles[eq.id];
    const neededSymbols = rewrite
      ? Object.values(rewrite.remap)
      : normalizeSymbols(eq.inputSymbols ?? []);

    const aliasFor = (sym: string): string => profile?.symbolAliases?.[sym] ?? sym;

    const evalInputs = neededSymbols.map((sym) => {
      const f = fieldBySymbol.get(aliasFor(sym));
      // Plan 3 Task 1b: number → number; enum/text → the string verbatim; ''/null → missing.
      const value = f
        ? f.dataType === 'text' || f.dataType === 'enum'
          ? engineInputValue({ type: f.dataType, value: strOf(f.id) ?? null })
          : engineInputValue({ type: 'number', value: numOf(f.id) ?? null })
        : null;
      return { symbol: sym, value, unit: f?.unit ?? null };
    });

    const expectedUnits: Record<string, string | null> = {};
    for (const sym of neededSymbols) {
      const f = fieldBySymbol.get(aliasFor(sym));
      expectedUnits[sym] = f?.unit ?? null;
    }

    // Task 4 withhold: when the resolved 2D column is missing (T_n column not
    // populated in a native grid), emit manual_required for A138-13 Gl.8
    // BEFORE calling the aggregator — do NOT feed rows for a wrong/missing column.
    // Matches the client hook's kostraResolution.status === 'missing' guard.
    if (eq.id === A138_13_GL8_ID && kostraResolution.status === 'missing') {
      out.push({
        equationId: eq.id,
        equationNumber: eq.equationNumber,
        worksheetCode,
        formula: eq.formula,
        outputSymbol: eq.outputSymbol,
        outputUnit: 'outputUnit' in eq ? eq.outputUnit : null,
        state: { kind: 'manual_required', reason: kostraResolution.reason },
      });
      continue;
    }

    let aggregator: Parameters<typeof evaluateFormula>[0]['aggregator'];
    if (eq.id === A138_10_GL2_ID) {
      aggregator = subAreasCarrier ? { subAreas: subAreasCarrier } : undefined;
    } else if (eq.id === A138_13_GL8_ID) {
      aggregator = {
        kostraTable: kostraCarrier,
        gl8Scalars,
        kostraUnit: kostraField?.unit ?? null,
      };
    } else if (eq.id === A138_26_GL10_ID) {
      // Task 5: thread the flood 30-column resolution into the aggregator.
      const flood30Carrier =
        floodColResolution.status === 'ok' ? floodColResolution.carrier : null;
      const missingFlood30Reason =
        floodColResolution.status === 'missing' ? floodColResolution.reason : null;
      aggregator = {
        floodSubAreas: floodCarrier,
        gl10Scalars,
        kostraUnit: r_D_30_field?.unit ?? null,
        floodKostra30Col: flood30Carrier,
        missingFlood30Reason,
      };
    }

    const state = evaluateFormula({
      equationId: eq.id,
      formula: eq.formula,
      inputSymbols: eq.inputSymbols ?? [],
      outputSymbol: eq.outputSymbol ?? '',
      expectedUnits,
      inputs: evalInputs,
      aggregator,
      registers,
      tableLookup,
      carriers,
    });

    // Task 2 (A138-10 auto-Q_zu): basin Gl.8 materialises governing D + r_D
    // as derived field values on A138-13 under the symbols A138-10 consumes.
    // Inject into the mutable lookup maps so subsequent equations and compliance
    // conditions evaluated for this worksheet can read r_D_n / D_min.
    // When manual_required / derivedExtras absent: clear (write null) so stale
    // values don't persist in the symbol map.
    if (eq.id === A138_13_GL8_ID) {
      const extras = state.kind === 'computed' ? state.derivedExtras : undefined;
      const rDnField = fieldBySymbol.get('r_D_n');
      if (rDnField) {
        const rDnVal = extras !== undefined ? extras.r_D_gov : null;
        numByField.set(rDnField.id, rDnVal);
        if (rDnVal !== null) bySymbol.set('r_D_n', rDnVal);
        else bySymbol.delete('r_D_n');
      }
      const dMinField = fieldBySymbol.get('D_min');
      if (dMinField) {
        const dMinVal = extras !== undefined ? extras.D_gov : null;
        numByField.set(dMinField.id, dMinVal);
        if (dMinVal !== null) bySymbol.set('D_min', dMinVal);
        else bySymbol.delete('D_min');
      }
    }

    out.push({
      equationId: eq.id,
      equationNumber: eq.equationNumber,
      worksheetCode,
      formula: eq.formula,
      outputSymbol: eq.outputSymbol,
      outputUnit: 'outputUnit' in eq ? eq.outputUnit : null,
      state,
    });
  }
  return out;
}

/**
 * Evaluate every compliance condition on a worksheet against the loaded
 * project parameters + the engine's computed outputs (so a condition can
 * reference an engine-produced value like V_VA).
 */
export function evaluateWorksheetCompliance(
  worksheetCode: string,
  rows: ReportComplianceRow[],
  fields: ReportField[],
  parameters: ReportParameter[],
  engineResults: EquationReportResult[],
  /** Plan 2a (Task 10): symbols hidden by `visible_when` (computed by the
   * caller via `computeVisibility` over the same parameters) — a condition
   * referencing one reports `not_applicable`. */
  opts?: { hiddenSymbols?: ReadonlySet<string> },
): ComplianceReportResult[] {
  const { bySymbol, jsonBySymbol } = buildValueMap(fields, parameters);

  // Overlay computed engine outputs onto the symbol lookup so conditions
  // can read e.g. `V_VA` even when the engineer hasn't manually entered it.
  for (const r of engineResults) {
    if (r.state.kind === 'computed' && r.outputSymbol) {
      bySymbol.set(r.outputSymbol, r.state.value);
    }
  }

  const lookup = (sym: string) => bySymbol.get(sym) ?? undefined;
  // Plan 3 final wave A (defect 4): the raw json of a checklist/grid carrier,
  // so a gate `contains(checklist, 'token')` has a value to read. Hidden
  // symbols are still filtered by `hiddenSymbols` before any evaluation.
  const carrier = (sym: string) => jsonBySymbol.get(sym);
  const evalOpts = { ...(opts?.hiddenSymbols ? { hiddenSymbols: opts.hiddenSymbols } : {}), carrier };

  return rows.map((row) => {
    const result = evaluateCondition(row.condition, lookup, evalOpts);
    return {
      code: row.code,
      worksheetCode,
      titleDe: row.titleDe,
      condition: row.condition,
      severity: row.severity,
      description: row.description,
      requiresAttestation: row.requiresAttestation,
      result,
    };
  });
}
