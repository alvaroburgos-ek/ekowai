/**
 * units.ts
 *
 * Deterministic, source-traced derivation of the display `unit` for every
 * numeric VSME field, for the Fields sheet built by build-workbook.ts.
 *
 * AUTHORITATIVE SOURCES (units may ONLY come from these):
 *
 *  1. PRIMARY — the taxonomy's own measurementGuidance labels in
 *     `vsme-label-en.xml`. EFRAG attaches, per numeric concept, a label with
 *     role ".../role/measurementGuidance" whose text carries the prescribed
 *     XBRL Unit Type Registry (UTR) token(s), e.g. "[utr:MWh]", "[utr:tCO2e]",
 *     "[utr:m3]", "[utr:kg,utr:t]", "[utr:ha,utr:sqkm]". These are resolved to
 *     the concept through the standard loc → labelArc → resource chain (NOT by
 *     name matching — the label keys contain EFRAG typos such as
 *     "GreenshouseGas" / "VolumneOfMaterialUsed"). See parseUnitGuidance().
 *
 *  2. itemType DEFAULT — for the ~36 numeric concepts that carry no
 *     measurementGuidance, the unit is derived from the XBRL itemType (the
 *     measure category) read from `vsme-all.xsd`, using the display unit the
 *     VSME Standard PDF prescribes for that category:
 *       energyItemType              → MWh    (B3 §22: "total energy consumption in MWh")
 *       ghgEmissionsItemType        → tCO2eq (B3 §29: "tons of CO2 equivalent (tCO2eq)")
 *       ghgEmissionsPerMonetaryItem → tCO2eq/EUR (intensity = GHG ÷ turnover; denominator
 *                                                 is an iso4217 report currency, "for example EUR")
 *       volumeItemType              → m³     (B6/B7: "m3")
 *       massItemType                → t      (B7: "metric tonnes")
 *       areaItemType                → ha     (B5 §33: "in hectares")
 *       percentItemType             → %
 *       monetaryItemType            → EUR    (report currency; iso4217 — VSME does not fix EUR,
 *                                             EUR is the placeholder/default reporting currency)
 *       decimalItemType / integer   → ''     (dimensionless: counts, ratios, rates) unless the
 *                                             label clearly denotes a measured quantity (training
 *                                             hours → "hours").
 *
 * UTR token → display unit:
 *   MWh→MWh, tCO2e→tCO2eq, m3→m³, kg→kg, t→t, ha→ha, sqkm→ha-context (we keep ha),
 * Where guidance allows BOTH a small and a large unit ([utr:kg,utr:t] →
 * tonnes; [utr:ha,utr:sqkm] → hectares) we pick the unit the VSME Standard PDF
 * prescribes as the reporting unit (tonnes / hectares), NOT the alternate.
 *
 * Everything here is data-driven (a token table + an itemType table + the
 * parsed guidance) — no per-symbol magic constants beyond the documented
 * label-quantity overrides.
 */

import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';

// ── UTR token → canonical display unit ────────────────────────────────────────
// The taxonomy emits XBRL Unit Type Registry ids; map each to the VSME display
// string. When several are allowed, the *reporting* unit is chosen at the
// guidance level (see pickFromGuidance), so this table is 1:1.
const UTR_DISPLAY: Record<string, string> = {
  MWh: 'MWh',
  tCO2e: 'tCO2eq', // VSME Standard prints "tCO2eq" (= tonnes CO2 equivalent)
  m3: 'm³',
  kg: 'kg',
  t: 't',
  ha: 'ha',
  sqkm: 'ha', // never reached: ha is preferred over sqkm in pickFromGuidance
};

// ── itemType (measure category) → default display unit ────────────────────────
// Used only for numeric concepts that carry NO measurementGuidance.
// '' means genuinely dimensionless (resolved below; decimal handled specially).
const ITEMTYPE_DEFAULT: Record<string, string> = {
  energy: 'MWh',
  ghgEmissions: 'tCO2eq',
  ghgEmissionsPerMonetary: 'tCO2eq/EUR',
  volume: 'm³',
  mass: 't',
  area: 'ha',
  percent: '%',
  monetary: 'EUR',
  decimal: '', // counts / ratios / rates → dimensionless (unless label says otherwise)
  integer: '',
  pure: '',
  power: 'kW',
};

/**
 * Documented label-quantity overrides: numeric concepts whose itemType is the
 * dimensionless `decimal` but whose LABEL denotes a measured physical quantity
 * with a unit. The only such case in VSME 2026-02-01 is annual training hours,
 * which the Standard (§B8/B9) expresses as a number of hours.
 *
 * Keyed by a stable substring of the concept name. unit '' would mean "leave
 * dimensionless"; we set 'hours'.
 */
const LABEL_QUANTITY_OVERRIDES: { test: RegExp; unit: string }[] = [
  { test: /AverageNumberOfAnnualTrainingHoursPer/, unit: 'hours' },
];

/** Numeric itemType local-names (matches the set build-workbook treats as fields). */
const NUMERIC_ITEMTYPES = new Set([
  'decimal', 'monetary', 'volume', 'mass', 'ghgEmissions', 'area',
  'ghgEmissionsPerMonetary', 'energy', 'percent', 'integer', 'power', 'pure',
]);

