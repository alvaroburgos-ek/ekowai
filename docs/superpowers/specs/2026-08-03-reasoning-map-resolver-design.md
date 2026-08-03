# Reasoning-Map Resolver — design spec (2026-08-03)

## Purpose
Turn the reasoning map from a system that *surfaces* rulings into one that *resolves* the
deterministic ones itself — grounded in the original PDF and the map's own decision doctrine —
while keeping every enforcement change behind a one-click owner gate.

Today an audit agent compares the encoding against the source PDF and emits a **ruling** (e.g.
"block gate rests on `sollte` text"). A human then decides. But many of those rulings are not
judgment calls: they follow deterministically from rules the reasoning map already encodes
(SR-2 modal→severity; no-source→remove; full-domain enum→no-op). This spec builds a **deterministic
resolver** that applies those rules automatically, stages the result, and escalates only genuine
ambiguity.

## Owner decisions (ratified 2026-08-03)
- **Autonomy = stage, owner one-clicks.** The resolver resolves a ruling via the map rule and writes
  a WRITTEN-NOT-APPLIED migration with the rule id + verbatim PDF quote. Enforcement changes only on the
  owner's apply command.
- **Scope = durable + backfill.** The resolver is a permanent stage in the reasoning-map pipeline, run on
  every standard now and future. Its first run resolves the rulings already catalogued in
  `.superpowers/sdd/PROVENANCE-RULINGS-SIGNOFF.md` (sections A–G, dozens of line items across ~35 standards).
- **Architecture = declarative rule catalog + deterministic engine** (not per-rule scripts, not an
  LLM-in-the-loop resolver).

## Core principle: split evidence from decision
The failure mode to avoid is LLM judgment inside an enforcement-changing step (non-reproducible, un-auditable).
So responsibilities split:
- **The audit agent extracts EVIDENCE** — the thing it is good at and that is verifiable: which modal verb
  governs a clause, whether a threshold is actually printed, the verbatim quote. No decision.
- **The catalog rule makes the DECISION** — deterministically, from the evidence. Same evidence → same
  decision, every run.
- **The engine STAGES** the decision as a reversible migration + a decision-log row.

## Architecture & data flow
```
audit subagent (reads PDF)  →  EVIDENCE RECORD (structured, per gate/equation)
                                        ↓
scripts/reasoning-map/resolve.mjs  →  matches DECISION-RULE CATALOG against evidence
                                        ↓
              ┌─────────────────────────┼──────────────────────────┐
     rule fires + VA evidence     rule fires but unsafe        no rule / ambiguous
              ↓                         ↓                            ↓
   staged migration + rollback   escalate (louder flag)      escalate to sign-off
   + RESOLVER-DECISIONS ledger    → sign-off sheet            (value/range/scope)
              ↓
      owner: one apply command
```
The resolver runs as a stage **after** `scripts/reasoning-map/validate.mjs`, consuming validator findings
plus the evidence records. New module: `scripts/reasoning-map/resolve.mjs`. Catalog: `scripts/reasoning-map/resolver-catalog.ts` (data).

## Component 1 — Evidence record
Per gate/equation the audit agent emits a machine-checkable record (no judgment fields):
```ts
type Evidence = {
  target_id: string;
  type: 'gate' | 'equation';
  clause_ref: string;
  condition_or_formula: string;
  source_quote: string;                 // already backfilled to prod
  modal_verb: 'muss'|'soll'|'sollte'|'should'|'shall'|'empfohlen'|'bevorzugt'
            | 'present-indicative'|'none'|'mixed';
  threshold_in_source: 'true'|'false'|'approximate'|'example';  // "ca."/"z.B."/"in der Regel" → example
  printed_value: string | null;
  enum_domain_coverage: 'exact'|'partial'|'full' | null;        // for IN{} gates
  field_type: 'boolean'|'number'|'enum'|'text';
  provenance_grade: 'VA'|'VC';
  edition: 'weissdruck'|'gelbdruck'|'dis'|'fdis'|'published';
};
```
Most fields were already produced during the source_quote backfill; this formalizes the contract.

## Component 2 — Decision-rule catalog (initial classes)
Each rule = `{ id, detector(evidence)→bool, resolution(target)→change, risk, escalate_if(evidence)→bool }`.

