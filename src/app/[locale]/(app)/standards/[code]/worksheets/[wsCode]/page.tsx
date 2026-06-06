import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { loadWorksheet } from '@/lib/db/queries/worksheet';
import { currentUserIsPlatformEngineer } from '@/lib/auth/platform-engineer';
import { LibraryFieldRow } from '@/components/library/library-field-row';
import { LibraryEquationRow } from '@/components/library/library-equation-row';
import { BulkVerifyFieldsButton } from '@/components/library/bulk-verify-button';
import { ClauseChip } from '@/components/norm-text/clause-chip';
import { NormTextProvider } from '@/components/norm-text/norm-text-context';
import { BackLink } from '@/components/ui/back-link';

export const dynamic = 'force-dynamic';

export default async function LibraryWorksheetPage({
  params,
}: {
  params: Promise<{ locale: string; code: string; wsCode: string }>;
}) {
  const { locale, code, wsCode } = await params;
  const isPlatformEngineer = await currentUserIsPlatformEngineer();
  if (!isPlatformEngineer) redirect(`/${locale}/projects`);

  const ws = await loadWorksheet(code, wsCode);
  if (!ws) notFound();

  // Resolve verifier labels (email/full name) for all rows that have a
  // verified_by_user_id. One batch lookup keeps this O(1) extra round-trip.
  const verifierIds = new Set<string>();
  for (const f of ws.fields) if (f.verifiedByUserId) verifierIds.add(f.verifiedByUserId);
  for (const e of ws.equations) if (e.verifiedByUserId) verifierIds.add(e.verifiedByUserId);
  const verifierLabels = new Map<string, string>();
  if (verifierIds.size > 0) {
    const rows = await db
      .select({ id: profiles.id, email: profiles.email, fullName: profiles.fullName })
      .from(profiles)
      .where(inArray(profiles.id, Array.from(verifierIds)));
    for (const r of rows) verifierLabels.set(r.id, r.fullName ?? r.email);
  }

  // Group fields by section for readability. Orphans (sectionId null) go
  // first under "Allgemein".
  const fieldsBySection = new Map<string | null, typeof ws.fields>();
  for (const f of ws.fields) {
    if (!f.active) continue;
    const key = f.sectionId ?? null;
    const arr = fieldsBySection.get(key) ?? [];
    arr.push(f);
    fieldsBySection.set(key, arr);
  }

  const unverifiedFieldCount = ws.fields.filter(
    (f) => f.active && f.verificationStatus !== 'engineer_verified',
  ).length;
  const verifiedFieldCount = ws.fields.filter(
    (f) => f.active && f.verificationStatus === 'engineer_verified',
  ).length;
  const totalFieldCount = ws.fields.filter((f) => f.active).length;

  const buildFieldRow = (f: typeof ws.fields[number]) => ({
    id: f.id,
    symbol: f.symbol,
    labelDe: f.labelDe,
    labelEn: f.labelEn,
    unit: f.unit,
    dataType: f.dataType,
    isRequired: f.isRequired,
    enumValues: f.enumValues as Array<{ value: string; label_de: string | null; label_en: string | null }> | null,
    validationRules: f.validationRules as { min?: number; max?: number; maxLength?: number; raw?: string } | null,
    clauseReference: f.clauseReference,
    description: f.description,
    verificationStatus: f.verificationStatus,
    defaultValue: f.defaultValue as { type?: string; value?: unknown } | null,
    verifiedByLabel: f.verifiedByUserId ? verifierLabels.get(f.verifiedByUserId) ?? null : null,
    verifiedAt: f.verifiedAt ? f.verifiedAt.toISOString() : null,
    verificationNote: f.verificationNote,
  });

  return (
    <NormTextProvider standardCode={code}>
      <div className="space-y-8">
        <BackLink href={`/${locale}/standards/${code}`} label="Zurück zum Regelwerk" />

        <header className="border-b border-hairline pb-6 space-y-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-subtext break-words">
            {ws.template.code}
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight break-words">{ws.template.titleDe}</h1>
          {ws.template.description && (
            <p className="text-sm text-subtext max-w-2xl">{ws.template.description}</p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-2">
            <span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-subtext mr-2">Felder</span>
              <span className="font-mono tabular-nums">{verifiedFieldCount}/{totalFieldCount} bestätigt</span>
            </span>
            <span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-subtext mr-2">Gleichungen</span>
              <span className="font-mono tabular-nums">{ws.equations.filter(e => e.verificationStatus === 'engineer_verified').length}/{ws.equations.length} bestätigt</span>
            </span>
          </div>
          <BulkVerifyFieldsButton
            worksheetTemplateId={ws.template.id}
            unverifiedCount={unverifiedFieldCount}
          />
        </header>

        {/* Orphan fields (no section) */}
        {(fieldsBySection.get(null)?.length ?? 0) > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">Allgemein</h2>
            <ul>
              {fieldsBySection.get(null)!.map((f) => (
                <LibraryFieldRow key={f.id} field={buildFieldRow(f)} />
              ))}
            </ul>
          </section>
        )}

        {/* Sectioned fields */}
        {ws.sections
          .filter((s) => s.parentSectionId === null)
          .map((s) => {
            const items = fieldsBySection.get(s.id) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={s.id} className="space-y-2">
                <h2 className="text-xs uppercase tracking-[0.25em] text-subtext flex items-baseline gap-2">
                  {s.code && <span className="font-mono">{s.code}</span>}
                  <span>{s.titleDe}</span>
                </h2>
                <ul>
                  {items.map((f) => (
                    <LibraryFieldRow key={f.id} field={buildFieldRow(f)} />
                  ))}
                </ul>
              </section>
            );
          })}

        {/* Equations */}
        {ws.equations.length > 0 && (
          <section className="space-y-2 border-t border-hairline pt-6">
            <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
              Gleichungen ({ws.equations.length})
            </h2>
            <ul>
              {ws.equations.map((eq) => (
                <LibraryEquationRow
                  key={eq.id}
                  eq={{
                    id: eq.id,
                    equationNumber: eq.equationNumber,
                    formula: eq.formula,
                    inputSymbols: eq.inputSymbols,
                    outputSymbol: eq.outputSymbol,
                    outputUnit: eq.outputUnit,
                    clauseReference: eq.clauseReference,
                    description: eq.description,
                    verificationStatus: eq.verificationStatus,
                    verifiedByLabel: eq.verifiedByUserId ? verifierLabels.get(eq.verifiedByUserId) ?? null : null,
                    verifiedAt: eq.verifiedAt ? eq.verifiedAt.toISOString() : null,
                    verificationNote: eq.verificationNote,
                  }}
                />
              ))}
            </ul>
          </section>
        )}

        {/* Compliance — read-only metadata (no verification state on this table) */}
        {ws.complianceRequirements.length > 0 && (
          <section className="space-y-2 border-t border-hairline pt-6">
            <h2 className="text-xs uppercase tracking-[0.25em] text-subtext">
              Compliance-Anforderungen ({ws.complianceRequirements.length})
            </h2>
            <ul>
              {ws.complianceRequirements.map((cr) => (
                <li key={cr.id} className="py-3 border-b border-hairline last:border-b-0 space-y-1">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <code className="font-mono text-xs text-ink-2 shrink-0">{cr.code}</code>
                    <span className="font-medium text-ink flex-1 min-w-0">{cr.titleDe}</span>
                    <span className={`text-[10px] uppercase tracking-[0.18em] shrink-0 ${cr.severity === 'error' ? 'text-accent-2' : cr.severity === 'warning' ? 'text-accent' : 'text-subtext'}`}>
                      {cr.severity}
                    </span>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-subtext flex flex-wrap gap-2 min-w-0">
                    {cr.clauseReference && <ClauseChip clauseReference={cr.clauseReference} />}
                    <code className="font-mono normal-case tracking-normal text-ink-2 break-words min-w-0">{cr.condition}</code>
                  </div>
                  {cr.description && (
                    <p className="text-xs text-subtext">{cr.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </NormTextProvider>
  );
}
