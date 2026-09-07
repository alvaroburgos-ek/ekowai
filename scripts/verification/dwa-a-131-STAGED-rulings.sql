-- ============================================================================
-- STAGED RULINGS — DWA-A 131 "Bemessung von einstufigen Belebungsanlagen" (Juni 2016, Weissdruck)
-- md pass 2026-09-07, source: C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DWA-A-131\DWA-A-131.md
-- Grade VC (SR-3). Page refs = printed page range of the clause, derived from the guideline's own
-- Inhalt and cross-checked against the mathpix image indices (+2 offset, 10/10 Bilder consistent).
--
-- NOTHING IN THIS FILE IS APPLIED. Every block is commented out and carries a "☐ RATIFIED" marker.
-- Un-comment a block only after Alvaro ticks it. Each block states: evidence quote (verbatim from the
-- md), the proposed change, and the rollback inverse.
--
-- Prod shape at export time (fields-DWA-A-131.json, this session):
--   8 worksheets / 162 fields (all imported_unverified) / 78 equations (all verified, all quote-NULL)
--   / 20 compliance_requirements, ALL severity='block', ALL requires_attestation=false.
-- Structural scan results that produced NO finding (recorded so the absence is auditable):
--   · phantom fields (symbol without label/clause/description, unreferenced): 0
--   · worksheets with zero fields: 0 (2/29/11/27/11/52/24/6)
--   · duplicate fields: 0. The apparent twins (X_CSB_ZB vs X_CSB_ZB_oTS, t_TS_aerob_Bem vs _num,
--     t_TS_Bem vs _exp vs _stab, UeS_d_C vs _alt, OV_C_D_vorg/int/sim, RF vs RF_vg, eta_D vs
--     eta_D_kask, Q_SR_rund/recht/band, t_SR_rund/recht/band) are the guideline's OWN alternative
--     methods (Gl.9 vs 10, 12 vs 13, 15 vs 16 vs 18, 24 vs 25, 30/31/32, 51 vs 57, 53 vs 54,
--     B.4/B.6/B.8, B.3/B.5/B.7) and are correctly single-sourced, one producer each.
--   · duplicate gates: 0. · unsatisfiable gates: 0.
--   · invented numbers: 0. Every numeric value carried by a field description or a gate condition was
--     grepped against the md and found printed there (f_S 0,05-0,1/0,05; f_A 0,2-0,35/0,3;
--     f_CSB 0,15-0,25; f_B 0,2-0,3/0,3/0,2; 1,6 g CSB/g oTS; Y 0,67; b 0,17 d^-1; 0,2; 0,92; 1,33;
--     1,42; mu_A,max 0,47 d^-1; SF 1,6; PF >=1,5 / 2,1 / 1,5 / 1,2; 1,103; 1,072; 3,4; 20 d; 25 d;
--     2,86; 0,75; 0,68; 2 mg/l; 0; 0,07; 0,03; 0,8-0,6; 0,2-0,6; 0,15; 0,005; 0,002-0,007; 0,6-0,7;
--     2,7 kg Fe; 1,3 kg Al; 3 g TS; 2,5/4 kg TS; 1,35 kg TS; 6,8; 5,3; ISV 50-200; VSV <600;
--     TS >1,0; RV <0,5; q_SV 500/650; q_A 1,6/2,0; Tab.5 row; 1.000/1.100/500; t_E 2,0 h;
--     0,5-0,8 TS_BS; 3 m; 2,5 m; 50 cm; 20 cm; 30-60 cm; <7 cm/s; 1.001/1.000/1.450 kg/m3;
--     9,81; 0,0013 Ns/m2; G 40-80 s^-1; 60 m; 30-50 m; 8 m; Tab.6/B.1 0,3-0,6 / 0,3-0,8 / 0,15-0,30 /
--     72-144 / max.108 / 36-108 / max.324 / 1,5 / <=1,0; 0,4-0,8 Q_RS; 15*h_SR; t_T 2 h; 4,3;
--     3,92; 1,66; f_C 1,1-1,3; f_N 1,5-2,4; 0,07/0,06/0,04/0,11/0,03; 1,5 mmol/l; 8-20 degC; 12 degC).
--   · unit mismatch between fields feeding one equation: 1 (block S-21).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- S-1  CR-013 (A131-06, §6.7, severity=block) — condition='TRUE' HIDES TWO PRINTED HARD LIMITS.
--      This is the recurring "no-op condition on a printed numeric limit" defect in its worst form:
--      the condition is literally TRUE, so the gate can never fail, while its own source_quote states
--      two "muss"/"darf nicht" limits.
--      EVIDENCE (§6.7, printed p.43-46):
--        "Die errechnete Beckentiefe $h_{\text {ges }}$ als Summe aus den Teiltiefen $h_{1}, h_{23}$
--         und $h_{4}$ ist für horizontal durchströmte Nachklärbecken mit geneigter Beckensohle auf
--         zwei Drittel des Fließwegs einzuhalten. Sie muss dort mindestens 3 m betragen. Bei runden
--         Nachklärbecken darf die Randwassertiefe $2,5 \mathrm{~m}$ nicht unterschreiten."
--      The field h_ges EXISTS (A131-06, produced by Gl.hges = h_1 + h_23 + h_4). The Randwassertiefe
--      h_Rand does NOT exist as a field although the guideline lists it in §2 ("$h_{\text {Rand }}$ & m
--      & Randtiefe"), so the 2,5 m limit is currently unrepresentable.
-- ☐ RATIFIED  (a) give CR-013 a real condition on the depth that IS encoded
-- update public.compliance_requirements set condition = 'h_ges >= 3'
--   where id = '11d346bf-4832-4b24-ad57-f3597abcdeb0';
--   -- rollback: update ... set condition = 'TRUE' where id = '11d346bf-4832-4b24-ad57-f3597abcdeb0';
-- ☐ RATIFIED  (b) add the missing field h_Rand (A131-06, m, optional) and a second gate
--                  'h_Rand >= 2.5' restricted to round tanks, so the printed 2,5 m limit is enforced.
--                  (INSERT deliberately not pre-written: needs a worksheet_template_id + order_index
--                   decision, and adding a field changes the form — ruling required.)


-- ----------------------------------------------------------------------------
-- S-2  CR-019 (A131-06, §6.7, block) — condition='TRUE' no-op on a genuine "muss".
--      EVIDENCE (§6.7, printed p.43-46): "Grundsätzlich muss das sich aus den geometrischen
--      Randbedingungen ergebende Volumen mindestens gleich der Summe der erforderlichen Teilvolumina
--      sein. Ist dies nicht der Fall, z. B. bei kleinen Becken $<8 \mathrm{~m}$ Durchmesser, so müssen
--      die Beckenabmessungen entsprechend vergrößert werden. Zusätzlich muss für Becken mit
--      $D<8 \mathrm{~m}$ eine Überprüfung der Geometrie gemäß Arbeitsblatt DWA-A 222 oder Arbeitsblatt
--      DWA-A 226 erfolgen."
--      The geometric tank volume is NOT an encoded field, so the first "muss" is not expressible; the
--      second is a cross-standard duty (DWA-A 222 / DWA-A 226). A block gate that always passes is
--      worse than an attested one, because it reports enforcement that does not exist.
-- ☐ RATIFIED  update public.compliance_requirements set requires_attestation = true
--                where id = '4140d258-cc81-492b-b240-81a2092aeb6d';
--                -- rollback: set requires_attestation = false for the same id


-- ----------------------------------------------------------------------------
-- S-3  CR-017 (A131-02, §4.1, block) — condition='TRUE' no-op on a pure cross-reference.
--      EVIDENCE (§4.1, printed p.24-25): "Die Vorgehensweise zur Ermittlung der maßgebenden Frachten
--      und Konzentrationen ist im Arbeitsblatt ATV-DVWK-A 198 dargestellt. Die Datenermittlung bildet
--      die Grundlage für die Bemessung der biologischen Stufe nach diesem Arbeitsblatt."
--      No obligation of DWA-A 131 itself; the duty lives in ATV-DVWK-A 198 (NR — not in the library).
-- ☐ RATIFIED  update public.compliance_requirements set severity = 'warn', requires_attestation = true
--                where id = '9e8d5e10-b87c-477a-b21e-eb236584e3a4';
--                -- rollback: set severity='block', requires_attestation=false for the same id


-- ----------------------------------------------------------------------------
-- S-4  CR-018 (A131-03, §5.3.1, block) — condition='TRUE' no-op AND mis-homed.
--      EVIDENCE (§5.3.1, printed p.37-38): "Phosphorelimination kann alleine durch Simultanfällung,
--      durch biologische Phosphorelimination, in der Regel kombiniert mit Simultanfällung, und durch
--      Vor- oder Nachfällung erfolgen (siehe auch Arbeitsblatt DWA-A 202)." — "kann ... erfolgen" is
--      descriptive, not an obligation.
--      MIS-HOMED: the gate sits on A131-03 "Erforderliches Schlammalter" (§5.1) while §5.3 is the
--      scope of A131-05 "Phosphorelimination + Schlammmasse"; it references no field of A131-03.
-- ☐ RATIFIED  (a) update public.compliance_requirements set severity = 'warn'
--                    where id = '2f1b5d9a-eea5-4a53-9a0e-5a0820f25e71';
-- ☐ RATIFIED  (b) re-home to A131-05 (set worksheet_template_id to the A131-05 template).
--                    -- rollback: severity='block'; worksheet_template_id back to the A131-03 template


-- ----------------------------------------------------------------------------
-- S-5  CR-020 (A131-06, §7.3, block) — condition='TRUE' no-op, soft text, AND mis-homed.
--      EVIDENCE (§7.3, printed p.50-52): "Die weitere Auslegung der Belüftung erfolgt unter Verwendung
--      der im Merkblatt DWA-M 229-1 zusammengestellten Empfehlungen, insbesondere im Hinblick auf die
--      Wahl des Belüftungssystems (Oberflächen- oder Druckluftbelüftung), der verfahrenstechnischen
--      Bemessung der Belüftung und der planerisch konstruktiven Hinweise für die maschinentechnische
--      Ausrüstung einschließlich der Auslegung der Gebläse." — "Empfehlungen" of ANOTHER document
--      (DWA-M 229-1, NR). §1.1 states explicitly: "Die Wahl und die Auslegung der Belüftungseinrichtungen
--      werden in diesem Arbeitsblatt nicht behandelt."
--      MIS-HOMED: gate sits on A131-06 (Nachklärung) although §7.3 is A131-07 (Belebung).
-- ☐ RATIFIED  (a) update public.compliance_requirements set severity='warn', requires_attestation=true
--                    where id = '1ead4090-3e20-4301-b0d5-aed844e47f86';
-- ☐ RATIFIED  (b) re-home to A131-07.
--                    -- rollback: severity='block', requires_attestation=false, ws back to A131-06


-- ----------------------------------------------------------------------------
-- S-6  CR-003 (A131-03, §5.1.6, block, condition 't_TS_Bem >= 20') — OVER-ENFORCEMENT, and a
--      MISSING gate for the 25 d case. This is the most consequential gate finding on this standard.
--      EVIDENCE (§5.1.6, printed p.32-33): "Das Bemessungsschlammalter von Anlagen, die für aerobe
--      Schlammstabilisierung und Nitrifikation zu bemessen sind, muss $t_{\mathrm{TS}, \text { Bem }}
--      \geq 20$ d betragen." | "Wird auch gezielte Denitrifikation verlangt, muss das Schlammalter
--      $t_{\mathrm{TS}, \text { Bem }} \geq 25 \mathrm{~d}$ betragen."
--      The 20 d floor is CONDITIONAL on "Anlagen, die für aerobe Schlammstabilisierung und
--      Nitrifikation zu bemessen sind". The encoded gate is UNCONDITIONAL, so an ordinary
--      nitrifying/denitrifying plant designed to e.g. t_TS,Bem = 15 d — perfectly compliant per
--      §5.1.3/§5.1.5, and the normal case — is BLOCKED. Conversely the 25 d floor for plants with
--      aerobic stabilisation AND targeted denitrification has NO gate at all, so the stricter of the
--      two printed limits is unenforced.
--      There is no field on which to condition: no "aerobe Schlammstabilisierung ja/nein" selector
--      exists on A131-01, and verfahren_n_elim has no 'schlammstabilisierung' value.
-- ☐ RATIFIED  (a) add enum field 'schlammstabilisierung' (A131-01, enum ja/nein, §5.1.6, required)
-- ☐ RATIFIED  (b) update public.compliance_requirements
--                    set condition = '(schlammstabilisierung == ''nein'') OR (t_TS_Bem >= 20)'
--                    where id = '389a7621-3566-46bc-be19-14775908cd08';
--                    -- rollback: set condition = 't_TS_Bem >= 20' for the same id
-- ☐ RATIFIED  (c) add a NEW gate on A131-03, §5.1.6, block:
--                    condition '(schlammstabilisierung == ''nein'') OR (verfahren_n_elim == ''keine'')
--                                OR (t_TS_Bem >= 25)'
--                    source_quote = the "Wird auch gezielte Denitrifikation verlangt ..." sentence above.
--      NOTE for the ruling: §5.1.6 also prints two RELIEFS that would have to be modelled with it —
--      "Wenn die Temperatur im Belebungsbecken im 2-Wochen-Mittel stets höher als $12^{\circ} \mathrm{C}$
--      ist, kann das Schlammalter nach GL. (18) abgemindert werden." and "Wenn Schlammteiche oder andere
--      Becken mit mindestens einjähriger Lagerdauer des flüssigen Schlamms zur anaeroben
--      Nachstabilisation vorhanden sind, kann das Schlammalter, auch wenn gezielte Denitrifikation
--      gefordert wird, auf $t_{\mathrm{TS}, \text { Bem }}=20 \mathrm{~d}$ verringert werden."


-- ----------------------------------------------------------------------------
-- S-7..S-10  BLOCK GATES ANCHORED ON SOFT TEXT ("nicht empfohlen" / "sollten vermieden" /
--            "nicht zu empfehlen" / "sollte ... nicht unterschreiten"). Per the doctrine a block gate
--            needs a "muss/darf nicht" anchor; these four are recommendations. Proposal: block -> warn,
--            keeping the numeric condition unchanged so the number is still checked, just not fatal.
--
-- S-7  CR-004 (A131-03, §5.2.4, 'V_D_V_BB >= 0.2 AND V_D_V_BB <= 0.6')
--      EVIDENCE (§5.2.4, printed p.35-36): "Denitrifikationsvolumina kleiner als
--      $V_{\mathrm{D}} / V_{\mathrm{BB}}=0,2$ und größer als $V_{\mathrm{D}} / V_{\mathrm{BB}}=0,6$
--      werden zur Bemessung nicht empfohlen."
-- ☐ RATIFIED  update public.compliance_requirements set severity='warn'
--                where id = '614d075a-1d4a-4ec9-85a2-b127655f69bd';   -- rollback: severity='block'
--
-- S-8  CR-012 (A131-06, §6.4, 'RV >= 0.5')
--      EVIDENCE (§6.4, printed p.41-42): "Rücklaufverhältnisse $R V<0,5$ sollten vermieden werden,
--      weil sie hohe Trockensubstanzgehalte im Rücklaufschlamm erfordern, die nur bei einem niedrigen
--      Schlammindex und einer langen Eindickzeit erzielbar sind."
-- ☐ RATIFIED  update public.compliance_requirements set severity='warn'
--                where id = '55ea373f-d5de-4258-9328-6f28f4ba7e64';   -- rollback: severity='block'
--
-- S-9  CR-014 (A131-07, §7.2, 't_T >= 2')
--      EVIDENCE (§7.2, printed p.49-50): "Eine Taktdauer von weniger als 2 Stunden ist nicht zu
--      empfehlen."
-- ☐ RATIFIED  update public.compliance_requirements set severity='warn'
--                where id = 'a6a9bf2c-091a-464b-9b66-696775795783';   -- rollback: severity='block'
--
-- S-10 CR-015 (A131-08, §7.4, 'S_KS_AB >= 1.5')
--      EVIDENCE (§7.4, printed p.52-53): "Die Säurekapazität sollte den Wert von
--      $S_{K S, A B}=1,5 \mathrm{mmol} / \mathrm{l}$ nicht unterschreiten, gegebenenfalls müssen
--      basische Neutralisationsmittel dosiert werden."
--      NOTE: "sollte ... nicht unterschreiten, gegebenenfalls MÜSSEN ... dosiert werden" — the duty to
--      dose is hard once the value is undercut. A defensible alternative to warn is: keep block but set
--      requires_attestation=true so the engineer attests that neutralisation is provided.
-- ☐ RATIFIED  update public.compliance_requirements set severity='warn'
--                where id = '235f57e4-5ab2-4b7c-84ec-420245ba2adb';   -- rollback: severity='block'


-- ----------------------------------------------------------------------------
-- S-11 CR-016 (A131-06, §B.4, block, 'Q_SR >= (Q_RS*TS_RS - Q_K*TS_BB)/TS_BS') — block gate anchored
--      on an ANNEX the guideline itself labels informative.
--      EVIDENCE: the annex heading is "Anhang B (informativ) Auslegung der Schlammräumung"; inside it
--      §B.4 does say "Das Räumsystem muss so ausgelegt werden, dass der geräumte Räumvolumenstrom
--      $Q_{\mathrm{SR}}$ die Feststoffbilanz nach GL. (B.9) erfüllt." — a "muss" inside an informative
--      annex. §6.10 (normative) only says the quantities "können über die in Anhang B aufgeführte
--      Feststoffbilanz ermittelt werden".
-- ☐ RATIFIED  update public.compliance_requirements set severity='warn'
--                where id = '63c8d284-447a-48ad-891a-f6f4bb4960c8';   -- rollback: severity='block'
--      The same "informativ" reservation applies to the 11 Anhang-B/C equations (B.1-B.9, C.1-C.2) and
--      to the 20 A131-06 fields that only exist to feed them; they are correctly encoded, but their
--      results are not normative.


-- ----------------------------------------------------------------------------
-- S-12 CR-008 (A131-06, §6.1, 'ISV >= 50 AND ISV <= 200') — BOUNDARY INCLUSIVITY.
--      EVIDENCE (§6.1, printed p.39): "Schlammindex $50 \mathrm{l} / \mathrm{kg}</ S V<200 \mathrm{l} /
--      \mathrm{kg}$," — the transcript's "</ S V<" is OCR damage for "< ISV <" (confirmed by the
--      symbol table "ISV & l/kg & Schlammindex" and by the identical wording in the second transcript
--      DWA-A-131-WD-Fuer-Belebungsexpert.md). Both printed comparisons are STRICT; the gate uses >= / <=,
--      so ISV = 50 and ISV = 200 pass although the guideline excludes them.
-- ☐ RATIFIED  update public.compliance_requirements set condition = 'ISV > 50 AND ISV < 200'
--                where id = '7d4fe2c9-e10a-4db9-b142-1ffeb64f6012';
--                -- rollback: condition = 'ISV >= 50 AND ISV <= 200'
--      (CR-009 'VSV < 600' and CR-011 'TS_BB > 1.0' already use the printed strict form — correct.)


