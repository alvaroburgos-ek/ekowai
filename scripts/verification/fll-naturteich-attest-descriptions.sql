-- ============================================================================
-- FLL-Naturteich: plain-language descriptions for the 7 attest (Nachweis)
-- fields (STAGED, NOT APPLIED). Data-only — visible in the UI without a code
-- deploy once applied.
-- Source: FLL Naturteich 2017 EN PDF, transcript FLL-Naturteich-2017_pdftotext.txt,
-- page offset proven printed = physical − 3 (see fll-naturteich-design-pack.sql).
-- Every text is explicitly marked as a non-normative EKOWAI paraphrase with the
-- governing clause + printed page. All 7 fields had description = NULL on
-- 2026-08-14 (checked); rollback restores NULL.
-- Rollback: rollback-fll-naturteich-attest-descriptions.sql
-- ============================================================================

UPDATE fields SET description = 'Kurz gesagt: Der Baugrund wurde tatsächlich untersucht bzw. bewertet — Bodenart, Tragfähigkeit, Schichtaufbau, Setzungsrisiko, Grundwasserstand, Schichtenwasser und vorhandene Leitungen/Hindernisse sind bekannt (ggf. durch Bohrungen/Sondierungen); nicht tragfähiger Untergrund wird verdichtet oder verbessert. (Kurzfassung EKOWAI, nicht normativ — maßgeblich FLL-Naturteich 2017 EN, §8.1.3 gedruckte S. 36–37 u. §9.1 S. 41)'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-01' AND fields.symbol = 'attest_fllnt_01_req_03';

UPDATE fields SET description = 'Kurz gesagt: Die Verkehrssicherungspflicht wurde mit dem Eigentümer besprochen und die Schutzmaßnahmen sind festgelegt — insbesondere gegen Unfälle von (auch unbefugten) Kindern, z. B. durch Einfriedung; sie gilt während der Bauphase UND nach Fertigstellung; je attraktiver der Teich für Kinder, desto wirksamer müssen die Maßnahmen sein. (Kurzfassung EKOWAI, nicht normativ — maßgeblich FLL-Naturteich 2017 EN, §8.1.4 gedruckte S. 37–38, BGH-Rechtsprechung)'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-01' AND fields.symbol = 'attest_fllnt_01_req_04';

UPDATE fields SET description = 'Kurz gesagt: Beim Aushub ist der Untergrund tragfähig — andernfalls wurde er verdichtet oder anderweitig verbessert (z. B. geeignete Bodenschicht); falls erforderlich, wurde die Tragfähigkeit statisch nachgewiesen. (Kurzfassung EKOWAI, nicht normativ — maßgeblich FLL-Naturteich 2017 EN, §9.1 gedruckte S. 41)'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-06' AND fields.symbol = 'attest_fllnt_06_req_14';

UPDATE fields SET description = 'Kurz gesagt: Der Schwimmbereich ist sicher und pflegbar gestaltet — keine scharfen Kanten, Oberflächen leicht zu reinigen, möglichst keine Pflanzen im Schwimmbereich; Bodenbeläge/Stufen trittsicher und rutschhemmend, Sand/Kies nur gewaschen; mindestens EIN Ein-/Ausstieg vorhanden, Metallleitern nach DIN VDE 0100-702 geerdet. (Kurzfassung EKOWAI, nicht normativ — maßgeblich FLL-Naturteich 2017 EN, §9.5.1–9.5.3 gedruckte S. 43)'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-06' AND fields.symbol = 'attest_fllnt_06_req_18';

UPDATE fields SET description = 'Kurz gesagt: Die Wasserzirkulation ist geplant — Oberflächenabzug über frei überströmte Überlaufwehre (starr z. B. Rinne/Gully oder flexibel z. B. Skimmer), damit Schmutz (Laub, Pollen) nicht absinkt; Anzahl, Art und Anordnung der Entnahmestellen passend zu Umwälzvolumenstrom, örtlichen Verhältnissen und gewähltem Teichtyp. (Kurzfassung EKOWAI, nicht normativ — maßgeblich FLL-Naturteich 2017 EN, §10.3 gedruckte S. 54–55)'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-09' AND fields.symbol = 'attest_fllnt_09_req_23';

UPDATE fields SET description = 'Kurz gesagt: Die Bepflanzung ist typgerecht geplant — Pflanzen reinigen das Wasser (Nährstoffaufnahme, Besiedlungsfläche für den Biofilm; submers = unter Wasser, emers = Sumpfpflanzen); bei Typ I–III gelten wegen des nährstoffarmen Starts besonders hohe Anforderungen an Pflanzenauswahl, Saat-/Pflanzgutqualität und Substrat, und die Pflanzung selbst erfolgt sehr sorgfältig; Wurzeln dürfen die Filterfunktion nicht beeinträchtigen. (Kurzfassung EKOWAI, nicht normativ — maßgeblich FLL-Naturteich 2017 EN, §10.4 gedruckte S. 55–58 u. §6.2.2 S. 29)'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-12' AND fields.symbol = 'attest_fllnt_12_req_25';

UPDATE fields SET description = 'Kurz gesagt: Bei Kontrollen/Wartung festgestellte Reparaturen werden im vereinbarten Umfang ausgeführt — z. B. Filtermaterial ersetzen, defekte Technik tauschen, Pflanzen ersetzen/ergänzen, Einbauten instand setzen; nach einem unvermeidbaren Komplett-Wasserwechsel braucht das biologische System i. d. R. 1–2 Monate zur Stabilisierung. (Kurzfassung EKOWAI, nicht normativ — maßgeblich FLL-Naturteich 2017 EN, §12.4 gedruckte S. 64)'
FROM worksheet_templates wt JOIN standards s ON s.id = wt.standard_id
WHERE fields.worksheet_template_id = wt.id AND s.code = 'FLL-Naturteich'
  AND wt.code = 'FLLNT-13' AND fields.symbol = 'attest_fllnt_13_req_28';
