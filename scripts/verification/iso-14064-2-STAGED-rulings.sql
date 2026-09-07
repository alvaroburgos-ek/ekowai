-- ============================================================================
-- STAGED RULINGS — ISO-14064-2 (DIN EN ISO 14064-2:2020-05 / EN ISO 14064-2:2019 (D/E)).
-- WRITTEN, NOT APPLIED. Nothing in this file is executed by apply-pack.mjs; every statement is
-- COMMENTED OUT and carries a "☐ RATIFIED" marker that Alvaro ticks before anything is run. Each block
-- carries its evidence quote (GERMAN column of
-- C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\ISO-14064-2\ISO-14064-2-2019-en-es.md, verbatim,
-- including the transcript's machine-translation bleed and OCR artefacts) and its rollback inverse.
--
-- Page convention as in the pack: printed page derived from the standard's own Inhalt index plus the
-- rendered PDF's own footers (printed page = PDF page - 4). That PDF is a machine-translated copy and was
-- used ONLY to number pages — the grade stays VC, never VA.
--
-- CONTEXT. ISO 14064-2 IS a requirements standard: it uses "muss/müssen" (shall), "sollte" (should) and
-- "darf" (may) deliberately. severity=block is therefore defensible here — but only on an UNCONDITIONAL
-- "muss", and only inside the scope predicate the sentence prints.
--
-- PROD SHAPE AUDITED 2026-09-05: 10 worksheets · 60 fields · 4 equations · 22 gates (21 block, 1 warn).
-- EIGHT of the 21 block gates are anchored on a sentence whose "muss" fires only inside a
-- "Wenn …" / "falls verfügbar" / "Gegebenenfalls" / "sofern zutreffend" predicate; the condition grammar
-- cannot express that predicate, so each of those eight fires unconditionally and blocks the printed
-- default case (A-0 … A-8 below, minus A-4 which is an under-enforcement not an over-enforcement).
-- ============================================================================


-- ============================================================================
-- A. SEVERITY / SCOPE — block gates the source does not carry unconditionally
-- ============================================================================

-- ---- A-0  REQ-01 (0ed718a3-7494-444f-a147-2bccbdf5b18d, W01) — BLOCK on a "falls verfügbar" duty
-- Condition: recognized_source_used == true   Severity: block   Clause: 6.1
-- EVIDENCE (§6.1, printed p.29), the three sentences that belong together:
--   "Der Projektantragsteller muss relevante Kriterien und Verfahren für jede Phase des
--    Klimaschutzprojektzyklus identifizieren, berücksichtigen und nutzen, soweit diese zur Verfügung
--    stehen, wie in Bild 3 dargestellt. Wenn Kriterien und Verfahren nicht verfügbar sind, muss der
--    Projektantragsteller relevante aktuelle Leitlinien der Industrie für bewährte Praxis verwenden. Der
--    Projektantragsteller muss gängige Kriterien und Verfahren von einer anerkannten Quelle, falls
--    verfügbar, auswählen und anwenden."
--   "Wenn keine relevanten Kriterien und Verfahren oder relevante aktuelle Leitlinien der Industrie für
--    bewährte Praxis von einer anerkannten Quelle vorhanden sind, muss der Antragsteller des Projekts
--    Kriterien und Verfahren zur Erfüllung der Anforderungen dieses Dokuments festlegen, begründen und
--    anwenden."
-- FINDING: "falls verfügbar" is a scope predicate, and the standard prints an explicit FALLBACK route for
--   the case where no recognized source exists (establish + justify + apply own criteria). A project on
--   that lawful fallback route cannot set recognized_source_used = true and is permanently blocked. The
--   encoded gate makes the standard's own alternative unreachable.
-- PROPOSAL: block -> warn. (A faithful encoding needs a second boolean "own criteria established and
--   justified" and an OR between the two routes — a new-field decision, see D-2.)
--   ☐ RATIFIED
--   -- update public.compliance_requirements set severity='warn' where id='0ed718a3-7494-444f-a147-2bccbdf5b18d';
--   -- rollback: update public.compliance_requirements set severity='block' where id='0ed718a3-7494-444f-a147-2bccbdf5b18d';


-- ---- A-1  REQ-02 (2dd8307b-11ea-4591-bd70-1728c16e3fbc, W01) — BLOCK missing its scope predicate
-- Condition: deviations_documented == True   Severity: block   Clause: 6.1
-- EVIDENCE (§6.1, printed p.29):
--   "Wenn der Antragsteller des Projekts Kriterien und Verfahren oder relevante aktuelle Leitlinien der
--    Industrie für bewährte Praxis anwendet, die von einer anerkannten Quelle stammen, muss der
--    Antragsteller des Projekts alle Abweichungen von diesen Kriterien und Verfahren dokumentieren und
--    begründen."
-- FINDING: the "muss" fires only inside "Wenn … die von einer anerkannten Quelle stammen", and only for
--   deviations that actually exist. The gate demands deviations_documented == true from EVERY project, so
--   a project that follows a recognized source WITHOUT deviating — the intended good case — can never
--   satisfy it. The field is is_required=false, which directly contradicts severity=block.
-- PROPOSAL: block -> warn.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set severity='warn' where id='2dd8307b-11ea-4591-bd70-1728c16e3fbc';
--   -- rollback: update public.compliance_requirements set severity='block' where id='2dd8307b-11ea-4591-bd70-1728c16e3fbc';


-- ---- A-2  REQ-03 (7d9ccf6f-cdcf-4b82-b6bd-d4e2f35926ed, W01) — WORST gate in this standard
-- Condition: ghg_programme IS NOT NULL   Severity: block   Clause: 6.1
-- EVIDENCE (§6.1, printed p.29):
--   "Wenn der Projektantragsteller sich für ein Klimaschutzprogramm anmeldet, muss er sicherstellen, dass
--    das Klimaschutzprojekt die Anforderungen des Klimaschutzprogramms erfüllt."
-- COUNTER-EVIDENCE (§1 Anwendungsbereich, printed p.16):
--   "Die Normenreihe ISO 14060 ist gegenüber Klimaschutzprogrammen neutral. Wenn ein Klimaschutzprogramm
--    anwendbar ist, gelten die Anforderungen dieses Klimaschutzprogramms ergänzend zu den Anforderungen
--    der Normenreihe ISO 14060."
-- FINDING: two defects in one gate. (1) The gate blocks unless a GHG-programme NAME is present, i.e. it
--   forces every project to subscribe to a GHG programme — the exact opposite of the standard's printed
--   programme-neutrality; a project subscribing to none (explicitly allowed) is permanently blocked.
--   (2) The gate does not encode the obligation the sentence states, which is CONFORMANCE to the
--   programme's requirements, not the presence of a name. Field is is_required=false.
-- PROPOSAL: block -> warn now. A correct encoding needs a separate boolean "programme requirements met"
--   guarded by "IF ghg_programme IS NOT NULL THEN …" — a new-field decision, see D-1.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set severity='warn' where id='7d9ccf6f-cdcf-4b82-b6bd-d4e2f35926ed';
--   -- rollback: update public.compliance_requirements set severity='block' where id='7d9ccf6f-cdcf-4b82-b6bd-d4e2f35926ed';


-- ---- A-3  REQ-06 (e4d69a0e-fff1-4f6d-bb5c-798a64063235, W02) — BLOCK on a NESTED conditional
-- Condition: baseline_revalidated == True   Severity: block   Clause: 6.2
-- EVIDENCE (§6.2, printed pp.31-32):
--   "Wenn einem bestehenden Projekt neue Aktivitäten oder Änderungen hinzugefügt werden, muss der
--    Antragsteller das bzw. die Treibhausgasbezugsszenarios und die von den neuen Aktivitäten oder
--    Änderungen betroffenen Emissionen oder entzogenen Mengen im Rahmen des Projekts […] prüfen und
--    aktualisieren."
--   "Wenn das Projekt validiert wurde (siehe 6.12), muss der Antragsteller erläutern, wie die neuen
--    Aktivitäten oder Änderungen weiterhin mit dem validierten Treibhausgasbezugsszenario konsistent
--    bleiben. Wenn die Änderungen nicht mit dem validierten Treibhausgasbezugsszenario konsistent sind,
--    muss der Projektantragsteller das Projekt erneut validieren lassen."
-- FINDING: re-validation is required only if (a) new activities/changes were added AND (b) the project had
--   already been validated AND (c) the changes are inconsistent with the validated baseline. The gate
--   demands baseline_revalidated == true from every project, including a brand-new one that has never been
--   validated and has had no changes. Field is is_required=false.
-- PROPOSAL: block -> warn.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set severity='warn' where id='e4d69a0e-fff1-4f6d-bb5c-798a64063235';
--   -- rollback: update public.compliance_requirements set severity='block' where id='e4d69a0e-fff1-4f6d-bb5c-798a64063235';


-- ---- A-4  REQ-04 (c8c3b44a-bcf7-48ab-be86-108021c01e96, W01) — UNDER-enforcement: 2 of 6 principles
-- Condition: principle_conservativeness == true AND principle_accuracy == true   Severity: block  Clause: 4.1
-- EVIDENCE (§4.1, printed p.23):
--   "Die Anwendung von Grundsätzen ist wesentlich, um sicherzustellen, dass treibhausgasbezogene Angaben
--    den tatsächlichen Verhältnissen entsprechend berücksichtigt werden. Die Grundsätze bilden die
--    Grundlage für die Anforderungen im vorliegenden Dokument und stellen eine Anleitung für die Anwendung
--    dieser Anforderungen dar."
-- FINDING: clause 4 prints SIX principles (4.2 Relevanz, 4.3 Vollständigkeit, 4.4 Konsistenz,
--   4.5 Genauigkeit, 4.6 Transparenz, 4.7 Konservativität — note the transcript prints four of those
--   headings in Spanish: "4.2 Relevancia", "4.4 Constancia", "4.6 Transparencia", "4.7 Conservación") and
--   all six are encoded as is_required=true fields, but the gate tests only two, so four required fields
--   carry no enforcement at all. Separately, §4.1 is written in the indicative ("Die Anwendung … ist
--   wesentlich") and 4.2-4.7 use the "sind … zu"-form, not "muss", so the block severity here rests on the
--   principles being the basis of the clause-6 requirements, not on a printed "muss".
-- PROPOSAL — two options, Alvaro picks (SR-2, never auto-decided):
--   ☐ RATIFIED (a) — extend to all six, keep block
--   -- update public.compliance_requirements set condition='principle_relevance == true AND principle_completeness == true AND principle_consistency == true AND principle_accuracy == true AND principle_transparency == true AND principle_conservativeness == true' where id='c8c3b44a-bcf7-48ab-be86-108021c01e96';
--   -- rollback: update public.compliance_requirements set condition='principle_conservativeness  ==  true AND principle_accuracy  ==  true' where id='c8c3b44a-bcf7-48ab-be86-108021c01e96';
--   ☐ RATIFIED (b) — keep the two, drop to warn
--   -- update public.compliance_requirements set severity='warn' where id='c8c3b44a-bcf7-48ab-be86-108021c01e96';
--   -- rollback: update public.compliance_requirements set severity='block' where id='c8c3b44a-bcf7-48ab-be86-108021c01e96';


-- ---- A-5  REQ-14 (67591232-c4e9-4ab5-8c2a-24b340a39b4f, W06) — BLOCK anchored on "Gegebenenfalls"
-- Condition: emission_factor IS NOT NULL   Severity: block   Clause: 6.7
-- EVIDENCE (§6.7, printed p.35), verbatim including the machine-translation bleed ("morir" for "die"):
--   "Gegebenenfalls muss der Antragsteller des Projekts Treibhausgasemissions- oder -entzugsfaktoren
--    auswählen oder entwickeln, morir: - aus einer anerkannten Quelle stammen, — für die betreffende
--    Treibhausgasquelle oder - senke geeignet sind, — zum Zeitpunkt derquantantn Bestimmung aktuell sind,
--    […] - der vorgesehenen Verwendung des Treibhausgasberichtes entsprechen."
-- FINDING: "Gegebenenfalls" (where applicable). The standard does NOT require an emission factor for every
--   quantification — §6.6 (printed p.34) allows an SSR to be quantified by "regelmäßige Überwachung"
--   (direct measurement) instead of activity data × factor. A directly-measured project is blocked here.
--   Note the ENCODED source_quote for this gate silently DROPS the word "Gegebenenfalls", which is exactly
--   what hides the defect — see C-1 (REQ-14 scores 30% verbatim, the worst in the standard).
-- PROPOSAL: block -> warn.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set severity='warn' where id='67591232-c4e9-4ab5-8c2a-24b340a39b4f';
--   -- rollback: update public.compliance_requirements set severity='block' where id='67591232-c4e9-4ab5-8c2a-24b340a39b4f';


-- ---- A-6  REQ-18 (d498f365-43d7-44f1-bf16-bb96c9e25343, W09) — BLOCK on a "sofern zutreffend" list,
--            and on an arbitrary 4-of-9 subset of it
-- Condition: monitoring_purpose IS NOT NULL AND monitored_parameters IS NOT NULL
--            AND monitoring_methodologies IS NOT NULL AND monitoring_frequency IS NOT NULL
-- Severity: block   Clause: 6.10
-- EVIDENCE (§6.10, printed pp.36-37):
--   "Der Antragsteller des Projekts muss einen Überwachungsplan, der Verfahren zur Messung oder
--    anderweitigen Erfassung, Aufzeichnung, Zusammenstellung und Analyse von Daten und Informationen
--    umfasst, […] einführen und aufrechterhalten."
--   "Der Überwachungsplan muss Folgendes beinhalten, sofern zutreffend: a) Zweck der Überwachung;
--    b) Liste der gemessenen und überwachten Parámetro; […] i) Treibhausgas-Informationsmanagementsysteme
--    […]"
-- FINDING, two parts. (i) The sentence that INTRODUCES the plan is an unconditional "muss", so a block on
--   the plan's existence would be fine — but the list itself stands under "sofern zutreffend", and the
--   gate blocks on four specific list items instead of on the plan. (ii) The gate picks a)/b)/e)/f) and
--   ignores c)/d)/g)/h)/i) with no stated reason, and the is_required flags mirror that split, even though
--   the source treats all nine identically. That is an EKOWAI selection presented as the standard's.
-- PROPOSAL: block -> warn; the required-flag split is C-4.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set severity='warn' where id='d498f365-43d7-44f1-bf16-bb96c9e25343';
--   -- rollback: update public.compliance_requirements set severity='block' where id='d498f365-43d7-44f1-bf16-bb96c9e25343';


