-- ROLLBACK: this is not perfectly reversible (some rows may already have used '==' elsewhere),
-- so it reverts ONLY the simple/compound '==' clauses back to 'eq'. Safe because the sweep only
-- touched rows that were pure eq-clauses. Restores a state that FAILS (dead gates) — correct.
DO $$
BEGIN
  UPDATE compliance_requirements
     SET condition = regexp_replace(condition, '(^| )==( |$)', '\1eq\2', 'g')
   WHERE condition ~ '^[A-Za-z_][A-Za-z0-9_]* == (true|false|''[^'']*''|[0-9.]+)( (AND|OR) [A-Za-z_][A-Za-z0-9_]* == (true|false|''[^'']*''|[0-9.]+))*$'
     AND updated_at::date = current_date;  -- best-effort scope; see migration note
  RAISE NOTICE 'corpus eq sweep rollback attempted';
END $$;
