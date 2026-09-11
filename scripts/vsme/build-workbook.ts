/**
 * build-workbook.ts
 *
 * Assembles a 7-sheet Pass3c workbook for the VSME standard from the XBRL
 * taxonomy parsers (Tasks 2–4).  Uses ExcelJS — the same library as
 * _pass3c-parsers.ts — so the output round-trips cleanly through parseWorkbook.
 *
 * Exports:
 *   buildVsmeRows(dir)          → plain-object row arrays (for unit assertions)
 *   buildVsmeWorkbook(dir)      → Promise<Buffer> containing the .xlsx bytes
 *
 * NOTE: parseEnumValues is inlined here (not imported from enums.ts) so this
 * file ships as a self-contained module with no new untracked peer dependencies.
 */

import ExcelJS from 'exceljs';
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';
import { parseConcepts } from './taxonomy';
import { parseRoles, conceptModuleMap, moduleCodeToOwner } from './modules';
import { buildUnitMap } from './units';
import { buildCalculationEquations } from './calculations';
import { buildComplianceRows, VSME_REQUIRED_FIELD_SYMBOLS } from './requirements';

// ─── Inlined enum parser (mirrors enums.ts) ───────────────────────────────────

type EnumRow = {
  enum_name: string;
  value: string;
  label_en: string;
  order_index: number;
};

function buildEnumLabelMap(parser: XMLParser, file: string): Map<string, string> {
  const labelXml = fs.readFileSync(file, 'utf8');
  const doc = parser.parse(labelXml);
  const labelLink = doc['link:linkbase']?.['link:labelLink'];
  const labelLinkObj = Array.isArray(labelLink) ? labelLink[0] : labelLink;
  const labelNodes: Record<string, unknown>[] = ([] as any[]).concat(
    labelLinkObj?.['link:label'] ?? [],
  );
  const map = new Map<string, string>();
  for (const node of labelNodes) {
    const role = String(node['@_xlink:role'] ?? '');
    if (!role.endsWith('/role/label')) continue;
    const xlinkLabel = String(node['@_xlink:label'] ?? '');
    const locKey = xlinkLabel.replace(/^label_/, '');
    if (!locKey) continue;
    const text = String(node['#text'] ?? '').trim();
    if (text && !map.has(locKey)) map.set(locKey, text);
  }
  return map;
}

function parseEnumValues(taxonomyDir: string): EnumRow[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const xsdRaw = fs.readFileSync(path.join(taxonomyDir, 'vsme-all.xsd'), 'utf8');
  const xsdDoc = parser.parse(xsdRaw);
  const elements: Record<string, string>[] = ([] as any[]).concat(
    xsdDoc['xs:schema']?.['xs:element'] ?? [],
  );

  const LINKROLE_ATTR = '@_enum2:linkrole';
  const TYPE_ATTR = '@_type';
  const linkroleToEnumNames = new Map<string, string[]>();

  for (const el of elements) {
    const type: string = el[TYPE_ATTR] ?? '';
    const linkrole: string = el[LINKROLE_ATTR] ?? '';
    const name: string = el['@_name'] ?? '';
    if (!type.toLowerCase().includes('enumeration') || !linkrole || !name) continue;
    if (!linkroleToEnumNames.has(linkrole)) linkroleToEnumNames.set(linkrole, []);
    linkroleToEnumNames.get(linkrole)!.push(name);
  }

  const labelMap = buildEnumLabelMap(parser, path.join(taxonomyDir, 'vsme-label-en.xml'));

  const defRaw = fs.readFileSync(path.join(taxonomyDir, 'vsme-definition.xml'), 'utf8');
  const defDoc = parser.parse(defRaw);
  const defLinks: Record<string, unknown>[] = ([] as any[]).concat(
    defDoc['link:linkbase']?.['link:definitionLink'] ?? [],
  );

  const rows: EnumRow[] = [];
  const DOMAIN_MEMBER_ARCROLE = 'http://xbrl.org/int/dim/arcrole/domain-member';

  for (const defLink of defLinks) {
    const role: string = (defLink['@_xlink:role'] as string) ?? '';
    const enumNames = linkroleToEnumNames.get(role);
    if (!enumNames || enumNames.length === 0) continue;

    const rawLoc = defLink['link:loc'] ?? [];
    const locs: Record<string, string>[] = (Array.isArray(rawLoc) ? rawLoc : [rawLoc]) as Record<string, string>[];
    const locMap = new Map<string, { conceptName: string; locLabel: string }>();
    for (const loc of locs) {
      const href: string = (loc['@_xlink:href'] as string) ?? '';
      const locLabel: string = (loc['@_xlink:label'] as string) ?? '';
      const fragment = href.includes('#') ? href.split('#')[1] : href;
      const conceptName = fragment.startsWith('vsme_') ? fragment.slice('vsme_'.length) : fragment;
      locMap.set(locLabel, { conceptName, locLabel });
    }

    const arcs: Record<string, unknown>[] = ([] as any[]).concat(defLink['link:definitionArc'] ?? []);
    for (const arc of arcs) {
      const arcrole: string = (arc['@_xlink:arcrole'] as string) ?? '';
      if (arcrole !== DOMAIN_MEMBER_ARCROLE) continue;
      const toLocLabel: string = (arc['@_xlink:to'] as string) ?? '';
      const order: number = parseFloat(String(arc['@_order'] ?? '0'));
      const locEntry = locMap.get(toLocLabel);
      if (!locEntry) continue;
      const label_en = labelMap.get(locEntry.locLabel) ?? '';
      for (const enumName of enumNames) {
        rows.push({ enum_name: enumName, value: locEntry.conceptName, label_en, order_index: Math.round(order) });
      }
    }
  }
  return rows;
}

