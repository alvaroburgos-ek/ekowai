import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';

export type EnumRow = {
  enum_name: string;
  value: string;
  label_en: string;
  order_index: number;
};

/**
 * Parse `vsme-all.xsd` and `vsme-definition.xml` to extract allowed enum members
 * for every enum-typed concept.
 *
 * Strategy:
 *  1. Read vsme-all.xsd: collect elements with `enum2:enumerationItemType` /
 *     `enum2:enumerationSetItemType` — these carry `enum2:linkrole` which points
 *     to a definitionLink in vsme-definition.xml.
 *  2. Read vsme-label-en.xml: build a loc-label → text map (same approach as
 *     taxonomy.ts `parseLabels`; keys are the xlink:label values from <link:loc>
 *     elements — e.g. "BasicModuleMember" — obtained by stripping the "label_"
 *     prefix from the corresponding <link:label xlink:label="label_BasicModuleMember">).
 *  3. Read vsme-definition.xml: for each definitionLink whose role matches a known
 *     enum linkrole, collect domain-member arcs (arcrole=domain-member). For each arc
 *     "to" locator, extract the concept name from the href fragment
 *     (e.g. "vsme-all.xsd#vsme_OptionABasicModuleOnlyMember" → "OptionABasicModuleOnlyMember"),
 *     and look up the English label via the loc's xlink:label key.
 *  4. Emit one EnumRow per (enum_concept, member) pair. Multiple enum concepts that
 *     share a linkrole each receive the same member set.
 *
 * NOTE on the enum2 namespace: the 2026-02-01 VSME taxonomy uses the 2020 revision URI
 * `http://xbrl.org/2020/extensible-enumerations-2.0` for enum2 attributes.
 */
