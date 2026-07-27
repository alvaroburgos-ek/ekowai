# Wave-3 Regulatory Encoding Audit — DWA-A-178 (STD 2)

**Ledger header**
- Model: `claude-opus-5` (pinned) · Effort: high · CLI `2.1.218`
- Session date: 2026-07-27 · worktree `C:\Users\Ekowai\_wt-fll` @ `feat/fll-revision`
- prod `vadsmshzebefjreqcicl` — **read-only this wave. No prod writes, no map edits.**
- Scope: ONE standard (serial depth per doctrine §4).

## Sources (verified present this session)

| Artifact | Path / id | Verified |
|---|---|---|
| Standard PDF | `…\Desktop\Guidelines\DWA-A-178\DWA-A_178.pdf` | 48 pages, text layer (284 553 chars) |
| Live encoding | prod `standards.id = 77694afd-8a2a-47a9-8c76-f1ba38b71419` | 19 ws / **118 fields** / **13 eq** / **28 CR** |

**Page offset = −2, RE-DERIVED this session** (printed = PDF − 2), confirmed at four
independent pages via the DWA running footer: PDF 12→10, 20→18, 30→28, 40→38.
Pages cited below are **printed** unless marked PDF.

**Identity check — the standard is not what the triage table says it is.**
Title page and prod both read **„Retentionsbodenfilteranlagen“**, Arbeitsblatt DWA-A 178,
Juni 2019 (korrigierte Fassung Oktober 2019). The triage table calls it
*"Straßen-Entwässerung/RiStWag"*. RiStWag appears in this document **once**, in §6.2.1.3,
as a cross-reference for Wasserschutzgebiete — almost certainly where the wrong label came
from. See F-9.

---

# PART 1 — REVERSE-CHECKS: what I suspected and the source DISPROVED

Recorded first, deliberately. Four separate times this audit was one step from filing a
defect that does not exist. Per doctrine's reverse-Trap-6 / R-5, a disproved suspicion is
reported as a reversal, not quietly dropped.

### RV-1 — "Six `block` gates use deprecated `IF…THEN` and therefore never enforce." **FALSE.**
The campaign skill's `references/engine-grammar.md` states literal `IF a THEN b` is
"deprecated for authoring … enforces only if the engine happens to parse it, and was found
dead/unenforced in several standards." REQ-09/10/12/16/18/21 are all `block` and all use it.

The engine is ground truth, and it **does** implement the production:
`src/lib/compliance/evaluate.ts` L48/L52 (`'IF' | 'THEN'` keywords), L165-169 (parse),
L457 (*"IF guard THEN body — vacuously pass when guard is false"*). Correct implication
semantics. **All six enforce. The reference doc is stale on this point and should be
corrected — it is one re-read away from causing six false "fix" migrations.**

### RV-2 — "REQ-18 `A_F >= 100 * A_E_b_a` is off by 10 000." **FALSE.**
> §6.2.2.1, printed p.26: *"Im Trennsystem ist bei einer mittleren Jahresniederschlagshöhe
> von > 1.000 mm/a eine Filterfläche von A_F = 100 m² je Hektar befestigter,
> angeschlossener Fläche (A_E,b,a) anzusetzen …"*

`A_F` unit = **m²**, `A_E_b_a` unit = **ha**. 100 m² per hectare → `A_F >= 100 · A_E_b_a`
is dimensionally correct as encoded. (Residual, minor: the source prints `=` … *anzusetzen*
and the encoding reads `>=`. Same "minimum ⇒ ≥" reading as A-262E B-R9 — an engineer call,
not a defect.)

### RV-3 — "REQ-19 `4 <= b_F` hits the symbol-RHS always-fail trap." **FALSE.**
The trap at L244 fires only when **left** is a bare symbol (`aref`) *and* right is a simple
operand, whereupon `operandToLiteral` L364 turns a bare ident into a string. In `4 <= b_F`
the left operand is a number, so parsing takes the numeric `acompare` path (L247).
Likewise REQ-20's `B_RBFA_ab / A_E_b_a <= b_R_e_zul` — the left is arithmetic, so `acompare`
again and the RHS symbol resolves normally. **No symbol-RHS defect exists in this standard.**

