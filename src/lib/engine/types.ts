// Worksheet JSON contract — produced by EKOWAI-Agent, consumed by the engine.
// Version identifies the contract shape. Worksheet `id` is regulation-specific.

export type WorksheetVersion = '1.0';

export type FieldType = 'number' | 'select' | 'text' | 'boolean';

export interface SelectOption {
  value: string;
  labelDe: string;
  labelEn: string;
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
