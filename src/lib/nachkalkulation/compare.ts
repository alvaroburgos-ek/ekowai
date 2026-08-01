/**
 * Nachkalkulation pure core (Slice E3 — projected vs. real, both sides).
 *
 * Two comparisons, no DB and no session dependency (mirrors the
 * margin/estimate pure/DB split; the `'use server'` module
 * `src/lib/actions/nachkalkulation.ts` wraps these with auth + reads):
 *
 * - `compareHours`  — YOUR side: offer positions (Soll-Stunden) vs. the
 *   effort log (Ist-Stunden), per position.
 * - `compareBids`   — the CLIENT's side: estimate lines (likely €) vs. real
 *   contractor bids, per position.
 *
 * Matching is case-insensitive on trimmed position names — the effort log's
 * `position` is free text, so "Versickerungsnachweis " and
 * "versickerungsnachweis" are the same position. Entries/bids that match no
 * position are never dropped: they aggregate into an explicit residue row
 * (honest residue is a deliverable).
 */

/** Label for effort entries whose position matches no offer position. */
export const UNMATCHED_POSITION_LABEL = 'Ohne Positionszuordnung';

/** Label for the totals row of both comparisons. */
export const TOTALS_LABEL = 'Gesamt';

/** Label for bids without / with unmatched position (project-level bids). */
export const PROJECT_LEVEL_BID_LABEL = 'Gesamtprojekt (Angebote ohne Positionszuordnung)';

/** |Δ %| at or above which a calibration suggestion is emitted. */
export const CALIBRATION_THRESHOLD_PCT = 20;

function normalizePosition(name: string): string {
  return name.trim().toLowerCase();
}

// =============================================================================
// Hours: offer positions (Soll) vs. effort entries (Ist)
// =============================================================================

export type HoursPositionInput = {
  position: string;
  estimatedHours: number;
};

export type EffortEntryInput = {
  position: string;
  hours: number;
};

export type HoursCompareRow = {
  position: string;
  estimated: number;
  actual: number;
  /** actual − estimated. */
  deltaHours: number;
  /** deltaHours / estimated × 100; null when estimated = 0 (no honest %). */
  deltaPct: number | null;
};

export type HoursComparison = {
  /**
   * One row per distinct offer position (first-appearance order, duplicate
   * names aggregated), then — only when present — the
   * UNMATCHED_POSITION_LABEL residue row for effort entries that matched
   * no position (estimated 0, deltaPct null).
   */
  rows: HoursCompareRow[];
  /** TOTALS_LABEL row summing every row above (residue included). */
  totals: HoursCompareRow;
};

function deltaPctOf(delta: number, base: number): number | null {
  return base > 0 ? (delta / base) * 100 : null;
}

/**
 * Per-position Soll/Ist hours comparison. Position names match
 * case-insensitively on trimmed text; effort entries matching no offer
 * position aggregate into the 'Ohne Positionszuordnung' row instead of
 * disappearing.
 */
export function compareHours(
  positions: ReadonlyArray<HoursPositionInput>,
  entries: ReadonlyArray<EffortEntryInput>,
): HoursComparison {
  // Aggregate estimated hours per normalized name, keep first-seen display name.
  const order: string[] = [];
  const byKey = new Map<string, { position: string; estimated: number; actual: number }>();
  for (const p of positions) {
    const key = normalizePosition(p.position);
    const acc = byKey.get(key);
    if (acc) {
      acc.estimated += Number.isFinite(p.estimatedHours) ? p.estimatedHours : 0;
    } else {
      order.push(key);
      byKey.set(key, {
        position: p.position.trim(),
        estimated: Number.isFinite(p.estimatedHours) ? p.estimatedHours : 0,
        actual: 0,
      });
    }
  }

  let unmatchedActual = 0;
  let hasUnmatched = false;
  for (const e of entries) {
    const hours = Number.isFinite(e.hours) ? e.hours : 0;
    const acc = byKey.get(normalizePosition(e.position));
    if (acc) {
      acc.actual += hours;
    } else {
      hasUnmatched = true;
      unmatchedActual += hours;
    }
  }

  const rows: HoursCompareRow[] = order.map((key) => {
    const { position, estimated, actual } = byKey.get(key)!;
    const deltaHours = actual - estimated;
    return { position, estimated, actual, deltaHours, deltaPct: deltaPctOf(deltaHours, estimated) };
  });

  if (hasUnmatched) {
    rows.push({
      position: UNMATCHED_POSITION_LABEL,
      estimated: 0,
      actual: unmatchedActual,
      deltaHours: unmatchedActual,
      deltaPct: null,
    });
  }

  const estimated = rows.reduce((s, r) => s + r.estimated, 0);
  const actual = rows.reduce((s, r) => s + r.actual, 0);
  const deltaHours = actual - estimated;
  const totals: HoursCompareRow = {
    position: TOTALS_LABEL,
    estimated,
    actual,
    deltaHours,
    deltaPct: deltaPctOf(deltaHours, estimated),
  };

  return { rows, totals };
}

// =============================================================================
// Bids: estimate lines (likely €) vs. real contractor bids
// =============================================================================

export type BidLineInput = {
  position: string;
  /**
   * The line's likely euro TOTAL (quantity × unit likely price) — callers
   * multiply before passing; a bid amount is absolute, so comparing it to a
   * unit price would be dishonest.
   */
  priceLikelyEur: number;
};

