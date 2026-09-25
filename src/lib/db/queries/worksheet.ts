import 'server-only';
import { db } from '@/lib/db';
import {
  standards,
  worksheetTemplates,
  worksheetSections,
  fields,
  equations,
  complianceRequirements,
  complianceSuggestions,
  worksheetInstances,
  projectParameters,
  projectStandards,
  projects,
  orgMembers,
} from '@/lib/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { resolveRegisterConfig } from '@/lib/eval/register-configs';

/** The subset of the Drizzle API a query helper needs when a caller hands it
 * its transaction handle. Wider than `typeof db` so Drizzle's `tx` type (not
 * assignable to `typeof db`) satisfies it. Mirrors the type of the same name
 * in `src/lib/snapshots/capture.ts`. */
export type DrizzleClient = {
  select: typeof db.select;
  insert: typeof db.insert;
};

/** Resolve a standard + worksheet by codes, throwing if not found. */
export async function loadWorksheet(standardCode: string, worksheetCode: string) {
  const rows = await db
    .select({
      template: {
        id: worksheetTemplates.id,
        code: worksheetTemplates.code,
        titleDe: worksheetTemplates.titleDe,
        titleEn: worksheetTemplates.titleEn,
        phase: worksheetTemplates.phase,
        archetype: worksheetTemplates.archetype,
        description: worksheetTemplates.description,
      },
      standard: {
        id: standards.id,
        code: standards.code,
        titleDe: standards.titleDe,
      },
    })
    .from(worksheetTemplates)
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(
      and(
        eq(standards.code, standardCode),
        eq(worksheetTemplates.code, worksheetCode),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  const { template, standard } = rows[0];

  const [secList, fieldList, eqList, crList] = await Promise.all([
    db
      .select()
      .from(worksheetSections)
      .where(eq(worksheetSections.worksheetTemplateId, template.id))
      .orderBy(worksheetSections.orderIndex),
    db
      .select()
      .from(fields)
      .where(eq(fields.worksheetTemplateId, template.id))
      .orderBy(fields.orderIndex),
    db
      .select()
      .from(equations)
      .where(eq(equations.worksheetTemplateId, template.id)),
    db
      .select()
      .from(complianceRequirements)
      .where(eq(complianceRequirements.worksheetTemplateId, template.id)),
  ]);

  // Pull suggestion rows for the loaded REQs in a follow-up batch. Keyed by
  // requirement_id so the renderer can group them under the failing REQ.
  let suggestionList: Array<typeof complianceSuggestions.$inferSelect> = [];
  if (crList.length > 0) {
    suggestionList = await db
      .select()
      .from(complianceSuggestions)
      .where(inArray(complianceSuggestions.requirementId, crList.map((c) => c.id)))
      .orderBy(complianceSuggestions.orderIndex);
  }

  return {
    template: { ...template, standard },
    sections: secList,
    fields: fieldList,
    equations: eqList,
    complianceRequirements: crList,
    complianceSuggestions: suggestionList,
  };
}

/** Ensure a worksheet_instance exists for (project, template). Lazy-create as 'draft'.
 * Race-safe: uses INSERT … ON CONFLICT DO NOTHING to avoid duplicate-key errors
 * when two requests arrive simultaneously. */
export async function ensureWorksheetInstance(
  projectId: string,
  templateId: string,
) {
  const inserted = await db
    .insert(worksheetInstances)
    .values({ projectId, worksheetTemplateId: templateId })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) return inserted[0];

  // Row already existed — fetch it
  const [existing] = await db
    .select()
    .from(worksheetInstances)
    .where(
      and(
        eq(worksheetInstances.projectId, projectId),
        eq(worksheetInstances.worksheetTemplateId, templateId),
      ),
    )
    .limit(1);
  return existing;
}

/**
 * Cross-worksheet inheritance: load all "consumed" fields from OTHER worksheet
 * templates in the same standard whose `consumer_worksheets` array declares
 * the current worksheet as a consumer.
 *
 * The producing worksheet's field IS the value carrier — there is exactly one
 * project_parameters row per (project_id, field_id). A downstream worksheet
 * that consumes a symbol reads that same row, so saving on the origin
 * propagates immediately.
 *
 * Pile-2-deactivated rows (`active=false`) are excluded — they're hidden
 * from the form everywhere.
 *
 * Returns the origin field rows annotated with the producing worksheet code,
 * so the UI can render an attribution badge ("← A138-10").
 */
export type InheritedField = typeof fields.$inferSelect & {
  originWorksheetCode: string;
};

export async function loadInheritedFields(
  currentTemplateId: string,
  currentStandardId: string,
  currentWorksheetCode: string,
  /**
   * Client to run the SELECT on. Defaults to the global pool. A caller that
   * is inside `db.transaction` MUST pass its `tx` handle: running this query
   * on the global pool while the transaction holds a second connection made
   * the prod submit hang idle-in-transaction (2026-09-17 "Zur Prüfung
   * einreichen", captureSnapshot). Fixed on both lines of history (branch
   * Task 10b `dbi: DrizzleClient`, origin/main e5fed75 `client`); merged into
   * main's signature, which accepts both a `DrizzleClient` and a bare
   * `{ select }` test double.
   */
  client: Pick<typeof db, 'select'> = db,
): Promise<InheritedField[]> {
  const rows = await client
    .select({
      field: fields,
      originCode: worksheetTemplates.code,
    })
    .from(fields)
    .innerJoin(
      worksheetTemplates,
      eq(worksheetTemplates.id, fields.worksheetTemplateId),
    )
    .where(
      and(
        eq(worksheetTemplates.standardId, currentStandardId),
        sql`${currentWorksheetCode} = ANY(${fields.consumerWorksheets})`,
        sql`${fields.worksheetTemplateId} <> ${currentTemplateId}`,
        eq(fields.active, true),
      ),
    );
  return rows.map((r) => ({ ...r.field, originWorksheetCode: r.originCode }));
}

/** Load project_parameters for the given field IDs in one query. */
export async function loadProjectParameters(
  projectId: string,
  fieldIds: string[],
): Promise<Map<string, typeof projectParameters.$inferSelect>> {
  if (fieldIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(projectParameters)
    .where(
      and(
        eq(projectParameters.projectId, projectId),
        inArray(projectParameters.fieldId, fieldIds),
      ),
    );
  return new Map(rows.map((r) => [r.fieldId, r]));
}

export type SameSymbolEntry = {
  worksheetCode: string;
  value: unknown;
  dataType: string;
  updatedAt: Date | null;
  /** Stage order of the source standard within the project. Lower = upstream;
   * null = unsequenced. Drives inheritance priority. */
  sourceStageOrder: number | null;
  /** True if the source standard sits on the ancestor chain (parent, grand-
   * parent, …) of the current standard — used for hierarchical inheritance
   * (series, parallel, sub-standard all inherit from their parent). */
  isFromAncestor: boolean;
  /** True if the source standard IS the current render's own standard. §10c
   * TOP priority: the current standard's own field must win over any FOREIGN
   * standard reusing the symbol — otherwise a foreign guideline with an earlier
   * stage_order could leak its value. (No-op for single-standard projects: all
   * candidates are from the current standard, so this key doesn't reorder them.) */
  isFromCurrentStandard: boolean;
};

/**
 * §10c-scoped precedence for a same-symbol bucket:
 *   current standard's own field  →  ancestor chain  →  earliest stage  →  most recent.
 * Pure so the ordering is unit-testable independent of the DB.
 */
export function compareSameSymbolEntries(a: SameSymbolEntry, b: SameSymbolEntry): number {
  if (a.isFromCurrentStandard !== b.isFromCurrentStandard) return a.isFromCurrentStandard ? -1 : 1;
  if (a.isFromAncestor !== b.isFromAncestor) return a.isFromAncestor ? -1 : 1;
  const aStage = a.sourceStageOrder ?? Number.MAX_SAFE_INTEGER;
  const bStage = b.sourceStageOrder ?? Number.MAX_SAFE_INTEGER;
  if (aStage !== bStage) return aStage - bStage;
  const at = a.updatedAt?.getTime() ?? 0;
  const bt = b.updatedAt?.getTime() ?? 0;
  return bt - at;
}

/** For each field symbol on this worksheet, find values already entered for
 * the same symbol elsewhere **in the same project** (any standard). Used both
 * to drive the "← [worksheet]" inheritance hint and to pre-populate fields
 * the engineer hasn't yet entered for this worksheet.
 *
 * Entries are sorted so the caller can pick `[0]` for inheritance:
 *   1. Source standard is on the current standard's parent chain — parent
 *      values always win, satisfying the series / parallel / sub-standard
 *      "inherit from parent" rule.
 *   2. Source standard's `stage_order` ascending (NULL last) — output from
 *      an earlier stage wins, matching the user's stage-N → stage-N+1
 *      parameter-flow expectation.
 *   3. Most-recently entered first (fallback within a stage). */
export async function loadSameSymbolValues(
  projectId: string,
  currentTemplateId: string,
  symbols: string[],
): Promise<Map<string, SameSymbolEntry[]>> {
  if (symbols.length === 0) return new Map();
  // All OTHER fields in the project with matching symbols (any standard).
  // Join project_standards so we know the source standard's stage_order
  // within the project (null for standards not on the project — they're
  // filtered out by the project_parameters join in the next step).
  const otherFields = await db
    .select({
      fieldId: fields.id,
      symbol: fields.symbol,
      dataType: fields.dataType,
      worksheetCode: worksheetTemplates.code,
      sourceStandardId: worksheetTemplates.standardId,
    })
    .from(fields)
    .innerJoin(
      worksheetTemplates,
      eq(worksheetTemplates.id, fields.worksheetTemplateId),
    )
    .where(
      and(
        inArray(fields.symbol, symbols),
        sql`${fields.worksheetTemplateId} <> ${currentTemplateId}`,
      ),
    );

  if (otherFields.length === 0) return new Map();

  const otherFieldIds = otherFields.map((f) => f.fieldId);

  // Look up the current worksheet's standardId so we can walk the ancestor
  // chain on project_standards (parent_standard_id refs project_standards.id,
  // not standards.id, so we resolve via the project_standards row).
  const [currentWs] = await db
    .select({ standardId: worksheetTemplates.standardId })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.id, currentTemplateId))
    .limit(1);
  const currentStandardId = currentWs?.standardId ?? null;

  const [params, projStds] = await Promise.all([
    db
      .select()
      .from(projectParameters)
      .where(
        and(
          eq(projectParameters.projectId, projectId),
          inArray(projectParameters.fieldId, otherFieldIds),
        ),
      ),
    db
      .select({
        id: projectStandards.id,
        standardId: projectStandards.standardId,
        stageOrder: projectStandards.stageOrder,
        parentStandardId: projectStandards.parentStandardId,
      })
      .from(projectStandards)
      .where(
        and(
          eq(projectStandards.projectId, projectId),
          eq(projectStandards.status, 'active'),
        ),
      ),
  ]);
  const stageByStandardId = new Map(projStds.map((p) => [p.standardId, p.stageOrder]));

  // Build the ancestor set of the current standard. Walk parent_standard_id
  // (which points at another project_standards row) up to the root.
  const psById = new Map(projStds.map((p) => [p.id, p]));
  const psByStandardId = new Map(projStds.map((p) => [p.standardId, p]));
  const ancestorStandardIds = new Set<string>();
  if (currentStandardId) {
    const currentPs = psByStandardId.get(currentStandardId);
    let cursor = currentPs?.parentStandardId ?? null;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const node = psById.get(cursor);
      if (!node) break;
      ancestorStandardIds.add(node.standardId);
      cursor = node.parentStandardId;
    }
  }

  const fieldById = new Map(otherFields.map((f) => [f.fieldId, f]));
  const out = new Map<string, SameSymbolEntry[]>();
  for (const p of params) {
    const meta = fieldById.get(p.fieldId);
    if (!meta) continue;
    const value =
      p.valueNumber ?? p.valueText ?? p.valueEnum ?? p.valueDate ?? p.valueBoolean ?? p.valueJson;
    if (value == null) continue;
    const arr = out.get(meta.symbol) ?? [];
    arr.push({
      worksheetCode: meta.worksheetCode,
      value,
      dataType: meta.dataType,
      updatedAt: p.enteredAt,
      sourceStageOrder: stageByStandardId.get(meta.sourceStandardId) ?? null,
      isFromAncestor: ancestorStandardIds.has(meta.sourceStandardId),
      isFromCurrentStandard: currentStandardId != null && meta.sourceStandardId === currentStandardId,
    });
    out.set(meta.symbol, arr);
  }
  // Sort each bucket by §10c-scoped precedence (current standard first).
  for (const arr of out.values()) {
    arr.sort(compareSameSymbolEntries);
  }
  return out;
}

