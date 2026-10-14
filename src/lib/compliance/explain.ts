/**
 * Gate explainer (Stage 3 — explainable gates).
 *
 * Walks the SAME AST the evaluator uses (`parseCondition`) and reuses the SAME
 * leaf semantics (`evaluateNode`/`evaluateArithNode`), so screen, gate, and PDF
 * can never disagree with the verdict. Each leaf reports:
 *   actual   — the value(s) actually checked ("V_s = 10")
 *   required — the threshold ("erforderlich: >= 15 (= V_S_min)")
 *   wouldPass — for failed leaves, what change would satisfy the gate
 */
import {
  parseCondition,
  evaluateNode,
  evaluateArithNode,
  type ConditionNode,
  type ConditionArithNode,
  type ConditionValue,
} from './evaluate';
import { isConditionNode, type Expr } from '@/lib/expr';

export type ExplainLeaf = {
  /** Human rendering of the leaf condition (the DSL fragment). */
  text: string;
  /** true = satisfied, false = violated, null = value missing. */
  satisfied: boolean | null;
  actual?: string;
  required?: string;
  wouldPass?: string;
};

export type GateExplanation =
  | { kind: 'manual' }
  | { kind: 'explained'; leaves: ExplainLeaf[] };

type Lookup = (sym: string) => ConditionValue | undefined;

/** O-8 (UX follow-up 2026-10-14): UI language of the explanation texts. Default German (the PDF report and every
 * existing caller); the form passes the viewer's locale. The DSL fragment (`text` of a leaf) stays the condition. */
export type ExplainLocale = 'de' | 'en';

export function explainCondition(condition: string, lookup: Lookup, locale: ExplainLocale = 'de'): GateExplanation {
  const ast = parseCondition(condition);
  if (!ast) return { kind: 'manual' };
  const leaves: ExplainLeaf[] = [];
  walk(ast, lookup, leaves, locale);
  return { kind: 'explained', leaves };
}

function walk(n: ConditionNode, lookup: Lookup, out: ExplainLeaf[], locale: ExplainLocale): void {
  const en = locale === 'en';
  switch (n.kind) {
    case 'and':
    case 'or':
      walk(n.left, lookup, out, locale);
      walk(n.right, lookup, out, locale);
      return;
    case 'not': {
      // Rare in the corpus; report the inner leaf with inverted satisfaction.
      const before = out.length;
      walk(n.inner, lookup, out, locale);
      for (let i = before; i < out.length; i++) {
        const s = out[i].satisfied;
        out[i] = { ...out[i], text: en ? `NOT (${out[i].text})` : `NICHT (${out[i].text})`, satisfied: s === null ? null : !s };
      }
      return;
    }
    case 'guard': {
      // The antecedent keeps the legacy existence semantics (A1) — same as the evaluator's guard node.
      const g = evaluateNode(n.guard, lookup, { existsOnAbsent: 'definite' });
      if (g === 'false') {
        out.push({
          text: en
            ? `Condition not applicable — precondition “${nodeToText(n.guard)}” is not met`
            : `Bedingung nicht anwendbar — Voraussetzung „${nodeToText(n.guard)}“ greift nicht`,
          satisfied: true,
        });
        return;
      }
      if (g === 'missing') {
        out.push({
          text: en ? `Precondition “${nodeToText(n.guard)}” not yet determined` : `Voraussetzung „${nodeToText(n.guard)}“ noch unbestimmt`,
          satisfied: null,
          actual: en ? 'value missing' : 'Wert fehlt',
        });
        return;
      }
      walk(n.body, lookup, out, locale);
      return;
    }
    default:
      out.push(leaf(n, lookup, locale));
  }
}

