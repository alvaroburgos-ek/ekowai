-- ============================================================================
-- SR-1 field-verification pack — DWA-A-138-1 (Arbeitsblatt DWA-A 138-1, Oktober 2024, Weißdruck —
-- Anlagen zur Versickerung von Niederschlagswasser, Teil 1: Planung, Bau, Betrieb)
-- Generated: 2026-09-05 — md-verified pass (owner ruling 2026-09-05: the markdown transcript is the
--   verification source; PDF only where no markdown exists). Grade: VC (SR-3), labelled as such.
-- Source md: C:\Users\Ekowai\Desktop\Supabase data\Guidelines knowledge markdown\DWA-A_138-1_WD (5).md
--   Page convention: this mathpix transcript carries NO standalone page-number lines. "printed p.N" is the
--   printed page on which the cited section/table begins per the Inhalt (TOC, md lines 128–266), cross-checked
--   against the mathpix image indices (e.g. Tab. 3 image "-026.jpg" = PDF p.26 = printed p.24, i.e. the −2
--   offset proven in the 2026-08-01 PDF pass). Sub-page precision within a section is not derivable from the md.
--   LaTeX math is rendered to plain symbols (k_f, ≥, ·, 10⁻⁶); md line breaks joined; "[...]" = omitted run
--   inside one clause; " | " joins two clauses.
-- Scope A (default job): fields with verification_status NOT IN ('verified_against_standard','corrected'):
--   110 examined / 73 quoted → verified_against_standard / 37 app-metadata → inferred_from_worksheet
--   (phase-gate roll-ups, completion dates, design-review workflow, app-derived deviation metrics; same class as
--   the 2026-08-01 A138 metadata ruling) / 0 residue.
-- Scope B (quote backfill): 101 fields already verified_against_standard but verification_quote IS NULL —
--   quote + note appended, STATUS UNCHANGED (section B below; rollback nulls the quote only).
-- Equations: 5 not yet verified → 4 quoted / 1 residue (Gl.2c, no printed formula);
--   41 verified equations get their printed formula as quote backfill (status unchanged).
-- Rollback: scripts/verification/rollback-dwa-a-138-1-md-verification-pack.sql
-- ============================================================================

-- ######################## SECTION A — default job (status changes) ########################

-- App/project metadata (exempt class): A138-03.data_completeness, A138-09.phase_2_gate_result, A138-09.kostra_data_complete, A138-09.kf_value_certified, A138-09.site_data_complete, A138-09.belastungskategorie_assigned, A138-09.treatment_concept_decided, A138-09.data_collection_completion_date, A138-09.data_quality_assessment, A138-09.data_gaps_documented, A138-14.phase_3_gate_result, A138-14.general_calc_completion_date, A138-23.phase_4_gate_result, A138-23.facility_specific_dimensioning_complete, A138-23.facility_design_completion_date, A138-23.recommended_phase_4_gate, A138-23.phase_4_recommendation_reasons, A138-24.compilation_completion_date, A138-25.qf_validation_complete, A138-25.verification_completion_date, A138-25.verification_notes, A138-27.preliminary_vs_final_A_C_dev_pct, A138-27.preliminary_vs_final_storage_dev_pct, A138-27.qsac_deviation_from_threshold, A138-27.design_review_status, A138-27.design_review_reviewer, A138-27.design_review_date, A138-27.design_review_comments, A138-27.corrective_actions_required, A138-27.corrective_actions_description, A138-28.final_compliance_verdict, A138-28.data_collection_phase_complete, A138-28.general_calc_phase_complete, A138-28.facility_design_phase_complete, A138-28.verification_phase_complete, A138-28.final_signoff_date, A138-28.final_signoff_engineer
update public.fields set verification_status='inferred_from_worksheet', verification_note='md-pass 2026-09-05: app/project metadata — the guideline does not define this field; exempt per the 2026-08-01 metadata ruling', verified_at=now() where id in ('9a9cc984-d1d3-4b64-b3a4-0fd057bf4b67','f797705a-4853-4d7d-8b06-dd8ab50e762c','57016d04-50a6-4996-a08c-b0920049a056','f00fcf1a-981a-4d75-9a50-65f10384a017','3bbf278c-41bc-406a-bdf0-1520fe3b9636','49dd42d1-c3a5-42d8-a101-5a8737a332d7','286a96b9-92ae-4381-bab8-18ff2a2f08df','fa3f8fdd-2baf-4279-9d72-ec0d4945bf7b','661be02e-b9de-46bb-abd7-5a278dfe62f0','af98385d-d6b6-4416-94cf-1e221f99c3a7','f69c321c-c08f-4954-868f-e584ef88bf2e','eaaac39e-4f23-48d2-ae6b-dba56f7f853c','b7552496-47e8-4303-9fe8-3db76a8d47b3','59ed4ac9-1e6f-4c6f-b703-5335bfac0ecd','44378c29-cd03-4915-8ab8-05bf38f070e3','fbbb7c9e-48c4-49bc-9819-1c9d0e7dcd37','b46324eb-8545-4d84-a0df-f30bf0ccfb3e','0598d606-947f-49d1-9f83-bfc84b9534b6','bc890f79-f655-41c1-9fa5-457bf784c7c1','92d409fc-8901-48af-bb35-eca3f2a2ae39','fab6ed35-86f5-44a5-a8b8-12706cb3fa9c','402f7602-32c0-4096-82d1-6e07c7ca9167','8b9d632e-b46a-44c4-93bc-6e0cbea0809d','5ea81604-9db9-4c92-b75c-46317cebfe58','14577af6-88a4-448d-b00e-1f419262ff27','690183af-64ae-46c2-aa7a-9c2c5dbde039','4e4c4ea2-6d41-46e7-9003-7bf186e111bb','b823f75d-772e-4f98-b92b-eaff1aed1eb7','eb581c73-3274-471c-a741-ae0f621c468c','34719597-d612-45ab-8ca7-0b078b5c7543','67ae6f35-7519-4384-9074-497ce105cb33','86526203-09f8-463a-acc3-9405c72f53ad','41ae3564-77da-46aa-b933-7a6f178da82f','210d6a08-8afd-4e20-8bd2-39ea67e6f604','6a79ea81-c95e-4523-9cc4-5d5f7583da06','0a882c02-10db-4054-93d8-de08282c68f1','9630a3d5-cfc6-48ae-ba9e-2ba2752d006c') and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-01 Projektregistrierung ----------

-- attest_a138_01_a138_req_27
update public.fields set verification_status='verified_against_standard', verification_quote='Die Anforderungen für die Versickerung des Niederschlagswassers aus dem Anliefer-/Verladebereich sowie von Flächen der Flächengruppen D und sonstigen Flächen mit besonderer Belastung (S) bedürfen grundsätzlich der vorherigen Abstimmung mit der zuständigen Behörde. — printed p.31 | Die Anforderungen für die Versickerung des Niederschlagswassers aus dem Anliefer-/Verladebereich sowie von Flächen der Flächengruppen D und sonstigen Flächen mit besonderer Belastung ( S ) bedürfen grundsätzlich der vorherigen Abstimmung mit der zuständigen Behörde. — printed p.33', verification_note='md-verified 2026-09-05 (§5.2.3.2 p.31 + §5.2.3.3 p.33; gate REQ-27 cites "5.2.3.4", a clause that does not exist in the 2024 edition (see STAGED S-3)) [VC]', verified_at=now() where id='13efa8c3-87a8-4d27-ad89-cec6fda1db5c' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-02 Standortbewertung und Umsetzbarkeit ----------

-- feasibility_determination
update public.fields set verification_status='verified_against_standard', verification_quote='Sind alle Kriterien der Tabelle 3, Spalte 2 erfüllt, ist eine Versickerung von Niederschlagswasser mit einem geeigneten Verfahren (siehe Abschnitt 6) zulässig und bezüglich der örtlichen Gegebenheiten möglich. [...] Eine Versickerung ist in der Regel nicht zulässig, wenn die Kriterien der Spalte 3 nicht erfüllt werden bzw. technische oder planerische Maßnahmen nicht möglich sind oder eines der Kriterien der Spalte 4 zutrifft. — printed p.23 | Tabelle 3: Überprüfung der Umsetzbarkeit einer entwässerungstechnischen Versickerung: Versickerung ist möglich / Versickerung ist potenziell möglich / Versickerung ist nicht möglich — printed p.24', verification_note='md-verified 2026-09-05 (§5.1.2 p.23, Tab. 3 p.24; enum feasible/conditional/not_feasible = the three Tab. 3 columns 1:1) [VC]', verified_at=now() where id='f195d7e1-6c32-415f-bacb-b42e4be14965' and verification_status not in ('verified_against_standard','corrected');

-- kf_initial_estimate
update public.fields set verification_status='verified_against_standard', verification_quote='Für eine ausschließliche Versickerung ohne zusätzliche Ableitungsmöglichkeit sollte der Durchlässigkeitsbeiwert der aufnehmenden Bodenschicht in der Regel mindestens 1·10⁻⁶ m/s betragen (Bewertung nach Anhang A). — printed p.22 | Abschätzung mit Boden- oder Geodaten-Karten [...] Ersteinschätzung; nicht für Bemessung — printed p.81', verification_note='md-verified 2026-09-05 (§5.1.1 "Beschaffenheit Untergrund" p.22–23, Tab. A.1 p.81; preliminary estimate only, refined on A138-05) [VC]', verified_at=now() where id='bdd1d9fa-4ff7-43cc-a92e-25c9d79f6e40' and verification_status not in ('verified_against_standard','corrected');

-- building_pit_depth_a
update public.fields set verification_status='verified_against_standard', verification_quote='Wenn sich der Grundwasserstand ständig unterhalb der Kellersohle befindet und somit auch keine Veranlassung für den Bau eines wasserdichten Kellers vorliegt, sollte der Abstand der Versickerungsanlage vom Baugrubenfußpunkt gemäß Bild 4 das 1,5-Fache der Baugrubentiefe a nicht unterschreiten. — printed p.36 | Bei nicht unterkellerten Gebäuden ist die Tiefe des Fundaments anstelle der Baugrubentiefe zur Ermittlung des Abstands heranzuziehen. — printed p.36', verification_note='md-verified 2026-09-05 (§5.3.2 p.36) [VC]', verified_at=now() where id='7653b765-1ca9-4230-8944-bf96048dc470' and verification_status not in ('verified_against_standard','corrected');

-- authority_coordination_required
update public.fields set verification_status='verified_against_standard', verification_quote='Der Abstand der Sohle der Versickerungsanlage zum Grundwasser sollte in Abhängigkeit der Belastung und Menge des Zuflusses sowie der bodenphysikalischen Eigenschaften des Bodens getroffen werden und muss mit der Genehmigungsbehörde abgestimmt werden. Bei einem Abstand der Sohle der Versickerungsanlage zum maßgeblichen mittleren höchsten Grundwasserstand (MHGW) von ≥ 1 m (siehe 5.2.1) kann in der Regel auf diese Abstimmung verzichtet werden; in Trinkwasser- oder Heilquellenschutzgebieten gelten weitergehende Anforderungen. — printed p.22', verification_note='md-verified 2026-09-05 (§5.1.1 "Grundwasserflurabstand" p.22) [VC]', verified_at=now() where id='596f5cd2-21b3-4445-a881-01cfcefc77f9' and verification_status not in ('verified_against_standard','corrected');

-- distance_to_building_check
update public.fields set verification_status='verified_against_standard', verification_quote='Wenn sich der Grundwasserstand ständig unterhalb der Kellersohle befindet und somit auch keine Veranlassung für den Bau eines wasserdichten Kellers vorliegt, sollte der Abstand der Versickerungsanlage vom Baugrubenfußpunkt gemäß Bild 4 das 1,5-Fache der Baugrubentiefe a nicht unterschreiten. Ein Abstand von mindestens 0,50 m von der Böschungsoberkante zur Versickerungsanlage stellt zusätzlich sicher, dass das Sickerwasser nicht direkt in den Verfüllungsbereich der Baugrube gelangt. — printed p.36', verification_note='md-verified 2026-09-05 (§5.3.2 p.36; "sollte"-class rule, no gate exists on this check (STAGED S-6)) [VC]', verified_at=now() where id='03847f12-78e4-415c-944a-1a77bdb4f07d' and verification_status not in ('verified_against_standard','corrected');

-- gw_clearance
update public.fields set verification_status='verified_against_standard', verification_quote='Die Mächtigkeit des Sickerraums a bezogen auf den MHGW sollte in Abhängigkeit der Belastung und Menge des Zuflusses sowie der bodenphysikalischen Eigenschaften des Bodens festgelegt werden und muss mit der Genehmigungsbehörde abgestimmt werden. [...] Bei einem Abstand der Sohle der Versickerungsanlage zum maßgeblichen MHGW von ≥ 1 m kann in der Regel auf diese Abstimmung verzichtet werden. — printed p.25 | Abstand Sohle Versickerungsanlage zum MHGW ≥ 1 m — printed p.24', verification_note='md-verified 2026-09-05 (§5.2.1 p.25, Tab. 3 p.24) [VC]', verified_at=now() where id='97e1cae0-09f0-4ae7-bbd9-b3aaf4ce02cf' and verification_status not in ('verified_against_standard','corrected');

-- slope_risk
update public.fields set verification_status='verified_against_standard', verification_quote='Der Standort der Versickerungsanlage liegt nicht in der Nähe eines Hangs | Der Standort der Versickerungsanlage liegt in der Nähe eines Hangs. Hangrutschung oder Wasseraustritt des infiltrierten Oberflächenwassers an einem Hang sind unwahrscheinlich bzw. nicht nachteilig. | Hangrutschung oder nachteiliger Wasseraustritt des infiltrierten Oberflächenwassers an einem Hang sind wahrscheinlich — printed p.24', verification_note='md-verified 2026-09-05 (Tab. 3 p.24 (Hang row, columns 2/3/4 = none/unlikely/probable)) [VC]', verified_at=now() where id='618b3e68-0674-4687-8c7c-3a22f69d922e' and verification_status not in ('verified_against_standard','corrected');

-- distance_to_building_actual
update public.fields set verification_status='verified_against_standard', verification_quote='Von Versickerungsanlagen dürfen keine Schäden an Gebäuden und Anlagen ausgehen. Deshalb sollten Mindestabstände zu Gebäuden eingehalten werden, wobei als Kriterium die Art und Tiefe der Unterkellerung und die Lage der Grundwasseroberfläche zu berücksichtigen sind. [...] Bei Gebäuden ohne wasserdruckhaltende Abdichtung sollten Versickerungsanlagen grundsätzlich nicht in Verfüllungsbereichen in Gebäudenähe, zum Beispiel Baugruben, angeordnet werden. — printed p.36', verification_note='md-verified 2026-09-05 (§5.3.2 p.36) [VC]', verified_at=now() where id='399382f4-fb28-4ca1-af9c-fb4427406ac1' and verification_status not in ('verified_against_standard','corrected');

-- residential_accessibility
update public.fields set verification_status='verified_against_standard', verification_quote='Bei oberirdischen Versickerungsanlagen im Wohnumfeld muss die Zugänglichkeit auf Bereiche beschränkt werden, bei denen (auch bei normalen Niederschlägen) keine großen Strömungen auftreten und die Wassertiefe in Anlehnung an DIN 18034-1:2020 maximal 40 cm inklusive Freibord beträgt. — printed p.51', verification_note='md-verified 2026-09-05 (§5.3.5 p.51) [VC]', verified_at=now() where id='e8b15afd-c117-4422-a8b7-82a0b4721e9e' and verification_status not in ('verified_against_standard','corrected');

-- contaminated_land_status
update public.fields set verification_status='verified_against_standard', verification_quote='Keine Altlasten, altlastenverdächtige Flächen oder schädliche Bodenveränderungen vorhanden | Örtlich begrenzte Altlasten, altlastenverdächtige Flächen oder schädliche Bodenveränderungen liegen in der Nähe vor. Die Mobilisierung von Schadstoffen ist unwahrscheinlich oder kann beseitigt werden. | Altlasten, altlastenverdächtige Flächen oder schädliche Bodenveränderungen liegen im Boden vor. Es besteht die Gefahr der Mobilisierung von Schadstoffen durch die entwässerungstechnische Versickerung. — printed p.24', verification_note='md-verified 2026-09-05 (Tab. 3 p.24 (Altlasten row = none/nearby/present)) [VC]', verified_at=now() where id='50e7171a-cc09-4e97-9841-f3fd16b02fd3' and verification_status not in ('verified_against_standard','corrected');

