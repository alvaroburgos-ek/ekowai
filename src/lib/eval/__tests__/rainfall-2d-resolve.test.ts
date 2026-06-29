import { describe, it, expect } from 'vitest';
import { normalizeRainfallCarrier, resolveColumn, facilityReturnPeriod, FACILITY_FREQUENCY_SYMBOL } from '../rainfall-tables';

const grid = normalizeRainfallCarrier({ tables: [{ id: 'g', name: 'G', source: 'KOSTRA-DWD-2020', columns: [5, 30], rows: [
  { D_min: 15, r: { '5': 195, '30': 260 } }, { D_min: 30, r: { '5': 130, '30': 180 } } ] }] }).tables[0];

const legacy = normalizeRainfallCarrier({ rows: [{ D_min: 30, r_D_n: 130 }, { D_min: 60, r_D_n: 80 }] }).tables[0];

describe('resolveColumn (tagged, corrected contract)', () => {
  // ── native 2D grid ───────────────────────────────────────────────────────
  it('native grid: exact T_n column present → {status:"ok", rows}', () => {
    const res5 = resolveColumn(grid, 5);
    expect(res5.status).toBe('ok');
    expect(res5.rows.map(r => [r.D_min, r.r_D_n])).toEqual([[15, 195], [30, 130]]);

    const res30 = resolveColumn(grid, 30);
    expect(res30.status).toBe('ok');
    expect(res30.rows.map(r => r.r_D_n)).toEqual([260, 180]);
  });

  it('native grid: absent column → {status:"missing", rows:[]}', () => {
    const res = resolveColumn(grid, 100);
    expect(res.status).toBe('missing');
    expect(res.rows).toEqual([]);
  });

  it('native grid: T_n=null → {status:"missing", rows:[]}', () => {
    const res = resolveColumn(grid, null);
    expect(res.status).toBe('missing');
    expect(res.rows).toEqual([]);
  });

  // ── legacy / design-column table ─────────────────────────────────────────
  // CORRECT CONTRACT: legacy serves ANY T_n — including ones different from
  // the design T_n and including T_n=null. NEVER returns missing.

  it('legacy table + matching T_n → {status:"legacy", rows}', () => {
    const res = resolveColumn(legacy, 5);
    expect(res.status).toBe('legacy');
    expect(res.rows[0].r_D_n).toBe(130);
    expect(res.rows[1].r_D_n).toBe(80);
  });

  it('legacy table + DIFFERENT T_n → still {status:"legacy", rows} (never withheld)', () => {
    // Under the WRONG contract this returned missing; corrected contract must
    // serve the legacy curve for any T_n so existing projects keep computing.
    const res = resolveColumn(legacy, 10);
    expect(res.status).toBe('legacy');
    expect(res.rows[0].r_D_n).toBe(130);
    expect(res.rows[1].r_D_n).toBe(80);
  });

  it('legacy table + T_n=null → still {status:"legacy", rows} (never withheld)', () => {
    // facilityReturnPeriod returns null when n is not available; legacy must
    // still compute (existing projects must not be broken by a null T_n).
    const res = resolveColumn(legacy, null);
    expect(res.status).toBe('legacy');
    expect(res.rows.length).toBe(2);
    expect(res.rows[0].r_D_n).toBe(130);
  });
});

// =============================================================================
// facilityReturnPeriod — single-source precedence (n before T_n)
// =============================================================================

describe('facilityReturnPeriod — single-source precedence', () => {
  const pick = (fields: Record<string, number | null>) =>
    (sym: string): number | null => fields[sym] ?? null;

  it('basin (A138-13) via project n=0.2 → returns 5', () => {
    // No local n_* symbol for A138-13; falls through to project n.
    expect(facilityReturnPeriod('A138-13', pick({ n: 0.2 }))).toBe(5);
  });

  it('Becken (A138-22) via local n_B_Bemessung=0.1 → returns 10 (step 1, ignores project n)', () => {
    expect(facilityReturnPeriod('A138-22', pick({ n_B_Bemessung: 0.1, n: 0.2 }))).toBe(10);
  });

  it('BOTH project n=0.2 AND project T_n=30 present → returns 5 (follows n, not T_n field)', () => {
    // Key single-source test: n is the owned design frequency; T_n=1/n is derived.
    // When both are present, n must win so the derived T_n cannot override the source.
    expect(facilityReturnPeriod('A138-13', pick({ n: 0.2, T_n: 30 }))).toBe(5);
  });

  it('project n absent, T_n=30 present → returns 30 (last-resort T_n direct value)', () => {
    expect(facilityReturnPeriod('A138-13', pick({ T_n: 30 }))).toBe(30);
  });

  it('neither n nor T_n → returns null', () => {
    expect(facilityReturnPeriod('A138-13', pick({}))).toBeNull();
  });

  it('n=0 (non-positive) → skips to T_n fallback', () => {
    expect(facilityReturnPeriod('A138-13', pick({ n: 0, T_n: 10 }))).toBe(10);
  });
});
