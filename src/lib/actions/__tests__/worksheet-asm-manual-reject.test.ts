/**
 * Reproduction + regression test for the LIVE compliance-integrity bug:
 *
 *   A138-12 manual A_S,m=120 with genuinely-NULL provenance PERSISTED and flipped
 *   the Tab.6 loading check to "pass".
 *
 * ROOT CAUSE (worksheet.ts): the V-2 manual-provenance strip resolves the
 * a_s_m_determination_method / a_s_m_provenance field ids from `symbolById`, which
 * is built from `fieldMetas` — and `fieldMetas` is restricted to the fields IN THE
 * SAVE BATCH (`inArray(fields.id, fieldIds)`). On an A_S_m-ONLY save the method and
 * provenance fields are ABSENT from the batch, so `symbolById` lacks them, both
 * field ids resolve to null, `batchMethod` falls through to null, and the guard
 * `if (batchMethod === 'manual')` is FALSE → the strip never runs → the entered
 * A_S_m persists (as `derived`, because 'A_S_m' ∈ derivedSymbols).
 *
 * These tests are DB-free. They reproduce the exact field-resolution data flow at
 * the strip point using the two resolution strategies (batch-restricted = buggy,
 * full-sibling-map = fixed) and assert the reject decision via the pure helper
 * `resolveManualAsmReject`, which is the single source of truth the fixed server
 * uses.
 */

// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { resolveManualAsmReject } from '@/lib/eval/asm-source';
import { materializeLoadingCheck } from '@/lib/eval/materialize-tab6-loading';

// ---------------------------------------------------------------------------
// Faithful model of the server's field-id resolution at the V-2 strip point.
// ---------------------------------------------------------------------------

type FieldValue =
  | { type: 'number'; value: number | null }
  | { type: 'text'; value: string | null }
  | { type: 'enum'; value: string | null };

/** Persisted project_parameters row shape (only the columns the strip reads). */
type Persisted = { valueEnum: string | null; valueText: string | null; valueNumber: string | null };

// The live PLT-HS-01 scenario, by field id.
const ASM_FID = 'fid-A_S_m';
const METHOD_FID = 'fid-method';
const PROV_FID = 'fid-provenance';

/** Full A138-12 sibling map: symbol → field id (what the FIXED server resolves against). */
const FULL_SYMBOL_TO_FID = new Map<string, string>([
  ['A_S_m', ASM_FID],
  ['a_s_m_determination_method', METHOD_FID],
  ['a_s_m_provenance', PROV_FID],
]);

/**
 * Resolve the EFFECTIVE method + provenance the way the strip must: batch value if
 * the field is in the batch, else the persisted DB value. `symbolToFid` is the map
 * the strip uses to find the field ids — this is where the bug lives (batch-restricted
 * map lacks method/provenance ids).
 */
function resolveEffective(
  symbolToFid: Map<string, string>,
  batch: Record<string, FieldValue>,
  persisted: Record<string, Persisted>,
): { method: string | null; provenance: string | null } {
  const methodFid = symbolToFid.get('a_s_m_determination_method') ?? null;
  const provFid = symbolToFid.get('a_s_m_provenance') ?? null;

  let method: string | null = null;
  if (methodFid) {
    const b = batch[methodFid];
    if (b?.type === 'enum' && typeof b.value === 'string') method = b.value;
    else method = persisted[methodFid]?.valueEnum ?? null;
  }

  let provenance: string | null = null;
  if (provFid) {
    const b = batch[provFid];
    if (b?.type === 'text' && typeof b.value === 'string') provenance = b.value;
    else provenance = persisted[provFid]?.valueText ?? null;
  }
  return { method, provenance };
}

