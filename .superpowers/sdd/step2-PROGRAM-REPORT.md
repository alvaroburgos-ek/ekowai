---
title: "Reasoning-Map Infrastructure Program — ONE FINAL REPORT"
created: 2026-07-24
tags:
  - project/ekowai-wizard
  - reasoning-maps
  - verification-doctrine
  - regulatory-encoding
status: milestone-report
program: reasoning-map-infrastructure (STEP 0 → STEP 1 → STEP 2 Phases 1-3)
prod: vadsmshzebefjreqcicl
branch: feat/fll-revision
---

# Reasoning-Map Infrastructure Program — ONE FINAL REPORT

Synthesis of the whole run: **STEP 0** (doctrine as files) → **STEP 1** (FLL D-1..D-4 + VC→VA closure)
→ **STEP 2 Phase 1** (6 standard maps) → **Phase 2** (self-validation suite) → **Phase 3** (2 pilots:
DIN-18130-1 simple, DWA-A-102-2 complex). Read-only synthesis: durable artifacts read, validator LIVE
queries re-run (raw output pasted), report + consolidated ratification batch produced. **No prod writes,
no new maps.** First action was reading `docs/verification-doctrine.md` (binding, SR-1/2/3/4).

---

## Executive summary

The program built a **standard-agnostic verification substrate**: a file-codified doctrine (never chat
memory), a 6-standard corpus of Obsidian reasoning maps (512 nodes), and a **re-runnable self-validation
suite** that proves each map against its own contract AND the live prod encoding snapshot. The suite is
**proven, not asserted**: baseline **ERRORS = 0**, and 5 deliberately seeded defects are all caught
(exit 6). The two pilots closed the loop **map → drives → real-execution harness**: a SIMPLE self-contained
standard (DIN-18130-1, 29 nodes, 17/17 harness green) and a COMPLEX cross-referencing one (DWA-A-102-2,
136 nodes, 37/37 green, 138-node map validated clean on first pass).

The headline finding is that the map-driven **harness earns its keep**: static map inspection validated a
138-node complex standard clean, yet only the real-execution harness caught **F-4** — three core `<ident> >=
<ident>` var-vs-var block gates (REQ-17/22/24) that **fire but silently never enforce** because
`operandToLiteral()` stringifies a bare RHS identifier. This is a HIGH, cross-standard code bug and the
single most important discovery of the run. STEP 1 shipped one authorized prod apply (two RHZ verdict block
gates) and staged everything else. The consolidated ratification batch below is organized per standard with
severity + prod-apply-vs-code-fix tags. **32 open decision-points, 107 never-fired CRs, 13 acquisition
targets** — all machine-named by the live queries, none guessed.

---

## 1. What was built

