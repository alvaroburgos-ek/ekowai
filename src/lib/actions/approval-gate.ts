import 'server-only';
import { db } from '@/lib/db';
import {
  fields,
  complianceRequirements,
  projectParameters,
  worksheetInstances,
  worksheetSections,
  worksheetTemplates,
  standards,
  equations,
} from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { computeVisibility } from '@/lib/compliance/visibility';
import { ensureRegulationTablesLoaded } from '@/lib/db/queries/regulation-tables';
import { inheritedSymbolSet, missingRequiredFields as missingRequiredFieldsShared, scopeForInheritance, scopeToOwnStandard } from '@/lib/projects/required-fields';
// C-7 (2026-10-08): the typed-value reading and the conflict-free fallback live in the pure counts module, so the
// sidebar / progress / MCP counts (`countRequiredFieldsByTemplate`) and this gate cannot drift apart.
import {
  buildFallbackValues as buildFallbackValuesShared,
  dropHiddenAtSource,
  extractGateValue,
  hiddenAtSourceFieldIds,
  hiddenAtSourceSymbols,
  type CountField,
  type CountParam,
  type CountSection,
  type RequiredFieldCountArgs,
} from '@/lib/projects/required-field-counts';

/**
 * Result of the engineer-approve readiness check. The transition is
 * refused when either list is non-empty.
 */
export type ApprovalGateResult = {
  ok: boolean;
  failingBlockConditions: Array<{ code: string; titleDe: string; condition: string }>;
  /**
   * Owner ruling 2026-10-05 (FLL readiness run, GAR D4): a block gate whose inputs are not all entered is NOT satisfied — it
   * blocks the approval like a failing one, and the refusal says what to enter and why (the gate's own hint). Supersedes the
   * 2026-09-30 reading that a pending block gate never blocks. Hidden inputs (visible_when) stay not_applicable, never pending.
   */
  pendingBlockConditions: PendingBlockCondition[];
  missingRequiredFields: Array<{ symbol: string; labelDe: string }>;
};

export type PendingBlockCondition = {
  code: string;
  titleDe: string;
  condition: string;
  /** The gate's description — the bilingual hint ("<de>\n[EN] <en>") the encoding carries; null when none. */
  hint: string | null;
  /** The inputs the gate still waits for, resolved to labels: own sheet, another sheet of the standard (originCode), or a derived value. */
  missingInputs: Array<{ symbol: string; labelDe: string; originCode: string | null; derived: boolean }>;
};

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

/**
 * Every saved, typed occurrence of every active field symbol across the
 * project's worksheet templates. Feeds BOTH the gate's conflict-free fallback
 * (`buildFallbackValues`) and the A4 inherited-required rule
 * (`inheritedSymbolSet`, other templates only) — shared with the finalize gate.
 */
export async function loadProjectWideEntries(projectId: string, client: Pick<typeof db, 'select'> = db): Promise<ProjectWideEntry[]> {
  const projInstances = await client
    .select({ wtid: worksheetInstances.worksheetTemplateId })
    .from(worksheetInstances)
    .where(eq(worksheetInstances.projectId, projectId));
  const projWtids = [...new Set(projInstances.map((r) => r.wtid))];
  const projFields = projWtids.length === 0
    ? []
    : await client
      .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType, templateId: fields.worksheetTemplateId, standardCode: standards.code })
      .from(fields)
      .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
      .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
      .where(and(inArray(fields.worksheetTemplateId, projWtids), eq(fields.active, true)));
  const projFieldIds = projFields.map((f) => f.id);
  const projParams = projFieldIds.length === 0
    ? []
    : await client
      .select()
      .from(projectParameters)
      .where(
        and(
          eq(projectParameters.projectId, projectId),
          inArray(projectParameters.fieldId, projFieldIds),
        ),
      );
  const projParamByFieldId = new Map(projParams.map((p) => [p.fieldId, p]));
  const entries: ProjectWideEntry[] = [];
  for (const f of projFields) {
    const p = projParamByFieldId.get(f.id);
    if (!p) continue;
    const v = extractValue(f.dataType, p);
    if (v !== undefined) entries.push({ symbol: f.symbol, value: v, templateId: f.templateId, standardCode: f.standardCode, fieldId: f.id });
  }
  return entries;
}

