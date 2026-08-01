'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  costItems,
  costEstimates,
  costEstimateLines,
  contractorBids,
  orgMembers,
  projects,
} from '@/lib/db/schema';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { userHasProjectAccess } from '@/lib/db/queries/worksheet';
import { loadValuetableData } from '@/lib/pdf/load-valuetable';
import {
  buildEstimateTotals,
  stalePriceWarnings,
  addCostItemSchema,
  createEstimateSchema,
  addEstimateLineSchema,
  updateContingencySchema,
  addContractorBidSchema,
  CONTINGENCY_DEFAULT_PCT,
  type EstimateTotals,
  type StalePriceWarning,
} from '@/lib/costs/estimate';
import { toNum } from '@/lib/offers/margin';

/**
 * Parametrische Kostenschätzung server actions (Slice E2 — the CLIENT's
 * build cost, a deliverable). Auth idiom mirrors offers.ts: `db` runs as
 * postgres and bypasses RLS, so the org-membership join inside
 * `userHasProjectAccess` IS the access check.
 *
 * Honesty rules the actions enforce:
 * - the catalog ships EMPTY and only grows through addCostItem, whose zod
 *   schema REQUIRES source + priceDate — no price without provenance;
 * - line prices are a FROZEN COPY of the catalog item at add time;
 * - contingency is bounded 5–15 % and can never be nulled;
 * - createEstimate stores the approve-snapshot id the quantities are
 *   version-locked to (or null, honestly, when there is none).
 */

export type CostItemView = {
  id: string;
  position: string;
  unit: string | null;
  /** numeric columns — Drizzle returns them as strings */
  priceLowEur: string | null;
  priceLikelyEur: string | null;
  priceHighEur: string | null;
  source: string;
  priceDate: string;
  din276Group: string | null;
  note: string | null;
};

export type EstimateLineView = {
  id: string;
  costItemId: string | null;
  position: string;
  quantity: string;
  unit: string | null;
  sourceSymbol: string | null;
  priceLowEur: string;
  priceLikelyEur: string;
  priceHighEur: string;
  din276Group: string | null;
  orderIndex: number;
  /** Provenance of the frozen price (joined from the catalog; null = manual line). */
  priceSource: string | null;
  priceDate: string | null;
};

export type EstimateView = {
  id: string;
  title: string;
  standardCode: string | null;
  status: string;
  contingencyPct: string;
  snapshotId: string | null;
  createdAt: Date;
  lines: EstimateLineView[];
  totals: EstimateTotals;
  staleWarnings: StalePriceWarning[];
};

export type ContractorBidView = {
  id: string;
  estimateId: string | null;
  bidder: string;
  position: string | null;
  amountEur: string;
  bidDate: string | null;
  note: string | null;
};

export type ListEstimatesResult = {
  orgId: string;
  estimates: EstimateView[];
  /** Active org catalog (may be EMPTY — it grows from real prices only). */
  catalog: CostItemView[];
  bids: ContractorBidView[];
};

/** Resolve the session user id or throw (mirrors offers.ts). */
async function requireSessionUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated');
  return auth.user.id;
}

function revalidateOverview() {
  // The cost-estimate panel renders on the project overview page.
  revalidatePath('/[locale]/projects/[id]', 'page');
}

/** Membership check for org-scoped catalog operations. */
async function userIsOrgMember(orgId: string, userId: string): Promise<boolean> {
  const [member] = await db
    .select({ userId: orgMembers.userId })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.orgId, orgId)))
    .limit(1);
  return !!member;
}

/** Resolve an estimate's projectId or throw. */
async function requireEstimateProjectId(estimateId: string): Promise<string> {
  const [row] = await db
    .select({ projectId: costEstimates.projectId })
    .from(costEstimates)
    .where(eq(costEstimates.id, estimateId))
    .limit(1);
  if (!row) throw new Error('Kostenschätzung nicht gefunden');
  return row.projectId;
}

// =============================================================================
// Catalog CRUD (org-scoped)
// =============================================================================