/**
 * Parse `vsme-label-en.xml` and return Map<conceptName, UTR-token-list-string>.
 * Resolves measurementGuidance resources to their concept via the
 * loc → labelArc → resource chain (xlink), NOT by label key (EFRAG label keys
 * contain typos and "_2"/"_5" disambiguators).
 */
export function parseUnitGuidance(taxonomyDir: string): Map<string, string> {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const doc = parser.parse(
    fs.readFileSync(path.join(taxonomyDir, 'vsme-label-en.xml'), 'utf8'),
  );
  const link = doc['link:linkbase']?.['link:labelLink'];
  const linkObj = Array.isArray(link) ? link[0] : link;

  // loc: xlink:label → concept name (from href fragment, strip "vsme_")
  const locToConcept = new Map<string, string>();
  for (const loc of ([] as any[]).concat(linkObj?.['link:loc'] ?? [])) {
    const href = String(loc['@_xlink:href'] ?? '');
    const label = String(loc['@_xlink:label'] ?? '');
    const frag = href.includes('#') ? href.split('#')[1] : href;
    const concept = frag.startsWith('vsme_') ? frag.slice('vsme_'.length) : frag;
    locToConcept.set(label, concept);
  }

  // labelArc: from (loc label) → to (resource label)
  const arcFromTo: [string, string][] = [];
  for (const arc of ([] as any[]).concat(linkObj?.['link:labelArc'] ?? [])) {
    arcFromTo.push([String(arc['@_xlink:from'] ?? ''), String(arc['@_xlink:to'] ?? '')]);
  }

  // measurementGuidance resources: resource label → text
  const resText = new Map<string, string>();
  for (const lb of ([] as any[]).concat(linkObj?.['link:label'] ?? [])) {
    const role = String(lb['@_xlink:role'] ?? '');
    if (!role.endsWith('measurementGuidance')) continue;
    resText.set(String(lb['@_xlink:label'] ?? ''), String(lb['#text'] ?? '').trim());
  }

  const out = new Map<string, string>();
  for (const [from, to] of arcFromTo) {
    if (!resText.has(to)) continue;
    const concept = locToConcept.get(from);
    if (!concept) continue;
    if (!out.has(concept)) out.set(concept, resText.get(to)!);
  }
  return out;
}

/**
 * From a measurementGuidance text, pick the single VSME reporting unit.
 * Extracts utr:* tokens; when several are allowed, prefers the larger
 * reporting unit the VSME Standard prescribes (tonnes over kg, hectares over
 * sqkm). For intensity guidance ("numerator tCO2e … denominator iso4217
 * currency"), returns the composite "tCO2eq/EUR".
 */
export function pickFromGuidance(text: string): string {
  const tokens = Array.from(text.matchAll(/utr:([A-Za-z0-9]+)/g)).map((m) => m[1]);
  const hasISO = /iso4217/i.test(text);

  // GHG intensity: tCO2e numerator / iso4217 currency denominator.
  if (tokens.includes('tCO2e') && hasISO) return 'tCO2eq/EUR';

  if (tokens.length === 0) return '';

  // Preference order when multiple allowed: reporting unit per VSME Standard.
  const has = (u: string) => tokens.includes(u);
  if (has('t')) return UTR_DISPLAY['t'];          // [kg,t] → tonnes
  if (has('ha')) return UTR_DISPLAY['ha'];        // [ha,sqkm] → hectares
  if (has('MWh')) return UTR_DISPLAY['MWh'];
  if (has('tCO2e')) return UTR_DISPLAY['tCO2e'];
  if (has('m3')) return UTR_DISPLAY['m3'];
  if (has('kg')) return UTR_DISPLAY['kg'];        // waste-mass concepts: kg-only
  // Fallback: first token mapped, else raw.
  return UTR_DISPLAY[tokens[0]] ?? tokens[0];
}

/**
 * Build Map<conceptName, unit> for every numeric VSME concept.
 *
 * @param concepts  list of { name, xbrlType } (from parseConcepts)
 * @param taxonomyDir  taxonomy root (to read measurementGuidance)
 */
export function buildUnitMap(
  concepts: { name: string; xbrlType: string }[],
  taxonomyDir: string,
): Map<string, string> {
  const guidance = parseUnitGuidance(taxonomyDir);
  const units = new Map<string, string>();

  for (const c of concepts) {
    const local = (c.xbrlType || '').split(':').pop()?.replace('ItemType', '') ?? '';
    if (!NUMERIC_ITEMTYPES.has(local)) continue; // only numeric fields get a unit slot

    // 1. PRIMARY: measurementGuidance UTR token(s).
    // (If the guidance text carries no recognised utr:* token — e.g. the EFRAG
    //  inconsistency where TotalMassOfMaterialUsed reads plain "kg, t" instead
    //  of "[utr:kg,utr:t]" — fall through to the itemType default below, which
    //  is the same measure category, rather than dropping the unit.)
    const g = guidance.get(c.name);
    if (g) {
      const fromGuidance = pickFromGuidance(g);
      if (fromGuidance) {
        units.set(c.name, fromGuidance);
        continue;
      }
    }

    // 2. Documented label-quantity override (training hours on a decimal type).
    const override = LABEL_QUANTITY_OVERRIDES.find((o) => o.test.test(c.name));
    if (override) {
      units.set(c.name, override.unit);
      continue;
    }

    // 3. itemType (measure-category) default.
    units.set(c.name, ITEMTYPE_DEFAULT[local] ?? '');
  }

  return units;
}