-- ---- A-7  REQ-20 (d8b07e78-f7cb-4f7a-a93f-7b56a9a8bafa, W10) — BLOCK missing its scope predicate
-- Condition: verification_validation_iso14064_3 == True   Severity: block   Clause: 6.12
-- EVIDENCE (§6.12, printed p.38):
--   "Wenn der Projektantragsteller die Verifizierung und/ oder Validierung des Klimaschutzprojekts
--    fordert, muss er sicherstellen, dass die Verifizierung oder Validierung den Grundsätzen und
--    Anforderungen nach ISO 14064-3 entspricht."
-- FINDING: the "muss" fires only inside "Wenn der Projektantragsteller die Verifizierung … fordert".
--   ISO 14064-2 nowhere requires a project to BE verified or validated (§0.2 and §5 both treat V&V as an
--   optional extension of the project cycle; §5 prints "Klimaschutzprogramme können vor der Umsetzung des
--   Projekts eine offizielle Registrierung, Validierung und öffentliche Verteilung eines Plans für ein
--   Klimaschutzprojekt erfordern" — a programme may, this document does not). The gate blocks every
--   unverified project. Field is is_required=false.
-- PROPOSAL: block -> warn.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set severity='warn' where id='d8b07e78-f7cb-4f7a-a93f-7b56a9a8bafa';
--   -- rollback: update public.compliance_requirements set severity='block' where id='d8b07e78-f7cb-4f7a-a93f-7b56a9a8bafa';


-- ---- A-8  REQ-22 (18139005-8e59-4b18-a9e9-49810f5cc1d1, W10) — BLOCK missing its predicate AND
--            collapsing a printed a)-OR-b) ALTERNATIVE into one branch
-- Condition: public_claim_content IS NOT NULL   Severity: block   Clause: 6.13
-- EVIDENCE (§6.13, printed p.38):
--   "Wenn der Antragsteller des Projekts eine öffentliche Erklärung über Treibhausgase herausgibt, die die
--    Übereinstimmung mit diesem Dokument beansprucht, muss er Folgendes veröffentlichen: a) eine
--    unabhängige Verifizierungs- oder Validierungserklärung von Dritten, die nach ISO 14064-3 erstellt
--    wurde, oder b) einen Treibhausgasbericht, der mindestens Folgendes enthält: […]"
-- FINDING, two parts. (i) SCOPE: the obligation exists only "Wenn … eine öffentliche Erklärung …
--   herausgibt"; a project that makes no public GHG statement — the common case — is blocked. (ii)
--   OR-COLLAPSE: the standard prints a genuine alternative a) OR b). The encoding has a field only for
--   route b) (public_claim_content, the 15-item minimum content) and NONE for route a) (the independent
--   third-party ISO 14064-3 statement), so a proponent who publishes the third-party statement — the fully
--   compliant route a) — still cannot pass. The printed case a) is UNREACHABLE.
-- PROPOSAL: block -> warn now; the route-a field is D-2.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set severity='warn' where id='18139005-8e59-4b18-a9e9-49810f5cc1d1';
--   -- rollback: update public.compliance_requirements set severity='block' where id='18139005-8e59-4b18-a9e9-49810f5cc1d1';


