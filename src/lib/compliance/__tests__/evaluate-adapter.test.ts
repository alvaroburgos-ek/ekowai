// src/lib/compliance/__tests__/evaluate-adapter.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateCondition, extractConditionSymbols, parseCondition, evaluateNode } from '../evaluate';
import { evalExpression, SUPPORTED_FUNCTIONS } from '@/lib/eval/arithmetic';

describe('compliance/evaluate.ts is a thin adapter over src/lib/expr', () => {
  it('keeps the 4 legacy kinds and adds not_applicable via opts', () => {
    const lookup = (s: string) => ({ a: 1 } as Record<string, number>)[s];
    expect(evaluateCondition('a >= 1', lookup)).toEqual({ kind: 'pass' });
    expect(evaluateCondition('a >= 1', lookup, { hiddenSymbols: new Set(['a']) })).toEqual({ kind: 'not_applicable', hiddenSymbols: ['a'] });
  });
  it('extractConditionSymbols still returns null for prose and excludes enum literals', () => {
    expect(extractConditionSymbols('Engineer attestation')).toBeNull();
    expect([...extractConditionSymbols('investment_type IN {ersatz, erneuerung}')!]).toEqual(['investment_type']);
  });
  it('evaluateNode reuses the same AST', () => {
    const n = parseCondition('x == 1')!;
    expect(evaluateNode(n, () => 1)).toBe('true');
  });
});

describe('eval/arithmetic.ts is a thin adapter over evalNumber', () => {
  it('field named e wins over the constant; pi falls back', () => {
    expect(evalExpression('e * 2', { e: 3 })).toBe(6);
    expect(evalExpression('pi', {})).toBeCloseTo(Math.PI);
  });
  it('SUPPORTED_FUNCTIONS now includes row/logic names', () => {
    expect(SUPPORTED_FUNCTIONS.has('sqrt')).toBe(true);
    expect(SUPPORTED_FUNCTIONS.has('sum_rows')).toBe(true);
  });
  it('registers reach the evaluator through extra', () => {
    const reg = { rows: [{ id: '1', values: { x: 2 }, complete: true }], flags: {} };
    expect(evalExpression('sum_rows(r, x) + y', { y: 1 }, { registers: { r: reg } })).toBe(3);
  });
});
