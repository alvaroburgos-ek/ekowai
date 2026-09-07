-- ============================================================================
-- SR-1 field-verification pack — DIN-EN-ISO-14044 (DIN EN ISO 14044, "Umweltmanagement — Ökobilanz — Anforderungen
--   und Anleitungen (ISO 14044:2006); Deutsche und Englische Fassung EN ISO 14044:2006"; DEUTSCHE NORM Oktober 2006,
--   i.e. DIN EN ISO 14044:2006-10, ICS 13.020.10; prod standards.version = "EN ISO 14044:2006 (ISO 14044:2006)";
--   standard id bd42b6db-884c-46d3-98b5-120c73076269). This is the LCA REQUIREMENTS standard — the parent of the
--   already-passed ISO-14046 water-footprint encoding.
-- Generated: 2026-09-05 — md-verified pass (owner ruling 2026-09-05: the markdown transcript is the verification
--   source; PDF only where no markdown exists). Grade: VC (SR-3), labelled as such on every row. Records EVIDENCE
--   only (verification_status / verification_quote / verification_note / verified_at); changes NO structure, no
--   enforcement and no required-ness — all of that sits in din-en-iso-14044-STAGED-rulings.sql, unapplied.
--
-- Source md: C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-EN-ISO-14044\DIN-EN-ISO-14044-D.md
--   (3111 lines, mathpix LaTeX transcript; read completely in chunks). The document is BILINGUAL (D/E): the German
--   and English texts run as ALTERNATING BLOCKS, not interleaved lines. LANGUAGE CONVENTION: every quote below is
--   the GERMAN column, verbatim, because the German column is the normative German-language text of this DIN
--   edition and it is the one that carries the "muss/müssen" vs "sollte" distinction the gates rely on. Runs joined
--   inside one clause are marked " | "; an omitted run inside one clause is marked "[...]". The ONE exception is
--   grouping_value_choice_statement (§5.3.2 d/e), where the German column of the transcript breaks off after item
--   a) and items b)–e) survive only in the English column — that row says so in its note.
--
--   Page convention: "printed p.N" is stated ONCE at the END of each quote. The md carries NO page markers at all
--   (no standalone number lines, no running headers). Pages were DERIVED, not guessed, in three steps:
--     (1) the standard's own Inhalt/Contents index (md lines 113–140) gives a printed page for every first- and
--         second-level clause: §1 p.7 · §2 p.8 · §3 p.8 · §4 p.15 · §4.1 p.15 · §4.2 p.15 · §4.3 p.23 · §4.4 p.33 ·
--         §4.5 p.45 · §5 p.54 · §5.1 p.54 · §5.2 p.55 · §5.3 p.58 · §6 p.59 · §6.1 p.59 · §6.2 p.60 · §6.3 p.60 ·
--         Anhang A p.61 · Anhang B p.65 · Bild 1 p.25 · Bild 2 p.32 · Bild 3 p.36 · Bild 4 p.47.
--     (2) cross-check against the mathpix image indices in the md: Bild 1 = image -29, Bild 2 = -36, Bild 3 = -40,
--         Bild 4 = -51 → PDF page = printed page + 4 at ALL FOUR figures, i.e. the index is internally consistent.
--     (3) for third-level sub-clauses the index has no entry, so the exact printed page of each quoted sentence was
--         read off the rendered PDF's own page-footer numbers (scoop pdftotext, German left column cropped) — the
--         page numbers below are therefore PDF-attested even though the TEXT is quoted from the md (VC per the
--         owner ruling; a full VA lift would require re-reading each sentence in the PDF, which this pass did not do).
--     Resulting clause→page map used here: §4.1 p.15 · §4.2.2 p.15 · §4.2.3.1 p.16 · §4.2.3.2 p.17 · §4.2.3.3.1 p.17 ·
--     §4.2.3.3.3 p.18 (its a)/b) cut-off list p.19) · §4.2.3.4 p.20 · §4.2.3.5 p.20 · §4.2.3.6.2 p.21 · §4.2.3.6.3 p.22 ·
--     §4.2.3.7 p.22 · §4.2.3.8 p.23 · §4.3.2.1 p.23 · §4.3.2.3 p.24 · §4.3.3.1 p.26 (heating-value sentence p.27) ·
--     §4.3.3.2 p.27 · §4.3.3.4 p.28 · §4.3.4.1 p.28 · §4.3.4.2 p.29 · §4.3.4.3.3 p.31 · §4.4.2.1 p.33 · §4.4.2.2.1 p.34 ·
--     §4.4.2.3 p.39 · §4.4.2.4 p.39 · §4.4.3.1 p.41 · §4.4.3.2.2 p.42 · §4.4.3.4 p.43 · §4.4.4.2 p.44 · §4.4.5 p.44
--     (weighting prohibition p.45) · §4.5.1.2 p.49 · §4.5.2.1 p.49 · §4.5.3.1 p.51 · §4.5.3.2 p.51 · §4.5.3.3 p.52 ·
--     §4.5.3.4 p.52 · §4.5.4 p.53 · §5.1.1 p.54 · §5.2 p.55 · §5.3.2 p.58 · §6.1 p.59 · §6.2 p.60 · §6.3 p.60.
--
-- Counts: 67 fields examined (6 worksheets) — 0 already verified · 67 quoted here · 0 app-metadata/exempt · 0 residue.
--   Equations: 1 (EQ-01) — already verification_status='verified_against_standard' with an ENGLISH source_quote and a
--   NULL verification_quote, so Section B is a QUOTE BACKFILL only (German §4.4.2.4 text); the status is not touched.
--   Gates: 17 (16 block, 1 warn) — read and checked against the md, NOT modified here; findings are in the STAGED file.
--   There are NO app-metadata fields on this standard: every one of the 67 is anchored in a printed clause, so the
--   'inferred_from_worksheet' exempt class is empty and no row carries a fabricated quote.
--
-- Nature of this standard, for the reader of the notes below: ISO 14044 prints essentially NO limit values. Its
--   normative content is duties on the STUDY and its REPORT ("muss dokumentiert/beschrieben/erläutert werden").
--   The only number in the whole body is "mindestens drei Mitgliedern" for a review panel (§6.3) — and that sits
--   under "sollte". Consequently every verification below is a clause-obligation quote, never a value check, and
--   the doctrinal risk here is a gate that BLOCKS a conforming study rather than a wrong number.
--
-- Rollback: rollback-din-en-iso-14044-md-verification-pack.sql
-- Runner: node scripts/verification/apply-pack.mjs scripts/verification/din-en-iso-14044-md-verification-pack.sql --dry-run
--   This file contains ONLY update statements. It carries no begin/commit/rollback — the runner supplies the
--   transaction and implements --dry-run by rolling it back.
-- ============================================================================


-- =============================== SECTION A — fields (67 rows) ===============================

-- ---------------------------------------------------------------------------------------------
-- DIN-EN-ISO-14044-01 — Festlegung des Ziels und des Untersuchungsrahmens (28 fields)
-- ---------------------------------------------------------------------------------------------

-- study_type — Art der Studie
update public.fields set verification_status='verified_against_standard', verification_quote='Ökobilanz-Studien müssen die Festlegung des Ziels und des Untersuchungsrahmens, die Sachbilanz, die Wirkungsabschätzung und die Auswertung der Ergebnisse enthalten. | Sachbilanz-Studien müssen die Festlegung des Ziels und des Untersuchungsrahmens, die Sachbilanz und die Auswertung der Ergebnisse enthalten. | Eine Sachbilanz-Studie allein darf nicht für Vergleiche benutzt werden, die für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt sind. — printed p.15', verification_note='md-verified 2026-09-05 (§4.1, printed p.15) [VC] — enum {lca,lci} matches the two study kinds the clause names', verified_at=now() where id='c0ead0ab-9b57-4369-a6e3-b1afc4716caa' and verification_status not in ('verified_against_standard','corrected');

