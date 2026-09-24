/**
 * Plan 2a Task 8 — generic register materialiser for the server save path.
 *
 * Replaces the two hand-written blocks in `saveWorksheet` (A138-07
 * `surface_inventory` → the six surface scalars; VSME-B04.100
 * `pollutant_register` → the three per-medium sums). Every register-fed,
 * non-displayOnly equation of the worksheet (DB rows + the fallback rows of
 * `register-configs.ts`) whose output symbol has a field on the template is
 * evaluated through the SAME `evaluateFormula` the form uses, over registers
 * built by the SAME `buildRegisters` the hook/report/snapshot use. The result
 * is a list of `source_type='derived'` writes — `null` when the equation is
 * not computable (empty register, missing input), so stale downstream values
 * are cleared rather than left standing.
 *
 * Behaviour mapping onto the retired blocks:
 *   - surface: empty / absent carrier ⇒ `sum_rows` has no complete rows ⇒
 *     `manual_required` ⇒ null (was `summarizeSurfaces` → nulls);
 *   - pollutant: `not_applicable` flag ⇒ the fallback formula's `if(flag(...), 0, …)`
 *     short-circuits to 0; empty rows ⇒ `manual_required` ⇒ null (was
 *     `summarizePollutants` → 0 / null).
 *
 * Dedupe rule (fix round 1): ONE write per output field. When two equations of a template
 * output the same symbol (the corpus has this for scalars, e.g. two `h_S` on A138-21), the
 * FIRST equation in list order wins — DB rows in their loaded order, fallback rows appended
 * LAST by `withFallbackRegisterEquations`, so a DB equation always beats a fallback for the
 * same output. Without this the save would put the same (project_id, field_id) twice into
 * one `INSERT … ON CONFLICT DO UPDATE`, which Postgres rejects ("cannot affect row a second
 * time") and the whole save would roll back.
 */
import { evaluateFormula, formulaRhs, type EvalState } from './formula';
import { engineInputValue } from './engine-input';
import { hiddenFieldIdsOf, withHidden } from '@/lib/compliance/visibility';
import { equationProfiles } from './equation-profiles';
import { normalizeFormula, normalizeSymbols } from './normalize-formula';
import { rewriteRules } from './rewrites';
import { resolveRegisterConfig, withFallbackRegisterEquations } from './register-configs';
import { buildCarriers, buildRegisters, carrierFieldSymbols } from './register-rows';
import { makeTableLookup } from './regulation-tables-fallback';
import { canonicalFunctionName, isConditionNode, parseExpression, type ArithNode, type Expr, type Node, type Value } from '@/lib/expr';

export type FieldValue =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null }
  | { type: 'date'; value: string | null }
  | { type: 'boolean'; value: boolean | null }
  | { type: 'json'; value: unknown };

type EqLike = { id: string; equationNumber: string; formula: string; inputSymbols: string[] | null; outputSymbol: string | null };
type FieldLike = { id: string; symbol: string; dataType: string; unit: string | null; widget?: string | null; uiConfig?: unknown };

export type DerivedWrite = { equationId: string; symbol: string; fieldId: string; value: number | null; state: EvalState };

export type MaterializeDerivedResult = {
  /** One per register-fed, non-displayOnly equation whose output symbol has a field on this template. */
  writes: DerivedWrite[];
  /** Register diagnostics (misconfigured derived column expressions), deduplicated — for the save `warnings`. */
  diagnostics: string[];
};

type ParameterRowLike = {
  fieldId: string;
  valueNumber: string | number | null;
  valueText: string | null;
  valueEnum: string | null;
  valueDate: string | Date | null;
  valueBoolean: boolean | null;
  valueJson: unknown;
};

/** Persisted `project_parameters` rows → the save-batch `FieldValue` shape, keyed by field id.
 * Mirrors the per-dataType mapping of the worksheet page (parameter → FieldValue). Rows whose
 * field is not on the template (or has an unknown data type) are dropped. */
export function parametersToFieldValues(
  rows: ReadonlyArray<ParameterRowLike>,
  fields: ReadonlyArray<{ id: string; dataType: string }>,
): Record<string, FieldValue> {
  const typeById = new Map(fields.map((f) => [f.id, f.dataType]));
  const out: Record<string, FieldValue> = {};
  for (const p of rows) {
    switch (typeById.get(p.fieldId)) {
      case 'number': out[p.fieldId] = { type: 'number', value: p.valueNumber == null ? null : Number(p.valueNumber) }; break;
      case 'text': out[p.fieldId] = { type: 'text', value: p.valueText }; break;
      case 'enum': out[p.fieldId] = { type: 'enum', value: p.valueEnum }; break;
      case 'date': out[p.fieldId] = { type: 'date', value: p.valueDate == null ? null : p.valueDate instanceof Date ? p.valueDate.toISOString().slice(0, 10) : String(p.valueDate) }; break;
      case 'boolean': out[p.fieldId] = { type: 'boolean', value: p.valueBoolean }; break;
      case 'json': out[p.fieldId] = { type: 'json', value: p.valueJson }; break;
    }
  }
  return out;
}

