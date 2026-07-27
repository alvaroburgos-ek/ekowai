$root = "C:\Users\Ekowai\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-A-222"
function W($name,$content){ Set-Content -Path (Join-Path $root $name) -Value $content -Encoding utf8 }

# ---------- SECTIONS (25) ----------
$secs = @(
 @('01','Projektregistrierung und Anwendungsbereich',1,'registration',6,'VA','standard_fixed','Scope + Negativliste (sec1). Gates CR-027/041/042/043.'),
 @('02','Bemessungswerte Schmutzwasser und BSB5',2,'data_collection',10,'VA','normative-as-input-reference','Q_bem/EW eqs Gl.1-7 (sec3.1/sec3.2). Feeds every downstream sizing sheet.'),
 @('03','Vorbehandlung Absetzeinrichtung',3,'calculation',12,'VA','standard_fixed','Vorbehandlung sec4.2. Hosts cross-ws gates CR-007/008/022 (phantom).'),
 @('04','Tropfkoerperbemessung Mindestanforderungen',3,'calculation',13,'VA','derived','V_TK/A_TK Gl.8/9 sec4.3.2 + Tab.2.'),
 @('05','Tropfkoerperbemessung Nitrifikation',3,'calculation',13,'VC','engineer_input','Nitrifikation Tropfkoerper - no own equation row (narrative sec4.3.2).'),
 @('06','Rotationstauchkoerper RBC',3,'calculation',14,'VA','derived','A_RT Gl.10 sec4.3.3 + Tab.3 + Bild 1 (d_Scheibe>=18mm).'),
 @('07','Festbettbemessung getauchtes Festbett',3,'calculation',14,'VA','derived','V_FB/Q_L Gl.11/12 sec4.3.4 + Tab.4.'),
 @('08','MBBR frei bewegliche Aufwuchskoerper',3,'calculation',15,'VA','derived','A_SB/V_SB Gl.13/14 sec4.3.5 + Tab.5.'),
 @('09','SBR Bemessung',3,'calculation',16,'VA','derived','V_SBR/V_Sp Gl.15/16 sec4.3.6 + Tab.6.'),
 @('10','Belebungsbecken haeuslich',3,'calculation',18,'VA','derived','V_BB/aOC/Q_L,St Gl.17/18/19/21 sec4.3.7 + Tab.7.'),
 @('11','Belebungsbecken gewerblich',3,'calculation',18,'VC','engineer_input','Gewerblich variant - hosts 15 sec5.1 attest gates + phantom h_OK/DN/A_TK,spez.'),
 @('12','Denitrifikation Belebungsanlagen',3,'calculation',18,'VA','derived','t_T Gl.20 sec4.3.7 + t_D/t_T<=0,35 gate (CR-010).'),
 @('13','Kombinationsanlagen',3,'calculation',18,'VC','engineer_input','sec4.3.8 Kombinationsanlagen (split-EW addition). No own eq/CR rows.'),
 @('14','Nachklaerbecken Bemessung',4,'calculation',19,'VA','derived','A_NB,theo/h_ges/h_t/h_e/r_NB Gl.22-26 sec4.4.2; A_NB/V_NB Gl.27/28 sec4.4.3.'),
 @('15','Nachklaerbecken Bauformen',4,'calculation',20,'VC','engineer_input','Bild 3/4 Bauformen. No own eq/CR rows.'),
 @('16','Schlammspeicher',5,'calculation',18,'VC','standard_range','V_speicher,EWspez>=100 (CR-013 sec4.5) + duplicated sec5.1 attests; A_TK,spez 90..150 gate.'),
 @('17','Notueberlauf',5,'calculation',20,'EV','engineer_input','Notueberlauf - no own eq/CR rows.'),
 @('18','Bauausfuehrung Allgemein',5,'verification',20,'VC','standard_fixed','Freibord h_OK>=0,30 (CR-021 sec5.1) + DN>=150 (CR-026 sec5.1).'),
 @('19','Pumpen und Rohrleitungen',5,'verification',20,'EV','engineer_input','Pumpen/Rohrleitungen - no own CR rows.'),
 @('20','SBR Klarwasserabzug',5,'verification',16,'VC','engineer_input','SBR Klarwasserabzug sec5.7 (CR-039/040).'),
 @('21','Betriebskontrolle',6,'verification',20,'VC','standard_fixed','sec5.1 Betriebsstundenzaehler/Durchflussmessung (CR-034/035) + Wartungsvertrag (CR-043).'),
 @('22','Eigenueberwachung Schlamm',6,'verification',21,'VC','standard_fixed','sec6.1 Betriebstagebuch (CR-042).'),
 @('23','Wartung',6,'verification',21,'EV','engineer_input','Wartung sec6 - no own CR rows.'),
 @('24','Dokumentation Pflicht-Anhaenge',5,'verification',21,'VC','standard_fixed','AbwV Anh.1 / BetrSichV / DWA-A-199-4 conformance (CR-024/041).'),
 @('25','Ergebniszusammenfassung Gesamt',5,'summary',21,'EV','derived','Result roll-up sheet. No own eq/CR rows.')
)
foreach($s in $secs){
 $ws=$s[0]; $title=$s[1]; $phase=$s[2]; $arch=$s[3]; $pg=$s[4]; $prov=$s[5]; $dc=$s[6]; $note=$s[7]
 $pgfield = if($prov -eq 'EV'){''}else{"$pg"}
 $basis = if($prov -eq 'VA'){'VA - the printed section anchor is confirmed against the rendered PDF this session.'}elseif($prov -eq 'VC'){'VC - the gate thresholds are printed but the encoding did not capture the verbatim quote this session (held at VC per SR-3).'}else{'EV - data-collection/roll-up sheet with no printed scalar to assert VA against.'}
 $c = @"
---
title: "A222-$ws - $title (section)"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-a-222, node/section, status/active]
status: active
source_document: "DWA-A-222 (Mai 2011, korr. Okt 2018)"
source_page: "$pgfield"
owner_worksheet: A222-$ws
provenance: $prov
provenance_date: 2026-07-24
provenance_build: wave0-triage
data_class: $dc
severity: none
ratification_status: unratified
---
# A222-$ws - $title

