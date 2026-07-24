# FLL M2 — D-2 / D-3 / D-4 execution (STEP 1 / task 1c)

**Branch:** `feat/fll-revision` · worktree `C:\Users\Ekowai\_wt-fll`
**Prod:** Supabase `vadsmshzebefjreqcicl` — READ-ONLY except the ONE authorized D-3 apply below.
**Doctrine:** `docs/verification-doctrine.md` — SR-1 (verbatim source this session before apply), SR-2
(ranges surfaced as engineer selections, never auto-picked), SR-3 (rendered PDF = ground truth; VA
needs a PDF-page ref; markdown-only = VC), SR-4 (infra-for-mandate auto-approved; stops = prod-apply-
outside-mandate / ratified-design changes / irreversibles), findings-over-fixes, raw output for claims.
**PDF source (rendered THIS session, scoop `pdftotext -layout`, 2026-07-24):** TP-Rhizom
`fll_tp_rhizomfestigkeit_gewaesserabdichtung_2023 (1).pdf`; GAR
`fll_gewaesserabdichtungsrichtlinien_2023__2 (2).pdf`.

---

## PREMISE-CHECK (all three verified against the M2 report before acting)

| User framing | Report says | Verdict |
|---|---|---|
| "nine dead gates" = **GAR-10**, not TP-Rhizom | §2.1 GAR-10/F1: "9 of 11 gates (REQ-12,13,14,15,16,17,18,20,22)" guard the **non-existent** field `abdichtungs_art` → all 9 PENDING, never fire | **CONFIRMED.** The nine map to GAR-10. TP-Rhizom's dead gates are a *different* set (RHZ-02/-05/-16/-18/-19). Framing correct. |
| D-3: two check-encodings are BLOCK-relevant, rest ES-1 batched | §3.C-17 flags RHZ-18/RHZ-21 as "**highest priority** — gate the whole-standard pass/fail"; both live with **0 CRs** (verified read-only). RHZ-07 = 16 acceptance limits / 0 CRs is the ES-1 bulk | **CONFIRMED.** The two whole-standard verdict gates are the block pair; everything else = ES-1. |
| D-4: two F-7 range fields (value inside a standard_range, no selection record) | §3.A SR-2 picks: **GAR-23 freibord** (30 cm default reducible to ≥15 cm only "mit geeigneter Randbefestigung", §3.A-2) + **GAR-07 slope** (Tab.1 per-material ratios, free-text, §3.A-5) | **CONFIRMED.** Both are ranges whose point value is a human choice; both currently unbounded. |

Live prod ground truth (read-only, this session): RHZ-18 (`c2ead780…`) 0 CRs; RHZ-21 0 CRs;
GAR-23 0 CRs; RHZ-07 (`516cefc1…`) 0 CRs; FLLNT-03 REQ-07 = the greedy-AND condition, `block`.

---

## D-3 — TWO BLOCK checks APPLIED (authorized), rest ES-1 STAGED

### APPLIED to prod (the single authorized write) — `scripts/phase4/20260724_fll_rhz18_rhz21_verdict_block_gates.sql`
Two `block`-severity `compliance_requirements`, one per whole-standard verdict worksheet, both of which
had **0 CRs** (dead "(Gate)" / terminal-conformity sheets — a `nicht_rhizomfest` / `vorzeitig_abgebrochen`
verdict saved unblocked live per M2 RHZ-18/F1 + RHZ-21/F2). Condition `<verdict> == 'rhizomfest'`
(worksheet-local `compare`, string RHS):

| Worksheet | CR code | condition | severity |
|---|---|---|---|
| FLLTP-RHZ-18 | REQ-RHZ18-VERDICT | `pruefergebnis_rhizomfest == 'rhizomfest'` | block |
| FLLTP-RHZ-21 | REQ-RHZ21-CONFORMITY | `final_rhizom_conformity == 'rhizomfest'` | block |

**SR-1/SR-3 verbatim (VA):** §3.11 Prüfergebnis (**PDF p.12**) *"Ein Produkt gilt als rhizomfest, wenn
in allen Prüfgefäßen nach Ablauf der Prüfdauer keine Rhizomeindringungen gemäß Abschnitt 2.9 sowie keine
Rhizomdurchdringungen gemäß Abschnitt 2.10 festzustellen sind."*; §9 Prüfbericht (**PDF p.23**) *"…ein
vollständiger Prüfbericht … zu erstellen, jedoch nur, wenn sich das Produkt … als rhizomfest erwiesen
hat. Firmen und Produkte, die ohne Erfolg an der Untersuchung teilgenommen haben, erhalten keinen
Prüfbericht…"* → `vorzeitig_abgebrochen` also blocks (no Prüfbericht). §3.12 (PDF p.12) grounds the abort state.

