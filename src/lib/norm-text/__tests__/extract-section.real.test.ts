/**
 * Smoke test against the real `data/norm-text/DWA-A-138-1.md` source.
 *
 * The fixture-based tests in `extract-section.test.ts` cover the contract.
 * This file additionally verifies that the extractor works on the actual
 * DWA-A 138-1 LaTeX dump for the references that the audit reports
 * (`audit-reports/DWA-A-138-1/`) and Pass3c workbooks rely on.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { extractSection } from '../extract-section';

const SOURCE_PATH = path.join(process.cwd(), 'data', 'norm-text', 'DWA-A-138-1.md');

// Skip the whole suite if the markdown isn't present — keeps CI green even
// when the data file isn't deployed.
const SOURCE_EXISTS = fs.existsSync(SOURCE_PATH);
const maybe = SOURCE_EXISTS ? describe : describe.skip;

maybe('extractSection — real DWA-A 138-1 source', () => {
  const source = SOURCE_EXISTS ? fs.readFileSync(SOURCE_PATH, 'utf8') : '';

  it('§5.3.3.5 — Berechnung Zuflüsse Versickerungsanlagen', () => {
    const r = extractSection(source, '§5.3.3.5');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toMatch(/^5\.3\.3\.5\b/);
    expect(r.title).toContain('Berechnung Zuflüsse');
    expect(r.markdown).toContain('AC');
    expect(r.markdown).toContain('Versickerungsanlage');
    // Must stop before 5.3.3.6.
    expect(r.markdown).not.toContain('5.3.3.6');
  });

  it('§6.4.2 — Rigole / Bemessung', () => {
    const r = extractSection(source, '§6.4.2');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toMatch(/^6\.4\.2\b/);
    expect(r.title).toContain('Bemessung');
    // Stop before next sibling 6.5.
    expect(r.markdown).not.toContain('6.5 Mulden-Rigolen-Element');
  });

  it('§5 — full chapter 5 contains all nested subsections', () => {
    const r = extractSection(source, '§5');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toMatch(/^5\s+Planung\b/);
    // Sample nested headings should appear in the body.
    expect(r.markdown).toContain('5.1.1 Kriterien');
    expect(r.markdown).toContain('5.3.3.5');
    // Must NOT include chapter 6.
    expect(r.markdown).not.toContain('6.1 Allgemeines');
  });

  it('§3.1 — Definitionen includes the unnumbered glossary entries', () => {
    const r = extractSection(source, '§3.1');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toMatch(/^3\.1\b/);
    // The glossary `\section*{Grundwasser}` lives inside §3.1.
    expect(r.markdown).toContain('Grundwasser');
    expect(r.markdown).toContain('Sickerwasser');
    // Must NOT bleed into §3.2.
    expect(r.markdown).not.toContain('3.2 Abkürzungen und Formelzeichen');
  });

  it('Anh. A — appendix extraction', () => {
    const r = extractSection(source, 'Anh. A');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toContain('Anhang A');
    expect(r.title).toContain('Wasserdurchlässigkeit');
    // Must NOT include Anhang B.
    expect(r.markdown).not.toContain('Anhang B (informativ)');
  });

  it('returns found:false for unmatched § ref', () => {
    expect(extractSection(source, '§99.99')).toEqual({ found: false });
  });

  it('returns found:false for Tab. N', () => {
    expect(extractSection(source, 'Tab. 7')).toEqual({ found: false });
  });
});
