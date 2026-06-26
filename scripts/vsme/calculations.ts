/**
 * calculations.ts
 *
 * Parses the VSME XBRL **calculation linkbase** (vsme-calculation.xml) and turns
 * each summation relationship into a Pass3c Equations row.
 *
 * Source of truth (equations may ONLY come from here):
 *   .../vsme/2026-02-01/vsme-calculation.xml
 *     <link:calculationLink xlink:role="…role-bXXYYY">
 *       <link:loc   xlink:href="vsme-all.xsd#vsme_<Concept>" xlink:label="…"/>
 *       <link:calculationArc order="N" weight="±1"
 *           xlink:arcrole=".../summation-item"
 *           xlink:from="<parentLocLabel>" xlink:to="<childLocLabel>"/>
 *
 * Semantics (XBRL Calculation 1.1, summation-item arcrole):
 *   parent (the total) = Σ  weight_i · child_i      over all arcs whose `from` = parent
 *   weight +1 → add, weight −1 → subtract.  `order` fixes the term sequence.
 *
 * IMPORTANT: concept local-names come from the `loc` **href fragment**
 * (`vsme_<Concept>` → `<Concept>`), NOT from the `xlink:label`. In this taxonomy
 * the labels carry a typo ("GreenshouseGas") while the href fragments are correct
 * ("GreenhouseGas"); the encoded field symbols match the href fragments.
 *
 * An equation is emitted ONLY when the output (parent) AND every input (child)
 * is an encoded VSME scalar field (the 143-field set). Anything that references
 * a non-encoded concept is collected in `skipped` and reported, never invented.
 *
 * Clause references (regulation_reference) are read from vsme-reference.xml for
 * the output concept; falls back to the calculationLink role URI.
 */

import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';

const SUMMATION_ARCROLE = 'https://xbrl.org/2023/arcrole/summation-item';

/** One contributing child term of a summation parent. */
type CalcChild = { concept: string; order: number; weight: number };

/** A summation relationship: parent (total) = Σ weight·child. */
export type CalcRelationship = {
  role: string; // calculationLink xlink:role URI
  roleShort: string; // e.g. "role-b03200"
  parent: string; // output concept local-name
  children: CalcChild[]; // contributing children, sorted by order
};

/** A relationship we could NOT emit, with the reason. */
export type SkippedRelationship = {
  relationship: CalcRelationship;
  reason: string;
  missingConcepts: string[]; // concepts not in the encoded field set ([] for conflict skips)
};

export type EquationEmit = {
  equation_number: string;
  standard_code: string;
  description_de: string;
  description_en: string;
  formula: string;
  input_symbols: string; // comma-separated
  output_symbol: string;
  output_unit: string;
  regulation_reference: string;
  used_in_worksheet: string;
  verification_status: string;
  notes: string;
};

export type CalculationsResult = {
  relationships: CalcRelationship[]; // every summation relationship in the linkbase
  equations: EquationEmit[]; // emitted (all symbols encoded, deduped)
  skipped: SkippedRelationship[]; // present in taxonomy but not emitted
};

const fragToConcept = (href: string): string => {
  const frag = href.includes('#') ? href.split('#')[1] : href;
  return frag.startsWith('vsme_') ? frag.slice('vsme_'.length) : frag;
};

/** Parse every summation relationship out of vsme-calculation.xml. */
export function parseCalculationRelationships(taxonomyDir: string): CalcRelationship[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const doc = parser.parse(
    fs.readFileSync(path.join(taxonomyDir, 'vsme-calculation.xml'), 'utf8'),
  );
  const calcLinks: Record<string, unknown>[] = ([] as any[]).concat(
    doc['link:linkbase']?.['link:calculationLink'] ?? [],
  );

  const relationships: CalcRelationship[] = [];

  for (const link of calcLinks) {
    const role = String(link['@_xlink:role'] ?? '');
    const roleShort = role.includes('/') ? role.split('/').pop()! : role;

    // locLabel → concept local-name
    const locToConcept = new Map<string, string>();
    for (const loc of ([] as any[]).concat(link['link:loc'] ?? [])) {
      const label = String(loc['@_xlink:label'] ?? '');
      locToConcept.set(label, fragToConcept(String(loc['@_xlink:href'] ?? '')));
    }

    // group arcs by parent (the `from` concept)
    const byParent = new Map<string, CalcChild[]>();
    for (const arc of ([] as any[]).concat(link['link:calculationArc'] ?? [])) {
      if (String(arc['@_xlink:arcrole'] ?? '') !== SUMMATION_ARCROLE) continue;
      const parent = locToConcept.get(String(arc['@_xlink:from'] ?? ''));
      const child = locToConcept.get(String(arc['@_xlink:to'] ?? ''));
      if (!parent || !child) continue;
      const order = parseFloat(String(arc['@_order'] ?? '0'));
      const weight = parseFloat(String(arc['@_weight'] ?? '1'));
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent)!.push({ concept: child, order, weight });
    }

    for (const [parent, children] of byParent) {
      children.sort((a, b) => a.order - b.order);
      relationships.push({ role, roleShort, parent, children });
    }
  }

  return relationships;
}

