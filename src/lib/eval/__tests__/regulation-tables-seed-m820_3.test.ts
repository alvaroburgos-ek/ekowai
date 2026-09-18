/**
 * Plan 3 Task 9 — DWA-M-820-3 seed builders: the ten Qualitätselement catalogues
 * (Anhang A.1–A.4, B.1–B.6) carry exactly the printed item counts (asserted with
 * the transcript line ranges), every row's quote is the printed row span (the
 * verifier passes 193/193), every cell sits inside its span (build-time
 * `inSpan`), the key tokens are `n<Nr.>`, the OCR quirks stay verbatim, the
 * A.4 empty-Nr. rows are positional (m820_3-U-1, table `imported_unverified`),
 * and the committed seed migration is byte-pinned by the shared
 * `generated-sql-freshness.test.ts` (via SEED_BUILDERS).
 */
import { describe, it, expect } from 'vitest';
import {
  m8203SeedTables, qeCatalogueAsTable, QE_CATALOGUES, QE_A1_ITEMS, QE_A2_ITEMS, QE_A3_ITEMS, QE_A4_ITEMS, QE_B1_ITEMS, QE_B2_ITEMS, QE_B3_ITEMS, QE_B4_ITEMS, QE_B5_ITEMS, QE_B6_ITEMS,
  norm, M820_3_EDITION, QE_OVERRIDE_QUOTE, Q_L67, Q_L194, Q_L196, Q_L200, Q_L202, Q_L204, Q_L206, Q_L307, Q_L321, Q_L398, Q_L591,
} from '../regulation-tables-seed-m820_3';
import { SEED_BUILDERS, liveSeedSlugs } from '../regulation-tables-seed-index';
import { makeTableLookup, makeTableRows } from '../regulation-tables-fallback';

const by = (code: string) => m8203SeedTables().find((t) => t.table_code === code)!;

