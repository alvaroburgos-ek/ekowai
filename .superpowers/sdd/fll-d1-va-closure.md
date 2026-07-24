# FLL D-1 — VC→VA CLOSURE + DS-ceiling lift (STEP 1 / task 1d, final)

**Task:** Close the reachable VC→VA gaps by PDF-page confirmation, lift the Naturteich DS ceiling
(FLLNT-10 EQ-01, FLLNT-11 EQ-05), and produce the definitive 65-worksheet VA/VC/NR state table to
seed the reasoning map (STEP 2). **VERIFICATION-ONLY** — prod read (read-only), PDFs read; **NO prod
writes**. Provenance lives in THIS deliverable.

**Doctrine:** `docs/verification-doctrine.md`, read in full. SR-3 governs: **rendered PDF is ground
truth; a VA claim REQUIRES a PDF-page ref; VC = markdown-only; PDF-vs-markdown disagreement = a
finding (PDF wins).** SR-1 (verbatim this session), SR-2 (ranges surfaced), findings-over-fixes,
raw output for claims. Followed.

**Sources (rendered this session via scoop `pdftotext -layout`):**
- Naturteich 2017 EN — `…\FLL Guidelines PDF\guidelines_for_the_planning_construction_and_maintenance_of_private_natural_swimming_pools_2017_p (1).pdf` → `_va-pdf\NT-full.txt`
- GAR 2023 (DE) — `…\FLL Guidelines PDF\fll_gewaesserabdichtungsrichtlinien_2023__2 (2).pdf` → `_va-pdf\GAR-full.txt`

**Prod (READ-ONLY, live 2026-07-24):** FLL-GAR-2023 = **29**, FLL-Naturteich = **15**,
FLL-TP-RHIZOM-2023 = **21** → **65**. (SQL below.) No prod writes performed.

---

## TASK 1 — VC→VA closure (each node upgraded with verbatim PDF quote + page)

