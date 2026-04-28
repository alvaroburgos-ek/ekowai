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
import { ALL_WORKSHEETS } from '@/lib/worksheets/DWA-A-201/v3.2';
import { CalculatorShell } from '@/components/calculator/calculator-shell';
import { createClient } from '@/lib/supabase/server';
import type { ExpressionAst } from '@/lib/engine';

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
      initialInputs={(calc.inputs ?? {}) as Record<string, number | string | boolean | null>}
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
