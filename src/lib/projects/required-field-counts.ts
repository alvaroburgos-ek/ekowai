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
  /** Id of the field the occurrence was saved on (R-14: drops an occurrence hidden by `visible_when` on its source sheet). */
  fieldId?: string;
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
export type CountParam = ParameterValueColumns & { isStale?: boolean | null; sourceType?: string | null };

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
 *
 * L-8 (review 25d4bd1, known difference): this is the GATE lookup, not the source form's `makeSymbolLookup(own +
 * inherited)`. They differ only when a driver is not inherited on its sheet but has a conflict-free project-wide value
 * (here it decides; the form leaves the field visible) or when the driver's project-wide values conflict (here pending ⇒
 * visible; the form may hide via its inherited value). No DWA-M 820 instance found; kept so the counts, the hidden-at-
 * source set and the approval gate stay one rule.
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
 * R-14 (2026-10-08, „hidden ⇒ absent"): drop the saved occurrences whose field is hidden by `visible_when` on its own
 * (source) template. A value the engineer cannot see on its source sheet is no answer anywhere: not in the gate's
 * project-wide fallback, not in the A4 inherited set, not in the worksheet page's upstream panel / seeding, not in the
 * save path's inherited lookup. Entries without a `fieldId` are kept (callers that do not carry it are unchanged).
 */
export function dropHiddenAtSource<T extends { fieldId?: string }>(entries: ReadonlyArray<T>, hiddenFieldIds: ReadonlySet<string>): T[] {
  if (hiddenFieldIds.size === 0) return [...entries];
  return entries.filter((e) => !(e.fieldId && hiddenFieldIds.has(e.fieldId)));
}

function flatten(byTemplate: ReadonlyMap<string, ReadonlySet<string>>): Set<string> {
  const out = new Set<string>();
  for (const ids of byTemplate.values()) for (const id of ids) out.add(id);
  return out;
}

/**
 * U-2 / R-14 — the "hidden at source" pass: per template, the active fields hidden by `visible_when` under the SAVED
 * values (gate lookup over the unfiltered occurrences; single pass, like the form's visibility — a hidden driver's own
 * stored value still decides, visibility does not cascade). This is the set every consumer drops (`dropHiddenAtSource`).
 */
export function hiddenFieldIdsByTemplate(args: RequiredFieldCountArgs): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [templateId, pass] of templatePasses(args)) out.set(templateId, pass.hiddenFieldIds);
  return out;
}

/** The flattened hidden-at-source field ids of the standard (all templates of `args`). */
export function hiddenAtSourceFieldIds(args: RequiredFieldCountArgs): Set<string> {
  return flatten(hiddenFieldIdsByTemplate(args));
}

/**
 * The gate's view per template (R-14): the same pass, but over the project-wide occurrences WITHOUT those hidden at their
 * source (`dropHiddenAtSource`) — exactly what `checkApprovalGate` reads after R-14. `hiddenAtSource` may be passed when
 * the caller already holds it.
 */
function gatePasses(args: RequiredFieldCountArgs, hiddenAtSource?: ReadonlySet<string>): Map<string, TemplatePass> {
  const hidden = hiddenAtSource ?? hiddenAtSourceFieldIds(args);
  return templatePasses({ ...args, projectEntries: dropHiddenAtSource(args.projectEntries, hidden) });
}

/**
 * M-1 (R-13): per template, the fields hidden in the gate's view (see `gatePasses`) — the visibility a downstream
 * (consumer) sheet gets when a driver on another sheet changes. Restrict `args.templateIds` to the consumers.
 */
export function gateHiddenFieldIdsByTemplate(args: RequiredFieldCountArgs, hiddenAtSource?: ReadonlySet<string>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [templateId, pass] of gatePasses(args, hiddenAtSource)) out.set(templateId, pass.hiddenFieldIds);
  return out;
}

function countsFromPasses(args: RequiredFieldCountArgs, passes: ReadonlyMap<string, TemplatePass>): Map<string, RequiredFieldCounts> {
  // A stale own row is no own answer; `requiredFieldSatisfied` then falls through to the inherited set.
  const answered = new Map<string, ParameterValueColumns>();
  for (const [id, p] of args.paramByFieldId) if (!p.isStale) answered.set(id, p);
  const out = new Map<string, RequiredFieldCounts>();
  for (const [templateId, pass] of passes) {
    const visibleRequired = pass.own.filter((f) => f.isRequired && !pass.hiddenFieldIds.has(f.id));
    out.set(templateId, countRequiredFields(visibleRequired, answered, { inheritedSymbols: pass.inheritedSymbols }));
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
 * still drives visibility (it is kept; only its standing as an answer is withheld). The approval gate does not read
 * `is_stale`.
 * R-14: the fallback and the A4 set read the occurrences without those hidden at their source — the gate's view.
 */
export function countRequiredFieldsByTemplate(args: RequiredFieldCountArgs): Map<string, RequiredFieldCounts> {
  return countsFromPasses(args, gatePasses(args));
}

/** Counts + hidden-at-source sets from ONE evaluation of each pass (L-4: the worksheet page needs both). */
export function requiredFieldState(args: RequiredFieldCountArgs): {
  counts: Map<string, RequiredFieldCounts>;
  hiddenByTemplate: Map<string, Set<string>>;
} {
  const hiddenByTemplate = hiddenFieldIdsByTemplate(args);
  const counts = countsFromPasses(args, gatePasses(args, flatten(hiddenByTemplate)));
  return { counts, hiddenByTemplate };
}
