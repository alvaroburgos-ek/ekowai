'use client';
import { useMemo } from 'react';
import { useWorksheetStore } from '@/lib/state/worksheet-store';
import { evaluateCondition, type EvalResult } from '@/lib/compliance/evaluate';

type ComplianceReq = {
  id: string;
  code: string;
  titleDe: string;
  condition: string;
  description: string | null;
  clauseReference: string | null;
  severity: string;
};

type FieldRef = { id: string; symbol: string };

type Props = {
  requirements: ComplianceReq[];
  /** field id → symbol map for the current worksheet — used to read store values. */
  fields: FieldRef[];
};

export function ComplianceBlock({ requirements, fields }: Props) {
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
        {results.map(({ cr, result }) => (
          <li key={cr.id} className="text-sm text-ink space-y-1">
            <div className="flex items-baseline gap-3">
              <StatusBadge result={result} />
              <span className="text-[11px] uppercase tracking-[0.2em] text-subtext shrink-0">
                {cr.code}
              </span>
              <span className="font-medium">{cr.titleDe}</span>
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
          </li>
        ))}
      </ul>
    </section>
  );
}

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
