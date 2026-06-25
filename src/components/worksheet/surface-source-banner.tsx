import type { SurfaceSourceState } from '@/lib/eval/surface-source-state';

export function SurfaceSourceBanner({ state }: { state: SurfaceSourceState }) {
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
