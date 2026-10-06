import type { FieldValue } from '@/lib/state/worksheet-store';

/** An enum option as stored in `fields.enum_values` (only `value` is read here). */
export type EnumOption = { value: string };

/**
 * Coerce a same-symbol (or twin) value from ANOTHER worksheet — of any standard in the project — into a prefill value for
 * this field (the worksheet page's step 2 / 2b). Returns null when the value cannot be used.
 *
 * DWA-M 820-3 structure block, review fix round 1 (I-c, controller ruling): an ENUM field is never prefilled with a token
 * that is not one of its OWN `enum_values` — a same-named field of another standard carries other tokens (DWA-M 820-1
 * `project_type` = `projekt` beside DWA-M 820-3 `project_type` ∈ {gesamtsystem, einzelprojekt, both}). A field without an
 * option list (null / empty) keeps the old behaviour. Every other data type is unchanged (the cross-standard prefill stays an
 * existing feature). Note: `saveWorksheet` itself does not validate enum tokens (backlog, sign-off sheet).
 */
export function coerceSameSymbolValue(
  dataType: string,
  v: unknown,
  enumValues?: ReadonlyArray<EnumOption> | null,
): FieldValue | null {
  switch (dataType) {
    case 'number': {
      const n = typeof v === 'number' ? v : Number(v as string);
      return Number.isFinite(n) ? { type: 'number', value: n } : null;
    }
    case 'text':
      return typeof v === 'string' || typeof v === 'number'
        ? { type: 'text', value: String(v) }
        : null;
    case 'enum': {
      if (typeof v !== 'string') return null;
      const options = Array.isArray(enumValues) ? enumValues : null;
      if (options && options.length > 0 && !options.some((o) => o?.value === v)) return null;
      return { type: 'enum', value: v };
    }
    case 'date':
      return typeof v === 'string' ? { type: 'date', value: v } : null;
    case 'boolean':
      return typeof v === 'boolean' ? { type: 'boolean', value: v } : null;
    case 'json':
      return { type: 'json', value: v };
    default:
      return null;
  }
}