**Semantics proven against the REAL `evaluate.ts` BEFORE apply** (`src/lib/compliance/__tests__/fll-verdict-block-gate.test.ts`):
```
 ✓ rhizomfest -> pass (does not block)
 ✓ nicht_rhizomfest -> fail (blocks)
 ✓ vorzeitig_abgebrochen -> fail (blocks, per §9 no Pruefbericht)
 ✓ unset -> pending (never a false fail)
 ✓ final_rhizom_conformity mirror gate has identical semantics
 Test Files 1 passed (1) · Tests 5 passed (5)
```

**Apply (Management-API path, `_mgmt-apply.mjs`) + read-back (read-only MCP):**
```
node scripts/phase4/_mgmt-apply.mjs vadsmshzebefjreqcicl scripts/phase4/20260724_fll_rhz18_rhz21_verdict_block_gates.sql
-> HTTP 201  []            (201 = created; trailing libuv assert = Node/Windows teardown noise only)

read-back:
[{"worksheet":"FLLTP-RHZ-18","code":"REQ-RHZ18-VERDICT","severity":"block","condition":"pruefergebnis_rhizomfest == 'rhizomfest'","clause_reference":"§3.11 / §9","requires_attestation":false,"audit_status":null,"source_quote_head":"Ein Produkt gilt als rhizomfest, wenn in allen Pruefgefaesse"},
 {"worksheet":"FLLTP-RHZ-21","code":"REQ-RHZ21-CONFORMITY","severity":"block","condition":"final_rhizom_conformity == 'rhizomfest'","clause_reference":"§3.11 / §9","requires_attestation":false,"audit_status":null,"source_quote_head":"Ein Produkt gilt als rhizomfest, wenn in allen Pruefgefaesse"}]
```
`audit_status` untouched (null). Idempotent (`INSERT … WHERE NOT EXISTS`).
Rollback `scripts/phase4/rollback-…`, verify `scripts/phase4/verify-…`.

### STAGED (ES-1, written-not-applied) — `supabase/migrations/_STAGED_20260724130000_fll_check_encodings_es1.sql`
RHZ-07 (`516cefc1…`, 0 CRs, M2 RHZ-07/F-01: 16 source-attested limits unenforced). 12 proposed `block`
CRs, each carrying its verbatim §5.9 Tab.2 / §5.7 quote + **PDF p.16** (Ammonium ≤0,5; Eisen ≤0,2;
Gesamtphosphor ≤0,03; Härte ≥1,0; Leitfähigkeit ≤1000,0; Mangan ≤0,05; Nitrat ≤50,0; ortho-Phosphat
≤0,01; pH `6.0 AND ≤9.0` band; Säurekapazität ≥2,0; chloridarm; Spurenelemente). Fertilizer N/P₂O₅/K₂O/MgO
are "ca." (approximate) → **not** staged as hard gates (tolerance = human call, M2 RHZ-07/D-03).
**Batched for Alvaro, NOT authored here (need own PDF-page quote + block/warn ruling per SR-1):**
GAR-12 Tab.6 concrete minima, GAR-13 Asphaltbeton, RHZ-06 Tab.1 substrate Sollbereiche.

---

## D-2 — dead/vacuous gates, source-quoted (all STAGED, none applied)

`supabase/migrations/_STAGED_20260724140000_fll_dead_gates_d2.sql` (+ rollback in `scripts/`).

**FIX 1 (mechanical, single correct form — staged UPDATE):** FLLNT-03 REQ-07 greedy-AND vacuous PASS
(M2 FLLNT-03/F1, HIGH). `IF (I∨II) THEN (share>50 AND IF III THEN share>30)` — for Type-III the outer
guard is false → gate vacuously PASSES → the >30 % regeneration rule never evaluates. **SHOULD enforce**
(Naturteich Table 1, rendered): Type I/II regeneration area >50 %, Type III >30 %. **Fix:** parenthesise
each IF/THEN as its own AND operand. **Proven against real `evaluate.ts` this session:**
```
 ✓ OLD: type_III share=10 wrongly PASSES (dead branch)
 ✓ NEW: type_III share=10 correctly FAILS
 ✓ NEW: type_III share=40 PASSES ; type_I share=40 FAILS ; type_I share=60 PASSES
 Tests 5 passed (5)
```

**Dead gates needing a TOPOLOGY RULING (no SQL — SR-1 forbids silently choosing move-vs-add-discriminator; batched):**
- **GAR-10 — the "nine dead gates"** (GAR-10/F1+F2, HIGH): REQ-12,13,14,15,16,17,18,20,22 guard the
  phantom `abdichtungs_art` and reference sibling-worksheet symbols (`mz_durchlaessigkeit_kf`,
  `bauteildicke_cm`, `bentonit_type`, `peeh_dichte_g_cm3`, `feinkornanteil_063_pct`, …). VA thresholds
  (GAR.txt): REQ-12 Tab.3 L1924-1934 (Kornanteil≥15, org.≤5, Kalk≤15, kf≤1e-9, DPr≥97); REQ-18 Bahnendicke
  ≥1,2 mm (L4088). **Ruling:** add `abdichtungs_art` enum (8 material tokens) on GAR-10, OR re-home each
  material gate to its worksheet keeping only REQ-12 + attest REQ-19/21.
