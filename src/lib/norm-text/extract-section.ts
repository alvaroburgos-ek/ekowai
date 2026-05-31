/**
 * Section extraction from the raw norm-text markdown.
 *
 * The source markdown for DWA standards (e.g. `data/norm-text/DWA-A-138-1.md`)
 * is a pandoc/LaTeX dump where headings appear as
 *   \section*{N Title}, \subsection*{N.M Title}, \subsection*{N.M.K Title}, ...
 * and free-form glossary entries like
 *   \section*{Grundwasser}
 * also use the `\section*` macro but without a numeric prefix.
 *
 * The Wizard stores `clause_reference` strings like `§5.3.3.5`, `§6.4.2`,
 * `§5.2.3.2`, `Anh. A`, `Anhang A`, `Tab. 2`. Engineers must be able to click
 * one of those references and see the EXACT corresponding section of the norm.
 *
 * Source-faithfulness is non-negotiable:
 *   - If a clause does not match any heading exactly, return `{ found: false }`.
 *   - Never approximate: returning the wrong section would mislead the engineer
 *     about what the standard actually says.
 *
 * The matcher knows about three shapes:
 *   - `§N(.N)*`                  → numbered heading like `5`, `5.1`, `5.3.3.5`
 *   - `Anh. X` / `Anhang X`      → appendix heading prefixed `Anhang X`
 *   - `Tab. N` / `Tabelle N`     → tables aren't headings → `{ found: false }`.
 */

export type SectionMatch =
  | { found: true; title: string; markdown: string }
  | { found: false };

type Heading = {
  /** Line index where the heading appears (0-based). */
  line: number;
  /** The full markdown source line including the macro. */
  raw: string;
  /** The text inside the heading macro, e.g. `5.3.3.5 Berechnung Zuflüsse …`. */
  inner: string;
  /** The numeric prefix (e.g. `5.3.3.5`) if the inner starts with one, else null. */
  number: string | null;
  /** Heading depth derived from the section number (number of dot-segments).
   *  For Appendix headings (`Anhang X …`) depth is 1. For unnumbered glossary
   *  headings (`\section*{Grundwasser}`) depth is null — they don't terminate
   *  numbered sections. */
  depth: number | null;
  /** True iff this is an `Anhang X …` heading (appendix). */
  isAppendix: boolean;
};

const HEADING_RE = /^\\(section|subsection|subsubsection)\*\{([\s\S]*?)\}\s*$/;
const NUMBER_PREFIX_RE = /^(\d+(?:\.\d+)*)(?:\s|$)/;
const APPENDIX_PREFIX_RE = /^Anhang\s+([A-Z])(?:\s|$|\.|,)/;

/**
 * Parse all headings from a markdown source. Returns headings in source order.
 *
 * Multi-line `\section*{ ... }` blocks (where the macro spans more than one
 * line) are joined back together so the heading regex sees the full title.
 * That's not the common case in our source but it does occur — e.g. the
 * `\section*{Versickerungs-Expert \\ Software zum Arbeitsblatt DWA-A 138-1}`
 * stretches over two lines.
 */
export function parseHeadings(source: string): Heading[] {
  const lines = source.split('\n');
  const headings: Heading[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Quick filter: only investigate lines starting with a section macro.
    if (!line.startsWith('\\section*{') && !line.startsWith('\\subsection*{') && !line.startsWith('\\subsubsection*{')) {
      continue;
    }
    // Collect lines until the closing `}` so multi-line headings stay whole.
    // We count braces conservatively (no quoting subtlety needed for our source).
    let joined = line;
    let depth = countBraceDelta(line);
    let j = i;
    while (depth > 0 && j < lines.length - 1) {
      j++;
      joined += '\n' + lines[j];
      depth += countBraceDelta(lines[j]);
    }
    const m = HEADING_RE.exec(joined.replace(/\n/g, ' '));
    if (!m) continue;
    const inner = m[2].trim();

    const numMatch = NUMBER_PREFIX_RE.exec(inner);
    const appendixMatch = APPENDIX_PREFIX_RE.exec(inner);

    if (numMatch) {
      const number = numMatch[1];
      const numDepth = number.split('.').length;
      headings.push({
        line: i,
        raw: line,
        inner,
        number,
        depth: numDepth,
        isAppendix: false,
      });
    } else if (appendixMatch) {
      headings.push({
        line: i,
        raw: line,
        inner,
        number: null,
        depth: 1,
        isAppendix: true,
      });
    } else {
      headings.push({
        line: i,
        raw: line,
        inner,
        number: null,
        depth: null,
        isAppendix: false,
      });
    }

    i = j; // skip lines consumed by the multi-line title
  }

  return headings;
}

function countBraceDelta(s: string): number {
  let d = 0;
  for (const ch of s) {
    if (ch === '{') d++;
    else if (ch === '}') d--;
  }
  return d;
}

