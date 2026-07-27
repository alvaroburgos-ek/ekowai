$dir = "C:\Users\Ekowai\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-M-205"
function W($name, $content) { Set-Content -Path (Join-Path $dir $name) -Value $content -Encoding utf8 }

# fld ownership map (ws -> field symbols) built from prod
$own = @{
 'M205-01' = @('anlagen_id','biologische_vorbehandlung','empfangsgewaesser_zweck','ew_anschlussgroesse')
 'M205-02' = @('badegewaesser_guete','behoerdliche_freigabe','brauchwasser_standzeit_h','daly_wert','eg_badegewaesser_richtlinie','eignungsklasse_bewaesserung','gewaesserklasse','nutzungsziel','toc_bewaesserung','ziel_brauchwasser_oder_vollentkeimung','ziel_spurenstoffabbau')
 'M205-03' = @('afs','behandlungsziel','behoerdliche_freigabe','bromid','desinfektion_erforderlich','doc','durchfluss_max','nutzungsziel','quellen_punkt_diffus','uvt','ziel_spurenstoffabbau')
 'M205-04' = @('badegewaesser_guete','eg_badegewaesser_richtlinie','faekalcoliforme','gesamtcoliforme','gewaesserklasse','gewaessertyp','guetekategorie','strep_faecalis')
 'M205-05' = @('daly_wert','eignungsklasse_bewaesserung','fkstrep','gerinne_abdeckung_lichtdicht','invest_kosten_uv','ip_schutzart','kosten_uv_cent_m3','nicht_bestrahltes_volumen','nutzung','spez_strom_uv','strahler_auslastung_pct','strahler_leistungsdichte','strahler_nutzungsdauer','strahler_oberflaechentemperatur','strahler_quecksilberdampfdruck','strahler_wellenlaenge','strahlertyp','toc','toc_bewaesserung','uv_dosis','uv_dosis_zielband','uv_intensitaet','uvc_anteil','uvt_min','verweildauer')
 'M205-06' = @('abwassertemperatur_bereich','arbeitsdruck','brutto_permeatfluss','eps_potenzial','membranbetrieb','membranverfahren','netto_permeatfluss','permeabilitaet','porenweite','scaling_verursacher','spez_energie_membran','transmembrandruck','vorsiebung_erforderlich')
 'M205-07' = @('betriebsanweisung_biostoffv','brauchwasser_standzeit_h','bromat_bildung','ct_wert','ct_wert_zielorganismus','gefaehrdungsbeurteilung_biostoffv','kosten_ozon_cent_m3','ndma_bildung','ozon_aufenthaltszeit','ozon_aus_o2_anteil','ozon_einsatzgas','ozon_konz','ozon_pro_doc','ozon_pro_m3_o2','ozon_pro_o2','ozongenerator_frequenz','ozongenerator_spannung','restozon_abluft','spez_energie_anlage_ozon','spez_energie_ozon','temperatur_ozonentfernung','verbrennung_typ','wiederverkeimungsbeurteilung','ziel_brauchwasser_oder_vollentkeimung')
 'M205-08' = @('afs','bromid','chlormittel_typ','clo2_dosis','doc','durchfluss_max','entchlorungsstufe','freies_chlor','h2o2_dosis','h2o2_einsatz','h2o2_kontaktzeit','kontaktzeit_chlor','kontaktzeit_pes','pes_dosis','pes_handelsform_pct','ph_chlorung','restchlor','restchlor_betrieb','uvt')
 'M205-09' = @('chlorung_routine','empfohlenes_verfahren','kalibrierintervall_sensor','monatlicher_nachweis','pruefintervall_mikrobio','reinigungsintervall_sensor','uv_sensor_anzahl_pro_bank','verfahren','vergleich_e_coli_erreichbar','vergleich_vorbehandlungsbedarf')
 'M205-10' = @('darmviren','e_coli_ablauf','enterokokken_ablauf','faekalcoliforme_ablauf','faekalstreptokokken_ablauf','gesamtcoliforme_ablauf','log_reduktion','salmonellen','strahlertyp','uv_dosis','uv_dosis_zielband','uv_intensitaet','uvc_anteil','uvt_min','verweildauer')
 'M205-11' = @('abschreibungsdauer_baulich','abschreibungsdauer_emt','gerinne_abdeckung_lichtdicht','ip_schutzart','kapitalkostenanteil','mehrstrassige_anlage','nicht_bestrahltes_volumen','strahler_leistungsdichte','strahler_oberflaechentemperatur','strahler_quecksilberdampfdruck','strahler_wellenlaenge')
 'M205-12' = @('hg_strahler_sonderentsorgung','strahler_auslastung_pct','strahler_nutzungsdauer')
 'M205-13' = @('invest_kosten_uv','kosten_uv_cent_m3','spez_strom_uv')
 'M205-14' = @('abwassertemperatur_bereich','arbeitsdruck','brutto_permeatfluss','eps_potenzial','membran_porenweite','membranbetrieb','membranverfahren','netto_permeatfluss','permeabilitaet','pilotierung','porenweite','scaling_verursacher','transmembrandruck','vorsiebung_erforderlich')
 'M205-15' = @('spez_energie_membran')
 'M205-17' = @('ct_wert','ct_wert_zielorganismus','ozon_aufenthaltszeit','ozon_aus_o2_anteil','ozon_einsatzgas','ozon_konz','ozon_pro_doc','ozon_pro_m3_o2','ozon_pro_o2','ozongenerator_frequenz','ozongenerator_spannung','reaktor_gasdicht')
 'M205-18' = @('katalytisch','restozon_abgas','restozon_abluft','temperatur_ozonentfernung','verbrennung_haltezeit_s','verbrennung_typ')
 'M205-19' = @('kosten_ozon_cent_m3','spez_energie_anlage_ozon','spez_energie_ozon')
 'M205-20' = @('bromat_bildung','ndma_bildung')
 'M205-21' = @('chlor_kontaktzeit','chlor_ph','chlormittel','chlormittel_typ','clo2_dosis','clo2_konzentration','entchlorungsstufe','freies_chlor','kontaktzeit_chlor','ph_chlorung','restchlor','restchlor_betrieb','restchlor_gewaesser')
 'M205-22' = @('bgv_b4_konformitaet','csb_zunahme','kontaktzeit_pes','paa_dosis','pes_dosis','pes_handelsform_pct','sicherheitsdatenblatt_pes')
 'M205-23' = @('h2o2_dosis','h2o2_einsatz','h2o2_kontaktzeit')
 'M205-24' = @('gerinne_zuschaltbar','kalibrierintervall_sensor','monatlicher_nachweis','pruefintervall_mikrobio','reinigungsintervall_sensor','uv_sensor_anzahl_pro_bank')
 'M205-25' = @('darmviren','e_coli_ablauf','enterokokken_ablauf','faekalcoliforme_ablauf','faekalstreptokokken_ablauf','gesamtcoliforme_ablauf','log_reduktion','projekt_konform','salmonellen')
 'M205-26' = @('abschreibungsdauer_baulich','abschreibungsdauer_emt','kapitalkostenanteil','konformitaetsaussage')
}

