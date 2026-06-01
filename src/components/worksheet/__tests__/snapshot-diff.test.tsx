/**
 * Rendered integration test for the diff view. Verifies that:
 *   - the summary banner reports correct counts
 *   - changed parameter rows are visible by default
 *   - unchanged rows are hidden until the toggle is flipped
 *   - the manual_required ↔ computed transition surfaces a "Verdikt geändert"
 *     marker, NOT a value change
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnapshotDiffView } from '../snapshot-diff';
import { computeSnapshotDiff } from '@/lib/snapshots/diff';
import type {
  SnapshotPayload,
  SnapshotParameterValue,
  SnapshotEquationOutput,
} from '@/lib/snapshots/payload';

const num = (v: number, unit: string | null = null): SnapshotParameterValue => ({
  type: 'number',
  value: v,
  unit,
  citationSources: [],
});

const computed = (v: number): SnapshotEquationOutput => ({
  kind: 'computed',
  value: v,
  formula: 'X = 1',
  substituted: {},
});

const manual = (reason: string): SnapshotEquationOutput => ({
  kind: 'manual_required',
  manualRequiredReason: reason,
  formula: 'X = ?',
});

const FROM: SnapshotPayload = {
  parameters: {
    'field-A_S': num(100, 'm²'),
    'field-B': num(5, 'm/s'),
  },
  equationOutputs: {
    '4': computed(500),
    '11': manual('Fehlende Eingaben: x'),
  },
  complianceResults: { 'req-1': 'pass' },
};

const TO: SnapshotPayload = {
  parameters: {
    'field-A_S': num(118, 'm²'), // changed +18%
    'field-B': num(5, 'm/s'), // unchanged
  },
  equationOutputs: {
    '4': computed(590), // value change
    '11': computed(0.001), // kind change manual_required → computed
  },
  complianceResults: { 'req-1': 'fail' }, // flip
};

const FIELDS = [
  { id: 'field-A_S', symbol: 'A_S', labelDe: 'Sickerfläche', labelEn: 'Soak area' },
  { id: 'field-B', symbol: 'B', labelDe: 'Beta', labelEn: null },
];

const EQUATIONS = [
  { equationNumber: '4', outputSymbol: 'Q_S', clauseReference: null },
  { equationNumber: '11', outputSymbol: 'A_S', clauseReference: null },
];

const REQUIREMENTS = [
  { id: 'req-1', code: 'REQ-1', titleDe: 'Beispiel-Anforderung', titleEn: null },
];

describe('SnapshotDiffView', () => {
  it('renders summary banner with parameter + output counts', () => {
    const diff = computeSnapshotDiff(FROM, TO);
    render(
      <SnapshotDiffView
        diff={diff}
        locale="de"
        fields={FIELDS}
        equations={EQUATIONS}
        requirements={REQUIREMENTS}
        fromLabel="Genehmigt am 12.05.2026"
        toLabel="Eingereicht am 28.05.2026"
      />,
    );

    const summary = screen.getByTestId('diff-summary');
    // 1 parameter changed (A_S), 2 equation outputs affected (Gl. 4 value, Gl. 11 kind)
    expect(summary.textContent).toMatch(/1.*Parameter geändert/);
    expect(summary.textContent).toMatch(/2.*Auswirkung auf Outputs/);
    // Q_S +18% should appear (Gl. 4 went 500 → 590)
    expect(summary.textContent).toMatch(/Q_S.*\+18\.0%/);
    // Compliance flipped count
    expect(summary.textContent).toMatch(/1.*Konformitätsanforderung/);
  });

  it('shows only changed parameter rows by default', () => {
    const diff = computeSnapshotDiff(FROM, TO);
    render(
      <SnapshotDiffView
        diff={diff}
        locale="de"
        fields={FIELDS}
        equations={EQUATIONS}
        requirements={REQUIREMENTS}
        fromLabel="A"
        toLabel="B"
      />,
    );

    const table = screen.getByTestId('diff-parameters-table');
    // A_S row visible
    expect(table.textContent).toContain('Sickerfläche');
    // B (unchanged) hidden
    expect(table.textContent).not.toContain('Beta');
  });

  it('reveals unchanged rows when toggle flipped', async () => {
    const diff = computeSnapshotDiff(FROM, TO);
    const user = userEvent.setup();
    render(
      <SnapshotDiffView
        diff={diff}
        locale="de"
        fields={FIELDS}
        equations={EQUATIONS}
        requirements={REQUIREMENTS}
        fromLabel="A"
        toLabel="B"
      />,
    );

    const toggle = screen.getByTestId('show-unchanged-toggle');
    await user.click(toggle);

    const table = screen.getByTestId('diff-parameters-table');
    expect(table.textContent).toContain('Beta');
  });

  it('marks kind_change rows distinctly (not as plain value change)', () => {
    const diff = computeSnapshotDiff(FROM, TO);
    render(
      <SnapshotDiffView
        diff={diff}
        locale="de"
        fields={FIELDS}
        equations={EQUATIONS}
        requirements={REQUIREMENTS}
        fromLabel="A"
        toLabel="B"
      />,
    );

    const table = screen.getByTestId('diff-equations-table');
    // Find row for Gl. 11 — it's a kind change (manual_required → computed)
    const rows = table.querySelectorAll('tr[data-change-type]');
    const kindChangeRow = Array.from(rows).find(
      (r) => r.getAttribute('data-change-type') === 'kind_change',
    );
    expect(kindChangeRow).toBeTruthy();
    expect(kindChangeRow?.textContent).toMatch(/Verdikt geändert/);
  });

  it('shows compliance flips with from/to verdict badges', () => {
    const diff = computeSnapshotDiff(FROM, TO);
    render(
      <SnapshotDiffView
        diff={diff}
        locale="de"
        fields={FIELDS}
        equations={EQUATIONS}
        requirements={REQUIREMENTS}
        fromLabel="A"
        toLabel="B"
      />,
    );

    const table = screen.getByTestId('diff-compliance-table');
    expect(table.textContent).toContain('Beispiel-Anforderung');
    expect(table.textContent).toContain('erfüllt');
    expect(table.textContent).toContain('nicht erfüllt');
  });
});
