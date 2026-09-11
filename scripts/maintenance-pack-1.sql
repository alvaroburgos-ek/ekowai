-- ============================================================================
-- SR-1 EXTRACTION PACK 1: maintenance_schedules — STAGED ONLY, DO NOT APPLY
-- Generated 2026-08-01. Rollback: scripts/rollback-maintenance-pack-1.sql
--
-- Per-source counts:
--   DWA-A-138-1  (standard_id 5d64c48d-4cca-48d9-99f0-d1348082f0da) : 47 rows
--       Source: Anhang E (informativ) „Betriebliche Empfehlungen", Tabellen E.1–E.6,
--       printed S. 88–92. Extract: scratchpad a138-paged.txt (S<page>| prefixes).
--       Offset proof: footer „88   DWA-Regelwerk   Oktober 2024" appears inside S088 block.
--   DWA-M-1200-3 (standard_id d3d8fbe3-a2a0-480e-be10-c9cab95dd0fd) : 8 rows
--       Source: DWA-M_1200-3_GD.pdf (Entwurf/Gelbdruck Juli 2025), Abschnitte 5.1.6,
--       7.2.4, 7.2.5, 7.3.2. Offset proof: footer „52   Frist zur Stellungnahme:
--       30. September 2025   Juli 2025" on PDF page 52 => printed = PDF page (offset 0).
--   FLL-Naturteich-2017 : 0 rows — RESIDUE (printed PDF not locatable on this machine;
--       only Pass3 workbooks + audit markdown exist; prod code is 'FLL-Naturteich').
--
-- interval_months only where the printed text states a period explicitly:
--   „mindestens zweimal jährlich" = 6; „mindestens einmal jährlich" (incl. variants
--   with „, nach Begrünungskonzept" / „oder nach Herstellerangaben") = 12.
--   „nach Bedarf", „nach Herstellerangaben", „regelmäßig", seasonal wording,
--   „durch Wasserbehörden festzulegen, z. B. alle 10 Jahre" (example only) => NULL.
-- ============================================================================

begin;

-- ============================ DWA-A-138-1 ===================================
-- Tabelle E.1: Betriebliche Maßnahmen für durchlässige Flächenbefestigungen [S. 88]

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.1 Durchlässige Flächenbefestigungen – Überprüfung auf Pfützen oder Ablagerungen', 'begehung', 'mindestens zweimal jährlich', 6, 'Anhang E, Tabelle E.1',
'Maßnahme: „Überprüfung auf Pfützen nach stärkeren Regenereignissen oder Ablagerungen" — Typische Häufigkeit: „mindestens zweimal jährlich" [S. 88]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.1 Durchlässige Flächenbefestigungen – Überprüfung auf Pfützen oder Ablagerungen');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.1 Durchlässige Flächenbefestigungen – Überprüfung der Versickerungsleistung durch geeignete Methoden', 'messung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.1',
'Maßnahme: „bei Anzeichen des Rückgangs der Versickerungsleistung: Überprüfung durch geeignete Methoden" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „insbesondere bei Bereichen, auf die Sediment von undurchlässigen Flächen gelangt" [S. 88]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.1 Durchlässige Flächenbefestigungen – Überprüfung der Versickerungsleistung durch geeignete Methoden');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.1 Durchlässige Flächenbefestigungen – Fegen/Kehren, Mahd, Beseitigung von Schmutz und Laub', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.1',
'Maßnahme: „Fegen/Kehren, Mahd von Flächenbefestigungen mit Vegetationsanteil, Beseitigung von Schmutz, Müll, Laub etc., Entfernung von unerwünschtem Aufwuchs" — Typische Häufigkeit: „nach Bedarf" [S. 88]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.1 Durchlässige Flächenbefestigungen – Fegen/Kehren, Mahd, Beseitigung von Schmutz und Laub');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.1 Durchlässige Flächenbefestigungen – Wiederherstellung der Versickerungsleistung', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.1',
'Maßnahme: „Wiederherstellung der Versickerungsleistung nach Herstellerangaben" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „herkömmliche Hochdruckreiniger eignen sich nicht für die Reinigung poröser Betonsteine, da der Wasserstrahl Feinpartikel nur noch tiefer in den Belag drückt und die Durchlässigkeit so weiter verringert wird" [S. 88]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.1 Durchlässige Flächenbefestigungen – Wiederherstellung der Versickerungsleistung');

