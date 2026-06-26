/**
 * Pure planner for the one-time A138-07 surface-materialization backfill.
 * No DB access — the script wraps this with DB read + write.
 *
 * Single-source: uses `materializeSurfaceOutputs` (which calls `summarizeSurfaces`)
 * to compute the six derived scalars, identical to the server-side save path.
 */
import { materializeSurfaceOutputs } from './materialize-surfaces';

export type BackfillInputRow = {
  projectId: string;
  acFieldId: string;
  cmFieldId: string;
  baFieldId: string;
  nbaFieldId: string;
  sealedFieldId: string;
  unsealedFieldId: string;
  carrier: unknown;
};

export type BackfillOutputRow = {
  projectId: string;
  fieldId: string;
  valueNumber: number | null;
};

/**
 * For each project/carrier pair, materialise the six derived scalars and
 * return a flat array of {projectId, fieldId, valueNumber} rows ready for
 * UPSERT. Null per field when the carrier is empty / not computable.
 */
export function planSurfaceBackfill(rows: BackfillInputRow[]): BackfillOutputRow[] {
  const out: BackfillOutputRow[] = [];
  for (const row of rows) {
    const { projectId, acFieldId, cmFieldId, baFieldId, nbaFieldId, sealedFieldId, unsealedFieldId, carrier } = row;
    const outputs = materializeSurfaceOutputs(carrier);
    out.push({ projectId, fieldId: acFieldId, valueNumber: outputs.A_C });
    out.push({ projectId, fieldId: cmFieldId, valueNumber: outputs.C_m });
    out.push({ projectId, fieldId: baFieldId, valueNumber: outputs.A_E_ba });
    out.push({ projectId, fieldId: nbaFieldId, valueNumber: outputs.A_E_nba });
    out.push({ projectId, fieldId: sealedFieldId, valueNumber: outputs.A_C_sealed });
    out.push({ projectId, fieldId: unsealedFieldId, valueNumber: outputs.A_C_unsealed });
  }
  return out;
}
