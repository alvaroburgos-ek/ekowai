# Wave 0 triage — DWA-M-187 (Merkblatt DWA-M 187, Retentionsbodenfilteranlagen: Sonderanwendungen)

- **Standard id:** `d165c02d-6f30-4185-8dda-06752dcfd891` (prod `vadsmshzebefjreqcicl`, READ-ONLY)
- **PDF:** `C:\Users\Ekowai\Desktop\Guidelines\DWA-M-187\DWA-M_187_GD.pdf` — `pdfStatus=text`
  (scoop pdftotext -layout). Entwurf/Gelbdruck September 2025, Frist 30.11.2025.
- **Page convention (derived from THIS PDF's own footer):** printed page = running-footer value
  paired with "Frist zur Stellungnahme: 30. November 2025" (even=left, odd=right). `printed = footer`.
- **Encoding shape:** 25 worksheets (M187-01..25), 225 section rows (A–M ×25), 2 equation codes
  (each duplicated M187-09+M187-22 → 4 rows), 8 CR codes (REQ-01..08, 14 rows w/ duplicates), 143 fields.
- **Map:** `SecondBrain/01-Projects/ekowai-wizard/reasoning-maps/DWA-M-187/` (+ `_index.md`), 51 nodes.

## Node/provenance tally
- nodeCount = **51** (25 section, 2 equation, 8 CR, 6 document, 6 decision-point, 4 table/enum)
- **VA = 16** (Gl.(1) p.37, Gl.(2) p.37; REQ-01 p.10, REQ-02 p.13, REQ-03 p.20, REQ-04 p.24,
  REQ-05 p.32, REQ-06 p.37; tab-formelzeichen p.9, tab-03-variantenvergleich p.16,
  tab-sonderanwendung-enum p.14, tab-verfahrensvariante-enum p.16; section-02 p.10, section-06 p.16,
  section-20 p.32, section-22 p.37)
- **VC = 30** (A–M section shells + summary/verification worksheets + in-library doc nodes + DP nodes)
- **NR = 5** (REQ-07 §4 attestation no in-library source; REQ-08 §6 prose; doc-dwa-a-166 out;
  doc-lawa-lawa-disposal out; section-24 Anhang A informative)
- **EV = 0**
- **belowVA = 35** (VC 30 + NR 5 + EV 0)

## Findings by defect class
- **phantom-field gate ×5 rows** — REQ-03 (both copies, `q_Dr_RBF` field exists on NO worksheet);
  REQ-04 (both copies, `q_Dr_RBF` absent + on M187-07 `h_FK` absent); REQ-05 M187-07 copy
  (`B_CSB/A_F_pro_AEb/q_krit/q_A_max` owned by M187-08); REQ-06 M187-07 copy
  (`A_b_a/A_F/h_RR/h_RBF/h_Draen` owned by M187-09). Owner copies (M187-08 REQ-05, M187-09 REQ-06)
  resolve. Root cause: cross-worksheet single-owner topology + symbol-name mismatch `q_Dr_RBF`↔`qDr,RBF`.
  → [[dp-m187-phantom-field-gates]]
- **dead gate ×4 rows** — REQ-07 `attest_m187_0N_req_07 == True` (attestation tautology, M187-04 +
  M187-05); REQ-08 condition = literal prose `"Engineer bestätigt"` (non-parsing, M187-10 + M187-23).
  None fires a machine-evaluable fail. → [[dp-m187-dead-attestation-prose-gates]]
- **inequality/verdict-as-producer ×1** — Gl.(2) `b_R_a/(A_F/A_b_a) <= b_krit` stored with
  `output_symbol = ok_boolean` (comparison verdict as equation output; the real load value is never
  emitted). → [[dp-m187-verdict-as-producer]]
- **#22 hand-enterable-derived ×2** — `A_F` (Gl.(1) output) editable required number on M187-09 AND
  M187-22; `ok_boolean` (Gl.(2) verdict) editable field on M187-09. → [[dp-m187-hand-enterable-derived]]
- **greedy-AND ×3** — REQ-04 (2-way), REQ-05 (4-way), REQ-06 (6-way) flat unparenthesised AND
  chains; interacts with the phantom-field split. → [[dp-m187-greedy-and]]
- **equality-as-limit ×2** — REQ-04 `q_Dr_RBF == 0.01` (§5.3.3.1 says "begrenzt auf" = ≤),
  REQ-05 `q_krit == 60` (design value as float `==`). → [[dp-m187-equality-as-limit-and-ranges]]
- **condition/clause drift ×1** — REQ-02 split across M187-07 (`beta_wert>=4`, §5.1.3.1) and M187-05
  (`h_FK>=1.0`, cited §5.1.3.2 b but the hFK≥1,0 m floor is a §5.3/§5.4 requirement). → cr-m187-req02
- **standard_range never-auto-picked (SR-2/F-7) ×4** — Log-Stufen 0,5–3,0 (`logstufen_rueckhalt`),
  `UV_dosis`, `v_filter_aufstrom/abstrom`, `b_krit` (7 but "auch geringere möglich"): point values from
  printed ranges/reference with no selection record. → [[dp-m187-equality-as-limit-and-ranges]]

## Below-VA list (why each is capped)
- REQ-07 (NR) — §4 Betrieb has no in-library machine-checkable criterion; realised as attestation.
- REQ-08 (NR) — §6 DWA-Klimakennung prose directive; condition non-parsing.
- doc-dwa-a-166 (NR) — out of library; §5.3/§5.4 Vorstufe/Retentionsraum design dependents cap NR.
- doc-lawa-lawa-disposal (NR) — LAGA/LAWA disposal guidance out of library.
- section-24 (NR) — Anhang A worked examples are informative (non-normative).
- 30 VC nodes — A–M section shells, summary/verification worksheets (M187-10/23/25), in-library doc
  nodes (DWA-A 102-2/138-1/178/M-102-4), and the 6 decision-point nodes: no individually-pinned
  printed line (or convenience-only), so held at VC until a harness pass pins each.

## Dead gates (count = 4)
REQ-07 ×2 (M187-04, M187-05 attestation tautology); REQ-08 ×2 (M187-10, M187-23 prose "Engineer bestätigt").

## Missing-doc dependencies
- **DWA-A 166** (§2 Verweisungen, p.10) — OUT of library.
- **LAGA / LAWA disposal guidance** (Abkürzungen, p.9) — OUT of library.
- IN library (NOT missing): DWA-A 102-2, DWA-A 138-1, DWA-A 178 (governs A_F/b_krit=7), DWA-M 102-4.

## Tier
**fix-first** — the standard is well source-anchored (all 6 numeric CRs + both equations are VA,
page-cited; core sizing defers to DWA-A 178 which IS in library), but it is NOT harness-ready:
5 phantom-field CR rows, 4 dead gates, an inequality-as-producer equation, #22 A_F re-entry, and
greedy-AND/equality-as-limit issues must be fixed before the harness. Not acquisition-blocked — the
governing table (DWA-A 178) is in library; the only out-of-library refs (DWA-A 166, LAGA/LAWA) are
peripheral (Vorstufe design / disposal), not on the primary sizing/conformity path.
