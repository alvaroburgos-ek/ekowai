# Wave 0 triage — DWA-M-363 (Merkblatt DWA-M 363, Herkunft und Verwertung von Biogas)

- standard_id: `d3528ebe-d623-4f78-880f-d5060c65ddee` (prod `vadsmshzebefjreqcicl`, READ-ONLY)
- source PDF: `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-363\DWA-M_363.pdf` (88 physical pp; Feb 2022, 1. Aufl.; inhaltsgleich DVGW G 439 (M))
- pdfStatus: **text** (pdftotext -layout; encoding = Latin-1 mojibake in Umlauts, content legible)
- **page offset (derived from THIS PDF's own footer, not inherited):** body `printed = physical − 2`
  (phys 5→printed 3 Vorwort; phys 17→printed 15 Tab.2; phys 32→printed 30 §5.7 Tabasaran/Gl.1; phys 33→printed 31)
- map: `Obsidian\...\reasoning-maps\DWA-M-363\` — 85 nodes + `_index.md`
- node roll-up: **VA 41 / VC 26 / NR 18**; data_class: standard_fixed 17, normative-as-input-reference 11, engineer_input 20, derived 11, standard_range 6

## Node counts
24 section · 11 equation (distinct) · 6 table · 29 compliance_requirement (distinct codes) · 9 document (out-of-library) · 6 decision-point = 85.
(Prod stores 22 equation rows / 48 CR rows — the extras are duplicate placements across two worksheets, see findings.)

## Findings by class

### phantom-field gate (6 CRs; PROVEN against prod `fields`)
Gate fires on a symbol NOT owned by the gated worksheet → cannot resolve worksheet-locally:
- **C363-29** on M363-01 reads `alarm_voralarm`/`alarm_hauptalarm` (owned M363-11 & M363-23).
- **C363-21** on M363-09 reads `formaldehyd_abgas` (owned M363-10 & M363-22).
- **C363-24** on M363-09 reads `messplatz_din_en_15259` (owned M363-10 & M363-22).
- **C363-25** on M363-09 reads `o2_atemluft` (owned M363-11 & M363-23).
- **C363-26** on M363-09 reads `co2_atemluft`/`h2s_atemluft` (owned M363-23).
- **C363-27** on M363-09 reads `flammendurchschlagsicherung` (owned M363-11 & M363-23).
→ [[dp-m363-phantom-field-gates]]

### dead gate (prose/non-parsing condition; no fired_by / no reachable-fail)
- **C363-05** `biogas_quelle eq deponie -> Modell ausgewaehlt` — consequent has no field → never fails.
- **C363-06** `rule_speichervolumen_per_verwertung` — named-rule token, no expression (on M363-06 AND M363-13).
- (attestation-mitigated, prose consequent) **C363-04** `standortspezifische Untersuchung oder Tab. 5-10`; **C363-23** `co_substrat eq true -> Hygiene… (DWA-M 380)`; **C363-18** consequent `Gasreinigung` is prose.
→ [[dp-m363-dead-prose-gates]]  (true dead gates: C363-05, C363-06)

### greedy-AND / unparenthesised IF-THEN (vacuous PASS on guard-false)
C363-03, C363-07, C363-10, C363-11, C363-12, C363-14, C363-15, C363-19, C363-22, C363-28
(same shape as FLLNT-03 REQ-07). → [[dp-m363-greedy-and]]

### inequality/enum/verdict-as-producer + operator discrepancy
- **Gl.(7)** printed `DDOC_{ma,T-1} − (1 − e^{-k})` (MINUS) vs encoded IPCC `× (1 − e^{-k})`.
  Dimensionally the printed minus is implausible; SR-3 says PDF wins but resolution needs
  IPCC-2006 (out-of-library) → **NR**. → [[dp-m363-gl7-operator]]
- Equation output_symbols are scalars (no inequality-as-producer among equations). The §5.7 decay
  chain (Gl.4/5/6/7) is display-only-eligible (rate + accumulation), noted on the eq nodes.

### #22 hand-enterable-derived
Not observed in the queried set (equation outputs are `derived`, not stored as editable fields).
Flagged **not-observed / pending** full field-owner audit — the equation output symbols
(`c_ab`,`g_e`,`g_t`,`g_td`,`ch4_erz_t`,`ddoc_m_decomp_t`,`k_abbau`,`h2s_mg_per_m3`) were not seen
as fields, but a complete fields dump was not exhausted this wave.

### F-4 var-vs-var non-enforcement
- **C363-29** uses equality gates (`== 20 AND == 40`) rather than threshold — brittle; a valid
  device with voralarm 15 % UEG would fail. Enforcement-shape finding (plus it is phantom-field).

### clause-vs-worksheet mismatch (mis-homed equations)
All 10 §5.7 Deponiegas equations are ALSO stored on **M363-05** (Substrate Industrieabwasser/
Klärgas, scope §5.3) in addition to the correct **M363-11**. → [[dp-m363-clause-mismatch]]

### duplicate-CR / single-owner
19 of 29 CR codes stored on two worksheets each (M363-06↔13, M363-08↔16, M363-09↔20).
→ [[dp-m363-duplicate-cr-ownership]]

### missing-doc dependency (9 docs, in_library:false → dependents NR)
[[doc-dvgw-g260]] (C363-09) · [[doc-din-en-16723-2]] (C363-20) · [[doc-din-en-15259]] (C363-12,24) ·
[[doc-dwa-m-380]] (C363-23) · [[doc-dwa-m-361]] (Aufbereitung ausgelagert) ·
[[doc-ipcc-2006]] (Gl.6/7) · [[doc-vdi-3790-2]] (Deponiemodell) ·
[[doc-bimschv-regime]] (C363-10,11,12,16,28 + §8/§9/§10 legal) · [[doc-ktbl-yields]] (Tab.8/9/10).

## Below-VA list (26 VC + 18 NR = 44 nodes below VA)
- **NR (18):** the 9 document nodes; Gl.(7); the NR-capped CRs C363-09/10/11/12/16/20/23/24/28.
- **VC (26):** boilerplate/data-collection section shells (M363-01/03/04/05/06/07/08/12/13/14/24);
  NR-adjacent sections M363-09/15/16/17/18/19/20/21 (section-level NR where content defers, else VC);
  eq-m363-h2s-mg; tables Tab.5/12/13/16-17/data-collection (standard_fixed WITHOUT pinned page →
  held VC, would trip invariant #2 if promoted); CRs C363-04/05/06/07/13/18/21/25/26/27/29.
  **standard_fixed-needs-page holds:** Tab.5/12/13/16-17 are class standard_fixed but their printed
  page was not pinned this wave → kept VC (honest residue; a page probe promotes them to VA).

## Dead gates (count = 2 true + 3 mitigated)
- TRUE dead (no fired_by, no reachable fail): **C363-05, C363-06**.
- Prose-consequent but attestation-mitigated: C363-04, C363-18, C363-23.

## Tier rationale
**fix-first.** The encoding is source-faithful and the core §4/§5.7 value layer is VA
(Tab.2 ranges p.15; Gl.(1)–(6),(k) p.30-31), but 6 phantom-field gates, 2 true dead gates,
a wide greedy-AND vacuous-pass surface, a printed-vs-encoded operator discrepancy (Gl.7),
mis-homed §5.7 equations on M363-05, and 19 duplicate-homed CRs must be resolved before a
harness run would give trustworthy PASS/FAIL. Not acquisition-blocked (the standard itself is
in library and VA-verifiable); the 9 missing docs only cap the deferral CRs at NR — they do not
block harnessing the standard's own gates.
