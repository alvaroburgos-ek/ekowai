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
  filledRequired: number;
};

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
      const missing = Math.max(0, r.totalRequired - r.filledRequired);
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