-- ---- A-9  REQ-15 (1f9163e5-07a4-4c81-8933-82ac90ccc80d, W06) — block DEFENSIBLE, quote TRUNCATED
-- Condition: permanence_risk == true   Severity: block   Clause: 6.7
-- EVIDENCE (§6.7, printed p.35), verbatim as printed — the German sentence has no finite verb, it breaks:
--   "Der Antragsteller des Projekts muss Kriterien, Verfahren und/oder Methoden zur Abschätzung des
--    Risikos, dass eine Reduktion der Treibhausgasemissionen oder Steigerung des Entzugs rückgängig
--    gemacht wird (dh die Dauerhaftigkeit einer Reduktion der Treibhausgasemissionen oder Steigerung des
--    Entzugs und fest)."
-- FINDING: the obligation itself IS unconditional (the Spanish column reads "deberá establecer y aplicar
--   criterios, procedimientos y/o metodologías para evaluar el riesgo de reversión"), so severity=block is
--   DEFENSIBLE. The problem is evidentiary: the German column in the only transcript available is
--   truncated. The ENCODED source_quote fills the gap with the words "auswählen und festlegen", which the
--   source does not print anywhere — fabricated text inside quotation marks. See C-1.
-- PROPOSAL: no severity change; flag for VA re-verification against the authentic Beuth PDF and correct
--   the encoded source_quote (C-1).
--   ☐ RATIFIED (acknowledged, no severity SQL)


-- ============================================================================
-- B. STRUCTURE / CALCULATION — the encoding cannot express what the source requires
-- ============================================================================

-- ---- B-1  EQ-02 and EQ-03 SUM THE SAME SYMBOL — the project/baseline split is unrepresentable.
--            This is the single most consequential defect in this standard's encoding.
-- EQ-02  a6559b54-578c-4ba8-b224-37345a1269fe   E_project  = SUM(ssr_emission_co2e)
-- EQ-03  a7d36f0e-158e-4ef9-8c48-918ead93fa85   E_baseline = SUM(ssr_emission_co2e)
-- EQ-04  a7244a73-ebd4-481d-a867-5432768cdd70   emission_reduction = E_baseline - E_project
-- EVIDENCE (§6.7, printed p.35):
--   "a) jedes relevante Treibhausgas für jede(n) THG-QSS, die/der für das Projekt relevante ist;
--    b) jede(n) THG-QSS, die/der für das Bezugsszenario ist relevante."
-- EVIDENCE (§6.8, printed p.36):
--   "Reduktionen der Treibhausgasemissionen oder Steigerungen des Entzugs müssen als Differenz zwischen
--    den Treibhausgasemissionen und/oder entzogenen Mengen von den THG-QSS, die für das Projekt sind
--    relevante, und denen, die für das Bezugsszenario sind relevante, quantitativ bestimmt werden."
-- FINDING: worksheet W06 holds exactly ONE emission symbol — ssr_emission_co2e
--   (9d41d3d5-1999-4c03-b02f-688f87cce01e) — and NO field saying whether a row belongs to the project or
--   to the baseline scenario. EQ-02 and EQ-03 therefore aggregate the identical input set, so
--   E_project (230588d5-cfcb-4d8d-83bf-d7ca9dc92e76) ≡ E_baseline (4a507902-964a-47e8-a782-1c82149e6704)
--   and EQ-04 yields emission_reduction ≡ 0 for every project — the standard's central quantity is
--   structurally always zero. §6.7 a)/b) requires the two to be quantified SEPARATELY, which the current
--   field set cannot express. (Baseline SSRs are NAMED on W05 in `baseline_ssr`,
--   0ea16ba7-eb8f-4742-b03a-e270aaf4006b, but no emission value is ever attached to them.)
-- PROPOSAL (schema-shaped, needs Alvaro's decision — deliberately no SQL):
--   (a) add a scenario discriminator on W06 (enum project|baseline) and repoint EQ-02/EQ-03 at the
--       filtered sums; or
--   (b) split ssr_emission_co2e into ssr_emission_co2e_project / ssr_emission_co2e_baseline and repoint.
--   ☐ RATIFIED — option: ______________________


-- ---- B-2  `leakage` (91a79718-8bd0-4b97-bc7a-50704dfec272, W07) is consumed by NOTHING
-- Field: leakage, number, t CO2e, is_required=false, clause 6.8
-- EVIDENCE (§3.1.11 Anm. 2, printed p.18):
--   "Anmerkung 2 zum Begriff: Die Verschiebung vonReduktion von Treibhausgasemissionen(3.1.7)
--    ordenSteigerungen des Entzugs von Treibhausgasen(3.1.8) durch betroffene THG-QSS wird oft als
--    Verlagerung bezeichnet."
-- FINDING: no equation reads `leakage`, no gate references it — a value entered there reaches no total.
--   The standard's own mechanism is that leakage enters through the AFFECTED SSRs (3.1.11) inside the §6.8
--   difference, i.e. through ssr_emission_co2e, not as a separate additive term. So the field is either
--   redundant with the affected-SSR rows or it is a real term the equations forgot. That is a modelling
--   decision, not a source question. NOTE the §6.8 difference is not "wrong" here — it is the printed
--   mechanism — so option (a) is the conservative reading.
-- PROPOSAL:
--   ☐ RATIFIED (a) — documentation-only, say so in the description
--   -- update public.fields set description = description || ' Hinweis: Verlagerung wird in diesem Dokument über die betroffenen THG-QSS (3.1.11) innerhalb der Differenz nach 6.8 erfasst; dieses Feld ist dokumentarisch und geht in keine Gleichung ein.' where id='91a79718-8bd0-4b97-bc7a-50704dfec272';
--   -- rollback: update public.fields set description = replace(description, ' Hinweis: Verlagerung wird in diesem Dokument über die betroffenen THG-QSS (3.1.11) innerhalb der Differenz nach 6.8 erfasst; dieses Feld ist dokumentarisch und geht in keine Gleichung ein.', '') where id='91a79718-8bd0-4b97-bc7a-50704dfec272';
--   ☐ RATIFIED (b) — fold into EQ-04 as an explicit term (requires a sign convention the standard does
--       NOT print; a new equation, no SQL proposed)


-- ---- B-3  UNIT DISCIPLINE on the EQ-01 chain — no unit MISMATCH, but no unit DISCIPLINE either
-- EQ-01  1946f6f0-ee76-4d4f-a0a0-b7240196e734  ssr_emission_co2e = activity_data * emission_factor * gwp
-- Declared units: activity_data = "unit-dependent" · emission_factor = (none) · gwp = (none) ·
--                 ssr_emission_co2e = t CO2e.
-- FINDING: the dimensional check on this chain CANNOT FAIL and CANNOT PASS — two of three inputs declare
--   no unit at all. The kg-vs-tonne defect class found in ISO 14064-1 is therefore NOT present here, but
--   only because nothing is declared. The standard prints no unit for the factor either (§6.7 lists only
--   qualitative requirements), so this is not a source disagreement; it is an open modelling gap: an
--   engineer entering a factor in kg CO2e per unit produces a result 1000× too large with no check. The
--   same applies to `expected_reductions_co2e` (W02), whose "t CO2e" is the standard's EXAMPLE
--   ("z. B. en Tonnen CO2e"), not a prescribed unit.
-- PROPOSAL: give the emission factor an explicit unit field (e.g. free text "t CO2e je Einheit
--   Aktivitätsdaten") or make the activity-data / factor unit pair an explicit engineer_input.
--   ☐ RATIFIED — option: ______________________  (schema-shaped, no SQL proposed)


-- ============================================================================
-- C. QUOTE ACCURACY / CLAUSE RETAGS / REQUIRED-FLAG REVIEW
-- ============================================================================

-- ---- C-1  ENCODED gate source_quotes are NOT verbatim — machine-scored against the md
-- Method: each gate's source_quote was stripped of its "§x.y:" label, split at the encoder's own "…"
--   elisions, normalised the way spotcheck-pack.mjs normalises, and scored on 6-word windows found in the
--   transcript. Result (14 of 22 at >= 85%, mean 86%):
--     REQ-14  30%   REQ-04  60%   REQ-21  63%   REQ-16  65%   REQ-20  74%
--     REQ-13  75%   REQ-15  76%   REQ-07  78%   REQ-05  88%   REQ-18  93%
--     REQ-08  97%   REQ-22  98%   REQ-01/02/03/06/09/10/11/12/17/19 100%
--   The low scorers fall into four named classes, and three of them are substantive, not cosmetic:
--   (1) SCOPE QUALIFIER SILENTLY DROPPED INSIDE THE QUOTATION MARKS — REQ-14 omits the leading
--       "Gegebenenfalls" (see A-5); REQ-13 omits "sofern zutreffend" (see C-3). This is the class that
--       hides an over-enforcement from a later reviewer.
--   (2) TEXT INVENTED TO COMPLETE A TRUNCATED SOURCE — REQ-15 ends its quote "…(Dauerhaftigkeit),
--       auswählen und festlegen."; the words "auswählen und festlegen" appear nowhere in the source, whose
--       German breaks off at "… und fest)." (see A-9).
--   (3) SOURCE SILENTLY NORMALISED INSIDE THE QUOTATION MARKS — REQ-16 rewrites the printed
--       "die für das Projekt sind relevante" as "die für das Projekt relevant [sind]"; REQ-07 rewrites the
--       printed "kontroliert" (one l) as "kontrolliert"; REQ-04 names the principles "4.2 Relevanz,
--       4.4 Konsistenz, 4.6 Transparenz, 4.7 Konservativität" where the transcript prints
--       "4.2 Relevancia, 4.4 Constancia, 4.6 Transparencia, 4.7 Conservación".
--   (4) PARENTHETICAL SUMMARIES — REQ-21, REQ-05, REQ-08, REQ-18, REQ-22 append "(Liste a-l …)" style
--       annotations. These sit OUTSIDE the quotation marks and are legitimate encoder annotation; they are
--       the reason those rows score below 100% and they need no fix.
-- PROPOSAL: replace the source_quote of the class-(1)/(2)/(3) gates with the verbatim German. The pack's
--   own verification_quote column already carries the verbatim text for every affected field, so this is a
--   cosmetic-but-audit-relevant correction of the ENCODE-TIME column.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set source_quote='§6.7: "Gegebenenfalls muss der Antragsteller des Projekts Treibhausgasemissions- oder -entzugsfaktoren auswählen oder entwickeln, morir: - aus einer anerkannten Quelle stammen, — für die betreffende Treibhausgasquelle oder - senke geeignet sind, — zum Zeitpunkt derquantantn Bestimmung aktuell sind, [...] - der vorgesehenen Verwendung des Treibhausgasberichtes entsprechen."' where id='67591232-c4e9-4ab5-8c2a-24b340a39b4f';
--   -- update public.compliance_requirements set source_quote='§6.7: "Der Antragsteller des Projekts muss Kriterien, Verfahren und/oder Methoden zur Abschätzung des Risikos, dass eine Reduktion der Treibhausgasemissionen oder Steigerung des Entzugs rückgängig gemacht wird (dh die Dauerhaftigkeit einer Reduktion der Treibhausgasemissionen oder Steigerung des Entzugs und fest)." [Transkript bricht ab; vollstaendiger Wortlaut nur in der spanischen Spalte]' where id='1f9163e5-07a4-4c81-8933-82ac90ccc80d';
--   -- update public.compliance_requirements set source_quote='§6.8: "Reduktionen der Treibhausgasemissionen oder Steigerungen des Entzugs müssen als Differenz zwischen den Treibhausgasemissionen und/oder entzogenen Mengen von den THG-QSS, die für das Projekt sind relevante, und denen, die für das Bezugsszenario sind relevante, quantitativ bestimmt werden."' where id='a6eaa815-9f0c-4845-bada-cd130ba8a764';
--   -- update public.compliance_requirements set source_quote='§6.3: "Auf der Grundlage der ausgewähIten oder festgelegten Kriterien und Verfahren muss der Antragsteller des Projekts die für das Projekt relevanten THG-QSS identifizieren als: a) kontroliert vom Antragsteller des Projekts, b) zugehörig zu dem Klimaschutzprojekt oder c) beeinflusst durch das Klimaschutzprojekt."' where id='3009cb2e-b6d4-433d-baa6-0602fbea9c8f';
--   -- rollback: restore the four previous source_quote values recorded in
--   --   scripts/verification/fields-ISO-14064-2.json export of 2026-09-05 (re-export to obtain them).


-- ---- C-2  REQ-12 (1b21d9c0-a07f-4e4e-a3e4-2635ef9e5641, W05) — MIS-ANCHORED source_quote
-- Condition: ssr_selection_mode IN {regular_monitoring,estimation}   Severity: block   Clause: 6.6
-- Encoded source_quote: '§6.6: "Der Projektantragsteller muss eine Begründung vorbringen, wenn er keine
--   THG-QSS, wie im Treibhausgasbezugsszenario angegeben, für die regelmäßige Überwachung ausgewählt hat."'
-- FINDING: that sentence is the source for the SIBLING field `ssr_exclusion_justification`, not for the
--   selection enum. The sentence that actually governs REQ-12 is the first paragraph of §6.6 (printed
--   p.34): "Der Antragsteller des Projekts muss Kriterien und Verfahren zur Auswahl von THG-QSS entweder
--   für die regelmäßige Überwachung oder für die Abschätzung auf der Grundlage geeigneter und
--   zuverlässiger Daten auswählen oder festlegen."
-- PROPOSAL: repoint the gate's source_quote to that first §6.6 paragraph.
--   ☐ RATIFIED
--   -- update public.compliance_requirements set source_quote='§6.6: "Der Antragsteller des Projekts muss Kriterien und Verfahren zur Auswahl von THG-QSS entweder für die regelmäßige Überwachung oder für die Abschätzung auf der Grundlage geeigneter und zuverlässiger Daten auswählen oder festlegen."' where id='1b21d9c0-a07f-4e4e-a3e4-2635ef9e5641';
--   -- rollback: update public.compliance_requirements set source_quote='§6.6: "Der Projektantragsteller muss eine Begründung vorbringen, wenn er keine THG-QSS, wie im Treibhausgasbezugsszenario angegeben, für die regelmäßige Überwachung ausgewählt hat."' where id='1b21d9c0-a07f-4e4e-a3e4-2635ef9e5641';


-- ---- C-3  REQ-13 (127152af-d9cd-4bea-adea-20fb82bc1221, W05) — EMPTY condition + MIS-HOMED + wrong clause
-- Condition: '' (empty string)   Severity: warn   Clause: 6.7
-- Encoded source_quote, tagged §6.7: "Der Antragsteller des Projekts muss … die Reduktionen … und
--   Steigerungen des Entzugs getrennt für jedes relevante Treibhausgas und dessen entsprechende(n) THG-QSS
--   für das Projekt und das Bezugsszenario quantitativ bestimmen."
-- EVIDENCE — that sentence is printed in §6.8, NOT §6.7 (printed p.36):
--   "Der Antragsteller des Projekts muss, sofern zutreffend, die Reduktionen von Treibhausgasemissionen
--    und Steigerungen des Entzugs getrennt für jedes relevantes Treibhausgas und dessen entsprechende(n)
--    THG-QSS für das Projekt und das Bezugsszenario quantitativ bestimmen."
-- FINDING, three defects in one row: (1) the condition is EMPTY — evaluate.ts cannot parse it, so the gate
--   resolves to `manual` and enforces NOTHING; (2) it is tagged clause 6.7 but quotes §6.8; (3) it sits on
--   worksheet W05 (QSS selection) while the fields it talks about (emission_reduction on W07,
--   ssr_emission_co2e on W06) live elsewhere — a mis-homed gate. The encoded quote also drops the printed
--   scope qualifier "sofern zutreffend" and normalises "relevantes" to "relevante" (see C-1 class 1/3).
-- PROPOSAL — needs Alvaro; re-homing a gate is a structure change:
--   (a) re-home to W07, retag to 6.8, give it a real condition (e.g. emission_reduction IS NOT NULL); or
--   (b) delete it as redundant with REQ-16.
--   ☐ RATIFIED — option: ______________________  (no SQL until the option is chosen)


-- ---- C-4  REQ-16 (a6eaa815-9f0c-4845-bada-cd130ba8a764, W07) — the gate DUPLICATES EQ-04 (tautology)
-- Condition: emission_reduction = E_baseline - E_project   Severity: block   Clause: 6.8
-- FINDING: a single `=` tokenises as `==` in src/lib/compliance/evaluate.ts, so the gate is an equality
--   check against exactly the expression EQ-04 already computes. Whenever the engine produces
--   emission_reduction the gate passes by construction; it can only fail if a human overrides a derived
--   value, which the derived-field rule forbids anyway. It is a NO-OP block gate — not harmful, but it is
--   not enforcement, and it inflates the block-gate coverage count by one.
-- PROPOSAL: keep as defence-in-depth (no change) OR drop to warn so coverage counts stay honest.
--   ☐ RATIFIED — option: keep / warn
--   -- update public.compliance_requirements set severity='warn' where id='a6eaa815-9f0c-4845-bada-cd130ba8a764';
--   -- rollback: update public.compliance_requirements set severity='block' where id='a6eaa815-9f0c-4845-bada-cd130ba8a764';


-- ---- C-5  REQ-07 / REQ-12 — membership tests that enumerate the FULL enum are presence checks
-- REQ-07 (3009cb2e-b6d4-433d-baa6-0602fbea9c8f): ssr_classification IN {controlled,related,affected}
--        — the enum holds exactly those three values.
-- REQ-12 (1b21d9c0-a07f-4e4e-a3e4-2635ef9e5641): ssr_selection_mode IN {regular_monitoring,estimation}
--        — the enum holds exactly those two values.
-- FINDING: NO enum value is left uncovered, so there is NO unsatisfiable gate and NO uncovered-value
--   defect. But a membership test over the complete value set can never fail once a value is chosen — it
--   degrades to "a value is present". That happens to match what §6.3 a)-c) and §6.6 actually require
--   (classify / select), so this is neither over- nor under-enforcement. Recorded so the coverage numbers
--   are not read as more constraint than they carry.
--   ☐ RATIFIED (acknowledged, no SQL)


