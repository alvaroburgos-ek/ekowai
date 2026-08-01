'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  offers,
  offerPositions,
  orgs,
  orgMembers,
  projects,
  effortEntries,
} from '@/lib/db/schema';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { userHasProjectAccess } from '@/lib/db/queries/worksheet';
import {
  computeOfferMargin,
  createOfferSchema,
  updateOfferSchema,
  addOfferPositionSchema,
  setOrgRatesSchema,
  toNum,
  type OfferMarginResult,
} from '@/lib/offers/margin';

/**
 * Angebots-Engine server actions (Slice E1 — margin-first, INTERNAL-only).
 * Auth idiom mirrors effort.ts: `db` runs as postgres and bypasses RLS, so
 * the org-membership join inside `userHasProjectAccess` IS the access check.
 * Margin is computed per read from org calibration — never persisted.
 */

export type OfferPositionView = {
  id: string;
  position: string;
  /** numeric columns — Drizzle returns them as strings */
  estimatedHours: string;
  externalCostEur: string;
  orderIndex: number;
  note: string | null;
};

export type OfferView = {
  id: string;
  title: string;
  status: string;
  festpreisEur: string;
  validUntil: string | null;
  bearbeitungszeit: string | null;
  createdAt: Date;
  positions: OfferPositionView[];
  margin: OfferMarginResult;
};

export type ListOffersResult = {
  orgId: string;
  /** Org calibration (null until set — margin verdicts stay amber). */
  internalHourlyRate: number | null;
  targetMarginPct: number | null;
  /** Whether the session user may call setOrgRates (owner/admin). */
  canSetRates: boolean;
  /** Nachkalkulation hook: real hours logged on the project so far. */
  totalLoggedHours: number;
  offers: OfferView[];
};

/** Resolve the session user id or throw (mirrors effort.ts). */
async function requireSessionUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not authenticated');
  return auth.user.id;
}

function revalidateOverview() {
  // The offer panel renders on the project overview page.
  revalidatePath('/[locale]/projects/[id]', 'page');
}

/** Resolve an offer's projectId or throw. */
async function requireOfferProjectId(offerId: string): Promise<string> {
  const [row] = await db
    .select({ projectId: offers.projectId })
    .from(offers)
    .where(eq(offers.id, offerId))
    .limit(1);
  if (!row) throw new Error('Angebot nicht gefunden');
  return row.projectId;
}

export async function createOffer(input: {
  projectId: string;
  title: string;
  festpreisEur: number;
  validUntil?: string;
  bearbeitungszeit?: string;
}): Promise<{ id: string }> {
  const parsed = createOfferSchema.parse(input);
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(parsed.projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  const [row] = await db
    .insert(offers)
    .values({
      projectId: parsed.projectId,
      title: parsed.title,
      festpreisEur: String(parsed.festpreisEur),
      validUntil: parsed.validUntil ?? null,
      bearbeitungszeit:
        parsed.bearbeitungszeit && parsed.bearbeitungszeit !== ''
          ? parsed.bearbeitungszeit
          : null,
      createdBy: userId,
    })
    .returning({ id: offers.id });

  revalidateOverview();
  return { id: row.id };
}

export async function updateOffer(input: {
  offerId: string;
  title?: string;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected';
  festpreisEur?: number;
  validUntil?: string | null;
  bearbeitungszeit?: string | null;
}): Promise<void> {
  const parsed = updateOfferSchema.parse(input);
  const projectId = await requireOfferProjectId(parsed.offerId);
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.status !== undefined) patch.status = parsed.status;
  if (parsed.festpreisEur !== undefined) patch.festpreisEur = String(parsed.festpreisEur);
  if (parsed.validUntil !== undefined) patch.validUntil = parsed.validUntil;
  if (parsed.bearbeitungszeit !== undefined) {
    patch.bearbeitungszeit =
      parsed.bearbeitungszeit === '' ? null : parsed.bearbeitungszeit;
  }

  await db.update(offers).set(patch).where(eq(offers.id, parsed.offerId));
  revalidateOverview();
}