-- Tabelle E.2: Betriebliche Maßnahmen für Versickerungsmulden und -flächen [S. 89–90]

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Überprüfung auf Ablagerungen oder Laubansammlungen', 'begehung', 'mindestens zweimal jährlich', 6, 'Anhang E, Tabelle E.2',
'Maßnahme: „Überprüfung auf Ablagerungen oder Laubansammlungen" — Typische Häufigkeit: „mindestens zweimal jährlich" — Bemerkung: „insbesondere Zulauf und Sohle" [S. 89]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Überprüfung auf Ablagerungen oder Laubansammlungen');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Überprüfung auf Schäden am Speichervolumen', 'begehung', 'mindestens zweimal jährlich', 6, 'Anhang E, Tabelle E.2',
'Maßnahme: „Überprüfung auf Schäden, die das Speichervolumen der Mulde verringern" — Typische Häufigkeit: „mindestens zweimal jährlich" — Bemerkung: „z. B. Setzungen im Überlaufbereich, Aufhöhungen, Erosionsschäden, Beschädigungen wie Tritt- oder Fahrschäden" [S. 89]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Überprüfung auf Schäden am Speichervolumen');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Inspektion der Zuläufe', 'begehung', 'mindestens zweimal jährlich', 6, 'Anhang E, Tabelle E.2',
'Maßnahme: „Inspektion der Zuläufe" — Typische Häufigkeit: „mindestens zweimal jährlich" [S. 89]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Inspektion der Zuläufe');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Kontrolle der Vegetationsdeckung des Bodens', 'begehung', 'mindestens zweimal jährlich', 6, 'Anhang E, Tabelle E.2',
'Maßnahme: „Kontrolle der Vegetationsdeckung des Bodens" — Typische Häufigkeit: „mindestens zweimal jährlich" — Bemerkung: „Fehlstellen beim Bewuchs, Vegetationsdeckung, Zustand und Deckungsgrad der Vegetation" [S. 89]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Kontrolle der Vegetationsdeckung des Bodens');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Kontrolle der Versickerungsfläche auf Verdichtung, Pfützenbildung oder Dauerstau', 'begehung', 'mindestens zweimal jährlich', 6, 'Anhang E, Tabelle E.2',
'Maßnahme: „Kontrolle der Versickerungsfläche auf Verdichtung, Pfützenbildung oder Dauerstau" — Typische Häufigkeit: „mindestens zweimal jährlich" [S. 89]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Kontrolle der Versickerungsfläche auf Verdichtung, Pfützenbildung oder Dauerstau');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Überprüfung der Versickerungsfähigkeit bzw. Einstauzeit', 'messung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.2',
'Maßnahme: „Überprüfung der Versickerungsfähigkeit bzw. Einstauzeit" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „z. B. mit Doppelring-Infiltrometer, Erfassung der Sickerrate im Betrieb" [S. 89]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Überprüfung der Versickerungsfähigkeit bzw. Einstauzeit');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Tiefenorientierte Probenahme und Analyse (Flächen der Gruppe S)', 'laborbericht', 'durch Wasserbehörden festzulegen, z. B. alle 10 Jahre', NULL, 'Anhang E, Tabelle E.2',
'Maßnahme: „bei Abflüssen von Flächen der Gruppe S (Tabelle 3): tiefenorientierte Probenahme der bewachsenen Bodenzone, Analyse auf Akkumulation und Durchbruch von relevanten gewässerschädlichen Substanzen" — Typische Häufigkeit: „durch Wasserbehörden festzulegen, z. B. alle 10 Jahre" [S. 89]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Tiefenorientierte Probenahme und Analyse (Flächen der Gruppe S)');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Unterhaltungspflege mit Mahd, Jäten, Grünschnitt', 'wartung', 'mindestens einmal jährlich, nach Begrünungskonzept', 12, 'Anhang E, Tabelle E.2',
'Maßnahme: „Unterhaltungspflege mit Mahd, Jäten, Grünschnitt etc." — Typische Häufigkeit: „mindestens einmal jährlich, nach Begrünungskonzept" — Bemerkung: „ggf. Mähgut entfernen, Boden muss abgetrocknet und gut tragfähig sein" [S. 89]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Unterhaltungspflege mit Mahd, Jäten, Grünschnitt');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Beseitigung von Schmutz, Müll, Laub und Störstoffen', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.2',
'Maßnahme: „Beseitigung von Schmutz, Müll, Laub, Ablagerungen und sonstigen Störstoffen" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „kein Befahren der Mulde, sondern Entfernung mit Kleingerät (Rechen, Harke)" [S. 89]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Beseitigung von Schmutz, Müll, Laub und Störstoffen');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Reinigung der Zuläufe und Freihaltung von Bewuchs', 'wartung', 'nach Bedarf, insbesondere im Frühjahr und Herbst', NULL, 'Anhang E, Tabelle E.2',
'Maßnahme: „Reinigung der Zuläufe und Freihaltung von Bewuchs" — Typische Häufigkeit: „nach Bedarf, insbesondere im Frühjahr und Herbst" — Bemerkung: „u. a. Muldenkanten, Borddurchlässe" [S. 89]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Reinigung der Zuläufe und Freihaltung von Bewuchs');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Ausbesserung von Schäden (Speichervolumen)', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.2 (Ende)',
'Maßnahme: „Ausbesserung von Schäden zur Wiederherstellung des ursprünglichen Speichervolumens der Mulde" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „z. B. Setzungen im Überlaufbereich, Aufhöhungen, Erosionsschäden, Beschädigungen wie Tritt- oder Fahrschäden" [S. 90]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Ausbesserung von Schäden (Speichervolumen)');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Wiederherstellen der Durchlässigkeit', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.2 (Ende)',
'Maßnahme: „Wiederherstellen der Durchlässigkeit" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „z. B. Pflege anpassen, Kolmation beseitigen" [S. 90]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Wiederherstellen der Durchlässigkeit');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.2 Versickerungsmulden – Wiederherstellen der Vegetationsdecke', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.2 (Ende)',
'Maßnahme: „Wiederherstellen der Vegetationsdecke" — Typische Häufigkeit: „nach Bedarf" [S. 90]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.2 Versickerungsmulden – Wiederherstellen der Vegetationsdecke');

