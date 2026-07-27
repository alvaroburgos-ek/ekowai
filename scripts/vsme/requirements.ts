/**
 * requirements.ts
 *
 * Curated, source-cited VSME compliance_requirements.
 *
 * WHY this file exists
 * --------------------
 * The VSME Standard (EFRAG, 2026-02-01) prescribes per-module which disclosures
 * are MANDATORY ("the undertaking shall disclose …" with no applicability
 * qualifier), CONDITIONAL ("… if/where …", or any Comprehensive-Module
 * disclosure — see para 45) or VOLUNTARY ("the undertaking may disclose …").
 * The XBRL taxonomy that build-workbook.ts parses does NOT carry that
 * obligation level, so it must be encoded by hand here, with every row tied to
 * the exact clause of `VSME Standard.pdf` it derives from.
 *
 * Every `clause` value below is sourced from the normative disclosure text of
 * the VSME Standard and cross-checked against the taxonomy reference linkbase
 * (vsme-reference.xml). Nothing here is fabricated.
 *
 * HOW these rows become gates (the real mechanics — verified against code)
 * -----------------------------------------------------------------------
 *   • The Pass3c importer (_pass3c-db.ts §6) turns each row into a
 *     compliance_requirements record. When `evaluation_expression` is empty it
 *     synthesises the condition from `required_field_symbols` as
 *     `<sym> IS NOT NULL [AND <sym2> IS NOT NULL …]`. We instead set
 *     `evaluation_expression` explicitly so the emitted condition is exactly
 *     what we reviewed.
 *   • `severity` maps verbatim: the importer normalises `'warn'` → advisory and
 *     ANYTHING ELSE (incl. 'block'/empty) → 'block'. The approval gate
 *     (src/lib/actions/approval-gate.ts) and the worksheet UI key on exactly
 *     `'warn'` vs `'block'`. So: hard gate ⇒ severity 'block'; advisory ⇒ 'warn'.
 *   • The condition is evaluated by src/lib/compliance/evaluate.ts. A
 *     `<sym> IS NOT NULL` rule resolves to `fail` (→ blocks engineer approval
 *     for a 'block' row) when that symbol has no saved value; to `pass` when it
 *     does. Only definite `fail` on a 'block' row blocks approval — `pending`,
 *     `manual` and 'warn' rows never block.
 *
 * WORKSHEET-LOCALITY (important constraint)
 * -----------------------------------------
 * Each requirement is hosted on the ONE worksheet where ALL of its gated field
 * symbols live (buildComplianceRows derives this from `FieldsRow.origin_worksheet`,
 * NOT from the `module` tag above — a row's `module` is documentation only).
 * Previously every row fell back to `phase` (all VSME worksheets are phase 1)
 * and collapsed onto the first phase-1 worksheet, VSME-B01.000 — silently
 * de-scoping most gates from the worksheet an engineer actually fills in. That
 * is fixed: `worksheet_code` is now emitted explicitly per row (see the Pass3c
 * `worksheet_code` column), and only a genuinely cross-worksheet requirement
 * (none currently exist in VSME_REQUIREMENTS) falls back to legacy phase
 * hosting — logged loudly as a STOP-REPORT rather than guessed. The gate
 * evaluator still resolves each symbol either from the host worksheet's own
 * fields OR, for non-local symbols, from the project-wide CONFLICT-FREE
 * fallback (makeGateLookup / buildFallbackValues in approval-gate.ts); that
 * fallback is what makes `<symbol> IS NOT NULL` still correct even for a
 * symbol not native to the host worksheet. What is NOT expressible is any rule
 * that needs to compare two DIFFERENT fields whose values legitimately differ
 * across worksheet instances, or any "at least one of N" / cross-worksheet
 * numeric tolerance — those are listed in NOT_ENCODABLE below rather than
 * approximated.
 *
 * CONSERVATISM
 * ------------
 * Gates ENFORCE in production. Only disclosures the Standard makes
 * UNCONDITIONALLY mandatory AND that are always answerable (so a blank means a
 * real omission, not a legitimate "not applicable") are `block`. Everything
 * that is conditional, count-split (where a blank can mean "zero, not yet
 * typed"), or part of the applicability-gated Comprehensive Module is `warn`.
 */

import type { ComplianceRow } from './build-workbook';

/** Internal authoring shape — compiled to ComplianceRow by buildComplianceRows(). */
type Req = {
  code: string;
  /** Module the disclosure belongs to (documentation only — the importer
   *  attaches by phase, not by this tag; see header). */
  module: string;
  titleDe: string;
  titleEn: string;
  /** The gate condition in the evaluate.ts grammar (worksheet-local symbols /
   *  project-wide fallback). Existence rules use `<sym> IS NOT NULL`. */
  condition: string;
  /** Symbols the condition references (for the field_presence importer path &
   *  documentation). */
  fields: string;
  severity: 'block' | 'warn';
  clause: string;
  description: string;
  suggestion: string;
};

/**
 * BLOCK — unconditional Basic-Module "shall disclose" datapoints that are
 * always answerable (a blank is a genuine omission). These hard-gate engineer
 * approval until entered.
 */
