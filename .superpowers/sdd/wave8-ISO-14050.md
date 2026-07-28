# Wave-8 — ISO-14050:2020 (Environmental management Vocabulary) — complete, fixes applied

**Ledger header** — model `claude-fable-5` · 2026-07-28 · run `wf_b18d9326-071` (2 agents,
118k tokens) · first NON-COMPUTATIONAL standard (0 eq, 0 tables). Offset **+6** (roman
front matter=0; arabic printed p.N = PDF sheet N+6), verified.

## The premise REVERSED — this is a complete encoding, not a subset
I assumed 25 fields = curated subset of a large vocabulary. **Wrong.** The 12 enum-selector
fields carry all **354 terms verbatim** (per-cluster enum counts match printed term counts
exactly: 21/35/6/51/28/51/23/26/39/24/5/45 = 354). **Term coverage = 354/354 = 100%.** The
13 concrete numeric fields additionally surface quantifiable terms as typed inputs; 24/25
fields FAITHFUL. Verdict: **ready-to-use, honestly reference-grade, complete.**

## And the map's "PDF MISSING" gate was FALSE
The map was wave-0-generated believing no PDF existed (`doc-iso-14050-pdf-missing` node,
`_index` "Not derivable — PDF MISSING"). **The PDF exists** — read in-session, 80pp, offset
derived, 354 definitions verified. Gate lifted: node annotated superseded, `_index` updated
to offset +6, provenance lifts EV→VA for the verified content.

## APPLIED (all source-settled, re-verified in-session per R-2)
1. **6 CR quotes backfilled** (migration `20260728120000`) — all 6 advisory CRs
   (warn/manual/reference-only) now carry verbatim definitions; effect verified (6/6 quoted).
2. **§3.11.5 enum extraction-bleed fixed** — carbon_offsetting description had the next
   subclause header (" 3.12 Terms relating to economy and finance") bled in; printed def ends
   at "under study" (confirmed on the page). Stripped; verified (0 remaining).
3. **6 CR map nodes built** (`cr-iso14050-001..006`) — cleared the 6 `2.cr-db-has-node` errors.
4. **Validator extractor fix** — `extractCrCode` didn't handle bare `CR-NNN` codes (built for
   prefixed `<STD>-CR-NN`). Added a fallback. **CORPUS-WIDE EFFECT: ERRORS 3340 → 2997, a drop
   of 343** — every ISO/vocabulary map storing bare CR codes was falsely flagged orphan.
   Verified correct: `2.cr-node-has-db` fails held at 17 (no mis-match spike); the remaining
   924 `cr-db-has-node` fails are genuine missing-node orphans in wave-0 maps.

## Judgment (sheet K)
CR-001 and CR-002 **over-assert**: CR-001 implies other ISO 14000 docs *should* apply these
definitions (not printed in 14050); CR-002's "interpret only within the <>-domain" is the ISO
Directives convention, not printed text. Both are warn/reference-only so harmless, but the
scope claim exceeds the source. Quotes backfilled are the verbatim printed text only.

## Seven-element status (vocabulary-adjusted)
Coverage ✅ 354/354 · equations n/a · tables n/a · gates n/a (all advisory) · source-settled
fixes ✅ (3 applied) · map write-back ✅ (6 nodes + gate lift) · deployed harness — n/a
(nothing computes). **This standard is effectively DONE bar the K-D1 over-assertion ruling.**
