/**
 * C-7 (DWA-M 820 workflow audit, 2026-10-08) — the sidebar badge „x/y Pflichtfelder", the progress panel's
 * „Nächster Schritt … n Pflichtfelder offen" and the MCP `get_standard_progress` counted required fields with
 * plain SQL, so a field hidden by `visible_when` (e.g. the competition questions on DWA-M 820-1 M820-14 on a
 * direct award) stayed "open" although the sheet showed no input and the approval gate did not ask for it.
 *
 * This module is the ONE rule for the per-template counts, built from the same pieces as the approval gate
 * (`checkApprovalGate`): the gate's scoped lookup (own fields locally, other symbols from the own-standard-first
 * conflict-free project-wide fallback), `computeVisibility` on that lookup, and the A4 inherited-required rule.
 * `totalRequired` = active required fields that are VISIBLE under the saved values; `filledRequired` = those
 * satisfied (own value or inherited). A sheet whose required questions are all hidden counts 0/0.
 *
 * Pure: no DB. `loadRequiredFieldCounts` (load-required-field-counts.ts) feeds it from the database.
 */
import { jsonConditionValue } from '@/lib/compliance/evaluate';
import { computeVisibility, type VisibilitySection } from '@/lib/compliance/visibility';
import {
  countRequiredFields,
  inheritedSymbolSet,
  scopeForInheritance,
  scopeToOwnStandard,
  type ParameterValueColumns,
  type RequiredFieldRow,
} from './required-fields';

export type GateValue = number | string | boolean | null;

/** One saved, typed occurrence of a symbol somewhere in the project (any worksheet template). */
export type ProjectWideEntry = {
  symbol: string;
  value: GateValue;
  templateId: string;
  /** Code of the standard the occurrence's template belongs to — read only by the cross-standard carry-over allow-list (A4). */
  standardCode?: string | null;
};

/** The own standard's active fields — the scope of `scopeToOwnStandard` / `scopeForInheritance`. */
export type OwnStandardScope = {
  templateIds: ReadonlySet<string>;
  symbols: ReadonlySet<string>;
  types: ReadonlyMap<string, ReadonlySet<string>>;
  standardCode: string | null;
};

/** Extract the typed value of a `project_parameters` row for a field's data type (the gate's reading). */
export function extractGateValue(dataType: string, p: ParameterValueColumns): GateValue | undefined {
  switch (dataType) {
    case 'number': return p.valueNumber != null ? Number(p.valueNumber) : undefined;
    case 'text': return p.valueText != null ? p.valueText : undefined;
    case 'enum': return p.valueEnum != null ? p.valueEnum : undefined;
    case 'boolean': return p.valueBoolean != null ? p.valueBoolean : undefined;
    case 'date': return p.valueDate != null ? p.valueDate : undefined;
    // JSON carriers: presence marker so `symbol IS NOT NULL`/`IS NOT EMPTY` conditions work
    // (a populated carrier ⇒ 'present'; empty/null ⇒ undefined).
    case 'json': return jsonConditionValue(p.valueJson) ?? undefined;
    default: return undefined;
  }
}

function gateValueEq(a: GateValue, b: GateValue): boolean {
  if (a === b) return true;
  // treat e.g. number 4 and string "4" as agreeing across worksheets
  if (typeof a !== typeof b) return String(a) === String(b);
  return false;
}

/**
 * Conflict-free project-wide values: a symbol is included only when every saved occurrence agrees;
 * conflicting values are omitted (→ a condition stays `pending`, never a wrong verdict from an ambiguous selector).
 */
export function buildFallbackValues(entries: ReadonlyArray<{ symbol: string; value: GateValue }>): Map<string, GateValue> {
  const seen = new Map<string, GateValue>();
  const conflict = new Set<string>();
  for (const e of entries) {
    if (conflict.has(e.symbol)) continue;
    if (!seen.has(e.symbol)) seen.set(e.symbol, e.value);
    else if (!gateValueEq(seen.get(e.symbol) as GateValue, e.value)) { conflict.add(e.symbol); seen.delete(e.symbol); }
  }
  return seen;
}

export type CountField = RequiredFieldRow & {
  templateId: string;
  sectionId: string | null;
  visibleWhen: string | null;
};

export type CountSection = VisibilitySection & { templateId: string };

export type RequiredFieldCounts = { totalRequired: number; filledRequired: number };

/** A saved `project_parameters` row as the counts read it: value columns + the U-1 stale flag (optional, absent ⇒ false). */
export type CountParam = ParameterValueColumns & { isStale?: boolean | null };

