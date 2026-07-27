# Wave 0 Triage — DWA-A-226

**Standard.** DWA-A 226 "Grundsätze für die Abwasserbehandlung in Belebungsanlagen
mit gemeinsamer aerober Schlammstabilisierung ab 1.000 Einwohnerwerte" (August 2009).
**standard_id** `6776b9f9-0129-48fe-80c1-398bc7563bff` (prod `vadsmshzebefjreqcicl`, read-only).
**PDF** `C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-A-226\DWA-A-226.pdf`
— pdfStatus = **text** (`pdftotext -layout` clean). Page offset derived from THIS
PDF's footer (printed 2 @ text-line 86, printed 9 @ 514, printed 12 @ 715, printed
21 @ 1341); every VA node cites a PRINTED page.
**Map.** `Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-A-226\`
(73 node files + `_index.md`).

## Triage row
- **nodeCount** 73 (9 section · 26 equation · 2 table · 24 CR · 6 document · 6 decision-point)
- **provenance** VA 55 · VC 8 · NR 10 · EV 0
- **data_class** derived 26 · standard_fixed ~14 · standard_range 5 · engineer_input ~22 · normative-as-input-reference ~6
- **belowVA** 18 (VC 8 + NR 10)
- **deadGates** 7 near-dead (CR-017/018/019 existence-only booleans; CR-021/022/023/024 `IS NOT NULL` presence-only)
- **tier** acquisition-blocked

## belowVA list (18)
VC (8):
- eq Gl.9 (M_TS,BB) · Gl.10 (V_BB) · Gl.18 (TS_BS) · Gl.21 (TS_BB) · Gl.22 (q_A)
  — all `verified_via_cross_reference` to ATV-DVWK-A 131 (out-of-library governing form).
- CR-007 (t_D/t_T ≤ 0,35) — 0,35 threshold not in stored quote; PDF verbatim of the
  value not re-confirmed this session.
- CR-020 (Stapelzeit ≥ 1 Monat) — stored quote is the lead-in only; tabulated
  Stapelzeiten not read verbatim.
- dp-04 (cross-ref eq class ruling) — inherits VC.

NR (10):
- doc-atv-dvwk-a-131 · doc-atv-dvwk-a-198 · doc-dwa-a-118 · doc-dwa-m-268 ·
  doc-din-19559 · doc-abwv-anhang-1 (6 out-of-library documents).
- CR-021 (B_d,BSB, A198) · CR-022 (V_BB/TS_BB/q_A, A131) · CR-023 (Q_F/Q_R,Tr, A118) ·
  CR-024 (t_T, M268) — presence-only gates whose value basis is out-of-library.

## Findings by defect class
- **dead / near-dead gate (7):** CR-017/018/019 enforce `IS NOT NULL` on required
  booleans (`notstromversorgung`, `reservepumpe`, `durchflussmessung`) — can never
  FAIL on a value though the standard says "müssen". CR-021/022/023/024 are
  `IS NOT NULL` presence checks on derived/reference values → no reachable value-fail.
  → [[dp-06-cr-null-existence-gates]].
- **inequality-as-producer (2):** O_B_Nitr encoded `=3`, O_B_Deni encoded `=2.5`,
  but the standard prints `O_B ≥ 3` / `≥ 2,5` (floors). Plus **clause
  misattribution**: their clause_reference "Gl.13/Gl.14" points at the αOC=0,12/0,1
  ×Bd,BSB derivations, not the O_B constants. → [[dp-01-o-b-inequality]].
- **greedy-AND / enum-branch OR (5):** CR-002/003/004/005 use `sart != 'X' OR value`
  (branch-suppression: NULL/other enum silently passes); CR-006 uses `(sart=='a' AND …)
  OR (sart=='b' AND …)` which instead FAILS on a NULL/other enum — asymmetric NULL
  semantics across the two patterns. CR-022 is a 3-way greedy-AND of existence checks.
  → [[dp-02-cr006-greedy-and]].
- **#22 hand-enterable derived (7+):** equation outputs stored as `is_required`
  number fields — Q_S_aM, Q_bem, US_d, alphaOC, V_BB, TS_BB, A_NB (and more). Each is
  computed by a registered equation yet UI-enterable.
- **range-not-materialized / F-7 selection-record (4):** CR-023 quotes the DWA-A 118
  q_F 0,05–0,15 / q_R,Tr 0,2–0,7 ranges but enforces only `IS NOT NULL`; f_BB (Gl.11)
  and h_theo (Tab. Nachklärbeckenausführung, Gl.26) are range/lookup values with no
  selection record; ISV=125 / w_s,d=150 carried as `standard_recommended` defaults
  (SR-2 range-pick) → [[dp-05-isv-ws-d-defaults]].
- **modal-verb severity mismatch (soft, 3):** CR-012 (Glühverlust "ca. 55 % … sollte
  überprüft werden"), CR-020 ("sollte … bereitgestellt werden"), CR-023 ("sollte …
  erfolgen") encoded as `block` though the standard uses soll/kann. Warn candidates.
- **forward-reference / circular derive (1):** V_BB (Gl.10, A226-05) requires TS_BB
  which is produced downstream in A226-07 (Gl.21) — cross-worksheet back-edge.
- **branch-selector gap (1):** Gl.2 (Trennsystem) vs Gl.3 (Mischsystem) Q_bem — no
  encoded link ties the pick to `entwaesserungssystem`; both outputs coexist.
- **missing-doc dependency (6):** ATV-DVWK-A 131 (load-bearing sizing spine),
  ATV-DVWK-A 198 (load basis), DWA-A 118 (Fremd-/Regenwasser), DWA-M 268 (N-control),
  DIN 19559 (flow-meas. side-ref), AbwV Anhang 1 (context). None in library.

## Missing-doc deps (referenced, not-in-library)
ATV-DVWK-A 131, ATV-DVWK-A 198, DWA-A 118, DWA-M 268, DIN 19559, AbwV Anhang 1.

## Tier rationale — acquisition-blocked
The hydraulic + secondary-clarifier sizing spine (Gl.9,10,18,21,22 → V_BB, TS_BB,
q_A, A_NB) is *quoted from* ATV-DVWK-A 131, which is NOT in the library. Under
SR-1/SR-3 those equations cannot reach VA and their gating CRs (022, plus the q_A/RV
limits) rest on the same out-of-library basis. The load basis (B_d,BSB, Tab.1) is
governed by ATV-DVWK-A 198, also absent. So while the operational/geometry surface is
clean-VA (55/73 nodes VA, all §6.2 value gates VA, CR-001/016 range gates VA), the
core sizing chain is gated on acquiring ATV-DVWK-A 131 (and A198/A118) before a
harness run can attest the load-bearing math. → **acquisition-blocked**.

Secondary (fix-first) items that do NOT need a new doc and can be staged for Alvaro:
the O_B inequality/clause-misattribution (dp-01), the enum-branch NULL semantics
(dp-02), the 7 existence-only gates (dp-06), the #22 hand-enterable outputs, and the
un-materialized q_F/q_R,Tr ranges in CR-023. These are the harness-blockers to fix
first IF acquisition were resolved.