export async function addCostItem(input: {
  orgId: string;
  position: string;
  unit?: string;
  priceLowEur: number;
  priceLikelyEur: number;
  priceHighEur: number;
  source: string;
  priceDate: string;
  din276Group?: string;
  note?: string;
}): Promise<{ id: string }> {
  const parsed = addCostItemSchema.parse(input);
  const userId = await requireSessionUserId();
  if (!(await userIsOrgMember(parsed.orgId, userId))) {
    throw new Error('Forbidden: user is not a member of this org');
  }

  const [row] = await db
    .insert(costItems)
    .values({
      orgId: parsed.orgId,
      position: parsed.position,
      unit: parsed.unit && parsed.unit !== '' ? parsed.unit : null,
      priceLowEur: String(parsed.priceLowEur),
      priceLikelyEur: String(parsed.priceLikelyEur),
      priceHighEur: String(parsed.priceHighEur),
      source: parsed.source,
      priceDate: parsed.priceDate,
      din276Group: parsed.din276Group && parsed.din276Group !== '' ? parsed.din276Group : null,
      note: parsed.note && parsed.note !== '' ? parsed.note : null,
    })
    .returning({ id: costItems.id });

  revalidateOverview();
  return { id: row.id };
}

export async function listCostItems(orgId: string): Promise<CostItemView[]> {
  const userId = await requireSessionUserId();
  if (!(await userIsOrgMember(orgId, userId))) {
    throw new Error('Forbidden: user is not a member of this org');
  }

  return db
    .select({
      id: costItems.id,
      position: costItems.position,
      unit: costItems.unit,
      priceLowEur: costItems.priceLowEur,
      priceLikelyEur: costItems.priceLikelyEur,
      priceHighEur: costItems.priceHighEur,
      source: costItems.source,
      priceDate: costItems.priceDate,
      din276Group: costItems.din276Group,
      note: costItems.note,
    })
    .from(costItems)
    .where(and(eq(costItems.orgId, orgId), eq(costItems.active, true)))
    .orderBy(asc(costItems.position));
}

export async function deactivateCostItem(id: string): Promise<void> {
  const [item] = await db
    .select({ orgId: costItems.orgId })
    .from(costItems)
    .where(eq(costItems.id, id))
    .limit(1);
  if (!item) return; // already gone — nothing to deactivate

  const userId = await requireSessionUserId();
  if (!(await userIsOrgMember(item.orgId, userId))) {
    throw new Error('Forbidden: user is not a member of this org');
  }

  await db.update(costItems).set({ active: false }).where(eq(costItems.id, id));
  revalidateOverview();
}

// =============================================================================
// Estimates
// =============================================================================

