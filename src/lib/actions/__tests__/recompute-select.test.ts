/**
 * API-path recompute (2026-10-05): which evaluator results become `derived` writes.
 * Pure selection mirrors the browser write-back rules (displayOnly never writes, A_S,m method
 * suppression, own numeric fields only) and never writes a non-computed result.
 */
import { describe, it, expect } from 'vitest';
import { selectRecomputeWrites } from '../recompute-worksheet';
import type { EquationReportResult } from '@/lib/eval/evaluate-for-report';

const GL14_DISPLAY_ONLY = 'bfe6e59a-015f-4c95-b717-8599f80cb68a'; // A138-17 Gl. 14 (displayOnly in equation-profiles)
const GL7_ASM = '55151cb1-4a5a-48d1-b5c0-2312ef7b78ac';          // A138-12 Gl. 7 (A_S,m, direct method only)

const computed = (equationId: string, equationNumber: string, outputSymbol: string, value: number): EquationReportResult => ({
  equationId, equationNumber, worksheetCode: 'X', formula: `${outputSymbol} = …`, outputSymbol, outputUnit: null,
  state: { kind: 'computed', value, substituted: {}, formulaEvaluated: '' },
});
const missing = (equationId: string, equationNumber: string, outputSymbol: string): EquationReportResult => ({
  equationId, equationNumber, worksheetCode: 'X', formula: `${outputSymbol} = …`, outputSymbol, outputUnit: null,
  state: { kind: 'manual_required', reason: 'Fehlende Eingaben: a' } as EquationReportResult['state'],
});

const own = [
  { id: 'f-k_i', symbol: 'k_i', dataType: 'number' },
  { id: 'f-V_M', symbol: 'V_M', dataType: 'number' },
  { id: 'f-A_S_m', symbol: 'A_S_m', dataType: 'number' },
  { id: 'f-note', symbol: 'note', dataType: 'text' },
];

describe('selectRecomputeWrites', () => {
  it('writes a computed own numeric output, skips unchanged values', () => {
    const { writes } = selectRecomputeWrites({
      results: [computed('e1', '5', 'k_i', 6.6e-7), computed('e2', '9', 'A_S_m', 50)],
      ownFields: own, currentNumberByFieldId: new Map([['f-A_S_m', 50]]), asmMethod: 'direct',
    });
    expect(writes).toEqual([{ fieldId: 'f-k_i', symbol: 'k_i', equationNumber: '5', value: 6.6e-7 }]);
  });

  it('never writes a displayOnly equation (Gl. 14) nor a non-computed result (reported instead)', () => {
    const { writes, notComputed } = selectRecomputeWrites({
      results: [computed(GL14_DISPLAY_ONLY, '14', 'V_M', 17), missing('e3', '5', 'k_i')],
      ownFields: own, currentNumberByFieldId: new Map(), asmMethod: null,
    });
    expect(writes).toEqual([]);
    expect(notComputed).toEqual([{ equationNumber: '5', outputSymbol: 'k_i', reason: 'Fehlende Eingaben: a' }]);
  });

  it('A_S,m (Gl. 7) writes only for the direct method; inherited / text targets are ignored', () => {
    const direct = selectRecomputeWrites({ results: [computed(GL7_ASM, '7', 'A_S_m', 45)], ownFields: own, currentNumberByFieldId: new Map(), asmMethod: 'direct' });
    expect(direct.writes.map((w) => w.symbol)).toEqual(['A_S_m']);
    const geometry = selectRecomputeWrites({ results: [computed(GL7_ASM, '7', 'A_S_m', 45)], ownFields: own, currentNumberByFieldId: new Map(), asmMethod: 'geometry' });
    expect(geometry.writes).toEqual([]);
    const foreign = selectRecomputeWrites({ results: [computed('e4', '3', 'Q_zu', 0.18), computed('e5', 'D1', 'note', 1)], ownFields: own, currentNumberByFieldId: new Map(), asmMethod: null });
    expect(foreign.writes).toEqual([]);
  });
});
