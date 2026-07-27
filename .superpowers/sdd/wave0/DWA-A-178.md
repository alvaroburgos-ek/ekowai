# Wave 0 triage — DWA-A-178 (Retentionsbodenfilteranlagen)

- Standard id (prod `vadsmshzebefjreqcicl`): `77694afd-8a2a-47a9-8c76-f1ba38b71419`
- Source PDF: `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-178\DWA-A_178.pdf` (DWA-A 178, Juni 2019)
- pdfStatus = **text** (scoop `pdftotext -layout`; "Invalid Font Weight" warnings only, text clean)
- Page offset (derived from THIS footer, not inherited): **printed = physical − 2**
  (physical p.6→4, p.8→6, p.20→18, Gl.1-4 block→26/27/28, Nachweis→29/30/31).
- Reasoning map: `SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-A-178\` (_index + 68 nodes)
- Encoding size: 19 worksheets, 13 equations, 28 compliance_requirements, ~110 fields.

## Node roster (68, excl. index)
section 19 · equation 13 · table/Bild 2 · CR 28 · document 3 · decision-point 3

## Provenance (node-level, verified from written frontmatter)
- **VA 51** · **VC 11** · **NR 6**  → **belowVA (VC+NR) = 17**
- data_class: standard_fixed 28 · derived 25 · engineer_input 13 · normative-as-input-reference 2

Invariants checked: every VA / standard_fixed node carries a `source_page` (doc nodes carry a
blank `source_page:` per the FLL convention, provenance NR, in_library:false). The 2
normative-as-input-reference nodes (A178-06 b_R,a=530; A178-07 b_krit=7 / q_Dr=0.05) each carry
`consumed_by::` edges (Gl.1/2/4). No invariant violations.

## Findings by defect class

### verdict / inequality-as-producer (2) — HIGH
- **Gl.(9)** [[eq-a178-gl09-bf-bereich]] — output_symbol `b_F_im_bereich`, formula
  `4 <= b_F <= b_krit = 7`. Chained-inequality-as-producer; engine cannot emit the boolean.
  Needs `displayOnly:true`. Enforcing twin = REQ-19 (block, correctly split `4<=b_F AND b_F<=7`).
- **Gl.(10)** [[eq-a178-gl10-emission]] — output_symbol `emission_eingehalten`, formula
  `B_RBFA_ab / A_E_b_a <= b_R_e_zul`. Inequality-as-producer. Needs `displayOnly:true`.
  Enforcing twin = REQ-20 (block). → [[dp-a178-01-gl9-gl10-verdict-producer]]
- Both VA on printed thresholds/formulas (p.30). Duplicate-encode with their gates → keep gate,
  displayOnly the equation.

### #22 hand-enterable-derived (~12)
Symbols that are BOTH an equation output AND an `is_required` engineer number field with
`owner=null`: A_F (Gl.1), B_RBF_zu (Gl.2/3), Q_Dr_RBF (Gl.4), b_F (Gl.5/6/7), C_RBFA_zu (Gl.8),
B_RBFA_ab (Gl.11), eta_RBF_hyd (Gl.12), eta_F (Gl.13) [+ V_RBF]. Set `owner='derived'` (read-only)
on the RESULT fields; keep the genuine Langzeitsimulation feeds (VQ_*, B_VS/B_Dr_RBF/…) as
engineer_input. → [[dp-a178-02-derived-hand-enterable]]

### cross-worksheet gate topology (11)
Gates whose condition symbols are not owned by the gated worksheet:
- **A178-12** hosts 9 material/construction/pre-treatment gates (REQ-09/10/11/12/13/23/25/26/27)
  reading A178-07 (e_0, h_FK_required, filter_*, pflanzdichte, abdichtung_kdb_staerke, geotextil),
  A178-02 (system_type), A178-05 (langzeitsimulation_dauer), A178-17 (n_RBF).
- **A178-09** hosts REQ-15/16/18 reading A178-11 (h_RR), A178-02 (system_type), A178-05 (h_N_a_m),
  A178-10 (A_F), A178-04 (A_E_b_a).
- **A178-16** hosts REQ-21 reading A178-17 (t_RR_E_n1).
Blocks harness unless evaluate.ts resolves symbols project-wide (worksheet-local → these resolve
`fehlend`). Confirm enforcement model, then relocate or confirm. → [[dp-a178-03-cross-worksheet-gate-topology]]

### dead / non-parsing gate (1)
- **REQ-17** [[cr-a178-req-17]] (A178-09, warn) — condition `equation_1_evaluated`: a phantom
  token, not a field, nothing sets it → no `fired_by` real symbol, can never fire a fail. DEAD.

### var-vs-var / F-4 (enforcing, noted not broken)
- REQ-18 (`A_F >= 100 * A_E_b_a`), REQ-20 (`B_RBFA_ab / A_E_b_a <= b_R_e_zul`) are var-vs-var —
  they DO enforce provided the foreign RHS symbols resolve (ties to the cross-worksheet finding).

### missing-source-quote block gate (1)
- **REQ-07** [[cr-a178-req-07]] (block, `feststoffeintrag_alarm==false`) has NULL `source_quote`
  though the §5.2.4 Sonderflächen text exists (p.22). Attach source → lifts VC→VA.

### broken input-symbol (1)
- **Gl.(13)** [[eq-a178-gl13-etaf]] — formula input `VQ_DR_RBF_zu` matches no field (fields use
  `VQ_Dr_RBF`); source symbol is VQDr,RBF. Name/case mismatch → derivation would not resolve.
  Graded VC pending symbol repair. Also `eta_F` symbol collides with Tabelle-1 η_F=0.95 Rechenwert.

### standard_range / SR-2 selection-record gaps (F-7)
- h_RR (0.3–2 m, §6.1.4.3 p.24), pflanzdichte (4–8 /m², §6.1.4.7 p.25), b_F band (4–7, Gl.9),
  eta_VS footnote alternate (0/0.2, Tabelle 1) — ranges present, no selection record captured.

### duplicate-encode (2)
- REQ-19 duplicates Gl.(9); REQ-20 duplicates Gl.(10). Here the duplication IS the enforcement
  path → keep the gate, displayOnly the equation (folds into DP-01).

## Below-VA list (17 nodes)
NR (6): [[eq-a178-gl03-brbfzu-misch]] (e_0→ATV-A 128), [[cr-a178-req-09]] (ATV-A 128),
[[cr-a178-req-11]] (RiStWag), [[doc-atv-a-128]], [[doc-ristwag]], [[doc-kostra-dwd]].
VC (11): [[section-a178-03]], [[section-a178-05]], [[section-a178-08]], [[section-a178-18]],
[[section-a178-19]], [[bild-a178-01-planungsprozess]], [[cr-a178-req-03]], [[cr-a178-req-07]],
[[cr-a178-req-17]] (dead gate), [[eq-a178-gl13-etaf]] (broken symbol), [[dp-a178-02-derived-hand-enterable]].

## Dead gates (1)
- REQ-17 `equation_1_evaluated` (phantom token, warn).

## Missing-doc dependencies (3 docs, out-of-library → 6 NR nodes)
- **ATV-A 128** (Bemessung Regenentlastungen) — e_0 ≤ 55 % Vorstufe (REQ-09) + e_0 in Gl.(3).
  Library has ATV-A-704E only, NOT ATV-A 128.
- **RiStWag** — Wasserschutzgebiet Leichtflüssigkeits-Auffangraum (REQ-11) + `wasserschutzgebiet` enum.
- **KOSTRA-DWD** — Bemessungsniederschlag / h_N,a,m sourcing (`kostra_data_source`, Bild 1).
Note: A-178's b_R,a=530 default, q_Dr=0.05, b_krit=7, and the full η-Rechenwerte table are all
printed IN A-178 (VA) — these 3 are the only genuine acquisition gaps, and they gate only the
Mischsystem-with-Vorstufe (Gl.3/REQ-09) and road-Wasserschutzgebiet (REQ-11) branches, not the
core Trennsystem sizing path (Gl.1/2/4/5-8/11-13 all resolve in-library).

## Tier: fix-first
Core sizing chain is VA and in-library; the standard is NOT acquisition-blocked as a whole (only
two side-branches defer to ATV-A 128 / RiStWag / KOSTRA). But there ARE must-fix-before-harness
defects: 1 dead gate (REQ-17), 2 verdict/inequality-as-producer equations needing displayOnly,
~12 #22 derived-hand-enterable fields, 11 cross-worksheet gates needing enforcement-model
confirmation/relocation, and 1 broken input symbol (Gl.13). → **fix-first**.
