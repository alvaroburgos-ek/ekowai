import { describe, it, expect } from 'vitest';
import { buildInputMap, classifyField, type InputMapField } from '../input-map';
import { TWIN_SYMBOLS, twinSourcesFor, twinSourceSymbols } from '../twin-symbols';

const STD = 'DWA-A-138-1';
const f = (o: Partial<InputMapField> & { id: string; worksheetCode: string; symbol: string }): InputMapField => ({
  labelDe: o.symbol, unit: null, dataType: 'number', isRequired: true, clauseReference: null, ...o,
});

describe('TWIN_SYMBOLS (DWA-A-138-1)', () => {
  it('every target appears once and never lists itself as a source', () => {
    const targets = TWIN_SYMBOLS[STD].map((r) => r.target);
    expect(new Set(targets).size).toBe(targets.length);
    for (const r of TWIN_SYMBOLS[STD]) expect(r.sources).not.toContain(r.target);
  });

  it('has no cycles (a source is never itself a target of a rule that leads back)', () => {
    const rules = TWIN_SYMBOLS[STD];
    const next = (s: string) => rules.find((r) => r.target === s)?.sources ?? [];
    // A diamond (A_C_final → A_C and → A_C_calculated → A_C) is fine; a path back to the rule's own target is not.
    for (const r of rules) {
      const seen = new Set<string>();
      const stack = [...r.sources];
      while (stack.length) {
        const s = stack.pop()!;
        expect(s, `${r.target} → … → ${s}`).not.toBe(r.target);
        if (seen.has(s)) continue;
        seen.add(s);
        stack.push(...next(s));
      }
    }
  });

  it('the run-observed duplicates resolve to their producers', () => {
    expect(twinSourcesFor(STD, 'A_C_final')).toEqual(['A_C', 'A_C_calculated']);
    expect(twinSourcesFor(STD, 'kostra_design_T_n')[0]).toBe('T_n');
    expect(twinSourcesFor(STD, 'qsac_value_verified')[0]).toBe('q_S_AC');
    expect(twinSourcesFor(STD, 'A_C')).toEqual([]); // producer, never a target
    expect(twinSourcesFor('DIN-1989-1', 'A_C_final')).toEqual([]);
    expect(twinSourceSymbols(STD)).toContain('V_VA');
  });
});

describe('classifyField', () => {
  it('engine beats twin beats attestation beats manual', () => {
    const eqOut = new Set(['k_i']);
    expect(classifyField(STD, f({ id: '1', worksheetCode: 'A138-11', symbol: 'k_i' }), eqOut).klass).toBe('engine');
    expect(classifyField(STD, f({ id: '2', worksheetCode: 'A138-14', symbol: 'A_C_calculated' }), eqOut)).toEqual({ klass: 'twin', twinSource: 'A_C' });
    expect(classifyField(STD, f({ id: '3', worksheetCode: 'A138-01', symbol: 'attest_a138_01_a138_req_25', dataType: 'boolean' }), eqOut).klass).toBe('attestation');
    expect(classifyField(STD, f({ id: '4', worksheetCode: 'A138-08', symbol: 'f_ort' }), eqOut).klass).toBe('manual');
  });
});

describe('buildInputMap', () => {
  it('counts per worksheet and totals; open = manual/required without a value; engine outputs never count as open', () => {
    const map = buildInputMap({
      standardCode: STD,
      worksheets: [
        { code: 'A138-11', titleDe: 'k_i', phase: 3, status: 'draft' },
        { code: 'A138-14', titleDe: 'Summary', phase: 3, status: 'draft' },
      ],
      fields: [
        f({ id: 'a', worksheetCode: 'A138-11', symbol: 'a138_k_f_min' }),
        f({ id: 'b', worksheetCode: 'A138-11', symbol: 'k_i' }),
        f({ id: 'c', worksheetCode: 'A138-14', symbol: 'A_C_calculated' }),
        f({ id: 'd', worksheetCode: 'A138-14', symbol: 'general_calc_completion_date', dataType: 'date' }),
        f({ id: 'e', worksheetCode: 'A138-14', symbol: 'q_S_AC_check_result', dataType: 'boolean', isRequired: false }),
      ],
      equations: [{ worksheetCode: 'A138-11', outputSymbol: 'k_i' }],
      filledFieldIds: new Set(['a']),
    });
    const w11 = map.worksheets[0];
    expect(w11.counts).toEqual({ engine: 1, twin: 1, attestation: 0, manual: 0, openManual: 0, openRequired: 0 });
    const w14 = map.worksheets[1];
    expect(w14.counts.twin).toBe(1);
    expect(w14.counts.manual).toBe(2);
    expect(w14.counts.openManual).toBe(2);
    expect(w14.counts.openRequired).toBe(2); // c (twin, required, empty) + d; e is not required
    expect(map.totals.fields).toBe(5);
    expect(map.totals.engine).toBe(1);
    expect(w11.rows.find((r) => r.symbol === 'a138_k_f_min')?.filled).toBe(true);
    expect(w11.rows.find((r) => r.symbol === 'k_i')?.sourceHint).toBeNull();
    expect(w11.rows.find((r) => r.symbol === 'a138_k_f_min')?.twinSource).toBe('k_f');
  });
});
