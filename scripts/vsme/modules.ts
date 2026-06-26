import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';

// ─── Owner classification sets ─────────────────────────────────────────────
const ENV = new Set(['B03', 'B04', 'B05', 'B06', 'B07']);
const CLIENT = new Set(['B08', 'B09', 'B10', 'B11', 'C05', 'C06', 'C07', 'C08', 'C09']);

/**
 * Map a module code prefix (e.g. "B03" or "B03.000") to an owner tag.
 *  - B03–B07 → ekowai_env  (environment modules — pre-filled by EKOWAI engine)
 *  - B08–B11, C05–C09 → client_supplied  (social / governance — client data)
 *  - everything else → general
 */
export function moduleCodeToOwner(
  code: string,
): 'ekowai_env' | 'client_supplied' | 'general' {
  const k = code.slice(0, 3);
  if (ENV.has(k)) return 'ekowai_env';
  if (CLIENT.has(k)) return 'client_supplied';
  return 'general';
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type ModuleRole = { roleUri: string; code: string; title: string };

// ─── parseRoles ─────────────────────────────────────────────────────────────

/**
 * Parse all VSME module roles from `vsme-all.xsd`.
 *
 * The XSD embeds `link:roleType` elements inside `xs:annotation/xs:appinfo`.
 * Each has:
 *   @_roleURI  — canonical URI identifying the role
 *   link:definition — text like "[B03.000] - Environment - Total Energy Consumption"
 *
 * We extract roles whose definition matches /\[([A-Z]\d{2}\.\d{3})\]/ —
 * enumeration roles ([99xxx]) have no letter prefix so they are skipped.
 */
export function parseRoles(taxonomyDir: string): ModuleRole[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const xsdRaw = fs.readFileSync(path.join(taxonomyDir, 'vsme-all.xsd'), 'utf8');
  const xsdDoc = parser.parse(xsdRaw);

  const appinfo = xsdDoc['xs:schema']?.['xs:annotation']?.['xs:appinfo'];
  const roleTypes: Record<string, unknown>[] = ([] as any[]).concat(
    appinfo?.['link:roleType'] ?? [],
  );

  const out: ModuleRole[] = [];
  for (const rt of roleTypes) {
    const def = String(rt['link:definition'] ?? '');
    // Match "[B03.000] - Environment - Total Energy Consumption"
    const m = def.match(/\[([A-Z]\d{2}\.\d{3})\]\s*-\s*(.*)/);
    if (!m) continue;
    out.push({
      roleUri: String(rt['@_roleURI']),
      code: m[1],
      title: m[2].trim(),
    });
  }
  return out;
}

// ─── conceptModuleMap ───────────────────────────────────────────────────────

/**
 * Decide which of two FULL role codes (e.g. "B03.200" vs "C03.100") should own
 * a concept that is presented under both. Returns true if `candidate` is a
 * better owner than `current`. Deterministic, taxonomy-faithful:
 *
 *  1. Prefer a real disclosure module (B/C) over the residual "Other / entity
 *     specific" bucket (D99) — never let D99 capture a B/C concept.
 *  2. Prefer the BASIC module (B) over the COMPREHENSIVE module (C). The VSME
 *     Standard discloses each datapoint ONCE as its primary obligation; the
 *     comprehensive layer (C03.1xx) only RE-PRESENTS the same datapoints in a
 *     target/baseline context. The primary disclosure home is therefore the B
 *     role. This is exactly what fixes the GHG §30 set: the eight
 *     Gross.../Total...GHGEmissions concepts appear under BOTH [B03.200]
 *     Estimated GHG Emissions (Basic Module B3 ¶30) and [C03.100] GHG Emission
 *     Reduction Targets — they belong on B3.
 *  3. Otherwise keep the lexicographically smaller full code (stable, so the
 *     output is reproducible regardless of presentation-link order).
 */
function isBetterOwner(candidate: string, current: string): boolean {
  const candReal = candidate.startsWith('B') || candidate.startsWith('C');
  const curReal = current.startsWith('B') || current.startsWith('C');
  if (candReal !== curReal) return candReal; // (1) B/C beats D99/other

  const candBasic = candidate.startsWith('B');
  const curBasic = current.startsWith('B');
  if (candBasic !== curBasic) return candBasic; // (2) Basic beats Comprehensive

  return candidate.localeCompare(current) < 0; // (3) deterministic tie-break
}

/**
 * Build a Map<conceptName, fullModuleCode> from `vsme-presentation.xml`.
 *
 * Each `link:presentationLink` carries an `@_xlink:role` URI that maps back to
 * a `ModuleRole.code` (via `parseRoles`).  Within each link, `link:loc`
 * locators have `@_xlink:href` ending in `#vsme_<ConceptName>`.
 *
 * The value is the FULL role code (e.g. "B03.200"), NOT the 3-char prefix, so
 * each concept lands on the exact worksheet the taxonomy presents it under.
 * (Collapsing to the 3-char prefix used to funnel every B03.xxx concept onto
 * the single B03.000 worksheet, leaving B03.100/.200/.300 — and the analogous
 * .1xx/.2xx/.3xx siblings of every module — permanently empty.)
 *
 * Strategy for multi-role concepts: see isBetterOwner — prefer the Basic (B)
 * disclosure home over the Comprehensive (C) re-presentation, and any real B/C
 * role over the residual D99 bucket.
 */
export function conceptModuleMap(taxonomyDir: string): Map<string, string> {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

  // Build URI → code lookup from roles
  const rolesByUri = new Map(
    parseRoles(taxonomyDir).map((r) => [r.roleUri, r.code]),
  );

  const presRaw = fs.readFileSync(
    path.join(taxonomyDir, 'vsme-presentation.xml'),
    'utf8',
  );
  const presDoc = parser.parse(presRaw);

  const links: Record<string, unknown>[] = ([] as any[]).concat(
    presDoc['link:linkbase']?.['link:presentationLink'] ?? [],
  );

  const map = new Map<string, string>();

  for (const link of links) {
    const roleUri = String(link['@_xlink:role'] ?? '');
    const code = rolesByUri.get(roleUri);
    if (!code) continue;

    const locs: Record<string, unknown>[] = ([] as any[]).concat(
      link['link:loc'] ?? [],
    );

    for (const loc of locs) {
      const href = String(loc['@_xlink:href'] ?? '');
      // href format: "vsme-all.xsd#vsme_<ConceptName>"
      const hashIdx = href.indexOf('#vsme_');
      if (hashIdx < 0) continue;
      const name = href.slice(hashIdx + '#vsme_'.length);
      if (!name) continue;

      const existing = map.get(name);
      if (!existing) {
        // No entry yet — set unconditionally (full role code).
        map.set(name, code);
      } else if (isBetterOwner(code, existing)) {
        map.set(name, code);
      }
    }
  }

  return map;
}