describe('DWA-M-820-3 seed builders (Plan 3 Task 9)', () => {
  it('ten catalogue tables with the PRINTED item counts (transcript line ranges in the comments) — 38 + 155 = 193, not the brief\'s 174', () => {
    const counts = Object.fromEntries(m8203SeedTables().map((t) => [t.table_code, t.rows.length]));
    expect(counts).toEqual({
      QE_A1: 15, // L687–L711 (Nr. 1–15, L689–L709)
      QE_A2: 8,  // L715–L726 (Nr. 1–8, L717–L724)
      QE_A3: 12, // L730–L745 (Nr. 1–12, L732–L743)
      QE_A4: 3,  // L750–L760 (Ökonomie L752–L753 · Ökologie "2" L754–L756 · Sozioökonomie L757–L758)
      QE_B1: 15, // L767–L795 (Nr. 1–9 L769–L777, "B. 1 (Ende)" Nr. 10–15 L785–L793)
      QE_B2: 40, // L799–L882 (Grundlagenermittlung 1–13, Vorplanung 14–21, Entwurfsplanung 22–35, Genehmigungsplanung 36–40)
      QE_B3: 50, // L886–L1020 (Ausführungsplanung 1–17, Vorbereiten der Vergabe 18–39, Mitwirken bei der Vergabe 40–50)
      QE_B4: 34, // L1024–L1134 (Nr. 1–34)
      QE_B5: 10, // L1138–L1167 (Nr. 1–5 L1141–L1145, "B. 5 (Ende)" Nr. 6–10 L1155–L1165)
      QE_B6: 6,  // L1172–L1190 (Nr. 1–3 L1174–L1176, "B. 6 (Ende)" Nr. 4–6 L1184–L1189)
    });
    expect(QE_A1_ITEMS.length + QE_A2_ITEMS.length + QE_A3_ITEMS.length + QE_A4_ITEMS.length).toBe(38);
    expect(QE_B1_ITEMS.length + QE_B2_ITEMS.length + QE_B3_ITEMS.length + QE_B4_ITEMS.length + QE_B5_ITEMS.length + QE_B6_ITEMS.length).toBe(155);
    expect(m8203SeedTables().reduce((n, t) => n + t.rows.length, 0)).toBe(193);
    // prod's per-worksheet totals (VR strings read in-session: 15 / 8 / 12 / 3 / 15 / 21 / 19 / 17 / 33 / 34 / 10 / 6) — the B.2 / B.3 splits
    expect(QE_B2_ITEMS.filter((i) => i.nr_num <= 21).length).toBe(21);
    expect(QE_B2_ITEMS.filter((i) => i.nr_num >= 22).length).toBe(19);
    expect(QE_B3_ITEMS.filter((i) => i.nr_num <= 17).length).toBe(17);
    expect(QE_B3_ITEMS.filter((i) => i.nr_num >= 18).length).toBe(33);
  });

  it('table shape: standard / edition / key column nr / three value columns / anhaltswert with the composed L67 + L194 cue / statuses; registered live in SEED_BUILDERS', () => {
    const tables = m8203SeedTables();
    expect(tables.map((t) => t.table_code)).toEqual(['QE_A1', 'QE_A2', 'QE_A3', 'QE_A4', 'QE_B1', 'QE_B2', 'QE_B3', 'QE_B4', 'QE_B5', 'QE_B6']);
    for (const t of tables) {
      expect(t.standard_code).toBe('DWA-M-820-3');
      expect(t.edition).toBe(M820_3_EDITION);
      expect(t.key_columns).toEqual(['nr']);
      expect(t.value_columns.map((c) => `${c.name}:${c.type}`)).toEqual(['kriterium:string', 'hinweise:string', 'nr_num:number']);
      expect(t.override_policy).toBe('anhaltswert');
      expect(t.override_quote).toBe(QE_OVERRIDE_QUOTE);
      expect(t.rows.map((r) => r.row_key)).toEqual(t.rows.map((_, i) => `n${i + 1}`));
      expect(t.rows.map((r) => r.values.nr_num)).toEqual(t.rows.map((_, i) => i + 1));
      for (const r of t.rows) {
        expect(r.verbatim_quote.startsWith('\\hline '), `${t.table_code} ${r.row_key}`).toBe(true);
        expect(norm(r.verbatim_quote).length).toBeGreaterThan(10);
        expect(String(r.values.kriterium).length, `${t.table_code} ${r.row_key} kriterium`).toBeGreaterThan(0);
        expect(r.label_de.startsWith(`${r.values.nr_num} · `)).toBe(true);
      }
    }
    expect(M820_3_EDITION).toBe('2026');
    expect(norm(QE_OVERRIDE_QUOTE)).toBe('Dabei stellen die angegebenen Qualitätselemente nur eine projektübergeordnete Auswahl an Kriterien dar, die im Anwendungsfall projektspezifisch ausgewählt und ergänzt werden müssen. — Die in Anhang A und B angegebenen Qualitätselemente stellen eine Auswahl an Kriterien für die Projektabwicklung dar.');
    expect(norm(Q_L67)).toContain('projektspezifisch ausgewählt und ergänzt werden müssen.');
    expect(norm(Q_L194)).toContain('Die Hinweise sind gegliedert nach den in Teil 1 und Teil 2 bereits verwendeten Leistungsphasen.');
    expect(Object.fromEntries(tables.map((t) => [t.table_code, t.verification_status]))).toEqual({
      QE_A1: 'md_verified', QE_A2: 'md_verified', QE_A3: 'md_verified', QE_A4: 'imported_unverified', QE_B1: 'md_verified',
      QE_B2: 'md_verified', QE_B3: 'md_verified', QE_B4: 'md_verified', QE_B5: 'md_verified', QE_B6: 'md_verified',
    });
    expect(QE_CATALOGUES.map((c) => c.code)).toEqual(tables.map((t) => t.table_code));
    expect(SEED_BUILDERS.m820_3).toMatchObject({ ts: '20260917100900', slugFile: 'm820_3' });
    expect(liveSeedSlugs()).toContain('m820_3');
    expect(SEED_BUILDERS.m820_3.build().length).toBe(10);
    // the runtime fallback resolves every catalogue by code and row key
    const look = makeTableLookup('DWA-M-820-3');
    expect(look('QE_A1', ['n15'])?.kriterium).toBe('Anwendung DIN 18205');
    expect(look('QE_B3', ['n50'])?.hinweise).toBe('Auf rechtlich wirksamen Vertragsabschluss achten!');
    expect(look('QE_B2', ['n22'])?.nr_num).toBe(22);
    expect(makeTableRows('DWA-M-820-3')('QE_B2')?.length).toBe(40);
  });

  it('printed cells: first / last items per catalogue, the group headings of B.2 / B.3, the A.3 spanning Hinweis, the A.4 empty-Nr. rows, OCR quirks kept verbatim', () => {
    const item = (list: readonly { nr_num: number; kriterium: string; hinweise: string; group: string | null; lines: string }[], n: number) => list.find((i) => i.nr_num === n)!;
    expect(item(QE_A1_ITEMS, 1)).toMatchObject({ kriterium: 'Ist-Zustand und Zielsetzung formulieren', hinweise: 'Aussagen zu Technik, Ökonomie, Ökologie und Termine', lines: 'L689' });
    expect(item(QE_A1_ITEMS, 8)).toMatchObject({ kriterium: 'Bearbeitungstiefe', hinweise: '' }); // L696 — empty Hinweise cell printed
    expect(item(QE_A1_ITEMS, 10)).toMatchObject({ kriterium: 'Wie werden mögliche Lösungen bewertet und Entscheidungen getroffen? Vorbereitung von Entscheidungen (Kostenrahmen, Wirtschaftlichkeitsbetrachtungen, Lebenszykluskosten, Nutzwertanalysen etc.)', lines: 'L698–L701' });
    expect(item(QE_A1_ITEMS, 15)).toMatchObject({ kriterium: 'Anwendung DIN 18205', hinweise: 'Checklisten', lines: 'L709' });
    expect(item(QE_A2_ITEMS, 8)).toMatchObject({ kriterium: 'Klärung von Subventionen/Fördermitteln/Finanzierungen', hinweise: '', lines: 'L724' });
    // A.3: the Hinweise is printed once as \multirow[t]{12}{*} (L732) and spans all twelve rows
    for (const i of QE_A3_ITEMS) expect(i.hinweise).toBe('Kurzbeschreibungen zur Identifikation von Projekten aus dem Konzept');
    expect(item(QE_A3_ITEMS, 6).kriterium).toBe('im Projektumgriff (..In Scope") / Schnittstellen'); // L737 — OCR quotation marks kept verbatim
    expect(item(QE_A3_ITEMS, 7).kriterium).toBe('nicht im Projektumgriff (..Out of Scope")'); // L738
    // A.4: three category rows; Nr. printed only for Ökologie ("2", L754); the other two Nr. cells are empty multirows (m820_3-U-1)
    expect(QE_A4_ITEMS.map((i) => i.kriterium)).toEqual(['Ökonomie/Wirtschaftlichkeit', 'Ökologie/Umwelt', 'Sozioökonomie/Gesellschaft']);
    expect(QE_A4_ITEMS[0].quote.startsWith('\\hline \\multirow{2}{*}{} & ')).toBe(true);
    expect(QE_A4_ITEMS[1].quote.startsWith('\\hline \\multirow[t]{3}{*}{2} & ')).toBe(true);
    expect(QE_A4_ITEMS[2].quote.startsWith('\\hline \\multirow{2}{*}{} & ')).toBe(true);
    expect(QE_A4_ITEMS[1].hinweise).toBe('Minimierung der ökologischen Auswirkungen ( CO2, Klimabilanz etc.) · Ökologische Eingriffe, Ausgleichsmaßnahmen · Artenschutz');
    expect(QE_A4_ITEMS[1].quote).toContain('$\\mathrm{CO}_{2}$');
    // B.1: "B. 1 (Ende)" continues the numbering at 10 (L785)
    expect(item(QE_B1_ITEMS, 10)).toMatchObject({ lines: 'L785' });
    expect(item(QE_B1_ITEMS, 15)).toMatchObject({ kriterium: 'Anwendung DIN 18205 - Bedarfsplanung', hinweise: 'Checklisten', lines: 'L793' });
    // B.2: the four printed Leistungsphase headings become group_label (L801, L823, L832, L871)
    expect([...new Set(QE_B2_ITEMS.map((i) => i.group))]).toEqual(['Grundlagenermittlung', 'Vorplanung', 'Entwurfsplanung', 'Genehmigungsplanung (inkl. Genehmigungsverfahren)']);
    expect(QE_B2_ITEMS.filter((i) => i.group === 'Grundlagenermittlung').map((i) => i.nr_num)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(QE_B2_ITEMS.filter((i) => i.group === 'Vorplanung').map((i) => i.nr_num)).toEqual([14, 15, 16, 17, 18, 19, 20, 21]);
    expect(item(QE_B2_ITEMS, 22)).toMatchObject({ group: 'Entwurfsplanung', kriterium: 'Schnittstelle zwischen EMSR, Automatisie-rungs- und Maschinentechnik geklärt', hinweise: '', lines: 'L833' }); // hyphenation kept verbatim
    expect(item(QE_B2_ITEMS, 25).kriterium).toContain('Außerund Inbetriebnahmen'); // L849 — OCR "Außerund" kept verbatim
    expect(item(QE_B2_ITEMS, 40)).toMatchObject({ group: 'Genehmigungsplanung (inkl. Genehmigungsverfahren)', kriterium: 'Eventuelle Einsprüche zum Genehmigungsbescheid sind geklärt', hinweise: 'Klageverfahren, betroffene Bürger, Behörden etc.', lines: 'L879' });
    // B.3: three headings (L889, L950, L1006); Nr. 18 opens "Vorbereiten der Vergabe", Nr. 40 "Mitwirken bei der Vergabe"
    expect([...new Set(QE_B3_ITEMS.map((i) => i.group))]).toEqual(['Ausführungsplanung', 'Vorbereiten der Vergabe', 'Mitwirken bei der Vergabe']);
    expect(item(QE_B3_ITEMS, 17).group).toBe('Ausführungsplanung');
    expect(item(QE_B3_ITEMS, 18)).toMatchObject({ group: 'Vorbereiten der Vergabe', kriterium: 'Vergabeeinheitsstruktur und Vergabekriterien (Eignungs- und Zuschlagskriterien) sind zu Beginn LPH 6 festgelegt', lines: 'L951' });
    expect(item(QE_B3_ITEMS, 40)).toMatchObject({ group: 'Mitwirken bei der Vergabe', lines: 'L1007' });
    expect(item(QE_B3_ITEMS, 15).kriterium).toContain('lausführendes Unternehmen oder Betrieb)'); // L941–L943 — OCR "l" for "(" kept verbatim
    expect(item(QE_B3_ITEMS, 44).kriterium).toBe('Formale Prüfung der Angebote; falls nicht bestanden → Ausschluss'); // L1011
    expect(item(QE_B3_ITEMS, 50)).toMatchObject({ kriterium: 'Zuschlag erteilen', hinweise: 'Auf rechtlich wirksamen Vertragsabschluss achten!', lines: 'L1017' });
    // B.4 / B.5 / B.6 first and last
    expect(item(QE_B4_ITEMS, 1)).toMatchObject({ kriterium: 'Bürgerinformation findet zeitgerecht statt', hinweise: '', lines: 'L1027' });
    expect(item(QE_B4_ITEMS, 21).hinweise).toContain('Pla-nungs- und Bauüberwachungsleistungen'); // L1085–L1091 — hyphenation kept verbatim
    expect(item(QE_B4_ITEMS, 34)).toMatchObject({ hinweise: 'Die Betriebsanweisung wird vom Betreiber erstellt. Er kann sich hierzu Dritter bedienen', lines: 'L1131' });
    expect(item(QE_B5_ITEMS, 1)).toMatchObject({ kriterium: 'Wasserwirtschaftliche Abnahmen vor Inbetriebnahme', lines: 'L1141' });
    expect(item(QE_B5_ITEMS, 6)).toMatchObject({ lines: 'L1155' }); // "B. 5 (Ende)" continues at 6
    expect(item(QE_B5_ITEMS, 10)).toMatchObject({ kriterium: 'Ausblick auf die Betriebsphase für verfahrenstechnische Optimierungen', lines: 'L1162–L1165' });
    expect(item(QE_B6_ITEMS, 1)).toMatchObject({ hinweise: 'Ergänzungen siehe 7.2', lines: 'L1174' });
    expect(item(QE_B6_ITEMS, 6)).toMatchObject({ kriterium: 'Die Inhalte der Dokumentenbedarfsliste werden abgearbeitet, zusammengestellt und übergeben', hinweise: '', lines: 'L1189' });
    // no catalogue outside A.4 has a group heading except B.2 / B.3
    for (const list of [QE_A1_ITEMS, QE_A2_ITEMS, QE_A3_ITEMS, QE_A4_ITEMS, QE_B1_ITEMS, QE_B4_ITEMS, QE_B5_ITEMS, QE_B6_ITEMS]) for (const i of list) expect(i.group).toBeNull();
    // the seeded row values equal the item cells (qeCatalogueAsTable copies, never rewrites)
    const b2 = qeCatalogueAsTable(QE_CATALOGUES[5]);
    expect(b2.rows.map((r) => r.group_label)).toEqual(QE_B2_ITEMS.map((i) => i.group));
    expect(b2.rows[21].values).toEqual({ kriterium: item(QE_B2_ITEMS, 22).kriterium, hinweise: '', nr_num: 22 });
    expect(by('QE_A4').rows[1].values.hinweise).toBe(QE_A4_ITEMS[1].hinweise);
  });

  it('the cue spans read for the field configs / equations are the printed sentences (one line each)', () => {
    expect(norm(Q_L196)).toBe('Das Merkblatt richtet sich an Auftraggeber und Auftragnehmer (beauftragte Ingenieurbüros) für planerische Arbeiten bei der Herstellung von Anlagen in den Bereichen Wasserwirtschaft, Wasserbau, Abwasser und Abfall.');
    expect(norm(Q_L200)).toContain('Im konkreten Projekt werden aus den Qualitätselementen die projektspezifischen Anforderungen und Aufgabenlisten');
    expect(norm(Q_L202)).toContain('Es wird darauf hingewiesen, dass die bereitgestellten Qualitätselemente einzelne Anhaltspunkte für die Projektabwicklung darstellen.');
    expect(norm(Q_L204)).toContain('Die Qualitätselemente unterstützen die Bearbeitenden dabei');
    expect(norm(Q_L206)).toContain('Die vollständige Ablaufstruktur für Projekte aller Art ergibt sich aus der eigenverantwortlichen Anwendung');
    expect(norm(Q_L307)).toBe('Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines Projektstopps erforderlich. Im Rahmen einer Risikoanalyse muss bewertet werden, ob und wie das Projekt fortgeführt werden kann.');
    expect(norm(Q_L321)).toContain('Die Aufteilung in „Konzept für das Gesamtsystem“ und „Projekte“ ist dabei eine elementare Grundlage.');
    expect(norm(Q_L398)).toBe('Auf der Grundlage des Konzepts für das Gesamtsystem wurden erforderliche Projekte identifiziert (siehe 5.4). Diese werden im Folgenden einzeln betrachtet und umgesetzt.');
    expect(norm(Q_L591)).toBe('I Die BIM-Projektdefinition ist abgeschlossen.'); // the bullet glyph is OCR'd as "I"
  });
});
