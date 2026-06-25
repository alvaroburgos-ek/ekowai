# Task 3: DB migration + whitelist — Report

## Status
**DONE**

## Commits
1. `c52c47a` — feat(138): whitelist A138-07 producers, drop A138-10:2
2. `0bceb3b` — db(138): migration to consolidate A_C/C_m on A138-07 (apply on deploy, not before)

## Files Created/Modified
- Created: `src/lib/eval/__tests__/whitelist-138-singlesource.test.ts`
- Modified: `src/lib/eval/whitelist.ts`
- Modified: `src/lib/eval/engine-whitelist.ts`
- Created: `supabase/migrations/20260625170000_a138_singlesource_consolidation.sql`

## Test Summary
- **Whitelist test:** 2 passed (both assertions on A138-07 producers and A138-10:2 removal)

## Database Apply
- **NO database apply was performed.** Migration file written and committed only.
- Per plan requirements, migration must ship together with code at merge/deploy time (Plan 3).
- Migration is idempotent (uses `ON CONFLICT`, guards `IF EXISTS`-style patterns).

## Concerns
None. All steps executed as specified:
- Step 1: Failing test written verbatim ✓
- Step 2: Test ran and failed (expected) ✓
- Step 3: Both whitelist files edited — removed `'A138-10:2'`, added four A138-07 entries verbatim ✓
- Step 4: Test passed (2/2) and committed ✓
- Step 5: Migration SQL transcribed verbatim ✓
- Step 6: Migration file committed without DB apply ✓

---

## Post-Review Fix (2026-06-25)

### Issue
Migration had correctness/robustness issues: conflict targets were incorrect (used `id` primary key instead of enforced unique keys), and missing NULL guards for worksheet template lookups.

### Three Edits Applied
1. **fields INSERT** (line 32): Changed `ON CONFLICT (id)` to `ON CONFLICT (worksheet_template_id, symbol)` — targets the enforced unique constraint; preserves existing row `id`, updates only `consumer_worksheets + active`.
2. **equations INSERT** (line 41): Changed `ON CONFLICT (id)` to `ON CONFLICT (worksheet_template_id, equation_number)` — targets the enforced unique constraint; kept `DO NOTHING`.
3. **NULL guards** (lines 17–19): Added check after all three SELECT statements:
   ```sql
   IF ws07 IS NULL OR ws10 IS NULL THEN
     RAISE EXCEPTION 'A138 consolidation: worksheet template not found (ws07=% ws10=%)', ws07, ws10;
   END IF;
   ```
   Allows `sec07` to remain NULL (section_id is nullable); raises loudly on missing worksheet templates.

### Verification
- File syntax valid: single `DO $$ … END $$;` block, matched BEGIN/END, proper semicolons.
- No UUIDs, symbols, consumer arrays, DELETE list, or Step-5 UPDATE were changed.
- **Database NOT touched** — migration file only.

### Commit
- Commit hash: `9764882b02dd6bfbed96c752bd8697bdccbc4689`
- Message: `db(138): migration idempotency — conflict on enforced unique keys + ws null-guard`
