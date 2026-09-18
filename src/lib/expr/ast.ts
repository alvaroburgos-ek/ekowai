/**
 * AST types shared by the condition grammar (compliance gate DSL) and the
 * arithmetic grammar (numeric formulas). `Expr` is the union of both —
 * `parseExpression` classifies a top-level result with `isConditionNode`.
 */

export type CompareOp = '>=' | '<=' | '==' | '!=' | '<' | '>';

/**
 * A literal operand. `quoted` is set (to `true`) ONLY when the token was a
 * quoted string (`'rechnung'` / `"rechnung"`): such a literal is a literal on
 * every comparison path and never resolves as a symbol. A bare identifier in
 * literal position (`status == rechnung`, `x IN {a, b}`) carries no `quoted`
 * flag and keeps the legacy var-vs-var rule on `==` / `!=` (Task 13b,
 * sign-off din276-X-1).
 */
export type Literal = { kind: 'lit'; value: number | string | boolean | null; quoted?: true };

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
