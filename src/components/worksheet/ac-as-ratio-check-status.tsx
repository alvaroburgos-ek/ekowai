'use client';

/**
 * AcAsRatioCheckStatus — four-state visual badge for the A138-12 Tab.6
 * loading-check result (ac_as_ratio_check + ac_as_ratio_check_reason).
 *
 * This is a pure display component — it renders NO editable controls. It is
 * used by DynamicField (via the `checkStatusOverride` slot) when the field
 * symbol is `ac_as_ratio_check`, replacing the default read-only text input.
 *
 * Four states:
 *   pass          → green "bestanden"           (ratio ≤ Grenzwert)
 *   fail          → red "nicht bestanden"       (ratio > Grenzwert)
 *   not_applicable → amber "nicht anwendbar" + reason  (no numeric limit OR
 *                    behördlich — reason text distinguishes both sub-cases)
 *   indeterminate  → grey "unbestimmt" + reason (Flächengruppe missing /
 *                    A_C or A_S,m missing)
 *
 * Tokens used:
 *   pass          → text-success + bg-success/10 + border-success/30
 *   fail          → text-error   + bg-error/10   + border-error/30
 *   not_applicable → text-warning + bg-warning/10 + border-warning/30
 *   indeterminate  → text-subtext + bg-paper-2    + border-hairline-strong
 */

export type AcAsRatioStatus = 'pass' | 'fail' | 'not_applicable' | 'indeterminate';

type Props = {
  status: AcAsRatioStatus | string;
  reason: string | null;
  /** When true, renders the null-limit notice (data-testid="ac-as-ratio-limit-null"). */
  limitIsNull?: boolean;
};

const STATE_CONFIG: Record<
  AcAsRatioStatus,
  { label: string; badgeClass: string; showReason: boolean }
> = {
  pass: {
    label: 'bestanden',
    badgeClass:
      'text-success bg-success/10 border-success/30',
    showReason: false,
  },
  fail: {
    label: 'nicht bestanden',
    badgeClass:
      'text-error bg-error/10 border-error/30',
    showReason: false,
  },
  not_applicable: {
    label: 'nicht anwendbar',
    badgeClass:
      'text-warning bg-warning/10 border-warning/30',
    showReason: true,
  },
  indeterminate: {
    label: 'unbestimmt',
    badgeClass:
      'text-subtext bg-paper-2 border-hairline-strong',
    showReason: true,
  },
};

export function AcAsRatioCheckStatus({ status, reason, limitIsNull = false }: Props) {
  const cfg =
    STATE_CONFIG[status as AcAsRatioStatus] ?? STATE_CONFIG.indeterminate;

  return (
    <div className="space-y-1.5" data-testid="ac-as-ratio-check-status">
      <span
        data-testid="ac-as-ratio-check-badge"
        data-status={status}
        className={`inline-flex items-center px-2.5 py-1 rounded border text-xs font-semibold tracking-wide ${cfg.badgeClass}`}
      >
        {cfg.label}
      </span>

      {cfg.showReason && reason && (
        <p className="text-xs text-subtext leading-snug">{reason}</p>
      )}

      {limitIsNull && (
        <p
          data-testid="ac-as-ratio-limit-null"
          className="text-xs text-subtext italic"
        >
          — (kein Tab.6-Grenzwert)
        </p>
      )}
    </div>
  );
}
