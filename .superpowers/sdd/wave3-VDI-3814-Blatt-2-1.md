# Wave-3 Regulatory Encoding Audit — VDI-3814-Blatt-2-1

**Ledger header**
- Model: `claude-opus-5` (pinned) · Effort: high
- CLI: `2.1.218 (Claude Code)`. **2.1.220 exists upstream (npm), winget manifest lags** —
  `winget upgrade --id Anthropic.ClaudeCode` → **exit 43 "No available upgrade found"** even after
  `winget source update`. Independently reproduced this session; matches the Wave-2 BLOCKER.
  Not installed out-of-band (would fork a winget-managed install). Alvaro's call.
- Session date: 2026-07-27 · worktree `C:\Users\Ekowai\_wt-fll` @ `7a0ebc4` (`feat/fll-revision`)
- prod `vadsmshzebefjreqcicl` — **read-only this wave. No prod writes, no map edits.**
- Scope: ONE standard (serial depth per doctrine §4).

## Why this standard was chosen (queue correction, R-3)

The ledger ranked Wave-3 candidates on wave0 `belowVA`/`dead` + wave2 `acc%` only. Re-running the
validator live this session over the **full 71-standard corpus**:

```
node scripts/reasoning-map/validate.mjs
TOTAL nodes = 3978   ERRORS = 3345   WARNINGS = 1029   (exit 250)
```

The `ERRORS = 0` baseline in `_PROGRAM-REPORT.md` covers only the **6 hand-built maps (512 nodes)**,
not the 66 Wave-0 generated maps. Folding live errors in:

| candidate | live ERRORS | nodes | belowVA | dead | wave2 acc% |
|---|---|---|---|---|---|
| **VDI-3814-Blatt-2-1** | **0** (0 warns) | 47 | 12 | 1 | 89.2 |
| DWA-M-205 *(ledger top pick)* | 50 | 100 | **96** | **14** | 100 |
| ISO-5667-13 | 24 | 45 | 32 | 2 | 93.8 |
| DWA-M-732 | 15 | 55 | 33 | 1 | 90.9 |

M-205's "100 %" is accuracy over a small testable subset while 96/100 nodes sit below VA. On the
ledger's own rule ("high acc% + low dead = cheapest to finish") **VDI-3814 is the correct pick.**

## Sources (verified present this session)

