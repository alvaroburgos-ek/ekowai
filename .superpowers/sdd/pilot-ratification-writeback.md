# Pilot ratification write-back — Part 1 close-out

**Date** 2026-07-24 · **By** Alvaro (leadership@ekowai.com), written back by orchestrator · **Work** `C:\Users\Ekowai\_wt-fll` (branch `feat/fll-revision`)
**Prod** `vadsmshzebefjreqcicl` — READ-ONLY (no prod writes; MAP-node ratifications + doctrine/validator edits only).
**Doctrine** `docs/verification-doctrine.md` (SR-1..4 read in full). **Source sheet** `.superpowers/sdd/pilot-batch-signature-sheet.md`.

All 16 distinct signature items (R-8 · C-5 · T-3) ratified and written to their map nodes. Each node carries
`ratification_status` in frontmatter + a "Ratification" line in the body (who / when / decision / basis-quote).

## A) 16 ratifications written to map nodes

| # | node (map) | new severity / class | ratification_status |
|---|---|---|---|
| **R-1** | DWA-A-102-2/cr-req-22 | severity **block** (confirmed) | ratified (Alvaro, 2026-07-24) |
| **R-2** | DWA-A-102-2/cr-req-17 | severity **warn** | ratified (Alvaro, 2026-07-24) |
| **R-3** | DWA-A-102-2/cr-req-24 | severity **block** (SR-1 binding re-pull below) | ratified (Alvaro, 2026-07-24) |
| **R-4** | DWA-A-102-2/dp-01-sr2-ranges | severity **warn** (SR-2 range) | ratified (Alvaro, 2026-07-24) |
| **R-5** | DWA-A-102-2/dp-02-unratified-severities | severity **warn**, compliance-note approach | ratified (Alvaro, 2026-07-24) |
| **R-6** | DIN-18130-1/dp-03-alpha-source | severity **block** | ratified (Alvaro, 2026-07-24) |
| **R-7** | DIN-18130-1/dp-02-versuchsklasse (+ cr-din18130-03) | severity **warn** | ratified (Alvaro, 2026-07-24) |
| **R-8** | DIN-18130-1/eq-gl9-k-fall | severity **warn** (engineer-entered+attested; `ln`=T-3) | ratified (Alvaro, 2026-07-24) |
| **C-1** | DWA-A-102-2/dp-03-bild4-regression | classification **exemplary** | ratified (Alvaro, 2026-07-24) |
| **C-2** | DWA-A-102-2/eq-18-e0 | class **normative-as-input-reference** (NEW) | ratified (Alvaro, 2026-07-24) |
| **C-3** | DWA-A-102-2/dp-04-kostra-hna | classification **exemplary** | ratified (Alvaro, 2026-07-24) |
| **C-4** | DIN-18130-1/dp-01-worked-examples | classification **exemplary** | ratified (Alvaro, 2026-07-24) |
| **C-5** | DIN-18130-1/tab-04-vklasse (via dp-02) | classification **normative** | ratified (Alvaro, 2026-07-24) |
| **T-1** | DWA-A-102-2/eq-4, eq-b5, eq-b17, eq-26 | `Sum()` aggregator engine add | ratified (approved code-fix) |
| **T-2** | DWA-A-102-2/eq-t6vs, eq-6, eq-t6af, eq-21b, eq-b23b | `Max/Min(;)`→`,` hygiene + normalizer | ratified (approved code-fix) |
| **T-3** | DWA-A-102-2/eq-regbild4 + DIN-18130-1/eq-gl9-k-fall | `ln()` engine add | ratified (approved code-fix) |

T-1/T-2/T-3 queue for the sweep's fix phase — **NO code implemented in this run** (findings over fixes).

## R-3 SR-1 binding-quote re-pull (verbatim + page)

The signature sheet's R-3 cell paired m_min=7 with a nearby "**sollte**" (the *verdünnende-Wirkung* clause, p.69)
and flagged the 7-floor as ambiguous. Per SR-1 a fresh in-session `pdftotext -layout` re-read of DWA-A-102-2
Part 3 was performed. The m ≥ 7 threshold is stated under **§7.3.4.2 with a binding modal, on printed page 53**:

> "Für jedes Regenüberlaufbecken **ist zu überprüfen**, ob im langjährigen Mittel ein Mindestmischverhältnis m
> nach Gl. [22] **eingehalten wird**." — and Gl. [22]: "**m ≥ 7  für c_T,aM,CSB ≤ 600 mg/l**". (DWA-A-102-2 **p.53**)

