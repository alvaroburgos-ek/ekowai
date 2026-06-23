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
import {
  formatApprovalGateError,
  buildFallbackValues,
  makeGateLookup,
  type ApprovalGateResult,
} from '../approval-gate';

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

describe('buildFallbackValues (project-wide, conflict-safe)', () => {
  it('keeps a single value', () => {
    const m = buildFallbackValues([{ symbol: 'quality_category', value: 'C2' }]);
    expect(m.get('quality_category')).toBe('C2');
  });
  it('keeps agreeing duplicates across worksheets', () => {
    const m = buildFallbackValues([
      { symbol: 'quality_category', value: 'C2' },
      { symbol: 'quality_category', value: 'C2' },
    ]);
    expect(m.get('quality_category')).toBe('C2');
  });
  it('drops conflicting values (ambiguous → omitted, never a wrong gate)', () => {
    const m = buildFallbackValues([
      { symbol: 'quality_category', value: 'C2' },
      { symbol: 'quality_category', value: 'C1' },
    ]);
    expect(m.has('quality_category')).toBe(false);
  });
  it('treats numeric/string-equal as agreeing', () => {
    const m = buildFallbackValues([
      { symbol: 'x', value: 4 },
      { symbol: 'x', value: 4 },
    ]);
    expect(m.get('x')).toBe(4);
  });
});

describe('makeGateLookup (local-first, project-wide fallback)', () => {
  const localSymbols = new Set(['turbidity_NTU']);            // a field on this worksheet
  const localValues = new Map<string, number | string | boolean | null>([['turbidity_NTU', 1.5]]);
  const fallback = new Map<string, number | string | boolean | null>([['quality_category', 'C2']]);
  const lookup = makeGateLookup(localSymbols, localValues, fallback);

  it('returns the local value for a local field', () => {
    expect(lookup('turbidity_NTU')).toBe(1.5);
  });
  it('falls back to the project-wide value for a non-local symbol', () => {
    expect(lookup('quality_category')).toBe('C2');
  });
  it('a local field left blank stays undefined (pending) — does NOT fall back', () => {
    const lk = makeGateLookup(new Set(['turbidity_NTU']), new Map(), new Map([['turbidity_NTU', 9]]));
    expect(lk('turbidity_NTU')).toBeUndefined();
  });
  it('an unknown symbol is undefined', () => {
    expect(lookup('nonexistent')).toBeUndefined();
  });
});