// ─── External-domain enum parsers ─────────────────────────────────────────────
//
// Three VSME enum fields draw their allowed values from domains that live
// OUTSIDE vsme-definition.xml, so the inlined parseEnumValues() above cannot
// see them and they ended up with empty enum_values:
//
//   • NaceSectorClassificationCodes
//       enum2:domain   = nace:NACE_AllEconomicActivitiesNAMember
//       enum2:linkrole = https://xbrl.efrag.org/taxonomy/nace/2026-02-01/roles/domain
//       → enumerated in the sibling NACE linkbase (../../nace/2026-02-01/).
//
//   • CountryOfSite  and
//   • CountryOfPrimaryOperationsAndLocationOfSignificantAssets
//       enum2:domain   = country:CountryDomain
//       enum2:linkrole = http://www.xbrl.org/taxonomy/int/country/roles/domain
//       → the XBRL-International ISO-3166 country taxonomy, which is referenced
//         by REMOTE URL only (https://www.xbrl.org/taxonomy/int/country/current/
//         entry-en.xsd) and is NOT bundled in this package. The authoritative
//         member list ships instead in EFRAG's own digital template
//         (VSME-Digital-Template-latest.xlsx → sheet "Enumeration Lists",
//         columns "Country List" / "CountryAxis"), which is what we read here.

/** Resolve the sibling NACE linkbase dir from the VSME taxonomy dir. */
function naceDirFrom(taxonomyDir: string): string {
  // taxonomyDir = .../taxonomy/vsme/2026-02-01  →  .../taxonomy/nace/2026-02-01
  return path.resolve(taxonomyDir, '..', '..', 'nace', '2026-02-01');
}

/** Resolve the EFRAG digital template path from the VSME taxonomy dir. */
function templatePathFrom(taxonomyDir: string): string {
  // .../01_Referenz/VSME-XBRL-Taxonomy-February-2026/xbrl.efrag.org/taxonomy/vsme/2026-02-01
  // → .../01_Referenz/VSME-Digital-Template-latest.xlsx
  return path.resolve(
    taxonomyDir,
    '..', '..', '..', '..', '..',
    'VSME-Digital-Template-latest.xlsx',
  );
}

/**
 * Parse the complete NACE code domain (sections → divisions → groups → classes)
 * from the NACE linkbase. Returns EnumRow[] for enum_name
 * "NaceSectorClassificationCodes". Synchronous (XML only).
 *
 * Trace: nace-codes-definition.xml, single definitionLink role
 * ".../roles/domain", 1047 domain-member arcs. Member loc href fragments
 * (nace_NACE_<code>) give the value; English text comes from
 * nace-codes-label-en.xml via the opaque loc→labelArc→res chain.
 */
