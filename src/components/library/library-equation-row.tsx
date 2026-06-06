import { ClauseChip } from '@/components/norm-text/clause-chip';
import { KatexFormula } from '@/components/math/katex-formula';
import { VerifyButton } from '@/components/worksheet/verify-button';

export type LibraryEquationRowData = {
  id: string;
  equationNumber: string;
  formula: string;
  inputSymbols: string[] | null;
  outputSymbol: string | null;
  outputUnit: string | null;
  clauseReference: string | null;
  description: string | null;
  verificationStatus: string;
  verifiedByLabel: string | null;
  verifiedAt: string | null;
  verificationNote: string | null;
};

export function LibraryEquationRow({ eq }: { eq: LibraryEquationRowData }) {
  return (
    <li className="py-3 border-b border-hairline last:border-b-0 space-y-1">
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-[11px] uppercase tracking-[0.2em] text-subtext shrink-0">
          Gl. {eq.equationNumber}
        </span>
        <KatexFormula source={eq.formula} className="text-sm text-ink overflow-x-auto flex-1 min-w-0" />
        <VerifyButton
          target="equation"
          id={eq.id}
          status={eq.verificationStatus}
          verifiedByLabel={eq.verifiedByLabel}
          verifiedAt={eq.verifiedAt}
          verificationNote={eq.verificationNote}
        />
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-subtext sm:ml-[68px] flex flex-wrap gap-3 items-baseline min-w-0">
        {eq.clauseReference && <ClauseChip clauseReference={eq.clauseReference} />}
        {eq.outputSymbol && (
          <span className="normal-case tracking-normal text-ink-2">
            → <code className="font-mono">{eq.outputSymbol}</code>
            {eq.outputUnit && ` (${eq.outputUnit})`}
          </span>
        )}
        {eq.inputSymbols && eq.inputSymbols.length > 0 && (
          <span className="normal-case tracking-normal text-ink-2">
            Inputs: <code className="font-mono">{eq.inputSymbols.join(', ')}</code>
          </span>
        )}
        {eq.verificationStatus !== 'engineer_verified' && (
          <span className="text-accent-2">{eq.verificationStatus}</span>
        )}
      </div>
      {eq.description && (
        <p className="text-xs text-subtext sm:ml-[68px] break-words">{eq.description}</p>
      )}
    </li>
  );
}