function leaf(n: ConditionNode, lookup: Lookup, locale: ExplainLocale): ExplainLeaf {
  const en = locale === 'en';
  const missingTxt = (sym: string) => (en ? `${sym} missing` : `${sym} fehlt`);
  const req = en ? 'required' : 'erforderlich';
  const verdict = evaluateNode(n, lookup);
  const satisfied = verdict === 'missing' ? null : verdict === 'true';
  const text = nodeToText(n);

  switch (n.kind) {
    case 'compare': {
      const v = lookup(n.symbol);
      const missing = v === undefined || v === null || v === '';
      const rhs = fmt(n.rhs.value);
      return {
        text,
        satisfied,
        actual: missing ? missingTxt(n.symbol) : `${n.symbol} = ${fmt(v)}`,
        required: `${req}: ${n.op} ${rhs}`,
        ...(satisfied === false ? { wouldPass: wouldPassText(n.symbol, n.op, rhs, locale) } : {}),
      };
    }
    case 'acompare': {
      const lv = evaluateArithNode(n.left, lookup);
      const rv = evaluateArithNode(n.right, lookup);
      const lText = arithToText(n.left);
      const rText = arithToText(n.right);
      const requiredValue = rv !== null ? fmt(rv) : rText;
      const rhsIsBare = n.right.kind === 'anum' || n.right.kind === 'aref';
      return {
        text,
        satisfied,
        actual: lv === null ? (en ? `${lText} missing/undetermined` : `${lText} fehlt/unbestimmt`) : `${lText} = ${fmt(lv)}`,
        required:
          `${req}: ${n.op} ${requiredValue}`
          + (rv !== null && !isNumericLiteral(n.right) ? ` (= ${rText})` : rhsIsBare ? '' : ` (${rText})`),
        ...(satisfied === false ? { wouldPass: wouldPassText(lText, n.op, requiredValue, locale) } : {}),
      };
    }
    case 'exists': {
      const v = lookup(n.symbol);
      const present = v !== undefined && v !== null && v !== '';
      // A1: a never-entered symbol under IS NOT NULL is `pending` (satisfied null), not a
      // violation — the "erfassen/ausfüllen" hint is still the way forward, so keep it.
      return {
        text,
        satisfied,
        actual: present ? `${n.symbol} = ${fmt(v as ConditionValue)}` : missingTxt(n.symbol),
        required: n.negate ? `${req}: ${en ? 'value present' : 'Wert vorhanden'}` : `${req}: ${en ? 'no value' : 'kein Wert'}`,
        ...(satisfied !== true && n.negate
          ? { wouldPass: en ? `enter/fill in ${n.symbol}` : `${n.symbol} erfassen/ausfüllen` }
          : {}),
      };
    }
    case 'in': {
      const v = lookup(n.symbol);
      const missing = v === undefined || v === null || v === '';
      const members = n.members.map((m) => fmt(m.value)).join(', ');
      return {
        text,
        satisfied,
        actual: missing ? missingTxt(n.symbol) : `${n.symbol} = ${fmt(v)}`,
        required: en ? `${req}: one of {${members}}` : `${req}: einer von {${members}}`,
        ...(satisfied === false ? { wouldPass: en ? `set ${n.symbol} to a permitted value` : `${n.symbol} auf einen zulässigen Wert setzen` } : {}),
      };
    }
    case 'truthy': {
      const v = lookup(n.symbol);
      const missing = v === undefined || v === null || v === '';
      return {
        text,
        satisfied,
        actual: missing ? missingTxt(n.symbol) : `${n.symbol} = ${fmt(v)}`,
        required: en ? `${req}: confirmed (true)` : `${req}: bestätigt (true)`,
        ...(satisfied === false ? { wouldPass: en ? `confirm ${n.symbol}` : `${n.symbol} bestätigen` } : {}),
      };
    }
    default:
      return { text, satisfied };
  }
}

/** Action phrasing per operator direction (German default; O-8 English). */
function wouldPassText(lhs: string, op: string, requiredValue: string, locale: ExplainLocale = 'de'): string {
  if (locale === 'en') {
    switch (op) {
      case '>=': return `raise ${lhs} to at least ${requiredValue}`;
      case '>': return `raise ${lhs} above ${requiredValue}`;
      case '<=': return `lower ${lhs} to at most ${requiredValue}`;
      case '<': return `lower ${lhs} below ${requiredValue}`;
      case '==': return `set ${lhs} to ${requiredValue}`;
      case '!=': return `choose ${lhs} other than ${requiredValue}`;
      default: return `adjust ${lhs} (${op} ${requiredValue})`;
    }
  }
  switch (op) {
    case '>=': return `${lhs} auf mindestens ${requiredValue} bringen`;
    case '>': return `${lhs} auf mehr als ${requiredValue} bringen`;
    case '<=': return `${lhs} auf höchstens ${requiredValue} senken`;
    case '<': return `${lhs} auf weniger als ${requiredValue} senken`;
    case '==': return `${lhs} auf ${requiredValue} setzen`;
    case '!=': return `${lhs} von ${requiredValue} abweichend wählen`;
    default: return `${lhs} anpassen (${op} ${requiredValue})`;
  }
}

function isNumericLiteral(n: ConditionArithNode): boolean {
  return n.kind === 'anum' || (n.kind === 'aneg' && n.inner.kind === 'anum');
}

function nodeToText(n: ConditionNode): string {
  switch (n.kind) {
    case 'lit': return fmt(n.value);
    case 'truthy': return n.symbol;
    case 'compare': return `${n.symbol} ${n.op} ${fmt(n.rhs.value)}`;
    case 'acompare': return `${arithToText(n.left)} ${n.op} ${arithToText(n.right)}`;
    case 'exists': return `${n.symbol} IS ${n.negate ? 'NOT ' : ''}NULL`;
    case 'in': return `${n.symbol} IN {${n.members.map((m) => fmt(m.value)).join(', ')}}`;
    case 'and': return `${nodeToText(n.left)} AND ${nodeToText(n.right)}`;
    case 'or': return `${nodeToText(n.left)} OR ${nodeToText(n.right)}`;
    case 'not': return `NOT (${nodeToText(n.inner)})`;
    case 'guard': return `IF ${nodeToText(n.guard)} THEN ${nodeToText(n.body)}`;
  }
}

function arithToText(n: ConditionArithNode): string {
  switch (n.kind) {
    case 'anum': return fmt(n.value);
    case 'astr': return n.value;
    case 'abool': return String(n.value);
    case 'anull': return 'NULL';
    case 'aref': return n.symbol;
    case 'aneg': return `-${arithToText(n.inner)}`;
    case 'abin': return `${arithToText(n.left)} ${n.op} ${arithToText(n.right)}`;
    case 'call': return `${n.name}(${n.args.map(exprToText).join(', ')})`;
  }
}

/** A call argument may be a condition (`if(a >= 1, …)`) or an arithmetic value. */
function exprToText(e: Expr): string {
  return isConditionNode(e) ? nodeToText(e) : arithToText(e);
}

function fmt(v: ConditionValue): string {
  if (v === null) return 'NULL';
  if (typeof v === 'number') {
    // Significant digits, not fixed decimals — kf-scale values (1e-5) must
    // survive instead of rounding to 0.
    return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(6)));
  }
  return String(v);
}
