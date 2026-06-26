import 'server-only';
import { db } from '@/lib/db';
import {
  fields,
  complianceRequirements,
  projectParameters,
  worksheetInstances,
} from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { evaluateCondition, jsonConditionValue } from '@/lib/compliance/evaluate';

/**
 * Result of the engineer-approve readiness check. The transition is
 * refused when either list is non-empty.
 */
export type ApprovalGateResult = {
  ok: boolean;
  failingBlockConditions: Array<{ code: string; titleDe: string; condition: string }>;
  missingRequiredFields: Array<{ symbol: string; labelDe: string }>;
};

export type GateValue = number | string | boolean | null;

/** Extract the typed value from a project_parameters row for a field's data type. */
function extractValue(
  dataType: string,
  p: {
    valueNumber: unknown; valueText: string | null; valueEnum: string | null;
    valueBoolean: boolean | null; valueDate: string | null; valueJson: unknown;
  },
): GateValue | undefined {
  switch (dataType) {
    case 'number': return p.valueNumber != null ? Number(p.valueNumber) : undefined;
    case 'text': return p.valueText != null ? p.valueText : undefined;
    case 'enum': return p.valueEnum != null ? p.valueEnum : undefined;
    case 'boolean': return p.valueBoolean != null ? p.valueBoolean : undefined;
    case 'date': return p.valueDate != null ? p.valueDate : undefined;
    // JSON carriers: presence marker so `symbol IS NOT NULL`/`IS NOT EMPTY`
    // gates work (a populated carrier ⇒ 'present'; empty/null ⇒ undefined).
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
 * Build the project-wide fallback map for symbols that are NOT fields on the
 * gate's own worksheet. A symbol is included only when every saved occurrence
 * across the project agrees; conflicting values are omitted (→ the gate stays
 * `pending`, never producing a wrong verdict from an ambiguous selector).
 */
export function buildFallbackValues(entries: Array<{ symbol: string; value: GateValue }>): Map<string, GateValue> {
  const seen = new Map<string, GateValue>();
  const conflict = new Set<string>();
  for (const e of entries) {
    if (conflict.has(e.symbol)) continue;
    if (!seen.has(e.symbol)) seen.set(e.symbol, e.value);
    else if (!gateValueEq(seen.get(e.symbol) as GateValue, e.value)) { conflict.add(e.symbol); seen.delete(e.symbol); }
  }
  return seen;
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
    })
    .from(worksheetInstances)
    .where(eq(worksheetInstances.id, instanceId))
    .limit(1);
  if (!instance) {
    return {
      ok: false,
      failingBlockConditions: [],
      missingRequiredFields: [{ symbol: '__instance__', labelDe: 'Worksheet not found' }],
    };
  }

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
    })
    .from(fields)
    .where(
      and(eq(fields.worksheetTemplateId, instance.worksheetTemplateId), eq(fields.active, true)),
    );

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
  const projInstances = await db
    .select({ wtid: worksheetInstances.worksheetTemplateId })
    .from(worksheetInstances)
    .where(eq(worksheetInstances.projectId, instance.projectId));
  const projWtids = [...new Set(projInstances.map((r) => r.wtid))];
  const projFields = projWtids.length === 0
    ? []
    : await db
      .select({ id: fields.id, symbol: fields.symbol, dataType: fields.dataType })
      .from(fields)
      .where(and(inArray(fields.worksheetTemplateId, projWtids), eq(fields.active, true)));
  const projFieldIds = projFields.map((f) => f.id);
  const projParams = projFieldIds.length === 0
    ? []
    : await db
      .select()
      .from(projectParameters)
      .where(
        and(
          eq(projectParameters.projectId, instance.projectId),
          inArray(projectParameters.fieldId, projFieldIds),
        ),
      );
  const projParamByFieldId = new Map(projParams.map((p) => [p.fieldId, p]));
  const fallbackEntries: Array<{ symbol: string; value: GateValue }> = [];
  for (const f of projFields) {
    const p = projParamByFieldId.get(f.id);
    if (!p) continue;
    const v = extractValue(f.dataType, p);
    if (v !== undefined) fallbackEntries.push({ symbol: f.symbol, value: v });
  }
  const fallback = buildFallbackValues(fallbackEntries);

  const lookup = makeGateLookup(localSymbols, bySymbol, fallback);

  // Missing required-field check: a field with is_required=true must
  // have a non-null value of its declared type. JSON fields are
  // satisfied when valueJson is non-null.
  const missingRequiredFields: Array<{ symbol: string; labelDe: string }> = [];
  for (const f of tmplFields) {
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
    })
    .from(complianceRequirements)
    .where(
      and(
        eq(complianceRequirements.worksheetTemplateId, instance.worksheetTemplateId),
        eq(complianceRequirements.severity, 'block'),
      ),
    );

  const failingBlockConditions: ApprovalGateResult['failingBlockConditions'] = [];
  for (const r of rows) {
    const result = evaluateCondition(r.condition, lookup);
    if (result.kind === 'fail') {
      failingBlockConditions.push({
        code: r.code,
        titleDe: r.titleDe,
        condition: r.condition,
      });
    }
  }

  const ok = failingBlockConditions.length === 0 && missingRequiredFields.length === 0;
  return { ok, failingBlockConditions, missingRequiredFields };
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
