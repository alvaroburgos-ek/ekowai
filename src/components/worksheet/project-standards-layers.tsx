'use client';

import { useMemo, useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, ChevronUp, ChevronDown, FileDown } from 'lucide-react';
import {
  setProjectStandardLayer,
  moveProjectStandard,
  setProjectStandardRelation,
  applyRecommendedStructure,
} from '@/lib/actions/project-standards';
import type { Layer, RelationType } from '@/lib/types/project-layers';
import type { WorksheetStatus } from '@/lib/state-machine';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Worksheet = {
  templateId: string;
  code: string;
  titleDe: string;
  titleEn: string | null;
  phase: number | null;
  archetype: string | null;
  orderIndex: number;
  instanceId: string | null;
  status: WorksheetStatus | null;
  isStale: boolean | null;
};

type StandardEntry = {
  projectStandardId: string;
  standard: {
    id: string;
    code: string;
    titleDe: string;
    titleEn: string | null;
    version: string;
    /** standards.id of the edition replacing this one; null = current edition. */
    supersededBy: string | null;
  };
  layer: Layer | null;
  stageOrder: number | null;
  parentStandardId: string | null;
  relationType: RelationType | null;
  worksheets: Worksheet[];
};

type Props = {
  projectId: string;
  locale: 'de' | 'en';
  standards: StandardEntry[];
};

const STATUS_DOT: Record<WorksheetStatus, string> = {
  draft: 'bg-ink/20',
  submitted_for_review: 'bg-accent-2',
  engineer_approved: 'bg-success',
  final: 'bg-accent',
  deactivated: 'bg-ink/10',
};

const STATUS_BAR: Record<WorksheetStatus, string> = {
  draft: 'bg-ink/15',
  submitted_for_review: 'bg-accent-2',
  engineer_approved: 'bg-success',
  final: 'bg-accent',
  deactivated: 'bg-ink/10',
};

const STATUS_LABEL: Record<WorksheetStatus, string> = {
  draft: 'Entwurf',
  submitted_for_review: 'In Prüfung',
  engineer_approved: 'Genehmigt',
  final: 'Final',
  deactivated: 'Deaktiviert',
};

const LAYER_LABEL_DE: Record<Layer, string> = {
  management: 'Management',
  cost: 'Kosten',
  technical: 'Technische Bemessung',
};

const LAYER_ORDER: Layer[] = ['management', 'cost', 'technical'];

const RELATION_LABEL: Record<RelationType, string> = {
  series: 'in Reihe',
  parallel: 'parallel',
  sub_standard: 'Sub-Standard',
};

const DONE_STATUSES: WorksheetStatus[] = ['engineer_approved', 'final'];

type OptimisticPatch =
  | { kind: 'layer'; standardId: string; layer: Layer | null }
  | {
      kind: 'relation';
      projectStandardId: string;
      parentStandardId: string | null;
      relationType: RelationType | null;
    };

function applyPatch(state: StandardEntry[], patch: OptimisticPatch): StandardEntry[] {
  switch (patch.kind) {
    case 'layer':
      return state.map((s) =>
        s.standard.id === patch.standardId ? { ...s, layer: patch.layer } : s,
      );
    case 'relation':
      return state.map((s) =>
        s.projectStandardId === patch.projectStandardId
          ? { ...s, parentStandardId: patch.parentStandardId, relationType: patch.relationType }
          : s,
      );
  }
}

type FlatRow = {
  entry: StandardEntry;
  depth: number;
  stageBadge: string | null;
  /** Index of this entry among its root siblings in the same layer (for ↑↓). */
  rootIndex: number | null;
  /** Total number of root siblings in the layer (for ↑↓ disable). */
  rootSiblings: number | null;
};

/**
 * Flatten the standards-tree for a given layer into a depth-aware list.
 * Roots first (ordered by stageOrder); each root recurses into series/parallel/sub_standard
 * children. Standards whose parent is outside the layer are treated as roots.
 */
