-- ============================================================================
-- md-verification pack — DIN-18130-1 (DIN 18130-1:1998-05, Baugrund — Untersuchung von Bodenproben —
--   Bestimmung des Wasserdurchlässigkeitsbeiwerts — Teil 1: Laborversuche; German)
-- Generated: 2026-09-07 — md-verified pass (owner ruling 2026-09-05: the markdown transcript is the
--   verification source; PDF only where no markdown exists). Grade: VC (SR-3), labelled on every row.
--   Written by the orchestrator, not a subagent: only the equation surface was open.
--
-- SCOPE. The 2026-08-01 PDF pass already set 52 of 54 fields to verified_against_standard WITH a
--   verbatim quote, and exempted freigabe_sachverstaendiger (app workflow). One field remains open —
--   k_f (DIN-18130-1-05) — and it stays open on purpose: the standard prints k, k_T and k_10 and never
--   the symbol k_f, which is DWA-A-138-1's name for the transferred k_10. Grounding that alias is a
--   ruling, not an extraction; it is staged in din-18130-1-STAGED-rulings.sql. So this pack contains
--   the EQUATION QUOTE BACKFILL only: all 8 equations already carry verification_status =
--   'verified_against_standard' from the earlier pass but no verification_quote. Status is NOT changed;
--   only verification_quote/verification_note are written, under the guard `verification_quote is null`.
--
-- SOURCES. Quotes are taken verbatim from the mathpix transcript
--   C:\Users\Ekowai\Desktop\Guidelines\DWA DIN Scribd\DIN-18130-1\DIN-18130-1.md (clean LaTeX, but with
--   NO page markers). Printed pages come from the second transcript in the same folder,
--   DIN-18130-1_OCR.md, which carries explicit "## [PDF-Seite N | gedruckte Seite N]" markers and states
--   an image-verified offset of 0 (PDF page N = printed page N). Each clause was located in the OCR
--   transcript between two page markers to fix its printed page; the quote itself always comes from the
--   mathpix transcript because the OCR merges the standard's two columns line by line and is therefore
--   unusable for verbatim text. Cross-check: §3.2 sits on printed p.2 in the OCR transcript and the
--   mathpix image index next to Gl. (1) is -02, so the mathpix index equals the printed page.
-- Rollback: scripts/verification/rollback-din-18130-1-md-verification-pack.sql
-- ============================================================================

-- ---------- Equations — quote backfill (status unchanged) ----------

-- Gl. (1) Durchfluss Q — §3.1, printed p.2
update public.equations set verification_quote='3.1 Durchfluß $Q$ — Quotient aus dem Wasservolumen $V_{\mathrm{w}}$, das eine bestimmte Querschnittsfläche $A$ (Feststoffe und Poren) eines Probekörpers durchfließt und der dazu benötigten Zeit $t$ (siehe Bild 1): $Q=\frac{V_{\mathrm{w}}}{t} \tag{1}$ — printed p.2', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-07 (§3.1, printed p.2) [VC]' where id='b82db8f3-e49b-4318-b843-031dfd4d86a4' and verification_quote is null;

-- Gl. (2) Filtergeschwindigkeit v — §3.2, printed p.2
update public.equations set verification_quote='3.2 Filtergeschwindigkeit $\boldsymbol{v}$ — Quotient aus Durchfluß Q und zugehöriger Querschnittsfläche $A$ senkrecht zur Fließrichtung: $v=\frac{Q}{A} \tag{2}$ — printed p.2', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-07 (§3.2, printed p.2) [VC]' where id='94288a73-ebc1-4d02-8fbb-0bc2c6f35899' and verification_quote is null;

-- Gl. (3) Hydraulisches Gefälle i — §3.5, printed p.3
update public.equations set verification_quote='3.5 Hydraulisches Gefälle $i$ — Quotient aus hydraulischem Höhenunterschied $h$ und der durchströmten Länge $l$ (Abstand der Ansatzpunkte der Standrohre in Fließrichtung) des Probekörpers: $i=\frac{h}{l} \tag{3}$ — printed p.3', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-07 (§3.5, printed p.3) [VC]' where id='6783ca37-3606-4f9a-8709-1f887f9f48f1' and verification_quote is null;

