// Generator for 20261015160000_m820_3_c4_qe_guards (migration, rollback, read-back) — DWA-M 820-3 case C4 F3 / F4.
// Inputs (this folder): c4q-state.json (pre-state rows + sig0 of the touched DWA-M-820-3 sheets; seed = tests/harness/*.dump.json + every
// M820 block up to 20261008100000; verification_quote + fsig refreshed from prod 2026-10-17 by refresh-c4q-state.mjs) and c4q-sig1.json (post signatures from the harness discovery run, C4Q_DISCOVER=1).
// Run: node scripts/verification/m820-3-c4-qe-guards/gen-c4q.mjs  — rewrites the three SQL files; the SQL stays the reviewed artefact.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCR = dirname(fileURLToPath(import.meta.url));
const WT = resolve(SCR, '../../..');
const S = JSON.parse(readFileSync(`${SCR}/c4q-state.json`, 'utf8'));
const SIG1 = existsSync(`${SCR}/c4q-sig1.json`) ? JSON.parse(readFileSync(`${SCR}/c4q-sig1.json`, 'utf8')) : {};
const STD = 'DWA-M-820-3';
const ID = '20261015160000';
const fieldOf = (ws, sym) => { const f = S.fields.find((x) => x.ws === ws && x.symbol === sym && x.active); if (!f) throw new Error(`no field ${ws} ${sym}`); return f; };
const gateOf = (ws, code) => { const g = S.gates.find((x) => x.ws === ws && x.code === code); if (!g) throw new Error(`no gate ${ws} ${code}`); return g; };
const fsig0 = (ws, sym) => S.fsig.find((x) => x.ws === ws && x.symbol === sym).sig;
const gsig0 = (ws, code) => S.gsig.find((x) => x.ws === ws && x.code === code).sig;
const q = (s) => { if (s.includes('$m$')) throw new Error('dollar tag in text'); return `$m$${s}$m$`; };
const split = (desc) => { const p = desc.split('\n[EN] '); if (p.length !== 2) throw new Error('no single [EN] block: ' + desc.slice(0, 80)); return p; };
const join = (de, en) => `${de}\n[EN] ${en}`;
// 2026-10-17: prod carries printed-source quotes in verification_quote on most of these rows (the 2026-10-05 dumps had no such column);
// the block keeps them and appends its own quote — prod evidence is never replaced.
const VQ_SEP = ' | ';
const keepVq = (f, own) => (f.verification_quote ? `${f.verification_quote}${VQ_SEP}${own}` : own);
const replaceOnce = (s, a, b) => { if (!s.includes(a)) throw new Error(`text not found: ${a}`); return s.replace(a, b); };

// ── print facts (re-read 2026-10-15 from DWA-M_820-3.pdf: pdftotext -layout + pdftoppm page images; printed = PDF − 2) ──
const Q21 = '„Ergebnisse, die nach Abschluss der jeweiligen Leistungsphase zu erreichen sind“';
const Q21EN = '"results that are to be achieved after completion of the respective service phase"';
const Q3 = '„Werden Phasenziele nicht oder nur unvollständig erreicht, ist die Prüfung eines Projektstopps erforderlich.“';
const Q3EN = '"if phase goals are not achieved or only incompletely achieved, a review of a project stop is required."';
const A21 = 'DWA-M 820-3 §2.1 Z.227 (PDF S. 10)';
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const PHASES = {
  '6.2': { de: 'Bedarfsplanung Projekt', en: 'needs planning (project)', goalWs: 'M8203-11', goals: range(1, 5).map((n) => `pz_62_${n}_status`) },
  '6.3': { de: 'Planung', en: 'planning', goalWs: 'M8203-13', goals: range(1, 8).map((n) => `pz_63_${n}_status`) },
  '6.4': { de: 'Ausführungsvorbereitung', en: 'preparation of execution', goalWs: 'M8203-15', goals: range(1, 12).map((n) => `pz_64_${n}_status`) },
  '6.5': { de: 'Ausführung', en: 'execution', goalWs: 'M8203-16', goals: range(1, 12).map((n) => `pz_65_${n}_status`) },
  '6.6': { de: 'Inbetriebnahme, Testbetrieb, Abnahme', en: 'commissioning, test operation, acceptance', goalWs: 'M8203-17', goals: range(1, 11).map((n) => `pz_66_${n}_status`) },
  '6.7': { de: 'Projektabschluss', en: 'project closure', goalWs: 'M8203-18', goals: range(1, 6).map((n) => `pz_67_${n}_status`) },
};
const ASSESSED = "IN {'erreicht', 'teilweise_erreicht', 'nicht_erreicht'}";
const guardOf = (goals) => goals.map((g) => `${g} ${ASSESSED}`).join(' OR ');
const PHASE_GUARD = Object.fromEntries(Object.entries(PHASES).map(([k, v]) => [k, guardOf(v.goals)]));
const ALL_GUARD = guardOf(Object.values(PHASES).flatMap((v) => v.goals));