const BLOCK_REQS: Req[] = [
  {
    code: 'VSME-CR-B01-01',
    module: 'B1',
    titleDe: 'B1 – Gewähltes Modul (Option A/B) angeben',
    titleEn: 'B1 – Module option selected (Basic only / Basic + Comprehensive)',
    condition: 'BasisForPreparation IS NOT NULL',
    fields: 'BasisForPreparation',
    severity: 'block',
    clause: 'VSME B1 para 24(a)',
    description:
      'Para 24(a): „The undertaking shall disclose which of the following options it has '
      + 'selected: OPTION A: Basic Module (only); or OPTION B: Basic Module and Comprehensive '
      + 'Module.“ Unbedingte Pflichtangabe (EFRAG-Template: „MISSING VALUE“ bis befüllt).',
    suggestion: 'Wähle in B1 die Modul-Option (A = nur Basic, B = Basic + Comprehensive).',
  },
  {
    code: 'VSME-CR-B01-02',
    module: 'B1',
    titleDe: 'B1 – Berichtsgrundlage (Einzel- oder Konzernbasis) angeben',
    titleEn: 'B1 – Basis of preparation (individual vs consolidated) stated',
    condition: 'BasisForReporting IS NOT NULL',
    fields: 'BasisForReporting',
    severity: 'block',
    clause: 'VSME B1 para 24(c)',
    description:
      'Para 24(c): „… whether the sustainability report has been prepared on an individual '
      + 'basis … or on a consolidated basis …“ Unbedingte Pflichtangabe (EFRAG-Template: '
      + '„MISSING VALUE“ bis befüllt).',
    suggestion: 'Gib an, ob der Bericht auf Einzel- oder Konzernbasis erstellt wurde.',
  },
  {
    code: 'VSME-CR-B03-01',
    module: 'B3',
    titleDe: 'B3 – Gesamtenergieverbrauch angeben',
    titleEn: 'B3 – Total energy consumption disclosed',
    condition: 'TotalEnergyConsumption IS NOT NULL',
    fields: 'TotalEnergyConsumption',
    severity: 'block',
    clause: 'VSME B3 para 29',
    description:
      'Para 29: „The undertaking shall disclose its total energy consumption in MWh …“ '
      + 'Die Gesamtangabe ist unbedingt (nur die tabellarische Aufschlüsselung ist „if it can '
      + 'obtain …“-bedingt).',
    suggestion: 'Trage den Gesamtenergieverbrauch (MWh) ein.',
  },
  {
    code: 'VSME-CR-B03-02',
    module: 'B3',
    titleDe: 'B3 – Scope-1-THG-Emissionen angeben',
    titleEn: 'B3 – Scope 1 GHG emissions disclosed',
    condition: 'GrossScope1GreenhouseGasEmissions IS NOT NULL',
    fields: 'GrossScope1GreenhouseGasEmissions',
    severity: 'block',
    clause: 'VSME B3 para 30(a)',
    description:
      'Para 30(a): „… shall disclose its estimated gross greenhouse gas (GHG) emissions … '
      + 'including: (a) the Scope 1 GHG emissions in tCO2eq …“ Unbedingte Pflichtangabe.',
    suggestion: 'Trage die Scope-1-THG-Emissionen (tCO2eq) ein.',
  },
  {
    code: 'VSME-CR-B03-03',
    module: 'B3',
    titleDe: 'B3 – Standortbezogene Scope-2-THG-Emissionen angeben',
    titleEn: 'B3 – Location-based Scope 2 GHG emissions disclosed',
    condition: 'GrossLocationBasedScope2GreenhouseGasEmissions IS NOT NULL',
    fields: 'GrossLocationBasedScope2GreenhouseGasEmissions',
    severity: 'block',
    clause: 'VSME B3 para 30(b)',
    description:
      'Para 30(b): „… (b) the location-based Scope 2 emissions in tCO2eq …“ '
      + 'Unbedingte Pflichtangabe (standortbezogene Scope-2-Emissionen).',
    suggestion: 'Trage die standortbezogenen Scope-2-THG-Emissionen (tCO2eq) ein.',
  },
  {
    code: 'VSME-CR-B06-01',
    module: 'B6',
    titleDe: 'B6 – Gesamtwasserentnahme angeben',
    titleEn: 'B6 – Total water withdrawal disclosed',
    condition: 'TotalAmountOfWaterWithdrawnFromAllSites IS NOT NULL',
    fields: 'TotalAmountOfWaterWithdrawnFromAllSites',
    severity: 'block',
    clause: 'VSME B6 para 35',
    description:
      'Para 35: „The undertaking shall disclose its total water withdrawal …“ '
      + 'Unbedingte Pflichtangabe (die Aufschlüsselung nach Wasserstress-Gebieten folgt '
      + 'als separate Pflichtangabe im selben Satz).',
    suggestion: 'Trage die Gesamtwasserentnahme aller Standorte ein.',
  },
  {
    code: 'VSME-CR-B07-01',
    module: 'B7',
    titleDe: 'B7 – Anwendung von Kreislaufwirtschaftsprinzipien angeben',
    titleEn: 'B7 – Whether circular economy principles are applied disclosed',
    condition: 'UndertakingAppliesCircularEconomyPrinciples IS NOT NULL',
    fields: 'UndertakingAppliesCircularEconomyPrinciples',
    severity: 'block',
    clause: 'VSME B7 para 37',
    description:
      'Para 37: „The undertaking shall disclose whether it applies circular economy '
      + 'principles …“ Die Ja/Nein-Angabe ist unbedingt (das „… and, if so, how …“ ist '
      + 'die bedingte Folgeangabe).',
    suggestion: 'Gib an, ob Kreislaufwirtschaftsprinzipien angewendet werden (Ja/Nein).',
  },
  {
    code: 'VSME-CR-B09-01',
    module: 'B9',
    titleDe: 'B9 – Anzahl meldepflichtiger Arbeitsunfälle angeben',
    titleEn: 'B9 – Number of recordable work-related accidents disclosed',
    condition: 'NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod IS NOT NULL',
    fields: 'NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod',
    severity: 'block',
    clause: 'VSME B9 para 41(a)',
    description:
      'Para 41: „The undertaking shall disclose the following information regarding its '
      + 'employees: (a) the number and rate of recordable work-related accidents …“ '
      + 'Unbedingte Pflichtangabe (auch der Wert 0 ist einzutragen).',
    suggestion: 'Trage die Anzahl der meldepflichtigen Arbeitsunfälle ein (0, falls keine).',
  },
  {
    code: 'VSME-CR-B09-02',
    module: 'B9',
    titleDe: 'B9 – Anzahl arbeitsbedingter Todesfälle angeben',
    titleEn: 'B9 – Number of work-related fatalities disclosed',
    condition: 'NumberOfFatalitiesAsAResultOfWorkRelatedInjuriesAndWorkRelatedIllHealth IS NOT NULL',
    fields: 'NumberOfFatalitiesAsAResultOfWorkRelatedInjuriesAndWorkRelatedIllHealth',
    severity: 'block',
    clause: 'VSME B9 para 41(b)',
    description:
      'Para 41(b): „… the number of fatalities as a result of work-related injuries and '
      + 'work-related ill health.“ Unbedingte Pflichtangabe (auch der Wert 0 ist einzutragen).',
    suggestion: 'Trage die Anzahl arbeitsbedingter Todesfälle ein (0, falls keine).',
  },
];

