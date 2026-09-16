/**
 * AST types shared by the condition grammar (compliance gate DSL) and the
 * arithmetic grammar (numeric formulas). `Expr` is the union of both —
 * `parseExpression` classifies a top-level result with `isConditionNode`.
 */

export type CompareOp = '>=' | '<=' | '==' | '!=' | '<' | '>';

export type Literal = { kind: 'lit'; value: number | string | boolean | null };

export type ArithNode =
  | { kind: 'anum'; value: number }
  | { kind: 'astr'; value: string }
  | { kind: 'abool'; value: boolean }
  | { kind: 'anull' }
  | { kind: 'aref'; symbol: string }
  | { kind: 'abin'; op: '+' | '-' | '*' | '/' | '^'; left: ArithNode; right: ArithNode }
  | { kind: 'aneg'; inner: ArithNode }
  | { kind: 'call'; name: string; args: Expr[] };

export type Node =
  | Literal
  | { kind: 'truthy'; symbol: string }
  | { kind: 'compare'; symbol: string; op: CompareOp; rhs: Literal }
  | { kind: 'acompare'; left: ArithNode; op: CompareOp; right: ArithNode }
  | { kind: 'exists'; symbol: string; negate: boolean }
  | { kind: 'in'; symbol: string; members: Literal[] }
  | { kind: 'and'; left: Node; right: Node }
  | { kind: 'or'; left: Node; right: Node }
  | { kind: 'not'; inner: Node }
  | { kind: 'guard'; guard: Node; body: Node };

export type Expr = Node | ArithNode;

const CONDITION_KINDS = new Set([
  'lit', 'truthy', 'compare', 'acompare', 'exists', 'in', 'and', 'or', 'not', 'guard',
]);

export function isConditionNode(e: Expr): e is Node {
  return CONDITION_KINDS.has(e.kind);
}
