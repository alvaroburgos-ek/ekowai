/**
 * extract-pollutants.ts — generate src/lib/vsme/pollutants.ts from the EFRAG
 * VSME XBRL taxonomy (TypeOfPollutantAxis domain members = the E-PRTR list).
 *
 * The B04.100 pollutant register needs the full member list with EN + DE
 * labels. The importer (`build-workbook.ts`) deliberately drops dimensional
 * concepts, so this list never reaches the DB — the register's dedicated
 * editor consumes it as a checked-in accessor module instead (same pattern as
 * the Tab. 9 accessors for the A138-07 surface inventory).
 *
 * Usage:
 *   pnpm tsx scripts/vsme/extract-pollutants.ts "<taxonomyDir>"
 *   (taxonomyDir = .../xbrl.efrag.org/taxonomy/vsme/2026-02-01)
 */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const DOMAIN_MEMBER_ARCROLE = 'http://xbrl.org/int/dim/arcrole/domain-member';
const POLLUTANT_DOMAIN_FRAGMENT = 'vsme_TypeOfPollutantMember';

type Rec = Record<string, unknown>;

function asArray<T>(v: T | T[] | undefined): T[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function fragmentOf(href: string): string {
  return href.includes('#') ? href.split('#')[1] : href;
}

/** fragment (vsme_Xxx) → standard-role label text, via the loc→labelArc→label chain. */
function parseLabelLinkbase(parser: XMLParser, file: string): Map<string, string> {
  const doc = parser.parse(fs.readFileSync(file, 'utf8'));
  const links = asArray<Rec>((doc['link:linkbase'] as Rec | undefined)?.['link:labelLink'] as Rec | Rec[] | undefined);
  const out = new Map<string, string>();
  for (const link of links) {
    const locByLabel = new Map<string, string>(); // xlink:label → concept fragment
    for (const loc of asArray<Rec>(link['link:loc'] as Rec | Rec[] | undefined)) {
      locByLabel.set(String(loc['@_xlink:label'] ?? ''), fragmentOf(String(loc['@_xlink:href'] ?? '')));
    }
    const resByLabel = new Map<string, string>(); // xlink:label → label text (standard role only)
    for (const res of asArray<Rec>(link['link:label'] as Rec | Rec[] | undefined)) {
      const role = String(res['@_xlink:role'] ?? '');
      if (!role.endsWith('/role/label')) continue;
      const key = String(res['@_xlink:label'] ?? '');
      const text = String(res['#text'] ?? '').trim();
      if (key && text && !resByLabel.has(key)) resByLabel.set(key, text);
    }
    for (const arc of asArray<Rec>(link['link:labelArc'] as Rec | Rec[] | undefined)) {
      const from = String(arc['@_xlink:from'] ?? '');
      const to = String(arc['@_xlink:to'] ?? '');
      const fragment = locByLabel.get(from);
      const text = resByLabel.get(to);
      if (fragment && text && !out.has(fragment)) out.set(fragment, text);
    }
  }
  return out;
}

/** Ordered, deduped member fragments under TypeOfPollutantMember. */
function parsePollutantMembers(parser: XMLParser, file: string): string[] {
  const doc = parser.parse(fs.readFileSync(file, 'utf8'));
  const links = asArray<Rec>((doc['link:linkbase'] as Rec | undefined)?.['link:definitionLink'] as Rec | Rec[] | undefined);
  const seen = new Set<string>();
  const members: Array<{ fragment: string; order: number }> = [];
  for (const link of links) {
    const locByLabel = new Map<string, string>();
    for (const loc of asArray<Rec>(link['link:loc'] as Rec | Rec[] | undefined)) {
      locByLabel.set(String(loc['@_xlink:label'] ?? ''), fragmentOf(String(loc['@_xlink:href'] ?? '')));
    }
    for (const arc of asArray<Rec>(link['link:definitionArc'] as Rec | Rec[] | undefined)) {
      if (String(arc['@_xlink:arcrole'] ?? '') !== DOMAIN_MEMBER_ARCROLE) continue;
      if (locByLabel.get(String(arc['@_xlink:from'] ?? '')) !== POLLUTANT_DOMAIN_FRAGMENT) continue;
      const fragment = locByLabel.get(String(arc['@_xlink:to'] ?? ''));
      if (!fragment || seen.has(fragment)) continue;
      seen.add(fragment);
      members.push({ fragment, order: parseFloat(String(arc['@_order'] ?? '0')) });
    }
  }
  members.sort((a, b) => a.order - b.order);
  return members.map((m) => m.fragment);
}

function main() {
  const taxonomyDir = process.argv[2];
  if (!taxonomyDir || !fs.existsSync(path.join(taxonomyDir, 'vsme-definition.xml'))) {
    console.error('Usage: pnpm tsx scripts/vsme/extract-pollutants.ts "<taxonomyDir>" (must contain vsme-definition.xml)');
    process.exit(1);
  }
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

  const fragments = parsePollutantMembers(parser, path.join(taxonomyDir, 'vsme-definition.xml'));
  const labelsEn = parseLabelLinkbase(parser, path.join(taxonomyDir, 'vsme-label-en.xml'));
  const labelsDe = parseLabelLinkbase(parser, path.join(taxonomyDir, 'vsme-label-de.xml'));

  const missingEn = fragments.filter((f) => !labelsEn.get(f));
  if (fragments.length === 0 || missingEn.length > 0) {
    console.error(`Extraction incomplete: ${fragments.length} members, ${missingEn.length} without EN label`, missingEn.slice(0, 5));
    process.exit(1);
  }

  const rows = fragments.map((f) => {
    const value = f.startsWith('vsme_') ? f.slice('vsme_'.length) : f;
    const labelEn = labelsEn.get(f)!.replace(/\s*\[member\]\s*$/i, '').trim();
    const labelDe = (labelsDe.get(f) ?? labelsEn.get(f)!).replace(/\s*\[member\]\s*$/i, '').trim();
    return { value, labelEn, labelDe };
  });

  const body = rows
    .map((r) => `  { value: ${JSON.stringify(r.value)}, labelEn: ${JSON.stringify(r.labelEn)}, labelDe: ${JSON.stringify(r.labelDe)} },`)
    .join('\n');

  const out = `/**
 * GENERATED FILE — do not edit by hand.
 * Source: EFRAG VSME XBRL Taxonomy 2026-02-01, vsme-definition.xml
 *         (TypeOfPollutantAxis → TypeOfPollutantMember domain-member arcs,
 *          labels from vsme-label-en.xml / vsme-label-de.xml).
 * Regenerate: pnpm tsx scripts/vsme/extract-pollutants.ts "<taxonomyDir>"
 *
 * This is the E-PRTR pollutant list backing the VSME-B04.100 pollutant
 * register (para 32: "the respective amount for each pollutant").
 */

export type PollutantOption = {
  /** XBRL member concept name (e.g. "AmmoniaNH3Member") — persisted in the carrier. */
  value: string;
  labelEn: string;
  labelDe: string;
};

export const POLLUTANTS: readonly PollutantOption[] = [
${body}
] as const;

const BY_VALUE = new Map(POLLUTANTS.map((p) => [p.value, p]));

export function lookupPollutant(value: string): PollutantOption | undefined {
  return BY_VALUE.get(value);
}

export function pollutantLabel(value: string, locale: 'de' | 'en'): string {
  const p = BY_VALUE.get(value);
  if (!p) return value;
  return locale === 'de' ? p.labelDe : p.labelEn;
}
`;

  const target = path.resolve(__dirname, '..', '..', 'src', 'lib', 'vsme', 'pollutants.ts');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, out, 'utf8');
  console.log(`Wrote ${rows.length} pollutant members → ${path.relative(process.cwd(), target)}`);
}

main();
