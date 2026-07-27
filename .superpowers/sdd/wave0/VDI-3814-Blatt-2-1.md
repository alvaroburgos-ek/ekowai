# Wave 0 triage — VDI-3814-Blatt-2-1 (Gebäudeautomation (GA); Planung; Bedarfsplanung, Betreiberkonzept und Lastenheft)

- **Standard:** `2b60107c-79cb-47ca-8c01-bad5cb42c72d` (code VDI-3814-Blatt-2-1,
  title_de "Gebäudeautomation (GA); Planung; Bedarfsplanung, Betreiberkonzept und Lastenheft")
- **PDF:** `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\VDI-3814-Blatt-2-1.pdf`
  (VDI 3814 Blatt 2.1, Januar 2019). pdfStatus = **TEXT** (scoop pdftotext -layout, 498 KB).
- **Page offset (derived THIS session, not inherited):** the VDI footer prints the PRINTED page
  number directly (`… VDI 3814 Blatt 2.1 / Part 2.1  – N –`). pdftotext surfaces that footer
  integer at each page break (cover unnumbered; numbered body p.2 → p.34). So every `source_page`
  = the footer number quoted straight off the layout output; **no physical−N offset applied** (the
  138/GAR `physical−2` rule is explicitly NOT inherited). Spot-checked: §1 = p.4, §5/§6 = p.5,
  §7.2 = p.11, §8 = p.20, §8.10/8.11 + Tab.1 = p.27–29, Schrifttum = p.34.
