import { describe, it, expect } from 'vitest';
import {
  TRANSITIONS,
  nextStatus,
  userActionsFor,
  type WorksheetStatus,
} from '../state-machine';

describe('state-machine — TRANSITIONS map', () => {
  it('draft can be submitted to submitted_for_review', () => {
    expect(TRANSITIONS.draft.submit).toBe('submitted_for_review');
  });

  it('submitted_for_review can be approved or rejected', () => {
    expect(TRANSITIONS.submitted_for_review.engineer_approve).toBe('engineer_approved');
    expect(TRANSITIONS.submitted_for_review.engineer_reject).toBe('draft');
  });

  it('engineer_approved can be finalized or reopened', () => {
    expect(TRANSITIONS.engineer_approved.finalize).toBe('final');
    expect(TRANSITIONS.engineer_approved.reopen).toBe('draft');
  });

  it('final can only be reopened or deactivated', () => {
    expect(TRANSITIONS.final.reopen).toBe('draft');
    expect(TRANSITIONS.final.deactivate).toBe('deactivated');
    expect(TRANSITIONS.final.finalize).toBeUndefined();
    expect(TRANSITIONS.final.submit).toBeUndefined();
  });

  it('deactivated can only reactivate to draft (no user actions)', () => {
    expect(TRANSITIONS.deactivated.reactivate).toBe('draft');
    expect(TRANSITIONS.deactivated.submit).toBeUndefined();
    expect(TRANSITIONS.deactivated.engineer_approve).toBeUndefined();
  });

  it('every status has at least one valid transition', () => {
    for (const status of Object.keys(TRANSITIONS) as WorksheetStatus[]) {
      const events = Object.keys(TRANSITIONS[status]);
      expect(events.length).toBeGreaterThan(0);
    }
  });

  it('no status can submit when not in draft', () => {
    for (const status of ['submitted_for_review', 'engineer_approved', 'final', 'deactivated'] as WorksheetStatus[]) {
      expect(TRANSITIONS[status].submit).toBeUndefined();
    }
  });
});

describe('state-machine — nextStatus()', () => {
  it('returns next status for legal transition', () => {
    expect(nextStatus('draft', 'submit')).toBe('submitted_for_review');
    expect(nextStatus('engineer_approved', 'finalize')).toBe('final');
  });

  it('returns null for illegal transition', () => {
    expect(nextStatus('draft', 'finalize')).toBeNull();
    expect(nextStatus('final', 'submit')).toBeNull();
    expect(nextStatus('deactivated', 'engineer_approve')).toBeNull();
  });

  it('returns null for impossible status combos', () => {
    expect(nextStatus('final', 'engineer_reject')).toBeNull();
    expect(nextStatus('submitted_for_review', 'finalize')).toBeNull();
  });
});

describe('state-machine — userActionsFor()', () => {
  it('draft shows submit only', () => {
    const actions = userActionsFor('draft');
    expect(actions).toHaveLength(1);
    expect(actions[0].event).toBe('submit');
    expect(actions[0].destructive).toBeUndefined();
  });

  it('submitted_for_review shows approve + reject (reject destructive)', () => {
    const actions = userActionsFor('submitted_for_review');
    expect(actions.map((a) => a.event).sort()).toEqual(
      ['engineer_approve', 'engineer_reject'].sort(),
    );
    const reject = actions.find((a) => a.event === 'engineer_reject');
    expect(reject?.destructive).toBe(true);
  });

  it('engineer_approved shows finalize + reopen (reopen destructive)', () => {
    const actions = userActionsFor('engineer_approved');
    expect(actions).toHaveLength(2);
    const reopen = actions.find((a) => a.event === 'reopen');
    expect(reopen?.destructive).toBe(true);
  });

  it('final shows only reopen (destructive)', () => {
    const actions = userActionsFor('final');
    expect(actions).toHaveLength(1);
    expect(actions[0].event).toBe('reopen');
    expect(actions[0].destructive).toBe(true);
  });

  it('deactivated shows no user actions (re-activation is system-level)', () => {
    const actions = userActionsFor('deactivated');
    expect(actions).toEqual([]);
  });

  it('every returned action has German + English labels', () => {
    for (const status of ['draft', 'submitted_for_review', 'engineer_approved', 'final'] as WorksheetStatus[]) {
      for (const action of userActionsFor(status)) {
        expect(action.labelDe).toBeTruthy();
        expect(action.labelEn).toBeTruthy();
      }
    }
  });

  it('excludes system-only events (deactivate/reactivate)', () => {
    for (const status of ['draft', 'submitted_for_review', 'engineer_approved', 'final', 'deactivated'] as WorksheetStatus[]) {
      const events = userActionsFor(status).map((a) => a.event);
      expect(events).not.toContain('deactivate');
      expect(events).not.toContain('reactivate');
    }
  });
});