-- Tabelle E.3: Betriebliche Maßnahmen für Rigolen [S. 90]

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.3 Rigolen – Inspektion der vorgeschalteten Behandlungsanlage', 'begehung', 'mindestens einmal jährlich oder nach Herstellerangaben', 12, 'Anhang E, Tabelle E.3',
'Maßnahme: „Inspektion der vorgeschalteten Behandlungsanlage" — Typische Häufigkeit: „mindestens einmal jährlich oder nach Herstellerangaben" — Bemerkung: „Vorbeugung Kolmation und Schadstoffeintrag" [S. 90]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.3 Rigolen – Inspektion der vorgeschalteten Behandlungsanlage');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.3 Rigolen – Inspektion der Einstiegs- und Kontrollschächte', 'begehung', 'mindestens einmal jährlich', 12, 'Anhang E, Tabelle E.3',
'Maßnahme: „Inspektion der Einstiegs- und Kontrollschächte" — Typische Häufigkeit: „mindestens einmal jährlich" — Bemerkung: „Sichtprüfung auf Wasseraufstau" [S. 90]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.3 Rigolen – Inspektion der Einstiegs- und Kontrollschächte');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.3 Rigolen – Inspektion der Rigolenkörper', 'begehung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.3',
'Maßnahme: „Inspektion der Rigolenkörper" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „bei Kastenrigolen" [S. 90]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.3 Rigolen – Inspektion der Rigolenkörper');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.3 Rigolen – Reinigung der vorgeschalteten Behandlungsanlage', 'wartung', 'nach Herstellerangaben', NULL, 'Anhang E, Tabelle E.3',
'Maßnahme: „Reinigung der vorgeschalteten Behandlungsanlage" — Typische Häufigkeit: „nach Herstellerangaben" [S. 90]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.3 Rigolen – Reinigung der vorgeschalteten Behandlungsanlage');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.3 Rigolen – Pflege und Wartung Rückstauklappe', 'wartung', 'nach Herstellerangaben', NULL, 'Anhang E, Tabelle E.3',
'Maßnahme: „Pflege und Wartung Rückstauklappe" — Typische Häufigkeit: „nach Herstellerangaben" [S. 90]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.3 Rigolen – Pflege und Wartung Rückstauklappe');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.3 Rigolen – Reinigung der Rigole (aufspülen und absaugen)', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.3',
'Maßnahme: „Reinigung der Rigole (aufspülen und absaugen)" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „bei Kastenrigolen" [S. 90]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.3 Rigolen – Reinigung der Rigole (aufspülen und absaugen)');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.3 Rigolen – Reparatur oder Austausch der vorgeschalteten Behandlungsanlage', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.3',
'Maßnahme: „Reparatur oder Austausch der vorgeschalteten Behandlungsanlage" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „Bei Verschmutzung und nachlassender Versickerungsleistung: Neubau der Rigole" [S. 90]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.3 Rigolen – Reparatur oder Austausch der vorgeschalteten Behandlungsanlage');