/** Parse concept → clause reference string from vsme-reference.xml. */
function parseReferenceMap(taxonomyDir: string): Map<string, string> {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const refPath = path.join(taxonomyDir, 'vsme-reference.xml');
  const map = new Map<string, string>();
  if (!fs.existsSync(refPath)) return map;
  const doc = parser.parse(fs.readFileSync(refPath, 'utf8'));
  const refLinks: Record<string, unknown>[] = ([] as any[]).concat(
    doc['link:linkbase']?.['link:referenceLink'] ?? [],
  );

  for (const link of refLinks) {
    // loc: xlink:label (= reference resource group) → concept
    const labelToConcept = new Map<string, string>();
    for (const loc of ([] as any[]).concat(link['link:loc'] ?? [])) {
      labelToConcept.set(
        String(loc['@_xlink:label'] ?? ''),
        fragToConcept(String(loc['@_xlink:href'] ?? '')),
      );
    }
    // referenceArc: from loc-label → to reference-resource label
    const refLabelToLocLabel = new Map<string, string>();
    for (const arc of ([] as any[]).concat(link['link:referenceArc'] ?? [])) {
      refLabelToLocLabel.set(
        String(arc['@_xlink:to'] ?? ''),
        String(arc['@_xlink:from'] ?? ''),
      );
    }
    for (const ref of ([] as any[]).concat(link['link:reference'] ?? [])) {
      const refLabel = String(ref['@_xlink:label'] ?? '');
      const locLabel = refLabelToLocLabel.get(refLabel);
      // some linkbases omit the arc and the loc/reference share a label stem
      const concept =
        (locLabel && labelToConcept.get(locLabel)) ??
        labelToConcept.get(refLabel) ??
        undefined;
      if (!concept || map.has(concept)) continue;
      const number = ref['ref:Number'];
      const para = ref['ref:Paragraph'];
      const sub = ref['ref:Subparagraph'];
      const clause = ref['ref:Clause'];
      if (number == null && para == null) continue;
      let s = 'VSME';
      if (number != null) s += ` ${number}`;
      if (para != null) {
        s += ` ¶${para}`;
        if (sub != null) s += `(${sub})`;
        if (clause != null) s += `(${clause})`;
      }
      map.set(concept, s);
    }
  }
  return map;
}

/**
 * Build Equations rows from the calculation linkbase.
 *
 * @param taxonomyDir   path to .../taxonomy/vsme/2026-02-01
 * @param fieldUnit     symbol → unit for every encoded scalar field (143-set).
 *                      Membership of this map defines "is an encoded field".
 * @param fieldWorksheet symbol → origin worksheet_code for every encoded field.
 */
