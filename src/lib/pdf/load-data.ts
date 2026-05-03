import 'server-only';
import { db } from '@/lib/db';
import {
  calculations,
  projects,
  orgs,
  decisions,
  approvals,
  projectDocuments,
  profiles,
} from '@/lib/db/schema';
import { eq, inArray, asc } from 'drizzle-orm';
import { ALL_WORKSHEETS } from '@/lib/worksheets/DWA-A-201/v3.1';
import { compute } from '@/lib/engine';
import {
  normalizeInputs,
  inputsToValues,
} from '@/lib/engine/inputs-reader';

export type ReportData = Awaited<ReturnType<typeof loadReportData>>;

export async function loadReportData(calcId: string) {
  const [calc] = await db
    .select()
    .from(calculations)
    .where(eq(calculations.id, calcId))
    .limit(1);
  if (!calc) throw new Error('calc_not_found');

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, calc.projectId))
    .limit(1);
  if (!project) throw new Error('project_not_found');

  const [org] = await db.select().from(orgs).where(eq(orgs.id, calc.orgId)).limit(1);
  if (!org) throw new Error('org_not_found');

  const decisionRows = await db
    .select()
    .from(decisions)
    .where(eq(decisions.calculationId, calcId))
    .orderBy(asc(decisions.madeAt));

  const approvalRows = await db
    .select()
    .from(approvals)
    .where(eq(approvals.calculationId, calcId))
    .orderBy(asc(approvals.decidedAt));

  const cells = normalizeInputs(calc.inputs as Record<string, any>);

  // Collect distinct docIds referenced by any cited input
  const docIds = Array.from(
    new Set(
      Object.values(cells)
        .map((c) => (c.source && 'docId' in c.source ? c.source.docId : null))
        .filter((x): x is string => !!x),
    ),
  );
  const citedDocs =
    docIds.length > 0
      ? await db
          .select()
          .from(projectDocuments)
          .where(inArray(projectDocuments.id, docIds))
          // Stable appendix lettering: order by upload time (primary) and
          // id (tiebreaker) so re-renders never shuffle the appendix index.
          .orderBy(asc(projectDocuments.uploadedAt), asc(projectDocuments.id))
      : [];

  // Worksheet — today only DWA-A-201; Plan 8 will generalize
  const worksheet = ALL_WORKSHEETS.find((w) => w.id === calc.worksheetId);
  if (!worksheet) throw new Error('worksheet_not_found');

  // Recompute on read so the report always reflects current values
  const values = inputsToValues(calc.inputs as Record<string, any>);
  const result = compute(worksheet, values);

  // Resolve actor profiles
  const userIds = new Set<string>([calc.createdBy]);
  for (const d of decisionRows) userIds.add(d.madeBy);
  for (const a of approvalRows) if (a.reviewerId) userIds.add(a.reviewerId);

  const actorRows =
    userIds.size > 0
      ? await db.select().from(profiles).where(inArray(profiles.id, [...userIds]))
      : [];
  const actors = Object.fromEntries(actorRows.map((p) => [p.id, p]));

  return {
    calc,
    project,
    org,
    decisions: decisionRows,
    approvals: approvalRows,
    citedDocs,
    cells,
    result,
    worksheet,
    actors,
  };
}
