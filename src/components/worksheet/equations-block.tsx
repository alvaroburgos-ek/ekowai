'use client';
import { ClauseChip } from '@/components/norm-text/clause-chip';

import { KatexFormula } from '@/components/math/katex-formula';
import { VerifyButton } from './verify-button';
import { verificationStatusLabel, verificationStatusTitle } from '@/lib/verification-status';
import { hintText } from '@/lib/eval/hint-text';
import { visibleEquations } from './visible-equations';

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
  equations: allEquations,
  isPlatformEngineer = false,
  locale = 'de',
  hiddenSymbols,
}: {
  equations: Equation[];
  isPlatformEngineer?: boolean;
  /** Hint language: equations.description holds German + an `[EN] ` part (hint-text.ts). */
  locale?: 'de' | 'en';
  /** U-5: symbols of own fields hidden by `visible_when` — an equation whose inputs are all hidden (or whose output
   * field is hidden) is not listed; nothing left ⇒ the block disappears. */
  hiddenSymbols?: ReadonlySet<string>;
}) {
  const equations = visibleEquations(allEquations, hiddenSymbols);
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
                className="text-sm text-ink overflow-x-auto min-w-0"
              />
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-subtext ml-[68px] flex flex-wrap gap-3 items-baseline">
              {eq.clauseReference && (
                <ClauseChip clauseReference={eq.clauseReference} />
              )}
              {eq.verificationStatus !== 'engineer_verified' && (
                <span
                  className="text-accent-2 normal-case tracking-normal"
                  title={verificationStatusTitle(eq.verificationStatus)}
                >
                  {verificationStatusLabel(eq.verificationStatus)}
                </span>
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
            {hintText(eq.description, locale) && (
              <p className="text-xs text-subtext ml-[68px] leading-snug max-w-prose" data-testid={`equation-hint-${eq.equationNumber}`}>
                {hintText(eq.description, locale)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
