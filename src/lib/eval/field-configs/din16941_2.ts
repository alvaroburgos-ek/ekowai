/**
 * DIN-EN-16941-2 — Plan 3 Task 15 field configs (Grauwasserquellen /
 * Bedarfsstellen / Speichereinrichtungen / Probenahmen registers, the created
 * selects `speicher_lage` / `nachspeisung_medium_16941` / `richtwert_spalte`,
 * the Anhang-B and Anhang-D text fills, the `berechnungsverfahren` /
 * `anlagentyp` / `rueckflusssicherung_typ` / boolean-driven visibility) as DATA
 * for `scripts/regulation-tables/emit-field-configs-sql.ts din16941_2`.
 *
 * Every `verification_quote` is lifted verbatim from the transcript
 * `Desktop\Guidelines\DWA DIN Scribd\DIN-EN-16941-2\DIN-EN-16941-2.md` (the `Q`
 * spans of the seed module, line in the key). Prod facts come from the
 * captured `din16941_2.prior.json` (2026-09-18, read-only): 5 worksheets with
 * the sections A … / K / M; -01 A Zweck (vorgesehene_nutzung) · C Funktionale
 * Elemente (anlagentyp, grauwasser_herkunft); -02 B Sammlung · C Behandlung ·
 * D Speicherung · E Nachspeisung · F Pumpen · G Steuerung · H Verteilung; -03
 * B Eingangsparameter (n) · C Berechnungsverfahren · D Ertrag (Gl. 1) · E Bedarf
 * (Gl. 2) · J Ausgabe; -04 B Einbau · C Kennzeichnung · D Inbetriebnahme · E
 * Prüfung der Wasserqualität · L Freigabe; -05 B Qualität/Risiko · C Wartung.
 *
 * Placement facts that shaped this module (the capture, not the brief):
 *   - `vorgesehene_nutzung` (-01 A) is consumed by -02 / -03 ONLY — never by
 *     -04, where the water-quality check lives. The Anhang-D Richtwerte are
 *     therefore keyed on a CREATED select `richtwert_spalte` on -04 (the four
 *     PRINTED columns of Tab. D.1 / D.2, incl. the Sprühanwendung column prod
 *     has no token for); deriving it from `vorgesehene_nutzung` + a spray flag
 *     is STAGED (din16941_2-D-2 with the consumer edit C-1). Everything on -04
 *     computes today.
 *   - Tab. A.2 prints five sources, Gl. (1) names six (Waschbecken Q_HWB has no
 *     printed Größenordnung): the Grauwasserquellen register keys `quelle` as a
 *     plain enum over the six prod `grauwasser_herkunft` tokens and reads the
 *     legend table GL1_LEGENDE (Q·t·u vs V·u) and the Tab.-A.2 hint by
 *     `lookup()` in row scope — the Waschbecken row simply shows no hint
 *     (din16941_2-J-5). SR-2: the printed ranges are hints (badge), never fills
 *     and never limits; the prod validation_rules that hard-limit them are
 *     din16941_2-G-1.
 *   - the two multi-select carriers (`grauwasser_herkunft` -01, consumed by
 *     -02; `behandlungsstufen` -02) are NOT re-bound here: a DB
 *     `widget='select_many'` on an ENUM field renders the ChecklistEditor, which
 *     writes `{type:'json'}` while `extractValue(p, 'enum')` reads `valueEnum`
 *     on reload — the selections would be lost silently, and the -02 consumer
 *     would inherit null. Not fail-safe (amendment J) → the whole switch
 *     (data_type enum → json + widget + ui_config + value migration) is STAGED
 *     as din16941_2-S-1.
 *   - the 23 Gl.-1 / Gl.-2 input scalars are consumer-free, but they feed Y_G /
 *     D_G which the block gate CR-12 reads (`Y_G IS NOT NULL AND …`); hiding
 *     them under `vereinfacht` would make CR-12 unpassable for every
 *     vereinfacht project (today an engineer can still type them) — an
 *     enforcement change → STAGED with the Gl.-1/2 re-point (din16941_2-G-9 /
 *     R-1 / R-2). The method switch is emitted on the CREATED registers,
 *     outputs and Tab.-A.1 twins only.
 *
 * Deliberately NOT here (each on the sign-off sheet; STAGED SQL in
 * scripts/verification/din16941_2-STAGED-plan3-rulings.sql):
 *   - `rueckflusssicherung_typ` ← Trinkwasser-Nachspeisung: read by the
 *     unguarded gate CR-08 → din16941_2-G-2 (gate rewrite + rule);
 *   - `abstand_wurzeln_m` (-04) ← unterirdisch: read by CR-13, and
 *     `speicher_lage` is created on -02 (not inherited on -04) → G-3;
 *   - `pumpe_trockenlaufschutz` ← pumpe_erforderlich: read by CR-09 → G-7;
 *   - `bewertung_status` (manual enum, consumed by -05, read by CR-17) — the
 *     register's `status_letzte_probe` is the derived twin → D-1.
 */
import type { FieldConfigEntry, FieldConfigModule, SectionVisibilityEntry } from './types';
import { Q, RICHTWERT_SPALTEN, GL1_QUELLEN } from '../regulation-tables-seed-din16941_2';

const STD = 'DIN-EN-16941-2';

const on = (worksheet: string) => (e: Omit<FieldConfigEntry, 'standard' | 'worksheet'>): FieldConfigEntry => ({ standard: STD, worksheet, ...e });
const WS01 = on('DIN-EN-16941-2-01');
const WS02 = on('DIN-EN-16941-2-02');
const WS03 = on('DIN-EN-16941-2-03');
const WS04 = on('DIN-EN-16941-2-04');

export const DIFFERENZIERT = "berechnungsverfahren == 'differenziert'";
export const VEREINFACHT = "berechnungsverfahren == 'vereinfacht'";
export const SPRUEH = "richtwert_spalte == 'sprueh'";
export const DIREKT = "anlagentyp == 'direkt'";
export const TRINKWASSER = "nachspeisung_medium_16941 == 'trinkwasser'";
export const AA = "rueckflusssicherung_typ == 'AA'";

