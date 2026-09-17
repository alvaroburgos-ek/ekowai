/**
 * Symbol → value lookup over the worksheet store's values, for the compliance
 * DSL (`evaluateCondition`) and for `computeVisibility`. Extracted from
 * ComplianceBlock (Plan 2a, Task 10) so the form and the block evaluate over
 * the SAME map — the visibility decision and the gate verdict cannot disagree.
 *
 * Pure: no React, no store subscription — the caller passes the values.
 */
import { jsonConditionValue } from '@/lib/compliance/evaluate';
import type { Value } from '@/lib/expr';

export type SymbolLookup = (sym: string) => Value | undefined;

/** Minimal store-value shape (mirrors the store's FieldValue union). */
export type LookupValue =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null }
  | { type: 'date'; value: string | null }
  | { type: 'boolean'; value: boolean | null }
  | { type: 'json'; value: unknown };

export function makeSymbolLookup(
  fields: ReadonlyArray<{ id: string; symbol: string }>,
  values: Readonly<Record<string, LookupValue | undefined>>,
): SymbolLookup {
  const symbolToValue = new Map<string, number | string | boolean | null>();
  for (const f of fields) {
    const v = values[f.id];
    if (!v) continue;
    switch (v.type) {
      case 'number': symbolToValue.set(f.symbol, v.value); break;
      case 'text': symbolToValue.set(f.symbol, v.value); break;
      case 'enum': symbolToValue.set(f.symbol, v.value); break;
      case 'date': symbolToValue.set(f.symbol, v.value); break;
      case 'boolean': symbolToValue.set(f.symbol, v.value); break;
      case 'json': {
        // Presence marker so `symbol IS NOT NULL`/`IS NOT EMPTY` gates work
        // (populated carrier ⇒ 'present'; empty/null ⇒ not set → absent).
        const m = jsonConditionValue(v.value);
        if (m != null) symbolToValue.set(f.symbol, m);
        break;
      }
    }
  }
  return (sym: string) => {
    if (!symbolToValue.has(sym)) return undefined;
    return symbolToValue.get(sym) ?? null;
  };
}