/**
 * Calls that READ a json carrier. Both take the carrier symbol as argument 0
 * (`src/lib/expr/evaluate.ts`: `contains` / `cell` require `target.kind === 'aref'`).
 */
const CARRIER_CALLS: ReadonlySet<string> = new Set(['contains', 'cell']);

/**
 * WAVE A FIX ROUND 1 — does this formula actually READ one of `carrierSymbols`
 * through a carrier call?
 *
 * The first cut of the carrier extension asked only whether the equation NAMED
 * a carrier symbol, which is far too wide. DWA-M-1200-2 `M12002-05` prod
 * equation Gl. C.2-2 is `perzentil_50_log10 = median(log10_reduktionen)`, and
 * `log10_reduktionen` is a prod json field with `widget: null` — a carrier
 * candidate. `median` is not an engine function (only `median_rows` is), so the
 * equation is `manual_required`, the materialiser emitted `{value: null}` and
 * the save path would have UPSERTed `value_number = NULL, source_type='derived'`
 * OVER the engineer's typed 50th percentile.
 *
 * The narrower of the two candidate gates was chosen. Gating on "the RHS parses"
 * would NOT have caught this at all: `median(log10_reduktionen)` parses
 * perfectly well — any identifier followed by `(` is a call node, and the
 * refusal happens at EVALUATION (`Funktionsaufruf "median(...)" wird nicht
 * unterstützt`). Gating on an actual carrier READ catches it, and also rejects
 * `log10_reduktionen * 2` and `sum_rows(log10_reduktionen, x)`. It is also the
 * honest statement of intent: the carrier extension exists so that an equation
 * which reads a checklist gets materialised — nothing else.
 */
export function readsCarrier(formula: string, carrierSymbols: ReadonlySet<string>): boolean {
  if (carrierSymbols.size === 0) return false;
  const node = parseExpression(normalizeFormula(formulaRhs(formula)));
  if (node === null) return false;
  let hit = false;
  const any = (e: Expr): void => { if (isConditionNode(e)) cond(e); else arith(e); };
  const arith = (n: ArithNode): void => {
    if (hit) return;
    switch (n.kind) {
      case 'aneg': arith(n.inner); return;
      case 'abin': arith(n.left); arith(n.right); return;
      case 'call': {
        const fn = canonicalFunctionName(n.name);
        const target = n.args[0];
        if (fn !== null && CARRIER_CALLS.has(fn) && target?.kind === 'aref' && carrierSymbols.has(target.symbol)) {
          hit = true;
          return;
        }
        for (const a of n.args) any(a);
        return;
      }
      default: return; // anum / astr / abool / anull / aref carry no carrier read
    }
  };
  const cond = (n: Node): void => {
    if (hit) return;
    switch (n.kind) {
      case 'acompare': arith(n.left); arith(n.right); return;
      case 'and': case 'or': cond(n.left); cond(n.right); return;
      case 'not': cond(n.inner); return;
      case 'guard': cond(n.guard); cond(n.body); return;
      default: return;
    }
  };
  any(node);
  return hit;
}

/** Field ids of this template's register carriers that hold a json value in `valuesByFieldId`. */
export function registerFieldIds(
  fields: ReadonlyArray<{ id: string; symbol: string; dataType: string; widget?: string | null; uiConfig?: unknown }>,
  valuesByFieldId: Record<string, FieldValue>,
): string[] {
  return fields.filter((f) => resolveRegisterConfig(f) !== null && valuesByFieldId[f.id]?.type === 'json').map((f) => f.id);
}

/** The scalar `Scope.symbol` view of the worksheet values (G-13: a register `derived` column may
 * reference a worksheet symbol). MUST return `undefined` for unknown names — never null/'' — or the
 * evaluator's var-vs-var enum rule treats every bare identifier as a valued symbol. */
function symbolLookup(fields: ReadonlyArray<FieldLike>, valueOf: (fieldId: string) => FieldValue | undefined): (s: string) => Value | undefined {
  const byId = new Map(fields.map((f) => [f.symbol, f.id]));
  return (s) => {
    const id = byId.get(s);
    if (!id) return undefined;
    const v = valueOf(id);
    if (!v) return undefined;
    switch (v.type) {
      case 'number': return v.value ?? undefined;
      case 'text': case 'enum': case 'date': return v.value ?? undefined;
      case 'boolean': return v.value ?? undefined;
      default: return undefined; // json carriers are registers, not scalars
    }
  };
}

