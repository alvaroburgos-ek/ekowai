// Worksheet JSON contract — produced by EKOWAI-Agent, consumed by the engine.
// Version identifies the contract shape. Worksheet `id` is regulation-specific.

export type WorksheetVersion = '1.0';

export type FieldType = 'number' | 'select' | 'text' | 'boolean';

export interface SelectOption {
  value: string;
  labelDe: string;
  labelEn: string;
}

export interface DerivedFrom {
  /** Upstream worksheet ID (e.g. 'A201-04'). */
  worksheetId: string;
  /** Parameter name as declared in the EKOWAI inputs_from / outputs_to map. */
  parameter: string;
}

export interface InputField {
  id: string;
  type: FieldType;
  labelDe: string;
  labelEn: string;
  unit?: string;
  citation: string;
  helpDe?: string;
  helpEn?: string;
  min?: number;
  max?: number;
  options?: SelectOption[];
  defaultValue?: number | string | boolean;
  /**
   * If set, this field's value is sourced from another worksheet's calc in
   * the same project. UI renders read-only with a source annotation; engine
   * receives the resolved value at save time. Falls back to free input if
   * no upstream calc exists.
   */
  derivedFrom?: DerivedFrom;
}

export type ExpressionAst =
  | { kind: 'lit'; value: number }
  | { kind: 'ref'; id: string }
  | { kind: 'op'; op: '+' | '-' | '*' | '/'; lhs: ExpressionAst; rhs: ExpressionAst }
  | { kind: 'fn'; fn: 'min' | 'max' | 'round' | 'ceil' | 'floor'; args: ExpressionAst[] }
  | { kind: 'cond'; if: ExpressionAst; then: ExpressionAst; else: ExpressionAst }
  | {
      kind: 'cmp';
      op: '<' | '<=' | '>' | '>=' | '==' | '!=';
      lhs: ExpressionAst;
      rhs: ExpressionAst;
    };

export interface ComputedField {
  id: string;
  labelDe: string;
  labelEn: string;
  unit?: string;
  citation: string;
  expression: ExpressionAst;
  precision?: number;
}

export interface DecisionOption {
  value: string;
  labelDe: string;
  labelEn: string;
}

export interface DecisionPoint {
  id: string;
  labelDe: string;
  labelEn: string;
  promptDe: string;
  promptEn: string;
  citation: string;
  options: DecisionOption[];
  triggerWhen?: ExpressionAst;
}

export interface ComplianceThreshold {
  id: string;
  ref: string;
  rule: { kind: 'lte' | 'gte' | 'eq'; value: number };
  severity: 'warning' | 'blocking';
  messageDe: string;
  messageEn: string;
  citation: string;
  /**
   * Action prompt shown when the threshold is violated — pulled from the
   * regulation brief's "Iteration loop" / "If FAILS" entries.
   * Tells the engineer what to adjust to comply.
   */
  iterationHint?: string;
}

export interface WorksheetSection {
  id: string;
  titleDe: string;
  titleEn: string;
  fields: string[];
}

export type WorksheetStatus = 'verified' | 'preview';

export interface Worksheet {
  contractVersion: WorksheetVersion;
  regulation: string;
  regulationVersion: string;
  id: string;
  titleDe: string;
  titleEn: string;
  sourceCitation: string;
  /**
   * 'verified' — content has been canonically validated against the regulation
   *              (typically by the EKOWAI-Agent Python extractor + a domain
   *              engineer's review).
   * 'preview'  — hand-authored or extractor-output that has NOT yet been
   *              validated. UI shows a "Vorschau" tag; engineers should
   *              treat results as advisory.
   */
  status: WorksheetStatus;
  inputs: InputField[];
  computed: ComputedField[];
  thresholds: ComplianceThreshold[];
  sections: WorksheetSection[];
  decisionPoints: DecisionPoint[];
}

export type FieldValue = number | string | boolean | null;
export type InputValues = Record<string, FieldValue>;
export type ComputedValues = Record<string, number>;

export interface ComplianceViolation {
  thresholdId: string;
  severity: 'warning' | 'blocking';
  messageDe: string;
  messageEn: string;
  observed: number;
}

export type ComplianceStatus = 'compliant' | 'warning' | 'blocking_violation' | 'unknown';

export interface EvaluationResult {
  computed: ComputedValues;
  compliance: { status: ComplianceStatus; violations: ComplianceViolation[] };
  errors: string[];
}