-- ---- C-6  is_required REVIEW — fields the source qualifies but the encoding marks required
--   · emission_factor (ecba1225-735a-47c2-9f2e-04b6332eea9a, W06) is_required=true.
--     §6.7 printed p.35: "Gegebenenfalls muss …". Conditional, and §6.6 allows direct measurement instead.
--     PROPOSE is_required=false.
--   · gwp (64adbb96-d183-461e-ac7f-6f881b3c7717, W06) is_required=true.
--     §6.8 printed p.36: "Sofern anwendbar, muss der Projektantragsteller die Menge jeder Art von
--     Treibhausgas unter Anwendung des entsprechenden Treibhauspotentials in Einheiten von CO 2 e
--     umrechnen." Conditional; a single-gas CO2 project needs no conversion. PROPOSE is_required=false.
--   · permanence_risk (21423fdc-d891-46d1-8a8d-a1a3abc352e1, W06) is_required=true — the obligation is
--     unconditional in substance (see A-9). KEEP true; listed only for completeness.
--   · uncertainty_assessment (c5cef3ba-4a76-4d32-b9bb-c0a2acb37b43, W08) is_required=true — the ASSESSMENT
--     is inside the unconditional §6.9 "muss … einschließlich der Beurteilung von Unsicherheiten"; only
--     the REDUCTION of uncertainty is "sollte". KEEP true; listed only for completeness.
--   ☐ RATIFIED
--   -- update public.fields set is_required=false where id in ('ecba1225-735a-47c2-9f2e-04b6332eea9a','64adbb96-d183-461e-ac7f-6f881b3c7717');
--   -- rollback: update public.fields set is_required=true where id in ('ecba1225-735a-47c2-9f2e-04b6332eea9a','64adbb96-d183-461e-ac7f-6f881b3c7717');