export async function addOfferPosition(input: {
  offerId: string;
  position: string;
  estimatedHours: number;
  externalCostEur?: number;
  note?: string;
}): Promise<{ id: string }> {
  const parsed = addOfferPositionSchema.parse(input);
  const projectId = await requireOfferProjectId(parsed.offerId);
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  // Append at the end of the offer's position list.
  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${offerPositions.orderIndex}), -1)` })
    .from(offerPositions)
    .where(eq(offerPositions.offerId, parsed.offerId));

  const [row] = await db
    .insert(offerPositions)
    .values({
      offerId: parsed.offerId,
      position: parsed.position,
      estimatedHours: String(parsed.estimatedHours),
      externalCostEur: String(parsed.externalCostEur ?? 0),
      orderIndex: Number(maxOrder) + 1,
      note: parsed.note && parsed.note !== '' ? parsed.note : null,
    })
    .returning({ id: offerPositions.id });

  revalidateOverview();
  return { id: row.id };
}

export async function deleteOfferPosition(id: string): Promise<void> {
  const [pos] = await db
    .select({ offerId: offerPositions.offerId })
    .from(offerPositions)
    .where(eq(offerPositions.id, id))
    .limit(1);
  if (!pos) return; // already gone — nothing to delete

  const projectId = await requireOfferProjectId(pos.offerId);
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  await db.delete(offerPositions).where(eq(offerPositions.id, id));
  revalidateOverview();
}

/**
 * Set the org's internal calibration (Stundensatz intern, Zielmarge %).
 * Gated to org owner/admin (mirrors updateLetterhead in org-settings.ts).
 */
export async function setOrgRates(input: {
  orgId: string;
  internalHourlyRate: number | null;
  targetMarginPct: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = setOrgRatesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid_input' };
  const userId = await requireSessionUserId();

  const [member] = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(
      and(eq(orgMembers.userId, userId), eq(orgMembers.orgId, parsed.data.orgId)),
    )
    .limit(1);
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return { ok: false, error: 'forbidden' };
  }

  await db
    .update(orgs)
    .set({
      internalHourlyRate:
        parsed.data.internalHourlyRate === null
          ? null
          : String(parsed.data.internalHourlyRate),
      targetMarginPct:
        parsed.data.targetMarginPct === null
          ? null
          : String(parsed.data.targetMarginPct),
    })
    .where(eq(orgs.id, parsed.data.orgId));

  revalidateOverview();
  return { ok: true };
}

/**
 * List a project's offers with per-offer computed margin (INTERNAL — the
 * panel must never let these numbers reach a client document) plus the
 * Nachkalkulation hook: total real hours from effort_entries.
 */
export async function listOffers(projectId: string): Promise<ListOffersResult> {
  const userId = await requireSessionUserId();
  if (!(await userHasProjectAccess(projectId, userId))) {
    throw new Error('Forbidden: user is not a member of this project’s org');
  }

  const [proj] = await db
    .select({
      orgId: projects.orgId,
      internalHourlyRate: orgs.internalHourlyRate,
      targetMarginPct: orgs.targetMarginPct,
    })
    .from(projects)
    .innerJoin(orgs, eq(orgs.id, projects.orgId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!proj) throw new Error('Projekt nicht gefunden');

  const [member] = await db
    .select({ role: orgMembers.role })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.orgId, proj.orgId)))
    .limit(1);
  const canSetRates = !!member && (member.role === 'owner' || member.role === 'admin');

  const internalHourlyRate = toNum(proj.internalHourlyRate);
  const targetMarginPct = toNum(proj.targetMarginPct);

  const offerRows = await db
    .select({
      id: offers.id,
      title: offers.title,
      status: offers.status,
      festpreisEur: offers.festpreisEur,
      validUntil: offers.validUntil,
      bearbeitungszeit: offers.bearbeitungszeit,
      createdAt: offers.createdAt,
    })
    .from(offers)
    .where(eq(offers.projectId, projectId))
    .orderBy(desc(offers.createdAt));

  const offerIds = offerRows.map((o) => o.id);
  const positionRows = offerIds.length === 0
    ? []
    : await db
      .select({
        id: offerPositions.id,
        offerId: offerPositions.offerId,
        position: offerPositions.position,
        estimatedHours: offerPositions.estimatedHours,
        externalCostEur: offerPositions.externalCostEur,
        orderIndex: offerPositions.orderIndex,
        note: offerPositions.note,
      })
      .from(offerPositions)
      .where(inArray(offerPositions.offerId, offerIds))
      .orderBy(asc(offerPositions.orderIndex));

  const positionsByOffer = new Map<string, OfferPositionView[]>();
  for (const p of positionRows) {
    const list = positionsByOffer.get(p.offerId) ?? [];
    list.push({
      id: p.id,
      position: p.position,
      estimatedHours: p.estimatedHours,
      externalCostEur: p.externalCostEur,
      orderIndex: p.orderIndex,
      note: p.note,
    });
    positionsByOffer.set(p.offerId, list);
  }

  // Nachkalkulation hook — real hours logged on the project so far.
  const [logged] = await db
    .select({ total: sql<string>`coalesce(sum(${effortEntries.hours}), 0)` })
    .from(effortEntries)
    .where(eq(effortEntries.projectId, projectId));
  const totalLoggedHours = toNum(logged?.total) ?? 0;

  const offerViews: OfferView[] = offerRows.map((o) => {
    const positions = positionsByOffer.get(o.id) ?? [];
    const margin = computeOfferMargin({
      festpreisEur: toNum(o.festpreisEur) ?? 0,
      positions: positions.map((p) => ({
        estimatedHours: toNum(p.estimatedHours) ?? 0,
        externalCostEur: toNum(p.externalCostEur) ?? 0,
      })),
      internalHourlyRate,
      targetMarginPct,
    });
    return { ...o, positions, margin };
  });

  return {
    orgId: proj.orgId,
    internalHourlyRate,
    targetMarginPct,
    canSetRates,
    totalLoggedHours,
    offers: offerViews,
  };
}
