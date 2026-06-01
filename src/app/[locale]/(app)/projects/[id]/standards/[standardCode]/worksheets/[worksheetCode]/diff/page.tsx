import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import {
  projects,
  worksheetTemplates,
  worksheetInstances,
  fields,
  equations,
  complianceRequirements,
  standards,
} from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import {
  getSnapshot,
  resolveDefaultDiffPair,
  listSnapshotsForInstance,
  type SnapshotRow,
} from '@/lib/db/queries/snapshots';
import { computeSnapshotDiff } from '@/lib/snapshots/diff';
import { SnapshotDiffView } from '@/components/worksheet/snapshot-diff';

/**
 * Calculation diff page — engineer-facing review tool. Shows the changes
 * between two calculation snapshots for one worksheet instance.
 *
 * Default endpoint resolution (when no query string is passed):
 *   - `to`   = most recent submit_for_review snapshot
 *   - `from` = most recent approve snapshot prior to `to`, else previous
 *              submit_for_review.
 *
 * Override via search params: ?from=<uuid>&to=<uuid>. The page validates
 * both ids belong to the worksheet instance the URL identifies (so a query
 * string can't sneak a foreign-project snapshot in).
 */
export default async function DiffPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string; standardCode: string; worksheetCode: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { locale, id, standardCode, worksheetCode } = await params;
  const { from: fromIdParam, to: toIdParam } = await searchParams;
  const localeTyped = locale === 'en' ? 'en' : 'de';
  const projectId = id;

  // Verify project access (RLS would already block, but fail-loud is nicer).
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) notFound();

  // Find the worksheet template by (standardCode, worksheetCode).
  const tplRows = await db
    .select({
      templateId: worksheetTemplates.id,
      titleDe: worksheetTemplates.titleDe,
      titleEn: worksheetTemplates.titleEn,
      standardCode: standards.code,
    })
    .from(worksheetTemplates)
    .innerJoin(standards, eq(standards.id, worksheetTemplates.standardId))
    .where(
      and(eq(standards.code, standardCode), eq(worksheetTemplates.code, worksheetCode)),
    )
    .limit(1);
  if (tplRows.length === 0) notFound();
  const tpl = tplRows[0];

  // Resolve the worksheet instance for this project/template.
  const [instance] = await db
    .select()
    .from(worksheetInstances)
    .where(
      and(
        eq(worksheetInstances.projectId, projectId),
        eq(worksheetInstances.worksheetTemplateId, tpl.templateId),
      ),
    )
    .limit(1);
  if (!instance) {
    return (
      <main className="space-y-6">
        <Header
          projectCode={project.projectCode}
          projectName={project.name}
          standardCode={standardCode}
          worksheetCode={worksheetCode}
          worksheetTitle={localeTyped === 'en' ? tpl.titleEn ?? tpl.titleDe : tpl.titleDe}
          locale={localeTyped}
          projectId={projectId}
        />
        <p className="text-sm text-subtext italic">
          Noch kein Arbeitsblatt für dieses Standard / Worksheet in diesem Projekt.
        </p>
      </main>
    );
  }

  // Resolve the from/to snapshot pair.
  let pair: { from: SnapshotRow; to: SnapshotRow } | null = null;
  if (fromIdParam && toIdParam) {
    const [a, b] = await Promise.all([getSnapshot(fromIdParam), getSnapshot(toIdParam)]);
    if (
      a &&
      b &&
      a.worksheetInstanceId === instance.id &&
      b.worksheetInstanceId === instance.id
    ) {
      pair = { from: a, to: b };
    }
  }
  if (!pair) {
    pair = await resolveDefaultDiffPair(instance.id);
  }

  // Load metadata (field labels, equation outputs, requirement labels) for
  // the worksheet template — we need it to render labels for ids that come
  // from the snapshot JSON. Done once per page render; both snapshots are on
  // the same instance, so the metadata is shared.
  const [fieldRows, equationRows, complianceRows, allSnapshots] = await Promise.all([
    db.select().from(fields).where(eq(fields.worksheetTemplateId, tpl.templateId)),
    db
      .select()
      .from(equations)
      .where(eq(equations.worksheetTemplateId, tpl.templateId)),
    db
      .select()
      .from(complianceRequirements)
      .where(eq(complianceRequirements.worksheetTemplateId, tpl.templateId)),
    listSnapshotsForInstance(instance.id),
  ]);

  return (
    <main className="space-y-10">
      <Header
        projectCode={project.projectCode}
        projectName={project.name}
        standardCode={standardCode}
        worksheetCode={worksheetCode}
        worksheetTitle={localeTyped === 'en' ? tpl.titleEn ?? tpl.titleDe : tpl.titleDe}
        locale={localeTyped}
        projectId={projectId}
      />

      <SnapshotPicker
        snapshots={allSnapshots}
        activeFromId={pair?.from.id ?? null}
        activeToId={pair?.to.id ?? null}
        basePath={`/${localeTyped}/projects/${projectId}/standards/${standardCode}/worksheets/${worksheetCode}/diff`}
      />

      {!pair ? (
        <div className="border border-dashed border-hairline p-12 text-center">
          <p className="text-sm text-subtext italic">
            Noch keine Snapshots vorhanden. Beim ersten Einreichen wird ein Snapshot erfasst.
          </p>
        </div>
      ) : pair.from.id === pair.to.id ? (
        <div className="border border-dashed border-hairline p-12 text-center">
          <p className="text-sm text-subtext italic">
            Erster Snapshot — kein Vergleich verfügbar bis zur nächsten Version.
          </p>
        </div>
      ) : (
        <SnapshotDiffView
          diff={computeSnapshotDiff(pair.from.payload, pair.to.payload)}
          locale={localeTyped}
          fields={fieldRows.map((f) => ({
            id: f.id,
            symbol: f.symbol,
            labelDe: f.labelDe,
            labelEn: f.labelEn,
          }))}
          equations={equationRows.map((e) => ({
            equationNumber: e.equationNumber,
            outputSymbol: e.outputSymbol,
            clauseReference: e.clauseReference,
          }))}
          requirements={complianceRows.map((c) => ({
            id: c.id,
            code: c.code,
            titleDe: c.titleDe,
            titleEn: c.titleEn,
          }))}
          fromLabel={formatSnapshotLabel(pair.from)}
          toLabel={formatSnapshotLabel(pair.to)}
        />
      )}
    </main>
  );
}

