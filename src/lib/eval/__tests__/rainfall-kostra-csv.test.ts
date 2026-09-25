/**
 * parseKostraCsv — the DWD CDC / openko grid-cell CSV as pasted by the
 * engineer. Header and the first two rows below are the real file format
 * (KOSTRA-DWD-2020, semicolon, decimal comma; values from a public cell
 * download, not project data).
 */
import { describe, it, expect } from 'vitest';
import { parseKostraCsv } from '../rainfall-tables';

const HEADER = 'D_min;hN_T1;hN_T2;hN_T3;hN_T5;hN_T10;hN_T20;hN_T30;hN_T50;hN_T100;rN_T1;rN_T2;rN_T3;rN_T5;rN_T10;rN_T20;rN_T30;rN_T50;rN_T100;UC_T5;UC_T10';
const ROW5 = '5;6,0;7,4;8,3;9,4;11,0;12,7;13,8;15,2;17,3;200,0;246,7;276,7;313,3;366,7;423,3;460,0;506,7;576,7;11;12';
const ROW10 = '10;8,0;9,9;11,0;12,5;14,6;16,9;18,3;20,2;23,0;133,3;165,0;183,3;208,3;243,3;281,7;305,0;336,7;383,3;15;16';

describe('parseKostraCsv', () => {
  it('reads D_min and the rN_T columns verbatim (decimal comma → number, no rounding)', () => {
    const res = parseKostraCsv(`${HEADER}\n${ROW5}\n${ROW10}\n`);
    if ('error' in res) throw new Error(res.error);
    expect(res.columns).toEqual([1, 2, 3, 5, 10, 20, 30, 50, 100]);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0]).toEqual({
      D_min: 5,
      r: { '1': 200, '2': 246.7, '3': 276.7, '5': 313.3, '10': 366.7, '20': 423.3, '30': 460, '50': 506.7, '100': 576.7 },
    });
    expect(res.rows[1].D_min).toBe(10);
    expect(res.rows[1].r['10']).toBe(243.3);
    expect(res.warnings).toEqual([]);
  });

  it('ignores hN and UC columns, a BOM, CRLF line ends and blank lines', () => {
    const res = parseKostraCsv(`﻿${HEADER}\r\n${ROW5}\r\n\r\n${ROW10}\r\n`);
    if ('error' in res) throw new Error(res.error);
    expect(res.rows.map((r) => r.D_min)).toEqual([5, 10]);
    expect(Object.keys(res.rows[0].r)).toHaveLength(9);
  });

  it('keeps only the rN columns present and reports missing cells as warnings, never as 0', () => {
    const res = parseKostraCsv('D_min;rN_T5;rN_T10\n15;150,0;\n20;;120,0');
    if ('error' in res) throw new Error(res.error);
    expect(res.columns).toEqual([5, 10]);
    expect(res.rows[0].r).toEqual({ '5': 150, '10': null });
    expect(res.rows[1].r).toEqual({ '5': null, '10': 120 });
    expect(res.warnings).toHaveLength(2);
  });

  it('refuses a file without rN_T columns (e.g. the hN-only export)', () => {
    const res = parseKostraCsv('D_min;hN_T1;hN_T5\n5;6,0;9,4');
    expect('error' in res && res.error).toMatch(/rN_T/);
  });

  it('refuses text without a duration column and empty input', () => {
    expect('error' in parseKostraCsv('foo;bar\n1;2')).toBe(true);
    expect('error' in parseKostraCsv('   \n')).toBe(true);
  });

  it('skips a row whose duration is unreadable and flags duplicate durations', () => {
    const res = parseKostraCsv('D_min;rN_T5\nx;1\n5;2\n5;3');
    if ('error' in res) throw new Error(res.error);
    expect(res.rows.map((r) => r.D_min)).toEqual([5, 5]);
    expect(res.warnings.some((w) => /übersprungen/.test(w))).toBe(true);
    expect(res.warnings.some((w) => /mehrfach/.test(w))).toBe(true);
  });
});
