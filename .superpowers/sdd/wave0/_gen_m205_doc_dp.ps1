$dir = "C:\Users\Ekowai\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-M-205"
function W($name, $content) { Set-Content -Path (Join-Path $dir $name) -Value $content -Encoding utf8 }

$docs = @(
 @{f='doc-din-5031-1'; t='DIN 5031-1 (Strahlungsphysik / UV-Dosis-Definition)'; dep='[[eq-m205-uvdosis]]'; note='UV-dose definition (intensity x residence time) defers to DIN 5031-1.'}
 @{f='doc-dvgw-w-225'; t='DVGW W 225 (Ozon in der Wasseraufbereitung / ct-Wert)'; dep='[[eq-m205-ct-wert]]'; note='ct-value concept and disinfection ct targets defer to DVGW W 225.'}
 @{f='doc-dvgw-w-625'; t='DVGW W 625 (Restozon)'; dep='[[cr-m205-08]]'; note='Residual-ozone exhaust limit (0,02) references DVGW W 625.'}
 @{f='doc-bgv-b4'; t='BGV B4 (Berufsgenossenschaftliche Vorschrift — PES-Sicherheit)'; dep='[[cr-m205-36]]'; note='Peracetic-acid handling safety governed by BGV B4.'}
 @{f='doc-trinkwv'; t='TrinkwV Anlage 1 Teil I (Trinkwasserverordnung)'; dep='[[cr-m205-05]]'; note='Zero-count drinking-water microbio limits governed by TrinkwV.'}
 @{f='doc-eg-badegewaesser-2006-7'; t='EG-Badegewaesserrichtlinie 2006/7/EG'; dep='[[tab-m205-02]]'; note='Bathing-water microbiological quality classes (Tab.2). Governing EU directive.'}
 @{f='doc-eg-76-160-ewg'; t='EG-Badegewaesserrichtlinie 76/160/EWG (Vorgaenger)'; dep='[[tab-m205-01]]'; note='Predecessor bathing-water directive limit values (Tab.1).'}
 @{f='doc-biostoffv-trba'; t='BioStoffV + TRBA 220 / TRBA 400 (Arbeitsschutz bioStoff)'; dep='[[cr-m205-32]]'; note='Occupational biological-agent risk assessment governed by BioStoffV/TRBA.'}
 @{f='doc-who-daly'; t='WHO Guidelines (DALY 1e-6 / Log-Reduktion)'; dep='[[cr-m205-19]]'; note='DALY health-target and log-reduction reference from WHO guidelines.'}
 @{f='doc-eg-fischgewaesser'; t='EG-Fischgewaesser-Richtlinie'; dep='[[cr-m205-12]]'; note='Residual-chlorine to receiving water limit (0,005) from EG-Fischgewaesser-RL.'}
 @{f='doc-tll-2003'; t='TLL 2003 (Eignungsklassen Bewaesserungswasser)'; dep='[[tab-m205-03]]'; note='Irrigation-water suitability classes (Tab.3) transcribed from TLL 2003.'}
)
foreach ($d in $docs) {
  $c = @"
---
title: "$($d.t) (document)"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-m-205, node/document, status/active]
status: active
source_document: "$($d.t)"
in_library: false
provenance: NR
provenance_date: 2026-07-24
provenance_build: ""
data_class: engineer_input
severity: none
ratification_status: unratified
---
# $($d.t)

**What it is.** External referenced document. **NOT in the EKOWAI library** (``in_library: false``). $($d.note)

**Provenance basis.** GENERATED from ``compliance_requirements`` / ``equations`` / ``regulation_tables`` clause_reference strings in the DWA-M-205 encoding that defer to this document. Under SR-1 the governing value must be quoted from THIS document; it is unavailable -> every dependent node caps at **NR/VC** (validator invariant #7).

### Typed links
- ``consumed_by::`` $($d.dep)  (dependent DWA-M-205 node -> NR cap on the cross-standard authority)
"@
  W "$($d.f).md" $c
}