export function parseNaceEnumRows(taxonomyDir: string): EnumRow[] {
  const naceDir = naceDirFrom(taxonomyDir);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

  // 1. definition linkbase → ordered member concept fragments
  const defDoc = parser.parse(
    fs.readFileSync(path.join(naceDir, 'nace-codes-definition.xml'), 'utf8'),
  );
  const defLinks: Record<string, unknown>[] = ([] as any[]).concat(
    defDoc['link:linkbase']?.['link:definitionLink'] ?? [],
  );
  const DOMAIN_ROLE = 'https://xbrl.efrag.org/taxonomy/nace/2026-02-01/roles/domain';
  const DM_ARCROLE = 'http://xbrl.org/int/dim/arcrole/domain-member';

  const locToConcept = new Map<string, string>(); // loc xlink:label → "NACE_A"
  const memberLocLabels: string[] = [];           // arc "to" loc labels (members)

  for (const dl of defLinks) {
    if ((dl['@_xlink:role'] as string) !== DOMAIN_ROLE) continue;
    for (const loc of ([] as any[]).concat(dl['link:loc'] ?? [])) {
      const href = String(loc['@_xlink:href'] ?? '');
      const label = String(loc['@_xlink:label'] ?? '');
      const frag = href.includes('#') ? href.split('#')[1] : href;
      const concept = frag.startsWith('nace_') ? frag.slice('nace_'.length) : frag;
      locToConcept.set(label, concept);
    }
    for (const arc of ([] as any[]).concat(dl['link:definitionArc'] ?? [])) {
      if ((arc['@_xlink:arcrole'] as string) !== DM_ARCROLE) continue;
      memberLocLabels.push(String(arc['@_xlink:to'] ?? ''));
    }
  }

  // 2. label linkbase → concept → English text (opaque loc/res bridging)
  const labDoc = parser.parse(
    fs.readFileSync(path.join(naceDir, 'nace-codes-label-en.xml'), 'utf8'),
  );
  const labLink = labDoc['link:linkbase']?.['link:labelLink'];
  const labObj = Array.isArray(labLink) ? labLink[0] : labLink;

  const conceptToLabelLoc = new Map<string, string>();
  for (const loc of ([] as any[]).concat(labObj?.['link:loc'] ?? [])) {
    const href = String(loc['@_xlink:href'] ?? '');
    const label = String(loc['@_xlink:label'] ?? '');
    const frag = href.includes('#') ? href.split('#')[1] : href;
    const concept = frag.startsWith('nace_') ? frag.slice('nace_'.length) : frag;
    conceptToLabelLoc.set(concept, label);
  }
  const locToRes = new Map<string, string>();
  for (const arc of ([] as any[]).concat(labObj?.['link:labelArc'] ?? [])) {
    locToRes.set(String(arc['@_xlink:from'] ?? ''), String(arc['@_xlink:to'] ?? ''));
  }
  const resToText = new Map<string, string>();
  for (const lab of ([] as any[]).concat(labObj?.['link:label'] ?? [])) {
    if (!String(lab['@_xlink:role'] ?? '').endsWith('/role/label')) continue;
    resToText.set(String(lab['@_xlink:label'] ?? ''), String(lab['#text'] ?? '').trim());
  }
  const labelFor = (concept: string): string => {
    const loc = conceptToLabelLoc.get(concept);
    const res = loc ? locToRes.get(loc) : undefined;
    return (res ? resToText.get(res) : '') ?? '';
  };

  // 3. one row per distinct member, deterministic order by NACE code
  type Tmp = { value: string; code: string; label_en: string };
  const tmp: Tmp[] = [];
  const seen = new Set<string>();
  for (const locLabel of memberLocLabels) {
    const concept = locToConcept.get(locLabel); // "NACE_A011"
    if (!concept || seen.has(concept)) continue;
    seen.add(concept);
    tmp.push({ value: concept, code: concept.replace(/^NACE_/, ''), label_en: labelFor(concept) });
  }
  tmp.sort((a, b) => a.code.localeCompare(b.code, 'en'));

  return tmp.map((t, i) => ({
    enum_name: 'NaceSectorClassificationCodes',
    value: t.value,
    label_en: t.label_en,
    order_index: i + 1,
  }));
}

/**
 * Parse the ISO-3166 country domain from EFRAG's digital template
 * (sheet "Enumeration Lists": col "Country List" = English name,
 * col "CountryAxis" = "country:<ISO>"). Returns the same member set for BOTH
 * country-typed enum fields. Async (ExcelJS reads the .xlsx).
 *
 * value = ISO alpha-2 code (the local-name of the country:XX domain member).
 */