-- Tabelle E.4: Betriebliche Maßnahmen für Mulden-Rigolen-Elemente und -Systeme [S. 91]

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.4 Mulden-Rigolen – Inspektion der Drosseleinrichtung', 'begehung', 'mindestens einmal jährlich', 12, 'Anhang E, Tabelle E.4',
'Maßnahme: „Inspektion der Drosseleinrichtung" — Typische Häufigkeit: „mindestens einmal jährlich" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.4 Mulden-Rigolen – Inspektion der Drosseleinrichtung');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.4 Mulden-Rigolen – Inspektion der Sicker- und Verbindungsrohre', 'begehung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.4',
'Maßnahme: „Inspektion der Sicker- und Verbindungsrohre" — Typische Häufigkeit: „nach Bedarf" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.4 Mulden-Rigolen – Inspektion der Sicker- und Verbindungsrohre');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.4 Mulden-Rigolen – Tiefenorientierte Probenahme und Analyse (Flächen der Gruppe S)', 'laborbericht', 'durch Wasserbehörden festzulegen, z. B. alle 10 Jahre', NULL, 'Anhang E, Tabelle E.4',
'Maßnahme: „bei Abflüssen von Flächen der Gruppe S (Tabelle 5): tiefenorientierte Probenahme der bewachsenen Bodenzone, Analyse auf Akkumulation und Durchbruch von relevanten gewässerschädlichen Substanzen" — Typische Häufigkeit: „durch Wasserbehörden festzulegen, z. B. alle 10 Jahre" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.4 Mulden-Rigolen – Tiefenorientierte Probenahme und Analyse (Flächen der Gruppe S)');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.4 Mulden-Rigolen – Kontrolle des Muldenüberlaufs', 'begehung', 'mindestens zweimal jährlich', 6, 'Anhang E, Tabelle E.4',
'Maßnahme: „Kontrolle des Muldenüberlaufs" — Typische Häufigkeit: „mindestens zweimal jährlich" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.4 Mulden-Rigolen – Kontrolle des Muldenüberlaufs');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.4 Mulden-Rigolen – Reinigung und Justierung der Drosseleinrichtung', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.4',
'Maßnahme: „Reinigung und Justierung der Drosseleinrichtung" — Typische Häufigkeit: „nach Bedarf" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.4 Mulden-Rigolen – Reinigung und Justierung der Drosseleinrichtung');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.4 Mulden-Rigolen – Spülung Sicker- und Verbindungsrohre', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.4',
'Maßnahme: „Spülung Sicker- und Verbindungsrohre" — Typische Häufigkeit: „nach Bedarf" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.4 Mulden-Rigolen – Spülung Sicker- und Verbindungsrohre');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.4 Mulden-Rigolen – Reinigung des Muldenüberlaufs', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.4',
'Maßnahme: „Reinigung des Muldenüberlaufs" — Typische Häufigkeit: „nach Bedarf" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.4 Mulden-Rigolen – Reinigung des Muldenüberlaufs');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.4 Mulden-Rigolen – Reparatur oder Austausch der Drosseleinrichtung', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.4',
'Maßnahme: „Reparatur oder Austausch der Drosseleinrichtung" — Typische Häufigkeit: „nach Bedarf" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.4 Mulden-Rigolen – Reparatur oder Austausch der Drosseleinrichtung');

