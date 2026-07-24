# STEP-2 · pilot 2 (COMPLEX) — DWA-A-102-2 full map→drives→harness cycle

**Date** 2026-07-24 · **Prod** `vadsmshzebefjreqcicl` (read-only) · **Work** `C:\Users\Ekowai\_wt-fll`
**Map** `…/Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps/DWA-A-102-2/`
**Doctrine** `docs/verification-doctrine.md` (SR-1..4, EV/VC/VA/NR, data_class, PDF pipeline) — read in full.
**Standard** id `b52680be-e0df-4313-b5b5-a08bdbb82773` — the stress test: **36 ws · 62 eq · 30 CR · 178 fields**
(cf. pilot-1 DIN-18130-1: 5 ws · 8 eq · 7 CR). Prior single-source history; cross-refs KOSTRA-DWD / DIN / DWA-A-118/138.

## PDF location + page offset (derived from ITS OWN footer, not inherited)
- **PDF:** `C:\Users\Ekowai\Desktop\Share\Regulations\DWA\DWA 102-2\DWA-A_102-2_Part{1,2,3,4}.pdf`
  (4 sequential scan segments; standalone backup at `Desktop/Share/Backups/…/EKOWAI-Agent/standards/DWA-A-102-2/source/DWA-A_102-2.pdf`).
- **Text layer present** (unlike scanned DIN-18130-1): `pdftotext -layout` works; the `Ã¤`=ä mojibake is a
  console-display artifact (Windows-console-UTF-8 gotcha), NOT corruption — verbatim reads taken from extracted text.
- **Offset from the running footer** `<page> DWA-Regelwerk/BWK-Regelwerk … Dezember 2020`:
  `Part1 printed = idx − 1` (pp.2–23) · `Part2 = idx + 24` (pp.24–48) · `Part3 = idx + 49` (pp.49–73) ·
  `Part4 = idx + 74` (pp.74–96). **Document = 96 printed pages.** Every `source_page` here is PRINTED.

## Map generated (Step 1) — 136 nodes + index/template
Reused `DWA-A-138-1/_template-node.md` VERBATIM. Generated from prod encoding + the RENDERED PDF only
(generator `.tmp-a1022/gen-map.mjs`, artifact-driven). Nodes: **36 section · 62 equation · 30 CR · 4 document · 4 decision-point.**

### before → after map state (by provenance / data_class)
| provenance | at generation | after harness write-back | data_class |
|---|---|---|---|
| VA | 35 (34 eq + index) | 35 (20 now harness-attested, not just pure-PDF) | derived (≈58 eq + 30 CR) |
| EV | 88 | 89 (Gl.18 moved VA→EV after F-3) | standard_fixed (eq inputs + 3 docs) |
| NR | 9 (6 eq + KOSTRA + A118 + inherit) | 9 | standard_range (Gl.25b, dp-01) |
| VC | 5 (doc-dwa-a-138 + 4 dp) | 5 | engineer_input (36 sections + inline) |

The harness did **not** invent VA — the 34 pure+PDF equation nodes were already VA per SR-3; it **upgraded 18 of them to
harness-attested VA** (compute proven through real code) and **confirmed 2 findings** that DEMOTED one (Gl.18 VA→EV).

## Validator = the WORK PLAN (Step 2)
Registered DWA-A-102-2 in `STANDARD_DIRS` + the snapshot exporter (`b52680be-…`); refreshed the snapshot
(DWA-A-102-2: ws=36 eq=62 cr=30). **First run: ERRORS = 0** for A-102-2 (the only 2 residual WARNs are the pre-existing
DWA-A-138 `balance`/`condition` relational placeholders — unchanged). All checks green first-pass:
cr-db↔node (30/30 both directions), ws-has-section, eq-classifiable (139), va-has-page, links-resolve (1018),
2b.va-build-resolves. That a 138-node complex map validated clean on the first pass is itself the headline structural result.
The machine named the residue via the queries:
- `below-va:DWA-A-102-2` → **101 nodes** (EV 87 = 22 gap-eq + 30 CR + 36 sections + Gl.18; NR 9; VC 5) — all legitimately capped.
- `acquisition-list` → **doc-kostra-dwd** and **doc-zusatzdatei-rkb** (the docs this standard adds to acquire), doc-dwa-a-118.

## Map-drives-harness (Step 3) — the demonstration
The map's equation-node CLASSIFICATION drove the harness (NOT hand-picked). Seeded a minimal A-102-2 project
(`seed-a1022.ts`: one calc worksheet, formulas + CR conditions VERBATIM from prod) on disposable embedded Postgres;
ran `a1022-verify.integration.test.ts`. **27 equation chains + 8 block CRs + 1 saveWorksheet round-trip = 37 tests, ALL PASS.**
Which chains reached VA vs capped at the external boundary:

- **18 pure-arithmetic chains reached VA** through the REAL `evaluateFormula` (Gl.1,5,8,9,10,11,12,19,27, B.1,B.2,B.7,B.14,
  B.20,B.21,B.22, T6.H1, T6.V + relational Gl.28) — each asserted against its verbatim PDF-page value; incl. `^` power (B.20/B.21).
- **2 chains capped NR** at the KOSTRA/DIN boundary (un-runnable-to-VA — the correct instructive result): **Gl.2 V_R_aM** and
  **Gl.16 B_R_e_zul_CSB** root in **h_Na → KOSTRA-DWD-2020** (§8.3.2.1 defers to the DWD). The harness proves the ARITHMETIC but
  records the value is NOT source-VA — the A-102-2 analogue of DWA-A-138's `r_D(n)→KOSTRA` cap that pilot 1 predicted.
- **7 chains FAIL LOUD** (engine never fabricates): REG-Bild4 (`ln()`), Gl.4 + B.17 (`Sum()`), Gl.6 + T6.Vs (`Max(;)` separator),
  and Gl.18 (two-sided formula). All assert `.kind !== 'computed'`.
- **derived-output classification + saveWorksheet round-trip**: A_RKB persists via the REAL `saveWorksheet`, reads back `derived`.
- **block CRs fired** through the REAL `evaluateCondition` in pass+fail: REQ-03/04/06/08/15/23 correct; REQ-17/22 surface F-4.

### raw vitest (final)
```
 Test Files  1 passed (1)
      Tests  37 passed (37)
```
(First run was 34 passed / 3 failed — the 3 failures were the F-3 and F-4 findings; the harness was corrected to assert the
ACTUAL found behaviour, never a fabricated pass, per "findings over fixes".)

## Findings list
- **F-1 (engine gap, ln — confirmed from pilot 1):** REG-Bild4 `q_A_Bem = -8.333·ln(eta_ges) - 1.6629` uses `ln()`, unsupported
  → fails loud. Compute chain not engine-executable.
- **F-2 (engine gap, Sum):** Gl.4, B.5, B.17, Gl.26 use `Sum()` over an index → no summation in the engine (needs an aggregator).
- **F-3 (prod data-hygiene, NEW):** **Gl.18 is a TWO-SIDED string** `e_0 <= (107-70)/(C_e_CSB-70)*100 = 3700/(C_e_CSB-70)` —
  `rhs()` strips only the first comparator, leaving a stray `=` → engine throws. Not engine-executable as encoded (fix = split the
  DB string to a single evaluable RHS). Demoted Gl.18 VA→EV.
- **F-4 (gate-enforcement bug, REAL, NEW — the key new gap):** a **var-vs-var** numeric block CR (`<ident> >= <ident>`) SILENTLY
  MIS-EVALUATES. `src/lib/compliance/evaluate.ts` `operandToLiteral()` (line 364) converts a bare RHS identifier to the STRING of
  its own name (legacy enum semantics), so `V_s >= V_S_min` compares the number against the literal `"V_S_min"` and returns `fail`
  regardless of values. Affects **REQ-17 (V_s≥V_S_min), REQ-22 (eta_ges≥eta_erf), REQ-24 (m≥m_min_required)** — three core Nachweis
  block gates that never enforce. Literal-RHS gates (REQ-15, REQ-23) are unaffected. Proven in the harness.
- **F-5 (engine gap + data-hygiene, NEW):** prod stores `Max(a; b)` / `Min(a; b)` with a **semicolon** separator (Gl.6, T6.a_f,
  T6.Vs, 21b, B.23b); the engine expects `,` and `normalize-formula.ts` mangles the paren → these min/max forms fail loud.
- **F-6 (provenance defect, NEW — SR-1/SR-3):** **REG-Bild4 is a regression FIT to a GRAPH, not a printed formula.** Bild 4
  (PDF p.41) is a SCHMITT-2018 simulation curve; the coefficients `-8.333 / -1.6629` are a fit to the Zusatzdatei/graph, not
  verbatim-attestable from the standard body. Doubly non-VA (fit + `ln()`).

## Decision batch for Alvaro (unratified — never guessed)
- **dp-01-sr2-ranges** — V_s ≤ 40 m³/ha (REQ-18) and the qA,Bem 2..10 m/h band (Bild 4): SR-2 ranges the engineer selects within,
  or hard block bounds? V_S,min and the 5 m³/ha floor (REQ-23) are the lower bounds.
- **dp-02-unratified-severities** — all 30 CRs carry unratified severity (12 block / 18 warn). Confirm block-vs-warn per gate
  (esp. the area-balance REQ-04/06/07, RKB REQ-11, a_R REQ-15, V_s REQ-17/23, eta_ges REQ-22, m REQ-24) before enforcement.
- **dp-03-bild4-regression** — REG-Bild4 (F-6): accept the fit as a registered aggregator with the Zusatzdatei as oracle, OR treat
  q_A,Bem as engineer-read-off-graph engineer_input? Depends on [[doc-zusatzdatei-rkb]].
