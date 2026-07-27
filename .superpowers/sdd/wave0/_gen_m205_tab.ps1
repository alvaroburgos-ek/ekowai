$dir = "C:\Users\Ekowai\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-M-205"
function W($name, $content) { Set-Content -Path (Join-Path $dir $name) -Value $content -Encoding utf8 }
$tabs = @(
 @('01','Mikrobiologische Qualitaetsanforderungen Badegewaesser 76/160/EWG','§3.2, Tab.1','7','[[doc-eg-76-160-ewg]]'),
 @('02','Mikrobiologische Qualitaetsanforderungen Badegewaesser 2006/7/EG (Binnen- und Kuestengewaesser)','§3.2, Tab.2','12','[[doc-eg-badegewaesser-2006-7]]'),
 @('03','Eignungsklassen Bewaesserungswasser TLL 2003','§3.3, Tab.3','12','[[doc-tll-2003]]'),
 @('04','Nieder-/Mitteldruck-UV-Strahler — Merkmale und Leistungsdaten','§4.1.3.1, Tab.4','16',''),
 @('05','Membrandesinfektion Betriebsdaten (Rottenburg/Ruhleben/Straubing)','§4.2.5, Tab.5','15',''),
 @('06','Ozon-Desinfektion — Bemessungspunkte und Untersuchungen','§4.3.2, Tab.6','16',''),
 @('07','Peressigsaeure (PES) — Desinfektionsleistung und Untersuchungen','§4.4.3, Tab.7','8',''),
 @('08','Verfahrensvergleich (Wirkprinzip, E. coli, Energie, Kosten, Nebenprodukte)','§5, Tab.8','2','')
)
foreach ($tb in $tabs) {
  $n=$tb[0]; $t=$tb[1]; $cl=$tb[2]; $rows=$tb[3]; $ref=$tb[4]
  $refline = if ($ref -ne '') { "`n- ``references::`` $ref  (governing source standard - out-of-library, NR cap on cross-standard detail)" } else { "" }
  $c = @"
---
title: "Tab.$n — $t (table)"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-m-205, node/table, status/active]
status: active
source_document: "Merkblatt DWA-M 205 (Maerz 2013)"
source_page: ""
owner_worksheet: M205-*
provenance: VC
provenance_date: 2026-07-24
provenance_build: ""
data_class: standard_fixed
severity: none
ratification_status: unratified
---
# Tab.$n — $t

**What it is.** Table ``Tab.$n`` (prod ``regulation_tables``, $rows rows), clause $cl. Reference table backing the microbiological/technical target values the CRs gate on.

**Provenance basis.** GENERATED from prod ``regulation_tables`` — **all rows carry a non-null ``source_quote``** (VA-capable). Marked **VC** here because THIS session I page-verified only the UV-dose text (p.16) and chlorine residual (p.29); the per-table PDF page was not individually re-read. Promote to VA on a page read against clause $cl. ``data_class: standard_fixed`` -> source_page REQUIRED for VA (currently empty -> VC ceiling, validator invariant #2 satisfied at VC).
$(if($ref -ne ''){"`n**Out-of-library cap.** The tabulated limits are transcribed FROM $($ref -replace '[\[\]]','') (the governing directive/standard). Under SR-1 the governing row must be quoted from THAT document; not in library, so NR on the cross-standard authority (validator invariant #7)."})

### Typed links
- ``consumed_by::`` the microbio/target-value CRs (Tab.2 -> [[cr-m205-03]]/[[cr-m205-04]]/[[cr-m205-14]]..[[cr-m205-17]]; Tab.3 -> [[cr-m205-18]])$refline
"@
  W "tab-m205-$n.md" $c
}
"tables done"
