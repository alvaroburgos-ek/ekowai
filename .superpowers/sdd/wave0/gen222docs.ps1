$root = "C:\Users\Ekowai\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-A-222"
function W($name,$content){ Set-Content -Path (Join-Path $root $name) -Value $content -Encoding utf8 }

# slug | title | what | refby
$docs = @(
 @('doc-atv-dvwk-a-198','ATV-DVWK-A 198 (Vereinheitlichung/Herleitung von Bemessungswerten)','Governing standard for the Tab.1 b_xxx,85 loads AND the Q_bem coefficients f_S,QM (6..9) and q_F (0,05..0,15). DWA-A-222 sec3.1/sec3.2 print Tab.1 values but defer their derivation + the coefficient ranges to A-198.','[[eq-a222-02-gl4]], [[eq-a222-02-gl6]], [[eq-a222-02-gl7]], [[tab-a222-01-bwerte]]'),
 @('doc-atv-dvwk-a-131','ATV-DVWK-A 131 (Bemessung einstufiger Belebungsanlagen)','Base activated-sludge dimensioning (oxygen transfer aOC/OC, Schlammalter). sec4.3.7 builds the aOC/O2 chain on it.','[[eq-a222-10-gl18]], [[eq-a222-10-gl19]], [[eq-a222-10-gl21]]'),
 @('doc-dwa-m-210','DWA-M 210 (SBR-Anlagen)','SBR design guidance referenced by sec4.3.6; the SBR storage-volume/cycle narrative defers to it.','[[section-a222-09]], [[eq-a222-09-gl16]]'),
 @('doc-dwa-m-209','DWA-M 209 (Sauerstoffzufuhr / Energie)','O2-supply and energy guarantee-value verification; referenced by CR-033.','[[cr-a222-11-cr-033]], [[cr-a222-16-cr-033]]'),
 @('doc-dwa-m-103','DWA-M 103 (Hochwasservorsorge fuer Abwasseranlagen)','Flood-protection guidance; referenced by the sec5.1 flood-protection attestation CR-025.','[[cr-a222-11-cr-025]], [[cr-a222-16-cr-025]]'),
 @('doc-dwa-a-199-4','DWA-A 199-4 (Betriebsanweisung/Dienstanweisung fuer Abwasseranlagen)','Operating-instruction standard; A222-24 CR-041 attests conformance to it.','[[cr-a222-24-cr-041]]'),
 @('doc-abwv-betrsichv-bundle','AbwV Anhang 1 + BetrSichV (Rechtsvorschriften-Bundle)','German discharge-limit ordinance (AbwV Anh.1 - haeusliches Abwasser) and Betriebssicherheitsverordnung; conformance gated by A222-03 CR-022 (GK1 Mindestanforderungen) and A222-24 CR-024.','[[cr-a222-03-cr-022]], [[cr-a222-24-cr-024]]')
)
foreach($d in $docs){
 $slug=$d[0]; $title=$d[1]; $what=$d[2]; $refby=$d[3]
 $c = @"
---
title: "DOC - $title"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-a-222, node/document, status/active]
status: active
source_document: "$title"
source_page:
owner_worksheet: A222-*
provenance: NR
provenance_date: 2026-07-24
provenance_build:
data_class: standard_fixed
in_library: false
severity: none
ratification_status: unratified
---
# DOCUMENT - $title

**What it is.** External standard referenced by DWA-A-222. ``in_library: false``. $what

**Effect (validator invariant #7).** Every DWA-A-222 node whose value/detail defers to this document caps at **NR** until this standard's rows are quoted in-session. The DWA-A-222-internal attestation/threshold (what the engineer signs or the number printed in DWA-A-222 itself) is VA/VC against DWA-A-222; the referenced-standard detail is NR.

**NR-capped DWA-A-222 nodes (referencing this doc):**
- $refby
"@
 W "$slug.md" $c
}

