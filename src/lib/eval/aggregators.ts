/**
 * Aggregators — equation-specific evaluators for formulas that use
 * Σ-over-rows notation. These can't be expressed in flat arithmetic and
 * can't be reduced via a string rewrite without losing the per-row
 * coefficient information. Each aggregator owns:
 *   - The carrier-data shape it expects.
 *   - The arithmetic it runs over that data.
 *   - The "is this row complete?" decision that determines when the engine
 *     emits `manual_required` vs `computed`.
 *
 * Each aggregator must respect the engine's three-state contract: NEVER a
 * bare number that hides a problem.
 */
import type { EvalRequest, EvalState } from './formula';

export type SubArea = {
  id: string;
  label?: string | null;
  kind: 'paved' | 'unpaved';
  area_m2: number | null;
  c: number | null;
};

export type SubAreasCarrier = {
  rows: SubArea[];
};

export type AggregatorContext = {
  /** Carrier data for the sub-areas aggregator (A138-10 Gl. 2). */
  subAreas?: SubAreasCarrier | null;
};

type Aggregator = {
  run: (req: EvalRequest) => EvalState;
};

function isComplete(row: SubArea): boolean {
  return (
    typeof row.area_m2 === 'number' &&
    Number.isFinite(row.area_m2) &&
    typeof row.c === 'number' &&
    Number.isFinite(row.c)
  );
}

function rowLabel(row: SubArea, idx: number): string {
  return row.label && row.label.trim() ? row.label.trim() : `Zeile ${idx + 1}`;
}

/**
 * A138-10 Gl. 2 — A_C = Σ (A_E,b,a,i · C_i) + Σ (A_E,nb,a,i · C_i)
 *
 * Both paved and unpaved sub-areas contribute area·c to A_C. The split is
 * meaningful for the source's documentation but mathematically the sum is
 * over all rows.
 */
const a138_10_gl2: Aggregator = {
  run: (req) => {
    const carrier = req.aggregator?.subAreas;
    if (!carrier || !Array.isArray(carrier.rows) || carrier.rows.length === 0) {
      return {
        kind: 'manual_required',
        reason:
          'Keine Teilflächen erfasst. Bitte mindestens eine Zeile mit Fläche und Abflussbeiwert eingeben.',
      };
    }
    const incomplete = carrier.rows
      .map((r, i) => ({ r, i, ok: isComplete(r) }))
      .filter((x) => !x.ok);
    if (incomplete.length > 0) {
      const which = incomplete.map((x) => rowLabel(x.r, x.i)).join(', ');
      return {
        kind: 'manual_required',
        reason: `Unvollständige Teilflächen-Zeilen: ${which}. Fläche und Abflussbeiwert sind je Zeile Pflicht.`,
      };
    }

    let paved = 0;
    let unpaved = 0;
    const substituted: Record<string, number> = {};
    for (let i = 0; i < carrier.rows.length; i++) {
      const row = carrier.rows[i];
      const contribution = (row.area_m2 as number) * (row.c as number);
      if (row.kind === 'paved') paved += contribution;
      else unpaved += contribution;
      // Show each row's contribution in the substituted map so the badge
      // can render it.
      const k = `${rowLabel(row, i)} (${row.area_m2} · ${row.c})`;
      substituted[k] = contribution;
    }
    substituted['Σ befestigt'] = paved;
    substituted['Σ unbefestigt'] = unpaved;
    const total = paved + unpaved;

    return {
      kind: 'computed',
      value: total,
      substituted,
      formulaEvaluated:
        'A_C = Σ_paved(area · c) + Σ_unpaved(area · c)   (per-Teilflächen)',
      // No `rewrite` field — this isn't a string rewrite.
    };
  },
};

export const aggregators: Record<string, Aggregator> = {
  // DWA-A 138-1 · A138-10 · Gl. (2)
  '1a48af79-99a3-40cf-a3bc-23e2d1e9e2f3': a138_10_gl2,
};