-- building_clearance_status
update public.fields set verification_status='verified_against_standard', verification_quote='Mindestabstände zu Gebäuden/Baugruben und sonstigen baulichen Strukturen sind einzuhalten/unkritisch (siehe 5.3.2) | Mindestabstände zu Gebäuden/Baugruben und sonstigen baulichen Strukturen sind nicht einzuhalten; bautechnische Sicherungen sind möglich (z. B. weiße oder schwarze Wanne) | Mindestabstände zu Gebäuden/Baugruben und sonstigen baulichen Strukturen sind nicht einzuhalten; bautechnische Sicherungen sind nicht möglich — printed p.24', verification_note='md-verified 2026-09-05 (Tab. 3 p.24 (Mindestabstände row = met/not_met_protection_possible/not_met_no_protection)) [VC]', verified_at=now() where id='83b90cfb-9bb0-4949-8b50-d7607e1445cf' and verification_status not in ('verified_against_standard','corrected');

-- geotech_hazards
update public.fields set verification_status='verified_against_standard', verification_quote='Eine geotechnische Gefährdung im Projektgebiet (z. B. Bodenverflüssigung, Quellböden, Unterspülung, Karstgesteine) durch die Versickerungsanlage ist ausgeschlossen | Geotechnische Gefährdungen sind im näheren Umfeld möglich, aber nicht am Standort der Versickerungsanlage | Geotechnische Gefährdungen liegen am Standort vor — printed p.24', verification_note='md-verified 2026-09-05 (Tab. 3 p.24 (geotechnische Gefährdung row = none/nearby/at_site)) [VC]', verified_at=now() where id='968a00d6-b5d2-4ff4-8e13-27d1eb7e8641' and verification_status not in ('verified_against_standard','corrected');

-- direct_gw_injection
update public.fields set verification_status='verified_against_standard', verification_quote='Das Einleiten von Niederschlagswasser direkt in das Grundwasser, zum Beispiel über Brunnen, ist nicht zulässig. Abweichungen hiervon sind im Einzelfall mit der Wasserbehörde zu klären. — printed p.25', verification_note='md-verified 2026-09-05 (§5.2.1 p.25; gate REQ-COV-02 anchors here) [VC]', verified_at=now() where id='b3c8fb94-bf62-49cb-bd92-60f76976c6ec' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-03 Datenquellen-Dokumentation ----------

-- f_methode
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 11: Korrekturfaktoren Infiltrationsrate: Großflächige Feldversuche in Testgrube/Probeschurf (≥ 1 m²) 1; Kleinflächige Feldversuche: kleine Testgrube/ Probeschurf (< 1 m²) 0,9; Doppelzylinder-Infiltrometer 0,9; Open-End-Test 0,8; Laborverfahren mit ungestörten Proben (z. B. Permeameter) 0,7; Laborverfahren mit gestörten Proben/ Sieblinienauswertung für Sandböden 0,1 — printed p.46 | der Korrekturfaktor für die Bestimmungsmethode Wasserdurchlässigkeit f_Methode nach Tabelle 11 ist in diesem Fall zu vernachlässigen. — printed p.46', verification_note='md-verified 2026-09-05 (§5.3.3.6 Tab. 11 p.46; fixed per-method values (standard_fixed)) [VC]', verified_at=now() where id='97fb59ba-91d8-4049-9cca-15d3b309839f' and verification_status not in ('verified_against_standard','corrected');

-- permeability_test_method
update public.fields set verification_status='verified_against_standard', verification_quote='Die Ergebnisse der unterschiedlichen Bestimmungsmethoden sind nach Tabelle A. 1 mit einem Korrekturfaktor bei der Bemessung von Versickerungsanlagen zu korrigieren (siehe 5.3.3.6). — printed p.80 | Folgende Laborverfahren stehen für die Bestimmung der Wasserdurchlässigkeit zur Verfügung: Permeameterversuche; Stechzylinderproben; Analyse der Kornverteilung (Sieblinienauswertung). — printed p.80 | Folgende Verfahren können als Feldmethoden zur Anwendung kommen: Bestimmung der Infiltrationsrate mit dem Doppelzylinder-Infiltrometer; Bestimmung der Durchlässigkeit mit der Bohrlochmethode; Auffüllversuche in Bohrlöchern - Open-End-Test [...]; Schurfversickerung mit klein- und großflächigen Pilot-Anlagen / Probeschürfen / Testgruben — printed p.80', verification_note='md-verified 2026-09-05 (Anh. A p.80, Tab. A.1 p.81; enum granularity (feldversuch/laborversuch/korngroessenanalyse/literaturwert) is EKOWAI-defined coarsening of the 8 Tab. A.1 methods; "literaturwert" ≈ Abschätzung mit Karten/Bodenansprache, which Tab. A.1 marks "nicht für Bemessung" (no gate blocks it — see STAGED S-6)) [VC]', verified_at=now() where id='c454ce3f-8ea6-45a9-b32f-cd953eb65d4b' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-06 Wasserqualität Bewertung ----------

-- belastungskategorie
update public.fields set verification_status='verified_against_standard', verification_quote='In Bezug auf den Referenzparameter AFS63 enthält Tabelle 5 die Zuordnung unterschiedlicher Flächentypen und Flächennutzungen zu den Belastungskategorien I (gering belastetes Niederschlagswasser), II (mäßig belastetes Niederschlagswasser) und III (stark belastetes Niederschlagswasser). — printed p.26 | Von der Kategorisierung nach Tabelle 5 kann in begründeten Fällen abgewichen werden. — printed p.26', verification_note='md-verified 2026-09-05 (§5.2.2 p.26, Tab. 5 p.27–29) [VC]', verified_at=now() where id='ae2dc292-8b53-42a3-9949-cfff7043868e' and verification_status not in ('verified_against_standard','corrected');

-- treatment_required
update public.fields set verification_status='verified_against_standard', verification_quote='Die Versickerung über die bewachsene Bodenzone gilt als Behandlungsmaßnahme. — printed p.30 | Grundsätzlich sind oberirdische Versickerungsanlagen unterirdischen vorzuziehen (siehe 4.1). Bei Einsatz unterirdischer Versickerungsanlagen sind dezentrale Behandlungsanlagen vorzuschalten. Tabelle 7 definiert Anforderungen an die dezentrale Niederschlagswasserbehandlung vor Versickerung über unterirdische Versickerungsanlagen. — printed p.32', verification_note='md-verified 2026-09-05 (§5.2.3.2 p.30, §5.2.3.3 p.32) [VC]', verified_at=now() where id='748839c7-c248-4ebd-91c0-f3737dcb9552' and verification_status not in ('verified_against_standard','corrected');

-- bbz_thickness
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 6: Anforderungen an die Niederschlagswasserbehandlung bei Versickerung durch eine bewachsene Bodenzone: Mindestmächtigkeit bewachsene Bodenzone ≥ 20 cm / ≥ 30 cm — printed p.31 | Die jeweilige Mindestmächtigkeit der bewachsenen Bodenzone nach Tabelle 6 ist nach Setzung der Schicht (nach Abschluss der Baumaßnahme) einzuhalten. — printed p.31', verification_note='md-verified 2026-09-05 (§5.2.3.2 Tab. 6 p.31; field unit is m while the table prints cm (0,20/0,30 m)) [VC]', verified_at=now() where id='d85e192b-c4d1-484e-9d2f-420e4fce40ae' and verification_status not in ('verified_against_standard','corrected');

-- bbz_kf_max_check
update public.fields set verification_status='verified_against_standard', verification_quote='Folgende Anforderungen an den Boden der bewachsenen Bodenzone werden empfohlen: [...] maximale Durchlässigkeit ≤ 1·10⁻⁴ m/s (Methoden siehe auch Anhang A, Tabelle A.1); — printed p.30', verification_note='md-verified 2026-09-05 (§5.2.3.2 p.30; "empfohlen"-class) [VC]', verified_at=now() where id='a89a7cc8-c8ca-41f2-afa8-a6f838752bbc' and verification_status not in ('verified_against_standard','corrected');

-- eta_AFS63
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 7: Anforderungen an die dezentrale Niederschlagswasserbehandlung vor Versickerung über unterirdische Versickerungsanlagen (Rigolen, Versickerungsschächte): Gesamtwirkungsgrade bei Bemessung und Betrieb η_AFS63: VW1/V1/BG1 40 %; VW2/V2/BF/BG2 70 %; BL/V3/BG3 80 % — printed p.33 | Für dezentrale Behandlungsanlagen werden erforderliche Wirkungsgrade für AFS63 und gelöste Stoffe festgelegt. — printed p.32', verification_note='md-verified 2026-09-05 (§5.2.3.3 Tab. 7 p.33) [VC]', verified_at=now() where id='d6625e09-f60d-4ab1-b8cb-69ac16830be4' and verification_status not in ('verified_against_standard','corrected');

-- eta_geloest
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 7: [...] η_gelöste Stoffe: VW1/V1/BG1 50 % (**); VW2/V2/BF/BG2 65 % (**); BL/V3/BG3 75 % (**) — printed p.33 | (**) Der Wirkungsgrad η_gelöste Stoffe bezieht sich ausschließlich auf die Referenzparameter Kupfer und Zink. — printed p.33', verification_note='md-verified 2026-09-05 (§5.2.3.3 Tab. 7 p.33) [VC]', verified_at=now() where id='83c8707b-e4d5-4c08-9337-8377c7efbdc3' and verification_status not in ('verified_against_standard','corrected');

-- treatment_efficiency_check
update public.fields set verification_status='verified_against_standard', verification_quote='Die genannten Wirkungsgrade beziehen sich auf eine Bemessung der Behandlungsanlage mit einer kritischen Regenspende von 25 l/(s·ha) (Regelung analog Deutsches Institut für Bautechnik, DIBt 2017). — printed p.32 | Tabelle 7: [...] η_AFS63 40 % / 70 % / 80 %; η_gelöste Stoffe 50 % / 65 % / 75 % (**) — printed p.33', verification_note='md-verified 2026-09-05 (§5.2.3.3 p.32, Tab. 7 p.33; D/SD1/SD2/S-groups carry (*) = authority ruling, no numeric threshold) [VC]', verified_at=now() where id='a9d01674-74a1-462e-95ae-32e4b7bfa6b6' and verification_status not in ('verified_against_standard','corrected');

-- flaechengruppe
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 5: Kategorisierung von Niederschlagswasser bebauter oder befestigter Flächen (Quelle: analog Arbeitsblatt DWA-A 102-2/BWK-A 3-2:2020): Flächenart / Flächenspezifizierung / Flächengruppe (Kurzzeichen) / Belastungskategorie (BK): Dächer (D) [...] D; [...] VW1; [...] V1; [...] VW2; [...] V2; [...] V3; [...] BG1; [...] BF; [...] BL; [...] BG2; [...] SD1; [...] SD2; [...] SV bzw. SVW; [...] SF; [...] SL; [...] BG3; [...] SG; [...] SA — printed p.27', verification_note='md-verified 2026-09-05 (§5.2.2 Tab. 5 p.27–29; enum = the 19 printed Kurzzeichen 1:1 (SV and SVW split into two tokens)) [VC]', verified_at=now() where id='a2e73497-426d-4c82-9ce8-65746bf33554' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-08 Bemessungshäufigkeit und Parameter ----------

-- n
update public.fields set verification_status='verified_against_standard', verification_quote='Bei der Wahl der Bemessungshäufigkeit muss das Schadenspotenzial und die resultierende Beeinträchtigung durch mögliche Überflutungen im Versagensfall der Versickerungsanlage in Anlehnung an DIN EN 752 berücksichtigt werden. — printed p.39 | Tabelle 8: Hinweise zur Festlegung von Bemessungs- und Überflutungshäufigkeiten für Versickerungsanlagen: (1) gering (≤ 0,33/a) (≤ 0,5/a); (2) mäßig (≤ 0,2/a) (≤ 0,33/a); (3) stark ≥ 5 a (≤ 0,2/a); (4) sehr stark ≥ 10 a (≤ 0,1/a) — printed p.40 | Für die Bemessungshäufigkeit n nach Tabelle 8 darf kein Überlauf aus der Versickerungsanlage [...] auftreten. — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.4 p.39–41, Tab. 8 p.40; Tab. 8 gives upper bounds ("≤"), Tab. 12 the range 0,02–0,5 — gate REQ-08 whitelists four point values (STAGED S-5, SR-2)) [VC]', verified_at=now() where id='571fa233-2267-48cb-b7d3-9ed12c9f4e10' and verification_status not in ('verified_against_standard','corrected');

-- simple_method_applicable
update public.fields set verification_status='verified_against_standard', verification_quote='Das Einzugsgebiet A_E hat eine Fläche von maximal 200 ha oder die Fließzeit t_f bis zur Versickerungsanlage beträgt maximal 15 min. | Die gewählte bzw. zulässige Überschreitungshäufigkeit des Speichervolumens beträgt n ≥ 0,1/a bzw. T_n ≤ 10 a. | Die spezifische Versickerungs-/Abflussleistung bezogen auf den Bemessungswert der Zuflüsse AC ist q_s ≥ 2 l/(s·ha). | Die Regenhäufigkeit wird mit der Bemessungshäufigkeit gleichgesetzt. — printed p.37 | Die Einhaltung der Bedingungen für das Einfache Verfahren sind bei der Bemessung nachzuweisen. — printed p.37', verification_note='md-verified 2026-09-05 (§5.3.3.2 p.37) [VC]', verified_at=now() where id='10d5bceb-7459-4fc8-a391-edb905ecd50c' and verification_status not in ('verified_against_standard','corrected');

-- T_n
update public.fields set verification_status='verified_against_standard', verification_quote='Wiederkehrzeit: mittlere Zeitspanne, in der ein Ereignis einen Wert erreicht oder überschreitet (Kehrwert der Häufigkeit) — printed p.15 | T_n a Statistische Wiederkehrzeit eines Bemessungsregens — printed p.18 | n ≥ 0,1/a bzw. T_n ≤ 10 a — printed p.37', verification_note='md-verified 2026-09-05 (§3.1 p.15, Tab. 2 p.18, §5.3.3.2 p.37; T_n = 1/n) [VC]', verified_at=now() where id='8dfd843d-5666-4b72-9136-87ab8a2c355f' and verification_status not in ('verified_against_standard','corrected');

-- f_ort
update public.fields set verification_status='verified_against_standard', verification_quote='Mit dem Korrekturfaktor f_Ort werden örtliche Einflussfaktoren auf den Durchlässigkeitswert für die Bemessung bewertet. Eine Auswahl entsprechender Kriterien ist mit Tabelle 10 gegeben. Dieser Faktor ist unter anderem vor dem Hintergrund der Informationslage im gegebenen Wertebereich von 0,3 bis 1,0 begründet zu wählen. — printed p.45', verification_note='md-verified 2026-09-05 (§5.3.3.6 p.45–46; standard_range 0,3–1,0 (SR-2 engineer selection); Tab. 10 is an image in the md (criteria not transcribed)) [VC]', verified_at=now() where id='704b9b41-d090-46e8-9e21-bed9ebc3ae02' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-14 Zusammenfassung Allgemeine Berechnungen ----------

-- A_C_calculated
update public.fields set verification_status='verified_against_standard', verification_quote='Für die Berechnung der Zuflüsse zu Versickerungsanlagen im Einfachen Verfahren ergibt sich der Rechenwert AC gemäß GL. (2): AC = Σ(A_E,b,a,i · C_i) + Σ(A_E,nb,a,i · C_i) (2) — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41; read-only copy of the A138-07 Gl. (2) output) [VC]', verified_at=now() where id='20ad56bb-24ea-4acf-b7cf-f87e394a7101' and verification_status not in ('verified_against_standard','corrected');

-- k_i_calculated
update public.fields set verification_status='verified_against_standard', verification_quote='Die bemessungsrelevante Infiltrationsrate für die Bemessung wird als Produkt aus dem ermittelten Durchlässigkeitsbeiwert und dem resultierenden Korrekturfaktor nach GL. (5) berechnet: k_i = k · f_K = konstant (5) — printed p.44', verification_note='md-verified 2026-09-05 (§5.3.3.6 p.44; read-only copy of the A138-11 Gl. (5) output) [VC]', verified_at=now() where id='52a51d54-8ea0-4d15-b0ca-b6af8773fb09' and verification_status not in ('verified_against_standard','corrected');

-- Q_S_calculated
update public.fields set verification_status='verified_against_standard', verification_quote='Die Versickerungsleistung ergibt sich nach GI. (4) als Produkt aus der Versickerungsfläche und der bemessungsrelevanten Infiltrationsrate. Q_S = k_i · A_S · 10³ (4) — printed p.44', verification_note='md-verified 2026-09-05 (§5.3.3.6 p.44; read-only copy of the A138-12 Gl. (4) output) [VC]', verified_at=now() where id='35a8ae2b-0ac7-4908-985a-be17a5595257' and verification_status not in ('verified_against_standard','corrected');