export type RequiredFieldCountArgs = {
  templateIds: ReadonlyArray<string>;
  fields: ReadonlyArray<CountField>;
  sections: ReadonlyArray<CountSection>;
  paramByFieldId: ReadonlyMap<string, CountParam>;
  projectEntries: ReadonlyArray<ProjectWideEntry>;
  ownScope: OwnStandardScope;
};

type TemplatePass = { own: CountField[]; hiddenFieldIds: Set<string>; inheritedSymbols: Set<string> };

/**
 * The per-template pass shared by the counts and `hiddenFieldIdsByTemplate`: the gate's scoped lookup (a local symbol
 * resolves locally, blank → undefined; any other from the own-standard-first conflict-free fallback) handed to
 * `computeVisibility` over the template's own fields and sections, plus the A4 inherited-symbol set.
 */
function templatePasses(args: RequiredFieldCountArgs): Map<string, TemplatePass> {
  const { fields, sections, paramByFieldId, projectEntries, ownScope } = args;
  // The gate's project-wide fallback: own-standard symbols from the own standard only, the rest project-wide.
  const fallback = buildFallbackValues(scopeToOwnStandard(projectEntries, ownScope.templateIds, ownScope.symbols));
  const carry = ownScope.standardCode ? { ownStandardCode: ownScope.standardCode } : undefined;
  const inheritable = scopeForInheritance(projectEntries, ownScope.templateIds, ownScope.types, carry);

  const out = new Map<string, TemplatePass>();
  for (const templateId of args.templateIds) {
    const own = fields.filter((f) => f.templateId === templateId);
    const ownSections = sections.filter((s) => s.templateId === templateId);
    const localSymbols = new Set(own.map((f) => f.symbol));
    const bySymbol = new Map<string, GateValue>();
    for (const f of own) {
      const p = paramByFieldId.get(f.id);
      if (!p) continue;
      const v = extractGateValue(f.dataType, p);
      if (v !== undefined) bySymbol.set(f.symbol, v);
    }
    // Same scoped lookup as `makeGateLookup`: a local symbol resolves locally (blank → undefined), any other from the fallback.
    const lookup = (s: string): GateValue | undefined => (localSymbols.has(s) ? bySymbol.get(s) : fallback.get(s));
    const { hiddenFieldIds } = computeVisibility(own, ownSections, lookup);
    const inheritedSymbols = inheritedSymbolSet(inheritable.filter((e) => e.templateId !== templateId));
    out.set(templateId, { own, hiddenFieldIds, inheritedSymbols });
  }
  return out;
}

/**
 * Per worksheet template of ONE standard: visible required fields and how many of them are satisfied.
 * `fields` / `sections` are the standard's active fields and sections (any template of the standard — rows of other
 * templates are ignored per template); `paramByFieldId` the project's saved rows for those fields; `projectEntries`
 * every saved typed occurrence in the project (`loadProjectWideEntries`); `ownScope` the standard's own scope.
 *
 * U-1 (ruling R-12, 2026-10-08): a visible required field whose OWN row is flagged `isStale` (saved while its question
 * was hidden, not re-saved since) counts as NOT filled — unless an inherited value satisfies it (A4). The stale value
 * still drives visibility (it is kept; only its standing as an answer is withheld). The approval gate is not changed.
 */
export function countRequiredFieldsByTemplate(args: RequiredFieldCountArgs): Map<string, RequiredFieldCounts> {
  // A stale own row is no own answer; `requiredFieldSatisfied` then falls through to the inherited set.
  const answered = new Map<string, ParameterValueColumns>();
  for (const [id, p] of args.paramByFieldId) if (!p.isStale) answered.set(id, p);
  const out = new Map<string, RequiredFieldCounts>();
  for (const [templateId, pass] of templatePasses(args)) {
    const visibleRequired = pass.own.filter((f) => f.isRequired && !pass.hiddenFieldIds.has(f.id));
    out.set(templateId, countRequiredFields(visibleRequired, answered, { inheritedSymbols: pass.inheritedSymbols }));
  }
  return out;
}

/**
 * U-2 (2026-10-08): per template, the active fields hidden by `visible_when` under the saved values — the same pass as
 * the counts (and the approval gate's lookup). The worksheet page drops an inherited field hidden on its SOURCE sheet
 * from the „Vorgelagerte Werte" panel and withholds its value (hidden ⇒ null, as the source sheet applies it).
 */
export function hiddenFieldIdsByTemplate(args: RequiredFieldCountArgs): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [templateId, pass] of templatePasses(args)) out.set(templateId, pass.hiddenFieldIds);
  return out;
}