-- Tabelle E.5: Betriebliche Maßnahmen für Versickerungsschächte [S. 91]

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.5 Versickerungsschächte – Inspektion der vorgeschalteten Behandlungsanlage', 'begehung', 'mindestens einmal jährlich oder nach Herstellerangaben', 12, 'Anhang E, Tabelle E.5',
'Maßnahme: „Inspektion der vorgeschalteten Behandlungsanlage" — Typische Häufigkeit: „mindestens einmal jährlich oder nach Herstellerangaben" — Bemerkung: „Vorbeugung Kolmation und Schadstoffeintrag" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.5 Versickerungsschächte – Inspektion der vorgeschalteten Behandlungsanlage');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.5 Versickerungsschächte – Überprüfung auf Wasseraufstau', 'begehung', 'mindestens einmal jährlich', 12, 'Anhang E, Tabelle E.5',
'Maßnahme: „Überprüfung auf Wasseraufstau" — Typische Häufigkeit: „mindestens einmal jährlich" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.5 Versickerungsschächte – Überprüfung auf Wasseraufstau');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.5 Versickerungsschächte – Erfassung der Sickerrate', 'messung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.5',
'Maßnahme: „Erfassung der Sickerrate" — Typische Häufigkeit: „nach Bedarf" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.5 Versickerungsschächte – Erfassung der Sickerrate');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.5 Versickerungsschächte – Reinigung der vorgeschalteten Behandlungsanlage', 'wartung', 'nach Herstellerangaben', NULL, 'Anhang E, Tabelle E.5',
'Maßnahme: „Reinigung der vorgeschalteten Behandlungsanlage" — Typische Häufigkeit: „nach Herstellerangaben" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.5 Versickerungsschächte – Reinigung der vorgeschalteten Behandlungsanlage');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.5 Versickerungsschächte – Wiederherstellung der Durchlässigkeit (Schacht Typ B)', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.5',
'Maßnahme: „Schacht Typ B: Wiederherstellung der Durchlässigkeit durch Schälen oder Austausch des Filtersands" — Typische Häufigkeit: „nach Bedarf" [S. 91]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.5 Versickerungsschächte – Wiederherstellung der Durchlässigkeit (Schacht Typ B)');

