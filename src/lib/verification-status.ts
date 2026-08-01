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