/** A4: symbols a conflict-free project-wide value resolves for, from worksheets OTHER than `ownTemplateId`. */
export async function loadInheritedSymbolsForTemplate(projectId: string, ownTemplateId: string): Promise<Set<string>> {
  // DWA-M 820-3 review fix I-e: own-standard-first - a symbol of the own standard counts only from that standard.
  const [tmpl] = await db
    .select({ standardId: worksheetTemplates.standardId })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.id, ownTemplateId))
    .limit(1);
  // One load (4 reads) for the occurrences, the scope and the R-14 hidden-at-source set.
  const visArgs = tmpl ? await loadStandardVisibilityArgs(projectId, tmpl.standardId) : null;
  const entriesAll = visArgs?.projectEntries ?? await loadProjectWideEntries(projectId);
  const scope = visArgs?.ownScope
    ?? (tmpl
      ? await loadOwnStandardScope(tmpl.standardId)
      : { templateIds: new Set<string>(), symbols: new Set<string>(), types: new Map<string, Set<string>>(), standardCode: null });
  // M820 flow block 3 (X10): the cross-standard carry-over allow-list adds its listed carriers (src/lib/projects/cross-standard-carry.ts).
  const carry = scope.standardCode ? { ownStandardCode: scope.standardCode } : undefined;
  // R-14: an occurrence hidden on its own source sheet of this standard is no inherited value.
  const entries = visArgs ? dropHiddenAtSource(entriesAll, hiddenAtSourceFieldIds(visArgs)) : entriesAll;
  return inheritedSymbolSet(scopeForInheritance(entries, scope.templateIds, scope.types, carry).filter((e) => e.templateId !== ownTemplateId));
}

/**
 * The own standard's active fields: template ids + symbols (the scope of `scopeToOwnStandard`) + per symbol the data types of
 * the own fields carrying it (the scope of `scopeForInheritance`, fix round 2: only text / date may be filled from another standard).
 */
export async function loadOwnStandardScope(
  standardId: string,
  client: Pick<typeof db, 'select'> = db,
): Promise<{ templateIds: Set<string>; symbols: Set<string>; types: Map<string, Set<string>>; standardCode: string | null }> {
  const rows = await client
    .select({ symbol: fields.symbol, templateId: fields.worksheetTemplateId, dataType: fields.dataType })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .where(and(eq(worksheetTemplates.standardId, standardId), eq(fields.active, true)));
  const [std] = await client.select({ code: standards.code }).from(standards).where(eq(standards.id, standardId)).limit(1);
  const types = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!types.has(r.symbol)) types.set(r.symbol, new Set());
    types.get(r.symbol)!.add(r.dataType);
  }
  return { templateIds: new Set(rows.map((r) => r.templateId)), symbols: new Set(rows.map((r) => r.symbol)), types, standardCode: std?.code ?? null };
}

/** One active field of the standard as the visibility passes, the save path and the inheritance rule read it. */
export type StandardVisibilityField = CountField & {
  templateCode: string;
  unit: string | null;
  widget: string | null;
  uiConfig: unknown;
  consumerWorksheets: string[] | null;
};

/**
 * Field/section metadata of ONE standard (2 reads). It does not change during a save, so the save path loads it once and
 * shares it between the lookup_fill pass, the register materialiser, the stale pass and the R-13 consumer pass.
 */
export type StandardVisibilityMeta = {
  standardCode: string | null;
  templateIds: string[];
  fields: StandardVisibilityField[];
  sections: CountSection[];
};

/** The project's saved occurrences context: every active field of every template the project has an instance of. */
export type ProjectFieldRow = { id: string; symbol: string; dataType: string; templateId: string; standardCode: string | null };

