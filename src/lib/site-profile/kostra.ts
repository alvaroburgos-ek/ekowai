/**
 * KOSTRA-DWD-2020 grid cell lookup from WGS84 lat/lon.
 *
 * KOSTRA-DWD-2020 is the German Weather Service's gridded rainfall climatology
 * — every German point belongs to one 5 km × 5 km cell with an `INDEX_RC`
 * identifier of the form `row * 1000 + col`. Worksheet A138-04
 * (Niederschlagsdaten) keys off this cell ID to pull `r_D(n)` values.
 *
 * Grid definition (verified against `GIS_KOSTRA-DWD-2020_Param.zip` from DWD
 * CDC Open Data, 2026-05):
 *
 *   - Projection: ETRS89-LAEA (EPSG:3035), GRS80 ellipsoid,
 *     lat0 = 52°N, lon0 = 10°E, false_easting = 4 321 000, false_northing = 3 210 000
 *   - Grid extent: x ∈ [3 600 000, 5 100 000], y ∈ [2 300 000, 3 800 000] m
 *     (1 500 km × 1 500 km, 300 × 300 cells)
 *   - Cell size: 5 000 m × 5 000 m
 *   - row = 0 at the NORTHERN edge (y = 3 800 000), increases southward
 *   - col = 0 at the WESTERN edge (x = 3 600 000), increases eastward
 *   - INDEX_RC = row * 1000 + col (e.g. cell (140, 101) → "140101")
 *
 * Coverage: of the 90 000 cells in the full grid, only 15 989 carry actual
 * KOSTRA data (`BELEG = 1`) — these cover Germany plus a few-km buffer beyond
 * the border. Coordinates that project inside the LAEA bbox but land in a
 * BELEG = 0 cell (e.g. central Switzerland, parts of NL/BE/FR/PL/CZ/AT/DK)
 * return null. The bitmap is bundled in `./kostra-belege.ts`.
 *
 * The LAEA forward transform is Snyder's spherical-ellipsoidal formula
 * (oblique aspect), implemented inline to avoid a proj4js dependency. The
 * implementation is accurate to ≪ 1 cm at the German latitudes used here —
 * well below the 5 km cell size, so cell assignments at internal points are
 * exact. Cells right on Germany's external border can be ambiguous by the
 * usual ~1 km KOSTRA edge interpretation; that's a property of the grid,
 * not the projection.
 *
 * Engine-neutral: this module is pure, side-effect-free, and does NOT touch
 * `src/lib/eval/`.
 */

import { isKostraCellCovered, KOSTRA_GRID_SIZE } from './kostra-belege';

// === LAEA constants (EPSG:3035 / ETRS89-LAEA). =============================

const A = 6378137.0; // GRS80 semi-major axis (m)
const F_INV = 298.257222101; // GRS80 inverse flattening
const F = 1.0 / F_INV;
const E2 = 2 * F - F * F; // eccentricity squared
const E = Math.sqrt(E2);

const LAT0_RAD = (52 * Math.PI) / 180;
const LON0_RAD = (10 * Math.PI) / 180;
const FALSE_EASTING = 4_321_000;
const FALSE_NORTHING = 3_210_000;

// === Grid constants. =======================================================

/** Western edge of cell (row=0, col=0) in LAEA easting (m). */
const GRID_X_MIN = 3_600_000;
/** Northern edge of cell (row=0, col=0) in LAEA northing (m). */
const GRID_Y_MAX = 3_800_000;
/** Cell size in metres. */
const CELL_SIZE = 5_000;

// === Pre-computed projection helpers (constants — depend only on lat0). ====

const SIN_LAT0 = Math.sin(LAT0_RAD);
const COS_LAT0 = Math.cos(LAT0_RAD);

/** Snyder's "authalic q" for the GRS80 ellipsoid. */
function authalicQ(phi: number): number {
  const sphi = Math.sin(phi);
  return (
    (1 - E2) *
    (sphi / (1 - E2 * sphi * sphi) -
      (1 / (2 * E)) * Math.log((1 - E * sphi) / (1 + E * sphi)))
  );
}