- **GAR-01/F1:** REQ-02/03 test GAR-03 fields → never fire → re-home to GAR-03.
- **GAR-22 REQ-23:** references `freibord_*_cm` (GAR-23 fields) → dead → re-home to GAR-23.
- **RHZ-02/FND-1+2:** `!= null` / `== false OR … != null` gates can never return FAIL → re-author fail-reachable.
- **RHZ-05:** REQ-06 apparatus gate on RHZ-04, symbols on RHZ-05 → move to RHZ-05.
- **RHZ-16 REQ-18:** wrong operand `dichte_relativ_prozent` (RHZ-13) vs `relativ_prozent_24mon` → repoint.
- **RHZ-19 REQ-22:** §10 extension symbols on RHZ-20 → re-home.

**Resolved this batch (not re-staged):** RHZ-18 dead "(Gate)" → FIXED by the D-3 apply; RHZ-07 0-CRs → D-3 ES-1 stage.

---

## D-4 — two F-7 range fields (SR-2 selection, STAGED + batched)

`supabase/migrations/_STAGED_20260724150000_fll_f7_range_selection_d4.sql` (+ rollback). Field-DESIGN →
stage+batch (carries a design choice, not pure mechanical config).

- **F-7 #1 — GAR-23 `freibord_zu_bauwerk_cm`** (currently bare number). **SR-1/SR-3 verbatim (GAR §4.5,
  PDF p.119):** *"Die Oberkante der Abdichtung ist an aufgehenden Bauteilen und Bauwerken i. d. R. 30 cm
  über den geplanten Höchstwasserstand auszuführen. Nur mit geeigneter Randbefestigung und Sicherung gegen
  Hinter- und Unterlaufen ist eine Reduzierung auf mind. 15 cm über Höchstwasserstand zugelassen."*
  (+ "mind. 5 cm" Schwimm-/Badeteich). **SR-2:** staged enum selection `freibord_bauwerk_fall`
  (`regel_30` / `reduziert_15` requires Randbefestigung / `schwimmteich_5`) so the numeric value is
  validated against the *selected* band — 15 vs 30 is a human choice, never auto-picked.
- **F-7 #2 — GAR-07 `boeschungsneigung_ratio`** (currently FREE TEXT, M2 GAR-07/F-1). **SR-1/SR-3 verbatim
  (GAR Tab.1, PDF p.31):** per-material max — Ortbeton/Asphaltbeton ≤1:2 (≤50 %); Asphaltmastix/GTD/
  Bitumen/mineral. ≤1:3 (≤33 %); Kunststoff-/Elastomer/PEHD ≤1:1,5 (≤66 %); Flüssigkunststoff ≤1:1
  (≤100 %). **SR-2:** staged conversion to a source-locked enum of the Tab.1 ratios so no out-of-band point
  slips through free text.

---

## ALVARO'S BATCH (this task's additions — nothing below is applied)

1. **D-3 ES-1** `_STAGED_20260724130000…` — RHZ-07 12 `block` CRs (ratify grammar + block-vs-warn).
2. **D-3 not-authored** — GAR-12 / GAR-13 / RHZ-06 threshold gates: need own PDF-page quote + ruling.
3. **D-2** `_STAGED_20260724140000…` — FLLNT-03 REQ-07 fix (ready) + 7 topology rulings (GAR-10 nine-gates,
   GAR-01, GAR-22/REQ-23, RHZ-02, RHZ-05, RHZ-16/REQ-18, RHZ-19).
4. **D-4** `_STAGED_20260724150000…` — GAR-23 freibord selection + GAR-07 slope enum (ratify field design).

## Honest residue
- The two APPLIED CRs are proven at the evaluator level (pass/fail/pending) but were NOT driven end-to-end
  through a browser `saveWorksheet` on prod (prod read-only); the M2 run already proved RHZ-18 FAIL/ABORT
  saves persisted unblocked pre-fix, and the condition semantics are proven by the real `evaluate.ts` test.
- All staged migrations are idempotent (`WHERE NOT EXISTS` / `<> target`), each with a matching rollback;
  none are picked up by the migration runner (`_STAGED_` prefix).

## Files
- APPLIED: `scripts/phase4/{20260724_fll_rhz18_rhz21_verdict_block_gates,rollback-…,verify-…}.sql`
- STAGED: `supabase/migrations/_STAGED_2026072413/14/15…_fll_*.sql` (+ `scripts/rollback-_STAGED_…`)
- TEST: `src/lib/compliance/__tests__/fll-verdict-block-gate.test.ts`