/** Eagerly create one worksheet_instance per template of a given standard for a project.
 * Called when a standard is added to a project. */
export async function instantiateWorksheetInstancesForStandard(
  projectId: string,
  standardId: string,
): Promise<number> {
  const templates = await db
    .select({ id: worksheetTemplates.id })
    .from(worksheetTemplates)
    .where(eq(worksheetTemplates.standardId, standardId));
  if (templates.length === 0) return 0;

  // INSERT … ON CONFLICT DO NOTHING for (project_id, worksheet_template_id)
  await db
    .insert(worksheetInstances)
    .values(templates.map((t) => ({ projectId, worksheetTemplateId: t.id })))
    .onConflictDoNothing();
  return templates.length;
}

/** Confirm the user is a member of the org that owns this project.
 *  `db` runs as postgres and bypasses RLS, so the join is the real check. */
export async function userHasProjectAccess(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .innerJoin(orgMembers, eq(orgMembers.orgId, projects.orgId))
    .where(and(eq(projects.id, projectId), eq(orgMembers.userId, userId)))
    .limit(1);
  return rows.length === 1;
}

/** One register carrier a consumer worksheet reads from an owner worksheet of
 * the same standard (the form's `registerSources` prop). `widget`/`uiConfig`
 * are the OWNER field's, so the form resolves the register config from the DB
 * row first and only then from the symbol-keyed TS fallback (I-3). */