const Q_POLE = authalicQ(Math.PI / 2);
const Q0 = authalicQ(LAT0_RAD);
const BETA0 = Math.asin(Q0 / Q_POLE);
const SIN_BETA0 = Math.sin(BETA0);
const COS_BETA0 = Math.cos(BETA0);
const RQ = A * Math.sqrt(Q_POLE / 2);
const M0 = COS_LAT0 / Math.sqrt(1 - E2 * SIN_LAT0 * SIN_LAT0);
const D_FACTOR = (A * M0) / (RQ * COS_BETA0);

/**
 * Forward Lambert Azimuthal Equal-Area transform (EPSG:3035 ellipsoidal,
 * oblique aspect). Returns LAEA (x, y) in metres given WGS84 lat/lon
 * (in degrees, °N / °E).
 */
function laeaForward(latDeg: number, lonDeg: number): { x: number; y: number } {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const qp = authalicQ(lat);
  const beta = Math.asin(qp / Q_POLE);
  const sinBeta = Math.sin(beta);
  const cosBeta = Math.cos(beta);
  const dLon = lon - LON0_RAD;
  const cosDLon = Math.cos(dLon);
  const denom = 1 + SIN_BETA0 * sinBeta + COS_BETA0 * cosBeta * cosDLon;
  // B is undefined for the antipode of the projection origin; that point
  // is on the opposite side of the planet from Germany, so guard the math
  // but treat the result as "out of grid" anyway.
  if (denom <= 0) return { x: Infinity, y: Infinity };
  const B = RQ * Math.sqrt(2 / denom);
  const x = B * D_FACTOR * cosBeta * Math.sin(dLon);
  const y =
    (B / D_FACTOR) *
    (COS_BETA0 * sinBeta - SIN_BETA0 * cosBeta * cosDLon);
  return { x: FALSE_EASTING + x, y: FALSE_NORTHING + y };
}

/**
 * Look up the KOSTRA-DWD-2020 grid cell for a WGS84 coordinate pair.
 *
 * Returns `{ cellId }` with `cellId` as the `INDEX_RC` string ("140101") for
 * coordinates inside a covered cell, or `null` for:
 *   - non-finite / out-of-range inputs
 *   - points that project outside the 300 × 300 LAEA grid
 *   - points inside the grid but in a BELEG = 0 cell (no KOSTRA data —
 *     i.e. outside Germany).
 *
 * Caller MUST treat `null` as "manual entry required", never as a default
 * value — A138-04 keys off this ID and a wrong cell would silently corrupt
 * every r_D(n) downstream.
 */
export function latLonToKostraCell(
  lat: number,
  lon: number,
): { cellId: string } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90) return null;
  if (lon < -180 || lon > 180) return null;

  const { x, y } = laeaForward(lat, lon);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  // Half-open intervals: a point on the eastern/southern edge of the bbox
  // belongs to the cell beyond, which doesn't exist.
  if (x < GRID_X_MIN || x >= GRID_X_MIN + KOSTRA_GRID_SIZE * CELL_SIZE) return null;
  if (y <= GRID_Y_MAX - KOSTRA_GRID_SIZE * CELL_SIZE || y > GRID_Y_MAX) return null;

  const col = Math.floor((x - GRID_X_MIN) / CELL_SIZE);
  const row = Math.floor((GRID_Y_MAX - y) / CELL_SIZE);
  if (row < 0 || row >= KOSTRA_GRID_SIZE) return null;
  if (col < 0 || col >= KOSTRA_GRID_SIZE) return null;

  if (!isKostraCellCovered(row, col)) return null;

  return { cellId: String(row * 1000 + col) };
}

/**
 * Convenience: parse string lat/lon (as stored in the form state) and look
 * up the cell. Returns null on any parse failure or out-of-coverage point.
 */
export function latLonStringsToKostraCell(
  latStr: string,
  lonStr: string,
): { cellId: string } | null {
  const lat = Number(latStr);
  const lon = Number(lonStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return latLonToKostraCell(lat, lon);
}