/**
 * WARN — advisory rules. These never block engineer approval; they surface as
 * "Empfehlung nicht erfüllt" in the UI/PDF. Three sub-classes:
 *   (1) Unconditional Basic datapoints that are count-split or rate metrics
 *       where a blank can legitimately mean "not yet entered vs zero" — advised
 *       rather than blocked to avoid a false hard gate.
 *   (2) Conditional Basic disclosures ("shall disclose … if/where …") — the
 *       trigger lives outside the gate's worksheet-local scope or is itself a
 *       free choice, so we advise rather than block (para 13: an omitted
 *       conditional disclosure is "assumed to not be applicable").
 *   (3) Comprehensive-Module datapoints — para 45 makes the WHOLE module
 *       applicability-gated ("When one of these disclosures is omitted, it is
 *       assumed to not be applicable"), so NONE may hard-block.
 */
const WARN_REQS: Req[] = [
  // ── (1) Unconditional Basic, but count-split / rate → advise ──────────────
  {
    code: 'VSME-CR-B03-04',
    module: 'B3',
    titleDe: 'B3 – THG-Intensität (Emissionen je Umsatz) angeben',
    titleEn: 'B3 – GHG intensity (emissions per turnover) disclosed',
    condition: 'TotalLocationBasedGreenhouseGasEmissionsIntensityValue IS NOT NULL',
    fields: 'TotalLocationBasedGreenhouseGasEmissionsIntensityValue',
    severity: 'warn',
    clause: 'VSME B3 para 31',
    description:
      'Para 31: „… shall disclose its GHG intensity calculated by dividing gross GHG emissions '
      + '… by turnover …“ Unbedingt, aber abgeleitet/berechnet — daher beratend, damit eine '
      + 'noch nicht materialisierte Berechnung keinen harten Gate auslöst.',
    suggestion: 'THG-Intensität = THG-Emissionen / Umsatz (wird i. d. R. berechnet).',
  },
  {
    code: 'VSME-CR-B05-01',
    module: 'B5',
    titleDe: 'B5 – Standorte in/nahe biodiversitätssensiblen Gebieten angeben',
    titleEn: 'B5 – Sites in/near biodiversity-sensitive areas disclosed',
    condition: 'SiteLocatedInABiodiversitySensitiveArea IS NOT NULL',
    fields: 'SiteLocatedInABiodiversitySensitiveArea',
    severity: 'warn',
    clause: 'VSME B5 para 33',
    description:
      'Para 33: „The undertaking shall disclose the number and area (in hectares) of sites '
      + 'that it owns, has leased, or manages in or near a biodiversity sensitive area.“ '
      + 'Unbedingt, aber site-bezogen (mehrere Standortzeilen) — daher beratend.',
    suggestion: 'Gib für jeden Standort an, ob er in/nahe einem biodiversitätssensiblen Gebiet liegt.',
  },
  {
    code: 'VSME-CR-B06-02',
    module: 'B6',
    titleDe: 'B6 – Wasserentnahme in Gebieten mit hohem Wasserstress angeben',
    titleEn: 'B6 – Water withdrawn in areas of high water-stress disclosed',
    condition: 'AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress IS NOT NULL',
    fields: 'AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress',
    severity: 'warn',
    clause: 'VSME B6 para 35',
    description:
      'Para 35 (2. Teil): „… in addition, the undertaking shall separately present the amount '
      + 'of water withdrawn at sites located in areas of high water-stress.“ Unbedingt, aber '
      + 'abhängig von einer externen Wasserstress-Einstufung — daher beratend.',
    suggestion: 'Trage die in Gebieten mit hohem Wasserstress entnommene Wassermenge ein.',
  },
  {
    code: 'VSME-CR-B07-02',
    module: 'B7',
    titleDe: 'B7 – Gesamtes erzeugtes Abfallaufkommen angeben',
    titleEn: 'B7 – Total waste generated disclosed',
    condition: 'TotalWasteGeneratedMass IS NOT NULL',
    fields: 'TotalWasteGeneratedMass',
    severity: 'warn',
    clause: 'VSME B7 para 38(a)',
    description:
      'Para 38(a): „… the total annual generation of waste broken down by type (non-hazardous '
      + 'and hazardous) …“ Unbedingt, aber als Summe i. d. R. aus der Aufschlüsselung berechnet '
      + '— daher beratend.',
    suggestion: 'Trage das gesamte jährliche Abfallaufkommen ein (oder die Aufschlüsselung nach Typ).',
  },
  {
    code: 'VSME-CR-B08-01',
    module: 'B8',
    titleDe: 'B8 – Beschäftigte nach Vertragsart (befristet/unbefristet) angeben',
    titleEn: 'B8 – Employees by contract type (permanent/temporary) disclosed',
    condition:
      'NumberOfPermanentContractEmployees IS NOT NULL AND NumberOfTemporaryContractEmployees IS NOT NULL',
    fields: 'NumberOfPermanentContractEmployees, NumberOfTemporaryContractEmployees',
    severity: 'warn',
    clause: 'VSME B8 para 39(a)',
    description:
      'Para 39: „… shall disclose the number of employees … for the following metrics: '
      + '(a) type of employment contract (temporary or permanent) …“ Unbedingt, aber als '
      + 'aufgeteilte Zählung (leer ≠ null) — daher beratend.',
    suggestion: 'Trage die Beschäftigtenzahl je Vertragsart ein (0 eintragen, falls keine).',
  },
  {
    code: 'VSME-CR-B08-02',
    module: 'B8',
    titleDe: 'B8 – Beschäftigte nach Geschlecht angeben',
    titleEn: 'B8 – Employees by gender disclosed',
    condition:
      'NumberOfMaleEmployees IS NOT NULL AND NumberOfFemaleEmployees IS NOT NULL',
    fields: 'NumberOfMaleEmployees, NumberOfFemaleEmployees',
    severity: 'warn',
    clause: 'VSME B8 para 39(b)',
    description:
      'Para 39(b): „… (b) gender …“ Unbedingt, aber als aufgeteilte Zählung (leer ≠ null) '
      + '— daher beratend.',
    suggestion: 'Trage die Beschäftigtenzahl je Geschlecht ein.',
  },
  {
    code: 'VSME-CR-B09-03',
    module: 'B9',
    titleDe: 'B9 – Rate meldepflichtiger Arbeitsunfälle angeben',
    titleEn: 'B9 – Rate of recordable work-related accidents disclosed',
    condition: 'RateOfRecordableWorkRelatedAccidentsInTheReportingPeriod IS NOT NULL',
    fields: 'RateOfRecordableWorkRelatedAccidentsInTheReportingPeriod',
    severity: 'warn',
    clause: 'VSME B9 para 41(a)',
    description:
      'Para 41(a): „… the number and rate of recordable work-related accidents …“ Unbedingt, '
      + 'aber als abgeleitete Rate — daher beratend (Anzahl wird hart geprüft).',
    suggestion: 'Trage die Unfallrate ein (i. d. R. je Mio. geleisteter Arbeitsstunden).',
  },
  {
    code: 'VSME-CR-B10-01',
    module: 'B10',
    titleDe: 'B10 – Mindestlohn-Konformität angeben',
    titleEn: 'B10 – Pay at or above minimum wage disclosed',
    condition:
      'EmployeesReceivePayEqualOrAboveMinimumWageDeterminedByNationalLawOrCollectiveAgreement IS NOT NULL',
    fields: 'EmployeesReceivePayEqualOrAboveMinimumWageDeterminedByNationalLawOrCollectiveAgreement',
    severity: 'warn',
    clause: 'VSME B10 para 42(a)',
    description:
      'Para 42(a): „… whether the employees receive pay that is equal or above applicable '
      + 'minimum wage …“ Unbedingte Ja/Nein-Angabe — beratend gehalten (konservativ).',
    suggestion: 'Gib an, ob alle Beschäftigten mindestens den Mindestlohn erhalten (Ja/Nein).',
  },
  {
    code: 'VSME-CR-B10-02',
    module: 'B10',
    titleDe: 'B10 – Anteil tarifgebundener Beschäftigter angeben',
    titleEn: 'B10 – Share of employees covered by collective bargaining disclosed',
    condition: 'PercentageOfEmployeesCoveredByCollectiveBargainingAgreements IS NOT NULL',
    fields: 'PercentageOfEmployeesCoveredByCollectiveBargainingAgreements',
    severity: 'warn',
    clause: 'VSME B10 para 42(c)',
    description:
      'Para 42(c): „… the percentage of employees covered by collective bargaining '
      + 'agreements …“ Unbedingt — beratend gehalten (konservativ).',
    suggestion: 'Trage den Prozentsatz tarifgebundener Beschäftigter ein.',
  },

  // ── (1b) Unconditional B1 24(e) registration identifiers → advise ─────────
  //     Para 24(e) is an unconditional "shall disclose", but these overlap the
  //     project/registration flow and are always answerable; kept as `warn`
  //     (surfaced, never hard-blocking) per the conservative gate policy.
  {
    code: 'VSME-CR-B01-03',
    module: 'B1',
    titleDe: 'B1 – Rechtsform des Unternehmens angeben',
    titleEn: 'B1 – Legal form of the undertaking disclosed',
    condition: 'UndertakingsLegalForm IS NOT NULL',
    fields: 'UndertakingsLegalForm',
    severity: 'warn',
    clause: 'VSME B1 para 24(e)',
    description:
      'Para 24(e): „… the undertaking shall disclose … its legal form …“ Unbedingte '
      + 'Pflichtangabe; als Stammdatum beratend geführt (überschneidet sich mit der Registrierung).',
    suggestion: 'Wähle die Rechtsform des Unternehmens.',
  },
  {
    code: 'VSME-CR-B01-04',
    module: 'B1',
    titleDe: 'B1 – NACE-Wirtschaftszweig-Code(s) angeben',
    titleEn: 'B1 – NACE sector classification code(s) disclosed',
    condition: 'NaceSectorClassificationCodes IS NOT NULL',
    fields: 'NaceSectorClassificationCodes',
    severity: 'warn',
    clause: 'VSME B1 para 24(e)',
    description:
      'Para 24(e): „… NACE sector classification code(s) …“ Unbedingte Pflichtangabe; '
      + 'als Stammdatum beratend geführt.',
    suggestion: 'Wähle den/die zutreffenden NACE-Code(s).',
  },
  {
    code: 'VSME-CR-B01-05',
    module: 'B1',
    titleDe: 'B1 – Bilanzsumme angeben',
    titleEn: 'B1 – Size of balance sheet disclosed',
    condition: 'Assets IS NOT NULL',
    fields: 'Assets',
    severity: 'warn',
    clause: 'VSME B1 para 24(e)',
    description:
      'Para 24(e): „… the size of the balance sheet …“ Unbedingte Pflichtangabe; '
      + 'als Stammdatum beratend geführt.',
    suggestion: 'Trage die Bilanzsumme ein.',
  },
  {
    code: 'VSME-CR-B01-06',
    module: 'B1',
    titleDe: 'B1 – Umsatz angeben',
    titleEn: 'B1 – Turnover disclosed',
    condition: 'Turnover IS NOT NULL',
    fields: 'Turnover',
    severity: 'warn',
    clause: 'VSME B1 para 24(e)',
    description:
      'Para 24(e): „… the turnover …“ Unbedingte Pflichtangabe; zugleich der Nenner der '
      + 'THG-Intensität (B3 para 31). Als Stammdatum beratend geführt.',
    suggestion: 'Trage den Umsatz des Berichtszeitraums ein.',
  },
  {
    code: 'VSME-CR-B01-07',
    module: 'B1',
    titleDe: 'B1 – Anzahl der Beschäftigten angeben',
    titleEn: 'B1 – Number of employees disclosed',
    condition: 'NumberOfEmployees IS NOT NULL',
    fields: 'NumberOfEmployees',
    severity: 'warn',
    clause: 'VSME B1 para 24(e)',
    description:
      'Para 24(e): „… the number of employees in headcount or full-time equivalent (FTE) …“ '
      + 'Unbedingte Pflichtangabe; als Stammdatum beratend geführt.',
    suggestion: 'Trage die Anzahl der Beschäftigten ein (Kopfzahl oder VZÄ).',
  },
  {
    code: 'VSME-CR-B01-08',
    module: 'B1',
    titleDe: 'B1 – Land der Haupttätigkeit / Standort wesentlicher Vermögenswerte angeben',
    titleEn: 'B1 – Country of primary operations / location of significant assets disclosed',
    condition: 'CountryOfPrimaryOperationsAndLocationOfSignificantAssets IS NOT NULL',
    fields: 'CountryOfPrimaryOperationsAndLocationOfSignificantAssets',
    severity: 'warn',
    clause: 'VSME B1 para 24(e)',
    description:
      'Para 24(e): „… the country of primary operations and the location of significant '
      + 'assets …“ Unbedingte Pflichtangabe; als Stammdatum beratend geführt.',
    suggestion: 'Wähle das Land der Haupttätigkeit / des Standorts wesentlicher Vermögenswerte.',
  },
  {
    code: 'VSME-CR-B01-09',
    module: 'B1',
    titleDe: 'B1 – Geolokalisierung der Standorte angeben',
    titleEn: 'B1 – Geolocation of sites disclosed',
    condition: 'GPSLocationOfSite IS NOT NULL',
    fields: 'GPSLocationOfSite',
    severity: 'warn',
    clause: 'VSME B1 para 24(e)',
    description:
      'Para 24(e): „… the geolocation of sites …“ Unbedingte Pflichtangabe; als Stammdatum '
      + 'beratend geführt.',
    suggestion: 'Trage die GPS-Koordinaten der Standorte ein.',
  },

  // ── (2) Conditional Basic ("shall disclose … if/where …") → advise ────────
  {
    code: 'VSME-CR-B08-03',
    module: 'B8',
    titleDe: 'B8 – Fluktuationsrate angeben (ab 50 Beschäftigten)',
    titleEn: 'B8 – Employee turnover rate disclosed (≥50 employees)',
    condition: 'EmployeeTurnoverRate IS NOT NULL',
    fields: 'EmployeeTurnoverRate',
    severity: 'warn',
    clause: 'VSME B8 para 40',
    description:
      'Para 40: „If the undertaking employs 50 or more employees, it shall disclose the '
      + 'employee turnover rate …“ Bedingt (Schwellenwert 50). Der Auslöser '
      + '(Beschäftigtenzahl) ist nicht im Gate-Grammar-Scope vergleichbar → beratend.',
    suggestion: 'Ab 50 Beschäftigten: Fluktuationsrate für den Berichtszeitraum eintragen.',
  },
  {
    code: 'VSME-CR-B11-01',
    module: 'B11',
    titleDe: 'B11 – Verurteilungen/Bußgelder (Korruption/Bestechung) angeben',
    titleEn: 'B11 – Convictions/fines for corruption & bribery disclosed',
    condition:
      'TotalNumberOfConvictionsForTheViolationOfAntiCorruptionAndAntiBriberyLaws IS NOT NULL',
    fields: 'TotalNumberOfConvictionsForTheViolationOfAntiCorruptionAndAntiBriberyLaws',
    severity: 'warn',
    clause: 'VSME B11 para 43',
    description:
      'Para 43: „In case of convictions and fines in the reporting period, the undertaking '
      + 'shall disclose the number of convictions, and the total amount of fines …“ '
      + 'Ausdrücklich bedingt („In case of …“) → beratend, niemals hart blockierend.',
    suggestion: 'Falls Verurteilungen/Bußgelder vorlagen: Anzahl und Gesamtbetrag eintragen.',
  },

  // ── (3) Comprehensive Module — para 45 makes the whole module conditional ─
  {
    code: 'VSME-CR-C01-01',
    module: 'C1',
    titleDe: 'C1 – Geschäftsmodell und Strategie beschreiben',
    titleEn: 'C1 – Business model and strategy described',
    condition: 'DescriptionOfSignificantGroupsOfProductsAndOrServicesOffered IS NOT NULL',
    fields: 'DescriptionOfSignificantGroupsOfProductsAndOrServicesOffered',
    severity: 'warn',
    clause: 'VSME C1 para 47(a)',
    description:
      'Para 47: „The undertaking shall disclose the key elements of its business model and '
      + 'strategy …“ Comprehensive-Modul → para 45: bei Auslassung „assumed to not be '
      + 'applicable“ → beratend.',
    suggestion: 'Beschreibe Produkte/Dienstleistungen, Märkte und wesentliche Geschäftsbeziehungen.',
  },
  {
    code: 'VSME-CR-C06-01',
    module: 'C6',
    titleDe: 'C6 – Verhaltenskodex/Menschenrechtspolitik angeben',
    titleEn: 'C6 – Code of conduct / human rights policy disclosed',
    condition: 'UndertakingHasACodeOfConductOrHumanRightsPolicyForItsOwnWorkforce IS NOT NULL',
    fields: 'UndertakingHasACodeOfConductOrHumanRightsPolicyForItsOwnWorkforce',
    severity: 'warn',
    clause: 'VSME C6 para 61(a)',
    description:
      'Para 61(a): „Does the undertaking have a code of conduct or human rights policy for '
      + 'its own workforce? (YES/NO)“ Comprehensive-Modul (para 45) → beratend.',
    suggestion: 'Beantworte, ob ein Verhaltenskodex/eine Menschenrechtspolitik besteht (Ja/Nein).',
  },
  {
    code: 'VSME-CR-C08-01',
    module: 'C8',
    titleDe: 'C8 – Ausschluss aus EU-Referenz-Benchmarks angeben',
    titleEn: 'C8 – Exclusion from EU reference benchmarks disclosed',
    condition:
      'UndertakingsAreExcludedFromAnyEuReferenceBenchmarksThatAreAlignedWithTheParisAgreement IS NOT NULL',
    fields: 'UndertakingsAreExcludedFromAnyEuReferenceBenchmarksThatAreAlignedWithTheParisAgreement',
    severity: 'warn',
    clause: 'VSME C8 para 64',
    description:
      'Para 64: „The undertaking shall disclose whether it is excluded from any EU reference '
      + 'benchmarks that are aligned with the Paris Agreement …“ Comprehensive-Modul (para 45) '
      + '→ beratend.',
    suggestion: 'Gib an, ob das Unternehmen aus Paris-konformen EU-Referenz-Benchmarks ausgeschlossen ist.',
  },
  {
    code: 'VSME-CR-C09-01',
    module: 'C9',
    titleDe: 'C9 – Geschlechterverhältnis im Leitungsorgan angeben',
    titleEn: 'C9 – Gender diversity ratio in governance body disclosed',
    condition: 'GenderDiversityRatioInGovernanceBody IS NOT NULL',
    fields: 'GenderDiversityRatioInGovernanceBody',
    severity: 'warn',
    clause: 'VSME C9 para 65',
    description:
      'Para 65: „If the undertaking has a governance body in place, the undertaking shall '
      + 'disclose the related gender diversity ratio.“ Bedingt + Comprehensive-Modul → beratend.',
    suggestion: 'Falls ein Leitungsorgan besteht: Geschlechterverhältnis (Ratio) eintragen.',
  },
];