# ---------- DECISION POINTS (5) ----------
$dps = @(
 @('dp-a222-cr-code-collision','CR-code collision across worksheets','21 CR codes are reused with DIFFERENT conditions on different worksheets (CR-011/012/013/020/021/023/024/025/026/033/034/035/036/037/038/039/040/041/042/043). E.g. CR-041 = mischsystem gate (A222-01) vs. DWA-A-199-4 Betriebsanweisung (A222-24); CR-042 = Negativliste attest (A222-01) vs. Betriebstagebuch (A222-22); CR-033 = DEAD manual gate (A222-11) vs. a real 2-field O2 gate (A222-16). App keys on id so gates still fire, but the human-readable code is non-unique -> audit/traceability hazard.','RULING NEEDED: rename per-worksheet to unique codes vs. accept id-keyed duplication (documented).'),
 @('dp-a222-derived-hand-enterable','Derived outputs also present as required input fields (#22)','~25 equation output symbols (V_TK, A_TK, A_RT, V_FB, A_SB, V_SB, V_SBR, V_BB, aOC, A_NB_theo, h_ges, h_t, h_e, r_NB, A_NB, V_NB, Q_bem, EW, Q_S_h_max, Q_S_aM, Q_F, Q_L, t_T, Q_L_St) exist as settable fields (is_required:true) on their worksheets -> the engine-computed value is hand-enterable (#22 class). Also two aOC producers (Gl.18 and Gl.19) and two A_NB/A_NB_theo inequality-producers.','RULING NEEDED: lock derived fields to read-only (single-source, engine-fed) vs. keep as manual override; and resolve the dual aOC producer (Gl.18 vs Gl.19 by nitrification path).'),
 @('dp-a222-ranges','Standard_range bands with no SR-2 selection','17 range bands are entered as free numbers with no recorded in-range selection: m=0,5..1 (sec3.1), f_S,QM=6..9 & q_F=0,05..0,15 (A-198), u_L=5..10 (sec4.3.4), A_TK,spez=90..150 (sec5.3), RV>=1, plus the Tab.1-7 interpolation bands (V_TK/A_RT/V_FB/A_SB/V_SBR/V_BB EWspez, h_max, H_W,e). SR-2: the machine must surface the range as an explicit engineer selection, never silently auto-pick.','RULING NEEDED: which ranges become explicit selection fields; confirm no silent point-pick in the engine.'),
 @('dp-a222-cr033-manual','Dead manual gate CR-033 (A222-11)','A222-11 CR-033 has condition = literal string manual (warn, requires_attestation=true). It never parses to an evaluable predicate -> no reachable fail -> a live source-violating case passes. The sibling CR-033 on A222-16 encodes the same sec4.3.7 O2-guarantee intent as a real 2-field condition, so the intended fix pattern already exists.','RULING NEEDED: replace A222-11 CR-033 with the attestation predicate (attest_... == True) mirroring A222-16, or delete the duplicate. Refers DWA-M 209 (NR).'),
 @('dp-a222-phantom-gates','Phantom / cross-worksheet gate symbols','9 gates read symbols not owned by the gated worksheet (or absent entirely): CR-017/A222-02 (TKN_BSB5 - no field defines it), CR-007/CR-008/CR-022 on A222-03 (u_L<-07, V_SB<-08, V_R<-07, GK<-01, mindestanforderungen<-24), CR-011/CR-012 on A222-10 (RV,t_NB<-14), CR-021/CR-026 on A222-11 (h_OK,h_Wasser,DN<-18), CR-036/A222-16 (stoermeldung<-21, stromausfall<-18). Plus the CR-027 tautology and CR-029 wrong-clause-ref. In the worksheet-local evaluate model these symbols resolve fehlend -> gate red for the wrong reason or vacuous.','RULING NEEDED: re-home each gate to its owning worksheet, or make the symbol a declared cross-worksheet consumer input; fix CR-027 tautology and CR-029 clause ref.')
)
foreach($dp in $dps){
 $slug=$dp[0]; $title=$dp[1]; $body=$dp[2]; $ask=$dp[3]
 $c = @"
---
title: "DECISION - $title"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-a-222, node/decision-point, status/active]
status: active
source_document: "DWA-A-222 (Mai 2011, korr. Okt 2018)"
source_page:
owner_worksheet: A222-*
provenance: VC
provenance_date: 2026-07-24
provenance_build: wave0-triage
data_class: derived
severity: none
ratification_status: unratified
---
# DECISION-POINT - $title

**What it is.** Alvaro's batch item (never auto-decided).

**Detail.** $body

**Ask.** $ask

### Typed links
- ``fired_by::`` the encoding rows named above (see [[_index]] Findings)
"@
 W "$slug.md" $c
}
"docs+dps done"
