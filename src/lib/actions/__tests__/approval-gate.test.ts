/**
 * Approval-gate unit tests.
 *
 * Covers the *pure* parts of the gate that don't require a DB hit:
 *   - formatApprovalGateError prose for each branch
 *   - the typing on ApprovalGateResult (no missing fields)
 *
 * The DB-bound part (`checkApprovalGate`) is exercised by an integration
 * test against a real fixture worksheet — that test lives in
 * tests/integration/approval-gate.test.ts where the env stub is set up.
 * Here we keep the unit surface narrow: prose only.
 */
import { describe, it, expect } from 'vitest';
import { formatApprovalGateError, type ApprovalGateResult } from '../approval-gate';

describe('formatApprovalGateError', () => {
  it('flags both block-condition failures and missing required fields', () => {
    const r: ApprovalGateResult = {
      ok: false,
      failingBlockConditions: [
        { code: 'A138-REQ-COV-01', titleDe: 'Zone I unzulässig', condition: 'water_protection_zone != zone_I' },
      ],
      missingRequiredFields: [
        { symbol: 'project_type', labelDe: 'Projekttyp' },
      ],
    };
    const msg = formatApprovalGateError(r);
    expect(msg).toMatch(/Genehmigung abgelehnt/);
    expect(msg).toMatch(/A138-REQ-COV-01/);
    expect(msg).toMatch(/Zone I unzulässig/);
    expect(msg).toMatch(/Projekttyp/);
    expect(msg).toMatch(/project_type/);
  });

  it('handles compliance-only failure (no missing required)', () => {
    const r: ApprovalGateResult = {
      ok: false,
      failingBlockConditions: [
        { code: 'A138-REQ-COV-02', titleDe: 'Brunnen-Verbot', condition: 'direct_gw_injection == false' },
      ],
      missingRequiredFields: [],
    };
    const msg = formatApprovalGateError(r);
    expect(msg).toMatch(/Blockierende Compliance-Verstöße/);
    expect(msg).not.toMatch(/Pflichteingaben fehlen/);
  });

  it('handles missing-required-only failure (no failing block)', () => {
    const r: ApprovalGateResult = {
      ok: false,
      failingBlockConditions: [],
      missingRequiredFields: [
        { symbol: 'belastungskategorie', labelDe: 'Belastungskategorie (BK)' },
      ],
    };
    const msg = formatApprovalGateError(r);
    expect(msg).toMatch(/Pflichteingaben fehlen/);
    expect(msg).not.toMatch(/Blockierende Compliance-Verstöße/);
  });

  it('multiple failures of each kind are all listed', () => {
    const r: ApprovalGateResult = {
      ok: false,
      failingBlockConditions: [
        { code: 'A138-REQ-01', titleDe: 'Scope', condition: 'a138_applicable == TRUE' },
        { code: 'A138-REQ-04', titleDe: 'GW clearance', condition: 'gw_clearance >= 1.0' },
      ],
      missingRequiredFields: [
        { symbol: 'project_type', labelDe: 'Projekttyp' },
        { symbol: 'water_protection_zone', labelDe: 'Wasserschutzzone' },
      ],
    };
    const msg = formatApprovalGateError(r);
    for (const c of ['A138-REQ-01', 'A138-REQ-04', 'project_type', 'water_protection_zone']) {
      expect(msg).toContain(c);
    }
  });
});
