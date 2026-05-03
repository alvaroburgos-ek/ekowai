import { db } from '@/lib/db';
import {
  calculations,
  decisions as decisionsTable,
  approvals as approvalsTable,
  orgMembers,
  crossReferences,
} from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { ALL_WORKSHEETS } from '@/lib/worksheets/DWA-A-201/v3.1';
import { CalculatorShell } from '@/components/calculator/calculator-shell';
import { createClient } from '@/lib/supabase/server';
import type { ExpressionAst } from '@/lib/engine';
import { listProjectDocuments } from '@/lib/db/queries/documents';
import {
  normalizeInputs,
  inputsToValues,
  type InputSource,
} from '@/lib/engine/inputs-reader';

export default async function CalcPage({
  params,
}: {
  params: Promise<{ locale: 'de' | 'en'; id: string; calcId: string }>;
}) {
  const { locale, id, calcId } = await params;
  const [calc] = await db
    .select()
    .from(calculations)
    .where(eq(calculations.id, calcId))
    .limit(1);
  if (!calc || calc.projectId !== id) notFound();

  const worksheet = ALL_WORKSHEETS.find((w) => w.id === calc.worksheetId);
  if (!worksheet) notFound();

  const initialDecisions = await db
    .select({
      decisionPointId: decisionsTable.decisionPointId,
      choice: decisionsTable.choice,
      rationale: decisionsTable.rationale,
    })
    .from(decisionsTable)
    .where(eq(decisionsTable.calculationId, calc.id));

  const [latestApproval] = await db
    .select()
    .from(approvalsTable)
    .where(eq(approvalsTable.calculationId, calc.id))
    .orderBy(desc(approvalsTable.decidedAt))
    .limit(1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const memberships = user
    ? await db.select().from(orgMembers).where(eq(orgMembers.userId, user.id))
    : [];
  const member = memberships.find((m) => m.orgId === calc.orgId);
  const canReview = !!member && ['owner', 'admin', 'engineer'].includes(member.role);

  // ---- Derived-input pre-fill: pull values from sibling calcs in this project ----
  const derivedFields = worksheet.inputs.filter((i) => i.derivedFrom);
  const upstreamWsIds = Array.from(
    new Set(derivedFields.map((i) => i.derivedFrom!.worksheetId)),
  );
  const siblingCalcs =
    upstreamWsIds.length > 0
      ? await db
          .select()
          .from(calculations)
          .where(eq(calculations.projectId, calc.projectId))
      : [];
  const siblingByWorksheet = new Map(
    siblingCalcs
      .filter((s) => upstreamWsIds.includes(s.worksheetId))
      .map((s) => [s.worksheetId, s]),
  );
  const derivedValues: Record<string, number | string | boolean | null> = {};
  const derivedSources: Record<string, { worksheetId: string; calcName: string }> = {};
  for (const f of derivedFields) {
    const upstream = siblingByWorksheet.get(f.derivedFrom!.worksheetId);
    if (!upstream) continue;
    // Look up the parameter's value in the upstream calc.
    // Match by sanitized field id (the transformer uses the same mapping
    // upstream and downstream).
    const upstreamInputs = (upstream.inputs ?? {}) as Record<string, unknown>;
    const upstreamResults = (upstream.results ?? {}) as Record<string, unknown>;
    const v = upstreamInputs[f.id] ?? upstreamResults[f.id];
    if (v === undefined || v === null) continue;
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') {
      derivedValues[f.id] = v;
      derivedSources[f.id] = {
        worksheetId: upstream.worksheetId,
        calcName: upstream.name,
      };
    }
  }

  const docs = await listProjectDocuments(calc.projectId);

  // Extract sources from the mixed-shape inputs blob
  const cells = normalizeInputs(calc.inputs as Record<string, any>);
  const inputSources: Record<string, InputSource | undefined> = {};
  for (const [k, c] of Object.entries(cells)) {
    if (c.source) inputSources[k] = c.source;
  }
  const initialInputsBare = inputsToValues(calc.inputs as Record<string, any>);

  const xrefs = await db
    .select()
    .from(crossReferences)
    .where(
      and(
        eq(crossReferences.sourceRegulation, calc.regulationCode),
        eq(crossReferences.sourceVersion, calc.regulationVersion),
      ),
    );
  const xrefsForShell = xrefs.map((x) => ({
    id: x.id,
    sourceSection: x.sourceSection,
    triggerCondition: x.triggerCondition as unknown as ExpressionAst,
    targetRegulation: x.targetRegulation,
    targetSection: x.targetSection,
    rationale: x.rationale,
    wizardSupported: x.wizardSupported,
  }));

  return (
    <CalculatorShell
      locale={locale}
      calcId={calc.id}
      projectId={id}
      name={calc.name}
      worksheet={worksheet}
      initialInputs={initialInputsBare as Record<string, number | string | boolean | null>}
      derivedValues={derivedValues}
      derivedSources={derivedSources}
      inputSources={inputSources}
      docs={docs}
      lastSavedAt={calc.updatedAt.toISOString()}
      initialDraft={calc.rationaleDraft}
      initialFinal={calc.rationale}
      initialDecisions={initialDecisions}
      status={calc.status}
      lastApprovalComment={latestApproval?.comment ?? null}
      canReview={canReview}
      crossRefs={xrefsForShell}
    />
  );
}