-- V_VA_calculated
update public.fields set verification_status='verified_against_standard', verification_quote='Zur Ermittlung des erforderlichen Speichervolumens sind die Zufluss- und Versickerungsvolumina miteinander zu verknüpfen: V_VA = (Q_zu − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³ (8) — printed p.47', verification_note='md-verified 2026-09-05 (§5.3.3.7 p.47; read-only copy of the A138-13 Gl. (8) output) [VC]', verified_at=now() where id='40ab67eb-6b2d-4184-a9f6-bbd2bed858f9' and verification_status not in ('verified_against_standard','corrected');

-- q_S_AC_check_result
update public.fields set verification_status='verified_against_standard', verification_quote='Die spezifische Versickerungs-/Abflussleistung q_s zur Überprüfung der Anwendungsbedingung gemäß 5.3.1 wird gemäß GI. (9) berechnet: q_S,AC = (k_i · A_S,m · 1000 + Q_Dr) / AC · 10⁴ ≥ 2 l/(s·ha) (9) — printed p.48', verification_note='md-verified 2026-09-05 (§5.3.3.7 p.48; read-only copy of the A138-13 Gl. (9) check) [VC]', verified_at=now() where id='ac2545a2-c867-47e3-a5bc-94dc98ec25fc' and verification_status not in ('verified_against_standard','corrected');

-- D_optimal_min
update public.fields set verification_status='verified_against_standard', verification_quote='Die maßgebende Dauer des Bemessungsregens D muss im Einfachen Verfahren schrittweise bestimmt werden. Bei diesem iterativen Verfahren wird die Bemessungsgleichung GI. (8) für unterschiedliche Wertepaare der Dauerstufe D und zugehöriger Regenspende r_D,n berechnet, um ein eindeutiges Maximum für das erforderliche Speichervolumen zu finden (siehe Arbeitsblatt DWA-A 117). — printed p.47', verification_note='md-verified 2026-09-05 (§5.3.3.7 p.47; read-only copy of the A138-13 iteration result) [VC]', verified_at=now() where id='a77f36ad-bddc-4620-8569-4df12a7b7139' and verification_status not in ('verified_against_standard','corrected');

-- r_D_n_optimal
update public.fields set verification_status='verified_against_standard', verification_quote='Die Ermittlung der maßgeblichen Dauerstufe D und der Regenspende r_D(n) erfolgt bei Versickerungsanlagen mit Speicherfunktion iterativ (siehe Abschnitt 6). Als Regendaten sind örtliche Niederschlag-/ Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden. — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41–42; read-only copy of the A138-13 iteration result) [VC]', verified_at=now() where id='c801b5a1-9b74-4362-b4f0-7a1a7a1bebfb' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-15 Anlagentyp-Auswahl ----------

-- facility_type_selected
update public.fields set verification_status='verified_against_standard', verification_quote='In Bild 7 sind die prinzipiellen technischen Lösungen für Versickerungsanlagen und ihre Charakterisierung hinsichtlich der Systemkomponenten, der Flächenverfügbarkeit und der Versickerungsfähigkeit des Untergrunds dargestellt. — printed p.52 | In Abschnitt 6 werden für ausgewählte Anlagen systemspezifische Bemessungsvorgaben dokumentiert und als Bemessungsgleichungen zur Verfügung gestellt. — printed p.52 | 6.2 Versickerungsfläche [...] 6.3 Versickerungsmulde [...] 6.4 Rigole [...] 6.5 Mulden-Rigolen-Element [...] 6.6 Mulden-Rigolen-System [...] 6.7 Versickerungsschacht [...] 6.8 Versickerungsbecken — printed p.7', verification_note='md-verified 2026-09-05 (§6.1 p.52 + Inhalt p.7; enum = the seven §6.2–6.8 facility types 1:1 (Bild 7 is an image in the md)) [VC]', verified_at=now() where id='dc69c995-d57c-4f1e-80b2-36d3d83ae4a6' and verification_status not in ('verified_against_standard','corrected');

-- attest_a138_15_a138_req_18
update public.fields set verification_status='verified_against_standard', verification_quote='Für Varianten von Versickerungsanlagen müssen auf Grundlage von 5.3.3 anlagen-/systemspezifische Besonderheiten insbesondere bei der Festlegung der versickerungswirksamen Fläche zur Berechnung der Versickerungsleistung nach GI. (4) bei der Bemessung berücksichtigt werden. Entsprechende Berechnungsansätze sind gegebenenfalls nachvollziehbar bei der Bemessung zu dokumentieren. Eine Bewertung der Varianten sind bezüglich des Grundwasserschutzes gemäß 5.2 einer Einzelfallbetrachtung zu unterziehen. — printed p.52', verification_note='md-verified 2026-09-05 (§6.1 p.52; the gate REQ-18 source_quote ("Die Auswahl der Versickerungsanlage erfolgt anlagenspezifisch … vom Planer nachzuweisen") is NOT in the source text — replaced here by the printed §6.1 obligation (STAGED S-4)) [VC]', verified_at=now() where id='7571f62b-45b9-48fe-a284-b13ccb898b57' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-16 Flächenversickerung Bemessung ----------

-- rainfall_table_ref
update public.fields set verification_status='verified_against_standard', verification_quote='Als Regendaten sind örtliche Niederschlag-/ Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden. Bei KOSTRA-Datensätzen können die exakten Werte des DWD (DWD-Vorgabe) verwendet werden. Der aktuelle Stand des Arbeitsblatts DWA-A 138-1:2024 bezieht sich auf KOSTRA-DWD-2020 (2023). — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41–42; provenance reference of the rainfall table used on this worksheet (same symbol on A138-13/16–22)) [VC]', verified_at=now() where id='d1384016-0000-4000-8000-000000000001' and verification_status not in ('verified_against_standard','corrected');

-- k_i_ge_r_check
update public.fields set verification_status='verified_against_standard', verification_quote='Die Bemessungsgleichung GL. (12) für A_s liefert hydrologisch nur dann sinnvolle Ergebnisse, wenn die Bedingung nach GL. (13) eingehalten ist: k_i > r_D(n) · 10⁻⁷ (13) Wenn die Bedingung gemäß GL. (13) nicht erfüllt ist, erhält man ein negatives Ergebnis, weil die Niederschlagsintensität die vorhandene Infiltrationsrate übersteigt. — printed p.54', verification_note='md-verified 2026-09-05 (§6.2.2 p.54; gate REQ-31) [VC]', verified_at=now() where id='55a89c11-5c0d-4e5d-b81c-ddc1ba8942c3' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-17 Muldenversickerung Bemessung ----------

-- freibord
update public.fields set verification_status='verified_against_standard', verification_quote='Freibord: Abstand zwischen der höchsten Wasserspiegellage und der Becken- bzw. Anlagenoberkante — printed p.14 | Tabelle 14: [...] Freibord Überlauf (2) cm: Versickerungsfläche -; Versickerungsmulde -; [Mulden-Rigolen-Element/-System] ≥ 10; Rigole -; Versickerungsschacht -; Versickerungsbecken ≥ 35 — printed p.73 | (2) Abstand zwischen der höchsten Wasserspiegellage und der Böschungsoberkante; — printed p.73', verification_note='md-verified 2026-09-05 (§3.1 p.14, §6.9 Tab. 14 p.73; Tab. 14 prints "-" for the plain Versickerungsmulde — the ≥ 10 cm applies to MRE/MRS, ≥ 35 cm to Becken; in the md the ≥ 10 cell sits under MRS with the MRE cell empty (multicolumn lost) — PDF check of the span recommended; is_required review in STAGED S-7) [VC]', verified_at=now() where id='835b0827-bdf8-4e88-9e36-4b6c1a6f1e98' and verification_status not in ('verified_against_standard','corrected');

-- rainfall_table_ref
update public.fields set verification_status='verified_against_standard', verification_quote='Als Regendaten sind örtliche Niederschlag-/ Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden. Bei KOSTRA-Datensätzen können die exakten Werte des DWD (DWD-Vorgabe) verwendet werden. — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41–42; provenance reference (same symbol on A138-13/16–22)) [VC]', verified_at=now() where id='d1384017-0000-4000-8000-000000000001' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-18 Rigole Bemessung ----------

-- rainfall_table_ref
update public.fields set verification_status='verified_against_standard', verification_quote='Als Regendaten sind örtliche Niederschlag-/ Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden. Bei KOSTRA-Datensätzen können die exakten Werte des DWD (DWD-Vorgabe) verwendet werden. — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41–42; provenance reference (same symbol on A138-13/16–22)) [VC]', verified_at=now() where id='d1384018-0000-4000-8000-000000000001' and verification_status not in ('verified_against_standard','corrected');

-- n_R_Bemessung
update public.fields set verification_status='verified_against_standard', verification_quote='Die Bemessungshäufigkeit für die Mulde eines Mulden-Rigolen-Elements wird in der Regel mit n = 1/a und damit größer als die Bemessungshäufigkeit der Rigole, die nach Tabelle 6 und Tabelle 8 zu wählen ist, gewählt. — printed p.62 | Tabelle 8: [...] (1) gering (≤ 0,33/a) (≤ 0,5/a); (2) mäßig (≤ 0,2/a) (≤ 0,33/a); (3) stark ≥ 5 a (≤ 0,2/a); (4) sehr stark ≥ 10 a (≤ 0,1/a) — printed p.40', verification_note='md-verified 2026-09-05 (§6.5.2 p.62, §5.3.3.4 Tab. 8 p.40) [VC]', verified_at=now() where id='fcdcff58-7176-48d3-84e0-65e5e168e608' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-19 Mulden-Rigolen-Element Bemessung ----------

-- n_M_overflow_check
update public.fields set verification_status='verified_against_standard', verification_quote='Dazu wird die statistische Überlaufhäufigkeit der Mulde direkt in die unterirdische Versickerung (n_M) vor dem Hintergrund der stofflichen Flächenbelastungen begrenzt. Die Anforderungen nach Tabelle 6 und Tabelle 7 sind zu beachten. — printed p.61 | Tabelle 6: [...] bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 2/a [...] AC/A_S,m ≤ 30 bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 1/a [...] AC/A_S,m ≤ 15 bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 1/a — printed p.31', verification_note='md-verified 2026-09-05 (§6.5.1 p.61, Tab. 6 p.31) [VC]', verified_at=now() where id='df45bc34-8097-4af3-9fce-dcea063841c0' and verification_status not in ('verified_against_standard','corrected');

-- n_M_overflow_limit
update public.fields set verification_status='verified_against_standard', verification_quote='Tabelle 6: Anforderungen an die Niederschlagswasserbehandlung bei Versickerung durch eine bewachsene Bodenzone: [BK I:] bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 2/a | [BK II, VW2/V2/BF/BG2:] AC/A_S,m ≤ 30 bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 1/a [≥ 20 cm] / AC/A_S,m ≤ 50 bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 1/a [≥ 30 cm] | [BL, BK III V3/BG3:] AC/A_S,m ≤ 15 bei Mulden-Rigolen: Überlauf in Rigole mit n_M max. 1/a / AC/A_S,m ≤ 30 bei Mulden-Rigole: Überlauf in Rigole mit n_M max. 1/a — printed p.31', verification_note='md-verified 2026-09-05 (§5.2.3.2 Tab. 6 p.31; standard_fixed 2/a (BK I) / 1/a (BK II, III); md rowspan for the 2/a cell sits on the BG1 row (PDF span over VW1/V1/BG1 assumed)) [VC]', verified_at=now() where id='bea2d323-6503-4c53-ad6c-75b6bd32deeb' and verification_status not in ('verified_against_standard','corrected');

-- rainfall_table_ref
update public.fields set verification_status='verified_against_standard', verification_quote='Als Regendaten sind örtliche Niederschlag-/ Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden. Bei KOSTRA-Datensätzen können die exakten Werte des DWD (DWD-Vorgabe) verwendet werden. — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41–42; provenance reference (same symbol on A138-13/16–22)) [VC]', verified_at=now() where id='d1384019-0000-4000-8000-000000000001' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-20 Mulden-Rigolen-System Bemessung ----------

-- rainfall_table_ref
update public.fields set verification_status='verified_against_standard', verification_quote='Als Regendaten sind örtliche Niederschlag-/ Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden. Bei KOSTRA-Datensätzen können die exakten Werte des DWD (DWD-Vorgabe) verwendet werden. — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41–42; provenance reference (same symbol on A138-13/16–22)) [VC]', verified_at=now() where id='d1384020-0000-4000-8000-000000000001' and verification_status not in ('verified_against_standard','corrected');

-- n_R_MRS
update public.fields set verification_status='verified_against_standard', verification_quote='Die Bemessung von Mulden-Rigolen-Systemen als Einzelelement erfolgt im Einfachen Verfahren anlog zur Bemessung von Mulden-Rigolen-Elementen (siehe 6.5.2). — printed p.66 | Die Bemessungshäufigkeit für die Mulde eines Mulden-Rigolen-Elements wird in der Regel mit n = 1/a und damit größer als die Bemessungshäufigkeit der Rigole, die nach Tabelle 6 und Tabelle 8 zu wählen ist, gewählt. — printed p.62', verification_note='md-verified 2026-09-05 (§6.6.2 p.66, §6.5.2 p.62, Tab. 8 p.40) [VC]', verified_at=now() where id='fe690684-99ef-4275-ae4c-997b6c1297a0' and verification_status not in ('verified_against_standard','corrected');

-- Q_zu_total_MRS
update public.fields set verification_status='verified_against_standard', verification_quote='Den Zufluss zur Versickerungsanlage erhält man nach GI. (3) für das Einfache Verfahren bei Vernachlässigung von Verzögerungseffekten durch den Abflusskonzentrationsprozess: Q_zu = r_D(n) · (AC + A_VA) · 10⁻⁴ (3) — printed p.41 | Die Bemessungsgleichung GI. (29) des Einfachen Verfahrens wird um den Drosselabfluss Q_Dr ergänzt: — printed p.66', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41, §6.6.2 p.66; §6.6.2 does not name Q_zu as an output — the inflow term (AC + A_VA)·10⁻⁷·r_D(n) is the numerator of Gl. (32); partial support) [VC]', verified_at=now() where id='0186774f-03d4-4eb9-bbe3-da72de137552' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-21 Schacht-/Rohrversickerung Bemessung ----------

-- schacht_filter_thickness
update public.fields set verification_status='verified_against_standard', verification_quote='Beim Schacht Typ B (Bild 15) liegen die seitlichen Durchtrittsöffnungen ausschließlich unterhalb einer Filterschicht des Sohlenbereichs. Die Entleerung des Speichervolumens im Schacht erfolgt vollständig über Durchsickerung der Filterschicht. Damit ist eine zusätzliche Reinigungswirkung im Schacht Typ B gegeben. Als Material für diese Filterschicht (≥ 50 cm) ist carbonathaltiger Sand mit einer Körnung von größer 0 mm bis 4 mm oder sind geeignete Substrate zu verwenden. — printed p.68', verification_note='md-verified 2026-09-05 (§6.7.1 p.68) [VC]', verified_at=now() where id='3d17099a-6c80-40ca-8b95-f37488608f20' and verification_status not in ('verified_against_standard','corrected');

-- schacht_filter_thickness_check
update public.fields set verification_status='verified_against_standard', verification_quote='Als Material für diese Filterschicht (≥ 50 cm) ist carbonathaltiger Sand mit einer Körnung von größer 0 mm bis 4 mm oder sind geeignete Substrate zu verwenden. Ein Durchlässigkeitsbeiwert von k_f ≤ 1·10⁻³ m/s muss für die Filterschicht gewährleistet sein. — printed p.68', verification_note='md-verified 2026-09-05 (§6.7.1 p.68) [VC]', verified_at=now() where id='d8a1f22b-d52a-41d4-8653-3f71dc8ad8f8' and verification_status not in ('verified_against_standard','corrected');

-- rainfall_table_ref
update public.fields set verification_status='verified_against_standard', verification_quote='Als Regendaten sind örtliche Niederschlag-/ Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden. Bei KOSTRA-Datensätzen können die exakten Werte des DWD (DWD-Vorgabe) verwendet werden. — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41–42; provenance reference (same symbol on A138-13/16–22)) [VC]', verified_at=now() where id='d1384021-0000-4000-8000-000000000001' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-22 Beckenversickerung Bemessung ----------

-- basin_h_check
update public.fields set verification_status='verified_against_standard', verification_quote='Versickerungsbecken haben in der Regel Einstauhöhen von h ≥ 0,5 m. — printed p.70 | Tabelle 14: [...] Einstauhöhe cm [...] Versickerungsbecken i. d. R. ≥ 50 — printed p.73', verification_note='md-verified 2026-09-05 (§6.8.1 p.70, Tab. 14 p.73; "in der Regel"-class — a PASS/FAIL check over-reads a typical value (no gate exists)) [VC]', verified_at=now() where id='bcc67b11-9a09-435b-a1de-f740f93ff776' and verification_status not in ('verified_against_standard','corrected');

