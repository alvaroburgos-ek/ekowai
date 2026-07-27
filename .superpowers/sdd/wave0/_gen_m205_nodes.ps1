$dir = "C:\Users\Ekowai\Obsidian\SecondBrain\01-Projects\ekowai-wizard\reasoning-maps\DWA-M-205"
function W($name, $content) { Set-Content -Path (Join-Path $dir $name) -Value $content -Encoding utf8 }

# ---------- SECTIONS (26) ----------
$sections = @(
 @('01','Projektregistrierung und Anlagenkontext','registration','§1'),
 @('02','Anwendungsbereich und Begriffe','registration','§2'),
 @('03','Anforderungsanalyse — Grundsaetzliches (Behandlungsziel)','data_collection','§3.1'),
 @('04','EG-Badegewaesserrichtlinie','data_collection','§3.2'),
 @('05','Bewaesserung mit gereinigtem Abwasser','data_collection','§3.3'),
 @('06','Trinkwassergewinnung aus Oberflaechengewaessern','data_collection','§3.4'),
 @('07','Brauchwassernutzung und Arbeitsschutz (BioStoffV)','data_collection','§3.5'),
 @('08','Zulaufcharakterisierung Klaeranlagenablauf','data_collection','§4.1.2.2'),
 @('09','Verfahrensauswahl Desinfektion','calculation','§5'),
 @('10','UV-Bestrahlung — Bemessung und Auslegung','calculation','§4.1'),
 @('11','UV-Bestrahlung — Bau und Anlagentechnik','calculation','§4.1.3'),
 @('12','UV-Bestrahlung — Betrieb, Reinigung, Strahleraustausch, Arbeitsschutz','data_collection','§4.1.4'),
 @('13','UV-Bestrahlung — Kosten','calculation','§4.1.5'),
 @('14','Membranverfahren — Bemessung und Auslegung','calculation','§4.2.3'),
 @('15','Membranverfahren — Planung, Betrieb, Kosten','data_collection','§4.2'),
 @('16','Ozonung — Allgemeines und Funktionsprinzip','data_collection','§4.3.1'),
 @('17','Ozonung — Bemessung und Anlagentechnik','calculation','§4.3.3'),
 @('18','Ozonung — Restozonentfernung (thermisch/katalytisch)','calculation','§4.3.3.4'),
 @('19','Ozonung — Energieeinsatz und Kosten','calculation','§4.3.3.2'),
 @('20','Ozonung — Oxidationsnebenprodukte','verification','§4.3.6'),
 @('21','Chlorung — Bemessung und Betrieb','calculation','§4.4.2'),
 @('22','Peressigsaeure (PES) — Bemessung und BGV-Sicherheit','calculation','§4.4.3'),
 @('23','Wasserstoffperoxid (H2O2) — Bemessung','calculation','§4.4'),
 @('24','Wartung, Eigenueberwachung und Betrieb','data_collection','§4.1.4'),
 @('25','Konformitaetspruefung mikrobiologische Zielwerte','verification','§3.2'),
 @('26','Ergebniszusammenfassung, Kosten und Freigabe','summary','§5')
)
foreach ($s in $sections) {
  $n=$s[0]; $t=$s[1]; $arch=$s[2]; $cl=$s[3]
  $c = @"
---
title: "M205-$n — $t (section)"
created: 2026-07-24
tags: [type/reasoning-map, std/dwa-m-205, node/section, status/active]
status: active
source_document: "Merkblatt DWA-M 205 (Maerz 2013)"
source_page: ""
owner_worksheet: M205-$n
provenance: EV
provenance_date: 2026-07-24
provenance_build: ""
data_class: engineer_input
severity: none
archetype: $arch
ratification_status: unratified
---
# M205-$n — $t

**What it is.** Worksheet **M205-$n** (archetype ``$arch``), clause $cl. Section-level container node for the fields/equations/CRs the encoding attaches to this worksheet.

**Provenance basis.** GENERATED from prod ``worksheet_templates`` (order_index-ordered) + ``fields``/``worksheet_sections`` grouped by ``worksheet_template_id``. No section-level scalar to assert VA against → EV. Data-class engineer_input (data-collection container).

**Finding note.** ``worksheet_sections`` count (234) is ~1:1 with ``fields`` (237) across the standard — sections appear auto-emitted one-per-field (Pass3c artifact), not authored subsection structure. Flagged for the encoder, not fixed here.

### Typed links
- section container for worksheet M205-$n (see ``_index`` for the gate/equation nodes homed here)
"@
  W "section-m205-$n.md" $c
}
"sections done"