// ---------------------------------------------------------------------------
// The exact live failing scenario.
// ---------------------------------------------------------------------------
describe('A138-12 manual A_S,m provenance-required — live PLT-HS-01 reproduction', () => {
  // Persisted state at the moment of the A_S_m=120 save (from the prod audit):
  //   method='manual', provenance=NULL, A_S_m previously 12.
  const persisted: Record<string, Persisted> = {
    [METHOD_FID]: { valueEnum: 'manual', valueText: null, valueNumber: null },
    [PROV_FID]: { valueEnum: null, valueText: null, valueNumber: null },
    [ASM_FID]: { valueEnum: null, valueText: null, valueNumber: '12' },
  };
  // The save batch: ONLY A_S_m is dirty (the store sends only pending field ids).
  const batch: Record<string, FieldValue> = {
    [ASM_FID]: { type: 'number', value: 120 },
  };

  it('BUG: batch-restricted symbol map fails to resolve method → strip no-ops → A_S_m NOT rejected', () => {
    // The OLD server builds symbolById from fieldMetas, restricted to the batch's
    // field ids. On an A_S_m-only save that is just { A_S_m }.
    const batchRestricted = new Map<string, string>([['A_S_m', ASM_FID]]);
    const { method, provenance } = resolveEffective(batchRestricted, batch, persisted);

    // method resolves to null (field not in the restricted map) → the guard is false.
    expect(method).toBeNull();
    const { reject } = resolveManualAsmReject(method, provenance);
    // The strip does NOT reject — this is the bug: A_S_m=120 would persist.
    expect(reject).toBe(false);
  });

  it('FIX: full sibling map resolves persisted method=manual + null provenance → REJECT', () => {
    const { method, provenance } = resolveEffective(FULL_SYMBOL_TO_FID, batch, persisted);
    expect(method).toBe('manual');
    expect(provenance).toBeNull();
    const { reject } = resolveManualAsmReject(method, provenance);
    expect(reject).toBe(true);
  });

  it('FIX: after reject, the Tab.6 check computes against the PERSISTED A_S_m (not the rejected 120)', () => {
    // A_C from A138-07 = 4836 (so 4836/120 = 40.30 would be a false "pass").
    const A_C = 4836;
    // Rejected: the loading block must read the persisted A_S_m (12), NOT batch 120.
    const persistedAsm = persisted[ASM_FID].valueNumber != null ? Number(persisted[ASM_FID].valueNumber) : null;
    const lc = materializeLoadingCheck({
      A_C,
      A_S_m: persistedAsm, // 12
      flaechengruppe: 'V2',
      bbz_thickness: 0.3,
    });
    // 4836/12 = 403 ≫ 50 → must stay 'fail', never mint a 'pass' from the rejected value.
    expect(lc.ac_as_ratio_check).not.toBe('pass');

    // Sanity: had the rejected 120 leaked into the check, it WOULD have been a pass.
    const leaked = materializeLoadingCheck({ A_C, A_S_m: 120, flaechengruppe: 'V2', bbz_thickness: 0.3 });
    expect(leaked.ac_as_ratio_check).toBe('pass');
  });
});

// ---------------------------------------------------------------------------
// resolveManualAsmReject — the pure gate, full truth table.
// ---------------------------------------------------------------------------
describe('resolveManualAsmReject (pure V-2 gate)', () => {
  it('manual + null provenance → reject', () => {
    expect(resolveManualAsmReject('manual', null).reject).toBe(true);
  });
  it('manual + empty provenance → reject', () => {
    expect(resolveManualAsmReject('manual', '').reject).toBe(true);
  });
  it('manual + whitespace provenance → reject', () => {
    expect(resolveManualAsmReject('manual', '   ').reject).toBe(true);
  });
  it('manual + real provenance → do NOT reject', () => {
    expect(resolveManualAsmReject('manual', 'Datenblatt Hersteller XY, S.4').reject).toBe(false);
  });
  it('direct + null provenance → do NOT reject (formula-produced)', () => {
    expect(resolveManualAsmReject('direct', null).reject).toBe(false);
  });
  it('geometry + null provenance → do NOT reject', () => {
    expect(resolveManualAsmReject('geometry', null).reject).toBe(false);
  });
  it('soil_estimate + null provenance → do NOT reject', () => {
    expect(resolveManualAsmReject('soil_estimate', null).reject).toBe(false);
  });
  it('null method (unresolved) + null provenance → do NOT reject', () => {
    expect(resolveManualAsmReject(null, null).reject).toBe(false);
  });
});
