'use client';
import { useMemo, useTransition, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { evaluateCondition, type EvalResult } from '@/lib/compliance/evaluate';
import { addStandardByCodeToProject } from '@/lib/actions/project-standards';

type ComplianceReq = {
  id: string;
  code: string;
  titleDe: string;
  titleEn: string | null;
  condition: string;
  description: string | null;
  clauseReference: string | null;
  severity: string;
  suggestion: string | null;
};

export type ComplianceSuggestion = {
  id: string;
  requirementId: string;
  suggestionType: 'alternative_worksheet' | 'alternative_standard' | 'upstream_treatment' | 'design_change';
  targetStandardCode: string | null;
  targetWorksheetCode: string | null;
  suggestionDe: string;
  suggestionEn: string | null;
  condition: string | null;
};

type FieldRef = { id: string; symbol: string };

type Props = {
  requirements: ComplianceReq[];
  suggestions: ComplianceSuggestion[];
  /** field id → symbol map for the current worksheet — used to read store values. */
  fields: FieldRef[];
  locale: 'de' | 'en';
  projectId: string;
};

export function ComplianceBlock({ requirements, suggestions, fields, locale, projectId }: Props) {
  const values = useWorksheetStore((s) => s.values);

  const lookup = useMemo(() => {
    const symbolToValue = new Map<string, number | string | boolean | null>();
    for (const f of fields) {
      const v = values[f.id];
      if (!v) continue;
      switch (v.type) {
        case 'number': symbolToValue.set(f.symbol, v.value); break;
        case 'text': symbolToValue.set(f.symbol, v.value); break;
        case 'enum': symbolToValue.set(f.symbol, v.value); break;
        case 'date': symbolToValue.set(f.symbol, v.value); break;
        case 'boolean': symbolToValue.set(f.symbol, v.value); break;
        case 'json': /* skip */ break;
      }
    }
    return (sym: string) => {
      if (!symbolToValue.has(sym)) return undefined;
      return symbolToValue.get(sym) ?? null;
    };
  }, [fields, values]);

  const results = useMemo(
    () => requirements.map((cr) => ({ cr, result: evaluateCondition(cr.condition, lookup) })),
    [requirements, lookup],
  );

  const suggestionsByReq = useMemo(() => {
    const m = new Map<string, ComplianceSuggestion[]>();
    for (const s of suggestions) {
      const arr = m.get(s.requirementId) ?? [];
      arr.push(s);
      m.set(s.requirementId, arr);
    }
    return m;
  }, [suggestions]);

  if (requirements.length === 0) return null;

  const counts = results.reduce(
    (acc, r) => {
      acc[r.result.kind]++;
      return acc;
    },
    { pass: 0, fail: 0, pending: 0, manual: 0 },
  );

  return (
    <section className="border-t border-hairline pt-6 mt-8 space-y-4">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
          Compliance-Anforderungen
        </h2>
        <div className="text-[10px] uppercase tracking-[0.18em] text-subtext flex gap-3">
          {counts.pass > 0 && <span className="text-success">✓ {counts.pass}</span>}
          {counts.fail > 0 && <span className="text-error">✗ {counts.fail}</span>}
          {counts.pending > 0 && <span className="text-subtext">○ {counts.pending}</span>}
          {counts.manual > 0 && <span className="text-subtext">? {counts.manual}</span>}
        </div>
      </div>
      <ul className="space-y-3">
        {results.map(({ cr, result }) => {
          const reqSuggestions = suggestionsByReq.get(cr.id) ?? [];
          const filteredSuggestions = reqSuggestions.filter((s) => {
            if (!s.condition) return true;
            const r = evaluateCondition(s.condition, lookup);
            return r.kind === 'pass';
          });
          return (
            <li key={cr.id} className="text-sm text-ink space-y-1">
              <div className="flex items-baseline gap-3">
                <StatusBadge result={result} />
                <span className="text-[11px] uppercase tracking-[0.2em] text-subtext shrink-0">
                  {cr.code}
                </span>
                <span className="font-medium">
                  {locale === 'de' ? cr.titleDe : cr.titleEn ?? cr.titleDe}
                </span>
              </div>
              {cr.description && (
                <p className="text-xs text-subtext ml-[140px]">{cr.description}</p>
              )}
              <div className="text-[10px] uppercase tracking-[0.18em] text-subtext ml-[140px] flex gap-3 flex-wrap">
                <code>{cr.condition}</code>
                {cr.clauseReference && <span>{cr.clauseReference}</span>}
                {result.kind === 'pending' && result.missingSymbols.length > 0 && (
                  <span className="text-subtext">
                    fehlend: {result.missingSymbols.join(', ')}
                  </span>
                )}
              </div>
              {result.kind === 'fail' && filteredSuggestions.length > 0 && (
                <div className="ml-[140px] mt-2 space-y-2">
                  {filteredSuggestions.map((s) => (
                    <SuggestionCard
                      key={s.id}
                      suggestion={s}
                      locale={locale}
                      projectId={projectId}
                    />
                  ))}
                </div>
              )}
              {result.kind === 'fail' && filteredSuggestions.length === 0 && cr.suggestion && (
                <p className="ml-[140px] mt-2 text-xs text-subtext italic">{cr.suggestion}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SuggestionCard({
  suggestion,
  locale,
  projectId,
}: {
  suggestion: ComplianceSuggestion;
  locale: 'de' | 'en';
  projectId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const text = locale === 'de' ? suggestion.suggestionDe : suggestion.suggestionEn ?? suggestion.suggestionDe;
  const typeLabel = TYPE_LABELS[suggestion.suggestionType][locale];

  function addToProject(code: string) {
    setError(null);
    start(async () => {
      const r = await addStandardByCodeToProject(projectId, code);
      if (!r.ok) setError(r.error);
      else {
        setAdded(true);
        router.refresh();
      }
    });
  }

  // For alternative_worksheet: deep-link target
  const wsLink = suggestion.targetWorksheetCode && suggestion.targetStandardCode
    ? `/${locale}/projects/${projectId}/standards/${suggestion.targetStandardCode}/worksheets/${suggestion.targetWorksheetCode}`
    : null;

  return (
    <div className="border-l-2 border-accent/40 bg-paper-2/30 px-3 py-2 rounded-r text-sm space-y-1">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-[0.18em] text-accent">
          {typeLabel}
        </span>
        {suggestion.targetStandardCode && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-subtext">
            → {suggestion.targetStandardCode}
            {suggestion.targetWorksheetCode ? ` · ${suggestion.targetWorksheetCode}` : ''}
          </span>
        )}
      </div>
      <p className="text-sm text-ink leading-snug">{text}</p>
      <div className="flex gap-3 items-center flex-wrap pt-1">
        {(suggestion.suggestionType === 'alternative_standard' ||
          suggestion.suggestionType === 'upstream_treatment') &&
          suggestion.targetStandardCode && (
            <button
              type="button"
              onClick={() => addToProject(suggestion.targetStandardCode!)}
              disabled={pending || added}
              className="text-[10px] uppercase tracking-[0.18em] text-accent hover:text-ink underline disabled:opacity-50"
            >
              {added ? '✓ Hinzugefügt' : pending ? '…' : 'Zu Projekt hinzufügen'}
            </button>
          )}
        {wsLink && (
          <Link
            href={wsLink}
            className="text-[10px] uppercase tracking-[0.18em] text-accent hover:text-ink underline"
          >
            Worksheet öffnen →
          </Link>
        )}
        {error && (
          <span className="text-[10px] text-error">Fehler: {error}</span>
        )}
      </div>
    </div>
  );
}

const TYPE_LABELS: Record<
  'alternative_worksheet' | 'alternative_standard' | 'upstream_treatment' | 'design_change',
  { de: string; en: string }
> = {
  alternative_worksheet: { de: 'Alternative Worksheet', en: 'Alternative worksheet' },
  alternative_standard: { de: 'Alternatives Regelwerk', en: 'Alternative standard' },
  upstream_treatment: { de: 'Vorbehandlung', en: 'Upstream treatment' },
  design_change: { de: 'Designänderung', en: 'Design change' },
};

function StatusBadge({ result }: { result: EvalResult }) {
  switch (result.kind) {
    case 'pass':
      return (
        <span
          aria-label="Erfüllt"
          title="Erfüllt"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/10 text-success text-xs font-semibold shrink-0"
        >
          ✓
        </span>
      );
    case 'fail':
      return (
        <span
          aria-label="Nicht erfüllt"
          title="Nicht erfüllt"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-error/10 text-error text-xs font-semibold shrink-0"
        >
          ✗
        </span>
      );
    case 'pending':
      return (
        <span
          aria-label="Eingabe erforderlich"
          title="Eingabe erforderlich"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-paper-2 text-subtext text-xs font-semibold shrink-0"
        >
          ○
        </span>
      );
    case 'manual':
      return (
        <span
          aria-label="Manuell prüfen"
          title="Manuell prüfen"
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-paper-2 text-subtext text-xs font-semibold shrink-0"
        >
          ?
        </span>
      );
  }
}
