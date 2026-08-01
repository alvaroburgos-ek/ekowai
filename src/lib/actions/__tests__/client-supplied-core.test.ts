import { describe, it, expect } from 'vitest';
import {
  setClientSuppliedSchema,
  parseSetClientSupplied,
} from '../client-supplied-core';

/**
 * Pure input contract for the setClientSupplied server action (Kundenangabe
 * flagging — AGB input-error carve-out). No DB, no session: the zod schema is
 * the whole surface (mirrors effort-core tests).
 */
const PROJECT_ID = '3e2c3a52-4b1a-4f6e-9a2d-0d5b6c7e8f90';
const FIELD_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('setClientSupplied input validation', () => {
  it('accepts a valid payload (flag on)', () => {
    const r = parseSetClientSupplied({
      projectId: PROJECT_ID,
      fieldId: FIELD_ID,
      clientSupplied: true,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({
        projectId: PROJECT_ID,
        fieldId: FIELD_ID,
        clientSupplied: true,
      });
    }
  });

  it('accepts clearing the flag (clientSupplied=false)', () => {
    const r = parseSetClientSupplied({
      projectId: PROJECT_ID,
      fieldId: FIELD_ID,
      clientSupplied: false,
    });
    expect(r.success).toBe(true);
  });

  it('rejects a non-uuid projectId', () => {
    const r = parseSetClientSupplied({
      projectId: 'not-a-uuid',
      fieldId: FIELD_ID,
      clientSupplied: true,
    });
    expect(r.success).toBe(false);
  });

  it('rejects a non-uuid fieldId', () => {
    const r = parseSetClientSupplied({
      projectId: PROJECT_ID,
      fieldId: '42',
      clientSupplied: true,
    });
    expect(r.success).toBe(false);
  });

  it('rejects a non-boolean flag (no truthy coercion)', () => {
    for (const bad of ['true', 1, null, undefined]) {
      const r = setClientSuppliedSchema.safeParse({
        projectId: PROJECT_ID,
        fieldId: FIELD_ID,
        clientSupplied: bad,
      });
      expect(r.success).toBe(false);
    }
  });

  it('rejects missing keys entirely', () => {
    expect(parseSetClientSupplied({}).success).toBe(false);
    expect(parseSetClientSupplied(undefined).success).toBe(false);
  });
});
