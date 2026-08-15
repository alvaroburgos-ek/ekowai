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