-- V_B
update public.fields set verification_status='verified_against_standard', verification_quote='Bei der Bemessung im Einfachen Verfahren wird das erforderliche Speichervolumen für Versickerungsbecken analog zur Bemessung von Mulden (GI. (14) nach GL. (41)) bestimmt: V_VA = [(AC + A_VA) · 10⁻⁷ · r_D(n) − A_S,m · k_i − Q_Dr · 10⁻³] · D · 60 · f_Z · f_A (41) — printed p.71 | V_VA m³ erforderliches Speichervolumen Versickerungsbecken — printed p.71', verification_note='md-verified 2026-09-05 (§6.8.2 p.71) [VC]', verified_at=now() where id='bccccfd0-9272-4ef7-9152-0eb1aa4b8de7' and verification_status not in ('verified_against_standard','corrected');

-- rainfall_table_ref
update public.fields set verification_status='verified_against_standard', verification_quote='Als Regendaten sind örtliche Niederschlag-/ Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden. Bei KOSTRA-Datensätzen können die exakten Werte des DWD (DWD-Vorgabe) verwendet werden. — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41–42; provenance reference (same symbol on A138-13/16–22)) [VC]', verified_at=now() where id='d1384022-0000-4000-8000-000000000001' and verification_status not in ('verified_against_standard','corrected');

-- n_B_Bemessung
update public.fields set verification_status='verified_against_standard', verification_quote='Bei der Bemessung von Versickerungsbecken wird bei hohem Schadpotenzial im Versagensfall das Nachweisverfahren gemäß 5.3.3.3 empfohlen. — printed p.71 | Tabelle 8: [...] (1) gering (≤ 0,33/a) (≤ 0,5/a); (2) mäßig (≤ 0,2/a) (≤ 0,33/a); (3) stark ≥ 5 a (≤ 0,2/a); (4) sehr stark ≥ 10 a (≤ 0,1/a) — printed p.40', verification_note='md-verified 2026-09-05 (§6.8.2 p.71, §5.3.3.4 Tab. 8 p.40) [VC]', verified_at=now() where id='95d72a18-9601-4691-b1a3-5f3bebe6410e' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-23 Anlagen-Zusammenfassung ----------

-- facility_type_dimensioned
update public.fields set verification_status='verified_against_standard', verification_quote='In Abschnitt 6 werden für ausgewählte Anlagen systemspezifische Bemessungsvorgaben dokumentiert und als Bemessungsgleichungen zur Verfügung gestellt. — printed p.52 | 6.2 Versickerungsfläche [...] 6.3 Versickerungsmulde [...] 6.4 Rigole [...] 6.5 Mulden-Rigolen-Element [...] 6.6 Mulden-Rigolen-System [...] 6.7 Versickerungsschacht [...] 6.8 Versickerungsbecken — printed p.7', verification_note='md-verified 2026-09-05 (§6.1 p.52 + Inhalt p.7; enum = the seven §6.2–6.8 types 1:1) [VC]', verified_at=now() where id='1537f2e7-7812-4e9b-9694-74cb596990a0' and verification_status not in ('verified_against_standard','corrected');

-- facility_specific_volume_m3
update public.fields set verification_status='verified_against_standard', verification_quote='Außer bei der Flächenversickerung stellt das erforderliche Speichervolumen der Versickerungsanlage die Bemessungszielgröße dar. — printed p.47 | V_VA m³ Erforderliches Speichervolumen der Versickerungsanlage (VA), zum Beispiel V_M (Erforderliches Speichervolumen der Mulde), V_R (Erforderliches Speichervolumen der Rigole), V_MR (Erforderliches Speichervolumen des Mulden-Rigolen-Elements) — printed p.19', verification_note='md-verified 2026-09-05 (§5.3.3.7 p.47, Tab. 2 p.19) [VC]', verified_at=now() where id='3843f6f8-ec28-4af9-b1a9-19c77da3effd' and verification_status not in ('verified_against_standard','corrected');

-- facility_footprint_m2
update public.fields set verification_status='verified_against_standard', verification_quote='Der erforderliche Flächenbedarf für die Versickerungsmulde entspricht mindestens der maximalen Versickerungsfläche A_s,max, die sich bei Vorgabe einer Muldengeometrie mit der Beziehung in GI. (7) ergibt. — printed p.56 | Für die dezentrale Muldenversickerung werden bei guter bis mäßiger Durchlässigkeit des Bodens in der Regel 5 % bis 20 % der Größe der angeschlossenen Bemessungsfläche benötigt. — printed p.85', verification_note='md-verified 2026-09-05 (§6.3.2 p.56, Anh. C.2 p.85; the source defines footprint only for Mulden (≥ A_S,max) — for other types this is engineer_input) [VC]', verified_at=now() where id='e1d6777c-f7dd-46e6-8548-33def023004d' and verification_status not in ('verified_against_standard','corrected');

-- facility_meets_qsac
update public.fields set verification_status='verified_against_standard', verification_quote='q_S,AC = (k_i · A_S,m · 1000 + Q_Dr) / AC · 10⁴ ≥ 2 l/(s·ha) (9) — printed p.48 | Beim Einfachen Verfahren ist ein bemessungstechnischer Nachweis der Entleerungszeit nicht erforderlich, da die Anwendungsgrenze des Verfahrens q_S,Ac ≥ 2 l/(s·ha) greift (siehe Gl. (9) und 5.3.3.2). — printed p.56', verification_note='md-verified 2026-09-05 (§5.3.3.7 p.48, §6.3.2 p.56) [VC]', verified_at=now() where id='435e13fd-ff0e-4074-9968-c0e3a7dbd4b7' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-24 Kombinierte Ergebnis-Zusammenstellung ----------

-- attest_a138_24_a138_req_20
update public.fields set verification_status='verified_against_standard', verification_quote='Außer bei der Flächenversickerung stellt das erforderliche Speichervolumen der Versickerungsanlage die Bemessungszielgröße dar. Zur Ermittlung des erforderlichen Speichervolumens sind die Zufluss- und Versickerungsvolumina miteinander zu verknüpfen: V_VA = (Q_zu − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³ (8) — printed p.47', verification_note='md-verified 2026-09-05 (§5.3.3.7 p.47; the second sentence of the gate REQ-20 source_quote ("die Bemessungsgrößen sind vom Planer zusammenzustellen und zu verifizieren") is not in the source (STAGED S-4)) [VC]', verified_at=now() where id='59297f87-e050-4e64-9f1d-734233c9840e' and verification_status not in ('verified_against_standard','corrected');

-- A_C_final
update public.fields set verification_status='verified_against_standard', verification_quote='AC = Σ(A_E,b,a,i · C_i) + Σ(A_E,nb,a,i · C_i) (2) — printed p.41 | AC m² Rechenwert für die Bemessung, der sich aus der Summe aller an die Versickerungsanlage angeschlossenen Teilflächen, multipliziert mit dem jeweils zugehörigen Abflussbeiwert ergibt — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41; final copy of the Gl. (2) output) [VC]', verified_at=now() where id='9c1e0277-a308-4b04-bf34-34d25060274e' and verification_status not in ('verified_against_standard','corrected');

-- facility_type_final
update public.fields set verification_status='verified_against_standard', verification_quote='In Bild 7 sind die prinzipiellen technischen Lösungen für Versickerungsanlagen und ihre Charakterisierung hinsichtlich der Systemkomponenten, der Flächenverfügbarkeit und der Versickerungsfähigkeit des Untergrunds dargestellt. — printed p.52 | 6.2 Versickerungsfläche [...] 6.3 Versickerungsmulde [...] 6.4 Rigole [...] 6.5 Mulden-Rigolen-Element [...] 6.6 Mulden-Rigolen-System [...] 6.7 Versickerungsschacht [...] 6.8 Versickerungsbecken — printed p.7', verification_note='md-verified 2026-09-05 (§6.1 p.52 + Inhalt p.7; enum = §6.2–6.8 types 1:1) [VC]', verified_at=now() where id='da098e45-4fc3-4d6b-9a2e-3865d944e11b' and verification_status not in ('verified_against_standard','corrected');

-- geometry_final_summary
update public.fields set verification_status='verified_against_standard', verification_quote='Die Ausführungsplanung enthält unter anderem folgende Angaben (weitere Hinweise zur Ausführungsplanung enthält Anhang C): vollständige Darstellung der Versickerungsanlage in Grundriss und Schnitt; vollständige Angabe der geplanten Höhen und Böschungsneigungen; Darstellung und Bezeichnung aller Bauteile in ihren realen Maßen (symbolhafte Darstellungen sind zu vermeiden) inkl. Ableitungssysteme, Zu- und Überläufe; — printed p.51', verification_note='md-verified 2026-09-05 (§5.3.5 p.51; free-text summary of the documented geometry (documentation obligation, not a limit)) [VC]', verified_at=now() where id='6e301de0-e085-411a-aff7-36357d6d52c1' and verification_status not in ('verified_against_standard','corrected');

-- kostra_design_T_n
update public.fields set verification_status='verified_against_standard', verification_quote='T_n a Statistische Wiederkehrzeit eines Bemessungsregens — printed p.18 | Tabelle 8: [...] Bemessungshäufigkeit 1-mal in T bzw. (n) [...] (3) stark ≥ 5 a (≤ 0,2/a); (4) sehr stark ≥ 10 a (≤ 0,1/a) — printed p.40 | n ≥ 0,1/a bzw. T_n ≤ 10 a — printed p.37', verification_note='md-verified 2026-09-05 (Tab. 2 p.18, Tab. 8 p.40, §5.3.3.2 p.37) [VC]', verified_at=now() where id='8c5c8dc6-b193-4906-a544-c59ac86eb8e8' and verification_status not in ('verified_against_standard','corrected');

-- design_basis_final
update public.fields set verification_status='verified_against_standard', verification_quote='Die Bemessung von Versickerungsanlagen erfolgt auf der Grundlage der Bemessungsansätze des Arbeitsblatts DWA-A 117 „Bemessung von Regenrückhalteräumen“. Danach erfolgen die Berechnungen entweder nach einem einfachen Bemessungsverfahren unter Verwendung statistischer Niederschlagsauswertungen („Einfaches Verfahren“) oder durch Nachweis der Leistungsfähigkeit durch eine Niederschlag-Abfluss-Langzeitsimulation („Nachweisverfahren"). — printed p.37', verification_note='md-verified 2026-09-05 (§5.3.3.1 p.37; SR-2 selection between the two printed methods) [VC]', verified_at=now() where id='7e9f9766-bc8d-41b7-80be-2e22db659edc' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-25 Bemessungs-Eignungsprüfung ----------

-- design_adequacy_result
update public.fields set verification_status='verified_against_standard', verification_quote='Die spezifische Versickerungs-/Abflussleistung q_s zur Überprüfung der Anwendungsbedingung gemäß 5.3.1 wird gemäß GI. (9) berechnet: q_S,AC = (k_i · A_S,m · 1000 + Q_Dr) / AC · 10⁴ ≥ 2 l/(s·ha) (9) — printed p.48', verification_note='md-verified 2026-09-05 (§5.3.3.7 p.48; PASS/FAIL/NA states are EKOWAI-defined) [VC]', verified_at=now() where id='4b94be53-c55b-4ef7-9030-e01f82bc419e' and verification_status not in ('verified_against_standard','corrected');

-- qsac_value_verified
update public.fields set verification_status='verified_against_standard', verification_quote='q_S,AC = (k_i · A_S,m · 1000 + Q_Dr) / AC · 10⁴ ≥ 2 l/(s·ha) (9) — printed p.48 | q_S,AC l/(s•ha) spezifische Versickerungs-/Abflussleistung bezogen auf den Rechenwert für die Bemessung AC — printed p.48', verification_note='md-verified 2026-09-05 (§5.3.3.7 p.48) [VC]', verified_at=now() where id='f06229d6-0dac-46b3-b2d3-f47450f5690b' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-26 Überflutungsnachweis ----------

-- attest_a138_26_a138_req_26
update public.fields set verification_status='verified_against_standard', verification_quote='Für Versickerungsanlagen zur Grundstücksentwässerung innerörtlicher Grundstücke muss ein Überflutungsnachweis nach DIN 1986-100 erbracht werden, wenn der Rechenwert AC als Summenwert aller abflusswirksamen Flächen des Grundstücks größer als 800 m² ist. Für den Überflutungsnachweis ist die zurückzuhaltende Regenmenge zu berechnen und deren schadloser Verbleib auf dem Grundstück nachzuweisen. — printed p.49', verification_note='md-verified 2026-09-05 (§5.3.4.1 p.49) [VC]', verified_at=now() where id='2a65d005-b24e-4b02-a986-2db9081e19f8' and verification_status not in ('verified_against_standard','corrected');

-- attest_a138_26_a138_req_24
update public.fields set verification_status='verified_against_standard', verification_quote='Beim Überflutungsnachweis muss nachgewiesen werden, dass die zurückzuhaltende Regenwassermenge vollständig und schadlos auf dem Grundstück verbleiben kann. Dies kann durch die Bereitstellung von zusätzlichem Speicherraum oder durch Einstau in der Fläche erfolgen. — printed p.50', verification_note='md-verified 2026-09-05 (§5.3.4.1 p.50) [VC]', verified_at=now() where id='545f6bb1-d8c6-4056-a98b-01da1878e547' and verification_status not in ('verified_against_standard','corrected');

-- flood_check_result
update public.fields set verification_status='verified_against_standard', verification_quote='Beim Überflutungsnachweis muss nachgewiesen werden, dass die zurückzuhaltende Regenwassermenge vollständig und schadlos auf dem Grundstück verbleiben kann. Dies kann durch die Bereitstellung von zusätzlichem Speicherraum oder durch Einstau in der Fläche erfolgen. Im Zusammenhang mit Betrachtungen zur Überflutungssicherheit im Sinne von DIN EN 752 sind auch für Grundstücke mit AC kleiner 800 m² Überlegungen anzustellen, welche Schadenswirkung von einem Versagen der Versickerungsanlage ausgehen kann und es ist gegebenenfalls eine Notentwässerung vorzusehen. — printed p.50', verification_note='md-verified 2026-09-05 (§5.3.4.1 p.50; PASS/FAIL/NA states are EKOWAI-defined) [VC]', verified_at=now() where id='55dea09b-c87f-4ca6-984d-b7b7064badd0' and verification_status not in ('verified_against_standard','corrected');

-- ---------- A138-28 Abschließende Nachweiszusammenstellung ----------

-- final_documentation_complete
update public.fields set verification_status='verified_against_standard', verification_quote='[...] muss die Anlage und ihre Funktionsweise als Bestandteil eines Betriebshandbuchs gemäß 8.3 dokumentiert werden. Die Dokumentation beinhaltet unter anderem eine Plandarstellung der Anlagen, Wartungs- und Betriebshinweise aller Bauteile sowie Genehmigungen und Erlaubnisse. — printed p.76 | Die Versickerungsanlage ist anhand folgender Unterlagen zu dokumentieren: Angaben zur Versickerungsfähigkeit [...]; Bemessung (ggf. Überflutungsschutz, soweit integriert); Wasserrechtsantrag/Erläuterungsbericht (Genehmigungsplanung); wasserrechtliche Erlaubnis; Bestandsplan der Niederschlagswasserableitung inkl. angeschlossener Flächen und Versickerungsanlage. — printed p.79', verification_note='md-verified 2026-09-05 (§7.4 p.76, §8.3.2 p.79) [VC]', verified_at=now() where id='b6b48360-defd-4217-b13b-4ad7e360136c' and verification_status not in ('verified_against_standard','corrected');

-- permitting_documentation_ready
update public.fields set verification_status='verified_against_standard', verification_quote='Eine solche Gewässerbenutzung bedarf im Regelfall einer wasserrechtlichen Erlaubnis gemäß § 8 WHG durch die zuständige Wasserbehörde. Die Erlaubnis kann nur demjenigen erteilt werden, der in Bezug auf das anfallende Niederschlagswasser abwasserbeseitigungspflichtig ist. Dazu sind Unterlagen (Erläuterungen, technische Nachweise, Pläne etc.) bei der Behörde vorzulegen und genehmigen zu lassen. — printed p.83', verification_note='md-verified 2026-09-05 (Anh. B.2 p.82–83) [VC]', verified_at=now() where id='3db5fa56-22dd-45e9-b29b-eeaf35329b5f' and verification_status not in ('verified_against_standard','corrected');

-- ---------- Equations (status change) ----------

-- Gl.2d A_E_ba = Σ A_E,i (befestigt)
update public.equations set verification_status='verified_against_standard', verification_quote='A_E,b,a m² Befestigte, angeschlossene Fläche im Einzugsgebiet | A_E,b,a,i m² Befestigte, angeschlossene Teilfläche im Einzugsgebiet — printed p.17 | AC = Σ(A_E,b,a,i · C_i) + Σ(A_E,nb,a,i · C_i) (2) — printed p.41', verification_note='md-verified 2026-09-05 (Tab. 2 p.17, §5.3.3.5 p.41; the summation of Teilflächen to A_E,b,a is implicit in the printed symbol definitions, not a numbered equation) [VC]', verified_at=now() where id='a1380702-0000-4000-8000-000000000003' and verification_status <> 'verified_against_standard';