-- Tabelle E.6: Betriebliche Maßnahmen für Versickerungsbecken [S. 92]

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.6 Versickerungsbecken – Überprüfung auf Ablagerungen oder Laubansammlungen', 'begehung', 'mindestens zweimal jährlich', 6, 'Anhang E, Tabelle E.6',
'Maßnahme: „Überprüfung auf Ablagerungen oder Laubansammlungen" — Typische Häufigkeit: „mindestens zweimal jährlich" — Bemerkung: „insbesondere Zulauf und Sohle" [S. 92]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.6 Versickerungsbecken – Überprüfung auf Ablagerungen oder Laubansammlungen');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.6 Versickerungsbecken – Überprüfung auf Schäden', 'begehung', 'mindestens zweimal jährlich', 6, 'Anhang E, Tabelle E.6',
'Maßnahme: „Überprüfung auf Schäden" — Typische Häufigkeit: „mindestens zweimal jährlich" — Bemerkung: „z. B. Erosionsschäden" [S. 92]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.6 Versickerungsbecken – Überprüfung auf Schäden');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.6 Versickerungsbecken – Inspektion der Zuläufe und Vorbehandlungsanlagen', 'begehung', 'mindestens zweimal jährlich', 6, 'Anhang E, Tabelle E.6',
'Maßnahme: „Inspektion der Zuläufe und ggf. der Vorbehandlungsanlagen" — Typische Häufigkeit: „mindestens zweimal jährlich" [S. 92]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.6 Versickerungsbecken – Inspektion der Zuläufe und Vorbehandlungsanlagen');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.6 Versickerungsbecken – Kontrolle der Vegetationsdeckung des Bodens', 'begehung', 'mindestens zweimal jährlich', 6, 'Anhang E, Tabelle E.6',
'Maßnahme: „Kontrolle der Vegetationsdeckung des Bodens" — Typische Häufigkeit: „mindestens zweimal jährlich" — Bemerkung: „Fehlstellen beim Bewuchs, Vegetationsdeckung, Zustand und Deckungsgrad der Vegetation" [S. 92]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.6 Versickerungsbecken – Kontrolle der Vegetationsdeckung des Bodens');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.6 Versickerungsbecken – Kontrolle der Versickerungsfläche auf Verdichtung oder Dauerstau', 'begehung', 'mindestens zweimal jährlich', 6, 'Anhang E, Tabelle E.6',
'Maßnahme: „Kontrolle der Versickerungsfläche auf Verdichtung oder Dauerstau" — Typische Häufigkeit: „mindestens zweimal jährlich" [S. 92]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.6 Versickerungsbecken – Kontrolle der Versickerungsfläche auf Verdichtung oder Dauerstau');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.6 Versickerungsbecken – Überprüfung der Versickerungsfähigkeit bzw. Einstauzeit', 'messung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.6',
'Maßnahme: „Überprüfung der Versickerungsfähigkeit bzw. Einstauzeit" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „z. B. mit Doppelring-Infiltrometer, Erfassung der Sickerrate im Betrieb" [S. 92]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.6 Versickerungsbecken – Überprüfung der Versickerungsfähigkeit bzw. Einstauzeit');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.6 Versickerungsbecken – Unterhaltungspflege mit Mahd, Grünschnitt', 'wartung', 'mindestens einmal jährlich, nach Begrünungskonzept', 12, 'Anhang E, Tabelle E.6',
'Maßnahme: „Unterhaltungspflege mit Mahd, Grünschnitt etc." — Typische Häufigkeit: „mindestens einmal jährlich, nach Begrünungskonzept" — Bemerkung: „Mähgut entfernen, Boden muss abgetrocknet und gut tragfähig sein" [S. 92]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.6 Versickerungsbecken – Unterhaltungspflege mit Mahd, Grünschnitt');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.6 Versickerungsbecken – Beseitigung von Schmutz, Müll, Laub und Grobstoffen', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.6',
'Maßnahme: „Beseitigung von Schmutz, Müll, Laub, Ablagerungen und sonstigen Grobstoffen" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „kein Befahren des Beckens mit schwerem Gerät, Boden muss abgetrocknet und gut tragfähig sein" [S. 92]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.6 Versickerungsbecken – Beseitigung von Schmutz, Müll, Laub und Grobstoffen');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.6 Versickerungsbecken – Ausbesserung von Schäden', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.6',
'Maßnahme: „Ausbesserung von Schäden" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „z. B. Fehlstellen beim Bewuchs, Vegetationsdeckung, Zustand und Deckungsgrad der Vegetation" [S. 92]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.6 Versickerungsbecken – Ausbesserung von Schäden');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select '5d64c48d-4cca-48d9-99f0-d1348082f0da', 'E.6 Versickerungsbecken – Wiederherstellen der Durchlässigkeit', 'wartung', 'nach Bedarf', NULL, 'Anhang E, Tabelle E.6',
'Maßnahme: „Wiederherstellen der Durchlässigkeit" — Typische Häufigkeit: „nach Bedarf" — Bemerkung: „z. B. Pflege anpassen, Kolmation beseitigen" [S. 92]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = '5d64c48d-4cca-48d9-99f0-d1348082f0da' and ms.title = 'E.6 Versickerungsbecken – Wiederherstellen der Durchlässigkeit');

