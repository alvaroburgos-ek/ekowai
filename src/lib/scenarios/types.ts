/**
 * What-if cases („Fälle") — shared, serialisable types (server actions ⇄ client components ⇄ MCP).
 * Spec: docs/superpowers/specs/2026-10-14-what-if-cases-design.md
 */
import type { FieldValue } from '@/lib/state/worksheet-store';
import type { EvalState } from '@/lib/eval/formula';
import type { EvalResult } from '@/lib/compliance/evaluate';

export type ScenarioValue = FieldValue;

/** Spec §2: at most 6 active cases per project (plus the implicit „Real"). */
export const MAX_ACTIVE_SCENARIOS = 6;

/** Lowest colour slot (1..6) not held by an active case; null at the limit. */
export function firstFreeSlot(activeSlots: readonly number[]): number | null {
  for (let s = 1; s <= MAX_ACTIVE_SCENARIOS; s++) if (!activeSlots.includes(s)) return s;
  return null;
}

export type OverrideSummary = {
  fieldId: string;
  symbol: string;
  labelDe: string;
  labelEn: string | null;
  unit: string | null;
  dataType: string;
  worksheetCode: string;
  standardCode: string;
  value: ScenarioValue;
  baseValueAtCreation: ScenarioValue | null;
  currentReal: ScenarioValue | null;
  /** Spec §2: current real value ≠ base_value_at_creation ⇒ „Realwert geändert: alt → neu". */
  drift: boolean;
  note: string;
};

export type ScenarioSummary = {
  id: string;
  name: string;
  reason: string | null;
  /** Colour slot 1..6 (= sort_order). */
  slot: number;
  includeInReport: boolean;
  archivedAt: string | null;
  createdAt: string;
  overrides: OverrideSummary[];
};

export type IterationKind = 'gl8' | 'gl10' | 'gl16';
export type IterationPoint = { D: number; r_D: number; value: number };

/** One governing-duration iteration of one equation in one run (spec §3 step 5). */
export type IterationSeries = {
  /** 'A138-13:Gl8' | 'A138-26:Gl10:T30' | 'A138-26:Gl10:T100' | 'A138-17:Gl16' */
  key: string;
  kind: IterationKind;
  worksheetCode: string;
  equationLabel: string;
  outputSymbol: string;
  unit: string;
  /** Return period of the rain column used (a). */
  returnPeriod: number | null;
  /** The scalar inputs substituted at every D (for the step-through). */
  scalars: Record<string, number>;
  perDuration: IterationPoint[];
  governingD: number | null;
  r_D_at_governing: number | null;
  /** Raw maximum (before any floor). */
  governingValue: number | null;
  boundaryLimited: boolean;
  /** Gl. 10: a negative V_Rück is displayed as 0 (§ 5.3.4). */
  floorAtZero: boolean;
};

export type ValueOrigin = 'entered' | 'override' | 'computed' | 'carried';

export type RunCell = {
  worksheetCode: string;
  symbol: string;
  dataType: string;
  value: number | string | boolean | null;
  origin: ValueOrigin;
};

export type SheetRun = {
  code: string;
  equations: Array<{ equationId: string; equationNumber: string; outputSymbol: string | null; state: EvalState }>;
  compliance: Array<{ code: string; titleDe: string; severity: string; result: EvalResult }>;
  hiddenSymbols: string[];
};

export type StoredMismatch = {
  fieldId: string;
  worksheetCode: string;
  symbol: string;
  stored: number | string | boolean | null;
  computed: number | string | boolean | null;
};

export type ScenarioRun = {
  /** 'real' or the scenario id. */
  caseId: string;
  converged: boolean;
  passes: number;
  /** Non-json fields only, keyed by field id. */
  values: Record<string, RunCell>;
  sheets: Record<string, SheetRun>;
  iterations: IterationSeries[];
  /** Real run only: stored derived values that differ from this run (spec §3 step 6). */
  mismatches: StoredMismatch[];
  /** Stored derived values no equation/mirror of A1 recomputes — carried from the record (spec gap G-2). */
  notRecomputed: Array<{ worksheetCode: string; symbol: string }>;
  skippedOverrides: Array<{ fieldId: string; reason: string }>;
};

export type ScenarioResultsPayload = {
  /** false while the staged tables are absent. */
  available: boolean;
  standardCode: string;
  real: ScenarioRun | null;
  cases: Array<{ scenario: ScenarioSummary; run: ScenarioRun }>;
  ignoredScenarioIds: string[];
};

/** A field a case may override (search hit for the case panel / MCP). */
export type OverridableFieldHit = {
  fieldId: string; symbol: string; labelDe: string; labelEn: string | null; unit: string | null; dataType: string;
  enumValues: Array<{ value: string; label_de: string | null; label_en: string | null }> | null;
  worksheetCode: string; standardCode: string; realValue: ScenarioValue | null;
};
