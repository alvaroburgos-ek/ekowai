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
  formatPendingBlockCondition,
  buildFallbackValues,
  buildStandardScopedFallback,
  makeGateLookup,
  type ApprovalGateResult,
} from '../approval-gate';

describe('formatApprovalGateError', () => {
  it('flags both block-condition failures and missing required fields', () => {
    const r: ApprovalGateResult = {
      ok: false,
      pendingBlockConditions: [],
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
      pendingBlockConditions: [],
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
      pendingBlockConditions: [],
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
      pendingBlockConditions: [],
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

describe('pending block gates block the approval and say how to pass (owner ruling 2026-10-05, GAR D4)', () => {
  const pending = {
    code: 'REQ-24',
    titleDe: 'Schutzlage unten nach Tab. 26',
    condition: 'sl_baugrund_groesstkorn_mm <= 2 OR sl_schutzlage_unten_dicke_cm >= sl_schutzlage_unten_sand_min_cm',
    hint: 'Tab. 26: Schutzlage unten nach dem Größtkorn des Baugrunds.\n[EN] Tab. 26: lower protective layer by the largest grain of the subsoil.',
    missingInputs: [
      { symbol: 'sl_baugrund_groesstkorn_mm', labelDe: 'Größtkorn d des Baugrundes', originCode: null, derived: false },
      { symbol: 'sl_schutzlage_unten_sand_min_cm', labelDe: 'Mindestdicke Sand nach Tab. 26', originCode: null, derived: true },
      { symbol: 'abdichtungs_art', labelDe: 'Abdichtungsart', originCode: 'FLL-GAR-09', derived: false },
    ],
  };
  it('one line names every input with its label, origin sheet and typed/computed nature, the condition and the hint', () => {
    const line = formatPendingBlockCondition(pending);
    expect(line).toMatch(/^REQ-24 \(Schutzlage unten nach Tab\. 26\) — fehlende Eingaben: /);
    expect(line).toMatch(/Größtkorn d des Baugrundes \(sl_baugrund_groesstkorn_mm\)/);
    expect(line).toMatch(/Mindestdicke Sand nach Tab\. 26 \(sl_schutzlage_unten_sand_min_cm — berechneter Wert: die Eingaben seiner Gleichung ausfüllen\)/);
    expect(line).toMatch(/Abdichtungsart \(abdichtungs_art — aus FLL-GAR-09\)/);
    expect(line).toMatch(/Bedingung: sl_baugrund_groesstkorn_mm <= 2 OR/);
    expect(line).toMatch(/Hinweis: Tab\. 26: Schutzlage unten nach dem Größtkorn des Baugrunds\. \[EN\] Tab\. 26: lower protective layer/);
  });
  it('the refusal carries the pending block gates as their own part', () => {
    const r: ApprovalGateResult = { ok: false, failingBlockConditions: [], pendingBlockConditions: [pending], missingRequiredFields: [] };
    const msg = formatApprovalGateError(r);
    expect(msg).toMatch(/Genehmigung abgelehnt/);
    expect(msg).toMatch(/Blockierende Prüfungen ohne Eingabe — erst eingeben, dann erneut einreichen: REQ-24/);
    expect(msg).not.toMatch(/Blockierende Compliance-Verstöße/);
    expect(msg).not.toMatch(/Pflichteingaben fehlen/);
  });
  it('a gate without a hint prints no Hinweis part', () => {
    expect(formatPendingBlockCondition({ ...pending, hint: null })).not.toMatch(/Hinweis/);
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

describe('buildStandardScopedFallback (DWA-M 820-3 structure block: a symbol of the own standard resolves from that standard only)', () => {
  // own standard = DWA-M 820-3 (templates t3a / t3b); foreign = DWA-M 820-1 (t1) and DWA-A 138 (t138)
  const own = new Set(['t3a', 't3b']);
  const ownSymbols = new Set(['project_type', 'pz_66_1_status']);
  it('the own value wins over a same-named field of another standard with other tokens (before: conflict → dropped → pending for good)', () => {
    const entries = [
      { symbol: 'project_type', value: 'einzelprojekt', templateId: 't3a' },
      { symbol: 'project_type', value: 'projekt', templateId: 't1' },
      { symbol: 'project_type', value: 'neuerschliessung', templateId: 't138' },
    ];
    expect(buildFallbackValues(entries).has('project_type')).toBe(false); // the old map: conflict
    expect(buildStandardScopedFallback(entries, own, ownSymbols).get('project_type')).toBe('einzelprojekt');
  });
  it('own field still blank: absent (→ pending) — a foreign value never decides (before: the 820-1 token was read)', () => {
    const entries = [{ symbol: 'project_type', value: 'projekt', templateId: 't1' }];
    expect(buildFallbackValues(entries).get('project_type')).toBe('projekt');
    expect(buildStandardScopedFallback(entries, own, ownSymbols).has('project_type')).toBe(false);
  });
  it('a symbol the own standard does not define resolves project-wide exactly as before (conflict-free)', () => {
    const entries = [
      { symbol: 'quality_category', value: 'C2', templateId: 't1' },
      { symbol: 'quality_category', value: 'C2', templateId: 't138' },
      { symbol: 'k_f', value: 1, templateId: 't1' },
      { symbol: 'k_f', value: 2, templateId: 't138' },
    ];
    const m = buildStandardScopedFallback(entries, own, ownSymbols);
    expect(m.get('quality_category')).toBe('C2');
    expect(m.has('k_f')).toBe(false);
  });
  it('conflicting values INSIDE the own standard stay omitted (never a wrong gate)', () => {
    const entries = [
      { symbol: 'project_type', value: 'einzelprojekt', templateId: 't3a' },
      { symbol: 'project_type', value: 'both', templateId: 't3b' },
    ];
    expect(buildStandardScopedFallback(entries, own, ownSymbols).has('project_type')).toBe(false);
  });
});
