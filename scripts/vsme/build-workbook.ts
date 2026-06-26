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
 */
export function buildVsmeRows(taxonomyDir: string): VsmeRows {
  // ── 1. Parse taxonomy sources ─────────────────────────────────────────────
  const concepts = parseConcepts(taxonomyDir);
  const roles = parseRoles(taxonomyDir);
  const moduleMap = conceptModuleMap(taxonomyDir);
  const enumRows = parseEnumValues(taxonomyDir);

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
  // Keep only module roles that have ≥1 concrete (non-abstract) concept.
  const moduleCodesWithConcepts = new Set(moduleMap.values());

  // A role code like "B03.000" → prefix "B03"; filter roles whose prefix has mapped concepts.
  const rolesWithFields = roles.filter((r) => {
    const prefix = r.code.slice(0, 3);
    return moduleCodesWithConcepts.has(prefix);
  });

  rolesWithFields.sort((a, b) => a.code.localeCompare(b.code));

  const worksheets: WorksheetsRow[] = rolesWithFields.map((r, idx) => ({
    worksheet_code: `VSME-${r.code}`,
    standard_code: 'VSME',
    title_de: r.title,
    title_en: r.title,
    phase: 1,
    archetype: r.code === 'B01.000' ? 'registration' : 'data_collection',
    section_refs: '',
    equation_refs: '',
    order_index: idx + 1,
    description: '',
    verification_status: 'imported_unverified',
  }));

  // ── 4. Sections — one per worksheet ──────────────────────────────────────
  const sections: SectionsRow[] = worksheets.map((ws, idx) => ({
    worksheet_code: ws.worksheet_code,
    section_code: `${ws.worksheet_code}-A`,
    parent_section_code: '',
    title: ws.title_de,
    order_index: idx + 1,
    purpose: '',
    verification_status: 'imported_unverified',
  }));

  // Build modulePrefix → worksheet_code lookup (first matching role wins).
  const prefixToWorksheetCode = new Map<string, string>();
  for (const ws of worksheets) {
    // "VSME-B03.000" → "B03"
    const prefix = ws.worksheet_code.replace('VSME-', '').slice(0, 3);
    if (!prefixToWorksheetCode.has(prefix)) {
      prefixToWorksheetCode.set(prefix, ws.worksheet_code);
    }
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
    const modulePrefix = moduleMap.get(concept.name);
    if (!modulePrefix) {
      droppedCount++;
      continue;
    }

    const worksheetCode = prefixToWorksheetCode.get(modulePrefix);
    if (!worksheetCode) {
      droppedCount++;
      continue;
    }

    const owner = moduleCodeToOwner(modulePrefix);
    const sectionCode = `${worksheetCode}-A`;

    fields.push({
      symbol: concept.name,
      label_de: concept.labelEn ?? concept.name,
      label_en: concept.labelEn ?? concept.name,
      unit: '',
      data_type: concept.dataType,
      kind: '',
      origin_worksheet: worksheetCode,
      origin_section: sectionCode,
      consumer_worksheets: '',
      equation_refs: '',
      required: 'no',
      validation_rules: '',
      regulation_reference: '',
      description: '',
      verification_status: 'imported_unverified',
      notes: '',
      owner,
      xbrl_element_id: concept.id || `vsme_${concept.name}`,
    });
  }

  console.log(
    `[build-workbook] fields: ${fields.length} emitted, ${droppedCount} dropped (abstract / structural / unmapped)`,
  );

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

  // ── 7. Equations — none in v1 (CO₂ engine is Plan 3) ────────────────────
  const equations: EquationsRow[] = [];

  // ── 8. Compliance_Requirements — ≤5 field_presence CRs for B03 core totals
  // Match on concept NAMES (f.symbol) — not labels — so the patterns are stable
  // across language-specific label changes.
  const b3CoreCandidates = [
    {
      pattern: /GrossScope1GreenhouseGasEmissions/,
      code: 'VSME-CR-B03-01',
      title: 'Scope 1 GHG emissions present',
    },
    {
      pattern: /GrossScope2.*GreenhouseGasEmissions/,
      code: 'VSME-CR-B03-02',
      title: 'Scope 2 GHG emissions present',
    },
    {
      pattern: /TotalEnergyConsumption/,
      code: 'VSME-CR-B03-04',
      title: 'Total energy consumption present',
    },
  ];

  const compliance_requirements: ComplianceRow[] = [];
  let crOrder = 1;

  for (const cand of b3CoreCandidates) {
    const matchedField = fields.find((f) => cand.pattern.test(f.symbol));
    if (matchedField) {
      compliance_requirements.push({
        requirement_code: cand.code,
        standard_code: 'VSME',
        title: cand.title,
        description: `Requires that ${cand.title.toLowerCase()}`,
        evaluation_type: 'field_presence',
        required_field_symbols: matchedField.symbol,
        evaluation_expression: '',
        pass_condition: '',
        regulation_reference: 'VSME B3',
        phase: 1,
        order_index: crOrder++,
        verification_status: 'imported_unverified',
        severity: 'block',
      });
    }
  }

  if (compliance_requirements.length === 0) {
    console.warn(
      '[build-workbook] WARNING: no B03 core-total fields matched — 0 compliance requirements emitted. ' +
        'Check concept names in the taxonomy against the expected patterns.',
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
  const rows = buildVsmeRows(taxonomyDir);
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
          'requirement_code', 'evaluation_expression', 'standard_code',
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
