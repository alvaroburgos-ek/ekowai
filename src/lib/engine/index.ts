import type { Worksheet, EvaluationResult } from './types';
import { validate } from './validate';
import { evaluate } from './evaluate';
import { evaluateCompliance } from './compliance';

export { evaluate, validate, evaluateCompliance };
export type {
  Worksheet,
  WorksheetSection,
  InputField,
  ComputedField,
  ComplianceThreshold,
  ComplianceViolation,
  ComplianceStatus,
  ExpressionAst,
  InputValues,
  ComputedValues,
  EvaluationResult,
  FieldValue,
  FieldType,
  SelectOption,
  DecisionPoint,
  DecisionOption,
  WorksheetStatus,
  DerivedFrom,
} from './types';
export { parseWorksheet, WorksheetSchema } from './schema';
export { openDecisionPoints, evalCondition } from './decisions';

export function compute(
  worksheet: Worksheet,
  inputs: Record<string, unknown>,
): EvaluationResult & {
  validationErrors: Record<string, string>;
} {
  const { errors: validationErrors } = validate(worksheet, inputs);
  const { computed, errors: evalErrors } = evaluate(worksheet, inputs);
  const compliance = evaluateCompliance(worksheet, computed, inputs);

  return {
    computed,
    compliance,
    errors: evalErrors,
    validationErrors,
  };
}
