/**
 * Margin Guard (pure core) — the LIVE effective rate of a running project.
 *
 * The Angebots-Engine's `computeOfferMargin` is PLAN-side: Festpreis vs.
 * calculated hours. The guard is IST-side: it divides the net fee by the
 * hours actually logged (`effort_entries`) and warns BEFORE the project
 * drops below the cash-cost floor. Internal-only — nothing here may reach
 * a client document (same contract as ./margin.ts).
 *
 * Floor source: pricing model / survival strategy (vault
 * 01-Projects/ekowai-wizard/pricing-model.md) — €80/h cash-cost floor.
 */

/** Cash-cost floor: below this €/h the project runs at a real loss. */
export const CASH_COST_FLOOR_EUR_H = 80;

/** Warn band: amber once the live rate is within 25% above the floor. */
export const FLOOR_WARN_FACTOR = 1.25;

export type MarginGuardStatus = 'idle' | 'green' | 'amber' | 'red';

export type MarginGuardInput = {
  festpreisEur: number;
  /** Σ external pass-through costs (lab, Gutachter) — from the offer positions. */
  externalTotal: number;
  /** Σ calculated (Soll) hours across the offer's positions. */
  estimatedHours: number;
  /** Real hours logged on the project so far (effort_entries). */
  actualHours: number;
  floorEurPerHour?: number;
};

export type MarginGuardResult = {
  /** (Festpreis − externals) / actual hours. null until hours are logged. */
  liveRateEurPerHour: number | null;
  floorEurPerHour: number;
  /** floor × FLOOR_WARN_FACTOR — the amber threshold. */
  warnRateEurPerHour: number;
  /** Hours that may still be logged before the live rate hits the floor
   * (net/floor − actual). Negative values are clamped to 0. null when the
   * net fee is not positive. */
  remainingHoursAtFloor: number | null;
  /** true when actual hours exceed the calculated hours (and Soll > 0). */
  hoursOverrun: boolean;
  status: MarginGuardStatus;
  /** German, human-readable — the gauge shows these verbatim. */
  reasons: string[];
};

export function computeMarginGuard(input: MarginGuardInput): MarginGuardResult {
  const floor = input.floorEurPerHour ?? CASH_COST_FLOOR_EUR_H;
  const warnRate = floor * FLOOR_WARN_FACTOR;
  const net = input.festpreisEur - input.externalTotal;
  const actual = Number.isFinite(input.actualHours) && input.actualHours > 0 ? input.actualHours : 0;
  const soll = Number.isFinite(input.estimatedHours) && input.estimatedHours > 0 ? input.estimatedHours : 0;

  const remainingHoursAtFloor = net > 0 ? Math.max(0, net / floor - actual) : null;
  const hoursOverrun = soll > 0 && actual > soll;

  if (actual === 0) {
    return {
      liveRateEurPerHour: null,
      floorEurPerHour: floor,
      warnRateEurPerHour: warnRate,
      remainingHoursAtFloor,
      hoursOverrun: false,
      status: 'idle',
      reasons: ['Noch keine Ist-Stunden erfasst — die Live-Rate erscheint mit dem ersten Aufwandseintrag.'],
    };
  }

  const liveRate = net / actual;
  const reasons: string[] = [];
  let status: MarginGuardStatus = 'green';

  if (liveRate < floor) {
    status = 'red';
    reasons.push(
      net <= 0
        ? 'Externe Kosten übersteigen den Festpreis — das Projekt läuft ohne Deckungsbeitrag.'
        : `Live-Rate unter dem Cash-Cost-Floor (${floor} €/h) — das Projekt blutet Zeit.`,
    );
  } else if (liveRate < warnRate) {
    status = 'amber';
    reasons.push(`Live-Rate nähert sich dem Cash-Cost-Floor (${floor} €/h).`);
  }

  if (hoursOverrun) {
    if (status === 'green') status = 'amber';
    reasons.push('Ist-Stunden überschreiten die kalkulierten Stunden des Angebots.');
  }

  return {
    liveRateEurPerHour: liveRate,
    floorEurPerHour: floor,
    warnRateEurPerHour: warnRate,
    remainingHoursAtFloor,
    hoursOverrun,
    status,
    reasons,
  };
}