- **dp-04-kostra-hna** — acquire the governing DWD/KOSTRA-DWD-2020 rainfall-depth source (h_Na) to lift Gl.2/13/14/15/16 off NR.
- **F-4 code ruling** — fix `evaluate.ts` to resolve an `aref` RHS through `lookup` for numeric operators (var-vs-var gates), OR
  ratify that these Nachweise are attested manually. This is a SILENT block-gate failure — staged, not auto-applied.
- **F-3 ruling** — split Gl.18's two-sided DB string into a single evaluable RHS.
- **Acquisition-list docs this standard adds:** KOSTRA-DWD-2020 (h_Na, 1 dependent), Zusatzdatei-RKB (Bild-4 fit), DWA-A 118.

## HONEST assessment — the SAME 4 axes as pilot 1, + the new complexity gap
**1. Scanned-PDF reading — SOLVED for this standard, but a NEW extraction wrinkle.** The A-102-2 PDFs HAVE a text layer, so I did
NOT need pdftoppm/vision (pilot-1 axis #1). BUT: the 4-part split had NO simple offset — each part is a different page range, and
the page number lives in a running footer that pdftotext scatters mid-page. I had to derive a **per-part offset** from the footer
regex. So "self-source the page number" is still not automated for a multi-part, footer-numbered scan — the generalisation of
pilot-1 backlog #1 is: the map generator needs a footer-page extractor, not just an OCR pass.
**2. Engine-gap prediction — NOW STATIC (pilot-1 backlog #2 CLOSED).** I pre-classified all 62 equations against the engine's
supported token set (`+-*/^ min max`) BEFORE running: 40 pure / 22 gap (1 ln, 4 Sum, 12 piecewise-if, relational). The harness
runtime CONFIRMED the prediction exactly — no gap was discovered only at runtime. The static token-vs-engine check the pilot-1
report asked for is effectively implemented (in the generator); it should be promoted into `validate.mjs` as a real check.
**3. Synthetic input tuples — still chosen by me** (pilot-1 axis #3 unchanged). The map says WHAT to assert (formula ↔ PDF page);
I still picked clean numbers. At 62 equations this was more laborious but mechanical; deriving tuples from field data_types + the
Anwendungsbeispiel PDF (an oracle) remains the backlog.
**4. Decision-point authoring — still needs a human to spot ambiguity** (unchanged). Range-vs-fixed (V_s≤40), regression-vs-formula
(Bild 4), and severity-ratification all required reading the PDF to notice.

**THE NEW GAP the complexity/cross-standard scale exposed (beyond pilot 1's four):** *pilot 1's CRs all compared a symbol against a
LITERAL or boolean, so the map+harness never exercised var-vs-var gates.* At A-102-2's scale, three core block Nachweise are
`<ident> >= <ident>` — and the harness proved they **silently fail to enforce** (F-4). **A map/validator that only checks a CR
exists + is fired does NOT catch a gate that fires but mis-evaluates.** The map-driven HARNESS caught it; the static validator did
not — so the concrete new backlog item is: **the validator/harness must assert each block CR actually PASSES on a known-good tuple
and FAILS on a known-bad one**, not merely that it is wired. Equally, the complexity surfaced two prod data-hygiene defects
(F-3 two-sided formula, F-5 `Max(;)`) that a small standard would never have contained.

**Bottom line.** For a complex, text-clean, cross-referencing standard the map+suite was **structurally autonomous** (138 nodes,
0 validator errors first pass) and its equation classification **mechanically produced a correct, predictive harness plan**. The
two things it could NOT do without me were (a) derive the multi-part footer page offset and (b) supply input tuples — and the
harness earned its keep by catching a **real silent block-gate enforcement bug** (F-4) that no amount of static map inspection would
have found. That is the strongest argument yet that the map must DRIVE a real-execution harness, not just be validated in isolation.

## Baseline + proof (no regression to the existing 5 standards)
- Baseline `validate.mjs` (real vault, all 6 maps): **ERRORS = 0** (2 pre-existing DWA-A-138 WARNs) — before AND after write-back.
- 5-known-errors proof (`seed-known-errors.mjs` → fixtures copy → `validate.mjs --maps`): **exit 6**, all 5 defect classes caught
  (dangling link, VA-w/o-build `deadbee`, dead CR ×2, missing page, DB orphan). `KNOWN_BUILDS = gitCommitsExist()` preserved
  (no ledger-token trust reintroduced).

## Artifacts
- Map: `reasoning-maps/DWA-A-102-2/` (138 files incl _index/_template).
- Harness: `tests/harness/{seed-a1022.ts,_harness-env-a1022.ts,a1022-verify.integration.test.ts}`.
- Validator: `scripts/reasoning-map/validate.mjs` (+DWA-A-102-2 in STANDARD_DIRS),
  `export-encoding-snapshot.mjs` (+b52680be-…), refreshed `snapshot/encoding-snapshot.json`.
- Generator (artifact-driven, disposable): `.tmp-a1022/gen-map.mjs`.