/** All curated requirements (block first, then warn) in stable order. */
export const VSME_REQUIREMENTS: Req[] = [...BLOCK_REQS, ...WARN_REQS];

/**
 * VSME_REQUIRED_FIELD_SYMBOLS
 * ===========================
 * The COMPLETE set of field symbols the VSME Standard makes UNCONDITIONALLY
 * mandatory at the datapoint level — i.e. the undertaking "shall disclose" them
 * with NO applicability qualifier AND they belong to the BASIC Module (B1–B11).
 * build-workbook.ts emits `required: 'yes'` (→ fields.is_required = true) for
 * exactly these symbols; every other field stays is_required = false.
 *
 * This is a SUPERSET of the `block` gate set above: the gate set is the subset
 * that is also a hard approval gate (always answerable, blank = real omission),
 * whereas is_required additionally flags mandatory disclosures that are derived/
 * calculated (intensity, totals, rate) or count-splits — these shape the
 * "complete report" UX but are not hard gates. See the per-symbol clause below.
 *
 * Membership rule (temperature-0, source-cited to VSME Standard, EFRAG 2026-02-01):
 *   IN  ⟺ a Basic-Module (B) "shall disclose …" with NO if/where/in-case-of
 *         qualifier and not "may disclose".
 *   OUT ⟺ conditional ("if it can obtain", "if … 50 or more", "in case of …",
 *         "if operates in more than one country", "if … production processes"),
 *         voluntary ("may disclose"/"may omit"), every Comprehensive (C1–C9)
 *         datapoint (para 45 makes the whole module applicability-gated), every
 *         entity-specific D99 "any other" disclosure, and — conservatively —
 *         qualifier/format-supporting fields not separately named as a
 *         "shall disclose" datapoint (see the EXCLUDED notes in the deliverable).
 *
 * Each entry cites the VSME Standard clause and the verbatim obligation phrase.
 */
