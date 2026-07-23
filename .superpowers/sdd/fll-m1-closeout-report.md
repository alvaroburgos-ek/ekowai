# FLL Milestone 1 (GAR-27) — Close-out Report

**Branch:** `feat/fll-revision` (worktree `C:\Users\Ekowai\_wt-fll`) · **Identity:** alvaro.burgos@ekowai.com
**Date:** 2026-07-23 · **Mode:** Option A ratified, BUT GATE 1 (SR-1) failed on verification.

> **RESOLUTION 2026-07-23 (supersedes the GATE-1 FAILED verdict below).** The user
> WITHDREW 0,82 and RATIFIED **C = 1,0** — the PDF-attested value. Under the corrected
> premise the fix is source-grounded and has now been APPLIED. See the
> **"APPLIED FIX — C = 1,0 (RATIFIED)"** section at the end of this report.

---

## GATE 1 (SR-1) VERDICT: **FAILED — NOTHING APPLIED**

The user's ratified premise for Option A was: *"the FLL-GAR standard has a **Tab. 9** giving
abflussbeiwerte as a RANGE (0,8–0,9) for GAR-27's surface type, and C_s=1,0 is in no Tab. 9 row."*

**This premise is false for the FLL-Gewässerabdichtungsrichtlinien source.** Verified this session
against three independent representations of the same standard. No apply was performed. This is the
SR-1 escalation.

### What Tab. 9 actually is (verbatim from source)

`C:\Users\Ekowai\Desktop\Supabase data\Guidelines knowledge markdown\FLL-Gewässerabdichtungsrichtlinien.md`
L2696–2710:

```
Tabelle 10 angegeben.
Tab. 9: Erforderliche Frischbetontemperatur
...
Nr. 1 2 3 4
1  Zementfestigkeitsklasse
   Erhärtungszeit in Tagen bei einer Betontemperatur von:
2  5 °C   12 °C   20 °C
3  52,5 R; 52,5 N; 42,5 R   0,75   0,5   0,5
4  42,5 N; 32,5 R           2      1,5   1
5  32,5 N                   5      3,5   2
```

**Tab. 9 = "Erforderliche Frischbetontemperatur" (required fresh-concrete temperature).** It has
NOTHING to do with abflussbeiwerte. (The `0,75 / 0,5 / 0,5` etc. in that table are curing times in
days, not runoff coefficients.)

### Corroboration (two more independent sources agree)

1. **Machine-extracted table audit** —
   `C:\Users\Ekowai\Desktop\Guidelines\_site_audit\FLL-GAR-2023\_tables_1-15.json` L106:
   `"table_id":"TBL-9","table_name":"Tab. 9: Erforderliche Frischbetontemperatur", ... "unit":"°C"`.
   The omission sweep (`omission_sweep.md` L83) likewise describes Tab.9 as the concrete
   temperature matrix.
2. **Encoded workbook** — `_json_exports/FLL-GAR-2023.json`: every "Tab.9" token co-occurs with
   "Frischbetontemp"; there is no Tab.9 abflussbeiwert row.

### The two required GATE-1 assertions — both fail

- **(a) A Tab. 9 range covering 0,82 for GAR-27's surface:** DOES NOT EXIST. There is no
  abflussbeiwert table in the FLL-GAR source at all (searched Tab. 1–29 and full body).
  The word "Abflussbeiwert" appears **exactly once** in the whole document — L6481,
  the Anhang-1 worked example: `Abflussbeiwert C = 1`.
- **(b) C_s=1,0 is invented / in no Tab. 9 row:** Partly the OPPOSITE of the premise. C=1,0 is NOT
  invented — it is the **only** abflussbeiwert the FLL-GAR source ever states, verbatim in the
  Anhang-1 Düsseldorf example (L6480–6485):
  ```
  15 Abflusswirksame Fläche = 800 m2
  16 Abflussbeiwert C = 1
  ...
  19 Q NOT = [ (r5,100 – (r5,5 * C) ] * (A / 10.000)
  20 = ( (607 – 316 l/(s*ha)) ) * (800 m2 / 10.000) = 23,28 l/sec
  ```
  So within FLL-GAR, **C=1,0 is the source-attested value and 0,82 is the un-attested one.**
  0,82 is a DIN 1986-100 runoff coefficient, not an FLL value (exactly as M1 originally flagged).

### Verdict

