# Wave-4 — DWA-M-102-4 (Wasserhaushaltsbilanz, März 2022) — PARTIAL, wave OPEN

**Ledger header** — model `claude-opus-5` · CLI `2.1.218` · effort max · 2026-07-27 ·
worktree `_wt-fll` @ `feat/fll-revision` · prod `vadsmshzebefjreqcicl` · **read-only, no writes.**
Workflow run `wf_180cf1cd-985` · 39 agents · 2.66 M subagent tokens · 778 tool calls.

Standard `05e76a06-fbc4-45f9-8aee-423e7e165f2d` — 35 worksheets / 252 fields / 31 equations /
22 CRs. Source PDF `Desktop\Guidelines\DWA-102-4\DWA-M_102-4.pdf`, 56 pages, text layer present.

## Page offset = **−2**, derived independently (high confidence)

Eight text-layer folio readings (PDF 4→2, 7→5, 15→13, 24→22, 33→31, 44→42, 48→46, 52→50),
**four rendered-PDF confirmations** at 110 dpi, and an independent cross-check against the
document's own TOC (§5 listed p.19 → PDF 21; Anhang A p.26 → PDF 28; Anhang C p.38 → PDF 40;
Quellen p.47 → PDF 49). TOC = PDF 9-11. **Body starts PDF 12.** Printed folios run 2–50 = PDF
4–52; PDF 1-3 and 53-56 are unnumbered front/back matter.

Trap recorded: **PDF 44 is a rotated landscape page**, so a naive "last line of the page" footer
scrape returns the DWA licence watermark instead of the folio.

---

# THE HEADLINE — first bidirectional TOC walk ever run, and it changes the picture

**49 clauses walked · 41 normative · verdict: NOT READY-TO-USE.**

Every printed **regression equation** is encoded. Essentially every printed **lookup table** is
absent. This is invisible from the encoding→source direction, which is exactly why the
source→encoding direction was mandated.

### GAP 1 — SEV-1 · **zero `regulation_tables` rows for this standard**
Verified by query: `regulation_tables` holds **4460 rows across 34 standards** and **0** for
DWA-M-102-4. Unencoded as a result:

- **Tabelle C.3** — the ET_a/ET_p lookup that *is* the simplified Anhang-C method. Several
  hundred values (Boden 1-5 × Klima 1-6 × Grundwasserflurabstand × 5 Landnutzungseinheiten),
  confirmed by rendering printed p.43.
- **Tabelle C.7** (48 r-values) · **C.5** (12×5 area shares) · **C.6** (f_L/f_W) · **C.4**
- **Tabelle B.1**'s fixed rows · **Tabelle A.1**'s fixed rows · the **A.4 Begrünungsfaktor** table

In each case the encoding substitutes a **free-entry number with a raw-text hint** such as
*"from Tab. C.3 lookup"*. **The worksheet never asks the question the table answers** — the
engineer must own the table externally, which is precisely the failure mode the campaign exists
to remove.

### GAP 2 — SEV-1 · six printed equations with **no equation record**
(a) the Bilanzfehler normalisation `×1/(a+g+v)`, printed **four times** (§5.2.5, §A.1, §B.1,
§C.6) · (b) the negative-value rule *"auf Null setzen und die beiden anderen anteilsproportional
anpassen"* (§A.1, §B.1) · (c) §C.5 `R_D = r · R` and (d) `GWN = R − R_D` — **which makes step 8
of the §C.2 procedure uncomputable** · (e) §B.6 `h_Nu = min(P; 365·h_Br + h_Bw)`, encodable
since `min()` **is** a supported engine function, yet `h_Nu` is instead declared an *input* ·
(f) §B.5's printed Standardwert `f_S,M = 11,79 − 3,14·ln q_Dr − 0,18594·k_f`.

### GAP 3 — SEV-2 · Tabelle A.1's companion rules `g_F = 0` and `v_F = 1 − a_F`
No equation for either, across all six roof/dense-paving rows. Fields `g_F_dach`/`v_F_dach`
exist **with nothing producing them**; M104-19 has no `g_F` field at all.

