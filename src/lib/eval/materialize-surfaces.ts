import { normalizeSurfaceCarrier, summarizeSurfaces } from './surface-inventory';

export type SurfaceOutputs = Record<'A_C' | 'C_m' | 'A_E_ba' | 'A_E_nba', number | null>;

/** Pure carrier → the four derived scalars. Single source via summarizeSurfaces.
 * Null per field when not computable (clears stale downstream rows on save). */
export function materializeSurfaceOutputs(carrierRaw: unknown): SurfaceOutputs {
  const s = summarizeSurfaces(normalizeSurfaceCarrier(carrierRaw));
  return { A_C: s.A_C, C_m: s.C_m, A_E_ba: s.A_E_ba, A_E_nba: s.A_E_nba };
}
