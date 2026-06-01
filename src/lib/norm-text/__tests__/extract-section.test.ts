/**
 * Section-extractor tests.
 *
 * Verifies the source-faithful contract:
 *   - exact numbered clause matches return the correct title + body
 *   - depth-N matches respect the depth-N+1 children but stop at depth ≤ N
 *   - unnumbered glossary headings inside §3.1 don't fragment the parent
 *   - appendix matches (Anh. A / Anhang A) work
 *   - non-matching refs (Tab. N, missing numbers, garbage) return found:false
 *   - matching is exact: §5.3.3 must NOT match §5.3.3.5
 */
import { describe, it, expect } from 'vitest';
import { extractSection, parseClauseReference, parseHeadings } from '../extract-section';

// A fixture that mimics the structure of the real DWA-A 138-1 markdown
// (LaTeX `\section*{...}` / `\subsection*{...}` with numbered prefixes,
// plus a handful of unnumbered glossary entries nested under §3.1).
const FIXTURE = `Foreword paragraph (ignored).

\\section*{1 Anwendungsbereich}

Scope of the document.

Paragraph two of §1.

\\section*{2 Verweisungen}

References list.

\\section*{3 Begriffe}

\\subsection*{3.1 Definitionen}

Intro to definitions.

\\section*{Grundwasser}

Grundwasser definition body.

\\section*{Grundwasserleiter}

Grundwasserleiter definition body.

\\subsection*{3.2 Abkürzungen}

Abkürzungen body.

\\section*{5 Planung}

\\subsection*{5.1 Ersteinschätzung}

\\subsection*{5.1.1 Kriterien Ersteinschätzung}

5.1.1 first paragraph.

5.1.1 second paragraph.

\\subsection*{5.1.2 Umsetzbarkeit}

5.1.2 body.

\\subsection*{5.3 Quantitative}

\\subsection*{5.3.3 Bemessungsgrundsätze}

\\subsection*{5.3.3.5 Berechnung Zuflüsse}

Equation (2) here.

with the variables.

\\subsection*{5.3.3.6 Berechnung Versickerungsleistung}

Other content.

\\section*{Anhang A (normativ) Bestimmung der Wasserdurchlässigkeit}

A1 method.

A2 method.

\\section*{Anhang B (informativ) Rechtliche Grundlagen}

B body.
`;

describe('parseClauseReference', () => {
  it.each([
    ['§5', { kind: 'numbered', number: '5' }],
    ['§5.1', { kind: 'numbered', number: '5.1' }],
    ['§5.3.3.5', { kind: 'numbered', number: '5.3.3.5' }],
    ['  §5.3.3.5  ', { kind: 'numbered', number: '5.3.3.5' }],
    ['5.3.3.5', { kind: 'numbered', number: '5.3.3.5' }],
    ['Anh. A', { kind: 'appendix', letter: 'A' }],
    ['Anhang B', { kind: 'appendix', letter: 'B' }],
  ])('parses %s', (input, expected) => {
    expect(parseClauseReference(input)).toEqual(expected);
  });

  it.each(['Tab. 2', 'Tabelle 9', 'Bild 7', '', 'foo', '§5.1, §5.2'])(
    'returns null for non-matchable ref %s',
    (input) => {
      expect(parseClauseReference(input)).toBeNull();
    },
  );
});

describe('parseHeadings', () => {
  it('finds numbered, glossary, and appendix headings', () => {
    const headings = parseHeadings(FIXTURE);
    const numbers = headings.map((h) => h.number);
    expect(numbers).toContain('1');
    expect(numbers).toContain('3.1');
    expect(numbers).toContain('5.3.3.5');

    const appendices = headings.filter((h) => h.isAppendix);
    expect(appendices.map((h) => h.inner.slice(0, 8))).toEqual([
      'Anhang A',
      'Anhang B',
    ]);

    // Glossary headings have no number and aren't appendices.
    const glossary = headings.filter((h) => h.number === null && !h.isAppendix);
    expect(glossary.map((h) => h.inner)).toEqual(['Grundwasser', 'Grundwasserleiter']);
  });

  it('assigns correct depth for numbered headings', () => {
    const headings = parseHeadings(FIXTURE);
    const byNumber = (n: string) => headings.find((h) => h.number === n)!;
    expect(byNumber('1').depth).toBe(1);
    expect(byNumber('3.1').depth).toBe(2);
    expect(byNumber('5.3.3.5').depth).toBe(4);
  });
});