### GAP 4 — SEV-1 · **Anlagentyp is unaskable**
M104-22 is titled *"Anlagentyp-Wahl"* but **contains no facility-type field** — its 10 fields are
all numeric parameters. Combined with the missing Tabelle B.1, **five facility classes the
standard covers have no route through the encoding at all**: Ableitung Rohr/Rinne, flache Gräben
mit Bewuchs, Versickerungsschacht/-rohr/-rigole, Regenbecken ohne Dauerstau, Retentionsbodenfilter.

### GAP 5 — SEV-2/3 · smaller but real
§4.2 (WHG §§ + A-102-1/-2 cross-refs) entirely unencoded · §6's actual obligation (prioritise by
*dynamische Kostenvergleichsrechnung*) unencoded — REQ-19 instead attests the Klimakennung,
which Tabellen 5/6 assign **to the Merkblatt itself, not the project** · §5.3.2.1's
"≥ 20 Jahre DWD-Zeitreihen" has a field but **no enforcing CR** · §5.3.2.3's Überregnung term
`A_GOK` has no field · §1's two *müssen* and the Überflutungsschutz-Nachweis unencoded · nine
Tabelle-2 symbols with no field (`A_L, A_Bw, A_GOK, A_S, A_S,F, A_S,M, nFK, W_e, W_pfl`).

> ### ANCHORING WARNING — propagate to every future coverage walk
> **`clause_reference` is unreliable in this standard.** REQ-02 (§2) and REQ-20 (§4.3) both carry
> `clause_reference = "Hinweis für die Benutzung"`; REQ-14 is titled §5.3.2.2 but anchored 5.2.1;
> REQ-19 is titled §6 but anchored 5.3.3; REQ-22 is anchored 5.3.4 but is a generic approval
> gate; M104-34 fields cite *"Bild 5"*, **a figure this standard does not contain**. Purely
> mechanical clause matching would have produced a materially wrong coverage map **in both
> directions**.

---

# Equations — 12 of 31 examined. **MY WORKFLOW WAS WRONG.**

| verdict | count | which |
|---|---|---|
| FAITHFUL | 6 | 1, 2, 5, 7, 8, 9 |
| refuted away | 1 | 11 |
| surviving defects | 5 | 3, 4, 6, 10, 12 |
| **CANNOT-VERIFY** | **19** | **13–31** |
| source-settled | ≥1 | eq 3 |

**The 19 CANNOT-VERIFY are my fault, not the encoding's.** I generated equation labels
`'1'…'31'` as plain integers. This standard numbers its equations **`A.2`…`A.10`, `B.2`…`B.7`,
`C.1`…`C.4`** — so those agents queried rows that do not exist and, correctly, returned
CANNOT-VERIFY rather than substituting a different equation. The dispatch was defective; the
agents behaved exactly as doctrine requires.

**Fix for the re-run:** read the real `equation_number` values from prod first and fan out over
*those*, never over a generated index. `Workflow({scriptPath: 'scratchpad/m1024-wave.js',
resumeFromRunId: 'wf_180cf1cd-985'})` replays the 12 completed verifications from cache.

**One fidelity observation recorded outside its task's scope:** equation **B.7** is encoded as
`v_A = (ET_p·A_W) / (P · (A_W + Σ A_b,a,i·a_F,i))` whereas printed p.39 shows the denominator as
`P·A_W + Σ A_b…`. **Different grouping ⇒ different value.** Unverified by the refuter (B.7 fell
in the un-examined range) — carry it into the re-run as a priority item.

---

# Deploy gate — logged blocker

`vercel` CLI **present** (54.17.3); the VSME-era blocker is gone. But `_wt-fll` has no
`.vercel/project.json` and `vercel link` is interactive in a non-interactive shell.
**Logged · skipped · campaign continued.** This standard's workflow metric is therefore
**UNPROVEN**, deliberately *not* downgraded to a local run and relabelled.

Next-session fix: copy `.vercel/project.json` from a linked worktree (`_wt-a138-10`, `_wt-vsme`)
or one interactive `vercel link`, then create the **campaign alias — separate from
`-hannesoster-`**.

---

# CONVERGENCE TABLE

| state | count |
|---|---|
| **fully treated** | **0** of 71 |
| in progress | 6 |
| untouched | 65 |