function Header({
  projectCode,
  projectName,
  standardCode,
  worksheetCode,
  worksheetTitle,
  locale,
  projectId,
}: {
  projectCode: string | null;
  projectName: string;
  standardCode: string;
  worksheetCode: string;
  worksheetTitle: string;
  locale: 'de' | 'en';
  projectId: string;
}) {
  return (
    <header className="border-b border-hairline pb-8">
      <div className="text-[10px] uppercase tracking-[0.25em] text-subtext mb-2">
        Sektion 04 · Änderungen
      </div>
      <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-ink">
        Berechnungs-Diff
      </h1>
      <div className="mt-3 text-xs text-subtext space-y-1">
        <div>
          <span className="font-mono mr-2">{projectCode ?? '—'}</span>
          {projectName}
        </div>
        <div>
          <span className="font-mono mr-2">
            {standardCode} · {worksheetCode}
          </span>
          {worksheetTitle}
        </div>
      </div>
      <div className="mt-4 flex gap-4 text-xs">
        <Link
          href={`/${locale}/projects/${projectId}/standards/${standardCode}/worksheets/${worksheetCode}`}
          className="text-accent hover:underline"
        >
          ← Zurück zum Arbeitsblatt
        </Link>
      </div>
    </header>
  );
}

function SnapshotPicker({
  snapshots,
  activeFromId,
  activeToId,
  basePath,
}: {
  snapshots: SnapshotRow[];
  activeFromId: string | null;
  activeToId: string | null;
  basePath: string;
}) {
  if (snapshots.length < 2) return null;
  return (
    <section className="border border-hairline p-4 text-xs text-subtext space-y-2">
      <div className="text-[10px] uppercase tracking-[0.2em]">Snapshots auswählen</div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-3">
        <SnapshotColumn
          title="Vorher (from)"
          snapshots={snapshots}
          activeId={activeFromId}
          buildHref={(id) => `${basePath}?from=${id}&to=${activeToId ?? ''}`}
        />
        <SnapshotColumn
          title="Nachher (to)"
          snapshots={snapshots}
          activeId={activeToId}
          buildHref={(id) => `${basePath}?from=${activeFromId ?? ''}&to=${id}`}
        />
      </div>
    </section>
  );
}

function SnapshotColumn({
  title,
  snapshots,
  activeId,
  buildHref,
}: {
  title: string;
  snapshots: SnapshotRow[];
  activeId: string | null;
  buildHref: (id: string) => string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] mb-1">{title}</div>
      <ul className="space-y-1">
        {snapshots.map((s) => (
          <li key={s.id}>
            <Link
              href={buildHref(s.id)}
              className={
                s.id === activeId
                  ? 'block px-2 py-1 bg-accent/10 text-accent rounded font-medium'
                  : 'block px-2 py-1 hover:bg-paper-2/60 rounded'
              }
            >
              <span className="font-mono mr-2">[{s.trigger}]</span>
              <span className="tabular-nums">{formatSnapshotLabel(s)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatSnapshotLabel(s: SnapshotRow): string {
  const date = new Date(s.takenAt).toLocaleString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  switch (s.trigger) {
    case 'approve':
      return `Genehmigt am ${date}`;
    case 'submit_for_review':
      return `Eingereicht am ${date}`;
    default:
      return `Manuell ${date}`;
  }
}