// sheets: printed table, row range, segment headings, pages (PDF / printed), anchor line in the md transcript
const SHEETS = [
  { ws: 'M8203-11', p: 'qe62', ph: '6.2', n: 15, nr: '1–15', tab: 'B.1', head: 'B.1 QE 6.2: Bedarfsplanung Projekt', seg: null, segEn: null, pdf: '26 f.', pr: '24 f.', last: '15 Anwendung DIN 18205 – Bedarfsplanung', z: 'Anhang B.1 Z.765–780' },
  { ws: 'M8203-12', p: 'qe63a', ph: '6.3', n: 21, nr: '1–21', tab: 'B.2', head: 'B.2 QE 6.3: Planung', seg: 'Zwischenüberschriften „Grundlagenermittlung“ (Nr. 1–13) und „Vorplanung“ (Nr. 14–21)', segEn: 'subheadings "Grundlagenermittlung" (Nr. 1–13) and "Vorplanung" (Nr. 14–21)', pdf: '27 f.', pr: '25 f.', last: '21 Leistungsphase wird abgeschlossen und durch AG genehmigt', z: 'Anhang B.2 Z.801–831' },
  { ws: 'M8203-13', p: 'qe63b', ph: '6.3', n: 19, nr: '22–40', tab: 'B.2', head: 'B.2 QE 6.3: Planung', seg: 'Zwischenüberschriften „Entwurfsplanung“ (Nr. 22–35) und „Genehmigungsplanung (inkl. Genehmigungsverfahren)“ (Nr. 36–40)', segEn: 'subheadings "Entwurfsplanung" (Nr. 22–35) and "Genehmigungsplanung (inkl. Genehmigungsverfahren)" (Nr. 36–40)', pdf: '28–30', pr: '26–28', last: '40 Eventuelle Einsprüche zum Genehmigungsbescheid sind geklärt', z: 'Anhang B.2 Z.832–880' },
  { ws: 'M8203-14', p: 'qe64a', ph: '6.4', n: 17, nr: '1–17', tab: 'B.3', head: 'B.3 QE 6.4: Ausführungsvorbereitung', seg: 'Zwischenüberschrift „Ausführungsplanung“ (Nr. 1–17)', segEn: 'subheading "Ausführungsplanung" (Nr. 1–17)', pdf: '30–32', pr: '28–30', last: '17 Wartungsverträge werden soweit erforderlich identifiziert und ggf. als separate Verträge ausgeschrieben', z: 'Anhang B.3 Z.886–949' },
  { ws: 'M8203-15', p: 'qe64b', ph: '6.4', n: 33, nr: '18–50', tab: 'B.3', head: 'B.3 QE 6.4: Ausführungsvorbereitung', seg: 'Zwischenüberschriften „Vorbereiten der Vergabe“ (Nr. 18–39) und „Mitwirken bei der Vergabe“ (Nr. 40–50)', segEn: 'subheadings "Vorbereiten der Vergabe" (Nr. 18–39) and "Mitwirken bei der Vergabe" (Nr. 40–50)', pdf: '32–34', pr: '30–32', last: '50 Zuschlag erteilen', z: 'Anhang B.3 Z.950–1023' },
  { ws: 'M8203-16', p: 'qe65', ph: '6.5', n: 34, nr: '1–34', tab: 'B.4', head: 'B.4 QE 6.5: Ausführung', seg: null, segEn: null, pdf: '35–38', pr: '33–36', last: '34 Anforderungen des Produktsicherheitsgesetzes (ProdSG) …', z: 'Anhang B.4 Z.1024–1137' },
  { ws: 'M8203-17', p: 'qe66', ph: '6.6', n: 10, nr: '1–10', tab: 'B.5', head: 'B.5 QE 6.6: Inbetriebnahme, Testbetrieb, Abnahme', seg: null, segEn: null, pdf: '38 f.', pr: '36 f.', last: '10 Ausblick auf die Betriebsphase für verfahrenstechnische Optimierungen', z: 'Anhang B.5 Z.1138–1169' },
  { ws: 'M8203-18', p: 'qe67', ph: '6.7', n: 6, nr: '1–6', tab: 'B.6', head: 'B.6 QE 6.7: Projektabschluss', seg: null, segEn: null, pdf: '39 f.', pr: '37 f.', last: '6 Die Inhalte der Dokumentenbedarfsliste werden abgearbeitet, zusammengestellt und übergeben', z: 'Anhang B.6 Z.1170–1190' },
];
const ASSESS = ['assessor', 'assessment_date', 'fulfilment_pct', 'items_y', 'items_p', 'items_n', 'items_na', 'items_total'];
const SUMMARY = ['gesamt_anhang_b_fulfilment_pct', 'gesamt_anhang_b_items_total', 'gesamt_anhang_b_verdict'];

const goalsWhere = (ph, ws) => { const P = PHASES[ph]; const a = P.goals.length; const sheet = P.goalWs === ws ? 'dieses Blatt' : P.goalWs; return { de: `PZ ${ph}-1 bis ${ph}-${a}, ${sheet}`, en: `PZ ${ph}-1 to ${ph}-${a}, ${P.goalWs === ws ? 'this sheet' : P.goalWs}` }; };
function guardSentences(ph, ws) {
  const P = PHASES[ph]; const g = goalsWhere(ph, ws);
  return {
    de: `Nur sichtbar, sobald mindestens ein Phasenziel der Phase „${P.de}“ (§ ${ph}; ${g.de}) mit „Erreicht“, „Teilweise erreicht“ oder „Nicht erreicht“ bewertet ist. Stehen alle diese Phasenziele auf „Phase noch nicht erreicht“ oder „Nicht zutreffend“, ist die Phase nicht abgeschlossen und es gibt hier noch nichts zu bewerten. Grundlage – § 2.1 (S. 8) Phasenziele: ${Q21}; die Regel selbst ist Werkzeug-Logik. Solange ein Phasenziel der Phase unbeantwortet ist, bleibt die Frage sichtbar.`,
    en: `Shown only once at least one phase goal of the phase "${P.en}" (§ ${ph}; ${g.en}) is rated "Met", "Partially met" or "Not met". While all these phase goals are "Phase not reached yet" or "Not applicable", the phase is not completed and there is nothing to assess here yet. Basis – § 2.1 (p. 8) phase goals: ${Q21EN}; the rule itself is tool logic. While a phase goal of the phase is unanswered, the question stays visible.`,
  };
}
const VQ_GUARD = `Werkzeug-Logik / tool logic (visible_when): Bewertungsblock erst, wenn mindestens ein Phasenziel der Phase mit Erreicht / Teilweise erreicht / Nicht erreicht bewertet ist. Grundlage § 2.1 (S. 8) Phasenziele: ${Q21}`;

// ── rows ──
const fieldRows = []; // {ws, sym, set: {col: sqlLiteral}, extraWhere, note}
const gateRows = [];
const eqRows = [];

