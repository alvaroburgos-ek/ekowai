# FLL D-1 RERUN — corrected D-1 (harness-only), STEP 1 / task 1b

**Task:** Execute the CORRECTED D-1. The original "missing-column / F-8 / 51-worksheet / browser-save-500"
premise was overturned + verified in the 1a diagnostic: `project_parameters` is a fixed KEY-VALUE table
(no per-symbol column → "missing column" is structurally impossible for a field driver); a missing field
id is *skipped with a warning*, never a 500; and no chain returned a save-error. This task therefore does
the real, in-scope work: fix the **seeder fixture-drift** so every previously-un-runnable chain runs through
the REAL `saveWorksheet`, close the residual **gate-condition-symbol parse**, re-run to VA, and produce the
below-VA work-list.

**Doctrine:** `docs/verification-doctrine.md` — SR-1 (verbatim source before apply), SR-2 (ranges surfaced),
SR-3 (rendered PDF = ground truth; VA needs a PDF-page ref; markdown-only = VC), SR-4 (infra for an approved
mandate is auto-approved — pick prod-reality-consistent option, log rationale). Followed.
**Prod (READ-ONLY):** Supabase `vadsmshzebefjreqcicl` via Supabase MCP `execute_sql`. **No prod writes.**
**Worktree/branch:** `C:\Users\Ekowai\_wt-fll`, `feat/fll-revision`. **Harness:** `pnpm vitest run --project integration <file>`.

---

## 0. SR-4 auto-approved infra decisions (logged per doctrine)

| # | Decision | Rationale (prod-reality-consistent) |
|---|---|---|
| D-1 | Extend `FieldSpec.section` type to `string | null` and seed the 7 drift fields **UNSECTIONED** (section_id=NULL) rather than forcing them into a section. | Live prod shows all 7 driver fields carry `section_id IS NULL`. The seeder must mirror prod EXACTLY (its stated contract). Forcing a section would make the fixture *diverge* from prod — the opposite of the fix. The section_id=NULL is a prod quirk, batched separately (§5), not "fixed" by the harness. |
| D-2 | Seed `swimming_area_m2` on FLLNT-11 **in addition to** FLLNT-06 (not "move" it). | Prod owns TWO active copies: FLLNT-06 (section C, order 0) AND FLLNT-11 (unsectioned, order 100). EQ-04 (`overflow_edge_length = 0.01 * swimming_area_m2`) lives on FLLNT-11 → needs a local copy to resolve worksheet-locally. Diagnostic said "move"; prod reality says "duplicate", so I matched prod. |
| D-3 | Close the gate-symbol parse (task 2) as an **integration test using the REAL `evaluate.ts` tokenizer** (new export `extractConditionSymbols`) against a **frozen live prod snapshot** of fields+conditions. | Uses the production parser (not a hand re-implementation) so the check is authoritative; freezing the read-only snapshot keeps it hermetic. The `extractConditionSymbols` export is inert (pure AST walk), no behavior change to `evaluateCondition`. |
| D-4 | Stage the section_id=NULL prod fix as `_STAGED_…​.sql` (prefix skips the runner) + rollback, scoped to the 7 drivers only. | Prod write outside the harness mandate → SR-4 STOP-and-batch. `_STAGED_` prefix guarantees the migration runner never auto-applies it. |

---

## 1. Seeder fixture-drift fix (task 1) — DIFFS APPLIED

All changes are in **`tests/harness/seed-fll-naturteich.ts`** (harness fixture; NOT a prod migration —
prod is already correct). Verified against live prod field set (read-only, 2026-07-24).

**Prod parity table (live `fields`, active=true):**

| Worksheet | Field | data_type | unit | order_index | section_id (prod) | Seeder before | Seeder after |
|---|---|---|---|---|---|---|---|
| FLLNT-10 | `F_filter` | number | m² | 160 | **NULL** | absent | seeded, unsectioned |
| FLLNT-10 | `h_filter` | number | m | 170 | **NULL** | absent | seeded, unsectioned |
| FLLNT-11 | `swimming_area_m2` | number | m² | 100 | **NULL** | on FLLNT-06 only | +FLLNT-11 (unsectioned) |
| FLLNT-01 | `attest_fllnt_01_req_03` | boolean | – | 0 | **NULL** | absent | seeded, unsectioned |
| FLLNT-01 | `attest_fllnt_01_req_04` | boolean | – | 0 | **NULL** | absent | seeded, unsectioned |
| FLLNT-12 | `attest_fllnt_12_req_25` | boolean | – | 0 | **NULL** | absent | seeded, unsectioned |
| FLLNT-13 | `attest_fllnt_13_req_28` | boolean | – | 0 | **NULL** | absent | seeded, unsectioned |