| id | detector | resolution | risk | escalate if |
|---|---|---|---|---|
| `R-CLAUSEREF` | requirement located at clause ≠ `clause_reference` | update `clause_reference` | zero (metadata) | — |
| `R-MODAL-SEVERITY` | block gate, `modal_verb ∈ {soll,sollte,should,empfohlen,bevorzugt,present-indicative}` | `severity → warn` | med (stops enforcing; cannot create a false block) | `modal_verb == mixed` |
| `R-THRESH-EXAMPLE` | `threshold_in_source ∈ {example, approximate}` | `severity → warn` (value illustrative) | med | same value appears as a hard limit elsewhere in-source |
| `R-THRESH-UNSUPPORTED` | numeric threshold, `threshold_in_source == false` | `severity → warn` + `quarantine` flag; **never delete the number** | high (always loud-flagged) | — (always staged, never silent) |
| `R-ENUM-FULLDOMAIN` | `IN {entire enum domain}` | rewrite → `IS NOT NULL` (canonical no-op repair) | med | — |
| `R-ENUM-UNDERINCLUSIVE` | source lists N types, gate `IN {< N}` | add the missing **source-printed** members | med | any candidate member not verbatim in the source |
| `R-EQ-GL13` | formula symbol/case ≠ its own declared fields | fix the symbol (source-settled class) | low | — |

Adding a class later = one catalog row + one unit test. New defect classes found on future standards become
new rules (continuous-improvement loop, per the campaign skill).

## Component 3 — Hard safety invariants (engine-level, not per-rule)
1. Resolve **only** when the map rule AND **VA** evidence agree. VC/OCR-only evidence → enforcement-changing
   classes escalate (zero-risk metadata classes may still resolve).
2. **Draft editions (Gelbdruck/DIS/FDIS) always escalate** — values/clauses shift in the Weißdruck.
3. Every resolution is a **WRITTEN-NOT-APPLIED** migration + rollback, idempotent, risk-tagged. Enforcement
   changes only on the owner's apply command.
4. The ambiguous set — pick-a-value-among-candidates, pick-a-range, scope questions — **never** auto-resolves
   (SR-2 preserved).
5. **Never delete** a source value; the unsupported-threshold class quarantines (severity→warn + flag), it
   does not remove the number.

## Component 4 — Output & the shrunk sign-off
Per standard-per-class:
- `scripts/migrations/<ts>_resolve_<std>_<class>.sql` (WRITTEN-NOT-APPLIED) + matching rollback.
- A row in `.superpowers/sdd/RESOLVER-DECISIONS.md`: rule id · target · before→after · verbatim quote ·
  one-line apply command.
The owner reviews a batch and applies with one command. What remains on the *human* sign-off sheet is only
true judgment — the "ratify-and-confirm, not find-and-fix" end state.

## Component 5 — Pipeline integration & continuous improvement
- `resolve.mjs` is invoked after `validate.mjs` in the reasoning-map run; every standard is processed.
- A new defect class discovered mid-audit becomes a new catalog rule in the same wave and re-runs against all
  previously-resolved standards (continuous-improvement rule 1).
- The triage table / convergence artifacts gain a "resolved-staged" vs "escalated" count per standard.

## Testing
- **Unit test per catalog rule:** evidence fixture → expected resolution or escalation.
- **Golden set:** the rulings catalogued in `PROVENANCE-RULINGS-SIGNOFF.md` (sections A–G) become fixtures;
  the resolver's first run must reproduce their hand-classification (which section/rule each maps to, and
  whether it resolves or escalates). Any divergence is a regression to inspect.
- **Reproduction check:** each staged migration is driven through the existing embedded-pg harness
  (`tests/harness/`) to prove it changes the gate as intended (broken-before → fixed-after) BEFORE the owner
  applies it — the F-4 lesson (gates that fire but never enforce) applied to the fixes themselves.

## Non-goals (explicit)
- Not auto-applying to prod (owner one-clicks).
- Not resolving ambiguous rulings (value/range/scope stay human).
- Not the provenance-grade LIFT (`imported_unverified → VA`) — that touches the UI "verified" badge and is a
  separate owner-ratified pass.
- Not an LLM resolver — decisions are deterministic catalog rules over agent-extracted evidence.

## Rollout
1. Build engine + catalog (7 classes) + unit tests.
2. Wire the evidence contract into the audit subagent brief.
3. First run over the current sign-off sheet (golden-set validated) → staged migration batches +
   `RESOLVER-DECISIONS.md`.
4. Owner reviews + applies batches by risk tier (zero-risk metadata first, then severity, then quarantine).
5. Integrate `resolve.mjs` into the standing reasoning-map pipeline for all future standards.
