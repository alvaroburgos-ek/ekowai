/**
 * Photon geocoding helper.
 *
 * Photon is an OSM-based geocoder hosted by Komoot in Germany. Free, no API
 * key, DSGVO-compatible. Public endpoint:
 *   https://photon.komoot.io/api/?q=...
 *
 * Attribution required: result lists must show "Powered by Photon /
 * OpenStreetMap". See https://photon.komoot.io.
 *
 * The query is biased toward central Germany (lat=51, lon=10) so German
 * addresses surface first, and results are post-filtered to country=Deutschland
 * — the engineering tool is German-water-management; non-DE addresses would
 * be a data-entry mistake to correct, not to support.
 */

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';
const DE_BIAS_LAT = 51;
const DE_BIAS_LON = 10;

export type PhotonFeature = {
  geometry: { coordinates: [number, number]; type: 'Point' };
  properties: {
    osm_id?: number;
    osm_type?: 'N' | 'W' | 'R';
    country?: string;
    state?: string;
    city?: string;
    town?: string;
    village?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    name?: string;
    type?: string;
  };
};

export type ResolvedAddress = {
  /** Human-readable formatted address. */
  address: string;
  municipality: string;
  bundesland: string;
  lat: number;
  lon: number;
};

/**
 * Search Photon for `query`. Aborts in-flight requests via the passed signal.
 * Returns max 5 results, country-filtered to Germany.
 */
export async function searchPhoton(
  query: string,
  signal?: AbortSignal,
): Promise<PhotonFeature[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  const url = new URL(PHOTON_ENDPOINT);
  url.searchParams.set('q', trimmed);
  url.searchParams.set('lang', 'de');
  url.searchParams.set('limit', '7');
  url.searchParams.set('lat', String(DE_BIAS_LAT));
  url.searchParams.set('lon', String(DE_BIAS_LON));
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);
  const json = (await res.json()) as { features?: PhotonFeature[] };
  const features = json.features ?? [];
  return features.filter((f) => f.properties.country === 'Deutschland').slice(0, 5);
}

/** Turn a Photon feature into the 5 site_profile fields. */
export function resolveFromPhoton(f: PhotonFeature): ResolvedAddress {
  const p = f.properties;
  const municipality = p.city ?? p.town ?? p.village ?? '';
  const streetPart = [p.street, p.housenumber].filter(Boolean).join(' ');
  const cityPart = [p.postcode, municipality].filter(Boolean).join(' ');
  const address = [streetPart, cityPart].filter(Boolean).join(', ') || p.name || '';
  const [lon, lat] = f.geometry.coordinates;
  return {
    address,
    municipality,
    bundesland: p.state ?? '',
    lat,
    lon,
  };
}

/** Short label for the autocomplete dropdown. */
export function photonLabel(f: PhotonFeature): { primary: string; secondary: string } {
  const p = f.properties;
  const streetPart = [p.street, p.housenumber].filter(Boolean).join(' ');
  const cityPart = [p.postcode, p.city ?? p.town ?? p.village].filter(Boolean).join(' ');
  const primary = streetPart || p.name || cityPart || '—';
  const secondary = [streetPart ? cityPart : '', p.state]
    .filter(Boolean)
    .join(' · ');
  return { primary, secondary };
}