### RV-4 — "`== True` (capital T) becomes a string literal and always-fails." **FALSE.**
REQ-02/11/24 use `True`, REQ-26 uses `False`, REQ-07 uses lowercase `false` — the casing is
inconsistent, which is what drew my eye. `evaluate.ts` L10 documents *"boolean equality:
flag == true, x == True"* and L54 maps both cases to the TRUE/FALSE keywords. **Safe.**
The inconsistency is cosmetic only.

---

# PART 2 — VERBATIM THRESHOLD VERIFICATION (11 of 11 CONFIRMED)

Every numeric threshold in the encoding, checked against its printed clause. **All match.**

| CR | encoded | printed source | page | ✓ |
|---|---|---|---|---|
| REQ-09 | `e_0 <= 55` | *"wenn sie eine Entlastungsrate von e₀ ≤ 55 % einhalten"* | 26 | ✓ |
| REQ-09/22 | `n_RBF >= 10` | *"im langjährigen Mittel n ≥ 10 Entlastungen pro Jahr"* · *"Die Beschickungshäufigkeit muss im langjährigen Mittel ≥ 10 a sein."* | 26 / 30 | ✓ |
| REQ-10 | `v_spez_grobstoff >= 0.5` | *"Das erforderliche spezifische Sammelvolumen wird auf mindestens 0,5 m³/ha A_E,b,a festgelegt."* | 26 | ✓ |
| REQ-12 | `>= 0.75` misch / `>= 0.5` trenn+strasse | *"Die erforderliche Höhe des Filterkörpers beträgt im konsolidierten Zustand: Mischsystem h_FK ≥ 0,75 m, Trennsystem und Straßenentwässerung h_FK ≥ 0,50 m."* | 23 | ✓ |
| REQ-13 | `filter_U < 5` | *"Es muss eine steile Körnungslinie mit U = d60/d10 < 5 eingehalten werden."* | 23 | ✓ |
| REQ-13 | `feinanteil <= 3` | *"ein maximaler Feinanteil (< 0,063 mm) von ≤ 3 Massen-%"* | 23 | ✓ |
| REQ-13 | `ueberkornanteil <= 15` | *"ein maximaler Überkornanteil von ≤ 15 Massen-%"* | 23 | ✓ |
| REQ-13 | `calcium_carbonate >= 20` | *"Das Filtermaterial muss einen Calciumcarbonatgehalt von ≥ 20 Massen-% aufweisen."* | 23 | ✓ |
| REQ-14 | `q_Dr_RBF <= 0.05` | *"dass bei Volleinstau des Retentionsraums die spezifische Drosselabflussspende auf q_Dr,RBF = 0,05 l/(s·m²) begrenzt ist"* | 25 | ✓ |
| REQ-21 | `t_RR_E_n1 <= 48` | *"muss die Einstaudauer des Retentionsraums für n = 1 ≤ 48 h sein"* | 30 | ✓ |
| REQ-23 | `langzeitsimulation_dauer >= 10` | *"basiert auf einer Kontinuumssimulation mit mindestens 10 Jahren Niederschlagsbelastung"* | 30 | ✓ |
| REQ-25 | `abdichtung_kdb_staerke >= 2` | *"Die Abdichtung muss mit Kunststoffdichtungsbahnen einer Stärke von mindestens 2 mm ausgeführt werden."* | 24 | ✓ |
| REQ-11 | attestation | *"Innerhalb von Wasserschutzgebieten ist zum Schutz gegen Havarien ein zusätzlicher Auffangraum für Leichtflüssigkeiten gemäß RiStWag vorzusehen."* | 26 | ✓ |

**Zero numeric defects.** This encoding's *values* are sound. Its problems are all in the
computation layer and in modal-verb severity — which is the pattern the register predicts
once a standard's arithmetic has been transcribed carefully.

