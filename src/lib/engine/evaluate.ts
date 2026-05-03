import type {
  Worksheet,
  ComputedValues,
  EvaluationResult,
  ExpressionAst,
  FieldValue,
} from './types';
import { normalizeInputs, type InputRaw } from './inputs-reader';

type Scope = { values: Record<string, FieldValue>; errors: string[]; currentId: string };

function asNumber(v: FieldValue): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return Number.NaN;
}

function evalExpr(expr: ExpressionAst, scope: Scope): number {
  switch (expr.kind) {
    case 'lit':
      return expr.value;
    case 'ref': {
      if (!(expr.id in scope.values)) {
        scope.errors.push(`unresolved reference "${expr.id}" in computed "${scope.currentId}"`);
        return Number.NaN;
      }
      return asNumber(scope.values[expr.id]);
    }
    case 'op': {
      const a = evalExpr(expr.lhs, scope);
      const b = evalExpr(expr.rhs, scope);
      switch (expr.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          if (b === 0) {
            scope.errors.push(`division by zero in computed "${scope.currentId}"`);
            return Number.NaN;
          }
          return a / b;
      }
    }
    // eslint-disable-next-line no-fallthrough
    case 'fn': {
      const args = expr.args.map((a) => evalExpr(a, scope));
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
    }
    // eslint-disable-next-line no-fallthrough
    case 'cond':
      return evalExpr(expr.if, scope) !== 0
        ? evalExpr(expr.then, scope)
        : evalExpr(expr.else, scope);
    case 'cmp': {
      const a = evalExpr(expr.lhs, scope);
      const b = evalExpr(expr.rhs, scope);
      let ok = false;
      switch (expr.op) {
        case '<':
          ok = a < b;
          break;
        case '<=':
          ok = a <= b;
          break;
        case '>':
          ok = a > b;
          break;
        case '>=':
          ok = a >= b;
          break;
        case '==':
          ok = a === b;
          break;
        case '!=':
          ok = a !== b;
          break;
      }
      return ok ? 1 : 0;
    }
  }
}

export function evaluate(
  worksheet: Worksheet,
  inputs: Record<string, unknown>,
): EvaluationResult {
  // Tolerant input: accept bare values (legacy) or {value, source} cells (Plan 6).
  const cells = normalizeInputs(inputs as Record<string, InputRaw>);
  const values: Record<string, FieldValue> = {};
  for (const [k, c] of Object.entries(cells)) values[k] = c.value;

  const scope: Scope = {
    values: { ...values },
    errors: [],
    currentId: '',
  };
  const computed: ComputedValues = {};

  for (const c of worksheet.computed) {
    scope.currentId = c.id;
    const v = evalExpr(c.expression, scope);
    computed[c.id] = v;
    scope.values[c.id] = v;
  }

  return {
    computed,
    compliance: { status: 'unknown', violations: [] },
    errors: scope.errors,
  };
}