-- intended_application — Beabsichtigte Anwendung
update public.fields set verification_status='verified_against_standard', verification_quote='Bei der Festlegung des Ziels einer Ökobilanz müssen die folgenden Punkte eindeutig festgelegt werden: - die beabsichtigte Anwendung; — printed p.15', verification_note='md-verified 2026-09-05 (§4.2.2, printed p.15) [VC]', verified_at=now() where id='a369afaa-c5ea-4e55-b950-ae62709b2d8e' and verification_status not in ('verified_against_standard','corrected');

-- study_reasons — Gründe für die Durchführung
update public.fields set verification_status='verified_against_standard', verification_quote='Bei der Festlegung des Ziels einer Ökobilanz müssen die folgenden Punkte eindeutig festgelegt werden: [...] - die Gründe für die Durchführung der Studie; — printed p.15', verification_note='md-verified 2026-09-05 (§4.2.2, printed p.15) [VC]', verified_at=now() where id='eab6bc9c-7e4e-4bb7-bf3b-fc64549f6690' and verification_status not in ('verified_against_standard','corrected');

-- intended_audience — Angesprochene Zielgruppe
update public.fields set verification_status='verified_against_standard', verification_quote='Bei der Festlegung des Ziels einer Ökobilanz müssen die folgenden Punkte eindeutig festgelegt werden: [...] - die angesprochene Zielgruppe, d. h. an wen sich die Ergebnisse der Studie richten sollen; — printed p.15', verification_note='md-verified 2026-09-05 (§4.2.2, printed p.15) [VC]', verified_at=now() where id='fa78e4ea-6c51-48be-abf8-2f9caa41faa9' and verification_status not in ('verified_against_standard','corrected');

-- comparative_assertion_public — Für veröffentlichte vergleichende Aussage bestimmt
update public.fields set verification_status='verified_against_standard', verification_quote='Bei der Festlegung des Ziels einer Ökobilanz müssen die folgenden Punkte eindeutig festgelegt werden: [...] - ob die Ergebnisse für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt sind. — printed p.15', verification_note='md-verified 2026-09-05 (§4.2.2, printed p.15) [VC]', verified_at=now() where id='f58c5104-a83e-4407-971f-3b3d8b028eca' and verification_status not in ('verified_against_standard','corrected');

-- product_system — Zu untersuchendes Produktsystem
update public.fields set verification_status='verified_against_standard', verification_quote='Bei der Festlegung des Untersuchungsrahmens einer Ökobilanz müssen folgende Punkte berücksichtigt und eindeutig beschrieben werden: - das zu untersuchende Produktsystem; — printed p.16', verification_note='md-verified 2026-09-05 (§4.2.3.1, printed p.16) [VC]', verified_at=now() where id='cafa1bc5-0fdd-45df-9e59-c28837a04985' and verification_status not in ('verified_against_standard','corrected');

-- system_functions — Funktionen des Produktsystems
update public.fields set verification_status='verified_against_standard', verification_quote='Der Untersuchungsrahmen einer Ökobilanz muss die Funktionen (Leistungsmerkmale) des untersuchten Systems eindeutig festlegen. — printed p.17', verification_note='md-verified 2026-09-05 (§4.2.3.2, printed p.17) [VC]', verified_at=now() where id='9ee3c4a2-febf-4147-b0ed-363342699a34' and verification_status not in ('verified_against_standard','corrected');

-- functional_unit — Funktionelle Einheit
update public.fields set verification_status='verified_against_standard', verification_quote='Die funktionelle Einheit muss dem Ziel und dem Untersuchungsrahmen der Studie entsprechen. Einer der Hauptzwecke einer funktionellen Einheit ist die Angabe einer Bezugsgröße, auf die die Input- und Outputdaten normiert werden (im mathematischen Sinn). Deshalb muss die funktionelle Einheit eindeutig definiert und messbar sein. — printed p.17', verification_note='md-verified 2026-09-05 (§4.2.3.2, printed p.17) [VC]', verified_at=now() where id='df206207-1c54-4ad6-9832-d170c211c347' and verification_status not in ('verified_against_standard','corrected');

-- reference_flow — Referenzfluss
update public.fields set verification_status='verified_against_standard', verification_quote='Nach der Auswahl der funktionellen Einheit muss der Referenzfluss festgelegt werden. Vergleiche zwischen Systemen müssen auf der Grundlage derselben Funktion(en), die mit derselben (denselben) funktionellen Einheit(en) in Form ihrer Referenzflüsse quantifiziert werden, vorgenommen werden. — printed p.17', verification_note='md-verified 2026-09-05 (§4.2.3.2, printed p.17) [VC] — data_type number/unit "-" is EKOWAIs; §3.29 defines the reference flow as a MEASURE of process outputs, without a unit', verified_at=now() where id='88cbddeb-4ed0-4a5f-ab3e-2c3a3b51c80f' and verification_status not in ('verified_against_standard','corrected');

-- system_boundary — Systemgrenze
update public.fields set verification_status='verified_against_standard', verification_quote='Die Systemgrenze legt fest, welche Prozessmodule in der Ökobilanz enthalten sein müssen. Die Auswahl der Systemgrenze muss mit dem Ziel der Studie übereinstimmen. Die zur Festlegung der Systemgrenze angewendeten Kriterien müssen beschrieben und erläutert werden. — printed p.17', verification_note='md-verified 2026-09-05 (§4.2.3.3.1, printed p.17) [VC]', verified_at=now() where id='0cd25d82-e035-428e-823b-429c8a5a8af5' and verification_status not in ('verified_against_standard','corrected');

-- cutoff_criteria — Abschneidekriterien
update public.fields set verification_status='verified_against_standard', verification_quote='Die Abschneidekriterien für die Ersterfassung von Inputs und Outputs sowie die Annahmen, unter denen die Abschneidekriterien aufgestellt werden, müssen eindeutig beschrieben werden. Im Abschlussbericht müssen auch die Auswirkungen der gewählten Abschneidekriterien auf das Ergebnis der Studie abgeschätzt und beschrieben werden. — printed p.18', verification_note='md-verified 2026-09-05 (§4.2.3.3.3, printed p.18) [VC]', verified_at=now() where id='690ca38b-2edc-49fd-ad2a-a38cf672748d' and verification_status not in ('verified_against_standard','corrected');

-- cutoff_mass_pct — Massen-Abschneidegrenze
update public.fields set verification_status='verified_against_standard', verification_quote='a) Masse: Bei der Anwendung der Masse als ein Kriterium ist die Aufnahme aller Inputs in die Studie erforderlich, die kumulativ mehr als einen festgelegten prozentualen Anteil zum Masseninput des zu modellierenden Produktsystems beitragen. — printed p.19', verification_note='md-verified 2026-09-05 (§4.2.3.3.3 a), printed p.19) [VC] — the standard prints NO numeric threshold — "einen festgelegten prozentualen Anteil" is set by the practitioner (engineer_input), so no limit value can be encoded', verified_at=now() where id='2e20b8e5-be61-40c9-ae2f-71eaf01ceaee' and verification_status not in ('verified_against_standard','corrected');