/**
 * Parse a clause reference into a structured query.
 *
 * Accepted shapes (source-faithful — we only match what the engineer wrote):
 *   - `§5`, `§5.3`, `§5.3.3.5`
 *   - `5.3.3.5`              (bare number, same intent as §-prefixed)
 *   - `Anh. A`, `Anhang A`
 *
 * Anything else (`Tab. 2`, `Bild 7`, comma-separated lists like `§5.1.1, §5.2`)
 * returns `null` — the caller will surface `{ found: false }`.
 */
export type ClauseQuery =
  | { kind: 'numbered'; number: string }
  | { kind: 'appendix'; letter: string };

export function parseClauseReference(clauseRef: string): ClauseQuery | null {
  const trimmed = clauseRef.trim();
  if (!trimmed) return null;

  // §N(.N)* — strip optional leading § and optional spaces.
  const numMatch = /^§?\s*(\d+(?:\.\d+)*)\s*$/.exec(trimmed);
  if (numMatch) {
    return { kind: 'numbered', number: numMatch[1] };
  }

  // Anh. A / Anhang A — single uppercase letter, optionally followed by `.N`
  // (we don't support sub-clauses of an appendix yet; match the whole appendix).
  const apMatch = /^(?:Anh\.?|Anhang)\s+([A-Z])(?:\b|$)/.exec(trimmed);
  if (apMatch) {
    return { kind: 'appendix', letter: apMatch[1] };
  }

  return null;
}

/**
 * Locate and extract the section body for a clause reference.
 *
 * Returns the heading's title text and the markdown body (everything between
 * the heading line and the next heading of equal or higher rank — i.e. a
 * heading that would terminate this section in the source's outline).
 *
 * What counts as "equal or higher rank":
 *   - For a numbered heading at depth D, a sibling/parent terminator is any
 *     numbered heading at depth ≤ D, OR any appendix heading (`Anhang X …`).
 *   - For an appendix heading (depth 1), a terminator is the next top-level
 *     numbered heading or appendix heading. (In our DWA-A 138-1 source the
 *     appendices sit after the body, so the next top-level heading after
 *     `Anhang A` is `Anhang B`, then `Anhang C`, etc.)
 *
 * Unnumbered glossary headings (`\section*{Grundwasser}`) are NOT terminators
 * — they're sub-entries that live inside `§3.1 Definitionen`. Treating them
 * as boundaries would chop the parent section into one-paragraph slivers and
 * hide the rest of the definitions from the reader.
 */
export function extractSection(source: string, clauseRef: string): SectionMatch {
  const query = parseClauseReference(clauseRef);
  if (!query) return { found: false };

  const headings = parseHeadings(source);
  const lines = source.split('\n');

  // Locate the matching heading.
  let matchIdx = -1;
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (query.kind === 'numbered' && h.number === query.number) {
      matchIdx = i;
      break;
    }
    if (query.kind === 'appendix' && h.isAppendix) {
      // The appendix inner is e.g. "Anhang A (normativ) Bestimmung …" — extract
      // the letter and compare. The APPENDIX_PREFIX_RE captured it already, so
      // re-run for safety on the heading inner.
      const m = APPENDIX_PREFIX_RE.exec(h.inner);
      if (m && m[1] === query.letter) {
        matchIdx = i;
        break;
      }
    }
  }
  if (matchIdx === -1) return { found: false };

  const matched = headings[matchIdx];

  // Find the terminator: the next heading at equal or higher rank.
  const matchedDepth = matched.depth; // null only for non-matchable kinds; here always set
  let endLine = lines.length;
  for (let i = matchIdx + 1; i < headings.length; i++) {
    const h = headings[i];
    if (matched.isAppendix) {
      // Terminate at next appendix heading or next top-level numbered heading.
      if (h.isAppendix) {
        endLine = h.line;
        break;
      }
      if (h.depth === 1) {
        endLine = h.line;
        break;
      }
      continue;
    }
    // Numbered match: terminate at any numbered heading with depth ≤ matchedDepth,
    // OR at any appendix heading (appendices end the body of the standard).
    if (h.isAppendix) {
      endLine = h.line;
      break;
    }
    if (h.depth !== null && matchedDepth !== null && h.depth <= matchedDepth) {
      endLine = h.line;
      break;
    }
  }

  // Body: lines AFTER the heading line up to (but not including) endLine.
  const bodyLines = lines.slice(matched.line + 1, endLine);
  // Trim trailing blank lines for tidier rendering.
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') {
    bodyLines.pop();
  }
  // Trim leading blank lines too.
  while (bodyLines.length > 0 && bodyLines[0].trim() === '') {
    bodyLines.shift();
  }

  return {
    found: true,
    title: matched.inner,
    markdown: bodyLines.join('\n'),
  };
}