for (const s of SHEETS) {
  const P = PHASES[s.ph];
  const gs = guardSentences(s.ph, s.ws);
  for (const a of ASSESS) {
    const sym = `${s.p}_${a}`; const f = fieldOf(s.ws, sym);
    if (f.visible_when || f.source_anchor || f.widget) throw new Error('unexpected pre-state ' + sym);
    let [de, en] = split(f.description);
    const set = { visible_when: q(PHASE_GUARD[s.ph]) };
    if (a === 'items_total') {
      const eqno = `${s.ws}-D10`;
      const segDe = s.seg ? `; ${s.seg}` : ''; const segEn = s.segEn ? `; ${s.segEn}` : '';
      de = `Gesamtzahl der gedruckten Kriterien in Anhang ${s.tab} (${s.ws === 'M8203-11' ? 'QE 6.2: Bedarfsplanung Projekt' : s.head.slice(4)}${segDe}): ${s.n} (Nr. ${s.nr}). Vom Werkzeug als Konstante gesetzt (Gleichung ${eqno}) – keine Eingabe mehr: gezählt sind die nummerierten Zeilen der gedruckten Tabelle (Anhang ${s.tab}, gedr. S. ${s.pr}). Nenner für die Anteile unten.`;
      en = `Total number of printed criteria in Anhang ${s.tab} (${s.head.slice(4)}${segEn}): ${s.n} (Nr. ${s.nr}). Set by the tool as a constant (equation ${eqno}) – no longer an input: counted are the numbered rows of the printed table (Anhang ${s.tab}, printed pp. ${s.pr}). Denominator for the shares below.`;
      set.is_required = 'false'; set.widget = q('derived');
      set.verification_quote = q(keepVq(f, `Werkzeug-Ableitung / tool derivation (Gleichung ${eqno}): Zeilennummern der gedruckten Tabelle „${s.head}“ (PDF S. ${s.pdf} / gedr. S. ${s.pr})${s.seg ? `, ${s.seg}` : ''}: Nr. ${s.nr.replace('–', ' … ')} = ${s.n}; letzte Zeile „${s.last}“. ${VQ_GUARD}`));
      set.source_anchor = q(`DWA-M 820-3 ${s.z} (PDF S. ${s.pdf}) — derived; ${A21} — visible_when`);
      eqRows.push({ ws: s.ws, eqno, sym, n: s.n, clause: S.equations.find((e) => e.equation_number === `${s.ws}-D1`).clause_reference,
        desc: join(`Gesamtzahl der gedruckten Kriterien dieses Blatts als Konstante: Tabelle „${s.head}“ (gedr. S. ${s.pr})${s.seg ? `, ${s.seg}` : ''} nummeriert die Zeilen Nr. ${s.nr} → ${s.n}. Werkzeug-Ableitung (Zählung der gedruckten Zeilennummern); ersetzt die bisherige Eingabe ${sym}. Nenner der Anteile ${s.ws}-D6 … -D9.`,
          `Total number of printed criteria of this sheet as a constant: table "${s.head}" (printed pp. ${s.pr})${s.segEn ? `, ${s.segEn}` : ''} numbers the rows Nr. ${s.nr} → ${s.n}. Tool derivation (count of the printed row numbers); replaces the former input ${sym}. Denominator of the shares ${s.ws}-D6 … -D9.`),
        vq: `Zeilennummern der gedruckten Tabelle „${s.head}“ (PDF S. ${s.pdf} / gedr. S. ${s.pr}): Nr. ${s.nr.replace('–', ' … ')}; letzte Zeile „${s.last}“ — Zählung = Werkzeug-Ableitung` });
    } else {
      set.verification_quote = q(keepVq(f, VQ_GUARD));
      set.source_anchor = q(`${A21} — visible_when`);
    }
    set.description = q(join(`${de} ${gs.de}`, `${en} ${gs.en}`));
    fieldRows.push({ ws: s.ws, sym, set, extraWhere: a === 'items_total' ? ' AND f.widget IS NULL' : '', kind: a === 'items_total' ? 'derived+guard' : 'guard' });
  }
}
// M8203-23 summary
for (const sym of SUMMARY) {
  const f = fieldOf('M8203-23', sym); const [de, en] = split(f.description);
  const gde = `Nur sichtbar, sobald mindestens ein Phasenziel der Projektphasen § 6.2 bis § 6.7 (M8203-11, -13, -15, -16, -17, -18) mit „Erreicht“, „Teilweise erreicht“ oder „Nicht erreicht“ bewertet ist – vorher ist keine Phase abgeschlossen und es gibt keine QE-Bewertung zusammenzufassen. Grundlage – § 2.1 (S. 8) Phasenziele: ${Q21}; die Regel selbst ist Werkzeug-Logik. Solange ein Phasenziel unbeantwortet ist, bleibt die Frage sichtbar.`;
  const gen = `Shown only once at least one phase goal of the project phases § 6.2 to § 6.7 (M8203-11, -13, -15, -16, -17, -18) is rated "Met", "Partially met" or "Not met" – before that no phase is completed and there is no QE assessment to summarise. Basis – § 2.1 (p. 8) phase goals: ${Q21EN}; the rule itself is tool logic. While a phase goal is unanswered, the question stays visible.`;
  fieldRows.push({ ws: 'M8203-23', sym, set: { visible_when: q(ALL_GUARD), description: q(join(`${de} ${gde}`, `${en} ${gen}`)),
    verification_quote: q(keepVq(f, `Werkzeug-Logik / tool logic (visible_when): Zusammenfassung erst, wenn mindestens ein Phasenziel der Projektphasen bewertet ist. Grundlage § 2.1 (S. 8) Phasenziele: ${Q21}`)), source_anchor: q(`${A21} — visible_when`) }, extraWhere: '', kind: 'guard' });
}
// goal hints (F4 on pz_62_1; block sentence on the first goal of every phase) + consumers for the split sheets
const blockSentence = (extra, extraEn) => ({
  de: `Der Bewertungsblock dieses Blatts${extra} (Prüfer, Datum, Erfüllungsgrad, Zählungen Y/P/N/NA, Gesamtzahl) erscheint erst, wenn mindestens ein Phasenziel dieser Phase mit „Erreicht“, „Teilweise erreicht“ oder „Nicht erreicht“ bewertet ist; solange alle auf „Phase noch nicht erreicht“ oder „Nicht zutreffend“ stehen, bleibt er ausgeblendet (Werkzeug-Logik).`,
  en: `The assessment block of this sheet${extraEn} (assessor, date, fulfilment rate, Y/P/N/NA counts, total) appears only once at least one phase goal of this phase is rated "Met", "Partially met" or "Not met"; while all are "Phase not reached yet" or "Not applicable", it stays hidden (tool logic).`,
});
{
  const f = fieldOf('M8203-11', 'pz_62_1_status'); let [de, en] = split(f.description);
  de = replaceOnce(de, 'Ja dort → hier „Erreicht“; Nein dort → hier je nach Stand „Teilweise erreicht“ oder „Nicht erreicht“. Die Antworten dürfen sich nicht widersprechen.',
    `Ja dort → hier „Erreicht“. Nein dort, solange die Bedarfsplanung (LPH 0) noch läuft → hier „Phase noch nicht erreicht“. Erst wenn die Phase abgeschlossen ist und das Ziel trotzdem verfehlt wurde: „Teilweise erreicht“ oder „Nicht erreicht“ – beides löst die Prüfung eines Projektstopps aus, § 3 (S. 10): ${Q3} Die Antworten dürfen sich nicht widersprechen.`);
  en = replaceOnce(en, 'Yes there → "Met" here; No there → "Partially met" or "Not met" here, depending on the state. The answers must not contradict each other.',
    `Yes there → "Met" here. No there while the needs planning (LPH 0) is still running → "Phase not reached yet" here. Only once the phase is completed and the goal was nevertheless missed: "Partially met" or "Not met" – both trigger the review of a project stop, § 3 (p. 10): ${Q3EN} The answers must not contradict each other.`);
  const b = blockSentence('', '');
  fieldRows.push({ ws: 'M8203-11', sym: 'pz_62_1_status', set: { description: q(join(`${de} ${b.de}`, `${en} ${b.en}`)) }, extraWhere: '', kind: 'hint' });
}
for (const [ph, sym, ex, exEn] of [['6.3', 'pz_63_1_status', ' und von M8203-12 (QE 6.3 Teil 1)', ' and of M8203-12 (QE 6.3 part 1)'], ['6.4', 'pz_64_1_status', ' und von M8203-14 (QE 6.4 Teil 1)', ' and of M8203-14 (QE 6.4 part 1)'],
  ['6.5', 'pz_65_1_status', '', ''], ['6.6', 'pz_66_1_status', '', ''], ['6.7', 'pz_67_1_status', '', '']]) {
  const ws = PHASES[ph].goalWs; const f = fieldOf(ws, sym); const [de, en] = split(f.description); const b = blockSentence(ex, exEn);
  const set = { description: q(join(`${de} ${b.de}`, `${en} ${b.en}`)) };
  if (ph === '6.3') set.consumer_worksheets = "ARRAY['M8203-12', 'M8203-23', 'M8203-24']::text[]";
  if (ph === '6.4') set.consumer_worksheets = "ARRAY['M8203-14', 'M8203-23', 'M8203-24']::text[]";
  fieldRows.push({ ws, sym, set, extraWhere: '', kind: ph === '6.3' || ph === '6.4' ? 'hint+consumer' : 'hint' });
}
for (const [ph, target] of [['6.3', 'M8203-12'], ['6.4', 'M8203-14']]) {
  for (const sym of PHASES[ph].goals.slice(1)) {
    const f = fieldOf(PHASES[ph].goalWs, sym);
    if ((f.consumer_worksheets || []).join(',') !== 'M8203-23,M8203-24') throw new Error('consumer pre-state ' + sym);
    fieldRows.push({ ws: PHASES[ph].goalWs, sym, set: { consumer_worksheets: `ARRAY['${target}', 'M8203-23', 'M8203-24']::text[]` }, extraWhere: '', kind: 'consumer' });
  }
}
if (fieldOf('M8203-13', 'pz_63_1_status').consumer_worksheets.join(',') !== 'M8203-23,M8203-24') throw new Error('c');
if (fieldOf('M8203-15', 'pz_64_1_status').consumer_worksheets.join(',') !== 'M8203-23,M8203-24') throw new Error('c');