Corroborating binding clause §7.3.4.5 p.55: "Für den nach Gl. [26] ermittelten Drosselabfluss **ist** das
Mindestmischverhältnis mRü **nachzuweisen**." The "sollte" governs only whether an Außengebiet's diluting effect
may improve m — it does NOT govern the m_min=7 requirement. **The binding "ist zu überprüfen … eingehalten wird"
clause overrides the pilot summary's "sollte" reading → m_min=7 binds → severity block.** Logged on the node as
"SR-1: verbatim binding quote overrode the pilot summary." (R-1's "muss" p.34 and R-2's Tab.6 p.51 quotes were
likewise re-confirmed from the fresh Part 2 extraction.)

## B) New data_class `normative-as-input-reference` (3 places)

Definition: *a value/formula that is normative (printed in the standard; PDF page required) AND is consumed as a
reference input by other nodes (has `consumed_by::` edges) rather than being a free `engineer_input` or a purely
local `derived` result. Distinct from `standard_fixed` (a printed constant), `derived` (locally computed, no
independent normative standing), and `engineer_input`.*

1. **`docs/verification-doctrine.md`** — added to the data_class section (main-worktree copy; the branch has no
   tracked/on-disk copy of the doctrine, so per the mandate the main-worktree copy was edited — noted here).
2. **`_template-node.md`** data_class enumeration — updated in all three template copies (DWA-A-138-1 canonical +
   DIN-18130-1 + DWA-A-102-2), plus invariant **#8** added to each: `normative-as-input-reference` ⇒ source_page
   AND ≥1 `consumed_by::`.
3. **`scripts/reasoning-map/validate.mjs`** — accepts the new value; new check `#8` enforces source_page (like
   `standard_fixed`) AND ≥1 `consumed_by::`. `KNOWN_BUILDS = gitCommitsExist()` left intact.

Applied to C-2 node `eq-18-e0` (Gl.(18) e_0, p.49): class set to `normative-as-input-reference`, `consumed_by::`
edges added to `[[eq-t6vs-vs]]` (V_s) and `[[eq-14-bre]]` (B_R,e). Check #8 = pass 1/1 for both invariants.

## C) Re-validate — GREEN

**Unratified decision-points (before → after):** **32 → 25** (dropped by the **7 pilot decision-points**:
DIN dp-01/dp-02/dp-03 + A-102-2 dp-01/dp-02/dp-03/dp-04). Pilot DPs still unratified = **0**. The other 9
signature items sit on non-DP nodes (cr-req/eq/tab), which the `unratified` query enumerates only for
decision-points; all 9 are ratified in frontmatter (verified per-node).

**Full validator run (real vault maps) — raw tail:**
```
  8.norm-input-ref-consumed pass=1  fail=0
  8.norm-input-ref-has-page pass=1  fail=0

  ERRORS = 0   WARNINGS = 2

── Findings ──
  [WARN] 2.eq-node-has-db · DWA-A-138-1 · balance — map equation produces 'balance' absent from DB (orphan)
  [WARN] 2.eq-node-has-db · DWA-A-138-1 · condition — map equation produces 'condition' absent from DB (orphan)
EXIT=0
```
`ERRORS = 0`. The 2 WARNINGS are the pre-existing DWA-A-138-1 boolean-output orphans (unchanged from baseline).

**5-error proof (no regression from the validator edit):** copied the vault maps to a fixtures dir, ran
`seed-known-errors.mjs`, then `validate.mjs --maps <fixtures>`:
```
Seeded 5 defects into fixtures copy:
  (a) dangling link  -> DWA-A-138-1/eq-gl2-a138-07
  (b) VA w/o build   -> FLL-GAR-2023/cr-gar-req-08 (deadbee)
  (c) dead CR        -> FLL-Naturteich-2017/cr-fllnt-req-seeded-dead
  (d) missing page   -> FLL-TP-RHIZOM-2023/eq-rhz-13-eq1
  (e) DB orphan      -> DWA-A-138-1/cr-a138-req-02 DELETED
  ...
  ERRORS = 6   WARNINGS = 3
PROOF EXIT CODE = 6
```
Exit **6** (defect (c) legitimately raises 2 errors: dead-gate + orphan-node; a+b+d+e = 4). All 5 seeded
defect classes still caught → the `#8` check added no regression.

## Residue (honest)
- **R-DIN (scanned PDF):** DIN-18130-1 has no text layer; R-6/R-7/R-8/C-4/C-5 basis-quotes are the map-recorded
  VA reads (page-referenced, flagged on each node), not fresh in-session extractions.
- **C-3 (NR by acquisition):** h_Na's governing value lives in KOSTRA-DWD-2020 (out of library); ratified as
  exemplary/guidance within A-102-2 until the doc is acquired.
- T-1/T-2/T-3 are approved code-fixes staged for the fix phase — no code written this run.
