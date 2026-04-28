import { describe, it, expect } from 'vitest';
import { validate } from './validate';
import { A201_08 } from '@/lib/worksheets/DWA-A-201/v3.2';

describe('validate', () => {
  it('passes on valid inputs', () => {
    const r = validate(A201_08, {
      Q_DW_m3d: 5000,
      BSB5_in_mgL: 300,
      T_C: 12,
      treatment_class: 'N',
    });
    expect(r.errors).toEqual({});
  });

  it('flags missing required field', () => {
    const r = validate(A201_08, { BSB5_in_mgL: 300, T_C: 12, treatment_class: 'N' });
    expect(r.errors.Q_DW_m3d).toBe('required');
  });

  it('does not flag missing field with default', () => {
    const r = validate(A201_08, { Q_DW_m3d: 5000, BSB5_in_mgL: 300, treatment_class: 'N' });
    expect(r.errors.T_C).toBeUndefined();
  });

  it('flags below-min number', () => {
    const r = validate(A201_08, {
      Q_DW_m3d: 0.5,
      BSB5_in_mgL: 300,
      T_C: 12,
      treatment_class: 'N',
    });
    expect(r.errors.Q_DW_m3d).toMatch(/min/);
  });

  it('flags above-max number', () => {
    const r = validate(A201_08, {
      Q_DW_m3d: 5000,
      BSB5_in_mgL: 300,
      T_C: 99,
      treatment_class: 'N',
    });
    expect(r.errors.T_C).toMatch(/max/);
  });

  it('flags wrong type for number field', () => {
    const r = validate(A201_08, {
      Q_DW_m3d: 'not a number',
      BSB5_in_mgL: 300,
      T_C: 12,
      treatment_class: 'N',
    });
    expect(r.errors.Q_DW_m3d).toMatch(/type/);
  });

  it('flags select value not in options', () => {
    const r = validate(A201_08, {
      Q_DW_m3d: 5000,
      BSB5_in_mgL: 300,
      T_C: 12,
      treatment_class: 'BOGUS',
    });
    expect(r.errors.treatment_class).toMatch(/option/);
  });

  it('flags wrong type for select field', () => {
    const r = validate(A201_08, {
      Q_DW_m3d: 5000,
      BSB5_in_mgL: 300,
      T_C: 12,
      treatment_class: 42,
    });
    expect(r.errors.treatment_class).toMatch(/type/);
  });
});
