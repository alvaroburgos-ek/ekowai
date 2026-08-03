# Reasoning-map resolver

Turns structured audit `Evidence` records into staged, reviewable database
migrations. It contains **no new judgment** — every rule it applies is a
mechanical, source-settled correction (see
`scripts/reasoning-map/resolver-catalog.mjs` for the six rules:
R-CLAUSEREF, R-MODAL-SEVERITY, R-THRESH-EXAMPLE, R-THRESH-UNSUPPORTED,
R-ENUM-FULLDOMAIN, R-ENUM-UNDERINCLUSIVE). Anything the evidence doesn't
fully determine is escalated to the human sign-off sheet instead of guessed.

## How to run

1. Produce one or more `Evidence` JSON records per gate/equation audited —
   see the "Evidence record (for the resolver)" section appended to
   `~/.claude/skills/regulatory-audit-fix-campaign/references/subagent-brief.md`
   for the exact field contract. Save them as a JSON array, e.g.
   `evidence-a138.json`.
2. Run the CLI with a fixed stamp (not `Date.now()` — keeps output
   reproducible across WSL/Windows):

   ```bash
   node scripts/reasoning-map/resolve.mjs <evidence.json> <stamp>
   ```

   Example:

   ```bash
   node scripts/reasoning-map/resolve.mjs evidence-a138.json 20260803120000
   ```

3. Output:
   - `scripts/migrations/<stamp>_resolve_<standard>_<rule>.sql` — one
     migration per (standard, rule) group, in the `-- WRITTEN-NOT-APPLIED`
     `DO $$…$$` idempotent format.
   - `scripts/rollback-<stamp>_resolve_<standard>_<rule>.sql` — the paired
     rollback for each migration.
   - `.superpowers/sdd/RESOLVER-DECISIONS.md` — one ledger entry per
     evidence record, staged or escalated, appended (never overwritten).
   - stdout: `migrations=<n> escalations=<n>`.

## Safety invariants

- **VA-only for enforcement changes.** Every rule with `risk !== 'zero'`
  (i.e. anything that changes a `severity`, `condition`, or gate behavior)
  refuses to stage unless `provenance_grade === 'VA'` — `'VC'` evidence
  escalates instead of auto-applying. Only `R-CLAUSEREF` (`risk: 'zero'`,
  a pure reference-pointer fix) is exempt from this check.
- **Drafts always escalate.** If `edition` is `gelbdruck`, `dis`, or
  `fdis`, every non-zero-risk rule escalates regardless of provenance
  grade — a draft standard never auto-stages an enforcement change.
- **Rule-level escalation stays authoritative.** `R-MODAL-SEVERITY`
  escalates on `modal_verb === 'mixed'`; `R-ENUM-UNDERINCLUSIVE` escalates
  on `all_members_verbatim === false`. These fire before the VA/draft
  checks and cannot be bypassed by clean provenance.
- **Everything is WRITTEN-NOT-APPLIED.** `resolve.mjs` only ever writes
  `.sql` files to disk plus a ledger entry. It never opens a database
  connection and never executes a migration. Nothing it produces takes
  effect until a human runs the apply step below.
- **Never delete a source value.** Every rule either widens (
  `R-ENUM-UNDERINCLUSIVE` only ever adds source-verified members, never
  removes), downgrades severity (`block` → `warn`, never the reverse), or
  repoints a reference (`R-CLAUSEREF`). No rule drops a threshold, a field,
  or an enum member that the encoding already carries — anything that
  would require deleting a value is a judgment call and is not in this
  catalog.
- **No rule invents a value.** Every `resolve()` output is derived only
  from fields already present in the `Evidence` record (itself a verbatim
  transcription from the rendered PDF in the auditing session) or from the
  existing `Target` — nothing is synthesized.

## Owner apply flow

Staged migrations are proposals, not applied changes. Before applying any
of them:

1. **Prove broken-before → fixed-after through the standard's own
   harness.** Run the relevant `tests/harness/<std>-verify*.integration.test.ts`
   against the current (unpatched) state to confirm it demonstrates the
   defect the migration claims to fix, then run it again after applying the
   migration (locally / in a scratch DB) to confirm it now passes. A
   migration that hasn't been driven through its harness both ways has not
   been proven — see the standing Proof Mandate.
2. Review the migration file and its paired rollback under
   `scripts/migrations/` / `scripts/rollback-*.sql`.
3. Apply it yourself (this is a human step, never automatic):

   ```bash
   node scratchpad/apply_mgmt.mjs scripts/migrations/<file>.sql
   ```

4. Re-run the harness against the now-applied state as the final raw-output
   verify, and check `.superpowers/sdd/RESOLVER-DECISIONS.md` for the
   matching ledger entry to close out.

## Escalations

Records the catalog can't safely resolve (no matching rule, a rule's own
`escalateIf`, or the VA/draft safety gate) are written to the ledger with
`action: 'escalate'` and a `reason` (`'no-rule' | 'rule-escalate' |
'draft-edition' | 'vc-evidence'`) instead of a migration. These are
sign-off-sheet items for the owner — they accumulate and never block the
next standard.