Net: FLLNT-10 seeder field count **15 → 17** (matches prod-active 17). FLLNT-01 4→6-ref (2 attest added),
FLLNT-11 +1, FLLNT-12 +1, FLLNT-13 +1.

**Mechanism edits (to support unsectioned fields, mirroring prod):**
- `FieldSpec.section: string` → `string | null` (with a doc comment tying NULL to the prod quirk + §5 batch).
- Section-materialisation loop filters out `null` section codes; field INSERT passes `section_id = NULL` for them.
- **Stale header comment CORRECTED** (task 1 sub-item): the old L30-33 claim that `F_filter/h_filter` are
  "NOT fields on the standard … missing exactly as on prod" was **false**. Replaced with the verified truth
  (both ACTIVE on FLLNT-10, order 160/170, unsectioned) + the parity note for the other drivers.

---

## 2. Residual gate-condition-symbol parse (task 2) — CLOSED

New test **`tests/harness/fll-gate-symbol-parse.integration.test.ts`** + new export
`extractConditionSymbols` in `src/lib/compliance/evaluate.ts`. It tokenizes **every FLL
`compliance_requirements.condition`** with the REAL evaluator, extracts the symbols the evaluator would
LOOK UP (aref/existence/membership/truthy/compare/arithmetic operands — excluding enum-value literals in
`IN {…}`/`==` position and keywords), and checks each against the live prod active-field set of the SAME
standard.

**RAW result:**
```
[gate-symbol-parse] conditions=85 parsed=80 manual(prose)=5 missing-column=0
[gate-symbol-parse] manual(prose): ["FLL-GAR-2023:REQ-06","FLL-GAR-2023:REQ-08","FLL-GAR-2023:REQ-09","FLL-GAR-2023:REQ-11","FLL-GAR-2023:REQ-24"]
 ✓ … finds ZERO missing-column across all 3 FLL standards 5ms
 ✓ … the un-parseable conditions are exactly the known natural-language prose gates 1ms
 Test Files  1 passed (1) · Tests 2 passed (2)
```

**Verdict:** across all 85 FLL gate conditions, **0** reference a symbol lacking a backing prod field. The 5
un-parseable conditions are the documented natural-language PROSE gates (M2 findings: ice-pressure, Tab.1
slope, engineer-judged ×2, Wurzelschutzbahn) — not a missing-column. Combined with the 1a equation-symbol
check (`[]`), the **missing-column class is now provably EMPTY for both equations AND gates across all 3 FLL
standards.**

---

## 3. Re-run to VA (task 3) — previously-un-runnable chains now GREEN

New test **`tests/harness/fll-d1-rerun.integration.test.ts`** drives each drift-blocked chain through the
REAL `saveWorksheet` (persist inputs → read back → real `evaluateFormula`/`evaluateCondition` → assert live
result). **SR-3 PDF ground truth verified this session** from the rendered Naturteich PDF (2017 EN
translation) via scoop `pdftotext -layout`:

- **PDF p.85** (Appendix 5): *"Filter cross-section F: 15 m2 / Filter height: 0.7 m / … 600 m2/m3 x 15 m2
  x 0.7 m = 6300 m2"* and *"95 m² x 50 = 4750 m² … 4750 m² / 600 m² / m³ = approx. 8 m³ … / 1200 … approx. 4 m³"*.
- **PDF p.57:** *"Example: Swimming area 30 m², 1% of 30 = 0.3 i. e. length of the overflow edge 0.3 m."*

