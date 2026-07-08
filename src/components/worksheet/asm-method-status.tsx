'use client';

/**
 * AsmMethodStatus — three-state visual badge for the A138-12 A_S,m
 * determination-method field.
 *
 * This is a pure display component — it renders NO editable controls. It is
 * used by DynamicField when the field symbol is `A_S_m`, rendered directly
 * below the field so the engineer sees at a glance how the value was derived.
 *
 * Three states:
 *   derived              → grey "abgeleitet" (optionally with method sub-label)
 *   manual               → blue "vorgegeben — Herkunft: <provenance>"
 *   needs_reconfirmation → amber "Typ geändert — A_S,m bestätigen"
 *
 * Tokens used (mirror of AcAsRatioCheckStatus):
 *   derived              → text-subtext + bg-paper-2     + border-hairline-strong
 *   manual               → text-accent-2 + bg-accent-soft + border-accent/30
 *   needs_reconfirmation → text-warning  + bg-warning/10  + border-warning/30
 */

export type AsmMethodBadgeState = 'derived' | 'manual' | 'needs_reconfirmation';

/** Human-readable sub-label for the derived state (the actual method key). */
const DERIVED_METHOD_LABELS: Record<string, string> = {
  direct: 'Direkt',
  geometry: 'Geometrie',
  soil_estimate: 'Bodenabschätzung',
};

type Props = {
  state: AsmMethodBadgeState;
  /** When state='derived', optionally the raw method key to show in parentheses. */
  derivedMethod?: string | null;
  /** When state='manual', the provenance text entered by the engineer. */
  provenance?: string | null;
};

export function AsmMethodStatus({ state, derivedMethod, provenance }: Props) {
  if (state === 'needs_reconfirmation') {
    return (
      <div className="space-y-1.5" data-testid="asm-method-status">
        <span
          data-testid="asm-method-badge"
          data-state={state}
          className="inline-flex items-center px-2.5 py-1 rounded border text-xs font-semibold tracking-wide text-warning bg-warning/10 border-warning/30"
        >
          Typ geändert — A_S,m bestätigen
        </span>
      </div>
    );
  }

  if (state === 'manual') {
    return (
      <div className="space-y-1.5" data-testid="asm-method-status">
        <span
          data-testid="asm-method-badge"
          data-state={state}
          className="inline-flex items-center px-2.5 py-1 rounded border text-xs font-semibold tracking-wide text-accent-2 bg-accent-soft border-accent/30"
        >
          vorgegeben{provenance ? ` — Herkunft: ${provenance}` : ''}
        </span>
      </div>
    );
  }

  // derived (default)
  const methodLabel = derivedMethod ? (DERIVED_METHOD_LABELS[derivedMethod] ?? derivedMethod) : null;
  return (
    <div className="space-y-1.5" data-testid="asm-method-status">
      <span
        data-testid="asm-method-badge"
        data-state={state}
        className="inline-flex items-center px-2.5 py-1 rounded border text-xs font-semibold tracking-wide text-subtext bg-paper-2 border-hairline-strong"
      >
        abgeleitet{methodLabel ? ` (${methodLabel})` : ''}
      </span>
    </div>
  );
}
