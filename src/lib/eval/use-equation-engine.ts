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
import type {
  SubAreasCarrier,
  KostraCarrier,
  Gl8Scalars,
  FloodSubAreasCarrier,
  Gl10Scalars,
} from './aggregators';
import { equationProfiles } from './equation-profiles';
import { normalizeSymbols } from './normalize-formula';

/** Equation ids the engine has aggregator paths for. Used to decide which
 * carriers to plumb in. */
const A138_10_GL2_ID = '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3';
const A138_13_GL8_ID = '69f31e6e-a755-4246-af10-ae46668b5c86';
const A138_26_GL10_ID = '8e3c7e22-e3c7-449a-b267-928332c89306';

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
  /** symbol → list of producing worksheet codes when a consumed symbol is
   * ambiguous. Comes from mergeInheritedFields. Any equation whose consumed
   * symbol list intersects this map returns manual_required immediately. */
  ambiguousSymbols?: Record<string, string[]>;
};

/**
 * Symbols the equation consumes from the data store. For aggregator-handled
 * equations the formula's input_symbols list does NOT cover everything
 * (Gl. 2 / Gl. 8 read carriers + scalars that aren't in the formula string),
 * so we widen the set for those ids.
 */
function consumedSymbolsFor(eq: EquationMeta): string[] {
  if (eq.id === A138_10_GL2_ID) {
    return [...(eq.inputSymbols ?? []), 'sub_areas_A138_10'];
  }
  if (eq.id === A138_13_GL8_ID) {
    // Gl. 8 reads scalars from inherited fields + the KOSTRA carrier.
    return ['A_C', 'A_VA', 'Q_S', 'Q_Dr', 'f_Z', 'f_A', 'r_D_n_table'];
  }
  if (eq.id === A138_26_GL10_ID) {
    // Gl. 10 reads scalars from inherited fields + the flood carrier.
    return ['A_VA', 'Q_S', 'Q_Dr', 'D', 'V_VA', 'r_D_30', 'sub_areas_A138_26'];
  }
  // For the §6.x.y batch (arithmetic + Gl. 11 balance), the formula's
  // input_symbols list is the truth — normalised so a stored alias still
  // collides correctly with the ambiguity map.
  return normalizeSymbols(eq.inputSymbols ?? []);
}

