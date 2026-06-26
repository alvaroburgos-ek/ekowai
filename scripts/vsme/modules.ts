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
  const roleTypes: Record<string, unknown>[] = ([] as Record<string, unknown>[]).concat(
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
 * Build a Map<conceptName, moduleCodePrefix> from `vsme-presentation.xml`.
 *
 * Each `link:presentationLink` carries an `@_xlink:role` URI that maps back to
 * a `ModuleRole.code` (via `parseRoles`).  Within each link, `link:loc`
 * locators have `@_xlink:href` ending in `#vsme_<ConceptName>`.
 *
 * Strategy for multi-role concepts: prefer the first real B/C module code
 * (skip D99 / unmapped if a better code already exists).
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

  const links: Record<string, unknown>[] = ([] as Record<string, unknown>[]).concat(
    presDoc['link:linkbase']?.['link:presentationLink'] ?? [],
  );

  const map = new Map<string, string>();

  for (const link of links) {
    const roleUri = String(link['@_xlink:role'] ?? '');
    const code = rolesByUri.get(roleUri);
    if (!code) continue;

    const locs: Record<string, unknown>[] = ([] as Record<string, unknown>[]).concat(
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
        // No entry yet — set unconditionally
        map.set(name, code.slice(0, 3));
      } else {
        // Prefer B/C codes over D99 / generic
        const isBetter =
          (code.startsWith('B') || code.startsWith('C')) &&
          !(existing.startsWith('B') || existing.startsWith('C'));
        if (isBetter) map.set(name, code.slice(0, 3));
      }
    }
  }

  return map;
}
