/**
 * Attestation pattern matching for compliance conditions.
 *
 * The DSL parser returns `manual` for two distinct reasons:
 *   (a) the condition is a natural-language attestation placeholder
 *       ("engineer-verified", "verify Gl. X") — the engineer is meant to
 *       sign off manually; the gate is intentionally not machine-checked.
 *   (b) the condition is broken (paren-syntax IN list, malformed
 *       predicate, etc.) — a real bug; the engineer can't sign off
 *       because the condition makes no sense.
 *
 * Distinguishing the two matters for UX: an attestation row should read
 * "awaiting engineer sign-off" (action item, clear path forward), while
 * a broken condition should read "condition unparseable" (defect, needs
 * engineer to file a fix).
 *
 * This helper applies a conservative pattern match on the condition
 * string to identify the known attestation forms used by DWA-A-138-1.
 * Once Pile-11 SQL adds the `compliance_requirements.requires_attestation`
 * column and is applied to production, callers can prefer the DB value
 * over this pattern match.
 */
export function isAttestationCondition(condition: string): boolean {
  if (!condition) return false;
  const trimmed = condition.trim();
  if (/^engineer-verified$/i.test(trimmed)) return true;
  if (/^verify\s+Gl\.\s/i.test(trimmed)) return true;
  return false;
}