-- cutoff_energy_pct — Energie-Abschneidegrenze
update public.fields set verification_status='verified_against_standard', verification_quote='b) Energie: In gleicher Weise ist bei der Anwendung der Energie als ein Kriterium die Aufnahme aller Inputs in die Studie erforderlich, die kumulativ mehr als einen festgelegten prozentualen Anteil zum Energieinput des Produktsystems beitragen. — printed p.19', verification_note='md-verified 2026-09-05 (§4.2.3.3.3 b), printed p.19) [VC] — no numeric threshold printed — engineer_input', verified_at=now() where id='c8f53d66-1d51-46f3-baad-ba5b02341f97' and verification_status not in ('verified_against_standard','corrected');

-- lcia_methodology — LCIA-Methodik & Wirkungskategorien
update public.fields set verification_status='verified_against_standard', verification_quote='Es muss bestimmt werden, welche Wirkungskategorien, Wirkungsindikatoren und Charakterisierungsmodelle in der Ökobilanz-Studie berücksichtigt sind. Die Auswahl der in der Methode für die Wirkungsabschätzung verwendeten Wirkungskategorien, Wirkungsindikatoren und Charakterisierungsmodelle muss in Übereinstimmung mit dem Ziel der Studie erfolgen und wie in 4.4.2.2 beschrieben berücksichtigt werden. — printed p.20', verification_note='md-verified 2026-09-05 (§4.2.3.4, printed p.20) [VC]', verified_at=now() where id='4ab1dba2-294e-4f41-920d-60299bf52466' and verification_status not in ('verified_against_standard','corrected');

-- data_sources — Datentypen und -quellen
update public.fields set verification_status='verified_against_standard', verification_quote='Die für eine Ökobilanz ausgewählten Daten hängen vom Ziel und vom Untersuchungsrahmen der Studie ab . Diese Daten können an den Produktionsstandorten gesammelt werden, die den Prozessmodulen innerhalb der Systemgrenze zugeordnet sind, oder sie können anderen Quellen entnommen oder aus diesen errechnet werden. In der Praxis können alle Datenkategorien eine Mischung gemessener, errechneter oder geschätzter Daten enthalten. — printed p.20', verification_note='md-verified 2026-09-05 (§4.2.3.5, printed p.20) [VC]', verified_at=now() where id='e6abd75c-83d9-4916-a494-4434cb6685c5' and verification_status not in ('verified_against_standard','corrected');

-- dq_time_coverage — Zeitbezogener Erfassungsbereich
update public.fields set verification_status='verified_against_standard', verification_quote='Bei den Anforderungen an die Datenqualität sollte Folgendes berücksichtigt werden: a) den zeitbezogenen Erfassungsbereich: das Alter der Daten und das kleinste Zeitintervall, über das die Daten gesammelt werden sollten; | Wenn eine Studie für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt ist, müssen die in a) bis j) festgelegten Anforderungen an die Datenqualität berücksichtigt werden. — printed p.21', verification_note='md-verified 2026-09-05 (§4.2.3.6.2 a), printed p.21) [VC]', verified_at=now() where id='80faf351-d975-417f-857b-046501de8836' and verification_status not in ('verified_against_standard','corrected');

-- dq_geo_coverage — Geographischer Erfassungsbereich
update public.fields set verification_status='verified_against_standard', verification_quote='Bei den Anforderungen an die Datenqualität sollte Folgendes berücksichtigt werden: b) den geographischen Erfassungsbereich: geographischer Bereich, aus dem Daten für Prozessmodule gesammelt werden sollten, um das Ziel der Studie zu erfüllen; | Wenn eine Studie für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt ist, müssen die in a) bis j) festgelegten Anforderungen an die Datenqualität berücksichtigt werden. — printed p.21', verification_note='md-verified 2026-09-05 (§4.2.3.6.2 b), printed p.21) [VC]', verified_at=now() where id='04d30391-5ee6-4489-9806-ea61984f2925' and verification_status not in ('verified_against_standard','corrected');

-- dq_tech_coverage — Technologischer Erfassungsbereich
update public.fields set verification_status='verified_against_standard', verification_quote='Bei den Anforderungen an die Datenqualität sollte Folgendes berücksichtigt werden: c) den technologischen Erfassungsbereich: spezifische Technologie oder Technologiemix; | Wenn eine Studie für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt ist, müssen die in a) bis j) festgelegten Anforderungen an die Datenqualität berücksichtigt werden. — printed p.21', verification_note='md-verified 2026-09-05 (§4.2.3.6.2 c), printed p.21) [VC]', verified_at=now() where id='0c841e9b-5904-41e8-8824-7396647e75cf' and verification_status not in ('verified_against_standard','corrected');

-- dq_precision — Präzision
update public.fields set verification_status='verified_against_standard', verification_quote='Bei den Anforderungen an die Datenqualität sollte Folgendes berücksichtigt werden: d) die Präzision: Maß für die Schwankungsbreite der Werte für alle angegebenen Daten (z. B. Varianz); | Wenn eine Studie für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt ist, müssen die in a) bis j) festgelegten Anforderungen an die Datenqualität berücksichtigt werden. — printed p.21', verification_note='md-verified 2026-09-05 (§4.2.3.6.2 d), printed p.21) [VC]', verified_at=now() where id='ca18195e-b1bc-4564-a58a-5c3f4951a787' and verification_status not in ('verified_against_standard','corrected');

-- dq_completeness — Vollständigkeit
update public.fields set verification_status='verified_against_standard', verification_quote='Bei den Anforderungen an die Datenqualität sollte Folgendes berücksichtigt werden: e) die Vollständigkeit: prozentualer Anteil eines Flusses, der gemessen oder abgeschätzt wird; | Wenn eine Studie für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt ist, müssen die in a) bis j) festgelegten Anforderungen an die Datenqualität berücksichtigt werden. — printed p.21', verification_note='md-verified 2026-09-05 (§4.2.3.6.2 e), printed p.21) [VC]', verified_at=now() where id='82b906a1-9bf5-4dea-b455-d5280e29dfd8' and verification_status not in ('verified_against_standard','corrected');

-- dq_representativeness — Repräsentativität
update public.fields set verification_status='verified_against_standard', verification_quote='Bei den Anforderungen an die Datenqualität sollte Folgendes berücksichtigt werden: f) die Repräsentativität: qualitative Einschätzung für den Grad, in dem die Datenmenge die wahre, interessierende Grundgesamtheit widerspiegelt (d. h. geographischer und zeitlicher Bezug sowie technologischer Erfassungsbereich); | Wenn eine Studie für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt ist, müssen die in a) bis j) festgelegten Anforderungen an die Datenqualität berücksichtigt werden. — printed p.21', verification_note='md-verified 2026-09-05 (§4.2.3.6.2 f), printed p.21) [VC]', verified_at=now() where id='0ce7876f-dd87-4bae-b010-955467d22291' and verification_status not in ('verified_against_standard','corrected');

-- dq_consistency — Konsistenz
update public.fields set verification_status='verified_against_standard', verification_quote='Bei den Anforderungen an die Datenqualität sollte Folgendes berücksichtigt werden: g) die Konsistenz: qualitative Einschätzung dafür, ob die Methode der Studie auf die verschiedenen Komponenten der Analyse einheitlich angewendet wird; | Wenn eine Studie für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt ist, müssen die in a) bis j) festgelegten Anforderungen an die Datenqualität berücksichtigt werden. — printed p.21', verification_note='md-verified 2026-09-05 (§4.2.3.6.2 g), printed p.21) [VC]', verified_at=now() where id='5f2f70a4-204a-4758-a466-e8a1f2eca818' and verification_status not in ('verified_against_standard','corrected');