export function materializeDerivedOutputs(args: {
  standardCode: string;
  worksheetCode: string;
  equations: ReadonlyArray<EqLike>;
  fields: ReadonlyArray<FieldLike>;
  /** persisted rows overlaid by the save batch */
  valuesByFieldId: Record<string, FieldValue>;
  /** Plan 2a (Task 10, fix round 1): symbols hidden by `visible_when` (caller computes them from
   * the template fields + sections over the same overlaid values). A hidden scalar input resolves
   * to null and a hidden REGISTER to an absent carrier (rows=[]) — so every affected equation is
   * manual_required and its output is still WRITTEN, as null (clears stale values; ruling). */
  hiddenSymbols?: ReadonlySet<string>;
}): MaterializeDerivedResult {
  const { standardCode, worksheetCode, fields, valuesByFieldId } = args;
  const table = makeTableLookup(standardCode);
  const fieldBySymbol = new Map(fields.map((f) => [f.symbol, f]));
  // ONE hidden-aware accessor (withHidden): the register scope, the register json source and the
  // scalar inputs below all read through `valueOf` — nothing re-implements the "hidden ⇒ null" rule.
  const valueOf = withHidden((fieldId: string) => valuesByFieldId[fieldId], hiddenFieldIdsOf(fields, args.hiddenSymbols));
  const symbol = symbolLookup(fields, valueOf);

  // Registers: every field that resolves to a register config AND holds a json value.
  // A carrier with an absent value is still a register (empty rows) so its equations
  // evaluate to manual_required → null, clearing stale downstream values.
  const registers = buildRegisters(
    fields,
    // `{}` (not undefined) for an absent/null carrier: buildRegisters skips fields whose json is
    // absent, but an absent register must still yield rows=[] so its equations resolve to
    // manual_required → null (clears stale outputs). Non-register fields are filtered by
    // buildRegisters itself (resolveRegisterConfig).
    (fieldId) => { const v = valueOf(fieldId); return v?.type === 'json' ? (v.value ?? {}) : {}; },
    { standardCode, symbol },
  );
  // Plan 3 final wave A (defect 2): raw json carriers for `contains()` /
  // `cell()`. Same hidden-aware accessor; a hidden or absent checklist yields
  // NO carrier, so its equation is manual_required and its output is written
  // as null (clears stale values) — never a phantom "nothing ticked" verdict.
  const carriers = buildCarriers(fields, (fieldId) => {
    const v = valueOf(fieldId);
    return v?.type === 'json' ? v.value : undefined;
  });
  const registerSymbols = new Set(Object.keys(registers));
  // Candidate (not present) carrier symbols: an equation over an UNFILLED
  // checklist is still this materialiser's business, so its stale output is
  // cleared to null instead of surviving as a value nothing backs.
  const carrierSymbols = carrierFieldSymbols(fields);
  const diagnostics = new Set<string>();
  for (const r of Object.values(registers)) for (const d of r.diagnostics ?? []) diagnostics.add(d);

  const writes: DerivedWrite[] = [];
  const writtenFieldIds = new Set<string>(); // dedupe by output field — first equation wins (see docblock)
  for (const eq of withFallbackRegisterEquations(worksheetCode, [...args.equations])) {
    if (!eq.outputSymbol || equationProfiles[eq.id]?.displayOnly) continue;
    const consumed = new Set([...normalizeSymbols(eq.inputSymbols ?? []), ...Object.values(rewriteRules[eq.id]?.remap ?? {})]);
    // Register-fed OR carrier-fed: both are json values the client cannot
    // persist as a scalar, so the save path is the one that materialises them.
    // CARRIER-FED means the formula actually READS a carrier (`contains()` /
    // `cell()`), not merely names a json symbol — see `readsCarrier`. Naming
    // one is how DWA-M-1200-2's `median(log10_reduktionen)` slipped in and
    // would have written NULL over an engineer's typed value.
    const registerFed = [...consumed].some((s) => registerSymbols.has(s));
    const carrierFed = registerFed
      || readsCarrier(eq.formula, carrierSymbols)
      || (rewriteRules[eq.id] ? readsCarrier(rewriteRules[eq.id].to, carrierSymbols) : false);
    if (!carrierFed) continue;
    const outField = fieldBySymbol.get(eq.outputSymbol);
    if (!outField || writtenFieldIds.has(outField.id)) continue;
    writtenFieldIds.add(outField.id);
    const inputs = [...consumed].filter((s) => !registerSymbols.has(s)).map((sym) => {
      const f = fieldBySymbol.get(sym);
      // Plan 3 Task 1b: number → number; enum/text → the string verbatim; ''/null → missing.
      const v = f ? valueOf(f.id) : undefined;
      return { symbol: sym, value: engineInputValue(v), unit: f?.unit ?? null };
    });
    const state = evaluateFormula({
      equationId: eq.id,
      formula: eq.formula,
      inputSymbols: eq.inputSymbols ?? [],
      outputSymbol: eq.outputSymbol,
      inputs,
      registers,
      tableLookup: table,
      carriers,
    });
    writes.push({ equationId: eq.id, symbol: eq.outputSymbol, fieldId: outField.id, value: state.kind === 'computed' ? state.value : null, state });
  }
  return { writes, diagnostics: [...diagnostics] };
}
