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

export function explainCondition(condition: string, lookup: Lookup): GateExplanation {
  const ast = parseCondition(condition);
  if (!ast) return { kind: 'manual' };
  const leaves: ExplainLeaf[] = [];
  walk(ast, lookup, leaves);
  return { kind: 'explained', leaves };
}

function walk(n: ConditionNode, lookup: Lookup, out: ExplainLeaf[]): void {
  switch (n.kind) {
    case 'and':
    case 'or':
      walk(n.left, lookup, out);
      walk(n.right, lookup, out);
      return;
    case 'not': {
      // Rare in the corpus; report the inner leaf with inverted satisfaction.
      const before = out.length;
      walk(n.inner, lookup, out);
      for (let i = before; i < out.length; i++) {
        const s = out[i].satisfied;
        out[i] = { ...out[i], text: `NICHT (${out[i].text})`, satisfied: s === null ? null : !s };
      }
      return;
    }
    case 'guard': {
      const g = evaluateNode(n.guard, lookup);
      if (g === 'false') {
        out.push({
          text: `Bedingung nicht anwendbar — Voraussetzung „${nodeToText(n.guard)}“ greift nicht`,
          satisfied: true,
        });
        return;
      }
      if (g === 'missing') {
        out.push({
          text: `Voraussetzung „${nodeToText(n.guard)}“ noch unbestimmt`,
          satisfied: null,
          actual: 'Wert fehlt',
        });
        return;
      }
      walk(n.body, lookup, out);
      return;
    }
    default:
      out.push(leaf(n, lookup));
  }
}

function leaf(n: ConditionNode, lookup: Lookup): ExplainLeaf {
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
        actual: missing ? `${n.symbol} fehlt` : `${n.symbol} = ${fmt(v)}`,
        required: `erforderlich: ${n.op} ${rhs}`,
        ...(satisfied === false ? { wouldPass: wouldPassText(n.symbol, n.op, rhs) } : {}),
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
        actual: lv === null ? `${lText} fehlt/unbestimmt` : `${lText} = ${fmt(lv)}`,
        required:
          `erforderlich: ${n.op} ${requiredValue}`
          + (rv !== null && !isNumericLiteral(n.right) ? ` (= ${rText})` : rhsIsBare ? '' : ` (${rText})`),
        ...(satisfied === false ? { wouldPass: wouldPassText(lText, n.op, requiredValue) } : {}),
      };
    }
    case 'exists': {
      const v = lookup(n.symbol);
      const present = v !== undefined && v !== null && v !== '';
      return {
        text,
        satisfied,
        actual: present ? `${n.symbol} = ${fmt(v as ConditionValue)}` : `${n.symbol} fehlt`,
        required: n.negate ? 'erforderlich: Wert vorhanden' : 'erforderlich: kein Wert',
        ...(satisfied === false && n.negate
          ? { wouldPass: `${n.symbol} erfassen/ausfüllen` }
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
        actual: missing ? `${n.symbol} fehlt` : `${n.symbol} = ${fmt(v)}`,
        required: `erforderlich: einer von {${members}}`,
        ...(satisfied === false ? { wouldPass: `${n.symbol} auf einen zulässigen Wert setzen` } : {}),
      };
    }
    case 'truthy': {
      const v = lookup(n.symbol);
      const missing = v === undefined || v === null || v === '';
      return {
        text,
        satisfied,
        actual: missing ? `${n.symbol} fehlt` : `${n.symbol} = ${fmt(v)}`,
        required: 'erforderlich: bestätigt (true)',
        ...(satisfied === false ? { wouldPass: `${n.symbol} bestätigen` } : {}),
      };
    }
    default:
      return { text, satisfied };
  }
}

/** German action phrasing per operator direction. */
function wouldPassText(lhs: string, op: string, requiredValue: string): string {
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
  }
}

function fmt(v: ConditionValue): string {
  if (v === null) return 'NULL';
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
  }
  return String(v);
}