-- dq_reproducibility — Vergleichpräzision
update public.fields set verification_status='verified_against_standard', verification_quote='Bei den Anforderungen an die Datenqualität sollte Folgendes berücksichtigt werden: h) die Vergleichpräzision: qualitative Einschätzung für den Umfang, in dem ein unabhängiger Ersteller mit den Informationen über die Methode und die Datenwerte die in der Studie angegebenen Ergebnisse reproduzieren kann; | Wenn eine Studie für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt ist, müssen die in a) bis j) festgelegten Anforderungen an die Datenqualität berücksichtigt werden. — printed p.21', verification_note='md-verified 2026-09-05 (§4.2.3.6.2 h), printed p.21) [VC]', verified_at=now() where id='90d40510-fd6f-48a8-9349-1db3f0129eac' and verification_status not in ('verified_against_standard','corrected');

-- dq_data_sources — Datenquellen
update public.fields set verification_status='verified_against_standard', verification_quote='Bei den Anforderungen an die Datenqualität sollte Folgendes berücksichtigt werden: i) die Datenquellen; | Wenn eine Studie für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt ist, müssen die in a) bis j) festgelegten Anforderungen an die Datenqualität berücksichtigt werden. — printed p.21', verification_note='md-verified 2026-09-05 (§4.2.3.6.2 i), printed p.21) [VC]', verified_at=now() where id='f0e3a655-77e1-4738-964f-7280fb417f47' and verification_status not in ('verified_against_standard','corrected');

-- dq_uncertainty — Unsicherheit der Information
update public.fields set verification_status='verified_against_standard', verification_quote='Bei den Anforderungen an die Datenqualität sollte Folgendes berücksichtigt werden: j) die Unsicherheit der Information, z. B. Daten, Modelle und Annahmen. | Wenn eine Studie für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt ist, müssen die in a) bis j) festgelegten Anforderungen an die Datenqualität berücksichtigt werden. — printed p.21', verification_note='md-verified 2026-09-05 (§4.2.3.6.2 j), printed p.21) [VC]', verified_at=now() where id='a2074390-11e1-4756-be08-50ad2fc128e9' and verification_status not in ('verified_against_standard','corrected');

-- missing_data_treatment — Behandlung fehlender Daten
update public.fields set verification_status='verified_against_standard', verification_quote='Die Handhabung fehlender Daten muss dokumentiert werden. Bei allen Prozessmodulen und für jede Datenquelle, an denen fehlende Daten nachgewiesen werden, sollte die Bearbeitung der fehlenden Daten und von Datenlücken Folgendes ergeben — einen „Nichtnullwert“, der erläutert ist; — einen „Nullwert“, falls begründet oder; - einen errechneten Wert, der auf aufgezeichneten Werten aus mit ähnlicher Technologie arbeitenden Prozessmodulen beruht. — printed p.22', verification_note='md-verified 2026-09-05 (§4.2.3.6.3, printed p.22) [VC]', verified_at=now() where id='9292a211-d02a-46d1-92b8-6f9eb2ea7d1a' and verification_status not in ('verified_against_standard','corrected');

-- critical_review_type — Art der Kritischen Prüfung
update public.fields set verification_status='verified_against_standard', verification_quote='Im Untersuchungsrahmen der Studie muss festgelegt sein, - ob eine Kritische Prüfung notwendig ist und, wenn ja, wie sie durchgeführt wird, - die Art der erforderlichen Kritischen Prüfung (siehe Abschnitt 6) und - die Personen, die diese vornehmen würden, sowie deren Grad an Sachkenntnis. — printed p.23', verification_note='md-verified 2026-09-05 (§4.2.3.8, printed p.23) [VC] — enum values expert_review/panel_review are the two types §6.2 and §6.3 print; the third option "none" is EKOWAIs rendering of "ob eine Kritische Prüfung notwendig ist"', verified_at=now() where id='06f78f75-331a-42ff-ae33-c146f022e79d' and verification_status not in ('verified_against_standard','corrected');

-- systems_equivalence_evaluated — Äquivalenz der Systeme beurteilt
update public.fields set verification_status='verified_against_standard', verification_quote='Bei einer vergleichenden Studie muss vor der Auswertung der Ergebnisse die Vergleichbarkeit der Systeme beurteilt werden. [...] Wenn die Studie für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt ist, muss diese Beurteilung von interessierten Kreisen als Kritische Prüfung durchgeführt werden. — printed p.22', verification_note='md-verified 2026-09-05 (§4.2.3.7, printed p.22) [VC]', verified_at=now() where id='f97a5612-0b62-488b-b017-85aa92d73ea4' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------------------------
-- DIN-EN-ISO-14044-02 — Sachbilanz (LCI) (13 fields)
-- ---------------------------------------------------------------------------------------------

-- unit_process_data — Daten je Prozessmodul
update public.fields set verification_status='verified_against_standard', verification_quote='Die qualitativen und quantitativen Daten, die in die Sachbilanz einbezogen werden, müssen für jedes Prozessmodul, das innerhalb der Systemgrenze liegt, gesammelt werden. Die entweder durch Messung, Berechnung oder Schätzung gesammelten Daten werden dazu verwendet, die Inputs und Outputs eines Prozessmoduls quantitativ zu bestimmen. — printed p.23', verification_note='md-verified 2026-09-05 (§4.3.2.1, printed p.23) [VC]', verified_at=now() where id='35061916-a4df-4b94-8062-2d24e1a29ce5' and verification_status not in ('verified_against_standard','corrected');

-- unit_process_description — Beschreibung des Prozessmoduls
update public.fields set verification_status='verified_against_standard', verification_quote='Zur Verringerung des Risikos von Missverständnissen, die z. B. zur Doppelzählung bei der Validierung oder zur Wiederverwendung der gesammelten Daten führen, muss die Beschreibung jedes Prozessmoduls dokumentiert werden. — printed p.23', verification_note='md-verified 2026-09-05 (§4.3.2.1, printed p.23) [VC]', verified_at=now() where id='5643143b-5233-4338-8766-a70136a6465a' and verification_status not in ('verified_against_standard','corrected');

-- data_source_referenced — Datenquelle referenziert
update public.fields set verification_status='verified_against_standard', verification_quote='Wurden Daten aus veröffentlichten Quellen entnommen, muss auf die Quelle verwiesen werden. Bei jenen Daten, die für Schlussfolgerungen aus der Studie wesentlich sein können, muss auf die Einzelheiten über das entsprechende Datenerhebungsverfahren, die Zeitspanne, in der die Daten gesammelt wurden, und weitere Angaben zu Indikatoren der Datenqualität verwiesen werden. — printed p.23', verification_note='md-verified 2026-09-05 (§4.3.2.1, printed p.23) [VC]', verified_at=now() where id='d0e9c369-c511-40a6-99e5-c3b96846ad49' and verification_status not in ('verified_against_standard','corrected');

