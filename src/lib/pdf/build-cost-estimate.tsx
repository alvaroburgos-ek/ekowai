import 'server-only';
import { renderToBuffer } from '@react-pdf/renderer';
import { db } from '@/lib/db';
import {
  costEstimates,
  costEstimateLines,
  costItems,
  projects,
  orgs,
} from '@/lib/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { CostEstimateDocument } from '@/components/pdf/cost-estimate-document';
import type { ReportLetterhead } from './assemble-standard-report';
import {
  buildEstimateTotals,
  stalePriceWarnings,
  CONTINGENCY_MIN_PCT,
  type EstimateTotals,
  type StalePriceWarning,
} from '@/lib/costs/estimate';
import { toNum } from '@/lib/offers/margin';

/**
 * Kostenschätzungs-PDF (Slice E2) — a CLIENT deliverable, explicitly labelled
 * "Kostenschätzung (DIN 276)" and never resembling a contractor's bid:
 * ranges (low/likely/high) not point values, per-line price provenance
 * (source + date), the accuracy-class boundary sentence, the snapshot id the
 * quantities are version-locked to, and a warning banner INSIDE the PDF when
 * the contingency is below 5 % or any price basis is stale.
 */

export type CostEstimateLinePdf = {
  position: string;
  /** numeric columns — Drizzle returns them as strings */
  quantity: string;
  unit: string | null;
  sourceSymbol: string | null;
  priceLowEur: string;
  priceLikelyEur: string;
  priceHighEur: string;
  din276Group: string | null;
  /** Price provenance (joined from the catalog; null = manual entry). */
  priceSource: string | null;
  priceDate: string | null;
};

export type CostEstimatePdfData = {
  estimate: {
    id: string;
    title: string;
    standardCode: string | null;
    status: string;
    contingencyPct: string;
    snapshotId: string | null;
    createdAt: string;
  };
  lines: CostEstimateLinePdf[];
  totals: EstimateTotals;
  staleWarnings: StalePriceWarning[];
  /** True when the warning banner must render (contingency < 5 % or stale). */
  showWarningBanner: boolean;
  /** Distinct price-basis dates for the "Preisbasis" block (sorted asc). */
  priceBasisDates: string[];
  project: {
    id: string;
    name: string;
    projectCode: string | null;
    clientName: string | null;
    location: string | null;
  };
  letterhead: ReportLetterhead | null;
  generatedAt: string;
};

export async function loadCostEstimateData(
  projectId: string,
  estimateId: string,
): Promise<CostEstimatePdfData> {
  const [estimate] = await db
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
    .where(and(eq(costEstimates.id, estimateId), eq(costEstimates.projectId, projectId)))
    .limit(1);
  if (!estimate) throw new Error(`Estimate ${estimateId} not found`);

  const lines: CostEstimateLinePdf[] = await db
    .select({
      position: costEstimateLines.position,
      quantity: costEstimateLines.quantity,
      unit: costEstimateLines.unit,
      sourceSymbol: costEstimateLines.sourceSymbol,
      priceLowEur: costEstimateLines.priceLowEur,
      priceLikelyEur: costEstimateLines.priceLikelyEur,
      priceHighEur: costEstimateLines.priceHighEur,
      din276Group: costEstimateLines.din276Group,
      priceSource: costItems.source,
      priceDate: costItems.priceDate,
    })
    .from(costEstimateLines)
    .leftJoin(costItems, eq(costItems.id, costEstimateLines.costItemId))
    .where(eq(costEstimateLines.estimateId, estimateId))
    .orderBy(asc(costEstimateLines.orderIndex));

  const [proj] = await db
    .select({
      id: projects.id,
      name: projects.name,
      projectCode: projects.projectCode,
      clientName: projects.clientName,
      location: projects.location,
      org: {
        id: orgs.id,
        name: orgs.name,
        logoUrl: orgs.logoUrl,
        addressLine1: orgs.addressLine1,
        addressLine2: orgs.addressLine2,
        postalCode: orgs.postalCode,
        city: orgs.city,
        phone: orgs.phone,
        email: orgs.email,
        website: orgs.website,
      },
    })
    .from(projects)
    .leftJoin(orgs, eq(orgs.id, projects.orgId))
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!proj) throw new Error(`Project ${projectId} not found`);

  const contingencyPct = toNum(estimate.contingencyPct);
  const totals = buildEstimateTotals(
    lines.map((l) => ({
      quantity: toNum(l.quantity) ?? 0,
      priceLowEur: toNum(l.priceLowEur) ?? 0,
      priceLikelyEur: toNum(l.priceLikelyEur) ?? 0,
      priceHighEur: toNum(l.priceHighEur) ?? 0,
      din276Group: l.din276Group,
    })),
    contingencyPct,
  );
  const staleWarnings = stalePriceWarnings(
    lines.map((l) => ({ position: l.position, priceDate: l.priceDate })),
    new Date(),
  );
  const showWarningBanner =
    contingencyPct === null
    || contingencyPct < CONTINGENCY_MIN_PCT
    || staleWarnings.length > 0;

  const priceBasisDates = [...new Set(
    lines.map((l) => l.priceDate).filter((d): d is string => d !== null),
  )].sort();

  return {
    estimate: {
      id: estimate.id,
      title: estimate.title,
      standardCode: estimate.standardCode,
      status: estimate.status,
      contingencyPct: estimate.contingencyPct,
      snapshotId: estimate.snapshotId,
      createdAt: estimate.createdAt.toISOString(),
    },
    lines,
    totals,
    staleWarnings,
    showWarningBanner,
    priceBasisDates,
    project: {
      id: proj.id,
      name: proj.name,
      projectCode: proj.projectCode,
      clientName: proj.clientName,
      location: proj.location,
    },
    letterhead: proj.org && proj.org.id
      ? {
        orgName: proj.org.name ?? '',
        logoUrl: proj.org.logoUrl,
        addressLine1: proj.org.addressLine1,
        addressLine2: proj.org.addressLine2,
        postalCode: proj.org.postalCode,
        city: proj.org.city,
        phone: proj.org.phone,
        email: proj.org.email,
        website: proj.org.website,
      }
      : null,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildCostEstimatePdf(data: CostEstimatePdfData): Promise<Buffer> {
  return renderToBuffer(<CostEstimateDocument data={data} />);
}
