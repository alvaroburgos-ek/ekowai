// src/lib/eval/__tests__/backfill-surface-plan.test.ts
import { describe, it, expect } from 'vitest';
import { planSurfaceBackfill } from '../backfill-surface-plan';

const AC_FIELD_ID = 'field-ac';
const CM_FIELD_ID = 'field-cm';
const BA_FIELD_ID = 'field-ba';
const NBA_FIELD_ID = 'field-nba';
const PROJECT_ID = 'proj-1';

const COMPLETE_CARRIER = {
  rows: [
    { id: '1', tab9_value: 'schwarzdecke_asphalt', area_m2: 3786.8, c_i: 0.9, c_s: 1.0, coeff_override: false },
    { id: '2', tab9_value: 'schwarzdecke_asphalt', area_m2: 1575.9, c_i: 0.9, c_s: 1.0, coeff_override: false },
  ],
};

describe('planSurfaceBackfill', () => {
  it('one project with a complete carrier → 4 rows with correct numbers', () => {
    const rows = planSurfaceBackfill([
      {
        projectId: PROJECT_ID,
        acFieldId: AC_FIELD_ID,
        cmFieldId: CM_FIELD_ID,
        baFieldId: BA_FIELD_ID,
        nbaFieldId: NBA_FIELD_ID,
        carrier: COMPLETE_CARRIER,
      },
    ]);

    expect(rows).toHaveLength(4);

    const ac = rows.find((r) => r.fieldId === AC_FIELD_ID);
    const cm = rows.find((r) => r.fieldId === CM_FIELD_ID);
    const ba = rows.find((r) => r.fieldId === BA_FIELD_ID);
    const nba = rows.find((r) => r.fieldId === NBA_FIELD_ID);

    expect(ac).toBeDefined();
    expect(cm).toBeDefined();
    expect(ba).toBeDefined();
    expect(nba).toBeDefined();

    expect(ac!.projectId).toBe(PROJECT_ID);
    expect(ac!.valueNumber).toBeCloseTo(4826.43, 2);
    expect(cm!.valueNumber).toBeCloseTo(0.9, 6);
    expect(ba!.valueNumber).toBeCloseTo(5362.7, 4);
    expect(nba!.valueNumber).toBe(0);
  });

  it('empty carrier → 4 rows all null', () => {
    const rows = planSurfaceBackfill([
      {
        projectId: PROJECT_ID,
        acFieldId: AC_FIELD_ID,
        cmFieldId: CM_FIELD_ID,
        baFieldId: BA_FIELD_ID,
        nbaFieldId: NBA_FIELD_ID,
        carrier: { rows: [] },
      },
    ]);

    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(r.valueNumber).toBeNull();
    }
  });

  it('null/undefined carrier → 4 rows all null', () => {
    const rows = planSurfaceBackfill([
      {
        projectId: PROJECT_ID,
        acFieldId: AC_FIELD_ID,
        cmFieldId: CM_FIELD_ID,
        baFieldId: BA_FIELD_ID,
        nbaFieldId: NBA_FIELD_ID,
        carrier: null,
      },
    ]);

    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(r.valueNumber).toBeNull();
    }
  });

  it('multiple projects → 4 rows per project', () => {
    const rows = planSurfaceBackfill([
      {
        projectId: 'proj-a',
        acFieldId: AC_FIELD_ID,
        cmFieldId: CM_FIELD_ID,
        baFieldId: BA_FIELD_ID,
        nbaFieldId: NBA_FIELD_ID,
        carrier: COMPLETE_CARRIER,
      },
      {
        projectId: 'proj-b',
        acFieldId: AC_FIELD_ID,
        cmFieldId: CM_FIELD_ID,
        baFieldId: BA_FIELD_ID,
        nbaFieldId: NBA_FIELD_ID,
        carrier: { rows: [] },
      },
    ]);

    expect(rows).toHaveLength(8);
    const projA = rows.filter((r) => r.projectId === 'proj-a');
    const projB = rows.filter((r) => r.projectId === 'proj-b');
    expect(projA).toHaveLength(4);
    expect(projB).toHaveLength(4);
    const acA = projA.find((r) => r.fieldId === AC_FIELD_ID);
    expect(acA!.valueNumber).toBeCloseTo(4826.43, 2);
    const acB = projB.find((r) => r.fieldId === AC_FIELD_ID);
    expect(acB!.valueNumber).toBeNull();
  });
});
