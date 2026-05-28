'use client';

import { Fragment, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  setProjectStandardLayer,
  moveProjectStandard,
  setProjectStandardRelation,
  applyRecommendedStructure,
} from '@/lib/actions/project-standards';
import type { Layer, RelationType } from '@/lib/types/project-layers';
import type { WorksheetStatus } from '@/lib/state-machine';

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

export function ProjectStandardsLayers({ projectId, locale, standards }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // Sort all standards by stageOrder asc (NULL last) for stable ordering downstream.
  const sortedAll = useMemo(() => {
    const cmp = (a: StandardEntry, b: StandardEntry) => {
      const ao = a.stageOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.stageOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.standard.code.localeCompare(b.standard.code);
    };
    return [...standards].sort(cmp);
  }, [standards]);

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
      await moveProjectStandard(projectId, standardId, direction);
      router.refresh();
    });
  }
  function setLayer(standardId: string, layer: Layer | null) {
    start(async () => {
      await setProjectStandardLayer(projectId, standardId, layer);
      router.refresh();
    });
  }
  function setRelation(
    projectStandardId: string,
    parentProjectStandardId: string | null,
    relationType: RelationType | null,
  ) {
    start(async () => {
      await setProjectStandardRelation(
        projectId,
        projectStandardId,
        parentProjectStandardId,
        relationType,
      );
      router.refresh();
    });
  }
  function applyRecommended() {
    start(async () => {
      await applyRecommendedStructure(projectId);
      router.refresh();
    });
  }

  const hasAnyLayered = standards.some((s) => s.layer !== null);

  return (
    <div className="space-y-10">
      {(!hasAnyLayered || standards.length === 0) && (
        <RecommendationPanel
          standards={standards}
          onApply={applyRecommended}
          pending={pending}
        />
      )}
      {hasAnyLayered && (
        <div className="flex items-baseline justify-end -mb-4">
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

      {LAYER_ORDER.map((layer) => {
        const entries = byLayer.get(layer) ?? [];
        if (entries.length === 0) return null;
        return (
          <section key={layer} className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-subtext border-b border-hairline pb-2">
              Layer {LAYER_ORDER.indexOf(layer) + 1} · {LAYER_LABEL_DE[layer]}
            </h3>
            {layer === 'technical' ? (
              <TechnicalTrain
                entries={entries}
                allInLayer={entries}
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
              <FlatLayer
                entries={entries}
                projectId={projectId}
                locale={locale}
                pickTitle={pickTitle}
                pickWsTitle={pickWsTitle}
                move={move}
                setLayer={setLayer}
                pending={pending}
              />
            )}
          </section>
        );
      })}

      {(byLayer.get('unassigned') ?? []).length > 0 && (
        <section className="space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-subtext border-b border-hairline pb-2">
            Ohne Zuordnung
          </h3>
          <FlatLayer
            entries={byLayer.get('unassigned') ?? []}
            projectId={projectId}
            locale={locale}
            pickTitle={pickTitle}
            pickWsTitle={pickWsTitle}
            move={move}
            setLayer={setLayer}
            pending={pending}
          />
        </section>
      )}
    </div>
  );
}

/* ============================================================================
 * Flat layer (management / cost / unassigned) — no parent/relation controls.
 * ========================================================================== */
function FlatLayer({
  entries,
  projectId,
  locale,
  pickTitle,
  pickWsTitle,
  move,
  setLayer,
  pending,
}: {
  entries: StandardEntry[];
  projectId: string;
  locale: 'de' | 'en';
  pickTitle: (s: StandardEntry['standard']) => string;
  pickWsTitle: (w: Worksheet) => string;
  move: (standardId: string, direction: 'up' | 'down') => void;
  setLayer: (standardId: string, layer: Layer | null) => void;
  pending: boolean;
}) {
  return (
    <div className="space-y-3">
      {entries.map((s, idx) => (
        <StandardBox
          key={s.projectStandardId}
          s={s}
          projectId={projectId}
          locale={locale}
          pickTitle={pickTitle}
          pickWsTitle={pickWsTitle}
          stageBadge={null}
          onMoveUp={() => move(s.standard.id, 'up')}
          onMoveDown={() => move(s.standard.id, 'down')}
          canMoveUp={idx > 0}
          canMoveDown={idx < entries.length - 1}
          onLayerChange={(l) => setLayer(s.standard.id, l)}
          parentOptions={[]}
          onRelationChange={() => {}}
          showHierarchyControls={false}
          pending={pending}
        />
      ))}
    </div>
  );
}

/* ============================================================================
 * Technical train — boxes + arrows + ODER + sub-standard indent.
 * ========================================================================== */
function TechnicalTrain({
  entries,
  allInLayer,
  projectId,
  locale,
  pickTitle,
  pickWsTitle,
  move,
  setLayer,
  setRelation,
  pending,
}: {
  entries: StandardEntry[];
  allInLayer: StandardEntry[];
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
  // Roots = entries with no parent OR whose parent isn't in this layer.
  const idsInLayer = new Set(allInLayer.map((s) => s.projectStandardId));
  const roots = entries.filter(
    (s) => !s.parentStandardId || !idsInLayer.has(s.parentStandardId),
  );

  // Stage badge: use position among roots (1, 2, 3 …) — engineers reorder this with ↑↓.
  const rootStage = new Map<string, number>();
  roots.forEach((r, i) => rootStage.set(r.projectStandardId, i + 1));

  return (
    <div className="space-y-6">
      {roots.map((root, idx) => (
        <div key={root.projectStandardId}>
          {idx > 0 && (
            <div aria-hidden="true" className="ml-10 mb-3 text-accent-2 text-2xl leading-none">
              ↓
            </div>
          )}
          <TrainNode
            node={root}
            allInLayer={allInLayer}
            projectId={projectId}
            locale={locale}
            pickTitle={pickTitle}
            pickWsTitle={pickWsTitle}
            stageBadge={`Stage ${rootStage.get(root.projectStandardId)}`}
            move={move}
            setLayer={setLayer}
            setRelation={setRelation}
            canMoveUp={idx > 0}
            canMoveDown={idx < roots.length - 1}
            pending={pending}
            depth={0}
          />
        </div>
      ))}
    </div>
  );
}

function TrainNode({
  node,
  allInLayer,
  projectId,
  locale,
  pickTitle,
  pickWsTitle,
  stageBadge,
  move,
  setLayer,
  setRelation,
  canMoveUp,
  canMoveDown,
  pending,
  depth,
}: {
  node: StandardEntry;
  allInLayer: StandardEntry[];
  projectId: string;
  locale: 'de' | 'en';
  pickTitle: (s: StandardEntry['standard']) => string;
  pickWsTitle: (w: Worksheet) => string;
  stageBadge: string | null;
  move: (standardId: string, direction: 'up' | 'down') => void;
  setLayer: (standardId: string, layer: Layer | null) => void;
  setRelation: (
    projectStandardId: string,
    parentProjectStandardId: string | null,
    relationType: RelationType | null,
  ) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  pending: boolean;
  depth: number;
}) {
  const children = allInLayer.filter(
    (s) => s.parentStandardId === node.projectStandardId,
  );
  const seriesKids = children.filter((c) => c.relationType === 'series');
  const parallelKids = children.filter((c) => c.relationType === 'parallel');
  const subKids = children.filter((c) => c.relationType === 'sub_standard');

  // Parent options: all OTHER entries in the layer (so engineer can re-parent).
  const parentOptions = allInLayer
    .filter((s) => s.projectStandardId !== node.projectStandardId)
    .map((s) => ({
      projectStandardId: s.projectStandardId,
      code: s.standard.code,
    }));

  return (
    <div className={depth > 0 ? 'ml-8 border-l-2 border-hairline pl-4' : ''}>
      <StandardBox
        s={node}
        projectId={projectId}
        locale={locale}
        pickTitle={pickTitle}
        pickWsTitle={pickWsTitle}
        stageBadge={stageBadge}
        onMoveUp={() => move(node.standard.id, 'up')}
        onMoveDown={() => move(node.standard.id, 'down')}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onLayerChange={(l) => setLayer(node.standard.id, l)}
        parentOptions={parentOptions}
        onRelationChange={(parentPSId, rel) => setRelation(node.projectStandardId, parentPSId, rel)}
        showHierarchyControls={true}
        pending={pending}
      />

      {/* sub-standards: indented under parent */}
      {subKids.length > 0 && (
        <div className="mt-3 space-y-2">
          {subKids.map((c) => (
            <TrainNode
              key={c.projectStandardId}
              node={c}
              allInLayer={allInLayer}
              projectId={projectId}
              locale={locale}
              pickTitle={pickTitle}
              pickWsTitle={pickWsTitle}
              stageBadge={null}
              move={move}
              setLayer={setLayer}
              setRelation={setRelation}
              canMoveUp={false}
              canMoveDown={false}
              pending={pending}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* parallel siblings: side-by-side with ODER */}
      {parallelKids.length > 0 && (
        <div className="mt-4">
          <div aria-hidden="true" className="ml-10 mb-2 text-subtext text-2xl leading-none">↓</div>
          <div className="flex items-stretch gap-4 flex-wrap">
            {parallelKids.map((c, i) => (
              <Fragment key={c.projectStandardId}>
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className="self-center text-[10px] uppercase tracking-[0.25em] text-subtext"
                  >
                    ODER
                  </span>
                )}
                <div className="flex-1 min-w-[16rem]">
                  <TrainNode
                    node={c}
                    allInLayer={allInLayer}
                    projectId={projectId}
                    locale={locale}
                    pickTitle={pickTitle}
                    pickWsTitle={pickWsTitle}
                    stageBadge={null}
                    move={move}
                    setLayer={setLayer}
                    setRelation={setRelation}
                    canMoveUp={false}
                    canMoveDown={false}
                    pending={pending}
                    depth={depth}
                  />
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {/* series children: chained below with ↓ */}
      {seriesKids.length > 0 && (
        <div className="mt-4 space-y-4">
          {seriesKids.map((c) => (
            <div key={c.projectStandardId}>
              <div aria-hidden="true" className="ml-10 mb-3 text-accent-2 text-2xl leading-none">↓</div>
              <TrainNode
                node={c}
                allInLayer={allInLayer}
                projectId={projectId}
                locale={locale}
                pickTitle={pickTitle}
                pickWsTitle={pickWsTitle}
                stageBadge={null}
                move={move}
                setLayer={setLayer}
                setRelation={setRelation}
                canMoveUp={false}
                canMoveDown={false}
                pending={pending}
                depth={depth}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Standard box — used by both flat and tree renders.
 * ========================================================================== */
function StandardBox({
  s,
  projectId,
  locale,
  pickTitle,
  pickWsTitle,
  stageBadge,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onLayerChange,
  parentOptions,
  onRelationChange,
  showHierarchyControls,
  pending,
}: {
  s: StandardEntry;
  projectId: string;
  locale: 'de' | 'en';
  pickTitle: (s: StandardEntry['standard']) => string;
  pickWsTitle: (w: Worksheet) => string;
  stageBadge: string | null;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onLayerChange: (l: Layer | null) => void;
  parentOptions: Array<{ projectStandardId: string; code: string }>;
  onRelationChange: (parentPSId: string | null, rel: RelationType | null) => void;
  showHierarchyControls: boolean;
  pending: boolean;
}) {
  const total = s.worksheets.length;
  const done = s.worksheets.filter(
    (w) => w.status === 'engineer_approved' || w.status === 'final',
  ).length;

  return (
    <div className="border border-hairline rounded-md p-4 bg-paper space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-3 min-w-0">
          {stageBadge && (
            <span className="text-[10px] uppercase tracking-[0.18em] bg-accent/10 text-accent px-1.5 py-0.5 rounded shrink-0">
              {stageBadge}
            </span>
          )}
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-ink truncate">{s.standard.code}</h4>
            <p className="text-xs text-subtext truncate">
              {pickTitle(s.standard)} · {s.standard.version}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.18em] text-subtext tabular-nums">
            {done} / {total} fertig
          </span>
          <div className="flex border border-hairline rounded">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp || pending}
              aria-label="Stage nach oben"
              title="Stage nach oben"
              className="px-2 py-1 text-[12px] leading-none hover:bg-paper-2 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown || pending}
              aria-label="Stage nach unten"
              title="Stage nach unten"
              className="px-2 py-1 text-[12px] leading-none hover:bg-paper-2 disabled:opacity-30 disabled:hover:bg-transparent border-l border-hairline"
            >
              ↓
            </button>
          </div>
          <select
            value={s.layer ?? ''}
            onChange={(e) => onLayerChange((e.target.value || null) as Layer | null)}
            disabled={pending}
            className="text-[10px] uppercase tracking-[0.18em] border border-hairline bg-transparent rounded px-1.5 py-1"
            aria-label="Layer wählen"
          >
            <option value="">— Layer —</option>
            <option value="management">Management</option>
            <option value="cost">Kosten</option>
            <option value="technical">Technisch</option>
          </select>
        </div>
      </div>

      {showHierarchyControls && (
        <HierarchyControls
          s={s}
          parentOptions={parentOptions}
          onRelationChange={onRelationChange}
          pending={pending}
        />
      )}

      <ul className="space-y-0.5 max-h-48 overflow-y-auto">
        {s.worksheets.map((w) => {
          const status: WorksheetStatus = w.status ?? 'draft';
          return (
            <li key={w.templateId}>
              <Link
                href={`/${locale}/projects/${projectId}/standards/${s.standard.code}/worksheets/${w.code}`}
                className="grid grid-cols-[12px_28px_88px_1fr_auto] items-center gap-3 px-2 py-1.5 text-sm rounded hover:bg-paper-2/50"
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[status]}`}
                  aria-label={`Status: ${STATUS_LABEL[status]}`}
                />
                <span className="text-[10px] text-subtext tabular-nums">
                  {w.phase != null ? `P${w.phase}` : '—'}
                </span>
                <span className="text-xs text-subtext tracking-wide">{w.code}</span>
                <span className="text-ink truncate">{pickWsTitle(w)}</span>
                <span className="text-[10px] text-subtext">{STATUS_LABEL[status]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HierarchyControls({
  s,
  parentOptions,
  onRelationChange,
  pending,
}: {
  s: StandardEntry;
  parentOptions: Array<{ projectStandardId: string; code: string }>;
  onRelationChange: (parentPSId: string | null, rel: RelationType | null) => void;
  pending: boolean;
}) {
  const currentParent = s.parentStandardId ?? '';
  const currentRel = s.relationType ?? 'series';

  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-subtext flex-wrap">
      <span>Beziehung:</span>
      <select
        value={currentParent}
        onChange={(e) => {
          const v = e.target.value || null;
          onRelationChange(v, v ? (currentRel as RelationType) : null);
        }}
        disabled={pending}
        aria-label="Eltern-Standard wählen"
        className="border border-hairline bg-transparent rounded px-1.5 py-1"
      >
        <option value="">— Root —</option>
        {parentOptions.map((p) => (
          <option key={p.projectStandardId} value={p.projectStandardId}>
            {p.code}
          </option>
        ))}
      </select>
      {s.parentStandardId && (
        <select
          value={currentRel}
          onChange={(e) => onRelationChange(s.parentStandardId, e.target.value as RelationType)}
          disabled={pending}
          aria-label="Beziehungs-Typ"
          className="border border-hairline bg-transparent rounded px-1.5 py-1"
        >
          <option value="series">In Reihe</option>
          <option value="parallel">Parallel</option>
          <option value="sub_standard">Sub-Standard</option>
        </select>
      )}
    </div>
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
  const missingMgmt = ['DWA-M-820-1', 'DWA-M-820-2', 'DWA-M-820-3'].filter((c) => !presentCodes.has(c));
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
          <dd className="text-ink">
            Behandlungs-Train (Engineer-Auswahl)
          </dd>
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