// gates
const gateGuardText = (ph, ws, extraDe = '', extraEn = '') => {
  const P = PHASES[ph]; const g = goalsWhere(ph, ws);
  return {
    de: `Gilt erst, wenn mindestens ein Phasenziel der Phase „${P.de}“ (§ ${ph}; ${g.de}) mit „Erreicht“, „Teilweise erreicht“ oder „Nicht erreicht“ bewertet ist (Werkzeug-Logik; § 2.1 (S. 8) Phasenziele: ${Q21}). Vorher gilt die Prüfung noch nicht; solange ein Phasenziel unbeantwortet ist, wartet sie.${extraDe}`,
    en: `Applies only once at least one phase goal of the phase "${P.en}" (§ ${ph}; ${g.en}) is rated "Met", "Partially met" or "Not met" (tool logic; § 2.1 (p. 8) phase goals: ${Q21EN}). Before that the check does not apply yet; while a phase goal is unanswered, it waits.${extraEn}`,
  };
};
for (const [ws, code, ph] of [['M8203-11', 'REQ-19', '6.2'], ['M8203-16', 'REQ-22', '6.5'], ['M8203-17', 'REQ-23', '6.6'], ['M8203-18', 'REQ-24', '6.7']]) {
  const g = gateOf(ws, code); let [de, en] = split(g.description);
  if (code !== 'REQ-19') {
    de = replaceOnce(de, 'Tragen Sie die vier Zählungen und die Gesamtzahl ein;', 'Tragen Sie die vier Zählungen ein (die Gesamtzahl setzt das Werkzeug);');
    en = replaceOnce(en, 'Enter the four counts and the total;', 'Enter the four counts (the tool sets the total);');
  }
  const t = gateGuardText(ph, ws);
  gateRows.push({ ws, code, sev: g.severity, condition: `IF (${PHASE_GUARD[ph]}) THEN (${g.condition})`, description: join(`${de} ${t.de}`, `${en} ${t.en}`) });
}
for (const [code, ph, a, b2] of [['REQ-20', '6.3', '21', '19'], ['REQ-21', '6.4', '17', '33']]) {
  const g = gateOf('M8203-23', code); let [de, en] = split(g.description);
  de = replaceOnce(de, 'Warnprüfung, gilt immer:', 'Warnprüfung:'); en = replaceOnce(en, 'Warning gate, always applies:', 'Warning gate:');
  de = replaceOnce(de, 'eingetragenen Gesamtzahlen', 'geführten Gesamtzahlen'); en = replaceOnce(en, 'the totals entered on', 'the totals on');
  const t = gateGuardText(ph, 'M8203-23', ` Die Gesamtzahlen setzt das Werkzeug als Konstanten (${a} + ${b2}); sind beide berechnet, ist die Prüfung erfüllt.`, ` The tool sets the totals as constants (${a} + ${b2}); once both are computed, the check passes.`);
  gateRows.push({ ws: 'M8203-23', code, sev: g.severity, condition: `IF (${PHASE_GUARD[ph]}) THEN (${g.condition})`, description: join(`${de} ${t.de}`, `${en} ${t.en}`) });
}

// ── SQL emitters ──
const FSIG = (a = 'f') => `md5(concat_ws('|', md5(coalesce(${a}.description,'')), coalesce(${a}.visible_when,''), coalesce(array_to_string(${a}.consumer_worksheets, ','),''), coalesce(md5(${a}.enum_values::text),''), ${a}.label_de, coalesce(${a}.label_en,''), ${a}.is_required::text, ${a}.data_type, md5(coalesce(${a}.verification_quote,'')), coalesce(${a}.source_anchor,'')))`;
const GSIG = (a = 'cr') => `md5(concat_ws('|', coalesce(${a}.condition,''), ${a}.severity, md5(coalesce(${a}.description,'')), coalesce(${a}.clause_reference,'')))`;
const T = { fa: 'fields_archive_m820_c4q', ga: 'compliance_requirements_archive_m820_c4q', led: 'm820_c4q_written' };
const sig1f = (ws, sym) => SIG1[`f ${ws} ${sym}`] ?? 'POST_SIGNATURE_PENDING';
const sig1g = (ws, code) => SIG1[`g ${ws} ${code}`] ?? 'POST_SIGNATURE_PENDING';

