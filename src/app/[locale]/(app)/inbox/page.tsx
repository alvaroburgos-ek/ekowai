import { db } from '@/lib/db';
import {
  worksheetInstances,
  worksheetTemplates,
  standards,
  projects,
  orgMembers,
  calculationSnapshots,
} from '@/lib/db/schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Inbox, MessageSquare, GitCompare, FileText, Calendar } from 'lucide-react';
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
    <article className="space-y-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs text-subtext">
          <Inbox className="size-4" aria-hidden />
          <span>
            {pending.length === 0
              ? 'Keine Einreichungen'
              : `${pending.length} ${pending.length === 1 ? 'Einreichung' : 'Einreichungen'}`}
          </span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-ink">
          Eingang
        </h1>
        <p className="text-sm text-subtext">
          {pending.length === 0
            ? 'Keine Arbeitsblätter zur Prüfung eingereicht.'
            : 'Diese Arbeitsblätter warten auf deine Prüfung.'}
        </p>
      </header>

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline-strong bg-paper-2/40 p-12 text-center space-y-4">
          <div
            className="mx-auto inline-flex items-center justify-center size-14 rounded-full"
            style={{ background: 'var(--eko-gradient-soft)' }}
          >
            <Inbox className="size-7 text-accent-2" aria-hidden />
          </div>
          <p className="text-sm text-subtext">
            Wenn Engineers Arbeitsblätter zur internen Prüfung einreichen, erscheinen sie hier.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pending.map((p) => (
            <li
              key={p.instanceId}
              className="group rounded-2xl border border-hairline bg-paper shadow-soft shadow-soft-hover transition-all"
            >
              <Link
                href={`/${localeTyped}/projects/${p.projectId}/standards/${p.standardCode}/worksheets/${p.worksheetCode}`}
                className="flex items-center gap-4 p-4"
              >
                <div
                  className="inline-flex items-center justify-center size-10 rounded-xl shrink-0"
                  style={{ background: 'var(--eko-gradient-soft)' }}
                >
                  <FileText className="size-5 text-accent-2" aria-hidden />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-ink group-hover:text-accent-2 transition-colors">
                      {p.worksheetTitle}
                    </span>
                    <span className="text-xs font-mono text-subtext">
                      {p.standardCode} · {p.worksheetCode}
                    </span>
                  </div>
                  <div className="text-xs text-subtext truncate">
                    {p.projectCode ?? p.projectName.slice(0, 32)}
                  </div>
                </div>
                <StatusPill status={p.status as WorksheetStatus} />
                {p.latestActorAt && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-subtext tabular-nums shrink-0">
                    <Calendar className="size-3.5" aria-hidden />
                    {new Date(p.latestActorAt).toLocaleDateString('de-DE')}
                  </span>
                )}
              </Link>
              {(p.latestComment || Number(p.snapshotCount) >= 1) && (
                <div className="border-t border-hairline px-4 py-3 flex flex-wrap items-center gap-4 bg-paper-2/40 rounded-b-2xl">
                  {p.latestComment && (
                    <div className="flex items-start gap-2 text-xs text-subtext italic min-w-0 flex-1">
                      <MessageSquare className="size-3.5 mt-0.5 shrink-0" aria-hidden />
                      <span className="truncate">„{p.latestComment}&quot;</span>
                    </div>
                  )}
                  {Number(p.snapshotCount) >= 1 && (
                    <Link
                      href={`/${localeTyped}/projects/${p.projectId}/standards/${p.standardCode}/worksheets/${p.worksheetCode}/diff`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-2 shrink-0"
                      data-testid="inbox-diff-link"
                    >
                      <GitCompare className="size-3.5" aria-hidden />
                      Diff
                    </Link>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