/** Gl. (1) term per source (L560–L561): Q·t·u for the flow-based sources (Dusche, Waschbecken, Küchenspüle — legend L569–L585), V·u for the volume-based ones; `mit_dauer` comes from GL1_LEGENDE. */
export const ERTRAG_ROW_EXPR = 'if(mit_dauer == 1, q_or_v * t_x * u_x, q_or_v * u_x)';
/** Tab. A.2 / A.3 hint badge (SR-2 — informative, never a limit); null (no badge) for a source without a printed row. */
const inHint = (table: string, keyCol: string, value: string) => `if(${value} >= lookup('${table}', ${keyCol}, 'min') AND ${value} <= lookup('${table}', ${keyCol}, 'max'), 1, 0)`;

/** Tab. D.3 bands (L884–L886) for a bacteriological parameter: < G grün (1), G bis 10 G gelb (2), > 10 G rot (3);
 *  a printed "Nicht nachweisbar" Richtwert has no numeric G — any detection exceeds it (rot, din16941_2-J-2), 0 KBE is grün;
 *  a printed "N/A" (Legionella outside Sprühanwendung) or an unmeasured optional parameter is 0 = nicht bewertet. */
const d3 = (col: string, param: string, optional = false) => {
  const g = `lookup('TABD1', richtwert_spalte, '${param}_g')`;
  const text = `lookup('TABD1', richtwert_spalte, '${param}_text')`;
  const bands = `if(${text} == 'Nicht nachweisbar', if(${col} == 0, 1, 3), if(${text} == 'N/A', 0, if(${col} < ${g}, 1, if(${col} <= 10 * ${g}, 2, 3))))`;
  return optional ? `if(${col} IS NULL, 0, ${bands})` : bands;
};
/** Tab. D.4 bands (L900–L901) for a "< G" system parameter: < G grün (1), otherwise gelb (2 — "= G" is not printed, din16941_2-J-4); "N/A" / unmeasured ⇒ 0. */
const d4 = (col: string, param: string) => {
  const g = `lookup('TABD2', richtwert_spalte, '${param}_max')`;
  const text = `lookup('TABD2', richtwert_spalte, '${param}_text')`;
  return `if(${col} IS NULL, 0, if(${text} == 'N/A', 0, if(${col} < ${g}, 1, 2)))`;
};
/** pH (L902): inside the printed range ⇒ grün, outside ⇒ gelb. */
const STATUS_PH_EXPR = "if(ph >= lookup('TABD2', richtwert_spalte, 'ph_min') AND ph <= lookup('TABD2', richtwert_spalte, 'ph_max'), 1, 2)";
/** Rest-Brom (L873): the Sprüh / Garten cells print "0,0" without a comparator (din16941_2-J-3) — encoded as = 0 grün, > 0 gelb; the "< 5,0" cells follow Tab. D.4. */
const STATUS_BROM_EXPR = "if(rest_brom IS NULL, 0, if(lookup('TABD2', richtwert_spalte, 'rest_brom_text') == '0,0', if(rest_brom <= 0, 1, 2), if(rest_brom < lookup('TABD2', richtwert_spalte, 'rest_brom_max'), 1, 2)))";
/** Worst status of the sample (0 nicht bewertet · 1 grün · 2 gelb · 3 rot). */
export const STATUS_MAX_EXPR = 'max(max(max(status_ecoli, status_enterokokken), max(status_legionella, status_coliforme)), max(max(status_truebung, status_ph), max(status_chlor, status_brom)))';
const STATUS_LABELS = { '0': 'n. a. / nicht gemessen', '1': 'grün', '2': 'gelb', '3': 'rot' };

/** L292 — Werkstoffe der Speichereinrichtung; tokens = prod `speicher_werkstoff` (capture). */
const WERKSTOFFE = [
  { value: 'beton', label: 'Beton' }, { value: 'stahl', label: 'Stahl' }, { value: 'pvc_u', label: 'Polyvinylchlorid (PVC-U)' },
  { value: 'pe', label: 'Polyethylen (PE)' }, { value: 'pp', label: 'Polypropylen (PP)' }, { value: 'grp_up', label: 'glasfaserverstärkter Kunststoff (GRP-UP)' },
] as const;

const quelleLabels = Object.fromEntries(GL1_QUELLEN.map((s) => [s.value, s.label_de]));

/** One Anhang-D text fill on -04 E (role limit): the printed Richtwert cell of the selected column, verbatim. */
const richtwert = (symbol: string, table: 'TABD1' | 'TABD2', value: string, label: string, unit: string | null, quote: string, extra: Partial<FieldConfigEntry> = {}): FieldConfigEntry => WS04({
  symbol, widget: 'lookup_fill', ui_config: { source_label: table === 'TABD1' ? 'Tab. D.1' : 'Tab. D.2' },
  lookup: { table_code: table, role: 'limit', keys: [{ column: 'nutzung', from_symbol: 'richtwert_spalte' }], value },
  verification_quote: quote, ...extra,
  create: { section_code: 'E', label_de: label, data_type: 'text', unit, clause_reference: table === 'TABD1' ? 'Anhang D, Tab. D.1' : 'Anhang D, Tab. D.2',
    description: `Plan 3: Richtwert G der gewählten Spalte von ${table === 'TABD1' ? 'Tabelle D.1' : 'Tabelle D.2'} (locked — Mindestanforderung, strengere nationale Vorgaben haben Vorrang: din16941_2-O-1); Vergleichsgröße der Statusableitung im Register probenahmen (Tab. D.3 / D.4).` },
});

