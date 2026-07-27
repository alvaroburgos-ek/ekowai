# STEP 2 / task 2c — FLL-TP-RHIZOM-2023 reasoning map (report)

**Built:** `…\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\FLL-TP-RHIZOM-2023\`
(`_index.md` + **57 node notes**). Reuses the DWA-A-138-1 canonical template VERBATIM and follows
the FLL-GAR-2023 + FLL-Naturteich-2017 map conventions verbatim (node types, frontmatter, typed-
links, document-node taxonomy, decision-point handling, per-PDF page-offset derivation, inequality-
/verdict-as-producer + cross-worksheet-gate-topology extensions).
**Generated from artifacts only:** prod `vadsmshzebefjreqcicl` (standard
`d0a661ab-c448-4c97-baf1-fd860fd9adca`, 21 worksheets / 24 CRs / 3 equations) + rendered TP-Rhizom
2023 PDF (scoop `pdftotext -layout`) + STEP-1 deliverables (commits `3f9ca0f` VA/VC state, `40cd1b2`
applied gates). No prod writes this task (read-only). Doctrine `verification-doctrine.md` read in full.
**This is the LAST FLL map** — Phase 2 now builds the self-validation suite over all 4 maps
(DWA-A-138-1 + GAR + Naturteich + TP-Rhizom).

## Node counts (57 total, excl. index)
- **type:** section 21 · equation 3 · table 3 · compliance_requirement 24 · document 1 · decision-point 5
- **provenance (node-level):** VA 48 · VC 8 · NR 1
- **data_class:** standard_fixed 38 · engineer_input 8 · derived 8 · standard_range 3

## Worksheet-level VA/VC/NR (mirrors the STEP-1 TP-Rhizom share — CONFIRMED)
**VA 18 / VC 3 / NR 0** (21 worksheets), identical to `fll-d1-va-closure.md` §3 TP-Rhizom block.
The three VC sheets = RHZ-01 (Auftragsregistrierung, R-noeq), RHZ-18 (Bewertung-Gate verdict-
selection) and RHZ-21 (Konformitäts-Gesamtbescheinigung, terminal signature). No RHZ worksheet is
NR (no trig-blocked equation — GAR-22's alone). Node-level 48/8/1 is finer-grained: the 8 node-VC =
REQ-01 (scope membership), REQ-02/REQ-21 (attestation booleans), REQ-03/REQ-04 (RHZ-02 fail-
unreachable pair), + the 3 VC section sheets; the 1 node-NR = the `in_library:false` document node.

## Value-node invariant #1 — CONFIRMED (0 violations)
Scripted check over all 57 nodes: **0 VA-without-source_page** and **0 standard_fixed-without-page**
(excluding the one `in_library:false` document node that legitimately defers out-of-library).
**Wikilinks: 0 broken** across all files (only external target = the shared DWA-A-138-1 template,
intentional, same as GAR/NT). The `_index.md` carries `provenance: VA` with no page — index is a
map-level node, exempt, IDENTICAL to the GAR/NT `_index.md` convention.

## THIS PDF's page-offset (DERIVED — third distinct value, NOT inherited)
**`printed = physical − 1`** (NOT the `−2` of DWA-A-138-1/FLL-GAR, NOT the `−3` of FLL-Naturteich).
Derived from THIS PDF's own footer page-number tokens (`-layout` extraction), never inherited:
```
phys  4 -> printed  3        phys 15 -> printed 14   (Tab.1 substrate §5.6)
phys 12 -> printed 11        phys 16 -> printed 15   (Tab.2 water §5.9)
phys 14 -> printed 13        phys 23 -> printed 22   (§9 Prüfbericht "jedoch nur")
phys 31 -> printed 30
```
TP-Rhizom has the shortest front matter of the three FLL docs (title + 1 legal page + 2-page ToC),
hence the smallest offset. Content cross-checks: §3.11 verdict on physical p.12 = **printed 11**;
§3.7 density thresholds on physical p.11 = **printed 10**. Every `source_page` in the map is PRINTED.
(NB: the D-2 report cited "PDF p.12/p.23" as PHYSICAL pages; under the derived −1 offset those are
printed 11 / 22 — reconciled in the map.)

## APPLIED-VA gate nodes (ratified — the highest-severity FLL enforcement gap CLOSED)
Two `block` CRs APPLIED to prod this program (commit `40cd1b2`, HTTP 201, read-back live,
`audit_status` untouched), modelled as ratified CR nodes with `ratification_status: ratified/applied`
+ `provenance_build: 40cd1b2` + verbatim §3.11/§9 quotes:
- [[cr-rhz-req-verdict]] — **REQ-RHZ18-VERDICT** on RHZ-18, `pruefergebnis_rhizomfest == 'rhizomfest'`.
- [[cr-rhz-req-conformity]] — **REQ-RHZ21-CONFORMITY** on RHZ-21, `final_rhizom_conformity == 'rhizomfest'`.
Both are the **verdict-enum-as-producer** shape (engineer-selected enum, not engine output; §9 makes
`vorzeitig_abgebrochen` also block). Semantics proven against the real `evaluate.ts` before apply
(rhizomfest→pass, nicht_rhizomfest/vorzeitig_abgebrochen→fail, unset→pending; 5/5 green). These
closed the live vacuous-verdict hole (pre-fix RHZ-18/21 saved non-conforming verdicts UNBLOCKED).

## Unratified decision-points (Alvaro's batch — never guessed, all `ratification_status: unratified`)
1. [[dp-rhz-07-es1-tab2]] — **RHZ-07 twelve §5.9 Tab.2 / §5.7 block CRs** (ES-1, inequality-as-
   producer class; `_STAGED_20260724130000…`). Fertilizer N/P₂O₅/K₂O/MgO "ca." → NOT staged.
2. [[dp-rhz-dead-gates]] — RHZ-02 REQ-03/REQ-04 **fail-unreachable** rulings + RHZ-16 REQ-18 wrong-
   operand repoint. (RHZ-18/21 dead verdicts RESOLVED by the two applied gates — noted, not re-staged.)
3. [[dp-rhz-crossws-topology]] — RHZ-04 hosts REQ-05..10 whose symbols belong to RHZ-05/06/07/08;
   RHZ-12 REQ-16/17 (12/18-mon) belong to RHZ-14/15; RHZ-19 REQ-22 §10 symbols belong to RHZ-20.
4. [[dp-rhz-phantom-fields]] — 7 section_id=NULL sheets → **SECTION** (not delete, unlike Naturteich)
   + RHZ-08 enum-bypass (out-of-enum species persisted) + RHZ-11 enum-null widget.
5. [[dp-rhz-missing-density-eq]] — RHZ-14/15/16 relative-density (ØP/ØK×100, Tab.3) free-entered
   twins → single registered producer (the #22 hand-enterable-derived class).

## Final template extensions the validator (Phase 2) MUST know
1. **Per-PDF page offset is now proven variable across 3 FLL docs** (−1 / −2 / −3) — DERIVE from each
   document's own footer, never inherit. TP-Rhizom = `−1`.
2. **Applied verdict-enum block gates (ratified provenance class)** — accept VA authorised by page-ref
   PLUS an APPLY commit (`40cd1b2`); do NOT flag an enum-compare verdict gate as producer-starved
   (it is legitimately selection-fed, cousin of Naturteich's inequality-as-producer).
3. **Cross-worksheet gate topology is the DOMINANT RHZ finding** — the "gate condition symbol not
   owned by the gated worksheet → NR/finding" check (GAR/NT predicted) hits RHZ hardest (six
   acceptance gates funnelled onto host sheet RHZ-04).
4. **Fail-unreachable ("dead") block gate class (NEW discriminator)** — RHZ-02 REQ-03/04 conditions
   have NO reachable FAIL state (distinct from a vacuous-guard dead branch). Detector: "block gate
   whose condition can never return FAIL."
5. **Missing-equation / free-entered-derived twin** — RHZ-14/15/16 gate against a hand-entered derived
   value while the producer equation lives only on RHZ-13 (#22 class).
6. **section_id=NULL discriminator** — RHZ's section-less rows are REAL fields → **SECTION**, whereas
   Naturteich's were leaked enum tokens → **DELETE**. Validator must classify before choosing.

## Raw (sample) — prod rows + pdftotext excerpts

**Prod worksheet / equation / CR counts (live, read-only, 2026-07-24):**
```
worksheet_templates (FLL-TP-RHIZOM) = 21   (FLLTP-RHZ-01..21)
equations                           = 3    (RHZ-13 EQ-1/EQ-2/EQ-3 only)
compliance_requirements             = 24   (REQ-01..22 + REQ-RHZ18-VERDICT + REQ-RHZ21-CONFORMITY)
```

**Page-offset probe (this PDF's own footer tokens):**
```
phys 4->3 · phys 12->11 · phys 14->13 · phys 15->14 · phys 16->15 · phys 23->22 · phys 31->30
=> offset printed = physical - 1
```

**§3.11 verdict + §9 report clauses backing the two APPLIED gates (physical p.12=printed 11 / p.23=printed 22):**
```
3.11 Prüfergebnis
Ein Produkt gilt als rhizomfest, wenn in allen Prüfgefäßen nach Ablauf der Prüfdauer keine
Rhizomeindringungen gemäß Abschnitt 2.9 sowie keine Rhizomdurchdringungen gemäß Abschnitt 2.10
festzustellen sind.                                                                 [printed p.11]
9  Prüfbericht
… erstellen, jedoch nur, wenn sich das Produkt gemäß Abschnitt 2.11 als rhizomfest erwiesen [hat].
… [Firmen ohne Erfolg] erhalten keinen Prüfbericht, sondern lediglich eine schriftliche Mitteilung
… dass sich das Produkt als nicht rhizomfest nach FLL erwiesen hat.                  [printed p.22]
```

**Tab.2 water (§5.9, printed p.15) — verbatim from prod REQ-09 source_quote (backs [[dp-rhz-07-es1-tab2]]):**
```
Ammonium ≤ 0,5 mg/l; Eisen ≤ 0,2 mg/l; Gesamtphosphor (Pges) ≤ 0,03 mg/l; Härte (Summe Erdalkalien)
≥ 1,0 mmol/l; Leitfähigkeit ≤ 1000,0 μS/cm bei 20 °C; Mangan ≤ 0,05 mg/l; Nitrat ≤ 50,0 mg/l;
ortho-Phosphat (Angabe P) ≤ 0,01 mg/l; ph-Wert 6,0 – 9,0; Säurekapazität KS4,3 ≥ 2,0 mmol/l
```

**Prod equations (all 3, RHZ-13) — read-only:**
```
RHZ-13 EQ-1  bestandsdichte_p_avg = (P_1+…+P_8)/8              (§3.7, Anhang 2 Musterbericht S.30)
RHZ-13 EQ-2  bestandsdichte_k_avg = (K_1+K_2+K_3)/3            (§3.7, Anhang 2 Musterbericht S.30)
RHZ-13 EQ-3  dichte_relativ_prozent = (p_avg / k_avg) * 100    (§3.7, Tab.3)
```

**§3.7 density thresholds (printed p.10) — backs Tab.3 + REQ-15/16/17/18:**
```
1. Zwischenauswertung (nach 6 Monaten)  ≥ 80 Halme/Gefäße
2. Zwischenauswertung (nach 12 Monaten) ≥ 120 Halme/Gefäße
3. Zwischenauswertung (nach 18 Monaten) ≥ 160 Halme/Gefäße
4. Endauswertung (nach 24 Monaten)      ≥ 160 Halme/Gefäße
[Prüfgefäße] mindestens 80 % der Bestandsdichte der Pflanzen in den Kontrollgefäßen
```

## Validation performed
- Invariant #1 (VA ⇒ source_page): **0 violations.** Invariant #2 (standard_fixed ⇒ source_page,
  excl `in_library:false`): **0 violations.** Wikilinks: **0 broken** (57 node basenames + 1
  intentional external template ref). Index exemption matches GAR/NT parity.
- Prod read-only throughout; no writes; `audit_status`/`verification_status` untouched.

## Note on framing drift (findings → EXACT prod nodes, not the M2 functional labels)
The M2 prose labelled worksheets by function; prod topology differs and the map follows PROD:
- the "RHZ-05/06/07/08 acceptance gates" are actually **REQ-06/07/08/09/10 hosted on RHZ-04** whose
  symbols are owned by RHZ-05/06/07/08 (the cross-worksheet split);
- "RHZ-07 sixteen-field 0-CR" = RHZ-07 has 16 fields and 0 OWN CRs (Tab.2 is enforced only by REQ-09
  on RHZ-04) → the ES-1 twelve-CR stage adds local enforcement;
- "RHZ-18/RHZ-21 vacuous verdicts" are the two sheets CLOSED by the APPLIED REQ-RHZ18/21 gates.
Each finding attached to its prod-actual node.