# CR defs: code -> @{ syms; sev; cl; placements(list); prov; ref(doc wikilink or ''); note }
$crs = @(
 @{code='01'; syms=@('biologische_vorbehandlung'); sev='block'; cl='§1'; pl=@('M205-01'); ref=''; note='Gate the WWTP-effluent premise (biological pre-treatment present).'}
 @{code='02'; syms=@('behoerdliche_freigabe'); sev='block'; cl='§2.1'; pl=@('M205-01'); ref=''; note='Authority approval flag.'}
 @{code='03'; syms=@('e_coli_ablauf','enterokokken_ablauf'); sev='block'; cl='§3.2, Tab.2'; pl=@('M205-10','M205-25'); ref='[[tab-m205-02]]'; note='Bathing-water target (excellent, inland). Reads Tab.2.'}
 @{code='04'; syms=@('e_coli_ablauf','enterokokken_ablauf'); sev='block'; cl='§3.2, Tab.2'; pl=@('M205-10','M205-25'); ref='[[tab-m205-02]]'; note='Bathing-water target (good). Reads Tab.2.'}
 @{code='05'; syms=@('e_coli_ablauf','enterokokken_ablauf'); sev='block'; cl='§3.4 (TrinkwV Anlage 1 Teil I)'; pl=@('M205-10','M205-25'); ref='[[doc-trinkwv]]'; note='Drinking-water zero-count. Governed by TrinkwV (out-of-library).'}
 @{code='06'; syms=@('afs'); sev='block'; cl='§4.1.2.2'; pl=@('M205-03','M205-08'); ref=''; note='AFS <= 20 mg/l pre-condition for UV. Owned by M205-03/08.'}
 @{code='07'; syms=@('uv_dosis'); sev='block'; cl='§4.1.2.3'; pl=@('M205-05','M205-10'); ref='[[eq-m205-uvdosis-band-300-450]]'; note='UV-dose gate 300..700. GREEDY RANGE-BLEND: fuses the 300-450 baseline and the 400-600/700 operational band into one range that appears verbatim nowhere -> SR-2. [[dp-m205-uvdose-range]].'}
 @{code='08'; syms=@('restozon_abluft'); sev='block'; cl='§4.3.3.4 (DVGW W 625)'; pl=@('M205-05','M205-10'); ref='[[doc-dvgw-w-625]]'; note='Residual-ozone exhaust <= 0,02. Ozone symbol; defers to DVGW W 625.'}
 @{code='09'; syms=@('ozon_konz'); sev='block'; cl='§4.3.3.3'; pl=@('M205-05','M205-10'); ref=''; note='Ozone concentration 2..10 g/m3.'}
 @{code='10'; syms=@('ozon_aufenthaltszeit'); sev='block'; cl='§4.3.3.3'; pl=@('M205-05','M205-10'); ref=''; note='Ozone contact time >= 5.'}
 @{code='11'; syms=@('ph_chlorung'); sev='block'; cl='§4.4.2'; pl=@('M205-05','M205-10'); ref=''; note='Chlorination pH 6..8.'}
 @{code='12'; syms=@('restchlor'); sev='block'; cl='§4.4.2 (EG-Fischgewaesser-RL)'; pl=@('M205-10','M205-25'); ref='[[doc-eg-fischgewaesser]]'; note='Residual chlorine to water <= 0,005. Defers to EG-Fischgewaesser-RL.'}
 @{code='13'; syms=@('monatlicher_nachweis'); sev='block'; cl='§4.1.4.2'; pl=@('M205-09','M205-12'); ref=''; note='Monthly proof flag.'}
 @{code='14'; syms=@('e_coli_ablauf','enterokokken_ablauf'); sev='block'; cl='§3.2, Tab.2'; pl=@('M205-10','M205-25'); ref='[[tab-m205-02]]'; note='Bathing target (sufficient/coastal variant). Reads Tab.2.'}
 @{code='15'; syms=@('e_coli_ablauf','enterokokken_ablauf'); sev='block'; cl='§3.2, Tab.2'; pl=@('M205-10','M205-25'); ref='[[tab-m205-02]]'; note='Bathing target variant. Reads Tab.2.'}
 @{code='16'; syms=@('e_coli_ablauf','enterokokken_ablauf'); sev='block'; cl='§3.2, Tab.2'; pl=@('M205-10','M205-25'); ref='[[tab-m205-02]]'; note='Bathing target variant (dup of CR-03 thresholds).'}
 @{code='17'; syms=@('e_coli_ablauf','enterokokken_ablauf'); sev='block'; cl='§3.2, Tab.2'; pl=@('M205-10','M205-25'); ref='[[tab-m205-02]]'; note='Bathing target variant. Reads Tab.2.'}
 @{code='18'; syms=@('eignungsklasse_bewaesserung'); sev='block'; cl='§3.3'; pl=@('M205-01'); ref='[[tab-m205-03]]'; note='Irrigation suitability class IN {1,2,3,4}. Reads Tab.3 (TLL 2003).'}
 @{code='19'; syms=@('daly_wert'); sev='block'; cl='§3.3 (WHO)'; pl=@('M205-01'); ref='[[doc-who-daly]]'; note='DALY <= 1e-6. Defers to WHO (out-of-library).'}
 @{code='20'; syms=@('log_reduktion'); sev='block'; cl='§3.3 (WHO)'; pl=@('M205-10','M205-25'); ref='[[doc-who-daly]]'; note='Log-reduction >= 3. WHO-governed.'}
 @{code='21'; syms=@('ozon_pro_doc'); sev='block'; cl='§4.3.6'; pl=@('M205-05','M205-10'); ref='[[eq-m205-ozon-pro-doc]]'; note='Ozone/DOC < 0,8. TRIPLE-ENCODED (also eq + REQ-M205-ES1-04 warn) at conflicting severity. VERDICT-AS-GATE on a range threshold.'}
 @{code='22'; syms=@('entchlorungsstufe'); sev='block'; cl='§4.4.2'; pl=@('M205-05','M205-10'); ref=''; note='Dechlorination stage present flag.'}
 @{code='23'; syms=@('restchlor_betrieb'); sev='block'; cl='§4.4.2'; pl=@('M205-05','M205-10'); ref='[[eq-m205-restchlor-betrieb]]'; note='Operating residual chlorine >= 0,2. DUP of REQ-M205-ES1-11. VA value (p.29).'}
 @{code='24'; syms=@('kontaktzeit_chlor'); sev='block'; cl='§4.4.2'; pl=@('M205-05','M205-10'); ref=''; note='Chlorine contact time 15..30.'}
 @{code='25'; syms=@('pilotierung'); sev='block'; cl='§4.2.3.5'; pl=@('M205-08','M205-14'); ref=''; note='Membrane piloting flag. Owned by M205-14 (pilotierung field); M205-08 placement phantom.'}
 @{code='26'; syms=@('temperatur_ozonentfernung','katalytisch'); sev='block'; cl='§4.3.3.4'; pl=@('M205-10','M205-18'); ref=''; note='Thermal >=350 OR catalytic. Owned by M205-18.'}
 @{code='27'; syms=@('kalibrierintervall_sensor','reinigungsintervall_sensor'); sev='block'; cl='§4.1.4.2'; pl=@('M205-09','M205-12'); ref=''; note='Sensor calibration<=6 & cleaning<=4. Owned by M205-09/M205-24; M205-12 partial.'}
 @{code='28'; syms=@('durchfluss_max','mehrstrassige_anlage'); sev='block'; cl='§4.1.3.2'; pl=@('M205-05','M205-10'); ref=''; note='Flow<=1000 OR multi-line. durchfluss_max in M205-03/08, mehrstrassige_anlage in M205-11 -> BOTH placements phantom (split owners).'}
 @{code='29'; syms=@('ip_schutzart'); sev='block'; cl='§4.1.3.2'; pl=@('M205-05','M205-10'); ref=''; note='IP protection class IN set. ip_schutzart owned by M205-05/M205-11; M205-10 placement phantom.'}
 @{code='30'; syms=@('chlorung_routine'); sev='block'; cl='§4.4.2'; pl=@('M205-08','M205-09'); ref=''; note='Routine chlorination == nein. Owned by M205-09.'}
 @{code='31'; syms=@('wiederverkeimungsbeurteilung'); sev='block'; cl='§3.5'; pl=@('M205-07','M205-08'); ref='[[doc-biostoffv-trba]]'; note='Re-germination assessment. Owned by M205-07.'}
 @{code='32'; syms=@('gefaehrdungsbeurteilung_biostoffv','betriebsanweisung_biostoffv'); sev='block'; cl='§3.5 (BioStoffV, TRBA 220, TRBA 400)'; pl=@('M205-07','M205-08'); ref='[[doc-biostoffv-trba]]'; note='BioStoffV risk assessment + work instruction. Owned by M205-07; defers to BioStoffV/TRBA.'}
 @{code='33'; syms=@('hg_strahler_sonderentsorgung'); sev='block'; cl='§4.1.4.4'; pl=@('M205-09','M205-12'); ref=''; note='Hg-lamp special disposal. Owned by M205-12.'}
 @{code='34'; syms=@('afs','vorsiebung_erforderlich'); sev='block'; cl='§4.2.3.2'; pl=@('M205-05','M205-10'); ref=''; note='afs>0 AND vorsiebung IN {ja,nein}. afs in M205-03/08, vorsiebung in M205-06/14 -> BOTH placements phantom. Also the IN {ja,nein} clause is VACUOUS (any enum value passes) -> tautology gate.'}
 @{code='35'; syms=@('reaktor_gasdicht'); sev='block'; cl='§4.3.3.3'; pl=@('M205-10','M205-17'); ref=''; note='Gas-tight reactor flag. Owned by M205-17.'}
 @{code='36'; syms=@('bgv_b4_konformitaet','sicherheitsdatenblatt_pes'); sev='block'; cl='§4.4.3 (BGV B4)'; pl=@('M205-10','M205-22'); ref='[[doc-bgv-b4]]'; note='PES safety: BGV B4 + SDS. Owned by M205-22; defers to BGV B4.'}
)

