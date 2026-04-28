import { describe, it, expect } from 'vitest';
import { openDecisionPoints } from './decisions';
import type { Worksheet, DecisionPoint } from './types';

const ws = (decisionPoints: DecisionPoint[]): Worksheet => ({
  contractVersion: '1.0',
  regulation: 'T',
  regulationVersion: 'v0',
  id: 'T',
  titleDe: '',
  titleEn: '',
  sourceCitation: '',
  inputs: [],
  computed: [],
  thresholds: [],
  sections: [{ id: 's', titleDe: '', titleEn: '', fields: [] }],
  decisionPoints,
  status: 'preview',
});

const dp = (overrides: Partial<DecisionPoint> = {}): DecisionPoint => ({
  id: 'dp1',
  labelDe: '',
  labelEn: '',
  promptDe: '',
  promptEn: '',
  citation: '',
  options: [
    { value: 'A', labelDe: '', labelEn: '' },
    { value: 'B', labelDe: '', labelEn: '' },
  ],
  ...overrides,
});

describe('openDecisionPoints', () => {
  it('empty array → no open DPs', () => {
    expect(openDecisionPoints(ws([]), {}, {}, new Set())).toEqual([]);
  });

  it('DP without trigger and no recorded choice → open', () => {
    expect(openDecisionPoints(ws([dp()]), {}, {}, new Set()).map((d) => d.id)).toEqual(['dp1']);
  });

  it('DP with recorded choice → not open', () => {
    expect(openDecisionPoints(ws([dp()]), {}, {}, new Set(['dp1']))).toEqual([]);
  });

  it('DP triggerWhen falsy → not open', () => {
    const t = dp({
      triggerWhen: {
        kind: 'cmp',
        op: '>',
        lhs: { kind: 'ref', id: 'load' },
        rhs: { kind: 'lit', value: 100 },
      },
    });
    expect(openDecisionPoints(ws([t]), { load: 50 }, {}, new Set())).toEqual([]);
  });

  it('DP triggerWhen truthy + no choice → open', () => {
    const t = dp({
      triggerWhen: {
        kind: 'cmp',
        op: '>',
        lhs: { kind: 'ref', id: 'load' },
        rhs: { kind: 'lit', value: 100 },
      },
    });
    expect(openDecisionPoints(ws([t]), { load: 200 }, {}, new Set()).map((d) => d.id)).toEqual([
      'dp1',
    ]);
  });
});
