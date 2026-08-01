-- ============================================================================
-- ROLLBACK for scripts/maintenance-pack-1.sql — STAGED ONLY, DO NOT APPLY
-- Deletes exactly the 55 rows staged by maintenance-pack-1.sql
-- (47x DWA-A-138-1, 8x DWA-M-1200-3), matched per-title and constrained to
-- rows carrying a printed-page source_quote marker.
-- ============================================================================

begin;

delete from maintenance_schedules
where standard_id in ('5d64c48d-4cca-48d9-99f0-d1348082f0da', 'd3d8fbe3-a2a0-480e-be10-c9cab95dd0fd')
  and source_quote like '%[S.%'
  and title in (
    -- DWA-A-138-1, Tabelle E.1
    'E.1 Durchlässige Flächenbefestigungen – Überprüfung auf Pfützen oder Ablagerungen',
    'E.1 Durchlässige Flächenbefestigungen – Überprüfung der Versickerungsleistung durch geeignete Methoden',
    'E.1 Durchlässige Flächenbefestigungen – Fegen/Kehren, Mahd, Beseitigung von Schmutz und Laub',
    'E.1 Durchlässige Flächenbefestigungen – Wiederherstellung der Versickerungsleistung',
    -- DWA-A-138-1, Tabelle E.2
    'E.2 Versickerungsmulden – Überprüfung auf Ablagerungen oder Laubansammlungen',
    'E.2 Versickerungsmulden – Überprüfung auf Schäden am Speichervolumen',
    'E.2 Versickerungsmulden – Inspektion der Zuläufe',
    'E.2 Versickerungsmulden – Kontrolle der Vegetationsdeckung des Bodens',
    'E.2 Versickerungsmulden – Kontrolle der Versickerungsfläche auf Verdichtung, Pfützenbildung oder Dauerstau',
    'E.2 Versickerungsmulden – Überprüfung der Versickerungsfähigkeit bzw. Einstauzeit',
    'E.2 Versickerungsmulden – Tiefenorientierte Probenahme und Analyse (Flächen der Gruppe S)',
    'E.2 Versickerungsmulden – Unterhaltungspflege mit Mahd, Jäten, Grünschnitt',
    'E.2 Versickerungsmulden – Beseitigung von Schmutz, Müll, Laub und Störstoffen',
    'E.2 Versickerungsmulden – Reinigung der Zuläufe und Freihaltung von Bewuchs',
    'E.2 Versickerungsmulden – Ausbesserung von Schäden (Speichervolumen)',
    'E.2 Versickerungsmulden – Wiederherstellen der Durchlässigkeit',
    'E.2 Versickerungsmulden – Wiederherstellen der Vegetationsdecke',
    -- DWA-A-138-1, Tabelle E.3
    'E.3 Rigolen – Inspektion der vorgeschalteten Behandlungsanlage',
    'E.3 Rigolen – Inspektion der Einstiegs- und Kontrollschächte',
    'E.3 Rigolen – Inspektion der Rigolenkörper',
    'E.3 Rigolen – Reinigung der vorgeschalteten Behandlungsanlage',
    'E.3 Rigolen – Pflege und Wartung Rückstauklappe',
    'E.3 Rigolen – Reinigung der Rigole (aufspülen und absaugen)',
    'E.3 Rigolen – Reparatur oder Austausch der vorgeschalteten Behandlungsanlage',
    -- DWA-A-138-1, Tabelle E.4
    'E.4 Mulden-Rigolen – Inspektion der Drosseleinrichtung',
    'E.4 Mulden-Rigolen – Inspektion der Sicker- und Verbindungsrohre',
    'E.4 Mulden-Rigolen – Tiefenorientierte Probenahme und Analyse (Flächen der Gruppe S)',
    'E.4 Mulden-Rigolen – Kontrolle des Muldenüberlaufs',
    'E.4 Mulden-Rigolen – Reinigung und Justierung der Drosseleinrichtung',
    'E.4 Mulden-Rigolen – Spülung Sicker- und Verbindungsrohre',
    'E.4 Mulden-Rigolen – Reinigung des Muldenüberlaufs',
    'E.4 Mulden-Rigolen – Reparatur oder Austausch der Drosseleinrichtung',
    -- DWA-A-138-1, Tabelle E.5
    'E.5 Versickerungsschächte – Inspektion der vorgeschalteten Behandlungsanlage',
    'E.5 Versickerungsschächte – Überprüfung auf Wasseraufstau',
    'E.5 Versickerungsschächte – Erfassung der Sickerrate',
    'E.5 Versickerungsschächte – Reinigung der vorgeschalteten Behandlungsanlage',
    'E.5 Versickerungsschächte – Wiederherstellung der Durchlässigkeit (Schacht Typ B)',
    -- DWA-A-138-1, Tabelle E.6
    'E.6 Versickerungsbecken – Überprüfung auf Ablagerungen oder Laubansammlungen',
    'E.6 Versickerungsbecken – Überprüfung auf Schäden',
    'E.6 Versickerungsbecken – Inspektion der Zuläufe und Vorbehandlungsanlagen',
    'E.6 Versickerungsbecken – Kontrolle der Vegetationsdeckung des Bodens',
    'E.6 Versickerungsbecken – Kontrolle der Versickerungsfläche auf Verdichtung oder Dauerstau',
    'E.6 Versickerungsbecken – Überprüfung der Versickerungsfähigkeit bzw. Einstauzeit',
    'E.6 Versickerungsbecken – Unterhaltungspflege mit Mahd, Grünschnitt',
    'E.6 Versickerungsbecken – Beseitigung von Schmutz, Müll, Laub und Grobstoffen',
    'E.6 Versickerungsbecken – Ausbesserung von Schäden',
    'E.6 Versickerungsbecken – Wiederherstellen der Durchlässigkeit',
    -- DWA-M-1200-3
    '5.1.6 Dichtheitsprüfung des Bewässerungssystems vor Saisonbeginn',
    '7.2.4 Regelmäßige Beprobung auf mikrobiologische Grenzwerte (Speicher)',
    '7.2.4 Offene Speicher – Beobachtung Sedimentbildung und regelmäßige Sedimententnahme',
    '7.2.4 Geschlossene Speicher – Beobachtung von Sediment- und Biofilmbildung',
    '7.2.5 Reinigung/Desinfektion technischer Speicher zu Saisonbeginn',
    '7.3.2 Überprüfung der Emitter und Düsenköpfe auf Funktionsfähigkeit',
    '7.3.2 Regelmäßige Probenahme auf mikrobiologische Anforderungen',
    '7.3.2 Saisonbegleitende Spülungen des Bewässerungssystems und der Emitter'
  );

commit;