export const FIELD_CONFIGS: FieldConfigEntry[] = [
  // ---- -01: Anhang B by anlagentyp (own worksheet) ----
  WS01({
    symbol: 'anlagentyp_beschreibung', widget: 'lookup_fill', ui_config: { source_label: 'Anhang B' },
    lookup: { table_code: 'ANHANGB', role: 'value', keys: [{ column: 'anlagentyp', from_symbol: 'anlagentyp' }], value: 'beschreibung' },
    verification_quote: Q.L787,
    create: { section_code: 'C', label_de: 'Anlagenart nach Anhang B — Beschreibung', data_type: 'text', unit: null, clause_reference: 'Anhang B; §5.1',
      description: 'Plan 3: aus dem gewählten Anlagentyp gefüllt (informativ, anhaltswert).' },
  }),
  WS01({
    symbol: 'anlagentyp_nutzungsbeschraenkung', widget: 'lookup_fill', ui_config: { source_label: 'Anhang B a)' }, visible_when: DIREKT, // L794
    lookup: { table_code: 'ANHANGB', role: 'limit', keys: [{ column: 'anlagentyp', from_symbol: 'anlagentyp' }], value: 'nutzungsbeschraenkung' },
    verification_quote: Q.L794,
    create: { section_code: 'C', label_de: 'Nutzungsbeschränkung ohne Behandlung (Anhang B a): unterirdische Bewässerung und Anwendungen ohne Versprühen)', data_type: 'text', unit: null, clause_reference: 'Anhang B a)',
      description: 'Plan 3: nur sichtbar für Anlagen für die direkte Nutzung; die Nutzungsprüfung gegen die gewählte Richtwertspalte (Sprühanwendung ausgeschlossen) ist STAGED (din16941_2-G-6).' },
  }),
  WS01({
    symbol: 'direktnutzung_scope_bestaetigt', widget: 'attestation', ui_config: null, visible_when: DIREKT, // L140 + L794
    verification_quote: `${Q.L140} — ${Q.L794}`,
    create: { section_code: 'C', label_de: 'Direkte Nutzung ohne Behandlung: Anwendungsbereich geprüft — direkte Anwendungssysteme ohne Aufbereitung sind vom Anwendungsbereich dieses Dokuments ausgenommen (§1); Nutzung auf unterirdische Bewässerung und Anwendungen ohne Versprühen beschränkt (Anhang B a))', data_type: 'boolean', unit: null, clause_reference: '§1; Anhang B a)',
      description: 'Plan 3: Attest für den Konflikt zwischen dem prod-Token anlagentyp = direkt und dem §1-Ausschluss; Gate STAGED (din16941_2-G-6).' },
  }),

  // ---- -02 D: Speicherung ----
  WS02({
    symbol: 'speicher_lage', widget: 'select_one', ui_config: null,
    enum_values: [{ value: 'unterirdisch', label_de: 'Unterirdische Speichereinrichtung', order_index: 0 }, { value: 'oberirdisch', label_de: 'Oberirdische Speichereinrichtung', order_index: 1 }],
    verification_quote: `${Q.L306} — ${Q.L308}`,
    create: { section_code: 'D', label_de: 'Lage der Speichereinrichtung (unterirdisch: Höchstlasten nach §5.4.5 / Mindestabstand 3 m zu Wurzeln nach §7; oberirdisch: hydrostatischer Druck nach §5.4.5)', data_type: 'enum', unit: null, clause_reference: '§5.4.5, §7',
      description: 'Plan 3: Treiber für die bedingten Anforderungen an unterirdische Speichereinrichtungen; CR-13 (abstand_wurzeln_m ≥ 3 auf -04) bedingt zu machen und die Vererbung auf -04 sind STAGED (din16941_2-G-3).' },
  }),
  WS02({
    symbol: 'speichereinrichtungen', widget: 'register',
    ui_config: {
      title: 'Speichereinrichtungen für behandeltes Grauwasser', subtitle: '§5.4 — je Speichereinrichtung eine Zeile; Einzelne Speichereinrichtungen dürfen miteinander verbunden werden (§5.4.3); Σ Nennkapazität → nennkapazitaet_sum', add_label: '+ Speichereinrichtung', placement: 'section',
      columns: [
        { key: 'bezeichnung', label: 'Bezeichnung', type: 'text', required: true },
        { key: 'werkstoff', label: 'Werkstoff (EN 12566-3)', type: 'enum', required: true, options: WERKSTOFFE.map((w) => w.value), option_labels: Object.fromEntries(WERKSTOFFE.map((w) => [w.value, w.label])) },
        { key: 'nennkapazitaet_l', label: 'Nennkapazität', type: 'number', unit: 'l', required: true, min: 0, aria_label: 'Nennkapazität der Speichereinrichtung (maximales zurückgehaltenes Wasservolumen, Herstellerangabe)' },
      ],
      footer: ['nennkapazitaet_sum', 'speicher_count'],
      note: `${Q.L296} ${Q.L300} ${Q.L302} Die Speichereinrichtung muss aus lichtundurchlässigem Werkstoff bestehen (§5.4.2).`,
    },
    verification_quote: `${Q.L296} — ${Q.L300}`,
    create: { section_code: 'D', label_de: 'Speichereinrichtungen (Bezeichnung · Werkstoff · Nennkapazität)', data_type: 'json', unit: null, clause_reference: '§5.4.2, §5.4.3, §5.4.4',
      description: 'Plan 3: Zeilen je Speichereinrichtung; Σ Nennkapazität → nennkapazitaet_sum (DIN-EN-16941-2-02-D1), Anzahl → speicher_count (-D2). Ablösung der Skalare nennkapazitaet (an -03 vererbt) und speicher_werkstoff STAGED (din16941_2-D-3 / D-6).' },
  }),
  WS02({
    symbol: 'nennkapazitaet_sum', widget: 'derived', ui_config: null, verification_quote: `${Q.L296} — ${Q.L300}`,
    create: { section_code: 'D', label_de: 'Nennkapazität gesamt — Summe der verbundenen Speichereinrichtungen (aus dem Register)', data_type: 'number', unit: 'l', clause_reference: '§5.4.3, §5.4.4',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-02-D1 (sum_rows über speichereinrichtungen.nennkapazitaet_l); das Eingabefeld nennkapazitaet bleibt — Ablösung STAGED (din16941_2-D-3).' },
  }),
  WS02({
    symbol: 'speicher_count', widget: 'derived', ui_config: null, verification_quote: Q.L296,
    create: { section_code: 'D', label_de: 'Anzahl der Speichereinrichtungen', data_type: 'number', unit: null, clause_reference: '§5.4.3',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-02-D2 (count_rows über speichereinrichtungen).' },
  }),
  WS02({
    symbol: 'personenzugang', widget: 'attestation', ui_config: null, verification_quote: Q.L327,
    create: { section_code: 'D', label_de: 'Personenzugang zur Speichereinrichtung vorgesehen (Maße nach EN 476)', data_type: 'boolean', unit: null, clause_reference: '§5.4.8',
      description: 'Plan 3: Ja = Maße nach EN 476 (Verweis, nicht kodiert); Nein = Öffnung mit mindestens 400 mm (zugang_oeffnung_mm wird sichtbar). Gate STAGED (din16941_2-G-4).' },
  }),
  WS02({
    symbol: 'zugang_oeffnung_mm', widget: 'scalar', ui_config: null, visible_when: 'personenzugang == false', // L327 "Wenn kein Personenzugang vorgesehen ist"
    verification_quote: Q.L327,
  }),

  // ---- -02 E: Nachspeisung und Rückflusssicherung ----
  WS02({
    symbol: 'nachspeisung_medium_16941', widget: 'select_one', ui_config: null, visible_when: 'nachspeisung_vorhanden == true', // L345
    enum_values: [{ value: 'trinkwasser', label_de: 'Trinkwasser', order_index: 0 }, { value: 'andere', label_de: 'kein Trinkwasser (andere Wasserquelle)', order_index: 1 }],
    verification_quote: `${Q.L345} — ${Q.L350}`,
    create: { section_code: 'E', label_de: 'Medium der Nachspeisung', data_type: 'enum', unit: null, clause_reference: '§5.5.1',
      description: 'Plan 3: Treiber der Trinkwasser-Bedingungen (§5.5.1 Sicherungseinrichtung, §5.5.2 Rückflusssicherung, Geruchsverschluss); CR-08 bedingt zu machen ist STAGED (din16941_2-G-2).' },
  }),
  WS02({
    symbol: 'geruchsverschluss_nachspeisung', widget: 'attestation', ui_config: null, visible_when: TRINKWASSER, // L350 + L395
    verification_quote: `${Q.L350} — ${Q.L395}`,
    create: { section_code: 'E', label_de: 'Geruchsverschluss vorgesehen, wo der Rückflussverhinderer die Speichereinrichtung direkt versorgt und Gerüche in das Gebäude gelangen können (§5.5.2)', data_type: 'boolean', unit: null, clause_reference: '§5.5.2',
      description: 'Plan 3: nur bei Nachspeisung mit Trinkwasser sichtbar (die Sicherungseinrichtung nach §5.5.2 gehört zur Trinkwasser-Nachspeisung).' },
  }),
  WS02({
    symbol: 'D_zulauf', widget: 'scalar', ui_config: null, visible_when: AA, // L377 / L378 (Bild 2, Typ AA)
    verification_quote: `${Q.L377} — ${Q.L378}`,
    create: { section_code: 'E', label_de: 'D — Innendurchmesser des Zuleitungsrohrs (Zulauföffnung) des freien Auslaufs AA', data_type: 'number', unit: 'mm', clause_reference: '§5.5.2, Bild 2',
      description: 'Plan 3: Eingabe für den Mindestabstand des freien Auslaufs A = max(2 · D, 20 mm) (DIN-EN-16941-2-02-D3); nur bei Rückflusssicherung Typ AA sichtbar.' },
  }),
  WS02({
    symbol: 'freier_auslauf_A_min', widget: 'derived', ui_config: null, visible_when: AA, verification_quote: Q.L377,
    create: { section_code: 'E', label_de: 'A — erforderlicher freier Auslauf (das Doppelte des Innendurchmessers der Zulauföffnung, mindestens 20 mm)', data_type: 'number', unit: 'mm', clause_reference: '§5.5.2, Bild 2',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-02-D3 (max(2 · D_zulauf, 20)); Gate „ausgeführter Auslauf ≥ A“ hat kein Ist-Feld (Beobachtung).' },
  }),
  WS02({
    symbol: 'ventilgesteuerte_zulaeufe', widget: 'attestation', ui_config: null, verification_quote: Q.L360,
    create: { section_code: 'E', label_de: 'Speichereinrichtung mit ventilgesteuerten Zuläufen', data_type: 'boolean', unit: null, clause_reference: '§5.5.1',
      description: 'Plan 3: Ja = Warnsystem erforderlich (warnsystem_ventilzulauf wird sichtbar), so dass jegliches Versagen leicht erkennbar ist.' },
  }),
  WS02({
    symbol: 'warnsystem_ventilzulauf', widget: 'attestation', ui_config: null, visible_when: 'ventilgesteuerte_zulaeufe == true', // L360
    verification_quote: Q.L360,
  }),

  // ---- -02 F: Pumpen ----
  WS02({
    symbol: 'pumpensteuerung_handnot', widget: 'attestation', ui_config: null, visible_when: 'pumpe_erforderlich == true', // L401 (Pumpen nur, wenn nicht durch Schwerkraft verteilt) + L461
    verification_quote: `${Q.L401} — ${Q.L461}`,
  }),

  // ---- -03 C: Berechnungsverfahren ----
  WS03({
    symbol: 'wohngebaeude_bestaetigt', widget: 'attestation', ui_config: null, visible_when: VEREINFACHT, // L543
    verification_quote: `${Q.L543} — ${Q.L521}`,
    create: { section_code: 'C', label_de: 'Vereinfachtes Verfahren: Wohngebäude bestätigt (nur für Wohngebäude anwendbar; Hotel, Wohnheim oder mehr als ein Grundstück → differenziertes Verfahren)', data_type: 'boolean', unit: null, clause_reference: '§6.2.1, §6.2.3',
      description: 'Plan 3: Attest zur Anwendbarkeit des vereinfachten Verfahrens; Gate STAGED (din16941_2-G-8).' },
  }),

  // ---- -03 D: Grauwasserertrag (Gl. 1) ----
  WS03({
    symbol: 'Y_G_vereinfacht', widget: 'derived', ui_config: null, visible_when: VEREINFACHT, verification_quote: `${Q.L547} — ${Q.L741}`,
    create: { section_code: 'D', label_de: 'Y_G — Grauwasserertrag nach dem vereinfachten Verfahren (Tabelle A.1: 60 l je Person und Tag · n)', data_type: 'number', unit: 'l/d', clause_reference: '§6.2.3, Anhang A Tab. A.1',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-03-D5 (n · lookup TABA1 ertrag, anhaltswert); die Übergabe an Y_G / CR-12 unter dem vereinfachten Verfahren ist STAGED (din16941_2-R-1).' },
  }),
  WS03({
    symbol: 'grauwasserquellen_16941', widget: 'register', visible_when: DIFFERENZIERT, // L519 / L543
    ui_config: {
      title: 'Grauwasserquellen (Gl. 1)', subtitle: 'je angeschlossener Quelle eine Zeile: Q (l/min) · t (min) · u (1/(p·d)) bei Dusche, Waschbecken und Küchenspüle; V (l) · u (1/(p·d)) bei Badewanne, Waschmaschine und Geschirrspüler — Σ je Person · n → Y_G_rows', add_label: '+ Grauwasserquelle', placement: 'section',
      columns: [
        { key: 'quelle', label: 'Quelle', type: 'enum', required: true, options: GL1_QUELLEN.map((s) => s.value), option_labels: quelleLabels },
        { key: 'mit_dauer', label: 'Term', type: 'derived', expr: "lookup('GL1_LEGENDE', quelle, 'mit_dauer')", value_labels: { '1': 'Q · t · u', '0': 'V · u' } },
        { key: 'hint', label: 'Tab. A.2 Größenordnung (Hinweis)', type: 'derived', expr: "lookup('TABA2', quelle, 'groessenordnung')" },
        { key: 'q_or_v', label: 'Q bzw. V', type: 'number', required: true, min: 0, aria_label: 'Grauwasserabfluss Q in l/min bzw. Wasservolumen V in l je Nutzung' },
        { key: 't_x', label: 't', type: 'number', unit: 'min', required: true, min: 0, visible_when: 'mit_dauer == 1', aria_label: 'Dauer je Nutzung in Minuten (Dusche, Waschbecken, Küchenspüle)' },
        { key: 'u_x', label: 'u', type: 'number', unit: '1/(p·d)', required: true, min: 0, aria_label: 'Häufigkeit der Nutzung je Person und je Tag' },
        { key: 'ertrag_row', label: 'Ertrag je Person', type: 'derived', expr: ERTRAG_ROW_EXPR, unit: 'l/(p·d)' },
        { key: 'in_hint', label: 'Tab. A.2', type: 'derived', expr: inHint('TABA2', 'quelle', 'q_or_v'), display: 'badge', value_labels: { '1': 'innerhalb der Größenordnung nach Tab. A.2', '0': 'außerhalb der Größenordnung nach Tab. A.2 (Hinweis, kein Grenzwert)' } },
      ],
      footer: ['Y_G_rows', 'quellen_count'],
      note: `${Q.L753} Die Größenordnungen der Tabelle A.2 sind Hinweise (SR-2), keine Grenzwerte; für das Waschbecken (Q_HWB) druckt die Norm keine Größenordnung. Zur Reduktion des Behandlungsaufwands sollte die Sammlung wie folgt präferiert werden: e) Duschen und Badewannen; f) Handwaschbecken; g) Waschmaschinen; h) Küchenspülen und/oder Geschirrspüler (§6.2.2). ${Q.L537}`,
    },
    verification_quote: `${Q.L557} — ${Q.L560_561}`,
    create: { section_code: 'D', label_de: 'Grauwasserquellen (Quelle · Q/V · t · u je Person)', data_type: 'json', unit: null, clause_reference: '§6.2.4.2, Gl. (1); Anhang A Tab. A.2',
      description: 'Plan 3: Zeilen je Grauwasserquelle; n · Σ Ertrag je Person → Y_G_rows (DIN-EN-16941-2-03-D1), Anzahl → quellen_count (-D2). Ablösung der 16 Skalare Q_S … u_DW und Umstellung der Gl. (1) STAGED (din16941_2-D-7 / R-1); nur beim differenzierten Verfahren sichtbar.' },
  }),
  WS03({
    symbol: 'Y_G_rows', widget: 'derived', ui_config: null, visible_when: DIFFERENZIERT, verification_quote: `${Q.L557} — ${Q.L567}`,
    create: { section_code: 'D', label_de: 'Y_G — Grauwasserertrag nach Gl. (1) aus dem Register (n · Σ Ertrag je Person)', data_type: 'number', unit: 'l/d', clause_reference: '§6.2.4.2, Gl. (1)',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-03-D1 (n · sum_rows über grauwasserquellen_16941.ertrag_row); die verifizierte Gl. (1) über die 16 Skalare bleibt — Umstellung STAGED (din16941_2-R-1).' },
  }),
  WS03({
    symbol: 'quellen_count', widget: 'derived', ui_config: null, visible_when: DIFFERENZIERT, verification_quote: Q.L560_561,
    create: { section_code: 'D', label_de: 'Anzahl der erfassten Grauwasserquellen', data_type: 'number', unit: null, clause_reference: '§6.2.4.2, Gl. (1)',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-03-D2 (count_rows über grauwasserquellen_16941).' },
  }),

  // ---- -03 E: Grauwasserbedarf (Gl. 2) ----
  WS03({
    symbol: 'D_G_vereinfacht', widget: 'derived', ui_config: null, visible_when: VEREINFACHT, verification_quote: `${Q.L547} — ${Q.L741}`,
    create: { section_code: 'E', label_de: 'D_G — Grauwasserbedarf nach dem vereinfachten Verfahren (Tabelle A.1 je Person und Tag · n, Spalte nach vorgesehene_nutzung: WC 35 / Wäsche 15 / andere 10)', data_type: 'number', unit: 'l/d', clause_reference: '§6.2.3, Anhang A Tab. A.1',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-03-D6 (n · lookup TABA1 nach der vererbten Einzelauswahl vorgesehene_nutzung — WC und/oder Wäsche sind mit einer Einzelauswahl nicht kombinierbar: din16941_2-J-1); die Übergabe an D_G / CR-12 ist STAGED (din16941_2-R-2).' },
  }),
  WS03({
    symbol: 'bedarfsstellen', widget: 'register', visible_when: DIFFERENZIERT,
    ui_config: {
      title: 'Bedarfsstellen (Gl. 2)', subtitle: 'je Bedarfsart eine Zeile (WC-Typ, Urinal, Waschmaschine): V (l je Spülung/Waschvorgang) · u (1/(p·d)) — n · Σ + V_misc → D_G_rows', add_label: '+ Bedarfsstelle', placement: 'section',
      columns: [
        { key: 'bezeichnung', label: 'Bezeichnung (z. B. WC-Typ)', type: 'text' },
        { key: 'bedarf', label: 'Bedarfsart', type: 'lookup_key', required: true, lookup: { table_code: 'TABA3' } },
        { key: 'hint', label: 'Tab. A.3 Größenordnung (Hinweis)', type: 'lookup_value', lookup: { table_code: 'TABA3', key_column: 'bedarf', value: 'groessenordnung' } },
        { key: 'v_x', label: 'V', type: 'number', unit: 'l', required: true, min: 0, aria_label: 'Wasservolumen je Spülung bzw. je Waschvorgang in Liter' },
        { key: 'u_x', label: 'u', type: 'number', unit: '1/(p·d)', required: true, min: 0, aria_label: 'Häufigkeit der Nutzung je Person und je Tag' },
        { key: 'bedarf_row', label: 'Bedarf je Person', type: 'derived', expr: 'v_x * u_x', unit: 'l/(p·d)' },
        { key: 'in_hint', label: 'Tab. A.3', type: 'derived', expr: inHint('TABA3', 'bedarf', 'v_x'), display: 'badge', value_labels: { '1': 'innerhalb der Größenordnung nach Tab. A.3', '0': 'außerhalb der Größenordnung nach Tab. A.3 (Hinweis, kein Grenzwert)' } },
      ],
      footer: ['D_G_rows', 'bedarfsstellen_count'],
      note: `${Q.L597} ${Q.L619} Die Größenordnungen der Tabelle A.3 sind Hinweise (SR-2), keine Grenzwerte.`,
    },
    verification_quote: `${Q.L595} — ${Q.L600}`,
    create: { section_code: 'E', label_de: 'Bedarfsstellen (Bedarfsart · V · u je Person)', data_type: 'json', unit: null, clause_reference: '§6.2.4.3, Gl. (2); Anhang A Tab. A.3',
      description: 'Plan 3: Zeilen je Bedarfsart; n · Σ Bedarf je Person + V_misc → D_G_rows (DIN-EN-16941-2-03-D3), Anzahl → bedarfsstellen_count (-D4). Ablösung der Skalare V_T … u_WM_d und Umstellung der Gl. (2) STAGED (din16941_2-D-8 / R-2); V_misc bleibt Skalar (§6.2.4.4); nur beim differenzierten Verfahren sichtbar.' },
  }),
  WS03({
    symbol: 'D_G_rows', widget: 'derived', ui_config: null, visible_when: DIFFERENZIERT, verification_quote: `${Q.L595} — ${Q.L600}`,
    create: { section_code: 'E', label_de: 'D_G — Grauwasserbedarf nach Gl. (2) aus dem Register (n · Σ Bedarf je Person + V_misc)', data_type: 'number', unit: 'l/d', clause_reference: '§6.2.4.3, Gl. (2)',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-03-D3 (n · sum_rows über bedarfsstellen.bedarf_row + V_misc); die verifizierte Gl. (2) über die Skalare bleibt — Umstellung STAGED (din16941_2-R-2).' },
  }),
  WS03({
    symbol: 'bedarfsstellen_count', widget: 'derived', ui_config: null, visible_when: DIFFERENZIERT, verification_quote: Q.L597,
    create: { section_code: 'E', label_de: 'Anzahl der erfassten Bedarfsstellen', data_type: 'number', unit: null, clause_reference: '§6.2.4.3, Gl. (2)',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-03-D4 (count_rows über bedarfsstellen).' },
  }),

  // ---- -03 J: Ausgabe ----
  WS03({
    symbol: 'bemessungswert_massgebend_calc', widget: 'derived', ui_config: null, verification_quote: Q.L511,
    create: { section_code: 'J', label_de: 'Maßgebender Bemessungswert — der niedrigste berechnete Wert für den Ertrag oder den Bedarf (min(Y_G, D_G))', data_type: 'number', unit: 'l/d', clause_reference: '§6.1',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-03-D7 (min über die Gl.-1/2-Ausgaben Y_G und D_G); das Eingabefeld bemessungswert_massgebend (an -02 / -04 vererbt, CR-12) bleibt — Ablösung STAGED (din16941_2-D-5).' },
  }),
  WS03({
    symbol: 'speicher_max_50', widget: 'derived', ui_config: null, verification_quote: Q.L511,
    create: { section_code: 'J', label_de: 'Speicherung in Höhe von bis zu 50 % des Tagesbedarfs (normalerweise ausreichend) — 0,5 · D_G', data_type: 'number', unit: 'l', clause_reference: '§6.1',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-03-D8 (0,5 · D_G); Vergleich mit der vererbten nennkapazitaet als Warn-Gate STAGED (din16941_2-G-5).' },
  }),

  // ---- -04 E: Prüfung der Wasserqualität — Anhang D ----
  WS04({
    symbol: 'richtwert_spalte', widget: 'select_one', ui_config: null,
    enum_values: RICHTWERT_SPALTEN.map((s, i) => ({ value: s.value, label_de: s.label_de, order_index: i })),
    verification_quote: `${Q.L695} — ${Q.L848}`,
    create: { section_code: 'E', label_de: 'Maßgebende Anwendung für die Richtwerte (Spalte der Tabellen D.1 / D.2; Sprühanwendung, wenn Hochdruckreinigung, Gartensprenger oder Autowäsche versorgt werden)', data_type: 'enum', unit: null, clause_reference: '§11, Anhang D Tab. D.1 / D.2',
      description: 'Plan 3: Treiber der Richtwert-Füllungen und der Statusableitung im Register probenahmen; die Ableitung aus vorgesehene_nutzung (auf -04 nicht vererbt) plus Sprüh-Flag ist STAGED (din16941_2-D-2 / C-1).' },
  }),
  richtwert('e_coli_G', 'TABD1', 'e_coli_text', 'Richtwert Escherichia coli (KBE/100 ml, Tab. D.1)', 'KBE/100 ml', Q.L852),
  richtwert('enterokokken_G', 'TABD1', 'enterokokken_text', 'Richtwert Intestinale Enterokokken (KBE/100 ml, Tab. D.1)', 'KBE/100 ml', Q.L853),
  richtwert('legionella_G', 'TABD1', 'legionella_text', 'Richtwert Legionella pneumophila (KBE/100 ml, Tab. D.1 — nur Sprühanwendung; Analyse, falls auf Grund der Gefährdungsabschätzung erforderlich)', 'KBE/100 ml', Q.L854, { visible_when: SPRUEH }),
  richtwert('coliforme_G', 'TABD1', 'coliforme_text', 'Richtwert Gesamt Coliforme (KBE/100 ml, Tab. D.1 — Indikator-Parameter zur Einsatzfähigkeit)', 'KBE/100 ml', `${Q.L855} — ${Q.L857}`),
  richtwert('truebung_G', 'TABD2', 'truebung_text', 'Richtwert Trübung (NTU, Tab. D.2; N/A bei Gartenbewässerung)', 'NTU', Q.L870),
  richtwert('ph_G', 'TABD2', 'ph_text', 'Richtwert pH (Tab. D.2)', null, Q.L871),
  richtwert('rest_chlor_G', 'TABD2', 'rest_chlor_text', 'Richtwert Rest-Chlor (mg/l, Tab. D.2 — alle Systeme, wenn verwendet)', 'mg/l', Q.L872),
  richtwert('rest_brom_G', 'TABD2', 'rest_brom_text', 'Richtwert Rest-Brom (mg/l, Tab. D.2 — alle Systeme, wenn verwendet)', 'mg/l', Q.L873),
  WS04({
    symbol: 'legionella_kbe', widget: 'scalar', ui_config: null, visible_when: SPRUEH, // L854: N/A outside Sprühanwendung
    verification_quote: Q.L854,
  }),
  WS04({
    symbol: 'truebung_ntu', widget: 'scalar', ui_config: null, visible_when: "richtwert_spalte != 'gartenbewaesserung'", // L870: N/A for Gartenbewässerung
    verification_quote: Q.L870,
  }),
  WS04({
    symbol: 'probenahmen', widget: 'register',
    ui_config: {
      title: 'Probenahmen — Prüfung der Wasserqualität (Anhang D)', subtitle: 'je Stichprobe eine Zeile; Status je Parameter nach Tabelle D.3 (bakteriologisch: < G grün · G bis 10 G gelb · > 10 G rot) und Tabelle D.4 (System: < G grün · sonst gelb; pH innerhalb des Bereichs grün) gegen die Richtwerte der gewählten Spalte', add_label: '+ Probenahme', placement: 'section',
      columns: [
        { key: 'datum', label: 'Datum der Probenahme', type: 'date', required: true },
        { key: 'ecoli', label: 'E. coli', type: 'number', unit: 'KBE/100 ml', required: true, min: 0, aria_label: 'Escherichia coli in KBE je 100 ml' },
        { key: 'enterokokken', label: 'Int. Enterokokken', type: 'number', unit: 'KBE/100 ml', required: true, min: 0, aria_label: 'Intestinale Enterokokken in KBE je 100 ml' },
        { key: 'legionella', label: 'Legionella pneumophila', type: 'number', unit: 'KBE/100 ml', required: true, min: 0, visible_when: SPRUEH, aria_label: 'Legionella pneumophila in KBE je 100 ml (Sprühanwendung)' },
        { key: 'coliforme', label: 'Gesamt Coliforme', type: 'number', unit: 'KBE/100 ml', required: true, min: 0, aria_label: 'Gesamt Coliforme in KBE je 100 ml' },
        { key: 'truebung', label: 'Trübung', type: 'number', unit: 'NTU', required: true, min: 0, visible_when: "richtwert_spalte != 'gartenbewaesserung'", aria_label: 'Trübung in NTU' },
        { key: 'ph', label: 'pH', type: 'number', required: true, aria_label: 'pH-Wert' },
        { key: 'rest_chlor', label: 'Rest-Chlor', type: 'number', unit: 'mg/l', min: 0, aria_label: 'Rest-Chlor in mg/l (wenn verwendet)' },
        { key: 'rest_brom', label: 'Rest-Brom', type: 'number', unit: 'mg/l', min: 0, aria_label: 'Rest-Brom in mg/l (wenn verwendet)' },
        { key: 'status_ecoli', label: 'Status E. coli', type: 'derived', expr: d3('ecoli', 'e_coli'), value_labels: STATUS_LABELS },
        { key: 'status_enterokokken', label: 'Status Enterokokken', type: 'derived', expr: d3('enterokokken', 'enterokokken'), value_labels: STATUS_LABELS },
        { key: 'status_legionella', label: 'Status Legionella', type: 'derived', expr: d3('legionella', 'legionella', true), value_labels: STATUS_LABELS },
        { key: 'status_coliforme', label: 'Status Coliforme', type: 'derived', expr: d3('coliforme', 'coliforme'), value_labels: STATUS_LABELS },
        { key: 'status_truebung', label: 'Status Trübung', type: 'derived', expr: d4('truebung', 'truebung'), value_labels: STATUS_LABELS },
        { key: 'status_ph', label: 'Status pH', type: 'derived', expr: STATUS_PH_EXPR, value_labels: STATUS_LABELS },
        { key: 'status_chlor', label: 'Status Rest-Chlor', type: 'derived', expr: d4('rest_chlor', 'rest_chlor'), value_labels: STATUS_LABELS },
        { key: 'status_brom', label: 'Status Rest-Brom', type: 'derived', expr: STATUS_BROM_EXPR, value_labels: STATUS_LABELS },
        { key: 'status_max', label: 'Ampel', type: 'derived', expr: STATUS_MAX_EXPR, display: 'badge', value_labels: { '0': 'nicht bewertet', '1': 'grün — System unter Kontrolle', '2': 'gelb — erneute Probenahme zur Bestätigung des Ergebnisses und Prüfen des Systembetriebs', '3': 'rot — Nutzung des Grauwassers ausschließen, bis Problem gelöst ist' } },
      ],
      footer: ['probenahmen_count', 'probenahmen_rot', 'probenahmen_gelb', 'status_letzte_probe'],
      note: `${Q.L697} ${Q.L703} ${Q.L889} — die Coliformen-Ausnahme (Fußnote b) ist nicht in den Status eingerechnet (rot bleibt; din16941_2-O-2). „Nicht nachweisbar“: jeder Nachweis überschreitet den Richtwert (rot, din16941_2-J-2). Der letzte vollständige Eintrag (Eingabereihenfolge) liefert status_letzte_probe.`,
    },
    verification_quote: `${Q.L697} — ${Q.L703}`,
    create: { section_code: 'E', label_de: 'Probenahmen (Datum · Messwerte · Status je Parameter · Ampel)', data_type: 'json', unit: null, clause_reference: '§11; Anhang D Tab. D.1–D.4',
      description: 'Plan 3: Zeilen je Stichprobe; Anzahl → probenahmen_count (DIN-EN-16941-2-04-D1), rote / gelbe Proben → probenahmen_rot / probenahmen_gelb (-D2 / -D3), Ampel der letzten Probe → status_letzte_probe (-D4). Ablösung der Einzelmesswerte ecoli_kbe … rest_brom und des manuellen bewertung_status (CR-17, an -05 vererbt) STAGED (din16941_2-D-4 / D-1).' },
  }),
  WS04({
    symbol: 'probenahmen_count', widget: 'derived', ui_config: null, verification_quote: Q.L697,
    create: { section_code: 'E', label_de: 'Anzahl der Probenahmen', data_type: 'number', unit: null, clause_reference: '§11',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-04-D1 (count_rows über probenahmen).' },
  }),
  WS04({
    symbol: 'probenahmen_rot', widget: 'derived', ui_config: null, verification_quote: Q.L886,
    create: { section_code: 'E', label_de: 'Probenahmen mit Status rot (Nutzung des Grauwassers ausschließen, bis Problem gelöst ist)', data_type: 'number', unit: null, clause_reference: '§11, Anhang D Tab. D.3',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-04-D2 (count_rows über probenahmen mit status_max == 3).' },
  }),
  WS04({
    symbol: 'probenahmen_gelb', widget: 'derived', ui_config: null, verification_quote: Q.L885,
    create: { section_code: 'E', label_de: 'Probenahmen mit Status gelb (erneute Probenahme zur Bestätigung des Ergebnisses und Prüfen des Systembetriebs)', data_type: 'number', unit: null, clause_reference: '§11, Anhang D Tab. D.3 / D.4',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-04-D3 (count_rows über probenahmen mit status_max == 2).' },
  }),
  WS04({
    symbol: 'status_letzte_probe', widget: 'derived', ui_config: null, verification_quote: `${Q.L703} — ${Q.L884}`,
    create: { section_code: 'E', label_de: 'Ampel der letzten Probenahme (1 grün · 2 gelb · 3 rot · 0 nicht bewertet)', data_type: 'number', unit: null, clause_reference: '§11, Anhang D Tab. D.3 / D.4',
      description: 'Plan 3: Ausgabe der Gleichung DIN-EN-16941-2-04-D4 (sum_rows über last_rows(probenahmen, 1) von status_max); der manuelle bewertung_status (gruen/gelb/rot, CR-17, an -05 vererbt) bleibt — Ableitung STAGED (din16941_2-D-1).' },
  }),
];

/** No section rules: every driver-bearing section of -02 / -03 / -04 either holds a gate-read symbol (CR-01…CR-11 on -02 B…G, CR-12 on -03, CR-13 … CR-17 on -04) or a consumed producer (bemessungswert_massgebend on -03 J, nennkapazitaet on -02 D); the method switch lives on the created register / output fields instead (din16941_2-G-9 for the 23 existing scalars). */
export const SECTION_VISIBILITY: SectionVisibilityEntry[] = [];

/** Type-level pin that this module has the shape the emitter's index expects. */
export const MODULE: FieldConfigModule = { FIELD_CONFIGS, SECTION_VISIBILITY };
