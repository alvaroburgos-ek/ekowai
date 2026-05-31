import { db } from '@/lib/db';
import {
  worksheetInstances,
  worksheetTemplates,
  standards,
  projects,
  orgMembers,
  approvalEvents,
  calculationSnapshots,
} from '@/lib/db/schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { StatusPill } from '@/components/worksheet/status-pill';
import type { WorksheetStatus } from '@/lib/state-machine';

export default async function InboxPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const localeTyped = locale === 'en' ? 'en' : 'de';

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${localeTyped}/login`);

  const orgs = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, auth.user.id));
  const orgIds = orgs.map((o) => o.orgId);

  const pending =
    orgIds.length === 0
      ? []
      : await db
          .select({
            instanceId: worksheetInstances.id,
            status: worksheetInstances.status,
            updatedAt: worksheetInstances.updatedAt,
            worksheetCode: worksheetTemplates.code,
            worksheetTitle: worksheetTemplates.titleDe,
            standardCode: standards.code,
            projectId: projects.id,
            projectName: projects.name,
            projectCode: projects.projectCode,
            latestComment: sql<string | null>`(
              SELECT comment FROM approval_events
              WHERE worksheet_instance_id = ${worksheetInstances.id}
              ORDER BY occurred_at DESC LIMIT 1
            )`.as('latest_comment'),
            latestActorAt: sql<Date | null>`(
              SELECT occurred_at FROM approval_events
              WHERE worksheet_instance_id = ${worksheetInstances.id}
              ORDER BY occurred_at DESC LIMIT 1
            )`.as('latest_actor_at'),
            // Per-row snapshot count — drives the "Diff" link rendered next
            // to each pending instance. A single correlated subquery keeps
            // the inbox query a single round-trip.
            snapshotCount: sql<number>`(
              SELECT COUNT(*)::int FROM ${calculationSnapshots}
              WHERE ${calculationSnapshots.worksheetInstanceId} = ${worksheetInstances.id}
            )`.as('snapshot_count'),
          })
          .from(worksheetInstances)
          .innerJoin(worksheetTemplates, eq(worksheetTemplates.id, worksheetInstances.worksheetTemplateId))
          .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
          .innerJoin(projects, eq(projects.id, worksheetInstances.projectId))
          .where(
            and(
              inArray(projects.orgId, orgIds),
              eq(worksheetInstances.status, 'submitted_for_review'),
            ),
          )
          .orderBy(desc(worksheetInstances.updatedAt));

  return (
    <article className="space-y-10">
      <header className="border-b border-hairline pb-8">
        <div className="text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
          Sektion 03 · Zur Prüfung
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-ink">
          Eingang
        </h1>
        <div className="mt-3 text-xs text-subtext">
          {pending.length === 0
            ? 'Keine Arbeitsblätter zur Prüfung eingereicht.'
            : `${pending.length} Arbeitsblatt${pending.length === 1 ? '' : 'e'} zur Prüfung eingereicht.`}
        </div>
      </header>

      {pending.length === 0 ? (
        <div className="border border-dashed border-hairline p-12 text-center">
          <p className="text-sm text-subtext italic">
            Wenn Engineers Arbeitsblätter zur internen Prüfung einreichen, erscheinen sie hier.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-hairline">
          {pending.map((p) => (
            <li key={p.instanceId} className="py-4">
              <Link
                href={`/${localeTyped}/projects/${p.projectId}/standards/${p.standardCode}/worksheets/${p.worksheetCode}`}
                className="flex items-baseline gap-4 hover:bg-paper-2/40 -mx-3 px-3 py-2 rounded-md transition-colors"
              >
                <div className="w-40 text-[10px] uppercase tracking-[0.2em] text-subtext">
                  {p.projectCode ?? p.projectName.slice(0, 24)}
                </div>
                <div className="w-32 text-xs font-mono text-subtext">
                  {p.standardCode} · {p.worksheetCode}
                </div>
                <div className="flex-1 text-sm font-medium text-ink">
                  {p.worksheetTitle}
                </div>
                <StatusPill status={p.status as WorksheetStatus} />
                <div className="w-24 text-[10px] text-subtext text-right tabular-nums">
                  {p.latestActorAt
                    ? new Date(p.latestActorAt).toLocaleDateString('de-DE')
                    : ''}
                </div>
              </Link>
              <div className="ml-44 mt-1 flex items-baseline gap-3">
                {p.latestComment && (
                  <div className="text-xs text-subtext italic">
                    „{p.latestComment}“
                  </div>
                )}
                {Number(p.snapshotCount) >= 1 && (
                  <Link
                    href={`/${localeTyped}/projects/${p.projectId}/standards/${p.standardCode}/worksheets/${p.worksheetCode}/diff`}
                    className="text-xs text-accent hover:underline"
                    data-testid="inbox-diff-link"
                  >
                    Diff
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
