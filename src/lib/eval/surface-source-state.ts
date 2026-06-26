import { normalizeSurfaceCarrier, summarizeSurfaces } from './surface-inventory';

const READY_STATUSES = new Set(['engineer_approved', 'final']);

export type SurfaceSourceState = {
  state: 'missing' | 'incomplete' | 'ok';
  complete: number;
  total: number;
  message: string | null;
};

/** Decide whether A138-10's inherited A_C/C_m should render or blank-with-cause.
 * `ok` requires every row complete AND the source instance approved/final. */
export function surfaceSourceState(carrierRaw: unknown, sourceStatus: string | null): SurfaceSourceState {
  const carrier = normalizeSurfaceCarrier(carrierRaw);
  const sum = summarizeSurfaces(carrier);
  if (sum.total === 0) {
    return { state: 'missing', complete: 0, total: 0, message: 'Quelle A138-07 nicht erfasst — abgeleitete Werte ausgeblendet.' };
  }
  const allComplete = sum.complete === sum.total;
  const ready = allComplete && sourceStatus != null && READY_STATUSES.has(sourceStatus);
  if (ready) return { state: 'ok', complete: sum.complete, total: sum.total, message: null };
  return {
    state: 'incomplete',
    complete: sum.complete,
    total: sum.total,
    message: `Quelle A138-07 nicht final (${sum.complete}/${sum.total} Zeilen vollständig) — abgeleitete Werte ausgeblendet.`,
  };
}

/** The surface-DERIVED output symbols A138-07 produces (Gl. 2 + C_m + area
 * totals). Used to gate the VALUE (not just the banner): when the source isn't
 * `ok`, these must be withheld from a consumer so the engine never computes off
 * an unapproved value and the displayed value matches the banner. */
export const SURFACE_DERIVED_SYMBOLS = ['A_C', 'C_m', 'A_E_ba', 'A_E_nba'] as const;

/** Field ids a CONSUMER worksheet must withhold (drop from its seeded values)
 * when the surface source isn't `ok`: the surface-derived symbols that were
 * inherited FROM the source owner. Returns [] when ready or owner unknown.
 * Atomic inputs inherited from the owner are NOT withheld — only derived values. */
export function surfaceWithholdFieldIds(
  fields: ReadonlyArray<{ id: string; symbol: string }>,
  inheritedFromBySymbol: Record<string, string>,
  ownerCode: string | null,
  state: SurfaceSourceState['state'],
): string[] {
  if (state === 'ok' || !ownerCode) return [];
  const derived = new Set<string>(SURFACE_DERIVED_SYMBOLS);
  return fields
    .filter((f) => derived.has(f.symbol) && inheritedFromBySymbol[f.symbol] === ownerCode)
    .map((f) => f.id);
}