foreach ($cr in $crs) {
  $code=$cr.code
  # ownership per placement
  $lines = @()
  $anyPhantom = $false; $anyOwned = $false
  foreach ($p in $cr.pl) {
    $ownedSyms = $own[$p]
    $missing = @($cr.syms | Where-Object { $ownedSyms -notcontains $_ })
    if ($missing.Count -eq 0) { $lines += "  - **$p**: OWNS all condition symbols -> live gate."; $anyOwned=$true }
    else { $lines += "  - **$p**: PHANTOM - missing field(s) ``$([string]::Join(', ',$missing))`` -> gate never resolves here (worksheet-local) -> DEAD (no reachable-fail)."; $anyPhantom=$true }
  }
  $verdict = if ($anyPhantom -and -not $anyOwned) { 'DEAD on every placement (phantom-field gate)' } elseif ($anyPhantom) { 'MIXED: live on its owner, DEAD (phantom) on the other placement(s)' } else { 'live (all placements own their symbols)' }
  $prov = if ($cr.ref -match 'doc-') { 'NR' } elseif ($anyPhantom -and -not $anyOwned) { 'EV' } else { 'VC' }
  $dc = if ($cr.syms.Count -eq 1 -and ($cr.syms[0] -match 'flag|ja') ) { 'engineer_input' } else { 'standard_fixed' }
  $refline = if ($cr.ref -ne '') { "`n- ``references::`` $($cr.ref)" } else { "" }
  $placeStr = [string]::Join(', ', $cr.pl)
  $body = [string]::Join("`n", $lines)
  $c = @"
---
title: "CR-$code — gate ($($cr.cl)) (compliance_requirement)"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-m-205, node/compliance_requirement, status/active]
status: active
source_document: "Merkblatt DWA-M 205 (Maerz 2013)"
source_page: ""
owner_worksheet: "$placeStr"
provenance: $prov
provenance_date: 2026-07-24
provenance_build: ""
data_class: $dc
severity: $($cr.sev)
requires_attestation: false
ratification_status: unratified
---
# CR-$code — compliance_requirement

