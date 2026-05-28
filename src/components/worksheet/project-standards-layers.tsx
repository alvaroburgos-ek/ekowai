'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  setProjectStandardLayer,
  moveProjectStandard,
  applyRecommendedStructure,
  type Layer,
} from '@/lib/actions/project-standards';
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
  standard: {
    id: string;
    code: string;
    titleDe: string;
    titleEn: string | null;
    version: string;
  };
  layer: Layer | null;
  stageOrder: number | null;
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

  const grouped = new Map<Layer | 'unassigned', StandardEntry[]>();
  for (const s of standards) {
    const key = (s.layer ?? 'unassigned') as Layer | 'unassigned';
    const arr = grouped.get(key) ?? [];
    arr.push(s);
    grouped.set(key, arr);
  }
  for (const arr of grouped.values()) {
    arr.sort((a, b) => {
      const ao = a.stageOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.stageOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.standard.code.localeCompare(b.standard.code);
    });
  }

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
        const entries = grouped.get(layer) ?? [];
        if (entries.length === 0) return null;
        const isTechnical = layer === 'technical';
        return (
          <section key={layer} className="space-y-3">
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-subtext border-b border-hairline pb-2">
              Layer {LAYER_ORDER.indexOf(layer) + 1} · {LAYER_LABEL_DE[layer]}
            </h3>
            <div className={isTechnical ? 'space-y-2' : 'space-y-4'}>
              {entries.map((s, idx) => (
                <div key={s.standard.id}>
                  <StandardRow
                    s={s}
                    locale={locale}
                    projectId={projectId}
                    pickTitle={pickTitle}
                    pickWsTitle={pickWsTitle}
                    onMoveUp={() => move(s.standard.id, 'up')}
                    onMoveDown={() => move(s.standard.id, 'down')}
                    onLayerChange={(l) => setLayer(s.standard.id, l)}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < entries.length - 1}
                    pending={pending}
                  />
                  {isTechnical && idx < entries.length - 1 && (
                    <div
                      aria-hidden="true"
                      className="ml-6 my-2 text-accent-2 text-lg leading-none"
                    >
                      ↓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {(grouped.get('unassigned') ?? []).length > 0 && (
        <section className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.25em] text-subtext border-b border-hairline pb-2">
            Ohne Zuordnung
          </h3>
          <div className="space-y-4">
            {(grouped.get('unassigned') ?? []).map((s) => (
              <StandardRow
                key={s.standard.id}
                s={s}
                locale={locale}
                projectId={projectId}
                pickTitle={pickTitle}
                pickWsTitle={pickWsTitle}
                onMoveUp={() => move(s.standard.id, 'up')}
                onMoveDown={() => move(s.standard.id, 'down')}
                onLayerChange={(l) => setLayer(s.standard.id, l)}
                canMoveUp={false}
                canMoveDown={false}
                pending={pending}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

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
          Drei Layer: Management → Kosten → Technische Bemessung. Du kannst die
          Empfehlung anwenden, ergänzen oder eine eigene Struktur wählen.
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
            DWA-A 138-1, A 178, A 262E, M 102-4, M 179-1, FLL …
            <span className="text-subtext"> (vom Engineer gewählt)</span>
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

function StandardRow({
  s,
  locale,
  projectId,
  pickTitle,
  pickWsTitle,
  onMoveUp,
  onMoveDown,
  onLayerChange,
  canMoveUp,
  canMoveDown,
  pending,
}: {
  s: StandardEntry;
  locale: 'de' | 'en';
  projectId: string;
  pickTitle: (s: StandardEntry['standard']) => string;
  pickWsTitle: (w: Worksheet) => string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onLayerChange: (l: Layer | null) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  pending: boolean;
}) {
  const total = s.worksheets.length;
  const done = s.worksheets.filter(
    (w) => w.status === 'engineer_approved' || w.status === 'final',
  ).length;

  return (
    <div className="space-y-3 border border-hairline rounded-md p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-ink truncate">
            {s.standard.code}
          </h4>
          <p className="text-xs text-subtext truncate">
            {pickTitle(s.standard)} · {s.standard.version}
          </p>
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
              aria-label="Nach oben"
              className="px-2 py-1 text-[10px] hover:bg-paper-2 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown || pending}
              aria-label="Nach unten"
              className="px-2 py-1 text-[10px] hover:bg-paper-2 disabled:opacity-30 disabled:hover:bg-transparent border-l border-hairline"
            >
              ↓
            </button>
          </div>
          <select
            value={s.layer ?? ''}
            onChange={(e) =>
              onLayerChange((e.target.value || null) as Layer | null)
            }
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

      <ul className="space-y-0.5">
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
                <span className="text-[10px] text-subtext">
                  {STATUS_LABEL[status]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
