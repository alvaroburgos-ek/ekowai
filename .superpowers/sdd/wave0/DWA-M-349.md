# Wave 0 triage — DWA-M-349

**Standard.** DWA-M 349 (Mai 2019) — Biologische Stickstoffelimination von
Schlammwaessern der anaeroben Schlammstabilisierung.
prod standard_id `5ae4beb8-ede4-4c1f-9bd4-0a7b50c20df2`.
PDF `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-M-349\DWA-M-349.pdf`
(pdfStatus=text; page offset derived from THIS PDF's footer: **printed = physical − 2**).
Reasoning map: `SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-M-349\`.

## Node summary
- nodes = 54 (8 section + 10 equation + 27 CR + 8 document + 1 decision-point) + index.
- provenance: VA=10 · VC=34 · NR=10 · EV=0 → **belowVA = 44**.
- data_class: derived=26 · standard_range=12 · standard_fixed=11 · engineer_input=5 · normative-as-input-reference=0.

All 10 equations are VA: each `equations` row is `verified_against_standard` with a
LaTeX `source_quote`, AND each was located in the rendered PDF with a confirmed
PRINTED page + verbatim quote (Gl.3 p.19, Gl.4/5 p.31, Gl.6-9 p.38-40, Gl.10-12 p.45-46).

## Findings by class

### Dead gates (condition = TRUE, no fired_by / no reachable-fail) — 11
CR-003, CR-016, CR-018, CR-020, CR-021, CR-022, CR-023, CR-024, CR-025, CR-026, CR-027.
All `severity=block` but never fire on data → advisory-only, do not enforce. CR-022..027
are cross-reference notes; CR-003/016/018/020/021 are operating recommendations.

### Missing-doc dependency (out-of-library → NR, SR-3) — 5 docs / 5 CRs
- doc-dwa-m-368 ← CR-026 (Tab.5/6 sludge values that feed Gl.(7) inputs).
- doc-dwa-m-210 ← CR-023 (SBR sizing).
- doc-dwa-a-268 ← CR-024 (O2-supply control; joint with in-library DWA-M-229-1).
- doc-dwa-m-256-2 ← CR-025 (sensor maintenance intervals; joint with in-library ATV-A-704E).
- doc-din-en-12255-1 ← CR-027 (general construction principles).
In-library refs that do NOT cap: DWA-A-131 (CR-022), DWA-M-229-1 (CR-024), ATV-A-704E (CR-025).
None of the 10 equations depend on an out-of-library doc, EXCEPT Gl.(7) whose *inputs*
(sludge characteristics) are DWA-M-368-sourced — the equation math is VA, its input
values are NR until M-368 rows are quoted.

### #22 hand-enterable-derived — 10 (all equation outputs)
Q_SW, B_d_x_Rueck, S_x, K_S43, v, dV_Batch_max, V_Teil, OV_d_NDN, OV_d_NiDi, OV_d_Deam
are encoded as writable `number` fields with no `derived` guard → an engineer can hand-
enter a value the engine should compute (doctrine data_class rule / validator invariant #4).

### F-7 range-without-selection (standard_range values, no selection record, SR-2) — 12
CR conditions bake standard bounds with no explicit engineer-selection field:
CR-001 (600/1300 mg/l, pH 7-8), CR-004 (>23 °C), CR-006 (0.2-0.5 / 0.5-2.0), CR-007
(<0.5), CR-008 (>=0.3 d), CR-010 (1-1.5 mg/l), CR-011 (<15 %), CR-012 (<5 mg/l),
CR-013 (<=1 mg/l), CR-014 (10-200 mg/l), CR-015 (<=3.5 %/d). dp-01 (Tab.1 kinetics).

### greedy-AND / OR-of-ANDs / var-vs-var (F-4) — 3
- CR-006: `(enum==x AND range) OR (enum IN {..} AND range)` — enum branch mixed with two
  numeric ranges; also N_raumbelastung lives on M349-05 but gate is on M349-04 (cross-ws).
- CR-007: enum-equality AND numeric threshold; N_raumbelastung phantom relative to owner ws.
- CR-017: greedy-AND over two hand-enterable booleans, encodes only 2 of a Tab.-driven
  per-Verfahren sensor matrix (under-specified gate).

### phantom-field / IS-NOT-NULL presence gate — 3
CR-002 (`B_d_x_Rueck IS NOT NULL` on a derived value), CR-009 (`c_quelle_typ IS NOT NULL`,
fires even for Deammonifikation where no external C-source is required — not conditioned
on verfahren_n_elimination), and CR-017 (see above).

### verdict/equality-as-producer — 1
CR-005: strict `verhaeltnis_no2_nh4 == 1.3` on a hand-enterable field — brittle exact
equality with no tolerance for a standard_fixed 1,3:1 ratio.

## Below-VA list (44)
- 34 VC: 8 sections (m349-01..08), 3 in-library docs (a-131, m-229-1, atv-a-704e),
  dp-01, and 22 firing/advisory CRs (all except CR-023/024/025/026/027).
- 10 NR: 5 out-of-library docs (m-368, m-210, a-268, m-256-2, din-en-12255-1) +
  CR-023, CR-024, CR-025, CR-026, CR-027.

## Tier: fix-first
The reasoning core is healthy — all 10 equations are VA with PDF page + verbatim quote,
and no core calculation node is gated on a not-in-library document (the 5 missing docs
back only advisory cross-reference CRs, all of which are already dead gates). The work
before harness is picker-layer: (1) add `derived` guards to the 10 equation outputs
(#22); (2) surface the 12 standard_range bounds as SR-2 selection fields or record a
selection; (3) resolve dp-01 (Tab.1 range vs. exemplary) via Alvaro; (4) repair the
greedy-AND / phantom / equality gates (CR-002/005/006/007/009/017); (5) decide whether
the 11 dead `severity=block` gates should enforce or drop to `warn`. Not
acquisition-blocked (missing docs are non-load-bearing advisory refs), not harness-ready
(defects present).