-- ----------------------------------------------------------------------------
-- S-13 CR-011 (A131-06, §6.1, 'TS_BB > 1.0') — UNDER-ENFORCEMENT: only half the printed subject.
--      EVIDENCE (§6.1, printed p.39): "Trockensubstanzgehalt im Zulauf Nachklärbecken
--      $T S_{B B} \mathrm{bzw} . T S_{A B}>1,0 \mathrm{~kg} / \mathrm{m}^{3}$."
--      TS_AB is a separate encoded field (A131-06) and equals TS_BB only outside cascade
--      denitrification ("Mit Ausnahme der Kaskadendenitrifikation ist $T S_{A B}=T S_{B B}$."), i.e.
--      exactly the case where the check matters is the case that is not checked.
-- ☐ RATIFIED  update public.compliance_requirements set condition = 'TS_BB > 1.0 AND TS_AB > 1.0'
--                where id = '5eb0ce47-93a5-461c-a66b-6cc87d6a2cbf';
--                -- rollback: condition = 'TS_BB > 1.0'


-- ----------------------------------------------------------------------------
-- S-14 CR-006 / CR-007 (A131-06, §6.5) — the 'uebergang' enum value silently falls through to the
--      HORIZONTAL limits, and the vertical relief has an unencoded precondition.
--      Current conditions:
--        CR-006  (nklb_durchstroemung == 'vertikal' AND q_SV <= 650) OR (q_SV <= 500)
--        CR-007  (nklb_durchstroemung == 'vertikal' AND q_A  <= 2.0) OR (q_A  <= 1.6)
--      (a) The OR-fallback is correct for 'horizontal', but for 'uebergang' it enforces <=500 / <=1,6,
--          although Tabelle 5 (printed p.43) explicitly permits up to 650 / 2,00 by interpolation:
--          "Verhältnis *) & $\geq 0,33$ & $\geq 0,36$ & $\geq 0,39$ & $\geq 0,42$ & $\geq 0,44$ &
--           $\geq 0,47$ & $\geq 0,5$ | $q_{\mathrm{SV}}\left(\mathrm{l} /\left(\mathrm{m}^{2} \cdot
--           \mathrm{~h}\right)\right. & $\leq 500$ & $\leq 525$ & $\leq 550$ & $\leq 575$ & $\leq 600$ &
--           $\leq 625$ & $\leq 650$" and "Für den Übergangsbereich können Werte aus Tabelle 5 entnommen
--          werden." The gate is therefore conservative-but-wrong for this third enum value; Tabelle 5
--          is not encoded at all (see S-25), so there is nothing to interpolate against.
--      (b) The 650 relief is conditional in print: "Für vorwiegend vertikal durchströmte Nachklärbecken
--          gilt bei Ausbildung eines geschlossenen Flockenfilters oder bei gut flockbarem belebtem
--          Schlamm: q_{\mathrm{sv}} \leq 650 \mathrm{l} /\left(\mathrm{m}^{2} \cdot \mathrm{~h}\right)".
--          The "geschlossener Flockenfilter" precondition has no field, so the relief is granted
--          unconditionally to every vertical tank.
--      (c) CR-006's source_quote is UNDER-QUOTED: it holds only "q_{\mathrm{sv}} \leq 500 ..." although
--          the condition also encodes the 650 branch. (CR-007's quote covers both — correct.)
-- ☐ RATIFIED  (a) encode Tabelle 5 as a lookup (or a ratio field + interpolation) and re-condition the
--                  'uebergang' branch; ☐ (b) add a 'geschlossener_flockenfilter' boolean and gate the
--                  650/2,0 relief on it; ☐ (c) extend CR-006.source_quote to both printed inequalities.


-- ----------------------------------------------------------------------------
-- S-15 CR-002 (A131-03, §5.1.3, 'PF >= 1.5') — correct as the general rule, but §5.1.5 prints an
--      EXCEPTION the gate cannot express.
--      EVIDENCE (§5.1.3, printed p.30-31): "Der Prozessfaktor darf bei der Ermittlung des
--      Bemessungsschlammalters nicht unter 1,5 angesetzt werden." (hard "darf nicht" — block is right)
--      EVIDENCE (§5.1.5, printed p.31-32): "Ergibt sich nach GL. (17) für $V_{\mathrm{D}} /
--      V_{\mathrm{BB}}$ ein negativer Wert, wird $V_{\mathrm{D}} / V_{\mathrm{BB}}=0$ gesetzt und mit
--      GL. (17) der Prozessfaktor berechnet; er kann bis auf $\mathrm{PF}=1,2$ herabgesetzt werden;
--      sonst ist das Beckenvolumen zu vergrößern."
-- ☐ RATIFIED  update public.compliance_requirements
--                set condition = '(V_D_V_BB == 0 AND PF >= 1.2) OR (PF >= 1.5)'
--                where id = '3c1919e9-4b1c-444c-9bb3-e99ed6b6b34d';
--                -- rollback: condition = 'PF >= 1.5'


-- ----------------------------------------------------------------------------
-- S-16 CR-001 (§5.1.1) is homed on A131-02 "Belastungsdaten" while §5.1.1 belongs to A131-03's scope.
--      Not proposed for a re-home: the gate reads field T, which lives on A131-02, so moving it would
--      create a cross-worksheet gate (the defect class S-4/S-5 fix). Recorded as informational only.
--      The gate itself is sound: "Die nachfolgenden Bemessungsvorgaben zur Ermittlung des erforderlichen
--      Schlammalters gelten für einen Temperaturbereich von $T_{\text {Bem }}=8^{\circ} \mathrm{C}$ bis
--      $T_{\text {Bem }}=20^{\circ} \mathrm{C}$." (§5.1.1, printed p.29) — an application limit, and
--      §5.1.5 confirms it ("Über die Bemessung von Anlagen für eine Temperatur von 8 °C und geringer
--      liegen keine Erfahrungen vor."). Block is defensible.
--      Same note for CR-004 (§5.2.4 on A131-03) and CR-005 (§5.2.5 on A131-04): both read fields that
--      live on their own worksheet, so they are field-consistent even though the clause belongs elsewhere.


-- ----------------------------------------------------------------------------
-- S-17 MISSING GATES for printed limits whose field ALREADY EXISTS (no new field needed).
--      None of these is currently enforced anywhere. All are "sollte/empfohlen" except where noted, so
--      the proposal is severity='warn' unless the ruling says otherwise.
--   (a) D_NB <= 60  — §6.1 p.39: "Nachklärbecken mit Längen bzw. Durchmessern bis etwa 60 m ,"
--                     (application limit of the whole §6 design method — arguably block)
--   (b) G >= 40 AND G <= 80 — §6.8 p.46-47: "bei Mischwasserzulauf zwischen $40 \mathrm{~s}^{-1}$ und
--                     $80 \mathrm{~s}^{-1}$ betragen."
--   (c) F_D <= 1    — §6.8 p.46-47: "den Wert $F_{\mathrm{D}}=1$ annimmt." + "Für die Bemessung wird
--                     empfohlen, die densimetrische Froudezahl tendenziell geringfügig kleiner als 1
--                     anzusetzen."
--   (d) h >= 0.30 AND h <= 0.60 — §6.8: "In der Praxis haben sich Einlaufgestaltungen mit 30 cm bis
--                     60 cm Schlitzhöhe und Eintrittsgeschwindigkeiten $<7 \mathrm{~cm} / \mathrm{s}$
--                     bewährt."
--   (e) t_E <= 2.0  — §6.2 p.39-40: "Daher wird empfohlen, die Eindickzeit im Rahmen der Bemessung auf
--                     $t_{\mathrm{E}}=2,0 \mathrm{~h}$ festzusetzen." (+ "Bei Anlagen ohne gezielte
--                     Denitrifikation sollte die Eindickzeit kürzer als 2 h gewählt werden.")
--   (f) f_C >= 1 AND f_N >= 1 — §7.3 p.50-52, Tabelle 7 (f_C 1,1-1,3; f_N 1,5-2,4)
--   (g) f_SR: 1,5 (Rundbecken) / <=1,0 (Rechteck) and v_SR / h_SR within Tab.6 / Tab.B.1 ranges
--   (h) Q_SR >= Q_SR_min is covered by CR-016; x_i in (0,1] has no gate.
-- ☐ RATIFIED  add the gates above (one INSERT per item; conditions as written).


-- ----------------------------------------------------------------------------
-- S-18 Gl.20 (id 4820dcf8-3261-4cb8-ba03-400ce712ffe6, output X_CSB_BM_impl) — SELF-REFERENTIAL
--      PRODUCER. formula = 'X_CSB_BM_impl = C_CSB_abb_ZB * Y - X_CSB_BM_impl * t_TS * b * F_T'.
--      The printed equation is an implicit balance, not a computation rule; §5.2.2 immediately resolves
--      it ("Unter Einbeziehung externer C-Dosierung und Auflösung nach $\mathrm{X}_{\text {CSB,BM }}$
--      gilt:" -> Gl.21, which IS encoded as the producer of X_CSB_BM). As encoded, Gl.20 cannot be
--      evaluated by any engine: its own output appears on the right-hand side.
-- ☐ RATIFIED  mark Gl.20 informational (not a producer) and set field X_CSB_BM_impl active=false,
--                or keep the field read-only and drive it from Gl.21.
--                -- rollback: restore active=true / the producer flag


-- ----------------------------------------------------------------------------
-- S-19 Gl.38 / Gl.39 — MUTUALLY INVERSE PRODUCER PAIR (unsolvable cycle).
--      Gl.38: t_TS      = M_TS_BB / UeS_d        (id 073421eb-3763-4f8f-bb50-3e6cd20d9164)
--      Gl.39: M_TS_BB   = t_TS * UeS_d           (id fb8c40fb-5639-4297-a4b4-24c5c7726ef6)
--      Neither variable has an independent producer, so the pair has no entry point. In the guideline
--      the entry point is §5.4 read together with §5.1: the design sludge age t_TS,Bem is what is
--      inserted ("M_{\mathrm{TS}, \mathrm{BB}} & =t_{\mathrm{TS}} \cdot \ddot{U} S_{\mathrm{d}}").
-- ☐ RATIFIED  bind t_TS := t_TS_Bem (or make t_TS an input carried from A131-03) and keep only Gl.39
--                as the producer; demote Gl.38 to the definitional identity it is.


-- ----------------------------------------------------------------------------
-- S-20 Gl.41 / Gl.B.1 / Gl.B.2 — PRODUCER CYCLE mirroring the guideline's own iteration.
--      Gl.41  TS_BB = RV*TS_RS/(1+RV)   ;  Gl.B.2  TS_RS = (Q_SR*TS_BS + Q_K*TS_BB)/Q_RS
--      TS_BB depends on TS_RS which depends on TS_BB. The guideline is explicit that the whole design
--      is iterative (§3.4: "Die Bemessung von Belebungsanlagen erfolgt iterativ, weil viele Faktoren
--      sich gegenseitig beeinflussen, siehe Bild 3."), and §6.3 offers the non-circular entry:
--      "Schildräumer $T S_{\text {RS }} \approx 0,7$ bis $0,8 \cdot T S_{\text {BS }}$" /
--      "Saugräumer $T S_{\text {RS }} \approx 0,5$ bis $0,7 \cdot T S_{\text {BS }}$" — an SR-2 range,
--      i.e. an explicit engineer selection, not an auto-pick.
-- ☐ RATIFIED  make TS_RS an SR-2 selection field (factor 0,5 / 0,7 / 0,8 chosen by Räumertyp) feeding
--                Gl.41, and demote Gl.B.2 to the verification identity of Anhang B.
--      The same cycle note applies to V_D_V_BB (Gl.17 produces it, Gl.15/16/30-33 consume it) and to
--      x_iter (Gl.34) — but those two ARE the guideline's declared iteration loops (Bild 5), so they
--      are correct as encoded and need no ruling.


-- ----------------------------------------------------------------------------
-- S-21 UNIT MISMATCH between fields feeding one equation — field v_E (A131-06).
--      Prod has v_E with unit 'm/s'. The guideline's own symbol table (§2, printed p.9-16) prints:
--        "$V_{\mathrm{E}}$ & $\mathrm{m} / \mathrm{h}$ & Eintrittsgeschwindigkeit in das
--         Einlaufbauwerk des Nachklärbeckens"
--      and Gl.49 computes it from Q_M (field unit m3/h, symbol table "Q & $\mathrm{m}^{3} / \mathrm{h}$")
--      divided by A_ZD (m2), which yields m/h, not m/s. Yet the printed Gl.49 carries "(\mathrm{~m} /
--      \mathrm{s})" and Gl.48 gives P_E in "(\mathrm{Nm} / \mathrm{s})", which requires Q_M in m3/s.
--      CROSS-CHECK: the second transcript (DWA-A-131-WD-Fuer-Belebungsexpert.md, line 372) carries the
--      identical row "$V_{\mathrm{E}}$ & $\mathrm{m} / \mathrm{h}$ & Eintrittsgeschwindigkeit in das
--      Einlaufbauwerk des Nachklärbeckens", so "m/h" is the printed unit and not an OCR slip. (The
--      capital V is an OCR artifact: mathpix renders the lowercase velocity symbols v_E, v_Rück, v_SR
--      as V in both transcripts; the units are unaffected.)
--      So the guideline itself is unit-loose here, and the encoding has silently picked one side (m/s)
--      that contradicts the standard's own symbol table. Consequence: P_E, and therefore G (Gl.47) and
--      the 40-80 s^-1 check, are out by a factor of 3600 unless a conversion is applied somewhere.
--      NOT auto-corrected: SR-1 gives two conflicting printed sources, so this is a ruling, not a fix.
-- ☐ RATIFIED  decide the convention (recommended: keep v_E in m/s per Gl.49's own unit tag and insert
--                an explicit /3600 on Q_M inside Gl.48/Gl.49) and record it; then align field v_E's unit
--                and the Gl.48/49 formulas together.
--      (Cross-check performed on every other multi-input equation: units consistent. Gl.42
--       q_SV l/(m2 h) / (TS_AB kg/m3 * ISV l/kg) -> m/h OK; Gl.55 t_R = V_BB m3 / Q_T_2h_max m3/h -> h OK;
--       Gl.B.3 pi*D_NB m / v_SR m/h -> h OK; Gl.46 u m/s, g m/s2, h m -> dimensionless OK.)


-- ----------------------------------------------------------------------------
-- S-22 Field h_1 (A131-06) description says ">=0,50 m", but §6.7 prints a FIXED depth, not a minimum:
--      "Grundsätzlich beginnt die Klarwasserzone auf Höhe des Wasserspiegels und reicht 50 cm nach
--      unten (Fälle a), b) und d))." — with one alternative, not a lower bound: "Bei eingehängten Rinnen
--      (beidseitig oder einseitig von außen angeströmt) reicht die Klarwasserzone vom Wasserspiegel bis
--      20 cm unterhalb der Rinnenunterkante (Bild 9c)." The separate 20 cm figure in the description
--      ("bei getauchten Rohren >=20 cm ueber Eintrittsoeffnung") is a DIFFERENT rule from a different
--      sentence ("muss der Wasserspiegel bei getauchten Rohren mindestens 20 cm über den
--      Eintrittsöffnungen liegen") and does not define h_1.
-- ☐ RATIFIED  rewrite h_1.description to the two printed cases (50 cm standard; Wasserspiegel bis 20 cm
--                unter Rinnenunterkante bei eingehängten Rinnen) and drop the ">=" framing; ideally make
--                h_1 an SR-2 selection between the two printed constructions.


-- ----------------------------------------------------------------------------
-- S-23 is_required REVIEW (51 fields are is_required=true). Candidates for false, because the guideline
--      makes them conditional on a process choice the user has already made on A131-01:
--   (a) C_P_ZB, C_P_AN, X_P_Faell (A131-02/05) — meaningless when p_elim_verfahren = 'keine'.
--   (b) PF, f_N, t_TS_aerob_Bem, t_TS_Bem (A131-03) — §5.1.2 (printed p.29-30) designs plants WITHOUT
--       nitrification purely on sludge age: "Belebungsanlagen ohne Nitrifikation werden für Schlammalter
--       von 4 ( $B_{\mathrm{d}, \mathrm{CSB}, \mathrm{Z}}>12.000 \mathrm{~kg} / \mathrm{d}$ ) bis 5
--       ( $B_{\mathrm{d}, \text { CSB }, \mathrm{Z}}<2.400 \mathrm{~kg} / \mathrm{d}$ ) Tagen bemessen." —
--       no PF, no aerobic sludge age. With verfahren_n_elim='keine' these four are not applicable.
--   (c) S_NO3_D, OV_C_D, x_iter, V_D_V_BB (A131-03/04) — the denitrification chain; not applicable when
--       verfahren_n_elim = 'keine'.
--   (d) f_CSB, f_S, f_A, f_B (A131-02) — the guideline supplies recommended defaults ("Wenn keine
--       Messwerte vorliegen, wird ... empfohlen, mit $f_{\mathrm{s}}=0,05$ zu rechnen." etc.), so these
--       are SR-2 range selections with a printed default rather than mandatory measurements.
--   (e) S_KS_ZB, S_NH4_ZB (A131-08) — required only where the Säurekapazität proof is run (§7.4 is a
--       "zu prüfen" duty, §5.1.5: "Es ist in jedem Fall zu prüfen, ob die Säurekapazität ausreicht").
--       Keep required.
-- ☐ RATIFIED  set is_required=false for the fields in (a)-(c) and drive requiredness from the A131-01
--                process selections; ☐ turn (d) into SR-2 selection widgets carrying the printed default.
--                -- rollback: set is_required=true for the same ids


-- ----------------------------------------------------------------------------
-- S-24 SCOPE GAP — two steps of the guideline's own Bemessungsablauf (§3.4, printed p.22-24) have NO
--      encoded fields, so they cannot be executed in the app:
--   (a) Step 15 "Gegebenenfalls Bemessung eines anaeroben Mischbeckens für biologische
--       Phosphorelimination." §5.3.1 (printed p.37-38) prints the sizing rule: "Anaerobe Mischbecken zur
--       biologischen Phosphorelimination sind für Mindestkontaktzeiten von 0,5 bis 0,75 Stunden, bezogen
--       auf den maximalen Trockenwetterzufluss und den Rücklaufschlammstrom
--       $\left(Q_{\mathrm{T}, 2 \mathrm{~h}, \max }+Q_{\mathrm{RS}}\right)$ zu bemessen."
--       No V_BioP field exists (the symbol IS in §2: "$V_{\text {BioP }}$ & $\mathrm{m}^{3}$ & Volumen
--       eines anaeroben Mischbeckens zur biologischen Phosphorelimination").
--   (b) Step 19 "Gegebenenfalls Bemessung eines aeroben Selektors ...". §7.5 (printed p.53-54) prints:
--       "Als Richtwert für das Volumen eines aeroben Selektors wird eine Raumbelastung von
--       $B_{\mathrm{R}, \mathrm{CSB}}=20 \mathrm{~kg} \mathrm{CSB} /\left(\mathrm{m}^{3} \cdot
--       \mathrm{~d}\right)$ empfohlen." and "Die Sauerstoffzufuhr sollte für $\alpha OC=4 \mathrm{~kg}
--       \mathrm{O}_{2} / \mathrm{m}^{3}$ Becken und Tag ausgelegt werden."
--       No V_Sel, B_R_CSB or alphaOC field exists (all three ARE in the §2 symbol table).
--      A131-07 is titled "Bemessung der Belebung" and covers §7.1-§7.4 only; §7.5 has no section.
-- ☐ RATIFIED  add a §7.5 section on A131-07 with V_Sel / B_R_CSB / alphaOC, and a §5.3.1 anaerobic-tank
--                block on A131-05 with V_BioP + contact time (0,5-0,75 h, SR-2 selection).


-- ----------------------------------------------------------------------------
-- S-25 PRINTED LOOKUP TABLES NOT ENCODED — per the owner ruling of 2026-08-01 ("fixed options =>
--      selection widget, never free-text") these are candidates for selection fields. Today the user
--      types a bare number with no in-app guidance:
--        Tabelle 2 (printed p.28)  Abscheideleistung der Vorklärung (C_CSB 30/35/40 %, X_CSB 45/55/60 %,
--                                  X_TS 50/60/65 %, C_KN 10 %, C_P 10 %) by retention time
--        Tabelle 3 (printed p.31)  PF matrix (S_NH4,ÜW x f_N -> PF 1,5 … 2,8)
--        Tabelle 4 (printed p.40)  ISV Richtwerte (100-150 / 120-180 / 75-120 / 100-150)
--        Tabelle 5 (printed p.43)  Übergangsbereich q_SV / q_A / RV (see S-14)
--        Tabelle 6 (printed p.48) + Tabelle B.1 (printed p.63)  Räumer-Richtwerte
--        Tabelle 7 (printed p.52)  Stoßfaktoren f_C / f_N by sludge age
--        Tabelle 8 (printed p.53)  pH im Belebungsbecken (no field at all)
-- ☐ RATIFIED  encode Tab.3, Tab.4, Tab.5, Tab.7 and Tab.B.1 as enum/selection sources for PF, ISV,
--                q_SV/q_A/RV, f_C/f_N and f_SR/v_SR/h_SR respectively.


-- ----------------------------------------------------------------------------
-- S-26 Gl. (11) — the CSB conservation identity is printed and numbered but has no equations row
--      (the encoded set jumps 10 -> 12). EVIDENCE (§4.2, printed p.25-27):
--      "C_{\mathrm{CSB}, \mathrm{ZB}}=S_{\mathrm{CSB}, \text { inert,AN }}+X_{\mathrm{CSB},
--       \mathrm{U} \text { US }}+O V_{\mathrm{C}}(\mathrm{mg} / \mathrm{l}) \tag{11}"
--      It is a balance identity (OV_C is produced by Gl.27), so nothing is mis-computed; but a printed
--      numbered equation is missing from the record.
-- ☐ RATIFIED  add Gl.11 as a non-producing verification identity (or record the omission as accepted).
-- ============================================================================
