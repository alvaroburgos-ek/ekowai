import type { Worksheet, InputValues } from './types';

export interface ValidationResult {
  errors: Record<string, string>;
}

export function validate(worksheet: Worksheet, inputs: InputValues): ValidationResult {
  const errors: Record<string, string> = {};

  for (const f of worksheet.inputs) {
    const v = inputs[f.id];
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
