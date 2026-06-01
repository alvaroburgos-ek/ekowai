/** Minimal verification-progress bar in the Engineering Editorial style.
 * Hairline rule + a single filled segment. Percentage shown tabular. */
export function VerificationProgressBar({
  verified,
  total,
  label,
}: {
  verified: number;
  total: number;
  label?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((verified / total) * 100);
  return (
    <div className="inline-flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-1 bg-paper-2 border border-hairline rounded-sm overflow-hidden">
        <div
          className="h-full bg-success"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-mono tabular-nums text-ink-2 shrink-0">
        {verified}/{total}
      </span>
      {label && (
        <span className="text-[10px] uppercase tracking-[0.18em] text-subtext shrink-0">
          {label}
        </span>
      )}
    </div>
  );
}
