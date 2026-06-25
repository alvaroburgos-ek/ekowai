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