-- ---- C-7  is_required REVIEW — the §6.10 a)-i) split is an EKOWAI choice presented as the standard's
-- EVIDENCE (§6.10, printed p.37): "Der Überwachungsplan muss Folgendes beinhalten, sofern zutreffend:"
--   followed by a) … i) with NO differentiation between the nine items.
-- Encoded flags: a) monitoring_purpose (4d749bfe-3529-4593-b5d9-c4ff2c4f4359) true ·
--   b) monitored_parameters (fb080a7d-84b3-4946-b00d-cc069ac12a83) true ·
--   c) reported_data_types (176941ba-3ce9-4641-a058-8e88072fcdf7) false ·
--   d) data_origin (281e49f5-6450-4737-be23-c2eea2e6c714) false ·
--   e) monitoring_methodologies (b1d4b8fc-1831-420f-a11a-98a7a90b46bf) true ·
--   f) monitoring_frequency (be767df5-8c46-40aa-a11e-106b2f06fa38) true ·
--   g) monitoring_roles (7b4057c1-59c6-425f-9422-828dd2bf6df7) false ·
--   h) monitoring_controls (7ca8f85d-6807-483d-a6fd-41a057339ba1) false ·
--   i) ghg_info_system (87e11860-f4fe-489d-9973-497535621460) false.
-- FINDING: the source treats all nine identically; the 4-true / 5-false split has no source basis.
-- PROPOSAL — two options, Alvaro picks:
--   ☐ RATIFIED (a) — all nine required (reading: the plan "muss" contain them where applicable)
--   -- update public.fields set is_required=true where id in ('176941ba-3ce9-4641-a058-8e88072fcdf7','281e49f5-6450-4737-be23-c2eea2e6c714','7b4057c1-59c6-425f-9422-828dd2bf6df7','7ca8f85d-6807-483d-a6fd-41a057339ba1','87e11860-f4fe-489d-9973-497535621460');
--   -- rollback: update public.fields set is_required=false where id in ('176941ba-3ce9-4641-a058-8e88072fcdf7','281e49f5-6450-4737-be23-c2eea2e6c714','7b4057c1-59c6-425f-9422-828dd2bf6df7','7ca8f85d-6807-483d-a6fd-41a057339ba1','87e11860-f4fe-489d-9973-497535621460');
--   ☐ RATIFIED (b) — none required (reading: the whole list is "sofern zutreffend")
--   -- update public.fields set is_required=false where id in ('4d749bfe-3529-4593-b5d9-c4ff2c4f4359','fb080a7d-84b3-4946-b00d-cc069ac12a83','b1d4b8fc-1831-420f-a11a-98a7a90b46bf','be767df5-8c46-40aa-a11e-106b2f06fa38');
--   -- rollback: update public.fields set is_required=true where id in ('4d749bfe-3529-4593-b5d9-c4ff2c4f4359','fb080a7d-84b3-4946-b00d-cc069ac12a83','b1d4b8fc-1831-420f-a11a-98a7a90b46bf','be767df5-8c46-40aa-a11e-106b2f06fa38');