-- data_category — Datenkategorie
update public.fields set verification_status='verified_against_standard', verification_quote='Die Hauptgruppen, unter denen Daten kategorisiert werden dürfen, umfassen: - Energieinputs, Rohstoffinputs, BetriebsstoffInputs, andere physikalische Inputs; - Produkte, Koppelprodukte und Abfall; - Emissionen in Luft, Wasser und Boden und - weitere Umweltaspekte. — printed p.24', verification_note='md-verified 2026-09-05 (§4.3.2.3, printed p.24) [VC] — the encoded enum splits the printed group "Energieinputs, Rohstoffinputs, Betriebsstoff-Inputs, andere physikalische Inputs" into single tokens — a finer granularity than the printed list', verified_at=now() where id='1035f8ad-9174-4b63-8911-626126544f5e' and verification_status not in ('verified_against_standard','corrected');

-- calculation_procedures_documented — Berechnungsverfahren dokumentiert
update public.fields set verification_status='verified_against_standard', verification_quote='Alle Berechnungsverfahren müssen explizit dokumentiert werden und die gemachten Annahmen müssen eindeutig angegeben und erläutert werden. — printed p.26', verification_note='md-verified 2026-09-05 (§4.3.3.1, printed p.26) [VC]', verified_at=now() where id='be970b39-ab53-4bd8-89ab-267209fb80c8' and verification_status not in ('verified_against_standard','corrected');

-- heating_value_basis — Verwendeter Heizwert
update public.fields set verification_status='verified_against_standard', verification_quote='Inputs und Outputs, die sich auf ein brennbares Material (wie z. B. Öl, Gas und Kohle) beziehen, können als Energieinput oder -output angegeben werden, indem sie mit dem entsprechenden Heizwert multipliziert werden. In diesem Fall muss angegeben werden, ob der obere oder untere Heizwert benutzt wird. — printed p.27', verification_note='md-verified 2026-09-05 (§4.3.3.1, printed p.27) [VC]', verified_at=now() where id='a3fa2617-8c24-4d4d-a7df-aad16fb3b7d6' and verification_status not in ('verified_against_standard','corrected');

-- data_validation_done — Datenvalidierung durchgeführt
update public.fields set verification_status='verified_against_standard', verification_quote='Beim Prozess der Datenerhebung muss eine Datenvalidierung durchgeführt werden, um zu bestätigen und den Nachweis zu erbringen, dass die Anforderungen an die Datenqualität für die vorgesehene Anwendung erfüllt wurden. — printed p.27', verification_note='md-verified 2026-09-05 (§4.3.3.2, printed p.27) [VC]', verified_at=now() where id='6aca78bc-70af-428a-ae6b-49e40b108220' and verification_status not in ('verified_against_standard','corrected');

-- boundary_refinement_documented — Anpassung der Systemgrenze dokumentiert
update public.fields set verification_status='verified_against_standard', verification_quote='Die anfängliche Systemgrenze muss gegebenenfalls den Abschneidekriterien entsprechend überarbeitet werden, die bei der Festlegung des Untersuchungsrahmens aufgestellt wurden. Die Ergebnisse dieses Anpassungsprozesses und der Sensitivitätsanalyse müssen dokumentiert werden. — printed p.28', verification_note='md-verified 2026-09-05 (§4.3.3.4, printed p.28) [VC]', verified_at=now() where id='ac3e2a0b-6a87-40e7-9ce4-e022df5ff261' and verification_status not in ('verified_against_standard','corrected');

-- allocation_procedure — Allokationsverfahren
update public.fields set verification_status='verified_against_standard', verification_quote='Im Rahmen der Studie müssen die Prozesse gekennzeichnet werden, die mit anderen Produktsystemen gemeinsam benutzt werden, und diese entsprechend dem nachfolgend dargestellten schrittweisen Verfahren [...] behandelt werden: a) Schritt 1: Wo auch immer möglich, sollte eine Allokation vermieden werden durch 1) Teilung der betroffenen Prozessmodule in zwei oder mehrere Teilprozesse und Sammlung der Input- und Outputdaten bezogen auf diese Teilprozesse oder 2) Erweiterung des Produktsystems durch Aufnahme zusätzlicher Funktionen, die sich auf Koppelprodukte beziehen, wobei die Anforderungen nach 4.2.3.3 zu berücksichtigen sind. — printed p.29', verification_note='md-verified 2026-09-05 (§4.3.4.2, printed p.29) [VC] — the elided run is the mathpix footnote marker; Steps 2 and 3 continue on the same printed page ("Schritt 2 ... physikalischen Beziehungen", "Schritt 3 ... ökonomischen Wert")', verified_at=now() where id='de990c85-4648-4269-865e-93764c7a5e8a' and verification_status not in ('verified_against_standard','corrected');

-- allocation_documented — Allokation dokumentiert und erläutert
update public.fields set verification_status='verified_against_standard', verification_quote='Die Inputs und Outputs müssen den verschiedenen Produkten nach eindeutig festgelegten Verfahren, die zusammen mit dem Allokationsverfahren dokumentiert und erläutert sein müssen, zugeordnet werden. — printed p.28', verification_note='md-verified 2026-09-05 (§4.3.4.1, printed p.28) [VC]', verified_at=now() where id='e868fb9c-c9d9-4da2-b71a-798af892a685' and verification_status not in ('verified_against_standard','corrected');

-- allocation_balance_preserved — Allokationsbilanz erhalten
update public.fields set verification_status='verified_against_standard', verification_quote='Die Summe der durch Allokation zugeordneten Inputs und Outputs eines Prozessmoduls muss gleich den Inputs und Outputs des Prozessmoduls vor der Allokation sein. — printed p.28', verification_note='md-verified 2026-09-05 (§4.3.4.1, printed p.28) [VC]', verified_at=now() where id='f028bff4-c1be-4713-b0d3-2225dcbb7668' and verification_status not in ('verified_against_standard','corrected');

-- allocation_sensitivity_done — Sensitivitätsanalyse zur Allokation
update public.fields set verification_status='verified_against_standard', verification_quote='Wenn mehrere alternative Allokationsverfahren zulässig erscheinen, muss eine Sensitivitätsanalyse durchgeführt werden, um die Folgen des Abweichens vom ausgewählten Ansatz darzustellen. — printed p.28', verification_note='md-verified 2026-09-05 (§4.3.4.1, printed p.28) [VC]', verified_at=now() where id='f89ce2f4-64e5-41b4-a41b-68dda0c632a0' and verification_status not in ('verified_against_standard','corrected');

-- recycling_allocation_type — Allokationstyp Recycling
update public.fields set verification_status='verified_against_standard', verification_quote='a) Ein Allokationsverfahren im geschlossenen Kreislauf gilt für Produktsysteme im geschlossenen Kreislauf. Es gilt auch für Produktsysteme im offenen Kreislauf, bei denen beim verwerteten Material keine Veränderungen der inhärenten Eigenschaften vorliegen. [...] b) Ein Allokationsverfahren im offenen Kreislauf gilt für Produktsysteme im offenen Kreislauf, bei denen das Material in anderen Produktsystemen wiederverwertet wird und das Material eine Veränderung der inhärenten Eigenschaften erfährt. — printed p.31', verification_note='md-verified 2026-09-05 (§4.3.4.3.3, printed p.31) [VC]', verified_at=now() where id='5237e9c1-3137-4346-bbc5-ed78863e401a' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------------------------
-- DIN-EN-ISO-14044-03 — Wirkungsabschätzung (LCIA) (10 fields)
-- ---------------------------------------------------------------------------------------------

-- impact_categories — Wirkungskategorien
update public.fields set verification_status='verified_against_standard', verification_quote='Unter Berücksichtigung des Ziels und des Untersuchungsrahmens muss die Auswahl der Wirkungskategorien einen umfassenden Satz von mit dem zu untersuchenden Produktsystem verbundenen Umwelthemen widerspiegeln. — printed p.34', verification_note='md-verified 2026-09-05 (§4.4.2.2.1, printed p.34) [VC] — md prints "Umwelthemen" (sic)', verified_at=now() where id='5ab35630-775c-42a8-b1b3-e77bdde77ae6' and verification_status not in ('verified_against_standard','corrected');

