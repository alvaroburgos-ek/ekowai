// src/lib/scenarios/summaries.ts
/** Pure assembly of `ScenarioSummary` from DB rows (spec §2 drift: current real value ≠ base_value_at_creation). */
import { paramToFieldValue, fieldValueEqual } from './values';
import type { ScenarioSummary, ScenarioValue } from './types';

export type ScenarioRow = { id: string; name: string; reason: string | null; sortOrder: number; includeInReport: boolean; archivedAt: Date | null; createdAt: Date };
export type OverrideRow = {
  scenarioId: string; fieldId: string; value: unknown; baseValueAtCreation: unknown; note: string;
  symbol: string; labelDe: string; labelEn: string | null; unit: string | null; dataType: string; worksheetCode: string; standardCode: string;
};
type ParamCols = { valueNumber: unknown; valueText: string | null; valueEnum: string | null; valueBoolean: boolean | null; valueDate: string | null; valueJson: unknown };

export function buildSummaries(rows: readonly ScenarioRow[], overrides: readonly OverrideRow[], params: ReadonlyMap<string, ParamCols>): ScenarioSummary[] {
  return rows.map((r) => ({
    id: r.id, name: r.name, reason: r.reason, slot: r.sortOrder, includeInReport: r.includeInReport,
    archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null, createdAt: r.createdAt.toISOString(),
    overrides: overrides.filter((o) => o.scenarioId === r.id).map((o) => {
      const base = (o.baseValueAtCreation ?? null) as ScenarioValue | null;
      const current = paramToFieldValue(o.dataType, params.get(o.fieldId));
      return {
        fieldId: o.fieldId, symbol: o.symbol, labelDe: o.labelDe, labelEn: o.labelEn, unit: o.unit, dataType: o.dataType,
        worksheetCode: o.worksheetCode, standardCode: o.standardCode, value: o.value as ScenarioValue,
        baseValueAtCreation: base, currentReal: current, drift: !fieldValueEqual(base, current), note: o.note,
      };
    }),
  }));
}
