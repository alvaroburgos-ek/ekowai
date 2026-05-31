import { describe, it, expect } from 'vitest';
import { computeSnapshotDiff } from '../diff';
import type {
  SnapshotPayload,
  SnapshotParameterValue,
  SnapshotEquationOutput,
} from '../payload';

const numParam = (value: number, unit: string | null = null): SnapshotParameterValue => ({
  type: 'number',
  value,
  unit,
  citationSources: [],
});

const computed = (value: number, formula = 'X = 1', substituted = {}): SnapshotEquationOutput => ({
  kind: 'computed',
  value,
  formula,
  substituted,
});

const manual = (reason: string): SnapshotEquationOutput => ({
  kind: 'manual_required',
  manualRequiredReason: reason,
  formula: 'X = ?',
});

const fromPayload: SnapshotPayload = {
  parameters: {
    'field-A': numParam(100, 'm²'),
    'field-B': numParam(5, 'm/s'),
    'field-removed': numParam(42, null),
  },
  equationOutputs: {
    '4': computed(500),
    '7': computed(7.5),
    '11': manual('Fehlende Eingaben: x'),
  },
  complianceResults: {
    'req-pass-stays': 'pass',
    'req-pass-to-fail': 'pass',
    'req-fail-to-open': 'fail',
    'req-removed': 'fail',
  },
};

const toPayload: SnapshotPayload = {
  parameters: {
    'field-A': numParam(118, 'm²'), // +18%
    'field-B': numParam(5, 'm/s'), // unchanged
    'field-new': numParam(7, 'm'), // added
  },
  equationOutputs: {
    '4': computed(590), // value change
    '7': computed(7.5), // unchanged
    '11': computed(0.001), // kind change (manual → computed)
    '21': computed(99), // added
  },
  complianceResults: {
    'req-pass-stays': 'pass',
    'req-pass-to-fail': 'fail',
    'req-fail-to-open': 'open',
    'req-new': 'pass',
  },
};

describe('computeSnapshotDiff', () => {
  const diff = computeSnapshotDiff(fromPayload, toPayload);

  it('classifies parameter rows by presence and change', () => {
    const byField = new Map(diff.parameters.map((p) => [p.fieldId, p]));

    const a = byField.get('field-A')!;
    expect(a.presence).toBe('both');
    expect(a.changed).toBe(true);

    const b = byField.get('field-B')!;
    expect(b.presence).toBe('both');
    expect(b.changed).toBe(false);

    const removed = byField.get('field-removed')!;
    expect(removed.presence).toBe('only_from');
    expect(removed.changed).toBe(true);

    const added = byField.get('field-new')!;
    expect(added.presence).toBe('only_to');
    expect(added.changed).toBe(true);
  });

  it('detects three-state kind changes on equations', () => {
    const byNumber = new Map(diff.equations.map((e) => [e.equationNumber, e]));

    expect(byNumber.get('4')!.changeType).toBe('value_change');
    expect(byNumber.get('7')!.changeType).toBe('unchanged');
    // manual_required → computed must be flagged as kind_change, NOT a
    // value change from null to X — the diff renderer relies on this.
    expect(byNumber.get('11')!.changeType).toBe('kind_change');
    expect(byNumber.get('21')!.changeType).toBe('added');
  });

  it('sorts equations numerically by equationNumber', () => {
    const nums = diff.equations.map((e) => e.equationNumber);
    expect(nums).toEqual(['4', '7', '11', '21']);
  });

  it('classifies compliance flips and additions/removals', () => {
    const byReq = new Map(diff.compliance.map((c) => [c.requirementId, c]));
    expect(byReq.get('req-pass-stays')!.changed).toBe(false);
    expect(byReq.get('req-pass-to-fail')!.changed).toBe(true);
    expect(byReq.get('req-fail-to-open')!.changed).toBe(true);
    expect(byReq.get('req-removed')!.presence).toBe('only_from');
    expect(byReq.get('req-new')!.presence).toBe('only_to');
  });

  it('summarises counts', () => {
    // Parameters changed: A, removed, new = 3
    expect(diff.summary.parametersChanged).toBe(3);
    // B unchanged = 1
    expect(diff.summary.parametersUnchanged).toBe(1);
    // Equation outputs affected: 4, 11, 21 = 3 (7 is unchanged)
    expect(diff.summary.equationOutputsAffected).toBe(3);
    // Compliance flipped: pass→fail, fail→open, removed, new = 4
    expect(diff.summary.complianceFlipped).toBe(4);
  });

  it('treats numeric tolerance EPS as equal', () => {
    const a: SnapshotPayload = {
      parameters: { x: numParam(1.000000000001) },
      equationOutputs: {},
      complianceResults: {},
    };
    const b: SnapshotPayload = {
      parameters: { x: numParam(1.0) },
      equationOutputs: {},
      complianceResults: {},
    };
    const d = computeSnapshotDiff(a, b);
    expect(d.parameters[0].changed).toBe(false);
  });

  it('handles two identical snapshots (no diff)', () => {
    const d = computeSnapshotDiff(fromPayload, fromPayload);
    expect(d.summary.parametersChanged).toBe(0);
    expect(d.summary.equationOutputsAffected).toBe(0);
    expect(d.summary.complianceFlipped).toBe(0);
  });
});