-- category_indicators — Wirkungsindikatoren
update public.fields set verification_status='verified_against_standard', verification_quote='Für die Wirkungskategorien und Wirkungsindikatoren müssen genaue und anschauliche Bezeichnungen vorgesehen werden. — printed p.34', verification_note='md-verified 2026-09-05 (§4.4.2.2.1, printed p.34) [VC]', verified_at=now() where id='d32ad612-b320-47cd-bfcc-f0d0ebd21f85' and verification_status not in ('verified_against_standard','corrected');

-- characterization_model — Charakterisierungsmodell
update public.fields set verification_status='verified_against_standard', verification_quote='Der Umweltwirkungsmechanismus und das Charakterisierungsmodell, das die Sachbilanzergebnisse zum Wirkungsindikator in Beziehung setzt und die Grundlage für die Charakterisierungsfaktoren liefert, müssen beschrieben werden. — printed p.34', verification_note='md-verified 2026-09-05 (§4.4.2.2.1, printed p.34) [VC]', verified_at=now() where id='1716666b-6a17-4924-bdc1-0250c3a1c82a' and verification_status not in ('verified_against_standard','corrected');

-- lci_result — Sachbilanzergebnis (zugeordnet)
update public.fields set verification_status='verified_against_standard', verification_quote='Die Zuordnung der Sachbilanzergebnisse zu Wirkungskategorien sollte die nachstehenden Punkte berücksichtigen, es sei denn, dass es in Ziel und Untersuchungsrahmen anders festgelegt wurde: a) Zuordnung von Sachbilanzergebnissen, die ausschließlich einer einzigen Wirkungskategorie zuzurechnen sind; — printed p.39', verification_note='md-verified 2026-09-05 (§4.4.2.3, printed p.39) [VC]', verified_at=now() where id='4725287e-066d-4d7a-9722-ba04c16d6abb' and verification_status not in ('verified_against_standard','corrected');

-- characterization_factor — Charakterisierungsfaktor
update public.fields set verification_status='verified_against_standard', verification_quote='Die Berechnung der Indikatorwerte (Charakterisierung) schließt die Umwandlung der Sachbilanzergebnisse in gemeinsame Einheiten und die Zusammenfassung der umgewandelten Ergebnisse innerhalb derselben Wirkungskategorie ein. Diese Umwandlung verwendet Charakterisierungsfaktoren. — printed p.39', verification_note='md-verified 2026-09-05 (§4.4.2.4, printed p.39) [VC]', verified_at=now() where id='267af467-1a09-4a27-af71-3c146851dbe8' and verification_status not in ('verified_against_standard','corrected');

-- category_indicator_result — Wirkungsindikatorwert
update public.fields set verification_status='verified_against_standard', verification_quote='Die Berechnung der Indikatorwerte (Charakterisierung) schließt die Umwandlung der Sachbilanzergebnisse in gemeinsame Einheiten und die Zusammenfassung der umgewandelten Ergebnisse innerhalb derselben Wirkungskategorie ein. [...] Das Resultat der Berechnung ist ein numerischer Indikatorwert. Das Verfahren zur Berechnung der Indikatorwerte muss identifiziert und einschließlich der angewendeten Werthaltungen und Annahmen dokumentiert werden. — printed p.39', verification_note='md-verified 2026-09-05 (§4.4.2.4, printed p.39) [VC]', verified_at=now() where id='7f366695-dc78-4cb5-b11d-32d10982cd5e' and verification_status not in ('verified_against_standard','corrected');

-- optional_element — Optionaler Bestandteil angewendet
update public.fields set verification_status='verified_against_standard', verification_quote='Zusätzlich zu den vorstehend aufgeführten Bestandteilen der Wirkungsabschätzung kann es, wie in 4.4.2.2 aufgeführt, optionale Bestandteile und Informationen geben, die in Abhängigkeit von Ziel und Untersuchungsrahmen der Ökobilanz verwendet werden können. a) Normierung: Berechnung der Größenordnung der Wirkungsindikatorwerte in Bezug auf die Referenzinformationen; b) Ordnung: Einordnung und eventuelle Rangbildung der Wirkungskategorien; [...] d) Analyse der Datenqualität: besseres Verständnis der Zuverlässigkeit der Sammlung der Indikatorwerte, des Wirkungsabschätzungsprofils. — printed p.41', verification_note='md-verified 2026-09-05 (§4.4.3.1, printed p.41) [VC] — the elided item is c) Gewichtung, quoted in full on the weighting_applied row', verified_at=now() where id='da74fca0-622a-4745-9d24-77ed3e93cf3f' and verification_status not in ('verified_against_standard','corrected');

-- normalization_reference — Normierungs-Referenzwert
update public.fields set verification_status='verified_against_standard', verification_quote='Die Normierung transformiert einen Indikatorwert mittels Division durch einen ausgewählten Referenzwert. Einige Beispiele für Referenzwerte sind: - die gesamten Inputs und Outputs für ein vorgegebenes Gebiet, das global, regional, national oder lokal sein kann; - die gesamten Inputs und Outputs für ein vorgegebenes Gebiet pro Kopf der Bevölkerung oder ein vergleichbares Maß und - Inputs und Outputs in einem ReferenzSzenario, z. B. einem vorgegebenen alternativen Produktsystem. — printed p.42', verification_note='md-verified 2026-09-05 (§4.4.3.2.2, printed p.42) [VC]', verified_at=now() where id='7ce75b64-fecf-4f10-bffa-bbfddca6a633' and verification_status not in ('verified_against_standard','corrected');

-- weighting_applied — Gewichtung angewendet
update public.fields set verification_status='verified_against_standard', verification_quote='Die Gewichtung ist ein Verfahren zur Umwandlung der Indikatorwerte verschiedener Wirkungskategorien unter Verwendung numerischer Faktoren, die auf Werthaltungen beruhen. Sie kann die Zusammenfassung der gewichteten Indikatorwerte einschließen. | Daten und Indikatorwerte oder normierte Indikatorwerte, die vor der Gewichtung erhalten wurden, sollten zusammen mit den Gewichtungsergebnissen verfügbar gemacht werden. — printed p.43', verification_note='md-verified 2026-09-05 (§4.4.3.4, printed p.43) [VC] — §4.4.5 (printed p.45) additionally forbids weighting for public comparative assertions: "Die Gewichtung, wie in 4.4.3.4 beschrieben, darf nicht in Ökobilanz-Studien angewendet werden, die für die Verwendung in zur Veröffentlichung vorgesehenen vergleichenden Aussagen bestimmt sind." — that prohibition is NOT enforced by any gate (see STAGED S-4)', verified_at=now() where id='76fbc899-0638-403a-a691-ed6301ff8faf' and verification_status not in ('verified_against_standard','corrected');

