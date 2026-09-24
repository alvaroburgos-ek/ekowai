import { describe, it, expect } from 'vitest';
import { deriveSignoffs, formatSignoffDe, isSelfApproval, type SignoffEvent } from '../signoff';

const ev = (worksheetKey: string, eventType: string, actorId: string, at: string, actorName = actorId.toUpperCase()): SignoffEvent =>
  ({ worksheetKey, eventType, actorId, actorName, occurredAt: at });

describe('isSelfApproval', () => {
  it('only when both actors are known and equal', () => {
    expect(isSelfApproval('a', 'a')).toBe(true);
    expect(isSelfApproval('a', 'b')).toBe(false);
    expect(isSelfApproval(null, 'a')).toBe(false);
    expect(isSelfApproval('a', null)).toBe(false);
  });
});

describe('deriveSignoffs', () => {
  it('flags an approval by the submitter as self-approval', () => {
    const m = deriveSignoffs([
      ev('W1', 'submit', 'alvaro', '2026-09-24T10:00:00Z'),
      ev('W1', 'engineer_approve', 'alvaro', '2026-09-24T10:05:00Z'),
    ]);
    expect(m.get('W1')).toMatchObject({ approvedBy: 'ALVARO', submittedBy: 'ALVARO', selfApproved: true });
  });

  it('a second reviewer is not a self-approval', () => {
    const m = deriveSignoffs([
      ev('W1', 'submit', 'alvaro', '2026-09-24T10:00:00Z'),
      ev('W1', 'engineer_approve', 'nacho', '2026-09-24T10:05:00Z'),
    ]);
    expect(m.get('W1')?.selfApproved).toBe(false);
  });

  it('pairs the approval with the most recent submit, regardless of input order', () => {
    const m = deriveSignoffs([
      ev('W1', 'engineer_approve', 'alvaro', '2026-09-24T12:00:00Z'),
      ev('W1', 'submit', 'nacho', '2026-09-24T09:00:00Z'),
      ev('W1', 'engineer_reject', 'alvaro', '2026-09-24T09:30:00Z'),
      ev('W1', 'submit', 'alvaro', '2026-09-24T11:00:00Z'),
    ]);
    expect(m.get('W1')).toMatchObject({ selfApproved: true, submittedBy: 'ALVARO' });
  });

  it('a reopen withdraws the sign-off; worksheets are independent', () => {
    const m = deriveSignoffs([
      ev('W1', 'submit', 'a', '2026-09-24T10:00:00Z'),
      ev('W1', 'engineer_approve', 'a', '2026-09-24T10:01:00Z'),
      ev('W1', 'reopen', 'a', '2026-09-24T10:02:00Z'),
      ev('W2', 'submit', 'a', '2026-09-24T10:00:00Z'),
      ev('W2', 'engineer_approve', 'b', '2026-09-24T10:03:00Z'),
    ]);
    expect(m.has('W1')).toBe(false);
    expect(m.get('W2')?.selfApproved).toBe(false);
  });

  it('keeps the sign-off through finalize', () => {
    const m = deriveSignoffs([
      ev('W1', 'submit', 'a', '2026-09-24T10:00:00Z'),
      ev('W1', 'engineer_approve', 'a', '2026-09-24T10:01:00Z'),
      ev('W1', 'finalize', 'a', '2026-09-24T10:02:00Z'),
    ]);
    expect(m.get('W1')?.selfApproved).toBe(true);
  });
});

describe('formatSignoffDe', () => {
  it('names the approver and states the missing second review', () => {
    expect(formatSignoffDe({ approvedBy: 'Alvaro Burgos', approvedAt: '2026-09-24T10:00:00Z', submittedBy: 'Alvaro Burgos', selfApproved: true }))
      .toBe('Genehmigt von Alvaro Burgos am 24.9.2026 · Selbstprüfung (keine Zweitprüfung)');
  });
  it('names the submitter when a second person approved', () => {
    expect(formatSignoffDe({ approvedBy: 'B', approvedAt: '2026-09-24T10:00:00Z', submittedBy: 'A', selfApproved: false }))
      .toBe('Genehmigt von B am 24.9.2026 · eingereicht von A');
  });
});