export async function loadStandardVisibilityMeta(
  standardId: string,
  client: Pick<typeof db, 'select'> = db,
): Promise<StandardVisibilityMeta> {
  const fieldRows = await client
    .select({
      id: fields.id,
      symbol: fields.symbol,
      labelDe: fields.labelDe,
      dataType: fields.dataType,
      isRequired: fields.isRequired,
      templateId: fields.worksheetTemplateId,
      templateCode: worksheetTemplates.code,
      sectionId: fields.sectionId,
      visibleWhen: fields.visibleWhen,
      unit: fields.unit,
      widget: fields.widget,
      uiConfig: fields.uiConfig,
      consumerWorksheets: fields.consumerWorksheets,
      standardCode: standards.code,
    })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(and(eq(worksheetTemplates.standardId, standardId), eq(fields.active, true)));
  const sectionRows = await client
    .select({
      id: worksheetSections.id,
      parentSectionId: worksheetSections.parentSectionId,
      visibleWhen: worksheetSections.visibleWhen,
      templateId: worksheetSections.worksheetTemplateId,
    })
    .from(worksheetSections)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetSections.worksheetTemplateId))
    .where(eq(worksheetTemplates.standardId, standardId));
  const fieldsOut: StandardVisibilityField[] = fieldRows.map((r) => ({
    id: r.id, symbol: r.symbol, labelDe: r.labelDe, dataType: r.dataType, isRequired: r.isRequired,
    templateId: r.templateId, templateCode: r.templateCode, sectionId: r.sectionId, visibleWhen: r.visibleWhen,
    unit: r.unit, widget: r.widget, uiConfig: r.uiConfig,
    consumerWorksheets: (r.consumerWorksheets as string[] | null) ?? null,
  }));
  return {
    standardCode: fieldRows[0]?.standardCode ?? null,
    templateIds: [...new Set([...fieldRows.map((f) => f.templateId), ...sectionRows.map((s) => s.templateId)])],
    fields: fieldsOut,
    sections: sectionRows,
  };
}

/** Active fields of every template the project has an instance of (1 read) — the occurrence side of the fallback / A4. */
export async function loadProjectFieldRows(projectId: string, client: Pick<typeof db, 'select'> = db): Promise<ProjectFieldRow[]> {
  return client
    .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType, templateId: fields.worksheetTemplateId, standardCode: standards.code })
    .from(fields)
    .innerJoin(worksheetInstances, and(eq(worksheetInstances.worksheetTemplateId, fields.worksheetTemplateId), eq(worksheetInstances.projectId, projectId)))
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(eq(fields.active, true));
}

/** Every saved parameter row of the project (1 read). */
export async function loadProjectParameterRows(projectId: string, client: Pick<typeof db, 'select'> = db) {
  return client.select().from(projectParameters).where(eq(projectParameters.projectId, projectId));
}

/**
 * Pure: the visibility-pass args from the loaded rows — the same shape (and the same content) the former 9-read loader
 * produced: `ownScope` from the standard's active fields, `projectEntries` = typed occurrences on the project's templates.
 */
export function buildVisibilityArgs(
  meta: StandardVisibilityMeta,
  projectFields: ReadonlyArray<ProjectFieldRow>,
  params: ReadonlyArray<CountParam & { fieldId: string }>,
): RequiredFieldCountArgs | null {
  if (meta.templateIds.length === 0) return null;
  const paramByFieldId = new Map(params.map((p) => [p.fieldId, p]));
  const projectEntries: ProjectWideEntry[] = [];
  for (const f of projectFields) {
    const p = paramByFieldId.get(f.id);
    if (!p) continue;
    const v = extractGateValue(f.dataType, p);
    if (v !== undefined) projectEntries.push({ symbol: f.symbol, value: v, templateId: f.templateId, standardCode: f.standardCode, fieldId: f.id });
  }
  const types = new Map<string, Set<string>>();
  for (const f of meta.fields) {
    if (!types.has(f.symbol)) types.set(f.symbol, new Set());
    types.get(f.symbol)!.add(f.dataType);
  }
  const ownScope = {
    templateIds: new Set(meta.fields.map((f) => f.templateId)),
    symbols: new Set(meta.fields.map((f) => f.symbol)),
    types,
    standardCode: meta.standardCode,
  };
  return { templateIds: meta.templateIds, fields: meta.fields, sections: meta.sections, paramByFieldId, projectEntries, ownScope };
}