const fv = fieldRows.map((r) => `    ('${r.ws}','${r.sym}','${fsig0(r.ws, r.sym)}','${sig1f(r.ws, r.sym)}')`).join(',\n');
const gv = gateRows.map((r) => `    ('${r.ws}','${r.code}','${gsig0(r.ws, r.code)}','${sig1g(r.ws, r.code)}')`).join(',\n');
const NF = fieldRows.length, NG = gateRows.length, NE = eqRows.length;
// fix round 1 (review db7b982 finding 3): the two per-statement preconditions (widget IS NULL on the totals; no other equation outputs a
// total) are part of step 0 and of read-back R0 — drift aborts the whole block instead of skipping single statements
const tv = eqRows.map((e) => `    ('${e.ws}','${e.sym}','${e.eqno}','${e.sym} = ${e.n}','${fsig0(e.ws, e.sym)}','${sig1f(e.ws, e.sym)}')`).join(',\n');
const TOTALS_CTE = `tv(ws, sym, eqno, formula, sig0, sig1) AS (VALUES\n${tv})`;
const N_W = (into) => `SELECT count(*)${into} FROM tv JOIN standards s ON s.code = '${STD}' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = tv.ws\n    JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = tv.sym AND f.active\n   WHERE (${FSIG()} = tv.sig0 AND f.widget IS NULL) OR (${FSIG()} = tv.sig1 AND f.widget = 'derived')`;
const N_X = (into) => `SELECT count(*)${into} FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id\n    JOIN tv ON tv.sym = e.output_symbol\n   WHERE s.code = '${STD}' AND NOT (w.code = tv.ws AND e.equation_number = tv.eqno AND e.formula = tv.formula)`;
const TOTALS_GUARD = `  WITH ${TOTALS_CTE}\n  ${N_W(' INTO n_w')};\n  WITH ${TOTALS_CTE}\n  ${N_X(' INTO n_x')};`;