export function parseEnumValues(taxonomyDir: string): EnumRow[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  // ── 1. Collect enum concepts: name → linkrole ──────────────────────────────
  const xsdRaw = fs.readFileSync(path.join(taxonomyDir, 'vsme-all.xsd'), 'utf8');
  const xsdDoc = parser.parse(xsdRaw);
  const elements: Record<string, string>[] = [].concat(
    xsdDoc['xs:schema']?.['xs:element'] ?? [],
  );

  // enum2 attribute names as rendered by fast-xml-parser with attributeNamePrefix '@_'
  const DOMAIN_ATTR = '@_enum2:domain';
  const LINKROLE_ATTR = '@_enum2:linkrole';
  const TYPE_ATTR = '@_type';

  // linkrole → list of owning enum concept names (multiple concepts may share a role)
  const linkroleToEnumNames = new Map<string, string[]>();

  for (const el of elements) {
    const type: string = el[TYPE_ATTR] ?? '';
    const linkrole: string = el[LINKROLE_ATTR] ?? '';
    const name: string = el['@_name'] ?? '';

    // Only concepts whose type is an enumeration item/set type
    if (!type.toLowerCase().includes('enumeration') || !linkrole || !name) continue;

    if (!linkroleToEnumNames.has(linkrole)) {
      linkroleToEnumNames.set(linkrole, []);
    }
    linkroleToEnumNames.get(linkrole)!.push(name);
  }

  // ── 2. Build label map: loc-xlink:label → English text ────────────────────
  // The label file maps: loc (xlink:label="BasicModuleMember") --labelArc--> label
  //   (xlink:label="label_BasicModuleMember"). We bridge by stripping the "label_"
  //   prefix from the <link:label> xlink:label attribute — identical to taxonomy.ts.
  const labelMap = buildLabelMap(
    parser,
    path.join(taxonomyDir, 'vsme-label-en.xml'),
  );

  // ── 3. Parse vsme-definition.xml for domain-member arcs ───────────────────
  const defRaw = fs.readFileSync(
    path.join(taxonomyDir, 'vsme-definition.xml'),
    'utf8',
  );
  const defDoc = parser.parse(defRaw);

  const linkbase = defDoc['link:linkbase'] ?? {};
  const defLinks: Record<string, unknown>[] = [].concat(
    linkbase['link:definitionLink'] ?? [],
  );

  const rows: EnumRow[] = [];

  for (const defLink of defLinks) {
    const role: string = (defLink['@_xlink:role'] as string) ?? '';

    // Only process linkroles that correspond to known enum concepts
    const enumNames = linkroleToEnumNames.get(role);
    if (!enumNames || enumNames.length === 0) continue;

    // Build: loc xlink:label → (concept name, loc xlink:label)
    const locs: Record<string, string>[] = [].concat(defLink['link:loc'] ?? []);
    // locLabel → { conceptName, locLabel }
    const locMap = new Map<string, { conceptName: string; locLabel: string }>();

    for (const loc of locs) {
      const href: string = (loc['@_xlink:href'] as string) ?? '';
      const locLabel: string = (loc['@_xlink:label'] as string) ?? '';
      // href is like "vsme-all.xsd#vsme_OptionABasicModuleOnlyMember"
      // or "vsme-all.xsd#B1BasisForPreparationAndOtherUndertakingSGeneralInformationMember"
      const fragment = href.includes('#') ? href.split('#')[1] : href;
      // Strip "vsme_" prefix (some fragments don't have it)
      const conceptName = fragment.startsWith('vsme_')
        ? fragment.slice('vsme_'.length)
        : fragment;
      locMap.set(locLabel, { conceptName, locLabel });
    }

    // Collect domain-member arcs
    const arcs: Record<string, unknown>[] = [].concat(
      defLink['link:definitionArc'] ?? [],
    );

    const DOMAIN_MEMBER_ARCROLE =
      'http://xbrl.org/int/dim/arcrole/domain-member';

    for (const arc of arcs) {
      const arcrole: string = (arc['@_xlink:arcrole'] as string) ?? '';
      if (arcrole !== DOMAIN_MEMBER_ARCROLE) continue;

      const toLocLabel: string = (arc['@_xlink:to'] as string) ?? '';
      const order: number = parseFloat(String(arc['@_order'] ?? '0'));

      const locEntry = locMap.get(toLocLabel);
      if (!locEntry) continue;

      // The label key is the loc's xlink:label (e.g. "BasicModuleMember")
      // which matches the stripped label map key ("label_BasicModuleMember" → "BasicModuleMember")
      const label_en = labelMap.get(locEntry.locLabel) ?? '';

      // Emit one row per owning enum concept
      for (const enumName of enumNames) {
        rows.push({
          enum_name: enumName,
          value: locEntry.conceptName,
          label_en,
          order_index: Math.round(order),
        });
      }
    }
  }

  return rows;
}

/**
 * Build a Map<locXlinkLabel, labelText> from vsme-label-en.xml.
 *
 * In the label file, <link:label xlink:label="label_BasicModuleMember"> holds the
 * text. Stripping the "label_" prefix gives the corresponding loc's xlink:label key
 * ("BasicModuleMember"), which is also what vsme-definition.xml uses as the arc "to".
 *
 * This mirrors the parseLabels approach in taxonomy.ts but keys by loc xlink:label
 * instead of concept name.
 */
function buildLabelMap(parser: XMLParser, file: string): Map<string, string> {
  const labelXml = fs.readFileSync(file, 'utf8');
  const doc = parser.parse(labelXml);

  const labelLink = doc['link:linkbase']?.['link:labelLink'];
  const labelLinkObj = Array.isArray(labelLink) ? labelLink[0] : labelLink;

  const labelNodes: Record<string, unknown>[] = [].concat(
    labelLinkObj?.['link:label'] ?? [],
  );

  const map = new Map<string, string>();

  for (const node of labelNodes) {
    const role = String(node['@_xlink:role'] ?? '');
    if (!role.endsWith('/role/label')) continue;

    // "@_xlink:label" holds "label_<LocName>" — strip the prefix to get the loc key.
    const xlinkLabel = String(node['@_xlink:label'] ?? '');
    const locKey = xlinkLabel.replace(/^label_/, '');
    if (!locKey) continue;

    const text = String(node['#text'] ?? '').trim();
    if (!text) continue;

    if (!map.has(locKey)) {
      map.set(locKey, text);
    }
  }

  return map;
}
