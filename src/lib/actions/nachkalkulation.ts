'use server';

import { db } from '@/lib/db';
import {
  offers,
  offerPositions,
  costEstimates,
  costEstimateLines,
  contractorBids,
  effortEntries,
} from '@/lib/db/schema';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { userHasProjectAccess } from '@/lib/db/queries/worksheet';
import {
  compareHours,
  compareBids,
  calibrationSuggestions,
  type HoursComparison,
  type BidsComparison,
} from '@/lib/nachkalkulation/compare';
import { toNum } from '@/lib/offers/margin';

/**
 * Nachkalkulation server actions (Slice E3 — projected vs. real, both sides).
 * READ-ONLY: nothing here writes, revalidates, or auto-applies anything —
 * the comparison is a mirror, calibration stays a manual owner decision.
 * Auth idiom mirrors effort.ts: `db` runs as postgres and bypasses RLS, so
 * the org-membership join inside `userHasProjectAccess` IS the access check.
 */

export type OfferNachkalkulationView = {
  offerId: string;
  title: string;
  status: string;
  hours: HoursComparison;
  /** German Hinweise — never auto-applied (see calibrationSuggestions). */
  suggestions: string[];
};

export type OfferNachkalkulationResult = {
  /** Total real hours logged on the project (context for the comparison). */
  totalLoggedHours: number;
  offers: OfferNachkalkulationView[];
};

export type EstimateNachkalkulationView = {
  estimateId: string;
  title: string;
  status: string;
  bids: BidsComparison;
  /** How many contractor bids were counted against this estimate. */
  bidCount: number;
};

export type EstimateNachkalkulationResult = {
  estimates: EstimateNachkalkulationView[];
};

/** Resolve the session user id or throw (mirrors effort.ts). */
async function requireSessionUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated');
  return auth.user.id;
}

/**
 * YOUR side of E3: per offer, Soll-Stunden (offer positions) vs. Ist-Stunden
 * (effort log), plus calibration Hinweise. The project's ONE effort log is
 * compared against EACH offer's positions — with several offers the same
 * real hours appear next to each, which is honest: the log is per project,
 * not per offer.
 */
export async function getOfferNachkalkulation(
  projectId: string,
): Promise<OfferNachkalkulationResult> {
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  const offerRows = await db
    .select({ id: offers.id, title: offers.title, status: offers.status })
    .from(offers)
    .where(eq(offers.projectId, projectId))
    .orderBy(desc(offers.createdAt));

  const offerIds = offerRows.map((o) => o.id);
  const positionRows = offerIds.length === 0
    ? []
    : await db
      .select({
        offerId: offerPositions.offerId,
        position: offerPositions.position,
        estimatedHours: offerPositions.estimatedHours,
      })
      .from(offerPositions)
      .where(inArray(offerPositions.offerId, offerIds))
      .orderBy(asc(offerPositions.orderIndex));

  const entryRows = await db
    .select({ position: effortEntries.position, hours: effortEntries.hours })
    .from(effortEntries)
    .where(eq(effortEntries.projectId, projectId));

  const entries = entryRows.map((e) => ({
    position: e.position,
    hours: toNum(e.hours) ?? 0,
  }));
  const totalLoggedHours = entries.reduce((s, e) => s + e.hours, 0);

  const positionsByOffer = new Map<string, { position: string; estimatedHours: number }[]>();
  for (const p of positionRows) {
    const list = positionsByOffer.get(p.offerId) ?? [];
    list.push({ position: p.position, estimatedHours: toNum(p.estimatedHours) ?? 0 });
    positionsByOffer.set(p.offerId, list);
  }

  const offerViews: OfferNachkalkulationView[] = offerRows.map((o) => {
    const hours = compareHours(positionsByOffer.get(o.id) ?? [], entries);
    return {
      offerId: o.id,
      title: o.title,
      status: o.status,
      hours,
      suggestions: calibrationSuggestions(hours.rows),
    };
  });

  return { totalLoggedHours, offers: offerViews };
}

/**
 * The CLIENT's side of E3: per estimate, likely line totals vs. real
 * contractor bids. A bid counts against the estimate it was entered on;
 * bids without an estimateId are project-wide and count against EVERY
 * estimate (they were entered before/independent of a specific Schätzung).
 * Line likely = quantity × likely unit price (bid amounts are absolute).
 */
export async function getEstimateNachkalkulation(
  projectId: string,
): Promise<EstimateNachkalkulationResult> {
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  const estimateRows = await db
    .select({
      id: costEstimates.id,
      title: costEstimates.title,
      status: costEstimates.status,
    })
    .from(costEstimates)
    .where(eq(costEstimates.projectId, projectId))
    .orderBy(desc(costEstimates.createdAt));

  const estimateIds = estimateRows.map((e) => e.id);
  const lineRows = estimateIds.length === 0
    ? []
    : await db
      .select({
        estimateId: costEstimateLines.estimateId,
        position: costEstimateLines.position,
        quantity: costEstimateLines.quantity,
        priceLikelyEur: costEstimateLines.priceLikelyEur,
      })
      .from(costEstimateLines)
      .where(inArray(costEstimateLines.estimateId, estimateIds))
      .orderBy(asc(costEstimateLines.orderIndex));

  const bidRows = await db
    .select({
      estimateId: contractorBids.estimateId,
      bidder: contractorBids.bidder,
      position: contractorBids.position,
      amountEur: contractorBids.amountEur,
    })
    .from(contractorBids)
    .where(eq(contractorBids.projectId, projectId))
    .orderBy(desc(contractorBids.createdAt));

  const linesByEstimate = new Map<string, { position: string; priceLikelyEur: number }[]>();
  for (const l of lineRows) {
    const list = linesByEstimate.get(l.estimateId) ?? [];
    list.push({
      position: l.position,
      // Line likely TOTAL — a bid amount is absolute, never a unit price.
      priceLikelyEur: (toNum(l.quantity) ?? 0) * (toNum(l.priceLikelyEur) ?? 0),
    });
    linesByEstimate.set(l.estimateId, list);
  }

  const estimates: EstimateNachkalkulationView[] = estimateRows.map((e) => {
    const relevantBids = bidRows
      .filter((b) => b.estimateId === e.id || b.estimateId === null)
      .map((b) => ({
        position: b.position,
        bidder: b.bidder,
        amountEur: toNum(b.amountEur) ?? 0,
      }));
    return {
      estimateId: e.id,
      title: e.title,
      status: e.status,
      bids: compareBids(linesByEstimate.get(e.id) ?? [], relevantBids),
      bidCount: relevantBids.length,
    };
  });

  return { estimates };
}
