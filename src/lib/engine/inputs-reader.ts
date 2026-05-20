import type { FieldValue } from './types';

export type InputSource = { docId: string; page?: number } | { label: string };

export type InputCell = { value: FieldValue; source?: InputSource };

export type InputRaw = FieldValue | InputCell;

export function isCellShape(raw: InputRaw): raw is InputCell {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    !Array.isArray(raw) &&
    'value' in raw
  );
}

export function getInputValue(raw: InputRaw): FieldValue {
  return isCellShape(raw) ? raw.value : raw;
}

export function getInputSource(raw: InputRaw): InputSource | undefined {
  return isCellShape(raw) ? raw.source : undefined;
}

export function normalizeInputs(
  inputs: Record<string, InputRaw>,
): Record<string, InputCell> {
  const out: Record<string, InputCell> = {};
  for (const [k, v] of Object.entries(inputs)) {
    out[k] = isCellShape(v) ? v : { value: v };
  }
  return out;
}

/**
 * Extracts just the values from an inputs record (mixed shape) into the
 * shape `evaluate(...)` expects: `Record<string, FieldValue>`. Use this
 * at the boundary right before calling the engine.
 */
export function inputsToValues(
  inputs: Record<string, InputRaw>,
): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const [k, v] of Object.entries(inputs)) {
    out[k] = isCellShape(v) ? v.value : v;
  }
  return out;
}
