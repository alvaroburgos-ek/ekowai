'use client';

type ComplianceReq = {
  id: string;
  code: string;
  titleDe: string;
  condition: string;
  description: string | null;
  clauseReference: string | null;
  severity: string;
};

export function ComplianceBlock({ requirements }: { requirements: ComplianceReq[] }) {
  if (requirements.length === 0) return null;
  return (
    <section className="border-t border-hairline pt-6 mt-8 space-y-4">
      <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
        Compliance-Anforderungen
      </h2>
      <p className="text-xs text-subtext italic">
        Phase 2: Pass/Fail-Auswertung. Phase 1: nur gelistet.
      </p>
      <ul className="space-y-3">
        {requirements.map((cr) => (
          <li key={cr.id} className="text-sm text-ink space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-[11px] uppercase tracking-[0.2em] text-subtext shrink-0">
                {cr.code}
              </span>
              <span className="font-medium">{cr.titleDe}</span>
            </div>
            {cr.description && (
              <p className="text-xs text-subtext ml-[120px]">{cr.description}</p>
            )}
            <div className="text-[10px] uppercase tracking-[0.18em] text-subtext ml-[120px] flex gap-3">
              <code className="font-mono">{cr.condition}</code>
              {cr.clauseReference && <span>{cr.clauseReference}</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
