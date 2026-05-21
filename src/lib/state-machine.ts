/** Worksheet instance state machine for Plan 4.
 * Source of truth — the server action transitionWorksheet uses this for guard
 * checks, and the UI uses it to decide which buttons to show. */

export type WorksheetStatus =
  | 'draft'
  | 'submitted_for_review'
  | 'engineer_approved'
  | 'final'
  | 'deactivated';

export type TransitionEvent =
  | 'submit'
  | 'engineer_approve'
  | 'engineer_reject'
  | 'finalize'
  | 'reopen'
  | 'deactivate'
  | 'reactivate';

/** Map from current status → allowed event → resulting status. */
export const TRANSITIONS: Record<
  WorksheetStatus,
  Partial<Record<TransitionEvent, WorksheetStatus>>
> = {
  draft: {
    submit: 'submitted_for_review',
    deactivate: 'deactivated',
  },
  submitted_for_review: {
    engineer_approve: 'engineer_approved',
    engineer_reject: 'draft',
    deactivate: 'deactivated',
  },
  engineer_approved: {
    finalize: 'final',
    reopen: 'draft',
    deactivate: 'deactivated',
  },
  final: {
    reopen: 'draft',
    deactivate: 'deactivated',
  },
  deactivated: {
    reactivate: 'draft',
  },
};

export function nextStatus(
  current: WorksheetStatus,
  event: TransitionEvent,
): WorksheetStatus | null {
  return TRANSITIONS[current]?.[event] ?? null;
}

/** What event labels does the engineer see for a given status?
 * Excludes system-only events (deactivate/reactivate). */
export function userActionsFor(status: WorksheetStatus): Array<{
  event: Exclude<TransitionEvent, 'deactivate' | 'reactivate'>;
  labelDe: string;
  labelEn: string;
  destructive?: boolean;
}> {
  switch (status) {
    case 'draft':
      return [{ event: 'submit', labelDe: 'Zur Prüfung einreichen', labelEn: 'Submit for review' }];
    case 'submitted_for_review':
      return [
        { event: 'engineer_approve', labelDe: 'Genehmigen', labelEn: 'Approve' },
        { event: 'engineer_reject', labelDe: 'Zurückgeben', labelEn: 'Reject', destructive: true },
      ];
    case 'engineer_approved':
      return [
        { event: 'finalize', labelDe: 'Finalisieren', labelEn: 'Finalize' },
        { event: 'reopen', labelDe: 'Wieder öffnen', labelEn: 'Reopen', destructive: true },
      ];
    case 'final':
      return [{ event: 'reopen', labelDe: 'Wieder öffnen', labelEn: 'Reopen', destructive: true }];
    case 'deactivated':
      return [];
  }
}