**RAW result:**
```
 ✓ seeder now mirrors prod: FLLNT-10 has 17 fields incl. F_filter/h_filter (unsectioned) 2ms
 ✓ EQ-02 GREEN/VA — persist F_filter+h_filter via real save, evaluator = PDF p.85 (600×15×0.7=6300) 597ms
 ✓ EQ-03 GREEN/VA — 95×50/600 ≈ 8 m³ ; /1200 ≈ 4 m³ (PDF p.85 Example 2a/2b) 1ms
 ✓ EQ-04 GREEN/VA — swimming_area_m2 persists on FLLNT-11, derived edge = 0.3 m (PDF p.57, 30 m²) 22ms
 ✓ FLLNT-01 REQ-03/REQ-04 GREEN — attest booleans persist via real save + gates fire pass/fail 23ms
 ✓ FLLNT-12 REQ-25 GREEN — attest_fllnt_12_req_25 persists via real save + gate fires 7ms
 ✓ FLLNT-13 REQ-28 GREEN — attest_fllnt_13_req_28 persists via real save + gate fires 6ms
 Test Files  1 passed (1) · Tests 7 passed (7)
```

**No-regression re-run** of the 6 existing FLLNT test files touched by the seeder change:
```
 Test Files  6 passed (6) · Tests 33 passed (33)
```
(verify-fll-naturteich-fllnt10 / fllnt11-verify / seed-fll-naturteich.smoke / fllnt12-verify /
verify-fll-naturteich-fllnt01 / verify-fll-naturteich-fllnt13). Typecheck of touched files: clean.

**What is VA now (was un-runnable):**

| Chain | Node | Status now | PDF ref |
|---|---|---|---|
| FLLNT-10 EQ-02 (colonized surface = grain·F·h) | derived value | **VA** — real save + evaluator = 6300 | p.85 |
| FLLNT-10 EQ-03 (filter volume) | derived value | **VA** — 8 m³ / 4 m³ | p.85 |
| FLLNT-11 EQ-04 (overflow edge length) | derived value | **VA** — 0.3 m, stamped `derived` | p.57 |
| FLLNT-01 REQ-03/REQ-04 | attest gate topology | **VA (gate-topology)** — driver active on prod; gate fires off a real saved boolean | attest (no numeric value) |
| FLLNT-12 REQ-25 | attest gate topology | **VA (gate-topology)** | attest |
| FLLNT-13 REQ-28 | attest gate topology | **VA (gate-topology)** | attest |

Note: EQ-01 (`filter_colonized_surface_actual >= 50 * pool_underwater_surface`) is the inequality-as-producer
whose boolean output the engine can't compute — mitigated `displayOnly` (M2 finding, unchanged here).

---

## 4. Below-VA work-list (task 4) — definitive, named with WHY

After this task, the FLL nodes still below VA are:

### 4.A NR / genuinely unreachable (engine/document limit — do NOT fix per doctrine)
- **GAR-22 Eq 2b `g_prime >= (Δu·γ_A − (γ_F'·d_F + γ_Di'·d_Di)) / cos(beta)`** — **NR (trig-blocked)**. The
  arithmetic engine (`src/lib/eval/arithmetic.ts`) implements only min/max, no cos/sin/tan. The
  Mindestauflast-vs-uplift check cannot be auto-evaluated → engineer-manual. Engine NOT fixed (doctrine).
  This is the ONLY genuine trig-blocked equation across all 65 FLL worksheets.
- **GAR-22 Anhang-2 equations (Flächengewichtsberechnung)** — informative (labelled "(informativ)" in the
  standard) + no printed worked example → chains 2a/2c stay **VC illustrative**, cannot reach VA.

### 4.B VC — markdown-only, needs a PDF-page confirm to reach VA (SR-3)
- **GAR-17/R3** (quote read from `pdf/GAR.txt` markdown) — VC until PDF-page confirmed.
- **FLLNT-06/R1** (`Naturteich.txt`), **FLLNT-12/F1** (quote-scope), **FLLNT-13/F3** (§11.1 "3 working days",
  §12.4 repairs) — VC; the verbatim anchors exist in the markdown extract but were not re-rendered PDF-page
  this task. (Note: the Naturteich PDF IS now rendered — these are cheap to lift next task.)
