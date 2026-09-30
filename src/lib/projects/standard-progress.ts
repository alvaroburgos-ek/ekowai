/**
 * Per-standard progress summary — the "where am I, what is next, what blocks the
 * Konformitätserklärung" glue that the worksheet sidebar renders. Pure, DB-free.
 *
 * Status semantics mirror the state machine and decideConformity:
 *   - engineer_approved / final  → counts toward the declaration
 *   - deactivated                → "nicht zutreffend": excluded from the denominator
 *   - draft / submitted / null   → open
 */
import { APPROVED_STATUSES, NOT_APPLICABLE_STATUS } from '@/lib/pdf/load-conformity';

export type ProgressWorksheet = {
  code: string;
  titleDe: string;
  status: string | null;
  totalRequired: number;
  /** Required fields with an OWN saved value. Producers may fold inherited
   * satisfaction in here (`countRequiredFields` in `required-fields.ts` does)
   * or report it separately via `inheritedRequired`. */
  filledRequired: number;
  /** A4 (2026-09-30): required fields WITHOUT an own value for which a
   * conflict-free project-wide value resolves (the sheet offers it as
   * "aus <WS> … oder überschreiben"). They are satisfied — the same rule as
   * the approval gate (`missingRequiredFields`) — and never count as open. */
  inheritedRequired?: number;
};

/** Open required fields of one worksheet — own value or inherited value satisfies (A4). */
export function openRequiredCount(r: Pick<ProgressWorksheet, 'totalRequired' | 'filledRequired' | 'inheritedRequired'>): number {
  return Math.max(0, r.totalRequired - r.filledRequired - (r.inheritedRequired ?? 0));
}

export type NextStep = {
  code: string;
  titleDe: string;
  /** fill = required fields missing · submit = complete draft, submit it · in_review = awaiting approval */
  reason: 'fill' | 'submit' | 'in_review';
  missingRequired?: number;
};

export type StandardProgress = {
  total: number;
  applicable: number;
  approved: number;
  notApplicable: number;
  open: number;
  inReview: number;
  next: NextStep | null;
  /** Every applicable worksheet is approved/final (and there is at least one). */
  declarationReady: boolean;
};

export function summarizeStandardProgress(rows: ProgressWorksheet[]): StandardProgress {
  const applicableRows = rows.filter((r) => r.status !== NOT_APPLICABLE_STATUS);
  const approved = applicableRows.filter((r) => r.status && APPROVED_STATUSES.has(r.status)).length;
  const inReview = applicableRows.filter((r) => r.status === 'submitted_for_review').length;
  const notApplicable = rows.length - applicableRows.length;
  const open = applicableRows.length - approved;

  let next: NextStep | null = null;
  for (const r of applicableRows) {
    if (r.status && APPROVED_STATUSES.has(r.status)) continue;
    if (r.status === 'submitted_for_review') {
      next = { code: r.code, titleDe: r.titleDe, reason: 'in_review' };
    } else {
      const missing = openRequiredCount(r);
      next = missing > 0
        ? { code: r.code, titleDe: r.titleDe, reason: 'fill', missingRequired: missing }
        : { code: r.code, titleDe: r.titleDe, reason: 'submit' };
    }
    break;
  }

  return {
    total: rows.length,
    applicable: applicableRows.length,
    approved,
    notApplicable,
    open,
    inReview,
    next,
    declarationReady: applicableRows.length > 0 && open === 0,
  };
}