/** Pure form of `loadInheritedFields` over the loaded meta: fields of OTHER templates of the standard naming `code` as consumer. */
export function inheritedFieldsFromMeta(meta: StandardVisibilityMeta, templateId: string, code: string): StandardVisibilityField[] {
  return meta.fields.filter((f) => f.templateId !== templateId && (f.consumerWorksheets ?? []).includes(code));
}

/**
 * The rows of ONE standard in a project that the per-template visibility pass reads (`required-field-counts.ts`) — 4 reads
 * (fields, sections, project fields, project parameters). ONE loader for the counts (C-7), the hidden-at-source sets
 * (U-2 / R-14 / R-15), the gate, MCP and the save path. `client` = a tx handle inside `db.transaction`.
 */
export async function loadStandardVisibilityArgs(
  projectId: string,
  standardId: string,
  client: Pick<typeof db, 'select'> = db,
): Promise<RequiredFieldCountArgs | null> {
  const parallel = client === db;
  const [meta, projectFields, params] = parallel
    ? await Promise.all([loadStandardVisibilityMeta(standardId, client), loadProjectFieldRows(projectId, client), loadProjectParameterRows(projectId, client)])
    : [await loadStandardVisibilityMeta(standardId, client), await loadProjectFieldRows(projectId, client), await loadProjectParameterRows(projectId, client)];
  return buildVisibilityArgs(meta, projectFields, params);
}

/**
 * R-14: the field ids of ONE standard hidden by `visible_when` on their own (source) template under the project's saved
 * values — the set the gate, the counts, the worksheet page and the save path drop (`dropHiddenAtSource`).
 */
export async function loadHiddenAtSourceFieldIds(
  projectId: string,
  standardId: string,
  client: Pick<typeof db, 'select'> = db,
): Promise<Set<string>> {
  const args = await loadStandardVisibilityArgs(projectId, standardId, client);
  return args ? hiddenAtSourceFieldIds(args) : new Set();
}

/** Extract the typed value from a project_parameters row for a field's data type (shared with the counts, C-7). */
const extractValue = extractGateValue;

/**
 * Build the project-wide fallback map for symbols that are NOT fields on the
 * gate's own worksheet. A symbol is included only when every saved occurrence
 * across the project agrees; conflicting values are omitted (→ the gate stays
 * `pending`, never producing a wrong verdict from an ambiguous selector).
 * Implementation shared with the required-field counts (C-7).
 */
export const buildFallbackValues = buildFallbackValuesShared;

/**
 * DWA-M 820-3 structure block (2026-10-06): the project-wide fallback, scoped to the gate's OWN standard first.
 *
 * A project usually carries several standards, and two standards can define the SAME symbol with different meanings and
 * tokens (`project_type`: DWA-M 820-1 `konzept` / `projekt`, DWA-M 820-3 `gesamtsystem` / `einzelprojekt` / `both`, DWA-A 138
 * `neuerschliessung` …, DIN 276 `building` …). The plain project-wide map drops such a symbol as a conflict (→ every routed gate
 * of the standard stays pending for good) or, when the own field is still blank, silently takes the FOREIGN value (→ a guard
 * `project_type IN {…}` decides on another standard's token: a silent pass, the opposite of "an unanswered driver waits").
 *
 * Rule: a symbol that is an active field of the gate's own standard (`ownStandardSymbols`) resolves ONLY from saved
 * occurrences on that standard's worksheets (`ownTemplateIds`) — conflict-free as before, blank → absent → pending; any other
 * symbol resolves from the whole project exactly as `buildFallbackValues` did. Same-standard reads are what the form's
 * inheritance (`loadInheritedFields`, same standard only) already shows the engineer.
 */
export function buildStandardScopedFallback(
  entries: ReadonlyArray<ProjectWideEntry>,
  ownTemplateIds: ReadonlySet<string>,
  ownStandardSymbols: ReadonlySet<string>,
): Map<string, GateValue> {
  return buildFallbackValues(scopeToOwnStandard(entries, ownTemplateIds, ownStandardSymbols));
}