describe('extractSection — numbered clauses', () => {
  it('extracts a depth-4 clause and stops at the next depth-≤4 heading', () => {
    const r = extractSection(FIXTURE, '§5.3.3.5');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toBe('5.3.3.5 Berechnung Zuflüsse');
    expect(r.markdown).toContain('Equation (2) here.');
    expect(r.markdown).toContain('with the variables.');
    // Must NOT bleed into the next sibling 5.3.3.6.
    expect(r.markdown).not.toContain('Other content.');
    expect(r.markdown).not.toContain('5.3.3.6');
  });

  it('extracts a depth-1 clause and includes ALL nested subsections', () => {
    const r = extractSection(FIXTURE, '§5');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toBe('5 Planung');
    expect(r.markdown).toContain('5.1.1 first paragraph.');
    expect(r.markdown).toContain('5.1.2 body.');
    expect(r.markdown).toContain('Equation (2) here.');
    expect(r.markdown).toContain('Other content.');
    // Must NOT bleed into Anhang A.
    expect(r.markdown).not.toContain('A1 method.');
  });

  it('extracts a depth-3 clause and includes its depth-4 children', () => {
    const r = extractSection(FIXTURE, '§5.3.3');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toBe('5.3.3 Bemessungsgrundsätze');
    expect(r.markdown).toContain('Equation (2) here.');
    expect(r.markdown).toContain('Other content.');
  });

  it('extracts §3.1 and includes the unnumbered glossary sub-entries', () => {
    const r = extractSection(FIXTURE, '§3.1');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toBe('3.1 Definitionen');
    expect(r.markdown).toContain('Intro to definitions.');
    expect(r.markdown).toContain('Grundwasser definition body.');
    expect(r.markdown).toContain('Grundwasserleiter definition body.');
    // 3.2 is the next sibling — must NOT be included.
    expect(r.markdown).not.toContain('Abkürzungen body.');
  });

  it('exact number match — §5.3.3 does NOT match §5.3.3.5', () => {
    const r = extractSection(FIXTURE, '§5.3.3');
    expect(r.found).toBe(true);
    if (!r.found) return;
    // The depth-3 clause's body INCLUDES the depth-4 child as expected, but
    // the TITLE must be the depth-3 title, not the depth-4 one.
    expect(r.title).toBe('5.3.3 Bemessungsgrundsätze');
    expect(r.title).not.toContain('5.3.3.5');
  });

  it('bare-number form (no §) works', () => {
    const r = extractSection(FIXTURE, '5.1.2');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toBe('5.1.2 Umsetzbarkeit');
    expect(r.markdown).toContain('5.1.2 body.');
  });

  it('returns found:false for a number that has no heading', () => {
    expect(extractSection(FIXTURE, '§9.9.9')).toEqual({ found: false });
  });
});

describe('extractSection — appendix clauses', () => {
  it('extracts Anhang A and stops at Anhang B', () => {
    const r = extractSection(FIXTURE, 'Anh. A');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toContain('Anhang A');
    expect(r.markdown).toContain('A1 method.');
    expect(r.markdown).toContain('A2 method.');
    expect(r.markdown).not.toContain('B body.');
  });

  it('Anhang B works with full word', () => {
    const r = extractSection(FIXTURE, 'Anhang B');
    expect(r.found).toBe(true);
    if (!r.found) return;
    expect(r.title).toContain('Anhang B');
    expect(r.markdown).toContain('B body.');
  });
});

describe('extractSection — non-matchable refs', () => {
  it.each(['Tab. 2', 'Tabelle 9', 'Bild 7', '', '   ', '§5.1, §5.2', 'foo'])(
    'returns found:false for %s',
    (ref) => {
      expect(extractSection(FIXTURE, ref)).toEqual({ found: false });
    },
  );
});
