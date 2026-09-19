import { describe, it, expect } from 'vitest';
import { buildPortalLinks, wgs84ToUtm32 } from '../portal-links';

/** Independent cross-check: the classic USGS (Snyder 1987) transverse-Mercator
 *  series on GRS80 — a different derivation from the Krüger series used in
 *  the module. Agreement < 1 m over NRW pins the implementation. */
function snyderUtm32(latDeg: number, lonDeg: number): [number, number] {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9996;
  const e2 = 2 * f - f * f, ep2 = e2 / (1 - e2);
  const p = (latDeg * Math.PI) / 180, l = ((lonDeg - 9) * Math.PI) / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(p) ** 2), T = Math.tan(p) ** 2, C = ep2 * Math.cos(p) ** 2, A = Math.cos(p) * l;
  const M = a * ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256) * p
    - ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * p)
    + ((15 * e2 * e2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * p)
    - ((35 * e2 ** 3) / 3072) * Math.sin(6 * p));
  const E = 500000 + k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120);
  const Nn = k0 * (M + N * Math.tan(p) * ((A * A) / 2 + ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
  return [E, Nn];
}

describe('wgs84ToUtm32', () => {
  it.each([
    [51.7339, 7.3189], // Hullern site (report EKO-2026-001 §2.1 lat/lon)
    [50.9413, 6.9583], // Köln
    [52.0302, 8.5325], // Bielefeld
    [51.0, 9.0],       // central meridian
    [50.3, 6.2],       // Eifel, western edge
  ])('agrees with the independent Snyder series within 1 m at (%s, %s)', (lat, lon) => {
    const { easting, northing } = wgs84ToUtm32(lat, lon);
    const [E, N] = snyderUtm32(lat, lon);
    expect(Math.abs(easting - E)).toBeLessThan(1);
    expect(Math.abs(northing - N)).toBeLessThan(1);
  });

  it('is exact on the central meridian (easting 500 000)', () => {
    expect(wgs84ToUtm32(51, 9).easting).toBeCloseTo(500000, 3);
  });

  it('places the Hullern site at 383 912 / 5 732 780 (both series) — 62 m east of the UTM pair typed in the form texts', () => {
    const { easting, northing } = wgs84ToUtm32(51.7339, 7.3189);
    expect(Math.round(easting)).toBe(383912);
    expect(Math.round(northing)).toBe(5732780);
  });
});

describe('buildPortalLinks', () => {
  it('returns null without coordinates or outside NRW', () => {
    expect(buildPortalLinks(null, 7.3)).toBeNull();
    expect(buildPortalLinks(51.7, undefined)).toBeNull();
    expect(buildPortalLinks(48.1, 11.6)).toBeNull(); // München
  });

  it('builds the TIM-online centre link (WGS84) and the ELWAS extent links (UTM32, ±500 m)', () => {
    const links = buildPortalLinks(51.7339, 7.3189, { label: 'BESS Hullern' });
    expect(links).not.toBeNull();
    const byKey = Object.fromEntries(links!.map((l) => [l.key, l]));
    expect(byKey.tim.href).toBe('https://www.tim-online.nrw.de/tim-online2/?center=51.733900,7.318900&scale=2500&text=BESS%20Hullern');
    const m = /extent=(\d+);(\d+);(\d+);(\d+)/.exec(byKey.elwas_wsg.href)!;
    const [xmin, ymin, xmax, ymax] = m.slice(1).map(Number);
    expect(xmax - xmin).toBe(1000);
    expect(ymax - ymin).toBe(1000);
    expect((xmin + xmax) / 2).toBe(383912);
    expect((ymin + ymax) / 2).toBe(5732780);
    expect(byKey.elwas_wsg.href).toContain('layer=trinkwasserschutzgebiete_fest;trinkwasserschutzgebiete_geplant;heilquellen_fest');
    expect(byKey.elwas_gw.href).toContain('layer=grundwasserstandsmessstellen;wrrl-mess-quanti');
    expect(byKey.elwas_gw.href).toContain('legende=true');
  });
});
