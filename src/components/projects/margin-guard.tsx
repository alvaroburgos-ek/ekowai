'use client';

/**
 * Margin Guard gauge — the "No Mental Math" screen (internal-only).
 *
 * Shows the LIVE effective rate of an offer: (Festpreis − externals) divided
 * by the hours actually logged on the project, against the €80/h cash-cost
 * floor. Pure presentational — all rules live in lib/offers/margin-guard.ts.
 * The effort log is per PROJECT (not per offer), so with several offers the
 * same Ist-hours appear on each card — same honesty rule as Nachkalkulation.
 */
import { useMemo } from 'react';
import {
  computeMarginGuard,
  type MarginGuardStatus,
} from '@/lib/offers/margin-guard';

type Props = {
  festpreisEur: number;
  externalTotal: number;
  estimatedHours: number;
  actualHours: number;
};

const STATUS_TEXT: Record<MarginGuardStatus, string> = {
  idle: 'text-subtext',
  green: 'text-success',
  amber: 'text-warning',
  red: 'text-error',
};

const STATUS_LABEL: Record<MarginGuardStatus, string> = {
  idle: 'keine Ist-Stunden',
  green: 'im grünen Bereich',
  amber: 'Floor in Sicht',
  red: 'unter dem Floor',
};

function fmtNum(v: number, digits = 1): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(v);
}

export function MarginGuard({ festpreisEur, externalTotal, estimatedHours, actualHours }: Props) {
  const g = useMemo(
    () => computeMarginGuard({ festpreisEur, externalTotal, estimatedHours, actualHours }),
    [festpreisEur, externalTotal, estimatedHours, actualHours],
  );

  // Scale: floor sits at 40% of the track so both the red zone and a healthy
  // green rate stay readable; everything past scaleMax clamps to 100%.
  const scaleMax = g.floorEurPerHour * 2.5;
  const pct = (v: number) => Math.min(100, Math.max(0, (v / scaleMax) * 100));
  const livePct = g.liveRateEurPerHour === null ? null : pct(g.liveRateEurPerHour);

  return (
    <div
      data-testid="margin-guard"
      data-status={g.status}
      className="rounded-xl border border-hairline bg-paper-2/40 p-3 space-y-2"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">
            Margin Guard · live
          </span>
          <span
            data-testid="margin-guard-rate"
            className={`tabular-nums text-2xl font-semibold ${STATUS_TEXT[g.status]}`}
          >
            {g.liveRateEurPerHour === null ? '—' : `${fmtNum(g.liveRateEurPerHour, 0)} €/h`}
          </span>
          <span className={`text-xs ${STATUS_TEXT[g.status]}`}>{STATUS_LABEL[g.status]}</span>
        </div>
        <span className="text-[11px] text-subtext tabular-nums">
          {`Floor ${fmtNum(g.floorEurPerHour, 0)} €/h`}
        </span>
      </div>

      {/* Track: red zone → warn zone → green zone, with the live marker. */}
      <div className="relative h-2 rounded-full overflow-hidden bg-paper-2" aria-hidden="true">
        <div
          className="absolute inset-y-0 left-0 bg-error/25"
          style={{ width: `${pct(g.floorEurPerHour)}%` }}
        />
        <div
          className="absolute inset-y-0 bg-warning/25"
          style={{ left: `${pct(g.floorEurPerHour)}%`, width: `${pct(g.warnRateEurPerHour) - pct(g.floorEurPerHour)}%` }}
        />
        <div
          className="absolute inset-y-0 bg-success/20"
          style={{ left: `${pct(g.warnRateEurPerHour)}%`, right: 0 }}
        />
        {livePct !== null && (
          <div
            data-testid="margin-guard-marker"
            className="absolute inset-y-0 w-0.5 bg-ink"
            style={{ left: `calc(${livePct}% - 1px)` }}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-subtext tabular-nums">
        <span>{`Ist ${fmtNum(actualHours)} h`}</span>
        {estimatedHours > 0 && <span>{`Soll ${fmtNum(estimatedHours)} h`}</span>}
        {g.remainingHoursAtFloor !== null && g.status !== 'red' && (
          <span data-testid="margin-guard-runway">
            {`noch ${fmtNum(g.remainingHoursAtFloor)} h bis zum Floor`}
          </span>
        )}
      </div>

      {g.reasons.length > 0 && (
        <ul className="text-[11px] text-subtext space-y-0.5">
          {g.reasons.map((r, i) => (
            <li key={i}>· {r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
