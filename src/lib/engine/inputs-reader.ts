/**
 * PLAN 6 REATTACHMENT PENDING.
 *
 * Originally read inputs + citation sources from calculations.inputs JSONB.
 * Plan 6 retargets to project_parameters rows (one per field_id, with
 * citation_source as a sibling column).
 */

export type FieldValue =
  | number
  | string
  | boolean
  | null
  | { value: unknown; source?: { docId: string; page?: number; note?: string } };

// Legacy type used by source-badge.tsx — kept for compile compat.
export type InputSource = { docId: string; page?: number } | { label: string };

export async function readInputsWithSources(
  _calcId: string,
): Promise<Record<string, FieldValue>> {
  throw new Error('Inputs reader pending Plan 6 reattachment to new schema');
}