GATE 1 requires the covering-range Tab. 9 to be CONFIRMED before apply. It is refuted, not
confirmed. Per SR-1 ("If no verbatim source reads the target value → STOP, do not apply") and the
task's own GATE-1 branch ("If Tab. 9 does NOT exist … STOP, do not apply, report the exact
contradiction"): **STOP. Nothing was applied.** No harness re-run to GREEN-then-apply, no migration
authored/applied, no project_parameters write, no C_s change, no dedupe, audit_status untouched,
prod `vadsmshzebefjreqcicl` untouched. SR-2 was NOT recorded as "applied" and no commit was made,
because recording a first-application that did not happen would itself violate SR-1's spirit.

---

## M1 RECONCILIATION — did M1 miss Tab. 9?

**No. M1 was correct; the ratified premise was mistaken.** M1's report
(`.superpowers/sdd/fll-m1-report.md` §1 L37–45) stated plainly: *"The FLL-GAR PDF does NOT tabulate
the abflussbeiwert C … its only Anhang-1 worked example uses C=1 … C=0,82 is a DIN 1986-100 runoff
coefficient, not an FLL-GAR value."* That is exactly what this GATE-1 verification independently
re-confirms. The "Tab. 9 range 0,8–0,9" appears to be a **conflation**: Tab. 9 in FLL-GAR is the
fresh-concrete-temperature table, and the 0,8–0,9 abflussbeiwert range is a DIN-1986-100 concept
that FLL-GAR does not reproduce. M1 did not miss a table; there is no such table to miss.

The still-standing SR-1 first-catch entry in `docs/superpowers/standing-rules.md` (L21–23) already
records this correctly and needs no change.

---

## WHAT THE ACTUAL FIX SHOULD BE (for the user's ruling — NOT applied)

The live GAR-27 defect is real (consumed `C` = 0,83 is a stale third value that matches neither the
FLL source C=1 nor the DIN 0,82, and the correct-per-surface coefficient is stranded in the decoy
`C_abflusswert` = 0,82). But the *governing source* for the point value is **DIN 1986-100**, not an
FLL Tab. 9. Two legitimate paths, both requiring a DIN-1986-100 verbatim quote in the same session:

1. **Use FLL's own attested C=1,0** (only value FLL states) — most conservative Notüberlauf sizing.
2. **Use DIN 1986-100's surface-specific C** — requires quoting the DIN row that maps GAR-27's
   surface to a value in [0,8; 0,9] and confirming 0,82 sits in it. That DIN table is NOT in this
   repo's Guidelines set; it must be sourced before 0,82 can be applied.

Either way the current 0,83 is unsupported. But neither can be applied under SR-1 until the DIN row
is quoted this session. The premise-driven auto-pick of 0,82 "because Tab. 9 range covers it" is
exactly the failure SR-1 exists to prevent.

---

## SR-2 (proposed text — NOT yet recorded, pending re-ratification)

The SR-2 wording the task supplied assumes GATE 1 passed ("First application: GAR-27 C_s aligned to
the source-verified in-range 0,82"). Since GATE 1 failed, that first-application clause is currently
false and was NOT written. SR-2's *general principle* remains sound and is worth recording once a
real first application exists; proposed neutral phrasing kept out of the rules file until the user
re-ratifies against the corrected facts.

---

## PROPOSED MILESTONE 2 SCOPE (unchanged in shape; M1 fix folds back in once source is settled)

1. **Resolve GAR-27 C provenance** (blocking): user picks FLL C=1,0 or sources the DIN 1986-100
   row for 0,82; then apply the dedupe (`A_einzugsflaeche`→`A`, `C_abflusswert`→`C`) + the ratified
   C via migration (schema) + project_parameters (project f7249ae1…), harness GREEN first.
2. **FLL-GAR-22 g_prime** — seed Gl.2a producer + Gl.2b displayOnly non-clobber assertion through
   the real save path.
3. **FLL-Naturteich** — DS-provenance residue explicitly quarantined (no PDF; never invent source).
4. **FLL-TP-RHIZOM-2023** — extend harness.
5. Drive **every computable chain vs the standard's worked examples** (e.g. the Anhang-1 Düsseldorf
   23,28 l/s example is a ready-made ground-truth harness case for Q_NOT with C=1).
6. **cos_beta / trig engine support = OUT** (known residue; Gl.2b displayOnly → dormant).

---

