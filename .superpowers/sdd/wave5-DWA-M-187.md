# Wave-5 — DWA-M-187 (Sonderanwendungen RBF, September 2025 ENTWURF) — audit complete

**Ledger header** — model `claude-fable-5` · CLI 2.1.218 · effort max · 2026-07-27 ·
run `wf_66003b8b-2a8` (9 agents, 781k tokens, 216 tool calls) · **read-only, 0 prod writes**
· DRAFT DOCTRINE: all fixes STAGED, deferred to the Weißdruck.
Full structured results: `tasks/wvd7w1u3c.output` + journal.

## Offset = 0 (printed = PDF), high confidence — 6 footer readings + full TOC cross-check.
Body PDF 9–41; PDF 45–48 unnumbered adverts.

## Tables — VERIFIED, not re-captured
All **65 existing `regulation_tables` rows checked; 10+ cells spot-checked against rendered
pages: ZERO value mismatches; no printed table missing.** But **27 rows are schema-broken**:
columns shifted (status string in `clause_reference`, cell value in `variant_value`, quote in
`verification_status`). Values right, storage wrong. **Staged fix M187-F3** — storage-schema
repair, values unchanged, draft-safe (our artifact, not the draft's content).

## The three material findings (all STAGED)
1. **M187-F1 — collision kills the standard's ONLY genuine calculation.** The §5.5.4
   Klein-RBF equations (`A_F`, `ok_boolean`) are duplicated on **both M187-09 and M187-22**
   → the collision guard blanks them pre-evaluation → the filter-area sizing/Nachweis never
   computes and REQ-06 (reads `A_F`) is crippled. Same A-178/M-102-4 class.
2. **M187-F2 — mis-homed gates.** Block CRs REQ-02..06 are piled onto M187-05/07/08/09
   instead of the data-collecting worksheets; several reference operands absent from their
   host (REQ-03/04 need `q_Dr_RBF` which lives only on ungated M187-06; REQ-05/06 duplicated
   onto M187-07 where operands don't exist → vacuous copies). **M187-21/22 (Klein-RBF) carry
   no block gate at all.** The proven VSME/A-201 re-home pattern applies at Weißdruck.
3. **M187-F4 — ungated minima (fields exist, no CR):** EBCT≥15 · v<5,0 · hFK_SS≥1,25 ·
   ≥2 Sorptionsstufen · Fe>35 % · P-Grundbeladung<0,2 · UV≥200 J/m² · Förderleistung≥6 ·
   4 Teilfilter · Vmin 50 m³ · hFK≥0,25 · DN 50 · hDrän≥0,1 · ηAFS63≥95 % · b_krit=7 —
   plus worksheet mislabels (M187-08 "Melioration" holds §5.4 CSB; M187-09 "Sorptionsstufe"
   holds §5.5 Klein-RBF).

## Verdict
**Data-value layer broadly FAITHFUL (zero table mismatches, numeric values verified).
Enforcement + calculation layer substantially broken. NOT ready-to-use.** All repairs are
one Weißdruck-signature away from a clean staged fix wave: collision de-dup (F1), gate
re-homing (F2), storage repair (F3), gate authoring for F4 (severities = rulings).

## Seven-element status (draft-adjusted)
Bidirectional walk ✅ · equations ✅ (4/4 via run) · tables ✅ verified · gates both-ways ✅
(detail in output file) · fixes **STAGED not applied (draft doctrine)** · map write-back —
n/a for fixes (none applied); audit nodes owed at Weißdruck wave · deployed harness — with
the campaign-alias element, shared backlog.