export function useEquationEngine({
  worksheetCode,
  fields,
  equations,
  engineWhitelist,
  ambiguousSymbols,
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

  // KOSTRA carrier (Gl. 8): the `r_D_n_table` field carries the rainfall
  // table. The field lives on A138-04 in production; cross-worksheet
  // propagation is what surfaces it onto A138-13. For now the engine just
  // looks up the symbol in whatever fields the caller passes.
  const kostraField = useMemo(
    () => fields.find((f) => f.symbol === 'r_D_n_table'),
    [fields],
  );
  const kostraCarrier = useMemo<KostraCarrier | null>(() => {
    if (!kostraField) return null;
    const v = values[kostraField.id];
    if (v?.type !== 'json') return null;
    const raw = v.value as { rows?: unknown } | null | undefined;
    if (!raw || !Array.isArray(raw.rows)) return { rows: [] };
    return raw as KostraCarrier;
  }, [values, kostraField]);

  // Gl. 8 scalar inputs. Resolved from whichever field carries each symbol
  // (in production these flow via same-symbol inheritance from upstream
  // worksheets). Null when missing.
  const gl8Scalars = useMemo<Gl8Scalars | null>(() => {
    const pick = (sym: string): number | null => {
      const f = fieldBySymbol.get(sym);
      if (!f) return null;
      const v = values[f.id];
      if (v?.type !== 'number' || v.value == null || !Number.isFinite(v.value)) {
        return null;
      }
      return v.value;
    };
    return {
      A_C: pick('A_C'),
      A_VA: pick('A_VA'),
      Q_S: pick('Q_S'),
      Q_Dr: pick('Q_Dr'),
      f_Z: pick('f_Z'),
      f_A: pick('f_A'),
    };
  }, [values, fieldBySymbol]);

  // Flood-sub-area carrier (Gl. 10): the `sub_areas_A138_26` field on A138-26
  // holds the per-row flood-event sub-areas (strictly different from
  // sub_areas_A138_10's design-event C).
  const floodCarrierField = useMemo(
    () => fields.find((f) => f.symbol === 'sub_areas_A138_26'),
    [fields],
  );
  const floodCarrier = useMemo<FloodSubAreasCarrier | null>(() => {
    if (!floodCarrierField) return null;
    const v = values[floodCarrierField.id];
    if (v?.type !== 'json') return null;
    const raw = v.value as { rows?: unknown } | null | undefined;
    if (!raw || !Array.isArray(raw.rows)) return { rows: [] };
    return raw as FloodSubAreasCarrier;
  }, [values, floodCarrierField]);

  // Gl. 10 scalars. Origin worksheets in production: A_VA← A138-10,
  // Q_S← A138-12, Q_Dr← A138-20, D← A138-04, V_VA← A138-13, r_D_T_n_Ue
  // reads the A138-26 own field `r_D_30` (flood-event intensity).
  const gl10Scalars = useMemo<Gl10Scalars | null>(() => {
    const pick = (sym: string): number | null => {
      const f = fieldBySymbol.get(sym);
      if (!f) return null;
      const v = values[f.id];
      if (v?.type !== 'number' || v.value == null || !Number.isFinite(v.value)) {
        return null;
      }
      return v.value;
    };
    return {
      A_VA: pick('A_VA'),
      Q_S: pick('Q_S'),
      Q_Dr: pick('Q_Dr'),
      D: pick('D_min') ?? pick('D'),
      V_VA: pick('V_VA'),
      r_D_T_n_Ue: pick('r_D_30'),
    };
  }, [values, fieldBySymbol]);

  // Unit on the r_D_30 field — feeds the Gl. 10 unit-guard.
  const r_D_30_field = useMemo(
    () => fields.find((f) => f.symbol === 'r_D_30'),
    [fields],
  );

  const engineStates = useMemo<Record<string, EvalState>>(() => {
    const next: Record<string, EvalState> = {};
    for (const eq of equations) {
      if (!engineEquationIds.has(eq.id)) continue;

      // Ambiguity guard: if any consumed symbol resolves to >1 active
      // producing field within the standard, refuse to compute — the engine
      // cannot pick a producer silently. Surface BEFORE delegating to the
      // aggregator or arithmetic path so the badge reads correctly.
      if (ambiguousSymbols) {
        const consumed = consumedSymbolsFor(eq);
        const conflicts: Array<{ symbol: string; origins: string[] }> = [];
        for (const sym of consumed) {
          const origins = ambiguousSymbols[sym];
          if (origins && origins.length > 1) {
            conflicts.push({ symbol: sym, origins });
          }
        }
        if (conflicts.length > 0) {
          const reasonParts = conflicts.map(
            (c) => `mehrdeutige Quelle für ${c.symbol} (${c.origins.join(', ')})`,
          );
          next[eq.id] = {
            kind: 'manual_required',
            reason: reasonParts.join(' · '),
          };
          continue;
        }
      }

      const rewrite = rewriteRules[eq.id];
      const profile = equationProfiles[eq.id];
      // Source-formatting quirks (`r_D(n)`) get normalised here so the
      // hook's symbol lookups match what the parser will see.
      const neededSymbols = rewrite
        ? Object.values(rewrite.remap)
        : normalizeSymbols(eq.inputSymbols ?? []);

      // Per-equation symbol aliases let a worksheet point a formula symbol
      // at a different stored field — e.g. Gl. 12 on A138-16 reads
      // `r_D_n_used` for the `r_D_n` formula symbol. The alias affects field
      // lookup but NOT the substituted-map key the engineer sees (so the
      // engine card still surfaces `r_D_n` rather than the local alias).
      const aliasFor = (sym: string): string =>
        profile?.symbolAliases?.[sym] ?? sym;

      const evalInputs = neededSymbols.map((sym) => {
        const f = fieldBySymbol.get(aliasFor(sym));
        const v = f ? values[f.id] : undefined;
        const num = v?.type === 'number' ? v.value : null;
        return { symbol: sym, value: num, unit: f?.unit ?? null };
      });

      const expectedUnits: Record<string, string | null> = {};
      for (const sym of neededSymbols) {
        const f = fieldBySymbol.get(aliasFor(sym));
        expectedUnits[sym] = f?.unit ?? null;
      }

      // Build the aggregator context specific to this equation id.
      let aggregator: Parameters<typeof evaluateFormula>[0]['aggregator'];
      if (eq.id === A138_10_GL2_ID) {
        aggregator = subAreasCarrier ? { subAreas: subAreasCarrier } : undefined;
      } else if (eq.id === A138_13_GL8_ID) {
        aggregator = {
          kostraTable: kostraCarrier,
          gl8Scalars,
          kostraUnit: kostraField?.unit ?? null,
        };
      } else if (eq.id === A138_26_GL10_ID) {
        aggregator = {
          floodSubAreas: floodCarrier,
          gl10Scalars,
          // re-use kostraUnit slot for the r_D_30 unit guard (the
          // aggregator reads ctx.kostraUnit)
          kostraUnit: r_D_30_field?.unit ?? null,
        };
      }

      next[eq.id] = evaluateFormula({
        equationId: eq.id,
        formula: eq.formula,
        inputSymbols: eq.inputSymbols ?? [],
        outputSymbol: eq.outputSymbol ?? '',
        expectedUnits,
        inputs: evalInputs,
        aggregator,
      });
    }
    return next;
  }, [
    values,
    equations,
    fieldBySymbol,
    engineEquationIds,
    subAreasCarrier,
    kostraCarrier,
    kostraField,
    gl8Scalars,
    floodCarrier,
    gl10Scalars,
    r_D_30_field,
    ambiguousSymbols,
  ]);

  // Write computed value back into the output field, clear it otherwise.
  // Skip equations marked `displayOnly` — alternative-form / sizing-aid
  // equations whose output_symbol collides with a primary writer or an
  // engineer-entered iteration variable. The card still renders the value;
  // only the store / project_parameters write is suppressed.
  useEffect(() => {
    for (const eq of equations) {
      if (!engineEquationIds.has(eq.id)) continue;
      if (equationProfiles[eq.id]?.displayOnly) continue;
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