-- Gl.2e A_E_nba = Σ A_E,i (unbefestigt)
update public.equations set verification_status='verified_against_standard', verification_quote='A_E,nb,a,i m² Nicht befestigte, angeschlossene Teilfläche im Einzugsgebiet — printed p.17 | AC = Σ(A_E,b,a,i · C_i) + Σ(A_E,nb,a,i · C_i) (2) — printed p.41', verification_note='md-verified 2026-09-05 (Tab. 2 p.17, §5.3.3.5 p.41; summation of the nb Teilflächen is implicit in the printed symbol definitions, not a numbered equation) [VC]', verified_at=now() where id='a1380702-0000-4000-8000-000000000004' and verification_status <> 'verified_against_standard';

-- Gl.2f A_C_sealed = Σ(A_E,b,a,i · C_i)
update public.equations set verification_status='verified_against_standard', verification_quote='AC = Σ(A_E,b,a,i · C_i) + Σ(A_E,nb,a,i · C_i) (2) — printed p.41 | A_E,b,a,i m² Befestigte, angeschlossene Teilfläche im Einzugsgebiet der Versickerungsanlage — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41; first summand of the printed Gl. (2)) [VC]', verified_at=now() where id='a1380702-0000-4000-8000-000000000005' and verification_status <> 'verified_against_standard';

-- Gl.2g A_C_unsealed = Σ(A_E,nb,a,i · C_i)
update public.equations set verification_status='verified_against_standard', verification_quote='AC = Σ(A_E,b,a,i · C_i) + Σ(A_E,nb,a,i · C_i) (2) — printed p.41 | A_E,nb,a,i m² Nicht befestigte, angeschlossene Teilfläche im Einzugsgebiet der Versickerungsanlage — printed p.41', verification_note='md-verified 2026-09-05 (§5.3.3.5 p.41; second summand of the printed Gl. (2)) [VC]', verified_at=now() where id='a1380702-0000-4000-8000-000000000006' and verification_status <> 'verified_against_standard';

-- RESIDUE (not updated): Gl.2c C_m = A_C / A_E — no printed formula: the source defines "Mittlerer Abflussbeiwert: Verhältniswert aus dem Abflussvolumen und dem Niederschlagsvolumen als Mittelwert über einen definierten Zeitraum" (§3.1 p.15) and per-surface C_m in Tab. 9, but never prints C_m = AC/A_E — EKOWAI convenience quantity

-- ######################## SECTION B — quote backfill, STATUS UNCHANGED ########################
-- Fields already verified_against_standard (2026-08-01 PDF pass) that carried no verification_quote. Only
-- verification_quote is filled and a " | md-quote 2026-09-05 (…) [VC]" tag appended to verification_note; the guard
-- "verification_quote is null" makes every statement idempotent. Rollback: null the quote where the note carries the tag.

-- ---------- A138-04 Niederschlagsdaten (KOSTRA) ----------

-- a138_KOSTRA_DWD_Atlas
update public.fields set verification_quote='Als Regendaten sind örtliche Niederschlag-/ Starkregenauswertungen gemäß Arbeitsblatt DWA-A 531 oder aktuellen KOSTRA-Datensätzen in der jeweils gültigen Fassung zu verwenden. Bei KOSTRA-Datensätzen können die exakten Werte des DWD (DWD-Vorgabe) verwendet werden. Der aktuelle Stand des Arbeitsblatts DWA-A 138-1:2024 bezieht sich auf KOSTRA-DWD-2020 (2023). — printed p.41', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.5 p.41–42) [VC]' where id='d150f471-d2f3-4023-835b-be182734ed9e' and verification_quote is null;

-- a138_jaehrlichkeit_T
update public.fields set verification_quote='T_n a Statistische Wiederkehrzeit eines Bemessungsregens — printed p.18 | Wiederkehrzeit: mittlere Zeitspanne, in der ein Ereignis einen Wert erreicht oder überschreitet (Kehrwert der Häufigkeit) — printed p.15 | Tabelle 8: [...] (3) stark ≥ 5 a (≤ 0,2/a); (4) sehr stark ≥ 10 a (≤ 0,1/a) — printed p.40', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (Tab. 2 p.18, §3.1 p.15, Tab. 8 p.40) [VC]' where id='d2d46324-555f-4090-921b-a7329d81df4c' and verification_quote is null;

-- ---------- A138-05 Boden- und Hydrogeologische Daten ----------

-- k_f
update public.fields set verification_quote='Für die vollständige entwässerungstechnische Versickerung liegt der k_f-Wert in der Regel zwischen 1·10⁻³ m/s und 1·10⁻⁶ m/s. Bei k_f-Werten < 1·10⁻⁶ m/s ist eine Entwässerung ausschließlich durch Versickerung mit zeitweiliger Speicherung nicht von vornherein gewährleistet, sodass gegebenenfalls eine ergänzende Ableitungsmöglichkeit oder ein Anschluss an durchlässige Bodenschichten vorzusehen ist. — printed p.34 | k_f m/s Durchlässigkeitsbeiwert bzw. hydraulische Leitfähigkeit eines wassergesättigten Bodens — printed p.18', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.1 p.34, Tab. 2 p.18, Anh. A p.80) [VC]' where id='ce01ad45-f61b-44af-a46f-5b8d0b8d839d' and verification_quote is null;

-- kf_test_sites_count
update public.fields set verification_quote='Als Mindestanforderung für die Anzahl der Versuchsstandorte/Probenahmen sind folgende Vorgaben bei Versickerungsanlagen in Siedlungsgebieten einzuhalten: Bei kompakten/flächenhaften Versickerungsanlagen ist mindestens ein Versuchsstandort je 150 m² Sohlenfläche der Versickerungsanlage erforderlich. Übersteigt die Länge der geplanten Versickerungsanlage 10 m, ist bei heterogenen Bodenverhältnissen mindestens ein weiterer Versuchsstandort vorzusehen. Bei größeren Versickerungsanlagen sind Versuchsstandorte mindestens alle 25 m der Anlagenlänge anzuordnen. — printed p.44', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.44) [VC]' where id='a867d947-b5c8-4a32-8e4d-a4c784e45a3b' and verification_quote is null;

-- ---------- A138-06 Wasserqualität Bewertung ----------

-- bbz_organisch
update public.fields set verification_quote='Folgende Anforderungen an den Boden der bewachsenen Bodenzone werden empfohlen: [...] Massenanteil an organischer Substanz 1 % bis 4 % (bestimmt nach DIN EN 17685-1:2023); — printed p.30', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.2.3.2 p.30; "empfohlen"-class) [VC]' where id='e64a36cb-3de8-4ae2-b45d-0a2c65f86d40' and verification_quote is null;

-- bbz_ph
update public.fields set verification_quote='Folgende Anforderungen an den Boden der bewachsenen Bodenzone werden empfohlen: [...] pH-Wert 6 bis 8 (bestimmt nach DIN EN ISO 10390:2022); — printed p.30', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.2.3.2 p.30; "empfohlen"-class) [VC]' where id='f088ce77-fcf8-4071-8bf8-2c6e443a1092' and verification_quote is null;

-- r_krit
update public.fields set verification_quote='Die genannten Wirkungsgrade beziehen sich auf eine Bemessung der Behandlungsanlage mit einer kritischen Regenspende von 25 l/(s·ha) (Regelung analog Deutsches Institut für Bautechnik, DIBt 2017). Die Behandlungsanlagen sollten jedoch im Betrieb eine höhere hydraulische Leistungsfähigkeit von zum Beispiel 100 l/(s·ha) oder Regenspende mit der Dauerstufe 5 min für ein einjährliches Regenereignis r_5,1 (ohne Remobilisierung bereits zurückgehaltener Stoffe) gewährleisten. — printed p.32', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.2.3.3 p.32) [VC]' where id='a0af4093-367a-4435-a9a2-86209e9b052b' and verification_quote is null;

-- bbz_schlaemmkorn
update public.fields set verification_quote='Folgende Anforderungen an den Boden der bewachsenen Bodenzone werden empfohlen: Sieblinie (siehe Bild 1) mit Schlämmkorn-Massenanteil (Ton- und Schluffanteil) ≤ 20 %; — printed p.30', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.2.3.2 p.30; "empfohlen"-class) [VC]' where id='3edd76ea-9c07-4afd-9cc6-221a54c38821' and verification_quote is null;

-- ---------- A138-07 Flächen-Inventar und Abflussbeiwerte ----------

-- surface_inventory
update public.fields set verification_quote='AC = Σ(A_E,b,a,i · C_i) + Σ(A_E,nb,a,i · C_i) (2) — printed p.41 | C_i - Abflussbeiwert der Teilfläche, zum Beispiel gemäß Tabelle 9 — printed p.41 | Tabelle 9: Empfohlene Abflussbeiwerte für das Einfache Verfahren (Quelle: in Abstimmung mit DIN 1986-100: 2016, ergänzt): Mittlerer Abflussbeiwert C_m / Spitzenabflussbeiwert C_s — printed p.42', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.5 p.41, Tab. 9 p.42–43) [VC]' where id='6da7fa10-4b90-410c-9355-934ba1578c20' and verification_quote is null;

-- ---------- A138-08 Bemessungshäufigkeit und Parameter ----------

-- t_f
update public.fields set verification_quote='Das Einzugsgebiet A_E hat eine Fläche von maximal 200 ha oder die Fließzeit t_f bis zur Versickerungsanlage beträgt maximal 15 min. — printed p.37 | t_f min Fließzeit — printed p.18', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.2 p.37, Tab. 2 p.18) [VC]' where id='7420601a-964d-4964-a7bb-06382595e3cc' and verification_quote is null;

-- f_A
update public.fields set verification_quote='Abflusskonzentrationsprozesse können im Einfachen Verfahren mit dem Abminderungsfaktor f_A erfasst werden (Arbeitsblatt DWA-A 117), bei Versickerungsanlagen gilt in der Regel f_A ≅ 1. — printed p.48', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.7 p.48) [VC]' where id='e5a38704-40b1-48ef-b53f-154e075515a0' and verification_quote is null;

-- f_Z
update public.fields set verification_quote='Der Zuschlagsfaktor f_Z beugt einer möglichen Unterbemessung im Einfachen Verfahren vor. Je nach Risikomaß gemäß Arbeitsblatt DWA-A 117 werden Zuschlagsfaktoren zwischen 1,1 und 1,2 empfohlen. Insbesondere bei kleinen spezifischen Versickerungs-/Abflussleistungen bezogen auf AC (q_S,Ac ≤ 5 l/(s·ha)) wird ein Zuschlagsfaktor f_z = 1,2 erforderlich. — printed p.48', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.7 p.48; standard_range 1,1–1,2 (SR-2), 1,2 fixed when q_S,AC ≤ 5) [VC]' where id='f2868bb2-ab12-40e9-b30d-2095fc601d5b' and verification_quote is null;

-- A_E
update public.fields set verification_quote='Das Einzugsgebiet A_E hat eine Fläche von maximal 200 ha oder die Fließzeit t_f bis zur Versickerungsanlage beträgt maximal 15 min. — printed p.37 | A_E m² Fläche des Einzugsgebiets — printed p.17', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.2 p.37, Tab. 2 p.17; field unit ha vs Tab. 2 m²) [VC]' where id='c2f77079-b0df-482e-b0ec-cdabdffe9c67' and verification_quote is null;

-- ---------- A138-10 Bemessungswert A_C und Zufluss ----------

-- Q_zu
update public.fields set verification_quote='Den Zufluss zur Versickerungsanlage erhält man nach GI. (3) für das Einfache Verfahren bei Vernachlässigung von Verzögerungseffekten durch den Abflusskonzentrationsprozess: Q_zu = r_D(n) · (AC + A_VA) · 10⁻⁴ (3) — printed p.41 | Q_zu l/s Zufluss zur Versickerungsanlage während der Dauerstufe D — printed p.41', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.5 p.41) [VC]' where id='21f95ada-eb7d-4839-8e7e-50fd06898682' and verification_quote is null;

-- A_VA
update public.fields set verification_quote='A_VA m² überregnete Fläche einer oberirdischen Versickerungsanlage (VA) — printed p.41 | Die maximale Versickerungsfläche wird als überregnete Fläche bei oberirdischen Versickerungsanlagen angesetzt. Sie kann je nach Planungsstand abgeschätzt oder auf Grundlage von Planungsunterlagen und der geplanten Geometrie berücksichtigt werden. — printed p.41', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.5 p.41) [VC]' where id='5e28b16e-4983-4314-b46d-a7c0e7f2be57' and verification_quote is null;

-- ---------- A138-11 Versickerungsrate und Korrekturfaktoren ----------

-- k_i
update public.fields set verification_quote='Die bemessungsrelevante Infiltrationsrate für die Bemessung wird als Produkt aus dem ermittelten Durchlässigkeitsbeiwert und dem resultierenden Korrekturfaktor nach GL. (5) berechnet: k_i = k · f_K = konstant (5) — printed p.44 | k_i m/s bemessungsrelevante Infiltrationsrate — printed p.44', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.44) [VC]' where id='406ede45-763e-467c-87c6-cff9dda9fa15' and verification_quote is null;

-- f_K
update public.fields set verification_quote='Der resultierende Korrekturfaktor berechnet sich wie folgt: f_K = f_Ort · f_Methode ≤ 1 (6) — printed p.45 | f_K - resultierender Korrekturfaktor Wasserdurchlässigkeit — printed p.45', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.45) [VC]' where id='85847884-e733-4683-a2f5-f8f568bfaf8a' and verification_quote is null;

-- a138_k_f_min
update public.fields set verification_quote='Im Einfachen Verfahren wird die bemessungsrelevante Infiltrationsrate vereinfachend konstant angenommen. Auf der sicheren Seite liegend wird die minimale Infiltrationsrate als k_f-Wert verwendet. — printed p.44', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.44) [VC]' where id='d656bfee-91d8-425b-9f81-9ef135c7f17a' and verification_quote is null;

-- a138_k_f_design
update public.fields set verification_quote='k m/s Durchlässigkeitsbeiwert des Bodens, zum Beispiel k_f-Wert — printed p.44 | Auf der sicheren Seite liegend wird die minimale Infiltrationsrate als k_f-Wert verwendet. — printed p.44', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.44) [VC]' where id='f0f8fd25-9777-4346-9be1-2c6333e2f3cc' and verification_quote is null;

-- ---------- A138-12 Versickerungsleistung und mittlere Fläche ----------

-- A_S
update public.fields set verification_quote='Die Versickerungsfläche A_s ist abhängig vom Wasserstand in der Versickerungsanlage. Bei oberirdischen Versickerungsanlagen kann vereinfachend die Horizontalprojektion der Wasserspiegeloberfläche zugrunde gelegt werden (siehe Bild 6). — printed p.46 | A_s m² Erforderliche Versickerungsfläche — printed p.17', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.46–47, Tab. 2 p.17) [VC]' where id='7afc3ee1-41d1-4251-9108-3ff58db207c1' and verification_quote is null;

-- A_S_m
update public.fields set verification_quote='Im Einfachen Verfahren wird in der Regel eine mittlere Versickerungsfläche nach GI. (7) zugrunde gelegt und damit die Versickerungsleistung als konstant angenommen: A_S,m = (A_S,min + A_S,max) / 2 (7) — printed p.47', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.47) [VC]' where id='1142b343-2ddb-4fc8-952e-a3111baaf27c' and verification_quote is null;

-- A_S_max
update public.fields set verification_quote='A_S,max m² maximale Versickerungsfläche bei Volleinstau — printed p.47', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 Gl. (7) legend p.47) [VC]' where id='76603b8d-6ad6-4bb0-be02-c52c0a48c525' and verification_quote is null;

-- A_S_min
update public.fields set verification_quote='A_S,min m² minimale Versickerungsfläche (in der Regel Sohlenfläche der Anlage) — printed p.47', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 Gl. (7) legend p.47) [VC]' where id='4574812f-674f-4fcd-ae2f-baf7e00dd41d' and verification_quote is null;

-- Q_S
update public.fields set verification_quote='Die Versickerungsleistung ergibt sich nach GI. (4) als Produkt aus der Versickerungsfläche und der bemessungsrelevanten Infiltrationsrate. Q_S = k_i · A_S · 10³ (4) — printed p.44', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.44) [VC]' where id='29248f10-4186-4749-95ca-bad15866f6b7' and verification_quote is null;

-- ---------- A138-13 Speichervolumen und Bemessungsprüfung ----------

