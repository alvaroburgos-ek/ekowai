-- CORPUS-WIDE SOURCE-SETTLED SWEEP — the `eq` operator class. A systematic wave-0 generator
-- defect: CR conditions written `X eq true` instead of `X == true`. The condition grammar has
-- no `eq` token, so evaluateCondition returns kind:'manual' (dead gate) for EVERY state.
-- PROVEN twice this session (ISO-5667-1, ISO-5667-13): 'X eq true' -> manual/manual;
-- 'X == true' -> pass(true)/fail(false). All affected CRs are severity=warn, so a dead
-- advisory gate becomes live with ZERO blocking-behaviour change. Mechanically determined.
--
-- SCOPE GUARD: only conditions that are a simple `<sym> eq <value>` clause OR a compound of
-- such clauses joined by AND/OR — i.e. the whole condition fully parses after the swap. This
-- DELIBERATELY EXCLUDES 5 CRs whose `eq` sits beside deeper issues the swap cannot fix
-- (Q_GWT eq MIN(...) — MIN() unsupported in conditions; `... eq ... -> ...` implication prose;
-- `... OR (Table 5 verbatim)` placeholder). Those 5 stay flagged for rulings.
-- Idempotent: guarded on the `eq` form still being present.
DO $$
DECLARE v_n int;
BEGIN
  UPDATE compliance_requirements
     SET condition = regexp_replace(condition, '(^| )eq( |$)', '\1==\2', 'g')
   WHERE condition ~ '(^| )eq( |$)'
     AND condition ~ '^[A-Za-z_][A-Za-z0-9_]* eq (true|false|''[^'']*''|[0-9.]+)( (AND|OR) [A-Za-z_][A-Za-z0-9_]* eq (true|false|''[^'']*''|[0-9.]+))*$';
  GET DIAGNOSTICS v_n = ROW_COUNT; RAISE NOTICE 'corpus eq->== sweep: % rows', v_n;
END $$;
