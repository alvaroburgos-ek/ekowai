$dir = "C:\Users\Ekowai\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-M-205"
function W($name, $content) { Set-Content -Path (Join-Path $dir $name) -Value $content -Encoding utf8 }

# each: file, title, formula, output_symbol, clause, prod_rows(worksheets), provenance, data_class, page, verbatim, finding
$eqs = @(
 @{f='eq-m205-uvdosis'; t='UV-Dosis = Intensitaet x Verweildauer'; formula='uv_dosis = uv_intensitaet * verweildauer'; sym='uv_dosis'; cl='§4.1.1, DIN 5031-1'; rows='M205-05, M205-10'; prov='VC'; dc='derived'; page=''; vb=''; find='Real producer equation (product), but its clause defers to DIN 5031-1 (out-of-library) for the UV-dose definition -> caps VC; references [[doc-din-5031-1]] -> NR on the DIN-governed definition. Duplicated on M205-05 (Bewaesserung) and M205-10 (UV outputs); belongs on the UV design worksheet M205-10.'},
 @{f='eq-m205-uvdosis-band-300-450'; t='UV-Dosis Zielband 300-450 J/m2'; formula='uv_dosis >= 300 AND uv_dosis <= 450'; sym='uv_dosis'; cl='§4.1.2.3'; rows='M205-05, M205-10'; prov='VA'; dc='standard_range'; page='16'; vb='Danach betraegt die Mindestbestrahlung etwa 300 J/m2 bis 450 J/m2 zur sicheren Einhaltung der Grenz- und Leitwerte der EG-Badegewaesser-Richtlinie fuer biologisch gereinigtes Abwasser bei einer Konzentration an abfiltrierbaren Stoffen von 5 mg/l bis 20 mg/l.'; find='INEQUALITY-AS-PRODUCER: output_symbol is the LHS of a range constraint, not an engine-producible scalar -> must be displayOnly / a range field (SR-2), never a derived producer. standard_range: baseline band 300-450 is printed verbatim; point-pick must be surfaced to the engineer.'},
 @{f='eq-m205-uvdosis-band-400-700'; t='UV-Dosis operative Schwankungsbreite 400-700 J/m2'; formula='uv_dosis >= 400 AND uv_dosis <= 700'; sym='uv_dosis'; cl='§4.1.2.3'; rows='M205-05, M205-10'; prov='VA'; dc='standard_range'; page='16'; vb='Eine Auswertung der Daten von verschiedenen, im Betrieb befindlichen UV-Anlagen zeigt eine Schwankungsbreite fuer die eingestellte Mindestbestrahlung von 400 J/m2 bis 600 J/m2 und im Einzelfall bis zu 700 J/m2 [16].'; find='INEQUALITY-AS-PRODUCER. Note the source band is 400-600 with a case-by-case extension to 700 (NOT a flat 400-700). Encoding flattens the "im Einzelfall" qualifier into the hard upper bound -> SR-2 range-fabrication. Distinct from the 300-450 baseline; CR-07 illegitimately fuses both into 300..700 -> [[dp-m205-uvdose-range]].'},
 @{f='eq-m205-spez-strom-uv'; t='Spezifischer Stromverbrauch UV 30-60 Wh/m3'; formula='spez_strom_uv >= 30 AND spez_strom_uv <= 60'; sym='spez_strom_uv'; cl='§4.1.5.2'; rows='M205-05, M205-13'; prov='VC'; dc='standard_range'; page=''; vb=''; find='INEQUALITY-AS-PRODUCER + range. source_quote present in prod but PDF page not re-read this session -> VC (page derivable from §4.1.5.2). Cost/energy figure, informative.'},
 @{f='eq-m205-spez-energie-membran'; t='Spez. Energiebedarf Membran 0,1-0,2 kWh/m3'; formula='spez_energie_membran >= 0.1 AND spez_energie_membran <= 0.2'; sym='spez_energie_membran'; cl='§4.2.2'; rows='M205-06, M205-15'; prov='VC'; dc='standard_range'; page=''; vb=''; find='INEQUALITY-AS-PRODUCER + range. Clause §4.2.2 (Dead-End-Betrieb). VC pending PDF page read.'},
 @{f='eq-m205-permeabilitaet'; t='Permeabilitaet = Brutto-Permeatfluss / Transmembrandruck'; formula='permeabilitaet = brutto_permeatfluss / transmembrandruck'; sym='permeabilitaet'; cl='§4.2.3.1'; rows='M205-06, M205-14'; prov='VC'; dc='derived'; page=''; vb=''; find='Real producer equation (quotient). Both inputs are engineer_input membrane fields. Duplicated M205-06/M205-14. VC pending page read.'},
 @{f='eq-m205-ct-wert'; t='ct-Wert = Ozonkonzentration x Einwirkzeit'; formula='ct_wert = ozon_konz * ozon_aufenthaltszeit'; sym='ct_wert'; cl='§4.3.2 (DVGW W 225)'; rows='M205-07, M205-17'; prov='VC'; dc='derived'; page=''; vb=''; find='Real producer equation. Clause defers to DVGW W 225 (out-of-library) for the ct concept -> references [[doc-dvgw-w-225]] -> NR on the DVGW-governed ct target. Product itself is engine-computable. Duplicated M205-07/M205-17.'},
 @{f='eq-m205-ozon-pro-doc'; t='Ozon/DOC < 0,8 mg/mg (Bromatminimierung)'; formula='ozon_pro_doc < 0.8'; sym='ozon_pro_doc'; cl='§4.3.6'; rows='M205-07, M205-17'; prov='VC'; dc='standard_fixed'; page=''; vb=''; find='INEQUALITY-AS-PRODUCER (strict <). This is a CONSTRAINT threshold (0,8), not a producer; also encoded as CR-21 (block) and REQ-M205-ES1-04 (warn) -> triple-encoded same rule at conflicting severities -> [[dp-m205-duplicate-rows]]. REQ-M205-ES1-04 carries the verbatim quote; this eq row does not.'},
 @{f='eq-m205-spez-energie-ozon'; t='Spez. Energiebedarf Ozonerzeugung ~10 kWh/kg'; formula='spez_energie_ozon = 10'; sym='spez_energie_ozon'; cl='§4.3.3.2'; rows='M205-07, M205-19'; prov='VC'; dc='standard_fixed'; page=''; vb=''; find='FIXED-CONSTANT-AS-EQUATION: "= 10" is a printed constant (~10 kWh/kg at pure O2; ~60% higher with air), not a derivation. Should be a standard_fixed reference value, not an equation producer. The "ca." + air-case caveat is dropped. Duplicated M205-07/M205-19.'},
 @{f='eq-m205-clo2-dosis'; t='Chlordioxid-Dosis 5-10 g/m3'; formula='clo2_dosis >= 5 AND clo2_dosis <= 10'; sym='clo2_dosis'; cl='§4.4.2'; rows='M205-08, M205-21'; prov='VC'; dc='standard_range'; page=''; vb=''; find='INEQUALITY-AS-PRODUCER + range. Source also gives a reduced band 1-5 g/m3 for sand-filtered effluent (conditional band dropped) -> SR-2. Duplicated M205-08/M205-21.'},
 @{f='eq-m205-freies-chlor'; t='Freies Chlor 1-20 mg/l'; formula='freies_chlor >= 1 AND freies_chlor <= 20'; sym='freies_chlor'; cl='§4.4.2'; rows='M205-08, M205-21'; prov='VC'; dc='standard_range'; page=''; vb=''; find='INEQUALITY-AS-PRODUCER + range. Duplicated M205-08/M205-21.'},
 @{f='eq-m205-restchlor-betrieb'; t='Restchlorgehalt Betrieb >= 0,2 mg/l'; formula='restchlor_betrieb >= 0.2'; sym='restchlor_betrieb'; cl='§4.4.2'; rows='M205-08, M205-21'; prov='VA'; dc='standard_fixed'; page='29'; vb='In dem aus dem Behandlungsbecken abfliessenden Abwasser muss noch ein Ueberschuss von freiem Chlor in der Groessenordnung von 0,2 mg/l nachzuweisen sein, um die Desinfektionswirkung sicherzustellen.'; find='INEQUALITY-AS-PRODUCER (>= threshold, not a producer). The 0,2 mg/l floor is PDF-verbatim (printed p.29) -> VA on the value. Also encoded as CR-23 (block, no quote) and REQ-M205-ES1-11 (block, with quote) -> duplicate. Source frames it "in der Groessenordnung von" (order-of-magnitude), a soft floor -> block-vs-warn ruling batched.'}
)
foreach ($e in $eqs) {
  $vbblock = if ($e.vb -ne '') { "`n**Verbatim source (printed p.$($e.page)):**`n> `"$($e.vb)`"`n" } else { "" }
  $pageline = "source_page: `"$($e.page)`""
  $c = @"
---
title: "$($e.t) (equation)"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-m-205, node/equation, status/active]
status: active
source_document: "Merkblatt DWA-M 205 (Maerz 2013)"
$pageline
owner_worksheet: "$($e.rows)"
provenance: $($e.prov)
provenance_date: 2026-07-24
provenance_build: ""
data_class: $($e.dc)
severity: none
displayOnly: true
ratification_status: unratified
---
# $($e.t)

**What it is.** Equation (prod ``equations``). Formula (encoded): ``$($e.formula)``; ``output_symbol = $($e.sym)``; clause $($e.cl). Prod rows on: $($e.rows).

**Provenance basis.** GENERATED from prod ``equations`` (``verification_status = needs_engineer_review``, ``imported_unverified``). $(if($e.prov -eq 'VA'){"VA: value read verbatim in THIS PDF this session (printed p.$($e.page))."}else{"VC: clause present; PDF page not re-read this session (or defers to an out-of-library standard)."})
$vbblock
**Finding.** $($e.find)

### Typed links
- ``produces::`` ``$($e.sym)``$(if($e.dc -eq 'derived'){" (engine-computable)"}else{" (constraint LHS - NOT engine-producible; displayOnly)"})
- section: [[section-m205-$(($e.rows -split ',')[0].Trim().Substring(6))]]
"@
  W "$($e.f).md" $c
}
"equations done"