DWA-M-102-4 moves untouched → in progress. **Still owed before it can be called treated:**
19 equations re-verified under real numbering · row-by-row tables · both-ways gates · harness
execution on a deployed build · render spot-check · source-settled fixes applied · map write-back.

# RESUME POINTER

1. **Re-dispatch the equation sweep** over real `equation_number` values (`A.*`, `B.*`, `C.*`);
   resume from `wf_180cf1cd-985` to reuse the 12 cached verifications. **Priority: B.7 grouping.**
2. Apply eq-3's source-settled fix (comma→underscore subscript separators) with reproduction
   check + rollback + map write-back.
3. Link Vercel, create the campaign alias, then the harness + render spot-check.
4. GAP 1 is the biggest single item in the campaign so far: **populating `regulation_tables` for
   this standard** — a schema/infra change serving the mandate, therefore pre-authorised, but
   large. Tabelle C.3 alone is several hundred values.
5. GAPs 2/3/4 are mostly **rulings** (new equations, new fields, a new enum) → sign-off sheet.

---

# PROOF MANDATE EXECUTED (run `wf_ee3c4d81-9f6`) + fix waves 2-3

## Gates — all 22 CRs driven BOTH ways through the real evaluate.ts

| class | count | which |
|---|---|---|
| **ENFORCES** (pass+fail demonstrated) | **10** | REQ-01/02/03/08/09/14/18/19/20/22 |
| WARN-ONLY (flips correctly, warn never blocks) | 3 | REQ-04/12/13 |
| NOT-DRIVABLE (parse-dead: `abs()`/`max()`/prose) | 9 | REQ-05/06/07/10/11/15/16/17/21 |
| dead/pending | 0 | — |

Notable both-ways evidence: REQ-08 fails **below and above** the 500–1700 band; REQ-18
enforces but its enforcement is conditional on cross-worksheet value agreement (fallback
omits disagreeing symbols → pending → silent stop — F-4-adjacent, on the sheet); REQ-22
enforces mechanically but gates on a manually-entered status enum, a self-referential
workflow encoding (sheet). The 6 `abs()`-class rewrites are grammar-conform one-liners but
are condition changes → sheet, not applied.

## Workflow metric — EXECUTED: **31 runnable / 4 blocked** (was "assessed" — now proven)

- **5 equations COMPUTE**: Gl.3 (190, post-fix), Gl.4 (110), Gl.7/8/9 — and the spine
  identity closes exactly: a+g+v = 0.2375+0.1375+0.625 = **1.000**.
- **BLOCKED, demonstrated**: M104-07 (spine — R_D collision Gl.3+Gl.5 blanks both
  pre-evaluation, PLUS self-ref inputs; **my Gl.3 fix computes at engine level but is
  DISCARDED at worksheet level** — honest finding, the fix was real but insufficient),
  M104-22 (Z collision + `[mm/a]` inside stored formulas), M104-27 (B.6 multi-statement
  `;`), M104-28 (B.7 `sum_{` unregistered aggregate).
- 8 worksheets runnable-with-dead-headline-coefficient (annex ln/exp by design; hand-entry
  sibling fields exist).
- **6 multi-producer collisions** across 5 worksheets (A-178 class): P_korr, R_D, a_F ×3, Z.

## Fix waves 2–3 (all execution-proven broken→computes, single-writer outputs only)

| eq | fix | before | after | migration |
|---|---|---|---|---|
| Gl.3 | formula commas + self-ref input | manual_required | computed 8* | 20260727180000 |
| Gl.4 | self-ref input drop | manual_required | computed 7 | 20260727180000 |
| Gl.2 | self-ref input drop | manual_required | **computed 300** | 20260727190000 |
| C.1 | comma-LHS → own output_symbol | **hard error** | **computed 715** | 20260727190000 |

*Gl.3 lands at engine level only — worksheet-level effect awaits the Gl.5 collision ruling.
Gl.1/5/6 self-refs deliberately untouched (collision parties; ruling first).

## Remaining before fully-treated: deployed-build harness pass + render spot-check
(campaign alias not yet created) · collision/writer-retirement rulings · map `_index`
re-render. Everything else on the seven-element list is now DONE for this standard.