export const VSME_REQUIRED_FIELD_SYMBOLS: ReadonlySet<string> = new Set<string>([
  // ── B1 — Basis for preparation (para 24, unconditional 24(a),(c),(e)) ──────
  // 24(a): "shall disclose: (a) which of the following options it has selected"
  'BasisForPreparation',
  // 24(c): "whether the sustainability report has been prepared on an individual
  //         basis … or on a consolidated basis"
  'BasisForReporting',
  // 24(e)(i): "the undertaking's legal form"
  'UndertakingsLegalForm',
  // 24(e)(ii): "NACE sector classification code(s)"
  'NaceSectorClassificationCodes',
  // 24(e)(iii): "size of the balance sheet (in Euro)"
  'Assets',
  // 24(e)(iv): "turnover (in Euro)"
  'Turnover',
  // 24(e)(v): "number of employees in headcount or full-time equivalents"
  'NumberOfEmployees',
  // 24(e)(vi): "country of primary operations and location of significant asset(s)"
  'CountryOfPrimaryOperationsAndLocationOfSignificantAssets',
  // 24(e)(vii): "geolocation of sites owned, leased or managed" (para 76: the
  //   undertaking "shall include the coordinates of the sites").
  'GPSLocationOfSite',

  // ── B3 — Energy & GHG emissions (paras 29–31) ─────────────────────────────
  // 29: "shall disclose its total energy consumption in MWh" (the per-source
  //   breakdown is the conditional "if it can obtain …" follow-on, OUT).
  'TotalEnergyConsumption',
  // 30(a): "the Scope 1 GHG emissions in tCO2eq"
  'GrossScope1GreenhouseGasEmissions',
  // 30(b): "the location-based Scope 2 emissions in tCO2eq"
  'GrossLocationBasedScope2GreenhouseGasEmissions',
  // 31: "shall disclose its GHG intensity calculated by dividing 'gross GHG
  //   emissions' (para 30) by 'turnover'". Derived, but a mandated disclosure.
  'TotalLocationBasedGreenhouseGasEmissionsIntensityValue',

  // ── B5 — Biodiversity (para 33) ───────────────────────────────────────────
  // 33: "shall disclose the number and area (in hectares) of sites that it owns,
  //   has leased, or manages in or near a biodiversity sensitive area." (para 34
  //   land-use metrics are "may disclose", OUT). The in/near flags + area encode
  //   the unconditional para-33 disclosure.
  'SiteLocatedInABiodiversitySensitiveArea',
  'SiteLocatedNearABiodiversitySensitiveArea',
  'AreaOfSiteInBiodiversitySensitiveArea',

  // ── B6 — Water (para 35) ──────────────────────────────────────────────────
  // 35: "shall disclose its total water withdrawal … in addition, the undertaking
  //   shall separately present the amount of water withdrawn at sites located in
  //   areas of high water-stress." Both clauses of para 35 are unconditional.
  //   (para 36 water consumption is conditional "If … production processes …", OUT.)
  'TotalAmountOfWaterWithdrawnFromAllSites',
  'AmountOfWaterWithdrawnAtSitesLocatedInAreasOfHighWaterStress',

  // ── B7 — Circular economy & waste (paras 37–38) ───────────────────────────
  // 37: "shall disclose whether it applies circular economy principles" (the
  //   "if so, how …" description is conditional, OUT).
  'UndertakingAppliesCircularEconomyPrinciples',
  // 38(a): "the total annual generation of waste broken down by type
  //   (non-hazardous and hazardous)" — the split IS mandatory; total = the
  //   mandated aggregate (VSME-EQ-02). Mass = canonical waste unit; the *Volume
  //   variants are alternate-unit duplicates and are left OUT (avoid double-req).
  'TotalWasteGeneratedMass',
  'TotalHazardousWasteGeneratedMass',
  'TotalNonHazardousWasteGeneratedMass',
  // 38(b): "the total annual waste diverted to recycling or reuse"
  'WasteDivertedToRecycleOrReuseMass',
  // (38(c) significant-material-flow mass is conditional "if … sector using
  //  significant material flows", OUT.)

  // ── B8 — Workforce general characteristics (para 39) ──────────────────────
  // 39(a): "type of employment contract (temporary or permanent)" — mandatory
  //   count-split (a legitimate 0 is still a disclosure).
  'NumberOfPermanentContractEmployees',
  'NumberOfTemporaryContractEmployees',
  // 39(b): "gender" — mandatory count-split. Male/Female are the universally
  //   applicable categories; Other/Non-reported are residual buckets left OUT.
  'NumberOfMaleEmployees',
  'NumberOfFemaleEmployees',
  // (39(c) country-of-contract split is conditional "if … more than one country",
  //  OUT; para 40 turnover rate is conditional "If … 50 or more employees", OUT.)

  // ── B9 — Workforce health & safety (para 41) ──────────────────────────────
  // 41(a): "the number and rate of recordable work-related accidents" — both the
  //   number and the (derived) rate are mandated with no qualifier.
  'NumberOfRecordableWorkRelatedAccidentsInTheReportingPeriod',
  'RateOfRecordableWorkRelatedAccidentsInTheReportingPeriod',
  // 41(b): "the number of fatalities as a result of work-related injuries and
  //   work-related ill health."
  'NumberOfFatalitiesAsAResultOfWorkRelatedInjuriesAndWorkRelatedIllHealth',

  // ── B10 — Remuneration & collective bargaining (para 42) ──────────────────
  // 42(a): "whether the employees receive pay that is equal or above applicable
  //   minimum wage …" (unconditional Yes/No).
  'EmployeesReceivePayEqualOrAboveMinimumWageDeterminedByNationalLawOrCollectiveAgreement',
  // 42(c): "the percentage of employees covered by collective bargaining
  //   agreements" (unconditional).
  'PercentageOfEmployeesCoveredByCollectiveBargainingAgreements',
  // 42(d): "the average number of annual training hours per employee, broken
  //   down by gender" — mandatory, gender-split. Male/Female core; Other/
  //   Non-reported residual buckets left OUT.
  'AverageNumberOfAnnualTrainingHoursPerMaleEmployee',
  'AverageNumberOfAnnualTrainingHoursPerFemaleEmployee',
  // (42(b) gender pay-gap is "may omit … below 150 employees", voluntary, OUT.)

  // ── B11 — Convictions & fines (para 43) ───────────────────────────────────
  // Conditional ("In case of convictions and fines …") → BOTH OUT.
]);

