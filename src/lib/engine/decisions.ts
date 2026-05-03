import type {
  Worksheet,
  DecisionPoint,
  ExpressionAst,
  ComputedValues,
  FieldValue,
} from './types';
import { normalizeInputs, type InputRaw } from './inputs-reader';

function asNumber(v: FieldValue): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return Number.NaN;
}

export function evalCondition(
  expr: ExpressionAst,
  values: Record<string, FieldValue>,
): number {
  switch (expr.kind) {
    case 'lit':
      return expr.value;
    case 'ref':
      return expr.id in values ? asNumber(values[expr.id]) : Number.NaN;
    case 'op': {
      const a = evalCondition(expr.lhs, values);
      const b = evalCondition(expr.rhs, values);
      switch (expr.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return b === 0 ? Number.NaN : a / b;
      }
      return Number.NaN;
    }
    case 'fn': {
      const args = expr.args.map((a) => evalCondition(a, values));
      switch (expr.fn) {
        case 'min':
          return Math.min(...args);
        case 'max':
          return Math.max(...args);
        case 'round':
          return Math.round(args[0]);
        case 'ceil':
          return Math.ceil(args[0]);
        case 'floor':
          return Math.floor(args[0]);
      }
      return Number.NaN;
    }
    case 'cond':
      return evalCondition(expr.if, values) !== 0
        ? evalCondition(expr.then, values)
        : evalCondition(expr.else, values);
    case 'cmp': {
      const a = evalCondition(expr.lhs, values);
      const b = evalCondition(expr.rhs, values);
      switch (expr.op) {
        case '<':
          return a < b ? 1 : 0;
        case '<=':
          return a <= b ? 1 : 0;
        case '>':
          return a > b ? 1 : 0;
        case '>=':
          return a >= b ? 1 : 0;
        case '==':
          return a === b ? 1 : 0;
        case '!=':
          return a !== b ? 1 : 0;
      }
      return 0;
    }
  }
}

export function openDecisionPoints(
  worksheet: Worksheet,
  inputs: Record<string, unknown>,
  computed: ComputedValues,
  recordedDecisionIds: Set<string>,
): DecisionPoint[] {
  // Tolerant input: accept bare values (legacy) or {value, source} cells (Plan 6).
  const cells = normalizeInputs(inputs as Record<string, InputRaw>);
  const values: Record<string, FieldValue> = {};
  for (const [k, c] of Object.entries(cells)) values[k] = c.value;

  const open: DecisionPoint[] = [];
  const merged: Record<string, FieldValue> = { ...values, ...computed };
  for (const dp of worksheet.decisionPoints) {
    if (recordedDecisionIds.has(dp.id)) continue;
    if (dp.triggerWhen !== undefined) {
      const v = evalCondition(dp.triggerWhen, merged);
      if (!v) continue;
    }
    open.push(dp);
  }
  return open;
}
