import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';

export type VsmeConcept = {
  id: string;
  name: string;
  xbrlType: string;
  abstract: boolean;
  labelEn: string | null;
  dataType: 'number' | 'text' | 'enum' | 'boolean' | 'date';
};

// Local-name fragments that map to numeric data types.
const NUMERIC_FRAGMENTS = [
  'monetary',
  'mass',
  'volume',
  'energy',
  'percent',
  'decimal',
  'integer',
  'pure',
  'area',
  'power',
  'ghg',
];

/**
 * Map an XBRL type QName (e.g. "dtr-types:massItemType") to a wizard dataType.
 * Falls back to 'text' for anything not recognised.
 */
export function mapXbrlType(
  xbrlType: string,
  _abstract: boolean,
): VsmeConcept['dataType'] {
  // Extract local-name after the colon prefix (or use the whole string).
  const localName = (xbrlType || '').split(':').pop()!.toLowerCase();

  if (localName.startsWith('enumeration')) return 'enum';
  if (localName.startsWith('boolean')) return 'boolean';
  if (localName.startsWith('date')) return 'date';
  if (NUMERIC_FRAGMENTS.some((frag) => localName.startsWith(frag))) return 'number';
  return 'text';
}

/**
 * Parse `vsme-all.xsd` (concepts) and `vsme-label-en.xml` (English labels)
 * from the given taxonomy directory and return a typed concept list.
 */
export function parseConcepts(taxonomyDir: string): VsmeConcept[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  // --- Parse XSD ---
  const xsdRaw = fs.readFileSync(path.join(taxonomyDir, 'vsme-all.xsd'), 'utf8');
  const xsdDoc = parser.parse(xsdRaw);
  const elements: Record<string, string>[] = ([] as any[]).concat(
    xsdDoc['xs:schema']?.['xs:element'] ?? [],
  );

  // --- Parse English labels ---
  const labelsMap = parseLabels(
    parser,
    path.join(taxonomyDir, 'vsme-label-en.xml'),
  );

  // --- Combine ---
  return elements.map((el) => {
    const name: string = el['@_name'] ?? '';
    const xbrlType: string = el['@_type'] ?? '';
    const abstract: boolean = el['@_abstract'] === 'true';
    return {
      id: el['@_id'] ?? '',
      name,
      xbrlType,
      abstract,
      labelEn: labelsMap.get(name) ?? null,
      dataType: mapXbrlType(xbrlType, abstract),
    };
  });
}

/**
 * Build a Map<conceptName, standardLabelText> from vsme-label-en.xml.
 *
 * Structure (as observed in the real file):
 *   link:linkbase
 *     link:labelLink   (single object — NOT an array)
 *       link:label[]   (array of resource nodes)
 *         @_xlink:label  -> "label_<ConceptName>"  (may be a typo in some cases)
 *         @_xlink:role   -> ".../role/label" (standard label) or ".../role/measurementGuidance"
 *         #text          -> the label string
 *
 * We key by concept name derived from @_xlink:label by stripping the "label_" prefix.
 * When a concept has both a standard label and a measurement-guidance entry, we prefer
 * the standard label (role ends with "/role/label").
 */
function parseLabels(parser: XMLParser, file: string): Map<string, string> {
  const labelXml = fs.readFileSync(file, 'utf8');
  const doc = parser.parse(labelXml);

  const labelLink = doc['link:linkbase']?.['link:labelLink'];
  // labelLink is a single object in this taxonomy, but normalise defensively.
  const labelLinkObj = Array.isArray(labelLink) ? labelLink[0] : labelLink;

  const labelNodes: Record<string, unknown>[] = ([] as any[]).concat(
    labelLinkObj?.['link:label'] ?? [],
  );

  const map = new Map<string, string>();

  for (const node of labelNodes) {
    const role = String(node['@_xlink:role'] ?? '');
    // Only pick the standard label (not measurementGuidance, documentation, etc.)
    if (!role.endsWith('/role/label')) continue;

    // "@_xlink:label" holds "label_<ConceptName>" — strip the prefix.
    const xlinkLabel = String(node['@_xlink:label'] ?? '');
    const conceptName = xlinkLabel.replace(/^label_/, '');
    if (!conceptName) continue;

    const text = String(node['#text'] ?? '').trim();
    if (!text) continue;

    // First occurrence wins (avoids overwriting with a duplicate).
    if (!map.has(conceptName)) {
      map.set(conceptName, text);
    }
  }

  return map;
}
