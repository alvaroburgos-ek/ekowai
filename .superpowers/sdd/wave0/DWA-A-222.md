# Wave-0 triage — DWA-A-222

Standard: `891ab6f3-f7ba-4097-b52d-7e0045299b95` (Arbeitsblatt DWA-A 222, Mai 2011, korr. Okt 2018).
PDF: `C:\Users\Ekowai\Desktop\Guidelines\DWA-A-222\DWA-A_222 (1).pdf` (pdfStatus=text; scoop `pdftotext -layout`).
Reasoning map: `Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-A-222\` (135 nodes + `_index.md`).
Prod READ-ONLY. NO fixes applied, NO harness run.

## Page convention (derived THIS session from THIS PDF's own footer)
`printed = physical − 1`. Correlated footer integers with pdftotext form-feed physical-page
boundaries: footer 2→phys p.3, footer 6→phys p.7 (§1), footer 10→phys p.11 (§3.1/§3.2 eqs),
footer 19→§4.4.2 Trichterbecken. ToC (printed p.5) independently confirms every table/figure page.
NOT inherited from 138 (−2) or Naturteich (−3).

## Node counts
135 nodes (excl. index): 25 section · 28 equation · 7 table · 63 CR · 7 document · 5 decision-point.
Provenance: **VA 71 · VC 52 · EV 5 · NR 7** → belowVA (VC+EV+NR) = **64**.
data_class: standard_fixed 57 · derived 42 · engineer_input 27 · standard_range 7 · normative-as-input-reference 2.
Validator invariants (#1 VA needs page, #2 standard_fixed needs page, #8 NIR needs page+consumed_by): **0 violations**.

## Findings by defect class

### Dead gate (1)
- **CR-033 (A222-11)** — `condition = 'manual'` (warn, requires_attestation=true). Literal string, never
  parses to a predicate → no reachable fail. A live source-violating case passes. The sibling
  CR-033 on A222-16 encodes the SAME §4.3.7 O2-guarantee intent as a real 2-field condition → the fix
  pattern already exists in the encoding. → `dp-a222-cr033-manual`.

### Tautology / vacuous sub-clause (1)
- **CR-027 (A222-01)** — `... AND (mischsystem_ausnahmefall == 'nein' OR mischsystem_ausnahmefall == 'ja')`;
  on a boolean this OR is always true → dead sub-clause. → `dp-a222-phantom-gates`.

### Phantom-field / cross-worksheet gate (9)
Gate reads a symbol not owned by the gated worksheet (or absent entirely); in the worksheet-local
`evaluate` model the symbol resolves `fehlend` → red-for-wrong-reason or vacuous:
- **CR-017 (A222-02)** — `TKN_BSB5` is not defined as a settable field anywhere (truly phantom).
- **CR-007 (A222-03)** — `u_L` ← A222-07.
- **CR-008 (A222-03)** — `V_SB` ← A222-08, `V_R` ← A222-07.
- **CR-022 (A222-03)** — `GK` ← A222-01, `mindestanforderungen_abwv_anh1` ← A222-24.
- **CR-011 (A222-10)** — `RV` ← A222-14.
- **CR-012 (A222-10)** — `t_NB` ← A222-14.
- **CR-021 (A222-11)** — `h_OK`, `h_Wasser` ← A222-18.
- **CR-026 (A222-11)** — `DN` ← A222-18.
- **CR-036 (A222-16)** — `stoermeldung_vorhanden` ← A222-21, `stromausfallmeldung_netzunabhaengig` ← A222-18.
→ `dp-a222-phantom-gates`.

### Greedy-AND / chained-IF-THEN (2)
- **CR-041 (A222-01)** — `IF entwaesserungssystem=='mischsystem' THEN (geltungsbereich=='oberer' AND mischsystem_ausnahmefall==True)`.
- **CR-028 (A222-02)** — `IF EW>=50 THEN bemessung_methodik=='prognose'` (warn).
Unparenthesised IF/THEN under greedy parse — verify the parser binds the THEN to the whole guard, not a dead tail.

### Inequality / verdict-as-producer (4)
Equation `output_symbol` is the LHS/boolean of an inequality; the arithmetic engine returns the RHS
threshold / product, never the declared symbol → gate must be attestation/displayOnly-fed:
- **Gl.22 (A222-14)** — `A_NB_theo >= Q_bem·(1+RV)/2,2`.
- **Gl.27 (A222-14)** — `A_NB >= Q_bem·(1+RV)/2,8`.
- **Gl.16 (A222-09)** — `V_Sp = ∫Q_bem dt <= Q_d` (constraint, not producer).
- **Gl.12 (A222-07)** — `Q_L = u_L·A_R,FB`, feeds the `5≤u_L≤10` range gate CR-007.

### #22 hand-enterable-derived (large surface)
~25 equation outputs (V_TK, A_TK, A_RT, V_FB, A_SB, V_SB, V_SBR, V_BB, aOC, A_NB_theo, h_ges, h_t, h_e,
r_NB, A_NB, V_NB, Q_bem, EW, Q_S_h_max, Q_S_aM, Q_F, Q_L, t_T, Q_L_St) also exist as settable
`is_required:true` fields on their worksheets → engine-computed value is hand-enterable.
Also **dual `aOC` producer** (Gl.18 AND Gl.19 both emit aOC, by nitrification path). → `dp-a222-derived-hand-enterable`.

### F-7 range with no SR-2 selection (17)
m=0,5..1 (§3.1); f_S,QM=6..9 & q_F=0,05..0,15 (defer A-198); u_L=5..10 (§4.3.4); A_TK,spez=90..150
(§5.3); RV≥1; Tab.1–7 interpolation bands (V_TK/A_RT/V_FB/A_SB/V_SBR/V_BB EWspez, h_max, H_W,e).
Entered as free numbers, no recorded in-range pick. → `dp-a222-ranges`.

### Duplicate CR-code across worksheets (21 codes)
CR-011/012/013/020/021/023/024/025/026/033/034/035/036/037/038/039/040/041/042/043 reused with
DIFFERENT conditions on different worksheets. E.g. CR-041 = mischsystem (A222-01) vs. DWA-A-199-4
Betriebsanweisung (A222-24); CR-042 = Negativliste attest (A222-01) vs. Betriebstagebuch (A222-22);
CR-033 = DEAD `'manual'` (A222-11) vs. real 2-field O2 gate (A222-16). App keys on `id` so gates
still fire, but the human-readable `code` is non-unique → audit/traceability hazard. → `dp-a222-cr-code-collision`.

### Wrong clause reference (1)
- **CR-029 (A222-14)** — `RV >= 1` tagged `§4.3.2` (Tropfkörper) but lives on the Nachklärbecken sheet
  (correct clause is §4.4.1). Semantic-mismatch. → `dp-a222-phantom-gates`.

## Below-VA list (64 nodes)
- **NR (7)** — the out-of-library documents (all `in_library:false`): `doc-atv-dvwk-a-198`,
  `doc-atv-dvwk-a-131`, `doc-dwa-m-210`, `doc-dwa-m-209`, `doc-dwa-m-103`, `doc-dwa-a-199-4`,
  `doc-abwv-betrsichv-bundle`.
- **EV (5)** — data-collection/roll-up sheets with no printed scalar: `section-a222-17` (Notüberlauf),
  `section-a222-19` (Pumpen/Rohrleitungen), `section-a222-23` (Wartung), `section-a222-25`
  (Ergebniszusammenfassung), and the dead gate `cr-a222-11-cr-033`.
- **VC (52)** — the CR gates whose threshold is printed but whose `source_quote` is NULL in the
  encoding (page located in PDF, verbatim string not captured this session → VC per SR-3), plus the
  VC section sheets (05, 11, 13, 15, 16, 18, 20, 21, 22, 24) and the 5 decision-points.
  These lift to VA by capturing the verbatim §-string in a later pass — no acquisition needed.

## Dead gates
1 (CR-033 / A222-11).

## Missing-doc dependencies (6 distinct external standards; 7 doc nodes)
- **ATV-DVWK-A 198** — governs Tab.1 b_xxx,85 loads + Q_bem coefficients f_S,QM (6..9), q_F
  (0,05..0,15). DWA-A-222 prints Tab.1 (VA-in-222) but defers derivation + ranges → deferred detail NR.
- **ATV-DVWK-A 131** — base activated-sludge O2/Schlammalter for §4.3.7 (Gl.18/19/21) → detail NR.
- **DWA-M 210** — SBR design (§4.3.6) → SBR narrative detail NR.
- **DWA-M 209** — O2/energy guarantee values (CR-033) → NR.
- **DWA-M 103** — Hochwasservorsorge (CR-025) → NR.
- **DWA-A 199-4** + **AbwV Anh.1 / BetrSichV** bundle — operating-instruction / discharge-limit
  conformance (A222-24 CR-041/024, A222-03 CR-022) → NR.
None is acquisition-blocking: DWA-A-222 prints its own equations and tables; the missing docs only cap
deferred derivation detail.

## Tier
**fix-first** — source-rich and mostly VA-reachable (28 VA equations, 7 VA tables, all with verbatim
§-quotes; VA 71 of 135), but carries a dead gate (CR-033), a tautology gate (CR-027), 9
phantom/cross-worksheet gates, 21 duplicate CR codes, a wrong-clause-ref, and a large
#22 hand-enterable-derived surface. All fixable in-repo without acquiring a not-in-library document →
**fix-first**, not acquisition-blocked.
