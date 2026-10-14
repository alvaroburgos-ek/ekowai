/** What the chain runner reads — the report path's inputs for ONE standard of ONE project (spec §3). */
import type { ReportComplianceRow, ReportEquation, ReportParameter } from '@/lib/eval/evaluate-for-report';
import type { ScenarioValue } from './types';

export type BaselineField = {
  id: string; templateId: string; templateCode: string; symbol: string; labelDe: string; labelEn: string | null;
  unit: string | null; dataType: string; isRequired: boolean; sectionId: string | null; visibleWhen: string | null;
  widget: string | null; uiConfig: unknown; consumerWorksheets: string[] | null;
  enumValues: Array<{ value: string; label_de: string | null; label_en: string | null }> | null;
  validationRules: { min?: number; max?: number; maxLength?: number; extensible?: boolean } | null;
};
export type BaselineSection = { id: string; templateId: string; parentSectionId: string | null; visibleWhen: string | null };
export type BaselineSheet = {
  instanceId: string; templateId: string; code: string; titleDe: string; titleEn: string | null;
  phase: number | null; orderIndex: number; equations: ReportEquation[]; compliance: ReportComplianceRow[];
};
export type StoredParameter = ReportParameter & { sourceType: string };
export type ScenarioBaseline = {
  projectId: string; standardId: string; standardCode: string;
  sheets: BaselineSheet[]; fields: BaselineField[]; sections: BaselineSection[];
  /** Every saved project_parameters row of the standard's fields, keyed by field id. */
  stored: Record<string, StoredParameter>;
};
export type ScenarioOverrideInput = { fieldId: string; value: ScenarioValue };

/** Phase order (spec §3 step 2): phase ASC (nulls last), order_index ASC, code ASC. */
export function sortSheets(sheets: BaselineSheet[]): BaselineSheet[] {
  return [...sheets].sort((a, b) =>
    (a.phase ?? Number.MAX_SAFE_INTEGER) - (b.phase ?? Number.MAX_SAFE_INTEGER)
    || a.orderIndex - b.orderIndex
    || a.code.localeCompare(b.code));
}
