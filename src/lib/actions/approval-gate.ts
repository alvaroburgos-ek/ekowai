import 'server-only';
import { db } from '@/lib/db';
import {
  fields,
  complianceRequirements,
  projectParameters,
  worksheetInstances,
  worksheetTemplates,
} from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { evaluateCondition } from '@/lib/compliance/evaluate';
import { loadInheritedFields } from '@/lib/db/queries/worksheet';
import { mergeInheritedFields } from '@/lib/eval/merge-inherited-fields';
import { loadActiveDeviations } from '@/lib/db/queries/deviations';

/**
 * Result of the engineer-approve readiness check. The transition is
 * refused when either list is non-empty.
 */
export type ApprovalGateResult = {
  ok: boolean;
  failingBlockConditions: Array<{ code: string; titleDe: string; condition: string }>;
  missingRequiredFields: Array<{ symbol: string; labelDe: string }>;
  deviatedConditions: Array<{ code: string; titleDe: string; deviationId: string }>;
};

/** Minimal field shape the gate evaluator needs (own or inherited). */
export type GateField = {
  id: string;
  symbol: string;
  labelDe: string;
  dataType: string;
  isRequired: boolean;
};

/** An inherited field carries the producing worksheet's code for attribution.
 * It keeps the ORIGIN field's `id` — the id its project_parameters row is
 * keyed by — so its saved value resolves with no extra plumbing. */
export type GateInheritedField = GateField & { originWorksheetCode: string };

/** Saved-parameter shape the gate reads. Mirrors the value columns on
 * project_parameters; extra columns on a real row are ignored. */
export type GateParam = {
  fieldId: string;
  valueNumber?: number | string | null;
  valueText?: string | null;
  valueEnum?: string | null;
  valueDate?: string | Date | null;
  valueBoolean?: boolean | null;
  valueJson?: unknown;
};

export type GateBlockRequirement = { code: string; titleDe: string; condition: string };

/**
 * Pure gate evaluation — the SINGLE place that decides which symbols the gate
 * can see and replays each block-severity condition against them.
 *
 * Visibility = the worksheet's OWN fields PLUS fields inherited from upstream
 * consumer-worksheets, merged via `mergeInheritedFields` (own wins on symbol
 * collision; an inherited-vs-inherited collision is dropped → fail-loud). This
 * is the same merge the worksheet page/panel use, so the gate and the panel
 * resolve the same symbol set instead of diverging.
 *
 * Note (shared-resolution): the panel evaluates client-side against the
 * worksheet-store values while this runs server-side against
 * project_parameters, so they remain two evaluators. What is now unified is
 * the *visibility* rule (own + inherited via `mergeInheritedFields`) and the
 * presence-sentinel handling for json carriers. A fuller convergence — one
 * lookup builder both call — is possible but out of scope here; keeping the
 * merge as the single source of truth for "what can this worksheet see"
 * prevents the own-only-vs-inherited class of divergence from recurring.
 *
 * SCOPE — refuses approval when EITHER:
 *   1. Any block-severity condition evaluates to a definite `fail`.
 *   2. Any of the worksheet's OWN active is_required fields has no saved value.
 *      (Required-ness of an inherited field is the origin worksheet's gate
 *      concern, not this one's, so it is not re-checked here.)
 */
export function resolveApprovalGate(
  ownFields: GateField[],
  inheritedFields: GateInheritedField[],
  params: GateParam[],
  blockRequirements: GateBlockRequirement[],
): ApprovalGateResult {
  // Single visibility resolution: own + inherited, own wins, ambiguous dropped.
  const { fields: mergedFields } = mergeInheritedFields(ownFields, inheritedFields);

  const paramByFieldId = new Map(params.map((p) => [p.fieldId, p]));

  // Build the symbol → value lookup over the FULL resolved field set, the same
  // way the form's ComplianceBlock does (json carriers map to a presence
  // sentinel: existence checks pass; arithmetic against a literal fails loud).
  type Val = number | string | boolean | null;
  const bySymbol = new Map<string, Val>();
  for (const f of mergedFields) {
    const p = paramByFieldId.get(f.id);
    if (!p) continue;
    switch (f.dataType) {
      case 'number':
        if (p.valueNumber != null) bySymbol.set(f.symbol, Number(p.valueNumber));
        break;
      case 'text':
        if (p.valueText != null) bySymbol.set(f.symbol, p.valueText);
        break;
      case 'enum':
        if (p.valueEnum != null) bySymbol.set(f.symbol, p.valueEnum);
        break;
      case 'boolean':
        if (p.valueBoolean != null) bySymbol.set(f.symbol, p.valueBoolean);
        break;
      case 'date':
        if (p.valueDate != null) bySymbol.set(f.symbol, p.valueDate as unknown as Val);
        break;
      case 'json':
        if (p.valueJson != null) bySymbol.set(f.symbol, '__present__');
        break;
    }
  }
  const lookup = (s: string): Val | undefined => bySymbol.get(s);

  // Missing required-field check — OWN fields only.
  const missingRequiredFields: ApprovalGateResult['missingRequiredFields'] = [];
  for (const f of ownFields) {
    if (!f.isRequired) continue;
    const p = paramByFieldId.get(f.id);
    let hasValue = false;
    if (p) {
      switch (f.dataType) {
        case 'number': hasValue = p.valueNumber != null; break;
        case 'text': hasValue = p.valueText != null && p.valueText !== ''; break;
        case 'enum': hasValue = p.valueEnum != null && p.valueEnum !== ''; break;
        case 'boolean': hasValue = p.valueBoolean != null; break;
        case 'date': hasValue = p.valueDate != null; break;
        case 'json': hasValue = p.valueJson != null; break;
      }
    }
    if (!hasValue) missingRequiredFields.push({ symbol: f.symbol, labelDe: f.labelDe });
  }

  // Block-severity compliance check. Only definite `fail` blocks; pass /
  // pending / manual do not.
  const failingBlockConditions: ApprovalGateResult['failingBlockConditions'] = [];
  for (const r of blockRequirements) {
    const result = evaluateCondition(r.condition, lookup);
    if (result.kind === 'fail') {
      failingBlockConditions.push({ code: r.code, titleDe: r.titleDe, condition: r.condition });
    }
  }

  const ok = failingBlockConditions.length === 0 && missingRequiredFields.length === 0;
  return { ok, failingBlockConditions, missingRequiredFields, deviatedConditions: [] };
}

