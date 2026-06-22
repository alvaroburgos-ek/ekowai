/**
 * Canonical verification vocabulary — the single source of truth for the
 * `verification_status` column on all six content tables. The DB enforces the
 * same set via CHECK constraints (see 2026-06-22 verification-foundation migration).
 *
 * `audit_status` is a SEPARATE machine-check dimension and is intentionally not
 * modelled here.
 */
export const VERIFICATION_STATUSES = [
  'verified_against_standard',
  'verified_via_cross_reference',
  'needs_engineer_review',
  'imported_unverified',
  'derived_from_structural_mapping',
  'inferred_from_worksheet',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** States that count toward "verified" for the 100% badge. */
export const DONE_STATES: ReadonlySet<VerificationStatus> = new Set([
  'verified_against_standard',
  'verified_via_cross_reference',
]);

/** Status a freshly-imported, untouched row carries. */
export const DEFAULT_STATUS: VerificationStatus = 'imported_unverified';

/** Value written when an engineer confirms a row against the source norm. */
export const VERIFIED: VerificationStatus = 'verified_against_standard';

export function isDone(status: string): boolean {
  return DONE_STATES.has(status as VerificationStatus);
}