-- q_S_AC
update public.fields set verification_quote='Die spezifische Versickerungs-/Abflussleistung q_s zur Überprüfung der Anwendungsbedingung gemäß 5.3.1 wird gemäß GI. (9) berechnet: q_S,AC = (k_i · A_S,m · 1000 + Q_Dr) / AC · 10⁴ ≥ 2 l/(s·ha) (9) — printed p.48', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.7 p.48) [VC]' where id='3fd172b7-6499-4e93-aea2-6c99d008c9b4' and verification_quote is null;

-- V_VA
update public.fields set verification_quote='Zur Ermittlung des erforderlichen Speichervolumens sind die Zufluss- und Versickerungsvolumina miteinander zu verknüpfen: V_VA = (Q_zu − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³ (8) — printed p.47', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.7 p.47) [VC]' where id='816afc7a-5a47-43a2-9ffe-580e5088cbd2' and verification_quote is null;

-- a138_V_Sp_erforderlich
update public.fields set verification_quote='Außer bei der Flächenversickerung stellt das erforderliche Speichervolumen der Versickerungsanlage die Bemessungszielgröße dar. — printed p.47 | V_VA m³ erforderliches Speichervolumen der Versickerungsanlage — printed p.47', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.7 p.47) [VC]' where id='10751722-dae7-4b21-84ce-65b0d49f0bc2' and verification_quote is null;

-- a138_bemessung_bestanden
update public.fields set verification_quote='Die Einhaltung der Bedingungen für das Einfache Verfahren sind bei der Bemessung nachzuweisen. — printed p.37 | q_S,AC = (k_i · A_S,m · 1000 + Q_Dr) / AC · 10⁴ ≥ 2 l/(s·ha) (9) — printed p.48', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.2 p.37, §5.3.3.7 p.48) [VC]' where id='40201521-2697-45a6-837d-d821363a6f59' and verification_quote is null;

-- ---------- A138-15 Anlagentyp-Auswahl ----------

-- a138_auswahlkriterien
update public.fields set verification_quote='In Bild 7 sind die prinzipiellen technischen Lösungen für Versickerungsanlagen und ihre Charakterisierung hinsichtlich der Systemkomponenten, der Flächenverfügbarkeit und der Versickerungsfähigkeit des Untergrunds dargestellt. — printed p.52', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.1 p.52; Bild 7 is an image in the md) [VC]' where id='bacf6189-3883-4ec7-a860-8b8f294897df' and verification_quote is null;

-- a138_anlagentyp_gewaehlt
update public.fields set verification_quote='In Abschnitt 6 werden für ausgewählte Anlagen systemspezifische Bemessungsvorgaben dokumentiert und als Bemessungsgleichungen zur Verfügung gestellt. — printed p.52 | 6.2 Versickerungsfläche [...] 6.3 Versickerungsmulde [...] 6.4 Rigole [...] 6.5 Mulden-Rigolen-Element [...] 6.6 Mulden-Rigolen-System [...] 6.7 Versickerungsschacht [...] 6.8 Versickerungsbecken — printed p.7', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.1 p.52; duplicates facility_type_selected (STAGED S-2)) [VC]' where id='922e0c09-7372-43da-b258-baa729f95942' and verification_quote is null;

-- ---------- A138-16 Flächenversickerung Bemessung ----------

-- A_S_flaeche
update public.fields set verification_quote='Die für die Versickerung notwendige Fläche A_s erhält man durch Umformung nach GL. (12): A_S = AC / (k_i · 10⁷ / r_D(n) − 1) (12) — printed p.54 | A_s m² erforderliche Versickerungsfläche Flächenversickerung — printed p.54', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.2.2 p.54) [VC]' where id='1447f2bb-b0a6-4aa8-8a8a-099020feb188' and verification_quote is null;

-- a138_A_s_erf
update public.fields set verification_quote='A_s m² erforderliche Versickerungsfläche Flächenversickerung — printed p.54 | A_S = AC / (k_i · 10⁷ / r_D(n) − 1) (12) — printed p.54', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.2.2 p.54; duplicate of A_S_flaeche) [VC]' where id='feebf431-eea4-4c28-8e5b-d09788d9c8c2' and verification_quote is null;

-- r_D_n_used
update public.fields set verification_quote='r_D(n) l/(s•ha) Regenspende für Dauer D und Bemessungshäufigkeit n — printed p.54', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.2.2 Gl. (12) legend p.54) [VC]' where id='62c740bc-645e-4730-88a6-6e7d9d75e787' and verification_quote is null;

-- D_min_used
update public.fields set verification_quote='Bei einer Flächenversickerung (Versickerung ohne Speicherung) sollte die Dauer des Bemessungsregens in der Regel zu D = 10 min gewählt werden. Bei großen und flach geneigten Anschlussflächen kann die maßgebende Dauerstufe auf D = 15 min vergrößert werden. — printed p.54', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.2.2 p.54; Tab. 12 "Flächenversickerung 10-15") [VC]' where id='7655a180-25b3-4375-b4dc-dfe2e1e04a18' and verification_quote is null;

-- a138_A_s_dim
update public.fields set verification_quote='Bei der Berechnung der erforderlichen Versickerungsfläche ist zu berücksichtigen, dass auch die Versickerungsfläche selbst durch den Bemessungsregen belastet wird. Daraus ergibt sich gemäß GL. (11): (AC + A_S) · r_D(n) · 10⁻⁷ = A_S · k_i (11) — printed p.54', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.2.2 p.54) [VC]' where id='8e0f1d8e-974f-4672-8d4f-f195cb95effa' and verification_quote is null;

-- ---------- A138-17 Muldenversickerung Bemessung ----------

-- V_M
update public.fields set verification_quote='Unter der Annahme einer konstanten Versickerungsleistung (A_s,m und k_i sind konstant) lautet die Speichergleichung nach GI. (14): V_M = [(AC + A_VA) · 10⁻⁷ · r_D(n) − A_S,m · k_i] · D · 60 · f_Z (14) — printed p.56', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.3.2 p.56) [VC]' where id='de5f9fee-f5e0-4a06-8654-78e5984a798d' and verification_quote is null;

-- t_E
update public.fields set verification_quote='Aus vegetationstechnischer Sicht ist bei oberirdischen Versickerungsanlagen eine Entleerungszeit von ≤ 84 Stunden für n = 1/a bei geeigneter Bepflanzung in der Regel unkritisch. — printed p.56 | Tabelle 14: [...] Entleerungszeit (n = 1/a) (3) h [...] ≤ 84 — printed p.73', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.3.2 p.56, Tab. 14 p.73) [VC]' where id='3e18353f-126d-43fe-a829-7c734bec5466' and verification_quote is null;

-- h_M
update public.fields set verification_quote='Der maximale Bemessungseinstau der Mulde h_max ist in der Regel auf 30 cm zu begrenzen. — printed p.55 | h_M m maximale Einstauhöhe in der Mulde — printed p.56 | Tabelle 14: [...] Einstauhöhe cm [...] für Mulden i. d. R. ≤ 30 — printed p.73', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.3.1 p.55, Gl. (15) legend p.56, Tab. 14 p.73; no gate on the 30 cm bound (STAGED S-6)) [VC]' where id='ebb8d7d2-5f34-4ff6-9c73-8771bda14583' and verification_quote is null;

-- boeschungsneigung
update public.fields set verification_quote='Aus bautechnischer und betrieblicher Sicht ist eine Böschungsneigung von 1:3 geeignet. Sie sollte höchstens 1:1,5 betragen. Flachere Böschungen begünstigen Aspekte der Verkehrssicherung. — printed p.51 | Tabelle 14: [...] Böschungsneigung 1: m [...] i. d. R. 1 : 1,5 oder flacher — printed p.73', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.5 p.51, Tab. 14 p.73) [VC]' where id='07022cb6-a229-4449-bd8c-b5c5780abc83' and verification_quote is null;

-- A_VA_Mulde
update public.fields set verification_quote='A_va m² überregnete Fläche einer oberirdischen Versickerungsanlage/der Mulde — printed p.56 | Die überregnete Fläche der Mulde A_va kann bei der Muldenbemessung im Einfachen Verfahren mit folgenden Optionen berücksichtigt werden: Ermittlung auf Grundlage einer geplanten/vorgegebenen Geometrie; näherungsweise Berücksichtigung (z. B. A_VA = A_S,m). — printed p.56', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.3.2 p.56) [VC]' where id='84099337-0d7e-4ab8-b09c-8f68b62480b0' and verification_quote is null;

-- b_M
update public.fields set verification_quote='b_M m Breite der Mulde bei Volleinstau — printed p.17 | b_min m Minimale Breite (in der Regel Sohlenbreite) — printed p.17', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (Tab. 2 p.17; label says Sohle (b_min) while symbol b_M is printed as width at full impoundment) [VC]' where id='ad889239-bab1-4f57-b6d4-7b0c1c151228' and verification_quote is null;

-- L_M
update public.fields set verification_quote='L_M m Länge der Mulde bei Volleinstau — printed p.18 | L_min m Minimale Länge (in der Regel Sohlenlänge) — printed p.18', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (Tab. 2 p.18; label says Sohle (L_min) while symbol L_M is printed as length at full impoundment) [VC]' where id='ef11a609-da1f-48fb-b34a-6c66b9125114' and verification_quote is null;

-- n_M_Bemessung
update public.fields set verification_quote='Die Bemessungshäufigkeit für die Mulde eines Mulden-Rigolen-Elements wird in der Regel mit n = 1/a [...] gewählt. — printed p.62 | Tabelle 8: [...] (1) gering (≤ 0,33/a) (≤ 0,5/a); (2) mäßig (≤ 0,2/a) (≤ 0,33/a); (3) stark ≥ 5 a (≤ 0,2/a); (4) sehr stark ≥ 10 a (≤ 0,1/a) — printed p.40', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (Tab. 8 p.40, §6.5.2 p.62) [VC]' where id='d07e4c20-7f56-4545-9b2b-a6935ce241c8' and verification_quote is null;

-- ---------- A138-18 Rigole Bemessung ----------

-- L_VS
update public.fields set verification_quote='L_VS · q_VS ≥ r_5(n) · AC · 10⁻⁴ (25) — printed p.60 | Lvs m Gesamtlänge der Vollsickerohre zur Zuleitung in die Rigole — printed p.60', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.60) [VC]' where id='e3d222b6-d534-4d9e-9d9e-dd14b010e50e' and verification_quote is null;

-- q_VS
update public.fields set verification_quote='q_VS = 0,1 · az_SÖ · A_SÖ · 10⁻¹ (24) — printed p.59 | Liegen keine Herstellerangaben zu den Sickeröffnungen vor, können folgende Werte näherungsweise für den spezifischen Wasseraustritt q_D aus dem Versickerrohr verwendet werden: bei Kiessand als Schüttmaterial: q_vs = 0,2 l/(s·m); bei Kies (z. B. 16/32) als Schüttmaterial: q_vs = 5 l/(s·m). — printed p.60', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.59–60) [VC]' where id='f99c1b26-9844-4d39-9dc5-b69bbbe775d5' and verification_quote is null;

-- s_F
update public.fields set verification_quote='Bei Rigolen aus Schüttmaterial wird der Speicherkoeffizient s_R anteilig aus dem Porenanteil des Füll-/ Schüttmaterials s_F und dem Speichervolumen der eingebetteten Versickerrohre mit Kreisquerschnitt nach GL. (21) bzw. GL. (22) berechnet — printed p.59 | S_F - Speicherkoeffizient des Füllmaterials/Fertigteils der Rigole — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.59; the description "gravel ≈ 0.35 typical" is NOT printed in the source (STAGED S-8)) [VC]' where id='d53b6ec2-b548-4788-a98e-42ac048a2b67' and verification_quote is null;

-- s_R
update public.fields set verification_quote='Die Speicherkapazität der Rigolen wird durch den Speicherkoeffizienten s_R ausgedrückt, der den Anteil des verfügbaren Speichervolumens im Rigolenbauwerk angibt. — printed p.59 | Der Speicherkoeffizient s_R ist bei Rigolen aus Fertigteilen den Herstellerangaben zu entnehmen. — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.59, Gl. (21)/(22)) [VC]' where id='fe2fd889-84e7-4128-80bd-1e54ed604b8d' and verification_quote is null;

-- V_R
update public.fields set verification_quote='V_R = [AC · 10⁻⁷ · r_D(n) − [(b_R + h_R) · L_R + b_R · h_R] · k_i − Q_Dr · 10⁻³] · D · 60 · f_Z (19) — printed p.58 | V_R = b_R · h_R · L_R · s_R (20) — printed p.59 | V_R m³ erforderliches Speichervolumen der Rigole — printed p.58', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.58–59) [VC]' where id='8474e3a8-2f06-4215-b8ba-30a54a3b878f' and verification_quote is null;

-- h_R
update public.fields set verification_quote='h_R m Höhe der Rigole — printed p.58 | Für die Bemessung der Rigolen werden die Querschnittsabmessungen b_R und h_R zweckmäßig gewählt. — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.58–59) [VC]' where id='0b4e3ceb-c2f4-4b34-8913-4364be58d90f' and verification_quote is null;

-- L_R
update public.fields set verification_quote='Zielgröße der Berechnung ist dann die erforderliche Länge L_R (in m) der Rigole. [...] L_R = (AC · 10⁻⁷ · r_D(n) − b_R · h_R · k_i − Q_Dr · 10⁻³) / (b_R · h_R · s_R / (D · 60 · f_Z) + (b_R + h_R) · k_i) (23) — printed p.59 | Die erforderliche Länge L_R erhält man durch die iterative Anwendung der GI. (23) für unterschiedliche Dauerstufen D und jeweils zugehöriger Regenspende r_D(n). — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.59) [VC]' where id='2be03616-d0fa-4b94-9e89-1e3d1fd00635' and verification_quote is null;

-- d_i
update public.fields set verification_quote='d_i m Innendurchmesser des Versickerrohrs — printed p.59 | d_i mm Innendurchmesser, zum Beispiel eines Versickerrohrs in einer Rigole oder eines Sickerschachts — printed p.18', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 Gl. (21) legend p.59 (m) vs Tab. 2 p.18 (mm) — source-internal unit inconsistency; encoded m per Gl. (21)) [VC]' where id='fdd0e2fe-c67c-4cce-ba6b-d0a6206fa743' and verification_quote is null;

-- d_a
update public.fields set verification_quote='d_a m Außendurchmesser des Versickerrohrs — printed p.59 | d_a mm Außendurchmesser, zum Beispiel eines Versickerrohrs in einer Rigole oder eines Sickerschachts — printed p.18', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 Gl. (21) legend p.59 (m) vs Tab. 2 p.18 (mm) — source-internal unit inconsistency; encoded m per Gl. (21)) [VC]' where id='37eb0b5f-d412-442c-9b8e-d8b7b4a3f91d' and verification_quote is null;

-- A_SOE
update public.fields set verification_quote='Die Größe und Anzahl der Sickeröffnungen je laufendem Meter in cm²/m sind Herstellerangaben zu entnehmen. — printed p.59 | A_sö cm² Größe der Sickeröffnungen — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.59) [VC]' where id='84eb04b2-2c6b-4b9b-bfd6-7269268166df' and verification_quote is null;

-- b_R
update public.fields set verification_quote='b_R m Breite der Rigole — printed p.58 | Für die Bemessung der Rigolen werden die Querschnittsabmessungen b_R und h_R zweckmäßig gewählt. — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.58–59) [VC]' where id='5feb45e3-d8bc-45a2-b376-35ca9011cbda' and verification_quote is null;

-- az_SOE
update public.fields set verification_quote='aZ_sö 1/m Anzahl der Sickeröffnungen je Meter Versickerrohr — printed p.59 | Die Größe und Anzahl der Sickeröffnungen je laufendem Meter in cm²/m sind Herstellerangaben zu entnehmen. — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.59) [VC]' where id='b09837ab-8a38-4f89-b2b9-e20ead82d40a' and verification_quote is null;

-- az
update public.fields set verification_quote='az - Anzahl gleichartiger Versickerrohre im Querschnitt der Rigole — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 Gl. (21) legend p.59) [VC]' where id='ac597f54-f799-4bcf-83e9-46a8f88d2dd7' and verification_quote is null;

-- r_D_n_used_R
update public.fields set verification_quote='r_D(n) l/(s•ha) Regenspende für die Dauer D und Bemessungshäufigkeit n — printed p.58', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 Gl. (19) legend p.58) [VC]' where id='381de031-ca4d-473b-91c4-00135c82feec' and verification_quote is null;

-- r_5_n
update public.fields set verification_quote='Der Nachweis der ausreichenden hydraulischen Leistung der Zuleitung durch ein im Schüttmaterial gebettetes, profiliertes Vollsickerohr wird mit dem maximalen Zufluss zur Rigole mit der Regenspende r_5(n) für die Dauerstufe D = 5 min und der gewählten Bemessungshäufigkeit n geführt. — printed p.59 | r_5(n) l/(s•ha) Regenspende für die Dauer D = 5 min und Bemessungshäufigkeit n — printed p.60', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.59–60) [VC]' where id='ca8831fe-6685-40aa-b4f4-212fe076f47c' and verification_quote is null;