# decision points
$dps = @(
 @{f='dp-m205-phantom-gate-topology'; t='Phantom-field / dead-gate topology (re-home CRs to owning worksheets)'; cls='gate-topology / phantom-field / dead-gate'; body='~40 CR placements gate on symbols the host worksheet does not own; the wizard resolves gate symbols worksheet-locally, so those gates never see a value and never fire (dead: no reachable-fail). 14 CR codes are DEAD on EVERY placement (CR-02,08,09,10,11,18,19,22,24,28,29,34 among them); 11 more are MIXED (live on their true owner, dead on the pile-up placement on M205-05/M205-10). CR-28 and CR-34 are dead on BOTH placements because their two symbols live in different worksheets (split ownership). RULING NEEDED: re-home each CR to the single worksheet that owns all its condition symbols (single-owner), OR promote the shared symbols to a common upstream worksheet with consumer edges. Not auto-fixed (topology change to gate placement).'}
 @{f='dp-m205-duplicate-rows'; t='Duplicate CR/equation rows across worksheets (single-owner violation)'; cls='duplicate / single-owner'; body='36 CR codes occupy 74 placements; 12 distinct equations occupy 26 rows. Same rule encoded 2-3x, sometimes at CONFLICTING severity: ozon_pro_doc < 0,8 is CR-21 (block) + REQ-M205-ES1-04 (warn) + eq-m205-ozon-pro-doc; restchlor_betrieb >= 0,2 is CR-23 (block) + REQ-M205-ES1-11 (block) + eq. RULING NEEDED: choose the single authoritative row per rule (severity + owner) and delete the rest.'}
 @{f='dp-m205-inequality-as-producer'; t='Inequality / range / fixed-constant modelled as equation producer'; cls='inequality-as-producer / verdict-as-producer'; body='EQ-02/06/07/09/10/11/12 declare output_symbol = the LHS of a >=/<=/range constraint; the arithmetic engine cannot emit a scalar from a constraint (must be displayOnly or a range field). EQ-05 spez_energie_ozon = 10 is a printed constant mis-modelled as an equation (should be standard_fixed). ozon_pro_doc < 0,8 and restchlor_betrieb >= 0,2 are thresholds, not producers. RULING NEEDED: reclassify each as (a) real producer, (b) range/standard_range selection field (SR-2), or (c) standard_fixed constant.'}
 @{f='dp-m205-uvdose-range'; t='UV-dose gate fuses two distinct source bands (SR-2 range-fabrication)'; cls='greedy-AND / SR-2 range'; body='CR-07 gates uv_dosis >= 300 AND uv_dosis <= 700. The PDF (printed p.16, §4.1.2.3) gives TWO distinct bands: baseline "Mindestbestrahlung etwa 300 J/m2 bis 450 J/m2" and operational "Schwankungsbreite 400 J/m2 bis 600 J/m2 und im Einzelfall bis zu 700 J/m2". Neither a flat 300-700 nor a flat 400-700 appears verbatim; the "im Einzelfall" (case-by-case) qualifier on the 700 upper bound is dropped. Encoding EQ-12 also flattens 400-600(-700) to 400-700. RULING NEEDED (SR-2): surface the two bands as explicit engineer selection, do not silently widen to a single 300-700 gate.'}
 @{f='dp-m205-ev-quotes'; t='Missing source_quote on all plain CRs (SR-1 attestation gap)'; cls='EV / SR-1'; body='Every CR-01..CR-36 row has source_quote = null; only the two REQ-M205-ES1-* rows carry a verbatim quote. Under SR-1 a value is not apply-ready without a same-session verbatim quote from the standard. RULING/WORK: attach the PDF verbatim + printed page to each value-bearing CR before any fix or harness gate on it. Most values ARE quotable (I confirmed UV-dose p.16 and chlorine p.29; Tab.1-8 rows already carry quotes) -> this is transcription work, not a source gap, EXCEPT the out-of-library-governed limits (CR-05/12/19/20 etc.) which need the governing document (see the doc nodes -> NR).'}
)
foreach ($dp in $dps) {
  $c = @"
---
title: "$($dp.t) (decision-point)"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-m-205, node/decision-point, status/active]
status: active
source_document: "Merkblatt DWA-M 205 (Maerz 2013)"
source_page: ""
owner_worksheet: M205-*
provenance: VC
provenance_date: 2026-07-24
provenance_build: ""
data_class: engineer_input
severity: none
ratification_status: unratified
decision_class: "$($dp.cls)"
---
# $($dp.t)

**Decision class.** $($dp.cls). Batched to Alvaro — never guessed.

**What it is.** $($dp.body)

### Typed links
- ``fired_by::`` the DWA-M-205 encoding artifacts named above (see ``_index`` findings)
"@
  W "$($dp.f).md" $c
}
"docs + dps done"