/**
 * Scoped lookup for gate evaluation: a symbol that IS a field on the gate's
 * worksheet resolves locally (blank → undefined → pending, unchanged from the
 * original behaviour); a symbol that is NOT a local field resolves from the
 * conflict-free project-wide fallback. This lets cross-worksheet guards
 * (e.g. `IF quality_category == C2 THEN turbidity < 2`, where the selector is
 * entered on a config worksheet) evaluate without duplicating fields.
 */
export function makeGateLookup(
  localSymbols: Set<string>,
  localValues: Map<string, GateValue>,
  fallback: Map<string, GateValue>,
): (s: string) => GateValue | undefined {
  return (s) => (localSymbols.has(s) ? localValues.get(s) : fallback.get(s));
}

/**
 * Re-validate a worksheet instance against its compliance + required-field
 * invariants. Used as the gate on the `engineer_approve` state-machine
 * transition: the transition is refused when this returns ok=false.
 *
 * SCOPE — the gate refuses approval when EITHER:
 *   1. Any block-severity compliance condition currently returns `fail`
 *      (parses to a definite negative verdict given the saved values).
 *   2. Any active is_required field on the worksheet has no saved value
 *      (no project_parameters row, or row with all value columns null).
 *
 * Manual / pending / attestation conditions do NOT block approval — they
 * are by design awaiting the engineer's sign-off (which IS this
 * transition). Only definite-fail block-severity rules block.
 *
 * The check runs at the worksheet-instance level: it loads the instance's
 * template fields + compliance rows + the project's parameter values for
 * those fields, then replays each via the same evaluateCondition the
 * form + PDF paths use. No new evaluator semantics.
 */