-- ---------- A138-19 Mulden-Rigolen-Element Bemessung ----------

-- V_MR
update public.fields set verification_quote='Ist ein Überlauf vorhanden, wird das gesamte erforderliche Speichervolumen eines Mulden-Rigolen-Elements nach Gl. (26) als die Summe aus Mulden- und Rigolenvolumen berechnet: V_MR = V_M + V_R (26) — printed p.62 | V_MR = [(AC + A_VA) · 10⁻⁷ · r_D(n) − ((b_R + h_R) · L_R + b_R · h_R) · k_i] · D · 60 · f_Z (28) — printed p.62', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.62) [VC]' where id='e2adb80d-4b5a-4455-82a7-d49aa942350e' and verification_quote is null;

-- n_R
update public.fields set verification_quote='Die Bemessungshäufigkeit für die Mulde eines Mulden-Rigolen-Elements wird in der Regel mit n = 1/a und damit größer als die Bemessungshäufigkeit der Rigole, die nach Tabelle 6 und Tabelle 8 zu wählen ist, gewählt. — printed p.62 | r_D(n_R) l/(s•ha) Regenspende für die Bemessungshäufigkeit der Rigole n_R — printed p.63', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.62–63) [VC]' where id='057b3d7d-9085-42d2-a66c-def305b31878' and verification_quote is null;

-- V_M_MRE
update public.fields set verification_quote='V_M m³ erforderliches Speichervolumen der Mulde — printed p.62 | Die Bemessung erfolgt in zwei Schritten. Im ersten Schritt wird das erforderliche Speichervolumen gemäß GL. (15) bemessen. — printed p.62', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.62) [VC]' where id='bdb18ec2-6f72-486e-86f3-38901c8b9208' and verification_quote is null;

-- V_R_MRE
update public.fields set verification_quote='Das erforderliche Volumen für die Rigole ergibt sich aus einer einfachen Volumenbilanz durch Umstellung der GI. (26) nach GI. (27): V_R = V_MR − V_M (27) — printed p.62', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.62) [VC]' where id='03cac497-3d96-48fc-82ac-ba46a9b26beb' and verification_quote is null;

-- A_VA_MRE
update public.fields set verification_quote='A_VA m² überregnete Fläche einer oberirdischen Versickerungsanlage — printed p.63 | Der Regen auf die Muldenoberfläche kann analog zur Muldenbemessung erfasst werden (siehe 6.3.2). — printed p.62', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.62–63) [VC]' where id='8336d686-64ff-49c7-9272-73fea08e49a0' and verification_quote is null;

-- ---------- A138-20 Mulden-Rigolen-System Bemessung ----------

-- Q_Dr_max
update public.fields set verification_quote='Die maximale Leistung der Drossel muss mit der Wasserbehörde oder dem Kanalnetzbetreiber abgestimmt werden. — printed p.66 | Q_Dr,max l/s maximaler Drosselabfluss der gewählten Drosseleinrichtung — printed p.66', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.6.2 p.66) [VC]' where id='d2ee41b8-e926-42cd-b10b-f0137f3c642c' and verification_quote is null;

-- Q_Dr
update public.fields set verification_quote='Beim Einfachen Verfahren kann mit hinreichender Genauigkeit ein konstanter, mittlerer Drosselabfluss der Bemessung zugrunde gelegt werden: Q_Dr = (Q_Dr,min + Q_Dr,max) / 2 (33) — printed p.66', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.6.2 p.66) [VC]' where id='5c662f96-908a-4a84-a4db-bf021d25c9a7' and verification_quote is null;

-- V_MUE
update public.fields set verification_quote='V_MÜ = [(AC + A_VA) · r_D(n_R) · 10⁻⁷ − A_S,m · k_i] · D · 60 · f_Z − V_M (30) — printed p.63 | V_MÜ m³ Überlaufvolumen der Mulde — printed p.63', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.63) [VC]' where id='e540bf7a-647b-440a-a65c-8712d7f89575' and verification_quote is null;

-- r_MUE
update public.fields set verification_quote='Ergibt sich für eine Dauerstufe D ein Wert größer als Null, liegt ein Überlauf vor. Die Regenspende r_D(nR) mit der kleinsten Dauerstufe, für die ein Überlauf vorliegt, ist die maßgebliche Regenspende r_Mü. — printed p.63', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.63) [VC]' where id='e25438c0-9ee4-4aa5-8cb4-f6d0141447b8' and verification_quote is null;

-- Q_MUE
update public.fields set verification_quote='Im zweiten Schritt wird mit GL. (31) für die maßgebliche Regenspende r_Mü der Bemessungsabfluss Q_Mü berechnet: Q_MÜ = AC · 10⁻⁴ · r_MÜ − A_VA · k_i · 1.000 (31) — printed p.64', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.64) [VC]' where id='c1e99009-4921-48be-b551-4470c0216fbf' and verification_quote is null;

-- Q_Dr_min
update public.fields set verification_quote='Q_Dr,min l/s minimaler Drosselabfluss der gewählten Drosseleinrichtung — printed p.66 | Je nach Typ der Drosseleinrichtung kann ein stark veränderlicher Drosselabfluss wirksam werden. — printed p.66', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.6.2 p.66) [VC]' where id='4e5177fd-adb2-4e6e-9f3b-199fef3a31b8' and verification_quote is null;

-- r_D_nR
update public.fields set verification_quote='r_D(n_R) l/(s•ha) Regenspende für die Bemessungshäufigkeit der Rigole n_R — printed p.63', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 Gl. (30) legend p.63) [VC]' where id='31783b92-de55-467e-af3c-5aebb9b3e5ed' and verification_quote is null;

-- ---------- A138-21 Schacht-/Rohrversickerung Bemessung ----------

-- shaft_type
update public.fields set verification_quote='Grundsätzlich sind zwei Bauarten zu unterscheiden. Beim Schacht Typ A (Bild 14) haben die Schachtringe seitliche Durchtrittsöffnungen oder sind wasserdurchlässig. Eine zusätzliche Reinigungswirkung im Schacht Typ A ist nicht gegeben. — printed p.67 | Beim Schacht Typ B (Bild 15) liegen die seitlichen Durchtrittsöffnungen ausschließlich unterhalb einer Filterschicht des Sohlenbereichs. — printed p.68', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.1 p.67–68) [VC]' where id='92c0c5ef-44bd-4f04-8987-e52279bbb93a' and verification_quote is null;

-- k_f_FS
update public.fields set verification_quote='Ein Durchlässigkeitsbeiwert von k_f ≤ 1·10⁻³ m/s muss für die Filterschicht gewährleistet sein. — printed p.68 | Zum Schutz des Grundwassers darf die erforderliche Durchlässigkeit der Filterschicht erf. K_f,FS einen Wert von 1·10⁻³ m/s nicht überschreiten. — printed p.69', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.1 p.68, §6.7.2 p.69; hard limit without a gate (STAGED S-6)) [VC]' where id='9d2a9547-d7de-4256-ac92-342bb62aaba2' and verification_quote is null;

-- A_S_FS
update public.fields set verification_quote='Für A_S,Schacht ist die Gl. (34) einzusetzen. A_S,FS ist die Querschnittsfläche mit dem Durchmesser d_i. — printed p.69', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 p.69) [VC]' where id='3ed67f5c-ad88-4aac-aa29-5c9c7aeb6253' and verification_quote is null;

-- A_S_Schacht
update public.fields set verification_quote='Die Versickerungsfläche eines Versickerungsschachts mit rundem Querschnitt ergibt sich nach GI. (34) zu: A_S = π · d_a² / 4 + π · d_a · h_S / 2 (34) — printed p.68', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 p.68) [VC]' where id='f3bd69b6-cd83-462c-87bb-65ca2f217d6f' and verification_quote is null;

-- V_S
update public.fields set verification_quote='V_S = (AC · 10⁻⁷ · r_D(n) − A_S · k_i) · D · 60 · f_Z (35) — printed p.68 | V_S = π · d_i² / 4 · h_S (36) — printed p.69', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 p.68–69) [VC]' where id='4c86cccc-ea56-421f-854e-bc003d0f6131' and verification_quote is null;

-- h_S
update public.fields set verification_quote='h_S = (AC · 10⁻⁷ · r_D(n) − π · d_a² / 4 · k_i) / (π · d_i² / (4 · D · 60 · f_Z) + d_a · π · k_i / 2) (37) — printed p.69 | h_s m Bemessungseinstau Versickerungsschacht — printed p.18', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 p.69, Tab. 2 p.18; the source text says "iterative Anwendung der Gl. (38)" — a numbering slip for (37)) [VC]' where id='b2ac8fcc-bd57-4689-acce-855a624abd39' and verification_quote is null;

-- schacht_d_i_check
update public.fields set verification_quote='Er wird in der Regel aus Fertigteilen (z. B. Beton) aufgebaut. Ein Mindestdurchmesser von DN 1000 darf nicht unterschritten werden. — printed p.67', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.1 p.67; hard limit without a gate (STAGED S-6)) [VC]' where id='7c0beab2-04e8-4d66-93c4-25d0d1797a45' and verification_quote is null;

-- d_S_innen
update public.fields set verification_quote='d_i m Innendurchmesser des Schachts — printed p.69 | Ein Mindestdurchmesser von DN 1000 darf nicht unterschritten werden. — printed p.67', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 Gl. (36) legend p.69, §6.7.1 p.67) [VC]' where id='80679ca1-c9ac-4277-a789-c8cd36d8f5f1' and verification_quote is null;

-- d_S_aussen
update public.fields set verification_quote='d_a m Außendurchmesser des Schachts — printed p.68', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 Gl. (34) legend p.68) [VC]' where id='5e1e30e3-fb24-4416-97ad-e4adb5219cef' and verification_quote is null;

-- r_D_n_S
update public.fields set verification_quote='r_D(n) l/(s•ha) Regenspende für die Dauer D und Bemessungshäufigkeit n — printed p.69', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 Gl. (35) legend p.69) [VC]' where id='289556cd-c982-446c-aa4c-31e9d3a52be1' and verification_quote is null;

-- k_i_FS
update public.fields set verification_quote='Ist beim Schacht Typ B die Durchlässigkeit des anstehenden Bodens mit k_f > 1·10⁻³ m/s größer als die Durchlässigkeit der Filterschicht, wird die Filterschicht für die Bemessung maßgeblich. Die versickerungswirksame Fläche entspricht A_S,FS mit dem Durchmesser d_i. Die Bemessung ist dann mit GL. (40) durchzuführen — printed p.69 | k_f,FS m/s Durchlässigkeitsbeiwert der Filterschicht — printed p.69', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 p.69) [VC]' where id='3162b2bf-6d06-4de9-8b6d-2257c8fb905f' and verification_quote is null;

-- ---------- A138-22 Beckenversickerung Bemessung ----------

-- residential_depth_check
update public.fields set verification_quote='Bei oberirdischen Versickerungsanlagen im Wohnumfeld muss die Zugänglichkeit auf Bereiche beschränkt werden, bei denen (auch bei normalen Niederschlägen) keine großen Strömungen auftreten und die Wassertiefe in Anlehnung an DIN 18034-1:2020 maximal 40 cm inklusive Freibord beträgt. — printed p.51', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.5 p.51) [VC]' where id='a4bbabb6-7efc-42e1-9b05-00acd26e0086' and verification_quote is null;

-- basin_ki_min_check
update public.fields set verification_quote='In der Regel sind Infiltrationsraten von k_i ≥ 1·10⁻⁵ m/s vorauszusetzen. — printed p.70 | Tabelle 14: [...] k_f-Wert maßgebliche Bodenschicht m/s [...] Versickerungsbecken ≥ 1·10⁻⁵ — printed p.73', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.8.1 p.70, Tab. 14 p.73) [VC]' where id='3930c0d4-4fa5-449f-9cc8-a466d942053b' and verification_quote is null;

-- h_B
update public.fields set verification_quote='Versickerungsbecken haben in der Regel Einstauhöhen von h ≥ 0,5 m. — printed p.70 | Tabelle 14: [...] Einstauhöhe cm [...] Versickerungsbecken i. d. R. ≥ 50 — printed p.73', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.8.1 p.70, Tab. 14 p.73) [VC]' where id='e4c81dc9-528b-4b46-a11d-06e1d684ff93' and verification_quote is null;

-- A_VA_Becken
update public.fields set verification_quote='A_va m² überregnete Fläche einer oberirdischen Versickerungsanlage/ des Versickerungsbeckens — printed p.71', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.8.2 Gl. (41) legend p.71) [VC]' where id='ea2e86a7-8171-416c-85e8-78cfb91e3505' and verification_quote is null;

-- r_D_n_B
update public.fields set verification_quote='r_D(n) l/(s•ha) Regenspende für die Dauer D und Bemessungshäufigkeit n — printed p.71 | Das erforderliche Speichervolumen des Versickerungsbeckens erhält man durch die iterative Anwendung der GL. (41) für unterschiedliche Dauerstufen D und jeweils zugehöriger Regenspende r_D(n). — printed p.71', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.8.2 p.71) [VC]' where id='6b5b9361-560c-45bb-9c6f-7dc6eac59045' and verification_quote is null;

-- ---------- A138-24 Kombinierte Ergebnis-Zusammenstellung ----------

-- V_VA_final
update public.fields set verification_quote='Außer bei der Flächenversickerung stellt das erforderliche Speichervolumen der Versickerungsanlage die Bemessungszielgröße dar. — printed p.47 | V_VA = (Q_zu − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³ (8) — printed p.47', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.7 p.47) [VC]' where id='fe26c740-f7be-461c-ab6e-e6e2b68ebccf' and verification_quote is null;

-- Q_S_final
update public.fields set verification_quote='Q_S = k_i · A_S · 10³ (4) — printed p.44 | Qs l/s Versickerungsleistung — printed p.44', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.44) [VC]' where id='f0080d80-ce33-4e56-a0e7-b5ff010cc87e' and verification_quote is null;

-- q_S_AC_final
update public.fields set verification_quote='q_S,AC = (k_i · A_S,m · 1000 + Q_Dr) / AC · 10⁴ ≥ 2 l/(s·ha) (9) — printed p.48', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.7 p.48) [VC]' where id='b750f710-476f-4121-8a4f-3282b2b555ff' and verification_quote is null;

-- flood_check_required_final
update public.fields set verification_quote='Für Versickerungsanlagen zur Grundstücksentwässerung innerörtlicher Grundstücke muss ein Überflutungsnachweis nach DIN 1986-100 erbracht werden, wenn der Rechenwert AC als Summenwert aller abflusswirksamen Flächen des Grundstücks größer als 800 m² ist. — printed p.49', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.4.1 p.49) [VC]' where id='faed2def-412a-4ad0-8fb3-56cd56759275' and verification_quote is null;

-- ---------- A138-25 Bemessungs-Eignungsprüfung ----------

-- qsac_geq_2_check
update public.fields set verification_quote='q_S,AC = (k_i · A_S,m · 1000 + Q_Dr) / AC · 10⁴ ≥ 2 l/(s·ha) (9) — printed p.48 | Die spezifische Versickerungs-/Abflussleistung bezogen auf den Bemessungswert der Zuflüsse AC ist q_s ≥ 2 l/(s·ha). — printed p.37', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.7 p.48, §5.3.3.2 p.37) [VC]' where id='f39aa1bc-3ae6-4da5-b65e-6ffd2c623cad' and verification_quote is null;

-- mhgw_clearance_ge_1m_check
update public.fields set verification_quote='Bei einem Abstand der Sohle der Versickerungsanlage zum maßgeblichen mittleren höchsten Grundwasserstand (MHGW) von ≥ 1 m (siehe 5.2.1) kann in der Regel auf diese Abstimmung verzichtet werden; in Trinkwasser- oder Heilquellenschutzgebieten gelten weitergehende Anforderungen. — printed p.22 | Abstand Sohle Versickerungsanlage zum MHGW ≥ 1 m — printed p.24', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.1.1 p.22, Tab. 3 p.24, §5.2.1 p.25) [VC]' where id='ed21fc29-133f-4b8f-9bd9-21d32d5937b9' and verification_quote is null;

-- f_Z_appropriate_check
update public.fields set verification_quote='Je nach Risikomaß gemäß Arbeitsblatt DWA-A 117 werden Zuschlagsfaktoren zwischen 1,1 und 1,2 empfohlen. Insbesondere bei kleinen spezifischen Versickerungs-/Abflussleistungen bezogen auf AC (q_S,Ac ≤ 5 l/(s·ha)) wird ein Zuschlagsfaktor f_z = 1,2 erforderlich. — printed p.48', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.7 p.48; gate REQ-15) [VC]' where id='95d66c21-339b-4f76-86a8-e89f3188d8f6' and verification_quote is null;

-- ---------- A138-26 Überflutungsnachweis ----------

