'use client';

/**
 * React hook that wires the in-tree formula engine into the worksheet store.
 * Lifted out of worksheet-form.tsx so it can be exercised by an integration
 * test against the same code the production form runs — not a copy.
 *
 * Responsibilities:
 *   - Detect which equations on the current worksheet are whitelisted for the
 *     real engine (via `engineWhitelistKey`).
 *   - Read the sub-areas carrier (if a `sub_areas_*` json field is present).
 *   - Build EvalRequests from the store's resolved values + field units.
 *   - Memoise EvalState per equation id.
 *   - Write computed values back into the store as the output field's value;
 *     clear the output field when state is not `computed` (no stale numbers).
 *
 * The hook is a pure derivation in its primary path (useMemo) plus a single
 * value-write effect — the only mutation the engine performs.
 */
import { useEffect, useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { evaluateFormula, type EvalState } from './formula';
import { rewriteRules } from './rewrites';
import type { SubAreasCarrier } from './aggregators';

type FieldMeta = {
  id: string;
  symbol: string;
  unit: string | null;
};

type EquationMeta = {
  id: string;
  equationNumber: string;
  formula: string;
  inputSymbols: string[] | null;
  outputSymbol: string | null;
};

type Args = {
  worksheetCode: string;
  fields: FieldMeta[];
  equations: EquationMeta[];
  /** Set of "WORKSHEETCODE:EQNUM" strings the engine is wired for. */
  engineWhitelist: ReadonlySet<string>;
};

export function useEquationEngine({
  worksheetCode,
  fields,
  equations,
  engineWhitelist,
}: Args): {
  engineEquationIds: Set<string>;
  engineStates: Record<string, EvalState>;
} {
  const values = useWorksheetStore((s) => s.values);
  const setField = useWorksheetStore((s) => s.setField);

  const fieldBySymbol = useMemo(() => {
    const m = new Map<string, FieldMeta>();
    for (const f of fields) m.set(f.symbol, f);
    return m;
  }, [fields]);

  const engineEquationIds = useMemo(() => {
    const ids = new Set<string>();
    for (const eq of equations) {
      const key = `${worksheetCode}:${eq.equationNumber}`;
      if (engineWhitelist.has(key)) ids.add(eq.id);
    }
    return ids;
  }, [equations, worksheetCode, engineWhitelist]);

  // Sub-areas carrier: whichever field on this worksheet has symbol starting
  // with `sub_areas_` is treated as the json carrier for the aggregator path.
  const subAreasField = useMemo(
    () => fields.find((f) => f.symbol.startsWith('sub_areas_')),
    [fields],
  );
  const subAreasCarrier = useMemo<SubAreasCarrier | null>(() => {
    if (!subAreasField) return null;
    const v = values[subAreasField.id];
    if (v?.type !== 'json') return null;
    const raw = v.value as { rows?: unknown } | null | undefined;
    if (!raw || !Array.isArray(raw.rows)) return { rows: [] };
    return raw as SubAreasCarrier;
  }, [values, subAreasField]);

  const engineStates = useMemo<Record<string, EvalState>>(() => {
    const next: Record<string, EvalState> = {};
    for (const eq of equations) {
      if (!engineEquationIds.has(eq.id)) continue;

      const rewrite = rewriteRules[eq.id];
      const neededSymbols = rewrite
        ? Object.values(rewrite.remap)
        : eq.inputSymbols ?? [];

      const evalInputs = neededSymbols.map((sym) => {
        const f = fieldBySymbol.get(sym);
        const v = f ? values[f.id] : undefined;
        const num = v?.type === 'number' ? v.value : null;
        return { symbol: sym, value: num, unit: f?.unit ?? null };
      });

      const expectedUnits: Record<string, string | null> = {};
      for (const sym of neededSymbols) {
        const f = fieldBySymbol.get(sym);
        expectedUnits[sym] = f?.unit ?? null;
      }

      next[eq.id] = evaluateFormula({
        equationId: eq.id,
        formula: eq.formula,
        inputSymbols: eq.inputSymbols ?? [],
        outputSymbol: eq.outputSymbol ?? '',
        expectedUnits,
        inputs: evalInputs,
        aggregator: subAreasCarrier ? { subAreas: subAreasCarrier } : undefined,
      });
    }
    return next;
  }, [values, equations, fieldBySymbol, engineEquationIds, subAreasCarrier]);

  // Write computed value back into the output field, clear it otherwise.
  useEffect(() => {
    for (const eq of equations) {
      if (!engineEquationIds.has(eq.id)) continue;
      const outSym = eq.outputSymbol;
      if (!outSym) continue;
      const outField = fieldBySymbol.get(outSym);
      if (!outField) continue;
      const state = engineStates[eq.id];
      const current = values[outField.id];
      const currentNum = current?.type === 'number' ? current.value : null;
      const desired = state?.kind === 'computed' ? state.value : null;
      if (currentNum !== desired) {
        setField(outField.id, { type: 'number', value: desired });
      }
    }
  }, [engineStates, engineEquationIds, equations, fieldBySymbol, values, setField]);

  return { engineEquationIds, engineStates };
}
