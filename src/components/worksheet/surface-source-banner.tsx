import type { CarrierSourceState } from '@/lib/eval/carrier-source-state';

/** Upstream-cause banner for a CONSUMED register carrier (any register since
 * Plan 2b Task 3; the A138-07 `SurfaceSourceState` shim is the same shape). */
export function SurfaceSourceBanner({ state }: { state: CarrierSourceState }) {
  if (state.state === 'ok' || !state.message) return null;
  return (
    <div
      data-testid="surface-source-banner"
      role="status"
      className="border border-warning/40 bg-warning/10 text-ink rounded px-3 py-2 text-sm"
    >
      {state.message}
    </div>
  );
}