| Artifact | Path | Verified |
|---|---|---|
| Standard PDF | `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\VDI-3814-Blatt-2-1.pdf` | 34 pages, text layer present (496 407 chars extracted) |
| Reasoning map | `…\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\VDI-3814-Blatt-2-1\` | 47 `.md` files |
| Live encoding | prod `standards.id = 2b60107c-79cb-47ca-8c01-bad5cb42c72d` | 7 ws / 28 CR / **0 eq** / **69 fields** |

### Page offset — RE-DERIVED, not inherited (R-3)

The map claims it derives its own offset from this PDF's footer and explicitly refuses the 138/GAR
`−2` rule. **Independently confirmed: offset = 0** (printed page N == PDF page N), verified at 14
pages (2,3,5,8,10,12,15,18,20,23,25,28,30,33) via the running header `… / Part 2.1 – N –`.
Clause→page index rebuilt from body pages 4–34; **all 28 CR `clause_reference` values resolve to
real, existing clauses.** The map's stated anchors (§1→p4, §5/§6→p5, §7→p11, §8→p20, §8.10→p27,
§8.11→p28) all reproduce.

**Mandate axis N/A, stated honestly:** this standard has **zero equations**. The "every equation
symbol-by-symbol" axis is vacuous here — not skipped, absent.

---

# FINDINGS

## F-1 — SEV-1 · CROSS-STANDARD · "verified" status with zero evidence text

All 28 VDI-3814 CRs carry `source_quote = '[Klausel-verifiziert: ]§X.Y'` — a *clause-verified*
label wrapping an **empty quote body** — together with `audit_status = 'match'`. No printed text
is stored for any of the 28.

This is the UNVERIFIED PROVENANCE class (`CLAUDE.md` R-1/R-3) in stored form: an assertion of
verification that carries no evidence and is indistinguishable from real verification by inspection.

**Corpus-wide test** (label wrappers and bare clause refs stripped, residue < 12 chars):

| standard | CRs with no evidence text | claiming `match` |
|---|---|---|
| VDI-3814-Blatt-2-1 | 28 | 28 |
| **HOAI-2021** | **23** | **23** |
| DIN-14021 | 3 | 3 |
| **total** | **54** | **54** |

**HOAI-2021 is a RE-CATCH on an already-closed standard.** `DATA-FIX-CAMPAIGN.md` item 4 records
HOAI-2021 as ✅ COMPLIANT-pending-review (commit `fe85f05`) with the note "quotes backfilled VA".
Live prod says 23 of its CRs carry the empty stub. Per the standing cycle rule *"tiers move DOWN as
well as up"*, HOAI-2021 **drops tier**.

Corpus context: 899 CRs carry `source_quote IS NULL` and **0** of them claim `match` — those are
honest. The defect is specifically *label-without-quote asserted as verified*.

→ **Becomes validator rule 10** per standing-order §1 (new defect class → rule immediately).

## F-2 — SEV-1 · NEVER-INVENT · `ag_freigabe` has no basis in the document

`ag_freigabe` (WS-07, boolean, **is_required = true**, `clause_reference = §5`).

Full-document search across all 34 pages:

| term | hits |
|---|---|
| `Freigabe` | **0** |
| `freigeb` | **0** |
| `genehmig` | **0** |

§5 (printed p.5) says documents *"sind durch den AG kontinuierlich **zu pflegen**"* — maintenance,
not approval. There is **no purchaser-approval requirement anywhere in VDI 3814 Blatt 2.1.**
This is a required attestation the standard never asks for.

## F-3 — SEV-1 · OVER-ENFORCEMENT · CR-15 contradicts its own clause

`CR-15: lastenheft_erstellt == true`, severity **block**, `§8.1; §6.1`.

§8.1 printed p.20 verbatim:

> "Beim Verzicht auf die Erstellung/Verwendung von GA-Lastenheften **müssen** die Lasten des AG an
> eine Planung/Ausführung der GA in einer anderen [Form] …"
> EN: "**If the client chooses not to draw up/use** BACS user requirements specifications, the
> purchaser's requirements for the planning/design of the BACS …"

The clause **explicitly provides for the case where no Lastenheft is created** and prescribes an
alternative route. A hard `block` on `lastenheft_erstellt == true` forbids a path the source
permits. Severity/topology ruling required — not fixed unilaterally.

## F-4 — SEV-2 · dead gate + ungated field are ONE defect with ONE fix

- `CR-28`: `condition = TRUE`, severity **block**, `§6.1`, hosted on **WS-02**. Can never fail.
- §6.1 printed p.6 verbatim: **"Die Anforderungen müssen quantifizierbar und prüfbar sein."**
  (EN: "The requirements shall be quantifiable and verifiable.") — a genuine `müssen`.
- `anforderungen_pruefbar`: boolean, `is_required = true`, `clause_reference = §6.1`, on **WS-07** —
  encodes exactly that sentence, and **no CR tests it**.

The requirement exists in the source, a field encodes it, and no gate connects them. Closes
`dp-vdi-01` (dead-gate ruling) and part of `dp-vdi-03` in one move.

**Proposed fix (engine-safe):** re-home CR-28 WS-02 → WS-07, then `anforderungen_pruefbar == true`,
with the §6.1 p.6 sentence as `source_quote`. Both operands then live on WS-07, so **no
cross-worksheet symbol resolution is needed** — the limitation that forced the A-201 CR-006
ENGINE escalation. Same re-home pattern as A-201 CR-007 (commit `796631c`). **Staged, not applied.**

## F-5 — SEV-3 · CONFIRMATION (reverse-check, no defect)

`CR-27: dokumente_gepflegt == true`, block, §5 — **faithful**. §5 printed p.5 verbatim:

> "Die im Rahmen der Bedarfsplanung erstellten Dokumente, wie Betreiberkonzepte und Lastenhefte,
> **sind** durch den AG kontinuierlich **zu pflegen** und durch alle Verwender verpflichtend zu
> beachten."

Normative "sind zu" → **block is correct.** Only the `source_quote` is missing (F-1). Recorded so
the batch is not all-negative and so this CR is not "fixed" gratuitously.

## F-6 — SEV-3 · MAP↔PROD DRIFT

Map `_index.md` states the encoding has **`fields ×74`**. Live prod: **69**. Delta 5.
Drift between map and prod is its own finding class (standing-order §4).
`section_id IS NULL` count = **0** — this standard is free of the broad NULL-section quirk.

## F-7 — SEV-2 · ungated required fields: map says 3, prod says 14

`dp-vdi-03` flags 3 ungated required fields (all WS-07). Live census across all 7 worksheets:

| worksheet | required-but-ungated | symbols |
|---|---|---|
| WS-01 | 1 | `standard_geltungsbereich` |
| WS-02 | 1 | `projekt_kurzbeschreibung` (§6.3.3 exists, p.7) |
| WS-03 | 4 | `betreiben_teilleistungen`, `auslegungsparameter_ga`, `betreiber_arbeitszeiten`, `gewerke_anlagen_systeme` |
| WS-04 | 3 | `redundanz_vorgaben`, `mech_elektr_umgebung`, `meldungsuebertragung` (§8.3.2 exists, p.23) |
| WS-05 | 1 | `projektierungstools` (§8.5.1 exists, p.24) |
| WS-06 | 1 | `ga_funktionen` (**§8.9 exists, p.27 — and has no CR at all**) |
| WS-07 | 3 | `anforderungen_pruefbar`, `lastenheft_vollstaendig`, `ag_freigabe` |
| **total** | **14** | — |

§8.9 *GA-Funktionen und GA-Makros* is an encoded clause with a required field and **zero
enforcement**. `dp-vdi-03` must be widened from 3 to 14.

## F-8 — CANDIDATE ONLY (not a proven defect) · block gates over descriptively-worded clauses

All 28 CRs are `severity = block`; **not one `warn` exists.** A modal-verb census over body pages
4–34 shows the clause anchored by each of CR-03, 07, 09, 10, 16, 17, 18, 19, 20, 25, 26 contains
**no mandatory modal** in its own text.

**This is explicitly NOT reported as over-enforcement**, because the mandate is inherited: §6.1
p.6 states verbatim *"Abschnitt 6.2 bis Abschnitt 6.7 beschreiben die relevanten Aspekte der
Bedarfsplanung, die durch den Bauherrn … **festzulegen sind**"* — so §6.2–§6.7 are collectively
mandated even where each subsection reads descriptively. Same likely holds for the §8.x set via
§8.1. A naive modal count would have produced ~11 false "over-enforcement" findings.

Per-clause **inheritance ratification** is required. Candidate, upper bound, not a count of defects.
(Same discipline as Wave-2's OFF-BY-N caveat.)

### CR-02 anchor precision
`CR-02` (4-way greedy-AND, block) anchors at **§6.2**, whose printed text is an **exemplary list**:
"Grundlegende Informationen zum AG, **z. B.**: • Name, Adresse • Organisationsform • Vertreter •
Projektleiter … • **gegebenenfalls** weitere wichtige Informationen". The normative force lives in
§6.1, not §6.2. Anchor should cite **§6.1 + §6.2**; whether all four bullets of a "z. B." list may
be hard-required is a ruling.

---

# DECISION BATCH — Wave 3 (VDI-3814-Blatt-2-1)

Nothing below is applied. `[APPLY]` = prod write · `[CODE]` = tooling · `[RULING]` = Alvaro only.

- **W3-D1 — F-1 evidence backfill.** Replace the 28 `[Klausel-verifiziert: ]` stubs with real
  verbatim quotes, or downgrade `audit_status` off `match` until quoted. Extends to **HOAI-2021
  (23)** and **DIN-14021 (3)** = 54 CRs. **[APPLY] SEV-1**
- **W3-D2 — HOAI-2021 tier demotion.** Re-catch on a standard closed as COMPLIANT-pending-review.
  Confirm the drop and re-open it. **[RULING] SEV-1**
- **W3-D3 — `ag_freigabe`.** Zero textual basis in 34 pages. Delete the field, or make it
  non-required and relabel as a project-workflow item (candidate `product_workflow` per the N-1
  class, which exists precisely for non-source-derived workflow fields). **[APPLY + RULING] SEV-1**
- **W3-D4 — CR-15 block vs the §8.1 opt-out.** Source permits no-Lastenheft with an alternative
  route; the gate forbids it. Demote to `warn`, or re-scope the condition. **[RULING] SEV-1**
- **W3-D5 — CR-28 re-home + wire (F-4).** WS-02 → WS-07, `anforderungen_pruefbar == true`, quote
  §6.1 p.6. Closes `dp-vdi-01` + 1 of `dp-vdi-03`. **[APPLY] SEV-2 — recommended, engine-safe**
- **W3-D6 — widen `dp-vdi-03` from 3 → 14** ungated required fields; decide per field: gate, or
  drop `is_required`. §8.9 `ga_funktionen` has no CR at all. **[RULING] SEV-2**
- **W3-D7 — §6.1/§8.1 mandate-inheritance ratification (F-8).** Per clause: does the parent's
  "festzulegen sind" carry `block` down to each subsection? Governs ~11 CRs. **[RULING] SEV-2**
- **W3-D8 — CR-02 anchor** → `§6.1; §6.2`, and rule on hard-requiring a "z. B." list. **[RULING] SEV-3**
- **W3-D9 — map↔prod drift** 74 vs 69 fields: re-generate the map index from live prod. **[CODE] SEV-3**
- **W3-D10 — validator rule 10** (F-1 class: `audit_status='match'` with no evidence residue),
  then re-run corpus-wide per standing-order §1. **[CODE] SEV-1**

# CARRIED FORWARD (unsigned)
- **Wave-1 batch, 18 items** — DWA-A-138-1 R-1..R-6 (6) + DWA-A-262E R1..R12 (12).
- **Wave-2 batch** — W2-D1 (639-residual policy), W2-D2 (DVS-2225-4 `dp` +1, 5/5), W2-D3
  (DIN-18130-1 → source-blocked).

# HONEST RESIDUE
1. **Not taken to READY-TO-USE.** Blocked by design: W3-D3/D4/D7 are ratification-only
   (never-invent removal, block↔warn flip, modal inheritance). Doctrine forbids me deciding them.
2. **Verbatim quotes captured for 4 clauses** (§5, §6.1, §6.2, §8.1), not all 28. The other 24 are
   clause-*resolved* (anchor proven to exist) but not yet quote-captured. Stated rather than implied.
3. **No harness run.** Gates were not fired through the real save path this wave; F-4's fix is
   argued from engine topology (same-worksheet operands), not yet proven by execution. Per the
   `_PROGRAM-REPORT` F-4 lesson, static reasoning is exactly what misses fire-but-never-enforce
   bugs — so this is a real gap, not a formality.
4. **F-8 is an upper bound**, not a defect count. Inheritance likely legitimises most of it.
5. Tab.1 (§8.11) rows not yet row-verified; 6 `in_library:false` doc refs not yet boundary-scanned.