export function buildCalculationEquations(
  taxonomyDir: string,
  fieldUnit: Map<string, string>,
  fieldWorksheet: Map<string, string>,
): CalculationsResult {
  const relationships = parseCalculationRelationships(taxonomyDir);
  const refMap = parseReferenceMap(taxonomyDir);

  // Set of every parent across the whole linkbase — used to detect "nested"
  // relationships (a relationship whose child set contains another parent).
  const allParents = new Set(relationships.map((r) => r.parent));

  const isEncoded = (c: string): boolean => fieldUnit.has(c);

  const equations: EquationEmit[] = [];
  const skipped: SkippedRelationship[] = [];

  // First filter: every relationship whose parent + all children are encoded fields.
  type Candidate = { rel: CalcRelationship; nested: boolean };
  const encodedCandidates: Candidate[] = [];

  for (const rel of relationships) {
    const missing: string[] = [];
    if (!isEncoded(rel.parent)) missing.push(rel.parent);
    for (const ch of rel.children) if (!isEncoded(ch.concept)) missing.push(ch.concept);
    if (missing.length > 0) {
      skipped.push({
        relationship: rel,
        reason:
          'references non-encoded concept(s) not in the 143-field set',
        missingConcepts: [...new Set(missing)],
      });
      continue;
    }
    const nested = rel.children.some((ch) => allParents.has(ch.concept));
    encodedCandidates.push({ rel, nested });
  }

  // Dedupe across roles by output (parent). Same child set in two roles → keep one.
  // Different child sets → conflict: prefer the nested form (keeps subtotals as their
  // own equations and references them), skip the flat duplicate with a conflict note.
  const childKey = (rel: CalcRelationship): string =>
    rel.children
      .map((c) => `${c.weight >= 0 ? '+' : '-'}${c.concept}`)
      .sort()
      .join('|');

  const byParent = new Map<string, Candidate[]>();
  for (const cand of encodedCandidates) {
    if (!byParent.has(cand.rel.parent)) byParent.set(cand.rel.parent, []);
    byParent.get(cand.rel.parent)!.push(cand);
  }

  const chosen: Candidate[] = [];
  for (const [, cands] of byParent) {
    const distinctKeys = new Set(cands.map((c) => childKey(c.rel)));
    if (distinctKeys.size === 1) {
      // identical relationship across one or more roles → keep first, drop pure dups silently
      chosen.push(cands[0]);
      continue;
    }
    // conflicting child sets across roles → prefer nested, else first by role order
    const preferred =
      cands.find((c) => c.nested) ??
      cands.slice().sort((a, b) => a.rel.roleShort.localeCompare(b.rel.roleShort))[0];
    chosen.push(preferred);
    for (const c of cands) {
      if (c === preferred) continue;
      if (childKey(c.rel) === childKey(preferred.rel)) continue; // exact dup of chosen
      skipped.push({
        relationship: c.rel,
        reason: `conflicting child set for parent "${c.rel.parent}" across roles; ` +
          `kept the ${preferred.nested ? 'nested' : 'first'} form from ${preferred.rel.roleShort}, ` +
          `dropped this flat/alternate form from ${c.rel.roleShort}`,
        missingConcepts: [],
      });
    }
  }

  // Deterministic order: by output worksheet then output symbol.
  chosen.sort((a, b) => {
    const wa = fieldWorksheet.get(a.rel.parent) ?? '';
    const wb = fieldWorksheet.get(b.rel.parent) ?? '';
    return wa.localeCompare(wb) || a.rel.parent.localeCompare(b.rel.parent);
  });

  let n = 1;
  for (const { rel } of chosen) {
    // formula: first term may be bare (or unary-minus); subsequent terms get + / - by weight.
    let formula = '';
    rel.children.forEach((ch, idx) => {
      const sign = ch.weight >= 0 ? '+' : '-';
      if (idx === 0) {
        formula += sign === '-' ? `-${ch.concept}` : ch.concept;
      } else {
        formula += ` ${sign} ${ch.concept}`;
      }
    });
    const inputs = rel.children.map((c) => c.concept);
    const unit = fieldUnit.get(rel.parent) ?? '';
    const ws = fieldWorksheet.get(rel.parent) ?? '';
    const ref = refMap.get(rel.parent) ?? rel.role;

    equations.push({
      equation_number: `VSME-EQ-${String(n).padStart(2, '0')}`,
      standard_code: 'VSME',
      description_de: `${rel.parent} = Summe der Bestandteile (${rel.roleShort})`,
      description_en: `${rel.parent} = sum of its components (XBRL calculation ${rel.roleShort})`,
      formula,
      input_symbols: inputs.join(', '),
      output_symbol: rel.parent,
      output_unit: unit,
      regulation_reference: ref,
      used_in_worksheet: ws,
      verification_status: 'imported_unverified',
      notes: `Derived from XBRL calculation linkbase ${rel.roleShort}; weights ${rel.children
        .map((c) => `${c.concept}:${c.weight >= 0 ? '+1' : '-1'}`)
        .join(', ')}`,
    });
    n++;
  }

  return { relationships, equations, skipped };
}
