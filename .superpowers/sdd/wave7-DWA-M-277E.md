# Wave-7 — DWA-M-277E (Greywater, English Weißdruck 2017) — audit complete, 2 fixes applied

**Ledger header** — model `claude-fable-5` · effort max · 2026-07-28 · run `wf_bf618658-e29`
(44 agents, 3.22M tokens — largest wave yet) · fixes APPLY (final standard).
Standard `4ed1a6f6-...` — 24 ws / 198 fields / 22 eq / 62 CRs / 150 table rows · SOURCE 40pp.
**Offset = +2** (printed = PDF − 2), 10 footers + TOC cross-check. Body PDF 9.

## Data/content layer — the strong half
24 worksheets track the TOC 1:1. **150 table rows = exactly the 6 printed tables; 40+ cells
spot-checked against RENDERED pages, hygiene/pathogen prioritised (TBL-3 all 6 rows, TBL-4
C1/C2 limits, all 36 Annex-B rows) — ALL EXACT.**

## APPLIED this wave (source-settled, re-verified in-session, not inherited)
1. **TBL-2 Characteristics column-shift** (migration `20260728110000`) — 4 cells were shifted
   one source-of-origin. I **re-rendered printed p16 (PDF 18) and read it myself** (the audit's
   read is another session's evidence, R-2): Shower/Bathtub/Hand-washbasin/Washing-machine
   corrected to the printed cells. Effect verified by query; rollback authored. Non-safety
   orientation metadata, but was factually mis-attributed.
2. **6 table-node `source_page` fixes** (map `[CODE]`) — tab-01=p15, 02=p16, 03=p17, 04=p20,
   05=p26, annexB=p32, each verified via caption+footer on the rendered/extracted page.
   **Note the TOC is wrong twice**: it lists Table 5 at p24 (real p26) and Table 4 at p19
   (real p20) — clause_reference/TOC unreliable, consistent with the corpus pattern.
   Validator: the 5 `8.norm-input-ref-has-page` ERRORS cleared (3345 → 3340).

## NOT ready-to-use — two blocking classes (rulings, on the sheet)
1. **The entire §9 dimensioning chain does not compute** (Q_SW → Q_GW → Q_GWT → Q_WB → V_buffer).
   Each output is duplicated across a phase-2 data worksheet AND its phase-3 calc worksheet,
   **and the worked-example rows (Ex. 9.2/9.3/9.4) share the same `output_symbol` as the live
   equations** → the collision guard blanks them all. This is the exact root of the validator's
   "Q_GW/Q_SW output lacks producing map node". Formulas also use `SUM()` (outside {min,max}).
   Same A-178/M-102-4/M-187 collision class, worst instance yet: **6 producers on Q_GW.**
2. **C2 hygiene gates fire but don't enforce (F-4 class):** REQ-08/09/14/15 guard on
   `quality_category`, absent from host M277E-10 → IF-guard resolves pending → vacuous pass;
   also duplicated onto M277E-23 where operands don't exist. And the **E. coli C2 limit
   (<1,000/100 ml) — a pathogen indicator — has a field but NO compliance_requirement at all.**

## Seven-element status
Bidirectional walk ✅ · equations ✅ (22/22) · tables ✅ verified + 1 realign applied · gates
both-ways ✅ (62 CRs) · source-settled fixes ✅ (2 applied, execution/render-verified) · map
write-back ✅ (6 source_page + realign) · deployed harness — shared backlog. Remaining =
collision/gate rulings (sheet J), then deployed render check.
