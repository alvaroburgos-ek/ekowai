/**
 * Verification statuses that count as "verified against the source" for the
 * Stage-1 rule (SR-1). Shared by the finalize gate (server) and the PDF
 * assembler (pure) — keep as a dependency-free module.
 */
export const VERIFIED_OK = new Set<string>([
  'engineer_verified',
  'verified_against_standard',
  'corrected',
]);

/**
 * Statuses EXEMPT from the Stage-1 rule: the field is app-internal
 * (project metadata, workflow flags) — the norm does not define it, so there
 * is nothing to verify against. Exempt ≠ verified: these never show as
 * verified, they are simply outside SR-1's scope.
 */
export const VERIFICATION_EXEMPT = new Set<string>(['inferred_from_worksheet']);

/** True when the status neither satisfies nor is exempt from the Stage-1 rule. */
export function blocksVerificationGate(status: string): boolean {
  return !VERIFIED_OK.has(status) && !VERIFICATION_EXEMPT.has(status);
}

/** Reader-facing labels for every verification status. Shared by the field
 * badge and the equations block so the two can never disagree. */
export const VERIFICATION_LABELS_DE: Record<string, { short: string; title: string }> = {
  imported_unverified: {
    short: 'Quelle ungeprüft',
    title: 'Aus Pass3c-Workbook importiert, noch nicht gegen die Norm geprüft.',
  },
  engineer_verified: {
    short: 'Ingenieur bestätigt',
    title: 'Von einem Ingenieur gegen die Quellnorm bestätigt.',
  },
  verified_against_standard: {
    short: 'Quelle bestätigt',
    title: 'Inhalt wurde gegen die Quellnorm verifiziert (Pile-Audit).',
  },
  needs_engineer_review: {
    short: 'Engineer-Review nötig',
    title: 'Quellebenenfrage offen — Ingenieur muss prüfen.',
  },
  inferred_from_worksheet: {
    short: 'Wizard-intern',
    title: 'Aus Wizard-Logik abgeleitet, nicht direkt in der Norm.',
  },
  disputed: {
    short: 'Strittig',
    title: 'Verifikation angefochten — Wert/Definition weicht mutmaßlich von der Norm ab.',
  },
  corrected: {
    short: 'Korrigiert',
    title: 'Nach Beanstandung gegen die Norm korrigiert und erneut verifiziert.',
  },
};

/** O-8 (UX follow-up 2026-10-14): the same labels for the EN locale. Keys mirror VERIFICATION_LABELS_DE. */
export const VERIFICATION_LABELS_EN: Record<string, { short: string; title: string }> = {
  imported_unverified: {
    short: 'Source unverified',
    title: 'Imported from the Pass3c workbook, not yet checked against the standard.',
  },
  engineer_verified: {
    short: 'Engineer confirmed',
    title: 'Confirmed against the source standard by an engineer.',
  },
  verified_against_standard: {
    short: 'Source verified',
    title: 'Content verified against the source standard (pile audit).',
  },
  needs_engineer_review: {
    short: 'Engineer review needed',
    title: 'Source-level question open — an engineer must check.',
  },
  inferred_from_worksheet: {
    short: 'Wizard-internal',
    title: 'Derived from wizard logic, not stated in the standard itself.',
  },
  disputed: {
    short: 'Disputed',
    title: 'Verification challenged — the value/definition presumably deviates from the standard.',
  },
  corrected: {
    short: 'Corrected',
    title: 'Corrected against the standard after a challenge and verified again.',
  },
};

function verificationLabels(locale: 'de' | 'en'): Record<string, { short: string; title: string }> {
  return locale === 'en' ? VERIFICATION_LABELS_EN : VERIFICATION_LABELS_DE;
}

/** Reader-facing short label; `locale` defaults to German (server / PDF callers unchanged). */
export function verificationStatusLabel(status: string, locale: 'de' | 'en' = 'de'): string {
  return verificationLabels(locale)[status]?.short ?? status;
}

export function verificationStatusTitle(status: string, locale: 'de' | 'en' = 'de'): string {
  return verificationLabels(locale)[status]?.title ?? status;
}