-- Gl. (4) Durchlässigkeitsbeiwert k — §3.6, printed p.3
update public.equations set verification_quote='3.6 Durchlässigkeitsbeiwert $\boldsymbol{k}$ — Quotient aus Filtergeschwindigkeit $v$ und dem hydraulischen Gefälle $i$ bei laminarer Durchströmung des wassergesättigten Bodens: $k=\frac{v}{i}=\text { const. } \tag{4}$ — printed p.3', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-07 (§3.6, printed p.3) [VC]' where id='1a99d7dd-f20a-4b40-a65c-578554fb6057' and verification_quote is null;

-- Gl. (6) Temperaturkorrektur k_10 — §5.7, printed p.5 (Poiseuille; α aus Tabelle 2)
update public.equations set verification_quote='Der im Versuch festgestellte $k$-Wert wird auf eine Vergleichs-Temperatur von $10^{\circ} \mathrm{C}$ umgerechnet. Nach Poiseuille ist: $k_{10}=\frac{1,359}{1+0,0337 \cdot T+0,00022 \cdot T^{2}} k_{\mathrm{T}}=\alpha \cdot k_{\mathrm{T}} \tag{6}$ | Dabei ist: $T$ die Wassertemperatur beim Versuch, in ${ }^{\circ} \mathrm{C}$; $k_{\mathrm{T}}$ der ermittelte Durchlässigkeitsbeiwert bei der Temperatur $T$, in $\mathrm{m} / \mathrm{s}$; $\alpha$ der Korrekturbeiwert (siehe Tabelle 2). — printed p.5', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-07 (§5.7, printed p.5) [VC]' where id='21c8ff7a-28c2-46a2-bde3-7f5297d90977' and verification_quote is null;

-- Gl. (7) Höhenunterschied aus Wichteunterschied — §6.1.1, printed p.5
update public.equations set verification_quote='Sehr kleine Unterschiede der Standrohrspiegelhöhen können z. B. mittels Differenzdruckaufnehmer gemessen oder unter Ausnutzung des Wichteunterschiedes zwischen Wasser und Flüssigkeit geringerer Dichte in einem Differenzdruckerzeuger eingestellt werden (siehe Bild 3, Vorrichtung A): $h=\frac{h_{0}\left(\gamma_{\mathrm{w}}-\gamma_{\mathrm{org}}\right)}{\gamma_{\mathrm{w}}} \tag{7}$ — printed p.5', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-07 (§6.1.1, printed p.5) [VC]' where id='92004c30-d370-4773-8c87-65346ec3abe1' and verification_quote is null;

-- Gl. (8) Auswertung, konstantes Gefälle — §8.1, printed p.16
update public.equations set verification_quote='8.1 Versuch mit konstantem hydraulischen Gefälle — Der Durchlässigkeitsbeiwert ergibt sich aus den Gleichungen (1) bis (4) zu $k=\frac{Q \cdot l}{A \cdot h} \tag{8}$ | Dabei ist: $Q$ der Durchfluß, in $\mathrm{m}^{3} / \mathrm{s}$; $l$ die durchströmte Länge, in m; A die Querschnittsfläche des Probekörpers, in $\mathrm{m}^{2}$; $h$ der hydraulische Höhenunterschied, in m . — printed p.16', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-07 (§8.1, printed p.16) [VC]' where id='25ab35d0-8eab-4a21-99ee-ea9aad5193df' and verification_quote is null;

-- Gl. (9) Auswertung, veränderliches Gefälle — §8.2, printed p.16
update public.equations set verification_quote='8.2 Versuch mit veränderlichem hydraulischen Gefälle — Der Durchlässigkeitsbeiwert errechnet sich bei Versuchen nach Bild 5 und Bild 10 zu $k=\frac{a \cdot l_{0}}{A \cdot t} \ln \frac{h_{1}}{h_{2}} \tag{9}$ | Dabei ist: a die Querschnittsfläche des Standrohrs, in $\mathrm{m}^{2}$; $l_{0}$ die Höhe des Probekörpers, in m ; $A$ die Querschnittsfläche des Probekörpers, in $\mathrm{m}^{2}$; $t$ die Meßzeitspanne, in s; $h_{1}$ die auf den Unterwasserspiegel bezogene Wasserhöhe im Standrohr bei Versuchsbeginn, in m; $h_{2}$ die auf den Unterwasserspiegel bezogene Wasserhöhe im Standrohr bei Versuchsende, in m . — printed p.16', verification_note=coalesce(verification_note,'')||' | md-quote 2026-09-07 (§8.2, printed p.16) [VC]' where id='a464fee1-e159-4228-8081-cca885eefe37' and verification_quote is null;