-- lcia_dq_technique — LCIA-Datenqualitätstechnik
update public.fields set verification_status='verified_against_standard', verification_quote='Nachstehend sind spezifische Methoden und ihre Zwecke aufgelistet. a) Schwerpunktanalyse (z. B. Pareto-Analyse) ist ein statistisches Verfahren, das diejenigen Daten identifiziert, die den größten Beitrag zum Indikatorwert liefern. [...] b) Fehlerabschätzung ist ein Verfahren zur Bestimmung, wie sich Unsicherheiten bei den Daten und Annahmen in Berechnungen fortpflanzen und auf die Zuverlässigkeit der Ergebnisse der Wirkungsabschätzung auswirken; c) Sensitivitätsanalyse ist ein Verfahren zur Bestimmung, wie sich Veränderungen in den Daten und die Wahl der methodischen Vorgehensweise auf die Ergebnisse der Wirkungsabschätzung auswirken. — printed p.44', verification_note='md-verified 2026-09-05 (§4.4.4.2, printed p.44) [VC]', verified_at=now() where id='b15953db-71e8-491f-b311-0fb1e0344f78' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------------------------
-- DIN-EN-ISO-14044-04 — Auswertung (7 fields)
-- ---------------------------------------------------------------------------------------------

-- significant_issues — Signifikante Parameter
update public.fields set verification_status='verified_against_standard', verification_quote='Zweck dieses Bestandteils ist, in Übereinstimmung mit der Festlegung des Ziels und des Untersuchungsrahmens und in Wechselwirkung mit dem Beurteilungsbestandteil, die Ergebnisse der Sachbilanz- und Wirkungsabschätzungsphasen zu strukturieren und zu helfen die signifikanten Parameter zu bestimmen. — printed p.49', verification_note='md-verified 2026-09-05 (§4.5.2.1, printed p.49) [VC]', verified_at=now() where id='4caffcee-5615-49b7-975b-15ca6f420897' and verification_status not in ('verified_against_standard','corrected');

-- completeness_check_done — Vollständigkeitsprüfung durchgeführt
update public.fields set verification_status='verified_against_standard', verification_quote='Zweck der Vollständigkeitsprüfung ist die Sicherstellung, dass alle relevanten Informationen und die für die Auswertung benötigten Daten zur Verfügung stehen und vollständig sind. Falls irgendwelche relevanten Informationen fehlen oder unvollständig sind, muss bedacht werden, ob diese Informationen zur Erfüllung des Ziels und des Untersuchungsrahmens einer Ökobilanz notwendig sind. Das Ergebnis und dessen Begründung müssen dokumentiert werden. — printed p.51', verification_note='md-verified 2026-09-05 (§4.5.3.2, printed p.51) [VC] — §4.5.3.1 (printed p.51) makes the three checks something that "muss ... erwogen werden" (shall be CONSIDERED), not something that must be performed — see STAGED S-3', verified_at=now() where id='3a7ba796-bd83-4f37-923a-3588c14335a7' and verification_status not in ('verified_against_standard','corrected');

-- sensitivity_check_done — Sensitivitätsprüfung durchgeführt
update public.fields set verification_status='verified_against_standard', verification_quote='Zweck der Sensitivitätsprüfung ist die Einschätzung der Zuverlässigkeit der Endergebnisse und Schlussfolgerungen, indem bestimmt wird, inwiefern sie durch Unsicherheiten in den Daten, Allokationsverfahren, Berechnung der Wirkungsindikatorwerte usw. beeinflusst werden. | Die Sensitivitätsprüfung muss die Ergebnisse der Sensitivitätsanalyse und der Fehlerabschätzung enthalten, wenn sie in den bereits abgeschlossenen Phasen (Sachbilanz, Wirkungsabschätzung) durchgeführt wurden. — printed p.52', verification_note='md-verified 2026-09-05 (§4.5.3.3, printed p.52) [VC]', verified_at=now() where id='d21e9299-f070-457f-a535-a5fccec5adf7' and verification_status not in ('verified_against_standard','corrected');

-- consistency_check_done — Konsistenzprüfung durchgeführt
update public.fields set verification_status='verified_against_standard', verification_quote='Zweck der Konsistenzprüfung ist die Bestimmung, ob sich die Annahmen, Methoden und Daten in Übereinstimmung mit dem Ziel und dem Untersuchungsrahmen befinden. Falls es für die Ökobilanz- oder Sachbilanz-Studie relevant ist, müssen folgende Fragen gestellt werden: — printed p.52', verification_note='md-verified 2026-09-05 (§4.5.3.4, printed p.52) [VC]', verified_at=now() where id='2756b92b-0482-4ae8-9edc-53e0983970d0' and verification_status not in ('verified_against_standard','corrected');

-- conclusions — Schlussfolgerungen
update public.fields set verification_status='verified_against_standard', verification_quote='Schlussfolgerungen müssen aus der Studie gezogen werden. Das sollte iterativ mit den anderen Bestandteilen in der Auswertungsphase durchgeführt werden. — printed p.53', verification_note='md-verified 2026-09-05 (§4.5.4, printed p.53) [VC]', verified_at=now() where id='e539e776-aa82-416b-a0fd-2d9e485fd295' and verification_status not in ('verified_against_standard','corrected');

-- limitations — Einschränkungen
update public.fields set verification_status='verified_against_standard', verification_quote='Die Auswertung muss in Bezug auf das Ziel der Studie auch betrachten: - die Zweckmäßigkeit der Festlegung des Systemnutzens, funktionellen Einheit und Systemgrenze; - Einschränkungen, die durch die Einschätzung der Datenqualität und die Sensitivitätsanalyse bestimmt werden. — printed p.49', verification_note='md-verified 2026-09-05 (§4.5.1.2, printed p.49) [VC]', verified_at=now() where id='9318f4df-e18b-417b-9a59-f3f16d191036' and verification_status not in ('verified_against_standard','corrected');

-- recommendations — Empfehlungen
update public.fields set verification_status='verified_against_standard', verification_quote='Empfehlungen müssen auf den abschließenden Schlussfolgerungen der Studie beruhen, und sie müssen eine logische und angemessene Konsequenz der Schlussfolgerungen sein. — printed p.53', verification_note='md-verified 2026-09-05 (§4.5.4, printed p.53) [VC] — printed as "müssen" — the field is encoded is_required=false; see STAGED S-6', verified_at=now() where id='fe4d64c8-a912-4c3e-8108-0b2946f19941' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------------------------
-- DIN-EN-ISO-14044-05 — Berichterstattung (4 fields)
-- ---------------------------------------------------------------------------------------------

-- report_type — Art und Aufbau des Berichts
update public.fields set verification_status='verified_against_standard', verification_quote='Art und Ausführung des Berichts müssen bei der Festlegung des Ziels und des Untersuchungsrahmens der Studie vorgegeben werden. — printed p.54', verification_note='md-verified 2026-09-05 (§5.1.1, printed p.54) [VC] — the enum values internal/third_party are EKOWAIs rendering; the standard names only the third-party report explicitly (§5.2)', verified_at=now() where id='50a8e1d2-fb00-4350-aaaf-a0701ad025a6' and verification_status not in ('verified_against_standard','corrected');

-- third_party_report_prepared — Bericht an Dritte erstellt
update public.fields set verification_status='verified_against_standard', verification_quote='Falls die Ergebnisse der Ökobilanz einem Dritten mitzuteilen sind (d. h. einem interessierten Kreis neben Auftraggeber oder Ersteller der Studie) muss, unabhängig von der Form der Mitteilung, ein besonderer Bericht an Dritte erarbeitet werden. — printed p.55', verification_note='md-verified 2026-09-05 (§5.2, printed p.55) [VC]', verified_at=now() where id='32f52632-8612-404b-a781-361468367f18' and verification_status not in ('verified_against_standard','corrected');

