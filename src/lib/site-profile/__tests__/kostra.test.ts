import { describe, expect, it } from 'vitest';
import {
  latLonToKostraCell,
  latLonStringsToKostraCell,
} from '../kostra';
import { isKostraCellCovered, KOSTRA_GRID_SIZE } from '../kostra-belege';

/**
 * Reference INDEX_RC values were derived directly from the official DWD grid
 * definition:
 *   - LAEA (EPSG:3035, GRS80, lat0=52°N lon0=10°E, FE=4 321 000, FN=3 210 000)
 *   - grid bbox x ∈ [3 600 000, 5 100 000], y ∈ [2 300 000, 3 800 000]
 *   - cell size 5 km, INDEX_RC = row * 1000 + col, row = 0 at north
 *
 * For each German test city the lat/lon is taken from a well-known landmark
 * (Köln Dom, München Marienplatz, Hamburg Rathaus, Berlin Brandenburger Tor),
 * the LAEA forward transform is exact, and the resulting cell was confirmed
 * to have BELEG = 1 in the parameter shapefile when the bitmap was generated.
 */

describe('latLonToKostraCell — known cities', () => {
  it('Köln Dom → cell 140101', () => {
    expect(latLonToKostraCell(50.9413, 6.9583)).toEqual({ cellId: '140101' });
  });

  it('München Marienplatz → cell 203167', () => {
    expect(latLonToKostraCell(48.1374, 11.5755)).toEqual({ cellId: '203167' });
  });

  it('Hamburg Rathaus → cell 83144', () => {
    expect(latLonToKostraCell(53.5503, 9.992)).toEqual({ cellId: '83144' });
  });

  it('Berlin Brandenburger Tor → cell 105190', () => {
    expect(latLonToKostraCell(52.5163, 13.3777)).toEqual({ cellId: '105190' });
  });
});

describe('latLonToKostraCell — outside Germany', () => {
  it('Bern (Switzerland) → null (inside LAEA bbox but BELEG=0)', () => {
    expect(latLonToKostraCell(46.948, 7.4474)).toBeNull();
  });

  it('Zürich (Switzerland) → null', () => {
    expect(latLonToKostraCell(47.3769, 8.5417)).toBeNull();
  });

  it('Paris (France) → null', () => {
    expect(latLonToKostraCell(48.8566, 2.3522)).toBeNull();
  });

  it('Madrid (Spain) → null (well outside grid)', () => {
    expect(latLonToKostraCell(40.4168, -3.7038)).toBeNull();
  });

  it('Helsinki (Finland) → null (outside grid northward)', () => {
    expect(latLonToKostraCell(60.1699, 24.9384)).toBeNull();
  });
});

describe('latLonToKostraCell — invalid inputs', () => {
  it('non-finite values → null', () => {
    expect(latLonToKostraCell(NaN, 10)).toBeNull();
    expect(latLonToKostraCell(50, Infinity)).toBeNull();
    expect(latLonToKostraCell(NaN, NaN)).toBeNull();
  });

  it('out-of-range lat/lon → null', () => {
    expect(latLonToKostraCell(95, 10)).toBeNull();
    expect(latLonToKostraCell(-95, 10)).toBeNull();
    expect(latLonToKostraCell(50, 200)).toBeNull();
    expect(latLonToKostraCell(50, -200)).toBeNull();
  });

  it('the antipode of the projection origin is handled cleanly (no NaN crash)', () => {
    // Antipode of (52°N, 10°E) is exactly (52°S, 170°W). The LAEA forward
    // is singular there (denom → 0); we must return a clean string-or-null
    // value, never NaN/Infinity, so downstream callers can rely on the type.
    //
    // Other antipodal-ish coordinates can mathematically project back into
    // the LAEA bbox of Germany — that's a property of an azimuthal
    // projection, not a bug. Engineer-facing entry points (Photon
    // autocomplete) only emit German addresses, so this is defence-in-
    // depth, not a user-facing case.
    const r = latLonToKostraCell(-52, -170);
    expect(r === null || typeof r?.cellId === 'string').toBe(true);
  });
});

describe('latLonToKostraCell — cell-ID format', () => {
  it('returns a decimal string with no leading zeros', () => {
    const r = latLonToKostraCell(53.5503, 9.992);
    expect(r).not.toBeNull();
    expect(r!.cellId).toMatch(/^[1-9]\d{0,5}$|^0$/);
  });
});

describe('latLonStringsToKostraCell', () => {
  it('parses well-formed strings', () => {
    expect(latLonStringsToKostraCell('50.9413', '6.9583')).toEqual({
      cellId: '140101',
    });
  });

  it('returns null on empty strings', () => {
    expect(latLonStringsToKostraCell('', '')).toBeNull();
  });

  it('returns null on non-numeric strings', () => {
    expect(latLonStringsToKostraCell('foo', 'bar')).toBeNull();
  });
});

describe('isKostraCellCovered (bitmap sanity)', () => {
  it('reports coverage exactly at the city cells', () => {
    expect(isKostraCellCovered(140, 101)).toBe(true);
    expect(isKostraCellCovered(203, 167)).toBe(true);
    expect(isKostraCellCovered(83, 144)).toBe(true);
    expect(isKostraCellCovered(105, 190)).toBe(true);
  });

  it('rejects out-of-range row/col', () => {
    expect(isKostraCellCovered(-1, 0)).toBe(false);
    expect(isKostraCellCovered(0, -1)).toBe(false);
    expect(isKostraCellCovered(KOSTRA_GRID_SIZE, 0)).toBe(false);
    expect(isKostraCellCovered(0, KOSTRA_GRID_SIZE)).toBe(false);
  });

  it('rejects non-integer row/col', () => {
    expect(isKostraCellCovered(140.5, 101)).toBe(false);
    expect(isKostraCellCovered(140, 101.2)).toBe(false);
  });
});