**What it is.** Worksheet **A222-$ws** (Phase $phase, archetype ``$arch``). $note

**Provenance basis.** GENERATED from prod ``worksheet_templates`` (standard 891ab6f3-..., code A222-$ws) + its fields/equations/compliance_requirements rows. Page convention = PRINTED footer (printed = physical minus 1, see [[_index]]). $basis

### Typed links
- see the per-worksheet CR/equation nodes listed in [[_index]]
"@
 W "section-a222-$ws.md" $c
}

# ---------- EQUATIONS (29) ----------
$eqs = @(
 @('02','Gl.1','Q_bem','Q_bem = Q_Tr_h_max = (1 + m) * EZ / 192',10,'Verbatim sec3.1 Gl.(1): Q_bem = Q_Tr,h,max = (1 + m) * EZ/192; m = 0,5 bis 1.','m,EZ',''),
 @('02','Gl.2','Q_bem','Q_bem = Q_Tr_h_max = EZ/192 + (q_F + q_R_Tr) * A_E_k',10,'Verbatim sec3.1 Gl.(2): Q_bem = Q_Tr,h,max = EZ/192 + (q_F + q_R,Tr) * A_E,k (l/s).','EZ,q_F,q_R_Tr,A_E_k',''),
 @('02','Gl.3','Q_S_h_max','Q_S_h_max = EZ * w_s_d * 24 / (86400 * x_Qmax)',10,'Verbatim sec3.1 Gl.(3): EZ/192 = EZ * (w_s,d * 24)/(86.400 * x_Qmax) = Q_S,h,max (l/s).','EZ,w_s_d,x_Qmax',''),
 @('02','Gl.4','Q_bem','Q_bem = f_S_QM * Q_S_aM + Q_F',10,'Verbatim sec3.1 Gl.(4): Q_bem = f_S,QM * Q_S,aM + Q_F (l/s); f_S,QM = 6..9 nach ATV-DVWK-A 198.','f_S_QM,Q_S_aM,Q_F','NR: f_S,QM=6..9 defers to ATV-DVWK-A 198.'),
 @('02','Gl.5','Q_S_aM','Q_S_aM = EZ * w_s_d / 86400',10,'Verbatim sec3.1 Gl.(5): Q_S,aM = EZ * w_s,d / 86.400 (l/s).','EZ,w_s_d',''),
 @('02','Gl.6','Q_F','Q_F = q_F * A_E_k',10,'Verbatim sec3.1 Gl.(6): Q_F = q_F * A_E,k (l/s); q_F = 0,05..0,15 l/(s*ha).','q_F,A_E_k','NR: q_F=0,05..0,15 defers to ATV-DVWK-A 198.'),
 @('02','Gl.7','EW','EW = B_d_BSB_ZB / b_xxx_85 * 1000',11,'Verbatim sec3.2 Gl.(7): EW_xxx = B_d,xxx,ZB / b_xxx,85 * 1000 (E); xxx = BSB5 oder CSB.','B_d_BSB_ZB,b_xxx_85','b_xxx,85 read from Tab.1 (printed p.11, nach ATV-DVWK-A 198).'),
 @('04','Gl.8','V_TK','V_TK = EW * V_TK_EWspez / 1000',13,'Verbatim sec4.3.2 Gl.(8): V_TK = (EW * V_TK,EWspez)/1.000 (m3).','EW,V_TK_EWspez','V_TK,EWspez from Tab.2 (range).'),
 @('04','Gl.9','A_TK','A_TK = V_TK / h_TK',13,'Verbatim sec4.3.2 Gl.(9): A_TK = V_TK / h_TK (m2).','V_TK,h_TK',''),
 @('06','Gl.10','A_RT','A_RT = EW * A_RT_EWspez',14,'Verbatim sec4.3.3 Gl.(10): A_RT = EW * A_RT,EWspez (m2).','EW,A_RT_EWspez','A_RT,EWspez from Tab.3 (range).'),
 @('07','Gl.11','V_FB','V_FB = EW * V_FB_EWspez / 1000',14,'Verbatim sec4.3.4 Gl.(11): V_FB = (EW * V_FB,EWspez)/1.000 (m3).','EW,V_FB_EWspez','V_FB,EWspez from Tab.4 (range).'),
 @('07','Gl.12','Q_L','Q_L = u_L * A_R_FB',14,'Verbatim sec4.3.4 Gl.(12): Q_L = u_L * A_R,FB (Nm3/h); 5 m/h <= u_L <= 10 m/h.','u_L,A_R_FB','inequality-fed: u_L is a range (5..10), gate CR-007 reads it.'),
 @('08','Gl.13','A_SB','A_SB = EW * A_SB_EWspez',15,'Verbatim sec4.3.5 Gl.(13): A_SB = EW * A_SB,EWspez (m2).','EW,A_SB_EWspez','A_SB,EWspez from Tab.5 (range).'),
 @('08','Gl.14','V_SB','V_SB = A_SB / A_SB_spez',15,'Verbatim sec4.3.5 Gl.(14): V_SB = A_SB / A_SB,spez (m3).','A_SB,A_SB_spez',''),
 @('09','Gl.15','V_SBR','V_SBR = EW * V_SBR_EWspez / 1000',16,'Verbatim sec4.3.6 Gl.(15): V_SBR = (EW * V_SBR,EWspez)/1.000 (m3).','EW,V_SBR_EWspez','V_SBR,EWspez from Tab.6 (range); sec4.3.6 defers SBR to DWA-M 210.'),
 @('09','Gl.16','V_Sp','V_Sp = integral(0..t, Q_bem dt) <= Q_d ; t = t_z/n - t_F',16,'Verbatim sec4.3.6 Gl.(16): V_Sp = integral_0^t Q_bem dt und <= Q_d (m3) mit t = t_z/n - t_F.','Q_bem,t_z,n,t_F,Q_d','inequality-as-producer: output declared V_Sp but the row is a <= constraint.'),
 @('10','Gl.17','V_BB','V_BB = EW * V_BB_EWspez / 1000',18,'Verbatim sec4.3.7 Gl.(17): V_BB = (EW * V_BB,EWspez)/1.000 (m3) bei Bemessungsschlammalter 25 Tage.','EW,V_BB_EWspez','V_BB,EWspez from Tab.7 (range).'),
 @('10','Gl.18','aOC','aOC = 0.1 * B_d_BSB_ZB',18,'Verbatim sec4.3.7 Gl.(18): aOC = 0,1 * B_d,BSB,ZB (kg/h).','B_d_BSB_ZB','O2-transfer chain defers to ATV-DVWK-A 131.'),
 @('10','Gl.19','aOC','aOC = 0.1 * B_d_BSB_ZB * 1/(1 - t_D/(t_D + t_N))',18,'Verbatim sec4.3.7 Gl.(19): aOC = 0,1 * B_d,BSB,ZB * 1/(1 - t_D/(t_D + t_N)) (kg/h).','B_d_BSB_ZB,t_D,t_N','duplicate output_symbol aOC (Gl.18 also emits aOC) -> single-source contention.'),
 @('12','Gl.20','t_T','t_T = t_D + t_N',18,'Verbatim sec4.3.7 Gl.(20): t_T = t_D + t_N (h).','t_D,t_N',''),
 @('10','Gl.21','Q_L_St','Q_L_St = aOC / (alphaOC_L_h * h_E) * t_T / t_N',18,'Verbatim sec4.3.7 Gl.(21): Q_L,St = aOC / (aOC_L,h * h_E) * t_T / t_N (m3/h).','aOC,alphaOC_L_h,h_E,t_T,t_N','reads t_T from A222-12 (cross-ws input).'),
 @('14','Gl.22','A_NB_theo','A_NB_theo >= Q_bem * (1 + RV) / 2.2',19,'Verbatim sec4.4.2 Gl.(22): A_NB,theo >= Q_bem * (1 + RV) / 2,2 (m2).','Q_bem,RV','inequality-as-producer: output A_NB,theo is the LHS of a >= constraint.'),
 @('14','Gl.23','h_ges','h_ges = (A_NB_theo * 18)^(1/3)',19,'Verbatim sec4.4.2 Gl.(23): h_ges = cube-root(A_NB,theo * 18) (m) nicht dimensionsecht.','A_NB_theo','non-dimension-true empirical formula (standard flags it).'),
 @('14','Gl.24','h_t','h_t = h_ges - h_z',19,'Verbatim sec4.4.2 Gl.(24): h_t = h_ges - h_z (m).','h_ges,h_z',''),
 @('14','Gl.25','h_e','h_e = h_ges * 0.3',19,'Verbatim sec4.4.2 Gl.(25): h_e ~= h_ges * 0,3 (m).','h_ges',''),
 @('14','Gl.26','r_NB','r_NB = (h_ges - h_z) / 1.7',19,'Verbatim sec4.4.2 Gl.(26): r_NB = (h_ges - h_z) / 1,7 (m).','h_ges,h_z',''),
 @('14','Gl.27','A_NB','A_NB >= Q_bem * (1 + RV) / 2.8',20,'Verbatim sec4.4.3 Gl.(27): A_NB >= Q_bem * (1 + RV) / 2,8 (m2).','Q_bem,RV','inequality-as-producer: output A_NB is the LHS of a >= constraint.'),
 @('14','Gl.28','V_NB','V_NB = Q_bem * (1 + RV) * t_NB',20,'Verbatim sec4.4.3 Gl.(28): V_NB = Q_bem * (1 + RV) * t_NB (m3).','Q_bem,RV,t_NB','')
)
foreach($e in $eqs){
 $ws=$e[0]; $gl=$e[1]; $out=$e[2]; $f=$e[3]; $pg=$e[4]; $q=$e[5]; $req=$e[6]; $flag=$e[7]
 $glslug = ($gl -replace '\.','' -replace '\s','').ToLower()
 $reqlinks = ($req -split ',' | ForEach-Object { "- ``requires::`` [[field-$($_.Trim())]] ($($_.Trim()))" }) -join "`n"
 $flagline = if($flag){"`n**Finding.** $flag`n"}else{''}
 $c = @"
---
title: "A222-$ws $gl - $out (equation)"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-a-222, node/equation, status/active]
status: active
source_document: "DWA-A-222 (Mai 2011, korr. Okt 2018)"
source_page: "$pg"
owner_worksheet: A222-$ws
provenance: VA
provenance_date: 2026-07-24
provenance_build: wave0-triage
data_class: derived
severity: none
ratification_status: unratified
---
# A222-$ws $gl - $out

