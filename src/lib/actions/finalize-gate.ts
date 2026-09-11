import 'server-only';
import { db } from '@/lib/db';
import {
  fields,
  projectParameters,
  worksheetInstances,
} from '@/lib/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { projects } from '@/lib/db/schema';
import { resolveFromSiteProfile } from '@/lib/site-profile/symbol-map';

/**
 * Stage-1 verification blocking rule (SR-1, roadmap tracker):
 * a worksheet cannot be FINALIZED while it uses fields whose definition has
 * not been verified against the printed standard. "Uses" = the field is
 * required OR carries a saved value. Approve/submit are NOT gated here
 * (owner decision 2026-08-01: finalize only).
 */

/** Verification statuses that satisfy the finalize rule (shared pure module). */
export { VERIFIED_OK } from '@/lib/verification-status';
import { blocksVerificationGate } from '@/lib/verification-status';

export type FinalizeGateResult = {
  ok: boolean;
  unverifiedFields: Array<{ symbol: string; labelDe: string; verificationStatus: string }>;
};

export type FinalizeGateRow = {
  symbol: string;
  labelDe: string;
  isRequired: boolean;
  verificationStatus: string;
  hasValue: boolean;
};

/** Pure decision core — unit-tested without a DB. */
export function decideFinalizeGate(rows: FinalizeGateRow[]): FinalizeGateResult {
  const unverifiedFields = rows
    .filter((r) => (r.isRequired || r.hasValue) && blocksVerificationGate(r.verificationStatus))
    .map((r) => ({
      symbol: r.symbol,
      labelDe: r.labelDe,
      verificationStatus: r.verificationStatus,
    }));
  return { ok: unverifiedFields.length === 0, unverifiedFields };
}

/** Presence check per data type — mirrors the approval gate's required-field check. */
function paramHasValue(
  dataType: string,
  p: {
    valueNumber: unknown; valueText: string | null; valueEnum: string | null;
    valueBoolean: boolean | null; valueDate: string | null; valueJson: unknown;
  },
): boolean {
  switch (dataType) {
    case 'number': return p.valueNumber != null;
    case 'text': return p.valueText != null && p.valueText !== '';
    case 'enum': return p.valueEnum != null && p.valueEnum !== '';
    case 'boolean': return p.valueBoolean != null;
    case 'date': return p.valueDate != null;
    case 'json': return p.valueJson != null;
    default: return false;
  }
}

/** DB-bound loader: assemble the instance's field rows and decide. */
export async function checkFinalizeGate(instanceId: string): Promise<FinalizeGateResult> {
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
      unverifiedFields: [
        { symbol: '__instance__', labelDe: 'Worksheet not found', verificationStatus: 'missing' },
      ],
    };
  }

  const tmplFields = await db
    .select({
      id: fields.id,
      symbol: fields.symbol,
      labelDe: fields.labelDe,
      dataType: fields.dataType,
      isRequired: fields.isRequired,
      verificationStatus: fields.verificationStatus,
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

  // Site-profile-resolved values count as "used" too (review finding #4):
  // a value flowing in from the site profile drives gates/equations exactly
  // like an entered one, so it must not escape the Stage-1 rule — this keeps
  // the gate's list identical to the dossier's SR-1 box.
  const [proj] = await db
    .select({ siteProfile: projects.siteProfile })
    .from(projects)
    .where(eq(projects.id, instance.projectId))
    .limit(1);
  const siteProfile = proj?.siteProfile ?? null;

  return decideFinalizeGate(
    tmplFields.map((f) => {
      const p = paramByFieldId.get(f.id);
      const fromSite = resolveFromSiteProfile(siteProfile, f.symbol);
      return {
        symbol: f.symbol,
        labelDe: f.labelDe,
        isRequired: f.isRequired ?? false,
        verificationStatus: f.verificationStatus,
        hasValue: (p ? paramHasValue(f.dataType, p) : false) || fromSite?.value != null,
      };
    }),
  );
}

/** Format the gate result as a single error string for transition refusal. */
export function formatFinalizeGateError(result: FinalizeGateResult): string {
  const list = result.unverifiedFields
    .map((f) => `${f.labelDe} (${f.symbol})`)
    .join(', ');
  return (
    'Finalisierung abgelehnt — unverifizierte Felder (SR-1): '
    + list
    + '. Felddefinitionen gegen die Norm verifizieren (Verbatim-Zitat), dann erneut finalisieren.'
  );
}