-- ============================ DWA-M-1200-3 (Entwurf Juli 2025) ==============

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd', '5.1.6 Dichtheitsprüfung des Bewässerungssystems vor Saisonbeginn', 'messung', 'vor Beginn jeder Bewässerungssaison', NULL, 'Abschnitt 5.1.6',
'„Es wird empfohlen, Dichtheitsprüfungen des Bewässerungssystems vor Beginn jeder Bewässerungssaison durchzuführen." [S. 25]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd' and ms.title = '5.1.6 Dichtheitsprüfung des Bewässerungssystems vor Saisonbeginn');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd', '7.2.4 Regelmäßige Beprobung auf mikrobiologische Grenzwerte (Speicher)', 'laborbericht', 'regelmäßig', NULL, 'Abschnitt 7.2.4',
'„Zudem empfiehlt sich eine regelmäßige Beprobung zur Überprüfung der Einhaltung der geltenden mikrobiologischen Grenzwerte nebst Festsetzung der Monitoring-Intervalle im Risikomanagementplan." [S. 51]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd' and ms.title = '7.2.4 Regelmäßige Beprobung auf mikrobiologische Grenzwerte (Speicher)');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd', '7.2.4 Offene Speicher – Beobachtung Sedimentbildung und regelmäßige Sedimententnahme', 'wartung', 'regelmäßig', NULL, 'Abschnitt 7.2.4',
'„Sedimentbildung ist zu beobachten. Eine Sedimententnahme hat regelmäßig zu erfolgen." [S. 52]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd' and ms.title = '7.2.4 Offene Speicher – Beobachtung Sedimentbildung und regelmäßige Sedimententnahme');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd', '7.2.4 Geschlossene Speicher – Beobachtung von Sediment- und Biofilmbildung', 'begehung', NULL, NULL, 'Abschnitt 7.2.4',
'„Sediment- und Biofilmbildung sind zu beobachten und diesen durch hierfür geeignete Maßnahmen zu begegnen, zum Beispiel durch eine Reinigung." [S. 52]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd' and ms.title = '7.2.4 Geschlossene Speicher – Beobachtung von Sediment- und Biofilmbildung');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd', '7.2.5 Reinigung/Desinfektion technischer Speicher zu Saisonbeginn', 'wartung', 'mindestens zum Beginn der neuen Bewässerungssaison', NULL, 'Abschnitt 7.2.5',
'„Technische Speicher sind mindestens zum Beginn der neuen Bewässerungssaison vor der ersten Befüllung der Anlage zu reinigen und gegebenenfalls zu desinfizieren." [S. 52]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd' and ms.title = '7.2.5 Reinigung/Desinfektion technischer Speicher zu Saisonbeginn');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd', '7.3.2 Überprüfung der Emitter und Düsenköpfe auf Funktionsfähigkeit', 'begehung', 'vor der Saison sowie mehrfach in der Saison', NULL, 'Abschnitt 7.3.2',
'„Die Funktionsfähigkeit von Emittern ist deshalb bei dauerhaft installierten Tropfbewässerungssystemen sowie Düsenköpfen von Mikrosprühsystemen vor der Saison sowie mehrfach in der Saison auf Verkrustungen, übermäßige Biofilmbildung und Funktionsfähigkeit gemäß RMP zu überprüfen. Die Überprüfungen sind bei laufender Bewässerung durchzuführen." [S. 54]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd' and ms.title = '7.3.2 Überprüfung der Emitter und Düsenköpfe auf Funktionsfähigkeit');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd', '7.3.2 Regelmäßige Probenahme auf mikrobiologische Anforderungen', 'laborbericht', 'regelmäßig', NULL, 'Abschnitt 7.3.2',
'„Durch regelmäßige Probenahme ist zu überprüfen, ob die mikrobiologischen Anforderungen eingehalten werden. Im Betriebsplan sowie im RMP ist festzuhalten, wie häufig und an welchen Stellen Proben zu entnehmen sind." [S. 55]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd' and ms.title = '7.3.2 Regelmäßige Probenahme auf mikrobiologische Anforderungen');

insert into maintenance_schedules (standard_id, title, category, interval_text, interval_months, clause_reference, source_quote)
select 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd', '7.3.2 Saisonbegleitende Spülungen des Bewässerungssystems und der Emitter', 'wartung', 'regelmäßig saisonbegleitend', NULL, 'Abschnitt 7.3.2',
'„Es sollten regelmäßig saisonbegleitende Spülungen des Bewässerungssystems sowie der Emitter erfolgen." [S. 55]'
where not exists (select 1 from maintenance_schedules ms where ms.standard_id = 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd' and ms.title = '7.3.2 Saisonbegleitende Spülungen des Bewässerungssystems und der Emitter');

commit;