let m = `-- ${ID}_m820_3_c4_qe_guards.sql · DWA-M 820-3 — findings F3, F4 and F6 (M8203-20 only) of case C4 (73_CASE-C4-Hellenthal-day0_2026-10-14, §5 / §6.1).
-- Apply order + behaviour list: vault 01-Projects/ekowai-wizard/m820-wizard-test/79_APPLY-ORDER-m820-3-c4-qe-guards.md.
-- Pattern: 20261015140000_m820_2_c4_phase_guards.sql / 20261015150000_m820_1_c4_phase_drivers.sql (md5-guarded updates, step-0 pre-state
-- DO guard, in-transaction archives, ledger, byte-equal rollback). DWA-M 820-3 ONLY.
--
-- WHAT CHANGES (plain English):
--   F3 · The QE assessment block of M8203-11 … -18 (qe*_assessor, _assessment_date, _fulfilment_pct, _items_y / _p / _n / _na, _items_total;
--        8 sheets × 8 = 64 required answers) is shown only once at least ONE phase goal of that phase is rated „Erreicht“, „Teilweise
--        erreicht“ or „Nicht erreicht“. All goals „Phase noch nicht erreicht“ / „Nicht zutreffend“ ⇒ hidden (the phase is not completed;
--        Phasenziele = „Ergebnisse, die nach Abschluss der jeweiligen Leistungsphase zu erreichen sind“, § 2.1). Any goal unanswered ⇒
--        visible (fail-safe). The rule is TOOL LOGIC on top of § 2.1 and is labelled so in every text and verification_quote.
--        M8203-12 (QE 6.3 Teil 1) and M8203-14 (QE 6.4 Teil 1) carry no goals of their own (checked in the encoding: pz_63_* sit on M8203-13,
--        pz_64_* on M8203-15; in the print § 6.3 / § 6.4 list ONE set of Phasenziele per phase and Anhang B.2 / B.3 are one table each,
--        split by the tool at the subheadings) — they follow the goals of their phase on the closing sheet; pz_63_* / pz_64_* gain the
--        consumer M8203-12 / M8203-14 so the rule can read them there.
--        The M8203-23 summary (gesamt_anhang_b_fulfilment_pct / _items_total / _verdict) is shown once any goal of § 6.2 … § 6.7 is assessed.
--        Gates: REQ-19 / REQ-22 / REQ-23 / REQ-24 (warn, Y+P+N+NA == total) and REQ-20 / REQ-21 on M8203-23 (warn, totals 40 / 50) gain
--        the same phase clause INSIDE their condition (IF <phase assessed> THEN (<old condition>)); severity unchanged; no new gate.
--        _items_total is a printed constant: counted in the PDF tables (B.1 Nr. 1–15; B.2 Nr. 1–21 | 22–40 at the subheadings; B.3 Nr.
--        1–17 | 18–50; B.4 Nr. 1–34; B.5 Nr. 1–10; B.6 Nr. 1–6 — no gaps, no doubles; 15 / 21 / 19 / 17 / 33 / 34 / 10 / 6). It becomes a
--        derived value: 8 new equations <ws>-D10 „<prefix>_items_total = N“, the field is_required false, widget 'derived' (the same shape
--        as the *_calc outputs). The value is written by the browser engine and by the server recompute, which MCP set_field_values runs
--        after every save (src/lib/mcp/tools/fields.ts) and recompute_worksheet runs on demand; a bare saveWorksheet materialises
--        register-fed equations only (amendment D) — see 79_ R-2.
--   F4 · M8203-11 pz_62_1_status hint: „Nein dort → … ‚Phase noch nicht erreicht‘, solange die Bedarfsplanung (LPH 0) noch läuft“; „Teilweise“ /
--        „Nicht erreicht“ only once the phase is completed, quoting § 3 (S. 10). The first goal of every phase names the block it opens.
--   F6 · M8203-20 critical_infra_assessed: NOT guarded — no existing driver decides it truthfully (owner item in 79_).
--   Counts: ${NF} field rows updated (64 assessment + 3 summary + 6 goal hints, 2 of them with consumers + 18 further consumer-only goal rows),
--   ${NG} gate rows updated (severity never changes), ${NE} equation rows inserted, 0 deleted. Every changed text DE + [EN].
--
-- SOURCES (re-rendered 2026-10-15 from C:\\Users\\Ekowai\\Desktop\\Guidelines\\DWA-M-820-3\\DWA-M_820-3.pdf, pdftotext -layout -enc UTF-8 +
-- pdftoppm page images 26–40; printed page = PDF page − 2, checked on the footers):
--   § 2.1 Phasenziele (PDF S. 10 / gedr. 8): ${Q21}
--   § 3 (PDF S. 12 / gedr. 10): ${Q3}
--   § 6.3 / § 6.4 (PDF S. 16–18 / gedr. 14–16): one list of Phasenziele per phase, each followed by the pointer to its Anhang table (B.2 / B.3) — no goals per subheading.
${SHEETS.map((s) => `--   ${s.ws} ${s.p}_items_total = ${s.n}: „${s.head}“ PDF S. ${s.pdf} / gedr. ${s.pr}, Nr. ${s.nr}${s.seg ? ` (${s.seg})` : ''}; last row „${s.last}“`).join('\n')}
--   § 7.3 (PDF S. 23 / gedr. 21, M8203-20): „Die Anforderungen der Gesetzgebung zur kritischen Infrastruktur wurden im Vorfeld abgeklärt und
--     sind im Projekt berücksichtigt.“ — no field of 820-1 / -2 / -3 says whether that legislation applies → not guarded.
--
-- Guards: step 0 (DO block) counts the touched rows at the pre- (sig0) or post-state (sig1) signature and aborts the whole block unless all
-- ${NF} fields and ${NG} gates match, the ${NE} totals carry widget NULL (at sig0) / 'derived' (at sig1), and no equation other than the
-- block's own <ws>-D10 constant outputs a qe*_items_total (fix round 1, review db7b982 finding 3); every UPDATE matches the pre-state signature (fields md5(description md5 | visible_when | consumer_worksheets |
-- enum md5 | label_de | label_en | is_required | data_type | verification_quote md5 | source_anchor), active only; items_total also widget IS
-- NULL; gates md5(condition | severity | description md5 | clause_reference)). Signatures = prod 2026-10-17 (the three 2026-10-05 dumps +
-- every M820 block applied on prod up to 20261008100000 + prod's verification_quote; regenerated from a read-only prod export — prod quotes
-- are kept, each guard quote is appended after " | "); read-back R0 on prod must show fields_pre ${NF} / gates_pre ${NG} / new_equations 0.
-- Equations are INSERTed only when the sheet has no equation with that number or that output. Idempotent. In-transaction archives
-- ${T.ga} / ${T.fa} + ledger ${T.led} (md5 of every row as written; inserted equations as 'equations_new').
-- No row is deleted, activated or deactivated; no severity changes; no new gate; saved project values are not touched.
-- Rollback:  scripts/rollback-${ID}-m820-3-c4-qe-guards.sql (byte-equal; a row edited after the apply is left alone).
-- Read-back: scripts/verification/apply/readback-${ID}-m820-3-c4-qe-guards.sql.
-- Generated by scripts/verification/m820-3-c4-qe-guards/gen-c4q.mjs from c4q-state.json (pre-state + sig0) and c4q-sig1.json (post
--   signatures, harness discovery run); it regenerates this file, the rollback and the read-back byte for byte. The SQL is the reviewed artefact.
-- Order: AFTER 20261008100000 (live). INDEPENDENT of the staged 20261014100000 (no 820-3 row; O-3 is text-only analysis), 20261015130000 /
--   20261015150000 (DWA-M-820-1 only) and 20261015140000 (DWA-M-820-2 only): disjoint rows, own *_m820_c4q tables — proven in the harness.
-- RELAXES WHEN QUESTIONS ARE ASKED (no severity change) and turns 8 inputs into derived constants → owner go needed before the apply.
-- STAGED — not applied. Apply (from C:\\Users\\Ekowai\\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\\Users\\Ekowai\\_wt-m820-3g\\scripts\\migrations\\${ID}_m820_3_c4_qe_guards.sql
BEGIN;

-- ── 0 · pre-state guard: all ${NF} fields and ${NG} gates at sig0 (first run) or sig1 (re-run); anything else aborts the whole block ──
DO $guard$
DECLARE n_f int; n_g int; n_w int; n_x int;
BEGIN
  WITH fv(ws, sym, sig0, sig1) AS (VALUES
${fv})
  SELECT count(*) INTO n_f FROM fv JOIN standards s ON s.code = '${STD}' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fv.ws
    JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = fv.sym AND f.active
   WHERE ${FSIG()} IN (fv.sig0, fv.sig1);
  WITH gv(ws, code, sig0, sig1) AS (VALUES
${gv})
  SELECT count(*) INTO n_g FROM gv JOIN standards s ON s.code = '${STD}' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = gv.ws
    JOIN compliance_requirements cr ON cr.worksheet_template_id = w.id AND cr.code = gv.code
   WHERE ${GSIG()} IN (gv.sig0, gv.sig1);
${TOTALS_GUARD}
  IF n_f <> ${NF} OR n_g <> ${NG} OR n_w <> ${NE} OR n_x <> 0 THEN
    RAISE EXCEPTION '${ID} m820-3 c4 qe guards: pre-state mismatch (fields % of ${NF}, gates % of ${NG} at the expected signature; totals % of ${NE} with the expected widget; % foreign equations on a total). STOP and re-read read-back R0.', n_f, n_g, n_w, n_x;
  END IF;
END $guard$;

CREATE TABLE IF NOT EXISTS ${T.ga} AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS ${T.fa} AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS ${T.led} (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- ── A · ${NE} NEW equations <ws>-D10: the printed row count of the sheet's Anhang-B table as a constant (inserted only when the sheet has no
--       equation with that number or output; 'equations_new' is ledgered only for a row inserted by THIS run) ──
`;
for (const e of eqRows) {
  m += `-- NEW ${STD} ${e.ws} ${e.eqno}: ${e.sym} = ${e.n}
WITH ins AS (
INSERT INTO equations (worksheet_template_id, equation_number, formula, input_symbols, output_symbol, output_unit, clause_reference, description, verification_status, verification_quote)
SELECT w.id, '${e.eqno}', '${e.sym} = ${e.n}', ARRAY[]::text[], '${e.sym}', NULL, ${q(e.clause)},
       ${q(e.desc)},
       'imported_unverified', ${q(e.vq)}
  FROM worksheet_templates w JOIN standards s ON s.id = w.standard_id
 WHERE s.code = '${STD}' AND w.code = '${e.ws}'
   AND NOT EXISTS (SELECT 1 FROM equations e2 WHERE e2.worksheet_template_id = w.id AND (e2.equation_number = '${e.eqno}' OR e2.output_symbol = '${e.sym}'))
RETURNING *)
INSERT INTO ${T.led} (tbl, id, md5) SELECT 'equations_new', ins.id, md5(row_to_json(ins)::text) FROM ins;
`;
}
m += `
-- ── B · field rows (guard: visible_when + guard sentence DE/[EN] + verification_quote + source_anchor; items_total also derived; goal hints;
--       consumers) ──
`;
for (const r of fieldRows) {
  const sig = fsig0(r.ws, r.sym);
  const where = `f.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = '${STD}' AND w.code = '${r.ws}' AND f.symbol = '${r.sym}' AND f.active${r.extraWhere}
   AND ${FSIG()} = '${sig}'`;
  m += `-- ${STD} ${r.ws} ${r.sym} (${r.kind}): ${Object.keys(r.set).join(', ')}
INSERT INTO ${T.fa} SELECT f.* FROM fields f, worksheet_templates w, standards s
 WHERE ${where}
   AND NOT EXISTS (SELECT 1 FROM ${T.fa} a WHERE a.id = f.id);
UPDATE fields f
   SET ${Object.entries(r.set).map(([k, v]) => `${k} = ${v}`).join(',\n       ')}
  FROM worksheet_templates w, standards s
 WHERE ${where};
`;
}
m += `
-- ── C · gate rows (phase clause inside the existing condition + description; severity and clause_reference unchanged) ──
`;
for (const r of gateRows) {
  const sig = gsig0(r.ws, r.code);
  const where = `cr.worksheet_template_id = w.id AND w.standard_id = s.id AND s.code = '${STD}' AND w.code = '${r.ws}' AND cr.code = '${r.code}'
   AND ${GSIG()} = '${sig}'`;
  m += `-- ${STD} ${r.ws} ${r.code} (${r.sev}, stays ${r.sev}): condition, description
INSERT INTO ${T.ga} SELECT cr.* FROM compliance_requirements cr, worksheet_templates w, standards s
 WHERE ${where}
   AND NOT EXISTS (SELECT 1 FROM ${T.ga} a WHERE a.id = cr.id);
UPDATE compliance_requirements cr
   SET condition = ${q(r.condition)},
       description = ${q(r.description)}
  FROM worksheet_templates w, standards s
 WHERE ${where};
`;
}
m += `
-- ── ledger: md5 of every archived row as this block left it (the rollback restores only rows still in that state) ──
INSERT INTO ${T.led} (tbl, id, md5) SELECT 'compliance_requirements', x.id, md5(row_to_json(x)::text) FROM compliance_requirements x WHERE x.id IN (SELECT id FROM ${T.ga}) ON CONFLICT DO NOTHING;
INSERT INTO ${T.led} (tbl, id, md5) SELECT 'fields', x.id, md5(row_to_json(x)::text) FROM fields x WHERE x.id IN (SELECT id FROM ${T.fa}) ON CONFLICT DO NOTHING;

COMMIT;
`;
writeFileSync(`${WT}/scripts/migrations/${ID}_m820_3_c4_qe_guards.sql`, m);

