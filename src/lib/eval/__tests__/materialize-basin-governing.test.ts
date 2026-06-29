/**
 * Unit tests for materializeBasinGoverning.
 *
 * The function is a pure resolver: given a raw carrier + T_n + table ref +
 * scalar bag it returns the governing { r_D_n, D_min } or null (withhold).
 * No DB, no side-effects — all cases are unit-testable here.
 *
 * Witness: Heinsberg-equivalent inputs → r_D_n=130, D_min=30 (same as the
 * basin 18.684 acceptance test). Mismatches here mean the pure fn diverges
 * from the aggregator — a correctness bug.
 */
import { describe, it, expect } from 'vitest';
import { materializeBasinGoverning } from '../materialize-basin-governing';

// ---------------------------------------------------------------------------
// Shared Heinsberg fixture (mirrors formula-Gl8.test.ts and governing-duration-basin.test.ts)
// ---------------------------------------------------------------------------
const HEINSBERG_CARRIER = {
  tables: [
    {
      id: 'table-1',
      name: 'Heinsberg',
      source: 'engineer',
      legacyDesignColumn: true,
      columns: [2, 5, 10, 20, 50, 100],
      rows: [
        { D_min: 5, r_D_n: 300 },
        { D_min: 10, r_D_n: 230 },
        { D_min: 15, r_D_n: 195 },
        { D_min: 30, r_D_n: 130 },
        { D_min: 60, r_D_n: 80 },
        { D_min: 120, r_D_n: 50 },
      ],
    },
  ],
};

