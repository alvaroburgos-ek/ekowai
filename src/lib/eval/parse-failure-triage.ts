/**
 * Legacy-order triage of a formula the unified expression engine could not
 * parse (fix-wave item 2, Plan 2a final review).
 *
 * The retired arithmetic engine (`arithmetic.ts` @ da79b99) failed EAGERLY,
 * left to right: its tokenizer threw `Funktionsaufruf "X(...)" wird nicht
 * unterstützt` the moment it saw an unsupported `IDENT(`, and its parser
 * threw `Unbekanntes Symbol "y"` the moment it reached an identifier without
 * a value — both BEFORE any later garbage (`;`, `*)`, juxtaposed identifiers)
 * was reached. `formula.ts` maps those two messages to `manual_required`
 * (an actionable "Rewrite-Regel / Eingabe fehlt" badge); everything else is
 * a hard `error`. The unified tokenizer/parser reports the garbage first, so
 * the same formulas would flip to `error`.
 *
 * This walker replays the legacy grammar over the normalised expression
 * WITHOUT evaluating it and returns the first legacy-fatal event:
 *
 *   - `{ kind: 'manual', reason }` — unsupported call or unknown symbol, in the
 *     position the legacy engine would have reported it;
 *   - `null` — the legacy engine would ALSO have failed structurally
 *     (illegal character, malformed number, trailing tokens, …) → keep the
 *     unified engine's `error` and its message.
 *
 * "Supported call" is judged by the CURRENT registry (`canonicalFunctionName`),
 * so a call the unified engine accepts (`if`, `lookup`, `sum_rows`, …) is
 * parsed as a variadic call here — its arity/evaluation failures belong to
 * the evaluator, not to this triage.
 */
import { canonicalFunctionName } from './arithmetic';

export type ParseFailureTriage = { kind: 'manual'; reason: string } | null;

/** Bare constants the numeric adapter resolves as a fallback (`arithmetic.ts`). */
const CONSTANTS = new Set(['e', 'pi']);

type Tok =
  | { kind: 'num' }
  | { kind: 'ident'; name: string }
  | { kind: 'fn'; name: string }
  | { kind: 'op'; op: string };

class LegacyStructureError extends Error {}
class LegacyManual extends Error {}

function tokenizeLegacy(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if ('()+-*/^,'.includes(c)) { toks.push({ kind: 'op', op: c }); i++; continue; }
    if ((c >= '0' && c <= '9') || c === '.') {
      const m = /^(?:\d+\.\d+|\d+|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw new LegacyStructureError(`Ungültige Zahl an Position ${i}`);
      toks.push({ kind: 'num' });
      i += m[0].length;
      continue;
    }
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c === '_') {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
      if (!m) throw new LegacyStructureError(`Ungültiger Bezeichner an Position ${i}`);
      let j = i + m[0].length;
      while (j < src.length && (src[j] === ' ' || src[j] === '\t')) j++;
      if (src[j] === '(') {
        const canonical = canonicalFunctionName(m[0]);
        if (!canonical) {
          throw new LegacyManual(`Funktionsaufruf "${m[0]}(...)" wird nicht unterstützt — Rewrite-Regel erforderlich.`);
        }
        toks.push({ kind: 'fn', name: canonical });
      } else {
        toks.push({ kind: 'ident', name: m[0] });
      }
      i += m[0].length;
      continue;
    }
    throw new LegacyStructureError(`Unerwartetes Zeichen "${c}" an Position ${i}.`);
  }
  return toks;
}

/** Grammar walk of arithmetic.ts@da79b99 (expr/term/unary/power/primary), no evaluation. */
class LegacyWalker {
  private pos = 0;
  constructor(private readonly toks: Tok[], private readonly known: (sym: string) => boolean) {}

  walk(): void {
    this.expr();
    if (this.pos !== this.toks.length) throw new LegacyStructureError('Unerwartetes Token am Ende des Ausdrucks.');
  }
  private peek(): Tok | undefined { return this.toks[this.pos]; }
  private isOp(t: Tok | undefined, ...ops: string[]): boolean { return t?.kind === 'op' && ops.includes(t.op); }
  private expr(): void {
    this.term();
    while (this.isOp(this.peek(), '+', '-')) { this.pos++; this.term(); }
  }
  private term(): void {
    this.unary();
    while (this.isOp(this.peek(), '*', '/')) { this.pos++; this.unary(); }
  }
  private unary(): void {
    if (this.isOp(this.peek(), '+', '-')) this.pos++;
    this.power();
  }
  private power(): void {
    this.primary();
    if (this.isOp(this.peek(), '^')) { this.pos++; this.unary(); }
  }
  private primary(): void {
    const t = this.toks[this.pos++];
    if (!t) throw new LegacyStructureError('Ausdruck endet vorzeitig.');
    if (t.kind === 'num') return;
    if (t.kind === 'ident') {
      if (this.known(t.name) || CONSTANTS.has(t.name)) return;
      throw new LegacyManual(`Unbekanntes Symbol "${t.name}" im Ausdruck.`);
    }
    if (t.kind === 'fn') {
      if (!this.isOp(this.toks[this.pos++], '(')) throw new LegacyStructureError(`Erwarte '(' nach "${t.name}".`);
      // Variadic argument list — arity is the evaluator's business.
      if (!this.isOp(this.peek(), ')')) {
        this.expr();
        while (this.isOp(this.peek(), ',')) { this.pos++; this.expr(); }
      }
      if (!this.isOp(this.toks[this.pos++], ')')) throw new LegacyStructureError(`Fehlende schließende Klammer im ${t.name}(...)-Aufruf.`);
      return;
    }
    if (this.isOp(t, '(')) {
      this.expr();
      if (!this.isOp(this.toks[this.pos++], ')')) throw new LegacyStructureError('Fehlende schließende Klammer.');
      return;
    }
    throw new LegacyStructureError('Ausdruck erwartet.');
  }
}

/**
 * Triage an expression the unified engine failed to tokenize/parse.
 * `known(sym)` answers whether a symbol has a value in the evaluation scope
 * (numeric inputs, profile constants, registers, carriers).
 */
export function triageParseFailure(expression: string, known: (sym: string) => boolean): ParseFailureTriage {
  try {
    new LegacyWalker(tokenizeLegacy(expression), known).walk();
    return null; // legacy would have parsed it — the failure is genuinely the new grammar's; keep `error`
  } catch (e) {
    if (e instanceof LegacyManual) return { kind: 'manual', reason: e.message };
    if (e instanceof LegacyStructureError || e instanceof RangeError) return null;
    throw e;
  }
}