const rb = `-- Rollback of scripts/migrations/${ID}_m820_3_c4_qe_guards.sql (DWA-M 820-3 case C4 F3 / F4 — QE assessment guards, derived totals).
-- Scoped and byte-equal: an archived row is restored ONLY while it is still exactly what the block wrote (md5 in ${T.led}); a row
-- edited since the apply is left alone (its archive + ledger rows stay and show in read-back R5). Only the columns the block writes are
-- restored (fields: visible_when, description, verification_quote, source_anchor, consumer_worksheets, is_required, widget · gates:
-- condition, description). The ${NE} equations the block INSERTED (<ws>-D10, qe*_items_total = N) are deleted only while each row is still
-- exactly as inserted. Saved project values are not touched: a total written by the browser engine / recompute stays saved (source_type
-- 'derived') on the field that becomes an input again — read-back R4 lists them.
-- Nothing is activated or deactivated. Restored archive / ledger rows are deleted; the tables stay (empty).
-- Independent of 20261014100000, 20261015130000, 20261015140000, 20261015150000 (disjoint rows, own tables): roll back in any order.
-- Run (from C:\\Users\\Ekowai\\_wt-g2t, which holds .env.local):
--   node scripts/apply-migration.mjs C:\\Users\\Ekowai\\_wt-m820-3g\\scripts\\rollback-${ID}-m820-3-c4-qe-guards.sql
BEGIN;

CREATE TABLE IF NOT EXISTS ${T.ga} AS SELECT * FROM compliance_requirements WHERE false;
CREATE TABLE IF NOT EXISTS ${T.fa} AS SELECT * FROM fields WHERE false;
CREATE TABLE IF NOT EXISTS ${T.led} (tbl text NOT NULL, id uuid NOT NULL, md5 text NOT NULL, PRIMARY KEY (tbl, id));

-- updated rows (only the columns the block writes)
UPDATE compliance_requirements x
   SET condition = a.condition, description = a.description
  FROM ${T.ga} a, ${T.led} w
 WHERE a.id = x.id AND w.tbl = 'compliance_requirements' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;
UPDATE fields x
   SET visible_when = a.visible_when, description = a.description, verification_quote = a.verification_quote, source_anchor = a.source_anchor,
       consumer_worksheets = a.consumer_worksheets, is_required = a.is_required, widget = a.widget
  FROM ${T.fa} a, ${T.led} w
 WHERE a.id = x.id AND w.tbl = 'fields' AND w.id = x.id AND md5(row_to_json(x)::text) = w.md5;

-- the inserted equations: deleted only while still exactly as inserted
DELETE FROM equations e USING ${T.led} w
 WHERE w.tbl = 'equations_new' AND e.id = w.id AND md5(row_to_json(e)::text) = w.md5;
DELETE FROM ${T.led} w WHERE w.tbl = 'equations_new' AND NOT EXISTS (SELECT 1 FROM equations e WHERE e.id = w.id);

-- clean-up: archive + ledger rows whose base row equals the archive again
DELETE FROM ${T.led} w USING compliance_requirements x, ${T.ga} a WHERE w.tbl = 'compliance_requirements' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM ${T.led} w USING fields x, ${T.fa} a WHERE w.tbl = 'fields' AND x.id = w.id AND a.id = w.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM ${T.ga} a USING compliance_requirements x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;
DELETE FROM ${T.fa} a USING fields x WHERE x.id = a.id AND row_to_json(x)::text = row_to_json(a)::text;

COMMIT;
`;
writeFileSync(`${WT}/scripts/rollback-${ID}-m820-3-c4-qe-guards.sql`, rb);