const FULL_SCALARS = {
  A_C: 1000,
  A_VA: 50,
  Q_S: 5,
  Q_Dr: 0,
  f_Z: 1.2,
  f_A: 1.0,
};

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------
describe('materializeBasinGoverning — happy path (Heinsberg witness)', () => {
  it('returns r_D_n=130, D_min=30 for the canonical Heinsberg inputs', () => {
    const result = materializeBasinGoverning({
      carrierRaw: HEINSBERG_CARRIER,
      rainfallTableRef: null,   // use first/only table
      T_n: 5,                   // legacy table serves any T_n
      scalars: FULL_SCALARS,
    });

    expect(result).not.toBeNull();
    expect(result!.r_D_n).toBe(130);
    expect(result!.D_min).toBe(30);
  });

  it('matches for T_n=null (legacy table serves null too)', () => {
    const result = materializeBasinGoverning({
      carrierRaw: HEINSBERG_CARRIER,
      rainfallTableRef: null,
      T_n: null,
      scalars: FULL_SCALARS,
    });

    expect(result).not.toBeNull();
    expect(result!.r_D_n).toBe(130);
    expect(result!.D_min).toBe(30);
  });

  it('matches for a 2D native table with a finite T_n column present', () => {
    // Build a 2D table: T_n=5 column filled with same values as Heinsberg legacy
    const carrier2D = {
      tables: [
        {
          id: 'native-1',
          name: '2D native',
          source: 'engineer',
          columns: [2, 5, 10],
          rows: [
            { D_min: 5,  r: { '5': 300 } },
            { D_min: 10, r: { '5': 230 } },
            { D_min: 15, r: { '5': 195 } },
            { D_min: 30, r: { '5': 130 } },
            { D_min: 60, r: { '5': 80  } },
            { D_min: 120, r: { '5': 50 } },
          ],
        },
      ],
    };

    const result = materializeBasinGoverning({
      carrierRaw: carrier2D,
      rainfallTableRef: null,
      T_n: 5,
      scalars: FULL_SCALARS,
    });

    expect(result).not.toBeNull();
    expect(result!.r_D_n).toBe(130);
    expect(result!.D_min).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// Withhold cases → null
// ---------------------------------------------------------------------------
describe('materializeBasinGoverning — withhold → null', () => {
  it('returns null when the carrier is empty (no tables)', () => {
    const result = materializeBasinGoverning({
      carrierRaw: { tables: [] },
      rainfallTableRef: null,
      T_n: 5,
      scalars: FULL_SCALARS,
    });

    expect(result).toBeNull();
  });

  it('returns null when the carrier is null/undefined', () => {
    const result = materializeBasinGoverning({
      carrierRaw: null,
      rainfallTableRef: null,
      T_n: 5,
      scalars: FULL_SCALARS,
    });

    expect(result).toBeNull();
  });

  it('returns null when a native 2D table is used but T_n=null (column withhold)', () => {
    const carrier2D = {
      tables: [
        {
          id: 'native-1',
          name: '2D native',
          source: 'engineer',
          columns: [5],
          rows: [
            { D_min: 30, r: { '5': 130 } },
          ],
        },
      ],
    };

    const result = materializeBasinGoverning({
      carrierRaw: carrier2D,
      rainfallTableRef: null,
      T_n: null,   // native table + null T_n → missing column
      scalars: FULL_SCALARS,
    });

    expect(result).toBeNull();
  });

  it('returns null when a native 2D table has no matching T_n column', () => {
    const carrier2D = {
      tables: [
        {
          id: 'native-1',
          name: '2D native',
          source: 'engineer',
          columns: [5],
          rows: [
            { D_min: 30, r: { '5': 130 } },
          ],
        },
      ],
    };

    const result = materializeBasinGoverning({
      carrierRaw: carrier2D,
      rainfallTableRef: null,
      T_n: 10,   // T_n=10 not in native table
      scalars: FULL_SCALARS,
    });

    expect(result).toBeNull();
  });

  it('returns null when a required scalar is missing (A_C null)', () => {
    const result = materializeBasinGoverning({
      carrierRaw: HEINSBERG_CARRIER,
      rainfallTableRef: null,
      T_n: 5,
      scalars: { ...FULL_SCALARS, A_C: null as unknown as number },
    });

    expect(result).toBeNull();
  });

  it('returns null when a required scalar is NaN (Q_S NaN)', () => {
    const result = materializeBasinGoverning({
      carrierRaw: HEINSBERG_CARRIER,
      rainfallTableRef: null,
      T_n: 5,
      scalars: { ...FULL_SCALARS, Q_S: NaN },
    });

    expect(result).toBeNull();
  });

  it('returns null when ALL scalars are missing', () => {
    const result = materializeBasinGoverning({
      carrierRaw: HEINSBERG_CARRIER,
      rainfallTableRef: null,
      T_n: 5,
      scalars: {
        A_C: null as unknown as number,
        A_VA: null as unknown as number,
        Q_S: null as unknown as number,
        Q_Dr: null as unknown as number,
        f_Z: null as unknown as number,
        f_A: null as unknown as number,
      },
    });

    expect(result).toBeNull();
  });

  it('returns null when rainfallTableRef points to a non-existent table and there is no fallback table', () => {
    const result = materializeBasinGoverning({
      carrierRaw: { tables: [] },
      rainfallTableRef: 'non-existent-id',
      T_n: 5,
      scalars: FULL_SCALARS,
    });

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Table ref selection
// ---------------------------------------------------------------------------
describe('materializeBasinGoverning — table ref selection', () => {
  it('selects the correct table when rainfallTableRef matches', () => {
    // Two tables: first has Heinsberg values, second has different values
    const carrier = {
      tables: [
        {
          id: 'table-A',
          name: 'Not Heinsberg',
          source: 'engineer',
          legacyDesignColumn: true,
          columns: [5],
          rows: [
            { D_min: 5, r_D_n: 999 },
            { D_min: 30, r_D_n: 999 },
          ],
        },
        {
          id: 'table-B',
          name: 'Heinsberg',
          source: 'engineer',
          legacyDesignColumn: true,
          columns: [5],
          rows: [
            { D_min: 5,   r_D_n: 300 },
            { D_min: 10,  r_D_n: 230 },
            { D_min: 15,  r_D_n: 195 },
            { D_min: 30,  r_D_n: 130 },
            { D_min: 60,  r_D_n: 80 },
            { D_min: 120, r_D_n: 50 },
          ],
        },
      ],
    };

    const result = materializeBasinGoverning({
      carrierRaw: carrier,
      rainfallTableRef: 'table-B',
      T_n: 5,
      scalars: FULL_SCALARS,
    });

    expect(result).not.toBeNull();
    expect(result!.r_D_n).toBe(130);
    expect(result!.D_min).toBe(30);
  });
});