---

# PART 3 — FINDINGS

## F-1 — SEV-1 · Gl. 13 references a symbol that does not exist
`eta_F` (§6.2.2.3, Gl. 13, A178-15):
```
formula:        eta_F = ((C_RBF_zu * VQ_DR_RBF_zu) - (B_RBF_ab * 1000)) / (C_RBF_zu * VQ_RBF_zu)
input_symbols:  [C_RBF_zu, VQ_Dr_RBF, B_RBF_ab, VQ_RBF_zu]
```
`VQ_DR_RBF_zu` **is not a field of this standard** (live field list: `VQ_Dr_RBF`,
`VQ_Dr_RRL`, `VQ_FU`, `VQ_RBF_zu`, `VQ_RBFA_zu`). It differs from the declared
`VQ_Dr_RBF` in **both case and suffix**, and the engine is case-sensitive. The declared
input `VQ_Dr_RBF` is meanwhile never referenced by the formula.

**`eta_F` cannot compute** — and it is an input to Gl. 5/6/7 (`b_F`), which REQ-19 gates.
This is the case-sensitive-symbol-mismatch class (playbook §10e class 3), and it is exactly
the blind spot the faithfulness gate misses: the gate checks declared `input_symbols`
against fields, not the formula's own tokens.

## F-2 — SEV-1 · Gl. 2 and Gl. 3 call an unsupported function and throw
```
Gl.2:  B_RBF_zu = SUM_over_i(A_E_b_a_i * b_R_a)
Gl.3:  B_RBF_zu = SUM_over_i(A_E_b_a_i * b_R_a * e_0)
```
`src/lib/eval/arithmetic.ts` L28: `SUPPORTED_FUNCTIONS = new Set(['min','max'])`, and L74
is explicit that *"All other function calls throw so unsupported formulas fail loud."*
`SUM_over_i` therefore **throws**, and `B_RBF_zu` is never produced by either equation.

`B_RBF_zu` feeds Gl. 1 (`A_F = (B_RBF_zu / b_krit) · eta_B_soll`) — the primary filter-area
sizing. **Honest limit on this finding:** `B_RBF_zu` also exists as a *field* on A178-09, so
the chain degrades to hand-entry rather than failing outright. That is the
free-typed-should-derive class (§10e class 1), not a hard outage.

## F-3 — SEV-1 · Gl. 9's formula is not a formula
```
output_symbol: b_F_im_bereich
formula:       4 <= b_F <= b_krit = 7   [kg/(m^2*a)]
```
A chained comparison, an embedded assignment (`b_krit = 7`), and a unit annotation, all in
the formula field. Not evaluable under any path; `b_F_im_bereich` is never produced.
Note it also **hard-codes 7** while simultaneously naming the field `b_krit` — if `b_krit`
is ever project-specific, the literal and the field disagree silently.

## F-4 — SEV-2 · Multi-producer collisions (register class C9)
- `B_RBF_zu` ← **Gl. 2 and Gl. 3** (Gl. 3 adds the `e_0` factor: Misch- vs Trennsystem)
- `b_F` ← **Gl. 5, Gl. 6 and Gl. 7** (progressively adding `VQ_FU·eta_RR`, then `VQ_Dr_RRL·eta_RRL`)

Both sets are legitimately *alternative* formulations selected by system configuration, but
**no selector is encoded** — nothing in the rows says which applies when. This is the same
shape as A-138's rainfall-table selection, and it is the standing collision-blank risk.

## F-5 — SEV-2 · Eight CRs carry placeholder text where a condition belongs
`manual_check` — REQ-01, 04, 05, 06, 08, 28 · `manual_check_against_bild_1` — REQ-03 ·
`equation_1_evaluated` — REQ-17.

None is a parseable condition. **Mitigating and important:** all eight are `severity: warn`,
and gates enforce only at `block`, so **no enforcement is actually lost**. They are honest
"a human must look at this" markers wearing a condition's clothing. The question is whether
the product should carry a first-class *manual attestation* type rather than a fake
condition — the same gap `product_workflow` was created for on the data_class axis.