/**
 * Compile the curated requirements into Pass3c ComplianceRow shape.
 *
 * Only rows whose referenced field symbols all exist in the workbook's emitted
 * `fields` are kept — a row that references a renamed/absent concept is dropped
 * with a console warning rather than seeding a dangling gate.
 */
export function buildComplianceRows(fieldWorksheetBySymbol: Map<string, string>): ComplianceRow[] {
  const out: ComplianceRow[] = [];
  let order = 1;
  for (const r of VSME_REQUIREMENTS) {
    const syms = r.fields.split(',').map((s) => s.trim()).filter(Boolean);
    const missing = syms.filter((s) => !fieldWorksheetBySymbol.has(s));
    if (missing.length > 0) {
      console.warn(
        `[requirements] SKIP ${r.code} — field symbol(s) not in workbook: ${missing.join(', ')}`,
      );
      continue;
    }
    // Derive the host worksheet from where the gated FIELDS actually live —
    // never from the `module` tag (see file header WORKSHEET-LOCALITY note,
    // now resolved: the importer honours an explicit worksheet_code).
    const hosts = [...new Set(syms.map((s) => fieldWorksheetBySymbol.get(s)!))];
    let worksheetCode: string | null;
    if (hosts.length === 1) {
      worksheetCode = hosts[0];
    } else {
      // HARD CONSTRAINT (Alvaro): never fabricate a host for a cross-worksheet
      // gate. Leave it on legacy (phase-fallback) hosting and report loudly.
      console.warn(
        `[requirements] STOP-REPORT ${r.code} — symbols span ${hosts.join(' + ')}; left on legacy hosting`,
      );
      worksheetCode = null;
    }
    out.push({
      requirement_code: r.code,
      standard_code: 'VSME',
      worksheet_code: worksheetCode,
      title: r.titleDe,
      description: r.description,
      // `field_presence` keeps parity with the importer's existence-rule path;
      // the explicit evaluation_expression below is what actually seeds.
      evaluation_type: 'field_presence',
      required_field_symbols: r.fields,
      evaluation_expression: r.condition,
      pass_condition: '',
      regulation_reference: r.clause,
      phase: 1,
      order_index: order++,
      verification_status: 'imported_unverified',
      severity: r.severity,
    });
  }
  return out;
}
