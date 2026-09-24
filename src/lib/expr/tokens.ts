/**
 * Tokenizer for the unified expression language — a strict superset of the
 * two hand-written tokenizers it replaces:
 *   - `src/lib/compliance/evaluate.ts` (gate-condition DSL: comparisons,
 *     membership, existence, logical connectives, IF…THEN guards)
 *   - `src/lib/eval/arithmetic.ts` (numeric formulas: `^`, scientific
 *     notation, `.5`-style leading-dot numbers)
 *
 * Differences from the compliance tokenizer this was copied from:
 *   - `^` is now an `aop` token (arithmetic.ts support).
 *   - The number regex accepts a leading dot (`.5`) like arithmetic.ts.
 *   - On an unexpected character or an unterminated string, this tokenizer
 *     returns a `TokenizeResult` error (message text taken verbatim from
 *     arithmetic.ts) instead of returning `null`.
 */

export type KeywordToken =
  | 'IF' | 'THEN' | 'AND' | 'OR' | 'NOT' | 'IS' | 'NULL' | 'EMPTY' | 'IN'
  | 'TRUE' | 'FALSE';

export type Token =
  | { type: 'ident'; value: string }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'op'; value: '>=' | '<=' | '==' | '!=' | '<' | '>' }
  | { type: 'aop'; value: '+' | '-' | '*' | '/' | '^' }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'lbrace' }
  | { type: 'rbrace' }
  | { type: 'comma' }
  | { type: 'kw'; value: KeywordToken };

export type TokenizeResult =
  | { ok: true; tokens: Token[] }
  | { ok: false; message: string };

const KEYWORDS: Record<string, KeywordToken> = {
  if: 'IF', then: 'THEN', and: 'AND', or: 'OR', not: 'NOT',
  is: 'IS', null: 'NULL', empty: 'EMPTY', in: 'IN',
  true: 'TRUE', false: 'FALSE',
};

/**
 * The language's reserved words, lower-cased — the ONE source of truth for
 * "this identifier is a connective/literal, not a symbol or a function name".
 *
 * Plan 3 final wave C (item 1): two regexes outside the parser scan raw formula
 * text for `<ident> (` — the eligibility gate's CALL test
 * (`src/lib/eval/engine-eligibility.ts`) and the `r_D(n)` accessor normaliser
 * (`src/lib/eval/normalize-formula.ts`). Both read `AND (b < 2 OR c > 3)` as a
 * call to a function named `AND`, so a parenthesised compound condition inside
 * a formula was either REFUSED as an unsupported aggregate (ISO-59020) or
 * silently welded into the phantom symbol `AND_b`. They consult this set to
 * tell a connective from a call. `if` is in here AND is a real function
 * (`canonicalFunctionName('if')`), so its call form keeps working either way.
 */
export const KEYWORD_NAMES: ReadonlySet<string> = new Set(Object.keys(KEYWORDS));

// arithmetic.ts:98 superset — accepts a leading dot (.5) alongside plain
// digits, decimals, and scientific-notation suffixes.
const NUMBER = /^(?:\d+\.\d+|\d+|\.\d+)(?:[eE][+-]?\d+)?/;
const NEG_NUMBER = /^-(?:\d+\.\d+|\d+|\.\d+)(?:[eE][+-]?\d+)?/;
// evaluate.ts:110 — Latin-1 superset of arithmetic.ts's ASCII-only identifiers.
const IDENT = /^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_]*/;

export function tokenize(src: string): TokenizeResult {
  const toks: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '(') { toks.push({ type: 'lparen' }); i++; continue; }
    if (c === ')') { toks.push({ type: 'rparen' }); i++; continue; }
    if (c === '{') { toks.push({ type: 'lbrace' }); i++; continue; }
    if (c === '}') { toks.push({ type: 'rbrace' }); i++; continue; }
    if (c === ',') { toks.push({ type: 'comma' }); i++; continue; }
    if (c === '>' || c === '<' || c === '=' || c === '!') {
      const next = src[i + 1];
      if (c === '>' && next === '=') { toks.push({ type: 'op', value: '>=' }); i += 2; continue; }
      if (c === '<' && next === '=') { toks.push({ type: 'op', value: '<=' }); i += 2; continue; }
      if (c === '=' && next === '=') { toks.push({ type: 'op', value: '==' }); i += 2; continue; }
      if (c === '!' && next === '=') { toks.push({ type: 'op', value: '!=' }); i += 2; continue; }
      if (c === '<' && next === '>') { toks.push({ type: 'op', value: '!=' }); i += 2; continue; }
      if (c === '=') { toks.push({ type: 'op', value: '==' }); i++; continue; }
      if (c === '<') { toks.push({ type: 'op', value: '<' }); i++; continue; }
      if (c === '>') { toks.push({ type: 'op', value: '>' }); i++; continue; }
      return { ok: false, message: `Unerwartetes Zeichen "${c}" an Position ${i}.` };
    }
    // Arithmetic operators. Middle-dot (·) and × are accepted as multiplication.
    if (c === '+' || c === '*' || c === '/' || c === '^') { toks.push({ type: 'aop', value: c }); i++; continue; }
    if (c === '·' || c === '×') { toks.push({ type: 'aop', value: '*' }); i++; continue; }
    if (c === '-') {
      // Negative-number literal (when a value may begin here) vs binary subtraction.
      const lastTok = toks[toks.length - 1];
      const canBeNegative = !lastTok
        || lastTok.type === 'op' || lastTok.type === 'aop' || lastTok.type === 'lparen'
        || lastTok.type === 'comma' || lastTok.type === 'kw';
      const numM = NEG_NUMBER.exec(src.slice(i));
      if (canBeNegative && numM) { toks.push({ type: 'number', value: Number(numM[0]) }); i += numM[0].length; continue; }
      toks.push({ type: 'aop', value: '-' }); i++; continue;
    }
    if ((c >= '0' && c <= '9') || (c === '.' && /\d/.test(src[i + 1] ?? ''))) {
      const m = NUMBER.exec(src.slice(i));
      if (!m) return { ok: false, message: `Ungültige Zahl an Position ${i}: "${src.slice(i, i + 6)}"` };
      toks.push({ type: 'number', value: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (c === "'" || c === '"') {
      const quote = c;
      let j = i + 1;
      while (j < src.length && src[j] !== quote) j++;
      if (j >= src.length) return { ok: false, message: `Nicht abgeschlossene Zeichenkette an Position ${i}.` };
      toks.push({ type: 'string', value: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    // Identifier or keyword
    const idMatch = IDENT.exec(src.slice(i));
    if (idMatch) {
      const word = idMatch[0];
      const kw = KEYWORDS[word.toLowerCase()];
      if (kw) toks.push({ type: 'kw', value: kw });
      else toks.push({ type: 'ident', value: word });
      i += word.length;
      continue;
    }
    return { ok: false, message: `Unerwartetes Zeichen "${c}" an Position ${i}.` };
  }
  return { ok: true, tokens: toks };
}
