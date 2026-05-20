import type { Worksheet, FieldValue } from './types';
import { normalizeInputs, type InputRaw } from './inputs-reader';

export interface ValidationResult {
  errors: Record<string, string>;
}

export function validate(
  worksheet: Worksheet,
  inputs: Record<string, unknown>,
): ValidationResult {
  // Tolerant input: accept bare values (legacy) or {value, source} cells (Plan 6).
  const cells = normalizeInputs(inputs as Record<string, InputRaw>);
  const values: Record<string, FieldValue> = {};
  for (const [k, c] of Object.entries(cells)) values[k] = c.value;

  const errors: Record<string, string> = {};

  for (const f of worksheet.inputs) {
    const v = values[f.id];
    if (v === undefined || v === null || v === '') {
      if (f.defaultValue === undefined) {
        errors[f.id] = 'required';
      }
      continue;
    }
    switch (f.type) {
      case 'number': {
        if (typeof v !== 'number' || Number.isNaN(v)) {
          errors[f.id] = 'type: expected number';
          break;
        }
        if (f.min !== undefined && v < f.min) errors[f.id] = `min: ${f.min}`;
        else if (f.max !== undefined && v > f.max) errors[f.id] = `max: ${f.max}`;
        break;
      }
      case 'select': {
        if (typeof v !== 'string') {
          errors[f.id] = 'type: expected string';
          break;
        }
        if (!f.options?.some((o) => o.value === v)) {
          errors[f.id] = 'option: not in allowed set';
        }
        break;
      }
      case 'text':
        if (typeof v !== 'string') errors[f.id] = 'type: expected string';
        break;
      case 'boolean':
        if (typeof v !== 'boolean') errors[f.id] = 'type: expected boolean';
        break;
    }
  }

  return { errors };
}