### 1.1 Doctrine as FILES (STEP 0)
- `docs/verification-doctrine.md` — the binding doctrine, codified so no session/subagent depends on chat.
  - **SR-1** verbatim source before apply (a proven computation ≠ a proven input; orchestrator rejects
    source-less fixes). **SR-2** ranges never auto-picked — surfaced as explicit engineer selections.
    **SR-3** rendered PDF is ground truth (**PDF > markdown > encoding > ledger > chat**; a VA claim without
    a PDF-page ref is invalid). **SR-4** infra for an approved mandate is auto-approved (reality-consistent +
    logged); only stop-conditions = prod-apply-outside-mandate / ratified-design changes / irreversibles.
  - Provenance grades **EV / VC / VA / NR**; `data_class` on every value node
    (`standard_fixed` PDF-page-required / `standard_range` SR-2 / `engineer_input` / `derived` trace-required)
    with the validator rules (`standard_fixed` w/o page = invalid; UI-editable `standard_fixed` = finding;
    hand-enterable `derived` = the **#22 class**; in-range value w/o selection record = the **F-7 class**).
- Commits: **`e336926`** (SR-1/2/3 + data_class + process) and **`c58588b`** (SR-4). Both verified present
  in git this session.

### 1.2 The vault structure — 6 standard maps (512 nodes total, validator-counted live)
| Standard | Map nodes | ws / eq / cr (snapshot) | Character |
|---|---|---|---|
| **DWA-A-138-1** | **129** (131 incl. index/template) | 28 / 46 / 35 | canonical template; infiltration calc |
| **FLL-GAR-2023** | **84** | 29 / 4 / 30 | material-threshold standard (`standard_fixed` 46/84) |
| **FLL-Naturteich-2017** | **68** | 15 / 6 / 33 | inequality-as-producer + phantom-enum DELETE |
| **FLL-TP-RHIZOM-2023** | **57** | 21 / 3 / 24 | cross-worksheet-gate-dominant + applied verdict gates |
| **DIN-18130-1** | **29** | 5 / 8 / 7 | pilot-1 SIMPLE, self-contained Darcy lab method |
| **DWA-A-102-2** | **136** | 36 / 62 / 30 | pilot-2 COMPLEX, cross-refs KOSTRA/DIN/A-118/138 |

All six reuse `DWA-A-138-1/_template-node.md` VERBATIM. Every VA node carries a `source_page`; per-PDF page
offset is DERIVED per document (proven variable: 138/GAR **−2**, Naturteich **−3**, TP-Rhizom **−1**,
DIN-18130-1 **0**, A-102-2 **per-part** −1/+24/+49/+74).

### 1.3 Validator + exporter + proof harness
- `scripts/reasoning-map/validate.mjs` — Node-core validator; exit code = ERROR count; `--json`, `--query`.
- `scripts/reasoning-map/export-encoding-snapshot.mjs` — refreshable SELECT-only exporter (Management-API read
  path, `$SUPABASE_ACCESS_TOKEN` never printed) → committed `snapshot/encoding-snapshot.json` (deterministic,
  offline, re-runnable; drift = its own finding class).
- `scripts/reasoning-map/seed-known-errors.mjs` — the 5-defect proof harness (operates on a gitignored COPY).
- Commits: **`e11aa8b`** (suite + exporter), **`6cc17dc`** (the 2b fix — build-check must not trust ledger
  prose tokens, un-poisonable), pilots **`793ce60`** (DIN-18130-1) and **`4cc016a`** (DWA-A-102-2).

---

## 2. The validation suite — re-runnable and PROVEN (LIVE this session)

### 2.1 Baseline — ERRORS = 0 (raw)
```
  DWA-A-138-1            nodes=131
  FLL-GAR-2023           nodes=85
  FLL-Naturteich-2017    nodes=69
  FLL-TP-RHIZOM-2023     nodes=58
  DIN-18130-1            nodes=31
  DWA-A-102-2            nodes=138
  TOTAL nodes = 512
── Per-check pass/fail ──
  1.cr-fired-or-dead pass=159 fail=0   1.eq-produces pass=129 fail=0
  1.links-resolve   pass=1018 fail=0   1.va-has-page  pass=308 fail=0
  2.cr-db-has-node  pass=159 fail=0    2.cr-node-has-db pass=159 fail=0
  2.eq-db-has-node  pass=88 fail=0     2.eq-node-has-db pass=88 fail=4
  2.fixed-has-page  pass=139 fail=0    2.ws-has-section pass=134 fail=0
  2b.va-build-resolves pass=308 fail=0 2c.dp-attached pass=32 fail=0
  3.drift pass=12 fail=0               6.eq-classifiable pass=139 fail=0
  ERRORS = 0   WARNINGS = 2
  [WARN] 2.eq-node-has-db · DWA-A-138-1 · balance   — map eq produces 'balance' absent from DB (orphan)
  [WARN] 2.eq-node-has-db · DWA-A-138-1 · condition — map eq produces 'condition' absent from DB (orphan)
```
The 2 WARNs are a REAL finding (the `(balance)`/`(condition)` bracketed boolean-placeholder naming mismatch
on DWA-A-138 `eq-gl11/13/25/38`) — see batch §5.

### 2.2 5 seeded defects all caught (exit 6), un-poisonable after the 2b fix
Per the validator report: dangling link, VA-without-build (`deadbee`), dead CR (trips 2 invariants),
missing page, DB orphan → **6 errors for 5 defects, exit 6**; re-run on the honest maps returns to exit 0
(re-runnable, not sticky). The **2b fix (`6cc17dc`)** made the build-check refuse to trust ledger prose
tokens — `KNOWN_BUILDS = gitCommitsExist()` only — so a fabricated `provenance_build` can no longer be
laundered past the validator by writing its hash into a ledger. Both pilots re-ran the proof: exit 6, all 5
classes caught, no regression to the baseline.

### 2.3 The 4 core queries — LIVE output (raw counts)
- **`never-fired`** → **107** CRs (attestation/selection/gate-only; e.g. all 24 RHZ REQ-* incl. the two
  applied verdict gates, 17 A-102-2, 26 Naturteich, 16 DWA-138).
- **`unratified`** → **32** open decision-points `{DWA-138:5, GAR:11, NT:4, RHZ:5, DIN-18130-1:3, A-102-2:4}`.
- **`acquisition-list`** → **13** referenced-but-missing `in_library:false` docs (ranked §4).
- **`below-va:<STD>`** — all six, LIVE (raw breakdown):
  ```
  DWA-A-138-1        count=36   NR/derived 26 · NR/standard_fixed 4 · VC/standard_range 5 · VC/standard_fixed 1
  FLL-GAR-2023       count=34   NR/derived 16 · NR/standard_range 2 · NR/standard_fixed 2 · VC/engineer_input 9 · VC/derived 5
  FLL-Naturteich     count=10   NR/standard_fixed 2 · VC/engineer_input 8
  FLL-TP-RHIZOM      count=9    NR/standard_fixed 1 · VC/engineer_input 8
  DIN-18130-1        count=4    NR/standard_fixed 1 · VC/derived 2 · VC/standard_range 1
  DWA-A-102-2        count=102  EV/derived 51 · EV/engineer_input 36 · NR/derived 6 · NR/standard_fixed 3 · EV/std_range 1 · VC 4
  ```
  Every below-VA node is legitimately capped (external doc-NR, `R-noeq` data-collection VC, or A-102-2's EV
  bulk of un-verified equation-inputs) — no spurious below-VA node in any standard.

---

## 3. The two template maps + the two pilot maps (before/after provenance)

### 3.1 Template maps
- **DWA-A-138-1 (canonical)** — 129 nodes; the VERBATIM template all others reuse. Node-VC/NR below-VA = 36
  (26 NR/derived rooted in KOSTRA + DIN 1986-100 + trig-blocked chains). Its `_template-node.md` is the only
  legitimate external wikilink target across the corpus (1018/1018 links resolve).
- **FLL ×3 (GAR / Naturteich / TP-Rhizom)** — built on the 138 template, EXTENDING it for: a NEW `ETA/abP`
  per-product document class; `standard_fixed`-dominant material standards; **range_choice**-heavy SR-2 nodes;
  the **cross-worksheet gate-topology** finding class; "formula source-VA, evaluation-NR" (cos β) vs
  document-NR; the **inequality-as-producer** (`displayOnly`) and **verdict-enum-as-producer** classes; and
  per-PDF page-offset derivation. STEP-1 lifted their state to worksheet-level **VA 47 / VC 18 / NR 1**
  (GAR-22 Eq 2b, cos β, engine-unfixed per doctrine). DS-ceiling on FLLNT-10 EQ-01 (50×, p.82) and FLLNT-11
  EQ-05 (150 l/m², p.54) LIFTED VC→VA (`provenance_build: 3f9ca0f`).

### 3.2 Pilot maps (before → after harness)
| Pilot | Nodes | Harness | Before → after provenance |
|---|---|---|---|
| **DIN-18130-1** (SIMPLE) | 29 | **17/17 green** | VA 26 → 26, but **7 eq nodes upgraded pure-PDF-VA → harness-attested-VA** (compute proven through real `evaluateFormula`); k persists via REAL `saveWorksheet`, read-back `derived`; Gl.9 `ln()` gap confirmed. VC 2 / NR 1 unchanged. |
| **DWA-A-102-2** (COMPLEX) | 136 | **37/37 green** | VA 35 → 35 (**18 eq upgraded to harness-attested**); Gl.18 **DEMOTED VA→EV** (two-sided string, F-3); 2 chains capped NR at KOSTRA/DIN boundary; 7 fail-loud (ln/Sum/Max;/two-sided); 138-node map validated **ERRORS=0 first pass**. |

Both harnesses were driven by the map's node classification (NOT hand-picked): the equation `requires::/
produces::` edges chose which chains to run, `source_page` chose the oracle value, CR nodes chose which
gates to fire pass/fail. First A-102-2 run was 34/3-fail; the 3 failures WERE findings F-3/F-4 and the
harness was corrected to assert the ACTUAL behaviour (findings over fixes — never a fabricated pass).

---

## 4. THE ACQUISITION LIST (ranked by dependent-node count, LIVE)

| Rank | Document | Dependents | Unblocks (standards / nodes) |
|---|---|---|---|
| 1 | **KOSTRA-DWD-2020** (design rainfall r_D(n) / h_Na) | **22** (+1 on A-102-2) | DWA-A-138-1 — 22 nodes (Gl.3/10..41 chains + REQ-05/31/32) **the single largest NR block in the corpus**; also A-102-2 (Gl.2/16 → h_Na). Acquiring it lifts more NR than any other target. |
| 2 | **DGfdB-R** (R 60.03 / 65.06 / 65.09) | 5 | FLL-Naturteich — FLLNT-11 splash-water (EQ-05), FLLNT-14, tab-fllnt-13 maintenance, REQ-33. |
| 3 | **DIN 1986-100** | 3 (138) + 2 (GAR) | DWA-A-138 (Überflutungsnachweis REQ-22/23, Gl.10) AND FLL-GAR (r_5,5 / r_5,100 for GAR-27 Q_NOT). **Spans two standards.** |
| 3 | **DWA-A 118:2024** (hydraulische Bemessung) | 3 | DWA-A-138 — REQ-08/29 + Tab.8. |
| — | **DIN 18137-2** (Wassersättigung) | 1 | DIN-18130-1 — lifts `dp-02-versuchsklasse` off NR. |
| — | **Zusatzdatei-RKB** (Bild-4 regression) | 1 | DWA-A-102-2 — `dp-03-bild4-regression` provenance of q_A,Bem. |
| — | ETA/abP per MVV TB | 2 | FLL-GAR — GAR-17 Flüssigkunststoff min-thickness (per-product, inherently NR). |
| — | ATV DIN 18300 (1) · FLL Wurzelfestigkeit 2008 (1) · DWA-A 531 (0) | 1/1/0 | Naturteich REQ-14 · RHZ section-03 · (138 A-531 no live dependents). |

**Top priority = KOSTRA-DWD-2020** (22 dependents). **DIN 1986-100 is the best cross-standard buy** (138 + GAR).

---

## 5. ALVARO'S RATIFICATION BATCH — consolidated, organized PER STANDARD

Legend: **[APPLY]** = prod migration/data write (gated). **[CODE]** = engine/lib/validator code fix.
**[STAGED]** = written-not-applied file exists. Severity: HIGH / MED / LOW.

### 5.1 DWA-A-138-1 (5 DPs)
- `dp-01-verfahrenswahl` — Einfaches vs Nachweisverfahren (Tab.12): normative binding vs engineer method choice. **[APPLY? ruling] MED**
- `dp-02-n-range` — Bemessungshäufigkeit n {0.1..0.5}: SR-2 range vs fixed-by-Schutzkategorie. **[APPLY SR-2] MED**
- `dp-03-f-z-15` — f_Z == 1.2 in REQ-15: fixed value vs range point. **[ruling] LOW**
- `dp-04-anhang-worked-example` — Anhang numeric examples exemplary vs binding (normativity ceiling). **[ruling] LOW**
- `dp-05-req-30-gate` — REQ-30 final-verdict severity warn vs block. **[APPLY severity] MED**

### 5.2 FLL-GAR-2023 (11 DPs)
- `dp-gar-10-phantom-gates` — **nine phantom-field gates** (REQ-12..22 guard non-existent `abdichtungs_art`; also cross-sheet symbols). Ruling: add enum on GAR-10 OR re-home each material gate. **[APPLY topology] HIGH**
- `dp-gar-23-freibord-range` — freibord 30/15/5 cm (§4.5) → SR-2 enum `regel_30`/`reduziert_15`(needs Randbefestigung)/`schwimmteich_5`. **[APPLY SR-2, STAGED `_STAGED_20260724150000`] MED**
- `dp-gar-07-slope-range` — Tab.1 per-material slope → SR-2 free-text→enum. **[APPLY SR-2, STAGED same file] MED**
- `dp-gar-17-clause-ref` — §9.9 clause-ref mismatch (PDF wins → §6.3/Tab.23 p.88-89) + `N/mm²` no-source-value on `fk_haftung_untergrund`. **[APPLY retag] MED**
- `dp-gar-01-crosssheet-gates` — REQ-02/03 read GAR-03 fields (dead) → re-home to GAR-03. **[APPLY topology] MED**
- `dp-gar-22-req23-deadgate` — REQ-23 reads GAR-23 freibord fields (dead) → re-home to GAR-23. **[APPLY topology] MED**
- `dp-gar-12-beton-gate` / `dp-gar-13-asphalt-gate` — Tab.6 concrete minima / Asphaltbeton Tab.12 un-encoded local gates (need own PDF quote + block/warn). **[APPLY new-gate] MED**
- `dp-gar-19-soll-modal` — Verzinkung ≥100 µm "soll" block-vs-warn modal ruling. **[ruling] LOW**
- `dp-gar-06-baugrund-attest` — §4.6 bearing capacity boolean-attest vs numeric fields. **[ruling] LOW**
- `dp-gar-22-anhang-informative` — Anhang 2 Flächengewichtsberechnung informative-normativity ceiling (+ **GAR-22 Eq 2b cos β = NR trig residue**, engine unfixed per doctrine). **[ruling] LOW**

### 5.3 FLL-Naturteich-2017 (4 DPs)
- `dp-fllnt-03-req07-greedy-and` — REQ-07 **greedy-AND vacuous-PASS** (Type-III >30% dead branch); mechanical parenthesisation, proven against real `evaluate.ts`. **[APPLY UPDATE, STAGED `_STAGED_20260724140000`] HIGH**
- `dp-fllnt-10-11-modal-verb` — EQ-01 ("should…50-times", informative annex) + EQ-05 ("Approximate…≥150 l") block-vs-warn ruling. **[ruling] MED**
- `dp-fllnt-phantom-fields` — (A) **DELETE** phantom enum-value-as-field rows (`type_III`, `emersed`, `submergent`, `vertical_continuous_overflow`, `vertical_no_overflow`); (B) FLLNT-06→07 cross-sheet gate placement (6 gates); (C) FLLNT-14 REQ-27 over-enforces source "should". **[APPLY DELETE+topology] HIGH**
- `dp-fllnt-ranges` — SR-2 surfaces (grain Tab.15, hydrobot/filter Tab.10-12 bands, plant density §10.4.3, overflow tolerance ±1/±2 mm). **[APPLY SR-2] MED**

### 5.4 FLL-TP-RHIZOM-2023 (5 DPs) — one applied gate pair already LIVE
- **APPLIED (ratified, LIVE):** REQ-RHZ18-VERDICT (RHZ-18) + REQ-RHZ21-CONFORMITY (RHZ-21) block gates, commit `40cd1b2`, HTTP 201, read-back live, `audit_status` untouched. Highest-severity FLL enforcement gap closed.
- `dp-rhz-07-es1-tab2` — **twelve §5.9 Tab.2 / §5.7 block CRs** (ES-1, each verbatim-quoted, PDF p.15); fertilizer N/P₂O₅/K₂O/MgO "ca." NOT staged. **[APPLY, STAGED `_STAGED_20260724130000`] MED**
- `dp-rhz-dead-gates` — RHZ-02 REQ-03/04 **fail-unreachable** rulings + RHZ-16 REQ-18 wrong-operand repoint. **[APPLY] MED**
- `dp-rhz-crossws-topology` — six acceptance gates (REQ-06..10) hosted on RHZ-04 but owned by RHZ-05/06/07/08; RHZ-12→14/15; RHZ-19→20. **[APPLY topology] MED**
- `dp-rhz-phantom-fields` — 7 `section_id=NULL` sheets → **SECTION** (not delete, unlike NT) + RHZ-08 enum-bypass + RHZ-11 enum-null widget. **[APPLY] MED**
- `dp-rhz-missing-density-eq` — RHZ-14/15/16 relative-density free-entered twins → single registered producer (**#22 class**). **[APPLY+CODE] MED**

### 5.5 DIN-18130-1 (pilot 1 — 3 DPs + engine ruling)
- `dp-01-worked-examples` — §9 numeric examples exemplary (compute oracle) not normative. **[ruling] LOW**
- `dp-02-versuchsklasse` — {1,2,3} free enum vs DERIVED from DIN 18137-2 saturation (needs the doc, NR). **[ruling+acquire] LOW**
- `dp-03-alpha-source` — α in Gl.6 continuous closed-form vs discrete Tab.2 lookup (SR-2). **[APPLY SR-2] LOW**
- **F-1** — Gl.9 falling-head uses `ln()`; engine (`arithmetic.ts`, min/max only) can't evaluate → fails loud. Add `ln`/aggregator OR ratify falling-head-k engineer-entered+attested. **[CODE] MED**

### 5.6 DWA-A-102-2 (pilot 2 — 4 DPs + the key engine bugs)
- **F-4 — var-vs-var block-CR SILENT non-enforcement (HIGH, cross-standard).** `evaluate.ts` `operandToLiteral()` (L364) stringifies a bare RHS identifier (legacy enum semantics) → `V_s >= V_S_min` compares against literal `"V_S_min"` and returns `fail` regardless of values. Affects **REQ-17 (V_s≥V_S_min), REQ-22 (eta_ges≥eta_erf), REQ-24 (m≥m_min_required)** — three core Nachweis gates that never enforce. Literal-RHS gates (REQ-15/23) unaffected. Proven in harness. Fix: resolve `aref` RHS through `lookup` for numeric operators, OR ratify manual attestation. **[CODE] HIGH — the most important finding of the run.**
- **F-3** — Gl.18 is a TWO-SIDED string (`e_0 <= … = 3700/(C_e_CSB-70)`); `rhs()` leaves a stray `=` → throws; DEMOTED VA→EV. Split the DB string to a single evaluable RHS. **[APPLY data-hygiene] MED**
- **F-5** — prod stores `Max(a; b)`/`Min(a; b)` with **semicolon** (Gl.6, T6.a_f, T6.Vs, 21b, B.23b); engine expects `,` and `normalize-formula.ts` mangles the paren → fail loud. **[APPLY data-hygiene + CODE] MED**
- **F-6** — REG-Bild4 is a **regression FIT to a GRAPH** (Bild 4 p.41 Schmitt-2018 curve); coeffs −8.333/−1.6629 not verbatim-attestable → doubly non-VA (fit + `ln()`). **[ruling] MED**
- **F-1 (confirmed)** — REG-Bild4 `ln()` engine gap (same class as DIN-18130-1 F-1). **F-2** — Gl.4/B.5/B.17/Gl.26 `Sum()` over an index, no summation aggregator. **[CODE] MED**
- `dp-01-sr2-ranges` (V_s≤40, q_A,Bem 2..10 m/h) **[APPLY SR-2]**; `dp-02-unratified-severities` (12 block/18 warn, confirm per gate) **[APPLY severity]**; `dp-03-bild4-regression` (needs Zusatzdatei-RKB); `dp-04-kostra-hna` (acquire KOSTRA). **MED**

### 5.7 Cross-cutting / map-hygiene
- **Map↔DB `(balance)`/`(condition)` naming** (WARN, DWA-138 `eq-gl11/13/25/38`): bracketed boolean-placeholders in DB vs unbracketed map twins. Either emit a real symbol or mirror the placeholder. **[APPLY-or-map-edit] LOW**
- **`section_id=NULL` prod quirk** — broad (GAR-10/22/27, most RHZ, FLLNT); STEP-1 staged only the 7 D-1 drivers (`_STAGED_20260724120000`); full backfill needs a per-field section decision. **DISTINCT from phantom-enum rows which are DELETE, not section.** **[APPLY, partial STAGED] MED**
- **F-2 (validator, FIXED in pilots)** — `extractCrCode` generalised to the `<STD>-CR-NN` family. **F-3 (map hygiene, FIXED)** — cross-map `[[…/_index]]` wikilinks must be prose/document-node.

---

## 6. HONEST cross-pilot assessment — did the map+suite drive the system autonomously?

**Largely yes — structurally autonomous, with four named human-in-the-loop gaps plus one new scale-exposed
gap.** For a self-contained text-clean standard (DIN-18130-1) the map's node list mechanically produced the
harness plan and the validator mechanically produced the work plan; the data_class + SR rules did the
classifying; ambiguities auto-flagged to Alvaro, never guessed. For a 138-node complex standard (A-102-2)
the map validated **0 errors on the first pass** and its equation classification **mechanically produced a
correct, predictive harness plan**. Where human input still filled gaps (the 4 axes):

1. **Scanned-PDF / multi-part page offset — NOT automated.** DIN-18130-1 had no text layer (rendered PNGs,
   read by eye for offset + quotes); A-102-2's 4-part split had no single offset (per-part footer regex).
   → Next: an OCR/vision + footer-page extractor the map generator consumes.
2. **Engine-gap prediction — NOW STATIC, CLOSED.** Pilot 1 found the `ln` gap only at harness runtime;
   pilot 2 **pre-classified all 62 equations against the engine token set BEFORE running** (40 pure / 22 gap)
   and the runtime confirmed the prediction exactly. This axis is closed in the generator — **promote the
   static token-vs-engine check into `validate.mjs` as a real check.**
3. **Input-tuple synthesis — still human.** The map says WHAT to assert (formula ↔ PDF page), not WHICH input
   tuple. → Next: derive tuples from field data_types + PDF worked-examples as oracles.
4. **Decision-point ambiguity — still needs a human to spot it.** Range-vs-fixed, exemplary-vs-normative,
   regression-vs-formula required reading the PDF. → Next: modal-verb / value-appears-as-both-formula-and-table
   / "Beispiel"/"Anhang" heuristics to pre-propose DPs.

**THE NEW SCALE-EXPOSED GAP (F-4).** Pilot 1's CRs all compared a symbol against a LITERAL/boolean, so
var-vs-var gates were never exercised. At A-102-2's scale three core block Nachweise are `<ident> >= <ident>`
and the harness proved they **fire but silently never enforce**. A map/validator that only checks a CR
*exists + is fired* does NOT catch a gate that fires but mis-evaluates — only the map-driven real-execution
harness caught it. **This is the strongest argument that the map must DRIVE a harness, not just be validated
in isolation.**

### ITERATION-2 BACKLOG (concrete)
1. **Assert each block CR passes-good / fails-bad on a known tuple** — not merely that it is wired (closes the
   F-4 class in the suite itself, cross-standard).
2. **Promote the static engine-token-vs-formula check into `validate.mjs`** (flag compute-gaps before harness).
3. **Footer-page / OCR extractor** feeding `source_page` for scanned + multi-part PDFs.
4. **Map-driven input-tuple synthesis** from field data_types + PDF worked-example oracles.
5. **Heuristic decision-point pre-proposal** (modal verbs, formula↔table duplication, Anhang/Beispiel headers).
6. **Fix F-4/F-3/F-5 in the engine + data** and re-run harnesses to flip the 3 Nachweis gates enforcing.
7. **Acquire KOSTRA-DWD-2020** (lifts 22 NR nodes) then DIN 1986-100 (138+GAR).

---

*Prod untouched this run. All numbers are pasted raw validator output (2026-07-24, snapshot exported
2026-07-24T12:49Z). Provenance for every VA claim lives in the STEP-1/STEP-2 deliverables under
`.superpowers/sdd/` and in each map's node notes.*
