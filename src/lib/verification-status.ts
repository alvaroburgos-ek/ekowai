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

export function verificationStatusLabel(status: string): string {
  return VERIFICATION_LABELS_DE[status]?.short ?? status;
}

export function verificationStatusTitle(status: string): string {
  return VERIFICATION_LABELS_DE[status]?.title ?? status;
}