**What it is.** Equation **$gl**, output symbol ``$out``. Formula (encoded): ``$f``.

**Provenance basis.** GENERATED from prod ``equations`` row ($gl, A222-$ws). ``verification_status = needs_engineer_review`` in the encoding, but the row carries a verbatim source_quote AND the printed page is confirmed against the rendered PDF this session -> **VA**. Page convention = PRINTED footer (printed = physical minus 1).

**Verbatim source (VA).**
> $q
$flagline
### Typed links
- ``produces::`` [[field-$out]] ($out)
$reqlinks
"@
 W "eq-a222-$ws-$glslug.md" $c
}

# ---------- TABLES (7) ----------
$tabs = @(
 @('01','bwerte','Tab.1 - Einwohnerspezifische Frachten b_xxx,85',11,'Roh- und nach-Vorklaerung BSB5/CSB Frachten, an 85% der Tage unterschritten (nach ATV-DVWK-A 198). Feeds EW Gl.7.','normative-as-input-reference'),
 @('02','vtk','Tab.2 - Interpolationsbereich V_TK,EWspez',13,'Range table for V_TK,EWspez by EW/Nitrifikation. Feeds Gl.8.','standard_range'),
 @('03','art','Tab.3 - Interpolationsbereich A_RT,EWspez',14,'Range table for A_RT,EWspez. Feeds Gl.10.','standard_range'),
 @('04','vfb','Tab.4 - Interpolationsbereich V_FB,EWspez',14,'Range table for V_FB,EWspez. Feeds Gl.11.','standard_range'),
 @('05','asb','Tab.5 - Interpolationsbereich A_SB,EWspez',15,'Range table for A_SB,EWspez. Feeds Gl.13.','standard_range'),
 @('06','sbr','Tab.6 - Interpolationsbereich V_SBR,EWspez',16,'Range table (m=1 unterer / m=0,5 oberer Geltungsbereich): V_SBR,EWspez, TS_SBR, h_max 2,3-4,2, H_W,e 1,4-2,5. Feeds Gl.15 + gate CR-016.','standard_range'),
 @('07','vbb','Tab.7 - Interpolationsbereich V_BB,EWspez',18,'Range table for V_BB,EWspez (25 d Schlammalter). Feeds Gl.17.','standard_range')
)
foreach($t in $tabs){
 $num=$t[0]; $slug=$t[1]; $title=$t[2]; $pg=$t[3]; $desc=$t[4]; $dc=$t[5]
 $extra = if($num -eq '01'){"`n**Finding (NR cap).** The b_xxx,85 loads are printed in DWA-A-222 (VA-in-222) but their derivation is nach ATV-DVWK-A 198 -> deferred detail caps NR. See [[doc-atv-dvwk-a-198]]."}elseif($num -eq '06'){"`n**Verbatim (VA, p.16-17).** Tab.6 unterer Geltungsbereich m=1: h_max 2,3-4,2; H_W,e 1,4-2,5. Matches gate CR-016 bounds."}else{"`n**Finding (F-7).** Range table; the point selection must be surfaced per SR-2 (see [[dp-a222-ranges]])."}
 $c = @"
---
title: "$title (table)"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-a-222, node/table, status/active]
status: active
source_document: "DWA-A-222 (Mai 2011, korr. Okt 2018)"
source_page: "$pg"
owner_worksheet: A222-*
provenance: VA
provenance_date: 2026-07-24
provenance_build: wave0-triage
data_class: $dc
severity: none
ratification_status: unratified
---
# $title

**What it is.** $desc

**Provenance basis.** GENERATED from the rendered DWA-A-222 PDF (Tab. index confirmed on ToC printed p.5; table body on printed p.$pg). Page convention = PRINTED footer (printed = physical minus 1). VA - printed page confirmed this session.
$extra

### Typed links
- ``consumed_by::`` the equation reading this table value (see [[_index]] Equations)
"@
 W "tab-a222-$num-$slug.md" $c
}
"DONE base nodes"