-- ---- C-8  SOURCE-TRANSCRIPT DEFECTS — VA blockers, NOT encoding defects
-- These cap the whole standard at VC and must be closed against the authentic Beuth PDF:
--   (1) §6.13 b) 15) is printed EMPTY in the German column of both the md and the source PDF ("15).");
--       the content exists only in the Spanish column ("si lo requieren los usuarios previstos, cambios al
--       proyecto o al sistema de seguimiento del plan del proyecto y evaluación de su conformidad con los
--       criterios, la aplicabilidad de las metodologías y cualquier otro requisito.").
--   (2) §6.7 permanence sentence breaks off mid-clause ("… und fest).") — see A-9.
--   (3) §6.4 functional-equivalence sentence is garbled ("… muss gegebenenfalls alle significantkanten
--       Unterschiede zwischen unsuter dem Projektzenario dem Projekt.").
--   (4) The entire German column carries machine-translation bleed ("morir" for "die", "en" for "in",
--       "Parámetro", "Cuantitativo Bestimmung", "quantumn", "kontroliert", "ausgewähIten", "señorita",
--       "sichprokent"), and four clause-4 headings are printed in Spanish.
--   ☐ RATIFIED (acknowledged, no SQL)


-- ============================================================================
-- D. GRAMMAR GAPS — cannot be fixed by data; recorded for the roadmap
-- ============================================================================
-- D-1  evaluate.ts has an "IF cond THEN cond" guarded form, but there is no FIELD to hang the scope
--      predicate on for A-2 (programme conformance) — a project has no boolean "subscribes to a GHG
--      programme" distinct from the free-text programme name. Eight of the 21 block gates in this standard
--      over-enforce for exactly this reason (A-0, A-1, A-2, A-3, A-5, A-6, A-7, A-8).
-- D-2  There is no way to express a printed a)-OR-b) ALTERNATIVE where each branch has its own evidence
--      field. A-8 is the clean example (§6.13 route a) has no field at all); A-0 is the second (§6.1's
--      "establish your own criteria" fallback route has no field either).
--   ☐ RATIFIED (acknowledged, no SQL)
-- ============================================================================
