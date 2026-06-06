import { ClauseChip } from '@/components/norm-text/clause-chip';
import { VerifyButton } from '@/components/worksheet/verify-button';

export type LibraryFieldRowData = {
  id: string;
  symbol: string;
  labelDe: string;
  labelEn: string | null;
  unit: string | null;
  dataType: string;
  isRequired: boolean;
  enumValues: Array<{ value: string; label_de: string | null; label_en: string | null }> | null;
  validationRules: { min?: number; max?: number; maxLength?: number; raw?: string } | null;
  clauseReference: string | null;
  description: string | null;
  verificationStatus: string;
  defaultValue: { type?: string; value?: unknown } | null;
  verifiedByLabel: string | null;
  verifiedAt: string | null;
  verificationNote: string | null;
};

export function LibraryFieldRow({ field }: { field: LibraryFieldRowData }) {
  const isVerified = field.verificationStatus === 'engineer_verified';
  const min = field.validationRules?.min;
  const max = field.validationRules?.max;
  const hasRange = typeof min === 'number' || typeof max === 'number';

  return (
    <li
      className="py-3 border-b border-hairline last:border-b-0"
      data-symbol={field.symbol}
    >
      <div className="flex items-baseline gap-3 flex-wrap">
        <code className="font-mono text-xs text-ink-2 shrink-0">{field.symbol}</code>
        <span className="font-medium text-ink flex-1 min-w-0">
          {field.labelDe}
          {field.isRequired && <span className="ml-1 text-accent-2">*</span>}
        </span>
        <VerifyButton
          target="field"
          id={field.id}
          status={field.verificationStatus}
          verifiedByLabel={field.verifiedByLabel}
          verifiedAt={field.verifiedAt}
          verificationNote={field.verificationNote}
        />
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-subtext mt-1 flex flex-wrap items-baseline gap-2">
        <span>{field.dataType}</span>
        {field.unit && <span className="text-ink-2 normal-case tracking-normal">{field.unit}</span>}
        {field.clauseReference && <ClauseChip clauseReference={field.clauseReference} />}
        {hasRange && (
          <span className="normal-case tracking-normal text-ink-2">
            {typeof min === 'number' ? min : '−∞'} – {typeof max === 'number' ? max : '∞'}
          </span>
        )}
        {field.defaultValue?.value != null && (
          <span className="normal-case tracking-normal text-ink-2 break-words min-w-0">
            Default: <code className="font-mono">{JSON.stringify(field.defaultValue.value)}</code>
          </span>
        )}
        {!isVerified && (
          <span className="text-accent-2 normal-case tracking-normal">{field.verificationStatus}</span>
        )}
      </div>
      {field.enumValues && field.enumValues.length > 0 && (
        <div className="text-[11px] text-subtext mt-1 break-words">
          Werte: {field.enumValues.map((e) => e.value).join(', ')}
        </div>
      )}
      {field.description && (
        <p className="text-xs text-subtext mt-1 leading-snug">{field.description}</p>
      )}
    </li>
  );
}
