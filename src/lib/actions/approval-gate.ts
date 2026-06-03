import 'server-only';
import { db } from '@/lib/db';
import {
  fields,
  complianceRequirements,
  projectParameters,
  worksheetInstances,
} from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { evaluateCondition } from '@/lib/compliance/evaluate';

/**
 * Result of the engineer-approve readiness check. The transition is
 * refused when either list is non-empty.
 */
export type ApprovalGateResult = {
  ok: boolean;
  failingBlockConditions: Array<{ code: string; titleDe: string; condition: string }>;
  missingRequiredFields: Array<{ symbol: string; labelDe: string }>;
};

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

  // Build the symbol → value lookup the same way the form's
  // ComplianceBlock does. JSON values are skipped because the
  // condition DSL doesn't read structured carriers (they drive
  // aggregators, which are a separate path).
  type Val = number | string | boolean | null;
  const bySymbol = new Map<string, Val>();
  for (const f of tmplFields) {
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
        if (p.valueDate != null) bySymbol.set(f.symbol, p.valueDate);
        break;
      // 'json' deliberately skipped — DSL doesn't read JSON carriers.
    }
  }
  const lookup = (s: string): Val | undefined => bySymbol.get(s);

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
