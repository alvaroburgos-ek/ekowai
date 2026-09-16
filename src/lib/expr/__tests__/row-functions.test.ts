import { describe, it, expect } from 'vitest';
import { evalNumber, evalCondition, extractSymbols } from '../evaluate';
import { parseCondition } from '../parser';
import type { Scope, PreparedRegister } from '../scope';

const reg: PreparedRegister = {
  rows: [
    { id: 'a', values: { area_m2: 100, c_i: 0.9, kind: 'paved' }, complete: true },
    { id: 'b', values: { area_m2: 200, c_i: 0.3, kind: 'unpaved' }, complete: true },
    { id: 'c', values: { area_m2: 50, c_i: null, kind: null }, complete: false },
  ],
  flags: { not_applicable: false },
};
const scope: Scope = { symbol: () => undefined, register: (s) => (s === 'reg' ? reg : undefined) };

describe('row functions operate on complete rows only', () => {
  it('sum_rows / count_rows / max_rows / min_rows / mean_rows', () => {
    expect(evalNumber('sum_rows(reg, area_m2 * c_i)', scope)).toBeCloseTo(150, 6);
    expect(evalNumber("sum_rows(reg, if(kind == 'paved', area_m2, 0))", scope)).toBe(100);
    expect(evalNumber('count_rows(reg)', scope)).toBe(2);
    expect(evalNumber("count_rows(reg, kind == 'unpaved')", scope)).toBe(1);
    expect(evalNumber('max_rows(reg, area_m2)', scope)).toBe(200);
    expect(evalNumber('min_rows(reg, area_m2)', scope)).toBe(100);
    expect(evalNumber('mean_rows(reg, area_m2)', scope)).toBe(150);
  });
  it('stdev_rows is the SAMPLE standard deviation (n-1) and needs ≥ 2 rows', () => {
    expect(evalNumber('stdev_rows(reg, area_m2)', scope)).toBeCloseTo(Math.sqrt(((100 - 150) ** 2 + (200 - 150) ** 2) / 1), 9);
    const one: PreparedRegister = { rows: [reg.rows[0]], flags: {} };
    expect(() => evalNumber('stdev_rows(reg, area_m2)', { ...scope, register: () => one })).toThrow('stdev_rows(): mindestens 2 vollständige Zeilen erforderlich.');
  });
  it('last_rows(reg, n) is a register-valued argument', () => {
    expect(evalNumber('count_rows(last_rows(reg, 1), area_m2 > 150)', scope)).toBe(1);
    expect(evalNumber('sum_rows(last_rows(reg, 5), area_m2)', scope)).toBe(300);
  });
  it('zero complete rows: sum/max/min/mean throw the recoverable message, count returns 0', () => {
    const empty: PreparedRegister = { rows: [reg.rows[2]], flags: {} };
    const s: Scope = { ...scope, register: () => empty };
    expect(() => evalNumber('sum_rows(reg, area_m2)', s)).toThrow('Keine vollständigen Zeilen in "reg".');
    expect(evalNumber('count_rows(reg)', s)).toBe(0);
  });
  it('a missing register is an unknown symbol', () => {
    expect(() => evalNumber('sum_rows(nope, area_m2)', scope)).toThrow('Unbekanntes Symbol "nope" im Ausdruck.');
  });
  it('flag(), contains(), cell()', () => {
    expect(evalNumber("if(flag(reg, 'not_applicable'), 0, 1)", scope)).toBe(1);
    const s: Scope = { ...scope, carrier: (sym) => (sym === 'list' ? { selected: ['a', 'b'] } : sym === 'grid' ? { cells: { r1: { c1: 7 } } } : undefined) };
    expect(evalNumber("if(contains(list, 'a'), 1, 0)", s)).toBe(1);
    expect(evalNumber("cell(grid, 'r1', 'c1') * 2", s)).toBe(14);
  });
});

describe('Plan 3 additions', () => {
  it('median_rows and percentile_rows (R-7 interpolation)', () => {
    const three: PreparedRegister = { rows: [
      { id: 'a', values: { v: 10 }, complete: true }, { id: 'b', values: { v: 20 }, complete: true },
      { id: 'c', values: { v: 40 }, complete: true }, { id: 'd', values: { v: 5 }, complete: false } ], flags: {} };
    const s: Scope = { symbol: () => undefined, register: () => three };
    expect(evalNumber('median_rows(reg, v)', s)).toBe(20);
    expect(evalNumber('median_rows(reg, v, v > 10)', s)).toBe(30);
    expect(evalNumber('percentile_rows(reg, v, 50)', s)).toBe(20);
    expect(evalNumber('percentile_rows(reg, v, 25)', s)).toBe(15);
    expect(evalNumber('percentile_rows(reg, v, 100)', s)).toBe(40);
    expect(() => evalNumber('percentile_rows(reg, v, 101)', s)).toThrow('percentile_rows(): p muss zwischen 0 und 100 liegen.');
  });
  it('conditional aggregates skip false rows, go missing on undecidable rows, and reject an empty survivor set', () => {
    expect(evalNumber("sum_rows(reg, area_m2, kind == 'paved')", scope)).toBe(100);
    expect(evalNumber("mean_rows(reg, area_m2, kind != 'paved')", scope)).toBe(200);
    expect(() => evalNumber("sum_rows(reg, area_m2, kind == 'gravel')", scope)).toThrow('Keine vollständigen Zeilen in "reg".');
    expect(() => evalNumber('sum_rows(reg, area_m2, area_m2 > limit)', scope)).toThrow('Fehlende Eingabe für sum_rows(): limit');
    expect(evalCondition('sum_rows(reg, area_m2, area_m2 > limit) > 1', scope)).toEqual({ kind: 'pending', missingSymbols: ['limit'] });
  });
  it('round / ceil / floor', () => {
    expect(evalNumber('round(2.5) + CEIL(1.2) + floor(-1.5)', scope)).toBe(3 + 2 - 2);
  });
  it('extractSymbols treats the new functions as row-scoped except percentile p', () => {
    const n = parseCondition('percentile_rows(reg, v, p_sym) >= median_rows(reg, v, v > limit)');
    expect([...extractSymbols(n!)].sort()).toEqual(['p_sym', 'reg']);
  });
});
