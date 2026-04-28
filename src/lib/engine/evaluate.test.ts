import { describe, it, expect } from 'vitest';
import { evaluate } from './evaluate';
import { A201_08 } from '@/lib/worksheets/DWA-A-201/v3.2';
import type { Worksheet, InputValues, ExpressionAst } from './types';

const tinyWorksheet = (computed: { id: string; expression: ExpressionAst }[]): Worksheet => ({
  contractVersion: '1.0',
  regulation: 'TEST',
  regulationVersion: 'v0',
  id: 'TEST',
  titleDe: 't',
  titleEn: 't',
  sourceCitation: '',
  inputs: [{ id: 'a', type: 'number', labelDe: '', labelEn: '', citation: '' }],
  computed: computed.map((c) => ({
    ...c,
    labelDe: '',
    labelEn: '',
    citation: '',
  })),
  thresholds: [],
  sections: [{ id: 's', titleDe: '', titleEn: '', fields: ['a'] }],
  decisionPoints: [],
  status: 'preview',
});

describe('evaluate', () => {
  it('resolves a literal', () => {
    const w = tinyWorksheet([{ id: 'x', expression: { kind: 'lit', value: 42 } }]);
    expect(evaluate(w, {}).computed.x).toBe(42);
  });

  it('resolves an input ref', () => {
    const w = tinyWorksheet([{ id: 'x', expression: { kind: 'ref', id: 'a' } }]);
    expect(evaluate(w, { a: 7 }).computed.x).toBe(7);
  });

  it('resolves arithmetic ops', () => {
    const w = tinyWorksheet([
      {
        id: 'x',
        expression: {
          kind: 'op',
          op: '*',
          lhs: { kind: 'ref', id: 'a' },
          rhs: { kind: 'lit', value: 3 },
        },
      },
    ]);
    expect(evaluate(w, { a: 4 }).computed.x).toBe(12);
  });

  it('handles fn min/max/round/ceil/floor', () => {
    const fnExpr = (fn: 'min' | 'max', n: number): ExpressionAst => ({
      kind: 'fn',
      fn,
      args: [
        { kind: 'lit', value: n },
        { kind: 'lit', value: 5 },
      ],
    });
    const w = tinyWorksheet([
      { id: 'mn', expression: fnExpr('min', 3) },
      { id: 'mx', expression: fnExpr('max', 3) },
      { id: 'rd', expression: { kind: 'fn', fn: 'round', args: [{ kind: 'lit', value: 2.6 }] } },
      { id: 'cl', expression: { kind: 'fn', fn: 'ceil', args: [{ kind: 'lit', value: 2.1 }] } },
      { id: 'fl', expression: { kind: 'fn', fn: 'floor', args: [{ kind: 'lit', value: 2.9 }] } },
    ]);
    const r = evaluate(w, {}).computed;
    expect(r).toEqual({ mn: 3, mx: 5, rd: 3, cl: 3, fl: 2 });
  });

  it('handles cond and cmp for all comparison ops', () => {
    const w = tinyWorksheet([
      {
        id: 'lt',
        expression: {
          kind: 'cond',
          if: {
            kind: 'cmp',
            op: '<',
            lhs: { kind: 'ref', id: 'a' },
            rhs: { kind: 'lit', value: 10 },
          },
          then: { kind: 'lit', value: 1 },
          else: { kind: 'lit', value: 2 },
        },
      },
      {
        id: 'lte',
        expression: {
          kind: 'cmp',
          op: '<=',
          lhs: { kind: 'lit', value: 5 },
          rhs: { kind: 'lit', value: 5 },
        },
      },
      {
        id: 'gt',
        expression: {
          kind: 'cmp',
          op: '>',
          lhs: { kind: 'lit', value: 6 },
          rhs: { kind: 'lit', value: 5 },
        },
      },
      {
        id: 'gte',
        expression: {
          kind: 'cmp',
          op: '>=',
          lhs: { kind: 'lit', value: 5 },
          rhs: { kind: 'lit', value: 5 },
        },
      },
      {
        id: 'eq',
        expression: {
          kind: 'cmp',
          op: '==',
          lhs: { kind: 'lit', value: 5 },
          rhs: { kind: 'lit', value: 5 },
        },
      },
      {
        id: 'neq',
        expression: {
          kind: 'cmp',
          op: '!=',
          lhs: { kind: 'lit', value: 5 },
          rhs: { kind: 'lit', value: 5 },
        },
      },
      {
        id: 'sub',
        expression: {
          kind: 'op',
          op: '-',
          lhs: { kind: 'lit', value: 10 },
          rhs: { kind: 'lit', value: 3 },
        },
      },
      {
        id: 'add',
        expression: {
          kind: 'op',
          op: '+',
          lhs: { kind: 'lit', value: 1 },
          rhs: { kind: 'lit', value: 2 },
        },
      },
    ]);
    const r = evaluate(w, { a: 5 }).computed;
    expect(r).toEqual({ lt: 1, lte: 1, gt: 1, gte: 1, eq: 1, neq: 0, sub: 7, add: 3 });
    const r2 = evaluate(w, { a: 15 }).computed;
    expect(r2.lt).toBe(2);
  });

  it('resolves chained computed dependencies', () => {
    const w = tinyWorksheet([
      {
        id: 'x',
        expression: {
          kind: 'op',
          op: '+',
          lhs: { kind: 'ref', id: 'a' },
          rhs: { kind: 'lit', value: 1 },
        },
      },
      {
        id: 'y',
        expression: {
          kind: 'op',
          op: '*',
          lhs: { kind: 'ref', id: 'x' },
          rhs: { kind: 'lit', value: 2 },
        },
      },
    ]);
    const r = evaluate(w, { a: 3 }).computed;
    expect(r).toEqual({ x: 4, y: 8 });
  });

  it('returns NaN + error on division by zero', () => {
    const w = tinyWorksheet([
      {
        id: 'x',
        expression: {
          kind: 'op',
          op: '/',
          lhs: { kind: 'lit', value: 1 },
          rhs: { kind: 'lit', value: 0 },
        },
      },
    ]);
    const r = evaluate(w, {});
    expect(r.computed.x).toBeNaN();
    expect(r.errors).toContain('division by zero in computed "x"');
  });

  it('returns NaN + error on unresolvable ref', () => {
    const w = tinyWorksheet([{ id: 'x', expression: { kind: 'ref', id: 'missing' } }]);
    const r = evaluate(w, {});
    expect(r.computed.x).toBeNaN();
    expect(r.errors).toContain('unresolved reference "missing" in computed "x"');
  });

  it('coerces boolean inputs to 0/1', () => {
    const w = tinyWorksheet([{ id: 'x', expression: { kind: 'ref', id: 'a' } }]);
    expect(evaluate(w, { a: true }).computed.x).toBe(1);
    expect(evaluate(w, { a: false }).computed.x).toBe(0);
  });

  it('end-to-end: A201-08 with realistic inputs', () => {
    const inputs: InputValues = {
      Q_DW_m3d: 5000,
      BSB5_in_mgL: 300,
      T_C: 12,
      treatment_class: 'N',
    };
    const r = evaluate(A201_08, inputs);
    expect(r.errors).toEqual([]);
    expect(r.computed.BSB5_load_kgd).toBe(1500);
    expect(r.computed.tank_volume_m3).toBe(6000);
  });
});