export async function createEstimate(input: {
  projectId: string;
  title: string;
  standardCode?: string;
  contingencyPct?: number;
}): Promise<{ id: string; snapshotId: string | null }> {
  const parsed = createEstimateSchema.parse(input);
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(parsed.projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  // Version-lock: resolve the latest approve-snapshot for the standard the
  // quantities will come from. Deliberately NO line prefill — quantities are
  // picked per line (with sourceSymbol provenance), prices come from the
  // catalog or manual entry, never guessed here. Snapshot resolution is
  // best-effort: an unknown standardCode or unapproved worksheets honestly
  // yield null (the PDF then states there is no locked calculation state).
  let snapshotId: string | null = null;
  const standardCode =
    parsed.standardCode && parsed.standardCode !== '' ? parsed.standardCode : null;
  if (standardCode) {
    try {
      const vt = await loadValuetableData(parsed.projectId, standardCode);
      snapshotId = vt.snapshotId;
    } catch {
      snapshotId = null;
    }
  }

  const [row] = await db
    .insert(costEstimates)
    .values({
      projectId: parsed.projectId,
      title: parsed.title,
      standardCode,
      contingencyPct: String(parsed.contingencyPct ?? CONTINGENCY_DEFAULT_PCT),
      snapshotId,
      createdBy: userId,
    })
    .returning({ id: costEstimates.id });

  revalidateOverview();
  return { id: row.id, snapshotId };
}

export async function addEstimateLine(input: {
  estimateId: string;
  costItemId?: string;
  position: string;
  quantity: number;
  unit?: string;
  sourceSymbol?: string;
  priceLowEur?: number;
  priceLikelyEur?: number;
  priceHighEur?: number;
  din276Group?: string;
}): Promise<{ id: string }> {
  const parsed = addEstimateLineSchema.parse(input);
  const projectId = await requireEstimateProjectId(parsed.estimateId);
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  // Frozen copy: when a catalog item is given, its prices/unit/KG are copied
  // into the line AT ADD TIME — the catalog can move on, the estimate stays.
  let priceLow = parsed.priceLowEur;
  let priceLikely = parsed.priceLikelyEur;
  let priceHigh = parsed.priceHighEur;
  let unit = parsed.unit && parsed.unit !== '' ? parsed.unit : null;
  let din276Group =
    parsed.din276Group && parsed.din276Group !== '' ? parsed.din276Group : null;

  if (parsed.costItemId !== undefined) {
    const [item] = await db
      .select({
        priceLowEur: costItems.priceLowEur,
        priceLikelyEur: costItems.priceLikelyEur,
        priceHighEur: costItems.priceHighEur,
        unit: costItems.unit,
        din276Group: costItems.din276Group,
      })
      .from(costItems)
      .where(eq(costItems.id, parsed.costItemId))
      .limit(1);
    if (!item) throw new Error('Katalog-Position nicht gefunden');
    priceLow = toNum(item.priceLowEur) ?? priceLow ?? 0;
    priceLikely = toNum(item.priceLikelyEur) ?? priceLikely ?? 0;
    priceHigh = toNum(item.priceHighEur) ?? priceHigh ?? 0;
    unit = unit ?? item.unit;
    din276Group = din276Group ?? item.din276Group;
  }

  if (priceLow === undefined || priceLikely === undefined || priceHigh === undefined) {
    // Unreachable given the zod refine, but the invariant is worth guarding.
    throw new Error('Preise (niedrig/wahrscheinlich/hoch) erforderlich');
  }

  // Append at the end of the estimate's line list (mirrors offer positions).
  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${costEstimateLines.orderIndex}), -1)` })
    .from(costEstimateLines)
    .where(eq(costEstimateLines.estimateId, parsed.estimateId));

  const [row] = await db
    .insert(costEstimateLines)
    .values({
      estimateId: parsed.estimateId,
      costItemId: parsed.costItemId ?? null,
      position: parsed.position,
      quantity: String(parsed.quantity),
      unit,
      sourceSymbol:
        parsed.sourceSymbol && parsed.sourceSymbol !== '' ? parsed.sourceSymbol : null,
      priceLowEur: String(priceLow),
      priceLikelyEur: String(priceLikely),
      priceHighEur: String(priceHigh),
      din276Group,
      orderIndex: Number(maxOrder) + 1,
    })
    .returning({ id: costEstimateLines.id });

  revalidateOverview();
  return { id: row.id };
}

export async function deleteEstimateLine(id: string): Promise<void> {
  const [line] = await db
    .select({ estimateId: costEstimateLines.estimateId })
    .from(costEstimateLines)
    .where(eq(costEstimateLines.id, id))
    .limit(1);
  if (!line) return; // already gone — nothing to delete

  const projectId = await requireEstimateProjectId(line.estimateId);
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  await db.delete(costEstimateLines).where(eq(costEstimateLines.id, id));
  revalidateOverview();
}

/** Contingency stays inside 5–15 % — it can be tuned, never removed. */
export async function updateContingency(input: {
  estimateId: string;
  contingencyPct: number;
}): Promise<void> {
  const parsed = updateContingencySchema.parse(input);
  const projectId = await requireEstimateProjectId(parsed.estimateId);
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  await db
    .update(costEstimates)
    .set({ contingencyPct: String(parsed.contingencyPct), updatedAt: new Date() })
    .where(eq(costEstimates.id, parsed.estimateId));
  revalidateOverview();
}

// =============================================================================
// Contractor bids (E3 feedback loop — real numbers against the estimate)
// =============================================================================

export async function addContractorBid(input: {
  projectId: string;
  estimateId?: string;
  bidder: string;
  position?: string;
  amountEur: number;
  bidDate?: string;
  note?: string;
}): Promise<{ id: string }> {
  const parsed = addContractorBidSchema.parse(input);
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(parsed.projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  const [row] = await db
    .insert(contractorBids)
    .values({
      projectId: parsed.projectId,
      estimateId: parsed.estimateId ?? null,
      bidder: parsed.bidder,
      position: parsed.position && parsed.position !== '' ? parsed.position : null,
      amountEur: String(parsed.amountEur),
      bidDate: parsed.bidDate ?? null,
      note: parsed.note && parsed.note !== '' ? parsed.note : null,
    })
    .returning({ id: contractorBids.id });

  revalidateOverview();
  return { id: row.id };
}

export async function listContractorBids(projectId: string): Promise<ContractorBidView[]> {
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  return db
    .select({
      id: contractorBids.id,
      estimateId: contractorBids.estimateId,
      bidder: contractorBids.bidder,
      position: contractorBids.position,
      amountEur: contractorBids.amountEur,
      bidDate: contractorBids.bidDate,
      note: contractorBids.note,
    })
    .from(contractorBids)
    .where(eq(contractorBids.projectId, projectId))
    .orderBy(desc(contractorBids.createdAt));
}

// =============================================================================
// List (panel payload: estimates + computed totals + catalog + bids)
// =============================================================================

export async function listEstimates(projectId: string): Promise<ListEstimatesResult> {
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  const [proj] = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!proj) throw new Error('Projekt nicht gefunden');

  const estimateRows = await db
    .select({
      id: costEstimates.id,
      title: costEstimates.title,
      standardCode: costEstimates.standardCode,
      status: costEstimates.status,
      contingencyPct: costEstimates.contingencyPct,
      snapshotId: costEstimates.snapshotId,
      createdAt: costEstimates.createdAt,
    })
    .from(costEstimates)
    .where(eq(costEstimates.projectId, projectId))
    .orderBy(desc(costEstimates.createdAt));

  const estimateIds = estimateRows.map((e) => e.id);
  const lineRows = estimateIds.length === 0
    ? []
    : await db
      .select({
        id: costEstimateLines.id,
        estimateId: costEstimateLines.estimateId,
        costItemId: costEstimateLines.costItemId,
        position: costEstimateLines.position,
        quantity: costEstimateLines.quantity,
        unit: costEstimateLines.unit,
        sourceSymbol: costEstimateLines.sourceSymbol,
        priceLowEur: costEstimateLines.priceLowEur,
        priceLikelyEur: costEstimateLines.priceLikelyEur,
        priceHighEur: costEstimateLines.priceHighEur,
        din276Group: costEstimateLines.din276Group,
        orderIndex: costEstimateLines.orderIndex,
        // Price provenance for staleness — joined, NOT frozen (the question
        // "is this price stale?" is always asked against the living catalog).
        priceSource: costItems.source,
        priceDate: costItems.priceDate,
      })
      .from(costEstimateLines)
      .leftJoin(costItems, eq(costItems.id, costEstimateLines.costItemId))
      .where(inArray(costEstimateLines.estimateId, estimateIds))
      .orderBy(asc(costEstimateLines.orderIndex));

  const linesByEstimate = new Map<string, EstimateLineView[]>();
  for (const l of lineRows) {
    const list = linesByEstimate.get(l.estimateId) ?? [];
    list.push({
      id: l.id,
      costItemId: l.costItemId,
      position: l.position,
      quantity: l.quantity,
      unit: l.unit,
      sourceSymbol: l.sourceSymbol,
      priceLowEur: l.priceLowEur,
      priceLikelyEur: l.priceLikelyEur,
      priceHighEur: l.priceHighEur,
      din276Group: l.din276Group,
      orderIndex: l.orderIndex,
      priceSource: l.priceSource ?? null,
      priceDate: l.priceDate ?? null,
    });
    linesByEstimate.set(l.estimateId, list);
  }

  const now = new Date();
  const estimates: EstimateView[] = estimateRows.map((e) => {
    const lines = linesByEstimate.get(e.id) ?? [];
    const totals = buildEstimateTotals(
      lines.map((l) => ({
        quantity: toNum(l.quantity) ?? 0,
        priceLowEur: toNum(l.priceLowEur) ?? 0,
        priceLikelyEur: toNum(l.priceLikelyEur) ?? 0,
        priceHighEur: toNum(l.priceHighEur) ?? 0,
        din276Group: l.din276Group,
      })),
      toNum(e.contingencyPct),
    );
    const staleWarnings = stalePriceWarnings(
      // Only catalog-backed lines have a provenance date; manual lines are
      // flagged as date-less (priceDate null) — visible doubt, not silence.
      lines.map((l) => ({ position: l.position, priceDate: l.priceDate })),
      now,
    );
    return { ...e, lines, totals, staleWarnings };
  });

  const catalog = await db
    .select({
      id: costItems.id,
      position: costItems.position,
      unit: costItems.unit,
      priceLowEur: costItems.priceLowEur,
      priceLikelyEur: costItems.priceLikelyEur,
      priceHighEur: costItems.priceHighEur,
      source: costItems.source,
      priceDate: costItems.priceDate,
      din276Group: costItems.din276Group,
      note: costItems.note,
    })
    .from(costItems)
    .where(and(eq(costItems.orgId, proj.orgId), eq(costItems.active, true)))
    .orderBy(asc(costItems.position));

  const bids = await db
    .select({
      id: contractorBids.id,
      estimateId: contractorBids.estimateId,
      bidder: contractorBids.bidder,
      position: contractorBids.position,
      amountEur: contractorBids.amountEur,
      bidDate: contractorBids.bidDate,
      note: contractorBids.note,
    })
    .from(contractorBids)
    .where(eq(contractorBids.projectId, projectId))
    .orderBy(desc(contractorBids.createdAt));

  return { orgId: proj.orgId, estimates, catalog, bids };
}
