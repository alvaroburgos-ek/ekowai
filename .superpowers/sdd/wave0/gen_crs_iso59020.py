# -*- coding: utf-8 -*-
import os
d = r"C:/Users/Ekowai/Obsidian/SecondBrain/01-Projects/ekowai-wizard/reasoning-maps/ISO-59020"
crs = [
("001","01","warn",u"§1, §6.5","system_in_focus IS NOT NULL AND system_level IS NOT NULL","EV","engineer_input","Presence gate on registration fields (both exist ws-01). 2-way AND but both required so low greedy-AND risk. EV (no PDF)."),
("002","01","warn",u"§4.1","circular_economy_principle IS NOT NULL","EV","engineer_input","Presence gate; circular_economy_principle exists but is_required=false, so gate depends on an optional field being filled; mild consistency gap. EV."),
("003","01","warn",u"§4.2","measurement_principle IS NOT NULL","EV","engineer_input","Presence gate; measurement_principle (ws-02) exists+required. EV."),
("004","01","warn",u"§5.1","all_stages_documented == true","EV","engineer_input","Self-attestation boolean (all_stages_documented, ws-02). Verdict-as-producer proxy. EV."),
("005","03","block",u"§4.2.3","all_flows_quantified == true","EV","engineer_input","BLOCK self-attestation boolean. No arithmetic backing. Clause ref §4.2.3 but field clause is §6.3 (ref mismatch). Verdict-as-producer. EV."),
("006","03","block",u"§6.3","resource_balance_applied == true","EV","engineer_input","BLOCK self-attestation boolean. The real 100% balance identities are CR-014/019 on ws-04 (cross-sheet); this gate only checks a bool. Verdict-as-producer. EV."),
("007","03","warn",u"§6.2","circular_goal IS NOT NULL AND system_boundary IS NOT NULL AND data_quality_requirement IS NOT NULL AND interested_parties IS NOT NULL AND internal_or_external_use IS NOT NULL","EV","engineer_input","GREEDY-AND: 5-way presence conjunction. One red masks which of 5 is missing; poor diagnosticity. EV."),
("008","03","warn",u"§6.4.2","manual","EV","engineer_input","DEAD GATE: condition literally 'manual' - non-parsing, no fired_by, never auto-fails. EV."),
("009","04","block",u"§5.4","mandatory_core_indicators_included == true","EV","engineer_input","BLOCK self-attestation boolean; real coverage not computed from selected_core_indicator. Verdict-as-producer. Clause §5.4 vs field clause §7.3 mismatch. EV."),
("010","04","warn",u"§7.3.1","manual","EV","engineer_input","DEAD GATE: condition 'manual' - non-parsing, no fired_by. EV."),
("011","04","block",u"§A.2.2","pct_REUI_X == (mREUI_X / mTI_X) * 100","EV","derived","CROSS-SHEET (symbols on ws-05) + float== verdict-as-producer + mirrors eq A.1. Dead-gate risk on ws-04. See dp."),
("012","04","block",u"§A.2.3","pct_RECI_X == (mRECI_X / mTI_X) * 100","EV","derived","CROSS-SHEET (ws-05) + float== + mirrors A.2. Dead-gate risk. See dp."),
("013","04","block",u"§A.2.4","pct_RENI_X == (mRENI_X / mTI_X) * 100","EV","derived","CROSS-SHEET (ws-05) + float== + mirrors A.3. Dead-gate risk. See dp."),
("014","04","block",u"§A.2.1","pct_REUI_X + pct_RECI_X + pct_RENI_X + pct_linear_inflow == 100","EV","derived","CROSS-SHEET (ws-05) + balance folded into one float== sum-to-100. Dead-gate risk. See dp."),
("015","04","block",u"§A.3.3","pct_REUO_X == (mREUO_X / mTO_X) * 100","EV","derived","CROSS-SHEET (ws-06) + float== + mirrors A.5. Dead-gate risk. See dp."),
("016","04","block",u"§A.3.4","pct_RECO_X == (mRECO_X / mTO_X) * 100","EV","derived","CROSS-SHEET (ws-06) + float== + mirrors A.6. Dead-gate risk. See dp."),
("017","04","block",u"§A.3.5","pct_RENO_X == (mRENO_X / mTO_X) * 100","EV","derived","CROSS-SHEET (ws-06) + float== + mirrors A.7. Dead-gate risk. See dp."),
("018","04","block",u"§A.3.1","pct_REUO_X IS NOT NULL AND pct_RECO_X IS NOT NULL AND pct_RENO_X IS NOT NULL","EV","derived","CROSS-SHEET (ws-06) presence GREEDY-AND (3-way) on derived outputs. Dead-gate risk. See dp."),
("019","04","block",u"§A.3.1","pct_REUO_X + pct_RECO_X + pct_RENO_X + pct_linear_outflow == 100","EV","derived","CROSS-SHEET (ws-06) + balance-folded float== sum-to-100. Clause §A.3.1 duplicated with CR-018. Dead-gate risk. See dp."),
("020","04","warn",u"§A.4.2","pct_ECONRE_X == ((EIRENE_X - EORENE_X) / (EITE_X - EOTE_X)) * 100","EV","derived","CROSS-SHEET (ws-07) + float== + mirrors A.8 (denominator div-by-zero risk). Dead-gate risk. See dp."),
("021","04","warn",u"§A.5.2","pct_CWW == (VCIW / VAIW) * 100","EV","derived","CROSS-SHEET (ws-07) + float== + mirrors A.9. Dead-gate risk. See dp."),
("022","04","warn",u"§A.5.3","pct_CDW == (VCDW / VAIW) * 100","EV","derived","CROSS-SHEET (ws-07) + float== + mirrors A.10. Dead-gate risk. See dp."),
("023","04","warn",u"§A.5.4","RWRR == VTWU / VTWW","EV","derived","CROSS-SHEET (ws-07) + float== + mirrors A.11. Dead-gate risk. See dp."),
("024","04","warn",u"§A.6.2","RMP == C / D","EV","derived","CROSS-SHEET (ws-07) + float== + mirrors A.12 (opaque C/D symbols). Dead-gate risk. See dp."),
("025","04","warn",u"§A.6.3","IRII == E / F","EV","derived","CROSS-SHEET (ws-07) + float== + mirrors A.13 (opaque E/F symbols). Dead-gate risk. See dp."),
("026","08","warn",u"§7.6.1.2","system_breakdown_done == true","EV","engineer_input","Self-attestation boolean (ws-08). Verdict-as-producer proxy. EV."),
("027","08","warn",u"§7.6.1.5","data_normalized == true AND data_completeness_checked == true","EV","engineer_input","GREEDY-AND (2-way) over two attestation booleans; clause §7.6.1.5 but data_completeness_checked field clause is §7.6.1.6 (mixed refs). EV."),
("028","08","warn",u"§7.6.2","primary_data_preference == true AND data_traceability == true","EV","engineer_input","GREEDY-AND (2-way) attestation booleans. EV."),
("029","08","warn",u"§3.3.16","data_traceability == true","EV","engineer_input","Self-attestation boolean; duplicates the data_traceability term already in CR-028. Redundant gate. EV."),
("030","08","warn",u"§7.7","documentation_complete == true","EV","engineer_input","Self-attestation boolean. Verdict-as-producer. EV."),
("031","09","block",u"§8.1","criteria_review_done == true","EV","engineer_input","BLOCK self-attestation boolean (ws-09); only Stage-3 block gate; asserts a bool, no computed backing. Verdict-as-producer. EV."),
("032","09","warn",u"§8.4","value_impact_assessed == true","EV","engineer_input","Self-attestation boolean. EV."),
("033","09","warn",u"§8.5","interested_parties_consulted == true","EV","engineer_input","Self-attestation boolean. EV."),
("034","09","warn",u"§8.6.1","report_transparency == true","EV","engineer_input","Self-attestation boolean. EV."),
("035","09","warn",u"§8.6.2","information_verifiable == true","EV","engineer_input","Self-attestation boolean. EV."),
("036","09","warn",u"§8.6.4","manual","EV","engineer_input","DEAD GATE: condition 'manual' - non-parsing, no fired_by. hazardous_substances_reported field exists but is NOT referenced by the condition (field orphaned from its gate). EV."),
("037","09","warn",u"§8.4.6","manual","EV","engineer_input","DEAD GATE: condition 'manual' - non-parsing, no fired_by. EV."),
]
wsmap={"01":"section-iso59020-01","02":"section-iso59020-02","03":"section-iso59020-03","04":"section-iso59020-04","05":"section-iso59020-05","06":"section-iso59020-06","07":"section-iso59020-07","08":"section-iso59020-08","09":"section-iso59020-09"}
titlemap={"01":"Registration & Scope","02":"Principles & Framework","03":"Boundary Setting","04":"Indicator Selection","05":"Resource Inflow","06":"Resource Outflow","07":"Energy/Water/Economic","08":"Data Acquisition","09":"Assessment & Reporting"}
for code,ws,sev,clause,cond,prov,dc,finding in crs:
    sec=wsmap[ws]
    extra=""
    if 11 <= int(code) <= 25:
        extra="\n- `references:: [[dp-iso59020-crosssheet-eqmirror-gates]]`"
    body=u"""---
title: "ISO-59020 CR-{code} - gate on ISO-59020-{ws} (CR)"
created: 2026-07-24
tags: [type/reasoning-map, std/iso-59020, node/compliance_requirement, status/active]
status: active
source_document: ISO 59020:2024 (First edition 2024-05)
source_page:
owner_worksheet: ISO-59020-{ws}
provenance: {prov}
provenance_date: 2026-07-24
provenance_build:
data_class: {dc}
severity: {sev}
requires_attestation: false
ratification_status: unratified
---
# ISO-59020 CR-{code} - gate on ISO-59020-{ws} ({title})

**What it is.** compliance_requirement on **ISO-59020-{ws}**, severity `{sev}`, clause `{clause}`. Condition (encoded): `{cond}`

**Provenance basis (SR-3 - PDF MISSING).** GENERATED from prod `compliance_requirements` (code CR-{code}, source_quote NULL). No PDF -> clause/threshold unverifiable, caps **{prov}**. **Finding:** {finding}

### Typed links
- `gated_by:: [[{sec}]]`
- `references:: [[doc-iso-59020-pdf-missing]]`{extra}
""".format(code=code,ws=ws,sev=sev,clause=clause,cond=cond,prov=prov,dc=dc,title=titlemap[ws],finding=finding,sec=sec,extra=extra)
    with open(os.path.join(d,"cr-iso59020-{}.md".format(code)),"w",encoding="utf-8") as f:
        f.write(body)
print("wrote",len(crs),"CR files")