**What it is.** ``compliance_requirements`` code **CR-$code**, severity ``$($cr.sev)``, clause $($cr.cl). Condition symbols: ``$([string]::Join(', ',$cr.syms))``. Prod places this SAME code on: $placeStr.

**Provenance basis.** GENERATED from prod ``compliance_requirements``. ``source_quote = null`` (no verbatim in the encoding) -> value not source-attested (SR-1) -> capped at $prov$(if($prov -eq 'NR'){" (out-of-library governing document, invariant #7)"}). $($cr.note)

**Gate-topology verdict: $verdict.**
$body

### Typed links
- ``gated_by::`` $([string]::Join(' , ', ($cr.pl | ForEach-Object { "[[section-m205-$($_.Substring(6))]]" })))$refline
"@
  W "cr-m205-$code.md" $c
}

# ES1 variants (carry quotes)
$es1 = @(
 @{f='cr-m205-es1-04'; code='REQ-M205-ES1-04'; sev='warn'; cl='§4.3.6'; syms='ozon_pro_doc'; pl='M205-07, M205-17'; page=''; vb='Die Ozonung von bromidhaltigem Abwasser kann zur Bildung von Bromat fuehren, dessen Einleitung in Gewaesser aufgrund seiner toxikologischen Eigenschaften grundsaetzlich unerwuenscht ist. ... Die Bromatbildung kann minimiert werden, wenn Ozon proportional zum DOC (< 0,8 mg/mg) dosiert wird.'; note='WARN twin of CR-21 (which is block). Same rule, two severities -> conflict. Carries verbatim source_quote (VC->VA on page read). ozon_pro_doc owned by M205-07/M205-17 -> live.'}
 @{f='cr-m205-es1-11'; code='REQ-M205-ES1-11'; sev='block'; cl='§4.4.2'; syms='restchlor_betrieb'; pl='M205-08, M205-21'; page='29'; vb='In dem aus dem Behandlungsbecken abfliessenden Abwasser muss noch ein Ueberschuss von freiem Chlor in der Groessenordnung von 0,2 mg/l nachzuweisen sein, um die Desinfektionswirkung sicherzustellen. Dieser Restchlorgehalt muss vor Einleitung in ein Gewaesser mit Hilfe einer Entchlorungsstufe entfernt werden.'; note='BLOCK twin of CR-23. restchlor_betrieb owned by M205-08/M205-21 -> live. Value 0,2 mg/l PDF-verbatim (printed p.29) -> VA. Source frames "in der Groessenordnung von" (soft floor) -> block-vs-warn ruling batched.'}
)
foreach ($e in $es1) {
  $prov = if ($e.page -ne '') { 'VA' } else { 'VC' }
  $vbblock = if ($e.vb -ne '') { "`n**Verbatim source$(if($e.page -ne ''){" (printed p.$($e.page))"}):**`n> `"$($e.vb)`"`n" } else { "" }
  $c = @"
---
title: "$($e.code) — gate ($($e.cl)) (compliance_requirement)"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-m-205, node/compliance_requirement, status/active]
status: active
source_document: "Merkblatt DWA-M 205 (Maerz 2013)"
source_page: "$($e.page)"
owner_worksheet: "$($e.pl)"
provenance: $prov
provenance_date: 2026-07-24
provenance_build: ""
data_class: standard_fixed
severity: $($e.sev)
requires_attestation: false
ratification_status: unratified
---
# $($e.code) — compliance_requirement

**What it is.** ``compliance_requirements`` code **$($e.code)**, severity ``$($e.sev)``, clause $($e.cl). Condition symbol ``$($e.syms)``. Prod places on: $($e.pl).

**Provenance basis.** GENERATED from prod ``compliance_requirements`` — this row DOES carry a ``source_quote`` (the only class that does). $(if($prov -eq 'VA'){"Value re-read verbatim in THIS PDF this session (printed p.$($e.page)) -> VA."}else{"PDF page not re-read this session -> VC (promote on page read)."})
$vbblock
**Finding.** $($e.note)

### Typed links
- ``gated_by::`` $([string]::Join(' , ', (($e.pl -split ',') | ForEach-Object { "[[section-m205-$($_.Trim().Substring(6))]]" })))
"@
  W "$($e.f).md" $c
}
"crs done"