export async function parseCountryEnumRows(taxonomyDir: string): Promise<EnumRow[]> {
  const templatePath = templatePathFrom(taxonomyDir);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet('Enumeration Lists');
  if (!ws) {
    console.warn(
      `[build-workbook] WARNING: "Enumeration Lists" sheet not found in ${templatePath} — ` +
        'country enum_values will be empty.',
    );
    return [];
  }

  const cellStr = (cell: ExcelJS.Cell): string => {
    const v = cell.value as unknown;
    if (v == null) return '';
    if (typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (Array.isArray(o.richText)) {
        return (o.richText as { text: string }[]).map((t) => t.text).join('');
      }
      if ('result' in o) return String(o.result);
      if ('text' in o) return String(o.text);
      return '';
    }
    return String(v);
  };

  const enumNames = ['CountryOfSite', 'CountryOfPrimaryOperationsAndLocationOfSignificantAssets'];
  const rows: EnumRow[] = [];
  let order = 0;
  for (let r = 2; r <= ws.rowCount; r++) {
    const name = cellStr(ws.getRow(r).getCell(3));  // "Country List"
    const qname = cellStr(ws.getRow(r).getCell(4)); // "CountryAxis" → country:XX
    if (!qname.startsWith('country:')) continue;
    const iso = qname.slice('country:'.length);     // ISO alpha-2 = member local-name
    order += 1;
    for (const enumName of enumNames) {
      rows.push({ enum_name: enumName, value: iso, label_en: name, order_index: order });
    }
  }
  return rows;
}

// ─── Row shape types ──────────────────────────────────────────────────────────

export type StandardsRow = {
  /** Convenience alias for test assertions and Task 7 consumers. */
  code: string;
  standard_code: string;
  title_de: string;
  title_en: string;
  issuer: string;
  edition: string;
  domain: string;
  status: string;
  notes: string;
};

export type WorksheetsRow = {
  worksheet_code: string;
  standard_code: string;
  title_de: string;
  title_en: string;
  phase: number;
  archetype: string;
  section_refs: string;
  equation_refs: string;
  order_index: number;
  description: string;
  verification_status: string;
};

export type SectionsRow = {
  worksheet_code: string;
  section_code: string;
  parent_section_code: string;
  title: string;
  order_index: number;
  purpose: string;
  verification_status: string;
};

export type FieldsRow = {
  symbol: string;
  label_de: string;
  label_en: string;
  unit: string;
  data_type: string;
  kind: string;
  origin_worksheet: string;
  origin_section: string;
  consumer_worksheets: string;
  equation_refs: string;
  required: string;
  validation_rules: string;
  regulation_reference: string;
  description: string;
  verification_status: string;
  notes: string;
  owner: string;
  xbrl_element_id: string;
};

export type EnumValuesRow = {
  enum_name: string;
  value: string;
  label_de: string;
  label_en: string;
  order_index: number;
  regulation_reference: string;
  notes: string;
};

export type EquationsRow = {
  equation_number: string;
  standard_code: string;
  description_de: string;
  description_en: string;
  formula: string;
  input_symbols: string;
  output_symbol: string;
  regulation_reference: string;
  used_in_worksheet: string;
  verification_status: string;
  notes: string;
};

export type ComplianceRow = {
  requirement_code: string;
  standard_code: string;
  /** Host worksheet, derived from where ALL gated field symbols live — never
   *  the `module` tag (see requirements.ts WORKSHEET-LOCALITY header). `null`
   *  for the rare cross-worksheet gate (STOP+REPORT case; falls back to
   *  legacy phase hosting). */
  worksheet_code: string | null;
  title: string;
  description: string;
  evaluation_type: string;
  required_field_symbols: string;
  evaluation_expression: string;
  pass_condition: string;
  regulation_reference: string;
  phase: number;
  order_index: number;
  verification_status: string;
  severity: string;
};

export type VsmeRows = {
  standards: StandardsRow[];
  worksheets: WorksheetsRow[];
  sections: SectionsRow[];
  fields: FieldsRow[];
  enum_values: EnumValuesRow[];
  equations: EquationsRow[];
  compliance_requirements: ComplianceRow[];
};

// ─── Core builder ─────────────────────────────────────────────────────────────

/**
 * Build all 7 row arrays from the VSME XBRL taxonomy.
 * Pure function returning plain JS objects — useful for assertions without
 * touching the filesystem beyond reading the taxonomy XML files.
 *
 * @param taxonomyDir  path to .../taxonomy/vsme/2026-02-01
 * @param externalEnumRows  extra enum_values rows for domains that live outside
 *   vsme-definition.xml and need async parsing (the ISO-3166 country domain,
 *   read from the EFRAG digital template by buildVsmeWorkbook). The NACE domain
 *   is parsed synchronously here from the sibling linkbase. Defaults to [] so
 *   synchronous unit tests still produce NACE without a template read.
 */