- The bulk of the **126 M2 findings** that rest on the searchable `-layout` extract are treated VA in M2 but
  any not carrying an explicit PDF-page ref formally sit at **VC** until page-cited.

### 4.C R-noeq — no computable chain (expected; not a gap)
- 0-equation data-collection / attestation worksheets have no formula to drive (GAR-05/-06/-15/-16/-17/-18/-20,
  FLLNT-04/-07/-08, RHZ report/scope sheets, …). Only a persistence round-trip is possible → **VC**. There is
  no numeric ground truth to assert VA against — correct for `data_collection`.

### 4.D DS ceiling (Naturteich) — decision, now liftable
- **FLLNT-10 EQ-01 / FLLNT-11 EQ-05** carried the standing `⚠ DS (kein PDF, DS-Decke, NIE VA)` note. That
  premise is **stale**: the 2017 EN PDF exists and was rendered this session. EQ-01/EQ-05 are
  inequality-as-producer (correctly `displayOnly`); they remain **VC** pending an explicit page-level
  re-verify of the ≥-relations (decision 3.E-24 in M2). Not lifted here (out of task-3 drift scope).

---

## 5. STOP-and-batch (task 5) — prod data quirk, NOT applied

**Item:** prod driver fields carry `section_id = NULL` (render section-less). This is a prod WRITE outside the
harness mandate → **staged written-not-applied**, batched for Alvaro. **Nothing applied.**

- **Staged migration:** `supabase/migrations/_STAGED_20260724120000_fll_d1_driver_section_backfill.sql`
  (the `_STAGED_` prefix makes the runner SKIP it). Assigns the **7 D-1 driver fields** to their worksheet's
  "C" section. **Rollback:** `scripts/rollback-_STAGED_20260724120000-fll-d1-driver-section-backfill.sql`
  (sets them back to NULL).
- **SCOPE WARNING for Alvaro (live-confirmed this session):** the `section_id=NULL` quirk is **much broader**
  than the 7 drivers — it also affects, on prod: GAR-10 (11 fields), GAR-22 (12 geometry fields), GAR-27
  (4 rainfall fields), and most RHZ worksheets (RHZ-03/-10/-11/-14/-15/-16/-19/-21), plus more FLLNT. A full
  backfill needs a **per-field section decision** and is NOT auto-generated here.
- **PHANTOM-ROW OVERLAP (do NOT section these):** several `section_id=NULL` "fields" are the spurious
  enum-VALUE rows from separate M2 findings and must be **DELETED, not sectioned**: `type_III` (FLLNT-03),
  `emersed`/`submergent`/`vertical_continuous_overflow`/`vertical_no_overflow` (FLLNT-09), and the GAR-10
  material tokens (`alkalisilikat`, `bahn_bitumen`, `mineralisch_*`, `verbundwerkstoff_gtd`, …) which are
  enum discriminators leaked as fields. Cleaning these is a distinct ratification (M2 §3.D-22).

**Needing ratification (carried from M2, not decided here):** the SR-2 range picks, gate-topology rulings, and
single-source consolidations in M2 report §3 remain open — unchanged by this task.

---

## 6. Bottom line

- **VA now (new):** FLLNT-10 EQ-02, FLLNT-10 EQ-03, FLLNT-11 EQ-04 (PDF p.85/p.57); FLLNT-01 REQ-03/04,
  FLLNT-12 REQ-25, FLLNT-13 REQ-28 (gate-topology VA). All driven through the REAL `saveWorksheet`.
- **Missing-column class: EMPTY** — proven for equations (1a, `[]`) AND gates (this task, 0/85). No prod
  schema/field is missing for FLL.
- **Still VC/NR:** GAR-22 Eq 2b (NR, trig); GAR-22 Anhang (NR, informative); the markdown-only VC quotes
  (GAR-17/R3, FLLNT-06/-12/-13); R-noeq data-collection sheets; FLLNT-10 EQ-01 / FLLNT-11 EQ-05 DS ceiling
  (VC, now liftable).
- **Batched, not applied:** `section_id=NULL` backfill (7 D-1 drivers staged; broader set + phantom-row
  cleanup flagged) → Alvaro.
- **Prod untouched.** All fixes are harness/lib (seeder + one inert evaluator export + tests). Gates task 1c.