export type ContractorBidInput = {
  /** null = the bid was entered without a position (whole-project bid). */
  position: string | null;
  bidder: string;
  amountEur: number;
};

export type BidCompareRow = {
  position: string;
  /** Estimate likely € for this position (line totals aggregated). */
  likely: number;
  /** Lowest bid amount on this position; null when no bid was entered. */
  bestBid: number | null;
  /** Bidder of the best bid; null when no bid. */
  bidder: string | null;
  /** bestBid − likely; null when no bid. */
  deltaEur: number | null;
  /** deltaEur / likely × 100; null when no bid or likely = 0. */
  deltaPct: number | null;
};

export type BidsComparison = {
  /** One row per distinct estimate-line position (first-appearance order). */
  rows: BidCompareRow[];
  /**
   * Bids with null OR unmatched position, compared against the WHOLE
   * estimate's likely total (best such bid wins); null when there are none.
   */
  projectLevel: BidCompareRow | null;
  /**
   * TOTALS_LABEL row: estimate likely total vs. Σ best bid per position
   * (positions without a bid contribute nothing — with partial bid coverage
   * the delta is optimistic; the per-row nulls make the coverage visible).
   */
  totals: BidCompareRow;
};

/**
 * Per-position best-bid vs. likely-estimate comparison (the E3 feedback loop
 * on the client's side — the catalog learns from what it shows). Position
 * matching is case-insensitive on trimmed names; bids with a null or
 * unmatched position become the project-level comparison row.
 */
export function compareBids(
  lines: ReadonlyArray<BidLineInput>,
  bids: ReadonlyArray<ContractorBidInput>,
): BidsComparison {
  const order: string[] = [];
  const byKey = new Map<
    string,
    { position: string; likely: number; bestBid: number | null; bidder: string | null }
  >();
  for (const l of lines) {
    const key = normalizePosition(l.position);
    const acc = byKey.get(key);
    const likely = Number.isFinite(l.priceLikelyEur) ? l.priceLikelyEur : 0;
    if (acc) {
      acc.likely += likely;
    } else {
      order.push(key);
      byKey.set(key, { position: l.position.trim(), likely, bestBid: null, bidder: null });
    }
  }

  let projectBest: { amount: number; bidder: string } | null = null;
  let hasProjectLevelBid = false;
  for (const b of bids) {
    const amount = Number.isFinite(b.amountEur) ? b.amountEur : 0;
    const acc = b.position === null ? undefined : byKey.get(normalizePosition(b.position));
    if (acc) {
      if (acc.bestBid === null || amount < acc.bestBid) {
        acc.bestBid = amount;
        acc.bidder = b.bidder;
      }
    } else {
      hasProjectLevelBid = true;
      if (projectBest === null || amount < projectBest.amount) {
        projectBest = { amount, bidder: b.bidder };
      }
    }
  }

  const toRow = (r: {
    position: string;
    likely: number;
    bestBid: number | null;
    bidder: string | null;
  }): BidCompareRow => {
    const deltaEur = r.bestBid !== null ? r.bestBid - r.likely : null;
    return {
      ...r,
      deltaEur,
      deltaPct: deltaEur !== null ? deltaPctOf(deltaEur, r.likely) : null,
    };
  };

  const rows = order.map((key) => toRow(byKey.get(key)!));

  const likelyTotal = rows.reduce((s, r) => s + r.likely, 0);

  const projectLevel: BidCompareRow | null = hasProjectLevelBid
    ? toRow({
        position: PROJECT_LEVEL_BID_LABEL,
        likely: likelyTotal,
        bestBid: projectBest?.amount ?? null,
        bidder: projectBest?.bidder ?? null,
      })
    : null;

  const rowsWithBids = rows.filter((r) => r.bestBid !== null);
  const bestBidSum = rowsWithBids.length > 0
    ? rowsWithBids.reduce((s, r) => s + (r.bestBid ?? 0), 0)
    : null;
  const totals = toRow({
    position: TOTALS_LABEL,
    likely: likelyTotal,
    bestBid: bestBidSum,
    bidder: null,
  });

  return { rows, projectLevel, totals };
}

// =============================================================================
// Calibration suggestions
// =============================================================================

function fmtDe(v: number): string {
  return v.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}

/**
 * German suggestion strings for positions whose real hours deviate from the
 * template estimate by at least CALIBRATION_THRESHOLD_PCT (and where real
 * work happened: actual > 0).
 *
 * SUGGESTIONS ONLY — nothing here is ever auto-applied. The addendum's
 * "after 2–3 jobs the template hours self-correct" (§1.5) happens by the
 * OWNER reading these Hinweise and editing the position templates; the
 * Wizard never rewrites an estimate on its own. Rows with `deltaPct === null`
 * (unmatched residue, estimated 0) are skipped — there is no template hour
 * to calibrate against.
 */
export function calibrationSuggestions(
  hoursRows: ReadonlyArray<HoursCompareRow>,
): string[] {
  const suggestions: string[] = [];
  for (const r of hoursRows) {
    if (r.deltaPct === null) continue;
    if (!(r.actual > 0)) continue;
    if (Math.abs(r.deltaPct) < CALIBRATION_THRESHOLD_PCT) continue;
    const sign = r.deltaPct >= 0 ? '+' : '';
    suggestions.push(
      `Position '${r.position}': Vorlage ${fmtDe(r.estimated)}h → real ${fmtDe(r.actual)}h `
      + `(Δ${sign}${fmtDe(r.deltaPct)}%)`,
    );
  }
  return suggestions;
}