export type RegisterSource = {
  symbol: string;
  ownerCode: string;
  /** Owner instance status (`draft` when the project has no instance yet). */
  status: string;
  /** Stored carrier (`project_parameters.value_json`) or null. */
  carrier: unknown;
  widget: string | null;
  uiConfig: unknown;
  /** Round 2: the owner's equation outputs that read this register AND are consumed on the current worksheet
   * (the values the page withholds while the source is not `ok` — `carrierWithholdFieldIds`). Empty for a
   * register nothing is derived from (the banner then must not claim withholding). */
  producedSymbols: string[];
};

/**
 * I-3 (final review, guideline-to-tool): every register-widget field on ANOTHER
 * worksheet of the standard that the current worksheet consumes — the generic
 * successor of the `surface_inventory`-only `loadSurfaceSource` (deleted; the
 * page withholds every entry's `producedSymbols` through `carrierWithholdFieldIds`).
 *
 * A register field = DB `widget='register'` (parsed ui_config) OR a json field
 * whose symbol has a TS fallback config while `widget IS NULL`
 * (`resolveRegisterConfig`, the single resolver the form/engine use). It is
 * consumed by the current worksheet when EITHER
 *   (a) its own `consumer_worksheets` names the current code, or
 *   (b) an equation of the owner worksheet reads the register
 *       (`input_symbols`) and produces a symbol whose field on the owner names
 *       the current code — A138-07 `surface_inventory` → Gl. 2 → `A_C` → the
 *       consumer. In prod the carrier itself declares `["A138-10","A138-15",
 *       "A138-26"]` (read-only check 2026-09-17), so (a) already lists it there;
 *       (b) is LOAD-BEARING for the withhold shim regardless: A138-13 inherits
 *       `A_C` (produced from a possibly-draft A138-07) without being named on
 *       the carrier, and its inherited value must be withheld + explained.
 *       (b) also yields `producedSymbols` — the outputs the page withholds.
 * Result order: owner code, then symbol. Four queries, batched (never per owner).
 */
