/**
 * Pure planner for the one-time A138-07 surface-materialization backfill.
 * No DB access — the script wraps this with DB read + write.
 *
 * Single-source (Plan 2a): uses the generic register materialiser over the six
 * A138-07 register formulas (`A138_07_REGISTER_FORMULAS`) — the SAME path the
 * server-side save takes — so the backfill can never diverge from a live save.
 */
import { materializeDerivedOutputs } from './materialize-derived';
import { A138_07_REGISTER_FORMULAS } from './rewrites';

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

const CARRIER_FIELD_ID = '__surface_inventory__';
const A138_07_EQUATIONS = Object.entries(A138_07_REGISTER_FORMULAS).map(([id, r]) => ({
  id, equationNumber: r.outputSymbol, formula: r.formula, inputSymbols: ['surface_inventory'], outputSymbol: r.outputSymbol,
}));

/**
 * For each project/carrier pair, materialise the six derived scalars and
 * return a flat array of {projectId, fieldId, valueNumber} rows ready for
 * UPSERT. Null per field when the carrier is empty / not computable.
 */
export function planSurfaceBackfill(rows: BackfillInputRow[]): BackfillOutputRow[] {
  const out: BackfillOutputRow[] = [];
  for (const row of rows) {
    const { projectId, acFieldId, cmFieldId, baFieldId, nbaFieldId, sealedFieldId, unsealedFieldId, carrier } = row;
    const fieldIdBySymbol: Record<string, string> = {
      A_C: acFieldId, C_m: cmFieldId, A_E_ba: baFieldId, A_E_nba: nbaFieldId, A_C_sealed: sealedFieldId, A_C_unsealed: unsealedFieldId,
    };
    const fields = [
      { id: CARRIER_FIELD_ID, symbol: 'surface_inventory', dataType: 'json', unit: null },
      ...Object.entries(fieldIdBySymbol).map(([symbol, id]) => ({ id, symbol, dataType: 'number', unit: null })),
    ];
    const { writes } = materializeDerivedOutputs({
      standardCode: 'DWA-A-138-1',
      worksheetCode: 'A138-07',
      equations: A138_07_EQUATIONS,
      fields,
      valuesByFieldId: { [CARRIER_FIELD_ID]: { type: 'json', value: carrier } },
    });
    const valueBySymbol = new Map(writes.map((w) => [w.symbol, w.value]));
    for (const [symbol, fieldId] of Object.entries(fieldIdBySymbol)) {
      out.push({ projectId, fieldId, valueNumber: valueBySymbol.get(symbol) ?? null });
    }
  }
  return out;
}
