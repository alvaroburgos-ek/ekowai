$root = "C:\Users\Ekowai\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-A-222"
function W($name,$content){ Set-Content -Path (Join-Path $root $name) -Value $content -Encoding utf8 }

# ws | code | severity | attest(bool) | clause | condition | prov | finding
$crs = @(
 @('01','CR-027','block',$false,'sec1',"negativliste_geprueft == 'ja' AND (mischsystem_ausnahmefall == 'nein' OR mischsystem_ausnahmefall == 'ja')",'VC','TAUTOLOGY: the OR sub-clause on a boolean is always true -> vacuous. See [[dp-a222-phantom-gates]].'),
 @('01','CR-041','block',$false,'1',"IF entwaesserungssystem == 'mischsystem' THEN (geltungsbereich == 'oberer' AND mischsystem_ausnahmefall == True)",'VA','GREEDY-AND / chained-IF-THEN; also CODE-COLLISION (CR-041 reused on A222-24 with a different condition). Verbatim Negativliste sec1.'),
 @('01','CR-042','block',$true,'1','attest_a222_01_cr_042 == True','VA','attestation of the full Negativliste (sec1). CODE-COLLISION (CR-042 reused on A222-22).'),
 @('01','CR-043','block',$true,'6.1','attest_a222_01_cr_043 == True','VA','Wartungsvertrag attest (sec6.1). CODE-COLLISION (CR-043 reused on A222-21).'),
 @('02','CR-001','block',$false,'sec1','EW <= 1000','VC','scope ceiling 1000 EW (sec1). source_quote NULL -> VC.'),
 @('02','CR-002','block',$false,'sec3.1','w_s_d >= 150','VC','min Schmutzwasseranfall 150 l/(E*d) (sec3.1). source_quote NULL -> VC.'),
 @('02','CR-014','block',$false,'3.1','m >= 0.5 AND m <= 1','VA','m range 0,5..1 (sec3.1). F-7 range as gate. Verbatim quote present.'),
 @('02','CR-017','block',$false,'sec4.3.2/3/4/5','TKN_BSB5 <= 0.25','VC','PHANTOM-FIELD: TKN_BSB5 is not defined as a settable field on A222-02 (nor anywhere) -> gate references a non-owned/absent symbol. See [[dp-a222-phantom-gates]].'),
 @('02','CR-028','warn',$false,'3.2',"IF EW >= 50 THEN bemessung_methodik == 'prognose'",'VA','GREEDY / chained-IF-THEN (warn). Verbatim sec3.2 quote present.'),
 @('03','CR-003','block',$false,'sec4.2','t_Aufenthalt_VB >= 2 AND V_VB_EWspez >= 75','VC','Vorbehandlung min residence 2h + 75 l/E (sec4.2). source_quote NULL -> VC.'),
 @('03','CR-007','warn',$false,'4.3.4','u_L >= 5 AND u_L <= 10','VA','PHANTOM/cross-ws: u_L is an A222-07 field, gate hosted on A222-03. F-7 range. Verbatim quote present. See [[dp-a222-phantom-gates]].'),
 @('03','CR-008','block',$false,'sec4.3.5','V_SB <= 0.5 * V_R','VC','PHANTOM/cross-ws: V_SB is A222-08, V_R is A222-07; neither owned by A222-03. See [[dp-a222-phantom-gates]].'),
 @('03','CR-022','block',$false,'sec4.3.1/sec8',"GK == '1' AND mindestanforderungen_abwv_anh1 == 'ja'",'VC','PHANTOM/cross-ws: GK is A222-01, mindestanforderungen_abwv_anh1 is A222-24. Also NR on AbwV Anh.1 detail -> [[doc-abwv-betrsichv-bundle]].'),
 @('04','CR-004','block',$false,'sec4.3.2','h_TK >= 2','VC','Tropfkoerper min height 2 m (sec4.3.2). source_quote NULL -> VC.'),
 @('06','CR-005','block',$false,'sec4.3.3, Bild 1','d_Scheibe >= 18','VA','disc gap >= 18 mm (sec4.3.3, Bild 1, p.14). Verbatim: min 18 mm.'),
 @('06','CR-015','block',$false,'sec4.3.3','n_RT >= 2','VC','min 2 RBC stages (sec4.3.3). source_quote NULL -> VC.'),
 @('07','CR-006','block',$false,'sec4.3.4','V_FB <= 0.85 * V_R','VC','Festbett <= 85% reactor vol (sec4.3.4). source_quote NULL -> VC.'),
 @('07','CR-030','block',$false,'sec4.3.4','n_FB_Kaskaden >= 2','VC','min 2 Festbett cascades (sec4.3.4). source_quote NULL -> VC.'),
 @('08','CR-031','block',$false,'sec4.3.5',"versuchsbericht_a_sb_spez == 'ja'",'VC','requires test report for A_SB,spez (sec4.3.5). source_quote NULL -> VC.'),
 @('08','CR-032','block',$false,'sec4.3.5',"rueckhaltenachweis_aufwuchskoerper == 'ja'",'VC','requires retention proof for carriers (sec4.3.5). source_quote NULL -> VC.'),
 @('09','CR-009','block',$false,'sec4.3.6','(H_W_e - H_W_0) >= 0.40','VC','SBR min drawdown 0,40 m (sec4.3.6). source_quote NULL -> VC.'),
 @('09','CR-016','block',$false,'sec4.3.6, Tab.6','h_max >= 2.3 AND h_max <= 4.2 AND H_W_e >= 1.4 AND H_W_e <= 2.5','VA','Tab.6 bounds (p.16-17): h_max 2,3-4,2; H_W,e 1,4-2,5 (unterer Geltungsbereich m=1). F-7 range gate. PDF-confirmed.'),
 @('10','CR-011','block',$false,'sec4.4.1','RV >= 1','VC','PHANTOM/cross-ws: RV is an A222-14 field, gate on A222-10. CODE-COLLISION (CR-011 also on A222-14). See [[dp-a222-phantom-gates]].'),
 @('10','CR-012','block',$false,'sec4.4.3','t_NB >= 2.5','VC','PHANTOM/cross-ws: t_NB is A222-14, gate on A222-10. CODE-COLLISION (CR-012 also on A222-14).'),
 @('10','CR-018','block',$false,'sec4.3.7, Tab.7','TS_BB <= 4.9','VC','max TS 4,9 kg/m3 (sec4.3.7, Tab.7). source_quote NULL -> VC.'),
 @('10','CR-019','block',$false,'sec4.3.7','C_O >= 2','VC','min O2 concentration 2 mg/l (sec4.3.7). source_quote NULL -> VC.'),
 @('11','CR-013','block',$false,'sec4.5','V_speicher_EWspez >= 100','VC','sludge storage >= 100 l/E (sec4.5). CODE-COLLISION (CR-013 also on A222-16).'),
 @('11','CR-020','block',$false,'5.3','A_TK_spez >= 90 AND A_TK_spez <= 150','VA','fill-element specific surface 90..150 m2/m3 (sec5.3). F-7 range. Verbatim quote present. PHANTOM: A_TK_spez is an A222-04 field. CODE-COLLISION (also A222-16).'),
 @('11','CR-021','block',$false,'sec5.1','h_OK >= h_Wasser + 0.30','VC','PHANTOM/cross-ws: h_OK,h_Wasser are A222-18 fields. Freibord 30 cm (sec5.1). CODE-COLLISION (CR-021 also A222-18).'),
 @('11','CR-023','block',$true,'5.1','attest_a222_11_cr_023 == True','VA','sampling at in/out (sec5.1). CODE-COLLISION (CR-023 also A222-16).'),
 @('11','CR-024','block',$true,'5.1','attest_a222_11_cr_024 == True','VA','labelling + hour counters (sec5.1). CODE-COLLISION (CR-024 also A222-24).'),
 @('11','CR-025','block',$true,'5.1','attest_a222_11_cr_025 == True','VA','flood protection (sec5.1); refers Merkblatt DWA-M 103 -> [[doc-dwa-m-103]]. CODE-COLLISION (also A222-16).'),
 @('11','CR-033','warn',$true,'4.3.7','manual','EV','DEAD GATE: condition literal manual -> non-parsing, no reachable fail. Refers DWA-M 209 -> [[doc-dwa-m-209]]. See [[dp-a222-cr033-manual]].'),
 @('11','CR-034','block',$true,'5.1','attest_a222_11_cr_034 == True','VA','flow measurement (sec5.1). CODE-COLLISION (CR-034 also A222-21).'),
 @('11','CR-035','block',$true,'5.1','attest_a222_11_cr_035 == True','VA','failure alarm + power-loss alarm (sec5.1). CODE-COLLISION (CR-035 also A222-21).'),
 @('11','CR-036','block',$true,'5.1','attest_a222_11_cr_036 == True','VA','standsicher/wasserdicht/korrosionsbestaendig (sec5.1). CODE-COLLISION (also A222-16).'),
 @('11','CR-037','block',$true,'5.1','attest_a222_11_cr_037 == True','VA','access protection + Zufahrt (sec5.1). CODE-COLLISION (also A222-16).'),
 @('11','CR-038','block',$true,'5.1','attest_a222_11_cr_038 == True','VA','explosion protection + separation (sec5.1). CODE-COLLISION (also A222-16).'),
 @('11','CR-039','block',$true,'5.1','attest_a222_11_cr_039 == True','VA','Oberkante 30 cm ueber Betriebswasserstand (sec5.1). CODE-COLLISION (CR-039 also A222-20).'),
 @('11','CR-040','block',$true,'6.1','attest_a222_11_cr_040 == True','VA','Betriebstagebuch (sec6.1). CODE-COLLISION (CR-040 also A222-20).'),
 @('12','CR-010','block',$false,'sec4.3.7','t_D / t_T <= 0.35','VC','denitrification time ratio <= 0,35 (sec4.3.7). source_quote NULL -> VC.'),
 @('14','CR-011','block',$false,'sec4.4.1','RV >= 1','VC','RV >= 1 (sec4.4.1). CODE-COLLISION (CR-011 also A222-10). Owned correctly here (RV is A222-14).'),
 @('14','CR-012','block',$false,'sec4.4.3','t_NB >= 2.5','VC','t_NB >= 2,5 h (sec4.4.3). CODE-COLLISION (CR-012 also A222-10). Owned correctly here.'),
 @('14','CR-029','block',$false,'sec4.3.2','RV >= 1','VC','duplicate RV>=1 with WRONG clause ref (sec4.3.2 is Tropfkoerper, not Nachklaerung). Semantic-mismatch finding.'),
 @('16','CR-013','block',$false,'sec4.5','V_speicher_EWspez >= 100','VC','sludge storage >= 100 l/E (sec4.5). CODE-COLLISION (also A222-11).'),
 @('16','CR-020','block',$false,'5.3','A_TK_spez >= 90 AND A_TK_spez <= 150','VA','fill-element 90..150 m2/m3 (sec5.3). F-7 range. CODE-COLLISION (also A222-11). PHANTOM A_TK_spez.'),
 @('16','CR-023','block',$true,'5.1','attest_a222_16_cr_023 == True','VA','sampling at in/out (sec5.1). CODE-COLLISION (also A222-11).'),
 @('16','CR-025','block',$true,'5.1','attest_a222_16_cr_025 == True','VA','flood protection (sec5.1) -> [[doc-dwa-m-103]]. CODE-COLLISION (also A222-11).'),
 @('16','CR-026','block',$false,'sec5.1','DN >= 150','VC','PHANTOM/cross-ws: DN is A222-18. min pipe DN150 (sec5.1). CODE-COLLISION (CR-026 also A222-18).'),
 @('16','CR-033','warn',$true,'4.3.7',"garantiewerte_dokumentiert == 'ja' AND verifikation_inbetriebnahme == 'ja'",'VC','O2 guarantee values (sec4.3.7) -> [[doc-dwa-m-209]]. CODE-COLLISION with the DEAD manual gate CR-033 on A222-11 (here it is a real 2-field condition).'),
 @('16','CR-036','block',$false,'sec5.1',"stoermeldung_vorhanden == 'ja' AND stromausfallmeldung_netzunabhaengig == 'ja'",'VC','PHANTOM/cross-ws: stoermeldung_vorhanden is A222-21, stromausfallmeldung_netzunabhaengig is A222-18. CODE-COLLISION (CR-036 also A222-11 as attest).'),
 @('16','CR-037','block',$true,'5.1','attest_a222_16_cr_037 == True','VA','access protection (sec5.1). CODE-COLLISION (also A222-11).'),
 @('16','CR-038','block',$true,'5.1','attest_a222_16_cr_038 == True','VA','explosion protection (sec5.1). CODE-COLLISION (also A222-11).'),
 @('18','CR-021','block',$false,'sec5.1','h_OK_freibord >= 0.30','VC','Freibord >= 0,30 m (sec5.1). CODE-COLLISION (CR-021 also A222-11). Owned correctly here.'),
 @('18','CR-026','block',$false,'sec5.1','DN >= 150','VC','min pipe DN150 (sec5.1). CODE-COLLISION (also A222-16). Owned correctly here.'),
 @('20','CR-039','block',$false,'sec5.7',"sbr_steuerung_variation_zykluszeiten == 'ja'",'VC','SBR cycle-time variability (sec5.7). CODE-COLLISION (CR-039 also A222-11).'),
 @('20','CR-040','block',$false,'sec5.7',"doppelfuellstandsmessung_vorhanden == 'ja'",'VC','dual level measurement (sec5.7). CODE-COLLISION (CR-040 also A222-11).'),
 @('21','CR-034','block',$false,'sec5.1',"betriebsstundenzaehler_installiert == 'ja'",'VC','hour counter (sec5.1). CODE-COLLISION (CR-034 also A222-11 as attest).'),
 @('21','CR-035','block',$false,'sec5.1',"durchflussmessung_vorhanden == 'ja'",'VC','flow measurement (sec5.1). CODE-COLLISION (CR-035 also A222-11 as attest).'),
 @('21','CR-043','block',$true,'6.1','attest_a222_21_cr_043 == True','VA','Wartungsvertrag (sec6.1). CODE-COLLISION (CR-043 also A222-01).'),
 @('22','CR-042','block',$false,'sec6.1',"betriebstagebuch_gefuehrt == 'ja'",'VC','Betriebstagebuch (sec6.1). CODE-COLLISION (CR-042 also A222-01 as attest).'),
 @('24','CR-024','block',$false,'sec6.1',"betrsichv_konformitaet == 'ja'",'VC','BetrSichV conformance (sec6.1) -> [[doc-abwv-betrsichv-bundle]]. CODE-COLLISION (CR-024 also A222-11 as attest). NR on BetrSichV detail.'),
 @('24','CR-041','block',$false,'sec6.1',"betriebsanweisung_dwa_a_199_4 == 'ja'",'VC','operating instruction per DWA-A-199-4 (sec6.1) -> [[doc-dwa-a-199-4]]. CODE-COLLISION (CR-041 also A222-01). NR on A-199-4 detail.')
)
$i = 0
foreach($cr in $crs){
 $ws=$cr[0]; $code=$cr[1]; $sev=$cr[2]; $att=$cr[3]; $clause=$cr[4]; $cond=$cr[5]; $prov=$cr[6]; $finding=$cr[7]
 $i++
 $slug = "cr-a222-$ws-" + ($code.ToLower())
 $dc = if($att){'engineer_input'}else{'standard_fixed'}
 $pgfield = if($prov -eq 'VA'){ switch($ws){'01'{'6'}'02'{'10'}'06'{'14'}'09'{'16'}'11'{'20'}'16'{'20'}'21'{'20'}default{'20'}} }else{''}
 $c = @"
---
title: "A222-$ws $code - compliance gate"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-a-222, node/compliance_requirement, status/active]
status: active
source_document: "DWA-A-222 (Mai 2011, korr. Okt 2018)"
source_page: "$pgfield"
owner_worksheet: A222-$ws
provenance: $prov
provenance_date: 2026-07-24
provenance_build: wave0-triage
data_class: $dc
severity: $sev
requires_attestation: $($att.ToString().ToLower())
ratification_status: unratified
---
# A222-$ws $code

**What it is.** compliance_requirement on **A222-$ws**, severity ``$sev``, clause ``$clause``. Condition (encoded): ``$cond``.

**Provenance basis.** GENERATED from prod ``compliance_requirements`` (code $code, worksheet A222-$ws). $(if($prov -eq 'VA'){'VA - source_quote present in the encoding AND clause page confirmed against the rendered PDF this session.'}elseif($prov -eq 'VC'){'VC - threshold is printed in the standard but the encoding row has source_quote = NULL; page located in PDF, verbatim string not captured this session (SR-3).'}else{'EV/dead - see finding.'})

**Finding.** $finding

### Typed links
- ``gated_by::`` [[section-a222-$ws]]
"@
 W "$slug.md" $c
}
"CRs done: $i"