/**
 * Re-validate a worksheet instance against its compliance + required-field
 * invariants. Used as the gate on the `engineer_approve` state-machine
 * transition: the transition is refused when this returns ok=false.
 *
 * Loads the instance's own active fields, the fields inherited from upstream
 * consumer-worksheets (via `loadInheritedFields` — the same path the worksheet
 * page uses), the project's saved parameters for that combined field set, and
 * the block-severity compliance rows, then delegates to `resolveApprovalGate`.
 */
export async function checkApprovalGate(
  instanceId: string,
): Promise<ApprovalGateResult> {
  // Resolve the instance + its template's code/standard (needed to look up
  // inherited fields the same way the worksheet page does).
  const [instance] = await db
    .select({
      projectId: worksheetInstances.projectId,
      worksheetTemplateId: worksheetInstances.worksheetTemplateId,
      worksheetCode: worksheetTemplates.code,
      standardId: worksheetTemplates.standardId,
    })
    .from(worksheetInstances)
    .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
    .where(eq(worksheetInstances.id, instanceId))
    .limit(1);
  if (!instance) {
    return {
      ok: false,
      failingBlockConditions: [],
      missingRequiredFields: [{ symbol: '__instance__', labelDe: 'Worksheet not found' }],
      deviatedConditions: [],
    };
  }

  // Own active fields.
  const ownFields = await db
    .select({
      id: fields.id,
      symbol: fields.symbol,
      labelDe: fields.labelDe,
      dataType: fields.dataType,
      isRequired: fields.isRequired,
    })
    .from(fields)
    .where(
      and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)),
    );

  // Inherited fields from upstream worksheets that declared this one as a
  // consumer — same resolution the worksheet page/panel use. Each keeps the
  // origin field's id, so its saved value is read from the origin's row.
  const inheritedRaw = await loadInheritedFields(
    instance.worksheetTemplateId,
    instance.standardId,
    instance.worksheetCode,
  );
  const inheritedFields: GateInheritedField[] = inheritedRaw.map((f) => ({
    id: f.id,
    symbol: f.symbol,
    labelDe: f.labelDe,
    dataType: f.dataType,
    isRequired: f.isRequired,
    originWorksheetCode: f.originWorksheetCode,
  }));

  // Saved parameters for the combined (own + inherited) field set.
  const fieldIds = Array.from(
    new Set([...ownFields.map((f) => f.id), ...inheritedFields.map((f) => f.id)]),
  );
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

  // Block-severity compliance rows for this worksheet.
  const blockRequirements = await db
    .select({
      code: complianceRequirements.code,
      titleDe: complianceRequirements.titleDe,
      condition: complianceRequirements.condition,
    })
    .from(complianceRequirements)
    .where(
      and(
        eq(complianceRequirements.worksheetTemplateId, instance.worksheetTemplateId),
        eq(complianceRequirements.severity, 'block'),
      ),
    );

  const pure = resolveApprovalGate(ownFields, inheritedFields, params, blockRequirements);
  const deviations = await loadActiveDeviations(instance.projectId);
  return applyDeviations(pure, deviations.map((d) => ({ requirementCode: d.requirementCode, deviationId: d.id })));
}

export type ActiveDeviationRef = { requirementCode: string; deviationId: string };

/** Pure: subtract deviated requirements from the failing set. A failing block
 * condition whose code has an active deviation moves into `deviatedConditions`
 * and no longer blocks. Missing-required-field arm is untouched. */
export function applyDeviations(
  result: Omit<ApprovalGateResult, 'deviatedConditions' | 'ok'> & { ok?: boolean },
  deviations: ActiveDeviationRef[],
): ApprovalGateResult {
  const byCode = new Map(deviations.map((d) => [d.requirementCode, d.deviationId]));
  const failing: ApprovalGateResult['failingBlockConditions'] = [];
  const deviated: ApprovalGateResult['deviatedConditions'] = [];
  for (const c of result.failingBlockConditions) {
    const id = byCode.get(c.code);
    if (id) deviated.push({ code: c.code, titleDe: c.titleDe, deviationId: id });
    else failing.push(c);
  }
  const ok = failing.length === 0 && result.missingRequiredFields.length === 0;
  return { ok, failingBlockConditions: failing, deviatedConditions: deviated, missingRequiredFields: result.missingRequiredFields };
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