export async function checkApprovalGate(
  instanceId: string,
): Promise<ApprovalGateResult> {
  // Resolve the worksheet template + project from the instance.
  const [instance] = await db
    .select({
      projectId: worksheetInstances.projectId,
      worksheetTemplateId: worksheetInstances.worksheetTemplateId,
      standardCode: standards.code,
      standardId: standards.id,
    })
    .from(worksheetInstances)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(eq(worksheetInstances.id, instanceId))
    .limit(1);
  if (!instance) {
    return {
      ok: false,
      failingBlockConditions: [],
      pendingBlockConditions: [],
      missingRequiredFields: [{ symbol: '__instance__', labelDe: 'Worksheet not found' }],
    };
  }

  // C-1 (final review, guideline-to-tool): the gate runs BEFORE the transition
  // transaction, on the global pool — the right place to register the
  // standard's DB regulation tables so every evaluation of this instance in
  // the same request (gate conditions, then the snapshot capture inside the
  // tx) reads DB-backed tables instead of the A138-only TS seed. Never throws.
  await ensureRegulationTablesLoaded(instance.standardCode);

  // Load the template's active fields + the project's saved parameters
  // for those fields. The required-field list is built from the template;
  // the lookup map is built from the parameter values.
  const tmplFields = await db
    .select({
      id: fields.id,
      symbol: fields.symbol,
      labelDe: fields.labelDe,
      dataType: fields.dataType,
      isRequired: fields.isRequired,
      // Plan 2a (Task 10): visible_when inputs.
      sectionId: fields.sectionId,
      visibleWhen: fields.visibleWhen,
      widget: fields.widget,
    })
    .from(fields)
    .where(
      and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)),
    );
  // Sections carry their own visible_when and the parent chain a hidden
  // ancestor propagates through (same pure helper as the form).
  const tmplSections = await db
    .select({
      id: worksheetSections.id,
      parentSectionId: worksheetSections.parentSectionId,
      visibleWhen: worksheetSections.visibleWhen,
    })
    .from(worksheetSections)
    .where(eq(worksheetSections.worksheetTemplateId, instance.worksheetTemplateId));

  const fieldIds = tmplFields.map((f) => f.id);
  const params = fieldIds.length === 0
    ? []
    : await db
      .select()
      .from(projectParameters)
      .where(
        and(
          eq(projectParameters.projectId, instance.projectId),
          inArray(projectParameters.fieldId, fieldIds),
        ),
      );
  const paramByFieldId = new Map(params.map((p) => [p.fieldId, p]));

  // Build the LOCAL symbol → value map from this worksheet's fields. JSON
  // values are skipped because the condition DSL doesn't read structured
  // carriers (they drive aggregators, a separate path). A field that exists on
  // this worksheet but is blank is intentionally absent here → resolves to
  // `pending`, unchanged from the original behaviour.
  const localSymbols = new Set(tmplFields.map((f) => f.symbol));
  const bySymbol = new Map<string, GateValue>();
  for (const f of tmplFields) {
    const p = paramByFieldId.get(f.id);
    if (!p) continue;
    const v = extractValue(f.dataType, p);
    if (v !== undefined) bySymbol.set(f.symbol, v);
  }

  // Project-wide fallback: for symbols that are NOT fields on THIS worksheet,
  // resolve from the project's value wherever it is entered (e.g. a config
  // selector like quality_category on another worksheet). Conflict-free only.
  // ONE load (4 reads) for the occurrences, the own-standard scope and the hidden-at-source set.
  const visArgs = await loadStandardVisibilityArgs(instance.projectId, instance.standardId);
  const projectEntriesAll = visArgs?.projectEntries ?? await loadProjectWideEntries(instance.projectId);
  // DWA-M 820-3 structure block: a symbol of the gate's own standard resolves from that standard only (see
  // buildStandardScopedFallback - a same-named field of another standard never decides, never blanks it out).
  const ownScope = visArgs?.ownScope ?? await loadOwnStandardScope(instance.standardId);
  // R-14 (hidden => absent): an occurrence hidden by `visible_when` on its own source sheet of this standard is no value -
  // e.g. 820-2-18 `testbetrieb_vs_abnahme_choice` while `bauleistungen_vergeben` is not true. Same set the worksheet page
  // drops from its upstream panel and seeding. R-15: its symbol is also HIDDEN for the conditions below (not_applicable).
  const hiddenAtSource = visArgs ? hiddenAtSourceFieldIds(visArgs) : new Set<string>();
  const sourceHiddenSymbols = visArgs ? hiddenAtSourceSymbols(visArgs.fields, hiddenAtSource, instance.worksheetTemplateId) : new Set<string>();
  const projectEntries = dropHiddenAtSource(projectEntriesAll, hiddenAtSource);
  const fallback = buildStandardScopedFallback(projectEntries, ownScope.templateIds, ownScope.symbols);
  // A4: the symbols an inherited project-wide value resolves for (OTHER
  // worksheets only, conflict-free) — a required field the sheet offers as
  // "aus <WS> … oder überschreiben" is satisfied without re-typing.
  // DWA-M 820-3 review fix I-e (round 2): own-standard-first (scopeForInheritance) — a foreign occurrence of an own symbol counts
  // only when the own standard has none and the own field is text or date (identity / metadata class).
  const inheritedSymbols = inheritedSymbolSet(
    // M820 flow block 3 (X10): + the cross-standard carry-over allow-list (A4 only — the gate `fallback` above stays own-standard).
    scopeForInheritance(projectEntries, ownScope.templateIds, ownScope.types, ownScope.standardCode ? { ownStandardCode: ownScope.standardCode } : undefined)
      .filter((e) => e.templateId !== instance.worksheetTemplateId),
  );

  const lookup = makeGateLookup(localSymbols, bySymbol, fallback);

  // Plan 3 final wave A (defect 4): the RAW json of this worksheet's carriers,
  // so a gate `contains(checklist, 'token')` has a value to read. `bySymbol`
  // above deliberately keeps mapping a carrier to the 'present' marker for the
  // existence checks — this is the carrier path beside it, local fields only
  // (the project-wide fallback resolves scalars; a structured carrier is never
  // merged across worksheets).
  const carrierByFieldId = new Map(tmplFields.map((f) => [f.symbol, f]));
  const gateCarrier = (sym: string): unknown => {
    const f = carrierByFieldId.get(sym);
    if (!f || f.dataType !== 'json') return undefined;
    return paramByFieldId.get(f.id)?.valueJson ?? undefined;
  };

  // Plan 2a (Task 10): fields/sections hidden by `visible_when` under the
  // SAVED values — same pure helper and same lookup the form uses, so the
  // gate cannot disagree with what the engineer saw. A block condition that
  // references a hidden symbol reports `not_applicable` — NEVER a blocker
  // (only `kind === 'fail'` below blocks; Task 11 pins the same rule in the
  // form badge, PDF, Prüfmemo and snapshot verdict); a hidden required field
  // is not "missing" (it cannot be filled in).
  const { hiddenFieldIds, hiddenSymbols: ownHiddenSymbols } = computeVisibility(tmplFields, tmplSections, lookup);
  // R-15 (2026-10-08): a symbol whose field is hidden on its SOURCE sheet is hidden for this gate too - a condition reading
  // it reports `not_applicable`, never `pending` (a pending block gate blocks and would name a question nobody can see).
  // Only symbols that are not a field of this sheet: a local field is decided by this sheet's own visibility above.
  const hiddenSymbols = gateHiddenSymbols(ownHiddenSymbols, sourceHiddenSymbols, localSymbols);

  // Missing required-field check: a field with is_required=true must have a
  // non-null value of its declared type (JSON: valueJson non-null) — OR an
  // inherited project-wide value must resolve for its symbol (A4). One shared
  // rule with the finalize gate and the progress counts (`required-fields.ts`).
  const missingRequiredFields = missingRequiredFieldsShared(tmplFields, paramByFieldId, { hiddenFieldIds, inheritedSymbols });

  // Block-severity compliance check. Only conditions that evaluate to a
  // definite `fail` block; `pass`, `pending`, `manual` (attestation or
  // broken rule) do NOT block. The "missing required" check above
  // already catches `pending` for required inputs.
  const rows = await db
    .select({
      code: complianceRequirements.code,
      titleDe: complianceRequirements.titleDe,
      condition: complianceRequirements.condition,
      severity: complianceRequirements.severity,
      description: complianceRequirements.description,
    })
    .from(complianceRequirements)
    .where(
      and(
        eq(complianceRequirements.worksheetTemplateId, instance.worksheetTemplateId),
        eq(complianceRequirements.severity, 'block'),
      ),
    );

  const failingBlockConditions: ApprovalGateResult['failingBlockConditions'] = [];
  const pendingRaw: Array<{ code: string; titleDe: string; condition: string; hint: string | null; missingSymbols: string[] }> = [];
  for (const r of rows) {
    const result = evaluateCondition(r.condition, lookup, { hiddenSymbols, carrier: gateCarrier });
    if (result.kind === 'fail') {
      failingBlockConditions.push({
        code: r.code,
        titleDe: r.titleDe,
        condition: r.condition,
      });
    } else if (result.kind === 'pending') {
      // Owner ruling 2026-10-05 (GAR D4): a block gate without its inputs is not satisfied — it blocks, and the refusal names the
      // inputs (labels, origin sheet, derived or typed) and carries the gate's hint so the engineer knows how to pass it.
      pendingRaw.push({ code: r.code, titleDe: r.titleDe, condition: r.condition, hint: r.description ?? null, missingSymbols: result.missingSymbols });
    }
  }

  const pendingBlockConditions: PendingBlockCondition[] = [];
  if (pendingRaw.length > 0) {
    const wanted = new Set(pendingRaw.flatMap((p) => p.missingSymbols));
    const localBySymbol = new Map(tmplFields.map((f) => [f.symbol, f]));
    const foreign = [...wanted].filter((s) => !localBySymbol.has(s));
    // Labels for inputs that live on another sheet of the same standard (inherited through the project-wide lookup).
    const foreignRows = foreign.length === 0
      ? []
      : await db
        .select({ symbol: fields.symbol, labelDe: fields.labelDe, widget: fields.widget, code: worksheetTemplates.code })
        .from(fields)
        .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
        .where(and(eq(worksheetTemplates.standardId, instance.standardId), inArray(fields.symbol, foreign), eq(fields.active, true)));
    const foreignBySymbol = new Map<string, { labelDe: string; widget: string | null; code: string }>();
    for (const r of foreignRows) if (!foreignBySymbol.has(r.symbol)) foreignBySymbol.set(r.symbol, r);
    // A symbol an equation of this sheet produces cannot be typed — its inputs must be filled instead.
    const eqRows = await db
      .select({ outputSymbol: equations.outputSymbol })
      .from(equations)
      .where(eq(equations.worksheetTemplateId, instance.worksheetTemplateId));
    const producedHere = new Set(eqRows.map((e) => e.outputSymbol).filter((s): s is string => s != null));
    for (const p of pendingRaw) {
      pendingBlockConditions.push({
        code: p.code,
        titleDe: p.titleDe,
        condition: p.condition,
        hint: p.hint,
        missingInputs: p.missingSymbols.map((sym) => {
          const local = localBySymbol.get(sym);
          if (local) return { symbol: sym, labelDe: local.labelDe, originCode: null, derived: local.widget === 'derived' || producedHere.has(sym) };
          const f = foreignBySymbol.get(sym);
          if (f) return { symbol: sym, labelDe: f.labelDe, originCode: f.code, derived: f.widget === 'derived' };
          return { symbol: sym, labelDe: sym, originCode: null, derived: false };
        }),
      });
    }
  }

  const ok = failingBlockConditions.length === 0 && pendingBlockConditions.length === 0 && missingRequiredFields.length === 0;
  return { ok, failingBlockConditions, pendingBlockConditions, missingRequiredFields };
}