## F-6 — SEV-2 · REQ-20 restates its equation instead of reading it (class G12)
```
Gl.10  formula:   B_RBFA_ab / A_E_b_a <= b_R_e_zul     output: emission_eingehalten
REQ-20 condition: B_RBFA_ab / A_E_b_a <= b_R_e_zul
```
Byte-identical. The gate should read `emission_eingehalten`. As encoded the arithmetic is
maintained in two places and can drift. (Gl. 10 is itself an inequality-as-producer, ES-1 —
benign here since the output is a boolean check, but it needs the same disposition ruling.)

## F-7 — SEV-2 · Two `block` gates over non-mandatory clauses
- **REQ-15** `h_RR >= 0.3 AND h_RR <= 2`, `block`, §6.1.4.3:
  > printed p.22: *"Nutzbare Einstauhöhen **liegen zwischen** h_RR = 0,3 m und 2 m."*
- **REQ-27** `pflanzdichte >= 4 AND pflanzdichte <= 8`, `block`, §6.1.4.7:
  > printed p.24: *"Als Pflanzdichte **haben sich** 4 bis 8 Pflanzen je Quadratmeter **bewährt**."*

Both are descriptive/experiential — *"lie between"*, *"have proven themselves"* — with no
mandatory modal, yet both hard-block. Compare REQ-13, whose *"muss … eingehalten werden"*
genuinely earns its `block`. Same class as A-262E B-R4. **Ratification, not a unilateral fix.**

**Counter-consideration, stated so the ruling is informed:** REQ-27's field `pflanzdichte`
is `is_required = false`, so the gate only bites once a value is entered. That materially
lowers its harm and may argue for leaving it.

## F-8 — SEV-3 · Six CRs assert nothing but carry no quote
`source_quote IS NULL` — REQ-07, 14, 17, 19, 20, 22. These are **honest** (validator rule
10a deliberately exempts NULL: storing nothing beats storing a false claim) and none asserts
`audit_status='match'`. But four of them are `block` gates. I verified REQ-14/21/22's
thresholds from the PDF in Part 2 — the text exists and simply was never captured.
Queue as a quote-backfill alongside W3-D12; it is pre-authorised work, not a ruling.

## F-9 — SEV-3 · Triage table mislabels the standard
`wave0-TRIAGE-TABLE.md` row: *"DWA-A-178 | Straßen-Entwässerung/RiStWag"*. Actual title:
**Retentionsbodenfilteranlagen**. The `standards.title_de` in prod is correct, so this is a
triage-artifact defect only — but the triage table is the campaign's ranking surface, and a
wrong title there is how a standard gets audited against the wrong expectations.

## F-10 — SEV-3 · The 2 live validator ERRORs
```
8.norm-input-ref-consumed · section-a178-06 — normative-as-input-reference with no consumed_by:: edge
8.norm-input-ref-consumed · section-a178-07 — (same)
```
Map-layer, not prod. A178-07 is the parameter sheet that owns `b_krit`, `q_Dr_RBF`,
`e_0`, `eta_B_soll`, `pflanzdichte`, `v_spez_grobstoff`, `h_FK_required` — all consumed
elsewhere, so the missing `consumed_by::` edges look like map under-linking rather than a
real orphan. Mechanical map fix.

## F-11 — SEV-3 · All 118 fields are `imported_unverified`
No field of this standard has been engineer-verified. Expected for an un-swept standard;
recorded so the tier is not read as stronger than it is.

---

# DECISION BATCH — Wave 3 STD 2 (DWA-A-178)

Nothing applied. `[APPLY]` = prod write · `[CODE]` = tooling/map · `[RULING]` = Alvaro only.

- **A178-D1 — Gl. 13 symbol `VQ_DR_RBF_zu`.** Which field is meant: `VQ_Dr_RBF`, or a
  genuinely distinct `VQ_Dr_RBF_zu` that was never created? The formula's own structure
  (numerator `C_RBF_zu · VQ_?`) suggests the drain-path volume `VQ_Dr_RBF`, but I will not
  guess a symbol into an equation. **[RULING → then APPLY] SEV-1**