const guardedList = fieldRows.filter((r) => r.kind.includes('guard')).map((r) => `('${r.ws}', '${r.sym}')`).join(', ');
const allFieldList = fieldRows.map((r) => `('${r.ws}', '${r.sym}')`).join(', ');
const gateList = gateRows.map((r) => `('${r.ws}', '${r.code}')`).join(', ');
const drv = [];
for (const s of SHEETS) for (const a of ASSESS) drv.push(`('${s.p}_${a}', '${PHASES[s.ph].goals[0]}')`);
for (const sym of SUMMARY) drv.push(`('${sym}', 'pz_62_1_status')`);
const rbk = `-- Read-back for scripts/migrations/${ID}_m820_3_c4_qe_guards.sql (DWA-M 820-3 case C4 F3 / F4). READ ONLY.
-- Run BEFORE the apply (step 0: R0 … R4) and AFTER (R0 … R5). Expected values: vault 01-Projects/ekowai-wizard/m820-wizard-test/
-- 79_APPLY-ORDER-m820-3-c4-qe-guards.md and the harness tests/harness/m820-3-c4-qe-guards.integration.test.ts. Signatures sig0 come
-- = prod 2026-10-17 (regenerated; was the harness seed: 2026-10-05 dumps + every M820 block up to 20261008100000), sig1 from the harness after the apply.
-- Field signature = md5 of description md5 | visible_when | consumer_worksheets | enum md5 | label_de | label_en | is_required | data_type |
-- verification_quote md5 | source_anchor. Gate signature = md5 of condition | severity | description md5 | clause_reference.
-- No comment line ends with a semicolon.

-- R0 · touched rows at pre / post state (before: fields_pre ${NF}, gates_pre ${NG}, *_post 0, new_equations 0 · after: 0 / ${NF}, 0 / ${NG}, new_equations ${NE};
--      always: totals_widget_ok ${NE} (widget NULL at sig0 / 'derived' at sig1), foreign_total_equations 0)
WITH fv(ws, sym, sig0, sig1) AS (VALUES
${fv}),
gv(ws, code, sig0, sig1) AS (VALUES
${gv}),
${TOTALS_CTE},
fl AS (SELECT fv.*, ${FSIG()} AS sig
         FROM fv JOIN standards s ON s.code = '${STD}' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = fv.ws
         JOIN fields f ON f.worksheet_template_id = w.id AND f.symbol = fv.sym AND f.active),
gl AS (SELECT gv.*, ${GSIG()} AS sig
         FROM gv JOIN standards s ON s.code = '${STD}' JOIN worksheet_templates w ON w.standard_id = s.id AND w.code = gv.ws
         JOIN compliance_requirements cr ON cr.worksheet_template_id = w.id AND cr.code = gv.code)
SELECT (SELECT count(*) FROM fl) AS fields,
       (SELECT count(*) FROM fl WHERE sig = sig0) AS fields_pre,
       (SELECT count(*) FROM fl WHERE sig = sig1) AS fields_post,
       (SELECT count(*) FROM gl) AS gates,
       (SELECT count(*) FROM gl WHERE sig = sig0) AS gates_pre,
       (SELECT count(*) FROM gl WHERE sig = sig1) AS gates_post,
       (SELECT string_agg(ws || ' ' || sym, ',') FROM fl WHERE sig <> sig0 AND sig <> sig1) AS fields_neither,
       (SELECT string_agg(ws || ' ' || code, ',') FROM gl WHERE sig <> sig0 AND sig <> sig1) AS gates_neither,
       (SELECT count(*) FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id
         WHERE s.code = '${STD}' AND e.equation_number IN (${eqRows.map((e) => `'${e.eqno}'`).join(', ')})) AS new_equations,
       (${N_W('')}) AS totals_widget_ok,
       (${N_X('')}) AS foreign_total_equations;

-- R1 · rule columns of the guarded rows + the gates (before: no visible_when, items_total required and typed · after: phase clause, items_total derived)
SELECT w.code AS ws, 'field' AS kind, f.symbol AS item, left(coalesce(f.visible_when, ''), 120) AS rule, coalesce(array_to_string(f.consumer_worksheets, ','), '') AS consumers, f.is_required::text || '/' || coalesce(f.widget, '-') AS req_or_sev
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = '${STD}' AND f.active AND (w.code, f.symbol) IN (${allFieldList})
UNION ALL
SELECT w.code, 'gate', cr.code, left(cr.condition, 120), coalesce(cr.clause_reference, ''), cr.severity
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = '${STD}' AND (w.code, cr.code) IN (${gateList})
 ORDER BY 1, 2, 3;

-- R2 · any time: saved values on the guarded fields per field (after the apply such a value stays saved; it is hidden while no goal of its phase is assessed)
SELECT w.code AS ws, f.symbol, count(pp.id) AS saved_values
  FROM fields f JOIN worksheet_templates w ON w.id = f.worksheet_template_id JOIN standards s ON s.id = w.standard_id
  LEFT JOIN project_parameters pp ON pp.field_id = f.id
 WHERE s.code = '${STD}' AND f.active AND (w.code, f.symbol) IN (${guardedList})
 GROUP BY 1, 2 ORDER BY 1, 2;

-- R3 · any time: 820-3 gates that read a guarded symbol WITHOUT a goal of its phase in the condition (before: REQ-19, REQ-20, REQ-21, REQ-22, REQ-23, REQ-24 · after: 0 rows)
WITH g(sym, drv) AS (VALUES ${drv.join(', ')})
SELECT w.code AS ws, cr.code, cr.severity, g.sym, g.drv
  FROM compliance_requirements cr JOIN worksheet_templates w ON w.id = cr.worksheet_template_id JOIN standards s ON s.id = w.standard_id, g
 WHERE s.code = '${STD}' AND cr.condition ~ ('(^|[^a-z0-9_])' || g.sym || '($|[^a-z0-9_])') AND cr.condition !~ ('(^|[^a-z0-9_])' || g.drv || '($|[^a-z0-9_])')
   AND cr.condition !~ ('(^|[^a-z0-9_])pz_6' || substr(g.drv, 5, 1) || '_[0-9]+_status($|[^a-z0-9_])')
 ORDER BY 1, 2, 4;

-- R4 · any time: the new equations (before: 0 rows · after: ${NE}) and saved values on the ${NE} total fields (what stays saved after a rollback)
SELECT w.code AS ws, e.equation_number, e.formula, (SELECT count(*) FROM project_parameters pp JOIN fields f ON f.id = pp.field_id
         WHERE f.worksheet_template_id = w.id AND f.symbol = e.output_symbol) AS saved_values
  FROM equations e JOIN worksheet_templates w ON w.id = e.worksheet_template_id JOIN standards s ON s.id = w.standard_id
 WHERE s.code = '${STD}' AND e.equation_number IN (${eqRows.map((e) => `'${e.eqno}'`).join(', ')})
 ORDER BY 1, 2;

-- R5 · after the apply only (the tables exist from then on): archives and ledger (expect ${NG} / ${NF} / ${NG + NF + NE}, of which equations_new ${NE})
SELECT (SELECT count(*) FROM ${T.ga}) AS gate_archive, (SELECT count(*) FROM ${T.fa}) AS field_archive,
       (SELECT count(*) FROM ${T.led}) AS written, (SELECT count(*) FROM ${T.led} WHERE tbl = 'equations_new') AS written_new;
`;
writeFileSync(`${WT}/scripts/verification/apply/readback-${ID}-m820-3-c4-qe-guards.sql`, rbk);

console.log({ NF, NG, NE, pendingSig1: !Object.keys(SIG1).length });
