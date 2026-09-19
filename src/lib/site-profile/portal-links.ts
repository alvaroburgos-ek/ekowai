/**
 * Deep links into the two NRW portals every infiltration proof consults,
 * preset with the project's site coordinates (A138-01 `site_lat` / `site_lon`,
 * WGS84). URL interfaces as documented by the portals (verified 2026-09-19):
 *
 * - TIM-online, "Kartenmittelpunkt": `?center=<lat>,<lon>` accepts WGS84
 *   (EPSG:4326) directly; `scale=<n>` presets the scale; `text=<label>` puts a
 *   label at the centre. https://www.tim-online.nrw.de/tim-online2/hilfe.html
 * - ELWAS-WEB, "externe Schnittstelle der Kartenaufrufe":
 *   `map-index.xhtml?layer=<code>;<code>&extent=<xmin>;<ymin>;<xmax>;<ymax>`,
 *   extent in ETRS89 / UTM 32N (the documented example uses 407683;5682847;…).
 *   Layer codes from …/elwasweb_kartenebenen.html.
 *   https://www.elwasweb.nrw.de/ct-mapapps-elwas/elwasweb_aufrufe.html
 *
 * Nothing here decides anything: the engineer still reads the zone, the
 * parcel and the wells off the portal. This only saves the navigation.
 */

/** ETRS89 / UTM zone 32N (EPSG:25832) from geographic WGS84/ETRS89 degrees.
 *  Krüger-series transverse Mercator on the GRS80 ellipsoid (sub-metre for
 *  NRW, far below the ~10 m precision of a 4-decimal site coordinate). */
export function wgs84ToUtm32(latDeg: number, lonDeg: number): { easting: number; northing: number } {
  const a = 6378137.0;
  const f = 1 / 298.257222101; // GRS80
  const k0 = 0.9996;
  const lon0 = (9 * Math.PI) / 180; // zone 32 central meridian
  const E0 = 500000;

  const phi = (latDeg * Math.PI) / 180;
  const lam = (lonDeg * Math.PI) / 180 - lon0;
  const n = f / (2 - f);
  const A = (a / (1 + n)) * (1 + (n * n) / 4 + (n ** 4) / 64);
  const alpha1 = n / 2 - (2 * n * n) / 3 + (5 * n ** 3) / 16;
  const alpha2 = (13 * n * n) / 48 - (3 * n ** 3) / 5;
  const alpha3 = (61 * n ** 3) / 240;

  const t = Math.sinh(Math.atanh(Math.sin(phi)) - ((2 * Math.sqrt(n)) / (1 + n)) * Math.atanh(((2 * Math.sqrt(n)) / (1 + n)) * Math.sin(phi)));
  const xi = Math.atan2(t, Math.cos(lam));
  const eta = Math.atanh(Math.sin(lam) / Math.sqrt(1 + t * t));

  const easting = E0 + k0 * A * (eta
    + alpha1 * Math.cos(2 * xi) * Math.sinh(2 * eta)
    + alpha2 * Math.cos(4 * xi) * Math.sinh(4 * eta)
    + alpha3 * Math.cos(6 * xi) * Math.sinh(6 * eta));
  const northing = k0 * A * (xi
    + alpha1 * Math.sin(2 * xi) * Math.cosh(2 * eta)
    + alpha2 * Math.sin(4 * xi) * Math.cosh(4 * eta)
    + alpha3 * Math.sin(6 * xi) * Math.cosh(6 * eta));
  return { easting, northing };
}

export type PortalLink = { key: 'tim' | 'elwas_wsg' | 'elwas_gw'; label: string; href: string; hint: string };

/** ELWAS layer codes (elwasweb_kartenebenen.html, "Trinkwasser und Wasserversorgung" / "Grundwasser"). */
const ELWAS_LAYERS_WSG = ['trinkwasserschutzgebiete_fest', 'trinkwasserschutzgebiete_geplant', 'heilquellen_fest'];
const ELWAS_LAYERS_GW = ['grundwasserstandsmessstellen', 'wrrl-mess-quanti'];

function inNrwBounds(lat: number, lon: number): boolean {
  // Generous NRW box; outside it the ELWAS/TIM links are meaningless.
  return lat >= 50.2 && lat <= 52.6 && lon >= 5.8 && lon <= 9.5;
}

/**
 * Build the portal links for a site. `null` when the coordinates are missing
 * or outside NRW (the portals cover NRW only). `halfWidthM` is the half side
 * of the ELWAS extent square around the site.
 */
export function buildPortalLinks(
  lat: number | null | undefined,
  lon: number | null | undefined,
  opts: { label?: string; scale?: number; halfWidthM?: number } = {},
): PortalLink[] | null {
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (!inNrwBounds(lat, lon)) return null;
  const scale = opts.scale ?? 2500;
  const half = opts.halfWidthM ?? 500;
  const label = opts.label ?? 'Standort';
  const { easting, northing } = wgs84ToUtm32(lat, lon);
  const r = (v: number) => Math.round(v);
  const extent = [r(easting - half), r(northing - half), r(easting + half), r(northing + half)].join(';');
  const latS = lat.toFixed(6);
  const lonS = lon.toFixed(6);
  return [
    {
      key: 'tim',
      label: 'TIM-online (Flurstück, Höhen, Hangneigung)',
      href: `https://www.tim-online.nrw.de/tim-online2/?center=${latS},${lonS}&scale=${scale}&text=${encodeURIComponent(label)}`,
      hint: `Kartenmitte ${latS} N, ${lonS} E (WGS84), Maßstab 1:${scale}`,
    },
    {
      key: 'elwas_wsg',
      label: 'ELWAS-WEB — Wasserschutzgebiete (festgesetzt/geplant, Heilquellen)',
      href: `https://www.elwasweb.nrw.de/elwas-web/map-index.xhtml?layer=${ELWAS_LAYERS_WSG.join(';')}&extent=${extent}&legende=true`,
      hint: `Ausschnitt ±${half} m um ${r(easting)} / ${r(northing)} (ETRS89/UTM 32N)`,
    },
    {
      key: 'elwas_gw',
      label: 'ELWAS-WEB — Grundwassermessstellen',
      href: `https://www.elwasweb.nrw.de/elwas-web/map-index.xhtml?layer=${ELWAS_LAYERS_GW.join(';')}&extent=${extent}&legende=true`,
      hint: `Ausschnitt ±${half} m um ${r(easting)} / ${r(northing)} (ETRS89/UTM 32N)`,
    },
  ];
}
