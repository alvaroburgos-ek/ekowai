'use client';
import { ClauseChip } from '@/components/norm-text/clause-chip';

import { KatexFormula } from '@/components/math/katex-formula';
import { VerifyButton } from './verify-button';

type Equation = {
  id: string;
  equationNumber: string;
  formula: string;
  inputSymbols: string[] | null;
  outputSymbol: string | null;
  clauseReference: string | null;
  description: string | null;
  verificationStatus: string;
  verifiedByLabel?: string | null;
  verifiedAt?: string | null;
  verificationNote?: string | null;
};

export function EquationsBlock({
  equations,
  isPlatformEngineer = false,
}: {
  equations: Equation[];
  isPlatformEngineer?: boolean;
}) {
  if (equations.length === 0) return null;
  return (
    <section className="border-t border-hairline pt-6 mt-8 space-y-4">
      <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
        Gleichungen dieses Arbeitsblatts
      </h2>
      <ul className="space-y-3">
        {equations.map((eq) => (
          <li key={eq.id} className="text-sm text-ink space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-[11px] uppercase tracking-[0.2em] text-subtext shrink-0">
                Gl. {eq.equationNumber}
              </span>
              <KatexFormula
                source={eq.formula}
                className="text-sm text-ink overflow-x-auto"
              />
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-subtext ml-[68px] flex flex-wrap gap-3 items-baseline">
              {eq.clauseReference && (
                <ClauseChip clauseReference={eq.clauseReference} />
              )}
              {eq.verificationStatus !== 'engineer_verified' && (
                <span className="text-accent-2">imported_unverified</span>
              )}
              {isPlatformEngineer && (
                <VerifyButton
                  target="equation"
                  id={eq.id}
                  status={eq.verificationStatus}
                  verifiedByLabel={eq.verifiedByLabel}
                  verifiedAt={eq.verifiedAt}
                  verificationNote={eq.verificationNote}
                />
              )}
            </div>
            {eq.description && (
              <p className="text-xs text-subtext ml-[68px]">{eq.description}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