export async function loadRegisterSources(
  projectId: string,
  standardId: string,
  currentWorksheetCode: string,
): Promise<RegisterSource[]> {
  const rows = await db
    .select({
      id: fields.id,
      symbol: fields.symbol,
      dataType: fields.dataType,
      widget: fields.widget,
      uiConfig: fields.uiConfig,
      consumerWorksheets: fields.consumerWorksheets,
      ownerCode: worksheetTemplates.code,
      templateId: worksheetTemplates.id,
    })
    .from(fields)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, fields.worksheetTemplateId))
    .where(and(
      eq(worksheetTemplates.standardId, standardId),
      sql`${worksheetTemplates.code} <> ${currentWorksheetCode}`,
      eq(fields.active, true),
    ));
  const consumesMe = (cw: string[] | null) => Array.isArray(cw) && cw.includes(currentWorksheetCode);
  const registers = rows.filter((f) => resolveRegisterConfig({ symbol: f.symbol, dataType: f.dataType, widget: f.widget ?? null, uiConfig: f.uiConfig }) !== null);
  if (registers.length === 0) return [];

  // (b) transitive consumption through the owner's equations.
  const ownerTemplateIds = [...new Set(registers.map((r) => r.templateId))];
  const ownerEquations = await db
    .select({ templateId: equations.worksheetTemplateId, inputSymbols: equations.inputSymbols, outputSymbol: equations.outputSymbol })
    .from(equations)
    .where(inArray(equations.worksheetTemplateId, ownerTemplateIds));
  const consumedSymbolsByTemplate = new Map<string, Set<string>>();
  for (const f of rows) {
    if (!consumesMe(f.consumerWorksheets)) continue;
    const set = consumedSymbolsByTemplate.get(f.templateId) ?? new Set<string>();
    set.add(f.symbol);
    consumedSymbolsByTemplate.set(f.templateId, set);
  }
  /** Owner equation outputs that read the register and are consumed on the current worksheet. */
  const producedFor = (r: { templateId: string; symbol: string }): string[] => {
    const consumed = consumedSymbolsByTemplate.get(r.templateId);
    if (!consumed) return [];
    const out = new Set<string>();
    for (const e of ownerEquations) {
      if (e.templateId === r.templateId && e.outputSymbol != null && consumed.has(e.outputSymbol) && (e.inputSymbols ?? []).includes(r.symbol)) out.add(e.outputSymbol);
    }
    return [...out].sort();
  };
  const consumed = registers
    .map((r) => ({ ...r, producedSymbols: producedFor(r) }))
    .filter((r) => consumesMe(r.consumerWorksheets) || r.producedSymbols.length > 0)
    .sort((a, b) => a.ownerCode.localeCompare(b.ownerCode) || a.symbol.localeCompare(b.symbol));
  if (consumed.length === 0) return [];

  const templateIds = [...new Set(consumed.map((r) => r.templateId))];
  const instances = await db
    .select({ templateId: worksheetInstances.worksheetTemplateId, status: worksheetInstances.status })
    .from(worksheetInstances)
    .where(and(eq(worksheetInstances.projectId, projectId), inArray(worksheetInstances.worksheetTemplateId, templateIds)));
  const params = await db
    .select({ fieldId: projectParameters.fieldId, value: projectParameters.valueJson })
    .from(projectParameters)
    .where(and(eq(projectParameters.projectId, projectId), inArray(projectParameters.fieldId, consumed.map((r) => r.id))));
  const statusByTemplate = new Map(instances.map((i) => [i.templateId, i.status]));
  const carrierByField = new Map(params.map((p) => [p.fieldId, p.value]));
  return consumed.map((r) => ({
    symbol: r.symbol,
    ownerCode: r.ownerCode,
    status: statusByTemplate.get(r.templateId) ?? 'draft',
    carrier: carrierByField.get(r.id) ?? null,
    widget: r.widget ?? null,
    uiConfig: r.uiConfig ?? null,
    producedSymbols: r.producedSymbols,
  }));
}