export function buildVsmeRows(
  taxonomyDir: string,
  externalEnumRows: EnumRow[] = [],
): VsmeRows {
  // ── 1. Parse taxonomy sources ─────────────────────────────────────────────
  const concepts = parseConcepts(taxonomyDir);
  // Source-traced unit per numeric concept (taxonomy measurementGuidance UTR
  // tokens, falling back to itemType measure-category defaults). See units.ts.
  const unitMap = buildUnitMap(concepts, taxonomyDir);
  const roles = parseRoles(taxonomyDir);
  const moduleMap = conceptModuleMap(taxonomyDir);
  // VSME-definition enums + the full NACE domain (sync) + any externally-parsed
  // rows (country domain, passed in by the async workbook builder).
  const enumRows = [
    ...parseEnumValues(taxonomyDir),
    ...parseNaceEnumRows(taxonomyDir),
    ...externalEnumRows,
  ];

  // ── 2. Standards ──────────────────────────────────────────────────────────
  const standards: StandardsRow[] = [
    {
      code: 'VSME',
      standard_code: 'VSME',
      title_de: 'VSME – Freiwilliger Standard für KMU',
      title_en: 'VSME – Voluntary SME Standard',
      issuer: 'EFRAG',
      edition: '2026-02-01',
      domain: 'sustainability',
      status: 'active',
      notes: 'Auto-generated from XBRL taxonomy',
    },
  ];

  // ── 3. Worksheets ─────────────────────────────────────────────────────────
  // Keep only module roles that own ≥1 concrete (non-abstract) concept. moduleMap
  // now holds FULL role codes (e.g. "B03.200"), so a role survives iff a concept
  // is presented under that exact role (after the Basic-over-Comprehensive
  // tie-break in conceptModuleMap). Roles that only RE-present datapoints owned
  // elsewhere (e.g. [C03.100] GHG Reduction Targets, which re-shows the B03.200
  // GHG set under a target/baseline axis but owns no scalar of its own) drop out
  // here instead of rendering a permanently-empty tab.
  const moduleCodesWithConcepts = new Set(moduleMap.values());

  const rolesWithFields = roles.filter((r) =>
    moduleCodesWithConcepts.has(r.code),
  );

  rolesWithFields.sort((a, b) => a.code.localeCompare(b.code));

  // Candidate worksheets (one per role that owns ≥1 mapped concept, scalar OR
  // structural). Empty ones — roles that only carry abstract/dimensional members
  // and own no actual scalar datapoint — are suppressed AFTER field assignment
  // (see "Suppress empty worksheets" below). Order index is assigned then.
  const candidateWorksheets: WorksheetsRow[] = rolesWithFields.map((r) => ({
    worksheet_code: `VSME-${r.code}`,
    standard_code: 'VSME',
    title_de: r.title,
    title_en: r.title,
    phase: 1,
    archetype: r.code === 'B01.000' ? 'registration' : 'data_collection',
    section_refs: '',
    equation_refs: '',
    order_index: 0,
    description: '',
    verification_status: 'imported_unverified',
  }));

  // Build fullModuleCode → worksheet_code lookup. moduleMap values are full role
  // codes (e.g. "B03.200"), so this is a 1:1 mapping onto the candidate worksheets.
  const codeToWorksheetCode = new Map<string, string>();
  for (const ws of candidateWorksheets) {
    // "VSME-B03.200" → "B03.200"
    const code = ws.worksheet_code.replace('VSME-', '');
    codeToWorksheetCode.set(code, ws.worksheet_code);
  }

  // ── 5. Fields ─────────────────────────────────────────────────────────────
  let droppedCount = 0;
  const fields: FieldsRow[] = [];

  for (const concept of concepts) {
    // Skip abstract grouping concepts.
    if (concept.abstract) continue;

    // Skip structural taxonomy items (domain/hypercube/dimension types).
    const localType = (concept.xbrlType || '').split(':').pop()?.toLowerCase() ?? '';
    if (
      localType.includes('domain') ||
      localType.includes('hypercube') ||
      localType.includes('dimension')
    ) {
      droppedCount++;
      continue;
    }

    // Must have a module mapping from the presentation linkbase.
    const moduleCode = moduleMap.get(concept.name);
    if (!moduleCode) {
      droppedCount++;
      continue;
    }

    const worksheetCode = codeToWorksheetCode.get(moduleCode);
    if (!worksheetCode) {
      droppedCount++;
      continue;
    }

    const owner = moduleCodeToOwner(moduleCode);
    const sectionCode = `${worksheetCode}-A`;

    fields.push({
      symbol: concept.name,
      label_de: concept.labelEn ?? concept.name,
      label_en: concept.labelEn ?? concept.name,
      // Numeric fields carry their source-traced display unit; everything else
      // (text/enum/boolean/date) stays unitless.
      unit: unitMap.get(concept.name) ?? '',
      data_type: concept.dataType,
      kind: '',
      origin_worksheet: worksheetCode,
      origin_section: sectionCode,
      consumer_worksheets: '',
      equation_refs: '',
      // Obligation level is NOT in the XBRL taxonomy. is_required marks the
      // datapoints the VSME Standard makes UNCONDITIONALLY mandatory (Basic
      // Module, "shall disclose …" with no applicability qualifier). The exact,
      // clause-cited member set lives in requirements.ts → parseRequired() in
      // _pass3c-db.ts maps 'yes' → fields.is_required = true.
      required: VSME_REQUIRED_FIELD_SYMBOLS.has(concept.name) ? 'yes' : 'no',
      validation_rules: '',
      regulation_reference: '',
      description: '',
      verification_status: 'imported_unverified',
      notes: '',
      owner,
      xbrl_element_id: concept.id || `vsme_${concept.name}`,
    });
  }

  // Task 5 (B03.300 GHG-intensity equations, VSME para 31): the 4 dividend
  // totals (B03.200) + Turnover (B01.000) are cross-worksheet inputs to the
  // hand-authored equations built in section 7b below. Declare VSME-B03.300
  // as a consumer so cross-worksheet inheritance (src/lib/db/queries/
  // worksheet.ts loadInheritedFields, `ANY(fields.consumer_worksheets)`) can
  // find them from that worksheet. See the KNOWN LIMIT note at 7b: whether
  // this resolves at RUNTIME also depends on the separate, open engine-output
  // materialization workstream — the declaration here is correct regardless.
  const B03_300_INTENSITY_INPUT_SYMBOLS = new Set<string>([
    'TotalGrossLocationBasedScope1AndScope2GHGEmissions',
    'TotalGrossMarketBasedScope1AndScope2GHGEmissions',
    'TotalGrossLocationBasedGHGEmissions',
    'TotalGrossMarketBasedGHGEmissions',
    'Turnover',
  ]);
  for (const f of fields) {
    if (!B03_300_INTENSITY_INPUT_SYMBOLS.has(f.symbol)) continue;
    const existing = (f.consumer_worksheets ?? '')
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!existing.includes('VSME-B03.300')) existing.push('VSME-B03.300');
    f.consumer_worksheets = existing.join(', ');
  }

  console.log(
    `[build-workbook] fields: ${fields.length} emitted, ${droppedCount} dropped (abstract / structural / unmapped)`,
  );

  // ── 3b/4. Suppress empty worksheets, then finalise worksheets + sections ───
  // A candidate worksheet is kept iff it owns ≥1 emitted scalar field. Roles that
  // only RE-PRESENT datapoints owned elsewhere (e.g. [C03.100] GHG Emission
  // Reduction Targets, which re-shows the B03.200 GHG set under a target/baseline
  // axis but contributes no scalar of its own) carry only abstract/dimensional
  // members → 0 fields → dropped here, so the picker never renders an empty tab.
  // This is safe because every downstream reference (equations.used_in_worksheet,
  // compliance, sections) is keyed off fields, and a 0-field worksheet is
  // referenced by none of them.
  const worksheetsWithFields = new Set(fields.map((f) => f.origin_worksheet));
  const suppressed = candidateWorksheets
    .filter((w) => !worksheetsWithFields.has(w.worksheet_code))
    .map((w) => w.worksheet_code);

  const worksheets: WorksheetsRow[] = candidateWorksheets
    .filter((w) => worksheetsWithFields.has(w.worksheet_code))
    .map((w, idx) => ({ ...w, order_index: idx + 1 }));

  if (suppressed.length > 0) {
    console.log(
      `[build-workbook] worksheets: ${worksheets.length} emitted, ` +
        `${suppressed.length} suppressed as empty (re-presentation-only roles): ${suppressed.join(', ')}`,
    );
  }

  // One section per (non-empty) worksheet.
  const sections: SectionsRow[] = worksheets.map((ws, idx) => ({
    worksheet_code: ws.worksheet_code,
    section_code: `${ws.worksheet_code}-A`,
    parent_section_code: '',
    title: ws.title_de,
    order_index: idx + 1,
    purpose: '',
    verification_status: 'imported_unverified',
  }));

  // ── 6. Enum_Values ────────────────────────────────────────────────────────
  const enum_values: EnumValuesRow[] = enumRows.map((r) => ({
    enum_name: r.enum_name,
    value: r.value,
    label_de: r.label_en, // German labels to be filled in verify pass
    label_en: r.label_en,
    order_index: r.order_index,
    regulation_reference: '',
    notes: '',
  }));

  // ── 7. Equations — summation totals from the XBRL calculation linkbase ──────
  // Each calculationLink summation parent (Total = Σ weighted children) becomes
  // one equation. Only relationships whose parent AND every child is an encoded
  // scalar field are emitted; anything referencing a non-encoded concept is
  // reported via buildCalculationEquations().skipped (see build-workbook test /
  // the Task-5 diagnostic). output_unit is carried on the parent field already,
  // so the Equations sheet stores formula/input/output only (matching the
  // EquationRow contract the importer parses).
  const fieldUnitMap = new Map(fields.map((f) => [f.symbol, f.unit]));
  const fieldWorksheetMap = new Map(fields.map((f) => [f.symbol, f.origin_worksheet]));
  const calc = buildCalculationEquations(taxonomyDir, fieldUnitMap, fieldWorksheetMap);

  const equations: EquationsRow[] = calc.equations.map((e) => ({
    equation_number: e.equation_number,
    standard_code: e.standard_code,
    description_de: e.description_de,
    description_en: e.description_en,
    formula: e.formula,
    input_symbols: e.input_symbols,
    output_symbol: e.output_symbol,
    regulation_reference: e.regulation_reference,
    used_in_worksheet: e.used_in_worksheet,
    verification_status: e.verification_status,
    notes: e.notes,
  }));

  console.log(
    `[build-workbook] equations: ${equations.length} emitted from calculation linkbase, ` +
      `${calc.skipped.length} calc relationship(s) skipped`,
  );
  for (const s of calc.skipped) {
    console.log(
      `[build-workbook]   SKIP ${s.relationship.parent} (${s.relationship.roleShort}): ${s.reason}` +
        (s.missingConcepts.length ? ` [missing: ${s.missingConcepts.join(', ')}]` : ''),
    );
  }

  // ── 7b. Hand-authored equations — B03.300 GHG intensity (VSME para 31) ────
  // NOT in the calculation linkbase (para 31's division-by-turnover isn't a
  // summation-item relationship, so buildCalculationEquations() can't see
  // it). Verbatim source (rendered PDF, printed p.9): "31. The undertaking
  // shall disclose its GHG intensity calculated by dividing 'gross greenhouse
  // gas (GHG) emissions' disclosed under paragraph 30 by 'turnover (in Euro)'
  // disclosed under paragraph 24(e)(iv)." Four dividends — the B3 ¶30 GHG
  // totals on VSME-B03.200 — each divided by the single B1 ¶24(e)(iv)
  // Turnover field on VSME-B01.000; all four outputs live on VSME-B03.300
  // (unit tCO2eq/EUR, confirmed no equations before this task). Appended
  // AFTER the linkbase-derived rows so equation_number continues the same
  // VSME-EQ-NN sequence (never touches calculations.ts / the linkbase rows
  // above). Cross-worksheet inputs: consumer_worksheets was already
  // declared for these 5 fields above (section 5); if runtime resolution on
  // B03.300 still needs the open engine-output materialization workstream,
  // that gap is NOT fixed here (see project_engine_output_materialization) —
  // these equations are correct data regardless of that gap.
  const INTENSITY_EQUATIONS: Array<{ output_symbol: string; dividend: string }> = [
    {
      output_symbol: 'Scope1AndScope2GreenhouseGasEmissionsIntensityValueLocationBased',
      dividend: 'TotalGrossLocationBasedScope1AndScope2GHGEmissions',
    },
    {
      output_symbol: 'Scope1AndScope2GreenhouseGasEmissionsIntensityValueMarketBased',
      dividend: 'TotalGrossMarketBasedScope1AndScope2GHGEmissions',
    },
    {
      output_symbol: 'TotalLocationBasedGreenhouseGasEmissionsIntensityValue',
      dividend: 'TotalGrossLocationBasedGHGEmissions',
    },
    {
      output_symbol: 'TotalMarketBasedGreenhouseGasEmissionsIntensityValue',
      dividend: 'TotalGrossMarketBasedGHGEmissions',
    },
  ];
  let intensityN = equations.length; // continue the VSME-EQ-NN sequence
  for (const { output_symbol, dividend } of INTENSITY_EQUATIONS) {
    intensityN++;
    equations.push({
      equation_number: `VSME-EQ-${String(intensityN).padStart(2, '0')}`,
      standard_code: 'VSME',
      description_de: `${output_symbol} = ${dividend} / Turnover (THG-Intensität, VSME §31)`,
      description_en: `${output_symbol} = ${dividend} / Turnover (GHG intensity, VSME para 31)`,
      formula: `${output_symbol} = ${dividend} / Turnover`,
      input_symbols: `${dividend}, Turnover`,
      output_symbol,
      regulation_reference: 'VSME B3 para 31',
      used_in_worksheet: 'VSME-B03.300',
      verification_status: 'imported_unverified',
      notes:
        'Hand-authored (not in the XBRL calculation linkbase — para 31 is a division, not a ' +
        'summation-item relationship). Dividend lives on VSME-B03.200, Turnover on VSME-B01.000; ' +
        'both declare VSME-B03.300 as a consumer_worksheets entry (Task 5, feat/vsme-gate-repair).',
    });
  }
  console.log(
    `[build-workbook] equations: +${INTENSITY_EQUATIONS.length} hand-authored B03.300 GHG-intensity ` +
      `rows (VSME para 31) appended, ${equations.length} total`,
  );

  // ── 8. Compliance_Requirements — curated, source-cited rule set ────────────
  // Obligation level (mandatory / conditional / voluntary) is NOT in the XBRL
  // taxonomy, so it is hand-encoded in requirements.ts, each row tied to the
  // exact VSME Standard clause. Rows are kept only when every field symbol they
  // reference actually exists in the emitted Fields sheet (stable on concept
  // NAMES, not labels), so a renamed concept drops its gate instead of seeding
  // a dangling one. See requirements.ts header for severity/gate mechanics.
  const fieldWorksheetBySymbol = new Map(fields.map((f) => [f.symbol, f.origin_worksheet]));
  const compliance_requirements: ComplianceRow[] = buildComplianceRows(fieldWorksheetBySymbol);

  const crBlock = compliance_requirements.filter((c) => c.severity === 'block').length;
  const crWarn = compliance_requirements.filter((c) => c.severity === 'warn').length;
  console.log(
    `[build-workbook] compliance_requirements: ${compliance_requirements.length} emitted ` +
      `(${crBlock} block, ${crWarn} warn)`,
  );

  if (compliance_requirements.length === 0) {
    console.warn(
      '[build-workbook] WARNING: 0 compliance requirements emitted — every curated rule was ' +
        'dropped because its field symbols are absent. Check requirements.ts against the taxonomy.',
    );
  }

  return {
    standards,
    worksheets,
    sections,
    fields,
    enum_values,
    equations,
    compliance_requirements,
  };
}