- **Map:** `SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\VDI-3814-Blatt-2-1\` (+ `_index.md`).
- Prod read-only via Supabase MCP. NO prod writes, NO fixes, NO harness runs (Wave 0).

## Encoding shape
7 worksheets (registration ×1, data_collection ×5, verification ×1), **0 equations**, **28
compliance_requirements**, **74 fields**, 1 table (Tab.1 §8.11, exemplary). This is a **purely
qualitative planning / requirements-specification standard** — no numeric normative thresholds, no
derived data_class, no computation chain. Every CR is a presence/enum gate (`IS NOT NULL`, `!= ''`,
`== true`, `IN {…}`) on an `engineer_input` field. First zero-equation / zero-threshold standard in
the sweep: the validator's #22 / F-7 / F-4 numeric checks are vacuous; the live surface is gate
topology.

## Node counts (46 total)
section 7 · equation 0 · table 1 (exemplary) · CR 28 · document 6 (in_library:false) ·
decision-point 4.
Provenance: **VA 34 · VC 4 · NR 8** (belowVA = VC+NR = **12**).
data_class: engineer_input 39 · standard_fixed 7 (1 table + 6 doc nodes) · decision-points 4.

## VA closure (PDF-confirmed this session, PRINTED pages)
All governing clauses quoted verbatim off the printed footer:
- §1 Anwendungsbereich p.4 · §2 Normative Verweise p.4 · §3 Begriffe (Planungshandbuch) p.4 ·
  §5 Grundlagen p.5 ("… kontinuierlich zu pflegen und durch alle Verwender verpflichtend zu
  beachten") · §6.1 p.5 · §6.2 Auftraggeber p.6 · §6.3.1 Projektbezeichnung p.6 · §6.3.4 Umfang
  p.7 · §6.4.1/6.4.2 Ziele+Prioritäten p.7–8 · §6.5 Projektschnittstellen p.8–9 · §6.6
  Nutzungsprozesse p.9 · §6.7 Bestandserfassung p.10.
- §7.2 Ziele des Betreiberkonzepts p.11 · §7.3 Nutzer p.14 · §7.4 Liegenschaften p.14 · §7.5
  Betreiberorganisation p.14 · §7.6 Betreiben (eigen/fremd/kombination enum) p.15 · §7.7
  Betreiberanforderungen (Prioritäten+SLA) p.16.
- §8.1 GA-Lastenheft/Pflichtenheft abgrenzung p.20 · §8.2 Datenkommunikation p.22 · §8.3 Störfall-/
  Meldungsmanagement p.22–24 · §8.4/8.5 Feld-/Automationseinrichtungen p.24 · §8.6 MBE p.25 ·
  §8.7 Schaltschränke p.25 · §8.8 IT/Netzwerke p.26 · §8.10 Energieeffizienz p.27–28 · §8.11
  Historisierung + Tab.1 p.28–29 · §8.12 CAFM p.29 · §8.13.4 Zugriffsebene enum p.30 · §8.14
  Gewerkespezifische Schnittstellen p.32 · Schrifttum p.34.

## FINDINGS

### Dead gate (1) — `condition = TRUE`, never fires
- **CR-28** "Abgrenzung Bedarfsplanung / Grundlagenermittlung" (WS-02, block, clause §6.1).
  `condition = "TRUE"` → always-pass, never blocks, no `fired_by`/reachable-fail input. Distinct
  subclass from the 138/GAR unreachable-fail dead gate: this is *always-pass*. §6.1 is scoping prose
  with no discrete testable field. Ruling [[dp-vdi-01-cr28-deadgate]]: retire (content covered by
  CR-01..07) or bind to a §6.1 attestation field.

### Greedy-AND gates (8) — multiple presence checks folded into one block CR
- **CR-25** (7-clause AND: systemselbstueberwachung/systemzeitverwaltung/datenimport_export/
  zugriffsebene/aktivitaetenspeicher/datensicherung_konzept/fernzugriff, §8.13.1–8.13.7) — widest
  gate in the standard.
- **CR-17** (4: meldungsart/meldungsempfaenger/meldung_zustandsuebergang/meldungsquittierung, §8.3).
- **CR-02** (4: ag_name/ag_organisationsform/ag_vertreter/ag_projektleiter, §6.2).
- **CR-18** (3: feldgeraete_spezifikation/automationseinrichtungen_spez/verhalten_spannungsausfall,
  §8.4/8.5).
- **CR-04** (2: ziel_beschreibung/prioritaeten_matrix), **CR-13** (2: gebaeude_prioritaet/
  anlagen_prioritaet), **CR-16** (2: datenkommunikationsprotokoll/datenschnittstellen),
  **CR-21** (2: it_netzwerk_anforderungen/it_sicherheit).
One missing sub-field fails the whole gate with a single generic message.

### Ungated required fields — non-enforcement (WS-07)
- The verification sheet declares 4 required booleans but only **CR-27** exists, testing only
  `dokumente_gepflegt == true`. **`anforderungen_pruefbar` (§6.1), `lastenheft_vollstaendig`
  (§8.1), `ag_freigabe` (§5)** are required-but-untested → the standard's own verification
  predicates are collected but not enforced. Ruling [[dp-vdi-03-ws07-ungated-fields]].

### Value NR — defers to out-of-library table (1)
- **CR-22 / `energieeffizienzklasse`** (§8.10): free-text field whose permitted class set (A/B/C/D)
  lives in **DIN EN 15232** (out-of-library). The gate is source-anchored (§8.10 quotable p.27–28)
  but the *value* caps at NR until the DIN EN 15232 class table is quoted (SR-1/SR-3, validator
  invariant #7). Ruling [[dp-vdi-04-energieklasse-nr]].

### Exemplary-vs-normative table (1) — VC-illustrative ceiling
- **Tab.1** (§8.11) is headed "Beispiele für Auflösungen" — explicitly examples; its only consumer
  `aufzeichnung_aufloesung` is optional text with no CR. Printed numbers quotable but illustrative,
  not binding → VC (mirrors FLL-GAR informative-Anhang precedent). Ruling
  [[dp-vdi-02-tab1-exemplary]].

### Phantom-field gates
- **NONE.** All 28 CR condition symbols resolve to existing fields (full cross-check performed).

### Not present (vacuous for this standard)
- No inequality/enum/verdict-as-producer (the one enum-membership CR-12 is a legitimate §7.6
  taxonomy gate, not a producer). No #22 hand-enterable-derived (zero derived fields, zero
  equations). No F-4 var-vs-var non-enforcement. No cross-sheet phantom gate.

## Below-VA nodes (12 = VC 4 + NR 8)
- **VC (4):** [[section-vdi-01]] (registration container, R-noeq) · [[section-vdi-07]] (verification
  container, R-noeq) · [[tab-vdi-01-aufloesungen]] (exemplary "Beispiele") ·
  [[dp-vdi-02-tab1-exemplary]].
- **NR (8):** [[cr-vdi-22]] (energieeffizienzklasse value → DIN EN 15232) + the 6 document nodes
  [[doc-din-en-15232]] [[doc-din-18205]] [[doc-vdi-3814-blatt-1]] [[doc-vdi-4700-blatt-1]]
  [[doc-din-en-iso-16484-5]] [[doc-vdma-24774]] + [[dp-vdi-04-energieklasse-nr]].

## Dead gates count: 1 (CR-28)

## Missing-doc dependencies (6, all in_library:false — confirmed against prod `standards`,
where only VDI-3814-Blatt-2-1 itself, VDI-2163, VDI-3477 exist)
- **DIN EN 15232** — the ONLY value-gating dep (§8.10 energy-efficiency class set). Caps CR-22.
- DIN 18205 · VDI 3814 Blatt 1 · VDI 4700 Blatt 1 · DIN EN ISO 16484-5 · VDMA 24774 — **context /
  normative-reference edges only**; each caps its own doc node but gates no encoded worksheet value
  (the §2 terminology refs and the in-library datenkommunikationsprotokoll enum mean these have no
  encoded value consumer).

## TIER: fix-first
Not acquisition-blocked: 34/46 nodes are VA and the entire enforceable surface is presence/enum
gates that ARE source-anchored (every §6/§7/§8 clause quoted verbatim off a confirmed printed page).
Only ONE out-of-library doc (DIN EN 15232) gates a value; the other 5 doc refs are context edges.
Before a harness run this needs: (1) the **1 dead gate (CR-28 `condition=TRUE`)** retired or bound
to a real field; (2) the **3 ungated required WS-07 verification booleans** (anforderungen_pruefbar,
lastenheft_vollstaendig, ag_freigabe) given enforcing CRs or confirmed advisory; (3) the **8
greedy-AND** CRs reviewed for split (esp. the 7-clause CR-25); (4) the **DIN EN 15232 energy-class**
decision (encode A/B/C/D enum vs keep free text). The DIN EN 15232 value-NR + Tab.1 exemplary call
are the acquisition/ruling residue within the fix-first tier — they don't block harnessing the
presence-gate surface.