- **A178-D2 — Gl. 2/3 `SUM_over_i`.** Rewrite to engine-supported arithmetic, or ratify
  `B_RBF_zu` as hand-entered and drop the two equations. **[RULING] SEV-1**
- **A178-D3 — Gl. 9 malformed formula.** Split into an equation producing `b_F` and a gate
  reading it (P-6b), or delete the row as a duplicate of REQ-19. Also decide whether
  `b_krit`'s 7 is a literal or the field. **[RULING] SEV-1**
- **A178-D4 — multi-producer selectors** for `B_RBF_zu` (Gl.2/3) and `b_F` (Gl.5/6/7).
  Which configuration selects which? **[RULING] SEV-2**
- **A178-D5 — placeholder conditions on 8 warn CRs.** Introduce a first-class manual-check
  requirement type, or leave as-is given nothing enforces at `warn`. **[RULING] SEV-2**
- **A178-D6 — REQ-20 → read `emission_eingehalten`** instead of restating Gl. 10.
  *rec: apply, mechanical.* **[APPLY] SEV-2**
- **A178-D7 — REQ-15 and REQ-27 `block` over descriptive clauses.** Demote to `warn`, or
  ratify `block` with rationale. Note REQ-27's field is not required. **[RULING] SEV-2**
- **A178-D8 — quote-backfill the 6 NULL-quote CRs** (REQ-07/14/17/19/20/22). Pre-authorised
  under the sequencing rule; queued behind W3-D12. **[APPLY] SEV-3**
- **A178-D9 — correct the triage-table title** to Retentionsbodenfilteranlagen. **[CODE] SEV-3**
- **A178-D10 — add `consumed_by::` edges** on section-a178-06/07. **[CODE] SEV-3**
- **A178-D11 — CORRECT THE SKILL'S engine-grammar.md.** It states `IF…THEN` is
  dead/unenforced; `evaluate.ts` implements it with vacuous-pass semantics. Left uncorrected
  this doc will cause false "fix" migrations on every standard that uses the form.
  *rec: apply, and re-check which standards were previously "fixed" on this false premise.*
  **[CODE] SEV-1 — highest-leverage item in this batch**

# HONEST RESIDUE

1. **No harness run.** No A-178 gate was fired through the real save path. F-1/F-2/F-3 are
   argued from the parser source and the field inventory, not from execution. Per the
   standing F-4 lesson, static reasoning is exactly what misses fire-but-never-enforce bugs.
2. **Equation-level verbatim check is partial.** I verified all 11 numeric *gate* thresholds
   against the PDF, but did **not** symbol-by-symbol verify all 13 equations against their
   printed forms — only the three that are structurally broken (13, 2/3, 9). Gl. 1/4/5/6/7/8/
   11/12 are unverified against the page.
3. **§7, §8, §9 not audited.** This pass covered §5–§6 (the dimensioning and requirement
   core) plus §8.3 via REQ-28. Operation/maintenance clauses are unswept.
4. **Anhang / Bild 1** not examined — REQ-03 explicitly defers to Bild 1
   (`manual_check_against_bild_1`) and I did not verify that figure exists or says what the
   CR implies.
5. **F-10's "map under-linking" read is inference**, not verified against the map files.

# CONVERGENCE METRICS (standing-order rule 5)

- **Per-standard cost:** lower than VDI-3814. The PDF-extraction toolchain built during
  W3-D1 (`extract-bilingual-column` + `clause-slice`) was reused unchanged; only a DWA
  watermark pattern was added. Threshold verification that was hand-work last wave was
  ~4 commands this wave.
- **Re-catch rate:** 0 new re-catches on previously-swept standards. But **A178-D11 is a
  re-catch on the campaign's own reference material** — a defect in the skill doc rather
  than in a standard, which the metric does not currently model.
