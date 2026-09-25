/**
 * Worksheet sign-off, derived from the immutable approval_events rows.
 *
 * Owner ruling 2026-09-24: in a one-person office the signing engineer may
 * approve their own submission. Such an approval is a SELF-APPROVAL and must
 * be recorded as one: the approver is named and the record states that no
 * second reviewer took part. Because approval_events already hold the actor
 * of every submit and every approve, the fact is derived here rather than
 * stored separately; it therefore also covers approvals made before this rule.
 *
 * Dependency-free so the PDF assembler (pure) and the loaders can share it.
 */

export type SignoffEvent = {
  worksheetKey: string;
  eventType: string;
  actorId: string | null;
  actorName: string | null;
  occurredAt: string | Date;
};

export type WorksheetSignoff = {
  approvedBy: string | null;
  approvedAt: string;
  submittedBy: string | null;
  /** Approver is the same person who made the submission being approved. */
  selfApproved: boolean;
};

export const SELF_APPROVAL_NOTE_DE = 'Selbstprüfung (keine Zweitprüfung)';

const iso = (d: string | Date) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());

/** True when the approving actor also made the submission it approves. An
 * approval with no preceding submit, or with an unknown actor, is never
 * called a self-approval: we only state what the record shows. */
export function isSelfApproval(submitActorId: string | null | undefined, approveActorId: string | null | undefined): boolean {
  return !!submitActorId && !!approveActorId && submitActorId === approveActorId;
}

/**
 * Latest approval per worksheet with its self-approval flag. The submit an
 * approval answers is the most recent submit before it on the same worksheet.
 * Worksheets without an approval are absent from the map.
 */
export function deriveSignoffs(events: SignoffEvent[]): Map<string, WorksheetSignoff> {
  const sorted = [...events].sort((a, b) => iso(a.occurredAt).localeCompare(iso(b.occurredAt)));
  const lastSubmit = new Map<string, SignoffEvent>();
  const out = new Map<string, WorksheetSignoff>();
  for (const e of sorted) {
    if (e.eventType === 'submit') {
      lastSubmit.set(e.worksheetKey, e);
    } else if (e.eventType === 'engineer_approve') {
      const sub = lastSubmit.get(e.worksheetKey);
      out.set(e.worksheetKey, {
        approvedBy: e.actorName,
        approvedAt: iso(e.occurredAt),
        submittedBy: sub?.actorName ?? null,
        selfApproved: isSelfApproval(sub?.actorId, e.actorId),
      });
    } else if (e.eventType === 'reopen' || e.eventType === 'engineer_reject' || e.eventType === 'reactivate') {
      // The approval no longer stands once the sheet goes back to draft.
      out.delete(e.worksheetKey);
    }
  }
  return out;
}

/** One-line German sign-off for PDFs: "Genehmigt von X am 24.09.2026 · Selbstprüfung (keine Zweitprüfung)". */
export function formatSignoffDe(s: WorksheetSignoff): string {
  const date = new Date(s.approvedAt).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' });
  const base = `Genehmigt von ${s.approvedBy ?? 'unbekannt'} am ${date}`;
  return s.selfApproved ? `${base} · ${SELF_APPROVAL_NOTE_DE}` : `${base} · eingereicht von ${s.submittedBy ?? 'unbekannt'}`;
}