function flattenLayer(entries: StandardEntry[]): FlatRow[] {
  if (entries.length === 0) return [];
  const idsInLayer = new Set(entries.map((s) => s.projectStandardId));
  const roots = entries.filter(
    (s) => !s.parentStandardId || !idsInLayer.has(s.parentStandardId),
  );
  const rows: FlatRow[] = [];

  function walk(node: StandardEntry, depth: number, stageBadge: string | null) {
    rows.push({
      entry: node,
      depth,
      stageBadge,
      rootIndex: depth === 0 ? roots.indexOf(node) : null,
      rootSiblings: depth === 0 ? roots.length : null,
    });
    const children = entries.filter((s) => s.parentStandardId === node.projectStandardId);
    // Render order: series → parallel → sub_standard (matches old TechnicalTrain).
    const ordered = [
      ...children.filter((c) => c.relationType === 'series'),
      ...children.filter((c) => c.relationType === 'parallel'),
      ...children.filter((c) => c.relationType === 'sub_standard'),
    ];
    for (const c of ordered) walk(c, depth + 1, null);
  }

  roots.forEach((r, i) => walk(r, 0, `Stage ${i + 1}`));
  return rows;
}

export function ProjectStandardsLayers({ projectId, locale, standards }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticStandards, applyOptimistic] = useOptimistic<
    StandardEntry[],
    OptimisticPatch
  >(standards, applyPatch);

  const sortedAll = useMemo(() => {
    const cmp = (a: StandardEntry, b: StandardEntry) => {
      const ao = a.stageOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.stageOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.standard.code.localeCompare(b.standard.code);
    };
    return [...optimisticStandards].sort(cmp);
  }, [optimisticStandards]);

  const byLayer = useMemo(() => {
    const m = new Map<Layer | 'unassigned', StandardEntry[]>();
    for (const s of sortedAll) {
      const key = (s.layer ?? 'unassigned') as Layer | 'unassigned';
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    }
    return m;
  }, [sortedAll]);

  const rowsByLayer = useMemo(() => {
    const m = new Map<Layer | 'unassigned', FlatRow[]>();
    for (const key of [...LAYER_ORDER, 'unassigned' as const]) {
      m.set(key, flattenLayer(byLayer.get(key) ?? []));
    }
    return m;
  }, [byLayer]);

  const allRows = useMemo(() => {
    return [
      ...(rowsByLayer.get('management') ?? []),
      ...(rowsByLayer.get('cost') ?? []),
      ...(rowsByLayer.get('technical') ?? []),
      ...(rowsByLayer.get('unassigned') ?? []),
    ];
  }, [rowsByLayer]);

  const [selectedId, setSelectedId] = useState<string | null>(
    allRows[0]?.entry.projectStandardId ?? null,
  );

  // Keep selection valid if standards list changes.
  const effectiveSelectedId =
    selectedId && allRows.some((r) => r.entry.projectStandardId === selectedId)
      ? selectedId
      : (allRows[0]?.entry.projectStandardId ?? null);

  const selectedRow = allRows.find((r) => r.entry.projectStandardId === effectiveSelectedId);

  function pickTitle(s: StandardEntry['standard']): string {
    if (locale === 'de') return s.titleDe;
    return s.titleEn ?? s.titleDe;
  }
  function pickWsTitle(w: Worksheet): string {
    if (locale === 'de') return w.titleDe;
    return w.titleEn ?? w.titleDe;
  }

  function move(standardId: string, direction: 'up' | 'down') {
    start(async () => {
      const result = await moveProjectStandard(projectId, standardId, direction);
      if (!result.ok) {
        setError(`Verschieben fehlgeschlagen: ${result.error}`);
        return;
      }
      setError(null);
      router.refresh();
    });
  }
  function setLayer(standardId: string, layer: Layer | null) {
    start(async () => {
      applyOptimistic({ kind: 'layer', standardId, layer });
      const result = await setProjectStandardLayer(projectId, standardId, layer);
      if (!result.ok) {
        setError(`Layer-Wechsel fehlgeschlagen: ${result.error}`);
        return;
      }
      setError(null);
      router.refresh();
    });
  }
  function setRelation(
    projectStandardId: string,
    parentProjectStandardId: string | null,
    relationType: RelationType | null,
  ) {
    start(async () => {
      applyOptimistic({
        kind: 'relation',
        projectStandardId,
        parentStandardId: parentProjectStandardId,
        relationType,
      });
      const result = await setProjectStandardRelation(
        projectId,
        projectStandardId,
        parentProjectStandardId,
        relationType,
      );
      if (!result.ok) {
        setError(`Beziehung speichern fehlgeschlagen: ${result.error}`);
        return;
      }
      setError(null);
      router.refresh();
    });
  }
  function applyRecommended() {
    start(async () => {
      const result = await applyRecommendedStructure(projectId);
      if (!result.ok) {
        setError(`Empfohlene Struktur anwenden fehlgeschlagen: ${result.error}`);
        return;
      }
      setError(null);
      router.refresh();
    });
  }

  const hasAnyLayered = optimisticStandards.some((s) => s.layer !== null);

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-soft px-4 py-3 text-sm text-error"
        >
          <AlertCircle className="size-4 mt-0.5 shrink-0" aria-hidden />
          <div className="flex-1 min-w-0 break-words">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs uppercase tracking-[0.18em] hover:underline"
          >
            Schließen
          </button>
        </div>
      )}

      {(!hasAnyLayered || optimisticStandards.length === 0) && (
        <RecommendationPanel
          standards={optimisticStandards}
          onApply={applyRecommended}
          pending={pending}
        />
      )}
      {hasAnyLayered && (
        <div className="flex items-baseline justify-end">
          <button
            type="button"
            onClick={applyRecommended}
            disabled={pending}
            className="text-[10px] uppercase tracking-[0.2em] text-subtext hover:text-ink underline disabled:opacity-50"
          >
            Empfohlene Struktur anwenden
          </button>
        </div>
      )}

      {allRows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(14rem,18rem)_1fr] gap-6 items-start">
          <StandardSidebar
            rowsByLayer={rowsByLayer}
            selectedId={effectiveSelectedId}
            onSelect={setSelectedId}
          />
          {selectedRow ? (
            <StandardDetail
              row={selectedRow}
              allEntriesInLayer={byLayer.get(selectedRow.entry.layer ?? 'unassigned') ?? []}
              projectId={projectId}
              locale={locale}
              pickTitle={pickTitle}
              pickWsTitle={pickWsTitle}
              move={move}
              setLayer={setLayer}
              setRelation={setRelation}
              pending={pending}
            />
          ) : (
            <div className="border border-hairline rounded-md p-8 text-sm text-subtext text-center">
              Wähle links einen Standard.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Left sidebar — grouped by layer, hierarchy via indentation + relation label.
 * ========================================================================== */
function StandardSidebar({
  rowsByLayer,
  selectedId,
  onSelect,
}: {
  rowsByLayer: Map<Layer | 'unassigned', FlatRow[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const sections: Array<{ key: Layer | 'unassigned'; label: string; rows: FlatRow[] }> = [];
  for (const layer of LAYER_ORDER) {
    const rows = rowsByLayer.get(layer) ?? [];
    if (rows.length > 0) {
      sections.push({ key: layer, label: LAYER_LABEL_DE[layer], rows });
    }
  }
  const unassigned = rowsByLayer.get('unassigned') ?? [];
  if (unassigned.length > 0) {
    sections.push({ key: 'unassigned', label: 'Ohne Zuordnung', rows: unassigned });
  }

  return (
    <nav className="border border-hairline rounded-md bg-paper lg:sticky lg:top-4 max-h-[24rem] lg:max-h-[calc(100vh-2rem)] overflow-y-auto">
      {sections.map((section, sIdx) => (
        <div key={section.key} className={sIdx > 0 ? 'border-t border-hairline' : ''}>
          <h3 className="px-4 pt-3 pb-2 text-[10px] uppercase tracking-[0.25em] text-subtext">
            {section.label}
          </h3>
          <ul className="pb-2">
            {section.rows.map((row) => (
              <li key={row.entry.projectStandardId}>
                <SidebarItem
                  row={row}
                  selected={row.entry.projectStandardId === selectedId}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarItem({
  row,
  selected,
  onSelect,
}: {
  row: FlatRow;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { entry, depth, stageBadge } = row;
  const total = entry.worksheets.length;
  const done = entry.worksheets.filter(
    (w) => w.status && DONE_STATUSES.includes(w.status),
  ).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const relLabel = entry.relationType ? RELATION_LABEL[entry.relationType] : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(entry.projectStandardId)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'group w-full text-left flex items-center gap-2 pr-3 py-2 text-sm transition-colors relative',
        'border-l-2',
        selected
          ? 'bg-accent/15 text-ink border-accent font-medium'
          : 'text-ink border-transparent hover:bg-paper-2/50 hover:border-hairline',
      )}
      style={{ paddingLeft: `${0.75 + depth * 0.85}rem` }}
    >
      {depth > 0 && (
        <span aria-hidden="true" className="text-subtext text-xs leading-none -ml-1">
          ↳
        </span>
      )}
      <ProgressRing pct={pct} size={16} />
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline gap-1.5">
          <span className="truncate">{entry.standard.code}</span>
          {stageBadge && (
            <span className="text-[9px] uppercase tracking-[0.18em] text-subtext shrink-0">
              {stageBadge}
            </span>
          )}
        </span>
        {(relLabel || total > 0) && (
          <span className="text-[10px] text-subtext flex items-baseline gap-1.5">
            {relLabel && <span className="uppercase tracking-[0.16em]">{relLabel}</span>}
            {relLabel && total > 0 && <span aria-hidden>·</span>}
            {total > 0 && (
              <span className="tabular-nums">
                {done}/{total}
              </span>
            )}
          </span>
        )}
      </span>
      {selected && (
        <Check className="size-4 text-accent shrink-0" aria-label="ausgewählt" />
      )}
    </button>
  );
}

function ProgressRing({ pct, size }: { pct: number; size: number }) {
  const r = (size - 2) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="stroke-hairline"
        strokeWidth={1.5}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className={pct === 100 ? 'stroke-success' : 'stroke-accent'}
        strokeWidth={1.5}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/* ============================================================================
 * Right detail panel — prominent progress, dezent config, full worksheets list.
 * ========================================================================== */
function StandardDetail({
  row,
  allEntriesInLayer,
  projectId,
  locale,
  pickTitle,
  pickWsTitle,
  move,
  setLayer,
  setRelation,
  pending,
}: {
  row: FlatRow;
  allEntriesInLayer: StandardEntry[];
  projectId: string;
  locale: 'de' | 'en';
  pickTitle: (s: StandardEntry['standard']) => string;
  pickWsTitle: (w: Worksheet) => string;
  move: (standardId: string, direction: 'up' | 'down') => void;
  setLayer: (standardId: string, layer: Layer | null) => void;
  setRelation: (
    projectStandardId: string,
    parentProjectStandardId: string | null,
    relationType: RelationType | null,
  ) => void;
  pending: boolean;
}) {
  const { entry, stageBadge, rootIndex, rootSiblings } = row;
  const total = entry.worksheets.length;
  const statusCounts = useMemo(() => {
    const c: Record<WorksheetStatus, number> = {
      draft: 0,
      submitted_for_review: 0,
      engineer_approved: 0,
      final: 0,
      deactivated: 0,
    };
    for (const w of entry.worksheets) {
      const s = (w.status ?? 'draft') as WorksheetStatus;
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [entry.worksheets]);
  const done = statusCounts.engineer_approved + statusCounts.final;

  const canMoveUp = rootIndex != null && rootIndex > 0;
  const canMoveDown = rootIndex != null && rootSiblings != null && rootIndex < rootSiblings - 1;

  const parentOptions = allEntriesInLayer
    .filter((s) => s.projectStandardId !== entry.projectStandardId)
    .map((s) => ({ projectStandardId: s.projectStandardId, code: s.standard.code }));

  return (
    <article className="border border-hairline rounded-md bg-paper">
      <header className="px-4 sm:px-6 py-5 border-b border-hairline space-y-1">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="text-lg font-medium text-ink break-words min-w-0">{entry.standard.code}</h2>
          {stageBadge && (
            <span className="text-[10px] uppercase tracking-[0.2em] bg-accent/10 text-accent px-2 py-0.5 rounded">
              {stageBadge}
            </span>
          )}
          {entry.standard.supersededBy && (
            <span
              title="Diese Ausgabe des Regelwerks wurde durch eine neuere ersetzt."
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-warning bg-warning/10 border border-warning/30 px-2 py-0.5 rounded"
            >
              <AlertCircle className="size-3 shrink-0" aria-hidden />
              Norm ersetzt — Ausgabe prüfen
            </span>
          )}
        </div>
        <p className="text-sm text-subtext break-words">
          {pickTitle(entry.standard)} · {entry.standard.version}
        </p>
      </header>

      <ProgressDisplay total={total} done={done} statusCounts={statusCounts} />

      <ConfigSection
        entry={entry}
        parentOptions={parentOptions}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMoveUp={() => move(entry.standard.id, 'up')}
        onMoveDown={() => move(entry.standard.id, 'down')}
        onLayerChange={(l) => setLayer(entry.standard.id, l)}
        onRelationChange={(parentPSId, rel) => setRelation(entry.projectStandardId, parentPSId, rel)}
        pending={pending}
      />

      <WorksheetList
        entry={entry}
        projectId={projectId}
        locale={locale}
        pickWsTitle={pickWsTitle}
      />

      <div className="px-4 sm:px-6 py-4 border-t border-hairline flex justify-end">
        <a
          href={`/api/projects/${projectId}/standards/${entry.standard.code}/report`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-2 transition-colors"
        >
          <FileDown className="size-3.5" aria-hidden />
          Bericht als PDF
        </a>
      </div>
    </article>
  );
}

function ProgressDisplay({
  total,
  done,
  statusCounts,
}: {
  total: number;
  done: number;
  statusCounts: Record<WorksheetStatus, number>;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const segments = (
    [
      { status: 'final', count: statusCounts.final },
      { status: 'engineer_approved', count: statusCounts.engineer_approved },
      { status: 'submitted_for_review', count: statusCounts.submitted_for_review },
      { status: 'draft', count: statusCounts.draft },
      { status: 'deactivated', count: statusCounts.deactivated },
    ] satisfies Array<{ status: WorksheetStatus; count: number }>
  ).filter((s) => s.count > 0);

  return (
    <section className="px-4 sm:px-6 py-5 border-b border-hairline">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <span className="text-[11px] uppercase tracking-[0.22em] text-subtext">Fortschritt</span>
        <span className="text-sm text-ink tabular-nums">
          <span className="font-medium">{done}</span>
          <span className="text-subtext"> / {total} fertig</span>
          {total > 0 && <span className="text-subtext"> · {pct}%</span>}
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-hairline">
        {total === 0 ? null : (
          segments.map((seg) => (
            <span
              key={seg.status}
              className={cn(STATUS_BAR[seg.status])}
              style={{ width: `${(seg.count / total) * 100}%` }}
              title={`${STATUS_LABEL[seg.status]}: ${seg.count}`}
              aria-label={`${STATUS_LABEL[seg.status]}: ${seg.count}`}
            />
          ))
        )}
      </div>
      {segments.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-subtext">
          {segments.map((seg) => (
            <li key={seg.status} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn('inline-block w-2 h-2 rounded-full', STATUS_DOT[seg.status])}
              />
              <span>
                {STATUS_LABEL[seg.status]}
                <span className="tabular-nums text-ink ml-1">{seg.count}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ConfigSection({
  entry,
  parentOptions,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onLayerChange,
  onRelationChange,
  pending,
}: {
  entry: StandardEntry;
  parentOptions: Array<{ projectStandardId: string; code: string }>;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onLayerChange: (l: Layer | null) => void;
  onRelationChange: (parentPSId: string | null, rel: RelationType | null) => void;
  pending: boolean;
}) {
  const currentParent = entry.parentStandardId ?? '';
  const currentRel = entry.relationType ?? 'series';

  return (
    <section className="px-4 sm:px-6 py-4 border-b border-hairline">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] uppercase tracking-[0.22em] text-subtext">Konfiguration</span>
        {(canMoveUp || canMoveDown) && (
          <div className="flex border border-hairline rounded">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp || pending}
              aria-label="Stage nach oben"
              title="Stage nach oben"
              className="px-2 py-1 leading-none hover:bg-paper-2 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown || pending}
              aria-label="Stage nach unten"
              title="Stage nach unten"
              className="px-2 py-1 leading-none hover:bg-paper-2 disabled:opacity-30 disabled:hover:bg-transparent border-l border-hairline"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2.5 items-center text-xs">
        <dt className="text-subtext uppercase tracking-[0.16em] text-[10px]">Layer</dt>
        <dd>
          <Select
            size="sm"
            inline
            value={entry.layer ?? ''}
            onChange={(e) => onLayerChange((e.target.value || null) as Layer | null)}
            disabled={pending}
            aria-label="Layer wählen"
          >
            <option value="">— Layer —</option>
            <option value="management">Management</option>
            <option value="cost">Kosten</option>
            <option value="technical">Technisch</option>
          </Select>
        </dd>

        <dt className="text-subtext uppercase tracking-[0.16em] text-[10px]">Eltern-Standard</dt>
        <dd className="flex items-center gap-2 flex-wrap">
          <Select
            size="sm"
            inline
            value={currentParent}
            onChange={(e) => {
              const v = e.target.value || null;
              onRelationChange(v, v ? (currentRel as RelationType) : null);
            }}
            disabled={pending}
            aria-label="Eltern-Standard wählen"
          >
            <option value="">— keiner (Root) —</option>
            {parentOptions.map((p) => (
              <option key={p.projectStandardId} value={p.projectStandardId}>
                {p.code}
              </option>
            ))}
          </Select>
          {entry.parentStandardId && (
            <Select
              size="sm"
              inline
              value={currentRel}
              onChange={(e) =>
                onRelationChange(entry.parentStandardId, e.target.value as RelationType)
              }
              disabled={pending}
              aria-label="Beziehungs-Typ"
            >
              <option value="series">In Reihe</option>
              <option value="parallel">Parallel</option>
              <option value="sub_standard">Sub-Standard</option>
            </Select>
          )}
        </dd>
      </dl>
    </section>
  );
}

function WorksheetList({
  entry,
  projectId,
  locale,
  pickWsTitle,
}: {
  entry: StandardEntry;
  projectId: string;
  locale: 'de' | 'en';
  pickWsTitle: (w: Worksheet) => string;
}) {
  if (entry.worksheets.length === 0) {
    return (
      <section className="px-4 sm:px-6 py-5 text-sm text-subtext">
        Keine Worksheets in diesem Standard.
      </section>
    );
  }

  return (
    <section className="px-4 sm:px-6 py-4">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <span className="text-[11px] uppercase tracking-[0.22em] text-subtext">
          Worksheets
        </span>
        <span className="text-[11px] text-subtext tabular-nums">
          {entry.worksheets.length}
        </span>
      </div>
      <ul className="space-y-0.5">
        {entry.worksheets.map((w) => {
          const status: WorksheetStatus = w.status ?? 'draft';
          return (
            <li key={w.templateId}>
              <Link
                href={`/${locale}/projects/${projectId}/standards/${entry.standard.code}/worksheets/${w.code}`}
                className="grid grid-cols-[12px_28px_72px_1fr_auto] sm:grid-cols-[12px_28px_88px_1fr_auto] items-center gap-2 sm:gap-3 px-2 py-1.5 text-sm rounded hover:bg-paper-2/50"
              >
                <span
                  className={cn('inline-block w-2 h-2 rounded-full', STATUS_DOT[status])}
                  aria-label={`Status: ${STATUS_LABEL[status]}`}
                />
                <span className="text-[10px] text-subtext tabular-nums">
                  {w.phase != null ? `P${w.phase}` : '—'}
                </span>
                <span className="text-xs text-subtext tracking-wide truncate">{w.code}</span>
                <span className="text-ink truncate min-w-0">{pickWsTitle(w)}</span>
                <span className="hidden sm:inline text-[10px] text-subtext">{STATUS_LABEL[status]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ============================================================================
 * Recommended-structure panel
 * ========================================================================== */
function RecommendationPanel({
  standards,
  onApply,
  pending,
}: {
  standards: StandardEntry[];
  onApply: () => void;
  pending: boolean;
}) {
  const presentCodes = new Set(standards.map((s) => s.standard.code));
  const missingMgmt = ['DWA-M-820-1', 'DWA-M-820-2', 'DWA-M-820-3'].filter(
    (c) => !presentCodes.has(c),
  );
  const missingCost = ['DIN-276'].filter((c) => !presentCodes.has(c));

  return (
    <div className="border border-accent/30 bg-accent/5 rounded-md p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-ink">Empfohlene Struktur</h3>
        <p className="text-xs text-subtext leading-relaxed">
          Drei Layer: Management → Kosten → Technische Bemessung. Innerhalb des
          technischen Layers können Standards in Reihe, parallel (Alternativen)
          oder als Sub-Standard verschachtelt werden.
        </p>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.18em] text-subtext mb-1">
            Layer 1 · Management
          </dt>
          <dd className="text-ink">DWA-M 820-1, -2, -3</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.18em] text-subtext mb-1">
            Layer 2 · Kosten
          </dt>
          <dd className="text-ink">DIN 276</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.18em] text-subtext mb-1">
            Layer 3 · Technische Bemessung
          </dt>
          <dd className="text-ink">Behandlungs-Train (Engineer-Auswahl)</dd>
        </div>
      </dl>
      <div className="flex items-center gap-4 flex-wrap pt-1">
        <button
          type="button"
          onClick={onApply}
          disabled={pending}
          className="text-[10px] uppercase tracking-[0.2em] text-accent hover:text-ink underline disabled:opacity-50"
        >
          {pending ? '…' : 'Empfohlene Struktur anwenden'}
        </button>
        {(missingMgmt.length > 0 || missingCost.length > 0) && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">
            fügt {[...missingMgmt, ...missingCost].length} fehlende Standards hinzu
          </span>
        )}
      </div>
    </div>
  );
}