-- iso_conformance_statement — Konformitätserklärung zur Norm
update public.fields set verification_status='verified_against_standard', verification_quote='Im Bericht müssen folgende Aspekte enthalten sein: a) Allgemeine Aspekte: [...] 3) Erklärung, dass die Studie nach den Anforderungen dieser Internationalen Norm durchgeführt wurde. — printed p.55', verification_note='md-verified 2026-09-05 (§5.2 a) 3), printed p.55) [VC]', verified_at=now() where id='ad3226c1-eee9-4eda-b0b0-f0b4e801dd93' and verification_status not in ('verified_against_standard','corrected');

-- grouping_value_choice_statement — Werthaltungs-Angabe zur Ordnung
update public.fields set verification_status='verified_against_standard', verification_quote='Wenn der Verfahrensschritt der Ordnung in der Ökobilanz enthalten ist, ist Folgendes hinzuzufügen: a) die Verfahren und Ergebnisse, die für die Ordnung angewendet wurden; | d) the statement that "ISO 14044 does not specify any specific methodology or support the underlying value-choices used to group the impact categories"; | e) the statement that "The value-choices and judgements within the grouping procedures are the sole responsibilities of the commissioner of the study (e.g. government, community, organization, etc.)". — printed p.58', verification_note='md-verified 2026-09-05 (§5.3.2 d), e), printed p.58) [VC] — TRANSCRIPT GAP: the German column of §5.3.2 breaks off after item a) in this md; items b)-e) survive only in the English column of the same bilingual clause, so d) and e) are quoted from the English column', verified_at=now() where id='aad64b32-f49a-4f6c-bcc4-837a64d7b195' and verification_status not in ('verified_against_standard','corrected');

-- ---------------------------------------------------------------------------------------------
-- DIN-EN-ISO-14044-06 — Kritische Prüfung (5 fields)
-- ---------------------------------------------------------------------------------------------

-- review_objectives_ensured — Konformitätsziele sichergestellt
update public.fields set verification_status='verified_against_standard', verification_quote='Das Kritische Prüfungsverfahren muss sicherstellen, dass: - die bei der Durchführung der Ökobilanz angewendeten Methoden mit dieser Internationalen Norm übereinstimmen; - die bei der Durchführung der Ökobilanz angewendeten Methoden wissenschaftlich begründet und technisch gültig sind; - die verwendeten Daten in Bezug auf das Ziel der Studie hinreichend und zweckmäßig sind; - die Auswertungen die erkannten Einschränkungen und das Ziel der Studie berücksichtigen und - der Bericht transparent und in sich stimmig ist. — printed p.59', verification_note='md-verified 2026-09-05 (§6.1, printed p.59) [VC]', verified_at=now() where id='3d808cbc-5937-4ffe-bce1-28e5e9b592e0' and verification_status not in ('verified_against_standard','corrected');

-- review_scope_recorded — Untersuchungsrahmen der Prüfung aufgezeichnet
update public.fields set verification_status='verified_against_standard', verification_quote='Die Rahmenbedingungen und die Art der gewünschten Kritischen Prüfung müssen in der Vorbereitungsphase einer Ökobilanz festgelegt werden, und die Entscheidung über die Art der Kritischen Prüfung ist aufzuzeichnen. — printed p.59', verification_note='md-verified 2026-09-05 (§6.1, printed p.59) [VC]', verified_at=now() where id='1dc12e9d-25ff-4744-9852-473d9d285079' and verification_status not in ('verified_against_standard','corrected');

-- reviewer_independent — Prüfer unabhängig
update public.fields set verification_status='verified_against_standard', verification_quote='Eine Kritische Prüfung kann von internen oder externen Sachverständigen vorgenommen werden. Dabei muss die Prüfung durch von der Ökobilanz unabhängige Sachverständige durchgeführt werden. — printed p.60', verification_note='md-verified 2026-09-05 (§6.2, printed p.60) [VC]', verified_at=now() where id='c2861230-21d9-4f3b-bfbe-845f4a246b37' and verification_status not in ('verified_against_standard','corrected');

-- review_panel_members — Mitglieder des Prüfungsausschusses
update public.fields set verification_status='verified_against_standard', verification_quote='Eine Kritische Prüfung kann als eine Prüfung durch interessierte Kreise vorgenommen werden. In einem derartigen Fall sollte vom Auftraggeber der Studie ein externer, unabhängiger Sachverständiger ausgewählt werden, der als Vorsitzender eines Prüfungsausschusses mit mindestens drei Mitgliedern fungiert. — printed p.60', verification_note='md-verified 2026-09-05 (§6.3, printed p.60) [VC] — the only numeric value in the whole standard body ("mindestens drei Mitgliedern") sits under SOLLTE, not muss — SR-2/severity note in STAGED S-5', verified_at=now() where id='3cd5dc5d-8486-4241-99ea-d4692674ead6' and verification_status not in ('verified_against_standard','corrected');

-- review_statement_in_report — Prüfaussage im Bericht enthalten
update public.fields set verification_status='verified_against_standard', verification_quote='Das Gutachten, Stellungnahmen des Erstellers sowie alle Reaktionen auf Empfehlungen des Gutachters müssen in den Bericht zur Ökobilanz aufgenommen werden. | Das Gutachten und der Bericht des Prüfungsausschusses sowie Stellungnahmen der Sachverständigen und alle Reaktionen auf Empfehlungen des Gutachters oder des Ausschusses müssen in den Bericht über die Ökobilanz aufgenommen werden. — printed p.60', verification_note='md-verified 2026-09-05 (§6.2 / §6.3, printed p.60) [VC]', verified_at=now() where id='1cb84ead-c30e-4493-b694-b09fc0080991' and verification_status not in ('verified_against_standard','corrected');

-- =============================== SECTION B — equations (1 row, quote backfill) ===============================
-- EQ-01 category_indicator_result = SUM(lci_result * characterization_factor), §4.4.2.4, ws DIN-EN-ISO-14044-03.
-- Its verification_status is ALREADY 'verified_against_standard' and is NOT touched. Only the empty
-- verification_quote is filled with the GERMAN §4.4.2.4 text (the existing source_quote is the English column),
-- and the note gets a " | md-quote 2026-09-05 …" tag. Guarded on verification_quote is null so it reports rows=1
-- once and rows=0 on a re-run. NOTE for the reader: the standard prints this as PROSE, not as a numbered formula —
-- ISO 14044 contains no displayed equations at all — so "SUM(...)" is EKOWAI's formalisation of the printed
-- sentence "Umwandlung der Sachbilanzergebnisse in gemeinsame Einheiten und die Zusammenfassung der umgewandelten
-- Ergebnisse innerhalb derselben Wirkungskategorie ... Diese Umwandlung verwendet Charakterisierungsfaktoren."
update public.equations set verification_quote='Die Berechnung der Indikatorwerte (Charakterisierung) schließt die Umwandlung der Sachbilanzergebnisse in gemeinsame Einheiten und die Zusammenfassung der umgewandelten Ergebnisse innerhalb derselben Wirkungskategorie ein. Diese Umwandlung verwendet Charakterisierungsfaktoren. Das Resultat der Berechnung ist ein numerischer Indikatorwert. — printed p.39', verification_note=coalesce(nullif(verification_note,'') || ' | ', '') || 'md-quote 2026-09-05 (§4.4.2.4, printed p.39) [VC] — German column of the D/E transcript; the standard prints no displayed equation, the formula is EKOWAI''s formalisation of the printed sentence' where id='0b643c13-d138-45e7-a90a-0254b68db990' and verification_quote is null;