## RAW EVIDENCE INDEX
- Tab. 9 title + body: FLL-Gewässerabdichtungsrichtlinien.md L2696–2710 (Frischbetontemperatur).
- Only abflussbeiwert mention: same file L6481 `Abflussbeiwert C = 1` (Anhang-1 example, C=1).
- Audit table id: _tables_1-15.json L106 `TBL-9 … Erforderliche Frischbetontemperatur … °C`.
- Encoded workbook: FLL-GAR-2023.json — "Tab.9" co-occurs only with "Frischbetontemp".
- Full-body scan for `0,8 / 0,9 / abfluss`: hits are PE-liner thickness (mm), permeability, and
  Drosselabfluss prose — no runoff-coefficient range.

---

## APPLIED FIX — C = 1,0 (RATIFIED, 2026-07-23)

The GATE-1 verification above was correct in its facts. The user acted on those facts:
**withdrew 0,82** and **ratified C = 1,0** (the only abflussbeiwert the FLL-GAR source
states). This section records the applied fix. Prod `vadsmshzebefjreqcicl`, project
f7249ae1-bbda-415f-ac83-991a282d2c8b, identity alvaro.burgos@ekowai.com.

### (a) The 0,82 WITHDRAWAL
**SR-1 was working correctly — 0,82 traced to the bring-up log, not a source; the FLL PDF
attests C = 1.** The Anhang-1 Düsseldorf worked example reads verbatim `Abflussbeiwert C = 1`
(pdftotext -layout line 6499), dimensioned "nach DIN 1986-100", and computes
Q_NOT = 23,28 l/s for its 800 m² example. There is no abflussbeiwert table/range in FLL-GAR
(the "Tab. 9" is *Erforderliche Frischbetontemperatur*). 0,82 was a DIN-1986-100 coefficient
that had leaked in via the bring-up log; SR-1 correctly refused to auto-apply it, and the user
has now withdrawn it. No standing-rule change needed — SR-1's first-catch entry stands.

### (b) C_s "invented" flag — REVERSED
The earlier flag that "C_s = 1,0 is invented / in no Tab. 9 row" is **REVERSED**: 1,0 is
**PDF-consistent** — it is precisely the source-attested value (`Abflussbeiwert C = 1`), the
opposite of invented. (There is no separate DB field named `C_s`; "C_s" was the discussion
label for the surface abflussbeiwert, which is the consumed field `C`,
d6f02425-71c9-4a85-bfd2-35069a118771. It now reads 1,0, PDF-consistent.)

### (c) Applied migration + project-data + read-back

**Staged GREEN first** (real `saveWorksheet` + real `evaluateFormula`, embedded Postgres):
`pnpm vitest run --project integration tests/harness/fll-gar27-qnot.integration.test.ts` →
**3 passed** — the GREEN case asserts C = 1,0 → Q_NOT = 4.6025 through the real save path
((317 − 142·1)·263/10000 = 175·0,0263 = 4,6025). Seed/harness updated to the ratified target.

**STANDARD-SCHEMA migration** (`scripts/phase4/20260723_fll_gar27_c_dedupe_retag.sql`,
applied via `_mgmt-apply.mjs` → HTTP 201; rollback + verify SQL alongside):
- DEDUPE: decoy twin `C_abflusswert` (34d5b6f0-…) set `active = false` — collapsed into
  consumed `C`; its 0,82 is withdrawn and not carried forward.
- RE-TAG: consumed `C` (d6f02425-…) given Anhang-1 verbatim provenance — `source_file` =
  the GAR PDF, `source_quote` = "Abflussbeiwert C = 1. … Q NOT = … = 23,28 l/sec.",
  `clause_reference` = "Anhang 1". `audit_status` / `verification_status` untouched.

**PROJECT-DATA** (`scripts/phase4/20260723_fll_gar27_projectdata_c1_qnot.sql`, HTTP 201):
- consumed `C` 0,83 → **1.0**;  derived `Q_NOT` 5.237382 → **4.6025** on the live project.

**Read-back (read-only MCP, raw):**
```
symbol         active  source_file(head)                          value_number  source_type
C              true    fll_gewaesserabdichtungsrichtlinien_...pdf  1.0           entered
C_abflusswert  false   (null)                                      0.82          entered   (deprecated)
Q_NOT          true    (null)                                      4.6025        derived
```
consumed C = 1,0 (== the "C_s" abflussbeiwert), Q_NOT = 4.6025 live, twin deactivated.