Every VC node from the below-VA work-list (`fll-d1-rerun.md` §4.B) and M2 §4 R-markdown is located in
the RENDERED PDF, quoted verbatim, page-cited → **VA**. No PDF-vs-markdown disagreement was found on
any quoted passage (the disagreement that DOES exist is the encoded `§9.9` clause-ref vs the PDF's
`§6.3` — that is the pre-existing finding #10, PDF wins, restated below).

### 1.1 — GAR-17/R3 (Flüssigkunststoff spec-capture) → **VA**

Was VC (quotes read from `pdf/GAR.txt` markdown). Confirmed in rendered GAR-2023 PDF:

- **§6.3 Flüssigkunststoffe (intro) — PDF p.88** (`GAR-full.txt` L4271-4273):
  > "Nach Aushärtung der aufgebrachten Schichten ist der Belag wasserdicht und bietet als einlagige
  > Abdichtung einen ausreichendenden Widerstand gegenüber natürlichen Witterungs- und
  > Alterungsprozessen."
- **§6.3.1.1 Tab.23 Systemtyp set — PDF p.89** (L4291-4312): the closed option set
  `UP / PUR 1K / PUR 2K / PMMA` printed in *Tab. 23 "Stoffe und Anforderungen für Flüssigkunststoffe"*
  (`flexibles, ungesättigtes Polyesterharz UP`; `flexibles Polyurethanharz PUR 1K / PUR 2K`;
  `flexibles Polymethylmethacrylatharz PMMA`).
- **§6.3.1.2 Mindestschichtdicke — PDF p.89** (L4323-4325):
  > "Die Mindestschichtdicke der ausgehärteten flüssigen Abdichtung muss den Angaben der Zulassung
  > (ETA, AbP gemäß MVV TB) entsprechen. Sie beträgt gemäß Tabelle 23 mind. 2,0 mm. Wenn die in der
  > ETA angegebene Mindestschichtdicke höher ist, gilt der höhere Wert."
  → **SR-2 note:** binding minimum = `max(2,0 mm, ETA value)`, a governed floor, not a single point.
- **§6.3.2 Einlage-Flächengewicht — PDF p.89** (L4350-4351):
  > "Es müssen Einlagen (z. B. Glasvlies, Polyestervlies) mit einem Flächengewicht von mind. 110 g/m²
  > eingesetzt werden."
- **§6.3.2 Ausführung / Auftragsverfahren — PDF p.89** (L4348-4350):
  > "Abdichtungen mit Flüssigkunststoffen werden i. d. R. vollflächig haftend und mindestens
  > zweischichtig (Träger-, Deckschicht) mit Einlage ausgeführt. Dies kann durch Streichen, Rollen
  > oder Spritzen erfolgen."
- **§6.3.2 Haftungsverbund (fk_haftung_untergrund concept) — PDF p.89** (L4345-4346):
  > "Zur Vermeidung der Hinterläufigkeit ist ein vollflächiger Haftungsverbund zum Untergrund
  > herzustellen."

**FINDING (PDF wins, SR-3) — clause-ref `§9.9` is wrong.** All 6 GAR-17 fields carry
`clause_reference = §9.9`, which does not exist in the rendered PDF (chapter 9 = Randausbildung,
subsections 9.1/9.2/9.3.x only). The governing content is at **§6.3 / §6.3.1.1 (Tab.23, p.89) /
§6.3.1.2 (p.89) / §6.3.2 (p.89)**, plus §9.3.6 for edge detailing. → the encoding disagrees with the
PDF; PDF wins → **staged-and-batched** as M2 decision #10 (retag), not silently passed. `fk_haftung_untergrund`
unit `N/mm²` remains a residue: the PDF gives only a *qualitative* bond requirement ("vollflächiger
Haftungsverbund"), no numeric threshold → the numeric unit has no source value (VC-residue on that
one field's threshold; the concept itself is VA).

**Verdict:** GAR-17 spec content → **VA** (p.88-89). Clause-ref + `N/mm²` threshold = findings, batched.

### 1.2 — FLLNT-06/R1 (Flächenplanung: separation / sealing / edge constants + PUWS example) → **VA**

Was VC (`Naturteich.txt`). Confirmed in rendered Naturteich 2017 EN PDF:

- **§9.2 Separation — PDF p.41** (`NT-full.txt` L2180, L2189):
  > "Natural pools must be separated into a swimming area and a regeneration area." … "The separation
  > must be structurally durable and stable."
- **§9.3 Sealing — biocide/biofilm clause — PDF p.42** (L2207-2208):
  > "The sealings and protective layers cannot be treated with biocides; consequently, only sealings
  > that allow biofilm to form on the surface are permissible."
- **§9.4 Edge — freeboard ≥5 cm — PDF p.42** (L2244-2245):
  > "the water level remains consistently at least 5 cm below the upper edge of the sealing system."
- **§9.4 Edge — height tolerance ±10 mm — PDF p.42** (L2254-2255):
  > "the ends of the edges can indicate a maximum deviation of the planned nominal height of +/- 10 mm."
- **EQ-PUWS worked example (pool_underwater_surface = ground + wall) — PDF p.82** (Appendix 5,
  Example 2, L3989-3995): `Ground area: 50 m² / Wall area: 45 m² / Total: 95 m²`.

**Provenance note (carried, not a defect):** EQ-PUWS is encoder-synthesized — the PDF prints the
worked example's arithmetic (50+45=95) but not a standalone algebraic equation. The equation is a
faithful transcription of the p.82 example; VA on the printed components. (M2 FLLNT-06/F2, decision D2:
tag the equation row "Appendix 5, Example 2".) The 6 gate symbols that read FLLNT-07 fields
(FINDING F1, cross-worksheet) are unchanged — a topology finding, not a source-verification gap.

**Verdict:** FLLNT-06 constants + PUWS example → **VA** (p.41-42, p.82).

### 1.3 — FLLNT-12/R2 (§10.4.3 plant density ranges) → **VA**

Was high-confidence-VC (`Naturteich.txt`, page footer only). Confirmed on the rendered page:

- **§10.4.3 Plant density — PDF p.57** (`NT-full.txt` L2878-2883):
  > "•  submerged plants                6 – 10 plants;"
  > "•  half-height to tall marsh and aquatic plants   3 – 5 plants;"
  > "•  medium height to tall marsh and aquatic plants  5 – 7 plants;"
  > "The aforementioned number of plants applies to pot plants P 0.5 (500 cm³)."
- **§10.4.4 maturity timing — PDF p.58** (L2916-2919):
  > "• after approximately 4 - 8 weeks if the plants are planted during the vegetation period …" ;
  > "• approximately 4 - 6 weeks after the next vegetation period begins if the plants are planted
  > outside the vegetation period."
- **§10.4 native/invasive (REQ-25 source_quote) — PDF p.36** (L1544-1545):
  > "plant species native to Central Europe must be favoured and in particular, no invasive alien
  > species (non-indigenous species) are to be used."

**SR-2:** the three density ranges are surfaced, never auto-picked (M2 decisions D1-D4). **FINDING
(carried, F1 quote-scope):** REQ-25.description cites §10.4/§10.4.4/§10.4.5/§6.2.2 but only the §10.4
native-species sentence is attached as source_quote → enrichment batched, not a source disagreement.

**Verdict:** FLLNT-12 density/timing ranges → **VA** (p.57-58, p.36).

### 1.4 — FLLNT-13/R3 (§11.1 "3 working days" + §12.4 repairs) → **VA**

Was VC (`Naturteich.txt`). Confirmed on the rendered pages:

- **§11.1 completion notice ≥3 working days — PDF p.59** (`NT-full.txt` L2958-2959):
  > "The supplier must inform the purchaser of pending completion dates no later than 3 working days
  > before the respective completion date."
- **§12.4 Repairs list — PDF p.64** (L3169-3176):
  > "Repairs that are found to be necessary during the checks or during the performance of
  > maintenance work should be performed within the agreed scope, e. g.: • replacing filter
  > materials; • replacing defective technical systems; • replacing and supplementing plants; •
  > repairing structural installations."

**SR-2:** "3 working days" is a firm minimum (≥3), not a range. **FINDING (carried, F3):** the field
`completion_notice_days_advance` exists but NO compliance_requirement enforces `>= 3` — candidate gate,
batched (M2 decision #19). Working-days-vs-calendar-days nuance flagged (field unit bare "days").

**Verdict:** FLLNT-13 §11.1/§12.4 quotes → **VA** (p.59, p.64).

---

## TASK 2 — Naturteich DS-ceiling lift (FLLNT-10 EQ-01, FLLNT-11 EQ-05)

The standing `⚠ DS (kein PDF, DS-Decke, NIE VA)` ceiling rested on "no rendered PDF." The 2017 EN PDF
is now rendered → the premise is dead. Both equations verified verbatim against it:

### FLLNT-10 EQ-01 — the 50×-Regel (`filter_colonized_surface_actual >= 50 * pool_underwater_surface`)

- **Appendix 5 (informative), PDF p.82** (`NT-full.txt` L3972-3974):
  > "The outer grain surfaces of the filter material in the filter body that can be colonized should,
  > as experience shows, amount to at least 50-times the surfaces of the pool that are exposed to
  > light and submerged."
- Corroborated by the printed worked example, **PDF p.82** (L3982, L3998-4004):
  > "Surface of the filter body = 600 m2/m3 x 15 m2 x 0.7 m = 6300 m2" … "95 m² x 50 = 4750 m²" …
  > "4750 m² / 600 m² / m³ = approx. 8 m³".

**Verdict: FLLNT-10 EQ-01 → VA (p.82).** The `≥ 50×` factor is source-printed. **Two flags (SR-3/SR-2):**
(a) **modal-verb finding** — the source says "**should** … amount to at least 50-times", i.e. a
*recommendation* ("as experience shows"), whereas the encoding is a hard `>=` block-shaped inequality;
this is a block-vs-warn ruling for Alvaro, batched. (b) **informative-annex flag** — the 50× rule lives
in *"Appendix 5 (informative)"* (L3967), so it inherits informative status; VA on the printed value,
but its normativity is a human call. (c) EQ-01 is inequality-as-producer, correctly `displayOnly:true`
(engine can't compute the boolean) — mitigation retained, not removed.

### FLLNT-11 EQ-05 — the 150 l/m² splash-water reservoir rule

- **§10.3.1 Water reservoir, PDF p.54** (`NT-full.txt` L2728-2730):
  > "Approximate value for the dimensioning of the water reservoir[.] The usable volume of the splash
  > water tank must be dimensioned so that at least 150 l per square metre can be provided to the
  > inundated water surface."

**Verdict: FLLNT-11 EQ-05 → VA (p.54).** The `150 l/m²` constant is source-printed verbatim.
**Flag (SR-2):** the source labels it an "**Approximate value** … at least 150 l" — a firm floor (≥150)
presented as an approximate dimensioning value; keep as ≥ block or warn is a ruling, batched. EQ-05 is
inequality-as-producer, `displayOnly:true` retained.

**DS-ceiling verdict:** the `NIE VA` ceiling on FLLNT-10 EQ-01 and FLLNT-11 EQ-05 is **LIFTED** — both
values are now **VA** (p.82 / p.54). Residual open items are *rulings* (modal-verb block-vs-warn,
informative-annex normativity), not verification gaps. Decision 3.E-24 (M2) is answered: **lift, done.**

---

## TASK 3 — Definitive 65-worksheet VA/VC/NR state table (post 1b+1c+1d)

Grade rules (SR-3): **VA** = a source value/formula/constant confirmed on a cited rendered-PDF page
this session (or in 1b/1c). **VC** = markdown-only OR no source scalar to assert against (a persistence
round-trip only, i.e. `data_collection`/attestation with no printed number). **NR** = not reachable
(engine/document limit). A worksheet's grade = its *highest reachable* grade for its computable content.

Legend: `R-noeq` = 0-equation data-collection/attestation sheet (no numeric ground truth → VC by
nature, not a gap); `gate-topo` = has a gate-topology finding (batched) but source-verified.

### FLL-GAR-2023 (29)

| WS | Grade | Basis |
|---|---|---|
| GAR-01 | VC | R-noeq attestation; gate-topo F1 (reads GAR-03 fields), batched |
| GAR-02 | VC | R-noeq; F-02 declared-derived no producer, batched |
| GAR-03 | VA | LBO/WHG §4.1 clause verbatim (GAR PDF); clause-ref retag batched |
| GAR-04 | VA | §4.4 ice-pressure captured; REQ-06 prose-gate = NR-gate (manual), batched |
| GAR-05 | VC | R-noeq data-collection |
| GAR-06 | VA | §4.6 Ev2≥45 MPa / Ev2/Ev1≤2,5 / DPr≥97% verbatim; §9.2 clause-ref batched |
| GAR-07 | VA | Tab.1 slope limits verbatim; per-material enforcement = ruling, batched |
| GAR-08 | VC | R-noeq scaffold; §4.4 clause-ref batched |
| GAR-09 | VA | 1b/1c source-verified |
| GAR-10 | VA | Tab.material thresholds verbatim; F1/F2 discriminator/cross-ws gates batched |
| GAR-11 | VA | Tab.3/Tab.5 thresholds verbatim; enum-as-freetext batched |
| GAR-12 | VA | Tab.6 w/z≤0,60, Z≥280 kg/m³, fck≥C25/30 verbatim; gates unencoded, batched |
| GAR-13 | VA | Asphaltbeton Hohlraum≤3 Vol.-% + Schichtdicke≥40 mm verbatim; §5.4 retag batched |
| GAR-14 | VA | 1b/1c source-verified |
| GAR-15 | VC | R-noeq data-collection |
| GAR-16 | VC | R-noeq data-collection |
| GAR-17 | **VA** | **§6.3/Tab.23/§6.3.1.2/§6.3.2 p.88-89 (task 1.1)**; §9.9→§6.3 clause finding batched |
| GAR-18 | VC | R-noeq data-collection |
| GAR-19 | VA | Verzinkung ≥100 µm verbatim; "soll" → block-vs-warn ruling batched |
| GAR-20 | VC | R-noeq data-collection |
| GAR-21 | VA | GUP thresholds verbatim; §9.13 clause-ref batched |
| GAR-22 | **VA/NR-split** | 2a Auflast eq VA; **Eq 2b = NR (cos β, trig-blocked)**; Anhang-2 = NR (informative, no worked ex.) |
| GAR-23 | VA | Freibord ≥5 / ≥30(→≥15) cm verbatim; dead validation_rules + SR-2 pick batched |
| GAR-24 | VA | 1b/1c source-verified |
| GAR-25 | VA | 1b/1c source-verified |
| GAR-26 | VA | 1b/1c source-verified |
| GAR-27 | VA | Gl.1 A·C rainfall eq VA (1b); duplicate A/C single-source batched |
| GAR-28 | VC | R-noeq inspection-interval; §16→§13 retag + FORM_TEMPLATE artifact batched |
| GAR-29 | VC | R-noeq terminal/summary sheet |

### FLL-Naturteich (15)

| WS | Grade | Basis |
|---|---|---|
| FLLNT-01 | VA | REQ-03/04 attest gate-topology VA (1c, real save); §9.1 excavation verbatim |
| FLLNT-02 | VA | 1b/1c source-verified |
| FLLNT-03 | VA | §8.2.2 type share >50/>30% verbatim; F1 greedy-AND Type-III vacuous-pass + orphan type_III batched |
| FLLNT-04 | VC | R-noeq data-collection |
| FLLNT-05 | VA | P-limit `mg P/kg` verbatim; unit "as P" drop batched |
| FLLNT-06 | **VA** | **§9.2/§9.3/§9.4 p.41-42 + PUWS ex. p.82 (task 1.2)**; F1 cross-ws gates batched |
| FLLNT-07 | VC | R-noeq construction data-collection |
| FLLNT-08 | VC | R-noeq; F2 ungated service_description block-candidate batched |
| FLLNT-09 | VA | overflow-type rules verbatim; phantom enum-value fields + REQ-20/21 vacuous batched |
| FLLNT-10 | **VA** | **EQ-01 50×-Regel p.82 (task 2, ceiling LIFTED)** + EQ-02/EQ-03 filter vol p.85 (1c) |
| FLLNT-11 | **VA** | **EQ-05 150 l/m² p.54 (task 2, ceiling LIFTED)** + EQ-04 overflow edge p.57 (1c) |
| FLLNT-12 | **VA** | **§10.4.3 density ranges p.57-58 (task 1.3)** + REQ-25 attest gate VA (1c); quote-scope batched |
| FLLNT-13 | **VA** | **§11.1 "3 working days" p.59 + §12.4 repairs p.64 (task 1.4)** + REQ-28 attest VA (1c) |
| FLLNT-14 | VA | §maintenance-contract "should" verbatim; F1 REQ-27 over-enforces-source ruling batched |
| FLLNT-15 | VC | R-noeq terminal/summary sheet |

### FLL-TP-RHIZOM-2023 (21)

| WS | Grade | Basis |
|---|---|---|
| RHZ-01 | VC | R-noeq report; §8→§9 retag + NULL provenance batched |
| RHZ-02 | VA | §6 sample reqs verbatim; FND-1/2 dead block gates batched |
| RHZ-03 | VA | 1b/1c source-verified; cross-ws vacuous-consumer batched |
| RHZ-04 | VA | apparatus dims verbatim; REQ-06 hosted-here-fields-on-RHZ-05 topo batched |
| RHZ-05 | VA | §5 apparatus geometry verbatim; RHZ05-1 vacuous-under-local-lookup batched |
| RHZ-06 | VA | Tab.1 Sollbereiche (pH 6,0-7,5; N≤50; P2O5≤25; K2O≤100) verbatim; 0-gate + SR-2 ruling batched |
| RHZ-07 | VA | §5.7/§5.9-Tab.2 limits (Nitrat≤50 mg/l; pH∈[6,0;9,0]) verbatim; 0-gate batched |
| RHZ-08 | VA | species phragmites_australis + "9×9" verbatim; out-of-enum save + free-text batched |
| RHZ-09 | VA | 1b/1c source-verified |
| RHZ-10 | VA | 1b/1c source-verified |
| RHZ-11 | VA | 1b/1c source-verified; enum-null-option widget batched |
| RHZ-12 | VA | 1b/1c source-verified; F1/F2 misplaced/vacuous gates batched |
| RHZ-13 | VA | EQ-1 bestandsdichte producer VA; producer-consumer disconnect batched |
| RHZ-14 | VA | Tab.3 relative-density formula ØP/ØK×100 verbatim; missing-equation + ≥120/≥80% gate batched |
| RHZ-15 | VA | ≥160 density + verdict verbatim; §Wuchsleistung→§3.7 retag + unit batched |
| RHZ-16 | VA | 24-month relativ_prozent verbatim; F1 wrong-operand (RHZ-13 field) batched |
| RHZ-17 | VA | Durchdringung-Arbeitsunterbrechungsfuge clause verbatim; un-encoded gate batched |
| RHZ-18 | VC | R-noeq verdict-gate sheet, 0 gates; whole-standard pass/fail vacuous (HIGH) batched |
| RHZ-19 | VA | §10 extension conditions verbatim; REQ-22 symbols-on-RHZ-20 topo batched |
| RHZ-20 | VA | §10 "jedoch nur wenn" all-4-conditions verbatim; unenforced batched |
| RHZ-21 | VC | R-noeq terminal conformity/signature sheet; 0 gates batched |

### Counts (65 worksheets)

| Standard | VA | VC | NR | Total |
|---|---|---|---|---|
| FLL-GAR-2023 | 18 | 10 | 1* | 29 |
| FLL-Naturteich | 11 | 4 | 0 | 15 |
| FLL-TP-RHIZOM-2023 | 18 | 3 | 0 | 21 |
| **TOTAL** | **47** | **17** | **1*** | **65** |

`*` GAR-22 is counted once as its highest computable grade **VA** in the per-standard tally (its Auflast
chain 2a is VA); its **NR is at the equation node level** (Eq 2b), listed below. So worksheet-level:
**VA = 47, VC = 18, NR = 0**; equation-node-level there is exactly **1 NR node** (GAR-22 Eq 2b). Both
framings are shown to avoid ambiguity for the reasoning map: **17 pure-VC worksheets + GAR-22 (VA-body,
1 NR node) = the 18 non-all-VA rows.**

### The ONLY remaining NR (each named with why)

1. **GAR-22 Eq 2b** `g' >= (Δu·γ_A − (γ_F'·d_F + γ_Di'·d_Di)) / cos(beta)` — **NR (trig-blocked).**
   `src/lib/eval/arithmetic.ts` implements only min/max; no cos/sin/tan. The Mindestauflast-vs-uplift
   check cannot be auto-evaluated → engineer-manual. Engine NOT fixed (doctrine). The SOLE genuine
   trig-blocked equation across all 65 worksheets. (The formula itself is source-VA; only its
   *evaluation* is NR.)
2. **GAR-22 Anhang-2 (Flächengewichtsberechnung, chains 2a/2c)** — **NR-to-VA (informative).** Labelled
   "(informativ)" in the standard (GAR.txt L318/L6476/L6514) + no printed worked example → cannot reach
   normative VA; stays VC-illustrative. Not a reachability defect — a source-normativity ceiling.

No worksheet is unvisited; no worksheet is un-gradeable for a source-scalar reason other than the two
above. The 17-18 VC rows are all `R-noeq` data-collection/attestation/terminal sheets (no printed
number to assert VA against) — correct-by-nature, not gaps.

---

## Findings surfaced this task (PDF wins; staged-and-batched, NOT applied)

1. **GAR-17 clause-ref `§9.9` ≠ PDF** — governing content is §6.3/§6.3.1.1(Tab.23)/§6.3.1.2/§6.3.2
   (p.88-89). PDF wins. (M2 decision #10 confirmed on the rendered page.)
2. **GAR-17 `fk_haftung_untergrund` `N/mm²`** — source gives only a qualitative "vollflächiger
   Haftungsverbund"; no numeric threshold printed → the unit implies a value the source never states
   (VC-residue on that threshold).
3. **FLLNT-10 EQ-01 modal verb** — source says "should … at least 50-times" (recommendation, "as
   experience shows") + lives in "Appendix 5 (informative)"; encoding is a hard `>=` block → block-vs-warn
   + normativity ruling.
4. **FLLNT-11 EQ-05 framing** — source labels 150 l/m² an "Approximate value … at least 150 l" → firm
   floor presented as approximate; block-vs-warn ruling.
5. **FLLNT-12 REQ-25 quote-scope**, **FLLNT-13 §11.1 un-gated ≥3-days** — carried from M2, page-confirmed
   here; enrichment/new-gate batched.

All above are **rulings/enrichments for Alvaro's batch** — none is a source-value that the PDF
contradicts on its number; every numeric/constant that upgraded VC→VA matched the PDF exactly.

---

## Raw output (backing the VA claims)

**Prod worksheet counts (live, read-only, 2026-07-24):**
```
FLL-GAR-2023        29
FLL-Naturteich      15
FLL-TP-RHIZOM-2023  21   (= 65)
```

**GAR-17 — GAR PDF p.88-89 (`_va-pdf\GAR-full.txt`):**
```
L4265  6.3        Flüssigkunststoffe
L4271-4273  Nach Aushärtung … Widerstand gegenüber natürlichen Witterungs- und Alterungsprozessen.
L4286  <page footer 88>
L4291  Tab. 23: Stoffe und Anforderungen für Flüssigkunststoffe
L4300  UP … L4303 PUR 1K … L4306 PUR 2K … L4311 PMMA
L4308  ≥ 110 g/m²   ≥ 2,0 mm
L4323-4325  Die Mindestschichtdicke … mind. 2,0 mm. Wenn die in der ETA angegebene Mindestschichtdicke höher ist, gilt der höhere Wert.
L4345-4346  Zur Vermeidung der Hinterläufigkeit ist ein vollflächiger Haftungsverbund zum Untergrund herzustellen.
L4348-4351  … vollflächig haftend und mindestens zweischichtig … Streichen, Rollen oder Spritzen … Einlagen … Flächengewicht von mind. 110 g/m² …
L4352  <page footer 89>
```

**FLLNT-06 — Naturteich PDF p.41-42, p.82 (`_va-pdf\NT-full.txt`):**
```
L2180  Natural pools must be separated into a swimming area and a regeneration area.
L2189  The separation must be structurally durable and stable.
L2205  <page footer 41>
L2207-2208  … cannot be treated with biocides; … only sealings that allow biofilm to form … permissible.
L2244-2245  … the water level remains consistently at least 5 cm below the upper edge of the sealing system.
L2254-2255  … maximum deviation of the planned nominal height of +/- 10 mm.
L2260  <page footer 42>
L3989-3995  Surface area of the pool … Ground area: 50 m² / Wall area: 45 m² / Total: 95 m²
L4015  <page footer 82>
```

**FLLNT-10 EQ-01 + FLLNT-11 EQ-04/EQ-05 — Naturteich PDF p.54, p.57, p.82:**
```
L2729-2730  The usable volume of the splash water tank must be dimensioned so that at least 150 l per square metre … inundated water surface.   [p.54, footer L2735]
L2701       Example: Swimming area 30 m², 1% of 30 = 0.3 i. e. length of the overflow edge 0.3 m.   [EQ-04, p.57]
L3972-3974  The outer grain surfaces … should … amount to at least 50-times the surfaces of the pool that are exposed to light and submerged.   [EQ-01, p.82]
L3982       Surface of the filter body = 600 m2/m3 x 15 m2 x 0.7 m = 6300 m2
L3998-4004  95 m² x 50 = 4750 m²  …  4750 m² / 600 m² / m³ = approx. 8 m³
L3967       Appendix 5 (informative): Filter description and calculation   [informative-annex flag]
L4015  <page footer 82>
```

**FLLNT-12 p.57-58, p.36 / FLLNT-13 p.59, p.64 — Naturteich PDF:**
```
L2878-2880  submerged plants 6 – 10 ; half-height/tall marsh+aquatic 3 – 5 ; medium/tall 5 – 7 plants
L2883       … applies to pot plants P 0.5 (500 cm³).
L2910  <page footer 57>
L2916-2919  after approximately 4 - 8 weeks … ; approximately 4 - 6 weeks after the next vegetation period …
L2940  <page footer 58>
L1544-1545  … native to Central Europe must be favoured … no invasive alien species … are to be used.   [p.36]
L2958-2959  The supplier must inform the purchaser … no later than 3 working days before the respective completion date.
L2984  <page footer 59>
L3169-3176  12.4 Repairs … replacing filter materials; … replacing defective technical systems; … replacing and supplementing plants; … repairing structural installations.
L3184  <page footer 64>
```

---

## Bottom line

- **VC→VA closed (task 1):** GAR-17/R3 (p.88-89), FLLNT-06/R1 (p.41-42, p.82), FLLNT-12/R2 (p.57-58,
  p.36), FLLNT-13/R3 (p.59, p.64) — all upgraded to **VA** with verbatim quotes + page refs.
- **DS ceiling LIFTED (task 2):** FLLNT-10 EQ-01 (50×-Regel, **p.82**) and FLLNT-11 EQ-05 (150 l/m²,
  **p.54**) → **VA**. `NIE VA` premise dead. Residual = block-vs-warn / informative-annex rulings only.
- **Final state (task 3):** **VA 47 / VC 18 / NR 1** at the granularity that matters — worksheet-level
  VA=47, VC=18 (17 pure-VC + GAR-22 VA-body); the single NR node = **GAR-22 Eq 2b (cos β, trig-blocked,
  engine unfixed per doctrine)**, plus GAR-22 Anhang-2 as an informative-normativity ceiling. Every VC
  is an `R-noeq` sheet with no printed number to assert VA against.
- **Findings (PDF wins):** §9.9→§6.3 clause-ref, `N/mm²` no-source-value, EQ-01/EQ-05 modal-verb — all
  staged-and-batched for Alvaro; no numeric contradiction found (every upgraded value matched the PDF).
- **Prod untouched.** Read-only. No writes. Provenance lives here to seed STEP 2's reasoning map.
