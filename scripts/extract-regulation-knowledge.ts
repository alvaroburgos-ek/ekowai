/**
 * Parses an EKOWAI-Agent regulation_brief.md (the NotebookLM-extracted
 * structured summary) into a knowledge map keyed by §-anchor.
 *
 * Currently extracts:
 *   - Compliance Checks (Prompt 6) → name, section refs, criterion lines,
 *     iteration-loop hint ("what to adjust if it fails").
 *
 * Output:
 *   src/lib/worksheets/DWA-A-201/v3.1/_knowledge.json
 *
 * Used by the worksheet importer to inject iterationHint on each
 * threshold whose citation matches one of the compliance check's
 * §-anchors.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const EKOWAI_ROOT = process.env.EKOWAI_ROOT ?? 'C:/EKOWAI-Agent';
const STANDARD = 'DWA-A-201';
const SOURCE = join(EKOWAI_ROOT, 'standards', STANDARD, 'source', 'regulation_brief.md');
const TARGET_DIR = join('src', 'lib', 'worksheets', STANDARD, 'v3.1');
const TARGET = join(TARGET_DIR, '_knowledge.json');

interface ComplianceCheck {
  name: string;
  sectionRefs: string[];
  whatChecked: string;
  criterion: string;
  passOutcome: string;
  failOutcome: string;
  iterationHint: string;
  conditional: string;
}

interface SymbolEntry {
  id: string; // Sanitized id, e.g. 'A_EW', 'V_EW', 'EW_BSB5'
  rawSymbol: string; // Original LaTeX-ish string
  germanName: string;
  englishName: string;
  unit: string;
  firstAppearance: string;
  equations: string;
  defaultValue: string;
  rangeConstraint: string;
}

function stripMd(s: string): string {
  // Strip markdown bold (**), backslash-escapes (\\, \\.), LaTeX-ish frags
  return s
    .replace(/\\\*/g, '*')
    .replace(/\*\*/g, '')
    .replace(/\\\\/g, '\\')
    .replace(/\\([\.\,\(\)])/g, '$1')
    .replace(/\$([^$]+)\$/g, (_, m) => m) // inline math: drop dollar signs
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\ge/g, '≥')
    .replace(/\\le/g, '≤')
    .replace(/\\cdot/g, '·')
    .replace(/\\,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSectionRefs(s: string): string[] {
  const refs: string[] = [];
  const re = /§\s?(\d+(?:\.\d+)*)/g;
  let m;
  while ((m = re.exec(s)) !== null) refs.push(`§${m[1]}`);
  return Array.from(new Set(refs));
}

function parseComplianceChecks(md: string): ComplianceCheck[] {
  // Locate Prompt 6 block. Brief uses '**\#\# Prompt N — ...**' headers
  // (literal escaped #'s) — match the exact pattern.
  const startRe = /\*\*\\#\\# Prompt 6/;
  const promptStart = md.search(startRe);
  if (promptStart === -1) return [];
  const tail = md.slice(promptStart);
  const endRe = /\n\*\*\\#\\# Prompt 7/;
  const endMatch = tail.search(endRe);
  const block = endMatch !== -1 ? tail.slice(0, endMatch) : tail;

  const checks: ComplianceCheck[] = [];
  const checkSplit = block.split(/^### \*\*\\?\d+\\?\.\s+/m).slice(1);

  for (const raw of checkSplit) {
    const lines = raw.split('\n').map((l) => l.trim());
    const titleLine = lines[0] ?? '';
    const name = stripMd(titleLine);

    // Numbered list within each check: 1. What value..., 2. Threshold...,
    // 3. §-section..., 4. PASSES..., 5. FAILS..., 6. Iteration..., 7. Procedure..., 8. Conditional
    const fields: Record<string, string> = {};
    let currentKey = '';
    let buf: string[] = [];

    const flush = () => {
      if (currentKey) fields[currentKey] = stripMd(buf.join(' '));
      buf = [];
    };

    for (const line of lines.slice(1)) {
      const headerMatch = line.match(/^[*]*\s*\\?(\d+)\\?\.\s+\*?\*?(.+)$/);
      if (headerMatch) {
        flush();
        currentKey = headerMatch[1];
        buf = [headerMatch[2]];
      } else if (line) {
        buf.push(line);
      }
    }
    flush();

    if (!name) continue;

    checks.push({
      name,
      sectionRefs: extractSectionRefs(fields['3'] ?? ''),
      whatChecked: fields['1'] ?? '',
      criterion: fields['2'] ?? '',
      passOutcome: fields['4'] ?? '',
      failOutcome: fields['5'] ?? '',
      iterationHint: fields['6'] ?? '',
      conditional: fields['8'] ?? '',
    });
  }

  return checks;
}

function sanitizeSymbolId(raw: string): string {
  // raw like "A_{EW}" or "EW_{BSB,5}" → strip LaTeX, keep word chars + _
  return raw
    .replace(/\\\{|\\\}/g, '')
    .replace(/[\\{}$]/g, '')
    .replace(/[^A-Za-z0-9_,]/g, '_')
    .replace(/[,_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseSymbols(md: string): SymbolEntry[] {
  const startRe = /\*\*\\#\\# Prompt 9/;
  const promptStart = md.search(startRe);
  if (promptStart === -1) return [];
  const tail = md.slice(promptStart);
  const endRe = /\n\*\*\\#\\# Prompt 10/;
  const endMatch = tail.search(endRe);
  const block = endMatch !== -1 ? tail.slice(0, endMatch) : tail;

  const symbols: SymbolEntry[] = [];
  // Each entry begins with `**N\. $...$**` followed by 8 numbered fields.
  const split = block.split(/^\*\*\\?\d+\\?\.\s+\$/m).slice(1);

  for (const raw of split) {
    const lines = raw.split('\n').map((l) => l.trim());
    const titleLine = lines[0] ?? '';
    // Strip trailing closing $ and any markdown
    const symbolMatch = titleLine.match(/^([^$]+)\$/);
    if (!symbolMatch) continue;
    const rawSymbol = symbolMatch[1].trim().replace(/\\\\/g, '\\');
    const id = sanitizeSymbolId(rawSymbol);
    if (!id) continue;

    const fields: Record<string, string> = {};
    let currentKey = '';
    let buf: string[] = [];
    const flush = () => {
      if (currentKey) fields[currentKey] = stripMd(buf.join(' '));
      buf = [];
    };
    for (const line of lines.slice(1)) {
      const headerMatch = line.match(/^[*]*\s*\\?(\d+)\\?\.\s+\*?\*?(.+)$/);
      if (headerMatch) {
        flush();
        currentKey = headerMatch[1];
        buf = [headerMatch[2]];
      } else if (line) {
        buf.push(line);
      }
    }
    flush();

    symbols.push({
      id,
      rawSymbol,
      germanName: fields['2'] ?? '',
      englishName: fields['3'] ?? '',
      unit: fields['4'] ?? '',
      firstAppearance: fields['5'] ?? '',
      equations: fields['6'] ?? '',
      defaultValue: fields['7'] ?? '',
      rangeConstraint: fields['8'] ?? '',
    });
  }

  return symbols;
}

function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Brief not found: ${SOURCE}`);
    process.exit(1);
  }
  const md = readFileSync(SOURCE, 'utf-8');
  const checks = parseComplianceChecks(md);
  const symbols = parseSymbols(md);

  const out = {
    standard: STANDARD,
    source: SOURCE,
    extractedAt: new Date().toISOString(),
    complianceChecks: checks,
    symbols,
  };

  if (!existsSync(TARGET_DIR)) mkdirSync(TARGET_DIR, { recursive: true });
  writeFileSync(TARGET, JSON.stringify(out, null, 2) + '\n', 'utf-8');

  console.log(
    `Parsed ${checks.length} compliance checks + ${symbols.length} symbols from ${SOURCE}\n` +
      `→ ${TARGET}`,
  );
  console.log('  --- Symbols ---');
  for (const s of symbols.slice(0, 10)) {
    console.log(`  ${s.id.padEnd(15)} :: ${s.germanName.slice(0, 70)}`);
  }
  if (symbols.length > 10) console.log(`  ... +${symbols.length - 10} more`);
}

main();
