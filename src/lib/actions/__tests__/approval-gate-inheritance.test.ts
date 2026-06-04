/**
 * Regression: the approval gate must evaluate block-severity compliance
 * conditions against the FULL resolved symbol set — the worksheet's own
 * fields PLUS fields inherited from upstream consumer-worksheets — not
 * own-worksheet values only.
 *
 * Concrete case (DWA-A 138-1):
 *   A138-REQ-05 lives on A138-04 and reads
 *     `r_D_n_table IS NOT NULL AND kostra_grid_cell IS NOT NULL`.
 *   `r_D_n_table` is A138-04's own json carrier; `kostra_grid_cell` is an
 *   A138-01 field that declares A138-04 as a consumer (inherited).
 *
 * Before the fix the gate loaded only own-template fields, so the inherited
 * `kostra_grid_cell` was invisible → REQ-05 failed in the gate even when the
 * grid cell was saved on A138-01 and the table was filled. These tests pin
 * the resolved evaluation at the pure boundary so the divergence can't recur.
 */
import { describe, it, expect } from 'vitest';
import { resolveApprovalGate } from '../approval-gate';

const REQ05 = {
  code: 'A138-REQ-05',
  titleDe: 'KOSTRA data per §5.3.3.2',
  condition: 'r_D_n_table IS NOT NULL AND kostra_grid_cell IS NOT NULL',
};

// A138-04's own field: the KOSTRA table (json carrier).
const ownTableField = {
  id: 'f-table',
  symbol: 'r_D_n_table',
  labelDe: 'KOSTRA-Tabelle r_D(n)',
  dataType: 'json',
  isRequired: true,
};

// kostra_grid_cell as inherited from A138-01 — keeps the origin field's id,
// which is the id its project_parameters row is keyed by.
const inheritedGridField = {
  id: 'f-grid-A138-01',
  symbol: 'kostra_grid_cell',
  labelDe: 'KOSTRA-Rasterzelle',
  dataType: 'text',
  isRequired: true,
  originWorksheetCode: 'A138-01',
};

const filledTableParam = { fieldId: 'f-table', valueJson: { rows: new Array(16).fill({ D_min: 5, r_D_n: 200 }) } };
const savedGridParam = { fieldId: 'f-grid-A138-01', valueText: '137089' };

describe('resolveApprovalGate — cross-worksheet symbol visibility', () => {
  it('REQ-05 passes when kostra_grid_cell is inherited from A138-01 and the table is filled', () => {
    const result = resolveApprovalGate(
      [ownTableField],
      [inheritedGridField],
      [filledTableParam, savedGridParam],
      [REQ05],
    );
    expect(result.failingBlockConditions.find((c) => c.code === 'A138-REQ-05')).toBeUndefined();
    expect(result.missingRequiredFields).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('REQ-05 still fails when the inherited grid cell is absent (own-worksheet only) — documents the bug', () => {
    const result = resolveApprovalGate(
      [ownTableField],
      [], // no inherited fields → the old, own-only visibility
      [filledTableParam],
      [REQ05],
    );
    expect(result.failingBlockConditions.map((c) => c.code)).toContain('A138-REQ-05');
    expect(result.ok).toBe(false);
  });

  it('REQ-05 fails when inherited grid cell exists as a field but has no saved value', () => {
    const result = resolveApprovalGate(
      [ownTableField],
      [inheritedGridField],
      [filledTableParam], // grid field present, but no saved param for it
      [REQ05],
    );
    expect(result.failingBlockConditions.map((c) => c.code)).toContain('A138-REQ-05');
    expect(result.ok).toBe(false);
  });

  it('an own field overrides an inherited field of the same symbol (own wins)', () => {
    const ownGrid = { id: 'f-grid-own', symbol: 'kostra_grid_cell', labelDe: 'Rasterzelle (lokal)', dataType: 'text', isRequired: false };
    const result = resolveApprovalGate(
      [ownTableField, ownGrid],
      [inheritedGridField],
      [filledTableParam, { fieldId: 'f-grid-own', valueText: '140101' }],
      [REQ05],
    );
    expect(result.failingBlockConditions.find((c) => c.code === 'A138-REQ-05')).toBeUndefined();
    expect(result.ok).toBe(true);
  });
});