-- T_n_Ue
update public.fields set verification_quote='Die zurückzuhaltende Regenwassermenge V_Rück wird für alle Schutzkategorien nach Tabelle 8 nach DIN 1986-100 in der Regel für eine Überflutungshäufigkeit von n = 0,033/a (T_n = 30 a) für Versickerungsanlagen gemäß GL. (10) berechnet — printed p.49 | Bestehen die befestigten Flächen des Grundstücks zum Beispiel um mehr als 70 % aus Dachflächen und nicht überflutbaren Flächen, wie Innenhöfe, ist die Überflutungsprüfung nach DIN 1986-100 für eine Wiederkehrzeit T_n = 100 Jahren nach GI. (10) für Regenspenden r_D(100) iterativ zu führen. — printed p.50', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.4.1 p.49–50) [VC]' where id='9b2ee4d8-352e-4035-a122-2ba4b023951a' and verification_quote is null;

-- V_Rueck
update public.fields set verification_quote='V_Rück = ((r_D(30) · (Σ(A_E,b,a · C_S) + A_VA)) / 10.000 − (Q_S + Q_Dr)) · (D · 60) / 1000 − V_VA ≥ 0 (10) — printed p.49 | ergibt die Berechnung nach GL. (10) ein negatives Ergebnis für V_Rück, so wird V_Rück = 0 gesetzt. — printed p.50', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.4.1 p.49–50) [VC]' where id='d7ed4e73-7649-41fe-93e7-eab05077351a' and verification_quote is null;

-- r_D_30
update public.fields set verification_quote='r_D(30) l/(s•ha) Regenspende für die Dauerstufe D und Wiederkehrzeit T_n = 30 Jahren — printed p.49 | Bei Verwendung von KOSTRA-Regenspenden sind die exakten Werte des DWD (DWD-Vorgabe) der Regenstatistik zu verwenden. — printed p.50', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.4.1 p.49–50) [VC]' where id='8367a115-b0e7-45ce-a440-64b6b5140a93' and verification_quote is null;

-- A_E_b_a_flood
update public.fields set verification_quote='A_E,b,a m² befestigte, angeschlossene Fläche im Einzugsgebiet — printed p.49 | Gegebenenfalls können abflussrelevante nicht befestigte Flächen mit in die Überflutungsbetrachtung einbezogen werden. — printed p.50', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.4.1 p.49–50) [VC]' where id='1a6cfa35-ff78-40df-9136-3582f7c8813e' and verification_quote is null;

-- C_S
update public.fields set verification_quote='C_s - Spitzenabflussbeiwert — printed p.49 | Tabelle 9: [...] Spitzenabflussbeiwert C_s — printed p.42', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.4.1 Gl. (10) legend p.49, Tab. 9 p.42–43) [VC]' where id='0e01df74-0044-4014-8ecf-42284e0c692a' and verification_quote is null;

-- D_flood_min
update public.fields set verification_quote='Die Ermittlung der maßgeblichen Dauerstufe des Bemessungsregens D erfolgt iterativ für unterschiedliche Dauerstufen D und jeweils zugehöriger Regenspende r_D(30) — printed p.50 | D min Dauer des Bemessungsregens — printed p.49', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.4.1 p.49–50) [VC]' where id='f0c09915-02c8-4b1b-9b36-362aae1c56c4' and verification_quote is null;

-- Q_S_flood
update public.fields set verification_quote='Q_S l/s Versickerungsleistung (nach GL. (4)) — printed p.49', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.4.1 Gl. (10) legend p.49) [VC]' where id='1404ac69-fc94-4a09-8c38-4ea007264881' and verification_quote is null;

-- Q_Dr_flood
update public.fields set verification_quote='Q_Dr l/s mittlerer Drosselabfluss (z. B. bei Mulden-Rigolen-Systemen) — printed p.49', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.4.1 Gl. (10) legend p.49) [VC]' where id='2d623363-b595-435c-910d-99e28d99f245' and verification_quote is null;

-- ---------- Equations (quote backfill, status unchanged) ----------

-- Gl.2
update public.equations set verification_quote='AC = Σ(A_E,b,a,i · C_i) + Σ(A_E,nb,a,i · C_i) (2) — printed p.41', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.5 p.41) [VC]' where id='b3f8c2e0-7a4d-4f1c-9e08-d5a6b7c8d9e0' and verification_quote is null;

-- Gl.3
update public.equations set verification_quote='Q_zu = r_D(n) · (AC + A_VA) · 10⁻⁴ (3) — printed p.41', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.5 p.41) [VC]' where id='b39dda00-9a90-46cc-a045-543047ec6498' and verification_quote is null;

-- Gl.5
update public.equations set verification_quote='k_i = k · f_K = konstant (5) — printed p.44', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.44) [VC]' where id='49091b66-9c4b-44ee-aa42-8f6352461e60' and verification_quote is null;

-- Gl.6
update public.equations set verification_quote='f_K = f_Ort · f_Methode ≤ 1 (6) — printed p.45', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.45; encoded as min(·,1)) [VC]' where id='0c270341-93fb-4391-aa09-3744097635d1' and verification_quote is null;

-- Gl.4
update public.equations set verification_quote='Q_S = k_i · A_S · 10³ (4) — printed p.44', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.44) [VC]' where id='bd080331-d673-4a11-b12a-29e00bdbc939' and verification_quote is null;

-- Gl.7
update public.equations set verification_quote='A_S,m = (A_S,min + A_S,max) / 2 (7) — printed p.47', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.6 p.47) [VC]' where id='55151cb1-4a5a-48d1-b5c0-2312ef7b78ac' and verification_quote is null;

-- Gl.1
update public.equations set verification_quote='Empfohlen wird daher eine Länge der Zeitreihe, die dem dreifachen Wert der statistischen Wiederkehrzeit T_n entspricht gemäß Gl. (1): M ≥ 3 · T_n (1) — printed p.39', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.3 p.39) [VC]' where id='3da9a0bc-5253-4614-a0e4-fcf22f55c3b5' and verification_quote is null;

-- Gl.8
update public.equations set verification_quote='V_VA = (Q_zu − Q_S − Q_Dr) · D · 60 · f_Z · f_A · 10⁻³ (8) — printed p.47', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.7 p.47) [VC]' where id='69f31e6e-a755-4246-af10-ae46668b5c86' and verification_quote is null;

-- Gl.9
update public.equations set verification_quote='q_S,AC = (k_i · A_S,m · 1000 + Q_Dr) / AC · 10⁴ ≥ 2 l/(s·ha) (9) — printed p.48', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.3.7 p.48) [VC]' where id='e2ec4338-1356-480f-a7ab-da57fdc1fc22' and verification_quote is null;

-- Gl.11
update public.equations set verification_quote='(AC + A_S) · r_D(n) · 10⁻⁷ = A_S · k_i (11) — printed p.54', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.2.2 p.54) [VC]' where id='3b3b2cf6-da4f-43b2-a302-b7c38768d3ff' and verification_quote is null;

-- Gl.12
update public.equations set verification_quote='A_S = AC / (k_i · 10⁷ / r_D(n) − 1) (12) — printed p.54', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.2.2 p.54) [VC]' where id='a1cf1d5c-d001-45aa-ae9d-a7406d75d120' and verification_quote is null;

-- Gl.13
update public.equations set verification_quote='k_i > r_D(n) · 10⁻⁷ (13) — printed p.54', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.2.2 p.54) [VC]' where id='96d93a62-c3d0-4745-9f95-7c8ac77bc598' and verification_quote is null;

-- Gl.14
update public.equations set verification_quote='V_M = [(AC + A_VA) · 10⁻⁷ · r_D(n) − A_S,m · k_i] · D · 60 · f_Z (14) — printed p.56', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.3.2 p.56) [VC]' where id='bfe6e59a-015f-4c95-b717-8599f80cb68a' and verification_quote is null;

-- Gl.15
update public.equations set verification_quote='V_M = A_S,m · h_M (15) — printed p.56', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.3.2 p.56) [VC]' where id='44fd56a8-b473-441a-be21-297d9f501226' and verification_quote is null;

-- Gl.16
update public.equations set verification_quote='A_S,m = (AC · 10⁻⁷ · r_D(n)) / (h_M / (D · 60 · f_Z) + k_i) (16) — printed p.56', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.3.2 p.56) [VC]' where id='14999c2a-cdeb-42c1-98fd-fcdec65123da' and verification_quote is null;

-- Gl.17
update public.equations set verification_quote='A_S,m = (b_R + 2 · h_R/2) · L_R + (b_R · h_R/2) · 2 = (b_R + h_R) · L_R + b_R · h_R (17) — printed p.58', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.58) [VC]' where id='8afdb49a-7bb1-4f07-a64e-43009b8b6be1' and verification_quote is null;

-- Gl.18
update public.equations set verification_quote='Q_S = [(b_R + h_R) · L_R + b_R · h_R] · k_i (18) — printed p.58', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.58 (Q_S in m³/s here)) [VC]' where id='ef4242d4-d9a0-43db-b65b-685bf9c92c9c' and verification_quote is null;

-- Gl.19
update public.equations set verification_quote='V_R = [AC · 10⁻⁷ · r_D(n) − [(b_R + h_R) · L_R + b_R · h_R] · k_i − Q_Dr · 10⁻³] · D · 60 · f_Z (19) — printed p.58', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.58) [VC]' where id='58c0c298-ca72-4bb6-ab05-0b298114523e' and verification_quote is null;

-- Gl.20
update public.equations set verification_quote='V_R = b_R · h_R · L_R · s_R (20) — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.59) [VC]' where id='b8e74a4b-64cc-4b81-b306-b2e01e759f5e' and verification_quote is null;

-- Gl.21
update public.equations set verification_quote='s_R = s_F / (b_R · h_R) · [b_R · h_R + az · π/4 · (1/s_F · d_i² − d_a²)] (21) — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.59) [VC]' where id='069c2b02-8883-48a4-82ce-b21c9ef1fff8' and verification_quote is null;

-- Gl.22
update public.equations set verification_quote='s_R = s_F / (b_R · h_R) · [b_R · h_R + az · π · d² / 4 · (1/s_F − 1)] (22) — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.59; d = d_i ≈ d_a) [VC]' where id='20c31318-7401-4f89-a27b-bc3cf8723548' and verification_quote is null;

-- Gl.23
update public.equations set verification_quote='L_R = (AC · 10⁻⁷ · r_D(n) − b_R · h_R · k_i − Q_Dr · 10⁻³) / (b_R · h_R · s_R / (D · 60 · f_Z) + (b_R + h_R) · k_i) (23) — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.59) [VC]' where id='927aa5ab-3aa9-486e-a05d-f91847e8d31e' and verification_quote is null;

-- Gl.24
update public.equations set verification_quote='q_VS = 0,1 · az_SÖ · A_SÖ · 10⁻¹ (24) — printed p.59', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.59) [VC]' where id='f17ba5d8-601e-4de1-8e59-d6b0a69e21a6' and verification_quote is null;

-- Gl.25
update public.equations set verification_quote='L_VS · q_VS ≥ r_5(n) · AC · 10⁻⁴ (25) — printed p.60', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.4.2 p.60) [VC]' where id='86cdef5c-4199-4de6-ad0d-e2248b0834c9' and verification_quote is null;

-- Gl.26
update public.equations set verification_quote='V_MR = V_M + V_R (26) — printed p.62', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.62) [VC]' where id='32b85bf3-7b59-4abe-ac98-62f4fb15007b' and verification_quote is null;

-- Gl.27
update public.equations set verification_quote='V_R = V_MR − V_M (27) — printed p.62', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.62) [VC]' where id='150baf9a-0e7c-4a6c-9ce1-890ca7f491df' and verification_quote is null;

-- Gl.28
update public.equations set verification_quote='V_MR = [(AC + A_VA) · 10⁻⁷ · r_D(n) − ((b_R + h_R) · L_R + b_R · h_R) · k_i] · D · 60 · f_Z (28) — printed p.62', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.62) [VC]' where id='570a63ed-08c4-4324-9ee7-0408816bba3f' and verification_quote is null;

-- Gl.29
update public.equations set verification_quote='L_R = ((AC + A_VA) · 10⁻⁷ · r_D(n) − b_R · h_R · k_i − V_M / (D · 60 · f_Z)) / (b_R · h_R · s_R / (D · 60 · f_Z) + (b_R + h_R) · k_i) (29) — printed p.63', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.63) [VC]' where id='bc11db1c-c935-40c7-87fb-6b35c6f1b1b0' and verification_quote is null;

-- Gl.30
update public.equations set verification_quote='V_MÜ = [(AC + A_VA) · r_D(n_R) · 10⁻⁷ − A_S,m · k_i] · D · 60 · f_Z − V_M (30) — printed p.63', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.63) [VC]' where id='947db98f-6ad1-482c-ae15-e9d0963d1abe' and verification_quote is null;

-- Gl.31
update public.equations set verification_quote='Q_MÜ = AC · 10⁻⁴ · r_MÜ − A_VA · k_i · 1.000 (31) — printed p.64', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.5.2 p.64) [VC]' where id='71af6131-12d3-4294-b192-256878ce7ecf' and verification_quote is null;

-- Gl.32
update public.equations set verification_quote='L_R = ((AC + A_VA) · 10⁻⁷ · r_D(n) − b_R · h_R · k_i − V_M / (D · 60 · f_Z) − Q_Dr · 10⁻³) / (b_R · h_R · s_R / (D · 60 · f_Z) + (b_R + h_R) · k_i) (32) — printed p.66', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.6.2 p.66) [VC]' where id='904f2f36-9b62-4960-ba21-d77e6e0d89a4' and verification_quote is null;

-- Gl.33
update public.equations set verification_quote='Q_Dr = (Q_Dr,min + Q_Dr,max) / 2 (33) — printed p.66', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.6.2 p.66) [VC]' where id='9357f6ea-65c6-4cad-a90e-17ec33461246' and verification_quote is null;

-- Gl.34
update public.equations set verification_quote='A_S = π · d_a² / 4 + π · d_a · h_S / 2 (34) — printed p.68', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 p.68) [VC]' where id='059d3751-b942-41ec-bc7f-4f0343353eb6' and verification_quote is null;

-- Gl.35
update public.equations set verification_quote='V_S = (AC · 10⁻⁷ · r_D(n) − A_S · k_i) · D · 60 · f_Z (35) — printed p.68', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 p.68) [VC]' where id='bfaf30f2-26e6-4373-9642-23429805afa2' and verification_quote is null;

-- Gl.36
update public.equations set verification_quote='V_S = π · d_i² / 4 · h_S (36) — printed p.69', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 p.69) [VC]' where id='36f70dae-ec78-4fc5-b5c9-83b138339ffa' and verification_quote is null;

-- Gl.37
update public.equations set verification_quote='h_S = (AC · 10⁻⁷ · r_D(n) − π · d_a² / 4 · k_i) / (π · d_i² / (4 · D · 60 · f_Z) + d_a · π · k_i / 2) (37) — printed p.69', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 p.69) [VC]' where id='aba53568-97f3-4054-b613-1b1413cb36fd' and verification_quote is null;

-- Gl.38
update public.equations set verification_quote='A_S,FS · k_f,FS ≥ A_S,Schacht · k_i (38) — printed p.69', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 p.69) [VC]' where id='19f36c1e-9b20-43cd-8b09-6040e81598c2' and verification_quote is null;

-- Gl.39
update public.equations set verification_quote='erf. k_f,FS ≥ (d_a² + 2 · h_S · d_a) / d_i² · k_i (39) — printed p.69', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 p.69) [VC]' where id='a3d078ba-3386-4feb-a302-ab22dc2d1fc8' and verification_quote is null;

-- Gl.40
update public.equations set verification_quote='h_S = (AC · 10⁻⁷ · r_D(n) − π · d_i² / 4 · k_f,FS) · (4 · D · 60 · f_Z) / (d_i² · π) (40) — printed p.69', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.7.2 p.69) [VC]' where id='2c491f26-2b35-4dc6-8af0-c185173af0c6' and verification_quote is null;

-- Gl.41
update public.equations set verification_quote='V_VA = [(AC + A_VA) · 10⁻⁷ · r_D(n) − A_S,m · k_i − Q_Dr · 10⁻³] · D · 60 · f_Z · f_A (41) — printed p.71', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§6.8.2 p.71) [VC]' where id='433f7700-90cb-410d-8103-7b72f53db8fa' and verification_quote is null;

-- Gl.10
update public.equations set verification_quote='V_Rück = ((r_D(30) · (Σ(A_E,b,a · C_S) + A_VA)) / 10.000 − (Q_S + Q_Dr)) · (D · 60) / 1000 − V_VA ≥ 0 (10) — printed p.49', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-05 (§5.3.4.1 p.49) [VC]' where id='8e3c7e22-e3c7-449a-b267-928332c89306' and verification_quote is null;