/** One refusal line for a block gate that waits for inputs: what to enter (labels, where, typed or computed) and the gate's hint. */
export function formatPendingBlockCondition(p: PendingBlockCondition): string {
  const inputs = p.missingInputs.map((m) => {
    const where = m.originCode ? ` — aus ${m.originCode}` : '';
    const how = m.derived ? ' — berechneter Wert: die Eingaben seiner Gleichung ausfüllen' : '';
    return `${m.labelDe} (${m.symbol}${where}${how})`;
  }).join('; ');
  const hint = p.hint ? ` · Hinweis: ${p.hint.replace(/\s*\n\s*/g, ' ').trim()}` : '';
  return `${p.code} (${p.titleDe}) — fehlende Eingaben: ${inputs} · Bedingung: ${p.condition}${hint}`;
}

/** Format the gate result as a single error string for transition refusal. */
export function formatApprovalGateError(result: ApprovalGateResult): string {
  const parts: string[] = [];
  if (result.failingBlockConditions.length > 0) {
    const list = result.failingBlockConditions
      .map((c) => `${c.code} (${c.titleDe})`)
      .join(', ');
    parts.push(`Blockierende Compliance-Verstöße offen: ${list}`);
  }
  if (result.pendingBlockConditions.length > 0) {
    const list = result.pendingBlockConditions.map(formatPendingBlockCondition).join(' | ');
    parts.push(`Blockierende Prüfungen ohne Eingabe — erst eingeben, dann erneut einreichen: ${list}`);
  }
  if (result.missingRequiredFields.length > 0) {
    const list = result.missingRequiredFields
      .map((f) => `${f.labelDe} (${f.symbol})`)
      .join(', ');
    parts.push(`Pflichteingaben fehlen: ${list}`);
  }
  return (
    'Genehmigung abgelehnt — Eingaben prüfen und korrigieren, dann erneut einreichen. '
    + parts.join(' · ')
  );
}

/**
 * R-15 (2026-10-08): the gate's hidden symbols = this sheet's own hidden symbols plus the symbols hidden at their source
 * sheet that are NOT a field of this sheet (a local field is decided by this sheet's own visibility). A condition reading
 * one of them reports `not_applicable`, never `pending`.
 */
export function gateHiddenSymbols(
  ownHidden: ReadonlySet<string>,
  sourceHidden: ReadonlySet<string>,
  localSymbols: ReadonlySet<string>,
): Set<string> {
  const out = new Set(ownHidden);
  for (const s of sourceHidden) if (!localSymbols.has(s)) out.add(s);
  return out;
}
