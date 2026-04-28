import { describe, it, expect } from 'vitest';
import { validate } from './validate';
import type { Worksheet, InputField } from './types';

const fx = (inputs: InputField[]): Worksheet => ({
  contractVersion: '1.0',
  regulation: 'TEST',
  regulationVersion: 'v0',
  id: 'TEST',
  titleDe: '',
  titleEn: '',
  sourceCitation: '',
  inputs,
  computed: [],
  thresholds: [],
  sections: [{ id: 's', titleDe: '', titleEn: '', fields: inputs.map((i) => i.id) }],
  decisionPoints: [],
  status: 'preview',
});

const numField = (overrides: Partial<InputField> = {}): InputField => ({
  id: 'q',
  type: 'number',
  labelDe: '',
  labelEn: '',
  citation: '',
  ...overrides,
});

describe('validate', () => {
  it('passes on valid inputs', () => {
    const w = fx([numField({ id: 'q', min: 1, max: 100 })]);
    expect(validate(w, { q: 50 }).errors).toEqual({});
  });

  it('flags missing required field', () => {
    const w = fx([numField({ id: 'q', min: 1, max: 100 })]);
    expect(validate(w, {}).errors.q).toBe('required');
  });

  it('does not flag missing field with default', () => {
    const w = fx([numField({ id: 'q', defaultValue: 12 })]);
    expect(validate(w, {}).errors.q).toBeUndefined();
  });

  it('flags below-min number', () => {
    const w = fx([numField({ id: 'q', min: 1 })]);
    expect(validate(w, { q: 0.5 }).errors.q).toMatch(/min/);
  });

  it('flags above-max number', () => {
    const w = fx([numField({ id: 'q', max: 30 })]);
    expect(validate(w, { q: 99 }).errors.q).toMatch(/max/);
  });

  it('flags wrong type for number field', () => {
    const w = fx([numField({ id: 'q' })]);
    expect(validate(w, { q: 'not a number' }).errors.q).toMatch(/type/);
  });

  it('flags select value not in options', () => {
    const w = fx([
      {
        id: 'sel',
        type: 'select',
        labelDe: '',
        labelEn: '',
        citation: '',
        options: [
          { value: 'A', labelDe: '', labelEn: '' },
          { value: 'B', labelDe: '', labelEn: '' },
        ],
      },
    ]);
    expect(validate(w, { sel: 'BOGUS' }).errors.sel).toMatch(/option/);
  });

  it('flags wrong type for select field', () => {
    const w = fx([
      {
        id: 'sel',
        type: 'select',
        labelDe: '',
        labelEn: '',
        citation: '',
        options: [{ value: 'A', labelDe: '', labelEn: '' }],
      },
    ]);
    expect(validate(w, { sel: 42 }).errors.sel).toMatch(/type/);
  });
});
