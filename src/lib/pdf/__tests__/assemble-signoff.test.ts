/**
 * Worksheet sign-off in the standard report (owner ruling 2026-09-24):
 * a self-approval is shown as such, the sign-off is derived from ALL approval
 * events (not only the 25 printed in the audit excerpt).
 */
import { describe, it, expect } from 'vitest';
import { assembleStandardReport, type AssemblerInput, type AssemblerApprovalRow } from '../assemble-standard-report';

const approval = (
  worksheetCode: string, eventType: string, actorId: string, at: string,
): AssemblerApprovalRow => ({
  occurredAt: at, actorRole: 'engineer', eventType, fromStatus: 'x', toStatus: 'y',
  comment: 'ok', worksheetCode, actorName: actorId === 'u-alvaro' ? 'Alvaro Burgos' : 'Nacho',
  actorId,
});

const input = (approvals: AssemblerApprovalRow[]): AssemblerInput => ({
  project: { id: 'p', name: 'P', projectCode: null, clientName: null, location: null, siteProfile: {}, createdAt: '2026-01-01T00:00:00.000Z' },
  org: null,
  standard: { id: 's', code: 'DWA-A 138-1', titleDe: 'Versickerung', version: '2024-08' },
  templates: [
    { id: 't1', code: 'A138-01', titleDe: 'Eins', orderIndex: 1 },
    { id: 't2', code: 'A138-02', titleDe: 'Zwei', orderIndex: 2 },
  ],
  instances: [
    { id: 'i1', worksheetTemplateId: 't1', status: 'engineer_approved' },
    { id: 'i2', worksheetTemplateId: 't2', status: 'engineer_approved' },
  ],
  sections: [], fields: [], equations: [], compliance: [], parameters: [], documents: [],
  approvals,
  audits: [],
  now: new Date('2026-09-24T12:00:00.000Z'),
} as unknown as AssemblerInput);

describe('standard report sign-off', () => {
  it('marks a self-approval and a second-person approval correctly per worksheet', () => {
    const out = assembleStandardReport(input([
      approval('A138-01', 'submit', 'u-alvaro', '2026-09-24T08:00:00.000Z'),
      approval('A138-01', 'engineer_approve', 'u-alvaro', '2026-09-24T08:10:00.000Z'),
      approval('A138-02', 'submit', 'u-alvaro', '2026-09-24T09:00:00.000Z'),
      approval('A138-02', 'engineer_approve', 'u-nacho', '2026-09-24T09:10:00.000Z'),
    ]));
    const byCode = new Map(out.worksheets.map((w) => [w.code, w]));
    expect(byCode.get('A138-01')?.signoff).toMatchObject({ approvedBy: 'Alvaro Burgos', selfApproved: true });
    expect(byCode.get('A138-02')?.signoff).toMatchObject({ approvedBy: 'Nacho', selfApproved: false });

    const selfRow = out.audit.find((a) => a.worksheetCode === 'A138-01' && a.action === 'engineer_approve');
    expect(selfRow?.detail).toContain('Selbstprüfung (keine Zweitprüfung)');
    const otherRow = out.audit.find((a) => a.worksheetCode === 'A138-02' && a.action === 'engineer_approve');
    expect(otherRow?.detail).not.toContain('Selbstprüfung');
  });

  it('derives the sign-off from all events even when the excerpt is capped at 25', () => {
    const noise = Array.from({ length: 40 }, (_, k) =>
      approval('A138-02', k % 2 ? 'submit' : 'engineer_reject', 'u-nacho', `2026-09-24T1${Math.floor(k / 10)}:${String(k % 10).padStart(2, '0')}:00.000Z`));
    const out = assembleStandardReport(input([
      approval('A138-01', 'submit', 'u-alvaro', '2026-09-24T07:00:00.000Z'),
      approval('A138-01', 'engineer_approve', 'u-alvaro', '2026-09-24T07:05:00.000Z'),
      ...noise,
    ]));
    expect(out.worksheets.find((w) => w.code === 'A138-01')?.signoff?.selfApproved).toBe(true);
    expect(out.audit.filter((a) => a.worksheetCode).length).toBe(25);
  });
});