// ─── Workbook builder ─────────────────────────────────────────────────────────

/**
 * Builds a 7-sheet Pass3c .xlsx buffer from the VSME taxonomy.
 * Uses ExcelJS (same library as _pass3c-parsers.ts) so the output can be
 * round-tripped through parseWorkbook / parseWorkbookSync.
 */
export async function buildVsmeWorkbook(taxonomyDir: string): Promise<Buffer> {
  // Country domain ships in EFRAG's template, not the XBRL package → parse async
  // and feed it into buildVsmeRows alongside the (sync) NACE + VSME-definition enums.
  const countryEnumRows = await parseCountryEnumRows(taxonomyDir);
  const rows = buildVsmeRows(taxonomyDir, countryEnumRows);
  const wb = new ExcelJS.Workbook();

  function addSheet<T extends Record<string, unknown>>(name: string, data: T[]): void {
    const ws = wb.addWorksheet(name);

    if (data.length === 0) {
      // Emit a header-only sheet so the parser sentinel scan still finds a valid header row.
      const placeholderHeaders: Record<string, string[]> = {
        Equations: [
          'equation_number', 'formula', 'standard_code', 'description_de',
          'description_en', 'input_symbols', 'output_symbol',
          'regulation_reference', 'used_in_worksheet', 'verification_status', 'notes',
        ],
        Compliance_Requirements: [
          'requirement_code', 'evaluation_expression', 'standard_code', 'worksheet_code',
          'title', 'description', 'evaluation_type', 'required_field_symbols',
          'pass_condition', 'regulation_reference', 'phase', 'order_index',
          'verification_status', 'severity',
        ],
      };
      ws.addRow(placeholderHeaders[name] ?? []);
      return;
    }

    const headers = Object.keys(data[0]);
    ws.addRow(headers);
    for (const row of data) {
      ws.addRow(headers.map((h) => (row[h] as unknown) ?? ''));
    }
  }

  addSheet('Standards', rows.standards as unknown as Record<string, unknown>[]);
  addSheet('Worksheets', rows.worksheets as unknown as Record<string, unknown>[]);
  addSheet('Sections', rows.sections as unknown as Record<string, unknown>[]);
  addSheet('Fields', rows.fields as unknown as Record<string, unknown>[]);
  addSheet('Enum_Values', rows.enum_values as unknown as Record<string, unknown>[]);
  addSheet('Equations', rows.equations as unknown as Record<string, unknown>[]);
  addSheet(
    'Compliance_Requirements',
    rows.compliance_requirements as unknown as Record<string, unknown>[],
  );

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
